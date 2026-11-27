import { isVerifiedPractitioner } from '../practitioner.policy.js';
import { SetMetadata } from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import type { AuthenticatedUser } from './current-user.decorator.js';

export const OPERATION_KEY = 'docmatrix.operation';
export type Operation =
  | 'appointment.read'
  | 'appointment.schedule'
  | 'appointment.check_in'
  | 'appointment.consult'
  | 'treatment.read'
  | 'treatment.write'
  | 'report.summary'
  | 'report.clinical'
  | 'report.financial'
  | 'report.follow_up'
  | 'clinical.read'
  | 'clinical.write'
  | 'document.read'
  | 'document.write'
  | 'document.delete'
  | 'consent.read'
  | 'consent.write'
  | 'consent.verify'
  | 'consent.template.manage'
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
  'appointment.read': intake,
  'appointment.schedule': [...admins, StaffRole.DOCTOR, StaffRole.RECEPTIONIST],
  'appointment.check_in': intake,
  'appointment.consult': [StaffRole.DOCTOR],
  'treatment.read': clinicians,
  'treatment.write': [...admins, StaffRole.DOCTOR],
  'report.summary': [...intake, StaffRole.ACCOUNTANT],
  'report.clinical': [...clinicians, StaffRole.ACCOUNTANT],
  'report.financial': [...admins, StaffRole.ACCOUNTANT],
  'report.follow_up': intake,
  'clinical.read': clinicians,
  'clinical.write': [StaffRole.DOCTOR],
  // Patient documents use the same clinic intake permissions as uploads.
  'document.read': intake,
  'document.write': intake,
  'document.delete': admins,
  'consent.read': intake,
  'consent.write': intake,
  'consent.verify': [...admins, StaffRole.DOCTOR],
  'consent.template.manage': admins,
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
  if (['clinical.write', 'appointment.consult'].includes(operation) && isVerifiedPractitioner(user)) return !!user.clinicId;
  return (
    !!user && user.isPlatformAdmin !== true && !!user.clinicId &&
    OPERATION_ROLES[operation].includes(user.role as StaffRole)
  );
}
