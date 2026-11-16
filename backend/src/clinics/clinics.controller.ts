import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
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
  constructor(private clinicsService: ClinicsService) {}

  @Get('my-clinic')
  async getMyClinic(@CurrentUser() user: AuthenticatedUser) {
    return this.clinicsService.getClinic(user.clinicId!);
  }

  @Roles(StaffRole.ORGANIZATION_ADMIN, StaffRole.BRANCH_ADMIN)
  @Patch('my-clinic')
  async updateMyClinic(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateClinicDto) {
    return this.clinicsService.updateClinic(user.clinicId!, dto);
  }

  @Get('my-clinic/staff')
  async getMyClinicStaff(@CurrentUser() user: AuthenticatedUser) {
    return this.clinicsService.getClinicStaff(user.clinicId!);
  }

  @Roles(StaffRole.ORGANIZATION_ADMIN, StaffRole.BRANCH_ADMIN)
  @Post('my-clinic/staff')
  async addStaff(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateStaffDto) {
    return this.clinicsService.addStaff(user.clinicId!, dto);
  }

  @Roles(StaffRole.ORGANIZATION_ADMIN, StaffRole.BRANCH_ADMIN)
  @Patch('my-clinic/staff/:id')
  async updateStaff(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.clinicsService.updateStaff(user.clinicId!, id, dto);
  }

  @Roles(StaffRole.ORGANIZATION_ADMIN, StaffRole.BRANCH_ADMIN)
  @Delete('my-clinic/staff/:id')
  async deleteStaff(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.clinicsService.deleteStaff(user.clinicId!, id);
  }

  @Get('my-clinic/clinical-config')
  async getClinicalConfig(@CurrentUser() user: AuthenticatedUser) {
    return this.clinicsService.getClinicalConfig(user.clinicId!);
  }

  @Roles(StaffRole.ORGANIZATION_ADMIN, StaffRole.BRANCH_ADMIN)
  @Put('my-clinic/clinical-config')
  async updateClinicalConfig(@CurrentUser() user: AuthenticatedUser, @Body() config: any) {
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
