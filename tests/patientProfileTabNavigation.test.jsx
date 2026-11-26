import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '@/App'
import { seedClinicFixture } from './fixtures/clinic'

const renderAt = (url) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <App />
    </MemoryRouter>
  )

describe('Patient Profile Tab Navigation & Grouped Layout', () => {
  beforeEach(() => {
    seedClinicFixture()
  })

  it('renders exactly the 6 simplified main navigation tabs in order', async () => {
    renderAt('/patients/pt-1001')

    const tabsNav = await screen.findByRole('navigation', { name: /Patient Profile Sections/i }, { timeout: 10000 })
    expect(tabsNav).toBeInTheDocument()

    const tabButtons = within(tabsNav).getAllByRole('button')
    expect(tabButtons).toHaveLength(6)

    expect(tabButtons[0]).toHaveTextContent(/Overview/i)
    expect(tabButtons[1]).toHaveTextContent(/Medical History/i)
    expect(tabButtons[2]).toHaveTextContent(/Clinical/i)
    expect(tabButtons[3]).toHaveTextContent(/Billing/i)
    expect(tabButtons[4]).toHaveTextContent(/Documents/i)
    expect(tabButtons[5]).toHaveTextContent(/Activity/i)

    // Verify Overview is active by default
    expect(tabButtons[0]).toHaveClass('is-active')
  })

  it('displays 3 secondary tabs inside Clinical and switches among Prescriptions, Clinical Notes, and Treatment Plans', async () => {
    renderAt('/patients/pt-1001')

    const clinicalTab = await screen.findByTestId('tab-clinical', {}, { timeout: 10000 })
    fireEvent.click(clinicalTab)

    // Verify Clinical is active
    expect(clinicalTab).toHaveClass('is-active')

    // Sub-navigation bar appears with 3 secondary tabs
    const subNav = screen.getByRole('tablist', { name: /Clinical Sections/i })
    expect(subNav).toBeInTheDocument()

    const rxSubTab = screen.getByTestId('tab-prescriptions')
    const notesSubTab = screen.getByTestId('tab-clinical-notes')
    const plansSubTab = screen.getByTestId('tab-treatment-plans')

    expect(rxSubTab).toBeInTheDocument()
    expect(notesSubTab).toBeInTheDocument()
    expect(plansSubTab).toBeInTheDocument()

    // Default clinical subtab is Prescriptions
    expect(rxSubTab).toHaveClass('is-active')
    expect(screen.getByRole('heading', { name: /Clinical Prescriptions History/i })).toBeInTheDocument()

    // Click Clinical Notes subtab
    fireEvent.click(notesSubTab)
    expect(notesSubTab).toHaveClass('is-active')
    expect(rxSubTab).not.toHaveClass('is-active')
    expect(screen.getByRole('heading', { name: /Clinical Consultation Notes/i })).toBeInTheDocument()

    // Click Treatment Plans subtab
    fireEvent.click(plansSubTab)
    expect(plansSubTab).toHaveClass('is-active')
    expect(notesSubTab).not.toHaveClass('is-active')
    expect(screen.getByTestId('patient-treatment-plans-section')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Treatment Plans & Integrated Cost Estimates/i })).toBeInTheDocument()
  })

  it('displays 2 secondary tabs inside Documents and switches between X-rays & Documents and Consent Records', async () => {
    renderAt('/patients/pt-1001')

    const docsTab = await screen.findByTestId('tab-documents-main', {}, { timeout: 10000 })
    fireEvent.click(docsTab)

    expect(docsTab).toHaveClass('is-active')

    // Sub-navigation bar appears with 2 secondary tabs
    const subNav = screen.getByRole('tablist', { name: /Documents Sections/i })
    expect(subNav).toBeInTheDocument()

    const xraysSubTab = screen.getByTestId('tab-documents')
    const consentsSubTab = screen.getByTestId('tab-consents')

    expect(xraysSubTab).toBeInTheDocument()
    expect(consentsSubTab).toBeInTheDocument()

    // Default is X-rays & Documents
    expect(xraysSubTab).toHaveClass('is-active')
    expect(screen.getByRole('heading', { name: /Diagnostic Records & Radiographs/i })).toBeInTheDocument()

    // Click Consent Records subtab
    fireEvent.click(consentsSubTab)
    expect(consentsSubTab).toHaveClass('is-active')
    expect(xraysSubTab).not.toHaveClass('is-active')
    expect(screen.getByRole('heading', { name: /Informed Consent & Regulatory Records/i })).toBeInTheDocument()
  })

  it('preserves the active subtab when switching away and returning to Clinical or Documents', async () => {
    renderAt('/patients/pt-1001')

    // Navigate to Clinical -> Treatment Plans
    const clinicalTab = await screen.findByTestId('tab-clinical', {}, { timeout: 10000 })
    fireEvent.click(clinicalTab)
    const plansSubTab = screen.getByTestId('tab-treatment-plans')
    fireEvent.click(plansSubTab)
    expect(screen.getByTestId('patient-treatment-plans-section')).toBeInTheDocument()

    // Switch to Billing
    const billingTab = screen.getByTestId('tab-billing')
    fireEvent.click(billingTab)
    expect(billingTab).toHaveClass('is-active')
    expect(screen.getByRole('heading', { name: /Billing/i })).toBeInTheDocument()

    // Return to Clinical -> should remember Treatment Plans as active subtab
    fireEvent.click(clinicalTab)
    expect(clinicalTab).toHaveClass('is-active')
    expect(screen.getByTestId('tab-treatment-plans')).toHaveClass('is-active')
    expect(screen.getByTestId('patient-treatment-plans-section')).toBeInTheDocument()
  })

  it('supports deep linking to ?tab=notes, ?tab=plans, and ?tab=consents', async () => {
    // 1. Deep link to notes
    const { unmount: unmount1 } = renderAt('/patients/pt-1001?tab=notes')
    expect(await screen.findByRole('heading', { name: /Clinical Consultation Notes/i }, { timeout: 10000 })).toBeInTheDocument()
    expect(screen.getByTestId('tab-clinical')).toHaveClass('is-active')
    expect(screen.getByTestId('tab-clinical-notes')).toHaveClass('is-active')
    unmount1()

    // 2. Deep link to plans
    const { unmount: unmount2 } = renderAt('/patients/pt-1001?tab=plans')
    expect(await screen.findByTestId('patient-treatment-plans-section', {}, { timeout: 10000 })).toBeInTheDocument()
    expect(screen.getByTestId('tab-clinical')).toHaveClass('is-active')
    expect(screen.getByTestId('tab-treatment-plans')).toHaveClass('is-active')
    unmount2()

    // 3. Deep link to consents
    const { unmount: unmount3 } = renderAt('/patients/pt-1001?tab=consents')
    expect(await screen.findByRole('heading', { name: /Informed Consent & Regulatory Records/i }, { timeout: 10000 })).toBeInTheDocument()
    expect(screen.getByTestId('tab-documents-main')).toHaveClass('is-active')
    expect(screen.getByTestId('tab-consents')).toHaveClass('is-active')
    unmount3()
  })
})
