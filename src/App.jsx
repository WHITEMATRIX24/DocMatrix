import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Menu, X, ArrowRight, ArrowLeft, Check, UserRound, Stethoscope, Building2, FlaskConical, Pill,
  MessagesSquare, CalendarCheck, LogIn, ClipboardCheck, FileText, CreditCard,
  Repeat, Bell, BarChart3, ShieldCheck, LayoutDashboard, Plug, FolderHeart, HeartPulse, Layers,
  Eye, Gauge, Network, Share2, Radio, CalendarClock, ChevronDown, ChevronRight, Activity, Sparkles,
  Play, Pause, Zap, CheckCircle2, RotateCcw, Package, MessageCircle, Receipt
} from 'lucide-react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import AuthPage from './AuthPage'
import StaffPortal from './StaffPortal'
import AppRoutes from './routes/appRoutes'
import DemoBanner from './components/DemoBanner'
import WhatsAppShortcut from './components/WhatsAppShortcut'
import { findDemoUserById, DEMO_USERS } from './mocks/auth'
import { getCurrentUser, logout as authLogout } from './services/authService'

export function getSafeNextPath(rawNext) {
  if (!rawNext) return '/dashboard'
  try {
    const decoded = decodeURIComponent(rawNext)
    if (decoded.startsWith('/') && !decoded.startsWith('//') && !decoded.includes('://')) {
      return decoded
    }
  } catch {}
  return '/dashboard'
}

// Authentic Clinical Healthcare Imagery (Zero Bank/ATM Reference)
const clinicalImagery = {
  reception: '/card-patient.jpg',        // Modern clinic reception & patient check-in
  consultation: '/card-appointment.jpg', // Examination room & doctor consultation chair
  records: '/card-records.jpg',          // Doctor reviewing digital EMR & radiographic scans
  prescription: '/card-prescription.jpg',// Doctor writing digital prescription with stethoscope
  corridor: '/clinic-corridor-8k.jpg',   // Modern clinical hospital corridor
  lab: '/diagnostics-lab.jpg',           // High-tech diagnostic laboratory
  workflow: '/clinical-workflow.jpg',    // Clinical workflow in practice
  doctor: '/hero-doctor.jpg'             // Modern healthcare professional
}

// Healthcare Ecosystem Ticker Partners
const partners = ['EMR Sync ↗', '▲ MedTech', '~ WhatsApp API', '▣ LabXpress', 'Practo Connect', 'Rx Gateway', 'ABDM Ready']

const createInitialsAvatar = (initials, bg) =>
  `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="${bg}"/><text x="50%" y="54%" font-family="system-ui, -apple-system, sans-serif" font-size="32" font-weight="700" fill="%23ffffff" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`

// Clinical Doctors & Practice Activity Indicators (Offline Local SVG Avatars)
const doctorsProof = [
  [
    createInitialsAvatar('SK', '%23008891'),
    'Dr. Shannon Kirkland',
    'Cardiology • Synced'
  ],
  [
    createInitialsAvatar('TA', '%230f766e'),
    'Dr. Tariq Antoun',
    'Oncology • Active'
  ],
  [
    createInitialsAvatar('SF', '%230284c7'),
    'Sarah Fredericksen',
    'Lab Diagnostics • 99.8%'
  ],
  [
    createInitialsAvatar('MC', '%23059669'),
    'Metro Care Health',
    '+520 Clinics Live'
  ]
]

// Navigation Links
const navItems = [
  { label: 'Solutions', id: 'solutions' },
  { label: 'Platform', id: 'about' },
  { label: 'Packages', id: 'packages' },
  { label: 'Contact', id: 'contact' }
]

// 6 Core Dental Practice Modules (DocMatrix Feature Plan)
const solutions = [
  {
    id: 'records',
    icon: FolderHeart,
    title: 'Patient Records & Dental Care',
    desc: 'Manage permanent patient IDs, medical and dental history, allergy alerts, visit timelines, interactive tooth charts, treatment plans, and digital consent records.',
    color: '#008891'
  },
  {
    id: 'appointments',
    icon: CalendarCheck,
    title: 'Appointments & Clinic Operations',
    desc: 'Manage doctor availability, appointment schedules, bookings, rescheduling, cancellations, and pending treatments from one workspace.',
    color: '#0A9EAD'
  },
  {
    id: 'clinical',
    icon: FileText,
    title: 'Clinical Workflows & Prescriptions',
    desc: 'Create structured clinical notes, digital prescriptions, treatment plans, and diagnostic orders while keeping every clinical decision connected to the patient\'s record.',
    color: '#008891'
  },
  {
    id: 'billing',
    icon: CreditCard,
    title: 'Billing, Accounts & Payments',
    desc: 'Connect itemised invoices, partial payments, UPI collections, expenses, GST-related reporting, accounts, profit-and-loss reports, and Tally export.',
    color: '#0A9EAD'
  },
  {
    id: 'inventory',
    icon: Package,
    title: 'Inventory & Dental Lab',
    desc: 'Track dental supplies, stock levels, expiry dates, purchases, laboratory cases, and the status of crowns, bridges, and dentures.',
    color: '#008891'
  },
  {
    id: 'engagement',
    icon: MessageCircle,
    title: 'WhatsApp & Patient Engagement',
    desc: 'Automate appointment confirmations, reminders, rescheduling updates, prescription and invoice delivery, recall messages, and patient follow-ups.',
    color: '#0A9EAD'
  }
]

