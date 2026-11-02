import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePlanDto, PlanFeatureInputDto } from './dto/create-plan.dto.js';
import { UpdatePlanDto } from './dto/update-plan.dto.js';

@Injectable()
export class PlansService {
  constructor(private prisma: PrismaService) {}

  async listPlans(includeInactive = false) {
    return this.prisma.plan.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        features: {
          select: { id: true, featureKey: true, isEnabled: true, limitValue: true },
        },
      },
      orderBy: { basePrice: 'asc' },
    });
  }

  async getPlan(idOrSlug: string) {
    const plan = await this.prisma.plan.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        features: true,
      },
    });

    if (!plan) {
      throw new NotFoundException(`Plan '${idOrSlug}' not found.`);
    }

    return plan;
  }

  async createPlan(dto: CreatePlanDto) {
    const slug = dto.slug.toLowerCase().trim();
    const existing = await this.prisma.plan.findUnique({ where: { slug } });
    if (existing) {
      throw new ConflictException(`A plan with slug '${slug}' already exists.`);
    }

    return this.prisma.plan.create({
      data: {
        name: dto.name.trim(),
        slug,
        description: dto.description?.trim() || null,
        basePrice: dto.basePrice,
        currency: dto.currency || 'INR',
        billingInterval: dto.billingInterval || 'MONTHLY',
        defaultTrialDays: dto.defaultTrialDays ?? null,
        maxUsers: dto.maxUsers ?? null,
        features: dto.features && dto.features.length > 0 ? {
          create: dto.features.map((f) => ({
            featureKey: f.featureKey.trim(),
            isEnabled: f.isEnabled ?? true,
            limitValue: f.limitValue ?? null,
          })),
        } : undefined,
      },
      include: {
        features: true,
      },
    });
  }

  async updatePlan(id: string, dto: UpdatePlanDto) {
    await this.getPlan(id);

    return this.prisma.plan.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
        ...(dto.basePrice !== undefined && { basePrice: dto.basePrice }),
        ...(dto.currency && { currency: dto.currency }),
        ...(dto.billingInterval && { billingInterval: dto.billingInterval }),
        ...(dto.defaultTrialDays !== undefined && { defaultTrialDays: dto.defaultTrialDays }),
        ...(dto.maxUsers !== undefined && { maxUsers: dto.maxUsers }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: {
        features: true,
      },
    });
  }

  async addOrUpdateFeature(planId: string, feature: PlanFeatureInputDto) {
    await this.getPlan(planId);

    return this.prisma.planFeature.upsert({
      where: {
        planId_featureKey: {
          planId,
          featureKey: feature.featureKey.trim(),
        },
      },
      create: {
        planId,
        featureKey: feature.featureKey.trim(),
        isEnabled: feature.isEnabled ?? true,
        limitValue: feature.limitValue ?? null,
      },
      update: {
        isEnabled: feature.isEnabled ?? true,
        limitValue: feature.limitValue ?? null,
      },
    });
  }
}

