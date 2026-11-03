import React, { useMemo, useState } from 'react'
import { Pencil, Plus, Search, X } from 'lucide-react'
import { effectivePrice, gstRateFor, saveService, toggleServiceActive, useBillingData, type GstClass, type ServicePrice } from '@/services/billingStore'
import { inr } from './BillingShared'

type Draft = { id?: string; name: string; category: string; price: string; offerPrice: string; gstClass: GstClass; active: boolean }

const blank: Draft = { name: '', category: 'General', price: '', offerPrice: '', gstClass: 'treatment', active: true }

const toDraft = (s: ServicePrice): Draft => ({
  id: s.id,
  name: s.name,
  category: s.category,
  price: String(s.price),
  offerPrice: s.offerPrice ? String(s.offerPrice) : '',
  gstClass: s.gstClass,
  active: s.active,
})

export const PriceListPage: React.FC = () => {
  const { services } = useBillingData()
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const categories = useMemo(() => [...new Set(services.map((s) => s.category))].sort(), [services])

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase()
    const map = new Map<string, ServicePrice[]>()
    services
      .filter((s) => !q || s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q))
      .forEach((s) => map.set(s.category, [...(map.get(s.category) || []), s]))
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [services, query])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft) return
    const price = Number(draft.price)
    const offer = Number(draft.offerPrice)
    if (!draft.name.trim() || !(price > 0)) return
    saveService({
      id: draft.id,
      name: draft.name.trim(),
      category: draft.category.trim() || 'General',
      price,
      offerPrice: offer > 0 && offer < price ? offer : undefined,
      gstClass: draft.gstClass,
      active: draft.active,
    })
    setDraft(null)
  }

  const offerInvalid = draft && Number(draft.offerPrice) > 0 && Number(draft.offerPrice) >= Number(draft.price)

  return (
    <div className="bill-page" data-testid="feature-page-bill.price-list">
      <div className="bill-toolbar">
        <label className="bill-search">
          <Search size={15} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search services" />
        </label>
        <button className="patient-intake-primary" onClick={() => setDraft({ ...blank })}><Plus size={15} /> Add service</button>
      </div>

      {draft && (
        <form className="bill-card bill-service-form" onSubmit={submit}>
          <header className="bill-card-head">
            <h2>{draft.id ? 'Edit service' : 'New service'}</h2>
            <button type="button" className="bill-icon-btn" onClick={() => setDraft(null)} aria-label="Cancel"><X size={16} /></button>
          </header>
          <div className="bill-form-grid">
            <label className="bill-field bill-span-2">Service name<input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required autoFocus /></label>
            <label className="bill-field">Category
              <input list="bill-categories" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
              <datalist id="bill-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            </label>
            <label className="bill-field">Price ₹<input type="number" min="1" step="0.01" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} required /></label>
            <label className="bill-field">Offer price ₹ <span className="bill-optional">optional</span><input type="number" min="0" step="0.01" value={draft.offerPrice} onChange={(e) => setDraft({ ...draft, offerPrice: e.target.value })} /></label>
            <div className="bill-field">GST type
              <div className="bill-segment">
                <button type="button" className={draft.gstClass === 'treatment' ? 'is-on' : ''} onClick={() => setDraft({ ...draft, gstClass: 'treatment' })}>Treatment · exempt</button>
                <button type="button" className={draft.gstClass === 'cosmetic' ? 'is-on' : ''} onClick={() => setDraft({ ...draft, gstClass: 'cosmetic' })}>Cosmetic · 18%</button>
              </div>
            </div>
          </div>
          {offerInvalid && <p className="bill-error">Offer price must be lower than the regular price.</p>}
          <footer className="bill-dialog-foot">
            <button type="button" className="patient-intake-secondary" onClick={() => setDraft(null)}>Cancel</button>
            <button type="submit" className="patient-intake-primary" disabled={Boolean(offerInvalid)}>Save service</button>
          </footer>
        </form>
      )}

      {grouped.map(([category, list]) => (
        <section key={category} className="bill-card bill-price-group">
          <h2 className="bill-section-title">{category} <span className="bill-count">{list.length}</span></h2>
          <ul className="bill-price-list">
            {list.map((s) => {
              const price = effectivePrice(s)
              const rate = gstRateFor(s.gstClass)
              return (
                <li key={s.id} className={s.active ? '' : 'is-off'}>
                  <span className="bill-price-name">
                    <strong>{s.name}</strong>
                    <span className={`bill-pill ${s.gstClass === 'cosmetic' ? 'bill-pill-partial' : 'bill-pill-mode'}`}>{s.gstClass === 'cosmetic' ? 'Cosmetic · GST 18%' : 'Treatment · exempt'}</span>
                    {!s.active && <span className="bill-pill bill-pill-unpaid">Hidden</span>}
                  </span>
                  <span className="bill-price-amount">
                    {price < s.price && <s className="bill-muted">{inr(s.price)}</s>}
                    <strong>{inr(price)}</strong>
                    {rate > 0 && <small className="bill-sub">{inr(price * (1 + rate / 100))} incl. GST</small>}
                  </span>
                  <span className="bill-price-actions">
                    <button className="bill-icon-btn" onClick={() => setDraft(toDraft(s))} aria-label={`Edit ${s.name}`}><Pencil size={14} /></button>
                    <label className="bill-switch" title={s.active ? 'Shown when billing' : 'Hidden from billing'}>
                      <input type="checkbox" checked={s.active} onChange={() => toggleServiceActive(s.id)} aria-label={`${s.name} available for billing`} />
                      <span />
                    </label>
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      {!grouped.length && <p className="bill-muted">No services match “{query}”.</p>}
    </div>
  )
}

export default PriceListPage
