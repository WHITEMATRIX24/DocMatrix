import React, { useMemo } from 'react'
import { useClinicData } from '@/services/clinicStore'
import { PAYMENT_MODES, inr, localDate, usePayments } from '@/pages/billing/BillingShared'
import {
  ColumnChart,
  RankedBars,
  ReportActions,
  StatTile,
  inRange,
  monthLabel,
  pct,
  plural,
  previousSpan,
  shiftDay,
  shortDate,
  useReportRange,
  type ColumnPoint
} from './ReportsShared'
import { computePeriod } from './reportMetrics'

export const RevenueReportPage: React.FC = () => {
  const range = useReportRange()
  const { invoices, patients, appointments, treatmentPlans } = useClinicData()
  const payments = usePayments(invoices)
  const { now, before } = useMemo(() => {
    const data = { invoices, patients, appointments, treatmentPlans }
    return { now: computePeriod(data, range), before: computePeriod(data, previousSpan(range)) }
  }, [invoices, patients, appointments, treatmentPlans, range])

  const rangePayments = useMemo(() => payments.filter((p) => inRange(p.receivedAt, range)), [payments, range])
  const collected = now.collected

  const points = useMemo<ColumnPoint[]>(() => {
    const monthly = range.days > 62
    const totals = new Map<string, number>()
    if (monthly) {
      const end = range.to.slice(0, 7)
      let cursor = range.from.slice(0, 7)
      while (cursor <= end) {
        totals.set(cursor, 0)
        const [y, m] = cursor.split('-').map(Number)
        cursor = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
      }
    } else {
      for (let i = 0; i < range.days; i++) totals.set(shiftDay(range.from, i), 0)
    }
    rangePayments.forEach((p) => {
      const day = localDate(p.receivedAt)
      const k = monthly ? day.slice(0, 7) : day
      totals.set(k, (totals.get(k) || 0) + p.amount)
    })
    return [...totals.entries()].map(([k, value]) => ({ key: k, label: monthly ? monthLabel(k) : shortDate(k), value }))
  }, [rangePayments, range])

  const byMode = PAYMENT_MODES.map(({ id }) => {
    const amount = rangePayments.filter((p) => p.mode === id).reduce((s, p) => s + p.amount, 0)
    return { key: id, label: id, value: amount, display: `${inr(amount)} · ${pct(amount, collected)}%` }
  })

  return (
    <div className="rpt-page" data-testid="feature-page-rep.revenue">
      <div className="rpt-toolbar">
        <ReportActions
          filename="revenue"
          headers={['Period', 'Collected']}
          rows={points.map((p) => [p.label, p.value])}
        />
      </div>

      <div className="rpt-tiles">
        <StatTile label="Collected" value={inr(collected)} sub={plural(now.paymentCount, 'payment')} tone="ok" compare={{ current: now.collected, previous: before.collected, kind: 'money', goodWhen: 'up' }} />
        <StatTile label="Billed" value={inr(now.billed)} sub={`${plural(now.invoiceCount, 'invoice')} · ${plural(now.patientsBilled, 'patient')}`} compare={{ current: now.billed, previous: before.billed, kind: 'money', goodWhen: 'up' }} />
        <StatTile label="Still unpaid on these bills" value={inr(now.unpaid)} sub={now.billed ? `${pct(now.unpaid, now.billed)}% of billed` : undefined} tone={now.unpaid > 0 ? 'bad' : undefined} compare={{ current: now.unpaid, previous: before.unpaid, kind: 'money', goodWhen: 'down' }} />
        <StatTile label="Average bill" value={inr(now.averageBill)} compare={{ current: Math.round(now.averageBill), previous: Math.round(before.averageBill), kind: 'money', goodWhen: 'up' }} />
      </div>

      <article className="bill-card">
        <ColumnChart points={points} title={range.days > 62 ? 'Collected per month' : 'Collected per day'} />
      </article>

      <article className="bill-card">
        <h2 className="bill-section-title">How patients paid</h2>
        <RankedBars items={byMode} empty="No payments received in this period." />
      </article>
    </div>
  )
}

export default RevenueReportPage
