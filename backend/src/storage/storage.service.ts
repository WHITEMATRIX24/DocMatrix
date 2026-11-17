import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import * as path from 'path';
import * as crypto from 'crypto';
import { LocalStorageProvider } from './local-storage.provider.js';
import { S3StorageProvider } from './s3-storage.provider.js';
import {
  UploadPatientDocumentParams,
  UploadResult,
  StorageProvider,
} from './storage.interface.js';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    private readonly localStorageProvider: LocalStorageProvider,
    private readonly s3Provider: S3StorageProvider,
  ) {
    if (this.s3Provider.isAvailable()) {
      this.logger.log('Active storage engine: AWS/Neon S3 Cloud Object Storage');
    } else {
      this.logger.log('Active storage engine: Local Disk Storage Provider');
    }
  }

  isCloudStorageEnabled(): boolean {
    return this.s3Provider.isAvailable();
  }

  private getActiveProvider(): StorageProvider {
    if (this.s3Provider.isAvailable()) {
      return this.s3Provider;
    }
    return this.localStorageProvider;
  }

  /**
   * Validate magic bytes for authentic file type verification.
   */
  validateFileHeader(buffer: Buffer, claimedMime?: string): string {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('Cannot store empty file.');
    }

    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File size exceeds maximum allowed threshold of 25 MB.`,
      );
    }

    // PDF: %PDF- (0x25, 0x50, 0x44, 0x46)
    if (
      buffer.length >= 4 &&
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    ) {
      return 'application/pdf';
    }

    // PNG: 0x89 0x50 0x4E 0x47
    if (
      buffer.length >= 4 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return 'image/png';
    }

    // JPEG: 0xFF 0xD8 0xFF
    if (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    ) {
      return 'image/jpeg';
    }

    // WebP: RIFF....WEBP
    if (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
      return 'image/webp';
    }

    // DICOM: Check offset 128 for 'DICM'
    if (buffer.length >= 132 && buffer.toString('ascii', 128, 132) === 'DICM') {
      return 'application/dicom';
    }

    // Fall back to claimed MIME or generic binary if valid
    return claimedMime || 'application/octet-stream';
  }

  /**
   * Sanitize a filename to prevent path traversal or unsafe characters.
   */
  sanitizeFilename(name: string): string {
    const base = path.basename(name).replace(/[^a-zA-Z0-9._-]/g, '_');
    return base || 'document.bin';
  }

  /**
   * Formats byte count into a human-readable string.
   */
  formatBytes(bytes: number): string {
    if (bytes < 1024 * 1024) {
      return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /**
   * Uploads a patient document buffer to the active storage provider.
   */
  async uploadPatientDocument(
    params: UploadPatientDocumentParams,
  ): Promise<UploadResult> {
    const verifiedMime = this.validateFileHeader(
      params.buffer,
      params.claimedMimeType,
    );
    const safeName = this.sanitizeFilename(params.originalFilename);
    const category = (params.category || 'general')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_');
    const timestamp = Date.now();
    const uuid = crypto.randomUUID();

    const fileKey = `clinics/${params.clinicId}/patients/${params.patientId}/${category}/${timestamp}-${uuid}-${safeName}`;

    const provider = this.getActiveProvider();
    await provider.upload(fileKey, params.buffer, verifiedMime);

    return {
      fileKey,
      fileName: safeName,
      fileSize: this.formatBytes(params.buffer.length),
      mimeType: verifiedMime,
    };
  }

  /**
   * Generates a time-limited signed URL for document retrieval.
   */
  async getSignedDownloadUrl(
    fileKey: string,
    fileName?: string,
    expiresInSeconds: number = 900,
  ): Promise<string> {
    if (this.s3Provider.isAvailable() && this.s3Provider.getSignedDownloadUrl) {
      return this.s3Provider.getSignedDownloadUrl(
        fileKey,
        fileName,
        expiresInSeconds,
      );
    }
    // Local fallback direct download route
    return `/api/patients/documents/${encodeURIComponent(fileKey)}/download`;
  }

  /**
   * Retrieves the raw buffer of a stored document.
   */
  async getDocumentBuffer(
    fileKey: string,
  ): Promise<{ buffer: Buffer; mimeType?: string }> {
    if (this.s3Provider.isAvailable()) {
      try {
        return await this.s3Provider.getBuffer(fileKey);
      } catch (err: any) {
        this.logger.warn(
          `S3 retrieval failed for ${fileKey}, falling back to local storage: ${err.message}`,
        );
      }
    }
    return this.localStorageProvider.getBuffer(fileKey);
  }

  /**
   * Deletes a stored document from object storage.
   */
  async deleteDocument(fileKey: string): Promise<void> {
    if (this.s3Provider.isAvailable()) {
      await this.s3Provider.delete(fileKey).catch(() => {});
    }
    await this.localStorageProvider.delete(fileKey).catch(() => {});
  }
}
