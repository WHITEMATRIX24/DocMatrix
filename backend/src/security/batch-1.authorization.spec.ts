import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import { ClinicalNotesController } from '../clinical-notes/clinical-notes.controller.js';
import { ClinicalController } from '../clinical/clinical.controller.js';
import { InventoryController } from '../inventory/inventory.controller.js';
import { PatientsController } from '../patients/patients.controller.js';
import { AuthService } from '../auth/auth.service.js';
import { TreatmentPlansService } from '../treatment-plans/treatment-plans.service.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';


const user: any = {
  id: 'staff-a',
  clinicId: 'clinic-a',
  role: 'DOCTOR',
  isPlatformAdmin: false,
};
const authorize = (
  controller: any,
  method: string,
  role: string,
  status = 'ACTIVE',
  httpMethod = 'PATCH',
  platform = false,
) => {
  const guard = new TenantGuard(
    { clinic: { findUnique: async () => ({ status }) } } as any,
    new Reflector(),
  );
  return guard.canActivate({
    getClass: () => controller,
    getHandler: () => controller.prototype[method],
    switchToHttp: () => ({
      getRequest: () => ({
        user: { ...user, role, isPlatformAdmin: platform },
        method: httpMethod,
      }),
    }),
  } as any);
};

describe('Batch 1 operation permissions and clinic status', () => {
  it('#3 preserves front-desk patient intake without granting full clinical-record access', async () => {
    const createPatient = vi.fn(async (_clinic, dto) => ({ id: 'new-patient', ...dto }));
    const controller = new PatientsController({ createPatient } as any);
    const result = await controller.createPatient({ ...user, role: 'RECEPTIONIST' }, { medicalSafetyAlerts: null } as any);
    expect(result.id).toBe('new-patient');
    expect(createPatient).toHaveBeenCalledTimes(1);
    await expect(authorize(ClinicalNotesController, 'getClinicalNotes', 'RECEPTIONIST', 'ACTIVE', 'GET')).rejects.toThrow();
  });

  it('#3 limits administrative patient responses to demographics', async () => {
    const record = { id: 'patient', firstName: 'Synthetic', medicalSafetyAlerts: ['Synthetic allergy'], appointments: [{ notes: 'Synthetic medical note' }] };
    const controller = new PatientsController({ getPatient: vi.fn(async () => record) } as any);
    const finance = await controller.getPatient({ ...user, role: 'ACCOUNTANT' }, 'patient');
    expect(finance).not.toHaveProperty('medicalSafetyAlerts');
    expect(finance).not.toHaveProperty('appointments');
    expect(await controller.getPatient(user, 'patient')).toEqual(record);
  });

  it.each([
    'ORGANIZATION_ADMIN',
    'BRANCH_ADMIN',
    'DOCTOR',
    'RECEPTIONIST',
    'ACCOUNTANT',
  ])(
    '#3 applies explicit clinical/document/archive/inventory permissions to %s',
    async (role) => {
      const admin = ['ORGANIZATION_ADMIN', 'BRANCH_ADMIN'].includes(role);
      const cases: Array<[any, string, boolean]> = [
        [ClinicalNotesController, 'updateClinicalNote', role === 'DOCTOR'],
        [
          ClinicalNotesController,
          'getClinicalNotes',
          admin || role === 'DOCTOR',
        ],
        [ClinicalController, 'deleteDocument', admin],
        [ClinicalController, 'saveToothCondition', role === 'DOCTOR'],
        [ClinicalController, 'deleteConsent', admin],
        [PatientsController, 'archivePatient', admin],
        [InventoryController, 'createItem', admin],
        [InventoryController, 'confirmDeduction', admin || role === 'DOCTOR'],
      ];
      for (const [controller, method, allowed] of cases) {
        if (allowed)
          await expect(authorize(controller, method, role)).resolves.toBe(true);
        else
          await expect(authorize(controller, method, role)).rejects.toThrow();
      }
    },
  );

  it('#8 allows read-only reads, blocks writes, and blocks platform sessions on clinic routes', async () => {
    await expect(
      authorize(
        ClinicalNotesController,
        'getClinicalNotes',
        'DOCTOR',
        'READ_ONLY',
        'GET',
      ),
    ).resolves.toBe(true);
    await expect(
      authorize(
        ClinicalNotesController,
        'updateClinicalNote',
        'DOCTOR',
        'READ_ONLY',
      ),
    ).rejects.toThrow(/read-only/);
    await expect(
      authorize(
        ClinicalNotesController,
        'updateClinicalNote',
        'ORGANIZATION_ADMIN',
        'SUSPENDED',
        'PATCH',
        true,
      ),
    ).rejects.toThrow(/Platform administrator/);
  });

  it.each(['SUSPENDED', 'CLOSED'])(
    '#8 denies %s at login and refresh',
    async (status) => {
      const account = {
        ...user,
        isActive: true,
        email: 'synthetic@example.test',
        passwordHash: bcrypt.hashSync('SyntheticPassword!', 4),
        clinic: { status },
      };
      const db: any = { user: { findUnique: vi.fn(async () => account) } };
      const jwt: any = { sign: vi.fn() };
      const session: any = {
        createSession: vi.fn(),
        rotateRefreshToken: vi.fn(async () => ({
          session: { id: 'session', userId: user.id },
          newRefreshToken: 'synthetic',
        })),
      };
      const service = new AuthService(db, jwt, session, undefined, {
        recordEvent: vi.fn(),
      } as any);
      await expect(
        service.login({ email: account.email, password: 'SyntheticPassword!' }),
      ).rejects.toThrow(/Clinic access/);
      expect(session.createSession).not.toHaveBeenCalled();
      await expect(service.refreshSession('synthetic')).rejects.toThrow(
        /Clinic access/,
      );
      expect(jwt.sign).not.toHaveBeenCalled();
    },
  );

  it('#6 rejects direct tenant provisioning at the service boundary', async () => {
    const db: any = { clinic: { findUnique: vi.fn() } };
    await expect(
      new SubscriptionsService(db).assignSubscription(
        { clinicId: 'clinic-a', planId: 'premium', lockedPrice: 0 },
        { ...user, role: 'ORGANIZATION_ADMIN' },
      ),
    ).rejects.toThrow();
    expect(db.clinic.findUnique).not.toHaveBeenCalled();
  });
});

