import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { FEATURE_REGISTRY } from '@/features/registry'
import { getActiveFeatureForPath, resolveFeatureRoute } from '@/features/navigationMatcher'
import ClinicDashboard from '@/pages/dashboard/ClinicDashboard'
import ThemeToggle from '@/components/ThemeToggle'
import {
  Calendar, Users, Stethoscope, Receipt, BookOpen, Package, MessageSquare, Globe,
  BarChart3, Settings, LayoutDashboard, LogOut, Menu, X, ChevronRight, ChevronDown,
  Check, ShieldAlert, Search, Bell, CircleAlert, PackageOpen, FlaskConical
} from 'lucide-react'

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

// 8 Demo Staff Roles (Decision D1 & D5)
const DEMO_STAFF_ROLES = [
  { id: 'usr-101', role: 'ORGANIZATION_ADMIN', name: 'Dr. Arun Kumar (Owner)', phone: '+910000000101' },
  { id: 'usr-102', role: 'BRANCH_ADMIN', name: 'Priya Menon (Branch Mgr)', phone: '+910000000102' },
  { id: 'usr-103', role: 'RECEPTIONIST', name: 'Ananya S (Front Desk)', phone: '+910000000103' },
  { id: 'usr-104', role: 'DOCTOR', name: 'Dr. Rajesh Nair (Doctor)', phone: '+910000000104' },
  { id: 'usr-105', role: 'NURSE', name: 'Suma Joseph (Clinic Nurse)', phone: '+910000000105' },
  { id: 'usr-106', role: 'LAB_TECHNICIAN', name: 'Rahul V (Lab Tech)', phone: '+910000000106' },
  { id: 'usr-107', role: 'PHARMACIST', name: 'Deepa K (Pharmacist)', phone: '+910000000107' },
  { id: 'usr-108', role: 'ACCOUNTANT', name: 'Manoj Pillai (Accounts)', phone: '+910000000108' }
]

// All 55 Launch Features directly from single-source-of-truth registry
const ALL_LAUNCH_FEATURES = FEATURE_REGISTRY.filter((f) => f.phase === 'launch')

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

