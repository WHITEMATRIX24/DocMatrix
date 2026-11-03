import React, { useState } from 'react'
import {
  AlertTriangle,
  Clock,
  Package,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Filter
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAdaptiveInventory } from '@/services/adaptiveInventoryStore'
import './adaptiveInventory.css'

export const AlertsPage: React.FC = () => {
  const inventory = useAdaptiveInventory()
  const [activeFilter, setActiveFilter] = useState<'All' | 'Low Stock' | 'Expiry' | 'Variance'>('All')

  // 1. Low stock items
  const lowStockItems = inventory.items.filter((item) => item.totalStock <= item.reorderLevel)

  // 2. Batches near expiry (e.g. expiring before 2028-01-01)
  const expiringBatches: { item: typeof inventory.items[0]; batch: typeof inventory.items[0]['activeBatches'][0] }[] = []
  inventory.items.forEach((item) => {
    item.activeBatches.forEach((batch) => {
      const expYear = parseInt(batch.expiryDate.split('-')[0], 10)
      if (expYear <= 2027) {
        expiringBatches.push({ item, batch })
      }
    })
  })

  // 3. Clinical usage variances from audit logs
  const variances: {
    logId: string
    doctorName: string
    procedureName: string
    item: string
    diffText: string
  }[] = []

  inventory.deductionAuditLog.forEach((log) => {
    log.materials.forEach((m) => {
      if (m.confirmedQty !== m.suggestedQty) {
        variances.push({
          logId: log.id,
          doctorName: log.doctorName,
          procedureName: log.procedureName,
          item: m.name,
          diffText: `Used ${m.confirmedQty} ${m.unit} (suggested ${m.suggestedQty} ${m.unit})`
        })
      }
    })
  })

  return (
    <section className="clinic-record-page adaptive-inventory-container" data-testid="feature-page-inv.alerts">
      {/* Header */}
      <div className="ai-header-card">
        <div>
          <span className="clinic-record-eyebrow">CLINICAL INVENTORY INTELLIGENCE</span>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '2px 0 4px 0', color: 'var(--text-main, #0f172a)' }}>
            Low-Stock, Expiry & Consumption Variance Alerts
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '14px' }}>
            Real-time proactive notifications for material replenishment, lot expiry risk, and doctor consumption shifts.
          </p>
        </div>

        <Link
          to="/inventory/items"
          className="pat-btn pat-btn-primary"
          style={{ padding: '8px 16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <span>Open Adaptive Inventory</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Alert Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div style={{ background: 'var(--surface, #ffffff)', border: '1px solid var(--line, #e2e8f0)', borderRadius: '12px', padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#d97706', textTransform: 'uppercase' }}>Low-Stock Items</span>
            <AlertTriangle size={18} style={{ color: '#d97706' }} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, margin: '8px 0 2px 0' }}>{lowStockItems.length}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>Below defined clinical reorder threshold</div>
        </div>

        <div style={{ background: 'var(--surface, #ffffff)', border: '1px solid var(--line, #e2e8f0)', borderRadius: '12px', padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase' }}>Expiring Lots (2027)</span>
            <Clock size={18} style={{ color: '#2563eb' }} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, margin: '8px 0 2px 0' }}>{expiringBatches.length}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>Batches to prioritize in first-expire first-out</div>
        </div>

        <div style={{ background: 'var(--surface, #ffffff)', border: '1px solid var(--line, #e2e8f0)', borderRadius: '12px', padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--teal-primary, #0b8185)', textTransform: 'uppercase' }}>Consumption Shifts</span>
            <TrendingUp size={18} style={{ color: 'var(--teal-primary, #0b8185)' }} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, margin: '8px 0 2px 0' }}>{variances.length}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>Adaptive overrides learned from confirmed procedures</div>
        </div>
      </div>

      {/* Low Stock Items List */}
      <div style={{ background: 'var(--surface, #ffffff)', borderRadius: '12px', border: '1px solid var(--line, #e2e8f0)', padding: '20px' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', fontWeight: 700 }}>
          Low Stock Attention List
        </h3>
        {lowStockItems.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {lowStockItems.map((item) => (
              <div
                key={item.id}
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderRadius: '8px', background: 'var(--surface-sunken, #f8fafc)', border: '1px solid var(--line, #e2e8f0)' }}
              >
                <div>
                  <strong style={{ color: 'var(--text-main, #0f172a)' }}>{item.name}</strong>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                    Category: {item.category} &bull; SKU: {item.sku}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="ai-pill ai-pill-lowstock">
                    {item.totalStock} {item.unit} remaining
                  </span>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                    Reorder point: {item.reorderLevel} {item.unit}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontSize: '13.5px' }}>
            <CheckCircle2 size={16} /> All dental materials are currently above reorder levels.
          </div>
        )}
      </div>

      {/* Consumption Variance Shifts */}
      <div style={{ background: 'var(--surface, #ffffff)', borderRadius: '12px', border: '1px solid var(--line, #e2e8f0)', padding: '20px' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '16px', fontWeight: 700 }}>
          Adaptive Consumption Insights & Learning Signals
        </h3>
        <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
          Whenever a clinician modifies suggested quantities and confirms usage, the adaptive algorithm records the signal to refine future suggestions.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {variances.map((v, idx) => (
            <div
              key={idx}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '8px', background: 'var(--surface-sunken, #f8fafc)', border: '1px solid var(--line, #e2e8f0)', fontSize: '13px' }}
            >
              <div>
                <strong>{v.doctorName}</strong> in <em>{v.procedureName}</em> &bull; {v.item}
              </div>
              <span className="ai-pill ai-pill-adaptive">{v.diffText}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default AlertsPage
