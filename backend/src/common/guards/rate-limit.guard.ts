import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { RateLimiterService } from '../services/rate-limiter.service.js';
import {
  SKIP_RATE_LIMIT_KEY,
  RATE_LIMIT_CONFIG_KEY,
  CustomRateLimitOptions,
} from '../decorators/rate-limit.decorator.js';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimiter: RateLimiterService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isSkipped = this.reflector.getAllAndOverride<boolean>(SKIP_RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isSkipped) {
      return true;
    }

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    const ip = this.rateLimiter.getClientIp(req);
    const path = req.path || req.url || '';

    // Check brute-force status on login route
    const isLogin = path.includes('/auth/login') || path.includes('/auth/platform-login');
    if (isLogin && req.method === 'POST') {
      const email = req.body?.email;
      if (email && typeof email === 'string') {
        const lockStatus = await this.rateLimiter.isLoginLocked(ip, email);
        if (lockStatus.locked) {
          if (res && typeof res.setHeader === 'function') {
            res.setHeader('Retry-After', String(lockStatus.retryAfterSeconds));
          }
          throw new HttpException(
            {
              statusCode: HttpStatus.TOO_MANY_REQUESTS,
              message: `Too many failed authentication attempts. Account access is temporarily restricted. Please try again in ${lockStatus.retryAfterSeconds} seconds.`,
              error: 'Too Many Requests',
              retryAfter: lockStatus.retryAfterSeconds,
            },
            HttpStatus.TOO_MANY_REQUESTS,
          );
        }
      }
    }

    // Determine limit and TTL
    const customConfig = this.reflector.getAllAndOverride<CustomRateLimitOptions>(
      RATE_LIMIT_CONFIG_KEY,
      [context.getHandler(), context.getClass()],
    );

    let limit = this.rateLimiter.defaultLimit;
    let ttlSeconds = this.rateLimiter.defaultTtlSeconds;

    const isSensitiveAuth =
      isLogin ||
      path.includes('/auth/register-clinic') ||
      path.includes('/auth/refresh') ||
      path.includes('/auth/change-password');

    if (customConfig) {
      limit = customConfig.limit;
      ttlSeconds = customConfig.ttlSeconds;
    } else if (isSensitiveAuth) {
      limit = this.rateLimiter.authLimit;
      ttlSeconds = 60; // 60-second window for sensitive auth
    }

    const rateKey = isSensitiveAuth ? `rl:auth:${ip}` : `rl:global:${ip}`;
    const result = await this.rateLimiter.consume(rateKey, limit, ttlSeconds);

    if (res && typeof res.setHeader === 'function') {
      res.setHeader('X-RateLimit-Limit', String(result.limit));
      res.setHeader('X-RateLimit-Remaining', String(result.remaining));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)));
    }

    if (!result.allowed) {
      if (res && typeof res.setHeader === 'function') {
        res.setHeader('Retry-After', String(result.retryAfterSeconds));
      }
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `API rate limit exceeded. Maximum permitted: ${result.limit} requests per ${ttlSeconds}s. Please retry in ${result.retryAfterSeconds} seconds.`,
          error: 'Too Many Requests',
          retryAfter: result.retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}

