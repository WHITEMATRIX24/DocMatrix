import { DocumentQueryDto } from './dto/document-query.dto.js';
import { Prisma } from '@prisma/client';
import { VALID_TEETH, TOOTH_CONDITIONS } from './dto/save-tooth-condition.dto.js';
import { assertDocumentOwnership } from '../storage/document-key.policy.js';
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  SaveToothConditionDto,
  BatchSaveToothConditionsDto,
} from './dto/save-tooth-condition.dto.js';
import { ADULT_TEETH, DOCUMENT_CATEGORIES, CreateDocumentDto } from './dto/create-document.dto.js';
import { CreateConsentDto } from './dto/create-consent.dto.js';
import { UpdateConsentDto } from './dto/update-consent.dto.js';
import {
  CreateConsentTemplateDto,
  UpdateConsentTemplateDto,
} from './dto/consent-template.dto.js';
import {
  CancelConsentDto,
  DeclineConsentDto,
  GenerateConsentDto,
  SubmitGuardianSignatureDto,
  SubmitPatientSignatureDto,
  VerifyConsentDto,
} from './dto/consent-workflow.dto.js';
import {
  DEFAULT_CONSENT_TEMPLATES,
  matchDefaultConsentTemplate,
  normalizeProcedureKey,
} from './consent-templates.catalog.js';
import { buildConsentPdfBuffer } from './consent-pdf.util.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { StorageService } from '../storage/storage.service.js';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class ClinicalService {
  private readonly storageRoot = path.resolve(process.cwd(), 'storage', 'documents');

  constructor(
    private prisma: PrismaService,
    private storageService?: StorageService,
  ) {
    try {
      if (!fs.existsSync(this.storageRoot)) {
        fs.mkdirSync(this.storageRoot, { recursive: true });
      }
    } catch {}
  }

  /**
   * Resolve a patient by either internal UUID or unique clinic patientCode.
   * Strictly scopes query to the requesting clinicId.
   */
  async resolvePatient(clinicId: string, patientIdOrCode: string) {
    if (!patientIdOrCode) {
      throw new BadRequestException('Patient identifier is required.');
    }

    const patient = await this.prisma.patient.findFirst({
      where: {
        clinicId,
        OR: [
          { id: patientIdOrCode },
          { patientCode: patientIdOrCode },
        ],
      },
    });

    if (!patient) {
      throw new NotFoundException(`Patient not found with identifier "${patientIdOrCode}".`);
    }

    const conflicting = await this.prisma.patient.findFirst({ where: { clinicId, id: { not: patient.id }, OR: [{ id: patientIdOrCode }, { patientCode: patientIdOrCode }] }, select: { id: true } });
    if (conflicting && conflicting.id !== patient.id) throw new NotFoundException('Ambiguous patient identity. Correct the conflicting patient code before proceeding.');
    return patient;
  }

  // =========================================================================
  // 1. TOOTH CHART (ODONTOGRAM)
  // =========================================================================

  async getToothChart(clinicId: string, patientIdOrCode: string) {
    const patient = await this.resolvePatient(clinicId, patientIdOrCode);

    const conditions = await this.prisma.toothCondition.findMany({
      where: {
        clinicId,
        patientId: patient.id,
      },
      orderBy: { toothNumber: 'asc' },
    });

    const chartMap: Record<number, { condition: string; notes?: string; updatedAt: string }> = {};
    for (const record of conditions) {
      chartMap[record.toothNumber] = {
        condition: record.condition,
        notes: record.notes || undefined,
        updatedAt: record.updatedAt.toISOString(),
      };
    }

    return {
      patientId: patient.patientCode,
      patientUuid: patient.id,
      chart: chartMap,
    };
  }

  private validateChartUpdates(updates: SaveToothConditionDto[]) {
    if (!updates.length || updates.length > 52 || new Set(updates.map(u => u.toothNumber)).size !== updates.length || updates.some(u =>
      !Number.isInteger(u.toothNumber) || !VALID_TEETH.includes(u.toothNumber) || !TOOTH_CONDITIONS.includes(u.condition) ||
      (u.notes !== undefined && (typeof u.notes !== 'string' || u.notes.length > 10000)))) {
      throw new BadRequestException('Supply unique valid FDI teeth, supported conditions and notes of at most 10000 characters.');
    }
  }

  private async persistChart(clinicId: string, patientId: string, updates: SaveToothConditionDto[], actor?: AuthenticatedUser) {
    this.validateChartUpdates(updates);
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "Patient" WHERE id=${patientId} AND "clinicId"=${clinicId} FOR UPDATE`);
      const before = await tx.toothCondition.findMany({ where: { clinicId, patientId, toothNumber: { in: updates.map(u => u.toothNumber) } } });
      const records = [];
      for (const item of updates) records.push(await tx.toothCondition.upsert({
        where: { clinicId_patientId_toothNumber: { clinicId, patientId, toothNumber: item.toothNumber } },
        update: { condition: item.condition, notes: item.notes ?? null },
        create: { clinicId, patientId, toothNumber: item.toothNumber, condition: item.condition, notes: item.notes ?? null },
      }));
      await tx.auditEvent.create({ data: {
        id: crypto.randomUUID(), clinicId, module: 'Clinical', action: 'TOOTH_CHART_UPDATED',
        actorId: actor?.id, actorName: actor?.fullName || 'System', actorRole: actor?.role || 'SYSTEM',
        description: 'Patient tooth chart updated.', severity: 'info', outcome: 'SUCCESS',
        metadata: { patientId, changes: updates.map(item => {
          const old = before.find(row => row.toothNumber === item.toothNumber);
          return { toothNumber: item.toothNumber, before: old ? { condition: old.condition, notes: old.notes } : null, after: { condition: item.condition, notes: item.notes ?? null } };
        }) },
      } });
      return records;
    }, { timeout: 20000, maxWait: 10000 });
  }

  async saveToothCondition(clinicId: string, patientIdOrCode: string, dto: SaveToothConditionDto, actor?: AuthenticatedUser) {
    const patient = await this.resolvePatient(clinicId, patientIdOrCode);
    const [record] = await this.persistChart(clinicId, patient.id, [dto], actor);
    return { success: true, patientId: patient.patientCode, toothNumber: record.toothNumber,
      condition: record.condition, notes: record.notes || undefined, updatedAt: record.updatedAt.toISOString() };
  }

  async batchSaveToothChart(clinicId: string, patientIdOrCode: string, dto: BatchSaveToothConditionsDto, actor?: AuthenticatedUser) {
    const patient = await this.resolvePatient(clinicId, patientIdOrCode);
    const updates: SaveToothConditionDto[] = [...(dto.conditions || [])];
    if (dto.chart) for (const [key, value] of Object.entries(dto.chart)) {
      if (!/^\d{2}$/.test(key) || !value || typeof value !== 'object' || Object.keys(value).some(k => !['condition','notes'].includes(k))) throw new BadRequestException('Invalid tooth chart entry.');
      updates.push({ toothNumber: Number(key), condition: value.condition, notes: value.notes });
    }
    const records = await this.persistChart(clinicId, patient.id, updates, actor);
    return { success: true, patientId: patient.patientCode, updatedCount: records.length };
  }

  async getToothChartHistory(clinicId: string, patientIdOrCode: string) {
    const patient = await this.resolvePatient(clinicId, patientIdOrCode);
    return this.prisma.auditEvent.findMany({ where: { clinicId, action: 'TOOTH_CHART_UPDATED', metadata: { path: ['patientId'], equals: patient.id } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 100,
      select: { id: true, createdAt: true, actorName: true, metadata: true } });
  }

  async getAllClinicToothCharts(clinicId: string) {
    const allRecords = await this.prisma.toothCondition.findMany({
      where: { clinicId },
      include: {
        patient: {
          select: { id: true, patientCode: true },
        },
      },
      orderBy: { toothNumber: 'asc' },
    });

    const chartsByPatient: Record<string, Record<number, { condition: string; notes?: string }>> = {};

    for (const rec of allRecords) {
      const pCode = rec.patient.patientCode || rec.patient.id;
      if (!chartsByPatient[pCode]) {
        chartsByPatient[pCode] = {};
      }
      chartsByPatient[pCode][rec.toothNumber] = {
        condition: rec.condition,
        notes: rec.notes || undefined,
      };
    }

    return chartsByPatient;
  }

  // =========================================================================
  // 2. PATIENT DOCUMENTS
  // =========================================================================

  private documentScope(_actor?: AuthenticatedUser) { return { archivedAt: null }; }

  async documentAppointments(clinicId: string, patientRef: string) {
    const patient = await this.resolvePatient(clinicId, patientRef);
    return this.prisma.appointment.findMany({ where: { clinicId, patientId: patient.id },
      select: { id: true, startTime: true, treatmentType: true, visitType: true }, orderBy: { startTime: 'desc' } });
  }

  private serializeDocument(doc: any, patientCode?: string) {
    const code = patientCode || doc.patient?.patientCode || doc.patientId;
    return {
      id: doc.id,
      patientId: code,
      title: doc.title,
      category: doc.category,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType || 'application/octet-stream',
      uploadDate: (doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt))
        .toISOString()
        .slice(0, 10),
      doctor: doc.doctorName || null,
      notes: doc.notes || undefined,
      downloadUrl: `/patients/${encodeURIComponent(code)}/documents/${doc.id}/download`,
      previewUrl: `/patients/${encodeURIComponent(code)}/documents/${doc.id}/preview`,
      appointmentId: doc.appointmentId, appointment: doc.appointment,
      imagingType: doc.imagingType, photographClass: doc.photographClass,
      toothNumbers: doc.toothNumbers || [], treatmentContext: doc.treatmentContext,
      documentDate: doc.documentDate, uploadedById: doc.uploadedById,
      uploadedByName: doc.uploadedByName || doc.doctorName, sizeBytes: doc.sizeBytes,
      archivedAt: doc.archivedAt,
      createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : new Date(doc.createdAt).toISOString(),
      updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : new Date(doc.updatedAt).toISOString(),
    };
  }

  async getDocuments(clinicId: string, patientIdOrCode: string, actor?: AuthenticatedUser, query: DocumentQueryDto = {}) {
    const patient = await this.resolvePatient(clinicId, patientIdOrCode);
    if (query.archived === 'true' && !actor?.isPlatformAdmin && !['ORGANIZATION_ADMIN','BRANCH_ADMIN'].includes(actor?.role || '')) throw new ForbiddenException('Archive access requires an administrator.');
    if (query.from && query.to && new Date(query.from) > new Date(query.to)) throw new BadRequestException('Start date must precede end date.');
    if (query.appointmentId && !await this.prisma.appointment.findFirst({ where: { id: query.appointmentId, clinicId, patientId: patient.id } })) throw new NotFoundException('Appointment not found for this patient.');
    const docs = await this.prisma.patientDocument.findMany({
      where: { clinicId, patientId: patient.id, archivedAt: query.archived === 'true' ? { not: null } : null,
        ...(query.category ? { category: query.category } : {}),
        ...(query.imagingType ? { imagingType: query.imagingType } : {}),
        ...(query.appointmentId ? { appointmentId: query.appointmentId } : {}),
        ...(query.uploader ? { uploadedById: query.uploader } : {}),
        ...(query.search ? { title: { contains: query.search, mode: 'insensitive' } } : {}),
        ...(query.from || query.to ? { createdAt: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } } : {}),
      }, include: { appointment: { select: { id: true, startTime: true, treatmentType: true, visitType: true } } },
      orderBy: [{ createdAt: query.sort === 'asc' ? 'asc' : 'desc' }, { id: 'desc' }],
    });
    return docs.map(d => this.serializeDocument(d, patient.patientCode));
  }

  async createDocument(
    clinicId: string,
    patientIdOrCode: string,
    dto: CreateDocumentDto,
    file?: any,
    actor?: AuthenticatedUser,
  ) {
    if (!DOCUMENT_CATEGORIES.includes(dto.category) || !dto.title?.trim()) throw new BadRequestException('A name and supported category are required.');
    const xray = ['Dental X-rays', 'Radiology'].includes(dto.category);
    const photo = ['Clinical Photographs', 'Intraoral Photo'].includes(dto.category);
    if (dto.imagingType && (!xray || !['IOPA','OPG','CBCT','Other'].includes(dto.imagingType))) throw new BadRequestException('Imaging type applies only to dental X-rays.');
    if (dto.photographClass && (!photo || !['Before Treatment','During Treatment','After Treatment','General Clinical Photograph'].includes(dto.photographClass))) throw new BadRequestException('Invalid clinical photograph classification.');
    if (dto.toothNumbers?.length && ((!xray && !photo) || dto.toothNumbers.some(t => !ADULT_TEETH.includes(t)) || new Set(dto.toothNumbers).size !== dto.toothNumbers.length)) throw new BadRequestException('Supply unique permanent FDI teeth for photographs or dental X-rays.');
    const patient = await this.resolvePatient(clinicId, patientIdOrCode);

    if (dto.appointmentId && !await this.prisma.appointment.findFirst({ where: { id: dto.appointmentId, clinicId, patientId: patient.id } })) throw new BadRequestException('Appointment does not belong to this patient and clinic.');
    if (dto.uploadRequestId) {
      const previous = await this.prisma.patientDocument.findFirst({ where: { clinicId, uploadRequestId: dto.uploadRequestId } });
      if (previous) {
        if (previous.patientId !== patient.id || previous.archivedAt) throw new BadRequestException('Upload reference is already used.');
        return this.serializeDocument(previous, patient.patientCode);
      }
    }
    let fileBuffer: Buffer | null = null;
    const originalName = file?.originalname || dto.fileName || `${dto.title.trim().toLowerCase().replace(/\s+/g, '_')}.bin`;
    const claimedMime = file?.mimetype || dto.mimeType;

    if (file?.buffer) {
      fileBuffer = file.buffer;
    } else if (dto.contentBase64) {
      fileBuffer = Buffer.from(dto.contentBase64, 'base64');
    }

    if (!fileBuffer?.length) throw new BadRequestException('A non-empty document file is required.');
    if (!this.storageService) throw new BadRequestException('Secure storage is unavailable.');
    const upload = await this.storageService.uploadPatientDocument({ clinicId, patientId: patient.id,
      category: dto.category, buffer: fileBuffer, originalFilename: originalName, claimedMimeType: claimedMime,
      doctorName: actor?.fullName });
    let doc;
    try {
      doc = await this.prisma.$transaction(async tx => {
        const record = await tx.patientDocument.create({ data: {
          uploadRequestId: dto.uploadRequestId || null, clinicId, patientId: patient.id, title: dto.title.trim(), category: dto.category,
          fileName: upload.fileName, fileSize: upload.fileSize, fileKey: upload.fileKey, mimeType: upload.mimeType,
          sizeBytes: fileBuffer!.length, doctorName: actor?.fullName || null,
          notes: dto.notes?.trim() || null, appointmentId: dto.appointmentId || null,
          imagingType: dto.imagingType || null, photographClass: dto.photographClass || null,
          toothNumbers: dto.toothNumbers || [], treatmentContext: dto.treatmentContext || null,
          documentDate: dto.documentDate ? new Date(dto.documentDate) : null,
          uploadedById: actor?.id || null, uploadedByName: actor?.fullName || null,
        } });
        await this.documentAudit(tx, clinicId, record.id, patient.id, 'DOCUMENT_UPLOADED', actor);
        return record;
      });
    } catch (error) {
      await this.storageService.deleteDocument(upload.fileKey).catch(() => {});
      if (dto.uploadRequestId && (error as any)?.code === 'P2002') {
        const previous = await this.prisma.patientDocument.findFirst({ where: { clinicId, patientId: patient.id, uploadRequestId: dto.uploadRequestId, archivedAt: null } });
        if (previous) return this.serializeDocument(previous, patient.patientCode);
      }
      throw error;
    }
    return this.serializeDocument(doc, patient.patientCode);
  }

  private async documentAudit(tx: any, clinicId: string, documentId: string, patientId: string, action: string, actor?: AuthenticatedUser) {
    await tx.auditEvent.create({ data: { id: crypto.randomUUID(), clinicId, module: 'Clinical', action,
      actorId: actor?.id, actorName: actor?.fullName || 'System', actorRole: actor?.role || 'SYSTEM',
      description: 'Patient document record action.', severity: 'info', outcome: 'SUCCESS', metadata: { documentId, patientId } } });
  }

  async getDocument(clinicId: string, patientIdOrCode: string, docId: string, actor?: AuthenticatedUser) {
    const patient = await this.resolvePatient(clinicId, patientIdOrCode);

    const doc = await this.prisma.patientDocument.findFirst({
      where: {
        id: docId,
        clinicId,
        patientId: patient.id,
        ...this.documentScope(actor),
      },
    });

    if (!doc) {
      throw new NotFoundException(`Document "${docId}" not found for this patient.`);
    }

    assertDocumentOwnership(doc.fileKey, clinicId, patient.id);
    return this.serializeDocument(doc, patient.patientCode);
  }

  async deleteDocument(clinicId: string, patientRef: string, docId: string, actor?: AuthenticatedUser) {
    return this.setDocumentArchived(clinicId, patientRef, docId, true, actor);
  }

  async setDocumentArchived(clinicId: string, patientRef: string, docId: string, archived: boolean, actor?: AuthenticatedUser) {
    if (!actor || !['ORGANIZATION_ADMIN', 'BRANCH_ADMIN'].includes(actor.role) && !actor.isPlatformAdmin) throw new ForbiddenException('Document retention management requires an administrator.');
    const patient = await this.resolvePatient(clinicId, patientRef);
    return this.prisma.$transaction(async tx => {
      const existing = await tx.patientDocument.findFirst({ where: { id: docId, clinicId, patientId: patient.id } });
      if (!existing) throw new NotFoundException('Document not found.');
      await tx.patientDocument.update({ where: { id: docId }, data: { archivedAt: archived ? new Date() : null } });
      await this.documentAudit(tx, clinicId, docId, patient.id, archived ? 'DOCUMENT_ARCHIVED' : 'DOCUMENT_RESTORED', actor);
      return { success: true, message: archived ? 'Document archived; file and audit history retained.' : 'Document restored.' };
    });
  }

  async downloadDocument(clinicId: string, patientIdOrCode: string, docId: string, actor?: AuthenticatedUser) {
    const patient = await this.resolvePatient(clinicId, patientIdOrCode);

    const doc = await this.prisma.patientDocument.findFirst({
      where: {
        id: docId,
        clinicId,
        patientId: patient.id,
        ...this.documentScope(actor),
      },
    });

    if (!doc) {
      throw new NotFoundException(`Document "${docId}" not found.`);
    }

    assertDocumentOwnership(doc.fileKey, clinicId, patient.id);
    let buffer: Buffer;
    let mimeType = doc.mimeType || 'application/octet-stream';
    let signedUrl: string | null = null;

    if (this.storageService) {

      try {
        const result = await this.storageService.getClinicDocumentBuffer(clinicId, patient.id, doc.fileKey);
        buffer = result.buffer;
        mimeType = result.mimeType || mimeType;
      } catch {
        const filePath = path.join(this.storageRoot, clinicId, path.basename(doc.fileKey));
        if (fs.existsSync(filePath)) {
          buffer = fs.readFileSync(filePath);
        } else {
          throw new NotFoundException('The original document file is unavailable.');
        }
      }
    } else {
      const filePath = path.join(this.storageRoot, clinicId, path.basename(doc.fileKey));
      if (fs.existsSync(filePath)) {
        buffer = fs.readFileSync(filePath);
      } else {
        throw new NotFoundException('The original document file is unavailable.');
      }
    }

    // Revalidate legacy objects too; never serve stored active MIME values.
    if (this.storageService) mimeType = this.storageService.validateFile(buffer, doc.fileName).mimeType;

    return {
      fileName: doc.fileName,
      mimeType,
      buffer,
      signedUrl,
    };
  }

  async getDocumentSignedUrl(clinicId: string, patientIdOrCode: string, docId: string, actor?: AuthenticatedUser) {
    const patient = await this.resolvePatient(clinicId, patientIdOrCode);

    const doc = await this.prisma.patientDocument.findFirst({
      where: {
        id: docId,
        clinicId,
        patientId: patient.id,
        ...this.documentScope(actor),
      },
    });

    if (!doc) {
      throw new NotFoundException(`Document "${docId}" not found.`);
    }

    assertDocumentOwnership(doc.fileKey, clinicId, patient.id);
    const signedUrl: string | null = null;

    return {
      id: doc.id,
      fileName: doc.fileName,
      mimeType: doc.mimeType || 'application/octet-stream',
      signedUrl,
      fallbackUrl: `/patients/${patient.patientCode}/documents/${doc.id}/download`,
      previewUrl: `/patients/${patient.patientCode}/documents/${doc.id}/preview`,
    };
  }

  async getAllClinicDocuments(clinicId: string, actor?: AuthenticatedUser) {
    const docs = await this.prisma.patientDocument.findMany({
      where: { clinicId, ...this.documentScope(actor) },
      include: {
        patient: { select: { patientCode: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return docs.map((d) => this.serializeDocument(d, d.patient.patientCode));
  }

  // =========================================================================
  // 3. PATIENT CONSENT RECORDS & PROCEDURE-SPECIFIC TEMPLATES
  // =========================================================================

  private readonly immutableSignedStatuses = new Set([
    'Signed',
    'PATIENT_SIGNED',
    'DENTIST_VERIFIED',
    'COMPLETED',
  ]);

  private computeAge(dateOfBirth?: Date | string | null): number | null {
    if (!dateOfBirth) return null;
    const dob = dateOfBirth instanceof Date ? dateOfBirth : new Date(dateOfBirth);
    if (isNaN(dob.getTime())) return null;
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
    return age >= 0 ? age : null;
  }

  private serializeTemplate(t: any) {
    return {
      id: t.id,
      clinicId: t.clinicId,
      title: t.title,
      procedureType: t.procedureType,
      procedureCategory: t.procedureCategory,
      requiresConsent: t.requiresConsent,
      guardianRequiredForMinors: t.guardianRequiredForMinors,
      description: t.description || '',
      purpose: t.purpose || '',
      benefits: t.benefits || '',
      risks: t.risks || '',
      alternatives: t.alternatives || '',
      refusalConsequences: t.refusalConsequences || '',
      postProcedureInstructions: t.postProcedureInstructions || '',
      patientDeclaration: t.patientDeclaration || '',
      dentistDeclaration: t.dentistDeclaration || '',
      content: t.content || null,
      version: t.version,
      isActive: t.isActive,
      isReviewed: t.isReviewed,
      reviewedBy: t.reviewedBy || null,
      reviewedAt: t.reviewedAt ? t.reviewedAt.toISOString() : null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }

  private serializeConsent(c: any, patientCode?: string) {
    const dRec = c.dateRecorded instanceof Date ? c.dateRecorded : new Date(c.dateRecorded);
    return {
      id: c.id,
      patientId: patientCode || c.patient?.patientCode || c.patientId,
      patientUuid: c.patientId,
      appointmentId: c.appointmentId || null,
      treatmentPlanId: c.treatmentPlanId || null,
      consultationId: c.consultationId || null,
      doctorId: c.doctorId || null,
      doctorName: c.doctorName || null,
      procedureName: c.procedureName || c.consentType,
      toothNumber: c.toothNumber || null,
      treatmentArea: c.treatmentArea || null,
      templateId: c.templateId || null,
      templateVersion: c.templateVersion ?? null,
      documentVersion: c.documentVersion ?? 1,
      replacesConsentId: c.replacesConsentId || null,
      consentType: c.consentType,
      status: c.status,
      dateRecorded: dRec.toISOString().slice(0, 10),
      recordedBy: c.recordedBy,
      documentRef: c.documentRef || '',
      notes: c.notes || '',
      witnessName: c.witnessName || undefined,
      signatureData: c.signatureData || c.patientSignature || undefined,
      consentText: c.consentText || undefined,
      consentContentSnapshot: c.consentContentSnapshot || undefined,
      patientSignature: c.patientSignature || undefined,
      patientSignedAt: c.patientSignedAt ? c.patientSignedAt.toISOString() : undefined,
      patientSignatureMethod: c.patientSignatureMethod || undefined,
      patientAccepted: Boolean(c.patientAccepted),
      guardianName: c.guardianName || undefined,
      guardianRelationship: c.guardianRelationship || undefined,
      guardianAuthorized: Boolean(c.guardianAuthorized),
      guardianSignature: c.guardianSignature || undefined,
      guardianSignedAt: c.guardianSignedAt ? c.guardianSignedAt.toISOString() : undefined,
      dentistSignature: c.dentistSignature || undefined,
      dentistVerifiedBy: c.dentistVerifiedBy || undefined,
      verifiedAt: c.verifiedAt ? c.verifiedAt.toISOString() : undefined,
      declinedReason: c.declinedReason || undefined,
      declinedAt: c.declinedAt ? c.declinedAt.toISOString() : undefined,
      cancelledReason: c.cancelledReason || undefined,
      cancelledAt: c.cancelledAt ? c.cancelledAt.toISOString() : undefined,
      expiresAt: c.expiresAt ? c.expiresAt.toISOString() : undefined,
      evidenceHash: c.evidenceHash || undefined,
      revokedAt: c.revokedAt || undefined,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }

  private async ensureDefaultConsentTemplates(clinicId: string, db: any = this.prisma) {
    if (!db.consentTemplate) return [];
    const existingCount = await db.consentTemplate.count({ where: { clinicId } });
    if (existingCount > 0) return [];

    const created: any[] = [];
    for (const seed of DEFAULT_CONSENT_TEMPLATES) {
      const tpl = await db.consentTemplate.create({
        data: {
          clinicId,
          title: seed.title,
          procedureType: seed.procedureType,
          procedureCategory: seed.procedureCategory,
          requiresConsent: seed.requiresConsent,
          guardianRequiredForMinors: seed.guardianRequiredForMinors,
          description: seed.description,
          purpose: seed.purpose,
          benefits: seed.benefits,
          risks: seed.risks,
          alternatives: seed.alternatives,
          refusalConsequences: seed.refusalConsequences,
          postProcedureInstructions: seed.postProcedureInstructions,
          patientDeclaration: seed.patientDeclaration,
          dentistDeclaration: seed.dentistDeclaration,
          content: {
            aliases: seed.aliases,
            sections: {
              description: seed.description,
              purpose: seed.purpose,
              benefits: seed.benefits,
              risks: seed.risks,
              alternatives: seed.alternatives,
              refusalConsequences: seed.refusalConsequences,
              postProcedureInstructions: seed.postProcedureInstructions,
              patientDeclaration: seed.patientDeclaration,
              dentistDeclaration: seed.dentistDeclaration,
            },
          },
          version: 1,
          isActive: true,
          isReviewed: false,
        },
      });
      created.push(tpl);
    }
    return created;
  }

  async getConsentTemplates(clinicId: string, includeInactive = true) {
    await this.ensureDefaultConsentTemplates(clinicId);
    const templates = await this.prisma.consentTemplate.findMany({
      where: {
        clinicId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ procedureCategory: 'asc' }, { procedureType: 'asc' }, { version: 'desc' }],
    });
    return templates.map((t) => this.serializeTemplate(t));
  }

  async createConsentTemplate(
    clinicId: string,
    dto: CreateConsentTemplateDto,
    actor?: AuthenticatedUser,
  ) {
    const content = {
      sections: {
        description: dto.description || '',
        purpose: dto.purpose || '',
        benefits: dto.benefits || '',
        risks: dto.risks || '',
        alternatives: dto.alternatives || '',
        refusalConsequences: dto.refusalConsequences || '',
        postProcedureInstructions: dto.postProcedureInstructions || '',
        patientDeclaration: dto.patientDeclaration || '',
        dentistDeclaration: dto.dentistDeclaration || '',
      },
    };
    const created = await this.prisma.consentTemplate.create({
      data: {
        clinicId,
        title: dto.title.trim(),
        procedureType: dto.procedureType.trim(),
        procedureCategory: dto.procedureCategory?.trim() || 'Oral Surgery',
        requiresConsent: dto.requiresConsent ?? true,
        guardianRequiredForMinors: dto.guardianRequiredForMinors ?? true,
        description: dto.description?.trim() || null,
        purpose: dto.purpose?.trim() || null,
        benefits: dto.benefits?.trim() || null,
        risks: dto.risks?.trim() || null,
        alternatives: dto.alternatives?.trim() || null,
        refusalConsequences: dto.refusalConsequences?.trim() || null,
        postProcedureInstructions: dto.postProcedureInstructions?.trim() || null,
        patientDeclaration: dto.patientDeclaration?.trim() || null,
        dentistDeclaration: dto.dentistDeclaration?.trim() || null,
        content,
        version: 1,
        isActive: dto.isActive ?? true,
        isReviewed: dto.isReviewed ?? false,
        reviewedBy: dto.isReviewed ? actor?.fullName || actor?.id || 'Admin' : null,
        reviewedAt: dto.isReviewed ? new Date() : null,
      },
    });
    return this.serializeTemplate(created);
  }

  async updateConsentTemplate(
    clinicId: string,
    templateId: string,
    dto: UpdateConsentTemplateDto,
    actor?: AuthenticatedUser,
  ) {
    const existing = await this.prisma.consentTemplate.findFirst({
      where: { id: templateId, clinicId },
    });
    if (!existing) {
      throw new NotFoundException(`Consent template "${templateId}" not found.`);
    }

    const wordingChanged = [
      'title',
      'procedureType',
      'description',
      'purpose',
      'benefits',
      'risks',
      'alternatives',
      'refusalConsequences',
      'postProcedureInstructions',
      'patientDeclaration',
      'dentistDeclaration',
    ].some((key) => (dto as any)[key] !== undefined && (dto as any)[key] !== (existing as any)[key]);

    const nextVersion = wordingChanged ? existing.version + 1 : existing.version;
    const nextSections = {
      description: dto.description !== undefined ? dto.description : existing.description || '',
      purpose: dto.purpose !== undefined ? dto.purpose : existing.purpose || '',
      benefits: dto.benefits !== undefined ? dto.benefits : existing.benefits || '',
      risks: dto.risks !== undefined ? dto.risks : existing.risks || '',
      alternatives: dto.alternatives !== undefined ? dto.alternatives : existing.alternatives || '',
      refusalConsequences: dto.refusalConsequences !== undefined ? dto.refusalConsequences : existing.refusalConsequences || '',
      postProcedureInstructions: dto.postProcedureInstructions !== undefined ? dto.postProcedureInstructions : existing.postProcedureInstructions || '',
      patientDeclaration: dto.patientDeclaration !== undefined ? dto.patientDeclaration : existing.patientDeclaration || '',
      dentistDeclaration: dto.dentistDeclaration !== undefined ? dto.dentistDeclaration : existing.dentistDeclaration || '',
    };

    const existingContent = (existing.content && typeof existing.content === 'object') ? existing.content as Record<string, any> : {};
    const updated = await this.prisma.consentTemplate.update({
      where: { id: templateId },
      data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.procedureType !== undefined ? { procedureType: dto.procedureType.trim() } : {}),
        ...(dto.procedureCategory !== undefined ? { procedureCategory: dto.procedureCategory.trim() } : {}),
        ...(dto.requiresConsent !== undefined ? { requiresConsent: dto.requiresConsent } : {}),
        ...(dto.guardianRequiredForMinors !== undefined ? { guardianRequiredForMinors: dto.guardianRequiredForMinors } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
        ...(dto.purpose !== undefined ? { purpose: dto.purpose.trim() || null } : {}),
        ...(dto.benefits !== undefined ? { benefits: dto.benefits.trim() || null } : {}),
        ...(dto.risks !== undefined ? { risks: dto.risks.trim() || null } : {}),
        ...(dto.alternatives !== undefined ? { alternatives: dto.alternatives.trim() || null } : {}),
        ...(dto.refusalConsequences !== undefined ? { refusalConsequences: dto.refusalConsequences.trim() || null } : {}),
        ...(dto.postProcedureInstructions !== undefined ? { postProcedureInstructions: dto.postProcedureInstructions.trim() || null } : {}),
        ...(dto.patientDeclaration !== undefined ? { patientDeclaration: dto.patientDeclaration.trim() || null } : {}),
        ...(dto.dentistDeclaration !== undefined ? { dentistDeclaration: dto.dentistDeclaration.trim() || null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.isReviewed !== undefined
          ? {
              isReviewed: dto.isReviewed,
              reviewedBy: dto.isReviewed ? actor?.fullName || actor?.id || 'Admin' : null,
              reviewedAt: dto.isReviewed ? new Date() : null,
            }
          : {}),
        version: nextVersion,
        content: { ...existingContent, sections: nextSections },
      },
    });
    return this.serializeTemplate(updated);
  }

  async resolveTemplateForProcedure(
    clinicId: string,
    procedureName?: string | null,
    templateId?: string | null,
    db: any = this.prisma,
  ) {
    if (templateId && db.consentTemplate) {
      const explicit = await db.consentTemplate.findFirst({
        where: { id: templateId, clinicId, isActive: true },
      });
      if (explicit) return explicit;
    }

    const norm = normalizeProcedureKey(procedureName);
    if (!norm) return null;

    if (db.consentTemplate) {
      await this.ensureDefaultConsentTemplates(clinicId, db);
      const templates = await db.consentTemplate.findMany({
        where: { clinicId, isActive: true },
        orderBy: { version: 'desc' },
      });

      // 1. Exact procedureType match
      const exact = templates.find((t: any) => normalizeProcedureKey(t.procedureType) === norm);
      if (exact) return exact.requiresConsent ? exact : null;

      // 2. Alias match in template content
      const byAlias = templates.find((t: any) => {
        const aliases: string[] = Array.isArray((t.content as any)?.aliases) ? (t.content as any).aliases : [];
        return aliases.some((a) => normalizeProcedureKey(a) === norm || norm.includes(normalizeProcedureKey(a)));
      });
      if (byAlias) return byAlias.requiresConsent ? byAlias : null;

      // 3. Catalog fallback match -> find matching clinic template by canonical procedureType
      const catalogMatch = matchDefaultConsentTemplate(procedureName);
      if (catalogMatch) {
        const clinicMatch = templates.find(
          (t: any) => normalizeProcedureKey(t.procedureType) === normalizeProcedureKey(catalogMatch.procedureType),
        );
        if (clinicMatch) return clinicMatch.requiresConsent ? clinicMatch : null;
      }
      return null;
    }

    // Fallback when consentTemplate table is not mocked in legacy unit tests
    const catalogMatch = matchDefaultConsentTemplate(procedureName);
    if (!catalogMatch) return null;
    return {
      id: null,
      version: 1,
      ...catalogMatch,
    };
  }

  private buildConsentSnapshot(params: {
    template: any;
    clinic: any;
    patient: any;
    appointment?: any;
    treatmentPlan?: any;
    consultationId?: string | null;
    procedureName: string;
    doctorName?: string | null;
    toothNumber?: string | null;
    treatmentArea?: string | null;
  }) {
    const { template, clinic, patient, appointment, treatmentPlan, consultationId, procedureName, doctorName, toothNumber, treatmentArea } = params;
    const patientFullName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'Patient';
    const patientAddressParts = [patient.address, patient.city, patient.state, patient.postalCode].filter(Boolean);
    const patientAge = this.computeAge(patient.dateOfBirth);
    const apptDate = appointment?.startTime ? new Date(appointment.startTime).toISOString().slice(0, 10) : null;
    const apptTime = appointment?.startTime
      ? new Date(appointment.startTime).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: clinic?.timezone || 'Asia/Kolkata',
        })
      : null;

    return {
      title: template.title,
      procedureType: template.procedureType,
      procedureCategory: template.procedureCategory || 'Oral Surgery',
      templateVersion: template.version || 1,
      guardianRequiredForMinors: template.guardianRequiredForMinors ?? true,
      clinic: {
        name: clinic?.name || 'DocMatrix Dental Clinic',
        address: [clinic?.address, clinic?.city, clinic?.state].filter(Boolean).join(', ') || null,
        phone: clinic?.phone || null,
      },
      patient: {
        id: patient.patientCode || patient.id,
        name: patientFullName,
        age: patientAge,
        gender: patient.gender || null,
        mobile: patient.mobile ? `${patient.countryCode || '+91'} ${patient.mobile}`.trim() : null,
        address: patientAddressParts.length > 0 ? patientAddressParts.join(', ') : null,
      },
      appointment: {
        id: appointment?.id || null,
        bookingRef: appointment?.bookingRef || null,
        date: apptDate,
        time: apptTime,
        consultationId: consultationId || null,
      },
      procedure: {
        name: procedureName,
        treatmentPlanTitle: treatmentPlan?.title || null,
        treatmentPlanNumber: treatmentPlan?.planNumber || null,
        toothNumber: toothNumber || null,
        treatmentArea: treatmentArea || null,
        dentistName: doctorName || appointment?.doctor?.fullName || null,
      },
      sections: {
        description: template.description || '',
        purpose: template.purpose || '',
        benefits: template.benefits || '',
        risks: template.risks || '',
        alternatives: template.alternatives || '',
        refusalConsequences: template.refusalConsequences || '',
        postProcedureInstructions: template.postProcedureInstructions || '',
        patientDeclaration: template.patientDeclaration || '',
        dentistDeclaration: template.dentistDeclaration || '',
      },
    };
  }

  private renderConsentTextFromSnapshot(snapshot: any): string {
    const s = snapshot.sections || {};
    return [
      snapshot.title,
      `Procedure: ${snapshot.procedure?.name || snapshot.procedureType}`,
      `Patient: ${snapshot.patient?.name} (${snapshot.patient?.id})`,
      s.description ? `Procedure Description:\n${s.description}` : '',
      s.purpose ? `Purpose:\n${s.purpose}` : '',
      s.benefits ? `Expected Benefits:\n${s.benefits}` : '',
      s.risks ? `Risks & Complications:\n${s.risks}` : '',
      s.alternatives ? `Alternatives:\n${s.alternatives}` : '',
      s.refusalConsequences ? `Consequences of Refusing/Delaying:\n${s.refusalConsequences}` : '',
      s.postProcedureInstructions ? `Post-Procedure Instructions:\n${s.postProcedureInstructions}` : '',
      s.patientDeclaration ? `Patient Declaration:\n${s.patientDeclaration}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  async generateConsentForProcedure(
    clinicId: string,
    patientIdOrCode: string,
    dto: GenerateConsentDto,
    actor?: AuthenticatedUser,
    db: any = this.prisma,
  ) {
    const patient = await db.patient.findFirst({
      where: {
        clinicId,
        OR: [{ id: patientIdOrCode }, { patientCode: patientIdOrCode }],
      },
    });
    if (!patient) {
      throw new NotFoundException(`Patient "${patientIdOrCode}" not found in this clinic.`);
    }

    const procedureName = dto.procedureName.trim();
    const template = await this.resolveTemplateForProcedure(clinicId, procedureName, dto.templateId, db);
    if (!template) {
      throw new BadRequestException(`No active consent-required template found for procedure "${procedureName}".`);
    }

    // Prevent duplicate active consent for the same patient, appointment, and procedure
    if (dto.appointmentId) {
      const existing = await db.patientConsent.findFirst({
        where: {
          clinicId,
          patientId: patient.id,
          appointmentId: dto.appointmentId,
          procedureName: { equals: procedureName, mode: 'insensitive' },
          status: { notIn: ['CANCELLED', 'DECLINED', 'EXPIRED', 'Revoked', 'Declined'] },
        },
      });
      if (existing) {
        return this.serializeConsent(existing, patient.patientCode);
      }
    }

    const clinic = await db.clinic?.findUnique?.({ where: { id: clinicId } });
    const appointment = dto.appointmentId
      ? await db.appointment?.findFirst?.({
          where: { id: dto.appointmentId, clinicId },
          include: { doctor: { select: { id: true, fullName: true } } },
        })
      : null;
    const treatmentPlan = dto.treatmentPlanId
      ? await db.treatmentPlan?.findFirst?.({ where: { id: dto.treatmentPlanId, clinicId } })
      : null;

    const snapshot = this.buildConsentSnapshot({
      template,
      clinic,
      patient,
      appointment,
      treatmentPlan,
      consultationId: dto.consultationId || null,
      procedureName,
      doctorName: dto.doctorName || appointment?.doctor?.fullName || null,
      toothNumber: dto.toothNumber || null,
      treatmentArea: dto.treatmentArea || null,
    });
    const consentText = this.renderConsentTextFromSnapshot(snapshot);
    const documentRef = `DMX-CNS-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const status = dto.initialStatus || 'PENDING_SIGNATURE';

    const createRecord = async (tx: any) => {
      const payloadForHash = {
        clinicId,
        patientId: patient.id,
        appointmentId: dto.appointmentId || null,
        procedureName,
        templateId: template.id || null,
        templateVersion: template.version || 1,
        status,
        consentText,
      };
      const evidenceHash = crypto.createHash('sha256').update(JSON.stringify(payloadForHash)).digest('hex');
      const created = await tx.patientConsent.create({
        data: {
          clinicId,
          patientId: patient.id,
          appointmentId: dto.appointmentId || null,
          treatmentPlanId: dto.treatmentPlanId || null,
          consultationId: dto.consultationId || null,
          doctorId: dto.doctorId || appointment?.doctorId || null,
          doctorName: dto.doctorName || appointment?.doctor?.fullName || null,
          procedureName,
          toothNumber: dto.toothNumber || null,
          treatmentArea: dto.treatmentArea || null,
          templateId: template.id || null,
          templateVersion: template.version || 1,
          documentVersion: 1,
          consentType: template.title || procedureName,
          status,
          dateRecorded: new Date(),
          recordedBy: actor?.fullName || 'Automated Booking System',
          documentRef,
          notes: dto.notes?.trim() || null,
          consentText,
          consentContentSnapshot: snapshot,
          evidenceHash,
        },
      });
      await tx.consentRevision.create({
        data: {
          consentId: created.id,
          clinicId,
          actorId: actor?.id || 'system',
          action: 'GENERATED',
          snapshot: JSON.parse(JSON.stringify(created)),
          evidenceHash,
        },
      });
      return this.serializeConsent(created, patient.patientCode);
    };

    if (db === this.prisma && typeof this.prisma.$transaction === 'function') {
      return this.prisma.$transaction((tx) => createRecord(tx));
    }
    return createRecord(db);
  }

  async autoGenerateConsentsForAppointment(
    tx: any,
    clinicId: string,
    appointment: {
      id: string;
      patientId: string;
      doctorId?: string | null;
      doctorName?: string | null;
      treatmentType?: string | null;
      visitType?: string | null;
    },
    actorId?: string,
  ) {
    const rawProcedures = (appointment.treatmentType || appointment.visitType || '')
      .split(/[,;]+/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (rawProcedures.length === 0) return [];

    const generated: any[] = [];
    for (const proc of rawProcedures) {
      const tpl = await this.resolveTemplateForProcedure(clinicId, proc, null, tx);
      if (!tpl) continue;
      const consent = await this.generateConsentForProcedure(
        clinicId,
        appointment.patientId,
        {
          procedureName: proc,
          appointmentId: appointment.id,
          doctorId: appointment.doctorId || undefined,
          doctorName: appointment.doctorName || undefined,
          templateId: tpl.id || undefined,
          initialStatus: 'PENDING_SIGNATURE',
        },
        actorId ? ({ id: actorId, fullName: 'Appointment Booking' } as AuthenticatedUser) : undefined,
        tx,
      );
      generated.push(consent);
    }
    return generated;
  }

  async handleAppointmentCancellation(
    tx: any,
    clinicId: string,
    appointmentId: string,
    reason?: string,
    actorId?: string,
  ) {
    const linked = await tx.patientConsent.findMany({
      where: { clinicId, appointmentId },
    });
    for (const c of linked) {
      if (this.immutableSignedStatuses.has(c.status)) {
        // Never silently overwrite a signed consent
        continue;
      }
      if (c.status === 'CANCELLED') continue;
      const updated = await tx.patientConsent.update({
        where: { id: c.id },
        data: {
          status: 'CANCELLED',
          cancelledReason: reason || 'Appointment cancelled',
          cancelledAt: new Date(),
        },
      });
      await tx.consentRevision.create({
        data: {
          consentId: c.id,
          clinicId,
          actorId: actorId || 'system',
          action: 'CANCELLED_WITH_APPOINTMENT',
          snapshot: JSON.parse(JSON.stringify(updated)),
          evidenceHash: c.evidenceHash || crypto.createHash('sha256').update(JSON.stringify(updated)).digest('hex'),
        },
      });
    }
  }

  async handleAppointmentProcedureChange(
    tx: any,
    clinicId: string,
    appointment: {
      id: string;
      patientId: string;
      doctorId?: string | null;
      doctorName?: string | null;
      treatmentType?: string | null;
    },
    actorId?: string,
  ) {
    const nextProcs = (appointment.treatmentType || '')
      .split(/[,;]+/)
      .map((p) => normalizeProcedureKey(p))
      .filter(Boolean);

    const linked = await tx.patientConsent.findMany({
      where: { clinicId, appointmentId: appointment.id },
    });

    for (const c of linked) {
      const procKey = normalizeProcedureKey(c.procedureName || c.consentType);
      if (!nextProcs.includes(procKey) && !this.immutableSignedStatuses.has(c.status) && c.status !== 'CANCELLED') {
        const updated = await tx.patientConsent.update({
          where: { id: c.id },
          data: {
            status: 'CANCELLED',
            cancelledReason: 'Appointment procedure updated',
            cancelledAt: new Date(),
          },
        });
        await tx.consentRevision.create({
          data: {
            consentId: c.id,
            clinicId,
            actorId: actorId || 'system',
            action: 'CANCELLED_PROCEDURE_CHANGED',
            snapshot: JSON.parse(JSON.stringify(updated)),
            evidenceHash: c.evidenceHash || crypto.createHash('sha256').update(JSON.stringify(updated)).digest('hex'),
          },
        });
      }
    }

    await this.autoGenerateConsentsForAppointment(tx, clinicId, appointment, actorId);
  }

  async backfillUpcomingAppointmentConsents(clinicId: string, patientId?: string) {
    if (!this.prisma.appointment?.findMany) return;
    const upcoming = await this.prisma.appointment.findMany({
      where: {
        clinicId,
        ...(patientId ? { patientId } : {}),
        status: { in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'] },
      },
      include: {
        doctor: { select: { id: true, fullName: true } },
      },
    });

    for (const appt of upcoming) {
      await this.autoGenerateConsentsForAppointment(
        this.prisma,
        clinicId,
        {
          id: appt.id,
          patientId: appt.patientId,
          doctorId: appt.doctorId,
          doctorName: appt.doctor?.fullName || null,
          treatmentType: appt.treatmentType,
          visitType: appt.visitType,
        },
      );
    }
  }

  async getAppointmentConsents(clinicId: string, appointmentId: string) {
    let consents = await this.prisma.patientConsent.findMany({
      where: { clinicId, appointmentId },
      include: { patient: { select: { patientCode: true } } },
      orderBy: { createdAt: 'desc' },
    });
    if (consents.length === 0 && this.prisma.appointment?.findFirst) {
      const appt = await this.prisma.appointment.findFirst({
        where: {
          id: appointmentId,
          clinicId,
          status: { in: ['SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'] },
        },
        include: { doctor: { select: { id: true, fullName: true } } },
      });
      if (appt) {
        await this.autoGenerateConsentsForAppointment(this.prisma, clinicId, {
          id: appt.id,
          patientId: appt.patientId,
          doctorId: appt.doctorId,
          doctorName: appt.doctor?.fullName || null,
          treatmentType: appt.treatmentType,
          visitType: appt.visitType,
        });
        consents = await this.prisma.patientConsent.findMany({
          where: { clinicId, appointmentId },
          include: { patient: { select: { patientCode: true } } },
          orderBy: { createdAt: 'desc' },
        });
      }
    }
    return consents.map((c) => this.serializeConsent(c, c.patient?.patientCode));
  }

  async submitPatientSignature(
    clinicId: string,
    patientIdOrCode: string,
    consentId: string,
    dto: SubmitPatientSignatureDto,
    actor?: AuthenticatedUser,
  ) {
    if (!dto.accepted) {
      throw new BadRequestException('Patient must explicitly review and accept the consent before signing.');
    }
    if (!dto.signatureData?.trim()) {
      throw new BadRequestException('Patient signature image data is required.');
    }
    const patient = await this.resolvePatient(clinicId, patientIdOrCode);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "PatientConsent" WHERE id=${consentId} AND "clinicId"=${clinicId} FOR UPDATE`);
      const existing = await tx.patientConsent.findFirst({
        where: { id: consentId, clinicId, patientId: patient.id },
      });
      if (!existing) throw new NotFoundException('Consent record not found.');
      if (this.immutableSignedStatuses.has(existing.status)) {
        throw new BadRequestException('This consent has already been signed and cannot be overwritten. Create a replacement consent if changes are needed.');
      }
      if (['CANCELLED', 'DECLINED', 'EXPIRED', 'Revoked'].includes(existing.status)) {
        throw new BadRequestException(`Cannot sign a consent with status "${existing.status}".`);
      }

      const signedAt = new Date();
      const method = dto.signatureMethod || 'DRAW_MOUSE';
      const payloadForHash = {
        consentId,
        patientId: patient.id,
        templateVersion: existing.templateVersion,
        documentVersion: existing.documentVersion,
        consentText: existing.consentText,
        patientSignature: dto.signatureData.trim(),
        signedAt: signedAt.toISOString(),
        method,
      };
      const evidenceHash = crypto.createHash('sha256').update(JSON.stringify(payloadForHash)).digest('hex');

      await tx.consentRevision.create({
        data: {
          consentId,
          clinicId,
          actorId: actor?.id || 'patient',
          action: 'BEFORE_PATIENT_SIGN',
          snapshot: JSON.parse(JSON.stringify(existing)),
          evidenceHash: existing.evidenceHash || evidenceHash,
        },
      });

      const updated = await tx.patientConsent.update({
        where: { id: consentId },
        data: {
          status: 'PATIENT_SIGNED',
          patientSignature: dto.signatureData.trim(),
          signatureData: dto.signatureData.trim(),
          patientSignedAt: signedAt,
          patientSignatureMethod: method,
          patientAccepted: true,
          ...(dto.notes !== undefined ? { notes: dto.notes.trim() || existing.notes } : {}),
          evidenceHash,
        },
      });

      await tx.consentRevision.create({
        data: {
          consentId,
          clinicId,
          actorId: actor?.id || 'patient',
          action: 'PATIENT_SIGNED',
          snapshot: JSON.parse(JSON.stringify(updated)),
          evidenceHash,
        },
      });

      return this.serializeConsent(updated, patient.patientCode);
    });
  }

  async submitGuardianSignature(
    clinicId: string,
    patientIdOrCode: string,
    consentId: string,
    dto: SubmitGuardianSignatureDto,
    actor?: AuthenticatedUser,
  ) {
    if (!dto.accepted || !dto.guardianAuthorized) {
      throw new BadRequestException('Guardian authorization and explicit consent acceptance are required.');
    }
    if (!dto.guardianName?.trim() || !dto.guardianRelationship?.trim()) {
      throw new BadRequestException('Guardian name and relationship to patient are required.');
    }
    if (!dto.signatureData?.trim()) {
      throw new BadRequestException('Guardian signature image data is required.');
    }
    const patient = await this.resolvePatient(clinicId, patientIdOrCode);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "PatientConsent" WHERE id=${consentId} AND "clinicId"=${clinicId} FOR UPDATE`);
      const existing = await tx.patientConsent.findFirst({
        where: { id: consentId, clinicId, patientId: patient.id },
      });
      if (!existing) throw new NotFoundException('Consent record not found.');
      if (this.immutableSignedStatuses.has(existing.status)) {
        throw new BadRequestException('This consent has already been signed and cannot be overwritten.');
      }
      if (['CANCELLED', 'DECLINED', 'EXPIRED', 'Revoked'].includes(existing.status)) {
        throw new BadRequestException(`Cannot sign a consent with status "${existing.status}".`);
      }

      const signedAt = new Date();
      const method = dto.signatureMethod || 'DRAW_MOUSE';
      const evidenceHash = crypto
        .createHash('sha256')
        .update(
          JSON.stringify({
            consentId,
            guardianName: dto.guardianName.trim(),
            guardianRelationship: dto.guardianRelationship.trim(),
            guardianSignature: dto.signatureData.trim(),
            signedAt: signedAt.toISOString(),
          }),
        )
        .digest('hex');

      const updated = await tx.patientConsent.update({
        where: { id: consentId },
        data: {
          status: 'PATIENT_SIGNED',
          guardianName: dto.guardianName.trim(),
          guardianRelationship: dto.guardianRelationship.trim(),
          guardianAuthorized: true,
          guardianSignature: dto.signatureData.trim(),
          guardianSignedAt: signedAt,
          patientSignedAt: existing.patientSignedAt || signedAt,
          patientSignatureMethod: existing.patientSignatureMethod || method,
          patientAccepted: true,
          signatureData: existing.signatureData || dto.signatureData.trim(),
          evidenceHash,
        },
      });

      await tx.consentRevision.create({
        data: {
          consentId,
          clinicId,
          actorId: actor?.id || 'guardian',
          action: 'GUARDIAN_SIGNED',
          snapshot: JSON.parse(JSON.stringify(updated)),
          evidenceHash,
        },
      });

      return this.serializeConsent(updated, patient.patientCode);
    });
  }

  async verifyConsentByDentist(
    clinicId: string,
    patientIdOrCode: string,
    consentId: string,
    dto: VerifyConsentDto,
    actor?: AuthenticatedUser,
  ) {
    if (!dto.dentistSignature?.trim()) {
      throw new BadRequestException('Dentist signature or verification approval is required.');
    }
    const patient = await this.resolvePatient(clinicId, patientIdOrCode);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "PatientConsent" WHERE id=${consentId} AND "clinicId"=${clinicId} FOR UPDATE`);
      const existing = await tx.patientConsent.findFirst({
        where: { id: consentId, clinicId, patientId: patient.id },
      });
      if (!existing) throw new NotFoundException('Consent record not found.');
      if (!['PATIENT_SIGNED', 'DENTIST_VERIFIED', 'Signed'].includes(existing.status)) {
        throw new BadRequestException('Patient or guardian signature is required before dentist verification.');
      }
      if (existing.status === 'COMPLETED') {
        throw new BadRequestException('This consent workflow is already completed.');
      }

      const verifiedAt = new Date();
      const nextStatus = dto.markCompleted === false ? 'DENTIST_VERIFIED' : 'COMPLETED';
      const verifierName = actor?.fullName || existing.doctorName || 'Attending Dentist';
      const evidenceHash = crypto
        .createHash('sha256')
        .update(
          JSON.stringify({
            consentId,
            previousHash: existing.evidenceHash,
            dentistSignature: dto.dentistSignature.trim(),
            verifierName,
            verifiedAt: verifiedAt.toISOString(),
            nextStatus,
          }),
        )
        .digest('hex');

      const updated = await tx.patientConsent.update({
        where: { id: consentId },
        data: {
          status: nextStatus,
          dentistSignature: dto.dentistSignature.trim(),
          dentistVerifiedBy: verifierName,
          verifiedAt,
          ...(dto.notes !== undefined ? { notes: dto.notes.trim() || existing.notes } : {}),
          evidenceHash,
        },
      });

      await tx.consentRevision.create({
        data: {
          consentId,
          clinicId,
          actorId: actor?.id || 'dentist',
          action: nextStatus === 'COMPLETED' ? 'COMPLETED' : 'DENTIST_VERIFIED',
          snapshot: JSON.parse(JSON.stringify(updated)),
          evidenceHash,
        },
      });

      return this.serializeConsent(updated, patient.patientCode);
    });
  }

  async declineConsent(
    clinicId: string,
    patientIdOrCode: string,
    consentId: string,
    dto: DeclineConsentDto,
    actor?: AuthenticatedUser,
  ) {
    const patient = await this.resolvePatient(clinicId, patientIdOrCode);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.patientConsent.findFirst({
        where: { id: consentId, clinicId, patientId: patient.id },
      });
      if (!existing) throw new NotFoundException('Consent record not found.');
      if (this.immutableSignedStatuses.has(existing.status)) {
        throw new BadRequestException('A signed consent cannot be declined.');
      }
      const updated = await tx.patientConsent.update({
        where: { id: consentId },
        data: {
          status: 'DECLINED',
          declinedReason: dto.reason?.trim() || 'Patient declined consent',
          declinedAt: new Date(),
        },
      });
      await tx.consentRevision.create({
        data: {
          consentId,
          clinicId,
          actorId: actor?.id || 'unknown',
          action: 'DECLINED',
          snapshot: JSON.parse(JSON.stringify(updated)),
          evidenceHash: existing.evidenceHash || crypto.createHash('sha256').update(JSON.stringify(updated)).digest('hex'),
        },
      });
      return this.serializeConsent(updated, patient.patientCode);
    });
  }

  async cancelConsent(
    clinicId: string,
    patientIdOrCode: string,
    consentId: string,
    dto: CancelConsentDto,
    actor?: AuthenticatedUser,
  ) {
    const patient = await this.resolvePatient(clinicId, patientIdOrCode);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.patientConsent.findFirst({
        where: { id: consentId, clinicId, patientId: patient.id },
      });
      if (!existing) throw new NotFoundException('Consent record not found.');
      if (this.immutableSignedStatuses.has(existing.status)) {
        throw new BadRequestException('Signed consent cannot be silently cancelled. Create a replacement consent or revoke it.');
      }
      const updated = await tx.patientConsent.update({
        where: { id: consentId },
        data: {
          status: 'CANCELLED',
          cancelledReason: dto.reason?.trim() || 'Cancelled by staff',
          cancelledAt: new Date(),
        },
      });
      await tx.consentRevision.create({
        data: {
          consentId,
          clinicId,
          actorId: actor?.id || 'unknown',
          action: 'CANCELLED',
          snapshot: JSON.parse(JSON.stringify(updated)),
          evidenceHash: existing.evidenceHash || crypto.createHash('sha256').update(JSON.stringify(updated)).digest('hex'),
        },
      });
      return this.serializeConsent(updated, patient.patientCode);
    });
  }

  async replaceConsent(
    clinicId: string,
    patientIdOrCode: string,
    consentId: string,
    actor?: AuthenticatedUser,
  ) {
    const patient = await this.resolvePatient(clinicId, patientIdOrCode);
    const existing = await this.prisma.patientConsent.findFirst({
      where: { id: consentId, clinicId, patientId: patient.id },
    });
    if (!existing) throw new NotFoundException('Consent record not found.');

    const procedureName = existing.procedureName || existing.consentType;
    const template = await this.resolveTemplateForProcedure(clinicId, procedureName, existing.templateId);
    const clinic = await this.prisma.clinic.findUnique({ where: { id: clinicId } });
    const appointment = existing.appointmentId
      ? await this.prisma.appointment.findFirst({
          where: { id: existing.appointmentId, clinicId },
          include: { doctor: { select: { id: true, fullName: true } } },
        })
      : null;

    const snapshot = template
      ? this.buildConsentSnapshot({
          template,
          clinic,
          patient,
          appointment,
          consultationId: existing.consultationId,
          procedureName,
          doctorName: existing.doctorName,
          toothNumber: existing.toothNumber,
          treatmentArea: existing.treatmentArea,
        })
      : existing.consentContentSnapshot;
    const consentText = template ? this.renderConsentTextFromSnapshot(snapshot) : existing.consentText;
    const nextDocVersion = (existing.documentVersion || 1) + 1;

    return this.prisma.$transaction(async (tx) => {
      const payloadForHash = {
        replacesConsentId: existing.id,
        documentVersion: nextDocVersion,
        consentText,
      };
      const evidenceHash = crypto.createHash('sha256').update(JSON.stringify(payloadForHash)).digest('hex');
      const created = await tx.patientConsent.create({
        data: {
          clinicId,
          patientId: patient.id,
          appointmentId: existing.appointmentId,
          treatmentPlanId: existing.treatmentPlanId,
          consultationId: existing.consultationId,
          doctorId: existing.doctorId,
          doctorName: existing.doctorName,
          procedureName,
          toothNumber: existing.toothNumber,
          treatmentArea: existing.treatmentArea,
          templateId: template?.id || existing.templateId,
          templateVersion: template?.version || existing.templateVersion || 1,
          documentVersion: nextDocVersion,
          replacesConsentId: existing.id,
          consentType: template?.title || existing.consentType,
          status: 'PENDING_SIGNATURE',
          dateRecorded: new Date(),
          recordedBy: actor?.fullName || 'Clinical Staff',
          documentRef: `DMX-CNS-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
          consentText,
          consentContentSnapshot: snapshot ?? undefined,
          evidenceHash,
        },
      });
      await tx.consentRevision.create({
        data: {
          consentId: created.id,
          clinicId,
          actorId: actor?.id || 'unknown',
          action: 'REPLACED_PREVIOUS_VERSION',
          snapshot: JSON.parse(JSON.stringify(created)),
          evidenceHash,
        },
      });
      return this.serializeConsent(created, patient.patientCode);
    });
  }

  async downloadConsentPdf(clinicId: string, patientIdOrCode: string, consentId: string) {
    const patient = await this.resolvePatient(clinicId, patientIdOrCode);
    const consent = await this.prisma.patientConsent.findFirst({
      where: { id: consentId, clinicId, patientId: patient.id },
    });
    if (!consent) {
      throw new NotFoundException(`Consent record "${consentId}" not found.`);
    }
    const clinic = await this.prisma.clinic.findUnique({ where: { id: clinicId } });
    const snap = (consent.consentContentSnapshot as any) || {};
    const sectionsObj = snap.sections || {};

    const buffer = buildConsentPdfBuffer({
      documentRef: consent.documentRef || consent.id,
      title: snap.title || consent.consentType,
      status: consent.status,
      templateVersion: consent.templateVersion,
      documentVersion: consent.documentVersion,
      clinicName: snap.clinic?.name || clinic?.name || 'DocMatrix Dental Clinic',
      clinicAddress: snap.clinic?.address || clinic?.address || null,
      clinicPhone: snap.clinic?.phone || clinic?.phone || null,
      patientName: snap.patient?.name || `${patient.firstName} ${patient.lastName}`.trim(),
      patientCode: patient.patientCode,
      patientAge: snap.patient?.age ?? this.computeAge(patient.dateOfBirth),
      patientGender: snap.patient?.gender || patient.gender,
      patientMobile: snap.patient?.mobile || patient.mobile,
      patientAddress: snap.patient?.address || patient.address,
      appointmentId: snap.appointment?.bookingRef || consent.appointmentId,
      appointmentDate: snap.appointment?.date || null,
      appointmentTime: snap.appointment?.time || null,
      consultationId: consent.consultationId || snap.appointment?.consultationId || null,
      procedureName: consent.procedureName || consent.consentType,
      treatmentPlanTitle: snap.procedure?.treatmentPlanTitle || null,
      toothOrArea: consent.toothNumber || consent.treatmentArea || null,
      dentistName: consent.doctorName || snap.procedure?.dentistName || null,
      sections: [
        { heading: 'Description of Procedure', body: sectionsObj.description || consent.consentText },
        { heading: 'Purpose of Treatment', body: sectionsObj.purpose },
        { heading: 'Expected Benefits', body: sectionsObj.benefits },
        { heading: 'Common Risks and Complications', body: sectionsObj.risks },
        { heading: 'Alternative Treatment Options', body: sectionsObj.alternatives },
        { heading: 'Consequences of Refusing or Delaying Treatment', body: sectionsObj.refusalConsequences },
        { heading: 'Post-Procedure Instructions', body: sectionsObj.postProcedureInstructions },
        { heading: 'Patient Declaration', body: sectionsObj.patientDeclaration },
        { heading: 'Dentist Declaration', body: sectionsObj.dentistDeclaration },
      ],
      patientSignedAt: consent.patientSignedAt ? consent.patientSignedAt.toISOString() : null,
      patientSignatureMethod: consent.patientSignatureMethod,
      hasPatientSignature: Boolean(consent.patientSignature || consent.signatureData),
      guardianName: consent.guardianName,
      guardianRelationship: consent.guardianRelationship,
      guardianSignedAt: consent.guardianSignedAt ? consent.guardianSignedAt.toISOString() : null,
      hasGuardianSignature: Boolean(consent.guardianSignature),
      dentistVerifiedBy: consent.dentistVerifiedBy,
      verifiedAt: consent.verifiedAt ? consent.verifiedAt.toISOString() : null,
      hasDentistSignature: Boolean(consent.dentistSignature),
      evidenceHash: consent.evidenceHash,
    });

    const safeRef = (consent.documentRef || consent.id).replace(/[^a-zA-Z0-9_-]/g, '_');
    return {
      fileName: `Consent_${safeRef}.pdf`,
      mimeType: 'application/pdf',
      buffer,
    };
  }

  async getConsents(clinicId: string, patientIdOrCode: string) {
    const patient = await this.resolvePatient(clinicId, patientIdOrCode);
    await this.backfillUpcomingAppointmentConsents(clinicId, patient.id);

    const consents = await this.prisma.patientConsent.findMany({
      where: {
        clinicId,
        patientId: patient.id,
      },
      orderBy: { dateRecorded: 'desc' },
    });

    return consents.map((c) => this.serializeConsent(c, patient.patientCode));
  }

  async createConsent(
    clinicId: string,
    patientIdOrCode: string,
    dto: CreateConsentDto,
    userFullName?: string | AuthenticatedUser,
  ) {
    const patient = await this.resolvePatient(clinicId, patientIdOrCode);

    const actorId = typeof userFullName === 'string' ? userFullName : userFullName?.id || 'unknown';
    const recordedBy = typeof userFullName === 'string' ? userFullName : userFullName?.fullName || 'Clinical Staff';
    const signed = dto.status === 'Signed';
    if (signed && (!dto.signatureData?.trim() || !dto.consentText?.trim())) throw new BadRequestException('Signed consent requires the exact consent wording and patient signature evidence.');
    return this.prisma.$transaction(async tx => {
      const data = { clinicId, patientId: patient.id, consentType: dto.consentType.trim(), status: dto.status || 'Pending',
        dateRecorded: dto.dateRecorded ? new Date(dto.dateRecorded) : new Date(), recordedBy,
        documentRef: dto.documentRef?.trim() || `DMX-CNS-${crypto.randomUUID()}`, notes: dto.notes?.trim() || null,
        witnessName: dto.witnessName?.trim() || null, signatureData: dto.signatureData?.trim() || null, consentText: dto.consentText?.trim() || null };
      const evidenceHash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
      const consent = await tx.patientConsent.create({ data: { ...data, evidenceHash } });
      await tx.consentRevision.create({ data: { consentId: consent.id, clinicId, actorId, action: 'CREATED', snapshot: JSON.parse(JSON.stringify(consent)), evidenceHash } });
      return this.serializeConsent(consent, patient.patientCode);
    });
  }

  async getConsent(clinicId: string, patientIdOrCode: string, consentId: string) {
    const patient = await this.resolvePatient(clinicId, patientIdOrCode);

    const consent = await this.prisma.patientConsent.findFirst({
      where: {
        id: consentId,
        clinicId,
        patientId: patient.id,
      },
    });

    if (!consent) {
      throw new NotFoundException(`Consent record "${consentId}" not found for this patient.`);
    }

    return this.serializeConsent(consent, patient.patientCode);
  }

  async updateConsent(clinicId: string, patientIdOrCode: string, consentId: string, dto: UpdateConsentDto, actor?: AuthenticatedUser) {
    const patient = await this.resolvePatient(clinicId, patientIdOrCode);
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "PatientConsent" WHERE id=${consentId} AND "clinicId"=${clinicId} FOR UPDATE`);
      const existing = await tx.patientConsent.findFirst({ where: { id: consentId, clinicId, patientId: patient.id } });
      if (!existing) throw new NotFoundException('Consent not found.');
      if (existing.status === 'Revoked') throw new BadRequestException('Revoked consent is immutable. Create a new consent.');
      if (existing.status === 'Signed' && (dto.status !== 'Revoked' || dto.signatureData !== undefined || dto.notes !== undefined || dto.witnessName !== undefined)) throw new BadRequestException('Signed consent is immutable. Revoke it and record a new consent.');
      if (dto.status === 'Signed' && (!(dto.signatureData || existing.signatureData) || !existing.consentText)) throw new BadRequestException('Signed consent requires exact wording and signature evidence.');
      const evidence = { ...existing, ...dto };
      const evidenceHash = crypto.createHash('sha256').update(JSON.stringify(evidence)).digest('hex');
      // Preserve an existing legacy record before its first managed update.
      await tx.consentRevision.create({ data: { consentId, clinicId, actorId: actor?.id || 'unknown', action: 'BEFORE_CHANGE', snapshot: JSON.parse(JSON.stringify(existing)), evidenceHash: existing.evidenceHash || crypto.createHash('sha256').update(JSON.stringify(existing)).digest('hex') } });
      const updated = await tx.patientConsent.update({ where: { id: consentId }, data: { ...dto, evidenceHash, ...(dto.status === 'Revoked' ? { revokedAt: new Date() } : {}) } });
      await tx.consentRevision.create({ data: { consentId, clinicId, actorId: actor?.id || 'unknown', action: dto.status === 'Revoked' ? 'REVOKED' : 'UPDATED', snapshot: JSON.parse(JSON.stringify(updated)), evidenceHash } });
      return this.serializeConsent(updated, patient.patientCode);
    });
  }
  async deleteConsent(clinicId: string, patientIdOrCode: string, consentId: string, actor?: AuthenticatedUser) {
    await this.updateConsent(clinicId, patientIdOrCode, consentId, { status: 'Revoked' }, actor);
    return { success: true, message: 'Consent revoked. Evidence and history were preserved.' };
  }
  async consentHistory(clinicId: string, patientIdOrCode: string, consentId: string) {
    await this.getConsent(clinicId, patientIdOrCode, consentId);
    return this.prisma.consentRevision.findMany({ where: { clinicId, consentId }, orderBy: { createdAt: 'asc' } });
  }

  async getAllClinicConsents(clinicId: string) {
    await this.backfillUpcomingAppointmentConsents(clinicId);
    const consents = await this.prisma.patientConsent.findMany({
      where: { clinicId },
      include: {
        patient: { select: { patientCode: true } },
      },
      orderBy: { dateRecorded: 'desc' },
    });

    return consents.map((c) => this.serializeConsent(c, c.patient.patientCode));
  }
}

