import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrescriptionsService } from './prescriptions.service.js';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';

describe('PrescriptionsService - Multi-Tenant Clinical Prescriptions', () => {
  let service: PrescriptionsService;
  let mockPrisma: any;

  const mockDoctorUser: AuthenticatedUser = {
    id: 'doc-1',
    email: 'dr.smith@dental.com',
    fullName: 'Dr. Jane Smith',
    role: 'DOCTOR',
    clinicId: 'clinic-A',
    isPlatformAdmin: false,
    isPrimaryContact: true,
  };

  const mockAdminUser: AuthenticatedUser = {
    id: 'admin-1',
    email: 'admin@dental.com',
    fullName: 'Reception Admin',
    role: 'ORGANIZATION_ADMIN',
    clinicId: 'clinic-A',
    isPlatformAdmin: false,
    isPrimaryContact: false,
  };

  beforeEach(() => {
    mockPrisma = {
      prescription: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      prescriptionItem: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      patient: {
        findFirst: vi.fn(),
      },
      user: {
        findFirst: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => {
        return cb(mockPrisma);
      }),
      $queryRaw: vi.fn().mockResolvedValue([{ assignedValue: 1042 }]),
    };
    service = new PrescriptionsService(mockPrisma);
  });

  describe('Authorization & Prescriber Privileges', () => {
    it('rejects prescription creation if the user is an administrator without DOCTOR role', async () => {
      await expect(
        service.createPrescription('clinic-A', mockAdminUser, {
          patientId: 'patient-1',
          diagnosis: 'Gingivitis',
          items: [
            {
              medicineName: 'Amoxicillin',
              dosage: '500 mg',
              frequency: '1-0-1',
              duration: '5 days',
            },
          ],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects prescription creation if patient belongs to another clinic', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(null);

      await expect(
        service.createPrescription('clinic-A', mockDoctorUser, {
          patientId: 'patient-from-clinic-B',
          diagnosis: 'Dental Pulpitis',
          items: [
            {
              medicineName: 'Ibuprofen',
              dosage: '400 mg',
              frequency: '1-1-1',
              duration: '3 days',
            },
          ],
        }),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrisma.patient.findFirst).toHaveBeenCalledWith({
        where: { id: 'patient-from-clinic-B', clinicId: 'clinic-A' },
      });
    });

    it('rejects prescription creation if doctor does not belong to clinic or has non-doctor role', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue({ id: 'p-1', clinicId: 'clinic-A' });
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.createPrescription('clinic-A', mockDoctorUser, {
          patientId: 'p-1',
          doctorId: 'doc-foreign-clinic',
          diagnosis: 'Caries',
          items: [
            {
              medicineName: 'Paracetamol',
              dosage: '650 mg',
              frequency: 'PRN',
              duration: '2 days',
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Transactional Creation & Concurrency-Safe Number Allocation', () => {
    it('creates a draft prescription with concurrency-safe RX number and items', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue({ id: 'p-1', clinicId: 'clinic-A' });
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'doc-1', clinicId: 'clinic-A', role: 'DOCTOR' });
      mockPrisma.$queryRaw.mockResolvedValue([{ assignedValue: 1005 }]);

      const createdPrescription = {
        id: 'rx-new-id',
        clinicId: 'clinic-A',
        patientId: 'p-1',
        doctorId: 'doc-1',
        prescriptionNumber: 'RX-1005',
        diagnosis: 'Acute Periapical Abscess',
        status: 'DRAFT',
        items: [
          {
            id: 'item-1',
            medicineName: 'Augmentin 625mg',
            dosage: '1 tablet',
            frequency: '1-0-1',
            duration: '5 days',
          },
        ],
      };

      mockPrisma.prescription.create.mockResolvedValue(createdPrescription);

      const result = await service.createPrescription('clinic-A', mockDoctorUser, {
        patientId: 'p-1',
        diagnosis: 'Acute Periapical Abscess',
        items: [
          {
            medicineName: 'Augmentin 625mg',
            dosage: '1 tablet',
            frequency: '1-0-1',
            duration: '5 days',
          },
        ],
      });

      expect(result.prescriptionNumber).toBe('RX-1005');
      expect(result.status).toBe('DRAFT');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.prescription.create).toHaveBeenCalled();
    });
  });

  describe('Draft Modification & Finalization Locking', () => {
    it('allows updating diagnosis and items on a DRAFT prescription', async () => {
      mockPrisma.prescription.findFirst.mockResolvedValue({
        id: 'rx-draft-1',
        clinicId: 'clinic-A',
        status: 'DRAFT',
      });

      mockPrisma.prescription.update.mockResolvedValue({
        id: 'rx-draft-1',
        diagnosis: 'Updated Gingivitis',
        status: 'DRAFT',
      });

      const result = await service.updatePrescription('clinic-A', mockDoctorUser, 'rx-draft-1', {
        diagnosis: 'Updated Gingivitis',
      });

      expect(result.diagnosis).toBe('Updated Gingivitis');
      expect(mockPrisma.prescription.update).toHaveBeenCalled();
    });

    it('strictly forbids modifying a FINALIZED prescription', async () => {
      mockPrisma.prescription.findFirst.mockResolvedValue({
        id: 'rx-final-1',
        clinicId: 'clinic-A',
        status: 'FINALIZED',
      });

      await expect(
        service.updatePrescription('clinic-A', mockDoctorUser, 'rx-final-1', {
          diagnosis: 'Tampered diagnosis',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('finalizes a draft prescription and logs timestamp and doctor ID', async () => {
      mockPrisma.prescription.findFirst.mockResolvedValue({
        id: 'rx-draft-1',
        clinicId: 'clinic-A',
        status: 'DRAFT',
        items: [{ id: 'item-1', medicineName: 'Amoxicillin' }],
      });

      mockPrisma.prescription.update.mockResolvedValue({
        id: 'rx-draft-1',
        status: 'FINALIZED',
        finalizedById: 'doc-1',
      });

      const result = await service.finalizePrescription('clinic-A', mockDoctorUser, 'rx-draft-1');

      expect(result.status).toBe('FINALIZED');
      expect(mockPrisma.prescription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rx-draft-1' },
          data: expect.objectContaining({
            status: 'FINALIZED',
            finalizedById: 'doc-1',
          }),
        }),
      );
    });

    it('rejects finalization if prescription has zero medication items', async () => {
      mockPrisma.prescription.findFirst.mockResolvedValue({
        id: 'rx-empty-1',
        clinicId: 'clinic-A',
        status: 'DRAFT',
        items: [],
      });

      await expect(
        service.finalizePrescription('clinic-A', mockDoctorUser, 'rx-empty-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Prescription Cancellation', () => {
    it('cancels prescription with documented reason and records audit metadata', async () => {
      mockPrisma.prescription.findFirst.mockResolvedValue({
        id: 'rx-final-1',
        clinicId: 'clinic-A',
        status: 'FINALIZED',
      });

      mockPrisma.prescription.update.mockResolvedValue({
        id: 'rx-final-1',
        status: 'CANCELLED',
        cancellationReason: 'Adverse allergic reaction reported',
        cancelledById: 'doc-1',
      });

      const result = await service.cancelPrescription('clinic-A', mockDoctorUser, 'rx-final-1', {
        reason: 'Adverse allergic reaction reported',
      });

      expect(result.status).toBe('CANCELLED');
      expect(mockPrisma.prescription.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'rx-final-1' },
          data: expect.objectContaining({
            status: 'CANCELLED',
            cancelledById: 'doc-1',
            cancellationReason: 'Adverse allergic reaction reported',
          }),
        }),
      );
    });

    it('rejects cancelling an already cancelled prescription', async () => {
      mockPrisma.prescription.findFirst.mockResolvedValue({
        id: 'rx-canc-1',
        clinicId: 'clinic-A',
        status: 'CANCELLED',
      });

      await expect(
        service.cancelPrescription('clinic-A', mockDoctorUser, 'rx-canc-1', {
          reason: 'Duplicate cancel',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Multi-Tenant Listing & History', () => {
    it('lists only prescriptions belonging to the caller clinic', async () => {
      mockPrisma.prescription.findMany.mockResolvedValue([
        { id: 'rx-1', clinicId: 'clinic-A', prescriptionNumber: 'RX-1001' },
      ]);

      const result = await service.getPrescriptions('clinic-A', { status: 'DRAFT' as any });

      expect(result).toHaveLength(1);
      expect(mockPrisma.prescription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ clinicId: 'clinic-A', status: 'DRAFT' }),
        }),
      );
    });

    it('retrieves patient prescriptions scoped to clinic', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue({ id: 'p-1', clinicId: 'clinic-A' });
      mockPrisma.prescription.findMany.mockResolvedValue([
        { id: 'rx-1', clinicId: 'clinic-A', patientId: 'p-1' },
      ]);

      const result = await service.getPatientPrescriptions('clinic-A', 'p-1');

      expect(result).toHaveLength(1);
      expect(mockPrisma.prescription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clinicId: 'clinic-A', patientId: 'p-1' },
        }),
      );
    });
  });
});

