import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import { SubscriptionsService } from './subscriptions.service.js';
import { AssignSubscriptionDto } from './dto/assign-subscription.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  @UseGuards(TenantGuard)
  @Get('current')
  async getCurrentSubscription(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.getCurrentSubscription(user.clinicId!);
  }

  @UseGuards(TenantGuard)
  @Get('history')
  async getSubscriptionHistory(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.getSubscriptionHistory(user.clinicId!);
  }

  @Roles(StaffRole.ORGANIZATION_ADMIN)
  @Post('assign')
  async assignSubscription(@CurrentUser() user: AuthenticatedUser, @Body() dto: AssignSubscriptionDto) {
    // If not platform admin, enforce that clinicId must match the user's clinic:
    const targetClinicId = user.isPlatformAdmin ? dto.clinicId : user.clinicId!;
    return this.subscriptionsService.assignSubscription({
      ...dto,
      clinicId: targetClinicId,
    });
  }

  @Roles(StaffRole.ORGANIZATION_ADMIN)
  @Post('cancel')
  async cancelSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Body('reason') reason?: string,
  ) {
    return this.subscriptionsService.cancelSubscription(user.clinicId!, reason);
  }
}

