import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller.js';
import { BillingService } from './billing.service.js';
import { BillingCalculationService } from './billing-calculation.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { BillingPermissionGuard } from './guards/billing-permission.guard.js';

@Module({
  imports: [PrismaModule],
  controllers: [BillingController],
  providers: [BillingService, BillingCalculationService, BillingPermissionGuard],
  exports: [BillingService, BillingCalculationService, BillingPermissionGuard],
})
export class BillingModule {}

