import React, { useState } from 'react'
import {
  AlertTriangle,
  Clock,
  TrendingUp,
  CheckCircle2,
  Search,
  X
} from 'lucide-react'
import { useAdaptiveInventory } from '@/services/adaptiveInventoryStore'
import './adaptiveInventory.css'

type AlertTab = 'all' | 'low' | 'expiry' | 'shift'

export const AlertsPage: React.FC = () => {
  const inventory = useAdaptiveInventory()
  const [activeTab, setActiveTab] = useState<AlertTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  // 1. Low stock alerts
  const lowStockAlerts = inventory.items
    .filter((item) => item.totalStock <= item.reorderLevel)
    .map((item) => ({
      id: `low-${item.id}`,
      tab: 'low' as const,
      type: 'Low Stock',
      pillClass: 'pill-low',
      Icon: AlertTriangle,
      title: item.name,
      category: item.category,
      primaryValue: `${item.totalStock} ${item.unit}`,
      badge: 'Below Buffer',
      secondaryValue: `Reorder threshold: ${item.reorderLevel} ${item.unit}`,
      contextPrimary: 'Reorder Queue',
      contextSecondary: `SKU: ${item.sku}`,
      statusText: 'Reorder Needed',
      statusType: 'danger' as const
    }))

  // 2. Near-expiry batch alerts (FEFO priority)
  const expiringAlerts: any[] = []
  inventory.items.forEach((item) => {
    item.activeBatches.forEach((batch) => {
      const expYear = parseInt(batch.expiryDate.split('-')[0], 10)
      if (expYear <= 2027) {
        expiringAlerts.push({
          id: `exp-${item.id}-${batch.batchNumber}`,
          tab: 'expiry' as const,
          type: 'Near Expiry',
          pillClass: 'pill-exp',
          Icon: Clock,
          title: item.name,
          category: item.category,
          primaryValue: `${batch.quantity} ${item.unit}`,
          badge: `Lot: ${batch.batchNumber}`,
          secondaryValue: `Expires: ${batch.expiryDate}`,
          contextPrimary: batch.location || 'Central Dispensary',
          contextSecondary: `SKU: ${item.sku}`,
          statusText: 'FEFO Priority',
          statusType: 'fefo' as const
        })
      }
    })
  })

  // 3. Clinical consumption shift variances
  const shiftAlerts: any[] = []
  inventory.deductionAuditLog.forEach((log) => {
    log.materials.forEach((m) => {
      if (m.confirmedQty !== m.suggestedQty) {
        const diff = m.confirmedQty - m.suggestedQty
        const sign = diff > 0 ? `+${diff}` : `${diff}`
        shiftAlerts.push({
          id: `shift-${log.id}-${m.itemId}`,
          tab: 'shift' as const,
          type: 'Consumption Shift',
          pillClass: 'pill-var',
          Icon: TrendingUp,
          title: m.name,
          category: log.procedureName,
          primaryValue: `Used ${m.confirmedQty} ${m.unit}`,
          badge: `${sign} ${m.unit} shift`,
          secondaryValue: `Standard baseline: ${m.suggestedQty} ${m.unit}`,
          contextPrimary: log.doctorName,
          contextSecondary: `Patient: ${log.patientName}`,
          statusText: 'Shift Recorded',
          statusType: 'shift' as const
        })
      }
    })
  })

  // Combine all alerts
  const allAlerts = [...lowStockAlerts, ...expiringAlerts, ...shiftAlerts]

  // Clinical departments list
  const clinicalDepartments = [
    'All',
    'PPE & General',
    'Restorative',
    'Endodontics',
    'Anesthetics',
    'Prosthodontics',
    'Preventive',
    'Orthodontics'
  ]

  // Filter alerts by tab, department, and search query
  const filteredAlerts = allAlerts.filter((alert) => {
    if (activeTab !== 'all' && alert.tab !== activeTab) {
      return false
    }
    if (selectedCategory !== 'All' && alert.category !== selectedCategory) {
      return false
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      return (
        alert.title.toLowerCase().includes(q) ||
        alert.primaryValue.toLowerCase().includes(q) ||
        alert.secondaryValue.toLowerCase().includes(q) ||
        alert.contextPrimary.toLowerCase().includes(q) ||
        (alert.contextSecondary && alert.contextSecondary.toLowerCase().includes(q)) ||
        alert.category.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <section className="clinic-record-page adaptive-inventory-container" data-testid="feature-page-inv.alerts">
      {/* Page Header */}
      <div style={{ margin: '0 0 16px 0' }}>
        <h1 className="inv-page-title">
          Low-Stock & Expiry Alerts
        </h1>
        <p className="inv-page-subtitle">
          Proactive monitoring for material replenishment, lot expiry risk, and doctor consumption shifts.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="ai-tabs">
        <button
          type="button"
          className={`ai-tab ${activeTab === 'all' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Alerts
        </button>
        <button
          type="button"
          className={`ai-tab ${activeTab === 'low' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('low')}
        >
          Low Stock
        </button>
        <button
          type="button"
          className={`ai-tab ${activeTab === 'expiry' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('expiry')}
        >
          Expiring Lots
        </button>
        <button
          type="button"
          className={`ai-tab ${activeTab === 'shift' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('shift')}
        >
          Consumption Shifts
        </button>
      </div>

      {/* Unified Table Card */}
      <div className="unified-inventory-card">
        {/* Unified Card Header Toolbar */}
        <div className="unified-table-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
            <div className="unified-search-wrap">
              <Search size={15} style={{ position: 'absolute', left: '12px', color: 'var(--text-faint, #94a3b8)', pointerEvents: 'none' }} />
              <input
                className="unified-search-input"
                placeholder="Search alert, item, batch, doctor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingRight: searchQuery ? '32px' : '14px' }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: 'var(--text-muted, #94a3b8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="unified-select"
            >
              {clinicalDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept === 'All' ? 'All Departments' : dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Alerts Table */}
        {filteredAlerts.length > 0 ? (
          <div className="inv-sheet-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
            <table className="inv-sheet-table" style={{ width: '100%', minWidth: '960px' }}>
              <thead>
                <tr>
                  <th style={{ width: '15%' }}>Alert Type</th>
                  <th style={{ width: '25%' }}>Item & Department</th>
                  <th style={{ width: '32%' }}>Condition & Details</th>
                  <th style={{ width: '16%' }}>Context / Source</th>
                  <th style={{ width: '12%', textAlign: 'right', paddingRight: '20px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAlerts.map((alert: any) => {
                  const { Icon } = alert
                  return (
                    <tr key={alert.id} className="inv-sheet-row">
                      {/* Alert Type */}
                      <td>
                        <span className={`alert-pill ${alert.pillClass}`}>
                          <Icon size={12} />
                          {alert.type}
                        </span>
                      </td>

                      {/* Item & Department */}
                      <td>
                        <div className="alert-item-title">
                          {alert.title}
                        </div>
                        <div className="alert-item-meta">
                          {alert.category}
                        </div>
                      </td>

                      {/* Condition & Details */}
                      <td>
                        <div style={{ display: 'grid', gridTemplateColumns: '110px auto', alignItems: 'center', gap: '8px', width: 'fit-content' }}>
                          <span className={alert.tab === 'low' ? 'alert-metric-low' : 'alert-metric-teal'}>
                            {alert.primaryValue}
                          </span>
                          {alert.badge && (
                            <span className="alert-lot-badge">
                              {alert.badge}
                            </span>
                          )}
                        </div>
                        <div className="alert-secondary-text">
                          {alert.secondaryValue}
                        </div>
                      </td>

                      {/* Context / Source */}
                      <td>
                        <div className="alert-context-primary">
                          {alert.contextPrimary}
                        </div>
                        {alert.contextSecondary && (
                          <div className="alert-context-secondary">
                            {alert.contextSecondary}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {alert.statusType === 'fefo' && (
                            <span className="fefo-pill">
                              {alert.statusText}
                            </span>
                          )}
                          {alert.statusType === 'danger' && (
                            <span className="alert-status-danger">
                              {alert.statusText}
                            </span>
                          )}
                          {alert.statusType === 'shift' && (
                            <span className="alert-status-shift">
                              {alert.statusText}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="audit-empty-box">
            <div className="audit-empty-icon-wrap">
              <CheckCircle2 size={24} style={{ color: 'var(--tone-green, #059669)' }} />
            </div>
            <h3 className="audit-empty-title">
              {activeTab === 'low'
                ? 'All materials are above reorder levels'
                : 'No alerts matching criteria'}
            </h3>
            <p className="audit-empty-desc">
              {activeTab === 'low'
                ? 'All clinical inventory items currently maintain safe stock buffer levels.'
                : 'No active stock alerts match your selected filter or search keyword.'}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

export default AlertsPage
