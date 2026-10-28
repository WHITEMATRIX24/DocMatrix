import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, LogIn } from 'lucide-react'

// Brand cross mark matching the DocMatrix brand identity
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

export default function AuthNavbar({ currentView = 'login' }) {
  return (
    <header className="auth-navbar" role="banner">
      {/* Brand Logo */}
      <Link to="/" className="brand-anchor auth-nav-brand" aria-label="DocMatrix Home">
        <MedicalCrossMark />
        <span className="brand-title">DOC MATRIX</span>
      </Link>

      {/* Center Navigation Links */}
      <nav className="auth-nav-links" aria-label="Site navigation">
        <Link to="/" className="auth-nav-link">
          Home
        </Link>
        <a href="/#mosaic" className="auth-nav-link">
          Platform
        </a>
        <a href="/#solutions" className="auth-nav-link">
          Solutions
        </a>
        <a href="/#contact" className="auth-nav-link">
          Contact
        </a>
      </nav>

      {/* Right-hand Auth Switch Action */}
      <div className="auth-nav-actions">
        {currentView === 'login' ? (
          <div className="auth-nav-switch-wrap">
            <span className="auth-nav-switch-text">New clinic?</span>
            <Link to="/signup" className="btn-auth-signup auth-nav-btn" aria-label="Sign Up">
              <span>Sign Up</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        ) : currentView === 'signup' ? (
          <div className="auth-nav-switch-wrap">
            <span className="auth-nav-switch-text">Have an account?</span>
            <Link to="/login" className="btn-auth-signin auth-nav-btn" aria-label="Sign In">
              <LogIn size={14} />
              <span>Sign In</span>
            </Link>
          </div>
        ) : (
          <div className="auth-nav-switch-wrap">
            <Link to="/login" className="btn-auth-signin auth-nav-btn" aria-label="Back to Sign In">
              <LogIn size={14} />
              <span>Sign In</span>
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
