import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfirmDeductionDto } from './dto/confirm-deduction.dto.js';

describe('InventoryService — Idempotency & Deduction Protection', () => {
  let service: InventoryService;
  let prisma: any;

  const mockClinicId = 'clinic-alpha';
  const actor: any = { id: 'staff-a', clinicId: mockClinicId, role: 'ORGANIZATION_ADMIN', isPlatformAdmin: false };

  beforeEach(async () => {
    prisma = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: 'locked-item' }]),
      patient: { findFirst: vi.fn().mockResolvedValue({ firstName: 'Synthetic', lastName: 'Patient' }) },
      treatmentPlan: { findFirst: vi.fn().mockResolvedValue({ id: 'trt-101' }) },
      appointment: { findFirst: vi.fn().mockResolvedValue({ id: 'appt-101' }) },
      inventoryItem: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      inventoryBatch: {
        findMany: vi.fn().mockResolvedValueOnce([{ quantity: 10 }]).mockResolvedValue([{ quantity: 3 }, { quantity: 5 }]),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      inventoryAudit: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => {
        return cb(prisma);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  it('successfully deducts stock and records audit on first operation attempt', async () => {
    const dto: ConfirmDeductionDto = {
      operationId: 'op-deduct-001',
      treatmentId: 'trt-101',
      patientName: 'John Doe',
      doctorName: 'Dr. Smith',
      procedureName: 'Composite Filling',
      confirmedBy: 'Dr. Smith',
      materials: [
        {
          itemId: 'mat-composite',
          name: 'Composite Resin',
          unit: 'syringes',
          confirmedQty: 2,
          wastageQty: 0,
          batchNumber: 'BATCH-A1',
        },
      ],
    };

    // First attempt: no existing audit found
    prisma.inventoryAudit.findFirst.mockResolvedValue(null);
    prisma.inventoryItem.findFirst.mockResolvedValue({
      id: 'mat-composite',
      clinicId: mockClinicId,
      totalStock: 10,
    });
    prisma.inventoryBatch.findFirst.mockResolvedValue({
      id: 'batch-uuid-1',
      clinicId: mockClinicId,
      quantity: 5,
      batchNumber: 'BATCH-A1',
    });
    prisma.inventoryAudit.create.mockResolvedValue({
      id: 'op-deduct-001',
      clinicId: mockClinicId,
      treatmentId: 'trt-101',
      materials: dto.materials,
    });

    const result = await service.confirmDeduction(mockClinicId, dto, actor);

    // Assert stock was updated
    expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: 'mat-composite' },
      data: { totalStock: 8 }, // 10 - 2
    });
    expect(prisma.inventoryBatch.update).toHaveBeenCalledWith({
      where: { id: 'batch-uuid-1' },
      data: { quantity: 3 }, // 5 - 2
    });

    // Assert audit record was created with stable operationId
    expect(prisma.inventoryAudit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: 'op-deduct-001',
        clinicId: mockClinicId,
        treatmentId: 'trt-101',
      }),
    });
    expect(result.id).toBe('op-deduct-001');
    expect((result as any).isDuplicate).toBeUndefined();
  });

  it('rejects duplicate stock deduction and returns idempotent replay when operationId is repeated', async () => {
    const dto: ConfirmDeductionDto = {
      operationId: 'op-deduct-001',
      treatmentId: 'trt-101',
      patientName: 'John Doe',
      doctorName: 'Dr. Smith',
      procedureName: 'Composite Filling',
      confirmedBy: 'Dr. Smith',
      materials: [
        {
          itemId: 'mat-composite',
          name: 'Composite Resin',
          unit: 'syringes',
          confirmedQty: 2,
          wastageQty: 0,
          batchNumber: 'BATCH-A1',
        },
      ],
    };

    const existingAuditRecord = {
      id: 'op-deduct-001',
      clinicId: mockClinicId,
      treatmentId: 'trt-101',
      patientName: 'John Doe',
      doctorName: 'Dr. Smith',
      procedureName: 'Composite Filling',
      materials: dto.materials,
      confirmedBy: 'Dr. Smith',
      createdAt: new Date(),
    };

    // Pre-existing audit found for this operationId
    prisma.inventoryAudit.findFirst.mockResolvedValue(existingAuditRecord);

    const result = await service.confirmDeduction(mockClinicId, dto, actor);

    // Assert NO stock updates were triggered
    expect(prisma.inventoryItem.update).not.toHaveBeenCalled();
    expect(prisma.inventoryBatch.update).not.toHaveBeenCalled();
    expect(prisma.inventoryAudit.create).not.toHaveBeenCalled();

    // Assert response indicates duplicate replay
    expect((result as any).isDuplicate).toBe(true);
    expect((result as any).message).toContain('idempotent replay');
    expect(result.id).toBe('op-deduct-001');
  });

  it('permits legitimate additional material consumption under a different operationId', async () => {
    prisma.inventoryBatch.findMany.mockReset().mockResolvedValueOnce([{ quantity: 4 }]).mockResolvedValue([{ quantity: 3 }]);
    const additionalDto: ConfirmDeductionDto = {
      operationId: 'op-deduct-002', // New operation ID
      treatmentId: 'trt-101',       // Same treatment
      patientName: 'John Doe',
      doctorName: 'Dr. Smith',
      procedureName: 'Composite Filling — Additional Suture',
      confirmedBy: 'Dr. Smith',
      materials: [
        {
          itemId: 'mat-suture',
          name: 'Silk Suture 3-0',
          unit: 'packs',
          confirmedQty: 1,
          wastageQty: 0,
          batchNumber: 'BATCH-S1',
        },
      ],
    };

    prisma.inventoryAudit.findFirst.mockResolvedValue(null);
    prisma.inventoryItem.findFirst.mockResolvedValue({
      id: 'mat-suture',
      clinicId: mockClinicId,
      totalStock: 4,
    });
    prisma.inventoryBatch.findFirst.mockResolvedValue({
      id: 'batch-uuid-suture',
      clinicId: mockClinicId,
      quantity: 4,
      batchNumber: 'BATCH-S1',
    });
    prisma.inventoryAudit.create.mockResolvedValue({
      id: 'op-deduct-002',
      clinicId: mockClinicId,
      treatmentId: 'trt-101',
      materials: additionalDto.materials,
    });

    const result = await service.confirmDeduction(mockClinicId, additionalDto, actor);

    // Stock update for additional consumption is executed
    expect(prisma.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: 'mat-suture' },
      data: { totalStock: 3 },
    });
    expect(prisma.inventoryAudit.create).toHaveBeenCalled();
    expect(result.id).toBe('op-deduct-002');
    expect((result as any).isDuplicate).toBeUndefined();
  });

  it('rejects insufficient stock without committing a deduction', async () => {
    const dto: ConfirmDeductionDto = {
      operationId: 'op-deduct-003',
      treatmentId: 'trt-102',
      patientName: 'Jane Smith',
      doctorName: 'Dr. Smith',
      procedureName: 'Extraction',
      confirmedBy: 'Dr. Smith',
      materials: [
        {
          itemId: 'mat-gauze',
          name: 'Sterile Gauze',
          unit: 'packs',
          confirmedQty: 10, // Requesting 10 units
          wastageQty: 5,   // Total 15 units
          batchNumber: 'BATCH-G1',
        },
      ],
    };

    prisma.inventoryBatch.findMany.mockReset().mockResolvedValue([{ quantity: 3 }]);
    prisma.inventoryAudit.findFirst.mockResolvedValue(null);
    prisma.inventoryItem.findFirst.mockResolvedValue({
      id: 'mat-gauze',
      clinicId: mockClinicId,
      totalStock: 3, // Only 3 units available
    });
    prisma.inventoryBatch.findFirst.mockResolvedValue({
      id: 'batch-uuid-gauze',
      clinicId: mockClinicId,
      quantity: 3,
      batchNumber: 'BATCH-G1',
    });
    prisma.inventoryAudit.create.mockResolvedValue({
      id: 'op-deduct-003',
      clinicId: mockClinicId,
    });

    await expect(service.confirmDeduction(mockClinicId, dto, actor)).rejects.toThrow(/Insufficient/);

    // Stock must be clamped to 0, not -12
    expect(prisma.inventoryAudit.create).not.toHaveBeenCalled();
  });
});