// Detailed Dental Practice Management Modules (Source: DocMatrix Feature Plan)
const detailedModules = [
  {
    id: 'records',
    staffRoute: '/patients',
    number: '01',
    name: 'Patient Records & Dental Care',
    headline: 'Longitudinal dental records, connected tooth-by-tooth.',
    intro: 'Keep every patient\'s clinical history, dental condition, consent records, and treatment journey connected in one searchable workspace, eliminating lost files and fragmented records.',
    benefit: 'Dentists gain complete clinical context in seconds before starting any procedure, reducing medical risks, preventing contraindications, and eliminating chart retrieval delays.',
    image: '/card-dental-records.jpg',
    imageAlt: 'DocMatrix Patient Records & Interactive Dental Tooth Chart',
    imageBadge: 'Interactive Tooth Chart • Live Sync',
    features: [
      { name: 'Patient profiles', desc: 'Permanent patient IDs, searchable by name, phone number, or ID across visits.' },
      { name: 'Medical and dental history', desc: 'A complete patient profile with medical history, dental history, assigned doctor, and consent records.' },
      { name: 'Allergy alerts', desc: 'Display important allergy information and medical warnings prominently at the top of the patient record.' },
      { name: 'Visit timeline', desc: 'Maintain a comprehensive chronological history of consultations, treatments, notes, and follow-ups.' },
      { name: 'Document management', desc: 'Store digital X-rays, intraoral scans, photographs, and consent forms against the relevant patient and visit.' },
      { name: 'Interactive tooth chart', desc: 'Select individual teeth, record their exact conditions, and preserve tooth-specific history across all appointments.' },
      { name: 'Treatment planning', desc: 'Create step-by-step treatment plans with transparent cost estimates that patients can review and approve.' },
      { name: 'Multi-visit treatment tracking', desc: 'Track longer procedures, such as root canals, implants, and orthodontic treatments, across multiple sessions.' },
      { name: 'Digital consent', desc: 'Support digital consent records and tablet-based electronic signatures saved directly to the file.', status: 'Coming soon' }
    ]
  },
  {
    id: 'appointments',
    staffRoute: '/appointments/new',
    number: '02',
    name: 'Appointments & Clinic Operations',
    headline: 'Smart scheduling and clear appointment coordination.',
    intro: 'Coordinate appointments, doctor availability, and daily clinic activity from one synchronized operational workspace.',
    benefit: 'Keeps reception organised, maximizes chair productivity, and prevents uncompleted treatments from being overlooked.',
    image: '/card-clinic-operations.jpg',
    imageAlt: 'DocMatrix Multi-Doctor Appointment Calendar',
    imageBadge: 'Appointment Calendar',
    features: [
      { name: 'Smart scheduling', desc: 'Book appointments using actual clinic operating hours, operatory availability, and doctor rosters.' },
      { name: 'Daily schedule', desc: 'See the selected day’s appointments beside available booking times.' },
      { name: 'Rescheduling and cancellations', desc: 'Record slot changes and mandatory cancellation reasons for practice audit trails.' },
      { name: 'No-show management', desc: 'Identify missed appointments automatically and maintain a follow-up list of incomplete online booking enquiries.' },
      { name: 'Pending treatments', desc: 'Surface unfinished treatments from previous visits automatically as soon as the patient returns.' },
      { name: 'Multi-branch operations', desc: 'Support multiple clinic branches, cross-facility schedules, and centralized permissions under one login.', status: 'Coming soon' }
    ]
  },
  {
    id: 'clinical',
    staffRoute: '/clinical/prescriptions',
    number: '03',
    name: 'Clinical Workflows & Prescriptions',
    headline: 'Fast structured clinical notes, diagnostic orders, and digital prescriptions.',
    intro: 'Connect clinical documentation, diagnostic orders, treatment plans, and digital prescriptions directly to the patient\'s record.',
    benefit: 'Dentists finish chairside documentation in under two minutes using reusable master picklists and letterhead formatting, maintaining pristine diagnostic records without paperwork fatigue.',
    image: '/card-chairside-imaging.jpg',
    imageAlt: 'DocMatrix Chairside Clinical Notes & Digital Prescription',
    imageBadge: 'Clinic Letterhead Rx • Master Picklists',
    features: [
      { name: 'Structured clinical notes', desc: 'Record complaints, clinical findings, diagnoses, and treatment advice in a consistent, professional format.' },
      { name: 'Digital prescriptions', desc: 'Generate compliant prescriptions on the clinic\'s official letterhead for printing or instant digital delivery.' },
      { name: 'Clinical master lists', desc: 'Maintain reusable lists of dental complaints, examination findings, diagnoses, medicines, and advice.' },
      { name: 'Diagnostic orders', desc: 'Manage pathology and X-ray requests with one click, linked directly to the patient\'s consultation.' },
      { name: 'Treatment progress', desc: 'Track planned treatments step-by-step through clinical completion across all scheduled sessions.' },
      { name: 'Dental imaging', desc: 'Associate images from X-ray sensors, OPG panoramic systems, and intraoral cameras with the correct tooth and visit.', status: 'Coming soon' },
      { name: 'Dental specialty tracking', desc: 'Support orthodontic and implant workflows, including wire/bracket change logs, implant brand and lot details, and aligner reminders.', status: 'Coming soon' },
      { name: 'AI-assisted documentation', desc: 'Consultation-note drafts, treatment-plan suggestions, and stock-aware prescription assistance. The doctor always reviews and approves clinical outputs.', status: 'Planned' }
    ]
  },
  {
    id: 'billing',
    staffRoute: '/billing/invoices',
    number: '04',
    name: 'Billing, Accounts & Payments',
    headline: 'Itemised invoices, daily collection reconciliation, and Tally export.',
    intro: 'Connect invoices, collections, expenses, and financial reporting to give clinics a clearer view of their financial performance.',
    benefit: 'Gives clinic owners complete visibility into daily collections, overdue patient dues, and operating expenses, eliminating manual ledger reconciliations and tax filing stress.',
    image: '/card-financial-control.jpg',
    imageAlt: 'DocMatrix Financial Management & Itemised Invoicing',
    imageBadge: 'Tally Export Ready • GST Auto-Split',
    features: [
      { name: 'Itemised invoices', desc: 'Generate downloadable PDF invoices with individual service charges, consumables, and transparent discounts.' },
      { name: 'Flexible payments', desc: 'Record full and partial payments, track instalment plans, and maintain an immutable payment history.' },
      { name: 'UPI payments', desc: 'Display dynamic UPI QR codes directly on bills and support configured payment links sent via WhatsApp.', status: 'Coming soon' },
      { name: 'Outstanding dues', desc: 'Track unpaid balances and organise pending dues by age (30, 60, 90+ days) with instant settlement links.' },
      { name: 'Service pricing', desc: 'Maintain standardized service price lists and configure special promotion or package offer rates.' },
      { name: 'Daily collections', desc: 'Track cash, card, and UPI collections with automated end-of-day reconciliation summaries.' },
      { name: 'Expense tracking', desc: 'Record clinic expenses, vendor payouts, and overheads to compare income against expenditure in real time.' },
      { name: 'Accounts module', desc: 'Organise accounts, journal entries, ledger accounts, and daily day-book summaries in one place.' },
      { name: 'Financial reports', desc: 'Generate profit-and-loss reports, revenue by doctor, and treatment breakdown summaries.' },
      { name: 'GST-related functionality', desc: 'Auto-categorise procedures as healthcare treatment or cosmetic, generating tax-ready monthly reports.' },
      { name: 'Tally export', desc: 'One-click financial ledger data export to Tally for seamless chartered accountant audits.' }
    ]
  },
  {
    id: 'inventory',
    staffRoute: '/inventory/items',
    number: '05',
    name: 'Inventory & Dental Lab',
    headline: 'Real-time stock alerts, purchase tracking, and dental lab coordination.',
    intro: 'Monitor dental supplies, purchasing, stock availability, and laboratory cases to keep clinical work organized and chairs on schedule.',
    benefit: 'Prevents procedural delays caused by missing crowns or out-of-stock dental supplies, while minimizing inventory waste and expiry losses.',
    image: '/card-dental-lab.jpg',
    imageAlt: 'DocMatrix Dental Supplies Inventory & Lab Tracking',
    imageBadge: 'Lab Fabrication Tracking • Low-Stock Alerts',
    features: [
      { name: 'Stock management', desc: 'Record stock inward/outward movements and maintain accurate real-time inventory quantities.' },
      { name: 'Low-stock alerts', desc: 'Identify supplies that need replenishment and receive timely notifications before critical materials run out.' },
      { name: 'Expiry monitoring', desc: 'Track expiry dates across batches and surface automated alerts to prevent waste.' },
      { name: 'Purchase tracking', desc: 'Connect supplier purchases, unit costs, invoice numbers, and payment balances directly to inventory.' },
      { name: 'Treatment-linked inventory', desc: 'Automatically deduct relevant dental stock and consumables when treatments are completed.' },
      { name: 'Dental laboratory tracking', desc: 'Record crowns, bridges, dentures, and aligners sent to external commercial dental laboratories.' },
      { name: 'Lab status', desc: 'Track laboratory work through fabrication stages and confirm when items have safely returned to the clinic.' },
      { name: 'Lab billing', desc: 'Organise and reconcile monthly laboratory vendor bills against verified patient cases.', status: 'Coming soon' },
      { name: 'Asset management', desc: 'Track dental-chair and autoclave service history, warranty expirations, and routine maintenance logs.', status: 'Planned' }
    ]
  },
  {
    id: 'engagement',
    staffRoute: '/whatsapp/automation',
    number: '06',
    name: 'WhatsApp & Patient Engagement',
    headline: 'Automated appointment reminders, digital invoice delivery, and recall campaigns.',
    intro: 'Keep patients informed before and after appointments through automated messages, follow-ups, and connected communication workflows.',
    benefit: 'Dramatically cuts patient no-show rates by up to 40%, reactivates past patients for routine preventive cleanings, and delivers a modern communication experience.',
    image: '/card-whatsapp-engagement.jpg',
    imageAlt: 'DocMatrix WhatsApp Automation & Patient Reminders',
    imageBadge: 'Official WhatsApp API • 24h/2h Alerts',
    features: [
      { name: 'Appointment confirmations', desc: 'Send immediate automated booking confirmations to patients with clinic location and doctor details.' },
      { name: 'Automated reminders', desc: 'Configure timed reminders, including the scheduled 24-hour and 2-hour pre-visit notifications.' },
      { name: 'Appointment updates', desc: 'Notify patients instantly about rescheduled appointments or unavoidable doctor delays.' },
      { name: 'Patient onboarding', desc: 'Send warm welcome messages, pre-visit instructions, and verification codes for new patient registration.' },
      { name: 'Document delivery', desc: 'Deliver digital prescriptions and itemised invoices directly through configured messaging workflows.' },
      { name: 'Recall reminders', desc: 'Remind patients automatically when 6-month hygiene visits, routine dental cleanings, or follow-ups are due.' },
      { name: 'Patient retention', desc: 'Support automated birthday messages, seasonal clinic greetings, and personalized wellness offers.', status: 'Coming soon' },
      { name: 'Regional-language messaging', desc: 'Deliver patient messages in Malayalam and English tailored to the clinic\'s local patient community.', status: 'Coming soon' },
      { name: 'Communication controls', desc: 'Provide an on/off master switch and a detailed audit log of every sent notification.' },
      { name: 'Shared WhatsApp inbox', desc: 'Two-way patient conversations managed through the clinic\'s official WhatsApp Business number.', status: 'Planned' },
      { name: 'Patient portal', desc: 'Enable patient online access to view their personal dental records, bills, and prescriptions securely.', status: 'Planned' }
    ]
  }
]

