import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service.js';
import { assertClinicStatus } from '../clinic-status.policy.js';
import { canPerform, OPERATION_KEY, Operation } from '../decorators/operation-permission.decorator.js';
import { AuthenticatedUser } from '../decorators/current-user.decorator.js';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(Reflector) private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      return false;
    }

    if (user.isPlatformAdmin) {
      throw new ForbiddenException('Platform administrator sessions cannot access clinic records. Use a separate clinic staff account.');
    }

    if (!user.clinicId) {
      throw new ForbiddenException('User is not assigned to any dental clinic.');
    }

    const clinic = await this.prisma.clinic.findUnique({ where: { id: user.clinicId }, select: { status: true } });
    assertClinicStatus(clinic?.status, user, !['GET', 'HEAD', 'OPTIONS'].includes(request.method));
    const operation = this.reflector.getAllAndOverride<Operation>(OPERATION_KEY, [context.getHandler(), context.getClass()]);
    if (operation && !canPerform(user, operation)) {
      throw new ForbiddenException('Your role does not permit this operation.');
    }

    return true;
  }
}

