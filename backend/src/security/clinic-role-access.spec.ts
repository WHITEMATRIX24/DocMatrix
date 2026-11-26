import 'reflect-metadata';
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { AppointmentsController } from '../appointments/appointments.controller.js';
import { AppointmentsService } from '../appointments/appointments.service.js';
import { TreatmentPlansController } from '../treatment-plans/treatment-plans.controller.js';
import { TreatmentPlansService } from '../treatment-plans/treatment-plans.service.js';
import { ReportsController } from '../reports/reports.controller.js';
import { ReportsService } from '../reports/reports.service.js';
import { BillingController } from '../billing/billing.controller.js';
import { BillingService } from '../billing/billing.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';
import { BillingPermissionGuard } from '../billing/guards/billing-permission.guard.js';

Reflect.defineMetadata('design:paramtypes', [AppointmentsService], AppointmentsController);
Reflect.defineMetadata('design:paramtypes', [Reflector], BillingPermissionGuard);
const roles = ['ORGANIZATION_ADMIN', 'BRANCH_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'ACCOUNTANT', 'NURSE', 'LAB_TECHNICIAN', 'PHARMACIST'];
const intake = ['ORGANIZATION_ADMIN', 'BRANCH_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'NURSE'];
const clinical = ['ORGANIZATION_ADMIN', 'BRANCH_ADMIN', 'DOCTOR', 'NURSE'];
const finance = ['ORGANIZATION_ADMIN', 'BRANCH_ADMIN', 'ACCOUNTANT'];
const billingRoles = [...finance, 'DOCTOR', 'RECEPTIONIST'];

describe('Clinic role boundaries over HTTP (synthetic persistence)', () => {
  let app: any;
  const db: any = {
    clinic: { findUnique: vi.fn(async () => ({ status: 'ACTIVE' })) },
    appointment: { findFirst: vi.fn(async ({ where }: any) => where.id === 'own' && where.clinicId === 'clinic-a'
      ? { id: 'own', clinicId: 'clinic-a', startTime: new Date(), endTime: new Date(), patient: { patientCode: 'PAT-1' } } : null) },
  };
  const appointments = new AppointmentsService(db);
  appointments.listAppointments = vi.fn(async () => []) as any;
  appointments.updateAppointment = vi.fn(async (_clinic, id, dto) => ({ id, ...dto }));
  appointments.createAppointment = vi.fn(async (_clinic, dto) => dto) as any;
  const plans: any = { getTreatmentPlans: vi.fn(async () => []), createTreatmentPlan: vi.fn(async () => ({})) };
  const reports: any = Object.fromEntries(['getSummaryReport', 'getRevenueReport', 'getDoctorsReport', 'getTreatmentsReport', 'getFollowUpsReport'].map(key => [key, vi.fn(async () => ({}))]));
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AppointmentsController, TreatmentPlansController, ReportsController, BillingController],
      providers: [Reflector, TenantGuard, BillingPermissionGuard,
        { provide: PrismaService, useValue: db }, { provide: AppointmentsService, useValue: appointments },
        { provide: TreatmentPlansService, useValue: plans }, { provide: ReportsService, useValue: reports },
        { provide: BillingService, useValue: { getBillableTreatmentPlans: vi.fn(async () => []) } }],
    }).overrideGuard(JwtAuthGuard).useValue({ canActivate(context: any) {
      const req = context.switchToHttp().getRequest();
      const role = req.headers['x-test-role'];
      if (!role) throw new UnauthorizedException();
      req.user = { id: 'synthetic-staff', role, clinicId: req.headers['x-no-clinic'] ? null : 'clinic-a',
        isPlatformAdmin: req.headers['x-platform'] === 'true' };
      return true;
    } }).compile();
    app = module.createNestApplication(); await app.init();
  }, 60_000);
  afterAll(async () => { await app?.close(); });
  const routes: Array<[string, string[]]> = [
    ['/appointments', intake], ['/treatment-plans', clinical], ['/reports/summary', [...intake, 'ACCOUNTANT']],
    ['/reports/revenue', finance], ['/reports/doctors', [...clinical, 'ACCOUNTANT']],
    ['/reports/treatments', [...clinical, 'ACCOUNTANT']], ['/reports/follow-ups', intake],
    ['/billing/treatment-plans', billingRoles],
  ];
  it.each(roles)('enforces every read boundary for %s', async role => {
    for (const [path, allowed] of routes) {
      const res = await request(app.getHttpServer()).get(path).set('x-test-role', role);
      expect(res.status, `${role} ${path}: ${JSON.stringify(res.body)}`).toBe(allowed.includes(role) ? 200 : 403);
    }
  });
  it.each(roles)('enforces plan creation for %s', async role => {
    const res = await request(app.getHttpServer()).post('/treatment-plans').set('x-test-role', role).send({});
    expect(res.status).toBe(['ORGANIZATION_ADMIN', 'BRANCH_ADMIN', 'DOCTOR'].includes(role) ? 201 : 403);
  });
  it('allows nurse check-in while denying scheduling and consultation changes', async () => {
    for (const [payload, status] of [[{ status: 'checked_in' }, 200], [{ status: 'completed' }, 403],
      [{ status: 'checked-in', date: '2026-12-01' }, 403], [{ time: '12:00' }, 403]] as const) {
      expect((await request(app.getHttpServer()).patch('/appointments/own').set('x-test-role', 'NURSE').send(payload)).status).toBe(status);
    }
  });
  it.each(['in-progress', 'in_progress', 'COMPLETED'])('denies front-desk consultation status %s on both create and update', async status => {
    for (const method of ['post', 'patch'] as const) {
      const res = await request(app.getHttpServer())[method](method === 'post' ? '/appointments' : '/appointments/own')
        .set('x-test-role', 'RECEPTIONIST').send({ status });
      expect(res.status).toBe(403);
    }
    expect((await request(app.getHttpServer()).patch('/appointments/own').set('x-test-role', 'DOCTOR').send({ status })).status).toBe(200);
  });
  it('rejects unauthenticated requests and platform sessions with or without a clinic', async () => {
    for (const [path] of routes) {
      expect((await request(app.getHttpServer()).get(path)).status).toBe(401);
      for (const noClinic of ['true', '']) {
        expect((await request(app.getHttpServer()).get(path).set('x-test-role', 'ORGANIZATION_ADMIN')
          .set('x-platform', 'true').set('x-no-clinic', noClinic)).status).toBe(403);
      }
    }
  });
  it('does not return appointments belonging to a different clinic', async () => {
    expect((await request(app.getHttpServer()).get('/appointments/foreign').set('x-test-role', 'DOCTOR')).status).toBe(404);
    expect(db.appointment.findFirst).toHaveBeenLastCalledWith(expect.objectContaining({ where: { id: 'foreign', clinicId: 'clinic-a' } }));
  });
});


