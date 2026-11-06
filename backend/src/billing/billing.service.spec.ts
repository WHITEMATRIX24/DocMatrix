import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from './billing.service.js';
import { BillingCalculationService } from './billing-calculation.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import {
  ExpenseCategory,
  GstClass,
  InvoicePaymentType,
  InvoiceStatus,
  PaymentMode,
  Prisma,
} from '@prisma/client';

describe('BillingService & BillingCalculationService', () => {
  let billingService: BillingService;
  let calcService: BillingCalculationService;
  let prisma: any;

  const mockClinicId = 'clinic-alpha-101';
  const mockOtherClinicId = 'clinic-beta-202';

  const mockStaffUser: AuthenticatedUser = {
    id: 'staff-user-1',
    clinicId: mockClinicId,
    email: 'billing@docmatrix.in',
    fullName: 'Priya Sharma',
    role: 'RECEPTIONIST',
    isPlatformAdmin: false,
    isPrimaryContact: false,
  };

  const mockPatient = {
    id: 'pat-101',
    clinicId: mockClinicId,
    patientCode: 'pt-1001',
    firstName: 'Arjun',
    lastName: 'Menon',
    mobile: '+919876543210',
  };

  beforeEach(async () => {
    prisma = {
      patient: {
        findFirst: vi.fn(),
      },
      appointment: {
        findFirst: vi.fn(),
      },
      treatmentPlan: {
        findFirst: vi.fn(),
      },
      invoice: {
        create: vi.fn(),
        update: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      invoiceLineItem: {
        createMany: vi.fn(),
        deleteMany: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      invoicePayment: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
      },
      treatmentPlanItem: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      serviceTariff: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      expense: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      $queryRaw: vi.fn(),
      $executeRaw: vi.fn(),
      $transaction: vi.fn(async (cb: any) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        BillingCalculationService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    billingService = module.get<BillingService>(BillingService);
    calcService = module.get<BillingCalculationService>(BillingCalculationService);
  });

  // ========================================================
  // 1. FINANCIAL CALCULATION TESTS
  // ========================================================
  describe('BillingCalculationService', () => {
    it('accurately computes line items with discount and GST', () => {
      // 2 units @ 1500 = 3000 gross. Discount 500 => Taxable 2500. GST 18% => 450. Total => 2950
      const item = calcService.computeLineItem({
        name: 'Ceramic Crown',
        quantity: 2,
        unitPrice: 1500,
        discount: 500,
        gstRate: 18,
      });

      expect(item.quantity).toBe(2);
      expect(item.unitPrice).toBe(1500);
      expect(item.discount).toBe(500);
      expect(item.taxableAmount).toBe(2500);
      expect(item.taxAmount).toBe(450);
      expect(item.totalAmount).toBe(2950);
    });

    it('caps discount so taxable amount never falls below zero', () => {
      const item = calcService.computeLineItem({
        name: 'Consultation',
        quantity: 1,
        unitPrice: 500,
        discount: 800, // Excess discount
        gstRate: 0,
      });

      expect(item.discount).toBe(500); // capped at gross
      expect(item.taxableAmount).toBe(0);
      expect(item.taxAmount).toBe(0);
      expect(item.totalAmount).toBe(0);
    });

    it('aggregates multi-item invoice totals correctly with half-up rounding', () => {
      const items = [
        calcService.computeLineItem({ name: 'Service 1', quantity: 1, unitPrice: 333.33, gstRate: 18 }),
        calcService.computeLineItem({ name: 'Service 2', quantity: 1, unitPrice: 666.67, gstRate: 5 }),
      ];

      const totals = calcService.computeInvoiceTotals(items);
      expect(totals.subtotal).toBe(1000);
      expect(totals.totalAmount).toBe(totals.subtotal - totals.discountTotal + totals.taxTotal);
      expect(totals.paidAmount).toBe(0);
      expect(totals.balance).toBe(totals.totalAmount);
    });

    it('determines status correctly: DRAFT, ISSUED, PARTIALLY_PAID, PAID', () => {
      expect(calcService.deriveInvoiceStatus(InvoiceStatus.DRAFT, 1000, 0)).toBe(InvoiceStatus.DRAFT);
      expect(calcService.deriveInvoiceStatus(InvoiceStatus.ISSUED, 1000, 0)).toBe(InvoiceStatus.ISSUED);
      expect(calcService.deriveInvoiceStatus(InvoiceStatus.ISSUED, 1000, 400)).toBe(InvoiceStatus.PARTIALLY_PAID);
      expect(calcService.deriveInvoiceStatus(InvoiceStatus.ISSUED, 1000, 1000)).toBe(InvoiceStatus.PAID);
      expect(calcService.deriveInvoiceStatus(InvoiceStatus.VOID, 1000, 0)).toBe(InvoiceStatus.VOID);
    });

    it('classifies aging into buckets (0-30, 31-60, 60+)', () => {
      const now = new Date();
      const d10 = new Date(now.getTime() - 10 * 86400000);
      const d45 = new Date(now.getTime() - 45 * 86400000);
      const d75 = new Date(now.getTime() - 75 * 86400000);

      expect(calcService.getAgingCategory(d10)).toBe('0-30');
      expect(calcService.getAgingCategory(d45)).toBe('31-60');
      expect(calcService.getAgingCategory(d75)).toBe('60+');
    });
  });

  // ========================================================
  // 2. INVOICE LIFECYCLE MANAGEMENT
  // ========================================================
  describe('Invoice Lifecycle', () => {
    it('creates a draft invoice with resolved patient and computed items', async () => {
      prisma.patient.findFirst.mockResolvedValue(mockPatient);
      prisma.$queryRaw.mockResolvedValue([{ assignedValue: 1005 }]);
      prisma.invoice.create.mockImplementation((args: any) => ({
        id: 'inv-uuid-1',
        ...args.data,
        items: args.data.items?.create || [],
      }));

      const result = await billingService.createDraftInvoice(mockClinicId, mockStaffUser, {
        patientId: 'pt-1001',
        description: 'Root Canal Consultation',
        items: [
          { name: 'X-Ray (IOPA)', quantity: 1, unitPrice: 300, gstRate: 0 },
          { name: 'Consultation Fee', quantity: 1, unitPrice: 500, gstRate: 0 },
        ],
      });

      expect(result.invoiceNumber).toBe('DFT-1005');
      expect(result.status).toBe(InvoiceStatus.DRAFT);
      expect(Number(result.subtotal)).toBe(800);
      expect(Number(result.totalAmount)).toBe(800);
      expect(Number(result.balance)).toBe(800);
    });

    it('updates draft invoice items and recalculates totals', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        id: 'inv-uuid-1',
        clinicId: mockClinicId,
        invoiceNumber: 'DFT-1005',
        status: InvoiceStatus.DRAFT,
        patientId: mockPatient.id,
        subtotal: 800,
        discountTotal: 0,
        taxTotal: 0,
        totalAmount: 800,
        items: [{ id: 'item-1' }],
      });
      prisma.invoiceLineItem.deleteMany.mockResolvedValue({ count: 1 });
      prisma.invoiceLineItem.createMany.mockResolvedValue({ count: 1 });
      prisma.invoice.update.mockImplementation((args: any) => ({
        id: 'inv-uuid-1',
        ...args.data,
      }));

      const updated = await billingService.updateDraftInvoice(
        mockClinicId,
        mockStaffUser,
        'inv-uuid-1',
        {
          items: [{ name: 'Composite Restoration', quantity: 1, unitPrice: 1200, gstRate: 0 }],
        },
      );

      expect(Number(updated.totalAmount)).toBe(1200);
      expect(prisma.invoiceLineItem.deleteMany).toHaveBeenCalled();
      expect(prisma.invoiceLineItem.createMany).toHaveBeenCalled();
    });

    it('rejects editing an already issued invoice', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        id: 'inv-uuid-1',
        clinicId: mockClinicId,
        invoiceNumber: 'INV-1001',
        status: InvoiceStatus.ISSUED,
      });

      await expect(
        billingService.updateDraftInvoice(mockClinicId, mockStaffUser, 'inv-uuid-1', {
          description: 'Changed description',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('issues a draft invoice and allocates a sequential permanent INV-xxxx number', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        id: 'inv-uuid-1',
        clinicId: mockClinicId,
        invoiceNumber: 'DFT-1005',
        status: InvoiceStatus.DRAFT,
        items: [{ id: 'item-1', name: 'Scaling & Polishing' }],
      });
      prisma.$queryRaw.mockResolvedValue([{ assignedValue: 1042 }]);
      prisma.invoice.update.mockImplementation((args: any) => ({
        id: 'inv-uuid-1',
        ...args.data,
      }));

      const issued = await billingService.issueDraftInvoice(
        mockClinicId,
        mockStaffUser,
        'inv-uuid-1',
      );

      expect(issued.invoiceNumber).toBe('INV-1042');
      expect(issued.status).toBe(InvoiceStatus.ISSUED);
      expect(issued.issuedAt).toBeDefined();
    });

    it('rejects issuing a draft invoice with zero line items', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        id: 'inv-uuid-1',
        clinicId: mockClinicId,
        invoiceNumber: 'DFT-1005',
        status: InvoiceStatus.DRAFT,
        items: [], // Zero items
      });

      await expect(
        billingService.issueDraftInvoice(mockClinicId, mockStaffUser, 'inv-uuid-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('directly creates and issues invoice with upfront payment and marks status PAID', async () => {
      prisma.patient.findFirst.mockResolvedValue(mockPatient);
      prisma.$queryRaw.mockResolvedValue([{ assignedValue: 1050 }]);
      prisma.invoice.create.mockResolvedValue({
        id: 'inv-uuid-direct',
        clinicId: mockClinicId,
        invoiceNumber: 'INV-1050',
      });
      prisma.invoicePayment.create.mockResolvedValue({
        id: 'pay-uuid-1',
        amount: 2000,
      });
      prisma.invoice.update.mockImplementation((args: any) => ({
        id: 'inv-uuid-direct',
        invoiceNumber: 'INV-1050',
        ...args.data,
      }));

      const result = await billingService.createAndIssueInvoice(mockClinicId, mockStaffUser, {
        patientId: 'pt-1001',
        items: [{ name: 'Root Canal Stage 1', quantity: 1, unitPrice: 2000, gstRate: 0 }],
        upfrontPayment: {
          amount: 2000,
          mode: PaymentMode.UPI,
          reference: 'UPI/987654321',
        },
      });

      expect(result.invoiceNumber).toBe('INV-1050');
      expect(result.status).toBe(InvoiceStatus.PAID);
      expect(result.paidAmount).toBe(2000);
      expect(result.balance).toBe(0);
    });

    it('voids an issued invoice without payments', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        id: 'inv-uuid-1',
        clinicId: mockClinicId,
        invoiceNumber: 'INV-1001',
        status: InvoiceStatus.ISSUED,
        paidAmount: 0,
      });
      prisma.invoice.update.mockImplementation((args: any) => ({
        id: 'inv-uuid-1',
        ...args.data,
      }));

      const voided = await billingService.voidInvoice(
        mockClinicId,
        mockStaffUser,
        'inv-uuid-1',
        { reason: 'Patient cancelled treatment before procedure' },
      );

      expect(voided.status).toBe(InvoiceStatus.VOID);
      expect(voided.voidReason).toBe('Patient cancelled treatment before procedure');
      expect(voided.voidedById).toBe(mockStaffUser.id);
    });

    it('rejects voiding an invoice with active payments', async () => {
      prisma.invoice.findFirst.mockResolvedValue({
        id: 'inv-uuid-1',
        clinicId: mockClinicId,
        invoiceNumber: 'INV-1001',
        status: InvoiceStatus.PARTIALLY_PAID,
        paidAmount: 500,
      });

      await expect(
        billingService.voidInvoice(mockClinicId, mockStaffUser, 'inv-uuid-1', {
          reason: 'Attempting to void paid bill',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ========================================================
  // 3. PAYMENT MANAGEMENT, IDEMPOTENCY & REFUNDS
  // ========================================================
  describe('Payment Management', () => {
    it('records partial payment and updates status to PARTIALLY_PAID', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          id: 'inv-101',
          clinicId: mockClinicId,
          status: InvoiceStatus.ISSUED,
          totalAmount: 3000,
          paidAmount: 0,
          balance: 3000,
        },
      ]);
      prisma.invoicePayment.create.mockResolvedValue({
        id: 'pay-1',
        amount: 1000,
        mode: PaymentMode.CASH,
      });
      prisma.invoice.update.mockResolvedValue({});

      const payment = await billingService.recordPayment(mockClinicId, mockStaffUser, 'inv-101', {
        amount: 1000,
        mode: PaymentMode.CASH,
      });

      expect(payment.amount).toBe(1000);
      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv-101' },
          data: {
            paidAmount: 1000,
            balance: 2000,
            status: InvoiceStatus.PARTIALLY_PAID,
          },
        }),
      );
    });

    it('records second payment completing the invoice and updates status to PAID', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          id: 'inv-101',
          clinicId: mockClinicId,
          status: InvoiceStatus.PARTIALLY_PAID,
          totalAmount: 3000,
          paidAmount: 1000,
          balance: 2000,
        },
      ]);
      prisma.invoicePayment.create.mockResolvedValue({
        id: 'pay-2',
        amount: 2000,
        mode: PaymentMode.UPI,
      });

      await billingService.recordPayment(mockClinicId, mockStaffUser, 'inv-101', {
        amount: 2000,
        mode: PaymentMode.UPI,
      });

      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv-101' },
          data: {
            paidAmount: 3000,
            balance: 0,
            status: InvoiceStatus.PAID,
          },
        }),
      );
    });

    it('prevents overpayments and rejects amount exceeding remaining balance', async () => {
      prisma.$queryRaw.mockResolvedValue([
        {
          id: 'inv-101',
          clinicId: mockClinicId,
          status: InvoiceStatus.PARTIALLY_PAID,
          totalAmount: 1000,
          paidAmount: 800,
          balance: 200,
        },
      ]);

      await expect(
        billingService.recordPayment(mockClinicId, mockStaffUser, 'inv-101', {
          amount: 500, // Exceeds balance of 200
          mode: PaymentMode.CARD,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns existing payment record when duplicate idempotencyKey is supplied', async () => {
      prisma.invoicePayment.findUnique.mockResolvedValue({
        id: 'pay-already-processed',
        amount: 500,
        idempotencyKey: 'idem-uuid-12345',
      });

      const payment = await billingService.recordPayment(mockClinicId, mockStaffUser, 'inv-101', {
        amount: 500,
        mode: PaymentMode.UPI,
        idempotencyKey: 'idem-uuid-12345',
      });

      expect(payment.id).toBe('pay-already-processed');
      // Should not attempt to query or lock the invoice
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });

    it('refunds an eligible payment and restores invoice balance', async () => {
      prisma.invoicePayment.findFirst
        .mockResolvedValueOnce({
          id: 'pay-orig-1',
          clinicId: mockClinicId,
          invoiceId: 'inv-101',
          type: InvoicePaymentType.PAYMENT,
          amount: 1000,
          mode: PaymentMode.UPI,
        })
        .mockResolvedValueOnce(null); // No prior refund

      prisma.invoicePayment.create.mockResolvedValue({
        id: 'refund-1',
        type: InvoicePaymentType.REFUND,
        amount: 1000,
        refundForPaymentId: 'pay-orig-1',
      });

      prisma.invoice.findUniqueOrThrow.mockResolvedValue({
        id: 'inv-101',
        status: InvoiceStatus.PAID,
        totalAmount: 1000,
        paidAmount: 1000,
      });

      const refund = await billingService.refundPayment(
        mockClinicId,
        mockStaffUser,
        'pay-orig-1',
        { amount: 1000, reason: 'Patient requested refund' },
      );

      expect(refund.type).toBe(InvoicePaymentType.REFUND);
      expect(prisma.invoice.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv-101' },
          data: {
            paidAmount: 0,
            balance: 1000,
            status: InvoiceStatus.ISSUED,
          },
        }),
      );
    });

    it('rejects duplicate refund on the same payment', async () => {
      prisma.invoicePayment.findFirst
        .mockResolvedValueOnce({
          id: 'pay-orig-1',
          clinicId: mockClinicId,
          invoiceId: 'inv-101',
          type: InvoicePaymentType.PAYMENT,
          amount: 1000,
        })
        .mockResolvedValueOnce({ id: 'existing-refund-id' }); // Already refunded

      await expect(
        billingService.refundPayment(mockClinicId, mockStaffUser, 'pay-orig-1', {
          amount: 1000,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ========================================================
  // 4. PENDING DUES & AGING REPORTING
  // ========================================================
  describe('Pending Dues & Collections', () => {
    it('returns outstanding invoices with aging breakdown and summary totals', async () => {
      const now = new Date();
      prisma.invoice.findMany.mockResolvedValue([
        {
          id: 'inv-1',
          invoiceNumber: 'INV-1001',
          status: InvoiceStatus.ISSUED,
          balance: 1500,
          issuedAt: new Date(now.getTime() - 10 * 86400000), // 10 days ago (0-30)
          patient: { fullName: 'Arjun Menon', patientCode: 'pt-1001' },
        },
        {
          id: 'inv-2',
          invoiceNumber: 'INV-1002',
          status: InvoiceStatus.PARTIALLY_PAID,
          balance: 2500,
          issuedAt: new Date(now.getTime() - 40 * 86400000), // 40 days ago (31-60)
          patient: { fullName: 'Pooja Nair', patientCode: 'pt-1002' },
        },
      ]);

      const res = await billingService.getPendingDues(mockClinicId, { aging: 'all' });
      expect(res.summary.totalOutstanding).toBe(4000);
      expect(res.summary.breakdown['0-30']).toBe(1500);
      expect(res.summary.breakdown['31-60']).toBe(2500);
      expect(res.summary.breakdown['60+']).toBe(0);
      expect(res.invoices.length).toBe(2);
    });

    it('aggregates patient-wise outstanding balances correctly', async () => {
      prisma.invoice.findMany.mockResolvedValue([
        {
          patientId: 'pat-1',
          balance: 1000,
          issuedAt: new Date('2026-10-01'),
          patient: { firstName: 'Arjun', lastName: 'Menon', patientCode: 'pt-1001', mobile: '99999' },
        },
        {
          patientId: 'pat-1',
          balance: 1500,
          issuedAt: new Date('2026-10-15'),
          patient: { firstName: 'Arjun', lastName: 'Menon', patientCode: 'pt-1001', mobile: '99999' },
        },
      ]);

      const patientDues = await billingService.getPatientWiseDues(mockClinicId);
      expect(patientDues.length).toBe(1);
      expect(patientDues[0].patientId).toBe('pat-1');
      expect(patientDues[0].totalDue).toBe(2500);
      expect(patientDues[0].invoiceCount).toBe(2);
    });

    it('summarizes daily collections distinguishing gross, refunds, and net by mode', async () => {
      prisma.invoicePayment.findMany.mockResolvedValue([
        { amount: 2000, type: InvoicePaymentType.PAYMENT, mode: PaymentMode.UPI },
        { amount: 1500, type: InvoicePaymentType.PAYMENT, mode: PaymentMode.CASH },
        { amount: 500, type: InvoicePaymentType.REFUND, mode: PaymentMode.UPI },
      ]);

      const res = await billingService.getDailyCollections(mockClinicId, { date: '2026-11-05' });

      expect(res.grossCollections).toBe(3500);
      expect(res.totalRefunds).toBe(500);
      expect(res.netCollections).toBe(3000);
      expect(res.byMode.UPI.net).toBe(1500);
      expect(res.byMode.CASH.net).toBe(1500);
    });
  });

  // ========================================================
  // 5. SERVICE TARIFFS & EXPENSES
  // ========================================================
  describe('Service Tariffs & Expenses', () => {
    it('creates a service tariff with configured GST and preserves standard fee', async () => {
      prisma.serviceTariff.create.mockImplementation((args: any) => ({
        id: 'tar-1',
        ...args.data,
      }));

      const tariff = await billingService.createTariff(mockClinicId, {
        name: 'Root Canal Treatment (Molar)',
        code: 'RCT-MOL',
        category: 'Endodontics',
        standardFee: 4500,
        gstClass: GstClass.EXEMPT,
      });

      expect(tariff.name).toBe('Root Canal Treatment (Molar)');
      expect(tariff.standardFee).toBe(4500);
      expect(tariff.gstClass).toBe(GstClass.EXEMPT);
    });

    it('creates a clinic expense with sequential EXP-xxxx number', async () => {
      prisma.$queryRaw.mockResolvedValue([{ assignedValue: 1012 }]);
      prisma.expense.create.mockImplementation((args: any) => ({
        id: 'exp-1',
        ...args.data,
      }));

      const expense = await billingService.createExpense(mockClinicId, mockStaffUser, {
        date: '2026-11-05',
        category: 'Dental Supplies',
        description: 'Composite filling boxes and gloves',
        amount: 3200,
        mode: PaymentMode.UPI,
      });

      expect(expense.expenseNumber).toBe('EXP-1012');
      expect(expense.category).toBe(ExpenseCategory.DENTAL_SUPPLIES);
      expect(expense.amount).toBe(3200);
      expect(expense.paidById).toBe(mockStaffUser.id);
    });
  });

  // ========================================================
  // 6. CLINICAL INTEGRATION & DUPLICATE BILLING PREVENTION
  // ========================================================
  describe('Clinical & Treatment Plan Integration', () => {
    it('creates invoice from treatment plan stages', async () => {
      prisma.patient.findFirst.mockResolvedValue(mockPatient);
      prisma.treatmentPlan.findFirst.mockResolvedValue({
        id: 'plan-101',
        clinicId: mockClinicId,
        patientId: mockPatient.id,
        title: 'Full Arch Restoration',
        stages: [
          {
            id: 'stg-1',
            items: [
              {
                id: 'tp-item-1',
                procedureName: 'Surgical Extraction',
                category: 'Surgery',
                toothNumber: '48',
                quantity: 1,
                unitFee: 2500,
                discount: 0,
              },
            ],
          },
        ],
      });
      prisma.invoiceLineItem.findMany.mockResolvedValue([]); // Not yet billed
      prisma.treatmentPlanItem.findMany.mockResolvedValue([{ id: 'tp-item-1' }]);
      prisma.$queryRaw.mockResolvedValue([{ assignedValue: 1099 }]);
      prisma.invoice.create.mockImplementation((args: any) => ({
        id: 'inv-from-tp',
        ...args.data,
        items: args.data.items?.create ?? [],
      }));

      const invoice = await billingService.createInvoiceFromTreatmentPlan(
        mockClinicId,
        mockStaffUser,
        {
          treatmentPlanId: 'plan-101',
          issueImmediately: false,
        },
      );

      expect(invoice.treatmentPlanId).toBe('plan-101');
      expect(invoice.items[0].treatmentPlanItemId).toBe('tp-item-1');
      expect(invoice.items[0].toothNumber).toBe('48');
      expect(invoice.totalAmount).toBe(2500);
    });

    it('prevents duplicate billing of the same treatment item across active invoices', async () => {
      prisma.treatmentPlan.findFirst.mockResolvedValue({
        id: 'plan-101',
        clinicId: mockClinicId,
        patientId: mockPatient.id,
        stages: [
          {
            id: 'stg-1',
            items: [{ id: 'tp-item-1', procedureName: 'Scaling', unitFee: 1000 }],
          },
        ],
      });

      // Item already has an active invoice
      prisma.invoiceLineItem.findMany.mockResolvedValue([
        { treatmentPlanItemId: 'tp-item-1', invoice: { invoiceNumber: 'INV-1001' } },
      ]);

      await expect(
        billingService.createInvoiceFromTreatmentPlan(mockClinicId, mockStaffUser, {
          treatmentPlanId: 'plan-101',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ========================================================
  // 7. TENANT ISOLATION TESTS
  // ========================================================
  describe('Tenant Isolation', () => {
    it('cannot access or modify an invoice belonging to another clinic', async () => {
      // Trying to fetch invoice from another clinic returns null from DB query scoped to user clinic
      prisma.invoice.findFirst.mockResolvedValue(null);

      await expect(
        billingService.getInvoiceById(mockClinicId, 'inv-from-other-clinic'),
      ).rejects.toThrow(NotFoundException);
    });

    it('cannot resolve patient belonging to another clinic', async () => {
      prisma.patient.findFirst.mockResolvedValue(null);

      await expect(
        billingService.resolvePatient(mockClinicId, 'patient-from-other-clinic'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ========================================================
  // 8. SERVICE TARIFF VALIDATION & P2003 REGRESSION TESTS
  // ========================================================
  describe('Invoice Line Item Service Tariff Validation (P2003 Regression)', () => {
    beforeEach(() => {
      prisma.patient.findFirst.mockResolvedValue(mockPatient);
      prisma.$queryRaw.mockResolvedValue([{ assignedValue: 2001 }]);
    });

    // 1. Invoice with a valid tariff
    it('successfully creates and issues an invoice with a valid, active tariff belonging to the clinic', async () => {
      const validTariff = {
        id: 'tar-valid-101',
        name: 'Scaling & Polishing',
        isActive: true,
        clinicId: mockClinicId,
      };
      prisma.serviceTariff.findMany.mockResolvedValue([validTariff]);
      prisma.invoice.create.mockImplementation((args: any) => ({
        id: 'inv-uuid-valid-tariff',
        clinicId: mockClinicId,
        invoiceNumber: 'INV-2001',
        ...args.data,
      }));
      prisma.invoice.findUniqueOrThrow.mockResolvedValue({
        id: 'inv-uuid-valid-tariff',
        clinicId: mockClinicId,
        invoiceNumber: 'INV-2001',
        status: InvoiceStatus.ISSUED,
        items: [{ serviceTariffId: 'tar-valid-101', name: 'Scaling & Polishing', quantity: 1, unitPrice: 1200 }],
      });

      const invoice = await billingService.createAndIssueInvoice(mockClinicId, mockStaffUser, {
        patientId: 'pt-1001',
        items: [{ name: 'Scaling & Polishing', quantity: 1, unitPrice: 1200, serviceTariffId: 'tar-valid-101' }],
      });

      expect(prisma.serviceTariff.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['tar-valid-101'] }, clinicId: mockClinicId },
        select: { id: true, name: true, isActive: true, clinicId: true },
      });
      expect(invoice.invoiceNumber).toBe('INV-2001');
    });

    // 2. Invoice with a manual service item
    it('successfully creates an invoice with a manual service item having no serviceTariffId', async () => {
      prisma.serviceTariff.findMany.mockClear();
      prisma.invoice.create.mockImplementation((args: any) => ({
        id: 'inv-uuid-manual',
        clinicId: mockClinicId,
        invoiceNumber: 'INV-2001',
        ...args.data,
      }));
      prisma.invoice.findUniqueOrThrow.mockResolvedValue({
        id: 'inv-uuid-manual',
        clinicId: mockClinicId,
        invoiceNumber: 'INV-2001',
        status: InvoiceStatus.ISSUED,
        items: [{ serviceTariffId: null, name: 'Custom Dressing', quantity: 1, unitPrice: 350 }],
      });

      const invoice = await billingService.createAndIssueInvoice(mockClinicId, mockStaffUser, {
        patientId: 'pt-1001',
        items: [{ name: 'Custom Dressing', quantity: 1, unitPrice: 350, serviceTariffId: undefined }],
      });

      // Manual items must not query the serviceTariff table
      expect(prisma.serviceTariff.findMany).not.toHaveBeenCalled();
      expect(invoice.invoiceNumber).toBe('INV-2001');
    });

    // 3. Invoice with a nonexistent tariff ID
    it('rejects invoice creation with NotFoundException when serviceTariffId does not exist', async () => {
      prisma.serviceTariff.findMany.mockResolvedValue([]); // DB returns no matching tariff
      prisma.invoice.create.mockClear();

      await expect(
        billingService.createAndIssueInvoice(mockClinicId, mockStaffUser, {
          patientId: 'pt-1001',
          items: [{ name: 'Whitening Kit', quantity: 1, unitPrice: 4000, serviceTariffId: 'nonexistent-tariff-uuid' }],
        }),
      ).rejects.toThrow(NotFoundException);

      // Verify transaction aborted before invoice creation
      expect(prisma.invoice.create).not.toHaveBeenCalled();
    });

    // 4. Invoice with a tariff from another clinic
    it('enforces tenant isolation and rejects tariff ID belonging to another clinic with NotFoundException', async () => {
      // Tariff exists in database, but under a different clinicId -> query returns empty for mockClinicId
      prisma.serviceTariff.findMany.mockResolvedValue([]);
      prisma.invoice.create.mockClear();

      await expect(
        billingService.createAndIssueInvoice(mockClinicId, mockStaffUser, {
          patientId: 'pt-1001',
          items: [{ name: 'Foreign Clinic Service', quantity: 1, unitPrice: 1500, serviceTariffId: 'tariff-clinic-beta' }],
        }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.serviceTariff.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['tariff-clinic-beta'] }, clinicId: mockClinicId },
        select: { id: true, name: true, isActive: true, clinicId: true },
      });
      expect(prisma.invoice.create).not.toHaveBeenCalled();
    });

    // 5. Invoice with a stale or deleted/inactive tariff
    it('rejects an inactive or stale tariff with BadRequestException', async () => {
      const inactiveTariff = {
        id: 'tar-inactive-1',
        name: 'Deprecated Fluoride Treatment',
        isActive: false, // Inactive
        clinicId: mockClinicId,
      };
      prisma.serviceTariff.findMany.mockResolvedValue([inactiveTariff]);
      prisma.invoice.create.mockClear();

      await expect(
        billingService.createAndIssueInvoice(mockClinicId, mockStaffUser, {
          patientId: 'pt-1001',
          items: [{ name: 'Deprecated Fluoride Treatment', quantity: 1, unitPrice: 800, serviceTariffId: 'tar-inactive-1' }],
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.invoice.create).not.toHaveBeenCalled();
    });

    // 6. Correct transaction rollback after failure
    it('ensures transaction rollback when line item tariff validation fails', async () => {
      prisma.serviceTariff.findMany.mockResolvedValue([]);
      prisma.invoice.create.mockClear();
      prisma.invoicePayment.create.mockClear();

      await expect(
        billingService.createAndIssueInvoice(mockClinicId, mockStaffUser, {
          patientId: 'pt-1001',
          items: [
            { name: 'Scaling', quantity: 1, unitPrice: 1000 },
            { name: 'Invalid Tariff Item', quantity: 1, unitPrice: 500, serviceTariffId: 'bogus-id' },
          ],
        }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.invoice.create).not.toHaveBeenCalled();
      expect(prisma.invoicePayment.create).not.toHaveBeenCalled();
    });

    // 7. No duplicate or phantom invoices after errors (P2003 translation)
    it('translates Prisma P2003 foreign key constraint errors into clean NotFoundException without phantom records', async () => {
      // Simulate race condition where tariff passes check but is deleted concurrently before insert
      prisma.serviceTariff.findMany.mockResolvedValue([
        { id: 'tar-race-1', name: 'Race Condition Procedure', isActive: true, clinicId: mockClinicId },
      ]);

      const p2003Error = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed on the field: `InvoiceLineItem_serviceTariffId_fkey`',
        {
          code: 'P2003',
          clientVersion: '5.x',
          meta: { field_name: 'InvoiceLineItem_serviceTariffId_fkey' },
        },
      );
      prisma.invoice.create.mockRejectedValue(p2003Error);

      await expect(
        billingService.createAndIssueInvoice(mockClinicId, mockStaffUser, {
          patientId: 'pt-1001',
          items: [{ name: 'Race Condition Procedure', quantity: 1, unitPrice: 900, serviceTariffId: 'tar-race-1' }],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
