import { matchesSession, updateSession } from '../../test/helpers/session-persistence.js';
import 'reflect-metadata';
import { randomBytes } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { JwtStrategy } from './jwt.strategy.js';
import { SessionService } from './session.service.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { JWT_ALGORITHM } from '../common/config/jwt.config.js';

@Controller('protected')
@UseGuards(JwtAuthGuard)
class ProtectedController {
  @Get()
  getUser(@Req() req: any) {
    return req.user;
  }
}

Reflect.defineMetadata('design:paramtypes', [AuthService], AuthController);

// Uses the real Passport guard, JWT strategy, session service and token issuer.
// Only persistence is synthetic: no environment file or external database is read.
describe('Finding #1: protected JWT access and issuance', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let db: any;
  let sessions: SessionService;
  let auth: AuthService;
  let rows: Map<string, any>;
  let user: any;

  beforeEach(async () => {
    const secret = randomBytes(32).toString('hex');
    vi.stubEnv('JWT_SECRET', secret);
    rows = new Map();
    user = {
      id: 'user-1',
      email: 'doctor@example.test',
      fullName: 'Synthetic Doctor',
      role: 'DOCTOR',
      clinicId: 'clinic-1',
      isActive: true,
      isPlatformAdmin: false,
      isPrimaryContact: false,
      passwordHash: bcrypt.hashSync('SyntheticPassword!', 4),
      clinic: { id: 'clinic-1', name: 'Synthetic Clinic', status: 'ACTIVE' },
    };
    db = {
      user: {
        findUnique: vi.fn(async ({ where }: any) =>
          where.id === user.id || where.email === user.email
            ? { ...user }
            : null,
        ),
        create: vi.fn(async ({ data }: any) => ({
          id: 'registered-user',
          ...data,
        })),
        update: vi.fn(async ({ data }: any) => Object.assign(user, data)),
      },
      clinic: {
        create: vi.fn(async ({ data }: any) => ({
          id: 'registered-clinic',
          ...data,
        })),
      },
      userSession: {
        create: vi.fn(async ({ data }: any) => {
          const row = { id: `session-${rows.size + 1}`, ...data };
          rows.set(row.id, row);
          return { ...row };
        }),
        findUnique: vi.fn(async ({ where }: any) => {
          const row = where.id
            ? rows.get(where.id)
            : [...rows.values()].find(
                (row) => row.tokenHash === where.tokenHash,
              );
          return row ? { ...row } : null;
        }),
        findFirst: vi.fn(async ({ where }: any) => {
          const row = [...rows.values()].find((row) =>
            row.previousTokenHashes.includes(where.previousTokenHashes?.has),
          );
          return row ? { ...row } : null;
        }),
        update: vi.fn(async ({ where, data }: any) => {
          const row = rows.get(where.id);
          const previousTokenHashes = data.previousTokenHashes?.push
            ? [...row.previousTokenHashes, data.previousTokenHashes.push]
            : row.previousTokenHashes;
          Object.assign(row, data, { previousTokenHashes });
          return { ...row };
        }),
        updateMany: vi.fn(async ({ where, data }: any) => {
          let count = 0;
          for (const row of rows.values()) {
            if (matchesSession(row, where)) {
              updateSession(row, data);
              count++;
            }
          }
          return { count };
        }),
      },
      $transaction: vi.fn(async (fn: any) => fn(db)),
    };
    sessions = new SessionService(db);
    jwt = new JwtService({
      secret,
      signOptions: { algorithm: JWT_ALGORITHM, expiresIn: '15m' },
    });
    auth = new AuthService(db, jwt, sessions, undefined, {
      recordEvent: vi.fn(),
    } as any);
    const fixture = await Test.createTestingModule({
      controllers: [ProtectedController, AuthController],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: JwtAuthGuard, useValue: new JwtAuthGuard(new Reflector()) },
        { provide: JwtStrategy, useValue: new JwtStrategy(db, sessions) },
      ],
    }).compile();
    app = fixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  const access = (token: string) =>
    request(app.getHttpServer())
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

  it.each([undefined, null, '', '   ', 123, {}, []])(
    'rejects missing or malformed sessionId case %# with 401',
    async (sessionId) => {
      const res = await access(jwt.sign({ sub: user.id, sessionId }));
      expect(res.status).toBe(401);
      expect(db.user.findUnique).not.toHaveBeenCalled();
      expect(db.userSession.findUnique).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, '', 123])(
    'rejects malformed subject case %# with 401',
    async (sub) => {
      expect(
        (await access(jwt.sign({ sub, sessionId: 'session-1' }))).status,
      ).toBe(401);
      expect(db.user.findUnique).not.toHaveBeenCalled();
    },
  );

  it('rejects an unknown session', async () => {
    expect(
      (await access(jwt.sign({ sub: user.id, sessionId: 'unknown' }))).status,
    ).toBe(401);
  });

  it.each(['expired', 'revoked', 'wrong owner', 'expires now'])(
    'rejects a session that is %s',
    async (state) => {
      const { session } = await sessions.createSession(user.id, user.clinicId);
      const row = rows.get(session.id);
      if (state === 'expired') row.expiresAt = new Date(Date.now() - 1000);
      if (state === 'revoked') row.isRevoked = true;
      if (state === 'wrong owner') row.userId = 'other-user';
      if (state === 'expires now') {
        // Fix only Date, leaving HTTP/network timers untouched.
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date());
        row.expiresAt = new Date();
      }
      expect(
        (await access(jwt.sign({ sub: user.id, sessionId: session.id })))
          .status,
      ).toBe(401);
    },
  );

  it('accepts a valid session and loads current roles from the database', async () => {
    const { session } = await sessions.createSession(user.id, user.clinicId);
    const res = await access(
      jwt.sign({
        sub: user.id,
        sessionId: session.id,
        role: 'ORGANIZATION_ADMIN',
        isPlatformAdmin: true,
      }),
    );
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: user.id,
      sessionId: session.id,
      role: 'DOCTOR',
      isPlatformAdmin: false,
    });
  });

  it('rejects expired access tokens and unapproved signing algorithms', async () => {
    const { session } = await sessions.createSession(user.id, user.clinicId);
    const payload = { sub: user.id, sessionId: session.id };
    expect((await access(jwt.sign(payload, { expiresIn: -1 }))).status).toBe(
      401,
    );
    expect(
      (await access(jwt.sign(payload, { algorithm: 'HS384' }))).status,
    ).toBe(401);
    expect(
      (
        await access(
          new JwtService({ secret: randomBytes(32).toString('hex') }).sign(
            payload,
          ),
        )
      ).status,
    ).toBe(401);
  });

  it('issues session-bound login and refresh tokens accepted by protected routes', async () => {
    const login = await auth.login({
      email: user.email,
      password: 'SyntheticPassword!',
    });
    const loginPayload = jwt.verify(login.token);
    expect(loginPayload.sessionId).toBeTruthy();
    expect((await access(login.token)).status).toBe(200);
    const refresh = await auth.refreshSession(login.refreshToken);
    expect(jwt.verify(refresh.token).sessionId).toBe(loginPayload.sessionId);
    expect(refresh.refreshToken).not.toBe(login.refreshToken);
    expect((await access(refresh.token)).status).toBe(200);
    await sessions.revokeSession(loginPayload.sessionId);
    expect((await access(login.token)).status).toBe(401);
    expect((await access(refresh.token)).status).toBe(401);
    await expect(auth.refreshSession(refresh.refreshToken)).rejects.toThrow();
  });

  it('registration issues an access token bound to its new user session', async () => {
    const result = await auth.registerClinic({
      email: 'new@example.test',
      password: 'SyntheticRegistration!',
      fullName: 'New Owner',
      clinicName: 'New Clinic',
      mobile: '9999999999',
    });
    const payload = jwt.verify(result.token);
    const session = rows.get(payload.sessionId);
    expect(payload.sub).toBe('registered-user');
    expect(session.userId).toBe(payload.sub);
    expect(await sessions.isSessionValid(payload.sessionId, payload.sub)).toBe(
      true,
    );
  });

  it('refresh cookie responses preserve the API contract without exposing the refresh token', async () => {
    const login = await auth.login({
      email: user.email,
      password: 'SyntheticPassword!',
    });
    const cookie = vi.fn();
    const response = await new AuthController(auth).refresh(
      {
        headers: {
          'x-requested-with': 'docmatrix-web',
          cookie: `docmatrix_refresh_token=${login.refreshToken}`,
        },
        socket: { remoteAddress: '127.0.0.1' },
      } as any,
      { cookie } as any,
      {},
    );
    expect(response).not.toHaveProperty('refreshToken');
    expect(jwt.verify(response.token).sessionId).toBe(
      jwt.verify(login.token).sessionId,
    );
    expect(cookie).toHaveBeenCalledWith(
      'docmatrix_refresh_token',
      expect.any(String),
      expect.objectContaining({ httpOnly: true }),
    );
    expect((await access(response.token)).status).toBe(200);
  });
  it('logout clears its refresh cookie and invalidates protected access immediately', async () => {
    const { session, refreshToken } = await sessions.createSession(user.id, user.clinicId);
    const token = jwt.sign({ sub: user.id, sessionId: session.id });
    expect((await access(token)).status).toBe(200);
    const response = await request(app.getHttpServer()).post('/auth/logout')
      .set('X-Requested-With', 'docmatrix-web').set('Authorization', `Bearer ${token}`)
      .set('Cookie', `docmatrix_refresh_token=${refreshToken}`).send({});
    expect(response.status).toBe(200);
    expect(String(response.headers['set-cookie'])).toContain('docmatrix_refresh_token=;');
    expect((await access(token)).status).toBe(401);
    await expect(sessions.rotateRefreshToken(refreshToken)).rejects.toThrow(/revoked/);
  });
  it('logout retains CSRF protection and rejects a signed token owned by a different subject', async () => {
    const { session } = await sessions.createSession(user.id, user.clinicId);
    const token = jwt.sign({ sub: user.id, sessionId: session.id });
    expect((await request(app.getHttpServer()).post('/auth/logout').set('Authorization', `Bearer ${token}`).send({})).status).toBe(403);
    expect(await sessions.isSessionValid(session.id, user.id)).toBe(true);
    const mismatched = jwt.sign({ sub: 'different-user', sessionId: session.id });
    expect((await request(app.getHttpServer()).post('/auth/logout').set('X-Requested-With', 'docmatrix-web')
      .set('Authorization', `Bearer ${mismatched}`).send({})).status).toBe(200);
    expect(await sessions.isSessionValid(session.id, user.id)).toBe(true);
  });

});
