import { useSyncExternalStore } from 'react'

export type MedicalAnswer = 'yes' | 'no' | 'unknown'

export interface PatientRecord {
  id: string
  firstName: string
  lastName: string
  age: string
  dateOfBirth: string
  gender: string
  mobile: string
  countryCode: string
  email: string
  language: string
  city: string
  state: string
  postalCode: string
  address: string
  emergencyName: string
  emergencyPhone: string
  relationship: string
  allergies: MedicalAnswer
  allergiesDetails: string
  medications: MedicalAnswer
  medicationsDetails: string
  conditions: MedicalAnswer
  conditionsDetails: string
  createdAt: string
}

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'checked-in'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'no-show'

export type AppointmentPriority = 'normal' | 'urgent' | 'emergency'

export interface RescheduleRecord {
  previousDate: string
  previousTime: string
  newDate: string
  newTime: string
  reason: string
  changedAt: string
}

export interface StatusHistoryRecord {
  status: AppointmentStatus
  timestamp: string
  note?: string
}

export interface AppointmentRecord {
  id: string
  patientId: string
  doctor: string
  chair?: string
  treatmentType?: string
  visitType: string
  date: string
  time: string
  durationMinutes?: number
  status: AppointmentStatus
  priority?: AppointmentPriority
  notes?: string
  isWalkIn?: boolean
  queueToken?: string
  checkInTime?: string
  consultationStartTime?: string
  completedTime?: string
  cancellationReason?: string
  rescheduleHistory?: RescheduleRecord[]
  statusHistory?: StatusHistoryRecord[]
  remindersSent?: {
    type: 'confirmation' | '24h' | '2h' | 'whatsapp'
    sentAt: string
    recipient: string
  }[]
  createdAt: string
}

export interface ClinicalNoteRecord {
  id: string
  patientId: string
  visitDate: string
  complaint: string
  findings: string
  plan: string
  createdAt: string
}

export interface InvoiceRecord {
  id: string
  patientId: string
  description: string
  amount: number
  status: 'Unpaid' | 'Paid'
  createdAt: string
}

export interface TreatmentPlanRecord {
  id: string
  patientId: string
  procedure: string
  category: string
  toothNumber?: string
  status: 'Proposed' | 'Accepted' | 'In Progress' | 'Completed' | 'Pending'
  cost: number
  doctor: string
  notes?: string
  date: string
}

export interface PatientDocumentRecord {
  id: string
  patientId: string
  title: string
  category: 'Radiology' | 'Intraoral Photo' | 'Lab Report' | 'Prescription' | 'Consent' | 'Other'
  fileName: string
  fileSize: string
  uploadDate: string
  doctor?: string
  url?: string
}

export interface PatientConsentRecord {
  id: string
  patientId: string
  consentType: string
  status: 'Signed' | 'Pending' | 'Declined'
  dateRecorded: string
  recordedBy: string
  documentRef?: string
  notes?: string
}

export interface DentistSchedule {
  id: string
  name: string
  specialization: string
  chair: string
  color: string
  workingDays: number[] // 0 = Sunday, 1 = Monday ... 6 = Saturday
  shiftStart: string // "09:00"
  shiftEnd: string // "18:00"
  lunchStart: string // "13:00"
  lunchEnd: string // "14:00"
  leaveDates: string[] // "YYYY-MM-DD"
}

export interface TreatmentType {
  id: string
  name: string
  category: string
  defaultDurationMinutes: number
  standardFee: number
}

// Predefined Dentists
export const DENTISTS: DentistSchedule[] = [
  {
    id: 'doc-1',
    name: 'Dr. Arun Kumar',
    specialization: 'Orthodontics & Aligners',
    chair: 'Chair 1',
    color: '#0ea5e9',
    workingDays: [1, 2, 3, 4, 5, 6],
    shiftStart: '09:00',
    shiftEnd: '18:00',
    lunchStart: '13:00',
    lunchEnd: '14:00',
    leaveDates: []
  },
  {
    id: 'doc-2',
    name: 'Dr. Priya Nair',
    specialization: 'Endodontics & Root Canal',
    chair: 'Chair 2',
    color: '#10b981',
    workingDays: [1, 2, 3, 4, 5],
    shiftStart: '09:30',
    shiftEnd: '17:30',
    lunchStart: '13:00',
    lunchEnd: '14:00',
    leaveDates: []
  },
  {
    id: 'doc-3',
    name: 'Dr. Tariq Antoun',
    specialization: 'Oral & Maxillofacial Surgery',
    chair: 'Chair 3',
    color: '#8b5cf6',
    workingDays: [2, 3, 4, 5, 6],
    shiftStart: '10:00',
    shiftEnd: '19:00',
    lunchStart: '14:00',
    lunchEnd: '15:00',
    leaveDates: []
  },
  {
    id: 'doc-4',
    name: 'Dr. Sarah Thomas',
    specialization: 'Pediatric & Preventive Dentistry',
    chair: 'Chair 4',
    color: '#f59e0b',
    workingDays: [1, 3, 5, 6],
    shiftStart: '09:00',
    shiftEnd: '16:00',
    lunchStart: '12:30',
    lunchEnd: '13:30',
    leaveDates: []
  }
]

