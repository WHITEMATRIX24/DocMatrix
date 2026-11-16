import { Injectable, Inject, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateClinicDto } from './dto/update-clinic.dto.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { UpdateStaffDto } from './dto/update-staff.dto.js';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { AuditLogService } from '../common/services/audit-log.service.js';
import { assignableStaffRoles, assertAssignableStaffRole, assertManageableStaff } from './staff-management.policy.js';

const STAFF_SELECT = {
  id: true, email: true, fullName: true, phone: true, role: true,
  isActive: true, isPrimaryContact: true, createdAt: true, updatedAt: true,
} as const;

interface ClinicExtendedSettings {
  displayName?: string;
  registrationNumber?: string;
  gstin?: string;
  website?: string;
  logoUrl?: string;
  workingHours?: {
    weekdays: string;
    saturday: string;
    sunday: string;
  };
  retentionAdult?: string;
  retentionMinor?: string;
}

interface SecurityAuditEvent {
  id: string;
  timestamp: string;
  module: 'Security';
  action: string;
  actorName: string;
  actorRole: string;
  description: string;
  severity: 'info' | 'warn' | 'success';
}

@Injectable()
export class ClinicsService {
  private storageDir = path.resolve(process.cwd(), 'storage');

  constructor(
    @Inject(PrismaService) private prisma: PrismaService,
    @Inject(AuditLogService) private auditLog: AuditLogService,
  ) {
    this.ensureStorageDirectories();
  }

  private ensureStorageDirectories() {
    try {
      const dirs = [
        path.join(this.storageDir, 'clinic-settings'),
        path.join(this.storageDir, 'clinical-config'),
        path.join(this.storageDir, 'security-audits'),
      ];
      for (const d of dirs) {
        if (!fs.existsSync(d)) {
          fs.mkdirSync(d, { recursive: true });
        }
      }
    } catch {
      // Graceful fallback
    }
  }

  private getSettingsFilePath(clinicId: string): string {
    return path.join(this.storageDir, 'clinic-settings', `${clinicId}.json`);
  }

  private getClinicalConfigFilePath(clinicId: string): string {
    return path.join(this.storageDir, 'clinical-config', `${clinicId}.json`);
  }

  private getSecurityAuditFilePath(clinicId: string): string {
    return path.join(this.storageDir, 'security-audits', `${clinicId}.json`);
  }

  private readSettings(clinicId: string): ClinicExtendedSettings {
    try {
      const file = this.getSettingsFilePath(clinicId);
      if (fs.existsSync(file)) {
        return JSON.parse(fs.readFileSync(file, 'utf-8'));
      }
    } catch {}
    return {};
  }

  private writeSettings(clinicId: string, settings: ClinicExtendedSettings): void {
    try {
      this.ensureStorageDirectories();
      const file = this.getSettingsFilePath(clinicId);
      fs.writeFileSync(file, JSON.stringify(settings, null, 2), 'utf-8');
    } catch {}
  }

