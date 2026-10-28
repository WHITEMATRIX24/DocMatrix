import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileQuestion, Home } from 'lucide-react'
import { DemoBanner } from '@/components/DemoBanner'

export const NotFoundPage: React.FC = () => {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <DemoBanner />
      <div className="p-4 flex items-center justify-center my-auto">
        <Card className="max-w-md w-full text-center shadow-md">
          <CardHeader className="space-y-2 pb-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <FileQuestion className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight">
              404 - {t('errors.notFoundTitle')}
            </CardTitle>
            <CardDescription className="text-sm">
              {t('errors.notFoundDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <Link to="/dashboard">
              <Button className="gap-2">
                <Home className="h-4 w-4" />
                <span>{t('errors.backToDashboard')}</span>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
      <div className="py-2" />
    </div>
  )
}

export default NotFoundPage
