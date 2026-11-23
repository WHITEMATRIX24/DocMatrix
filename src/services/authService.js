import { browserLocalStorage, browserSessionStorage } from '@/services/browserStorage';
/**
 * Authentication Service
 * Handles login, clinic registration, current-user profile loading,
 * session management, and password reset.
 * Connects to NestJS Backend with resilient offline fallback for local tests.
 */
import { apiClient, requestNewAccessToken } from './apiClient';
import { clearClinicStore, initClinicSession } from './clinicStore';
import { clearInventoryStore, initInventorySession } from './adaptiveInventoryStore';
import { clearClinicStaffStore, fetchAndSyncClinicStaff } from './clinicStaffStore';
import { clearBillingStore, initBillingSession } from './billingStore';
import { notifyAuthSessionChanged } from './authSession';

export function clearAllClinicStores() {
  try { clearClinicStore(); } catch {}
  try { clearInventoryStore(); } catch {}
  try { clearClinicStaffStore(); } catch {}
  try { clearBillingStore(); } catch {}
}

export function initAllClinicStores(clinicId) {
  try { initClinicSession(clinicId); } catch {}
  try { initInventorySession(clinicId); } catch {}
  try { initBillingSession(clinicId); } catch {}
  try { fetchAndSyncClinicStaff(); } catch {}
}

// Primary demo account credentials
export const DEMO_CREDENTIALS = {
  email: 'demo@docmatrix.com',
  password: 'Demo@1234'
}

// Demo user profiles
const DEMO_USERS = {
  'demo@docmatrix.com': {
    id: 'usr-101',
    name: 'Clinic Administrator',
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

export const STORAGE_KEYS = {
  TOKEN: 'docmatrix_auth_token',
  REFRESH_TOKEN: 'docmatrix_refresh_token',
  USER: 'docmatrix_auth_user',
  REMEMBER_EMAIL: 'docmatrix_remember_email',
  LEGACY_SESSION: 'docmatrix-demo-session'
}

function clearStoredCredentials() {
  for (const storage of [browserSessionStorage, browserLocalStorage]) {
    storage.removeItem(STORAGE_KEYS.TOKEN);
    storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    storage.removeItem(STORAGE_KEYS.USER);
  }
  browserSessionStorage.removeItem(STORAGE_KEYS.LEGACY_SESSION);
}

/**
 * Log in with email and password
 * Attempts backend API first; falls back to demo accounts if server offline.
 * @param {string} email
 * @param {string} password
 * @param {boolean} rememberMe
 * @returns {Promise<{ user: object, token: string }>}
 */
export async function login(email, password, rememberMe = false, code = '') {
  const cleanEmail = email.trim().toLowerCase();

  try {
    const res = await apiClient.post('/auth/login', {
      email: cleanEmail,
      password,
      ...(code ? { code } : {}),
    });

    if (res?.token && res?.user) {
      clearAllClinicStores();
      clearStoredCredentials();
      const storage = rememberMe ? browserLocalStorage : browserSessionStorage;
      storage.setItem(STORAGE_KEYS.TOKEN, res.token);
      storage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.user));
      try {
        browserSessionStorage.setItem(STORAGE_KEYS.LEGACY_SESSION, res.user.id);
      } catch {}

      if (rememberMe) {
        browserLocalStorage.setItem(STORAGE_KEYS.REMEMBER_EMAIL, cleanEmail);
      } else {
        browserLocalStorage.removeItem(STORAGE_KEYS.REMEMBER_EMAIL);
      }

      initAllClinicStores(res.user.clinicId);

      return { user: res.user, token: res.token };
    }
  } catch (apiErr) {
    const isTest = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test';
    if (!isTest) {
      throw new Error(apiErr.message || 'Incorrect email or password');
    }

    // Demo account fallback strictly for headless/offline unit testing (Vitest)
    const isDemoMatch =
      cleanEmail === DEMO_CREDENTIALS.email.toLowerCase() &&
      password === DEMO_CREDENTIALS.password;

    const isDoctorMatch =
      (cleanEmail === 'doctor@docmatrix.com' || cleanEmail === 'doctor@docmatrix.in') &&
      password.length >= 8;

    if (!isDemoMatch && !isDoctorMatch) {
      throw new Error(apiErr.message || 'Incorrect email or password');
    }
  }

  if (import.meta.env?.MODE !== 'test') throw new Error('The server returned an invalid sign-in response.');

  // Fallback demo account for local UI testing
  await new Promise((resolve) => setTimeout(resolve, 100));

  const user = DEMO_USERS[cleanEmail] || {
    id: 'usr-104',
    name: 'Dr. Rajesh Nair (Doctor)',
    email: cleanEmail,
    role: 'DOCTOR',
    clinicName: 'Demo Dental Clinic',
    clinicId: 'clinic-demo-001'
  };

  const token = `demo-token-${Date.now()}`;
  const storage = rememberMe ? browserLocalStorage : browserSessionStorage;
  storage.setItem(STORAGE_KEYS.TOKEN, token);
  storage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));

  if (rememberMe) {
    browserLocalStorage.setItem(STORAGE_KEYS.REMEMBER_EMAIL, cleanEmail);
  } else {
    browserLocalStorage.removeItem(STORAGE_KEYS.REMEMBER_EMAIL);
  }

  try {
    browserSessionStorage.setItem(STORAGE_KEYS.LEGACY_SESSION, user.id);
  } catch {}

  try {
    initClinicSession(user.clinicId);
  } catch {}

  return { user, token };
}

