import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DentalReportsService } from './dental-reports.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../common/decorators/current-user.decorator.js';
import {
  GenerateDentalReportDto,
  SaveDentalReportDto,
} from './dto/dental-report.dto.js';
import { RequireOperation } from '../common/decorators/operation-permission.decorator.js';

@Controller('reports/dental')
@UseGuards(JwtAuthGuard, TenantGuard)
export class DentalReportsController {
  constructor(
    @Inject(DentalReportsService)
    private readonly dentalReportsService: DentalReportsService,
  ) {}

  @Get('patient/:patientId')
  @RequireOperation('clinical.read')
  async getPatientData(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
    @Query('consultationId') consultationId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dentalReportsService.getPatientClinicalData(
      user.clinicId!,
      patientId,
      { consultationId, startDate, endDate },
    );
  }

  @Post('generate')
  @RequireOperation('clinical.read')
  async generateReport(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: GenerateDentalReportDto,
  ) {
    return this.dentalReportsService.generateDentalReport(
      user.clinicId!,
      user,
      dto,
    );
  }

  @Post('save')
  @RequireOperation('clinical.write')
  async saveReport(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SaveDentalReportDto,
  ) {
    return this.dentalReportsService.saveDentalReport(
      user.clinicId!,
      user,
      dto,
    );
  }

  @Get('patient/:patientId/saved')
  @RequireOperation('clinical.read')
  async getSavedReports(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
  ) {
    return this.dentalReportsService.getSavedPatientReports(
      user.clinicId!,
      patientId,
    );
  }
}
