import {
  Calendar, CheckCircle2, Receipt, CreditCard, ArrowUpRight, ArrowRight, Plus, UserPlus,
  ChevronRight, Armchair, Clock, CircleAlert, PackageOpen, FlaskConical, Target
} from 'lucide-react'

const KPIS = [
  { label: "Today's appointments", value: '18', delta: '+3', deltaNote: 'vs last Wednesday', trend: [9, 12, 10, 14, 13, 16, 18], icon: Calendar, route: '/appointments/new' },
  { label: 'Completed visits', value: '12', delta: '67%', deltaNote: 'of today’s book', trend: [2, 4, 5, 7, 9, 11, 12], icon: CheckCircle2, route: '/appointments/new' },
  { label: 'Collections today', value: '₹34,500', delta: '+8.2%', deltaNote: 'vs 7-day average', trend: [21, 26, 24, 29, 27, 31, 34.5], icon: Receipt, route: '/billing/collection' },
  { label: 'Pending patient dues', value: '₹12,800', delta: '4 accounts', deltaNote: 'need follow-up', tone: 'warn', trend: [16, 15, 15.5, 14, 13.6, 13, 12.8], icon: CreditCard, route: '/billing/dues' }
]

// Booked vs completed per hour; index 5 (2 PM) is the current slot in the demo day
const HOURS = ['9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM']
const BOOKED = [2, 3, 2, 3, 1, 3, 2, 1, 1]
const COMPLETED = [2, 3, 2, 3, 1, 1, 0, 0, 0]
const NOW_INDEX = 5
const CHART_MAX = 4

const CHAIR_TONES = { occupied: 'teal', waiting: 'amber', sanitizing: 'violet', ready: 'green' }

const UP_NEXT_TIMES = ['4:30 PM', '4:50 PM', '5:15 PM', '5:40 PM']

const REMINDERS = [
  { tone: 'red', icon: CircleAlert, title: 'Check patient allergy', note: 'Meera Nambiar · penicillin, before prescribing', route: '/patients/pt-1001' },
  { tone: 'amber', icon: PackageOpen, title: 'Restock latex gloves', note: '2 boxes left in inventory', route: '/inventory/alerts' },
  { tone: 'green', icon: FlaskConical, title: 'Lab case ready', note: 'Fatima Zahra · crown cementation', route: '/lab' }
]

function greetingFor(date) {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// "Dr. Rajesh Nair (Doctor)" -> "Dr. Rajesh", "Priya Menon (Branch Mgr)" -> "Priya"
function shortName(name = '') {
  const parts = name.replace(/\s*\(.*\)\s*/, '').trim().split(/\s+/)
  if (/^dr\.?$/i.test(parts[0]) && parts[1]) return `Dr. ${parts[1]}`
  return parts[0] || 'there'
}

function initials(name) {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('')
}

function Sparkline({ values }) {
  const w = 96
  const h = 32
  const min = Math.min(...values)
  const max = Math.max(...values)
  const points = values.map((v, i) => [
    (i / (values.length - 1)) * w,
    h - 3 - ((v - min) / (max - min || 1)) * (h - 6)
  ])
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const [lastX, lastY] = points[points.length - 1]
  return (
    <svg className="dmx-sparkline" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <path className="dmx-sparkline-area" d={`${line} L${w},${h} L0,${h} Z`} />
      <path className="dmx-sparkline-line" d={line} />
      <circle className="dmx-sparkline-dot" cx={lastX} cy={lastY} r="2.6" />
    </svg>
  )
}

function ProgressRing({ value }) {
  const r = 38
  const c = 2 * Math.PI * r
  return (
    <svg className="dmx-ring" viewBox="0 0 96 96" aria-hidden="true">
      <circle className="dmx-ring-track" cx="48" cy="48" r={r} />
      <circle className="dmx-ring-value" cx="48" cy="48" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} />
    </svg>
  )
}

