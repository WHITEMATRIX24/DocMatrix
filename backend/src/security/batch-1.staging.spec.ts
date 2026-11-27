import 'reflect-metadata';
import { describe, expect, it, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import { ClinicalService } from '../clinical/clinical.service.js';
import { ClinicalController } from '../clinical/clinical.controller.js';
import { InventoryController } from '../inventory/inventory.controller.js';
import { TenantGuard } from '../common/guards/tenant.guard.js';

const receptionist: any = { id: 'staff', role: 'RECEPTIONIST', clinicId: 'clinic', isPlatformAdmin: false };
const categories = ['Identification', 'Consent', 'Referral', 'Dental X-rays', 'Clinical Photographs', 'Medical Reports', 'Dental Reports', 'Scanned Documents', 'Prescriptions', 'Other Documents'];
function fixture() {
  const db: any = {
    patient: { findFirst: vi.fn(async () => ({ id: 'patient', patientCode: 'PAT-1' })) },
    patientDocument: {
      findMany: vi.fn(async () => []),
      findFirst: vi.fn(async () => null),
      create: vi.fn(async ({ data }) => ({ ...data, id: 'doc', createdAt: new Date(), updatedAt: new Date() })),
    },
  };
  db.$transaction = (work: any) => work(db);
  db.auditEvent = { create: vi.fn() };
  const storage: any = { uploadPatientDocument: vi.fn(async () => ({fileKey:'clinics/clinic/patients/patient/report.pdf',fileName:'report.pdf',fileSize:'1 KB',mimeType:'application/pdf'})), isCloudStorageEnabled: vi.fn(() => true), getSignedDownloadUrl: vi.fn() };
  return { db, storage, service: new ClinicalService(db, storage) };
}

describe('Batch 1 staging workflow regressions', () => {
  it.each(categories)('allows receptionist upload of %s', async category => {
    const { db, service } = fixture();
    const doc = await service.createDocument('clinic', 'PAT-1', { title: 'Synthetic intake', category }, {buffer:Buffer.from('synthetic'),originalname:'report.pdf'}, receptionist);
    expect(doc.category).toBe(category);
    expect(db.patientDocument.create.mock.calls[0][0].data).toMatchObject({ clinicId: 'clinic', patientId: 'patient' });
  });

  it.each(['unknown', 'consent'])('denies unsupported category %s before any storage or database write', async category => {
    const { db, service, storage } = fixture();
    await expect(service.createDocument('clinic', 'PAT-1', { title: 'Synthetic', category }, undefined, receptionist)).rejects.toThrow(/supported category/);
    expect(db.patient.findFirst).not.toHaveBeenCalled();
    expect(db.patientDocument.create).not.toHaveBeenCalled();
    expect(storage.getSignedDownloadUrl).not.toHaveBeenCalled();
  });

  it('scopes clinic-wide and patient documents to active records in the clinic', async () => {
    const { db, service } = fixture();
    await service.getAllClinicDocuments('clinic', receptionist);
    expect(db.patientDocument.findMany.mock.calls[0][0].where).toEqual({ clinicId: 'clinic', archivedAt: null });
    await service.getDocuments('clinic', 'PAT-1', receptionist);
    expect(db.patientDocument.findMany.mock.calls[1][0].where).toEqual({ clinicId: 'clinic', patientId: 'patient', archivedAt: null });
  });

  it.each(['getDocument', 'getDocumentSignedUrl', 'downloadDocument'] as const)('prevents direct-ID foreign or archived document access through %s without signing or reading storage', async method => {
    const { db, service, storage } = fixture();
    await expect(service[method]('clinic', 'PAT-1', 'foreign-or-clinical-document', receptionist)).rejects.toThrow(/not found/);
    expect(db.patientDocument.findFirst.mock.calls[0][0].where).toEqual({ clinicId: 'clinic', patientId: 'patient', id: 'foreign-or-clinical-document', archivedAt: null });
    expect(storage.getSignedDownloadUrl).not.toHaveBeenCalled();
  });

  it('preserves full document scope for doctors', async () => {
    const { db, service } = fixture();
    await service.getDocuments('clinic', 'PAT-1', { ...receptionist, role: 'DOCTOR' });
    expect(db.patientDocument.findMany.mock.calls[0][0].where).toEqual({ clinicId: 'clinic', patientId: 'patient', archivedAt: null });
  });

  it('passes authenticated document scope through every public read/upload handler', async () => {
    const service: any = Object.fromEntries(['getAllClinicDocuments', 'getDocuments', 'getDocument', 'getDocumentSignedUrl', 'createDocument'].map(method => [method, vi.fn(async () => ({}))]));
    service.downloadDocument = vi.fn(async () => ({ fileName: 'a.pdf', mimeType: 'application/pdf', buffer: Buffer.from('synthetic') }));
    const controller = new ClinicalController(service);
    await controller.getAllClinicDocuments(receptionist);
    await controller.getDocuments(receptionist, 'PAT-1');
    await controller.getDocument(receptionist, 'PAT-1', 'doc');
    await controller.getDocumentSignedUrl(receptionist, 'PAT-1', 'doc');
    await controller.createDocument(receptionist, 'PAT-1', { title: 'Synthetic', category: 'Consent' });
    const response: any = { setHeader: vi.fn(), end: vi.fn() };
    await controller.downloadDocument(receptionist, 'PAT-1', 'doc', 'false', response);
    await controller.previewDocument(receptionist, 'PAT-1', 'doc', 'false', response);
    for (const mock of Object.values(service) as any[]) {
      for (const args of mock.mock.calls) expect(args).toContain(receptionist);
    }
  });

  it.each([
    [ClinicalController, 'createDocument', true], [ClinicalController, 'getDocuments', true],
    [ClinicalController, 'deleteDocument', false], [ClinicalController, 'getToothChart', false],
    [InventoryController, 'getItems', true], [InventoryController, 'getMovements', true],
    [InventoryController, 'createItem', false], [InventoryController, 'updateItem', false],
    [InventoryController, 'deleteItem', false], [InventoryController, 'receiveBatch', false],
    [InventoryController, 'updateBatch', false], [InventoryController, 'adjustStock', false],
    [InventoryController, 'confirmDeduction', false],
  ] as const)('enforces receptionist route policy %s.%s', async (controller, method, allowed) => {
    const guard = new TenantGuard({ clinic: { findUnique: async () => ({ status: 'ACTIVE' }) } } as any, new Reflector());
    const authorize = guard.canActivate({
      getClass: () => controller,
      getHandler: () => (controller.prototype as any)[method],
      switchToHttp: () => ({ getRequest: () => ({ user: receptionist, method: 'POST' }) }),
    } as any);
    if (allowed) await expect(authorize).resolves.toBe(true);
    else await expect(authorize).rejects.toThrow();
  });
});
