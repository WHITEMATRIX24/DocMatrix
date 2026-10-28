import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react'
import { requestPasswordReset } from '@/services/authService'
import AuthBanner from '@/components/AuthBanner'
import Spinner from '@/components/Spinner'
import AuthNavbar from '@/components/AuthNavbar'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const validate = () => {
    const clean = email.trim()
    if (!clean) {
      setError('Please enter your email address')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setError('Please enter a valid email address')
      return false
    }
    setError('')
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setLoading(true)
    setError('')
    try {
      const res = await requestPasswordReset(email.trim())
      setSuccessMessage(res.message)
    } catch (err) {
      setError(err.message || 'Failed to request password reset.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* Top Navigation Bar */}
      <AuthNavbar currentView="forgot" />

      {/* 3:2 Aspect Ratio Preserving Stage */}
      <div className="login-stage">
        {/* Full-page background: user's reference illustration */}
        <img
          src="/Modern Teal Dental Clinic Interior.png"
          alt=""
          className="login-bg-image"
          aria-hidden="true"
        />

      {/* Right-side form overlay */}
      <div className="login-form-overlay">
        <div className="login-form-card">
          {/* Brand Wordmark */}
          <div className="brand-header">
            <Link to="/" className="brand-logo-link">
              <span className="brand-doc">Doc</span>
              <span className="brand-matrix">Matrix</span>
            </Link>
            <div className="brand-subtext">SMARTER DENTAL CARE</div>
          </div>

          {/* Form Header */}
          <div className="login-heading-group">
            <h1 className="login-main-heading">Forgot password</h1>
            <p className="login-sub-heading">
              Enter your email address to receive password reset instructions.
            </p>
          </div>

          {/* Status Message */}
          {error && <AuthBanner type="error" message={error} />}
          {successMessage && <AuthBanner type="success" message={successMessage} />}

          {!successMessage ? (
            <form onSubmit={handleSubmit} noValidate className="login-auth-form">
              <div className="input-field-group">
                <label htmlFor="reset-email" className="input-field-label">
                  Email address
                </label>
                <div className={`auth-input-container ${error ? 'is-invalid' : ''}`}>
                  <span className="auth-field-icon" aria-hidden="true">
                    <Mail size={18} />
                  </span>
                  <input
                    id="reset-email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (error) setError('')
                    }}
                    placeholder="doctor@clinic.com"
                    className="auth-text-input"
                    autoComplete="email"
                    disabled={loading}
                    required
                  />
                </div>
                {error && (
                  <p className="field-error-msg" role="alert" aria-live="polite">
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="btn-primary-teal"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner size={18} color="#ffffff" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <span>Send reset link</span>
                    <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>
          ) : null}

          {/* Back to sign in */}
          <div className="form-footer-prompt" style={{ marginTop: '24px' }}>
            <Link to="/login" className="back-to-signin-link">
              <ArrowLeft size={15} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  </div>
  )
}