describe('Billable treatment-plan projection', () => {
  it('scopes queries to the clinic and excludes clinical notes, tooth details and revision history', async () => {
    const row = { id: 'tp-1', clinicId: 'clinic-a', planNumber: 'TP-1', patientId: 'p1', status: 'ACCEPTED',
      notes: 'private clinical note', title: 'private diagnosis', histories: [{ notes: 'private' }],
      patient: { patientCode: 'PAT-1', firstName: 'Synthetic', lastName: 'Patient', medicalSafetyAlerts: ['private allergy'] },
      stages: [{ id: 'stage-1', stageNumber: 1, name: 'private clinical stage', notes: 'private',
        items: [{ id: 'item-1', procedureName: 'Filling', toothNumber: '36', surface: 'MOD', notes: 'private item', netFee: 1200 }] }] };
    const project = (value: any, select: any): any => Array.isArray(value) ? value.map(item => project(item, select))
      : Object.fromEntries(Object.entries(select).map(([key, selection]: [string, any]) =>
        [key, selection === true ? value[key] : project(value[key], selection.select)]));
    const findMany = vi.fn(async ({ where, select }: any) => where.clinicId === row.clinicId ? [project(row, select)] : []);
    const service = new BillingService({ treatmentPlan: { findMany } } as any, {} as any);
    const plans = await service.getBillableTreatmentPlans('clinic-a');
    expect(plans[0].billingContextOnly).toBe(true);
    expect(plans[0].stages[0].items[0].id).toBe('item-1');
    expect(plans[0].stages[0].items[0].netFee).toBe(1200);
    expect(JSON.stringify(plans)).not.toContain('private');
    expect(JSON.stringify(plans)).not.toContain('toothNumber');
    expect(JSON.stringify(plans)).not.toContain('medicalSafetyAlerts');
    expect(await service.getBillableTreatmentPlans('clinic-b')).toEqual([]);
  });
});
