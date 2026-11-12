import React, { useMemo, useState } from 'react'
import { CheckCircle2, Phone, Search } from 'lucide-react'
import { invoiceBalance, invoicePaidAmount, useClinicData, type InvoiceRecord } from '@/services/clinicStore'
import {
  InvoiceDrawer,
  PaymentDialog,
  StatusPill,
  findPatient,
  inr,
  localDate,
  patientAge,
  patientLabel,
  prettyDate,
} from './BillingShared'

const BUCKETS = [
  { id: 'all', label: 'All', min: 0, max: Infinity },
  { id: '0-30', label: '0–30 days', min: 0, max: 30 },
  { id: '31-60', label: '31–60 days', min: 31, max: 60 },
  { id: '60+', label: '60+ days', min: 61, max: Infinity },
] as const

const STATUS_FILTERS: { id: 'All' | InvoiceRecord['status']; label: string }[] = [
  { id: 'All', label: 'All Dues' },
  { id: 'Unpaid', label: 'Unpaid' },
  { id: 'Partial', label: 'Partial' },
]

const daysSinceInvoice = (iso: string) => {
  const start = new Date(`${localDate(iso)}T00:00:00`).getTime()
  const now = new Date(`${localDate()}T00:00:00`).getTime()
  return Math.max(0, Math.round((now - start) / 86400000))
}

const formatDaysSince = (days: number) => {
  if (days === 0) return 'Today'
  if (days === 1) return '1 day ago'
  return `${days}d ago`
}

export const PendingDuesPage: React.FC = () => {
  const { invoices, patients } = useClinicData()
  const [bucket, setBucket] = useState<(typeof BUCKETS)[number]['id']>('all')
  const [statusFilter, setStatusFilter] = useState<'All' | InvoiceRecord['status']>('All')
  const [query, setQuery] = useState('')
  const [payingId, setPayingId] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const open = useMemo(
    () =>
      invoices
        .filter((inv) => invoiceBalance(inv) > 0)
        .map((inv) => ({ inv, daysSince: daysSinceInvoice(inv.createdAt) })),
    [invoices]
  )

  const bucketTotals = useMemo(
    () =>
      Object.fromEntries(
        BUCKETS.map((b) => [
          b.id,
          open
            .filter((r) => r.daysSince >= b.min && r.daysSince <= b.max)
            .reduce((s, r) => s + invoiceBalance(r.inv), 0),
        ])
      ) as Record<string, number>,
    [open]
  )

  const active = BUCKETS.find((b) => b.id === bucket)!
  const q = query.trim().toLowerCase()

  const rows = useMemo(
    () =>
      open
        .filter((r) => r.daysSince >= active.min && r.daysSince <= active.max)
        .filter((r) => statusFilter === 'All' || r.inv.status === statusFilter)
        .filter((r) => {
          if (!q) return true
          const p = findPatient(patients, r.inv.patientId)
          const pName = patientLabel(patients, r.inv.patientId).toLowerCase()
          const phone = `${p?.countryCode || ''} ${p?.mobile || ''}`.toLowerCase()
          return (
            r.inv.id.toLowerCase().includes(q) ||
            pName.includes(q) ||
            phone.includes(q) ||
            (p?.id || '').toLowerCase().includes(q)
          )
        })
        .sort((a, b) => b.daysSince - a.daysSince),
    [open, active, statusFilter, q, patients]
  )

  const paying = invoices.find((inv) => inv.id === payingId)
  const opened = invoices.find((inv) => inv.id === openId)

  return (
    <div className="bill-page" data-testid="feature-page-bill.dues">
      <div className="bill-aging" role="group" aria-label="Filter dues by age">
        {BUCKETS.map((b) => (
          <button
            key={b.id}
            className={`bill-aging-card${bucket === b.id ? ' is-on' : ''}`}
            onClick={() => setBucket(b.id)}
          >
            <span>{b.label}</span>
            <strong>{inr(bucketTotals[b.id])}</strong>
          </button>
        ))}
      </div>

      <div className="bill-toolbar">
        <label className="bill-search">
          <Search size={15} />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by patient name, phone, or invoice #"
            aria-label="Search outstanding dues"
          />
        </label>
        <div className="bill-seg" role="tablist" aria-label="Filter dues by invoice status">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={statusFilter === s.id}
              className={statusFilter === s.id ? 'is-on' : ''}
              onClick={() => setStatusFilter(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length ? (
        <div className="bill-table-wrap">
          <table className="bill-table bill-dues-table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Patient Age</th>
                <th>Invoice</th>
                <th>Status</th>
                <th className="r">Total Billed</th>
                <th className="r">Amount Paid</th>
                <th className="r">Outstanding Balance</th>
                <th className="r">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ inv, daysSince }) => {
                const p = findPatient(patients, inv.patientId)
                const balance = invoiceBalance(inv)
                const paid = invoicePaidAmount(inv)
                return (
                  <tr key={inv.id}>
                    <td>
                      <div className="bill-dues-patient">
                        <strong>{patientLabel(patients, inv.patientId)}</strong>
                        {p?.mobile ? (
                          <a
                            className="bill-sub bill-tel"
                            href={`tel:${p.countryCode || ''}${p.mobile}`}
                          >
                            <Phone size={11} /> {p.countryCode} {p.mobile}
                          </a>
                        ) : (
                          <span className="bill-sub">No phone on file</span>
                        )}
                      </div>
                    </td>
                    <td className="bill-dues-age" data-testid={`dues-patient-age-${inv.id}`}>
                      <span>{patientAge(p)}</span>
                    </td>
                    <td>
                      <div className="bill-dues-invoice">
                        <button className="bill-link" onClick={() => setOpenId(inv.id)}>
                          {inv.id}
                        </button>
                        <small className="bill-sub">
                          {prettyDate(inv.createdAt)} · {formatDaysSince(daysSince)}
                        </small>
                      </div>
                    </td>
                    <td>
                      <StatusPill status={inv.status} />
                    </td>
                    <td className="r">{inr(inv.amount)}</td>
                    <td className="r bill-dues-paid">{inr(paid)}</td>
                    <td className="r">
                      <span className="bill-balance-highlight">{inr(balance)}</span>
                    </td>
                    <td className="r">
                      <button
                        className="patient-intake-primary bill-btn-sm"
                        onClick={() => setPayingId(inv.id)}
                      >
                        Collect
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bill-empty">
          <CheckCircle2 size={22} />
          <h2>No dues {bucket === 'all' ? '' : `in ${active.label}`}</h2>
          <p>Every invoice matching the selected filter is fully paid.</p>
        </div>
      )}

      {paying && (
        <PaymentDialog
          invoice={paying}
          patientName={patientLabel(patients, paying.patientId)}
          onClose={() => setPayingId(null)}
          onDone={() => setPayingId(null)}
        />
      )}
      {opened && (
        <InvoiceDrawer
          invoice={opened}
          patient={findPatient(patients, opened.patientId)}
          onClose={() => setOpenId(null)}
          onDone={() => setOpenId(null)}
        />
      )}
    </div>
  )
}

export default PendingDuesPage
