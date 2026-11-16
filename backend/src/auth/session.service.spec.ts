import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';
import { SessionService, UserSession } from './session.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

function createMockPrisma() {
  const sessions = new Map<string, any>();

  const userSession = {
    create: vi.fn(async ({ data }: any) => {
      const record = {
        id: `sess-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        previousTokenHashes: [],
        ...data,
      };
      sessions.set(record.id, record);
      return { ...record };
    }),
    findFirst: vi.fn(async ({ where }: any) => {
      for (const sess of sessions.values()) {
        if (where?.tokenHash && sess.tokenHash === where.tokenHash) return { ...sess };
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
      if (where.id) {
        const sess = sessions.get(where.id);
        return sess ? { ...sess } : null;
      }
      if (where.tokenHash) {
        for (const sess of sessions.values()) {
          if (sess.tokenHash === where.tokenHash) return { ...sess };
        }
      }
      return null;
    }),
    update: vi.fn(async ({ where, data }: any) => {
      const sess = sessions.get(where.id);
      if (!sess) throw new Error('Not found');

      const prevHashes = [...(sess.previousTokenHashes || [])];
      if (data.previousTokenHashes?.push) {
        prevHashes.push(data.previousTokenHashes.push);
      }

      const updated = {
        ...sess,
        ...data,
        previousTokenHashes: prevHashes,
      };
      sessions.set(where.id, updated);
      return { ...updated };
    }),
    updateMany: vi.fn(async ({ where, data }: any) => {
      let count = 0;
      for (const [id, sess] of sessions.entries()) {
        const userMatches = !where.userId || sess.userId === where.userId;
        const familyMatches = !where.familyId || sess.familyId === where.familyId;
        const revokedMatches = where.isRevoked === undefined || sess.isRevoked === where.isRevoked;
        if (userMatches && familyMatches && revokedMatches) {
          sessions.set(id, { ...sess, ...data });
          count++;
        }
      }
      return { count };
    }),
    count: vi.fn(async () => sessions.size),
  };

  const client: any = {
    userSession,
    user: { findUnique: vi.fn() },
    $transaction: vi.fn(async (fn: any) => fn(client)),
    _sessions: sessions,
  };
  return client;
}

describe('DocMatrix SessionService — PostgreSQL Session Storage, Refresh Tokens & Revocation', () => {
  let sessionService: SessionService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    sessionService = new SessionService(mockPrisma as PrismaService);
  });

  // =========================================================================
  // 1. SESSION CREATION & TOKEN HASHING
  // =========================================================================
  describe('Session Creation & Token Hashing', () => {
    it('creates a uniquely identifiable session in PostgreSQL with SHA-256 token hash', async () => {
      const { session, refreshToken } = await sessionService.createSession(
        'usr-test-1',
        'clinic-test-1',
        { userAgent: 'Mozilla/5.0 Chrome', ipAddress: '127.0.0.1' },
      );

      expect(session.id).toBeDefined();
      expect(session.userId).toBe('usr-test-1');
      expect(session.clinicId).toBe('clinic-test-1');
      expect(session.isRevoked).toBe(false);
      expect(session.familyId).toBeDefined();
      expect(session.previousTokenHashes).toEqual([]);

      // Raw token is 64 hex characters (256-bit entropy)
      expect(refreshToken).toHaveLength(64);

      // Server stores ONLY the SHA-256 hash, NEVER the plaintext token
      expect(session.tokenHash).toHaveLength(64);
      expect(session.tokenHash).not.toBe(refreshToken);
      expect(session.tokenHash).toBe(SessionService.hashToken(refreshToken));

      // Session is valid initially
      expect(await sessionService.isSessionValid(session.id, 'usr-test-1')).toBe(true);
    });

    it('rejects isSessionValid if wrong userId is supplied', async () => {
      const { session } = await sessionService.createSession('usr-1', 'clinic-1');
      expect(await sessionService.isSessionValid(session.id, 'usr-2-attacker')).toBe(false);
    });
  });

  // =========================================================================
  // 2. REFRESH TOKEN ROTATION
  // =========================================================================
  describe('Refresh Token Rotation', () => {
    it('rotates refresh token on valid request and updates token hash in PostgreSQL', async () => {
      const { session: initialSession, refreshToken: initialToken } =
        await sessionService.createSession('usr-test-1', 'clinic-test-1');

      const initialHash = initialSession.tokenHash;

      // Rotate token
      const { session: rotatedSession, newRefreshToken } =
        await sessionService.rotateRefreshToken(initialToken);

      expect(rotatedSession.id).toBe(initialSession.id);
      expect(newRefreshToken).toHaveLength(64);
      expect(newRefreshToken).not.toBe(initialToken);

      // Active hash is now the new token's hash
      expect(rotatedSession.tokenHash).toBe(SessionService.hashToken(newRefreshToken));

      // Old token hash is archived into previousTokenHashes for reuse detection
      expect(rotatedSession.previousTokenHashes).toContain(initialHash);

      // Session remains valid
      expect(await sessionService.isSessionValid(rotatedSession.id, 'usr-test-1')).toBe(true);
    });

    it('rejects rotation when token is missing or not a string', async () => {
      await expect(sessionService.rotateRefreshToken('')).rejects.toThrow(UnauthorizedException);
      await expect(sessionService.rotateRefreshToken(null as any)).rejects.toThrow(UnauthorizedException);
    });

    it('rejects rotation when an invalid or unknown token is presented', async () => {
      await expect(
        sessionService.rotateRefreshToken('unknown-fake-token-that-does-not-exist'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // =========================================================================
  // 3. TOKEN REUSE DETECTION (HIJACKING DEFENSE)
  // =========================================================================
  describe('Token Reuse Detection', () => {
    it('detects refresh token reuse and immediately terminates all sessions in the family in PostgreSQL', async () => {
      // 1. User logs in (Token 1)
      const { session, refreshToken: token1 } = await sessionService.createSession(
        'usr-victim-1',
        'clinic-1',
      );

      // 2. Legitimate user rotates token -> gets Token 2
      const { newRefreshToken: token2 } = await sessionService.rotateRefreshToken(token1);

      // 3. Attacker (or intercepted network) attempts to reuse the already-rotated Token 1!
      await expect(sessionService.rotateRefreshToken(token1)).rejects.toThrow(
        /Refresh token reuse detected/,
      );

      // 4. Verify that the session has been immediately REVOKED in PostgreSQL!
      expect(await sessionService.isSessionValid(session.id, 'usr-victim-1')).toBe(false);

      // 5. Subsequent attempts by the legitimate user with Token 2 are now also blocked
      await expect(sessionService.rotateRefreshToken(token2)).rejects.toThrow(
        /Session revoked|reuse detected/,
      );
    });
  });

  // =========================================================================
  // 4. SESSION EXPIRATION & REVOCATION
  // =========================================================================
  describe('Session Expiration & Revocation', () => {
    it('rejects rotation and access when a session is explicitly revoked', async () => {
      const { session, refreshToken } = await sessionService.createSession('usr-1', 'clinic-1');

      expect(await sessionService.isSessionValid(session.id, 'usr-1')).toBe(true);

      // Revoke session
      await sessionService.revokeSession(session.id, 'User clicked logout');

      // Immediate rejection by isSessionValid
      expect(await sessionService.isSessionValid(session.id, 'usr-1')).toBe(false);

      // Immediate rejection by rotateRefreshToken
      await expect(sessionService.rotateRefreshToken(refreshToken)).rejects.toThrow(
        /Session revoked/,
      );
    });

    it('rejects rotation and access when a session has expired', async () => {
      const { session, refreshToken } = await sessionService.createSession('usr-1', 'clinic-1');

      // Manually set expiration to past in database record
      const record = mockPrisma._sessions.get(session.id);
      record.expiresAt = new Date(Date.now() - 1000);

      expect(await sessionService.isSessionValid(session.id, 'usr-1')).toBe(false);
      await expect(sessionService.rotateRefreshToken(refreshToken)).rejects.toThrow(
        /expired/,
      );
    });

    it('revokes session by refresh token lookup in PostgreSQL', async () => {
      const { session, refreshToken } = await sessionService.createSession('usr-1', 'clinic-1');

      const revoked = await sessionService.revokeSessionByRefreshToken(refreshToken, 'Logout by cookie');
      expect(revoked).toBe(true);
      expect(await sessionService.isSessionValid(session.id, 'usr-1')).toBe(false);
    });
  });

  // =========================================================================
  // 5. MASS REVOCATION (PASSWORD CHANGE & ACCOUNT DEACTIVATION)
  // =========================================================================
  describe('Mass Revocation on Password Change', () => {
    it('revokes all active sessions for a user when password is changed', async () => {
      // User has 3 active sessions across desktop, tablet, and mobile
      const s1 = await sessionService.createSession('usr-1', 'clinic-1');
      const s2 = await sessionService.createSession('usr-1', 'clinic-1');
      const s3 = await sessionService.createSession('usr-1', 'clinic-1');

      // Different user session (should NOT be affected)
      const otherUserSession = await sessionService.createSession('usr-2', 'clinic-1');

      expect(await sessionService.isSessionValid(s1.session.id, 'usr-1')).toBe(true);
      expect(await sessionService.isSessionValid(s2.session.id, 'usr-1')).toBe(true);
      expect(await sessionService.isSessionValid(s3.session.id, 'usr-1')).toBe(true);
      expect(await sessionService.isSessionValid(otherUserSession.session.id, 'usr-2')).toBe(true);

      // Password changed -> mass revocation
      const count = await sessionService.revokeAllUserSessions('usr-1', undefined, 'Password changed');
      expect(count).toBe(3);

      // All 3 sessions of usr-1 are now revoked
      expect(await sessionService.isSessionValid(s1.session.id, 'usr-1')).toBe(false);
      expect(await sessionService.isSessionValid(s2.session.id, 'usr-1')).toBe(false);
      expect(await sessionService.isSessionValid(s3.session.id, 'usr-1')).toBe(false);

      // usr-2 session remains untouched
      expect(await sessionService.isSessionValid(otherUserSession.session.id, 'usr-2')).toBe(true);
    });
  });

  // =========================================================================
  // 6. PERSISTENCE ACROSS BACKEND INSTANCES / RESTARTS
  // =========================================================================
  describe('Persistence Across Multiple Backend Instances / Restarts', () => {
    it('shares session state between independent backend instances connected to PostgreSQL', async () => {
      // 1. Instance A creates a session in database
      const { session, refreshToken } = await sessionService.createSession(
        'usr-cluster-1',
        'clinic-1',
      );
      expect(await sessionService.isSessionValid(session.id, 'usr-cluster-1')).toBe(true);

      // 2. Instance B connects to the same database
      const instanceB = new SessionService(mockPrisma as PrismaService);

      // 3. Instance B validates existing session
      expect(await instanceB.isSessionValid(session.id, 'usr-cluster-1')).toBe(true);

      // 4. Instance B can rotate the refresh token
      const { newRefreshToken } = await instanceB.rotateRefreshToken(refreshToken);
      expect(newRefreshToken).toBeDefined();

      // 5. Old token is now rejected on Instance A or B
      await expect(sessionService.rotateRefreshToken(refreshToken)).rejects.toThrow(
        /reuse detected/,
      );
    });
  });
});
