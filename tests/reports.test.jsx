import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '@/App'
import { resetStoreForTesting, createItemisedInvoice, addTreatmentPlan, registerPatient } from '@/services/clinicStore'

const renderAt = (url) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <App />
    </MemoryRouter>
  )

describe('Reports workspace', () => {
  beforeEach(() => {
    sessionStorage.clear()
    sessionStorage.setItem('docmatrix-demo-session', 'usr-101')
    resetStoreForTesting()
  })

  it('is one sidebar link with the four report tabs and no dues/expense reports', async () => {
    renderAt('/reports')
    expect(await screen.findByTestId('feature-page-rep.revenue', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByTestId('sidebar-link-area-reports')).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByTestId('sidebar-link-rep.revenue')).not.toBeInTheDocument()

    const tabs = screen.getByRole('navigation', { name: 'Report sections' })
    for (const name of ['Revenue', 'Doctors', 'Treatments', 'Follow-ups & bookings']) {
      expect(within(tabs).getByRole('button', { name })).toBeInTheDocument()
    }
    expect(within(tabs).queryByRole('button', { name: /dues|expense|conversion/i })).not.toBeInTheDocument()
  })

  it('reports money collected in the chosen period', async () => {
    createItemisedInvoice({
      patientId: 'pt-1001',
      items: [{ id: 'a', name: 'Scaling', qty: 1, unitPrice: 1200, discount: 0, gstRate: 0 }],
      upfrontPayment: { amount: 700, mode: 'Cash' }
    })
    renderAt('/reports/revenue?range=today')
    const page = await screen.findByTestId('feature-page-rep.revenue', {}, { timeout: 4000 })
    const collected = within(page).getByText('Collected').closest('.rpt-tile')
    expect(collected).toHaveTextContent('₹700')
    expect(within(page).getByText('How patients paid')).toBeInTheDocument()
  })

  it('keeps the selected period when switching tabs', async () => {
    renderAt('/reports/revenue?range=7d')
    const tabs = await screen.findByRole('navigation', { name: 'Report sections' }, { timeout: 4000 })
    expect(screen.getByRole('button', { name: 'Last 7 days' })).toHaveClass('is-on')
    fireEvent.click(within(tabs).getByRole('button', { name: 'Doctors' }))
    expect(await screen.findByTestId('feature-page-rep.doctors', {}, { timeout: 4000 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Last 7 days' })).toHaveClass('is-on')
  })

  it('lists patients with unfinished treatment and no booked visit', async () => {
    // A new patient with an accepted plan and no visit booked
    const patient = registerPatient({
      firstName: 'Anil', lastName: 'Varma', age: '41', dateOfBirth: '1985-02-01', gender: 'male', mobile: '9876500000', countryCode: '+91',
      email: '', language: 'English', city: 'Kochi', state: 'Kerala', postalCode: '682001', address: '', emergencyName: '', emergencyPhone: '',
      relationship: '', allergies: 'no', allergiesDetails: '', medications: 'no', medicationsDetails: '', conditions: 'no', conditionsDetails: ''
    })
    addTreatmentPlan({ patientId: patient.id, procedure: 'Composite filling', category: 'Restorative', toothNumber: '36', status: 'Accepted', cost: 1800, doctor: 'Dr. Arun Kumar' })

    renderAt('/reports/follow-ups')
    const page = await screen.findByTestId('feature-page-rep.followups', {}, { timeout: 4000 })
    expect(within(page).getByRole('heading', { name: 'Patients to contact' })).toBeInTheDocument()
    expect(within(page).getByRole('link', { name: `${patient.firstName} ${patient.lastName}` })).toBeInTheDocument()
    expect(within(page).getByText(/Composite filling \(tooth 36\)/)).toBeInTheDocument()
    expect(within(page).getByRole('link', { name: /Book/ })).toHaveAttribute('href', `/appointments/new?patientId=${patient.id}`)
  })

  it('shows patients needing action and visit outcomes on one tab, and old links still work', async () => {
    renderAt('/reports/booking-conversion?range=90d')
    const page = await screen.findByTestId('feature-page-rep.followups', {}, { timeout: 4000 })
    expect(within(page).getByRole('heading', { name: 'Patients to contact' })).toBeInTheDocument()
    expect(within(page).getByRole('heading', { name: 'How visits went' })).toBeInTheDocument()
    expect(within(page).getByText('Attended')).toBeInTheDocument()
    expect(within(page).getByRole('heading', { name: /Busiest days/ })).toBeInTheDocument()
    // The selected period survives the redirect
    expect(screen.getByRole('button', { name: 'Last 90 days' })).toHaveClass('is-on')
  })

  it('sends old dues and income-vs-expense links somewhere useful', async () => {
    const first = renderAt('/reports/income-expense')
    expect(await screen.findByTestId('feature-page-rep.revenue', {}, { timeout: 4000 })).toBeInTheDocument()
    first.unmount()
    renderAt('/reports/dues-ageing')
    expect(await screen.findByTestId('feature-page-bill.dues', {}, { timeout: 4000 })).toBeInTheDocument()
  })
})
