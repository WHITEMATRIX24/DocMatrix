import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Ban,
  Banknote,
  CreditCard,
  FileText,
  Printer,
  RotateCcw,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react'
import {
  CLINIC_CONFIG,
  computeAgeFromDob,
  DENTAL_TREATMENTS,
  invoiceBalance,
  invoicePaidAmount,
  isInvoiceCancelled,
  lineItemTotals,
  recordInvoicePayment,
  refundInvoicePayment,
  cancelInvoiceRecord,
  removeInvoiceRecord,
  useClinicData,
  voidInvoiceRecord,
  isAuthenticatedClinic,
  isDemoSession,
  type AppointmentRecord,
  type ClinicalNoteRecord,
  type InvoiceLineItem,
  type InvoicePayment,
  type InvoiceRecord,
  type PatientRecord,
  type PaymentMode,
  type TreatmentPlanRecord,
  type TreatmentType,
} from '@/services/clinicStore'
import { effectivePrice, gstRateFor, type ServicePrice } from '@/services/billingStore'
import { getCurrentUser } from '@/services/authService'
import { canVoidInvoice, canCancelInvoice, canCollectPayments, canIssueRefunds } from '@/services/billingPermissions'
import './billing.css'
import './invoiceDrawer.css'

export const PAYMENT_MODES: { id: PaymentMode; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'Cash', icon: Banknote },
  { id: 'Card', icon: CreditCard },
  { id: 'UPI', icon: Smartphone },
]

