import { browserLocalStorage, browserSessionStorage } from '@/services/browserStorage';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { login, logout, refreshAccessToken, STORAGE_KEYS, DEMO_CREDENTIALS } from '../src/services/authService';
import { apiClient } from '../src/services/apiClient';

describe('Frontend Session Management & Token Refresh', () => {
  beforeEach(() => {
    browserLocalStorage.clear();
    browserSessionStorage.clear();
    vi.spyOn(apiClient, 'post').mockImplementation(async path => path === '/auth/login'
      ? { token: 'new-session-token', user: { id: 'new-user', clinicId: 'new-clinic', role: 'ORGANIZATION_ADMIN' } }
      : {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    browserLocalStorage.clear();
    browserSessionStorage.clear();
  });

  it('stores the access token upon successful authentication', async () => {
    const result = await login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password, false);

    expect(result.token).toBeDefined();
    expect(result.user).toBeDefined();

    const storedToken = browserSessionStorage.getItem(STORAGE_KEYS.TOKEN);
    expect(storedToken).toBe(result.token);
  });

  it.each([true, false])('replaces stale credentials in both stores when rememberMe is %s', async rememberMe => {
    for (const storage of [browserSessionStorage, browserLocalStorage]) {
      storage.setItem(STORAGE_KEYS.TOKEN, 'expired-token');
      storage.setItem(STORAGE_KEYS.USER, JSON.stringify({ id: 'old-user' }));
      storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, 'legacy-refresh-token');
    }
    await login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password, rememberMe);
    const selected = rememberMe ? browserLocalStorage : browserSessionStorage;
    const other = rememberMe ? browserSessionStorage : browserLocalStorage;
    expect(selected.getItem(STORAGE_KEYS.TOKEN)).toBe('new-session-token');
    expect(other.getItem(STORAGE_KEYS.TOKEN)).toBeNull();
    expect(other.getItem(STORAGE_KEYS.USER)).toBeNull();
    expect(selected.getItem(STORAGE_KEYS.REFRESH_TOKEN)).toBeNull();
    expect(other.getItem(STORAGE_KEYS.REFRESH_TOKEN)).toBeNull();
  });

  it('logout invalidates all tokens and clears session storage', async () => {
    browserSessionStorage.setItem(STORAGE_KEYS.TOKEN, 'access-token-123');
    browserSessionStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, 'refresh-token-123');
    browserSessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify({ id: 'usr-1' }));

    await logout();

    expect(browserSessionStorage.getItem(STORAGE_KEYS.TOKEN)).toBeNull();
    expect(browserSessionStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)).toBeNull();
    expect(browserSessionStorage.getItem(STORAGE_KEYS.USER)).toBeNull();
  });
});

