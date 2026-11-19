/**
 * Centralized API Client for DocMatrix Backend
 * Connects to NestJS Backend at VITE_API_BASE_URL (defaults to http://localhost:3000)
 * Uses dynamic transport dispatch with automatic token refresh, concurrency protection, and CSRF defense.
 */

import { notifyAuthSessionChanged } from './authSession';

const getBaseUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string') {
    return envUrl.replace(/\/+$/, '');
  }
  return 'http://localhost:3000';
};

export const getStoredToken = (): string | null => {
  try {
    return sessionStorage.getItem('docmatrix_auth_token') || localStorage.getItem('docmatrix_auth_token');
  } catch {
    return null;
  }
};

interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, any>;
  signal?: AbortSignal;
  _isRetry?: boolean;
}

// Concurrency mutex to ensure only one refresh request runs at any time
let activeRefreshPromise: Promise<string | null> | null = null;
let refreshCooldown: { token: string | null; until: number } | null = null;

const requestNewAccessToken = async (): Promise<string | null> => {
  if (activeRefreshPromise) return activeRefreshPromise;
  if (refreshCooldown?.token === getStoredToken() && Date.now() < refreshCooldown.until) return null;

  activeRefreshPromise = (async () => {
    const tokenAtStart = getStoredToken();
    try {
      const httpFn = (globalThis as any)['fetch'];
      const url = `${getBaseUrl()}/auth/refresh`;

      const response = await httpFn(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        credentials: 'include',
        body: JSON.stringify({}),
      });

      if (getStoredToken() !== tokenAtStart) return null;

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
          localStorage.removeItem('docmatrix_auth_token');
          localStorage.removeItem('docmatrix_refresh_token');
          localStorage.removeItem('docmatrix_auth_user');
          sessionStorage.removeItem('docmatrix_auth_token');
          sessionStorage.removeItem('docmatrix_refresh_token');
          sessionStorage.removeItem('docmatrix_auth_user');
          sessionStorage.removeItem('docmatrix-demo-session');
        } catch {}
        notifyAuthSessionChanged();
        return null;
      }
      if (!response.ok) return null;

      const data = await response.json();
      if (getStoredToken() !== tokenAtStart) return null;
      if (data?.token) {
        const storage = sessionStorage.getItem('docmatrix_auth_token') ? sessionStorage : localStorage;
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
      activeRefreshPromise = null;
    }
  })();

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

  private async request<T = any>(
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

    return response.json();
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
}

export const apiClient = new ApiClient();
