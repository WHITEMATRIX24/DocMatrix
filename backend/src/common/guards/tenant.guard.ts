import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../decorators/current-user.decorator.js';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      return false;
    }

    if (user.isPlatformAdmin) {
      return true;
    }

    if (!user.clinicId) {
      throw new ForbiddenException('User is not assigned to any dental clinic.');
    }

    return true;
  }
}