// 15 Comprehensive Platform Capabilities
const features = [
  [CalendarClock, 'Appointment Management'],
  [LogIn, 'Digital Check-in'],
  [FolderHeart, 'Patient Records'],
  [FileText, 'Digital Prescription'],
  [FlaskConical, 'Lab Reports'],
  [CreditCard, 'Payment Tracking'],
  [Pill, 'Pharmacy Integration'],
  [Repeat, 'Follow-up Management'],
  [Bell, 'Notifications'],
  [BarChart3, 'Reports & Analytics'],
  [ShieldCheck, 'Role-Based Access'],
  [LayoutDashboard, 'Operational Dashboards'],
  [HeartPulse, 'Patient Engagement'],
  [Plug, 'Third-Party Integrations']
]

// Subscription Plans Configuration
const subscriptionPlans = [
  {
    id: 'free',
    name: 'Free',
    price: '₹0',
    billing: 'Free forever for solo practice',
    featured: false,
    cta: 'Get Started Free'
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 'Price to be finalised',
    billing: 'Annual subscription',
    featured: false,
    cta: 'Enquire for Starter'
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'Price to be finalised',
    billing: 'Annual subscription',
    featured: true,
    badge: 'RECOMMENDED',
    cta: 'Enquire for Pro'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom pricing',
    billing: 'Custom SLA & multi-branch',
    featured: false,
    cta: 'Contact Sales'
  }
]

// 16 Core Comparison Features (Source of Truth: DocMatrix Feature Plan)
const comparisonFeatures = [
  {
    name: 'Appointment management',
    entitlements: { free: true, starter: true, pro: true, enterprise: true }
  },
  {
    name: 'Patient records and dental history',
    entitlements: { free: '100 / yr', starter: true, pro: true, enterprise: true }
  },
  {
    name: 'Digital prescriptions',
    entitlements: { free: true, starter: true, pro: true, enterprise: true }
  },
  {
    name: 'Staff accounts and permissions',
    entitlements: { free: '1 Login', starter: 'Up to 3', pro: 'Unlimited', enterprise: 'Unlimited' }
  },
  {
    name: 'WhatsApp reminders',
    entitlements: { free: false, starter: 'Add-on', pro: 'Add-on', enterprise: 'Included' }
  },
  {
    name: 'Interactive dental tooth chart',
    entitlements: { free: false, starter: true, pro: true, enterprise: true }
  },
  {
    name: 'Treatment plans with cost estimates',
    entitlements: { free: false, starter: true, pro: true, enterprise: true }
  },
  {
    name: 'Inventory and low-stock alerts',
    entitlements: { free: false, starter: 'Basic', pro: true, enterprise: true }
  },
  {
    name: 'Recall reminders',
    entitlements: { free: false, starter: true, pro: true, enterprise: true }
  },
  {
    name: 'Billing and payment tracking',
    entitlements: { free: 'Basic', starter: true, pro: true, enterprise: true }
  },
  {
    name: 'Accounts and expense tracking',
    entitlements: { free: false, starter: 'Basic', pro: true, enterprise: true }
  },
  {
    name: 'GST-related reporting',
    entitlements: { free: false, starter: false, pro: true, enterprise: true }
  },
  {
    name: 'Tally export',
    entitlements: { free: false, starter: false, pro: true, enterprise: true }
  },
  {
    name: 'Multi-branch management',
    entitlements: { free: false, starter: false, pro: 'Add-on', enterprise: true }
  },
  {
    name: 'Data export and migration support',
    entitlements: { free: 'Export only', starter: 'Free migration', pro: 'Free migration', enterprise: 'Priority support' }
  }
]

