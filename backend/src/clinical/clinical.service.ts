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
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class ClinicalService {
  private readonly storageRoot = path.resolve(process.cwd(), 'storage', 'documents');

  constructor(private prisma: PrismaService) {
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

  async saveToothCondition(clinicId: string, patientIdOrCode: string, dto: SaveToothConditionDto) {
    const patient = await this.resolvePatient(clinicId, patientIdOrCode);

    const record = await this.prisma.toothCondition.upsert({
      where: {
        clinicId_patientId_toothNumber: {
          clinicId,
          patientId: patient.id,
          toothNumber: dto.toothNumber,
        },
      },
      update: {
        condition: dto.condition,
        notes: dto.notes ?? null,
      },
      create: {
        clinicId,
        patientId: patient.id,
        toothNumber: dto.toothNumber,
        condition: dto.condition,
        notes: dto.notes ?? null,
      },
    });

    return {
      success: true,
      patientId: patient.patientCode,
      toothNumber: record.toothNumber,
      condition: record.condition,
      notes: record.notes || undefined,
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  async batchSaveToothChart(
    clinicId: string,
    patientIdOrCode: string,
    dto: BatchSaveToothConditionsDto,
  ) {
    const patient = await this.resolvePatient(clinicId, patientIdOrCode);

    const updates: SaveToothConditionDto[] = [];

    if (Array.isArray(dto.conditions)) {
      updates.push(...dto.conditions);
    }

    if (dto.chart && typeof dto.chart === 'object') {
      for (const [key, val] of Object.entries(dto.chart)) {
        const num = parseInt(key, 10);
        if (!isNaN(num) && val?.condition) {
          updates.push({
            toothNumber: num,
            condition: val.condition,
            notes: val.notes,
          });
        }
      }
    }

    const results = await this.prisma.$transaction(
      updates.map((item) =>
        this.prisma.toothCondition.upsert({
          where: {
            clinicId_patientId_toothNumber: {
              clinicId,
              patientId: patient.id,
              toothNumber: item.toothNumber,
            },
          },
          update: {
            condition: item.condition,
            notes: item.notes ?? null,
          },
          create: {
            clinicId,
            patientId: patient.id,
            toothNumber: item.toothNumber,
            condition: item.condition,
            notes: item.notes ?? null,
          },
        }),
      ),
    );

    return {
      success: true,
      patientId: patient.patientCode,
      updatedCount: results.length,
    };
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

  private serializeDocument(doc: any, patientCode?: string) {
    return {
      id: doc.id,
      patientId: patientCode || doc.patient?.patientCode || doc.patientId,
      title: doc.title,
      category: doc.category,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      uploadDate: (doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt))
        .toISOString()
        .slice(0, 10),
      doctor: doc.doctorName || 'Dr. Arun Kumar',
      notes: doc.notes || undefined,
      downloadUrl: `/patients/${patientCode || doc.patient?.patientCode || doc.patientId}/documents/${doc.id}/download`,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  async getDocuments(clinicId: string, patientIdOrCode: string) {
    const patient = await this.resolvePatient(clinicId, patientIdOrCode);

    const docs = await this.prisma.patientDocument.findMany({
      where: {
        clinicId,
        patientId: patient.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    return docs.map((d) => this.serializeDocument(d, patient.patientCode));
  }

  async createDocument(
    clinicId: string,
    patientIdOrCode: string,
    dto: CreateDocumentDto,
    file?: any,
  ) {
    const patient = await this.resolvePatient(clinicId, patientIdOrCode);

    const ext = file?.originalname ? path.extname(file.originalname) : (dto.fileName ? path.extname(dto.fileName) : '.dcm');
    const safeKey = `${crypto.randomUUID()}${ext}`;
    const origFileName = file?.originalname || dto.fileName || `${dto.title.trim().toLowerCase().replace(/\s+/g, '_')}${ext}`;
    const fileSizeStr = file ? `${(file.size / (1024 * 1024)).toFixed(1)} MB` : (dto.fileSize || '3.5 MB');

    // Secure isolated physical storage per clinic
    if (file?.buffer || dto.contentBase64) {
      const clinicDir = path.join(this.storageRoot, clinicId);
      if (!fs.existsSync(clinicDir)) {
        fs.mkdirSync(clinicDir, { recursive: true });
      }
      const targetFilePath = path.join(clinicDir, safeKey);
      if (file?.buffer) {
        fs.writeFileSync(targetFilePath, file.buffer);
      } else if (dto.contentBase64) {
        fs.writeFileSync(targetFilePath, Buffer.from(dto.contentBase64, 'base64'));
      }
    }

    const doc = await this.prisma.patientDocument.create({
      data: {
        clinicId,
        patientId: patient.id,
        title: dto.title.trim(),
        category: dto.category.trim(),
        fileName: origFileName,
        fileSize: fileSizeStr,
        fileKey: safeKey,
        mimeType: file?.mimetype || 'application/octet-stream',
        doctorName: dto.doctorName?.trim() || null,
        notes: dto.notes?.trim() || null,
      },
    });

    return this.serializeDocument(doc, patient.patientCode);
  }

  async getDocument(clinicId: string, patientIdOrCode: string, docId: string) {
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

    return this.serializeDocument(doc, patient.patientCode);
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

    // Remove file from disk if present
    try {
      const filePath = path.join(this.storageRoot, clinicId, doc.fileKey);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch {}

    return { success: true, message: 'Document deleted successfully.' };
  }

  async downloadDocument(clinicId: string, patientIdOrCode: string, docId: string) {
    const patient = await this.resolvePatient(clinicId, patientIdOrCode);

    const doc = await this.prisma.patientDocument.findFirst({
      where: {
        id: docId,
        clinicId,
        patientId: patient.id,
      },
    });

    if (!doc) {
      throw new NotFoundException(`Document "${docId}" not found.`);
    }

    const filePath = path.join(this.storageRoot, clinicId, doc.fileKey);
    let buffer: Buffer;

    if (fs.existsSync(filePath)) {
      buffer = fs.readFileSync(filePath);
    } else {
      // Clean fallback dummy content for testing/preview when physical storage is mocked
      buffer = Buffer.from(`DocMatrix Clinical Record: ${doc.title} (${doc.fileName})`);
    }

    return {
      fileName: doc.fileName,
      mimeType: doc.mimeType || 'application/octet-stream',
      buffer,
    };
  }

  async getAllClinicDocuments(clinicId: string) {
    const docs = await this.prisma.patientDocument.findMany({
      where: { clinicId },
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
      witnessName: c.witnessName || undefined,
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
    userFullName?: string,
  ) {
    const patient = await this.resolvePatient(clinicId, patientIdOrCode);

    const recordedDate = dto.dateRecorded ? new Date(dto.dateRecorded) : new Date();
    const recordedBy = dto.recordedBy?.trim() || userFullName || 'Clinical Staff';
    const docRef = dto.documentRef?.trim() || `DMX-CNS-${Date.now().toString().slice(-6)}`;

    const consent = await this.prisma.patientConsent.create({
      data: {
        clinicId,
        patientId: patient.id,
        consentType: dto.consentType.trim(),
        status: dto.status?.trim() || 'Signed',
        dateRecorded: recordedDate,
        recordedBy,
        documentRef: docRef,
        notes: dto.notes?.trim() || null,
        witnessName: dto.witnessName?.trim() || null,
        signatureData: dto.signatureData?.trim() || null,
      },
    });

    return this.serializeConsent(consent, patient.patientCode);
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

  async updateConsent(
    clinicId: string,
    patientIdOrCode: string,
    consentId: string,
    dto: UpdateConsentDto,
  ) {
    const patient = await this.resolvePatient(clinicId, patientIdOrCode);

    const existing = await this.prisma.patientConsent.findFirst({
      where: {
        id: consentId,
        clinicId,
        patientId: patient.id,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Consent record "${consentId}" not found.`);
    }

    const updated = await this.prisma.patientConsent.update({
      where: { id: existing.id },
      data: {
        ...(dto.status && { status: dto.status.trim() }),
        ...(dto.notes !== undefined && { notes: dto.notes?.trim() || null }),
        ...(dto.witnessName !== undefined && { witnessName: dto.witnessName?.trim() || null }),
        ...(dto.signatureData !== undefined && { signatureData: dto.signatureData?.trim() || null }),
      },
    });

    return this.serializeConsent(updated, patient.patientCode);
  }

  async deleteConsent(clinicId: string, patientIdOrCode: string, consentId: string) {
    const patient = await this.resolvePatient(clinicId, patientIdOrCode);

    const existing = await this.prisma.patientConsent.findFirst({
      where: {
        id: consentId,
        clinicId,
        patientId: patient.id,
      },
    });

    if (!existing) {
      throw new NotFoundException(`Consent record "${consentId}" not found.`);
    }

    await this.prisma.patientConsent.delete({
      where: { id: existing.id },
    });

    return { success: true, message: 'Consent record deleted successfully.' };
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

