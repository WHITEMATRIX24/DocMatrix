import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ClinicStatus, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { AssignSubscriptionDto } from './dto/assign-subscription.dto.js';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  async getCurrentSubscription(clinicId: string) {
    const activeSub = await this.prisma.subscription.findFirst({
      where: {
        clinicId,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
      },
      include: {
        plan: {
          include: {
            features: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!activeSub) {
      return {
        hasActiveSubscription: false,
        subscription: null,
        plan: null,
        features: [],
      };
    }

    return {
      hasActiveSubscription: true,
      subscription: {
        id: activeSub.id,
        status: activeSub.status,
        billingInterval: activeSub.billingInterval,
        lockedPrice: activeSub.lockedPrice,
        currency: activeSub.currency,
        isTrial: activeSub.isTrial,
        currentPeriodStart: activeSub.currentPeriodStart,
        currentPeriodEnd: activeSub.currentPeriodEnd,
        trialEndsAt: activeSub.trialEndsAt,
      },
      plan: {
        id: activeSub.plan.id,
        name: activeSub.plan.name,
        slug: activeSub.plan.slug,
        description: activeSub.plan.description,
        maxUsers: activeSub.plan.maxUsers,
      },
      features: activeSub.plan.features.map((f) => ({
        featureKey: f.featureKey,
        isEnabled: f.isEnabled,
        limitValue: f.limitValue,
      })),
    };
  }

  async getSubscriptionHistory(clinicId: string) {
    return this.prisma.subscription.findMany({
      where: { clinicId },
      include: {
        plan: {
          select: { name: true, slug: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async assignSubscription(dto: AssignSubscriptionDto) {
    const clinic = await this.prisma.clinic.findUnique({ where: { id: dto.clinicId } });
    if (!clinic) {
      throw new NotFoundException(`Clinic '${dto.clinicId}' not found.`);
    }

    const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
    if (!plan || !plan.isActive) {
      throw new NotFoundException(`Plan '${dto.planId}' not found or is no longer active.`);
    }

    const interval = dto.billingInterval || plan.billingInterval;
    const price = dto.lockedPrice !== undefined ? dto.lockedPrice : plan.basePrice;

    const startDate = new Date();
    const endDate = new Date(startDate);
    if (interval === 'ANNUAL') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else if (interval === 'QUARTERLY') {
      endDate.setMonth(endDate.getMonth() + 3);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }

    const isTrial = dto.isTrial ?? false;
    let trialEndsAt: Date | null = null;
    let status: SubscriptionStatus = SubscriptionStatus.ACTIVE;

    if (isTrial) {
      status = SubscriptionStatus.TRIALING;
      const days = dto.trialDays ?? plan.defaultTrialDays ?? 14;
      trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + days);
    }

    // Transaction ensures safe transition and satisfies the partial unique index:
    return this.prisma.$transaction(async (tx) => {
      // 1. Retire any currently active/trialing subscriptions for this clinic
      await tx.subscription.updateMany({
        where: {
          clinicId: dto.clinicId,
          status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
        },
        data: {
          status: SubscriptionStatus.UPGRADED,
          canceledAt: new Date(),
        },
      });

      // 2. Create the new subscription
      const newSub = await tx.subscription.create({
        data: {
          clinicId: dto.clinicId,
          planId: dto.planId,
          status,
          billingInterval: interval,
          lockedPrice: price,
          currency: plan.currency,
          isTrial,
          currentPeriodStart: startDate,
          currentPeriodEnd: endDate,
          trialEndsAt,
        },
        include: {
          plan: {
            include: { features: true },
          },
        },
      });

      // 3. Update clinic status
      await tx.clinic.update({
        where: { id: dto.clinicId },
        data: { status: isTrial ? ClinicStatus.TRIAL : ClinicStatus.ACTIVE },
      });

      return newSub;
    });
  }

  async cancelSubscription(clinicId: string, reason?: string) {
    const activeSub = await this.prisma.subscription.findFirst({
      where: {
        clinicId,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] },
      },
    });

    if (!activeSub) {
      throw new BadRequestException('No active subscription found to cancel.');
    }

    return this.prisma.$transaction(async (tx) => {
      const canceled = await tx.subscription.update({
        where: { id: activeSub.id },
        data: {
          status: SubscriptionStatus.CANCELED,
          canceledAt: new Date(),
          cancellationReason: reason?.trim() || 'Cancelled by practice owner',
        },
      });

      await tx.clinic.update({
        where: { id: clinicId },
        data: { status: ClinicStatus.READ_ONLY },
      });

      return {
        message: 'Subscription has been cancelled. Account moved to read-only mode with all patient records preserved.',
        subscription: canceled,
      };
    });
  }
}

