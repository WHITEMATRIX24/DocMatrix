// Hot reload trigger
import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Mail, ArrowRight } from 'lucide-react'
import {
  login,
  loginWithGoogle,
  isAuthenticated,
  getRememberedEmail
} from '@/services/authService'
import PasswordInput from '@/components/PasswordInput'
import GoogleButton from '@/components/GoogleButton'
import AuthBanner from '@/components/AuthBanner'
import Spinner from '@/components/Spinner'
import AuthNavbar from '@/components/AuthNavbar'

export default function Login({ onLoginSuccess }) {
  const navigate = useNavigate()
  const location = useLocation()

  // Form input states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)

  // Validation error states
  const [errors, setErrors] = useState({})
  const [authError, setAuthError] = useState('')

  // Loading states
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Refs for accessibility and auto-focusing on invalid fields
  const emailInputRef = useRef(null)
  const passwordInputRef = useRef(null)
  const backgroundVideoRef = useRef(null)

  useEffect(() => {
    const video = backgroundVideoRef.current
    if (!video) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncPlayback = () => {
      if (document.hidden || reducedMotion.matches) {
        video.pause()
      } else {
        video.play().catch(() => {})
      }
    }

    syncPlayback()
    reducedMotion.addEventListener('change', syncPlayback)
    document.addEventListener('visibilitychange', syncPlayback)

    return () => {
      reducedMotion.removeEventListener('change', syncPlayback)
      document.removeEventListener('visibilitychange', syncPlayback)
    }
  }, [])

  // Redirect if already logged in (Requirement 8)
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])

  // Pre-fill remembered email (Requirement 6)
  useEffect(() => {
    const saved = getRememberedEmail()
    if (saved) {
      setEmail(saved)
      setRememberMe(true)
    }
  }, [])

  // Validation helper
  const validateForm = () => {
    const newErrors = {}
    const cleanEmail = email.trim()

    // 1. Email validation: required and valid email format
    if (!cleanEmail) {
      newErrors.email = 'Please enter your email address'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      newErrors.email = 'Please enter a valid email address'
    }

    // 2. Password validation: required and minimum 8 characters
    if (!password) {
      newErrors.password = 'Please enter your password'
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    setErrors(newErrors)

    // Requirement 12: First invalid field gets focus after failed submit
    if (newErrors.email && emailInputRef.current) {
      emailInputRef.current.focus()
    } else if (newErrors.password && passwordInputRef.current) {
      passwordInputRef.current.focus()
    }

    return Object.keys(newErrors).length === 0
  }

  // Handle successful login redirect
  const handleAuthSuccess = (user) => {
    if (onLoginSuccess) {
      onLoginSuccess(user)
    }
    const params = new URLSearchParams(location.search)
    const next = params.get('next') || '/dashboard'
    navigate(next, { replace: true })
  }

  // Form submit (Sign in)
  const handleSubmit = async (e) => {
    e.preventDefault()
    setAuthError('')

    if (!validateForm()) return

    setLoading(true)
    try {
      // Requirement 4 & 5: Mock auth with demo account
      const { user } = await login(email, password, rememberMe)
      handleAuthSuccess(user)
    } catch (err) {
      setAuthError(err.message || 'Incorrect email or password')
    } finally {
      setLoading(false)
    }
  }

  // Google OAuth simulation (Requirement 10)
  const handleGoogleLogin = async () => {
    setAuthError('')
    setGoogleLoading(true)
    try {
      const { user } = await loginWithGoogle()
      handleAuthSuccess(user)
    } catch (err) {
      setAuthError(err.message || 'Google sign in failed. Please try again.')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* Top Navigation Bar */}
      <AuthNavbar currentView="login" />

      {/* 3:2 Aspect Ratio Preserving Stage */}
      <div className="login-stage">
        {/* Full-page background: user's reference illustration */}
        <video
          ref={backgroundVideoRef}
          className="login-bg-image login-bg-video"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster="/Modern Teal Dental Clinic Interior.png"
          onTimeUpdate={(event) => {
            const time = event.currentTarget.currentTime
            const playbackRate = time >= 3 && time < 6 ? 0.5 : 1
            if (event.currentTarget.playbackRate !== playbackRate) {
              event.currentTarget.playbackRate = playbackRate
            }
          }}
          aria-hidden="true"
          tabIndex={-1}
        >
          <source src="/login-background-stabilized.mp4" type="video/mp4" />
        </video>

      {/* Right-side form overlay */}
      <div className="login-form-overlay">
        <div className="login-form-card">
          {/* Top Wordmark & Tagline */}
          <div className="brand-header">
            <Link to="/" className="brand-logo-link" aria-label="DocMatrix Home">
              <span className="brand-doc">Doc</span>
              <span className="brand-matrix">Matrix</span>
            </Link>
            <div className="brand-subtext">SMARTER DENTAL CARE</div>
          </div>

          {/* Heading and Subtitle */}
          <div className="login-heading-group">
            <h1 className="login-main-heading">Welcome back</h1>
            <p className="login-sub-heading">Sign in to access your clinic portal</p>
          </div>

          {/* Error Banner (Requirement 5) */}
          {authError && <AuthBanner type="error" message={authError} />}

          {/* Login Form */}
          <form onSubmit={handleSubmit} noValidate className="login-auth-form">
            {/* Email Address Field */}
            <div className="input-field-group">
              <label htmlFor="login-email" className="input-field-label">
                Email address
              </label>
              <div className={`auth-input-container ${errors.email ? 'is-invalid' : ''}`}>
                <span className="auth-field-icon" aria-hidden="true">
                  <Mail size={18} />
                </span>
                <input
                  ref={emailInputRef}
                  id="login-email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (errors.email) setErrors((prev) => ({ ...prev, email: '' }))
                    if (authError) setAuthError('')
                  }}
                  placeholder="Email address"
                  className="auth-text-input"
                  autoComplete="email"
                  disabled={loading || googleLoading}
                  required
                />
              </div>
              {errors.email && (
                <p className="field-error-msg" role="alert" aria-live="polite">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field with Eye Toggle */}
            <div className="input-field-group">
              <label htmlFor="login-password" className="input-field-label">
                Password
              </label>
              <PasswordInput
                ref={passwordInputRef}
                id="login-password"
                name="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (errors.password) setErrors((prev) => ({ ...prev, password: '' }))
                  if (authError) setAuthError('')
                }}
                placeholder="Password"
                hasError={Boolean(errors.password)}
                autoComplete="current-password"
                disabled={loading || googleLoading}
                required
              />
              {errors.password && (
                <p className="field-error-msg" role="alert" aria-live="polite">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Remember Me & Forgot Password Row */}
            <div className="form-meta-row">
              <label className="remember-checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={loading || googleLoading}
                  className="remember-checkbox"
                />
                <span>Remember me</span>
              </label>

              <Link to="/forgot-password" className="forgot-password-link">
                Forgot password?
              </Link>
            </div>

            {/* Primary Sign In Button */}
            <button
              type="submit"
              className="btn-primary-teal"
              disabled={loading || googleLoading}
            >
              {loading ? (
                <>
                  <Spinner size={18} color="#ffffff" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight size={17} className="btn-arrow-icon" />
                </>
              )}
            </button>

            {/* "or" Divider */}
            <div className="auth-or-divider">
              <span>or</span>
            </div>

            {/* Google Authentication Button */}
            <GoogleButton
              onClick={handleGoogleLogin}
              loading={googleLoading}
              disabled={loading}
            />

            {/* Footer Prompt */}
            <p className="form-footer-prompt">
              Don't have an account?{' '}
              <Link to="/signup" className="footer-signup-link">
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  </div>
  )
}
