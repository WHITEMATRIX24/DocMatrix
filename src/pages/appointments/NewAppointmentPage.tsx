import React, { useState, useMemo } from 'react'
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
  Check
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

  const selectedPatient = patients.find((p) => p.id === selectedPatientId)
  const selectedDentist = DENTISTS.find((d) => d.name === selectedDoctor)
  const selectedTreatment = DENTAL_TREATMENTS.find((t) => t.id === selectedTreatmentId)

  // Real-time availability check
  const availability = useMemo(() => {
    const duration = selectedTreatment?.defaultDurationMinutes || 30
    return checkDentistAvailability(selectedDoctor, selectedDate, selectedTime, duration)
  }, [selectedDoctor, selectedDate, selectedTime, selectedTreatment])

  const handleSelectPatient = (patientId: string) => {
    setSelectedPatientId(patientId)
    setPatientSearch('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPatientId) return
    if (!availability.available) return

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

    setBookingSuccess(newAppt.id)
  }

  return (
    <div className="new-appointment-page" data-testid="feature-page-appt.new">
      <div className="page-header-row">
        <div>
          <h2>Book Dental Appointment</h2>
          <p>Schedule a confirmed visit with doctor availability check and conflict prevention.</p>
        </div>
        <Link to="/appointments/calendar" className="btn-back-calendar">
          View Calendar
        </Link>
      </div>

      {bookingSuccess ? (
        <div className="booking-success-card">
          <CheckCircle2 size={40} className="success-icon" />
          <h3>Appointment Confirmed!</h3>
          <p>Booking reference <strong>{bookingSuccess}</strong> has been registered successfully.</p>
          <div className="success-meta-box">
            <div>Patient: <strong>{selectedPatient?.firstName} {selectedPatient?.lastName}</strong></div>
            <div>Doctor: <strong>{selectedDoctor}</strong> ({selectedDentist?.chair})</div>
            <div>Schedule: <strong>{selectedDate} at {selectedTime}</strong></div>
            <div>Procedure: <strong>{selectedTreatment?.name}</strong></div>
          </div>
          <div className="success-action-row">
            <button className="btn-book-another" onClick={() => setBookingSuccess(null)}>
              Book Another Appointment
            </button>
            <Link to={`/appointments/${bookingSuccess}`} className="btn-view-booking">
              View Booking Details
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="booking-form-card">
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
              <div className="patient-search-container">
                <div className="patient-search-input-wrap">
                  <Search size={16} className="search-icon" />
                  <input
                    type="text"
                    className="patient-search-field"
                    placeholder="Search by Patient Name or ID Number (e.g., Aarav, PAT-1001, 1001)..."
                    value={patientSearch}
                    onFocus={() => setIsSearchOpen(true)}
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

                <div className="search-helper-text">
                  Tip: Search registered patients by <strong>Name</strong> or <strong>ID Number</strong> (e.g., PAT-1001 or 1001).
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Dentist Selection */}
          <div className="form-section">
            <label className="booking-section-title">
              <Stethoscope size={16} />
              <span>2. Select Dentist *</span>
            </label>
            <div className="dentist-radio-grid">
              {DENTISTS.map((dentist) => {
                const isSelected = selectedDoctor === dentist.name
                return (
                  <div
                    key={dentist.id}
                    className={`dentist-select-card ${isSelected ? 'is-selected' : ''}`}
                    onClick={() => setSelectedDoctor(dentist.name)}
                  >
                    <div className="dentist-card-header">
                      <strong>{dentist.name}</strong>
                      <span className="dentist-chair-tag">{dentist.chair}</span>
                    </div>
                    <span className="dentist-specialty">{dentist.specialization}</span>
                    <span className="dentist-hours">Hours: {dentist.shiftStart} - {dentist.shiftEnd}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Section 3: Treatment Selection (Duration automatically set) */}
          <div className="form-section">
            <label className="booking-section-title">
              <Stethoscope size={16} />
              <span>3. Treatment & Procedure *</span>
            </label>
            <div className="form-row-2">
              <label className="form-field">
                <span>Treatment Type</span>
                <select
                  value={selectedTreatmentId}
                  onChange={(e) => setSelectedTreatmentId(e.target.value)}
                >
                  {DENTAL_TREATMENTS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.category}) &bull; ₹{t.standardFee}
                    </option>
                  ))}
                </select>
              </label>

              <div className="treatment-preview-chip">
                <span>Estimated Time & Fee:</span>
                <strong>{selectedTreatment?.defaultDurationMinutes} mins &bull; ₹{selectedTreatment?.standardFee}</strong>
              </div>
            </div>
          </div>

          {/* Section 4: Date, Time & Priority (Duration bar is removed per requirement) */}
          <div className="form-section">
            <label className="booking-section-title">
              <CalendarDays size={16} />
              <span>4. Schedule & Time *</span>
            </label>

            <div className="form-row-3">
              <label className="form-field">
                <span>Appointment Date</span>
                <input
                  type="date"
                  required
                  min={today()}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </label>

              <label className="form-field">
                <span>Time Slot</span>
                <select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                >
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
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
            <div className="daily-schedule-preview" style={{ marginTop: '12px' }}>
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
                        padding: '4px 8px',
                        fontSize: '11.5px',
                        borderRadius: '4px',
                        border: isSelected ? '1.5px solid var(--teal-primary, #0b8185)' : '1px solid var(--line, #cbd5e1)',
                        background: isSelected ? 'var(--teal-tint, rgba(11, 129, 133, 0.12))' : isBooked ? 'var(--surface-alt, #f1f5f9)' : 'var(--surface, #ffffff)',
                        color: isBooked ? 'var(--text-faint, #94a3b8)' : 'var(--text, #334155)',
                        cursor: isBooked ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {slot} {isBooked ? '(Booked)' : ''}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Conflict / Availability Warning Bar */}
            {!availability.available ? (
              <div className="availability-warning-box">
                <AlertTriangle size={18} />
                <div>
                  <strong>Doctor Unavailable at this Time</strong>
                  <p>{availability.reason}</p>
                </div>
              </div>
            ) : (
              <div className="availability-success-box">
                <Check size={16} />
                <span>Slot is available with {selectedDoctor} on {selectedDentist?.chair}.</span>
              </div>
            )}
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
        </form>
      )}
    </div>
  )
}

export default NewAppointmentPage
