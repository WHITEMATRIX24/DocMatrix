import {
  invoiceBalance,
  type AppointmentRecord,
  type InvoiceRecord,
  type PatientRecord,
  type TreatmentPlanRecord
} from '@/services/clinicStore'
import { flattenPayments, localDate } from '@/pages/billing/BillingShared'

/**
 * Report calculations, kept free of React so the summary sentence, the period comparisons
 * and the tabs all read the same numbers.
 */

export interface DateSpan {
  from: string
  to: string
}

export interface ReportData {
  patients: PatientRecord[]
  appointments: AppointmentRecord[]
  invoices: InvoiceRecord[]
  treatmentPlans: TreatmentPlanRecord[]
}

/** A visit in these states has been lost and will not happen unless it is rebooked. */
const MISSED = ['cancelled', 'no-show']

/** Patients not seen for this long are due a recall visit, such as a routine cleaning. */
export const RECALL_DAYS = 180

export const inSpan = (value: string | undefined, span: DateSpan) => {
  if (!value) return false
  const day = value.length === 10 ? value : localDate(value)
  return day >= span.from && day <= span.to
}

export const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0)

export const daysSince = (date: string, today: string = localDate()) =>
  Math.max(0, Math.round((new Date(`${today}T00:00:00`).getTime() - new Date(`${date}T00:00:00`).getTime()) / 86400000))

export function computePeriod(data: ReportData, span: DateSpan) {
  const payments = flattenPayments(data.invoices).filter((p) => inSpan(p.receivedAt, span))
  const invoices = data.invoices.filter((i) => i.status !== 'Void' && inSpan(i.createdAt, span))
  const visits = data.appointments.filter((a) => inSpan(a.date, span))
  const completed = visits.filter((a) => a.status === 'completed')
  const plans = data.treatmentPlans.filter((p) => inSpan(p.date, span))
  const finishedPlans = plans.filter((p) => p.status === 'Completed')

  const cancelled = visits.filter((a) => a.status === 'cancelled').length
  const noShows = visits.filter((a) => a.status === 'no-show').length
  const withOutcome = completed.length + cancelled + noShows

  // New = their first completed visit at this clinic falls inside the period
  const treatedIds = [...new Set(completed.map((a) => a.patientId))]
  const newPatients = treatedIds.filter(
    (id) => !data.appointments.some((a) => a.patientId === id && a.status === 'completed' && a.date < span.from)
  ).length

  const billed = invoices.reduce((s, i) => s + i.amount, 0)

  return {
    collected: payments.reduce((s, p) => s + p.amount, 0),
    paymentCount: payments.length,
    billed,
    invoiceCount: invoices.length,
    unpaid: invoices.reduce((s, i) => s + invoiceBalance(i), 0),
    averageBill: invoices.length ? billed / invoices.length : 0,
    patientsBilled: new Set(invoices.map((i) => i.patientId)).size,
    visitsBooked: visits.length,
    visitsCompleted: completed.length,
    patientsTreated: treatedIds.length,
    newPatients,
    returningPatients: treatedIds.length - newPatients,
    cancelled,
    noShows,
    withOutcome,
    attendedPct: percent(completed.length, withOutcome),
    cancelledPct: percent(cancelled, withOutcome),
    noShowPct: percent(noShows, withOutcome),
    plansMade: plans.length,
    plansValue: plans.reduce((s, p) => s + p.cost, 0),
    plansCompleted: finishedPlans.length,
    plansCompletedPct: percent(finishedPlans.length, plans.length),
    plansCompletedValue: finishedPlans.reduce((s, p) => s + p.cost, 0)
  }
}

export type PeriodMetrics = ReturnType<typeof computePeriod>

const hasUpcomingVisit = (appointments: AppointmentRecord[], patientId: string, today: string) =>
  appointments.some(
    (a) => a.patientId === patientId && a.date >= today && a.status !== 'completed' && !MISSED.includes(a.status)
  )

const lastCompletedVisit = (appointments: AppointmentRecord[], patientId: string, today: string) =>
  appointments
    .filter((a) => a.patientId === patientId && a.status === 'completed' && a.date <= today)
    .map((a) => a.date)
    .sort()
    .pop()

