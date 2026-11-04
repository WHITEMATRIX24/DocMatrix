/**
 * Centralized API Client for DocMatrix Backend
 * Connects to NestJS Backend at VITE_API_BASE_URL (defaults to http://localhost:3000)
 * Uses dynamic transport dispatch to support full browser HTTP communication.
 */

const getBaseUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string') {
    return envUrl.replace(/\/+$/, '');
  }
  return 'http://localhost:3000';
};

const getStoredToken = (): string | null => {
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
}

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
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    };

    const reqConfig: any = {
      method,
      headers,
      signal: options?.signal,
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

