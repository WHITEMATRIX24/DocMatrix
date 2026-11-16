import { ForbiddenException } from '@nestjs/common';
import { StaffRole } from '@prisma/client';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';

const ROLE_LABELS: Record<StaffRole, string> = {
  ORGANIZATION_ADMIN: 'Organization Admin', BRANCH_ADMIN: 'Branch Admin',
  DOCTOR: 'Dentist / Practitioner', RECEPTIONIST: 'Front Desk / Reception',
  ACCOUNTANT: 'Billing / Accountant', NURSE: 'Dental Assistant / Nurse',
  LAB_TECHNICIAN: 'Lab Technician', PHARMACIST: 'Pharmacist',
};
const ADMIN_ROLES: StaffRole[] = [StaffRole.ORGANIZATION_ADMIN, StaffRole.BRANCH_ADMIN];

export function assignableStaffRoles(clinicId: string, actor: AuthenticatedUser) {
  if (!clinicId || actor?.clinicId !== clinicId ||
      !ADMIN_ROLES.includes(actor.role as StaffRole)) {
    throw new ForbiddenException('Only clinic administrators may manage their clinic staff.');
  }
  return Object.values(StaffRole)
    .filter(role => actor.role === StaffRole.ORGANIZATION_ADMIN ||
      (role !== StaffRole.ORGANIZATION_ADMIN && role !== StaffRole.BRANCH_ADMIN))
    .map(value => ({ value, label: ROLE_LABELS[value] }));
}

export function assertAssignableStaffRole(clinicId: string, actor: AuthenticatedUser, role: StaffRole) {
  if (!assignableStaffRoles(clinicId, actor).some(r => r.value === role)) {
    throw new ForbiddenException('You are not authorized to assign this staff role.');
  }
}

export function assertManageableStaff(clinicId: string, actor: AuthenticatedUser,
  target: { role: StaffRole; isPlatformAdmin?: boolean }) {
  assignableStaffRoles(clinicId, actor);
  if (target.isPlatformAdmin || (actor.role === StaffRole.BRANCH_ADMIN &&
    ADMIN_ROLES.includes(target.role))) {
    throw new ForbiddenException('You are not authorized to modify this administrator account.');
  }
}
