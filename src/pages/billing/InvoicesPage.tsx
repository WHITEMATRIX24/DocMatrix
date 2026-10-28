import React from 'react'
import { Link } from 'react-router-dom'
import { FileText, Plus } from 'lucide-react'
import { useClinicData } from '@/services/clinicStore'

export const InvoicesPage: React.FC = () => {
  const { patients, invoices } = useClinicData()
  return <section className="clinic-record-page" data-testid="feature-page-bill.invoices">
    <header className="clinic-record-header"><div><span className="clinic-record-eyebrow">BILLING</span><h1>Invoices</h1><p>Charges created in the current app session.</p></div><Link to="/billing/invoices/new" className="patient-intake-primary"><Plus size={15} /> Create invoice</Link></header>
    <div className="clinic-record-prototype-note">Session prototype · This is not a connected billing or tax system.</div>
    {invoices.length ? <div className="clinic-record-table-wrap"><table className="clinic-record-table"><thead><tr><th>Invoice</th><th>Patient</th><th>Description</th><th>Amount</th><th>Status</th></tr></thead><tbody>{invoices.map((invoice) => { const patient = patients.find((entry) => entry.id === invoice.patientId); return <tr key={invoice.id}><td>{invoice.id}</td><td>{patient ? <Link to={`/patients/${patient.id}`}>{patient.firstName} {patient.lastName}</Link> : '—'}</td><td>{invoice.description}</td><td>₹{invoice.amount.toFixed(2)}</td><td><span className="clinic-record-status">{invoice.status}</span></td></tr> })}</tbody></table></div> : <div className="clinic-record-empty"><span><FileText size={22} /></span><h2>No invoices yet</h2><p>Create an invoice from a patient profile or start a new invoice.</p><Link className="patient-intake-primary" to="/billing/invoices/new">Create invoice <Plus size={15} /></Link></div>}
  </section>
}

export default InvoicesPage
