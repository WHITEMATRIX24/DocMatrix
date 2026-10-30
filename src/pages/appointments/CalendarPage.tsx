import React, { useState, useMemo } from 'react'
import './calendar.css'
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
  Check,
  UserCheck,
  UserPlus,
  Search
} from 'lucide-react'
import {
  useClinicData,
  DENTISTS,
  DENTAL_TREATMENTS,
  bookAppointment,
  registerWalkIn,
  updateAppointmentStatus,
  rescheduleAppointment,
  cancelAppointment,
  sendAppointmentReminder,
  generateWhatsAppMessage,
  checkDentistAvailability,
  type AppointmentRecord,
  type AppointmentStatus,
  type AppointmentPriority
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

  // In-Calendar Quick Book Modal State
  const [showQuickBook, setShowQuickBook] = useState(false)
  const [qbDoctor, setQbDoctor] = useState(DENTISTS[0].name)
  const [qbDate, setQbDate] = useState(selectedDate)
  const [qbTime, setQbTime] = useState('10:00')
  const [qbPatientSearch, setQbPatientSearch] = useState('')
  const [qbSelectedPatientId, setQbSelectedPatientId] = useState('')
  const [qbTreatmentId, setQbTreatmentId] = useState(DENTAL_TREATMENTS[0].id)
  const [qbPriority, setQbPriority] = useState<AppointmentPriority>('normal')
  const [qbNotes, setQbNotes] = useState('')
  const [qbError, setQbError] = useState('')

  // In-Calendar Quick Walk-in Modal State
  const [showQuickWalkIn, setShowQuickWalkIn] = useState(false)
  const [wiName, setWiName] = useState('')
  const [wiMobile, setWiMobile] = useState('')
  const [wiDoctor, setWiDoctor] = useState(DENTISTS[0].name)
  const [wiComplaint, setWiComplaint] = useState('')
  const [wiPriority, setWiPriority] = useState<AppointmentPriority>('normal')

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

  const handleJumpDate = (offsetDays: number) => {
    const d = new Date()
    d.setDate(d.getDate() + offsetDays)
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

  // Selected date's appointments for counts
  const dateAppointments = useMemo(() => {
    return appointments.filter((a) => a.date === selectedDate && a.status !== 'cancelled')
  }, [appointments, selectedDate])

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

  // Quick 1-click status advancement on card
  const handleQuickAdvanceStatus = (e: React.MouseEvent, appt: AppointmentRecord) => {
    e.stopPropagation()
    let nextStatus: AppointmentStatus = 'checked-in'
    if (appt.status === 'scheduled' || appt.status === 'confirmed') nextStatus = 'checked-in'
    else if (appt.status === 'checked-in') nextStatus = 'in-progress'
    else if (appt.status === 'in-progress') nextStatus = 'completed'
    updateAppointmentStatus(appt.id, nextStatus)
  }

  // Quick WhatsApp trigger from card
  const handleQuickWhatsApp = (e: React.MouseEvent, appt: AppointmentRecord) => {
    e.stopPropagation()
    setActiveAppt(appt)
    setShowWhatsAppModal(true)
  }

  // Open Quick Book prefilled for a specific doctor & time slot
  const handleOpenSlotBooking = (doctorName: string, slotTime: string, dateStr?: string) => {
    setQbDoctor(doctorName)
    setQbTime(slotTime)
    setQbDate(dateStr || selectedDate)
    setQbPatientSearch('')
    setQbSelectedPatientId('')
    setQbError('')
    setShowQuickBook(true)
  }

  // Patient search: strictly by Name or unique Patient ID Number (no phone number)
  const matchedPatients = useMemo(() => {
    if (!qbPatientSearch.trim()) return patients
    const q = qbPatientSearch.toLowerCase().trim()
    const digitsOnly = q.replace(/\D/g, '')
    return patients.filter((p) => {
      const fullName = `${p.firstName} ${p.lastName}`.toLowerCase()
      const firstName = p.firstName.toLowerCase()
      const lastName = p.lastName.toLowerCase()
      const patientId = p.id.toLowerCase()
      const patientIdDigits = p.id.replace(/\D/g, '')

      const nameMatch = fullName.includes(q) || firstName.includes(q) || lastName.includes(q)
      const idMatch = patientId.includes(q) || (digitsOnly.length > 0 && patientIdDigits.includes(digitsOnly))
      return nameMatch || idMatch
    })
  }, [patients, qbPatientSearch])

  const selectedQbPatient = patients.find((p) => p.id === qbSelectedPatientId)
  const selectedQbTreatment = DENTAL_TREATMENTS.find((t) => t.id === qbTreatmentId)
  const selectedQbDentist = DENTISTS.find((d) => d.name === qbDoctor)

  // Real-time availability validation for Quick Book
  const qbAvailability = useMemo(() => {
    const duration = selectedQbTreatment?.defaultDurationMinutes || 30
    return checkDentistAvailability(qbDoctor, qbDate, qbTime, duration)
  }, [qbDoctor, qbDate, qbTime, selectedQbTreatment])

  const handleExecuteQuickBook = (e: React.FormEvent) => {
    e.preventDefault()
    if (!qbSelectedPatientId) {
      setQbError('Please search and select a patient by Name or Patient ID.')
      return
    }
    if (!qbAvailability.available) {
      setQbError(qbAvailability.reason || 'This slot is unavailable.')
      return
    }

    bookAppointment({
      patientId: qbSelectedPatientId,
      doctor: qbDoctor,
      chair: selectedQbDentist?.chair || 'Chair 1',
      treatmentType: selectedQbTreatment?.name || 'General Dental Consultation',
      visitType: selectedQbTreatment?.category || 'Consultation',
      date: qbDate,
      time: qbTime,
      durationMinutes: selectedQbTreatment?.defaultDurationMinutes || 30,
      priority: qbPriority,
      notes: qbNotes
    })

    setShowQuickBook(false)
  }

  const handleExecuteQuickWalkIn = (e: React.FormEvent) => {
    e.preventDefault()
    if (!wiName.trim()) return

    registerWalkIn({
      patientName: wiName,
      mobile: wiMobile,
      gender: 'female',
      age: '28',
      complaint: wiComplaint || 'General Dental Consultation',
      doctor: wiDoctor,
      priority: wiPriority
    })

    setWiName('')
    setWiMobile('')
    setWiComplaint('')
    setShowQuickWalkIn(false)
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

            {/* Convenient Quick Date Jump Chips */}
            <div className="date-quick-chips">
              <button
                type="button"
                className="date-chip-btn"
                onClick={() => handleJumpDate(-1)}
                title="Jump to Yesterday"
              >
                Yesterday
              </button>
              <button
                type="button"
                className="date-chip-btn"
                onClick={() => handleJumpDate(1)}
                title="Jump to Tomorrow"
              >
                Tomorrow
              </button>
            </div>

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

        {/* View Switchers & Fast Actions */}
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

          {/* Reschedule Button in Calendar Header */}
          <button
            type="button"
            className="patient-intake-secondary"
            onClick={() => {
              const apptToReschedule = dateAppointments.find((a) => a.status !== 'cancelled' && a.status !== 'completed') || appointments.find((a) => a.status !== 'cancelled' && a.status !== 'completed')
              if (apptToReschedule) {
                setActiveAppt(apptToReschedule)
                setRescheduleDate(apptToReschedule.date)
                setRescheduleTime(apptToReschedule.time)
                setRescheduleReason('')
                setRescheduleError('')
                setShowRescheduleModal(true)
              }
            }}
            style={{ padding: '6px 12px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            title="Reschedule an appointment"
          >
            <RotateCcw size={14} />
            <span>Reschedule</span>
          </button>

          {/* Quick Walk-in Button right on Calendar */}
          <button
            type="button"
            className="patient-intake-secondary"
            onClick={() => setShowQuickWalkIn(true)}
            style={{ padding: '6px 12px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            title="Register a walk-in patient"
          >
            <UserPlus size={14} />
            <span>+ Walk-in</span>
          </button>

          {/* Quick Book Button */}
          <button
            type="button"
            className="btn-quick-book"
            onClick={() => handleOpenSlotBooking(DENTISTS[0].name, '10:00', selectedDate)}
            title="Open fast booking modal"
          >
            <Plus size={15} />
            <span>+ Quick Book</span>
          </button>
        </div>
      </header>



      {/* 3. CALENDAR VIEWS */}
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
                        {isLunch ? (
                          <span className="lunch-label">Break / Lunch</span>
                        ) : apptsInSlot.length === 0 ? (
                          <button
                            type="button"
                            className="slot-book-btn"
                            onClick={() => handleOpenSlotBooking(dentist.name, slot, selectedDate)}
                            title={`Click to fast book ${dentist.name} at ${slot}`}
                          >
                            <Plus size={11} />
                            <span>Book slot</span>
                          </button>
                        ) : (
                          apptsInSlot.map((appt) => {
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

                                {/* Convenient Card Quick Actions */}
                                <div className="card-action-bar">
                                  {appt.status !== 'completed' && appt.status !== 'cancelled' && (
                                    <>
                                      <button
                                        type="button"
                                        className="card-quick-advance-btn"
                                        onClick={(e) => handleQuickAdvanceStatus(e, appt)}
                                        title={
                                          appt.status === 'in-progress'
                                            ? 'Mark Consultation Finished'
                                            : appt.status === 'checked-in'
                                            ? 'Call in to Chair'
                                            : 'Mark Checked-In'
                                        }
                                      >
                                        {appt.status === 'in-progress' ? (
                                          <><Check size={11} /> Complete</>
                                        ) : appt.status === 'checked-in' ? (
                                          <><Play size={11} /> Call in</>
                                        ) : (
                                          <><UserCheck size={11} /> Check-in</>
                                        )}
                                      </button>
                                      <button
                                        type="button"
                                        className="card-quick-reschedule-btn"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setActiveAppt(appt)
                                          setRescheduleDate(appt.date)
                                          setRescheduleTime(appt.time)
                                          setRescheduleReason('')
                                          setRescheduleError('')
                                          setShowRescheduleModal(true)
                                        }}
                                        title="Reschedule appointment"
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '3px',
                                          padding: '3px 7px',
                                          fontSize: '11px',
                                          fontWeight: 600,
                                          borderRadius: '4px',
                                          border: '1px solid var(--line, #cbd5e1)',
                                          background: 'var(--surface, #ffffff)',
                                          color: 'var(--teal-primary, #0b8185)',
                                          cursor: 'pointer'
                                        }}
                                      >
                                        <RotateCcw size={11} />
                                        <span>Reschedule</span>
                                      </button>
                                    </>
                                  )}

                                  <button
                                    type="button"
                                    className="card-quick-wa-btn"
                                    onClick={(e) => handleQuickWhatsApp(e, appt)}
                                    title="Send WhatsApp Reminder"
                                  >
                                    <Send size={11} />
                                  </button>
                                </div>
                              </div>
                            )
                          })
                        )}
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
              <h3>Daily Schedule &mdash; {new Date(`${selectedDate}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
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
                          <button
                            type="button"
                            className="timeline-quick-book-btn"
                            onClick={() => handleOpenSlotBooking(DENTISTS[0].name, slot, selectedDate)}
                            title={`Book an appointment at ${slot}`}
                          >
                            <Plus size={12} /> Book {slot}
                          </button>
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

                              <div className="card-action-bar">
                                {appt.status !== 'completed' && appt.status !== 'cancelled' && (
                                  <>
                                    <button
                                      type="button"
                                      className="card-quick-advance-btn"
                                      onClick={(e) => handleQuickAdvanceStatus(e, appt)}
                                    >
                                      {appt.status === 'in-progress' ? 'Complete' : appt.status === 'checked-in' ? 'Call in' : 'Check-in'}
                                    </button>
                                    <button
                                      type="button"
                                      className="card-quick-reschedule-btn"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setActiveAppt(appt)
                                        setRescheduleDate(appt.date)
                                        setRescheduleTime(appt.time)
                                        setRescheduleReason('')
                                        setRescheduleError('')
                                        setShowRescheduleModal(true)
                                      }}
                                      title="Reschedule appointment"
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        padding: '3px 7px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        borderRadius: '4px',
                                        border: '1px solid var(--line, #cbd5e1)',
                                        background: 'var(--surface, #ffffff)',
                                        color: 'var(--teal-primary, #0b8185)',
                                        cursor: 'pointer'
                                      }}
                                    >
                                      <RotateCcw size={11} />
                                      <span>Reschedule</span>
                                    </button>
                                  </>
                                )}
                                <button
                                  type="button"
                                  className="card-quick-wa-btn"
                                  onClick={(e) => handleQuickWhatsApp(e, appt)}
                                  title="WhatsApp Reminder"
                                >
                                  <Send size={11} /> WhatsApp
                                </button>
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
                  onClick={() => setSelectedDate(w.dateStr)}
                  style={{ cursor: 'pointer' }}
                  title="Click to select this day"
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
                        {appts.length === 0 ? (
                          <button
                            type="button"
                            className="week-slot-add-btn"
                            onClick={() => handleOpenSlotBooking(DENTISTS[0].name, slot, w.dateStr)}
                            title={`Book ${w.dateStr} at ${slot}`}
                          >
                            <Plus size={10} />
                          </button>
                        ) : (
                          appts.map((appt) => {
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
                          })
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. FAST IN-CALENDAR QUICK-BOOK MODAL (High Convenience) */}
      {showQuickBook && (
        <div className="calendar-modal-overlay">
          <div className="sub-modal-card" style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalendarDays size={18} style={{ color: '#0b8185' }} />
                <h3 style={{ margin: 0 }}>Fast Appointment Booking</h3>
              </div>
              <button className="btn-close" onClick={() => setShowQuickBook(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleExecuteQuickBook} className="sub-modal-form">
              {qbError && (
                <div className="conflict-alert">
                  <AlertTriangle size={15} />
                  <span>{qbError}</span>
                </div>
              )}

              {/* Patient Search: by Name or unique Patient ID (no phone number) */}
              <div className="form-field">
                <label>
                  <span>Patient Search (by Name or Patient ID) *</span>
                </label>
                {selectedQbPatient ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'rgba(11, 129, 133, 0.08)', borderRadius: '6px', border: '1px solid #0b8185' }}>
                    <div>
                      <strong style={{ color: '#0f172a' }}>{selectedQbPatient.firstName} {selectedQbPatient.lastName}</strong>
                      <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '8px' }}>ID: {selectedQbPatient.id}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setQbSelectedPatientId(''); setQbPatientSearch('') }}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748b', fontSize: '12px' }}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="Type patient name or ID (e.g. Aarav, PAT-1001)..."
                        value={qbPatientSearch}
                        onChange={(e) => setQbPatientSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                    {matchedPatients.length > 0 && (
                      <div style={{ marginTop: '6px', maxHeight: '140px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#ffffff', boxShadow: '0 4px 10px rgba(0,0,0,0.08)' }}>
                        {matchedPatients.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => { setQbSelectedPatientId(p.id); setQbPatientSearch('') }}
                            style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}
                          >
                            <strong>{p.firstName} {p.lastName}</strong>
                            <span style={{ color: '#64748b', fontSize: '11px' }}>{p.id}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Dentist & Treatment */}
              <div className="form-row-2">
                <label className="form-field">
                  <span>Dentist</span>
                  <select value={qbDoctor} onChange={(e) => setQbDoctor(e.target.value)}>
                    {DENTISTS.map((d) => (
                      <option key={d.id} value={d.name}>{d.name} ({d.chair})</option>
                    ))}
                  </select>
                </label>

                <label className="form-field">
                  <span>Treatment Procedure</span>
                  <select value={qbTreatmentId} onChange={(e) => setQbTreatmentId(e.target.value)}>
                    {DENTAL_TREATMENTS.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({t.defaultDurationMinutes}m)</option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Date & Time */}
              <div className="form-row-2">
                <label className="form-field">
                  <span>Date</span>
                  <input type="date" value={qbDate} onChange={(e) => setQbDate(e.target.value)} required />
                </label>

                <label className="form-field">
                  <span>Time Slot</span>
                  <select value={qbTime} onChange={(e) => setQbTime(e.target.value)}>
                    {timeSlots.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Conflict Status Display */}
              <div style={{ padding: '6px 10px', borderRadius: '6px', background: qbAvailability.available ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)', border: `1px solid ${qbAvailability.available ? '#10b981' : '#ef4444'}`, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {qbAvailability.available ? (
                  <>
                    <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                    <span style={{ color: '#065f46', fontWeight: 600 }}>Doctor is available at this time</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={14} style={{ color: '#ef4444' }} />
                    <span style={{ color: '#991b1b', fontWeight: 600 }}>{qbAvailability.reason || 'Slot conflict'}</span>
                  </>
                )}
              </div>

              <div className="modal-actions" style={{ marginTop: '12px' }}>
                <button type="button" className="btn-cancel" onClick={() => setShowQuickBook(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-confirm"
                  disabled={!qbAvailability.available || !qbSelectedPatientId}
                  style={{ opacity: (!qbAvailability.available || !qbSelectedPatientId) ? 0.6 : 1 }}
                >
                  Confirm & Drop on Calendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. FAST IN-CALENDAR WALK-IN REGISTRATION MODAL */}
      {showQuickWalkIn && (
        <div className="calendar-modal-overlay">
          <div className="sub-modal-card" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={18} style={{ color: '#0b8185' }} />
                <h3 style={{ margin: 0 }}>Register Walk-in Patient</h3>
              </div>
              <button className="btn-close" onClick={() => setShowQuickWalkIn(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleExecuteQuickWalkIn} className="sub-modal-form">
              <label className="form-field">
                <span>Patient Full Name *</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={wiName}
                  onChange={(e) => setWiName(e.target.value)}
                  autoFocus
                />
              </label>

              <div className="form-row-2">
                <label className="form-field">
                  <span>Mobile Number</span>
                  <input
                    type="tel"
                    placeholder="9876543210"
                    value={wiMobile}
                    onChange={(e) => setWiMobile(e.target.value)}
                  />
                </label>

                <label className="form-field">
                  <span>Assign Dentist</span>
                  <select value={wiDoctor} onChange={(e) => setWiDoctor(e.target.value)}>
                    {DENTISTS.map((d) => (
                      <option key={d.id} value={d.name}>{d.name} ({d.chair})</option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="form-field">
                <span>Primary Dental Complaint</span>
                <input
                  type="text"
                  placeholder="e.g. Severe toothache, chipped molar, bleeding gums"
                  value={wiComplaint}
                  onChange={(e) => setWiComplaint(e.target.value)}
                />
              </label>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowQuickWalkIn(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-confirm">
                  Issue Token & Add to Live Queue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. APPOINTMENT DETAIL MODAL (Requirements #4, #5, #6, #8) */}
      {activeAppt && (
        <div className="calendar-modal-overlay" onClick={() => setActiveAppt(null)}>
          <div className="calendar-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-wrap">
                <span className="modal-ref-id">{activeAppt.id}</span>
                <h3>Appointment Details</h3>
              </div>
              <button className="btn-close" onClick={() => setActiveAppt(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Quick Status Control Bar */}
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

            {/* Clean Structured Information Cards */}
            <div className="modal-detail-content">
              <div className="modal-detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Patient</span>
                  <strong className="detail-value">
                    {(() => {
                      const p = getPatient(activeAppt.patientId)
                      return p ? `${p.firstName} ${p.lastName} (${p.id})` : 'Unknown Patient'
                    })()}
                  </strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Dentist</span>
                  <strong className="detail-value">{activeAppt.doctor}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Treatment</span>
                  <strong className="detail-value">{activeAppt.treatmentType || activeAppt.visitType}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Chair</span>
                  <strong className="detail-value">{activeAppt.chair || 'Chair 1'}</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Date & Time</span>
                  <strong className="detail-value">{activeAppt.date} at {activeAppt.time} ({activeAppt.durationMinutes || 30} mins)</strong>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Priority</span>
                  <strong className="detail-value text-capitalize">{activeAppt.priority || 'Normal'}</strong>
                </div>
              </div>

              {activeAppt.notes && (
                <div className="modal-notes-box">
                  <span className="detail-label">Notes & Instructions:</span>
                  <p>{activeAppt.notes}</p>
                </div>
              )}
            </div>

            {/* Modern Action Bar with icons & crisp styling */}
            <div className="modal-actions-bar">
              <button
                type="button"
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
                type="button"
                className="btn-action-whatsapp"
                onClick={() => setShowWhatsAppModal(true)}
              >
                <Send size={14} />
                <span>WhatsApp Reminder</span>
              </button>

              <button
                type="button"
                className="btn-action-cancel"
                onClick={() => setShowCancelModal(true)}
              >
                <X size={14} />
                <span>Cancel</span>
              </button>
            </div>

            {/* Module Integration Hub (Clean Pill Chips) */}
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

      {/* 7. Reschedule Modal (Requirement #5) */}
      {showRescheduleModal && activeAppt && (
        <div className="calendar-modal-overlay">
          <div className="sub-modal-card reschedule-modal-card">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="reschedule-header-icon"><RotateCcw size={16} /></span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px' }}>Reschedule Appointment</h3>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted, #64748b)' }}>ID: {activeAppt.id}</span>
                </div>
              </div>
              <button className="btn-close" onClick={() => setShowRescheduleModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleExecuteReschedule} className="sub-modal-form" style={{ padding: '20px' }}>
              {/* Context Summary Banner */}
              <div className="reschedule-context-banner">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Patient: <strong style={{ color: 'var(--text-strong)' }}>{activeAppt.patientName}</strong></span>
                  <span style={{ fontSize: '11px', color: 'var(--teal-primary)', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'var(--teal-tint)' }}>{activeAppt.chair}</span>
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Doctor: <strong style={{ color: 'var(--text-strong)' }}>{activeAppt.doctor}</strong> &bull; {activeAppt.treatmentType}
                </div>
                <div className="reschedule-current-pill">
                  <span>Current Schedule:</span>
                  <strong>{activeAppt.date} at {activeAppt.time}</strong>
                </div>
              </div>

              {rescheduleError && (
                <div className="conflict-alert" style={{ marginBottom: '12px' }}>
                  <AlertTriangle size={15} />
                  <span>{rescheduleError}</span>
                </div>
              )}

              <div className="form-row-2">
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
                  placeholder="e.g. Patient requested later time, doctor shift change..."
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                />
              </label>

              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" className="btn-cancel" onClick={() => setShowRescheduleModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-confirm-reschedule">
                  <RotateCcw size={14} />
                  <span>Confirm Reschedule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Cancel Modal (Requirement #5) */}
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

      {/* 9. WhatsApp Reminder Modal (Requirement #6) */}
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
