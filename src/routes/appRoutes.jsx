import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom'
import { FEATURE_REGISTRY } from '@/features/registry'
import { LAUNCH_PAGE_MAP } from '@/features/pageMap'
import AreaPage from '@/pages/areas/AreaPage'
import AppointmentsWorkspace from '@/pages/appointments/AppointmentsWorkspace'
import NotBuiltYetPage from '@/pages/common/NotBuiltYetPage'
import NotFoundPage from '@/pages/error/NotFoundPage'
import ForbiddenPage from '@/pages/error/ForbiddenPage'
import TermsPage from '@/pages/legal/TermsPage'
import PrivacyPage from '@/pages/legal/PrivacyPage'
import ComingSoonPage from '@/pages/roadmap/ComingSoonPage'
import StaffPortal from '@/StaffPortal'
import ForgotPassword from '@/pages/ForgotPassword'

// Lazy-load all launch feature components
const lazyComponents = {}
for (const page of LAUNCH_PAGE_MAP) {
  lazyComponents[page.id] = lazy(page.importFn)
}

const PageFallback = () => (
  <div style={{ maxWidth: '800px', margin: '40px auto', padding: '24px' }} role="status">
    <div style={{ height: '24px', width: '120px', background: '#e9e9e5', borderRadius: '4px', marginBottom: '16px' }} />
    <div style={{ height: '36px', width: '280px', background: '#e9e9e5', borderRadius: '6px', marginBottom: '24px' }} />
    <div style={{ height: '140px', width: '100%', background: '#f4f6f5', borderRadius: '12px' }} />
  </div>
)

// Protected Route Guard (Problem P2 & Decision D4)
function ProtectedRoute({ currentUser, allowedRoles, children }) {
  const location = useLocation()

  if (!currentUser) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }

  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/forbidden" replace />
  }

  return children
}

export function AppRoutes({
  currentUser,
  onLoginSuccess,
  onLogout,
  renderLandingPage
}) {
  return (
    <Routes>
      {/* 1. Public Landing Page */}
      <Route path="/" element={renderLandingPage()} />

      {/* 2. Public Authentication Views (Logged-in users redirect to /dashboard) */}
      <Route
        path="/login"
        element={currentUser ? <Navigate to="/dashboard" replace /> : renderLandingPage('login')}
      />
      <Route
        path="/signup"
        element={currentUser ? <Navigate to="/dashboard" replace /> : renderLandingPage('signup')}
      />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/solutions/:id" element={renderLandingPage('solution')} />

      {/* 3. Public Legal & Error Pages */}
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/forbidden" element={<ForbiddenPage />} />

      {/* 4. Protected Clinic Layout & Submodules (Persistent Shell) */}
      <Route
        element={
          <ProtectedRoute currentUser={currentUser}>
            <StaffPortal user={currentUser} onLogout={onLogout}>
              <Outlet />
            </StaffPortal>
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={null} />

        {/* 5. Protected Area Hub Pages (Decision D4: Accounts and Settings role-limited) */}
        <Route
          path="/appointments"
          element={<Navigate to="/appointments/new" replace />}
        />
        <Route path="/appointments/queue" element={<Navigate to="/appointments/new" replace />} />
        <Route path="/appointments/calendar" element={<Navigate to="/appointments/new" replace />} />
        <Route
          path="/patients"
          element={<AreaPage areaKey="patients" />}
        />
        <Route
          path="/clinical"
          element={<AreaPage areaKey="clinical" />}
        />
        <Route
          path="/billing"
          element={<AreaPage areaKey="billing" />}
        />
        <Route
          path="/accounts"
          element={
            <ProtectedRoute currentUser={currentUser} allowedRoles={['ORGANIZATION_ADMIN', 'ACCOUNTANT']}>
              <AreaPage areaKey="accounts" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/inventory"
          element={<AreaPage areaKey="inventory" />}
        />
        <Route
          path="/whatsapp"
          element={<AreaPage areaKey="whatsapp" />}
        />
        <Route
          path="/website"
          element={<AreaPage areaKey="website" />}
        />
        <Route
          path="/reports"
          element={<AreaPage areaKey="reports" />}
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute currentUser={currentUser} allowedRoles={['ORGANIZATION_ADMIN', 'BRANCH_ADMIN']}>
              <AreaPage areaKey="settings" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/roadmap"
          element={<AreaPage areaKey="roadmap" />}
        />

        {/* 6. Protected 55 Launch Feature Sub-Pages */}
        {FEATURE_REGISTRY.filter((f) => f.phase === 'launch').map((feature) => {
          const Component = lazyComponents[feature.id]
          if (!Component) return null

          const featurePage = (
            <Suspense fallback={<PageFallback />}>
              <Component />
            </Suspense>
          )

          return (
            <Route
              key={feature.id}
              path={feature.route}
              element={
                <ProtectedRoute currentUser={currentUser} allowedRoles={feature.roles}>
                  {feature.area.toLowerCase() === 'appointments' ? (
                    <AppointmentsWorkspace activeFeatureId={feature.id}>{featurePage}</AppointmentsWorkspace>
                  ) : featurePage}
                </ProtectedRoute>
              }
            />
          )
        })}

        {/* 7. Protected Coming Soon for Roadmap Items */}
        <Route
          path="/coming-soon/:id"
          element={
            <ProtectedRoute currentUser={currentUser}>
              <Suspense fallback={<PageFallback />}>
                <ComingSoonPage />
              </Suspense>
            </ProtectedRoute>
          }
        />
      </Route>

      {/* 8. Shared Not Built Yet for unmatched marketing buttons */}
      <Route path="/not-built-yet" element={<NotBuiltYetPage />} />

      {/* 9. 404 Catch-All */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

export default AppRoutes
