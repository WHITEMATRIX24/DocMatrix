import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '../src/services/apiClient';
import { AUTH_SESSION_CHANGED } from '../src/services/authSession';

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
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear(); sessionStorage.clear(); });

  it('does not refresh requests made without a session', async () => {
    const fetch = vi.fn().mockResolvedValue(reply(401));
    vi.stubGlobal('fetch', fetch);
    await expect(apiClient.get('/inventory/items')).rejects.toMatchObject({ status: 401 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('shares refresh and reuses the new token for a delayed old-token 401', async () => {
    sessionStorage.setItem(tokenKey, 'old');
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
    sessionStorage.setItem(tokenKey, 'old');
    sessionStorage.setItem('docmatrix_auth_user', '{}');
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
      expect(sessionStorage.getItem(tokenKey)).toBeNull();
      expect(sessionStorage.getItem('docmatrix_auth_user')).toBeNull();
      expect(changed).toHaveBeenCalledTimes(1);
      expect(fetch.mock.calls.filter(([url]) => url.endsWith('/auth/refresh'))).toHaveLength(1);
    } finally { window.removeEventListener(AUTH_SESSION_CHANGED, changed); }
  });

  it('preserves credentials when refresh encounters a server error', async () => {
    sessionStorage.setItem(tokenKey, 'old');
    vi.stubGlobal('fetch', vi.fn(async url => reply(url.endsWith('/auth/refresh') ? 503 : 401)));
    await expect(apiClient.get('/first')).rejects.toMatchObject({ status: 401 });
    expect(sessionStorage.getItem(tokenKey)).toBe('old');
  });

  it('waits for Retry-After before trying a rate-limited refresh again', async () => {
    sessionStorage.setItem(tokenKey, 'rate-limited-token');
    const now = vi.spyOn(Date, 'now').mockReturnValue(100000);
    const fetch = vi.fn(async url => url.endsWith('/auth/refresh')
      ? { ...reply(429), headers: { get: () => '30' } } : reply(401));
    vi.stubGlobal('fetch', fetch);
    await expect(apiClient.get('/first')).rejects.toMatchObject({ status: 401 });
    await expect(apiClient.get('/second')).rejects.toMatchObject({ status: 401 });
    expect(fetch.mock.calls.filter(([url]) => url.endsWith('/auth/refresh'))).toHaveLength(1);
    expect(sessionStorage.getItem(tokenKey)).toBe('rate-limited-token');
    now.mockReturnValue(131000);
    await expect(apiClient.get('/third')).rejects.toMatchObject({ status: 401 });
    expect(fetch.mock.calls.filter(([url]) => url.endsWith('/auth/refresh'))).toHaveLength(2);
  });
});
