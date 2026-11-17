import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageProvider } from './storage.interface.js';

@Injectable()
export class S3StorageProvider implements StorageProvider {
  readonly name = 's3-storage';
  private readonly logger = new Logger(S3StorageProvider.name);
  private client: S3Client | null = null;
  private bucket: string = '';

  constructor() {
    this.initClient();
  }

  private initClient(): void {
    const bucket =
      process.env.AWS_S3_BUCKET ||
      process.env.S3_BUCKET ||
      process.env.NEON_OBJECT_STORAGE_BUCKET ||
      '';
    const accessKeyId =
      process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID || '';
    const secretAccessKey =
      process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY || '';
    const region =
      process.env.AWS_REGION || process.env.S3_REGION || 'ap-southeast-1';
    const endpoint =
      process.env.AWS_ENDPOINT ||
      process.env.S3_ENDPOINT ||
      process.env.NEON_OBJECT_STORAGE_ENDPOINT ||
      undefined;

    if (bucket && accessKeyId && secretAccessKey) {
      try {
        this.bucket = bucket;
        this.client = new S3Client({
          region,
          endpoint,
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
          forcePathStyle: Boolean(endpoint),
        });
        this.logger.log(`S3 Object Storage initialized for bucket: ${bucket}`);
      } catch (err: any) {
        this.logger.warn(`Failed to initialize S3Client: ${err.message}`);
        this.client = null;
      }
    }
  }

  isAvailable(): boolean {
    return Boolean(this.client && this.bucket);
  }

  async upload(fileKey: string, buffer: Buffer, mimeType: string): Promise<void> {
    if (!this.client || !this.bucket) {
      throw new Error('S3 client is not available.');
    }
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      Body: buffer,
      ContentType: mimeType,
    });
    await this.client.send(command);
  }

  async getBuffer(fileKey: string): Promise<{ buffer: Buffer; mimeType?: string }> {
    if (!this.client || !this.bucket) {
      throw new Error('S3 client is not available.');
    }
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
    });
    const response = await this.client.send(command);
    if (!response.Body) {
      throw new Error(`Empty body returned for S3 object: ${fileKey}`);
    }
    const byteArray = await response.Body.transformToByteArray();
    return {
      buffer: Buffer.from(byteArray),
      mimeType: response.ContentType,
    };
  }

  async delete(fileKey: string): Promise<void> {
    if (!this.client || !this.bucket) return;
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: fileKey,
      });
      await this.client.send(command);
    } catch (err: any) {
      this.logger.warn(`Failed to delete S3 object ${fileKey}: ${err.message}`);
    }
  }

  async getSignedDownloadUrl(
    fileKey: string,
    fileName?: string,
    expiresInSeconds: number = 900,
  ): Promise<string> {
    if (!this.client || !this.bucket) {
      throw new Error('S3 client is not available.');
    }
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ResponseContentDisposition: fileName
        ? `inline; filename="${encodeURIComponent(fileName)}"`
        : 'inline',
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }
}
