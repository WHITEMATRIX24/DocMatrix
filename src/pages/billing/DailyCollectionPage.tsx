import React, { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react'
import { useClinicData } from '@/services/clinicStore'
import { PAYMENT_MODES, inr, localDate, patientLabel, usePayments } from './BillingShared'

const shiftDate = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() + days)
  return localDate(d.toISOString())
}

export const DailyCollectionPage: React.FC = () => {
  const { invoices, patients } = useClinicData()
  const payments = usePayments(invoices)
  const [date, setDate] = useState(localDate())
  const isToday = date === localDate()

  const dayPayments = useMemo(() => payments.filter((p) => localDate(p.receivedAt) === date), [payments, date])

  const byMode = useMemo(() => {
    const out: Record<string, { amount: number; count: number }> = { Cash: { amount: 0, count: 0 }, Card: { amount: 0, count: 0 }, UPI: { amount: 0, count: 0 } }
    dayPayments.forEach((p) => { out[p.mode].amount += p.amount; out[p.mode].count += 1 })
    return out
  }, [dayPayments])

  const total = dayPayments.reduce((s, p) => s + p.amount, 0)

  return (
    <div className="bill-page bill-printable" data-testid="feature-page-bill.collection">
      <div className="bill-toolbar">
        <div className="bill-date-nav">
          <button className="bill-icon-btn" onClick={() => setDate(shiftDate(date, -1))} aria-label="Previous day"><ChevronLeft size={16} /></button>
          <input type="date" value={date} max={localDate()} onChange={(e) => e.target.value && setDate(e.target.value)} aria-label="Collection date" />
          <button className="bill-icon-btn" onClick={() => setDate(shiftDate(date, 1))} disabled={isToday} aria-label="Next day"><ChevronRight size={16} /></button>
          {!isToday && <button className="bill-link" onClick={() => setDate(localDate())}>Today</button>}
        </div>
        <button className="patient-intake-secondary" onClick={() => window.print()}><Printer size={15} /> Print cash-up</button>
      </div>

      <div className="bill-mode-cards">
        {PAYMENT_MODES.map(({ id, icon: Icon }) => (
          <article key={id} className="bill-card bill-mode-card">
            <span className="bill-kpi-label"><Icon size={15} /> {id}</span>
            <strong>{inr(byMode[id].amount)}</strong>
            <small className="bill-sub">{byMode[id].count} payment{byMode[id].count === 1 ? '' : 's'}</small>
          </article>
        ))}
        <article className="bill-card bill-mode-card bill-mode-card-total">
          <span className="bill-kpi-label">Total collected</span>
          <strong>{inr(total)}</strong>
          <small className="bill-sub">Cash expected in drawer: {inr(byMode.Cash.amount)}</small>
        </article>
      </div>

      <article className="bill-card">
        <h2 className="bill-section-title">Received ({dayPayments.length})</h2>
        {dayPayments.length ? (
          <table className="bill-table bill-table-compact">
            <tbody>
              {dayPayments.map((p) => (
                <tr key={p.id + p.invoiceId}>
                  <td>{new Date(p.receivedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{patientLabel(patients, p.patientId)}<small className="bill-sub">{p.invoiceId}</small></td>
                  <td>{p.mode}{p.reference ? <small className="bill-sub">{p.reference}</small> : null}</td>
                  <td className="r">{inr(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="bill-muted">No payments on this day.</p>}
      </article>
    </div>
  )
}

export default DailyCollectionPage
