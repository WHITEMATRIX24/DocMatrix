import 'reflect-metadata';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { base32, totp, MfaService, authScope } from '../auth/mfa.service.js';
import { validNewPassword } from '../auth/password.policy.js';
import { sessionExpired, SESSION_ABSOLUTE_MS, SESSION_IDLE_MS } from '../auth/session.policy.js';
import { prescriptionPolicy, surgeryConsentPolicy } from '../common/clinical-governance.js';
import { retentionDue } from '../common/services/retention.service.js';
import { RateLimiterService } from '../common/services/rate-limiter.service.js';
import { AuthController } from '../auth/auth.controller.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';

afterEach(() => vi.unstubAllEnvs());
describe('Security hardening', () => {
  it('matches RFC 6238 SHA1 test vectors independently of clock time', () => {
    const secret = Buffer.from('12345678901234567890');
    for (const [seconds, code] of [[59,'94287082'],[1111111109,'07081804'],[1111111111,'14050471'],[1234567890,'89005924'],[2000000000,'69279037'],[20000000000,'65353130']] as const) {
      expect(totp(secret, Math.floor(seconds / 30), 8)).toBe(code);
    }
    expect(base32(Buffer.from('foo'))).toBe('MZXW6');
  });
  it('enrolls encrypted MFA, rejects replay and consumes recovery codes once', async () => {
    vi.stubEnv('AUTH_ENCRYPTION_KEY', randomBytes(32).toString('hex'));
    let user: any = { id: 'u', email: 'test@example.test', passwordHash: await bcrypt.hash('Synthetic-password-2026', 4), mfaEnabled: false, mfaLastStep: -1n, mfaRecoveryHashes: [] };
    const db: any = { user: {
      findUnique: vi.fn(async () => ({ ...user })),
      update: vi.fn(async ({ data }) => { user = { ...user, ...data }; return user; }),
      updateMany: vi.fn(async ({ where, data }) => {
        if (where.mfaLastStep !== undefined && where.mfaLastStep !== user.mfaLastStep) return { count: 0 };
        if (where.mfaRecoveryHashes && !user.mfaRecoveryHashes.includes(where.mfaRecoveryHashes.has)) return { count: 0 };
        user = { ...user, ...data }; return { count: 1 };
      }) }, userSession: { updateMany: vi.fn(async () => ({ count: 1 })) } };
    const mfa = new MfaService(db);
    const setup = await mfa.begin('u', 'Synthetic-password-2026');
    expect(user.mfaPendingSecret).not.toContain(setup.secret);
    expect(setup.uri).toContain('otpauth://');
    // Decode the public provisioning key to reproduce an authenticator's behavior.
    let value = 0, bits = 0; const bytes: number[] = [];
    for (const letter of setup.secret) { value = (value << 5) | 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(letter); bits += 5; if (bits >= 8) { bits -= 8; bytes.push((value >>> bits) & 255); } }
    const code = totp(Buffer.from(bytes), Math.floor(Date.now() / 30000));
    const confirmed = await mfa.confirm('u', code);
    expect(user.mfaEnabled).toBe(true);
    expect(db.userSession.updateMany).toHaveBeenCalled();
    await expect(mfa.verify('u', code)).rejects.toThrow(/already used/);
    await mfa.verify('u', confirmed.recoveryCodes[0]);
    await expect(mfa.verify('u', confirmed.recoveryCodes[0])).rejects.toThrow();
  });
  it('limits production unverified accounts to setup and requires administrator MFA', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(authScope({ role: 'ORGANIZATION_ADMIN' })).toBe('account-setup');
    expect(authScope({ role: 'ORGANIZATION_ADMIN', emailVerifiedAt: new Date(), mfaEnabled: true })).toBe('full');
    expect(authScope({ role: 'DOCTOR', emailVerifiedAt: new Date() })).toBe('full');
  });
  it('blocks setup-only sessions from records while allowing enrollment', async () => {
    const req: any = { user: { authScope: 'account-setup' }, path: '/patients' };
    const context: any = { getHandler: () => () => {}, getClass: () => class {}, switchToHttp: () => ({ getRequest: () => req }) };
    const guard = new JwtAuthGuard();
    await expect(guard.canActivate(context)).rejects.toThrow(/Complete email/);
    req.path = '/auth/mfa/setup'; expect(await guard.canActivate(context)).toBe(true);
    req.path = '/auth/email/request'; expect(await guard.canActivate(context)).toBe(true);
  });
  it('rejects truncating Unicode passwords consistently', () => {
    expect(validNewPassword('a'.repeat(12))).toBe(true);
    expect(validNewPassword('a'.repeat(73))).toBe(false);
    expect(validNewPassword('😀'.repeat(19))).toBe(false);
    expect(validNewPassword('short')).toBe(false);
  });
  it('enforces idle and absolute lifetime even when refresh expiry is in the future', () => {
    const now = Date.now(), future = new Date(now + 86400000);
    expect(sessionExpired({ expiresAt: future, createdAt: new Date(now - SESSION_ABSOLUTE_MS), lastActiveAt: new Date(now) }, now)).toBe(true);
    expect(sessionExpired({ expiresAt: future, createdAt: new Date(now - SESSION_IDLE_MS), lastActiveAt: new Date(now - SESSION_IDLE_MS) }, now)).toBe(true);
  });
  it('never silently substitutes memory for missing production Redis', () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('REDIS_URL', ''); vi.stubEnv('RATE_LIMIT_STORE', 'redis');
    expect(() => new RateLimiterService()).toThrow(/Production requires/);
  });
  it('normalizes equivalent compressed IPv6 hosts into the same rate-limit subnet', async () => {
    vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('REDIS_URL', ''); vi.stubEnv('RATE_LIMIT_STORE', 'memory');
    const limiter = new RateLimiterService();
    expect(limiter.getIpSubnetPrefix('2001:db8::1')).toBe(limiter.getIpSubnetPrefix('2001:db8::2'));
    expect(limiter.getIpSubnetPrefix('2001:db8::1')).toBe(limiter.getIpSubnetPrefix('2001:0db8:0000:0000:abcd:0000:0000:0001'));
    await limiter.onModuleDestroy();
  });
  it('uses the verified peer IP rather than a forged forwarded header', async () => {
    const auth: any = { login: vi.fn(async () => ({ token: 't' })) };
    await new AuthController(auth).login({ ip: '192.0.2.1', headers: { 'x-forwarded-for': '203.0.113.5' }, socket: { remoteAddress: '192.0.2.1' } } as any, {} as any, { email: 'a@example.test', password: 'anything' });
    expect(auth.login.mock.calls[0][1].ipAddress).toBe('192.0.2.1');
  });
  it('blocks prescription finalization without recent session MFA when required', async () => {
    const db: any = { clinic: { findUnique: async () => ({ clinicalConfig: { governancePolicies: { twoFactorForPrescriptions: true } } }) }, userSession: { findFirst: vi.fn(async () => null) } };
    await expect(prescriptionPolicy(db, 'c', 'u', 's', 'Diagnosis')).rejects.toThrow(/authenticator/);
    expect(db.userSession.findFirst.mock.calls[0][0].where).toMatchObject({ userId: 'u', clinicId: 'c', isRevoked: false });
    await expect(prescriptionPolicy(db, 'c', 'u', 's', '')).rejects.toThrow(/diagnosis/);
  });
  it('requires procedure-specific signed evidence before surgical work', async () => {
    const db: any = { clinic: { findUnique: async () => ({ clinicalConfig: {} }) }, patientConsent: { findFirst: vi.fn(async () => null) } };
    await expect(surgeryConsentPolicy(db, 'c', 'p', { procedureName: 'Implant', category: 'Surgery' })).rejects.toThrow(/signed consent/);
    expect(db.patientConsent.findFirst.mock.calls[0][0].where).toMatchObject({
      clinicId: 'c',
      patientId: 'p',
      status: { in: expect.arrayContaining(['Signed', 'PATIENT_SIGNED', 'DENTIST_VERIFIED', 'COMPLETED']) },
      evidenceHash: { not: null },
    });
  });
  it('preserves legal holds and pediatric minimums while marking overdue adult records', () => {
    const patient = { dateOfBirth: new Date('1980-01-01'), createdAt: new Date('2000-01-01'), lastVisit: new Date('2010-01-01') };
    expect(retentionDue(patient, { retentionAdult: '7' }, new Date('2026-01-01'))).toBe(true);
    expect(retentionDue({ ...patient, legalHold: true }, { retentionAdult: '7' })).toBe(false);
    expect(retentionDue(patient, { retentionAdult: 'indefinite' })).toBe(false);
    expect(retentionDue({ dateOfBirth: new Date('2010-01-01'), createdAt: new Date('2011-01-01') }, { retentionMinor: '25' }, new Date('2026-01-01'))).toBe(false);
  });
});
