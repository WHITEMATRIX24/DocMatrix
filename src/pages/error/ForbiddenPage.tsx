import React from 'react'
import { Link } from 'react-router-dom'
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react'
import { findDemoUserById } from '@/mocks/auth'

export const ForbiddenPage: React.FC = () => {
  const sessionUserId = typeof window !== 'undefined' ? sessionStorage.getItem('docmatrix-demo-session') : null
  const user = sessionUserId ? findDemoUserById(sessionUserId) : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper, #fbfbf9)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
        <div
          style={{
            maxWidth: '520px',
            width: '100%',
            background: '#ffffff',
            borderRadius: '18px',
            border: '1px solid #fee2e2',
            padding: '36px 28px',
            textAlign: 'center',
            boxShadow: '0 4px 24px rgba(220, 38, 38, 0.08)'
          }}
          data-testid="forbidden-page"
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: '#fef2f2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 18px auto'
            }}
          >
            <ShieldAlert size={30} />
          </div>

          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#991b1b', marginBottom: '8px' }}>
            403 - Access Forbidden
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--charcoal-body, #475554)', lineHeight: '1.55', marginBottom: '20px' }}>
            Your current staff role does not have permission to view this clinical or financial module.
          </p>

          {user && (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '12px 16px',
                fontSize: '12px',
                color: '#475569',
                textAlign: 'left',
                marginBottom: '24px',
                lineHeight: '1.6'
              }}
            >
              <div><strong>Staff Member:</strong> {user.name}</div>
              <div><strong>Active Role:</strong> <span style={{ fontFamily: 'monospace', fontWeight: '700' }}>{user.role}</span></div>
              <div><strong>Clinic:</strong> {user.clinicName}</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              to="/dashboard"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 20px',
                borderRadius: '999px',
                background: 'var(--teal-primary, #008891)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: '700',
                textDecoration: 'none'
              }}
            >
              <Home size={15} />
              <span>Return to Dashboard</span>
            </Link>
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 18px',
                borderRadius: '999px',
                border: '1px solid var(--line, #e9e9e5)',
                background: '#ffffff',
                color: 'var(--charcoal-dark, #111a1a)',
                fontSize: '13px',
                fontWeight: '600',
                textDecoration: 'none'
              }}
            >
              <ArrowLeft size={15} />
              <span>DocMatrix Home</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForbiddenPage
