import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { FEATURE_REGISTRY } from '@/features/registry'
import { getActiveFeatureForPath, resolveFeatureRoute } from '@/features/navigationMatcher'
import ClinicDashboard from '@/pages/dashboard/ClinicDashboard'
import ThemeToggle, { applyTheme, getThemePreference } from '@/components/ThemeToggle'
import {
  Calendar, Users, Stethoscope, Receipt, BookOpen, Package, MessageSquare, Globe,
  BarChart3, Settings, LayoutDashboard, LogOut, Menu, X, ChevronRight, ChevronDown,
  Check, ShieldAlert, Search, Bell, CircleAlert, PackageOpen, FlaskConical,
  RefreshCw, AlertCircle,
  Sun, Moon, Monitor
} from 'lucide-react'
import { useClinicData, retrySync, isDemoSession } from '@/services/clinicStore'
import { useAdaptiveInventory } from '@/services/adaptiveInventoryStore'

function SyncStatusIndicator() {
  const { syncStatus, syncError } = useClinicData()
  const [retrying, setRetrying] = useState(false)
  const isDemo = isDemoSession()

  const handleRetry = async () => {
    setRetrying(true)
    try {
      await retrySync()
    } finally {
      setRetrying(false)
    }
  }

  if (isDemo) {
    return (
      <div
        data-testid="sync-status-indicator"
        className="dmx-sync-badge dmx-sync-demo"
        title="Running in local Demo mode"
      >
        <span className="dmx-sync-dot dmx-sync-dot-demo" />
        <span>Demo Mode</span>
      </div>
    )
  }

  if (syncStatus === 'LOADING' || retrying) {
    return (
      <div
        data-testid="sync-status-indicator"
        className="dmx-sync-badge dmx-sync-loading"
        title="Syncing clinic data with Neon PostgreSQL..."
      >
        <RefreshCw size={12} className="dmx-spin" />
        <span>Syncing…</span>
      </div>
    )
  }

  if (syncStatus === 'FAILED') {
    return (
      <div
        data-testid="sync-status-indicator"
        className="dmx-sync-badge dmx-sync-failed"
        title={syncError || 'Data synchronization failed'}
      >
        <AlertCircle size={12} />
        <span>Sync Failed</span>
        <button
          type="button"
          onClick={handleRetry}
          className="dmx-sync-retry-btn"
          aria-label="Retry data sync"
        >
          Retry
        </button>
      </div>
    )
  }

  if (syncStatus === 'AUTH_EXPIRED') {
    return (
      <div
        data-testid="sync-status-indicator"
        className="dmx-sync-badge dmx-sync-expired"
        title="Session expired. Please log in again."
      >
        <AlertCircle size={12} />
        <span>Session Expired</span>
      </div>
    )
  }

  return (
    <div
      data-testid="sync-status-indicator"
      className="dmx-sync-badge dmx-sync-ok"
      title="Authoritative Neon PostgreSQL connected and in sync"
    >
      <span className="dmx-sync-dot dmx-sync-dot-ok" />
      <span>Synced</span>
    </div>
  )
}

// Authentic DocMatrix Medical Cross Mark
function MedicalCrossMark({ light = false }) {
  return (
    <span className={`medical-cross-mark ${light ? 'mark-light' : ''}`} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  )
}

const NOTIFICATIONS = [
  { tone: 'red', icon: CircleAlert, title: 'Drug allergy warning', body: 'Meera Nambiar (Chair 1) has a penicillin allergy on record.', time: '2m' },
  { tone: 'amber', icon: PackageOpen, title: 'Reorder stock: latex gloves', body: 'Latex gloves (M) reached the reorder threshold, 2 boxes left.', time: '24m' },
  { tone: 'green', icon: FlaskConical, title: 'DentArt Kerala lab delivery', body: 'Zirconia crown for Fatima Zahra received at the front desk.', time: '1h' }
]

// Staff Roles
const DEMO_STAFF_ROLES = [
  { id: 'usr-101', role: 'ORGANIZATION_ADMIN', name: 'Clinic Administrator', phone: '+910000000101' },
  { id: 'usr-102', role: 'BRANCH_ADMIN', name: 'Branch Manager', phone: '+910000000102' },
  { id: 'usr-103', role: 'RECEPTIONIST', name: 'Receptionist / Front Desk', phone: '+910000000103' },
  { id: 'usr-104', role: 'DOCTOR', name: 'Attending Doctor', phone: '+910000000104' },
  { id: 'usr-105', role: 'NURSE', name: 'Clinic Nurse', phone: '+910000000105' },
  { id: 'usr-106', role: 'LAB_TECHNICIAN', name: 'Lab Technician', phone: '+910000000106' },
  { id: 'usr-107', role: 'PHARMACIST', name: 'Pharmacist', phone: '+910000000107' },
  { id: 'usr-108', role: 'ACCOUNTANT', name: 'Accountant', phone: '+910000000108' }
]

// All 55 Launch Features directly from single-source-of-truth registry
const ALL_LAUNCH_FEATURES = FEATURE_REGISTRY.filter((f) => f.phase === 'launch' && f.id !== 'inv.alerts')

const AREA_ICONS = {
  Appointments: Calendar,
  Patients: Users,
  Clinical: Stethoscope,
  Billing: Receipt,
  Accounts: BookOpen,
  Inventory: Package,
  WhatsApp: MessageSquare,
  Website: Globe,
  Reports: BarChart3,
  Settings: Settings
}

// Areas that open as one tabbed workspace, so the sidebar shows a single link with no sub-page list
const SINGLE_LINK_AREAS = new Set(['Billing', 'Reports'])

