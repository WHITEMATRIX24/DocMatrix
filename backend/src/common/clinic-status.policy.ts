import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from './decorators/current-user.decorator.js';

export function assertClinicStatus(
  status: string | undefined,
  user: Pick<AuthenticatedUser, 'isPlatformAdmin'>,
  write = false,
): void {
  if (user.isPlatformAdmin === true) return;
  if (!status || status === 'SUSPENDED' || status === 'CLOSED') {
    throw new ForbiddenException(
      'Clinic access is unavailable. Contact your administrator.',
    );
  }
  if (write && status === 'READ_ONLY') {
    throw new ForbiddenException(
      'This clinic is read-only. Contact your administrator to restore access.',
    );
  }
}
