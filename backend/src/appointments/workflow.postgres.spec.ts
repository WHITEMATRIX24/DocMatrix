import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { AppointmentsService } from './appointments.service.js';
import { PrescriptionsService } from '../prescriptions/prescriptions.service.js';

const url = process.env.BATCH1_DATABASE_URL;
if (url) {
  const target = new URL(url);
  if (target.hostname !== '127.0.0.1' || target.port !== '55440' || target.username !== 'batch_security' || target.searchParams.get('schema') !== 'batch1_security') throw new Error('Disposable local database required.');
}
describe.skipIf(!url)('Appointment workflows on PostgreSQL', () => {
  let db: PrismaClient, service: AppointmentsService, clinic: any, patient: any, doctor: any;
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url } } });
    clinic = await db.clinic.create({ data: { name: 'Synthetic appointment clinic', slug: randomUUID(), email: 'test@example.test', phone: '000', timezone: 'Asia/Kolkata' } });
    patient = await db.patient.create({ data: { clinicId: clinic.id, patientCode: 'APT-TEST-PATIENT', firstName: 'Synthetic', lastName: 'Patient', dateOfBirth: new Date('2000-01-01'), mobile: '000' } });
    doctor = await db.user.create({ data: { clinicId: clinic.id, fullName: 'Synthetic Doctor', email: `${randomUUID()}@example.test`, passwordHash: 'not-a-login-hash', role: 'DOCTOR' } });
    service = new AppointmentsService(db as any);
  });
  afterAll(async () => { await db?.$disconnect(); });
  const booking = (extra: Record<string, unknown> = {}) => service.createAppointment(clinic.id, { patientId: patient.id, doctorId: doctor.id, chair: 'Chair 1', date: '2030-01-07', time: '10:00', ...extra }, doctor.id);
  async function complete(id: string) {
    await service.updateAppointment(clinic.id, id, { status: 'checked-in' }, doctor.id);
    await service.updateAppointment(clinic.id, id, { status: 'in-progress' }, doctor.id);
    return service.updateAppointment(clinic.id, id, { status: 'completed' }, doctor.id);
  }
  it('preserves the completed visit when its linked revisit moves and persists history across reads', async () => {
    const first = await booking(); await complete(first.id);
    const revisit = await booking({ date: '2030-01-08', revisitOfId: first.id });
    const moved = await service.updateAppointment(clinic.id, revisit.id, { date: '2030-01-09', time: '11:00', reason: 'Patient travel', expectedRevision: 0 }, doctor.id);
    expect(moved.revision).toBe(1);
    const original = await service.getAppointment(clinic.id, first.id);
    expect(original).toMatchObject({ status: 'completed', date: '2030-01-07', time: '10:00', checkInTime: expect.any(String), completedTime: expect.any(String) });
    const refreshed = await service.getAppointment(clinic.id, revisit.id);
    expect(refreshed).toMatchObject({ date: '2030-01-09', time: '11:00', revisitOfId: first.id });
    expect(refreshed.rescheduleHistory).toEqual([expect.objectContaining({ previousDate: '2030-01-08', newDate: '2030-01-09', reason: 'Patient travel', actorId: doctor.id })]);
    await expect(service.updateAppointment(clinic.id, first.id, { date: '2030-01-10', status: 'scheduled', reason: 'Attempted overwrite' })).rejects.toThrow('separate revisit');
  });
  it('rejects a stale revision without overwriting a confirmed slot', async () => {
    const a = await booking({ date: '2030-01-10' });
    await service.updateAppointment(clinic.id, a.id, { time: '11:00', reason: 'First edit', expectedRevision: 0 });
    await expect(service.updateAppointment(clinic.id, a.id, { time: '12:00', reason: 'Stale edit', expectedRevision: 0 })).rejects.toThrow('changed');
    expect(await service.getAppointment(clinic.id, a.id)).toMatchObject({ time: '11:00', revision: 1 });
  });
  it('serializes simultaneous bookings of the same doctor and chair', async () => {
    const results = await Promise.allSettled([booking({ date: '2030-01-11' }), booking({ date: '2030-01-11' })]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(r => r.status === 'rejected')).toHaveLength(1);
  });
  it('reuses a persisted booking reference after a lost response', async () => {
    const bookingRef = randomUUID();
    const a = await booking({ date: '2030-01-12', bookingRef });
    const retried = await booking({ date: '2030-01-12', bookingRef });
    expect(retried.id).toBe(a.id);
    expect(await db.appointment.count({ where: { clinicId: clinic.id, bookingRef } })).toBe(1);
  });
  it('persists the cancellation reason and releases the slot', async () => {
    const a = await booking({ date: '2030-01-14' });
    await service.cancelAppointment(clinic.id, a.id, { reason: ' Patient unavailable ' }, doctor.id);
    expect(await service.getAppointment(clinic.id, a.id)).toMatchObject({ status: 'cancelled', cancellationReason: 'Patient unavailable' });
    expect((await booking({ date: '2030-01-14' })).id).not.toBe(a.id);
  });
  it('enforces patient and clinic identity for revisit links', async () => {
    const prior = await booking({ date: '2030-01-15' }); await complete(prior.id);
    const other = await db.patient.create({ data: { clinicId: clinic.id, patientCode: 'APT-OTHER', firstName: 'Other', lastName: 'Patient', dateOfBirth: new Date('2000-01-01'), mobile: '000' } });
    await expect(booking({ date: '2030-01-16', patientId: other.id, revisitOfId: prior.id })).rejects.toThrow('same patient');
    await expect(booking({ date: '2030-01-16', revisitOfId: randomUUID() })).rejects.toThrow('completed visit');
  });
  it('preserves the prescription diagnosis and its finalized consultation after a fresh read', async () => {
    const note = await db.clinicalNote.create({ data: { clinicId: clinic.id, patientId: patient.id, doctorId: doctor.id,
      noteNumber: 'CN-RX-LINK', chiefComplaint: 'Synthetic recorded complaint', primaryDiagnosis: 'Recorded consultation diagnosis', status: 'FINALIZED' } });
    const prescription = await new PrescriptionsService(db as any).createPrescription(clinic.id, doctor, {
      patientId: patient.id, clinicalNoteId: note.id, diagnosis: note.primaryDiagnosis,
      items: [{ medicineName: 'Synthetic medicine', dosage: 'Recorded dosage', frequency: 'Recorded frequency', duration: 'Recorded duration' }],
    });
    expect(await db.prescription.findUnique({ where: { id: prescription.id } })).toMatchObject({ clinicalNoteId: note.id, diagnosis: note.primaryDiagnosis });
    await expect(db.clinicalNote.delete({ where: { id: note.id } })).rejects.toThrow();
  });
});
