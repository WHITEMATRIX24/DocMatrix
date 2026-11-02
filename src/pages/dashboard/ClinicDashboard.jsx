import React, { useMemo } from 'react'
import {
  Calendar, CheckCircle2, Receipt, CreditCard, ArrowUpRight, ArrowRight, Plus, UserPlus,
  ChevronRight, Armchair, Clock, CircleAlert, PackageOpen, FlaskConical, Target
} from 'lucide-react'
import { useClinicData } from '@/services/clinicStore'

const HOURS = ['9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM']
const NOW_INDEX = 5

const CHAIR_TONES = { occupied: 'teal', waiting: 'amber', sanitizing: 'violet', ready: 'green' }

function greetingFor(date) {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function shortName(name = '') {
  const parts = name.replace(/\s*\(.*\)\s*/, '').trim().split(/\s+/)
  if (/^dr\.?$/i.test(parts[0]) && parts[1]) return `Dr. ${parts[1]}`
  return parts[0] || 'there'
}

function initials(name) {
  if (!name) return 'PT'
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

function Sparkline({ values = [] }) {
  const w = 96
  const h = 32
  const min = Math.min(...values, 0)
  const max = Math.max(...values, 1)
  const safeVals = values.length >= 2 ? values : [0, values[0] || 0]
  const points = safeVals.map((v, i) => [
    (i / (safeVals.length - 1)) * w,
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

function ProgressRing({ value = 0 }) {
  const r = 38
  const c = 2 * Math.PI * r
  const safeVal = Math.min(Math.max(value, 0), 100)
  return (
    <svg className="dmx-ring" viewBox="0 0 96 96" aria-hidden="true">
      <circle className="dmx-ring-track" cx="48" cy="48" r={r} />
      <circle className="dmx-ring-value" cx="48" cy="48" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - safeVal / 100)} />
    </svg>
  )
}

export default function ClinicDashboard({ currentUser, navigateTo }) {
  const { patients = [], appointments = [], invoices = [] } = useClinicData()
  const now = new Date()
  const dateLabel = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  const todayStr = useMemo(() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 10)
  }, [])

  // Real Appointments Scheduled for Today
  const todayAppts = useMemo(() => {
    return appointments.filter((a) => a.date === todayStr && a.status !== 'cancelled')
  }, [appointments, todayStr])

  const completedToday = useMemo(() => {
    return todayAppts.filter((a) => a.status === 'completed')
  }, [todayAppts])

  const waitingPatients = useMemo(() => {
    return todayAppts.filter((a) => a.status === 'checked-in')
  }, [todayAppts])

  const inConsultation = useMemo(() => {
    return todayAppts.filter((a) => a.status === 'in-progress')
  }, [todayAppts])

  const upNextAppointments = useMemo(() => {
    return todayAppts.filter((a) => a.status === 'scheduled' || a.status === 'confirmed' || a.status === 'checked-in').slice(0, 4)
  }, [todayAppts])

  // Real Dynamic KPI Metrics
  const kpis = useMemo(() => {
    const totalToday = todayAppts.length
    const compCount = completedToday.length
    const compPct = totalToday > 0 ? Math.round((compCount / totalToday) * 100) : 0
    const totalDues = invoices.filter((i) => i.status === 'Unpaid').reduce((sum, i) => sum + (i.amount || 0), 0)

    return [
      {
        label: "Today's appointments",
        value: String(totalToday),
        delta: totalToday > 0 ? `${totalToday} visits` : '0 booked',
        deltaNote: 'scheduled for today',
        trend: [0, Math.floor(totalToday / 2), totalToday],
        icon: Calendar,
        route: '/appointments/calendar'
      },
      {
        label: 'Completed visits',
        value: String(compCount),
        delta: `${compPct}%`,
        deltaNote: 'of today’s book seen',
        trend: [0, Math.floor(compCount / 2), compCount],
        icon: CheckCircle2,
        route: '/appointments/details'
      },
      {
        label: 'Active clinic patients',
        value: String(patients.length),
        delta: `${patients.length} total`,
        deltaNote: 'registered patient files',
        trend: [0, Math.floor(patients.length / 2), patients.length],
        icon: Receipt,
        route: '/patients/list'
      },
      {
        label: 'Waiting in queue',
        value: String(waitingPatients.length),
        delta: `${waitingPatients.length} waiting`,
        deltaNote: 'reception check-in',
        tone: waitingPatients.length > 0 ? 'warn' : undefined,
        trend: [0, waitingPatients.length],
        icon: CreditCard,
        route: '/appointments/queue'
      }
    ]
  }, [todayAppts, completedToday, patients, waitingPatients, invoices])

  // Real 4 Operatory Chairs Monitor
  const operatoryChairs = useMemo(() => {
    const suites = [
      { id: 'chair-1', operatory: 'Operatory 1 • Endodontics Suite', name: 'Chair 1' },
      { id: 'chair-2', operatory: 'Operatory 2 • Orthodontics Suite', name: 'Chair 2' },
      { id: 'chair-3', operatory: 'Operatory 3 • Oral Surgery Suite', name: 'Chair 3' },
      { id: 'chair-4', operatory: 'Operatory 4 • Preventive Care Suite', name: 'Chair 4' }
    ]

    return suites.map((s, idx) => {
      // Find appointment currently in this chair
      const activeAppt = todayAppts.find((a) => {
        const chairMatch = a.chair === s.name || a.chair === `Chair ${idx + 1}`
        return chairMatch && (a.status === 'in-progress' || a.status === 'checked-in')
      })

      if (activeAppt) {
        const patientRec = patients.find((p) => p.id === activeAppt.patientId)
        const patientName = patientRec ? `${patientRec.firstName} ${patientRec.lastName}`.trim() : (activeAppt.patientId || 'Patient')
        const isInProgress = activeAppt.status === 'in-progress'

        return {
          id: s.id,
          operatory: s.operatory,
          doctor: activeAppt.doctor || 'Doctor',
          patient: patientName,
          proc: activeAppt.treatmentType || activeAppt.visitType || 'Clinical Consultation',
          status: isInProgress ? 'In Consultation' : 'Waiting in Queue',
          type: isInProgress ? 'occupied' : 'waiting',
          elapsed: activeAppt.time || 'Today'
        }
      }

      return {
        id: s.id,
        operatory: s.operatory,
        doctor: 'Unassigned',
        patient: 'Operatory Ready',
        proc: 'Available for scheduling',
        status: 'Ready',
        type: 'ready',
        elapsed: 'Vacant'
      }
    })
  }, [todayAppts, patients])

  const activeChairCount = operatoryChairs.filter((c) => c.type === 'occupied' || c.type === 'waiting').length

  // Real Hourly Activity Distribution
  const { bookedPerHour, completedPerHour, chartMax } = useMemo(() => {
    const booked = [0, 0, 0, 0, 0, 0, 0, 0, 0]
    const completed = [0, 0, 0, 0, 0, 0, 0, 0, 0]

    for (const a of todayAppts) {
      if (!a.time) continue
      const hour = parseInt(a.time.split(':')[0], 10)
      // 9 AM is index 0, 10 AM is 1 ... 5 PM (17) is 8
      const idx = hour - 9
      if (idx >= 0 && idx < 9) {
        booked[idx]++
        if (a.status === 'completed') {
          completed[idx]++
        }
      }
    }

    const maxCount = Math.max(...booked, 4)
    return { bookedPerHour: booked, completedPerHour: completed, chartMax: maxCount }
  }, [todayAppts])

  // Real Patient Reminders based on real medical alerts
  const alertReminders = useMemo(() => {
    const list = []
    const alertPatients = patients.filter((p) => p.allergies === 'yes' || p.conditions === 'yes')

    for (const p of alertPatients.slice(0, 3)) {
      list.push({
        tone: 'red',
        icon: CircleAlert,
        title: `Medical Alert: ${p.firstName} ${p.lastName}`,
        note: p.allergiesDetails || p.conditionsDetails || 'Allergies noted in chart',
        route: `/patients/${p.id}`
      })
    }
    return list
  }, [patients])

  const completionPct = todayAppts.length > 0 ? Math.round((completedToday.length / todayAppts.length) * 100) : 0

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
            {greetingFor(now)}, <em>{shortName(currentUser.name || currentUser.fullName)}</em>
          </h1>
          <p>
            {currentUser.clinicName || 'Your clinic'} has <strong>{todayAppts.length} patient{todayAppts.length === 1 ? '' : 's'}</strong> booked today,{' '}
            <strong>{activeChairCount} of 4 chairs</strong> in use.
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
        {kpis.map((kpi, i) => {
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
            <button className="dmx-link" onClick={() => navigateTo('/appointments/calendar')}>
              View schedule <ArrowRight size={14} />
            </button>
          </div>

          <div className="dmx-chart" role="img" aria-label={`${todayAppts.length} appointments booked today, ${completedToday.length} completed`}>
            <div className="dmx-chart-grid" aria-hidden="true">
              {[4, 3, 2, 1, 0].map((n) => <span key={n} data-label={n} />)}
            </div>
            <div className="dmx-chart-bars">
              {HOURS.map((hour, i) => {
                const bCount = bookedPerHour[i] || 0
                const cCount = completedPerHour[i] || 0
                const bHeight = chartMax > 0 ? (bCount / chartMax) * 100 : 0
                const cHeight = bCount > 0 ? (cCount / bCount) * 100 : 0

                return (
                  <div key={hour} className={`dmx-bar ${i === NOW_INDEX ? 'is-now' : ''} ${i > NOW_INDEX ? 'is-future' : ''}`}>
                    <div className="dmx-bar-track" style={{ height: `${bHeight}%` }}>
                      <span className="dmx-bar-fill" style={{ height: `${cHeight}%` }} />
                      <span className="dmx-bar-tip">
                        <strong>{hour}</strong>
                        {bCount} booked · {cCount} done
                      </span>
                    </div>
                    <small>{i === NOW_INDEX ? 'Now' : hour}</small>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="dmx-chart-legend">
            <span><i className="is-done" /> Completed</span>
            <span><i className="is-booked" /> Booked</span>
            <span className="dmx-chart-total">{completedToday.length} of {todayAppts.length} seen</span>
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
            {operatoryChairs.map((chair, i) => {
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
              <p>Remaining patients scheduled for today</p>
            </div>
            <button className="dmx-link" onClick={() => navigateTo('/patients/list')}>
              All patients <ArrowRight size={14} />
            </button>
          </div>
          {upNextAppointments.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', color: '#64748b' }}>
              <Clock size={28} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
              <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>No upcoming appointments today</p>
              <button className="dmx-link" style={{ marginTop: '8px' }} onClick={() => navigateTo('/appointments/new')}>
                Book first appointment <ArrowRight size={13} />
              </button>
            </div>
          ) : (
            <ul className="dmx-queue">
              {upNextAppointments.map((appt) => {
                const patientRec = patients.find((p) => p.id === appt.patientId)
                const patientName = patientRec ? `${patientRec.firstName} ${patientRec.lastName}`.trim() : (appt.patientId || 'Patient')
                const hasAlert = patientRec && (patientRec.allergies === 'yes' || patientRec.conditions === 'yes')

                return (
                  <li key={appt.id}>
                    <button className="dmx-queue-row" onClick={() => navigateTo('/appointments/details')}>
                      <span className="dmx-queue-time"><Clock size={12} /> {appt.time}</span>
                      <span className="dmx-avatar">{initials(patientName)}</span>
                      <span className="dmx-queue-main">
                        <strong>{patientName}</strong>
                        <small>{appt.treatmentType || appt.visitType}</small>
                      </span>
                      {hasAlert && <span className="dmx-pill dmx-pill-alert">Alert</span>}
                      <ChevronRight size={16} className="dmx-row-chevron" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="dmx-card dmx-reminders">
          <div className="dmx-card-head">
            <div>
              <h2>Clinic reminders</h2>
              <p>Items that need attention</p>
            </div>
            <span className="dmx-count">{alertReminders.length}</span>
          </div>
          {alertReminders.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b' }}>
              <CheckCircle2 size={24} style={{ margin: '0 auto 8px', color: '#10b981' }} />
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#065f46' }}>All caught up</p>
              <small style={{ color: '#64748b' }}>No active medical alerts requiring immediate attention.</small>
            </div>
          ) : (
            <ul className="dmx-reminder-list">
              {alertReminders.map((r) => {
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
          )}
        </section>

        <section className="dmx-card dmx-targets">
          <div className="dmx-card-head">
            <div>
              <h2>Today’s targets</h2>
              <p>Progress against scheduled volume</p>
            </div>
            <Target size={17} className="dmx-card-head-icon" />
          </div>
          <div className="dmx-target-ring">
            <ProgressRing value={completionPct} />
            <div className="dmx-target-ring-label">
              <strong>{completionPct}%</strong>
              <small>completed</small>
            </div>
          </div>
          <div className="dmx-target-rows">
            <div className="dmx-target-row">
              <div><span>Appointments seen</span><strong>{completedToday.length} <em>/ {todayAppts.length}</em></strong></div>
              <div className="dmx-meter"><span style={{ width: `${completionPct}%` }} /></div>
            </div>
            <div className="dmx-target-row">
              <div><span>Active Patients</span><strong>{patients.length} registered</strong></div>
              <div className="dmx-meter"><span style={{ width: `${patients.length > 0 ? 100 : 0}%` }} /></div>
            </div>
          </div>
        </section>
      </div>
    </section>
  )
}