/**
 * Authenticate through the platform-only backend login without demo fallback
 * or initializing tenant stores.
 */
export async function loginPlatformAdmin(email, password, code = '') {
  const res = await apiClient.post('/auth/platform-login', { email: email.trim().toLowerCase(), password, ...(code ? { code } : {}) });
  if (!res?.token || res?.user?.isPlatformAdmin !== true) {
    throw Object.assign(new Error('Platform administrator access is required.'), { status: 403 });
  }
  clearAllClinicStores();
  for (const storage of [browserLocalStorage, browserSessionStorage]) {
    storage.removeItem(STORAGE_KEYS.TOKEN);
    storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    storage.removeItem(STORAGE_KEYS.USER);
  }
  browserSessionStorage.removeItem(STORAGE_KEYS.LEGACY_SESSION);
  browserSessionStorage.setItem(STORAGE_KEYS.TOKEN, res.token);
  browserSessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.user));
  notifyAuthSessionChanged();
  return res.user;
}

/** Register a new clinic and primary owner. */
export async function registerClinic(formData) {
  try {
    const res = await apiClient.post('/auth/register-clinic', {
      fullName: formData.fullName?.trim(),
      clinicName: formData.clinicName?.trim(),
      email: formData.email?.trim().toLowerCase(),
      password: formData.password,
      mobile: formData.mobile?.trim(),
      city: formData.city?.trim() || undefined,
      state: formData.state?.trim() || undefined,
      country: formData.country?.trim() || 'India',
      address: formData.location?.trim() || undefined,
      practiceType: formData.practiceType || 'Solo',
    });

    if (res?.token && res?.user) {
      clearAllClinicStores();
      clearStoredCredentials();
      browserSessionStorage.setItem(STORAGE_KEYS.TOKEN, res.token);
      browserSessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res.user));
      try {
        browserSessionStorage.setItem(STORAGE_KEYS.LEGACY_SESSION, res.user.id);
      } catch {}
      initAllClinicStores(res.user.clinicId);
      return { user: res.user, token: res.token };
    }
  } catch (apiErr) {
    const isTest = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'test';
    if (!isTest) {
      throw new Error(apiErr.message || 'Registration failed');
    }
    // If backend connection fails, fall back to simulated session during test mode
    console.warn('[authService] Backend registration unreachable, fallback to local session:', apiErr.message);
  }

  if (import.meta.env?.MODE !== 'test') throw new Error('The server returned an invalid registration response.');

  const fallbackUser = {
    id: 'usr-' + Date.now(),
    name: formData.fullName.trim(),
    role: 'ORGANIZATION_ADMIN',
    clinicName: formData.clinicName.trim(),
    email: formData.email.trim(),
    country: formData.country,
    state: formData.state?.trim(),
    city: formData.city?.trim(),
    location: formData.location?.trim(),
    mobile: formData.mobile?.trim(),
    practiceType: formData.practiceType,
    preferredMode: formData.preferredMode,
    clinicId: 'clinic-new-001'
  };

  const demoToken = `demo-reg-token-${Date.now()}`;
  browserSessionStorage.setItem(STORAGE_KEYS.TOKEN, demoToken);
  browserSessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(fallbackUser));
  try {
    browserSessionStorage.setItem(STORAGE_KEYS.LEGACY_SESSION, fallbackUser.id);
  } catch {}

  return { user: fallbackUser, token: demoToken };
}

