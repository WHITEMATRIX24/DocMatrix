import { describe, expect, it, vi } from 'vitest';
import { clinicInstant, localParts } from '../common/clinic-time.js';
import { AppointmentsService } from './appointments.service.js';
describe('Scheduling integrity', () => {
  it('round-trips clinic wall time across the UTC date boundary', () => {
    const instant = clinicInstant('2026-11-02', '00:15', 'Asia/Kolkata');
    expect(instant.toISOString()).toBe('2026-11-01T18:45:00.000Z');
    expect(localParts(instant, 'Asia/Kolkata')).toEqual({ date: '2026-11-02', time: '00:15' });
  });
  it('rejects an overlapping doctor or chair before writing', async () => {
    const db: any = { clinic: { findUnique: vi.fn().mockResolvedValue({ id: 'c', timezone: 'Asia/Kolkata', extendedSettings: {} }) }, $queryRaw: vi.fn(), patient: { findFirst: vi.fn().mockResolvedValue({ id: 'p' }) }, user: { findFirst: vi.fn().mockResolvedValue({ id: 'd' }) }, appointment: { findFirst: vi.fn().mockResolvedValue({ id: 'existing' }), create: vi.fn() } };
    db.$transaction = (cb: any) => cb(db);
    await expect(new AppointmentsService(db).createAppointment('c', { patientId: 'p', doctorId: 'd', chair: 'Chair 1', date: '2026-11-02', time: '10:00' })).rejects.toThrow('overlapping');
    expect(db.appointment.create).not.toHaveBeenCalled();
    expect(db.appointment.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ clinicId: 'c', OR: [{ doctorId: 'd' }, { operatoryChair: 'Chair 1' }] }) }));
  });
  it('rejects a closed-day booking before writing', async () => {
    const db: any = { clinic: { findUnique: vi.fn().mockResolvedValue({ id: 'c', timezone: 'Asia/Kolkata', extendedSettings: {} }) }, $queryRaw: vi.fn(), patient: { findFirst: vi.fn().mockResolvedValue({ id: 'p' }) }, appointment: { create: vi.fn() } };
    db.$transaction = (cb: any) => cb(db);
    await expect(new AppointmentsService(db).createAppointment('c', { patientId: 'p', date: '2026-11-01', time: '10:00' })).rejects.toThrow('closed');
    expect(db.appointment.create).not.toHaveBeenCalled();
  });
});
