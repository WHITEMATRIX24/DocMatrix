import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { ReportQueryDto } from './dto/report-query.dto.js';
import {
  AppointmentStatus,
  InvoicePaymentType,
  InvoiceStatus,
  PaymentMode,
  TreatmentPlanStatus,
} from '@prisma/client';

export interface DateSpan {
  from: string;
  to: string;
}

interface ClinicDataset {
  clinic: { id: string; name: string } | null;
  patients: any[];
  appointments: any[];
  invoices: any[];
  treatmentPlans: any[];
  tariffs: any[];
  doctors: any[];
  contactAuditLogs: any[];
}

const DEFAULT_TREATMENT_CATEGORIES: Record<string, string> = {
  'comprehensive dental examination': 'Preventive',
  'ultrasonic scaling & polishing': 'Preventive',
  'composite dental restoration (filling)': 'Restorative',
  'root canal treatment (single sitting)': 'Endodontics',
  'crown & bridge preparation': 'Prosthodontics',
  'tooth extraction (simple)': 'Oral Surgery',
  'surgical wisdom tooth removal': 'Oral Surgery',
  'orthodontic bracket adjustment': 'Orthodontics',
  'clear aligner scan & assessment': 'Orthodontics',
  'laser teeth whitening': 'Cosmetic',
  'pediatric fluoride & sealant': 'Pediatric',
  'emergency pain relief consultation': 'Emergency',
};

