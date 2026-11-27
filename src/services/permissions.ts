import { browserLocalStorage, browserSessionStorage } from '@/services/browserStorage';
import { findDemoUserById, type StaffRole } from '@/mocks/auth'

const admins: StaffRole[] = ['ORGANIZATION_ADMIN', 'BRANCH_ADMIN']
const clinicians: StaffRole[] = [...admins, 'DOCTOR', 'NURSE']
const intake: StaffRole[] = [...clinicians, 'RECEPTIONIST']
const billing: StaffRole[] = [...admins, 'DOCTOR', 'RECEPTIONIST', 'ACCOUNTANT']
export const OPERATION_ROLES = {
  'appointment.read': intake,
  'appointment.schedule': [...admins, 'DOCTOR', 'RECEPTIONIST'],
  'appointment.check_in': intake,
  'appointment.consult': ['DOCTOR'],
  'clinical.read': clinicians,
  'clinical.write': ['DOCTOR'],
  'treatment.read': clinicians,
  'treatment.write': [...admins, 'DOCTOR'],
  'patient.read': [...intake, 'ACCOUNTANT'],
  'patient.write': intake,
  'document.read': intake,
  'consent.read': intake,
  'consent.write': intake,
  'consent.verify': [...admins, 'DOCTOR'],
  'consent.template.manage': admins,
  'inventory.read': [...intake, 'PHARMACIST', 'ACCOUNTANT'],
  'billing.invoice.read': billing,
  'billing.invoice.create': billing,
  'billing.tariff.read': billing,
  'billing.expense.read': [...admins, 'RECEPTIONIST', 'ACCOUNTANT'],
  'report.financial': [...admins, 'ACCOUNTANT'],
  'report.clinical': [...clinicians, 'ACCOUNTANT'],
  'report.follow_up': intake,
} satisfies Record<string, readonly string[]>
export type ClinicOperation = keyof typeof OPERATION_ROLES
export interface PermissionUser { role?: string; clinicId?: string; isPlatformAdmin?: boolean; isPrimaryContact?: boolean; canPractice?: boolean }

// Read session storage directly to avoid circular dependencies between auth and stores.
export function getPermissionUser(): PermissionUser | null {
  try {
    const raw = browserSessionStorage.getItem('docmatrix_auth_user') || browserLocalStorage.getItem('docmatrix_auth_user')
    if (raw) return JSON.parse(raw)
    const token = browserSessionStorage.getItem('docmatrix_auth_token') || browserLocalStorage.getItem('docmatrix_auth_token')
    if (token && !token.startsWith('demo-') && !token.startsWith('google-demo')) return null
    const demoId = browserSessionStorage.getItem('docmatrix-demo-session')
    return demoId ? findDemoUserById(demoId) || null : null
  } catch { return null }
}
export function canClinic(user: PermissionUser | null | undefined, operation: ClinicOperation): boolean {
  if (user?.clinicId && !user.isPlatformAdmin && user.role === 'ORGANIZATION_ADMIN' && user.isPrimaryContact && user.canPractice === true && ['clinical.write', 'appointment.consult'].includes(operation)) return true
  return !!user?.clinicId && user.isPlatformAdmin !== true &&
    (OPERATION_ROLES[operation] as readonly string[]).includes(user.role || '')
}
