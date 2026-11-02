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

  @Get()
  async listPatients(@CurrentUser() user: AuthenticatedUser, @Query() query: PatientQueryDto) {
    return this.patientsService.listPatients(user.clinicId!, query);
  }

  @Get(':id')
  async getPatient(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.patientsService.getPatient(user.clinicId!, id);
  }

  @Post()
  async createPatient(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePatientDto) {
    return this.patientsService.createPatient(user.clinicId!, dto);
  }

  @Patch(':id')
  async updatePatient(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patientsService.updatePatient(user.clinicId!, id, dto);
  }

  @Delete(':id')
  async archivePatient(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.patientsService.archivePatient(user.clinicId!, id);
  }
}

