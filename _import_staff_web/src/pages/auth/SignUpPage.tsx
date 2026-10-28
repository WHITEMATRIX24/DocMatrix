import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { OtpVerification } from '@/components/OtpVerification'
import { DemoBanner } from '@/components/DemoBanner'
import { MedicalCrossMark } from '@/components/MedicalCrossMark'
import { useRegisterClinicMutation, useVerifyOtpMutation } from '@/hooks/useAuth'
import { ArrowRight } from 'lucide-react'

const signUpSchema = z.object({
  clinicName: z.string().min(2, 'Clinic name must be at least 2 characters'),
  ownerName: z.string().min(2, 'Owner or doctor name is required'),
  phone: z
    .string()
    .regex(/^\+?[0-9]{8,15}$/, 'Please enter a valid phone number (8 to 15 digits)'),
  city: z.string().min(2, 'City or town is required'),
  state: z.string().min(1, 'State is required'),
  clinicType: z.enum(['Solo dentist', 'Multi-dentist clinic', 'Clinic chain']),
  agreeTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must agree to the Terms and the Privacy Notice' }),
  }),
  whatsappUpdates: z.boolean().optional(),
})

type SignUpFormValues = z.infer<typeof signUpSchema>

const INDIAN_STATES = [
  'Kerala',
  'Tamil Nadu',
  'Karnataka',
  'Andhra Pradesh',
  'Telangana',
  'Maharashtra',
  'Delhi',
  'Gujarat',
  'Goa',
  'Other',
]

