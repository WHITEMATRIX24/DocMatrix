import { Module } from '@nestjs/common';
import { TreatmentPlansController } from './treatment-plans.controller.js';
import { TreatmentPlansService } from './treatment-plans.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [TreatmentPlansController],
  providers: [TreatmentPlansService],
  exports: [TreatmentPlansService],
})
export class TreatmentPlansModule {}

