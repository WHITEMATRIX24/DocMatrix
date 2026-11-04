import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import {
  CreateTreatmentPlanDto,
  CreateTreatmentPlanStageDto,
} from './dto/create-treatment-plan.dto.js';
import { UpdateTreatmentPlanDto } from './dto/update-treatment-plan.dto.js';
import { RecordAcceptanceDto } from './dto/record-acceptance.dto.js';
import { RecordRejectionDto } from './dto/record-rejection.dto.js';
import { UpdatePlanStatusDto } from './dto/update-plan-status.dto.js';
import { UpdatePlanItemDto } from './dto/update-plan-item.dto.js';
import { TreatmentPlanQueryDto } from './dto/treatment-plan-query.dto.js';
import { ImportLegacyPlansDto } from './dto/import-legacy-plan.dto.js';
import {
  AcceptanceMethod,
  Prisma,
  TreatmentPlanItemStatus,
  TreatmentPlanStatus,
  TreatmentStageStatus,
} from '@prisma/client';

// Standard FDI tooth numbering ranges
const VALID_FDI_TEETH = new Set([
  // Permanent teeth
  11, 12, 13, 14, 15, 16, 17, 18,
  21, 22, 23, 24, 25, 26, 27, 28,
  31, 32, 33, 34, 35, 36, 37, 38,
  41, 42, 43, 44, 45, 46, 47, 48,
  // Primary / Deciduous teeth
  51, 52, 53, 54, 55,
  61, 62, 63, 64, 65,
  71, 72, 73, 74, 75,
  81, 82, 83, 84, 85,
]);

// Interactive transaction configuration for distributed cloud databases (e.g. Neon)
const TX_OPTIONS = { maxWait: 10000, timeout: 20000 };

