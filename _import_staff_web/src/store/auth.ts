import { create } from 'zustand'
import { DemoUser, StaffRole } from '@/mocks/auth'
import { mockAuthService } from '@/services/auth'

interface AuthState {
  user: DemoUser | null
  loading: boolean
  setUser: (user: DemoUser | null) => void
  loadCurrentUser: () => Promise<DemoUser | null>
  logout: () => Promise<void>
  loginAsRole: (role: StaffRole) => Promise<DemoUser>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user, loading: false }),
  loadCurrentUser: async () => {
    set({ loading: true })
    const user = await mockAuthService.currentUser()
    set({ user, loading: false })
    return user
  },
  logout: async () => {
    await mockAuthService.logout()
    set({ user: null, loading: false })
  },
  loginAsRole: async (role: StaffRole) => {
    set({ loading: true })
    const user = await mockAuthService.loginAsRole(role)
    set({ user, loading: false })
    return user
  },
}))