export const inr = (value: number) =>
  `₹${(Math.round(value * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

/** Local calendar date (YYYY-MM-DD) for an ISO timestamp or now. */
export const localDate = (iso?: string) => {
  if (!iso) {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    return d.toISOString().slice(0, 10)
  }
  if (iso.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return iso
  }
  const d = new Date(iso)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

export const prettyDate = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

export const findPatient = (patients: PatientRecord[], id: string) => {
  if (!id) return undefined
  const lower = id.toLowerCase()
  return patients.find(
    (entry) =>
      entry.id === id ||
      entry.backendId === id ||
      entry.id?.toLowerCase() === lower ||
      entry.backendId?.toLowerCase() === lower
  )
}

export const patientLabel = (patients: PatientRecord[], id: string) => {
  const p = findPatient(patients, id)
  return p ? `${p.firstName} ${p.lastName}`.trim() : 'Unknown patient'
}

export const patientAge = (patient?: PatientRecord): string => {
  if (!patient) return '—'
  const age = computeAgeFromDob(patient.dateOfBirth, patient.age)
  return age ? `${age} yrs` : '—'
}

export interface FlatPayment extends InvoicePayment {
  invoiceId: string
  patientId: string
}

/** Every payment across all invoices, newest first. Legacy paid invoices without a log appear as one payment. */
export const flattenPayments = (invoices: InvoiceRecord[]): FlatPayment[] => {
  const rows: FlatPayment[] = []
  invoices.forEach((inv) => {
    if (inv.status === 'Void') return
    const list = Array.isArray(inv.payments)
      ? inv.payments
      : inv.status === 'Paid'
        ? [{ id: `PAY-${inv.id}`, amount: inv.amount, mode: 'Cash' as PaymentMode, receivedAt: inv.createdAt }]
        : []
    list.forEach((p) => rows.push({ ...p, invoiceId: inv.id, patientId: inv.patientId }))
  })
  return rows.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
}

export const usePayments = (invoices: InvoiceRecord[]) =>
  useMemo<FlatPayment[]>(() => flattenPayments(invoices), [invoices])

export const StatusPill: React.FC<{ status: InvoiceRecord['status'] }> = ({ status }) => {
  const isCancelled = status === 'Void' || status === 'Cancelled'
  const displayStatus = isCancelled ? 'Cancelled' : status
  const pillClass = isCancelled ? 'bill-pill-cancelled' : `bill-pill-${status.toLowerCase()}`
  return <span className={`bill-pill ${pillClass}`}>{displayStatus}</span>
}

/**
 * Builds an InvoiceLineItem from an appointment's treatment information,
 * automatically mapping against billing tariffs, master dental treatments,
 * and patient treatment plans with accurate pricing.
 */
export interface BuildAppointmentLineItemParams {
  appointment: AppointmentRecord
  services: ServicePrice[]
  treatmentPlans?: TreatmentPlanRecord[]
  clinicalNotes?: ClinicalNoteRecord[]
}

export const buildAppointmentLineItem = ({
  appointment,
  services,
  treatmentPlans = [],
  clinicalNotes = [],
}: BuildAppointmentLineItemParams): { lineItem: InvoiceLineItem; treatmentPlanId?: string } | null => {
  // Find linked clinical note (if any)
  const linkedNote = clinicalNotes.find(
    (n) =>
      n.appointmentId &&
      (n.appointmentId === appointment.id ||
        (appointment.backendId && n.appointmentId === appointment.backendId))
  )

  // Identify raw treatment name in priority order:
  // 1. Treatment performed in linked clinical note (actual chairside procedure)
  // 2. Specific treatmentType from appointment
  // 3. Treatment description in linked clinical note
  // 4. Appointment visitType
  const rawTreatment = (
    linkedNote?.treatmentPerformed ||
    appointment.treatmentType ||
    linkedNote?.treatmentDescription ||
    appointment.visitType ||
    ''
  ).trim()

  if (!rawTreatment) return null

  const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const stripParens = (s: string) => s.replace(/\s*\([^)]*\)/g, '').trim()

  const rawClean = clean(rawTreatment)
  const rawCleanNoParens = clean(stripParens(rawTreatment))

  // 1. Check services configured in billing tariffs
  let matchedService = services.find(
    (s) => s.name.trim().toLowerCase() === rawTreatment.toLowerCase()
  )

  if (!matchedService) {
    matchedService = services.find((s) => clean(s.name) === rawClean)
  }

  if (!matchedService && rawCleanNoParens) {
    matchedService = services.find(
      (s) => clean(stripParens(s.name)) === rawCleanNoParens
    )
  }

  if (!matchedService) {
    matchedService = services.find((s) => {
      const sClean = clean(s.name)
      return (
        (rawClean.length >= 4 && sClean.includes(rawClean)) ||
        (sClean.length >= 4 && rawClean.includes(sClean))
      )
    })
  }

  // 2. Check master DENTAL_TREATMENTS catalog
  let matchedDentalTrt: TreatmentType | undefined = DENTAL_TREATMENTS.find(
    (t) => t.name.trim().toLowerCase() === rawTreatment.toLowerCase()
  )
  if (!matchedDentalTrt) {
    matchedDentalTrt = DENTAL_TREATMENTS.find((t) => clean(t.name) === rawClean)
  }
  if (!matchedDentalTrt && rawCleanNoParens) {
    matchedDentalTrt = DENTAL_TREATMENTS.find(
      (t) => clean(stripParens(t.name)) === rawCleanNoParens
    )
  }
  if (!matchedDentalTrt) {
    matchedDentalTrt = DENTAL_TREATMENTS.find((t) => {
      const tClean = clean(t.name)
      return (
        (rawClean.length >= 4 && tClean.includes(rawClean)) ||
        (tClean.length >= 4 && rawClean.includes(tClean))
      )
    })
  }

  // 3. Check treatment plans for this patient
  const matchingPlan = treatmentPlans.find((tp) => {
    const isPatient =
      tp.patientId === appointment.patientId ||
      Boolean(appointment.patientName && (tp as any).patientName === appointment.patientName)
    if (!isPatient) return false
    const pClean = clean(tp.procedure || '')
    return (
      pClean === rawClean ||
      (rawCleanNoParens && clean(stripParens(tp.procedure || '')) === rawCleanNoParens) ||
      (rawClean.length >= 4 && pClean.includes(rawClean)) ||
      (pClean.length >= 4 && rawClean.includes(pClean))
    )
  })

  // Extract tooth number if known
  const toothNumber =
    matchingPlan?.toothNumber ||
    linkedNote?.treatmentToothNumber ||
    (() => {
      const m = (appointment.notes || '').match(/(?:tooth|teeth|#)\s*([0-9]{1,2})/i)
      return m ? m[1] : ''
    })()

  // Determine line item attributes
  let serviceId: string | undefined = undefined
  let name = rawTreatment
  let unitPrice = 0
  let gstRate = 0

  if (matchedService) {
    serviceId = matchedService.id
    name = matchedService.name
    unitPrice = effectivePrice(matchedService)
    gstRate = gstRateFor(matchedService.gstClass)
  } else if (matchedDentalTrt) {
    serviceId = matchedDentalTrt.id
    name = matchedDentalTrt.name
    unitPrice = matchedDentalTrt.standardFee
    gstRate = matchedDentalTrt.category === 'Cosmetic' ? 18 : 0
  } else if (matchingPlan && matchingPlan.cost > 0) {
    name = matchingPlan.procedure
    unitPrice = matchingPlan.cost
    gstRate = matchingPlan.category === 'Cosmetic' ? 18 : 0
  }

  const lineItem: InvoiceLineItem = {
    id: `appt-${appointment.id}-${serviceId || 'custom'}`,
    serviceId,
    name,
    toothNumber: toothNumber || undefined,
    qty: 1,
    unitPrice,
    discount: 0,
    gstRate,
  }

  return {
    lineItem,
    treatmentPlanId: matchingPlan?.id,
  }
}

/* ── Record payment dialog ─────────────────────────────────────────── */

export const PaymentDialog: React.FC<{
  invoice: InvoiceRecord
  patientName: string
  onClose: () => void
  onDone?: (invoice: InvoiceRecord) => void
}> = ({ invoice, patientName, onClose, onDone }) => {
  const balance = invoiceBalance(invoice)
  const [amount, setAmount] = useState(String(balance))
  const [mode, setMode] = useState<PaymentMode>('UPI')
  const [reference, setReference] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !isSubmitting && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, isSubmitting])

  const value = Number(amount)
  const valid = value > 0 && value <= balance

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || isSubmitting) return
    setIsSubmitting(true)
    setError(null)
    try {
      const updated = await recordInvoicePayment(invoice.id, {
        amount: value,
        mode,
        reference: reference.trim() || undefined,
      })
      if (updated && onDone) onDone(updated)
      onClose()
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to record payment. Please try again.'
      setError(Array.isArray(msg) ? msg.join(', ') : String(msg))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bill-overlay" role="dialog" aria-modal="true" aria-label="Record payment" onMouseDown={(e) => { e.stopPropagation(); if (!isSubmitting) onClose() }}>
      <form className="bill-dialog" onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}>
        <header className="bill-dialog-head">
          <div>
            <h2>Record payment</h2>
            <p>{invoice.id} · {patientName}</p>
          </div>
          <button type="button" className="bill-icon-btn" onClick={onClose} disabled={isSubmitting} aria-label="Close"><X size={16} /></button>
        </header>

        <div className="bill-balance-strip">
          <span>Invoice {inr(invoice.amount)}</span>
          <span>Paid {inr(invoicePaidAmount(invoice))}</span>
          <strong>Balance {inr(balance)}</strong>
        </div>

        <label className="bill-field">
          Amount received
          <input type="number" min="1" max={balance} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus required disabled={isSubmitting} />
        </label>
        <div className="bill-quick-amounts">
          <button type="button" onClick={() => setAmount(String(balance))} disabled={isSubmitting}>Full balance</button>
          <button type="button" onClick={() => setAmount(String(Math.round(balance / 2)))} disabled={isSubmitting}>Half</button>
        </div>

        <fieldset className="bill-mode-group">
          <legend>Mode</legend>
          {PAYMENT_MODES.map(({ id, icon: Icon }) => (
            <label key={id} className={`bill-mode${mode === id ? ' is-on' : ''}`}>
              <input type="radio" name="mode" value={id} checked={mode === id} onChange={() => setMode(id)} disabled={isSubmitting} />
              <Icon size={15} /> {id}
            </label>
          ))}
        </fieldset>

        {mode !== 'Cash' && (
          <label className="bill-field">
            {mode === 'UPI' ? 'UPI transaction ID' : 'Card reference'} <span className="bill-optional">optional</span>
            <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder={mode === 'UPI' ? 'e.g. 4482 1093 2210' : 'Last 4 digits / approval code'} disabled={isSubmitting} />
          </label>
        )}

        {value > balance && <p className="bill-error">Amount is more than the balance of {inr(balance)}.</p>}
        {error && <p className="bill-error">{error}</p>}

        <footer className="bill-dialog-foot">
          <button type="button" className="patient-intake-secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button type="submit" className="patient-intake-primary" disabled={!valid || isSubmitting}>
            {isSubmitting ? 'Saving...' : `Save ${valid ? inr(value) : ''} ${value > 0 && value < balance ? '(part payment)' : ''}`}
          </button>
        </footer>
      </form>
    </div>
  )
}

/* ── Cancel invoice confirmation dialog ────────────────────────────── */

export const CancelInvoiceModal: React.FC<{
  invoice: InvoiceRecord
  patientName?: string
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
}> = ({ invoice, patientName, onClose, onConfirm }) => {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const paid = invoicePaidAmount(invoice)
  const isPaid = invoice.status === 'Paid'
  const hasActivePayments = paid > 0 || isPaid

  const quickReasons = [
    'Patient cancelled treatment',
    'Incorrect pricing / tariff',
    'Duplicate billing entry',
    'Billed under wrong patient',
    'Consultation not completed',
  ]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !isSubmitting && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, isSubmitting])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanReason = reason.trim()
    if (!cleanReason) {
      setError('Please provide a cancellation reason before confirming.')
      return
    }
    if (hasActivePayments) {
      setError('Paid invoices cannot be cancelled. If a reversal is needed, please use the refund option.')
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      await onConfirm(cleanReason)
      onClose()
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || 'Failed to cancel invoice. Please try again.'
      setError(Array.isArray(msg) ? msg.join(', ') : String(msg))
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="bill-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-dialog-title"
      onMouseDown={(e) => {
        e.stopPropagation()
        if (!isSubmitting) onClose()
      }}
    >
      <form
        className="bill-dialog bill-cancel-dialog"
        onSubmit={handleSubmit}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="bill-dialog-head">
          <div className="bill-cancel-head-group">
            <div className="bill-cancel-icon-wrap">
              <Ban size={20} />
            </div>
            <div>
              <h2 id="cancel-dialog-title">Cancel Invoice {invoice.id}</h2>
              <p>This action marks the invoice as Cancelled and prohibits further collections.</p>
            </div>
          </div>
          <button
            type="button"
            className="bill-icon-btn"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </header>

        <div className="bill-cancel-summary-strip">
          <div className="bill-cancel-summary-col">
            <span className="bill-cancel-summary-label">Patient</span>
            <strong>{patientName || 'Patient'}</strong>
          </div>
          <div className="bill-cancel-summary-col">
            <span className="bill-cancel-summary-label">Invoice Amount</span>
            <strong>{inr(invoice.amount)}</strong>
          </div>
          <div className="bill-cancel-summary-col">
            <span className="bill-cancel-summary-label">Issued Date</span>
            <span>{prettyDate(invoice.createdAt)}</span>
          </div>
          {hasActivePayments && (
            <div className="bill-cancel-summary-col">
              <span className="bill-cancel-summary-label">Status / Payments</span>
              <strong style={{ color: '#e11d48' }}>{isPaid ? 'Fully Paid' : inr(paid)}</strong>
            </div>
          )}
        </div>

        {hasActivePayments && (
          <div className="bill-error-banner" role="alert" style={{ marginBottom: '14px' }}>
            Paid invoices cannot be cancelled. If a reversal is needed, please use the <strong>Refund</strong> option on payment records.
          </div>
        )}

        <label className="bill-field" htmlFor="cancel-reason-input">
          Cancellation Reason <span className="bill-required" style={{ color: '#e11d48' }}>*</span>
          <textarea
            id="cancel-reason-input"
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              if (error) setError(null)
            }}
            placeholder="Enter the reason for cancelling this invoice (required for audit history)..."
            required
            autoFocus
            disabled={isSubmitting}
          />
        </label>

        <div className="bill-quick-reasons">
          <span className="bill-quick-reasons-label">Suggested reasons:</span>
          <div className="bill-quick-chips">
            {quickReasons.map((r) => (
              <button
                key={r}
                type="button"
                className="bill-quick-chip"
                onClick={() => {
                  setReason(r)
                  if (error) setError(null)
                }}
                disabled={isSubmitting}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bill-error-banner" role="alert">
            {error}
          </div>
        )}

        <footer className="bill-dialog-foot" style={{ marginTop: '16px' }}>
          <button
            type="button"
            className="bill-action-btn bill-action-btn-secondary"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Keep Invoice
          </button>
          <button
            type="submit"
            className="bill-action-btn bill-action-btn-danger-solid"
            disabled={isSubmitting || !reason.trim() || hasActivePayments}
          >
            <Ban size={14} /> {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
          </button>
        </footer>
      </form>
    </div>
  )
}

/* ── Printable invoice (opens the browser print dialog; "Save as PDF" works there) ── */

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)

export const printInvoice = (invoice: InvoiceRecord, patient?: PatientRecord) => {
  let clinicName = CLINIC_CONFIG.clinicName
  try {
    const rawUser =
      (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('docmatrix_auth_user')) ||
      (typeof localStorage !== 'undefined' && localStorage.getItem('docmatrix_auth_user'))
    if (rawUser) {
      const parsed = JSON.parse(rawUser)
      if (parsed?.clinicName) clinicName = parsed.clinicName
      else if (parsed?.clinic?.name) clinicName = parsed.clinic.name
    }
  } catch {}
  const items = invoice.items?.length
    ? invoice.items
    : [{ id: '1', name: invoice.description, qty: 1, unitPrice: invoice.amount, discount: 0, gstRate: 0 }]
  const rows = items
    .map((item, i) => {
      const t = lineItemTotals(item)
      return `<tr><td>${i + 1}</td><td>${escapeHtml(item.name)}${item.toothNumber ? ` <small>(#${escapeHtml(item.toothNumber)})</small>` : ''}</td><td class="r">${item.qty}</td><td class="r">${inr(item.unitPrice)}</td><td class="r">${item.discount ? `−${inr(item.discount)}` : '—'}</td><td class="r">${item.gstRate ? `${item.gstRate}%` : 'Exempt'}</td><td class="r">${inr(t.total)}</td></tr>`
    })
    .join('')
  const paid = invoicePaidAmount(invoice)
  const payments = (invoice.payments || [])
    .map((p) => `<tr><td>${prettyDate(p.receivedAt)}</td><td>${p.mode}${p.amount < 0 ? ' (Refund)' : ''}${p.reference ? ` · ${escapeHtml(p.reference)}` : ''}</td><td class="r">${inr(p.amount)}</td></tr>`)
    .join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${invoice.id}</title><style>
    body{font:13px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;color:#0f172a;margin:32px}
    h1{font-size:20px;margin:0}.muted{color:#64748b}.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0b8185;padding-bottom:12px;margin-bottom:16px}
    table{width:100%;border-collapse:collapse;margin:12px 0}th,td{padding:7px 8px;border-bottom:1px solid #e2e8f0;text-align:left}th{background:#f1f5f9;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
    .r{text-align:right}.totals{margin-left:auto;width:280px}.totals td{border:none;padding:3px 8px}.grand td{font-weight:700;font-size:15px;border-top:2px solid #0f172a}
    .tag{display:inline-block;padding:2px 8px;border-radius:99px;font-weight:600;font-size:11px;background:${invoice.status === 'Paid' ? '#dcfce7;color:#166534' : invoice.status === 'Void' || invoice.status === 'Cancelled' ? '#fee2e2;color:#b91c1c' : '#fef3c7;color:#92400e'}}
  </style></head><body>
    <div class="top"><div><h1>${escapeHtml(clinicName)}</h1><div class="muted">${escapeHtml(CLINIC_CONFIG.clinicAddress)} · ${escapeHtml(CLINIC_CONFIG.clinicPhone)}</div></div>
    <div style="text-align:right"><strong>INVOICE ${invoice.id}</strong><div class="muted">${prettyDate(invoice.createdAt)}</div><span class="tag">${invoice.status === 'Void' || invoice.status === 'Cancelled' ? 'CANCELLED' : invoice.status}</span></div></div>
    ${(invoice.status === 'Void' || invoice.status === 'Cancelled') ? `<div style="background:#fff1f2;border:1px solid #fecdd3;padding:10px 14px;border-radius:8px;margin:12px 0;color:#9f1239;font-size:12px"><strong>CANCELLED INVOICE:</strong> ${escapeHtml(invoice.cancellationReason || invoice.voidReason || 'Cancelled by clinic staff')} (Cancelled on ${prettyDate(invoice.cancelledAt || invoice.voidedAt || invoice.createdAt)})</div>` : ''}
    <div><span class="muted">Billed to</span><br><strong>${escapeHtml(patient ? `${patient.firstName} ${patient.lastName}` : 'Patient')}</strong>${patient?.mobile ? `<br>${escapeHtml(patient.countryCode || '')} ${escapeHtml(patient.mobile)}` : ''}${patient ? `<br><span class="muted">${patient.id}</span>` : ''}</div>
    <table><thead><tr><th>#</th><th>Service</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Discount</th><th class="r">GST</th><th class="r">Amount</th></tr></thead><tbody>${rows}</tbody></table>
    <table class="totals"><tbody>
      <tr><td>Subtotal</td><td class="r">${inr(invoice.subtotal ?? invoice.amount)}</td></tr>
      ${invoice.discountTotal ? `<tr><td>Discount</td><td class="r">−${inr(invoice.discountTotal)}</td></tr>` : ''}
      ${invoice.taxTotal ? `<tr><td>GST</td><td class="r">${inr(invoice.taxTotal)}</td></tr>` : ''}
      <tr class="grand"><td>Total</td><td class="r">${inr(invoice.amount)}</td></tr>
      <tr><td>Paid</td><td class="r">${inr(paid)}</td></tr>
      <tr><td><strong>Balance due</strong></td><td class="r"><strong>${inr(invoiceBalance(invoice))}</strong></td></tr>
    </tbody></table>
    ${payments ? `<h3 style="font-size:13px;margin-top:20px">Payments</h3><table><tbody>${payments}</tbody></table>` : ''}
    ${invoice.notes ? `<p class="muted">${escapeHtml(invoice.notes)}</p>` : ''}
    <p class="muted" style="margin-top:28px;font-size:11px">Clinical dental treatment is exempt from GST; cosmetic services are charged at 18%.</p>
    <script>window.onload=function(){window.print()}</script>
  </body></html>`
  const win = window.open('', '_blank', 'width=820,height=900')
  if (!win) return
  win.document.open()
  win.document.write(html)
  win.document.close()
}

