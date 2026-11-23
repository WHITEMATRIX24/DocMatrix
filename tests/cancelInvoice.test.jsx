import { browserSessionStorage } from '@/services/browserStorage';
import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { InvoicesPage } from '@/pages/billing/InvoicesPage'
import {
  createItemisedInvoice,
  invoiceBalance,
  recordInvoicePayment,
  cancelInvoiceRecord,
  removeInvoiceRecord,
  isInvoiceCancelled,
  resetStoreForTesting,
} from '@/services/clinicStore'

describe('Cancel Invoice functionality', () => {
  beforeEach(() => {
    browserSessionStorage.clear()
    browserSessionStorage.setItem('docmatrix-demo-session', 'usr-101')
    browserSessionStorage.setItem(
      'docmatrix_auth_user',
      JSON.stringify({
        id: 'usr-101',
        name: 'Clinic Administrator',
        role: 'ORGANIZATION_ADMIN',
      })
    )
    resetStoreForTesting()
  })

  describe('Store-level cancelInvoiceRecord', () => {
    it('cancels an unpaid invoice, requires a reason, and records cancellation metadata', async () => {
      const inv = createItemisedInvoice({
        patientId: 'pt-1001',
        items: [{ id: 'srv-1', name: 'Dental Cleaning', qty: 1, unitPrice: 1500, discount: 0, gstRate: 0 }],
      })

      expect(inv.status).toBe('Unpaid')
      expect(invoiceBalance(inv)).toBe(1500)

      // Rejects empty reason
      await expect(cancelInvoiceRecord(inv.id, '   ')).rejects.toThrow(/cancellation reason is required/i)

      // Successfully cancels with valid reason
      const cancelled = await cancelInvoiceRecord(inv.id, 'Incorrect treatment billed by receptionist')
      expect(cancelled.status).toBe('Cancelled')
      expect(cancelled.cancellationReason).toBe('Incorrect treatment billed by receptionist')
      expect(cancelled.cancelledAt).toBeDefined()
      expect(cancelled.notes).toContain('Incorrect treatment billed by receptionist')
      expect(invoiceBalance(cancelled)).toBe(0)
      expect(isInvoiceCancelled(cancelled)).toBe(true)
    })

    it('prohibits payment collection against cancelled invoices', async () => {
      const inv = createItemisedInvoice({
        patientId: 'pt-1001',
        items: [{ id: 'srv-1', name: 'Consultation', qty: 1, unitPrice: 500, discount: 0, gstRate: 0 }],
      })

      await cancelInvoiceRecord(inv.id, 'Duplicate invoice')

      expect(() => {
        recordInvoicePayment(inv.id, { amount: 500, mode: 'Cash' })
      }).toThrow(/cannot record payment against a cancelled invoice/i)
    })

    it('prohibits cancelling paid invoices and directs users to refund instead', async () => {
      const inv = createItemisedInvoice({
        patientId: 'pt-1001',
        items: [{ id: 'srv-1', name: 'Root Canal Treatment', qty: 1, unitPrice: 4000, discount: 0, gstRate: 0 }],
        upfrontPayment: { amount: 2000, mode: 'UPI' },
      })

      expect(inv.status).toBe('Partial')

      await expect(cancelInvoiceRecord(inv.id, 'Patient changed mind')).rejects.toThrow(
        /Paid invoices cannot be cancelled.*refund/i
      )
    })

    it('allows permanently removing a cancelled invoice, and rejects removing active invoices', async () => {
      const activeInv = createItemisedInvoice({
        patientId: 'pt-1001',
        items: [{ id: 'srv-1', name: 'Scaling', qty: 1, unitPrice: 1000, discount: 0, gstRate: 0 }],
      })

      // Cannot remove active invoice
      await expect(removeInvoiceRecord(activeInv.id)).rejects.toThrow(/Only cancelled or draft invoices can be removed/i)

      // Cancel invoice first
      await cancelInvoiceRecord(activeInv.id, 'Entered by mistake')

      // Now remove is allowed
      const result = await removeInvoiceRecord(activeInv.id)
      expect(result).toBe(true)

      // Trying to remove non-existent invoice returns false
      expect(await removeInvoiceRecord('INV-NON-EXISTENT')).toBe(false)
    })
  })

  describe('UI workflow in Billing → Invoices', () => {
    it('allows cancelling an invoice from the drawer with reason confirmation', async () => {
      const inv = createItemisedInvoice({
        patientId: 'pt-1001',
        items: [{ id: 'srv-1', name: 'Surgical Extraction', qty: 1, unitPrice: 3500, discount: 0, gstRate: 0 }],
      })

      render(
        <MemoryRouter>
          <InvoicesPage />
        </MemoryRouter>
      )

      // Click the invoice row to open the details drawer
      const invoiceRow = screen.getByText(inv.id)
      fireEvent.click(invoiceRow)

      // Wait for invoice drawer to appear
      const drawer = await screen.findByRole('dialog', { name: new RegExp(`Invoice ${inv.id}`, 'i') })
      expect(drawer).toBeInTheDocument()

      // Collect button should be available initially
      expect(within(drawer).getByRole('button', { name: /Collect/i })).toBeInTheDocument()

      // Find and click Cancel Invoice button
      const cancelBtn = within(drawer).getByRole('button', { name: /Cancel Invoice/i })
      expect(cancelBtn).toBeInTheDocument()
      fireEvent.click(cancelBtn)

      // Cancel Invoice Modal should appear
      const modal = await screen.findByRole('dialog', { name: /Cancel Invoice/i })
      expect(modal).toBeInTheDocument()
      expect(within(modal).getByText(/Cancellation Reason/i)).toBeInTheDocument()

      // The confirm button should be disabled when reason is empty
      const confirmBtn = within(modal).getByRole('button', { name: /Confirm Cancellation/i })
      expect(confirmBtn).toBeDisabled()

      // Click a suggested quick reason chip
      const chip = within(modal).getByRole('button', { name: /Duplicate billing entry/i })
      fireEvent.click(chip)

      // Reason should be populated and confirm button enabled
      expect(confirmBtn).not.toBeDisabled()

      // Confirm cancellation
      fireEvent.click(confirmBtn)

      // Modal closes, drawer updates
      await waitFor(() => {
        expect(screen.queryByRole('dialog', { name: /Cancel Invoice$/i })).not.toBeInTheDocument()
      })

      // Drawer now shows Cancellation banner with reason
      await waitFor(() => {
        expect(within(drawer).getAllByText(/Invoice Cancelled/i).length).toBeGreaterThan(0)
        expect(within(drawer).getAllByText(/Duplicate billing entry/i).length).toBeGreaterThan(0)
      })

      // Collect button is removed/prohibited
      expect(within(drawer).queryByRole('button', { name: /Collect/i })).not.toBeInTheDocument()

      // Status pill shows Cancelled
      expect(within(drawer).getAllByText(/Cancelled/i).length).toBeGreaterThan(0)
    })

    it('does not allow cancelling a paid invoice and provides the refund option instead', async () => {
      const inv = createItemisedInvoice({
        patientId: 'pt-1001',
        items: [{ id: 'srv-1', name: 'Root Canal Therapy', qty: 1, unitPrice: 5000, discount: 0, gstRate: 0 }],
        upfrontPayment: { amount: 5000, mode: 'Card' },
      })

      render(
        <MemoryRouter>
          <InvoicesPage />
        </MemoryRouter>
      )

      // Open drawer
      fireEvent.click(screen.getByText(inv.id))
      const drawer = await screen.findByRole('dialog', { name: new RegExp(`Invoice ${inv.id}`, 'i') })

      // Cancel Invoice button MUST NOT be present for paid invoices
      expect(within(drawer).queryByRole('button', { name: /Cancel Invoice/i })).not.toBeInTheDocument()

      // The Refund option MUST be available
      expect(within(drawer).getAllByRole('button', { name: /Refund/i }).length).toBeGreaterThan(0)
    })

    it('persists cancelled status, reason, and cancellation date in store', async () => {
      const inv = createItemisedInvoice({
        patientId: 'pt-1001',
        items: [{ id: 'srv-1', name: 'Consultation', qty: 1, unitPrice: 500, discount: 0, gstRate: 0 }],
      })

      await cancelInvoiceRecord(inv.id, 'Patient did not attend')

      // Re-render InvoicesPage (simulating page reload)
      render(
        <MemoryRouter>
          <InvoicesPage />
        </MemoryRouter>
      )

      // Cancelled pill in list
      expect(screen.getAllByText('Cancelled').length).toBeGreaterThan(1)

      // Open drawer
      fireEvent.click(screen.getByText(inv.id))
      const drawer = await screen.findByRole('dialog', { name: new RegExp(`Invoice ${inv.id}`, 'i') })

      // Banner shows reason
      expect(within(drawer).getAllByText(/Invoice Cancelled/i).length).toBeGreaterThan(0)
      expect(within(drawer).getAllByText(/Patient did not attend/i).length).toBeGreaterThan(0)
    })

    it('renders Remove Invoice button in drawer footer for cancelled invoices', async () => {
      const inv = createItemisedInvoice({
        patientId: 'pt-1001',
        items: [{ id: 'srv-1', name: 'Extraction', qty: 1, unitPrice: 2000, discount: 0, gstRate: 0 }],
      })

      await cancelInvoiceRecord(inv.id, 'Duplicate consultation')

      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

      render(
        <MemoryRouter>
          <InvoicesPage />
        </MemoryRouter>
      )

      // Table has standard 6 columns (no extra Action column)
      expect(screen.queryByRole('columnheader', { name: /Action/i })).not.toBeInTheDocument()

      // Open drawer
      fireEvent.click(screen.getByText(inv.id))
      const drawer = await screen.findByRole('dialog', { name: new RegExp(`Invoice ${inv.id}`, 'i') })

      // Footer has Remove Invoice button
      const removeInvoiceBtn = within(drawer).getByRole('button', { name: /Remove Invoice/i })
      expect(removeInvoiceBtn).toBeInTheDocument()

      fireEvent.click(removeInvoiceBtn)
      expect(confirmSpy).toHaveBeenCalled()

      // Drawer closes and invoice is permanently removed
      await waitFor(() => {
        expect(screen.queryByRole('dialog', { name: new RegExp(`Invoice ${inv.id}`, 'i') })).not.toBeInTheDocument()
        expect(screen.queryByText(inv.id)).not.toBeInTheDocument()
      })

      confirmSpy.mockRestore()
    })
  })
})
