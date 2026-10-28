import React from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, ClipboardList, Inbox, Plus } from 'lucide-react'

type AppointmentTab = {
  id: string
  label: string
  path: string
  icon: React.ComponentType<{ size?: number }>
}

const tabs: AppointmentTab[] = [
  { id: 'appt.new', label: 'Book appointment', path: '/appointments/new', icon: Plus },
  { id: 'appt.details-list', label: 'Appointment details', path: '/appointments/details', icon: CalendarDays },
  { id: 'appt.enquiries', label: 'Missed enquiries', path: '/appointments/missed-enquiries', icon: Inbox },
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
          <span className="appointments-workspace-icon"><ClipboardList size={19} /></span>
          <div>
            <span className="appointments-workspace-eyebrow">CLINIC OPERATIONS</span>
            <h1>Appointments</h1>
            <p>Manage the schedule, bookings, and online enquiries in one place.</p>
          </div>
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
