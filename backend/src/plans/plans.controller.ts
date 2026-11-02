import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { PlansService } from './plans.service.js';
import { CreatePlanDto, PlanFeatureInputDto } from './dto/create-plan.dto.js';
import { UpdatePlanDto } from './dto/update-plan.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { PlatformAdminOnly } from '../common/decorators/platform-admin.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('plans')
export class PlansController {
  constructor(private plansService: PlansService) {}

  @Public()
  @Get()
  async listPlans(@Query('all') all?: string) {
    const includeInactive = all === 'true';
    return this.plansService.listPlans(includeInactive);
  }

  @Public()
  @Get(':idOrSlug')
  async getPlan(@Param('idOrSlug') idOrSlug: string) {
    return this.plansService.getPlan(idOrSlug);
  }

  @PlatformAdminOnly()
  @Post()
  async createPlan(@Body() dto: CreatePlanDto) {
    return this.plansService.createPlan(dto);
  }

  @PlatformAdminOnly()
  @Patch(':id')
  async updatePlan(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.plansService.updatePlan(id, dto);
  }

  @PlatformAdminOnly()
  @Post(':id/features')
  async addOrUpdateFeature(@Param('id') id: string, @Body() dto: PlanFeatureInputDto) {
    return this.plansService.addOrUpdateFeature(id, dto);
  }
}

