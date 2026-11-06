import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Ban, Banknote, CreditCard, Printer, Smartphone, X } from 'lucide-react'
import {
  CLINIC_CONFIG,
  invoiceBalance,
  invoicePaidAmount,
  lineItemTotals,
  recordInvoicePayment,
  voidInvoiceRecord,
  type InvoicePayment,
  type InvoiceRecord,
  type PatientRecord,
  type PaymentMode,
} from '@/services/clinicStore'
import './billing.css'

export const PAYMENT_MODES: { id: PaymentMode; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'Cash', icon: Banknote },
  { id: 'Card', icon: CreditCard },
  { id: 'UPI', icon: Smartphone },
]

export const inr = (value: number) =>
  `₹${(Math.round(value * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

/** Local calendar date (YYYY-MM-DD) for an ISO timestamp or now. */
export const localDate = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

export const prettyDate = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

export const patientLabel = (patients: PatientRecord[], id: string) => {
  const p = patients.find((entry) => entry.id === id)
  return p ? `${p.firstName} ${p.lastName}`.trim() : 'Unknown patient'
}

export interface FlatPayment extends InvoicePayment {
  invoiceId: string
  patientId: string
}

/** Every payment across all invoices, newest first. Legacy paid invoices without a log appear as one payment. */
export const usePayments = (invoices: InvoiceRecord[]) =>
  useMemo<FlatPayment[]>(() => {
    const rows: FlatPayment[] = []
    invoices.forEach((inv) => {
      const list = Array.isArray(inv.payments)
        ? inv.payments
        : inv.status === 'Paid'
          ? [{ id: `PAY-${inv.id}`, amount: inv.amount, mode: 'Cash' as PaymentMode, receivedAt: inv.createdAt }]
          : []
      list.forEach((p) => rows.push({ ...p, invoiceId: inv.id, patientId: inv.patientId }))
    })
    return rows.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))
  }, [invoices])

export const StatusPill: React.FC<{ status: InvoiceRecord['status'] }> = ({ status }) => (
  <span className={`bill-pill bill-pill-${status.toLowerCase()}`}>{status}</span>
)

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

/* ── Printable invoice (opens the browser print dialog; "Save as PDF" works there) ── */

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)

export const printInvoice = (invoice: InvoiceRecord, patient?: PatientRecord) => {
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
    .map((p) => `<tr><td>${prettyDate(p.receivedAt)}</td><td>${p.mode}${p.reference ? ` · ${escapeHtml(p.reference)}` : ''}</td><td class="r">${inr(p.amount)}</td></tr>`)
    .join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${invoice.id}</title><style>
    body{font:13px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;color:#0f172a;margin:32px}
    h1{font-size:20px;margin:0}.muted{color:#64748b}.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0b8185;padding-bottom:12px;margin-bottom:16px}
    table{width:100%;border-collapse:collapse;margin:12px 0}th,td{padding:7px 8px;border-bottom:1px solid #e2e8f0;text-align:left}th{background:#f1f5f9;font-size:11px;text-transform:uppercase;letter-spacing:.04em}
    .r{text-align:right}.totals{margin-left:auto;width:280px}.totals td{border:none;padding:3px 8px}.grand td{font-weight:700;font-size:15px;border-top:2px solid #0f172a}
    .tag{display:inline-block;padding:2px 8px;border-radius:99px;font-weight:600;font-size:11px;background:${invoice.status === 'Paid' ? '#dcfce7;color:#166534' : '#fee2e2;color:#b91c1c'}}
  </style></head><body>
    <div class="top"><div><h1>${escapeHtml(CLINIC_CONFIG.clinicName)}</h1><div class="muted">${escapeHtml(CLINIC_CONFIG.clinicAddress)} · ${escapeHtml(CLINIC_CONFIG.clinicPhone)}</div></div>
    <div style="text-align:right"><strong>INVOICE ${invoice.id}</strong><div class="muted">${prettyDate(invoice.createdAt)}</div><span class="tag">${invoice.status}</span></div></div>
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
}> = ({ invoice, patient, onClose, onDone }) => {
  const [paying, setPaying] = useState(false)
  const [isVoiding, setIsVoiding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const balance = invoiceBalance(invoice)
  const items = invoice.items?.length ? invoice.items : null

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !paying && !isVoiding && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, paying, isVoiding])

  const handleVoid = async () => {
    const reason = window.prompt('Please enter the reason for voiding this invoice:')
    if (!reason || !reason.trim()) return
    setIsVoiding(true)
    setError(null)
    try {
      await voidInvoiceRecord(invoice.id, reason.trim())
      if (onDone) onDone()
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to void invoice.')
    } finally {
      setIsVoiding(false)
    }
  }

  return (
    <div className="bill-overlay bill-overlay-side" onMouseDown={onClose}>
      <aside className="bill-drawer" role="dialog" aria-modal="true" aria-label={`Invoice ${invoice.id}`} onMouseDown={(e) => e.stopPropagation()}>
        <header className="bill-dialog-head">
          <div>
            <h2>{invoice.id} <StatusPill status={invoice.status} /></h2>
            <p>
              {patient ? <Link to={`/patients/${patient.id}`}>{patient.firstName} {patient.lastName}</Link> : 'Unknown patient'} · {prettyDate(invoice.createdAt)}
            </p>
          </div>
          <button type="button" className="bill-icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </header>

        <div className="bill-drawer-body">
          {items ? (
            <table className="bill-table bill-table-compact">
              <thead><tr><th>Service</th><th className="r">Qty</th><th className="r">Amount</th></tr></thead>
              <tbody>
                {items.map((item) => {
                  const t = lineItemTotals(item)
                  return (
                    <tr key={item.id}>
                      <td>
                        {item.name}
                        <small className="bill-sub">
                          {inr(item.unitPrice)} each{item.discount ? ` · −${inr(item.discount)}` : ''}{item.gstRate ? ` · GST ${item.gstRate}%` : ''}{item.toothNumber ? ` · Tooth ${item.toothNumber}` : ''}
                        </small>
                      </td>
                      <td className="r">{item.qty}</td>
                      <td className="r">{inr(t.total)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <p className="bill-muted">{invoice.description}</p>
          )}

          <dl className="bill-totals">
            {invoice.subtotal !== undefined && <><dt>Subtotal</dt><dd>{inr(invoice.subtotal)}</dd></>}
            {!!invoice.discountTotal && <><dt>Discount</dt><dd>−{inr(invoice.discountTotal)}</dd></>}
            {!!invoice.taxTotal && <><dt>GST</dt><dd>{inr(invoice.taxTotal)}</dd></>}
            <dt className="bill-grand">Total</dt><dd className="bill-grand">{inr(invoice.amount)}</dd>
            <dt>Paid</dt><dd>{inr(invoicePaidAmount(invoice))}</dd>
            <dt className="bill-due">Balance</dt><dd className="bill-due">{inr(balance)}</dd>
          </dl>

          <h3 className="bill-section-title">Payments</h3>
          {invoice.payments?.length ? (
            <ul className="bill-timeline">
              {invoice.payments.map((p) => (
                <li key={p.id}>
                  <strong>{inr(p.amount)}</strong> by {p.mode}
                  <small className="bill-sub">{prettyDate(p.receivedAt)}{p.reference ? ` · ${p.reference}` : ''}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="bill-muted">{invoice.status === 'Paid' ? 'Marked paid (no payment log).' : 'No payments yet.'}</p>
          )}
          {invoice.notes && <p className="bill-muted">Note: {invoice.notes}</p>}
        </div>

        {error && <p className="bill-error" style={{ margin: '8px 16px' }}>{error}</p>}

        <footer className="bill-dialog-foot">
          <button type="button" className="patient-intake-secondary" onClick={() => printInvoice(invoice, patient)} disabled={isVoiding}>
            <Printer size={15} /> Print / PDF
          </button>
          {invoice.status !== 'Void' && (
            <button type="button" className="patient-intake-secondary" onClick={handleVoid} disabled={isVoiding} title="Void invoice">
              <Ban size={15} /> {isVoiding ? 'Voiding...' : 'Void'}
            </button>
          )}
          {balance > 0 && invoice.status !== 'Void' && (
            <button type="button" className="patient-intake-primary" onClick={() => setPaying(true)} disabled={isVoiding}>
              Collect {inr(balance)}
            </button>
          )}
        </footer>
      </aside>
      {paying && (
        <PaymentDialog
          invoice={invoice}
          patientName={patient ? `${patient.firstName} ${patient.lastName}` : 'Patient'}
          onClose={() => setPaying(false)}
          onDone={(updated) => {
            setPaying(false)
            if (onDone) onDone()
          }}
        />
      )}
    </div>
  )
}
