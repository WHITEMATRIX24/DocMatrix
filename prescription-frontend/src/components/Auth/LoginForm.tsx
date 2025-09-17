// src/components/Auth/LoginForm.tsx - DocNest Clean Design
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const {
    signIn,
    signUp,
    confirmSignUp,
    resendSignUpCode,
    isAmplifyAvailable,
    loading: authLoading,
  } = useAuth();

  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });

  const [activeTab, setActiveTab] = useState<'login' | 'signup' | 'confirm'>('login');
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    role: 'doctor',
    licenseNumber: '',
    hospital: '',
    birthdate: '',
    gender: '',
    phone_number: '',
  });
  const [confirmData, setConfirmData] = useState({ email: '', code: '' });

  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pendingConfirmation, setPendingConfirmation] = useState<string | null>(null);

  // Dark mode effect
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const clearErrors = () => {
    setError(null);
    setFieldErrors({});
  };

  // Helper function to format phone number as user types
  const formatPhoneInput = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    
    if (digits.startsWith('91') && digits.length > 2) {
      const remaining = digits.slice(2);
      if (remaining.length <= 5) {
        return `+91 ${remaining}`;
      } else {
        return `+91 ${remaining.slice(0, 5)} ${remaining.slice(5, 10)}`;
      }
    }
    
    if (digits.length <= 10 && !digits.startsWith('91')) {
      if (digits.length <= 5) {
        return digits ? `+91 ${digits}` : '';
      } else {
        return `+91 ${digits.slice(0, 5)} ${digits.slice(5, 10)}`;
      }
    }
    
    return value;
  };

  // Validate phone number
  const validatePhoneNumber = (phone: string): string | null => {
    const digits = phone.replace(/\D/g, '');
    
    if (!digits) {
      return 'Phone number is required';
    }
    
    if (digits.length === 10) {
      return null;
    }
    
    if (digits.length === 12 && digits.startsWith('91')) {
      return null;
    }
    
    return 'Invalid phone number. Enter 10-digit Indian number or +91XXXXXXXXXX';
  };

  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    clearErrors();
  };

  const handleSignupChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    let processedValue = value;
    
    if (name === 'phone_number') {
      processedValue = formatPhoneInput(value);
    }
    
    setSignupData((prev) => ({ ...prev, [name]: processedValue }));
    clearErrors();
    
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleConfirmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    clearErrors();
  };

  const validateSignupForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!signupData.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupData.email)) {
      errors.email = 'Invalid email format';
    }
    
    if (!signupData.name.trim()) {
      errors.name = 'Full name is required';
    }
    
    if (!signupData.password) {
      errors.password = 'Password is required';
    } else if (signupData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/.test(signupData.password)) {
      errors.password = 'Password must contain uppercase, lowercase, number and special character';
    }
    
    if (signupData.password !== signupData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    const phoneError = validatePhoneNumber(signupData.phone_number);
    if (phoneError) {
      errors.phone_number = phoneError;
    }
    
    if (!signupData.birthdate) {
      errors.birthdate = 'Birthdate is required';
    } else {
      const birthDate = new Date(signupData.birthdate);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 18 || age > 100) {
        errors.birthdate = 'Age must be between 18 and 100 years';
      }
    }
    
    if (!signupData.gender) {
      errors.gender = 'Gender is required';
    }
    
    if (!signupData.hospital || !signupData.hospital.trim()) {
      errors.hospital = 'Hospital/Address is required';
    } else if (signupData.hospital.trim().length < 3) {
      errors.hospital = 'Hospital/Address must be at least 3 characters';
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearErrors();

    try {
      const result = await signIn(loginData.email, loginData.password);

      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.message || 'Login failed');
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearErrors();

    if (!validateSignupForm()) {
      setLoading(false);
      return;
    }

    if (!isAmplifyAvailable) {
      setError('Sign up is only available with AWS Cognito');
      setLoading(false);
      return;
    }

    try {
      const email = String(signupData.email || '').trim();
      const password = String(signupData.password || '').trim();
      const name = String(signupData.name || '').trim();
      const role = String(signupData.role || 'doctor').toLowerCase();

      const attributes = {
        name,
        email,
        birthdate: signupData.birthdate,
        gender: signupData.gender,
        hospital: signupData.hospital,
        phone_number: signupData.phone_number,
        role: role,
        licenseNumber: signupData.licenseNumber,
      };

      const result = await signUp(email, password, attributes);

      if (result.isSignUpComplete) {
        setActiveTab('login');
        setLoginData({ email: signupData.email, password: '' });
      } else {
        setPendingConfirmation(email);
        setConfirmData({ email: email, code: '' });
        setActiveTab('confirm');
      }
    } catch (error: any) {
      console.error('❌ Signup error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearErrors();

    try {
      await confirmSignUp(confirmData.email, confirmData.code);
      setActiveTab('login');
      setLoginData({ email: confirmData.email, password: '' });
      setPendingConfirmation(null);
    } catch (error: any) {
      console.error('❌ Confirmation error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!confirmData.email) return;

    try {
      setResendLoading(true);
      clearErrors();
      await resendSignUpCode(confirmData.email);
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to resend code';
      console.error('❌ Resend failed:', errorMessage);
      setError(errorMessage);
    } finally {
      setResendLoading(false);
    }
  };

  const switchToLogin = () => {
    setActiveTab('login');
    clearErrors();
    if (pendingConfirmation) {
      setLoginData({ email: pendingConfirmation, password: '' });
    }
  };

  const baseInputStyle: React.CSSProperties = {
    width: '100%',
    padding: '16px',
    border: darkMode ? '2px solid #374151' : '2px solid #e5e7eb',
    borderRadius: '12px',
    fontSize: '16px',
    background: darkMode ? '#374151' : '#f9fafb',
    color: darkMode ? '#f9fafb' : '#1f2937',
    transition: 'all 0.3s ease',
    outline: 'none',
    boxSizing: 'border-box'
  };

  const errorInputStyle: React.CSSProperties = {
    ...baseInputStyle,
    border: '2px solid #ef4444',
    background: darkMode ? '#7f1d1d' : '#fef2f2',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: darkMode ? '#f9fafb' : '#374151'
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: darkMode 
        ? 'linear-gradient(135deg, #1f2937 0%, #111827 100%)'
        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: 'Inter, Arial, sans-serif',
      transition: 'all 0.3s ease'
    }}>
      {/* Dark Mode Toggle */}
      <button
        onClick={toggleDarkMode}
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          padding: '12px',
          border: 'none',
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.2)',
          color: 'white',
          cursor: 'pointer',
          fontSize: '20px',
          transition: 'all 0.3s ease',
          zIndex: 1000
        }}
        title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {darkMode ? '☀️' : '🌙'}
      </button>

      <div style={{
        background: darkMode 
          ? 'rgba(31, 41, 55, 0.95)' 
          : 'rgba(255, 255, 255, 0.95)',
        borderRadius: '24px',
        padding: activeTab === 'signup' ? '40px' : '50px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(20px)',
        border: darkMode 
          ? '1px solid #374151' 
          : '1px solid rgba(255, 255, 255, 0.3)',
        width: '100%',
        maxWidth: activeTab === 'signup' ? '600px' : '450px',
        textAlign: 'center',
        transition: 'all 0.3s ease'
      }}>
        {/* Logo and Title */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{
            width: '80px',
            height: '80px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '40px',
            margin: '0 auto 20px',
            boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)'
          }}>
            🏥
          </div>
          <h1 style={{
            margin: '0 0 8px 0',
            fontSize: '2.5rem',
            fontWeight: '700',
            color: darkMode ? '#f9fafb' : '#1f2937',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            DocNest
          </h1>
          <p style={{
            margin: 0,
            fontSize: '1.1rem',
            color: darkMode ? '#9ca3af' : '#6b7280',
            fontWeight: '500'
          }}>
            Digital Healthcare Management
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          background: darkMode ? '#374151' : '#f8f9fa',
          borderRadius: '16px',
          padding: '6px',
          marginBottom: '30px',
          position: 'relative',
        }}>
          <button
            onClick={switchToLogin}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              borderRadius: '12px',
              background: activeTab === 'login' 
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                : 'transparent',
              color: activeTab === 'login' 
                ? 'white' 
                : (darkMode ? '#d1d5db' : '#666'),
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            🔐 Sign In
          </button>
          <button
            onClick={() => {
              setActiveTab('signup');
              clearErrors();
            }}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              borderRadius: '12px',
              background: activeTab === 'signup' 
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                : 'transparent',
              color: activeTab === 'signup' 
                ? 'white' 
                : (darkMode ? '#d1d5db' : '#666'),
              fontWeight: '600',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            ✨ Sign Up
          </button>
          {pendingConfirmation && (
            <button
              onClick={() => {
                setActiveTab('confirm');
                clearErrors();
              }}
              style={{
                flex: 1,
                padding: '12px',
                border: 'none',
                borderRadius: '12px',
                background: activeTab === 'confirm' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : 'transparent',
                color: activeTab === 'confirm' 
                  ? 'white' 
                  : (darkMode ? '#d1d5db' : '#666'),
                fontWeight: '600',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            >
              📧 Confirm
            </button>
          )}
        </div>

        {/* Login Form */}
        {activeTab === 'login' && (
          <form onSubmit={handleLogin} style={{ textAlign: 'left' }}>
            <div style={{ marginBottom: '25px' }}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                name="email"
                required
                value={loginData.email}
                onChange={handleLoginChange}
                style={baseInputStyle}
                placeholder="Enter your email"
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = darkMode ? '#374151' : '#e5e7eb';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={{ marginBottom: '35px' }}>
              <label style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  value={loginData.password}
                  onChange={handleLoginChange}
                  style={{
                    ...baseInputStyle,
                    paddingRight: '50px',
                  }}
                  placeholder="Enter your password"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#667eea';
                    e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = darkMode ? '#374151' : '#e5e7eb';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '18px',
                    padding: '4px',
                    color: darkMode ? '#9ca3af' : '#6b7280'
                  }}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                marginBottom: '20px',
                padding: '12px',
                background: darkMode ? '#7f1d1d' : '#fef2f2',
                border: darkMode ? '1px solid #991b1b' : '1px solid #fecaca',
                borderRadius: '8px',
                color: '#ef4444',
                fontSize: '14px',
              }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || authLoading}
              style={{
                width: '100%',
                padding: '18px',
                background: loading || authLoading
                  ? (darkMode ? '#4b5563' : '#d1d5db')
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading || authLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: loading || authLoading
                  ? 'none'
                  : '0 4px 15px rgba(102, 126, 234, 0.3)',
                transform: loading || authLoading ? 'none' : 'translateY(0)'
              }}
              onMouseEnter={(e) => {
                if (!loading && !authLoading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && !authLoading) {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
                }
              }}
            >
              {loading || authLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTop: '2px solid white',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Signing In...
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <span>🚀</span>
                  Sign In to DocNest
                </div>
              )}
            </button>
          </form>
        )}

        {/* Signup Form */}
        {activeTab === 'signup' && (
          <form onSubmit={handleSignup} style={{ textAlign: 'left' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: '20px',
              marginBottom: '25px'
            }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={signupData.name}
                  onChange={handleSignupChange}
                  style={fieldErrors.name ? errorInputStyle : baseInputStyle}
                  placeholder="Dr. John Smith"
                />
                {fieldErrors.name && (
                  <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                    {fieldErrors.name}
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle}>Email</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={signupData.email}
                  onChange={handleSignupChange}
                  style={fieldErrors.email ? errorInputStyle : baseInputStyle}
                  placeholder="your.email@hospital.com"
                />
                {fieldErrors.email && (
                  <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                    {fieldErrors.email}
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle}>Role</label>
                <select
                  name="role"
                  value={signupData.role}
                  onChange={handleSignupChange}
                  style={baseInputStyle}
                >
                  <option value="doctor">👨‍⚕️ Doctor</option>
                  <option value="admin">👨‍💼 Admin</option>
                  <option value="pharmacist">💊 Pharmacist</option>
                  <option value="nurse">👩‍⚕️ Nurse</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>License Number (Optional)</label>
                <input
                  type="text"
                  name="licenseNumber"
                  value={signupData.licenseNumber}
                  onChange={handleSignupChange}
                  style={baseInputStyle}
                  placeholder="MD123456"
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Hospital/Address *</label>
                <input
                  type="text"
                  name="hospital"
                  required
                  value={signupData.hospital}
                  onChange={handleSignupChange}
                  style={fieldErrors.hospital ? errorInputStyle : baseInputStyle}
                  placeholder="General Hospital, City"
                />
                {fieldErrors.hospital && (
                  <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                    {fieldErrors.hospital}
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle}>Birthdate</label>
                <input
                  type="date"
                  name="birthdate"
                  required
                  value={signupData.birthdate}
                  onChange={handleSignupChange}
                  style={fieldErrors.birthdate ? errorInputStyle : baseInputStyle}
                  max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                  min={new Date(new Date().setFullYear(new Date().getFullYear() - 100)).toISOString().split('T')[0]}
                />
                {fieldErrors.birthdate && (
                  <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                    {fieldErrors.birthdate}
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle}>Gender</label>
                <select
                  name="gender"
                  required
                  value={signupData.gender}
                  onChange={handleSignupChange}
                  style={fieldErrors.gender ? errorInputStyle : baseInputStyle}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                {fieldErrors.gender && (
                  <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                    {fieldErrors.gender}
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle}>Phone Number</label>
                <input
                  type="tel"
                  name="phone_number"
                  required
                  value={signupData.phone_number}
                  onChange={handleSignupChange}
                  style={fieldErrors.phone_number ? errorInputStyle : baseInputStyle}
                  placeholder="+91 98765 43210"
                />
                {fieldErrors.phone_number && (
                  <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                    {fieldErrors.phone_number}
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle}>Password</label>
                <input
                  type="password"
                  name="password"
                  required
                  value={signupData.password}
                  onChange={handleSignupChange}
                  style={fieldErrors.password ? errorInputStyle : baseInputStyle}
                  placeholder="Minimum 8 characters"
                />
                {fieldErrors.password && (
                  <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                    {fieldErrors.password}
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle}>Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  value={signupData.confirmPassword}
                  onChange={handleSignupChange}
                  style={fieldErrors.confirmPassword ? errorInputStyle : baseInputStyle}
                  placeholder="Confirm your password"
                />
                {fieldErrors.confirmPassword && (
                  <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                    {fieldErrors.confirmPassword}
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div style={{
                marginBottom: '20px',
                padding: '12px',
                background: darkMode ? '#7f1d1d' : '#fef2f2',
                border: darkMode ? '1px solid #991b1b' : '1px solid #fecaca',
                borderRadius: '8px',
                color: '#ef4444',
                fontSize: '14px',
              }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !isAmplifyAvailable}
              style={{
                width: '100%',
                padding: '18px',
                background: loading || !isAmplifyAvailable 
                  ? (darkMode ? '#4b5563' : '#d1d5db') 
                  : 'linear-gradient(135deg, #00f2fe 0%, #4facfe 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading || !isAmplifyAvailable ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: loading || !isAmplifyAvailable 
                  ? 'none' 
                  : '0 4px 15px rgba(79, 172, 254, 0.3)',
              }}
            >
              {loading ? '⏳ Creating Account...' : '✨ Create Account'}
            </button>

            {!isAmplifyAvailable && (
              <div style={{
                marginTop: '16px',
                padding: '14px',
                background: darkMode ? '#92400e' : '#fff3cd',
                borderRadius: '10px',
                fontSize: '12px',
                color: darkMode ? '#fbbf24' : '#856404',
                border: darkMode ? '1px solid #d97706' : '1px solid #ffeaa7',
              }}>
                ⚠️ Sign up requires AWS Cognito to be enabled
              </div>
            )}
          </form>
        )}

        {/* Confirmation Form */}
        {activeTab === 'confirm' && (
          <form onSubmit={handleConfirm} style={{ textAlign: 'left' }}>
            <div style={{ marginBottom: '20px', textAlign: 'center' }}>
              <h3 style={{ color: darkMode ? '#f9fafb' : '#333', marginBottom: '10px' }}>📧 Confirm Your Email</h3>
              <p style={{ color: darkMode ? '#9ca3af' : '#666', fontSize: '14px' }}>
                We sent a confirmation code to <strong>{confirmData.email}</strong>
              </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                name="email"
                required
                value={confirmData.email}
                onChange={handleConfirmChange}
                style={baseInputStyle}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Confirmation Code</label>
              <input
                type="text"
                name="code"
                required
                value={confirmData.code}
                onChange={handleConfirmChange}
                style={baseInputStyle}
                placeholder="Enter 6-digit code"
              />
            </div>

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendLoading || !confirmData.email}
                style={{
                  background: 'none',
                  border: 'none',
                  color: resendLoading ? (darkMode ? '#6b7280' : '#ccc') : '#667eea',
                  textDecoration: 'underline',
                  cursor: resendLoading || !confirmData.email ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  transition: 'all 0.3s ease',
                }}
              >
                {resendLoading ? '⏳ Sending...' : '🔁 Resend Code'}
              </button>
            </div>

            {error && (
              <div style={{
                marginBottom: '20px',
                padding: '12px',
                background: darkMode ? '#7f1d1d' : '#fef2f2',
                border: darkMode ? '1px solid #991b1b' : '1px solid #fecaca',
                borderRadius: '8px',
                color: '#ef4444',
                fontSize: '14px',
              }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '18px',
                background: loading 
                  ? (darkMode ? '#4b5563' : '#d1d5db') 
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: loading 
                  ? 'none' 
                  : '0 4px 15px rgba(16, 185, 129, 0.3)',
              }}
            >
              {loading ? '⏳ Confirming...' : '✅ Confirm Email'}
            </button>
          </form>
        )}

        {/* Footer */}
        <div style={{ 
          marginTop: '40px', 
          paddingTop: '30px', 
          borderTop: darkMode ? '1px solid #374151' : '1px solid #e5e7eb',
          color: darkMode ? '#9ca3af' : '#6b7280',
          fontSize: '14px'
        }}>
          <p style={{ margin: 0 }}>
            Secure healthcare management system
          </p>
        </div>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoginForm;