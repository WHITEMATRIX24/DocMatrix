import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { invoiceBalance, useClinicData } from '@/services/clinicStore'
import { InvoiceDrawer, PAYMENT_MODES, StatusPill, inr, localDate, patientLabel, prettyDate, usePayments } from './BillingShared'

export default function BillingOverviewPage() {
  const { invoices, patients } = useClinicData()
  const payments = usePayments(invoices)
  const [openId, setOpenId] = useState<string | null>(null)
  const open = invoices.find((inv) => inv.id === openId)

  const today = localDate()
  const todayByMode = useMemo(() => {
    const totals: Record<string, number> = { Cash: 0, Card: 0, UPI: 0 }
    payments.filter((p) => localDate(p.receivedAt) === today).forEach((p) => (totals[p.mode] += p.amount))
    return totals
  }, [payments, today])
  const todayTotal = Object.values(todayByMode).reduce((a, b) => a + b, 0)

  const topDues = useMemo(
    () => invoices.filter((inv) => invoiceBalance(inv) > 0).sort((a, b) => invoiceBalance(b) - invoiceBalance(a)).slice(0, 5),
    [invoices]
  )

  return (
    <div className="bill-grid" data-testid="feature-page-bill.overview">
      <article className="bill-card">
        <header className="bill-card-head">
          <h2>Today's collection</h2>
          <Link to="/billing/collection">Cash-up <ArrowRight size={13} /></Link>
        </header>
        <div className="bill-mode-bars">
          {PAYMENT_MODES.map(({ id, icon: Icon }) => (
            <div key={id} className="bill-mode-bar">
              <span><Icon size={14} /> {id}</span>
              <div className="bill-bar-track"><div className="bill-bar-fill" style={{ width: todayTotal ? `${(todayByMode[id] / todayTotal) * 100}%` : 0 }} /></div>
              <strong>{inr(todayByMode[id])}</strong>
            </div>
          ))}
        </div>
        {!todayTotal && <p className="bill-muted">No payments received yet today.</p>}
      </article>

      <article className="bill-card">
        <header className="bill-card-head">
          <h2>Largest dues</h2>
          <Link to="/billing/dues">All dues <ArrowRight size={13} /></Link>
        </header>
        {topDues.length ? (
          <ul className="bill-list">
            {topDues.map((inv) => (
              <li key={inv.id}>
                <button onClick={() => setOpenId(inv.id)}>
                  <span>
                    <strong>{patientLabel(patients, inv.patientId)}</strong>
                    <small className="bill-sub">{inv.id} · {prettyDate(inv.createdAt)}</small>
                  </span>
                  <strong className="bill-due">{inr(invoiceBalance(inv))}</strong>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="bill-muted">Nothing outstanding. 🎉</p>
        )}
      </article>

      <article className="bill-card bill-card-wide">
        <header className="bill-card-head">
          <h2>Recent invoices</h2>
          <Link to="/billing/invoices">All invoices <ArrowRight size={13} /></Link>
        </header>
        {invoices.length ? (
          <ul className="bill-list">
            {invoices.slice(0, 6).map((inv) => (
              <li key={inv.id}>
                <button onClick={() => setOpenId(inv.id)}>
                  <span>
                    <strong>{patientLabel(patients, inv.patientId)}</strong>
                    <small className="bill-sub">{inv.id} · {inv.description}</small>
                  </span>
                  <span className="bill-row-end">
                    <strong>{inr(inv.amount)}</strong>
                    <StatusPill status={inv.status} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="bill-muted">No invoices yet. Use <Link to="/billing/invoices/new">New invoice</Link> to bill a patient.</p>
        )}
      </article>

      {open && <InvoiceDrawer invoice={open} patient={patients.find((p) => p.id === open.patientId)} onClose={() => setOpenId(null)} />}
    </div>
  )
}