// Predefined Treatments
export const DENTAL_TREATMENTS: TreatmentType[] = [
  { id: 'trt-1', name: 'Comprehensive Dental Examination', category: 'Preventive', defaultDurationMinutes: 30, standardFee: 500 },
  { id: 'trt-2', name: 'Ultrasonic Scaling & Polishing', category: 'Preventive', defaultDurationMinutes: 45, standardFee: 1200 },
  { id: 'trt-3', name: 'Composite Dental Restoration (Filling)', category: 'Restorative', defaultDurationMinutes: 45, standardFee: 1800 },
  { id: 'trt-4', name: 'Root Canal Treatment (Single Sitting)', category: 'Endodontics', defaultDurationMinutes: 60, standardFee: 4500 },
  { id: 'trt-5', name: 'Crown & Bridge Preparation', category: 'Prosthodontics', defaultDurationMinutes: 60, standardFee: 6500 },
  { id: 'trt-6', name: 'Tooth Extraction (Simple)', category: 'Oral Surgery', defaultDurationMinutes: 30, standardFee: 1200 },
  { id: 'trt-7', name: 'Surgical Wisdom Tooth Removal', category: 'Oral Surgery', defaultDurationMinutes: 60, standardFee: 5000 },
  { id: 'trt-8', name: 'Orthodontic Bracket Adjustment', category: 'Orthodontics', defaultDurationMinutes: 30, standardFee: 1500 },
  { id: 'trt-9', name: 'Clear Aligner Scan & Assessment', category: 'Orthodontics', defaultDurationMinutes: 45, standardFee: 3000 },
  { id: 'trt-10', name: 'Laser Teeth Whitening', category: 'Cosmetic', defaultDurationMinutes: 60, standardFee: 8000 },
  { id: 'trt-11', name: 'Pediatric Fluoride & Sealant', category: 'Pediatric', defaultDurationMinutes: 30, standardFee: 1500 },
  { id: 'trt-12', name: 'Emergency Pain Relief Consultation', category: 'Emergency', defaultDurationMinutes: 30, standardFee: 800 }
]

export const CLINIC_CONFIG = {
  openingTime: '09:00',
  closingTime: '19:00',
  slotDurationMinutes: 30,
  walkInTokenPrefix: 'W-',
  clinicPhone: '+91 98765 43210',
  clinicName: 'DocMatrix Dental Clinic',
  clinicAddress: 'Suite 401, MedTech Health City'
}

// Initial seed data
const initialPatients: PatientRecord[] = [
  {
    id: 'pt-1001',
    firstName: 'Meera',
    lastName: 'Nambiar',
    age: '34',
    dateOfBirth: '1990-04-12',
    gender: 'female',
    mobile: '9447123456',
    countryCode: '+91',
    email: 'meera.nambiar@example.com',
    language: 'English, Malayalam',
    city: 'Kochi',
    state: 'Kerala',
    postalCode: '682001',
    address: '42 Orchid Park, Marine Drive',
    emergencyName: 'Suresh Nambiar',
    emergencyPhone: '9447123457',
    relationship: 'Spouse',
    allergies: 'yes',
    allergiesDetails: 'Penicillin allergy, Latex sensitivity',
    medications: 'yes',
    medicationsDetails: 'Amoxicillin contraindicated; Paracetamol as needed',
    conditions: 'yes',
    conditionsDetails: 'Mild Asthma',
    createdAt: '2026-01-10T10:00:00.000Z'
  },
  {
    id: 'PAT-1001',
    firstName: 'Aarav',
    lastName: 'Sharma',
    age: '32',
    dateOfBirth: '1992-05-14',
    gender: 'male',
    mobile: '9845012345',
    countryCode: '+91',
    email: 'aarav.sharma@example.com',
    language: 'English, Hindi',
    city: 'Kochi',
    state: 'Kerala',
    postalCode: '682001',
    address: '14/2 Palm Meadows',
    emergencyName: 'Meera Sharma',
    emergencyPhone: '9845012346',
    relationship: 'Spouse',
    allergies: 'yes',
    allergiesDetails: 'Penicillin, Latex gloves',
    medications: 'no',
    medicationsDetails: '',
    conditions: 'no',
    conditionsDetails: '',
    createdAt: new Date().toISOString()
  },
  {
    id: 'PAT-1002',
    firstName: 'Devika',
    lastName: 'Menon',
    age: '28',
    dateOfBirth: '1996-08-22',
    gender: 'female',
    mobile: '9744123456',
    countryCode: '+91',
    email: 'devika.menon@example.com',
    language: 'Malayalam, English',
    city: 'Ernakulam',
    state: 'Kerala',
    postalCode: '682016',
    address: '8B Sky High Towers',
    emergencyName: 'Ramesh Menon',
    emergencyPhone: '9744123457',
    relationship: 'Father',
    allergies: 'no',
    allergiesDetails: '',
    medications: 'no',
    medicationsDetails: '',
    conditions: 'no',
    conditionsDetails: '',
    createdAt: new Date().toISOString()
  },
  {
    id: 'PAT-1003',
    firstName: 'Marcus',
    lastName: 'Vance',
    age: '45',
    dateOfBirth: '1979-11-03',
    gender: 'male',
    mobile: '9655234567',
    countryCode: '+91',
    email: 'marcus.v@example.com',
    language: 'English',
    city: 'Kochi',
    state: 'Kerala',
    postalCode: '682020',
    address: 'Seaside Villa 4',
    emergencyName: 'Linda Vance',
    emergencyPhone: '9655234568',
    relationship: 'Spouse',
    allergies: 'no',
    allergiesDetails: '',
    medications: 'yes',
    medicationsDetails: 'Blood pressure medication (Amlodipine 5mg)',
    conditions: 'yes',
    conditionsDetails: 'Hypertension',
    createdAt: new Date().toISOString()
  },
  {
    id: 'PAT-1004',
    firstName: 'Ananya',
    lastName: 'Iyer',
    age: '19',
    dateOfBirth: '2005-02-17',
    gender: 'female',
    mobile: '9446345678',
    countryCode: '+91',
    email: 'ananya.iyer@example.com',
    language: 'Tamil, English',
    city: 'Kochi',
    state: 'Kerala',
    postalCode: '682035',
    address: 'College Road, Lane 2',
    emergencyName: 'Suresh Iyer',
    emergencyPhone: '9446345679',
    relationship: 'Father',
    allergies: 'no',
    allergiesDetails: '',
    medications: 'no',
    medicationsDetails: '',
    conditions: 'no',
    conditionsDetails: '',
    createdAt: new Date().toISOString()
  },
  {
    id: 'PAT-1005',
    firstName: 'Rohit',
    lastName: 'Verma',
    age: '37',
    dateOfBirth: '1987-07-30',
    gender: 'male',
    mobile: '9123456789',
    countryCode: '+91',
    email: 'rohit.v@example.com',
    language: 'Hindi, English',
    city: 'Kochi',
    state: 'Kerala',
    postalCode: '682011',
    address: 'Green Park View, Apt 304',
    emergencyName: 'Pooja Verma',
    emergencyPhone: '9123456780',
    relationship: 'Spouse',
    allergies: 'no',
    allergiesDetails: '',
    medications: 'no',
    medicationsDetails: '',
    conditions: 'no',
    conditionsDetails: '',
    createdAt: new Date().toISOString()
  }
]

