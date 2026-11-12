import React, { useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  CreditCard,
  IndianRupee,
  LayoutGrid,
  ListOrdered,
  Plus,
  Receipt,
  ReceiptText,
  Tag,
  Wallet,
} from 'lucide-react'
import { invoiceBalance, syncWithBackend, useClinicData } from '@/services/clinicStore'
import { syncBillingMasterData } from '@/services/billingStore'
import { inr, localDate, usePayments } from './BillingShared'
import './billing.css'

type BillingTab = { id: string; label: string; path: string; icon: React.ComponentType<{ size?: number }> }

const tabs: BillingTab[] = [
  { id: 'bill.overview', label: 'Overview', path: '/billing', icon: LayoutGrid },
  { id: 'bill.invoices', label: 'Invoices', path: '/billing/invoices', icon: ReceiptText },
  { id: 'bill.dues', label: 'Dues', path: '/billing/dues', icon: AlertCircle },
  { id: 'bill.collection', label: 'Collection', path: '/billing/collection', icon: Wallet },
  { id: 'bill.payments', label: 'Payments', path: '/billing/payments', icon: ListOrdered },
]

/** One Billing hub: live money figures, a single "New invoice" action, and tabs for each billing tool. */
export default function BillingWorkspace({ activeFeatureId, children }: { activeFeatureId: string; children: React.ReactNode }) {
  const navigate = useNavigate()
  const { invoices } = useClinicData()
  const payments = usePayments(invoices)

  useEffect(() => {
    syncBillingMasterData().catch((e) => console.warn('[BillingWorkspace] syncBillingMasterData error:', e))
    syncWithBackend().catch((e) => console.warn('[BillingWorkspace] syncWithBackend error:', e))
  }, [])

  const stats = useMemo(() => {
    const today = localDate()
    const month = today.slice(0, 7)
    const openInvoices = invoices.filter((inv) => invoiceBalance(inv) > 0)
    return {
      todayCollected: payments.filter((p) => localDate(p.receivedAt) === today).reduce((s, p) => s + p.amount, 0),
      dues: openInvoices.reduce((s, inv) => s + invoiceBalance(inv), 0),
      openCount: openInvoices.length,
      monthBilled: invoices.filter((inv) => inv.status !== 'Void' && localDate(inv.createdAt).startsWith(month)).reduce((s, inv) => s + inv.amount, 0),
    }
  }, [invoices, payments])

  const selected = activeFeatureId === 'bill.invoice-new' ? 'bill.invoices' : activeFeatureId

  return (
    <section className="appointments-workspace bill-workspace">
      <header className="appointments-workspace-header bill-header">
        <div className="appointments-workspace-title">
          <span className="appointments-workspace-icon"><Receipt size={20} /></span>
          <div>
            <span className="appointments-workspace-eyebrow">Billing</span>
            <h1>Billing &amp; Collections</h1>
            <p>Invoices, part payments, dues and daily collection in one place.</p>
          </div>
        </div>
        <button className="patient-intake-primary bill-header-cta" onClick={() => navigate('/billing/invoices/new')}>
          <Plus size={15} /> New invoice
        </button>
      </header>

      <div className="bill-kpis">
        <button className="bill-kpi" onClick={() => navigate('/billing/collection')}>
          <span className="bill-kpi-label"><IndianRupee size={14} /> Collected today</span>
          <strong>{inr(stats.todayCollected)}</strong>
        </button>
        <button className="bill-kpi bill-kpi-warn" onClick={() => navigate('/billing/dues')}>
          <span className="bill-kpi-label"><AlertCircle size={14} /> Outstanding dues</span>
          <strong>{inr(stats.dues)}</strong>
          <small>{stats.openCount} open invoice{stats.openCount === 1 ? '' : 's'}</small>
        </button>
        <button className="bill-kpi" onClick={() => navigate('/billing/invoices')}>
          <span className="bill-kpi-label"><ReceiptText size={14} /> Billed this month</span>
          <strong>{inr(stats.monthBilled)}</strong>
        </button>
      </div>

      <nav className="appointments-workspace-tabs bill-tabs" aria-label="Billing sections">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = selected === tab.id
          return (
            <button
              key={tab.id}
              className={`appointments-workspace-tab${active ? ' is-active' : ''}`}
              aria-current={active ? 'page' : undefined}
              onClick={() => navigate(tab.path)}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="appointments-workspace-content bill-content">{children}</div>
    </section>
  )
}
