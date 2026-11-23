import { surgeryConsentPolicy } from '../common/clinical-governance.js';
import { clinicInstant, localParts } from '../common/clinic-time.js';
import { practitionerWhere } from '../common/practitioner.policy.js';
import { Prisma } from '@prisma/client';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AppointmentPriority, AppointmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { UpdateAppointmentDto } from './dto/update-appointment.dto.js';
import { AppointmentQueryDto } from './dto/appointment-query.dto.js';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto.js';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  private async clinicSettings(clinicId: string, client: any = this.prisma) {
    const clinic = await client.clinic.findUnique({ where: { id: clinicId } });
    if (!clinic) throw new NotFoundException('Clinic not found.');
    return { ...clinic, timezone: clinic.timezone || 'Asia/Kolkata' };
  }
  private async scheduleMutation<T>(clinicId: string, work: (tx: any, clinic: any) => Promise<T>) {
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Clinic" WHERE id = ${clinicId} FOR UPDATE`);
      return work(tx, await this.clinicSettings(clinicId, tx));
    }, { maxWait: 10000, timeout: 20000 });
  }
  private async assertSlot(tx: any, clinic: any, slot: { startTime: Date; endTime: Date; doctorId?: string | null; chair?: string | null; priority?: string; status?: string }, exceptId?: string) {
    if (['CANCELLED', 'NO_SHOW'].includes(slot.status || '')) return;
    if (slot.priority?.toUpperCase() !== 'EMERGENCY') {
      const local = localParts(slot.startTime, clinic.timezone);
      const day = new Date(`${local.date}T12:00:00Z`).getUTCDay();
      const hours = clinic.extendedSettings?.workingHours || {};
      const text = day === 0 ? hours.sunday || 'Closed' : day === 6 ? hours.saturday || '09:00 AM - 06:00 PM' : hours.weekdays || '09:00 AM - 08:00 PM';
      if (/closed|emergency only/i.test(text)) throw new BadRequestException('The clinic is closed at this time.');
      const matches = [...text.matchAll(/(\d{1,2}):(\d{2})\s*(AM|PM)?/gi)];
      if (matches.length !== 2) throw new BadRequestException('Configure valid clinic working hours before booking.');
      const minute = (m: RegExpMatchArray) => (m[3] ? Number(m[1]) % 12 + (m[3].toUpperCase() === 'PM' ? 12 : 0) : Number(m[1])) * 60 + Number(m[2]);
      const startMinute = Number(local.time.slice(0,2))*60 + Number(local.time.slice(3));
      const duration = (slot.endTime.getTime() - slot.startTime.getTime()) / 60000;
      if (startMinute < minute(matches[0]) || startMinute + duration > minute(matches[1])) throw new BadRequestException('Appointment falls outside clinic working hours.');
    }
    const resources = [...(slot.doctorId ? [{ doctorId: slot.doctorId }] : []), ...(slot.chair ? [{ operatoryChair: slot.chair }] : [])];
    if (resources.length && await tx.appointment.findFirst({ where: {
      clinicId: clinic.id, ...(exceptId ? { id: { not: exceptId } } : {}),
      status: { notIn: ['CANCELLED', 'NO_SHOW'] }, startTime: { lt: slot.endTime }, endTime: { gt: slot.startTime }, OR: resources,
    } })) throw new BadRequestException('The doctor or chair already has an overlapping appointment.');
  }

  private parseStatus(status?: string): AppointmentStatus {
    if (!status) return AppointmentStatus.SCHEDULED;
    const s = status.toLowerCase().trim();
    switch (s) {
      case 'checked-in':
      case 'checked_in':
        return AppointmentStatus.CHECKED_IN;
      case 'in-progress':
      case 'in_progress':
        return AppointmentStatus.IN_PROGRESS;
      case 'completed':
        return AppointmentStatus.COMPLETED;
      case 'cancelled':
      case 'canceled':
        return AppointmentStatus.CANCELLED;
      case 'confirmed':
        return AppointmentStatus.CONFIRMED;
      case 'no-show':
      case 'no_show':
        return AppointmentStatus.NO_SHOW;
      case 'scheduled':
      default:
        return AppointmentStatus.SCHEDULED;
    }
  }

  private formatStatus(status: AppointmentStatus): string {
    switch (status) {
      case AppointmentStatus.CHECKED_IN:
        return 'checked-in';
      case AppointmentStatus.IN_PROGRESS:
        return 'in-progress';
      case AppointmentStatus.NO_SHOW:
        return 'no-show';
      case AppointmentStatus.COMPLETED:
        return 'completed';
      case AppointmentStatus.CANCELLED:
        return 'cancelled';
      case AppointmentStatus.CONFIRMED:
        return 'confirmed';
      case AppointmentStatus.SCHEDULED:
      default:
        return 'scheduled';
    }
  }

  private parsePriority(priority?: string): AppointmentPriority {
    if (!priority) return AppointmentPriority.NORMAL;
    const p = priority.toLowerCase().trim();
    if (p === 'urgent') return AppointmentPriority.URGENT;
    if (p === 'emergency') return AppointmentPriority.EMERGENCY;
    return AppointmentPriority.NORMAL;
  }

  private serializeAppointment(appt: any, timezone = 'UTC') {
    const start = new Date(appt.startTime);
    const { date: dateStr, time: timeStr } = localParts(start, timezone);

    return {
      id: appt.id,
      clinicId: appt.clinicId,
      patientId: appt.patientId,
      patientName: appt.patient ? `${appt.patient.firstName} ${appt.patient.lastName}`.trim() : null,
      patientCode: appt.patient?.patientCode || null,
      patientMobile: appt.patient?.mobile || null,
      doctorId: appt.doctorId || null,
      doctor: appt.doctor ? appt.doctor.fullName : 'Unassigned',
      date: dateStr,
      time: timeStr,
      startTime: appt.startTime.toISOString(),
      endTime: appt.endTime.toISOString(),
      durationMinutes: appt.durationMinutes,
      chair: appt.operatoryChair || null,
      operatoryChair: appt.operatoryChair || null,
      treatmentType: appt.treatmentType || null,
      visitType: appt.visitType || 'Consultation',
      status: this.formatStatus(appt.status),
      dbStatus: appt.status,
      priority: appt.priority.toLowerCase(),
      notes: appt.notes || '',
      cancellationReason: appt.cancellationReason || null,
      isWalkIn: appt.isWalkIn,
      createdAt: appt.createdAt.toISOString(),
      updatedAt: appt.updatedAt.toISOString(),
    };
  }

  private parseDateRange(dateStr: string, timezone = 'UTC'): { startOfDay: Date; endOfDay: Date } {
    const startOfDay = clinicInstant(dateStr, '00:00', timezone);
    const tomorrow = new Date(Date.parse(`${dateStr}T12:00:00Z`) + 86400000).toISOString().slice(0,10);
    const endOfDay = new Date(clinicInstant(tomorrow, '00:00', timezone).getTime() - 1);
    return { startOfDay, endOfDay };
  }

  async listAppointments(clinicId: string, query: AppointmentQueryDto) {
    const clinic = await this.clinicSettings(clinicId);
    const where: any = { clinicId };

    if (query.date) {
      const { startOfDay, endOfDay } = this.parseDateRange(query.date, clinic.timezone);
      where.startTime = { gte: startOfDay, lte: endOfDay };
    }

    if (query.status) {
      where.status = this.parseStatus(query.status);
    }

    if (query.doctorId) {
      where.doctorId = query.doctorId;
    }

    if (query.patientId) {
      where.patientId = query.patientId;
    }

    const appts = await this.prisma.appointment.findMany({
      where,
      include: {
        patient: {
          select: { firstName: true, lastName: true, patientCode: true, mobile: true },
        },
        doctor: {
          select: { id: true, fullName: true, role: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    return appts.map((a) => this.serializeAppointment(a, clinic.timezone));
  }

  async getAppointment(clinicId: string, id: string, client: any = this.prisma, clinicContext?: any) {
    const appt = await client.appointment.findFirst({
      where: { id, clinicId },
      include: {
        patient: true,
        doctor: {
          select: { id: true, fullName: true, role: true, phone: true },
        },
      },
    });

    if (!appt) {
      throw new NotFoundException('Appointment record not found.');
    }

    const clinic = clinicContext || await this.clinicSettings(clinicId, client);
    return this.serializeAppointment(appt, clinic.timezone);
  }

  async createAppointment(clinicId: string, dto: CreateAppointmentDto) {
    return this.scheduleMutation(clinicId, async (tx, clinic) => {
    // 1. Cross-clinic patient validation
    const patient = await tx.patient.findFirst({
      where: {
        clinicId,
        OR: [{ id: dto.patientId }, { patientCode: dto.patientId }],
      },
    });
    if (!patient) {
      throw new BadRequestException('Invalid patient: Patient does not belong to your clinic.');
    }

    // 2. Doctor resolution and cross-clinic validation
    let resolvedDoctorId = dto.doctorId;
    if (!resolvedDoctorId && dto.doctorName) {
      const doctorUser = await tx.user.findFirst({
        where: {
          clinicId,
          fullName: { equals: dto.doctorName.trim(), mode: 'insensitive' }, ...practitionerWhere,
        },
      });
      if (!doctorUser) throw new BadRequestException('The selected doctor is not an active practitioner in this clinic.');
      resolvedDoctorId = doctorUser.id;
    }

    if (resolvedDoctorId) {
      const doctor = await tx.user.findFirst({
        where: { id: resolvedDoctorId, clinicId, ...practitionerWhere },
      });
      if (!doctor) {
        throw new BadRequestException('Invalid doctor: Doctor does not belong to your clinic.');
      }
    }

    // 3. Date & time calculation
    const duration = dto.durationMinutes ?? 30;
    if (!Number.isInteger(duration) || duration < 1 || duration > 1440) throw new BadRequestException('Duration must be between 1 and 1440 minutes.');
    const startTime = clinicInstant(dto.date, dto.time, clinic.timezone);
    if (isNaN(startTime.getTime())) {
      throw new BadRequestException('Invalid date or time format. Expected YYYY-MM-DD and HH:MM.');
    }
    const endTime = new Date(startTime.getTime() + duration * 60000);

    const status = this.parseStatus(dto.status);
    const priority = this.parsePriority(dto.priority);

    await this.assertSlot(tx, clinic, { startTime, endTime, doctorId: resolvedDoctorId, chair: dto.chair, priority, status });

    if (['IN_PROGRESS','COMPLETED'].includes(status)) await surgeryConsentPolicy(tx, clinicId, patient.id, { procedureName: dto.treatmentType });
    const created = await tx.appointment.create({
      data: {
        clinicId,
        patientId: patient.id,
        doctorId: resolvedDoctorId || null,
        startTime,
        endTime,
        durationMinutes: duration,
        operatoryChair: dto.chair || null,
        treatmentType: dto.treatmentType || null,
        visitType: dto.visitType || 'Consultation',
        status,
        priority,
        notes: dto.notes || null,
        isWalkIn: dto.isWalkIn ?? false,
      },
      include: {
        patient: {
          select: { firstName: true, lastName: true, patientCode: true, mobile: true },
        },
        doctor: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    return this.serializeAppointment(created, clinic.timezone);
    });
  }

  async updateAppointment(clinicId: string, id: string, dto: UpdateAppointmentDto) {
    return this.scheduleMutation(clinicId, async (tx, clinic) => {
    const existing = await this.getAppointment(clinicId, id, tx, clinic);

    let startTime = new Date(existing.startTime);
    const duration = dto.durationMinutes ?? existing.durationMinutes;
    if (!Number.isInteger(duration) || duration < 1 || duration > 1440) throw new BadRequestException('Duration must be between 1 and 1440 minutes.');

    if (dto.date || dto.time) {
      const datePart = dto.date || existing.date;
      const timePart = dto.time || existing.time;
      startTime = clinicInstant(datePart, timePart, clinic.timezone);
    }

    const endTime = new Date(startTime.getTime() + duration * 60000);

    if (dto.doctorId) {
      const doctor = await tx.user.findFirst({
        where: { id: dto.doctorId, clinicId, ...practitionerWhere },
      });
      if (!doctor) {
        throw new BadRequestException('Invalid doctor: Doctor does not belong to your clinic.');
      }
    }

    if (dto.date || dto.time || dto.durationMinutes !== undefined || dto.doctorId !== undefined || dto.chair !== undefined || (['cancelled', 'no-show'].includes(existing.status) && dto.status && !['cancelled', 'no-show'].includes(dto.status)))
    await this.assertSlot(tx, clinic, { startTime, endTime, doctorId: dto.doctorId ?? existing.doctorId, chair: dto.chair ?? existing.chair, priority: dto.priority ?? existing.priority, status: this.parseStatus(dto.status ?? existing.status) }, id);

    if (dto.status && ['IN_PROGRESS','COMPLETED'].includes(this.parseStatus(dto.status))) {
      const record = await tx.appointment.findFirst({ where: { id, clinicId }, select: { patientId: true, treatmentType: true } });
      if (record) await surgeryConsentPolicy(tx, clinicId, record.patientId, { procedureName: dto.treatmentType || record.treatmentType || '' });
    }
    const updated = await tx.appointment.update({
      where: { id },
      data: {
        ...(dto.doctorId !== undefined && { doctorId: dto.doctorId || null }),
        ...(dto.date || dto.time ? { startTime, endTime } : {}),
        ...(dto.durationMinutes !== undefined && { durationMinutes: duration, endTime }),
        ...(dto.chair !== undefined && { operatoryChair: dto.chair || null }),
        ...(dto.treatmentType !== undefined && { treatmentType: dto.treatmentType || null }),
        ...(dto.visitType !== undefined && { visitType: dto.visitType }),
        ...(dto.status !== undefined && { status: this.parseStatus(dto.status) }),
        ...(dto.priority !== undefined && { priority: this.parsePriority(dto.priority) }),
        ...(dto.notes !== undefined && { notes: dto.notes || null }),
        ...(dto.isWalkIn !== undefined && { isWalkIn: dto.isWalkIn }),
        ...(dto.cancellationReason !== undefined && { cancellationReason: dto.cancellationReason || null }),
      },
      include: {
        patient: {
          select: { firstName: true, lastName: true, patientCode: true, mobile: true },
        },
        doctor: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    return this.serializeAppointment(updated, clinic.timezone);
    });
  }

  async cancelAppointment(clinicId: string, id: string, dto: CancelAppointmentDto) {
    return this.scheduleMutation(clinicId, async (tx, clinic) => {
    await this.getAppointment(clinicId, id, tx, clinic);

    const cancelled = await tx.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancellationReason: dto.reason.trim(),
      },
      include: {
        patient: {
          select: { firstName: true, lastName: true, patientCode: true, mobile: true },
        },
        doctor: {
          select: { id: true, fullName: true, role: true },
        },
      },
    });

    return {
      message: 'Appointment successfully cancelled.',
      appointment: this.serializeAppointment(cancelled, clinic.timezone),
    };
    });
  }

  async getLiveQueue(clinicId: string, dateStr?: string) {
    const clinic = await this.clinicSettings(clinicId);
    const todayStr = dateStr || localParts(new Date(), clinic.timezone).date;
    const { startOfDay, endOfDay } = this.parseDateRange(todayStr, clinic.timezone);

    const appts = await this.prisma.appointment.findMany({
      where: {
        clinicId,
        startTime: { gte: startOfDay, lte: endOfDay },
        status: { not: AppointmentStatus.CANCELLED },
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, patientCode: true, mobile: true },
        },
        doctor: {
          select: { id: true, fullName: true, role: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    const serialized = appts.map((a) => this.serializeAppointment(a, clinic.timezone));

    const waitingPatients = serialized.filter((a) => a.status === 'checked-in');
    const inConsultation = serialized.filter((a) => a.status === 'in-progress');
    const completedToday = serialized.filter((a) => a.status === 'completed');
    const scheduledUpcoming = serialized.filter((a) => a.status === 'scheduled' || a.status === 'confirmed');

    return {
      date: todayStr,
      stats: {
        totalToday: serialized.length,
        waitingCount: waitingPatients.length,
        inConsultationCount: inConsultation.length,
        completedCount: completedToday.length,
        upcomingCount: scheduledUpcoming.length,
      },
      waitingPatients,
      inConsultation,
      completedToday,
      scheduledUpcoming,
    };
  }
}

