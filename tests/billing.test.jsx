import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '@/App'
import { createItemisedInvoice, invoiceBalance, recordInvoicePayment, refundInvoicePayment, voidInvoiceRecord, resetStoreForTesting, getClinicSnapshot } from '@/services/clinicStore'
import { findPatient } from '@/pages/billing/BillingShared'

describe('Billing workspace', () => {
  beforeEach(() => {
    sessionStorage.clear()
    sessionStorage.setItem('docmatrix-demo-session', 'usr-101')
    resetStoreForTesting()
  })

  it('computes itemised totals with GST only on cosmetic lines and tracks part payments', () => {
    const inv = createItemisedInvoice({
      patientId: 'pt-1001',
      items: [
        { id: 'a', name: 'Scaling', qty: 1, unitPrice: 1200, discount: 200, gstRate: 0 },
        { id: 'b', name: 'Whitening', qty: 1, unitPrice: 8000, discount: 0, gstRate: 18 },
      ],
      upfrontPayment: { amount: 5000, mode: 'UPI' },
    })
    expect(inv.subtotal).toBe(9200)
    expect(inv.discountTotal).toBe(200)
    expect(inv.taxTotal).toBe(1440)
    expect(inv.amount).toBe(10440)
    expect(inv.status).toBe('Partial')
    expect(invoiceBalance(inv)).toBe(5440)

    const paid = recordInvoicePayment(inv.id, { amount: 99999, mode: 'Cash' })
    expect(paid.status).toBe('Paid')
    expect(invoiceBalance(paid)).toBe(0)
    expect(paid.payments.reduce((s, p) => s + p.amount, 0)).toBe(10440)
  })

  it('shows Billing as a single sidebar link that opens the tabbed workspace', async () => {
    render(
      <MemoryRouter initialEntries={['/billing']}>
        <App />
      </MemoryRouter>
    )
    const link = screen.getByTestId('sidebar-link-area-billing')
    expect(link).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByTestId('sidebar-link-bill.dues')).not.toBeInTheDocument()

    const tabs = await screen.findByRole('navigation', { name: 'Billing sections' })
    for (const name of ['Overview', 'Invoices', 'Dues', 'Collection', 'Payments']) {
      expect(within(tabs).getByRole('button', { name: new RegExp(name) })).toBeInTheDocument()
    }
    // Price list and Expenses were removed from Billing
    expect(within(tabs).queryByRole('button', { name: /Price list|Expenses/ })).not.toBeInTheDocument()
    expect(await screen.findByTestId('feature-page-bill.overview')).toBeInTheDocument()
  })

  it('creates an itemised invoice with a part payment from the composer', async () => {
    render(
      <MemoryRouter initialEntries={['/billing/invoices/new?patientId=pt-1001']}>
        <App />
      </MemoryRouter>
    )
    await screen.findByTestId('feature-page-bill.invoice-new')
    fireEvent.change(screen.getByLabelText('Add service'), { target: { value: 'trt-2' } })
    expect(screen.getByDisplayValue('Ultrasonic Scaling & Polishing')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Collect payment now'))
    const amount = screen.getByRole('spinbutton', { name: 'Amount' })
    fireEvent.change(amount, { target: { value: '500' } })
    fireEvent.click(screen.getByRole('button', { name: /Create invoice/ }))

    await waitFor(() => {
      const created = getClinicSnapshot().invoices[0]
      expect(created.items).toHaveLength(1)
      expect(created.amount).toBe(1200)
      expect(created.status).toBe('Partial')
      expect(invoiceBalance(created)).toBe(700)
    })
    // Lands on the invoice list with the new invoice's drawer open
    expect(await screen.findByRole('dialog', { name: /Invoice INV-/ })).toBeInTheDocument()
  })

  it('supports payment refunds, voiding unpaid invoices, and backendId patient lookup', async () => {
    const inv = createItemisedInvoice({
      patientId: 'pt-1001',
      items: [{ id: 'a', name: 'Scaling', qty: 1, unitPrice: 1200, discount: 0, gstRate: 0 }],
      upfrontPayment: { amount: 1200, mode: 'UPI' },
    })
    expect(inv.status).toBe('Paid')
    expect(invoiceBalance(inv)).toBe(0)

    const pmtId = inv.payments[0].id
    const afterPartialRefund = await refundInvoicePayment(inv.id, pmtId, { amount: 500, reason: 'Discount adjustment' })
    expect(afterPartialRefund.status).toBe('Partial')
    expect(invoiceBalance(afterPartialRefund)).toBe(500)

    const afterRemainingRefund = await refundInvoicePayment(inv.id, pmtId, 700, 'Full reversal')
    expect(afterRemainingRefund.status).toBe('Unpaid')
    expect(invoiceBalance(afterRemainingRefund)).toBe(1200)

    const voided = await voidInvoiceRecord(inv.id, 'Duplicate entry')
    expect(voided.status).toBe('Void')
    expect(invoiceBalance(voided)).toBe(0)

    const pts = [{ id: 'pt-1001', backendId: 'uuid-backend-123', name: 'Asha' }]
    expect(findPatient(pts, 'pt-1001')?.name).toBe('Asha')
    expect(findPatient(pts, 'uuid-backend-123')?.name).toBe('Asha')
  })
})
