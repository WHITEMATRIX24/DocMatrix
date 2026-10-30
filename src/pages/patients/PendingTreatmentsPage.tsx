import React, { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Stethoscope, ArrowRight, ExternalLink, Clock } from 'lucide-react'
import { useClinicData, type TreatmentPlanRecord } from '@/services/clinicStore'
import './patientProfile.css'

export const PendingTreatmentsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { patients = [], treatmentPlans = [] } = useClinicData()

  const patient = useMemo(() => {
    return patients.find((p) => p.id.toLowerCase() === (id || '').toLowerCase())
  }, [patients, id])

  const pendingList = useMemo(() => {
    return (treatmentPlans as TreatmentPlanRecord[]).filter((p) => {
      const matchPatient = !id || p.patientId.toLowerCase() === id.toLowerCase()
      return matchPatient && (p.status === 'Pending' || p.status === 'In Progress')
    })
  }, [treatmentPlans, id])

  return (
    <section className="clinic-record-page pat-profile-page" data-testid="feature-page-pat.pending">
      <div>
        <Link
          className="clinic-record-back"
          to={id ? `/patients/${id}` : '/patients/list'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--teal-primary, #0b8185)', textDecoration: 'none', fontWeight: 500 }}
        >
          <ArrowLeft size={14} />
          <span>{id ? 'Back to Patient Profile' : 'Back to Patients'}</span>
        </Link>
      </div>

      <header className="clinic-record-header">
        <div>
          <span className="clinic-record-eyebrow">PATIENTS & CLINICAL INTEGRATION</span>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '2px 0 4px 0' }}>
            Pending Treatments {patient ? `· ${patient.firstName} ${patient.lastName}` : ''}
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '14px' }}>
            Detailed treatment management has been centralized in the Clinical module.
          </p>
        </div>
      </header>

      {/* Migration Notice Banner */}
      <div style={{ background: 'rgba(11, 129, 133, 0.08)', border: '1px solid rgba(11, 129, 133, 0.2)', padding: '14px 18px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Stethoscope size={22} style={{ color: 'var(--teal-primary, #0b8185)' }} />
          <div style={{ fontSize: '13px', color: 'var(--text-main, #0f172a)' }}>
            <strong>Centralized Clinical Workflow:</strong> All active, pending, and proposed care plans are tracked in Clinical Treatment Plans.
          </div>
        </div>
        <Link
          to="/clinical/treatment-plans"
          className="pat-btn pat-btn-primary"
          style={{ padding: '6px 14px', fontSize: '13px' }}
        >
          <span>Open Clinical Treatment Plans</span>
          <ArrowRight size={13} />
        </Link>
      </div>

      {/* Pending Items List */}
      <div className="pat-card" style={{ background: 'var(--surface, #ffffff)', marginTop: '8px' }}>
        <div className="pat-card-head">
          <h3>
            <Clock size={16} />
            <span>Pending Procedures for {patient ? `${patient.firstName} (${patient.id})` : 'All Patients'}</span>
          </h3>
          {patient && (
            <Link to={`/patients/${patient.id}?tab=overview`} className="pat-card-action">
              View Patient Profile →
            </Link>
          )}
        </div>

        {pendingList.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pendingList.map((plan) => (
              <div
                key={plan.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--line, #e2e8f0)',
                  background: 'var(--surface-subtle, #f8fafc)'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>
                    {plan.procedure} {plan.toothNumber && `• Tooth #${plan.toothNumber}`}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                    Patient: {plan.patientId} · Assigned: {plan.doctor} · Category: {plan.category}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontWeight: 700, fontSize: '14px' }}>₹{plan.cost.toLocaleString('en-IN')}</span>
                  <span
                    className="pat-badge"
                    style={{
                      background: plan.status === 'In Progress' ? 'rgba(14, 165, 233, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                      color: plan.status === 'In Progress' ? '#0ea5e9' : '#d97706',
                      fontWeight: 600
                    }}
                  >
                    {plan.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '13px' }}>
            No pending treatments recorded.
          </p>
        )}
      </div>
    </section>
  )
}

export default PendingTreatmentsPage
