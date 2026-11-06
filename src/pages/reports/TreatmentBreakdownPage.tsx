import React, { useMemo } from 'react'
import { DENTAL_TREATMENTS, useClinicData, type TreatmentPlanRecord } from '@/services/clinicStore'
import { inr } from '@/pages/billing/BillingShared'
import { RankedBars, ReportActions, StatTile, inRange, previousSpan, useMoneyAccess, useReportRange, type RankedItem } from './ReportsShared'
import { computePeriod } from './reportMetrics'

const PLAN_STAGES: TreatmentPlanRecord['status'][] = ['Proposed', 'Accepted', 'In Progress', 'Pending', 'Completed']

/** FDI notation: first digit is the quadrant. */
const quadrantOf = (tooth: string) => {
  const q = tooth.trim().charAt(0)
  return ({ '1': 'Upper right', '2': 'Upper left', '3': 'Lower left', '4': 'Lower right', '5': 'Upper right (child)', '6': 'Upper left (child)', '7': 'Lower left (child)', '8': 'Lower right (child)' } as Record<string, string>)[q]
}

export const TreatmentBreakdownPage: React.FC = () => {
  const range = useReportRange()
  const canSeeMoney = useMoneyAccess()
  const { patients, invoices, appointments, treatmentPlans } = useClinicData()
  const { now, before } = useMemo(() => {
    const data = { patients, invoices, appointments, treatmentPlans }
    return { now: computePeriod(data, range), before: computePeriod(data, previousSpan(range)) }
  }, [patients, invoices, appointments, treatmentPlans, range])

  const categoryOf = useMemo(() => {
    const map = new Map(DENTAL_TREATMENTS.map((t) => [t.name.toLowerCase(), t.category]))
    return (name: string) => map.get(name.toLowerCase()) || 'Other'
  }, [])

  const done = useMemo(() => appointments.filter((a) => a.status === 'completed' && inRange(a.date, range)), [appointments, range])
  const plans = useMemo(() => treatmentPlans.filter((p) => inRange(p.date, range)), [treatmentPlans, range])

  const group = (names: string[]): RankedItem[] => {
    const counts = new Map<string, number>()
    names.forEach((n) => counts.set(n, (counts.get(n) || 0) + 1))
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([label, value]) => ({ key: label, label, value, display: String(value) }))
  }

  const procedures = group(done.map((a) => a.treatmentType || a.visitType || 'Other')).slice(0, 8)
  const categories = group(done.map((a) => categoryOf(a.treatmentType || a.visitType || '')))

  const teeth = useMemo<RankedItem[]>(() => {
    const counts = new Map<string, number>()
    plans.forEach((p) => {
      const tooth = (p.toothNumber || '').trim()
      if (tooth) counts.set(tooth, (counts.get(tooth) || 0) + 1)
    })
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8)
      .map(([tooth, value]) => {
        // Plans can target a single tooth (FDI number) or an area such as "Full Mouth"
        const single = /^\d{2}$/.test(tooth)
        return { key: tooth, label: single ? `Tooth ${tooth}` : tooth, sub: single ? quadrantOf(tooth) : undefined, value, display: String(value) }
      })
  }, [plans])

  const stages = PLAN_STAGES.map((status) => {
    const list = plans.filter((p) => p.status === status)
    return { status, count: list.length, value: list.reduce((s, p) => s + p.cost, 0) }
  })
  const stageItems: RankedItem[] = stages.map((s) => ({
    key: s.status,
    label: s.status,
    value: s.count,
    display: canSeeMoney ? `${s.count} · ${inr(s.value)}` : String(s.count)
  }))

  return (
    <div className="rpt-page" data-testid="feature-page-rep.treatments">
      <div className="rpt-toolbar">
        <ReportActions
          filename="treatments"
          headers={['Procedure', 'Visits completed']}
          rows={group(done.map((a) => a.treatmentType || a.visitType || 'Other')).map((i) => [i.label, i.value])}
        />
      </div>

      <div className="rpt-tiles">
        <StatTile label="Procedures completed" value={now.visitsCompleted} tone="ok" compare={{ current: now.visitsCompleted, previous: before.visitsCompleted, kind: 'count', goodWhen: 'up' }} />
        <StatTile label="Treatment plans made" value={now.plansMade} sub={canSeeMoney ? inr(now.plansValue) : undefined} compare={{ current: now.plansMade, previous: before.plansMade, kind: 'count', goodWhen: 'up' }} />
        <StatTile label="Plans completed" value={`${now.plansCompletedPct}%`} sub={`${now.plansCompleted} of ${now.plansMade}`} compare={before.plansMade ? { current: now.plansCompletedPct, previous: before.plansCompletedPct, kind: 'points', goodWhen: 'up' } : undefined} />
        {canSeeMoney && <StatTile label="Value of completed plans" value={inr(now.plansCompletedValue)} compare={{ current: now.plansCompletedValue, previous: before.plansCompletedValue, kind: 'money', goodWhen: 'up' }} />}
      </div>

      <div className="bill-grid">
        <article className="bill-card">
          <h2 className="bill-section-title">Most common procedures</h2>
          <RankedBars items={procedures} empty="No completed visits in this period." />
        </article>
        <article className="bill-card">
          <h2 className="bill-section-title">By speciality</h2>
          <RankedBars items={categories} empty="No completed visits in this period." />
        </article>
        <article className="bill-card">
          <h2 className="bill-section-title">Treatment plan progress</h2>
          <RankedBars items={stageItems} empty="No treatment plans made in this period." />
        </article>
        <article className="bill-card">
          <h2 className="bill-section-title">Most treated teeth and areas</h2>
          <RankedBars items={teeth} empty="No tooth-specific treatment planned in this period." />
        </article>
      </div>
    </div>
  )
}

export default TreatmentBreakdownPage
