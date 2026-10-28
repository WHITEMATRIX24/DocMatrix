export type StaffRole =
  | 'ORGANIZATION_ADMIN'
  | 'BRANCH_ADMIN'
  | 'RECEPTIONIST'
  | 'DOCTOR'
  | 'NURSE'
  | 'LAB_TECHNICIAN'
  | 'PHARMACIST'
  | 'ACCOUNTANT'

export interface DemoUser {
  id: string
  name: string
  role: StaffRole
  phone: string
  email?: string
  clinicName: string
  clinicId: string
}

export const MOCK_CLINIC_NAME = 'Demo Dental Clinic'
export const MOCK_CLINIC_ID = 'clinic-demo-001'
export const MOCK_VALID_OTP = '123456'

export const DEMO_USERS: Record<StaffRole, DemoUser> = {
  ORGANIZATION_ADMIN: {
    id: 'usr-101',
    name: 'Dr. Arun Kumar (Owner)',
    role: 'ORGANIZATION_ADMIN',
    phone: '+910000000101',
    email: 'admin@docmatrix.com',
    clinicName: MOCK_CLINIC_NAME,
    clinicId: MOCK_CLINIC_ID,
  },
  BRANCH_ADMIN: {
    id: 'usr-102',
    name: 'Priya Menon (Branch Mgr)',
    role: 'BRANCH_ADMIN',
    phone: '+910000000102',
    email: 'manager@docmatrix.com',
    clinicName: MOCK_CLINIC_NAME,
    clinicId: MOCK_CLINIC_ID,
  },
  RECEPTIONIST: {
    id: 'usr-103',
    name: 'Ananya S (Front Desk)',
    role: 'RECEPTIONIST',
    phone: '+910000000103',
    email: 'receptionist@docmatrix.com',
    clinicName: MOCK_CLINIC_NAME,
    clinicId: MOCK_CLINIC_ID,
  },
  DOCTOR: {
    id: 'usr-104',
    name: 'Dr. Rajesh Nair (Doctor)',
    role: 'DOCTOR',
    phone: '+910000000104',
    email: 'doctor@docmatrix.com',
    clinicName: MOCK_CLINIC_NAME,
    clinicId: MOCK_CLINIC_ID,
  },
  NURSE: {
    id: 'usr-105',
    name: 'Suma Joseph (Nurse)',
    role: 'NURSE',
    phone: '+910000000105',
    email: 'nurse@docmatrix.com',
    clinicName: MOCK_CLINIC_NAME,
    clinicId: MOCK_CLINIC_ID,
  },
  LAB_TECHNICIAN: {
    id: 'usr-106',
    name: 'Rahul V (Lab Tech)',
    role: 'LAB_TECHNICIAN',
    phone: '+910000000106',
    email: 'lab@docmatrix.com',
    clinicName: MOCK_CLINIC_NAME,
    clinicId: MOCK_CLINIC_ID,
  },
  PHARMACIST: {
    id: 'usr-107',
    name: 'Deepa K (Pharmacist)',
    role: 'PHARMACIST',
    phone: '+910000000107',
    email: 'pharmacy@docmatrix.com',
    clinicName: MOCK_CLINIC_NAME,
    clinicId: MOCK_CLINIC_ID,
  },
  ACCOUNTANT: {
    id: 'usr-108',
    name: 'Manoj Pillai (Accountant)',
    role: 'ACCOUNTANT',
    phone: '+910000000108',
    email: 'accounts@docmatrix.com',
    clinicName: MOCK_CLINIC_NAME,
    clinicId: MOCK_CLINIC_ID,
  },
}

export function findDemoUserByPhone(phone: string): DemoUser | undefined {
  const clean = phone.replace(/\D/g, '')
  return Object.values(DEMO_USERS).find((u) => u.phone.replace(/\D/g, '') === clean)
}

export function findDemoUserByEmail(email: string): DemoUser | undefined {
  const clean = email.trim().toLowerCase()
  const exact = Object.values(DEMO_USERS).find((u) => u.email?.toLowerCase() === clean)
  if (exact) return exact
  if (clean.includes('doctor')) return DEMO_USERS.DOCTOR
  if (clean.includes('reception')) return DEMO_USERS.RECEPTIONIST
  if (clean.includes('account')) return DEMO_USERS.ACCOUNTANT
  if (clean.includes('nurse')) return DEMO_USERS.NURSE
  if (clean.includes('lab')) return DEMO_USERS.LAB_TECHNICIAN
  if (clean.includes('pharm')) return DEMO_USERS.PHARMACIST
  if (clean.includes('branch') || clean.includes('manager')) return DEMO_USERS.BRANCH_ADMIN
  return DEMO_USERS.ORGANIZATION_ADMIN
}

export function findDemoUserById(id: string): DemoUser | undefined {
  if (id === 'demo-org-admin') return DEMO_USERS.ORGANIZATION_ADMIN
  if (id === 'demo-doctor') return DEMO_USERS.DOCTOR
  if (id === 'demo-accountant') return DEMO_USERS.ACCOUNTANT
  return Object.values(DEMO_USERS).find((u) => u.id === id)
}
