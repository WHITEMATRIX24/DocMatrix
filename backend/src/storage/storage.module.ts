import { Module } from '@nestjs/common';
import { StorageService } from './storage.service.js';
import { LocalStorageProvider } from './local-storage.provider.js';
import { S3StorageProvider } from './s3-storage.provider.js';
import { MalwareScannerService } from './malware-scanner.service.js';

@Module({
  providers: [
    LocalStorageProvider,
    S3StorageProvider,
    StorageService,
    MalwareScannerService,
  ],
  exports: [StorageService, MalwareScannerService],
})
export class StorageModule {}
