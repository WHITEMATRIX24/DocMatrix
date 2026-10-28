import React from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

/**
 * Alert / Error banner shown above auth forms
 */
export default function AuthBanner({ type = 'error', message }) {
  if (!message) return null

  const isError = type === 'error'

  return (
    <div
      className={`auth-banner auth-banner-${type}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="auth-banner-icon">
        {isError ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
      </div>
      <div className="auth-banner-message">{message}</div>
    </div>
  )
}
