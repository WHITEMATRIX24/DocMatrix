import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '@/App'
import { resetStoreForTesting, getClinicSnapshot, invoiceBalance } from '@/services/clinicStore'

const renderAt = (url) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <App />
    </MemoryRouter>
  )

describe('Patient profile', () => {
  beforeEach(() => {
    sessionStorage.clear()
    sessionStorage.setItem('docmatrix-demo-session', 'usr-101')
    resetStoreForTesting()
  })

  it('shows the summary strip with the real balance due', async () => {
    renderAt('/patients/pt-1001')
    const strip = await screen.findByLabelText('Patient summary')
    const due = getClinicSnapshot().invoices.filter((i) => i.patientId === 'pt-1001').reduce((s, i) => s + invoiceBalance(i), 0)
    expect(within(strip).getByText('Balance due')).toBeInTheDocument()
    expect(within(strip).getByText(`₹${due.toLocaleString('en-IN')}`)).toBeInTheDocument()
    expect(screen.queryByText('Active Record')).not.toBeInTheDocument()
  })

  it('opens /patients/:id/timeline on the activity feed and can switch tabs away from it', async () => {
    renderAt('/patients/pt-1001/timeline')
    expect(await screen.findByRole('heading', { name: 'Patient activity' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Filter activity' })).toBeInTheDocument()

    const profileTabs = screen.getByRole('navigation', { name: 'Patient Profile Sections' })
    fireEvent.click(within(profileTabs).getByRole('button', { name: /^Billing/ }))
    expect(await screen.findByRole('heading', { name: 'Billing' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Patient activity' })).not.toBeInTheDocument()
  })

  it('collects a payment against an unpaid invoice from the Billing tab', async () => {
    renderAt('/patients/pt-1001?tab=billing')
    const collect = await screen.findAllByRole('button', { name: 'Collect' })
    fireEvent.click(collect[0])
    const dialog = await screen.findByRole('dialog', { name: 'Record payment' })
    fireEvent.click(within(dialog).getByRole('button', { name: /^Save/ }))
    await waitFor(() => {
      const due = getClinicSnapshot().invoices.filter((i) => i.patientId === 'pt-1001').reduce((s, i) => s + invoiceBalance(i), 0)
      expect(due).toBe(0)
    })
  })
})
