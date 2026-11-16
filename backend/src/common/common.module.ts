import { Global, Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { RateLimiterService } from './services/rate-limiter.service.js';
import { AuditLogService } from './services/audit-log.service.js';
import { RateLimitGuard } from './guards/rate-limit.guard.js';
import { AllExceptionsFilter } from './filters/all-exceptions.filter.js';

@Global()
@Module({
  providers: [
    RateLimiterService,
    AuditLogService,
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
  exports: [RateLimiterService, AuditLogService],
})
export class CommonModule {}

