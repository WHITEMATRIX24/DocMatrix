import { Readable } from 'stream';

export interface UploadOptions {
  key: string;
  buffer: Buffer;
  mimeType: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  key: string;
  size: number;
  eTag?: string;
  provider: 's3' | 'local';
}

export interface DownloadResult {
  buffer: Buffer;
  stream?: Readable;
  mimeType: string;
  contentLength: number;
  fileName?: string;
}

export interface StorageProvider {
  readonly providerName: 's3' | 'local';
  isAvailable(): boolean;
  upload(options: UploadOptions): Promise<UploadResult>;
  getBuffer(key: string): Promise<DownloadResult>;
  getStream?(key: string): Promise<{ stream: Readable; mimeType: string; contentLength: number }>;
  delete(key: string): Promise<void>;
  getSignedDownloadUrl(key: string, filename?: string, expiresInSeconds?: number): Promise<string | null>;
}

