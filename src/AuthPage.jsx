import React, { useState, useEffect } from 'react'
import { Eye, EyeOff, X } from 'lucide-react'
import { DEMO_USERS, findDemoUserByEmail } from '@/mocks/auth'

import Login from '@/pages/Login'
import Signup from '@/pages/Signup'

// DocMatrix Brand Cross Mark
function MedicalCrossMark({ light = false }) {
  return (
    <span className={`medical-cross-mark ${light ? 'mark-light' : ''}`} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </span>
  )
}

export default function AuthPage({
  view = 'login',
  onNavigate,
  onBackHome,
  onLoginSuccess
}) {
  if (view === 'login') {
    return <Login onLoginSuccess={onLoginSuccess} />
  }

  if (view === 'signup') {
    return <Signup onLoginSuccess={onLoginSuccess} />
  }

  const isLogin = false

  // Form input states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  // Sign up fields
  const [signupForm, setSignupForm] = useState({
    fullName: '',
    clinicName: '',
    agreeTerms: false
  })

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotError, setForgotError] = useState('')
  const [forgotSuccess, setForgotSuccess] = useState(false)

  // Check if Google authentication is configured and functional
  const isGoogleConfigured = Boolean(
    import.meta.env.VITE_GOOGLE_AUTH_ENABLED && import.meta.env.VITE_GOOGLE_CLIENT_ID
  )

  // Load remembered email if present
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem('docmatrix_remember_email')
      if (savedEmail) {
        setEmail(savedEmail)
        setRememberMe(true)
      }
    } catch {}
  }, [])

  // Reset errors when view changes
  useEffect(() => {
    setErrors({})
    setSubmitting(false)
  }, [view])

  // Validate Login
  const validateLogin = () => {
    const errs = {}
    const cleanEmail = email.trim()
    if (!cleanEmail) {
      errs.email = 'Please enter your email address'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errs.email = 'Please enter a valid email address'
    }

    if (!password) {
      errs.password = 'Please enter your password'
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // Validate Signup
  const validateSignup = () => {
    const errs = {}
    if (!signupForm.fullName.trim()) errs.fullName = 'Please enter your full name'
    if (!signupForm.clinicName.trim()) errs.clinicName = 'Please enter your clinic name'

    const cleanEmail = email.trim()
    if (!cleanEmail) {
      errs.email = 'Please enter your email address'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errs.email = 'Please enter a valid email address'
    }

    if (!password) {
      errs.password = 'Please enter a password'
    } else if (password.length < 6) {
      errs.password = 'Password must be at least 6 characters'
    }

    if (!signupForm.agreeTerms) {
      errs.agreeTerms = 'You must agree to the Terms of Service and Privacy Policy'
    }

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  // Handle Login submission
  const handleLoginSubmit = (e) => {
    if (e) e.preventDefault()
    if (!validateLogin()) return

    setSubmitting(true)

    // Handle Remember Me
    try {
      if (rememberMe) {
        localStorage.setItem('docmatrix_remember_email', email.trim())
      } else {
        localStorage.removeItem('docmatrix_remember_email')
      }
    } catch {}

    const user = findDemoUserByEmail(email) || DEMO_USERS.ORGANIZATION_ADMIN

    // Store user ID in session storage
    try {
      sessionStorage.setItem('docmatrix-demo-session', user.id)
    } catch {}

    if (onLoginSuccess) {
      onLoginSuccess(user)
    }
  }

  // Handle Signup submission
  const handleSignupSubmit = (e) => {
    if (e) e.preventDefault()
    if (!validateSignup()) return

    setSubmitting(true)

    const user = {
      id: 'usr-101',
      name: signupForm.fullName.trim() || 'Dr. Clinic Admin',
      role: 'ORGANIZATION_ADMIN',
      clinicName: signupForm.clinicName.trim() || 'My Dental Clinic',
      email: email.trim(),
      phone: '+910000000101',
      clinicId: 'clinic-demo-001'
    }

    try {
      sessionStorage.setItem('docmatrix-demo-session', user.id)
    } catch {}

    if (onLoginSuccess) {
      onLoginSuccess(user)
    }
  }

  // Handle Forgot Password submission
  const handleForgotSubmit = (e) => {
    if (e) e.preventDefault()
    const clean = forgotEmail.trim()
    if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setForgotError('Please enter a valid email address')
      return
    }
    setForgotError('')
    setForgotSuccess(true)
  }

  return (
    <div className="auth-root">
      <div className="auth-split-wrapper">
        {/* Left Column: Teal Archway Clinic Illustration */}
        <div className="auth-visual-column">
          <img
            src="/Modern Dental Professional with Translucent Jaw Illustration (1).png"
            alt="DocMatrix Clinic Operatory"
            className="auth-hero-img"
          />
        </div>

        {/* Right Column: Clean Minimal Login / Signup Form */}
        <div className="auth-form-column">
          <div className="auth-form-content">
            {/* DocMatrix Wordmark and Tagline */}
            <div className="auth-brand">
              <a
                href="#top"
                onClick={(e) => {
                  e.preventDefault()
                  if (onBackHome) onBackHome()
                }}
                className="auth-wordmark"
                aria-label="DocMatrix Home"
              >
                <MedicalCrossMark />
                <span className="auth-brand-name">DOC MATRIX</span>
              </a>
              <p className="auth-tagline">Healthcare, Connected as One</p>
            </div>

            {/* Header */}
            <div className="auth-header">
              <h1 className="auth-title">
                {isLogin ? 'Welcome back' : 'Create clinic account'}
              </h1>
              <p className="auth-subtitle">
                {isLogin
                  ? 'Sign in to access your clinic portal'
                  : 'Sign up to access your clinic portal'}
              </p>
            </div>

            {/* Authentication Form */}
            {isLogin ? (
              <form onSubmit={handleLoginSubmit} className="auth-form" noValidate>
                {/* Email address field */}
                <div className={`auth-field ${errors.email ? 'has-error' : ''}`}>
                  <label htmlFor="login-email" className="auth-label">
                    Email address
                  </label>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="doctor@clinic.com"
                    className="auth-input"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (errors.email) setErrors((prev) => ({ ...prev, email: '' }))
                    }}
                  />
                  {errors.email && (
                    <p className="auth-error-text" role="alert">
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Password field with show/hide toggle */}
                <div className={`auth-field ${errors.password ? 'has-error' : ''}`}>
                  <label htmlFor="login-password" className="auth-label">
                    Password
                  </label>
                  <div className="auth-password-wrapper">
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="auth-input auth-password-input"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (errors.password) setErrors((prev) => ({ ...prev, password: '' }))
                      }}
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="auth-error-text" role="alert">
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Remember me & Forgot password row */}
                <div className="auth-meta-row">
                  <label className="auth-checkbox-label">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="auth-checkbox"
                    />
                    <span>Remember me</span>
                  </label>

                  <button
                    type="button"
                    className="auth-forgot-link"
                    onClick={() => {
                      setForgotEmail(email)
                      setForgotError('')
                      setForgotSuccess(false)
                      setShowForgotModal(true)
                    }}
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Teal Sign in button */}
                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={submitting}
                >
                  {submitting ? 'Signing in...' : 'Sign in'}
                </button>

                {/* "or" divider */}
                <div className="auth-divider">
                  <span>or</span>
                </div>

                {/* Continue with Google (rendered only if configured and functional) */}
                {isGoogleConfigured && (
                  <button
                    type="button"
                    className="auth-google-btn"
                  >
                    Continue with Google
                  </button>
                )}

                {/* "Don't have an account? Sign up" footer */}
                <p className="auth-switch-footer">
                  Don't have an account?{' '}
                  <a
                    href="/signup"
                    onClick={(e) => {
                      e.preventDefault()
                      if (onNavigate) onNavigate('signup')
                    }}
                    className="auth-switch-link"
                  >
                    Sign up
                  </a>
                </p>
              </form>
            ) : (
              <form onSubmit={handleSignupSubmit} className="auth-form" noValidate>
                {/* Full Name */}
                <div className={`auth-field ${errors.fullName ? 'has-error' : ''}`}>
                  <label htmlFor="signup-name" className="auth-label">
                    Full name
                  </label>
                  <input
                    id="signup-name"
                    name="fullName"
                    type="text"
                    placeholder="Dr. Arun Kumar"
                    className="auth-input"
                    value={signupForm.fullName}
                    onChange={(e) => {
                      setSignupForm({ ...signupForm, fullName: e.target.value })
                      if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: '' }))
                    }}
                  />
                  {errors.fullName && (
                    <p className="auth-error-text" role="alert">
                      {errors.fullName}
                    </p>
                  )}
                </div>

                {/* Clinic Name */}
                <div className={`auth-field ${errors.clinicName ? 'has-error' : ''}`}>
                  <label htmlFor="signup-clinic" className="auth-label">
                    Clinic name
                  </label>
                  <input
                    id="signup-clinic"
                    name="clinicName"
                    type="text"
                    placeholder="Dental Speciality Clinic"
                    className="auth-input"
                    value={signupForm.clinicName}
                    onChange={(e) => {
                      setSignupForm({ ...signupForm, clinicName: e.target.value })
                      if (errors.clinicName) setErrors((prev) => ({ ...prev, clinicName: '' }))
                    }}
                  />
                  {errors.clinicName && (
                    <p className="auth-error-text" role="alert">
                      {errors.clinicName}
                    </p>
                  )}
                </div>

                {/* Email address field */}
                <div className={`auth-field ${errors.email ? 'has-error' : ''}`}>
                  <label htmlFor="signup-email" className="auth-label">
                    Email address
                  </label>
                  <input
                    id="signup-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="doctor@clinic.com"
                    className="auth-input"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (errors.email) setErrors((prev) => ({ ...prev, email: '' }))
                    }}
                  />
                  {errors.email && (
                    <p className="auth-error-text" role="alert">
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Password field with show/hide toggle */}
                <div className={`auth-field ${errors.password ? 'has-error' : ''}`}>
                  <label htmlFor="signup-password" className="auth-label">
                    Password
                  </label>
                  <div className="auth-password-wrapper">
                    <input
                      id="signup-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className="auth-input auth-password-input"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value)
                        if (errors.password) setErrors((prev) => ({ ...prev, password: '' }))
                      }}
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="auth-error-text" role="alert">
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Terms checkbox */}
                <div style={{ marginTop: '4px' }}>
                  <label className="auth-checkbox-label" style={{ alignItems: 'flex-start' }}>
                    <input
                      type="checkbox"
                      checked={signupForm.agreeTerms}
                      onChange={(e) => {
                        setSignupForm({ ...signupForm, agreeTerms: e.target.checked })
                        if (errors.agreeTerms) setErrors((prev) => ({ ...prev, agreeTerms: '' }))
                      }}
                      className="auth-checkbox"
                      style={{ marginTop: '3px' }}
                    />
                    <span style={{ fontSize: '13px', lineHeight: 1.45 }}>
                      I agree to the Terms of Service and Privacy Policy
                    </span>
                  </label>
                  {errors.agreeTerms && (
                    <p className="auth-error-text" role="alert" style={{ marginTop: '4px' }}>
                      {errors.agreeTerms}
                    </p>
                  )}
                </div>

                {/* Teal Sign up button */}
                <button
                  type="submit"
                  className="auth-submit-btn"
                  disabled={submitting}
                  style={{ marginTop: '12px' }}
                >
                  {submitting ? 'Creating account...' : 'Sign up'}
                </button>

                {/* Footer Switcher */}
                <p className="auth-switch-footer">
                  Already have an account?{' '}
                  <a
                    href="/login"
                    onClick={(e) => {
                      e.preventDefault()
                      if (onNavigate) onNavigate('login')
                    }}
                    className="auth-switch-link"
                  >
                    Sign in
                  </a>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div
          className="auth-modal-backdrop"
          onClick={() => setShowForgotModal(false)}
        >
          <div
            className="auth-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="auth-modal-header">
              <h3 className="auth-modal-title">Reset password</h3>
              <button
                type="button"
                className="auth-modal-close"
                onClick={() => setShowForgotModal(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="auth-modal-body">
              {forgotSuccess ? (
                <div className="auth-modal-success">
                  <p>
                    A password reset link has been sent to <strong>{forgotEmail}</strong> if an account exists.
                  </p>
                  <button
                    type="button"
                    className="auth-submit-btn"
                    onClick={() => {
                      setShowForgotModal(false)
                      setForgotSuccess(false)
                      setForgotEmail('')
                    }}
                    style={{ marginTop: '16px' }}
                  >
                    Back to sign in
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit}>
                  <p className="auth-modal-desc">
                    Enter your registered clinic email address to receive password recovery instructions.
                  </p>
                  <div className={`auth-field ${forgotError ? 'has-error' : ''}`}>
                    <label className="auth-label">Email address</label>
                    <input
                      type="email"
                      className="auth-input"
                      placeholder="doctor@clinic.com"
                      value={forgotEmail}
                      onChange={(e) => {
                        setForgotEmail(e.target.value)
                        setForgotError('')
                      }}
                    />
                    {forgotError && <p className="auth-error-text">{forgotError}</p>}
                  </div>
                  <div className="auth-modal-actions">
                    <button
                      type="button"
                      className="auth-modal-cancel"
                      onClick={() => setShowForgotModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="auth-submit-btn"
                      style={{ width: 'auto', padding: '0 20px' }}
                    >
                      Send reset link
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
