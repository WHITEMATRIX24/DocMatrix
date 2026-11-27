import { browserLocalStorage, browserSessionStorage } from '@/services/browserStorage';
/**
 * Centralized API Client for DocMatrix Backend
 * Connects to NestJS Backend at VITE_API_BASE_URL (defaults to http://localhost:3000)
 * Uses dynamic transport dispatch with automatic token refresh, concurrency protection, and CSRF defense.
 */

import { getAuthSessionVersion, notifyAuthSessionChanged } from './authSession';

const getBaseUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string') {
    return envUrl.replace(/\/+$/, '');
  }
  return (import.meta as any).env?.PROD ? '/api' : 'http://localhost:3000';
};

export const getStoredToken = (): string | null => {
  try {
    return browserSessionStorage.getItem('docmatrix_auth_token') || browserLocalStorage.getItem('docmatrix_auth_token');
  } catch {
    return null;
  }
};

interface RequestOptions {
  responseType?: 'blob';
  headers?: Record<string, string>;
  params?: Record<string, any>;
  signal?: AbortSignal;
  timeoutMs?: number;
  _isRetry?: boolean;
}

// Share refresh requests within a session; old requests cannot replace a new session.
let activeRefreshPromise: Promise<string | null> | null = null;
let activeRefreshContext: { token: string | null; version: number } | null = null;
let refreshCooldown: { token: string | null; until: number } | null = null;

export const requestNewAccessToken = async (): Promise<string | null> => {
  const context = { token: getStoredToken(), version: getAuthSessionVersion() };
  if (activeRefreshPromise && activeRefreshContext?.token === context.token && activeRefreshContext.version === context.version) return activeRefreshPromise;
  if (refreshCooldown?.token === getStoredToken() && Date.now() < refreshCooldown.until) return null;

  activeRefreshContext = context;
  activeRefreshPromise = Promise.resolve().then(async () => {
    const tokenAtStart = context.token;
    try {
      const httpFn = (globalThis as any)['fetch'];
      const url = `${getBaseUrl()}/auth/refresh`;

      const response = await httpFn(url, {
        signal: AbortSignal.timeout(15000),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
        body: JSON.stringify({}),
      });

      if (getStoredToken() !== tokenAtStart || getAuthSessionVersion() !== context.version) return null;

      if (response.status === 429) {
        const retryAfter = response.headers?.get('Retry-After');
        const seconds = retryAfter ? Number(retryAfter) : NaN;
        const retryAt = retryAfter && !Number.isFinite(seconds) ? Date.parse(retryAfter) : NaN;
        const delay = Number.isFinite(seconds) ? seconds * 1000
          : Number.isFinite(retryAt) ? retryAt - Date.now() : 60000;
        refreshCooldown = { token: tokenAtStart, until: Date.now() + Math.max(1000, delay) };
        return null;
      }

      if (response.status === 401 || response.status === 403) {
        // Refresh token has expired, been revoked, or is invalid
        try {
          browserLocalStorage.removeItem('docmatrix_auth_token');
          browserLocalStorage.removeItem('docmatrix_refresh_token');
          browserLocalStorage.removeItem('docmatrix_auth_user');
          browserSessionStorage.removeItem('docmatrix_auth_token');
          browserSessionStorage.removeItem('docmatrix_refresh_token');
          browserSessionStorage.removeItem('docmatrix_auth_user');
          browserSessionStorage.removeItem('docmatrix-demo-session');
        } catch {}
        notifyAuthSessionChanged();
        return null;
      }
      if (!response.ok) return null;

      const data = await response.json();
      if (getStoredToken() !== tokenAtStart || getAuthSessionVersion() !== context.version) return null;
      if (data?.token) {
        const storage = browserLocalStorage.getItem('docmatrix_auth_token') && !browserSessionStorage.getItem('docmatrix_auth_token') ? browserLocalStorage : browserSessionStorage;
        storage.setItem('docmatrix_auth_token', data.token);
        if (data.user) {
          storage.setItem('docmatrix_auth_user', JSON.stringify(data.user));
          notifyAuthSessionChanged();
        }
        return data.token;
      }
      return null;
    } catch {
      return null;
    } finally {
      if (activeRefreshContext === context) {
        activeRefreshPromise = null;
        activeRefreshContext = null;
      }
    }
  });

  return activeRefreshPromise;
};

class ApiClient {
  private get transport() {
    return (globalThis as any)['fetch'];
  }

