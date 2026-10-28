import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { mockAuthService, ClinicRegistrationData } from '@/services/auth'
import { useAuthStore } from '@/store/auth'
import { StaffRole } from '@/mocks/auth'

export const AUTH_QUERY_KEY = ['currentUser']

export function useCurrentUser() {
  const setUser = useAuthStore((s) => s.setUser)

  return useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      const user = await mockAuthService.currentUser()
      setUser(user)
      return user
    },
    staleTime: 1000 * 60 * 5,
  })
}

export function useRequestOtpMutation() {
  return useMutation({
    mutationFn: (phone: string) => mockAuthService.requestOtp(phone),
  })
}

export function useVerifyOtpMutation() {
  const queryClient = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)

  return useMutation({
    mutationFn: ({ phone, code }: { phone: string; code: string }) =>
      mockAuthService.verifyOtp(phone, code),
    onSuccess: (data) => {
      if (data.success && data.user) {
        setUser(data.user)
        queryClient.setQueryData(AUTH_QUERY_KEY, data.user)
      }
    },
  })
}

export function useRegisterClinicMutation() {
  return useMutation({
    mutationFn: (data: ClinicRegistrationData) =>
      mockAuthService.registerClinic(data),
  })
}

export function useLogoutMutation() {
  const queryClient = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)

  return useMutation({
    mutationFn: () => mockAuthService.logout(),
    onSuccess: () => {
      setUser(null)
      queryClient.setQueryData(AUTH_QUERY_KEY, null)
    },
  })
}

export function useRoleLoginMutation() {
  const queryClient = useQueryClient()
  const setUser = useAuthStore((s) => s.setUser)

  return useMutation({
    mutationFn: (role: StaffRole) => mockAuthService.loginAsRole(role),
    onSuccess: (user) => {
      setUser(user)
      queryClient.setQueryData(AUTH_QUERY_KEY, user)
    },
  })
}
