import React, { useState } from 'react'
import {
  History,
  Search,
  CheckCircle2,
  Calendar,
  User,
  FileText
} from 'lucide-react'
import { useAdaptiveInventory } from '@/services/adaptiveInventoryStore'
import './adaptiveInventory.css'

export const MovementsPage: React.FC = () => {
  const inventory = useAdaptiveInventory()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('All')

  const auditLogs = inventory.deductionAuditLog

  const filteredLogs = auditLogs.filter((log) => {
    if (selectedDoctorFilter !== 'All' && log.doctorName !== selectedDoctorFilter) {
      return false
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      return (
        log.id.toLowerCase().includes(q) ||
        log.procedureName.toLowerCase().includes(q) ||
        log.patientName.toLowerCase().includes(q) ||
        log.doctorName.toLowerCase().includes(q)
      )
    }
    return true
  })

  // Summary statistics
  const totalProcedures = auditLogs.length
  const totalUnitsDeducted = auditLogs.reduce((acc, log) => {
    return acc + log.materials.reduce((mSum, m) => mSum + m.deductedTotal, 0)
  }, 0)
  const totalWastage = auditLogs.reduce((acc, log) => {
    return acc + log.materials.reduce((wSum, m) => wSum + m.wastageQty, 0)
  }, 0)

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString)
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return isoString
    }
  }

  return (
    <section className="clinic-record-page adaptive-inventory-container" data-testid="feature-page-inv.movements">
      {/* Header */}
      <div style={{ margin: '2px 0 4px 0' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: 'var(--text-main, #0f172a)' }}>
          Stock Movements & Audit
        </h1>
        <p style={{ margin: '3px 0 0 0', color: 'var(--text-muted, #64748b)', fontSize: '13px' }}>
          Audit trail of confirmed treatment consumption, batch deductions, and recorded wastage.
        </p>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Confirmed Deductions
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '2px', color: '#0f172a' }}>
            {totalProcedures}
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Items Consumed
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '2px', color: 'var(--teal-primary, #008891)' }}>
            {totalUnitsDeducted} units
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '14px 18px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Recorded Wastage
          </div>
          <div style={{ fontSize: '24px', fontWeight: 800, marginTop: '2px', color: totalWastage > 0 ? '#dc2626' : '#0f172a' }}>
            {totalWastage} {totalWastage === 1 ? 'unit' : 'units'}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minWidth: '240px', flex: 1, maxWidth: '360px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', color: '#94a3b8', pointerEvents: 'none' }} />
            <input
              style={{ width: '100%', padding: '7px 12px 7px 34px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#f8fafc', outline: 'none' }}
              placeholder="Search audit ID, procedure, doctor, patient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <select
            value={selectedDoctorFilter}
            onChange={(e) => setSelectedDoctorFilter(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13px', background: '#ffffff', color: '#0f172a', cursor: 'pointer', fontWeight: 500 }}
          >
            <option value="All">All Doctors</option>
            <option value="Dr. Arun Kumar">Dr. Arun Kumar</option>
            <option value="Dr. Priya Nair">Dr. Priya Nair</option>
            <option value="Dr. Tariq Antoun">Dr. Tariq Antoun</option>
          </select>
        </div>
      </div>

      {/* Movements Audit Table */}
      {filteredLogs.length > 0 ? (
        <div className="inv-sheet-container" style={{ borderRadius: '12px', boxShadow: 'none' }}>
          <table className="inv-sheet-table" style={{ width: '100%', minWidth: '960px' }}>
            <thead>
              <tr>
                <th style={{ width: '14%' }}>Audit Ref & Date</th>
                <th style={{ width: '18%' }}>Procedure & Patient</th>
                <th style={{ width: '12%' }}>Doctor</th>
                <th style={{ width: '10%' }}>Mode</th>
                <th style={{ width: '28%' }}>Materials Deducted</th>
                <th style={{ width: '8%' }}>Wastage</th>
                <th style={{ width: '10%' }}>Confirmed By</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const totalWastage = log.materials.reduce((s, m) => s + m.wastageQty, 0)

                return (
                  <tr key={log.id} className="inv-sheet-row">
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a' }}>{log.id}</div>
                      <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                        {formatDate(log.timestamp)}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>
                        {log.procedureName}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                        Patient: {log.patientName}
                      </div>
                    </td>

                    <td>
                      <span style={{ fontSize: '12.5px', fontWeight: 500, color: '#334155' }}>{log.doctorName}</span>
                    </td>

                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '3px 10px',
                        borderRadius: '9999px',
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'capitalize',
                        background: log.modeUsed === 'doctor-specific' ? 'rgba(14, 165, 233, 0.1)' : '#f1f5f9',
                        color: log.modeUsed === 'doctor-specific' ? '#0284c7' : '#475569',
                        border: log.modeUsed === 'doctor-specific' ? '1px solid rgba(14, 165, 233, 0.25)' : '1px solid #e2e8f0'
                      }}>
                        {log.modeUsed}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {log.materials.map((m) => (
                          <div
                            key={m.itemId}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              padding: '2px 8px',
                              fontSize: '11.5px',
                              width: 'fit-content'
                            }}
                          >
                            <span style={{ fontWeight: 600, color: '#0f172a' }}>{m.name}</span>
                            <span style={{ color: '#008891', fontWeight: 600 }}>{m.confirmedQty} {m.unit}</span>
                            <span style={{ color: '#64748b', fontSize: '10.5px' }}>({m.batchNumber})</span>
                          </div>
                        ))}
                      </div>
                    </td>

                    <td>
                      {totalWastage > 0 ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: '9999px', fontSize: '11px', fontWeight: 600, background: '#fef2f2', color: '#dc2626' }}>
                          {totalWastage} {totalWastage === 1 ? 'unit' : 'units'}
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>—</span>
                      )}
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <CheckCircle2 size={13} style={{ color: '#059669', flexShrink: 0 }} />
                        <span style={{ fontSize: '12.5px', fontWeight: 500, color: '#0f172a' }}>{log.confirmedBy}</span>
                      </div>
                      {log.notes && (
                        <div style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic', marginTop: '3px', lineHeight: 1.3 }}>
                          "{log.notes}"
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ padding: '48px 20px', textAlign: 'center', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <History size={32} style={{ color: '#94a3b8', marginBottom: '8px' }} />
          <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>No stock deduction records found</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
            Try adjusting your search criteria or confirm a treatment consumption from the Items page.
          </p>
        </div>
      )}
    </section>
  )
}

export default MovementsPage
