import { browserLocalStorage, browserSessionStorage } from '@/services/browserStorage';
import { logout, refreshAccessToken } from '../src/services/authService';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../src/services/apiClient';
import { AUTH_SESSION_CHANGED, notifyAuthSessionChanged } from '../src/services/authSession';

const tokenKey = 'docmatrix_auth_token';
const reply = (status: number, body = {}) => ({
  ok: status >= 200 && status < 300, status, json: async () => body,
});
const deferred = () => {
  let resolve!: (value: any) => void;
  const promise = new Promise<any>(done => { resolve = done; });
  return { promise, resolve };
};

describe('API refresh coordination', () => {
  beforeEach(() => { browserLocalStorage.clear(); browserSessionStorage.clear(); });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); browserLocalStorage.clear(); browserSessionStorage.clear(); });

  it('does not refresh requests made without a session', async () => {
    const fetch = vi.fn().mockResolvedValue(reply(401));
    vi.stubGlobal('fetch', fetch);
    await expect(apiClient.get('/inventory/items')).rejects.toMatchObject({ status: 401 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('shares refresh and reuses the new token for a delayed old-token 401', async () => {
    browserSessionStorage.setItem(tokenKey, 'old');
    const refresh = deferred();
    const delayed = deferred();
    const fetch = vi.fn(async (url, config) => {
      if (url.endsWith('/auth/refresh')) return refresh.promise;
      if (config.headers.Authorization === 'Bearer new') return reply(200, { success: true });
      if (url.endsWith('/delayed')) return delayed.promise;
      return reply(401);
    });
    vi.stubGlobal('fetch', fetch);
    const first = apiClient.get('/first');
    const second = apiClient.get('/second');
    const third = apiClient.get('/delayed');
    await vi.waitFor(() => expect(fetch.mock.calls.filter(([url]) => url.endsWith('/auth/refresh'))).toHaveLength(1));
    refresh.resolve(reply(200, { token: 'new' }));
    await Promise.all([first, second]);
    delayed.resolve(reply(401));
    await expect(third).resolves.toEqual({ success: true });
    expect(fetch.mock.calls.filter(([url]) => url.endsWith('/auth/refresh'))).toHaveLength(1);
  });

  it('clears an invalid session once and does not refresh delayed failures', async () => {
    browserSessionStorage.setItem(tokenKey, 'old');
    browserSessionStorage.setItem('docmatrix_auth_user', '{}');
    const delayed = deferred();
    const changed = vi.fn();
    window.addEventListener(AUTH_SESSION_CHANGED, changed);
    const fetch = vi.fn(async url => url.endsWith('/delayed') ? delayed.promise : reply(401));
    vi.stubGlobal('fetch', fetch);
    try {
      const late = apiClient.get('/delayed').catch(error => error);
      await expect(apiClient.get('/first')).rejects.toMatchObject({ status: 401 });
      delayed.resolve(reply(401));
      expect(await late).toMatchObject({ status: 401 });
      expect(browserSessionStorage.getItem(tokenKey)).toBeNull();
      expect(browserSessionStorage.getItem('docmatrix_auth_user')).toBeNull();
      expect(changed).toHaveBeenCalledTimes(1);
      expect(fetch.mock.calls.filter(([url]) => url.endsWith('/auth/refresh'))).toHaveLength(1);
    } finally { window.removeEventListener(AUTH_SESSION_CHANGED, changed); }
  });

  it('preserves credentials when refresh encounters a server error', async () => {
    browserSessionStorage.setItem(tokenKey, 'old');
    vi.stubGlobal('fetch', vi.fn(async url => reply(url.endsWith('/auth/refresh') ? 503 : 401)));
    await expect(apiClient.get('/first')).rejects.toMatchObject({ status: 401 });
    expect(browserSessionStorage.getItem(tokenKey)).toBe('old');
  });

  it('waits for Retry-After before trying a rate-limited refresh again', async () => {
    browserSessionStorage.setItem(tokenKey, 'rate-limited-token');
    const now = vi.spyOn(Date, 'now').mockReturnValue(100000);
    const fetch = vi.fn(async url => url.endsWith('/auth/refresh')
      ? { ...reply(429), headers: { get: () => '30' } } : reply(401));
    vi.stubGlobal('fetch', fetch);
    await expect(apiClient.get('/first')).rejects.toMatchObject({ status: 401 });
    await expect(apiClient.get('/second')).rejects.toMatchObject({ status: 401 });
    expect(fetch.mock.calls.filter(([url]) => url.endsWith('/auth/refresh'))).toHaveLength(1);
    expect(browserSessionStorage.getItem(tokenKey)).toBe('rate-limited-token');
    now.mockReturnValue(131000);
    await expect(apiClient.get('/third')).rejects.toMatchObject({ status: 401 });
    expect(fetch.mock.calls.filter(([url]) => url.endsWith('/auth/refresh'))).toHaveLength(2);
  });
  it('shares one refresh between explicit refresh calls and automatic retries', async () => {
    browserSessionStorage.setItem(tokenKey, 'shared-old');
    const response = deferred();
    const fetch = vi.fn(async (url, config) => url.endsWith('/auth/refresh') ? response.promise
      : config.headers.Authorization === 'Bearer shared-new' ? reply(200, { ok: true }) : reply(401));
    vi.stubGlobal('fetch', fetch);
    const automatic = apiClient.get('/shared');
    const manualA = refreshAccessToken(); const manualB = refreshAccessToken();
    await vi.waitFor(() => expect(fetch.mock.calls.filter(([url]) => url.endsWith('/auth/refresh'))).toHaveLength(1));
    response.resolve(reply(200, { token: 'shared-new', user: { id: 'user' } }));
    await expect(Promise.all([manualA, manualB])).resolves.toEqual(['shared-new', 'shared-new']);
    await expect(automatic).resolves.toEqual({ ok: true });
    expect(fetch.mock.calls.filter(([url]) => url.endsWith('/auth/refresh'))).toHaveLength(1);
  });

  it.each([true, false])('retains the selected credential store after explicit refresh, remember=%s', async remember => {
    const selected = remember ? browserLocalStorage : browserSessionStorage;
    const other = remember ? browserSessionStorage : browserLocalStorage;
    selected.setItem(tokenKey, 'storage-old');
    vi.stubGlobal('fetch', vi.fn(async () => reply(200, { token: 'storage-new', user: { id: 'user' } })));
    await expect(refreshAccessToken()).resolves.toBe('storage-new');
    expect(selected.getItem(tokenKey)).toBe('storage-new'); expect(other.getItem(tokenKey)).toBeNull();
  });

  it.each([true, false])('does not restore a logged-out session from a delayed refresh, initial bearer=%s', async withBearer => {
    if (withBearer) browserSessionStorage.setItem(tokenKey, 'logout-old');
    const response = deferred();
    const fetch = vi.fn(async url => url.endsWith('/auth/refresh') ? response.promise : reply(200));
    vi.stubGlobal('fetch', fetch);
    const pending = refreshAccessToken();
    const rejected = expect(pending).rejects.toThrow(/refresh/);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    await logout();
    response.resolve(reply(200, { token: 'must-not-restore', user: { id: 'previous-user' } }));
    await rejected;
    expect(browserSessionStorage.getItem(tokenKey)).toBeNull(); expect(browserLocalStorage.getItem(tokenKey)).toBeNull();
    expect(browserSessionStorage.getItem('docmatrix_auth_user')).toBeNull();
    expect(browserLocalStorage.getItem('docmatrix_auth_user')).toBeNull();
  });

  it('keeps a new session refresh independent from the previous session request', async () => {
    browserSessionStorage.setItem(tokenKey, 'account-a');
    const old = deferred(); const fresh = deferred();
    let calls = 0;
    const fetch = vi.fn(async () => ++calls === 1 ? old.promise : fresh.promise);
    vi.stubGlobal('fetch', fetch);
    const first = refreshAccessToken(); const firstRejected = expect(first).rejects.toThrow(/refresh/);
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    browserSessionStorage.setItem(tokenKey, 'account-b'); notifyAuthSessionChanged();
    const second = refreshAccessToken();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    old.resolve(reply(200, { token: 'stale-a', user: { id: 'a' } })); await firstRejected;
    const secondShared = refreshAccessToken();
    fresh.resolve(reply(200, { token: 'fresh-b', user: { id: 'b' } }));
    await expect(Promise.all([second, secondShared])).resolves.toEqual(['fresh-b', 'fresh-b']);
    expect(browserSessionStorage.getItem(tokenKey)).toBe('fresh-b');
    expect(JSON.parse(browserSessionStorage.getItem('docmatrix_auth_user')!)).toEqual({ id: 'b' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

});
