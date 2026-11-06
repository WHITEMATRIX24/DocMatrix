import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service.js';
import { CreateItemDto } from './dto/create-item.dto.js';
import { AddBatchDto } from './dto/add-batch.dto.js';
import { AdjustStockDto } from './dto/adjust-stock.dto.js';
import { ConfirmDeductionDto } from './dto/confirm-deduction.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Controller('inventory')
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly prisma: PrismaService,
  ) {}

  private async resolveClinicId(req: any): Promise<string> {
    if (req.user?.clinicId) {
      return req.user.clinicId;
    }
    const defaultClinic = await this.prisma.clinic.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    return defaultClinic?.id || '32278b68-f8a3-4944-ba51-d3caddcc8ac6';
  }

  @Get('items')
  async getItems(@Req() req: any) {
    const clinicId = await this.resolveClinicId(req);
    return this.inventoryService.getItems(clinicId);
  }

  @Post('items')
  async createItem(@Req() req: any, @Body() dto: CreateItemDto) {
    const clinicId = await this.resolveClinicId(req);
    return this.inventoryService.createItem(clinicId, dto);
  }

  @Patch('items/:id')
  async updateItem(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    const clinicId = await this.resolveClinicId(req);
    return this.inventoryService.updateItem(clinicId, id, dto);
  }

  @Delete('items/:id')
  async deleteItem(@Req() req: any, @Param('id') id: string) {
    const clinicId = await this.resolveClinicId(req);
    return this.inventoryService.deleteItem(clinicId, id);
  }

  @Post('batches')
  async receiveBatch(@Req() req: any, @Body() dto: AddBatchDto) {
    const clinicId = await this.resolveClinicId(req);
    return this.inventoryService.receiveBatch(clinicId, dto);
  }

  @Patch('batches')
  async updateBatch(
    @Req() req: any,
    @Body() dto: { itemId: string; batchNumber: string; newBatchNumber?: string; expiryDate?: string; quantity?: number },
  ) {
    const clinicId = await this.resolveClinicId(req);
    return this.inventoryService.updateBatch(clinicId, dto);
  }

  @Post('adjust')
  async adjustStock(@Req() req: any, @Body() dto: AdjustStockDto) {
    const clinicId = await this.resolveClinicId(req);
    return this.inventoryService.adjustStock(clinicId, dto);
  }

  @Get('movements')
  async getMovements(@Req() req: any) {
    const clinicId = await this.resolveClinicId(req);
    return this.inventoryService.getAudits(clinicId);
  }

  @Post('deduct')
  async confirmDeduction(@Req() req: any, @Body() dto: ConfirmDeductionDto) {
    const clinicId = await this.resolveClinicId(req);
    return this.inventoryService.confirmDeduction(clinicId, dto);
  }
}

