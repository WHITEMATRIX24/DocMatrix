import React from 'react'
import { Link } from 'react-router-dom'
import { Calculator, ArrowRight, Stethoscope } from 'lucide-react'

export const TreatmentEstimatesPage: React.FC = () => {
  return (
    <section className="clinic-record-page" data-testid="feature-page-clin.estimates" style={{ padding: '32px' }}>
      <header className="clinic-record-header" style={{ marginBottom: '20px' }}>
        <div>
          <span className="clinic-record-eyebrow">CLINICAL WORKFLOW</span>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '2px 0 6px 0', color: 'var(--text-main, #0f172a)' }}>
            Treatment Cost Estimates
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '13.5px' }}>
            Procedure cost estimations are linked with proposed dental treatment plans.
          </p>
        </div>
      </header>

      <div style={{
        maxWidth: '680px',
        background: 'var(--surface, #ffffff)',
        border: '1px solid var(--line, #e2e8f0)',
        borderRadius: '12px',
        padding: '28px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          background: 'rgba(0, 136, 145, 0.1)',
          color: 'var(--teal-primary, #008891)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px'
        }}>
          <Calculator size={22} />
        </div>

        <h2 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-main, #0f172a)' }}>
          Treatment Planning & Cost Estimation
        </h2>

        <p style={{ fontSize: '13.5px', color: 'var(--text-muted, #64748b)', lineHeight: '1.6', margin: '0 0 20px 0' }}>
          Treatment cost estimations are integrated directly into <strong>Treatment Plans</strong>. This allows dentists and patients to review proposed dental procedures, estimated chairside fees, and stage-by-stage clinical progression in one unified clinical view.
        </p>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link
            to="/clinical/treatment-plans"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              borderRadius: '8px',
              background: 'var(--teal-primary, #008891)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            <Stethoscope size={15} /> Open Treatment Plans <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  )
}

export default TreatmentEstimatesPage
