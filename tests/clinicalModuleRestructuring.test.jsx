import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import React from 'react'
import { render, screen, cleanup, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import StaffPortal from '@/StaffPortal'
import { AppRoutes } from '@/routes/appRoutes'
import { FEATURE_REGISTRY, getLaunchFeatures } from '@/features/registry'
import { TreatmentPlansPage } from '@/pages/clinical/TreatmentPlansPage'
import { OrdersPage } from '@/pages/clinical/OrdersPage'
import { TreatmentEstimatesPage } from '@/pages/clinical/TreatmentEstimatesPage'
import { ClinicalConfigPage } from '@/pages/settings/ClinicalConfigPage'
import { PatientProfilePage } from '@/pages/patients/PatientProfilePage'

describe('DocMatrix — Clinical Module Restructuring & Navigation Verification', () => {
  const DOCTOR_USER = {
    id: 'usr-104',
    name: 'Dr. Arun Kumar',
    role: 'DOCTOR',
    clinicName: 'DocMatrix Dental Care'
  }

  const ADMIN_USER = {
    id: 'usr-101',
    name: 'Dr. Arun Kumar (Owner)',
    role: 'ORGANIZATION_ADMIN',
    clinicName: 'DocMatrix Dental Care'
  }

  afterEach(() => {
    cleanup()
  })

  // 1. EXACT THREE CLINICAL ENTRIES IN REQUIRED ORDER
  it('renders exactly three entries in the Clinical sidebar in the exact required order', () => {
    render(
      <MemoryRouter initialEntries={['/clinical/prescriptions']}>
        <StaffPortal user={DOCTOR_USER} />
      </MemoryRouter>
    )

    // Locate the Clinical sub-links
    const rxBtn = screen.getByTestId('sidebar-link-clin.prescriptions')
    const plansBtn = screen.getByTestId('sidebar-link-clin.plans')
    const notesBtn = screen.getByTestId('sidebar-link-clin.notes')

    expect(rxBtn).toBeInTheDocument()
    expect(plansBtn).toBeInTheDocument()
    expect(notesBtn).toBeInTheDocument()

    expect(rxBtn).toHaveTextContent(/Digital prescriptions/i)
    expect(plansBtn).toHaveTextContent(/Treatment plans/i)
    expect(notesBtn).toHaveTextContent(/Clinical notes/i)

    // Verify removed standalone entries are NOT in the Clinical sidebar
    expect(screen.queryByTestId('sidebar-link-clin.masterlists')).not.toBeInTheDocument()
    expect(screen.queryByTestId('sidebar-link-clin.orders')).not.toBeInTheDocument()
    expect(screen.queryByTestId('sidebar-link-clin.estimates')).not.toBeInTheDocument()

    // Verify the visual rendering order in the DOM
    const allButtons = screen.getAllByRole('button')
    const rxIndex = allButtons.indexOf(rxBtn)
    const plansIndex = allButtons.indexOf(plansBtn)
    const notesIndex = allButtons.indexOf(notesBtn)

    expect(rxIndex).toBeGreaterThan(-1)
    expect(plansIndex).toBeGreaterThan(rxIndex)
    expect(notesIndex).toBeGreaterThan(plansIndex)
  })

  // 2. SETTINGS CONTAINS CLINICAL CONFIGURATION
  it('moves Master Lists to Settings as Clinical Configuration', () => {
    render(
      <MemoryRouter initialEntries={['/settings/clinic']}>
        <StaffPortal user={ADMIN_USER} />
      </MemoryRouter>
    )

    const configBtn = screen.getByTestId('sidebar-link-set.clinical-config')
    expect(configBtn).toBeInTheDocument()
    expect(configBtn).toHaveTextContent(/Clinical configuration/i)
  })

  // 3. SINGLE ACTIVE ITEM IN SIDEBAR FOR CLINICAL AND SETTINGS SUBMODULES
  it('enforces single active submodule state across Clinical and Settings routes', () => {
    const testCases = [
      { url: '/clinical/prescriptions', expectedId: 'clin.prescriptions' },
      { url: '/clinical/treatment-plans', expectedId: 'clin.plans' },
      { url: '/clinical/notes', expectedId: 'clin.notes' },
      { url: '/settings/clinical-config', expectedId: 'set.clinical-config' }
    ]

    for (const testCase of testCases) {
      const { unmount } = render(
        <MemoryRouter initialEntries={[testCase.url]}>
          <StaffPortal user={ADMIN_USER} />
        </MemoryRouter>
      )

      const activeBtns = screen.getAllByRole('button').filter(
        (btn) => btn.dataset.testid?.startsWith('sidebar-link-') && btn.getAttribute('aria-current') === 'page'
      )

      expect(activeBtns.length).toBe(1)
      expect(activeBtns[0]).toHaveAttribute('data-testid', `sidebar-link-${testCase.expectedId}`)

      unmount()
    }
  })

  // 4. PATIENT PROFILE X-RAYS & DOCUMENTS INTEGRATION
  it('displays X-rays & Documents tab in Patient Profile and supports deep linking', () => {
    render(
      <MemoryRouter initialEntries={['/patients/pt-1001?tab=x-rays']}>
        <Routes>
          <Route path="/patients/:id" element={<PatientProfilePage />} />
        </Routes>
      </MemoryRouter>
    )

    // Verify tab button exists with new label
    const docsTabBtn = screen.getByRole('button', { name: /X-rays & Documents/i })
    expect(docsTabBtn).toBeInTheDocument()
    expect(docsTabBtn).toHaveClass('is-active')

    // Verify diagnostic radiographs content is visible
    expect(screen.getByText(/Diagnostic Records & Radiographs/i)).toBeInTheDocument()
    expect(screen.getByText(/Intraoral RVG scans, panoramic radiographs/i)).toBeInTheDocument()
  })

  // 5. ALTERNATIVE ACCESS PATHS FOR ORDERS AND ESTIMATES
  it('preserves access paths for Orders and Estimates without dead ends', () => {
    const { unmount: unmountOrders } = render(
      <MemoryRouter initialEntries={['/clinical/orders']}>
        <OrdersPage />
      </MemoryRouter>
    )

    expect(screen.getByText(/Pathology & X-ray Orders/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Select Patient Record/i })).toHaveAttribute('href', '/patients')
    expect(screen.getByRole('link', { name: /Open Sample Patient X-rays/i })).toHaveAttribute('href', '/patients/pt-1001?tab=documents')
    unmountOrders()

    const { unmount: unmountEstimates } = render(
      <MemoryRouter initialEntries={['/clinical/estimates']}>
        <TreatmentEstimatesPage />
      </MemoryRouter>
    )

    expect(screen.getByText(/Treatment Cost Estimates/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Open Treatment Plans/i })).toHaveAttribute('href', '/clinical/treatment-plans')
    unmountEstimates()

    const { unmount: unmountPlans } = render(
      <MemoryRouter initialEntries={['/clinical/treatment-plans']}>
        <TreatmentPlansPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('link', { name: /Cost Estimates/i })).toHaveAttribute('href', '/clinical/estimates')
    unmountPlans()
  })

  // 6. CLINICAL CONFIGURATION PAGE RENDERS MASTER LISTS AND TEMPLATES
  it('renders Clinical Configuration with medication formulary, procedure codes, and templates', () => {
    render(
      <MemoryRouter initialEntries={['/settings/clinical-config']}>
        <ClinicalConfigPage />
      </MemoryRouter>
    )

    expect(screen.getByText(/Clinical Configuration/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Medication Formulary/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Procedure Catalogue/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Diagnoses & ICD/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Clinical Note Templates/i })).toBeInTheDocument()

    // Check sample dental medication
    expect(screen.getByText(/Amoxicillin 500mg/i)).toBeInTheDocument()
  })
})