/* ── Invoice detail drawer ─────────────────────────────────────────── */

export const InvoiceDrawer: React.FC<{
  invoice: InvoiceRecord
  patient?: PatientRecord
  onClose: () => void
  onDone?: () => void
}> = ({ invoice: initialInvoice, patient: initialPatient, onClose, onDone }) => {
  const { patients = [], appointments = [], clinicalNotes = [], invoices = [] } = useClinicData()
  // Reactively track updated invoice if it changes in store
  const invoice =
    invoices.find(
      (inv) =>
        inv.id === initialInvoice.id ||
        (initialInvoice.backendId && inv.backendId === initialInvoice.backendId)
    ) || initialInvoice

  const patient = initialPatient || findPatient(patients, invoice.patientId)

  // Resolve linked appointment
  const linkedAppt = useMemo(() => {
    if (invoice.appointmentId) {
      const found = appointments.find(
        (a) => a.id === invoice.appointmentId || a.backendId === invoice.appointmentId
      )
      if (found) return found
    }
    if (invoice.notes) {
      const match = invoice.notes.match(/Appointment:\s*([A-Za-z0-9_-]+)/i)
      if (match) {
        const found = appointments.find(
          (a) => a.id === match[1] || a.backendId === match[1]
        )
        if (found) return found
      }
    }
    const invDate = (invoice.createdAt || '').slice(0, 10)
    return appointments.find((a) => a.patientId === invoice.patientId && a.date === invDate)
  }, [invoice, appointments])

  // Resolve linked clinical note
  const linkedNote = useMemo(() => {
    if (linkedAppt) {
      const note = clinicalNotes.find(
        (n) =>
          n.appointmentId === linkedAppt.id ||
          (n.patientId === linkedAppt.patientId && n.consultationDate === linkedAppt.date)
      )
      if (note) return note
    }
    const invDate = (invoice.createdAt || '').slice(0, 10)
    return clinicalNotes.find(
      (n) => n.patientId === invoice.patientId && n.consultationDate === invDate
    )
  }, [linkedAppt, invoice, clinicalNotes])

  const [paying, setPaying] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [isVoiding, setIsVoiding] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [refundingId, setRefundingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const balance = invoiceBalance(invoice)
  const items = invoice.items?.length ? invoice.items : null

  const isCancelled = invoice.status === 'Void' || invoice.status === 'Cancelled'
  const isPaid = invoice.status === 'Paid'
  const paidAmount = invoicePaidAmount(invoice)
  const hasPayments = paidAmount > 0 || (Array.isArray(invoice.payments) && invoice.payments.some((p) => p.amount > 0))
  const currentUser = getCurrentUser()
  const isDemo = isDemoSession() || !isAuthenticatedClinic()
  const canCancel = isDemo || canCancelInvoice(currentUser?.role)
  const canCollect = isDemo || canCollectPayments(currentUser?.role)
  const canRefund = isDemo || canIssueRefunds(currentUser?.role)
  const canBeCancelled = canCancel && !isCancelled && !isPaid && !hasPayments

  const paymentsList = useMemo(() => {
    if (invoice.payments && invoice.payments.length > 0) return invoice.payments
    if (invoice.status === 'Paid' && invoice.amount > 0) {
      return [
        {
          id: `PAY-${invoice.id}`,
          amount: invoice.amount,
          mode: 'Cash' as PaymentMode,
          receivedAt: invoice.createdAt,
        },
      ]
    }
    return []
  }, [invoice])

  const unrefundedPayments = useMemo(() => {
    const list = paymentsList
    const refundMap = new Set<string>()
    list.forEach((p) => {
      const origId = (p as any).originalPaymentId
      if (origId) refundMap.add(origId)
      if (p.amount < 0 && p.reference) {
        list.forEach((orig) => {
          if (orig.id && p.reference?.includes(orig.id.slice(0, 8))) {
            refundMap.add(orig.id)
          }
        })
      }
    })
    return list.filter((p) => p.amount > 0 && !refundMap.has(p.id))
  }, [paymentsList])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) =>
      e.key === 'Escape' && !paying && !cancelling && !isVoiding && !isRemoving && !refundingId && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, paying, cancelling, isVoiding, isRemoving, refundingId])

  const handleConfirmCancel = async (reason: string) => {
    setIsVoiding(true)
    setError(null)
    try {
      await cancelInvoiceRecord(invoice.id, reason)
      if (onDone) onDone()
    } catch (err: any) {
      setError(err?.message || 'Failed to cancel invoice.')
      throw err
    } finally {
      setIsVoiding(false)
    }
  }

  const handleRemoveInvoice = async () => {
    if (
      !window.confirm(
        `Are you sure you want to permanently remove cancelled invoice ${invoice.id}? This action cannot be undone.`
      )
    ) {
      return
    }
    setError(null)
    setIsRemoving(true)
    try {
      await removeInvoiceRecord(invoice.id)
      if (onDone) onDone()
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to remove invoice.')
      setIsRemoving(false)
    }
  }

  const handleRefund = async (payment: InvoicePayment) => {
    const reason = window.prompt(`Refund ${inr(payment.amount)} (${payment.mode})? Enter reason:`)
    if (!reason || !reason.trim()) return
    setRefundingId(payment.id)
    setError(null)
    try {
      await refundInvoicePayment(invoice.id, payment.id, payment.amount, reason.trim())
    } catch (err: any) {
      setError(err?.message || 'Failed to refund payment.')
    } finally {
      setRefundingId(null)
    }
  }

  /* ── Presentation-only derived values (no billing logic) ── */
  const tone: 'paid' | 'partial' | 'unpaid' | 'cancelled' = isCancelled
    ? 'cancelled'
    : isPaid || (balance <= 0 && invoice.amount > 0)
      ? 'paid'
      : paidAmount > 0
        ? 'partial'
        : 'unpaid'
  const toneLabel = {
    paid: 'Paid',
    partial: 'Partially Paid',
    unpaid: 'Unpaid',
    cancelled: 'Cancelled',
  }[tone]
  const patientName = patient ? `${patient.firstName} ${patient.lastName}`.trim() : 'Unknown Patient'
  const patientInitials =
    patient
      ? `${patient.firstName?.[0] || ''}${patient.lastName?.[0] || ''}`.toUpperCase() || '?'
      : '?'
  const patientCode = (patient as any)?.patientCode || patient?.id || invoice.patientId
  const consultationDate = linkedAppt?.date || linkedNote?.consultationDate || null
  const consultationLabel =
    linkedAppt?.treatmentType ||
    linkedAppt?.visitType ||
    linkedNote?.treatmentPerformed ||
    linkedNote?.consultationType ||
    null
  const rawDoctor = linkedAppt?.doctor || linkedNote?.doctorName || ''
  const attendingDoctor = rawDoctor && rawDoctor !== 'Unassigned' ? rawDoctor : null
  const rows: InvoiceLineItem[] = items || [
    {
      id: 'single',
      name: invoice.description || 'General Dental Treatment',
      qty: 1,
      unitPrice: invoice.amount,
      discount: 0,
      gstRate: 0,
    } as InvoiceLineItem,
  ]
  const serviceCount = rows.length
  const subtotal = invoice.subtotal ?? invoice.amount
  const paidPercent =
    invoice.amount > 0 ? Math.min(100, Math.max(0, Math.round((paidAmount / invoice.amount) * 100))) : 0

  return (
    <div className="bill-overlay bill-overlay-side" onMouseDown={onClose}>
      <aside
        className={`bill-drawer bill-drawer-redesign ivd ivd-tone-${tone}`}
        role="dialog"
        aria-modal="true"
        aria-label={`Invoice ${invoice.id}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <header className="bill-drawer-head ivd-head">
          <div className="ivd-head-main">
            <span className="ivd-head-icon" aria-hidden="true">
              <FileText size={16} />
            </span>
            <div className="ivd-head-titles">
              <span className="ivd-eyebrow">Invoice</span>
              <div className="ivd-head-idrow">
                <h2 className="ivd-number">{invoice.id}</h2>
                <span className={`ivd-status ivd-status-${tone}`}>
                  <span className="ivd-status-dot" aria-hidden="true" />
                  {toneLabel}
                </span>
              </div>
            </div>
          </div>
          <div className="ivd-head-side">
            <dl className="ivd-head-meta">
              <div>
                <dt>Issued</dt>
                <dd>{prettyDate(invoice.createdAt)}</dd>
              </div>
              {invoice.dueDate && (
                <div>
                  <dt>Due</dt>
                  <dd className={balance > 0 && !isCancelled ? 'ivd-due' : undefined}>
                    {prettyDate(invoice.dueDate)}
                  </dd>
                </div>
              )}
            </dl>
            <button
              type="button"
              className="ivd-close"
              onClick={onClose}
              aria-label="Close invoice panel"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="bill-drawer-body ivd-body">
          {/* ── Cancellation notice ── */}
          {isCancelled && (
            <div className="ivd-alert" role="note">
              <Ban size={16} className="ivd-alert-icon" />
              <div className="ivd-alert-text">
                <div className="ivd-alert-title">
                  <strong>Invoice Cancelled</strong>
                  <span>
                    {prettyDate(invoice.cancelledAt || invoice.voidedAt || invoice.createdAt)}
                    {invoice.cancelledBy ? ` · by ${invoice.cancelledBy}` : ''}
                  </span>
                </div>
                <p>
                  <span className="ivd-muted">Reason:</span>{' '}
                  {invoice.cancellationReason || invoice.voidReason || 'Cancellation confirmed by staff'}
                </p>
              </div>
            </div>
          )}

          {/* ── Patient strip ── */}
          <section className="ivd-patient" aria-label="Patient information">
            <div className="ivd-patient-id">
              <span className="ivd-avatar" aria-hidden="true">{patientInitials}</span>
              <div className="ivd-patient-name">
                {patient ? (
                  <Link to={`/patients/${patient.id}`} title="Open patient profile">
                    {patientName}
                  </Link>
                ) : (
                  <span>{patientName}</span>
                )}
                <small>Patient</small>
              </div>
            </div>
            <dl className="ivd-patient-facts">
              <div>
                <dt>Patient ID</dt>
                <dd className="ivd-mono">{patientCode}</dd>
              </div>
              <div>
                <dt>Mobile</dt>
                <dd>
                  {patient?.mobile
                    ? `${patient.countryCode ? `${patient.countryCode} ` : ''}${patient.mobile}`
                    : '—'}
                </dd>
              </div>
              <div>
                <dt>Consultation</dt>
                <dd title={consultationLabel || undefined}>
                  {consultationDate ? prettyDate(consultationDate) : '—'}
                  {consultationLabel && <small className="ivd-fact-sub">{consultationLabel}</small>}
                </dd>
              </div>
              {attendingDoctor && (
                <div>
                  <dt>Doctor</dt>
                  <dd>{attendingDoctor}</dd>
                </div>
              )}
            </dl>
          </section>

          <div className="ivd-grid">
            <div className="ivd-main">
              {/* ── Services & Treatments ── */}
              <section className="ivd-section ivd-area-items">
                <div className="ivd-section-head">
                  <h3 className="ivd-section-title">Services &amp; Treatments</h3>
                  <span className="ivd-count">
                    {serviceCount} service{serviceCount === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="ivd-table-scroll">
                  <table className="ivd-table ivd-items">
                    <colgroup>
                      <col className="ivd-col-idx" />
                      <col />
                      <col className="ivd-col-tooth" />
                      <col className="ivd-col-qty" />
                      <col className="ivd-col-money" />
                      <col className="ivd-col-money" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th scope="col">#</th>
                        <th scope="col">Service / Treatment</th>
                        <th scope="col" className="c">Tooth</th>
                        <th scope="col" className="r">Qty</th>
                        <th scope="col" className="r">Rate</th>
                        <th scope="col" className="r">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((item, idx) => {
                        const t = lineItemTotals(item)
                        return (
                          <tr key={item.id || idx}>
                            <td className="ivd-idx">{idx + 1}</td>
                            <td>
                              <span className="ivd-item-name">{item.name}</span>
                              {(item.discount > 0 || item.gstRate > 0) && (
                                <span className="ivd-item-meta">
                                  {item.discount > 0 && <>Discount −{inr(item.discount)}</>}
                                  {item.discount > 0 && item.gstRate > 0 && ' · '}
                                  {item.gstRate > 0 && <>GST {item.gstRate}%</>}
                                </span>
                              )}
                            </td>
                            <td className="c">
                              {item.toothNumber ? (
                                <span className="ivd-tooth">{item.toothNumber}</span>
                              ) : (
                                <span className="ivd-muted">—</span>
                              )}
                            </td>
                            <td className="r ivd-num">{item.qty || 1}</td>
                            <td className="r ivd-num">{inr(item.unitPrice)}</td>
                            <td className="r ivd-num ivd-strong">{inr(t.total)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* ── Payment History ── */}
              <section className="ivd-section ivd-area-payments">
                <div className="ivd-section-head">
                  <h3 className="ivd-section-title">Payment History</h3>
                  {paymentsList.length > 0 && (
                    <span className="ivd-count">
                      {paymentsList.length} transaction{paymentsList.length === 1 ? '' : 's'}
                    </span>
                  )}
                </div>
                {paymentsList.length > 0 ? (
                  <div className="ivd-table-scroll">
                    <table className="ivd-table ivd-payments">
                      <thead>
                        <tr>
                          <th scope="col">Date</th>
                          <th scope="col">Method</th>
                          <th scope="col">Reference</th>
                          <th scope="col" className="r">Amount</th>
                          <th scope="col">Status</th>
                          <th scope="col" className="r">
                            <span className="ivd-sr">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paymentsList.map((p) => {
                          const isRefund = p.amount < 0 || p.type === 'REFUND'
                          const alreadyRefunded =
                            !isRefund &&
                            paymentsList.some(
                              (other) =>
                                (other.amount < 0 || other.type === 'REFUND') &&
                                other.reference?.includes(p.id.slice(0, 8))
                            )
                          const ModeIcon =
                            p.mode === 'Card' ? CreditCard : p.mode === 'UPI' ? Smartphone : Banknote
                          const payState = isRefund ? 'refund' : alreadyRefunded ? 'refunded' : 'received'
                          return (
                            <tr key={p.id} className={isRefund ? 'is-refund' : undefined}>
                              <td className="ivd-nowrap">{prettyDate(p.receivedAt)}</td>
                              <td>
                                <span className="ivd-method">
                                  <ModeIcon size={13} />
                                  {p.mode}
                                </span>
                              </td>
                              <td className="ivd-ref" title={p.reference || p.id}>
                                {p.reference || <span className="ivd-muted">—</span>}
                              </td>
                              <td className={`r ivd-num ivd-strong ${isRefund ? 'ivd-neg' : ''}`}>
                                {isRefund ? `−${inr(Math.abs(p.amount))}` : inr(p.amount)}
                              </td>
                              <td>
                                <span className={`ivd-paystate ivd-paystate-${payState}`}>
                                  {payState === 'refund'
                                    ? 'Refund'
                                    : payState === 'refunded'
                                      ? 'Refunded'
                                      : 'Received'}
                                </span>
                              </td>
                              <td className="r">
                                {!isRefund && !alreadyRefunded && !isCancelled && canRefund && (
                                  <button
                                    type="button"
                                    className="ivd-link-btn"
                                    onClick={() => handleRefund(p)}
                                    disabled={Boolean(refundingId)}
                                    title="Refund payment"
                                  >
                                    <RotateCcw size={12} />
                                    {refundingId === p.id ? 'Refunding...' : 'Refund'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="ivd-empty-hint">
                    <span>No payment transactions recorded yet.</span>
                  </div>
                )}
              </section>

              {/* ── Notes (only when present) ── */}
              {invoice.notes && invoice.notes.trim() && (
                <section className="ivd-section ivd-area-notes">
                  <h3 className="ivd-section-title">Notes</h3>
                  <p className="ivd-notes">{invoice.notes}</p>
                </section>
              )}
            </div>

            {/* ── Financial Summary ── */}
            <aside className="ivd-summary ivd-area-summary" aria-label="Financial summary">
              <h3 className="ivd-section-title">Financial Summary</h3>
              <dl className="ivd-sum-rows">
                <div>
                  <dt>Subtotal</dt>
                  <dd>{inr(subtotal)}</dd>
                </div>
                <div>
                  <dt>Discount</dt>
                  <dd className={invoice.discountTotal ? 'ivd-neg' : 'ivd-muted'}>
                    {invoice.discountTotal ? `−${inr(invoice.discountTotal)}` : '—'}
                  </dd>
                </div>
                {invoice.taxTotal ? (
                  <div>
                    <dt>Tax (GST)</dt>
                    <dd>{inr(invoice.taxTotal)}</dd>
                  </div>
                ) : null}
              </dl>
              <div className="ivd-grand">
                <span>Grand Total</span>
                <strong>{inr(invoice.amount)}</strong>
              </div>
              <dl className="ivd-sum-rows">
                <div>
                  <dt>Amount Paid</dt>
                  <dd className={paidAmount > 0 ? 'ivd-pos' : undefined}>{inr(paidAmount)}</dd>
                </div>
              </dl>
              <div className={`ivd-balance ivd-balance-${tone}`}>
                <div className="ivd-balance-top">
                  <span>{tone === 'cancelled' ? 'Balance' : 'Outstanding Balance'}</span>
                  <strong>{isCancelled ? 'Cancelled' : inr(balance)}</strong>
                </div>
                {!isCancelled && invoice.amount > 0 && (
                  <div
                    className="ivd-progress"
                    role="progressbar"
                    aria-label="Amount collected"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={paidPercent}
                  >
                    <span style={{ width: `${paidPercent}%` }} />
                  </div>
                )}
                <small>
                  {tone === 'cancelled'
                    ? 'No further payments can be collected.'
                    : tone === 'paid'
                      ? 'Fully settled — nothing due.'
                      : tone === 'partial'
                        ? `${paidPercent}% collected · ${inr(balance)} pending`
                        : 'Awaiting payment at the billing counter.'}
                </small>
              </div>
            </aside>
          </div>
        </div>

        {error && (
          <div className="bill-error-banner ivd-error" role="alert">
            {error}
          </div>
        )}

        {/* ── Actions ── */}
        <footer className="bill-drawer-footer ivd-footer">
          <div className="ivd-footer-group">
            <button
              type="button"
              className="ivd-btn ivd-btn-secondary"
              onClick={() => printInvoice(invoice, patient)}
              disabled={isVoiding}
              title="Print or export PDF invoice"
            >
              <Printer size={15} /> Print / PDF
            </button>
            {canRefund && unrefundedPayments.length > 0 && !isCancelled && (
              <button
                type="button"
                className="ivd-btn ivd-btn-secondary"
                onClick={() => handleRefund(unrefundedPayments[0])}
                disabled={Boolean(refundingId)}
                title="Refund payment"
              >
                <RotateCcw size={14} /> {refundingId ? 'Refunding...' : 'Refund'}
              </button>
            )}
            {canBeCancelled && (
              <button
                type="button"
                className="ivd-btn ivd-btn-danger"
                onClick={() => setCancelling(true)}
                disabled={isVoiding}
                title="Cancel this invoice with audit reason"
              >
                <Ban size={15} /> {isVoiding ? 'Cancelling...' : 'Cancel Invoice'}
              </button>
            )}
            {canCancel && isCancelled && (
              <button
                type="button"
                className="ivd-btn ivd-btn-danger"
                onClick={handleRemoveInvoice}
                disabled={isRemoving}
                title="Permanently remove this cancelled invoice"
              >
                <Trash2 size={15} /> {isRemoving ? 'Removing...' : 'Remove Invoice'}
              </button>
            )}
          </div>
          <div className="ivd-footer-group ivd-footer-primary">
            <button type="button" className="ivd-btn ivd-btn-secondary" onClick={onClose}>
              Close
            </button>
            {canCollect && balance > 0 && !isCancelled && (
              <button
                type="button"
                className="ivd-btn ivd-btn-primary"
                onClick={() => setPaying(true)}
                disabled={isVoiding}
              >
                <CreditCard size={15} /> Collect {inr(balance)}
              </button>
            )}
          </div>
        </footer>
      </aside>
      {cancelling && (
        <CancelInvoiceModal
          invoice={invoice}
          patientName={patient ? `${patient.firstName} ${patient.lastName}` : undefined}
          onClose={() => setCancelling(false)}
          onConfirm={handleConfirmCancel}
        />
      )}
      {paying && (
        <PaymentDialog
          invoice={invoice}
          patientName={patient ? `${patient.firstName} ${patient.lastName}` : 'Patient'}
          onClose={() => setPaying(false)}
          onDone={() => {
            setPaying(false)
            if (onDone) onDone()
          }}
        />
      )}
    </div>
  )
}
