import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller.js';
import { ReportsService } from './reports.service.js';
import { DentalReportsController } from './dental-reports.controller.js';
import { DentalReportsService } from './dental-reports.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [ReportsController, DentalReportsController],
  providers: [ReportsService, DentalReportsService],
  exports: [ReportsService, DentalReportsService],
})
export class ReportsModule {}

