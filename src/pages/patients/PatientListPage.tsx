import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, UserRound } from 'lucide-react'
import { useClinicData } from '@/services/clinicStore'

export const PatientListPage: React.FC = () => {
  const { patients } = useClinicData()
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => patients.filter((patient) =>
    `${patient.firstName} ${patient.lastName} ${patient.mobile} ${patient.id}`.toLowerCase().includes(query.toLowerCase())
  ), [patients, query])

  return (
    <section className="clinic-record-page" data-testid="feature-page-pat.list">
      <header className="clinic-record-header">
        <div><span className="clinic-record-eyebrow">PATIENTS</span><h1>Patient records</h1><p>Registered patients in this session: {patients.length}</p></div>
        <Link className="patient-intake-primary" to="/patients/new"><Plus size={15} /> Add patient</Link>
      </header>
      <div className="clinic-record-prototype-note">Session prototype · Records are temporary and clear when the page is refreshed.</div>
      <label className="clinic-record-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, phone, or patient ID" /></label>
      {filtered.length ? (
        <div className="clinic-record-table-wrap"><table className="clinic-record-table"><thead><tr><th>Patient</th><th>Patient ID</th><th>Mobile</th><th>City</th><th /></tr></thead><tbody>
          {filtered.map((patient) => <tr key={patient.id}><td><Link to={`/patients/${patient.id}`} className="clinic-record-patient"><span><UserRound size={16} /></span><strong>{patient.firstName} {patient.lastName}</strong></Link></td><td>{patient.id}</td><td>{patient.countryCode} {patient.mobile}</td><td>{patient.city}</td><td><Link className="clinic-record-open" to={`/patients/${patient.id}`}>Open record</Link></td></tr>)}
        </tbody></table></div>
      ) : (
        <div className="clinic-record-empty"><span><UserRound size={22} /></span><h2>{query ? 'No matching patients' : 'No patient records yet'}</h2><p>{query ? 'Try another name, phone number, or patient ID.' : 'Register a patient to connect them with appointments and care workflows.'}</p>{!query && <Link className="patient-intake-primary" to="/patients/new">Register first patient <Plus size={15} /></Link>}</div>
      )}
    </section>
  )
}

export default PatientListPage
