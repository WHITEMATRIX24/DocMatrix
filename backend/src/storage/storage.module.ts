import { Module } from '@nestjs/common';
import { StorageService } from './storage.service.js';
import { S3StorageProvider } from './s3-storage.provider.js';
import { LocalStorageProvider } from './local-storage.provider.js';
import { MalwareScannerService } from './malware-scanner.service.js';

@Module({
  providers: [
    StorageService,
    S3StorageProvider,
    LocalStorageProvider,
    MalwareScannerService,
  ],
  exports: [StorageService, MalwareScannerService],
})
export class StorageModule {}