export default function StaffPortal({
  user = { id: 'usr-104', name: 'Dr. Arun Kumar', role: 'DOCTOR', clinicName: 'DocMatrix Dental Care' },
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
  const [mobileOpenArea, setMobileOpenArea] = useState(null)
  const [lang, setLang] = useState('en')
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [headerSearch, setHeaderSearch] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [currentTime, setCurrentTime] = useState('11:20 AM')

  // Close popovers on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.notifications-box') && !e.target.closest('.notifications-btn')) {
        setNotificationsOpen(false)
      }
      if (!e.target.closest('.role-box') && !e.target.closest('.role-btn')) {
        setRoleDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  // Live timer tick
  useEffect(() => {
    const updateTime = () => {
      try {
        const d = new Date()
        setCurrentTime(d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }))
      } catch {}
    }
    updateTime()
    const interval = setInterval(updateTime, 30000)
    return () => clearInterval(interval)
  }, [])

  // Interactive Patients State
  const [patientsList, setPatientsList] = useState([
    { id: 'DM-2026-001', name: 'Meera Nambiar', age: 34, gender: 'F', phone: '+91 94471 23456', doctor: 'Dr. Arun Kumar', alerts: 'Penicillin Allergy', lastVisit: 'Today', treatment: 'Root Canal Treatment (Session 2/3)', balance: '₹0' },
    { id: 'DM-2026-002', name: 'Rahul Krishnan', age: 28, gender: 'M', phone: '+91 98460 54321', doctor: 'Dr. Arun Kumar', alerts: 'None', lastVisit: 'Today', treatment: 'Ultrasonic Scaling & Polishing', balance: '₹0' },
    { id: 'DM-2026-003', name: 'Fatima Zahra', age: 41, gender: 'F', phone: '+91 97455 11223', doctor: 'Dr. Tariq Antoun', alerts: 'Hypertension', lastVisit: '12 Oct 2026', treatment: 'E-Max Crown Cementation', balance: '₹3,000' },
    { id: 'DM-2026-004', name: 'George Mathew', age: 56, gender: 'M', phone: '+91 94470 98765', doctor: 'Dr. Arun Kumar', alerts: 'Diabetic (Type 2)', lastVisit: '08 Oct 2026', treatment: 'Extraction Socket Healing', balance: '₹1,800' },
    { id: 'DM-2026-005', name: 'Ananya Pillai', age: 22, gender: 'F', phone: '+91 98472 33445', doctor: 'Dr. Tariq Antoun', alerts: 'None', lastVisit: '01 Oct 2026', treatment: 'Clear Aligner Scan & Plan', balance: '₹0' }
  ])

  // 4 Operatories Monitor State
  const [operatoryChairs, setOperatoryChairs] = useState([
    {
      id: 'chair-1',
      operatory: 'Operatory 1 • Endodontics Suite',
      doctor: 'Dr. Arun Kumar',
      patient: 'Meera Nambiar',
      proc: 'Root Canal Treatment (Session 2/3)',
      status: 'In Chair',
      elapsed: '18 min elapsed',
      type: 'occupied'
    },
    {
      id: 'chair-2',
      operatory: 'Operatory 2 • Ortho & Esthetics',
      doctor: 'Dr. Tariq Antoun',
      patient: 'Rahul Krishnan',
      proc: 'Ceramic Crown Cementation',
      status: 'Next In Chair',
      elapsed: 'Arrived 10:00 AM',
      type: 'waiting'
    },
    {
      id: 'chair-3',
      operatory: 'Operatory 3 • Hygiene & Periodontics',
      doctor: 'Dr. Priya Nair',
      patient: 'George Mathew',
      proc: 'Ultrasonic Scaling & Polish',
      status: 'Sanitizing Bay',
      elapsed: 'Ready in 3 min',
      type: 'sanitizing'
    },
    {
      id: 'chair-4',
      operatory: 'Operatory 4 • Surgical Implant Bay',
      doctor: 'Consultant Surgeon',
      patient: 'Next: Fatima Zahra (11:15 AM)',
      proc: 'Implant Impression & Torque Test',
      status: 'Sterilized & Ready',
      elapsed: 'Ready for Patient',
      type: 'ready'
    }
  ])

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
      if (f.id === 'appt.detail') return
      if (!map[f.area]) map[f.area] = []
      map[f.area].push(f)
    })
    return map
  }, [])

  // Check role permission for active feature (Single Source of Truth)
  const activeFeature = useMemo(() => {
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
    } catch {}
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
          {Object.entries(groupedAreas).map(([areaName, features], index, arr) => {
            if (areaName === 'Accounts' && !['ORGANIZATION_ADMIN', 'ACCOUNTANT'].includes(currentUser.role)) {
              return null
            }
            if (areaName === 'Settings' && !['ORGANIZATION_ADMIN', 'BRANCH_ADMIN'].includes(currentUser.role)) {
              return null
            }
            const IconComp = AREA_ICONS[areaName] || Calendar
            const isAreaActive = activeFeature?.area === areaName || location.pathname.startsWith(`/${areaName.toLowerCase()}`)
            const isBottomAlign = index >= arr.length - 3

            // Filter features allowed for current user role
            const visibleFeatures = features.filter((feat) => !feat.roles || feat.roles.includes(currentUser.role))
            if (visibleFeatures.length === 0) return null

            return (
              <div
                key={areaName}
                className={`dmx-module ${mobileOpenArea === areaName ? 'is-mobile-open' : ''}`}
              >
                <button
                  onClick={() => {
                    if (window.innerWidth <= 820) {
                      setMobileOpenArea(mobileOpenArea === areaName ? null : areaName)
                    } else {
                      navigateTo(`/${areaName.toLowerCase()}`)
                    }
                  }}
                  className={`dmx-nav-item ${isAreaActive ? 'is-active' : ''}`}
                >
                  <span className="dmx-nav-icon"><IconComp size={18} /></span>
                  <span className="dmx-nav-text">{areaName}</span>
                  <span className="dmx-nav-count">{visibleFeatures.length}</span>
                  <ChevronRight size={14} className="dmx-nav-chevron" />
                </button>

                {/* Submodule flyout, revealed once the rail has expanded */}
                <div className={`dmx-flyout ${isBottomAlign ? 'is-bottom' : ''}`}>
                  <div className="dmx-flyout-card">
                    <button className="dmx-flyout-head" onClick={() => navigateTo(`/${areaName.toLowerCase()}`)}>
                      <span><IconComp size={14} /> {areaName}</span>
                      <span className="dmx-flyout-hub">Open hub <ChevronRight size={12} /></span>
                    </button>
                    {visibleFeatures.map((feat) => {
                      const isCurrent = activeFeature?.id === feat.id || (activeFeature?.id === 'appt.detail' && feat.id === 'appt.details-list')
                      return (
                        <button
                          key={feat.id}
                          data-testid={`sidebar-link-${feat.id}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            navigateTo(resolveFeatureRoute(feat.route, feat.area))
                          }}
                          className={`dmx-flyout-item ${isCurrent ? 'is-active' : ''}`}
                          aria-current={isCurrent ? 'page' : undefined}
                        >
                          <span>{feat.name}</span>
                          {isCurrent && <Check size={13} />}
                        </button>
                      )
                    })}
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
            <label className="dmx-search">
              <Search size={15} />
              <input
                type="text"
                placeholder="Search patients, MRN…"
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && headerSearch.trim()) {
                    navigateTo('/patients/list')
                  }
                }}
              />
              <kbd>↵</kbd>
            </label>

            <div className="dmx-clock" title="Kerala, India Standard Time">
              <span className="dmx-live-dot" />
              <span>{currentTime}</span>
              <small>IST</small>
            </div>

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
              >
                <Bell size={16} />
                <span className="dmx-badge">3</span>
              </button>

              {notificationsOpen && (
                <div className="dmx-popover dmx-notifications notifications-box">
                  <div className="dmx-popover-head">
                    <strong>Notifications</strong>
                    <span className="dmx-pill dmx-pill-alert">3 urgent</span>
                  </div>
                  {NOTIFICATIONS.map((n) => {
                    const Icon = n.icon
                    return (
                      <div key={n.title} className={`dmx-notification tone-${n.tone}`}>
                        <span className="dmx-reminder-icon"><Icon size={15} /></span>
                        <div>
                          <strong>{n.title}</strong>
                          <p>{n.body}</p>
                        </div>
                        <time>{n.time}</time>
                      </div>
                    )
                  })}
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
              >
                <span className="dmx-avatar dmx-avatar-solid">{initial}</span>
                <span className="dmx-profile-text">
                  <strong>{displayName}</strong>
                  <small>{currentUser.role}</small>
                </span>
                <ChevronDown size={14} />
              </button>

              {roleDropdownOpen && (
                <div className="dmx-popover dmx-role-menu role-box">
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
              chairs={operatoryChairs}
              patients={patientsList}
            />
          ) : (
            <div className="dmx-page">
              {children || <Outlet />}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export { StaffPortal as AppLayout }
