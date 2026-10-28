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
  clinicName: string
  clinicId: string
}

export const MOCK_CLINIC_NAME = 'Demo Dental Clinic'
export const MOCK_CLINIC_ID = 'clinic-demo-001'
export const MOCK_VALID_OTP = '123456'

export const DEMO_USERS: Record<StaffRole, DemoUser> = {
  ORGANIZATION_ADMIN: {
    id: 'demo-org-admin',
    name: 'Dr. Anand Varma',
    role: 'ORGANIZATION_ADMIN',
    phone: '+910000000101',
    clinicName: MOCK_CLINIC_NAME,
    clinicId: MOCK_CLINIC_ID,
  },
  BRANCH_ADMIN: {
    id: 'demo-branch-admin',
    name: 'Priya Nair',
    role: 'BRANCH_ADMIN',
    phone: '+910000000102',
    clinicName: MOCK_CLINIC_NAME,
    clinicId: MOCK_CLINIC_ID,
  },
  RECEPTIONIST: {
    id: 'demo-receptionist',
    name: 'Anjali Krishna',
    role: 'RECEPTIONIST',
    phone: '+910000000103',
    clinicName: MOCK_CLINIC_NAME,
    clinicId: MOCK_CLINIC_ID,
  },
  DOCTOR: {
    id: 'demo-doctor',
    name: 'Dr. Mathew Thomas',
    role: 'DOCTOR',
    phone: '+910000000104',
    clinicName: MOCK_CLINIC_NAME,
    clinicId: MOCK_CLINIC_ID,
  },
  NURSE: {
    id: 'demo-nurse',
    name: 'Reshma Suresh',
    role: 'NURSE',
    phone: '+910000000105',
    clinicName: MOCK_CLINIC_NAME,
    clinicId: MOCK_CLINIC_ID,
  },
  LAB_TECHNICIAN: {
    id: 'demo-lab-tech',
    name: 'Rahul Menon',
    role: 'LAB_TECHNICIAN',
    phone: '+910000000106',
    clinicName: MOCK_CLINIC_NAME,
    clinicId: MOCK_CLINIC_ID,
  },
  PHARMACIST: {
    id: 'demo-pharmacist',
    name: 'Deepa Mohan',
    role: 'PHARMACIST',
    phone: '+910000000107',
    clinicName: MOCK_CLINIC_NAME,
    clinicId: MOCK_CLINIC_ID,
  },
  ACCOUNTANT: {
    id: 'demo-accountant',
    name: 'Karthik Ram',
    role: 'ACCOUNTANT',
    phone: '+910000000108',
    clinicName: MOCK_CLINIC_NAME,
    clinicId: MOCK_CLINIC_ID,
  },
}

export function findDemoUserByPhone(phone: string): DemoUser | undefined {
  const clean = phone.replace(/\s+/g, '')
  return Object.values(DEMO_USERS).find((u) => u.phone.replace(/\s+/g, '') === clean)
}

export function findDemoUserById(id: string): DemoUser | undefined {
  return Object.values(DEMO_USERS).find((u) => u.id === id)
}
