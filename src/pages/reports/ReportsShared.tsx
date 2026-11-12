import React, { createContext, useContext, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowDown, ArrowUp, Download, Printer } from 'lucide-react'
import { FEATURE_REGISTRY } from '@/features/registry'
import { inr, localDate } from '@/pages/billing/BillingShared'
import { inSpan, percent, type DateSpan } from './reportMetrics'
import './reports.css'

/* ── Date range shared by every report tab ───────────────────────────── */

export type RangeKey = 'today' | '7d' | '30d' | 'month' | '90d' | 'custom'

export interface ReportRange {
  key: RangeKey
  from: string // YYYY-MM-DD
  to: string
  label: string
  days: number
  /** How the comparison period reads in a sentence, for example "the previous 30 days". */
  compareLabel: string
}

export const RANGE_PRESETS: { key: RangeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: 'month', label: 'This month' },
  { key: '90d', label: 'Last 90 days' },
  { key: 'custom', label: 'Custom' }
]

export const shiftDay = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() + days)
  return localDate(d.toISOString())
}

const daysBetween = (from: string, to: string) =>
  Math.max(1, Math.round((new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime()) / 86400000) + 1)

export const resolveRange = (key: RangeKey, customFrom?: string, customTo?: string): ReportRange => {
  const today = localDate()
  let from = today
  let to = today
  if (key === '7d') from = shiftDay(today, -6)
  else if (key === '30d') from = shiftDay(today, -29)
  else if (key === '90d') from = shiftDay(today, -89)
  else if (key === 'month') from = `${today.slice(0, 7)}-01`
  else if (key === 'custom') {
    from = customFrom || shiftDay(today, -29)
    to = customTo || today
    if (from > to) [from, to] = [to, from]
  }
  const label = RANGE_PRESETS.find((p) => p.key === key)?.label || 'Custom'
  const days = daysBetween(from, to)
  const compareLabel =
    key === 'today' ? 'yesterday' : key === 'month' ? 'the same days last month' : `the previous ${days === 1 ? 'day' : `${days} days`}`
  return { key, from, to, label, days, compareLabel }
}

/** The period to compare against: the same days last month for "This month", otherwise the days just before. */
export const previousSpan = (range: ReportRange): DateSpan => {
  if (range.key === 'month') {
    const [y, m, d] = range.to.split('-').map(Number)
    const lastOfPrev = new Date(y, m - 1, 0)
    const prefix = `${lastOfPrev.getFullYear()}-${String(lastOfPrev.getMonth() + 1).padStart(2, '0')}`
    return { from: `${prefix}-01`, to: `${prefix}-${String(Math.min(d, lastOfPrev.getDate())).padStart(2, '0')}` }
  }
  return { from: shiftDay(range.from, -range.days), to: shiftDay(range.from, -1) }
}

const RangeContext = createContext<ReportRange>(resolveRange('30d'))
export const ReportRangeProvider = RangeContext.Provider
export const useReportRange = () => useContext(RangeContext)

export const inRange = inSpan
export const pct = percent
export const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

/* ── Who may see money ───────────────────────────────────────────────── */

/** The Revenue report's roles in the registry decide who may see clinic money anywhere in Reports. */
export const canRoleSeeMoney = (role?: string) => {
  const allowed = FEATURE_REGISTRY.find((f) => f.id === 'rep.revenue')?.roles
  return !allowed || allowed.includes(role as never)
}

const MoneyContext = createContext(true)
export const ReportMoneyProvider = MoneyContext.Provider
export const useMoneyAccess = () => useContext(MoneyContext)

export const shortDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })

