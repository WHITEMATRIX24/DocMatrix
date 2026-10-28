import {
  DemoUser,
  DEMO_USERS,
  findDemoUserById,
  findDemoUserByPhone,
  MOCK_VALID_OTP,
  StaffRole,
} from '@/mocks/auth'

export const DEMO_SESSION_KEY = 'docmatrix-demo-session'

export interface ClinicRegistrationData {
  clinicName: string
  ownerName: string
  phone: string
  city: string
  state: string
  clinicType: 'Solo dentist' | 'Multi-dentist clinic' | 'Clinic chain'
  agreeTerms: boolean
  whatsappUpdates?: boolean
}

export interface AuthService {
  requestOtp(phone: string): Promise<{ success: boolean; message: string; hint?: string }>
  verifyOtp(
    phone: string,
    code: string
  ): Promise<{ success: boolean; user?: DemoUser; error?: string; locked?: boolean }>
  logout(): Promise<void>
  currentUser(): Promise<DemoUser | null>
  registerClinic(
    data: ClinicRegistrationData
  ): Promise<{ success: boolean; clinicId: string; ownerUser: DemoUser }>
  loginAsRole(role: StaffRole): Promise<DemoUser>
}

// In-memory state tracking wrong OTP attempts (5 max) and newly registered clinics
const wrongAttempts = new Map<string, number>()
const registeredUsers = new Map<string, DemoUser>()

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Mock implementation of AuthService using fake in-memory data.
 * A real implementation will be added in a later stage.
 */
export const mockAuthService: AuthService = {
  async requestOtp(phone: string) {
    await delay(180)
    // Reset wrong attempts for new code request
    wrongAttempts.set(phone.replace(/\s+/g, ''), 0)

    // Always show identical neutral message
    return {
      success: true,
      message: 'If this number is registered, a code has been sent.',
      hint: 'Demo code: 123456',
    }
  },

  async verifyOtp(phone: string, code: string) {
    await delay(200)
    const cleanPhone = phone.replace(/\s+/g, '')
    const attempts = wrongAttempts.get(cleanPhone) || 0

    if (attempts >= 5) {
      return {
        success: false,
        error: 'Too many tries. Request a new code.',
        locked: true,
      }
    }

    if (code !== MOCK_VALID_OTP) {
      const nextAttempts = attempts + 1
      wrongAttempts.set(cleanPhone, nextAttempts)

      if (nextAttempts >= 5) {
        return {
          success: false,
          error: 'Too many tries. Request a new code.',
          locked: true,
        }
      }

      return {
        success: false,
        error: "That code didn't work. Check it or request a new one.",
      }
    }

    // Code is valid: find user
    wrongAttempts.delete(cleanPhone)
    let user = findDemoUserByPhone(cleanPhone) || registeredUsers.get(cleanPhone)

    if (!user) {
      // If a non-preconfigured number enters valid code, create a demo doctor account for testing
      user = {
        id: `demo-user-${Date.now()}`,
        name: 'Demo Staff Member',
        role: 'DOCTOR',
        phone: cleanPhone,
        clinicName: 'Demo Dental Clinic',
        clinicId: 'clinic-demo-001',
      }
      registeredUsers.set(cleanPhone, user)
    }

    // Store ONLY the user id in sessionStorage (no credentials, no names, no tokens)
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(DEMO_SESSION_KEY, user.id)
    }

    return {
      success: true,
      user,
    }
  },

  async logout() {
    await delay(50)
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(DEMO_SESSION_KEY)
    }
  },

  async currentUser() {
    if (typeof window === 'undefined') return null
    const userId = sessionStorage.getItem(DEMO_SESSION_KEY)
    if (!userId) return null

    // Check preconfigured mock users
    const user = findDemoUserById(userId)
    if (user) return user

    // Check newly registered demo users
    for (const u of registeredUsers.values()) {
      if (u.id === userId) return u
    }

    return null
  },

  async registerClinic(data: ClinicRegistrationData) {
    await delay(220)
    const cleanPhone = data.phone.replace(/\s+/g, '')
    const clinicId = `clinic-${Date.now()}`
    const ownerUser: DemoUser = {
      id: `owner-${Date.now()}`,
      name: data.ownerName,
      role: 'ORGANIZATION_ADMIN',
      phone: cleanPhone,
      clinicName: data.clinicName,
      clinicId,
    }

    registeredUsers.set(cleanPhone, ownerUser)
    wrongAttempts.set(cleanPhone, 0)

    return {
      success: true,
      clinicId,
      ownerUser,
    }
  },

  async loginAsRole(role: StaffRole) {
    await delay(100)
    const user = DEMO_USERS[role]
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(DEMO_SESSION_KEY, user.id)
    }
    return user
  },
}
