export interface PractitionerIdentity {
  role?: string; isPrimaryContact?: boolean; isPlatformAdmin?: boolean;
  practitionerVerifiedAt?: Date | string | null; practitionerRegistration?: string | null;
}
export function isVerifiedPractitioner(user: PractitionerIdentity | null | undefined): boolean {
  return !!user && !user.isPlatformAdmin && (user.role === 'DOCTOR' ||
    (user.role === 'ORGANIZATION_ADMIN' && user.isPrimaryContact === true &&
      !!user.practitionerVerifiedAt && !!user.practitionerRegistration?.trim()));
}
export const practitionerWhere = {
  isActive: true,
  isPlatformAdmin: false,
  OR: [{ role: 'DOCTOR' as const }, { role: 'ORGANIZATION_ADMIN' as const, isPrimaryContact: true,
    practitionerVerifiedAt: { not: null }, practitionerRegistration: { not: null } }],
};
