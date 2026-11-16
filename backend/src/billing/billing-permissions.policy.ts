import { StaffRole } from '@prisma/client';

export const BillingPermission = {
  INVOICE_READ: 'billing.invoice.read',
  INVOICE_CREATE: 'billing.invoice.create',
  INVOICE_UPDATE: 'billing.invoice.update',
  INVOICE_VOID: 'billing.invoice.void',
  PAYMENT_COLLECT: 'billing.payment.collect',
  REFUND_ISSUE: 'billing.refund.issue',
  TARIFF_READ: 'billing.tariff.read',
  TARIFF_MANAGE: 'billing.tariff.manage',
  EXPENSE_READ: 'billing.expense.read',
  EXPENSE_MANAGE: 'billing.expense.manage',
} as const;

export type BillingPermission = (typeof BillingPermission)[keyof typeof BillingPermission];

/**
 * Default role-to-permissions policy for DocMatrix billing operations.
 *
 * Confirmed Business Rules:
 * - Clinic Administrators (ORGANIZATION_ADMIN, BRANCH_ADMIN) and Accountants (ACCOUNTANT)
 *   are authorized to issue refunds, void invoices, and manage tariffs.
 * - Receptionists can create/view invoices, collect payments, view tariffs, and view expenses.
 * - Doctors can view invoices, create invoices (e.g. from treatment plans), and view tariffs.
 * - Nurses, Lab Technicians, and Pharmacists have no billing permissions by default.
 */
export const DEFAULT_BILLING_PERMISSIONS: Readonly<Record<StaffRole, readonly BillingPermission[]>> = {
  [StaffRole.ORGANIZATION_ADMIN]: [
    BillingPermission.INVOICE_READ,
    BillingPermission.INVOICE_CREATE,
    BillingPermission.INVOICE_UPDATE,
    BillingPermission.INVOICE_VOID,
    BillingPermission.PAYMENT_COLLECT,
    BillingPermission.REFUND_ISSUE,
    BillingPermission.TARIFF_READ,
    BillingPermission.TARIFF_MANAGE,
    BillingPermission.EXPENSE_READ,
    BillingPermission.EXPENSE_MANAGE,
  ],
  [StaffRole.BRANCH_ADMIN]: [
    BillingPermission.INVOICE_READ,
    BillingPermission.INVOICE_CREATE,
    BillingPermission.INVOICE_UPDATE,
    BillingPermission.INVOICE_VOID,
    BillingPermission.PAYMENT_COLLECT,
    BillingPermission.REFUND_ISSUE,
    BillingPermission.TARIFF_READ,
    BillingPermission.TARIFF_MANAGE,
    BillingPermission.EXPENSE_READ,
    BillingPermission.EXPENSE_MANAGE,
  ],
  [StaffRole.ACCOUNTANT]: [
    BillingPermission.INVOICE_READ,
    BillingPermission.INVOICE_CREATE,
    BillingPermission.INVOICE_UPDATE,
    BillingPermission.INVOICE_VOID,
    BillingPermission.PAYMENT_COLLECT,
    BillingPermission.REFUND_ISSUE,
    BillingPermission.TARIFF_READ,
    BillingPermission.TARIFF_MANAGE,
    BillingPermission.EXPENSE_READ,
    BillingPermission.EXPENSE_MANAGE,
  ],
  [StaffRole.RECEPTIONIST]: [
    BillingPermission.INVOICE_READ,
    BillingPermission.INVOICE_CREATE,
    BillingPermission.INVOICE_UPDATE,
    BillingPermission.PAYMENT_COLLECT,
    BillingPermission.TARIFF_READ,
    BillingPermission.EXPENSE_READ,
  ],
  [StaffRole.DOCTOR]: [
    BillingPermission.INVOICE_READ,
    BillingPermission.INVOICE_CREATE,
    BillingPermission.TARIFF_READ,
  ],
  [StaffRole.NURSE]: [],
  [StaffRole.LAB_TECHNICIAN]: [],
  [StaffRole.PHARMACIST]: [],
};

// Dynamic in-memory policy state permitting runtime policy configuration
const dynamicPolicy = new Map<StaffRole, Set<BillingPermission>>();

function initPolicy(): void {
  dynamicPolicy.clear();
  for (const role of Object.values(StaffRole)) {
    const defaultPerms = DEFAULT_BILLING_PERMISSIONS[role] || [];
    dynamicPolicy.set(role, new Set<BillingPermission>(defaultPerms));
  }
}

// Initialize on module load
initPolicy();

/**
 * Returns all assigned billing permissions for a given staff role.
 */
export function getRoleBillingPermissions(role: StaffRole | string): BillingPermission[] {
  const staffRole = role as StaffRole;
  const roleSet = dynamicPolicy.get(staffRole);
  if (!roleSet) return [];
  return Array.from(roleSet);
}

/**
 * Checks whether a given staff role possesses the specified billing permission.
 */
export function hasBillingPermission(role: StaffRole | string, permission: BillingPermission): boolean {
  const staffRole = role as StaffRole;
  const roleSet = dynamicPolicy.get(staffRole);
  if (!roleSet) return false;
  return roleSet.has(permission);
}

/**
 * Replaces the billing permissions for a staff role in the active policy.
 * Useful for runtime updates and automated policy testing.
 */
export function setRoleBillingPermissions(role: StaffRole, permissions: readonly BillingPermission[]): void {
  dynamicPolicy.set(role, new Set<BillingPermission>(permissions));
}

/**
 * Resets the active policy back to DocMatrix defaults.
 */
export function resetBillingPermissionsPolicy(): void {
  initPolicy();
}

