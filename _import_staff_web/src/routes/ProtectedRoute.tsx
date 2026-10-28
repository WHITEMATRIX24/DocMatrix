import React from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useCurrentUser } from '@/hooks/useAuth'
import { StaffRole } from '@/mocks/auth'
import { Skeleton } from '@/components/ui/skeleton'

interface ProtectedRouteProps {
  allowedRoles?: StaffRole[]
  children?: React.ReactNode
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  children,
}) => {
  const { data: user, isLoading } = useCurrentUser()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4" data-testid="route-loading">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!user) {
    const nextPath = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${nextPath}`} replace />
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      return <Navigate to="/forbidden" replace />
    }
  }

  return children ? <>{children}</> : <Outlet />
}

export default ProtectedRoute
