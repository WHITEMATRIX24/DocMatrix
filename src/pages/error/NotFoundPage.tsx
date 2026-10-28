import React from 'react'
import { Link } from 'react-router-dom'
import { FileQuestion, Home } from 'lucide-react'
import { DemoBanner } from '@/components/DemoBanner'

export function NotFoundPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper, #fbfbf9)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 'auto' }}>
        <div style={{
          maxWidth: '440px',
          width: '100%',
          textAlign: 'center',
          background: '#ffffff',
          borderRadius: '16px',
          padding: '36px 28px',
          border: '1px solid var(--line, #e9e9e5)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f4f6f5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: 'var(--charcoal-muted, #6e7e7d)' }}>
            <FileQuestion size={24} />
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--charcoal-title, #1a2626)', marginBottom: '8px' }}>
            404 - Page Not Found
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--charcoal-muted, #6e7e7d)', lineHeight: '1.5', marginBottom: '20px' }}>
            The requested clinical route does not exist in the active feature registry.
          </p>
          <Link
            to="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              borderRadius: '999px',
              background: 'var(--teal-primary, #008891)',
              color: '#ffffff',
              fontSize: '12.5px',
              fontWeight: '700',
              textDecoration: 'none'
            }}
          >
            <Home size={14} />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
      <div style={{ padding: '8px' }} />
    </div>
  )
}

export default NotFoundPage
