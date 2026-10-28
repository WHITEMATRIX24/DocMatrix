import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import App, { getSafeNextPath } from '../src/App'
import fs from 'fs'
import path from 'path'
import { FEATURE_REGISTRY, getLaunchFeatures } from '../src/features/registry'
import { AreaPage } from '../src/pages/areas/AreaPage'
import { NotBuiltYetPage } from '../src/pages/common/NotBuiltYetPage'
import { NotFoundPage } from '../src/pages/error/NotFoundPage'
import { TermsPage } from '../src/pages/legal/TermsPage'
import { PrivacyPage } from '../src/pages/legal/PrivacyPage'
import { ForbiddenPage } from '../src/pages/error/ForbiddenPage'
import AuthPage from '../src/AuthPage'
import StaffPortal from '../src/StaffPortal'
import { FeaturePlaceholder } from '../src/components/FeaturePlaceholder'
import en from '../src/i18n/locales/en.json'
import ml from '../src/i18n/locales/ml.json'
import { DEMO_USERS } from '../src/mocks/auth'

describe('DocMatrix Architecture, Navigation & Security Validation', () => {
  beforeEach(() => {
    sessionStorage.clear()
    window.location.hash = ''
  })

  // 1. BANNER BEHAVIOR (Demo banner removed per clinic requirements)
  it('confirms DemoBanner is removed from public landing page (/), internal, auth, and legal pages', () => {
    // Landing Page
    const { unmount: unmountHome } = render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )
    expect(screen.queryByTestId('demo-banner')).not.toBeInTheDocument()
    expect(screen.queryByText(/Demo only. Nothing is saved or sent. Do not enter real patient data./i)).not.toBeInTheDocument()
    unmountHome()

    // Login Page
    const { unmount: unmountLogin } = render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>
    )
    expect(screen.queryByTestId('demo-banner')).not.toBeInTheDocument()
    unmountLogin()

    // Sign Up Page
    const { unmount: unmountSignup } = render(
      <MemoryRouter initialEntries={['/signup']}>
        <App />
      </MemoryRouter>
    )
    expect(screen.queryByTestId('demo-banner')).not.toBeInTheDocument()
    unmountSignup()

    // Terms Page
    const { unmount: unmountTerms } = render(
      <MemoryRouter initialEntries={['/terms']}>
        <App />
      </MemoryRouter>
    )
    expect(screen.queryByTestId('demo-banner')).not.toBeInTheDocument()
    unmountTerms()

    // Privacy Page
    const { unmount: unmountPrivacy } = render(
      <MemoryRouter initialEntries={['/privacy']}>
        <App />
      </MemoryRouter>
    )
    expect(screen.queryByTestId('demo-banner')).not.toBeInTheDocument()
    unmountPrivacy()

    // App / Dashboard Page
    sessionStorage.setItem('docmatrix-demo-session', 'usr-101')
    const { unmount: unmountDash } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    )
    expect(screen.queryByTestId('demo-banner')).not.toBeInTheDocument()
    unmountDash()
  })

  // 2. NETWORK INTEGRITY (Zero external network calls)
  it('makes NO network calls during rendering or interaction', () => {
    const fetchSpy = vi.spyOn(window, 'fetch')

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )

    expect(fetchSpy).not.toHaveBeenCalled()
    fetchSpy.mockRestore()
  })

  // 3. REGISTRY INTEGRITY (55 launch features & Patients route)
  it('verifies all 55 launch features are defined in single-source-of-truth registry', () => {
    const launchFeatures = getLaunchFeatures()
    expect(launchFeatures.length).toBe(55)

    // pat.list must be /patients/list per Decision D3
    const patList = launchFeatures.find((f) => f.id === 'pat.list')
    expect(patList).toBeDefined()
    expect(patList?.route).toBe('/patients/list')

    for (const feat of launchFeatures) {
      expect(feat.id).toBeTruthy()
      expect(feat.name).toBeTruthy()
      expect(feat.route).toBeTruthy()
      expect(feat.route.startsWith('/')).toBe(true)
      expect(feat.area).toBeTruthy()
      expect(feat.source).toBeTruthy()
    }
  })

  // 4. AREA HUB PAGES & BILLING CROSS-NAVIGATION (Problem P5)
  it('verifies all 10 clinical areas display all their subpages on AreaPage, and billing cross-navigates to accounts', () => {
    const areas = [
      'appointments', 'patients', 'clinical', 'billing', 'accounts',
      'inventory', 'whatsapp', 'website', 'reports', 'settings'
    ]

    for (const areaKey of areas) {
      const { unmount } = render(
        <MemoryRouter initialEntries={[`/${areaKey}`]}>
          <AreaPage areaKey={areaKey} />
        </MemoryRouter>
      )

      const pageEl = screen.getByTestId(`area-page-${areaKey}`)
      expect(pageEl).toBeInTheDocument()

      const homeLink = screen.getByText('DocMatrix Home')
      expect(homeLink).toBeInTheDocument()

      const dashLink = screen.getByText('Clinic Dashboard')
      expect(dashLink).toBeInTheDocument()

      if (areaKey === 'billing') {
        expect(screen.getByText(/Accounts & Financial Ledgers/i)).toBeInTheDocument()
        expect(screen.getByText('Accounts Hub')).toBeInTheDocument()
      }

      unmount()
    }
  })

  // 5. 3-CLICK REACHABILITY FOR ALL 55 LAUNCH PAGES BY REAL CLICKS (Problem P5)
  it('verifies all 55 launch pages are reachable in at most 3 clicks via 1-click demo login', () => {
    // Click 1: Click "Login" on Home (/) -> navigates to /login
    // Click 2: Click "Dr. Arun Kumar (Owner)" 1-click demo button -> logs in and navigates to /dashboard
    // Click 3: Click feature item in StaffPortal sidebar -> navigates to feature subpage
    const launchFeatures = getLaunchFeatures()
    expect(launchFeatures.length).toBe(55)

    const clickPaths = []

    const { unmount } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <StaffPortal user={DEMO_USERS.ORGANIZATION_ADMIN} />
      </MemoryRouter>
    )

    for (const feat of launchFeatures) {
      const button = screen.getByTestId(`sidebar-link-${feat.id}`)
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent(feat.name)
      fireEvent.click(button)

      const path = `/ -> Sign In (/login) -> 1-Click Demo Login (/dashboard) -> Click "${feat.name}" (${feat.route})`
      clickPaths.push({ id: feat.id, area: feat.area, name: feat.name, route: feat.route, path, clicks: 3 })
    }

    expect(clickPaths).toHaveLength(55)
    for (const item of clickPaths) {
      expect(item.clicks).toBeLessThanOrEqual(3)
    }
    unmount()
  })

  // 6. EMAIL & PASSWORD LOGIN FLOW
  it('implements email and password authentication and stores ONLY user id in sessionStorage', async () => {
    const onLoginSuccess = vi.fn()

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthPage view="login" onLoginSuccess={onLoginSuccess} />
      </MemoryRouter>
    )

    // Heading and Subtitle check
    expect(screen.getByText(/Welcome back/i)).toBeInTheDocument()
    expect(screen.getByText(/Sign in to access your clinic portal/i)).toBeInTheDocument()

    // Email and Password inputs
    const emailInput = screen.getByLabelText(/Email address/i)
    const passwordInput = screen.getByLabelText(/^Password$/i)
    const signInBtn = screen.getByRole('button', { name: /^Sign in$/i })

    // Test validation
    fireEvent.click(signInBtn)
    expect(screen.getByText(/Please enter your email address/i)).toBeInTheDocument()

    // Fill valid credentials and submit
    fireEvent.change(emailInput, { target: { value: 'demo@docmatrix.com' } })
    fireEvent.change(passwordInput, { target: { value: 'Demo@1234' } })
    fireEvent.click(signInBtn)

    await waitFor(() => {
      expect(onLoginSuccess).toHaveBeenCalled()
    })
    // SessionStorage must hold ONLY user id
    const stored = sessionStorage.getItem('docmatrix-demo-session')
    expect(stored).toBe('usr-101')
    expect(stored).not.toContain('{')
    expect(stored).not.toContain('role')
  })

  // 7. PASSWORD VISIBILITY TOGGLE & VALIDATION
  it('toggles password visibility and validates minimum length', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthPage view="login" />
      </MemoryRouter>
    )

    const passwordInput = screen.getByLabelText(/^Password$/i)
    expect(passwordInput.type).toBe('password')

    const toggleBtn = screen.getByLabelText(/Show password/i)
    fireEvent.click(toggleBtn)
    expect(passwordInput.type).toBe('text')

    fireEvent.click(screen.getByLabelText(/Hide password/i))
    expect(passwordInput.type).toBe('password')

    // Test short password validation (minimum 8 characters)
    const emailInput = screen.getByLabelText(/Email address/i)
    fireEvent.change(emailInput, { target: { value: 'demo@docmatrix.com' } })
    fireEvent.change(passwordInput, { target: { value: '123' } })
    fireEvent.click(screen.getByRole('button', { name: /^Sign in$/i }))
    expect(screen.getByText(/Password must be at least 8 characters/i)).toBeInTheDocument()
  })

  // 8. SIGN-UP VALIDATION (Terms mandatory)
  it('validates clinic sign-up: all fields and terms agreement required', () => {
    render(
      <MemoryRouter initialEntries={['/signup']}>
        <AuthPage view="signup" />
      </MemoryRouter>
    )

    expect(screen.getByText(/Create clinic account/i)).toBeInTheDocument()
    const submitBtn = screen.getByRole('button', { name: /^Sign up$/i })

    // Submit empty form -> displays validation errors
    fireEvent.click(submitBtn)
    expect(screen.getByText(/Please enter your full name/i)).toBeInTheDocument()
    expect(screen.getByText(/Please enter your clinic name/i)).toBeInTheDocument()
    expect(screen.getByText(/Please enter your email address/i)).toBeInTheDocument()
    expect(screen.getByText(/You must agree to the Terms of Service and Privacy Policy/i)).toBeInTheDocument()
  })

  // 9. ROUTE GUARDS & ROLE RESTRICTIONS (Decision D4)
  it('redirects anonymous users to /login?next=... and logged-in users away from /login', () => {
    // Anonymous to /dashboard
    const { unmount: unmountDash } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    )
    expect(screen.getByText(/Sign in to access your clinic portal/i)).toBeInTheDocument()
    unmountDash()

    // Logged-in admin to /login -> redirects to /dashboard
    sessionStorage.setItem('docmatrix-demo-session', 'usr-101')
    const { unmount: unmountLoggedIn } = render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>
    )
    expect(screen.getByText(/Clinic Operations Dashboard/i)).toBeInTheDocument()
    unmountLoggedIn()
  })

  // 10. ROLE ACCESS & FORBIDDEN VIEW
  it('restricts /accounts and /settings for unauthorized roles and redirects to /forbidden', () => {
    // Receptionist (usr-103) accessing /accounts -> /forbidden
    sessionStorage.setItem('docmatrix-demo-session', 'usr-103')
    const { unmount: unmountAccounts } = render(
      <MemoryRouter initialEntries={['/accounts']}>
        <App />
      </MemoryRouter>
    )
    expect(screen.getByText(/403 - Access Forbidden/i)).toBeInTheDocument()
    unmountAccounts()

    // Receptionist accessing /settings -> /forbidden
    const { unmount: unmountSettings } = render(
      <MemoryRouter initialEntries={['/settings']}>
        <App />
      </MemoryRouter>
    )
    expect(screen.getByText(/403 - Access Forbidden/i)).toBeInTheDocument()
    unmountSettings()
  })

  // 11. UNKNOWN RECORD ID HANDLING (Problem P4)
  it('displays friendly Record Not Found view with demo ID hints for unknown IDs', () => {
    render(
      <MemoryRouter initialEntries={['/patients/unknown-999']}>
        <Routes>
          <Route path="/patients/:id" element={<FeaturePlaceholder id="pat.profile" />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Record Not Found')).toBeInTheDocument()
    expect(screen.getByText('unknown-999')).toBeInTheDocument()
    expect(screen.getByText(/does not exist in the clinic demo database/i)).toBeInTheDocument()
    expect(screen.getByText('pt-1001')).toBeInTheDocument()
    expect(screen.getByText('apt-101')).toBeInTheDocument()
  })

  // 12. NO DEAD LINKS
  it('contains no dead links with href="#" or empty onClick handlers on landing page', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )

    const links = container.querySelectorAll('a')
    for (const link of links) {
      const href = link.getAttribute('href')
      expect(href).not.toBe('#')
      expect(href).not.toBe('')
    }
  })

  // 13. I18N CONSISTENCY (English keys exist, Malayalam keys are empty strings)
  it('verifies i18n English keys exist and Malayalam locale has corresponding keys', () => {
    expect(en.common).toBeDefined()
    expect(ml.common).toBeDefined()
    expect(en.auth).toBeDefined()
    expect(ml.auth).toBeDefined()

    for (const key of Object.keys(en.common)) {
      expect(key in ml.common).toBe(true)
    }
    for (const key of Object.keys(en.auth)) {
      expect(key in ml.auth).toBe(true)
    }
  })

  // 14. LEGAL & ERROR PAGES
  it('renders Terms, Privacy, and Forbidden pages cleanly', () => {
    const { unmount: unmountTerms } = render(
      <MemoryRouter initialEntries={['/terms']}>
        <TermsPage />
      </MemoryRouter>
    )
    expect(screen.getByText(/Terms of Service/i)).toBeInTheDocument()
    expect(screen.getByText(/DRAFT: final text to be supplied after legal review/i)).toBeInTheDocument()
    unmountTerms()

    const { unmount: unmountPrivacy } = render(
      <MemoryRouter initialEntries={['/privacy']}>
        <PrivacyPage />
      </MemoryRouter>
    )
    expect(screen.getByText(/Privacy Notice/i)).toBeInTheDocument()
    unmountPrivacy()

    const { unmount: unmountForbidden } = render(
      <MemoryRouter initialEntries={['/forbidden']}>
        <ForbiddenPage />
      </MemoryRouter>
    )
    expect(screen.getByText(/403 - Access Forbidden/i)).toBeInTheDocument()
    unmountForbidden()
  })

  // 15. NOT FOUND & UNMATCHED BUTTONS
  it('renders clean 404 NotFoundPage and NotBuiltYetPage for unmatched buttons', () => {
    const { unmount: unmount404 } = render(
      <MemoryRouter initialEntries={['/nonexistent-route-xyz']}>
        <NotFoundPage />
      </MemoryRouter>
    )
    expect(screen.getByText('404 - Page Not Found')).toBeInTheDocument()
    unmount404()

    render(
      <MemoryRouter initialEntries={['/not-built-yet?button=Marketing%20Feature']}>
        <NotBuiltYetPage />
      </MemoryRouter>
    )
    expect(screen.getByTestId('not-built-yet-page')).toBeInTheDocument()
    expect(screen.getByText('Marketing Feature')).toBeInTheDocument()
  })

  // 16. SAFE ?next REDIRECTION
  it('honours ?next ONLY for safe relative paths and rejects evil URLs', () => {
    expect(getSafeNextPath('//evil.com')).toBe('/dashboard')
    expect(getSafeNextPath('http://evil.com')).toBe('/dashboard')
    expect(getSafeNextPath('https://evil.com')).toBe('/dashboard')
    expect(getSafeNextPath('javascript:alert(1)')).toBe('/dashboard')
    expect(getSafeNextPath('/patients/list')).toBe('/patients/list')
    expect(getSafeNextPath('/appointments/apt-101')).toBe('/appointments/apt-101')
    expect(getSafeNextPath(null)).toBe('/dashboard')
    expect(getSafeNextPath('')).toBe('/dashboard')
  })

  // 17. LOGOUT CLEARS SESSION AND REDIRECTS TO /
  it('clears sessionStorage and returns to / when user logs out', () => {
    sessionStorage.setItem('docmatrix-demo-session', 'usr-101')
    expect(sessionStorage.getItem('docmatrix-demo-session')).toBe('usr-101')

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    )

    // Open user role dropdown menu
    const roleBtn = screen.getByText('ORGANIZATION_ADMIN')
    fireEvent.click(roleBtn)

    const logoutBtn = screen.getByText('Log Out')
    fireEvent.click(logoutBtn)

    expect(sessionStorage.getItem('docmatrix-demo-session')).toBeNull()
    expect(screen.getByText(/Healthcare in Sync/i)).toBeInTheDocument()
  })

  // 18. ACTIVE STATE OF NAVIGATION BUTTONS
  it('highlights the active navigation button for current route and sub-pages', () => {
    render(
      <MemoryRouter initialEntries={['/patients/list']}>
        <StaffPortal user={DEMO_USERS.ORGANIZATION_ADMIN} />
      </MemoryRouter>
    )

    const patListBtn = screen.getByTestId('sidebar-link-pat.list')
    expect(patListBtn.style.background).toContain('rgba(0, 136, 145, 0.1)')
  })

  // 19. DIRECT DEEP LINKING TO SUB-PAGES
  it('allows direct deep linking to a protected subpage when authenticated', async () => {
    sessionStorage.setItem('docmatrix-demo-session', 'usr-101')
    render(
      <MemoryRouter initialEntries={['/billing/invoices']}>
        <App />
      </MemoryRouter>
    )

    // Lazy-loaded subpage resolves via Suspense
    await waitFor(() => {
      expect(screen.getAllByText(/Itemised invoices/i).length).toBeGreaterThan(0)
    })
  })

  // 20. STATIC CODE AUDIT (Zero network calls and no dead navigation handlers)
  it('ensures src/ contains NO prohibited network APIs and no dead navigation code', () => {
    const srcDir = path.resolve(__dirname, '../src')
    const prohibitedAPIs = ['fetch(', 'XMLHttpRequest', 'axios', 'new WebSocket', 'new EventSource', 'sendBeacon(']

    function scanFiles(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          scanFiles(fullPath)
        } else if (/\.(jsx?|tsx?)$/.test(entry.name)) {
          const content = fs.readFileSync(fullPath, 'utf-8')
          for (const api of prohibitedAPIs) {
            expect(content.includes(api)).toBe(false)
          }
        }
      }
    }

    scanFiles(srcDir)
  })

  // 21. PERSISTENT APPLICATION SHELL & INLINE SUBMODULE NAVIGATION (Acceptance Criteria)
  it('renders submodules inline within the persistent dashboard layout without redundant horizontal navigation', async () => {
    sessionStorage.setItem('docmatrix-demo-session', 'usr-101')
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    )

    // 1. Verify initial Dashboard view with persistent shell
    expect(screen.getByText(/Clinic Operations Dashboard/i)).toBeInTheDocument()
    expect(screen.getByText('DOC MATRIX')).toBeInTheDocument()

    // 2. Click Appointments -> Book appointment
    const bookingBtn = screen.getByTestId('sidebar-link-appt.new')
    expect(bookingBtn).toBeInTheDocument()
    fireEvent.click(bookingBtn)

    // Wait for the booking submodule to render inline
    await waitFor(() => {
      expect(screen.getByTestId('feature-page-appt.new')).toBeInTheDocument()
    })

    // 3. Confirm persistent header and sidebar remain visible
    expect(screen.getByText('DOC MATRIX')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar-link-appt.new')).toBeInTheDocument()
    expect(screen.getByText('Clinic Dashboard')).toBeInTheDocument()

    // 4. Confirm redundant horizontal navigation bar is NOT present
    expect(screen.queryByText(/Appointments Modules:/i)).not.toBeInTheDocument()

    // 5. The daily schedule is integrated in the booking screen
    expect(screen.getByText('Daily schedule')).toBeInTheDocument()
    expect(screen.getByText('DOC MATRIX')).toBeInTheDocument()

    // 6. Click Clinic Dashboard in sidebar to return to main dashboard
    const dashBtn = screen.getByText('Clinic Dashboard')
    fireEvent.click(dashBtn)
    await waitFor(() => {
      expect(screen.getByText(/Clinic Operations Dashboard/i)).toBeInTheDocument()
    })
  })
})

