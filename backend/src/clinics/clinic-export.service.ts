import { AuditLogService } from '../common/services/audit-log.service.js';
import { Injectable, Inject, NotFoundException, PayloadTooLargeException, Optional } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';
@Injectable()
export class ClinicExportService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService, @Inject(StorageService) private readonly storage: StorageService, @Optional() @Inject(AuditLogService) private readonly auditLog?: AuditLogService) {}
  async export(clinicId: string, patientId?: string, actor?: { id: string; fullName: string; role: string }) {
    const records = await this.db.$transaction(async tx => {
      const clinic = await tx.clinic.findUnique({ where: { id: clinicId } });
      if (!clinic) throw new NotFoundException('Clinic not found.');
      const patients = await tx.patient.findMany({ where: { clinicId, ...(patientId ? { OR: [{ id: patientId }, { patientCode: { equals: patientId, mode: 'insensitive' as const } }] } : {}) } });
      if (patientId && patients.length !== 1) throw new NotFoundException('Patient not found in this clinic. Use the exact patient ID.');
      const scope = { clinicId, ...(patientId ? { patientId: patients[0].id } : {}) };
      const [appointments, clinicalNotes, prescriptions, treatmentPlans, invoices, documents, consents, toothConditions] = await Promise.all([
        tx.appointment.findMany({ where: scope }), tx.clinicalNote.findMany({ where: scope, include: { addenda: true } }),
        tx.prescription.findMany({ where: scope, include: { items: true } }),
        tx.treatmentPlan.findMany({ where: scope, include: { stages: { include: { items: true } }, estimateRevisions: true, histories: true } }),
        tx.invoice.findMany({ where: scope, include: { items: true, payments: true } }),
        tx.patientDocument.findMany({ where: scope }), tx.patientConsent.findMany({ where: scope }), tx.toothCondition.findMany({ where: scope }),
      ]);
      const toothChartHistory = await tx.auditEvent.findMany({ where: { clinicId, action: 'TOOTH_CHART_UPDATED', ...(patientId ? { metadata: { path: ['patientId'], equals: patients[0].id } } : {}) }, orderBy: { createdAt: 'asc' } });
      const clinicRecords = patientId ? {} : {
        tariffs: await tx.serviceTariff.findMany({ where: { clinicId } }), expenses: await tx.expense.findMany({ where: { clinicId } }),
        inventory: await tx.inventoryItem.findMany({ where: { clinicId }, include: { batches: true } }),
        inventoryAudits: await tx.inventoryAudit.findMany({ where: { clinicId } }), enquiries: await tx.enquiry.findMany({ where: { clinicId } }),
        staff: await tx.user.findMany({ where: { clinicId }, select: { id: true, fullName: true, email: true, role: true, isActive: true } }),
      };
      return { clinic, patients, appointments, clinicalNotes, prescriptions, treatmentPlans, invoices, documents, consents, toothConditions, toothChartHistory, ...clinicRecords };
    }, { isolationLevel: 'RepeatableRead', timeout: 30000 });
    let totalBytes = 0;
    const files = [];
    for (const document of records.documents) {
      const file = await this.storage.getClinicDocumentBuffer(clinicId, document.patientId, document.fileKey);
      totalBytes += file.buffer.length;
      if (totalBytes > 50 * 1024 * 1024) throw new PayloadTooLargeException('This archive exceeds the 50 MB download limit. Export individual patients or use the infrastructure backup.');
      files.push({ documentId: document.id, fileName: document.fileName, mimeType: file.mimeType,
        sha256: createHash('sha256').update(file.buffer).digest('hex'), contentBase64: file.buffer.toString('base64') });
    }
    this.auditLog?.recordEvent({ clinicId, module: 'Security', action: 'RECORD_EXPORT_GENERATED', actorId: actor?.id, actorName: actor?.fullName, actorRole: actor?.role, description: patientId ? 'Patient record archive generated.' : 'Clinic record archive generated.', metadata: { patientId, patients: records.patients.length, files: files.length } });
    return { format: 'docmatrix-record-archive', version: 1, exportedAt: new Date().toISOString(), clinicId,
      scope: patientId ? 'patient' : 'clinic', recordsIncluded: Object.keys(records), records, files,
      recoveryNote: 'Record archive with document binaries; infrastructure backup and a tested restore procedure are required for disaster recovery.' };
  }
}
