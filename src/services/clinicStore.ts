import { useSyncExternalStore } from 'react'
import { loadFromStorage, saveToStorage, removeFromStorage, STORAGE_KEYS } from './storageService'
import { apiClient } from './apiClient'
import { billingApi, toFrontendStatus, toFrontendMode, toBackendMode } from './billingApi'

export type MedicalAnswer = 'yes' | 'no' | 'unknown'

export interface PatientRecord {
  id: string
  backendId?: string
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
  backendId?: string
  bookingRef?: string
  patientId: string
  patientName?: string
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

export interface ClinicalNoteAddendumRecord {
  id: string
  noteId: string
  content: string
  doctorId?: string
  doctorName?: string
  createdAt: string
}

export interface ClinicalNoteRecord {
  id: string
  clinicId?: string
  patientId: string
  appointmentId?: string
  doctorId?: string
  noteNumber?: string
  consultationDate?: string
  consultationType?: string
  status?: 'DRAFT' | 'FINALIZED'
  finalizedAt?: string
  finalizedById?: string
  finalizedByName?: string
  doctorName?: string

  // Section 1: Chief Complaint
  chiefComplaint?: string

  // Section 2: Symptoms & History
  symptoms?: string
  symptomDuration?: string
  painSeverity?: number
  historyNotes?: string

  // Section 3: Clinical Examination
  extraoralFindings?: string
  intraoralFindings?: string
  toothSpecificFindings?: string
  periodontalFindings?: string
  examinationNotes?: string

  // Section 4: Diagnosis
  primaryDiagnosis?: string
  additionalDiagnoses?: any
  diagnosisNotes?: string

  // Section 5: Treatment Performed
  treatmentPerformed?: string
  treatmentToothNumber?: string
  treatmentDescription?: string
  materialsUsed?: string
  treatmentOutcome?: string

  // Section 6: Treatment Recommendations
  treatmentRecommendations?: string
  referralNotes?: string

  // Section 7: Follow-up & Advice
  followUpRequired?: boolean
  followUpDate?: string
  followUpInstructions?: string
  patientAdvice?: string

  // Addenda
  addenda?: ClinicalNoteAddendumRecord[]

  // Legacy compatibility fields
  visitDate: string
  complaint: string
  findings: string
  plan: string
  createdAt: string
  updatedAt?: string

  patient?: {
    id: string
    patientCode?: string
    firstName: string
    lastName: string
    gender?: string
    dateOfBirth?: string
    mobile?: string
    medicalSafetyAlerts?: string[]
  }
  doctor?: {
    id: string
    fullName?: string
    name?: string
    role?: string
  }
  appointment?: {
    id: string
    time?: string
    type?: string
  }
}

export type PaymentMode = 'Cash' | 'Card' | 'UPI' | 'Net Banking' | 'Cheque'

export interface InvoiceLineItem {
  id: string
  serviceId?: string
  name: string
  toothNumber?: string
  qty: number
  unitPrice: number
  discount: number // flat ₹ discount on this line
  gstRate: number // percent, 0 for treatment, 18 for cosmetic
}

export interface InvoicePayment {
  id: string
  amount: number
  mode: PaymentMode
  reference?: string
  receivedAt: string
  type?: 'PAYMENT' | 'REFUND'
}

export interface InvoiceRecord {
  id: string
  backendId?: string
  patientId: string
  description: string
  amount: number // grand total including GST
  status: 'Draft' | 'Unpaid' | 'Partial' | 'Paid' | 'Void'
  createdAt: string
  items?: InvoiceLineItem[]
  subtotal?: number
  discountTotal?: number
  taxTotal?: number
  payments?: InvoicePayment[]
  appointmentId?: string
  notes?: string
  dueDate?: string
}

/** Amount received against an invoice. Older invoices without a payment log count as fully paid when marked Paid. */
export const invoicePaidAmount = (invoice: InvoiceRecord): number => {
  if (Array.isArray(invoice.payments)) {
    return Math.max(0, Math.round(invoice.payments.reduce((sum, p) => sum + p.amount, 0) * 100) / 100)
  }
  return invoice.status === 'Paid' ? invoice.amount : 0
}

export const invoiceBalance = (invoice: InvoiceRecord): number => {
  if (invoice.status === 'Void') return 0
  return Math.max(0, Math.round((invoice.amount - invoicePaidAmount(invoice)) * 100) / 100)
}

export const lineItemTotals = (item: InvoiceLineItem) => {
  const gross = item.qty * item.unitPrice
  const taxable = Math.max(0, gross - item.discount)
  const tax = Math.round(taxable * item.gstRate) / 100
  return { gross, taxable, tax, total: taxable + tax }
}

export interface TreatmentPlanItemRecord {
  id: string
  stageId?: string
  procedureCode?: string
  procedureName: string
  category: string
  toothNumber?: string
  surface?: string
  quantity: number
  unitFee: number
  discount: number
  netFee: number
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DEFERRED' | 'CANCELLED'
  notes?: string
}

export interface TreatmentPlanStageRecord {
  id: string
  treatmentPlanId?: string
  stageNumber: number
  name: string
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED'
  targetDate?: string
  estimatedCost: number
  items: TreatmentPlanItemRecord[]
}

export interface TreatmentEstimateRevisionRecord {
  id: string
  treatmentPlanId?: string
  versionNumber: number
  revisionReason?: string
  subtotal: number
  discount: number
  tax: number
  totalEstimatedCost: number
  status: string
  acceptedAt?: string
  acceptedByName?: string
  acceptanceMethod?: string
  isStaffRecorded?: boolean
  createdByName?: string
  createdAt: string
  itemsSnapshot?: any
}

export interface TreatmentPlanRecord {
  id: string
  backendId?: string
  clinicId?: string
  planNumber?: string
  patientId: string
  title?: string
  procedure: string
  category: string
  toothNumber?: string
  status: 'Proposed' | 'Accepted' | 'In Progress' | 'Completed' | 'Pending' | 'Rejected' | 'Cancelled'
  cost: number
  doctor: string
  doctorId?: string
  notes?: string
  date: string
  subtotal?: number
  discount?: number
  tax?: number
  totalEstimatedCost?: number
  currentVersion?: number
  acceptedVersion?: number
  patientAcceptedAt?: string
  patientAcceptedByName?: string
  acceptanceMethod?: string
  isStaffRecorded?: boolean
  rejectionReason?: string
  origin?: string
  stages?: TreatmentPlanStageRecord[]
  estimateRevisions?: TreatmentEstimateRevisionRecord[]
  patient?: any
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

export type ToothConditionType = 'Healthy' | 'Caries' | 'Restored' | 'Missing' | 'Crown' | 'RCT'

export interface ToothConditionRecord {
  condition: ToothConditionType
  notes?: string
}

export type PatientToothChartMap = Record<number, ToothConditionRecord>
export type ClinicToothCharts = Record<string, PatientToothChartMap>

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
    noteNumber: 'CN-1001',
    patientId: 'pt-1001',
    doctorId: 'doc-001',
    doctorName: 'Dr. Sarah Mitchell',
    consultationDate: '2026-10-24T15:00:00.000Z',
    consultationType: 'EMERGENCY',
    status: 'FINALIZED',
    finalizedAt: '2026-10-24T15:30:00.000Z',
    finalizedByName: 'Dr. Sarah Mitchell',
    chiefComplaint: 'Severe throbbing pain in lower right posterior quadrant radiating to ear for 2 days.',
    symptoms: 'Spontaneous pain, heightened at night, aggravated by hot fluids.',
    symptomDuration: '48 hours',
    painSeverity: 8,
    historyNotes: 'Patient took OTC Ibuprofen with transient minimal relief.',
    extraoralFindings: 'No visible facial asymmetry or extraoral lymphadenopathy.',
    intraoralFindings: 'Deep disto-occlusal caries on tooth #46 involving pulp. Tenderness on vertical percussion positive.',
    toothSpecificFindings: 'Tooth 46: Non-vital response to thermal testing, percussion sensitive.',
    periodontalFindings: 'Probing depths 2-3mm, normal physiological mobility Grade 0.',
    examinationNotes: 'Deep occlusal caries on tooth #46 involving pulp. Tenderness on vertical percussion positive. Cold test elicited prolonged lingering pain.',
    primaryDiagnosis: 'Symptomatic Irreversible Pulpitis with Acute Apical Periodontitis (#46)',
    treatmentPerformed: 'Pulpectomy and Emergency Access Opening on #46',
    treatmentToothNumber: '46',
    treatmentDescription: 'Local anesthesia administered (2% Lignocaine with 1:80000 adrenaline). Rubber dam isolation achieved. Caries excavated, pulp chamber de-roofed, coronal pulp extirpated. Working length established. Formocresol pellet and Cavit temporary seal placed.',
    materialsUsed: 'Rubber Dam, Cavit, Lignocaine 2%, EDTA gel',
    treatmentOutcome: 'Immediate alleviation of pressure; patient comfortable post-op.',
    treatmentRecommendations: 'Complete 2nd sitting Root Canal Treatment followed by core build-up and full coverage zirconia crown.',
    followUpRequired: true,
    followUpDate: '2026-10-28',
    followUpInstructions: 'Soft diet on right side, avoid hard/sticky food. Return if swelling develops.',
    patientAdvice: 'Avoid chewing on right side until definitive restoration is bonded.',
    visitDate: '2026-10-24',
    complaint: 'Severe throbbing pain in lower right posterior quadrant radiating to ear for 2 days.',
    findings: 'Deep occlusal caries on tooth #46 involving pulp. Tenderness on vertical percussion positive. Cold test elicited prolonged lingering pain.',
    plan: 'Single/two sitting Root Canal Treatment on #46 followed by full coverage crown. Patient allergic to Penicillin; prescribed Erythromycin.',
    createdAt: '2026-10-24T15:00:00.000Z'
  },
  {
    id: 'NOT-1002',
    noteNumber: 'CN-1002',
    patientId: 'pt-1001',
    doctorId: 'doc-001',
    doctorName: 'Dr. Sarah Mitchell',
    consultationDate: new Date().toISOString(),
    consultationType: 'FOLLOW_UP',
    status: 'FINALIZED',
    finalizedAt: new Date().toISOString(),
    finalizedByName: 'Dr. Sarah Mitchell',
    chiefComplaint: 'Follow-up for second sitting RCT on #46.',
    symptoms: 'Asymptomatic. Patient reports complete resolution of throbbing pain.',
    painSeverity: 0,
    intraoralFindings: 'Temporary restoration intact, gingiva surrounding #46 healthy without sinus tract.',
    toothSpecificFindings: 'Tooth 46: Percussion negative, palpation negative.',
    examinationNotes: 'Symptom-free. Temporary filling intact. Working length confirmed at 21mm MB, 21mm ML, 20.5mm Distal via RVG.',
    primaryDiagnosis: 'Previously Initiated Root Canal Therapy (#46)',
    treatmentPerformed: 'Biomechanical Preparation and Calcium Hydroxide Dressing (#46)',
    treatmentToothNumber: '46',
    treatmentDescription: 'Canals negotiated and shaped with ProTaper Gold rotary files up to F2. 3% NaOCl and 17% EDTA irrigation with sonic activation. Canals dried with paper points. Calcium hydroxide placed. Cavit sealed.',
    materialsUsed: 'ProTaper Gold, NaOCl 3%, EDTA 17%, Calcipex, Cavit',
    treatmentOutcome: 'Canals thoroughly prepared and dried.',
    treatmentRecommendations: 'Obturation with gutta-percha and bioceramic sealer at next visit.',
    followUpRequired: true,
    followUpDate: '2026-11-08',
    followUpInstructions: 'Continue routine oral hygiene. Schedule appointment for obturation.',
    visitDate: getTodayDateStr(),
    complaint: 'Follow-up for second sitting RCT on #46.',
    findings: 'Symptom-free. Temporary filling intact. Working length confirmed at 21mm MB, 21mm ML, 20.5mm Distal via RVG.',
    plan: 'Canal biomechanical preparation with ProTaper Gold rotary files. Calcium hydroxide intracanal medicament. Next: Obturation.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'NOT-1003',
    noteNumber: 'CN-1003',
    patientId: 'PAT-1001',
    doctorId: 'doc-002',
    doctorName: 'Dr. Alex Vance',
    consultationDate: '2026-10-18T11:00:00.000Z',
    consultationType: 'ROUTINE_CHECKUP',
    status: 'DRAFT',
    chiefComplaint: 'Routine 6-month orthodontic bracket review and check-up.',
    symptoms: 'Mild tightness after previous archwire change.',
    painSeverity: 1,
    intraoralFindings: 'Alignment progressing well. Mild supra-gingival calculus on lower anteriors.',
    examinationNotes: 'Alignment progressing well. Mild supra-gingival calculus on lower anteriors.',
    primaryDiagnosis: 'Class I Malocclusion with mild anterior crowding; Generalized mild gingivitis',
    treatmentPerformed: 'Orthodontic Wire Adjustment & Bracket Inspection',
    treatmentDescription: '0.016x0.022 NiTi upper and lower archwires engaged. Ligatures replaced.',
    treatmentRecommendations: 'Full mouth ultrasonic scaling and prophy scheduled.',
    followUpRequired: true,
    followUpDate: '2026-11-20',
    followUpInstructions: 'Maintain interdental brushing around brackets.',
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
    createdAt: '2026-10-24T15:15:00.000Z',
    payments: [{ id: 'PAY-1001', amount: 3500, mode: 'UPI', reference: 'UPI-448210', receivedAt: '2026-10-24T15:20:00.000Z' }]
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

const initialToothCharts: ClinicToothCharts = {
  'pt-1001': {
    46: { condition: 'RCT', notes: 'Pulpitis. Second sitting RCT underway. Bio-mechanical preparation completed.' },
    36: { condition: 'Caries', notes: 'Occlusal pit and fissure caries. Composite restoration recommended.' },
    16: { condition: 'Restored', notes: 'Occlusal composite restoration placed 2025.' },
    24: { condition: 'Healthy', notes: 'Normal vitality and intact margins.' }
  }
}


export interface PrescriptionItemRecord {
  id: string
  prescriptionId?: string
  medicineName: string
  strength?: string
  dosage: string
  route?: string
  frequency: string
  duration: string
  quantity?: number
  instructions?: string
}

export interface PrescriptionRecord {
  id: string
  clinicId?: string
  patientId: string
  doctorId: string
  prescriptionNumber: string
  diagnosis: string
  clinicalNotes?: string
  status: 'DRAFT' | 'FINALIZED' | 'CANCELLED'
  prescribedAt: string
  finalizedAt?: string
  finalizedById?: string
  cancelledAt?: string
  cancelledById?: string
  cancellationReason?: string
  createdAt?: string
  items: PrescriptionItemRecord[]
  patient?: {
    id: string
    patientCode?: string
    firstName: string
    lastName: string
    gender?: string
    dateOfBirth?: string
    mobile?: string
    medicalSafetyAlerts?: string[]
  }
  doctor?: {
    id: string
    fullName: string
    email?: string
    role?: string
  }
}

export const initialPrescriptions: PrescriptionRecord[] = [
  {
    id: 'rx-demo-001',
    patientId: 'pt-1001',
    doctorId: 'doc-001',
    prescriptionNumber: 'RX-1001',
    diagnosis: 'Acute Periapical Abscess (Tooth 16)',
    clinicalNotes: 'Initiated endodontic emergency relief. Warm saline rinses recommended.',
    status: 'FINALIZED',
    prescribedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    finalizedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    items: [
      {
        id: 'rxi-1',
        medicineName: 'Amoxicillin + Clavulanic Acid',
        strength: '625 mg',
        dosage: '1 tablet',
        route: 'Oral',
        frequency: '1-0-1 (Twice daily)',
        duration: '5 days',
        quantity: 10,
        instructions: 'Take immediately after food with plenty of water',
      },
      {
        id: 'rxi-2',
        medicineName: 'Ibuprofen + Paracetamol',
        strength: '400mg / 325mg',
        dosage: '1 tablet',
        route: 'Oral',
        frequency: '1-0-1 (Twice daily)',
        duration: '3 days',
        quantity: 6,
        instructions: 'Take strictly after meals for inflammatory pain',
      },
    ],
  },
  {
    id: 'rx-demo-002',
    patientId: 'pt-1002',
    doctorId: 'doc-001',
    prescriptionNumber: 'RX-1002',
    diagnosis: 'Generalized Chronic Marginal Gingivitis',
    clinicalNotes: 'Post ultrasonic scaling. Advised soft bristled toothbrush technique.',
    status: 'DRAFT',
    prescribedAt: new Date().toISOString(),
    items: [
      {
        id: 'rxi-3',
        medicineName: 'Chlorhexidine Gluconate Mouthwash',
        strength: '0.2% w/v',
        dosage: '10 ml',
        route: 'Topical Oral Rinse',
        frequency: '0-1-1 (Twice daily)',
        duration: '14 days',
        quantity: 1,
        instructions: 'Rinse undiluted for 30 seconds after brushing. Avoid food/drink for 30 minutes.',
      },
    ],
  },
]

export interface EnquiryRecord {
  id: string
  name: string
  phone?: string
  email?: string
  request: string
  status: 'PENDING' | 'CONTACTED' | 'CONVERTED' | 'DISMISSED'
  notes?: string
  createdAt: string
}

export const initialEnquiries: EnquiryRecord[] = [
  { id: 'enq-001', name: 'Ananya Pillai', phone: '+91 98472 33445', request: 'New patient · Cleaning', status: 'PENDING', createdAt: 'Today, 9:42 AM' },
  { id: 'enq-002', name: 'Vivek Menon', phone: '+91 98460 54321', request: 'Existing patient · Tooth pain', status: 'PENDING', createdAt: 'Today, 9:18 AM' },
  { id: 'enq-003', name: 'Sara Thomas', phone: '+91 97455 11223', request: 'New patient · Consultation', status: 'PENDING', createdAt: 'Yesterday, 5:36 PM' },
]

interface StoredClinicSnapshot {
  enquiries?: EnquiryRecord[]
  prescriptions?: PrescriptionRecord[]
  patients: PatientRecord[]
  appointments: AppointmentRecord[]
  clinicalNotes: ClinicalNoteRecord[]
  invoices: InvoiceRecord[]
  treatmentPlans: TreatmentPlanRecord[]
  patientDocuments: PatientDocumentRecord[]
  patientConsents: PatientConsentRecord[]
  toothCharts?: ClinicToothCharts
  walkInCounter?: number
}

export type SyncStatus = 'IDLE' | 'LOADING' | 'SYNCHRONIZED' | 'FAILED' | 'AUTH_EXPIRED';

// Active clinic context and multi-tenant storage scoping helpers
export const getAuthToken = (): string | null => {
  try {
    return (
      (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('docmatrix_auth_token')) ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('docmatrix_auth_token')) ||
      null
    );
  } catch {
    return null;
  }
};

export const getActiveClinicId = (): string | null => {
  try {
    const raw =
      (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('docmatrix_auth_user')) ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('docmatrix_auth_user'));
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed?.clinicId || null;
    }
  } catch {}
  return null;
};

