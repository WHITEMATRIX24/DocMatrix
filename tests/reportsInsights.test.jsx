import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '@/App'
import { resetStoreForTesting, createItemisedInvoice, addTreatmentPlan, registerPatient } from '@/services/clinicStore'
import { isRecentlyContacted, resetContactLogForTesting } from '@/services/followUpStore'
import { computePeriod, contactList, pendingTreatmentPatients, recallDuePatients, missedVisitsToRebook } from '@/pages/reports/reportMetrics'
import { previousSpan, resolveRange, canRoleSeeMoney } from '@/pages/reports/ReportsShared'

const renderAt = (url) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <App />
    </MemoryRouter>
  )

const appt = (over) => ({ id: over.id || `a-${Math.random()}`, patientId: 'p1', doctor: 'Dr. A', visitType: 'Check-up', date: '2026-10-10', time: '10:00', status: 'completed', createdAt: '2026-01-01', ...over })
const plan = (over) => ({ id: `t-${Math.random()}`, patientId: 'p1', procedure: 'Filling', category: 'Restorative', status: 'Accepted', cost: 1000, doctor: 'Dr. A', date: '2026-10-01', ...over })
const data = (over) => ({ patients: [], appointments: [], invoices: [], treatmentPlans: [], ...over })

describe('Report calculations', () => {
  it('splits new and returning patients by their first completed visit', () => {
    const d = data({
      appointments: [
        appt({ patientId: 'old', date: '2026-01-05' }),
        appt({ patientId: 'old', date: '2026-10-10' }),
        appt({ patientId: 'fresh', date: '2026-10-11' }),
        appt({ patientId: 'gone', date: '2026-10-12', status: 'no-show' })
      ]
    })
    const m = computePeriod(d, { from: '2026-10-01', to: '2026-10-31' })
    expect(m.patientsTreated).toBe(2)
    expect(m.newPatients).toBe(1)
    expect(m.returningPatients).toBe(1)
    expect(m.noShows).toBe(1)
    expect(m.attendedPct).toBe(67) // 2 attended of 3 with an outcome
  })

  it('finds recall patients: 6+ months away, nothing booked, no unfinished treatment', () => {
    const today = '2026-11-04'
    const patients = ['away', 'recent', 'booked', 'treating', 'never'].map((id) => ({ id, firstName: id, lastName: 'X' }))
    const d = data({
      patients,
      appointments: [
        appt({ patientId: 'away', date: '2026-03-01' }),
        appt({ patientId: 'recent', date: '2026-10-01' }),
        appt({ patientId: 'booked', date: '2026-03-01' }),
        appt({ patientId: 'booked', date: '2026-11-20', status: 'scheduled' }),
        appt({ patientId: 'treating', date: '2026-03-01' })
      ],
      treatmentPlans: [plan({ patientId: 'treating' })]
    })
    expect(recallDuePatients(d, today).map((r) => r.patient.id)).toEqual(['away'])
    // The patient with unfinished treatment is on the follow-up list instead, so nobody appears twice
    expect(pendingTreatmentPatients(d, today).map((r) => r.patientId)).toEqual(['treating'])
  })

  it('only lists a missed visit when nothing later has been booked', () => {
    const d = data({
      appointments: [
        appt({ id: 'lost', patientId: 'p1', date: '2026-10-05', status: 'no-show' }),
        appt({ id: 'rebooked', patientId: 'p2', date: '2026-10-05', status: 'cancelled' }),
        appt({ patientId: 'p2', date: '2026-10-20', status: 'scheduled' })
      ]
    })
    expect(missedVisitsToRebook(d, { from: '2026-10-01', to: '2026-10-31' }).map((a) => a.id)).toEqual(['lost'])
  })

  it('builds one call-list row per patient, with every reason, most urgent first', () => {
    const today = '2026-11-04'
    const patients = ['both', 'plan', 'away'].map((id) => ({ id, firstName: id, lastName: 'X' }))
    const d = data({
      patients,
      appointments: [
        appt({ patientId: 'both', date: '2026-10-20', status: 'no-show' }),
        appt({ patientId: 'away', date: '2026-02-01' })
      ],
      treatmentPlans: [plan({ patientId: 'both', cost: 500 }), plan({ patientId: 'plan', cost: 900 })]
    })
    const rows = contactList(d, { from: '2026-10-01', to: today }, today)
    expect(rows.map((r) => r.patientId)).toEqual(['both', 'plan', 'away'])
    expect(rows[0].reasons).toEqual(['missed', 'unfinished'])
    expect(rows[1].reasons).toEqual(['unfinished'])
    expect(rows[2].reasons).toEqual(['recall'])
  })

  it('keeps a contacted patient off the list for 7 days only', () => {
    const now = new Date('2026-11-10T10:00:00').getTime()
    expect(isRecentlyContacted(undefined, now)).toBe(false)
    expect(isRecentlyContacted(new Date('2026-11-05T10:00:00').toISOString(), now)).toBe(true)
    expect(isRecentlyContacted(new Date('2026-11-01T10:00:00').toISOString(), now)).toBe(false)
  })

  it('compares with the days just before, and with the same days last month for "This month"', () => {
    const custom = resolveRange('custom', '2026-10-11', '2026-10-20')
    expect(previousSpan(custom)).toEqual({ from: '2026-10-01', to: '2026-10-10' })
    expect(custom.compareLabel).toBe('the previous 10 days')

    // 31 March has no equivalent in February: clamp to the last day
    const march = { key: 'month', from: '2026-03-01', to: '2026-03-31', days: 31 }
    expect(previousSpan(march)).toEqual({ from: '2026-02-01', to: '2026-02-28' })
    const january = { key: 'month', from: '2027-01-01', to: '2027-01-15', days: 15 }
    expect(previousSpan(january)).toEqual({ from: '2026-12-01', to: '2026-12-15' })
  })

  it('limits money to owners, managers and accountants', () => {
    for (const role of ['ORGANIZATION_ADMIN', 'BRANCH_ADMIN', 'ACCOUNTANT']) expect(canRoleSeeMoney(role)).toBe(true)
    for (const role of ['RECEPTIONIST', 'DOCTOR', 'NURSE', 'LAB_TECHNICIAN', 'PHARMACIST']) expect(canRoleSeeMoney(role)).toBe(false)
  })

  it('excludes Void invoices from billed and unpaid totals in computePeriod', () => {
    const d = data({
      invoices: [
        { id: 'INV-1', patientId: 'p1', createdAt: '2026-10-10', service: 'RCT', amount: 4000, status: 'Partial', payments: [{ id: 'pm1', amount: 1500, mode: 'Cash', receivedAt: '2026-10-10' }] },
        { id: 'INV-2', patientId: 'p1', createdAt: '2026-10-12', service: 'Crown', amount: 6000, status: 'Void', payments: [{ id: 'pm2', amount: 2000, mode: 'UPI', receivedAt: '2026-10-12' }] }
      ]
    })
    const m = computePeriod(d, { from: '2026-10-01', to: '2026-10-31' })
    expect(m.billed).toBe(4000)
    expect(m.collected).toBe(1500)
    expect(m.unpaid).toBe(2500)
  })
})

