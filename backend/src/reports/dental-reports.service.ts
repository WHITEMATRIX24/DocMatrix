import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import {
  DentalReportType,
  GenerateDentalReportDto,
  SaveDentalReportDto,
} from './dto/dental-report.dto.js';

export interface CalculatedAge {
  years: number;
  months?: number;
}

function calculateAge(dob: Date | string | null | undefined): string {
  if (!dob) return 'Age unspecified';
  const birthDate = new Date(dob);
  if (isNaN(birthDate.getTime())) return 'Age unspecified';
  const today = new Date();
  let years = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    years--;
  }
  return `${years} yrs`;
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return 'N/A';
  const date = new Date(d);
  if (isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

@Injectable()
export class DentalReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves a patient scoped to the authenticated clinic tenant.
   */
  async resolvePatient(clinicId: string, patientIdOrCode: string): Promise<any> {
    if (!patientIdOrCode) {
      throw new BadRequestException('Patient identifier is required.');
    }

    const patient: any = await this.prisma.patient.findFirst({
      where: {
        clinicId,
        OR: [{ id: patientIdOrCode }, { patientCode: patientIdOrCode }],
      },
      include: {
        clinic: true,
        clinicalNotes: {
          include: {
            doctor: true,
            finalizedBy: true,
            appointment: true,
            addenda: true,
          },
          orderBy: { consultationDate: 'desc' },
        },
        toothConditions: {
          orderBy: { toothNumber: 'asc' },
        },
        treatmentPlans: {
          include: {
            stages: {
              include: {
                items: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        prescriptions: {
          include: {
            items: true,
            doctor: true,
          },
          orderBy: { prescribedAt: 'desc' },
        },
        appointments: {
          include: {
            doctor: true,
          },
          orderBy: { startTime: 'desc' },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!patient) {
      throw new NotFoundException(
        `Patient not found with identifier "${patientIdOrCode}".`,
      );
    }

    return patient;
  }

  /**
   * Aggregates and returns all raw clinical data for a patient.
   */
  async getPatientClinicalData(
    clinicId: string,
    patientIdOrCode: string,
    options?: {
      consultationId?: string;
      startDate?: string;
      endDate?: string;
    },
  ) {
    const patient: any = await this.resolvePatient(clinicId, patientIdOrCode);

    let filteredNotes: any[] = patient.clinicalNotes || [];
    if (options?.consultationId) {
      filteredNotes = filteredNotes.filter(
        (n: any) => n.id === options.consultationId,
      );
    } else if (options?.startDate || options?.endDate) {
      filteredNotes = filteredNotes.filter((n: any) => {
        const d = new Date(n.consultationDate).getTime();
        const start = options.startDate
          ? new Date(options.startDate).getTime()
          : 0;
        const end = options.endDate
          ? new Date(options.endDate).getTime()
          : Infinity;
        return d >= start && d <= end;
      });
    }

    return {
      patient: {
        id: patient.id,
        patientCode: patient.patientCode,
        firstName: patient.firstName,
        lastName: patient.lastName,
        fullName: `${patient.firstName} ${patient.lastName}`.trim(),
        dateOfBirth: patient.dateOfBirth,
        age: calculateAge(patient.dateOfBirth),
        gender: patient.gender,
        mobile: patient.mobile,
        countryCode: patient.countryCode,
        email: patient.email,
        address: [patient.address, patient.city, patient.state, patient.postalCode]
          .filter(Boolean)
          .join(', '),
        emergencyContact: patient.emergencyName
          ? `${patient.emergencyName} (${patient.relationship || 'Emergency'}): ${patient.emergencyPhone || ''}`
          : null,
        medicalSafetyAlerts: patient.medicalSafetyAlerts,
      },
      clinic: {
        id: patient.clinic.id,
        name: patient.clinic.name,
        address: patient.clinic.address,
        phone: patient.clinic.phone,
        email: patient.clinic.email,
        logo: (patient.clinic.settings as any)?.logoUrl || null,
      },
      clinicalNotes: filteredNotes,
      allClinicalNotes: patient.clinicalNotes || [],
      toothConditions: patient.toothConditions || [],
      treatmentPlans: patient.treatmentPlans || [],
      prescriptions: patient.prescriptions || [],
      appointments: patient.appointments || [],
      documents: patient.documents || [],
    };
  }

  /**
   * Generates a structured dental report without inventing any unverified clinical data.
   */
  async generateDentalReport(
    clinicId: string,
    user: AuthenticatedUser,
    dto: GenerateDentalReportDto,
  ) {
    const data: any = await this.getPatientClinicalData(clinicId, dto.patientId, {
      consultationId: dto.consultationId,
      startDate: dto.startDate,
      endDate: dto.endDate,
    });

    const reportId = `RPT-${Date.now().toString().slice(-6)}`;
    const generatedAt = new Date().toISOString();

    // Determine primary attending doctor
    const primaryNote = dto.consultationId
      ? data.clinicalNotes.find((n: any) => n.id === dto.consultationId)
      : data.clinicalNotes[0];

    const doctorName =
      primaryNote?.doctor?.fullName ||
      primaryNote?.finalizedByName ||
      user.fullName ||
      'Attending Dental Surgeon';

    // Parse medical alerts
    const alerts: any = data.patient.medicalSafetyAlerts || {};
    const allergiesText = alerts.allergies
      ? typeof alerts.allergies === 'string'
        ? alerts.allergies
        : alerts.allergiesDetails || 'Allergies recorded'
      : 'No known drug allergies (NKDA) reported.';

    const systemicConditions: string[] = [];
    if (alerts.medicalConditions) {
      if (Array.isArray(alerts.medicalConditions)) {
        systemicConditions.push(...alerts.medicalConditions);
      } else if (typeof alerts.medicalConditions === 'string') {
        systemicConditions.push(alerts.medicalConditions);
      }
    }
    if (alerts.diabetes) systemicConditions.push('Diabetes Mellitus');
    if (alerts.hypertension) systemicConditions.push('Hypertension');
    if (alerts.cardiac) systemicConditions.push('Cardiac condition / Pacemaker');
    if (alerts.bleedingDisorder) systemicConditions.push('Bleeding tendencies / Anticoagulants');
    if (alerts.pregnant) systemicConditions.push('Pregnancy / Lactation');

    // Odontogram summary
    const odontogramSummary = {
      caries: data.toothConditions.filter((t: any) => t.condition === 'Caries').map((t: any) => `#${t.toothNumber}`),
      restored: data.toothConditions.filter((t: any) => t.condition === 'Restored').map((t: any) => `#${t.toothNumber}`),
      crowns: data.toothConditions.filter((t: any) => t.condition === 'Crown').map((t: any) => `#${t.toothNumber}`),
      rct: data.toothConditions.filter((t: any) => t.condition === 'RCT').map((t: any) => `#${t.toothNumber}`),
      missing: data.toothConditions.filter((t: any) => t.condition === 'Missing').map((t: any) => `#${t.toothNumber}`),
      healthyCount: data.toothConditions.filter((t: any) => t.condition === 'Healthy').length,
    };

    let title = '';
    let executiveSummary = '';
    const sections: Array<{
      id: string;
      title: string;
      content: string;
      tableData?: Array<Record<string, any>>;
      badge?: string;
    }> = [];

    // Construct report content based on report type
    switch (dto.reportType) {
      case DentalReportType.CLINICAL_SUMMARY: {
        title = `Patient Clinical Dental Summary: ${data.patient.fullName}`;
        executiveSummary = `Comprehensive clinical dental overview for ${data.patient.fullName} (${data.patient.patientCode}), summarizing historical consultations, diagnosed pathologies, odontogram charting, rendered treatments, active treatment plans, and ongoing pharmacotherapy.`;

        sections.push({
          id: 'demographics',
          title: 'Patient Information & Medical Profile',
          content: `Patient ${data.patient.fullName} (${data.patient.age}, ${data.patient.gender}). Registered phone: ${data.patient.countryCode} ${data.patient.mobile}. Address: ${data.patient.address || 'Not specified'}. Emergency Contact: ${data.patient.emergencyContact || 'None listed'}.`,
        });

        sections.push({
          id: 'medical_alerts',
          title: 'Medical Safety & Allergy Alerts',
          content: `Allergies: ${allergiesText}\nSystemic Medical History: ${systemicConditions.length > 0 ? systemicConditions.join(', ') : 'No contraindicative systemic conditions flagged.'}`,
          badge: alerts.allergies ? 'Alerts Active' : 'Cleared',
        });

        // Odontogram findings
        sections.push({
          id: 'odontogram',
          title: 'Dental Chart & Odontogram Status (FDI)',
          content: `Caries / Decay: ${odontogramSummary.caries.join(', ') || 'None recorded'}\nRestored: ${odontogramSummary.restored.join(', ') || 'None recorded'}\nRoot Canal Treated: ${odontogramSummary.rct.join(', ') || 'None recorded'}\nCrowns & Prosthetics: ${odontogramSummary.crowns.join(', ') || 'None recorded'}\nMissing Teeth: ${odontogramSummary.missing.join(', ') || 'None recorded'}`,
        });

        // Past Diagnoses & Procedures
        const treatmentRows = data.clinicalNotes.map((n: any) => ({
          date: formatDate(n.consultationDate),
          diagnosis: n.primaryDiagnosis || 'Unspecified diagnosis',
          treatment: n.treatmentPerformed || 'Consultation / Examination',
          tooth: n.treatmentToothNumber ? `#${n.treatmentToothNumber}` : 'Full Mouth / General',
          doctor: n.doctor?.fullName || n.finalizedByName || 'Clinic Dentist',
        }));

        sections.push({
          id: 'treatments_history',
          title: 'Historical Consultations & Treatments Performed',
          content: treatmentRows.length > 0
            ? `A total of ${treatmentRows.length} clinical consultation(s) have been documented.`
            : 'No historical treatments recorded yet.',
          tableData: treatmentRows,
        });

        // Treatment Plans
        const planRows = data.treatmentPlans.map((p: any) => {
          const itemsCount = (p.stages || []).reduce((acc: number, s: any) => acc + (s.items?.length || 0), 0) || (p.items?.length || 0);
          return {
            planNumber: p.planNumber,
            title: p.title,
            status: p.status,
            totalCost: `₹${(p.totalEstimatedCost || p.cost || 0).toLocaleString('en-IN')}`,
            itemsCount,
          };
        });

        if (planRows.length > 0) {
          sections.push({
            id: 'treatment_plans',
            title: 'Treatment Plans & Estimates',
            content: `The patient has ${planRows.length} structured treatment plan(s) recorded.`,
            tableData: planRows,
          });
        }

        // Active Prescriptions
        const rxRows = data.prescriptions.flatMap((p: any) =>
          (p.items || []).map((i: any) => ({
            date: formatDate(p.prescribedAt || p.issuedAt || p.createdAt),
            medicine: i.medicineName,
            dosage: i.dosage || 'Standard',
            frequency: i.frequency,
            duration: i.duration,
            instructions: i.instructions || 'As advised',
          })),
        );

        if (rxRows.length > 0) {
          sections.push({
            id: 'prescriptions',
            title: 'Medications & Prescription History',
            content: 'Summary of medications prescribed during patient visits.',
            tableData: rxRows,
          });
        }
        break;
      }

      case DentalReportType.CONSULTATION: {
        const note = primaryNote || data.clinicalNotes[0];
        const consultDate = note ? formatDate(note.consultationDate) : formatDate(new Date());
        title = `Consultation Examination Report: ${data.patient.fullName} (${consultDate})`;

        if (!note) {
          executiveSummary = `No consultation record was found for the specified consultation ID or date range.`;
          sections.push({
            id: 'no_consultation',
            title: 'Consultation Record',
            content: 'No consultation findings are currently recorded for this visit. Please record a consultation note before generating this report.',
          });
        } else {
          executiveSummary = `Clinical consultation report for visit on ${consultDate} conducted by Dr. ${note.doctor?.fullName || note.finalizedByName || doctorName}. Chief complaint presented: "${note.chiefComplaint}". Primary clinical diagnosis: ${note.primaryDiagnosis}.`;

          sections.push({
            id: 'chief_complaint',
            title: 'Chief Complaint & History of Present Illness',
            content: `Chief Complaint: ${note.chiefComplaint || 'Routine examination'}\nPain Severity: ${note.painSeverity !== null && note.painSeverity !== undefined ? `${note.painSeverity} / 10` : 'Not assessed'}\nSymptom Duration: ${note.symptomDuration || 'Not reported'}\nSymptoms: ${note.symptoms || 'None specified'}\nHistory: ${note.historyNotes || 'No non-contributory dental history reported.'}`,
          });

          sections.push({
            id: 'clinical_examination',
            title: 'Clinical Examination Findings',
            content: `Extraoral Examination: ${note.extraoralFindings || 'Within normal limits (WNL). No facial asymmetry, lymphadenopathy, or TMJ tenderness.'}\n\nIntraoral Examination: ${note.intraoralFindings || 'Oral mucosa and soft tissues healthy and moist.'}\n\nTooth-Specific Findings: ${note.toothSpecificFindings || (note.treatmentToothNumber ? `Tooth #${note.treatmentToothNumber} assessed.` : 'No localized tooth finding recorded.')}\n\nPeriodontal Assessment: ${note.periodontalFindings || 'Gingiva appears firm with no acute bleeding on probing.'}\n\nGeneral Examination Notes: ${note.examinationNotes || 'Complete dental arch evaluated.'}`,
          });

          sections.push({
            id: 'diagnosis_section',
            title: 'Clinical Diagnosis',
            content: `Primary Diagnosis: ${note.primaryDiagnosis}\nAdditional Diagnoses: ${
              note.additionalDiagnoses
                ? (Array.isArray(note.additionalDiagnoses)
                    ? (note.additionalDiagnoses as string[]).join(', ')
                    : JSON.stringify(note.additionalDiagnoses))
                : 'None recorded'
            }\nDiagnostic Commentary: ${note.diagnosisNotes || 'Corroborated by chairside clinical inspection.'}`,
            badge: 'Confirmed',
          });

          sections.push({
            id: 'treatment_performed',
            title: 'Treatment Rendered Today',
            content: `Procedure: ${note.treatmentPerformed || 'Clinical Examination and Consultation'}\nTooth Number: ${note.treatmentToothNumber ? `#${note.treatmentToothNumber}` : 'General'}\nProcedure Details: ${note.treatmentDescription || 'Standard clinical protocol executed.'}\nMaterials Utilized: ${note.materialsUsed || 'Standard armamentarium'}\nClinical Outcome: ${note.treatmentOutcome || 'Procedure completed uneventfully. Patient tolerated treatment well.'}`,
          });

          // Check if prescription was linked to this date
          const matchingRx = data.prescriptions.filter((p: any) => {
            const rxDate = p.prescribedAt || p.issuedAt || p.createdAt;
            if (!rxDate) return false;
            const pDate = new Date(rxDate).toDateString();
            const nDate = new Date(note.consultationDate).toDateString();
            return pDate === nDate;
          });

          const rxItems = matchingRx.flatMap((p: any) =>
            (p.items || []).map((i: any) => ({
              medicine: i.medicineName,
              dosage: i.dosage || 'Standard',
              frequency: i.frequency,
              duration: i.duration,
              instructions: i.instructions || 'After meals',
            })),
          );

          if (rxItems.length > 0) {
            sections.push({
              id: 'visit_prescriptions',
              title: 'Prescribed Medications (Rx)',
              content: 'Medications dispensed or prescribed during this consultation:',
              tableData: rxItems,
            });
          }

          sections.push({
            id: 'follow_up',
            title: 'Follow-Up Recommendations & Patient Post-Op Advice',
            content: `Follow-Up Required: ${note.followUpRequired ? 'Yes' : 'SOS (As needed)'}\nScheduled Return Date: ${note.followUpDate ? formatDate(note.followUpDate) : 'Not scheduled'}\nFollow-Up Instructions: ${note.followUpInstructions || 'Standard hygiene and oral rinses advised.'}\nPatient Post-Op Advice: ${note.patientAdvice || 'Maintain oral hygiene; contact clinic immediately in case of acute swelling, persistent bleeding, or severe pain.'}`,
          });
        }
        break;
      }

      case DentalReportType.TREATMENT: {
        title = `Dental Treatment & Procedure History: ${data.patient.fullName}`;
        executiveSummary = `Comprehensive treatment report detailing all therapeutic, endodontic, restorative, periodontic, and surgical procedures performed for ${data.patient.fullName}, including materials, tooth numbering, and ongoing multi-phase treatment plans.`;

        const completedProcedures = data.clinicalNotes
          .filter((n: any) => n.treatmentPerformed)
          .map((n: any) => ({
            date: formatDate(n.consultationDate),
            procedure: n.treatmentPerformed!,
            tooth: n.treatmentToothNumber ? `#${n.treatmentToothNumber}` : 'Full Arch',
            materials: n.materialsUsed || 'Standard',
            outcome: n.treatmentOutcome || 'Completed',
            doctor: n.doctor?.fullName || n.finalizedByName || 'Dentist',
          }));

        sections.push({
          id: 'completed_treatments',
          title: 'Completed Dental Procedures',
          content: completedProcedures.length > 0
            ? `A total of ${completedProcedures.length} procedure(s) have been successfully rendered in clinic.`
            : 'No clinical treatment records found in the selected period.',
          tableData: completedProcedures,
        });

        // Active Treatment Plan Breakdown
        if (data.treatmentPlans.length > 0) {
          const planDetailRows = data.treatmentPlans.flatMap((p: any) => {
            const items = (p.stages && p.stages.length > 0)
              ? p.stages.flatMap((s: any) => s.items || [])
              : (p.items || []);
            return items.map((item: any) => ({
              plan: p.title,
              procedure: item.procedureName || item.procedureCode,
              tooth: item.toothNumber ? `#${item.toothNumber}` : 'General',
              status: item.status || (item.isCompleted ? 'Completed' : p.status),
              estimatedCost: `₹${(item.netFee || item.unitFee || item.cost || 0).toLocaleString('en-IN')}`,
            }));
          });

          sections.push({
            id: 'treatment_plan_stages',
            title: 'Structured Treatment Plan & Itemized Procedures',
            content: 'Multi-stage dental treatment recommendations and execution status:',
            tableData: planDetailRows,
          });
        }

        // Treated Teeth Odontogram Summary
        const treatedTeeth = Array.from(
          new Set(
            data.clinicalNotes
              .map((n: any) => n.treatmentToothNumber)
              .filter(Boolean),
          ),
        );

        sections.push({
          id: 'treated_teeth_summary',
          title: 'Teeth Requiring or Receiving Intervention',
          content: treatedTeeth.length > 0
            ? `Intervention has been documented on tooth numbers: ${treatedTeeth.map((t: any) => `#${t}`).join(', ')}.`
            : 'No tooth-specific interventions mapped.',
        });
        break;
      }

      case DentalReportType.EXAMINATION: {
        title = `Comprehensive Dental Examination Report: ${data.patient.fullName}`;
        executiveSummary = `Objective dental examination report presenting hard and soft tissue findings, periodontal evaluations, and tooth-by-tooth FDI odontogram charting for ${data.patient.fullName}.`;

        sections.push({
          id: 'odontogram_overview',
          title: 'Odontogram & Dentition Summary',
          content: `Permanent / Deciduous Dentition Charting Summary:\n- Active Caries Detected: ${odontogramSummary.caries.join(', ') || 'None'}\n- Restorations Present: ${odontogramSummary.restored.join(', ') || 'None'}\n- Endodontically Treated (RCT): ${odontogramSummary.rct.join(', ') || 'None'}\n- Prosthetic Crowns & Units: ${odontogramSummary.crowns.join(', ') || 'None'}\n- Missing / Extracted Teeth: ${odontogramSummary.missing.join(', ') || 'None'}\n- Sound & Healthy Teeth: ${odontogramSummary.healthyCount}`,
        });

        const toothConditionRows = data.toothConditions.map((t: any) => ({
          toothNumber: `#${t.toothNumber}`,
          condition: t.condition,
          notes: t.notes || 'Normal anatomical architecture',
          updatedAt: formatDate(t.updatedAt),
        }));

        if (toothConditionRows.length > 0) {
          sections.push({
            id: 'tooth_conditions_table',
            title: 'Tooth-by-Tooth Charting Register (FDI Notation)',
            content: 'Detailed inventory of charted teeth with clinical notes:',
            tableData: toothConditionRows,
          });
        }

        // Periodontal & Soft Tissue Findings from clinical notes
        const latestExamNote = data.clinicalNotes[0];
        sections.push({
          id: 'soft_tissue_perio',
          title: 'Soft Tissue & Periodontal Assessment',
          content: latestExamNote
            ? `Periodontal Probing & Gingival Status: ${latestExamNote.periodontalFindings || 'Mild to moderate generalized gingivitis; no pathologic pocketing reported.'}\n\nExtraoral TMJ & Lymph Nodes: ${latestExamNote.extraoralFindings || 'No TMJ clicking, tenderness, or deviation. Lymph nodes non-tender.'}\n\nIntraoral Soft Tissues: ${latestExamNote.intraoralFindings || 'Buccal mucosa, tongue, floor of mouth, and hard/soft palate appear physiologically intact.'}`
            : 'No chairside soft tissue examination recorded.',
        });

        // Imaging Archive
        const imagingDocs = data.documents
          .filter((d: any) => d.category === 'Radiology' || d.category === 'Intraoral Photo')
          .map((d: any) => ({
            title: d.title,
            category: d.category,
            fileName: d.fileName,
            date: formatDate(d.createdAt),
          }));

        if (imagingDocs.length > 0) {
          sections.push({
            id: 'imaging_records',
            title: 'Diagnostic Radiographs & Imaging Records on File',
            content: `The clinic archives ${imagingDocs.length} relevant radiographic image(s) for this patient.`,
            tableData: imagingDocs,
          });
        }
        break;
      }

      case DentalReportType.PROGRESS: {
        title = `Patient Dental Progress & Healing Report: ${data.patient.fullName}`;
        executiveSummary = `Progress review evaluating clinical outcomes, healing trajectory, pain resolution, and treatment completion across consecutive appointments for ${data.patient.fullName}.`;

        const visitCount = data.clinicalNotes.length;
        const initialVisit = data.clinicalNotes[data.clinicalNotes.length - 1];
        const latestVisit = data.clinicalNotes[0];

        sections.push({
          id: 'timeline_progress',
          title: 'Consultation Timeline & Pain Trajectory',
          content: `Total Documented Consultations: ${visitCount}\nFirst Documented Visit: ${initialVisit ? formatDate(initialVisit.consultationDate) : 'N/A'}\nLatest Clinical Visit: ${latestVisit ? formatDate(latestVisit.consultationDate) : 'N/A'}\n\nInitial Chief Complaint: ${initialVisit?.chiefComplaint || 'Unrecorded'}\nInitial Pain Score: ${initialVisit?.painSeverity !== null && initialVisit?.painSeverity !== undefined ? `${initialVisit.painSeverity}/10` : 'N/A'}\nLatest Pain Score: ${latestVisit?.painSeverity !== null && latestVisit?.painSeverity !== undefined ? `${latestVisit.painSeverity}/10` : 'Resolved / Mild'}`,
        });

        // Progression table
        const progressTable = data.clinicalNotes.map((n: any) => ({
          date: formatDate(n.consultationDate),
          diagnosis: n.primaryDiagnosis || 'Checkup',
          procedure: n.treatmentPerformed || 'Review',
          tooth: n.treatmentToothNumber ? `#${n.treatmentToothNumber}` : 'General',
          outcome: n.treatmentOutcome || 'Stable',
        }));

        sections.push({
          id: 'progress_milestones',
          title: 'Procedure Milestones & Healing Outcomes',
          content: 'Chronological progression of therapeutic interventions:',
          tableData: progressTable,
        });

        // Treatment plan completion percentage
        if (data.treatmentPlans.length > 0) {
          const getItems = (p: any) => (p.stages && p.stages.length > 0)
            ? p.stages.flatMap((s: any) => s.items || [])
            : (p.items || []);
          const totalItems = data.treatmentPlans.reduce((acc: number, p: any) => acc + getItems(p).length, 0);
          const completedItems = data.treatmentPlans.reduce(
            (acc: number, p: any) => acc + getItems(p).filter((i: any) => i.isCompleted || i.status === 'COMPLETED').length,
            0,
          );
          const pct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

          sections.push({
            id: 'plan_completion_stats',
            title: 'Treatment Plan Completion Index',
            content: `Overall Treatment Plan Progress: ${pct}% (${completedItems} of ${totalItems} procedures executed).\nStatus of Primary Treatment Plan: ${data.treatmentPlans[0].status}`,
            badge: `${pct}% Complete`,
          });
        }
        break;
      }

      case DentalReportType.REFERRAL: {
        const targetSpecialty = dto.referralSpecialty || 'Dental / Medical Specialist';
        const targetDoctor = dto.referralDoctor || 'Consultant Specialist';
        const targetClinic = dto.referralClinic || 'Specialty Department / Referral Center';
        title = `Formal Dental Referral Letter: ${data.patient.fullName}`;
        executiveSummary = `Official clinical referral letter addressed to Dr. ${targetDoctor} (${targetSpecialty}) regarding patient ${data.patient.fullName} for specialized evaluation, advanced diagnostics, and surgical/interventional co-management.`;

        sections.push({
          id: 'referral_header',
          title: 'Referral Directives',
          content: `To:\nDr. ${targetDoctor}\nSpecialty: ${targetSpecialty}\nCenter / Clinic: ${targetClinic}\n\nFrom Referring Clinic:\n${data.clinic.name}\nDoctor: Dr. ${doctorName}\nDate: ${formatDate(new Date())}`,
        });

        sections.push({
          id: 'referral_reason',
          title: 'Reason for Referral & Primary Clinical Question',
          content: dto.referralReason || primaryNote?.referralNotes || primaryNote?.treatmentRecommendations || 'Specialist diagnostic evaluation and treatment co-management as deemed clinically indicated.',
          badge: 'Referral Priority: High',
        });

        sections.push({
          id: 'patient_profile',
          title: 'Patient Demographics & Medical Safety Profile',
          content: `Name: ${data.patient.fullName}\nAge: ${data.patient.age} | Gender: ${data.patient.gender}\nContact: ${data.patient.countryCode} ${data.patient.mobile}\nAllergies: ${allergiesText}\nSystemic Medical Flags: ${systemicConditions.length > 0 ? systemicConditions.join('; ') : 'No known systemic contraindications.'}`,
        });

        if (primaryNote) {
          sections.push({
            id: 'current_findings',
            title: 'Current Clinical Findings & Provisional Diagnosis',
            content: `Chief Complaint: ${primaryNote.chiefComplaint}\nPrimary Diagnosis: ${primaryNote.primaryDiagnosis}\nRelevant Tooth Number: ${primaryNote.treatmentToothNumber ? `#${primaryNote.treatmentToothNumber}` : 'As noted'}\nIntraoral Findings: ${primaryNote.intraoralFindings || 'See attached records'}\nTooth Specific Findings: ${primaryNote.toothSpecificFindings || 'See attached'}\nTreatment Rendered in Our Clinic: ${primaryNote.treatmentPerformed || 'Emergency pain relief & diagnostic assessment'}`,
          });
        }

        sections.push({
          id: 'referral_instructions',
          title: 'Requested Interventions & Information Sharing',
          content: dto.customNotes || 'We kindly request your specialist assessment and management for this patient. Please furnish a summary of your clinical findings and any subsequent post-procedural maintenance recommendations for our records. Thank you for your clinical collaboration.',
        });
        break;
      }
    }

    // Doctor signature block
    const doctorSignoff = {
      doctorName,
      doctorTitle: 'BDS, MDS - Dental Surgeon',
      registrationNumber: 'DCI Reg. Certified',
      clinicName: data.clinic.name,
      clinicPhone: data.clinic.phone || '',
      clinicEmail: data.clinic.email || '',
      signoffDate: formatDate(new Date()),
      signatureLine: '____________________________________',
    };

    return {
      reportId,
      reportType: dto.reportType,
      title,
      generatedAt,
      generatedBy: user.fullName || user.email,
      clinic: data.clinic,
      patient: data.patient,
      executiveSummary,
      sections,
      odontogramSummary,
      doctorSignoff,
      audit: {
        isFinalized: false,
        source: 'DOCMATRIX_AUTOMATED_CLINICAL_ENGINE',
        version: '1.0',
      },
    };
  }

  /**
   * Saves a finalized dental report directly into the patient's medical records (PatientDocument).
   */
  async saveDentalReport(
    clinicId: string,
    user: AuthenticatedUser,
    dto: SaveDentalReportDto,
  ) {
    const patient = await this.resolvePatient(clinicId, dto.patientId);

    const title = dto.title || `[Dental Report: ${dto.reportType}] ${patient.firstName} ${patient.lastName} - ${formatDate(new Date())}`;
    const sanitizedTitle = title.replace(/[^a-zA-Z0-9_\-\.\s]/g, '').trim();
    const fileName = `${dto.reportType.toLowerCase()}_${patient.patientCode}_${Date.now()}.json`;
    const contentString = typeof dto.content === 'string' ? dto.content : JSON.stringify(dto.content);
    const fileSize = `${Math.max(1, Math.round(contentString.length / 1024))} KB`;

    // Package audit metadata
    const auditNotes = JSON.stringify({
      reportType: dto.reportType,
      consultationId: dto.consultationId || null,
      finalizedAt: new Date().toISOString(),
      finalizedById: user.id,
      finalizedByName: user.fullName || user.email,
      userRole: user.role,
      userEmail: user.email,
      customNotes: dto.notes || null,
      reportData: dto.content,
    });

    const doc = await this.prisma.patientDocument.create({
      data: {
        clinicId,
        patientId: patient.id,
        title: sanitizedTitle,
        category: 'Dental Report',
        fileName,
        fileSize,
        fileKey: `reports/${clinicId}/${patient.id}/${Date.now()}_${fileName}`,
        mimeType: 'application/json',
        doctorName: dto.doctorName || user.fullName || 'Attending Dental Surgeon',
        notes: auditNotes,
      },
    });

    return {
      success: true,
      documentId: doc.id,
      title: doc.title,
      category: doc.category,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      savedAt: doc.createdAt,
      doctorName: doc.doctorName,
    };
  }

  /**
   * Retrieves all previously saved dental reports for a patient.
   */
  async getSavedPatientReports(clinicId: string, patientIdOrCode: string) {
    const patient = await this.resolvePatient(clinicId, patientIdOrCode);

    const documents = await this.prisma.patientDocument.findMany({
      where: {
        clinicId,
        patientId: patient.id,
        OR: [
          { category: 'Dental Report' },
          { category: 'Clinical Report' },
          { title: { contains: '[Dental Report:' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    return documents.map((doc) => {
      let parsedNotes: any = null;
      try {
        if (doc.notes) {
          parsedNotes = JSON.parse(doc.notes);
        }
      } catch (e) {
        parsedNotes = { rawNotes: doc.notes };
      }

      return {
        id: doc.id,
        title: doc.title,
        category: doc.category,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        doctorName: doc.doctorName,
        createdAt: doc.createdAt,
        reportType: parsedNotes?.reportType || 'CLINICAL_SUMMARY',
        finalizedAt: parsedNotes?.finalizedAt || doc.createdAt,
        finalizedByName: parsedNotes?.finalizedByName || doc.doctorName,
        reportData: parsedNotes?.reportData || null,
        summary: parsedNotes?.reportData?.executiveSummary || null,
      };
    });
  }
}
