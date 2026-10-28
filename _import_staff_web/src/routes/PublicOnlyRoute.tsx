import React from 'react'
import { Navigate, Outlet, useSearchParams } from 'react-router-dom'
import { useCurrentUser } from '@/hooks/useAuth'
import { getSafeRedirect } from '@/pages/auth/LoginPage'
import { Skeleton } from '@/components/ui/skeleton'

export const PublicOnlyRoute: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const { data: user, isLoading } = useCurrentUser()
  const [searchParams] = useSearchParams()
  const nextTarget = getSafeRedirect(searchParams.get('next'))

  if (isLoading) {
    return (
      <div className="p-8 max-w-md mx-auto space-y-4" data-testid="route-loading">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (user) {
    return <Navigate to={nextTarget} replace />
  }

  return children ? <>{children}</> : <Outlet />
}

export default PublicOnlyRoute
