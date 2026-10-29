import React, { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Calendar,
  CalendarDays,
  Clock,
  User,
  X,
  Play,
  CheckCircle2,
  AlertTriangle,
  FileText,
  CreditCard,
  UserRound,
  Plus,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  Activity,
  Send,
  CalendarClock,
  RotateCcw,
  Check
} from 'lucide-react'
import {
  useClinicData,
  DENTISTS,
  updateAppointmentStatus,
  rescheduleAppointment,
  cancelAppointment,
  sendAppointmentReminder,
  generateWhatsAppMessage,
  checkDentistAvailability,
  type AppointmentRecord,
  type AppointmentStatus
} from '@/services/clinicStore'

type CalendarViewMode = 'day' | 'week' | 'dentist'

export const CalendarPage: React.FC = () => {
  const navigate = useNavigate()
  const { appointments, patients } = useClinicData()

  // Selected date
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 10)
  })

  const [viewMode, setViewMode] = useState<CalendarViewMode>('dentist')
  const [filterDoctor, setFilterDoctor] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // Selected Appointment Modal
  const [activeAppt, setActiveAppt] = useState<AppointmentRecord | null>(null)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState(selectedDate)
  const [rescheduleTime, setRescheduleTime] = useState('11:00')
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [rescheduleError, setRescheduleError] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [whatsAppType, setWhatsAppType] = useState<'confirmation' | 'reminder_24h' | 'reminder_2h' | 'recall'>('confirmation')

  // Date manipulation helpers
  const handlePrevDay = () => {
    const d = new Date(`${selectedDate}T12:00:00`)
    d.setDate(d.getDate() - (viewMode === 'week' ? 7 : 1))
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    setSelectedDate(d.toISOString().slice(0, 10))
  }

  const handleNextDay = () => {
    const d = new Date(`${selectedDate}T12:00:00`)
    d.setDate(d.getDate() + (viewMode === 'week' ? 7 : 1))
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    setSelectedDate(d.toISOString().slice(0, 10))
  }

  const handleToday = () => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    setSelectedDate(d.toISOString().slice(0, 10))
  }

  // Week days for week view
  const weekDays = useMemo(() => {
    const curr = new Date(`${selectedDate}T12:00:00`)
    const firstDay = curr.getDate() - curr.getDay() + (curr.getDay() === 0 ? -6 : 1) // Monday start
    const days = []
    for (let i = 0; i < 7; i++) {
      const next = new Date(curr.setDate(firstDay + i))
      next.setMinutes(next.getMinutes() - next.getTimezoneOffset())
      days.push({
        dateStr: next.toISOString().slice(0, 10),
        dayName: next.toLocaleDateString(undefined, { weekday: 'short' }),
        dayNum: next.getDate()
      })
    }
    return days
  }, [selectedDate])

  // Hourly slots from 09:00 to 18:00
  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
  ]

  // Filtered appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      if (filterDoctor !== 'all' && appt.doctor !== filterDoctor) return false
      if (filterStatus !== 'all' && appt.status !== filterStatus) return false
      return true
    })
  }, [appointments, filterDoctor, filterStatus])

  const getPatient = (patientId: string) => patients.find((p) => p.id === patientId)

  // Status badge styling
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

  const handleExecuteReschedule = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeAppt) return
    setRescheduleError('')

    const result = rescheduleAppointment(
      activeAppt.id,
      rescheduleDate,
      rescheduleTime,
      rescheduleReason || 'Patient requested new time slot.'
    )

    if (!result.success) {
      setRescheduleError(result.error || 'Conflict detected. Please select another time.')
      return
    }

    setShowRescheduleModal(false)
    setActiveAppt(null)
  }

  const handleExecuteCancel = (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeAppt) return

    cancelAppointment(activeAppt.id, cancelReason || 'Patient cancelled visit.')
    setShowCancelModal(false)
    setActiveAppt(null)
  }

  const handleSendWhatsApp = () => {
    if (!activeAppt) return
    const patient = getPatient(activeAppt.patientId)
    if (!patient) return

    const message = generateWhatsAppMessage(whatsAppType, activeAppt, patient)
    sendAppointmentReminder(activeAppt.id, 'whatsapp')

    // Open WhatsApp Web with prefilled message
    const phone = patient.mobile.replace(/\D/g, '')
    const url = `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
    setShowWhatsAppModal(false)
  }

  return (
    <div className="calendar-page-root" data-testid="feature-page-appt.calendar">
      {/* 1. Header & Navigation Toolbar */}
      <header className="calendar-header-toolbar">
        <div className="calendar-heading-group">
          <div className="calendar-date-nav">
            <button className="btn-icon" onClick={handlePrevDay} title="Previous">
              <ChevronLeft size={16} />
            </button>
            <button className="btn-today" onClick={handleToday}>
              Today
            </button>
            <button className="btn-icon" onClick={handleNextDay} title="Next">
              <ChevronRight size={16} />
            </button>
            <span className="calendar-display-date">
              {new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
            <input
              type="date"
              className="calendar-date-picker"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>

        {/* View Switchers & Filters */}
        <div className="calendar-top-actions">
          {/* View Mode Toggle */}
          <div className="calendar-view-toggle">
            <button
              className={`toggle-btn ${viewMode === 'dentist' ? 'is-active' : ''}`}
              onClick={() => setViewMode('dentist')}
            >
              Dentists
            </button>
            <button
              className={`toggle-btn ${viewMode === 'day' ? 'is-active' : ''}`}
              onClick={() => setViewMode('day')}
            >
              Day
            </button>
            <button
              className={`toggle-btn ${viewMode === 'week' ? 'is-active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              Week
            </button>
          </div>

          {/* Doctor Filter */}
          <select
            className="calendar-filter-select"
            value={filterDoctor}
            onChange={(e) => setFilterDoctor(e.target.value)}
          >
            <option value="all">All Dentists</option>
            {DENTISTS.map((d) => (
              <option key={d.id} value={d.name}>{d.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            className="calendar-filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="checked-in">Checked-in</option>
            <option value="in-progress">In Consultation</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <button className="btn-quick-book" onClick={() => navigate('/appointments/new')}>
            <Plus size={15} />
            <span>Book</span>
          </button>
        </div>
      </header>

      {/* 2. CALENDAR VIEWS */}
      <div className="calendar-grid-container">
        {/* VIEW 1: DENTIST VIEW (Columns for each dentist) */}
        {viewMode === 'dentist' && (
          <div className="dentist-view-board">
            <div className="dentist-columns-header">
              <div className="time-gutter-header">Time</div>
              {DENTISTS.filter((d) => filterDoctor === 'all' || d.name === filterDoctor).map((dentist) => (
                <div key={dentist.id} className="dentist-col-title" style={{ borderTop: `3px solid ${dentist.color}` }}>
                  <h4>{dentist.name}</h4>
                  <span>{dentist.specialization} &bull; {dentist.chair}</span>
                </div>
              ))}
            </div>

            <div className="dentist-columns-body">
              {timeSlots.map((slot) => (
                <div key={slot} className="dentist-time-row">
                  <div className="time-gutter-cell">{slot}</div>
                  {DENTISTS.filter((d) => filterDoctor === 'all' || d.name === filterDoctor).map((dentist) => {
                    const apptsInSlot = filteredAppointments.filter(
                      (a) => a.doctor === dentist.name && a.date === selectedDate && a.time === slot
                    )

                    // Check if lunch break
                    const isLunch = slot >= dentist.lunchStart && slot < dentist.lunchEnd

                    return (
                      <div key={dentist.id} className={`dentist-slot-cell ${isLunch ? 'slot-break' : ''}`}>
                        {isLunch && <span className="lunch-label">Break / Lunch</span>}
                        {apptsInSlot.map((appt) => {
                          const patient = getPatient(appt.patientId)
                          return (
                            <div
                              key={appt.id}
                              className={`calendar-appointment-card status-${appt.status}`}
                              onClick={() => setActiveAppt(appt)}
                            >
                              <div className="card-top-row">
                                <span className="card-patient-name">
                                  {patient ? `${patient.firstName} ${patient.lastName}` : 'Walk-in'}
                                </span>
                                {getStatusBadge(appt.status)}
                              </div>
                              <div className="card-treatment-name">
                                {appt.treatmentType || appt.visitType}
                              </div>
                              <div className="card-meta-row">
                                <span><Clock size={11} /> {appt.time} ({appt.durationMinutes || 30}m)</span>
                                <span>{appt.chair}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 2: DAY VIEW (Chronological timeline) */}
        {viewMode === 'day' && (
          <div className="day-view-board">
            <div className="day-timeline-header">
              <h3>Daily Schedule — {new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
            </div>
            <div className="day-timeline-list">
              {timeSlots.map((slot) => {
                const appts = filteredAppointments.filter((a) => a.date === selectedDate && a.time === slot)
                return (
                  <div key={slot} className="day-timeline-row">
                    <div className="timeline-hour-col">
                      <span>{slot}</span>
                    </div>
                    <div className="timeline-slot-content">
                      {appts.length === 0 ? (
                        <div className="timeline-empty-slot">
                          <span className="available-tag">Available</span>
                        </div>
                      ) : (
                        appts.map((appt) => {
                          const patient = getPatient(appt.patientId)
                          return (
                            <div
                              key={appt.id}
                              className={`calendar-appointment-card status-${appt.status}`}
                              onClick={() => setActiveAppt(appt)}
                            >
                              <div className="card-top-row">
                                <span className="card-patient-name">
                                  {patient ? `${patient.firstName} ${patient.lastName}` : 'Patient'}
                                </span>
                                <span className="card-doctor-badge">{appt.doctor}</span>
                                {getStatusBadge(appt.status)}
                              </div>
                              <div className="card-treatment-name">{appt.treatmentType || appt.visitType}</div>
                              <div className="card-meta-row">
                                <span>{appt.chair || 'Chair 1'}</span>
                                {appt.notes && <span className="card-notes-preview">&bull; {appt.notes}</span>}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* VIEW 3: WEEK VIEW (7-Day matrix) */}
        {viewMode === 'week' && (
          <div className="week-view-board">
            <div className="week-columns-header">
              <div className="time-gutter-header">Time</div>
              {weekDays.map((w) => (
                <div
                  key={w.dateStr}
                  className={`week-col-title ${w.dateStr === selectedDate ? 'today-highlight' : ''}`}
                >
                  <span className="week-day-name">{w.dayName}</span>
                  <strong className="week-day-num">{w.dayNum}</strong>
                </div>
              ))}
            </div>

            <div className="week-columns-body">
              {timeSlots.map((slot) => (
                <div key={slot} className="week-time-row">
                  <div className="time-gutter-cell">{slot}</div>
                  {weekDays.map((w) => {
                    const appts = filteredAppointments.filter(
                      (a) => a.date === w.dateStr && a.time === slot
                    )
                    return (
                      <div key={w.dateStr} className="week-slot-cell">
                        {appts.map((appt) => {
                          const patient = getPatient(appt.patientId)
                          return (
                            <div
                              key={appt.id}
                              className={`week-mini-card status-${appt.status}`}
                              onClick={() => setActiveAppt(appt)}
                            >
                              <strong>{patient ? patient.firstName : 'Patient'}</strong>
                              <span>{appt.treatmentType?.slice(0, 16)}...</span>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. APPOINTMENT DETAIL MODAL */}
      {activeAppt && (
        <div className="calendar-modal-overlay">
          <div className="calendar-detail-modal">
            <div className="modal-header">
              <div className="modal-title-wrap">
                <span className="modal-ref-id">{activeAppt.id}</span>
                <h3>Appointment Details</h3>
              </div>
              <button className="btn-close" onClick={() => setActiveAppt(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Quick Status Control */}
            <div className="modal-status-bar">
              <div className="current-status-display">
                <span>Current Status:</span>
                {getStatusBadge(activeAppt.status)}
              </div>
              <div className="status-changer">
                <label>Change Status:</label>
                <select
                  value={activeAppt.status}
                  onChange={(e) => {
                    const newStatus = e.target.value as AppointmentStatus
                    updateAppointmentStatus(activeAppt.id, newStatus)
                    setActiveAppt({ ...activeAppt, status: newStatus })
                  }}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="checked-in">Checked-in</option>
                  <option value="in-progress">In Consultation</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no-show">No-Show</option>
                </select>
              </div>
            </div>

            {/* Detail Grid */}
            <div className="modal-detail-grid">
              <div className="detail-item">
                <span className="detail-label">Patient</span>
                <strong>
                  {(() => {
                    const p = getPatient(activeAppt.patientId)
                    return p ? `${p.firstName} ${p.lastName} (${p.id})` : 'Unknown Patient'
                  })()}
                </strong>
              </div>
              <div className="detail-item">
                <span className="detail-label">Dentist</span>
                <strong>{activeAppt.doctor}</strong>
              </div>
              <div className="detail-item">
                <span className="detail-label">Treatment</span>
                <strong>{activeAppt.treatmentType || activeAppt.visitType}</strong>
              </div>
              <div className="detail-item">
                <span className="detail-label">Chair</span>
                <strong>{activeAppt.chair || 'Chair 1'}</strong>
              </div>
              <div className="detail-item">
                <span className="detail-label">Date & Time</span>
                <strong>{activeAppt.date} at {activeAppt.time} ({activeAppt.durationMinutes || 30} mins)</strong>
              </div>
              <div className="detail-item">
                <span className="detail-label">Priority</span>
                <strong className="text-capitalize">{activeAppt.priority || 'Normal'}</strong>
              </div>
            </div>

            {activeAppt.notes && (
              <div className="modal-notes-box">
                <span className="detail-label">Notes & Instructions:</span>
                <p>{activeAppt.notes}</p>
              </div>
            )}

            {/* Action Bar (Requirement #5, #6, #8) */}
            <div className="modal-actions-bar">
              <button
                className="btn-action-reschedule"
                onClick={() => {
                  setRescheduleDate(activeAppt.date)
                  setRescheduleTime(activeAppt.time)
                  setShowRescheduleModal(true)
                }}
              >
                <RotateCcw size={14} />
                <span>Reschedule</span>
              </button>

              <button
                className="btn-action-whatsapp"
                onClick={() => setShowWhatsAppModal(true)}
              >
                <Send size={14} />
                <span>WhatsApp Reminder</span>
              </button>

              <button
                className="btn-action-cancel"
                onClick={() => setShowCancelModal(true)}
              >
                <X size={14} />
                <span>Cancel</span>
              </button>
            </div>

            {/* Module Integration Hub (Requirement #8) */}
            <div className="modal-integration-section">
              <span className="section-label">Connect Clinic Modules:</span>
              <div className="integration-links-row">
                <Link
                  to={`/patients/${activeAppt.patientId}`}
                  className="integration-chip"
                >
                  <User size={13} />
                  <span>Patient Profile</span>
                </Link>
                <Link
                  to={`/patients/${activeAppt.patientId}/tooth-chart`}
                  className="integration-chip"
                >
                  <Stethoscope size={13} />
                  <span>Tooth Chart</span>
                </Link>
                <Link
                  to={`/clinical/notes?patientId=${activeAppt.patientId}`}
                  className="integration-chip"
                >
                  <FileText size={13} />
                  <span>Clinical Note</span>
                </Link>
                <Link
                  to={`/billing/invoices?patientId=${activeAppt.patientId}&appointmentId=${activeAppt.id}`}
                  className="integration-chip highlight-chip"
                >
                  <CreditCard size={13} />
                  <span>Invoice & Billing</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && activeAppt && (
        <div className="calendar-modal-overlay">
          <div className="sub-modal-card">
            <div className="modal-header">
              <h3>Reschedule Appointment ({activeAppt.id})</h3>
              <button className="btn-close" onClick={() => setShowRescheduleModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleExecuteReschedule} className="sub-modal-form">
              {rescheduleError && (
                <div className="conflict-alert">
                  <AlertTriangle size={15} />
                  <span>{rescheduleError}</span>
                </div>
              )}
              <div className="form-row-2">
                <label className="form-field">
                  <span>New Date</span>
                  <input
                    type="date"
                    required
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                  />
                </label>
                <label className="form-field">
                  <span>New Time Slot</span>
                  <select
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                  >
                    {timeSlots.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="form-field">
                <span>Reason for Reschedule *</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Patient called to delay by 2 hours"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                />
              </label>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowRescheduleModal(false)}>
                  Back
                </button>
                <button type="submit" className="btn-confirm">
                  Confirm Reschedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && activeAppt && (
        <div className="calendar-modal-overlay">
          <div className="sub-modal-card">
            <div className="modal-header">
              <h3>Cancel Appointment ({activeAppt.id})</h3>
              <button className="btn-close" onClick={() => setShowCancelModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleExecuteCancel} className="sub-modal-form">
              <label className="form-field">
                <span>Cancellation Reason *</span>
                <textarea
                  required
                  rows={3}
                  placeholder="Record why this appointment is cancelled..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </label>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowCancelModal(false)}>
                  Keep Appointment
                </button>
                <button type="submit" className="btn-danger-confirm">
                  Cancel Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Reminder Modal */}
      {showWhatsAppModal && activeAppt && (
        <div className="calendar-modal-overlay">
          <div className="sub-modal-card">
            <div className="modal-header">
              <h3>Send WhatsApp Reminder</h3>
              <button className="btn-close" onClick={() => setShowWhatsAppModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="whatsapp-preview-box">
              <label className="form-field">
                <span>Select Message Template:</span>
                <select
                  value={whatsAppType}
                  onChange={(e) => setWhatsAppType(e.target.value as any)}
                >
                  <option value="confirmation">Appointment Confirmation</option>
                  <option value="reminder_24h">24-Hour Reminder</option>
                  <option value="reminder_2h">2-Hour Arrival Alert</option>
                  <option value="recall">6-Month Routine Recall</option>
                </select>
              </label>

              <div className="whatsapp-bubble-preview">
                <pre>
                  {(() => {
                    const p = getPatient(activeAppt.patientId)
                    return p ? generateWhatsAppMessage(whatsAppType, activeAppt, p) : ''
                  })()}
                </pre>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowWhatsAppModal(false)}>
                  Cancel
                </button>
                <button type="button" className="btn-whatsapp-send" onClick={handleSendWhatsApp}>
                  <Send size={15} />
                  <span>Send via WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CalendarPage
