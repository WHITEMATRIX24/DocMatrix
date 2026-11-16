import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import { ClinicsService } from './clinics.service.js';

describe('ClinicsService', () => {
  let service: ClinicsService;
  let mockPrisma: any;

  const mockClinicId = 'clinic-uuid-1';

  beforeEach(() => {
    mockPrisma = {
      clinic: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn(),
        update: vi.fn(),
      },
      inventoryAudit: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      treatmentPlanHistory: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      clinicalNoteAddendum: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      invoicePayment: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      patientConsent: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      patient: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      appointment: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      prescription: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    service = new ClinicsService(mockPrisma);
  });

  describe('getClinic & updateClinic', () => {
    it('returns clinic profile with counts and extended settings', async () => {
      mockPrisma.clinic.findUnique.mockResolvedValue({
        id: mockClinicId,
        name: 'DocMatrix Dental Care',
        city: 'Bengaluru',
        _count: { users: 5, patients: 120, appointments: 45 },
      });

      const res = await service.getClinic(mockClinicId);
      expect(res.name).toBe('DocMatrix Dental Care');
      expect(res._count.patients).toBe(120);
      expect(res.workingHours).toBeDefined();
    });

    it('throws NotFoundException if clinic does not exist', async () => {
      mockPrisma.clinic.findUnique.mockResolvedValue(null);
      await expect(service.getClinic('unknown-id')).rejects.toThrow(NotFoundException);
    });

    it('updates clinic profile details and persists extended configuration', async () => {
      mockPrisma.clinic.findUnique.mockResolvedValue({ id: mockClinicId, name: 'Old Name' });
      mockPrisma.clinic.update.mockResolvedValue({
        id: mockClinicId,
        name: 'Updated Dental Clinic',
        city: 'Mumbai',
      });

      const updated = await service.updateClinic(mockClinicId, {
        name: 'Updated Dental Clinic',
        city: 'Mumbai',
        displayName: 'Updated Dental Specialist Clinic',
        gstin: '29ABCDE1234F1Z5',
        registrationNumber: 'KA-2024-99',
      });

      expect(updated.name).toBe('Updated Dental Clinic');
      expect(updated.displayName).toBe('Updated Dental Specialist Clinic');
      expect(updated.gstin).toBe('29ABCDE1234F1Z5');
      expect(mockPrisma.clinic.update).toHaveBeenCalledWith({
        where: { id: mockClinicId },
        data: expect.objectContaining({ name: 'Updated Dental Clinic', city: 'Mumbai' }),
      });
    });
  });

  describe('Staff Management', () => {
    it('lists staff members belonging to the clinic', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'usr-1', fullName: 'Dr. Arun Kumar', role: StaffRole.DOCTOR, isActive: true },
        { id: 'usr-2', fullName: 'Priya Sharma', role: StaffRole.RECEPTIONIST, isActive: true },
      ]);

      const staff = await service.getClinicStaff(mockClinicId);
      expect(staff).toHaveLength(2);
      expect(staff[0].fullName).toBe('Dr. Arun Kumar');
    });

    it('adds a new staff member to the clinic', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'usr-new',
        fullName: 'Dr. Neha Verma',
        email: 'dr.neha@example.com',
        role: StaffRole.DOCTOR,
        isActive: true,
      });

      const newStaff = await service.addStaff(mockClinicId, {
        fullName: 'Dr. Neha Verma',
        email: 'dr.neha@example.com',
        password: 'Password123!',
        role: StaffRole.DOCTOR,
      });

      expect(newStaff.fullName).toBe('Dr. Neha Verma');
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it('updates staff member and prevents deactivating the primary clinic owner', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'owner-id',
        clinicId: mockClinicId,
        isPrimaryContact: true,
      });

      await expect(
        service.updateStaff(mockClinicId, 'owner-id', { isActive: false }),
      ).rejects.toThrow(BadRequestException);
    });

    it('prevents changing the role of primary clinic owner', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'owner-id',
        clinicId: mockClinicId,
        role: StaffRole.ORGANIZATION_ADMIN,
        isPrimaryContact: true,
      });

      await expect(
        service.updateStaff(mockClinicId, 'owner-id', { role: StaffRole.DOCTOR }),
      ).rejects.toThrow(BadRequestException);
    });

    it('successfully updates staff role and active status for non-owner', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'staff-2',
        clinicId: mockClinicId,
        isPrimaryContact: false,
      });
      mockPrisma.user.update.mockResolvedValue({
        id: 'staff-2',
        role: StaffRole.BRANCH_ADMIN,
        isActive: false,
      });

      const res = await service.updateStaff(mockClinicId, 'staff-2', {
        role: StaffRole.BRANCH_ADMIN,
        isActive: false,
      });

      expect(res.role).toBe(StaffRole.BRANCH_ADMIN);
      expect(res.isActive).toBe(false);
    });
  });

  describe('Clinical Configuration', () => {
    it('loads and persists clinical configuration per tenant', async () => {
      const config = {
        customMedicines: [{ id: 'cm-1', name: 'Custom Analgesic 100mg' }],
        customProcedures: [{ id: 'cp-1', name: 'Laser Gingivectomy' }],
        customDiagnoses: [{ id: 'cd-1', name: 'Peri-implantitis' }],
        customTemplates: [{ id: 'ct-1', title: 'Implant Consultation' }],
        governancePolicies: { mandatoryConsentForSurgery: true },
      };

      await service.updateClinicalConfig(mockClinicId, config);
      const loaded = await service.getClinicalConfig(mockClinicId);
      expect(loaded.customMedicines).toHaveLength(1);
      expect(loaded.customMedicines[0].name).toBe('Custom Analgesic 100mg');
    });
  });

  describe('Activity Log Aggregator', () => {
    it('returns unified, sorted activity log entries across modules including appointments and prescriptions', async () => {
      const now = new Date();
      mockPrisma.patient.findMany.mockResolvedValue([
        {
          id: 'p-1',
          firstName: 'Rahul',
          lastName: 'Sen',
          patientCode: 'PT-101',
          createdAt: new Date(now.getTime() - 10000),
        },
      ]);

      mockPrisma.invoicePayment.findMany.mockResolvedValue([
        {
          id: 'pay-1',
          type: 'PAYMENT',
          amount: 2500,
          mode: 'UPI',
          reference: 'UPI-REF-123',
          createdAt: now,
          receivedById: 'staff-1',
        },
      ]);

      mockPrisma.appointment.findMany.mockResolvedValue([
        {
          id: 'app-1',
          status: 'CANCELLED',
          cancellationReason: 'Patient unwell',
          patient: { firstName: 'Rahul', lastName: 'Sen' },
          updatedAt: new Date(now.getTime() - 2000),
          createdAt: new Date(now.getTime() - 5000),
        },
      ]);

      mockPrisma.prescription.findMany.mockResolvedValue([
        {
          id: 'rx-1',
          prescriptionNumber: 'RX-2026-001',
          patient: { firstName: 'Rahul', lastName: 'Sen' },
          createdAt: new Date(now.getTime() - 4000),
        },
      ]);

      const log = await service.getActivityLog(mockClinicId, 10);
      expect(log.length).toBeGreaterThanOrEqual(4);
      expect(log[0].module).toBe('Billing'); // most recent
      expect(log.some((e) => e.action === 'APPOINTMENT_CANCELLED')).toBe(true);
      expect(log.some((e) => e.action === 'PRESCRIPTION_ISSUED')).toBe(true);
    });
  });
});
