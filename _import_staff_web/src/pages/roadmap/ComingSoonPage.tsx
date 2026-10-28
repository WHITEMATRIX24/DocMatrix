import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getFeatureById } from '@/features/registry'
import NotFoundPage from '@/pages/error/NotFoundPage'
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Clock, Home, ArrowLeft, Milestone } from 'lucide-react'

export const ComingSoonPage: React.FC = () => {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()

  if (!id) return <NotFoundPage />

  const feature = getFeatureById(id)
  // An unknown id, or a launch feature at coming-soon route, gives the 404 page
  if (!feature || feature.phase === 'launch') {
    return <NotFoundPage />
  }

  const phaseLabel = feature.phase === 'v2' ? 'Version 2 Roadmap' : 'Later Roadmap'

  return (
    <div className="space-y-6 max-w-4xl" data-testid={`coming-soon-${id}`}>
      <div className="flex items-center gap-2 mb-2">
        <Link to="/dashboard">
          <Button variant="ghost" size="sm" className="gap-1.5 h-8 text-xs">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>{t('common.back')}</span>
          </Button>
        </Link>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs font-semibold">
            {feature.area}
          </Badge>
          <Badge variant="secondary" className="text-xs bg-indigo-100 text-indigo-900 border-indigo-200">
            <Milestone className="h-3 w-3 mr-1" />
            {phaseLabel}
          </Badge>
          <Badge variant="outline" className="text-xs text-muted-foreground">
            Status: Planned
          </Badge>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          {feature.name}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          {feature.description}
        </p>
      </div>

      <Card className="border-dashed bg-muted/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-primary font-semibold text-sm">
            <Clock className="h-4 w-4" />
            <span>Feature Plan Ref: {feature.source}</span>
          </div>
          <CardDescription className="text-xs">
            Roadmap Item ID: <span className="font-mono text-foreground">{feature.id}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <p className="text-xs text-muted-foreground">
            This module is part of the DocMatrix {phaseLabel} specification. In this stage,
            all roadmap items are cataloged in the single source of truth registry and will be
            implemented according to the release schedule.
          </p>

          <Link to="/dashboard">
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <Home className="h-3.5 w-3.5" />
              <span>{t('errors.backToDashboard')}</span>
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

export default ComingSoonPage
