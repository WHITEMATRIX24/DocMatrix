import { useSyncExternalStore } from 'react'
import { loadFromStorage, saveToStorage } from './storageService'
import { DENTAL_TREATMENTS, type PaymentMode } from './clinicStore'
import {
  billingApi,
  toBackendMode,
  toFrontendMode,
  type BackendExpense,
  type BackendTariff,
} from './billingApi'

/**
 * Billing master data: the service price list (Tariffs) and clinic expenses.
 * Authoritative persistence is provided by NestJS Billing APIs / PostgreSQL.
 */

export type GstClass = 'treatment' | 'cosmetic'

export interface ServicePrice {
  id: string
  name: string
  category: string
  price: number
  offerPrice?: number
  gstClass: GstClass
  active: boolean
}

export const EXPENSE_CATEGORIES = [
  'Lab fees',
  'Dental supplies',
  'Rent',
  'Salaries',
  'Utilities',
  'Equipment & maintenance',
  'Marketing',
  'Other',
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]

export interface ExpenseRecord {
  id: string
  backendId?: string
  date: string // YYYY-MM-DD
  category: ExpenseCategory
  description: string
  vendor?: string
  amount: number
  mode: PaymentMode
  createdAt: string
}

/** Cosmetic services attract 18% GST; clinical treatment is exempt. */
export const gstRateFor = (gstClass: GstClass) => (gstClass === 'cosmetic' ? 18 : 0)

export const effectivePrice = (service: ServicePrice) =>
  service.offerPrice && service.offerPrice > 0 && service.offerPrice < service.price
    ? service.offerPrice
    : service.price

interface BillingSnapshot {
  services: ServicePrice[]
  expenses: ExpenseRecord[]
  isLoading: boolean
  error: string | null
}

const mapBackendCategoryToFrontend = (cat: string): ExpenseCategory => {
  const norm = cat?.toUpperCase().replace(/[\s&]+/g, '_')
  switch (norm) {
    case 'LAB_FEES':
      return 'Lab fees'
    case 'DENTAL_SUPPLIES':
      return 'Dental supplies'
    case 'RENT':
      return 'Rent'
    case 'SALARIES':
      return 'Salaries'
    case 'UTILITIES':
      return 'Utilities'
    case 'EQUIPMENT_MAINTENANCE':
      return 'Equipment & maintenance'
    case 'MARKETING':
      return 'Marketing'
    default:
      return 'Other'
  }
}

const mapFrontendCategoryToBackend = (cat: string): string => {
  switch (cat) {
    case 'Lab fees':
      return 'LAB_FEES'
    case 'Dental supplies':
      return 'DENTAL_SUPPLIES'
    case 'Rent':
      return 'RENT'
    case 'Salaries':
      return 'SALARIES'
    case 'Utilities':
      return 'UTILITIES'
    case 'Equipment & maintenance':
      return 'EQUIPMENT_MAINTENANCE'
    case 'Marketing':
      return 'MARKETING'
    default:
      return 'OTHER'
  }
}

const getSeedServices = (): ServicePrice[] => {
  if (typeof DENTAL_TREATMENTS !== 'undefined' && Array.isArray(DENTAL_TREATMENTS)) {
    return DENTAL_TREATMENTS.map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      price: t.standardFee,
      gstClass: t.category === 'Cosmetic' ? 'cosmetic' : 'treatment',
      active: true,
    }))
  }
  return []
}

const storageKey = () => {
  try {
    const raw =
      sessionStorage.getItem('docmatrix_auth_user') ||
      localStorage.getItem('docmatrix_auth_user')
    const clinicId = raw ? JSON.parse(raw)?.clinicId : null
    if (clinicId) return `docmatrix_billing_${clinicId}`
  } catch {}
  return 'docmatrix_v1_billing'
}

