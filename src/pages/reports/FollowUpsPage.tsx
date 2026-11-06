import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarPlus, Check, CheckCircle2, Clock, MessageCircle, Phone, ShieldAlert, Undo2, UserX, XCircle } from 'lucide-react'
import { useClinicData, type PatientRecord } from '@/services/clinicStore'
import { isRecentlyContacted, markContacted, undoContacted, useContactLog } from '@/services/followUpStore'
import { inr, prettyDate } from '@/pages/billing/BillingShared'
import { RankedBars, ReportActions, StatTile, digitsOnly, inRange, pct, plural, previousSpan, useMoneyAccess, useReportRange, type RankedItem } from './ReportsShared'
import { computePeriod, contactList, type ContactReason, type ContactRow } from './reportMetrics'

const OPEN_STATUSES = ['scheduled', 'confirmed', 'checked-in', 'in-progress']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const REASONS: Record<ContactReason, { label: string; pill: string }> = {
  missed: { label: 'Missed visit', pill: 'bill-pill-unpaid' },
  unfinished: { label: 'Unfinished treatment', pill: 'bill-pill-partial' },
  recall: { label: 'Recall due', pill: 'bill-pill-mode' }
}

type Filter = 'all' | ContactReason | 'contacted'

const alertText = (p: PatientRecord) =>
  [
    p.allergies === 'yes' && p.allergiesDetails && `Allergy: ${p.allergiesDetails}`,
    p.conditions === 'yes' && p.conditionsDetails && `Condition: ${p.conditionsDetails}`,
    p.medications === 'yes' && p.medicationsDetails && `Medication: ${p.medicationsDetails}`
  ]
    .filter(Boolean)
    .join(' · ')

/** Adds the tooth or area to a procedure name, unless the name already includes it. */
const planLabel = (procedure: string, tooth?: string) => {
  const where = (tooth || '').trim()
  if (!where || procedure.includes(where)) return procedure
  return `${procedure} (${/^\d{2}$/.test(where) ? `tooth ${where}` : where})`
}

/** A starting message for staff to check and send. It names no treatment, because phones can be shared. */
const whatsappMessage = (row: ContactRow) => {
  const name = row.patient?.firstName || ''
  if (row.reasons.includes('missed')) {
    return `Hello ${name}, we missed you at your dental appointment on ${prettyDate(row.missedVisits[0].date)}. Please reply to this message to book a new time.`
  }
  if (row.reasons.includes('unfinished')) {
    return `Hello ${name}, your dental treatment with us is not finished yet. Please reply to this message to book your next visit.`
  }
  return `Hello ${name}, it has been about ${Math.floor((row.since || 0) / 30)} months since your last dental visit. Please reply to this message to book a check-up.`
}

const ContactLinks: React.FC<{ patient?: PatientRecord; message: string }> = ({ patient, message }) => {
  if (!patient?.mobile) return null
  const digits = digitsOnly(`${patient.countryCode || '+91'}${patient.mobile}`)
  return (
    <span className="rpt-contact">
      <a href={`tel:+${digits}`} aria-label={`Call ${patient.firstName}`} title="Call"><Phone size={14} /></a>
      <a href={`https://wa.me/${digits}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${patient.firstName}`} title="WhatsApp, with a message ready to check and send"><MessageCircle size={14} /></a>
    </span>
  )
}