  async getClinic(clinicId: string) {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      include: {
        _count: {
          select: {
            users: true,
            patients: true,
            appointments: true,
          },
        },
      },
    });

    if (!clinic) {
      throw new NotFoundException('Clinic not found.');
    }

    const settings = this.readSettings(clinicId);

    return {
      ...clinic,
      displayName: settings.displayName || clinic.name,
      registrationNumber: settings.registrationNumber || '',
      gstin: settings.gstin || '',
      website: settings.website || '',
      logoUrl: settings.logoUrl || '',
      workingHours: settings.workingHours || {
        weekdays: '09:00 AM - 08:00 PM',
        saturday: '09:00 AM - 06:00 PM',
        sunday: '10:00 AM - 02:00 PM (Emergency only)',
      },
      retentionAdult: settings.retentionAdult || '7',
      retentionMinor: settings.retentionMinor || '25',
    };
  }

  async updateClinic(clinicId: string, dto: UpdateClinicDto) {
    await this.getClinic(clinicId);

    const updated = await this.prisma.clinic.update({
      where: { id: clinicId },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.phone && { phone: dto.phone.trim() }),
        ...(dto.email && { email: dto.email.toLowerCase().trim() }),
        ...(dto.address !== undefined && { address: dto.address?.trim() || null }),
        ...(dto.city !== undefined && { city: dto.city?.trim() || null }),
        ...(dto.state !== undefined && { state: dto.state?.trim() || null }),
        ...(dto.country !== undefined && { country: dto.country?.trim() || 'India' }),
        ...(dto.postalCode !== undefined && { postalCode: dto.postalCode?.trim() || null }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone?.trim() || 'Asia/Kolkata' }),
        ...(dto.currency !== undefined && { currency: dto.currency?.trim() || 'INR' }),
        ...(dto.practiceType !== undefined && { practiceType: dto.practiceType?.trim() || 'Solo' }),
      },
    });

    const currentSettings = this.readSettings(clinicId);
    const newSettings: ClinicExtendedSettings = {
      ...currentSettings,
      ...(dto.displayName !== undefined && { displayName: dto.displayName.trim() }),
      ...(dto.registrationNumber !== undefined && { registrationNumber: dto.registrationNumber.trim() }),
      ...(dto.gstin !== undefined && { gstin: dto.gstin.trim() }),
      ...(dto.website !== undefined && { website: dto.website.trim() }),
      ...(dto.logoUrl !== undefined && { logoUrl: dto.logoUrl.trim() }),
      ...(dto.workingHours !== undefined && { workingHours: dto.workingHours }),
      ...(dto.retentionAdult !== undefined && { retentionAdult: dto.retentionAdult }),
      ...(dto.retentionMinor !== undefined && { retentionMinor: dto.retentionMinor }),
    };

    this.writeSettings(clinicId, newSettings);

    return {
      ...updated,
      displayName: newSettings.displayName || updated.name,
      registrationNumber: newSettings.registrationNumber || '',
      gstin: newSettings.gstin || '',
      website: newSettings.website || '',
      logoUrl: newSettings.logoUrl || '',
      workingHours: newSettings.workingHours || {
        weekdays: '09:00 AM - 08:00 PM',
        saturday: '09:00 AM - 06:00 PM',
        sunday: '10:00 AM - 02:00 PM (Emergency only)',
      },
      retentionAdult: newSettings.retentionAdult || '7',
      retentionMinor: newSettings.retentionMinor || '25',
    };
  }

  getClinicPractitioners(clinicId: string) {
    if (!clinicId) throw new ForbiddenException('A clinic is required.');
    return this.prisma.user.findMany({
      where: { clinicId, role: 'DOCTOR', isActive: true },
      select: { id: true, fullName: true, role: true }, orderBy: { fullName: 'asc' },
    });
  }

  async getClinicStaff(clinicId: string) {
    if (!clinicId) throw new ForbiddenException('A clinic is required.');
    return this.prisma.user.findMany({
      where: { clinicId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        isPrimaryContact: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  getAssignableStaffRoles(clinicId: string, actor: AuthenticatedUser) {
    return assignableStaffRoles(clinicId, actor);
  }

  private recordStaffEvent(clinicId: string, actor: AuthenticatedUser, action: string,
    staffId: string, metadata: Record<string, unknown> = {}) {
    this.auditLog.recordEvent({
      clinicId, module: 'Staff', action, actorId: actor.id,
      actorName: actor.fullName, actorRole: actor.role,
      description: `Staff account ${action.toLowerCase().replace(/_/g, ' ')}.`,
      metadata: { staffId, ...metadata },
    });
  }

  async addStaff(clinicId: string, dto: CreateStaffDto, actor: AuthenticatedUser) {
    assertAssignableStaffRole(clinicId, actor, dto.role);
    if (!dto.fullName?.trim() || typeof dto.password !== 'string' ||
      dto.password.length < 12 || Buffer.byteLength(dto.password, 'utf8') > 72) {
      throw new BadRequestException('A name and an initial password of at least 12 characters (maximum 72 UTF-8 bytes) are required.');
    }
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException('A user with this email address already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    try {
      const staff = await this.prisma.user.create({
        data: {
          clinicId,
          email: dto.email.toLowerCase().trim(),
          passwordHash,
          fullName: dto.fullName.trim(),
          phone: dto.phone?.trim() || null,
          role: dto.role,
          isPlatformAdmin: false,
          isPrimaryContact: false,
          isActive: true,
        },
        select: STAFF_SELECT,
      });
      this.recordStaffEvent(clinicId, actor, 'STAFF_CREATED', staff.id, { role: staff.role });
      return staff;
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002') {
        throw new ConflictException('A user with this email address already exists.');
      }
      throw error;
    }
  }

  async updateStaff(clinicId: string, staffId: string, dto: UpdateStaffDto, actor: AuthenticatedUser) {
    assignableStaffRoles(clinicId, actor);
    if (dto.role !== undefined) assertAssignableStaffRole(clinicId, actor, dto.role);
    if (dto.fullName !== undefined && !dto.fullName.trim()) throw new BadRequestException('Full name is required.');
    const { updated, previous } = await this.prisma.$transaction(async tx => {
      const user = await tx.user.findFirst({ where: { id: staffId, clinicId } });
      if (!user) throw new NotFoundException('Staff member not found in this clinic.');
      assertManageableStaff(clinicId, actor, user);
      if (user.isPrimaryContact && (dto.isActive === false || (dto.role && dto.role !== user.role))) {
        throw new BadRequestException('The primary clinic owner cannot be deactivated or demoted.');
      }
      if (staffId === actor.id && (dto.isActive === false || (dto.role && dto.role !== user.role))) {
        throw new BadRequestException('You cannot deactivate or change the role of your own account.');
      }
      const updated = await tx.user.update({
        where: { id_clinicId: { id: staffId, clinicId } },
        data: {
          ...(dto.fullName !== undefined && { fullName: dto.fullName.trim() }),
          ...(dto.phone !== undefined && { phone: dto.phone?.trim() || null }),
          ...(dto.role !== undefined && { role: dto.role }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
        select: STAFF_SELECT,
      });
      if ((dto.role !== undefined && dto.role !== user.role) ||
        (dto.isActive !== undefined && dto.isActive !== user.isActive)) {
        await tx.userSession.updateMany({
          where: { userId: staffId, clinicId, isRevoked: false },
          data: { isRevoked: true, revocationReason: 'Staff role or account status changed by clinic administrator' },
        });
      }
      return { updated, previous: user };
    });
    if (updated.role !== previous.role) {
      this.recordStaffEvent(clinicId, actor, 'STAFF_ROLE_CHANGED', staffId, { previousRole: previous.role, role: updated.role });
    }
    if (updated.isActive !== previous.isActive) {
      this.recordStaffEvent(clinicId, actor, updated.isActive ? 'STAFF_ACTIVATED' : 'STAFF_DEACTIVATED', staffId);
    }
    this.recordStaffEvent(clinicId, actor, 'STAFF_UPDATED', staffId);
    return updated;
  }

  async deleteStaff(clinicId: string, staffId: string, actor: AuthenticatedUser) {
    assignableStaffRoles(clinicId, actor);
    const removed = await this.prisma.$transaction(async tx => {
      const user = await tx.user.findFirst({ where: { id: staffId, clinicId } });
      if (!user) throw new NotFoundException('Staff member not found in this clinic.');
      assertManageableStaff(clinicId, actor, user);
      if (user.isPrimaryContact || staffId === actor.id) {
        throw new BadRequestException('The primary owner and your own account cannot be removed.');
      }
      const updated = await tx.user.update({
        where: { id_clinicId: { id: staffId, clinicId } }, data: { isActive: false }, select: STAFF_SELECT,
      });
      await tx.userSession.updateMany({
        where: { userId: staffId, clinicId, isRevoked: false },
        data: { isRevoked: true, revocationReason: 'Staff access removed by clinic administrator' },
      });
      return updated;
    });
    this.recordStaffEvent(clinicId, actor, 'STAFF_REMOVED', staffId, { deletionMode: 'ACCESS_REVOKED_RECORDS_RETAINED' });
    return removed;
  }

  // ------------------------------------------
  // Clinical Configuration Persistence
  // ------------------------------------------

  async getClinicalConfig(clinicId: string) {
    try {
      const file = this.getClinicalConfigFilePath(clinicId);
      if (fs.existsSync(file)) {
        return JSON.parse(fs.readFileSync(file, 'utf-8'));
      }
    } catch {}

    return {
      customMedicines: [],
      customProcedures: [],
      customDiagnoses: [],
      customTemplates: [],
      governancePolicies: {
        mandatoryConsentForSurgery: true,
        mandatoryDiagnosisBeforeRx: true,
        twoFactorForPrescriptions: false,
        autoRecallIntervalMonths: 6,
      },
    };
  }

  async updateClinicalConfig(clinicId: string, config: any) {
    this.ensureStorageDirectories();
    const file = this.getClinicalConfigFilePath(clinicId);
    fs.writeFileSync(file, JSON.stringify(config, null, 2), 'utf-8');
    return { success: true, updatedConfig: config };
  }

  // ------------------------------------------
  // Security Audit Logging
  // ------------------------------------------

  recordSecurityAudit(
    clinicId: string,
    action: string,
    actorName: string,
    actorRole: string,
    description: string,
    severity: 'info' | 'warn' | 'success' = 'info',
  ) {
    try {
      this.ensureStorageDirectories();
      const file = this.getSecurityAuditFilePath(clinicId);
      let logs: SecurityAuditEvent[] = [];
      if (fs.existsSync(file)) {
        logs = JSON.parse(fs.readFileSync(file, 'utf-8'));
      }
      logs.unshift({
        id: `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        module: 'Security',
        action,
        actorName,
        actorRole,
        description,
        severity,
      });
      // Keep max 100 security logs per clinic
      fs.writeFileSync(file, JSON.stringify(logs.slice(0, 100), null, 2), 'utf-8');
    } catch {}
  }

  // ------------------------------------------
  // Activity Log Aggregation
  // ------------------------------------------

  async getActivityLog(clinicId: string, limit: number = 50) {
    const maxItems = Math.min(Math.max(limit, 10), 200);

    const safeFetch = async <T>(fetcher: () => Promise<T[]> | undefined): Promise<T[]> => {
      try {
        const promise = fetcher();
        if (!promise || typeof (promise as any).then !== 'function') return [];
        const res = await promise;
        return Array.isArray(res) ? res : [];
      } catch {
        return [];
      }
    };

    const [
      inventoryAudits,
      treatmentHistories,
      clinicalAddenda,
      payments,
      consents,
      recentUsers,
      recentPatients,
      recentAppointments,
      recentPrescriptions,
    ] = await Promise.all([
      safeFetch(() =>
        this.prisma.inventoryAudit?.findMany({
          where: { clinicId },
          take: maxItems,
          orderBy: { createdAt: 'desc' },
        }),
      ),
      safeFetch(() =>
        this.prisma.treatmentPlanHistory?.findMany({
          where: { clinicId },
          take: maxItems,
          orderBy: { createdAt: 'desc' },
        }),
      ),
      safeFetch(() =>
        this.prisma.clinicalNoteAddendum?.findMany({
          where: { clinicId },
          take: maxItems,
          orderBy: { createdAt: 'desc' },
        }),
      ),
      safeFetch(() =>
        this.prisma.invoicePayment?.findMany({
          where: { clinicId },
          take: maxItems,
          orderBy: { createdAt: 'desc' },
        }),
      ),
      safeFetch(() =>
        this.prisma.patientConsent?.findMany({
          where: { clinicId },
          take: maxItems,
          orderBy: { createdAt: 'desc' },
        }),
      ),
      safeFetch(() =>
        this.prisma.user?.findMany({
          where: { clinicId },
          take: maxItems,
          orderBy: { createdAt: 'desc' },
        }),
      ),
      safeFetch(() =>
        this.prisma.patient?.findMany({
          where: { clinicId },
          take: maxItems,
          orderBy: { createdAt: 'desc' },
        }),
      ),
      safeFetch(() =>
        this.prisma.appointment?.findMany({
          where: { clinicId },
          include: { patient: { select: { firstName: true, lastName: true } } },
          take: maxItems,
          orderBy: { updatedAt: 'desc' },
        }),
      ),
      safeFetch(() =>
        this.prisma.prescription?.findMany({
          where: { clinicId },
          include: { patient: { select: { firstName: true, lastName: true } } },
          take: maxItems,
          orderBy: { createdAt: 'desc' },
        }),
      ),
    ]);

    const events: Array<{
      id: string;
      timestamp: string;
      module: 'Patients' | 'Clinical' | 'Billing' | 'Inventory' | 'Staff' | 'Security' | 'Appointments';
      action: string;
      actorName: string;
      actorRole?: string;
      description: string;
      severity: 'info' | 'warn' | 'success';
    }> = [];

    // 1. Inventory Audits
    for (const a of inventoryAudits) {
      events.push({
        id: `inv-${a.id}`,
        timestamp: a.createdAt.toISOString(),
        module: 'Inventory',
        action: 'STOCK_CONSUMED',
        actorName: a.confirmedBy || a.doctorName || 'Inventory Staff',
        actorRole: 'STAFF',
        description: `Material consumption recorded for ${a.procedureName} (Patient: ${a.patientName})`,
        severity: 'info',
      });
    }

    // 2. Treatment Plan Histories
    for (const th of treatmentHistories) {
      const detailsStr = th.details ? (typeof th.details === 'string' ? th.details : JSON.stringify(th.details)) : '';
      events.push({
        id: `tp-${th.id}`,
        timestamp: th.createdAt.toISOString(),
        module: 'Clinical',
        action: th.action,
        actorName: th.userName || 'Clinical Practitioner',
        actorRole: th.userRole || 'DOCTOR',
        description: detailsStr ? `Treatment Plan: ${th.action} (${detailsStr.slice(0, 80)})` : `Treatment Plan action: ${th.action}`,
        severity: th.action.includes('REJECT') ? 'warn' : 'success',
      });
    }

    // 3. Clinical Note Addenda
    for (const ca of clinicalAddenda) {
      events.push({
        id: `cna-${ca.id}`,
        timestamp: ca.createdAt.toISOString(),
        module: 'Clinical',
        action: 'ADDENDUM_ADDED',
        actorName: ca.authorName || 'Practitioner',
        actorRole: 'DOCTOR',
        description: `Addendum attached: ${ca.content?.slice(0, 80)}`,
        severity: 'info',
      });
    }

    // 4. Billing Payments
    for (const p of payments) {
      events.push({
        id: `pay-${p.id}`,
        timestamp: p.createdAt.toISOString(),
        module: 'Billing',
        action: p.type,
        actorName: 'Billing Staff',
        actorRole: 'RECEPTIONIST',
        description: `${p.type} of ₹${Number(p.amount).toLocaleString('en-IN')} via ${p.mode}${p.reference ? ` (Ref: ${p.reference})` : ''}`,
        severity: 'success',
      });
    }

    // 5. Patient Consents
    for (const c of consents) {
      events.push({
        id: `cns-${c.id}`,
        timestamp: c.createdAt.toISOString(),
        module: 'Patients',
        action: `CONSENT_${c.status.toUpperCase()}`,
        actorName: 'Clinical Practitioner',
        actorRole: 'DOCTOR',
        description: `${c.consentType} status updated to ${c.status}`,
        severity: c.status === 'Revoked' ? 'warn' : 'info',
      });
    }

    // 6. Staff Onboarded
    for (const u of recentUsers) {
      events.push({
        id: `usr-${u.id}`,
        timestamp: u.createdAt.toISOString(),
        module: 'Staff',
        action: 'STAFF_ONBOARDED',
        actorName: 'Clinic Administrator',
        actorRole: 'ORGANIZATION_ADMIN',
        description: `Staff member ${u.fullName} (${u.role}) active in clinic`,
        severity: 'info',
      });
    }

    // 7. Patient Registrations
    for (const pt of recentPatients) {
      events.push({
        id: `pt-${pt.id}`,
        timestamp: pt.createdAt.toISOString(),
        module: 'Patients',
        action: 'PATIENT_REGISTERED',
        actorName: 'Front Desk',
        actorRole: 'RECEPTIONIST',
        description: `New patient registered: ${pt.firstName} ${pt.lastName} (${pt.patientCode})`,
        severity: 'success',
      });
    }

    // 8. Appointments (Scheduled & Cancelled)
    for (const app of recentAppointments) {
      const patientName = app.patient ? `${app.patient.firstName} ${app.patient.lastName}` : 'Patient';
      if (app.status === 'CANCELLED') {
        events.push({
          id: `app-cnl-${app.id}`,
          timestamp: app.updatedAt.toISOString(),
          module: 'Appointments',
          action: 'APPOINTMENT_CANCELLED',
          actorName: 'Front Desk',
          actorRole: 'RECEPTIONIST',
          description: `Appointment for ${patientName} cancelled${app.cancellationReason ? `: ${app.cancellationReason}` : ''}`,
          severity: 'warn',
        });
      } else {
        events.push({
          id: `app-sch-${app.id}`,
          timestamp: app.createdAt.toISOString(),
          module: 'Appointments',
          action: 'APPOINTMENT_SCHEDULED',
          actorName: 'Front Desk',
          actorRole: 'RECEPTIONIST',
          description: `Appointment scheduled for ${patientName} (${app.treatmentType || 'Consultation'})`,
          severity: 'info',
        });
      }
    }

    // 9. Prescriptions
    for (const rx of recentPrescriptions) {
      const patientName = rx.patient ? `${rx.patient.firstName} ${rx.patient.lastName}` : 'Patient';
      events.push({
        id: `rx-${rx.id}`,
        timestamp: rx.createdAt.toISOString(),
        module: 'Clinical',
        action: 'PRESCRIPTION_ISSUED',
        actorName: 'Treating Dentist',
        actorRole: 'DOCTOR',
        description: `Prescription #${rx.prescriptionNumber} generated for ${patientName}`,
        severity: 'info',
      });
    }

    // 10. Security Audit Events
    try {
      const secFile = this.getSecurityAuditFilePath(clinicId);
      if (fs.existsSync(secFile)) {
        const secEvents: SecurityAuditEvent[] = JSON.parse(fs.readFileSync(secFile, 'utf-8'));
        events.push(...secEvents);
      }
    } catch {}

    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return events.slice(0, maxItems);
  }
}
