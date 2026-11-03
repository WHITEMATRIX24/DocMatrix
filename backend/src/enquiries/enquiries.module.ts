import { Module } from '@nestjs/common';
import { EnquiriesController } from './enquiries.controller.js';
import { EnquiriesService } from './enquiries.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [EnquiriesController],
  providers: [EnquiriesService],
  exports: [EnquiriesService],
})
export class EnquiriesModule {}
