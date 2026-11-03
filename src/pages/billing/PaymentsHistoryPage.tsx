import React, { useMemo, useState } from 'react'
import { Download, ListOrdered, Search } from 'lucide-react'
import { useClinicData, type PaymentMode } from '@/services/clinicStore'
import { InvoiceDrawer, inr, localDate, patientLabel, prettyDate, usePayments } from './BillingShared'

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`

export const PaymentsHistoryPage: React.FC = () => {
  const { invoices, patients } = useClinicData()
  const payments = usePayments(invoices)
  const [query, setQuery] = useState('')
  const [mode, setMode] = useState<'All' | PaymentMode>('All')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return payments.filter((p) => {
      const day = localDate(p.receivedAt)
      if (mode !== 'All' && p.mode !== mode) return false
      if (from && day < from) return false
      if (to && day > to) return false
      if (!q) return true
      return [p.invoiceId, p.reference || '', patientLabel(patients, p.patientId)].some((v) => v.toLowerCase().includes(q))
    })
  }, [payments, patients, query, mode, from, to])

  const total = rows.reduce((s, p) => s + p.amount, 0)

  const exportCsv = () => {
    const lines = [
      ['Date', 'Patient', 'Invoice', 'Mode', 'Reference', 'Amount'].map(csvCell).join(','),
      ...rows.map((p) => [localDate(p.receivedAt), patientLabel(patients, p.patientId), p.invoiceId, p.mode, p.reference || '', p.amount].map(csvCell).join(',')),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `payments-${from || 'all'}-${to || localDate()}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const open = invoices.find((inv) => inv.id === openId)

  return (
    <div className="bill-page" data-testid="feature-page-bill.payments">
      <div className="bill-toolbar">
        <label className="bill-search">
          <Search size={15} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search patient, invoice or UPI/card ref" />
        </label>
        <div className="bill-segment" role="group" aria-label="Filter by mode">
          {(['All', 'Cash', 'Card', 'UPI'] as const).map((m) => (
            <button key={m} className={mode === m ? 'is-on' : ''} onClick={() => setMode(m)}>{m}</button>
          ))}
        </div>
        <div className="bill-range">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
          <span>to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
        </div>
        <button className="patient-intake-secondary" onClick={exportCsv} disabled={!rows.length}><Download size={15} /> CSV</button>
      </div>

      <p className="bill-summary-line">{rows.length} payment{rows.length === 1 ? '' : 's'} · <strong>{inr(total)}</strong></p>

      {rows.length ? (
        <div className="bill-table-wrap">
          <table className="bill-table">
            <thead><tr><th>Date</th><th>Patient</th><th>Invoice</th><th>Mode</th><th>Reference</th><th className="r">Amount</th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id + p.invoiceId}>
                  <td>{prettyDate(p.receivedAt)}</td>
                  <td>{patientLabel(patients, p.patientId)}</td>
                  <td><button className="bill-link" onClick={() => setOpenId(p.invoiceId)}>{p.invoiceId}</button></td>
                  <td><span className={`bill-pill bill-pill-mode`}>{p.mode}</span></td>
                  <td className="bill-muted">{p.reference || '—'}</td>
                  <td className="r"><strong>{inr(p.amount)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bill-empty">
          <ListOrdered size={22} />
          <h2>No payments found</h2>
          <p>{payments.length ? 'Try a different filter or date range.' : 'Payments appear here once you collect against an invoice.'}</p>
        </div>
      )}

      {open && <InvoiceDrawer invoice={open} patient={patients.find((p) => p.id === open.patientId)} onClose={() => setOpenId(null)} />}
    </div>
  )
}

export default PaymentsHistoryPage
