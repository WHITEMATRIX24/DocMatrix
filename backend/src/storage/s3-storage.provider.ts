import { Injectable, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import {
  StorageProvider,
  UploadOptions,
  UploadResult,
  DownloadResult,
} from './storage.interface.js';

@Injectable()
export class S3StorageProvider implements StorageProvider {
  readonly providerName = 's3' as const;
  private readonly logger = new Logger(S3StorageProvider.name);
  private client: S3Client | null = null;
  private bucket: string;

  constructor() {
    const endpoint = process.env.AWS_ENDPOINT_URL_S3;
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || 'ap-southeast-1';
    this.bucket = process.env.S3_BUCKET || 'uploads';

    if (accessKeyId && secretAccessKey) {
      this.client = new S3Client({
        endpoint: endpoint || undefined,
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        forcePathStyle: true,
      });
      this.logger.log(`S3StorageProvider initialized (Bucket: ${this.bucket}, Endpoint: ${endpoint || 'AWS Standard'})`);
    } else {
      this.logger.warn('S3StorageProvider: Missing AWS credentials. Cloud storage disabled.');
    }
  }

  isAvailable(): boolean {
    return this.client !== null && Boolean(this.bucket);
  }

  async upload(options: UploadOptions): Promise<UploadResult> {
    if (!this.client) {
      throw new Error('S3 client is not configured.');
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: options.key,
      Body: options.buffer,
      ContentType: options.mimeType,
      Metadata: options.metadata,
    });

    const response = await this.client.send(command);

    return {
      key: options.key,
      size: options.buffer.length,
      eTag: response.ETag,
      provider: 's3',
    };
  }

  async getBuffer(key: string): Promise<DownloadResult> {
    if (!this.client) {
      throw new Error('S3 client is not configured.');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);
    if (!response.Body) {
      throw new Error(`S3 object ${key} returned empty body.`);
    }

    // Convert response stream to buffer
    const chunks: Buffer[] = [];
    const stream = response.Body as Readable;
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    return {
      buffer,
      mimeType: response.ContentType || 'application/octet-stream',
      contentLength: response.ContentLength || buffer.length,
    };
  }

  async delete(key: string): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
    } catch (err: any) {
      this.logger.error(`Failed to delete S3 object: ${key}`, err?.message);
    }
  }

  async getSignedDownloadUrl(
    key: string,
    filename?: string,
    expiresInSeconds: number = 900,
  ): Promise<string | null> {
    if (!this.client) {
      return null;
    }

    try {
      const disposition = filename
        ? `attachment; filename="${encodeURIComponent(filename)}"`
        : undefined;

      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentDisposition: disposition,
      });

      return await getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
    } catch (err: any) {
      this.logger.error(`Failed generating signed URL for ${key}:`, err?.message);
      return null;
    }
  }
}

