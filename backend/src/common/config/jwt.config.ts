import { CookieOptions, Response } from 'express';

/**
 * Pinned symmetric HMAC-SHA256 signing algorithm for all DocMatrix JWT tokens.
 */
export const JWT_ALGORITHM = 'HS256' as const;

/**
 * Standard expiration lifetimes for access and refresh tokens.
 * Access tokens are short-lived (15 minutes default).
 * Refresh tokens are valid for up to 7 days with mandatory rotation.
 */
export const DEFAULT_ACCESS_TOKEN_EXPIRATION = '15m';
export const DEFAULT_REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 604800 seconds (7 days)

export const REFRESH_COOKIE_NAME = 'docmatrix_refresh_token';

/**
 * List of known unsafe default or placeholder secrets that must never be permitted.
 */
export const KNOWN_UNSAFE_SECRETS: readonly string[] = Object.freeze([
  'docmatrix_jwt_development_secret_key_2026',
  'docmatrix-dev-secret-key-change-in-prod',
  'secret',
  'jwtsecret',
  'jwt_secret',
  'password',
  '12345678',
  'changeme',
]);

/**
 * Validates the JWT_SECRET environment variable.
 * Enforces presence, non-emptiness, rejection of known unsafe fallbacks, and a minimum key length.
 * CRITICAL: The secret value is never printed or included in error messages.
 */
export function validateJwtSecret(secret?: string): string {
  if (secret === undefined || secret === null) {
    throw new Error(
      'JWT Configuration Fatal Error: JWT_SECRET environment variable is missing. ' +
      'An explicitly configured secret is required in all environments.',
    );
  }

  if (typeof secret !== 'string' || secret.trim().length === 0) {
    throw new Error(
      'JWT Configuration Fatal Error: JWT_SECRET environment variable is empty. ' +
      'An explicitly configured secret is required in all environments.',
    );
  }

  const trimmed = secret.trim();

  if (KNOWN_UNSAFE_SECRETS.includes(trimmed.toLowerCase())) {
    throw new Error(
      'JWT Configuration Fatal Error: JWT_SECRET is set to a known unsafe default fallback. ' +
      'A secure, unique signing secret must be provided.',
    );
  }

  if (trimmed.length < 16) {
    throw new Error(
      'JWT Configuration Fatal Error: JWT_SECRET must be at least 16 characters long for cryptographic security.',
    );
  }

  return trimmed;
}

/**
 * Returns the validated JWT signing secret from process.env.
 * Throws a fatal Error if missing or unsafe.
 */
export function getJwtSecret(): string {
  return validateJwtSecret(process.env.JWT_SECRET);
}

/**
 * Returns the access token expiration string (e.g. '15m').
 */
export function getJwtAccessExpiration(): any {
  return (process.env.JWT_ACCESS_EXPIRATION?.trim() || DEFAULT_ACCESS_TOKEN_EXPIRATION) as any;
}

/**
 * Returns the refresh token TTL in seconds (default: 7 days).
 */
export function getJwtRefreshTtlSeconds(): number {
  const envVal = process.env.JWT_REFRESH_EXPIRATION_SECONDS;
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_REFRESH_TOKEN_TTL_SECONDS;
}

/**
 * Extracts a cookie value by name from a raw Cookie header string.
 */
export function extractCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader || typeof cookieHeader !== 'string') return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Sets an HttpOnly, scoped refresh token cookie on the outgoing response.
 */
export function setRefreshCookie(res: Response, refreshToken: string, nodeEnv = process.env.NODE_ENV): void {
  if (!res || typeof res.cookie !== 'function') return;
  const isProd = nodeEnv === 'production';
  const cookiePath = process.env.COOKIE_PATH || '/auth';
  const cookieOptions: CookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: cookiePath,
    maxAge: DEFAULT_REFRESH_TOKEN_TTL_SECONDS * 1000,
  };
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions);
}

/**
 * Clears the refresh token cookie.
 */
export function clearRefreshCookie(res: Response, nodeEnv = process.env.NODE_ENV): void {
  if (!res || typeof res.clearCookie !== 'function') return;
  const isProd = nodeEnv === 'production';
  const cookiePath = process.env.COOKIE_PATH || '/auth';
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: cookiePath,
  });
}
