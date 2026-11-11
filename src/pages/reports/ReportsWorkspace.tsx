import React, { useEffect, useMemo } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Activity, BarChart3, BellRing, IndianRupee, Stethoscope } from 'lucide-react'
import { localDate } from '@/pages/billing/BillingShared'
import { syncWithBackend } from '@/services/clinicStore'
import { syncBillingMasterData } from '@/services/billingStore'
import { fetchAndSyncClinicStaff } from '@/services/clinicStaffStore'
import { syncFollowUpContactsWithBackend } from '@/services/followUpStore'
import { RANGE_PRESETS, ReportMoneyProvider, ReportRangeProvider, canRoleSeeMoney, rangeText, resolveRange, type RangeKey } from './ReportsShared'
import './reports.css'

type ReportTab = { id: string; label: string; path: string; icon: React.ComponentType<{ size?: number }> }

const tabs: ReportTab[] = [
  { id: 'rep.revenue', label: 'Revenue', path: '/reports/revenue', icon: IndianRupee },
  { id: 'rep.doctors', label: 'Doctors', path: '/reports/doctors', icon: Stethoscope },
  { id: 'rep.treatments', label: 'Treatments', path: '/reports/treatments', icon: Activity },
  { id: 'rep.followups', label: 'Follow-ups & bookings', path: '/reports/follow-ups', icon: BellRing }
]

/** One Reports hub: a shared date range (kept in the URL so it survives tab changes) and a tab per report. */
export default function ReportsWorkspace({ activeFeatureId, role, children }: { activeFeatureId: string; role?: string; children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [params, setParams] = useSearchParams()

  const key = (RANGE_PRESETS.some((p) => p.key === params.get('range')) ? params.get('range') : '30d') as RangeKey
  const customFrom = params.get('from') || undefined
  const customTo = params.get('to') || undefined
  const range = useMemo(() => resolveRange(key, customFrom, customTo), [key, customFrom, customTo])

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    Object.entries(changes).forEach(([k, v]) => (v === null ? next.delete(k) : next.set(k, v)))
    setParams(next, { replace: true })
  }

  const pickPreset = (k: RangeKey) => {
    if (k === 'custom') update({ range: 'custom', from: range.from, to: range.to })
    else update({ range: k, from: null, to: null })
  }

  const today = localDate()
  const canSeeMoney = canRoleSeeMoney(role)
  const visibleTabs = tabs.filter((tab) => tab.id !== 'rep.revenue' || canSeeMoney)

  useEffect(() => {
    syncWithBackend().catch((e) => console.warn('[ReportsWorkspace] syncWithBackend error:', e))
    syncBillingMasterData().catch((e) => console.warn('[ReportsWorkspace] syncBillingMasterData error:', e))
    fetchAndSyncClinicStaff().catch((e) => console.warn('[ReportsWorkspace] fetchAndSyncClinicStaff error:', e))
    syncFollowUpContactsWithBackend().catch((e) => console.warn('[ReportsWorkspace] syncFollowUpContactsWithBackend error:', e))
  }, [])

  return (
    <section className="appointments-workspace rpt-workspace">
      <header className="appointments-workspace-header rpt-header">
        <div className="appointments-workspace-title">
          <span className="appointments-workspace-icon"><BarChart3 size={20} /></span>
          <div>
            <span className="appointments-workspace-eyebrow">Reports</span>
            <h1>Clinic Reports</h1>
          </div>
        </div>
      </header>

      <div className="rpt-range">
        <div className="bill-segment" role="group" aria-label="Report period">
          {RANGE_PRESETS.map((p) => (
            <button key={p.key} type="button" className={key === p.key ? 'is-on' : ''} onClick={() => pickPreset(p.key)}>
              {p.label}
            </button>
          ))}
        </div>
        {key === 'custom' && (
          <div className="bill-range">
            <input type="date" value={range.from} max={today} onChange={(e) => e.target.value && update({ from: e.target.value })} aria-label="From date" />
            <span>to</span>
            <input type="date" value={range.to} max={today} min={range.from} onChange={(e) => e.target.value && update({ to: e.target.value })} aria-label="To date" />
          </div>
        )}
        {key !== 'custom' && <span className="rpt-range-text">{rangeText(range)}</span>}
      </div>

      <ReportRangeProvider value={range}>
        <ReportMoneyProvider value={canSeeMoney}>
      <nav className="appointments-workspace-tabs rpt-tabs" aria-label="Report sections">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon
          const active = activeFeatureId === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              className={`appointments-workspace-tab${active ? ' is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => navigate({ pathname: tab.path, search: location.search })}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="appointments-workspace-content rpt-content">{children}</div>
        </ReportMoneyProvider>
      </ReportRangeProvider>
    </section>
  )
}
