import { Injectable } from '@nestjs/common';
import { ExpenseCategory, GstClass, InvoiceStatus, InvoicePaymentType, PaymentMode } from '@prisma/client';

export interface ComputedLineItem {
  name: string;
  category?: string;
  toothNumber?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  gstRate: number;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
  serviceTariffId?: string;
  treatmentPlanItemId?: string;
}

export interface ComputedInvoiceTotals {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  totalAmount: number;
  paidAmount: number;
  balance: number;
}

@Injectable()
export class BillingCalculationService {
  /**
   * Precise half-up monetary rounding to 2 decimal places.
   */
  round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  /**
   * Computes totals for a single invoice line item with configurable GST and discount.
   */
  computeLineItem(item: {
    name: string;
    category?: string;
    toothNumber?: string;
    quantity?: number;
    unitPrice: number;
    discount?: number;
    gstRate?: number;
    serviceTariffId?: string;
    treatmentPlanItemId?: string;
  }): ComputedLineItem {
    const quantity = Math.max(1, Math.floor(item.quantity ?? 1));
    const unitPrice = this.round2(Math.max(0, item.unitPrice ?? 0));
    const gross = this.round2(quantity * unitPrice);

    // Discount cannot exceed gross line item price
    const discount = this.round2(Math.min(gross, Math.max(0, item.discount ?? 0)));
    const taxableAmount = this.round2(Math.max(0, gross - discount));

    const gstRate = this.round2(Math.max(0, item.gstRate ?? 0));
    const taxAmount = this.round2((taxableAmount * gstRate) / 100);
    const totalAmount = this.round2(taxableAmount + taxAmount);

    return {
      name: item.name,
      category: item.category,
      toothNumber: item.toothNumber,
      quantity,
      unitPrice,
      discount,
      gstRate,
      taxableAmount,
      taxAmount,
      totalAmount,
      serviceTariffId:
        typeof item.serviceTariffId === 'string' && item.serviceTariffId.trim().length > 0
          ? item.serviceTariffId.trim()
          : undefined,
      treatmentPlanItemId:
        typeof item.treatmentPlanItemId === 'string' && item.treatmentPlanItemId.trim().length > 0
          ? item.treatmentPlanItemId.trim()
          : undefined,
    };
  }

  /**
   * Computes aggregate totals across all invoice line items.
   */
  computeInvoiceTotals(
    items: ComputedLineItem[],
    payments: { type: InvoicePaymentType; amount: number }[] = [],
  ): ComputedInvoiceTotals {
    let subtotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    let totalAmount = 0;

    for (const item of items) {
      subtotal += item.quantity * item.unitPrice;
      discountTotal += item.discount;
      taxTotal += item.taxAmount;
      totalAmount += item.totalAmount;
    }

    subtotal = this.round2(subtotal);
    discountTotal = this.round2(discountTotal);
    taxTotal = this.round2(taxTotal);
    totalAmount = this.round2(totalAmount);

    // Sum inbound payments minus refunds
    let totalPayments = 0;
    let totalRefunds = 0;

    for (const p of payments) {
      const amt = Number(p.amount);
      if (p.type === InvoicePaymentType.PAYMENT) {
        totalPayments += amt;
      } else if (p.type === InvoicePaymentType.REFUND) {
        totalRefunds += amt;
      }
    }

    const paidAmount = this.round2(Math.max(0, totalPayments - totalRefunds));
    const balance = this.round2(Math.max(0, totalAmount - paidAmount));

    return {
      subtotal,
      discountTotal,
      taxTotal,
      totalAmount,
      paidAmount,
      balance,
    };
  }

