import React from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Clock, FileText, UserRound } from 'lucide-react'
import { useClinicData } from '@/services/clinicStore'

export const AppointmentDetailPage: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const { patients, appointments } = useClinicData()
  const appointment = appointments.find((entry) => entry.id === id)
  const patient = patients.find((entry) => entry.id === appointment?.patientId)

  if (!appointment || !patient) return <section className="appointment-simple-panel" data-testid={`record-not-found-${id || 'appointment'}`}><h2>Appointment not found</h2><p>This session has no booking with reference {id}.</p><button className="appointment-detail-back" onClick={() => navigate('/appointments/details')}><ArrowLeft size={14} /> Appointment details</button></section>

  return <section className="appointment-simple-panel appointment-detail-panel" data-testid="feature-page-appt.detail">
    <div className="appointment-simple-heading"><div className="appointment-simple-heading-icon"><CalendarDays size={17} /></div><div><h2>Appointment details</h2><p>Reference {appointment.id}</p></div><span className="appointment-detail-status">Booked this session</span></div>
    <div className="appointment-detail-grid">
      <div><span><UserRound size={14} /> Patient</span><strong><Link to={`/patients/${patient.id}`}>{patient.firstName} {patient.lastName}</Link></strong></div>
      <div><span><CalendarDays size={14} /> Date</span><strong>{appointment.date}</strong></div>
      <div><span><Clock size={14} /> Time</span><strong>{appointment.time}</strong></div>
      <div><span>Doctor</span><strong>{appointment.doctor}</strong></div>
      <div><span>Visit type</span><strong>{appointment.visitType}</strong></div>
    </div>
    <nav className="clinic-record-actions" aria-label="Continue patient workflow"><Link to={`/patients/${patient.id}`}><UserRound size={15} /> Patient profile</Link><Link to={`/clinical/notes?patientId=${patient.id}`}><FileText size={15} /> Add clinical note</Link></nav>
    <button className="appointment-detail-back" onClick={() => navigate('/appointments/details')}><ArrowLeft size={14} /> All appointment details</button>
  </section>
}

export default AppointmentDetailPage
