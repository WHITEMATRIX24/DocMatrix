import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StaffRole } from '@prisma/client';
import { BillingController } from './billing.controller.js';
import { BillingService } from './billing.service.js';
import { BillingPermissionGuard } from './guards/billing-permission.guard.js';
import {
  BillingPermission,
  DEFAULT_BILLING_PERMISSIONS,
  getRoleBillingPermissions,
  hasBillingPermission,
  resetBillingPermissionsPolicy,
  setRoleBillingPermissions,
} from './billing-permissions.policy.js';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';

describe('DocMatrix Billing Role-Based Authorization & Tenant Isolation', () => {
  let reflector: Reflector;
  let guard: BillingPermissionGuard;
  let controller: BillingController;
  let mockBillingService: Partial<BillingService>;

  const clinicAId = 'clinic-alpha-1111';
  const clinicBId = 'clinic-beta-2222';

  const makeUser = (role: StaffRole, clinicId = clinicAId, isPlatformAdmin = false): AuthenticatedUser => ({
    id: `usr-${role.toLowerCase()}-1`,
    email: `${role.toLowerCase()}@clinic.com`,
    fullName: `Test ${role}`,
    role,
    clinicId,
    isPlatformAdmin,
    isPrimaryContact: false,
  });

  const createMockContext = (handler: Function, user?: AuthenticatedUser | null): ExecutionContext => {
    return {
      getHandler: () => handler,
      getClass: () => BillingController,
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    resetBillingPermissionsPolicy();
    reflector = new Reflector();
    guard = new BillingPermissionGuard(reflector);

    mockBillingService = {
      createDraftInvoice: vi.fn().mockResolvedValue({ id: 'inv-draft-1' }),
      createAndIssueInvoice: vi.fn().mockResolvedValue({ id: 'inv-issued-1' }),
      createInvoiceFromTreatmentPlan: vi.fn().mockResolvedValue({ id: 'inv-tp-1' }),
      voidInvoice: vi.fn().mockResolvedValue({ id: 'inv-voided-1', status: 'VOID' }),
      recordPayment: vi.fn().mockResolvedValue({ id: 'pay-1', amount: 1000 }),
      refundPayment: vi.fn().mockResolvedValue({ id: 'ref-1', amount: 500 }),
      createTariff: vi.fn().mockResolvedValue({ id: 'tar-1', name: 'Root Canal' }),
      updateTariff: vi.fn().mockResolvedValue({ id: 'tar-1', name: 'Root Canal Updated' }),
      toggleTariffActive: vi.fn().mockResolvedValue({ id: 'tar-1', active: false }),
      deleteTariff: vi.fn().mockResolvedValue({ id: 'tar-1' }),
      createExpense: vi.fn().mockResolvedValue({ id: 'exp-1', amount: 200 }),
      deleteExpense: vi.fn().mockResolvedValue({ id: 'exp-1' }),
      getInvoices: vi.fn().mockResolvedValue([]),
      getTariffs: vi.fn().mockResolvedValue([]),
    };

    controller = new BillingController(mockBillingService as BillingService);
  });

  afterEach(() => {
    resetBillingPermissionsPolicy();
  });

  // =========================================================================
  // 1 & 2. REFUNDS: Clinic Administrators and Accountants can issue refunds
  // =========================================================================
  describe('Refund Operations (REFUND_ISSUE)', () => {
    it('allows ORGANIZATION_ADMIN to issue refunds', () => {
      const user = makeUser(StaffRole.ORGANIZATION_ADMIN);
      const ctx = createMockContext(controller.refundPayment, user);
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('allows BRANCH_ADMIN to issue refunds', () => {
      const user = makeUser(StaffRole.BRANCH_ADMIN);
      const ctx = createMockContext(controller.refundPayment, user);
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('allows ACCOUNTANT to issue refunds', () => {
      const user = makeUser(StaffRole.ACCOUNTANT);
      const ctx = createMockContext(controller.refundPayment, user);
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  // =========================================================================
  // 3 & 4. VOIDS: Clinic Administrators and Accountants can void invoices
  // =========================================================================
  describe('Void Operations (INVOICE_VOID)', () => {
    it('allows ORGANIZATION_ADMIN to void invoices', () => {
      const user = makeUser(StaffRole.ORGANIZATION_ADMIN);
      const ctx = createMockContext(controller.voidInvoice, user);
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('allows BRANCH_ADMIN to void invoices', () => {
      const user = makeUser(StaffRole.BRANCH_ADMIN);
      const ctx = createMockContext(controller.voidInvoice, user);
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('allows ACCOUNTANT to void invoices', () => {
      const user = makeUser(StaffRole.ACCOUNTANT);
      const ctx = createMockContext(controller.voidInvoice, user);
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  // =========================================================================
  // 5. TARIFFS: Both Clinic Administrators and Accountants can manage tariffs
  // =========================================================================
  describe('Tariff Management Operations (TARIFF_MANAGE)', () => {
    const tariffEndpoints = [
      'createTariff',
      'updateTariff',
      'toggleTariffActive',
      'deleteTariff',
    ] as const;

    it('allows ORGANIZATION_ADMIN to manage tariffs across all tariff endpoints', () => {
      const user = makeUser(StaffRole.ORGANIZATION_ADMIN);
      for (const endpoint of tariffEndpoints) {
        const ctx = createMockContext(controller[endpoint], user);
        expect(guard.canActivate(ctx)).toBe(true);
      }
    });

    it('allows BRANCH_ADMIN to manage tariffs across all tariff endpoints', () => {
      const user = makeUser(StaffRole.BRANCH_ADMIN);
      for (const endpoint of tariffEndpoints) {
        const ctx = createMockContext(controller[endpoint], user);
        expect(guard.canActivate(ctx)).toBe(true);
      }
    });

    it('allows ACCOUNTANT to manage tariffs across all tariff endpoints', () => {
      const user = makeUser(StaffRole.ACCOUNTANT);
      for (const endpoint of tariffEndpoints) {
        const ctx = createMockContext(controller[endpoint], user);
        expect(guard.canActivate(ctx)).toBe(true);
      }
    });
  });

  // =========================================================================
  // 6. UNAUTHORIZED ROLES: Receive HTTP 403 Forbidden
  // =========================================================================
  describe('Unauthorized Roles (HTTP 403 Forbidden)', () => {
    const sensitiveEndpointNames = [
      { name: 'refundPayment', permission: BillingPermission.REFUND_ISSUE },
      { name: 'voidInvoice', permission: BillingPermission.INVOICE_VOID },
      { name: 'createTariff', permission: BillingPermission.TARIFF_MANAGE },
      { name: 'createExpense', permission: BillingPermission.EXPENSE_MANAGE },
    ] as const;

    const unauthorizedStaffForSensitive = [
      StaffRole.DOCTOR,
      StaffRole.RECEPTIONIST,
      StaffRole.NURSE,
      StaffRole.LAB_TECHNICIAN,
      StaffRole.PHARMACIST,
    ];

    unauthorizedStaffForSensitive.forEach((role) => {
      sensitiveEndpointNames.forEach(({ name, permission }) => {
        it(`rejects ${role} with HTTP 403 on ${name} (${permission})`, () => {
          const user = makeUser(role);
          const fn = controller[name as keyof BillingController] as Function;
          const ctx = createMockContext(fn, user);
          expect(() => guard.canActivate(ctx)).toThrowError(ForbiddenException);
        });
      });
    });

    it('rejects clinical support roles (NURSE, LAB_TECHNICIAN, PHARMACIST) on all billing write endpoints', () => {
      const supportRoles = [StaffRole.NURSE, StaffRole.LAB_TECHNICIAN, StaffRole.PHARMACIST];
      for (const role of supportRoles) {
        const user = makeUser(role);
        expect(() => guard.canActivate(createMockContext(controller.createDraftInvoice, user))).toThrowError(ForbiddenException);
        expect(() => guard.canActivate(createMockContext(controller.createAndIssueInvoice, user))).toThrowError(ForbiddenException);
        expect(() => guard.canActivate(createMockContext(controller.recordPayment, user))).toThrowError(ForbiddenException);
        expect(() => guard.canActivate(createMockContext(controller.getInvoices, user))).toThrowError(ForbiddenException);
      }
    });
  });

  // =========================================================================
  // 7. UNAUTHENTICATED REQUESTS: Receive HTTP 401 Unauthorized
  // =========================================================================
  describe('Unauthenticated Requests (HTTP 401 Unauthorized)', () => {
    it('throws UnauthorizedException when request.user is missing', () => {
      const ctx = createMockContext(controller.refundPayment, null);
      expect(() => guard.canActivate(ctx)).toThrowError(UnauthorizedException);
    });

    it('throws UnauthorizedException when request.user is undefined', () => {
      const ctx = createMockContext(controller.voidInvoice, undefined);
      expect(() => guard.canActivate(ctx)).toThrowError(UnauthorizedException);
    });
  });

  // =========================================================================
  // 8. CROSS-CLINIC ISOLATION: Scoped strictly to authenticated clinicId
  // =========================================================================
  describe('Multi-Tenant Cross-Clinic Scoping', () => {
    it('scopes createDraftInvoice strictly to the session clinicId', async () => {
      const userA = makeUser(StaffRole.ORGANIZATION_ADMIN, clinicAId);
      const dto = {
        patientId: 'pat-1',
        items: [{ serviceTariffId: 'tar-1', quantity: 1, unitPrice: 1000 }],
        // Malicious client attempting to inject different clinicId or role in payload
        clinicId: clinicBId,
        role: 'SUPER_ADMIN',
      } as any;

      await controller.createDraftInvoice(userA, dto);

      expect(mockBillingService.createDraftInvoice).toHaveBeenCalledWith(clinicAId, userA, dto);
      expect(mockBillingService.createDraftInvoice).not.toHaveBeenCalledWith(clinicBId, expect.anything(), expect.anything());
    });

    it('scopes voidInvoice strictly to session clinicId', async () => {
      const userA = makeUser(StaffRole.ACCOUNTANT, clinicAId);
      const dto = { reason: 'Incorrect billing code' };

      await controller.voidInvoice(userA, 'inv-target-1', dto);

      expect(mockBillingService.voidInvoice).toHaveBeenCalledWith(clinicAId, userA, 'inv-target-1', dto);
    });
  });

  // =========================================================================
  // 9. LEGITIMATE WORKFLOWS: Preserved for Authorized Roles
  // =========================================================================
  describe('Preservation of Legitimate Billing Workflows', () => {
    it('allows RECEPTIONIST to create invoices and collect payments', () => {
      const receptionist = makeUser(StaffRole.RECEPTIONIST);

      expect(guard.canActivate(createMockContext(controller.createDraftInvoice, receptionist))).toBe(true);
      expect(guard.canActivate(createMockContext(controller.createAndIssueInvoice, receptionist))).toBe(true);
      expect(guard.canActivate(createMockContext(controller.recordPayment, receptionist))).toBe(true);
      expect(guard.canActivate(createMockContext(controller.getInvoices, receptionist))).toBe(true);
      expect(guard.canActivate(createMockContext(controller.getTariffs, receptionist))).toBe(true);
    });

    it('allows DOCTOR to create invoices from treatment plans and view tariffs', () => {
      const doctor = makeUser(StaffRole.DOCTOR);

      expect(guard.canActivate(createMockContext(controller.createFromTreatmentPlan, doctor))).toBe(true);
      expect(guard.canActivate(createMockContext(controller.createAndIssueInvoice, doctor))).toBe(true);
      expect(guard.canActivate(createMockContext(controller.getTariffs, doctor))).toBe(true);
      expect(guard.canActivate(createMockContext(controller.getInvoices, doctor))).toBe(true);
    });

    it('allows PLATFORM_ADMIN to bypass staff role restrictions', () => {
      const platformAdmin = makeUser(StaffRole.DOCTOR, clinicAId, true);

      expect(guard.canActivate(createMockContext(controller.voidInvoice, platformAdmin))).toBe(true);
      expect(guard.canActivate(createMockContext(controller.refundPayment, platformAdmin))).toBe(true);
      expect(guard.canActivate(createMockContext(controller.createTariff, platformAdmin))).toBe(true);
    });
  });

  // =========================================================================
  // 10. POLICY CONFIGURABILITY: Updating policy dynamically changes behavior
  // =========================================================================
  describe('Dynamic Policy Configuration', () => {
    it('allows dynamically granting a permission to a role and immediately authorizes requests', () => {
      const doctor = makeUser(StaffRole.DOCTOR);
      const ctx = createMockContext(controller.refundPayment, doctor);

      // Initially forbidden
      expect(() => guard.canActivate(ctx)).toThrowError(ForbiddenException);

      // Dynamically grant refund permission to DOCTOR
      const currentDoctorPerms = getRoleBillingPermissions(StaffRole.DOCTOR);
      setRoleBillingPermissions(StaffRole.DOCTOR, [...currentDoctorPerms, BillingPermission.REFUND_ISSUE]);

      // Now permitted
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('allows dynamically revoking a permission from a role and immediately forbids requests', () => {
      const accountant = makeUser(StaffRole.ACCOUNTANT);
      const ctx = createMockContext(controller.voidInvoice, accountant);

      // Initially permitted
      expect(guard.canActivate(ctx)).toBe(true);

      // Dynamically revoke void permission from ACCOUNTANT
      const currentAccountantPerms = getRoleBillingPermissions(StaffRole.ACCOUNTANT);
      setRoleBillingPermissions(
        StaffRole.ACCOUNTANT,
        currentAccountantPerms.filter((p) => p !== BillingPermission.INVOICE_VOID),
      );

      // Now forbidden
      expect(() => guard.canActivate(ctx)).toThrowError(ForbiddenException);
    });

    it('resets dynamic policy back to initial defaults cleanly', () => {
      setRoleBillingPermissions(StaffRole.DOCTOR, [BillingPermission.REFUND_ISSUE]);
      expect(hasBillingPermission(StaffRole.DOCTOR, BillingPermission.REFUND_ISSUE)).toBe(true);

      resetBillingPermissionsPolicy();

      expect(hasBillingPermission(StaffRole.DOCTOR, BillingPermission.REFUND_ISSUE)).toBe(false);
      expect(hasBillingPermission(StaffRole.ACCOUNTANT, BillingPermission.REFUND_ISSUE)).toBe(true);
    });
  });
});
