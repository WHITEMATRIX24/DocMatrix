import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service.js';
import { CreateItemDto } from './dto/create-item.dto.js';
import { AddBatchDto } from './dto/add-batch.dto.js';
import { AdjustStockDto } from './dto/adjust-stock.dto.js';
import { ConfirmDeductionDto } from './dto/confirm-deduction.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator.js';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('items')
  async getItems(@CurrentUser() user: AuthenticatedUser) {
    return this.inventoryService.getItems(user.clinicId!);
  }

  @Post('items')
  async createItem(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateItemDto) {
    return this.inventoryService.createItem(user.clinicId!, dto);
  }

  @Patch('items/:id')
  async updateItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.inventoryService.updateItem(user.clinicId!, id, dto);
  }

  @Delete('items/:id')
  async deleteItem(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.inventoryService.deleteItem(user.clinicId!, id);
  }

  @Post('batches')
  async receiveBatch(@CurrentUser() user: AuthenticatedUser, @Body() dto: AddBatchDto) {
    return this.inventoryService.receiveBatch(user.clinicId!, dto);
  }

  @Patch('batches')
  async updateBatch(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: { itemId: string; batchNumber: string; newBatchNumber?: string; expiryDate?: string; quantity?: number },
  ) {
    return this.inventoryService.updateBatch(user.clinicId!, dto);
  }

  @Post('adjust')
  async adjustStock(@CurrentUser() user: AuthenticatedUser, @Body() dto: AdjustStockDto) {
    return this.inventoryService.adjustStock(user.clinicId!, dto);
  }

  @Get('movements')
  async getMovements(@CurrentUser() user: AuthenticatedUser) {
    return this.inventoryService.getAudits(user.clinicId!);
  }

  @Post('deduct')
  async confirmDeduction(@CurrentUser() user: AuthenticatedUser, @Body() dto: ConfirmDeductionDto) {
    return this.inventoryService.confirmDeduction(user.clinicId!, dto);
  }
}