@Injectable()
export class TreatmentPlansService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  /**
   * Practitioner permission guard: DOCTOR, ADMIN, ORGANIZATION_ADMIN, or BRANCH_ADMIN required for clinical planning.
   */
  private assertAuthorizedPractitioner(user: AuthenticatedUser): void {
    const role = (user.role || '').toUpperCase();
    if (
      role !== 'DOCTOR' &&
      role !== 'ADMIN' &&
      role !== 'ORGANIZATION_ADMIN' &&
      role !== 'BRANCH_ADMIN'
    ) {
      throw new ForbiddenException(
        'Unauthorized: Only dentists (DOCTOR) or clinic administrators can author, revise, or change treatment plans.',
      );
    }
  }

  /**
   * Concurrency-safe atomic plan number allocation using ClinicSequence.
   */
  private async allocatePlanNumber(
    tx: Prisma.TransactionClient,
    clinicId: string,
  ): Promise<string> {
    const rows = await tx.$queryRaw<{ assignedValue: number }[]>`
      INSERT INTO "ClinicSequence" ("id", "clinicId", "sequenceType", "currentValue", "updatedAt")
      VALUES (gen_random_uuid(), ${clinicId}, 'TREATMENT_PLAN', 1001, NOW())
      ON CONFLICT ("clinicId", "sequenceType")
      DO UPDATE SET "currentValue" = "ClinicSequence"."currentValue" + 1, "updatedAt" = NOW()
      RETURNING "currentValue" AS "assignedValue";
    `;

    const assigned = rows[0]?.assignedValue ?? 1001;
    return `TP-${assigned}`;
  }

  /**
   * Validate FDI tooth numbers and dental surfaces.
   */
  validateToothAndSurface(toothNumber?: string, surface?: string): void {
    if (toothNumber && toothNumber.trim()) {
      const parts = toothNumber
        .split(/[,;\s]+/)
        .map((p) => p.trim())
        .filter(Boolean);

      for (const part of parts) {
        // If it's a number, ensure it conforms to FDI
        const num = parseInt(part, 10);
        if (!isNaN(num) && !VALID_FDI_TEETH.has(num)) {
          // If not in the FDI set and not descriptive (like Q1, Full, Arch)
          if (!part.toLowerCase().includes('q') && !part.toLowerCase().includes('arch')) {
            throw new BadRequestException(
              `Invalid FDI tooth number: '${part}'. Tooth numbers must adhere to FDI 2-digit notation (e.g. 11-18, 21-28, 31-38, 41-48, 51-85).`,
            );
          }
        }
      }
    }

    if (surface && surface.trim()) {
      const validSurfaces = new Set(['M', 'O', 'D', 'B', 'L', 'I', 'V', 'P']);
      const upper = surface.toUpperCase().trim();
      for (const ch of upper) {
        if (!validSurfaces.has(ch) && ch !== '-' && ch !== '/' && ch !== ' ') {
          throw new BadRequestException(
            `Invalid dental surface descriptor: '${surface}'. Allowed surfaces: M, O, D, B, L, I, V, P.`,
          );
        }
      }
    }
  }

  /**
   * Calculate exact decimal financial breakdowns authoritatively.
   */
  private calculateStageAndPlanTotals(
    stages: CreateTreatmentPlanStageDto[],
    taxRatePercentage = 0,
  ) {
    let planSubtotal = new Prisma.Decimal(0);
    let planTotalDiscount = new Prisma.Decimal(0);

    const calculatedStages = stages.map((stage) => {
      let stageCost = new Prisma.Decimal(0);

      const items = stage.items.map((item) => {
        this.validateToothAndSurface(item.toothNumber, item.surface);

        if (item.unitFee !== undefined && item.unitFee < 0) {
          throw new BadRequestException(
            `Unit fee cannot be negative for procedure '${item.procedureName}'.`,
          );
        }
        if (item.discount !== undefined && item.discount < 0) {
          throw new BadRequestException(
            `Discount cannot be negative for procedure '${item.procedureName}'.`,
          );
        }

        const qty = item.quantity && item.quantity > 0 ? item.quantity : 1;
        const unitFee = new Prisma.Decimal(item.unitFee || 0);
        const itemDiscount = new Prisma.Decimal(item.discount || 0);

        // netFee = (unitFee * qty) - itemDiscount
        const gross = unitFee.mul(qty);
        const net = gross.sub(itemDiscount);
        const netFee = net.greaterThan(0) ? net : new Prisma.Decimal(0);

        stageCost = stageCost.add(netFee);
        planTotalDiscount = planTotalDiscount.add(itemDiscount);

        return {
          ...item,
          quantity: qty,
          unitFee,
          discount: itemDiscount,
          netFee,
        };
      });

      planSubtotal = planSubtotal.add(stageCost);

      return {
        ...stage,
        estimatedCost: stageCost,
        items,
      };
    });

    const taxRate = new Prisma.Decimal(taxRatePercentage || 0);
    const tax = planSubtotal.mul(taxRate).div(100).toDecimalPlaces(2);
    const totalEstimatedCost = planSubtotal.add(tax).toDecimalPlaces(2);

    return {
      calculatedStages,
      subtotal: planSubtotal.toDecimalPlaces(2),
      discount: planTotalDiscount.toDecimalPlaces(2),
      tax,
      totalEstimatedCost,
    };
  }

  /**
   * Resolve patient by id or patientCode within the clinic.
   */
  private async resolvePatient(clinicId: string, patientIdentifier: string) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        clinicId,
        OR: [{ id: patientIdentifier }, { patientCode: patientIdentifier }],
      },
    });

    if (!patient) {
      throw new NotFoundException(
        `Patient with identifier '${patientIdentifier}' not found in this clinic.`,
      );
    }
    return patient;
  }

  /**
   * Create a new treatment plan with multi-stage organization and integrated cost estimates.
   */
  async createTreatmentPlan(
    clinicId: string,
    currentUser: AuthenticatedUser,
    dto: CreateTreatmentPlanDto,
  ) {
    this.assertAuthorizedPractitioner(currentUser);

    const patient = await this.resolvePatient(clinicId, dto.patientId);

    // Validate optional appointment
    if (dto.appointmentId) {
      const appt = await this.prisma.appointment.findFirst({
        where: { id: dto.appointmentId, clinicId, patientId: patient.id },
      });
      if (!appt) {
        throw new BadRequestException(
          'Linked appointment not found for this patient in this clinic.',
        );
      }
    }

    // Determine treating doctor
    let doctorId = currentUser.id;
    let doctorName =
      currentUser.fullName ||
      (currentUser as any).name ||
      'Dr. Attending Dentist';

    if (dto.doctorId && dto.doctorId !== currentUser.id) {
      const assignedDoc = await this.prisma.user.findFirst({
        where: { id: dto.doctorId, clinicId },
      });
      if (assignedDoc) {
        doctorId = assignedDoc.id;
        doctorName = assignedDoc.fullName || (assignedDoc as any).name || doctorName;
      }
    }

    if (!dto.stages || dto.stages.length === 0) {
      throw new BadRequestException(
        'A treatment plan must contain at least one clinical stage.',
      );
    }

    const totals = this.calculateStageAndPlanTotals(dto.stages, dto.taxRate);

    return this.prisma.$transaction(async (tx) => {
      const planNumber = await this.allocatePlanNumber(tx, clinicId);

      // Create main TreatmentPlan record
      const plan = await tx.treatmentPlan.create({
        data: {
          clinicId,
          planNumber,
          patientId: patient.id,
          doctorId,
          doctorName,
          appointmentId: dto.appointmentId || null,
          clinicalNoteId: dto.clinicalNoteId || null,
          title: dto.title.trim(),
          status: TreatmentPlanStatus.PROPOSED,
          notes: dto.notes?.trim() || null,
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          totalEstimatedCost: totals.totalEstimatedCost,
          currentVersion: 1,
          origin: 'CLINICAL',
        },
      });

      // Create Stages and Items
      for (const stage of totals.calculatedStages) {
        const createdStage = await tx.treatmentPlanStage.create({
          data: {
            treatmentPlanId: plan.id,
            stageNumber: stage.stageNumber,
            name: stage.name.trim(),
            status: TreatmentStageStatus.PLANNED,
            targetDate: stage.targetDate ? new Date(stage.targetDate) : null,
            estimatedCost: stage.estimatedCost,
          },
        });

        for (const item of stage.items) {
          await tx.treatmentPlanItem.create({
            data: {
              stageId: createdStage.id,
              procedureCode: item.procedureCode?.trim() || null,
              procedureName: item.procedureName.trim(),
              category: item.category.trim(),
              toothNumber: item.toothNumber?.trim() || null,
              surface: item.surface?.trim() || null,
              quantity: item.quantity || 1,
              unitFee: item.unitFee,
              discount: item.discount,
              netFee: item.netFee,
              status: TreatmentPlanItemStatus.PENDING,
              notes: item.notes?.trim() || null,
            },
          });
        }
      }

      // Snapshot version 1 in TreatmentEstimateRevision
      const itemsSnapshot = totals.calculatedStages.map((s) => ({
        stageNumber: s.stageNumber,
        name: s.name,
        estimatedCost: s.estimatedCost.toString(),
        items: s.items.map((i) => ({
          procedureCode: i.procedureCode,
          procedureName: i.procedureName,
          category: i.category,
          toothNumber: i.toothNumber,
          surface: i.surface,
          quantity: i.quantity,
          unitFee: i.unitFee.toString(),
          discount: i.discount.toString(),
          netFee: i.netFee.toString(),
        })),
      }));

      await tx.treatmentEstimateRevision.create({
        data: {
          treatmentPlanId: plan.id,
          versionNumber: 1,
          revisionReason: 'Initial treatment plan and cost estimate proposal',
          subtotal: totals.subtotal,
          discount: totals.discount,
          tax: totals.tax,
          totalEstimatedCost: totals.totalEstimatedCost,
          itemsSnapshot,
          status: 'PROPOSED',
          createdById: currentUser.id,
          createdByName: doctorName,
        },
      });

      // Audit History
      await tx.treatmentPlanHistory.create({
        data: {
          treatmentPlanId: plan.id,
          clinicId,
          userId: currentUser.id,
          userName: doctorName,
          userRole: currentUser.role,
          action: 'CREATED',
          details: {
            planNumber,
            title: plan.title,
            totalEstimatedCost: totals.totalEstimatedCost.toString(),
            stagesCount: totals.calculatedStages.length,
          },
        },
      });

      return this.fetchPlanWithRelations(tx, clinicId, plan.id);
    }, TX_OPTIONS);
  }

  /**
   * Update or revise an existing treatment plan.
   * If stages/items change, creates a new versioned estimate revision.
   */
  async updateTreatmentPlan(
    clinicId: string,
    currentUser: AuthenticatedUser,
    id: string,
    dto: UpdateTreatmentPlanDto,
  ) {
    this.assertAuthorizedPractitioner(currentUser);

    const existing = await this.prisma.treatmentPlan.findFirst({
      where: { id, clinicId },
      include: { stages: { include: { items: true } } },
    });

    if (!existing) {
      throw new NotFoundException(`Treatment plan #${id} not found in this clinic.`);
    }

    if (existing.status === TreatmentPlanStatus.COMPLETED || existing.status === TreatmentPlanStatus.CANCELLED) {
      throw new BadRequestException(
        `Cannot edit treatment plan #${existing.planNumber} because it is already marked as ${existing.status}.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      let subtotal = existing.subtotal;
      let discount = existing.discount;
      let tax = existing.tax;
      let totalEstimatedCost = existing.totalEstimatedCost;
      let newVersion = existing.currentVersion;

      // If stages are provided, calculate new totals and create a new estimate revision
      if (dto.stages && dto.stages.length > 0) {
        const totals = this.calculateStageAndPlanTotals(dto.stages, dto.taxRate);
        subtotal = totals.subtotal;
        discount = totals.discount;
        tax = totals.tax;
        totalEstimatedCost = totals.totalEstimatedCost;
        newVersion = existing.currentVersion + 1;

        // Delete previous stages and recreate (Cascade deletes items)
        await tx.treatmentPlanStage.deleteMany({
          where: { treatmentPlanId: existing.id },
        });

        for (const stage of totals.calculatedStages) {
          const createdStage = await tx.treatmentPlanStage.create({
            data: {
              treatmentPlanId: existing.id,
              stageNumber: stage.stageNumber,
              name: stage.name.trim(),
              status: TreatmentStageStatus.PLANNED,
              targetDate: stage.targetDate ? new Date(stage.targetDate) : null,
              estimatedCost: stage.estimatedCost,
            },
          });

          for (const item of stage.items) {
            await tx.treatmentPlanItem.create({
              data: {
                stageId: createdStage.id,
                procedureCode: item.procedureCode?.trim() || null,
                procedureName: item.procedureName.trim(),
                category: item.category.trim(),
                toothNumber: item.toothNumber?.trim() || null,
                surface: item.surface?.trim() || null,
                quantity: item.quantity || 1,
                unitFee: item.unitFee,
                discount: item.discount,
                netFee: item.netFee,
                status: TreatmentPlanItemStatus.PENDING,
                notes: item.notes?.trim() || null,
              },
            });
          }
        }

        const itemsSnapshot = totals.calculatedStages.map((s) => ({
          stageNumber: s.stageNumber,
          name: s.name,
          estimatedCost: s.estimatedCost.toString(),
          items: s.items.map((i) => ({
            procedureCode: i.procedureCode,
            procedureName: i.procedureName,
            category: i.category,
            toothNumber: i.toothNumber,
            surface: i.surface,
            quantity: i.quantity,
            unitFee: i.unitFee.toString(),
            discount: i.discount.toString(),
            netFee: i.netFee.toString(),
          })),
        }));

        const userName =
          currentUser.fullName ||
          (currentUser as any).name ||
          'Attending Doctor';

        await tx.treatmentEstimateRevision.create({
          data: {
            treatmentPlanId: existing.id,
            versionNumber: newVersion,
            revisionReason:
              dto.revisionReason?.trim() ||
              `Estimate revision v${newVersion} - clinical adjustments`,
            subtotal,
            discount,
            tax,
            totalEstimatedCost,
            itemsSnapshot,
            status: 'PROPOSED',
            createdById: currentUser.id,
            createdByName: userName,
          },
        });

        await tx.treatmentPlanHistory.create({
          data: {
            treatmentPlanId: existing.id,
            clinicId,
            userId: currentUser.id,
            userName,
            userRole: currentUser.role,
            action: 'ESTIMATE_REVISED',
            details: {
              newVersion,
              revisionReason: dto.revisionReason,
              totalEstimatedCost: totalEstimatedCost.toString(),
            },
          },
        });
      }

      const nextStatus =
        dto.status ||
        (newVersion > existing.currentVersion &&
        existing.status === TreatmentPlanStatus.ACCEPTED
          ? TreatmentPlanStatus.PROPOSED
          : existing.status);

      await tx.treatmentPlan.update({
        where: { id: existing.id },
        data: {
          title: dto.title ? dto.title.trim() : existing.title,
          notes: dto.notes !== undefined ? dto.notes?.trim() || null : existing.notes,
          status: nextStatus,
          subtotal,
          discount,
          tax,
          totalEstimatedCost,
          currentVersion: newVersion,
        },
      });

      return this.fetchPlanWithRelations(tx, clinicId, existing.id);
    }, TX_OPTIONS);
  }

  /**
   * Record patient acceptance of a specific estimate revision version.
   * Explicitly notes whether it was staff-recorded vs written/digital consent.
   */
  async recordAcceptance(
    clinicId: string,
    currentUser: AuthenticatedUser,
    id: string,
    dto: RecordAcceptanceDto,
  ) {
    const plan = await this.prisma.treatmentPlan.findFirst({
      where: { id, clinicId },
    });

    if (!plan) {
      throw new NotFoundException(`Treatment plan #${id} not found in this clinic.`);
    }

    const revision = await this.prisma.treatmentEstimateRevision.findUnique({
      where: {
        treatmentPlanId_versionNumber: {
          treatmentPlanId: plan.id,
          versionNumber: dto.versionNumber,
        },
      },
    });

    if (!revision) {
      throw new BadRequestException(
        `Estimate version #${dto.versionNumber} does not exist for plan #${plan.planNumber}.`,
      );
    }

    const userName =
      currentUser.fullName ||
      (currentUser as any).name ||
      'Authorized Staff';

    const isStaffRecorded = dto.isStaffRecorded !== undefined ? dto.isStaffRecorded : true;

    return this.prisma.$transaction(async (tx) => {
      // Mark the estimate revision as accepted
      await tx.treatmentEstimateRevision.update({
        where: { id: revision.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          acceptedByName: dto.patientAcceptedByName.trim(),
          acceptanceMethod: dto.acceptanceMethod,
          isStaffRecorded,
        },
      });

      // Update plan status
      const updatedPlan = await tx.treatmentPlan.update({
        where: { id: plan.id },
        data: {
          status: TreatmentPlanStatus.ACCEPTED,
          acceptedVersion: dto.versionNumber,
          patientAcceptedAt: new Date(),
          patientAcceptedByName: dto.patientAcceptedByName.trim(),
          acceptanceMethod: dto.acceptanceMethod,
          isStaffRecorded,
          acceptanceRecordedById: currentUser.id,
          acceptanceRecordedByName: userName,
          rejectionReason: null,
          rejectedAt: null,
          rejectedById: null,
        },
      });

      // Log auditable event
      await tx.treatmentPlanHistory.create({
        data: {
          treatmentPlanId: plan.id,
          clinicId,
          userId: currentUser.id,
          userName,
          userRole: currentUser.role,
          action: 'ACCEPTED',
          details: {
            versionNumber: dto.versionNumber,
            patientAcceptedByName: dto.patientAcceptedByName.trim(),
            acceptanceMethod: dto.acceptanceMethod,
            isStaffRecorded,
            notes: dto.notes,
            disclaimer: isStaffRecorded
              ? 'Recorded by clinic staff on behalf of patient/guardian; not a direct patient digital signature.'
              : 'Direct patient signed consent.',
          },
        },
      });

      return this.fetchPlanWithRelations(tx, clinicId, updatedPlan.id);
    }, TX_OPTIONS);
  }

  /**
   * Record patient rejection / declined treatment plan.
   */
  async recordRejection(
    clinicId: string,
    currentUser: AuthenticatedUser,
    id: string,
    dto: RecordRejectionDto,
  ) {
    const plan = await this.prisma.treatmentPlan.findFirst({
      where: { id, clinicId },
    });

    if (!plan) {
      throw new NotFoundException(`Treatment plan #${id} not found in this clinic.`);
    }

    const userName =
      currentUser.fullName ||
      (currentUser as any).name ||
      'Authorized Staff';

    return this.prisma.$transaction(async (tx) => {
      const updatedPlan = await tx.treatmentPlan.update({
        where: { id: plan.id },
        data: {
          status: TreatmentPlanStatus.REJECTED,
          rejectionReason: dto.rejectionReason.trim(),
          rejectedAt: new Date(),
          rejectedById: currentUser.id,
        },
      });

      await tx.treatmentPlanHistory.create({
        data: {
          treatmentPlanId: plan.id,
          clinicId,
          userId: currentUser.id,
          userName,
          userRole: currentUser.role,
          action: 'REJECTED',
          details: {
            reason: dto.rejectionReason.trim(),
            notes: dto.notes,
          },
        },
      });

      return this.fetchPlanWithRelations(tx, clinicId, updatedPlan.id);
    }, TX_OPTIONS);
  }

  /**
   * Update plan lifecycle status (e.g. IN_PROGRESS, COMPLETED, CANCELLED).
   */
  async updatePlanStatus(
    clinicId: string,
    currentUser: AuthenticatedUser,
    id: string,
    dto: UpdatePlanStatusDto,
  ) {
    const plan = await this.prisma.treatmentPlan.findFirst({
      where: { id, clinicId },
    });

    if (!plan) {
      throw new NotFoundException(`Treatment plan #${id} not found in this clinic.`);
    }

    const userName =
      currentUser.fullName ||
      (currentUser as any).name ||
      'Authorized Staff';

    return this.prisma.$transaction(async (tx) => {
      const updatedPlan = await tx.treatmentPlan.update({
        where: { id: plan.id },
        data: {
          status: dto.status,
        },
      });

      await tx.treatmentPlanHistory.create({
        data: {
          treatmentPlanId: plan.id,
          clinicId,
          userId: currentUser.id,
          userName,
          userRole: currentUser.role,
          action: 'STATUS_CHANGED',
          details: {
            previousStatus: plan.status,
            newStatus: dto.status,
            reason: dto.reason,
          },
        },
      });

      return this.fetchPlanWithRelations(tx, clinicId, updatedPlan.id);
    }, TX_OPTIONS);
  }

  /**
   * Update procedure item status (e.g. PENDING -> IN_PROGRESS -> COMPLETED, or DEFERRED / CANCELLED).
   */
  async updatePlanItemStatus(
    clinicId: string,
    currentUser: AuthenticatedUser,
    planId: string,
    itemId: string,
    dto: UpdatePlanItemDto,
  ) {
    const plan = await this.prisma.treatmentPlan.findFirst({
      where: { id: planId, clinicId },
    });

    if (!plan) {
      throw new NotFoundException(`Treatment plan #${planId} not found.`);
    }

    const item = await this.prisma.treatmentPlanItem.findUnique({
      where: { id: itemId },
      include: { stage: true },
    });

    if (!item || item.stage.treatmentPlanId !== plan.id) {
      throw new NotFoundException(`Procedure item #${itemId} not found in this plan.`);
    }

    const userName =
      currentUser.fullName ||
      (currentUser as any).name ||
      'Authorized Staff';

    return this.prisma.$transaction(async (tx) => {
      const updatedItem = await tx.treatmentPlanItem.update({
        where: { id: item.id },
        data: {
          status: dto.status,
          notes: dto.notes !== undefined ? dto.notes?.trim() || null : item.notes,
        },
      });

      // Check stage progression excluding cancelled items
      const allStageItems = await tx.treatmentPlanItem.findMany({
        where: { stageId: item.stageId },
      });

      const effectiveStageItems = allStageItems.map((i) => ({
        ...i,
        status: i.id === item.id ? dto.status : i.status,
      }));

      const activeStageItems = effectiveStageItems.filter(
        (i) => i.status !== TreatmentPlanItemStatus.CANCELLED,
      );

      const allStageCompleted =
        activeStageItems.length > 0 &&
        activeStageItems.every(
          (i) => i.status === TreatmentPlanItemStatus.COMPLETED,
        );

      if (allStageCompleted) {
        await tx.treatmentPlanStage.update({
          where: { id: item.stageId },
          data: { status: TreatmentStageStatus.COMPLETED },
        });
      } else {
        const anyInProgress = effectiveStageItems.some(
          (i) =>
            i.status === TreatmentPlanItemStatus.IN_PROGRESS ||
            i.status === TreatmentPlanItemStatus.COMPLETED,
        );
        if (anyInProgress) {
          await tx.treatmentPlanStage.update({
            where: { id: item.stageId },
            data: { status: TreatmentStageStatus.IN_PROGRESS },
          });
        }
      }

      // Automatically transition plan lifecycle:
      // If plan is ACCEPTED and procedure begins/completes -> IN_PROGRESS
      if (
        plan.status === TreatmentPlanStatus.ACCEPTED &&
        (dto.status === TreatmentPlanItemStatus.IN_PROGRESS ||
          dto.status === TreatmentPlanItemStatus.COMPLETED)
      ) {
        await tx.treatmentPlan.update({
          where: { id: plan.id },
          data: { status: TreatmentPlanStatus.IN_PROGRESS },
        });
      }

      // Check if ALL non-cancelled items across all stages in the plan are completed
      const allPlanItems = await tx.treatmentPlanItem.findMany({
        where: { stage: { treatmentPlanId: plan.id } },
      });
      const effectivePlanItems = allPlanItems.map((i) => ({
        ...i,
        status: i.id === item.id ? dto.status : i.status,
      }));
      const activePlanItems = effectivePlanItems.filter(
        (i) => i.status !== TreatmentPlanItemStatus.CANCELLED,
      );
      if (
        activePlanItems.length > 0 &&
        activePlanItems.every(
          (i) => i.status === TreatmentPlanItemStatus.COMPLETED,
        )
      ) {
        await tx.treatmentPlan.update({
          where: { id: plan.id },
          data: { status: TreatmentPlanStatus.COMPLETED },
        });
      }

      await tx.treatmentPlanHistory.create({
        data: {
          treatmentPlanId: plan.id,
          clinicId,
          userId: currentUser.id,
          userName,
          userRole: currentUser.role,
          action: 'ITEM_UPDATED',
          details: {
            procedureName: item.procedureName,
            toothNumber: item.toothNumber,
            previousStatus: item.status,
            newStatus: dto.status,
            notes: dto.notes,
          },
        },
      });

      return this.fetchPlanWithRelations(tx, clinicId, plan.id);
    }, TX_OPTIONS);
  }

  /**
   * Get treatment plans with filtering, search, and pagination.
   */
  async getTreatmentPlans(clinicId: string, query: TreatmentPlanQueryDto) {
    const where: Prisma.TreatmentPlanWhereInput = { clinicId };

    if (query.patientId) {
      where.patientId = query.patientId;
    }

    if (query.doctorId) {
      where.doctorId = query.doctorId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { planNumber: { contains: s, mode: 'insensitive' } },
        { title: { contains: s, mode: 'insensitive' } },
        { doctorName: { contains: s, mode: 'insensitive' } },
        { patient: { firstName: { contains: s, mode: 'insensitive' } } },
        { patient: { lastName: { contains: s, mode: 'insensitive' } } },
        { patient: { patientCode: { contains: s, mode: 'insensitive' } } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.treatmentPlan.count({ where }),
      this.prisma.treatmentPlan.findMany({
        where,
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
            },
          },
          stages: {
            orderBy: { stageNumber: 'asc' },
            include: { items: { orderBy: { createdAt: 'asc' } } },
          },
          estimateRevisions: {
            orderBy: { versionNumber: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: query.limit || 50,
        skip: query.offset || 0,
      }),
    ]);

    return {
      total,
      limit: query.limit || 50,
      offset: query.offset || 0,
      items,
    };
  }

  /**
   * Get single treatment plan by ID with stages, items, revision history, and audit log.
   */
  async getTreatmentPlanById(clinicId: string, id: string) {
    const plan = await this.prisma.treatmentPlan.findFirst({
      where: { id, clinicId },
      include: {
        patient: true,
        stages: {
          orderBy: { stageNumber: 'asc' },
          include: { items: { orderBy: { createdAt: 'asc' } } },
        },
        estimateRevisions: {
          orderBy: { versionNumber: 'desc' },
        },
        histories: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(`Treatment plan #${id} not found in this clinic.`);
    }

    return plan;
  }

  /**
   * Get all treatment plans for a specific patient.
   */
  async getPatientTreatmentPlans(clinicId: string, patientId: string) {
    const patient = await this.resolvePatient(clinicId, patientId);

    return this.prisma.treatmentPlan.findMany({
      where: { clinicId, patientId: patient.id },
      include: {
        stages: {
          orderBy: { stageNumber: 'asc' },
          include: { items: true },
        },
        estimateRevisions: {
          orderBy: { versionNumber: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Safe, explicit legacy data migration / import strategy.
   * Maps legacy localStorage records into structured treatment plans.
   * Does not overwrite existing plans or import duplicates.
   */
  async importLegacyPlans(
    clinicId: string,
    currentUser: AuthenticatedUser,
    dto: ImportLegacyPlansDto,
  ) {
    this.assertAuthorizedPractitioner(currentUser);

    const userName =
      currentUser.fullName ||
      (currentUser as any).name ||
      'System Migration';

    const results = {
      imported: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const legacy of dto.plans) {
      try {
        const patient = await this.prisma.patient.findFirst({
          where: {
            clinicId,
            OR: [
              { id: legacy.patientId },
              { patientCode: legacy.patientId },
            ],
          },
        });

        if (!patient) {
          results.skipped++;
          results.errors.push(
            `Skipped legacy plan for patient '${legacy.patientId}': Patient not found.`,
          );
          continue;
        }

        // Map legacy status safely
        let mappedStatus: TreatmentPlanStatus = TreatmentPlanStatus.PROPOSED;
        const rawStatus = (legacy.status || '').toLowerCase().trim();
        if (rawStatus === 'accepted') mappedStatus = TreatmentPlanStatus.ACCEPTED;
        else if (rawStatus === 'in progress' || rawStatus === 'in-progress') mappedStatus = TreatmentPlanStatus.IN_PROGRESS;
        else if (rawStatus === 'completed') mappedStatus = TreatmentPlanStatus.COMPLETED;
        else if (rawStatus === 'pending') mappedStatus = TreatmentPlanStatus.PENDING;
        else if (rawStatus === 'declined' || rawStatus === 'rejected') mappedStatus = TreatmentPlanStatus.REJECTED;

        // Idempotency check: Skip if legacyId was already imported for this clinic
        if (legacy.legacyId) {
          const alreadyImported = await this.prisma.treatmentPlan.findFirst({
            where: {
              clinicId,
              origin: 'IMPORTED_LEGACY',
              notes: { contains: legacy.legacyId },
            },
          });
          if (alreadyImported) {
            results.skipped++;
            continue;
          }
        }

        const cost = new Prisma.Decimal(legacy.cost || 0);

        await this.prisma.$transaction(async (tx) => {
          const planNumber = await this.allocatePlanNumber(tx, clinicId);

          const plan = await tx.treatmentPlan.create({
            data: {
              clinicId,
              planNumber,
              patientId: patient.id,
              doctorId: currentUser.id,
              doctorName: legacy.doctor || userName,
              title: `${legacy.procedure} (Imported)`,
              status: mappedStatus,
              notes: legacy.notes ? `Legacy Plan #${legacy.legacyId || 'N/A'}: ${legacy.notes}` : `Imported from legacy records (#${legacy.legacyId || 'N/A'})`,
              subtotal: cost,
              discount: new Prisma.Decimal(0),
              tax: new Prisma.Decimal(0),
              totalEstimatedCost: cost,
              currentVersion: 1,
              origin: 'IMPORTED_LEGACY',
              createdAt: legacy.date ? new Date(legacy.date) : new Date(),
            },
          });

          const stage = await tx.treatmentPlanStage.create({
            data: {
              treatmentPlanId: plan.id,
              stageNumber: 1,
              name: 'Stage 1: Primary Treatment',
              status: mappedStatus === TreatmentPlanStatus.COMPLETED ? TreatmentStageStatus.COMPLETED : TreatmentStageStatus.PLANNED,
              estimatedCost: cost,
            },
          });

          await tx.treatmentPlanItem.create({
            data: {
              stageId: stage.id,
              procedureName: legacy.procedure,
              category: legacy.category || 'General Dentistry',
              toothNumber: legacy.toothNumber || null,
              unitFee: cost,
              discount: new Prisma.Decimal(0),
              netFee: cost,
              status: mappedStatus === TreatmentPlanStatus.COMPLETED ? TreatmentPlanItemStatus.COMPLETED : TreatmentPlanItemStatus.PENDING,
            },
          });

          await tx.treatmentEstimateRevision.create({
            data: {
              treatmentPlanId: plan.id,
              versionNumber: 1,
              revisionReason: 'Legacy record import',
              subtotal: cost,
              discount: new Prisma.Decimal(0),
              tax: new Prisma.Decimal(0),
              totalEstimatedCost: cost,
              itemsSnapshot: [{
                stageNumber: 1,
                name: 'Stage 1: Primary Treatment',
                items: [{
                  procedureName: legacy.procedure,
                  category: legacy.category || 'General Dentistry',
                  toothNumber: legacy.toothNumber,
                  netFee: cost.toString(),
                }],
              }],
              status: mappedStatus === TreatmentPlanStatus.ACCEPTED ? 'ACCEPTED' : 'PROPOSED',
              createdById: currentUser.id,
              createdByName: userName,
            },
          });

          await tx.treatmentPlanHistory.create({
            data: {
              treatmentPlanId: plan.id,
              clinicId,
              userId: currentUser.id,
              userName,
              userRole: currentUser.role,
              action: 'CREATED',
              details: {
                origin: 'IMPORTED_LEGACY',
                legacyId: legacy.legacyId,
              },
            },
          });
        }, TX_OPTIONS);

        results.imported++;
      } catch (err: any) {
        results.errors.push(`Error importing ${legacy.procedure}: ${err.message}`);
      }
    }

    return results;
  }

  /**
   * Helper to retrieve full plan object with relations.
   */
  private async fetchPlanWithRelations(
    tx: Prisma.TransactionClient,
    clinicId: string,
    id: string,
  ) {
    return tx.treatmentPlan.findFirst({
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
          },
        },
        stages: {
          orderBy: { stageNumber: 'asc' },
          include: { items: { orderBy: { createdAt: 'asc' } } },
        },
        estimateRevisions: {
          orderBy: { versionNumber: 'desc' },
        },
        histories: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }
}