describe('Reports for an owner', () => {
  beforeEach(() => {
    sessionStorage.clear()
    sessionStorage.setItem('docmatrix-demo-session', 'usr-101')
    resetStoreForTesting()
  })

  it('compares each figure with the previous period, with no summary banner', async () => {
    createItemisedInvoice({
      patientId: 'pt-1001',
      items: [{ id: 'a', name: 'Scaling', qty: 1, unitPrice: 1200, discount: 0, gstRate: 0 }],
      upfrontPayment: { amount: 700, mode: 'Cash' }
    })
    renderAt('/reports/revenue?range=today')
    const page = await screen.findByTestId('feature-page-rep.revenue', {}, { timeout: 4000 })
    expect(within(page).getByText('Collected').closest('.rpt-tile')).toHaveTextContent('Up from ₹0 yesterday')
    expect(screen.queryByRole('region', { name: 'Summary for this period' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Share on WhatsApp/ })).not.toBeInTheDocument()
  })
})

describe('Call list', () => {
  beforeEach(() => {
    sessionStorage.clear()
    sessionStorage.setItem('docmatrix-demo-session', 'usr-103')
    resetStoreForTesting()
    resetContactLogForTesting()
  })

  it('moves a patient to Contacted, can undo, and prefills a WhatsApp message', async () => {
    const patient = registerPatient({
      firstName: 'Anil', lastName: 'Varma', age: '41', dateOfBirth: '1985-02-01', gender: 'male', mobile: '9876500000', countryCode: '+91',
      email: '', language: 'English', city: '', state: '', postalCode: '', address: '', emergencyName: '', emergencyPhone: '',
      relationship: '', allergies: 'no', allergiesDetails: '', medications: 'no', medicationsDetails: '', conditions: 'no', conditionsDetails: ''
    })
    addTreatmentPlan({ patientId: patient.id, procedure: 'Composite filling', category: 'Restorative', toothNumber: '36', status: 'Accepted', cost: 1800, doctor: 'Dr. Arun Kumar' })

    renderAt('/reports/follow-ups')
    const page = await screen.findByTestId('feature-page-rep.followups', {}, { timeout: 4000 })
    const whatsapp = within(page).getByRole('link', { name: 'WhatsApp Anil' })
    expect(whatsapp.getAttribute('href')).toContain('https://wa.me/919876500000?text=')
    expect(decodeURIComponent(whatsapp.getAttribute('href'))).toContain('Hello Anil')

    fireEvent.click(within(page).getByRole('button', { name: 'Mark Anil as contacted' }))
    expect(within(page).queryByRole('link', { name: 'Anil Varma' })).not.toBeInTheDocument()

    fireEvent.click(within(page).getByRole('button', { name: /^Contacted/ }))
    expect(within(page).getByRole('link', { name: 'Anil Varma' })).toBeInTheDocument()

    fireEvent.click(within(page).getByRole('button', { name: 'Undo contacted for Anil' }))
    expect(within(page).queryByRole('link', { name: 'Anil Varma' })).not.toBeInTheDocument()
    fireEvent.click(within(page).getByRole('button', { name: /^All/ }))
    expect(within(page).getByRole('link', { name: 'Anil Varma' })).toBeInTheDocument()
  })
})

