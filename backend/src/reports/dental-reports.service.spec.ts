import { Test, TestingModule } from '@nestjs/testing';
import { DentalReportsService } from './dental-reports.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { DentalReportType } from './dto/dental-report.dto.js';

describe('DentalReportsService', () => {
  let service: DentalReportsService;
  let prisma: any;

  const mockClinicId = 'clinic-alpha-101';

  const mockDoctorUser: AuthenticatedUser = {
    id: 'user-doc-1',
    clinicId: mockClinicId,
    email: 'dr.smith@docmatrix.test',
    fullName: 'Dr. Jane Smith',
    role: 'DOCTOR',
    isPlatformAdmin: false,
    isPrimaryContact: false,
  };

  const mockPatientRecord = {
    id: 'pat-uuid-1',
    clinicId: mockClinicId,
    patientCode: 'pt-1001',
    firstName: 'Rahul',
    lastName: 'Sharma',
    dateOfBirth: new Date('1990-05-15'),
    gender: 'MALE',
    mobile: '9876543210',
    countryCode: '+91',
    email: 'rahul.sharma@example.com',
    address: '123 MG Road',
    city: 'Bengaluru',
    state: 'Karnataka',
    postalCode: '560001',
    emergencyName: 'Priya Sharma',
    emergencyPhone: '9876543211',
    relationship: 'Spouse',
    medicalSafetyAlerts: {
      allergies: 'Penicillin, Latex',
      diabetes: true,
      hypertension: false,
    },
    clinic: {
      id: mockClinicId,
      name: 'Apex Dental Care',
      address: '100 Indiranagar, Bengaluru',
      phone: '+91 80 1234 5678',
      email: 'contact@apexdental.test',
      settings: {},
    },
    clinicalNotes: [
      {
        id: 'note-101',
        noteNumber: 'CN-1001',
        consultationDate: new Date('2026-11-20T10:00:00Z'),
        consultationType: 'ROUTINE_CHECKUP',
        status: 'FINALIZED',
        chiefComplaint: 'Severe throbbing pain in lower right molar',
        symptoms: 'Pain on biting, sensitivity to cold',
        symptomDuration: '3 days',
        painSeverity: 8,
        historyNotes: 'Previous restorative treatment 2 years ago',
        extraoralFindings: 'Normal TMJ, no lymphadenopathy',
        intraoralFindings: 'Deep distal cavity on tooth #46',
        toothSpecificFindings: 'Tooth 46 tender to percussion',
        periodontalFindings: 'Mild generalized gingivitis, no deep pockets',
        examinationNotes: 'Pulp vitality test non-responsive on #46',
        primaryDiagnosis: 'Irreversible Pulpitis tooth #46',
        additionalDiagnoses: ['Class II Caries tooth #47'],
        diagnosisNotes: 'Requires root canal therapy',
        treatmentPerformed: 'Root Canal Access Opening & BMP Sitting 1',
        treatmentToothNumber: '46',
        treatmentDescription: 'Access made under 2% Lignocaine with Adrenaline. Canals extirpated.',
        materialsUsed: '2% Lignocaine, Calcium Hydroxide intracanal medicament, Cavit temporary seal',
        treatmentOutcome: 'Pain relieved immediately. Access sealed.',
        treatmentRecommendations: 'Complete obturation in 5-7 days followed by full coverage crown',
        referralNotes: null,
        followUpRequired: true,
        followUpDate: new Date('2026-11-27'),
        followUpInstructions: 'Avoid chewing on right side. Warm saline rinses.',
        patientAdvice: 'Take prescribed analgesics after food.',
        doctor: {
          id: 'user-doc-1',
          fullName: 'Dr. Jane Smith',
        },
        finalizedByName: 'Dr. Jane Smith',
      },
    ],
    toothConditions: [
      {
        id: 'tc-1',
        toothNumber: 46,
        condition: 'RCT',
        notes: 'Sitting 1 completed',
        updatedAt: new Date('2026-11-20'),
      },
      {
        id: 'tc-2',
        toothNumber: 47,
        condition: 'Caries',
        notes: 'Distal pit caries',
        updatedAt: new Date('2026-11-20'),
      },
      {
        id: 'tc-3',
        toothNumber: 16,
        condition: 'Restored',
        notes: 'Composite restoration intact',
        updatedAt: new Date('2026-10-15'),
      },
    ],
    treatmentPlans: [
      {
        id: 'plan-1',
        planNumber: 'TP-1001',
        title: 'Molar Endodontic & Crown Rehabilitation',
        status: 'In Progress',
        totalEstimatedCost: 12500,
        cost: 12500,
        stages: [],
        items: [
          {
            id: 'item-1',
            procedureName: 'Root Canal Treatment (Molar)',
            toothNumber: 46,
            cost: 5500,
            isCompleted: false,
          },
          {
            id: 'item-2',
            procedureName: 'Zirconia Monolithic Crown',
            toothNumber: 46,
            cost: 7000,
            isCompleted: false,
          },
        ],
      },
    ],
    prescriptions: [
      {
        id: 'rx-1',
        prescriptionNumber: 'RX-1001',
        diagnosis: 'Acute Irreversible Pulpitis #46',
        status: 'FINALIZED',
        issuedAt: new Date('2026-11-20T10:30:00Z'),
        items: [
          {
            id: 'rx-item-1',
            medicineName: 'Amoxicillin 500mg',
            dosage: '500mg',
            frequency: '1-0-1 (Twice daily)',
            duration: '5 days',
            instructions: 'After meals with water',
          },
          {
            id: 'rx-item-2',
            medicineName: 'Ibuprofen + Paracetamol (Combiflam)',
            dosage: '400mg + 325mg',
            frequency: '1-0-1 (Twice daily)',
            duration: '3 days',
            instructions: 'Strictly after food',
          },
        ],
      },
    ],
    appointments: [
      {
        id: 'appt-1',
        startTime: new Date('2026-11-20T09:30:00Z'),
        endTime: new Date('2026-11-20T10:30:00Z'),
        status: 'COMPLETED',
        notes: 'Root Canal Session 1',
        doctor: {
          fullName: 'Dr. Jane Smith',
        },
      },
    ],
    documents: [
      {
        id: 'doc-1',
        title: 'Pre-Op IOPA Radiograph Tooth #46',
        category: 'Radiology',
        fileName: 'iopa_46_preop.jpg',
        createdAt: new Date('2026-11-20'),
      },
    ],
  };

  beforeEach(async () => {
    prisma = {
      patient: {
        findFirst: vi.fn().mockImplementation((args: any) => {
          if (args.where.clinicId !== mockClinicId) return null;
          const search = args.where.OR?.[0]?.id || args.where.OR?.[1]?.patientCode;
          if (search === 'pt-1001' || search === 'pat-uuid-1') {
            return mockPatientRecord;
          }
          return null;
        }),
      },
      patientDocument: {
        create: vi.fn().mockImplementation((args: any) => ({
          id: 'new-doc-uuid-999',
          clinicId: args.data.clinicId,
          patientId: args.data.patientId,
          title: args.data.title,
          category: args.data.category,
          fileName: args.data.fileName,
          fileSize: args.data.fileSize,
          doctorName: args.data.doctorName,
          createdAt: new Date(),
        })),
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'doc-report-1',
            title: '[Dental Report: Consultation] Rahul Sharma',
            category: 'Dental Report',
            fileName: 'consultation_pt-1001.json',
            fileSize: '4 KB',
            doctorName: 'Dr. Jane Smith',
            createdAt: new Date('2026-11-20T11:00:00Z'),
            notes: JSON.stringify({
              reportType: 'CONSULTATION',
              finalizedAt: '2026-11-20T11:00:00Z',
              finalizedByName: 'Dr. Jane Smith',
              reportData: {
                title: 'Consultation Report: Rahul Sharma',
                executiveSummary: 'Root canal session 1 completed.',
              },
            }),
          },
        ]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DentalReportsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<DentalReportsService>(DentalReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('resolvePatient & tenant boundary', () => {
    it('successfully resolves patient by patientCode within clinic tenant', async () => {
      const res = await service.resolvePatient(mockClinicId, 'pt-1001');
      expect(res).toBeDefined();
      expect(res.patientCode).toBe('pt-1001');
      expect(res.firstName).toBe('Rahul');
    });

    it('rejects patient lookup if patient does not exist or belongs to different clinic', async () => {
      await expect(
        service.resolvePatient('other-clinic-id', 'pt-1001'),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects empty patient identifier with BadRequestException', async () => {
      await expect(service.resolvePatient(mockClinicId, '')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('generateDentalReport - 6 Report Types', () => {
    it('generates Patient Clinical Summary with allergies, odontogram, diagnoses and treatments', async () => {
      const report = await service.generateDentalReport(mockClinicId, mockDoctorUser, {
        patientId: 'pt-1001',
        reportType: DentalReportType.CLINICAL_SUMMARY,
      });

      expect(report).toBeDefined();
      expect(report.reportType).toBe(DentalReportType.CLINICAL_SUMMARY);
      expect(report.title).toContain('Patient Clinical Dental Summary: Rahul Sharma');
      expect(report.patient.fullName).toBe('Rahul Sharma');
      expect(report.executiveSummary).toContain('Comprehensive clinical dental overview');

      // Check sections
      const allergySec = report.sections.find((s) => s.id === 'medical_alerts');
      expect(allergySec).toBeDefined();
      expect(allergySec?.content).toContain('Penicillin, Latex');
      expect(allergySec?.content).toContain('Diabetes Mellitus');

      const odontogramSec = report.sections.find((s) => s.id === 'odontogram');
      expect(odontogramSec?.content).toContain('#46');
      expect(odontogramSec?.content).toContain('#47');

      expect(report.doctorSignoff.doctorName).toBe('Dr. Jane Smith');
    });

    it('generates Consultation Report for a specific consultation', async () => {
      const report = await service.generateDentalReport(mockClinicId, mockDoctorUser, {
        patientId: 'pt-1001',
        reportType: DentalReportType.CONSULTATION,
        consultationId: 'note-101',
      });

      expect(report.reportType).toBe(DentalReportType.CONSULTATION);
      expect(report.title).toContain('Consultation Examination Report: Rahul Sharma');

      const complaintSec = report.sections.find((s) => s.id === 'chief_complaint');
      expect(complaintSec?.content).toContain('Severe throbbing pain in lower right molar');
      expect(complaintSec?.content).toContain('8 / 10');

      const txSec = report.sections.find((s) => s.id === 'treatment_performed');
      expect(txSec?.content).toContain('Root Canal Access Opening');
      expect(txSec?.content).toContain('#46');

      const rxSec = report.sections.find((s) => s.id === 'visit_prescriptions');
      expect(rxSec).toBeDefined();
      expect(rxSec?.tableData?.length).toBeGreaterThan(0);
    });

    it('generates Treatment Report with completed procedures and active plans', async () => {
      const report = await service.generateDentalReport(mockClinicId, mockDoctorUser, {
        patientId: 'pt-1001',
        reportType: DentalReportType.TREATMENT,
      });

      expect(report.reportType).toBe(DentalReportType.TREATMENT);
      const completedSec = report.sections.find((s) => s.id === 'completed_treatments');
      expect(completedSec?.tableData?.[0].procedure).toContain('Root Canal Access Opening');

      const planSec = report.sections.find((s) => s.id === 'treatment_plan_stages');
      expect(planSec?.tableData?.[0].plan).toBe('Molar Endodontic & Crown Rehabilitation');
    });

    it('generates Dental Examination Report with odontogram tooth register and imaging', async () => {
      const report = await service.generateDentalReport(mockClinicId, mockDoctorUser, {
        patientId: 'pt-1001',
        reportType: DentalReportType.EXAMINATION,
      });

      expect(report.reportType).toBe(DentalReportType.EXAMINATION);
      const toothRegister = report.sections.find((s) => s.id === 'tooth_conditions_table');
      expect(toothRegister?.tableData?.length).toBe(3);
      expect(toothRegister?.tableData?.some((t: any) => t.toothNumber === '#46')).toBe(true);

      const imaging = report.sections.find((s) => s.id === 'imaging_records');
      expect(imaging?.tableData?.[0].title).toBe('Pre-Op IOPA Radiograph Tooth #46');
    });

    it('generates Patient Progress Report with timeline and pain evolution', async () => {
      const report = await service.generateDentalReport(mockClinicId, mockDoctorUser, {
        patientId: 'pt-1001',
        reportType: DentalReportType.PROGRESS,
      });

      expect(report.reportType).toBe(DentalReportType.PROGRESS);
      const timelineSec = report.sections.find((s) => s.id === 'timeline_progress');
      expect(timelineSec?.content).toContain('Total Documented Consultations: 1');
      expect(timelineSec?.content).toContain('Initial Pain Score: 8/10');
    });

    it('generates Referral Report with targeted specialist and clinical summary', async () => {
      const report = await service.generateDentalReport(mockClinicId, mockDoctorUser, {
        patientId: 'pt-1001',
        reportType: DentalReportType.REFERRAL,
        referralSpecialty: 'Endodontist / Microscopic Surgery',
        referralDoctor: 'Dr. Ramesh Kumar',
        referralClinic: 'Advanced Endodontics Center',
        referralReason: 'Evaluation for calcified canal and microscopic apical surgery on tooth #46.',
      });

      expect(report.reportType).toBe(DentalReportType.REFERRAL);
      const dirSec = report.sections.find((s) => s.id === 'referral_header');
      expect(dirSec?.content).toContain('Dr. Ramesh Kumar');
      expect(dirSec?.content).toContain('Endodontist / Microscopic Surgery');

      const reasonSec = report.sections.find((s) => s.id === 'referral_reason');
      expect(reasonSec?.content).toContain('calcified canal');
    });
  });

  describe('saveDentalReport & getSavedPatientReports', () => {
    it('saves report to PatientDocument with audit tracking', async () => {
      const saveRes = await service.saveDentalReport(mockClinicId, mockDoctorUser, {
        patientId: 'pt-1001',
        reportType: DentalReportType.CONSULTATION,
        title: 'Consultation Examination Report - Rahul Sharma',
        content: {
          title: 'Consultation Examination Report - Rahul Sharma',
          executiveSummary: 'Root canal treatment session 1 completed.',
        },
      });

      expect(saveRes.success).toBe(true);
      expect(saveRes.documentId).toBe('new-doc-uuid-999');
      expect(prisma.patientDocument.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            clinicId: mockClinicId,
            category: 'Dental Report',
            doctorName: 'Dr. Jane Smith',
          }),
        }),
      );
    });

    it('retrieves previously saved patient reports from PatientDocument', async () => {
      const savedReports = await service.getSavedPatientReports(mockClinicId, 'pt-1001');
      expect(savedReports.length).toBe(1);
      expect(savedReports[0].title).toContain('Rahul Sharma');
      expect(savedReports[0].reportType).toBe('CONSULTATION');
    });
  });
});
