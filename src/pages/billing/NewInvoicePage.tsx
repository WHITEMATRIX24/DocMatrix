import React, { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FilePlus2, Plus } from 'lucide-react'
import { createInvoice, useClinicData } from '@/services/clinicStore'

export const NewInvoicePage: React.FC = () => {
  const { patients, invoices } = useClinicData()
  const [params] = useSearchParams()
  const [patientId, setPatientId] = useState(params.get('patientId') || '')
  const [savedInvoiceId, setSavedInvoiceId] = useState('')
  const patient = patients.find((entry) => entry.id === patientId)

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const invoice = createInvoice({ patientId, description: String(form.get('description')).trim(), amount: Number(form.get('amount')) })
    setSavedInvoiceId(invoice.id)
    event.currentTarget.reset()
    setPatientId('')
  }

  return <section className="clinic-record-page" data-testid="feature-page-bill.invoice-new">
    <header className="clinic-record-header"><div><span className="clinic-record-eyebrow">BILLING</span><h1>Create invoice</h1><p>Link a charge to a registered patient.</p></div><Link className="patient-intake-secondary" to="/billing/invoices">Invoice list</Link></header>
    <div className="clinic-record-prototype-note">Session prototype · Invoices are temporary and clear when the page is refreshed.</div>
    {savedInvoiceId && <p className="clinic-record-success" role="status">Invoice {savedInvoiceId} added to this session. It is not a tax invoice or saved to a billing system.</p>}
    {patients.length ? <form className="clinic-record-form" onSubmit={submit}><div className="clinic-record-form-grid">
      <label>Patient<select name="patientId" value={patientId} onChange={(event) => setPatientId(event.target.value)} required><option value="" disabled>Select patient</option>{patients.map((entry) => <option key={entry.id} value={entry.id}>{entry.firstName} {entry.lastName} · {entry.id}</option>)}</select></label>
      <label>Amount<input name="amount" type="number" min="0.01" step="0.01" placeholder="0.00" required /></label>
      <label className="clinic-record-form-wide">Description<input name="description" placeholder="Treatment or service" required /></label>
    </div>
    {patient && <p className="clinic-record-muted">This charge will be linked to {patient.firstName} {patient.lastName}.</p>}
    <button className="patient-intake-primary" type="submit"><Plus size={15} /> Add invoice</button>
    </form> : <div className="clinic-record-empty"><span><FilePlus2 size={22} /></span><h2>Register a patient to begin</h2><p>Invoices are linked to patient records.</p><Link className="patient-intake-primary" to="/patients/new">Add patient</Link></div>}
    <article className="clinic-record-card clinic-record-notes"><h2>Session invoices <span>{invoices.length}</span></h2>{invoices.length ? invoices.map((invoice) => { const owner = patients.find((entry) => entry.id === invoice.patientId); return <div className="clinic-record-appointment" key={invoice.id}><div><strong>{invoice.description}</strong><small>{owner ? <Link to={`/patients/${owner.id}`}>{owner.firstName} {owner.lastName}</Link> : 'Patient unavailable'} · {invoice.id}</small></div><strong>₹{invoice.amount.toFixed(2)} · {invoice.status}</strong></div> }) : <p className="clinic-record-muted">No invoices created in this session.</p>}</article>
  </section>
}

export default NewInvoicePage
