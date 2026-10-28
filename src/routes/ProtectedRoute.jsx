import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { isAuthenticated } from '@/services/authService'

/**
 * ProtectedRoute component
 * Redirects unauthenticated users to /login preserving the intended target URL.
 */
export default function ProtectedRoute({ children, allowedRoles, currentUser }) {
  const location = useLocation()
  const isAuthed = isAuthenticated() || Boolean(currentUser)

  if (!isAuthed) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }

  // Optional role-based restrictions
  if (allowedRoles && currentUser && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/forbidden" replace />
  }

  return children
}
