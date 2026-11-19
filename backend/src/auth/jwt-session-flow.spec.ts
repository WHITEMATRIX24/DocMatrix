import { randomBytes } from 'node:crypto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtStrategy, JwtPayload } from './jwt.strategy.js';
import { SessionService } from './session.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { getJwtSecret, JWT_ALGORITHM } from '../common/config/jwt.config.js';

function createMockPrisma() {
  const sessions = new Map<string, any>();

  const userSession = {
    create: vi.fn(async ({ data }: any) => {
      const record = {
        id: `sess-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        ...data,
      };
      sessions.set(record.id, record);
      return { ...record };
    }),
    findFirst: vi.fn(async ({ where }: any) => {
      for (const sess of sessions.values()) {
        if (where?.tokenHash && sess.tokenHash === where.tokenHash)
          return { ...sess };
        if (
          where?.previousTokenHashes?.has &&
          sess.previousTokenHashes &&
          sess.previousTokenHashes.includes(where.previousTokenHashes.has)
        ) {
          return { ...sess };
        }
      }
      return null;
    }),
    findUnique: vi.fn(async ({ where }: any) => {
      const sess = sessions.get(where.id);
      return sess ? { ...sess } : null;
    }),
    update: vi.fn(async ({ where, data }: any) => {
      const sess = sessions.get(where.id);
      if (!sess) throw new Error('Not found');
      const updated = { ...sess, ...data };
      sessions.set(where.id, updated);
      return { ...updated };
    }),
    updateMany: vi.fn(async ({ where, data }: any) => {
      let count = 0;
      for (const [id, sess] of sessions.entries()) {
        const userMatches = !where.userId || sess.userId === where.userId;
        const familyMatches =
          !where.familyId || sess.familyId === where.familyId;
        const revokedMatches =
          where.isRevoked === undefined || sess.isRevoked === where.isRevoked;
        if (userMatches && familyMatches && revokedMatches) {
          sessions.set(id, { ...sess, ...data });
          count++;
        }
      }
      return { count };
    }),
  };

  const client: any = {
    userSession,
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(async (fn: any) => fn(client)),
    _sessions: sessions,
  };
  return client;
}

describe('DocMatrix JWT Strategy & Session Revocation Verification', () => {
  let strategy: JwtStrategy;
  let jwtService: JwtService;
  let sessionService: SessionService;
  let mockPrisma: any;

  afterEach(() => vi.unstubAllEnvs());

  beforeEach(() => {
    vi.stubEnv('JWT_SECRET', randomBytes(32).toString('hex'));
    mockPrisma = createMockPrisma();
    sessionService = new SessionService(mockPrisma as PrismaService);
    strategy = new JwtStrategy(mockPrisma as PrismaService, sessionService);

    jwtService = new JwtService({
      secret: getJwtSecret(),
      signOptions: { algorithm: JWT_ALGORITHM },
    });
  });

  it('validates a legitimate active user and session', async () => {
    const { session } = await sessionService.createSession('usr-1', 'clinic-1');

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'usr-1',
      email: 'user@clinic.com',
      fullName: 'Dr. Legitimate',
      role: 'DOCTOR',
      clinicId: 'clinic-1',
      isPlatformAdmin: false,
      isPrimaryContact: false,
      isActive: true,
    });

    const payload: JwtPayload = {
      sub: 'usr-1',
      sessionId: session.id,
      email: 'user@clinic.com',
      role: 'DOCTOR',
      clinicId: 'clinic-1',
      isPlatformAdmin: false,
    };

    const user = await strategy.validate(payload);
    expect(user.id).toBe('usr-1');
    expect(user.sessionId).toBe(session.id);
  });

  it('rejects an access token when the user account has been deactivated (isActive = false)', async () => {
    const { session } = await sessionService.createSession('usr-1', 'clinic-1');

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'usr-1',
      email: 'user@clinic.com',
      fullName: 'Deactivated User',
      isActive: false,
    });

    const payload: JwtPayload = {
      sub: 'usr-1',
      sessionId: session.id,
      email: 'user@clinic.com',
      role: 'DOCTOR',
      clinicId: 'clinic-1',
      isPlatformAdmin: false,
    };

    await expect(strategy.validate(payload)).rejects.toThrow(
      /User account is inactive or no longer exists/,
    );
  });

  it('rejects an access token immediately when the session has been revoked (e.g. user logged out)', async () => {
    const { session } = await sessionService.createSession('usr-1', 'clinic-1');

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'usr-1',
      email: 'user@clinic.com',
      fullName: 'Dr. Legitimate',
      isActive: true,
    });

    const payload: JwtPayload = {
      sub: 'usr-1',
      sessionId: session.id,
      email: 'user@clinic.com',
      role: 'DOCTOR',
      clinicId: 'clinic-1',
      isPlatformAdmin: false,
    };

    // Valid prior to revocation
    const user = await strategy.validate(payload);
    expect(user.id).toBe('usr-1');

    // Revoke the session
    await sessionService.revokeSession(session.id, 'User clicked logout');

    // Now protected API call with this access token is IMMEDIATELY REJECTED
    await expect(strategy.validate(payload)).rejects.toThrow(
      /Session has been revoked or expired/,
    );
  });

  it('rejects an access token immediately after password change mass revocation', async () => {
    const { session } = await sessionService.createSession('usr-1', 'clinic-1');

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'usr-1',
      email: 'user@clinic.com',
      fullName: 'Dr. Legitimate',
      isActive: true,
    });

    const payload: JwtPayload = {
      sub: 'usr-1',
      sessionId: session.id,
      email: 'user@clinic.com',
      role: 'DOCTOR',
      clinicId: 'clinic-1',
      isPlatformAdmin: false,
    };

    // Mass revoke all user sessions
    await sessionService.revokeAllUserSessions(
      'usr-1',
      undefined,
      'Password changed',
    );

    await expect(strategy.validate(payload)).rejects.toThrow(
      /Session has been revoked or expired/,
    );
  });

  it('rejects tokens signed with unsupported algorithms or wrong secret', async () => {
    const foreignJwtService = new JwtService({
      secret: 'completely_different_foreign_secret_12345678',
      signOptions: { algorithm: 'HS256' },
    });

    const tokenFromAttacker = foreignJwtService.sign({
      sub: 'usr-admin',
      role: 'ORGANIZATION_ADMIN',
    });

    // Verification with server jwtService fails
    expect(() => jwtService.verify(tokenFromAttacker)).toThrow();
  });
});
