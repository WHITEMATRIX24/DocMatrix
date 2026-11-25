import { apiClient } from './apiClient';
import {
  getClinicSnapshot,
  PatientRecord,
  ClinicalNoteRecord,
  addPatientDocument,
} from './clinicStore';

export type DentalReportType =
  | 'CLINICAL_SUMMARY'
  | 'CONSULTATION'
  | 'TREATMENT'
  | 'EXAMINATION'
  | 'PROGRESS'
  | 'REFERRAL';

export interface ReportTypeDefinition {
  type: DentalReportType;
  title: string;
  badge: string;
  description: string;
  iconName: string;
  recommendedFor: string;
}

export const DENTAL_REPORT_TYPES: ReportTypeDefinition[] = [
  {
    type: 'CLINICAL_SUMMARY',
    title: 'Patient Clinical Summary',
    badge: 'Comprehensive',
    description: 'Complete overview of medical history, allergies, all recorded diagnoses, odontogram chart, treatments performed, active treatment plans, and medications.',
    iconName: 'FileText',
    recommendedFor: 'New patient intake, multi-disciplinary consultations, insurance or legal records.',
  },
  {
    type: 'CONSULTATION',
    title: 'Consultation Report',
    badge: 'Single Visit',
    description: 'Detailed report of a specific clinical visit, including chief complaint, pain severity, extraoral/intraoral exam, confirmed diagnosis, procedures, and prescriptions.',
    iconName: 'Stethoscope',
    recommendedFor: 'Post-consultation patient handout, insurance pre-authorization, specific treatment session review.',
  },
  {
    type: 'TREATMENT',
    title: 'Treatment & Procedure Report',
    badge: 'Procedures',
    description: 'Chronological and procedure-wise record of all treatments executed in clinic, materials used, tooth numbers (FDI), and ongoing multi-stage treatment plan status.',
    iconName: 'Activity',
    recommendedFor: 'Post-operative records, completed root canal or implant logs, billing justification.',
  },
  {
    type: 'EXAMINATION',
    title: 'Dental Examination Report',
    badge: 'Odontogram',
    description: 'Hard and soft tissue evaluation, tooth-by-tooth FDI odontogram findings (caries, restorations, crowns, RCT, missing), periodontal condition, and imaging on file.',
    iconName: 'Smile',
    recommendedFor: 'Preventive recalls, baseline dental checkups, full mouth rehabilitation workups.',
  },
  {
    type: 'PROGRESS',
    title: 'Patient Progress Report',
    badge: 'Outcomes',
    description: 'Longitudinal comparison across visits tracking pain score resolution, tissue healing, treatment plan completion percentages, and milestone achievement.',
    iconName: 'TrendingUp',
    recommendedFor: 'Orthodontic adjustments, periodontal maintenance, multi-stage implant healing.',
  },
  {
    type: 'REFERRAL',
    title: 'Specialist Referral Letter',
    badge: 'Formal',
    description: 'Official clinical referral letter addressed to a medical or dental specialist (Endodontist, Oral Surgeon, Orthodontist) detailing findings, urgency, and requested care.',
    iconName: 'Send',
    recommendedFor: 'External specialist referral, advanced CBCT/biopsy requests, hospital admissions.',
  },
];

export interface DentalReportSection {
  id: string;
  title: string;
  content: string;
  tableData?: Array<Record<string, any>>;
  badge?: string;
}

