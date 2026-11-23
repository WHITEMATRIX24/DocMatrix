import { randomBytes } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { JWT_ALGORITHM } from '../common/config/jwt.config.js';

describe('Logout token authentication', () => {
  let jwt: JwtService, auth: AuthService, sessions: any;
  beforeEach(() => {
    jwt = new JwtService({ secret: randomBytes(32).toString('hex'), signOptions: { algorithm: JWT_ALGORITHM } });
    sessions = { revokeOwnedSession: vi.fn(async () => true), revokeSession: vi.fn(), revokeSessionByRefreshToken: vi.fn(async () => true) };
    auth = new AuthService({} as any, jwt, sessions, undefined, { recordEvent: vi.fn() } as any);
  });
  it.each(['unsigned', 'wrong signature', 'wrong algorithm', 'tampered payload'])('ignores a bearer with %s', async kind => {
    const claims = { sub: 'victim-user', sessionId: 'victim-session' };
    let token: string;
    if (kind === 'unsigned') token = `${Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url')}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.`;
    else if (kind === 'wrong signature') token = new JwtService({ secret: randomBytes(32).toString('hex') }).sign(claims);
    else if (kind === 'wrong algorithm') token = jwt.sign(claims, { algorithm: 'HS384' });
    else {
      const parts = jwt.sign({ sub: 'attacker', sessionId: 'attacker-session' }).split('.');
      parts[1] = Buffer.from(JSON.stringify(claims)).toString('base64url'); token = parts.join('.');
    }
    await expect(auth.logout(`Bearer ${token}`)).resolves.toMatchObject({ success: true });
    expect(sessions.revokeOwnedSession).not.toHaveBeenCalled(); expect(sessions.revokeSession).not.toHaveBeenCalled();
  });
  it.each([{ sub: 'user' }, { sessionId: 'session' }, { sub: 123, sessionId: 'session' }, { sub: 'user', sessionId: {} }, { sub: ' ', sessionId: 'session' }])('ignores signed malformed identifiers %#', async claims => {
    await auth.logout(`Bearer ${jwt.sign(claims)}`);
    expect(sessions.revokeOwnedSession).not.toHaveBeenCalled();
  });
  it.each([false, true])('revokes only the verified subject/session pair, expired=%s', async expired => {
    const token = jwt.sign({ sub: 'user', sessionId: 'session' }, { expiresIn: expired ? -10 : 60 });
    await auth.logout(`Bearer ${token}`);
    expect(sessions.revokeOwnedSession).toHaveBeenCalledExactlyOnceWith('session', 'user');
    expect(sessions.revokeSession).not.toHaveBeenCalled();
  });
  it('still revokes through a valid refresh token when the bearer is invalid', async () => {
    await auth.logout('Bearer forged', 'synthetic-refresh-token');
    expect(sessions.revokeSessionByRefreshToken).toHaveBeenCalledExactlyOnceWith('synthetic-refresh-token', 'User logged out');
  });
  it('does not claim successful server revocation if persistence fails', async () => {
    sessions.revokeOwnedSession.mockRejectedValue(new Error('Synthetic storage outage'));
    await expect(auth.logout(`Bearer ${jwt.sign({ sub: 'user', sessionId: 'session' })}`)).rejects.toThrow('Synthetic storage outage');
  });
});
