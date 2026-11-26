import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppointmentsService } from './appointments.service.js';

// Regression coverage for appointment safety invariants.
// All database access is mocked; no live clinic records are read or changed.
describe('Appointment workflow safety', () => {
  let record: any, db: any, service: AppointmentsService;
  beforeEach(() => {
    record = { id: 'audit-a', clinicId: 'audit-c', patientId: 'audit-p', doctorId: 'audit-d',
      startTime: new Date('2030-01-07T10:00:00Z'), endTime: new Date('2030-01-07T10:30:00Z'),
      durationMinutes: 30, operatoryChair: 'Chair 1', status: 'SCHEDULED', priority: 'NORMAL',
      createdAt: new Date('2030-01-01T00:00:00Z'), updatedAt: new Date('2030-01-01T00:00:00Z'),
      doctor: { fullName: 'Audit Doctor' }, patient: { firstName: 'Audit', lastName: 'Patient' } };
    db = { $queryRaw: vi.fn(), clinic: { findUnique: vi.fn().mockResolvedValue({ id: 'audit-c', timezone: 'UTC', extendedSettings: {} }) },
      appointment: { findFirst: vi.fn().mockImplementation(({ where }: any) => where.id === 'audit-a' ? Promise.resolve(record) : Promise.resolve(null)),
        update: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ ...record, ...data })) } };
    db.$transaction = (work: any) => work(db);
    service = new AppointmentsService(db);
  });
  it('rejects a reschedule when another doctor or chair booking overlaps', async () => {
    db.appointment.findFirst.mockImplementation(({ where }: any) => Promise.resolve(where.id === 'audit-a' ? record : { id: 'overlap' }));
    await expect(service.updateAppointment('audit-c', 'audit-a', { date: '2030-01-08', time: '11:00', reason: 'Patient requested' })).rejects.toThrow('overlapping');
    expect(db.appointment.update).not.toHaveBeenCalled();
  });
  it('rejects an invalid calendar date', async () => {
    await expect(service.updateAppointment('audit-c', 'audit-a', { date: '2030-02-30', reason: 'Patient requested' })).rejects.toThrow('Invalid calendar date');
    expect(db.appointment.update).not.toHaveBeenCalled();
  });
  it('A01: completed appointments cannot be moved and reopened', async () => {
    record.status = 'COMPLETED';
    await expect(service.updateAppointment('audit-c', 'audit-a', { date: '2030-01-08', time: '11:00', status: 'SCHEDULED' })).rejects.toThrow();
  });
  it('A10: cancelled appointments cannot jump straight to completed', async () => {
    record.status = 'CANCELLED';
    await expect(service.updateAppointment('audit-c', 'audit-a', { status: 'COMPLETED' })).rejects.toThrow();
  });
  it('A13: generic status updates cannot cancel without a reason', async () => {
    await expect(service.updateAppointment('audit-c', 'audit-a', { status: 'cancelled' })).rejects.toThrow();
  });
  it('A13: the cancellation service rejects whitespace-only reasons', async () => {
    await expect(service.cancelAppointment('audit-c', 'audit-a', { reason: '   ' })).rejects.toThrow();
  });
  it('A19: unknown statuses are rejected instead of silently becoming scheduled', async () => {
    await expect(service.updateAppointment('audit-c', 'audit-a', { status: 'typo-status' })).rejects.toThrow();
  });
  it.each(['', '   ', null])('rejects an empty status %j without reopening a completed visit', async status => {
    record.status = 'COMPLETED';
    await expect(service.updateAppointment('audit-c', 'audit-a', { status } as any)).rejects.toThrow('Unsupported appointment status');
    expect(db.appointment.update).not.toHaveBeenCalled();
  });
  it('A20: downgrading an emergency outside clinic hours revalidates the slot', async () => {
    record.priority = 'EMERGENCY'; record.startTime = new Date('2030-01-07T23:00:00Z'); record.endTime = new Date('2030-01-07T23:30:00Z');
    await expect(service.updateAppointment('audit-c', 'audit-a', { priority: 'normal' })).rejects.toThrow('working hours');
  });
});
