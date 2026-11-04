import React, { useState, useEffect } from 'react'
import {
  History,
  Search,
  CheckCircle2,
  X,
  UserPlus,
  PlusCircle
} from 'lucide-react'
import { useAdaptiveInventory, syncInventoryWithBackend } from '@/services/adaptiveInventoryStore'
import {
  getClinicStaffDoctors,
  fetchAndSyncClinicStaff,
  subscribeStaff,
  addClinicDoctor
} from '@/services/clinicStaffStore'
import './adaptiveInventory.css'

export const MovementsPage: React.FC = () => {
  const inventory = useAdaptiveInventory()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDoctorFilter, setSelectedDoctorFilter] = useState('All')
  const [doctorsList, setDoctorsList] = useState<string[]>([])
  const [showAddDoctorModal, setShowAddDoctorModal] = useState(false)
  const [newDoctorName, setNewDoctorName] = useState('')
  const [isAddingDoctor, setIsAddingDoctor] = useState(false)

  useEffect(() => {
    syncInventoryWithBackend()

    const updateDoctors = () => {
      const staffDocs = getClinicStaffDoctors().map((d) => d.name)
      const auditDocs = inventory.deductionAuditLog.map((l) => l.doctorName)
      const allUnique = Array.from(new Set([...staffDocs, ...auditDocs].filter(Boolean)))
      setDoctorsList(allUnique)
    }

    updateDoctors()
    fetchAndSyncClinicStaff().then(updateDoctors)
    const unsub = subscribeStaff(updateDoctors)
    return () => unsub()
  }, [inventory.deductionAuditLog])

  const auditLogs = inventory.deductionAuditLog

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDoctorName.trim()) return

    try {
      setIsAddingDoctor(true)
      const created = await addClinicDoctor(newDoctorName.trim())
      setSelectedDoctorFilter(created.name)
      setShowAddDoctorModal(false)
      setNewDoctorName('')
    } finally {
      setIsAddingDoctor(false)
    }
  }

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
        <h1 className="inv-page-title">
          Stock Movements & Audit
        </h1>
        <p className="inv-page-subtitle">
          Audit trail of confirmed treatment consumption, batch deductions, and recorded wastage.
        </p>
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

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                value={selectedDoctorFilter}
                onChange={(e) => {
                  if (e.target.value === '__ADD_NEW__') {
                    setShowAddDoctorModal(true)
                  } else {
                    setSelectedDoctorFilter(e.target.value)
                  }
                }}
                className="unified-select"
              >
                <option value="All">All Doctors</option>
                {doctorsList.map((doc) => (
                  <option key={doc} value={doc}>{doc}</option>
                ))}
                <option value="__ADD_NEW__">+ Add New Doctor...</option>
              </select>

              <button
                type="button"
                onClick={() => setShowAddDoctorModal(true)}
                title="Add a doctor to clinic"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  height: '38px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--line, #cbd5e1)',
                  background: 'var(--surface, #ffffff)',
                  color: 'var(--text-strong, #0f172a)',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  whiteSpace: 'nowrap'
                }}
              >
                <UserPlus size={14} style={{ color: 'var(--teal-primary, #008891)' }} />
                <span>Add Doctor</span>
              </button>
            </div>
          </div>
        </div>

        {/* Movements Audit Table */}
        {filteredLogs.length > 0 ? (
          <div className="inv-sheet-container" style={{ border: 'none', borderRadius: 0, boxShadow: 'none' }}>
            <table className="inv-sheet-table" style={{ width: '100%', minWidth: '960px' }}>
              <thead>
                <tr>
                  <th style={{ width: '14%' }}>Audit Ref & Date</th>
                  <th style={{ width: '18%' }}>Procedure & Patient</th>
                  <th style={{ width: '13%' }}>Doctor</th>
                  <th style={{ width: '44%' }}>Items Used</th>
                  <th style={{ width: '6%' }}>Wastage</th>
                  <th style={{ width: '11%' }}>Confirmed By</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const logWastage = log.materials.reduce((s, m) => s + m.wastageQty, 0)

                  return (
                    <tr key={log.id} className="inv-sheet-row">
                      <td style={{ verticalAlign: 'top', paddingTop: '16px' }}>
                        <div className="audit-ref-badge">
                          {log.id}
                        </div>
                        <div className="audit-ref-date">
                          {formatDate(log.timestamp)}
                        </div>
                      </td>

                      <td style={{ verticalAlign: 'top', paddingTop: '16px' }}>
                        <div className="audit-proc-name">
                          {log.procedureName}
                        </div>
                        <div className="audit-patient-sub">
                          <span className="audit-patient-label">Patient:</span>
                          <span className="audit-patient-name">{log.patientName}</span>
                        </div>
                      </td>

                      <td style={{ verticalAlign: 'top', paddingTop: '16px' }}>
                        <span className="audit-doc-name">
                          {log.doctorName}
                        </span>
                      </td>

                      <td style={{ verticalAlign: 'top', paddingTop: '14px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          {log.materials.map((m) => (
                            <div
                              key={m.itemId}
                              className="audit-mat-row"
                            >
                              <span
                                className="audit-mat-name"
                                title={m.name}
                              >
                                {m.name}
                              </span>
                              <span className="audit-mat-qty">
                                {m.confirmedQty} {m.unit}
                              </span>
                              <span className="audit-mat-batch">
                                {m.batchNumber}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td style={{ verticalAlign: 'top', paddingTop: '16px' }}>
                        {logWastage > 0 ? (
                          <span className="audit-wastage-badge">
                            {logWastage} {logWastage === 1 ? 'unit' : 'units'}
                          </span>
                        ) : (
                          <span className="audit-wastage-none">None</span>
                        )}
                      </td>

                      <td style={{ verticalAlign: 'top', paddingTop: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div className="audit-confirm-check">
                            <CheckCircle2 size={12} />
                          </div>
                          <span className="audit-confirm-name">{log.confirmedBy}</span>
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
              <History size={22} />
            </div>
            <h3 className="audit-empty-title">
              No audit records found
            </h3>
            <p className="audit-empty-desc">
              No consumption records matched your search criteria. Try adjusting filters or confirm a treatment from the Items page.
            </p>
          </div>
        )}
      </div>

      {/* QUICK MODAL: ADD DOCTOR */}
      {showAddDoctorModal && (
        <div className="ai-modal-overlay" onClick={() => setShowAddDoctorModal(false)} role="dialog" aria-modal="true">
          <div className="ai-modal-content" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ai-modal-header">
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 700, color: 'var(--text-strong, #0f172a)' }}>
                  Add Doctor to Clinic
                </h3>
                <span style={{ fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
                  Register a practitioner for treatment tracking and consumption audits
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddDoctorModal(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px', color: 'var(--text-muted, #64748b)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateDoctor}>
              <div className="ai-modal-body" style={{ gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                    Doctor Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={newDoctorName}
                    onChange={(e) => setNewDoctorName(e.target.value)}
                    placeholder="e.g. Dr. Jane Smith"
                    className="pat-input"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--line, #cbd5e1)' }}
                  />
                </div>
              </div>

              <div className="ai-modal-footer">
                <button
                  type="button"
                  onClick={() => setShowAddDoctorModal(false)}
                  className="pat-btn"
                  style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--line, #cbd5e1)', borderRadius: '8px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingDoctor}
                  className="pat-btn pat-btn-primary"
                  style={{ padding: '8px 20px', borderRadius: '8px' }}
                >
                  <PlusCircle size={15} /> {isAddingDoctor ? 'Adding...' : 'Add Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

export default MovementsPage
