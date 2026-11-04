import { apiClient } from './apiClient'

export interface ClinicStaffDoctor {
  id: string
  name: string
  role?: string
  email?: string
}

const STAFF_STORAGE_KEY = 'docmatrix_clinic_staff'

const listeners = new Set<() => void>()

export function getStoredStaff(): ClinicStaffDoctor[] {
  const doctors: ClinicStaffDoctor[] = []
  try {
    const raw = localStorage.getItem(STAFF_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        parsed.forEach((p: any) => {
          doctors.push({
            id: String(p.id || 'doc-' + Math.random().toString(36).slice(2)),
            name: String(p.fullName || p.name || 'Practitioner'),
            role: p.role || 'DOCTOR',
            email: p.email || ''
          })
        })
      }
    }
  } catch {}

  // Also include current logged-in practitioner/admin if not already present
  try {
    const authRaw =
      (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('docmatrix_auth_user') : null) ||
      (typeof localStorage !== 'undefined' ? localStorage.getItem('docmatrix_auth_user') : null)
    if (authRaw) {
      const authUser = JSON.parse(authRaw)
      if (authUser && authUser.fullName) {
        const alreadyInList = doctors.some(
          (d) => d.name.trim().toLowerCase() === authUser.fullName.trim().toLowerCase()
        )
        if (!alreadyInList) {
          doctors.unshift({
            id: String(authUser.id || 'admin-owner'),
            name: String(authUser.fullName).trim(),
            role: authUser.role || 'DOCTOR',
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

export async function fetchAndSyncClinicStaff(): Promise<ClinicStaffDoctor[]> {
  try {
    const res = await apiClient.get<any[]>('/clinics/my-clinic/staff')
    if (Array.isArray(res) && res.length > 0) {
      const mapped = res.map((s) => ({
        id: String(s.id),
        name: String(s.fullName || s.name || 'Practitioner'),
        role: s.role || 'DOCTOR',
        email: s.email || ''
      }))
      staffCache = mapped
      try {
        localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(res))
      } catch {}
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

