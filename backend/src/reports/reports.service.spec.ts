import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import {
  AppointmentStatus,
  InvoicePaymentType,
  InvoiceStatus,
  PaymentMode,
  TreatmentPlanStatus,
} from '@prisma/client';

describe('ReportsService', () => {
  let reportsService: ReportsService;
  let prisma: any;

  const mockClinicId = 'clinic-alpha-101';

  const mockOwnerUser: AuthenticatedUser = {
    id: 'user-owner-1',
    clinicId: mockClinicId,
    email: 'owner@docmatrix.in',
    fullName: 'Dr. Vikram Rao',
    role: 'ORGANIZATION_ADMIN',
    isPlatformAdmin: false,
    isPrimaryContact: true,
  };

  const mockReceptionistUser: AuthenticatedUser = {
    id: 'user-rec-1',
    clinicId: mockClinicId,
    email: 'frontdesk@docmatrix.in',
    fullName: 'Neha Verma',
    role: 'RECEPTIONIST',
    isPlatformAdmin: false,
    isPrimaryContact: false,
  };

  beforeEach(async () => {
    prisma = {
      clinic: {
        findUnique: vi.fn().mockResolvedValue({
          id: mockClinicId,
          name: 'Apex Dental Studio',
        }),
      },
      patient: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
      },
      appointment: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      invoice: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      treatmentPlan: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      serviceTariff: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      user: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      auditLog: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        deleteMany: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    reportsService = module.get<ReportsService>(ReportsService);
  });

  describe('resolveDateSpan', () => {
    it('resolves today, 7d, month, 90d, year, and custom ranges with matching previous span', () => {
      const todayRes = reportsService.resolveDateSpan({ range: 'today' }, '2026-10-15');
      expect(todayRes.span).toEqual({ from: '2026-10-15', to: '2026-10-15' });
      expect(todayRes.prevSpan).toEqual({ from: '2026-10-14', to: '2026-10-14' });
      expect(todayRes.days).toBe(1);

      const weekRes = reportsService.resolveDateSpan({ range: '7d' }, '2026-10-15');
      expect(weekRes.span).toEqual({ from: '2026-10-09', to: '2026-10-15' });
      expect(weekRes.prevSpan).toEqual({ from: '2026-10-02', to: '2026-10-08' });
      expect(weekRes.days).toBe(7);

      const customRes = reportsService.resolveDateSpan({
        fromDate: '2026-10-01',
        toDate: '2026-10-10',
      });
      expect(customRes.span).toEqual({ from: '2026-10-01', to: '2026-10-10' });
      expect(customRes.days).toBe(10);
      expect(customRes.prevSpan).toEqual({ from: '2026-09-21', to: '2026-09-30' });
    });
  });

  describe('getRevenueReport', () => {
    it('computes collected, billed, unpaid, payment mode shares, and subtracts refunds', async () => {
      prisma.invoice.findMany.mockResolvedValue([
        {
          id: 'inv-1',
          invoiceNumber: 'INV-1001',
          patientId: 'p-1',
          status: InvoiceStatus.PAID,
          totalAmount: 2000,
          paidAmount: 2000,
          balance: 0,
          issuedAt: new Date('2026-10-10T10:00:00Z'),
          createdAt: new Date('2026-10-10T10:00:00Z'),
          payments: [
            {
              id: 'pay-1',
              type: InvoicePaymentType.PAYMENT,
              amount: 2000,
              mode: PaymentMode.UPI,
              receivedAt: new Date('2026-10-10T10:05:00Z'),
            },
          ],
        },
        {
          id: 'inv-2',
          invoiceNumber: 'INV-1002',
          patientId: 'p-2',
          status: InvoiceStatus.PARTIALLY_PAID,
          totalAmount: 3000,
          paidAmount: 1000,
          balance: 2000,
          issuedAt: new Date('2026-10-12T10:00:00Z'),
          createdAt: new Date('2026-10-12T10:00:00Z'),
          payments: [
            {
              id: 'pay-2',
              type: InvoicePaymentType.PAYMENT,
              amount: 1500,
              mode: PaymentMode.CASH,
              receivedAt: new Date('2026-10-12T10:05:00Z'),
            },
            {
              id: 'pay-3-ref',
              type: InvoicePaymentType.REFUND,
              amount: 500,
              mode: PaymentMode.CASH,
              receivedAt: new Date('2026-10-12T12:00:00Z'),
            },
          ],
        },
      ]);

      const report = await reportsService.getRevenueReport(
        mockClinicId,
        mockOwnerUser,
        { fromDate: '2026-10-01', toDate: '2026-10-31' },
      );

      expect(report.current.billed).toBe(5000);
      expect(report.current.collected).toBe(3000); // 2000 UPI + (1500 - 500) Cash
      expect(report.current.unpaid).toBe(2000);
      expect(report.current.averageBill).toBe(2500);
      expect(report.current.byMode.UPI).toBe(2000);
      expect(report.current.byMode.Cash).toBe(1000);
      expect(report.series.length).toBe(31);
    });

    it('rejects receptionist access to revenue report with ForbiddenException', async () => {
      await expect(
        reportsService.getRevenueReport(mockClinicId, mockReceptionistUser, {
          range: 'month',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getDoctorsReport', () => {
    it('aggregates real database doctors, appointments, treatment plans, and linked invoices', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'doc-1', fullName: 'Dr. Anjali Menon', role: 'DOCTOR' },
        { id: 'doc-2', fullName: 'Dr. Rohan Kapoor', role: 'DOCTOR' },
      ]);
      prisma.appointment.findMany.mockResolvedValue([
        {
          id: 'appt-1',
          patientId: 'p-1',
          doctorId: 'doc-1',
          doctorName: 'Dr. Anjali Menon',
          date: new Date('2026-10-05T00:00:00Z'),
          status: AppointmentStatus.COMPLETED,
        },
        {
          id: 'appt-2',
          patientId: 'p-2',
          doctorId: 'doc-1',
          doctorName: 'Dr. Anjali Menon',
          date: new Date('2026-10-06T00:00:00Z'),
          status: AppointmentStatus.NO_SHOW,
        },
      ]);
      prisma.treatmentPlan.findMany.mockResolvedValue([
        {
          id: 'tp-1',
          patientId: 'p-1',
          doctorId: 'doc-1',
          doctorName: 'Dr. Anjali Menon',
          status: TreatmentPlanStatus.COMPLETED,
          totalEstimatedCost: 4500,
          createdAt: new Date('2026-10-05T09:00:00Z'),
          stages: [],
        },
      ]);
      prisma.invoice.findMany.mockResolvedValue([
        {
          id: 'inv-1',
          patientId: 'p-1',
          appointmentId: 'appt-1',
          status: InvoiceStatus.PAID,
          totalAmount: 4500,
          paidAmount: 4500,
          balance: 0,
          issuedAt: new Date('2026-10-05T11:00:00Z'),
          createdAt: new Date('2026-10-05T11:00:00Z'),
          payments: [],
        },
      ]);

      const res = await reportsService.getDoctorsReport(
        mockClinicId,
        mockOwnerUser,
        { fromDate: '2026-10-01', toDate: '2026-10-31' },
      );

      expect(res.doctors.length).toBe(2);
      const anjali = res.doctors.find((d) => d.doctor === 'Dr. Anjali Menon')!;
      expect(anjali.appointments).toBe(2);
      expect(anjali.completed).toBe(1);
      expect(anjali.noShows).toBe(1);
      expect(anjali.attendancePct).toBe(50);
      expect(anjali.proceduresDone).toBe(2); // 1 completed visit + 1 completed plan
      expect(anjali.collected).toBe(4500);
      expect(anjali.planValue).toBe(4500);

      // Verify receptionist sees 0 for money columns
      const recRes = await reportsService.getDoctorsReport(
        mockClinicId,
        mockReceptionistUser,
        { fromDate: '2026-10-01', toDate: '2026-10-31' },
      );
      expect(recRes.doctors[0].collected).toBe(0);
      expect(recRes.doctors[0].planValue).toBe(0);
    });
  });

  describe('getTreatmentsReport', () => {
    it('groups completed visits and treatment plan items by tariff/plan category and tracks top teeth', async () => {
      prisma.serviceTariff.findMany.mockResolvedValue([
        {
          id: 'tar-1',
          name: 'Laser Gum Contouring',
          category: 'Periodontics',
          standardFee: 6000,
        },
      ]);
      prisma.appointment.findMany.mockResolvedValue([
        {
          id: 'appt-1',
          patientId: 'p-1',
          treatmentType: 'Laser Gum Contouring',
          visitType: 'Procedure',
          date: new Date('2026-10-10T00:00:00Z'),
          status: AppointmentStatus.COMPLETED,
        },
      ]);
      prisma.treatmentPlan.findMany.mockResolvedValue([
        {
          id: 'tp-1',
          patientId: 'p-1',
          title: 'Molar Endodontics',
          status: TreatmentPlanStatus.IN_PROGRESS,
          totalEstimatedCost: 4500,
          createdAt: new Date('2026-10-11T00:00:00Z'),
          stages: [
            {
              id: 'stg-1',
              stageNumber: 1,
              items: [
                {
                  id: 'item-1',
                  procedureName: 'Root Canal Treatment',
                  category: 'Endodontics',
                  toothNumber: '46',
                  unitFee: 4500,
                  netFee: 4500,
                  status: 'IN_PROGRESS',
                },
              ],
            },
          ],
        },
      ]);

      const res = await reportsService.getTreatmentsReport(
        mockClinicId,
        mockOwnerUser,
        { fromDate: '2026-10-01', toDate: '2026-10-31' },
      );

      expect(res.categories.some((c) => c.category === 'Periodontics')).toBe(true);
      expect(res.categories.some((c) => c.category === 'Endodontics')).toBe(true);
      expect(res.topTeeth).toEqual([{ tooth: '46', count: 1 }]);
    });
  });

  describe('getFollowUpsReport & Contact Persistence', () => {
    it('identifies missed visits, unfinished treatment plans, and recall patients and persists contact status', async () => {
      prisma.patient.findMany.mockResolvedValue([
        {
          id: 'pat-uuid-1',
          patientCode: 'PAT-1001',
          firstName: 'Anil',
          lastName: 'Varma',
          mobile: '9876500000',
          medicalSafetyAlerts: { allergies: 'Penicillin' },
        },
      ]);
      prisma.treatmentPlan.findMany.mockResolvedValue([
        {
          id: 'tp-1',
          patientId: 'pat-uuid-1',
          doctorName: 'Dr. Arun Kumar',
          title: 'Composite filling',
          status: TreatmentPlanStatus.ACCEPTED,
          totalEstimatedCost: 1800,
          createdAt: new Date('2026-10-05T10:00:00Z'),
          stages: [
            {
              id: 'stg-1',
              stageNumber: 1,
              items: [
                {
                  id: 'it-1',
                  procedureName: 'Composite filling',
                  toothNumber: '36',
                  netFee: 1800,
                },
              ],
            },
          ],
        },
      ]);

      const report = await reportsService.getFollowUpsReport(mockClinicId, {
        fromDate: '2026-10-01',
        toDate: '2026-10-31',
      });

      expect(report.contactCounts.treatment).toBe(1);
      expect(report.contacts[0].patientName).toBe('Anil Varma');
      expect(report.contacts[0].title).toContain('Composite filling (tooth 36)');
      expect(report.contacts[0].whatsappText).toContain('Apex Dental Studio');

      // Test marking patient contacted
      prisma.patient.findFirst.mockResolvedValue({
        id: 'pat-uuid-1',
        patientCode: 'PAT-1001',
      });
      prisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

      const contactRes = await reportsService.markPatientContacted(
        mockClinicId,
        mockOwnerUser,
        'PAT-1001',
      );
      expect(contactRes.contacted).toBe(true);
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clinicId: mockClinicId,
            action: 'CONTACTED',
            entityType: 'PATIENT_FOLLOW_UP',
            entityId: 'PAT-1001',
          }),
        }),
      );

      // Test unmarking patient contacted
      const unmarkRes = await reportsService.unmarkPatientContacted(
        mockClinicId,
        mockOwnerUser,
        'PAT-1001',
      );
      expect(unmarkRes.contacted).toBe(false);
      expect(prisma.auditLog.deleteMany).toHaveBeenCalled();
    });

    it('throws NotFoundException when marking nonexistent patient as contacted', async () => {
      prisma.patient.findFirst.mockResolvedValue(null);
      await expect(
        reportsService.markPatientContacted(
          mockClinicId,
          mockOwnerUser,
          'NONEXISTENT',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
