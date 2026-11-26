import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class PlatformAdminService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async setClinicStatus(id: string, status: 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'READ_ONLY' | 'CLOSED', reason: string, actor: { id: string; fullName: string; role: string }) {
    if (reason.trim().length < 5) throw new BadRequestException('Record a meaningful reason.');
    return this.prisma.$transaction(async tx => {
      const clinic = await tx.clinic.findUnique({ where: { id } });
      if (!clinic) throw new NotFoundException('Clinic not found.');
      const updated = await tx.clinic.update({ where: { id }, data: { status }, select: { id: true, name: true, status: true } });
      if (['SUSPENDED', 'CLOSED'].includes(status)) await tx.userSession.updateMany({ where: { clinicId: id, isRevoked: false }, data: { isRevoked: true, revocationReason: 'Clinic access changed' } });
      await tx.auditEvent.create({ data: { id: crypto.randomUUID(), clinicId: id, module: 'Security', action: 'CLINIC_STATUS_CHANGED', actorId: actor.id, actorName: actor.fullName, actorRole: actor.role, description: reason.trim(), severity: 'warn', outcome: 'SUCCESS', metadata: { previousStatus: clinic.status, status } } });
      return updated;
    });
  }

  async verifyPractitioner(id: string, verified: boolean, registration: string | undefined, reason: string, actor: { id: string; fullName: string; role: string }) {
    if (reason.trim().length < 5) throw new BadRequestException('Record a meaningful reason.');
    if (verified && !registration?.trim()) throw new BadRequestException('A verified practitioner registration is required.');
    return this.prisma.$transaction(async tx => {
      const owner = await tx.user.findUnique({ where: { id } });
      if (!owner || owner.isPlatformAdmin || !owner.isActive || !owner.clinicId || owner.role !== 'ORGANIZATION_ADMIN' || !owner.isPrimaryContact) throw new BadRequestException('Only an active clinic primary owner can receive this capability.');
      const updated = await tx.user.update({ where: { id }, data: { practitionerVerifiedAt: verified ? new Date() : null, practitionerRegistration: verified ? registration!.trim() : null }, select: { id: true, practitionerVerifiedAt: true, practitionerRegistration: true } });
      await tx.userSession.updateMany({ where: { userId: id, isRevoked: false }, data: { isRevoked: true, revocationReason: 'Practitioner verification changed' } });
      await tx.auditEvent.create({ data: { id: crypto.randomUUID(), clinicId: owner.clinicId, module: 'Security', action: verified ? 'PRACTITIONER_VERIFIED' : 'PRACTITIONER_REVOKED', actorId: actor.id, actorName: actor.fullName, actorRole: actor.role, description: reason.trim(), severity: 'warn', outcome: 'SUCCESS', metadata: { userId: id, registration: updated.practitionerRegistration } } });
      return updated;
    });
  }

  async getSummary() {
    const [clinics, activeClinics, clinicUsers, activeSubscriptions] = await Promise.all([
      this.prisma.clinic.count(),
      this.prisma.clinic.count({ where: { status: 'ACTIVE' } }),
      this.prisma.user.count({ where: { clinicId: { not: null } } }),
      this.prisma.subscription.count({ where: { status: { in: ['ACTIVE', 'TRIALING'] } } }),
    ]);
    return { clinics, activeClinics, clinicUsers, activeSubscriptions };
  }

  async getOverview() {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const previousStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const months = Array.from({ length: 6 }, (_, i) => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + i, 1)));
    const [admins, newThisMonth, newLastMonth, newToday, recentClinics, regions, subscriptions, activity] = await Promise.all([
      this.prisma.user.count({ where: { isPlatformAdmin: true, isActive: true } }),
      this.prisma.clinic.count({ where: { createdAt: { gte: monthStart, lte: now } } }),
      this.prisma.clinic.count({ where: { createdAt: { gte: previousStart, lt: monthStart } } }),
      this.prisma.clinic.count({ where: { createdAt: { gte: today, lte: now } } }),
      this.prisma.clinic.findMany({ take: 12, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], select: {
        id: true, name: true, status: true, city: true, state: true, country: true, createdAt: true,
        _count: { select: { users: true } },
        subscriptions: { take: 1, orderBy: { createdAt: 'desc' }, select: { status: true, plan: { select: { name: true } } } },
      } }),
      this.prisma.clinic.groupBy({ by: ['state', 'country'], _count: { _all: true }, orderBy: { _count: { state: 'desc' } }, take: 12 }),
      this.prisma.subscription.groupBy({ by: ['currency', 'billingInterval'], where: { status: 'ACTIVE', isTrial: false }, _sum: { lockedPrice: true }, _count: { _all: true } }),
      Promise.all(months.map(async (start, i) => ({
        month: start.toISOString(),
        clinics: await this.prisma.clinic.count({ where: { createdAt: { gte: start, lt: i === 5 ? now : months[i + 1] } } }),
      }))),
    ]);
    return {
      admins, newThisMonth, newLastMonth, newToday,
      growthPercent: newLastMonth ? Math.round((newThisMonth - newLastMonth) / newLastMonth * 100) : null,
      recentClinics, regions: regions.map(r => ({ state: r.state || 'Unspecified', country: r.country, clinics: r._count._all })),
      monthlyPlanValue: subscriptions.filter(s => s.currency === 'INR').reduce((sum, s) => sum + Number(s._sum.lockedPrice || 0) / (s.billingInterval === 'ANNUAL' ? 12 : s.billingInterval === 'QUARTERLY' ? 3 : 1), 0),
      activity,
    };
  }

  async getDirectory(kind: 'clinics' | 'subscriptions' | 'users', page: number, search: string, status?: string) {
    const skip = (page - 1) * 20;
    if (kind === 'clinics') {
      const where = { ...(status ? { status: status as any } : {}), ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}) };
      const [items, total] = await Promise.all([
        this.prisma.clinic.findMany({ where, skip, take: 20, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], select: { id: true, name: true, status: true, city: true, state: true, country: true, createdAt: true, _count: { select: { users: true } }, subscriptions: { take: 1, orderBy: { createdAt: 'desc' }, select: { status: true, plan: { select: { name: true } } } } } }),
        this.prisma.clinic.count({ where }),
      ]);
      return { items, total, page };
    }
    if (kind === 'users') {
      const where = search ? { fullName: { contains: search, mode: 'insensitive' as const } } : {};
      const [items, total] = await Promise.all([
        this.prisma.user.findMany({ where, skip, take: 20, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], select: { id: true, fullName: true, role: true, isActive: true, isPlatformAdmin: true, isPrimaryContact: true, practitionerVerifiedAt: true, practitionerRegistration: true, clinic: { select: { name: true } } } }),
        this.prisma.user.count({ where }),
      ]);
      return { items, total, page };
    }
    const where = search ? { clinic: { name: { contains: search, mode: 'insensitive' as const } } } : {};
    const [items, total] = await Promise.all([
      this.prisma.subscription.findMany({ where, skip, take: 20, orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], select: { id: true, status: true, currency: true, lockedPrice: true, billingInterval: true, currentPeriodEnd: true, clinic: { select: { name: true } }, plan: { select: { name: true } } } }),
      this.prisma.subscription.count({ where }),
    ]);
    return { items, total, page };
  }
}
