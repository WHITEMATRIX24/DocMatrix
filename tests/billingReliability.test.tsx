import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { billingApi } from '@/services/billingApi'
import {
  createItemisedInvoice,
  recordInvoicePayment,
  getClinicSnapshot,
  clearClinicStore,
  initClinicSession,
  invoiceBalance,
  savePatient,
} from '@/services/clinicStore'
import { STORAGE_KEYS } from '@/services/authService'
import { NewInvoicePage } from '@/pages/billing/NewInvoicePage'
import { PaymentDialog } from '@/pages/billing/BillingShared'

describe('DocMatrix — Billing Reliability & Failure Recovery Suite', () => {
  const mockUser = {
    id: 'usr-dentist-101',
    name: 'Dr. Arun Kumar',
    email: 'arun@docmatrix.in',
    role: 'DENTIST',
    clinicName: 'DocMatrix Clinic A',
    clinicId: 'clinic-a-uuid',
  }
  const mockToken = 'mock-jwt-token-xyz'

  let testPatient: any

  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.restoreAllMocks()
    clearClinicStore()

    // Establish authenticated clinic session
    sessionStorage.setItem(STORAGE_KEYS.TOKEN, mockToken)
    sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(mockUser))
    initClinicSession('clinic-a-uuid')

    // Seed test patient
    testPatient = savePatient({
      firstName: 'Ramesh',
      lastName: 'Gupta',
      gender: 'MALE',
      dateOfBirth: '1988-05-15',
      mobile: '9876543210',
    })
  })

  afterEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    vi.restoreAllMocks()
    clearClinicStore()
  })

  // -------------------------------------------------------------------------
  // TEST 1: Invoice API rejection does not leave phantom invoices
  // -------------------------------------------------------------------------
  it('Test 1: Invoice API rejection throws error and does not create phantom local invoice', async () => {
    vi.spyOn(billingApi, 'createAndIssueInvoice').mockRejectedValueOnce(
      new Error('Validation error: Patient is inactive or archived.')
    )

    const initialInvoices = getClinicSnapshot().invoices
    expect(initialInvoices.length).toBe(0)

    let caughtError: any = null
    try {
      await createItemisedInvoice({
        patientId: 'pt-101',
        items: [{ id: 'line-1', name: 'Root Canal Treatment', qty: 1, unitPrice: 4000, discount: 0, gstRate: 0 }],
      })
    } catch (err: any) {
      caughtError = err
    }

    expect(caughtError).not.toBeNull()
    expect(caughtError.message).toBe('Validation error: Patient is inactive or archived.')

    // Verify state was NOT contaminated
    const invoicesAfterFailure = getClinicSnapshot().invoices
    expect(invoicesAfterFailure.length).toBe(0)

    // Verify localStorage has no phantom invoice
    const storageData = localStorage.getItem('docmatrix_clinic_data_clinic-a-uuid')
    if (storageData) {
      const parsed = JSON.parse(storageData)
      expect(parsed.invoices || []).toHaveLength(0)
    }
  })

  // -------------------------------------------------------------------------
  // TEST 2: Payment API rejection throws error and prevents balance corruption
  // -------------------------------------------------------------------------
  it('Test 2: Payment API rejection throws error and leaves invoice balance unchanged', async () => {
    // 1. Setup a valid persisted invoice
    vi.spyOn(billingApi, 'createAndIssueInvoice').mockResolvedValueOnce({
      id: 'inv-uuid-201',
      clinicId: 'clinic-a-uuid',
      invoiceNumber: 'INV-1002',
      patientId: 'pt-101',
      description: 'Crown Restoration',
      totalAmount: 5000,
      subtotal: 5000,
      discountTotal: 0,
      taxTotal: 0,
      paidAmount: 0,
      balance: 5000,
      status: 'ISSUED',
      createdAt: new Date().toISOString(),
      payments: [],
      items: [],
    } as any)

    const invoice = await createItemisedInvoice({
      patientId: 'pt-101',
      items: [{ id: 'line-1', name: 'Crown Restoration', qty: 1, unitPrice: 5000, discount: 0, gstRate: 0 }],
    })

    expect(invoice.id).toBe('INV-1002')
    expect(invoiceBalance(invoice)).toBe(5000)

    // 2. Mock payment rejection (e.g. overpayment)
    vi.spyOn(billingApi, 'recordPayment').mockRejectedValueOnce(
      new Error('Payment amount ₹6000 exceeds remaining balance ₹5000.')
    )

    let paymentError: any = null
    try {
      await recordInvoicePayment('INV-1002', { amount: 6000, mode: 'UPI' })
    } catch (err: any) {
      paymentError = err
    }

    expect(paymentError).not.toBeNull()
    expect(paymentError.message).toContain('Payment amount ₹6000 exceeds remaining balance ₹5000')

    // 3. Verify invoice balance and payments list in store were not modified
    const storeInvoice = getClinicSnapshot().invoices.find((i) => i.id === 'INV-1002')
    expect(storeInvoice).toBeDefined()
    expect(storeInvoice?.payments.length).toBe(0)
    expect(invoiceBalance(storeInvoice!)).toBe(5000)
    expect(storeInvoice?.status).toBe('Unpaid')
  })

  // -------------------------------------------------------------------------
  // TEST 3: Network failures reject gracefully without corrupting state
  // -------------------------------------------------------------------------
  it('Test 3: Network failure during invoice/payment submission throws without data corruption', async () => {
    vi.spyOn(billingApi, 'createAndIssueInvoice').mockRejectedValueOnce(
      new Error('Failed to connect to DocMatrix API server (http://localhost:3000/billing/invoices/issue): Network unreachable')
    )

    await expect(
      createItemisedInvoice({
        patientId: 'pt-101',
        items: [{ id: 'l1', name: 'Dental Scaling', qty: 1, unitPrice: 1500, discount: 0, gstRate: 0 }],
      })
    ).rejects.toThrow('Network unreachable')

    // Store invoices count must remain 0
    expect(getClinicSnapshot().invoices.length).toBe(0)
  })

  // -------------------------------------------------------------------------
  // TEST 4: Duplicate submissions prevented & form data kept intact in NewInvoicePage
  // -------------------------------------------------------------------------
  it('Test 4: Prevents duplicate submissions and preserves form data when backend rejects', async () => {
    let apiCallCount = 0
    let resolveApi: any
    let rejectApi: any

    const pendingPromise = new Promise((resolve, reject) => {
      resolveApi = resolve
      rejectApi = reject
    })

    vi.spyOn(billingApi, 'createAndIssueInvoice').mockImplementation(() => {
      apiCallCount++
      return pendingPromise as any
    })

    render(
      <MemoryRouter initialEntries={[`/billing/invoices/new?patientId=${testPatient.id}`]}>
        <Routes>
          <Route path="/billing/invoices/new" element={<NewInvoicePage />} />
          <Route path="/billing/invoices" element={<div>Invoices List Page</div>} />
        </Routes>
      </MemoryRouter>
    )

    // Add a custom line item
    const addCustomBtn = screen.getByText('Custom line')
    fireEvent.click(addCustomBtn)

    const serviceInputs = screen.getAllByPlaceholderText('Service name')
    fireEvent.change(serviceInputs[0], { target: { value: 'Surgical Extraction' } })

    const rateInputs = screen.getAllByLabelText('Rate')
    fireEvent.change(rateInputs[0], { target: { value: '2500' } })

    // Find and click submit button
    const submitBtn = screen.getByRole('button', { name: /Create invoice/i })
    expect(submitBtn).toBeEnabled()

    fireEvent.click(submitBtn)

    // Verify button shows in-flight state and is disabled
    expect(screen.getByRole('button', { name: /Creating invoice.../i })).toBeDisabled()
    expect(apiCallCount).toBe(1)

    // Attempt to click again while in-flight
    fireEvent.click(submitBtn)
    expect(apiCallCount).toBe(1) // No duplicate API submission!

    // Reject the backend API call
    rejectApi(new Error('PostgreSQL sequence allocation failed'))

    await waitFor(() => {
      expect(screen.getByText(/PostgreSQL sequence allocation failed/i)).toBeInTheDocument()
    })

    // Verify form input remains intact
    expect(serviceInputs[0]).toHaveValue('Surgical Extraction')
    expect(rateInputs[0]).toHaveValue(2500)

    // Verify button re-enabled for retry
    expect(screen.getByRole('button', { name: /Create invoice/i })).toBeEnabled()
  })

  // -------------------------------------------------------------------------
  // TEST 5: Successful invoice creation commits to store and database model
  // -------------------------------------------------------------------------
  it('Test 5: Successful invoice persistence commits authoritative record to store', async () => {
    vi.spyOn(billingApi, 'createAndIssueInvoice').mockResolvedValueOnce({
      id: 'inv-backend-999',
      clinicId: 'clinic-a-uuid',
      invoiceNumber: 'INV-1099',
      patientId: 'pt-101',
      description: 'Orthodontic Brackets',
      subtotal: 25000,
      discountTotal: 2000,
      taxTotal: 0,
      totalAmount: 23000,
      paidAmount: 5000,
      balance: 18000,
      status: 'PARTIALLY_PAID',
      createdAt: '2026-11-06T10:00:00.000Z',
      payments: [
        {
          id: 'pay-upfront-01',
          amount: 5000,
          mode: 'UPI',
          reference: 'UPI-UPFRONT',
          receivedAt: '2026-11-06T10:00:00.000Z',
        },
      ],
      items: [],
    } as any)

    const created = await createItemisedInvoice({
      patientId: 'pt-101',
      items: [{ id: 'l1', name: 'Orthodontic Brackets', qty: 1, unitPrice: 25000, discount: 2000, gstRate: 0 }],
      upfrontPayment: { amount: 5000, mode: 'UPI' },
    })

    expect(created.id).toBe('INV-1099')
    expect(created.backendId).toBe('inv-backend-999')
    expect(created.amount).toBe(23000)
    expect(created.subtotal).toBe(25000)
    expect(created.discountTotal).toBe(2000)
    expect(created.status).toBe('Partial')
    expect(created.payments).toHaveLength(1)

    // Verify presence in store snapshot
    const storeInvoices = getClinicSnapshot().invoices
    expect(storeInvoices).toHaveLength(1)
    expect(storeInvoices[0].id).toBe('INV-1099')
  })

  // -------------------------------------------------------------------------
  // TEST 6: Successful payment persistence updates balance authoritatively
  // -------------------------------------------------------------------------
  it('Test 6: Successful payment updates invoice balance and payment history authoritatively', async () => {
    // 1. Seed invoice with ₹18,000 balance
    vi.spyOn(billingApi, 'createAndIssueInvoice').mockResolvedValueOnce({
      id: 'inv-backend-888',
      clinicId: 'clinic-a-uuid',
      invoiceNumber: 'INV-1088',
      patientId: 'pt-101',
      description: 'Implants',
      subtotal: 18000,
      discountTotal: 0,
      taxTotal: 0,
      totalAmount: 18000,
      paidAmount: 0,
      balance: 18000,
      status: 'ISSUED',
      createdAt: '2026-11-06T10:00:00.000Z',
      payments: [],
      items: [],
    } as any)

    await createItemisedInvoice({
      patientId: 'pt-101',
      items: [{ id: 'l1', name: 'Implants', qty: 1, unitPrice: 18000, discount: 0, gstRate: 0 }],
    })

    // 2. Mock payment recording and authoritative invoice reload
    vi.spyOn(billingApi, 'recordPayment').mockResolvedValueOnce({
      id: 'pay-backend-555',
      clinicId: 'clinic-a-uuid',
      invoiceId: 'inv-backend-888',
      type: 'PAYMENT',
      amount: 10000,
      mode: 'CARD',
      receivedAt: '2026-11-06T10:30:00.000Z',
    } as any)

    vi.spyOn(billingApi, 'getInvoiceById').mockResolvedValueOnce({
      id: 'inv-backend-888',
      clinicId: 'clinic-a-uuid',
      invoiceNumber: 'INV-1088',
      patientId: 'pt-101',
      description: 'Implants',
      subtotal: 18000,
      discountTotal: 0,
      taxTotal: 0,
      totalAmount: 18000,
      paidAmount: 10000,
      balance: 8000,
      status: 'PARTIALLY_PAID',
      createdAt: '2026-11-06T10:00:00.000Z',
      payments: [
        {
          id: 'pay-backend-555',
          amount: 10000,
          mode: 'CARD',
          receivedAt: '2026-11-06T10:30:00.000Z',
        },
      ],
      items: [],
    } as any)

    const updated = await recordInvoicePayment('INV-1088', {
      amount: 10000,
      mode: 'Card',
      reference: 'CARD-REF-99',
    })

    expect(updated).not.toBeNull()
    expect(updated?.id).toBe('INV-1088')
    expect(updated?.status).toBe('Partial')
    expect(invoiceBalance(updated!)).toBe(8000)

    const storeInvoice = getClinicSnapshot().invoices.find((i) => i.id === 'INV-1088')
    expect(invoiceBalance(storeInvoice!)).toBe(8000)
    expect(storeInvoice?.payments).toHaveLength(1)
  })

  // -------------------------------------------------------------------------
  // TEST 7: State consistency after multiple failed operations
  // -------------------------------------------------------------------------
  it('Test 7: State consistency remains strictly intact after repeated operation failures', async () => {
    // 1. Seed two valid invoices
    vi.spyOn(billingApi, 'createAndIssueInvoice')
      .mockResolvedValueOnce({
        id: 'inv-1',
        clinicId: 'clinic-a-uuid',
        invoiceNumber: 'INV-1001',
        patientId: 'pt-1',
        description: 'Clean A',
        subtotal: 1000,
        discountTotal: 0,
        taxTotal: 0,
        totalAmount: 1000,
        paidAmount: 1000,
        balance: 0,
        status: 'PAID',
        payments: [{ id: 'p1', amount: 1000, mode: 'CASH', receivedAt: '2026-11-06' }],
        items: [],
      } as any)
      .mockResolvedValueOnce({
        id: 'inv-2',
        clinicId: 'clinic-a-uuid',
        invoiceNumber: 'INV-1002',
        patientId: 'pt-2',
        description: 'Clean B',
        subtotal: 2000,
        discountTotal: 0,
        taxTotal: 0,
        totalAmount: 2000,
        paidAmount: 500,
        balance: 1500,
        status: 'PARTIALLY_PAID',
        payments: [{ id: 'p2', amount: 500, mode: 'UPI', receivedAt: '2026-11-06' }],
        items: [],
      } as any)

    await createItemisedInvoice({ patientId: 'pt-1', items: [{ id: '1', name: 'Clean A', qty: 1, unitPrice: 1000, discount: 0, gstRate: 0 }] })
    await createItemisedInvoice({ patientId: 'pt-2', items: [{ id: '2', name: 'Clean B', qty: 1, unitPrice: 2000, discount: 0, gstRate: 0 }] })

    expect(getClinicSnapshot().invoices).toHaveLength(2)

    // 2. Perform 3 consecutive failed operations:
    // Fail 1: Failed invoice creation
    vi.spyOn(billingApi, 'createAndIssueInvoice').mockRejectedValueOnce(new Error('Internal Server Error 500'))
    await expect(
      createItemisedInvoice({ patientId: 'pt-3', items: [{ id: '3', name: 'Bad Line', qty: 1, unitPrice: 3000, discount: 0, gstRate: 0 }] })
    ).rejects.toThrow('Internal Server Error 500')

    // Fail 2: Failed payment on INV-1002
    vi.spyOn(billingApi, 'recordPayment').mockRejectedValueOnce(new Error('Database lock acquisition timeout'))
    await expect(
      recordInvoicePayment('INV-1002', { amount: 500, mode: 'Cash' })
    ).rejects.toThrow('Database lock acquisition timeout')

    // Fail 3: Another failed invoice
    vi.spyOn(billingApi, 'createAndIssueInvoice').mockRejectedValueOnce(new Error('Network drop'))
    await expect(
      createItemisedInvoice({ patientId: 'pt-4', items: [{ id: '4', name: 'Drop Line', qty: 1, unitPrice: 4000, discount: 0, gstRate: 0 }] })
    ).rejects.toThrow('Network drop')

    // 3. Verify store state remains 100% consistent with exactly the original 2 invoices
    const currentInvoices = getClinicSnapshot().invoices
    expect(currentInvoices).toHaveLength(2)

    const inv1 = currentInvoices.find((i) => i.id === 'INV-1001')
    const inv2 = currentInvoices.find((i) => i.id === 'INV-1002')

    expect(inv1).toBeDefined()
    expect(inv1?.status).toBe('Paid')
    expect(invoiceBalance(inv1!)).toBe(0)

    expect(inv2).toBeDefined()
    expect(inv2?.status).toBe('Partial')
    expect(invoiceBalance(inv2!)).toBe(1500)
    expect(inv2?.payments).toHaveLength(1)
  })
})
