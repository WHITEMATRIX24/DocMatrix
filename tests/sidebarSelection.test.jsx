import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { FEATURE_REGISTRY, getLaunchFeatures } from '@/features/registry'
import { getActiveFeatureForPath, isFeatureActive, resolveFeatureRoute } from '@/features/navigationMatcher'
import StaffPortal from '@/StaffPortal'
import App from '@/App'
import { DEMO_USERS } from '@/mocks/auth'

describe('Global Sidebar Selection & Navigation Engine', () => {
  const launchFeatures = getLaunchFeatures()

  beforeEach(() => {
    sessionStorage.clear()
    window.location.hash = ''
  })

  // 1. UNIT TESTS: Matcher Precision across all 55 Features
  it('correctly maps every registered launch feature route to its exact feature ID', () => {
    expect(launchFeatures.length).toBe(55)

    for (const feat of launchFeatures) {
      const sampleUrl = resolveFeatureRoute(feat.route, feat.area)
      const matched = getActiveFeatureForPath(sampleUrl, launchFeatures)

      expect(matched, `Expected route ${sampleUrl} to match feature ${feat.id}`).toBeDefined()
      expect(matched?.id).toBe(feat.id)
      expect(isFeatureActive(feat.id, sampleUrl, launchFeatures)).toBe(true)

      // Ensure no other feature claims this URL
      const otherFeatures = launchFeatures.filter((f) => f.id !== feat.id)
      for (const other of otherFeatures) {
        expect(isFeatureActive(other.id, sampleUrl, launchFeatures)).toBe(false)
      }
    }
  })

  // 2. DISCRIMINATION: Overlapping & Nested Routes
  it('strictly isolates overlapping and nested route pairs', () => {
    // A. Billing: /billing/invoices vs /billing/invoices/new
    const invoicesFeature = getActiveFeatureForPath('/billing/invoices', launchFeatures)
    expect(invoicesFeature?.id).toBe('bill.invoices')

    const newInvoiceFeature = getActiveFeatureForPath('/billing/invoices/new', launchFeatures)
    expect(newInvoiceFeature?.id).toBe('bill.invoice-new')

    // B. Patients: /patients/list vs /patients/:id vs /patients/:id/timeline vs /patients/:id/tooth-chart
    const patList = getActiveFeatureForPath('/patients/list', launchFeatures)
    expect(patList?.id).toBe('pat.list')

    const patProfile = getActiveFeatureForPath('/patients/pt-1001', launchFeatures)
    expect(patProfile?.id).toBe('pat.profile')

    const patTimeline = getActiveFeatureForPath('/patients/pt-1001/timeline', launchFeatures)
    expect(patTimeline?.id).toBe('pat.timeline')

    const patToothChart = getActiveFeatureForPath('/patients/pt-1001/tooth-chart', launchFeatures)
    expect(patToothChart?.id).toBe('pat.toothchart')

    const patDocs = getActiveFeatureForPath('/patients/pt-1001/documents', launchFeatures)
    expect(patDocs?.id).toBe('pat.documents')

    const patConsents = getActiveFeatureForPath('/patients/pt-1001/consents', launchFeatures)
    expect(patConsents?.id).toBe('pat.consents')

    const patPending = getActiveFeatureForPath('/patients/pt-1001/pending-treatments', launchFeatures)
    expect(patPending?.id).toBe('pat.pending')

    // C. Appointments: booking, details, and enquiries
    const apptNew = getActiveFeatureForPath('/appointments/new', launchFeatures)
    expect(apptNew?.id).toBe('appt.new')

    const apptDetail = getActiveFeatureForPath('/appointments/apt-101', launchFeatures)
    expect(apptDetail?.id).toBe('appt.detail')

    const apptEnquiries = getActiveFeatureForPath('/appointments/missed-enquiries', launchFeatures)
    expect(apptEnquiries?.id).toBe('appt.enquiries')
  })

  // 3. EDGE CASES: Root, Dashboard, Query Parameters & Unknown Routes
  it('handles root, dashboard, query parameters and unknown routes cleanly', () => {
    // Dashboard -> null
    expect(getActiveFeatureForPath('/dashboard', launchFeatures)).toBeNull()
    expect(getActiveFeatureForPath('/', launchFeatures)).toBeNull()

    // Query parameters should be ignored when determining active leaf
    expect(getActiveFeatureForPath('/appointments/new?token=T-01&filter=all', launchFeatures)?.id).toBe('appt.new')
    expect(getActiveFeatureForPath('/billing/invoices?page=2#summary', launchFeatures)?.id).toBe('bill.invoices')

    // Unknown routes should return null (no false active selection)
    expect(getActiveFeatureForPath('/unregistered-route-xyz', launchFeatures)).toBeNull()
    expect(getActiveFeatureForPath('/patients/nonexistent/sub/path/123', launchFeatures)).toBeNull()
  })

  // 4. INTEGRATION: Single-Selection Enforcement in Rendered Sidebar
  it('enforces that EXACTLY ONE sidebar button is active for any active submodule route', () => {
    const testRoutes = [
      { url: '/appointments/new', expectedId: 'appt.new' },
      { url: '/appointments/new', expectedId: 'appt.new' },
      { url: '/patients/list', expectedId: 'pat.list' },
      { url: '/patients/new', expectedId: 'pat.new' },
      { url: '/clinical/prescriptions', expectedId: 'clin.prescriptions' },
      { url: '/clinical/notes', expectedId: 'clin.notes' },
      { url: '/billing/invoices', expectedId: 'bill.invoices' },
      { url: '/billing/dues', expectedId: 'bill.dues' },
      { url: '/accounts/ledgers', expectedId: 'acc.ledgers' },
      { url: '/inventory/items', expectedId: 'inv.items' },
      { url: '/whatsapp/automation', expectedId: 'wa.automation' },
      { url: '/website/settings', expectedId: 'web.settings' },
      { url: '/reports/revenue', expectedId: 'rep.revenue' },
      { url: '/settings/clinic', expectedId: 'set.clinic' }
    ]

    for (const testCase of testRoutes) {
      const { unmount } = render(
        <MemoryRouter initialEntries={[testCase.url]}>
          <StaffPortal user={DEMO_USERS.ORGANIZATION_ADMIN} />
        </MemoryRouter>
      )

      // Find all sidebar buttons that have active background styling
      const activeButtons = screen.getAllByRole('button').filter((btn) => {
        const bg = btn.style.background || ''
        return bg.includes('rgba(0, 136, 145, 0.1)')
      })

      // Exactly ONE button must be active
      expect(activeButtons.length, `Expected exactly 1 active button for route ${testCase.url}`).toBe(1)
      expect(activeButtons[0]).toHaveAttribute('data-testid', `sidebar-link-${testCase.expectedId}`)

      unmount()
    }
  })

  // 5. SEQUENTIAL NAVIGATION: Clean Transfer of Selection
  it('cleanly transfers active state when navigating sequentially across submodules', async () => {
    sessionStorage.setItem('docmatrix-demo-session', 'usr-101')
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    )

    // 1. Dashboard: no submodule button active
    const apptBtn = screen.getByTestId('sidebar-link-appt.new')
    expect(apptBtn.style.background).not.toContain('rgba(0, 136, 145, 0.1)')

    // 2. Click Appointments -> Book appointment
    fireEvent.click(apptBtn)
    await waitFor(() => {
      expect(apptBtn.style.background).toContain('rgba(0, 136, 145, 0.1)')
    })

    // 3. Click Patients -> Patients list
    const patListBtn = screen.getByTestId('sidebar-link-pat.list')
    fireEvent.click(patListBtn)
    await waitFor(() => {
      expect(patListBtn.style.background).toContain('rgba(0, 136, 145, 0.1)')
      // Previous button must immediately lose active state
      expect(apptBtn.style.background).not.toContain('rgba(0, 136, 145, 0.1)')
    })

    // 4. Click Billing -> Invoices
    const billingBtn = screen.getByTestId('sidebar-link-bill.invoices')
    fireEvent.click(billingBtn)
    await waitFor(() => {
      expect(billingBtn.style.background).toContain('rgba(0, 136, 145, 0.1)')
      expect(patListBtn.style.background).not.toContain('rgba(0, 136, 145, 0.1)')
      expect(apptBtn.style.background).not.toContain('rgba(0, 136, 145, 0.1)')
    })
  })
})