export const isDemoSession = (): boolean => {
  try {
    const token = getAuthToken();
    if (!token) return true;
    if (token.startsWith('demo-') || token.startsWith('google-demo') || token.startsWith('demo-reg-token')) return true;
    const clinicId = getActiveClinicId();
    if (clinicId === 'clinic-demo-001') return true;
    const rawUser =
      (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('docmatrix_auth_user')) ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('docmatrix_auth_user'));
    if (rawUser) {
      try {
        const u = JSON.parse(rawUser);
        if (u?.email && u.email.toLowerCase() === 'demo@docmatrix.com') return true;
      } catch {}
    }
    return false;
  } catch {
    return true;
  }
};

export const isAuthenticatedClinic = (): boolean => {
  const token = getAuthToken();
  if (!token) return false;
  return !isDemoSession();
};

export const hasAuthToken = (): boolean => {
  return isAuthenticatedClinic();
};

export const getStorageKey = (): string => {
  const clinicId = getActiveClinicId();
  if (clinicId) {
    return `docmatrix_clinic_data_${clinicId}`;
  }
  return STORAGE_KEYS.DATA;
};

let syncStatusState: SyncStatus = 'IDLE';
let syncErrorState: string | null = null;
let lastSyncTimeState: string | null = null;
let currentSyncVersion = 0;

const initialIsAuth = isAuthenticatedClinic();
const activeKey = getStorageKey();

const emptySnapshot: StoredClinicSnapshot = {
  patients: [],
  appointments: [],
  clinicalNotes: [],
  invoices: [],
  treatmentPlans: [],
  patientDocuments: [],
  patientConsents: [],
  toothCharts: {},
  enquiries: [],
  walkInCounter: 101,
};

const demoSnapshot: StoredClinicSnapshot = {
  patients: initialPatients,
  appointments: initialAppointments,
  clinicalNotes: initialClinicalNotes,
  invoices: initialInvoices,
  treatmentPlans: initialTreatmentPlans,
  patientDocuments: initialPatientDocuments,
  patientConsents: initialPatientConsents,
  toothCharts: initialToothCharts,
  enquiries: initialEnquiries,
  walkInCounter: 101,
};

// Authenticated clinic sessions never load demo patients; they start with clinic-scoped data or empty
const loadedData = loadFromStorage<StoredClinicSnapshot>(activeKey, initialIsAuth ? emptySnapshot : demoSnapshot);

let patientsState: PatientRecord[] = Array.isArray(loadedData?.patients)
  ? loadedData.patients
  : (initialIsAuth ? [] : [...initialPatients]);

let appointmentsState: AppointmentRecord[] = Array.isArray(loadedData?.appointments)
  ? loadedData.appointments
  : (initialIsAuth ? [] : [...initialAppointments]);

let clinicalNotesState: ClinicalNoteRecord[] = Array.isArray(loadedData?.clinicalNotes)
  ? loadedData.clinicalNotes
  : (initialIsAuth ? [] : [...initialClinicalNotes]);

let invoicesState: InvoiceRecord[] = Array.isArray(loadedData?.invoices)
  ? loadedData.invoices
  : (initialIsAuth ? [] : [...initialInvoices]);

let treatmentPlansState: TreatmentPlanRecord[] = Array.isArray(loadedData?.treatmentPlans)
  ? loadedData.treatmentPlans
  : (initialIsAuth ? [] : [...initialTreatmentPlans]);

let patientDocumentsState: PatientDocumentRecord[] = Array.isArray(loadedData?.patientDocuments)
  ? loadedData.patientDocuments
  : (initialIsAuth ? [] : [...initialPatientDocuments]);

let patientConsentsState: PatientConsentRecord[] = Array.isArray(loadedData?.patientConsents)
  ? loadedData.patientConsents
  : (initialIsAuth ? [] : [...initialPatientConsents]);

let toothChartsState: ClinicToothCharts = loadedData?.toothCharts && typeof loadedData.toothCharts === 'object'
  ? loadedData.toothCharts
  : (initialIsAuth ? {} : { ...initialToothCharts });

let enquiriesState: EnquiryRecord[] = Array.isArray(loadedData?.enquiries)
  ? loadedData.enquiries
  : (initialIsAuth ? [] : [...initialEnquiries]);

let prescriptionsState: PrescriptionRecord[] = Array.isArray(loadedData?.prescriptions)
  ? loadedData.prescriptions
  : (initialIsAuth ? [] : [...initialPrescriptions]);

let walkInCounter = typeof loadedData?.walkInCounter === 'number' && loadedData.walkInCounter >= 100
  ? loadedData.walkInCounter
  : 101;

export interface ClinicSnapshot {
  patients: PatientRecord[];
  appointments: AppointmentRecord[];
  clinicalNotes: ClinicalNoteRecord[];
  invoices: InvoiceRecord[];
  treatmentPlans: TreatmentPlanRecord[];
  patientDocuments: PatientDocumentRecord[];
  patientConsents: PatientConsentRecord[];
  toothCharts: ClinicToothCharts;
  enquiries: EnquiryRecord[];
  prescriptions: PrescriptionRecord[];
  syncStatus: SyncStatus;
  syncError: string | null;
  lastSyncTime: string | null;
}

const listeners = new Set<() => void>();

let cachedSnapshot: ClinicSnapshot = {
  patients: patientsState,
  appointments: appointmentsState,
  clinicalNotes: clinicalNotesState,
  invoices: invoicesState,
  treatmentPlans: treatmentPlansState,
  patientDocuments: patientDocumentsState,
  patientConsents: patientConsentsState,
  toothCharts: toothChartsState,
  enquiries: enquiriesState,
  prescriptions: prescriptionsState,
  syncStatus: syncStatusState,
  syncError: syncErrorState,
  lastSyncTime: lastSyncTimeState,
};

const persistData = () => {
  const currentKey = getStorageKey();
  const dataToSave: StoredClinicSnapshot = {
    patients: patientsState,
    appointments: appointmentsState,
    clinicalNotes: clinicalNotesState,
    invoices: invoicesState,
    treatmentPlans: treatmentPlansState,
    patientDocuments: patientDocumentsState,
    patientConsents: patientConsentsState,
    toothCharts: toothChartsState,
    enquiries: enquiriesState,
    prescriptions: prescriptionsState,
    walkInCounter
  };
  saveToStorage<StoredClinicSnapshot>(currentKey, dataToSave);
  if (currentKey !== STORAGE_KEYS.DATA && isDemoSession()) {
    saveToStorage<StoredClinicSnapshot>(STORAGE_KEYS.DATA, dataToSave);
  }
};

const emitChange = () => {
  cachedSnapshot = {
    patients: patientsState,
    appointments: appointmentsState,
    clinicalNotes: clinicalNotesState,
    invoices: invoicesState,
    treatmentPlans: treatmentPlansState,
    patientDocuments: patientDocumentsState,
    patientConsents: patientConsentsState,
    toothCharts: toothChartsState,
    enquiries: enquiriesState,
    prescriptions: prescriptionsState,
    syncStatus: syncStatusState,
    syncError: syncErrorState,
    lastSyncTime: lastSyncTimeState,
  };
  persistData();
  for (const listener of listeners) {
    listener();
  }
};

export const subscribeClinicData = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getClinicSnapshot = () => cachedSnapshot;

export const useClinicData = () => {
  return useSyncExternalStore(subscribeClinicData, getClinicSnapshot, getClinicSnapshot);
};

/**
 * Initialize or switch clinic session. Cancels any in-flight sync requests.
 */
export const initClinicSession = (clinicId?: string) => {
  currentSyncVersion++;
  const isAuth = isAuthenticatedClinic();
  const storageKey = isAuth && clinicId ? `docmatrix_clinic_data_${clinicId}` : (isAuth ? getStorageKey() : STORAGE_KEYS.DATA);
  const loaded = loadFromStorage<StoredClinicSnapshot>(storageKey, isAuth ? emptySnapshot : demoSnapshot);

  patientsState = Array.isArray(loaded?.patients)
    ? loaded.patients
    : (isAuth ? [] : [...initialPatients]);

  appointmentsState = Array.isArray(loaded?.appointments)
    ? loaded.appointments
    : (isAuth ? [] : [...initialAppointments]);

  clinicalNotesState = Array.isArray(loaded?.clinicalNotes)
    ? loaded.clinicalNotes
    : (isAuth ? [] : [...initialClinicalNotes]);

  invoicesState = Array.isArray(loaded?.invoices)
    ? loaded.invoices
    : (isAuth ? [] : [...initialInvoices]);

  treatmentPlansState = Array.isArray(loaded?.treatmentPlans)
    ? loaded.treatmentPlans
    : (isAuth ? [] : [...initialTreatmentPlans]);

  patientDocumentsState = Array.isArray(loaded?.patientDocuments)
    ? loaded.patientDocuments
    : (isAuth ? [] : [...initialPatientDocuments]);

  patientConsentsState = Array.isArray(loaded?.patientConsents)
    ? loaded.patientConsents
    : (isAuth ? [] : [...initialPatientConsents]);

  toothChartsState = loaded?.toothCharts && typeof loaded.toothCharts === 'object'
    ? loaded.toothCharts
    : (isAuth ? {} : { ...initialToothCharts });

  enquiriesState = Array.isArray(loaded?.enquiries)
    ? loaded.enquiries
    : (isAuth ? [] : [...initialEnquiries]);

  prescriptionsState = Array.isArray(loaded?.prescriptions)
    ? loaded.prescriptions
    : (isAuth ? [] : [...initialPrescriptions]);

  walkInCounter = typeof loaded?.walkInCounter === 'number' && loaded.walkInCounter >= 100
    ? loaded.walkInCounter
    : 101;

  syncStatusState = isAuth ? 'IDLE' : 'SYNCHRONIZED';
  syncErrorState = null;
  emitChange();
};

/**
 * Clear clinic-scoped store completely on logout or account switch
 */
export const clearClinicStore = () => {
  currentSyncVersion++;
  const currentKey = getStorageKey();
  removeFromStorage(currentKey);
  removeFromStorage(STORAGE_KEYS.DATA);
  patientsState = [];
  appointmentsState = [];
  clinicalNotesState = [];
  invoicesState = [];
  treatmentPlansState = [];
  patientDocumentsState = [];
  patientConsentsState = [];
  toothChartsState = {};
  enquiriesState = [];
  prescriptionsState = [];
  walkInCounter = 101;
  syncStatusState = 'IDLE';
  syncErrorState = null;
  lastSyncTimeState = null;
  emitChange();
};

const BOOKING_REF_MAP_KEY = 'docmatrix_booking_ref_map';

const loadBookingRefMap = (): Record<string, string> => {
  try {
    if (typeof localStorage === 'undefined') return {};
    const raw = localStorage.getItem(BOOKING_REF_MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

let bookingRefMap: Record<string, string> = loadBookingRefMap();

export const registerBookingRef = (bookingRef: string, backendId: string) => {
  if (!bookingRef || !backendId) return;
  bookingRefMap[bookingRef] = backendId;
  bookingRefMap[backendId] = bookingRef;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(BOOKING_REF_MAP_KEY, JSON.stringify(bookingRefMap));
    }
  } catch { /* ignore */ }
};

export const resolveAppointmentId = (id?: string): string => {
  if (!id) return '';
  const mapped = bookingRefMap[id];
  if (mapped && id.startsWith('APT-')) return mapped;
  return id;
};

export const matchesAppointmentId = (appt: AppointmentRecord, id?: string): boolean => {
  if (!appt || !id) return false;
  if (appt.id === id || appt.backendId === id || appt.bookingRef === id) return true;
  const mapped = bookingRefMap[id];
  if (mapped && (appt.id === mapped || appt.backendId === mapped || appt.bookingRef === mapped)) return true;
  return false;
};

export const findAppointment = (
  appointments: AppointmentRecord[],
  id?: string
): AppointmentRecord | undefined => {
  if (!id) return undefined;
  return appointments.find((entry) => matchesAppointmentId(entry, id));
};

export const computeAgeFromDob = (dob?: string, fallbackAge?: string): string => {
  const cleanFallback = fallbackAge !== undefined && fallbackAge !== null ? String(fallbackAge).trim() : '';
  if (dob && typeof dob === 'string' && dob.trim() !== '') {
    const trimmedDob = dob.trim();
    // If legacy placeholder 1990-01-01 was used alongside an explicit non-default age, preserve fallbackAge
    if (trimmedDob.startsWith('1990-01-01') && cleanFallback && cleanFallback !== '30') {
      return cleanFallback;
    }
    const birth = new Date(trimmedDob.length === 10 ? `${trimmedDob}T00:00:00` : trimmedDob);
    if (!Number.isNaN(birth.getTime())) {
      const now = new Date();
      let years = now.getFullYear() - birth.getFullYear();
      const monthDiff = now.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
        years -= 1;
      }
      if (years >= 0 && years <= 130) {
        return String(years);
      }
    }
  }
  return cleanFallback;
};

const NON_CLINICAL_NAMES = new Set([
  'unassigned',
  'dr. attending dentist',
  'attending dentist',
  'reception staff',
  'organization admin',
  'branch admin',
  'clinic admin',
  'admin',
  'clinical staff',
  'aashna jose alappattu',
  'aashna jose',
]);

const NON_CLINICAL_ROLES = new Set([
  'RECEPTIONIST',
  'ORGANIZATION_ADMIN',
  'BRANCH_ADMIN',
  'ADMIN',
  'STAFF',
]);

export const isClinicalDoctorName = (name?: string): boolean => {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (NON_CLINICAL_NAMES.has(lower)) return false;

  try {
    if (typeof localStorage !== 'undefined') {
      const rawStaff =
        localStorage.getItem('docmatrix_clinic_staff') ||
        localStorage.getItem('docmatrix_staff_members_v1');
      if (rawStaff) {
        const staffList = JSON.parse(rawStaff);
        if (Array.isArray(staffList)) {
          const matched = staffList.find(
            (s: any) => String(s?.name || s?.fullName || '').trim().toLowerCase() === lower
          );
          if (matched?.role) {
            const roleUpper = String(matched.role).toUpperCase();
            if (roleUpper !== 'DOCTOR') return false;
            return true;
          }
        }
      }
      const rawUser =
        (typeof sessionStorage !== 'undefined' &&
          (sessionStorage.getItem('docmatrix_auth_user') || sessionStorage.getItem('docmatrix_current_user'))) ||
        localStorage.getItem('docmatrix_auth_user') ||
        localStorage.getItem('docmatrix_current_user');
      if (rawUser) {
        const currentUser = JSON.parse(rawUser);
        const currentName = String(currentUser?.fullName || currentUser?.name || '').trim().toLowerCase();
        const currentRole = String(currentUser?.role || '').toUpperCase();
        if (currentName === lower && currentRole !== 'DOCTOR') {
          return false;
        }
      }
    }
  } catch { /* ignore */ }

  if (DENTISTS.some((d) => d.name.toLowerCase() === lower)) return true;
  if (/^dr\.?\s+/i.test(trimmed)) return true;
  return false;
};

