import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { BillingCalculationService, ComputedLineItem } from './billing-calculation.service.js';
import { CreateDraftInvoiceDto } from './dto/create-draft-invoice.dto.js';
import { UpdateDraftInvoiceDto } from './dto/update-draft-invoice.dto.js';
import { CreateAndIssueInvoiceDto } from './dto/issue-invoice.dto.js';
import { VoidInvoiceDto } from './dto/void-invoice.dto.js';
import { InvoiceQueryDto } from './dto/invoice-query.dto.js';
import { RecordPaymentDto } from './dto/record-payment.dto.js';
import { RefundPaymentDto } from './dto/refund-payment.dto.js';
import { DuesQueryDto } from './dto/dues-query.dto.js';
import { CollectionQueryDto } from './dto/collection-query.dto.js';
import { CreateTariffDto } from './dto/create-tariff.dto.js';
import { UpdateTariffDto } from './dto/update-tariff.dto.js';
import { TariffQueryDto } from './dto/tariff-query.dto.js';
import { CreateExpenseDto } from './dto/create-expense.dto.js';
import { UpdateExpenseDto } from './dto/update-expense.dto.js';
import { ExpenseQueryDto } from './dto/expense-query.dto.js';
import { InvoiceFromTreatmentPlanDto } from './dto/invoice-from-treatment-plan.dto.js';
import {
  ExpenseCategory,
  InvoicePaymentType,
  InvoiceStatus,
  PaymentMode,
  Prisma,
} from '@prisma/client';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly calc: BillingCalculationService,
  ) {}

  /**
   * Concurrency-safe atomic invoice number allocator using ClinicSequence.
   * Format: INV-1001, INV-1002, etc.
   */
  async allocateInvoiceNumber(
    tx: Prisma.TransactionClient,
    clinicId: string,
  ): Promise<string> {
    const rows = await tx.$queryRaw<{ assignedValue: number }[]>`
      INSERT INTO "ClinicSequence" ("id", "clinicId", "sequenceType", "currentValue", "updatedAt")
      VALUES (gen_random_uuid(), ${clinicId}, 'INVOICE', 1001, NOW())
      ON CONFLICT ("clinicId", "sequenceType")
      DO UPDATE SET "currentValue" = "ClinicSequence"."currentValue" + 1, "updatedAt" = NOW()
      RETURNING "currentValue" AS "assignedValue";
    `;

    const assigned = rows[0]?.assignedValue ?? 1001;
    return `INV-${assigned}`;
  }

  /**
   * Concurrency-safe draft invoice identifier generator.
   */
  private async allocateDraftNumber(
    tx: Prisma.TransactionClient,
    clinicId: string,
  ): Promise<string> {
    const rows = await tx.$queryRaw<{ assignedValue: number }[]>`
      INSERT INTO "ClinicSequence" ("id", "clinicId", "sequenceType", "currentValue", "updatedAt")
      VALUES (gen_random_uuid(), ${clinicId}, 'INVOICE_DRAFT', 1001, NOW())
      ON CONFLICT ("clinicId", "sequenceType")
      DO UPDATE SET "currentValue" = "ClinicSequence"."currentValue" + 1, "updatedAt" = NOW()
      RETURNING "currentValue" AS "assignedValue";
    `;

    const assigned = rows[0]?.assignedValue ?? 1001;
    return `DFT-${assigned}`;
  }

  /**
   * Resolves a patient by either internal UUID or patientCode (e.g. 'pt-1001') within the clinic.
   */
  async resolvePatient(clinicId: string, patientIdentifier: string) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        clinicId,
        OR: [{ id: patientIdentifier }, { patientCode: patientIdentifier }],
      },
    });
    if (!patient) {
      throw new NotFoundException(`Patient not found with identifier: ${patientIdentifier}`);
    }
    return patient;
  }

  /**
   * Validate that all referenced service tariffs and treatment plan items exist,
   * belong to the authenticated clinic, and are in valid billable states.
   * Manual line items (where serviceTariffId is null/undefined) are permitted.
   */
  async validateLineItemReferences(
    clinicId: string,
    items: Array<{ serviceTariffId?: string; treatmentPlanItemId?: string; name: string }>,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx || this.prisma;

    // 1. Validate service tariffs if referenced
    const rawTariffIds = items
      .map((i) => i.serviceTariffId)
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);

    const uniqueTariffIds = [...new Set(rawTariffIds)];

    if (uniqueTariffIds.length > 0) {
      const tariffs = await client.serviceTariff.findMany({
        where: {
          id: { in: uniqueTariffIds },
          clinicId,
        },
        select: {
          id: true,
          name: true,
          isActive: true,
          clinicId: true,
        },
      });

      const tariffMap = new Map(tariffs.map((t) => [t.id, t]));

      for (const id of uniqueTariffIds) {
        const tariff = tariffMap.get(id);
        if (!tariff) {
          throw new NotFoundException(
            `Service tariff with ID '${id}' was not found for this clinic.`,
          );
        }
        if (!tariff.isActive) {
          throw new BadRequestException(
            `Service tariff '${tariff.name}' (${id}) is inactive and cannot be billed.`,
          );
        }
      }
    }

    // 2. Validate treatment plan items if referenced
    const rawPlanItemIds = items
      .map((i) => i.treatmentPlanItemId)
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);

    const uniquePlanItemIds = [...new Set(rawPlanItemIds)];

    if (uniquePlanItemIds.length > 0 && client.treatmentPlanItem) {
      const planItems = await client.treatmentPlanItem.findMany({
        where: {
          id: { in: uniquePlanItemIds },
          stage: {
            treatmentPlan: {
              clinicId,
            },
          },
        },
        select: {
          id: true,
        },
      });

      const planItemSet = new Set(planItems.map((p) => p.id));

      for (const id of uniquePlanItemIds) {
        if (!planItemSet.has(id)) {
          throw new NotFoundException(
            `Treatment plan item with ID '${id}' was not found for this clinic.`,
          );
        }
      }
    }
  }

  /**
   * Catch known Prisma exceptions (e.g. foreign key constraint violations P2003)
   * and translate them into appropriate HTTP exceptions (404/400).
   */
  handlePrismaError(err: unknown): never {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2003') {
        const field = (err.meta?.field_name as string) || (err.meta?.target as string) || '';
        const msg = String(err.message || '');
        if (field.includes('serviceTariffId') || msg.includes('InvoiceLineItem_serviceTariffId_fkey')) {
          throw new NotFoundException(
            'Referenced service tariff was not found or was deleted before invoice creation.',
          );
        }
        if (field.includes('treatmentPlanItemId') || msg.includes('InvoiceLineItem_treatmentPlanItemId_fkey')) {
          throw new NotFoundException(
            'Referenced treatment plan item was not found or was deleted before invoice creation.',
          );
        }
        throw new BadRequestException(
          'Foreign key constraint violation: a referenced record does not exist or was deleted.',
        );
      }
    }
    throw err;
  }

  // ==========================================
  // 1. INVOICE MANAGEMENT
  // ==========================================

  /**
   * Create a new draft invoice.
   */
  async createDraftInvoice(
    clinicId: string,
    user: AuthenticatedUser,
    dto: CreateDraftInvoiceDto,
  ) {
    const patient = await this.resolvePatient(clinicId, dto.patientId);

    // Verify appointment if provided
    if (dto.appointmentId) {
      const appt = await this.prisma.appointment.findFirst({
        where: { id: dto.appointmentId, clinicId, patientId: patient.id },
      });
      if (!appt) {
        throw new NotFoundException('Specified appointment does not belong to this patient/clinic');
      }
    }

    // Verify treatment plan if provided
    if (dto.treatmentPlanId) {
      const plan = await this.prisma.treatmentPlan.findFirst({
        where: { id: dto.treatmentPlanId, clinicId, patientId: patient.id },
      });
      if (!plan) {
        throw new NotFoundException('Specified treatment plan does not belong to this patient/clinic');
      }
    }

    // Compute line items
    const rawItems = dto.items || [];
    const computedItems: ComputedLineItem[] = rawItems.map((item) =>
      this.calc.computeLineItem(item),
    );
    const totals = this.calc.computeInvoiceTotals(computedItems);

    return this.prisma.$transaction(async (tx) => {
      await this.validateLineItemReferences(clinicId, computedItems, tx);

      const draftNumber = await this.allocateDraftNumber(tx, clinicId);

      const description =
        dto.description ||
        (computedItems.length > 0
          ? computedItems.map((i) => i.name).join(', ')
          : 'Draft Invoice');

      try {
        const invoice = await tx.invoice.create({
          data: {
            clinicId,
            invoiceNumber: draftNumber,
            patientId: patient.id,
            appointmentId: dto.appointmentId,
            treatmentPlanId: dto.treatmentPlanId,
            description,
            notes: dto.notes,
            internalNotes: dto.internalNotes,
            dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
            subtotal: totals.subtotal,
            discountTotal: totals.discountTotal,
            taxTotal: totals.taxTotal,
            totalAmount: totals.totalAmount,
            paidAmount: 0,
            balance: totals.totalAmount,
            status: InvoiceStatus.DRAFT,
            items: {
              create: computedItems.map((item) => ({
                serviceTariffId: item.serviceTariffId,
                treatmentPlanItemId: item.treatmentPlanItemId,
                name: item.name,
                category: item.category,
                toothNumber: item.toothNumber,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount,
                gstRate: item.gstRate,
                taxableAmount: item.taxableAmount,
                taxAmount: item.taxAmount,
                totalAmount: item.totalAmount,
              })),
            },
          },
          include: {
            items: true,
            patient: {
              select: { id: true, patientCode: true, firstName: true, lastName: true, mobile: true },
            },
          },
        });

        return invoice;
      } catch (err) {
        this.handlePrismaError(err);
      }
    });
  }

  /**
   * Update a draft invoice. Issued invoices cannot be edited.
   */
  async updateDraftInvoice(
    clinicId: string,
    user: AuthenticatedUser,
    id: string,
    dto: UpdateDraftInvoiceDto,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, clinicId },
      include: { items: true },
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException(
        `Invoice ${invoice.invoiceNumber} cannot be modified because its status is ${invoice.status}. Issued financial invoices are strictly immutable.`,
      );
    }

    let targetPatientId = invoice.patientId;
    if (dto.patientId) {
      const patient = await this.resolvePatient(clinicId, dto.patientId);
      targetPatientId = patient.id;
    }

    return this.prisma.$transaction(async (tx) => {
      let totals = {
        subtotal: Number(invoice.subtotal),
        discountTotal: Number(invoice.discountTotal),
        taxTotal: Number(invoice.taxTotal),
        totalAmount: Number(invoice.totalAmount),
        paidAmount: 0,
        balance: Number(invoice.totalAmount),
      };

      if (dto.items) {
        // Delete existing items
        await tx.invoiceLineItem.deleteMany({
          where: { invoiceId: invoice.id, clinicId },
        });

        // Compute and validate new items
        const computedItems = dto.items.map((i) => this.calc.computeLineItem(i));
        await this.validateLineItemReferences(clinicId, computedItems, tx);
        totals = this.calc.computeInvoiceTotals(computedItems);

        try {
          await tx.invoiceLineItem.createMany({
            data: computedItems.map((item) => ({
              clinicId,
              invoiceId: invoice.id,
              serviceTariffId: item.serviceTariffId,
              treatmentPlanItemId: item.treatmentPlanItemId,
              name: item.name,
              category: item.category,
              toothNumber: item.toothNumber,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              gstRate: item.gstRate,
              taxableAmount: item.taxableAmount,
              taxAmount: item.taxAmount,
              totalAmount: item.totalAmount,
            })),
          });
        } catch (err) {
          this.handlePrismaError(err);
        }
      }

      const updated = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          patientId: targetPatientId,
          appointmentId: dto.appointmentId !== undefined ? dto.appointmentId : invoice.appointmentId,
          treatmentPlanId: dto.treatmentPlanId !== undefined ? dto.treatmentPlanId : invoice.treatmentPlanId,
          description: dto.description || invoice.description,
          notes: dto.notes !== undefined ? dto.notes : invoice.notes,
          internalNotes: dto.internalNotes !== undefined ? dto.internalNotes : invoice.internalNotes,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : invoice.dueDate,
          subtotal: totals.subtotal,
          discountTotal: totals.discountTotal,
          taxTotal: totals.taxTotal,
          totalAmount: totals.totalAmount,
          balance: totals.totalAmount,
        },
        include: {
          items: true,
          patient: {
            select: { id: true, patientCode: true, firstName: true, lastName: true, mobile: true },
          },
        },
      });

      return updated;
    });
  }

  /**
   * Issue a draft invoice. Transitions status to ISSUED, assigns permanent sequential invoiceNumber.
   */
  async issueDraftInvoice(
    clinicId: string,
    user: AuthenticatedUser,
    id: string,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, clinicId },
      include: { items: true },
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException(
        `Invoice ${invoice.invoiceNumber} is already ${invoice.status}. Only DRAFT invoices can be issued.`,
      );
    }

    if (invoice.items.length === 0) {
      throw new BadRequestException('Cannot issue an invoice with zero line items.');
    }

    return this.prisma.$transaction(async (tx) => {
      const permanentNumber = await this.allocateInvoiceNumber(tx, clinicId);

      const issued = await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          invoiceNumber: permanentNumber,
          status: InvoiceStatus.ISSUED,
          issuedAt: new Date(),
        },
        include: {
          items: true,
          payments: true,
          patient: {
            select: { id: true, patientCode: true, firstName: true, lastName: true, mobile: true },
          },
        },
      });

      return issued;
    });
  }

  /**
   * Create and immediately issue an invoice, with optional upfront payment.
   */
  async createAndIssueInvoice(
    clinicId: string,
    user: AuthenticatedUser,
    dto: CreateAndIssueInvoiceDto,
  ) {
    const patient = await this.resolvePatient(clinicId, dto.patientId);

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('At least one line item is required to issue an invoice.');
    }

    if (dto.appointmentId) {
      const appt = await this.prisma.appointment.findFirst({
        where: { id: dto.appointmentId, clinicId, patientId: patient.id },
      });
      if (!appt) {
        throw new NotFoundException('Specified appointment does not belong to this patient/clinic');
      }
    }

    const computedItems = dto.items.map((i) => this.calc.computeLineItem(i));
    const totals = this.calc.computeInvoiceTotals(computedItems);

    return this.prisma.$transaction(async (tx) => {
      await this.validateLineItemReferences(clinicId, computedItems, tx);

      const invoiceNumber = await this.allocateInvoiceNumber(tx, clinicId);
      const description =
        dto.description || computedItems.map((i) => i.name).join(', ');

      let initialInvoice;
      try {
        initialInvoice = await tx.invoice.create({
          data: {
            clinicId,
            invoiceNumber,
            patientId: patient.id,
            appointmentId: dto.appointmentId,
            treatmentPlanId: dto.treatmentPlanId,
            description,
            notes: dto.notes,
            internalNotes: dto.internalNotes,
            dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
            issuedAt: new Date(),
            subtotal: totals.subtotal,
            discountTotal: totals.discountTotal,
            taxTotal: totals.taxTotal,
            totalAmount: totals.totalAmount,
            paidAmount: 0,
            balance: totals.totalAmount,
            status: InvoiceStatus.ISSUED,
            items: {
              create: computedItems.map((item) => ({
                serviceTariffId: item.serviceTariffId,
                treatmentPlanItemId: item.treatmentPlanItemId,
                name: item.name,
                category: item.category,
                toothNumber: item.toothNumber,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                discount: item.discount,
                gstRate: item.gstRate,
                taxableAmount: item.taxableAmount,
                taxAmount: item.taxAmount,
                totalAmount: item.totalAmount,
              })),
            },
          },
        });
      } catch (err) {
        this.handlePrismaError(err);
      }

      // Handle upfront payment if supplied
      if (dto.upfrontPayment && dto.upfrontPayment.amount > 0) {
        const payAmt = this.calc.round2(dto.upfrontPayment.amount);
        if (payAmt > totals.totalAmount) {
          throw new BadRequestException(
            `Upfront payment amount ₹${payAmt} exceeds total invoice amount ₹${totals.totalAmount}.`,
          );
        }

        await tx.invoicePayment.create({
          data: {
            clinicId,
            invoiceId: initialInvoice.id,
            type: InvoicePaymentType.PAYMENT,
            amount: payAmt,
            mode: dto.upfrontPayment.mode,
            reference: dto.upfrontPayment.reference,
            notes: dto.upfrontPayment.notes,
            idempotencyKey: dto.upfrontPayment.idempotencyKey,
            receivedById: user.id,
            receivedAt: new Date(),
          },
        });

        const newPaid = payAmt;
        const newBalance = this.calc.round2(totals.totalAmount - newPaid);
        const newStatus = this.calc.deriveInvoiceStatus(
          InvoiceStatus.ISSUED,
          totals.totalAmount,
          newPaid,
        );

        return tx.invoice.update({
          where: { id: initialInvoice.id },
          data: {
            paidAmount: newPaid,
            balance: newBalance,
            status: newStatus,
          },
          include: {
            items: true,
            payments: true,
            patient: {
              select: { id: true, patientCode: true, firstName: true, lastName: true, mobile: true },
            },
          },
        });
      }

      return tx.invoice.findUniqueOrThrow({
        where: { id: initialInvoice.id },
        include: {
          items: true,
          payments: true,
          patient: {
            select: { id: true, patientCode: true, firstName: true, lastName: true, mobile: true },
          },
        },
      });
    });
  }

  /**
   * Get list of invoices with search, status filter, patient filter, pagination.
   */
  async getInvoices(clinicId: string, query: InvoiceQueryDto) {
    const where: Prisma.InvoiceWhereInput = { clinicId };

    if (query.status) {
      where.status = query.status;
    }

    if (query.patientId) {
      const patient = await this.resolvePatient(clinicId, query.patientId);
      where.patientId = patient.id;
    }

    if (query.appointmentId) {
      where.appointmentId = query.appointmentId;
    }

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { invoiceNumber: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { patient: { firstName: { contains: term, mode: 'insensitive' } } },
        { patient: { lastName: { contains: term, mode: 'insensitive' } } },
        { patient: { patientCode: { contains: term, mode: 'insensitive' } } },
        { patient: { mobile: { contains: term, mode: 'insensitive' } } },
      ];
    }

    if (query.fromDate || query.toDate) {
      where.createdAt = {};
      if (query.fromDate) where.createdAt.gte = new Date(query.fromDate);
      if (query.toDate) {
        const toD = new Date(query.toDate);
        toD.setHours(23, 59, 59, 999);
        where.createdAt.lte = toD;
      }
    }

    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const [total, items] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: {
            select: { id: true, patientCode: true, firstName: true, lastName: true, mobile: true },
          },
          items: true,
          payments: {
            orderBy: { receivedAt: 'desc' },
          },
        },
      }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get invoice details by ID.
   */
  async getInvoiceById(clinicId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        clinicId,
        OR: [{ id }, { invoiceNumber: id }],
      },
      include: {
        patient: true,
        items: {
          include: {
            serviceTariff: true,
          },
        },
        payments: {
          orderBy: { receivedAt: 'desc' },
          include: {
            receivedBy: {
              select: { id: true, fullName: true, email: true },
            },
          },
        },
        appointment: true,
        treatmentPlan: true,
        voidedBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }

    return invoice;
  }

  /**
   * Void an issued invoice. Requires audit reason.
   * If payments exist, they must be refunded first.
   */
  async voidInvoice(
    clinicId: string,
    user: AuthenticatedUser,
    id: string,
    dto: VoidInvoiceDto,
  ) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, clinicId },
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }

    if (invoice.status === InvoiceStatus.VOID) {
      throw new BadRequestException('Invoice is already voided');
    }

    if (Number(invoice.paidAmount) > 0) {
      throw new BadRequestException(
        `Cannot void invoice ${invoice.invoiceNumber} with active payments (₹${invoice.paidAmount}). Please issue refunds for all payments first.`,
      );
    }

    return this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: InvoiceStatus.VOID,
        voidedAt: new Date(),
        voidedById: user.id,
        voidReason: dto.reason,
      },
      include: {
        items: true,
        payments: true,
        patient: {
          select: { id: true, patientCode: true, firstName: true, lastName: true },
        },
      },
    });
  }

  // ==========================================
  // 2. PAYMENT MANAGEMENT & REFUNDS
  // ==========================================

  /**
   * Record a payment against an invoice with row-level locking and idempotency protection.
   */
  async recordPayment(
    clinicId: string,
    user: AuthenticatedUser,
    invoiceId: string,
    dto: RecordPaymentDto,
  ) {
    // 1. Check idempotency key if supplied
    if (dto.idempotencyKey) {
      const existing = await this.prisma.invoicePayment.findUnique({
        where: {
          clinicId_idempotencyKey: {
            clinicId,
            idempotencyKey: dto.idempotencyKey,
          },
        },
        include: {
          invoice: true,
        },
      });
      if (existing) {
        return existing;
      }
    }

    const payAmount = this.calc.round2(dto.amount);
    if (payAmount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    return this.prisma.$transaction(async (tx) => {
      // Row-level lock the invoice to prevent concurrent overpayments
      const lockedInvoices = await tx.$queryRaw<
        {
          id: string;
          clinicId: string;
          status: InvoiceStatus;
          totalAmount: Prisma.Decimal;
          paidAmount: Prisma.Decimal;
          balance: Prisma.Decimal;
        }[]
      >`
        SELECT "id", "clinicId", "status", "totalAmount", "paidAmount", "balance"
        FROM "Invoice"
        WHERE "id" = ${invoiceId} AND "clinicId" = ${clinicId}
        FOR UPDATE;
      `;

      if (!lockedInvoices || lockedInvoices.length === 0) {
        throw new NotFoundException(`Invoice ${invoiceId} not found`);
      }

      const invoice = lockedInvoices[0];

      if (invoice.status === InvoiceStatus.DRAFT) {
        throw new BadRequestException('Cannot record payment against an unissued draft invoice.');
      }
      if (invoice.status === InvoiceStatus.VOID) {
        throw new BadRequestException('Cannot record payment against a voided invoice.');
      }

      const currentBalance = Number(invoice.balance);
      if (payAmount > currentBalance + 0.001) {
        throw new BadRequestException(
          `Payment amount ₹${payAmount} exceeds remaining balance ₹${currentBalance}.`,
        );
      }

      const payment = await tx.invoicePayment.create({
        data: {
          clinicId,
          invoiceId: invoice.id,
          type: InvoicePaymentType.PAYMENT,
          amount: payAmount,
          mode: dto.mode,
          reference: dto.reference,
          notes: dto.notes,
          idempotencyKey: dto.idempotencyKey,
          receivedById: user.id,
          receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : new Date(),
        },
      });

      // Recalculate invoice totals and balance
      const newPaid = this.calc.round2(Number(invoice.paidAmount) + payAmount);
      const newBalance = this.calc.round2(Math.max(0, Number(invoice.totalAmount) - newPaid));
      const newStatus = this.calc.deriveInvoiceStatus(
        invoice.status,
        Number(invoice.totalAmount),
        newPaid,
      );

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaid,
          balance: newBalance,
          status: newStatus,
        },
      });

      return payment;
    });
  }

  /**
   * Refund an existing payment. Links back to the original payment.
   */
  async refundPayment(
    clinicId: string,
    user: AuthenticatedUser,
    paymentId: string,
    dto: RefundPaymentDto,
  ) {
    const refundAmount = this.calc.round2(dto.amount);
    if (refundAmount <= 0) {
      throw new BadRequestException('Refund amount must be greater than zero');
    }

    return this.prisma.$transaction(async (tx) => {
      const original = await tx.invoicePayment.findFirst({
        where: { id: paymentId, clinicId },
        include: { invoice: true },
      });
      if (!original) {
        throw new NotFoundException(`Payment ${paymentId} not found`);
      }

      if (original.type !== InvoicePaymentType.PAYMENT) {
        throw new BadRequestException('Can only refund original inbound payments.');
      }

      // Check if already refunded
      const existingRefund = await tx.invoicePayment.findFirst({
        where: { refundForPaymentId: original.id, clinicId },
      });
      if (existingRefund) {
        throw new BadRequestException(`Payment ${paymentId} has already been refunded.`);
      }

      if (refundAmount > Number(original.amount)) {
        throw new BadRequestException(
          `Refund amount ₹${refundAmount} exceeds original payment amount ₹${original.amount}.`,
        );
      }

      // Row-lock invoice
      await tx.$executeRaw`
        SELECT "id" FROM "Invoice" WHERE "id" = ${original.invoiceId} AND "clinicId" = ${clinicId} FOR UPDATE;
      `;

      const refund = await tx.invoicePayment.create({
        data: {
          clinicId,
          invoiceId: original.invoiceId,
          type: InvoicePaymentType.REFUND,
          amount: refundAmount,
          mode: original.mode,
          reference: dto.reference || `REFUND-${original.id.slice(0, 8)}`,
          notes: dto.reason,
          refundForPaymentId: original.id,
          receivedById: user.id,
          receivedAt: new Date(),
        },
      });

      // Recalculate invoice balance
      const invoice = await tx.invoice.findUniqueOrThrow({
        where: { id: original.invoiceId },
      });

      const newPaid = this.calc.round2(Math.max(0, Number(invoice.paidAmount) - refundAmount));
      const newBalance = this.calc.round2(Math.max(0, Number(invoice.totalAmount) - newPaid));
      const newStatus = this.calc.deriveInvoiceStatus(
        invoice.status,
        Number(invoice.totalAmount),
        newPaid,
      );

      await tx.invoice.update({
        where: { id: original.invoiceId },
        data: {
          paidAmount: newPaid,
          balance: newBalance,
          status: newStatus,
        },
      });

      return refund;
    });
  }

  // ==========================================
  // 3. PENDING DUES & AGING
  // ==========================================

  /**
   * Get all pending dues with aging categories (0-30, 31-60, 60+).
   */
  async getPendingDues(clinicId: string, query: DuesQueryDto) {
    const where: Prisma.InvoiceWhereInput = {
      clinicId,
      status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID] },
      balance: { gt: 0 },
    };

    if (query.patientId) {
      const patient = await this.resolvePatient(clinicId, query.patientId);
      where.patientId = patient.id;
    }

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { invoiceNumber: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { patient: { firstName: { contains: term, mode: 'insensitive' } } },
        { patient: { lastName: { contains: term, mode: 'insensitive' } } },
        { patient: { patientCode: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const invoices = await this.prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        patient: {
          select: { id: true, patientCode: true, firstName: true, lastName: true, mobile: true },
        },
      },
    });

    const now = new Date();
    let totalOutstanding = 0;
    const breakdown = { '0-30': 0, '31-60': 0, '60+': 0 };

    const enriched = invoices.map((inv) => {
      const bal = Number(inv.balance);
      totalOutstanding += bal;

      const dateToUse = inv.issuedAt || inv.createdAt;
      const ageCategory = this.calc.getAgingCategory(dateToUse);
      breakdown[ageCategory] += bal;

      const diffDays = Math.floor(
        (now.getTime() - new Date(dateToUse).getTime()) / (1000 * 60 * 60 * 24),
      );

      return {
        ...inv,
        ageDays: diffDays,
        ageCategory,
      };
    });

    // Apply age filter if not 'all'
    const filtered =
      query.aging && query.aging !== 'all'
        ? enriched.filter((i) => i.ageCategory === query.aging)
        : enriched;

    return {
      summary: {
        totalOutstanding: this.calc.round2(totalOutstanding),
        invoiceCount: invoices.length,
        breakdown: {
          '0-30': this.calc.round2(breakdown['0-30']),
          '31-60': this.calc.round2(breakdown['31-60']),
          '60+': this.calc.round2(breakdown['60+']),
        },
      },
      invoices: filtered,
    };
  }

  /**
   * Aggregates outstanding balances patient-wise.
   */
  async getPatientWiseDues(clinicId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        clinicId,
        status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID] },
        balance: { gt: 0 },
      },
      include: {
        patient: {
          select: { id: true, patientCode: true, firstName: true, lastName: true, mobile: true },
        },
      },
    });

    const patientMap = new Map<
      string,
      {
        patientId: string;
        patientCode: string;
        patientName: string;
        mobile: string;
        totalDue: number;
        invoiceCount: number;
        oldestInvoiceDate: Date;
      }
    >();

    for (const inv of invoices) {
      const pId = inv.patientId;
      const bal = Number(inv.balance);
      const invDate = inv.issuedAt || inv.createdAt;
      const patientFullName = `${inv.patient.firstName} ${inv.patient.lastName}`.trim();

      if (!patientMap.has(pId)) {
        patientMap.set(pId, {
          patientId: pId,
          patientCode: inv.patient.patientCode || '',
          patientName: patientFullName,
          mobile: inv.patient.mobile || '',
          totalDue: bal,
          invoiceCount: 1,
          oldestInvoiceDate: invDate,
        });
      } else {
        const item = patientMap.get(pId)!;
        item.totalDue += bal;
        item.invoiceCount += 1;
        if (new Date(invDate) < new Date(item.oldestInvoiceDate)) {
          item.oldestInvoiceDate = invDate;
        }
      }
    }

    const list = Array.from(patientMap.values())
      .map((p) => ({
        ...p,
        totalDue: this.calc.round2(p.totalDue),
      }))
      .sort((a, b) => b.totalDue - a.totalDue);

    return list;
  }

  // ==========================================
  // 4. DAILY COLLECTIONS & RECONCILIATION
  // ==========================================

  /**
   * Daily collections summary and reconciliation for a specific date or date range.
   */
  async getDailyCollections(clinicId: string, query: CollectionQueryDto) {
    const where: Prisma.InvoicePaymentWhereInput = { clinicId };

    if (query.mode) {
      where.mode = query.mode;
    }

    if (query.date) {
      const start = new Date(`${query.date}T00:00:00.000Z`);
      const end = new Date(`${query.date}T23:59:59.999Z`);
      where.receivedAt = { gte: start, lte: end };
    } else if (query.fromDate || query.toDate) {
      where.receivedAt = {};
      if (query.fromDate) where.receivedAt.gte = new Date(query.fromDate);
      if (query.toDate) {
        const toD = new Date(query.toDate);
        toD.setHours(23, 59, 59, 999);
        where.receivedAt.lte = toD;
      }
    } else {
      // Default to today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endToday = new Date();
      endToday.setHours(23, 59, 59, 999);
      where.receivedAt = { gte: today, lte: endToday };
    }

    const payments = await this.prisma.invoicePayment.findMany({
      where,
      orderBy: { receivedAt: 'desc' },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            patientId: true,
            patient: { select: { firstName: true, lastName: true, patientCode: true } },
          },
        },
        receivedBy: {
          select: { id: true, fullName: true },
        },
      },
    });

    let grossCollections = 0;
    let totalRefunds = 0;
    const byMode: Record<string, { payments: number; refunds: number; net: number }> = {
      CASH: { payments: 0, refunds: 0, net: 0 },
      CARD: { payments: 0, refunds: 0, net: 0 },
      UPI: { payments: 0, refunds: 0, net: 0 },
      NET_BANKING: { payments: 0, refunds: 0, net: 0 },
      CHEQUE: { payments: 0, refunds: 0, net: 0 },
    };

    for (const p of payments) {
      const amt = Number(p.amount);
      const modeKey = p.mode || 'UPI';
      if (!byMode[modeKey]) {
        byMode[modeKey] = { payments: 0, refunds: 0, net: 0 };
      }

      if (p.type === InvoicePaymentType.PAYMENT) {
        grossCollections += amt;
        byMode[modeKey].payments += amt;
      } else if (p.type === InvoicePaymentType.REFUND) {
        totalRefunds += amt;
        byMode[modeKey].refunds += amt;
      }
    }

    for (const k of Object.keys(byMode)) {
      byMode[k].payments = this.calc.round2(byMode[k].payments);
      byMode[k].refunds = this.calc.round2(byMode[k].refunds);
      byMode[k].net = this.calc.round2(byMode[k].payments - byMode[k].refunds);
    }

    return {
      date: query.date || new Date().toISOString().slice(0, 10),
      grossCollections: this.calc.round2(grossCollections),
      totalRefunds: this.calc.round2(totalRefunds),
      netCollections: this.calc.round2(grossCollections - totalRefunds),
      byMode,
      transactions: payments,
    };
  }

  // ==========================================
  // 5. BILLING OVERVIEW DASHBOARD
  // ==========================================

  /**
   * Complete overview dashboard with persistent financial metrics.
   */
  async getDashboardOverview(clinicId: string) {
    const [invoices, payments, recentInvoices, recentPayments] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { clinicId },
        select: {
          id: true,
          status: true,
          totalAmount: true,
          paidAmount: true,
          balance: true,
          createdAt: true,
        },
      }),
      this.prisma.invoicePayment.findMany({
        where: { clinicId },
        select: {
          id: true,
          amount: true,
          type: true,
          mode: true,
          receivedAt: true,
        },
      }),
      this.prisma.invoice.findMany({
        where: { clinicId },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: {
            select: { firstName: true, lastName: true, patientCode: true },
          },
        },
      }),
      this.prisma.invoicePayment.findMany({
        where: { clinicId },
        take: 5,
        orderBy: { receivedAt: 'desc' },
        include: {
          invoice: {
            select: {
              invoiceNumber: true,
              patient: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
    ]);

    let totalInvoiced = 0;
    let totalCollected = 0;
    let outstandingBalance = 0;
    const statusCounts = {
      PAID: 0,
      PARTIALLY_PAID: 0,
      ISSUED: 0,
      DRAFT: 0,
      VOID: 0,
    };

    for (const inv of invoices) {
      if (inv.status !== InvoiceStatus.VOID) {
        totalInvoiced += Number(inv.totalAmount);
        totalCollected += Number(inv.paidAmount);
        if (
          inv.status === InvoiceStatus.ISSUED ||
          inv.status === InvoiceStatus.PARTIALLY_PAID
        ) {
          outstandingBalance += Number(inv.balance);
        }
      }
      if (statusCounts[inv.status] !== undefined) {
        statusCounts[inv.status] += 1;
      }
    }

    const modeTotals: Record<string, number> = {
      UPI: 0,
      CASH: 0,
      CARD: 0,
      NET_BANKING: 0,
      CHEQUE: 0,
    };

    for (const p of payments) {
      const amt = Number(p.amount);
      const sign = p.type === InvoicePaymentType.PAYMENT ? 1 : -1;
      const m = p.mode in modeTotals ? p.mode : 'UPI';
      modeTotals[m] += sign * amt;
    }

    for (const m of Object.keys(modeTotals)) {
      modeTotals[m] = this.calc.round2(Math.max(0, modeTotals[m]));
    }

    return {
      metrics: {
        totalInvoiced: this.calc.round2(totalInvoiced),
        totalCollected: this.calc.round2(totalCollected),
        outstandingBalance: this.calc.round2(outstandingBalance),
        statusCounts,
      },
      paymentModeBreakdown: modeTotals,
      recentInvoices,
      recentPayments,
    };
  }

  // ==========================================
  // 6. SERVICE TARIFFS / MASTER PRICE LIST
  // ==========================================

  async createTariff(clinicId: string, dto: CreateTariffDto) {
    const fee = this.calc.round2(dto.standardFee ?? dto.price ?? 0);
    const offerPrice = dto.offerPrice ? this.calc.round2(dto.offerPrice) : null;
    const { gstClass, defaultRate } = this.calc.parseGstClass(dto.gstClass);
    const gstRate = dto.gstRate !== undefined ? this.calc.round2(dto.gstRate) : defaultRate;

    return this.prisma.serviceTariff.create({
      data: {
        clinicId,
        name: dto.name.trim(),
        code: dto.code?.trim(),
        category: dto.category || 'General',
        standardFee: fee,
        offerPrice,
        gstClass,
        gstRate,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });
  }

  async getTariffs(clinicId: string, query: TariffQueryDto) {
    const where: Prisma.ServiceTariffWhereInput = { clinicId };

    if (query.category) {
      where.category = query.category;
    }
    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }
    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { code: { contains: term, mode: 'insensitive' } },
        { category: { contains: term, mode: 'insensitive' } },
      ];
    }

    return this.prisma.serviceTariff.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  async getTariffById(clinicId: string, id: string) {
    const tariff = await this.prisma.serviceTariff.findFirst({
      where: { id, clinicId },
    });
    if (!tariff) {
      throw new NotFoundException(`Tariff ${id} not found`);
    }
    return tariff;
  }

  async updateTariff(clinicId: string, id: string, dto: UpdateTariffDto) {
    await this.getTariffById(clinicId, id);

    const data: Prisma.ServiceTariffUpdateInput = {};
    if (dto.name) data.name = dto.name.trim();
    if (dto.code !== undefined) data.code = dto.code ? dto.code.trim() : null;
    if (dto.category) data.category = dto.category.trim();
    if (dto.standardFee !== undefined || dto.price !== undefined) {
      data.standardFee = this.calc.round2(dto.standardFee ?? dto.price ?? 0);
    }
    if (dto.offerPrice !== undefined) {
      data.offerPrice = dto.offerPrice ? this.calc.round2(dto.offerPrice) : null;
    }
    if (dto.gstClass) {
      const parsed = this.calc.parseGstClass(dto.gstClass);
      data.gstClass = parsed.gstClass;
      if (dto.gstRate === undefined) data.gstRate = parsed.defaultRate;
    }
    if (dto.gstRate !== undefined) {
      data.gstRate = this.calc.round2(dto.gstRate);
    }
    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    return this.prisma.serviceTariff.update({
      where: { id },
      data,
    });
  }

  async toggleTariffActive(clinicId: string, id: string) {
    const tariff = await this.getTariffById(clinicId, id);
    return this.prisma.serviceTariff.update({
      where: { id },
      data: { isActive: !tariff.isActive },
    });
  }

  async deleteTariff(clinicId: string, id: string) {
    await this.getTariffById(clinicId, id);

    // If tariff is linked to invoice line items, deactivate it instead of hard deleting
    const linkedCount = await this.prisma.invoiceLineItem.count({
      where: { serviceTariffId: id, clinicId },
    });

    if (linkedCount > 0) {
      return this.prisma.serviceTariff.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return this.prisma.serviceTariff.delete({
      where: { id },
    });
  }

  // ==========================================
  // 7. EXPENSE MANAGEMENT
  // ==========================================

  async createExpense(
    clinicId: string,
    user: AuthenticatedUser,
    dto: CreateExpenseDto,
  ) {
    const category = this.calc.parseExpenseCategory(dto.category);
    const amount = this.calc.round2(dto.amount);
    const mode = dto.mode || PaymentMode.CASH;

    return this.prisma.$transaction(async (tx) => {
      const seqRows = await tx.$queryRaw<{ assignedValue: number }[]>`
        INSERT INTO "ClinicSequence" ("id", "clinicId", "sequenceType", "currentValue", "updatedAt")
        VALUES (gen_random_uuid(), ${clinicId}, 'EXPENSE', 1001, NOW())
        ON CONFLICT ("clinicId", "sequenceType")
        DO UPDATE SET "currentValue" = "ClinicSequence"."currentValue" + 1, "updatedAt" = NOW()
        RETURNING "currentValue" AS "assignedValue";
      `;
      const assigned = seqRows[0]?.assignedValue ?? 1001;
      const expenseNumber = `EXP-${assigned}`;

      return tx.expense.create({
        data: {
          clinicId,
          expenseNumber,
          date: new Date(dto.date),
          category,
          description: dto.description.trim(),
          vendor: dto.vendor?.trim(),
          amount,
          mode,
          reference: dto.reference?.trim(),
          paidById: user.id,
        },
        include: {
          paidBy: {
            select: { id: true, fullName: true, email: true },
          },
        },
      });
    });
  }

  async getExpenses(clinicId: string, query: ExpenseQueryDto) {
    const where: Prisma.ExpenseWhereInput = { clinicId };

    if (query.category) {
      where.category = this.calc.parseExpenseCategory(query.category);
    }

    if (query.fromDate || query.toDate) {
      where.date = {};
      if (query.fromDate) where.date.gte = new Date(query.fromDate);
      if (query.toDate) where.date.lte = new Date(query.toDate);
    }

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { description: { contains: term, mode: 'insensitive' } },
        { vendor: { contains: term, mode: 'insensitive' } },
        { expenseNumber: { contains: term, mode: 'insensitive' } },
      ];
    }

    return this.prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        paidBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
  }

  async getExpenseSummary(clinicId: string) {
    const expenses = await this.prisma.expense.findMany({
      where: { clinicId },
    });

    let totalAmount = 0;
    const byCategory: Record<string, number> = {};

    for (const exp of expenses) {
      const amt = Number(exp.amount);
      totalAmount += amt;
      byCategory[exp.category] = (byCategory[exp.category] || 0) + amt;
    }

    for (const k of Object.keys(byCategory)) {
      byCategory[k] = this.calc.round2(byCategory[k]);
    }

    return {
      totalAmount: this.calc.round2(totalAmount),
      count: expenses.length,
      byCategory,
    };
  }

  async getExpenseById(clinicId: string, id: string) {
    const exp = await this.prisma.expense.findFirst({
      where: { id, clinicId },
      include: {
        paidBy: {
          select: { id: true, fullName: true, email: true },
        },
      },
    });
    if (!exp) {
      throw new NotFoundException(`Expense ${id} not found`);
    }
    return exp;
  }

  async updateExpense(
    clinicId: string,
    id: string,
    dto: UpdateExpenseDto,
  ) {
    await this.getExpenseById(clinicId, id);

    const data: Prisma.ExpenseUpdateInput = {};
    if (dto.date) data.date = new Date(dto.date);
    if (dto.category) data.category = this.calc.parseExpenseCategory(dto.category);
    if (dto.description) data.description = dto.description.trim();
    if (dto.vendor !== undefined) data.vendor = dto.vendor ? dto.vendor.trim() : null;
    if (dto.amount !== undefined) data.amount = this.calc.round2(dto.amount);
    if (dto.mode) data.mode = dto.mode;
    if (dto.reference !== undefined) data.reference = dto.reference ? dto.reference.trim() : null;

    return this.prisma.expense.update({
      where: { id },
      data,
    });
  }

  async deleteExpense(clinicId: string, id: string) {
    await this.getExpenseById(clinicId, id);
    return this.prisma.expense.delete({
      where: { id },
    });
  }

  // ==========================================
  // 8. TREATMENT PLAN INTEGRATION
  // ==========================================

  /**
   * Create an invoice directly from a multi-stage clinical treatment plan.
   * Prevents duplicate billing of already billed items.
   */
  async createInvoiceFromTreatmentPlan(
    clinicId: string,
    user: AuthenticatedUser,
    dto: InvoiceFromTreatmentPlanDto,
  ) {
    const plan = await this.prisma.treatmentPlan.findFirst({
      where: { id: dto.treatmentPlanId, clinicId },
      include: {
        patient: true,
        stages: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(`Treatment Plan ${dto.treatmentPlanId} not found`);
    }

    // Filter stages if specified
    const targetStages = dto.stageId
      ? plan.stages.filter((s) => s.id === dto.stageId)
      : plan.stages;

    // Collect treatment items
    let allItems = targetStages.flatMap((s) => s.items);

    if (dto.itemIds && dto.itemIds.length > 0) {
      allItems = allItems.filter((item) => dto.itemIds!.includes(item.id));
    }

    if (allItems.length === 0) {
      throw new BadRequestException('No treatment plan items found to bill.');
    }

    // Check for already billed items
    const alreadyBilled = await this.prisma.invoiceLineItem.findMany({
      where: {
        treatmentPlanItemId: { in: allItems.map((i) => i.id) },
        clinicId,
        invoice: {
          status: { not: InvoiceStatus.VOID },
        },
      },
      select: {
        treatmentPlanItemId: true,
        invoice: { select: { invoiceNumber: true } },
      },
    });

    if (alreadyBilled.length > 0) {
      const billedIds = alreadyBilled.map((b) => b.treatmentPlanItemId);
      throw new ConflictException(
        `The following treatment plan items have already been billed in active invoice(s): ${billedIds.join(', ')}`,
      );
    }

    // Convert items to line items
    const lineItems: ComputedLineItem[] = allItems.map((item) => {
      return this.calc.computeLineItem({
        treatmentPlanItemId: item.id,
        name: item.procedureName,
        category: item.category,
        toothNumber: item.toothNumber || undefined,
        quantity: item.quantity,
        unitPrice: Number(item.unitFee),
        discount: Number(item.discount || 0),
        gstRate: 0,
      });
    });

    if (dto.issueImmediately) {
      return this.createAndIssueInvoice(clinicId, user, {
        patientId: plan.patientId,
        appointmentId: dto.appointmentId,
        treatmentPlanId: plan.id,
        description: `Billed from Treatment Plan: ${plan.title}`,
        notes: dto.notes,
        internalNotes: dto.internalNotes,
        items: lineItems,
        upfrontPayment: dto.upfrontPayment,
      });
    } else {
      return this.createDraftInvoice(clinicId, user, {
        patientId: plan.patientId,
        appointmentId: dto.appointmentId,
        treatmentPlanId: plan.id,
        description: `Billed from Treatment Plan: ${plan.title}`,
        notes: dto.notes,
        internalNotes: dto.internalNotes,
        items: lineItems,
      });
    }
  }
}
