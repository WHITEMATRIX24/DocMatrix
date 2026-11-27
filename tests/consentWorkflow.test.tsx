import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import {
  DEFAULT_FRONTEND_CONSENT_TEMPLATES,
  getConsentStatusMeta,
  matchFrontendConsentTemplate,
} from '@/services/consentService'
import { seedClinicFixture } from './fixtures/clinic'
import { bookAppointment, checkDentistAvailability, savePatient } from '@/services/clinicStore'
import { PatientProfilePage } from '@/pages/patients/PatientProfilePage'
import { ConsentTemplatesPage } from '@/pages/settings/ConsentTemplatesPage'
import { ConsentDocumentModal } from '@/components/clinical/ConsentDocumentModal'

describe('Automated Procedure-Specific Consent Forms & E-Signature (Frontend)', () => {
  beforeEach(() => {
    seedClinicFixture('ORGANIZATION_ADMIN')
  })

  it('matches all 17 procedure-specific templates and skips ordinary appointments', () => {
    expect(DEFAULT_FRONTEND_CONSENT_TEMPLATES.length).toBe(17)
    expect(matchFrontendConsentTemplate('Wisdom Tooth Extraction')?.procedureType).toBe('Wisdom Tooth Extraction')
    expect(matchFrontendConsentTemplate('Surgical Wisdom Tooth Removal')?.procedureType).toBe('Wisdom Tooth Extraction')
    expect(matchFrontendConsentTemplate('Dental Implant Surgery')?.procedureType).toBe('Dental Implant Surgery')
    expect(matchFrontendConsentTemplate('CBCT Imaging')?.procedureType).toBe('CBCT Imaging')
    expect(matchFrontendConsentTemplate('Comprehensive Dental Examination')).toBeNull()
  })

  it('automatically generates PENDING_SIGNATURE consent when booking surgery and displays it in Patient Profile Consent Records tab', () => {
    const patient = savePatient({
      firstName: 'Rahul',
      lastName: 'Kumar',
      dateOfBirth: '1996-05-10',
      age: '30',
      gender: 'male',
      mobile: '9876543210',
      countryCode: '+91',
      email: 'rahul@example.com',
      language: 'English',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560038',
      address: '12 Indiranagar',
      emergencyName: 'Suresh',
      emergencyPhone: '9876543211',
      relationship: 'Father',
      allergies: 'no',
      allergiesDetails: '',
      medications: 'no',
      medicationsDetails: '',
      conditions: 'no',
      conditionsDetails: '',
    })

    bookAppointment({
      patientId: patient.id,
      doctor: 'Dr. Anjali Sharma',
      treatmentType: 'Surgical Wisdom Tooth Removal',
      visitType: 'Oral Surgery',
      date: '2026-11-28',
      time: '11:00',
      durationMinutes: 60,
    })

    // Ordinary appointment should not generate another consent
    bookAppointment({
      patientId: patient.id,
      doctor: 'Dr. Anjali Sharma',
      treatmentType: 'Comprehensive Dental Examination',
      visitType: 'Consultation',
      date: '2026-11-28',
      time: '12:30',
      durationMinutes: 30,
    })

    render(
      <MemoryRouter initialEntries={[`/patients/${patient.id}?tab=consents`]}>
        <Routes>
          <Route path="/patients/:id" element={<PatientProfilePage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Informed Consent for Wisdom Tooth Extraction')).toBeInTheDocument()
    expect(screen.getByText('Pending Signature')).toBeInTheDocument()
    expect(screen.getByText('View Consent')).toBeInTheDocument()
    expect(screen.getByText('Sign Consent')).toBeInTheDocument()
    expect(screen.getByText('Download PDF')).toBeInTheDocument()
  })

  it('supports consent status badges and ConsentTemplatesPage admin management', () => {
    expect(getConsentStatusMeta('PENDING_SIGNATURE').label).toBe('Pending Signature')
    expect(getConsentStatusMeta('PATIENT_SIGNED').label).toBe('Patient Signed')
    expect(getConsentStatusMeta('COMPLETED').label).toBe('Completed')

    render(
      <MemoryRouter>
        <ConsentTemplatesPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Procedure-Specific Consent Templates')).toBeInTheDocument()
    expect(screen.getByText('Wisdom Tooth Extraction')).toBeInTheDocument()
    expect(screen.getByText('Dental Implant Surgery')).toBeInTheDocument()
    expect(screen.getByText('CBCT Imaging')).toBeInTheDocument()
  })

  it('requires explicit acceptance before patient e-signature in ConsentDocumentModal', () => {
    const consent: any = {
      id: 'cns-test-1',
      patientId: 'PAT-1001',
      consentType: 'Informed Consent for Wisdom Tooth Extraction',
      procedureName: 'Wisdom Tooth Extraction',
      status: 'PENDING_SIGNATURE',
      dateRecorded: '2026-11-27',
      recordedBy: 'Automated Booking System',
      documentRef: 'DMX-CNS-1001',
      consentContentSnapshot: {
        title: 'Informed Consent for Wisdom Tooth Extraction',
        procedureType: 'Wisdom Tooth Extraction',
        procedureCategory: 'Oral Surgery',
        templateVersion: 1,
        guardianRequiredForMinors: true,
        patient: { id: 'PAT-1001', name: 'Rahul Kumar' },
        sections: { description: 'Surgical removal of third molar.', risks: 'Swelling, dry socket.' },
      },
    }

    render(<ConsentDocumentModal consent={consent} initialTab="sign" onClose={() => {}} />)

    const submitBtn = screen.getByTestId('submit-patient-signature-btn')
    fireEvent.click(submitBtn)
    expect(screen.getByRole('alert')).toHaveTextContent(/reviewed and accepted/i)
  })

  it('blocks booking appointments during doctor lunch break (13:00 - 14:00)', () => {
    const check = checkDentistAvailability('Dr. Arun Kumar', '2026-11-28', '13:30', 30)
    expect(check.available).toBe(false)
    expect(check.reason).toMatch(/lunch/i)
  })
})
