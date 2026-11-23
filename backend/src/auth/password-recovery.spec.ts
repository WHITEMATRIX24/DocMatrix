import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PasswordRecoveryService } from './password-recovery.service.js';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe('Password recovery', () => {
  it('reports unavailable delivery honestly without creating a token', async () => {
    vi.stubEnv('PASSWORD_RESET_DELIVERY_URL', '');
    const db: any = { passwordReset: { create: vi.fn() } };
    await expect(new PasswordRecoveryService(db).request('synthetic@example.test')).rejects.toThrow('not configured');
    expect(db.passwordReset.create).not.toHaveBeenCalled();
  });
  it('stores only a hash and delivers an expiring link through the configured adapter', async () => {
    vi.stubEnv('PASSWORD_RESET_DELIVERY_URL', 'https://delivery.example.test/reset');
    vi.stubEnv('PASSWORD_RESET_DELIVERY_KEY', 'synthetic-key');
    vi.stubEnv('PUBLIC_APP_URL', 'https://app.example.test');
    const deliver = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal('fetch', deliver);
    const db: any = { user: { findUnique: vi.fn().mockResolvedValue({ id: 'u', email: 'synthetic@example.test', isActive: true }) }, passwordReset: { create: vi.fn().mockResolvedValue({ id: 'r' }) } };
    await new PasswordRecoveryService(db).request('synthetic@example.test');
    const payload = JSON.parse(deliver.mock.calls[0][1].body);
    const link = new URL(payload.resetUrl);
    expect(link.search).toBe('');
    const token = new URLSearchParams(link.hash.slice(1)).get('token')!;
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(db.passwordReset.create.mock.calls[0][0].data.tokenHash).toBe(createHash('sha256').update(token).digest('hex'));
    expect(JSON.stringify(db.passwordReset.create.mock.calls)).not.toContain(token);
  });
  it('claims a reset once, changes the password and revokes sessions', async () => {
    const db: any = {
      passwordReset: { findUnique: vi.fn().mockResolvedValue({ id: 'r', userId: 'u', expiresAt: new Date(Date.now() + 60000) }), updateMany: vi.fn().mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 }).mockResolvedValue({ count: 0 }) },
      user: { findUnique: vi.fn().mockResolvedValue({ id: 'u', isActive: true }), update: vi.fn() },
      userSession: { updateMany: vi.fn() },
    };
    db.$transaction = (cb: any) => cb(db);
    const service = new PasswordRecoveryService(db);
    await service.complete('a'.repeat(64), 'Synthetic-password-2026');
    expect(await bcrypt.compare('Synthetic-password-2026', db.user.update.mock.calls[0][0].data.passwordHash)).toBe(true);
    expect(db.userSession.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u', isRevoked: false } }));
    await expect(service.complete('a'.repeat(64), 'Another-password-2026')).rejects.toThrow('already been used');
    expect(db.user.update).toHaveBeenCalledTimes(1);
  });
});
