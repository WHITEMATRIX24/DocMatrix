import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { RateLimiterService } from '../src/common/services/rate-limiter.service.js';
import { RateLimitGuard } from '../src/common/guards/rate-limit.guard.js';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.js';
import {
  MalwareScannerService,
  AntivirusScannerAdapter,
} from '../src/storage/malware-scanner.service.js';
import { AuditLogService } from '../src/common/services/audit-log.service.js';
import { MemoryRateLimitStore } from '../src/common/services/memory-rate-limit.store.js';
import { Reflector } from '@nestjs/core';

describe('Security Phases 4 & 5 Hardening Verification', () => {
  describe('1. Shared Rate Limiting & Store Abstraction', () => {
    let rateLimiter: RateLimiterService;
    let store: MemoryRateLimitStore;

    beforeEach(() => {
      rateLimiter = new RateLimiterService();
      store = new MemoryRateLimitStore();
      rateLimiter.setStore(store);
    });

    afterEach(async () => {
      await rateLimiter.onModuleDestroy();
    });

    it('store atomically increments counters and computes remaining TTL', async () => {
      const res1 = await store.increment('test:atomic:key', 60);
      expect(res1.count).toBe(1);
      expect(res1.ttlRemainingSeconds).toBeGreaterThan(0);

      const res2 = await store.increment('test:atomic:key', 60);
      expect(res2.count).toBe(2);

      const current = await store.get('test:atomic:key');
      expect(current?.count).toBe(2);

      await store.delete('test:atomic:key');
      const afterDelete = await store.get('test:atomic:key');
      expect(afterDelete).toBeNull();
    });

    it('handles concurrent increments without race conditions', async () => {
      const key = 'test:concurrency:key';
      const increments = Array.from({ length: 25 }, () => store.increment(key, 60));
      const results = await Promise.all(increments);

      const finalCount = Math.max(...results.map((r) => r.count));
      expect(finalCount).toBe(25);
      const retrieved = await store.get(key);
      expect(retrieved?.count).toBe(25);
    });

    it('enforces rate limits and sets retryAfterSeconds when exceeded', async () => {
      const key = 'test:rate:limit';
      const limit = 3;
      const ttl = 60;

      const r1 = await rateLimiter.consume(key, limit, ttl);
      expect(r1.allowed).toBe(true);
      expect(r1.remaining).toBe(2);

      const r2 = await rateLimiter.consume(key, limit, ttl);
      expect(r2.allowed).toBe(true);
      expect(r2.remaining).toBe(1);

      const r3 = await rateLimiter.consume(key, limit, ttl);
      expect(r3.allowed).toBe(true);
      expect(r3.remaining).toBe(0);

      const r4 = await rateLimiter.consume(key, limit, ttl);
      expect(r4.allowed).toBe(false);
      expect(r4.retryAfterSeconds).toBeGreaterThan(0);
      expect(r4.remaining).toBe(0);
    });
  });

  describe('2. Trusted Proxy & Client IP Security', () => {
    let rateLimiter: RateLimiterService;

    beforeEach(() => {
      rateLimiter = new RateLimiterService();
    });

    afterEach(async () => {
      await rateLimiter.onModuleDestroy();
    });

    it('normalizes IPv4, IPv6 loopback, and IPv4-mapped IPv6 addresses safely', () => {
      expect(rateLimiter.normalizeIp('::1')).toBe('127.0.0.1');
      expect(rateLimiter.normalizeIp('::ffff:192.168.1.50')).toBe('192.168.1.50');
      expect(rateLimiter.normalizeIp('192.168.1.1:8080')).toBe('192.168.1.1');
      expect(rateLimiter.normalizeIp('[2001:db8::1]:443')).toBe('2001:db8::1');
    });

    it('groups IPv6 addresses by /64 subnet prefix to prevent subnet rotation bypass', () => {
      const ip1 = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';
      const ip2 = '2001:0db8:85a3:0000:ffff:ffff:ffff:ffff';
      const ipDifferentSubnet = '2001:0db8:85a3:0001:0000:8a2e:0370:7334';

      const prefix1 = rateLimiter.getIpSubnetPrefix(ip1);
      const prefix2 = rateLimiter.getIpSubnetPrefix(ip2);
      const prefixDiff = rateLimiter.getIpSubnetPrefix(ipDifferentSubnet);

      expect(prefix1).toBe('2001:0db8:85a3:0000::/64');
      expect(prefix2).toBe('2001:0db8:85a3:0000::/64');
      expect(prefix1).toBe(prefix2);
      expect(prefix1).not.toBe(prefixDiff);

      // IPv4 should return the normalized address unchanged
      expect(rateLimiter.getIpSubnetPrefix('198.51.100.25')).toBe('198.51.100.25');
    });

    it('extracts framework-verified client IP from Express request', () => {
      const mockReq = {
        ip: '::ffff:203.0.113.195',
        socket: { remoteAddress: '10.0.0.1' },
      };
      expect(rateLimiter.getClientIp(mockReq as any)).toBe('203.0.113.195');

      const directReq = {
        socket: { remoteAddress: '198.51.100.10' },
      };
      expect(rateLimiter.getClientIp(directReq as any)).toBe('198.51.100.10');
    });
  });

  describe('3. Safer Login Brute-Force & Denial-of-Service Resistance', () => {
    let rateLimiter: RateLimiterService;

    beforeEach(() => {
      rateLimiter = new RateLimiterService();
    });

    afterEach(async () => {
      await rateLimiter.onModuleDestroy();
    });

    it('locks out offending IP for targeted account without locking legitimate user on different IP', async () => {
      const attackerIp = '198.51.100.99';
      const doctorLegitIp = '203.0.113.10';
      const victimEmail = 'dr.smith@docmatrix.test';

      // Attacker attempts 5 wrong passwords
      for (let i = 1; i <= 4; i++) {
        const res = await rateLimiter.recordFailedLogin(attackerIp, victimEmail);
        expect(res.locked).toBe(false);
      }
      const attackerLock = await rateLimiter.recordFailedLogin(attackerIp, victimEmail);
      expect(attackerLock.locked).toBe(true);

      // Verify attacker is locked out
      const attackerCheck = await rateLimiter.isLoginLocked(attackerIp, victimEmail);
      expect(attackerCheck.locked).toBe(true);
      expect(attackerCheck.retryAfterSeconds).toBeGreaterThan(0);

      // CRITICAL: Legitimate doctor from clinic IP is NOT locked out!
      const doctorCheck = await rateLimiter.isLoginLocked(doctorLegitIp, victimEmail);
      expect(doctorCheck.locked).toBe(false);
      expect(doctorCheck.retryAfterSeconds).toBe(0);
    });

    it('successful login clears targeted brute-force lockout record', async () => {
      const ip = '198.51.100.55';
      const email = 'admin@docmatrix.test';

      for (let i = 0; i < 5; i++) {
        await rateLimiter.recordFailedLogin(ip, email);
      }
      expect((await rateLimiter.isLoginLocked(ip, email)).locked).toBe(true);

      // Correct password authenticated
      await rateLimiter.recordSuccessfulLogin(ip, email);
      expect((await rateLimiter.isLoginLocked(ip, email)).locked).toBe(false);
    });
  });

  describe('4. RateLimitGuard & Header Verification', () => {
    let guard: RateLimitGuard;
    let rateLimiter: RateLimiterService;
    let reflector: Reflector;

    beforeEach(() => {
      rateLimiter = new RateLimiterService();
      reflector = new Reflector();
      guard = new RateLimitGuard(reflector, rateLimiter);
    });

    afterEach(async () => {
      await rateLimiter.onModuleDestroy();
    });

    it('injects standard rate-limit headers on allowed requests', async () => {
      const headers: Record<string, any> = {};
      const mockContext: any = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            ip: '127.0.0.1',
            originalUrl: '/patients',
            route: { path: '/patients' },
            method: 'GET',
          }),
          getResponse: () => ({
            setHeader: (k: string, v: any) => {
              headers[k] = v;
            },
          }),
        }),
      };

      const allowed = await guard.canActivate(mockContext);
      expect(allowed).toBe(true);
      expect(headers['X-RateLimit-Limit']).toBeDefined();
      expect(headers['X-RateLimit-Remaining']).toBeDefined();
      expect(headers['X-RateLimit-Reset']).toBeDefined();
    });

    it('throws 429 with Retry-After when sensitive auth rate limit is exceeded', async () => {
      const headers: Record<string, any> = {};
      const mockContext: any = {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
          getRequest: () => ({
            ip: '192.0.2.77',
            path: '/auth/login',
            originalUrl: '/auth/login',
            route: { path: '/auth/login' },
            method: 'POST',
            body: { email: 'user@example.com' },
          }),
          getResponse: () => ({
            setHeader: (k: string, v: any) => {
              headers[k] = v;
            },
          }),
        }),
      };

      for (let i = 0; i < 5; i++) {
        expect(await guard.canActivate(mockContext)).toBe(true);
      }

      try {
        await guard.canActivate(mockContext);
        expect.fail('Should have thrown 429');
      } catch (err: any) {
        expect(err).toBeInstanceOf(HttpException);
        expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect(headers['Retry-After']).toBeDefined();
      }
    });
  });

  describe('5. Malware Scanner Hardening & Antivirus Adapter', () => {
    let scanner: MalwareScannerService;

    beforeEach(() => {
      scanner = new MalwareScannerService();
    });

    it('accepts clean legitimate PDF and JPEG buffers', async () => {
      const cleanPdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');
      const cleanJpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

      const resPdf = await scanner.scanBuffer(cleanPdf, 'xray.pdf');
      expect(resPdf.isClean).toBe(true);

      const resJpeg = await scanner.scanBuffer(cleanJpeg, 'photo.jpg');
      expect(resJpeg.isClean).toBe(true);
    });

    it('rejects EICAR test signature with BadRequestException', async () => {
      const eicar = Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*');
      await expect(scanner.scanBuffer(eicar, 'test-eicar.com')).rejects.toThrow(BadRequestException);
    });

    it('rejects disguised webshell and polyglot payloads', async () => {
      const phpShell = Buffer.from('GIF89a<?php passthru($_GET["cmd"]); ?>');
      await expect(scanner.scanBuffer(phpShell, 'avatar.gif')).rejects.toThrow(BadRequestException);

      const polyglotExe = Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        Buffer.from('MZ\x90\x00This program cannot be run in DOS mode'),
      ]);
      await expect(scanner.scanBuffer(polyglotExe, 'image.png')).rejects.toThrow(BadRequestException);
    });

    it('rejects file when ClamAV adapter detects infected stream', async () => {
      const mockClamAv: AntivirusScannerAdapter = {
        scanStream: async () => ({ isClean: false, threatName: 'Win.Trojan.Generic-10492' }),
      };
      scanner.setAdapter(mockClamAv);

      const sample = Buffer.from('some infected binary content');
      await expect(scanner.scanBuffer(sample, 'report.pdf')).rejects.toThrow(BadRequestException);
    });

    it('handles ClamAV scanner unavailable in strict mode by failing closed (ServiceUnavailableException)', async () => {
      const failingAdapter: AntivirusScannerAdapter = {
        scanStream: async () => {
          throw new Error('Connection refused to ClamAV daemon on 127.0.0.1:3310');
        },
      };
      scanner.setAdapter(failingAdapter);

      // In strict mode (SCANNER_REQUIRED=true or production)
      const prevEnv = process.env.SCANNER_REQUIRED;
      process.env.SCANNER_REQUIRED = 'true';

      try {
        const sample = Buffer.from('clean content but scanner down');
        await expect(scanner.scanBuffer(sample, 'doc.pdf')).rejects.toThrow(ServiceUnavailableException);
      } finally {
        process.env.SCANNER_REQUIRED = prevEnv;
      }
    });
  });

  describe('6. Durable Audit Logging & Redaction', () => {
    let auditLog: AuditLogService;

    beforeEach(() => {
      auditLog = new AuditLogService();
    });

    it('redacts sensitive credentials, tokens, credit cards, and national IDs from metadata', () => {
      const clinicId = `audit-test-${Date.now()}`;
      const event = auditLog.recordEvent({
        clinicId,
        module: 'Security',
        action: 'CREDENTIAL_UPDATE',
        actorId: 'user-100',
        actorRole: 'ADMIN',
        description: 'Updated user credentials',
        metadata: {
          password: 'SuperSecretPassword!',
          refreshToken: 'refresh-token-xyz',
          apiKey: 'key-987654321',
          creditCard: '4111222233334444',
          ssn: '000-12-3456',
          aadhaar: '1234-5678-9012',
          bearerToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummyPayload',
          publicInfo: 'safeToLog',
        },
      });

      expect(event.metadata?.password).toBe('[REDACTED]');
      expect(event.metadata?.refreshToken).toBe('[REDACTED]');
      expect(event.metadata?.apiKey).toBe('[REDACTED]');
      expect(event.metadata?.creditCard).toBe('[REDACTED]');
      expect(event.metadata?.ssn).toBe('[REDACTED]');
      expect(event.metadata?.aadhaar).toBe('[REDACTED]');
      expect(event.metadata?.bearerToken).toBe('[REDACTED_JWT]');
      expect(event.metadata?.publicInfo).toBe('safeToLog');
    });

    it('durable JSONL archive preserves audit events without arbitrary truncation', () => {
      const clinicId = `audit-durable-${Date.now()}`;

      // Write 5 distinct events
      for (let i = 1; i <= 5; i++) {
        auditLog.recordEvent({
          clinicId,
          module: 'Billing',
          action: `INVOICE_EVENT_${i}`,
          description: `Event number ${i}`,
        });
      }

      const durableHistory = auditLog.getDurableHistory(clinicId);
      expect(durableHistory.length).toBe(5);
      expect(durableHistory[0].action).toBe('INVOICE_EVENT_1');
      expect(durableHistory[4].action).toBe('INVOICE_EVENT_5');

      const recentUI = auditLog.getEvents(clinicId);
      expect(recentUI.length).toBe(5);
      // Most recent first in UI cache
      expect(recentUI[0].action).toBe('INVOICE_EVENT_5');
    });
  });

  describe('7. AllExceptionsFilter Sensitive Leak Prevention', () => {
    let filter: AllExceptionsFilter;

    beforeEach(() => {
      filter = new AllExceptionsFilter();
    });

    it('maps Prisma P2002 to 409 Conflict without leaking database schema details', () => {
      let status: number | undefined;
      let body: any;

      const mockHost: any = {
        switchToHttp: () => ({
          getRequest: () => ({ url: '/auth/register', method: 'POST' }),
          getResponse: () => ({
            status: (s: number) => {
              status = s;
              return { json: (b: any) => (body = b) };
            },
          }),
        }),
      };

      const err: any = new Error('Unique constraint failed on email');
      err.code = 'P2002';
      filter.catch(err, mockHost);

      expect(status).toBe(409);
      expect(body.statusCode).toBe(409);
      expect(body.error).toBe('Conflict');
      expect(body.message).toContain('A record with this identifier already exists');
      expect(body.stack).toBeUndefined();
    });

    it('masks database connection errors as generic 500 without leaking connection string', () => {
      let status: number | undefined;
      let body: any;

      const mockHost: any = {
        switchToHttp: () => ({
          getRequest: () => ({ url: '/billing/invoices', method: 'GET' }),
          getResponse: () => ({
            status: (s: number) => {
              status = s;
              return { json: (b: any) => (body = b) };
            },
          }),
        }),
      };

      const unhandled = new Error('FATAL: password authentication failed for user "neon_admin" at neon.tech');
      filter.catch(unhandled, mockHost);

      expect(status).toBe(500);
      expect(body.message).toContain('An internal server error occurred');
      expect(body.stack).toBeUndefined();
      expect(JSON.stringify(body)).not.toContain('neon_admin');
    });
  });
});

