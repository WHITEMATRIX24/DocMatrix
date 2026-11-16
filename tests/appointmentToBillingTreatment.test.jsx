import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { NewInvoicePage } from '@/pages/billing/NewInvoicePage'
import { InvoicesPage } from '@/pages/billing/InvoicesPage'
import { buildAppointmentLineItem } from '@/pages/billing/BillingShared'
import * as clinicStore from '@/services/clinicStore'
import * as billingStore from '@/services/billingStore'

describe('Appointment to Billing Treatment Transfer (Calendar & Live Queue)', () => {
  const testPatient = {
    id: 'PAT-5186',
    firstName: 'Aavany',
    lastName: 'p u',
    mobile: '9845012345',
    gender: 'female',
    age: '26',
    dateOfBirth: '2000-01-01',
    address: 'Kochi',
    medicalHistory: [],
    allergies: [],
    createdAt: '2026-11-16T08:00:00.000Z',
    updatedAt: '2026-11-16T08:00:00.000Z',
  }

  const testAppointment = {
    id: 'APT-TEST-RCT',
    patientId: 'PAT-5186',
    patientName: 'Aavany p u',
    doctor: 'Dr. Tariq Antoun',
    chair: 'Chair 3',
    treatmentType: 'Root Canal Treatment (Single Sitting)',
    visitType: 'Dental procedure',
    date: '2026-11-16',
    time: '09:00',
    durationMinutes: 60,
    status: 'completed',
    priority: 'normal',
    notes: 'Single sitting RCT on tooth 16 completed without complications.',
    createdAt: '2026-11-16T08:30:00.000Z',
  }

  const mockServices = [
    {
      id: 'trt-1',
      name: 'Comprehensive Dental Examination',
      category: 'Preventive',
      price: 500,
      gstClass: 'treatment',
      active: true,
    },
    {
      id: 'trt-4',
      name: 'Root Canal Treatment (Single Sitting)',
      category: 'Endodontics',
      price: 4500,
      gstClass: 'treatment',
      active: true,
    },
    {
      id: 'trt-10',
      name: 'Laser Teeth Whitening',
      category: 'Cosmetic',
      price: 8000,
      gstClass: 'cosmetic',
      active: true,
    },
  ]

  beforeEach(() => {
    vi.spyOn(clinicStore, 'useClinicData').mockReturnValue({
      patients: [testPatient],
      appointments: [testAppointment],
      treatmentPlans: [],
      clinicalNotes: [],
      invoices: [],
      patientDocuments: [],
      patientConsents: [],
      toothCharts: [],
      enquiries: [],
      prescriptions: [],
      syncStatus: 'SUCCESS',
      syncError: null,
      lastSyncTime: new Date().toISOString(),
    })

    vi.spyOn(billingStore, 'useBillingData').mockReturnValue({
      services: mockServices,
      expenses: [],
      isLoading: false,
      error: null,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('buildAppointmentLineItem correctly retrieves treatment and pricing for Root Canal Treatment (Single Sitting)', () => {
    const result = buildAppointmentLineItem({
      appointment: testAppointment,
      services: mockServices,
    })

    expect(result).not.toBeNull()
    expect(result?.lineItem.name).toBe('Root Canal Treatment (Single Sitting)')
    expect(result?.lineItem.serviceId).toBe('trt-4')
    expect(result?.lineItem.unitPrice).toBe(4500)
    expect(result?.lineItem.qty).toBe(1)
    expect(result?.lineItem.discount).toBe(0)
    expect(result?.lineItem.gstRate).toBe(0)
    expect(result?.lineItem.toothNumber).toBe('16')
  })

  it('InvoicesPage redirects to NewInvoicePage preserving patientId and appointmentId', () => {
    render(
      <MemoryRouter initialEntries={['/billing/invoices?patientId=PAT-5186&appointmentId=APT-TEST-RCT']}>
        <Routes>
          <Route path="/billing/invoices" element={<InvoicesPage />} />
          <Route path="/billing/invoices/new" element={<div data-testid="composer-route">New Invoice Route</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId('composer-route')).toBeInTheDocument()
  })

  it('Scenario A & B: NewInvoicePage auto-populates patient, treatment, and accurate price from appointmentId', async () => {
    render(
      <MemoryRouter initialEntries={['/billing/invoices/new?patientId=PAT-5186&appointmentId=APT-TEST-RCT']}>
        <NewInvoicePage />
      </MemoryRouter>
    )

    // Patient should be selected
    const patientSelect = screen.getByRole('combobox', { name: /patient/i })
    expect(patientSelect).toHaveValue('PAT-5186')

    // Treatment line item should automatically appear with Root Canal Treatment (Single Sitting)
    const serviceInput = screen.getByPlaceholderText('Service name')
    expect(serviceInput).toHaveValue('Root Canal Treatment (Single Sitting)')

    // Rate should be 4500
    const rateInput = screen.getByLabelText('Rate')
    expect(rateInput).toHaveValue(4500)

    // Quantity should be 1
    const qtyInput = screen.getByLabelText('Quantity')
    expect(qtyInput).toHaveValue(1)

    // Tooth should be 16
    const toothInput = screen.getByLabelText('Tooth')
    expect(toothInput).toHaveValue('16')

    // Summary calculations should reflect ₹4,500
    expect(screen.getByText('Subtotal').nextSibling?.textContent).toContain('₹4,500')
    expect(screen.getByText('Total', { selector: '.bill-grand' }).nextSibling?.textContent).toContain('₹4,500')
  })

  it('Allows receptionist to edit billing details and saves invoice with linked appointmentId', async () => {
    const createSpy = vi.spyOn(clinicStore, 'createItemisedInvoice').mockReturnValue({
      id: 'INV-CREATED-1',
      patientId: 'PAT-5186',
      description: 'Root Canal Treatment (Single Sitting)',
      amount: 4000,
      status: 'Unpaid',
      createdAt: new Date().toISOString(),
      appointmentId: 'APT-TEST-RCT',
    })

    render(
      <MemoryRouter initialEntries={['/billing/invoices/new?patientId=PAT-5186&appointmentId=APT-TEST-RCT']}>
        <NewInvoicePage />
      </MemoryRouter>
    )

    // Add a discount of 500
    const discountInput = screen.getByLabelText('Discount')
    fireEvent.change(discountInput, { target: { value: '500' } })

    // Total should update to ₹4,000
    expect(screen.getByText('Discount').nextSibling?.textContent).toContain('−₹500')
    expect(screen.getByText('Total', { selector: '.bill-grand' }).nextSibling?.textContent).toContain('₹4,000')

    // Submit invoice
    const submitBtn = screen.getByRole('button', { name: /create invoice/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 'PAT-5186',
          appointmentId: 'APT-TEST-RCT',
          items: expect.arrayContaining([
            expect.objectContaining({
              name: 'Root Canal Treatment (Single Sitting)',
              unitPrice: 4500,
              discount: 500,
              qty: 1,
            }),
          ]),
        })
      )
    })
  })

  it('Does not create duplicate line items if appointment re-renders or updates', () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={['/billing/invoices/new?patientId=PAT-5186&appointmentId=APT-TEST-RCT']}>
        <NewInvoicePage />
      </MemoryRouter>
    )

    // Re-render
    rerender(
      <MemoryRouter initialEntries={['/billing/invoices/new?patientId=PAT-5186&appointmentId=APT-TEST-RCT']}>
        <NewInvoicePage />
      </MemoryRouter>
    )

    const serviceInputs = screen.getAllByPlaceholderText('Service name')
    expect(serviceInputs.length).toBe(1)
  })
})
