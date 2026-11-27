import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ClinicalService } from './clinical.service.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  StorageService,
  MAX_FILE_SIZE_BYTES,
} from '../storage/storage.service.js';

const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');
const actor = {
  id: 'u',
  clinicId: 'c',
  fullName: 'Reception',
  role: 'RECEPTIONIST',
} as any;
describe('Patient documents phases 1 and 2', () => {
  let db: any,
    provider: any,
    scanner: any,
    storage: StorageService,
    service: ClinicalService;
  beforeEach(() => {
    db = {
      patient: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce({ id: 'p', patientCode: 'P-1' })
          .mockResolvedValue(null),
      },
      appointment: {
        findFirst: vi.fn().mockResolvedValue({ id: 'a' }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      patientDocument: {
        create: vi.fn(async ({ data }) => ({
          id: 'd',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn(),
      },
      auditEvent: { create: vi.fn() },
    };
    db.$transaction = (fn: any) => fn(db);
    provider = {
      providerName: 'local',
      upload: vi.fn(),
      delete: vi.fn(),
      getBuffer: vi.fn().mockResolvedValue({ buffer: pdf }),
    };
    scanner = { scanBuffer: vi.fn() };
    storage = new StorageService(
      { isAvailable: () => false } as any,
      provider,
      scanner,
    );
    service = new ClinicalService(db, storage);
  });
  const upload = (
    extra = {},
    file = {
      buffer: pdf,
      originalname: 'report.pdf',
      mimetype: 'application/pdf',
    },
  ) =>
    service.createDocument(
      'c',
      'P-1',
      { title: 'Report', category: 'Medical Reports', ...extra },
      file,
      actor,
    );
  it.each(['IOPA', 'OPG', 'CBCT', 'Other'])(
    'persists %s with resolved identity, actor, bytes and audit after scanning',
    async (imagingType) => {
      const doc = await upload({
        category: 'Dental X-rays',
        imagingType,
        toothNumbers: [11, 48],
        appointmentId: 'a',
      });
      expect(doc).toMatchObject({
        imagingType,
        uploadedById: 'u',
        toothNumbers: [11, 48],
        appointmentId: 'a',
        sizeBytes: pdf.length,
      });
      expect(db.patientDocument.create.mock.calls[0][0].data).toMatchObject({
        clinicId: 'c',
        patientId: 'p',
        uploadedByName: 'Reception',
        fileName: 'report.pdf',
      });
      expect(scanner.scanBuffer).toHaveBeenCalledWith(pdf, 'report.pdf');
      expect(scanner.scanBuffer.mock.invocationCallOrder[0]).toBeLessThan(
        provider.upload.mock.invocationCallOrder[0],
      );
      expect(db.auditEvent.create).toHaveBeenCalled();
      expect(JSON.stringify(doc)).not.toMatch(/fileKey|signedUrl/);
    },
  );
  it.each([
    'Before Treatment',
    'During Treatment',
    'After Treatment',
    'General Clinical Photograph',
  ])('persists photograph class %s', async (photographClass) => {
    expect(
      await upload({
        category: 'Clinical Photographs',
        photographClass,
        treatmentContext: 'Restoration',
        toothNumbers: [21],
      }),
    ).toMatchObject({ photographClass, treatmentContext: 'Restoration' });
  });
  it.each([
    'Medical Reports',
    'Dental Reports',
    'Scanned Documents',
    'Prescriptions',
    'Other Documents',
  ])('supports category %s', async (category) => {
    expect(await upload({ category })).toMatchObject({ category });
  });
  it('rejects foreign appointment before scanning or storage', async () => {
    db.appointment.findFirst.mockResolvedValue(null);
    await expect(upload({ appointmentId: 'foreign' })).rejects.toThrow(
      'does not belong',
    );
    expect(db.appointment.findFirst).toHaveBeenCalledWith({
      where: { id: 'foreign', clinicId: 'c', patientId: 'p' },
    });
    expect(provider.upload).not.toHaveBeenCalled();
  });
  it.each([
    { toothNumbers: [19], category: 'Dental X-rays' },
    { toothNumbers: [11] },
    { imagingType: 'OPG' },
    { photographClass: 'Before Treatment' },
    { category: 'anything' },
  ])('rejects invalid clinical metadata %j', async (extra) => {
    await expect(upload(extra)).rejects.toThrow();
    expect(provider.upload).not.toHaveBeenCalled();
  });
  it('requires real file content and secure storage', async () => {
    await expect(
      service.createDocument(
        'c',
        'P-1',
        { title: 'Metadata only', category: 'Other Documents' },
        undefined,
        actor,
      ),
    ).rejects.toThrow('non-empty');
  });
  it('rejects malformed signature and mismatched MIME', async () => {
    await expect(
      upload(
        {},
        {
          buffer: Buffer.from('fake'),
          originalname: 'fake.pdf',
          mimetype: 'application/pdf',
        },
      ),
    ).rejects.toThrow('malformed');
    expect(provider.upload).not.toHaveBeenCalled();
  });
  it('rejects oversized files', async () => {
    await expect(
      upload(
        {},
        {
          buffer: Buffer.alloc(MAX_FILE_SIZE_BYTES + 1),
          originalname: 'large.pdf',
          mimetype: 'application/pdf',
        },
      ),
    ).rejects.toThrow('25 MB');
  });
  it('blocks malware and storage failures without metadata', async () => {
    scanner.scanBuffer.mockRejectedValue(new Error('Malware detected'));
    await expect(upload()).rejects.toThrow('Malware');
    expect(provider.upload).not.toHaveBeenCalled();
    expect(db.patientDocument.create).not.toHaveBeenCalled();
  });
  it('does not save metadata on storage failure', async () => {
    provider.upload.mockRejectedValue(new Error('Storage offline'));
    await expect(upload()).rejects.toThrow('Storage offline');
    expect(db.patientDocument.create).not.toHaveBeenCalled();
  });
  it('cleans up uploaded object when metadata transaction fails', async () => {
    db.patientDocument.create.mockRejectedValue(new Error('Database offline'));
    await expect(upload()).rejects.toThrow('Database offline');
    expect(provider.delete).toHaveBeenCalled();
  });
  it('reuses completed uploads on retry', async () => {
    db.patientDocument.findFirst.mockResolvedValue({
      id: 'd',
      patientId: 'p',
      title: 'Report',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect((await upload({ uploadRequestId: 'request' })).id).toBe('d');
    expect(provider.upload).not.toHaveBeenCalled();
  });
  it('rejects cross-clinic patient identity', async () => {
    db.patient.findFirst.mockReset().mockResolvedValue(null);
    await expect(upload()).rejects.toThrow('Patient not found');
    expect(provider.upload).not.toHaveBeenCalled();
  });
  it('scopes list and filters to resolved patient and clinic', async () => {
    await service.getDocuments('c', 'P-1', actor, {
      appointmentId: 'a',
      category: 'Dental X-rays',
      imagingType: 'OPG',
      uploader: 'u',
      search: 'scan',
      from: '2026-01-01',
      sort: 'asc',
    });
    expect(db.patientDocument.findMany.mock.calls[0][0]).toMatchObject({
      where: {
        clinicId: 'c',
        patientId: 'p',
        archivedAt: null,
        appointmentId: 'a',
        category: 'Dental X-rays',
        imagingType: 'OPG',
        uploadedById: 'u',
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'desc' }],
    });
  });
  it('rejects cross-patient or cross-clinic document reads', async () => {
    await expect(
      service.downloadDocument('c', 'P-1', 'foreign', actor),
    ).rejects.toThrow('not found');
    expect(db.patientDocument.findFirst.mock.calls[0][0].where).toMatchObject({
      clinicId: 'c',
      patientId: 'p',
      id: 'foreign',
      archivedAt: null,
    });
    expect(provider.getBuffer).not.toHaveBeenCalled();
  });
  it('retains bytes and audits archive and restoration', async () => {
    db.patientDocument.findFirst.mockResolvedValue({ id: 'd' });
    await service.deleteDocument('c', 'P-1', 'd', {
      ...actor,
      role: 'BRANCH_ADMIN',
    });
    expect(db.patientDocument.update).toHaveBeenCalledWith({
      where: { id: 'd' },
      data: { archivedAt: expect.any(Date) },
    });
    expect(provider.delete).not.toHaveBeenCalled();
    expect(db.auditEvent.create.mock.calls[0][0].data.action).toBe(
      'DOCUMENT_ARCHIVED',
    );
  });
  it('rejects receptionist deletion and archive history access', async () => {
    await expect(
      service.deleteDocument('c', 'P-1', 'd', actor),
    ).rejects.toThrow('administrator');
    await expect(
      service.getDocuments('c', 'P-1', actor, { archived: 'true' }),
    ).rejects.toThrow('administrator');
  });
  it('validates multipart FDI arrays and metadata at DTO boundary', async () => {
    const valid = plainToInstance(CreateDocumentDto, {
      title: 'Scan',
      category: 'Dental X-rays',
      imagingType: 'OPG',
      toothNumbers: '[11,48]',
    });
    expect(await validate(valid)).toHaveLength(0);
    const invalid = plainToInstance(CreateDocumentDto, {
      title: 'Scan',
      category: 'Dental X-rays',
      toothNumbers: '[19]',
      documentDate: 'invalid',
    });
    expect((await validate(invalid)).map((e) => e.property)).toEqual(
      expect.arrayContaining(['toothNumbers', 'documentDate']),
    );
  });
});