function PlanEntitlement({ val, isFeatured }) {
  if (val === true) {
    return (
      <span className="val-check-wrap" aria-label="Included">
        <Check size={15} strokeWidth={2.8} />
      </span>
    )
  }
  if (val === false || val === null || val === undefined) {
    return <span className="val-dash" aria-label="Not included">—</span>
  }
  return (
    <span className={`val-pill ${isFeatured ? 'val-pill-featured' : ''}`}>
      {val}
    </span>
  )
}

// 6 Value Pillars
const why = [
  [Layers, 'Unified Healthcare Operations', 'Front desk, clinical, lab and pharmacy teams work from the same live picture.'],
  [Share2, 'Connected Patient Journey', 'Every step of a visit hands off cleanly to the next, with nothing re-entered.'],
  [Eye, 'Workflow Visibility', 'See where each patient is and what is pending across the clinic.'],
  [Network, 'Scalable Healthcare Platform', 'Start with one clinic and extend to departments, sites and partner networks.'],
  [Radio, 'Multi-Channel Communication', 'Reach patients and staff through the channels that fit each situation.'],
  [Gauge, 'Operational Insights', 'Turn daily activity into reports that help leaders plan capacity and service.']
]

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

function Brand({ light = false }) {
  return (
    <a className="brand-anchor" href="#top" aria-label="DOC MATRIX Home">
      <MedicalCrossMark light={light} />
      <span className="brand-title">DOC MATRIX</span>
    </a>
  )
}

function Interactive3DClinicFlow() {
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 })
  const stageRef = useRef(null)

  // Subtle 3D mouse parallax
  const handleMouseMove = (e) => {
    if (!stageRef.current) return
    const rect = stageRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    setTilt({ rx: -(y - 0.5) * 4, ry: (x - 0.5) * 5 })
  }

  const handleMouseLeave = () => {
    setTilt({ rx: 0, ry: 0 })
  }

  return (
    <div
      className="clinic-portal-wrapper"
      ref={stageRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      aria-label="Seamless Clinic Animation"
    >
      {/* Organic Glass Portal Viewport (No harsh boundaries, blends seamlessly into the page) */}
      <div
        className="clinic-portal-stage"
        style={{
          transform: `perspective(1000px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Seamless Merged Video (No harsh lines/borders, completely merged into page) */}
        <div className="clinic-portal-frame">
          <video
            src="/Patient_journey_in_dental_clinic_20261013234745.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="clinic-merged-video"
            aria-label="Patient journey in dental clinic"
          />

          {/* 4-Edge Soft Vignettes & Fades to eliminate all borders and square lines */}
          <div className="clinic-edge-fade-top" aria-hidden="true" />
          <div className="clinic-edge-fade-bottom" aria-hidden="true" />
          <div className="clinic-edge-fade-left" aria-hidden="true" />
          <div className="clinic-edge-fade-right" aria-hidden="true" />
          <div className="clinic-radial-vignette" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}

function DoctorPill({ name, role, avatar }) {
  return (
    <div className="person proof-pill">
      <img className="avatar" src={avatar} alt={name} />
      <span>
        <b>{name}</b>
        <small>{role}</small>
      </span>
    </div>
  )
}

export function AnimatedGradientText({
  children,
  className = '',
  speed = 2,
  colorFrom = '#4ade80',
  colorTo = '#06b6d4',
  ...props
}) {
  return (
    <span
      className={`animated-gradient-text ${className}`}
      style={{
        '--color-from': colorFrom,
        '--color-to': colorTo,
        '--speed': `${speed}s`
      }}
      {...props}
    >
      {children}
    </span>
  )
}

export function FlickeringGrid({
  squareSize = 4,
  gridGap = 6,
  flickerChance = 0.1,
  color = '#60A5FA',
  maxOpacity = 0.5,
  className = '',
  width,
  height
}) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)

  const rgbColor = useMemo(() => {
    if (color.startsWith('#')) {
      let c = color.substring(1)
      if (c.length === 3) c = c.split('').map((x) => x + x).join('')
      const num = parseInt(c, 16)
      return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`
    }
    return '96, 165, 250'
  }, [color])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId
    let gridParams = { cols: 0, rows: 0, squares: new Float32Array(0), w: 0, h: 0 }

    const updateSize = () => {
      const rect = container.getBoundingClientRect()
      const w = width || rect.width || 800
      const h = height || rect.height || 600
      const dpr = Math.min(window.devicePixelRatio || 1, 2)

      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.resetTransform?.()
      ctx.scale(dpr, dpr)

      const step = squareSize + gridGap
      const cols = Math.floor((w + gridGap) / step)
      const rows = Math.floor((h + gridGap) / step)
      const total = cols * rows
      const squares = new Float32Array(total)

      for (let i = 0; i < total; i++) {
        squares[i] = Math.random() * maxOpacity
      }

      gridParams = { cols, rows, squares, w, h }
    }

    updateSize()

    const ro = new ResizeObserver(() => {
      updateSize()
    })
    ro.observe(container)

    let lastDraw = 0
    const render = (now) => {
      if (now - lastDraw > 25) {
        lastDraw = now
        const { cols, rows, squares, w, h } = gridParams
        if (cols > 0 && rows > 0) {
          ctx.clearRect(0, 0, w, h)
          const step = squareSize + gridGap

          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const idx = r * cols + c
              if (Math.random() < flickerChance) {
                squares[idx] = Math.random() * maxOpacity
              }
              const op = squares[idx]
              if (op > 0.02) {
                ctx.fillStyle = `rgba(${rgbColor}, ${op})`
                ctx.fillRect(c * step, r * step, squareSize, squareSize)
              }
            }
          }
        }
      }
      animationFrameId = requestAnimationFrame(render)
    }

    animationFrameId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animationFrameId)
      ro.disconnect()
    }
  }, [squareSize, gridGap, flickerChance, rgbColor, maxOpacity, width, height])

  return (
    <div ref={containerRef} className={`flickering-grid-container ${className}`}>
      <canvas ref={canvasRef} className="flickering-grid-canvas" />
    </div>
  )
}

