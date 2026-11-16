import { describe, it, expect, beforeEach } from 'vitest';
import {
  canVoidInvoice,
  canManageTariffs,
  canIssueRefunds,
  canManageExpenses,
  canCollectPayments,
  canCreateInvoices,
  getBillingPermissions,
  BILLING_ADMIN_ROLES,
} from '../src/services/billingPermissions';

describe('Frontend Billing Role-Based Permissions', () => {
  it('identifies Organization Admin as having all billing administrative capabilities', () => {
    const role = 'ORGANIZATION_ADMIN';
    expect(canVoidInvoice(role)).toBe(true);
    expect(canManageTariffs(role)).toBe(true);
    expect(canIssueRefunds(role)).toBe(true);
    expect(canManageExpenses(role)).toBe(true);
    expect(canCollectPayments(role)).toBe(true);
    expect(canCreateInvoices(role)).toBe(true);
  });

  it('identifies Branch Admin as having all billing administrative capabilities', () => {
    const role = 'BRANCH_ADMIN';
    expect(canVoidInvoice(role)).toBe(true);
    expect(canManageTariffs(role)).toBe(true);
    expect(canIssueRefunds(role)).toBe(true);
    expect(canManageExpenses(role)).toBe(true);
    expect(canCollectPayments(role)).toBe(true);
    expect(canCreateInvoices(role)).toBe(true);
  });

  it('identifies Accountant as having all billing administrative capabilities', () => {
    const role = 'ACCOUNTANT';
    expect(canVoidInvoice(role)).toBe(true);
    expect(canManageTariffs(role)).toBe(true);
    expect(canIssueRefunds(role)).toBe(true);
    expect(canManageExpenses(role)).toBe(true);
    expect(canCollectPayments(role)).toBe(true);
    expect(canCreateInvoices(role)).toBe(true);
  });

  it('restricts Receptionist from voiding invoices, issuing refunds, and managing tariffs', () => {
    const role = 'RECEPTIONIST';
    expect(canVoidInvoice(role)).toBe(false);
    expect(canManageTariffs(role)).toBe(false);
    expect(canIssueRefunds(role)).toBe(false);
    expect(canManageExpenses(role)).toBe(false);

    // Legitimate workflows preserved
    expect(canCollectPayments(role)).toBe(true);
    expect(canCreateInvoices(role)).toBe(true);
  });

  it('restricts Doctor from voiding invoices, issuing refunds, managing tariffs, and collecting payments', () => {
    const role = 'DOCTOR';
    expect(canVoidInvoice(role)).toBe(false);
    expect(canManageTariffs(role)).toBe(false);
    expect(canIssueRefunds(role)).toBe(false);
    expect(canManageExpenses(role)).toBe(false);
    expect(canCollectPayments(role)).toBe(false);

    // Legitimate clinical workflow preserved
    expect(canCreateInvoices(role)).toBe(true);
  });

  it('restricts Nurse, Lab Technician, and Pharmacist from all sensitive billing actions', () => {
    const unauthorized = ['NURSE', 'LAB_TECHNICIAN', 'PHARMACIST'];
    for (const role of unauthorized) {
      expect(canVoidInvoice(role)).toBe(false);
      expect(canManageTariffs(role)).toBe(false);
      expect(canIssueRefunds(role)).toBe(false);
      expect(canManageExpenses(role)).toBe(false);
      expect(canCollectPayments(role)).toBe(false);
      expect(canCreateInvoices(role)).toBe(false);
    }
  });

  it('safely handles missing, null, or undefined role by denying administrative actions', () => {
    expect(canVoidInvoice(null)).toBe(false);
    expect(canVoidInvoice(undefined)).toBe(false);
    expect(canVoidInvoice('')).toBe(false);
    expect(canManageTariffs(null)).toBe(false);
    expect(canIssueRefunds(null)).toBe(false);
  });

  it('returns complete billing permissions summary via getBillingPermissions', () => {
    const perms = getBillingPermissions('ACCOUNTANT');
    expect(perms).toEqual({
      canVoid: true,
      canManageTariffs: true,
      canRefund: true,
      canManageExpenses: true,
      canCollectPayment: true,
      canCreateInvoice: true,
      role: 'ACCOUNTANT',
    });

    const docPerms = getBillingPermissions('DOCTOR');
    expect(docPerms).toEqual({
      canVoid: false,
      canManageTariffs: false,
      canRefund: false,
      canManageExpenses: false,
      canCollectPayment: false,
      canCreateInvoice: true,
      role: 'DOCTOR',
    });
  });
});

