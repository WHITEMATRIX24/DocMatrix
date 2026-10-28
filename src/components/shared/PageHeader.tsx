import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Home, Sparkles } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface PageHeaderProps {
  title: string
  subtitle?: string
  area?: string
  areaUrl?: string
  breadcrumbs?: BreadcrumbItem[]
  actions?: React.ReactNode
  badge?: React.ReactNode
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  area,
  areaUrl,
  breadcrumbs,
  actions,
  badge
}) => {
  const navigate = useNavigate()

  return (
    <header
      style={{
        background: '#ffffff',
        borderBottom: '1px solid var(--line, #e9e9e5)',
        padding: '16px clamp(16px, 3vw, 32px)',
        position: 'sticky',
        top: 0,
        zIndex: 40
      }}
    >
      {/* Top Navigation Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          gap: '12px',
          flexWrap: 'wrap'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px' }}>
          {area && (
            <Link
              to={areaUrl || `/${area.toLowerCase()}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 12px',
                borderRadius: '999px',
                border: '1px solid var(--line, #e9e9e5)',
                background: '#ffffff',
                color: 'var(--charcoal-dark, #111a1a)',
                fontWeight: '700',
                minHeight: '36px'
              }}
            >
              <ArrowLeft size={13} style={{ color: 'var(--teal-primary, #008891)' }} />
              <span>{area} Hub</span>
            </Link>
          )}

          {breadcrumbs && breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              <span style={{ color: 'var(--line, #e9e9e5)' }}>/</span>
              {crumb.href ? (
                <Link
                  to={crumb.href}
                  style={{ color: 'var(--charcoal-muted, #6e7e7d)', fontWeight: '600' }}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span style={{ color: 'var(--charcoal-title, #1a2626)', fontWeight: '800' }}>
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link
            to="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '999px',
              background: 'var(--surface-alt, #f4f6f5)',
              color: 'var(--charcoal-dark, #111a1a)',
              fontSize: '12px',
              fontWeight: '700',
              minHeight: '36px'
            }}
          >
            <Home size={13} style={{ color: 'var(--teal-primary, #008891)' }} />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Title & Actions Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1
              style={{
                fontSize: '22px',
                fontWeight: '800',
                color: 'var(--charcoal-title, #1a2626)',
                letterSpacing: '-0.02em',
                margin: 0
              }}
            >
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && (
            <p
              style={{
                fontSize: '13px',
                color: 'var(--charcoal-muted, #6e7e7d)',
                marginTop: '4px',
                marginBottom: 0
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {actions}
          </div>
        )}
      </div>
    </header>
  )
}

export default PageHeader
