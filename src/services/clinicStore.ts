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

let patientsState: PatientRecord[] = [...initialPatients]
let appointmentsState: AppointmentRecord[] = [...initialAppointments]
let clinicalNotesState: ClinicalNoteRecord[] = []
let invoicesState: InvoiceRecord[] = []
let walkInCounter = 101

const listeners = new Set<() => void>()

let cachedSnapshot = {
  patients: patientsState,
  appointments: appointmentsState,
  clinicalNotes: clinicalNotesState,
  invoices: invoicesState
}

const emitChange = () => {
  cachedSnapshot = {
    patients: patientsState,
    appointments: appointmentsState,
    clinicalNotes: clinicalNotesState,
    invoices: invoicesState
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

export const registerPatient = savePatient
export const addClinicalNote = saveClinicalNote

export const resetStoreForTesting = () => {
  patientsState = [...initialPatients]
  appointmentsState = [...initialAppointments]
  clinicalNotesState = []
  invoicesState = []
  emitChange()
}
