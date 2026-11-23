import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '@/App'
import { seedClinicFixture } from './fixtures/clinic'
const renderAt = url => render(<MemoryRouter initialEntries={[url]}><App /></MemoryRouter>)
const nav = () => screen.getByRole('navigation', { name: 'Patient Profile Sections' })
const tab = name => within(nav()).getByRole('button', { name })
beforeEach(() => seedClinicFixture())
describe('Patient profile navigation', () => {
  it('shows the current flat tab layout in order', async () => {
    renderAt('/patients/pt-1001')
    await screen.findByRole('navigation', { name: 'Patient Profile Sections' }, { timeout: 10000 })
    const buttons = within(nav()).getAllByRole('button')
    expect(buttons.map(button => button.textContent.replace(/[0-9]/g, '').trim())).toEqual([
      'Overview', 'Medical History', 'Activity', 'Billing', 'X-rays & Documents', 'Consent Records', 'Prescriptions', 'Clinical Notes', 'Treatment Plans',
    ])
    expect(buttons[0]).toHaveClass('is-active')
  })
  it('switches among clinical records without mixing their content', async () => {
    renderAt('/patients/pt-1001?tab=prescriptions')
    await screen.findByRole('heading', { name: 'Clinical Prescriptions History' })
    fireEvent.click(tab(/^Clinical Notes/))
    expect(screen.getByRole('heading', { name: 'Clinical Consultation Notes' })).toBeInTheDocument()
    expect(tab(/^Clinical Notes/)).toHaveClass('is-active')
    fireEvent.click(tab(/^Treatment Plans/))
    expect(screen.getByTestId('patient-treatment-plans-section')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Clinical Consultation Notes' })).not.toBeInTheDocument()
  })
  it('switches between documents and consent records', async () => {
    renderAt('/patients/pt-1001?tab=documents')
    await screen.findByRole('heading', { name: /Diagnostic Records & Radiographs/ })
    fireEvent.click(tab(/^Consent Records/))
    expect(screen.getByRole('heading', { name: /Informed Consent & Regulatory Records/ })).toBeInTheDocument()
    expect(tab(/^Consent Records/)).toHaveClass('is-active')
  })
  it('can switch away from a clinical deep link and return through the tab', async () => {
    renderAt('/patients/pt-1001/plans')
    await screen.findByTestId('patient-treatment-plans-section')
    fireEvent.click(tab(/^Billing/))
    expect(screen.getByRole('heading', { name: 'Billing' })).toBeInTheDocument()
    fireEvent.click(tab(/^Treatment Plans/))
    expect(screen.getByTestId('patient-treatment-plans-section')).toBeInTheDocument()
  })
  it('resolves notes, plans and consent query links to their matching tabs', async () => {
    for (const [key, name] of [['notes', /^Clinical Notes/], ['plans', /^Treatment Plans/], ['consents', /^Consent Records/]]) {
      const view = renderAt(`/patients/pt-1001?tab=${key}`)
      await screen.findByRole('navigation', { name: 'Patient Profile Sections' }, { timeout: 10000 })
      expect(tab(name)).toHaveClass('is-active')
      view.unmount()
    }
  })
  it('hides clinical tabs and rejects clinical query links for receptionists', async () => {
    seedClinicFixture('RECEPTIONIST')
    renderAt('/patients/pt-1001?tab=notes')
    await screen.findByRole('navigation', { name: 'Patient Profile Sections' }, { timeout: 10000 })
    expect(within(nav()).queryByRole('button', { name: /^Clinical Notes/ })).not.toBeInTheDocument()
    expect(within(nav()).queryByRole('button', { name: /^Prescriptions/ })).not.toBeInTheDocument()
    expect(tab(/^Overview/)).toHaveClass('is-active')
    expect(screen.queryByRole('heading', { name: 'Clinical Consultation Notes' })).not.toBeInTheDocument()
  })
})
