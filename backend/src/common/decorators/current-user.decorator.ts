import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export class AuthenticatedUser {
  id!: string;
  email!: string;
  fullName!: string;
  name?: string;
  role!: string;
  clinicId!: string | null;
  isPlatformAdmin!: boolean;
  isPrimaryContact!: boolean;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;
    return data ? user?.[data] : user;
  },
);
