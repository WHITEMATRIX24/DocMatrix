import { describe, it, expect } from 'vitest';
import {
  parseCorsOrigins,
  getAllowedOrigins,
  createCorsOriginValidator,
  getCorsOptions,
  DEFAULT_DEV_ORIGINS,
} from './cors.config.js';

describe('CORS Security Configuration (SEC-001)', () => {
  describe('parseCorsOrigins', () => {
    it('returns empty array when raw input is undefined or empty', () => {
      expect(parseCorsOrigins(undefined)).toEqual([]);
      expect(parseCorsOrigins('')).toEqual([]);
      expect(parseCorsOrigins('   ')).toEqual([]);
    });

    it('parses and trims comma-separated list of origins', () => {
      const raw = 'http://localhost:5173, https://app.docmatrix.co.in , http://127.0.0.1:5173';
      const parsed = parseCorsOrigins(raw);
      expect(parsed).toEqual([
        'http://localhost:5173',
        'https://app.docmatrix.co.in',
        'http://127.0.0.1:5173',
      ]);
    });

    it('normalizes origins by stripping paths, trailing slashes, and query params', () => {
      const raw = 'https://app.docmatrix.co.in/dashboard/, https://api.docmatrix.co.in:8443/api?query=1';
      const parsed = parseCorsOrigins(raw);
      expect(parsed).toEqual([
        'https://app.docmatrix.co.in',
        'https://api.docmatrix.co.in:8443',
      ]);
    });

    it('rejects invalid origin strings and non-http/https protocols', () => {
      const raw = 'not-a-valid-url, ftp://invalidscheme.com, javascript:alert(1), https://valid.com';
      const parsed = parseCorsOrigins(raw);
      expect(parsed).toEqual(['https://valid.com']);
    });
  });

  describe('getAllowedOrigins (Environment fallback behavior)', () => {
    it('provides safe default local Vite origins in development mode when env is empty', () => {
      const devOrigins = getAllowedOrigins(undefined, 'development');
      expect(devOrigins).toEqual(DEFAULT_DEV_ORIGINS);
      expect(devOrigins).toContain('http://localhost:5173');
      expect(devOrigins).toContain('http://127.0.0.1:5173');
    });

    it('fails safely in production mode with empty allowlist if CORS_ALLOWED_ORIGINS is missing', () => {
      const prodOrigins = getAllowedOrigins(undefined, 'production');
      expect(prodOrigins).toEqual([]);
    });

    it('uses configured production origin when CORS_ALLOWED_ORIGINS is provided', () => {
      const prodOrigins = getAllowedOrigins('https://clinic.docmatrix.co.in', 'production');
      expect(prodOrigins).toEqual(['https://clinic.docmatrix.co.in']);
    });
  });

  describe('createCorsOriginValidator (Origin validation rules)', () => {
    const allowed = ['http://localhost:5173', 'https://app.docmatrix.co.in'];
    const validator = createCorsOriginValidator(allowed);

    it('allows requests with no Origin header (same-origin, curl, server-to-server)', () => {
      let allowedResult: boolean | undefined;
      let errorResult: Error | null = null;

      validator(undefined, (err, allow) => {
        errorResult = err;
        allowedResult = allow;
      });

      expect(errorResult).toBeNull();
      expect(allowedResult).toBe(true);
    });

    it('accepts approved local development origin', () => {
      let allowedResult: boolean | undefined;
      let errorResult: Error | null = null;

      validator('http://localhost:5173', (err, allow) => {
        errorResult = err;
        allowedResult = allow;
      });

      expect(errorResult).toBeNull();
      expect(allowedResult).toBe(true);
    });

    it('accepts approved production origin', () => {
      let allowedResult: boolean | undefined;
      let errorResult: Error | null = null;

      validator('https://app.docmatrix.co.in', (err, allow) => {
        errorResult = err;
        allowedResult = allow;
      });

      expect(errorResult).toBeNull();
      expect(allowedResult).toBe(true);
    });

    it('rejects unknown external origins with a clear CORS error', () => {
      let allowedResult: boolean | undefined;
      let errorResult: any = null;

      validator('https://evil.attacker.com', (err, allow) => {
        errorResult = err;
        allowedResult = allow;
      });

      expect(errorResult).toBeInstanceOf(Error);
      expect(errorResult?.message).toContain("Origin 'https://evil.attacker.com' is not authorized");
      expect(allowedResult).toBe(false);
    });

    it('rejects lookalike prefix / suffix origin attacks (prevents substring matching)', () => {
      const lookalikes = [
        'http://localhost:5173.attacker.com',
        'https://app.docmatrix.co.in.evil.com',
        'http://attacker-localhost:5173',
        'https://fake-app.docmatrix.co.in',
      ];

      for (const lookalike of lookalikes) {
        let allowedResult: boolean | undefined;
        let errorResult: Error | null = null;

        validator(lookalike, (err, allow) => {
          errorResult = err;
          allowedResult = allow;
        });

        expect(errorResult).toBeInstanceOf(Error);
        expect(allowedResult).toBe(false);
      }
    });
  });

  describe('getCorsOptions', () => {
    it('returns options with credentials: true and methods matching DocMatrix requirements', () => {
      const options = getCorsOptions('http://localhost:5173', 'development');
      expect(options.credentials).toBe(true);
      expect(options.methods).toContain('GET');
      expect(options.methods).toContain('POST');
      expect(options.methods).toContain('PUT');
      expect(options.methods).toContain('PATCH');
      expect(options.methods).toContain('DELETE');
      expect(options.methods).toContain('OPTIONS');
      expect(options.allowedHeaders).toContain('Authorization');
      expect(options.allowedHeaders).toContain('Content-Type');
      expect(options.optionsSuccessStatus).toBe(204);
      expect(typeof options.origin).toBe('function');
    });
  });
});