export default function StaffPortal({
  user = { id: 'usr-staff', name: 'Clinic Staff', role: 'DOCTOR', clinicName: 'DocMatrix Clinic' },
  onUserChange,
  onLogout,
  onReturnToWebsite,
  children
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [currentUser, setCurrentUser] = useState(user)
  const [activeRoute, setActiveRoute] = useState(() => {
    return location.pathname && location.pathname !== '/' ? location.pathname : '/dashboard'
  })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  // Phones show sub-pages as a tap-to-open list inside the drawer
  const [mobileOpenArea, setMobileOpenArea] = useState(null)
  const [lang, setLang] = useState('en')
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [headerSearch, setHeaderSearch] = useState('')
  const [headerSearchOpen, setHeaderSearchOpen] = useState(false)
  const headerSearchRef = useRef(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentTime, setCurrentTime] = useState('11:20 AM')
  const [themePref, setThemePref] = useState(getThemePreference)

  const isDemo = isDemoSession()
  const { patients = [] } = useClinicData() || {}
  const { items: inventoryItems = [] } = useAdaptiveInventory()

  const headerMatchedPatients = useMemo(() => {
    const list = Array.isArray(patients) ? patients : []
    const q = headerSearch.toLowerCase().trim()
    if (!q) return list
    const digitsOnly = q.replace(/\D/g, '')
    return list.filter((p) => {
      const fullName = `${p.firstName || ''} ${p.lastName || ''}`.trim().toLowerCase()
      const pid = (p.id || '').toLowerCase()
      const mobileDigits = (p.mobile || '').replace(/\D/g, '')
      return (
        fullName.includes(q) ||
        pid.includes(q) ||
        (digitsOnly.length >= 2 && (pid.includes(digitsOnly) || mobileDigits.includes(digitsOnly)))
      )
    })
  }, [patients, headerSearch])

  const liveNotifications = useMemo(() => {
    if (isDemo) {
      return NOTIFICATIONS
    }
    const notifs = []
    const allergyPatients = (Array.isArray(patients) ? patients : []).filter((p) => p.allergies === 'yes' || p.conditions === 'yes')
    for (const p of allergyPatients.slice(0, 3)) {
      notifs.push({
        tone: 'red',
        icon: CircleAlert,
        title: `Medical Alert: ${p.firstName} ${p.lastName}`,
        body: p.allergiesDetails || p.conditionsDetails || 'Allergies noted in medical record.',
        time: 'Active'
      })
    }
    const lowStock = inventoryItems.filter((i) => i.totalStock <= i.reorderLevel)
    for (const it of lowStock.slice(0, 3)) {
      notifs.push({
        tone: 'amber',
        icon: PackageOpen,
        title: `Low Stock: ${it.name}`,
        body: `Only ${it.totalStock} ${it.unit} left (reorder threshold: ${it.reorderLevel}).`,
        time: 'Stock alert'
      })
    }
    return notifs
  }, [isDemo, patients, inventoryItems])

  useEffect(() => {
    const handleThemeChange = (e) => {
      if (e.detail?.preference) {
        setThemePref(e.detail.preference)
      }
    }
    window.addEventListener('docmatrix-theme-changed', handleThemeChange)
    return () => window.removeEventListener('docmatrix-theme-changed', handleThemeChange)
  }, [])

  // Close popovers on click outside or Escape
  useEffect(() => {
    const handleOutsideClick = (e) => {
      const target = e.target
      if (!target?.closest?.('.notifications-box') && !target?.closest?.('.notifications-btn')) {
        setNotificationsOpen(false)
      }
      if (!target?.closest?.('.role-box') && !target?.closest?.('.role-btn')) {
        setRoleDropdownOpen(false)
      }
      if (headerSearchRef.current && !headerSearchRef.current.contains(target)) {
        setHeaderSearchOpen(false)
      }
    }
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setHeaderSearchOpen(false)
        setNotificationsOpen(false)
        setRoleDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('touchstart', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('touchstart', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  // Live timer tick
  useEffect(() => {
    const updateTime = () => {
      try {
        const d = new Date()
        setCurrentTime(d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }))
      } catch { }
    }
    updateTime()
    const interval = setInterval(updateTime, 30000)
    return () => clearInterval(interval)
  }, [])

  // Keep route synced with browser address bar
  useEffect(() => {
    if (location.pathname && location.pathname !== '/login' && location.pathname !== '/signup') {
      setActiveRoute(location.pathname)
    }
  }, [location.pathname])

  const navigateTo = (route) => {
    const targetRoute = resolveFeatureRoute(route)
    setActiveRoute(targetRoute)
    navigate(targetRoute)
    setMobileMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Group all launch features by area (Problem P5: list ALL 10 areas with their pages)
  const groupedAreas = useMemo(() => {
    const map = {}
    ALL_LAUNCH_FEATURES.forEach((f) => {
      if (f.id === 'appt.detail' || f.inNav === false || f.id === 'inv.alerts') return
      if (!map[f.area]) map[f.area] = []
      map[f.area].push(f)
    })

    // Keep only the Patients List in the sidebar; profile pages remain reachable from the list.
    if (map['Patients']) {
      map['Patients'] = map['Patients'].filter((f) => f.id === 'pat.list')
    }

    // Clinical module: exactly these three entries in this order:
    // 1. Digital Prescriptions
    // 2. Treatment Plans
    // 3. Clinical Notes
    if (map['Clinical']) {
      const clinicalOrder = ['clin.prescriptions', 'clin.plans', 'clin.notes']
      map['Clinical'] = clinicalOrder
        .map((id) => map['Clinical'].find((feat) => feat.id === id))
        .filter(Boolean)
    }

    if (map['Appointments']) {
      const hasCalendar = map['Appointments'].some((f) => f.id === 'appt.calendar')
      if (!hasCalendar) {
        map['Appointments'].unshift(
          { id: 'appt.calendar', name: 'Calendar', route: '/appointments/calendar', area: 'Appointments' },
          { id: 'appt.queue', name: 'Live queue', route: '/appointments/queue', area: 'Appointments' }
        )
      }
    }

    return map
  }, [])

  // Check role permission for active feature (Single Source of Truth)
  const activeFeature = useMemo(() => {
    if (location.pathname === '/appointments' || location.pathname === '/appointments/calendar') {
      return { id: 'appt.calendar', name: 'Calendar', route: '/appointments/calendar', area: 'Appointments' }
    }
    if (location.pathname === '/appointments/queue') {
      return { id: 'appt.queue', name: 'Live queue', route: '/appointments/queue', area: 'Appointments' }
    }
    return getActiveFeatureForPath(location.pathname || activeRoute, ALL_LAUNCH_FEATURES)
  }, [activeRoute, location.pathname])

  const isForbidden = useMemo(() => {
    if (!activeFeature || !activeFeature.roles) return false
    return !activeFeature.roles.includes(currentUser.role)
  }, [activeFeature, currentUser.role])

  const isDashboard = location.pathname === '/dashboard' || (location.pathname === '/' && activeRoute === '/dashboard')

  // Switch role handler (stores ONLY user id in sessionStorage)
  const handleRoleSelect = (roleObj) => {
    const updated = {
      ...currentUser,
      id: roleObj.id,
      role: roleObj.role,
      name: roleObj.name,
      phone: roleObj.phone
    }
    setCurrentUser(updated)
    try {
      sessionStorage.setItem('docmatrix-demo-session', roleObj.id)
    } catch { }
    setRoleDropdownOpen(false)
    if (onUserChange) onUserChange(updated)
  }
  const initial = (currentUser.name.replace(/^Dr\.?\s*/i, '').charAt(0) || 'U').toUpperCase()
  const displayName = currentUser.name.replace(/\s*\(.*\)\s*/, '')
  const roleLabel = currentUser.role.replace(/_/g, ' ').toLowerCase()

  return (
    <div className="staff-portal-container dmx-shell">
      {/* Icon rail: collapsed to icons, expands fully on hover or keyboard focus */}
      <aside className={`dmx-rail ${mobileMenuOpen ? 'is-open' : ''}`} aria-label="Clinic navigation">
        <div className="dmx-rail-brand" onClick={() => navigateTo('/dashboard')}>
          <span className="dmx-rail-mark"><MedicalCrossMark light /></span>
          <span className="dmx-rail-brand-text">
            <span className="dmx-wordmark">DOC MATRIX</span>
            <span className="dmx-rail-clinic">{currentUser.clinicName || 'DocMatrix Dental Care'}</span>
          </span>
          <button
            className="dmx-rail-close"
            onClick={(e) => { e.stopPropagation(); setMobileMenuOpen(false) }}
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="dmx-rail-nav">
          <span className="dmx-rail-section">Overview</span>
          <button
            onClick={() => navigateTo('/dashboard')}
            className={`dmx-nav-item ${isDashboard ? 'is-active' : ''}`}
            aria-current={isDashboard ? 'page' : undefined}
          >
            <span className="dmx-nav-icon"><LayoutDashboard size={18} /></span>
            <span className="dmx-nav-text">Clinic Dashboard</span>
          </button>

          <span className="dmx-rail-section">Practice</span>
          {Object.entries(groupedAreas).map(([areaName, features]) => {
            if (areaName === 'Accounts' && !['ORGANIZATION_ADMIN', 'ACCOUNTANT'].includes(currentUser.role)) {
              return null
            }
            if (areaName === 'Settings' && !['ORGANIZATION_ADMIN', 'BRANCH_ADMIN'].includes(currentUser.role)) {
              return null
            }
            const IconComp = AREA_ICONS[areaName] || Calendar
            const isAreaActive = activeFeature?.area === areaName || location.pathname.startsWith(`/${areaName.toLowerCase()}`)

            // Filter features allowed for current user role
            const visibleFeatures = features.filter((feat) => !feat.roles || feat.roles.includes(currentUser.role))
            if (visibleFeatures.length === 0) return null

            // Billing is a single tabbed workspace: one link, no sub-page list
            if (SINGLE_LINK_AREAS.has(areaName)) {
              return (
                <div key={areaName} className="dmx-module">
                  <button
                    type="button"
                    data-testid={`sidebar-link-area-${areaName.toLowerCase()}`}
                    onClick={() => navigateTo(`/${areaName.toLowerCase()}`)}
                    className={`dmx-nav-item ${isAreaActive ? 'is-active' : ''}`}
                    aria-current={isAreaActive ? 'page' : undefined}
                    title={areaName}
                  >
                    <span className="dmx-nav-icon"><IconComp size={18} /></span>
                    <span className="dmx-nav-text">{areaName}</span>
                  </button>
                </div>
              )
            }

            return (
              <div
                key={areaName}
                className={`dmx-module ${mobileOpenArea === areaName ? 'is-mobile-open' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (window.innerWidth <= 820) {
                      setMobileOpenArea(mobileOpenArea === areaName ? null : areaName)
                    } else {
                      navigateTo(`/${areaName.toLowerCase()}`)
                    }
                  }}
                  className={`dmx-nav-item ${isAreaActive ? 'is-active' : ''}`}
                  aria-haspopup="true"
                  title={areaName}
                >
                  <span className="dmx-nav-icon"><IconComp size={18} /></span>
                  <span className="dmx-nav-text">{areaName}</span>
                  <ChevronRight size={14} className="dmx-nav-chevron" />
                </button>

                {/* Sub-pages slide open directly below the topic on hover or focus */}
                <div className="dmx-sub">
                  <div className="dmx-sub-inner">
                    <div className="dmx-sub-list">
                      {visibleFeatures.map((feat, i) => {
                        const isCurrent = activeFeature?.id === feat.id || (activeFeature?.id === 'appt.detail' && feat.id === 'appt.details-list')
                        return (
                          <button
                            key={feat.id}
                            type="button"
                            data-testid={`sidebar-link-${feat.id}`}
                            style={{ '--i': i }}
                            title={feat.name}
                            onClick={(e) => {
                              e.stopPropagation()
                              navigateTo(resolveFeatureRoute(feat.route, feat.area))
                            }}
                            className={`dmx-sub-item ${isCurrent ? 'is-active' : ''}`}
                            aria-current={isCurrent ? 'page' : undefined}
                          >
                            <span className="dmx-sub-dot" aria-hidden="true" />
                            <span className="dmx-sub-label">{feat.name}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </nav>

        <div className="dmx-rail-foot">
          <span className="dmx-avatar dmx-avatar-solid">{initial}</span>
          <span className="dmx-rail-user">
            <strong>{displayName}</strong>
            <small>{roleLabel}</small>
          </span>
        </div>
      </aside>

      {mobileMenuOpen && <div className="dmx-scrim" onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />}

      <div className="dmx-stage">
        <header className="dmx-topbar">
          <div className="dmx-topbar-left">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="dmx-icon-btn dmx-menu-btn"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>

            <nav className="dmx-breadcrumb" aria-label="Breadcrumb">
              <button className={isDashboard ? 'is-current' : ''} onClick={() => navigateTo('/dashboard')}>Dashboard</button>
              {activeFeature ? (
                <>
                  <ChevronRight size={13} />
                  <button onClick={() => navigateTo(`/${activeFeature.area.toLowerCase()}`)}>{activeFeature.area}</button>
                  <ChevronRight size={13} />
                  <span className="is-current">{activeFeature.name}</span>
                </>
              ) : !isDashboard && location.pathname !== '/' ? (
                <>
                  <ChevronRight size={13} />
                  <span className="is-current dmx-capitalize">{location.pathname.replace('/', '').replace(/-/g, ' ')}</span>
                </>
              ) : null}
            </nav>
          </div>

          <div className="dmx-topbar-right">
            <div className="dmx-search-wrap" ref={headerSearchRef}>
              <label className="dmx-search">
                <Search size={15} />
                <input
                  type="text"
                  placeholder="Search patients, MRN…"
                  value={headerSearch}
                  onFocus={() => setHeaderSearchOpen(true)}
                  onClick={() => setHeaderSearchOpen(true)}
                  onChange={(e) => {
                    setHeaderSearch(e.target.value)
                    setHeaderSearchOpen(true)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && headerSearch.trim()) {
                      setHeaderSearchOpen(false)
                      setActiveRoute('/patients/list')
                      navigate(`/patients/list?q=${encodeURIComponent(headerSearch.trim())}`)
                    }
                  }}
                />
                <kbd>↵</kbd>
              </label>

              {headerSearchOpen && (
                <div className="dmx-search-dropdown" role="listbox" aria-label="Patient search results">
                  {headerMatchedPatients.length === 0 ? (
                    <div className="dmx-search-empty">No patients matching &ldquo;{headerSearch.trim()}&rdquo;</div>
                  ) : (
                    <>
                      {headerMatchedPatients.slice(0, 8).map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="dmx-search-item"
                          onClick={() => {
                            setHeaderSearchOpen(false)
                            setHeaderSearch('')
                            setActiveRoute(`/patients/${p.id}`)
                            navigate(`/patients/${p.id}`)
                          }}
                        >
                          <span className="dmx-search-item-main">
                            <strong>{p.firstName} {p.lastName}</strong>
                            {p.mobile && <small>{p.mobile}</small>}
                          </span>
                          <span className="dmx-search-item-id">{p.id}</span>
                        </button>
                      ))}
                      {headerMatchedPatients.length > 8 && (
                        <button
                          type="button"
                          className="dmx-search-more"
                          onClick={() => {
                            const q = headerSearch.trim()
                            setHeaderSearchOpen(false)
                            setActiveRoute('/patients/list')
                            navigate(q ? `/patients/list?q=${encodeURIComponent(q)}` : '/patients/list')
                          }}
                        >
                          View all {headerMatchedPatients.length} patients
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="dmx-clock" title="Kerala, India Standard Time">
              <span className="dmx-live-dot" />
              <span>{currentTime}</span>
              <small>IST</small>
            </div>

            <SyncStatusIndicator />

            <ThemeToggle />

            <button
              className="dmx-icon-btn dmx-lang-btn"
              onClick={() => setLang(lang === 'en' ? 'ml' : 'en')}
              aria-label="Switch language"
            >
              {lang === 'en' ? 'EN' : 'മ'}
            </button>

            <div className="dmx-popover-anchor">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className={`dmx-icon-btn notifications-btn ${notificationsOpen ? 'is-active' : ''}`}
                aria-label="Clinical notifications"
                aria-haspopup="dialog"
                aria-expanded={notificationsOpen}
              >
                <Bell size={16} />
                {liveNotifications.length > 0 && (
                  <span className="dmx-badge">{liveNotifications.length}</span>
                )}
              </button>

              {notificationsOpen && (
                <div className="dmx-popover dmx-notifications notifications-box">
                  <div className="dmx-popover-head">
                    <strong>Notifications</strong>
                    {liveNotifications.length > 0 && (
                      <span className="dmx-pill dmx-pill-alert">{liveNotifications.length} alerts</span>
                    )}
                  </div>
                  {liveNotifications.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      <Check size={24} style={{ color: 'var(--teal-primary, #008891)', margin: '0 auto 8px', display: 'block' }} />
                      <p style={{ margin: 0, fontSize: '13px' }}>All clear! No pending clinical alerts or inventory warnings.</p>
                    </div>
                  ) : (
                    liveNotifications.map((n, idx) => {
                      const Icon = n.icon
                      return (
                        <div key={n.title + idx} className={`dmx-notification tone-${n.tone}`}>
                          <span className="dmx-reminder-icon"><Icon size={15} /></span>
                          <div>
                            <strong>{n.title}</strong>
                            <p>{n.body}</p>
                          </div>
                          <time>{n.time}</time>
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </div>

            {onReturnToWebsite && (
              <button onClick={onReturnToWebsite} className="dmx-btn dmx-btn-ghost dmx-btn-sm">
                <Globe size={14} /> Main website
              </button>
            )}

            <div className="dmx-popover-anchor">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className={`dmx-profile role-btn ${roleDropdownOpen ? 'is-active' : ''}`}
                aria-label={`Account menu for ${displayName}, ${roleLabel}`}
                aria-haspopup="menu"
                aria-expanded={roleDropdownOpen}
              >
                <span className="dmx-avatar dmx-avatar-solid">{initial}</span>
                <span className="dmx-profile-text">
                  <strong>{displayName}</strong>
                  <small>{roleLabel}</small>
                </span>
                <ChevronDown size={14} />
              </button>

              {roleDropdownOpen && (
                <div className="dmx-popover dmx-role-menu role-box">
                  {isDemo ? (
                    <>
                      <div className="dmx-popover-label">Switch demo staff role</div>
                      {DEMO_STAFF_ROLES.map((r) => (
                        <button
                          key={r.role}
                          onClick={() => handleRoleSelect(r)}
                          className={`dmx-role-item ${currentUser.role === r.role ? 'is-active' : ''}`}
                        >
                          <span>
                            <strong>{r.name}</strong>
                            <small>{r.role.replace(/_/g, ' ').toLowerCase()}</small>
                          </span>
                          {currentUser.role === r.role && <Check size={14} />}
                        </button>
                      ))}
                      <div className="dmx-popover-divider" />
                    </>
                  ) : (
                    <div style={{ padding: '10px 14px 6px' }}>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main)' }}>{displayName}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--teal-primary)', fontWeight: 600 }}>{roleLabel}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{currentUser.clinicName || 'Clinic Workspace'}</div>
                      <div className="dmx-popover-divider" style={{ margin: '8px 0 4px' }} />
                    </div>
                  )}
                  <div className="dmx-popover-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '4px' }}>
                    <span>Theme Appearance</span>
                    <span style={{ fontSize: '10px', textTransform: 'none', fontWeight: 600, color: 'var(--teal-primary)' }}>
                      {themePref === 'system' ? 'System Default' : themePref === 'dark' ? 'Dark Mode' : 'Bright Mode'}
                    </span>
                  </div>
                  <div className="dmx-theme-options-grid">
                    <button
                      type="button"
                      onClick={() => applyTheme('system')}
                      className={`dmx-theme-option-btn ${themePref === 'system' ? 'is-active' : ''}`}
                      title="Follow System OS Default (Dark / Bright)"
                    >
                      <Monitor size={12} />
                      <span>System</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTheme('light')}
                      className={`dmx-theme-option-btn ${themePref === 'light' ? 'is-active' : ''}`}
                      title="Bright / Light Mode"
                    >
                      <Sun size={12} />
                      <span>Bright</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => applyTheme('dark')}
                      className={`dmx-theme-option-btn ${themePref === 'dark' ? 'is-active' : ''}`}
                      title="Dark Mode"
                    >
                      <Moon size={12} />
                      <span>Dark</span>
                    </button>
                  </div>
                  <div className="dmx-popover-divider" />
                  <button
                    className="dmx-role-item dmx-logout"
                    onClick={() => { setRoleDropdownOpen(false); if (onLogout) onLogout() }}
                  >
                    <LogOut size={14} />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="dmx-main">
          {isForbidden ? (
            <div className="dmx-card dmx-forbidden">
              <span className="dmx-forbidden-icon"><ShieldAlert size={26} /></span>
              <h2>Access restricted</h2>
              <p>
                Your current staff role <strong>{currentUser.role}</strong> does not have permission to view this section.
              </p>
              <div className="dmx-forbidden-roles">Allowed roles: {activeFeature?.roles?.join(', ')}</div>
              <div className="dmx-forbidden-actions">
                <button onClick={() => navigateTo('/dashboard')} className="dmx-btn dmx-btn-primary">Return to dashboard</button>
                <button onClick={() => handleRoleSelect(DEMO_STAFF_ROLES[1])} className="dmx-btn dmx-btn-ghost">Switch to Org Admin</button>
              </div>
            </div>
          ) : isDashboard ? (
            <ClinicDashboard
              currentUser={currentUser}
              navigateTo={navigateTo}
            />
          ) : (
            <div className="dmx-page" key={location.pathname}>
              {children || <Outlet />}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export { StaffPortal as AppLayout }