export interface DentalReportData {
  reportId: string;
  reportType: DentalReportType;
  title: string;
  generatedAt: string;
  generatedBy: string;
  clinic: {
    id?: string;
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    logo?: string | null;
  };
  patient: {
    id: string;
    patientCode: string;
    firstName: string;
    lastName: string;
    fullName: string;
    dateOfBirth?: string;
    age: string;
    gender: string;
    mobile: string;
    countryCode?: string;
    email?: string;
    address?: string;
    emergencyContact?: string | null;
    medicalSafetyAlerts?: any;
  };
  executiveSummary: string;
  sections: DentalReportSection[];
  odontogramSummary: {
    caries: string[];
    restored: string[];
    crowns: string[];
    rct: string[];
    missing: string[];
    healthyCount: number;
  };
  doctorSignoff: {
    doctorName: string;
    doctorTitle: string;
    registrationNumber: string;
    clinicName: string;
    clinicPhone: string;
    clinicEmail: string;
    signoffDate: string;
    signatureLine: string;
  };
  audit?: {
    isFinalized: boolean;
    source: string;
    version: string;
  };
}

export interface GenerateDentalReportParams {
  patientId: string;
  reportType: DentalReportType;
  consultationId?: string;
  startDate?: string;
  endDate?: string;
  referralSpecialty?: string;
  referralReason?: string;
  referralDoctor?: string;
  referralClinic?: string;
  customNotes?: string;
}

export interface SaveDentalReportParams {
  patientId: string;
  reportType: DentalReportType;
  title: string;
  content: DentalReportData;
  doctorName?: string;
  consultationId?: string;
  notes?: string;
}

export interface SavedDentalReportItem {
  id: string;
  title: string;
  category: string;
  fileName: string;
  fileSize: string;
  doctorName?: string;
  createdAt: string;
  reportType: DentalReportType;
  finalizedAt?: string;
  finalizedByName?: string;
  reportData?: DentalReportData | null;
  summary?: string | null;
}

/**
 * Fetches clinical patient data from backend or local store fallback.
 */
export async function fetchPatientClinicalData(
  patientId: string,
  options?: { consultationId?: string; startDate?: string; endDate?: string }
) {
  try {
    const params = new URLSearchParams();
    if (options?.consultationId) params.append('consultationId', options.consultationId);
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);

    const queryStr = params.toString() ? `?${params.toString()}` : '';
    const res = await apiClient.get<any>(`/reports/dental/patient/${encodeURIComponent(patientId)}${queryStr}`);
    if (res) return res;
  } catch (err) {
    console.warn('[DentalReportsApi] Backend fetch error, falling back to local snapshot:', err);
  }

  // Local snapshot fallback
  const snapshot = getClinicSnapshot();
  const patient = snapshot.patients.find(
    (p) => p.id.toLowerCase() === patientId.toLowerCase() || p.patientCode?.toLowerCase() === patientId.toLowerCase()
  );

  return {
    patient: patient || null,
    clinic: snapshot.clinicConfig || { name: 'DocMatrix Dental Clinic' },
    clinicalNotes: snapshot.clinicalNotes.filter((n) => n.patientId === patientId || n.patient?.id === patientId),
    toothConditions: snapshot.toothCharts[patientId] || {},
    treatmentPlans: snapshot.treatmentPlans.filter((p) => p.patientId === patientId || p.patient?.id === patientId),
    prescriptions: snapshot.prescriptions.filter((p) => p.patientId === patientId || p.patient?.id === patientId),
    appointments: snapshot.appointments.filter((a) => a.patientId === patientId),
    documents: snapshot.patientDocuments.filter((d) => d.patientId === patientId),
  };
}

/**
 * Generates structured dental report through backend or client-side clinical synthesis.
 */
