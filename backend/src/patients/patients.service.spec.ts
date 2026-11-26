import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PatientsService } from './patients.service.js';

describe('PatientsService - Simple and Straightforward Patient ID Generation', () => {
  let service: PatientsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      patient: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
    };

    mockPrisma.$queryRaw = vi.fn(async () => [{ id: 'clinic-1' }]);
    mockPrisma.$transaction = vi.fn(async work => work(mockPrisma));
    service = new PatientsService(mockPrisma);
  });

  describe('generateNextPatientCode', () => {
    it('returns PAT-001 when clinic has no existing patients', async () => {
      mockPrisma.patient.findMany.mockResolvedValue([]);
      const code = await service.generateNextPatientCode('clinic-1');
      expect(code).toBe('PAT-001');
      expect(mockPrisma.patient.findMany).toHaveBeenCalledWith({
        where: { clinicId: 'clinic-1' },
        select: { patientCode: true },
      });
    });

    it('returns PAT-002 when PAT-001 is already registered', async () => {
      mockPrisma.patient.findMany.mockResolvedValue([{ patientCode: 'PAT-001' }]);
      const code = await service.generateNextPatientCode('clinic-1');
      expect(code).toBe('PAT-002');
    });

    it('returns PAT-003 when PAT-001 and PAT-002 are registered', async () => {
      mockPrisma.patient.findMany.mockResolvedValue([
        { patientCode: 'PAT-001' },
        { patientCode: 'PAT-002' },
      ]);
      const code = await service.generateNextPatientCode('clinic-1');
      expect(code).toBe('PAT-003');
    });

    it('starts at PAT-001 when clinic only has legacy random timestamp patientCodes', async () => {
      mockPrisma.patient.findMany.mockResolvedValue([
        { patientCode: 'PAT-5186' },
        { patientCode: 'PAT-1915' },
        { patientCode: 'PAT-2007' },
      ]);
      const code = await service.generateNextPatientCode('clinic-1');
      expect(code).toBe('PAT-001');
    });
  });

  describe('createPatient', () => {
    it('generates PAT-001 automatically when patientCode is omitted', async () => {
      mockPrisma.patient.findMany.mockResolvedValue([]);
      mockPrisma.patient.create.mockImplementation(({ data }: any) =>
        Promise.resolve({
          id: 'uuid-1',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          appointments: [],
        }),
      );

      const result = await service.createPatient('clinic-1', {
        firstName: 'Aarav',
        lastName: 'Sharma',
        dateOfBirth: '1995-05-12',
        gender: 'MALE',
        mobile: '9876543210',
      });

      expect(mockPrisma.patient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clinicId: 'clinic-1',
            patientCode: 'PAT-001',
            firstName: 'Aarav',
            lastName: 'Sharma',
          }),
        }),
      );
      expect(result.patientCode).toBe('PAT-001');
    });

    it('uses provided patientCode if valid and not conflicting', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue(null);
      mockPrisma.patient.create.mockImplementation(({ data }: any) =>
        Promise.resolve({
          id: 'uuid-2',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          appointments: [],
        }),
      );

      const result = await service.createPatient('clinic-1', {
        patientCode: 'PAT-001',
        firstName: 'Diya',
        lastName: 'Nair',
        dateOfBirth: '2000-01-01',
        gender: 'FEMALE',
        mobile: '9876543211',
      });

      expect(result.patientCode).toBe('PAT-001');
    });

    it('resolves collisions cleanly by finding the next sequential PAT-XXX code without timestamp suffixes', async () => {
      // Simulate PAT-001 already exists in unique check
      mockPrisma.patient.findUnique.mockResolvedValue({ id: 'existing-pt', patientCode: 'PAT-001' });
      // When searching existing for generateNextPatientCode, PAT-001 exists
      mockPrisma.patient.findMany.mockResolvedValue([{ patientCode: 'PAT-001' }]);
      mockPrisma.patient.create.mockImplementation(({ data }: any) =>
        Promise.resolve({
          id: 'uuid-3',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          appointments: [],
        }),
      );

      const result = await service.createPatient('clinic-1', {
        patientCode: 'PAT-001',
        firstName: 'Rohan',
        lastName: 'Verma',
        dateOfBirth: '1992-03-15',
        gender: 'MALE',
        mobile: '9876543212',
      });

      expect(result.patientCode).toBe('PAT-002');
      expect(mockPrisma.patient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            patientCode: 'PAT-002',
          }),
        }),
      );
    });
  });
});
