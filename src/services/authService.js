/**
 * Authentication Service (Mock / Simulated)
 * Handles login, Google OAuth simulation, session management, and password reset.
 * Easily swappable for real backend API calls.
 */

// Primary demo account credentials
export const DEMO_CREDENTIALS = {
  email: 'demo@docmatrix.com',
  password: 'Demo@1234'
}

// Demo user profiles
const DEMO_USERS = {
  'demo@docmatrix.com': {
    id: 'usr-101',
    name: 'Dr. Arun Kumar (Demo Admin)',
    email: 'demo@docmatrix.com',
    role: 'ORGANIZATION_ADMIN',
    clinicName: 'Demo Dental Clinic',
    clinicId: 'clinic-demo-001'
  },
  'google-demo': {
    id: 'usr-google-101',
    name: 'Dr. Sarah Jenkins',
    email: 'sarah.jenkins@gmail.com',
    role: 'DOCTOR',
    clinicName: 'Demo Dental Clinic',
    clinicId: 'clinic-demo-001',
    avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=120&auto=format&fit=crop&q=80'
  }
}

const STORAGE_KEYS = {
  TOKEN: 'docmatrix_auth_token',
  USER: 'docmatrix_auth_user',
  REMEMBER_EMAIL: 'docmatrix_remember_email',
  LEGACY_SESSION: 'docmatrix-demo-session'
}

/**
 * Simulate login with email and password
 * @param {string} email
 * @param {string} password
 * @param {boolean} rememberMe
 * @returns {Promise<{ user: object, token: string }>}
 */
export async function login(email, password, rememberMe = false) {
  // Snappy simulated response
  await new Promise((resolve) => setTimeout(resolve, 250))

  const cleanEmail = email.trim().toLowerCase()

  // Validate credentials: check exact demo account or allowed demo accounts
  const isDemoMatch =
    cleanEmail === DEMO_CREDENTIALS.email.toLowerCase() &&
    password === DEMO_CREDENTIALS.password

  // Also support existing demo accounts for continuity
  const isDoctorMatch =
    (cleanEmail === 'doctor@docmatrix.com' || cleanEmail === 'doctor@docmatrix.in') &&
    password.length >= 8

  if (!isDemoMatch && !isDoctorMatch) {
    throw new Error('Incorrect email or password')
  }

  const user = DEMO_USERS[cleanEmail] || {
    id: 'usr-104',
    name: 'Dr. Rajesh Nair (Doctor)',
    email: cleanEmail,
    role: 'DOCTOR',
    clinicName: 'Demo Dental Clinic',
    clinicId: 'clinic-demo-001'
  }

  const token = `fake-jwt-token-${Date.now()}`

  // Session persistence: localStorage if rememberMe is true, else sessionStorage
  const storage = rememberMe ? localStorage : sessionStorage
  storage.setItem(STORAGE_KEYS.TOKEN, token)
  storage.setItem(STORAGE_KEYS.USER, JSON.stringify(user))

  // Remember email handling
  if (rememberMe) {
    localStorage.setItem(STORAGE_KEYS.REMEMBER_EMAIL, cleanEmail)
  } else {
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_EMAIL)
  }

  // Keep legacy session key for compatibility with existing tests and app shell
  try {
    sessionStorage.setItem(STORAGE_KEYS.LEGACY_SESSION, user.id)
  } catch {}

  return { user, token }
}

/**
 * Simulate Google OAuth authentication
 * (Placeholder ready for real Google OAuth integration later)
 * @returns {Promise<{ user: object, token: string }>}
 */
export async function loginWithGoogle() {
  // Snappy simulated response
  await new Promise((resolve) => setTimeout(resolve, 250))

  const user = DEMO_USERS['google-demo']
  const token = `fake-google-token-${Date.now()}`

  // Default to sessionStorage for Google sign-in
  sessionStorage.setItem(STORAGE_KEYS.TOKEN, token)
  sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user))

  try {
    sessionStorage.setItem(STORAGE_KEYS.LEGACY_SESSION, user.id)
  } catch {}

  return { user, token }
}

/**
 * Request password reset (simulated)
 * @param {string} email
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function requestPasswordReset(email) {
  await new Promise((resolve) => setTimeout(resolve, 300))
  return {
    success: true,
    message: `A password reset link has been dispatched to ${email}.`
  }
}

/**
 * Log out and clear all stored credentials
 */
export function logout() {
  localStorage.removeItem(STORAGE_KEYS.TOKEN)
  localStorage.removeItem(STORAGE_KEYS.USER)
  sessionStorage.removeItem(STORAGE_KEYS.TOKEN)
  sessionStorage.removeItem(STORAGE_KEYS.USER)
  sessionStorage.removeItem(STORAGE_KEYS.LEGACY_SESSION)
}

/**
 * Get the currently logged-in user if token exists
 * @returns {object|null}
 */
export function getCurrentUser() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.USER) || localStorage.getItem(STORAGE_KEYS.USER)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

/**
 * Check if the user is authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
  return Boolean(getCurrentUser())
}

/**
 * Get remembered email from localStorage
 * @returns {string}
 */
export function getRememberedEmail() {
  try {
    return localStorage.getItem(STORAGE_KEYS.REMEMBER_EMAIL) || ''
  } catch {
    return ''
  }
}
