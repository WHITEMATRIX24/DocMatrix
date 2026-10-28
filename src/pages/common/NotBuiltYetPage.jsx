import React from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { Construction, ArrowLeft, Home } from 'lucide-react'
import { DemoBanner } from '@/components/DemoBanner'

export function NotBuiltYetPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const buttonName = searchParams.get('button') || 'Feature'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper, #fbfbf9)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }} data-testid="not-built-yet-page">
      <div style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 'auto' }}>
        <div style={{
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          background: '#ffffff',
          borderRadius: '16px',
          padding: '36px 28px',
          border: '1px solid var(--line, #e9e9e5)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)'
        }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(0, 136, 145, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: 'var(--teal-primary, #008891)' }}>
            <Construction size={26} />
          </div>
          <span style={{ fontSize: '11px', fontWeight: '800', background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
            Work In Progress
          </span>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--charcoal-title, #1a2626)', marginTop: '10px', marginBottom: '8px' }}>
            {buttonName}
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--charcoal-muted, #6e7e7d)', lineHeight: '1.5', marginBottom: '24px' }}>
            The <strong>"{buttonName}"</strong> page is currently being integrated into DocMatrix. No button in the application is a dead click.
          </p>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate(-1)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 18px',
                borderRadius: '999px',
                border: '1px solid var(--line, #e9e9e5)',
                background: '#ffffff',
                color: 'var(--charcoal-dark, #111a1a)',
                fontSize: '12.5px',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={14} />
              <span>Go Back</span>
            </button>
            <Link
              to="/"
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
              <span>DocMatrix Home</span>
            </Link>
          </div>
        </div>
      </div>
      <div style={{ padding: '8px' }} />
    </div>
  )
}

export default NotBuiltYetPage
