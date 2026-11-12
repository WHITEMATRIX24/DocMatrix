import React, { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Award,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Info,
  Sparkles,
  Stethoscope,
  UserCheck,
  Users
} from 'lucide-react'
import { DENTISTS, isAuthenticatedClinic, isDemoSession, useClinicData } from '@/services/clinicStore'
import { useClinicStaff } from '@/services/clinicStaffStore'
import { reportsApi, type BackendDoctorRow } from '@/services/reportsApi'
import { inr } from '@/pages/billing/BillingShared'
import { ReportActions, inRange, previousSpan, useMoneyAccess, useReportRange } from './ReportsShared'
import { computePeriod } from './reportMetrics'

type SortKey = 'name' | 'completed' | 'patients' | 'missed' | 'pending'

interface DoctorRow {
  name: string
  specialization: string
  scheduled: number
  completed: number
  patients: number
  missed: number
  pending: number
}

const getInitials = (name: string) =>
  name
    .replace(/^Dr\.?\s+/i, '')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'DR'

export const DoctorPerformancePage: React.FC = () => {
  const range = useReportRange()
  const canSeeMoney = useMoneyAccess()
  const { patients, invoices, appointments, treatmentPlans } = useClinicData()
  const { doctors: staffDoctors } = useClinicStaff()
  const [backendDoctors, setBackendDoctors] = useState<BackendDoctorRow[] | null>(null)
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    if (isAuthenticatedClinic() && !isDemoSession()) {
      reportsApi
        .getDoctorsReport({ fromDate: range.from, toDate: range.to })
        .then((res) => {
          if (Array.isArray(res?.doctors)) setBackendDoctors(res.doctors)
        })
        .catch((err) => console.warn('[DoctorPerformancePage] getDoctorsReport error:', err))
    } else {
      setBackendDoctors(null)
    }
  }, [range.from, range.to])

  const { now, before } = useMemo(() => {
    const data = { patients, invoices, appointments, treatmentPlans }
    return { now: computePeriod(data, range), before: computePeriod(data, previousSpan(range)) }
  }, [patients, invoices, appointments, treatmentPlans, range])
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'completed', dir: 'desc' })

  const rows = useMemo<DoctorRow[]>(() => {
    const isAuth = isAuthenticatedClinic() && !isDemoSession()
    // Explicitly filter for users whose role is strictly DOCTOR (or predefined clinical dentists)
    const validStaffNames = new Set(
      staffDoctors
        .filter((d) => (d.role || '').toUpperCase() === 'DOCTOR')
        .map((d) => d.name)
        .filter(Boolean)
    )

    const names = new Set<string>()
    if (isAuth && validStaffNames.size > 0) {
      validStaffNames.forEach((n) => names.add(n))
    } else {
      DENTISTS.forEach((d) => names.add(d.name))
    }

    if (backendDoctors) {
      backendDoctors.forEach((d) => {
        if (d.doctor && d.doctor !== 'Unassigned' && (validStaffNames.has(d.doctor) || !isAuth)) {
          names.add(d.doctor)
        }
      })
    }

    return [...names].map((name) => {
      const appts = appointments.filter((a) => a.doctor === name && inRange(a.date, range))
      const done = appts.filter((a) => a.status === 'completed')

      // Attribute treatment plans strictly to clinical doctor
      const myPlans = treatmentPlans.filter((p) => {
        const doc = p.doctor || ''
        return doc.toLowerCase() === name.toLowerCase()
      })

      // Active plans (excluding completed, cancelled, and rejected)
      const validPlans = myPlans.filter(
        (p) => p.status !== 'Completed' && p.status !== 'Cancelled' && p.status !== 'Rejected'
      )

      let pendingValue = 0
      validPlans.forEach((plan) => {
        const planCost = plan.cost || plan.totalEstimatedCost || 0
        const stages = plan.stages || []
        const allItems = stages.flatMap((st) => st.items || [])
        let planCompletedItemsValue = 0

        allItems.forEach((it) => {
          if (it.status === 'COMPLETED') {
            planCompletedItemsValue += it.netFee || it.unitFee || 0
          }
        })

        const remaining = Math.max(0, planCost - planCompletedItemsValue)
        pendingValue += remaining
      })

      return {
        name,
        specialization: DENTISTS.find((d) => d.name === name)?.specialization || '',
        scheduled: appts.length,
        completed: done.length,
        patients: new Set(done.map((a) => a.patientId)).size,
        missed: appts.filter((a) => a.status === 'cancelled' || a.status === 'no-show').length,
        pending: pendingValue
      }
    })
  }, [appointments, treatmentPlans, range, staffDoctors, backendDoctors])

  const sorted = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) =>
      sort.key === 'name' ? a.name.localeCompare(b.name) * dir : ((a[sort.key] as number) - (b[sort.key] as number)) * dir || a.name.localeCompare(b.name)
    )
  }, [rows, sort])

  const maxCompleted = Math.max(1, ...rows.map((r) => r.completed))
  const busiest = [...rows].sort((a, b) => b.completed - a.completed)[0]

  const topDoctor = useMemo(() => {
    return [...rows].filter((r) => r.completed > 0).sort((a, b) => b.completed - a.completed)[0] || null
  }, [rows])

  const topPatientDoc = useMemo(() => {
    return [...rows].filter((r) => r.patients > 0).sort((a, b) => b.patients - a.patients)[0] || null
  }, [rows])

  const doctorsWithPending = useMemo(() => {
    return rows.filter((r) => r.pending > 0)
  }, [rows])

  const totalPending = useMemo(() => {
    return rows.reduce((s, r) => s + r.pending, 0)
  }, [rows])

  const activeDoctors = useMemo(() => {
    return [...rows].sort((a, b) => b.completed - a.completed || b.patients - a.patients || b.pending - a.pending)
  }, [rows])

  const header = (key: SortKey, label: string, right = true, width?: string) => (
    <th
      className={right ? 'r' : undefined}
      style={width ? { width } : undefined}
      aria-sort={sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button type="button" className="rpt-sort" onClick={() => setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))}>
        {label}
        {sort.key === key && (sort.dir === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />)}
      </button>
    </th>
  )

  return (
    <div className="rpt-page rpt-doctor-page" data-testid="feature-page-rep.doctors">
      <ReportActions
        filename="doctors"
        headers={[
          'Doctor',
          'Visits completed',
          'Patients seen',
          'Cancelled or no-show',
          ...(canSeeMoney ? ['Still pending'] : [])
        ]}
        rows={sorted.map((r) => [
          r.name,
          r.completed,
          r.patients,
          r.missed,
          ...(canSeeMoney ? [r.pending] : [])
        ])}
      />

      {/* 1. Redesigned Premium KPI Cards */}
      <div className="rpt-kpi-grid">
        {/* Card 1: Visits Completed */}
        <div className="rpt-premium-kpi">
          <div className="rpt-kpi-top">
            <div className="rpt-kpi-icon-wrap rpt-kpi-icon-teal">
              <CalendarCheck size={20} />
            </div>
            <div className="rpt-kpi-meta">
              <span className="rpt-kpi-label">Visits Completed</span>
              <strong className="rpt-kpi-value">{now.visitsCompleted}</strong>
            </div>
          </div>

          <div className="rpt-kpi-middle">
            {topDoctor && topDoctor.completed > 0 ? (
              <div className="rpt-kpi-badge">
                <Sparkles size={12} className="rpt-kpi-sparkle" />
                <span>
                  Most active: <strong>{topDoctor.name}</strong> ({topDoctor.completed}{' '}
                  {topDoctor.completed === 1 ? 'visit' : 'visits'})
                </span>
              </div>
            ) : (
              <span className="rpt-kpi-subtext">No completed visits in this period</span>
            )}
          </div>

          <div className="rpt-kpi-footer">
            <span
              className={`rpt-trend-pill ${
                now.visitsCompleted >= before.visitsCompleted ? 'is-positive' : 'is-negative'
              }`}
            >
              {now.visitsCompleted >= before.visitsCompleted ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
              {Math.abs(now.visitsCompleted - before.visitsCompleted)}{' '}
              {now.visitsCompleted >= before.visitsCompleted ? 'more' : 'fewer'} than {range.compareLabel}
            </span>
          </div>
        </div>

        {/* Card 2: Patients Seen */}
        <div className="rpt-premium-kpi">
          <div className="rpt-kpi-top">
            <div className="rpt-kpi-icon-wrap rpt-kpi-icon-blue">
              <Users size={20} />
            </div>
            <div className="rpt-kpi-meta">
              <span className="rpt-kpi-label">Patients Seen</span>
              <strong className="rpt-kpi-value">{now.patientsTreated}</strong>
            </div>
          </div>

          <div className="rpt-kpi-middle">
            {now.patientsTreated > 0 ? (
              <div className="rpt-kpi-patient-split">
                <span className="rpt-split-chip">
                  <span className="rpt-chip-dot dot-new" />
                  <strong>{now.newPatients}</strong> new
                </span>
                <span className="rpt-split-chip">
                  <span className="rpt-chip-dot dot-ret" />
                  <strong>{now.returningPatients}</strong> returning
                </span>
              </div>
            ) : (
              <span className="rpt-kpi-subtext">No patients treated in this period</span>
            )}
          </div>

          <div className="rpt-kpi-footer">
            <span
              className={`rpt-trend-pill ${
                now.patientsTreated >= before.patientsTreated ? 'is-positive' : 'is-negative'
              }`}
            >
              {now.patientsTreated >= before.patientsTreated ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
              {Math.abs(now.patientsTreated - before.patientsTreated)}{' '}
              {now.patientsTreated >= before.patientsTreated ? 'more' : 'fewer'} than {range.compareLabel}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Compact Clinic Doctor Insights Bar */}
      <div className="rpt-insights-bar">
        <div className="rpt-insight-item">
          <div className="rpt-insight-icon">
            <Award size={16} />
          </div>
          <div className="rpt-insight-content">
            <small>Top Practitioner</small>
            <span title={topDoctor ? `${topDoctor.name} (${topDoctor.completed} visits)` : '—'}>
              {topDoctor && topDoctor.completed > 0 ? `${topDoctor.name} (${topDoctor.completed})` : '—'}
            </span>
          </div>
        </div>

        <div className="rpt-insight-item">
          <div className="rpt-insight-icon">
            <UserCheck size={16} />
          </div>
          <div className="rpt-insight-content">
            <small>Highest Patient Volume</small>
            <span title={topPatientDoc ? `${topPatientDoc.name} (${topPatientDoc.patients} patients)` : '—'}>
              {topPatientDoc && topPatientDoc.patients > 0 ? `${topPatientDoc.name} (${topPatientDoc.patients})` : '—'}
            </span>
          </div>
        </div>

        <div className="rpt-insight-item">
          <div className="rpt-insight-icon">
            <CheckCircle2 size={16} />
          </div>
          <div className="rpt-insight-content">
            <small>Visit Attendance Rate</small>
            <span>
              {now.withOutcome > 0 ? `${now.attendedPct}% attended` : '100%'}
              {now.cancelled + now.noShows > 0 ? ` (${now.cancelled + now.noShows} missed)` : ''}
            </span>
          </div>
        </div>

        {canSeeMoney && (
          <div className="rpt-insight-item">
            <div className="rpt-insight-icon">
              <Clock size={16} />
            </div>
            <div className="rpt-insight-content">
              <small>Pending Treatment Workload</small>
              <span title={totalPending > 0 ? `${inr(totalPending)} across ${doctorsWithPending.length} doctors` : 'All clear'}>
                {totalPending > 0
                  ? `${inr(totalPending)} (${doctorsWithPending.length} ${
                      doctorsWithPending.length === 1 ? 'doc' : 'docs'
                    })`
                  : 'All treatments clear'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Doctor Performance Visual Comparison */}
      <div className="rpt-card">
        <div className="rpt-card-header">
          <div className="rpt-card-header-left">
            <Activity size={16} className="rpt-card-icon" />
            <div>
              <h3 className="rpt-card-title">Doctor Productivity &amp; Volume Distribution</h3>
              <p className="rpt-card-desc">Comparing completed visits, patient share, and active treatment workload per doctor.</p>
            </div>
          </div>
        </div>
        <div className="rpt-card-body">
          {activeDoctors.every((d) => d.completed === 0 && d.patients === 0 && d.pending === 0) ? (
            <div className="rpt-empty-chart">
              <Stethoscope size={24} />
              <p>No completed visits or pending treatments recorded for this period.</p>
            </div>
          ) : (
            <div className="rpt-bars-container">
              {activeDoctors.map((doc) => {
                const visitShare =
                  now.visitsCompleted > 0 ? Math.round((doc.completed / now.visitsCompleted) * 100) : 0
                return (
                  <div key={doc.name} className="rpt-doctor-bar-row">
                    <div className="rpt-bar-doc-info">
                      <div className="rpt-bar-avatar">{getInitials(doc.name)}</div>
                      <div className="rpt-bar-names">
                        <strong>{doc.name}</strong>
                        <small>{doc.specialization || 'Clinical Doctor'}</small>
                      </div>
                    </div>

                    <div className="rpt-bar-visual-track">
                      <div className="rpt-bar-meta-line">
                        <span>
                          <strong>{doc.completed}</strong> {doc.completed === 1 ? 'visit' : 'visits'}{' '}
                          <span style={{ opacity: 0.75 }}>({visitShare}% share)</span>
                        </span>
                        <span>
                          <strong>{doc.patients}</strong> {doc.patients === 1 ? 'patient' : 'patients'} seen
                        </span>
                        {canSeeMoney && doc.pending > 0 && (
                          <span className="rpt-bar-pending-text">
                            Pending: <strong>{inr(doc.pending)}</strong>
                          </span>
                        )}
                      </div>
                      <div className="rpt-bar-dual-track">
                        <div
                          className="rpt-bar-progress"
                          style={{ width: `${Math.max(doc.completed > 0 ? 4 : 0, visitShare)}%` }}
                          title={`${doc.name}: ${doc.completed} visits (${visitShare}%)`}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 4. Redesigned Doctor Performance Table */}
      <div className="bill-table-wrap rpt-doctor-table-wrap">
        <table className="bill-table rpt-doctor-table" style={{ tableLayout: 'fixed', width: '100%', minWidth: '680px' }}>
          <colgroup>
            <col style={{ width: canSeeMoney ? '30%' : '38%' }} />
            <col style={{ width: canSeeMoney ? '22%' : '26%' }} />
            <col style={{ width: canSeeMoney ? '15%' : '18%' }} />
            <col style={{ width: canSeeMoney ? '15%' : '18%' }} />
            {canSeeMoney && <col style={{ width: '18%' }} />}
          </colgroup>
          <thead>
            <tr>
              {header('name', 'Doctor', false, canSeeMoney ? '30%' : '38%')}
              {header('completed', 'Visits completed', true, canSeeMoney ? '22%' : '26%')}
              {header('patients', 'Patients seen', true, canSeeMoney ? '15%' : '18%')}
              {header('missed', 'Cancelled / no-show', true, canSeeMoney ? '15%' : '18%')}
              {canSeeMoney && (
                <th
                  className="r"
                  style={{ width: '18%' }}
                  aria-sort={sort.key === 'pending' ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                >
                  <div className="rpt-th-with-tooltip" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', width: '100%' }}>
                    <button
                      type="button"
                      className="rpt-sort"
                      onClick={() => setSort((s) => ({ key: 'pending', dir: s.key === 'pending' && s.dir === 'desc' ? 'asc' : 'desc' }))}
                    >
                      Still pending
                      {sort.key === 'pending' && (sort.dir === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />)}
                    </button>
                    <div
                      className="rpt-info-trigger-wrap"
                      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
                      onMouseEnter={() => setShowTooltip(true)}
                      onMouseLeave={() => setShowTooltip(false)}
                    >
                      <button
                        type="button"
                        className="rpt-info-btn"
                        aria-label="Still Pending Information"
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowTooltip((prev) => !prev)
                        }}
                        style={{
                          border: 'none',
                          background: 'none',
                          padding: '2px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          cursor: 'pointer',
                          color: 'var(--text-muted, #64748b)'
                        }}
                      >
                        <Info size={14} />
                      </button>
                      {showTooltip && (
                        <div
                          className="rpt-info-tooltip"
                          role="tooltip"
                          style={{
                            position: 'absolute',
                            bottom: 'calc(100% + 8px)',
                            right: 0,
                            width: '280px',
                            padding: '10px 12px',
                            background: '#0f172a',
                            color: '#ffffff',
                            borderRadius: '8px',
                            fontSize: '12px',
                            lineHeight: '1.45',
                            fontWeight: 400,
                            textAlign: 'left',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)',
                            zIndex: 50,
                            whiteSpace: 'normal',
                            pointerEvents: 'none'
                          }}
                        >
                          Represents the remaining value of unfinished or partially completed treatment plans assigned to this doctor. Completed and cancelled treatments are excluded.
                        </div>
                      )}
                    </div>
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.name}>
                <td style={{ width: canSeeMoney ? '30%' : '38%', overflow: 'hidden' }}>
                  <div className="rpt-doctor-avatar-cell">
                    <div className="rpt-doc-circle">{getInitials(r.name)}</div>
                    <div className="rpt-doc-text">
                      <div className="bill-ellipsis">
                        <strong>{r.name}</strong>
                      </div>
                      {r.specialization && (
                        <div className="bill-ellipsis">
                          <small className="bill-sub">{r.specialization}</small>
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="r" style={{ width: canSeeMoney ? '22%' : '26%' }}>
                  <span className="rpt-inline-bar">
                    <span className="rpt-inline-bar-track" aria-hidden="true">
                      <span className="rpt-bar-fill" style={{ width: r.completed ? `${(r.completed / maxCompleted) * 100}%` : 0 }} />
                    </span>
                    <strong className="rpt-num-bold">{r.completed}</strong>
                  </span>
                </td>
                <td className="r" style={{ width: canSeeMoney ? '15%' : '18%' }}>
                  <strong className="rpt-num-bold">{r.patients}</strong>
                </td>
                <td className="r" style={{ width: canSeeMoney ? '15%' : '18%' }}>
                  {r.missed > 0 ? (
                    <span className="rpt-badge-neutral">{r.missed}</span>
                  ) : (
                    <span style={{ color: 'var(--text-muted, #94a3b8)' }}>0</span>
                  )}
                </td>
                {canSeeMoney && (
                  <td className="r" style={{ width: '18%' }}>
                    {r.pending > 0 ? (
                      <span className="rpt-pending-val">{inr(r.pending)}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted, #94a3b8)' }}>₹0</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DoctorPerformancePage
