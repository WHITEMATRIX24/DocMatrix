import { browserSessionStorage } from '@/services/browserStorage'
import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { InvoiceSuccessToast } from '@/components/shared/InvoiceSuccessToast'
import { CalendarPage } from '@/pages/appointments/CalendarPage'
import { LiveQueuePage } from '@/pages/appointments/LiveQueuePage'
import { localDate } from '@/pages/billing/BillingShared'
import * as clinicStore from '@/services/clinicStore'
import * as billingStore from '@/services/billingStore'
import { clearInFlightInvoiceCache } from '@/services/billingAutoInvoice'

describe('Automatic Invoice Generation Flow & Success Toast Notification', () => {
  const todayStr = localDate()
  const mockDoctor = clinicStore.DENTISTS[0]?.name || 'Dr. Arun Kumar'

  const mockPatient = {
    id: 'PAT-TOAST-01',
    firstName: 'Priya',
    lastName: 'Sharma',
    mobile: '9876543210',
    gender: 'female',
    age: '28',
  }

  const mockServices = [
    {
      id: 'srv-rct',
      name: 'Root Canal Treatment (Single Sitting)',
      category: 'Endodontics',
      price: 4500,
      gstClass: 'treatment',
      active: true,
    },
    {
      id: 'srv-scaling',
      name: 'Dental Scaling & Polishing',
      category: 'Periodontics',
      price: 1500,
      gstClass: 'treatment',
      active: true,
    },
  ]

  let appointmentsData = []
  let invoicesData = []

  beforeEach(() => {
    browserSessionStorage.clear()
    browserSessionStorage.setItem('docmatrix_auth_user', JSON.stringify({ id: 'usr-104', role: 'DOCTOR', clinicId: 'clinic-demo-001' }))
    clearInFlightInvoiceCache()
    appointmentsData = [
      {
        id: 'APT-CALENDAR-01',
        patientId: 'PAT-TOAST-01',
        patientName: 'Priya Sharma',
        doctor: mockDoctor,
        chair: 'Chair 1',
        treatmentType: 'Root Canal Treatment (Single Sitting)',
        visitType: 'Dental procedure',
        date: todayStr,
        time: '10:00',
        durationMinutes: 45,
        status: 'in-progress',
        priority: 'normal',
        notes: 'Tooth #46 acute pulpitis',
      },
      {
        id: 'APT-QUEUE-01',
        patientId: 'PAT-TOAST-01',
        patientName: 'Priya Sharma',
        doctor: mockDoctor,
        chair: 'Chair 1',
        treatmentType: 'Dental Scaling & Polishing',
        visitType: 'Dental procedure',
        date: todayStr,
        time: '11:00',
        durationMinutes: 30,
        status: 'in-progress',
        priority: 'normal',
        tokenNumber: 1,
      },
    ]
    invoicesData = []

    vi.spyOn(billingStore, 'getBillingSnapshot').mockReturnValue({
      services: mockServices,
      expenses: [],
      isLoading: false,
      error: null,
    })

    vi.spyOn(clinicStore, 'useClinicData').mockImplementation(() => ({
      patients: [mockPatient],
      appointments: appointmentsData,
      clinicalNotes: [],
      invoices: invoicesData,
      treatmentPlans: [],
    }))

    vi.spyOn(clinicStore, 'getClinicSnapshot').mockImplementation(() => ({
      patients: [mockPatient],
      appointments: appointmentsData,
      clinicalNotes: [],
      invoices: invoicesData,
      treatmentPlans: [],
    }))

    vi.spyOn(clinicStore, 'createItemisedInvoice').mockImplementation((invData) => {
      const newInv = {
        id: `INV-AUTO-${invoicesData.length + 1001}`,
        patientId: invData.patientId,
        appointmentId: invData.appointmentId,
        notes: invData.notes,
        status: 'Unpaid',
        items: invData.items || [],
        amount: (invData.items || []).reduce((acc, item) => acc + (item.qty || 1) * (item.unitPrice || 0), 0),
        payments: [],
        createdAt: new Date().toISOString(),
      }
      invoicesData.push(newInv)
      return newInv
    })

    vi.spyOn(clinicStore, 'updateAppointmentStatus').mockImplementation((id, status) => {
      const appt = appointmentsData.find((a) => a.id === id)
      if (appt) {
        appt.status = status
      }
      return appt
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    browserSessionStorage.clear()
  })

  describe('InvoiceSuccessToast Component Unit Tests', () => {
    it('does not render when toast is null', () => {
      const { container } = render(<InvoiceSuccessToast toast={null} onClose={vi.fn()} />)
      expect(container.firstChild).toBeNull()
    })

    it('renders toast with title, dynamic invoice number, and dynamic total amount', () => {
      render(
        <InvoiceSuccessToast
          toast={{ invoiceNumber: 'INV-1099', amount: 4500 }}
          onClose={vi.fn()}
        />
      )

      expect(screen.getByText('Invoice Generated Successfully!')).toBeInTheDocument()
      expect(screen.getByText('INV-1099')).toBeInTheDocument()
      expect(screen.getByText(/₹4,500/)).toBeInTheDocument()
    })

    it('calls onClose when dismiss button is clicked', () => {
      const onCloseSpy = vi.fn()
      render(
        <InvoiceSuccessToast
          toast={{ invoiceNumber: 'INV-1099', amount: 4500 }}
          onClose={onCloseSpy}
        />
      )

      const dismissBtn = screen.getByRole('button', { name: /dismiss/i })
      fireEvent.click(dismissBtn)
      expect(onCloseSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('CalendarPage Consultation Completion Workflow', () => {
    it('completing consultation generates invoice after confirmation and keeps user on page', async () => {
      render(
        <MemoryRouter initialEntries={['/appointments']}>
          <CalendarPage />
        </MemoryRouter>
      )

      // Open appointment modal by clicking the appointment card
      const patientElements = screen.getAllByText('Priya Sharma')
      const apptCard = patientElements[0].closest('.calendar-appointment-card') || patientElements[0]
      expect(apptCard).toBeInTheDocument()
      fireEvent.click(apptCard)

      // The Appointment Details modal opens
      const completeBtn = screen.getByTitle('Finalize consultation and preview invoice')
      expect(completeBtn).toBeInTheDocument()

      // Click "Complete Consultation"
      fireEvent.click(completeBtn)

      // 1. Invoice must be generated and saved in invoicesData
      await waitFor(() => expect(invoicesData.length).toBe(1))
      const generatedInvoice = invoicesData[0]
      expect(generatedInvoice.amount).toBe(4500)
      expect(generatedInvoice.status).toBe('Unpaid')

      // 2. Invoice Details drawer must NOT be open
      expect(screen.queryByTestId('invoice-drawer-backdrop')).not.toBeInTheDocument()
      expect(screen.queryByText('Financial Summary')).not.toBeInTheDocument()

      // 3. Success toast notification must be displayed with actual invoice number and amount
      expect(screen.getByTestId('invoice-success-toast')).toBeInTheDocument()
      expect(screen.getByText('Invoice Generated Successfully!')).toBeInTheDocument()
      expect(screen.getByText(generatedInvoice.id)).toBeInTheDocument()
      expect(screen.getByText(/₹4,500/)).toBeInTheDocument()

      // 4. Appointment status updated to completed
      expect(appointmentsData[0].status).toBe('completed')
    })
  })

  describe('LiveQueuePage Consultation Completion Workflow', () => {
    it('completing visit in queue generates invoice after confirmation and preserves it in billing', async () => {
      // In LiveQueue, only one appointment in-progress for this test
      appointmentsData = [appointmentsData[1]]

      render(
        <MemoryRouter initialEntries={['/appointments/queue']}>
          <LiveQueuePage />
        </MemoryRouter>
      )

      // Find the "Complete Visit" button for the in-progress patient
      const completeBtn = screen.getByTitle('Complete consultation & generate invoice')
      expect(completeBtn).toBeInTheDocument()

      // Click "Complete Visit"
      fireEvent.click(completeBtn)

      // 1. Invoice must be generated and saved
      await waitFor(() => expect(invoicesData.length).toBe(1))
      const generatedInvoice = invoicesData[0]
      expect(generatedInvoice.appointmentId).toBe('APT-QUEUE-01')
      expect(generatedInvoice.amount).toBe(1500)
      expect(generatedInvoice.status).toBe('Unpaid')

      // 2. Invoice Details drawer must NOT be opened
      expect(screen.queryByTestId('invoice-drawer-backdrop')).not.toBeInTheDocument()
      expect(screen.queryByText('Financial Summary')).not.toBeInTheDocument()

      // 3. Success toast notification must be displayed with actual invoice number and amount
      expect(screen.getByTestId('invoice-success-toast')).toBeInTheDocument()
      expect(screen.getByText('Invoice Generated Successfully!')).toBeInTheDocument()
      expect(screen.getByText(generatedInvoice.id)).toBeInTheDocument()
      expect(screen.getByText(/₹1,500/)).toBeInTheDocument()

      // 4. Visit status updated to completed
      expect(appointmentsData[0].status).toBe('completed')
    })
  })
})