/** Unfinished treatment and nothing booked: the patients most likely to be lost. Longest gap first. */
export function pendingTreatmentPatients(data: ReportData, today: string = localDate()) {
  const open = data.treatmentPlans.filter((p) => p.status !== 'Completed')
  return [...new Set(open.map((p) => p.patientId))]
    .filter((patientId) => !hasUpcomingVisit(data.appointments, patientId, today))
    .map((patientId) => {
      const plans = open.filter((p) => p.patientId === patientId)
      const lastVisit = lastCompletedVisit(data.appointments, patientId, today)
      return {
        patientId,
        plans,
        value: plans.reduce((s, p) => s + p.cost, 0),
        lastVisit,
        since: lastVisit ? daysSince(lastVisit, today) : null
      }
    })
    .sort((a, b) => (b.since ?? 9999) - (a.since ?? 9999) || b.value - a.value)
}

/** Patients not seen for RECALL_DAYS or more, with nothing booked and no unfinished treatment already listed. */
export function recallDuePatients(data: ReportData, today: string = localDate()) {
  const unfinished = new Set(data.treatmentPlans.filter((p) => p.status !== 'Completed').map((p) => p.patientId))
  return data.patients
    .filter((p) => !unfinished.has(p.id) && !hasUpcomingVisit(data.appointments, p.id, today))
    .map((p) => {
      const lastVisit = lastCompletedVisit(data.appointments, p.id, today)
      return { patient: p, lastVisit, since: lastVisit ? daysSince(lastVisit, today) : 0 }
    })
    .filter((r) => r.lastVisit && r.since >= RECALL_DAYS)
    .sort((a, b) => b.since - a.since)
}

/** Cancelled or no-show visits in the period where the patient has no later visit. */
export function missedVisitsToRebook(data: ReportData, span: DateSpan) {
  return data.appointments
    .filter((a) => MISSED.includes(a.status) && inSpan(a.date, span))
    .filter((a) => !data.appointments.some((o) => o.patientId === a.patientId && o.date > a.date && !MISSED.includes(o.status)))
    .sort((a, b) => b.date.localeCompare(a.date))
}

export type ContactReason = 'missed' | 'unfinished' | 'recall'

/**
 * The call list: one row per patient with every reason they need contact.
 * Missed visits follow the selected period; unfinished treatment and recall show today's position.
 * Most urgent first: missed visits, then unfinished treatment, then recall, longest gap first within each.
 */
export function contactList(data: ReportData, span: DateSpan, today: string = localDate()) {
  const missed = missedVisitsToRebook(data, span)
  const unfinished = pendingTreatmentPatients(data, today)
  const recall = recallDuePatients(data, today)

  const ids = [...new Set([...missed.map((a) => a.patientId), ...unfinished.map((r) => r.patientId), ...recall.map((r) => r.patient.id)])]

  return ids
    .map((patientId) => {
      const missedVisits = missed.filter((a) => a.patientId === patientId)
      const pending = unfinished.find((r) => r.patientId === patientId)
      const recallDue = recall.find((r) => r.patient.id === patientId)
      const reasons: ContactReason[] = [
        ...(missedVisits.length ? (['missed'] as const) : []),
        ...(pending ? (['unfinished'] as const) : []),
        ...(recallDue ? (['recall'] as const) : [])
      ]
      const lastVisit = lastCompletedVisit(data.appointments, patientId, today)
      return {
        patientId,
        patient: data.patients.find((p) => p.id === patientId),
        reasons,
        missedVisits,
        plans: pending?.plans || [],
        value: pending?.value || 0,
        lastVisit,
        since: lastVisit ? daysSince(lastVisit, today) : null
      }
    })
    .sort((a, b) => {
      const rank = (r: ContactReason[]) => (r.includes('missed') ? 0 : r.includes('unfinished') ? 1 : 2)
      return rank(a.reasons) - rank(b.reasons) || (b.since ?? 9999) - (a.since ?? 9999) || b.value - a.value
    })
}

export type ContactRow = ReturnType<typeof contactList>[number]