describe('Reports for a receptionist', () => {
  beforeEach(() => {
    sessionStorage.clear()
    sessionStorage.setItem('docmatrix-demo-session', 'usr-103')
    resetStoreForTesting()
  })

  it('opens on Follow-ups and shows no clinic money', async () => {
    renderAt('/reports')
    const page = await screen.findByTestId('feature-page-rep.followups', {}, { timeout: 4000 })
    const tabs = screen.getByRole('navigation', { name: 'Report sections' })
    expect(within(tabs).queryByRole('button', { name: 'Revenue' })).not.toBeInTheDocument()
    expect(within(tabs).getByRole('button', { name: 'Doctors' })).toBeInTheDocument()
    expect(page).not.toHaveTextContent('₹')
  })

  it('cannot open Revenue by typing the address', async () => {
    renderAt('/reports/revenue')
    await new Promise((r) => setTimeout(r, 300))
    expect(screen.queryByTestId('feature-page-rep.revenue')).not.toBeInTheDocument()
  })

  it('hides money on the Doctors and Treatments tabs', async () => {
    const doctors = renderAt('/reports/doctors')
    const page = await screen.findByTestId('feature-page-rep.doctors', {}, { timeout: 4000 })
    expect(page).not.toHaveTextContent('₹')
    doctors.unmount()
    renderAt('/reports/treatments?range=90d')
    const treatments = await screen.findByTestId('feature-page-rep.treatments', {}, { timeout: 4000 })
    expect(treatments).not.toHaveTextContent('₹')
  })
})