const getTodayDateStr = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

const initialAppointments: AppointmentRecord[] = [
  {
    id: 'APT-1001',
    patientId: 'pt-1001',
    doctor: 'Dr. Arun Kumar',
    chair: 'Chair 1',
    treatmentType: 'Root Canal Treatment (Session 2/3)',
    visitType: 'Dental procedure',
    date: getTodayDateStr(),
    time: '11:00',
    durationMinutes: 45,
    status: 'in-progress',
    priority: 'urgent',
    notes: 'Access opening completed. Bio-mechanical preparation and irrigation with NaOCl. Temp Cavit placed.',
    checkInTime: '10:45',
    consultationStartTime: '11:02',
    createdAt: new Date().toISOString()
  },
  {
    id: 'APT-1000',
    patientId: 'pt-1001',
    doctor: 'Dr. Arun Kumar',
    chair: 'Chair 1',
    treatmentType: 'Emergency Pain Relief Consultation',
    visitType: 'Consultation',
    date: '2026-10-24',
    time: '14:30',
    durationMinutes: 30,
    status: 'completed',
    priority: 'urgent',
    notes: 'Acute irreversible pulpitis in #46. Emergency pulpectomy performed.',
    completedTime: '15:15',
    createdAt: '2026-10-24T09:00:00.000Z'
  },
  {
    id: 'APT-2001',
    patientId: 'PAT-1001',
    doctor: 'Dr. Arun Kumar',
    chair: 'Chair 1',
    treatmentType: 'Orthodontic Bracket Adjustment',
    visitType: 'Follow-up',
    date: getTodayDateStr(),
    time: '09:30',
    durationMinutes: 30,
    status: 'in-progress',
    priority: 'normal',
    notes: 'Upper archwire activation and check bracket alignment on 14, 24.',
    checkInTime: '09:20',
    consultationStartTime: '09:32',
    createdAt: new Date().toISOString()
  },
  {
    id: 'APT-2002',
    patientId: 'PAT-1002',
    doctor: 'Dr. Priya Nair',
    chair: 'Chair 2',
    treatmentType: 'Root Canal Treatment (Single Sitting)',
    visitType: 'Dental treatment',
    date: getTodayDateStr(),
    time: '10:00',
    durationMinutes: 60,
    status: 'checked-in',
    priority: 'urgent',
    notes: 'Severe pain on lower right first molar (#46). Pulpitis test positive.',
    checkInTime: '09:50',
    createdAt: new Date().toISOString()
  },
  {
    id: 'APT-2003',
    patientId: 'PAT-1003',
    doctor: 'Dr. Tariq Antoun',
    chair: 'Chair 3',
    treatmentType: 'Surgical Wisdom Tooth Removal',
    visitType: 'Consultation',
    date: getTodayDateStr(),
    time: '11:30',
    durationMinutes: 60,
    status: 'scheduled',
    priority: 'normal',
    notes: 'Pre-op evaluation for impacted third molar extraction.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'APT-2004',
    patientId: 'PAT-1004',
    doctor: 'Dr. Arun Kumar',
    chair: 'Chair 1',
    treatmentType: 'Clear Aligner Scan & Assessment',
    visitType: 'Check-up',
    date: getTodayDateStr(),
    time: '14:00',
    durationMinutes: 45,
    status: 'confirmed',
    priority: 'normal',
    notes: 'iTero digital scan for Invisalign treatment plan stage 1.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'APT-2005',
    patientId: 'PAT-1005',
    doctor: 'Dr. Sarah Thomas',
    chair: 'Chair 4',
    treatmentType: 'Ultrasonic Scaling & Polishing',
    visitType: 'Cleaning',
    date: getTodayDateStr(),
    time: '15:30',
    durationMinutes: 45,
    status: 'scheduled',
    priority: 'normal',
    notes: 'Routine 6-month prophylaxis and calculus removal.',
    createdAt: new Date().toISOString()
  }
]


