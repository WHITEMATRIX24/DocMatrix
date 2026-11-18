import React, { useMemo, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { Calendar, FileText, Plus, RotateCcw, Search } from 'lucide-react'
import {
  invoiceBalance,
  useClinicData,
  type InvoiceRecord,
} from '@/services/clinicStore'
import {
  InvoiceDrawer,
  StatusPill,
  findPatient,
  inr,
  localDate,
  patientLabel,
  prettyDate,
} from './BillingShared'

const FILTERS: Array<'All' | InvoiceRecord['status']> = ['All', 'Unpaid', 'Partial', 'Paid', 'Cancelled']

export const InvoicesPage: React.FC = () => {
  const { patients, invoices } = useClinicData()
  const [params] = useSearchParams()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All')
  const [openId, setOpenId] = useState<string | null>(params.get('open'))

  const todayStr = useMemo(() => localDate(), [])

  // Date scope: 'all' | 'today' | 'custom'
  const [dateScope, setDateScope] = useState<'all' | 'today' | 'custom'>(() => {
    const d = params.get('date')
    if (d === 'today') return 'today'
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d === todayStr ? 'today' : 'custom'
    return 'all'
  })

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = params.get('date')
    if (d === 'today') return todayStr
    if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d
    return ''
  })

  // Count of invoices created today
  const todayCount = useMemo(() => {
    return invoices.filter((inv) => localDate(inv.createdAt) === todayStr).length
  }, [invoices, todayStr])

  const handleSelectToday = () => {
    setDateScope('today')
    setSelectedDate(todayStr)
  }

  const handleSelectAll = () => {
    setDateScope('all')
    setSelectedDate('')
  }

  const handleDateChange = (dateVal: string) => {
    if (!dateVal) {
      handleSelectAll()
      return
    }
    if (dateVal === todayStr) {
      setDateScope('today')
      setSelectedDate(todayStr)
    } else {
      setDateScope('custom')
      setSelectedDate(dateVal)
    }
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return invoices.filter((inv) => {
      // 1. Date filter
      if (dateScope === 'today') {
        if (localDate(inv.createdAt) !== todayStr) return false
      } else if (dateScope === 'custom' && selectedDate) {
        if (localDate(inv.createdAt) !== selectedDate) return false
      }

      // 2. Status filter
      if (filter !== 'All') {
        if (filter === 'Cancelled') {
          if (inv.status !== 'Cancelled' && inv.status !== 'Void') return false
        } else {
          if (inv.status !== filter) return false
        }
      }

      // 3. Search query filter
      if (!q) return true
      return [inv.id, inv.description, patientLabel(patients, inv.patientId)].some((v) =>
        v.toLowerCase().includes(q)
      )
    })
  }, [invoices, patients, query, filter, dateScope, selectedDate, todayStr])

  // Check if an active invoice already exists for this appointment
  const existingApptInvoice = useMemo(() => {
    const apptId = params.get('appointmentId')
    if (!apptId) return null
    return invoices.find(
      (inv) =>
        inv.status !== 'Void' &&
        inv.status !== 'Cancelled' &&
        (inv.appointmentId === apptId || (inv.notes && inv.notes.includes(apptId)))
    )
  }, [invoices, params])

  // "Generate invoice" links from appointments land here with a patient or appointment preselected:
  // If an invoice already exists for this consultation, open it directly in the drawer for payment!
  // Otherwise send to composer to create new invoice.
  if (params.get('patientId') || params.get('appointmentId')) {
    if (existingApptInvoice) {
      if (openId !== existingApptInvoice.id) {
        setOpenId(existingApptInvoice.id)
      }
    } else {
      return <Navigate to={`/billing/invoices/new?${params.toString()}`} replace />
    }
  }

  const open = invoices.find((inv) => inv.id === openId)

  return (
    <div className="bill-page" data-testid="feature-page-bill.invoices">
      <div className="bill-toolbar">
        <label className="bill-search">
          <Search size={15} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search patient, invoice no. or service"
          />
        </label>

        <div className="bill-toolbar-actions">
          {/* Date scope tabs & date picker */}
          <div className="bill-date-filter-group">
            <div className="bill-segment" role="tablist" aria-label="Filter by date scope">
              <button
                type="button"
                role="tab"
                aria-selected={dateScope === 'all'}
                className={dateScope === 'all' ? 'is-on' : ''}
                onClick={handleSelectAll}
                title="View all invoices"
              >
                All
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={dateScope === 'today'}
                className={dateScope === 'today' ? 'is-on' : ''}
                onClick={handleSelectToday}
                title="View invoices generated today"
              >
                Today
                {todayCount > 0 && <span className="bill-count-pill">{todayCount}</span>}
              </button>
            </div>

            <div className="bill-date-picker-wrap" title="Select specific date">
              <Calendar size={14} className="bill-date-picker-icon" />
              <input
                type="date"
                value={selectedDate}
                max={todayStr}
                onChange={(e) => handleDateChange(e.target.value)}
                aria-label="Select invoice date"
                className="bill-date-input"
              />
              {dateScope === 'custom' && (
                <button
                  type="button"
                  className="bill-return-today-pill"
                  onClick={handleSelectToday}
                  title="Return to today's invoices"
                >
                  <RotateCcw size={12} /> Return to Today
                </button>
              )}
            </div>
          </div>

          {/* Status filters */}
          <div className="bill-segment" role="group" aria-label="Filter by status">
            {FILTERS.map((f) => (
              <button
                key={f}
                className={filter === f ? 'is-on' : ''}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {rows.length ? (
        <div className="bill-table-wrap">
          <table className="bill-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Patient</th>
                <th>Services</th>
                <th className="r">Total</th>
                <th className="r">Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((inv) => {
                const isCancelled = inv.status === 'Cancelled' || inv.status === 'Void'
                return (
                  <tr
                    key={inv.id}
                    className="bill-row-click"
                    onClick={() => setOpenId(inv.id)}
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setOpenId(inv.id)}
                  >
                    <td>
                      <strong>{inv.id}</strong>
                      <small className="bill-sub">{prettyDate(inv.createdAt)}</small>
                    </td>
                    <td>{patientLabel(patients, inv.patientId)}</td>
                    <td className="bill-ellipsis">{inv.description}</td>
                    <td className="r">{inr(inv.amount)}</td>
                    <td className={`r${invoiceBalance(inv) > 0 ? ' bill-due' : ''}`}>
                      {isCancelled ? '—' : inr(invoiceBalance(inv))}
                    </td>
                    <td>
                      <StatusPill status={inv.status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bill-empty">
          <FileText size={22} />
          {dateScope === 'today' ? (
            <>
              <h2>No invoices generated today</h2>
              <p>
                Invoices generated today will appear here automatically after consultations or billing.
              </p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="patient-intake-secondary"
                  onClick={handleSelectAll}
                >
                  View All Invoices
                </button>
                <Link className="patient-intake-primary" to="/billing/invoices/new">
                  <Plus size={15} /> New invoice
                </Link>
              </div>
            </>
          ) : dateScope === 'custom' && selectedDate ? (
            <>
              <h2>No invoices found on {prettyDate(selectedDate)}</h2>
              <p>
                No invoices were generated on this date. You can return to Today or browse all invoices.
              </p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <button
                  type="button"
                  className="patient-intake-primary"
                  onClick={handleSelectToday}
                >
                  <RotateCcw size={14} /> Return to Today
                </button>
                <button
                  type="button"
                  className="patient-intake-secondary"
                  onClick={handleSelectAll}
                >
                  View All Invoices
                </button>
              </div>
            </>
          ) : (
            <>
              <h2>{invoices.length ? 'No invoices match' : 'No invoices yet'}</h2>
              <p>
                {invoices.length
                  ? 'Try a different search or filter.'
                  : 'Bill a patient for treatment to see it here.'}
              </p>
              {!invoices.length && (
                <Link className="patient-intake-primary" to="/billing/invoices/new">
                  <Plus size={15} /> New invoice
                </Link>
              )}
            </>
          )}
        </div>
      )}

      {open && (
        <InvoiceDrawer
          invoice={open}
          patient={findPatient(patients, open.patientId)}
          onClose={() => setOpenId(null)}
          onDone={() => setOpenId(null)}
        />
      )}
    </div>
  )
}

export default InvoicesPage
