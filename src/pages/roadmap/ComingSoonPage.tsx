import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { getFeatureById } from '@/features/registry'
import NotFoundPage from '@/pages/error/NotFoundPage'
import { Clock, Home, ArrowLeft, Milestone } from 'lucide-react'

export const ComingSoonPage = () => {
  const { id } = useParams()

  if (!id) return <NotFoundPage />

  const feature = getFeatureById(id)
  if (!feature || feature.phase === 'launch') {
    return <NotFoundPage />
  }

  const phaseLabel = feature.phase === 'v2' ? 'Version 2 Roadmap' : 'Later Roadmap'

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }} data-testid={`coming-soon-${id}`}>
      <div>
        <Link
          to="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: '700',
            color: 'var(--charcoal-muted, #6e7e7d)',
            textDecoration: 'none',
            padding: '4px 8px',
            borderRadius: '6px',
            background: 'rgba(0, 0, 0, 0.03)'
          }}
        >
          <ArrowLeft size={13} />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      <div style={{
        background: '#ffffff',
        border: '1px solid var(--line, #e9e9e5)',
        borderRadius: '16px',
        padding: '28px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', background: 'rgba(0, 136, 145, 0.1)', color: 'var(--teal-primary, #008891)', padding: '3px 8px', borderRadius: '4px' }}>
            {feature.area}
          </span>
          <span style={{ fontSize: '11px', fontWeight: '800', background: '#e0e7ff', color: '#3730a3', padding: '3px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Milestone size={11} />
            {phaseLabel}
          </span>
          <span style={{ fontSize: '11px', fontWeight: '700', background: '#f4f6f5', color: '#6e7e7d', padding: '3px 8px', borderRadius: '4px' }}>
            Status: Planned
          </span>
        </div>

        <h1 style={{ fontSize: '26px', fontWeight: '800', color: 'var(--charcoal-title, #1a2626)', marginBottom: '8px' }}>
          {feature.name}
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--charcoal-body, #475554)', lineHeight: '1.6', marginBottom: '20px' }}>
          {feature.description}
        </p>

        <div style={{
          padding: '20px',
          borderRadius: '12px',
          background: 'var(--paper, #fbfbf9)',
          border: '1.5px dashed var(--line, #e9e9e5)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: '750', color: 'var(--teal-primary, #008891)', marginBottom: '4px' }}>
            <Clock size={15} />
            <span>Feature Plan Ref: {feature.source}</span>
          </div>
          <div style={{ fontSize: '11.5px', color: 'var(--charcoal-muted, #6e7e7d)', fontFamily: 'monospace', marginBottom: '16px' }}>
            Roadmap Item ID: {feature.id}
          </div>

          <p style={{ fontSize: '12.5px', color: 'var(--charcoal-muted, #6e7e7d)', lineHeight: '1.5', marginBottom: '16px' }}>
            This module is part of the DocMatrix {phaseLabel} specification. In this stage, all roadmap items are cataloged in the single source of truth registry and will be activated according to the release schedule.
          </p>

          <Link
            to="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '999px',
              border: '1px solid var(--line, #e9e9e5)',
              background: '#ffffff',
              fontSize: '12px',
              fontWeight: '700',
              color: 'var(--charcoal-dark, #111a1a)',
              textDecoration: 'none'
            }}
          >
            <Home size={13} />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ComingSoonPage
