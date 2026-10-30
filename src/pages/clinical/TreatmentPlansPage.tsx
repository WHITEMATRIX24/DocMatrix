import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Stethoscope, CheckCircle2, Clock, AlertCircle, Plus, UserRound, ArrowRight, Filter } from 'lucide-react'
import {
  useClinicData,
  updateTreatmentPlanStatus,
  type TreatmentPlanRecord
} from '@/services/clinicStore'
import '../patients/patientProfile.css'

type PlanStatusFilter = 'All' | 'Proposed' | 'Accepted' | 'In Progress' | 'Pending' | 'Completed'

export const TreatmentPlansPage: React.FC = () => {
  const { treatmentPlans = [], patients = [] } = useClinicData()
  const [activeStatus, setActiveStatus] = useState<PlanStatusFilter>('All')
  const [searchQuery, setSearchQuery] = useState('')

  // Map patient id to patient object
  const patientMap = useMemo(() => {
    const map = new Map<string, (typeof patients)[0]>()
    for (const p of patients) {
      map.set(p.id.toLowerCase(), p)
    }
    return map
  }, [patients])

  // Filter plans
  const filteredPlans = useMemo(() => {
    return (treatmentPlans as TreatmentPlanRecord[]).filter((plan) => {
      // 1. Status Filter
      if (activeStatus !== 'All' && plan.status !== activeStatus) {
        return false
      }

      // 2. Search Query (procedure, doctor, tooth number, patient name/ID)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const p = patientMap.get(plan.patientId.toLowerCase())
        const patientName = p ? `${p.firstName} ${p.lastName}`.toLowerCase() : ''
        const match =
          plan.procedure.toLowerCase().includes(q) ||
          plan.doctor.toLowerCase().includes(q) ||
          (plan.toothNumber && plan.toothNumber.toLowerCase().includes(q)) ||
          plan.patientId.toLowerCase().includes(q) ||
          patientName.includes(q)
        if (!match) return false
      }

      return true
    })
  }, [treatmentPlans, activeStatus, searchQuery, patientMap])

  // Count by status
  const counts = useMemo(() => {
    const plans = treatmentPlans as TreatmentPlanRecord[]
    return {
      All: plans.length,
      Proposed: plans.filter((p) => p.status === 'Proposed').length,
      Accepted: plans.filter((p) => p.status === 'Accepted').length,
      'In Progress': plans.filter((p) => p.status === 'In Progress').length,
      Pending: plans.filter((p) => p.status === 'Pending').length,
      Completed: plans.filter((p) => p.status === 'Completed').length
    }
  }, [treatmentPlans])

  const handleStatusChange = (id: string, newStatus: TreatmentPlanRecord['status']) => {
    updateTreatmentPlanStatus(id, newStatus)
  }

  const getStatusBadgeStyle = (status: TreatmentPlanRecord['status']) => {
    switch (status) {
      case 'Pending':
        return { background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', borderColor: 'rgba(245, 158, 11, 0.2)' }
      case 'In Progress':
        return { background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', borderColor: 'rgba(14, 165, 233, 0.2)' }
      case 'Accepted':
        return { background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', borderColor: 'rgba(59, 130, 246, 0.2)' }
      case 'Completed':
        return { background: 'rgba(16, 185, 129, 0.1)', color: '#059669', borderColor: 'rgba(16, 185, 129, 0.2)' }
      case 'Proposed':
      default:
        return { background: 'rgba(100, 116, 139, 0.1)', color: '#475569', borderColor: 'rgba(100, 116, 139, 0.2)' }
    }
  }

  return (
    <section className="clinic-record-page pat-profile-page" data-testid="feature-page-clin.plans">
      {/* Header */}
      <header className="clinic-record-header" style={{ marginBottom: '4px' }}>
        <div>
          <span className="clinic-record-eyebrow">CLINICAL WORKFLOW</span>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '2px 0 4px 0' }}>Treatment Plans</h1>
          <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '14px' }}>
            Comprehensive dental care plans, proposed procedures, and stage-by-stage clinical tracking.
          </p>
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="pat-filter-bar">
        <div className="pat-search-wrap">
          <input
            className="pat-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search procedures, patients, doctors, or tooth numbers..."
            style={{ paddingLeft: '14px' }}
          />
        </div>

        <div className="pat-filter-chips">
          {(['All', 'Proposed', 'Accepted', 'In Progress', 'Pending', 'Completed'] as PlanStatusFilter[]).map((status) => (
            <button
              key={status}
              type="button"
              className={`pat-chip ${activeStatus === status ? 'is-active' : ''}`}
              onClick={() => setActiveStatus(status)}
            >
              <span>{status}</span>
              <span style={{ fontSize: '11px', opacity: 0.85 }}>({counts[status]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Treatment Plans Table */}
      {filteredPlans.length > 0 ? (
        <div className="pat-table-container">
          <table className="pat-table" aria-label="Treatment plans table">
            <thead>
              <tr>
                <th>Patient</th>
                <th>Procedure & Site</th>
                <th>Category</th>
                <th>Treating Doctor</th>
                <th>Est. Fee</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlans.map((plan) => {
                const p = patientMap.get(plan.patientId.toLowerCase())
                const patientName = p ? `${p.firstName} ${p.lastName}` : plan.patientId
                const badgeStyle = getStatusBadgeStyle(plan.status)

                return (
                  <tr key={plan.id} className="pat-row">
                    <td>
                      <div>
                        <Link
                          to={`/patients/${plan.patientId}`}
                          style={{ fontWeight: 600, color: 'var(--teal-primary, #0b8185)', textDecoration: 'none' }}
                        >
                          {patientName}
                        </Link>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted, #64748b)' }}>
                          ID: {plan.patientId}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div>
                        <strong style={{ color: 'var(--text-main, #0f172a)' }}>{plan.procedure}</strong>
                        {plan.toothNumber && (
                          <span style={{ marginLeft: '6px', fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                            (Tooth #{plan.toothNumber})
                          </span>
                        )}
                        {plan.notes && (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                            {plan.notes}
                          </div>
                        )}
                      </div>
                    </td>

                    <td>
                      <span className="pat-badge">{plan.category}</span>
                    </td>

                    <td>
                      <span style={{ fontSize: '13px', color: 'var(--text-main, #0f172a)' }}>
                        {plan.doctor}
                      </span>
                    </td>

                    <td>
                      <span style={{ fontWeight: 700, fontSize: '14px' }}>
                        ₹{plan.cost.toLocaleString('en-IN')}
                      </span>
                    </td>

                    <td>
                      <select
                        value={plan.status}
                        onChange={(e) => handleStatusChange(plan.id, e.target.value as TreatmentPlanRecord['status'])}
                        style={{
                          ...badgeStyle,
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        <option value="Proposed">Proposed</option>
                        <option value="Accepted">Accepted</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Pending">Pending</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <Link
                        to={`/patients/${plan.patientId}`}
                        className="pat-action-btn"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                      >
                        <span>Patient Profile</span>
                        <ArrowRight size={12} />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="clinic-record-empty" style={{ padding: '48px 20px', textAlign: 'center' }}>
          <Stethoscope size={30} style={{ color: 'var(--text-muted, #94a3b8)', marginBottom: '8px' }} />
          <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>No treatment plans found</h3>
          <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '13px' }}>
            {searchQuery
              ? 'No treatment plans match your search query.'
              : `No treatment plans currently in "${activeStatus}" state.`}
          </p>
        </div>
      )}
    </section>
  )
}

export default TreatmentPlansPage
