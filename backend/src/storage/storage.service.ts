import { Injectable, Logger, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as path from 'path';
import { S3StorageProvider } from './s3-storage.provider.js';
import { LocalStorageProvider } from './local-storage.provider.js';
import { StorageProvider, DownloadResult } from './storage.interface.js';
import { MalwareScannerService } from './malware-scanner.service.js';

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export interface UploadDocumentParams {
  clinicId: string;
  patientId: string;
  category: string;
  buffer: Buffer;
  originalFilename: string;
  claimedMimeType?: string;
  doctorName?: string;
}

export interface UploadDocumentResult {
  fileKey: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
  provider: 's3' | 'local';
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly activeProvider: StorageProvider;

  constructor(
    private readonly s3Provider: S3StorageProvider,
    private readonly localProvider: LocalStorageProvider,
    private readonly malwareScanner?: MalwareScannerService,
  ) {
    if (this.s3Provider.isAvailable()) {
      this.activeProvider = this.s3Provider;
      this.logger.log('Active storage engine: AWS/Neon S3 Cloud Object Storage');
    } else {
      this.activeProvider = this.localProvider;
      this.logger.warn('Active storage engine: Local Disk Storage (Provider integration pending or missing credentials)');
    }
  }

  get providerName(): 's3' | 'local' {
    return this.activeProvider.providerName;
  }

  isCloudStorageEnabled(): boolean {
    return this.activeProvider.providerName === 's3';
  }

  /**
   * Inspects magic bytes and file header to verify authentic content types
   * and block unsafe executables, scripts, or disguised payloads.
   */
  validateFile(
    buffer: Buffer,
    originalName: string,
    claimedMimeType?: string,
  ): { mimeType: string; extension: string } {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('Empty file upload rejected.');
    }

    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File exceeds maximum permitted size of 25 MB (Received ${(buffer.length / (1024 * 1024)).toFixed(2)} MB).`,
      );
    }

    const ext = path.extname(originalName).toLowerCase();
    const reject = (): never => { throw new BadRequestException('Unsupported, malformed, or mismatched clinical document type.'); };
    let mimeType: string;
    let extension = ext;
    if (ext === '.pdf' && buffer.toString('ascii', 0, 8).match(/^%PDF-[12]\.[0-9]/)) {
      if (!buffer.subarray(-1024).includes(Buffer.from('%%EOF'))) return reject();
      // Downloads/previews never execute scripts, launch actions or embedded attachments.
      if (/\/(?:JavaScript|JS|Launch|OpenAction|AA|EmbeddedFile|RichMedia)\b/i.test(buffer.toString('latin1'))) return reject();
      mimeType = 'application/pdf';
    } else if (ext === '.png' && buffer.length >= 45 && buffer.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
      let offset = 8, first = true, ended = false, hasData = false;
      while (offset + 12 <= buffer.length) {
        const length = buffer.readUInt32BE(offset), type = buffer.toString('ascii', offset + 4, offset + 8);
        if (length > buffer.length - offset - 12) return reject();
        if (first && (type !== 'IHDR' || length !== 13 || !buffer.readUInt32BE(offset + 8) || !buffer.readUInt32BE(offset + 12))) return reject();
        first = false;
        if (type === 'IDAT') hasData = true;
        offset += length + 12;
        if (type === 'IEND') { ended = length === 0 && offset === buffer.length; break; }
      }
      if (!ended || !hasData) return reject();
      mimeType = 'image/png';
    } else if (['.jpg', '.jpeg'].includes(ext) && buffer.length >= 12 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255 && buffer[buffer.length - 2] === 255 && buffer[buffer.length - 1] === 217) {
      mimeType = 'image/jpeg'; extension = '.jpg';
    } else if (ext === '.webp' && buffer.length >= 20 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' && buffer.readUInt32LE(4) + 8 === buffer.length && ['VP8 ', 'VP8L', 'VP8X'].includes(buffer.toString('ascii', 12, 16))) {
      mimeType = 'image/webp';
    } else if (['.dcm', '.dicom'].includes(ext) && buffer.length >= 140 && buffer.toString('ascii', 128, 132) === 'DICM') {
      mimeType = 'application/dicom'; extension = '.dcm';
    } else if (ext === '.txt' || ext === '.csv') {
      let content: string;
      try { content = new TextDecoder('utf-8', { fatal: true }).decode(buffer); } catch { return reject(); }
      // oxlint-disable-next-line no-control-regex -- Reject binary control bytes in UTF-8 text.
      if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(content) || /<(?:svg|html|script|iframe|object)\b|<\?xml/i.test(content)) return reject();
      mimeType = ext === '.csv' ? 'text/csv' : 'text/plain';
    } else return reject();
    if (claimedMimeType && !['application/octet-stream', mimeType].includes(claimedMimeType.toLowerCase())) return reject();
    return { mimeType, extension };
  }

  /**
   * Sanitizes filename to prevent directory traversal and special character exploits
   */
  sanitizeFilename(filename: string): string {
    const base = path.basename(filename);
    return base
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .slice(0, 100);
  }

  /**
   * Generates a collision-resistant, cryptographically random storage key
   * adhering to tenant and patient hierarchy:
   * clinics/{clinicId}/patients/{patientId}/{category}/{timestamp}-{uuid}.ext
   */
  generateObjectKey(
    clinicId: string,
    patientId: string,
    category: string,
    sanitizedFilename: string,
  ): string {
    const categorySlug = category.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20) || 'other';
    const timestamp = Date.now();
    const uniqueId = crypto.randomUUID();
    return `clinics/${clinicId}/patients/${patientId}/${categorySlug}/${timestamp}-${uniqueId}-${sanitizedFilename}`;
  }

  /**
   * Uploads patient clinical document into active storage provider with metadata
   */
  async uploadPatientDocument(params: UploadDocumentParams): Promise<UploadDocumentResult> {
    const { mimeType, extension } = this.validateFile(
      params.buffer,
      params.originalFilename,
      params.claimedMimeType,
    );

    if (this.malwareScanner) await this.malwareScanner.scanBuffer(params.buffer, params.originalFilename);
    else if (process.env.NODE_ENV === 'production' || process.env.SCANNER_REQUIRED === 'true') {
      throw new ServiceUnavailableException('Required antivirus scanning is unavailable.');
    }

    const safeBaseName = this.sanitizeFilename(
      params.originalFilename.replace(/\.[^.]+$/, '') || 'document',
    );
    const finalFilename = `${safeBaseName}${extension}`;
    const objectKey = this.generateObjectKey(
      params.clinicId,
      params.patientId,
      params.category,
      finalFilename,
    );

    const sizeMb = (params.buffer.length / (1024 * 1024)).toFixed(2);
    const fileSizeStr = params.buffer.length > 1024 * 1024 ? `${sizeMb} MB` : `${Math.round(params.buffer.length / 1024)} KB`;

    await this.activeProvider.upload({
      key: objectKey,
      buffer: params.buffer,
      mimeType,
      metadata: {
        clinicId: params.clinicId,
        patientId: params.patientId,
        category: params.category,
        doctorName: params.doctorName || 'Attending Doctor',
      },
    });

    return {
      fileKey: objectKey,
      fileName: params.originalFilename || finalFilename,
      fileSize: fileSizeStr,
      mimeType,
      provider: this.activeProvider.providerName,
    };
  }

  /**
   * Retrieves binary buffer of document from active storage provider
   */
  async getDocumentBuffer(fileKey: string): Promise<DownloadResult> {
    return this.activeProvider.getBuffer(fileKey);
  }

  /**
   * Generates an authorized, short-lived download URL if provider is cloud S3/R2
   */
  async getSignedDownloadUrl(
    fileKey: string,
    filename?: string,
    expiresInSeconds: number = 900,
  ): Promise<string | null> {
    return this.activeProvider.getSignedDownloadUrl(fileKey, filename, expiresInSeconds);
  }

  /**
   * Permanently deletes object from active storage provider
   */
  async deleteDocument(fileKey: string): Promise<void> {
    await this.activeProvider.delete(fileKey);
  }
}

