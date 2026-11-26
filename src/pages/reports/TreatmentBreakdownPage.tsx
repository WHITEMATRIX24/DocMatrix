import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { DENTAL_TREATMENTS, isAuthenticatedClinic, isDemoSession, useClinicData, type TreatmentPlanRecord } from '@/services/clinicStore'
import { useBillingData } from '@/services/billingStore'
import { inr } from '@/pages/billing/BillingShared'
import {
  RankedBars,
  ReportActions,
  ReportErrorState,
  ReportLoadingState,
  StatTile,
  inRange,
  previousSpan,
  useMoneyAccess,
  useReportRange,
  type RankedItem
} from './ReportsShared'
import { computePeriod } from './reportMetrics'
import { normalizeTreatmentBreakdown, reportsApi, type TreatmentBreakdownResponse } from '@/services/reportsApi'

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
  const { services: tariffs } = useBillingData()
  const [backendData, setBackendData] = useState<TreatmentBreakdownResponse | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [isAuthError, setIsAuthError] = useState<boolean>(false)

  const loadData = useCallback(() => {
    if (!isAuthenticatedClinic()) {
      setLoading(false)
      setError(null)
      return () => {}
    }

    let active = true
    setLoading(true)
    setError(null)
    setIsAuthError(false)

    reportsApi.getTreatmentBreakdown(range.from, range.to)
      .then((data) => {
        if (active && data) {
          setBackendData(normalizeTreatmentBreakdown(data, canSeeMoney))
        }
      })
      .catch((err: any) => {
        if (!active) return
        const isAuth =
          err?.status === 401 ||
          err?.status === 403 ||
          err?.message?.includes('401') ||
          err?.message?.includes('403') ||
          err?.message?.toLowerCase().includes('unauthorized') ||
          err?.message?.toLowerCase().includes('forbidden')
        setIsAuthError(isAuth)
        setError(err?.message || 'Failed to fetch treatment breakdown report from server')
        setBackendData(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [range.from, range.to, canSeeMoney])

  useEffect(() => {
    const cancel = loadData()
    return cancel
  }, [loadData])

  const isAuthClinic = isAuthenticatedClinic()

  const fallbackPeriod = useMemo(() => {
    const data = { patients, invoices, appointments, treatmentPlans }
    return { now: computePeriod(data, range), before: computePeriod(data, previousSpan(range)) }
  }, [patients, invoices, appointments, treatmentPlans, range])

  const now = backendData?.now
    ? { ...fallbackPeriod.now, ...backendData.now }
    : fallbackPeriod.now
  const before = backendData?.before
    ? { ...fallbackPeriod.before, ...backendData.before }
    : fallbackPeriod.before

  const categoryOf = useMemo(() => {
    const map = new Map(DENTAL_TREATMENTS.map((t) => [t.name.toLowerCase(), t.category]))
    tariffs.forEach((t) => {
      if (t.name && t.category) map.set(t.name.trim().toLowerCase(), t.category)
    })
    treatmentPlans.forEach((p) => {
      if (p.procedure && p.category) map.set(p.procedure.trim().toLowerCase(), p.category)
    })
    return (name: string) => map.get(name.trim().toLowerCase()) || 'Other'
  }, [tariffs, treatmentPlans])

  const done = useMemo(() => appointments.filter((a) => a.status === 'completed' && inRange(a.date, range)), [appointments, range])
  const plans = useMemo(() => treatmentPlans.filter((p) => inRange(p.date, range)), [treatmentPlans, range])

  const group = (names: string[]): RankedItem[] => {
    const counts = new Map<string, number>()
    names.forEach((n) => counts.set(n, (counts.get(n) || 0) + 1))
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([label, value]) => ({ key: label, label, value, display: String(value) }))
  }

  const procedures = useMemo(() => {
    if (backendData?.procedures && backendData.procedures.length > 0) return backendData.procedures
    return group(done.map((a) => a.treatmentType || a.visitType || 'Other')).slice(0, 8)
  }, [backendData, done])

  const categories = useMemo(() => {
    if (backendData?.categories && backendData.categories.length > 0) return backendData.categories
    return group(done.map((a) => categoryOf(a.treatmentType || a.visitType || '')))
  }, [backendData, done, categoryOf])

  const fallbackTeeth = useMemo<RankedItem[]>(() => {
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

  const teeth = useMemo(() => {
    if (backendData?.teeth && backendData.teeth.length > 0) return backendData.teeth
    return fallbackTeeth
  }, [backendData, fallbackTeeth])

  const stageItems: RankedItem[] = useMemo(() => {
    if (backendData?.stages && backendData.stages.length > 0) return backendData.stages
    const stages = PLAN_STAGES.map((status) => {
      const list = plans.filter((p) => p.status === status)
      return { status, count: list.length, value: list.reduce((s, p) => s + p.cost, 0) }
    })
    return stages.map((s) => ({
      key: s.status,
      label: s.status,
      value: s.count,
      display: canSeeMoney ? `${s.count} · ${inr(s.value)}` : String(s.count)
    }))
  }, [backendData, plans, canSeeMoney])

  if (error && isAuthClinic) {
    return (
      <div className="rpt-page" data-testid="feature-page-rep.treatments">
        <ReportErrorState error={error} onRetry={loadData} isAuthError={isAuthError} />
      </div>
    )
  }

  if (loading && !backendData && isAuthClinic) {
    return (
      <div className="rpt-page" data-testid="feature-page-rep.treatments">
        <ReportLoadingState label="Loading clinical treatment metrics..." />
      </div>
    )
  }

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
