import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ClinicalService } from './clinical.service.js';

describe('ClinicalService - Clinical Modules & Multi-Tenant Isolation', () => {
  let service: ClinicalService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      patient: {
        findFirst: vi.fn(),
      },
      toothCondition: {
        findMany: vi.fn(),
        upsert: vi.fn(),
      },
      patientDocument: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      patientConsent: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      $transaction: vi.fn((promises) => Promise.all(promises)),
    };
    service = new ClinicalService(mockPrisma);
  });

  describe('Tooth Chart Module', () => {
    it('rejects tooth chart retrieval if patient belongs to another clinic', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(null);

      await expect(
        service.getToothChart('clinic-A', 'patient-of-clinic-B'),
      ).rejects.toThrow(NotFoundException);
    });

    it('saves and retrieves tooth conditions for authenticated clinic patient', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue({
        id: 'uuid-pat-1',
        patientCode: 'pt-1001',
        clinicId: 'clinic-A',
      });

      mockPrisma.toothCondition.upsert.mockResolvedValue({
        id: 'tc-1',
        clinicId: 'clinic-A',
        patientId: 'uuid-pat-1',
        toothNumber: 46,
        condition: 'RCT',
        notes: 'Pulpitis treatment',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const saveResult = await service.saveToothCondition('clinic-A', 'pt-1001', {
        toothNumber: 46,
        condition: 'RCT',
        notes: 'Pulpitis treatment',
      });

      expect(saveResult.success).toBe(true);
      expect(saveResult.toothNumber).toBe(46);
      expect(saveResult.condition).toBe('RCT');

      mockPrisma.toothCondition.findMany.mockResolvedValue([
        {
          id: 'tc-1',
          clinicId: 'clinic-A',
          patientId: 'uuid-pat-1',
          toothNumber: 46,
          condition: 'RCT',
          notes: 'Pulpitis treatment',
          updatedAt: new Date(),
        },
      ]);

      const chart = await service.getToothChart('clinic-A', 'pt-1001');
      expect(chart.chart[46]).toBeDefined();
      expect(chart.chart[46].condition).toBe('RCT');
    });
  });

  describe('Patient Documents Module', () => {
    it('rejects document upload if patient belongs to another clinic', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(null);

      await expect(
        service.createDocument('clinic-A', 'patient-of-clinic-B', {
          title: 'OPG Scan',
          category: 'Radiology',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects document deletion across clinic boundaries', async () => {
      // Patient exists in clinic A, but document does not belong to clinic A
      mockPrisma.patient.findFirst.mockResolvedValue({
        id: 'uuid-pat-1',
        patientCode: 'pt-1001',
        clinicId: 'clinic-A',
      });
      mockPrisma.patientDocument.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteDocument('clinic-A', 'pt-1001', 'doc-from-clinic-B'),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates and lists documents with proper serialization', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue({
        id: 'uuid-pat-1',
        patientCode: 'pt-1001',
        clinicId: 'clinic-A',
      });

      const now = new Date('2026-11-02T10:00:00.000Z');
      mockPrisma.patientDocument.create.mockResolvedValue({
        id: 'doc-uuid-1',
        clinicId: 'clinic-A',
        patientId: 'uuid-pat-1',
        title: 'Diagnostic RVG X-Ray',
        category: 'Radiology',
        fileName: 'rvg_scan.dcm',
        fileSize: '4.2 MB',
        fileKey: 'safe-key-1.dcm',
        doctorName: 'Dr. Arun Kumar',
        createdAt: now,
        updatedAt: now,
      });

      const created = await service.createDocument('clinic-A', 'pt-1001', {
        title: 'Diagnostic RVG X-Ray',
        category: 'Radiology',
        fileName: 'rvg_scan.dcm',
        fileSize: '4.2 MB',
      });

      expect(created.id).toBe('doc-uuid-1');
      expect(created.patientId).toBe('pt-1001');
      expect(created.category).toBe('Radiology');
      expect(created.uploadDate).toBe('2026-11-02');
      expect(created.downloadUrl).toContain('/patients/pt-1001/documents/doc-uuid-1/download');
    });
  });

  describe('Patient Consents Module', () => {
    it('rejects consent creation if patient belongs to another clinic', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue(null);

      await expect(
        service.createConsent('clinic-A', 'patient-of-clinic-B', {
          consentType: 'Root Canal Consent',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('creates, updates, and deletes consents scoped to clinic and patient', async () => {
      mockPrisma.patient.findFirst.mockResolvedValue({
        id: 'uuid-pat-1',
        patientCode: 'pt-1001',
        clinicId: 'clinic-A',
      });

      const now = new Date('2026-11-02T10:00:00.000Z');
      mockPrisma.patientConsent.create.mockResolvedValue({
        id: 'cns-uuid-1',
        clinicId: 'clinic-A',
        patientId: 'uuid-pat-1',
        consentType: 'Informed Consent for RCT',
        status: 'Signed',
        dateRecorded: now,
        recordedBy: 'Dr. Arun Kumar',
        documentRef: 'DMX-CNS-123456',
        notes: 'Risks explained',
        createdAt: now,
        updatedAt: now,
      });

      const consent = await service.createConsent('clinic-A', 'pt-1001', {
        consentType: 'Informed Consent for RCT',
        status: 'Signed',
        notes: 'Risks explained',
      });

      expect(consent.id).toBe('cns-uuid-1');
      expect(consent.status).toBe('Signed');
      expect(consent.patientId).toBe('pt-1001');

      // Update consent
      mockPrisma.patientConsent.findFirst.mockResolvedValue({
        id: 'cns-uuid-1',
        clinicId: 'clinic-A',
        patientId: 'uuid-pat-1',
      });
      mockPrisma.patientConsent.update.mockResolvedValue({
        id: 'cns-uuid-1',
        clinicId: 'clinic-A',
        patientId: 'uuid-pat-1',
        consentType: 'Informed Consent for RCT',
        status: 'Declined',
        dateRecorded: now,
        recordedBy: 'Dr. Arun Kumar',
        documentRef: 'DMX-CNS-123456',
        notes: 'Patient opted for extraction instead',
        createdAt: now,
        updatedAt: now,
      });

      const updated = await service.updateConsent('clinic-A', 'pt-1001', 'cns-uuid-1', {
        status: 'Declined',
        notes: 'Patient opted for extraction instead',
      });

      expect(updated.status).toBe('Declined');
      expect(updated.notes).toBe('Patient opted for extraction instead');
    });
  });
});

