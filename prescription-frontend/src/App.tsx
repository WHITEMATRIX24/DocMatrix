// src/App.tsx - Updated DocNest Design with PrescriptionView Route
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginForm from './components/Auth/LoginForm';
import Dashboard from './components/Layout/Dashboard';
import PatientForm from './components/Patient/PatientForm';
import PatientManagement from './components/Patient/PatientManagement';
import EnhancedPrescriptionForm from './components/Prescription/PrescriptionForm';
import PrescriptionView from './components/Prescription/PrescriptionView'; // 🚨 ADDED THIS IMPORT
import MedicineManagement from './components/Medicine/MedicineManagement';
import AddMedicine from './components/Medicine/AddMedicine';
import EnhancedPrescriptionList from './components/Prescription/PrescriptionList';
import VitalsTracker from './components/VitalsTracker/VitalsTracker';
import ReportAnalyticsPage from './components/ReportAnalytics/ReportAnalyticsPage';
import SettingsPage from './components/Settings/SettingsPage';
import AppointmentsPage from './components/Appointment/AppointmentPage';
// Enhanced UserMenu component with better design
const UserMenu: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = React.useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  React.useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  if (!user) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '10px',
        padding: '8px 16px',
        background: darkMode ? '#374151' : '#f3f4f6',
        borderRadius: '12px',
        border: darkMode ? '1px solid #4b5563' : '1px solid #e5e7eb'
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: '600',
          fontSize: '14px'
        }}>
          {user.username?.charAt(0).toUpperCase() || 'U'}
        </div>
        <span style={{ 
          color: darkMode ? '#f9fafb' : '#374151', 
          fontWeight: '500',
          fontSize: '14px'
        }}>
          Dr. {user.username}
        </span>
      </div>
      
      <button
        onClick={handleSignOut}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 20px',
          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '12px',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '14px',
          transition: 'all 0.3s ease',
          boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(239, 68, 68, 0.3)';
        }}
        title="Sign out of DocNest"
      >
        <span>🚪</span>
        Sign Out
      </button>
    </div>
  );
};

// Layout wrapper component with enhanced header
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [darkMode, setDarkMode] = React.useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  React.useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: darkMode ? '#111827' : '#f8f9fa',
      transition: 'background-color 0.3s ease'
    }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 2rem',
          backgroundColor: darkMode ? '#1f2937' : '#fff',
          borderBottom: darkMode ? '1px solid #374151' : '1px solid #e5e7eb',
          boxShadow: darkMode 
            ? '0 1px 3px rgba(0, 0, 0, 0.3)' 
            : '0 1px 3px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px'
          }}>
            🏥
          </div>
          <div>
            <h1 style={{ 
              margin: 0, 
              fontWeight: 700, 
              fontSize: '1.8rem', 
              color: darkMode ? '#f9fafb' : '#1f2937',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              DocMatrix
            </h1>
            <p style={{ 
              margin: 0, 
              fontSize: '0.9rem', 
              color: darkMode ? '#9ca3af' : '#6b7280',
              fontWeight: '500'
            }}>
              Digital Healthcare Management
            </p>
          </div>
        </div>
        <UserMenu />
      </header>
      <main style={{ padding: '2rem' }}>{children}</main>
    </div>
  );
};

// Protected route wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontSize: '18px',
          textAlign: 'center',
        }}
        role="alert"
        aria-busy="true"
      >
        <div>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🏥</div>
          <div>Loading DocMatrix...</div>
          <div style={{ fontSize: '14px', opacity: 0.8, marginTop: '10px' }}>
            Digital Healthcare Management System
          </div>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <AppLayout>{children}</AppLayout> : <Navigate to="/login" replace />;
};

// Public route wrapper that redirects logged in users
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontSize: '18px',
          textAlign: 'center',
        }}
        role="alert"
        aria-busy="true"
      >
        <div>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🏥</div>
          <div>Loading DocMatrix...</div>
          <div style={{ fontSize: '14px', opacity: 0.8, marginTop: '10px' }}>
            Digital Healthcare Management System
          </div>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginForm />
                </PublicRoute>
              }
            />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* Patient Routes */}
            <Route
              path="/patient/create"
              element={
                <ProtectedRoute>
                  <PatientForm />
                </ProtectedRoute>
              }
            />

            <Route
              path="/patient/manage"
              element={
                <ProtectedRoute>
                  <PatientManagement />
                </ProtectedRoute>
              }
            />

            <Route
              path="/patients"
              element={
                <ProtectedRoute>
                  <PatientManagement />
                </ProtectedRoute>
              }
            />

            {/* Prescription Routes */}
            <Route
              path="/prescription/create"
              element={
                <ProtectedRoute>
                  <EnhancedPrescriptionForm />
                </ProtectedRoute>
              }
            />
             <Route
              path="/prescriptions"
              element={
                <ProtectedRoute>
                  <EnhancedPrescriptionList />
                </ProtectedRoute>
              }
            />

            <Route
              path="/prescription/edit/:prescriptionId"
              element={
                <ProtectedRoute>
                  <EnhancedPrescriptionForm />
                </ProtectedRoute>
              }
            />

            {/* 🚨 ADDED THIS MISSING ROUTE */}
            <Route
              path="/prescription/view/:prescriptionId"
              element={
                <ProtectedRoute>
                  <PrescriptionView />
                </ProtectedRoute>
              }
            />

            {/* Medicine Routes */}
            <Route
              path="/medicine/add"
              element={
                <ProtectedRoute>
                  <AddMedicine />
                </ProtectedRoute>
              }
            />

            <Route
              path="/medicine/manage"
              element={
                <ProtectedRoute>
                  <MedicineManagement />
                </ProtectedRoute>
              }
            />

            <Route
              path="/medicines"
              element={
                <ProtectedRoute>
                  <MedicineManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/vitalstracker"
              element={
                <ProtectedRoute>
                 <VitalsTracker/>
                </ProtectedRoute>
              }
            />

             <Route
              path="/reports-analytics"
              element={
                <ProtectedRoute>
               <ReportAnalyticsPage/>
                </ProtectedRoute>
              }
            />
            
             <Route
              path="/settings"
              element={
                <ProtectedRoute>
              <SettingsPage/>
                </ProtectedRoute>
              }
            />

             <Route
              path="/appointments"
              element={
                <ProtectedRoute>
             <AppointmentsPage/>
                </ProtectedRoute>
              }
            />



            {/* Default redirects */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>

          {/* Minimal Toast Container */}
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={true}
            newestOnTop={true}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss={false}
            draggable
            pauseOnHover
            theme="colored"
            toastStyle={{
              borderRadius: '12px',
              fontFamily: 'Inter, Arial, sans-serif'
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;