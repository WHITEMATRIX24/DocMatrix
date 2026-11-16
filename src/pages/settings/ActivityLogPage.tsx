import React, { useState, useEffect, useMemo } from 'react'
import {
  History, Search, Filter, RefreshCw, Download, Calendar,
  Shield, CheckCircle2, AlertTriangle, Info, Clock, User
} from 'lucide-react'
import { apiClient } from '@/services/apiClient'

interface ActivityEvent {
  id: string
  timestamp: string
  module: 'Patients' | 'Clinical' | 'Billing' | 'Inventory' | 'Staff' | 'Security'
  action: string
  actorName: string
  actorRole?: string
  description: string
  severity: 'info' | 'warn' | 'success'
}

const MODULE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Patients: { bg: 'rgba(56, 189, 248, 0.12)', text: '#0284c7', border: 'rgba(56, 189, 248, 0.28)' },
  Clinical: { bg: 'rgba(20, 184, 166, 0.12)', text: '#0d9488', border: 'rgba(20, 184, 166, 0.28)' },
  Billing: { bg: 'rgba(34, 197, 94, 0.12)', text: '#16a34a', border: 'rgba(34, 197, 94, 0.28)' },
  Inventory: { bg: 'rgba(245, 158, 11, 0.12)', text: '#d97706', border: 'rgba(245, 158, 11, 0.28)' },
  Staff: { bg: 'rgba(168, 85, 247, 0.12)', text: '#9333ea', border: 'rgba(168, 85, 247, 0.28)' },
  Security: { bg: 'rgba(239, 68, 68, 0.12)', text: '#dc2626', border: 'rgba(239, 68, 68, 0.28)' }
}

