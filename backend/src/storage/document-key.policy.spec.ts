import { describe, expect, it } from 'vitest';
import { assertDocumentOwnership } from './document-key.policy.js';
import { LocalStorageProvider } from './local-storage.provider.js';
import path from 'node:path';
describe('Document storage ownership', () => {
  it('rejects a corrupt foreign-clinic or foreign-patient object key', () => {
    expect(() => assertDocumentOwnership('clinics/foreign/patients/p/record.pdf', 'own', 'p')).toThrow('does not belong');
    expect(() => assertDocumentOwnership('clinics/own/patients/foreign/record.pdf', 'own', 'p')).toThrow('does not belong');
    expect(() => assertDocumentOwnership('clinics/own/patients/p/../foreign/record.pdf', 'own', 'p')).toThrow('Invalid');
    expect(() => assertDocumentOwnership('clinics/own/patients/p/record.pdf', 'own', 'p')).not.toThrow();
  });
  it('rejects traversal into a sibling directory that shares the storage-root prefix', async () => {
    const provider = new LocalStorageProvider();
    (provider as any).baseDir = path.resolve('.verification/documents');
    await expect(provider.getBuffer('../documents-other/record.pdf')).rejects.toThrow('Path traversal');
  });
});
