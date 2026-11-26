import { firstValueFrom, isObservable } from 'rxjs';
import { ForbiddenException } from '@nestjs/common';
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector?: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const reflector = this.reflector ?? new Reflector();
    const isPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const existing = context.switchToHttp().getRequest().user;
    const result = existing ? true : super.canActivate(context);
    const allowed = await (isObservable(result) ? firstValueFrom(result) : result);
    const req = context.switchToHttp().getRequest();
    if (req.user?.authScope === 'account-setup' && !/^\/auth\/(?:me|mfa\/(?:setup|confirm)|email\/request)$/.test(req.path)) {
      throw new ForbiddenException('Complete email verification and two-step verification before accessing records.');
    }
    return allowed;
  }
}

