import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { ClinicalService } from '../clinical/clinical.service.js';
import { SessionService } from '../auth/session.service.js';
import { SESSION_IDLE_MS } from '../auth/session.policy.js';

const url = process.env.BATCH1_DATABASE_URL;
if (url) { const target = new URL(url); if (target.hostname !== '127.0.0.1' || target.port !== '55440' || target.username !== 'batch_security' || target.searchParams.get('schema') !== 'batch1_security') throw new Error('Disposable local database required.'); }
describe.skipIf(!url)('Security controls on real PostgreSQL', () => {
  let db: PrismaClient, clinic: any, patient: any, user: any;
  beforeAll(async () => {
    db = new PrismaClient({ datasources: { db: { url } } });
    clinic = await db.clinic.create({ data: { name: 'Synthetic security clinic', slug: randomUUID(), email: 'test@example.test', phone: '000' } });
    patient = await db.patient.create({ data: { clinicId: clinic.id, patientCode: 'SEC-1', firstName: 'Synthetic', lastName: 'Patient', dateOfBirth: new Date('2000-01-01'), mobile: '000' } });
    user = await db.user.create({ data: { clinicId: clinic.id, fullName: 'Synthetic clinician', email: `${randomUUID()}@example.test`, passwordHash: 'not-a-login-hash', role: 'DOCTOR' } });
  });
  afterAll(async () => { await db?.$disconnect(); });
  it('requires signed evidence, preserves revisions and revokes instead of deleting', async () => {
    const service = new ClinicalService(db as any);
    await expect(service.createConsent(clinic.id, patient.id, { consentType: 'Implant', status: 'Signed' }, user)).rejects.toThrow(/wording/);
    const consent = await service.createConsent(clinic.id, patient.id, { consentType: 'Implant', status: 'Signed', consentText: 'I consent to the Implant procedure after risks and alternatives were explained.', signatureData: 'Synthetic signature evidence' }, user);
    await expect(service.updateConsent(clinic.id, patient.id, consent.id, { signatureData: 'replacement' }, user)).rejects.toThrow(/immutable/);
    await service.deleteConsent(clinic.id, patient.id, consent.id, user);
    expect(await db.patientConsent.findUnique({ where: { id: consent.id } })).toMatchObject({ status: 'Revoked', signatureData: 'Synthetic signature evidence' });
    const history = await db.consentRevision.findMany({ where: { consentId: consent.id } });
    expect(history).toHaveLength(3);
    await expect(db.consentRevision.update({ where: { id: history[0].id }, data: { action: 'TAMPERED' } })).rejects.toThrow(/append only/);
    await expect(db.consentRevision.delete({ where: { id: history[0].id } })).rejects.toThrow(/append only/);
    await expect(service.consentHistory('foreign-clinic', patient.id, consent.id)).rejects.toThrow();
  });
  it('protects audit content while permitting outbox delivery metadata updates', async () => {
    const event = await db.auditEvent.create({ data: { id: randomUUID(), clinicId: clinic.id, module: 'Security', action: 'SYNTHETIC_EVENT', actorId: user.id, actorName: user.fullName, actorRole: user.role, description: 'Synthetic immutable audit', severity: 'info', outcome: 'SUCCESS' } });
    await expect(db.auditEvent.update({ where: { id: event.id }, data: { description: 'tampered' } })).rejects.toThrow(/append only/);
    await expect(db.auditEvent.delete({ where: { id: event.id } })).rejects.toThrow(/append only/);
    await db.auditEvent.update({ where: { id: event.id }, data: { forwardedAt: new Date(), forwardAttempts: 1 } });
  });
  it('rejects idle sessions on protected access and token renewal', async () => {
    const sessions = new SessionService(db as any);
    const created = await sessions.createSession(user.id, clinic.id);
    await db.userSession.update({ where: { id: created.session.id }, data: { lastActiveAt: new Date(Date.now() - SESSION_IDLE_MS - 1000) } });
    expect(await sessions.isSessionValid(created.session.id, user.id)).toBe(false);
    await expect(sessions.rotateRefreshToken(created.refreshToken)).rejects.toThrow(/expired/);
  });
});