/**
 * Restore current user profile from backend
 */
export async function restoreSession() {
  const token = browserSessionStorage.getItem(STORAGE_KEYS.TOKEN) || browserLocalStorage.getItem(STORAGE_KEYS.TOKEN);
  if (!token) {
    const restored = await requestNewAccessToken();
    if (!restored) return null;
  }

  try {
    const res = await apiClient.get('/auth/me');
    const activeToken = browserSessionStorage.getItem(STORAGE_KEYS.TOKEN) || browserLocalStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token && activeToken !== token) return getCurrentUser();
    if (res?.id) {
      const storage = browserLocalStorage.getItem(STORAGE_KEYS.TOKEN) ? browserLocalStorage : browserSessionStorage;
      storage.setItem(STORAGE_KEYS.USER, JSON.stringify(res));
      notifyAuthSessionChanged();
      return res;
    }
  } catch (error) {
    const activeToken = browserSessionStorage.getItem(STORAGE_KEYS.TOKEN) || browserLocalStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token && activeToken !== token) return getCurrentUser();
    if (error?.status === 401 || error?.status === 403) {
      clearAllClinicStores();
      for (const storage of [browserLocalStorage, browserSessionStorage]) {
        storage.removeItem(STORAGE_KEYS.TOKEN);
        storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        storage.removeItem(STORAGE_KEYS.USER);
      }
      browserSessionStorage.removeItem(STORAGE_KEYS.LEGACY_SESSION);
      notifyAuthSessionChanged();
      return null;
    }
    // Return cached user if offline
  }

  return getCurrentUser();
}

/**
 * Simulate Google OAuth authentication
 */
export async function loginWithGoogle() {
  throw new Error('Google sign-in is not available. Use your email and password.');
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email) {
  return apiClient.post('/auth/password-reset/request', { email: email.trim() });
}

/**
 * Log out and clear all stored credentials
 */
export async function logout() {
  // Start revocation while the bearer token is available, then clear local
  // credentials immediately even if the server is slow or unavailable.
  const revocation = apiClient.post('/auth/logout', {}).catch(() => {});

  clearAllClinicStores();
  browserLocalStorage.removeItem(STORAGE_KEYS.TOKEN);
  browserLocalStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  browserLocalStorage.removeItem(STORAGE_KEYS.USER);
  browserSessionStorage.removeItem(STORAGE_KEYS.TOKEN);
  browserSessionStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  browserSessionStorage.removeItem(STORAGE_KEYS.USER);
  browserSessionStorage.removeItem(STORAGE_KEYS.LEGACY_SESSION);
  notifyAuthSessionChanged();
  await revocation;
}

/**
 * Manually trigger access token refresh using HttpOnly cookie session
 */
export async function refreshAccessToken() {
  const token = await requestNewAccessToken();
  if (token) return token;
  throw new Error('Unable to refresh the current session.');
}

/**
 * Get the currently logged-in user if token exists
 */
export function getCurrentUser() {
  try {
    const raw = browserSessionStorage.getItem(STORAGE_KEYS.USER) || browserLocalStorage.getItem(STORAGE_KEYS.USER);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

/**
 * Check if the user is authenticated
 */
export function isAuthenticated() {
  return Boolean(getCurrentUser());
}

/**
 * Get remembered email from browserLocalStorage
 */
export function getRememberedEmail() {
  try {
    return browserLocalStorage.getItem(STORAGE_KEYS.REMEMBER_EMAIL) || '';
  } catch {
    return '';
  }
}
