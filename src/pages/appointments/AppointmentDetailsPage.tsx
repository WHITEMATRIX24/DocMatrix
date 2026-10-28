import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Search, UserRound } from 'lucide-react'
import { useClinicData } from '@/services/clinicStore'

export const AppointmentDetailsPage: React.FC = () => {
  const { patients, appointments } = useClinicData()
  const [query, setQuery] = useState('')
  const [date, setDate] = useState('')
  const [doctor, setDoctor] = useState('')
  const doctors = Array.from(new Set(appointments.map((appointment) => appointment.doctor))).sort()
  const rows = useMemo(() => appointments
    .filter((appointment) => !date || appointment.date === date)
    .filter((appointment) => !doctor || appointment.doctor === doctor)
    .filter((appointment) => {
      const patient = patients.find((entry) => entry.id === appointment.patientId)
      const text = `${patient?.firstName || ''} ${patient?.lastName || ''} ${patient?.id || ''} ${appointment.visitType} ${appointment.doctor} ${appointment.id}`
      return text.toLowerCase().includes(query.toLowerCase())
    })
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)), [appointments, patients, date, doctor, query])

  return <section className="clinic-record-page" data-testid="feature-page-appt.details-list">
    <header className="clinic-record-header"><div><span className="clinic-record-eyebrow">APPOINTMENTS</span><h1>Appointment details</h1><p>Bookings connected to patient records in this session.</p></div><Link to="/appointments/new" className="patient-intake-primary"><CalendarDays size={15} /> Book appointment</Link></header>
    <div className="clinic-record-prototype-note">Session prototype · Appointment and patient data clears when the app is refreshed.</div>
    <div className="appointment-details-filters">
      <label className="clinic-record-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patient, doctor, visit, or booking ID" /></label>
      <label className="appointment-details-filter"><span>Date</span><input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
      <label className="appointment-details-filter"><span>Doctor</span><select value={doctor} onChange={(event) => setDoctor(event.target.value)}><option value="">All doctors</option>{doctors.map((entry) => <option key={entry} value={entry}>{entry}</option>)}</select></label>
    </div>
    {rows.length ? <div className="clinic-record-table-wrap"><table className="clinic-record-table appointment-details-table"><thead><tr><th>Patient</th><th>Date & time</th><th>Doctor</th><th>Visit type</th><th>Booking ID</th><th /></tr></thead><tbody>{rows.map((appointment) => {
      const patient = patients.find((entry) => entry.id === appointment.patientId)
      return <tr key={appointment.id}><td>{patient ? <Link className="clinic-record-patient" to={`/patients/${patient.id}`}><span><UserRound size={14} /></span><strong>{patient.firstName} {patient.lastName}</strong></Link> : 'Patient unavailable'}</td><td>{appointment.date}<small className="appointment-details-time">{appointment.time}</small></td><td>{appointment.doctor}</td><td>{appointment.visitType}</td><td>{appointment.id}</td><td><Link className="clinic-record-open" to={`/appointments/${appointment.id}`}>View details</Link></td></tr>
    })}</tbody></table></div> : <div className="clinic-record-empty"><span><CalendarDays size={22} /></span><h2>{appointments.length ? 'No appointments match these filters' : 'No appointment details yet'}</h2><p>{appointments.length ? 'Change the search or filters to view other bookings.' : 'Book an appointment for a registered patient to see its details here.'}</p>{!appointments.length && <Link to="/appointments/new" className="patient-intake-primary">Book appointment</Link>}</div>}
  </section>
}

export default AppointmentDetailsPage
