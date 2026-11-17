export interface UploadPatientDocumentParams {
  clinicId: string;
  patientId: string;
  category?: string;
  buffer: Buffer;
  originalFilename: string;
  claimedMimeType?: string;
  doctorName?: string;
}

export interface UploadResult {
  fileKey: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
}

export interface StorageProvider {
  name: string;
  isAvailable(): boolean;
  upload(fileKey: string, buffer: Buffer, mimeType: string): Promise<void>;
  getBuffer(fileKey: string): Promise<{ buffer: Buffer; mimeType?: string }>;
  delete(fileKey: string): Promise<void>;
  getSignedDownloadUrl?(fileKey: string, fileName?: string, expiresInSeconds?: number): Promise<string>;
}
