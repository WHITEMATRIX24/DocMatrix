import { Injectable, Logger, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import type { Request } from 'express';
import { RateLimitStore } from './rate-limit-store.interface.js';
import { MemoryRateLimitStore } from './memory-rate-limit.store.js';
import { RedisRateLimitStore } from './redis-rate-limit.store.js';

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  resetAt: number;
}

export interface LoginLockResult {
  locked: boolean;
  retryAfterSeconds: number;
  reason?: 'ip_account_lockout' | 'distributed_attack_protection';
}

@Injectable()
export class RateLimiterService implements OnModuleDestroy {
  private readonly logger = new Logger(RateLimiterService.name);
  private store: RateLimitStore;
  private readonly isMultiInstanceProduction: boolean;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    const storeType = process.env.RATE_LIMIT_STORE?.toLowerCase();
    this.isMultiInstanceProduction = process.env.NODE_ENV === 'production' && (storeType === 'redis' || !!redisUrl);

    if (redisUrl || storeType === 'redis') {
      if (redisUrl) {
        this.logger.log('Initializing Redis rate-limit store for multi-instance backend deployment.');
        this.store = new RedisRateLimitStore(redisUrl);
      } else {
        this.logger.warn('RATE_LIMIT_STORE is set to "redis" but REDIS_URL is not defined. Falling back to memory with warning.');
        this.store = new MemoryRateLimitStore();
      }
    } else {
      this.logger.log('Initializing in-memory rate-limit store (Local/Single-instance mode).');
      this.store = new MemoryRateLimitStore();
    }
  }

  /**
   * Allows injecting a custom store for testing.
   */
  setStore(customStore: RateLimitStore): void {
    this.store = customStore;
  }

  getStoreName(): string {
    return this.store.name;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.store) {
      await this.store.destroy();
    }
  }

  // Configuration getters with safe defaults
  get defaultTtlSeconds(): number {
    const val = parseInt(process.env.THROTTLE_TTL || '60', 10);
    return isNaN(val) || val <= 0 ? 60 : val;
  }

  get defaultLimit(): number {
    const val = parseInt(process.env.THROTTLE_LIMIT || '100', 10);
    return isNaN(val) || val <= 0 ? 100 : val;
  }

  get authLimit(): number {
    const val = parseInt(process.env.THROTTLE_AUTH_LIMIT || '5', 10);
    return isNaN(val) || val <= 0 ? 5 : val;
  }

  get bruteForceMaxFailures(): number {
    const val = parseInt(process.env.BRUTE_FORCE_MAX_FAILURES || '5', 10);
    return isNaN(val) || val <= 0 ? 5 : val;
  }

  get bruteForceLockoutSeconds(): number {
    const val = parseInt(process.env.BRUTE_FORCE_LOCKOUT_SECONDS || '900', 10);
    return isNaN(val) || val <= 0 ? 900 : val; // 15 minutes default
  }

  /**
   * Normalizes an IP address, handling IPv6 mapped IPv4 and loopbacks safely.
   */
  normalizeIp(rawIp?: string | null): string {
    if (!rawIp || typeof rawIp !== 'string') return '127.0.0.1';
    let ip = rawIp.trim().toLowerCase();

    // Handle bracketed IPv6 with port e.g. [2001:db8::1]:443
    if (ip.startsWith('[') && ip.includes(']:')) {
      ip = ip.substring(1, ip.indexOf(']:'));
    }

    // Strip port if present in IPv4 (e.g. 1.2.3.4:5678)
    if (ip.includes('.') && ip.includes(':')) {
      const parts = ip.split(':');
      if (parts.length === 2) {
        ip = parts[0];
      }
    }

    // Convert IPv6 loopback
    if (ip === '::1') return '127.0.0.1';

    // Convert IPv4-mapped IPv6 (::ffff:192.168.1.1)
    if (ip.startsWith('::ffff:')) {
      ip = ip.substring(7);
    }

    // Strip brackets
    ip = ip.replace(/^\[|\]$/g, '');

    return ip || '127.0.0.1';
  }

  /**
   * Groups IPv6 addresses by /64 subnet prefix to prevent rate-limit evasion
   * by rotating among billions of host addresses within a single allocation.
   */
  getIpSubnetPrefix(ip: string): string {
    const normalized = this.normalizeIp(ip);
    if (normalized.includes(':')) {
      const parts = normalized.split(':');
      // IPv6 /64 prefix is the first 4 hextets
      const prefix = parts.slice(0, 4).join(':');
      return `${prefix}::/64`;
    }
    return normalized;
  }

  /**
   * Safely extracts client IP from request, relying on Express's framework-verified
   * `req.ip` (governed by configured `trust proxy`).
   */
  getClientIp(req: Request): string {
    // When trust proxy is configured on Express, req.ip is the verified client IP.
    const socketIp = (req as any).ip || req.socket?.remoteAddress;
    return this.normalizeIp(socketIp);
  }

  /**
   * Consumes a rate limit point for the specified key within the TTL window.
   */
  async consume(key: string, limit: number, ttlSeconds: number): Promise<RateLimitResult> {
    const now = Date.now();

    try {
      const res = await this.store.increment(key, ttlSeconds);
      const remaining = Math.max(0, limit - res.count);
      const resetAt = now + res.ttlRemainingSeconds * 1000;

      if (res.count > limit) {
        return {
          allowed: false,
          limit,
          remaining: 0,
          retryAfterSeconds: Math.max(1, res.ttlRemainingSeconds),
          resetAt,
        };
      }

      return {
        allowed: true,
        limit,
        remaining,
        retryAfterSeconds: 0,
        resetAt,
      };
    } catch (err: any) {
      if (this.isMultiInstanceProduction) {
        this.logger.error(`CRITICAL: Shared rate-limit store failure in multi-instance production: ${err.message}`);
        if (process.env.RATE_LIMIT_FAIL_CLOSED === 'true') {
          throw new ServiceUnavailableException('Rate-limiting infrastructure unavailable. Request rejected.');
        }
      } else {
        this.logger.warn(`Rate-limit store error (local fallback): ${err.message}`);
      }

      // Safe fallback under non-production or default fail-open policy
      return {
        allowed: true,
        limit,
        remaining: 1,
        retryAfterSeconds: 0,
        resetAt: now + ttlSeconds * 1000,
      };
    }
  }

  /**
   * Safer Login Brute-Force Check:
   * Protects against Denial-of-Service lockout abuse.
   * Locks out the offending IP+Account tuple, NOT the legitimate user's entire account from all IPs.
   */
  async isLoginLocked(ip: string, email: string): Promise<LoginLockResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const ipPrefix = this.getIpSubnetPrefix(ip);
    const ipAccountKey = `bf:ip_acc:${ipPrefix}:${normalizedEmail}`;
    const accountKey = `bf:acc:${normalizedEmail}`;

    try {
      // 1. Check if this specific IP prefix is locked out for this account
      const ipLock = await this.store.get(ipAccountKey);
      if (ipLock && ipLock.count >= this.bruteForceMaxFailures && ipLock.ttlRemainingSeconds > 0) {
        return {
          locked: true,
          retryAfterSeconds: ipLock.ttlRemainingSeconds,
          reason: 'ip_account_lockout',
        };
      }

      // 2. Check for distributed attack across many IPs (>20 failures in 15 mins)
      const globalAccount = await this.store.get(accountKey);
      const distributedThreshold = this.bruteForceMaxFailures * 4; // e.g. 20 attempts
      if (globalAccount && globalAccount.count >= distributedThreshold && globalAccount.ttlRemainingSeconds > 0) {
        return {
          locked: true,
          retryAfterSeconds: globalAccount.ttlRemainingSeconds,
          reason: 'distributed_attack_protection',
        };
      }

      return { locked: false, retryAfterSeconds: 0 };
    } catch (err: any) {
      this.logger.error(`Failed to check login lock status: ${err.message}`);
      return { locked: false, retryAfterSeconds: 0 };
    }
  }

  /**
   * Records a failed login attempt and applies a targeted lockout to the offending IP.
   */
  async recordFailedLogin(ip: string, email: string): Promise<LoginLockResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const ipPrefix = this.getIpSubnetPrefix(ip);
    const ipAccountKey = `bf:ip_acc:${ipPrefix}:${normalizedEmail}`;
    const accountKey = `bf:acc:${normalizedEmail}`;
    const lockoutTtl = this.bruteForceLockoutSeconds;

    try {
      // Increment failures for this specific IP+Account
      const ipResult = await this.store.increment(ipAccountKey, lockoutTtl);

      // Increment global account failure counter
      const accResult = await this.store.increment(accountKey, lockoutTtl);

      if (ipResult.count >= this.bruteForceMaxFailures) {
        this.logger.warn(
          `Security Notice: Brute-force threshold (${ipResult.count}) exceeded for IP ${ipPrefix} on account ${normalizedEmail}. Targeted lockout active for ${ipResult.ttlRemainingSeconds}s.`,
        );
        return {
          locked: true,
          retryAfterSeconds: ipResult.ttlRemainingSeconds,
          reason: 'ip_account_lockout',
        };
      }

      const distributedThreshold = this.bruteForceMaxFailures * 4;
      if (accResult.count >= distributedThreshold) {
        this.logger.warn(
          `Security Notice: Distributed credential attack detected on account ${normalizedEmail} (${accResult.count} failures). Temporary global protection active.`,
        );
        return {
          locked: true,
          retryAfterSeconds: accResult.ttlRemainingSeconds,
          reason: 'distributed_attack_protection',
        };
      }

      return { locked: false, retryAfterSeconds: 0 };
    } catch (err: any) {
      this.logger.error(`Failed to record failed login: ${err.message}`);
      return { locked: false, retryAfterSeconds: 0 };
    }
  }

  /**
   * Successful login clears the failure records for this IP and account.
   */
  async recordSuccessfulLogin(ip: string, email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const ipPrefix = this.getIpSubnetPrefix(ip);
    const ipAccountKey = `bf:ip_acc:${ipPrefix}:${normalizedEmail}`;
    const accountKey = `bf:acc:${normalizedEmail}`;

    try {
      await this.store.delete(ipAccountKey);
      await this.store.delete(accountKey);
    } catch (err: any) {
      this.logger.warn(`Failed to clear brute-force records on successful login: ${err.message}`);
    }
  }
}