const hasAuthToken = (): boolean => {
  try {
    return Boolean(
      sessionStorage.getItem('docmatrix_auth_token') ||
        localStorage.getItem('docmatrix_auth_token'),
    )
  } catch {
    return false
  }
}

const loaded = loadFromStorage<{ services?: ServicePrice[]; expenses?: ExpenseRecord[] } | null>(
  storageKey(),
  null,
)

let snapshot: BillingSnapshot = {
  services: Array.isArray(loaded?.services) ? loaded!.services : getSeedServices(),
  expenses: Array.isArray(loaded?.expenses) ? loaded!.expenses : [],
  isLoading: false,
  error: null,
}

const listeners = new Set<() => void>()

const commit = (next: Partial<BillingSnapshot>) => {
  snapshot = { ...snapshot, ...next }
  saveToStorage(storageKey(), {
    services: snapshot.services,
    expenses: snapshot.expenses,
  })
  listeners.forEach((l) => l())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const useBillingData = () =>
  useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => snapshot,
  )

/**
 * Fetch authoritative Tariffs and Expenses from NestJS backend.
 */
export async function syncBillingMasterData(): Promise<void> {
  if (!hasAuthToken()) return

  commit({ isLoading: true, error: null })
  try {
    const [tariffs, expenses] = await Promise.all([
      billingApi.getTariffs(),
      billingApi.getExpenses(),
    ])

    const mappedServices: ServicePrice[] = tariffs.map((t: BackendTariff) => ({
      id: t.id,
      name: t.name,
      category: t.category || 'General',
      price: Number(t.standardFee) || 0,
      offerPrice: t.offerPrice ? Number(t.offerPrice) : undefined,
      gstClass: t.gstClass === 'TAXABLE' ? 'cosmetic' : 'treatment',
      active: t.isActive,
    }))

    const mappedExpenses: ExpenseRecord[] = expenses.map((e: BackendExpense) => ({
      id: e.expenseNumber || e.id,
      backendId: e.id,
      date: e.date ? e.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      category: mapBackendCategoryToFrontend(e.category),
      description: e.description,
      vendor: e.vendor || undefined,
      amount: Number(e.amount) || 0,
      mode: toFrontendMode(e.mode) as PaymentMode,
      createdAt: e.createdAt || new Date().toISOString(),
    }))

    commit({
      services: mappedServices.length > 0 ? mappedServices : snapshot.services,
      expenses: mappedExpenses,
      isLoading: false,
      error: null,
    })
  } catch (err: any) {
    console.warn('[billingStore] syncBillingMasterData failed:', err)
    commit({ isLoading: false, error: err.message || 'Failed to sync billing master data' })
  }
}

/**
 * Save or update service tariff with backend persistence.
 */
export async function saveService(service: Omit<ServicePrice, 'id'> & { id?: string }) {
  if (hasAuthToken()) {
    try {
      if (service.id && !service.id.startsWith('SRV-') && !service.id.startsWith('trt-')) {
        // Update existing backend tariff
        const updated = await billingApi.updateTariff(service.id, {
          name: service.name,
          category: service.category,
          standardFee: service.price,
          offerPrice: service.offerPrice,
          gstClass: service.gstClass === 'cosmetic' ? 'TAXABLE' : 'EXEMPT',
          gstRate: gstRateFor(service.gstClass),
          isActive: service.active,
        })
        const mapped: ServicePrice = {
          id: updated.id,
          name: updated.name,
          category: updated.category,
          price: Number(updated.standardFee),
          offerPrice: updated.offerPrice ? Number(updated.offerPrice) : undefined,
          gstClass: updated.gstClass === 'TAXABLE' ? 'cosmetic' : 'treatment',
          active: updated.isActive,
        }
        commit({
          services: snapshot.services.map((s) => (s.id === service.id ? mapped : s)),
        })
        return mapped
      } else {
        // Create new backend tariff
        const created = await billingApi.createTariff({
          name: service.name,
          category: service.category,
          standardFee: service.price,
          offerPrice: service.offerPrice,
          gstClass: service.gstClass === 'cosmetic' ? 'TAXABLE' : 'EXEMPT',
          gstRate: gstRateFor(service.gstClass),
          isActive: service.active,
        })
        const mapped: ServicePrice = {
          id: created.id,
          name: created.name,
          category: created.category,
          price: Number(created.standardFee),
          offerPrice: created.offerPrice ? Number(created.offerPrice) : undefined,
          gstClass: created.gstClass === 'TAXABLE' ? 'cosmetic' : 'treatment',
          active: created.isActive,
        }
        commit({ services: [...snapshot.services, mapped] })
        return mapped
      }
    } catch (err: any) {
      console.error('[billingStore] saveService error:', err)
      throw err
    }
  }

  // Fallback for offline / dev mock
  const fallbackId = service.id || `SRV-${Date.now().toString().slice(-8)}`
  const fallbackRecord: ServicePrice = { ...service, id: fallbackId }
  const exists = snapshot.services.some((s) => s.id === service.id)
  commit({
    services: exists
      ? snapshot.services.map((s) => (s.id === service.id ? fallbackRecord : s))
      : [...snapshot.services, fallbackRecord],
  })
  return fallbackRecord
}

