import React, { useState } from 'react'
import {
  History,
  Search,
  CheckCircle2,
  X
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
      {/* Page Header */}
      <div style={{ margin: '0 0 16px 0' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--text-main, #0f172a)' }}>
          Stock Movements & Audit
        </h1>
        <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted, #64748b)', fontSize: '13px' }}>
          Audit trail of confirmed treatment consumption, batch deductions, and recorded wastage.
        </p>
      </div>

      {/* Unified Table Card */}
      <div className="unified-inventory-card">
        {/* Unified Card Header Toolbar */}
        <div className="unified-table-toolbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
            <div className="unified-search-wrap">
              <Search size={15} style={{ position: 'absolute', left: '12px', color: '#94a3b8', pointerEvents: 'none' }} />
              <input
                className="unified-search-input"
                placeholder="Search audit ID, procedure, doctor, patient..."
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
                    color: '#94a3b8',
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
              value={selectedDoctorFilter}
              onChange={(e) => setSelectedDoctorFilter(e.target.value)}
              className="unified-select"
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
          <div className="inv-sheet-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
            <table className="inv-sheet-table" style={{ width: '100%', minWidth: '960px' }}>
              <thead>
                <tr>
                  <th style={{ width: '13%' }}>Audit Ref & Date</th>
                  <th style={{ width: '15%' }}>Procedure & Patient</th>
                  <th style={{ width: '12%' }}>Doctor</th>
                  <th style={{ width: '9%' }}>Mode</th>
                  <th style={{ width: '36%' }}>Materials Deducted</th>
                  <th style={{ width: '5%' }}>Wastage</th>
                  <th style={{ width: '10%' }}>Confirmed By</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const logWastage = log.materials.reduce((s, m) => s + m.wastageQty, 0)

                  return (
                    <tr key={log.id} className="inv-sheet-row">
                      <td style={{ verticalAlign: 'top', paddingTop: '16px' }}>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          color: '#334155',
                          background: '#f1f5f9',
                          padding: '2px 7px',
                          borderRadius: '6px',
                          letterSpacing: '0.01em'
                        }}>
                          {log.id}
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '5px' }}>
                          {formatDate(log.timestamp)}
                        </div>
                      </td>

                      <td style={{ verticalAlign: 'top', paddingTop: '16px' }}>
                        <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#0f172a' }}>
                          {log.procedureName}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: '#94a3b8' }}>Patient:</span>
                          <span style={{ color: '#475569', fontWeight: 500 }}>{log.patientName}</span>
                        </div>
                      </td>

                      <td style={{ verticalAlign: 'top', paddingTop: '16px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                          {log.doctorName}
                        </span>
                      </td>

                      <td style={{ verticalAlign: 'top', paddingTop: '16px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          background: log.modeUsed === 'doctor-specific' ? '#ecfeff' : '#f8fafc',
                          color: log.modeUsed === 'doctor-specific' ? '#0891b2' : '#64748b',
                          border: log.modeUsed === 'doctor-specific' ? '1px solid #a5f3fc' : '1px solid #e2e8f0'
                        }}>
                          {log.modeUsed === 'doctor-specific' ? 'Doctor Specific' : 'Standard'}
                        </span>
                      </td>

                      <td style={{ verticalAlign: 'top', paddingTop: '14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          {log.materials.map((m) => (
                            <div
                              key={m.itemId}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'minmax(140px, 1fr) 75px 85px',
                                alignItems: 'center',
                                gap: '8px',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                padding: '3px 8px',
                                fontSize: '11.5px'
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: 600,
                                  color: '#0f172a',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}
                                title={m.name}
                              >
                                {m.name}
                              </span>
                              <span
                                style={{
                                  color: 'var(--teal-primary, #008891)',
                                  fontWeight: 700,
                                  whiteSpace: 'nowrap',
                                  textAlign: 'right'
                                }}
                              >
                                {m.confirmedQty} {m.unit}
                              </span>
                              <span
                                style={{
                                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                  fontSize: '10.5px',
                                  color: '#64748b',
                                  background: '#ffffff',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '4px',
                                  padding: '1px 5px',
                                  whiteSpace: 'nowrap',
                                  textAlign: 'center'
                                }}
                              >
                                {m.batchNumber}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td style={{ verticalAlign: 'top', paddingTop: '16px' }}>
                        {logWastage > 0 ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '3px 9px',
                            borderRadius: '9999px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            background: '#fef2f2',
                            color: '#dc2626',
                            border: '1px solid #fee2e2'
                          }}>
                            {logWastage} {logWastage === 1 ? 'unit' : 'units'}
                          </span>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>None</span>
                        )}
                      </td>

                      <td style={{ verticalAlign: 'top', paddingTop: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            background: '#ecfdf5',
                            border: '1px solid #a7f3d0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            <CheckCircle2 size={12} style={{ color: '#059669' }} />
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>{log.confirmedBy}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px auto'
            }}>
              <History size={22} style={{ color: '#94a3b8' }} />
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>
              No audit records found
            </h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '13px', maxWidth: '380px', marginInline: 'auto' }}>
              No consumption records matched your search criteria. Try adjusting filters or confirm a treatment from the Items page.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

export default MovementsPage
