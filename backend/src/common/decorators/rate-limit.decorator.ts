import { SetMetadata } from '@nestjs/common';

export const SKIP_RATE_LIMIT_KEY = 'skipRateLimit';
export const SkipRateLimit = () => SetMetadata(SKIP_RATE_LIMIT_KEY, true);

export const RATE_LIMIT_CONFIG_KEY = 'rateLimitConfig';
export interface CustomRateLimitOptions {
  limit: number;
  ttlSeconds: number;
}
export const RateLimit = (options: CustomRateLimitOptions) =>
  SetMetadata(RATE_LIMIT_CONFIG_KEY, options);

