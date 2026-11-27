import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ClinicalService } from './clinical.service.js';
import { AppointmentsService } from '../appointments/appointments.service.js';
import {
  DEFAULT_CONSENT_TEMPLATES,
  isConsentRequiredProcedure,
  matchDefaultConsentTemplate,
} from './consent-templates.catalog.js';

describe('Automated Procedure-Specific Consent Forms & E-Signature Workflow', () => {
  let clinicalService: ClinicalService;
  let appointmentsService: AppointmentsService;
  let mockPrisma: any;
  let storedTemplates: any[];
  let storedConsents: any[];
  let storedRevisions: any[];

  beforeEach(() => {
    storedTemplates = [];
    storedConsents = [];
    storedRevisions = [];

    mockPrisma = {
      clinic: {
        findUnique: vi.fn(async ({ where }: any) => ({
          id: where.id,
          name: 'SmileCare Dental Clinic',
          address: 'MG Road',
          city: 'Bengaluru',
          state: 'KA',
          phone: '+91 9876543210',
          timezone: 'Asia/Kolkata',
          extendedSettings: {
            workingHours: {
              weekdays: '09:00 AM - 08:00 PM',
              saturday: '09:00 AM - 06:00 PM',
              sunday: 'Closed',
            },
          },
          clinicalConfig: {},
        })),
      },
      patient: {
        findFirst: vi.fn(async ({ where }: any) => {
          if (where.clinicId !== 'clinic-1') return null;
          return {
            id: 'pat-uuid-1',
            clinicId: 'clinic-1',
            patientCode: 'PAT-1001',
            firstName: 'Rahul',
            lastName: 'Kumar',
            dateOfBirth: new Date('1996-05-10'),
            gender: 'MALE',
            mobile: '9876543210',
            countryCode: '+91',
            address: '12 Indiranagar',
            city: 'Bengaluru',
            state: 'KA',
            postalCode: '560038',
          };
        }),
      },
      user: {
        findFirst: vi.fn(async () => ({
          id: 'doc-1',
          clinicId: 'clinic-1',
          fullName: 'Dr. Anjali Sharma',
          role: 'DOCTOR',
          isActive: true,
        })),
      },
      appointment: {
        findFirst: vi.fn(async () => null),
        findMany: vi.fn(async () => []),
        create: vi.fn(async ({ data }: any) => ({
          id: 'appt-uuid-1',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
          patient: { firstName: 'Rahul', lastName: 'Kumar', patientCode: 'PAT-1001', mobile: '9876543210' },
          doctor: { id: 'doc-1', fullName: 'Dr. Anjali Sharma', role: 'DOCTOR' },
        })),
        update: vi.fn(async ({ where, data }: any) => ({
          id: where.id,
          clinicId: 'clinic-1',
          patientId: 'pat-uuid-1',
          doctorId: 'doc-1',
          startTime: new Date('2026-11-28T05:30:00Z'),
          endTime: new Date('2026-11-28T06:30:00Z'),
          durationMinutes: 60,
          treatmentType: data.treatmentType || 'Wisdom Tooth Extraction',
          visitType: 'Oral Surgery',
          status: data.status || 'CANCELLED',
          priority: 'NORMAL',
          rescheduleHistory: [],
          statusHistory: [],
          patient: { firstName: 'Rahul', lastName: 'Kumar', patientCode: 'PAT-1001', mobile: '9876543210' },
          doctor: { id: 'doc-1', fullName: 'Dr. Anjali Sharma', role: 'DOCTOR' },
          ...data,
        })),
      },
      treatmentPlan: {
        findFirst: vi.fn(async () => null),
      },
      consentTemplate: {
        count: vi.fn(async ({ where }: any) => storedTemplates.filter((t) => t.clinicId === where.clinicId).length),
        findMany: vi.fn(async ({ where }: any) =>
          storedTemplates.filter((t) => t.clinicId === where.clinicId && (where.isActive === undefined || t.isActive === where.isActive)),
        ),
        findFirst: vi.fn(async ({ where }: any) =>
          storedTemplates.find((t) => t.id === where.id && t.clinicId === where.clinicId) || null,
        ),
        create: vi.fn(async ({ data }: any) => {
          const rec = {
            id: `tpl-${storedTemplates.length + 1}`,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          storedTemplates.push(rec);
          return rec;
        }),
        update: vi.fn(async ({ where, data }: any) => {
          const idx = storedTemplates.findIndex((t) => t.id === where.id);
          storedTemplates[idx] = { ...storedTemplates[idx], ...data, updatedAt: new Date() };
          return storedTemplates[idx];
        }),
      },
      patientConsent: {
        findMany: vi.fn(async ({ where }: any) =>
          storedConsents.filter(
            (c) =>
              c.clinicId === where.clinicId &&
              (!where.patientId || c.patientId === where.patientId) &&
              (!where.appointmentId || c.appointmentId === where.appointmentId),
          ),
        ),
        findFirst: vi.fn(async ({ where }: any) => {
          return (
            storedConsents.find((c) => {
              if (where.id && c.id !== where.id) return false;
              if (where.clinicId && c.clinicId !== where.clinicId) return false;
              if (where.patientId && c.patientId !== where.patientId) return false;
              if (where.appointmentId && c.appointmentId !== where.appointmentId) return false;
              if (where.procedureName?.equals && (c.procedureName || '').toLowerCase() !== where.procedureName.equals.toLowerCase()) return false;
              if (where.status?.notIn && where.status.notIn.includes(c.status)) return false;
              return true;
            }) || null
          );
        }),
        create: vi.fn(async ({ data }: any) => {
          const rec = {
            id: `cns-${storedConsents.length + 1}`,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          storedConsents.push(rec);
          return rec;
        }),
        update: vi.fn(async ({ where, data }: any) => {
          const idx = storedConsents.findIndex((c) => c.id === where.id);
          storedConsents[idx] = { ...storedConsents[idx], ...data, updatedAt: new Date() };
          return storedConsents[idx];
        }),
        count: vi.fn(async () => 0),
      },
      consentRevision: {
        create: vi.fn(async ({ data }: any) => {
          const rev = { id: `rev-${storedRevisions.length + 1}`, ...data, createdAt: new Date() };
          storedRevisions.push(rev);
          return rev;
        }),
        findMany: vi.fn(async ({ where }: any) =>
          storedRevisions.filter((r) => r.clinicId === where.clinicId && r.consentId === where.consentId),
        ),
      },
      $queryRaw: vi.fn(async () => []),
      $transaction: vi.fn(async (work: any) => (typeof work === 'function' ? work(mockPrisma) : Promise.all(work))),
    };

    clinicalService = new ClinicalService(mockPrisma);
    appointmentsService = new AppointmentsService(mockPrisma, clinicalService);
  });

  it('provides all 17 procedure-specific consent templates and excludes ordinary checkups', () => {
    expect(DEFAULT_CONSENT_TEMPLATES.length).toBeGreaterThanOrEqual(17);
    expect(isConsentRequiredProcedure('Wisdom Tooth Extraction')).toBe(true);
    expect(isConsentRequiredProcedure('Dental Implant Surgery')).toBe(true);
    expect(isConsentRequiredProcedure('CBCT Imaging')).toBe(true);
    expect(isConsentRequiredProcedure('Comprehensive Dental Examination')).toBe(false);
    expect(matchDefaultConsentTemplate('Routine Checkup')).toBeNull();
  });

  it('automatically generates a PENDING_SIGNATURE consent when booking Wisdom Tooth Extraction, and skips ordinary appointments', async () => {
    const surgeryAppt: any = await appointmentsService.createAppointment(
      'clinic-1',
      {
        patientId: 'PAT-1001',
        doctorName: 'Dr. Anjali Sharma',
        treatmentType: 'Wisdom Tooth Extraction',
        visitType: 'Oral Surgery',
        date: '2026-11-28',
        time: '11:00',
        durationMinutes: 60,
      },
      'user-1',
    );

    expect(surgeryAppt.generatedConsents).toHaveLength(1);
    expect(surgeryAppt.generatedConsents[0].status).toBe('PENDING_SIGNATURE');
    expect(surgeryAppt.generatedConsents[0].procedureName).toBe('Wisdom Tooth Extraction');
    expect(surgeryAppt.generatedConsents[0].consentContentSnapshot.patient.name).toBe('Rahul Kumar');
    expect(surgeryAppt.generatedConsents[0].consentContentSnapshot.procedure.dentistName).toBe('Dr. Anjali Sharma');

    // Ordinary appointment should NOT generate consent
    const routineAppt: any = await appointmentsService.createAppointment(
      'clinic-1',
      {
        patientId: 'PAT-1001',
        doctorName: 'Dr. Anjali Sharma',
        treatmentType: 'Comprehensive Dental Examination',
        visitType: 'Consultation',
        date: '2026-11-28',
        time: '12:30',
        durationMinutes: 30,
      },
      'user-1',
    );
    expect(routineAppt.generatedConsents).toHaveLength(0);
  });

  it('prevents duplicate consent for same patient, appointment, and procedure, and generates separate consents for multiple procedures', async () => {
    const first = await clinicalService.generateConsentForProcedure('clinic-1', 'PAT-1001', {
      procedureName: 'Dental Implant Surgery',
      appointmentId: 'appt-uuid-1',
    });
    const duplicate = await clinicalService.generateConsentForProcedure('clinic-1', 'PAT-1001', {
      procedureName: 'Dental Implant Surgery',
      appointmentId: 'appt-uuid-1',
    });
    expect(duplicate.id).toBe(first.id);
    expect(storedConsents).toHaveLength(1);

    const secondProc = await clinicalService.generateConsentForProcedure('clinic-1', 'PAT-1001', {
      procedureName: 'Bone Grafting',
      appointmentId: 'appt-uuid-1',
    });
    expect(secondProc.id).not.toBe(first.id);
    expect(storedConsents).toHaveLength(2);
  });

  it('enforces patient e-signature, guardian authorization, separate dentist verification, immutability, and PDF generation', async () => {
    const generated = await clinicalService.generateConsentForProcedure('clinic-1', 'PAT-1001', {
      procedureName: 'Wisdom Tooth Extraction',
      appointmentId: 'appt-uuid-1',
      doctorName: 'Dr. Anjali Sharma',
    });

    // Reject signing without acceptance or signature data
    await expect(
      clinicalService.submitPatientSignature('clinic-1', 'PAT-1001', generated.id, {
        signatureData: 'data:image/png;base64,abc',
        accepted: false,
      }),
    ).rejects.toThrow(BadRequestException);

    // Patient signs -> status becomes PATIENT_SIGNED (not COMPLETED)
    const signed = await clinicalService.submitPatientSignature(
      'clinic-1',
      'PAT-1001',
      generated.id,
      {
        signatureData: 'data:image/png;base64,PATIENT_SIG',
        signatureMethod: 'DRAW_TOUCH',
        accepted: true,
      },
      { id: 'user-1', fullName: 'Receptionist' } as any,
    );
    expect(signed.status).toBe('PATIENT_SIGNED');
    expect(signed.patientSignatureMethod).toBe('DRAW_TOUCH');

    // Signed consent cannot be silently overwritten
    await expect(
      clinicalService.submitPatientSignature('clinic-1', 'PAT-1001', generated.id, {
        signatureData: 'data:image/png;base64,OTHER',
        accepted: true,
      }),
    ).rejects.toThrow(BadRequestException);

    // Dentist verifies separately -> status becomes COMPLETED
    const completed = await clinicalService.verifyConsentByDentist(
      'clinic-1',
      'PAT-1001',
      generated.id,
      { dentistSignature: 'data:image/png;base64,DENTIST_SIG', markCompleted: true },
      { id: 'doc-1', fullName: 'Dr. Anjali Sharma', role: 'DOCTOR' } as any,
    );
    expect(completed.status).toBe('COMPLETED');
    expect(completed.dentistVerifiedBy).toBe('Dr. Anjali Sharma');

    // PDF downloads cleanly
    const pdf = await clinicalService.downloadConsentPdf('clinic-1', 'PAT-1001', generated.id);
    expect(pdf.mimeType).toBe('application/pdf');
    expect(pdf.buffer.toString('utf8', 0, 8)).toBe('%PDF-1.4');
    expect(pdf.buffer.toString('utf8')).toContain('Rahul Kumar');
  });

  it('requires guardian name, relationship, and authorization for guardian signature', async () => {
    const generated = await clinicalService.generateConsentForProcedure('clinic-1', 'PAT-1001', {
      procedureName: 'Orthodontic Treatment',
    });

    await expect(
      clinicalService.submitGuardianSignature('clinic-1', 'PAT-1001', generated.id, {
        guardianName: 'Suresh Kumar',
        guardianRelationship: 'Father',
        guardianAuthorized: false,
        signatureData: 'data:image/png;base64,GUARDIAN',
        accepted: true,
      }),
    ).rejects.toThrow(BadRequestException);

    const signed = await clinicalService.submitGuardianSignature('clinic-1', 'PAT-1001', generated.id, {
      guardianName: 'Suresh Kumar',
      guardianRelationship: 'Father',
      guardianAuthorized: true,
      signatureData: 'data:image/png;base64,GUARDIAN',
      signatureMethod: 'DRAW_STYLUS',
      accepted: true,
    });
    expect(signed.status).toBe('PATIENT_SIGNED');
    expect(signed.guardianName).toBe('Suresh Kumar');
    expect(signed.guardianRelationship).toBe('Father');
  });

  it('enforces tenant isolation on consent access and template versioning without altering signed snapshots', async () => {
    await expect(
      clinicalService.generateConsentForProcedure('clinic-2', 'PAT-1001', {
        procedureName: 'Wisdom Tooth Extraction',
      }),
    ).rejects.toThrow(NotFoundException);

    const templates = await clinicalService.getConsentTemplates('clinic-1');
    const wisdomTpl = templates.find((t) => t.procedureType === 'Wisdom Tooth Extraction')!;
    const generated = await clinicalService.generateConsentForProcedure('clinic-1', 'PAT-1001', {
      procedureName: 'Wisdom Tooth Extraction',
    });
    expect(generated.templateVersion).toBe(1);

    const updatedTpl = await clinicalService.updateConsentTemplate('clinic-1', wisdomTpl.id, {
      risks: 'Updated risk disclosure text v2',
    });
    expect(updatedTpl.version).toBe(2);

    // Existing consent snapshot remains unchanged at v1
    const fetched = await clinicalService.getConsent('clinic-1', 'PAT-1001', generated.id);
    expect(fetched.templateVersion).toBe(1);
    expect(fetched.consentContentSnapshot.sections.risks).not.toBe('Updated risk disclosure text v2');
  });

  it('marks pending consents as CANCELLED when appointment is cancelled without overwriting signed consents', async () => {
    const pending = await clinicalService.generateConsentForProcedure('clinic-1', 'PAT-1001', {
      procedureName: 'Tooth Extraction',
      appointmentId: 'appt-cancel-1',
    });
    const signed = await clinicalService.generateConsentForProcedure('clinic-1', 'PAT-1001', {
      procedureName: 'Dental Radiography',
      appointmentId: 'appt-cancel-1',
    });
    await clinicalService.submitPatientSignature('clinic-1', 'PAT-1001', signed.id, {
      signatureData: 'data:image/png;base64,SIG',
      accepted: true,
    });

    await clinicalService.handleAppointmentCancellation(mockPrisma, 'clinic-1', 'appt-cancel-1', 'Patient rescheduled');

    const afterPending = storedConsents.find((c) => c.id === pending.id);
    const afterSigned = storedConsents.find((c) => c.id === signed.id);
    expect(afterPending.status).toBe('CANCELLED');
    expect(afterSigned.status).toBe('PATIENT_SIGNED');
  });

  it('automatically backfills PENDING_SIGNATURE consents for existing upcoming surgical appointments without duplicates', async () => {
    mockPrisma.appointment.findMany.mockResolvedValueOnce([
      {
        id: 'existing-appt-1',
        clinicId: 'clinic-1',
        patientId: 'pat-uuid-1',
        doctorId: 'doc-1',
        treatmentType: 'Wisdom Tooth Extraction',
        visitType: 'Oral Surgery',
        status: 'SCHEDULED',
        doctor: { id: 'doc-1', fullName: 'Dr. Anjali Sharma' },
      },
      {
        id: 'existing-appt-2',
        clinicId: 'clinic-1',
        patientId: 'pat-uuid-1',
        doctorId: 'doc-1',
        treatmentType: 'Comprehensive Dental Examination',
        visitType: 'Consultation',
        status: 'CONFIRMED',
        doctor: { id: 'doc-1', fullName: 'Dr. Anjali Sharma' },
      },
    ]);

    const consents = await clinicalService.getConsents('clinic-1', 'PAT-1001');
    expect(consents).toHaveLength(1);
    expect(consents[0].appointmentId).toBe('existing-appt-1');
    expect(consents[0].status).toBe('PENDING_SIGNATURE');

    // Second call does not duplicate
    mockPrisma.appointment.findMany.mockResolvedValueOnce([
      {
        id: 'existing-appt-1',
        clinicId: 'clinic-1',
        patientId: 'pat-uuid-1',
        doctorId: 'doc-1',
        treatmentType: 'Wisdom Tooth Extraction',
        visitType: 'Oral Surgery',
        status: 'SCHEDULED',
        doctor: { id: 'doc-1', fullName: 'Dr. Anjali Sharma' },
      },
    ]);
    const consentsAgain = await clinicalService.getConsents('clinic-1', 'PAT-1001');
    expect(consentsAgain).toHaveLength(1);
  });

  it('rejects booking appointments during the clinic lunch break (13:00 - 14:00)', async () => {
    await expect(
      appointmentsService.createAppointment(
        'clinic-1',
        {
          patientId: 'PAT-1001',
          doctorName: 'Dr. Anjali Sharma',
          treatmentType: 'Comprehensive Dental Examination',
          visitType: 'Consultation',
          date: '2026-11-28',
          time: '13:30',
          durationMinutes: 30,
        },
        'user-1',
      ),
    ).rejects.toThrow(/lunch break/i);
  });
});
