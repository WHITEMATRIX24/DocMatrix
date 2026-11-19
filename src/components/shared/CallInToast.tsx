import React, { useEffect } from 'react'
import { AlertTriangle, CheckCircle2, X } from 'lucide-react'
import './CallInToast.css'

export interface CallInToastData {
  type: 'success' | 'error'
  title: string
  message: string
}

interface CallInToastProps {
  toast: CallInToastData | null
  onClose: () => void
  duration?: number
}

export const CallInToast: React.FC<CallInToastProps> = ({
  toast,
  onClose,
  duration = 5000,
}) => {
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => {
      onClose()
    }, duration)
    return () => clearTimeout(timer)
  }, [toast, onClose, duration])

  if (!toast) return null

  const isSuccess = toast.type === 'success'

  return (
    <div
      className={`dmx-callin-toast ${isSuccess ? 'is-success' : 'is-error'}`}
      role={isSuccess ? 'status' : 'alert'}
      aria-live="polite"
      data-testid="callin-whatsapp-toast"
    >
      <div className="dmx-callin-toast-icon">
        {isSuccess ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
      </div>
      <div className="dmx-callin-toast-body">
        <h4 className="dmx-callin-toast-title">{toast.title}</h4>
        <p className="dmx-callin-toast-message">{toast.message}</p>
      </div>
      <button
        type="button"
        className="dmx-callin-toast-dismiss"
        onClick={onClose}
        aria-label="Dismiss notification"
      >
        <X size={15} />
      </button>
    </div>
  )
}

export default CallInToast
