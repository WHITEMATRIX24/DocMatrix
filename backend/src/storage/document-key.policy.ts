import { ForbiddenException } from '@nestjs/common';
export function assertDocumentOwnership(key: string, clinicId: string, patientId: string): void {
  if (!key || /[\\\x00-\x1f]/.test(key) || key.split('/').some(part => part === '.' || part === '..')) throw new ForbiddenException('Invalid document storage key.');
  if (key.startsWith('clinics/')) {
    if (!key.startsWith(`clinics/${clinicId}/patients/${patientId}/`)) throw new ForbiddenException('Document storage key does not belong to this patient.');
  } else if (key.includes('/') && !key.startsWith(`${clinicId}/`)) {
    throw new ForbiddenException('Document storage key does not belong to this clinic.');
  }
}
