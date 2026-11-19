import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StorageService, MAX_FILE_SIZE_BYTES } from './storage.service.js';
import { S3StorageProvider } from './s3-storage.provider.js';
import { LocalStorageProvider } from './local-storage.provider.js';
import { BadRequestException } from '@nestjs/common';

describe('StorageService', () => {
  let storageService: StorageService;
  let mockS3Provider: any;
  let mockLocalProvider: any;

  beforeEach(() => {
    mockS3Provider = {
      providerName: 's3',
      isAvailable: vi.fn().mockReturnValue(true),
      upload: vi.fn().mockResolvedValue({
        key: 'clinics/c1/patients/p1/radiology/123-uuid-scan.dcm',
        size: 1024,
        eTag: '"mock-etag"',
        provider: 's3',
      }),
      getBuffer: vi.fn().mockResolvedValue({
        buffer: Buffer.from('mock-bytes'),
        mimeType: 'application/dicom',
        contentLength: 10,
      }),
      delete: vi.fn().mockResolvedValue(undefined),
      getSignedDownloadUrl: vi.fn().mockResolvedValue('https://mock-s3.com/signed-url?token=xyz'),
    };

    mockLocalProvider = {
      providerName: 'local',
      isAvailable: vi.fn().mockReturnValue(true),
      upload: vi.fn().mockResolvedValue({
        key: 'clinics/c1/patients/p1/radiology/123-uuid-scan.dcm',
        size: 1024,
        provider: 'local',
      }),
      getBuffer: vi.fn().mockResolvedValue({
        buffer: Buffer.from('mock-local-bytes'),
        mimeType: 'application/octet-stream',
        contentLength: 16,
      }),
      delete: vi.fn().mockResolvedValue(undefined),
      getSignedDownloadUrl: vi.fn().mockResolvedValue(null),
    };

    storageService = new StorageService(mockS3Provider, mockLocalProvider);
  });

  describe('File Validation & Magic Bytes', () => {
    it('validates authentic PDF files using magic bytes (%PDF-)', () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n%mock content\n%%EOF');
      const res = storageService.validateFile(pdfBuffer, 'xray_report.pdf');
      expect(res.mimeType).toBe('application/pdf');
      expect(res.extension).toBe('.pdf');
    });

    it('validates authentic PNG files using magic bytes', () => {
      const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=', 'base64');
      const res = storageService.validateFile(pngBuffer, 'intraoral_photo.png');
      expect(res.mimeType).toBe('image/png');
      expect(res.extension).toBe('.png');
    });

    it('validates authentic JPEG files using magic bytes', () => {
      const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 6, 0x4a, 0x46, 0x49, 0x46, 0xff, 0xd9]);
      const res = storageService.validateFile(jpegBuffer, 'smile.jpg');
      expect(res.mimeType).toBe('image/jpeg');
      expect(res.extension).toBe('.jpg');
    });

    it('validates authentic DICOM files with 128-byte preamble + DICM', () => {
      const dicomBuffer = Buffer.alloc(140);
      dicomBuffer.write('DICM', 128, 'ascii');
      const res = storageService.validateFile(dicomBuffer, 'cbct_scan.dcm');
      expect(res.mimeType).toBe('application/dicom');
      expect(res.extension).toBe('.dcm');
    });

    it('rejects disallowed executable extensions (.exe, .sh, .bat, .vbs)', () => {
      const exeBuffer = Buffer.from('malicious payload');
      expect(() => storageService.validateFile(exeBuffer, 'trojan.exe')).toThrow(BadRequestException);
      expect(() => storageService.validateFile(exeBuffer, 'script.sh')).toThrow(BadRequestException);
      expect(() => storageService.validateFile(exeBuffer, 'exploit.bat')).toThrow(BadRequestException);
    });

    it('rejects empty files', () => {
      const emptyBuffer = Buffer.alloc(0);
      expect(() => storageService.validateFile(emptyBuffer, 'empty.pdf')).toThrow(BadRequestException);
    });

    it('rejects oversized files exceeding 25 MB', () => {
      const oversizedBuffer = Buffer.alloc(MAX_FILE_SIZE_BYTES + 1024);
      expect(() => storageService.validateFile(oversizedBuffer, 'huge_volume.dcm')).toThrow(BadRequestException);
    });
  });

  describe('Key Generation & Security', () => {
    it('generates randomized, collision-resistant keys scoped to clinic and patient', () => {
      const key1 = storageService.generateObjectKey('clinic-123', 'pat-456', 'Radiology', 'opg.dcm');
      const key2 = storageService.generateObjectKey('clinic-123', 'pat-456', 'Radiology', 'opg.dcm');

      expect(key1).toContain('clinics/clinic-123/patients/pat-456/radiology/');
      expect(key1).not.toBe(key2); // Collision resistant timestamps/UUIDs
    });

    it('sanitizes dangerous filenames preventing path traversal', () => {
      const sanitized = storageService.sanitizeFilename('../../etc/passwd..//xray.dcm');
      expect(sanitized).not.toContain('/');
      expect(sanitized).not.toContain('..');
      expect(sanitized).toContain('xray.dcm');
    });
  });

  describe('Upload & Download Workflows', () => {
    it('uploads valid patient document through active cloud provider and returns metadata', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\nValid clinical consent\n%%EOF');
      const result = await storageService.uploadPatientDocument({
        clinicId: 'clinic-A',
        patientId: 'pat-101',
        category: 'Consent',
        buffer: pdfBuffer,
        originalFilename: 'signed_consent.pdf',
        doctorName: 'Dr. Arun Kumar',
      });

      expect(mockS3Provider.upload).toHaveBeenCalledTimes(1);
      expect(result.provider).toBe('s3');
      expect(result.mimeType).toBe('application/pdf');
      expect(result.fileKey).toContain('clinics/clinic-A/patients/pat-101/consent/');
    });

    it('generates signed download URL with 15-minute expiration for secure retrieval', async () => {
      const signedUrl = await storageService.getSignedDownloadUrl('test-key.pdf', 'report.pdf', 900);
      expect(signedUrl).toBe('https://mock-s3.com/signed-url?token=xyz');
      expect(mockS3Provider.getSignedDownloadUrl).toHaveBeenCalledWith('test-key.pdf', 'report.pdf', 900);
    });

    it('falls back to local storage provider when S3 credentials are unavailable', () => {
      mockS3Provider.isAvailable.mockReturnValue(false);
      const fallbackService = new StorageService(mockS3Provider, mockLocalProvider);

      expect(fallbackService.providerName).toBe('local');
      expect(fallbackService.isCloudStorageEnabled()).toBe(false);
    });

    it('deletes document cleanly from storage provider', async () => {
      await storageService.deleteDocument('clinics/c1/patients/p1/scan.dcm');
      expect(mockS3Provider.delete).toHaveBeenCalledWith('clinics/c1/patients/p1/scan.dcm');
    });
  });
});

