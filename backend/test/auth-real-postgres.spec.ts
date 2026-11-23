import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { SessionService } from '../src/auth/session.service.js';
import { AuthService } from '../src/auth/auth.service.js';
import { JwtStrategy, JwtPayload } from '../src/auth/jwt.strategy.js';
import { getJwtSecret, JWT_ALGORITHM, REFRESH_COOKIE_NAME, extractCookie } from '../src/common/config/jwt.config.js';
import { AuthController } from '../src/auth/auth.controller.js';

const testDbUrl = process.env.BATCH1_DATABASE_URL;
if (testDbUrl) {
  const parsed = new URL(testDbUrl);
  if (parsed.hostname !== '127.0.0.1' || !['55439', '55440'].includes(parsed.port) || parsed.username !== 'batch_security' || parsed.pathname !== '/postgres' || parsed.searchParams.get('schema') !== 'batch1_security') throw new Error('Authentication integration tests require the dedicated localhost cluster.');
}

describe.skipIf(!testDbUrl)('DocMatrix Phase 3 — Real PostgreSQL Database Authentication & Session Tests', () => {
  let prisma: PrismaClient;
  let sessionService: SessionService;
  let authService: AuthService;
  let jwtService: JwtService;
  let jwtStrategy: JwtStrategy;
  let authController: AuthController;

  const testClinicId = `test-clinic-p3-${Date.now()}`;
  const testUserId = `test-user-p3-${Date.now()}`;
  const testUserEmail = `phase3.test.${Date.now()}@docmatrix.test`;
  const rawPassword = 'SecurePassword123!';

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: { db: { url: testDbUrl } },
    });
    await prisma.$connect();

    jwtService = new JwtService({
      secret: getJwtSecret(),
      signOptions: { algorithm: JWT_ALGORITHM },
    });

    sessionService = new SessionService(prisma as any);
    authService = new AuthService(prisma as any, jwtService, sessionService);
    jwtStrategy = new JwtStrategy(prisma as any, sessionService);
    authController = new AuthController(authService);

    // Seed synthetic isolated test clinic and user (no patient records)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);

    await prisma.clinic.create({
      data: {
        id: testClinicId,
        name: 'Phase 3 Test Dental Clinic',
        slug: `phase3-clinic-${Date.now()}`,
        phone: '9999999999',
        email: testUserEmail,
      },
    });

    await prisma.user.create({
      data: {
        id: testUserId,
        clinicId: testClinicId,
        email: testUserEmail,
        fullName: 'Phase3 Test Doctor',
        passwordHash,
        role: 'DOCTOR',
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    try {
      // Clean up synthetic test data
      await prisma.userSession.deleteMany({ where: { userId: testUserId } });
      await prisma.user.deleteMany({ where: { id: testUserId } });
      await prisma.clinic.deleteMany({ where: { id: testClinicId } });
    } catch (e) {
      console.warn('Cleanup error:', e);
    } finally {
      await prisma.$disconnect();
    }
  });

  // -------------------------------------------------------------------------
  // 1. LOGIN CREATES SESSION RECORD IN POSTGRESQL
  // -------------------------------------------------------------------------
  it('1. Login creates a persistent UserSession record in PostgreSQL', async () => {
    const loginResult = await authService.login({
      email: testUserEmail,
      password: rawPassword,
    });

    expect(loginResult.token).toBeDefined();
    expect(loginResult.refreshToken).toBeDefined();

    const decoded: any = jwtService.decode(loginResult.token);
    expect(decoded.sessionId).toBeDefined();

    // Query real PostgreSQL database table
    const dbSession = await prisma.userSession.findUnique({
      where: { id: decoded.sessionId },
    });

    expect(dbSession).not.toBeNull();
    expect(dbSession?.userId).toBe(testUserId);
    expect(dbSession?.clinicId).toBe(testClinicId);
    expect(dbSession?.isRevoked).toBe(false);
    expect(dbSession?.tokenHash).toBe(SessionService.hashToken(loginResult.refreshToken));
    expect(dbSession?.previousTokenHashes).toEqual([]);
    expect(dbSession?.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  // -------------------------------------------------------------------------
  // 2. REFRESH TOKEN ROTATION IN POSTGRESQL
  // -------------------------------------------------------------------------
  it('2. Refresh-token rotation atomically updates tokenHash and archives old hash in PostgreSQL', async () => {
    const { session, refreshToken: token1 } = await sessionService.createSession(
      testUserId,
      testClinicId,
    );

    const token1Hash = SessionService.hashToken(token1);

    // Rotate token
    const { session: updatedSession, newRefreshToken: token2 } =
      await sessionService.rotateRefreshToken(token1);

    expect(token2).toBeDefined();
    expect(token2).not.toBe(token1);

    // Inspect real PostgreSQL record
    const dbRecord = await prisma.userSession.findUnique({
      where: { id: session.id },
    });

    expect(dbRecord?.tokenHash).toBe(SessionService.hashToken(token2));
    expect(dbRecord?.previousTokenHashes).toContain(token1Hash);
    expect(dbRecord?.isRevoked).toBe(false);

    // Session remains valid
    const isValid = await sessionService.isSessionValid(session.id, testUserId);
    expect(isValid).toBe(true);
  });

  // -------------------------------------------------------------------------
  // 3. LOGOUT REVOKES SESSION IN POSTGRESQL
  // -------------------------------------------------------------------------
  it('3. Logout marks session isRevoked = true in PostgreSQL', async () => {
    const { session, refreshToken } = await sessionService.createSession(
      testUserId,
      testClinicId,
    );

    // Perform logout
    await authService.logout(`Bearer mock`, refreshToken);

    const dbSession = await prisma.userSession.findUnique({
      where: { id: session.id },
    });

    expect(dbSession?.isRevoked).toBe(true);
    expect(dbSession?.revocationReason).toBe('User logged out');
  });

  // -------------------------------------------------------------------------
  // 4. REVOKED SESSIONS CANNOT ACCESS PROTECTED APIS
  // -------------------------------------------------------------------------
  it('4. Revoked access tokens are rejected by JwtStrategy with 401 Unauthorized', async () => {
    const { session } = await sessionService.createSession(testUserId, testClinicId);

    const payload: JwtPayload = {
      sub: testUserId,
      sessionId: session.id,
      email: testUserEmail,
      role: 'DOCTOR',
      clinicId: testClinicId,
      isPlatformAdmin: false,
    };

    // Valid before revocation
    const user = await jwtStrategy.validate(payload);
    expect(user.id).toBe(testUserId);

    // Revoke session in database
    await sessionService.revokeSession(session.id, 'Test admin revocation');

    // Protected API call rejected
    await expect(jwtStrategy.validate(payload)).rejects.toThrow(UnauthorizedException);
  });

  // -------------------------------------------------------------------------
  // 5. EXPIRED SESSIONS ARE REJECTED
  // -------------------------------------------------------------------------
  it('5. Expired sessions are rejected in PostgreSQL', async () => {
    const { session, refreshToken } = await sessionService.createSession(
      testUserId,
      testClinicId,
    );

    // Manually expire session in PostgreSQL
    await prisma.userSession.update({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() - 5000) },
    });

    const isValid = await sessionService.isSessionValid(session.id, testUserId);
    expect(isValid).toBe(false);

    await expect(sessionService.rotateRefreshToken(refreshToken)).rejects.toThrow(
      /expired/i,
    );
  });

  // -------------------------------------------------------------------------
  // 6. TOKEN REUSE REVOKES SESSION FAMILY IN POSTGRESQL
  // -------------------------------------------------------------------------
  it('6. Reusing an old rotated refresh token immediately revokes the session family in PostgreSQL', async () => {
    const { session, refreshToken: token1 } = await sessionService.createSession(
      testUserId,
      testClinicId,
    );

    // Legitimate rotation: Token 1 -> Token 2
    const { newRefreshToken: token2 } = await sessionService.rotateRefreshToken(token1);

    // Attacker attempts to reuse Token 1!
    await expect(sessionService.rotateRefreshToken(token1)).rejects.toThrow(
      /Refresh token reuse detected/,
    );

    // Verify entire family is revoked in PostgreSQL
    const dbRecord = await prisma.userSession.findUnique({
      where: { id: session.id },
    });
    expect(dbRecord?.isRevoked).toBe(true);
    expect(dbRecord?.revocationReason).toContain('Refresh token reuse detected');

    // Token 2 is now also rejected
    await expect(sessionService.rotateRefreshToken(token2)).rejects.toThrow(
      /revoked/i,
    );
  });

  // -------------------------------------------------------------------------
  // 7. PASSWORD CHANGES INVALIDATE SESSIONS IN POSTGRESQL
  // -------------------------------------------------------------------------
  it('7. Password change terminates all active sessions in PostgreSQL', async () => {
    const s1 = await sessionService.createSession(testUserId, testClinicId);
    const s2 = await sessionService.createSession(testUserId, testClinicId);

    expect(await sessionService.isSessionValid(s1.session.id, testUserId)).toBe(true);
    expect(await sessionService.isSessionValid(s2.session.id, testUserId)).toBe(true);

    const newPassword = 'NewSecretPassword456!';
    await authService.changePassword(testUserId, rawPassword, newPassword, testClinicId);

    // Both sessions are now revoked in PostgreSQL
    const s1Db = await prisma.userSession.findUnique({ where: { id: s1.session.id } });
    const s2Db = await prisma.userSession.findUnique({ where: { id: s2.session.id } });

    expect(s1Db?.isRevoked).toBe(true);
    expect(s2Db?.isRevoked).toBe(true);

    // Restore original password for any subsequent tests
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(rawPassword, salt);
    await prisma.user.update({ where: { id: testUserId }, data: { passwordHash } });
  });

  // -------------------------------------------------------------------------
  // 8. CONCURRENT REFRESH REQUESTS
  // -------------------------------------------------------------------------
  it('8. Concurrent refresh requests cannot create multiple valid successor tokens', async () => {
    const { refreshToken } = await sessionService.createSession(
      testUserId,
      testClinicId,
    );

    // Fire 2 concurrent rotation requests with the identical refresh token
    const results = await Promise.allSettled([
      sessionService.rotateRefreshToken(refreshToken),
      sessionService.rotateRefreshToken(refreshToken),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // Exactly one must succeed and the other must be rejected (either concurrency lock or reuse detected)
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);
  });

  // -------------------------------------------------------------------------
  // 9. RECOGNITION ACROSS BACKEND INSTANCES
  // -------------------------------------------------------------------------
  it('9. Session revocation is recognized across independent backend instances sharing PostgreSQL', async () => {
    // Instance A creates a session
    const instanceA = new SessionService(prisma as any);
    const { session, refreshToken } = await instanceA.createSession(testUserId, testClinicId);

    // Instance B checks validity
    const instanceB = new SessionService(prisma as any);
    expect(await instanceB.isSessionValid(session.id, testUserId)).toBe(true);

    // Instance B rotates token
    const { newRefreshToken } = await instanceB.rotateRefreshToken(refreshToken);
    expect(newRefreshToken).toBeDefined();

    // Instance A sees the session is still valid with new token
    expect(await instanceA.isSessionValid(session.id, testUserId)).toBe(true);

    // Instance A revokes the session
    await instanceA.revokeSession(session.id, 'Revoked on instance A');

    // Instance B immediately observes revocation via PostgreSQL
    expect(await instanceB.isSessionValid(session.id, testUserId)).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 10. BROWSER SECURITY & COOKIE ATTRIBUTES
  // -------------------------------------------------------------------------
  it('10. AuthController strips refreshToken from JSON response and sets secure HttpOnly cookie', async () => {
    let setCookieHeader: string | null = null;
    let cookieOptionsCaptured: any = null;

    const mockReq: any = {
      headers: {
        'user-agent': 'Vitest-Agent/1.0',
        'x-requested-with': 'XMLHttpRequest',
      },
      socket: { remoteAddress: '127.0.0.1' },
    };

    const mockRes: any = {
      cookie: (name: string, val: string, options: any) => {
        setCookieHeader = `${name}=${val}`;
        cookieOptionsCaptured = options;
      },
    };

    const loginResponse = await authController.login(mockReq, mockRes, {
      email: testUserEmail,
      password: rawPassword,
    });

    // 1. Refresh token is NEVER in response body
    expect(loginResponse.token).toBeDefined();
    expect((loginResponse as any).refreshToken).toBeUndefined();

    // 2. Refresh token is set in HttpOnly cookie
    expect(setCookieHeader).toContain(REFRESH_COOKIE_NAME);
    expect(cookieOptionsCaptured.httpOnly).toBe(true);
    expect(cookieOptionsCaptured.path).toBe('/auth');
    expect(cookieOptionsCaptured.sameSite).toBe('lax');

    // 3. CSRF defense: missing X-Requested-With on refresh throws ForbiddenException
    const badReq: any = {
      headers: {},
      socket: { remoteAddress: '127.0.0.1' },
    };

    await expect(authController.refresh(badReq, mockRes, {} as any)).rejects.toThrow(
      ForbiddenException,
    );
  });
});

