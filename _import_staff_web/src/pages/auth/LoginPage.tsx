import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { OtpVerification } from '@/components/OtpVerification'
import { DemoBanner } from '@/components/DemoBanner'
import { MedicalCrossMark } from '@/components/MedicalCrossMark'
import {
  useRequestOtpMutation,
  useVerifyOtpMutation,
  useRoleLoginMutation,
} from '@/hooks/useAuth'
import { StaffRole, DEMO_USERS } from '@/mocks/auth'
import { ArrowRight, CheckCircle2, Phone, UserCheck } from 'lucide-react'

export function getSafeRedirect(target: string | null): string {
  if (!target) return '/dashboard'
  const trimmed = target.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return '/dashboard'
  }
  const pathPart = trimmed.split('?')[0]?.split('#')[0] || ''
  if (pathPart.includes(':') || pathPart.includes('\\')) {
    return '/dashboard'
  }
  return trimmed
}

export const LoginPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const nextParam = searchParams.get('next')
  const redirectTarget = getSafeRedirect(nextParam)

  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [phone, setPhone] = useState('+91')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [neutralMessage, setNeutralMessage] = useState<string | null>(null)

  const requestOtpMutation = useRequestOtpMutation()
  const verifyOtpMutation = useVerifyOtpMutation()
  const roleLoginMutation = useRoleLoginMutation()

  const validatePhone = (val: string): boolean => {
    const clean = val.replace(/\s+/g, '')
    const phoneRegex = /^\+?[0-9]{8,15}$/
    return phoneRegex.test(clean)
  }

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setPhoneError(null)

    if (!validatePhone(phone)) {
      setPhoneError(t('auth.invalidPhone'))
      return
    }

    const res = await requestOtpMutation.mutateAsync(phone)
    setNeutralMessage(res.message)
    setStep('otp')
  }

  const handleVerifyOtp = async (code: string) => {
    const res = await verifyOtpMutation.mutateAsync({ phone, code })
    return res
  }

  const handleLoginSuccess = () => {
    navigate(redirectTarget)
  }

  const handleQuickRoleLogin = async (role: StaffRole) => {
    await roleLoginMutation.mutateAsync(role)
    navigate(redirectTarget)
  }

  return (
    <div className="min-h-screen bg-[#fbfbf9] flex flex-col justify-between">
      <DemoBanner />
      <div className="w-full max-w-md mx-auto p-4 sm:p-6 my-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <MedicalCrossMark />
            <span className="font-extrabold text-base tracking-wider text-primary">
              DOC MATRIX
            </span>
          </div>
          <LanguageSwitcher />
        </div>

        <Card className="shadow-[0_4px_24px_rgba(0,136,145,0.06)] border-[#e9e9e5] bg-card rounded-2xl">
          <CardHeader className="space-y-1 text-center pb-4">
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {t('auth.loginTitle')}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground">
              {t('auth.loginSubtitle')}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {step === 'phone' ? (
              <form onSubmit={handleRequestOtp} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <Label htmlFor="phone-input" className="text-xs font-semibold">
                    {t('auth.phoneLabel')}
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone-input"
                      type="tel"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value)
                        setPhoneError(null)
                      }}
                      placeholder={t('auth.phonePlaceholder')}
                      className="pl-9 font-medium"
                      autoFocus
                      disabled={requestOtpMutation.isPending}
                      data-testid="phone-input"
                    />
                  </div>
                  {phoneError && (
                    <p className="text-xs text-destructive font-medium" role="alert">
                      {phoneError}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-10 font-semibold gap-2"
                  disabled={requestOtpMutation.isPending}
                  data-testid="request-otp-btn"
                >
                  {requestOtpMutation.isPending ? (
                    t('common.loading')
                  ) : (
                    <>
                      <span>{t('auth.requestOtp')}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                {neutralMessage && (
                  <Alert className="py-2 px-3 text-xs bg-slate-100 text-slate-800 border-slate-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <AlertDescription className="font-medium">
                      {neutralMessage}
                    </AlertDescription>
                  </Alert>
                )}

                <OtpVerification
                  phone={phone}
                  onChangeNumber={() => {
                    setStep('phone')
                    setNeutralMessage(null)
                  }}
                  onResendOtp={async () => {
                    await requestOtpMutation.mutateAsync(phone)
                  }}
                  onVerify={handleVerifyOtp}
                  onSuccess={handleLoginSuccess}
                  submitting={verifyOtpMutation.isPending}
                />
              </div>
            )}

            <div className="pt-2 text-center text-xs text-muted-foreground border-t border-border/60">
              <span>{t('auth.noAccount')} </span>
              <Link
                to="/sign-up"
                className="font-semibold text-primary underline-offset-4 hover:underline"
                data-testid="link-to-signup"
              >
                {t('auth.registerClinic')}
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Demo instant login panel */}
        <Card className="border border-dashed border-primary/30 bg-primary/5">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center gap-2 text-primary font-semibold text-xs">
              <UserCheck className="h-4 w-4" />
              <span>{t('auth.instantRoleLogin')}</span>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <p className="text-[11px] text-muted-foreground mb-2">
              Select any role to test permissions and clinical workflows:
            </p>
            <div className="grid grid-cols-2 gap-1.5" data-testid="demo-role-buttons">
              {(Object.keys(DEMO_USERS) as StaffRole[]).map((role) => (
                <Button
                  key={role}
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => handleQuickRoleLogin(role)}
                  disabled={roleLoginMutation.isPending}
                  className="h-8 text-[11px] px-2 justify-start font-medium truncate bg-background hover:bg-primary/10 hover:text-primary hover:border-primary/50"
                  data-testid={`role-btn-${role}`}
                >
                  <span className="truncate">{t(`roles.${role}`)}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-[11px] text-muted-foreground flex items-center justify-center gap-4">
          <Link to="/terms" className="hover:underline">
            {t('auth.termsLink')}
          </Link>
          <span>•</span>
          <Link to="/privacy" className="hover:underline">
            {t('auth.privacyLink')}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
