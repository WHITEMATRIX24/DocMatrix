import React from 'react'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'
import { setLanguage } from '@/i18n/config'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export const LanguageSwitcher: React.FC<{ variant?: 'outline' | 'ghost' }> = ({
  variant = 'outline',
}) => {
  const { i18n, t } = useTranslation()
  const currentLang = i18n.language || 'en'

  const handleSelect = (lang: string) => {
    setLanguage(lang)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size="sm"
          className="gap-2 h-8 px-2.5 text-xs font-medium"
          aria-label={t('common.language')}
          data-testid="language-switcher-trigger"
        >
          <Globe className="h-3.5 w-3.5" />
          <span>{currentLang === 'ml' ? 'മലയാളം' : 'English'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem
          onClick={() => handleSelect('en')}
          className={currentLang === 'en' ? 'font-semibold bg-accent' : ''}
          data-testid="lang-en"
        >
          English
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleSelect('ml')}
          className={currentLang === 'ml' ? 'font-semibold bg-accent' : ''}
          data-testid="lang-ml"
        >
          മലയാളം (Malayalam)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
