import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateItemDto } from './dto/create-item.dto.js';
import { AddBatchDto } from './dto/add-batch.dto.js';
import { AdjustStockDto } from './dto/adjust-stock.dto.js';
import { ConfirmDeductionDto } from './dto/confirm-deduction.dto.js';

export const SEED_INVENTORY_ITEMS = [
  {
    sku: 'PPE-GLV-M',
    name: 'Dental Examination Gloves (Nitrile)',
    category: 'PPE & General',
    unit: 'pairs',
    totalStock: 450,
    reorderLevel: 80,
    costPerUnit: 14.5,
    batches: [
      { batchNumber: 'GLV-2026-B1', expiryDate: '2027-10-30', quantity: 250, location: 'Central Dispensary' },
      { batchNumber: 'GLV-2026-B2', expiryDate: '2028-02-15', quantity: 200, location: 'OPD 1' }
    ]
  },
  {
    sku: 'PPE-MSK-3P',
    name: '3-Ply Surgical Face Masks (Level 3)',
    category: 'PPE & General',
    unit: 'pieces',
    totalStock: 600,
    reorderLevel: 100,
    costPerUnit: 6.0,
    batches: [
      { batchNumber: 'MSK-2026-M1', expiryDate: '2028-11-20', quantity: 600, location: 'Central Dispensary' }
    ]
  },
  {
    sku: 'PPE-BIB-DISP',
    name: 'Patient Disposable Barrier Bibs',
    category: 'PPE & General',
    unit: 'pieces',
    totalStock: 800,
    reorderLevel: 150,
    costPerUnit: 3.5,
    batches: [
      { batchNumber: 'BIB-2026-C4', expiryDate: '2029-01-10', quantity: 800, location: 'Storage Room A' }
    ]
  },
  {
    sku: 'GEN-COT-PEL',
    name: 'Cotton Pellets (#2 Sterile)',
    category: 'PPE & General',
    unit: 'pieces',
    totalStock: 1200,
    reorderLevel: 200,
    costPerUnit: 1.2,
    batches: [
      { batchNumber: 'COT-2026-01', expiryDate: '2029-12-31', quantity: 1200, location: 'Central Dispensary' }
    ]
  },
  {
    sku: 'GEN-COT-ROL',
    name: 'Dental Absorbent Cotton Rolls',
    category: 'PPE & General',
    unit: 'pieces',
    totalStock: 950,
    reorderLevel: 150,
    costPerUnit: 2.0,
    batches: [
      { batchNumber: 'CR-2026-R8', expiryDate: '2029-06-30', quantity: 950, location: 'Central Dispensary' }
    ]
  },
  {
    sku: 'GEN-SUC-TIP',
    name: 'Disposable Saliva Ejector Tips',
    category: 'PPE & General',
    unit: 'pieces',
    totalStock: 500,
    reorderLevel: 100,
    costPerUnit: 4.0,
    batches: [
      { batchNumber: 'SE-2026-T2', expiryDate: '2029-04-15', quantity: 500, location: 'Storage Room B' }
    ]
  },
  {
    sku: 'ENDO-GP-04',
    name: 'Gutta Percha Points (0.04 Taper)',
    category: 'Endodontics',
    unit: 'cones',
    totalStock: 400,
    reorderLevel: 80,
    costPerUnit: 8.5,
    batches: [
      { batchNumber: 'GP-2026-09', expiryDate: '2028-10-12', quantity: 400, location: 'Endo Tray Unit' }
    ]
  },
  {
    sku: 'ENDO-IRR-NAOCL',
    name: 'Sodium Hypochlorite 3% Irrigation Solution',
    category: 'Endodontics',
    unit: 'ml',
    totalStock: 3000,
    reorderLevel: 500,
    costPerUnit: 0.8,
    batches: [
      { batchNumber: 'SH-2026-D4', expiryDate: '2027-08-30', quantity: 3000, location: 'Chemical Cabinet' }
    ]
  },
  {
    sku: 'ENDO-FILE-ROT',
    name: 'Rotary NiTi Endodontic Files',
    category: 'Endodontics',
    unit: 'set',
    totalStock: 75,
    reorderLevel: 15,
    costPerUnit: 950.0,
    batches: [
      { batchNumber: 'DF-2026-X1', expiryDate: '2029-01-01', quantity: 40, location: 'Sterile Endo Rack' },
      { batchNumber: 'DF-2026-X2', expiryDate: '2029-03-15', quantity: 35, location: 'Central Dispensary' }
    ]
  },
  {
    sku: 'REST-COMP-A2',
    name: 'Dental Composite Syringe (Universal A2)',
    category: 'Restorative',
    unit: 'syringes',
    totalStock: 25,
    reorderLevel: 5,
    costPerUnit: 1400.0,
    batches: [
      { batchNumber: 'CP-2026-A2', expiryDate: '2027-11-20', quantity: 25, location: 'Restorative Box' }
    ]
  },
  {
    sku: 'REST-BOND-UNI',
    name: 'Universal Bonding Agent (Single Bottle)',
    category: 'Restorative',
    unit: 'bottles',
    totalStock: 12,
    reorderLevel: 3,
    costPerUnit: 2200.0,
    batches: [
      { batchNumber: 'BD-2026-U1', expiryDate: '2028-05-10', quantity: 12, location: 'Refrigerated Locker' }
    ]
  },
  {
    sku: 'ANESTH-LIGNO-2P',
    name: '2% Lignocaine with Adrenaline (1:80,000)',
    category: 'Anesthetics',
    unit: 'cartridges',
    totalStock: 150,
    reorderLevel: 30,
    costPerUnit: 35.0,
    batches: [
      { batchNumber: 'LA-2026-L2', expiryDate: '2027-09-18', quantity: 150, location: 'Pharma Drawer 1' }
    ]
  },
  {
    sku: 'SURG-SUTURE-SILK',
    name: 'Black Braided Silk Sutures 3-0 (Reverse Cut)',
    category: 'Surgical',
    unit: 'packs',
    totalStock: 50,
    reorderLevel: 10,
    costPerUnit: 85.0,
    batches: [
      { batchNumber: 'SK-2026-S1', expiryDate: '2028-09-15', quantity: 50, location: 'Surgical Sterile Pack' }
    ]
  }
];

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private prisma: PrismaService) {}

  private async ensureSeeded(clinicId: string) {
    const count = await this.prisma.inventoryItem.count({ where: { clinicId } });
    if (count > 0) return;

    this.logger.log(`Seeding initial inventory items for clinic ${clinicId}...`);
    for (const item of SEED_INVENTORY_ITEMS) {
      const createdItem = await this.prisma.inventoryItem.create({
        data: {
          clinicId,
          sku: item.sku,
          name: item.name,
          category: item.category,
          unit: item.unit,
          totalStock: item.totalStock,
          reorderLevel: item.reorderLevel,
          costPerUnit: item.costPerUnit,
        },
      });

      for (const b of item.batches) {
        await this.prisma.inventoryBatch.create({
          data: {
            clinicId,
            itemId: createdItem.id,
            batchNumber: b.batchNumber,
            expiryDate: b.expiryDate,
            quantity: b.quantity,
            location: b.location,
          },
        });
      }
    }
  }

  async getItems(clinicId: string) {
    await this.ensureSeeded(clinicId);

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
          location: dto.location || 'Central Dispensary',
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

