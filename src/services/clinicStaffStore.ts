import { useEffect, useState } from 'react'
import { apiClient } from './apiClient'

export interface ClinicStaffDoctor {
  id: string
  name: string
  role?: string
  email?: string
}

const STAFF_STORAGE_KEY = 'docmatrix_clinic_staff'

const listeners = new Set<() => void>()

export function isClinicalStaffMember(p: { name?: string; fullName?: string; role?: string }): boolean {
  const rawName = String(p?.fullName || p?.name || '').trim()
  if (!rawName) return false
  const lower = rawName.toLowerCase()
  if (
    lower === 'reception staff' ||
    lower === 'unassigned' ||
    lower === 'dr. attending dentist' ||
    lower === 'attending dentist' ||
    lower === 'organization admin' ||
    lower === 'branch admin' ||
    lower === 'clinic admin' ||
    lower === 'aashna jose alappattu' ||
    lower === 'aashna jose'
  ) {
    return false
  }
  const role = String(p?.role || '').toUpperCase()
  // Requirement: Display only users whose role is exactly DOCTOR
  if (role !== 'DOCTOR') return false
  return true
}

export function getStoredStaff(): ClinicStaffDoctor[] {
  const doctors: ClinicStaffDoctor[] = []
  try {
    const raw = localStorage.getItem(STAFF_STORAGE_KEY)
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
  const fresh = getStoredStaff()
  if (fresh.length > 0) {
    staffCache = fresh
  }
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

export async function fetchAndSyncClinicStaff(): Promise<ClinicStaffDoctor[]> {
  try {
    const res = await apiClient.get<any[]>('/clinics/my-clinic/staff')
    if (Array.isArray(res) && res.length > 0) {
      try {
        localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(res))
      } catch {}
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

export async function addClinicDoctor(
  fullName: string,
  role: string = 'DOCTOR',
  email?: string
): Promise<ClinicStaffDoctor> {
  const newId = 'doc-' + Date.now().toString(36)
  const newDoctor: ClinicStaffDoctor = {
    id: newId,
    name: fullName.trim(),
    role,
    email: email || `${fullName.toLowerCase().replace(/[^a-z0-9]/g, '')}@clinic.local`
  }

  // Update memory and local storage immediately
  staffCache = [newDoctor, ...staffCache]
  try {
    const existing = getStoredStaff()
    localStorage.setItem(
      STAFF_STORAGE_KEY,
      JSON.stringify([
        {
          id: newDoctor.id,
          fullName: newDoctor.name,
          role: newDoctor.role,
          email: newDoctor.email,
          isActive: true,
          createdAt: new Date().toISOString()
        },
        ...existing
      ])
    )
  } catch {}

  notify()

  // Asynchronously attempt to sync with backend database
  try {
    await apiClient.post('/clinics/my-clinic/staff', {
      fullName: newDoctor.name,
      role: newDoctor.role,
      email: newDoctor.email,
      password: 'TempPassword123!'
    })
  } catch {
    // Graceful offline fallback
  }

  return newDoctor
}

// Initial fetch on module load
if (typeof window !== 'undefined') {
  setTimeout(() => {
    fetchAndSyncClinicStaff()
  }, 50)
}

