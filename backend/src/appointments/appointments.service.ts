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

  private serializeAppointment(appt: any) {
    const start = new Date(appt.startTime);
    const dateStr = start.toISOString().slice(0, 10);
    const timeStr = `${String(start.getUTCHours()).padStart(2, '0')}:${String(start.getUTCMinutes()).padStart(2, '0')}`;

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

  private parseDateRange(dateStr: string): { startOfDay: Date; endOfDay: Date } {
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`);
    return { startOfDay, endOfDay };
  }

  async listAppointments(clinicId: string, query: AppointmentQueryDto) {
    const where: any = { clinicId };

    if (query.date) {
      const { startOfDay, endOfDay } = this.parseDateRange(query.date);
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

    return appts.map((a) => this.serializeAppointment(a));
  }

  async getAppointment(clinicId: string, id: string) {
    const appt = await this.prisma.appointment.findFirst({
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

    return this.serializeAppointment(appt);
  }

  async createAppointment(clinicId: string, dto: CreateAppointmentDto) {
    // 1. Cross-clinic patient validation
    const patient = await this.prisma.patient.findFirst({
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
      const doctorUser = await this.prisma.user.findFirst({
        where: {
          clinicId,
          fullName: { contains: dto.doctorName.trim(), mode: 'insensitive' },
        },
      });
      if (doctorUser) {
        resolvedDoctorId = doctorUser.id;
      }
    }

    if (resolvedDoctorId) {
      const doctor = await this.prisma.user.findFirst({
        where: { id: resolvedDoctorId, clinicId },
      });
      if (!doctor) {
        throw new BadRequestException('Invalid doctor: Doctor does not belong to your clinic.');
      }
    }

    // 3. Date & time calculation
    const duration = dto.durationMinutes || 30;
    const startIso = `${dto.date}T${dto.time}:00.000Z`;
    const startTime = new Date(startIso);
    if (isNaN(startTime.getTime())) {
      throw new BadRequestException('Invalid date or time format. Expected YYYY-MM-DD and HH:MM.');
    }
    const endTime = new Date(startTime.getTime() + duration * 60000);

    const status = this.parseStatus(dto.status);
    const priority = this.parsePriority(dto.priority);

    const created = await this.prisma.appointment.create({
      data: {
        clinicId,
        patientId: dto.patientId,
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

    return this.serializeAppointment(created);
  }

  async updateAppointment(clinicId: string, id: string, dto: UpdateAppointmentDto) {
    const existing = await this.getAppointment(clinicId, id);

    let startTime = new Date(existing.startTime);
    let duration = dto.durationMinutes ?? existing.durationMinutes;

    if (dto.date || dto.time) {
      const datePart = dto.date || existing.date;
      const timePart = dto.time || existing.time;
      startTime = new Date(`${datePart}T${timePart}:00.000Z`);
    }

    const endTime = new Date(startTime.getTime() + duration * 60000);

    if (dto.doctorId) {
      const doctor = await this.prisma.user.findFirst({
        where: { id: dto.doctorId, clinicId },
      });
      if (!doctor) {
        throw new BadRequestException('Invalid doctor: Doctor does not belong to your clinic.');
      }
    }

    const updated = await this.prisma.appointment.update({
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

    return this.serializeAppointment(updated);
  }

  async cancelAppointment(clinicId: string, id: string, dto: CancelAppointmentDto) {
    await this.getAppointment(clinicId, id);

    const cancelled = await this.prisma.appointment.update({
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
      appointment: this.serializeAppointment(cancelled),
    };
  }

  async getLiveQueue(clinicId: string, dateStr?: string) {
    const todayStr = dateStr || new Date().toISOString().slice(0, 10);
    const { startOfDay, endOfDay } = this.parseDateRange(todayStr);

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

    const serialized = appts.map((a) => this.serializeAppointment(a));

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