export async function generateDentalReport(
  params: GenerateDentalReportParams
): Promise<DentalReportData> {
  try {
    const report = await apiClient.post<DentalReportData>('/reports/dental/generate', params);
    if (report && report.reportId) {
      return report;
    }
  } catch (err) {
    console.warn('[DentalReportsApi] Backend generation failed, synthesizing via client fallback:', err);
  }

  // Client-side fallback report generation using snapshot
  const snapshot = getClinicSnapshot();
  const patient = snapshot.patients.find(
    (p) => p.id.toLowerCase() === params.patientId.toLowerCase() || p.patientCode?.toLowerCase() === params.patientId.toLowerCase()
  );

  const notes = snapshot.clinicalNotes.filter(
    (n) => n.patientId === params.patientId || n.patient?.id === params.patientId
  );
  const selectedNote = params.consultationId ? notes.find((n) => n.id === params.consultationId) : notes[0];
  const conditions = snapshot.toothCharts[params.patientId] || {};

  const patientName = patient ? `${patient.firstName} ${patient.lastName}`.trim() : 'Patient';
  const patientAge = patient?.dateOfBirth ? `${new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()} yrs` : (patient?.age ? `${patient.age} yrs` : 'Unspecified');

  const odontogramSummary = {
    caries: Object.entries(conditions).filter(([_, c]: any) => c.condition === 'Caries').map(([t]) => `#${t}`),
    restored: Object.entries(conditions).filter(([_, c]: any) => c.condition === 'Restored').map(([t]) => `#${t}`),
    crowns: Object.entries(conditions).filter(([_, c]: any) => c.condition === 'Crown').map(([t]) => `#${t}`),
    rct: Object.entries(conditions).filter(([_, c]: any) => c.condition === 'RCT').map(([t]) => `#${t}`),
    missing: Object.entries(conditions).filter(([_, c]: any) => c.condition === 'Missing').map(([t]) => `#${t}`),
    healthyCount: Object.entries(conditions).filter(([_, c]: any) => c.condition === 'Healthy').length,
  };

  const sections: DentalReportSection[] = [
    {
      id: 'demographics',
      title: 'Patient Profile & Medical Alerts',
      content: `Patient ${patientName} (${patientAge}, ${patient?.gender || 'Undisclosed'}). Mobile: ${patient?.mobile || 'Unspecified'}.\nAllergies: ${patient?.allergies === 'yes' ? patient?.allergiesDetails || 'Allergies noted' : 'No known drug allergies reported.'}`,
    },
    {
      id: 'consultation_findings',
      title: 'Clinical Findings & Chief Complaint',
      content: selectedNote
        ? `Chief Complaint: ${selectedNote.chiefComplaint}\nDiagnosis: ${selectedNote.primaryDiagnosis}\nTreatment Rendered: ${selectedNote.treatmentPerformed || 'Consultation'}\nTooth: ${selectedNote.treatmentToothNumber ? `#${selectedNote.treatmentToothNumber}` : 'General'}`
        : 'No specific consultation selected.',
    },
    {
      id: 'odontogram_summary',
      title: 'Dental Chart Odontogram Status',
      content: `Caries: ${odontogramSummary.caries.join(', ') || 'None'}\nRestored: ${odontogramSummary.restored.join(', ') || 'None'}\nRCT: ${odontogramSummary.rct.join(', ') || 'None'}\nCrowns: ${odontogramSummary.crowns.join(', ') || 'None'}`,
    },
  ];

  return {
    reportId: `RPT-${Date.now().toString().slice(-6)}`,
    reportType: params.reportType,
    title: `${params.reportType.replace(/_/g, ' ')}: ${patientName}`,
    generatedAt: new Date().toISOString(),
    generatedBy: selectedNote?.doctorName || 'Attending Dentist',
    clinic: {
      name: snapshot.clinicConfig?.name || 'DocMatrix Dental Clinic',
      address: snapshot.clinicConfig?.address || 'Clinic Address',
      phone: snapshot.clinicConfig?.phone || '+91 80 1234 5678',
      email: snapshot.clinicConfig?.email || 'contact@docmatrix.test',
      logo: snapshot.clinicConfig?.logoUrl || null,
    },
    patient: {
      id: patient?.id || params.patientId,
      patientCode: patient?.patientCode || patient?.id || 'PT-1001',
      firstName: patient?.firstName || 'Patient',
      lastName: patient?.lastName || '',
      fullName: patientName,
      age: patientAge,
      gender: patient?.gender || 'Undisclosed',
      mobile: patient?.mobile || '',
      medicalSafetyAlerts: patient?.medicalSafetyAlerts,
    },
    executiveSummary: `Generated ${params.reportType.toLowerCase().replace(/_/g, ' ')} for ${patientName}. Contains clinical evaluation, odontogram status, and treatment documentation.`,
    sections,
    odontogramSummary,
    doctorSignoff: {
      doctorName: selectedNote?.doctorName || 'Dr. Attending Surgeon',
      doctorTitle: 'BDS, MDS - Dental Surgeon',
      registrationNumber: 'DCI Reg. Certified',
      clinicName: snapshot.clinicConfig?.name || 'DocMatrix Dental Clinic',
      clinicPhone: snapshot.clinicConfig?.phone || '',
      clinicEmail: snapshot.clinicConfig?.email || '',
      signoffDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      signatureLine: '____________________________________',
    },
    audit: {
      isFinalized: false,
      source: 'DOCMATRIX_CLIENT_SYNTHESIS',
      version: '1.0',
    },
  };
}