const initialClinicalNotes: ClinicalNoteRecord[] = [
  {
    id: 'NOT-1001',
    patientId: 'pt-1001',
    visitDate: '2026-10-24',
    complaint: 'Severe throbbing pain in lower right posterior quadrant radiating to ear for 2 days.',
    findings: 'Deep occlusal caries on tooth #46 involving pulp. Tenderness on vertical percussion positive. Cold test elicited prolonged lingering pain.',
    plan: 'Single/two sitting Root Canal Treatment on #46 followed by full coverage crown. Patient allergic to Penicillin; prescribed Erythromycin.',
    createdAt: '2026-10-24T15:00:00.000Z'
  },
  {
    id: 'NOT-1002',
    patientId: 'pt-1001',
    visitDate: getTodayDateStr(),
    complaint: 'Follow-up for second sitting RCT on #46.',
    findings: 'Symptom-free. Temporary filling intact. Working length confirmed at 21mm MB, 21mm ML, 20.5mm Distal via RVG.',
    plan: 'Canal biomechanical preparation with ProTaper Gold rotary files. Calcium hydroxide intracanal medicament. Next: Obturation.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'NOT-1003',
    patientId: 'PAT-1001',
    visitDate: '2026-10-18',
    complaint: 'Routine 6-month orthodontic bracket review and check-up.',
    findings: 'Alignment progressing well. Mild supra-gingival calculus on lower anteriors.',
    plan: '0.016x0.022 NiTi archwire engaged. Ultrasonic scaling scheduled.',
    createdAt: '2026-10-18T11:00:00.000Z'
  }
]

const initialInvoices: InvoiceRecord[] = [
  {
    id: 'INV-1001',
    patientId: 'pt-1001',
    description: 'Root Canal Treatment (#46) - Sitting 1 & 2',
    amount: 3500,
    status: 'Paid',
    createdAt: '2026-10-24T15:15:00.000Z'
  },
  {
    id: 'INV-1002',
    patientId: 'pt-1001',
    description: 'Zirconia Monolithic Crown (Post-RCT restoration)',
    amount: 6000,
    status: 'Unpaid',
    createdAt: new Date().toISOString()
  }
]

const initialTreatmentPlans: TreatmentPlanRecord[] = [
  {
    id: 'TRT-1001',
    patientId: 'pt-1001',
    procedure: 'Root Canal Treatment & Rotary Shaping',
    category: 'Endodontics',
    toothNumber: '46',
    status: 'In Progress',
    cost: 4500,
    doctor: 'Dr. Arun Kumar',
    notes: 'Working length established. Second sitting underway.',
    date: '2026-10-24'
  },
  {
    id: 'TRT-1002',
    patientId: 'pt-1001',
    procedure: 'CAD/CAM Zirconia Crown Restoration',
    category: 'Prosthodontics',
    toothNumber: '46',
    status: 'Pending',
    cost: 6500,
    doctor: 'Dr. Arun Kumar',
    notes: 'Scheduled post-obturation. Tooth preparation and digital optical scan pending.',
    date: '2026-10-24'
  },
  {
    id: 'TRT-1003',
    patientId: 'pt-1001',
    procedure: 'Comprehensive Ultrasonic Scaling & Polishing',
    category: 'Preventive',
    toothNumber: 'Full Mouth',
    status: 'Accepted',
    cost: 1200,
    doctor: 'Dr. Priya Nair',
    notes: 'Mild calculus accumulation.',
    date: '2026-10-24'
  },
  {
    id: 'TRT-1004',
    patientId: 'PAT-1001',
    procedure: 'Clear Aligner Assessment & Refinement Scan',
    category: 'Orthodontics',
    toothNumber: 'Upper & Lower',
    status: 'In Progress',
    cost: 3000,
    doctor: 'Dr. Arun Kumar',
    notes: 'Tray 14 of 20 evaluation.',
    date: '2026-10-15'
  },
  {
    id: 'TRT-1005',
    patientId: 'PAT-1002',
    procedure: 'Single Sitting Root Canal (#36)',
    category: 'Endodontics',
    toothNumber: '36',
    status: 'Proposed',
    cost: 4500,
    doctor: 'Dr. Priya Nair',
    notes: 'Awaiting patient approval.',
    date: getTodayDateStr()
  },
  {
    id: 'TRT-1006',
    patientId: 'PAT-1003',
    procedure: 'Surgical Wisdom Tooth Removal (#38)',
    category: 'Oral Surgery',
    toothNumber: '38',
    status: 'Pending',
    cost: 5000,
    doctor: 'Dr. Tariq Antoun',
    notes: 'Impaction class II position B. Pre-op bloods required.',
    date: '2026-10-20'
  }
]

