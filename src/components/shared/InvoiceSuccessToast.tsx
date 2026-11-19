import React, { useEffect } from 'react'
import { CheckCircle2, X } from 'lucide-react'
import { inr } from '@/pages/billing/BillingShared'
import './InvoiceSuccessToast.css'

export interface InvoiceSuccessToastData {
  invoiceNumber: string
  amount: number
}

interface InvoiceSuccessToastProps {
  toast: InvoiceSuccessToastData | null
  onClose: () => void
  duration?: number
}

export const InvoiceSuccessToast: React.FC<InvoiceSuccessToastProps> = ({
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

  return (
    <div
      className="dmx-invoice-toast"
      role="status"
      aria-live="polite"
      data-testid="invoice-success-toast"
    >
      <div className="dmx-invoice-toast-icon">
        <CheckCircle2 size={20} />
      </div>
      <div className="dmx-invoice-toast-body">
        <h4 className="dmx-invoice-toast-title">Invoice Generated Successfully!</h4>
        <div className="dmx-invoice-toast-meta">
          <span className="dmx-invoice-toast-num">
            Invoice No: <strong>{toast.invoiceNumber}</strong>
          </span>
          <span className="dmx-invoice-toast-separator">·</span>
          <span className="dmx-invoice-toast-amount">
            Total Amount: <strong>{inr(toast.amount)}</strong>
          </span>
        </div>
      </div>
      <button
        type="button"
        className="dmx-invoice-toast-dismiss"
        onClick={onClose}
        aria-label="Dismiss notification"
      >
        <X size={15} />
      </button>
    </div>
  )
}

export default InvoiceSuccessToast
