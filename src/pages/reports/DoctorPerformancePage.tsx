import React, { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Info } from 'lucide-react'
import { DENTISTS, isAuthenticatedClinic, isDemoSession, useClinicData } from '@/services/clinicStore'
import { useClinicStaff } from '@/services/clinicStaffStore'
import { reportsApi, type BackendDoctorRow } from '@/services/reportsApi'
import { inr } from '@/pages/billing/BillingShared'
import { ReportActions, StatTile, inRange, previousSpan, useMoneyAccess, useReportRange } from './ReportsShared'
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

      <div className="rpt-tiles" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', alignItems: 'stretch' }}>
        <StatTile
          label="Visits completed"
          value={now.visitsCompleted}
          sub={busiest && busiest.completed > 0 ? `Most: ${busiest.name}` : undefined}
          tone="ok"
          compare={{ current: now.visitsCompleted, previous: before.visitsCompleted, kind: 'count', goodWhen: 'up' }}
        />
        <StatTile
          label="Patients seen"
          value={now.patientsTreated}
          compare={{ current: now.patientsTreated, previous: before.patientsTreated, kind: 'count', goodWhen: 'up' }}
        />
      </div>

      <div className="bill-table-wrap rpt-doctor-table-wrap">
        <table className="bill-table rpt-doctor-table" style={{ tableLayout: 'fixed', width: '100%', minWidth: '680px' }}>
          <colgroup>
            <col style={{ width: canSeeMoney ? '32%' : '38%' }} />
            <col style={{ width: canSeeMoney ? '22%' : '26%' }} />
            <col style={{ width: canSeeMoney ? '15%' : '18%' }} />
            <col style={{ width: canSeeMoney ? '15%' : '18%' }} />
            {canSeeMoney && <col style={{ width: '16%' }} />}
          </colgroup>
          <thead>
            <tr>
              {header('name', 'Doctor', false, canSeeMoney ? '32%' : '38%')}
              {header('completed', 'Visits completed', true, canSeeMoney ? '22%' : '26%')}
              {header('patients', 'Patients seen', true, canSeeMoney ? '15%' : '18%')}
              {header('missed', 'Cancelled / no-show', true, canSeeMoney ? '15%' : '18%')}
              {canSeeMoney && (
                <th
                  className="r"
                  style={{ width: '16%' }}
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
                <td style={{ width: canSeeMoney ? '32%' : '38%', overflow: 'hidden' }}>
                  <div className="bill-ellipsis">
                    <strong>{r.name}</strong>
                  </div>
                  {r.specialization && (
                    <div className="bill-ellipsis">
                      <small className="bill-sub">{r.specialization}</small>
                    </div>
                  )}
                </td>
                <td className="r" style={{ width: canSeeMoney ? '22%' : '26%' }}>
                  <span className="rpt-inline-bar">
                    <span className="rpt-inline-bar-track" aria-hidden="true">
                      <span className="rpt-bar-fill" style={{ width: r.completed ? `${(r.completed / maxCompleted) * 100}%` : 0 }} />
                    </span>
                    <strong>{r.completed}</strong>
                  </span>
                </td>
                <td className="r" style={{ width: canSeeMoney ? '15%' : '18%' }}>{r.patients}</td>
                <td className="r" style={{ width: canSeeMoney ? '15%' : '18%' }}>{r.missed}</td>
                {canSeeMoney && <td className="r" style={{ width: '16%' }}>{inr(r.pending)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DoctorPerformancePage
