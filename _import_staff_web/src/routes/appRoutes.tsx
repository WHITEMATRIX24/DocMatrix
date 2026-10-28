import React, { Suspense } from 'react'
import { Route } from 'react-router-dom'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { FEATURE_REGISTRY } from '@/features/registry'
import { LAUNCH_PAGE_MAP } from '@/features/pageMap'

const lazyComponentMap: Record<string, React.LazyExoticComponent<React.ComponentType>> = {}

for (const p of LAUNCH_PAGE_MAP) {
  lazyComponentMap[p.id] = React.lazy(p.importFn)
}

const ComingSoonPage = React.lazy(() => import('@/pages/roadmap/ComingSoonPage'))

const PageFallback = () => (
  <div className="space-y-4 max-w-4xl p-2 animate-pulse">
    <div className="h-6 w-32 bg-muted rounded" />
    <div className="h-9 w-64 bg-muted rounded" />
    <div className="h-24 w-full bg-muted rounded" />
    <div className="h-64 w-full bg-muted rounded" />
  </div>
)

export function renderFeatureRoutes() {
  const launchFeatures = FEATURE_REGISTRY.filter((f) => f.phase === 'launch')

  return (
    <>
      {launchFeatures.map((feature) => {
        const Component = lazyComponentMap[feature.id]
        if (!Component) return null

        return (
          <Route
            key={feature.id}
            path={feature.route}
            element={
              <ProtectedRoute allowedRoles={feature.roles}>
                <Suspense fallback={<PageFallback />}>
                  <Component />
                </Suspense>
              </ProtectedRoute>
            }
          />
        )
      })}
      <Route
        path="/coming-soon/:id"
        element={
          <ProtectedRoute>
            <Suspense fallback={<PageFallback />}>
              <ComingSoonPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
    </>
  )
}
