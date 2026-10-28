import React from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getFeatureById } from '@/features/registry'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles, Compass, AlertCircle } from 'lucide-react'

interface FeaturePlaceholderProps {
  id: string
}

export const FeaturePlaceholder: React.FC<FeaturePlaceholderProps> = ({ id }) => {
  const { t } = useTranslation()
  const params = useParams<Record<string, string | undefined>>()
  const feature = getFeatureById(id)

  if (!feature) {
    return (
      <div className="p-6">
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              <span>Feature Not Found</span>
            </CardTitle>
            <CardDescription>
              No registry entry found for feature identifier: {id}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const paramEntries = Object.entries(params).filter(([_, v]) => v !== undefined)

  return (
    <div className="space-y-6 max-w-4xl" data-testid={`feature-page-${id}`}>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="text-xs font-semibold">
            {feature.area}
          </Badge>
          <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-900 border-amber-200">
            {t('common.plannedForLaunch')}
          </Badge>
          <Badge variant="outline" className="text-xs text-muted-foreground">
            {t('common.notBuiltYet')}
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
            <Compass className="h-4 w-4" />
            <span>{t('placeholder.sourceRef')}: {feature.source}</span>
          </div>
          <CardDescription className="text-xs">
            Registry ID: <span className="font-mono text-foreground">{feature.id}</span> • Route: <span className="font-mono text-foreground">{feature.route}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          {paramEntries.length > 0 && (
            <div className="p-3 bg-background border rounded-lg space-y-1.5" data-testid="route-parameters">
              <p className="text-xs font-semibold text-muted-foreground">
                {t('placeholder.routeParams')}:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {paramEntries.map(([k, v]) => (
                  <div key={k} className="font-mono bg-muted px-2 py-1 rounded">
                    <span className="text-muted-foreground">{k}:</span> {v}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-4 bg-background rounded-lg border text-xs text-muted-foreground flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground mb-0.5">Demo Prototype Specification</p>
              <p>
                This clinical workflow module is planned for Launch. The services interface is isolated under
                <span className="font-mono"> src/services/</span> for seamless backend integration in subsequent phases.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default FeaturePlaceholder
