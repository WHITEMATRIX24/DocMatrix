import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  autoGenerateInvoiceForConsultation,
  findExistingInvoiceForConsultation,
  splitTreatmentProcedures,
  clearInFlightInvoiceCache,
} from '@/services/billingAutoInvoice'
import * as clinicStore from '@/services/clinicStore'
import * as billingStore from '@/services/billingStore'

describe('Automatic Invoice Generation on Consultation Completion', () => {
  const mockPatient = {
    id: 'PAT-AUTO-101',
    firstName: 'Meera',
    lastName: 'Nambiar',
    mobile: '9876543210',
    gender: 'female',
    age: '29',
    createdAt: '2026-11-18T09:00:00.000Z',
    updatedAt: '2026-11-18T09:00:00.000Z',
  }

  const mockServices = [
    {
      id: 'srv-exam',
      name: 'Comprehensive Dental Examination',
      category: 'Preventive',
      price: 600,
      gstClass: 'treatment',
      active: true,
    },
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
    {
      id: 'srv-whitening',
      name: 'Laser Teeth Whitening',
      category: 'Cosmetic',
      price: 8000,
      gstClass: 'cosmetic', // 18% GST
      active: true,
    },
  ]

  let appointmentsStore = []
  let invoicesStore = []
  let clinicalNotesStore = []

  beforeEach(() => {
    clearInFlightInvoiceCache()
    appointmentsStore = [
      {
        id: 'APT-CONSULT-01',
        patientId: 'PAT-AUTO-101',
        patientName: 'Meera Nambiar',
        doctor: 'Dr. Tariq Antoun',
        chair: 'Chair 2',
        treatmentType: 'Root Canal Treatment (Single Sitting)',
        visitType: 'Dental procedure',
        date: '2026-11-18',
        time: '10:00',
        durationMinutes: 45,
        status: 'in-progress',
        priority: 'normal',
        notes: 'Tooth #46 acute pulpitis',
        createdAt: '2026-11-18T09:30:00.000Z',
      },
    ]
    invoicesStore = []
    clinicalNotesStore = []

    vi.spyOn(billingStore, 'getBillingSnapshot').mockReturnValue({
      services: mockServices,
      expenses: [],
      isLoading: false,
      error: null,
    })

    vi.spyOn(clinicStore, 'getClinicSnapshot').mockImplementation(() => ({
      patients: [mockPatient],
      appointments: appointmentsStore,
      clinicalNotes: clinicalNotesStore,
      invoices: invoicesStore,
      treatmentPlans: [],
      patientDocuments: [],
      patientConsents: [],
      toothCharts: {},
      enquiries: [],
    }))

    vi.spyOn(clinicStore, 'createItemisedInvoice').mockImplementation((details) => {
      const stamp = Date.now().toString()
      const totals = details.items.reduce(
        (acc, item) => {
          const gross = (item.unitPrice || 0) * (item.qty || 1)
          const discount = item.discount || 0
          const tax = (gross - discount) * ((item.gstRate || 0) / 100)
          acc.subtotal += gross
          acc.discount += discount
          acc.tax += tax
          return acc
        },
        { subtotal: 0, discount: 0, tax: 0 }
      )
      const amount = Math.round((totals.subtotal - totals.discount + totals.tax) * 100) / 100
      const invoice = {
        id: `INV-${stamp.slice(-6)}`,
        patientId: details.patientId,
        description: details.items.map((i) => i.name).join(', '),
        amount,
        status: 'Unpaid',
        createdAt: new Date().toISOString(),
        items: details.items,
        subtotal: totals.subtotal,
        discountTotal: totals.discount,
        taxTotal: Math.round(totals.tax * 100) / 100,
        payments: [],
        appointmentId: details.appointmentId,
        notes: details.notes,
      }
      invoicesStore.push(invoice)
      return invoice
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('Requirement 1 & 3: Correctly splits multiple treatment strings', () => {
    const single = splitTreatmentProcedures('Root Canal Treatment')
    expect(single).toEqual(['Root Canal Treatment'])

    const commaSeparated = splitTreatmentProcedures(
      'Root Canal Treatment, Dental Scaling & Polishing; Laser Teeth Whitening'
    )
    expect(commaSeparated).toEqual([
      'Root Canal Treatment',
      'Dental Scaling & Polishing',
      'Laser Teeth Whitening',
    ])
  })

  it('Scenario 1: Auto-generates invoice for consultation with ONE treatment', () => {
    const result = autoGenerateInvoiceForConsultation({
      appointmentId: 'APT-CONSULT-01',
      services: mockServices,
    })

    expect(result.isNew).toBe(true)
    expect(result.status).toBe('created')
    expect(result.invoice).not.toBeNull()
    expect(result.invoice?.patientId).toBe('PAT-AUTO-101')
    expect(result.invoice?.appointmentId).toBe('APT-CONSULT-01')
    expect(result.invoice?.status).toBe('Unpaid') // Must remain Unpaid until collected
    expect(result.invoice?.items.length).toBe(1)
    expect(result.invoice?.items[0].name).toBe('Root Canal Treatment (Single Sitting)')
    expect(result.invoice?.items[0].unitPrice).toBe(4500)
    expect(result.invoice?.items[0].toothNumber).toBe('46')
    expect(result.invoice?.subtotal).toBe(4500)
    expect(result.invoice?.taxTotal).toBe(0) // Treatment is GST exempt
    expect(result.invoice?.amount).toBe(4500)
  })

  it('Scenario 2: Auto-generates invoice for consultation with MULTIPLE treatments and calculates tax', () => {
    const multiNote = {
      id: 'CN-MULTI-01',
      patientId: 'PAT-AUTO-101',
      appointmentId: 'APT-CONSULT-01',
      treatmentPerformed: 'Root Canal Treatment (Single Sitting), Laser Teeth Whitening',
      treatmentToothNumber: '46',
      status: 'FINALIZED',
      createdAt: '2026-11-18T10:15:00.000Z',
    }
    clinicalNotesStore.push(multiNote)

    const result = autoGenerateInvoiceForConsultation({
      clinicalNote: multiNote,
      appointmentId: 'APT-CONSULT-01',
      services: mockServices,
    })

    expect(result.isNew).toBe(true)
    expect(result.status).toBe('created')
    expect(result.invoice).not.toBeNull()
    expect(result.invoice?.items.length).toBe(2)

    // Item 1: RCT (4500, 0% GST)
    const item1 = result.invoice?.items[0]
    expect(item1?.name).toBe('Root Canal Treatment (Single Sitting)')
    expect(item1?.unitPrice).toBe(4500)
    expect(item1?.gstRate).toBe(0)

    // Item 2: Whitening (8000, 18% GST -> 1440 tax)
    const item2 = result.invoice?.items[1]
    expect(item2?.name).toBe('Laser Teeth Whitening')
    expect(item2?.unitPrice).toBe(8000)
    expect(item2?.gstRate).toBe(18)

    // Subtotal: 4500 + 8000 = 12500
    expect(result.invoice?.subtotal).toBe(12500)
    // Tax: 1440
    expect(result.invoice?.taxTotal).toBe(1440)
    // Total Amount: 12500 + 1440 = 13940
    expect(result.invoice?.amount).toBe(13940)
  })

  it('Scenario 3 & 4: Duplicate prevention — does NOT create duplicate invoices if consultation completed multiple times', () => {
    // First completion
    const res1 = autoGenerateInvoiceForConsultation({
      appointmentId: 'APT-CONSULT-01',
      services: mockServices,
    })
    expect(res1.isNew).toBe(true)
    const invoiceId = res1.invoice?.id

    // Second completion attempt
    const res2 = autoGenerateInvoiceForConsultation({
      appointmentId: 'APT-CONSULT-01',
      services: mockServices,
    })
    expect(res2.isNew).toBe(false)
    expect(res2.status).toBe('existing')
    expect(res2.invoice?.id).toBe(invoiceId)
    // Invoices list must only have 1 invoice
    expect(invoicesStore.length).toBe(1)
  })

  it('Scenario 5: When no billable treatment is recorded, does NOT generate an empty invoice', () => {
    const emptyAppt = {
      id: 'APT-EMPTY-01',
      patientId: 'PAT-AUTO-101',
      doctor: 'Dr. Tariq Antoun',
      treatmentType: '',
      visitType: '',
      date: '2026-11-18',
      time: '11:00',
      status: 'in-progress',
      notes: '',
    }
    appointmentsStore.push(emptyAppt)

    const result = autoGenerateInvoiceForConsultation({
      appointmentId: 'APT-EMPTY-01',
      services: mockServices,
    })

    expect(result.isNew).toBe(false)
    expect(result.status).toBe('no_treatment')
    expect(result.invoice).toBeNull()
    expect(invoicesStore.length).toBe(0)
  })

  it('Scenario 6: Correctly links patient and appointment details', () => {
    const result = autoGenerateInvoiceForConsultation({
      appointmentId: 'APT-CONSULT-01',
      services: mockServices,
    })

    expect(result.invoice?.patientId).toBe('PAT-AUTO-101')
    expect(result.invoice?.appointmentId).toBe('APT-CONSULT-01')
    expect(result.invoice?.notes).toContain('Appointment: APT-CONSULT-01')
  })

  it('Scenario 7: Reuses existing active invoices if already present', () => {
    const existing = {
      id: 'INV-EXISTING-99',
      patientId: 'PAT-AUTO-101',
      appointmentId: 'APT-CONSULT-01',
      description: 'Prior consultation invoice',
      amount: 4500,
      status: 'Unpaid',
      createdAt: '2026-11-18T09:00:00.000Z',
    }
    invoicesStore.push(existing)

    const found = findExistingInvoiceForConsultation({
      appointmentId: 'APT-CONSULT-01',
    })
    expect(found?.id).toBe('INV-EXISTING-99')

    const result = autoGenerateInvoiceForConsultation({
      appointmentId: 'APT-CONSULT-01',
    })
    expect(result.isNew).toBe(false)
    expect(result.status).toBe('existing')
    expect(result.invoice?.id).toBe('INV-EXISTING-99')
  })

  it('Scenario 8: Does not collect payment automatically; status remains Unpaid for receptionist review', () => {
    const result = autoGenerateInvoiceForConsultation({
      appointmentId: 'APT-CONSULT-01',
      services: mockServices,
    })

    expect(result.invoice?.status).toBe('Unpaid')
    expect(result.invoice?.payments).toEqual([])
  })

  it('Scenario 9: Complete End-to-End Workflow (Calendar -> Check-In -> Call In -> Complete -> Auto Invoice -> Billing -> Payment)', () => {
    // 1. Calendar: Patient has scheduled appointment
    const appt = {
      id: 'APT-E2E-FLOW',
      patientId: 'PAT-AUTO-101',
      patientName: 'Meera Nambiar',
      doctor: 'Dr. Tariq Antoun',
      chair: 'Chair 2',
      treatmentType: 'Root Canal Treatment (Single Sitting)',
      visitType: 'Dental procedure',
      date: '2026-11-18',
      time: '11:00',
      status: 'scheduled',
      notes: 'Patient attending for RCT on tooth 46',
    }
    appointmentsStore.push(appt)

    // 2. Check-In: Receptionist clicks Check-In when patient arrives
    appt.status = 'checked-in'
    appt.checkInTime = '10:55'
    expect(appt.status).toBe('checked-in')

    // 3. Call In / Start: Dentist calls patient to chair
    appt.status = 'in-progress'
    appt.consultationStartTime = '11:02'
    expect(appt.status).toBe('in-progress')

    // 4. Complete Consultation & 5. Automatic Invoice Generation
    appt.status = 'completed'
    appt.completedTime = '11:45'

    const genResult = autoGenerateInvoiceForConsultation({
      appointment: appt,
      services: mockServices,
    })

    expect(genResult.isNew).toBe(true)
    expect(genResult.status).toBe('created')
    expect(genResult.invoice).not.toBeNull()

    const createdInv = genResult.invoice
    expect(createdInv.patientId).toBe('PAT-AUTO-101')
    expect(createdInv.appointmentId).toBe('APT-E2E-FLOW')
    expect(createdInv.status).toBe('Unpaid')
    expect(createdInv.amount).toBe(4500)

    // 6. Billing Module: Generated invoice immediately exists in billing with Unpaid status
    const allBillingInvoices = clinicStore.getClinicSnapshot().invoices
    expect(allBillingInvoices.some((inv) => inv.id === createdInv.id)).toBe(true)
    const billingInvoice = allBillingInvoices.find((inv) => inv.id === createdInv.id)
    expect(billingInvoice?.status).toBe('Unpaid')
    expect(billingInvoice?.amount).toBe(4500)

    // 7. Payment Collection: Patient pays at billing counter
    const payment = {
      id: 'PAY-RECEIPT-001',
      amount: 4500,
      mode: 'UPI',
      receivedAt: new Date().toISOString(),
      reference: 'UPI-REF-987654321',
    }
    billingInvoice.payments.push(payment)
    billingInvoice.status = 'Paid'

    expect(billingInvoice.status).toBe('Paid')
    expect(billingInvoice.payments.length).toBe(1)
    expect(billingInvoice.payments[0].amount).toBe(4500)
    expect(billingInvoice.payments[0].mode).toBe('UPI')

    // Duplicate check: Re-running completion does NOT create a 2nd invoice
    const reCompleteResult = autoGenerateInvoiceForConsultation({
      appointment: appt,
      services: mockServices,
    })
    expect(reCompleteResult.isNew).toBe(false)
    expect(reCompleteResult.status).toBe('existing')
    expect(reCompleteResult.invoice?.id).toBe(createdInv.id)
  })

  it('Scenario 10: Calendar & Live Queue duplicate prevention — concurrent calls reuse existing invoice and generate only ONE invoice per consultation', () => {
    const queueAppt = {
      id: 'APT-LIVE-QUEUE-01',
      patientId: 'PAT-AUTO-101',
      patientName: 'Meera Nambiar',
      doctor: 'Dr. Tariq Antoun',
      chair: 'Chair 1',
      treatmentType: 'Dental Scaling & Polishing',
      visitType: 'Dental procedure',
      date: '2026-11-18',
      time: '12:00',
      status: 'in-progress',
      notes: 'Cleaning and scaling visit',
    }
    appointmentsStore.push(queueAppt)

    // Simulate Live Queue "Complete Visit" click which triggers updateAppointmentStatus + autoGenerateInvoice
    queueAppt.status = 'completed'
    const initialCount = invoicesStore.length

    // Call 1 (from appointment status change / listener)
    const call1 = autoGenerateInvoiceForConsultation({
      appointment: queueAppt,
      services: mockServices,
    })
    expect(call1.isNew).toBe(true)
    expect(call1.status).toBe('created')
    expect(invoicesStore.length).toBe(initialCount + 1)
    const createdId = call1.invoice?.id

    // Call 2 (from UI button handler on same appointment)
    const call2 = autoGenerateInvoiceForConsultation({
      appointment: queueAppt,
      services: mockServices,
    })
    expect(call2.isNew).toBe(false)
    expect(call2.status).toBe('existing')
    expect(call2.invoice?.id).toBe(createdId)
    // No extra invoice created!
    expect(invoicesStore.length).toBe(initialCount + 1)

    // Call 3 (user clicks "Bill" in completed list)
    const call3 = autoGenerateInvoiceForConsultation({
      appointmentId: 'APT-LIVE-QUEUE-01',
      services: mockServices,
    })
    expect(call3.isNew).toBe(false)
    expect(call3.status).toBe('existing')
    expect(call3.invoice?.id).toBe(createdId)
    expect(invoicesStore.length).toBe(initialCount + 1)

    // Call 4: Calendar view completion on another appointment for same patient on same date with same treatment
    const calendarApptSameTreatment = {
      id: 'APT-CALENDAR-SAME',
      patientId: 'PAT-AUTO-101',
      treatmentType: 'Dental Scaling & Polishing',
      date: '2026-11-18',
      time: '12:30',
      status: 'completed',
    }
    appointmentsStore.push(calendarApptSameTreatment)

    const call4 = autoGenerateInvoiceForConsultation({
      appointment: calendarApptSameTreatment,
      services: mockServices,
    })
    // Reuses existing invoice since patient, treatment and date are identical!
    expect(call4.isNew).toBe(false)
    expect(call4.status).toBe('existing')
    expect(call4.invoice?.id).toBe(createdId)
    expect(invoicesStore.length).toBe(initialCount + 1)
  })
})
