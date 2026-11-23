import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { ClinicExportService } from './clinic-export.service.js';
describe('Patient record archive binaries', () => {
  let db: any, storage: any;
  const bytes = Buffer.from('Synthetic document source bytes');
  beforeEach(() => {
    db = { clinic: { findUnique: vi.fn().mockResolvedValue({ id: 'clinic-a' }) } };
    for (const name of ['patient', 'appointment', 'clinicalNote', 'prescription', 'treatmentPlan', 'invoice', 'patientDocument', 'patientConsent', 'toothCondition', 'auditEvent']) db[name] = { findMany: vi.fn().mockResolvedValue([]) };
    db.patient.findMany.mockResolvedValue([{ id: 'patient-a' }]);
    db.patientDocument.findMany.mockResolvedValue([{ id: 'document-a', patientId: 'patient-a', fileKey: 'clinics/clinic-a/patients/patient-a/source.txt', fileName: 'source.txt' }]);
    db.$transaction = (cb: any) => cb(db);
    storage = { getClinicDocumentBuffer: vi.fn().mockResolvedValue({ buffer: bytes, mimeType: 'text/plain' }) };
  });
  it('includes original document bytes, checksum and the scoped storage lookup', async () => {
    const archive = await new ClinicExportService(db, storage).export('clinic-a', 'patient-a');
    expect(storage.getClinicDocumentBuffer).toHaveBeenCalledWith('clinic-a', 'patient-a', 'clinics/clinic-a/patients/patient-a/source.txt');
    expect(Buffer.from(archive.files[0].contentBase64, 'base64')).toEqual(bytes);
    expect(archive.files[0].sha256).toBe(createHash('sha256').update(bytes).digest('hex'));
    expect(archive.records).not.toHaveProperty('staff');
  });
  it('fails explicitly when an original file is missing', async () => {
    storage.getClinicDocumentBuffer.mockRejectedValueOnce(new Error('Synthetic original file missing'));
    await expect(new ClinicExportService(db, storage).export('clinic-a', 'patient-a')).rejects.toThrow('original file missing');
  });
});
