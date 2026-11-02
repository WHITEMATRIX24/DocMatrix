import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import App from '@/App'
import PatientListPage from '@/pages/patients/PatientListPage'
import PatientProfilePage from '@/pages/patients/PatientProfilePage'
import TreatmentPlansPage from '@/pages/clinical/TreatmentPlansPage'
import ToothChartPage from '@/pages/patients/ToothChartPage'
import PendingTreatmentsPage from '@/pages/patients/PendingTreatmentsPage'
import { resetStoreForTesting } from '@/services/clinicStore'

describe('Patients Module Refactoring & Clinical Centralization', () => {
  beforeEach(() => {
    sessionStorage.clear()
    sessionStorage.setItem('docmatrix-demo-session', 'usr-101')
    resetStoreForTesting()
  })

  // 1. PATIENTS LIST HEADER & REGISTRATION ENTRY POINT
  it('renders Patients List header correctly without duplicate registration buttons', () => {
    render(
      <MemoryRouter initialEntries={['/patients/list']}>
        <PatientListPage />
      </MemoryRouter>
    )

    // Eyebrow and Header per Section 3
    expect(screen.getByText('PATIENTS')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Patients' })).toBeInTheDocument()
    expect(
      screen.getByText('Manage patient records and access clinical information.')
    ).toBeInTheDocument()

    // Must NOT have Add patient or Register patient button on Patients List page
    expect(screen.queryByRole('link', { name: /Add patient/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Add patient/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/Register first patient/i)).not.toBeInTheDocument()
  })

  // 2. SEARCH AND FILTERING ON PATIENTS LIST
  it('supports searching by name, phone, and patient ID, and filters by medical alerts', () => {
    render(
      <MemoryRouter initialEntries={['/patients/list']}>
        <PatientListPage />
      </MemoryRouter>
    )

    // Verify initial seed patients appear
    expect(screen.getByText('Meera Nambiar')).toBeInTheDocument()
    expect(screen.getByText('pt-1001')).toBeInTheDocument()

    // Search by Name
    const searchInput = screen.getByLabelText(/Search patients/i)
    fireEvent.change(searchInput, { target: { value: 'Meera' } })
    expect(screen.getByText('Meera Nambiar')).toBeInTheDocument()
    expect(screen.queryByText('Marcus Vance')).not.toBeInTheDocument()

    // Search by Patient ID
    fireEvent.change(searchInput, { target: { value: 'PAT-1003' } })
    expect(screen.getByText('Marcus Vance')).toBeInTheDocument()
    expect(screen.queryByText('Meera Nambiar')).not.toBeInTheDocument()

    // Clear search and filter by Medical Alerts Only
    fireEvent.change(searchInput, { target: { value: '' } })
    const alertChip = screen.getByRole('button', { name: /Medical Alerts Only/i })
    fireEvent.click(alertChip)

    // Meera has penicillin allergy -> should remain visible
    expect(screen.getByText('Meera Nambiar')).toBeInTheDocument()
  })

  // 3. SELECTING A PATIENT OPENS PROFILE
  it('clicking a patient in the list opens their Patient Profile', () => {
    render(
      <MemoryRouter initialEntries={['/patients/list']}>
        <Routes>
          <Route path="/patients/list" element={<PatientListPage />} />
          <Route path="/patients/:id" element={<PatientProfilePage />} />
        </Routes>
      </MemoryRouter>
    )

    const meeraRow = screen.getByText('Meera Nambiar')
    expect(meeraRow).toBeInTheDocument()

    // Click patient name
    fireEvent.click(meeraRow)

    // Verify Patient Profile rendered
    expect(screen.getByTestId('feature-page-pat.profile')).toBeInTheDocument()
    expect(screen.getByText('pt-1001')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Meera Nambiar/i)
  })

  // 4. UNIFIED PATIENT PROFILE 5-TAB STRUCTURE & DATA LOADING
  it('renders all 5 unified profile tabs with authentic clinical data', () => {
    render(
      <MemoryRouter initialEntries={['/patients/pt-1001']}>
        <Routes>
          <Route path="/patients/:id" element={<PatientProfilePage />} />
        </Routes>
      </MemoryRouter>
    )

    // Header Details
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Meera Nambiar/i)
    expect(screen.getByText('pt-1001')).toBeInTheDocument()
    expect(screen.getAllByText(/34 yrs/i).length).toBeGreaterThan(0)

    // High-visibility Medical Alert Banner
    expect(screen.getByRole('alert')).toHaveTextContent(/Penicillin allergy/i)

    // Permitted Clinical Actions
    expect(screen.getByRole('button', { name: /Edit Patient/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Book Appointment/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Start Consultation/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Tooth Chart/i })).toBeInTheDocument()

    // 5 Tabs Presence
    const tabs = ['Overview', 'Medical History', 'Visit Timeline', 'Documents', 'Consent Records']
    for (const tab of tabs) {
      expect(screen.getByRole('button', { name: new RegExp(tab, 'i') })).toBeInTheDocument()
    }

    // Switch to Medical History Tab
    fireEvent.click(screen.getByRole('button', { name: /Medical History/i }))
    expect(screen.getByText(/Patient Medical Screening & Dental Safety/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Penicillin allergy, Latex sensitivity/i).length).toBeGreaterThan(0)

    // Switch to Visit Timeline Tab
    fireEvent.click(screen.getByRole('button', { name: /Visit Timeline/i }))
    expect(screen.getByText(/Chronological Visit Timeline/i)).toBeInTheDocument()

    // Switch to Documents Tab
    fireEvent.click(screen.getByRole('button', { name: /Documents/i }))
    expect(screen.getByText(/Diagnostic Records & Radiographs/i)).toBeInTheDocument()
    expect(screen.getByText(/Diagnostic Digital RVG X-Ray/i)).toBeInTheDocument()

    // Switch to Consent Records Tab
    fireEvent.click(screen.getByRole('button', { name: /Consent Records/i }))
    expect(screen.getByText(/Informed Consent & Regulatory Records/i)).toBeInTheDocument()
    expect(screen.getByText(/Informed Consent for Endodontic Root Canal Therapy/i)).toBeInTheDocument()
  })

  // 5. DEEP LINKS RESOLUTION
  it('deep links to patient sub-paths open the corresponding profile tab or clinical redirect', () => {
    // A. Timeline deep link
    const { unmount: unmountTimeline } = render(
      <MemoryRouter initialEntries={['/patients/pt-1001/timeline']}>
        <Routes>
          <Route path="/patients/:id/*" element={<PatientProfilePage />} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText(/Chronological Visit Timeline/i)).toBeInTheDocument()
    unmountTimeline()

    // B. Documents deep link
    const { unmount: unmountDocs } = render(
      <MemoryRouter initialEntries={['/patients/pt-1001/documents']}>
        <Routes>
          <Route path="/patients/:id/*" element={<PatientProfilePage />} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText(/Diagnostic Records & Radiographs/i)).toBeInTheDocument()
    unmountDocs()

    // C. Pending Treatments deep link
    const { unmount: unmountPending } = render(
      <MemoryRouter initialEntries={['/patients/pt-1001/pending-treatments']}>
        <Routes>
          <Route path="/patients/:id/pending-treatments" element={<PendingTreatmentsPage />} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText(/Pending Treatments/i)).toBeInTheDocument()
    expect(screen.getByText(/Centralized Clinical Workflow/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Open Clinical Treatment Plans/i })).toHaveAttribute(
      'href',
      '/clinical/treatment-plans'
    )
    unmountPending()
  })

  // 6. TREATMENT PLANS IN CLINICAL MODULE
  it('Treatment Plans page provides status-based views including Pending Treatments', () => {
    render(
      <MemoryRouter initialEntries={['/clinical/treatment-plans']}>
        <TreatmentPlansPage />
      </MemoryRouter>
    )

    expect(screen.getByTestId('feature-page-clin.plans')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Treatment Plans' })).toBeInTheDocument()

    // Verify all status tabs
    const statuses = ['All', 'Proposed', 'Accepted', 'In Progress', 'Pending', 'Completed']
    for (const status of statuses) {
      expect(screen.getByRole('button', { name: new RegExp(status, 'i') })).toBeInTheDocument()
    }

    // Filter to Pending
    fireEvent.click(screen.getByRole('button', { name: /Pending/i }))
    expect(screen.getByText(/CAD\/CAM Zirconia Crown Restoration/i)).toBeInTheDocument()
  })

  // 7. DENTAL CHARTING IN CLINICAL MODULE
  it('Tooth Chart loads patient records and provides interactive FDI dentition charting', () => {
    render(
      <MemoryRouter initialEntries={['/patients/pt-1001/tooth-chart']}>
        <Routes>
          <Route path="/patients/:id/tooth-chart" element={<ToothChartPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId('feature-page-pat.toothchart')).toBeInTheDocument()
    expect(screen.getByText(/Dental Chart & Odontogram/i)).toBeInTheDocument()
    expect(screen.getByText(/Meera Nambiar/i)).toBeInTheDocument()

    // FDI quadrants
    expect(screen.getByText(/Maxillary Arch \(Upper\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Mandibular Arch \(Lower\)/i)).toBeInTheDocument()

    // Tooth 46 has RCT condition
    expect(screen.getByText(/Tooth #46 Clinical Inspector/i)).toBeInTheDocument()
  })
})
