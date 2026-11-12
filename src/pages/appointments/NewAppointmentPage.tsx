import React, { useState, useMemo, useRef, useEffect } from 'react'
import './calendar.css'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import {
  CalendarDays,
  Clock,
  User,
  Search,
  CheckCircle2,
  AlertTriangle,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  UserRound,
  Check,
  UserPlus,
  Plus,
  ArrowRight,
  Sparkles
} from 'lucide-react'
import {
  useClinicData,
  bookAppointment,
  checkDentistAvailability,
  DENTISTS,
  DENTAL_TREATMENTS,
  type AppointmentPriority
} from '@/services/clinicStore'

const today = () => {
  const current = new Date()
  current.setMinutes(current.getMinutes() - current.getTimezoneOffset())
  return current.toISOString().slice(0, 10)
}

const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'
]

const formatDisplayDate = (dateStr: string) => {
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    const dateObj = new Date(y, m - 1, d)
    return dateObj.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  } catch {
    return dateStr
  }
}

export const NewAppointmentPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { patients, appointments } = useClinicData()

  // State
  const [patientSearch, setPatientSearch] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState(searchParams.get('patientId') || '')
  const [selectedDoctor, setSelectedDoctor] = useState(DENTISTS[0].name)
  const [selectedTreatmentId, setSelectedTreatmentId] = useState(DENTAL_TREATMENTS[0].id)
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedTime, setSelectedTime] = useState('10:00')
  const [priority, setPriority] = useState<AppointmentPriority>('normal')
  const [notes, setNotes] = useState('')
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null)
  const [bookingRef, setBookingRef] = useState<string | null>(null)
  const [isBooking, setIsBooking] = useState(false)

  // Patient filter: search by Name OR Patient ID Number (NO phone number)
  const matchedPatients = useMemo(() => {
    if (!patientSearch.trim()) return patients
    const q = patientSearch.toLowerCase().trim()
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
  }, [patients, patientSearch])

  const [dentistSearch, setDentistSearch] = useState('')
  const [isDentistSearchOpen, setIsDentistSearchOpen] = useState(false)

  const patientSearchRef = useRef<HTMLDivElement>(null)
  const dentistSearchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOutsideTap = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (isSearchOpen && patientSearchRef.current && !patientSearchRef.current.contains(target)) {
        setIsSearchOpen(false)
      }
      if (isDentistSearchOpen && dentistSearchRef.current && !dentistSearchRef.current.contains(target)) {
        setIsDentistSearchOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchOpen(false)
        setIsDentistSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideTap)
    document.addEventListener('touchstart', handleOutsideTap)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleOutsideTap)
      document.removeEventListener('touchstart', handleOutsideTap)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isSearchOpen, isDentistSearchOpen])

  const matchedDentists = useMemo(() => {
    if (!dentistSearch.trim()) return DENTISTS
    const q = dentistSearch.toLowerCase().trim()
    return DENTISTS.filter((d) => {
      const nameMatch = d.name.toLowerCase().includes(q)
      const specMatch = d.specialization.toLowerCase().includes(q)
      const chairMatch = d.chair.toLowerCase().includes(q)
      return nameMatch || specMatch || chairMatch
    })
  }, [dentistSearch])

  const selectedPatient = patients.find((p) => p.id === selectedPatientId)
  const selectedDentist = DENTISTS.find((d) => d.name === selectedDoctor)
  const selectedTreatment = DENTAL_TREATMENTS.find((t) => t.id === selectedTreatmentId)

  // Real-time availability check
  const [viewMonthDate, setViewMonthDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d
  })

  const calendarMonthData = useMemo(() => {
    const year = viewMonthDate.getFullYear()
    const month = viewMonthDate.getMonth()
    const firstDayIndex = new Date(year, month, 1).getDay()
    const totalDays = new Date(year, month + 1, 0).getDate()
    const prevMonthDays = new Date(year, month, 0).getDate()
    const todayStr = today()

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean; isPast: boolean; isToday: boolean; isSelected: boolean }[] = []

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i
      const d = new Date(year, month - 1, dayNum)
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
      const dateStr = d.toISOString().slice(0, 10)
      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        isPast: dateStr < todayStr,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate
      })
    }

    for (let day = 1; day <= totalDays; day++) {
      const d = new Date(year, month, day)
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
      const dateStr = d.toISOString().slice(0, 10)
      days.push({
        dateStr,
        dayNum: day,
        isCurrentMonth: true,
        isPast: dateStr < todayStr,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate
      })
    }

    const remaining = (7 - (days.length % 7)) % 7
    for (let day = 1; day <= remaining; day++) {
      const d = new Date(year, month + 1, day)
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
      const dateStr = d.toISOString().slice(0, 10)
      days.push({
        dateStr,
        dayNum: day,
        isCurrentMonth: false,
        isPast: dateStr < todayStr,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDate
      })
    }

    return {
      monthName: viewMonthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
      days
    }
  }, [viewMonthDate, selectedDate])

  const handlePrevMonth = () => {
    setViewMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setViewMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const handleTodayMonth = () => {
    const now = new Date()
    setSelectedDate(today())
    setViewMonthDate(new Date(now.getFullYear(), now.getMonth(), 1))
  }

  const availability = useMemo(() => {
    const duration = selectedTreatment?.defaultDurationMinutes || 30
    return checkDentistAvailability(selectedDoctor, selectedDate, selectedTime, duration)
  }, [selectedDoctor, selectedDate, selectedTime, selectedTreatment])

  const handleSelectPatient = (patientId: string) => {
    setSelectedPatientId(patientId)
    setPatientSearch('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isBooking || bookingSuccess) return
    if (!selectedPatientId) return
    if (!availability.available) return

    setIsBooking(true)
    try {
      const newAppt = bookAppointment({
        patientId: selectedPatientId,
        doctor: selectedDoctor,
        chair: selectedDentist?.chair || 'Chair 1',
        treatmentType: selectedTreatment?.name || 'General Dental Consultation',
        visitType: selectedTreatment?.category || 'Consultation',
        date: selectedDate,
        time: selectedTime,
        durationMinutes: selectedTreatment?.defaultDurationMinutes || 30,
        priority,
        notes
      })

      const refCode = newAppt.bookingRef || newAppt.id
      setBookingRef(refCode)
      setBookingSuccess(newAppt.id)

      const syncPromise = (newAppt as any)?._syncPromise
      if (syncPromise && typeof syncPromise.then === 'function') {
        syncPromise
          .then((created: any) => {
            if (created?.id) {
              setBookingSuccess(created.id)
            }
          })
          .catch(() => {})
      }
    } finally {
      setIsBooking(false)
    }
  }

  return (
    <div className="new-appointment-page" data-testid="feature-page-appt.new">
      <div className="page-header-row">
        <div>
          <h2>Book Dental Appointment</h2>
          <p>Schedule a confirmed visit with doctor availability check and conflict prevention.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link
            to="/patients/new"
            className="patient-intake-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none', padding: '6px 14px', fontSize: '13px' }}
          >
            <UserPlus size={14} />
            <span>Register Now</span>
          </Link>
        </div>
      </div>

      {bookingSuccess ? (
        <div className="booking-confirmed-wrapper">
          <div className="booking-confirmed-card">
            {/* Header Badge & Title */}
            <div className="confirmed-header">
              <div className="confirmed-icon-circle">
                <CheckCircle2 size={36} className="confirmed-check-icon" />
              </div>
              <span className="confirmed-pill-badge">Booking Confirmed</span>
              <h2 className="confirmed-title">Appointment Confirmed!</h2>
              <p className="confirmed-subtitle">
                Booking reference <strong className="confirmed-ref-code">{bookingRef || bookingSuccess}</strong> has been registered and added to the clinic schedule.
              </p>
            </div>

            {/* Summary Ticket Details Box */}
            <div className="confirmed-details-box">
              <div className="confirmed-detail-row">
                <div className="confirmed-detail-item">
                  <div className="confirmed-detail-icon">
                    <UserRound size={18} />
                  </div>
                  <div>
                    <span className="confirmed-detail-label">Patient</span>
                    <strong className="confirmed-detail-val">
                      {selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'Walk-in Patient'}
                    </strong>
                    {selectedPatient?.id && (
                      <span className="confirmed-detail-sub">Patient ID: {selectedPatient.id}</span>
                    )}
                  </div>
                </div>

                <div className="confirmed-detail-item">
                  <div className="confirmed-detail-icon">
                    <Stethoscope size={18} />
                  </div>
                  <div>
                    <span className="confirmed-detail-label">Doctor & Operatory</span>
                    <strong className="confirmed-detail-val">{selectedDoctor}</strong>
                    <span className="confirmed-detail-sub">{selectedDentist?.chair || 'Operatory Chair'}</span>
                  </div>
                </div>
              </div>

              <div className="confirmed-divider" />

              <div className="confirmed-detail-row">
                <div className="confirmed-detail-item">
                  <div className="confirmed-detail-icon">
                    <CalendarDays size={18} />
                  </div>
                  <div>
                    <span className="confirmed-detail-label">Date & Time</span>
                    <strong className="confirmed-detail-val">
                      {formatDisplayDate(selectedDate)} at {selectedTime}
                    </strong>
                    <span className="confirmed-detail-sub">
                      {selectedTreatment?.defaultDurationMinutes || 30} mins session
                    </span>
                  </div>
                </div>

                <div className="confirmed-detail-item">
                  <div className="confirmed-detail-icon">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <span className="confirmed-detail-label">Treatment / Procedure</span>
                    <strong className="confirmed-detail-val">
                      {selectedTreatment?.name || 'General Consultation'}
                    </strong>
                    <span className="confirmed-detail-sub">
                      {selectedTreatment?.category || 'General Dentistry'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="confirmed-actions">
              <button
                type="button"
                className="btn-book-another-styled"
                onClick={() => {
                  setBookingSuccess(null)
                  setBookingRef(null)
                }}
              >
                <Plus size={16} />
                <span>Book Another Appointment</span>
              </button>

              <Link
                to={`/appointments/${bookingSuccess}`}
                className="btn-view-booking-styled"
              >
                <span>View Booking Details</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="booking-form-card booking-grid-layout">
          {/* Left Column: Patient, Dentist, Treatment, Notes, Actions */}
          <div className="booking-left-column">
          {/* Section 1: Patient Selection with Live Search (Name or Patient ID ONLY) */}
          <div className="form-section">
            <label className="booking-section-title">
              <UserRound size={16} />
              <span>1. Select Patient *</span>
            </label>

            {selectedPatient ? (
              <div className="selected-patient-pill">
                <div className="patient-avatar">
                  <User size={18} />
                </div>
                <div className="patient-pill-details">
                  <strong>{selectedPatient.firstName} {selectedPatient.lastName}</strong>
                  <span>Patient ID: <strong style={{ color: 'var(--teal-primary, #0b8185)' }}>{selectedPatient.id}</strong> &bull; {selectedPatient.age} yrs &bull; {selectedPatient.gender}</span>
                </div>
                <button
                  type="button"
                  className="btn-change-patient"
                  onClick={() => {
                    setSelectedPatientId('')
                    setIsSearchOpen(true)
                  }}
                >
                  Change
                </button>
              </div>
            ) : (
              <div ref={patientSearchRef} className="patient-search-container">
                  <div className="patient-search-input-wrap">
                  <Search size={16} className="search-icon" />
                  <input
                    type="text"
                    className="patient-search-field"
                    placeholder="Search by Patient Name or ID Number (e.g., Aarav, PAT-1001, 1001)..."
                    value={patientSearch}
                    onFocus={() => setIsSearchOpen(true)}
                    onClick={() => setIsSearchOpen(true)}
                    onChange={(e) => {
                      setPatientSearch(e.target.value)
                      setIsSearchOpen(true)
                    }}
                  />
                </div>

                {isSearchOpen && (
                  <div className="patient-search-dropdown" style={{ maxHeight: '220px', overflowY: 'auto' }}>
                    {matchedPatients.length === 0 ? (
                      <div className="no-patient-match">
                        <span>No patient found with that name or ID number.</span>
                        <Link to="/patients/new" className="link-register-new">
                          Register new patient
                        </Link>
                      </div>
                    ) : (
                      matchedPatients.map((p) => (
                        <div
                          key={p.id}
                          className="patient-search-item"
                          onClick={() => {
                            handleSelectPatient(p.id)
                            setIsSearchOpen(false)
                          }}
                        >
                          <div className="item-patient-name" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>{p.firstName} {p.lastName}</span>
                            <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '10px', background: 'rgba(11, 129, 133, 0.1)', color: '#0b8185' }}>
                              ID: {p.id}
                            </span>
                          </div>
                          <div className="item-patient-meta">Age: {p.age} yrs &bull; {p.gender}</div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Searchable Dentist Selection */}
          <div className="form-section">
            <label className="booking-section-title">
              <Stethoscope size={16} />
              <span>2. Select Dentist *</span>
            </label>

            <div ref={dentistSearchRef} className="patient-search-container">
              <div className="patient-search-input-wrap">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  className="patient-search-field"
                  placeholder="Search dentist by name, specialty, or chair (e.g. Arun, Priya, Ortho, Chair 1)..."
                  value={isDentistSearchOpen ? dentistSearch : (selectedDoctor ? `${selectedDoctor} (${selectedDentist?.chair || ''})` : '')}
                  onFocus={() => {
                    setIsDentistSearchOpen(true)
                    setDentistSearch('')
                  }}
                  onClick={() => {
                    setIsDentistSearchOpen(true)
                    setDentistSearch('')
                  }}
                  onChange={(e) => {
                    setDentistSearch(e.target.value)
                    setIsDentistSearchOpen(true)
                  }}
                />
              </div>

              {isDentistSearchOpen && (
                <div className="patient-search-dropdown" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {matchedDentists.length === 0 ? (
                    <div className="no-patient-match">
                      <span>No dentist found matching "{dentistSearch}".</span>
                    </div>
                  ) : (
                    matchedDentists.map((d) => (
                      <div
                        key={d.id}
                        className="patient-search-item"
                        onClick={() => {
                          setSelectedDoctor(d.name)
                          setIsDentistSearchOpen(false)
                          setDentistSearch('')
                        }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                      >
                        <div>
                          <div className="item-patient-name" style={{ fontWeight: 600 }}>{d.name}</div>
                          <div className="item-patient-meta" style={{ fontSize: '11.5px', color: '#64748b' }}>
                            {d.specialization} &bull; Hours: {d.shiftStart} - {d.shiftEnd}
                          </div>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'rgba(11, 129, 133, 0.1)', color: '#0b8185' }}>
                          {d.chair}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>


          </div>

          {/* Section 3: Treatment Selection (Duration automatically set) */}
          <div className="form-section">
            <label className="booking-section-title">
              <Stethoscope size={16} />
              <span>3. Treatment & Procedure *</span>
            </label>
            <label className="form-field">
              <span>Treatment Type</span>
              <select
                value={selectedTreatmentId}
                onChange={(e) => setSelectedTreatmentId(e.target.value)}
              >
                {DENTAL_TREATMENTS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.category})
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Section 5: Clinical Notes */}
          <div className="form-section">
            <label className="form-field">
              <span>Appointment Notes & Reason for Visit</span>
              <textarea
                rows={2}
                placeholder="Optional notes: symptoms, patient requests, or pre-visit instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          </div>

          {/* Submit Actions */}
          <div className="form-actions-row">
            <button
              type="button"
              className="btn-cancel"
              onClick={() => navigate('/appointments/calendar')}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-submit-booking"
              disabled={!selectedPatientId || !availability.available}
            >
              <Check size={16} />
              <span>Confirm & Book Appointment</span>
            </button>
          </div>
          </div>

          {/* Right Column: Top Right Calendar, Schedule & Availability */}
          <div className="booking-right-column">
          {/* Section 4: Interactive Calendar, Date & Time */}
          <div className="form-section" style={{ borderBottom: 'none', paddingBottom: 0 }}>
            <label className="booking-section-title">
              <CalendarDays size={16} />
              <span>4. Schedule & Time *</span>
            </label>

            {/* Interactive Booking Calendar & Time Slot Matrix */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Left Column: Visual Interactive Monthly Calendar */}
              <div style={{ border: '1px solid var(--line, #e2e8f0)', borderRadius: '10px', padding: '14px', background: 'var(--surface, #ffffff)' }}>
                {/* Calendar Month Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    style={{ border: '1px solid var(--line, #e2e8f0)', background: 'transparent', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                    title="Previous Month"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <strong style={{ fontSize: '13.5px', color: 'var(--text-strong, #0f172a)' }}>{calendarMonthData.monthName}</strong>
                    <button
                      type="button"
                      onClick={handleTodayMonth}
                      style={{ fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: '4px', border: '1px solid var(--line, #cbd5e1)', background: 'transparent', cursor: 'pointer', color: 'var(--teal-primary, #0b8185)' }}
                    >
                      Today
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleNextMonth}
                    style={{ border: '1px solid var(--line, #e2e8f0)', background: 'transparent', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                    title="Next Month"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Day of Week Header */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted, #64748b)', marginBottom: '8px' }}>
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                    <div key={d}>{d}</div>
                  ))}
                </div>

                {/* Day Cells Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                  {calendarMonthData.days.map((day, idx) => {
                    const isDisabled = day.isPast
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => setSelectedDate(day.dateStr)}
                        style={{
                          height: '32px',
                          display: 'grid',
                          placeItems: 'center',
                          borderRadius: '6px',
                          border: day.isSelected ? '1.5px solid var(--teal-primary, #0b8185)' : day.isToday ? '1px solid var(--teal-primary, #0b8185)' : '1px solid transparent',
                          background: day.isSelected ? 'var(--teal-primary, #0b8185)' : 'transparent',
                          color: day.isSelected ? '#ffffff' : day.isPast ? 'var(--text-faint, #cbd5e1)' : !day.isCurrentMonth ? 'var(--text-faint, #94a3b8)' : 'var(--text, #334155)',
                          fontWeight: day.isSelected || day.isToday ? 700 : 500,
                          fontSize: '12px',
                          cursor: isDisabled ? 'not-allowed' : 'pointer',
                          transition: 'transform 0.15s ease, opacity 0.15s ease, color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease, width 0.15s ease'
                        }}
                      >
                        {day.dayNum}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Right Column: Date Info, Priority, Time Slots and Availability */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <label className="form-field">
                    <span>Selected Date</span>
                    <input
                      type="date"
                      required
                      min={today()}
                      value={selectedDate}
                      onChange={(e) => {
                        setSelectedDate(e.target.value)
                        const d = new Date(e.target.value)
                        setViewMonthDate(new Date(d.getFullYear(), d.getMonth(), 1))
                      }}
                    />
                  </label>

                  <label className="form-field">
                    <span>Visit Priority</span>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as AppointmentPriority)}
                    >
                      <option value="normal">Normal Routine</option>
                      <option value="urgent">Urgent / Pain</option>
                      <option value="emergency">Emergency Immediate</option>
                    </select>
                  </label>
                </div>

                {/* Daily Schedule Preview */}
                <div className="daily-schedule-preview">
                  <h4 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 6px 0', color: 'var(--text-strong, #0f172a)' }}>Daily schedule</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {timeSlots.map((slot) => {
                      const isBooked = appointments.some(
                        (a) => a.doctor === selectedDoctor && a.date === selectedDate && a.time === slot && a.status !== 'cancelled'
                      )
                      const isSelected = selectedTime === slot
                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={isBooked}
                          onClick={() => setSelectedTime(slot)}
                          style={{
                            padding: '5px 9px',
                            fontSize: '11.5px',
                            borderRadius: '5px',
                            border: isSelected ? '1.5px solid var(--teal-primary, #0b8185)' : '1px solid var(--line, #cbd5e1)',
                            background: isSelected ? 'var(--teal-primary, #0b8185)' : isBooked ? 'var(--surface-alt, #f1f5f9)' : 'var(--surface, #ffffff)',
                            color: isSelected ? '#ffffff' : isBooked ? 'var(--text-faint, #94a3b8)' : 'var(--text, #334155)',
                            cursor: isBooked ? 'not-allowed' : 'pointer',
                            fontWeight: isSelected ? 700 : 500
                          }}
                        >
                          {slot} {isBooked ? '(Booked)' : ''}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Conflict / Availability Warning Bar (shown only when unavailable) */}
                {!availability.available && (
                  <div className="availability-warning-box">
                    <AlertTriangle size={18} />
                    <div>
                      <strong>Doctor Unavailable at this Time</strong>
                      <p>{availability.reason}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          </div>
        </form>
      )}
    </div>
  )
}

export default NewAppointmentPage
