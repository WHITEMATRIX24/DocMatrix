import React from 'react'

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'brand'

interface StatusBadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  size?: 'sm' | 'md'
  icon?: React.ReactNode
}

const variantStyles: Record<BadgeVariant, { bg: string; color: string; border: string }> = {
  success: {
    bg: '#ecfdf5',
    color: '#065f46',
    border: '#a7f3d0'
  },
  warning: {
    bg: '#fffbeb',
    color: '#92400e',
    border: '#fde68a'
  },
  danger: {
    bg: '#fef2f2',
    color: '#991b1b',
    border: '#fecaca'
  },
  info: {
    bg: '#f0f9ff',
    color: '#075985',
    border: '#bae6fd'
  },
  neutral: {
    bg: '#f1f5f9',
    color: '#475569',
    border: '#cbd5e1'
  },
  brand: {
    bg: 'rgba(0, 136, 145, 0.08)',
    color: 'var(--teal-primary, #008891)',
    border: 'rgba(0, 136, 145, 0.25)'
  }
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  variant = 'neutral',
  children,
  size = 'md',
  icon
}) => {
  const st = variantStyles[variant] || variantStyles.neutral
  const isSm = size === 'sm'

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: isSm ? '2px 6px' : '3px 8px',
        borderRadius: '999px',
        fontSize: isSm ? '11px' : '12px',
        fontWeight: '700',
        lineHeight: 1.2,
        background: st.bg,
        color: st.color,
        border: `1px solid ${st.border}`,
        whiteSpace: 'nowrap'
      }}
    >
      {icon}
      {children}
    </span>
  )
}

export default StatusBadge