export const monthLabel = (month: string) =>
  new Date(`${month}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })

export const rangeText = (range: ReportRange) =>
  range.from === range.to ? shortDate(range.from) : `${shortDate(range.from)} – ${shortDate(range.to)}`

/* ── CSV + print ─────────────────────────────────────────────────────── */

const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`

export const ReportActions: React.FC<{ filename: string; headers: string[]; rows: Array<Array<string | number>> }> = ({
  filename,
  headers,
  rows
}) => {
  const range = useReportRange()
  const [slot, setSlot] = useState<HTMLElement | null>(() =>
    typeof document !== 'undefined' ? document.getElementById('rpt-actions-slot') : null
  )

  useEffect(() => {
    if (!slot && typeof document !== 'undefined') {
      setSlot(document.getElementById('rpt-actions-slot'))
    }
  }, [slot])

  const exportCsv = () => {
    const lines = [headers.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${filename}-${range.from}-to-${range.to}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const buttons = (
    <div className="rpt-actions">
      <button type="button" className="patient-intake-secondary" onClick={exportCsv} disabled={!rows.length}>
        <Download size={15} /> CSV
      </button>
      <button type="button" className="patient-intake-secondary" onClick={() => window.print()}>
        <Printer size={15} /> Print
      </button>
    </div>
  )

  if (slot) {
    return createPortal(buttons, slot)
  }

  return buttons
}

/* ── Building blocks ─────────────────────────────────────────────────── */

export interface TileCompare {
  current: number
  previous: number
  kind: 'money' | 'count' | 'points'
  goodWhen: 'up' | 'down'
}

/** "12% more than the previous 30 days". The arrow and the words carry the meaning; colour only reinforces it. */
const CompareLine: React.FC<TileCompare> = ({ current, previous, kind, goodWhen }) => {
  const range = useReportRange()
  if (current === 0 && previous === 0) return null
  if (current === previous) return <small className="rpt-delta">Same as {range.compareLabel}</small>

  const up = current > previous
  const gap = Math.abs(current - previous)
  const words =
    kind === 'money'
      ? previous === 0
        ? `Up from ₹0 ${range.key === "today" ? "yesterday" : `in ${range.compareLabel}`}`
        : `${Math.round((gap / previous) * 100)}% ${up ? 'more' : 'less'} than ${range.compareLabel}`
      : kind === 'points'
        ? `${gap} points ${up ? 'higher' : 'lower'} than ${range.compareLabel}`
        : `${gap} ${up ? 'more' : 'fewer'} than ${range.compareLabel}`
  const Arrow = up ? ArrowUp : ArrowDown

  return (
    <small className={`rpt-delta ${up === (goodWhen === 'up') ? 'is-good' : 'is-bad'}`}>
      <Arrow size={12} aria-hidden="true" /> {words}
    </small>
  )
}

export const StatTile: React.FC<{
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  tone?: 'ok' | 'bad'
  compare?: TileCompare
}> = ({ label, value, sub, tone, compare }) => (
  <div className={`rpt-tile${tone ? ` is-${tone}` : ''}`}>
    <span>{label}</span>
    <strong>{value}</strong>
    {sub && <small>{sub}</small>}
    {compare && <CompareLine {...compare} />}
  </div>
)

export interface RankedItem {
  key: string
  label: string
  value: number
  display: string
  sub?: string
}

/** Ranked horizontal bars in one hue: the clearest way to compare parts of a whole. */
export const RankedBars: React.FC<{ items: RankedItem[]; empty?: string }> = ({ items, empty }) => {
  const max = Math.max(0, ...items.map((i) => i.value))
  if (!items.length || max === 0) return <p className="rpt-muted">{empty || 'Nothing recorded for this period.'}</p>
  return (
    <ul className="rpt-bars">
      {items.map((item) => (
        <li key={item.key} title={`${item.label}: ${item.display}`}>
          <span className="rpt-bar-label">
            {item.label}
            {item.sub && <small>{item.sub}</small>}
          </span>
          <span className="rpt-bar-track" aria-hidden="true">
            <span className="rpt-bar-fill" style={{ width: item.value > 0 ? `${Math.max(2, (item.value / max) * 100)}%` : 0 }} />
          </span>
          <strong className="rpt-bar-value">{item.display}</strong>
        </li>
      ))}
    </ul>
  )
}

const niceMax = (max: number) => {
  if (max <= 0) return 1
  const mag = Math.pow(10, Math.floor(Math.log10(max)))
  const step = [1, 2, 2.5, 5, 10].find((s) => s * mag >= max) || 10
  return step * mag
}

const compactInr = (value: number) =>
  value >= 100000 ? `₹${+(value / 100000).toFixed(1)}L` : value >= 1000 ? `₹${+(value / 1000).toFixed(1)}k` : `₹${Math.round(value)}`

export interface ColumnPoint {
  key: string
  label: string
  value: number
}

/** Single-series column chart with hover/focus tooltip and a table view. */
export const ColumnChart: React.FC<{ points: ColumnPoint[]; title: string; valueLabel?: string }> = ({
  points,
  title,
  valueLabel = 'Collected'
}) => {
  const [active, setActive] = useState<number | null>(null)
  const [table, setTable] = useState(false)
  const max = niceMax(Math.max(0, ...points.map((p) => p.value)))
  const total = points.reduce((s, p) => s + p.value, 0)

  if (!points.length || total === 0) {
    return <p className="rpt-muted">No payments received in this period.</p>
  }

  return (
    <div className="rpt-chart">
      <div className="rpt-chart-head">
        <h3>{title}</h3>
        <button type="button" className="bill-link" onClick={() => setTable((v) => !v)}>
          {table ? 'View chart' : 'View as table'}
        </button>
      </div>

      {table ? (
        <div className="bill-table-wrap">
          <table className="bill-table bill-table-compact">
            <thead><tr><th>Date</th><th className="r">{valueLabel}</th></tr></thead>
            <tbody>
              {points.filter((p) => p.value > 0).map((p) => (
                <tr key={p.key}><td>{p.label}</td><td className="r">{inr(p.value)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="rpt-plot" onMouseLeave={() => setActive(null)}>
            {[1, 0.5, 0].map((f) => (
              <div key={f} className="rpt-grid" style={{ bottom: `${f * 100}%` }}>
                <span>{compactInr(max * f)}</span>
              </div>
            ))}
            <div className="rpt-cols">
              {points.map((p, i) => (
                <button
                  type="button"
                  key={p.key}
                  className={`rpt-col${active === i ? ' is-active' : ''}`}
                  aria-label={`${p.label}: ${inr(p.value)}`}
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                >
                  <span className="rpt-col-fill" style={{ height: `${(p.value / max) * 100}%` }} />
                </button>
              ))}
            </div>
            {active !== null && (
              <div className="rpt-tip" role="status" style={{ left: `${((active + 0.5) / points.length) * 100}%` }}>
                <strong>{inr(points[active].value)}</strong>
                <span>{points[active].label}</span>
              </div>
            )}
          </div>
          <div className="rpt-xaxis" aria-hidden="true">
            <span>{points[0].label}</span>
            {points.length > 2 && <span>{points[Math.floor(points.length / 2)].label}</span>}
            {points.length > 1 && <span>{points[points.length - 1].label}</span>}
          </div>
        </>
      )}
    </div>
  )
}

export const digitsOnly = (value: string) => value.replace(/[^\d]/g, '')
