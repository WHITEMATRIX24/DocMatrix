import React, { useState } from 'react'
import {
  History,
  ArrowDownRight,
  ArrowUpRight,
  Filter,
  Search,
  CheckCircle2,
  AlertOctagon,
  Calendar,
  User,
  Sparkles,
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

  return (
    <section className="clinic-record-page adaptive-inventory-container" data-testid="feature-page-inv.movements">
      {/* Header */}
      <div className="ai-header-card">
        <div>
          <span className="clinic-record-eyebrow">INVENTORY MOVEMENTS & AUDIT</span>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '2px 0 4px 0', color: 'var(--text-main, #0f172a)' }}>
            Stock Movements & Treatment Consumption Audit
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '14px' }}>
            Complete audit trail of confirmed treatment consumption, batch deductions, and recorded wastage.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div style={{ background: 'var(--surface, #ffffff)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--line, #e2e8f0)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 600, textTransform: 'uppercase' }}>
            Confirmed Deductions
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px', color: 'var(--text-main, #0f172a)' }}>
            {totalProcedures}
          </div>
          <div style={{ fontSize: '11.5px', color: '#059669', marginTop: '2px' }}>
            &bull; All confirmed by attending clinician
          </div>
        </div>

        <div style={{ background: 'var(--surface, #ffffff)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--line, #e2e8f0)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Items Consumed
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px', color: 'var(--teal-primary, #0b8185)' }}>
            {totalUnitsDeducted} units
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
            Across all dental treatments
          </div>
        </div>

        <div style={{ background: 'var(--surface, #ffffff)', padding: '16px 20px', borderRadius: '12px', border: '1px solid var(--line, #e2e8f0)' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', fontWeight: 600, textTransform: 'uppercase' }}>
            Separately Tracked Wastage
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, marginTop: '4px', color: totalWastage > 0 ? '#dc2626' : 'var(--text-main, #0f172a)' }}>
            {totalWastage} units
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
            Discarded or contaminated materials
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="pat-search-wrap">
            <input
              className="pat-search-input"
              placeholder="Search audit ref, procedure, doctor, patient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '320px', paddingLeft: '14px' }}
            />
          </div>

          <select
            value={selectedDoctorFilter}
            onChange={(e) => setSelectedDoctorFilter(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--line, #cbd5e1)', fontSize: '13px', background: 'var(--surface, #ffffff)' }}
          >
            <option value="All">All Doctors</option>
            <option value="Dr. Arun Kumar">Dr. Arun Kumar (Doctor A)</option>
            <option value="Dr. Priya Nair">Dr. Priya Nair (Doctor B)</option>
            <option value="Dr. Tariq Antoun">Dr. Tariq Antoun (Doctor C)</option>
          </select>
        </div>

        <div style={{ fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
          Showing {filteredLogs.length} audit records
        </div>
      </div>

      {/* Movements Audit Table */}
      {filteredLogs.length > 0 ? (
        <div className="pat-table-container">
          <table className="pat-table">
            <thead>
              <tr>
                <th>Audit ID & Date</th>
                <th>Procedure & Patient</th>
                <th>Doctor</th>
                <th>Mode Used</th>
                <th>Materials Deducted</th>
                <th>Wastage</th>
                <th>Confirmed By</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const totalDeducted = log.materials.reduce((s, m) => s + m.deductedTotal, 0)
                const totalWastage = log.materials.reduce((s, m) => s + m.wastageQty, 0)

                return (
                  <tr key={log.id} className="pat-row">
                    <td>
                      <strong style={{ color: 'var(--text-main, #0f172a)' }}>{log.id}</strong>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted, #64748b)' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </td>

                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>
                        {log.procedureName}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                        Patient: {log.patientName} ({log.patientId})
                      </div>
                    </td>

                    <td>
                      <span style={{ fontSize: '13px', fontWeight: 500 }}>{log.doctorName}</span>
                    </td>

                    <td>
                      <span className={log.modeUsed === 'doctor-specific' ? 'ai-pill ai-pill-adaptive' : 'ai-pill ai-pill-standard'}>
                        {log.modeUsed === 'doctor-specific' && <Sparkles size={11} />}
                        {log.modeUsed}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {log.materials.map((m) => (
                          <div key={m.itemId} style={{ fontSize: '12px' }}>
                            &bull; <strong>{m.name}</strong>: {m.confirmedQty} {m.unit} (Batch: {m.batchNumber})
                          </div>
                        ))}
                      </div>
                    </td>

                    <td>
                      {totalWastage > 0 ? (
                        <span className="ai-pill ai-pill-wastage">
                          {totalWastage} units recorded
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>None</span>
                      )}
                    </td>

                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={13} style={{ color: '#059669' }} />
                        <span style={{ fontSize: '12.5px', fontWeight: 500 }}>{log.confirmedBy}</span>
                      </div>
                      {log.notes && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontStyle: 'italic', marginTop: '2px' }}>
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
        <div style={{ padding: '48px 20px', textAlign: 'center', background: 'var(--surface, #ffffff)', borderRadius: '12px', border: '1px solid var(--line, #e2e8f0)' }}>
          <History size={32} style={{ color: 'var(--text-muted, #94a3b8)', marginBottom: '8px' }} />
          <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>No stock deduction records found</h3>
          <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '13px' }}>
            Try adjusting your search criteria or confirm a treatment consumption from the Consumption tab.
          </p>
        </div>
      )}
    </section>
  )
}

export default MovementsPage
