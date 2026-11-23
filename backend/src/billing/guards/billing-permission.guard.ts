import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BILLING_PERMISSIONS_KEY } from '../decorators/billing-permission.decorator.js';
import {
  BillingPermission,
  hasBillingPermission,
} from '../billing-permissions.policy.js';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';

@Injectable()
export class BillingPermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<BillingPermission[]>(
      BILLING_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If endpoint has no specific billing permissions attached, permit execution
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      throw new UnauthorizedException('Authentication required to access billing services.');
    }

    if (user.isPlatformAdmin) {
      throw new ForbiddenException('Platform administrator sessions cannot access clinic billing.');
    }

    if (!user.role) {
      throw new ForbiddenException('Staff member has no role assigned.');
    }

    const missingPermissions = requiredPermissions.filter(
      (perm) => !hasBillingPermission(user.role, perm),
    );

    if (missingPermissions.length > 0) {
      throw new ForbiddenException(
        `Staff member with role '${user.role}' lacks required billing permission: ${missingPermissions.join(', ')}`,
      );
    }

    return true;
  }
}