export const SignUpPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [registeredPhone, setRegisteredPhone] = useState('')

  const registerClinicMutation = useRegisterClinicMutation()
  const verifyOtpMutation = useVerifyOtpMutation()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      clinicName: '',
      ownerName: '',
      phone: '+91',
      city: '',
      state: 'Kerala',
      clinicType: 'Solo dentist',
      agreeTerms: undefined,
      whatsappUpdates: false,
    },
  })

  const onSubmit = async (values: SignUpFormValues) => {
    setRegisteredPhone(values.phone)
    await registerClinicMutation.mutateAsync({
      clinicName: values.clinicName,
      ownerName: values.ownerName,
      phone: values.phone,
      city: values.city,
      state: values.state,
      clinicType: values.clinicType,
      agreeTerms: values.agreeTerms,
      whatsappUpdates: values.whatsappUpdates,
    })
    setStep('otp')
  }

  const handleVerifyOtp = async (code: string) => {
    const res = await verifyOtpMutation.mutateAsync({
      phone: registeredPhone,
      code,
    })
    return res
  }

  const handleRegistrationComplete = () => {
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#fbfbf9] flex flex-col justify-between pb-6">
      <DemoBanner />
      <div className="w-full max-w-lg mx-auto p-4 sm:p-6 my-auto space-y-6">
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
            <div className="flex items-center justify-center gap-2 mb-1">
              <Badge variant="secondary" className="font-semibold text-primary px-2.5 py-0.5">
                {t('common.freePlan')}
              </Badge>
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {step === 'form' ? t('auth.signupTitle') : t('auth.verifyingRegistration')}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-muted-foreground">
              {step === 'form'
                ? t('auth.signupSubtitle')
                : 'Enter the verification code sent to confirm your clinic account'}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {step === 'form' ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                {/* Clinic Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="clinicName" className="text-xs font-semibold">
                    {t('auth.clinicName')} *
                  </Label>
                  <Input
                    id="clinicName"
                    {...register('clinicName')}
                    placeholder={t('auth.clinicNamePlaceholder')}
                    className="h-9"
                    data-testid="clinic-name-input"
                  />
                  {errors.clinicName && (
                    <p className="text-xs text-destructive font-medium" role="alert">
                      {errors.clinicName.message}
                    </p>
                  )}
                </div>

                {/* Owner Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="ownerName" className="text-xs font-semibold">
                    {t('auth.ownerName')} *
                  </Label>
                  <Input
                    id="ownerName"
                    {...register('ownerName')}
                    placeholder={t('auth.ownerNamePlaceholder')}
                    className="h-9"
                    data-testid="owner-name-input"
                  />
                  {errors.ownerName && (
                    <p className="text-xs text-destructive font-medium" role="alert">
                      {errors.ownerName.message}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-semibold">
                    {t('auth.phoneLabel')} *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    {...register('phone')}
                    placeholder="+91 98765 43210"
                    className="h-9"
                    data-testid="signup-phone-input"
                  />
                  {errors.phone && (
                    <p className="text-xs text-destructive font-medium" role="alert">
                      {errors.phone.message}
                    </p>
                  )}
                </div>

                {/* City & State (2 columns) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="text-xs font-semibold">
                      {t('auth.city')} *
                    </Label>
                    <Input
                      id="city"
                      {...register('city')}
                      placeholder={t('auth.cityPlaceholder')}
                      className="h-9"
                      data-testid="city-input"
                    />
                    {errors.city && (
                      <p className="text-xs text-destructive font-medium" role="alert">
                        {errors.city.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="state" className="text-xs font-semibold">
                      {t('auth.state')} *
                    </Label>
                    <select
                      id="state"
                      {...register('state')}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      data-testid="state-select"
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                    {errors.state && (
                      <p className="text-xs text-destructive font-medium" role="alert">
                        {errors.state.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Clinic Type */}
                <div className="space-y-1.5">
                  <Label htmlFor="clinicType" className="text-xs font-semibold">
                    {t('auth.clinicType')} *
                  </Label>
                  <select
                    id="clinicType"
                    {...register('clinicType')}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    data-testid="clinic-type-select"
                  >
                    <option value="Solo dentist">{t('auth.typeSolo')}</option>
                    <option value="Multi-dentist clinic">{t('auth.typeMulti')}</option>
                    <option value="Clinic chain">{t('auth.typeChain')}</option>
                  </select>
                </div>

                {/* Required Agreement Checkbox */}
                <div className="space-y-1 pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      {...register('agreeTerms')}
                      className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                      data-testid="agree-terms-checkbox"
                    />
                    <span className="text-foreground leading-normal">
                      {t('auth.agreeTerms')}{' '}
                      <Link to="/terms" target="_blank" className="text-primary font-semibold hover:underline">
                        ({t('auth.termsLink')})
                      </Link>{' '}
                      &amp;{' '}
                      <Link to="/privacy" target="_blank" className="text-primary font-semibold hover:underline">
                        ({t('auth.privacyLink')})
                      </Link>
                    </span>
                  </label>
                  {errors.agreeTerms && (
                    <p className="text-xs text-destructive font-medium" role="alert">
                      {errors.agreeTerms.message}
                    </p>
                  )}
                </div>

                {/* Optional WhatsApp Checkbox */}
                <div className="pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      {...register('whatsappUpdates')}
                      className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                      data-testid="whatsapp-checkbox"
                    />
                    <span>{t('auth.whatsappUpdates')}</span>
                  </label>
                </div>

                <Button
                  type="submit"
                  className="w-full h-10 font-semibold gap-2 mt-4"
                  disabled={registerClinicMutation.isPending}
                  data-testid="submit-signup-btn"
                >
                  {registerClinicMutation.isPending ? (
                    t('common.loading')
                  ) : (
                    <>
                      <span>{t('auth.createAccount')}</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <OtpVerification
                phone={registeredPhone}
                onChangeNumber={() => setStep('form')}
                onResendOtp={async () => {
                  // Resend simulation
                }}
                onVerify={handleVerifyOtp}
                onSuccess={handleRegistrationComplete}
                submitting={verifyOtpMutation.isPending}
              />
            )}

            <div className="pt-2 text-center text-xs text-muted-foreground border-t border-border/60">
              <span>{t('auth.alreadyRegistered')} </span>
              <Link
                to="/login"
                className="font-semibold text-primary underline-offset-4 hover:underline"
                data-testid="link-to-login"
              >
                {t('auth.loginHere')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default SignUpPage
