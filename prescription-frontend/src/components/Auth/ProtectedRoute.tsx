// src/components/Auth/ProtectedRoute.tsx - Professional Security Component
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  fallbackPath?: string;
}

const LoadingScreen: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
    <div className="text-center">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin border-t-blue-600 mx-auto"></div>
        <div className="w-12 h-12 border-4 border-transparent rounded-full animate-pulse border-t-blue-400 absolute top-2 left-2"></div>
      </div>
      <h2 className="mt-6 text-xl font-semibold text-gray-800">🔐 Verifying Authentication</h2>
      <p className="mt-2 text-gray-600">Please wait while we secure your session...</p>
      <div className="mt-4 flex justify-center space-x-1">
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
        <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
      </div>
    </div>
  </div>
);

const AccessDeniedScreen: React.FC<{ requiredRole?: string; userRole?: string | null }> = ({ requiredRole, userRole }) => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
    <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8 text-center">
      <div className="mb-6">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-gray-600 mb-4">
          You don't have permission to access this page.
        </p>
        {requiredRole && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-800">
              <strong>Required Role:</strong> {requiredRole}
            </p>
            <p className="text-sm text-red-600">
              <strong>Your Role:</strong> {userRole || 'None'}
            </p>
          </div>
        )}
      </div>
      
      <div className="space-y-3">
        <button
          onClick={() => window.history.back()}
          className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors duration-200"
        >
          ← Go Back
        </button>
        <button
          onClick={() => window.location.href = '/dashboard'}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors duration-200"
        >
          🏠 Go to Dashboard
        </button>
      </div>
    </div>
  </div>
);

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole, 
  fallbackPath = '/login' 
}) => {
  const { user, isAuthenticated, loading, userRole } = useAuth();
  const location = useLocation();

  // Show loading spinner while authentication is being checked
  if (loading) {
    return <LoadingScreen />;
  }

  // Check authentication
  if (!isAuthenticated || !user) {
    console.log('🔐 ProtectedRoute: User not authenticated, redirecting to login');
    
    // Save the attempted location for redirect after login
    return <Navigate to={fallbackPath} state={{ from: location }} replace />;
  }

  // Check role-based access
  if (requiredRole && userRole !== requiredRole) {
    console.log('🚫 ProtectedRoute: Insufficient permissions', {
      required: requiredRole,
      userRole: userRole
    });
    
    return <AccessDeniedScreen requiredRole={requiredRole} userRole={userRole} />;
  }

  // All checks passed - render the protected content
  console.log('✅ ProtectedRoute: Access granted', {
    user: user.username,
    role: userRole,
    path: location.pathname
  });

  return <>{children}</>;
};

export default ProtectedRoute;