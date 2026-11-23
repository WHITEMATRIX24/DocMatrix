import { ClinicExportService } from './clinic-export.service.js';
import { ClinicalConfigDto } from './dto/clinical-config.dto.js';
import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Put, Query, UseGuards, Optional, Header } from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import { ClinicsService } from './clinics.service.js';
import { UpdateClinicDto } from './dto/update-clinic.dto.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { UpdateStaffDto } from './dto/update-staff.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator.js';

@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@Controller('clinics')
export class ClinicsController {
  constructor(@Inject(ClinicsService) private clinicsService: ClinicsService, @Optional() @Inject(ClinicExportService) private readonly exporter?: ClinicExportService) {}

  @Roles(StaffRole.ORGANIZATION_ADMIN, StaffRole.BRANCH_ADMIN)
  @Get('my-clinic/export')
  @Header('Cache-Control', 'no-store')
  exportRecords(@CurrentUser() user: AuthenticatedUser, @Query('patientId') patientId?: string) {
    return this.exporter!.export(user.clinicId!, patientId, user);
  }

  @Get('my-clinic')
  async getMyClinic(@CurrentUser() user: AuthenticatedUser) {
    return this.clinicsService.getClinic(user.clinicId!);
  }

  @Roles(StaffRole.ORGANIZATION_ADMIN, StaffRole.BRANCH_ADMIN)
  @Patch('my-clinic')
  async updateMyClinic(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateClinicDto) {
    return this.clinicsService.updateClinic(user.clinicId!, dto);
  }

  @Get('my-clinic/practitioners')
  getClinicPractitioners(@CurrentUser() user: AuthenticatedUser) {
    return this.clinicsService.getClinicPractitioners(user.clinicId!);
  }

  @Roles(StaffRole.ORGANIZATION_ADMIN, StaffRole.BRANCH_ADMIN)
  @Get('my-clinic/staff')
  async getMyClinicStaff(@CurrentUser() user: AuthenticatedUser) {
    return this.clinicsService.getClinicStaff(user.clinicId!);
  }

  @Roles(StaffRole.ORGANIZATION_ADMIN, StaffRole.BRANCH_ADMIN)
  @Get('my-clinic/staff/roles')
  getAssignableStaffRoles(@CurrentUser() user: AuthenticatedUser) {
    return this.clinicsService.getAssignableStaffRoles(user.clinicId!, user);
  }

  @Roles(StaffRole.ORGANIZATION_ADMIN, StaffRole.BRANCH_ADMIN)
  @Post('my-clinic/staff')
  async addStaff(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateStaffDto) {
    return this.clinicsService.addStaff(user.clinicId!, dto, user);
  }

  @Roles(StaffRole.ORGANIZATION_ADMIN, StaffRole.BRANCH_ADMIN)
  @Patch('my-clinic/staff/:id')
  async updateStaff(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.clinicsService.updateStaff(user.clinicId!, id, dto, user);
  }

  @Roles(StaffRole.ORGANIZATION_ADMIN, StaffRole.BRANCH_ADMIN)
  @Delete('my-clinic/staff/:id')
  async deleteStaff(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.clinicsService.deleteStaff(user.clinicId!, id, user);
  }

  @Get('my-clinic/clinical-config')
  async getClinicalConfig(@CurrentUser() user: AuthenticatedUser) {
    return this.clinicsService.getClinicalConfig(user.clinicId!);
  }

  @Roles(StaffRole.ORGANIZATION_ADMIN, StaffRole.BRANCH_ADMIN)
  @Put('my-clinic/clinical-config')
  async updateClinicalConfig(@CurrentUser() user: AuthenticatedUser, @Body() config: ClinicalConfigDto) {
    return this.clinicsService.updateClinicalConfig(user.clinicId!, config);
  }

  @Roles(StaffRole.ORGANIZATION_ADMIN, StaffRole.BRANCH_ADMIN)
  @Get('my-clinic/activity-log')
  async getActivityLog(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.clinicsService.getActivityLog(user.clinicId!, isNaN(parsedLimit) ? 50 : parsedLimit);
  }
}
