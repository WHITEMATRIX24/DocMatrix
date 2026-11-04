import { Test, TestingModule } from '@nestjs/testing';
import { ClinicalNotesService } from './clinical-notes.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';

describe('ClinicalNotesService', () => {
  let service: ClinicalNotesService;
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

  const mockAdminUser: AuthenticatedUser = {
    id: 'user-admin-1',
    clinicId: mockClinicId,
    email: 'admin@docmatrix.in',
    fullName: 'Manoj Pillai',
    name: 'Manoj Pillai',
    role: 'ORGANIZATION_ADMIN',
    isPlatformAdmin: false,
    isPrimaryContact: false,
  };

  const mockPatient = {
    id: 'pat-101',
    clinicId: mockClinicId,
    patientCode: 'pt-1001',
    firstName: 'Meera',
    lastName: 'Nambiar',
    gender: 'FEMALE',
    dateOfBirth: new Date('1990-05-15'),
    mobile: '+919447123456',
    medicalSafetyAlerts: ['Penicillin Allergy'],
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
      clinicalNote: {
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      clinicalNoteAddendum: {
        create: vi.fn(),
      },
      $transaction: vi.fn((callback) => callback(prisma)),
      $queryRaw: vi.fn().mockResolvedValue([{ assignedValue: 1001 }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClinicalNotesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ClinicalNotesService>(ClinicalNotesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // 1. CREATE DRAFT CLINICAL NOTE
  it('creates a clinical note in DRAFT status', async () => {
    prisma.patient.findFirst.mockResolvedValue(mockPatient);
    prisma.user.findFirst.mockResolvedValue(mockDoctorUser);

    const mockCreated = {
      id: 'cn-1',
      clinicId: mockClinicId,
      noteNumber: 'CN-1001',
      patientId: mockPatient.id,
      doctorId: mockDoctorUser.id,
      chiefComplaint: 'Tooth pain in lower right jaw',
      primaryDiagnosis: 'Symptomatic Irreversible Pulpitis #46',
      status: 'DRAFT',
      patient: mockPatient,
      doctor: mockDoctorUser,
    };
    prisma.clinicalNote.create.mockResolvedValue(mockCreated);

    const result = await service.createClinicalNote(mockClinicId, mockDoctorUser, {
      patientId: 'pt-1001',
      chiefComplaint: 'Tooth pain in lower right jaw',
      primaryDiagnosis: 'Symptomatic Irreversible Pulpitis #46',
    });

    expect(result.status).toBe('DRAFT');
    expect(result.noteNumber).toBe('CN-1001');
    expect(prisma.clinicalNote.create).toHaveBeenCalled();
  });

  // 2. CREATE AND FINALIZE BY DOCTOR
  it('creates and immediately finalizes a clinical note when isFinalized is true and user is DOCTOR', async () => {
    prisma.patient.findFirst.mockResolvedValue(mockPatient);
    prisma.user.findFirst.mockResolvedValue(mockDoctorUser);

    const mockFinalized = {
      id: 'cn-2',
      clinicId: mockClinicId,
      noteNumber: 'CN-1002',
      status: 'FINALIZED',
      finalizedById: mockDoctorUser.id,
      finalizedByName: mockDoctorUser.name,
    };
    prisma.clinicalNote.create.mockResolvedValue(mockFinalized);

    const result = await service.createClinicalNote(mockClinicId, mockDoctorUser, {
      patientId: 'pt-1001',
      chiefComplaint: 'Pain on biting',
      primaryDiagnosis: 'Cracked Tooth Syndrome',
      isFinalized: true,
    });

    expect(result.status).toBe('FINALIZED');
    expect(result.finalizedById).toBe(mockDoctorUser.id);
  });

  // 3. REJECT DIRECT FINALIZATION BY NON-DOCTOR
  it('throws ForbiddenException if non-doctor attempts to create as finalized', async () => {
    prisma.patient.findFirst.mockResolvedValue(mockPatient);
    prisma.user.findFirst.mockResolvedValue(mockDoctorUser);

    await expect(
      service.createClinicalNote(mockClinicId, mockAdminUser, {
        patientId: 'pt-1001',
        chiefComplaint: 'Pain on biting',
        primaryDiagnosis: 'Cracked Tooth Syndrome',
        isFinalized: true,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  // 4. RETRIEVE PATIENT SPECIFIC NOTES
  it('retrieves notes for a specific patient', async () => {
    prisma.patient.findFirst.mockResolvedValue(mockPatient);
    prisma.clinicalNote.findMany.mockResolvedValue([
      { id: 'cn-1', noteNumber: 'CN-1001', patientId: mockPatient.id },
    ]);

    const result = await service.getPatientClinicalNotes(mockClinicId, 'pt-1001');
    expect(result).toHaveLength(1);
    expect(prisma.clinicalNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { clinicId: mockClinicId, patientId: mockPatient.id },
      }),
    );
  });

  // 5. UPDATE AUTHORIZED DRAFT
  it('updates a draft clinical note', async () => {
    prisma.clinicalNote.findFirst.mockResolvedValue({
      id: 'cn-1',
      clinicId: mockClinicId,
      status: 'DRAFT',
      patientId: mockPatient.id,
    });

    prisma.clinicalNote.update.mockResolvedValue({
      id: 'cn-1',
      status: 'DRAFT',
      chiefComplaint: 'Updated complaint: severe sensitivity',
    });

    const result = await service.updateClinicalNote(mockClinicId, mockDoctorUser, 'cn-1', {
      chiefComplaint: 'Updated complaint: severe sensitivity',
    });

    expect(result.chiefComplaint).toBe('Updated complaint: severe sensitivity');
    expect(prisma.clinicalNote.update).toHaveBeenCalled();
  });

  // 6. REJECT EDITS TO FINALIZED NOTES
  it('throws ForbiddenException when attempting to edit a finalized note', async () => {
    prisma.clinicalNote.findFirst.mockResolvedValue({
      id: 'cn-1',
      clinicId: mockClinicId,
      status: 'FINALIZED',
      patientId: mockPatient.id,
    });

    await expect(
      service.updateClinicalNote(mockClinicId, mockDoctorUser, 'cn-1', {
        chiefComplaint: 'Cannot change this',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  // 7. FINALIZE NOTE
  it('finalizes a draft note with responsible clinician details', async () => {
    prisma.clinicalNote.findFirst.mockResolvedValue({
      id: 'cn-1',
      clinicId: mockClinicId,
      status: 'DRAFT',
    });

    prisma.clinicalNote.update.mockResolvedValue({
      id: 'cn-1',
      status: 'FINALIZED',
      finalizedById: mockDoctorUser.id,
      finalizedByName: mockDoctorUser.name,
    });

    const result = await service.finalizeClinicalNote(mockClinicId, mockDoctorUser, 'cn-1');
    expect(result.status).toBe('FINALIZED');
    expect(result.finalizedById).toBe(mockDoctorUser.id);
  });

  // 8. REJECT RE-FINALIZATION
  it('throws BadRequestException if note is already finalized', async () => {
    prisma.clinicalNote.findFirst.mockResolvedValue({
      id: 'cn-1',
      clinicId: mockClinicId,
      status: 'FINALIZED',
    });

    await expect(
      service.finalizeClinicalNote(mockClinicId, mockDoctorUser, 'cn-1'),
    ).rejects.toThrow(BadRequestException);
  });

  // 9. APPEND AUDITABLE ADDENDUM
  it('appends an auditable addendum to a finalized note', async () => {
    prisma.clinicalNote.findFirst.mockResolvedValue({
      id: 'cn-1',
      clinicId: mockClinicId,
      status: 'FINALIZED',
    });

    prisma.clinicalNoteAddendum.create.mockResolvedValue({
      id: 'cna-1',
      clinicalNoteId: 'cn-1',
      clinicId: mockClinicId,
      authorId: mockDoctorUser.id,
      authorName: mockDoctorUser.name,
      content: 'Follow-up phone consultation: patient reported pain reduced by 80%.',
    });

    const result = await service.addAddendum(mockClinicId, mockDoctorUser, 'cn-1', {
      content: 'Follow-up phone consultation: patient reported pain reduced by 80%.',
    });

    expect(result.content).toBe('Follow-up phone consultation: patient reported pain reduced by 80%.');
    expect(result.authorName).toBe(mockDoctorUser.name);
  });

  // 10. REJECT ADDENDUM ON DRAFT NOTE
  it('throws BadRequestException if attempting to add an addendum to a draft note', async () => {
    prisma.clinicalNote.findFirst.mockResolvedValue({
      id: 'cn-1',
      clinicId: mockClinicId,
      status: 'DRAFT',
    });

    await expect(
      service.addAddendum(mockClinicId, mockDoctorUser, 'cn-1', {
        content: 'Should fail',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // 11. REJECT CROSS-CLINIC ACCESS / UNKNOWN PATIENT
  it('throws NotFoundException if patient does not exist in the clinic', async () => {
    prisma.patient.findFirst.mockResolvedValue(null);

    await expect(
      service.createClinicalNote(mockClinicId, mockDoctorUser, {
        patientId: 'unknown-patient',
        chiefComplaint: 'Pain',
        primaryDiagnosis: 'Caries',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  // 12. REJECT INVALID APPOINTMENT LINK
  it('throws BadRequestException if linked appointment does not belong to patient or clinic', async () => {
    prisma.patient.findFirst.mockResolvedValue(mockPatient);
    prisma.user.findFirst.mockResolvedValue(mockDoctorUser);
    prisma.appointment.findFirst.mockResolvedValue(null); // not found or different patient

    await expect(
      service.createClinicalNote(mockClinicId, mockDoctorUser, {
        patientId: 'pt-1001',
        appointmentId: 'appt-wrong',
        chiefComplaint: 'Pain',
        primaryDiagnosis: 'Caries',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
