import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '@/App'
import { resetStoreForTesting } from '@/services/clinicStore'

const renderAt = (url) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <App />
    </MemoryRouter>
  )

describe('Patient Profile Tab Navigation & Grouped Layout', () => {
  beforeEach(() => {
    sessionStorage.clear()
    sessionStorage.setItem('docmatrix-demo-session', 'usr-101')
    resetStoreForTesting()
  })

  it('renders exactly the 9 unified main navigation tabs in order', async () => {
    renderAt('/patients/pt-1001')

    const tabsNav = await screen.findByRole('navigation', { name: /Patient Profile Sections/i }, { timeout: 10000 })
    expect(tabsNav).toBeInTheDocument()

    const tabButtons = within(tabsNav).getAllByRole('button')
    expect(tabButtons).toHaveLength(9)

    expect(tabButtons[0]).toHaveTextContent(/Overview/i)
    expect(tabButtons[1]).toHaveTextContent(/Medical History/i)
    expect(tabButtons[2]).toHaveTextContent(/Activity/i)
    expect(tabButtons[3]).toHaveTextContent(/Billing/i)
    expect(tabButtons[4]).toHaveTextContent(/X-rays & Documents/i)
    expect(tabButtons[5]).toHaveTextContent(/Consent Records/i)
    expect(tabButtons[6]).toHaveTextContent(/Prescriptions/i)
    expect(tabButtons[7]).toHaveTextContent(/Clinical Notes/i)
    expect(tabButtons[8]).toHaveTextContent(/Treatment Plans/i)

    // Verify Overview is active by default
    expect(tabButtons[0]).toHaveClass('is-active')
  })

  it('switches among Prescriptions, Clinical Notes, and Treatment Plans directly', async () => {
    renderAt('/patients/pt-1001')

    const rxTab = await screen.findByTestId('tab-prescriptions', {}, { timeout: 10000 })
    const notesTab = screen.getByTestId('tab-clinical-notes')
    const plansTab = screen.getByTestId('tab-treatment-plans')

    expect(rxTab).toBeInTheDocument()
    expect(notesTab).toBeInTheDocument()
    expect(plansTab).toBeInTheDocument()

    // Click Prescriptions tab
    fireEvent.click(rxTab)
    expect(rxTab).toHaveClass('is-active')
    expect(screen.getByRole('heading', { name: /Clinical Prescriptions History/i })).toBeInTheDocument()

    // Click Clinical Notes tab
    fireEvent.click(notesTab)
    expect(notesTab).toHaveClass('is-active')
    expect(rxTab).not.toHaveClass('is-active')
    expect(screen.getByRole('heading', { name: /Clinical Consultation Notes/i })).toBeInTheDocument()

    // Click Treatment Plans tab
    fireEvent.click(plansTab)
    expect(plansTab).toHaveClass('is-active')
    expect(notesTab).not.toHaveClass('is-active')
    expect(screen.getByTestId('patient-treatment-plans-section')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Treatment Plans & Integrated Cost Estimates/i })).toBeInTheDocument()
  })

  it('switches between X-rays & Documents and Consent Records', async () => {
    renderAt('/patients/pt-1001')

    const docsTab = await screen.findByTestId('tab-documents', {}, { timeout: 10000 })
    const consentsTab = screen.getByTestId('tab-consents')

    expect(docsTab).toBeInTheDocument()
    expect(consentsTab).toBeInTheDocument()

    // Click X-rays & Documents
    fireEvent.click(docsTab)
    expect(docsTab).toHaveClass('is-active')
    expect(screen.getByRole('heading', { name: /Diagnostic Records & Radiographs/i })).toBeInTheDocument()

    // Click Consent Records
    fireEvent.click(consentsTab)
    expect(consentsTab).toHaveClass('is-active')
    expect(docsTab).not.toHaveClass('is-active')
    expect(screen.getByRole('heading', { name: /Informed Consent & Regulatory Records/i })).toBeInTheDocument()
  })

  it('preserves the active tab when switching away and returning', async () => {
    renderAt('/patients/pt-1001')

    // Navigate to Treatment Plans
    const plansTab = await screen.findByTestId('tab-treatment-plans', {}, { timeout: 10000 })
    fireEvent.click(plansTab)
    expect(screen.getByTestId('patient-treatment-plans-section')).toBeInTheDocument()
    expect(plansTab).toHaveClass('is-active')

    // Switch to Billing
    const billingTab = screen.getByTestId('tab-billing')
    fireEvent.click(billingTab)
    expect(billingTab).toHaveClass('is-active')
    expect(plansTab).not.toHaveClass('is-active')
    expect(screen.getByRole('heading', { name: /Billing/i })).toBeInTheDocument()

    // Return to Treatment Plans
    fireEvent.click(plansTab)
    expect(plansTab).toHaveClass('is-active')
    expect(billingTab).not.toHaveClass('is-active')
    expect(screen.getByTestId('patient-treatment-plans-section')).toBeInTheDocument()
  })

  it('supports deep linking to ?tab=notes, ?tab=plans, and ?tab=consents', async () => {
    // 1. Deep link to notes
    const { unmount: unmount1 } = renderAt('/patients/pt-1001?tab=notes')
    expect(await screen.findByRole('heading', { name: /Clinical Consultation Notes/i }, { timeout: 10000 })).toBeInTheDocument()
    expect(screen.getByTestId('tab-clinical-notes')).toHaveClass('is-active')
    unmount1()

    // 2. Deep link to plans
    const { unmount: unmount2 } = renderAt('/patients/pt-1001?tab=plans')
    expect(await screen.findByTestId('patient-treatment-plans-section', {}, { timeout: 10000 })).toBeInTheDocument()
    expect(screen.getByTestId('tab-treatment-plans')).toHaveClass('is-active')
    unmount2()

    // 3. Deep link to consents
    const { unmount: unmount3 } = renderAt('/patients/pt-1001?tab=consents')
    expect(await screen.findByRole('heading', { name: /Informed Consent & Regulatory Records/i }, { timeout: 10000 })).toBeInTheDocument()
    expect(screen.getByTestId('tab-consents')).toHaveClass('is-active')
    unmount3()
  })
})
