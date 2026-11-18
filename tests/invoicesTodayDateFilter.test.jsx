import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { InvoicesPage } from '@/pages/billing/InvoicesPage'
import { localDate } from '@/pages/billing/BillingShared'
import * as clinicStore from '@/services/clinicStore'

describe('InvoicesPage Today Tab and Date Picker', () => {
  const todayStr = localDate()
  const pastDateStr = '2026-11-10'

  const mockPatients = [
    {
      id: 'PAT-101',
      firstName: 'Rahul',
      lastName: 'Nair',
      mobile: '9876543210',
    },
    {
      id: 'PAT-102',
      firstName: 'Ananya',
      lastName: 'Sharma',
      mobile: '9876543211',
    },
  ]

  const mockInvoices = [
    {
      id: 'INV-TODAY-01',
      patientId: 'PAT-101',
      description: 'Surgical Wisdom Tooth Removal',
      amount: 5000,
      status: 'Unpaid',
      createdAt: `${todayStr}T09:30:00.000Z`,
      payments: [],
      items: [
        {
          id: '1',
          name: 'Surgical Wisdom Tooth Removal',
          qty: 1,
          unitPrice: 5000,
          discount: 0,
          gstRate: 0,
          toothNumber: '38',
        },
      ],
    },
    {
      id: 'INV-TODAY-02',
      patientId: 'PAT-102',
      description: 'Comprehensive Dental Examination',
      amount: 500,
      status: 'Paid',
      createdAt: `${todayStr}T11:00:00.000Z`,
      payments: [{ id: 'PAY-1', amount: 500, mode: 'UPI', receivedAt: `${todayStr}T11:05:00.000Z` }],
      items: [
        {
          id: '2',
          name: 'Comprehensive Dental Examination',
          qty: 1,
          unitPrice: 500,
          discount: 0,
          gstRate: 0,
        },
      ],
    },
    {
      id: 'INV-PAST-01',
      patientId: 'PAT-101',
      description: 'Ultrasonic Scaling & Polishing',
      amount: 1200,
      status: 'Unpaid',
      createdAt: `${pastDateStr}T14:00:00.000Z`,
      payments: [],
      items: [
        {
          id: '3',
          name: 'Ultrasonic Scaling & Polishing',
          qty: 1,
          unitPrice: 1200,
          discount: 0,
          gstRate: 0,
        },
      ],
    },
  ]

  beforeEach(() => {
    vi.spyOn(clinicStore, 'useClinicData').mockReturnValue({
      patients: mockPatients,
      invoices: mockInvoices,
      appointments: [],
      clinicalNotes: [],
      treatmentPlans: [],
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders all invoices by default in All view', () => {
    render(
      <MemoryRouter>
        <InvoicesPage />
      </MemoryRouter>
    )

    // All 3 invoices should appear
    expect(screen.getByText('INV-TODAY-01')).toBeInTheDocument()
    expect(screen.getByText('INV-TODAY-02')).toBeInTheDocument()
    expect(screen.getByText('INV-PAST-01')).toBeInTheDocument()
  })

  it('filters to today only when Today tab is clicked', () => {
    render(
      <MemoryRouter>
        <InvoicesPage />
      </MemoryRouter>
    )

    const todayTab = screen.getByRole('tab', { name: /today/i })
    fireEvent.click(todayTab)

    // Only today's invoices should be visible
    expect(screen.getByText('INV-TODAY-01')).toBeInTheDocument()
    expect(screen.getByText('INV-TODAY-02')).toBeInTheDocument()
    expect(screen.queryByText('INV-PAST-01')).not.toBeInTheDocument()
  })

  it('filters to a specific date when selected using the date picker', () => {
    render(
      <MemoryRouter>
        <InvoicesPage />
      </MemoryRouter>
    )

    const datePicker = screen.getByLabelText(/select invoice date/i)
    fireEvent.change(datePicker, { target: { value: pastDateStr } })

    // Only the invoice from pastDateStr should be visible
    expect(screen.getByText('INV-PAST-01')).toBeInTheDocument()
    expect(screen.queryByText('INV-TODAY-01')).not.toBeInTheDocument()
    expect(screen.queryByText('INV-TODAY-02')).not.toBeInTheDocument()
  })

  it('provides an option to return to Today when a specific date is active', () => {
    render(
      <MemoryRouter>
        <InvoicesPage />
      </MemoryRouter>
    )

    const datePicker = screen.getByLabelText(/select invoice date/i)
    fireEvent.change(datePicker, { target: { value: pastDateStr } })

    // "Return to Today" buttons should be visible
    const returnTodayButtons = screen.getAllByRole('button', { name: /return to today/i })
    expect(returnTodayButtons.length).toBeGreaterThan(0)

    // Click Return to Today
    fireEvent.click(returnTodayButtons[0])

    // Should return to today's invoices
    expect(screen.getByText('INV-TODAY-01')).toBeInTheDocument()
    expect(screen.getByText('INV-TODAY-02')).toBeInTheDocument()
    expect(screen.queryByText('INV-PAST-01')).not.toBeInTheDocument()
  })

  it('preserves status filters in combination with date filtering', () => {
    render(
      <MemoryRouter>
        <InvoicesPage />
      </MemoryRouter>
    )

    // Click Today tab
    const todayTab = screen.getByRole('tab', { name: /today/i })
    fireEvent.click(todayTab)

    // Click Paid status filter
    const paidFilter = screen.getByRole('button', { name: /^paid$/i })
    fireEvent.click(paidFilter)

    // Only INV-TODAY-02 is Paid today
    expect(screen.getByText('INV-TODAY-02')).toBeInTheDocument()
    expect(screen.queryByText('INV-TODAY-01')).not.toBeInTheDocument()
    expect(screen.queryByText('INV-PAST-01')).not.toBeInTheDocument()

    // Click Unpaid status filter
    const unpaidFilter = screen.getByRole('button', { name: /^unpaid$/i })
    fireEvent.click(unpaidFilter)

    // Only INV-TODAY-01 is Unpaid today
    expect(screen.getByText('INV-TODAY-01')).toBeInTheDocument()
    expect(screen.queryByText('INV-TODAY-02')).not.toBeInTheDocument()
  })

  it('preserves search query filtering in combination with date filtering', () => {
    render(
      <MemoryRouter>
        <InvoicesPage />
      </MemoryRouter>
    )

    // Click Today tab
    const todayTab = screen.getByRole('tab', { name: /today/i })
    fireEvent.click(todayTab)

    // Search for "Rahul"
    const searchInput = screen.getByPlaceholderText(/search patient/i)
    fireEvent.change(searchInput, { target: { value: 'Rahul' } })

    expect(screen.getByText('INV-TODAY-01')).toBeInTheDocument()
    expect(screen.queryByText('INV-TODAY-02')).not.toBeInTheDocument()
  })

  it('opens InvoiceDrawer when an invoice row is clicked', () => {
    render(
      <MemoryRouter>
        <InvoicesPage />
      </MemoryRouter>
    )

    const row = screen.getByText('INV-TODAY-01').closest('tr')
    fireEvent.click(row)

    // The drawer for INV-TODAY-01 should open
    const drawer = screen.getByRole('dialog', { name: /invoice inv-today-01/i })
    expect(drawer).toBeInTheDocument()
    expect(within(drawer).getByText('Surgical Wisdom Tooth Removal')).toBeInTheDocument()
  })
})
