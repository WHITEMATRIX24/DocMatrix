import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import ClinicProfilePage from '@/pages/settings/ClinicProfilePage'
import StaffManagementPage from '@/pages/settings/StaffManagementPage'
import ClinicalConfigPage from '@/pages/settings/ClinicalConfigPage'
import SecurityPage from '@/pages/settings/SecurityPage'
import PrivacySettingsPage from '@/pages/settings/PrivacySettingsPage'
import DataExchangePage from '@/pages/settings/DataExchangePage'
import ActivityLogPage from '@/pages/settings/ActivityLogPage'
import PlanSubscriptionPage from '@/pages/settings/PlanSubscriptionPage'
import { apiClient } from '@/services/apiClient'

describe('DocMatrix — Complete Settings & Configuration Module Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    vi.clearAllMocks()
  })

  it('1. ClinicProfilePage renders identity, address, tax details, and letterhead preview', async () => {
    render(
      <MemoryRouter>
        <ClinicProfilePage />
      </MemoryRouter>
    )

    expect(screen.getByText(/Clinic Profile & Letterhead/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue(/DocMatrix Dental Care/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue(/Bengaluru/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue(/29ABCDE1234F1Z5/i)).toBeInTheDocument()

    // Test Letterhead Preview Toggle
    const previewBtn = screen.getByRole('button', { name: /Letterhead Preview/i })
    expect(previewBtn).toBeInTheDocument()
    fireEvent.click(previewBtn)

    expect(screen.getByText(/Letterhead Preview \(Appears on Invoices & Prescriptions\)/i)).toBeInTheDocument()
  })

  it('2. StaffManagementPage renders practitioner team, search, role filters, and add modal', async () => {
    vi.spyOn(apiClient, 'get').mockImplementation(async path => path.endsWith('/roles') ? [{ value: 'DOCTOR', label: 'Dentist / Practitioner' }] : [])
    render(
      <MemoryRouter>
        <StaffManagementPage />
      </MemoryRouter>
    )

    expect(screen.getByText(/Staff & Practitioner Management/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Search by name, email, or phone/i)).toBeInTheDocument()

    const addStaffBtn = screen.getByRole('button', { name: /Add Staff Member/i })
    expect(addStaffBtn).toBeInTheDocument()
    await waitFor(() => expect(addStaffBtn).toBeEnabled())
    fireEvent.click(addStaffBtn)

    expect(screen.getByRole('heading', { name: /Add New Staff Member/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Minimum 12 characters/i)).toBeInTheDocument()
  })

  it('3. ClinicalConfigPage renders master picklists, tabs, and custom item creation', async () => {
    render(
      <MemoryRouter>
        <ClinicalConfigPage />
      </MemoryRouter>
    )

    expect(screen.getByText(/Clinical Configuration & Master Lists/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Medication Formulary/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Procedure Catalogue/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Diagnoses & ICD/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Clinical Note Templates/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Clinical Governance/i })).toBeInTheDocument()

    // Procedure Catalogue Tab
    fireEvent.click(screen.getByRole('button', { name: /Procedure Catalogue/i }))
    expect(screen.getByText(/Periodic Oral Evaluation/i)).toBeInTheDocument()
    expect(screen.getByText(/D0120/i)).toBeInTheDocument()

    // Add Custom Procedure Modal
    const addBtn = screen.getByRole('button', { name: /Add Custom Procedure/i })
    fireEvent.click(addBtn)
    expect(screen.getByRole('heading', { name: /Add Custom Procedure/i })).toBeInTheDocument()
  })

  it('4. SecurityPage renders password update, active verified device, and Neon PITR backup', async () => {
    render(
      <MemoryRouter>
        <SecurityPage />
      </MemoryRouter>
    )

    expect(screen.getByText(/Security & Device Verification/i)).toBeInTheDocument()
    expect(screen.getByText(/Change Password/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Enter current password/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Re-enter new password/i)).toBeInTheDocument()

    expect(screen.getByText(/Neon Continuous PITR/i)).toBeInTheDocument()
    expect(screen.getByText(/Active Session & Verified Devices/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Terminate All Other Sessions/i })).toBeInTheDocument()
  })

  it('5. PrivacySettingsPage renders statutory consent templates and DPDP portability export', async () => {
    render(
      <MemoryRouter>
        <PrivacySettingsPage />
      </MemoryRouter>
    )

    expect(screen.getByText(/Privacy, Consent & Data Protection Controls/i)).toBeInTheDocument()
    expect(screen.getByText(/Digital Personal Data Protection \(DPDP\) Act 2023/i)).toBeInTheDocument()
    expect(screen.getByText(/General Dental Examination & Preventive Care Consent/i)).toBeInTheDocument()
    expect(screen.getByText(/Informed Consent for Endodontic \(Root Canal\) Treatment/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Export Complete Patient Bundle \(JSON\)/i })).toBeInTheDocument()
  })

  it('6. DataExchangePage renders patient CSV export, full JSON archive, and CSV dropzone', async () => {
    render(
      <MemoryRouter>
        <DataExchangePage />
      </MemoryRouter>
    )

    expect(screen.getByText(/Data Export & Batch Import/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Export Patients \(\.CSV\)/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Download Full Archive \(\.JSON\)/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sample Template/i })).toBeInTheDocument()
    expect(screen.getByText(/Click to select patient CSV file/i)).toBeInTheDocument()
  })

  it('7. ActivityLogPage renders unified audit events, module filters, and CSV export', async () => {
    render(
      <MemoryRouter>
        <ActivityLogPage />
      </MemoryRouter>
    )

    expect(screen.getByText(/Clinic Activity & Audit Log/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Export Log \(CSV\)/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Search by action, doctor, patient, or notes/i)).toBeInTheDocument()
  })

  it('8. PlanSubscriptionPage renders plan status card and available clinical tiers', async () => {
    render(
      <MemoryRouter>
        <PlanSubscriptionPage />
      </MemoryRouter>
    )

    expect(screen.getByText(/Plans & Subscription Management/i)).toBeInTheDocument()
    expect(screen.getByText(/DocMatrix Solo Practice Edition/i)).toBeInTheDocument()
    expect(screen.getByText(/Available Clinical Editions/i)).toBeInTheDocument()
  })

  it('9. All eight settings pages adapt cleanly under dark mode [data-theme="dark"]', async () => {
    document.documentElement.dataset.theme = 'dark'
    document.documentElement.style.colorScheme = 'dark'

    const pages = [
      <ClinicProfilePage key="clinic" />,
      <StaffManagementPage key="staff" />,
      <ClinicalConfigPage key="config" />,
      <SecurityPage key="security" />,
      <PrivacySettingsPage key="privacy" />,
      <DataExchangePage key="data" />,
      <ActivityLogPage key="activity" />,
      <PlanSubscriptionPage key="plan" />
    ]

    for (const page of pages) {
      const { container, unmount } = render(
        <MemoryRouter>
          {page}
        </MemoryRouter>
      )
      const root = container.querySelector('[data-testid^="feature-page-set."]')
      expect(root).toBeInTheDocument()
      unmount()
    }

    // Reset theme
    document.documentElement.dataset.theme = 'light'
    document.documentElement.style.colorScheme = 'light'
  })
})

