import { browserSessionStorage } from '@/services/browserStorage';
import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { InvoicesPage } from '@/pages/billing/InvoicesPage'
import {
  createItemisedInvoice,
  resetStoreForTesting,
} from '@/services/clinicStore'

describe('InvoiceDrawer scrolling and layout positioning', () => {
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

  it('renders invoice drawer with independent scrollable body and fixed header & footer', async () => {
    // Create an invoice with multiple line items to simulate tall content
    const inv = createItemisedInvoice({
      patientId: 'pt-1001',
      items: [
        { id: 'srv-1', name: 'Comprehensive Dental Examination', qty: 1, unitPrice: 500, discount: 0, gstRate: 0 },
        { id: 'srv-2', name: 'Scaling & Root Planing', qty: 2, unitPrice: 1500, discount: 0, gstRate: 0 },
        { id: 'srv-3', name: 'Composite Resin Restoration', qty: 3, unitPrice: 1200, discount: 0, gstRate: 0 },
        { id: 'srv-4', name: 'Root Canal Obturation (Multi-Rooted)', qty: 1, unitPrice: 4500, discount: 0, gstRate: 0 },
        { id: 'srv-5', name: 'Zirconia Crown Placement', qty: 1, unitPrice: 8000, discount: 500, gstRate: 18 },
      ],
      notes: 'Patient advised to complete post-operative follow-up in 5 days. Avoid hard foods.',
    })

    render(
      <MemoryRouter>
        <InvoicesPage />
      </MemoryRouter>
    )

    // Open drawer
    const row = screen.getByText(inv.id)
    fireEvent.click(row)

    const drawer = await screen.findByRole('dialog', { name: new RegExp(`Invoice ${inv.id}`, 'i') })
    expect(drawer).toBeInTheDocument()
    expect(drawer).toHaveClass('bill-drawer')
    expect(drawer).toHaveClass('bill-drawer-redesign')

    // Parent overlay must have bill-overlay-side
    const overlay = drawer.parentElement
    expect(overlay).toHaveClass('bill-overlay-side')

    // Header must exist with invoice badge & close button
    const header = drawer.querySelector('header.bill-drawer-head')
    expect(header).toBeInTheDocument()
    expect(within(header).getByText(inv.id)).toBeInTheDocument()
    expect(within(header).getByRole('button', { name: /Close invoice panel/i })).toBeInTheDocument()

    // Scrollable content body must exist with all sections
    const body = drawer.querySelector('.bill-drawer-body')
    expect(body).toBeInTheDocument()
    expect(within(body).getByText('Services & Treatments')).toBeInTheDocument()
    expect(within(body).getByText('Financial Summary')).toBeInTheDocument()
    expect(within(body).getByText('Payment History')).toBeInTheDocument()
    expect(within(body).getByText('Zirconia Crown Placement')).toBeInTheDocument()

    // Footer actions must be positioned outside the scrollable body
    const footer = drawer.querySelector('footer.bill-drawer-footer')
    expect(footer).toBeInTheDocument()
    expect(body.contains(footer)).toBe(false)
    expect(within(footer).getByRole('button', { name: /Print \/ PDF/i })).toBeInTheDocument()
    expect(within(footer).getByRole('button', { name: /Close/i })).toBeInTheDocument()
    expect(within(footer).getByRole('button', { name: /Cancel Invoice/i })).toBeInTheDocument()

    // Body responds to scroll events (mousewheel / trackpad)
    fireEvent.scroll(body, { target: { scrollTop: 250 } })
    expect(body).toBeInTheDocument()
  })
})
