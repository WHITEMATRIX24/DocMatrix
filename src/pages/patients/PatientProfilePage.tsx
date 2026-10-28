import React from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarPlus, FileText, Receipt, UserRound } from 'lucide-react'
import { useClinicData } from '@/services/clinicStore'

export const PatientProfilePage: React.FC = () => {
  const { id } = useParams()
  const { patients, appointments, clinicalNotes, invoices } = useClinicData()
  const patient = patients.find((record) => record.id === id)
  const patientAppointments = appointments.filter((appointment) => appointment.patientId === id)
  const patientNotes = clinicalNotes.filter((note) => note.patientId === id)
  const patientInvoices = invoices.filter((invoice) => invoice.patientId === id)

  if (!patient) return <section className="clinic-record-empty"><span><UserRound size={22} /></span><h2>Patient record not found</h2><p>This session has no patient with ID {id}. Register a patient or return to the patient list.</p><Link className="patient-intake-secondary" to="/patients/list"><ArrowLeft size={14} /> Patient list</Link></section>

  return (
    <section className="clinic-record-page" data-testid="feature-page-pat.profile">
      <Link className="clinic-record-back" to="/patients/list"><ArrowLeft size={14} /> Patient records</Link>
      <header className="clinic-record-profile-header"><span className="clinic-record-avatar"><UserRound size={24} /></span><div><span className="clinic-record-eyebrow">PATIENT PROFILE · {patient.id}</span><h1>{patient.firstName} {patient.lastName}</h1><p>{patient.mobile} {patient.email && `· ${patient.email}`} · {patient.city}</p></div></header>
      <div className="clinic-record-prototype-note">Session prototype · This patient record is available until the page is refreshed.</div>
      <nav className="clinic-record-actions" aria-label="Patient workflows">
        <Link to={`/appointments/new?patientId=${patient.id}`}><CalendarPlus size={16} /> Book appointment</Link>
        <Link to={`/clinical/notes?patientId=${patient.id}`}><FileText size={16} /> Clinical notes</Link>
        <Link to={`/billing/invoices/new?patientId=${patient.id}`}><Receipt size={16} /> Create invoice</Link>
      </nav>
      <div className="clinic-record-grid">
        <article className="clinic-record-card"><h2>Contact & details</h2><dl><div><dt>Age / date of birth</dt><dd>{patient.age ? `${patient.age} years` : patient.dateOfBirth || '—'}</dd></div><div><dt>Gender</dt><dd>{patient.gender}</dd></div><div><dt>Language</dt><dd>{patient.language || '—'}</dd></div><div><dt>Address</dt><dd>{[patient.address, patient.city, patient.state, patient.postalCode].filter(Boolean).join(', ') || '—'}</dd></div><div><dt>Emergency contact</dt><dd>{patient.emergencyName} · {patient.emergencyPhone} {patient.relationship && `· ${patient.relationship}`}</dd></div></dl></article>
        <article className="clinic-record-card"><h2>Medical history</h2><dl><div><dt>Allergies</dt><dd>{patient.allergies === 'yes' ? patient.allergiesDetails : patient.allergies}</dd></div><div><dt>Current medications</dt><dd>{patient.medications === 'yes' ? patient.medicationsDetails : patient.medications}</dd></div><div><dt>Medical conditions</dt><dd>{patient.conditions === 'yes' ? patient.conditionsDetails : patient.conditions}</dd></div></dl></article>
        <article className="clinic-record-card clinic-record-card-wide"><h2>Appointments <span>{patientAppointments.length}</span></h2>{patientAppointments.length ? patientAppointments.map((appointment) => <div className="clinic-record-appointment" key={appointment.id}><div><strong>{appointment.visitType}</strong><small>{appointment.date} at {appointment.time} · {appointment.doctor}</small></div><Link to={`/appointments/${appointment.id}`}>View</Link></div>) : <p className="clinic-record-muted">No appointments linked to this patient yet.</p>}</article>
        <article className="clinic-record-card clinic-record-card-wide"><h2>Clinical notes <span>{patientNotes.length}</span></h2>{patientNotes.length ? patientNotes.map((note) => <div className="clinic-record-appointment" key={note.id}><div><strong>{note.complaint}</strong><small>{note.visitDate} · {note.plan}</small></div></div>) : <p className="clinic-record-muted">No clinical notes yet.</p>}</article>
        <article className="clinic-record-card clinic-record-card-wide"><h2>Invoices <span>{patientInvoices.length}</span></h2>{patientInvoices.length ? patientInvoices.map((invoice) => <div className="clinic-record-appointment" key={invoice.id}><div><strong>{invoice.description}</strong><small>{invoice.id} · {invoice.status}</small></div><strong>₹{invoice.amount.toFixed(2)}</strong></div>) : <p className="clinic-record-muted">No invoices linked to this patient yet.</p>}</article>
      </div>
    </section>
  )
}

export default PatientProfilePage