  /**
   * Derive invoice status based on payment state and current status.
   */
  deriveInvoiceStatus(
    currentStatus: InvoiceStatus,
    totalAmount: number,
    paidAmount: number,
  ): InvoiceStatus {
    if (currentStatus === InvoiceStatus.DRAFT) {
      return InvoiceStatus.DRAFT;
    }
    if (currentStatus === InvoiceStatus.VOID) {
      return InvoiceStatus.VOID;
    }

    if (paidAmount >= totalAmount && totalAmount > 0) {
      return InvoiceStatus.PAID;
    }
    if (paidAmount > 0) {
      return InvoiceStatus.PARTIALLY_PAID;
    }
    return InvoiceStatus.ISSUED;
  }

  /**
   * Categorizes invoice age into buckets: '0-30', '31-60', or '60+'.
   */
  getAgingCategory(issuedOrCreatedAt: Date | string): '0-30' | '31-60' | '60+' {
    const date = new Date(issuedOrCreatedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 30) return '0-30';
    if (diffDays <= 60) return '31-60';
    return '60+';
  }

  /**
   * Maps human-readable or frontend category labels to Prisma ExpenseCategory enum.
   */
  parseExpenseCategory(category: string): ExpenseCategory {
    const normalized = category.trim().toUpperCase().replace(/[\s&]+/g, '_');
    switch (normalized) {
      case 'LAB_FEES':
      case 'LAB_FEE':
        return ExpenseCategory.LAB_FEES;
      case 'DENTAL_SUPPLIES':
      case 'SUPPLIES':
        return ExpenseCategory.DENTAL_SUPPLIES;
      case 'RENT':
        return ExpenseCategory.RENT;
      case 'SALARIES':
      case 'SALARY':
        return ExpenseCategory.SALARIES;
      case 'UTILITIES':
      case 'UTILITY':
        return ExpenseCategory.UTILITIES;
      case 'EQUIPMENT_MAINTENANCE':
      case 'EQUIPMENT':
      case 'MAINTENANCE':
        return ExpenseCategory.EQUIPMENT_MAINTENANCE;
      case 'MARKETING':
        return ExpenseCategory.MARKETING;
      default:
        return ExpenseCategory.OTHER;
    }
  }

  /**
   * Maps human-readable GstClass to Prisma GstClass and standard rate.
   */
  parseGstClass(gstClassStr?: string): { gstClass: GstClass; defaultRate: number } {
    if (!gstClassStr) {
      return { gstClass: GstClass.EXEMPT, defaultRate: 0 };
    }
    const normalized = gstClassStr.trim().toUpperCase();
    switch (normalized) {
      case 'TREATMENT':
      case 'EXEMPT':
        return { gstClass: GstClass.EXEMPT, defaultRate: 0 };
      case 'NIL_RATED':
      case 'NIL':
        return { gstClass: GstClass.NIL_RATED, defaultRate: 0 };
      case 'COSMETIC':
      case 'TAXABLE':
      case 'GST_18':
      case 'GST_5':
      case 'GST_12':
      case 'GST_28':
        return {
          gstClass: GstClass.TAXABLE,
          defaultRate:
            normalized === 'GST_5'
              ? 5
              : normalized === 'GST_12'
              ? 12
              : normalized === 'GST_28'
              ? 28
              : 18,
        };
      default:
        return { gstClass: GstClass.EXEMPT, defaultRate: 0 };
    }
  }

  /**
   * Normalizes payment mode strings (e.g. 'UPI', 'Cash', 'Card') into Prisma PaymentMode enum.
   */
  parsePaymentMode(mode?: string): PaymentMode {
    if (!mode) return PaymentMode.UPI;
    const normalized = mode.trim().toUpperCase().replace(/[\s-]+/g, '_');
    switch (normalized) {
      case 'CASH':
        return PaymentMode.CASH;
      case 'CARD':
        return PaymentMode.CARD;
      case 'UPI':
        return PaymentMode.UPI;
      case 'NET_BANKING':
      case 'NETBANKING':
        return PaymentMode.NET_BANKING;
      case 'CHEQUE':
        return PaymentMode.CHEQUE;
      default:
        return PaymentMode.UPI;
    }
  }
}
