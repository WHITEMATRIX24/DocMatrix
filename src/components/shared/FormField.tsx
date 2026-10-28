import React from 'react'

interface FormFieldProps {
  label: string
  htmlFor?: string
  error?: string
  helperText?: string
  required?: boolean
  children: React.ReactNode
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  error,
  helperText,
  required,
  children
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label
        htmlFor={htmlFor}
        style={{
          fontSize: '12.5px',
          fontWeight: '700',
          color: 'var(--charcoal-title, #1a2626)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        <span>{label}</span>
        {required && <span style={{ color: '#dc2626' }}>*</span>}
      </label>

      {children}

      {error ? (
        <span style={{ fontSize: '11.5px', color: '#dc2626', fontWeight: '600' }}>
          {error}
        </span>
      ) : helperText ? (
        <span style={{ fontSize: '11.5px', color: 'var(--charcoal-muted, #6e7e7d)' }}>
          {helperText}
        </span>
      ) : null}
    </div>
  )
}

export default FormField
