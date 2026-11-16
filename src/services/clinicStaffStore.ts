import { useEffect, useState } from 'react'
import { apiClient } from './apiClient'

export interface ClinicStaffDoctor {
  id: string
  name: string
  role?: string
  email?: string
}

export function getStaffClinicId(): string | null {
  try {
    const raw =
      (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('docmatrix_auth_user') : null) ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('docmatrix_auth_user') : null)
    if (raw) {
      return JSON.parse(raw)?.clinicId || null
    }
  } catch {}
  return null
}

export function getStaffStorageKey(clinicId?: string): string {
  const cid = clinicId || getStaffClinicId()
  if (cid) {
    return `docmatrix_clinic_staff_${cid}`
  }
  return 'docmatrix_clinic_staff'
}

const listeners = new Set<() => void>()

export function isClinicalStaffMember(p: { name?: string; fullName?: string; role?: string; isActive?: boolean }): boolean {
  const rawName = String(p?.fullName || p?.name || '').trim()
  if (!rawName) return false
  if (p.isActive === false) return false
  const role = String(p?.role || '').toUpperCase()
  // Requirement: Display only users whose role is exactly DOCTOR
  if (role !== 'DOCTOR') return false
  return true
}

export function getStoredStaff(): ClinicStaffDoctor[] {
  const doctors: ClinicStaffDoctor[] = []
  const key = getStaffStorageKey()
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        parsed.forEach((p: any) => {
          if (!isClinicalStaffMember(p)) return
          doctors.push({
            id: String(p.id || 'doc-' + Math.random().toString(36).slice(2)),
            name: String(p.fullName || p.name || 'Practitioner').trim(),
            role: 'DOCTOR',
            email: p.email || ''
          })
        })
      }
    }
  } catch {}

  // Only include current logged-in user if their role is exactly DOCTOR
  try {
    const authRaw =
      (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('docmatrix_auth_user') : null) ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('docmatrix_auth_user') : null)
    if (authRaw) {
      const authUser = JSON.parse(authRaw)
      if (authUser && authUser.fullName && isClinicalStaffMember(authUser)) {
        const alreadyInList = doctors.some(
          (d) => d.name.trim().toLowerCase() === authUser.fullName.trim().toLowerCase()
        )
        if (!alreadyInList) {
          doctors.unshift({
            id: String(authUser.id || 'admin-owner'),
            name: String(authUser.fullName).trim(),
            role: 'DOCTOR',
            email: authUser.email || ''
          })
        }
      }
    }
  } catch {}

  return doctors
}

let staffCache: ClinicStaffDoctor[] = typeof window !== 'undefined' ? getStoredStaff() : []

function notify() {
  listeners.forEach((fn) => fn())
}

export function notifyStaffUpdated() {
  staffCache = getStoredStaff()
  notify()
}

export function subscribeStaff(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getClinicStaffDoctors(): ClinicStaffDoctor[] {
  staffCache = getStoredStaff()
  return staffCache
}

export function useClinicStaff() {
  const [doctors, setDoctors] = useState<ClinicStaffDoctor[]>(() => getClinicStaffDoctors())
  useEffect(() => {
    setDoctors(getClinicStaffDoctors())
    return subscribeStaff(() => setDoctors(getClinicStaffDoctors()))
  }, [])
  return { doctors }
}

export function cacheClinicStaff(staff: unknown[], clinicId = getStaffClinicId()): void {
  if (clinicId !== getStaffClinicId()) return
  try { localStorage.setItem(getStaffStorageKey(clinicId || undefined), JSON.stringify(staff)) } catch {}
  notifyStaffUpdated()
}

export async function fetchAndSyncClinicStaff(): Promise<ClinicStaffDoctor[]> {
  const clinicId = getStaffClinicId()
  try {
    const res = await apiClient.get<any[]>('/clinics/my-clinic/practitioners')
    if (Array.isArray(res)) {
      if (clinicId !== getStaffClinicId()) return []
      cacheClinicStaff(res, clinicId)
      const mapped = res
        .filter((s) => isClinicalStaffMember(s))
        .map((s) => ({
          id: String(s.id),
          name: String(s.fullName || s.name || 'Practitioner').trim(),
          role: s.role || 'DOCTOR',
          email: s.email || ''
        }))
      staffCache = mapped
      notify()
      return mapped
    }
  } catch {
    // Offline fallback
  }

  staffCache = getStoredStaff()
  notify()
  return staffCache
}

export function clearClinicStaffStore() {
  try {
    localStorage.removeItem(getStaffStorageKey())
    localStorage.removeItem('docmatrix_clinic_staff')
  } catch {}
  staffCache = []
  notify()
}

export async function addClinicDoctor(
  fullName: string,
  role: string = 'DOCTOR',
  email?: string
): Promise<ClinicStaffDoctor> {
  // Keep this legacy entry point fail-closed: it cannot provision secure
  // credentials and must never create a local-only or shared-password account.
  throw new Error('Create staff accounts in Settings → Staff Management with a unique initial password.')
}


// Initial fetch on module load
if (typeof window !== 'undefined') {
  setTimeout(() => {
    fetchAndSyncClinicStaff()
  }, 50)
}