/**
 * Saves a finalized report to patient documents and medical history.
 */
export async function saveDentalReport(
  params: SaveDentalReportParams
): Promise<{ success: boolean; documentId?: string }> {
  try {
    const res = await apiClient.post<{ success: boolean; documentId: string }>(
      '/reports/dental/save',
      params
    );
    if (res && res.success) {
      // Sync document to local state
      addPatientDocument({
        patientId: params.patientId,
        title: params.title,
        category: 'Other',
        fileName: `${params.reportType.toLowerCase()}_report.json`,
        fileSize: '3 KB',
        doctor: params.doctorName,
        notes: JSON.stringify({
          reportType: params.reportType,
          finalizedAt: new Date().toISOString(),
          reportData: params.content,
        }),
      });
      return res;
    }
  } catch (err) {
    console.warn('[DentalReportsApi] Backend save failed, saving to local store:', err);
  }

  // Fallback to local clinicStore
  const localDoc = addPatientDocument({
    patientId: params.patientId,
    title: params.title,
    category: 'Other',
    fileName: `${params.reportType.toLowerCase()}_report_${Date.now()}.json`,
    fileSize: '3 KB',
    doctor: params.doctorName || 'Attending Doctor',
    notes: JSON.stringify({
      reportType: params.reportType,
      consultationId: params.consultationId,
      finalizedAt: new Date().toISOString(),
      reportData: params.content,
    }),
  });

  return { success: true, documentId: localDoc.id };
}

/**
 * Retrieves previously saved dental reports for a patient.
 */
export async function fetchSavedPatientReports(
  patientId: string
): Promise<SavedDentalReportItem[]> {
  try {
    const res = await apiClient.get<SavedDentalReportItem[]>(
      `/reports/dental/patient/${encodeURIComponent(patientId)}/saved`
    );
    if (Array.isArray(res) && res.length > 0) {
      return res;
    }
  } catch (err) {
    console.warn('[DentalReportsApi] Failed to fetch saved reports from backend:', err);
  }

  // Fallback: look up in clinicStore documents
  const snapshot = getClinicSnapshot();
  const docs = snapshot.patientDocuments.filter(
    (d) =>
      (d.patientId === patientId || d.patientId?.toLowerCase() === patientId.toLowerCase()) &&
      (d.title.includes('Report') || d.category === 'Other')
  );

  return docs.map((d) => {
    let parsedNotes: any = null;
    try {
      if (d.notes) parsedNotes = JSON.parse(d.notes);
    } catch {
      parsedNotes = {};
    }

    return {
      id: d.id,
      title: d.title,
      category: d.category,
      fileName: d.fileName,
      fileSize: d.fileSize,
      doctorName: d.doctor,
      createdAt: d.uploadDate,
      reportType: parsedNotes?.reportType || 'CLINICAL_SUMMARY',
      finalizedAt: parsedNotes?.finalizedAt || d.uploadDate,
      reportData: parsedNotes?.reportData || null,
      summary: parsedNotes?.reportData?.executiveSummary || null,
    };
  });
}
