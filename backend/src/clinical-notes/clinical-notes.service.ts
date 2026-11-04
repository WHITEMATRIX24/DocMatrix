import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { CreateClinicalNoteDto } from './dto/create-clinical-note.dto.js';
import { UpdateClinicalNoteDto } from './dto/update-clinical-note.dto.js';
import { CreateAddendumDto } from './dto/create-addendum.dto.js';
import { ClinicalNoteQueryDto } from './dto/clinical-note-query.dto.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class ClinicalNotesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verified clinical practitioner authorization guard.
   * Finalization and auditable addenda strictly require DOCTOR role.
   */
  private assertAuthorizedDoctor(user: AuthenticatedUser): void {
    if (user.role !== 'DOCTOR') {
      throw new ForbiddenException(
        'Unauthorized: Only verified medical/dental practitioners (DOCTOR role) are permitted to finalize clinical notes or append addenda.',
      );
    }
  }

  /**
   * Concurrency-safe atomic note number generator.
   * Utilizes PostgreSQL atomic row-level lock on ClinicSequence.
   */
  private async allocateNoteNumber(
    tx: Prisma.TransactionClient,
    clinicId: string,
  ): Promise<string> {
    const rows = await tx.$queryRaw<{ assignedValue: number }[]>`
      INSERT INTO "ClinicSequence" ("id", "clinicId", "sequenceType", "currentValue", "updatedAt")
      VALUES (gen_random_uuid(), ${clinicId}, 'CLINICAL_NOTE', 1001, NOW())
      ON CONFLICT ("clinicId", "sequenceType")
      DO UPDATE SET "currentValue" = "ClinicSequence"."currentValue" + 1, "updatedAt" = NOW()
      RETURNING "currentValue" AS "assignedValue";
    `;

    const assigned = rows[0]?.assignedValue ?? 1001;
    return `CN-${assigned}`;
  }

  /**
   * Helper to resolve patient by either internal UUID or patientCode (e.g. 'pt-1001').
   */
  private async resolvePatient(clinicId: string, patientIdentifier: string) {
    return this.prisma.patient.findFirst({
      where: {
        clinicId,
        OR: [{ id: patientIdentifier }, { patientCode: patientIdentifier }],
      },
    });
  }

  /**
   * Create a new structured clinical note.
   */
  async createClinicalNote(
    clinicId: string,
    currentUser: AuthenticatedUser,
    dto: CreateClinicalNoteDto,
  ) {
    const patient = await this.resolvePatient(clinicId, dto.patientId);
    if (!patient) {
      throw new NotFoundException('Patient not found in this clinic.');
    }

    if (dto.appointmentId) {
      const appt = await this.prisma.appointment.findFirst({
        where: { id: dto.appointmentId, clinicId, patientId: patient.id },
      });
      if (!appt) {
        throw new BadRequestException(
          'Linked appointment not found or does not belong to this patient and clinic.',
        );
      }
    }

    // Resolve treating dentist
    const resolvedDoctorId = dto.doctorId || currentUser.id;
    const doctor = await this.prisma.user.findFirst({
      where: { id: resolvedDoctorId, clinicId },
    });
    if (!doctor) {
      throw new BadRequestException('Treating doctor not found in this clinic.');
    }

    const shouldFinalize = Boolean(dto.isFinalized);
    if (shouldFinalize) {
      this.assertAuthorizedDoctor(currentUser);
    }

    return this.prisma.$transaction(async (tx) => {
      const noteNumber = await this.allocateNoteNumber(tx, clinicId);
      const now = new Date();

      const created = await tx.clinicalNote.create({
        data: {
          clinicId,
          noteNumber,
          patientId: patient.id,
          doctorId: doctor.id,
          appointmentId: dto.appointmentId || null,
          consultationDate: dto.consultationDate
            ? new Date(dto.consultationDate)
            : now,
          consultationType: dto.consultationType || 'ROUTINE_CHECKUP',
          status: shouldFinalize ? 'FINALIZED' : 'DRAFT',

          // Section 1: Chief Complaint
          chiefComplaint: dto.chiefComplaint.trim(),

          // Section 2: Symptoms & History
          symptoms: dto.symptoms?.trim() || null,
          symptomDuration: dto.symptomDuration?.trim() || null,
          painSeverity:
            dto.painSeverity !== undefined && dto.painSeverity !== null
              ? Number(dto.painSeverity)
              : null,
          historyNotes: dto.historyNotes?.trim() || null,

          // Section 3: Clinical Examination
          extraoralFindings: dto.extraoralFindings?.trim() || null,
          intraoralFindings: dto.intraoralFindings?.trim() || null,
          toothSpecificFindings: dto.toothSpecificFindings?.trim() || null,
          periodontalFindings: dto.periodontalFindings?.trim() || null,
          examinationNotes: dto.examinationNotes?.trim() || null,

          // Section 4: Diagnosis
          primaryDiagnosis: dto.primaryDiagnosis.trim(),
          additionalDiagnoses: dto.additionalDiagnoses || null,
          diagnosisNotes: dto.diagnosisNotes?.trim() || null,

          // Section 5: Treatment Performed
          treatmentPerformed: dto.treatmentPerformed?.trim() || null,
          treatmentToothNumber: dto.treatmentToothNumber?.trim() || null,
          treatmentDescription: dto.treatmentDescription?.trim() || null,
          materialsUsed: dto.materialsUsed?.trim() || null,
          treatmentOutcome: dto.treatmentOutcome?.trim() || null,

          // Section 6: Treatment Recommendations
          treatmentRecommendations:
            dto.treatmentRecommendations?.trim() || null,
          referralNotes: dto.referralNotes?.trim() || null,

          // Section 7: Follow-up & Advice
          followUpRequired: Boolean(dto.followUpRequired),
          followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : null,
          followUpInstructions: dto.followUpInstructions?.trim() || null,
          patientAdvice: dto.patientAdvice?.trim() || null,

          // Section 8: Finalization
          finalizedAt: shouldFinalize ? now : null,
          finalizedById: shouldFinalize ? currentUser.id : null,
          finalizedByName: shouldFinalize ? (currentUser.fullName || (currentUser as any).name || 'Attending Doctor') : null,
        },
        include: {
          patient: {
            select: {
              id: true,
              patientCode: true,
              firstName: true,
              lastName: true,
              gender: true,
              dateOfBirth: true,
              mobile: true,
              medicalSafetyAlerts: true,
            },
          },
          doctor: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
            },
          },
          addenda: true,
        },
      });

      return created;
    });
  }

  /**
   * List clinical notes with filtering and search.
   */
  async getClinicalNotes(clinicId: string, query: ClinicalNoteQueryDto) {
    const where: Prisma.ClinicalNoteWhereInput = { clinicId };

    if (query.patientId) {
      const patient = await this.resolvePatient(clinicId, query.patientId);
      if (patient) {
        where.patientId = patient.id;
      } else {
        where.patientId = query.patientId;
      }
    }

    if (query.doctorId) {
      where.doctorId = query.doctorId;
    }

    if (query.status && query.status !== 'ALL') {
      where.status = query.status as any;
    }

    if (query.startDate || query.endDate) {
      where.consultationDate = {};
      if (query.startDate) {
        where.consultationDate.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.consultationDate.lte = end;
      }
    }

    if (query.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { noteNumber: { contains: s, mode: 'insensitive' } },
        { chiefComplaint: { contains: s, mode: 'insensitive' } },
        { primaryDiagnosis: { contains: s, mode: 'insensitive' } },
        { treatmentPerformed: { contains: s, mode: 'insensitive' } },
        {
          patient: {
            OR: [
              { firstName: { contains: s, mode: 'insensitive' } },
              { lastName: { contains: s, mode: 'insensitive' } },
              { patientCode: { contains: s, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    return this.prisma.clinicalNote.findMany({
      where,
      orderBy: [{ consultationDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        patient: {
          select: {
            id: true,
            patientCode: true,
            firstName: true,
            lastName: true,
            gender: true,
            dateOfBirth: true,
            mobile: true,
            medicalSafetyAlerts: true,
          },
        },
        doctor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        addenda: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  /**
   * Get single clinical note by ID.
   */
  async getClinicalNoteById(clinicId: string, id: string) {
    const note = await this.prisma.clinicalNote.findFirst({
      where: { id, clinicId },
      include: {
        patient: {
          select: {
            id: true,
            patientCode: true,
            firstName: true,
            lastName: true,
            gender: true,
            dateOfBirth: true,
            mobile: true,
            medicalSafetyAlerts: true,
          },
        },
        doctor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        appointment: true,
        addenda: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!note) {
      throw new NotFoundException('Clinical note not found.');
    }

    return note;
  }

  /**
   * Update an authorized draft clinical note.
   */
  async updateClinicalNote(
    clinicId: string,
    currentUser: AuthenticatedUser,
    id: string,
    dto: UpdateClinicalNoteDto,
  ) {
    const existing = await this.prisma.clinicalNote.findFirst({
      where: { id, clinicId },
    });

    if (!existing) {
      throw new NotFoundException('Clinical note not found.');
    }

    if (existing.status === 'FINALIZED') {
      throw new ForbiddenException(
        'Finalized clinical notes cannot be edited. You can create an auditable addendum instead.',
      );
    }

    if (dto.appointmentId) {
      const appt = await this.prisma.appointment.findFirst({
        where: { id: dto.appointmentId, clinicId, patientId: existing.patientId },
      });
      if (!appt) {
        throw new BadRequestException(
          'Linked appointment not found or does not belong to this patient.',
        );
      }
    }

    const data: Prisma.ClinicalNoteUpdateInput = {};

    if (dto.appointmentId !== undefined) {
      data.appointment = dto.appointmentId
        ? { connect: { id: dto.appointmentId } }
        : { disconnect: true };
    }
    if (dto.consultationDate !== undefined) {
      data.consultationDate = new Date(dto.consultationDate);
    }
    if (dto.consultationType !== undefined) {
      data.consultationType = dto.consultationType;
    }
    if (dto.chiefComplaint !== undefined) {
      data.chiefComplaint = dto.chiefComplaint.trim();
    }
    if (dto.symptoms !== undefined) {
      data.symptoms = dto.symptoms.trim() || null;
    }
    if (dto.symptomDuration !== undefined) {
      data.symptomDuration = dto.symptomDuration.trim() || null;
    }
    if (dto.painSeverity !== undefined) {
      data.painSeverity =
        dto.painSeverity !== null ? Number(dto.painSeverity) : null;
    }
    if (dto.historyNotes !== undefined) {
      data.historyNotes = dto.historyNotes.trim() || null;
    }
    if (dto.extraoralFindings !== undefined) {
      data.extraoralFindings = dto.extraoralFindings.trim() || null;
    }
    if (dto.intraoralFindings !== undefined) {
      data.intraoralFindings = dto.intraoralFindings.trim() || null;
    }
    if (dto.toothSpecificFindings !== undefined) {
      data.toothSpecificFindings = dto.toothSpecificFindings.trim() || null;
    }
    if (dto.periodontalFindings !== undefined) {
      data.periodontalFindings = dto.periodontalFindings.trim() || null;
    }
    if (dto.examinationNotes !== undefined) {
      data.examinationNotes = dto.examinationNotes.trim() || null;
    }
    if (dto.primaryDiagnosis !== undefined) {
      data.primaryDiagnosis = dto.primaryDiagnosis.trim();
    }
    if (dto.additionalDiagnoses !== undefined) {
      data.additionalDiagnoses = dto.additionalDiagnoses;
    }
    if (dto.diagnosisNotes !== undefined) {
      data.diagnosisNotes = dto.diagnosisNotes.trim() || null;
    }
    if (dto.treatmentPerformed !== undefined) {
      data.treatmentPerformed = dto.treatmentPerformed.trim() || null;
    }
    if (dto.treatmentToothNumber !== undefined) {
      data.treatmentToothNumber = dto.treatmentToothNumber.trim() || null;
    }
    if (dto.treatmentDescription !== undefined) {
      data.treatmentDescription = dto.treatmentDescription.trim() || null;
    }
    if (dto.materialsUsed !== undefined) {
      data.materialsUsed = dto.materialsUsed.trim() || null;
    }
    if (dto.treatmentOutcome !== undefined) {
      data.treatmentOutcome = dto.treatmentOutcome.trim() || null;
    }
    if (dto.treatmentRecommendations !== undefined) {
      data.treatmentRecommendations =
        dto.treatmentRecommendations.trim() || null;
    }
    if (dto.referralNotes !== undefined) {
      data.referralNotes = dto.referralNotes.trim() || null;
    }
    if (dto.followUpRequired !== undefined) {
      data.followUpRequired = Boolean(dto.followUpRequired);
    }
    if (dto.followUpDate !== undefined) {
      data.followUpDate = dto.followUpDate ? new Date(dto.followUpDate) : null;
    }
    if (dto.followUpInstructions !== undefined) {
      data.followUpInstructions = dto.followUpInstructions.trim() || null;
    }
    if (dto.patientAdvice !== undefined) {
      data.patientAdvice = dto.patientAdvice.trim() || null;
    }

    return this.prisma.clinicalNote.update({
      where: { id },
      data,
      include: {
        patient: {
          select: {
            id: true,
            patientCode: true,
            firstName: true,
            lastName: true,
            gender: true,
            dateOfBirth: true,
            mobile: true,
            medicalSafetyAlerts: true,
          },
        },
        doctor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        addenda: true,
      },
    });
  }

  /**
   * Finalize a clinical note.
   * Enforces that only verified doctors can finalize.
   */
  async finalizeClinicalNote(
    clinicId: string,
    currentUser: AuthenticatedUser,
    id: string,
  ) {
    this.assertAuthorizedDoctor(currentUser);

    const existing = await this.prisma.clinicalNote.findFirst({
      where: { id, clinicId },
    });

    if (!existing) {
      throw new NotFoundException('Clinical note not found.');
    }

    if (existing.status === 'FINALIZED') {
      throw new BadRequestException('Clinical note is already finalized.');
    }

    return this.prisma.clinicalNote.update({
      where: { id },
      data: {
        status: 'FINALIZED',
        finalizedAt: new Date(),
        finalizedById: currentUser.id,
        finalizedByName: currentUser.fullName || (currentUser as any).name || 'Attending Doctor',
      },
      include: {
        patient: {
          select: {
            id: true,
            patientCode: true,
            firstName: true,
            lastName: true,
            gender: true,
            dateOfBirth: true,
            mobile: true,
            medicalSafetyAlerts: true,
          },
        },
        doctor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        addenda: true,
      },
    });
  }

  /**
   * Create an auditable addendum on a finalized clinical note.
   */
  async addAddendum(
    clinicId: string,
    currentUser: AuthenticatedUser,
    id: string,
    dto: CreateAddendumDto,
  ) {
    this.assertAuthorizedDoctor(currentUser);

    const existing = await this.prisma.clinicalNote.findFirst({
      where: { id, clinicId },
    });

    if (!existing) {
      throw new NotFoundException('Clinical note not found.');
    }

    if (existing.status !== 'FINALIZED') {
      throw new BadRequestException(
        'Addenda can only be appended to finalized clinical notes. Please edit the draft directly.',
      );
    }

    const addendum = await this.prisma.clinicalNoteAddendum.create({
      data: {
        clinicalNoteId: id,
        clinicId,
        authorId: currentUser.id,
        authorName: currentUser.fullName || (currentUser as any).name || 'Attending Doctor',
        content: dto.content.trim(),
      },
    });

    return addendum;
  }

  /**
   * Get notes for a specific patient.
   */
  async getPatientClinicalNotes(clinicId: string, patientId: string) {
    const patient = await this.resolvePatient(clinicId, patientId);
    if (!patient) {
      return [];
    }

    return this.prisma.clinicalNote.findMany({
      where: { clinicId, patientId: patient.id },
      orderBy: [{ consultationDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        patient: {
          select: {
            id: true,
            patientCode: true,
            firstName: true,
            lastName: true,
            gender: true,
            dateOfBirth: true,
            mobile: true,
            medicalSafetyAlerts: true,
          },
        },
        doctor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        addenda: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }
}
