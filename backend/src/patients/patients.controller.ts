import { LegalHoldDto } from './dto/legal-hold.dto.js';
import { canPerform } from '../common/decorators/operation-permission.decorator.js';
import { RequireOperation } from '../common/decorators/operation-permission.decorator.js';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PatientsService } from './patients.service.js';
import { CreatePatientDto } from './dto/create-patient.dto.js';
import { UpdatePatientDto } from './dto/update-patient.dto.js';
import { PatientQueryDto } from './dto/patient-query.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator.js';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('patients')
export class PatientsController {
  constructor(private patientsService: PatientsService) {}

  private patientView(user: AuthenticatedUser, value: any): any {
    if (Array.isArray(value)) return value.map(item => this.patientView(user, item));
    if (!value || canPerform(user, 'clinical.read')) return value;
    const { medicalSafetyAlerts, appointments: _appointments, ...demographics } = value;
    return canPerform(user, 'patient.write') ? { ...demographics, medicalSafetyAlerts } : demographics;
  }

  @Get()
  @RequireOperation('patient.read')
  async listPatients(@CurrentUser() user: AuthenticatedUser, @Query() query: PatientQueryDto) {
    return this.patientView(user, await this.patientsService.listPatients(user.clinicId!, query));
  }

  @Get(':id')
  @RequireOperation('patient.read')
  async getPatient(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.patientView(user, await this.patientsService.getPatient(user.clinicId!, id));
  }

  @Post()
  @RequireOperation('patient.write')
  async createPatient(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePatientDto) {
    return this.patientView(user, await this.patientsService.createPatient(user.clinicId!, dto));
  }

  @Patch(':id')
  @RequireOperation('patient.write')
  async updatePatient(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patientView(user, await this.patientsService.updatePatient(user.clinicId!, id, dto));
  }

  @Patch(':id/legal-hold')
  @RequireOperation('patient.archive')
  async legalHold(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: LegalHoldDto) {
    await this.patientsService.getPatient(user.clinicId!, id);
    return this.patientsService.setLegalHold(user.clinicId!, id, dto.legalHold);
  }

  @Delete(':id')
  @RequireOperation('patient.archive')
  async archivePatient(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.patientsService.archivePatient(user.clinicId!, id);
  }
}

