import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import {
  StorageProvider,
  UploadOptions,
  UploadResult,
  DownloadResult,
} from './storage.interface.js';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  readonly providerName = 'local' as const;
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), 'storage', 'documents');
    if (!fs.existsSync(this.baseDir)) {
      try {
        fs.mkdirSync(this.baseDir, { recursive: true });
      } catch (err: any) {
        this.logger.error(`Could not create local storage directory ${this.baseDir}:`, err?.message);
      }
    }
  }

  isAvailable(): boolean {
    return true;
  }

  private resolveSafePath(key: string): string {
    // Prevent directory traversal: key is sanitized and resolved strictly inside baseDir
    const normalizedKey = key.replace(/^[/\\]+/, '');
    const fullPath = path.resolve(this.baseDir, normalizedKey);

    if (!fullPath.startsWith(this.baseDir)) {
      throw new Error(`Path traversal attempt blocked: ${key}`);
    }

    return fullPath;
  }

  async upload(options: UploadOptions): Promise<UploadResult> {
    const fullPath = this.resolveSafePath(options.key);
    const parentDir = path.dirname(fullPath);

    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    await fs.promises.writeFile(fullPath, options.buffer);

    return {
      key: options.key,
      size: options.buffer.length,
      provider: 'local',
    };
  }

  async getBuffer(key: string): Promise<DownloadResult> {
    const fullPath = this.resolveSafePath(key);

    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found at local storage key: ${key}`);
    }

    const buffer = await fs.promises.readFile(fullPath);
    return {
      buffer,
      mimeType: 'application/octet-stream',
      contentLength: buffer.length,
    };
  }

  async delete(key: string): Promise<void> {
    try {
      const fullPath = this.resolveSafePath(key);
      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
      }
    } catch (err: any) {
      this.logger.error(`Error deleting local file ${key}:`, err?.message);
    }
  }

  async getSignedDownloadUrl(
    _key: string,
    _filename?: string,
    _expiresInSeconds?: number,
  ): Promise<string | null> {
    // Local storage cannot provide public cloud pre-signed URLs
    return null;
  }
}