function ModuleDetailPage({ moduleData, onBack, onContact }) {
  const smoothScrollTo = (id) => (e) => {
    e.preventDefault()
    const target = document.getElementById(id)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <div className="module-page-view">
      {/* Top Header with Breadcrumbs & Actions */}
      <header className="module-page-header">
        <div className="wrap module-page-header-wrap">
          <div className="module-header-left">
            <button onClick={onBack} className="module-brand-btn" aria-label="Return to DocMatrix Home">
              <MedicalCrossMark />
              <span className="brand-title">DOC MATRIX</span>
            </button>
            <span className="module-breadcrumb-sep">/</span>
            <button onClick={onBack} className="module-breadcrumb-link">Solutions</button>
            <span className="module-breadcrumb-sep">/</span>
            <span className="module-breadcrumb-current">{moduleData.name}</span>
          </div>

          <div className="module-header-right">
            <button onClick={onBack} className="btn-back-to-solutions">
              <ArrowLeft size={14} /> Back to Solutions
            </button>
            <button onClick={onContact} className="pill dark-pill">
              Request Demo ↗
            </button>
          </div>
        </div>
      </header>

      {/* Module Hero Section */}
      <section className="module-hero-section">
        <div className="wrap module-hero-content">
          <div className="module-hero-badge-row">
            <span className="module-number-badge">MODULE {moduleData.number}</span>
            <span className="module-hero-kicker">DENTAL PRACTICE MANAGEMENT</span>
          </div>

          <h1 className="module-hero-title">{moduleData.name}</h1>
          <p className="module-hero-headline">{moduleData.headline}</p>
          <p className="module-hero-intro">{moduleData.intro}</p>

          <div className="module-hero-actions">
            <a href="#module-features" onClick={smoothScrollTo('module-features')} className="btn-hero-teal">
              Explore All Features ↓
            </a>
            <button onClick={onContact} className="btn-hero-outline">
              Schedule Live Walkthrough
            </button>
          </div>
        </div>
      </section>

      {/* Visual Showcase Card */}
      <section className="module-showcase-section">
        <div className="wrap">
          <div className="module-showcase-card">
            <img src={moduleData.image} alt={moduleData.imageAlt} className="module-showcase-img" />
            <div className="module-showcase-overlay" />
            <div className="module-showcase-pill">
              <span className="live-dot" />
              <span>{moduleData.imageBadge}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="module-features" className="module-features-section">
        <div className="wrap">
          <div className="section-head rv in">
            <span className="section-kicker">MODULE CAPABILITIES</span>
            <h2 className="section-title">Everything included in {moduleData.name}.</h2>
            <p className="section-lead">
              A comprehensive breakdown of features designed specifically for modern dental practices.
            </p>
          </div>

          <div className="module-page-features-grid">
            {moduleData.features.map((feat) => (
              <div key={feat.name} className="module-page-feature-card">
                <div className="feat-card-top">
                  <div className="feat-check-wrap">
                    <Check size={15} strokeWidth={2.8} />
                  </div>
                  {feat.status && (
                    <span className={`module-status-badge status-${feat.status.toLowerCase().replace(' ', '-')}`}>
                      {feat.status}
                    </span>
                  )}
                </div>
                <h3 className="feat-card-title">{feat.name}</h3>
                <p className="feat-card-desc">{feat.desc}</p>
              </div>
            ))}
          </div>

          {/* Practical Practice Impact Callout */}
          <div className="module-page-impact-box">
            <div className="impact-icon-col">
              <div className="impact-icon-wrap">
                <Sparkles size={22} color="#008891" />
              </div>
            </div>
            <div className="impact-content-col">
              <span className="impact-label">PRACTICE IMPACT & CLINICAL ROI</span>
              <h3 className="impact-heading">How this helps your dental clinic daily</h3>
              <p className="impact-text">{moduleData.benefit}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Module Page Footer */}
      <footer className="footer-site">
        <div className="wrap footer-bottom-bar">
          <p>© {new Date().getFullYear()} DocMatrix Technologies. All rights reserved. Healthcare in Sync.</p>
          <div className="footer-legal">
            <button onClick={onBack} className="footer-legal-link">
              ← Return to DocMatrix Home
            </button>
          </div>
        </div>
      </footer>
    </div>
  )
}

