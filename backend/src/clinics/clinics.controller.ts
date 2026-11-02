import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import { ClinicsService } from './clinics.service.js';
import { UpdateClinicDto } from './dto/update-clinic.dto.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
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
}

