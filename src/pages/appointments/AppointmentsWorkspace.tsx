import React from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, ClipboardList, Inbox, Plus, Activity, UserPlus } from 'lucide-react'

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
  const selectedTabId = activeFeatureId === 'appt.detail' ? 'appt.details-list' : activeFeatureId

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
          return (
            <button
              key={tab.id}
              className={`appointments-workspace-tab${active ? ' is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => navigate(tab.path)}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="appointments-workspace-content">{children}</div>
    </section>
  )
}
