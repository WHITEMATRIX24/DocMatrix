import { browserLocalStorage, browserSessionStorage } from '@/services/browserStorage';
import { seedClinicFixture } from './fixtures/clinic'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  isStorageAvailable,
  loadFromStorage,
  saveToStorage,
  removeFromStorage,
  STORAGE_KEYS
} from '@/services/storageService'
import {
  savePatient,
  updatePatient,
  bookAppointment,
  updateAppointmentStatus,
  addClinicalNote,
  addTreatmentPlan,
  recordTreatmentPlanAcceptance,
  createInvoice,
  addPatientDocument,
  addPatientConsent,
  saveToothConditionForPatient,
  getToothConditionsForPatient,
  getClinicSnapshot,
} from '@/services/clinicStore'

describe('DocMatrix Demonstration Persistence Engine', () => {
  beforeEach(() => seedClinicFixture('ORGANIZATION_ADMIN'))

  it('detects browser storage availability and handles missing storage gracefully', () => {
    expect(isStorageAvailable()).toBe(true)
    expect(loadFromStorage('non_existent_key', { fallback: true })).toEqual({ fallback: true })
  })

  it('handles malformed JSON in browserLocalStorage without throwing or crashing', () => {
    browserLocalStorage.setItem('corrupted_key', '{ bad json ...')
    const result = loadFromStorage('corrupted_key', { safe: true })
    expect(result).toEqual({ safe: true })
  })

  it('persists newly registered patients across simulated store reloads', () => {
    const newPt = savePatient({
      firstName: 'Anjali',
      lastName: 'Menon',
      age: '29',
      dateOfBirth: '1997-06-15',
      gender: 'female',
      mobile: '9845012345',
      countryCode: '+91',
      email: 'anjali.m@example.com',
      language: 'English, Malayalam',
      city: 'Ernakulam',
      state: 'Kerala',
      postalCode: '682016',
      address: 'Panampilly Nagar',
      emergencyName: 'Kiran Menon',
      emergencyPhone: '9845012346',
      relationship: 'Spouse',
      allergies: 'no',
      allergiesDetails: '',
      medications: 'no',
      medicationsDetails: '',
      conditions: 'no',
      conditionsDetails: ''
    })

    // Verify written to storage
    const stored = JSON.parse(browserLocalStorage.getItem(STORAGE_KEYS.DATA) || '{}')
    expect(stored.patients).toBeDefined()
    const foundInStorage = stored.patients.find((p) => p.id === newPt.id)
    expect(foundInStorage).toBeDefined()
    expect(foundInStorage.firstName).toBe('Anjali')
  })

  it('persists patient edits to storage and preserves them', () => {
    updatePatient('pt-1001', {
      mobile: '9999988888',
      city: 'Trivandrum'
    })

    const stored = JSON.parse(browserLocalStorage.getItem(STORAGE_KEYS.DATA) || '{}')
    const updated = stored.patients.find((p) => p.id === 'pt-1001')
    expect(updated.mobile).toBe('9999988888')
    expect(updated.city).toBe('Trivandrum')
  })

  it('persists appointment booking and status changes', () => {
    const appt = bookAppointment({
      patientId: 'pt-1001',
      doctor: 'Dr. Arun Kumar',
      treatmentType: 'Ultrasonic Scaling',
      visitType: 'Consultation',
      date: '2026-11-05',
      time: '11:00',
      durationMinutes: 45,
      priority: 'normal',
      notes: 'Routine checkup'
    })

    expect(appt.id).toBeDefined()
    updateAppointmentStatus(appt.id, 'checked-in')
    updateAppointmentStatus(appt.id, 'in-progress')
    updateAppointmentStatus(appt.id, 'completed', 'Cleaned teeth and polished')

    const stored = JSON.parse(browserLocalStorage.getItem(STORAGE_KEYS.DATA) || '{}')
    const found = stored.appointments.find((a) => a.id === appt.id)
    expect(found).toBeDefined()
    expect(found.status).toBe('completed')
  })

  it('persists dental tooth chart markings per patient', () => {
    saveToothConditionForPatient('pt-1001', 37, 'Caries', 'Deep pit caries on lingual surface')

    const conditions = getToothConditionsForPatient('pt-1001')
    expect(conditions[37]).toBeDefined()
    expect(conditions[37].condition).toBe('Caries')
    expect(conditions[37].notes).toContain('Deep pit caries')

    const stored = JSON.parse(browserLocalStorage.getItem(STORAGE_KEYS.DATA) || '{}')
    expect(stored.toothCharts['pt-1001'][37].condition).toBe('Caries')
  })

  it('persists clinical notes, treatment plans, documents, and invoices', async () => {
    // 1. Clinical Note
    const note = addClinicalNote({
      patientId: 'pt-1001',
      visitDate: '2026-10-30',
      complaint: 'Slight toothache',
      findings: 'Gingival inflammation',
      plan: 'Advised chlorhexidine mouthwash'
    })

    // 2. Treatment Plan
    const plan = addTreatmentPlan({
      patientId: 'pt-1001',
      procedure: 'Periodontal Curettage',
      category: 'Periodontics',
      cost: 3200,
      doctor: 'Dr. Priya Nair',
      status: 'Proposed'
    })
    await recordTreatmentPlanAcceptance(plan.id, { versionNumber: 1, patientAcceptedByName: 'Synthetic Patient', acceptanceMethod: 'STAFF_RECORDED', isStaffRecorded: true })

    // 3. Invoice
    const invoice = createInvoice({
      patientId: 'pt-1001',
      description: 'Consultation & Mouthwash',
      amount: 850
    })

    // 4. Document metadata
    const doc = addPatientDocument({
      patientId: 'pt-1001',
      title: 'Post-Op Periapical X-Ray',
      category: 'Radiology',
      fileName: 'post_op_16.png',
      fileSize: '1.4 MB'
    })

    // 5. Consent
    const consent = addPatientConsent({
      patientId: 'pt-1001',
      consentType: 'Periodontal Curettage Consent',
      status: 'Signed',
      recordedBy: 'Dr. Priya Nair'
    })

    const stored = JSON.parse(browserLocalStorage.getItem(STORAGE_KEYS.DATA) || '{}')
    expect(stored.clinicalNotes.some((n) => n.id === note.id)).toBe(true)
    expect(stored.treatmentPlans.find((tp) => tp.id === plan.id).status).toBe('Accepted')
    expect(stored.invoices.some((i) => i.id === invoice.id)).toBe(true)
    expect(stored.patientDocuments.some((d) => d.id === doc.id)).toBe(true)
    expect(stored.patientConsents.some((c) => c.id === consent.id)).toBe(true)
  })

  it('preserves application data even when auth keys are cleared (e.g. on logout)', () => {
    // Register a patient
    const pt = savePatient({
      firstName: 'Kavitha',
      lastName: 'Pillai',
      age: '40',
      dateOfBirth: '1986-02-10',
      gender: 'female',
      mobile: '9447000000',
      countryCode: '+91',
      email: 'kavitha@example.com',
      language: 'Malayalam',
      city: 'Calicut',
      state: 'Kerala',
      postalCode: '673001',
      address: 'Beach Road',
      emergencyName: 'Raju Pillai',
      emergencyPhone: '9447000001',
      relationship: 'Spouse',
      allergies: 'no',
      allergiesDetails: '',
      medications: 'no',
      medicationsDetails: '',
      conditions: 'no',
      conditionsDetails: ''
    })

    // Simulate Auth logout clearing only auth keys
    browserSessionStorage.removeItem('docmatrix-demo-session')
    browserSessionStorage.removeItem('docmatrix_auth_token')
    browserSessionStorage.removeItem('docmatrix_auth_user')

    // App data must remain in browserLocalStorage!
    const stored = JSON.parse(browserLocalStorage.getItem(STORAGE_KEYS.DATA) || '{}')
    expect(stored.patients.some((p) => p.id === pt.id)).toBe(true)
  })
})

