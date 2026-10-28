import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useLocation, Outlet } from 'react-router-dom'
import { FEATURE_REGISTRY } from '@/features/registry'
import { getActiveFeatureForPath, resolveFeatureRoute } from '@/features/navigationMatcher'
import {
  Calendar, Users, Stethoscope, Receipt, BookOpen, Package, MessageSquare, Globe,
  BarChart3, Settings, LayoutDashboard, LogOut, User, Menu, X, ChevronRight, ChevronDown,
  Sparkles, CheckCircle2, ArrowRight, ArrowLeft, Clock,
  Check, ShieldAlert, CreditCard, Search, Plus, Filter, Phone, Mail, FileText,
  Trash2, Edit3, Printer, Share2, CheckCircle, RefreshCw, AlertCircle, Bell, Activity
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

function ClinicDashboardOverview({ currentUser, navigateTo }) {
  const summaryCards = [
    { label: "Today's appointments", value: '18', note: 'Today’s schedule', icon: Calendar, color: '#718982', fill: 67, route: '/appointments/new' },
    { label: 'Completed visits', value: '12', note: 'On track for today', icon: CheckCircle2, color: '#788c7b', fill: 72, route: '/appointments/new' },
    { label: 'Collections today', value: '₹34,500', note: '82% of daily target', icon: Receipt, color: '#718982', fill: 82, route: '/billing/collection' },
    { label: 'Pending patient dues', value: '₹12,800', note: '4 accounts need follow-up', icon: CreditCard, color: '#a18a68', fill: 42, route: '/billing/dues' }
  ]
  const activityBars = [38, 62, 46, 83, 58, 94, 68]

  return (
    <section className="dashboard-reference">
      <header className="dashboard-reference-header">
        <div>
          <div className="dashboard-eyebrow"><span className="pulse-indicator-emerald" /> CLINIC OVERVIEW <span>·</span> TODAY</div>
          <h1>Good morning, {currentUser.name.split(' ')[0]}</h1>
          <p>{currentUser.clinicName} <span>·</span> Here’s your practice at a glance.</p>
        </div>
        <div className="dashboard-header-actions">
          <button className="dashboard-button-secondary" onClick={() => navigateTo('/patients/new')}><Plus size={15} /> Add patient</button>
          <button className="dashboard-button-primary" onClick={() => navigateTo('/appointments/new')}><Plus size={15} /> Book appointment</button>
        </div>
      </header>

      <div className="dashboard-summary-grid">
        {summaryCards.map((card) => {
          const Icon = card.icon
          return <button className="dashboard-summary-card" key={card.label} onClick={() => navigateTo(card.route)}>
            <div className="dashboard-summary-top"><span>{card.label}</span><i style={{ color: card.color, background: `${card.color}12` }}><Icon size={17} /></i></div>
            <strong>{card.value}</strong>
            <div className="dashboard-summary-footer"><span>{card.note}</span><ArrowRight size={14} /></div>
            <div className="dashboard-progress-track"><span style={{ width: `${card.fill}%`, background: card.color }} /></div>
          </button>
        })}
      </div>

      <div className="dashboard-main-grid">
        <section className="dashboard-panel dashboard-analytics-panel">
          <div className="dashboard-panel-heading"><div><h2>Appointment activity</h2><p>Patient visits throughout the day</p></div><button onClick={() => navigateTo('/appointments/new')}>View schedule <ArrowRight size={14} /></button></div>
          <div className="dashboard-chart">
            {activityBars.map((height, i) => <div className="dashboard-chart-column" key={i}><span className={i === 5 ? 'is-highlighted' : ''} style={{ height: `${height}%` }} /><small>{['9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM'][i]}</small></div>)}
          </div>
          <div className="dashboard-chart-legend"><span><i /> Appointments</span><span>18 scheduled today</span></div>
        </section>

        <section className="dashboard-panel dashboard-reminders-panel">
          <div className="dashboard-panel-heading"><div><h2>Clinic reminders</h2><p>Items that need attention</p></div><span className="dashboard-count">3</span></div>
          <button className="dashboard-reminder" onClick={() => navigateTo('/patients/pt-1001')}><i className="reminder-dot reminder-red" /><span><strong>Check patient allergy</strong><small>Meera Nambiar · before prescribing</small></span><ChevronRight size={16} /></button>
          <button className="dashboard-reminder" onClick={() => navigateTo('/inventory/alerts')}><i className="reminder-dot reminder-amber" /><span><strong>Restock latex gloves</strong><small>2 boxes left in inventory</small></span><ChevronRight size={16} /></button>
          <button className="dashboard-reminder" onClick={() => navigateTo('/lab')}><i className="reminder-dot reminder-green" /><span><strong>Lab case ready</strong><small>Fatima Zahra · crown cementation</small></span><ChevronRight size={16} /></button>
          <button className="dashboard-reminders-link" onClick={() => navigateTo('/notifications')}>See all reminders <ArrowRight size={14} /></button>
        </section>
      </div>

      <div className="dashboard-lower-grid">
        <section className="dashboard-panel dashboard-progress-panel">
          <div className="dashboard-panel-heading"><div><h2>Today’s progress</h2><p>Clinic targets</p></div><BarChart3 size={18} /></div>
          <div className="dashboard-progress-item"><div><span>Appointments</span><strong>12 / 18</strong></div><div className="dashboard-progress-track"><span style={{ width: '67%' }} /></div></div>
          <div className="dashboard-progress-item"><div><span>Daily collections</span><strong>₹34,500 / ₹42,000</strong></div><div className="dashboard-progress-track"><span style={{ width: '82%', background: '#16865b' }} /></div></div>
          <div className="dashboard-progress-callout"><Clock size={17} /><span><strong>Next appointment</strong><small>Open today's appointment calendar</small></span><button onClick={() => navigateTo('/appointments/new')}><ArrowRight size={15} /></button></div>
        </section>
      </div>
    </section>
  )
}

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

  return (
    <div className="staff-portal-container" style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--paper, #fbfbf9)',
      color: 'var(--ink, #0b0b0b)',
      fontFamily: '"Instrument Sans", "Plus Jakarta Sans", "Inter", -apple-system, sans-serif'
    }}>
      {/* Top Header with Glassmorphic Elevation */}
      <header style={{
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--line, #e9e9e5)',
        padding: '10px clamp(16px, 2.8vw, 32px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 90,
        boxShadow: '0 1px 6px rgba(0, 0, 0, 0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '6px'
            }}
            className="mobile-nav-toggle-btn"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          {/* Brand Logo & Clinic Badging */}
          <div
            onClick={() => navigateTo('/dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          >
            <MedicalCrossMark />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: '900', letterSpacing: '0.08em', color: 'var(--teal-primary, #008891)' }}>
                  DOC MATRIX
                </span>
                <span style={{ fontSize: '9px', fontWeight: '800', background: 'rgba(0, 136, 145, 0.1)', color: 'var(--teal-primary, #008891)', padding: '1px 5px', borderRadius: '4px' }}>
                  CLINICAL
                </span>
              </div>
              <span style={{ fontSize: '13px', fontWeight: '750', color: 'var(--charcoal-title, #1a2626)' }}>
                {currentUser.clinicName || 'DocMatrix Dental Care'}
              </span>
            </div>
          </div>

          {/* Breadcrumb Path */}
          <div style={{ display: 'none', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--charcoal-muted, #6e7e7d)', paddingLeft: '16px', borderLeft: '1px solid var(--line, #e9e9e5)' }} className="desktop-breadcrumb">
            <span
              style={{
                cursor: 'pointer',
                color: isDashboard ? 'var(--teal-primary)' : 'inherit',
                fontWeight: isDashboard ? '750' : 'normal'
              }}
              onClick={() => navigateTo('/dashboard')}
            >
              Dashboard
            </span>
            {activeFeature ? (
              <>
                <ChevronRight size={13} />
                <span
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigateTo(`/${activeFeature.area.toLowerCase()}`)}
                >
                  {activeFeature.area}
                </span>
                <ChevronRight size={13} />
                <span style={{ fontWeight: '750', color: 'var(--charcoal-title, #1a2626)' }}>
                  {activeFeature.name}
                </span>
              </>
            ) : !isDashboard && location.pathname !== '/' ? (
              <>
                <ChevronRight size={13} />
                <span style={{ fontWeight: '750', color: 'var(--charcoal-title, #1a2626)', textTransform: 'capitalize' }}>
                  {location.pathname.replace('/', '').replace(/-/g, ' ')}
                </span>
              </>
            ) : null}
          </div>
        </div>

        {/* Right Header Controls: Search, Clock, Bell, User switcher */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Quick Search Bar */}
          <div style={{ position: 'relative', display: 'none' }} className="desktop-search-container">
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--charcoal-muted, #6e7e7d)' }} />
            <input
              type="text"
              placeholder="Quick search patients, MRN..."
              value={headerSearch}
              onChange={(e) => setHeaderSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && headerSearch.trim()) {
                  navigateTo('/patients/list')
                }
              }}
              style={{
                padding: '6px 28px 6px 30px',
                borderRadius: '999px',
                border: '1px solid var(--line, #e9e9e5)',
                fontSize: '12px',
                background: '#f8faf9',
                width: '180px',
                outline: 'none',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.currentTarget.style.width = '230px'
                e.currentTarget.style.borderColor = 'var(--teal-primary, #008891)'
                e.currentTarget.style.background = '#ffffff'
              }}
              onBlur={(e) => {
                e.currentTarget.style.width = '180px'
                e.currentTarget.style.borderColor = 'var(--line, #e9e9e5)'
                e.currentTarget.style.background = '#f8faf9'
              }}
            />
          </div>

          {/* Real-time Kerala Standard Time Clock */}
          <div style={{
            display: 'none',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 11px',
            borderRadius: '999px',
            background: 'rgba(0, 136, 145, 0.06)',
            fontSize: '11.5px',
            color: 'var(--charcoal-dark, #111a1a)',
            fontWeight: '700'
          }} className="desktop-clock-pill">
            <span className="pulse-indicator-emerald" />
            <span>{currentTime}</span>
            <span style={{ fontSize: '10px', color: 'var(--charcoal-muted, #6e7e7d)' }}>• Kerala IST</span>
          </div>

          {/* Clinical Notifications Bell */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                border: '1px solid var(--line, #e9e9e5)',
                background: notificationsOpen ? 'rgba(0, 136, 145, 0.08)' : '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--charcoal-dark, #111a1a)',
                cursor: 'pointer',
                position: 'relative'
              }}
              aria-label="Clinical notifications" className="notifications-btn"
            >
              <Bell size={15} />
              <span style={{
                position: 'absolute',
                top: '-2px',
                right: '-2px',
                width: '15px',
                height: '15px',
                borderRadius: '50%',
                background: '#dc2626',
                color: '#ffffff',
                fontSize: '9.5px',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                3
              </span>
            </button>

            {/* Notifications Popover */}
            {notificationsOpen && (
              <div className="notifications-box" style={{
                position: 'absolute',
                right: 0,
                top: '42px',
                width: '310px',
                background: '#ffffff',
                border: '1px solid var(--line, #e9e9e5)',
                borderRadius: '14px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.12)',
                padding: '12px',
                zIndex: 130
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid var(--line)' }}>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--charcoal-title)' }}>Clinical Notifications</span>
                  <span style={{ fontSize: '10px', fontWeight: '800', background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: '4px' }}>3 Urgent</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ padding: '8px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fee2e2' }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#b91c1c' }}>⚠️ Drug Allergy Warning</div>
                    <div style={{ fontSize: '11px', color: '#7f1d1d' }}>Meera Nambiar (Chair 1) has Penicillin Allergy recorded.</div>
                  </div>
                  <div style={{ padding: '8px', borderRadius: '8px', background: '#fffbeb', border: '1px solid #fef3c7' }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#b45309' }}>📦 Reorder Stock: Latex Gloves</div>
                    <div style={{ fontSize: '11px', color: '#78350f' }}>Latex Gloves (M) reached reorder threshold (2 boxes left).</div>
                  </div>
                  <div style={{ padding: '8px', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #dcfce7' }}>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: '#15803d' }}>🦷 DentArt Kerala Lab Delivery</div>
                    <div style={{ fontSize: '11px', color: '#14532d' }}>Zirconia Crown for Fatima Zahra received at clinic desk.</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Back to Website Button */}
          {onReturnToWebsite && (
            <button
              onClick={onReturnToWebsite}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 13px',
                borderRadius: '999px',
                border: '1.5px solid var(--line, #e9e9e5)',
                background: '#ffffff',
                fontSize: '12px',
                fontWeight: '700',
                color: 'var(--charcoal-dark, #111a1a)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <Globe size={13} style={{ color: 'var(--teal-primary, #008891)' }} />
              <span>Main Website</span>
            </button>
          )}

          {/* Language Switcher */}
          <button
            onClick={() => setLang(lang === 'en' ? 'ml' : 'en')}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid var(--line, #e9e9e5)',
              background: '#ffffff',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            {lang === 'en' ? 'EN' : 'മലയാളം'}
          </button>

          {/* Interactive Role Switcher Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)} className="role-btn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 12px 5px 6px',
                borderRadius: '999px',
                background: 'rgba(0, 136, 145, 0.08)',
                border: '1px solid rgba(0, 136, 145, 0.25)',
                fontSize: '12.5px',
                fontWeight: '700',
                color: 'var(--charcoal-dark, #111a1a)',
                cursor: 'pointer'
              }}
            >
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: 'var(--teal-primary, #008891)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: '800'
              }}>
                {currentUser.name.charAt(0) || 'U'}
              </div>
              <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentUser.name}
              </span>
              <span style={{ fontSize: '9.5px', fontWeight: '800', background: 'var(--teal-primary, #008891)', color: '#ffffff', padding: '1px 5px', borderRadius: '4px' }}>
                {currentUser.role}
              </span>
              <ChevronDown size={13} />
            </button>

            {roleDropdownOpen && (
              <div className="role-box" style={{
                position: 'absolute',
                right: 0,
                top: '42px',
                width: '260px',
                background: '#ffffff',
                border: '1px solid var(--line, #e9e9e5)',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                padding: '8px',
                zIndex: 120
              }}>
                <div style={{ padding: '6px 10px', fontSize: '11px', fontWeight: '800', color: 'var(--charcoal-muted, #6e7e7d)', textTransform: 'uppercase' }}>
                  Switch Demo Staff Role
                </div>
                {DEMO_STAFF_ROLES.map((r) => (
                  <button
                    key={r.role}
                    onClick={() => handleRoleSelect(r)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: currentUser.role === r.role ? 'rgba(0, 136, 145, 0.08)' : 'transparent',
                      color: currentUser.role === r.role ? 'var(--teal-primary, #008891)' : 'var(--charcoal-body, #475554)',
                      fontSize: '12px',
                      fontWeight: currentUser.role === r.role ? '750' : '550',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '700' }}>{r.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--charcoal-muted, #6e7e7d)' }}>{r.role}</div>
                    </div>
                    {currentUser.role === r.role && <Check size={14} style={{ color: 'var(--teal-primary, #008891)' }} />}
                  </button>
                ))}
                <div style={{ height: '1px', background: 'var(--line, #e9e9e5)', margin: '6px 0' }} />
                <button
                  onClick={() => { setRoleDropdownOpen(false); if (onLogout) onLogout(); }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#fef2f2',
                    color: '#dc2626',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  <LogOut size={13} />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 3. Main Portal Body (Sidebar + Content Stage) */}
      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.45)',
              zIndex: 140,
              backdropFilter: 'blur(2px)'
            }}
            aria-hidden="true"
          />
        )}
        {/* Left Sidebar Navigation */}
        <aside
          style={{
            width: '240px',
            background: '#ffffff',
            borderRight: '1px solid var(--line, #e9e9e5)',
            display: 'flex',
            flexDirection: 'column',
            position: 'sticky',
            top: '58px',
            height: 'calc(100vh - 58px)',
            overflow: 'visible',
            zIndex: 80
          }}
          className={`staff-sidebar ${mobileMenuOpen ? 'is-open' : ''}`}
        >
          {/* Dashboard Home Link */}
          <div style={{ padding: '12px 12px 4px 12px' }}>
            <button
              onClick={() => navigateTo('/dashboard')}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                borderRadius: '10px',
                border: 'none',
                background: isDashboard ? 'var(--teal-primary, #008891)' : 'transparent',
                color: isDashboard ? '#ffffff' : 'var(--charcoal-body, #475554)',
                fontSize: '13px',
                fontWeight: isDashboard ? '750' : '600',
                cursor: 'pointer',
                transition: 'all 0.16s ease'
              }}
            >
              <LayoutDashboard size={16} />
              <span>Clinic Dashboard</span>
            </button>
          </div>

          {/* Main Modules with Hover Flyout Submenus */}
          <div style={{ padding: '6px 12px 20px 12px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
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
                  className={`staff-module-item ${mobileOpenArea === areaName ? 'is-mobile-open' : ''}`}
                >
                  {/* Main Module Button */}
                  <button
                    onClick={() => {
                      if (window.innerWidth <= 820) {
                        setMobileOpenArea(mobileOpenArea === areaName ? null : areaName)
                      } else {
                        navigateTo(`/${areaName.toLowerCase()}`)
                      }
                    }}
                    className={`staff-module-btn ${isAreaActive ? 'is-active' : ''}`}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      border: 'none',
                      background: isAreaActive ? 'rgba(0, 136, 145, 0.08)' : 'transparent',
                      color: isAreaActive ? 'var(--teal-primary, #008891)' : 'var(--charcoal-body, #475554)',
                      fontSize: '13px',
                      fontWeight: isAreaActive ? '750' : '600',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <IconComp
                        size={16}
                        style={{
                          color: isAreaActive ? 'var(--teal-primary, #008891)' : 'var(--charcoal-muted, #6e7e7d)'
                        }}
                      />
                      <span>{areaName}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: '700',
                          padding: '1px 6px',
                          borderRadius: '999px',
                          background: isAreaActive ? 'rgba(0, 136, 145, 0.18)' : '#f1f5f5',
                          color: isAreaActive ? 'var(--teal-primary, #008891)' : '#64748b'
                        }}
                      >
                        {visibleFeatures.length}
                      </span>
                      <ChevronRight
                        size={13}
                        style={{
                          color: isAreaActive ? 'var(--teal-primary, #008891)' : '#94a3b8',
                          transition: 'transform 0.15s ease'
                        }}
                        className="module-chevron"
                      />
                    </div>
                  </button>

                  {/* Floating Hover Flyout with Sub-Modules */}
                  <div className={`staff-module-flyout ${isBottomAlign ? 'flyout-align-bottom' : ''}`}>
                    <div className="staff-flyout-card">
                      <div
                        className="staff-flyout-header"
                        onClick={() => navigateTo(`/${areaName.toLowerCase()}`)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <IconComp size={13} style={{ color: 'var(--teal-primary, #008891)' }} />
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: '800',
                              color: 'var(--charcoal-title, #1a2626)',
                              letterSpacing: '0.04em',
                              textTransform: 'uppercase'
                            }}
                          >
                            {areaName}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--teal-primary, #008891)', fontWeight: '700' }}>
                          Hub ↗
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {visibleFeatures.map((feat) => {
                          const isCurrent = activeFeature?.id === feat.id
                          return (
                            <button
                              key={feat.id}
                              data-testid={`sidebar-link-${feat.id}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                navigateTo(resolveFeatureRoute(feat.route, feat.area))
                              }}
                              className={`staff-sub-item-btn ${isCurrent ? 'is-active' : ''}`}
                              style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '7px 10px',
                                borderRadius: '7px',
                                border: 'none',
                                background: isCurrent ? 'rgba(0, 136, 145, 0.1)' : 'transparent',
                                color: isCurrent ? 'var(--teal-primary, #008891)' : 'var(--charcoal-body, #475554)',
                                fontSize: '12px',
                                fontWeight: isCurrent ? '750' : '550',
                                textAlign: 'left',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {feat.name}
                              </span>
                              {isCurrent && <ChevronRight size={12} />}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main style={{ flex: 1, padding: '28px clamp(16px, 3vw, 36px)', overflowY: 'auto' }}>
          {isForbidden ? (
            /* 403 Forbidden Screen */
            <div style={{ maxWidth: '600px', margin: '40px auto', background: '#ffffff', border: '1px solid #fee2e2', borderRadius: '18px', padding: '36px', textAlign: 'center', boxShadow: '0 4px 20px rgba(220, 38, 38, 0.08)' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                <ShieldAlert size={28} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#991b1b', marginBottom: '8px' }}>Access Restricted (403 Forbidden)</h2>
              <p style={{ fontSize: '13.5px', color: 'var(--charcoal-body, #475554)', lineHeight: '1.5', marginBottom: '16px' }}>
                Your current staff role <strong>{currentUser.role}</strong> does not have permission to view this section.
              </p>
              <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '10px', fontSize: '12px', color: '#64748b', marginBottom: '20px' }}>
                Allowed roles for this page: {activeFeature?.roles?.join(', ')}
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  onClick={() => navigateTo('/dashboard')}
                  className="btn-hero-teal"
                  style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '999px', cursor: 'pointer' }}
                >
                  Return to Dashboard
                </button>
                <button
                  onClick={() => handleRoleSelect(DEMO_STAFF_ROLES[1])}
                  className="btn-hero-outline"
                  style={{ padding: '8px 18px', fontSize: '13px', borderRadius: '999px', cursor: 'pointer' }}
                >
                  Switch to Org Admin
                </button>
              </div>
            </div>
          ) : isDashboard ? (
            <ClinicDashboardOverview currentUser={currentUser} navigateTo={navigateTo} />
          ) : (
            /* Submodule Content Loaded Inline inside Main Content Area */
            <div style={{ width: '100%', minHeight: '100%' }}>
              {children || <Outlet />}
            </div>
          )}
        </main>
      </div>

      {/* Responsive Style Overrides */}
      <style>{`
        @media (min-width: 821px) {
          .desktop-breadcrumb {
            display: flex !important;
          }
          .desktop-search-container {
            display: block !important;
          }
          .desktop-clock-pill {
            display: flex !important;
          }
        }

        /* Sidebar Main Module Hover Flyouts */
        .staff-module-item {
          position: relative;
        }
        .staff-module-btn:hover {
          background: rgba(0, 136, 145, 0.05) !important;
          color: var(--teal-primary, #008891) !important;
        }
        .staff-module-item:hover .module-chevron,
        .staff-module-item:focus-within .module-chevron {
          transform: translateX(2px) !important;
          color: var(--teal-primary, #008891) !important;
        }
        .staff-module-flyout {
          position: absolute;
          left: 100%;
          top: 0;
          padding-left: 8px; /* Seamless hover bridge */
          z-index: 200;
          opacity: 0;
          pointer-events: none;
          transform: translateX(-6px);
          transition: opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1), transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .staff-module-item:hover .staff-module-flyout,
        .staff-module-item:focus-within .staff-module-flyout {
          opacity: 1;
          pointer-events: auto;
          transform: translateX(0);
        }
        .staff-module-flyout.flyout-align-bottom {
          top: auto;
          bottom: -6px;
        }
        .staff-flyout-card {
          width: 235px;
          background: #ffffff;
          border: 1px solid rgba(0, 136, 145, 0.22);
          border-radius: 12px;
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 136, 145, 0.08);
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .staff-flyout-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 6px 8px 8px 8px;
          border-bottom: 1px solid var(--line, #e9e9e5);
          margin-bottom: 4px;
          cursor: pointer;
          border-radius: 6px;
          transition: background-color 0.15s ease;
        }
        .staff-flyout-header:hover {
          background: rgba(0, 136, 145, 0.05);
        }
        .staff-sub-item-btn:hover:not(.is-active) {
          background: rgba(0, 136, 145, 0.06) !important;
          color: var(--teal-primary, #008891) !important;
        }

        @media (max-width: 820px) {
          .staff-sidebar {
            position: fixed !important;
            left: -280px !important;
            top: 0 !important;
            height: 100vh !important;
            z-index: 150 !important;
            overflow-y: auto !important;
            transition: left 0.25s ease !important;
            box-shadow: 4px 0 24px rgba(0, 0, 0, 0.15) !important;
          }
          .staff-sidebar.is-open {
            left: 0 !important;
          }
          .staff-module-flyout {
            position: static !important;
            padding-left: 0 !important;
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto !important;
            transform: none !important;
            display: none;
          }
          .staff-module-item.is-mobile-open .staff-module-flyout {
            display: block !important;
          }
          .staff-flyout-card {
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            background: #f8faf9 !important;
            border-radius: 8px !important;
            margin-top: 4px !important;
            margin-bottom: 6px !important;
            padding: 6px !important;
          }
          .mobile-nav-toggle-btn {
            display: inline-flex !important;
          }
          .desktop-breadcrumb {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}

export { StaffPortal as AppLayout }
