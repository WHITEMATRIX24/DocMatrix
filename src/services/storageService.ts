import { browserLocalStorage } from '@/services/browserStorage';
/**
 * Safe Browser Storage Utility for DocMatrix Prototype
 * 
 * Provides versioned, resilient browserLocalStorage persistence for client-side
 * demo data. Protects against missing storage, quota errors, JSON parse errors,
 * and handles state migration cleanly.
 */

const STORAGE_VERSION = 1
const PREFIX = `docmatrix_v${STORAGE_VERSION}_`

export const STORAGE_KEYS = {
  DATA: `${PREFIX}clinic_data`,
  VERSION: `${PREFIX}schema_version`,
  LEGACY_DATA: 'docmatrix_clinic_data'
}

/**
 * Check if browser browserLocalStorage is accessible and working
 */
export function isStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !browserLocalStorage) {
      return false
    }
    const testKey = '__storage_test__'
    browserLocalStorage.setItem(testKey, testKey)
    browserLocalStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}

/**
 * Safely read and parse data from browserLocalStorage
 */
export function loadFromStorage<T>(key: string, defaultValue: T): T {
  if (!isStorageAvailable()) return defaultValue

  try {
    const raw = browserLocalStorage.getItem(key)
    if (!raw) return defaultValue
    const parsed = JSON.parse(raw)
    return parsed !== null && parsed !== undefined ? (parsed as T) : defaultValue
  } catch (error) {
    console.warn(`[storageService] Failed to load key "${key}", using defaults:`, error)
    return defaultValue
  }
}

/**
 * Safely serialize and save data to browserLocalStorage
 */
export function saveToStorage<T>(key: string, value: T): boolean {
  if (!isStorageAvailable()) return false

  try {
    browserLocalStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.warn(`[storageService] Failed to save key "${key}":`, error)
    return false
  }
}

/**
 * Remove an item from browserLocalStorage safely
 */
export function removeFromStorage(key: string): boolean {
  if (!isStorageAvailable()) return false
  try {
    browserLocalStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

