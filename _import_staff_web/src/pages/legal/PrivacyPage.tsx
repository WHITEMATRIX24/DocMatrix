import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ArrowLeft, FileText, Shield } from 'lucide-react'
import { DemoBanner } from '@/components/DemoBanner'

export const PrivacyPage: React.FC = () => {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-slate-50">
      <DemoBanner />
      <div className="py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/login">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span>{t('common.back')}</span>
            </Button>
          </Link>
          <div className="flex items-center gap-2 font-bold text-sm">
            <Shield className="h-4 w-4 text-primary" />
            <span>DocMatrix Privacy</span>
          </div>
        </div>

        <Alert className="border-amber-300 bg-amber-50 text-amber-900" data-testid="draft-notice">
          <FileText className="h-4 w-4 text-amber-700" />
          <AlertTitle className="font-semibold">{t('legal.draftNotice')}</AlertTitle>
          <AlertDescription className="text-xs">
            This document is a frontend draft specification for the DocMatrix multi-clinic platform.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>{t('legal.privacyTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-foreground/90 leading-relaxed">
            <h4 className="font-semibold text-base">1. Health Data Protection</h4>
            <p>
              DocMatrix maintains tenant isolation for each dental clinic organization. Patient
              records, clinical charting, and radiographic notes are managed under strict clinic
              stewardship without third-party data sharing.
            </p>

            <h4 className="font-semibold text-base">2. Security and Device Verification</h4>
            <p>
              Access to clinic patient data requires verified staff credentials, session isolation,
              and role-based permissions designed in alignment with Indian healthcare digital guidelines.
            </p>

            <h4 className="font-semibold text-base">3. Draft Privacy Disclaimer</h4>
            <p className="italic text-muted-foreground">
              {t('legal.draftNotice')}
            </p>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  )
}

export default PrivacyPage
