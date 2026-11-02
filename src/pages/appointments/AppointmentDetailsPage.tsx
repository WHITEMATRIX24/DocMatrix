import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Search, UserRound, Plus, Stethoscope, RotateCcw, X, Clock, AlertTriangle, Check } from 'lucide-react'
import { useClinicData, rescheduleAppointment, type AppointmentStatus, type AppointmentRecord } from '@/services/clinicStore'
import './calendar.css'

export const AppointmentDetailsPage: React.FC = () => {
  const { patients, appointments } = useClinicData()
  const [query, setQuery] = useState('')
  const [date, setDate] = useState('')
  const [doctor, setDoctor] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [rescheduleAppt, setRescheduleAppt] = useState<AppointmentRecord | null>(null)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleTime, setRescheduleTime] = useState('11:00')
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [rescheduleError, setRescheduleError] = useState('')
  const [rescheduleSuccess, setRescheduleSuccess] = useState('')

  const handleOpenReschedule = (appt: AppointmentRecord) => {
    setRescheduleAppt(appt)
    setRescheduleDate(appt.date)
    setRescheduleTime(appt.time)
    setRescheduleReason('')
    setRescheduleError('')
    setRescheduleSuccess('')
  }

  const handleConfirmReschedule = (e: React.FormEvent) => {
    e.preventDefault()
    if (!rescheduleAppt) return
    setRescheduleError('')

    const result = rescheduleAppointment(
      rescheduleAppt.id,
      rescheduleDate,
      rescheduleTime,
      rescheduleReason || 'Patient requested new time slot.'
    )

    if (!result.success) {
      setRescheduleError(result.error || 'Conflict detected. Please choose another time slot.')
      return
    }

    setRescheduleSuccess(`Appointment ${rescheduleAppt.id} successfully rescheduled!`)
    setTimeout(() => {
      setRescheduleAppt(null)
      setRescheduleSuccess('')
    }, 1200)
  }

  const doctors = Array.from(new Set(appointments.map((appointment) => appointment.doctor))).sort()

  const rows = useMemo(() => {
    return appointments
      .filter((appointment) => !date || appointment.date === date)
      .filter((appointment) => !doctor || appointment.doctor === doctor)
      .filter((appointment) => statusFilter === 'all' || appointment.status === statusFilter)
      .filter((appointment) => {
        const patient = patients.find((entry) => entry.id === appointment.patientId)
        const text = `${patient?.firstName || ''} ${patient?.lastName || ''} ${patient?.id || ''} ${appointment.visitType} ${appointment.treatmentType || ''} ${appointment.doctor} ${appointment.id}`
        return text.toLowerCase().includes(query.toLowerCase())
      })
      .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))
  }, [appointments, patients, date, doctor, statusFilter, query])

  const getStatusBadge = (status: AppointmentStatus) => {
    switch (status) {
      case 'in-progress':
        return <span className="status-badge badge-inprogress">In Consultation</span>
      case 'checked-in':
        return <span className="status-badge badge-checkedin">Checked-In</span>
      case 'confirmed':
        return <span className="status-badge badge-confirmed">Confirmed</span>
      case 'completed':
        return <span className="status-badge badge-completed">Completed</span>
      case 'cancelled':
        return <span className="status-badge badge-cancelled">Cancelled</span>
      case 'no-show':
        return <span className="status-badge badge-noshow">No-Show</span>
      default:
        return <span className="status-badge badge-scheduled">Scheduled</span>
    }
  }

  return (
    <section className="clinic-record-page" data-testid="feature-page-appt.details-list">
      <header className="clinic-record-header">
        <div>
          <span className="clinic-record-eyebrow">APPOINTMENTS</span>
          <h1>All Appointments</h1>
          <p>Bookings connected to patient records in this session.</p>
        </div>
        <Link to="/appointments/new" className="patient-intake-primary">
          <Plus size={15} /> Book appointment
        </Link>
      </header>

      <div className="appointment-details-filters">
        <label className="clinic-record-search">
          <Search size={15} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search patient, doctor, procedure, or booking ID..."
          />
        </label>
        <label className="appointment-details-filter">
          <span>Date</span>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label className="appointment-details-filter">
          <span>Doctor</span>
          <select value={doctor} onChange={(event) => setDoctor(event.target.value)}>
            <option value="">All doctors</option>
            {doctors.map((entry) => (
              <option key={entry} value={entry}>{entry}</option>
            ))}
          </select>
        </label>
        <label className="appointment-details-filter">
          <span>Status</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="checked-in">Checked-in</option>
            <option value="in-progress">In Consultation</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
      </div>

      {rows.length ? (
        <div className="clinic-record-table-wrap">
          <table className="clinic-record-table appointment-details-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Date & Time</th>
                <th>Doctor</th>
                <th>Procedure</th>
                <th>Status</th>
                <th>Booking ID</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((appointment) => {
                const patient = patients.find((entry) => entry.id === appointment.patientId)
                return (
                  <tr key={appointment.id}>
                    <td>
                      {patient ? (
                        <Link className="clinic-record-patient" to={`/patients/${patient.id}`}>
                          <span><UserRound size={14} /></span>
                          <strong>{patient.firstName} {patient.lastName}</strong>
                          <small style={{ color: 'var(--text-muted, #64748b)', marginLeft: '6px' }}>({patient.id})</small>
                        </Link>
                      ) : (
                        'Walk-in Guest'
                      )}
                    </td>
                    <td>
                      {appointment.date}
                      <small className="appointment-details-time">{appointment.time}</small>
                    </td>
                    <td>{appointment.doctor}</td>
                    <td>{appointment.treatmentType || appointment.visitType}</td>
                    <td>{getStatusBadge(appointment.status)}</td>
                    <td>{appointment.id}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                        {appointment.status !== 'cancelled' && appointment.status !== 'completed' && (
                          <button
                            type="button"
                            onClick={() => handleOpenReschedule(appointment)}
                            style={{
                              padding: '4px 9px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              borderRadius: '5px',
                              border: '1px solid var(--line, #cbd5e1)',
                              background: 'var(--surface, #ffffff)',
                              color: 'var(--teal-primary, #0b8185)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              transition: 'all 0.15s ease'
                            }}
                            title="Reschedule appointment"
                          >
                            <RotateCcw size={12} />
                            <span>Reschedule</span>
                          </button>
                        )}
                        <Link className="clinic-record-open" to={`/appointments/${appointment.id}`}>
                          View details
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="clinic-record-empty">
          <span><CalendarDays size={22} /></span>
          <h2>{appointments.length ? 'No appointments match these filters' : 'No appointment details yet'}</h2>
          <p>
            {appointments.length
              ? 'Change the search or filters to view other bookings.'
              : 'Book an appointment for a registered patient to see its details here.'}
          </p>
          {!appointments.length && (
            <Link to="/appointments/new" className="patient-intake-primary">
              Book appointment
            </Link>
          )}
        </div>
      )}

      {/* Reschedule Modal */}
      {rescheduleAppt && (
        <div className="modal-overlay" onClick={() => setRescheduleAppt(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RotateCcw size={18} style={{ color: 'var(--teal-primary, #0b8185)' }} />
                <h3 style={{ margin: 0, fontSize: '15px' }}>Reschedule Appointment</h3>
              </div>
              <button type="button" className="btn-modal-close" onClick={() => setRescheduleAppt(null)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleConfirmReschedule}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ padding: '8px 12px', background: 'var(--surface-alt, #f8fafc)', borderRadius: '6px', fontSize: '13px' }}>
                  <div>Booking ID: <strong>{rescheduleAppt.id}</strong></div>
                  <div>Doctor: <strong>{rescheduleAppt.doctor}</strong> ({rescheduleAppt.chair})</div>
                  <div>Current: <span>{rescheduleAppt.date} at {rescheduleAppt.time}</span></div>
                </div>

                <label className="form-field">
                  <span>New Date *</span>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().slice(0, 10)}
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                  />
                </label>

                <label className="form-field">
                  <span>New Time Slot *</span>
                  <select
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                  >
                    {[
                      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
                      '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
                      '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
                    ].map((slot) => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </label>

                <label className="form-field">
                  <span>Reason for Reschedule *</span>
                  <textarea
                    rows={2}
                    required
                    placeholder="E.g., Patient requested later time, doctor shift change..."
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                  />
                </label>

                {rescheduleError && (
                  <div className="availability-warning-box">
                    <AlertTriangle size={16} />
                    <span style={{ fontSize: '12px' }}>{rescheduleError}</span>
                  </div>
                )}

                {rescheduleSuccess && (
                  <div className="availability-success-box">
                    <Check size={16} />
                    <span style={{ fontSize: '12px' }}>{rescheduleSuccess}</span>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setRescheduleAppt(null)}>
                  Cancel
                </button>
                <button type="submit" className="patient-intake-primary" disabled={Boolean(rescheduleSuccess)}>
                  Confirm Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

export default AppointmentDetailsPage
