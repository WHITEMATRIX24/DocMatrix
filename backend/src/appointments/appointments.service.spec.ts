import { describe, it, expect, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service.js';

describe('AppointmentsService - Cross-Clinic Isolation & Mapping', () => {
  let service: AppointmentsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      appointment: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      patient: {
        findFirst: vi.fn(),
      },
      user: {
        findFirst: vi.fn(),
      },
    };
    service = new AppointmentsService(mockPrisma);
  });

  it('rejects appointment creation if patient belongs to another clinic', async () => {
    mockPrisma.patient.findFirst.mockResolvedValue(null); // Patient not found in this clinic

    await expect(
      service.createAppointment('clinic-A', {
        patientId: 'patient-from-clinic-B',
        date: '2026-11-01',
        time: '10:00',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects appointment creation if doctor belongs to another clinic', async () => {
    mockPrisma.patient.findFirst.mockResolvedValue({ id: 'patient-A', clinicId: 'clinic-A' });
    mockPrisma.user.findFirst.mockResolvedValue(null); // Doctor not found in clinic-A

    await expect(
      service.createAppointment('clinic-A', {
        patientId: 'patient-A',
        doctorId: 'doctor-from-clinic-B',
        date: '2026-11-01',
        time: '10:00',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates appointment when patient and doctor belong to the same clinic', async () => {
    mockPrisma.patient.findFirst.mockResolvedValue({ id: 'p-1', clinicId: 'c-1' });
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'd-1', clinicId: 'c-1' });
    mockPrisma.appointment.create.mockResolvedValue({
      id: 'apt-1',
      clinicId: 'c-1',
      patientId: 'p-1',
      doctorId: 'd-1',
      startTime: new Date('2026-11-01T10:00:00.000Z'),
      endTime: new Date('2026-11-01T10:30:00.000Z'),
      durationMinutes: 30,
      operatoryChair: 'Chair 1',
      treatmentType: 'Root Canal',
      visitType: 'Consultation',
      status: 'CHECKED_IN',
      priority: 'NORMAL',
      notes: 'Test',
      isWalkIn: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      patient: { firstName: 'John', lastName: 'Doe', patientCode: 'pt-1001', mobile: '9999999999' },
      doctor: { id: 'd-1', fullName: 'Dr. Smith', role: 'DOCTOR' },
    });

    const result = await service.createAppointment('c-1', {
      patientId: 'p-1',
      doctorId: 'd-1',
      date: '2026-11-01',
      time: '10:00',
      status: 'checked-in',
    });

    expect(result.id).toBe('apt-1');
    expect(result.status).toBe('checked-in'); // Formatted to frontend lowercase convention
    expect(result.date).toBe('2026-11-01');
    expect(result.time).toBe('10:00');
    expect(result.doctor).toBe('Dr. Smith');
  });
});

