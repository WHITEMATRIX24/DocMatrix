import { randomBytes } from 'crypto';
import { surgeryConsentPolicy } from '../common/clinical-governance.js';
import { clinicInstant, localParts } from '../common/clinic-time.js';
import { practitionerWhere } from '../common/practitioner.policy.js';
import { Prisma } from '@prisma/client';
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { canTransition } from './appointment-policy.js';
import { AppointmentPriority, AppointmentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { UpdateAppointmentDto } from './dto/update-appointment.dto.js';
import { AppointmentQueryDto } from './dto/appointment-query.dto.js';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto.js';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  async getSchedulingConfig(clinicId: string) {
    const clinic = await this.clinicSettings(clinicId);
    return { timezone: clinic.timezone, workingHours: (clinic.extendedSettings as any)?.workingHours || {} };
  }

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
    if (status === undefined) return AppointmentStatus.SCHEDULED;
    if (typeof status !== 'string' || !status.trim()) throw new BadRequestException('Unsupported appointment status.');
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
        return AppointmentStatus.SCHEDULED;
      default:
        throw new BadRequestException('Unsupported appointment status.');
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
    if (priority === undefined) return AppointmentPriority.NORMAL;
    if (typeof priority !== 'string' || !priority.trim()) throw new BadRequestException('Unsupported appointment priority.');
    const p = priority.toLowerCase().trim();
    if (p === 'urgent') return AppointmentPriority.URGENT;
    if (p === 'emergency') return AppointmentPriority.EMERGENCY;
    if (p === 'normal') return AppointmentPriority.NORMAL;
    throw new BadRequestException('Unsupported appointment priority.');
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
      bookingRef: appt.bookingRef || undefined,
      revisitOfId: appt.revisitOfId || undefined,
      revision: appt.revision || 0,
      rescheduleHistory: appt.rescheduleHistory || [],
      statusHistory: appt.statusHistory || [],
      checkInTime: appt.checkInTime ? localParts(new Date(appt.checkInTime), timezone).time : undefined,
      consultationStartTime: appt.consultationStartTime ? localParts(new Date(appt.consultationStartTime), timezone).time : undefined,
      completedTime: appt.completedTime ? localParts(new Date(appt.completedTime), timezone).time : undefined,
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

  async createAppointment(clinicId: string, dto: CreateAppointmentDto, actorId?: string) {
    return this.scheduleMutation(clinicId, async (tx, clinic) => {
    if (dto.bookingRef) {
      const previous = await tx.appointment.findFirst({ where: { clinicId, bookingRef: dto.bookingRef }, include: { patient: true, doctor: true } });
      if (previous) return this.serializeAppointment(previous, clinic.timezone);
    }
    if (dto.revisitOfId) {
      const prior = await tx.appointment.findFirst({ where: { clinicId, id: dto.revisitOfId } });
      if (!prior || prior.status !== 'COMPLETED') throw new BadRequestException('A revisit must reference a completed visit in this clinic.');
      const patient = await tx.patient.findFirst({ where: { clinicId, OR: [{ id: dto.patientId }, { patientCode: dto.patientId }] } });
      if (!patient || patient.id !== prior.patientId) throw new BadRequestException('A revisit must belong to the same patient.');
    }
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
    if (!Number.isInteger(duration) || duration < 5 || duration > 1440) throw new BadRequestException('Duration must be between 5 and 1440 minutes.');
    const startTime = clinicInstant(dto.date, dto.time, clinic.timezone);
    if (isNaN(startTime.getTime())) {
      throw new BadRequestException('Invalid date or time format. Expected YYYY-MM-DD and HH:MM.');
    }
    const endTime = new Date(startTime.getTime() + duration * 60000);

    const status = this.parseStatus(dto.status);
    const priority = this.parsePriority(dto.priority);
    if (!['SCHEDULED', 'CONFIRMED', 'CHECKED_IN'].includes(status)) throw new BadRequestException('New appointments must be scheduled, confirmed or checked in.');

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
        bookingRef: dto.bookingRef || `APT-${randomBytes(3).toString('hex').toUpperCase()}`,
        revisitOfId: dto.revisitOfId || null,
        statusHistory: [{ status: this.formatStatus(status), timestamp: new Date().toISOString(), note: 'Appointment booked.', actorId: actorId || null }],
        ...(status === 'CHECKED_IN' ? { checkInTime: new Date() } : {}),
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

  async updateAppointment(clinicId: string, id: string, dto: UpdateAppointmentDto, actorId?: string) {
    return this.scheduleMutation(clinicId, async (tx, clinic) => {
    const existing = await this.getAppointment(clinicId, id, tx, clinic);
    if (dto.expectedRevision !== undefined && dto.expectedRevision !== existing.revision) throw new ConflictException('This appointment changed. Refresh it before trying again.');
    const nextStatus = dto.status !== undefined ? this.formatStatus(this.parseStatus(dto.status)) : existing.status;
    const moved = (dto.date !== undefined && dto.date !== existing.date) || (dto.time !== undefined && dto.time !== existing.time);
    const scheduleChanged = moved || dto.durationMinutes !== undefined || dto.doctorId !== undefined || dto.chair !== undefined;
    if (scheduleChanged && !['scheduled', 'confirmed'].includes(existing.status)) throw new BadRequestException('Only upcoming appointments can be rescheduled. Book a separate revisit for a completed visit.');
    if (!canTransition(existing.status, nextStatus)) throw new BadRequestException(`Cannot change ${existing.status} to ${nextStatus}.`);
    const reason = (dto.reason || dto.cancellationReason || '').trim();
    if (existing.status === 'cancelled' && reason && reason !== existing.cancellationReason) throw new BadRequestException('This appointment is already cancelled. Its cancellation reason is preserved.');
    if (nextStatus === 'cancelled' && existing.status !== 'cancelled' && !reason) throw new BadRequestException('Enter a reason for cancellation.');
    if (moved && !reason) throw new BadRequestException('Enter a reason for rescheduling.');
    const eventTime = new Date();
    const statusChanged = nextStatus !== existing.status;

    let startTime = new Date(existing.startTime);
    const duration = dto.durationMinutes ?? existing.durationMinutes;
    if (!Number.isInteger(duration) || duration < 5 || duration > 1440) throw new BadRequestException('Duration must be between 5 and 1440 minutes.');

    if (dto.date !== undefined || dto.time !== undefined) {
      const datePart = dto.date ?? existing.date;
      const timePart = dto.time ?? existing.time;
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

    if (scheduleChanged || dto.priority !== undefined || statusChanged)
    await this.assertSlot(tx, clinic, { startTime, endTime, doctorId: dto.doctorId ?? existing.doctorId, chair: dto.chair ?? existing.chair, priority: dto.priority ?? existing.priority, status: this.parseStatus(dto.status ?? existing.status) }, id);

    if (dto.status && ['IN_PROGRESS','COMPLETED'].includes(this.parseStatus(dto.status))) {
      if (nextStatus === 'in-progress' && existing.doctorId) {
        const appointmentDate = localParts(startTime, clinic.timezone).date;
        const { startOfDay, endOfDay } = this.parseDateRange(appointmentDate, clinic.timezone);
        const activeConsultation = await tx.appointment.findFirst({
          where: {
            clinicId,
            doctorId: existing.doctorId,
            status: AppointmentStatus.IN_PROGRESS,
            id: { not: id },
            startTime: { gte: startOfDay, lte: endOfDay },
          },
          include: { patient: { select: { firstName: true, lastName: true } } },
        });
        if (activeConsultation) {
          const patientName = activeConsultation.patient ? `${activeConsultation.patient.firstName} ${activeConsultation.patient.lastName}`.trim() : 'another patient';
          throw new BadRequestException(`This doctor already has an active consultation in progress with ${patientName}.`);
        }
      }
      const record = await tx.appointment.findFirst({ where: { id, clinicId }, select: { patientId: true, treatmentType: true } });
      if (record) await surgeryConsentPolicy(tx, clinicId, record.patientId, { procedureName: dto.treatmentType || record.treatmentType || '' });
    }
    const updated = await tx.appointment.update({
      where: { id },
      data: {
        revision: { increment: 1 },
        ...(moved ? { rescheduleHistory: [...existing.rescheduleHistory, { previousDate: existing.date, previousTime: existing.time, newDate: dto.date || existing.date, newTime: dto.time || existing.time, reason, changedAt: eventTime.toISOString(), actorId: actorId || null }] } : {}),
        ...(statusChanged || moved ? { statusHistory: [...existing.statusHistory, { status: nextStatus, timestamp: eventTime.toISOString(), note: reason || `Status updated to ${nextStatus}`, actorId: actorId || null }] } : {}),
        ...(nextStatus === 'cancelled' ? { cancellationReason: reason || existing.cancellationReason } : {}),
        ...(statusChanged && nextStatus === 'checked-in' ? { checkInTime: eventTime } : {}),
        ...(statusChanged && nextStatus === 'in-progress' ? { consultationStartTime: eventTime } : {}),
        ...(statusChanged && nextStatus === 'completed' ? { completedTime: eventTime } : {}),
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

  async cancelAppointment(clinicId: string, id: string, dto: CancelAppointmentDto, actorId?: string) {
    if (!dto.reason?.trim()) throw new BadRequestException('Enter a reason for cancellation.');
    return { message: 'Appointment successfully cancelled.', appointment: await this.updateAppointment(clinicId, id, { status: 'cancelled', reason: dto.reason }, actorId) };
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