export const FollowUpsPage: React.FC = () => {
  const range = useReportRange()
  const canSeeMoney = useMoneyAccess()
  const { patients, appointments, treatmentPlans, invoices } = useClinicData()
  const contactLog = useContactLog()
  const [filter, setFilter] = useState<Filter>('all')

  const data = useMemo(() => ({ patients, appointments, treatmentPlans, invoices }), [patients, appointments, treatmentPlans, invoices])
  const rows = useMemo(() => contactList(data, range), [data, range])
  const toContact = rows.filter((r) => !isRecentlyContacted(contactLog[r.patientId]))
  const contacted = rows.filter((r) => isRecentlyContacted(contactLog[r.patientId]))

  const visibleRows = filter === 'contacted' ? contacted : filter === 'all' ? toContact : toContact.filter((r) => r.reasons.includes(filter))
  const filters: { id: Filter; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: toContact.length },
    ...(Object.keys(REASONS) as ContactReason[]).map((id) => ({ id, label: REASONS[id].label, count: toContact.filter((r) => r.reasons.includes(id)).length })),
    { id: 'contacted', label: 'Contacted', count: contacted.length }
  ]

  const { now, before } = useMemo(
    () => ({ now: computePeriod(data, range), before: computePeriod(data, previousSpan(range)) }),
    [data, range]
  )
  const canCompare = Boolean(now.withOutcome && before.withOutcome)
  const visits = useMemo(() => appointments.filter((a) => inRange(a.date, range)), [appointments, range])
  const openVisits = visits.filter((a) => OPEN_STATUSES.includes(a.status)).length
  const walkIns = visits.filter((a) => a.isWalkIn).length

  // Status always carries an icon and a count as well as a colour
  const outcomes = [
    { key: 'completed', label: 'Completed', value: now.visitsCompleted, icon: CheckCircle2 },
    { key: 'cancelled', label: 'Cancelled', value: now.cancelled, icon: XCircle },
    { key: 'no-show', label: 'No-show', value: now.noShows, icon: UserX },
    { key: 'open', label: 'Still open', value: openVisits, icon: Clock }
  ]

  const weekdays = useMemo<RankedItem[]>(() => {
    const counts = new Array(7).fill(0)
    visits.filter((a) => a.status !== 'cancelled').forEach((a) => counts[new Date(`${a.date}T00:00:00`).getDay()]++)
    return [1, 2, 3, 4, 5, 6, 0].map((d) => ({ key: String(d), label: WEEKDAYS[d], value: counts[d], display: String(counts[d]) }))
  }, [visits])

  const visitTypes = useMemo<RankedItem[]>(() => {
    const counts = new Map<string, number>()
    visits.forEach((a) => counts.set(a.visitType || 'Other', (counts.get(a.visitType || 'Other') || 0) + 1))
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, value]) => ({ key: label, label, value, display: `${value} · ${pct(value, visits.length)}%` }))
  }, [visits])

  const alertPatients = useMemo(() => {
    const ids = new Set(appointments.filter((a) => a.status === 'completed' && inRange(a.date, range)).map((a) => a.patientId))
    return patients.filter((p) => ids.has(p.id) && alertText(p))
  }, [appointments, patients, range])

  const nameOf = (row: ContactRow) => (row.patient ? `${row.patient.firstName} ${row.patient.lastName}`.trim() : 'Unknown patient')
  const waitingValue = toContact.reduce((s, r) => s + r.value, 0)

  const csvRows = [
    ...rows.map((r) => [
      r.reasons.map((reason) => REASONS[reason].label).join(' + '),
      nameOf(r),
      r.plans.map((p) => planLabel(p.procedure, p.toothNumber)).join('; '),
      ...(canSeeMoney ? [r.value || ''] : []),
      r.lastVisit || '',
      contactLog[r.patientId] && isRecentlyContacted(contactLog[r.patientId]) ? prettyDate(contactLog[r.patientId]) : '',
      ''
    ]),
    ...outcomes.map((o) => ['Visit outcome', o.label, '', ...(canSeeMoney ? [''] : []), '', '', o.value])
  ]

  return (
    <div className="rpt-page" data-testid="feature-page-rep.followups">
      <div className="rpt-toolbar">
        <ReportActions
          filename="follow-ups-and-bookings"
          headers={['Reason', 'Patient or outcome', 'Treatment', ...(canSeeMoney ? ['Value'] : []), 'Last visit', 'Contacted', 'Visits']}
          rows={csvRows}
        />
      </div>

      <div className="rpt-tiles">
        <StatTile
          label="Patients to contact"
          value={toContact.length}
          sub={[canSeeMoney && waitingValue > 0 ? `${inr(waitingValue)} of treatment waiting` : '', contacted.length ? `${contacted.length} already contacted` : ''].filter(Boolean).join(' · ') || undefined}
          tone={toContact.length ? 'bad' : 'ok'}
        />
        <StatTile
          label="Attended"
          value={`${now.attendedPct}%`}
          sub={now.withOutcome ? `${now.visitsCompleted} of ${now.withOutcome} with an outcome` : 'No outcomes yet'}
          tone="ok"
          compare={canCompare ? { current: now.attendedPct, previous: before.attendedPct, kind: 'points', goodWhen: 'up' } : undefined}
        />
        <StatTile
          label="No-shows"
          value={`${now.noShowPct}%`}
          sub={plural(now.noShows, 'visit')}
          tone={now.noShows ? 'bad' : undefined}
          compare={canCompare ? { current: now.noShowPct, previous: before.noShowPct, kind: 'points', goodWhen: 'down' } : undefined}
        />
        <StatTile
          label="Cancelled"
          value={`${now.cancelledPct}%`}
          sub={plural(now.cancelled, 'visit')}
          compare={canCompare ? { current: now.cancelledPct, previous: before.cancelledPct, kind: 'points', goodWhen: 'down' } : undefined}
        />
      </div>

      <article className="bill-card">
        <div className="rpt-calls-head">
          <h2 className="bill-section-title">Patients to contact</h2>
          <div className="bill-segment" role="group" aria-label="Filter patients to contact">
            {filters.map((f) => (
              <button key={f.id} type="button" className={filter === f.id ? 'is-on' : ''} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.label} {f.count}
              </button>
            ))}
          </div>
        </div>

        {visibleRows.length ? (
          <ul className="rpt-calls">
            {visibleRows.map((row) => {
              const alert = row.patient ? alertText(row.patient) : ''
              const firstName = row.patient?.firstName || 'patient'
              const contactedAt = contactLog[row.patientId]
              return (
                <li key={row.patientId} className="rpt-call">
                  <div className="rpt-call-who">
                    <Link to={`/patients/${row.patientId}`}>{nameOf(row)}</Link>
                    {alert && <span className="rpt-alert" title={alert}><ShieldAlert size={12} aria-hidden="true" /> Medical alert</span>}
                    <small className="bill-sub">
                      {row.lastVisit ? `Last visit ${prettyDate(row.lastVisit)}${row.since ? ` · ${row.since} days ago` : ' · today'}` : 'No visit yet'}
                    </small>
                  </div>

                  <div className="rpt-call-why">
                    <div className="rpt-call-reasons">
                      {row.reasons.map((reason) => (
                        <span key={reason} className={`bill-pill ${REASONS[reason].pill}`}>{REASONS[reason].label}</span>
                      ))}
                    </div>
                    {row.missedVisits.map((a) => (
                      <span key={a.id} className="rpt-call-detail">
                        {a.treatmentType || a.visitType} · {prettyDate(a.date)} · {a.status === 'no-show' ? 'No-show' : 'Cancelled'}
                      </span>
                    ))}
                    {row.plans.map((p) => (
                      <span key={p.id} className="rpt-call-detail">{planLabel(p.procedure, p.toothNumber)} · {p.status}</span>
                    ))}
                    {filter === 'contacted' && contactedAt && <span className="rpt-call-detail">Contacted {prettyDate(contactedAt)}</span>}
                  </div>

                  <div className="rpt-call-actions">
                    {canSeeMoney && row.value > 0 && <span className="rpt-call-value">{inr(row.value)}</span>}
                    <ContactLinks patient={row.patient} message={whatsappMessage(row)} />
                    {filter === 'contacted' ? (
                      <button type="button" className="patient-intake-secondary bill-btn-sm" aria-label={`Undo contacted for ${firstName}`} onClick={() => undoContacted(row.patientId)}>
                        <Undo2 size={13} /> Undo
                      </button>
                    ) : (
                      <button type="button" className="patient-intake-secondary bill-btn-sm" aria-label={`Mark ${firstName} as contacted`} onClick={() => markContacted(row.patientId)}>
                        <Check size={13} /> Contacted
                      </button>
                    )}
                    <Link className="patient-intake-primary bill-btn-sm" to={`/appointments/new?patientId=${row.patientId}`}>
                      <CalendarPlus size={13} /> Book
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="bill-empty">
            <CheckCircle2 size={22} />
            <h2>{filter === 'contacted' ? 'Nobody marked as contacted in the last 7 days' : 'Nobody to contact here'}</h2>
          </div>
        )}
      </article>

      <h2 className="rpt-group-title">How visits went</h2>

      <article className="bill-card">
        <h2 className="bill-section-title">
          What happened to booked visits <span className="bill-count">{visits.length}{walkIns ? ` · ${plural(walkIns, 'walk-in')}` : ''}</span>
        </h2>
        {visits.length ? (
          <>
            <div className="rpt-segbar" role="img" aria-label={outcomes.map((o) => `${o.label} ${o.value}`).join(', ')}>
              {outcomes.filter((o) => o.value > 0).map((o) => (
                <span key={o.key} className={`rpt-seg rpt-seg-${o.key}`} style={{ flexGrow: o.value }} title={`${o.label}: ${o.value}`} />
              ))}
            </div>
            <ul className="rpt-legend">
              {outcomes.map((o) => {
                const Icon = o.icon
                return (
                  <li key={o.key}>
                    <span className={`rpt-swatch rpt-seg-${o.key}`} aria-hidden="true" />
                    <Icon size={14} />
                    <span>{o.label}</span>
                    <strong>{o.value}</strong>
                    <small>{pct(o.value, visits.length)}%</small>
                  </li>
                )
              })}
            </ul>
          </>
        ) : (
          <p className="rpt-muted">No appointments in this period.</p>
        )}
      </article>

      <div className="bill-grid">
        <article className="bill-card">
          <h2 className="bill-section-title">New and returning patients treated</h2>
          <RankedBars
            items={[
              { key: 'new', label: 'New patients', value: now.newPatients, display: String(now.newPatients) },
              { key: 'returning', label: 'Returning patients', value: now.returningPatients, display: String(now.returningPatients) }
            ]}
            empty="No patients were treated in this period."
          />
        </article>

        <article className="bill-card">
          <h2 className="bill-section-title"><ShieldAlert size={15} className="rpt-title-icon" /> Medical-alert patients treated <span className="bill-count">{alertPatients.length}</span></h2>
          {alertPatients.length ? (
            <ul className="bill-list">
              {alertPatients.map((p) => (
                <li key={p.id}>
                  <Link to={`/patients/${p.id}`}>
                    <span>
                      <strong>{p.firstName} {p.lastName}</strong>
                      <small className="bill-sub">{alertText(p)}</small>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rpt-muted">None in this period.</p>
          )}
        </article>

        <article className="bill-card">
          <h2 className="bill-section-title">Busiest days (excluding cancelled)</h2>
          <RankedBars items={weekdays} empty="No appointments in this period." />
        </article>

        <article className="bill-card">
          <h2 className="bill-section-title">Type of visit</h2>
          <RankedBars items={visitTypes} empty="No appointments in this period." />
        </article>
      </div>
    </div>
  )
}

export default FollowUpsPage