describe('Batch 1 treatment lifecycle and bootstrap', () => {
  const setup = () => {
    const plan = {
      id: 'plan-a',
      patientId: 'patient-a',
      status: 'PROPOSED',
      currentVersion: 1,
    };
    const db: any = {
      treatmentPlan: {
        findFirst: vi.fn(async () => plan),
        update: vi.fn(async (q: any) => ({ ...plan, ...q.data })),
      },
      treatmentEstimateRevision: {
        findUnique: vi.fn(async () => ({ id: 'revision-a' })),
        update: vi.fn(),
      },
      treatmentPlanHistory: { create: vi.fn() },
      patientDocument: { findFirst: vi.fn() },
      $queryRaw: vi.fn(async () => [{ id: 'plan-a' }]),
      $transaction: async (fn: any) => fn(db),
    };
    return { plan, db, service: new TreatmentPlansService(db) };
  };

  it.each(['DIGITAL_SIGNATURE', 'PATIENT_PORTAL'])(
    '#4 cannot fabricate direct %s through a staff endpoint',
    async (method) => {
      const { service, db } = setup();
      await expect(
        service.recordAcceptance('clinic-a', user, 'plan-a', {
          versionNumber: 1,
          patientAcceptedByName: 'Synthetic',
          acceptanceMethod: method as any,
          isStaffRecorded: false,
        }),
      ).rejects.toThrow();
      expect(db.treatmentPlan.update).not.toHaveBeenCalled();
    },
  );

  it('#4 records staff acceptance honestly and preserves optimistic state predicates', async () => {
    const { service, db } = setup();
    await service.recordAcceptance('clinic-a', user, 'plan-a', {
      versionNumber: 1,
      patientAcceptedByName: 'Synthetic',
      acceptanceMethod: 'STAFF_RECORDED',
    });
    expect(db.treatmentPlan.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'plan-a',
          clinicId: 'clinic-a',
          status: 'PROPOSED',
          currentVersion: 1,
        },
        data: expect.objectContaining({
          isStaffRecorded: true,
          acceptanceRecordedById: user.id,
        }),
      }),
    );
  });

  it('#4 rejects old estimates, invalid transitions and unlinked written evidence', async () => {
    const { service, db } = setup();
    await expect(
      service.recordAcceptance('clinic-a', user, 'plan-a', {
        versionNumber: 2,
        patientAcceptedByName: 'Synthetic',
        acceptanceMethod: 'STAFF_RECORDED',
      }),
    ).rejects.toThrow();
    await expect(
      service.recordAcceptance('clinic-a', user, 'plan-a', {
        versionNumber: 1,
        patientAcceptedByName: 'Synthetic',
        acceptanceMethod: 'WRITTEN_CONSENT',
      }),
    ).rejects.toThrow();
    await expect(
      service.updatePlanStatus('clinic-a', user, 'plan-a', {
        status: 'COMPLETED',
      }),
    ).rejects.toThrow();
    expect(db.treatmentPlan.update).not.toHaveBeenCalled();
  });

  it('#5 requires explicit credentials and refuses to reset/elevate existing accounts', async () => {
    // The provisioning module is import-safe and never opens a database here.
    const { provisionPlatformAdmin } =
      await import('../../scripts/create-platform-admin.mjs');
    const db: any = {
      user: {
        findUnique: vi.fn(async () => null),
        create: vi.fn(async () => ({ id: 'new-admin' })),
        update: vi.fn(),
        upsert: vi.fn(),
      },
    };
    await expect(provisionPlatformAdmin(db, {} as any)).rejects.toThrow(
      /Explicit/,
    );
    expect(db.user.findUnique).not.toHaveBeenCalled();
    const credentials = {
      email: 'operator@example.test',
      password: randomBytes(24).toString('base64'),
      fullName: 'Synthetic Operator',
    };
    await provisionPlatformAdmin(db, credentials);
    const stored = db.user.create.mock.calls[0][0].data;
    expect(
      await bcrypt.compare(credentials.password, stored.passwordHash),
    ).toBe(true);
    db.user.findUnique.mockResolvedValue({ id: 'existing' });
    await expect(provisionPlatformAdmin(db, credentials)).rejects.toThrow(
      /already exists/,
    );
    expect(db.user.create).toHaveBeenCalledTimes(1);
    expect(db.user.update).not.toHaveBeenCalled();
    expect(db.user.upsert).not.toHaveBeenCalled();
  });
});
