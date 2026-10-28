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

export interface AppointmentRecord {
  id: string
  patientId: string
  doctor: string
  visitType: string
  date: string
  time: string
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
  status: 'Unpaid'
  createdAt: string
}

interface ClinicData {
  patients: PatientRecord[]
  appointments: AppointmentRecord[]
  clinicalNotes: ClinicalNoteRecord[]
  invoices: InvoiceRecord[]
}

let state: ClinicData = { patients: [], appointments: [], clinicalNotes: [], invoices: [] }
const listeners = new Set<() => void>()
const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
const notify = () => listeners.forEach((listener) => listener())

export function useClinicData() {
  return useSyncExternalStore(subscribe, () => state, () => state)
}

export function registerPatient(details: Omit<PatientRecord, 'id' | 'createdAt'>) {
  const record: PatientRecord = {
    ...details,
    id: `DM-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
    createdAt: new Date().toISOString()
  }
  state = { ...state, patients: [record, ...state.patients] }
  notify()
  return record
}

export function bookAppointment(details: Omit<AppointmentRecord, 'id' | 'createdAt'>) {
  const record: AppointmentRecord = {
    ...details,
    id: `APT-${Date.now().toString().slice(-8)}`,
    createdAt: new Date().toISOString()
  }
  state = { ...state, appointments: [...state.appointments, record] }
  notify()
  return record
}

export function addClinicalNote(details: Omit<ClinicalNoteRecord, 'id' | 'createdAt'>) {
  const record: ClinicalNoteRecord = { ...details, id: `NOTE-${Date.now().toString().slice(-8)}`, createdAt: new Date().toISOString() }
  state = { ...state, clinicalNotes: [record, ...state.clinicalNotes] }
  notify()
  return record
}

export function createInvoice(details: Omit<InvoiceRecord, 'id' | 'status' | 'createdAt'>) {
  const record: InvoiceRecord = { ...details, id: `INV-${Date.now().toString().slice(-8)}`, status: 'Unpaid', createdAt: new Date().toISOString() }
  state = { ...state, invoices: [record, ...state.invoices] }
  notify()
  return record
}

