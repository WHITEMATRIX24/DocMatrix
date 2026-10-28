import React, { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, UserRound } from 'lucide-react'
import { bookAppointment, useClinicData, type AppointmentRecord } from '@/services/clinicStore'

const today = () => {
  const current = new Date()
  current.setMinutes(current.getMinutes() - current.getTimezoneOffset())
  return current.toISOString().slice(0, 10)
}
const dateKey = (value: Date) => {
  const date = new Date(value)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 10)
}
const visitTypes = ['Consultation', 'Check-up', 'Follow-up', 'Cleaning', 'Dental treatment', 'Other']
const timeSlots = Array.from({ length: 17 }, (_, index) => {
  const mins = 9 * 60 + index * 30
  return `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
})
const displayTime = (value: string) => {
  const [hour, minute] = value.split(':').map(Number)
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export const NewAppointmentPage: React.FC = () => {
  const { patients, appointments } = useClinicData()
  const [searchParams] = useSearchParams()
  const [date, setDate] = useState(today)
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const selected = new Date(`${today()}T12:00:00`)
    return new Date(selected.getFullYear(), selected.getMonth(), 1)
  })
  const [patientId, setPatientId] = useState(searchParams.get('patientId') || '')
  const [doctors, setDoctors] = useState<string[]>([])
  const [doctor, setDoctor] = useState('')
  const [doctorDraft, setDoctorDraft] = useState('')
  const [addingDoctor, setAddingDoctor] = useState(false)
  const [visitType, setVisitType] = useState('')
  const [customVisitType, setCustomVisitType] = useState('')
  const [time, setTime] = useState('')
  const [bookedAppointment, setBookedAppointment] = useState<AppointmentRecord | null>(null)
  const [notice, setNotice] = useState('')

  const selectedPatient = patients.find((patient) => patient.id === patientId)
  const bookedPatient = patients.find((patient) => patient.id === bookedAppointment?.patientId)
  const dayAppointments = appointments.filter((appointment) => appointment.date === date)
  const bookedTimes = new Set(dayAppointments.filter((appointment) => appointment.doctor === doctor).map((appointment) => appointment.time))
  const first = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)
  const calendarStart = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay())
  const monthDays = Array.from({ length: 42 }, (_, index) => new Date(calendarStart.getFullYear(), calendarStart.getMonth(), calendarStart.getDate() + index))
  const todayDate = new Date(`${today()}T12:00:00`)
  const previousMonthDisabled = visibleMonth <= new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)

  const selectDate = (value: string) => {
    setDate(value)
    setTime('')
    const selected = new Date(`${value}T12:00:00`)
    setVisibleMonth(new Date(selected.getFullYear(), selected.getMonth(), 1))
  }

  const addDoctor = () => {
    const name = doctorDraft.trim()
    if (!name) return
    if (!doctors.includes(name)) setDoctors((current) => [...current, name])
    setDoctor(name)
    setDoctorDraft('')
    setAddingDoctor(false)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const patient = patients.find((item) => item.id === patientId)
    if (!patient) {
      setNotice('Register a patient before booking this appointment.')
      return
    }
    if (!doctor || !time || !visitType || (visitType === 'Other' && !customVisitType.trim())) return
    if (bookedTimes.has(time)) {
      setNotice('That doctor already has an appointment at this time. Choose another slot.')
      return
    }
    const appointment = bookAppointment({ patientId: patient.id, doctor, visitType: visitType === 'Other' ? customVisitType.trim() : visitType, date, time })
    setBookedAppointment(appointment)
    setNotice('')
  }

  return (
    <section className="appointment-booking-page" data-testid="feature-page-appt.new">
      <header className="appointment-booking-heading"><div><h2>Book appointment</h2><p>Choose a patient, provider, visit type, date, and available time.</p></div></header>
      {bookedAppointment && bookedPatient && <div className="clinic-record-prototype-note clinic-record-booking-confirmed" role="status"><CheckCircle2 size={16} /> Appointment added to this session · {bookedAppointment.id} · <Link to={`/patients/${bookedPatient.id}`}>Open {bookedPatient.firstName}’s record</Link></div>}

      <div className="appointment-booking-layout">
        <form className="appointment-booking-form" onSubmit={handleSubmit}>
          <label className="appointment-booking-field"><span>Patient</span><select name="patientId" value={patientId} onChange={(event) => setPatientId(event.target.value)} required disabled={!patients.length}><option value="" disabled>{patients.length ? 'Select registered patient' : 'No registered patients yet'}</option>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.firstName} {patient.lastName} · {patient.id}</option>)}</select></label>
          {!patients.length && <p className="appointment-booking-field-hint">Appointments must link to a patient. <Link to="/patients/new">Register a patient</Link>.</p>}
          {selectedPatient && <Link className="clinic-record-inline-link" to={`/patients/${selectedPatient.id}`}><UserRound size={14} /> View patient record</Link>}

          <div className="appointment-booking-inline-fields">
            <label className="appointment-booking-field"><span>Doctor</span><select value={doctor} onChange={(event) => { if (event.target.value === '__add__') { setAddingDoctor(true); setDoctor('') } else setDoctor(event.target.value); setTime('') }} required><option value="" disabled>Select doctor</option>{doctors.map((name) => <option key={name} value={name}>{name}</option>)}<option value="__add__">+ Add doctor</option></select></label>
            <label className="appointment-booking-field"><span>Visit type</span><select value={visitType} onChange={(event) => setVisitType(event.target.value)} required><option value="" disabled>Select visit type</option>{visitTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          </div>
          {addingDoctor && <div className="appointment-booking-add-option"><label className="appointment-booking-field"><span>Doctor name</span><input value={doctorDraft} onChange={(event) => setDoctorDraft(event.target.value)} placeholder="Enter doctor name" autoFocus /></label><button type="button" className="appointment-booking-secondary" onClick={addDoctor} disabled={!doctorDraft.trim()}>Add doctor</button></div>}
          {visitType === 'Other' && <label className="appointment-booking-field"><span>Visit type details</span><input value={customVisitType} onChange={(event) => setCustomVisitType(event.target.value)} placeholder="Enter visit type" required /></label>}

          <div className="appointment-booking-inline-fields">
            <label className="appointment-booking-field"><span>Date</span><input type="date" name="date" value={date} min={today()} onChange={(event) => selectDate(event.target.value)} required /></label>
            <label className="appointment-booking-field"><span>Time</span><select name="time" value={time} onChange={(event) => setTime(event.target.value)} required><option value="" disabled>Select available time</option>{timeSlots.map((slot) => <option key={slot} value={slot} disabled={bookedTimes.has(slot)}>{displayTime(slot)}{bookedTimes.has(slot) ? ' · Booked' : ''}</option>)}</select></label>
          </div>
          {notice && <p className="appointment-booking-empty" role="alert">{notice}</p>}
          <button type="submit" className="appointment-booking-primary" disabled={!patients.length || !doctor || !time || bookedTimes.has(time) || !visitType || (visitType === 'Other' && !customVisitType.trim())}>Book appointment</button>
        </form>

        <aside className="appointment-booking-calendar" aria-label="Schedule for selected date">
          <div className="appointment-booking-calendar-heading"><div className="appointment-booking-calendar-icon"><CalendarDays size={17} /></div><div><h3>Daily schedule</h3><p>{date === today() ? 'Today' : new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</p></div></div>
          <div className="appointment-booking-month">
            <div className="appointment-booking-month-heading"><strong>{visibleMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong><div><button type="button" aria-label="Previous month" disabled={previousMonthDisabled} onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}><ChevronLeft size={15} /></button><button type="button" aria-label="Next month" onClick={() => setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}><ChevronRight size={15} /></button></div></div>
            <div className="appointment-booking-calendar-grid" role="group" aria-label="Choose appointment date">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((weekday) => <span className="appointment-booking-weekday" key={weekday}>{weekday}</span>)}
              {monthDays.map((day) => {
                const key = dateKey(day)
                const hasAppointments = appointments.some((appointment) => appointment.date === key)
                return <button type="button" key={key} disabled={key < today()} aria-label={`${day.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}${hasAppointments ? ', has appointments' : ''}`} aria-pressed={date === key} className={`appointment-booking-calendar-day${day.getMonth() === visibleMonth.getMonth() ? '' : ' is-outside'}${date === key ? ' is-selected' : ''}${hasAppointments ? ' has-appointments' : ''}`} onClick={() => selectDate(key)}>{day.getDate()}{hasAppointments && <i />}</button>
              })}
            </div>
            <div className="appointment-booking-calendar-legend"><i /> Session appointments</div>
          </div>
          {dayAppointments.length ? <div className="appointment-booking-agenda">{dayAppointments.map((appointment) => {
            const patient = patients.find((record) => record.id === appointment.patientId)
            return <div className="appointment-booking-agenda-row" key={appointment.id}><span className="appointment-booking-agenda-time">{displayTime(appointment.time)}</span><div><strong>{patient ? <Link to={`/patients/${patient.id}`}>{patient.firstName} {patient.lastName}</Link> : 'Patient unavailable'}</strong><span>{appointment.visitType} · {appointment.doctor}</span><Link className="clinic-record-open" to={`/appointments/${appointment.id}`}>Appointment details</Link></div></div>
          })}</div> : <p className="appointment-booking-empty">No appointments for this date in the current session.</p>}
          <p className="appointment-booking-calendar-note">Session prototype · Bookings clear when the page is refreshed.</p>
        </aside>
      </div>
    </section>
  )
}

export default NewAppointmentPage