const RECALL_DAYS = 180;
const CONTACT_COOLDOWN_DAYS = 14;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private round2(val: number): number {
    return Math.round((val + Number.EPSILON) * 100) / 100;
  }

  private percent(part: number, whole: number): number {
    return whole > 0 ? Math.round((part / whole) * 100) : 0;
  }

  private localDate(isoOrDate?: string | Date | null): string {
    const d = isoOrDate ? new Date(isoOrDate) : new Date();
    const copy = new Date(d.getTime());
    copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
    return copy.toISOString().slice(0, 10);
  }

  private apptDate(a: any): string | Date | null | undefined {
    return a?.date ?? a?.startTime;
  }

  private shiftDays(dateStr: string, delta: number): string {
    const d = new Date(`${dateStr}T00:00:00`);
    d.setDate(d.getDate() + delta);
    return this.localDate(d);
  }

  private daysInSpan(span: DateSpan): number {
    const a = new Date(`${span.from}T00:00:00`).getTime();
    const b = new Date(`${span.to}T00:00:00`).getTime();
    return Math.max(1, Math.round((b - a) / 86400000) + 1);
  }

  private daysSince(dateStr: string, todayStr: string): number {
    return Math.max(
      0,
      Math.round(
        (new Date(`${todayStr}T00:00:00`).getTime() -
          new Date(`${dateStr}T00:00:00`).getTime()) /
          86400000,
      ),
    );
  }

  private inSpan(
    value: string | Date | null | undefined,
    span: DateSpan,
  ): boolean {
    if (!value) return false;
    const day =
      typeof value === 'string' && value.length === 10
        ? value
        : this.localDate(value);
    return day >= span.from && day <= span.to;
  }

  canUserSeeMoney(user?: AuthenticatedUser): boolean {
    if (!user) return true;
    if (user.isPlatformAdmin || user.isPrimaryContact) return true;
    const role = (user.role || '').toUpperCase();
    if (role === 'RECEPTIONIST' || role === 'ASSISTANT') return false;
    return true;
  }

  resolveDateSpan(
    query: ReportQueryDto,
    todayOverride?: string,
  ): { span: DateSpan; prevSpan: DateSpan; days: number } {
    const today = todayOverride || this.localDate();
    let span: DateSpan;

    if (query.fromDate && query.toDate) {
      span =
        query.fromDate <= query.toDate
          ? { from: query.fromDate, to: query.toDate }
          : { from: query.toDate, to: query.fromDate };
    } else {
      switch (query.range) {
        case 'today':
          span = { from: today, to: today };
          break;
        case '7d':
          span = { from: this.shiftDays(today, -6), to: today };
          break;
        case '90d':
          span = { from: this.shiftDays(today, -89), to: today };
          break;
        case 'year':
          span = { from: `${today.slice(0, 4)}-01-01`, to: today };
          break;
        case 'month':
        default:
          span = { from: `${today.slice(0, 7)}-01`, to: today };
          break;
      }
    }

    const days = this.daysInSpan(span);
    const prevTo = this.shiftDays(span.from, -1);
    const prevSpan: DateSpan = {
      from: this.shiftDays(prevTo, -(days - 1)),
      to: prevTo,
    };

    return { span, prevSpan, days };
  }

  private mapPaymentModeLabel(mode: PaymentMode | string): string {
    switch (mode) {
      case PaymentMode.CASH:
      case 'Cash':
        return 'Cash';
      case PaymentMode.CARD:
      case 'Card':
        return 'Card';
      case PaymentMode.NET_BANKING:
      case 'Net Banking':
        return 'Net Banking';
      case PaymentMode.CHEQUE:
      case 'Cheque':
        return 'Cheque';
      case PaymentMode.UPI:
      case 'UPI':
      default:
        return 'UPI';
    }
  }

  private mapPlanStatusLabel(status: TreatmentPlanStatus | string): string {
    switch (status) {
      case TreatmentPlanStatus.PROPOSED:
        return 'Proposed';
      case TreatmentPlanStatus.ACCEPTED:
        return 'Accepted';
      case TreatmentPlanStatus.IN_PROGRESS:
        return 'In Progress';
      case TreatmentPlanStatus.COMPLETED:
        return 'Completed';
      case TreatmentPlanStatus.REJECTED:
        return 'Rejected';
      case TreatmentPlanStatus.CANCELLED:
        return 'Cancelled';
      default:
        return String(status);
    }
  }

  private mapApptStatusLabel(status: AppointmentStatus | string): string {
    switch (status) {
      case AppointmentStatus.SCHEDULED:
        return 'scheduled';
      case AppointmentStatus.CONFIRMED:
        return 'confirmed';
      case AppointmentStatus.CHECKED_IN:
        return 'checked-in';
      case AppointmentStatus.IN_PROGRESS:
        return 'in-progress';
      case AppointmentStatus.COMPLETED:
        return 'completed';
      case AppointmentStatus.CANCELLED:
        return 'cancelled';
      case AppointmentStatus.NO_SHOW:
        return 'no-show';
      default:
        return String(status).toLowerCase();
    }
  }

  private async loadContactAuditLogs(clinicId: string): Promise<any[]> {
    const prismaAny = this.prisma as any;
    if (prismaAny.auditLog?.findMany) {
      return prismaAny.auditLog.findMany({
        where: { clinicId, entityType: 'PATIENT_FOLLOW_UP' },
        orderBy: { createdAt: 'asc' },
      });
    }
    if (this.prisma.enquiry?.findMany) {
      const enquiries = await this.prisma.enquiry.findMany({
        where: {
          clinicId,
          request: { startsWith: 'FOLLOW_UP_CONTACT:' },
        },
        orderBy: { createdAt: 'asc' },
      });
      return enquiries.map((e) => {
        const entityId = e.request.replace('FOLLOW_UP_CONTACT:', '');
        let metadata: any = {};
        try {
          if (e.notes) metadata = JSON.parse(e.notes);
        } catch {}
        return {
          id: e.id,
          clinicId: e.clinicId,
          action: e.status === 'DISMISSED' ? 'UNCONTACTED' : 'CONTACTED',
          entityType: 'PATIENT_FOLLOW_UP',
          entityId,
          metadata,
          createdAt: e.createdAt,
        };
      });
    }
    return [];
  }

  private async loadClinicDataset(clinicId: string): Promise<ClinicDataset> {
    const [
      clinic,
      patients,
      appointments,
      invoices,
      treatmentPlans,
      tariffs,
      doctors,
      contactAuditLogs,
    ] = await Promise.all([
      this.prisma.clinic.findUnique({
        where: { id: clinicId },
        select: { id: true, name: true },
      }),
      this.prisma.patient.findMany({
        where: { clinicId, isActive: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.appointment.findMany({
        where: { clinicId },
        include: {
          doctor: { select: { id: true, fullName: true } },
          patient: {
            select: {
              id: true,
              patientCode: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { startTime: 'desc' },
      }),
      this.prisma.invoice.findMany({
        where: { clinicId, status: { not: InvoiceStatus.VOID } },
        include: {
          items: true,
          payments: { orderBy: { receivedAt: 'desc' } },
          patient: {
            select: {
              id: true,
              patientCode: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.treatmentPlan.findMany({
        where: { clinicId },
        include: {
          doctor: { select: { id: true, fullName: true } },
          patient: {
            select: {
              id: true,
              patientCode: true,
              firstName: true,
              lastName: true,
            },
          },
          stages: {
            include: { items: true },
            orderBy: { stageNumber: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.serviceTariff.findMany({
        where: { clinicId },
      }),
      this.prisma.user.findMany({
        where: { clinicId, role: 'DOCTOR', isActive: true },
        select: { id: true, fullName: true, email: true, role: true },
      }),
      this.loadContactAuditLogs(clinicId),
    ]);

    return {
      clinic,
      patients,
      appointments,
      invoices,
      treatmentPlans,
      tariffs,
      doctors,
      contactAuditLogs,
    };
  }

  private computePeriodMetrics(dataset: ClinicDataset, span: DateSpan) {
    const periodInvoices = dataset.invoices.filter(
      (inv: any) =>
        inv.status !== InvoiceStatus.VOID &&
        inv.status !== InvoiceStatus.DRAFT &&
        this.inSpan(inv.issuedAt || inv.createdAt, span),
    );

    const allPayments: Array<{
      id: string;
      invoiceId: string;
      patientId: string;
      amount: number;
      mode: string;
      receivedAt: Date;
    }> = [];

    for (const inv of dataset.invoices) {
      if (inv.status === InvoiceStatus.VOID) continue;
      if (Array.isArray(inv.payments) && inv.payments.length > 0) {
        for (const p of inv.payments) {
          const sign = p.type === InvoicePaymentType.REFUND ? -1 : 1;
          allPayments.push({
            id: p.id,
            invoiceId: inv.invoiceNumber || inv.id,
            patientId: inv.patient?.patientCode || inv.patientId,
            amount: sign * Number(p.amount || 0),
            mode: this.mapPaymentModeLabel(p.mode),
            receivedAt: p.receivedAt,
          });
        }
      } else if (inv.status === InvoiceStatus.PAID) {
        allPayments.push({
          id: `PAY-${inv.id}`,
          invoiceId: inv.invoiceNumber || inv.id,
          patientId: inv.patient?.patientCode || inv.patientId,
          amount: Number(inv.totalAmount || 0),
          mode: 'Cash',
          receivedAt: inv.issuedAt || inv.createdAt,
        });
      }
    }

    const periodPayments = allPayments.filter((p) =>
      this.inSpan(p.receivedAt, span),
    );

    const collected = this.round2(
      Math.max(
        0,
        periodPayments.reduce((s, p) => s + p.amount, 0),
      ),
    );
    const billed = this.round2(
      periodInvoices.reduce(
        (s: number, inv: any) => s + Number(inv.totalAmount || 0),
        0,
      ),
    );
    const unpaid = this.round2(
      periodInvoices.reduce(
        (s: number, inv: any) => s + Number(inv.balance || 0),
        0,
      ),
    );
    const averageBill = periodInvoices.length
      ? this.round2(billed / periodInvoices.length)
      : 0;
    const paidInvoicesCount = periodInvoices.filter(
      (inv: any) =>
        Number(inv.balance || 0) <= 0 && Number(inv.totalAmount || 0) > 0,
    ).length;

    const byMode: Record<string, number> = {
      Cash: 0,
      UPI: 0,
      Card: 0,
      'Net Banking': 0,
      Cheque: 0,
    };
    for (const p of periodPayments) {
      byMode[p.mode] = this.round2((byMode[p.mode] || 0) + p.amount);
    }

    const visits = dataset.appointments.filter((a: any) =>
      this.inSpan(this.apptDate(a), span),
    );
    const completed = visits.filter(
      (a: any) => this.mapApptStatusLabel(a.status) === 'completed',
    );
    const cancelled = visits.filter(
      (a: any) => this.mapApptStatusLabel(a.status) === 'cancelled',
    ).length;
    const noShows = visits.filter(
      (a: any) => this.mapApptStatusLabel(a.status) === 'no-show',
    ).length;
    const withOutcome = completed.length + cancelled + noShows;
    const stillOpen = Math.max(0, visits.length - withOutcome);

    const treatedIds = [
      ...new Set(completed.map((a: any) => a.patientId as string)),
    ];
    const newPatients = treatedIds.filter(
      (pid) =>
        !dataset.appointments.some(
          (a: any) =>
            a.patientId === pid &&
            this.mapApptStatusLabel(a.status) === 'completed' &&
            this.localDate(this.apptDate(a)) < span.from,
        ),
    ).length;

    const plans = dataset.treatmentPlans.filter((p: any) =>
      this.inSpan(p.createdAt, span),
    );
    const finishedPlans = plans.filter(
      (p: any) => p.status === TreatmentPlanStatus.COMPLETED,
    );
    const acceptedPlans = plans.filter((p: any) =>
      (
        [
          TreatmentPlanStatus.ACCEPTED,
          TreatmentPlanStatus.IN_PROGRESS,
          TreatmentPlanStatus.COMPLETED,
        ] as TreatmentPlanStatus[]
      ).includes(p.status),
    );

    const plansAcceptedValue = this.round2(
      acceptedPlans.reduce(
        (s: number, p: any) => s + Number(p.totalEstimatedCost || p.subtotal || 0),
        0,
      ),
    );
    const plansCompletedValue = this.round2(
      finishedPlans.reduce(
        (s: number, p: any) => s + Number(p.totalEstimatedCost || p.subtotal || 0),
        0,
      ),
    );

    return {
      collected,
      paymentCount: periodPayments.filter((p) => p.amount > 0).length,
      billed,
      invoiceCount: periodInvoices.length,
      paidInvoicesCount,
      unpaid,
      averageBill,
      patientsBilled: new Set(periodInvoices.map((i: any) => i.patientId)).size,
      byMode,
      visitsBooked: visits.length,
      visitsCompleted: completed.length,
      patientsTreated: treatedIds.length,
      newPatients,
      returningPatients: treatedIds.length - newPatients,
      cancelled,
      noShows,
      stillOpen,
      withOutcome,
      attendedPct: this.percent(completed.length, withOutcome),
      noShowPct: this.percent(noShows, withOutcome),
      cancelledPct: this.percent(cancelled, withOutcome),
      plansTotal: plans.length,
      plansCompleted: finishedPlans.length,
      plansAcceptedValue,
      plansCompletedValue,
      planCompletionPct: this.percent(finishedPlans.length, plans.length),
    };
  }

  /**
   * 1. GET /reports/summary
   */
  async getSummaryReport(
    clinicId: string,
    user: AuthenticatedUser,
    query: ReportQueryDto,
  ) {
    const { span, prevSpan, days } = this.resolveDateSpan(query);
    const dataset = await this.loadClinicDataset(clinicId);
    const current = this.computePeriodMetrics(dataset, span);
    const previous = this.computePeriodMetrics(dataset, prevSpan);

    if (!this.canUserSeeMoney(user)) {
      return {
        span,
        prevSpan,
        days,
        current: {
          ...current,
          collected: 0,
          billed: 0,
          unpaid: 0,
          averageBill: 0,
          byMode: {},
        },
        previous: {
          ...previous,
          collected: 0,
          billed: 0,
          unpaid: 0,
          averageBill: 0,
          byMode: {},
        },
      };
    }

    return { span, prevSpan, days, current, previous };
  }

  /**
   * 2. GET /reports/revenue
   */
  async getRevenueReport(
    clinicId: string,
    user: AuthenticatedUser,
    query: ReportQueryDto,
  ) {
    if (!this.canUserSeeMoney(user)) {
      throw new ForbiddenException(
        'Your role does not have permission to view revenue reports.',
      );
    }

    const { span, prevSpan, days } = this.resolveDateSpan(query);
    const dataset = await this.loadClinicDataset(clinicId);
    const current = this.computePeriodMetrics(dataset, span);
    const previous = this.computePeriodMetrics(dataset, prevSpan);

    const dailyTotals = new Map<string, number>();
    for (const inv of dataset.invoices) {
      if (inv.status === InvoiceStatus.VOID) continue;
      if (Array.isArray(inv.payments) && inv.payments.length > 0) {
        for (const p of inv.payments) {
          const day = this.localDate(p.receivedAt);
          if (day < span.from || day > span.to) continue;
          const sign = p.type === InvoicePaymentType.REFUND ? -1 : 1;
          dailyTotals.set(
            day,
            this.round2(
              (dailyTotals.get(day) || 0) + sign * Number(p.amount || 0),
            ),
          );
        }
      } else if (inv.status === InvoiceStatus.PAID) {
        const day = this.localDate(inv.issuedAt || inv.createdAt);
        if (day >= span.from && day <= span.to) {
          dailyTotals.set(
            day,
            this.round2(
              (dailyTotals.get(day) || 0) + Number(inv.totalAmount || 0),
            ),
          );
        }
      }
    }

    const dailySeries: Array<{ date: string; label: string; amount: number }> =
      [];
    const cursor = new Date(`${span.from}T00:00:00`);
    const end = new Date(`${span.to}T00:00:00`);
    while (cursor <= end) {
      const day = this.localDate(cursor);
      const label = cursor.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
      });
      dailySeries.push({
        date: day,
        label,
        amount: Math.max(0, dailyTotals.get(day) || 0),
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    const useMonthlyBuckets = days > 62;
    let series = dailySeries;
    if (useMonthlyBuckets) {
      const monthMap = new Map<
        string,
        { date: string; label: string; amount: number }
      >();
      for (const d of dailySeries) {
        const key = d.date.slice(0, 7);
        const existing = monthMap.get(key);
        if (existing) {
          existing.amount = this.round2(existing.amount + d.amount);
        } else {
          const label = new Date(`${key}-01T00:00:00`).toLocaleDateString(
            'en-IN',
            { month: 'short', year: '2-digit' },
          );
          monthMap.set(key, { date: key, label, amount: d.amount });
        }
      }
      series = Array.from(monthMap.values());
    }

    const maxPoint = Math.max(1, ...series.map((s) => s.amount));

    const modeKeys = ['Cash', 'UPI', 'Card', 'Net Banking', 'Cheque'];
    const modes = modeKeys
      .map((mode) => {
        const amount = Math.max(0, current.byMode[mode] || 0);
        return {
          mode,
          amount,
          share: current.collected
            ? Math.round((amount / current.collected) * 100)
            : 0,
        };
      })
      .filter((m) => ['Cash', 'UPI', 'Card'].includes(m.mode) || m.amount > 0);

    return {
      span,
      prevSpan,
      days,
      useMonthlyBuckets,
      current,
      previous,
      series,
      maxPoint,
      modes,
    };
  }

  /**
   * 3. GET /reports/doctors
   */
  async getDoctorsReport(
    clinicId: string,
    user: AuthenticatedUser,
    query: ReportQueryDto,
  ) {
    const { span, prevSpan, days } = this.resolveDateSpan(query);
    const dataset = await this.loadClinicDataset(clinicId);
    const showMoney = this.canUserSeeMoney(user);

    const periodAppts = dataset.appointments.filter((a: any) =>
      this.inSpan(this.apptDate(a), span),
    );
    const periodPlans = dataset.treatmentPlans.filter((p: any) =>
      this.inSpan(p.createdAt, span),
    );
    const periodInvoices = dataset.invoices.filter(
      (inv: any) =>
        inv.status !== InvoiceStatus.VOID &&
        inv.status !== InvoiceStatus.DRAFT &&
        this.inSpan(inv.issuedAt || inv.createdAt, span),
    );

    const doctorNames = new Map<
      string,
      { id?: string; specialization: string }
    >();
    for (const doc of dataset.doctors) {
      if (doc.fullName) {
        doctorNames.set(doc.fullName.trim(), {
          id: doc.id,
          specialization: 'Dental Surgeon',
        });
      }
    }
    // Only include users who are actual clinical doctors (role DOCTOR or valid registered doctors)
    const validDoctorNames = new Set(Array.from(doctorNames.keys()));

    const rows = Array.from(doctorNames.entries())
      .map(([doctor, meta]) => {
        const myAppts = periodAppts.filter(
          (a: any) =>
            (a.doctorName || a.doctor?.fullName || '').trim() === doctor,
        );
        const myCompleted = myAppts.filter(
          (a: any) => this.mapApptStatusLabel(a.status) === 'completed',
        );
        const noShows = myAppts.filter(
          (a: any) => this.mapApptStatusLabel(a.status) === 'no-show',
        ).length;
        const cancelled = myAppts.filter(
          (a: any) => this.mapApptStatusLabel(a.status) === 'cancelled',
        ).length;
        const closed = myCompleted.length + noShows + cancelled;

        const myPlans = periodPlans.filter(
          (p: any) =>
            (p.doctorName || p.doctor?.fullName || '').trim() === doctor,
        );
        const completedPlans = myPlans.filter(
          (p: any) => p.status === TreatmentPlanStatus.COMPLETED,
        );
        const planValue = this.round2(
          myPlans.reduce(
            (s: number, p: any) =>
              s + Number(p.totalEstimatedCost || p.subtotal || 0),
            0,
          ),
        );

        const myApptIds = new Set(myAppts.map((a: any) => a.id));
        const myPlanIds = new Set(myPlans.map((p: any) => p.id));
        const patientDates = new Set(
          myCompleted.map(
            (a: any) => `${a.patientId}|${this.localDate(this.apptDate(a))}`,
          ),
        );

        const myInvoices = periodInvoices.filter(
          (inv: any) =>
            (inv.appointmentId && myApptIds.has(inv.appointmentId)) ||
            (inv.treatmentPlanId && myPlanIds.has(inv.treatmentPlanId)) ||
            patientDates.has(
              `${inv.patientId}|${this.localDate(inv.issuedAt || inv.createdAt)}`,
            ),
        );

        const billed = this.round2(
          myInvoices.reduce(
            (s: number, inv: any) => s + Number(inv.totalAmount || 0),
            0,
          ),
        );
        const collected = this.round2(
          myInvoices.reduce(
            (s: number, inv: any) => s + Number(inv.paidAmount || 0),
            0,
          ),
        );

        return {
          doctorId: meta.id,
          doctor,
          specialization: meta.specialization,
          appointments: myAppts.length,
          completed: myCompleted.length,
          noShows,
          cancelled,
          attendancePct: closed
            ? Math.round((myCompleted.length / closed) * 100)
            : 0,
          proceduresDone: myCompleted.length + completedPlans.length,
          planValue: showMoney ? planValue : 0,
          collected: showMoney ? collected : 0,
          billed: showMoney ? billed : 0,
        };
      })
      .sort(
        (a, b) =>
          b.collected - a.collected ||
          b.completed - a.completed ||
          b.appointments - a.appointments,
      );

    return {
      span,
      prevSpan,
      days,
      summary: {
        doctorsWithVisits: rows.filter((r) => r.appointments > 0).length,
        totalDoctors: rows.length,
        completedVisits: rows.reduce((s, r) => s + r.completed, 0),
        proceduresDone: rows.reduce((s, r) => s + r.proceduresDone, 0),
        collected: showMoney ? rows.reduce((s, r) => s + r.collected, 0) : 0,
      },
      doctors: rows,
    };
  }

  /**
   * 4. GET /reports/treatments
   */
  async getTreatmentsReport(
    clinicId: string,
    user: AuthenticatedUser,
    query: ReportQueryDto,
  ) {
    const { span, prevSpan, days } = this.resolveDateSpan(query);
    const dataset = await this.loadClinicDataset(clinicId);
    const showMoney = this.canUserSeeMoney(user);

    const current = this.computePeriodMetrics(dataset, span);
    const previous = this.computePeriodMetrics(dataset, prevSpan);

    const categoryLookup = new Map<string, string>(
      Object.entries(DEFAULT_TREATMENT_CATEGORIES),
    );
    const feeLookup = new Map<string, number>();
    for (const t of dataset.tariffs) {
      if (t.name && t.category) {
        categoryLookup.set(t.name.trim().toLowerCase(), t.category.trim());
      }
      if (t.name && t.standardFee) {
        feeLookup.set(t.name.trim().toLowerCase(), Number(t.standardFee));
      }
    }

    const resolveCategory = (
      name: string,
      explicitCategory?: string | null,
      fallback = 'General',
    ) => {
      if (explicitCategory && explicitCategory.trim()) {
        return explicitCategory.trim();
      }
      const lower = (name || '').trim().toLowerCase();
      if (categoryLookup.has(lower)) return categoryLookup.get(lower)!;
      for (const [key, cat] of categoryLookup.entries()) {
        if (lower.includes(key.split(' ')[0])) return cat;
      }
      return fallback;
    };

    const completedVisits = dataset.appointments.filter(
      (a: any) =>
        this.mapApptStatusLabel(a.status) === 'completed' &&
        this.inSpan(this.apptDate(a), span),
    );
    const periodPlans = dataset.treatmentPlans.filter((p: any) =>
      this.inSpan(p.createdAt, span),
    );

    const catMap = new Map<
      string,
      { completedCount: number; plannedCount: number; value: number }
    >();
    const procMap = new Map<
      string,
      { name: string; category: string; count: number; value: number }
    >();

    for (const a of completedVisits) {
      const name = a.treatmentType || a.visitType || 'Consultation';
      const cat = resolveCategory(name, undefined, 'Consultation');
      const fee = feeLookup.get(name.trim().toLowerCase()) || 0;

      const curCat = catMap.get(cat) || {
        completedCount: 0,
        plannedCount: 0,
        value: 0,
      };
      curCat.completedCount += 1;
      curCat.value = this.round2(curCat.value + fee);
      catMap.set(cat, curCat);

      const curProc = procMap.get(name) || {
        name,
        category: cat,
        count: 0,
        value: 0,
      };
      curProc.count += 1;
      curProc.value = this.round2(curProc.value + fee);
      procMap.set(name, curProc);
    }

    const toothCounts = new Map<string, number>();

    for (const plan of periodPlans) {
      const stages = Array.isArray(plan.stages) ? plan.stages : [];
      const items = stages.flatMap((s: any) => s.items || []);

      if (items.length > 0) {
        for (const item of items) {
          const cat = resolveCategory(item.procedureName, item.category);
          const itemCost = Number(item.netFee || item.unitFee || 0);
          const isCompleted =
            item.status === 'COMPLETED' ||
            plan.status === TreatmentPlanStatus.COMPLETED;

          const curCat = catMap.get(cat) || {
            completedCount: 0,
            plannedCount: 0,
            value: 0,
          };
          if (isCompleted) curCat.completedCount += 1;
          else curCat.plannedCount += 1;
          curCat.value = this.round2(curCat.value + itemCost);
          catMap.set(cat, curCat);

          const curProc = procMap.get(item.procedureName) || {
            name: item.procedureName,
            category: cat,
            count: 0,
            value: 0,
          };
          curProc.count += 1;
          curProc.value = this.round2(curProc.value + itemCost);
          procMap.set(item.procedureName, curProc);

          if (item.toothNumber) {
            const key = item.toothNumber.trim();
            if (key) toothCounts.set(key, (toothCounts.get(key) || 0) + 1);
          }
        }
      } else {
        const name = plan.title || 'Dental Treatment Plan';
        const cat = resolveCategory(name, 'General');
        const cost = Number(plan.totalEstimatedCost || plan.subtotal || 0);
        const curCat = catMap.get(cat) || {
          completedCount: 0,
          plannedCount: 0,
          value: 0,
        };
        if (plan.status === TreatmentPlanStatus.COMPLETED)
          curCat.completedCount += 1;
        else curCat.plannedCount += 1;
        curCat.value = this.round2(curCat.value + cost);
        catMap.set(cat, curCat);
      }
    }

    const categories = Array.from(catMap.entries())
      .map(([category, v]) => ({
        category,
        completedCount: v.completedCount,
        plannedCount: v.plannedCount,
        total: v.completedCount + v.plannedCount,
        value: showMoney ? v.value : 0,
      }))
      .sort((a, b) => b.total - a.total || b.value - a.value);

    const procedures = Array.from(procMap.values())
      .map((p) => ({
        ...p,
        value: showMoney ? p.value : 0,
      }))
      .sort((a, b) => b.count - a.count || b.value - a.value)
      .slice(0, 8);

    const statusOrder: Array<{
      label: string;
      match: (s: TreatmentPlanStatus) => boolean;
    }> = [
      { label: 'Proposed', match: (s) => s === TreatmentPlanStatus.PROPOSED },
      { label: 'Accepted', match: (s) => s === TreatmentPlanStatus.ACCEPTED },
      {
        label: 'In Progress',
        match: (s) => s === TreatmentPlanStatus.IN_PROGRESS,
      },
      { label: 'Completed', match: (s) => s === TreatmentPlanStatus.COMPLETED },
    ];

    const planStatus = statusOrder.map(({ label, match }) => {
      const list = periodPlans.filter((p: any) => match(p.status));
      return {
        status: label,
        count: list.length,
        value: showMoney
          ? this.round2(
              list.reduce(
                (s: number, p: any) =>
                  s + Number(p.totalEstimatedCost || p.subtotal || 0),
                0,
              ),
            )
          : 0,
      };
    });

    const topTeeth = Array.from(toothCounts.entries())
      .map(([tooth, count]) => ({ tooth, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return {
      span,
      prevSpan,
      days,
      current: showMoney
        ? current
        : {
            ...current,
            plansAcceptedValue: 0,
            plansCompletedValue: 0,
          },
      previous: showMoney
        ? previous
        : {
            ...previous,
            plansAcceptedValue: 0,
            plansCompletedValue: 0,
          },
      categories,
      procedures,
      planStatus,
      topTeeth,
    };
  }

  /**
   * 5. GET /reports/follow-ups
   */
  async getFollowUpsReport(clinicId: string, query: ReportQueryDto) {
    const today = this.localDate();
    const { span, prevSpan, days } = this.resolveDateSpan(query, today);
    const dataset = await this.loadClinicDataset(clinicId);
    const clinicName = dataset.clinic?.name || 'DocMatrix Dental Clinic';

    const current = this.computePeriodMetrics(dataset, span);
    const previous = this.computePeriodMetrics(dataset, prevSpan);

    const contactLog: Record<string, string> = {};
    for (const log of dataset.contactAuditLogs) {
      if (!log.entityId) continue;
      if (log.action === 'CONTACTED') {
        const meta = (log.metadata as any) || {};
        const ts = meta.contactedAt || new Date(log.createdAt).toISOString();
        contactLog[log.entityId] = ts;
        if (meta.patientCode) contactLog[meta.patientCode] = ts;
        if (meta.patientUUID) contactLog[meta.patientUUID] = ts;
      } else if (log.action === 'UNCONTACTED') {
        const meta = (log.metadata as any) || {};
        delete contactLog[log.entityId];
        if (meta.patientCode) delete contactLog[meta.patientCode];
        if (meta.patientUUID) delete contactLog[meta.patientUUID];
      }
    }

    const isRecentlyContacted = (
      patientId: string,
      patientCode?: string | null,
    ): { contacted: boolean; contactedAt?: string } => {
      const iso =
        contactLog[patientId] ||
        (patientCode ? contactLog[patientCode] : undefined);
      if (!iso) return { contacted: false };
      const daysAgo =
        (new Date(`${today}T23:59:59`).getTime() - new Date(iso).getTime()) /
        86400000;
      return {
        contacted: daysAgo <= CONTACT_COOLDOWN_DAYS,
        contactedAt: iso,
      };
    };

    const patientById = new Map<string, any>(
      dataset.patients.map((p: any) => [p.id, p]),
    );

    const missedLatestByPatient = new Map<string, any>();
    for (const a of dataset.appointments) {
      const st = this.mapApptStatusLabel(a.status);
      if (st !== 'cancelled' && st !== 'no-show') continue;
      const aDate = this.localDate(this.apptDate(a));
      const hasReplacement = dataset.appointments.some(
        (other: any) =>
          other.patientId === a.patientId &&
          other.id !== a.id &&
          !['cancelled', 'no-show'].includes(
            this.mapApptStatusLabel(other.status),
          ) &&
          this.localDate(this.apptDate(other)) >= aDate,
      );
      if (hasReplacement) continue;
      const cur = missedLatestByPatient.get(a.patientId);
      if (!cur || aDate > this.localDate(this.apptDate(cur))) {
        missedLatestByPatient.set(a.patientId, a);
      }
    }

    const futureBookedPatients = new Set(
      dataset.appointments
        .filter(
          (a: any) =>
            this.localDate(this.apptDate(a)) >= today &&
            !['cancelled', 'no-show'].includes(
              this.mapApptStatusLabel(a.status),
            ),
        )
        .map((a: any) => a.patientId as string),
    );

    const openPlans = dataset.treatmentPlans.filter(
      (p: any) =>
        p.status !== TreatmentPlanStatus.COMPLETED &&
        p.status !== TreatmentPlanStatus.REJECTED &&
        p.status !== TreatmentPlanStatus.CANCELLED &&
        !futureBookedPatients.has(p.patientId),
    );

    const planGroups = new Map<
      string,
      {
        patientId: string;
        plans: any[];
        totalCost: number;
        oldestDate: string;
      }
    >();
    for (const p of openPlans) {
      const pDate = this.localDate(p.createdAt);
      const g = planGroups.get(p.patientId) || {
        patientId: p.patientId,
        plans: [] as any[],
        totalCost: 0,
        oldestDate: pDate,
      };
      g.plans.push(p);
      g.totalCost = this.round2(
        g.totalCost + Number(p.totalEstimatedCost || p.subtotal || 0),
      );
      if (pDate < g.oldestDate) g.oldestDate = pDate;
      planGroups.set(p.patientId, g);
    }

    const openPlanPatients = new Set(openPlans.map((p: any) => p.patientId));
    const recallRows: Array<{
      patient: any;
      lastVisit: string;
      daysAgo: number;
      lastDoctor: string;
    }> = [];

    for (const patient of dataset.patients) {
      if (
        futureBookedPatients.has(patient.id) ||
        openPlanPatients.has(patient.id)
      ) {
        continue;
      }
      const completed = dataset.appointments
        .filter(
          (a: any) =>
            a.patientId === patient.id &&
            this.mapApptStatusLabel(a.status) === 'completed',
        )
        .sort((a: any, b: any) =>
          this.localDate(this.apptDate(b)).localeCompare(
            this.localDate(this.apptDate(a)),
          ),
        );
      const last = completed[0];
      if (!last) continue;
      const lastDate = this.localDate(this.apptDate(last));
      const daysAgo = this.daysSince(lastDate, today);
      if (daysAgo >= RECALL_DAYS) {
        recallRows.push({
          patient,
          lastVisit: lastDate,
          daysAgo,
          lastDoctor:
            last.doctorName || last.doctor?.fullName || 'Clinic Doctor',
        });
      }
    }

    const contacts: Array<{
      id: string;
      patientId: string;
      patientCode: string;
      patientName: string;
      mobile: string;
      kind: 'missed' | 'treatment' | 'recall';
      title: string;
      detail: string;
      dateLabel: string;
      sortDate: string;
      whatsappText: string;
      contacted: boolean;
      contactedAt?: string;
    }> = [];

    for (const a of missedLatestByPatient.values()) {
      const p = patientById.get(a.patientId);
      const first = p?.firstName || 'there';
      const name = p
        ? `${p.firstName} ${p.lastName}`.trim()
        : 'Unknown patient';
      const pCode = p?.patientCode || a.patientId;
      const st = this.mapApptStatusLabel(a.status);
      const aDate = this.localDate(this.apptDate(a));
      const cState = isRecentlyContacted(a.patientId, p?.patientCode);
      contacts.push({
        id: `missed-${a.id}`,
        patientId: pCode,
        patientCode: pCode,
        patientName: name,
        mobile: p?.mobile || '',
        kind: 'missed',
        title: `${st === 'no-show' ? 'Missed' : 'Cancelled'} ${a.treatmentType || a.visitType}`,
        detail: `${a.doctorName || a.doctor?.fullName || 'Doctor'}${a.cancellationReason ? ` · ${a.cancellationReason}` : ''}`,
        dateLabel: aDate,
        sortDate: aDate,
        whatsappText: `Hello ${first}, we missed you at ${clinicName} for your ${(a.treatmentType || a.visitType || 'dental').toLowerCase()} visit. Reply here with a day that works and we will book it for you.`,
        contacted: cState.contacted,
        contactedAt: cState.contactedAt,
      });
    }

    for (const g of planGroups.values()) {
      const p = patientById.get(g.patientId);
      const first = p?.firstName || 'there';
      const name = p
        ? `${p.firstName} ${p.lastName}`.trim()
        : 'Unknown patient';
      const pCode = p?.patientCode || g.patientId;
      const firstPlan = g.plans[0];
      const firstItem = firstPlan?.stages?.[0]?.items?.[0];
      const procedureLabel =
        firstItem?.procedureName || firstPlan?.title || 'Dental treatment';
      const toothLabel = firstItem?.toothNumber
        ? ` (tooth ${firstItem.toothNumber})`
        : '';
      const doctorLabel =
        firstPlan?.doctorName || firstPlan?.doctor?.fullName || 'Doctor';
      const cState = isRecentlyContacted(g.patientId, p?.patientCode);

      contacts.push({
        id: `treatment-${g.patientId}`,
        patientId: pCode,
        patientCode: pCode,
        patientName: name,
        mobile: p?.mobile || '',
        kind: 'treatment',
        title: g.plans
          .map((pl: any) => {
            const it = pl.stages?.[0]?.items?.[0];
            const proc = it?.procedureName || pl.title || 'Treatment';
            return `${proc}${it?.toothNumber ? ` (tooth ${it.toothNumber})` : ''}`;
          })
          .join(', '),
        detail: `${this.mapPlanStatusLabel(firstPlan.status)} with ${doctorLabel} · no visit booked`,
        dateLabel: `Planned ${g.oldestDate}`,
        sortDate: g.oldestDate,
        whatsappText: `Hello ${first}, checking in from ${clinicName} about your pending ${procedureLabel.toLowerCase()}${toothLabel}. Let us know when you would like to come in.`,
        contacted: cState.contacted,
        contactedAt: cState.contactedAt,
      });
    }

    for (const r of recallRows) {
      const pCode = r.patient.patientCode || r.patient.id;
      const cState = isRecentlyContacted(r.patient.id, r.patient.patientCode);
      contacts.push({
        id: `recall-${r.patient.id}`,
        patientId: pCode,
        patientCode: pCode,
        patientName: `${r.patient.firstName} ${r.patient.lastName}`.trim(),
        mobile: r.patient.mobile || '',
        kind: 'recall',
        title: `${Math.floor(r.daysAgo / 30)} months since last visit`,
        detail: `Last seen by ${r.lastDoctor} on ${r.lastVisit}`,
        dateLabel: r.lastVisit,
        sortDate: r.lastVisit,
        whatsappText: `Hello ${r.patient.firstName}, it has been ${Math.floor(r.daysAgo / 30)} months since your last dental check-up at ${clinicName}. Reply here if you would like us to book a routine check-up.`,
        contacted: cState.contacted,
        contactedAt: cState.contactedAt,
      });
    }

    const activeContacts = contacts.filter((c) => !c.contacted);
    const contactedContacts = contacts.filter((c) => c.contacted);

    const periodAppts = dataset.appointments.filter((a: any) =>
      this.inSpan(this.apptDate(a), span),
    );
    const treatedSet = new Set(
      periodAppts
        .filter((a: any) => this.mapApptStatusLabel(a.status) === 'completed')
        .map((a: any) => a.patientId as string),
    );

    const alertPatients = dataset.patients
      .filter((p: any) => {
        if (!treatedSet.has(p.id)) return false;
        const alerts = (p.medicalSafetyAlerts as any) || {};
        return Boolean(
          alerts.allergies || alerts.conditions || alerts.medications,
        );
      })
      .map((p: any) => {
        const alerts = (p.medicalSafetyAlerts as any) || {};
        return {
          id: p.patientCode || p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          allergiesDetails: alerts.allergies || '',
          conditionsDetails: alerts.conditions || '',
          medicationsDetails: alerts.medications || '',
        };
      });

    const weekdayLabels = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const weekdayOrder = [1, 2, 3, 4, 5, 6, 0];
    const weekdayCounts = [0, 0, 0, 0, 0, 0, 0];
    for (const a of periodAppts) {
      if (this.mapApptStatusLabel(a.status) === 'cancelled') continue;
      const dayIdx = new Date(
        `${this.localDate(this.apptDate(a))}T00:00:00`,
      ).getDay();
      if (!Number.isNaN(dayIdx)) weekdayCounts[dayIdx] += 1;
    }
    const weekdays = weekdayOrder.map((d) => ({
      label: weekdayLabels[d],
      count: weekdayCounts[d],
    }));

    const visitTypeMap = new Map<string, number>();
    for (const a of periodAppts) {
      const k = a.visitType || 'Consultation';
      visitTypeMap.set(k, (visitTypeMap.get(k) || 0) + 1);
    }
    const visitTypes = Array.from(visitTypeMap.entries())
      .map(([type, count]) => ({
        type,
        count,
        share: this.percent(count, periodAppts.length),
      }))
      .sort((a, b) => b.count - a.count);

    return {
      span,
      prevSpan,
      days,
      current,
      previous,
      contacts,
      contactCounts: {
        all: activeContacts.length,
        missed: activeContacts.filter((c) => c.kind === 'missed').length,
        treatment: activeContacts.filter((c) => c.kind === 'treatment').length,
        recall: activeContacts.filter((c) => c.kind === 'recall').length,
        contacted: contactedContacts.length,
      },
      contactLog,
      alertPatients,
      weekdays,
      visitTypes,
    };
  }

  /**
   * 6. POST /reports/follow-ups/:patientId/contact
   */
  async markPatientContacted(
    clinicId: string,
    user: AuthenticatedUser,
    patientIdentifier: string,
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        clinicId,
        OR: [{ id: patientIdentifier }, { patientCode: patientIdentifier }],
      },
    });
    if (!patient) {
      throw new NotFoundException(
        `Patient not found with identifier: ${patientIdentifier}`,
      );
    }

    const contactedAt = new Date().toISOString();
    const canonicalId = patient.patientCode || patient.id;
    const prismaAny = this.prisma as any;

    if (prismaAny.auditLog?.create) {
      await prismaAny.auditLog.create({
        data: {
          clinicId,
          actorUserId: user.id,
          action: 'CONTACTED',
          entityType: 'PATIENT_FOLLOW_UP',
          entityId: canonicalId,
          metadata: {
            patientUUID: patient.id,
            patientCode: patient.patientCode,
            contactedAt,
          },
        },
      });
    } else if (this.prisma.enquiry?.create) {
      await this.prisma.enquiry.create({
        data: {
          clinicId,
          name: `${patient.firstName} ${patient.lastName}`.trim(),
          phone: patient.mobile,
          email: patient.email || null,
          request: `FOLLOW_UP_CONTACT:${canonicalId}`,
          status: 'CONTACTED',
          notes: JSON.stringify({
            patientUUID: patient.id,
            patientCode: patient.patientCode,
            contactedAt,
            actorUserId: user.id,
          }),
        },
      });
    }

    return {
      patientId: canonicalId,
      patientUUID: patient.id,
      contacted: true,
      contactedAt,
    };
  }

  /**
   * 7. DELETE /reports/follow-ups/:patientId/contact
   */
  async unmarkPatientContacted(
    clinicId: string,
    user: AuthenticatedUser,
    patientIdentifier: string,
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        clinicId,
        OR: [{ id: patientIdentifier }, { patientCode: patientIdentifier }],
      },
    });

    const idsToMatch = [patientIdentifier];
    if (patient) {
      idsToMatch.push(patient.id);
      if (patient.patientCode) idsToMatch.push(patient.patientCode);
    }

    const prismaAny = this.prisma as any;
    if (prismaAny.auditLog?.deleteMany) {
      await prismaAny.auditLog.deleteMany({
        where: {
          clinicId,
          entityType: 'PATIENT_FOLLOW_UP',
          entityId: { in: idsToMatch },
        },
      });
    } else if (this.prisma.enquiry?.deleteMany) {
      await this.prisma.enquiry.deleteMany({
        where: {
          clinicId,
          request: {
            in: idsToMatch.map((id) => `FOLLOW_UP_CONTACT:${id}`),
          },
        },
      });
    }

    return {
      patientId: patient?.patientCode || patientIdentifier,
      contacted: false,
    };
  }
}
