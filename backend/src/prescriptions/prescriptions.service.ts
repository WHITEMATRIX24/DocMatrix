import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { CreatePrescriptionDto } from './dto/create-prescription.dto.js';
import {
  CancelPrescriptionDto,
  UpdatePrescriptionDto,
} from './dto/update-prescription.dto.js';
import { PrescriptionQueryDto } from './dto/prescription-query.dto.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrescriptionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Verified clinical prescriber authorization guard.
   * Administrative and auxiliary roles must NOT have prescribing privileges.
   */
  private assertAuthorizedDoctor(user: AuthenticatedUser): void {
    if (user.role !== 'DOCTOR') {
      throw new ForbiddenException(
        'Unauthorized: Only verified medical/dental practitioners (DOCTOR role) are permitted to author, modify, finalize, or cancel prescriptions.',
      );
    }
  }

  /**
   * Concurrency-safe atomic prescription number generator.
   * Utilizes PostgreSQL atomic row-level lock on ClinicSequence.
   */
  private async allocatePrescriptionNumber(
    tx: Prisma.TransactionClient,
    clinicId: string,
  ): Promise<string> {
    const rows = await tx.$queryRaw<{ assignedValue: number }[]>`
      INSERT INTO "ClinicSequence" ("id", "clinicId", "sequenceType", "currentValue", "updatedAt")
      VALUES (gen_random_uuid(), ${clinicId}, 'PRESCRIPTION', 1001, NOW())
      ON CONFLICT ("clinicId", "sequenceType")
      DO UPDATE SET "currentValue" = "ClinicSequence"."currentValue" + 1, "updatedAt" = NOW()
      RETURNING "currentValue" AS "assignedValue";
    `;

    const assigned = rows[0]?.assignedValue ?? 1001;
    return `RX-${assigned}`;
  }

  /**
   * Create a new digital prescription in DRAFT status.
   */
  async createPrescription(
    clinicId: string,
    currentUser: AuthenticatedUser,
    dto: CreatePrescriptionDto,
  ) {
    this.assertAuthorizedDoctor(currentUser);

    // 1. Verify patient exists and belongs to the same clinic
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, clinicId },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found in this clinic.');
    }

    // 2. Resolve & verify prescriber doctor belongs to the same clinic with DOCTOR role
    const resolvedDoctorId = dto.doctorId || currentUser.id;
    const doctor = await this.prisma.user.findFirst({
      where: { id: resolvedDoctorId, clinicId, role: 'DOCTOR' },
    });
    if (!doctor) {
      throw new BadRequestException(
        'Assigned doctor does not exist or is not a verified practitioner in this clinic.',
      );
    }

    // 3. Validate medication items
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException(
        'A prescription must contain at least one medication item.',
      );
    }

    // 4. Concurrency-safe transaction allocating Rx number and creating records
    return this.prisma.$transaction(async (tx) => {
      const prescriptionNumber = await this.allocatePrescriptionNumber(
        tx,
        clinicId,
      );

      const prescribedDate = dto.prescribedAt
        ? new Date(dto.prescribedAt)
        : new Date();

      return tx.prescription.create({
        data: {
          clinicId,
          patientId: dto.patientId,
          doctorId: resolvedDoctorId,
          prescriptionNumber,
          diagnosis: dto.diagnosis.trim(),
          clinicalNotes: dto.clinicalNotes?.trim() || null,
          status: 'DRAFT',
          prescribedAt: prescribedDate,
          items: {
            create: dto.items.map((item) => ({
              medicineName: item.medicineName.trim(),
              strength: item.strength?.trim() || null,
              dosage: item.dosage.trim(),
              route: item.route?.trim() || 'Oral',
              frequency: item.frequency.trim(),
              duration: item.duration.trim(),
              quantity: item.quantity ?? null,
              instructions: item.instructions?.trim() || null,
            })),
          },
        },
        include: {
          items: true,
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
        },
      });
    });
  }

  /**
   * Update an existing DRAFT prescription.
   * Modification of FINALIZED or CANCELLED prescriptions is strictly forbidden.
   */
  async updatePrescription(
    clinicId: string,
    currentUser: AuthenticatedUser,
    id: string,
    dto: UpdatePrescriptionDto,
  ) {
    this.assertAuthorizedDoctor(currentUser);

    const existing = await this.prisma.prescription.findFirst({
      where: { id, clinicId },
      include: { items: true },
    });
    if (!existing) {
      throw new NotFoundException('Prescription not found.');
    }

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(
        `Cannot modify prescription: Only DRAFT prescriptions can be edited. Current status is ${existing.status}. To change a finalized prescription, cancel it and issue a new one.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // If new medication items were supplied, replace existing items atomically
      if (dto.items && dto.items.length > 0) {
        await tx.prescriptionItem.deleteMany({
          where: { prescriptionId: id },
        });

        await tx.prescriptionItem.createMany({
          data: dto.items.map((item) => ({
            prescriptionId: id,
            medicineName: item.medicineName.trim(),
            strength: item.strength?.trim() || null,
            dosage: item.dosage.trim(),
            route: item.route?.trim() || 'Oral',
            frequency: item.frequency.trim(),
            duration: item.duration.trim(),
            quantity: item.quantity ?? null,
            instructions: item.instructions?.trim() || null,
          })),
        });
      }

      return tx.prescription.update({
        where: { id },
        data: {
          ...(dto.diagnosis !== undefined && { diagnosis: dto.diagnosis.trim() }),
          ...(dto.clinicalNotes !== undefined && {
            clinicalNotes: dto.clinicalNotes?.trim() || null,
          }),
          ...(dto.prescribedAt !== undefined && {
            prescribedAt: new Date(dto.prescribedAt),
          }),
        },
        include: {
          items: true,
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
        },
      });
    });
  }

  /**
   * Finalize a prescription.
   * Locks the prescription, records finalization timestamp and user ID.
   */
  async finalizePrescription(
    clinicId: string,
    currentUser: AuthenticatedUser,
    id: string,
  ) {
    this.assertAuthorizedDoctor(currentUser);

    const existing = await this.prisma.prescription.findFirst({
      where: { id, clinicId },
      include: { items: true },
    });
    if (!existing) {
      throw new NotFoundException('Prescription not found.');
    }

    if (existing.status === 'FINALIZED') {
      throw new BadRequestException('Prescription is already finalized.');
    }
    if (existing.status === 'CANCELLED') {
      throw new BadRequestException('Cannot finalize a cancelled prescription.');
    }
    if (!existing.items || existing.items.length === 0) {
      throw new BadRequestException(
        'Cannot finalize prescription: at least one medication item is required.',
      );
    }

    return this.prisma.prescription.update({
      where: { id },
      data: {
        status: 'FINALIZED',
        finalizedAt: new Date(),
        finalizedById: currentUser.id,
      },
      include: {
        items: true,
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
        finalizedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Cancel a prescription with audit-logged reason and practitioner ID.
   * Can transition from DRAFT or FINALIZED to CANCELLED.
   */
  async cancelPrescription(
    clinicId: string,
    currentUser: AuthenticatedUser,
    id: string,
    dto: CancelPrescriptionDto,
  ) {
    this.assertAuthorizedDoctor(currentUser);

    const existing = await this.prisma.prescription.findFirst({
      where: { id, clinicId },
    });
    if (!existing) {
      throw new NotFoundException('Prescription not found.');
    }

    if (existing.status === 'CANCELLED') {
      throw new BadRequestException('Prescription is already cancelled.');
    }

    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException(
        'A documented cancellation reason is required for clinical audit compliance.',
      );
    }

    return this.prisma.prescription.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelledById: currentUser.id,
        cancellationReason: dto.reason.trim(),
      },
      include: {
        items: true,
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
        finalizedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        cancelledBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * List prescriptions with tenant isolation and optional filtering.
   */
  async getPrescriptions(clinicId: string, query: PrescriptionQueryDto) {
    const where: Prisma.PrescriptionWhereInput = { clinicId };

    if (query.patientId) {
      where.patientId = query.patientId;
    }
    if (query.doctorId) {
      where.doctorId = query.doctorId;
    }
    if (query.status) {
      where.status = query.status;
    }

    if (query.startDate || query.endDate) {
      where.prescribedAt = {};
      if (query.startDate) {
        where.prescribedAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.prescribedAt.lte = new Date(query.endDate);
      }
    }

    if (query.search && query.search.trim()) {
      const searchTerm = query.search.trim();
      where.OR = [
        { prescriptionNumber: { contains: searchTerm, mode: 'insensitive' } },
        { diagnosis: { contains: searchTerm, mode: 'insensitive' } },
        {
          patient: {
            OR: [
              { firstName: { contains: searchTerm, mode: 'insensitive' } },
              { lastName: { contains: searchTerm, mode: 'insensitive' } },
              { patientCode: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    return this.prisma.prescription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
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
        finalizedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        cancelledBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Retrieve a single prescription by ID with tenant boundary validation.
   */
  async getPrescriptionById(clinicId: string, id: string) {
    const prescription = await this.prisma.prescription.findFirst({
      where: { id, clinicId },
      include: {
        items: true,
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
        finalizedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        cancelledBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!prescription) {
      throw new NotFoundException('Prescription not found.');
    }

    return prescription;
  }

  /**
   * Retrieve all prescriptions for a specific patient.
   */
  async getPatientPrescriptions(clinicId: string, patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, clinicId },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found in this clinic.');
    }

    return this.prisma.prescription.findMany({
      where: { clinicId, patientId },
      orderBy: { prescribedAt: 'desc' },
      include: {
        items: true,
        doctor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        finalizedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
        cancelledBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }
}

