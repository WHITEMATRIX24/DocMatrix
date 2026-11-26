import { ClinicExportService } from './clinic-export.service.js';
import { StorageModule } from '../storage/storage.module.js';
import { Module } from '@nestjs/common';
import { ClinicsService } from './clinics.service.js';
import { ClinicsController } from './clinics.controller.js';

@Module({
  imports: [StorageModule],
  controllers: [ClinicsController],
  providers: [ClinicsService, ClinicExportService],
  exports: [ClinicsService],
})
export class ClinicsModule {}

