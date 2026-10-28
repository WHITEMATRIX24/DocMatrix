import React from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCurrentUser } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DEMO_DASHBOARD_METRICS } from '@/mocks/dashboard'
import { ArrowUpRight, Sparkles } from 'lucide-react'

export const DashboardPage: React.FC = () => {
  const { t } = useTranslation()
  const { data: user } = useCurrentUser()

  return (
    <div className="space-y-6 max-w-6xl" data-testid="dashboard-page">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {t('dashboard.title')}
            </h1>
            <Badge variant="secondary" className="bg-amber-100 text-amber-900 border-amber-200 text-xs font-semibold">
              <Sparkles className="h-3 w-3 mr-1" />
              DEMO DATA
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('dashboard.subtitle')} • {user?.clinicName}
          </p>
        </div>
      </div>

      {/* Grid of clearly labelled demo cards linking to pages */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="dashboard-metrics-grid">
        {DEMO_DASHBOARD_METRICS.map((metric) => (
          <Link
            key={metric.id}
            to={metric.route}
            className="group block transition-transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-ring rounded-xl"
            data-testid={`dashboard-card-${metric.id}`}
          >
            <Card className="h-full border transition-colors hover:border-primary/50 hover:shadow-md bg-card">
              <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
                <div className="space-y-1">
                  <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground">
                    {metric.badgeText}
                  </Badge>
                  <CardDescription className="text-xs font-medium text-muted-foreground pt-1">
                    {t(metric.titleKey)}
                  </CardDescription>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardHeader>
              <CardContent className="space-y-1">
                <CardTitle className="text-2xl sm:text-3xl font-bold text-foreground">
                  {metric.value}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {metric.subtext}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default DashboardPage
