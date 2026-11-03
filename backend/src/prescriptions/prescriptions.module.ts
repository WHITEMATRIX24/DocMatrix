import { Module } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service.js';
import { PrescriptionsController } from './prescriptions.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService],
  exports: [PrescriptionsService],
})
export class PrescriptionsModule {}

