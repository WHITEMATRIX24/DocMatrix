import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { BillingService } from '../billing/billing.service.js';
import { BillingCalculationService } from '../billing/billing-calculation.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { ClinicalNotesService } from '../clinical-notes/clinical-notes.service.js';
import { PrescriptionsService } from '../prescriptions/prescriptions.service.js';
import { SubscriptionsService } from '../subscriptions/subscriptions.service.js';

const url = process.env.BATCH1_DATABASE_URL;
if (url) {
  const parsed = new URL(url);
  if (
    parsed.hostname !== '127.0.0.1' ||
    parsed.port !== '55439' ||
    parsed.username !== 'batch_security' ||
    parsed.pathname !== '/postgres' ||
    parsed.searchParams.get('schema') !== 'batch1_security'
  ) {
    throw new Error(
      'Batch 1 integration tests require the dedicated disposable localhost cluster.',
    );
  }
}

describe.skipIf(!url)('Batch 1: real disposable PostgreSQL integrity', () => {
  let db: PrismaClient;
  let clinic: any,
    foreignClinic: any,
    patient: any,
    foreignPatient: any,
    doctor: any;
  let actor: any;
  const billing = (client: any = db) =>
    new BillingService(client, new BillingCalculationService());
  const slowReads = () =>
    db.$extends({
      query: {
        $allModels: {
          async findFirst({ args, query }) {
            const row = await query(args);
            await delay(120);
            return row;
          },
          async findMany({ args, query }) {
            const rows = await query(args);
            await delay(120);
            return rows;
          },
        },
      },
    });

  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url: url! } } });
    await db.$connect();
    const namespace = await db.$queryRaw<
      { name: string }[]
    >`SELECT current_schema() AS name`;
    expect(namespace[0].name).toBe('batch1_security');
    clinic = await db.clinic.create({
      data: {
        name: 'Synthetic A',
        slug: randomUUID(),
        phone: '000',
        email: 'a@example.test',
        status: 'ACTIVE',
      },
    });
    foreignClinic = await db.clinic.create({
      data: {
        name: 'Synthetic B',
        slug: randomUUID(),
        phone: '000',
        email: 'b@example.test',
        status: 'ACTIVE',
      },
    });
    doctor = await db.user.create({
      data: {
        clinicId: clinic.id,
        email: `${randomUUID()}@example.test`,
        fullName: 'Synthetic Doctor',
        passwordHash: 'synthetic-not-a-login-hash',
        role: 'DOCTOR',
      },
    });
    actor = { ...doctor, isPlatformAdmin: false };
    patient = await db.patient.create({
      data: {
        clinicId: clinic.id,
        patientCode: randomUUID(),
        firstName: 'Synthetic',
        lastName: 'A',
        dateOfBirth: new Date('2000-01-01'),
        mobile: '000',
      },
    });
    foreignPatient = await db.patient.create({
      data: {
        clinicId: foreignClinic.id,
        patientCode: randomUUID(),
        firstName: 'Synthetic',
        lastName: 'B',
        dateOfBirth: new Date('2000-01-01'),
        mobile: '000',
      },
    });
  }, 30000);
  afterAll(async () => {
    await db?.$disconnect();
  });

  const invoice = async (status: 'DRAFT' | 'ISSUED' = 'DRAFT') =>
    db.invoice.create({
      data: {
        clinicId: clinic.id,
        patientId: patient.id,
        invoiceNumber: randomUUID(),
        description: 'Original',
        status,
        subtotal: 100,
        totalAmount: 100,
        balance: 100,
        items: {
          create: [
            {
              name: 'Consultation',
              quantity: 1,
              unitPrice: 100,
              taxableAmount: 100,
              totalAmount: 100,
            },
          ],
        },
      },
    });
  const stock = async () => {
    const item = await db.inventoryItem.create({
      data: {
        clinicId: clinic.id,
        sku: randomUUID(),
        name: 'Synthetic material',
        category: 'Test',
        unit: 'unit',
        totalStock: 10,
      },
    });
    const batch = await db.inventoryBatch.create({
      data: {
        clinicId: clinic.id,
        itemId: item.id,
        batchNumber: randomUUID(),
        expiryDate: '2030-01-01',
        quantity: 10,
      },
    });
    return { item, batch };
  };

  it('#2 rejects foreign appointment links on update and legacy detail retrieval', async () => {
    const appointment = await db.appointment.create({
      data: {
        clinicId: foreignClinic.id,
        patientId: foreignPatient.id,
        startTime: new Date(),
        endTime: new Date(Date.now() + 60000),
        durationMinutes: 1,
      },
    });
    const draft = await invoice();
    await expect(
      billing().updateDraftInvoice(clinic.id, actor, draft.id, {
        appointmentId: appointment.id,
      }),
    ).rejects.toThrow();
    // Simulate a pre-existing corrupt link without changing any production data.
    await db.invoice.update({
      where: { id: draft.id },
      data: { appointmentId: appointment.id },
    });
    await expect(
      billing().getInvoiceById(clinic.id, draft.id),
    ).rejects.toThrow();
  });

  it('#6/#8 preserves authorized platform provisioning and clinic recovery', async () => {
    const plan = await db.plan.create({ data: { name: 'Synthetic Plan', slug: randomUUID(), basePrice: 100 } });
    const recoveryClinic = await db.clinic.create({ data: { name: 'Synthetic suspended clinic', slug: randomUUID(), email: 'recovery@example.test', phone: '000', status: 'SUSPENDED' } });
    const subscription = await new SubscriptionsService(db as any).assignSubscription({ clinicId: recoveryClinic.id, planId: plan.id, lockedPrice: 50 }, { ...actor, isPlatformAdmin: true });
    expect(Number(subscription.lockedPrice)).toBe(50);
    expect((await db.clinic.findUniqueOrThrow({ where: { id: recoveryClinic.id } })).status).toBe('ACTIVE');
  });

  it('#13 concurrent deductions cannot oversell or lose stock updates', async () => {
    const { item, batch } = await stock();
    const service = new InventoryService(slowReads() as any);
    const deduct = () =>
      service.confirmDeduction(
        clinic.id,
        {
          operationId: randomUUID(),
          patientName: 'ignored',
          doctorName: 'ignored',
          procedureName: 'Synthetic',
          confirmedBy: 'spoofed',
          materials: [
            {
              itemId: item.id,
              name: item.name,
              unit: item.unit,
              batchNumber: batch.batchNumber,
              confirmedQty: 6,
              wastageQty: 0,
            },
          ],
        },
        actor,
      );
    const results = await Promise.allSettled([deduct(), deduct()]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      (await db.inventoryItem.findUniqueOrThrow({ where: { id: item.id } }))
        .totalStock,
    ).toBe(4);
    expect(
      (await db.inventoryBatch.findUniqueOrThrow({ where: { id: batch.id } }))
        .quantity,
    ).toBe(4);
    const audits = await db.inventoryAudit.findMany({
      where: { clinicId: clinic.id, materials: { not: Prisma.JsonNull } },
    });
    expect(
      audits.filter((audit) =>
        JSON.stringify(audit.materials).includes(item.id),
      ),
    ).toHaveLength(1);
  });

  it('#12 stores the authenticated actor, not client-supplied attribution', async () => {
    const { item, batch } = await stock();
    const result = await new InventoryService(db as any).confirmDeduction(
      clinic.id,
      {
        operationId: randomUUID(),
        patientName: 'spoofed',
        doctorName: 'spoofed',
        procedureName: 'Synthetic',
        confirmedBy: 'spoofed',
        materials: [
          {
            itemId: item.id,
            name: item.name,
            unit: item.unit,
            batchNumber: batch.batchNumber,
            confirmedQty: 1,
          },
        ],
      },
      actor,
    );
    expect(result.confirmedBy).toBe(actor.id);
    expect(result.doctorName).toBe(doctor.fullName);
  });

  it('#13 concurrent receipts preserve batch and item totals', async () => {
    const { item, batch } = await stock();
    const service = new InventoryService(slowReads() as any);
    const receive = () =>
      service.receiveBatch(clinic.id, {
        itemId: item.id,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        quantity: 3,
      });
    await Promise.all([receive(), receive()]);
    expect(
      (await db.inventoryItem.findUniqueOrThrow({ where: { id: item.id } }))
        .totalStock,
    ).toBe(16);
    expect(
      (await db.inventoryBatch.findUniqueOrThrow({ where: { id: batch.id } }))
        .quantity,
    ).toBe(16);
  });

  it('#14 serializes invoice voiding and payment collection', async () => {
    const row = await invoice('ISSUED');
    const service = billing(slowReads());
    const results = await Promise.allSettled([
      service.voidInvoice(clinic.id, actor, row.id, {
        reason: 'Synthetic cancellation',
      }),
      service.recordPayment(clinic.id, actor, row.id, {
        amount: 100,
        mode: 'CASH',
        idempotencyKey: randomUUID(),
      }),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const final = await db.invoice.findUniqueOrThrow({ where: { id: row.id } });
    expect(final.status === 'VOID' && Number(final.paidAmount) > 0).toBe(false);
  });

  it('#13 preserves concurrent stock adjustments', async () => {
    const { item, batch } = await stock();
    const service = new InventoryService(slowReads() as any);
    await Promise.all([
      service.adjustStock(clinic.id, { itemId: item.id, batchNumber: batch.batchNumber, adjustmentAmount: 2 }),
      service.adjustStock(clinic.id, { itemId: item.id, batchNumber: batch.batchNumber, adjustmentAmount: 3 }),
    ]);
    expect((await db.inventoryItem.findUniqueOrThrow({ where: { id: item.id } })).totalStock).toBe(15);
    expect((await db.inventoryBatch.findUniqueOrThrow({ where: { id: batch.id } })).quantity).toBe(15);
  });

  it('#14 preserves payment idempotency and refund locking', async () => {
    const row = await invoice('ISSUED');
    const service = billing();
    const key = randomUUID();
    const payment = await service.recordPayment(clinic.id, actor, row.id, { amount: 40, mode: 'CASH', idempotencyKey: key });
    const replay = await service.recordPayment(clinic.id, actor, row.id, { amount: 40, mode: 'CASH', idempotencyKey: key });
    expect(replay.id).toBe(payment.id);
    await service.refundPayment(clinic.id, actor, payment.id, { amount: 40, reason: 'Synthetic refund' });
    const final = await db.invoice.findUniqueOrThrow({ where: { id: row.id } });
    expect(Number(final.paidAmount)).toBe(0);
    expect(Number(final.balance)).toBe(100);
  });

  it('#14 issues a draft only once under simultaneous requests', async () => {
    const row = await invoice();
    const service = billing(slowReads());
    const results = await Promise.allSettled([
      service.issueDraftInvoice(clinic.id, actor, row.id),
      service.issueDraftInvoice(clinic.id, actor, row.id),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
  });

  it('#14 cannot commit a stale draft edit after issuance', async () => {
    const row = await invoice();
    let locked!: () => void;
    const ready = new Promise<void>((resolve) => {
      locked = resolve;
    });
    const issuing = db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Invoice" WHERE "id" = ${row.id} FOR UPDATE`;
      await tx.invoice.update({
        where: { id: row.id },
        data: { status: 'ISSUED' },
      });
      locked();
      await delay(250);
    });
    await ready;
    const edit = billing().updateDraftInvoice(clinic.id, actor, row.id, {
      description: 'Stale edit',
    });
    await issuing;
    await expect(edit).rejects.toThrow();
    expect(
      (await db.invoice.findUniqueOrThrow({ where: { id: row.id } }))
        .description,
    ).toBe('Original');
  });

  it('#14 reserves a treatment item exactly once across simultaneous invoices', async () => {
    const plan = await db.treatmentPlan.create({
      data: {
        clinicId: clinic.id,
        patientId: patient.id,
        doctorId: doctor.id,
        doctorName: doctor.fullName,
        planNumber: randomUUID(),
        title: 'Synthetic',
        status: 'ACCEPTED',
        stages: {
          create: [
            {
              stageNumber: 1,
              name: 'Stage',
              items: {
                create: [
                  {
                    procedureName: 'Procedure',
                    category: 'Test',
                    quantity: 1,
                    unitFee: 100,
                    netFee: 100,
                  },
                ],
              },
            },
          ],
        },
      },
    });
    const service = billing(slowReads());
    const create = () =>
      service.createInvoiceFromTreatmentPlan(clinic.id, actor, {
        treatmentPlanId: plan.id,
        issueImmediately: true,
      });
    const results = await Promise.allSettled([create(), create()]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    expect(
      await db.invoice.count({
        where: { treatmentPlanId: plan.id, status: { not: 'VOID' } },
      }),
    ).toBe(1);
  });

  it.each(['ClinicalNote', 'Prescription'] as const)(
    '#15 cannot edit %s after concurrent finalization',
    async (table) => {
      const row =
        table === 'ClinicalNote'
          ? await db.clinicalNote.create({
              data: {
                clinicId: clinic.id,
                patientId: patient.id,
                doctorId: doctor.id,
                noteNumber: randomUUID(),
                chiefComplaint: 'Synthetic',
                primaryDiagnosis: 'Original',
              },
            })
          : await db.prescription.create({
              data: {
                clinicId: clinic.id,
                patientId: patient.id,
                doctorId: doctor.id,
                prescriptionNumber: randomUUID(),
                diagnosis: 'Original',
              },
            });
      let locked!: () => void;
      const ready = new Promise<void>((resolve) => {
        locked = resolve;
      });
      const finalizing = db.$transaction(async (tx) => {
        await tx.$queryRaw(
          Prisma.sql`SELECT "id" FROM ${Prisma.raw(`"${table}"`)} WHERE "id" = ${row.id} FOR UPDATE`,
        );
        if (table === 'ClinicalNote')
          await tx.clinicalNote.update({
            where: { id: row.id },
            data: { status: 'FINALIZED' },
          });
        else
          await tx.prescription.update({
            where: { id: row.id },
            data: { status: 'FINALIZED' },
          });
        locked();
        await delay(250);
      });
      await ready;
      const edit =
        table === 'ClinicalNote'
          ? new ClinicalNotesService(db as any).updateClinicalNote(
              clinic.id,
              actor,
              row.id,
              { primaryDiagnosis: 'Stale' },
            )
          : new PrescriptionsService(db as any).updatePrescription(
              clinic.id,
              actor,
              row.id,
              { diagnosis: 'Stale' },
            );
      await finalizing;
      await expect(edit).rejects.toThrow();
      const final =
        table === 'ClinicalNote'
          ? await db.clinicalNote.findUniqueOrThrow({ where: { id: row.id } })
          : await db.prescription.findUniqueOrThrow({ where: { id: row.id } });
      expect((final as any).primaryDiagnosis ?? (final as any).diagnosis).toBe(
        'Original',
      );
    },
  );
});
