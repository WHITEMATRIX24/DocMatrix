import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ShieldX, Home } from 'lucide-react'
import { useCurrentUser } from '@/hooks/useAuth'
import { DemoBanner } from '@/components/DemoBanner'

export const ForbiddenPage: React.FC = () => {
  const { t } = useTranslation()
  const { data: user } = useCurrentUser()

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <DemoBanner />
      <div className="p-4 flex items-center justify-center my-auto">
        <Card className="max-w-md w-full text-center shadow-md">
          <CardHeader className="space-y-2 pb-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
              <ShieldX className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight">
              403 - {t('errors.forbiddenTitle')}
            </CardTitle>
            <CardDescription className="text-sm">
              {t('errors.forbiddenDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {user && (
              <div className="p-3 bg-muted/60 rounded-md text-xs text-muted-foreground text-left space-y-1">
                <div>
                  <span className="font-semibold text-foreground">Logged in as:</span> {user.name}
                </div>
                <div>
                  <span className="font-semibold text-foreground">Current role:</span>{' '}
                  <span className="font-mono">{user.role}</span>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-center pt-2">
              <Link to="/dashboard">
                <Button className="gap-2">
                  <Home className="h-4 w-4" />
                  <span>{t('errors.backToDashboard')}</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="py-2" />
    </div>
  )
}

export default ForbiddenPage