function SolutionModuleRoute({ onBack, onContact, detailedModules }) {
  const { id } = useParams()
  const activeModule = detailedModules.find((m) => m.id === id) || detailedModules[0]
  return (
    <ModuleDetailPage
      moduleData={activeModule}
      onBack={onBack}
      onContact={onContact}
    />
  )
}

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [ready, setReady] = useState(false)
  const [gridReady, setGridReady] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [lineOne, setLineOne] = useState('**********')
  const [lineTwo, setLineTwo] = useState('********************')
  const mosaicRef = useRef(null)

  // Authenticated Staff User Session State (Holds user in state, checks both authService and sessionStorage)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const authUser = getCurrentUser()
      if (authUser) return authUser

      const saved = sessionStorage.getItem('docmatrix-demo-session')
      if (saved) {
        if (saved.startsWith('{')) {
          const parsed = JSON.parse(saved)
          return findDemoUserById(parsed.id) || parsed
        }
        return findDemoUserById(saved) || DEMO_USERS.ORGANIZATION_ADMIN
      }
    } catch {}
    return null
  })

  // Logged-in user opening /login or /signup goes to /dashboard (Problem P2)
  useEffect(() => {
    if (currentUser && (location.pathname === '/login' || location.pathname === '/signup')) {
      navigate('/dashboard', { replace: true })
    }
  }, [currentUser, location.pathname, navigate])

  // Hash compatibility: support deep-linking via #/route if accessed
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash
      if (hash.startsWith('#/')) {
        const path = hash.slice(1)
        navigate(path)
      }
    }
    handleHash()
    window.addEventListener('hashchange', handleHash)
    return () => window.removeEventListener('hashchange', handleHash)
  }, [navigate])

  const handleLoginSuccess = (user) => {
    setCurrentUser(user)
    try {
      sessionStorage.setItem('docmatrix-demo-session', user.id)
    } catch {}
    const params = new URLSearchParams(location.search)
    const rawNext = params.get('next')
    const safeNext = getSafeNextPath(rawNext)
    navigate(safeNext)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleLogout = () => {
    setCurrentUser(null)
    authLogout()
    try {
      sessionStorage.removeItem('docmatrix-demo-session')
    } catch {}
    navigate('/')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const navigateToAuth = (view) => (e) => {
    if (e) e.preventDefault()
    navigate(`/${view}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openModulePage = (id) => (e) => {
    if (e) e.preventDefault()
    const areaMap = {
      records: '/patients',
      appointments: '/appointments',
      clinical: '/clinical',
      billing: '/billing',
      inventory: '/inventory',
      engagement: '/whatsapp'
    }
    const target = areaMap[id] || `/solutions/${id}`
    navigate(target)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const smoothScroll = (id) => (e) => {
    if (e) e.preventDefault()
    setMobileOpen(false)
    if (location.pathname !== '/') {
      navigate('/#' + id)
      setTimeout(() => {
        const el = document.getElementById(id)
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      }, 100)
      return
    }
    const el = document.getElementById(id)
    if (el) {
      const topOffset = el.getBoundingClientRect().top + window.pageYOffset - 40
      window.scrollTo({ top: topOffset, behavior: 'smooth' })
    }
  }

  useEffect(() => {
    if (location.pathname !== '/') return

    const start = window.setTimeout(() => setReady(true), 40)

    // Progressive Scramble Headline Animation
    const scramble = (target, setter) => {
      const glyphs = 'DOCMATRIX0123456789'
      let frame = 0
      const total = 26
      const timer = window.setInterval(() => {
        frame += 1
        const resolved = Math.floor((frame / total) * target.length)
        setter(
          target
            .split('')
            .map((char, index) => {
              if (char === ' ') return ' '
              if (index < resolved) return char
              return glyphs[(frame * 3 + index * 7) % glyphs.length]
            })
            .join('')
        )
        if (frame >= total) {
          window.clearInterval(timer)
          setter(target)
        }
      }, 34)
      return timer
    }

    let first = 0
    let second = 0
    const scrambleStart = window.setTimeout(() => {
      first = scramble('DOC MATRIX', setLineOne)
      second = scramble('Healthcare, in Sync', setLineTwo)
    }, 210)

    // Observer for Mosaic section
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setGridReady(true)
        }
      },
      { threshold: 0.23 }
    )

    if (mosaicRef.current) observer.observe(mosaicRef.current)

    // General scroll reveals for lower sections
    const rvObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in')
            rvObserver.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )

    document.querySelectorAll('.rv').forEach((el) => rvObserver.observe(el))

    return () => {
      window.clearTimeout(start)
      window.clearTimeout(scrambleStart)
      window.clearInterval(first)
      window.clearInterval(second)
      observer.disconnect()
      rvObserver.disconnect()
    }
  }, [location.pathname])

  return (
    <div className="docmatrix-app-root">
      <DemoBanner />
      <AppRoutes
        currentUser={currentUser}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
        renderLandingPage={(view) => {
          if (view === 'login' || view === 'signup') {
            return (
              <AuthPage
                view={view}
                onNavigate={(nextView) => {
                  navigate(`/${nextView}`)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                onBackHome={() => {
                  navigate('/')
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                onLoginSuccess={handleLoginSuccess}
              />
            )
          }

          if (view === 'solution') {
            return (
              <SolutionModuleRoute
                onBack={() => {
                  navigate('/')
                  setTimeout(() => {
                    const el = document.getElementById('solutions')
                    if (el) el.scrollIntoView({ behavior: 'smooth' })
                  }, 60)
                }}
                onContact={() => {
                  navigate('/')
                  setTimeout(() => {
                    const el = document.getElementById('contact')
                    if (el) el.scrollIntoView({ behavior: 'smooth' })
                  }, 60)
                }}
                detailedModules={detailedModules}
              />
            )
          }

          return (
            <main id="top" className={`page-container ${ready ? 'is-ready' : ''}`}>
      {/* ===================================================================
          SECTION 1 — FULLSCREEN ANIMATED HERO
          =================================================================== */}
      <section className="hero" id="home">
        {/* Navigation Bar */}
        <header className="topbar">
          <Brand />
          
          <nav className="topbar-links" aria-label="Main navigation">
            <a href="#mosaic" onClick={smoothScroll('mosaic')} className="nav-text-link">Platform</a>
            <a href="#solutions" onClick={smoothScroll('solutions')} className="nav-text-link">Solutions</a>
            <a href="#contact" onClick={smoothScroll('contact')} className="nav-text-link">Contact</a>
          </nav>

          <div className="topbar-auth-group">
            <a
              href="/login"
              onClick={navigateToAuth('login')}
              className="btn-auth-signin"
              aria-label="Clinic Login"
            >
              <LogIn size={15} strokeWidth={2.2} />
              <span>Login</span>
            </a>
            <a
              href="/signup"
              onClick={navigateToAuth('signup')}
              className="btn-auth-signup"
              aria-label="Clinic Sign Up"
            >
              <span>Sign Up</span>
              <ArrowRight size={15} strokeWidth={2.4} />
            </a>
          </div>
        </header>

        {/* Hero Editorial Copy */}
        <div className="hero-copy">
          <p className="eyebrow">CLINIC MANAGEMENT PLATFORM</p>
          <h1>
            <AnimatedGradientText
              speed={2}
              colorFrom="#4ade80"
              colorTo="#06b6d4"
              className="docmatrix-headline"
            >
              {lineOne}
            </AnimatedGradientText>
            <span className="headline-teal">{lineTwo}</span>
          </h1>
          <p className="intro">
            One connected platform for patient records, appointments, clinical workflows and billing.
            Built for modern medical centers and healthcare networks.
          </p>
        </div>

        {/* Interactive 3D Running Clinic Workflow Animation */}
        <Interactive3DClinicFlow />

        {/* Decorative Vertical Pale Word */}
        <span className="vertical-word" aria-hidden="true">
          CLINICAL
        </span>


        {/* Healthcare Partner Ticker Track */}
        <div className="partner-row" aria-label="Connected healthcare ecosystem partners">
          <div className="partner-track">
            {[0, 1].map((set) => (
              <div className="partner-set" key={set} aria-hidden={set === 1}>
                {partners.map((partner) => (
                  <span key={`${set}-${partner}`}>{partner}</span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================================================================
          SECTION 2 — MINIMAL DARK CLINICAL MOSAIC (Continuously Resizing Loop)
          =================================================================== */}
      <section
        id="mosaic"
        ref={mosaicRef}
        className={`mosaic ${gridReady ? 'grid-ready' : ''}`}
      >
        <div className="mosaic-grid">
          {/* Left Stack (2 Vertically Stacked Cards) */}
          <div className="left-stack">
            {/* Card 1: Longitudinal Dental Records */}
            <article className="tile tile-emr">
              <img src={clinicalImagery.records} alt="Doctor reviewing longitudinal patient records" />
              <div className="tile-shade clinical" />
              <p className="tile-kicker">LONGITUDINAL DENTAL RECORDS</p>
              <h2>Complete Dental Care</h2>
              <span>
                Keep patient IDs, medical and dental history, allergy alerts, interactive tooth charts, treatment plans, and multi-visit treatment records connected in one place.
              </span>
            </article>

            {/* Card 3: Connected Financials */}
            <article className="tile tile-trust">
              <p className="tile-kicker">CONNECTED FINANCIALS</p>
              <h3>Complete Financial Control</h3>
              <span>
                Manage itemised invoices, payments, expenses, GST-related reporting, accounts, profit-and-loss reports, and Tally exports.
              </span>
              <div className="teal-corner" />
              <div className="dot-field" />
            </article>
          </div>

          {/* Right Stack (3 Horizontal Bands, 5 Tiles) */}
          <div className="right-stack">
            {/* Card 2: Smart Clinic Operations */}
            <article className="tile tile-stats">
              <img src={clinicalImagery.corridor} alt="Modern hospital and clinic facilities" />
              <div className="tile-shade soft" />
              <div className="stats-copy">
                <p>SMART CLINIC OPERATIONS</p>
                <strong>Effortless Clinic Operations</strong>
                <span>
                  Coordinate appointments, doctor availability, WhatsApp reminders, recall notifications, and inventory alerts in one connected workflow.
                </span>
              </div>
            </article>

            {/* Middle Band: 2 Clinical Flow Tiles */}
            <div className="middle-stack">
              {/* Card 4: Dental Lab Coordination */}
              <article className="tile tile-ai">
                <img src={clinicalImagery.lab} alt="Diagnostic laboratory queue" />
                <div className="tile-shade soft" />
                <p className="tile-kicker">DENTAL LAB COORDINATION</p>
                <h3>Dental Lab Tracking</h3>
                <span>
                  Track crowns, bridges, and dentures sent to dental laboratories, monitor their status, and connect lab work to patient treatments.
                </span>
              </article>

              <article className="tile tile-easy">
                <img src={clinicalImagery.consultation} alt="Doctor examination room" />
                <div className="tile-shade soft" />
                <p>Doctor Visits</p>
              </article>
            </div>

            {/* Bottom Band: 2 Communication & Operational Tiles */}
            <div className="bottom-stack">
              {/* Card 5: Patient Engagement */}
              <article className="tile tile-payment">
                <img src={clinicalImagery.workflow} alt="Connected patient care workflow" />
                <div className="tile-shade soft" />
                <p className="tile-kicker">PATIENT ENGAGEMENT</p>
                <h3>WhatsApp & Patient Engagement</h3>
                <span>
                  Automate appointment confirmations, reminders, rescheduling notifications, prescription and invoice delivery, and patient follow-ups.
                </span>
              </article>

              {/* Card 6: Doctor-Reviewed AI */}
              <article className="tile tile-invested">
                <img src={clinicalImagery.prescription} alt="Clinical reliability desk" />
                <div className="tile-shade clinical" />
                <p className="tile-kicker">DOCTOR-REVIEWED AI • PLANNED</p>
                <h3>AI-Assisted Clinical Workflows</h3>
                <span>
                  Support clinical documentation with consultation-note drafts, treatment-plan suggestions, and prescription assistance reviewed by the doctor.
                </span>
              </article>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================
          SUBSEQUENT COMPATIBLE SECTIONS (DOC MATRIX CLINICAL PLATFORM)
          =================================================================== */}

      {/* Section 3: Built for Modern Clinics Overview with FlickeringGrid */}
      <section id="about" className="section-padded modern-clinics-section">
        {/* Magic UI Flickering Grid Canvas Effect */}
        <FlickeringGrid
          squareSize={4}
          gridGap={6}
          color="#60A5FA"
          maxOpacity={0.45}
          flickerChance={0.12}
          className="modern-clinics-flicker-grid"
        />

        <div className="wrap relative-content">
          <div className="section-head rv">
            <span className="section-kicker kicker-badge">BUILT FOR MODERN CLINICS</span>
            <h2 className="section-title">
              Healthcare technology, designed to{' '}
              <span className="text-gradient-highlight">fade into the background</span>.
            </h2>
            <p className="section-lead">
              DocMatrix connects the people, steps, and systems that make a clinic run — so teams spend{' '}
              <mark className="text-pill-highlight">less time coordinating</mark> and{' '}
              <mark className="text-pill-highlight">more time caring</mark>.
            </p>
          </div>

          <div className="modern-cards-grid">
            <div className="feature-modern-card rv">
              <div className="card-icon-bubble">
                <Stethoscope size={22} color="#008891" />
              </div>
              <h3 className="card-heading">
                <span className="card-heading-accent">Complete Dental Care</span>
              </h3>
              <p className="card-desc">
                Comprehensive <span className="card-key-phrase">patient records</span>, interactive tooth charts, structured treatment plans, and{' '}
                <span className="card-key-phrase">multi-visit tracking</span>.
              </p>
            </div>

            <div className="feature-modern-card rv">
              <div className="card-icon-bubble">
                <CalendarCheck size={22} color="#008891" />
              </div>
              <h3 className="card-heading">
                <span className="card-heading-accent">Effortless Clinic Operations</span>
              </h3>
              <p className="card-desc">
                <span className="card-key-phrase">Real-time appointments</span>, automated WhatsApp reminders, recall notifications, and connected{' '}
                <span className="card-key-phrase">inventory management</span>.
              </p>
            </div>

            <div className="feature-modern-card rv">
              <div className="card-icon-bubble">
                <CreditCard size={22} color="#008891" />
              </div>
              <h3 className="card-heading">
                <span className="card-heading-accent">Complete Financial Control</span>
              </h3>
              <p className="card-desc">
                <span className="card-key-phrase">Itemised billing</span>, GST reporting, real-time expense tracking, accounts management, and seamless{' '}
                <span className="card-key-phrase">Tally export</span>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Solutions Overview Cards (Each linking to its separate page) */}
      <section id="solutions" className="section-padded bg-soft">
        <div className="wrap">
          <div className="section-head rv">
            <span className="section-kicker">SOLUTIONS</span>
            <h2 className="section-title">Everything your dental practice needs.</h2>
            <p className="section-lead">
              Connected clinical workflows, smarter operations, and complete financial visibility — all in one dental practice management platform.
            </p>
          </div>

          {/* 6-Card Overview Grid — Clicking any card opens its dedicated separate page */}
          <div className="solutions-hex-grid">
            {solutions.map((item, idx) => {
              const Icon = item.icon
              return (
                <div
                  key={item.title}
                  onClick={openModulePage(item.id)}
                  className="solution-box rv"
                  style={{ transitionDelay: `${idx * 0.08}s` }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') openModulePage(item.id)(e) }}
                >
                  <div className="solution-icon-box" style={{ background: `${item.color}14`, color: item.color }}>
                    <Icon size={24} />
                  </div>
                  <h3 className="solution-title">{item.title}</h3>
                  <p className="solution-desc">{item.desc}</p>
                  <div className="solution-action">
                    <span>Explore full module page</span>
                    <ArrowRight size={14} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Section 6: Comprehensive Features List (15 capabilities) */}
      <section id="features" className="section-padded bg-soft">
        <div className="wrap">
          <div className="section-head rv">
            <span className="section-kicker">CAPABILITIES</span>
            <h2 className="section-title">Everything a modern healthcare facility requires.</h2>
            <p className="section-lead">
              15 production-grade operational capabilities configured to your clinic's precise specialty and protocol.
            </p>
          </div>

          <div className="features-compact-grid">
            {features.map(([Icon, title], idx) => (
              <div key={title} className="feature-compact-item rv" style={{ transitionDelay: `${idx * 0.04}s` }}>
                <div className="feature-icon-circle">
                  <Icon size={18} color="#008891" />
                </div>
                <span className="feature-compact-title">{title}</span>
                <Check size={16} className="feature-check" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 7: Packages & Pricing Comparison */}
      <section id="packages" className="section-padded bg-soft">
        <div className="wrap">
          <div className="section-head rv">
            <span className="section-kicker">PACKAGES</span>
            <h2 className="section-title">Find the right plan for your practice.</h2>
            <p className="section-lead">
              Transparent pricing, essential features, and room to grow as your dental practice evolves.
            </p>
          </div>

          <div className="pricing-table-wrapper rv">
            <div className="pricing-table-scroll">
              <table className="pricing-table">
                <thead>
                  <tr>
                    <th className="th-feature">
                      <span className="th-feature-heading">Feature</span>
                      <span className="th-feature-sub">16 practice capabilities</span>
                    </th>
                    {subscriptionPlans.map((plan) => (
                      <th
                        key={plan.id}
                        className={`th-plan ${plan.featured ? 'is-featured' : ''}`}
                      >
                        <div className="plan-header-content">
                          {plan.featured && (
                            <span className="plan-subtle-badge">{plan.badge}</span>
                          )}
                          <h3 className="plan-name">{plan.name}</h3>
                          <div className="plan-price">{plan.price}</div>
                          <p className="plan-billing">{plan.billing}</p>
                          <a
                            href={`/not-built-yet?button=${encodeURIComponent(plan.name + ' Plan')}`}
                            onClick={(e) => {
                              e.preventDefault()
                              navigate(`/not-built-yet?button=${encodeURIComponent(plan.name + ' Plan')}`)
                            }}
                            className={`plan-cta-btn ${
                              plan.featured ? 'btn-teal-primary' : 'btn-outline-white'
                            }`}
                          >
                            {plan.cta}
                          </a>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((item, idx) => (
                    <tr key={item.name} className={idx % 2 === 1 ? 'row-alt' : ''}>
                      <td className="td-feature">
                        <span className="feature-name">{item.name}</span>
                      </td>
                      {subscriptionPlans.map((plan) => {
                        const val = item.entitlements[plan.id]
                        return (
                          <td
                            key={plan.id}
                            className={`td-val ${plan.featured ? 'is-featured' : ''}`}
                          >
                            <PlanEntitlement val={val} isFeatured={plan.featured} />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Section 9: Why Doc Matrix (6 Pillars) */}
      <section id="why" className="section-padded bg-white">
        <div className="wrap">
          <div className="section-head rv">
            <span className="section-kicker">WHY DOC MATRIX</span>
            <h2 className="section-title">Why leading clinics choose DocMatrix.</h2>
            <p className="section-lead">
              The difference is in the connection — no gaps, no dropped handoffs, no lost history.
            </p>
          </div>

          <div className="why-pillars-grid">
            {why.map(([Icon, title, desc], idx) => (
              <div key={title} className="why-box rv" style={{ transitionDelay: `${idx * 0.06}s` }}>
                <div className="why-icon-bubble">
                  <Icon size={22} color="#008891" />
                </div>
                <h3 className="why-box-title">{title}</h3>
                <p className="why-box-desc">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 10: Contact / Consultation Request */}
      <section id="contact" className="section-padded bg-dark">
        <div className="wrap contact-layout">
          <div className="contact-text-col rv">
            <span className="section-kicker light">READY TO CONNECT?</span>
            <h2 className="contact-headline">Schedule a personalized platform walkthrough.</h2>
            <p className="contact-lead">
              See how DocMatrix organizes records and brings your clinical staff into sync.
            </p>
            <div className="contact-metrics">
              <div>
                <strong>+520</strong>
                <span>Clinics live</span>
              </div>
              <div>
                <strong>99.98%</strong>
                <span>Uptime SLA</span>
              </div>
              <div>
                <strong>&lt; 24h</strong>
                <span>Onboarding turnaround</span>
              </div>
            </div>
          </div>

          <div className="contact-form-col rv">
            <form className="clinic-inquiry-form" onSubmit={(e) => { e.preventDefault(); alert('Thank you for reaching out! A DocMatrix specialist will contact you shortly.') }}>
              <div className="form-row">
                <label>
                  <span>Your Full Name</span>
                  <input type="text" placeholder="Dr. Sarah Johnson" required />
                </label>
                <label>
                  <span>Work Email</span>
                  <input type="email" placeholder="sarah@cliniccare.com" required />
                </label>
              </div>
              <div className="form-row">
                <label>
                  <span>Phone Number</span>
                  <input type="tel" placeholder="+91 98765 43210" required />
                </label>
                <label>
                  <span>Clinic / Facility Name</span>
                  <input type="text" placeholder="Metro Dental & Polyclinic" required />
                </label>
              </div>
              <label className="form-full">
                <span>Message or Practice Requirements</span>
                <textarea rows={3} placeholder="Tell us about your clinic setup, staff size, and key workflow priorities..." />
              </label>
              <button type="submit" className="form-submit-btn">
                Request Platform Demo <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-site">
        <div className="wrap footer-content">
          <div className="footer-brand-info">
            <Brand light />
            <p className="footer-bio">
              DocMatrix connects healthcare operations, patient longitudinal journeys, diagnostic queues,
              and omnichannel communication into one seamless clinic platform.
            </p>
          </div>

          <div className="footer-nav-columns">
            <div className="footer-col">
              <h4>Platform</h4>
              <a href="/not-built-yet?button=About%20Us" onClick={(e) => { e.preventDefault(); navigate('/not-built-yet?button=About%20Us') }}>About Us</a>
              <a href="#solutions" onClick={smoothScroll('solutions')}>Solutions</a>
              <a href="/login" onClick={navigateToAuth('login')}>Login</a>
              <a href="/signup" onClick={navigateToAuth('signup')}>Sign Up</a>
            </div>

            <div className="footer-col">
              <h4>Solutions</h4>
              <a href="/patients" onClick={openModulePage('records')}>Patient Records & Dental Care</a>
              <a href="/appointments" onClick={openModulePage('appointments')}>Appointments & Operations</a>
              <a href="/clinical" onClick={openModulePage('clinical')}>Clinical Workflows & Rx</a>
              <a href="/billing" onClick={openModulePage('billing')}>Billing, Accounts & Tally</a>
              <a href="/inventory" onClick={openModulePage('inventory')}>Inventory & Dental Lab</a>
              <a href="/whatsapp" onClick={openModulePage('engagement')}>WhatsApp & Engagement</a>
            </div>

            <div className="footer-col">
              <h4>Contact</h4>
              <a href="mailto:info@docmatrix.co.in">info@docmatrix.co.in</a>
              <a href="https://www.docmatrix.co.in" target="_blank" rel="noreferrer">www.docmatrix.co.in</a>
              <span>Bengaluru, Karnataka, India</span>
            </div>
          </div>
        </div>

        <div className="wrap footer-bottom-bar">
          <p>© {new Date().getFullYear()} DocMatrix Technologies. All rights reserved. Healthcare in Sync.</p>
          <div className="footer-legal">
            <a href="/privacy" onClick={(e) => { e.preventDefault(); navigate('/privacy'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Privacy Policy</a>
            <a href="/terms" onClick={(e) => { e.preventDefault(); navigate('/terms'); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Terms of Service</a>
            <a href="/not-built-yet?button=Security%20%26%20Compliance" onClick={(e) => { e.preventDefault(); navigate('/not-built-yet?button=Security%20%26%20Compliance') }}>Security & HIPAA/ABDM Compliance</a>
          </div>
        </div>
      </footer>
    </main>
          )
        }}
      />
      <WhatsAppShortcut />
    </div>
  )
}

