import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck, FileText } from 'lucide-react'

export const PrivacyPage: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper, #fbfbf9)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, padding: '36px clamp(16px, 4vw, 36px)', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '999px',
              border: '1px solid var(--line, #e9e9e5)',
              background: '#ffffff',
              fontSize: '12px',
              fontWeight: '700',
              color: 'var(--charcoal-dark, #111a1a)',
              textDecoration: 'none'
            }}
          >
            <ArrowLeft size={13} />
            <span>DocMatrix Home</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '800', color: 'var(--teal-primary, #008891)' }}>
            <ShieldCheck size={16} />
            <span>DocMatrix Privacy</span>
          </div>
        </div>

        {/* Draft Notice */}
        <div
          style={{
            background: '#fef3c7',
            border: '1px solid #fde68a',
            borderRadius: '12px',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            marginBottom: '24px'
          }}
          data-testid="draft-notice"
        >
          <FileText size={18} style={{ color: '#d97706', marginTop: '2px', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: '800', color: '#92400e', marginBottom: '2px' }}>
              DRAFT: final text to be supplied after legal review
            </div>
            <div style={{ fontSize: '12px', color: '#b45309', lineHeight: '1.5' }}>
              This document is a frontend draft specification for the DocMatrix multi-clinic practice management platform.
            </div>
          </div>
        </div>

        <div style={{ background: '#ffffff', borderRadius: '18px', border: '1px solid var(--line, #e9e9e5)', padding: '32px clamp(20px, 4vw, 40px)', boxShadow: '0 2px 12px rgba(0,0,0,0.02)' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--charcoal-title, #1a2626)', marginBottom: '8px' }}>
            Privacy Notice
          </h1>
          <p style={{ fontSize: '12px', color: 'var(--charcoal-muted, #6e7e7d)', marginBottom: '24px' }}>
            Last updated: October 2026 • Patient Confidentiality Policy
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '13.5px', color: 'var(--charcoal-body, #475554)', lineHeight: '1.65' }}>
            <section>
              <h2 style={{ fontSize: '16px', fontWeight: '750', color: 'var(--charcoal-title, #1a2626)', marginBottom: '6px' }}>
                1. Healthcare Information Protection
              </h2>
              <p>
                Patient personal data, radiographic scans, digital prescriptions, and periodontal charts are encrypted in transit and at rest. Access is strictly granted to licensed practitioners treating the patient.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '16px', fontWeight: '750', color: 'var(--charcoal-title, #1a2626)', marginBottom: '6px' }}>
                2. Communication & WhatsApp Reminders
              </h2>
              <p>
                Appointment confirmations, digital prescription PDFs, and recall reminders sent via WhatsApp require explicit patient consent. Patients may opt out of automated recall campaigns at any time.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '16px', fontWeight: '750', color: 'var(--charcoal-title, #1a2626)', marginBottom: '6px' }}>
                3. ABDM Compliance
              </h2>
              <p>
                DocMatrix adheres to Indian Ayushman Bharat Digital Mission (ABDM) guidelines for federated health records, ensuring patient consent prior to diagnostic record sharing.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPage
