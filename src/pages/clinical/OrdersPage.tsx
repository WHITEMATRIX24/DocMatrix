import React from 'react'
import { Link } from 'react-router-dom'
import { FileText, Users, ArrowRight, ShieldCheck } from 'lucide-react'

export const OrdersPage: React.FC = () => {
  return (
    <section className="clinic-record-page" data-testid="feature-page-clin.orders" style={{ padding: '32px' }}>
      <header className="clinic-record-header" style={{ marginBottom: '20px' }}>
        <div>
          <span className="clinic-record-eyebrow">CLINICAL WORKFLOW</span>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '2px 0 6px 0', color: 'var(--text-main, #0f172a)' }}>
            Pathology & X-ray Orders
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '13.5px' }}>
            Diagnostic imaging and lab orders are managed directly within the patient longitudinal record.
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
          <FileText size={22} />
        </div>

        <h2 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-main, #0f172a)' }}>
          Patient-Centred X-rays & Diagnostic Records
        </h2>

        <p style={{ fontSize: '13.5px', color: 'var(--text-muted, #64748b)', lineHeight: '1.6', margin: '0 0 20px 0' }}>
          To maintain pristine clinical audit trails, all intraoral radiographs (RVG), panoramic scans (OPG), CBCT volumes, pathology reports, and consent documents are attached directly to individual patient profiles under the <strong>X-rays & Documents</strong> vault.
        </p>

        <div style={{
          background: 'var(--surface-subtle, #f8fafc)',
          border: '1px solid var(--line, #e2e8f0)',
          borderRadius: '8px',
          padding: '14px 18px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontSize: '13px'
        }}>
          <ShieldCheck size={20} style={{ color: '#047857', flexShrink: 0 }} />
          <span>
            Document storage, encrypted attachments, and radiograph previews are unified within the patient profile.
          </span>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <Link
            to="/patients"
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
            <Users size={15} /> Select Patient Record
          </Link>

          <Link
            to="/patients/pt-1001?tab=documents"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              borderRadius: '8px',
              border: '1px solid var(--line, #e2e8f0)',
              background: 'var(--surface, #ffffff)',
              color: 'var(--text-main, #0f172a)',
              fontSize: '13px',
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            Open Sample Patient X-rays <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  )
}

export default OrdersPage
