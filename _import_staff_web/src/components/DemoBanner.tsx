import React from 'react'
import { useTranslation } from 'react-i18next'
import { ShieldAlert } from 'lucide-react'

export const DEMO_BANNER_TEXT = "Demo only. Nothing is saved or sent. Do not enter real patient data."

export const DemoBanner: React.FC = () => {
  const { t } = useTranslation()

  return (
    <div
      role="region"
      aria-label="Demo environment notice"
      className="sticky top-0 z-[60] w-full bg-amber-500 text-amber-950 px-4 py-2 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-sm text-center border-b border-amber-600/20"
      data-testid="demo-banner"
    >
      <ShieldAlert className="h-4 w-4 shrink-0 text-amber-950" aria-hidden="true" />
      <span>{t('common.demoBanner', DEMO_BANNER_TEXT)}</span>
    </div>
  )
}
