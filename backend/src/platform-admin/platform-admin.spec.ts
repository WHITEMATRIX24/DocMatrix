import 'reflect-metadata';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { StaffRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { AuthController } from '../auth/auth.controller.js';
import { AuthService } from '../auth/auth.service.js';
import { JwtStrategy } from '../auth/jwt.strategy.js';
import { SessionService } from '../auth/session.service.js';
import { LoginDto } from '../auth/dto/login.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { RateLimitGuard } from '../common/guards/rate-limit.guard.js';
import { RateLimiterService } from '../common/services/rate-limiter.service.js';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator.js';
import { PlatformAdminController } from './platform-admin.controller.js';
import { PlatformAdminService } from './platform-admin.service.js';

// Supply the design metadata that production TypeScript emits but esbuild does not.
Reflect.defineMetadata('design:paramtypes', [AuthService], AuthController);
Reflect.defineMetadata('design:paramtypes', [Object, Object, LoginDto], AuthController.prototype, 'platformLogin');

describe('Platform admin HTTP authorization (synthetic persistence)', () => {
  let app: any, db: any, admin: any, sessionRows: Map<string, any>, auth: AuthService, limiter: RateLimiterService;
  const secret = 'synthetic-platform-admin-test-signing-key';
  const password = 'Synthetic-Platform-2026!';
  const jwt = new JwtService({ secret, signOptions: { algorithm: 'HS256', expiresIn: '15m' } });
  let accounts: any[];

  beforeEach(async () => {
    const hash = bcrypt.hashSync(password, 4);
    admin = { id: 'platform-a', email: 'platform@docmatrix.test', fullName: 'Platform Operator', role: 'ORGANIZATION_ADMIN', clinicId: null, isActive: true, isPlatformAdmin: true, isPrimaryContact: false, passwordHash: hash };
    accounts = [admin, ...Object.values(StaffRole).map(role => ({ ...admin, id: role, email: `${role.toLowerCase()}@clinic.test`, role, clinicId: 'clinic-a', clinic: { status: 'ACTIVE' }, isPlatformAdmin: false, isPrimaryContact: role === 'ORGANIZATION_ADMIN' }))];
    sessionRows = new Map();
    db = {
      user: {
        findUnique: vi.fn(async ({ where }: any) => accounts.find(u => Object.entries(where).every(([k, v]) => u[k] === v)) || null),
        count: vi.fn(async () => 12),
        findMany: vi.fn(async () => [{ id: 'staff-a', fullName: 'Clinic Doctor', role: 'DOCTOR', isActive: true, isPlatformAdmin: false, clinic: { name: 'Synthetic Dental' } }]),
      },
      clinic: { count: vi.fn(async (q?: any) => q ? 3 : 5), findMany: vi.fn(async () => [{ id: 'clinic-a', name: 'Synthetic Dental', status: 'ACTIVE', createdAt: new Date(), _count: { users: 4 }, subscriptions: [] }]), groupBy: vi.fn(async () => [{ state: 'Kerala', country: 'India', _count: { _all: 3 } }]) },
      subscription: { count: vi.fn(async () => 2), findMany: vi.fn(async () => []), groupBy: vi.fn(async () => [{ currency: 'INR', billingInterval: 'ANNUAL', _sum: { lockedPrice: 12000 }, _count: { _all: 1 } }, { currency: 'USD', billingInterval: 'MONTHLY', _sum: { lockedPrice: 50 }, _count: { _all: 1 } }]) },
      userSession: {
        create: vi.fn(async ({ data }: any) => { const row = { id: `session-${sessionRows.size}`, ...data }; sessionRows.set(row.id, row); return row; }),
        findUnique: vi.fn(async ({ where }: any) => sessionRows.get(where.id) || null),
      },
    };
    const sessions = new SessionService(db);
    limiter = new RateLimiterService();
    auth = new AuthService(db, jwt, sessions, limiter, { recordEvent: vi.fn() } as any);
    const reflector = new Reflector();
    const fixture = await Test.createTestingModule({
      controllers: [AuthController, PlatformAdminController],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: PlatformAdminService, useValue: new PlatformAdminService(db) },
        { provide: APP_GUARD, useValue: new RateLimitGuard(reflector, limiter) },
      ],
    }).overrideGuard(JwtAuthGuard).useValue({ canActivate: async (ctx: any) => {
      if (reflector.getAllAndOverride(IS_PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()])) return true;
      try {
        const req = ctx.switchToHttp().getRequest();
        const payload = jwt.verify(req.headers.authorization?.replace(/^Bearer /, ''), { algorithms: ['HS256'] });
        req.user = await JwtStrategy.prototype.validate.call({ prisma: db, sessionService: sessions } as any, payload);
        return true;
      } catch { throw new UnauthorizedException(); }
    }}).overrideGuard(RolesGuard).useValue(new RolesGuard(reflector)).compile();
    app = fixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
  });
  afterEach(async () => { await app?.close(); await limiter.onModuleDestroy(); });
  const signIn = (email = admin.email, pass = password) => request(app.getHttpServer()).post('/auth/platform-login').send({ email, password: pass });
  const dashboard = (token?: string) => {
    const req = request(app.getHttpServer()).get('/admin/dashboard');
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };
  const noStatisticsRead = () => { expect(db.clinic.count).not.toHaveBeenCalled(); expect(db.user.count).not.toHaveBeenCalled(); expect(db.subscription.count).not.toHaveBeenCalled(); };

  it('returns 401 without authentication and never queries platform statistics', async () => {
    expect((await dashboard()).status).toBe(401); noStatisticsRead();
  });
  it('uses existing hashed-password/session login and sets an HttpOnly refresh cookie', async () => {
    const res = await signIn(); expect(res.status).toBe(200);
    expect(res.body.user.isPlatformAdmin).toBe(true); expect(res.body.refreshToken).toBeUndefined();
    expect(res.headers['set-cookie'].join(';')).toMatch(/HttpOnly/);
    expect(sessionRows.size).toBe(1); expect(jwt.decode(res.body.token).sessionId).toBeTruthy();
    const result = await dashboard(res.body.token); expect(result.status).toBe(200);
    expect(result.headers['cache-control']).toBe('no-store');
    expect(result.body.summary).toEqual({ clinics: 5, activeClinics: 3, clinicUsers: 12, activeSubscriptions: 2 });
    expect(result.body.user).not.toHaveProperty('passwordHash');
    expect(result.body.overview.monthlyPlanValue).toBe(1000);
    expect(result.body.overview.regions).toEqual([{state:'Kerala',country:'India',clinics:3}]);
    expect(result.body.overview.activity).toHaveLength(6);
  });
  it.each(Object.values(StaffRole))('denies %s without separate platform authorization, before session issuance', async role => {
    const account = accounts.find(a => a.id === role);
    const login = await signIn(account.email); expect(login.status).toBe(403); expect(sessionRows.size).toBe(0);
    const normal = await auth.login({ email: account.email, password });
    expect((await dashboard(normal.token)).status).toBe(403); noStatisticsRead();
  });
  it('allows a clinic staff member only when separately authorized as a platform administrator', async () => {
    const account = accounts.find(a => a.role === 'DOCTOR'); account.isPlatformAdmin = true;
    const res = await signIn(account.email); expect(res.status).toBe(200);
    expect((await dashboard(res.body.token)).status).toBe(200);
  });
  it.each(['true', 1])('rejects a truthy non-boolean platform flag (%s)', async flag => {
    admin.isPlatformAdmin = flag;
    expect((await signIn()).status).toBe(403); expect(sessionRows.size).toBe(0);
    const normal = await auth.login({ email: admin.email, password });
    expect((await dashboard(normal.token)).status).toBe(403); noStatisticsRead();
  });
  it('rejects invalid credentials and inactive platform accounts', async () => {
    expect((await signIn(admin.email, 'WrongPassword')).status).toBe(401);
    admin.isActive = false; expect((await signIn()).status).toBe(401); expect(sessionRows.size).toBe(0);
  });
  it('rechecks the database flag instead of trusting an old platform JWT claim', async () => {
    const res = await signIn(); admin.isPlatformAdmin = false;
    expect((await dashboard(res.body.token)).status).toBe(403); noStatisticsRead();
  });
  it('denies revoked sessions, expired tokens, and forged tokens', async () => {
    const res = await signIn(); const payload: any = jwt.decode(res.body.token);
    sessionRows.get(payload.sessionId).isRevoked = true;
    expect((await dashboard(res.body.token)).status).toBe(401);
    const expired = jwt.sign({ sub: admin.id, isPlatformAdmin: true }, { expiresIn: -1 });
    expect((await dashboard(expired)).status).toBe(401);
    const forged = new JwtService().sign({ sub: admin.id, isPlatformAdmin: true }, { secret: 'untrusted-test-key' });
    expect((await dashboard(forged)).status).toBe(401); noStatisticsRead();
  });
  it('rate-limits platform login using the existing sensitive-auth limiter', async () => {
    for (let i = 0; i < 5; i++) await signIn(admin.email, 'WrongPassword');
    const res = await signIn(admin.email, 'WrongPassword'); expect(res.status).toBe(429);
    expect(res.headers['retry-after']).toBeTruthy();
  });

  it.each(['clinics', 'subscriptions', 'users'])('protects the %s directory and returns safe paginated records', async kind => {
    expect((await request(app.getHttpServer()).get(`/admin/${kind}`)).status).toBe(401);
    const staff = await auth.login({ email: accounts.find(a => a.role === 'DOCTOR').email, password });
    expect((await request(app.getHttpServer()).get(`/admin/${kind}`).set('Authorization', `Bearer ${staff.token}`)).status).toBe(403);
    const login = await signIn();
    const result = await request(app.getHttpServer()).get(`/admin/${kind}?page=2&search=Dental`).set('Authorization', `Bearer ${login.body.token}`);
    expect(result.status).toBe(200); expect(result.body.page).toBe(2); expect(result.body).toHaveProperty('total');
    expect(JSON.stringify(result.body)).not.toContain('passwordHash');
    const query = db[kind === 'clinics' ? 'clinic' : kind === 'users' ? 'user' : 'subscription'].findMany.mock.calls.at(-1)[0];
    expect(query.take).toBe(20); expect(query.skip).toBe(20);
  });
  it('validates directory filters before querying the database', async () => {
    const login = await signIn();
    for (const query of ['page=0', 'page=-1', 'page=abc', 'status=ADMIN', 'search=a&search=b', 'clinicId=other']) {
      expect((await request(app.getHttpServer()).get(`/admin/clinics?${query}`).set('Authorization', `Bearer ${login.body.token}`)).status).toBe(400);
    }
    expect(db.clinic.findMany).not.toHaveBeenCalled();
  });

  it('rejects privilege injection in login and exposes no admin registration endpoint', async () => {
    const res = await request(app.getHttpServer()).post('/auth/platform-login').send({ email: admin.email, password, isPlatformAdmin: true });
    expect(res.status).toBe(400); expect(sessionRows.size).toBe(0);
    expect((await request(app.getHttpServer()).post('/admin/register').send({ email: 'new@admin.test', password })).status).toBe(404);
  });
});
