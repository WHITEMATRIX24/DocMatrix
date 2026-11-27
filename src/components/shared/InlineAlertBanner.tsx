import React from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, X } from 'lucide-react'

interface InlineAlertBannerProps {
  message: string
  onDismiss: () => void
}

/**
 * Responsive, dual-theme inline alert banner used across scheduling and clinical views.
 */
export const InlineAlertBanner: React.FC<InlineAlertBannerProps> = ({ message, onDismiss }) => {
  if (!message) return null
  const isConsentBlock = /\bconsent\b/i.test(message)

  return (
    <div className="dmx-inline-alert" role="alert" aria-live="polite">
      <div className="dmx-inline-alert-main">
        <span className="dmx-inline-alert-icon" aria-hidden="true">
          <AlertTriangle size={16} />
        </span>
        <span className="dmx-inline-alert-text">{message}</span>
      </div>
      <div className="dmx-inline-alert-actions">
        {isConsentBlock && (
          <Link to="/patients/consents" className="dmx-inline-alert-link" onClick={onDismiss}>
            Open Consents
          </Link>
        )}
        <button
          type="button"
          className="dmx-inline-alert-close"
          onClick={onDismiss}
          aria-label="Dismiss alert"
          title="Dismiss"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  )
}
