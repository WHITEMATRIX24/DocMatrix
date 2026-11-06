import { Test, TestingModule } from '@nestjs/testing';
import { BillingService } from './billing.service.js';
import { BillingCalculationService } from './billing-calculation.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InvoiceStatus, PaymentMode, Prisma } from '@prisma/client';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';

describe('DocMatrix — Isolated Service Tariff & Invoice Creation Suite', () => {
  let billingService: BillingService;
  let prismaMock: any;

  const mockClinicId = 'clinic-alpha-101';
  const mockStaffUser: AuthenticatedUser = {
    id: 'usr-admin-1',
    role: 'ORGANIZATION_ADMIN',
    clinicId: mockClinicId,
  };
  const mockPatient = {
    id: 'pt-uuid-1',
    patientCode: 'pt-1001',
    clinicId: mockClinicId,
    firstName: 'Aarav',
    lastName: 'Menon',
    mobile: '+919876543210',
  };

  // In-memory isolated state
  let isolatedTariffs: any[];
  let isolatedInvoices: any[];
  let isolatedPayments: any[];

  beforeEach(async () => {
    isolatedTariffs = [
      {
        id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        name: 'Dental Scaling',
        clinicId: mockClinicId,
        isActive: true,
      },
      {
        id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        name: 'Deprecated Fluoride Treatment',
        clinicId: mockClinicId,
        isActive: false, // Inactive / stale
      },
      {
        id: '8fe9b810-9dad-11d1-80b4-00c04fd430c9',
        name: 'Foreign Clinic Procedure',
        clinicId: 'clinic-beta-999', // Another clinic
        isActive: true,
      },
    ];
    isolatedInvoices = [];
    isolatedPayments = [];

    prismaMock = {
      patient: {
        findFirst: vi.fn().mockImplementation(async ({ where }: any) => {
          if (
            where.clinicId === mockClinicId &&
            where.OR?.some((o: any) => o.id === 'pt-1001' || o.patientCode === 'pt-1001')
          ) {
            return mockPatient;
          }
          return null;
        }),
      },
      appointment: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      treatmentPlan: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      treatmentPlanItem: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      serviceTariff: {
        findMany: vi.fn().mockImplementation(async ({ where }: any) => {
          return isolatedTariffs.filter(
            (t) => where.id.in.includes(t.id) && t.clinicId === where.clinicId,
          );
        }),
      },
      invoice: {
        create: vi.fn().mockImplementation(async ({ data }: any) => {
          const record = {
            id: `inv-${Date.now()}`,
            patient: mockPatient,
            payments: [],
            ...data,
          };
          isolatedInvoices.push(record);
          return record;
        }),
        findUniqueOrThrow: vi.fn().mockImplementation(async ({ where }: any) => {
          const found = isolatedInvoices.find((i) => i.id === where.id);
          if (!found) throw new Error('Not found');
          return {
            ...found,
            patient: mockPatient,
            payments: isolatedPayments.filter((p) => p.invoiceId === found.id),
          };
        }),
        update: vi.fn().mockImplementation(async ({ where, data }: any) => {
          const idx = isolatedInvoices.findIndex((i) => i.id === where.id);
          if (idx === -1) throw new Error('Not found');
          isolatedInvoices[idx] = { ...isolatedInvoices[idx], ...data, patient: mockPatient };
          return isolatedInvoices[idx];
        }),
      },
      invoicePayment: {
        create: vi.fn().mockImplementation(async ({ data }: any) => {
          const record = { id: `pay-${Date.now()}`, ...data };
          isolatedPayments.push(record);
          return record;
        }),
      },
      $queryRaw: vi.fn().mockImplementation(async () => [
        { assignedValue: 1001 + isolatedInvoices.length },
      ]),
      $transaction: vi.fn().mockImplementation(async (cb: (tx: any) => Promise<any>) => {
        const invSnapshot = [...isolatedInvoices];
        const paySnapshot = [...isolatedPayments];
        try {
          return await cb(prismaMock);
        } catch (err) {
          isolatedInvoices = invSnapshot;
          isolatedPayments = paySnapshot;
          throw err;
        }
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        BillingCalculationService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    billingService = module.get<BillingService>(BillingService);
  });

  // Test 1: Valid Tariff
  it('creates an invoice with a valid tariff belonging to the authenticated clinic', async () => {
    const inv = await billingService.createAndIssueInvoice(mockClinicId, mockStaffUser, {
      patientId: 'pt-1001',
      items: [
        {
          name: 'Dental Scaling',
          quantity: 1,
          unitPrice: 1500,
          gstRate: 0,
          serviceTariffId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
        },
      ],
    });

    expect(inv.invoiceNumber).toBeDefined();
    expect(inv.status).toBe(InvoiceStatus.ISSUED);
    expect(isolatedInvoices.length).toBe(1);
    expect(isolatedInvoices[0].items.create[0].serviceTariffId).toBe(
      '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    );
  });

  // Test 2: Manual Service Item (no tariff ID)
  it('creates an invoice with a manual service item having no tariff reference', async () => {
    const inv = await billingService.createAndIssueInvoice(mockClinicId, mockStaffUser, {
      patientId: 'pt-1001',
      items: [
        {
          name: 'Emergency Temporary Dressing',
          quantity: 1,
          unitPrice: 500,
          gstRate: 0,
          serviceTariffId: undefined,
        },
      ],
    });

    expect(inv.invoiceNumber).toBeDefined();
    expect(isolatedInvoices.length).toBe(1);
    expect(isolatedInvoices[0].items.create[0].serviceTariffId).toBeUndefined();
    expect(prismaMock.serviceTariff.findMany).not.toHaveBeenCalled();
  });

  // Test 3: Nonexistent Tariff ID
  it('rejects invoice creation with NotFoundException when tariff ID does not exist', async () => {
    await expect(
      billingService.createAndIssueInvoice(mockClinicId, mockStaffUser, {
        patientId: 'pt-1001',
        items: [
          {
            name: 'Whitening Kit',
            quantity: 1,
            unitPrice: 4000,
            serviceTariffId: '00000000-0000-0000-0000-000000000000',
          },
        ],
      }),
    ).rejects.toThrow(NotFoundException);

    // Rollback verification: no invoice was committed
    expect(isolatedInvoices.length).toBe(0);
  });

  // Test 4: Tariff from another clinic
  it('enforces tenant isolation and rejects tariff belonging to another clinic with NotFoundException', async () => {
    await expect(
      billingService.createAndIssueInvoice(mockClinicId, mockStaffUser, {
        patientId: 'pt-1001',
        items: [
          {
            name: 'Foreign Clinic Procedure',
            quantity: 1,
            unitPrice: 2500,
            serviceTariffId: '8fe9b810-9dad-11d1-80b4-00c04fd430c9',
          },
        ],
      }),
    ).rejects.toThrow(NotFoundException);

    // Rollback verification: no cross-clinic invoice was committed
    expect(isolatedInvoices.length).toBe(0);
  });

  // Test 5: Stale or Inactive Tariff
  it('rejects invoice creation referencing an inactive or stale tariff with BadRequestException', async () => {
    await expect(
      billingService.createAndIssueInvoice(mockClinicId, mockStaffUser, {
        patientId: 'pt-1001',
        items: [
          {
            name: 'Deprecated Fluoride Treatment',
            quantity: 1,
            unitPrice: 800,
            serviceTariffId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
          },
        ],
      }),
    ).rejects.toThrow(BadRequestException);

    expect(isolatedInvoices.length).toBe(0);
  });

  // Test 6: Transaction Rollback on Multi-item Partial Failure
  it('rolls back the entire transaction if any one line item references an invalid tariff', async () => {
    await expect(
      billingService.createAndIssueInvoice(mockClinicId, mockStaffUser, {
        patientId: 'pt-1001',
        items: [
          {
            name: 'Valid Item 1',
            quantity: 1,
            unitPrice: 1500,
            serviceTariffId: '3fa85f64-5717-4562-b3fc-2c963f66afa6', // Valid
          },
          {
            name: 'Invalid Item 2',
            quantity: 1,
            unitPrice: 900,
            serviceTariffId: '00000000-0000-0000-0000-000000000000', // Invalid
          },
        ],
      }),
    ).rejects.toThrow(NotFoundException);

    expect(isolatedInvoices.length).toBe(0);
  });

  // Test 7: Prisma P2003 Foreign Key Violation Safe Handling
  it('safely catches Prisma P2003 foreign key violations and throws clean NotFoundException with rollback', async () => {
    prismaMock.invoice.create = vi.fn().mockImplementation(async () => {
      throw new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed on the field: `InvoiceLineItem_serviceTariffId_fkey`',
        {
          code: 'P2003',
          clientVersion: '5.x',
          meta: { field_name: 'InvoiceLineItem_serviceTariffId_fkey' },
        },
      );
    });

    await expect(
      billingService.createAndIssueInvoice(mockClinicId, mockStaffUser, {
        patientId: 'pt-1001',
        items: [
          {
            name: 'Dental Scaling',
            quantity: 1,
            unitPrice: 1500,
            serviceTariffId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          },
        ],
      }),
    ).rejects.toThrow(NotFoundException);

    expect(isolatedInvoices.length).toBe(0);
  });
});

