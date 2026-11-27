import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import { apiClient } from '@/services/apiClient';
import { getAuthToken } from '@/services/clinicStore';
import { getCurrentUser, loginPlatformAdmin, logout } from '@/services/authService';
import { AUTH_SESSION_CHANGED } from '@/services/authSession';
import './platformAdmin.css';
import AdminDashboard, { DashboardData } from './AdminDashboard';

type Screen = 'login' | 'checking' | 'dashboard' | 'forbidden' | 'error';

export function DentalSpatialRoom({ theme = 'light' }: { theme?: 'light' | 'dark' }) {
  return <div id="room" className={`pa-room${theme === 'dark' ? ' pa-theme-dark' : ''}`} aria-hidden="true" />;
}

export default function PlatformAdminPage() {
  const [screen, setScreen] = useState<Screen>(getAuthToken() ? 'checking' : 'login');
  const [data, setData] = useState<DashboardData | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requestVersion = useRef(0);

  useEffect(() => {
    document.documentElement.classList.add('pa-spatial-html');
    document.body.classList.add('pa-spatial-body');
    return () => {
      document.documentElement.classList.remove('pa-spatial-html');
      document.body.classList.remove('pa-spatial-body');
    };
  }, []);

  const loadDashboard = useCallback(async () => {
    const version = ++requestVersion.current;
    if (!getAuthToken()) {
      setData(null);
      setScreen('login');
      return;
    }
    setScreen(current => (current === 'dashboard' ? current : 'checking'));
    setError('');
    try {
      const result = await apiClient.get<DashboardData>('/admin/dashboard');
      if (version !== requestVersion.current) return;
      if (result?.user?.isPlatformAdmin !== true) {
        setData(null);
        setScreen('forbidden');
        return;
      }
      setData(result);
      setScreen('dashboard');
    } catch (e: any) {
      if (version !== requestVersion.current) return;
      setData(null);
      if (e?.status === 401) setScreen('login');
      else if (e?.status === 403) setScreen('forbidden');
      else {
        setError('Unable to load the platform overview. Please try again.');
        setScreen('error');
      }
    }
  }, []);

  useEffect(() => {
    if (getAuthToken()) loadDashboard();
    const invalidate = () => {
      if (!getAuthToken() || getCurrentUser()?.isPlatformAdmin !== true) {
        requestVersion.current++;
        setData(null);
        setScreen(getAuthToken() ? 'forbidden' : 'login');
      }
    };
    const refresh = () => {
      if (!document.hidden && getAuthToken()) loadDashboard();
    };
    window.addEventListener(AUTH_SESSION_CHANGED, invalidate);
    window.addEventListener('focus', refresh);
    const timer = window.setInterval(refresh, 60000);
    return () => {
      requestVersion.current++;
      window.removeEventListener(AUTH_SESSION_CHANGED, invalidate);
      window.removeEventListener('focus', refresh);
      window.clearInterval(timer);
    };
  }, [loadDashboard]);

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const user = await loginPlatformAdmin(email, password);
      setPassword('');
      if (user.accountSetupRequired) {
        window.location.assign('/account-security');
        return;
      }
      await loadDashboard();
    } catch (e: any) {
      setError(
        e?.status === 403
          ? 'This account is not authorized for platform administration.'
          : e?.status === 401
            ? 'Incorrect email or password.'
            : 'Unable to sign in. Please try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    requestVersion.current++;
    setData(null);
    setBusy(true);
    setError('');
    setPassword('');
    try {
      await logout();
    } finally {
      setScreen('login');
      setBusy(false);
    }
  };

  if (screen !== 'dashboard' || !data) {
    return (
      <main className="platform-admin pa-mode-light platform-admin-entry">
        <DentalSpatialRoom theme="light" />
        <section
          className="platform-admin-auth pa-glass"
          aria-label="Platform administrator access"
        >
          <div className="platform-admin-brand">
            <span className="platform-admin-brand-badge">
              <ShieldCheck size={22} />
            </span>
            <span>
              DocMatrix <small>Dental Platform Admin</small>
            </span>
          </div>
          {screen === 'checking' ? (
            <>
              <h1>Verifying platform access</h1>
              <p role="status">Checking your current session…</p>
            </>
          ) : screen === 'forbidden' ? (
            <>
              <h1>Platform access denied</h1>
              <p>This account is not authorized as a platform administrator.</p>
              <Link to="/dashboard">Return to clinic dashboard</Link>
              <button type="button" disabled={busy} onClick={signOut}>
                Sign in with another account
              </button>
            </>
          ) : screen === 'error' ? (
            <>
              <h1>Platform overview unavailable</h1>
              <p role="alert">{error}</p>
              <button type="button" className="pa-auth-btn" onClick={loadDashboard}>
                Retry
              </button>
              <button type="button" disabled={busy} onClick={signOut}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <h1>Platform Admin Login</h1>
              <p>Sign in with your authorized platform administrator account.</p>
              <form onSubmit={signIn}>
                <label htmlFor="platform-email">Email address</label>
                <input
                  id="platform-email"
                  type="email"
                  autoComplete="username"
                  placeholder="admin@docmatrix.com"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={busy}
                />
                <label htmlFor="platform-password">Password</label>
                <input
                  id="platform-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={busy}
                />
                {error && <p role="alert">{error}</p>}
                <button type="submit" disabled={busy}>
                  {busy ? 'Signing in…' : 'Sign in to platform'}
                </button>
              </form>
              <Link to="/login">Clinic staff login</Link>
            </>
          )}
        </section>
      </main>
    );
  }

  return (
    <AdminDashboard
      data={data}
      onRefresh={loadDashboard}
      onSignOut={signOut}
      busy={busy}
    />
  );
}