  private buildUrl(endpoint: string, params?: Record<string, any>): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    let fullUrl = `${getBaseUrl()}${cleanEndpoint}`;

    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      for (const [key, val] of Object.entries(params)) {
        if (val !== undefined && val !== null && val !== '') {
          searchParams.append(key, String(val));
        }
      }
      const qs = searchParams.toString();
      if (qs) {
        fullUrl += (fullUrl.includes('?') ? '&' : '?') + qs;
      }
    }

    return fullUrl;
  }

  private async request<T = any>(endpoint: string, method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE', body?: any, options?: RequestOptions): Promise<T> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let abort: () => void = () => {};
    const deadline = new Promise<never>((_, reject) => {
      abort = () => { controller.abort(); reject(new DOMException('Request cancelled.', 'AbortError')); };
      options?.signal?.addEventListener('abort', abort, { once: true });
      if (options?.signal?.aborted) abort();
      timer = setTimeout(() => { controller.abort(); reject(new Error('The request timed out. A save may have completed; check the record before retrying.')); }, options?.timeoutMs ?? 30000);
    });
    try {
      if (controller.signal.aborted) return await deadline;
      return await Promise.race([this.executeRequest<T>(endpoint, method, body, { ...options, signal: controller.signal }), deadline]);
    } finally { clearTimeout(timer!); options?.signal?.removeEventListener('abort', abort); }
  }

  private async executeRequest<T = any>(
    endpoint: string,
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    body?: any,
    options?: RequestOptions,
  ): Promise<T> {
    const url = this.buildUrl(endpoint, options?.params);
    const token = getStoredToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    };

    const reqConfig: any = {
      method,
      headers,
      signal: options?.signal,
      credentials: 'include',
    };

    if (body !== undefined && method !== 'GET') {
      reqConfig.body = JSON.stringify(body);
    }

    const httpFn = this.transport;
    if (!httpFn) {
      throw new Error('HTTP transport unavailable in current runtime.');
    }

    let response: Response;
    try {
      response = await httpFn(url, reqConfig);
    } catch (netErr: any) {
      throw new Error(`Failed to connect to DocMatrix API server (${url}): ${netErr.message || 'Network unreachable'}`);
    }

    // Auto-refresh token handling on 401
    const isAuthEndpoint = endpoint.includes('/auth/login') || endpoint.includes('/auth/platform-login') || endpoint.includes('/auth/refresh') || endpoint.includes('/auth/logout');
    if (response.status === 401 && !isAuthEndpoint && !options?._isRetry) {
      // A delayed 401 may belong to a token already refreshed or cleared by
      // another request. Reuse the replacement; never refresh a cleared session.
      const currentToken = getStoredToken();
      const newToken = token && currentToken
        ? (currentToken !== token ? currentToken : await requestNewAccessToken())
        : null;
      if (newToken) {
        return this.request<T>(endpoint, method, body, {
          ...options,
          headers: {
            ...(options?.headers || {}),
            Authorization: `Bearer ${newToken}`,
          },
          _isRetry: true,
        });
      }
    }

    if (!response.ok) {
      let errorMsg = `API request failed with status ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData?.message) {
          errorMsg = Array.isArray(errorData.message)
            ? errorData.message.join(', ')
            : String(errorData.message);
        }
      } catch {
        // Fall back to status text
      }
      const err: any = new Error(errorMsg);
      err.status = response.status;
      err.response = { status: response.status };
      throw err;
    }

    if (response.status === 204) {
      return {} as T;
    }

    if (options?.responseType === 'blob') return await response.blob() as T;
    return response.json();
  }

  getBlob(endpoint: string, signal?: AbortSignal): Promise<Blob> {
    return this.request<Blob>(endpoint, 'GET', undefined, { responseType: 'blob', signal });
  }

  async upload<T = any>(endpoint: string, data: FormData, onProgress: (value: number) => void, signal?: AbortSignal, retry = false): Promise<T> {
    const token = getStoredToken();
    const version = getAuthSessionVersion();
    try {
      return await new Promise<T>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const abort = () => xhr.abort();
        const fail = (message: string, status = 0) => reject(Object.assign(new Error(message), { status }));
        xhr.open('POST', this.buildUrl(endpoint));
        xhr.withCredentials = true;
        xhr.timeout = 120000;
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100)); };
        xhr.onloadend = () => signal?.removeEventListener('abort', abort);
        xhr.onerror = () => fail('Upload connection failed. Check the history before retrying.');
        xhr.ontimeout = () => fail('Upload timed out. Check the history before retrying.');
        xhr.onabort = () => fail('Upload cancelled.');
        xhr.onload = () => {
          if (getAuthSessionVersion() !== version) return fail('Session changed during upload.');
          let result: any;
          try { result = JSON.parse(xhr.responseText); } catch { return fail('Invalid upload response.', xhr.status); }
          if (xhr.status >= 200 && xhr.status < 300) resolve(result);
          else fail(Array.isArray(result.message) ? result.message.join(', ') : result.message || 'Upload failed.', xhr.status);
        };
        signal?.addEventListener('abort', abort, { once: true });
        if (signal?.aborted) { fail('Upload cancelled.'); return; }
        xhr.send(data);
      });
    } catch (error: any) {
      if (error.status === 401 && !retry && !signal?.aborted && getAuthSessionVersion() === version && token && getStoredToken()) {
        const refreshed = getStoredToken() !== token ? getStoredToken() : await requestNewAccessToken();
        if (refreshed) return this.upload(endpoint, data, onProgress, signal, true);
      }
      throw error;
    }
  }

  get<T = any>(endpoint: string, params?: Record<string, any>, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, 'GET', undefined, { ...options, params });
  }

  post<T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, 'POST', body, options);
  }

  put<T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, 'PUT', body, options);
  }

  patch<T = any>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, 'PATCH', body, options);
  }

  delete<T = any>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, 'DELETE', undefined, options);
  }

  async downloadBlob(endpoint: string): Promise<Blob> {
    const token = getStoredToken();
    const url = this.buildUrl(endpoint);
    const httpFn = this.transport;
    if (!httpFn) {
      throw new Error('HTTP transport unavailable in current runtime.');
    }
    const res = await httpFn(url, {
      method: 'GET',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      throw new Error(`Download failed (${res.status})`);
    }
    return res.blob();
  }
}

export const apiClient = new ApiClient();
