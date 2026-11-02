import { describe, it, expect } from 'vitest';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { TenantGuard } from './tenant.guard.js';

describe('TenantGuard', () => {
  const guard = new TenantGuard();

  function createMockContext(user: any): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  it('allows access if user has valid clinicId', () => {
    const ctx = createMockContext({
      id: 'u-1',
      clinicId: 'clinic-123',
      isPlatformAdmin: false,
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access if user is platform administrator even without clinicId', () => {
    const ctx = createMockContext({
      id: 'admin-1',
      clinicId: null,
      isPlatformAdmin: true,
    });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('rejects access with ForbiddenException if ordinary user has no clinicId', () => {
    const ctx = createMockContext({
      id: 'u-2',
      clinicId: null,
      isPlatformAdmin: false,
    });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('returns false if user is not present on request', () => {
    const ctx = createMockContext(null);
    expect(guard.canActivate(ctx)).toBe(false);
  });
});

