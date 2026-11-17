import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { StorageProvider } from './storage.interface.js';

@Injectable()
export class LocalStorageProvider implements StorageProvider {
  readonly name = 'local-storage';
  private readonly baseDir: string;

  constructor() {
    this.baseDir = path.resolve(process.cwd(), 'storage', 'documents');
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
    } catch {}
  }

  isAvailable(): boolean {
    return true;
  }

  private resolvePath(fileKey: string): string {
    // Sanitize path to prevent directory traversal
    const safeKey = fileKey.replace(/\\/g, '/').replace(/\.\./g, '');
    return path.join(this.baseDir, safeKey);
  }

  async upload(fileKey: string, buffer: Buffer, _mimeType: string): Promise<void> {
    const fullPath = this.resolvePath(fileKey);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await fs.promises.writeFile(fullPath, buffer);
  }

  async getBuffer(fileKey: string): Promise<{ buffer: Buffer; mimeType?: string }> {
    const fullPath = this.resolvePath(fileKey);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Local file not found: ${fileKey}`);
    }
    const buffer = await fs.promises.readFile(fullPath);
    return { buffer };
  }

  async delete(fileKey: string): Promise<void> {
    const fullPath = this.resolvePath(fileKey);
    if (fs.existsSync(fullPath)) {
      await fs.promises.unlink(fullPath).catch(() => {});
    }
  }
}
