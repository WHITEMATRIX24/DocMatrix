import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StaffRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator.js';
import { PLATFORM_ADMIN_KEY } from '../decorators/platform-admin.decorator.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { AuthenticatedUser } from '../decorators/current-user.decorator.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const isPlatformAdminOnly = this.reflector.getAllAndOverride<boolean>(PLATFORM_ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const requiredRoles = this.reflector.getAllAndOverride<StaffRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      return false;
    }

    if (isPlatformAdminOnly) {
      if (!user.isPlatformAdmin) {
        throw new ForbiddenException('Access restricted to DocMatrix Platform Administrators.');
      }
      return true;
    }

    if (user.isPlatformAdmin) {
      return true;
    }

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const hasRole = requiredRoles.includes(user.role as StaffRole);
    if (!hasRole) {
      throw new ForbiddenException(`Insufficient permissions for role ${user.role}. Required: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}