export default function ClinicDashboard({ currentUser, navigateTo, chairs = [], patients = [] }) {
  const now = new Date()
  const dateLabel = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })
  const activeChairs = chairs.filter((c) => c.type === 'occupied' || c.type === 'waiting').length

  return (
    <section className="dmx-dashboard">
      <header className="dmx-hero">
        <div className="dmx-hero-copy">
          <div className="dmx-eyebrow">
            <span className="dmx-live-dot" />
            <span>Clinic Operations Dashboard</span>
            <span className="dmx-eyebrow-sep" />
            <span>{dateLabel}</span>
          </div>
          <h1>
            {greetingFor(now)}, <em>{shortName(currentUser.name)}</em>
          </h1>
          <p>
            {currentUser.clinicName || 'Your clinic'} has <strong>18 patients</strong> booked today,{' '}
            <strong>{activeChairs} of {chairs.length || 4} chairs</strong> in use and <strong>₹7,500</strong> left to today’s collection target.
          </p>
        </div>
        <div className="dmx-hero-actions">
          <button className="dmx-btn dmx-btn-ghost" onClick={() => navigateTo('/patients/new')}>
            <UserPlus size={15} /> Add patient
          </button>
          <button className="dmx-btn dmx-btn-primary" onClick={() => navigateTo('/appointments/new')}>
            <Plus size={15} /> Book appointment
          </button>
        </div>
      </header>

      <div className="dmx-kpi-grid">
        {KPIS.map((kpi, i) => {
          const Icon = kpi.icon
          return (
            <button
              key={kpi.label}
              className={`dmx-kpi ${kpi.tone === 'warn' ? 'is-warn' : ''}`}
              style={{ '--i': i }}
              onClick={() => navigateTo(kpi.route)}
            >
              <div className="dmx-kpi-top">
                <span className="dmx-kpi-icon"><Icon size={16} /></span>
                <span className="dmx-kpi-label">{kpi.label}</span>
                <ArrowUpRight size={15} className="dmx-kpi-arrow" />
              </div>
              <div className="dmx-kpi-body">
                <strong>{kpi.value}</strong>
                <Sparkline values={kpi.trend} />
              </div>
              <div className="dmx-kpi-foot">
                <span className="dmx-delta">{kpi.delta}</span>
                <span>{kpi.deltaNote}</span>
              </div>
            </button>
          )
        })}
      </div>

      <div className="dmx-grid-main">
        <section className="dmx-card dmx-activity">
          <div className="dmx-card-head">
            <div>
              <h2>Appointment activity</h2>
              <p>Booked and completed visits by hour</p>
            </div>
            <button className="dmx-link" onClick={() => navigateTo('/appointments/new')}>
              View schedule <ArrowRight size={14} />
            </button>
          </div>

          <div className="dmx-chart" role="img" aria-label="18 appointments booked today, 12 completed">
            <div className="dmx-chart-grid" aria-hidden="true">
              {[4, 3, 2, 1, 0].map((n) => <span key={n} data-label={n} />)}
            </div>
            <div className="dmx-chart-bars">
              {HOURS.map((hour, i) => (
                <div key={hour} className={`dmx-bar ${i === NOW_INDEX ? 'is-now' : ''} ${i > NOW_INDEX ? 'is-future' : ''}`}>
                  <div className="dmx-bar-track" style={{ height: `${(BOOKED[i] / CHART_MAX) * 100}%` }}>
                    <span className="dmx-bar-fill" style={{ height: `${(COMPLETED[i] / BOOKED[i]) * 100}%` }} />
                    <span className="dmx-bar-tip">
                      <strong>{hour}</strong>
                      {BOOKED[i]} booked · {COMPLETED[i]} done
                    </span>
                  </div>
                  <small>{i === NOW_INDEX ? 'Now' : hour}</small>
                </div>
              ))}
            </div>
          </div>

          <div className="dmx-chart-legend">
            <span><i className="is-done" /> Completed</span>
            <span><i className="is-booked" /> Booked</span>
            <span className="dmx-chart-total">12 of 18 seen</span>
          </div>
        </section>

        <section className="dmx-card dmx-chairs">
          <div className="dmx-card-head">
            <div>
              <h2>Chairs right now</h2>
              <p>Live operatory status</p>
            </div>
            <span className="dmx-pill dmx-pill-live"><span className="dmx-live-dot" /> Live</span>
          </div>
          <ul className="dmx-chair-list">
            {chairs.map((chair, i) => {
              const [room, specialty] = chair.operatory.split(' • ')
              return (
                <li key={chair.id} className={`dmx-chair tone-${CHAIR_TONES[chair.type] || 'teal'}`}>
                  <span className="dmx-chair-icon"><Armchair size={16} /></span>
                  <div className="dmx-chair-body">
                    <div className="dmx-chair-row">
                      <strong>{chair.patient}</strong>
                      <span className="dmx-chair-status">{chair.status}</span>
                    </div>
                    <small>{chair.proc}</small>
                    <small className="dmx-chair-meta">
                      {room} · {specialty || `Chair ${i + 1}`} · {chair.elapsed}
                    </small>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      <div className="dmx-grid-lower">
        <section className="dmx-card dmx-upnext">
          <div className="dmx-card-head">
            <div>
              <h2>Up next</h2>
              <p>Remaining patients this afternoon</p>
            </div>
            <button className="dmx-link" onClick={() => navigateTo('/patients/list')}>
              All patients <ArrowRight size={14} />
            </button>
          </div>
          <ul className="dmx-queue">
            {patients.slice(0, 4).map((p, i) => (
              <li key={p.id}>
                <button className="dmx-queue-row" onClick={() => navigateTo('/patients/list')}>
                  <span className="dmx-queue-time"><Clock size={12} /> {UP_NEXT_TIMES[i]}</span>
                  <span className="dmx-avatar">{initials(p.name)}</span>
                  <span className="dmx-queue-main">
                    <strong>{p.name}</strong>
                    <small>{p.treatment}</small>
                  </span>
                  {p.alerts !== 'None' && <span className="dmx-pill dmx-pill-alert">{p.alerts}</span>}
                  <ChevronRight size={16} className="dmx-row-chevron" />
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="dmx-card dmx-reminders">
          <div className="dmx-card-head">
            <div>
              <h2>Clinic reminders</h2>
              <p>Items that need attention</p>
            </div>
            <span className="dmx-count">{REMINDERS.length}</span>
          </div>
          <ul className="dmx-reminder-list">
            {REMINDERS.map((r) => {
              const Icon = r.icon
              return (
                <li key={r.title}>
                  <button className={`dmx-reminder tone-${r.tone}`} onClick={() => navigateTo(r.route)}>
                    <span className="dmx-reminder-icon"><Icon size={15} /></span>
                    <span className="dmx-reminder-text">
                      <strong>{r.title}</strong>
                      <small>{r.note}</small>
                    </span>
                    <ChevronRight size={16} className="dmx-row-chevron" />
                  </button>
                </li>
              )
            })}
          </ul>
          <button className="dmx-link" onClick={() => navigateTo('/notifications')}>
            See all reminders <ArrowRight size={14} />
          </button>
        </section>

        <section className="dmx-card dmx-targets">
          <div className="dmx-card-head">
            <div>
              <h2>Today’s targets</h2>
              <p>Progress against clinic goals</p>
            </div>
            <Target size={17} className="dmx-card-head-icon" />
          </div>
          <div className="dmx-target-ring">
            <ProgressRing value={82} />
            <div className="dmx-target-ring-label">
              <strong>82%</strong>
              <small>collected</small>
            </div>
          </div>
          <div className="dmx-target-rows">
            <div className="dmx-target-row">
              <div><span>Daily collections</span><strong>₹34,500 <em>/ ₹42,000</em></strong></div>
              <div className="dmx-meter"><span style={{ width: '82%' }} /></div>
            </div>
            <div className="dmx-target-row">
              <div><span>Appointments seen</span><strong>12 <em>/ 18</em></strong></div>
              <div className="dmx-meter"><span style={{ width: '67%' }} /></div>
            </div>
          </div>
        </section>
      </div>
    </section>
  )
}