const initialPatientDocuments: PatientDocumentRecord[] = [
  {
    id: 'DOC-1001',
    patientId: 'pt-1001',
    title: 'Diagnostic Digital RVG X-Ray (#46 Periapical)',
    category: 'Radiology',
    fileName: 'RVG_46_pre_op_periapical.dcm',
    fileSize: '4.2 MB',
    uploadDate: '2026-10-24',
    doctor: 'Dr. Arun Kumar',
    url: '/records/xray-sample.png'
  },
  {
    id: 'DOC-1002',
    patientId: 'pt-1001',
    title: 'Full Mouth Orthopantomogram (OPG Scan)',
    category: 'Radiology',
    fileName: 'OPG_panoramic_nambiar_meera.jpg',
    fileSize: '8.7 MB',
    uploadDate: '2026-10-24',
    doctor: 'Dr. Arun Kumar',
    url: '/records/opg-sample.png'
  },
  {
    id: 'DOC-1003',
    patientId: 'pt-1001',
    title: 'Working Length Determination Radiograph (#46)',
    category: 'Radiology',
    fileName: 'RVG_46_working_length_21mm.dcm',
    fileSize: '3.9 MB',
    uploadDate: getTodayDateStr(),
    doctor: 'Dr. Arun Kumar'
  }
]

const initialPatientConsents: PatientConsentRecord[] = [
  {
    id: 'CNS-1001',
    patientId: 'pt-1001',
    consentType: 'Informed Consent for Endodontic Root Canal Therapy',
    status: 'Signed',
    dateRecorded: '2026-10-24',
    recordedBy: 'Dr. Arun Kumar',
    documentRef: 'DMX-CONSENT-RCT-2026-089',
    notes: 'Procedure risks, alternative treatment (extraction), and post-op crown necessity explained. Patient signed digitally.'
  },
  {
    id: 'CNS-1002',
    patientId: 'pt-1001',
    consentType: 'Local Anesthesia Administration Consent',
    status: 'Signed',
    dateRecorded: '2026-10-24',
    recordedBy: 'Dr. Arun Kumar',
    documentRef: 'DMX-CONSENT-LA-2026-089',
    notes: 'Lignocaine 2% with 1:80000 adrenaline verified safe with medical history.'
  },
  {
    id: 'CNS-1003',
    patientId: 'pt-1001',
    consentType: 'CAD/CAM Prosthetic Restoration Consent',
    status: 'Pending',
    dateRecorded: getTodayDateStr(),
    recordedBy: 'Dr. Arun Kumar',
    documentRef: 'DMX-CONSENT-PROS-2026-114',
    notes: 'Awaiting digital signature upon final margin preparation.'
  }
]

let patientsState: PatientRecord[] = [...initialPatients]
let appointmentsState: AppointmentRecord[] = [...initialAppointments]
let clinicalNotesState: ClinicalNoteRecord[] = [...initialClinicalNotes]
let invoicesState: InvoiceRecord[] = [...initialInvoices]
let treatmentPlansState: TreatmentPlanRecord[] = [...initialTreatmentPlans]
let patientDocumentsState: PatientDocumentRecord[] = [...initialPatientDocuments]
let patientConsentsState: PatientConsentRecord[] = [...initialPatientConsents]
let walkInCounter = 101

const listeners = new Set<() => void>()

let cachedSnapshot = {
  patients: patientsState,
  appointments: appointmentsState,
  clinicalNotes: clinicalNotesState,
  invoices: invoicesState,
  treatmentPlans: treatmentPlansState,
  patientDocuments: patientDocumentsState,
  patientConsents: patientConsentsState
}

const emitChange = () => {
  cachedSnapshot = {
    patients: patientsState,
    appointments: appointmentsState,
    clinicalNotes: clinicalNotesState,
    invoices: invoicesState,
    treatmentPlans: treatmentPlansState,
    patientDocuments: patientDocumentsState,
    patientConsents: patientConsentsState
  }
  for (const listener of listeners) {
    listener()
  }
}

export const subscribeClinicData = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const getClinicSnapshot = () => cachedSnapshot

