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
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { CreateConsentDto } from './dto/create-consent.dto.js';
import { UpdateConsentDto } from './dto/update-consent.dto.js';
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

  private readonly intakeDocumentCategories = ['Identification', 'Consent', 'Referral'];

  private documentScope(actor?: AuthenticatedUser) {
    return actor?.role === 'RECEPTIONIST' && !actor.isPlatformAdmin
      ? { category: { in: this.intakeDocumentCategories } }
      : {};
  }

  private serializeDocument(doc: any, patientCode?: string, signedUrl?: string | null) {
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
      downloadUrl: `/patients/${code}/documents/${doc.id}/download`,
      previewUrl: `/patients/${code}/documents/${doc.id}/preview`,
      signedUrl: signedUrl || undefined,
      createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : new Date(doc.createdAt).toISOString(),
      updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : new Date(doc.updatedAt).toISOString(),
    };
  }

  async getDocuments(clinicId: string, patientIdOrCode: string, actor?: AuthenticatedUser) {
    const patient = await this.resolvePatient(clinicId, patientIdOrCode);

    const docs = await this.prisma.patientDocument.findMany({
      where: {
        clinicId,
        patientId: patient.id,
        ...this.documentScope(actor),
      },
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      docs.map(async (d) => {
        assertDocumentOwnership(d.fileKey, clinicId, patient.id);
        let signedUrl: string | null = null;
        if (this.storageService && this.storageService.isCloudStorageEnabled() && (d.fileKey.startsWith('clinics/') || d.fileKey.startsWith(`${clinicId}/`))) {
          try {
            signedUrl = await this.storageService.getSignedDownloadUrl(d.fileKey, d.fileName, 900);
          } catch {}
        }
        return this.serializeDocument(d, patient.patientCode, signedUrl);
      }),
    );
  }

  async createDocument(
    clinicId: string,
    patientIdOrCode: string,
    dto: CreateDocumentDto,
    file?: any,
    actor?: AuthenticatedUser,
  ) {
    if (actor?.role === 'RECEPTIONIST' && !actor.isPlatformAdmin &&
        !this.intakeDocumentCategories.includes(dto.category.trim())) {
      throw new ForbiddenException('Receptionists may upload only Identification, Consent or Referral documents.');
    }
    const patient = await this.resolvePatient(clinicId, patientIdOrCode);

    let fileBuffer: Buffer | null = null;
    const originalName = file?.originalname || dto.fileName || `${dto.title.trim().toLowerCase().replace(/\s+/g, '_')}.bin`;
    const claimedMime = file?.mimetype || dto.mimeType;

    if (file?.buffer) {
      fileBuffer = file.buffer;
    } else if (dto.contentBase64) {
      fileBuffer = Buffer.from(dto.contentBase64, 'base64');
    }

    let fileKey: string;
    let finalFileName = originalName;
    let finalFileSize = dto.fileSize || '1.0 MB';
    let finalMimeType = claimedMime || 'application/octet-stream';

    if (fileBuffer && fileBuffer.length > 0) {
      if (this.storageService) {
        const uploadResult = await this.storageService.uploadPatientDocument({
          clinicId,
          patientId: patient.id,
          category: dto.category,
          buffer: fileBuffer,
          originalFilename: originalName,
          claimedMimeType: claimedMime,
          doctorName: dto.doctorName,
        });
        fileKey = uploadResult.fileKey;
        finalFileName = uploadResult.fileName;
        finalFileSize = uploadResult.fileSize;
        finalMimeType = uploadResult.mimeType;
      } else {
        const ext = path.extname(originalName) || '.dcm';
        fileKey = `clinics/${clinicId}/patients/${patient.id}/${Date.now()}-${crypto.randomUUID()}${ext}`;
        const clinicDir = path.join(this.storageRoot, clinicId);
        if (!fs.existsSync(clinicDir)) fs.mkdirSync(clinicDir, { recursive: true });
        fs.writeFileSync(path.join(clinicDir, path.basename(fileKey)), fileBuffer);
        finalFileSize = `${(fileBuffer.length / (1024 * 1024)).toFixed(1)} MB`;
      }
    } else {
      const ext = path.extname(originalName) || '.dcm';
      fileKey = `clinics/${clinicId}/patients/${patient.id}/${Date.now()}-${crypto.randomUUID()}${ext}`;
    }

    const doc = await this.prisma.patientDocument.create({
      data: {
        clinicId,
        patientId: patient.id,
        title: dto.title.trim(),
        category: dto.category.trim(),
        fileName: finalFileName,
        fileSize: finalFileSize,
        fileKey,
        mimeType: finalMimeType,
        doctorName: dto.doctorName?.trim() || null,
        notes: dto.notes?.trim() || null,
      },
    });

    let signedUrl: string | null = null;
    if (this.storageService && fileBuffer && this.storageService.isCloudStorageEnabled()) {
      try {
        signedUrl = await this.storageService.getSignedDownloadUrl(fileKey, finalFileName, 900);
      } catch {}
    }

    return this.serializeDocument(doc, patient.patientCode, signedUrl);
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
    let signedUrl: string | null = null;
    if (this.storageService && this.storageService.isCloudStorageEnabled() && (doc.fileKey.startsWith('clinics/') || doc.fileKey.startsWith(`${clinicId}/`))) {
      try {
        signedUrl = await this.storageService.getSignedDownloadUrl(doc.fileKey, doc.fileName, 900);
      } catch {}
    }

    return this.serializeDocument(doc, patient.patientCode, signedUrl);
  }

  async deleteDocument(clinicId: string, patientIdOrCode: string, docId: string) {
    const patient = await this.resolvePatient(clinicId, patientIdOrCode);

    const doc = await this.prisma.patientDocument.findFirst({
      where: {
        id: docId,
        clinicId,
        patientId: patient.id,
      },
    });

    if (!doc) {
      throw new NotFoundException(`Document "${docId}" not found for this patient.`);
    }

    await this.prisma.patientDocument.delete({
      where: { id: doc.id },
    });

    if (this.storageService) {
      try {
        await this.storageService.deleteDocument(doc.fileKey);
      } catch {}
    }

    try {
      const filePath = path.join(this.storageRoot, clinicId, path.basename(doc.fileKey));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {}

    return { success: true, message: 'Document deleted successfully.' };
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
      if (this.storageService.isCloudStorageEnabled() && (doc.fileKey.startsWith('clinics/') || doc.fileKey.startsWith(`${clinicId}/`))) {
        try {
          signedUrl = await this.storageService.getSignedDownloadUrl(doc.fileKey, doc.fileName, 900);
        } catch {}
      }

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
    let signedUrl: string | null = null;
    if (this.storageService && this.storageService.isCloudStorageEnabled() && (doc.fileKey.startsWith('clinics/') || doc.fileKey.startsWith(`${clinicId}/`))) {
      try {
        signedUrl = await this.storageService.getSignedDownloadUrl(doc.fileKey, doc.fileName, 900);
      } catch {}
    }

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
  // 3. PATIENT CONSENT RECORDS
  // =========================================================================

  private serializeConsent(c: any, patientCode?: string) {
    const dRec = c.dateRecorded instanceof Date ? c.dateRecorded : new Date(c.dateRecorded);
    return {
      id: c.id,
      patientId: patientCode || c.patient?.patientCode || c.patientId,
      consentType: c.consentType,
      status: c.status,
      dateRecorded: dRec.toISOString().slice(0, 10),
      recordedBy: c.recordedBy,
      documentRef: c.documentRef || '',
      notes: c.notes || '',
      witnessName: c.witnessName || undefined, consentText: c.consentText || undefined, evidenceHash: c.evidenceHash || undefined, revokedAt: c.revokedAt || undefined,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }

  async getConsents(clinicId: string, patientIdOrCode: string) {
    const patient = await this.resolvePatient(clinicId, patientIdOrCode);

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

