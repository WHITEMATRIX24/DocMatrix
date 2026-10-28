import React, { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, ArrowLeft, RefreshCw, Sparkles } from 'lucide-react'

interface OtpVerificationProps {
  phone: string
  onChangeNumber: () => void
  onResendOtp: () => Promise<void>
  onVerify: (code: string) => Promise<{ success: boolean; error?: string; locked?: boolean }>
  onSuccess: () => void
  submitting: boolean
}

export const OtpVerification: React.FC<OtpVerificationProps> = ({
  phone,
  onChangeNumber,
  onResendOtp,
  onVerify,
  onSuccess,
  submitting,
}) => {
  const { t } = useTranslation()
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', ''])
  const [countdown, setCountdown] = useState(60)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  // 60-second countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  const handleChange = (index: number, value: string) => {
    // Only accept numeric characters
    const clean = value.replace(/\D/g, '')
    if (!clean) {
      const next = [...digits]
      next[index] = ''
      setDigits(next)
      return
    }

    // If pasted multiple digits
    if (clean.length > 1) {
      const chars = clean.slice(0, 6).split('')
      const next = [...digits]
      chars.forEach((c, i) => {
        if (i < 6) next[i] = c
      })
      setDigits(next)
      const nextIndex = Math.min(chars.length, 5)
      inputRefs.current[nextIndex]?.focus()

      // If full 6 digits pasted, trigger submit
      if (chars.length === 6) {
        submitCode(chars.join(''))
      }
      return
    }

    const next = [...digits]
    next[index] = clean[0] || ''
    setDigits(next)

    // Move to next input if single digit entered
    if (clean[0] && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto submit when 6th digit entered
    if (clean[0] && index === 5) {
      const full = [...next.slice(0, 5), clean[0]].join('')
      if (full.length === 6) {
        submitCode(full)
      }
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return

    const chars = pasted.split('')
    const next = ['', '', '', '', '', '']
    chars.forEach((c, i) => {
      next[i] = c
    })
    setDigits(next)
    inputRefs.current[Math.min(chars.length, 5)]?.focus()

    if (chars.length === 6) {
      submitCode(pasted)
    }
  }

  const submitCode = async (code: string) => {
    if (submitting || isLocked || code.length !== 6) return
    setErrorMessage(null)

    const res = await onVerify(code)
    if (res.success) {
      onSuccess()
    } else {
      setErrorMessage(res.error || t('auth.codeInvalid'))
      if (res.locked) {
        setIsLocked(true)
      }
      // Clear inputs for re-try
      setDigits(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    submitCode(digits.join(''))
  }

  const handleResend = async () => {
    if (countdown > 0 || submitting) return
    setErrorMessage(null)
    setIsLocked(false)
    setDigits(['', '', '', '', '', ''])
    await onResendOtp()
    setCountdown(60)
    inputRefs.current[0]?.focus()
  }

  return (
    <form onSubmit={handleManualSubmit} className="space-y-5" aria-label="Verification form">
      <div className="space-y-1 text-center">
        <p className="text-sm text-muted-foreground">{t('auth.enterCode')}</p>
        <p className="text-sm font-semibold text-foreground tracking-wide">{phone}</p>
      </div>

      <div className="flex items-center justify-center gap-1.5 p-2 bg-amber-50 border border-amber-200 rounded-md text-amber-900 text-xs font-medium">
        <Sparkles className="h-3.5 w-3.5 text-amber-700" />
        <span>{t('auth.demoCodeHint')}</span>
      </div>

      <div
        className="flex justify-center gap-2 sm:gap-3"
        onPaste={handlePaste}
        data-testid="otp-inputs"
      >
        {digits.map((digit, idx) => (
          <input
            key={idx}
            ref={(el) => {
              inputRefs.current[idx] = el
            }}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={1}
            disabled={submitting || isLocked}
            value={digit}
            onChange={(e) => handleChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-lg border border-input bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 transition-all shadow-sm"
            aria-label={`Digit ${idx + 1}`}
            data-testid={`otp-input-${idx}`}
          />
        ))}
      </div>

      <div aria-live="polite" className="min-h-[24px]">
        {errorMessage && (
          <Alert variant="destructive" className="py-2 px-3 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
      </div>

      <Button
        type="submit"
        className="w-full h-10 font-semibold"
        disabled={submitting || isLocked || digits.join('').length !== 6}
        data-testid="verify-otp-btn"
      >
        {submitting ? t('common.loading') : t('auth.verifyAndLogin')}
      </Button>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 text-xs">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onChangeNumber}
          disabled={submitting}
          className="gap-1.5 h-8 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{t('auth.changeNumber')}</span>
        </Button>

        {countdown > 0 ? (
          <span className="text-muted-foreground font-mono">
            {t('auth.resendIn', { seconds: countdown })}
          </span>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResend}
            disabled={submitting}
            className="gap-1.5 h-8 text-primary font-semibold hover:text-primary/90"
            data-testid="resend-otp-btn"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{t('auth.resendNow')}</span>
          </Button>
        )}
      </div>
    </form>
  )
}