export const useClinicData = () => {
  return useSyncExternalStore(subscribeClinicData, getClinicSnapshot, getClinicSnapshot)
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. AVAILABILITY CHECKING & CONFLICT PREVENTION
// ─────────────────────────────────────────────────────────────────────────────

export interface AvailabilityResult {
  available: boolean
  reason?: string
}

export const checkDentistAvailability = (
  doctorName: string,
  date: string,
  time: string,
  durationMinutes = 30,
  excludeAppointmentId?: string
): AvailabilityResult => {
  const dentist = DENTISTS.find((d) => d.name === doctorName)
  if (!dentist) {
    return { available: true } // Custom doctor not in strict list
  }

  // Check day of week
  const parsedDate = new Date(`${date}T12:00:00`)
  const dayOfWeek = parsedDate.getDay() // 0 = Sunday
  if (!dentist.workingDays.includes(dayOfWeek)) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    return { available: false, reason: `${dentist.name} does not work on ${days[dayOfWeek]}s.` }
  }

  // Check leave dates
  if (dentist.leaveDates.includes(date)) {
    return { available: false, reason: `${dentist.name} is on approved leave on ${date}.` }
  }

  // Convert time to minutes from midnight
  const [hour, min] = time.split(':').map(Number)
  const reqStart = hour * 60 + min
  const reqEnd = reqStart + durationMinutes

  const [shiftStartH, shiftStartM] = dentist.shiftStart.split(':').map(Number)
  const [shiftEndH, shiftEndM] = dentist.shiftEnd.split(':').map(Number)
  const shiftStart = shiftStartH * 60 + shiftStartM
  const shiftEnd = shiftEndH * 60 + shiftEndM

  if (reqStart < shiftStart || reqEnd > shiftEnd) {
    return {
      available: false,
      reason: `Outside working hours (${dentist.shiftStart} - ${dentist.shiftEnd}).`
    }
  }

  // Check lunch break
  const [lunchStartH, lunchStartM] = dentist.lunchStart.split(':').map(Number)
  const [lunchEndH, lunchEndM] = dentist.lunchEnd.split(':').map(Number)
  const lunchStart = lunchStartH * 60 + lunchStartM
  const lunchEnd = lunchEndH * 60 + lunchEndM

  if ((reqStart >= lunchStart && reqStart < lunchEnd) || (reqEnd > lunchStart && reqEnd <= lunchEnd) || (reqStart <= lunchStart && reqEnd >= lunchEnd)) {
    return {
      available: false,
      reason: `${dentist.name} has a scheduled lunch & break between ${dentist.lunchStart} and ${dentist.lunchEnd}.`
    }
  }

  // Check for double booking conflicts with other active appointments
  const conflicting = appointmentsState.find((appt) => {
    if (appt.id === excludeAppointmentId) return false
    if (appt.doctor !== doctorName || appt.date !== date) return false
    if (appt.status === 'cancelled' || appt.status === 'no-show') return false

    const [aH, aM] = appt.time.split(':').map(Number)
    const apptStart = aH * 60 + aM
    const apptDuration = appt.durationMinutes || 30
    const apptEnd = apptStart + apptDuration

    // Overlap condition
    return reqStart < apptEnd && reqEnd > apptStart
  })

  if (conflicting) {
    return {
      available: false,
      reason: `${dentist.name} already has appointment (${conflicting.id}) booked from ${conflicting.time} to ${formatEndTime(conflicting.time, conflicting.durationMinutes || 30)}.`
    }
  }

  return { available: true }
}