export const resolvePlanDoctor = (
  rawDoctorName: string | undefined,
  patientId: string | undefined,
  patientCode: string | undefined,
  categoryOrProcedure: string | undefined,
  appointments: AppointmentRecord[] = appointmentsState
): string => {
  if (isClinicalDoctorName(rawDoctorName)) {
    return rawDoctorName!.trim();
  }

  const pIdLower = (patientId || '').toLowerCase();
  const pCodeLower = (patientCode || '').toLowerCase();
  const patientAppts = appointments.filter((a) => {
    const aPid = (a.patientId || '').toLowerCase();
    return (
      (pIdLower && aPid === pIdLower) ||
      (pCodeLower && aPid === pCodeLower)
    ) && isClinicalDoctorName(a.doctor);
  });

  const activeAppts = patientAppts.filter((a) => a.status !== 'cancelled' && a.status !== 'no-show');
  const candidateAppts = activeAppts.length > 0 ? activeAppts : patientAppts;

  const catLower = (categoryOrProcedure || '').toLowerCase();
  if (catLower && candidateAppts.length > 0) {
    const specialtyMatch = candidateAppts.find((a) => {
      const dentist = DENTISTS.find((d) => d.name.toLowerCase() === a.doctor.toLowerCase());
      if (!dentist) return false;
      const spec = dentist.specialization.toLowerCase();
      return (
        (catLower.includes('endo') || catLower.includes('root canal')) && spec.includes('endo') ||
        (catLower.includes('ortho') || catLower.includes('aligner')) && spec.includes('ortho') ||
        (catLower.includes('surg') || catLower.includes('extract') || catLower.includes('implant')) && spec.includes('surg') ||
        (catLower.includes('pedi')) && spec.includes('pedi') ||
        (catLower.includes('prostho') || catLower.includes('crown') || catLower.includes('restor') || catLower.includes('cosmetic') || catLower.includes('veneer')) && spec.includes('prostho')
      );
    });
    if (specialtyMatch) return specialtyMatch.doctor;
  }

  const completedMatch = candidateAppts.find((a) => a.status === 'completed');
  if (completedMatch) return completedMatch.doctor;
  if (candidateAppts.length > 0) return candidateAppts[0].doctor;

  if (catLower) {
    const dentistByCat = DENTISTS.find((d) => {
      const spec = d.specialization.toLowerCase();
      return (
        (catLower.includes('endo') || catLower.includes('root canal')) && spec.includes('endo') ||
        (catLower.includes('ortho') || catLower.includes('aligner')) && spec.includes('ortho') ||
        (catLower.includes('surg') || catLower.includes('extract') || catLower.includes('implant')) && spec.includes('surg') ||
        (catLower.includes('pedi')) && spec.includes('pedi') ||
        (catLower.includes('prostho') || catLower.includes('crown') || catLower.includes('veneer')) && spec.includes('prostho')
      );
    });
    if (dentistByCat) return dentistByCat.name;
  }

  return DENTISTS[0]?.name || 'Dr. Arun Kumar';
};

export const mapRemoteAppointment = (a: any): AppointmentRecord => {
  const resolvedChair = a.chair || a.operatoryChair || 'Chair 1';
  const dentistByChair = DENTISTS.find((d) => d.chair === resolvedChair);
  const resolvedDoctor = (a.doctor && a.doctor !== 'Unassigned' && isClinicalDoctorName(a.doctor))
    ? a.doctor
    : (a.doctorName && a.doctorName !== 'Unassigned' && isClinicalDoctorName(a.doctorName))
      ? a.doctorName
      : (dentistByChair ? dentistByChair.name : (a.doctor || 'Dr. Arun Kumar'));
  const existing = appointmentsState.find(
    (entry) => entry.id === a.id || entry.backendId === a.id
  );
  const mappedRef = bookingRefMap[a.id] || existing?.bookingRef;
  if (mappedRef && a.id) {
    registerBookingRef(mappedRef, a.id);
  }
  return {
    id: a.id,
    backendId: a.id,
    bookingRef: mappedRef,
    patientId: a.patientCode || a.patient?.patientCode || a.patientId,
    patientName: a.patientName || (a.patient ? `${a.patient.firstName || ''} ${a.patient.lastName || ''}`.trim() : undefined),
    doctor: resolvedDoctor,
    chair: resolvedChair,
    treatmentType: a.treatmentType || a.visitType || 'General Consultation',
    visitType: a.visitType || 'General Consultation',
    date: typeof a.date === 'string' ? a.date.slice(0, 10) : a.date,
    time: a.time,
    durationMinutes: a.durationMinutes || 30,
    status: (typeof a.status === 'string' ? a.status.toLowerCase().replace('_', '-') : 'scheduled') as AppointmentStatus,
    priority: (typeof a.priority === 'string' ? a.priority.toLowerCase() : 'normal') as AppointmentPriority,
    notes: a.notes || '',
    isWalkIn: Boolean(a.isWalkIn),
    createdAt: a.createdAt || new Date().toISOString(),
  };
};

export const fetchAppointmentById = async (id: string): Promise<AppointmentRecord | null> => {
  if (!id) return null;
  const existing = findAppointment(appointmentsState, id);
  if (existing) return existing;

  const token = getAuthToken();
  if (!token || isDemoSession()) return null;

  const resolvedId = resolveAppointmentId(id);
  try {
    if (resolvedId && !resolvedId.startsWith('APT-')) {
      const remote = await apiClient.get<any>(`/appointments/${resolvedId}`);
      if (remote && remote.id) {
        if (id.startsWith('APT-')) {
          registerBookingRef(id, remote.id);
        }
        const mapped = mapRemoteAppointment(remote);
        if (id.startsWith('APT-') && !mapped.bookingRef) {
          mapped.bookingRef = id;
        }
        const idx = appointmentsState.findIndex((entry) => matchesAppointmentId(entry, mapped.id) || matchesAppointmentId(entry, id));
        if (idx >= 0) {
          appointmentsState = appointmentsState.map((entry, i) => (i === idx ? { ...entry, ...mapped } : entry));
        } else {
          appointmentsState = [mapped, ...appointmentsState];
        }
        emitChange();
        return mapped;
      }
    }
  } catch {
    // Fall through to full appointments sync if direct fetch fails
  }

  try {
    await syncWithBackend();
    const afterSync = findAppointment(appointmentsState, id);
    if (afterSync) return afterSync;
  } catch { /* ignore */ }

  return null;
};

/**
 * Synchronize local clinic store with DocMatrix NestJS/PostgreSQL backend.
 * Overwrites with authoritative database records; never appends mock data.
 */
export const syncWithBackend = async (): Promise<void> => {
  if (isDemoSession()) {
    syncStatusState = 'SYNCHRONIZED';
    syncErrorState = null;
    emitChange();
    return;
  }

  const token = getAuthToken();
  if (!token) {
    syncStatusState = 'IDLE';
    syncErrorState = null;
    emitChange();
    return;
  }

  const syncVersion = ++currentSyncVersion;
  syncStatusState = 'LOADING';
  syncErrorState = null;
  emitChange();

  const safeFetch = async <T>(promise: Promise<T>, fallback: T): Promise<T> => {
    try {
      return await promise;
    } catch (err: any) {
      if (
        err?.status === 401 ||
        err?.status === 403 ||
        err?.response?.status === 401 ||
        err?.response?.status === 403 ||
        err?.message?.includes('401') ||
        err?.message?.includes('403') ||
        err?.message?.toLowerCase().includes('unauthorized')
      ) {
        throw err;
      }
      return fallback;
    }
  };

  try {
    const [
      remotePatients,
      remoteAppts,
      remoteCharts,
      remoteDocs,
      remoteConsents,
      remoteEnquiries,
      remotePrescriptions,
      remoteClinicalNotes,
      remoteTreatmentPlans,
      remoteInvoices,
    ] = await Promise.all([
      apiClient.get<any[]>('/patients?includeArchived=true'),
      apiClient.get<any[]>('/appointments'),
      safeFetch(apiClient.get<Record<string, Record<number, { condition: string; notes?: string }>>>('/clinical/tooth-charts'), {}),
      safeFetch(apiClient.get<any[]>('/clinical/documents'), []),
      safeFetch(apiClient.get<any[]>('/clinical/consents'), []),
      safeFetch(apiClient.get<any[]>('/enquiries'), []),
      safeFetch(apiClient.get<any[]>('/prescriptions'), []),
      safeFetch(apiClient.get<any[]>('/clinical-notes'), []),
      safeFetch(apiClient.get<any>('/treatment-plans'), { items: [] }),
      safeFetch(billingApi.getInvoices({ limit: 500 }), { data: [] } as any),
    ]);

    // Also trigger master billing data sync (tariffs, expenses) in background
    import('./billingStore')
      .then(({ syncBillingMasterData }) => syncBillingMasterData())
      .catch((e) => console.warn('[clinicStore] syncBillingMasterData failed:', e));

    if (syncVersion !== currentSyncVersion) return;

    const mappedPatients: PatientRecord[] = Array.isArray(remotePatients)
      ? remotePatients.map((p: any) => ({
          id: p.patientCode || p.id,
          backendId: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          age: computeAgeFromDob(p.dateOfBirth, p.age) || '30',
          dateOfBirth: p.dateOfBirth || '',
          gender: (p.gender || 'other').toLowerCase(),
          mobile: p.mobile,
          countryCode: p.countryCode || '+91',
          email: p.email || '',
          language: 'English',
          city: p.city || '',
          state: p.state || '',
          postalCode: p.postalCode || '',
          address: p.address || '',
          emergencyName: p.emergencyName || '',
          emergencyPhone: p.emergencyPhone || '',
          relationship: p.relationship || '',
          allergies: p.medicalSafetyAlerts?.allergies ? 'yes' : 'no',
          allergiesDetails: p.medicalSafetyAlerts?.allergies || '',
          medications: p.medicalSafetyAlerts?.medications ? 'yes' : 'no',
          medicationsDetails: p.medicalSafetyAlerts?.medications || '',
          conditions: p.medicalSafetyAlerts?.conditions ? 'yes' : 'no',
          conditionsDetails: p.medicalSafetyAlerts?.conditions || '',
          createdAt: p.createdAt || new Date().toISOString(),
        }))
      : [];

    const mappedAppts: AppointmentRecord[] = Array.isArray(remoteAppts)
      ? remoteAppts.map((a: any) => mapRemoteAppointment(a))
      : [];

    const mappedDocs: PatientDocumentRecord[] = Array.isArray(remoteDocs)
      ? remoteDocs.map((d: any) => ({
          id: d.id,
          patientId: d.patientId,
          title: d.title,
          category: d.category,
          fileName: d.fileName,
          fileSize: d.fileSize,
          uploadDate: d.uploadDate || d.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
          doctor: d.doctor || 'Dr. Arun Kumar',
          url: d.downloadUrl,
        }))
      : [];

    const mappedConsents: PatientConsentRecord[] = Array.isArray(remoteConsents)
      ? remoteConsents.map((c: any) => ({
          id: c.id,
          patientId: c.patientId,
          consentType: c.consentType,
          status: c.status || 'Signed',
          dateRecorded: c.dateRecorded || c.createdAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
          recordedBy: c.recordedBy || 'Clinical Staff',
          documentRef: c.documentRef || '',
          notes: c.notes || '',
        }))
      : [];

    // Authoritative backend data: strictly assign (no dummy records retained)
    const mappedEnquiries: EnquiryRecord[] = Array.isArray(remoteEnquiries)
      ? remoteEnquiries.map((e: any) => ({
          id: e.id,
          name: e.name,
          phone: e.phone || '',
          email: e.email || '',
          request: e.request,
          status: (e.status || 'PENDING') as any,
          notes: e.notes || '',
          createdAt: e.createdAt || new Date().toISOString(),
        }))
      : [];

    const mappedPrescriptions: PrescriptionRecord[] = Array.isArray(remotePrescriptions)
      ? remotePrescriptions.map((p: any) => ({
          id: p.id,
          clinicId: p.clinicId,
          patientId: p.patientId,
          doctorId: p.doctorId,
          prescriptionNumber: p.prescriptionNumber,
          diagnosis: p.diagnosis,
          clinicalNotes: p.clinicalNotes || '',
          status: p.status,
          prescribedAt: p.prescribedAt || p.createdAt,
          finalizedAt: p.finalizedAt,
          finalizedById: p.finalizedById,
          cancelledAt: p.cancelledAt,
          cancelledById: p.cancelledById,
          cancellationReason: p.cancellationReason,
          createdAt: p.createdAt,
          items: Array.isArray(p.items)
            ? p.items.map((it: any) => ({
                id: it.id,
                prescriptionId: it.prescriptionId,
                medicineName: it.medicineName,
                strength: it.strength || '',
                dosage: it.dosage,
                route: it.route || 'Oral',
                frequency: it.frequency,
                duration: it.duration,
                quantity: it.quantity,
                instructions: it.instructions || '',
              }))
            : [],
          patient: p.patient
            ? {
                id: p.patient.id,
                patientCode: p.patient.patientCode,
                firstName: p.patient.firstName,
                lastName: p.patient.lastName,
                gender: p.patient.gender,
                dateOfBirth: p.patient.dateOfBirth,
                mobile: p.patient.mobile,
                medicalSafetyAlerts: Array.isArray(p.patient.medicalSafetyAlerts)
                  ? p.patient.medicalSafetyAlerts
                  : [],
              }
            : undefined,
          doctor: p.doctor
            ? {
                id: p.doctor.id,
                fullName: p.doctor.fullName,
                email: p.doctor.email,
                role: p.doctor.role,
              }
            : undefined,
        }))
      : [];

    const mappedClinicalNotes: ClinicalNoteRecord[] = Array.isArray(remoteClinicalNotes)
      ? remoteClinicalNotes.map((n: any) => ({
          id: n.id,
          clinicId: n.clinicId,
          patientId: n.patient?.patientCode || n.patientId,
          appointmentId: n.appointmentId,
          doctorId: n.doctorId,
          noteNumber: n.noteNumber,
          consultationDate: n.consultationDate,
          consultationType: n.consultationType,
          status: n.status,
          finalizedAt: n.finalizedAt,
          finalizedById: n.finalizedById,
          finalizedByName: n.finalizedByName,
          doctorName: n.doctor?.fullName || n.finalizedByName || 'Attending Doctor',
          chiefComplaint: n.chiefComplaint,
          symptoms: n.symptoms,
          symptomDuration: n.symptomDuration,
          painSeverity: n.painSeverity,
          historyNotes: n.historyNotes,
          extraoralFindings: n.extraoralFindings,
          intraoralFindings: n.intraoralFindings,
          toothSpecificFindings: n.toothSpecificFindings,
          periodontalFindings: n.periodontalFindings,
          examinationNotes: n.examinationNotes,
          primaryDiagnosis: n.primaryDiagnosis,
          additionalDiagnoses: n.additionalDiagnoses,
          diagnosisNotes: n.diagnosisNotes,
          treatmentPerformed: n.treatmentPerformed,
          treatmentToothNumber: n.treatmentToothNumber,
          treatmentDescription: n.treatmentDescription,
          materialsUsed: n.materialsUsed,
          treatmentOutcome: n.treatmentOutcome,
          treatmentRecommendations: n.treatmentRecommendations,
          referralNotes: n.referralNotes,
          followUpRequired: n.followUpRequired,
          followUpDate: n.followUpDate,
          followUpInstructions: n.followUpInstructions,
          patientAdvice: n.patientAdvice,
          addenda: Array.isArray(n.addenda) ? n.addenda : [],
          visitDate: n.consultationDate ? n.consultationDate.slice(0, 10) : (n.createdAt ? n.createdAt.slice(0, 10) : getTodayDateStr()),
          complaint: n.chiefComplaint || '',
          findings: n.examinationNotes || n.intraoralFindings || '',
          plan: n.treatmentRecommendations || n.treatmentPerformed || '',
          patient: n.patient
            ? {
                id: n.patient.id,
                patientCode: n.patient.patientCode,
                firstName: n.patient.firstName,
                lastName: n.patient.lastName,
                gender: n.patient.gender,
                dateOfBirth: n.patient.dateOfBirth,
                mobile: n.patient.mobile,
                medicalSafetyAlerts: Array.isArray(n.patient.medicalSafetyAlerts)
                  ? n.patient.medicalSafetyAlerts
                  : [],
              }
            : undefined,
          doctor: n.doctor
            ? {
                id: n.doctor.id,
                fullName: n.doctor.fullName,
                email: n.doctor.email,
                role: n.doctor.role,
              }
            : undefined,
          createdAt: n.createdAt || new Date().toISOString(),
          updatedAt: n.updatedAt,
        }))
      : [];

    const rawPlansList = Array.isArray(remoteTreatmentPlans)
      ? remoteTreatmentPlans
      : (Array.isArray(remoteTreatmentPlans?.items) ? remoteTreatmentPlans.items : []);

    const mappedTreatmentPlans: TreatmentPlanRecord[] = rawPlansList.map((tp: any) => {
      let s: TreatmentPlanRecord['status'] = 'Proposed';
      if (tp.status === 'ACCEPTED') s = 'Accepted';
      else if (tp.status === 'IN_PROGRESS') s = 'In Progress';
      else if (tp.status === 'COMPLETED') s = 'Completed';
      else if (tp.status === 'PENDING') s = 'Pending';
      else if (tp.status === 'REJECTED') s = 'Rejected';
      else if (tp.status === 'CANCELLED') s = 'Cancelled';

      const stages: TreatmentPlanStageRecord[] = Array.isArray(tp.stages)
        ? tp.stages.map((st: any) => ({
            id: st.id,
            treatmentPlanId: st.treatmentPlanId,
            stageNumber: st.stageNumber,
            name: st.name,
            status: st.status,
            targetDate: st.targetDate ? st.targetDate.slice(0, 10) : undefined,
            estimatedCost: Number(st.estimatedCost) || 0,
            items: Array.isArray(st.items)
              ? st.items.map((it: any) => ({
                  id: it.id,
                  stageId: it.stageId,
                  procedureCode: it.procedureCode,
                  procedureName: it.procedureName,
                  category: it.category,
                  toothNumber: it.toothNumber,
                  surface: it.surface,
                  quantity: it.quantity || 1,
                  unitFee: Number(it.unitFee) || 0,
                  discount: Number(it.discount) || 0,
                  netFee: Number(it.netFee) || 0,
                  status: it.status,
                  notes: it.notes,
                }))
              : [],
          }))
        : [];

      const estimateRevisions: TreatmentEstimateRevisionRecord[] = Array.isArray(tp.estimateRevisions)
        ? tp.estimateRevisions.map((rev: any) => ({
            id: rev.id,
            treatmentPlanId: rev.treatmentPlanId,
            versionNumber: rev.versionNumber,
            revisionReason: rev.revisionReason,
            subtotal: Number(rev.subtotal) || 0,
            discount: Number(rev.discount) || 0,
            tax: Number(rev.tax) || 0,
            totalEstimatedCost: Number(rev.totalEstimatedCost) || 0,
            status: rev.status,
            acceptedAt: rev.acceptedAt,
            acceptedByName: rev.acceptedByName,
            acceptanceMethod: rev.acceptanceMethod,
            isStaffRecorded: rev.isStaffRecorded,
            createdByName: rev.createdByName,
            createdAt: rev.createdAt,
            itemsSnapshot: rev.itemsSnapshot,
          }))
        : [];

      const primaryItem = stages[0]?.items[0];
      const cost = Number(tp.totalEstimatedCost) || Number(tp.subtotal) || 0;
      const linkedAppt = tp.appointmentId
        ? mappedAppts.find((a) => a.id === tp.appointmentId || a.backendId === tp.appointmentId)
        : undefined;
      const resolvedDoctorName = isClinicalDoctorName(tp.doctorName)
        ? tp.doctorName.trim()
        : (linkedAppt && isClinicalDoctorName(linkedAppt.doctor))
          ? linkedAppt.doctor
          : resolvePlanDoctor(
              tp.doctorName,
              tp.patientId,
              tp.patient?.patientCode,
               `${primaryItem?.category || ''} ${primaryItem?.procedureName || ''} ${tp.title || ''}`,
              mappedAppts
            );

      return {
        id: tp.id,
        backendId: tp.id,
        clinicId: tp.clinicId,
        planNumber: tp.planNumber || tp.id,
        patientId: tp.patient?.patientCode || tp.patientId,
        title: tp.title || primaryItem?.procedureName || 'Dental Care Plan',
        procedure: tp.title || primaryItem?.procedureName || 'Comprehensive Care Plan',
        category: primaryItem?.category || 'General',
        toothNumber: primaryItem?.toothNumber || '',
        status: s,
        cost,
        doctor: resolvedDoctorName,
        doctorId: tp.doctorId,
        notes: tp.notes || '',
        date: tp.createdAt ? tp.createdAt.slice(0, 10) : getTodayDateStr(),
        subtotal: Number(tp.subtotal) || cost,
        discount: Number(tp.discount) || 0,
        tax: Number(tp.tax) || 0,
        totalEstimatedCost: cost,
        currentVersion: tp.currentVersion || 1,
        acceptedVersion: tp.acceptedVersion,
        patientAcceptedAt: tp.patientAcceptedAt,
        patientAcceptedByName: tp.patientAcceptedByName,
        acceptanceMethod: tp.acceptanceMethod,
        isStaffRecorded: tp.isStaffRecorded,
        rejectionReason: tp.rejectionReason,
        origin: tp.origin,
        stages,
        estimateRevisions,
        patient: tp.patient,
      };
    });

    const rawInvoicesList = Array.isArray(remoteInvoices?.data)
      ? remoteInvoices.data
      : (Array.isArray(remoteInvoices) ? remoteInvoices : []);

    const mappedInvoices: InvoiceRecord[] = rawInvoicesList.map((inv: any) => ({
      id: inv.invoiceNumber || inv.id,
      backendId: inv.id,
      patientId: inv.patient?.patientCode || inv.patientId,
      description:
        inv.description ||
        (Array.isArray(inv.items) && inv.items.length > 0
          ? inv.items.map((i: any) => i.name).join(', ')
          : 'Dental Treatment'),
      amount: Number(inv.totalAmount) || 0,
      subtotal: Number(inv.subtotal) || 0,
      discountTotal: Number(inv.discountTotal) || 0,
      taxTotal: Number(inv.taxTotal) || 0,
      status: toFrontendStatus(inv.status),
      createdAt: inv.createdAt || new Date().toISOString(),
      dueDate: inv.dueDate || undefined,
      appointmentId: inv.appointmentId || undefined,
      notes: inv.notes || undefined,
      items: Array.isArray(inv.items)
        ? inv.items.map((it: any) => ({
            id: it.id,
            serviceId: it.serviceTariffId || undefined,
            name: it.name,
            toothNumber: it.toothNumber || undefined,
            qty: Number(it.quantity) || 1,
            unitPrice: Number(it.unitPrice) || 0,
            discount: Number(it.discount) || 0,
            gstRate: Number(it.gstRate) || 0,
          }))
        : [],
      payments: Array.isArray(inv.payments)
        ? inv.payments.map((p: any) => ({
            id: p.id,
            amount: p.type === 'REFUND' ? -Math.abs(Number(p.amount) || 0) : (Number(p.amount) || 0),
            mode: toFrontendMode(p.mode) as PaymentMode,
            reference: p.reference || undefined,
            receivedAt: p.receivedAt || new Date().toISOString(),
            type: p.type || 'PAYMENT',
          }))
        : [],
    }));

    const inFlightAppts = appointmentsState.filter(
      (a) => (a as any)._syncing && !mappedAppts.some((m) => matchesAppointmentId(m, a.id) || (a.bookingRef && matchesAppointmentId(m, a.bookingRef)))
    );

    patientsState = mappedPatients;
    appointmentsState = [...inFlightAppts, ...mappedAppts];
    toothChartsState = remoteCharts && typeof remoteCharts === 'object' ? (remoteCharts as ClinicToothCharts) : {};
    patientDocumentsState = mappedDocs;
    patientConsentsState = mappedConsents;
    enquiriesState = mappedEnquiries;
    prescriptionsState = mappedPrescriptions;
    clinicalNotesState = mappedClinicalNotes;
    treatmentPlansState = mappedTreatmentPlans;
    invoicesState = mappedInvoices;

    syncStatusState = 'SYNCHRONIZED';
    syncErrorState = null;
    lastSyncTimeState = new Date().toISOString();
    emitChange();
  } catch (err: any) {
    if (syncVersion !== currentSyncVersion) return;
    const isAuthError =
      err?.status === 401 ||
      err?.status === 403 ||
      err?.response?.status === 401 ||
      err?.response?.status === 403 ||
      err?.message?.includes('401') ||
      err?.message?.includes('403') ||
      err?.message?.toLowerCase().includes('unauthorized');

    if (isAuthError) {
      syncStatusState = 'AUTH_EXPIRED';
      syncErrorState = 'Authentication session expired. Please log in again.';
    } else {
      syncStatusState = 'FAILED';
      syncErrorState = err?.message || 'Data synchronization failed';
    }
    emitChange();
    console.warn('[clinicStore] syncWithBackend failed:', err);
  }
};

