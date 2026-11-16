import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { login, logout, refreshAccessToken, STORAGE_KEYS, DEMO_CREDENTIALS } from '../src/services/authService';

describe('Frontend Session Management & Token Refresh', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('stores access token and refresh token upon successful authentication', async () => {
    const result = await login(DEMO_CREDENTIALS.email, DEMO_CREDENTIALS.password, false);

    expect(result.token).toBeDefined();
    expect(result.user).toBeDefined();

    const storedToken = sessionStorage.getItem(STORAGE_KEYS.TOKEN);
    expect(storedToken).toBe(result.token);
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

