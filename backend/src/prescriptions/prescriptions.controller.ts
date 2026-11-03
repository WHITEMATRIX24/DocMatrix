import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service.js';
import { CreatePrescriptionDto } from './dto/create-prescription.dto.js';
import {
  CancelPrescriptionDto,
  UpdatePrescriptionDto,
} from './dto/update-prescription.dto.js';
import { PrescriptionQueryDto } from './dto/prescription-query.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator.js';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller()
export class PrescriptionsController {
  constructor(private readonly prescriptionsService: PrescriptionsService) {}

  @Post('prescriptions')
  async createPrescription(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePrescriptionDto,
  ) {
    return this.prescriptionsService.createPrescription(
      user.clinicId!,
      user,
      dto,
    );
  }

  @Get('prescriptions')
  async getPrescriptions(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PrescriptionQueryDto,
  ) {
    return this.prescriptionsService.getPrescriptions(user.clinicId!, query);
  }

  @Get('prescriptions/:id')
  async getPrescriptionById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.prescriptionsService.getPrescriptionById(user.clinicId!, id);
  }

  @Patch('prescriptions/:id')
  async updatePrescription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdatePrescriptionDto,
  ) {
    return this.prescriptionsService.updatePrescription(
      user.clinicId!,
      user,
      id,
      dto,
    );
  }

  @Post('prescriptions/:id/finalize')
  async finalizePrescription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.prescriptionsService.finalizePrescription(
      user.clinicId!,
      user,
      id,
    );
  }

  @Post('prescriptions/:id/cancel')
  async cancelPrescription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelPrescriptionDto,
  ) {
    return this.prescriptionsService.cancelPrescription(
      user.clinicId!,
      user,
      id,
      dto,
    );
  }

  @Get('patients/:id/prescriptions')
  async getPatientPrescriptions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') patientId: string,
  ) {
    return this.prescriptionsService.getPatientPrescriptions(
      user.clinicId!,
      patientId,
    );
  }
}