export const retrySync = async (): Promise<void> => {
  return syncWithBackend();
};

export const getSyncStatus = (): { status: SyncStatus; error: string | null; lastSyncTime: string | null } => {
  return {
    status: syncStatusState,
    error: syncErrorState,
    lastSyncTime: lastSyncTimeState,
  };
};

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
  const localId = `APT-${Date.now().toString().slice(-4)}`

  const newAppt: AppointmentRecord = {
    id: localId,
    bookingRef: localId,
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

  // Background sync to backend if authenticated
  try {
    const token = typeof sessionStorage !== 'undefined'
      ? (sessionStorage.getItem('docmatrix_auth_token') || localStorage.getItem('docmatrix_auth_token'))
      : null;
    if (token) {
      (newAppt as any)._syncing = true;
      const syncTask = async () => {
        const patient = patientsState.find((p) => p.id === data.patientId || p.backendId === data.patientId) as any;
        if (patient?._syncPromise) {
          await patient._syncPromise.catch(() => {});
        }
        const targetPatientId = patient?.backendId || patient?.id || data.patientId;

        const created = await apiClient.post('/appointments', {
          patientId: targetPatientId,
          doctorName: data.doctor,
          chair,
          treatmentType: data.treatmentType || data.visitType,
          visitType: data.visitType,
          date: data.date,
          time: data.time,
          durationMinutes: data.durationMinutes || 30,
          priority: data.priority || 'normal',
          notes: data.notes || '',
        });
        (newAppt as any)._syncing = false;
        if (created?.id) {
          registerBookingRef(localId, created.id);
          newAppt.backendId = created.id;
          newAppt.bookingRef = localId;
          if (created.id !== newAppt.id) {
            newAppt.id = created.id;
          }
          // Deduplicate in case syncWithBackend already fetched created.id
          const seen = new Set<string>();
          appointmentsState = appointmentsState
            .map((entry) =>
              entry === newAppt || entry.id === localId || entry.bookingRef === localId || entry.id === created.id
                ? { ...entry, ...newAppt, id: created.id, backendId: created.id, bookingRef: localId }
                : entry
            )
            .filter((entry) => {
              const key = entry.backendId || entry.id;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
          emitChange();
        }
        return created;
      };

      const syncPromise = syncTask().catch((err) => {
        (newAppt as any)._syncing = false;
        console.error('[clinicStore] bookAppointment sync failed (retained locally):', err);
      });
      (newAppt as any)._syncPromise = syncPromise;
    }
  } catch { /* ignore */ }

  return newAppt
}

export const rescheduleAppointment = (
  appointmentId: string,
  newDate: string,
  newTime: string,
  reason: string
): { success: boolean; error?: string } => {
  const appt = findAppointment(appointmentsState, appointmentId)
  if (!appt) return { success: false, error: 'Appointment not found.' }

  const availability = checkDentistAvailability(
    appt.doctor,
    newDate,
    newTime,
    appt.durationMinutes || 30,
    appt.id
  )

  // Only hard-block true appointment double-booking overlaps; allow overriding shift/lunch hours when explicitly rescheduling
  const isDoubleBooking = Boolean(!availability.available && availability.reason?.includes('already has appointment'))
  if (isDoubleBooking) {
    return { success: false, error: availability.reason }
  }

  const resolvedReason = reason?.trim() || 'Patient requested new time slot.'

  const rescheduleLog: RescheduleRecord = {
    previousDate: appt.date,
    previousTime: appt.time,
    newDate,
    newTime,
    reason: resolvedReason,
    changedAt: new Date().toISOString()
  }

  const history = appt.rescheduleHistory || []

  appointmentsState = appointmentsState.map((entry) => {
    if (!matchesAppointmentId(entry, appointmentId)) return entry
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
          note: `Rescheduled to ${newDate} at ${newTime}. Reason: ${resolvedReason}`
        }
      ]
    }
  })

  emitChange()

  // Background sync to backend if authenticated
  try {
    const token = typeof sessionStorage !== 'undefined'
      ? (sessionStorage.getItem('docmatrix_auth_token') || localStorage.getItem('docmatrix_auth_token'))
      : null;
    const targetId = appt.backendId || resolveAppointmentId(appointmentId);
    if (token && targetId && !targetId.startsWith('APT-')) {
      apiClient.patch(`/appointments/${targetId}`, {
        date: newDate,
        time: newTime,
        status: 'SCHEDULED',
      }).catch((err) => {
        console.error('[clinicStore] rescheduleAppointment sync failed (retained locally):', err);
      });
    }
  } catch { /* ignore */ }

  return { success: true }
}

