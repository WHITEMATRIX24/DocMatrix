import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface.js';

/**
 * Standard local development origins for React / Vite frontend tooling.
 */
export const DEFAULT_DEV_ORIGINS: readonly string[] = Object.freeze([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://localhost:3000',
]);

/**
 * Permitted HTTP methods for DocMatrix REST API.
 */
export const ALLOWED_HTTP_METHODS: readonly string[] = Object.freeze([
  'GET',
  'HEAD',
  'PUT',
  'PATCH',
  'POST',
  'DELETE',
  'OPTIONS',
]);

/**
 * Permitted HTTP headers for DocMatrix requests.
 */
export const ALLOWED_HTTP_HEADERS: readonly string[] = Object.freeze([
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'X-CSRF-Token',
  'Accept',
  'Origin',
]);

/**
 * Parses and validates an array of origins from a comma-separated string.
 * Trims whitespace, eliminates empty entries, and normalizes URLs to exact origin form (protocol + hostname + port).
 * Rejects invalid URLs or URLs with invalid protocols.
 */
export function parseCorsOrigins(rawOrigins?: string): string[] {
  if (!rawOrigins || typeof rawOrigins !== 'string') {
    return [];
  }

  const origins: string[] = [];

  for (const part of rawOrigins.split(',')) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    try {
      const parsed = new URL(trimmed);
      // Only permit http: and https: protocols
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        continue;
      }
      // Exact origin: protocol + '//' + host (includes port if non-default)
      const exactOrigin = parsed.origin;
      if (exactOrigin && !origins.includes(exactOrigin)) {
        origins.push(exactOrigin);
      }
    } catch {
      // Invalid URL format rejected
      continue;
    }
  }

  return origins;
}

/**
 * Resolves the active list of allowed origins based on environment.
 * If CORS_ALLOWED_ORIGINS is configured, uses it.
 * In development mode, falls back to safe local Vite origins.
 * In production mode, fails safely (returns empty array if unconfigured, blocking all cross-origin requests).
 */
export function getAllowedOrigins(
  rawEnvOrigins: string | undefined = process.env.CORS_ALLOWED_ORIGINS,
  nodeEnv: string = process.env.NODE_ENV || 'development',
): string[] {
  const configured = parseCorsOrigins(rawEnvOrigins);
  if (configured.length > 0) {
    return configured;
  }

  if (nodeEnv !== 'production') {
    return [...DEFAULT_DEV_ORIGINS];
  }

  // Production with no configured origins fails safely
  return [];
}

/**
 * Origin validation callback for NestJS / Express CORS middleware.
 * Implements strict exact origin matching rather than substring or wildcard matching.
 */
export function createCorsOriginValidator(allowedOrigins: string[]) {
  const allowedSet = new Set(allowedOrigins);

  return (
    requestOrigin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    // Requests without an Origin header (e.g., same-origin, curl, server-to-server, health checks)
    if (!requestOrigin) {
      return callback(null, true);
    }

    // Exact origin match
    if (allowedSet.has(requestOrigin)) {
      return callback(null, true);
    }

    // Origin rejected
    return callback(
      new Error(`CORS policy violation: Origin '${requestOrigin}' is not authorized.`),
      false,
    );
  };
}

/**
 * Generates the complete, secure CorsOptions configuration object for app.enableCors().
 */
export function getCorsOptions(
  rawEnvOrigins: string | undefined = process.env.CORS_ALLOWED_ORIGINS,
  nodeEnv: string = process.env.NODE_ENV || 'development',
): CorsOptions {
  const allowedOrigins = getAllowedOrigins(rawEnvOrigins, nodeEnv);

  return {
    origin: createCorsOriginValidator(allowedOrigins),
    methods: [...ALLOWED_HTTP_METHODS],
    allowedHeaders: [...ALLOWED_HTTP_HEADERS],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  };
}

