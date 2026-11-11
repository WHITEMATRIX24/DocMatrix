import React, { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { DENTISTS, isAuthenticatedClinic, isDemoSession, useClinicData } from '@/services/clinicStore'
import { useClinicStaff } from '@/services/clinicStaffStore'
import { reportsApi, type BackendDoctorRow } from '@/services/reportsApi'
import { inr } from '@/pages/billing/BillingShared'
import { ReportActions, StatTile, inRange, previousSpan, useMoneyAccess, useReportRange } from './ReportsShared'
import { computePeriod } from './reportMetrics'

type SortKey = 'name' | 'completed' | 'patients' | 'missed' | 'treatments' | 'value' | 'pending'

interface DoctorRow {
  name: string
  specialization: string
  scheduled: number
  completed: number
  patients: number
  missed: number
  treatments: number
  value: number
  pending: number
}

export const DoctorPerformancePage: React.FC = () => {
  const range = useReportRange()
  const canSeeMoney = useMoneyAccess()
  const { patients, invoices, appointments, treatmentPlans } = useClinicData()
  const { doctors: staffDoctors } = useClinicStaff()
  const [backendDoctors, setBackendDoctors] = useState<BackendDoctorRow[] | null>(null)

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
    const names = new Set<string>(
      isAuth
        ? staffDoctors.map((d) => d.name).filter(Boolean)
        : DENTISTS.map((d) => d.name)
    )
    appointments.forEach((a) => a.doctor && a.doctor !== 'Unassigned' && names.add(a.doctor))
    treatmentPlans.forEach((p) => p.doctor && p.doctor !== 'Unassigned' && names.add(p.doctor))
    if (backendDoctors) {
      backendDoctors.forEach((d) => d.doctor && d.doctor !== 'Unassigned' && names.add(d.doctor))
    }

    return [...names].map((name) => {
      const appts = appointments.filter((a) => a.doctor === name && inRange(a.date, range))
      const done = appts.filter((a) => a.status === 'completed')
      const plans = treatmentPlans.filter((p) => p.doctor === name)
      const finished = plans.filter((p) => p.status === 'Completed' && inRange(p.date, range))
      return {
        name,
        specialization: DENTISTS.find((d) => d.name === name)?.specialization || '',
        scheduled: appts.length,
        completed: done.length,
        patients: new Set(done.map((a) => a.patientId)).size,
        missed: appts.filter((a) => a.status === 'cancelled' || a.status === 'no-show').length,
        treatments: finished.length,
        value: finished.reduce((s, p) => s + p.cost, 0),
        pending: plans.filter((p) => p.status !== 'Completed').reduce((s, p) => s + p.cost, 0)
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

  const header = (key: SortKey, label: string, right = true) => (
    <th className={right ? 'r' : undefined} aria-sort={sort.key === key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="rpt-sort" onClick={() => setSort((s) => ({ key, dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))}>
        {label}
        {sort.key === key && (sort.dir === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />)}
      </button>
    </th>
  )

  return (
    <div className="rpt-page" data-testid="feature-page-rep.doctors">
      <div className="rpt-toolbar">
        <ReportActions
          filename="doctors"
          headers={['Doctor', 'Visits completed', 'Patients seen', 'Cancelled or no-show', 'Treatments completed', ...(canSeeMoney ? ['Treatment value completed', 'Treatment still pending'] : [])]}
          rows={sorted.map((r) => [r.name, r.completed, r.patients, r.missed, r.treatments, ...(canSeeMoney ? [r.value, r.pending] : [])])}
        />
      </div>

      <div className="rpt-tiles">
        <StatTile label="Visits completed" value={now.visitsCompleted} sub={busiest && busiest.completed > 0 ? `Most: ${busiest.name}` : undefined} tone="ok" compare={{ current: now.visitsCompleted, previous: before.visitsCompleted, kind: 'count', goodWhen: 'up' }} />
        <StatTile label="Patients seen" value={now.patientsTreated} compare={{ current: now.patientsTreated, previous: before.patientsTreated, kind: 'count', goodWhen: 'up' }} />
        <StatTile label="Treatments completed" value={now.plansCompleted} compare={{ current: now.plansCompleted, previous: before.plansCompleted, kind: 'count', goodWhen: 'up' }} />
        {canSeeMoney && <StatTile label="Treatment value completed" value={inr(now.plansCompletedValue)} compare={{ current: now.plansCompletedValue, previous: before.plansCompletedValue, kind: 'money', goodWhen: 'up' }} />}
      </div>

      <div className="bill-table-wrap">
        <table className="bill-table rpt-doctor-table">
          <thead>
            <tr>
              {header('name', 'Doctor', false)}
              {header('completed', 'Visits completed')}
              {header('patients', 'Patients seen')}
              {header('missed', 'Cancelled / no-show')}
              {header('treatments', 'Treatments done')}
              {canSeeMoney && header('value', 'Treatment value done')}
              {canSeeMoney && header('pending', 'Still pending')}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.name}>
                <td>
                  <strong>{r.name}</strong>
                  {r.specialization && <small className="bill-sub">{r.specialization}</small>}
                </td>
                <td className="r">
                  <span className="rpt-inline-bar">
                    <span className="rpt-inline-bar-track" aria-hidden="true">
                      <span className="rpt-bar-fill" style={{ width: r.completed ? `${(r.completed / maxCompleted) * 100}%` : 0 }} />
                    </span>
                    <strong>{r.completed}</strong>
                  </span>
                </td>
                <td className="r">{r.patients}</td>
                <td className="r">{r.missed}</td>
                <td className="r">{r.treatments}</td>
                {canSeeMoney && <td className="r">{inr(r.value)}</td>}
                {canSeeMoney && <td className="r">{inr(r.pending)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canSeeMoney && <p className="rpt-footnote">
        Treatment value comes from treatment plans marked completed in this period. Invoices are not linked to a doctor yet, so billing is
        reported on the Revenue tab. “Still pending” is the value of each dentist’s unfinished treatment plans today.
      </p>}
    </div>
  )
}

export default DoctorPerformancePage