export const ActivityLogPage: React.FC = () => {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedModule, setSelectedModule] = useState<string>('ALL')
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | 'WEEK' | 'MONTH'>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const res = await apiClient.get<ActivityEvent[]>('/clinics/my-clinic/activity-log', {
        params: { limit: 100 }
      })
      if (Array.isArray(res)) {
        setEvents(res)
        return
      }
    } catch {
      // Backend error
    } finally {
      setLoading(false)
    }

    setEvents([])
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const filteredEvents = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000
    const monthAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000

    return events.filter(e => {
      if (selectedModule !== 'ALL' && e.module !== selectedModule) return false

      const eventTime = new Date(e.timestamp).getTime()
      if (dateFilter === 'TODAY' && eventTime < todayStart) return false
      if (dateFilter === 'WEEK' && eventTime < weekAgo) return false
      if (dateFilter === 'MONTH' && eventTime < monthAgo) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchesDesc = e.description.toLowerCase().includes(q)
        const matchesActor = e.actorName.toLowerCase().includes(q)
        const matchesAction = e.action.toLowerCase().includes(q)
        if (!matchesDesc && !matchesActor && !matchesAction) return false
      }

      return true
    })
  }, [events, selectedModule, dateFilter, searchQuery])

  const handleExportCSV = () => {
    if (filteredEvents.length === 0) return

    const headers = ['Timestamp', 'Module', 'Action', 'Actor Name', 'Actor Role', 'Description', 'Severity']
    const rows = filteredEvents.map(e => [
      `"${new Date(e.timestamp).toLocaleString()}"`,
      `"${e.module}"`,
      `"${e.action}"`,
      `"${e.actorName}"`,
      `"${e.actorRole || ''}"`,
      `"${e.description.replace(/"/g, '""')}"`,
      `"${e.severity}"`
    ])

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `docmatrix_activity_log_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ maxWidth: '1150px', margin: '0 auto', padding: '32px 24px', fontFamily: 'inherit' }} data-testid="feature-page-set.activity">
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--teal-primary, #008891)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            <History size={16} />
            <span>AUDIT TRAIL &amp; COMPLIANCE</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-strong, #0f172a)', margin: '4px 0' }}>
            Clinic Activity &amp; Audit Log
          </h1>
          <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '14px', margin: 0 }}>
            Unified, tamper-evident chronological timeline of all clinical, billing, inventory, and staff actions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={fetchEvents}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              background: 'var(--surface-sunken, #ffffff)',
              border: '1px solid var(--line-strong, #cbd5e1)',
              color: 'var(--text-strong, #334155)',
              cursor: loading ? 'wait' : 'pointer'
            }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredEvents.length === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              background: 'var(--teal-primary, #008891)',
              border: 'none',
              color: '#ffffff',
              cursor: filteredEvents.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            <Download size={14} />
            Export Log (CSV)
          </button>
        </div>
      </header>

      {/* Filter and Search Bar */}
      <div style={{
        background: 'var(--surface-raised, #ffffff)',
        border: '1px solid var(--line, #e2e8f0)',
        borderRadius: '10px',
        padding: '14px 18px',
        marginBottom: '20px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 260px' }}>
          <Search size={16} color="var(--text-muted, #94a3b8)" />
          <input
            type="text"
            placeholder="Search by action, doctor, patient, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              fontSize: '13.5px',
              background: 'transparent',
              color: 'var(--text-strong, #0f172a)'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>Module:</span>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid var(--line-strong, #cbd5e1)',
                fontSize: '13px',
                background: 'var(--surface-sunken, #fff)',
                color: 'var(--text-strong, #0f172a)'
              }}
            >
              <option value="ALL">All Modules</option>
              <option value="Patients">Patients</option>
              <option value="Clinical">Clinical</option>
              <option value="Billing">Billing</option>
              <option value="Inventory">Inventory</option>
              <option value="Staff">Staff</option>
              <option value="Security">Security</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>Timeframe:</span>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid var(--line-strong, #cbd5e1)',
                fontSize: '13px',
                background: 'var(--surface-sunken, #fff)',
                color: 'var(--text-strong, #0f172a)'
              }}
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today Only</option>
              <option value="WEEK">Past 7 Days</option>
              <option value="MONTH">Past 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Events Timeline / Table */}
      <div style={{
        background: 'var(--surface-raised, #ffffff)',
        border: '1px solid var(--line, #e2e8f0)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
          <thead>
            <tr style={{
              background: 'var(--surface-alt, #f8fafc)',
              borderBottom: '1px solid var(--line, #e2e8f0)',
              color: 'var(--text-muted, #64748b)',
              fontSize: '12px',
              textTransform: 'uppercase'
            }}>
              <th style={{ padding: '12px 18px', width: '170px' }}>Timestamp</th>
              <th style={{ padding: '12px 18px', width: '110px' }}>Module</th>
              <th style={{ padding: '12px 18px', width: '180px' }}>Action &amp; Actor</th>
              <th style={{ padding: '12px 18px' }}>Event Description</th>
            </tr>
          </thead>
          <tbody>
            {filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-faint, #94a3b8)' }}>
                  {loading ? 'Aggregating activity events across modules...' : 'No activity records match the selected filter criteria.'}
                </td>
              </tr>
            ) : (
              filteredEvents.map((evt) => {
                const badge = MODULE_COLORS[evt.module] || { bg: 'var(--surface-alt)', text: 'var(--text)', border: 'var(--line)' }
                const dateObj = new Date(evt.timestamp)

                return (
                  <tr key={evt.id} style={{ borderBottom: '1px solid var(--line, #f1f5f9)' }}>
                    <td style={{ padding: '14px 18px', color: 'var(--text, #475569)', fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-strong, #0f172a)' }}>
                        {dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted, #94a3b8)' }}>
                        {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 9px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        background: badge.bg,
                        color: badge.text,
                        border: `1px solid ${badge.border}`
                      }}>
                        {evt.module}
                      </span>
                    </td>

                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-strong, #0f172a)', fontSize: '13px' }}>
                        {evt.actorName}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        <Shield size={11} /> {evt.actorRole || 'USER'} • <span style={{ fontFamily: 'monospace' }}>{evt.action}</span>
                      </div>
                    </td>

                    <td style={{ padding: '14px 18px', color: 'var(--text, #334155)', lineHeight: 1.5 }}>
                      {evt.description}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ActivityLogPage
