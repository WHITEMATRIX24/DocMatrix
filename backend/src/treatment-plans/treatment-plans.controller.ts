import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TreatmentPlansService } from './treatment-plans.service.js';
import { CreateTreatmentPlanDto } from './dto/create-treatment-plan.dto.js';
import { UpdateTreatmentPlanDto } from './dto/update-treatment-plan.dto.js';
import { RecordAcceptanceDto } from './dto/record-acceptance.dto.js';
import { RecordRejectionDto } from './dto/record-rejection.dto.js';
import { UpdatePlanStatusDto } from './dto/update-plan-status.dto.js';
import { UpdatePlanItemDto } from './dto/update-plan-item.dto.js';
import { TreatmentPlanQueryDto } from './dto/treatment-plan-query.dto.js';
import { ImportLegacyPlansDto } from './dto/import-legacy-plan.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator.js';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller()
export class TreatmentPlansController {
  constructor(
    @Inject(TreatmentPlansService)
    private readonly treatmentPlansService: TreatmentPlansService,
  ) {}

  @Post('treatment-plans')
  async createTreatmentPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTreatmentPlanDto,
  ) {
    return this.treatmentPlansService.createTreatmentPlan(
      user.clinicId!,
      user,
      dto,
    );
  }

  @Get('treatment-plans')
  async getTreatmentPlans(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: TreatmentPlanQueryDto,
  ) {
    return this.treatmentPlansService.getTreatmentPlans(user.clinicId!, query);
  }

  @Get('treatment-plans/:id')
  async getTreatmentPlanById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.treatmentPlansService.getTreatmentPlanById(user.clinicId!, id);
  }

  @Patch('treatment-plans/:id')
  async updateTreatmentPlan(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTreatmentPlanDto,
  ) {
    return this.treatmentPlansService.updateTreatmentPlan(
      user.clinicId!,
      user,
      id,
      dto,
    );
  }

  @Patch('treatment-plans/:id/status')
  async updatePlanStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdatePlanStatusDto,
  ) {
    return this.treatmentPlansService.updatePlanStatus(
      user.clinicId!,
      user,
      id,
      dto,
    );
  }

  @Post('treatment-plans/:id/accept')
  async recordAcceptance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RecordAcceptanceDto,
  ) {
    return this.treatmentPlansService.recordAcceptance(
      user.clinicId!,
      user,
      id,
      dto,
    );
  }

  @Post('treatment-plans/:id/reject')
  async recordRejection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RecordRejectionDto,
  ) {
    return this.treatmentPlansService.recordRejection(
      user.clinicId!,
      user,
      id,
      dto,
    );
  }

  @Patch('treatment-plans/:id/items/:itemId')
  async updatePlanItemStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdatePlanItemDto,
  ) {
    return this.treatmentPlansService.updatePlanItemStatus(
      user.clinicId!,
      user,
      id,
      itemId,
      dto,
    );
  }

  @Get('patients/:patientId/treatment-plans')
  async getPatientTreatmentPlans(
    @CurrentUser() user: AuthenticatedUser,
    @Param('patientId') patientId: string,
  ) {
    return this.treatmentPlansService.getPatientTreatmentPlans(
      user.clinicId!,
      patientId,
    );
  }

  @Post('treatment-plans/import-legacy')
  async importLegacyPlans(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ImportLegacyPlansDto,
  ) {
    return this.treatmentPlansService.importLegacyPlans(
      user.clinicId!,
      user,
      dto,
    );
  }
}

