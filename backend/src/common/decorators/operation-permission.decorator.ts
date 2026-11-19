import { SetMetadata } from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import type { AuthenticatedUser } from './current-user.decorator.js';

export const OPERATION_KEY = 'docmatrix.operation';
export type Operation =
  | 'clinical.read'
  | 'clinical.write'
  | 'document.read'
  | 'document.write'
  | 'document.delete'
  | 'consent.read'
  | 'consent.write'
  | 'consent.delete'
  | 'patient.read'
  | 'patient.write'
  | 'patient.archive'
  | 'inventory.read'
  | 'inventory.manage'
  | 'inventory.stock'
  | 'inventory.deduct';
const admins = [StaffRole.ORGANIZATION_ADMIN, StaffRole.BRANCH_ADMIN];
const clinicians = [...admins, StaffRole.DOCTOR, StaffRole.NURSE];
const intake = [...clinicians, StaffRole.RECEPTIONIST];
export const OPERATION_ROLES: Readonly<
  Record<Operation, readonly StaffRole[]>
> = {
  'clinical.read': clinicians,
  'clinical.write': [StaffRole.DOCTOR],
  // Receptionist access is further restricted by document category in ClinicalService.
  'document.read': intake,
  'document.write': intake,
  'document.delete': admins,
  'consent.read': intake,
  'consent.write': intake,
  'consent.delete': admins,
  'patient.read': [...intake, StaffRole.ACCOUNTANT],
  'patient.write': intake,
  'patient.archive': admins,
  'inventory.read': [...intake, StaffRole.PHARMACIST, StaffRole.ACCOUNTANT],
  'inventory.manage': [...admins, StaffRole.PHARMACIST],
  'inventory.stock': [...clinicians, StaffRole.PHARMACIST],
  'inventory.deduct': [...clinicians, StaffRole.PHARMACIST],
};
export const RequireOperation = (operation: Operation) =>
  SetMetadata(OPERATION_KEY, operation);
export function canPerform(
  user: AuthenticatedUser,
  operation: Operation,
): boolean {
  return (
    user.isPlatformAdmin === true ||
    OPERATION_ROLES[operation].includes(user.role as StaffRole)
  );
}
