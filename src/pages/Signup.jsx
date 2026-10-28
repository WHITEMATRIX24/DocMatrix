import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { isAuthenticated, loginWithGoogle } from '@/services/authService'
import PasswordInput from '@/components/PasswordInput'
import GoogleButton from '@/components/GoogleButton'
import AuthBanner from '@/components/AuthBanner'
import Spinner from '@/components/Spinner'
import AuthNavbar from '@/components/AuthNavbar'

export default function Signup({ onLoginSuccess }) {
  const navigate = useNavigate()
  const location = useLocation()

  // Form input states
  const [form, setForm] = useState({
    fullName: '',
    clinicName: '',
    country: '',
    state: '',
    city: '',
    location: '',
    mobile: '',
    email: '',
    practiceType: 'Solo',
    preferredMode: 'Online',
    password: ''
  })
  const [agreeTerms, setAgreeTerms] = useState(false)

  // Validation error states
  const [errors, setErrors] = useState({})
  const [authError, setAuthError] = useState('')

  // Loading states
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const nameInputRef = useRef(null)

  const updateField = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }))
    if (errors[field]) setErrors((previous) => ({ ...previous, [field]: '' }))
    if (authError) setAuthError('')
  }

  const validateForm = () => {
    const newErrors = {}
    if (!form.fullName.trim()) {
      newErrors.fullName = 'Please enter your full name'
    }
    if (!form.clinicName.trim()) {
      newErrors.clinicName = 'Please enter your clinic name'
    }
    for (const field of ['country', 'state', 'city', 'mobile']) {
      if (!form[field].trim()) newErrors[field] = `Please enter your ${field === 'mobile' ? 'mobile number' : field}`
    }
    if (form.mobile.trim() && !/^\+?[\d\s().-]{7,20}$/.test(form.mobile.trim())) {
      newErrors.mobile = 'Please enter a valid mobile number'
    }

    const cleanEmail = form.email.trim()
    if (!cleanEmail) {
      newErrors.email = 'Please enter your email address'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!form.password) {
      newErrors.password = 'Please enter a password'
    } else if (form.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    if (!agreeTerms) {
      newErrors.agreeTerms = 'You must agree to the Terms of Service and Privacy Policy'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const requiredFields = new Set([
    'fullName', 'clinicName', 'country', 'state', 'city', 'mobile', 'email', 'practiceType'
  ])

  const renderTextField = (field, label, type = 'text', autoComplete) => (
    <div className="input-field-group" key={field}>
      <label htmlFor={`signup-${field}`} className="signup-field-label">
        {label}{requiredFields.has(field) && <span aria-hidden="true">*</span>}
      </label>
      <input
        ref={field === 'fullName' ? nameInputRef : undefined}
        id={`signup-${field}`}
        name={field}
        type={type}
        value={form[field]}
        onChange={(event) => updateField(field, event.target.value)}
        autoComplete={autoComplete}
        className={`signup-field-control ${errors[field] ? 'is-invalid' : ''}`}
        aria-invalid={Boolean(errors[field])}
        disabled={loading || googleLoading}
        required={requiredFields.has(field)}
      />
      {errors[field] && <p className="field-error-msg" role="alert">{errors[field]}</p>}
    </div>
  )

  const renderSelectField = (field, label, options) => (
    <div className="input-field-group" key={field}>
      <label htmlFor={`signup-${field}`} className="signup-field-label">
        {label}{requiredFields.has(field) && <span aria-hidden="true">*</span>}
      </label>
      <select
        id={`signup-${field}`}
        name={field}
        value={form[field]}
        onChange={(event) => updateField(field, event.target.value)}
        className={`signup-field-control signup-select ${errors[field] ? 'is-invalid' : ''}`}
        aria-invalid={Boolean(errors[field])}
        disabled={loading || googleLoading}
        required={requiredFields.has(field)}
      >
        <option value="" disabled>Select {label.toLowerCase()}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      {errors[field] && <p className="field-error-msg" role="alert">{errors[field]}</p>}
    </div>
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    setAuthError('')

    if (!validateForm()) return

    setLoading(true)
    try {
      // Simulate registration & auto-login
      const newUser = {
        id: 'usr-' + Date.now(),
        name: form.fullName.trim(),
        role: 'ORGANIZATION_ADMIN',
        clinicName: form.clinicName.trim(),
        email: form.email.trim(),
        country: form.country,
        state: form.state.trim(),
        city: form.city.trim(),
        location: form.location.trim(),
        mobile: form.mobile.trim(),
        practiceType: form.practiceType,
        preferredMode: form.preferredMode,
        clinicId: 'clinic-new-001'
      }

      sessionStorage.setItem('docmatrix-demo-session', newUser.id)
      sessionStorage.setItem('docmatrix-demo-current-user', JSON.stringify(newUser))

      if (onLoginSuccess) {
        onLoginSuccess(newUser)
      }
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setAuthError(err.message || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setAuthError('')
    setGoogleLoading(true)
    try {
      const { user } = await loginWithGoogle()
      if (onLoginSuccess) {
        onLoginSuccess(user)
      }
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setAuthError(err.message || 'Google sign up failed. Please try again.')
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="login-page signup-page">
      {/* Top Navigation Bar */}
      <AuthNavbar currentView="signup" />

      {/* 3:2 Aspect Ratio Preserving Stage */}
      <div className="login-stage signup-stage">
        {/* Full-page background: user's reference illustration */}
        <img
          src="/Modern Dental Professional with Translucent Jaw Illustration (1).png"
          alt=""
          className="login-bg-image"
          aria-hidden="true"
        />

        {/* Right-side form overlay shifted further right */}
        <div className="login-form-overlay signup-form-overlay">
          <div className="login-form-card signup-form-card">
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
            <h1 className="login-main-heading">Create clinic account</h1>
            <p className="login-sub-heading">Sign up to access your clinic portal</p>
          </div>

          {/* Error Banner */}
          {authError && <AuthBanner type="error" message={authError} />}

          {/* Signup Form */}
          <form onSubmit={handleSubmit} noValidate className="login-auth-form">
            <div className="signup-details-grid">
              {renderTextField('fullName', 'Your name', 'text', 'name')}
              {renderTextField('clinicName', 'Hospital / Clinic name', 'text', 'organization')}
              {renderSelectField('country', 'Country', ['India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Other'])}
              {renderTextField('state', 'State', 'text', 'address-level1')}
              {renderTextField('city', 'City', 'text', 'address-level2')}
              {renderTextField('location', 'Location', 'text', 'street-address')}
              {renderTextField('mobile', 'Mobile', 'tel', 'tel')}
              {renderTextField('email', 'Email', 'email', 'email')}
              {renderSelectField('practiceType', 'Type of practice', ['Solo', 'Group practice', 'Hospital', 'Dental chain', 'Other'])}

              <fieldset className="signup-mode-field">
                <legend className="signup-field-label">Preferred mode<span aria-hidden="true">*</span></legend>
                <div className="signup-mode-options">
                  {['Online', 'Offline'].map((mode) => (
                    <label key={mode} className="signup-mode-option">
                      <input
                        type="radio"
                        name="preferredMode"
                        value={mode}
                        checked={form.preferredMode === mode}
                        onChange={() => updateField('preferredMode', mode)}
                        disabled={loading || googleLoading}
                      />
                      <span>{mode}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
            {/* Password */}
            <div className="input-field-group">
              <label htmlFor="signup-password" className="input-field-label">
                Password
              </label>
              <PasswordInput
                id="signup-password"
                value={form.password}
                onChange={(e) => updateField('password', e.target.value)}
                placeholder="Password"
                hasError={Boolean(errors.password)}
                autoComplete="new-password"
                disabled={loading || googleLoading}
                required
              />
              {errors.password && (
                <p className="field-error-msg" role="alert">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Agree Terms Checkbox */}
            <div className="form-meta-row" style={{ marginTop: '4px', marginBottom: '16px' }}>
              <label className="remember-checkbox-label" style={{ alignItems: 'flex-start' }}>
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => {
                    setAgreeTerms(e.target.checked)
                    if (errors.agreeTerms) setErrors((prev) => ({ ...prev, agreeTerms: '' }))
                  }}
                  disabled={loading || googleLoading}
                  className="remember-checkbox"
                  style={{ marginTop: '2px' }}
                />
                <span style={{ fontSize: '12.5px', lineHeight: 1.4 }}>
                  I agree to the Terms of Service and Privacy Policy
                </span>
              </label>
            </div>
            {errors.agreeTerms && (
              <p className="field-error-msg" role="alert" style={{ marginTop: '-10px', marginBottom: '14px' }}>
                {errors.agreeTerms}
              </p>
            )}

            {/* Primary Sign Up Button */}
            <button
              type="submit"
              className="btn-primary-teal"
              disabled={loading || googleLoading}
            >
              {loading ? (
                <>
                  <Spinner size={18} color="#ffffff" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Sign up</span>
                  <ArrowRight size={17} className="btn-arrow-icon" />
                </>
              )}
            </button>

            {/* "or" Divider */}
            <div className="auth-or-divider">
              <span>or</span>
            </div>

            {/* Google Signup Button */}
            <GoogleButton
              onClick={handleGoogleSignup}
              loading={googleLoading}
              disabled={loading}
            />

            {/* Footer Prompt */}
            <p className="form-footer-prompt">
              Already have an account?{' '}
              <Link to="/login" className="footer-signup-link">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  </div>
  )
}
