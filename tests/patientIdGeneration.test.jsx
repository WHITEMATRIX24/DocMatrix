import { browserLocalStorage, browserSessionStorage } from '@/services/browserStorage';
import { describe, it, expect, beforeEach } from 'vitest'
import {
  generateNextPatientId,
  savePatient,
  registerWalkIn,
  resetStoreForTesting,
  getClinicSnapshot
} from '@/services/clinicStore'

describe('Simple and Straightforward Patient ID Generation', () => {
  beforeEach(() => {
    browserSessionStorage.clear()
    browserLocalStorage.clear()
    resetStoreForTesting()
  })

  it('generates PAT-001 when no patients exist', () => {
    const nextId = generateNextPatientId([])
    expect(nextId).toBe('PAT-001')
  })

  it('generates PAT-002 when PAT-001 already exists', () => {
    const existing = [{ id: 'PAT-001' }]
    const nextId = generateNextPatientId(existing)
    expect(nextId).toBe('PAT-002')
  })

  it('generates PAT-003 when PAT-001 and PAT-002 exist', () => {
    const existing = [{ id: 'PAT-001' }, { id: 'PAT-002' }]
    const nextId = generateNextPatientId(existing)
    expect(nextId).toBe('PAT-003')
  })

  it('fills sequence gaps cleanly and starts at PAT-001 even if legacy random timestamp IDs exist', () => {
    // If clinic has old random timestamp IDs like PAT-5186 or PAT-2007
    const existing = [
      { id: 'PAT-5186' },
      { id: 'PAT-2007' },
      { id: 'PAT-1915' }
    ]
    const nextId = generateNextPatientId(existing)
    expect(nextId).toBe('PAT-001')
  })

  it('assigns sequential IDs when calling savePatient', () => {
    const patient1 = savePatient({
      firstName: 'Aarav',
      lastName: 'Sharma',
      age: '28',
      gender: 'male',
      mobile: '9876500001',
      dateOfBirth: '1998-01-01',
      countryCode: '+91'
    })
    expect(patient1.id).toBe('PAT-001')

    const patient2 = savePatient({
      firstName: 'Diya',
      lastName: 'Menon',
      age: '25',
      gender: 'female',
      mobile: '9876500002',
      dateOfBirth: '2001-05-10',
      countryCode: '+91'
    })
    expect(patient2.id).toBe('PAT-002')

    const patient3 = savePatient({
      firstName: 'Rohan',
      lastName: 'Verma',
      age: '35',
      gender: 'male',
      mobile: '9876500003',
      dateOfBirth: '1991-09-20',
      countryCode: '+91'
    })
    expect(patient3.id).toBe('PAT-003')
  })

  it('assigns sequential IDs when registerWalkIn creates a new patient', async () => {
    const appt = await registerWalkIn({
      patientName: 'Karan Patel',
      mobile: '9998887771',
      gender: 'male',
      age: '32',
      complaint: 'Tooth ache',
      doctor: 'Dr. John Doe',
      priority: 'normal'
    })

    const { patients } = getClinicSnapshot()
    const createdPatient = patients.find((p) => p.mobile === '9998887771')
    expect(createdPatient).toBeDefined()
    expect(createdPatient?.id).toBe('PAT-001')
    expect(appt.patientId).toBe('PAT-001')
  })
})
