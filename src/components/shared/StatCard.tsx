import React from 'react'

interface StatCardProps {
  label: string
  value: string | number
  subtext?: string
  icon?: React.ReactNode
  color?: string
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon,
  color = 'var(--teal-primary, #008891)'
}) => {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid var(--line, #e9e9e5)',
        borderRadius: '14px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.02)'
      }}
    >
      <div>
        <div
          style={{
            fontSize: '11px',
            fontWeight: '800',
            color: 'var(--charcoal-muted, #6e7e7d)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em'
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: '24px',
            fontWeight: '800',
            color: 'var(--charcoal-title, #1a2626)',
            marginTop: '2px',
            lineHeight: 1.2
          }}
        >
          {value}
        </div>
        {subtext && (
          <div
            style={{
              fontSize: '11.5px',
              color: 'var(--charcoal-body, #475554)',
              marginTop: '4px'
            }}
          >
            {subtext}
          </div>
        )}
      </div>

      {icon && (
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'var(--surface-alt, #f4f6f5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: color,
            flexShrink: 0
          }}
        >
          {icon}
        </div>
      )}
    </div>
  )
}

export default StatCard
