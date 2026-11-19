import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { login, logout, refreshAccessToken, STORAGE_KEYS, DEMO_CREDENTIALS } from '../src/services/authService';
import { apiClient } from '../src/services/apiClient';

describe('Frontend Session Management & Token Refresh', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.spyOn(apiClient, 'post').mockImplementation(async path => path === '/auth/login'
      ? { token: 'new-session-token', user: { id: 'new-user', clinicId: 'new-clinic', role: 'ORGANIZATION_ADMIN' } }
      : {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('stores the access token upon successful authentication', async () => {
    const result = await login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password, false);

    expect(result.token).toBeDefined();
    expect(result.user).toBeDefined();

    const storedToken = sessionStorage.getItem(STORAGE_KEYS.TOKEN);
    expect(storedToken).toBe(result.token);
  });

  it.each([true, false])('replaces stale credentials in both stores when rememberMe is %s', async rememberMe => {
    for (const storage of [sessionStorage, localStorage]) {
      storage.setItem(STORAGE_KEYS.TOKEN, 'expired-token');
      storage.setItem(STORAGE_KEYS.USER, JSON.stringify({ id: 'old-user' }));
      storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, 'legacy-refresh-token');
    }
    await login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password, rememberMe);
    const selected = rememberMe ? localStorage : sessionStorage;
    const other = rememberMe ? sessionStorage : localStorage;
    expect(selected.getItem(STORAGE_KEYS.TOKEN)).toBe('new-session-token');
    expect(other.getItem(STORAGE_KEYS.TOKEN)).toBeNull();
    expect(other.getItem(STORAGE_KEYS.USER)).toBeNull();
    expect(selected.getItem(STORAGE_KEYS.REFRESH_TOKEN)).toBeNull();
    expect(other.getItem(STORAGE_KEYS.REFRESH_TOKEN)).toBeNull();
  });

  it('logout invalidates all tokens and clears session storage', async () => {
    sessionStorage.setItem(STORAGE_KEYS.TOKEN, 'access-token-123');
    sessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, 'refresh-token-123');
    sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({ id: 'usr-1' }));

    await logout();

    expect(sessionStorage.getItem(STORAGE_KEYS.TOKEN)).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEYS.USER)).toBeNull();
  });
});

