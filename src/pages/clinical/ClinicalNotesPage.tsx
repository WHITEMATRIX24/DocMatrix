import React, { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FileText, Plus } from 'lucide-react'
import { addClinicalNote, useClinicData } from '@/services/clinicStore'

const today = () => {
  const date = new Date()
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 10)
}

export const ClinicalNotesPage: React.FC = () => {
  const { patients, clinicalNotes } = useClinicData()
  const [params] = useSearchParams()
  const [patientId, setPatientId] = useState(params.get('patientId') || '')
  const [saved, setSaved] = useState(false)
  const patient = patients.find((entry) => entry.id === patientId)
  const notes = clinicalNotes.filter((entry) => !patientId || entry.patientId === patientId)

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    addClinicalNote({
      patientId,
      visitDate: String(form.get('visitDate')),
      complaint: String(form.get('complaint')).trim(),
      findings: String(form.get('findings')).trim(),
      plan: String(form.get('plan')).trim()
    })
    event.currentTarget.reset()
    setPatientId(patientId)
    setSaved(true)
  }

  return <section className="clinic-record-page" data-testid="feature-page-clin.notes">
    <header className="clinic-record-header"><div><span className="clinic-record-eyebrow">CLINICAL</span><h1>Clinical notes</h1><p>Record a visit and keep it connected to the patient profile.</p></div></header>
    <div className="clinic-record-prototype-note">Session prototype · Notes are temporary and clear when the page is refreshed.</div>
    {patients.length ? <form className="clinic-record-form" onSubmit={submit}>
      <div className="clinic-record-form-grid">
        <label>Patient<select name="patientId" value={patientId} onChange={(event) => setPatientId(event.target.value)} required><option value="" disabled>Select patient</option>{patients.map((entry) => <option key={entry.id} value={entry.id}>{entry.firstName} {entry.lastName} · {entry.id}</option>)}</select></label>
        <label>Visit date<input name="visitDate" type="date" defaultValue={today()} required /></label>
        <label className="clinic-record-form-wide">Chief complaint<input name="complaint" placeholder="Reason for visit" required /></label>
        <label className="clinic-record-form-wide">Clinical findings<textarea name="findings" rows={3} placeholder="Examination findings" required /></label>
        <label className="clinic-record-form-wide">Treatment plan<textarea name="plan" rows={3} placeholder="Plan and follow-up" required /></label>
      </div>
      {saved && patient && <p className="clinic-record-success" role="status">Note added to {patient.firstName} {patient.lastName}’s session record.</p>}
      <button className="patient-intake-primary" type="submit"><Plus size={15} /> Save note</button>
    </form> : <div className="clinic-record-empty"><span><FileText size={22} /></span><h2>Register a patient to begin</h2><p>Clinical notes are attached to a patient record.</p><Link className="patient-intake-primary" to="/patients/new">Add patient</Link></div>}
    <article className="clinic-record-card clinic-record-notes"><h2>{patient ? `Notes · ${patient.firstName} ${patient.lastName}` : 'Recent notes'} <span>{notes.length}</span></h2>
      {notes.length ? notes.map((note) => { const owner = patients.find((entry) => entry.id === note.patientId); return <div className="clinic-record-appointment" key={note.id}><div><strong>{note.complaint}</strong><small>{owner ? <Link to={`/patients/${owner.id}`}>{owner.firstName} {owner.lastName}</Link> : 'Patient unavailable'} · {note.visitDate}</small><small>{note.plan}</small></div></div> }) : <p className="clinic-record-muted">No clinical notes yet.</p>}
    </article>
  </section>
}

export default ClinicalNotesPage
