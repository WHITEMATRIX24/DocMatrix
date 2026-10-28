import React, { useState, forwardRef } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'

/**
 * PasswordInput component
 * Includes lock icon on the left and show/hide eye toggle on the right.
 * Supports ref forwarding for auto-focusing on failed validation.
 */
const PasswordInput = forwardRef(function PasswordInput(
  {
    id = 'password',
    name = 'password',
    value,
    onChange,
    placeholder = 'Password',
    hasError = false,
    autoComplete = 'current-password',
    required = false,
    disabled = false
  },
  ref
) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className={`auth-input-container ${hasError ? 'is-invalid' : ''}`}>
      <span className="auth-field-icon" aria-hidden="true">
        <Lock size={18} />
      </span>

      <input
        ref={ref}
        id={id}
        name={name}
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="auth-text-input auth-password-field"
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
      />

      <button
        type="button"
        className="auth-eye-toggle"
        onClick={() => setShowPassword((prev) => !prev)}
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        disabled={disabled}
        tabIndex={0}
      >
        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
})

export default PasswordInput
