import React, { useMemo, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { FileText, Plus, Search } from 'lucide-react'
import { invoiceBalance, useClinicData, type InvoiceRecord } from '@/services/clinicStore'
import { InvoiceDrawer, StatusPill, findPatient, inr, patientLabel, prettyDate } from './BillingShared'

const FILTERS: Array<'All' | InvoiceRecord['status']> = ['All', 'Unpaid', 'Partial', 'Paid']

export const InvoicesPage: React.FC = () => {
  const { patients, invoices } = useClinicData()
  const [params] = useSearchParams()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All')
  const [openId, setOpenId] = useState<string | null>(params.get('open'))

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return invoices.filter((inv) => {
      if (filter !== 'All' && inv.status !== filter) return false
      if (!q) return true
      return [inv.id, inv.description, patientLabel(patients, inv.patientId)].some((v) => v.toLowerCase().includes(q))
    })
  }, [invoices, patients, query, filter])

  // "Generate invoice" links from appointments land here with a patient preselected: send them to the composer.
  if (params.get('patientId')) {
    return <Navigate to={`/billing/invoices/new?${params.toString()}`} replace />
  }

  const open = invoices.find((inv) => inv.id === openId)

  return (
    <div className="bill-page" data-testid="feature-page-bill.invoices">
      <div className="bill-toolbar">
        <label className="bill-search">
          <Search size={15} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search patient, invoice no. or service" />
        </label>
        <div className="bill-segment" role="group" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button key={f} className={filter === f ? 'is-on' : ''} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {rows.length ? (
        <div className="bill-table-wrap">
          <table className="bill-table">
            <thead>
              <tr><th>Invoice</th><th>Patient</th><th>Services</th><th className="r">Total</th><th className="r">Balance</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rows.map((inv) => (
                <tr key={inv.id} className="bill-row-click" onClick={() => setOpenId(inv.id)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpenId(inv.id)}>
                  <td><strong>{inv.id}</strong><small className="bill-sub">{prettyDate(inv.createdAt)}</small></td>
                  <td>{patientLabel(patients, inv.patientId)}</td>
                  <td className="bill-ellipsis">{inv.description}</td>
                  <td className="r">{inr(inv.amount)}</td>
                  <td className={`r${invoiceBalance(inv) > 0 ? ' bill-due' : ''}`}>{inr(invoiceBalance(inv))}</td>
                  <td><StatusPill status={inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bill-empty">
          <FileText size={22} />
          <h2>{invoices.length ? 'No invoices match' : 'No invoices yet'}</h2>
          <p>{invoices.length ? 'Try a different search or filter.' : 'Bill a patient for treatment to see it here.'}</p>
          {!invoices.length && <Link className="patient-intake-primary" to="/billing/invoices/new"><Plus size={15} /> New invoice</Link>}
        </div>
      )}

      {open && <InvoiceDrawer invoice={open} patient={findPatient(patients, open.patientId)} onClose={() => setOpenId(null)} onDone={() => setOpenId(null)} />}
    </div>
  )
}

export default InvoicesPage