export const cancelAppointment = (appointmentId: string, reason: string): boolean => {
  const appt = findAppointment(appointmentsState, appointmentId)
  if (!appt) return false

  appointmentsState = appointmentsState.map((entry) => {
    if (!matchesAppointmentId(entry, appointmentId)) return entry
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

  // Background sync to backend if authenticated
  try {
    const token = typeof sessionStorage !== 'undefined'
      ? (sessionStorage.getItem('docmatrix_auth_token') || localStorage.getItem('docmatrix_auth_token'))
      : null;
    const targetId = appt.backendId || resolveAppointmentId(appointmentId);
    if (token && targetId) {
      apiClient.post(`/appointments/${targetId}/cancel`, { reason }).catch(() => { /* silent */ });
    }
  } catch { /* ignore */ }

  return true
}

export const updateAppointmentStatus = (
  appointmentId: string,
  status: AppointmentStatus,
  note?: string
) => {
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const appt = findAppointment(appointmentsState, appointmentId)

  appointmentsState = appointmentsState.map((entry) => {
    if (!matchesAppointmentId(entry, appointmentId)) return entry

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

  // Background sync to backend if authenticated
  try {
    const token = typeof sessionStorage !== 'undefined'
      ? (sessionStorage.getItem('docmatrix_auth_token') || localStorage.getItem('docmatrix_auth_token'))
      : null;
    const targetId = appt?.backendId || resolveAppointmentId(appointmentId);
    if (token && targetId) {
      apiClient.patch(`/appointments/${targetId}`, {
        status,
        notes: note,
      }).catch(() => { /* silent */ });
    }
  } catch { /* ignore */ }
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
  const localId = `APT-${Date.now().toString().slice(-4)}`

  const walkInAppt: AppointmentRecord = {
    id: localId,
    bookingRef: localId,
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

  // Background sync to backend if authenticated
  try {
    const authToken = typeof sessionStorage !== 'undefined'
      ? (sessionStorage.getItem('docmatrix_auth_token') || localStorage.getItem('docmatrix_auth_token'))
      : null;
    if (authToken) {
      apiClient.post('/appointments', {
        patientId: patient.backendId || patient.id,
        doctorName: data.doctor,
        chair: dentist?.chair || 'Chair 1',
        treatmentType: data.complaint || 'General Dental Consultation',
        visitType: 'Walk-In Consultation',
        date: getTodayDateStr(),
        time: currentTime,
        durationMinutes: 30,
        status: 'checked-in',
        priority: data.priority || 'normal',
        notes: `Walk-in token: ${token}. Chief complaint: ${data.complaint}`,
        isWalkIn: true,
      }).then((created) => {
        if (created?.id) {
          registerBookingRef(localId, created.id);
          walkInAppt.backendId = created.id;
          walkInAppt.bookingRef = localId;
          if (created.id !== walkInAppt.id) {
            walkInAppt.id = created.id;
          }
          emitChange();
        }
      }).catch(() => { /* silent fallback */ });
    }
  } catch { /* ignore */ }

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
  const appt = findAppointment(appointmentsState, appointmentId)
  if (!appt) return

  const patient = patientsState.find((p) => p.id === appt.patientId || p.backendId === appt.patientId)
  const phone = patient?.mobile || CLINIC_CONFIG.clinicPhone

  const reminderLog = {
    type,
    sentAt: new Date().toISOString(),
    recipient: phone
  }

  appointmentsState = appointmentsState.map((entry) => {
    if (!matchesAppointmentId(entry, appointmentId)) return entry
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
  const computedAge = computeAgeFromDob(data.dateOfBirth, data.age) || data.age || '30'
  const newPatient: PatientRecord = {
    ...data,
    age: computedAge,
    id: `PAT-${Date.now().toString().slice(-4)}`,
    createdAt: new Date().toISOString()
  }
  patientsState = [newPatient, ...patientsState]
  emitChange()

  // Background sync to backend if authenticated
  try {
    const token = typeof sessionStorage !== 'undefined'
      ? (sessionStorage.getItem('docmatrix_auth_token') || localStorage.getItem('docmatrix_auth_token'))
      : null;
    if (token) {
      const parsedAge = Number(data.age);
      const fallbackDob =
        Number.isFinite(parsedAge) && parsedAge > 0 && parsedAge <= 120 && parsedAge !== 30
          ? `${new Date().getFullYear() - Math.round(parsedAge)}-01-01`
          : '1990-01-01';
      const syncPromise = apiClient.post('/patients', {
        patientCode: newPatient.id,
        firstName: data.firstName,
        lastName: data.lastName,
        dateOfBirth: data.dateOfBirth || fallbackDob,
        gender: (data.gender || 'undisclosed').toUpperCase(),
        mobile: data.mobile || '0000000000',
        countryCode: data.countryCode || '+91',
        email: data.email || undefined,
        city: data.city || undefined,
        state: data.state || undefined,
        postalCode: data.postalCode || undefined,
        address: data.address || undefined,
        emergencyName: data.emergencyName || undefined,
        emergencyPhone: data.emergencyPhone || undefined,
        relationship: data.relationship || undefined,
        medicalSafetyAlerts: (data.allergies === 'yes' || data.conditions === 'yes' || data.medications === 'yes') ? {
          allergies: data.allergiesDetails,
          conditions: data.conditionsDetails,
          medications: data.medicationsDetails,
        } : undefined,
      }).then((created) => {
        if (created?.id) {
          newPatient.backendId = created.id;
          if (created.patientCode && created.patientCode !== newPatient.id) {
            newPatient.id = created.patientCode;
          }
          emitChange();
        }
      }).catch((err) => {
        console.error('[clinicStore] savePatient sync failed (retained locally):', err);
      });
      (newPatient as any)._syncPromise = syncPromise;
    }
  } catch { /* ignore */ }

  return newPatient
}

// Clinical notes creation moved to end of file (addClinicalNote / saveClinicalNote)

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

const deriveInvoiceStatus = (invoice: InvoiceRecord): InvoiceRecord['status'] => {
  if (invoice.status === 'Void') return 'Void'
  if (invoice.status === 'Draft') return 'Draft'
  const paid = invoicePaidAmount(invoice)
  if (paid <= 0) return 'Unpaid'
  return invoiceBalance(invoice) <= 0 ? 'Paid' : 'Partial'
}

const sanitizeTariffId = (serviceId?: string): string | undefined => {
  if (!serviceId) return undefined;
  const trimmed = serviceId.trim();
  if (!trimmed) return undefined;
  // Ignore client-side mock/seed identifiers (e.g. 'trt-101', 'SRV-102', 'plan-...')
  if (trimmed.startsWith('trt-') || trimmed.startsWith('SRV-') || trimmed.startsWith('plan-') || trimmed.startsWith('seed-')) {
    return undefined;
  }
  // Valid backend tariffs must be standard UUIDs
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidPattern.test(trimmed)) {
    return undefined;
  }
  return trimmed;
};

/** Create an itemised invoice; totals are computed from the line items. An optional upfront payment can be recorded. */
export function createItemisedInvoice(details: {
  patientId: string
  items: InvoiceLineItem[]
  appointmentId?: string
  treatmentPlanId?: string
  notes?: string
  upfrontPayment?: Omit<InvoicePayment, 'id' | 'receivedAt'>
}): InvoiceRecord {
  const totals = details.items.reduce(
    (acc, item) => {
      const t = lineItemTotals(item)
      acc.subtotal += t.gross
      acc.discount += Math.min(item.discount, t.gross)
      acc.tax += t.tax
      return acc
    },
    { subtotal: 0, discount: 0, tax: 0 }
  )
  const amount = Math.round((totals.subtotal - totals.discount + totals.tax) * 100) / 100
  const now = new Date().toISOString()
  const stamp = Date.now().toString()

  const payments: InvoicePayment[] = []
  if (details.upfrontPayment && details.upfrontPayment.amount > 0) {
    payments.push({
      ...details.upfrontPayment,
      amount: Math.min(details.upfrontPayment.amount, amount),
      id: `PAY-${stamp.slice(-8)}`,
      receivedAt: now,
    })
  }
  const record: InvoiceRecord = {
    id: `INV-${stamp.slice(-8)}`,
    patientId: details.patientId,
    description: details.items.map((i) => i.name).join(', '),
    amount,
    status: 'Unpaid',
    createdAt: now,
    items: details.items,
    subtotal: totals.subtotal,
    discountTotal: totals.discount,
    taxTotal: Math.round(totals.tax * 100) / 100,
    payments,
    appointmentId: details.appointmentId,
    notes: details.notes,
  }
  record.status = deriveInvoiceStatus(record)

  if (isAuthenticatedClinic() && !isDemoSession()) {
    const safeApptId = details.appointmentId && !details.appointmentId.startsWith('APT-')
      ? details.appointmentId
      : undefined
    const safePlanId = details.treatmentPlanId && !details.treatmentPlanId.startsWith('TRT-')
      ? details.treatmentPlanId
      : undefined
    const payload = {
      patientId: details.patientId,
      appointmentId: safeApptId,
      treatmentPlanId: safePlanId,
      description: details.items.map((i) => i.name).join(', ') || 'Dental Treatment',
      notes: details.notes || undefined,
      items: details.items.map((it) => ({
        name: it.name,
        quantity: it.qty || 1,
        unitPrice: it.unitPrice,
        discount: it.discount || 0,
        gstRate: it.gstRate || 0,
        toothNumber: it.toothNumber || undefined,
        serviceTariffId: sanitizeTariffId(it.serviceId),
      })),
      upfrontPayment:
        details.upfrontPayment && details.upfrontPayment.amount > 0
          ? {
              amount: details.upfrontPayment.amount,
              mode: toBackendMode(details.upfrontPayment.mode as any),
              reference: details.upfrontPayment.reference || undefined,
            }
          : undefined,
    }

    const promise = billingApi.createAndIssueInvoice(payload).then((created) => {
      const syncedRecord: InvoiceRecord = {
        ...record,
        id: created.invoiceNumber || created.id,
        backendId: created.id,
        amount: Number(created.totalAmount) || record.amount,
        subtotal: Number(created.subtotal) || record.subtotal,
        discountTotal: Number(created.discountTotal) || record.discountTotal,
        taxTotal: Number(created.taxTotal) || record.taxTotal,
        status: toFrontendStatus(created.status),
        createdAt: created.createdAt || record.createdAt,
        payments: Array.isArray(created.payments)
          ? created.payments.map((p: any) => ({
              id: p.id,
              amount: p.type === 'REFUND' ? -Math.abs(Number(p.amount) || 0) : (Number(p.amount) || 0),
              mode: toFrontendMode(p.mode) as PaymentMode,
              reference: p.reference || undefined,
              receivedAt: p.receivedAt || now,
              type: p.type || 'PAYMENT',
            }))
          : record.payments,
      }
      // Authoritative database-confirmed update: commit to invoicesState only on success
      invoicesState = [syncedRecord, ...invoicesState.filter((inv) => inv.id !== syncedRecord.id && inv.id !== record.id)]
      emitChange()
      return syncedRecord
    })

    return Object.assign(promise, record) as InvoiceRecord & Promise<InvoiceRecord>
  }

  // Demo / offline unauthenticated session: commit locally
  invoicesState = [record, ...invoicesState]
  emitChange()
  return Object.assign(Promise.resolve(record), record) as InvoiceRecord & Promise<InvoiceRecord>
}

/** Record a part or full payment against an invoice. The amount is capped at the remaining balance. */
export function recordInvoicePayment(
  invoiceId: string,
  payment: Omit<InvoicePayment, 'id' | 'receivedAt'> & { receivedAt?: string }
): (InvoiceRecord & Promise<InvoiceRecord>) | null {
  const index = invoicesState.findIndex(
    (inv) => inv.id === invoiceId || inv.backendId === invoiceId
  )
  if (index === -1) return null
  const invoice = invoicesState[index]
  const targetId = invoice.backendId || invoice.id

  const amount = Math.min(payment.amount, invoiceBalance(invoice))
  if (amount <= 0) {
    return Object.assign(Promise.resolve(invoice), invoice) as InvoiceRecord & Promise<InvoiceRecord>
  }

  const existing = Array.isArray(invoice.payments)
    ? invoice.payments
    : invoice.status === 'Paid'
      ? [
          {
            id: `PAY-${invoice.id}`,
            amount: invoice.amount,
            mode: 'Cash' as PaymentMode,
            receivedAt: invoice.createdAt,
          },
        ]
      : []

  const updated: InvoiceRecord = {
    ...invoice,
    payments: [
      ...existing,
      {
        ...payment,
        amount,
        id: `PAY-${Date.now().toString().slice(-8)}`,
        receivedAt: payment.receivedAt || new Date().toISOString(),
      },
    ],
  }
  updated.status = deriveInvoiceStatus(updated)

  if (isAuthenticatedClinic() && !isDemoSession()) {
    const promise = billingApi
      .recordPayment(targetId, {
        amount: payment.amount,
        mode: toBackendMode(payment.mode as any),
        reference: payment.reference,
        receivedAt: payment.receivedAt,
      })
      .then(async () => {
        const updatedBackendInv = await billingApi.getInvoiceById(targetId)
        const refreshed: InvoiceRecord = {
          ...updated,
          id: updatedBackendInv.invoiceNumber || updated.id,
          backendId: updatedBackendInv.id,
          amount: Number(updatedBackendInv.totalAmount) || updated.amount,
          subtotal: Number(updatedBackendInv.subtotal) || updated.subtotal,
          discountTotal: Number(updatedBackendInv.discountTotal) || updated.discountTotal,
          taxTotal: Number(updatedBackendInv.taxTotal) || updated.taxTotal,
          status: toFrontendStatus(updatedBackendInv.status),
          payments: Array.isArray(updatedBackendInv.payments)
            ? updatedBackendInv.payments.map((p: any) => ({
                id: p.id,
                amount: p.type === 'REFUND' ? -Math.abs(Number(p.amount) || 0) : (Number(p.amount) || 0),
                mode: toFrontendMode(p.mode) as PaymentMode,
                reference: p.reference || undefined,
                receivedAt: p.receivedAt || new Date().toISOString(),
                type: p.type || 'PAYMENT',
              }))
            : updated.payments,
        }
        // Authoritative database-confirmed update: commit to invoicesState only on success
        invoicesState = invoicesState.map((inv) =>
          inv.id === invoice.id || inv.backendId === invoice.backendId || inv.id === refreshed.id
            ? refreshed
            : inv
        )
        emitChange()
        return refreshed
      })

    return Object.assign(promise, updated) as InvoiceRecord & Promise<InvoiceRecord>
  }

  // Demo / offline unauthenticated session: commit locally
  invoicesState = invoicesState.map((inv, i) => (i === index ? updated : inv))
  emitChange()
  return Object.assign(Promise.resolve(updated), updated) as InvoiceRecord & Promise<InvoiceRecord>
}

/** Refund an existing payment against an invoice and recalculate paidAmount/balance. */
export async function refundInvoicePayment(
  invoiceId: string,
  paymentId: string,
  amountOrOpts: number | { amount: number; reason?: string },
  reasonArg?: string
): Promise<InvoiceRecord | null> {
  const index = invoicesState.findIndex((inv) => inv.id === invoiceId || inv.backendId === invoiceId)
  if (index === -1) return null
  const invoice = invoicesState[index]
  const targetId = invoice.backendId || invoice.id
  const original = (invoice.payments || []).find((p) => p.id === paymentId)
  const rawAmt = typeof amountOrOpts === 'object' && amountOrOpts !== null ? Number(amountOrOpts.amount) || 0 : Number(amountOrOpts) || 0
  const reason = typeof amountOrOpts === 'object' && amountOrOpts !== null ? amountOrOpts.reason : reasonArg
  const refundAmt = Math.min(Math.abs(rawAmt), original ? Math.abs(original.amount) : Math.abs(rawAmt))
  if (refundAmt <= 0) return invoice

  if (isAuthenticatedClinic() && !isDemoSession()) {
    await billingApi.refundPayment(paymentId, {
      amount: refundAmt,
      reason: reason?.trim() || 'Payment refunded',
    })
    const updatedBackendInv = await billingApi.getInvoiceById(targetId)
    const refreshed: InvoiceRecord = {
      ...invoice,
      id: updatedBackendInv.invoiceNumber || invoice.id,
      backendId: updatedBackendInv.id,
      amount: Number(updatedBackendInv.totalAmount) || invoice.amount,
      subtotal: Number(updatedBackendInv.subtotal) || invoice.subtotal,
      discountTotal: Number(updatedBackendInv.discountTotal) || invoice.discountTotal,
      taxTotal: Number(updatedBackendInv.taxTotal) || invoice.taxTotal,
      status: toFrontendStatus(updatedBackendInv.status),
      payments: Array.isArray(updatedBackendInv.payments)
        ? updatedBackendInv.payments.map((p: any) => ({
            id: p.id,
            amount: p.type === 'REFUND' ? -Math.abs(Number(p.amount) || 0) : (Number(p.amount) || 0),
            mode: toFrontendMode(p.mode) as PaymentMode,
            reference: p.reference || undefined,
            receivedAt: p.receivedAt || new Date().toISOString(),
            type: p.type || 'PAYMENT',
          }))
        : invoice.payments,
    }
    invoicesState = invoicesState.map((inv) =>
      inv.id === invoice.id || inv.backendId === invoice.backendId || inv.id === refreshed.id
        ? refreshed
        : inv
    )
    emitChange()
    return refreshed
  }

  const refundEntry: InvoicePayment = {
    id: `REF-${Date.now().toString().slice(-8)}`,
    amount: -refundAmt,
    mode: original?.mode || 'Cash',
    reference: `REFUND-${paymentId.slice(0, 8)}`,
    receivedAt: new Date().toISOString(),
    type: 'REFUND',
  }
  const updated: InvoiceRecord = {
    ...invoice,
    payments: [...(invoice.payments || []), refundEntry],
  }
  updated.status = deriveInvoiceStatus(updated)
  invoicesState = invoicesState.map((inv, i) => (i === index ? updated : inv))
  emitChange()
  return updated
}

/** Void an issued invoice */
export async function voidInvoiceRecord(invoiceId: string, reason: string): Promise<InvoiceRecord | null> {
  const index = invoicesState.findIndex((inv) => inv.id === invoiceId || inv.backendId === invoiceId)
  if (index === -1) return null
  const invoice = invoicesState[index]
  const targetId = invoice.backendId || invoice.id

  if (isAuthenticatedClinic() && !isDemoSession()) {
    try {
      await billingApi.voidInvoice(targetId, reason)
      const updated: InvoiceRecord = {
        ...invoice,
        status: 'Void',
        notes: reason ? `${invoice.notes || ''} [Void: ${reason}]`.trim() : invoice.notes,
      }
      invoicesState = invoicesState.map((inv, i) => (i === index ? updated : inv))
      emitChange()
      return updated
    } catch (err) {
      console.error('[clinicStore] voidInvoiceRecord backend call failed:', err)
      throw err
    }
  }

  const updated: InvoiceRecord = {
    ...invoice,
    status: 'Void',
    notes: reason ? `${invoice.notes || ''} [Void: ${reason}]`.trim() : invoice.notes,
  }
  invoicesState = invoicesState.map((inv, i) => (i === index ? updated : inv))
  emitChange()
  return updated
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

  // Background sync to backend if authenticated
  try {
    const token = typeof sessionStorage !== 'undefined'
      ? (sessionStorage.getItem('docmatrix_auth_token') || localStorage.getItem('docmatrix_auth_token'))
      : null;
    if (token) {
      apiClient.patch(`/patients/${id}`, {
        ...(updates.firstName && { firstName: updates.firstName }),
        ...(updates.lastName && { lastName: updates.lastName }),
        ...(updates.dateOfBirth && { dateOfBirth: updates.dateOfBirth }),
        ...(updates.gender && { gender: updates.gender.toUpperCase() }),
        ...(updates.mobile && { mobile: updates.mobile }),
        ...(updates.countryCode && { countryCode: updates.countryCode }),
        ...(updates.email !== undefined && { email: updates.email || null }),
        ...(updates.city !== undefined && { city: updates.city || null }),
        ...(updates.state !== undefined && { state: updates.state || null }),
        ...(updates.postalCode !== undefined && { postalCode: updates.postalCode || null }),
        ...(updates.address !== undefined && { address: updates.address || null }),
        ...(updates.emergencyName !== undefined && { emergencyName: updates.emergencyName || null }),
        ...(updates.emergencyPhone !== undefined && { emergencyPhone: updates.emergencyPhone || null }),
        ...(updates.relationship !== undefined && { relationship: updates.relationship || null }),
      }).catch(() => { /* silent fallback */ });
    }
  } catch { /* ignore */ }

  return patientsState[index]
}

export const archivePatient = (patientId: string): boolean => {
  const p = patientsState.find((item) => item.id === patientId)
  if (!p) return false
  patientsState = patientsState.filter((item) => item.id !== patientId)
  emitChange()

  try {
    const token = typeof sessionStorage !== 'undefined'
      ? (sessionStorage.getItem('docmatrix_auth_token') || localStorage.getItem('docmatrix_auth_token'))
      : null;
    if (token) {
      apiClient.delete(`/patients/${patientId}`).catch(() => { /* silent */ });
    }
  } catch { /* ignore */ }

  return true
}

export const addTreatmentPlan = (
  data: Omit<TreatmentPlanRecord, 'id' | 'date'>
): TreatmentPlanRecord => {
  const newPlan: TreatmentPlanRecord = {
    ...data,
    id: `TRT-${Date.now().toString().slice(-4)}`,
    date: new Date().toISOString().slice(0, 10),
    planNumber: data.planNumber || `TRT-${Date.now().toString().slice(-4)}`,
    subtotal: data.subtotal || data.cost,
    discount: data.discount || 0,
    tax: data.tax || 0,
    totalEstimatedCost: data.totalEstimatedCost || data.cost,
    currentVersion: data.currentVersion || 1,
    stages: data.stages || [
      {
        id: `stage-${Date.now().toString().slice(-4)}`,
        stageNumber: 1,
        name: 'Stage 1: Primary Treatment',
        status: 'PLANNED',
        estimatedCost: data.cost,
        items: [
          {
            id: `item-${Date.now().toString().slice(-4)}`,
            procedureName: data.procedure,
            category: data.category,
            toothNumber: data.toothNumber,
            quantity: 1,
            unitFee: data.cost,
            discount: 0,
            netFee: data.cost,
            status: 'PENDING',
          },
        ],
      },
    ],
  }
  treatmentPlansState = [newPlan, ...treatmentPlansState]
  emitChange()

  // Background sync if authenticated
  try {
    const token = typeof sessionStorage !== 'undefined'
      ? (sessionStorage.getItem('docmatrix_auth_token') || localStorage.getItem('docmatrix_auth_token'))
      : null;
    if (token) {
      apiClient.post<any>('/treatment-plans', {
        patientId: data.patientId,
        title: data.title || data.procedure,
        notes: data.notes,
        stages: (newPlan.stages || []).map((st) => ({
          stageNumber: st.stageNumber,
          name: st.name,
          items: st.items.map((it) => ({
            procedureName: it.procedureName,
            category: it.category,
            toothNumber: it.toothNumber,
            surface: it.surface,
            quantity: it.quantity,
            unitFee: it.unitFee,
            discount: it.discount,
            notes: it.notes,
          })),
        })),
      }).then((remote) => {
        if (remote && remote.id) {
          newPlan.backendId = remote.id;
          newPlan.planNumber = remote.planNumber;
          emitChange();
        }
      }).catch(() => { /* silent fallback */ });
    }
  } catch { /* ignore */ }

  return newPlan
}

export const createStructuredTreatmentPlan = async (
  dto: {
    patientId: string;
    appointmentId?: string;
    doctorId?: string;
    doctorName?: string;
    title: string;
    notes?: string;
    taxRate?: number;
    stages: {
      stageNumber: number;
      name: string;
      targetDate?: string;
      items: {
        procedureCode?: string;
        procedureName: string;
        category: string;
        toothNumber?: string;
        surface?: string;
        quantity?: number;
        unitFee: number;
        discount?: number;
        notes?: string;
      }[];
    }[];
  }
): Promise<TreatmentPlanRecord> => {
  let subtotal = 0;
  let totalDiscount = 0;
  const stages: TreatmentPlanStageRecord[] = dto.stages.map((st, idx) => {
    let stageTotal = 0;
    const items: TreatmentPlanItemRecord[] = st.items.map((it, iIdx) => {
      const qty = it.quantity || 1;
      const disc = it.discount || 0;
      const net = Math.max(0, it.unitFee * qty - disc);
      stageTotal += net;
      totalDiscount += disc;
      return {
        id: `item-${Date.now()}-${idx}-${iIdx}`,
        procedureCode: it.procedureCode,
        procedureName: it.procedureName,
        category: it.category,
        toothNumber: it.toothNumber,
        surface: it.surface,
        quantity: qty,
        unitFee: it.unitFee,
        discount: disc,
        netFee: net,
        status: 'PENDING',
        notes: it.notes,
      };
    });
    subtotal += stageTotal;
    return {
      id: `stage-${Date.now()}-${idx}`,
      stageNumber: st.stageNumber,
      name: st.name,
      status: 'PLANNED',
      targetDate: st.targetDate,
      estimatedCost: stageTotal,
      items,
    };
  });

  const tax = Math.round(subtotal * (dto.taxRate || 0)) / 100;
  const total = subtotal + tax;
  const primaryItem = stages[0]?.items[0];
  const resolvedDoctor = resolvePlanDoctor(
    dto.doctorName,
    dto.patientId,
    dto.patientId,
    `${primaryItem?.category || ''} ${primaryItem?.procedureName || ''} ${dto.title || ''}`,
    appointmentsState
  );

  const localPlan: TreatmentPlanRecord = {
    id: `TP-${Date.now().toString().slice(-4)}`,
    planNumber: `TP-${Date.now().toString().slice(-4)}`,
    patientId: dto.patientId,
    title: dto.title,
    procedure: primaryItem?.procedureName || dto.title,
    category: primaryItem?.category || 'General',
    toothNumber: primaryItem?.toothNumber || '',
    status: 'Proposed',
    cost: total,
    doctor: resolvedDoctor,
    doctorId: dto.doctorId,
    notes: dto.notes || '',
    date: getTodayDateStr(),
    subtotal,
    discount: totalDiscount,
    tax,
    totalEstimatedCost: total,
    currentVersion: 1,
    stages,
    estimateRevisions: [
      {
        id: `rev-${Date.now()}`,
        versionNumber: 1,
        revisionReason: 'Initial treatment plan and cost estimate proposal',
        subtotal,
        discount: totalDiscount,
        tax,
        totalEstimatedCost: total,
        status: 'PROPOSED',
        isStaffRecorded: true,
        createdByName: resolvedDoctor,
        createdAt: new Date().toISOString(),
      },
    ],
  };

  treatmentPlansState = [localPlan, ...treatmentPlansState];
  emitChange();

  try {
    const token = typeof sessionStorage !== 'undefined'
      ? (sessionStorage.getItem('docmatrix_auth_token') || localStorage.getItem('docmatrix_auth_token'))
      : null;
    if (token) {
      const payload = {
        ...dto,
        doctorName: resolvedDoctor,
      };
      const remote = await apiClient.post<any>('/treatment-plans', payload);
      if (remote && remote.id) {
        localPlan.backendId = remote.id;
        localPlan.planNumber = remote.planNumber || localPlan.planNumber;
        localPlan.id = remote.id;
        if (remote.doctorName && isClinicalDoctorName(remote.doctorName)) {
          localPlan.doctor = remote.doctorName;
        }
        if (Array.isArray(remote.stages) && remote.stages.length > 0) {
          localPlan.stages = remote.stages.map((st: any) => ({
            id: st.id,
            treatmentPlanId: st.treatmentPlanId || remote.id,
            stageNumber: st.stageNumber,
            name: st.name,
            status: st.status || 'PLANNED',
            targetDate: st.targetDate ? String(st.targetDate).slice(0, 10) : undefined,
            estimatedCost: Number(st.estimatedCost) || 0,
            items: Array.isArray(st.items)
              ? st.items.map((it: any) => ({
                  id: it.id,
                  stageId: it.stageId || st.id,
                  procedureCode: it.procedureCode,
                  procedureName: it.procedureName,
                  category: it.category,
                  toothNumber: it.toothNumber,
                  surface: it.surface,
                  quantity: it.quantity || 1,
                  unitFee: Number(it.unitFee) || 0,
                  discount: Number(it.discount) || 0,
                  netFee: Number(it.netFee) || 0,
                  status: it.status || 'PENDING',
                  notes: it.notes,
                }))
              : [],
          }));
        }
        treatmentPlansState = [...treatmentPlansState];
        emitChange();
      }
    }
  } catch (err) {
    console.warn('[clinicStore] createStructuredTreatmentPlan backend call failed, kept local:', err);
  }

  return localPlan;
};

export const updateTreatmentPlanStatus = (
  id: string,
  status: TreatmentPlanRecord['status'],
  reason?: string
): boolean => {
  const plan = treatmentPlansState.find((p) => p.id === id || p.backendId === id || p.planNumber === id)
  if (!plan) return false
  plan.status = status
  if (status === 'Completed' && Array.isArray(plan.stages)) {
    plan.stages = plan.stages.map((st) => ({
      ...st,
      status: 'COMPLETED',
      items: (st.items || []).map((it) =>
        it.status === 'CANCELLED' ? it : { ...it, status: 'COMPLETED' }
      ),
    }))
  }
  treatmentPlansState = [...treatmentPlansState]
  emitChange()

  const targetId = plan.backendId || plan.id;
  try {
    const token = typeof sessionStorage !== 'undefined'
      ? (sessionStorage.getItem('docmatrix_auth_token') || localStorage.getItem('docmatrix_auth_token'))
      : null;
    if (token && targetId && !targetId.startsWith('TRT-')) {
      let backendStatus = 'PROPOSED';
      if (status === 'Accepted') backendStatus = 'ACCEPTED';
      else if (status === 'In Progress') backendStatus = 'IN_PROGRESS';
      else if (status === 'Completed') backendStatus = 'COMPLETED';
      else if (status === 'Pending') backendStatus = 'PENDING';
      else if (status === 'Rejected') backendStatus = 'REJECTED';
      else if (status === 'Cancelled') backendStatus = 'CANCELLED';

      apiClient.patch(`/treatment-plans/${targetId}/status`, {
        status: backendStatus,
        reason,
      }).catch(() => { /* silent */ });
    }
  } catch { /* ignore */ }

  return true
}

export const recordTreatmentPlanAcceptance = async (
  id: string,
  dto: {
    versionNumber: number;
    patientAcceptedByName: string;
    acceptanceMethod: 'STAFF_RECORDED' | 'WRITTEN_CONSENT' | 'DIGITAL_SIGNATURE' | 'PATIENT_PORTAL';
    isStaffRecorded?: boolean;
    notes?: string;
  }
): Promise<boolean> => {
  const plan = treatmentPlansState.find((p) => p.id === id || p.backendId === id);
  if (!plan) return false;

  plan.status = 'Accepted';
  plan.acceptedVersion = dto.versionNumber;
  plan.patientAcceptedAt = new Date().toISOString();
  plan.patientAcceptedByName = dto.patientAcceptedByName;
  plan.acceptanceMethod = dto.acceptanceMethod;
  plan.isStaffRecorded = dto.isStaffRecorded !== undefined ? dto.isStaffRecorded : true;
  plan.rejectionReason = undefined;

  treatmentPlansState = [...treatmentPlansState];
  emitChange();

  const targetId = plan.backendId || plan.id;
  try {
    const token = typeof sessionStorage !== 'undefined'
      ? (sessionStorage.getItem('docmatrix_auth_token') || localStorage.getItem('docmatrix_auth_token'))
      : null;
    if (token && targetId && !targetId.startsWith('TRT-')) {
      await apiClient.post(`/treatment-plans/${targetId}/accept`, dto);
    }
  } catch (err) {
    console.warn('[clinicStore] recordTreatmentPlanAcceptance failed on backend:', err);
  }

  return true;
};

export const recordTreatmentPlanRejection = async (
  id: string,
  dto: {
    rejectionReason: string;
    notes?: string;
  }
): Promise<boolean> => {
  const plan = treatmentPlansState.find((p) => p.id === id || p.backendId === id);
  if (!plan) return false;

  plan.status = 'Rejected';
  plan.rejectionReason = dto.rejectionReason;

  treatmentPlansState = [...treatmentPlansState];
  emitChange();

  const targetId = plan.backendId || plan.id;
  try {
    const token = typeof sessionStorage !== 'undefined'
      ? (sessionStorage.getItem('docmatrix_auth_token') || localStorage.getItem('docmatrix_auth_token'))
      : null;
    if (token && targetId && !targetId.startsWith('TRT-')) {
      await apiClient.post(`/treatment-plans/${targetId}/reject`, dto);
    }
  } catch (err) {
    console.warn('[clinicStore] recordTreatmentPlanRejection failed on backend:', err);
  }

  return true;
};

export const updateTreatmentPlanItemStatus = async (
  planId: string,
  itemId: string,
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DEFERRED' | 'CANCELLED',
  notes?: string
): Promise<boolean> => {
  const plan = treatmentPlansState.find((p) => p.id === planId || p.backendId === planId || p.planNumber === planId);
  if (!plan || !plan.stages) return false;

  plan.stages = plan.stages.map((stage) => {
    const updatedItems = (stage.items || []).map((it) => {
      if (it.id !== itemId) return it;
      return {
        ...it,
        status,
        notes: notes !== undefined ? notes : it.notes,
      };
    });
    const activeStageItems = updatedItems.filter((i) => i.status !== 'CANCELLED');
    const allStageDone = activeStageItems.length > 0 && activeStageItems.every((i) => i.status === 'COMPLETED');
    const anyStageStarted = activeStageItems.some((i) => i.status === 'IN_PROGRESS' || i.status === 'COMPLETED');
    return {
      ...stage,
      status: allStageDone ? 'COMPLETED' : anyStageStarted ? 'IN_PROGRESS' : 'PLANNED',
      items: updatedItems,
    };
  });

  const allActiveItems = plan.stages.flatMap((s) => s.items || []).filter((i) => i.status !== 'CANCELLED');
  const allItemsCompleted = allActiveItems.length > 0 && allActiveItems.every((i) => i.status === 'COMPLETED');
  const anyItemStarted = allActiveItems.some((i) => i.status === 'IN_PROGRESS' || i.status === 'COMPLETED');

  if (allItemsCompleted) {
    plan.status = 'Completed';
  } else if (anyItemStarted && (plan.status === 'Proposed' || plan.status === 'Accepted' || plan.status === 'Pending' || plan.status === 'Completed')) {
    plan.status = 'In Progress';
  }

  treatmentPlansState = [...treatmentPlansState];
  emitChange();

  const targetId = plan.backendId || plan.id;
  try {
    const token = typeof sessionStorage !== 'undefined'
      ? (sessionStorage.getItem('docmatrix_auth_token') || localStorage.getItem('docmatrix_auth_token'))
      : null;
    if (token && targetId && !targetId.startsWith('TRT-')) {
      await apiClient.patch(`/treatment-plans/${targetId}/items/${itemId}`, { status, notes });
    }
  } catch (err) {
    console.warn('[clinicStore] updateTreatmentPlanItemStatus failed on backend:', err);
  }

  return true;
};

export const migrateLegacyTreatmentPlans = async (): Promise<{ imported: number; skipped: number; errors: string[] }> => {
  const legacyPlans = treatmentPlansState.filter((p) => p.id.startsWith('TRT-') && !p.backendId);
  if (legacyPlans.length === 0) {
    return { imported: 0, skipped: 0, errors: [] };
  }

  try {
    const token = typeof sessionStorage !== 'undefined'
      ? (sessionStorage.getItem('docmatrix_auth_token') || localStorage.getItem('docmatrix_auth_token'))
      : null;
    if (!token) {
      return { imported: 0, skipped: 0, errors: ['Authentication token required for migration'] };
    }

    const payload = {
      plans: legacyPlans.map((p) => ({
        legacyId: p.id,
        patientId: p.patientId,
        procedure: p.procedure || p.title || 'General Procedure',
        category: p.category || 'General',
        toothNumber: p.toothNumber,
        status: p.status,
        cost: p.cost,
        doctor: p.doctor,
        notes: p.notes,
        date: p.date,
      })),
    };

    const res = await apiClient.post<any>('/treatment-plans/import-legacy', payload);
    await syncWithBackend();
    return res;
  } catch (err: any) {
    return { imported: 0, skipped: 0, errors: [err.message || 'Legacy migration failed'] };
  }
};

export const addPatientDocument = (
  data: Omit<PatientDocumentRecord, 'id' | 'uploadDate'>
): PatientDocumentRecord => {
  const tempId = `DOC-${Date.now().toString().slice(-4)}`
  const uploadDate = new Date().toISOString().slice(0, 10)
  const newDoc: PatientDocumentRecord = {
    ...data,
    id: tempId,
    uploadDate,
  }
  patientDocumentsState = [newDoc, ...patientDocumentsState]
  emitChange()

  if (hasAuthToken()) {
    apiClient
      .post(`/patients/${encodeURIComponent(data.patientId)}/documents`, {
        title: data.title,
        category: data.category,
        fileName: data.fileName,
        fileSize: data.fileSize,
        doctorName: data.doctor,
      })
      .then((created) => {
        if (created?.id) {
          patientDocumentsState = patientDocumentsState.map((d) =>
            d.id === tempId ? { ...d, id: created.id, url: created.downloadUrl } : d,
          )
          emitChange()
        }
      })
      .catch((err: any) => {
        console.error('[clinicStore] addPatientDocument failed, rolling back:', err)
        patientDocumentsState = patientDocumentsState.filter((d) => d.id !== tempId)
        emitChange()
      })
  }

  return newDoc
}

export const deletePatientDocument = async (
  patientId: string,
  documentId: string,
): Promise<boolean> => {
  const previous = [...patientDocumentsState]
  patientDocumentsState = patientDocumentsState.filter((d) => d.id !== documentId)
  emitChange()

  if (hasAuthToken()) {
    try {
      await apiClient.delete(
        `/patients/${encodeURIComponent(patientId)}/documents/${encodeURIComponent(documentId)}`,
      )
      return true
    } catch (err) {
      console.error('[clinicStore] deletePatientDocument failed, rolling back:', err)
      patientDocumentsState = previous
      emitChange()
      throw err
    }
  }
  return true
}

export const addPatientConsent = (
  data: Omit<PatientConsentRecord, 'id' | 'dateRecorded'>
): PatientConsentRecord => {
  const tempId = `CNS-${Date.now().toString().slice(-4)}`
  const dateRecorded = new Date().toISOString().slice(0, 10)
  const newConsent: PatientConsentRecord = {
    ...data,
    id: tempId,
    dateRecorded,
  }
  patientConsentsState = [newConsent, ...patientConsentsState]
  emitChange()

  if (hasAuthToken()) {
    apiClient
      .post(`/patients/${encodeURIComponent(data.patientId)}/consents`, {
        consentType: data.consentType,
        status: data.status,
        recordedBy: data.recordedBy,
        documentRef: data.documentRef,
        notes: data.notes,
      })
      .then((created) => {
        if (created?.id) {
          patientConsentsState = patientConsentsState.map((c) =>
            c.id === tempId ? { ...c, id: created.id } : c,
          )
          emitChange()
        }
      })
      .catch((err: any) => {
        console.error('[clinicStore] addPatientConsent failed, rolling back:', err)
        patientConsentsState = patientConsentsState.filter((c) => c.id !== tempId)
        emitChange()
      })
  }

  return newConsent
}

export const updatePatientConsent = async (
  patientId: string,
  consentId: string,
  patch: Partial<PatientConsentRecord>,
): Promise<void> => {
  const previous = [...patientConsentsState]
  patientConsentsState = patientConsentsState.map((c) =>
    c.id === consentId ? { ...c, ...patch } : c,
  )
  emitChange()

  if (hasAuthToken()) {
    try {
      await apiClient.patch(
        `/patients/${encodeURIComponent(patientId)}/consents/${encodeURIComponent(consentId)}`,
        {
          status: patch.status,
          notes: patch.notes,
        },
      )
    } catch (err) {
      console.error('[clinicStore] updatePatientConsent failed, rolling back:', err)
      patientConsentsState = previous
      emitChange()
      throw err
    }
  }
}

export const registerPatient = savePatient

export const getToothConditionsForPatient = (patientId: string): PatientToothChartMap => {
  if (toothChartsState[patientId]) {
    return toothChartsState[patientId]
  }
  if (hasAuthToken()) {
    return {}
  }
  return initialToothCharts[patientId] ? { ...initialToothCharts[patientId] } : {}
}

export const saveToothConditionForPatient = (
  patientId: string,
  toothNumber: number,
  condition: ToothConditionType,
  notes?: string
) => {
  const prevChart = { ...(toothChartsState[patientId] || {}) }
  const currentChart = { ...prevChart }
  currentChart[toothNumber] = { condition, notes }
  toothChartsState = {
    ...toothChartsState,
    [patientId]: currentChart
  }
  emitChange()

  if (hasAuthToken()) {
    apiClient
      .put(`/patients/${encodeURIComponent(patientId)}/tooth-chart`, {
        toothNumber,
        condition,
        notes,
      })
      .catch((err: any) => {
        console.error('[clinicStore] saveToothCondition failed, rolling back:', err)
        toothChartsState = {
          ...toothChartsState,
          [patientId]: prevChart
        }
        emitChange()
      })
  }
}

export const saveFullToothChartForPatient = (
  patientId: string,
  chart: PatientToothChartMap
) => {
  const prevChart = toothChartsState[patientId]
  toothChartsState = {
    ...toothChartsState,
    [patientId]: { ...chart }
  }
  emitChange()

  if (hasAuthToken()) {
    apiClient
      .post(`/patients/${encodeURIComponent(patientId)}/tooth-chart/batch`, {
        chart,
      })
      .catch((err: any) => {
        console.error('[clinicStore] saveFullToothChart failed, rolling back:', err)
        if (prevChart) {
          toothChartsState = {
            ...toothChartsState,
            [patientId]: prevChart
          }
        } else {
          const copy = { ...toothChartsState }
          delete copy[patientId]
          toothChartsState = copy
        }
        emitChange()
      })
  }
}

export const resetStoreForTesting = () => {
  removeFromStorage(STORAGE_KEYS.DATA)
  patientsState = [...initialPatients]
  appointmentsState = [...initialAppointments]
  clinicalNotesState = [...initialClinicalNotes]
  invoicesState = [...initialInvoices]
  treatmentPlansState = [...initialTreatmentPlans]
  patientDocumentsState = [...initialPatientDocuments]
  patientConsentsState = [...initialPatientConsents]
  toothChartsState = { ...initialToothCharts }
  enquiriesState = [...initialEnquiries]
  prescriptionsState = [...initialPrescriptions]
  walkInCounter = 101
  emitChange()
}


// ─────────────────────────────────────────────────────────────────────────────
// 10. ONLINE / MISSED ENQUIRIES ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export const addEnquiry = (enquiry: {
  name: string
  phone?: string
  email?: string
  request: string
  status?: 'PENDING' | 'CONTACTED' | 'CONVERTED' | 'DISMISSED'
  notes?: string
}): EnquiryRecord => {
  const newEnquiry: EnquiryRecord = {
    id: `enq-${Date.now()}`,
    name: enquiry.name.trim(),
    phone: enquiry.phone?.trim() || '',
    email: enquiry.email?.trim() || '',
    request: enquiry.request.trim(),
    status: enquiry.status || 'PENDING',
    notes: enquiry.notes?.trim() || '',
    createdAt: new Date().toISOString(),
  }

  enquiriesState = [newEnquiry, ...enquiriesState];
  emitChange();

  if (hasAuthToken()) {
    apiClient.post('/enquiries', {
      name: newEnquiry.name,
      phone: newEnquiry.phone,
      email: newEnquiry.email,
      request: newEnquiry.request,
      status: newEnquiry.status,
      notes: newEnquiry.notes,
    }).then((created: any) => {
      if (created?.id && created.id !== newEnquiry.id) {
        enquiriesState = enquiriesState.map((e) => (e.id === newEnquiry.id ? { ...e, id: created.id } : e));
        emitChange();
      }
    }).catch((err) => {
      console.warn('[clinicStore] addEnquiry failed on backend:', err);
    });
  }

  return newEnquiry;
};

export const updateEnquiryStatus = (id: string, status: 'PENDING' | 'CONTACTED' | 'CONVERTED' | 'DISMISSED'): void => {
  const prevEnquiries = [...enquiriesState];
  enquiriesState = enquiriesState.map((e) => (e.id === id ? { ...e, status } : e));
  emitChange();

  if (hasAuthToken()) {
    apiClient.patch(`/enquiries/${id}`, { status }).catch((err) => {
      console.warn('[clinicStore] updateEnquiryStatus failed on backend:', err);
      enquiriesState = prevEnquiries;
      emitChange();
    });
  }
};

export const dismissEnquiry = (id: string): void => {
  const prevEnquiries = [...enquiriesState];
  enquiriesState = enquiriesState.filter((e) => e.id !== id);
  emitChange();

  if (hasAuthToken()) {
    apiClient.delete(`/enquiries/${id}`).catch((err) => {
      console.warn('[clinicStore] dismissEnquiry failed on backend:', err);
      enquiriesState = prevEnquiries;
      emitChange();
    });
  }
};

// -----------------------------------------------------------------------------
// Digital Prescriptions (Rx) Mutations
// -----------------------------------------------------------------------------

export const addPrescription = async (prescription: {
  patientId: string
  doctorId?: string
  diagnosis: string
  clinicalNotes?: string
  prescribedAt?: string
  items: Array<{
    medicineName: string
    strength?: string
    dosage: string
    route?: string
    frequency: string
    duration: string
    quantity?: number
    instructions?: string
  }>
}): Promise<PrescriptionRecord> => {
  const tempId = `rx-${Date.now()}`;
  const optimisticNumber = `RX-${1000 + prescriptionsState.length + 1}`;
  
  // Find matching patient record for local preview
  const matchedPatient = patientsState.find(
    (p) => p.id === prescription.patientId || p.backendId === prescription.patientId
  );

  const localPrescription: PrescriptionRecord = {
    id: tempId,
    patientId: matchedPatient?.backendId || prescription.patientId,
    doctorId: prescription.doctorId || 'doc-current',
    prescriptionNumber: optimisticNumber,
    diagnosis: prescription.diagnosis.trim(),
    clinicalNotes: prescription.clinicalNotes?.trim() || '',
    status: 'DRAFT',
    prescribedAt: prescription.prescribedAt || new Date().toISOString(),
    items: prescription.items.map((it, idx) => ({
      id: `rxi-${tempId}-${idx}`,
      medicineName: it.medicineName.trim(),
      strength: it.strength?.trim() || '',
      dosage: it.dosage.trim(),
      route: it.route?.trim() || 'Oral',
      frequency: it.frequency.trim(),
      duration: it.duration.trim(),
      quantity: it.quantity,
      instructions: it.instructions?.trim() || '',
    })),
    patient: matchedPatient
      ? {
          id: matchedPatient.backendId || matchedPatient.id,
          patientCode: matchedPatient.id,
          firstName: matchedPatient.firstName,
          lastName: matchedPatient.lastName,
          gender: matchedPatient.gender,
          dateOfBirth: matchedPatient.dateOfBirth,
          mobile: matchedPatient.mobile,
          medicalSafetyAlerts: (matchedPatient as any).medicalAlerts || (matchedPatient.allergiesDetails ? [matchedPatient.allergiesDetails] : []),
        }
      : undefined,
  };

  const prevPrescriptions = [...prescriptionsState];
  prescriptionsState = [localPrescription, ...prescriptionsState];
  emitChange();

  if (hasAuthToken()) {
    try {
      const created = await apiClient.post<any>('/prescriptions', {
        patientId: matchedPatient?.backendId || prescription.patientId,
        doctorId: prescription.doctorId,
        diagnosis: prescription.diagnosis.trim(),
        clinicalNotes: prescription.clinicalNotes?.trim() || undefined,
        prescribedAt: prescription.prescribedAt || undefined,
        items: prescription.items,
      });

      if (created?.id) {
        prescriptionsState = prescriptionsState.map((rx) =>
          rx.id === tempId
            ? {
                ...rx,
                id: created.id,
                prescriptionNumber: created.prescriptionNumber || rx.prescriptionNumber,
                status: created.status || rx.status,
                items: Array.isArray(created.items) ? created.items : rx.items,
                patient: created.patient || rx.patient,
                doctor: created.doctor || rx.doctor,
                createdAt: created.createdAt,
              }
            : rx
        );
        emitChange();
        return prescriptionsState.find((p) => p.id === created.id) || localPrescription;
      }
    } catch (err) {
      console.warn('[clinicStore] addPrescription failed on backend, rolling back:', err);
      prescriptionsState = prevPrescriptions;
      emitChange();
      throw err;
    }
  }

  return localPrescription;
};

export const updatePrescription = async (
  id: string,
  patch: {
    diagnosis?: string
    clinicalNotes?: string
    prescribedAt?: string
    items?: Array<{
      medicineName: string
      strength?: string
      dosage: string
      route?: string
      frequency: string
      duration: string
      quantity?: number
      instructions?: string
    }>
  }
): Promise<void> => {
  const prevPrescriptions = [...prescriptionsState];
  prescriptionsState = prescriptionsState.map((rx) => {
    if (rx.id !== id) return rx;
    return {
      ...rx,
      ...(patch.diagnosis !== undefined ? { diagnosis: patch.diagnosis.trim() } : {}),
      ...(patch.clinicalNotes !== undefined ? { clinicalNotes: patch.clinicalNotes.trim() } : {}),
      ...(patch.prescribedAt !== undefined ? { prescribedAt: patch.prescribedAt } : {}),
      ...(patch.items !== undefined
        ? {
            items: patch.items.map((it, idx) => ({
              id: `rxi-upd-${idx}`,
              medicineName: it.medicineName.trim(),
              strength: it.strength?.trim() || '',
              dosage: it.dosage.trim(),
              route: it.route?.trim() || 'Oral',
              frequency: it.frequency.trim(),
              duration: it.duration.trim(),
              quantity: it.quantity,
              instructions: it.instructions?.trim() || '',
            })),
          }
        : {}),
    };
  });
  emitChange();

  if (hasAuthToken()) {
    try {
      const updated = await apiClient.patch<any>(`/prescriptions/${id}`, patch);
      if (updated?.id) {
        prescriptionsState = prescriptionsState.map((rx) =>
          rx.id === id
            ? {
                ...rx,
                diagnosis: updated.diagnosis || rx.diagnosis,
                clinicalNotes: updated.clinicalNotes ?? rx.clinicalNotes,
                items: Array.isArray(updated.items) ? updated.items : rx.items,
              }
            : rx
        );
        emitChange();
      }
    } catch (err) {
      console.warn('[clinicStore] updatePrescription failed on backend, rolling back:', err);
      prescriptionsState = prevPrescriptions;
      emitChange();
      throw err;
    }
  }
};

/**
 * Finalize a prescription.
 * Strict constraint: Never display a prescription as finalized until the backend confirms success.
 */
export const finalizePrescription = async (id: string): Promise<PrescriptionRecord> => {
  if (hasAuthToken()) {
    // Await server confirmation BEFORE updating store state to FINALIZED
    const finalized = await apiClient.post<any>(`/prescriptions/${id}/finalize`, {});
    prescriptionsState = prescriptionsState.map((rx) =>
      rx.id === id
        ? {
            ...rx,
            status: 'FINALIZED',
            finalizedAt: finalized?.finalizedAt || new Date().toISOString(),
            finalizedById: finalized?.finalizedById,
            doctor: finalized?.doctor || rx.doctor,
            patient: finalized?.patient || rx.patient,
          }
        : rx
    );
    emitChange();
    const result = prescriptionsState.find((p) => p.id === id);
    if (!result) throw new Error('Prescription not found after finalization');
    return result;
  } else {
    // Demo mode offline fallback
    prescriptionsState = prescriptionsState.map((rx) =>
      rx.id === id
        ? {
            ...rx,
            status: 'FINALIZED',
            finalizedAt: new Date().toISOString(),
          }
        : rx
    );
    emitChange();
    const result = prescriptionsState.find((p) => p.id === id);
    if (!result) throw new Error('Prescription not found after finalization');
    return result;
  }
};

/**
 * Cancel a prescription with mandatory clinical reason.
 */
export const cancelPrescription = async (id: string, reason: string): Promise<void> => {
  if (hasAuthToken()) {
    const cancelled = await apiClient.post<any>(`/prescriptions/${id}/cancel`, {
      reason: reason.trim(),
    });
    prescriptionsState = prescriptionsState.map((rx) =>
      rx.id === id
        ? {
            ...rx,
            status: 'CANCELLED',
            cancelledAt: cancelled?.cancelledAt || new Date().toISOString(),
            cancelledById: cancelled?.cancelledById,
            cancellationReason: reason.trim(),
          }
        : rx
    );
    emitChange();
  } else {
    prescriptionsState = prescriptionsState.map((rx) =>
      rx.id === id
        ? {
            ...rx,
            status: 'CANCELLED',
            cancelledAt: new Date().toISOString(),
            cancellationReason: reason.trim(),
          }
        : rx
    );
    emitChange();
  }
};

export const refreshPrescriptions = async (): Promise<void> => {
  if (!hasAuthToken()) return;
  try {
    const remote = await apiClient.get<any[]>('/prescriptions');
    if (Array.isArray(remote)) {
      prescriptionsState = remote.map((p: any) => ({
        id: p.id,
        clinicId: p.clinicId,
        patientId: p.patientId,
        doctorId: p.doctorId,
        prescriptionNumber: p.prescriptionNumber,
        diagnosis: p.diagnosis,
        clinicalNotes: p.clinicalNotes || '',
        status: p.status,
        prescribedAt: p.prescribedAt || p.createdAt,
        finalizedAt: p.finalizedAt,
        finalizedById: p.finalizedById,
        cancelledAt: p.cancelledAt,
        cancelledById: p.cancelledById,
        cancellationReason: p.cancellationReason,
        createdAt: p.createdAt,
        items: Array.isArray(p.items)
          ? p.items.map((it: any) => ({
              id: it.id,
              prescriptionId: it.prescriptionId,
              medicineName: it.medicineName,
              strength: it.strength || '',
              dosage: it.dosage,
              route: it.route || 'Oral',
              frequency: it.frequency,
              duration: it.duration,
              quantity: it.quantity,
              instructions: it.instructions || '',
            }))
          : [],
        patient: p.patient
          ? {
              id: p.patient.id,
              patientCode: p.patient.patientCode,
              firstName: p.patient.firstName,
              lastName: p.patient.lastName,
              gender: p.patient.gender,
              dateOfBirth: p.patient.dateOfBirth,
              mobile: p.patient.mobile,
              medicalSafetyAlerts: Array.isArray(p.patient.medicalSafetyAlerts)
                ? p.patient.medicalSafetyAlerts
                : [],
            }
          : undefined,
        doctor: p.doctor
          ? {
              id: p.doctor.id,
              fullName: p.doctor.fullName,
              email: p.doctor.email,
              role: p.doctor.role,
            }
          : undefined,
      }));
      emitChange();
    }
  } catch (err) {
    console.warn('[clinicStore] refreshPrescriptions failed:', err);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CLINICAL NOTES MANAGEMENT (STRUCTURED DENTAL CONSULTATIONS)
// ─────────────────────────────────────────────────────────────────────────────

export interface ClinicalNoteInput {
  id?: string;
  patientId: string;
  appointmentId?: string;
  doctorId?: string;
  doctorName?: string;
  consultationDate?: string;
  consultationType?: string;
  chiefComplaint?: string;
  symptoms?: string;
  symptomDuration?: string;
  painSeverity?: number;
  historyNotes?: string;
  extraoralFindings?: string;
  intraoralFindings?: string;
  toothSpecificFindings?: string;
  periodontalFindings?: string;
  examinationNotes?: string;
  primaryDiagnosis?: string;
  additionalDiagnoses?: any;
  diagnosisNotes?: string;
  treatmentPerformed?: string;
  treatmentToothNumber?: string;
  treatmentDescription?: string;
  materialsUsed?: string;
  treatmentOutcome?: string;
  treatmentRecommendations?: string;
  referralNotes?: string;
  followUpRequired?: boolean;
  followUpDate?: string;
  followUpInstructions?: string;
  patientAdvice?: string;
  isFinalized?: boolean;

  // Legacy fields
  visitDate?: string;
  complaint?: string;
  findings?: string;
  plan?: string;
}

export const refreshClinicalNotes = async (): Promise<void> => {
  if (!hasAuthToken()) return;
  try {
    const remote = await apiClient.get<any[]>('/clinical-notes');
    if (Array.isArray(remote)) {
      clinicalNotesState = remote.map((n: any) => ({
        id: n.id,
        clinicId: n.clinicId,
        patientId: n.patient?.patientCode || n.patientId,
        appointmentId: n.appointmentId,
        doctorId: n.doctorId,
        noteNumber: n.noteNumber,
        consultationDate: n.consultationDate,
        consultationType: n.consultationType,
        status: n.status,
        finalizedAt: n.finalizedAt,
        finalizedById: n.finalizedById,
        finalizedByName: n.finalizedByName,
        doctorName: n.doctor?.fullName || n.finalizedByName || 'Attending Doctor',
        chiefComplaint: n.chiefComplaint,
        symptoms: n.symptoms,
        symptomDuration: n.symptomDuration,
        painSeverity: n.painSeverity,
        historyNotes: n.historyNotes,
        extraoralFindings: n.extraoralFindings,
        intraoralFindings: n.intraoralFindings,
        toothSpecificFindings: n.toothSpecificFindings,
        periodontalFindings: n.periodontalFindings,
        examinationNotes: n.examinationNotes,
        primaryDiagnosis: n.primaryDiagnosis,
        additionalDiagnoses: n.additionalDiagnoses,
        diagnosisNotes: n.diagnosisNotes,
        treatmentPerformed: n.treatmentPerformed,
        treatmentToothNumber: n.treatmentToothNumber,
        treatmentDescription: n.treatmentDescription,
        materialsUsed: n.materialsUsed,
        treatmentOutcome: n.treatmentOutcome,
        treatmentRecommendations: n.treatmentRecommendations,
        referralNotes: n.referralNotes,
        followUpRequired: n.followUpRequired,
        followUpDate: n.followUpDate,
        followUpInstructions: n.followUpInstructions,
        patientAdvice: n.patientAdvice,
        addenda: Array.isArray(n.addenda) ? n.addenda : [],
        visitDate: n.consultationDate ? n.consultationDate.slice(0, 10) : (n.createdAt ? n.createdAt.slice(0, 10) : getTodayDateStr()),
        complaint: n.chiefComplaint || '',
        findings: n.examinationNotes || n.intraoralFindings || '',
        plan: n.treatmentRecommendations || n.treatmentPerformed || '',
        patient: n.patient
          ? {
              id: n.patient.id,
              patientCode: n.patient.patientCode,
              firstName: n.patient.firstName,
              lastName: n.patient.lastName,
              gender: n.patient.gender,
              dateOfBirth: n.patient.dateOfBirth,
              mobile: n.patient.mobile,
              medicalSafetyAlerts: Array.isArray(n.patient.medicalSafetyAlerts)
                ? n.patient.medicalSafetyAlerts
                : [],
            }
          : undefined,
        doctor: n.doctor
          ? {
              id: n.doctor.id,
              fullName: n.doctor.fullName,
              email: n.doctor.email,
              role: n.doctor.role,
            }
          : undefined,
        appointment: n.appointment,
        createdAt: n.createdAt || new Date().toISOString(),
        updatedAt: n.updatedAt,
      }));
      emitChange();
    }
  } catch (err) {
    console.warn('[clinicStore] refreshClinicalNotes failed:', err);
  }
};

export const addClinicalNote = (
  note: ClinicalNoteInput
): Promise<ClinicalNoteRecord> & ClinicalNoteRecord => {
  const matchedPatient = patientsState.find(
    (p) =>
      p.id.toLowerCase() === note.patientId.toLowerCase() ||
      (p.backendId && p.backendId.toLowerCase() === note.patientId.toLowerCase())
  );

  const tempId = note.id || `not-temp-${Date.now()}`;
  const optimisticNumber = `CN-${1000 + clinicalNotesState.length + 1}`;
  const visitDate = note.consultationDate
    ? note.consultationDate.slice(0, 10)
    : (note.visitDate || getTodayDateStr());
  const chiefComplaint = (note.chiefComplaint || note.complaint || 'Routine dental consultation').trim();
  const primaryDiagnosis = (note.primaryDiagnosis || 'Clinical Examination').trim();
  const examinationNotes = (note.examinationNotes || note.findings || '').trim();
  const treatmentRecommendations = (note.treatmentRecommendations || note.plan || '').trim();

  const localNote: ClinicalNoteRecord = {
    id: tempId,
    noteNumber: optimisticNumber,
    clinicId: undefined,
    patientId: matchedPatient?.id || note.patientId,
    appointmentId: note.appointmentId,
    doctorId: note.doctorId || 'doc-current',
    doctorName: note.doctorName || 'Attending Doctor',
    consultationDate: note.consultationDate || new Date().toISOString(),
    consultationType: note.consultationType || 'ROUTINE_CHECKUP',
    status: note.isFinalized ? 'FINALIZED' : 'DRAFT',
    finalizedAt: note.isFinalized ? new Date().toISOString() : undefined,
    finalizedByName: note.isFinalized ? (note.doctorName || 'Attending Doctor') : undefined,
    chiefComplaint,
    symptoms: note.symptoms?.trim() || '',
    symptomDuration: note.symptomDuration?.trim() || '',
    painSeverity: typeof note.painSeverity === 'number' ? note.painSeverity : 0,
    historyNotes: note.historyNotes?.trim() || '',
    extraoralFindings: note.extraoralFindings?.trim() || '',
    intraoralFindings: note.intraoralFindings?.trim() || '',
    toothSpecificFindings: note.toothSpecificFindings?.trim() || '',
    periodontalFindings: note.periodontalFindings?.trim() || '',
    examinationNotes,
    primaryDiagnosis,
    additionalDiagnoses: note.additionalDiagnoses,
    diagnosisNotes: note.diagnosisNotes?.trim() || '',
    treatmentPerformed: note.treatmentPerformed?.trim() || '',
    treatmentToothNumber: note.treatmentToothNumber?.trim() || '',
    treatmentDescription: note.treatmentDescription?.trim() || '',
    materialsUsed: note.materialsUsed?.trim() || '',
    treatmentOutcome: note.treatmentOutcome?.trim() || '',
    treatmentRecommendations,
    referralNotes: note.referralNotes?.trim() || '',
    followUpRequired: Boolean(note.followUpRequired),
    followUpDate: note.followUpDate,
    followUpInstructions: note.followUpInstructions?.trim() || '',
    patientAdvice: note.patientAdvice?.trim() || '',
    addenda: [],
    visitDate,
    complaint: chiefComplaint,
    findings: examinationNotes || note.intraoralFindings || '',
    plan: treatmentRecommendations || note.treatmentPerformed || '',
    createdAt: new Date().toISOString(),
    patient: matchedPatient
      ? {
          id: matchedPatient.id,
          patientCode: matchedPatient.id,
          firstName: matchedPatient.firstName,
          lastName: matchedPatient.lastName,
          gender: matchedPatient.gender,
          dateOfBirth: matchedPatient.dateOfBirth,
          mobile: matchedPatient.mobile,
          medicalSafetyAlerts: (matchedPatient as any).medicalAlerts || (matchedPatient.allergiesDetails ? [matchedPatient.allergiesDetails] : []),
        }
      : undefined,
  };

  const prevNotes = [...clinicalNotesState];
  clinicalNotesState = [localNote, ...clinicalNotesState];
  emitChange();

  const promise = (async () => {
    if (hasAuthToken()) {
      try {
        const created = await apiClient.post<any>('/clinical-notes', {
          patientId: matchedPatient?.backendId || note.patientId,
          appointmentId: note.appointmentId,
          doctorId: note.doctorId,
          consultationDate: note.consultationDate,
          consultationType: note.consultationType,
          chiefComplaint,
          symptoms: note.symptoms?.trim() || undefined,
          symptomDuration: note.symptomDuration?.trim() || undefined,
          painSeverity: typeof note.painSeverity === 'number' ? note.painSeverity : undefined,
          historyNotes: note.historyNotes?.trim() || undefined,
          extraoralFindings: note.extraoralFindings?.trim() || undefined,
          intraoralFindings: note.intraoralFindings?.trim() || undefined,
          toothSpecificFindings: note.toothSpecificFindings?.trim() || undefined,
          periodontalFindings: note.periodontalFindings?.trim() || undefined,
          examinationNotes: examinationNotes || undefined,
          primaryDiagnosis,
          additionalDiagnoses: note.additionalDiagnoses,
          diagnosisNotes: note.diagnosisNotes?.trim() || undefined,
          treatmentPerformed: note.treatmentPerformed?.trim() || undefined,
          treatmentToothNumber: note.treatmentToothNumber?.trim() || undefined,
          treatmentDescription: note.treatmentDescription?.trim() || undefined,
          materialsUsed: note.materialsUsed?.trim() || undefined,
          treatmentOutcome: note.treatmentOutcome?.trim() || undefined,
          treatmentRecommendations: treatmentRecommendations || undefined,
          referralNotes: note.referralNotes?.trim() || undefined,
          followUpRequired: note.followUpRequired,
          followUpDate: note.followUpDate,
          followUpInstructions: note.followUpInstructions?.trim() || undefined,
          patientAdvice: note.patientAdvice?.trim() || undefined,
          isFinalized: note.isFinalized,
        });

        if (created?.id) {
          clinicalNotesState = clinicalNotesState.map((cn) =>
            cn.id === tempId
              ? {
                  ...cn,
                  id: created.id,
                  noteNumber: created.noteNumber || cn.noteNumber,
                  status: created.status || cn.status,
                  finalizedAt: created.finalizedAt || cn.finalizedAt,
                  finalizedById: created.finalizedById || cn.finalizedById,
                  finalizedByName: created.finalizedByName || cn.finalizedByName,
                  doctorName: created.doctor?.fullName || created.finalizedByName || cn.doctorName,
                  patient: created.patient || cn.patient,
                  doctor: created.doctor || cn.doctor,
                  appointment: created.appointment || cn.appointment,
                  createdAt: created.createdAt || cn.createdAt,
                }
              : cn
          );
          emitChange();
          return clinicalNotesState.find((c) => c.id === created.id) || localNote;
        }
      } catch (err) {
        console.warn('[clinicStore] addClinicalNote failed on backend, rolling back:', err);
        clinicalNotesState = prevNotes;
        emitChange();
        throw err;
      }
    }
    return localNote;
  })();

  Object.assign(promise, localNote);
  return promise as any;
};

export const saveClinicalNote = addClinicalNote;

export const updateClinicalNote = async (
  id: string,
  patch: Partial<ClinicalNoteInput>
): Promise<ClinicalNoteRecord> => {
  const prevNotes = [...clinicalNotesState];
  clinicalNotesState = clinicalNotesState.map((cn) => {
    if (cn.id !== id) return cn;
    return {
      ...cn,
      ...(patch.chiefComplaint !== undefined ? { chiefComplaint: patch.chiefComplaint.trim(), complaint: patch.chiefComplaint.trim() } : {}),
      ...(patch.primaryDiagnosis !== undefined ? { primaryDiagnosis: patch.primaryDiagnosis.trim() } : {}),
      ...(patch.examinationNotes !== undefined ? { examinationNotes: patch.examinationNotes.trim(), findings: patch.examinationNotes.trim() } : {}),
      ...(patch.treatmentRecommendations !== undefined ? { treatmentRecommendations: patch.treatmentRecommendations.trim(), plan: patch.treatmentRecommendations.trim() } : {}),
      ...(patch.symptoms !== undefined ? { symptoms: patch.symptoms } : {}),
      ...(patch.symptomDuration !== undefined ? { symptomDuration: patch.symptomDuration } : {}),
      ...(patch.painSeverity !== undefined ? { painSeverity: patch.painSeverity } : {}),
      ...(patch.historyNotes !== undefined ? { historyNotes: patch.historyNotes } : {}),
      ...(patch.extraoralFindings !== undefined ? { extraoralFindings: patch.extraoralFindings } : {}),
      ...(patch.intraoralFindings !== undefined ? { intraoralFindings: patch.intraoralFindings } : {}),
      ...(patch.toothSpecificFindings !== undefined ? { toothSpecificFindings: patch.toothSpecificFindings } : {}),
      ...(patch.periodontalFindings !== undefined ? { periodontalFindings: patch.periodontalFindings } : {}),
      ...(patch.additionalDiagnoses !== undefined ? { additionalDiagnoses: patch.additionalDiagnoses } : {}),
      ...(patch.diagnosisNotes !== undefined ? { diagnosisNotes: patch.diagnosisNotes } : {}),
      ...(patch.treatmentPerformed !== undefined ? { treatmentPerformed: patch.treatmentPerformed } : {}),
      ...(patch.treatmentToothNumber !== undefined ? { treatmentToothNumber: patch.treatmentToothNumber } : {}),
      ...(patch.treatmentDescription !== undefined ? { treatmentDescription: patch.treatmentDescription } : {}),
      ...(patch.materialsUsed !== undefined ? { materialsUsed: patch.materialsUsed } : {}),
      ...(patch.treatmentOutcome !== undefined ? { treatmentOutcome: patch.treatmentOutcome } : {}),
      ...(patch.referralNotes !== undefined ? { referralNotes: patch.referralNotes } : {}),
      ...(patch.followUpRequired !== undefined ? { followUpRequired: patch.followUpRequired } : {}),
      ...(patch.followUpDate !== undefined ? { followUpDate: patch.followUpDate } : {}),
      ...(patch.followUpInstructions !== undefined ? { followUpInstructions: patch.followUpInstructions } : {}),
      ...(patch.patientAdvice !== undefined ? { patientAdvice: patch.patientAdvice } : {}),
      ...(patch.consultationDate !== undefined ? { consultationDate: patch.consultationDate, visitDate: patch.consultationDate.slice(0, 10) } : {}),
      updatedAt: new Date().toISOString(),
    };
  });
  emitChange();

  if (hasAuthToken()) {
    try {
      const updated = await apiClient.patch<any>(`/clinical-notes/${id}`, patch);
      if (updated?.id) {
        clinicalNotesState = clinicalNotesState.map((cn) =>
          cn.id === id
            ? {
                ...cn,
                ...updated,
                visitDate: updated.consultationDate ? updated.consultationDate.slice(0, 10) : cn.visitDate,
                complaint: updated.chiefComplaint || cn.complaint,
                findings: updated.examinationNotes || updated.intraoralFindings || cn.findings,
                plan: updated.treatmentRecommendations || updated.treatmentPerformed || cn.plan,
              }
            : cn
        );
        emitChange();
        return clinicalNotesState.find((c) => c.id === id)!;
      }
    } catch (err) {
      console.warn('[clinicStore] updateClinicalNote failed on backend, rolling back:', err);
      clinicalNotesState = prevNotes;
      emitChange();
      throw err;
    }
  }

  return clinicalNotesState.find((c) => c.id === id)!;
};

export const finalizeClinicalNote = async (id: string): Promise<ClinicalNoteRecord> => {
  const prevNotes = [...clinicalNotesState];
  if (hasAuthToken()) {
    try {
      const finalized = await apiClient.post<any>(`/clinical-notes/${id}/finalize`, {});
      clinicalNotesState = clinicalNotesState.map((cn) =>
        cn.id === id
          ? {
              ...cn,
              status: 'FINALIZED',
              finalizedAt: finalized?.finalizedAt || new Date().toISOString(),
              finalizedById: finalized?.finalizedById,
              finalizedByName: finalized?.finalizedByName,
              doctorName: finalized?.finalizedByName || cn.doctorName,
            }
          : cn
      );
      emitChange();
      const res = clinicalNotesState.find((c) => c.id === id);
      if (!res) throw new Error('Clinical note not found after finalization');
      return res;
    } catch (err) {
      console.warn('[clinicStore] finalizeClinicalNote failed on backend, rolling back:', err);
      clinicalNotesState = prevNotes;
      emitChange();
      throw err;
    }
  } else {
    clinicalNotesState = clinicalNotesState.map((cn) =>
      cn.id === id
        ? {
            ...cn,
            status: 'FINALIZED',
            finalizedAt: new Date().toISOString(),
            finalizedByName: cn.doctorName || 'Attending Doctor',
          }
        : cn
    );
    emitChange();
    const res = clinicalNotesState.find((c) => c.id === id);
    if (!res) throw new Error('Clinical note not found after finalization');
    return res;
  }
};

export const addClinicalNoteAddendum = async (
  noteId: string,
  content: string
): Promise<ClinicalNoteAddendumRecord> => {
  const prevNotes = [...clinicalNotesState];
  const tempAddendum: ClinicalNoteAddendumRecord = {
    id: `add-${Date.now()}`,
    noteId,
    content: content.trim(),
    createdAt: new Date().toISOString(),
  };

  clinicalNotesState = clinicalNotesState.map((cn) => {
    if (cn.id !== noteId) return cn;
    return {
      ...cn,
      addenda: [...(cn.addenda || []), tempAddendum],
    };
  });
  emitChange();

  if (hasAuthToken()) {
    try {
      const created = await apiClient.post<any>(`/clinical-notes/${noteId}/addenda`, {
        content: content.trim(),
      });
      if (created?.id) {
        clinicalNotesState = clinicalNotesState.map((cn) => {
          if (cn.id !== noteId) return cn;
          return {
            ...cn,
            addenda: (cn.addenda || []).map((a) => (a.id === tempAddendum.id ? created : a)),
          };
        });
        emitChange();
        return created;
      }
    } catch (err) {
      console.warn('[clinicStore] addClinicalNoteAddendum failed on backend, rolling back:', err);
      clinicalNotesState = prevNotes;
      emitChange();
      throw err;
    }
  }

  return tempAddendum;
};
