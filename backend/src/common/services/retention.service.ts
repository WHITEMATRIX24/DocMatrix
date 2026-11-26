import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuditLogService } from './audit-log.service.js';

export function retentionDue(patient: { dateOfBirth: Date; createdAt: Date; lastVisit?: Date; legalHold?: boolean }, settings: { retentionAdult?: string; retentionMinor?: string }, now = new Date()): boolean {
  if (patient.legalHold) return false;
  const eighteenthBirthday = new Date(patient.dateOfBirth); eighteenthBirthday.setUTCFullYear(eighteenthBirthday.getUTCFullYear() + 18);
  const lastVisit = patient.lastVisit || patient.createdAt;
  const minorRecord = patient.createdAt < eighteenthBirthday;
  const years = minorRecord ? settings.retentionMinor || '25' : settings.retentionAdult || '7';
  if (years === 'indefinite') return false;
  const deadline = new Date(minorRecord ? patient.dateOfBirth : lastVisit);
  deadline.setUTCFullYear(deadline.getUTCFullYear() + Number(years));
  // Pediatric records must also satisfy the adult retention period after the last visit.
  const adultDeadline = new Date(lastVisit);
  if (settings.retentionAdult === 'indefinite') return false;
  adultDeadline.setUTCFullYear(adultDeadline.getUTCFullYear() + Number(settings.retentionAdult || '7'));
  return deadline <= now && adultDeadline <= now;
}

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);
  private timer?: ReturnType<typeof setInterval>;
  private cursor: string | undefined;
  private running = false;
  constructor(private readonly db: PrismaService, private readonly audit: AuditLogService) {}
  onModuleInit() { this.timer = setInterval(() => { void this.runBatch(); }, 60000); this.timer.unref(); }
  onModuleDestroy() { clearInterval(this.timer); }
  async runBatch() {
    if (this.running) return;
    this.running = true;
    try {
      const rows = await this.db.patient.findMany({ where: { isActive: true, legalHold: false }, take: 100,
        ...(this.cursor ? { cursor: { id: this.cursor }, skip: 1 } : {}), orderBy: { id: 'asc' },
        include: { clinic: { select: { extendedSettings: true } }, appointments: { orderBy: { startTime: 'desc' }, take: 1, select: { startTime: true } }, clinicalNotes: { orderBy: { updatedAt: 'desc' }, take: 1, select: { updatedAt: true } }, prescriptions: { orderBy: { updatedAt: 'desc' }, take: 1, select: { updatedAt: true } }, treatmentPlans: { orderBy: { updatedAt: 'desc' }, take: 1, select: { updatedAt: true } } } });
      this.cursor = rows.length === 100 ? rows[rows.length - 1].id : undefined;
      for (const patient of rows) {
        if (!retentionDue({ ...patient, lastVisit: new Date(Math.max(patient.updatedAt.getTime(), patient.appointments[0]?.startTime.getTime() || 0, patient.clinicalNotes[0]?.updatedAt.getTime() || 0, patient.prescriptions[0]?.updatedAt.getTime() || 0, patient.treatmentPlans[0]?.updatedAt.getTime() || 0)) }, (patient.clinic.extendedSettings || {}) as any)) continue;
        await this.db.$transaction(async tx => {
          const changed = await tx.patient.updateMany({ where: { id: patient.id, clinicId: patient.clinicId, legalHold: false, isActive: true, updatedAt: patient.updatedAt }, data: { isActive: false, retentionArchivedAt: new Date() } });
          if (changed.count) await tx.auditEvent.create({ data: { id: randomUUID(), clinicId: patient.clinicId, module: 'Security', action: 'RETENTION_ARCHIVED', actorName: 'Retention worker', actorRole: 'SYSTEM', description: 'Record archived under clinic retention policy; evidence preserved.', severity: 'info', outcome: 'SUCCESS', metadata: { patientId: patient.id } } });
        });
      }
    } catch { this.logger.error('Retention worker failed; records were retained.'); }
    finally { this.running = false; }
  }
}
