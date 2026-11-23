import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { TenantGuard } from './tenant.guard.js';

describe('TenantGuard', () => {
  const guard = new TenantGuard(
    { clinic: { findUnique: async () => ({ status: 'ACTIVE' }) } } as any,
    new Reflector(),
  );

  function createMockContext(user: any): ExecutionContext {
    return {
      getClass: () => class {},
      getHandler: () => () => {},
      switchToHttp: () => ({
        getRequest: () => ({ user, method: 'GET' }),
      }),
    } as unknown as ExecutionContext;
  }

  it('allows access if user has valid clinicId', async () => {
    const ctx = createMockContext({
      id: 'u-1',
      clinicId: 'clinic-123',
      isPlatformAdmin: false,
    });
    expect(await guard.canActivate(ctx)).toBe(true);
  });

  it('rejects clinic access for platform administrators even without clinicId', async () => {
    const ctx = createMockContext({
      id: 'admin-1',
      clinicId: null,
      isPlatformAdmin: true,
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('rejects access with ForbiddenException if ordinary user has no clinicId', async () => {
    const ctx = createMockContext({
      id: 'u-2',
      clinicId: null,
      isPlatformAdmin: false,
    });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('returns false if user is not present on request', async () => {
    const ctx = createMockContext(null);
    expect(await guard.canActivate(ctx)).toBe(false);
  });
});