/**
 * Toggle tariff active state with backend persistence.
 */
export async function toggleServiceActive(id: string) {
  const current = snapshot.services.find((s) => s.id === id)
  if (!current) return

  // Optimistic update
  commit({
    services: snapshot.services.map((s) => (s.id === id ? { ...s, active: !s.active } : s)),
  })

  if (hasAuthToken() && !id.startsWith('SRV-') && !id.startsWith('trt-')) {
    try {
      await billingApi.toggleTariffActive(id)
    } catch (err) {
      console.warn('[billingStore] toggleTariffActive error, reverting:', err)
      // Revert optimistic update
      commit({
        services: snapshot.services.map((s) => (s.id === id ? { ...s, active: current.active } : s)),
      })
    }
  }
}

/**
 * Add expense with backend persistence.
 */
export async function addExpense(expense: Omit<ExpenseRecord, 'id' | 'createdAt'>) {
  if (hasAuthToken()) {
    try {
      const created = await billingApi.createExpense({
        date: expense.date,
        category: mapFrontendCategoryToBackend(expense.category),
        description: expense.description,
        vendor: expense.vendor,
        amount: expense.amount,
        mode: toBackendMode(expense.mode),
      })

      const record: ExpenseRecord = {
        id: created.expenseNumber || created.id,
        backendId: created.id,
        date: created.date.slice(0, 10),
        category: mapBackendCategoryToFrontend(created.category),
        description: created.description,
        vendor: created.vendor || undefined,
        amount: Number(created.amount),
        mode: toFrontendMode(created.mode) as PaymentMode,
        createdAt: created.createdAt,
      }

      commit({ expenses: [record, ...snapshot.expenses] })
      return record
    } catch (err: any) {
      console.error('[billingStore] addExpense error:', err)
      throw err
    }
  }

  const record: ExpenseRecord = {
    ...expense,
    id: `EXP-${Date.now().toString().slice(-8)}`,
    createdAt: new Date().toISOString(),
  }
  commit({ expenses: [record, ...snapshot.expenses] })
  return record
}

/**
 * Delete expense with backend persistence.
 */
export async function deleteExpense(id: string) {
  const target = snapshot.expenses.find((e) => e.id === id || e.backendId === id)
  commit({ expenses: snapshot.expenses.filter((e) => e.id !== id && e.backendId !== id) })

  if (hasAuthToken() && target?.backendId) {
    try {
      await billingApi.deleteExpense(target.backendId)
    } catch (err) {
      console.warn('[billingStore] deleteExpense error, restoring:', err)
      if (target) {
        commit({ expenses: [target, ...snapshot.expenses] })
      }
    }
  }
}
