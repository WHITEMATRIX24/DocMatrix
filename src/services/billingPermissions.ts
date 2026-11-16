/**
 * Billing Permission helpers for DocMatrix Frontend.
 *
 * Confirmed Business Rules:
 * - Clinic Administrators (ORGANIZATION_ADMIN, BRANCH_ADMIN) and Accountants (ACCOUNTANT)
 *   can issue refunds, void invoices, and manage tariffs/treatment prices.
 * - Receptionists can create invoices and collect payments, but cannot void or refund.
 * - Doctors can create invoices (e.g. from treatments) and view price lists.
 * - Unauthorized roles are prevented from viewing or activating restricted actions.
 * - Backend authorization remains the authoritative security boundary.
 */
import { getCurrentUser } from './authService';

export const BILLING_ADMIN_ROLES = [
  'ORGANIZATION_ADMIN',
  'BRANCH_ADMIN',
  'ACCOUNTANT',
] as const;

export const INVOICE_CREATOR_ROLES = [
  'ORGANIZATION_ADMIN',
  'BRANCH_ADMIN',
  'ACCOUNTANT',
  'RECEPTIONIST',
  'DOCTOR',
] as const;

export const PAYMENT_COLLECTOR_ROLES = [
  'ORGANIZATION_ADMIN',
  'BRANCH_ADMIN',
  'ACCOUNTANT',
  'RECEPTIONIST',
] as const;

export function canVoidInvoice(role?: string | null): boolean {
  if (!role) return false;
  return (BILLING_ADMIN_ROLES as readonly string[]).includes(role);
}

export function canManageTariffs(role?: string | null): boolean {
  if (!role) return false;
  return (BILLING_ADMIN_ROLES as readonly string[]).includes(role);
}

export function canIssueRefunds(role?: string | null): boolean {
  if (!role) return false;
  return (BILLING_ADMIN_ROLES as readonly string[]).includes(role);
}

export function canManageExpenses(role?: string | null): boolean {
  if (!role) return false;
  return (BILLING_ADMIN_ROLES as readonly string[]).includes(role);
}

export function canCollectPayments(role?: string | null): boolean {
  if (!role) return false;
  return (PAYMENT_COLLECTOR_ROLES as readonly string[]).includes(role);
}

export function canCreateInvoices(role?: string | null): boolean {
  if (!role) return false;
  return (INVOICE_CREATOR_ROLES as readonly string[]).includes(role);
}

/**
 * Returns billing capabilities for the currently authenticated staff member.
 */
export function getBillingPermissions(role?: string | null) {
  const effectiveRole = role !== undefined ? role : getCurrentUser()?.role;
  return {
    canVoid: canVoidInvoice(effectiveRole),
    canManageTariffs: canManageTariffs(effectiveRole),
    canRefund: canIssueRefunds(effectiveRole),
    canManageExpenses: canManageExpenses(effectiveRole),
    canCollectPayment: canCollectPayments(effectiveRole),
    canCreateInvoice: canCreateInvoices(effectiveRole),
    role: effectiveRole,
  };
}

