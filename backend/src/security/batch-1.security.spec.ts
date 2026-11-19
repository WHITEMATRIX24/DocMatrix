import 'reflect-metadata';
import { describe, it, expect, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BillingService } from '../billing/billing.service.js';
import { BillingCalculationService } from '../billing/billing-calculation.service.js';
import { TreatmentPlansService } from '../treatment-plans/treatment-plans.service.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import { ClinicalNotesController } from '../clinical-notes/clinical-notes.controller.js';
import { ConfirmDeductionDto } from '../inventory/dto/confirm-deduction.dto.js';
import { MalwareScannerService } from '../storage/malware-scanner.service.js';
import {
  StorageService,
  MAX_FILE_SIZE_BYTES,
} from '../storage/storage.service.js';
import { SubscriptionsController } from '../subscriptions/subscriptions.controller.js';

const actor: any = {
  id: 'staff-a',
  clinicId: 'clinic-a',
  role: 'DOCTOR',
  isPlatformAdmin: false,
};
const context = (user: any, method = 'PATCH') => ({
  getClass: () => ClinicalNotesController,
  getHandler: () =>
    Reflect.get(ClinicalNotesController.prototype, 'updateClinicalNote'),
  switchToHttp: () => ({
    getRequest: () => ({ user, method, path: '/clinical-notes/note' }),
  }),
});

describe('Batch 1 audit regression cases', () => {
  it('#2 rejects foreign appointment assignment on draft updates', async () => {
    const db: any = {
      invoice: {
        findFirst: vi
          .fn()
          .mockResolvedValue({
            id: 'invoice-a',
            status: 'DRAFT',
            patientId: 'patient-a',
            totalAmount: 100,
          }),
        update: vi.fn().mockResolvedValue({}),
      },
      appointment: { findFirst: vi.fn().mockResolvedValue(null) },
      $queryRaw: vi.fn().mockResolvedValue([{ id: 'invoice-a' }]),
      $transaction: async (fn: any) => fn(db),
    };
    await expect(
      new BillingService(
        db,
        new BillingCalculationService(),
      ).updateDraftInvoice('clinic-a', actor, 'invoice-a', {
        appointmentId: 'appointment-b',
      }),
    ).rejects.toThrow();
    expect(db.invoice.update).not.toHaveBeenCalled();
  });

  it('#3 denies an Accountant modifying clinical notes', async () => {
    const guard = new (TenantGuard as any)(
      { clinic: { findUnique: async () => ({ status: 'ACTIVE' }) } },
      new Reflector(),
    );
    await expect(
      Promise.resolve().then(() =>
        guard.canActivate(context({ ...actor, role: 'ACCOUNTANT' })),
      ),
    ).rejects.toThrow();
  });

  it('#4 denies non-practitioners before treatment lifecycle access', async () => {
    const db: any = { treatmentPlan: { findFirst: vi.fn() } };
    await expect(
      new TreatmentPlansService(db).updatePlanStatus(
        'clinic-a',
        { ...actor, role: 'ACCOUNTANT' },
        'plan',
        { status: 'COMPLETED' },
      ),
    ).rejects.toThrow();
    expect(db.treatmentPlan.findFirst).not.toHaveBeenCalled();
  });

  it('#6 rejects tenant commercial overrides instead of forwarding them', async () => {
    const svc: any = { assignSubscription: vi.fn().mockResolvedValue({}) };
    await expect(
      new SubscriptionsController(svc).assignSubscription(
        { ...actor, role: 'ORGANIZATION_ADMIN' },
        { clinicId: 'clinic-a', planId: 'premium', lockedPrice: 0 },
      ),
    ).rejects.toThrow();
    expect(svc.assignSubscription).not.toHaveBeenCalled();
  });

  it('#7 denies embedded payment collection by a Doctor before any database access', async () => {
    const db: any = { patient: { findFirst: vi.fn() } };
    await expect(
      new BillingService(
        db,
        new BillingCalculationService(),
      ).createAndIssueInvoice('clinic-a', actor, {
        patientId: 'patient',
        items: [{ name: 'consultation', quantity: 1, unitPrice: 100 }],
        upfrontPayment: { amount: 100, mode: 'CASH' },
      }),
    ).rejects.toThrow();
    expect(db.patient.findFirst).not.toHaveBeenCalled();
  });

  it('#8 blocks read-only clinic writes', async () => {
    const guard = new (TenantGuard as any)(
      { clinic: { findUnique: async () => ({ status: 'READ_ONLY' }) } },
      new Reflector(),
    );
    await expect(
      Promise.resolve().then(() => guard.canActivate(context(actor))),
    ).rejects.toThrow();
  });

  it('#9 rejects oversized content before invoking a scanner', async () => {
    const scanBuffer = vi.fn();
    const service = new StorageService(
      { isAvailable: () => false } as any,
      {} as any,
      { scanBuffer } as any,
    );
    await expect(
      service.uploadPatientDocument({
        clinicId: 'a',
        patientId: 'p',
        category: 'Other',
        originalFilename: 'large.pdf',
        buffer: Buffer.alloc(MAX_FILE_SIZE_BYTES + 1),
      }),
    ).rejects.toThrow();
    expect(scanBuffer.mock.calls.length).toBe(0);
  });

  it('#10 fails closed when required antivirus has no adapter', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('CLAMAV_HOST', undefined);
    try {
      await expect(
        new MalwareScannerService().scanBuffer(
          Buffer.from('%PDF-1.4\n%%EOF'),
          'sample.pdf',
        ),
      ).rejects.toThrow();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('#11 rejects active SVG content disguised as XML', () => {
    const service = new StorageService(
      { isAvailable: () => false } as any,
      {} as any,
    );
    expect(() =>
      service.validateFile(
        Buffer.from('<svg><script>alert(1)</script></svg>'),
        'report.xml',
        'image/svg+xml',
      ),
    ).toThrow();
  });

  it('#12 rejects string or negative nested deduction quantities', async () => {
    const dto = plainToInstance(ConfirmDeductionDto, {
      patientName: 'Synthetic',
      doctorName: 'Synthetic',
      procedureName: 'Synthetic',
      confirmedBy: 'spoofed',
      materials: [
        {
          itemId: 'item',
          name: 'Synthetic',
          unit: 'unit',
          batchNumber: 'batch',
          confirmedQty: '2',
          wastageQty: -1,
        },
      ],
    });
    expect(
      (await validate(dto, { whitelist: true, forbidNonWhitelisted: true }))
        .length,
    ).toBeGreaterThan(0);
  });
});
