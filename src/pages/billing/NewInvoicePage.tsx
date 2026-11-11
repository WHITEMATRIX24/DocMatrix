import React, { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ClipboardList, FilePlus2, Plus, Trash2 } from 'lucide-react'
import { createItemisedInvoice, lineItemTotals, useClinicData, type InvoiceLineItem, type PaymentMode } from '@/services/clinicStore'
import { effectivePrice, gstRateFor, useBillingData } from '@/services/billingStore'
import { PAYMENT_MODES, findPatient, inr } from './BillingShared'

let rowSeq = 0
const rowId = () => `L${Date.now().toString(36)}${(rowSeq++).toString(36)}`

export const NewInvoicePage: React.FC = () => {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { patients, treatmentPlans } = useClinicData()
  const { services } = useBillingData()
  const activeServices = useMemo(() => services.filter((s) => s.active), [services])

  const [patientId, setPatientId] = useState(params.get('patientId') || '')
  const [items, setItems] = useState<InvoiceLineItem[]>([])
  const [serviceToAdd, setServiceToAdd] = useState('')
  const [notes, setNotes] = useState('')
  const [collectNow, setCollectNow] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payMode, setPayMode] = useState<PaymentMode>('UPI')
  const [payRef, setPayRef] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const patient = findPatient(patients, patientId)
  const planSuggestions = useMemo(
    () => treatmentPlans.filter((t) => (t.patientId === patientId || t.patientId === patient?.id || t.patientId === patient?.backendId) && t.status !== 'Completed' && !items.some((i) => i.id === `plan-${t.id}`)),
    [treatmentPlans, patientId, patient, items]
  )

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const t = lineItemTotals(item)
        acc.subtotal += t.gross
        acc.discount += Math.min(item.discount, t.gross)
        acc.tax += t.tax
        acc.total += t.total
        return acc
      },
      { subtotal: 0, discount: 0, tax: 0, total: 0 }
    )
  }, [items])

  const addService = (id: string) => {
    const service = services.find((s) => s.id === id)
    if (!service) return
    setItems((list) => [
      ...list,
      {
        id: rowId(),
        serviceId: service.id,
        name: service.name,
        qty: 1,
        unitPrice: effectivePrice(service),
        discount: 0,
        gstRate: gstRateFor(service.gstClass),
      },
    ])
    setServiceToAdd('')
  }

  const addFromPlan = (planId: string) => {
    const plan = treatmentPlans.find((t) => t.id === planId)
    if (!plan) return
    setItems((list) => [
      ...list,
      { id: `plan-${plan.id}`, name: plan.procedure, toothNumber: plan.toothNumber, qty: 1, unitPrice: plan.cost, discount: 0, gstRate: plan.category === 'Cosmetic' ? 18 : 0 },
    ])
  }

  const addCustom = () => setItems((list) => [...list, { id: rowId(), name: '', qty: 1, unitPrice: 0, discount: 0, gstRate: 0 }])

  const update = (id: string, patch: Partial<InvoiceLineItem>) =>
    setItems((list) => list.map((item) => (item.id === id ? { ...item, ...patch } : item)))

  const remove = (id: string) => setItems((list) => list.filter((item) => item.id !== id))

  const validItems = items.filter((i) => i.name.trim() && i.qty > 0 && i.unitPrice >= 0)
  const payValue = Number(payAmount) || 0
  const canSave = Boolean(patient) && validItems.length > 0 && validItems.length === items.length && totals.total > 0 && (!collectNow || (payValue > 0 && payValue <= totals.total)) && !isSubmitting

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave || isSubmitting) return
    setIsSubmitting(true)
    setSubmitError(null)
    try {
      const invoice = await createItemisedInvoice({
        patientId,
        items: items.map((i) => ({ ...i, name: i.name.trim(), discount: Math.min(i.discount, i.qty * i.unitPrice) })),
        appointmentId: params.get('appointmentId') || undefined,
        notes: notes.trim() || undefined,
        upfrontPayment: collectNow ? { amount: payValue, mode: payMode, reference: payRef.trim() || undefined } : undefined,
      })
      navigate(`/billing/invoices?open=${invoice.id}`)
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create invoice. Please try again.'
      setSubmitError(Array.isArray(msg) ? msg.join(', ') : String(msg))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!patients.length) {
    return (
      <div className="bill-empty" data-testid="feature-page-bill.invoice-new">
        <FilePlus2 size={22} />
        <h2>Register a patient to begin</h2>
        <p>Invoices are linked to patient records.</p>
        <Link className="patient-intake-primary" to="/patients/new">Add patient</Link>
      </div>
    )
  }

  return (
    <form className="bill-composer" onSubmit={save} data-testid="feature-page-bill.invoice-new">
      <div className="bill-composer-main">
        <section className="bill-card">
          <label className="bill-field">
            Patient
            <select value={patientId} onChange={(e) => setPatientId(e.target.value)} required>
              <option value="" disabled>Select patient</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName} · {p.mobile || p.id}</option>
              ))}
            </select>
          </label>

          {planSuggestions.length > 0 && (
            <div className="bill-suggest">
              <span><ClipboardList size={14} /> From treatment plan</span>
              {planSuggestions.map((t) => (
                <button type="button" key={t.id} onClick={() => addFromPlan(t.id)}>
                  + {t.procedure}{t.toothNumber ? ` (#${t.toothNumber})` : ''} · {inr(t.cost)}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="bill-card">
          <header className="bill-card-head">
            <h2>Services</h2>
            <div className="bill-add-row">
              <select value={serviceToAdd} onChange={(e) => addService(e.target.value)} aria-label="Add service">
                <option value="">+ Add service…</option>
                {activeServices.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} — {inr(effectivePrice(s))}{s.gstClass === 'cosmetic' ? ' + GST' : ''}</option>
                ))}
              </select>
              <button type="button" className="patient-intake-secondary" onClick={addCustom}><Plus size={14} /> Custom line</button>
            </div>
          </header>

          {items.length ? (
            <div className="bill-lines">
              <div className="bill-line bill-line-head" aria-hidden="true">
                <span>Service</span><span>Tooth</span><span>Qty</span><span>Rate ₹</span><span>Discount ₹</span><span>GST</span><span className="r">Amount</span><span />
              </div>
              {items.map((item) => (
                <div className="bill-line" key={item.id}>
                  <input
                    aria-label="Service"
                    value={item.name}
                    onChange={(e) => {
                      const newName = e.target.value
                      const origService = services.find((s) => s.id === item.serviceId)
                      const isRenamed = origService && origService.name !== newName
                      update(item.id, {
                        name: newName,
                        ...(isRenamed ? { serviceId: undefined } : {}),
                      })
                    }}
                    placeholder="Service name"
                    required
                  />
                  <input aria-label="Tooth" value={item.toothNumber || ''} onChange={(e) => update(item.id, { toothNumber: e.target.value })} placeholder="—" />
                  <input aria-label="Quantity" type="number" min="1" value={item.qty} onChange={(e) => update(item.id, { qty: Math.max(1, Number(e.target.value) || 1) })} />
                  <input aria-label="Rate" type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => update(item.id, { unitPrice: Math.max(0, Number(e.target.value) || 0) })} />
                  <input aria-label="Discount" type="number" min="0" step="0.01" value={item.discount} onChange={(e) => update(item.id, { discount: Math.max(0, Number(e.target.value) || 0) })} />
                  <select aria-label="GST" value={item.gstRate} onChange={(e) => update(item.id, { gstRate: Number(e.target.value) })}>
                    <option value={0}>Exempt</option>
                    <option value={18}>18%</option>
                  </select>
                  <strong className="r">{inr(lineItemTotals(item).total)}</strong>
                  <button type="button" className="bill-icon-btn" onClick={() => remove(item.id)} aria-label={`Remove ${item.name || 'line'}`}><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          ) : (
            <p className="bill-muted">Add a service, an item from the patient's treatment plan, or a custom line.</p>
          )}
        </section>

        <section className="bill-card">
          <label className="bill-field">
            Note on invoice <span className="bill-optional">optional</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Balance payable at next sitting" />
          </label>
        </section>
      </div>

      <aside className="bill-composer-side">
        <section className="bill-card bill-sticky">
          <h2 className="bill-section-title">Summary</h2>
          <dl className="bill-totals">
            <dt>Subtotal</dt><dd>{inr(totals.subtotal)}</dd>
            <dt>Discount</dt><dd>−{inr(totals.discount)}</dd>
            <dt>GST</dt><dd>{inr(totals.tax)}</dd>
            <dt className="bill-grand">Total</dt><dd className="bill-grand">{inr(totals.total)}</dd>
          </dl>

          <label className="bill-check">
            <input type="checkbox" checked={collectNow} onChange={(e) => { setCollectNow(e.target.checked); if (e.target.checked && !payAmount) setPayAmount(String(totals.total)) }} />
            Collect payment now
          </label>

          {collectNow && (
            <div className="bill-collect">
              <label className="bill-field">
                Amount
                <input type="number" min="1" max={totals.total} step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
              </label>
              <div className="bill-mode-group">
                {PAYMENT_MODES.map(({ id, icon: Icon }) => (
                  <label key={id} className={`bill-mode${payMode === id ? ' is-on' : ''}`}>
                    <input type="radio" name="paymode" checked={payMode === id} onChange={() => setPayMode(id)} />
                    <Icon size={14} /> {id}
                  </label>
                ))}
              </div>
              {payMode !== 'Cash' && (
                <input className="bill-input" value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder={payMode === 'UPI' ? 'UPI transaction ID (optional)' : 'Card ref (optional)'} />
              )}
              {payValue > 0 && payValue < totals.total && <p className="bill-muted">Part payment — {inr(totals.total - payValue)} will show under Dues.</p>}
              {payValue > totals.total && <p className="bill-error">More than the invoice total.</p>}
            </div>
          )}

          {submitError && <p className="bill-error">{submitError}</p>}
          <button type="submit" className="patient-intake-primary bill-block" disabled={!canSave || isSubmitting}>
            {isSubmitting ? 'Creating invoice...' : `Create invoice ${totals.total > 0 ? inr(totals.total) : ''}`}
          </button>
          {!patient && <p className="bill-muted">Select a patient to continue.</p>}
        </section>
      </aside>
    </form>
  )
}

export default NewInvoicePage
