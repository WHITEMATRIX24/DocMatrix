import { Injectable, NotFoundException, Logger } from '@nestjs/common';
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

    return items.map((i) => ({
      id: i.id,
      sku: i.sku,
      name: i.name,
      category: i.category,
      unit: i.unit,
      totalStock: i.totalStock,
      reorderLevel: i.reorderLevel,
      costPerUnit: i.costPerUnit,
      activeBatches: i.batches.map((b) => ({
        batchNumber: b.batchNumber,
        expiryDate: b.expiryDate,
        quantity: b.quantity,
        location: b.location,
      })),
    }));
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

  async receiveBatch(clinicId: string, dto: AddBatchDto) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: dto.itemId, clinicId },
    });
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    const existingBatch = await this.prisma.inventoryBatch.findFirst({
      where: { clinicId, itemId: dto.itemId, batchNumber: dto.batchNumber },
    });

    let batch;
    if (existingBatch) {
      batch = await this.prisma.inventoryBatch.update({
        where: { id: existingBatch.id },
        data: {
          quantity: existingBatch.quantity + dto.quantity,
          expiryDate: dto.expiryDate,
          location: dto.location || existingBatch.location,
        },
      });
    } else {
      batch = await this.prisma.inventoryBatch.create({
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

    const updatedItem = await this.prisma.inventoryItem.update({
      where: { id: item.id },
      data: {
        totalStock: item.totalStock + dto.quantity,
      },
    });

    return { item: updatedItem, batch };
  }

  async adjustStock(clinicId: string, dto: AdjustStockDto) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: dto.itemId, clinicId },
    });
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    const batch = await this.prisma.inventoryBatch.findFirst({
      where: { clinicId, itemId: dto.itemId, batchNumber: dto.batchNumber },
    });
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    const newBatchQty = Math.max(0, batch.quantity + dto.adjustmentAmount);
    const qtyDelta = newBatchQty - batch.quantity;

    const updatedBatch = await this.prisma.inventoryBatch.update({
      where: { id: batch.id },
      data: { quantity: newBatchQty },
    });

    const updatedItem = await this.prisma.inventoryItem.update({
      where: { id: item.id },
      data: {
        totalStock: Math.max(0, item.totalStock + qtyDelta),
      },
    });

    return { item: updatedItem, batch: updatedBatch };
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

  async confirmDeduction(clinicId: string, dto: ConfirmDeductionDto) {
    for (const mat of dto.materials) {
      const totalDeduct = (mat.confirmedQty || 0) + (mat.wastageQty || 0);
      if (totalDeduct <= 0) continue;

      const item = await this.prisma.inventoryItem.findFirst({
        where: { id: mat.itemId, clinicId },
      });
      if (item) {
        await this.prisma.inventoryItem.update({
          where: { id: item.id },
          data: { totalStock: Math.max(0, item.totalStock - totalDeduct) },
        });

        const batch = await this.prisma.inventoryBatch.findFirst({
          where: { clinicId, itemId: item.id, batchNumber: mat.batchNumber },
        });
        if (batch) {
          await this.prisma.inventoryBatch.update({
            where: { id: batch.id },
            data: { quantity: Math.max(0, batch.quantity - totalDeduct) },
          });
        }
      }
    }

    const audit = await this.prisma.inventoryAudit.create({
      data: {
        clinicId,
        treatmentId: dto.treatmentId,
        appointmentId: dto.appointmentId,
        patientId: dto.patientId,
        patientName: dto.patientName,
        doctorId: dto.doctorId,
        doctorName: dto.doctorName,
        procedureId: dto.procedureId,
        procedureName: dto.procedureName,
        modeUsed: dto.modeUsed || 'standard',
        materials: dto.materials as any,
        confirmedBy: dto.confirmedBy,
      },
    });

    return audit;
  }
}
