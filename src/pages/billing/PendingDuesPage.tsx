import React, { useMemo, useState } from 'react'
import { CheckCircle2, Phone } from 'lucide-react'
import { invoiceBalance, invoicePaidAmount, useClinicData } from '@/services/clinicStore'
import { InvoiceDrawer, PaymentDialog, findPatient, inr, localDate, patientLabel, prettyDate } from './BillingShared'

const BUCKETS = [
  { id: 'all', label: 'All', min: 0, max: Infinity },
  { id: '0-30', label: '0–30 days', min: 0, max: 30 },
  { id: '31-60', label: '31–60 days', min: 31, max: 60 },
  { id: '60+', label: '60+ days', min: 61, max: Infinity },
] as const

const ageInDays = (iso: string) => {
  const start = new Date(`${localDate(iso)}T00:00:00`).getTime()
  const now = new Date(`${localDate()}T00:00:00`).getTime()
  return Math.max(0, Math.round((now - start) / 86400000))
}

export const PendingDuesPage: React.FC = () => {
  const { invoices, patients } = useClinicData()
  const [bucket, setBucket] = useState<(typeof BUCKETS)[number]['id']>('all')
  const [payingId, setPayingId] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const open = useMemo(() => invoices.filter((inv) => invoiceBalance(inv) > 0).map((inv) => ({ inv, age: ageInDays(inv.createdAt) })), [invoices])

  const bucketTotals = useMemo(
    () =>
      Object.fromEntries(
        BUCKETS.map((b) => [b.id, open.filter((r) => r.age >= b.min && r.age <= b.max).reduce((s, r) => s + invoiceBalance(r.inv), 0)])
      ) as Record<string, number>,
    [open]
  )

  const active = BUCKETS.find((b) => b.id === bucket)!
  const rows = open.filter((r) => r.age >= active.min && r.age <= active.max).sort((a, b) => b.age - a.age)

  const paying = invoices.find((inv) => inv.id === payingId)
  const opened = invoices.find((inv) => inv.id === openId)

  return (
    <div className="bill-page" data-testid="feature-page-bill.dues">
      <div className="bill-aging" role="group" aria-label="Filter dues by age">
        {BUCKETS.map((b) => (
          <button key={b.id} className={`bill-aging-card${bucket === b.id ? ' is-on' : ''}${b.id === '60+' && bucketTotals[b.id] > 0 ? ' is-alert' : ''}`} onClick={() => setBucket(b.id)}>
            <span>{b.label}</span>
            <strong>{inr(bucketTotals[b.id])}</strong>
          </button>
        ))}
      </div>

      {rows.length ? (
        <div className="bill-table-wrap">
          <table className="bill-table">
            <thead>
              <tr><th>Patient</th><th>Invoice</th><th className="r">Age</th><th className="r">Billed</th><th className="r">Paid</th><th className="r">Balance</th><th /></tr>
            </thead>
            <tbody>
              {rows.map(({ inv, age }) => {
                const p = findPatient(patients, inv.patientId)
                return (
                  <tr key={inv.id}>
                    <td>
                      <strong>{patientLabel(patients, inv.patientId)}</strong>
                      {p?.mobile && <a className="bill-sub bill-tel" href={`tel:${p.countryCode || ''}${p.mobile}`}><Phone size={11} /> {p.countryCode} {p.mobile}</a>}
                    </td>
                    <td><button className="bill-link" onClick={() => setOpenId(inv.id)}>{inv.id}</button><small className="bill-sub">{prettyDate(inv.createdAt)}</small></td>
                    <td className={`r${age > 60 ? ' bill-due' : ''}`}>{age === 0 ? 'Today' : `${age}d`}</td>
                    <td className="r">{inr(inv.amount)}</td>
                    <td className="r">{inr(invoicePaidAmount(inv))}</td>
                    <td className="r bill-due"><strong>{inr(invoiceBalance(inv))}</strong></td>
                    <td className="r"><button className="patient-intake-primary bill-btn-sm" onClick={() => setPayingId(inv.id)}>Collect</button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bill-empty">
          <CheckCircle2 size={22} />
          <h2>No dues {bucket === 'all' ? '' : `in ${active.label}`}</h2>
          <p>Every invoice in this range is fully paid.</p>
        </div>
      )}

      {paying && <PaymentDialog invoice={paying} patientName={patientLabel(patients, paying.patientId)} onClose={() => setPayingId(null)} onDone={() => setPayingId(null)} />}
      {opened && <InvoiceDrawer invoice={opened} patient={findPatient(patients, opened.patientId)} onClose={() => setOpenId(null)} onDone={() => setOpenId(null)} />}
    </div>
  )
}

export default PendingDuesPage
