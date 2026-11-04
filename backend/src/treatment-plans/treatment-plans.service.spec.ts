import { Test, TestingModule } from '@nestjs/testing';
import { TreatmentPlansService } from './treatment-plans.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { AcceptanceMethod, TreatmentPlanItemStatus, TreatmentPlanStatus } from '@prisma/client';

describe('TreatmentPlansService', () => {
  let service: TreatmentPlansService;
  let prisma: any;

  const mockClinicId = 'clinic-101';
  const mockDoctorUser: AuthenticatedUser = {
    id: 'user-doc-1',
    clinicId: mockClinicId,
    email: 'doctor@docmatrix.in',
    fullName: 'Dr. Arun Kumar',
    name: 'Dr. Arun Kumar',
    role: 'DOCTOR',
    isPlatformAdmin: false,
    isPrimaryContact: false,
  };

  const mockReceptionistUser: AuthenticatedUser = {
    id: 'user-rec-1',
    clinicId: mockClinicId,
    email: 'rec@docmatrix.in',
    fullName: 'Reception Staff',
    name: 'Reception Staff',
    role: 'RECEPTIONIST' as any,
    isPlatformAdmin: false,
    isPrimaryContact: false,
  };

  const mockPatient = {
    id: 'pat-101',
    clinicId: mockClinicId,
    patientCode: 'pt-1001',
    firstName: 'Siddharth',
    lastName: 'Menon',
    gender: 'MALE',
    dateOfBirth: new Date('1988-08-20'),
    mobile: '+919847012345',
  };

  beforeEach(async () => {
    prisma = {
      patient: {
        findFirst: vi.fn(),
      },
      user: {
        findFirst: vi.fn(),
      },
      appointment: {
        findFirst: vi.fn(),
      },
      treatmentPlan: {
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
      treatmentPlanStage: {
        create: vi.fn(),
        deleteMany: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      treatmentPlanItem: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      treatmentEstimateRevision: {
        create: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      treatmentPlanHistory: {
        create: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => {
        return cb({
          $queryRaw: vi.fn().mockResolvedValue([{ assignedValue: 1001 }]),
          treatmentPlan: prisma.treatmentPlan,
          treatmentPlanStage: prisma.treatmentPlanStage,
          treatmentPlanItem: prisma.treatmentPlanItem,
          treatmentEstimateRevision: prisma.treatmentEstimateRevision,
          treatmentPlanHistory: prisma.treatmentPlanHistory,
        });
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TreatmentPlansService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<TreatmentPlansService>(TreatmentPlansService);
  });

  describe('FDI Tooth and Surface Validation', () => {
    it('should accept valid FDI permanent tooth numbers (11-48)', () => {
      expect(() => service.validateToothAndSurface('16', 'MOD')).not.toThrow();
      expect(() => service.validateToothAndSurface('21, 22', 'O')).not.toThrow();
      expect(() => service.validateToothAndSurface('46', 'B')).not.toThrow();
    });

    it('should accept valid FDI primary tooth numbers (51-85)', () => {
      expect(() => service.validateToothAndSurface('55', 'O')).not.toThrow();
      expect(() => service.validateToothAndSurface('84', 'DO')).not.toThrow();
    });

    it('should reject invalid FDI tooth numbers', () => {
      expect(() => service.validateToothAndSurface('99', 'O')).toThrow(BadRequestException);
      expect(() => service.validateToothAndSurface('19', 'MOD')).toThrow(BadRequestException);
    });

    it('should reject invalid dental surfaces', () => {
      expect(() => service.validateToothAndSurface('16', 'XYZ')).toThrow(BadRequestException);
    });
  });

  describe('createTreatmentPlan', () => {
    it('should reject unauthorized non-practitioner roles', async () => {
      await expect(
        service.createTreatmentPlan(mockClinicId, mockReceptionistUser, {
          patientId: 'pat-101',
          title: 'Care Plan',
          stages: [],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject plans with empty stages', async () => {
      prisma.patient.findFirst.mockResolvedValue(mockPatient);

      await expect(
        service.createTreatmentPlan(mockClinicId, mockDoctorUser, {
          patientId: 'pat-101',
          title: 'Care Plan',
          stages: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create plan with authoritative decimal calculations, TP-1001 number, and estimate revision v1', async () => {
      prisma.patient.findFirst.mockResolvedValue(mockPatient);

      const mockCreatedPlan = {
        id: 'tp-uuid-1',
        clinicId: mockClinicId,
        planNumber: 'TP-1001',
        patientId: mockPatient.id,
        doctorId: mockDoctorUser.id,
        title: 'Full Rehabilitation',
        status: TreatmentPlanStatus.PROPOSED,
        currentVersion: 1,
      };

      prisma.treatmentPlan.create.mockResolvedValue(mockCreatedPlan);
      prisma.treatmentPlanStage.create.mockResolvedValue({ id: 'stage-1' });
      prisma.treatmentPlanItem.create.mockResolvedValue({ id: 'item-1' });
      prisma.treatmentEstimateRevision.create.mockResolvedValue({ id: 'rev-1' });
      prisma.treatmentPlanHistory.create.mockResolvedValue({ id: 'hist-1' });
      prisma.treatmentPlan.findFirst.mockResolvedValue({
        ...mockCreatedPlan,
        stages: [],
        estimateRevisions: [],
        histories: [],
      });

      const result = await service.createTreatmentPlan(mockClinicId, mockDoctorUser, {
        patientId: 'pat-101',
        title: 'Full Rehabilitation',
        taxRate: 5,
        stages: [
          {
            stageNumber: 1,
            name: 'Stage 1: Urgent Relief',
            items: [
              {
                procedureCode: 'D3330',
                procedureName: 'Root Canal Therapy - Molar',
                category: 'Endodontics',
                toothNumber: '16',
                surface: 'O',
                quantity: 1,
                unitFee: 6500,
                discount: 500,
              },
            ],
          },
        ],
      });

      expect(prisma.treatmentPlan.create).toHaveBeenCalled();
      const planCallArgs = prisma.treatmentPlan.create.mock.calls[0][0].data;
      expect(planCallArgs.subtotal.toString()).toBe('6000');
      expect(planCallArgs.discount.toString()).toBe('500');
      expect(planCallArgs.tax.toString()).toBe('300'); // 5% of 6000
      expect(planCallArgs.totalEstimatedCost.toString()).toBe('6300');
      expect(planCallArgs.currentVersion).toBe(1);

      // Verify revision v1 snapshot was saved
      expect(prisma.treatmentEstimateRevision.create).toHaveBeenCalled();
      const revCallArgs = prisma.treatmentEstimateRevision.create.mock.calls[0][0].data;
      expect(revCallArgs.versionNumber).toBe(1);
      expect(revCallArgs.status).toBe('PROPOSED');

      // Verify audit history was saved
      expect(prisma.treatmentPlanHistory.create).toHaveBeenCalled();
    });
  });

  describe('Estimate Revision & Versioning', () => {
    it('should increment version to 2 and preserve previous estimate revision on stage update', async () => {
      const existingPlan = {
        id: 'tp-uuid-1',
        clinicId: mockClinicId,
        planNumber: 'TP-1001',
        status: TreatmentPlanStatus.PROPOSED,
        currentVersion: 1,
        subtotal: 6000,
        discount: 500,
        tax: 300,
        totalEstimatedCost: 6300,
        title: 'Full Rehabilitation',
        stages: [{ id: 'stage-1', items: [] }],
      };

      prisma.treatmentPlan.findFirst.mockResolvedValue(existingPlan);
      prisma.treatmentPlanStage.deleteMany.mockResolvedValue({ count: 1 });
      prisma.treatmentPlanStage.create.mockResolvedValue({ id: 'stage-2' });
      prisma.treatmentPlanItem.create.mockResolvedValue({ id: 'item-2' });
      prisma.treatmentEstimateRevision.create.mockResolvedValue({ id: 'rev-2' });
      prisma.treatmentPlanHistory.create.mockResolvedValue({ id: 'hist-2' });
      prisma.treatmentPlan.update.mockResolvedValue({
        ...existingPlan,
        currentVersion: 2,
      });

      await service.updateTreatmentPlan(mockClinicId, mockDoctorUser, 'tp-uuid-1', {
        revisionReason: 'Patient requested ceramic crown instead of metal',
        taxRate: 0,
        stages: [
          {
            stageNumber: 1,
            name: 'Stage 1: Modified',
            items: [
              {
                procedureCode: 'D2740',
                procedureName: 'Crown - Porcelain Substrate',
                category: 'Prosthodontics',
                toothNumber: '16',
                quantity: 1,
                unitFee: 8500,
                discount: 0,
              },
            ],
          },
        ],
      });

      expect(prisma.treatmentEstimateRevision.create).toHaveBeenCalled();
      const revCall = prisma.treatmentEstimateRevision.create.mock.calls[0][0].data;
      expect(revCall.versionNumber).toBe(2);
      expect(revCall.revisionReason).toBe('Patient requested ceramic crown instead of metal');
      expect(revCall.totalEstimatedCost.toString()).toBe('8500');

      expect(prisma.treatmentPlan.update).toHaveBeenCalled();
      const planUpdateCall = prisma.treatmentPlan.update.mock.calls[0][0].data;
      expect(planUpdateCall.currentVersion).toBe(2);
    });
  });

  describe('Patient Acceptance and Audit', () => {
    it('should associate acceptance with the exact estimate version and record staff flag', async () => {
      const existingPlan = {
        id: 'tp-uuid-1',
        clinicId: mockClinicId,
        planNumber: 'TP-1001',
        status: TreatmentPlanStatus.PROPOSED,
        currentVersion: 2,
      };

      const mockRevision = {
        id: 'rev-2',
        treatmentPlanId: 'tp-uuid-1',
        versionNumber: 2,
        status: 'PROPOSED',
      };

      prisma.treatmentPlan.findFirst.mockResolvedValue(existingPlan);
      prisma.treatmentEstimateRevision.findUnique.mockResolvedValue(mockRevision);
      prisma.treatmentEstimateRevision.update.mockResolvedValue({ ...mockRevision, status: 'ACCEPTED' });
      prisma.treatmentPlan.update.mockResolvedValue({
        ...existingPlan,
        status: TreatmentPlanStatus.ACCEPTED,
        acceptedVersion: 2,
      });
      prisma.treatmentPlanHistory.create.mockResolvedValue({ id: 'hist-acc' });

      await service.recordAcceptance(mockClinicId, mockDoctorUser, 'tp-uuid-1', {
        versionNumber: 2,
        patientAcceptedByName: 'Siddharth Menon',
        acceptanceMethod: AcceptanceMethod.STAFF_RECORDED,
        isStaffRecorded: true,
        notes: 'Verbally confirmed during chairside consult',
      });

      expect(prisma.treatmentEstimateRevision.update).toHaveBeenCalled();
      expect(prisma.treatmentPlan.update).toHaveBeenCalled();
      const updateData = prisma.treatmentPlan.update.mock.calls[0][0].data;
      expect(updateData.status).toBe(TreatmentPlanStatus.ACCEPTED);
      expect(updateData.acceptedVersion).toBe(2);
      expect(updateData.patientAcceptedByName).toBe('Siddharth Menon');
      expect(updateData.isStaffRecorded).toBe(true);

      // Verify audit history confirms staff-recorded disclaimer
      expect(prisma.treatmentPlanHistory.create).toHaveBeenCalled();
      const histData = prisma.treatmentPlanHistory.create.mock.calls[0][0].data;
      expect(histData.action).toBe('ACCEPTED');
      expect(histData.details.isStaffRecorded).toBe(true);
      expect(histData.details.disclaimer).toContain('Recorded by clinic staff on behalf of patient');
    });
  });

  describe('Legacy Plans Migration', () => {
    it('should safely import legacy records with origin tag without discarding or overwriting', async () => {
      prisma.patient.findFirst.mockResolvedValue(mockPatient);
      prisma.treatmentPlan.create.mockResolvedValue({ id: 'plan-leg-1' });
      prisma.treatmentPlanStage.create.mockResolvedValue({ id: 'stage-leg-1' });
      prisma.treatmentPlanItem.create.mockResolvedValue({ id: 'item-leg-1' });
      prisma.treatmentEstimateRevision.create.mockResolvedValue({ id: 'rev-leg-1' });
      prisma.treatmentPlanHistory.create.mockResolvedValue({ id: 'hist-leg-1' });

      const result = await service.importLegacyPlans(mockClinicId, mockDoctorUser, {
        plans: [
          {
            legacyId: 'TRT-1001',
            patientId: 'pat-101',
            procedure: 'Composite Restoration',
            category: 'Restorative',
            toothNumber: '24',
            status: 'Proposed',
            cost: 1800,
            doctor: 'Dr. Arun Kumar',
            notes: 'Legacy root restoration',
          },
        ],
      });

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(0);
      expect(prisma.treatmentPlan.create).toHaveBeenCalled();
      const createData = prisma.treatmentPlan.create.mock.calls[0][0].data;
      expect(createData.origin).toBe('IMPORTED_LEGACY');
      expect(createData.status).toBe(TreatmentPlanStatus.PROPOSED);
      expect(createData.subtotal.toString()).toBe('1800');
    });
  });
});

