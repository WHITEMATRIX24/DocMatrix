import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, ClipboardList, Inbox, Plus, Activity, UserPlus, CheckCircle2, Clock } from 'lucide-react'
import { useClinicData } from '@/services/clinicStore'
import './calendar.css'

type AppointmentTab = {
  id: string
  label: string
  path: string
  icon: React.ComponentType<{ size?: number }>
}

const tabs: AppointmentTab[] = [
  { id: 'appt.queue', label: 'Live Queue', path: '/appointments/queue', icon: Activity },
  { id: 'appt.new', label: 'Book Appointment', path: '/appointments/new', icon: Plus },
  { id: 'appt.calendar', label: 'Calendar', path: '/appointments/calendar', icon: CalendarDays },
  { id: 'appt.details-list', label: 'All Appointments', path: '/appointments/details', icon: ClipboardList },
  { id: 'appt.enquiries', label: 'Missed Enquiries', path: '/appointments/missed-enquiries', icon: Inbox },
]

interface AppointmentsWorkspaceProps {
  activeFeatureId: string
  children: React.ReactNode
}

export default function AppointmentsWorkspace({ activeFeatureId, children }: AppointmentsWorkspaceProps) {
  const navigate = useNavigate()
  const { appointments } = useClinicData()
  const selectedTabId = activeFeatureId === 'appt.detail' ? 'appt.details-list' : activeFeatureId

  // Live Today Metrics
  const todayStr = useMemo(() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 10)
  }, [])

  const todayAppts = useMemo(() => {
    return appointments.filter((a) => a.date === todayStr && a.status !== 'cancelled')
  }, [appointments, todayStr])

  const waitingCount = todayAppts.filter((a) => a.status === 'checked-in').length
  const inConsultCount = todayAppts.filter((a) => a.status === 'in-progress').length
  const completedCount = todayAppts.filter((a) => a.status === 'completed').length
  const walkInCount = todayAppts.filter((a) => a.isWalkIn).length

  return (
    <section className="appointments-workspace">
      <header className="appointments-workspace-header">
        <div className="appointments-workspace-title">
          <span className="appointments-workspace-icon"><CalendarDays size={20} /></span>
          <div>
            <span className="appointments-workspace-eyebrow">CLINIC OPERATIONS</span>
            <h1>Appointments & Queue Hub</h1>
            <p>Real-time booking, doctor schedules, walk-in management, and clinical integrations.</p>
          </div>
        </div>
        <div className="appointments-workspace-actions" style={{ display: 'flex', gap: '10px' }}>
          <button
            className="patient-intake-secondary"
            onClick={() => navigate('/patients/new')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            title="Register a new patient"
          >
            <UserPlus size={15} />
            <span>Register Now</span>
          </button>
          <button
            className="patient-intake-secondary"
            onClick={() => navigate('/appointments/queue')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <UserPlus size={15} />
            <span>Walk-in Queue</span>
          </button>
          <button
            className="patient-intake-primary"
            onClick={() => navigate('/appointments/new')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={15} />
            <span>Book Appointment</span>
          </button>
        </div>
      </header>

      <nav className="appointments-workspace-tabs" aria-label="Appointment sections">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = selectedTabId === tab.id
          let badge: number | null = null
          let badgeColor = ''
          if (tab.id === 'appt.queue' && waitingCount > 0) {
            badge = waitingCount
            badgeColor = '#f59e0b'
          } else if (tab.id === 'appt.calendar' && todayAppts.length > 0) {
            badge = todayAppts.length
            badgeColor = '#0b8185'
          } else if (tab.id === 'appt.details-list' && appointments.length > 0) {
            badge = appointments.length
            badgeColor = '#64748b'
          }

          return (
            <button
              key={tab.id}
              className={`appointments-workspace-tab${active ? ' is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => navigate(tab.path)}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
              {badge !== null && (
                <span
                  style={{
                    marginLeft: '6px',
                    padding: '1px 6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    borderRadius: '10px',
                    background: active ? '#ffffff' : (badgeColor || '#0b8185'),
                    color: active ? '#0b8185' : '#ffffff',
                    lineHeight: '1.3'
                  }}
                >
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="appointments-workspace-content">{children}</div>
    </section>
  )
}
