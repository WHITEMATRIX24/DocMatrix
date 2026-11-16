import 'reflect-metadata';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { StaffRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { ClinicsController } from './clinics.controller.js';
import { ClinicsService } from './clinics.service.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { UpdateStaffDto } from './dto/update-staff.dto.js';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { JwtStrategy } from '../auth/jwt.strategy.js';
import { SessionService } from '../auth/session.service.js';
import { AuthService } from '../auth/auth.service.js';
import { BillingController } from '../billing/billing.controller.js';
import { BillingService } from '../billing/billing.service.js';
import { BillingPermissionGuard } from '../billing/guards/billing-permission.guard.js';
import { ReportsController } from '../reports/reports.controller.js';
import { ReportsService } from '../reports/reports.service.js';
import { ClinicalNotesController } from '../clinical-notes/clinical-notes.controller.js';
import { ClinicalNotesService } from '../clinical-notes/clinical-notes.service.js';
import { PrescriptionsService } from '../prescriptions/prescriptions.service.js';
import { PrescriptionsController } from '../prescriptions/prescriptions.controller.js';
import { CreatePrescriptionDto } from '../prescriptions/dto/create-prescription.dto.js';
import { AppointmentsController } from '../appointments/appointments.controller.js';
import { AppointmentsService } from '../appointments/appointments.service.js';

// Vitest's esbuild transform does not emit TypeScript design metadata. Supply
// the same DTO/constructor metadata emitted by the production Nest build.
Reflect.defineMetadata('design:paramtypes', [AuthenticatedUser, CreateStaffDto], ClinicsController.prototype, 'addStaff');
Reflect.defineMetadata('design:paramtypes', [AuthenticatedUser, String, UpdateStaffDto], ClinicsController.prototype, 'updateStaff');
Reflect.defineMetadata('design:paramtypes', [ClinicalNotesService], ClinicalNotesController);
Reflect.defineMetadata('design:paramtypes', [PrescriptionsService], PrescriptionsController);
Reflect.defineMetadata('design:paramtypes', [AppointmentsService], AppointmentsController);
Reflect.defineMetadata('design:paramtypes', [AuthenticatedUser, CreatePrescriptionDto], PrescriptionsController.prototype, 'createPrescription');

describe('Clinic-owner staff management HTTP/RBAC (synthetic persistence only)', () => {
  let app: any, db: any, auth: AuthService, sessions: SessionService, service: ClinicsService;
  let users: Map<string, any>, sessionRows: Map<string, any>, audit: any, billing: any;
  const password = 'Synthetic-Staff-2026!';
  const jwt = new JwtService({ secret: 'synthetic-test-key-for-staff-authorization', signOptions: { expiresIn: '15m' } });
  const select = (row: any, fields: any) => !row ? null : fields ? Object.fromEntries(Object.keys(fields).filter(k => fields[k]).map(k => [k, row[k]])) : { ...row };
  const matches = (row: any, where: any) => Object.entries(where || {}).every(([k, v]) => row[k] === v);

  beforeEach(async () => {
    users = new Map(); sessionRows = new Map();
    for (const [id, clinicId, role, primary] of [
      ['owner-a', 'clinic-a', 'ORGANIZATION_ADMIN', true], ['owner-b', 'clinic-b', 'ORGANIZATION_ADMIN', true],
      ['branch-a', 'clinic-a', 'BRANCH_ADMIN', false],
    ] as const) users.set(id, { id, clinicId, role, fullName: id, email: `${id}@docmatrix.test`, passwordHash: bcrypt.hashSync(password, 4), isPrimaryContact: primary, isPlatformAdmin: false, isActive: true });
    db = {
      user: {
        findUnique: vi.fn(async ({ where, select: fields }: any) => select([...users.values()].find(u => matches(u, where)), fields)),
        findFirst: vi.fn(async ({ where }: any) => select([...users.values()].find(u => matches(u, where)), null)),
        findMany: vi.fn(async ({ where, select: fields }: any) => [...users.values()].filter(u => matches(u, where)).map(u => select(u, fields))),
        create: vi.fn(async ({ data, select: fields }: any) => {
          if ([...users.values()].some(u => u.email === data.email)) throw { code: 'P2002' };
          const row = { id: `staff-${users.size}`, ...data, createdAt: new Date(), updatedAt: new Date() };
          users.set(row.id, row); return select(row, fields);
        }),
        update: vi.fn(async ({ where, data, select: fields }: any) => {
          const key = where.id_clinicId || where;
          const row = [...users.values()].find(u => matches(u, key));
          if (!row) throw { code: 'P2025' };
          Object.assign(row, data); return select(row, fields);
        }),
      },
      userSession: {
        create: vi.fn(async ({ data }: any) => { const row = { id: `session-${sessionRows.size}`, ...data }; sessionRows.set(row.id, row); return { ...row }; }),
        findUnique: vi.fn(async ({ where }: any) => [...sessionRows.values()].find(s => matches(s, where)) || null),
        updateMany: vi.fn(async ({ where, data }: any) => { let count = 0; for (const s of sessionRows.values()) if (matches(s, where)) { Object.assign(s, data); count++; } return { count }; }),
      },
      clinicalNote: { findMany: vi.fn(async () => []) },
      appointment: { findMany: vi.fn(async () => []) },
    };
    db.$transaction = vi.fn(async (fn: any) => {
      const beforeUsers = structuredClone(users), beforeSessions = structuredClone(sessionRows);
      try { return await fn(db); } catch (e) { users = beforeUsers; sessionRows = beforeSessions; throw e; }
    });
    audit = { recordEvent: vi.fn() };
    service = new ClinicsService(db, audit);
    sessions = new SessionService(db);
    auth = new AuthService(db, jwt, sessions, undefined, audit);
    billing = { getInvoices: vi.fn(async () => []), recordPayment: vi.fn(async () => ({ id: 'payment-a' })), refundPayment: vi.fn(async () => ({ id: 'refund-a' })) };
    const fixture = await Test.createTestingModule({
      controllers: [ClinicsController, BillingController, ReportsController, ClinicalNotesController, PrescriptionsController, AppointmentsController],
      providers: [
        { provide: ClinicsService, useValue: service }, { provide: BillingService, useValue: billing },
        { provide: ReportsService, useValue: new ReportsService(db) },
        { provide: ClinicalNotesService, useValue: new ClinicalNotesService(db) },
        { provide: PrescriptionsService, useValue: new PrescriptionsService(db) },
        { provide: AppointmentsService, useValue: new AppointmentsService(db) },
      ],
    }).overrideGuard(JwtAuthGuard).useValue({ canActivate: async (ctx: any) => {
      const req = ctx.switchToHttp().getRequest();
      try {
        const payload = jwt.verify(req.headers.authorization?.replace(/^Bearer /, ''));
        req.user = await JwtStrategy.prototype.validate.call({ prisma: db, sessionService: sessions } as any, payload);
        return true;
      } catch { throw new UnauthorizedException(); }
    }}).overrideGuard(RolesGuard).useValue(new RolesGuard(new Reflector()))
      .overrideGuard(BillingPermissionGuard).useValue(new BillingPermissionGuard(new Reflector())).compile();
    app = fixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
  });
  afterEach(async () => { await app?.close(); });
  const login = async (id: string) => auth.login({ email: users.get(id).email, password });
  const call = (method: 'get' | 'post' | 'patch' | 'delete', path: string, token: string) => request(app.getHttpServer())[method](path).set('Authorization', `Bearer ${token}`);
  async function create(role: StaffRole, token?: string) {
    const owner = token || (await login('owner-a')).token;
    return call('post', '/clinics/my-clinic/staff', owner).send({ fullName: `${role} Staff`, email: `${role.toLowerCase()}@docmatrix.test`, role, password });
  }

  it.each([StaffRole.DOCTOR, StaffRole.RECEPTIONIST, StaffRole.ACCOUNTANT, StaffRole.NURSE, StaffRole.LAB_TECHNICIAN, StaffRole.PHARMACIST])('owner creates %s with hashed credentials and existing role', async role => {
    const res = await create(role); expect(res.status).toBe(201);
    const stored = users.get(res.body.id);
    expect(stored.clinicId).toBe('clinic-a'); expect(stored.role).toBe(role);
    expect(await bcrypt.compare(password, stored.passwordHash)).toBe(true);
    expect(res.body.passwordHash).toBeUndefined(); expect(res.body.password).toBeUndefined();
    expect(stored.isPlatformAdmin).toBe(false); expect(stored.isPrimaryContact).toBe(false);
    expect(audit.recordEvent).toHaveBeenCalledWith(expect.objectContaining({ module: 'Staff', action: 'STAFF_CREATED', actorId: 'owner-a' }));
    expect(JSON.stringify(audit.recordEvent.mock.calls)).not.toContain(password);
  });
  it('doctor can read clinical records and cannot create or edit staff', async () => {
    const created = await create(StaffRole.DOCTOR); const { token } = await login(created.body.id);
    expect((await call('get', '/clinical-notes', token)).status).toBe(200);
    expect((await call('get', '/clinics/my-clinic/staff', token)).status).toBe(403);
    const directory = await call('get', '/clinics/my-clinic/practitioners', token);
    expect(directory.status).toBe(200);
    expect(directory.body).toEqual([{ id: created.body.id, fullName: 'DOCTOR Staff', role: 'DOCTOR' }]);
    expect((await create(StaffRole.ORGANIZATION_ADMIN, token)).status).toBe(403);
    expect((await call('patch', '/clinics/my-clinic/staff/owner-a', token).send({ role: 'DOCTOR' })).status).toBe(403);
  });
  it('receptionist retains payment collection but not refunds, revenue reports or staff management', async () => {
    const created = await create(StaffRole.RECEPTIONIST); const { token } = await login(created.body.id);
    expect((await call('get', '/appointments', token)).status).toBe(200);
    expect((await call('get', '/billing/invoices', token)).status).toBe(200);
    expect((await call('post', '/billing/invoices/inv-a/payments', token).send({ amount: 10, mode: 'CASH' })).status).toBe(201);
    expect((await call('post', '/billing/payments/pay-a/refund', token).send({ amount: 10 })).status).toBe(403);
    expect((await call('get', '/reports/revenue', token)).status).toBe(403);
    expect((await create(StaffRole.ORGANIZATION_ADMIN, token)).status).toBe(403);
  });
  it('accountant retains refunds and cannot manage staff', async () => {
    const created = await create(StaffRole.ACCOUNTANT); const { token } = await login(created.body.id);
    expect((await call('post', '/billing/payments/pay-a/refund', token).send({ amount: 10 })).status).toBe(201);
    expect((await create(StaffRole.DOCTOR, token)).status).toBe(403);
  });
  it('role change revokes old sessions; fresh login receives the current permissions', async () => {
    const created = await create(StaffRole.DOCTOR); const old = await login(created.body.id);
    const owner = await login('owner-a');
    expect((await call('patch', `/clinics/my-clinic/staff/${created.body.id}`, owner.token).send({ role: 'RECEPTIONIST' })).status).toBe(200);
    expect((await call('get', '/billing/invoices', old.token)).status).toBe(401);
    await expect(sessions.rotateRefreshToken(old.refreshToken)).rejects.toThrow();
    const fresh = await login(created.body.id); expect(fresh.user.role).toBe('RECEPTIONIST');
    expect((await call('post', '/billing/payments/pay-a/refund', fresh.token).send({ amount: 1 })).status).toBe(403);
    expect(audit.recordEvent).toHaveBeenCalledWith(expect.objectContaining({ action: 'STAFF_ROLE_CHANGED', metadata: expect.objectContaining({ previousRole: 'DOCTOR', role: 'RECEPTIONIST' }) }));
  });
  it('tenant boundary denies foreign IDs and forged clinic/privilege fields', async () => {
    const { token } = await login('owner-a');
    expect((await call('patch', '/clinics/my-clinic/staff/owner-b', token).send({ fullName: 'Wrong clinic' })).status).toBe(404);
    expect((await call('delete', '/clinics/my-clinic/staff/owner-b', token)).status).toBe(404);
    for (const extra of [{ clinicId: 'clinic-b' }, { isPlatformAdmin: true }, { isPrimaryContact: true }, { practitionerVerifiedAt: new Date().toISOString() }]) {
      expect((await call('post', '/clinics/my-clinic/staff', token).send({ fullName: 'Tampered', email: 'tampered@docmatrix.test', password, role: 'DOCTOR', ...extra })).status).toBe(400);
    }
    const list = await call('get', '/clinics/my-clinic/staff', token);
    expect(list.body.some((s: any) => s.id === 'owner-b')).toBe(false);
  });
  it('primary owner cannot be removed, deactivated, demoted or moved', async () => {
    const { token } = await login('owner-a');
    expect((await call('delete', '/clinics/my-clinic/staff/owner-a', token)).status).toBe(400);
    for (const change of [{ isActive: false }, { role: 'DOCTOR' }, { clinicId: 'clinic-b' }]) {
      expect((await call('patch', '/clinics/my-clinic/staff/owner-a', token).send(change)).status).toBe(400);
    }
    expect(users.get('owner-a').role).toBe('ORGANIZATION_ADMIN');
  });
  it('branch administrators cannot assign or modify administrator roles', async () => {
    const { token } = await login('branch-a');
    const roles = await call('get', '/clinics/my-clinic/staff/roles', token);
    expect(roles.body.map((r: any) => r.value)).not.toContain('ORGANIZATION_ADMIN');
    expect(roles.body.map((r: any) => r.value)).not.toContain('BRANCH_ADMIN');
    expect((await create(StaffRole.ORGANIZATION_ADMIN, token)).status).toBe(403);
    expect((await call('patch', '/clinics/my-clinic/staff/branch-a', token).send({ role: 'ORGANIZATION_ADMIN' })).status).toBe(403);
    expect((await call('patch', '/clinics/my-clinic/staff/owner-a', token).send({ fullName: 'Wrong' })).status).toBe(403);
  });
  it('deactivation and removal revoke access, while reactivation requires a new login', async () => {
    const created = await create(StaffRole.RECEPTIONIST); const old = await login(created.body.id); const owner = await login('owner-a');
    await call('patch', `/clinics/my-clinic/staff/${created.body.id}`, owner.token).send({ isActive: false }).expect(200);
    expect((await call('get', '/billing/invoices', old.token)).status).toBe(401);
    await expect(login(created.body.id)).rejects.toThrow();
    await call('patch', `/clinics/my-clinic/staff/${created.body.id}`, owner.token).send({ isActive: true }).expect(200);
    expect((await call('get', '/billing/invoices', old.token)).status).toBe(401);
    const fresh = await login(created.body.id);
    await call('delete', `/clinics/my-clinic/staff/${created.body.id}`, owner.token).expect(200);
    expect(users.has(created.body.id)).toBe(true); expect(users.get(created.body.id).isActive).toBe(false);
    expect((await call('get', '/billing/invoices', fresh.token)).status).toBe(401);
    for (const action of ['STAFF_DEACTIVATED', 'STAFF_ACTIVATED', 'STAFF_REMOVED']) expect(audit.recordEvent).toHaveBeenCalledWith(expect.objectContaining({ action }));
  });
  it('duplicate accounts and invalid enum/password/name values are rejected', async () => {
    await create(StaffRole.DOCTOR); expect((await create(StaffRole.DOCTOR)).status).toBe(409);
    const { token } = await login('owner-a');
    for (const change of [{ role: 'CUSTOM_ADMIN' }, { role: 'STAFF' }, { fullName: ' ' }, { password: 'short' }, { password: 'é'.repeat(40) }]) {
      expect((await call('post', '/clinics/my-clinic/staff', token).send({ fullName: 'Test', email: 'new@docmatrix.test', password, role: 'DOCTOR', ...change })).status).toBe(400);
    }
  });
  it('ordinary administrators and primary owners cannot prescribe', async () => {
    const { token } = await login('owner-a');
    expect((await call('post', '/prescriptions', token).send({ patientId: '11111111-1111-4111-8111-111111111111', diagnosis: 'Synthetic', items: [{ medicineName: 'Synthetic', dosage: '1', frequency: 'Daily', duration: '1 day' }] })).status).toBe(403);
  });
});
