import { useSyncExternalStore } from 'react'
import { loadFromStorage, saveToStorage } from './storageService'

/**
 * Remembers which patients staff have already contacted, so two people don't call the same patient.
 * Saved in this browser only, per clinic, like the rest of the billing and report data.
 */

export type ContactLog = Record<string, string> // patientId -> ISO timestamp of the last contact

/** A contacted patient stays off the call list for this long, then returns if still unresolved. */
export const CONTACT_QUIET_DAYS = 7

const storageKey = () => {
  try {
    const raw = sessionStorage.getItem('docmatrix_auth_user') || localStorage.getItem('docmatrix_auth_user')
    const clinicId = raw ? JSON.parse(raw)?.clinicId : null
    if (clinicId) return `docmatrix_followups_${clinicId}`
  } catch {}
  return 'docmatrix_v1_followups'
}

let log: ContactLog = loadFromStorage<ContactLog>(storageKey(), {}) || {}
const listeners = new Set<() => void>()

const commit = (next: ContactLog) => {
  log = next
  saveToStorage(storageKey(), log)
  listeners.forEach((l) => l())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const useContactLog = () => useSyncExternalStore(subscribe, () => log, () => log)

export const markContacted = (patientId: string) => commit({ ...log, [patientId]: new Date().toISOString() })

export const undoContacted = (patientId: string) => {
  const next = { ...log }
  delete next[patientId]
  commit(next)
}

export const resetContactLogForTesting = () => commit({})

export const isRecentlyContacted = (at: string | undefined, now: number = Date.now()) =>
  Boolean(at) && now - new Date(at as string).getTime() < CONTACT_QUIET_DAYS * 86400000
