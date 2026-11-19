import { lockInventoryItems } from '../common/transaction-locks.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { Injectable, NotFoundException, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateItemDto } from './dto/create-item.dto.js';
import { AddBatchDto } from './dto/add-batch.dto.js';
import { AdjustStockDto } from './dto/adjust-stock.dto.js';
import { ConfirmDeductionDto } from './dto/confirm-deduction.dto.js';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private prisma: PrismaService) {}

  async getItems(clinicId: string) {
    const items = await this.prisma.inventoryItem.findMany({
      where: { clinicId },
      include: {
        batches: {
          orderBy: { expiryDate: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return items.map((i) => {
      const computedTotal = i.batches.reduce((sum, b) => sum + b.quantity, 0);
      return {
        id: i.id,
        sku: i.sku,
        name: i.name,
        category: i.category,
        unit: i.unit,
        totalStock: i.batches.length > 0 ? computedTotal : i.totalStock,
        reorderLevel: i.reorderLevel,
        costPerUnit: i.costPerUnit,
        activeBatches: i.batches.map((b) => ({
          batchNumber: b.batchNumber,
          expiryDate: b.expiryDate,
          quantity: b.quantity,
          location: b.location,
        })),
      };
    });
  }

  async createItem(clinicId: string, dto: CreateItemDto) {
    return this.prisma.inventoryItem.create({
      data: {
        clinicId,
        sku: dto.sku,
        name: dto.name,
        category: dto.category,
        unit: dto.unit,
        totalStock: dto.totalStock ?? 0,
        reorderLevel: dto.reorderLevel ?? 10,
        costPerUnit: dto.costPerUnit ?? 0,
      },
    });
  }

  async updateItem(
    clinicId: string,
    id: string,
    dto: { name?: string; category?: string; unit?: string; reorderLevel?: number; costPerUnit?: number },
  ) {
    const existing = await this.prisma.inventoryItem.findFirst({
      where: {
        clinicId,
        OR: [{ id }, { sku: id }],
      },
    });
    if (!existing) {
      throw new NotFoundException('Inventory item not found');
    }

    return this.prisma.inventoryItem.update({
      where: { id: existing.id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.category ? { category: dto.category.trim() } : {}),
        ...(dto.unit ? { unit: dto.unit.trim() } : {}),
        ...(dto.reorderLevel !== undefined ? { reorderLevel: Number(dto.reorderLevel) } : {}),
        ...(dto.costPerUnit !== undefined ? { costPerUnit: Number(dto.costPerUnit) } : {}),
      },
    });
  }

  async deleteItem(clinicId: string, id: string) {
    return this.prisma.$transaction(async (tx) => {
      await lockInventoryItems(tx, clinicId, [id]);

    const existing = await tx.inventoryItem.findFirst({
      where: {
        clinicId,
        OR: [{ id }, { sku: id }],
      },
    });
    if (!existing) {
      return { success: true, message: 'Item already removed' };
    }

    // Delete associated batches first within clinic boundary
    await tx.inventoryBatch.deleteMany({
      where: { itemId: existing.id, clinicId },
    });

    return tx.inventoryItem.delete({
      where: { id: existing.id },
    });

    }, { maxWait: 10000, timeout: 20000 });
  }

  async receiveBatch(clinicId: string, dto: AddBatchDto) {
    return this.prisma.$transaction(async (tx) => {
      await lockInventoryItems(tx, clinicId, [dto.itemId]);

    const item = await tx.inventoryItem.findFirst({
      where: { id: dto.itemId, clinicId },
    });
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    const existingBatch = await tx.inventoryBatch.findFirst({
      where: { clinicId, itemId: dto.itemId, batchNumber: dto.batchNumber },
    });

    let batch;
    if (existingBatch) {
      batch = await tx.inventoryBatch.update({
        where: { id: existingBatch.id },
        data: {
          quantity: existingBatch.quantity + dto.quantity,
          expiryDate: dto.expiryDate,
          location: dto.location || existingBatch.location,
        },
      });
    } else {
      batch = await tx.inventoryBatch.create({
        data: {
          clinicId,
          itemId: dto.itemId,
          batchNumber: dto.batchNumber,
          expiryDate: dto.expiryDate,
          quantity: dto.quantity,
          location: dto.location || 'Central Storage',
        },
      });
    }

    const updatedItem = await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        totalStock: item.totalStock + dto.quantity,
      },
    });

    return { item: updatedItem, batch };

    }, { maxWait: 10000, timeout: 20000 });
  }

  async updateBatch(
    clinicId: string,
    dto: { itemId: string; batchNumber: string; newBatchNumber?: string; expiryDate?: string; quantity?: number },
  ) {
    return this.prisma.$transaction(async (tx) => {
      await lockInventoryItems(tx, clinicId, [dto.itemId]);

    const item = await tx.inventoryItem.findFirst({
      where: { clinicId, OR: [{ id: dto.itemId }, { sku: dto.itemId }] },
    });
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    const batch = await tx.inventoryBatch.findFirst({
      where: { clinicId, itemId: item.id, batchNumber: dto.batchNumber },
    });
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    const updatedBatch = await tx.inventoryBatch.update({
      where: { id: batch.id },
      data: {
        ...(dto.newBatchNumber ? { batchNumber: dto.newBatchNumber.trim().toUpperCase() } : {}),
        ...(dto.expiryDate ? { expiryDate: dto.expiryDate } : {}),
        ...(dto.quantity !== undefined ? { quantity: dto.quantity } : {}),
      },
    });

    const allBatches = await tx.inventoryBatch.findMany({
      where: { clinicId, itemId: item.id },
    });
    const totalStock = allBatches.reduce((s, b) => s + b.quantity, 0);
    const updatedItem = await tx.inventoryItem.update({
      where: { id: item.id },
      data: { totalStock },
    });

    return { item: updatedItem, batch: updatedBatch };

    }, { maxWait: 10000, timeout: 20000 });
  }

  async adjustStock(clinicId: string, dto: AdjustStockDto) {
    return this.prisma.$transaction(async (tx) => {
      await lockInventoryItems(tx, clinicId, [dto.itemId]);

    const item = await tx.inventoryItem.findFirst({
      where: {
        clinicId,
        OR: [{ id: dto.itemId }, { sku: dto.itemId }],
      },
    });
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    const batch = await tx.inventoryBatch.findFirst({
      where: { clinicId, itemId: item.id, batchNumber: dto.batchNumber },
    });
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    const newBatchQty = batch.quantity + dto.adjustmentAmount;
    if (newBatchQty < 0) throw new BadRequestException('Insufficient batch stock.');
    const qtyDelta = newBatchQty - batch.quantity;
    if (item.totalStock + qtyDelta < 0) throw new BadRequestException('Insufficient inventory stock.');

    const updatedBatch = await tx.inventoryBatch.update({
      where: { id: batch.id },
      data: { quantity: newBatchQty },
    });

    const updatedItem = await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        totalStock: item.totalStock + qtyDelta,
      },
    });

    return { item: updatedItem, batch: updatedBatch };

    }, { maxWait: 10000, timeout: 20000 });
  }

  async getAudits(clinicId: string) {
    const audits = await this.prisma.inventoryAudit.findMany({
      where: { clinicId },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    return audits.map((a) => ({
      id: a.id,
      treatmentId: a.treatmentId,
      appointmentId: a.appointmentId,
      patientId: a.patientId,
      patientName: a.patientName,
      doctorId: a.doctorId,
      doctorName: a.doctorName,
      procedureName: a.procedureName,
      procedureId: a.procedureId,
      modeUsed: a.modeUsed,
      timestamp: a.timestamp.toISOString(),
      materials: a.materials as any,
      confirmedBy: a.confirmedBy,
    }));
  }

  async confirmDeduction(clinicId: string, dto: ConfirmDeductionDto, actor: AuthenticatedUser) {
    if (!actor || actor.clinicId !== clinicId) throw new ForbiddenException('Authenticated inventory actor is required.');
    const recorded = { patientName: 'Not linked', doctorId: undefined as string | undefined, doctorName: 'Unassigned', confirmedBy: actor.id };
    if (dto.patientId) {
      const patient = await this.prisma.patient.findFirst({ where: { id: dto.patientId, clinicId } });
      if (!patient) throw new NotFoundException('Patient not found in this clinic.');
      recorded.patientName = patient.firstName + ' ' + patient.lastName;
    }
    const doctorId = dto.doctorId || (actor.role === 'DOCTOR' ? actor.id : undefined);
    if (doctorId) {
      const doctor = await this.prisma.user.findFirst({ where: { id: doctorId, clinicId, role: 'DOCTOR', isActive: true } });
      if (!doctor) throw new NotFoundException('Doctor not found in this clinic.');
      recorded.doctorId = doctor.id; recorded.doctorName = doctor.fullName;
    }
    if (dto.appointmentId && !await this.prisma.appointment.findFirst({ where: { id: dto.appointmentId, clinicId, ...(dto.patientId ? { patientId: dto.patientId } : {}) } })) throw new NotFoundException('Appointment not found in this clinic.');
    if (dto.treatmentId && !await this.prisma.treatmentPlan.findFirst({ where: { id: dto.treatmentId, clinicId, ...(dto.patientId ? { patientId: dto.patientId } : {}) } })) throw new NotFoundException('Treatment plan not found in this clinic.');

    const opId = dto.operationId || dto.deductionId;

    if (opId) {
      const existingAudit = await this.prisma.inventoryAudit.findFirst({
        where: { clinicId, id: opId },
      });
      if (existingAudit) {
        return {
          ...existingAudit,
          isDuplicate: true,
          message: `Deduction operation "${opId}" has already been processed (idempotent replay).`,
        };
      }
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        await lockInventoryItems(tx, clinicId, dto.materials.map(mat => mat.itemId));
        if (opId) {
          const existingInTx = await tx.inventoryAudit.findFirst({
            where: { clinicId, id: opId },
          });
          if (existingInTx) {
            return {
              ...existingInTx,
              isDuplicate: true,
              message: `Deduction operation "${opId}" has already been processed (idempotent replay).`,
            };
          }
        }

        for (const mat of dto.materials) {
          if (!Number.isSafeInteger(mat.confirmedQty) || mat.confirmedQty < 0 || !Number.isSafeInteger(mat.wastageQty ?? 0) || (mat.wastageQty ?? 0) < 0) throw new BadRequestException('Inventory quantities must be nonnegative integers.');
          const totalDeduct = mat.confirmedQty + (mat.wastageQty ?? 0);
          if (totalDeduct <= 0) continue;

          const item = await tx.inventoryItem.findFirst({
            where: {
              clinicId,
              OR: [
                { id: mat.itemId },
                { sku: mat.itemId },

              ],
            },
          });
          if (!item) throw new NotFoundException('Inventory item not found.');
          if (item) {
            if (item.totalStock < totalDeduct) throw new BadRequestException('Insufficient inventory stock.');
            await tx.inventoryItem.update({
              where: { id: item.id },
              data: { totalStock: item.totalStock - totalDeduct },
            });

            const batch = await tx.inventoryBatch.findFirst({
              where: { clinicId, itemId: item.id, batchNumber: mat.batchNumber },
            });
            if (!batch) throw new NotFoundException('Inventory batch not found.');
            if (batch.quantity < totalDeduct) throw new BadRequestException('Insufficient batch stock.');
            if (batch) {
              await tx.inventoryBatch.update({
                where: { id: batch.id },
                data: { quantity: batch.quantity - totalDeduct },
              });
            }
          }
        }

        const audit = await tx.inventoryAudit.create({
          data: {
            id: opId || undefined,
            clinicId,
            treatmentId: dto.treatmentId,
            appointmentId: dto.appointmentId,
            patientId: dto.patientId,
            patientName: recorded.patientName,
            doctorId: recorded.doctorId,
            doctorName: recorded.doctorName,
            procedureId: dto.procedureId,
            procedureName: dto.procedureName,
            modeUsed: dto.modeUsed || 'standard',
            materials: dto.materials as any,
            confirmedBy: recorded.confirmedBy,
          },
        });

        return audit;
      });
    } catch (err: any) {
      if (err?.code === 'P2002' && opId) {
        const existing = await this.prisma.inventoryAudit.findFirst({
          where: { clinicId, id: opId },
        });
        if (existing) {
          return {
            ...existing,
            isDuplicate: true,
            message: `Deduction operation "${opId}" has already been processed (idempotent replay).`,
          };
        }
      }
      throw err;
    }
  }
}