const formatEndTime = (startTime: string, durationMinutes: number) => {
  const [h, m] = startTime.split(':').map(Number)
  const total = h * 60 + m + durationMinutes
  const endH = Math.floor(total / 60)
  const endM = total % 60
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. APPOINTMENT BOOKING & RESCHEDULING
// ─────────────────────────────────────────────────────────────────────────────

export const bookAppointment = (data: {
  patientId: string
  doctor: string
  chair?: string
  treatmentType?: string
  visitType: string
  date: string
  time: string
  durationMinutes?: number
  priority?: AppointmentPriority
  notes?: string
}): AppointmentRecord => {
  const dentist = DENTISTS.find((d) => d.name === data.doctor)
  const chair = data.chair || dentist?.chair || 'Chair 1'

  const newAppt: AppointmentRecord = {
    id: `APT-${Date.now().toString().slice(-4)}`,
    patientId: data.patientId,
    doctor: data.doctor,
    chair,
    treatmentType: data.treatmentType || data.visitType,
    visitType: data.visitType,
    date: data.date,
    time: data.time,
    durationMinutes: data.durationMinutes || 30,
    status: 'scheduled',
    priority: data.priority || 'normal',
    notes: data.notes || '',
    statusHistory: [
      {
        status: 'scheduled',
        timestamp: new Date().toISOString(),
        note: 'Appointment booked.'
      }
    ],
    createdAt: new Date().toISOString()
  }

  appointmentsState = [newAppt, ...appointmentsState]
  emitChange()
  return newAppt
}

export const rescheduleAppointment = (
  appointmentId: string,
  newDate: string,
  newTime: string,
  reason: string
): { success: boolean; error?: string } => {
  const appt = appointmentsState.find((a) => a.id === appointmentId)
  if (!appt) return { success: false, error: 'Appointment not found.' }

  const availability = checkDentistAvailability(
    appt.doctor,
    newDate,
    newTime,
    appt.durationMinutes || 30,
    appointmentId
  )

  if (!availability.available) {
    return { success: false, error: availability.reason }
  }

  const rescheduleLog: RescheduleRecord = {
    previousDate: appt.date,
    previousTime: appt.time,
    newDate,
    newTime,
    reason,
    changedAt: new Date().toISOString()
  }

  const history = appt.rescheduleHistory || []

  appointmentsState = appointmentsState.map((entry) => {
    if (entry.id !== appointmentId) return entry
    return {
      ...entry,
      date: newDate,
      time: newTime,
      status: 'scheduled',
      rescheduleHistory: [...history, rescheduleLog],
      statusHistory: [
        ...(entry.statusHistory || []),
        {
          status: 'scheduled',
          timestamp: new Date().toISOString(),
          note: `Rescheduled to ${newDate} at ${newTime}. Reason: ${reason}`
        }
      ]
    }
  })

  emitChange()
  return { success: true }
}

export const cancelAppointment = (appointmentId: string, reason: string): boolean => {
  const appt = appointmentsState.find((a) => a.id === appointmentId)
  if (!appt) return false

  appointmentsState = appointmentsState.map((entry) => {
    if (entry.id !== appointmentId) return entry
    return {
      ...entry,
      status: 'cancelled',
      cancellationReason: reason,
      statusHistory: [
        ...(entry.statusHistory || []),
        {
          status: 'cancelled',
          timestamp: new Date().toISOString(),
          note: `Cancelled. Reason: ${reason}`
        }
      ]
    }
  })

  emitChange()
  return true
}

export const updateAppointmentStatus = (
  appointmentId: string,
  status: AppointmentStatus,
  note?: string
) => {
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  appointmentsState = appointmentsState.map((entry) => {
    if (entry.id !== appointmentId) return entry

    const updates: Partial<AppointmentRecord> = { status }

    if (status === 'checked-in' && !entry.checkInTime) {
      updates.checkInTime = now
    } else if (status === 'in-progress' && !entry.consultationStartTime) {
      updates.consultationStartTime = now
    } else if (status === 'completed' && !entry.completedTime) {
      updates.completedTime = now
    }

    return {
      ...entry,
      ...updates,
      statusHistory: [
        ...(entry.statusHistory || []),
        {
          status,
          timestamp: new Date().toISOString(),
          note: note || `Status updated to ${status}`
        }
      ]
    }
  })

  emitChange()
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. WALK-INS & LIVE QUEUE MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

export const registerWalkIn = (data: {
  patientName: string
  mobile: string
  gender: string
  age: string
  complaint: string
  doctor: string
  priority: AppointmentPriority
}): AppointmentRecord => {
  const [firstName, ...rest] = data.patientName.split(' ')
  const lastName = rest.join(' ') || ''

  // Look for existing patient or create quick record
  let patient = patientsState.find((p) => p.mobile === data.mobile)
  if (!patient) {
    patient = {
      id: `PAT-${Date.now().toString().slice(-4)}`,
      firstName: firstName || 'Walk-in',
      lastName: lastName || 'Patient',
      age: data.age || '30',
      dateOfBirth: '',
      gender: data.gender || 'other',
      mobile: data.mobile || '',
      countryCode: '+91',
      email: '',
      language: 'English',
      city: 'Local',
      state: '',
      postalCode: '',
      address: 'Walk-in registered at reception',
      emergencyName: '',
      emergencyPhone: '',
      relationship: '',
      allergies: 'no',
      allergiesDetails: '',
      medications: 'no',
      medicationsDetails: '',
      conditions: 'no',
      conditionsDetails: '',
      createdAt: new Date().toISOString()
    }
    patientsState = [patient, ...patientsState]
  }

  const dentist = DENTISTS.find((d) => d.name === data.doctor)
  const token = `${CLINIC_CONFIG.walkInTokenPrefix}${walkInCounter++}`
  const now = new Date()
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  const walkInAppt: AppointmentRecord = {
    id: `APT-${Date.now().toString().slice(-4)}`,
    patientId: patient.id,
    doctor: data.doctor,
    chair: dentist?.chair || 'Chair 1',
    treatmentType: data.complaint || 'General Dental Consultation',
    visitType: 'Walk-in',
    date: getTodayDateStr(),
    time: currentTime,
    durationMinutes: 30,
    status: 'checked-in',
    priority: data.priority,
    isWalkIn: true,
    queueToken: token,
    checkInTime: currentTime,
    notes: `Walk-in complaint: ${data.complaint}`,
    statusHistory: [
      {
        status: 'checked-in',
        timestamp: new Date().toISOString(),
        note: `Registered as walk-in with token ${token}.`
      }
    ],
    createdAt: new Date().toISOString()
  }

  appointmentsState = [walkInAppt, ...appointmentsState]
  emitChange()
  return walkInAppt
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. REMINDERS & WHATSAPP
// ─────────────────────────────────────────────────────────────────────────────

export const generateWhatsAppMessage = (
  type: 'confirmation' | 'reminder_24h' | 'reminder_2h' | 'recall',
  appointment: AppointmentRecord,
  patient: PatientRecord
): string => {
  const patientName = `${patient.firstName} ${patient.lastName}`.trim()
  const clinic = CLINIC_CONFIG.clinicName
  const date = appointment.date
  const time = appointment.time
  const doctor = appointment.doctor
  const treatment = appointment.treatmentType || appointment.visitType

  if (type === 'confirmation') {
    return `Hello ${patientName}, your appointment at *${clinic}* is CONFIRMED!\n\n📅 Date: ${date}\n⏰ Time: ${time}\n👨‍⚕️ Doctor: ${doctor}\n🦷 Treatment: ${treatment}\n📍 Address: ${CLINIC_CONFIG.clinicAddress}\n\nTo reschedule or reply, send us a message here. See you soon!`
  } else if (type === 'reminder_24h') {
    return `Reminder from *${clinic}*: Hello ${patientName}, you have an appointment scheduled for TOMORROW (${date}) at ${time} with ${doctor}.\n\nPlease arrive 10 minutes prior. Reply 'CONFIRM' or message us if you need to reschedule.`
  } else if (type === 'reminder_2h') {
    return `Immediate Reminder: Hello ${patientName}, your dental appointment with ${doctor} at *${clinic}* starts in 2 hours (${time}). Please contact ${CLINIC_CONFIG.clinicPhone} if you are delayed.`
  } else {
    return `Hello ${patientName}, it has been 6 months since your last dental visit at *${clinic}*. Routine check-ups help prevent dental complications. Reply here to book your seasonal examination!`
  }
}

export const sendAppointmentReminder = (
  appointmentId: string,
  type: 'confirmation' | '24h' | '2h' | 'whatsapp'
) => {
  const appt = appointmentsState.find((a) => a.id === appointmentId)
  if (!appt) return

  const patient = patientsState.find((p) => p.id === appt.patientId)
  const phone = patient?.mobile || CLINIC_CONFIG.clinicPhone

  const reminderLog = {
    type,
    sentAt: new Date().toISOString(),
    recipient: phone
  }

  appointmentsState = appointmentsState.map((entry) => {
    if (entry.id !== appointmentId) return entry
    return {
      ...entry,
      remindersSent: [...(entry.remindersSent || []), reminderLog]
    }
  })

  emitChange()
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. PATIENTS & CLINICAL NOTES HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export const savePatient = (data: Omit<PatientRecord, 'id' | 'createdAt'>): PatientRecord => {
  const newPatient: PatientRecord = {
    ...data,
    id: `PAT-${Date.now().toString().slice(-4)}`,
    createdAt: new Date().toISOString()
  }
  patientsState = [newPatient, ...patientsState]
  emitChange()
  return newPatient
}

export const saveClinicalNote = (data: {
  patientId: string
  visitDate: string
  complaint: string
  findings: string
  plan: string
}): ClinicalNoteRecord => {
  const newNote: ClinicalNoteRecord = {
    ...data,
    id: `NOT-${Date.now().toString().slice(-4)}`,
    createdAt: new Date().toISOString()
  }
  clinicalNotesState = [newNote, ...clinicalNotesState]
  emitChange()
  return newNote
}

export function createInvoice(details: Omit<InvoiceRecord, 'id' | 'status' | 'createdAt'>) {
  const record: InvoiceRecord = {
    ...details,
    id: `INV-${Date.now().toString().slice(-8)}`,
    status: 'Unpaid',
    createdAt: new Date().toISOString()
  }
  invoicesState = [record, ...invoicesState]
  emitChange()
  return record
}

export const updatePatient = (
  id: string,
  updates: Partial<Omit<PatientRecord, 'id' | 'createdAt'>>
): PatientRecord | null => {
  const index = patientsState.findIndex((p) => p.id === id)
  if (index === -1) return null
  patientsState[index] = {
    ...patientsState[index],
    ...updates
  }
  patientsState = [...patientsState]
  emitChange()
  return patientsState[index]
}

export const addTreatmentPlan = (
  data: Omit<TreatmentPlanRecord, 'id' | 'date'>
): TreatmentPlanRecord => {
  const newPlan: TreatmentPlanRecord = {
    ...data,
    id: `TRT-${Date.now().toString().slice(-4)}`,
    date: new Date().toISOString().slice(0, 10)
  }
  treatmentPlansState = [newPlan, ...treatmentPlansState]
  emitChange()
  return newPlan
}

export const updateTreatmentPlanStatus = (
  id: string,
  status: TreatmentPlanRecord['status']
): boolean => {
  const plan = treatmentPlansState.find((p) => p.id === id)
  if (!plan) return false
  plan.status = status
  treatmentPlansState = [...treatmentPlansState]
  emitChange()
  return true
}

export const addPatientDocument = (
  data: Omit<PatientDocumentRecord, 'id' | 'uploadDate'>
): PatientDocumentRecord => {
  const newDoc: PatientDocumentRecord = {
    ...data,
    id: `DOC-${Date.now().toString().slice(-4)}`,
    uploadDate: new Date().toISOString().slice(0, 10)
  }
  patientDocumentsState = [newDoc, ...patientDocumentsState]
  emitChange()
  return newDoc
}

export const addPatientConsent = (
  data: Omit<PatientConsentRecord, 'id' | 'dateRecorded'>
): PatientConsentRecord => {
  const newConsent: PatientConsentRecord = {
    ...data,
    id: `CNS-${Date.now().toString().slice(-4)}`,
    dateRecorded: new Date().toISOString().slice(0, 10)
  }
  patientConsentsState = [newConsent, ...patientConsentsState]
  emitChange()
  return newConsent
}

export const registerPatient = savePatient
export const addClinicalNote = saveClinicalNote

export const resetStoreForTesting = () => {
  patientsState = [...initialPatients]
  appointmentsState = [...initialAppointments]
  clinicalNotesState = [...initialClinicalNotes]
  invoicesState = [...initialInvoices]
  treatmentPlansState = [...initialTreatmentPlans]
  patientDocumentsState = [...initialPatientDocuments]
  patientConsentsState = [...initialPatientConsents]
  emitChange()
}
