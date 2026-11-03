import { useSyncExternalStore } from 'react'
import { loadFromStorage, saveToStorage } from './storageService'
import { DENTAL_TREATMENTS, type PaymentMode } from './clinicStore'

/**
 * Billing master data: the service price list and the clinic expense log.
 * Invoices and payments live in clinicStore next to patients.
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
  service.offerPrice && service.offerPrice > 0 && service.offerPrice < service.price ? service.offerPrice : service.price

interface BillingSnapshot {
  services: ServicePrice[]
  expenses: ExpenseRecord[]
}

const seedServices: ServicePrice[] = DENTAL_TREATMENTS.map((t) => ({
  id: t.id,
  name: t.name,
  category: t.category,
  price: t.standardFee,
  gstClass: t.category === 'Cosmetic' ? 'cosmetic' : 'treatment',
  active: true,
}))

const today = () => {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 10)
}

const storageKey = () => {
  try {
    const raw = sessionStorage.getItem('docmatrix_auth_user') || localStorage.getItem('docmatrix_auth_user')
    const clinicId = raw ? JSON.parse(raw)?.clinicId : null
    if (clinicId) return `docmatrix_billing_${clinicId}`
  } catch {}
  return 'docmatrix_v1_billing'
}

const loaded = loadFromStorage<BillingSnapshot | null>(storageKey(), null)

let snapshot: BillingSnapshot = {
  services: Array.isArray(loaded?.services) ? loaded!.services : seedServices,
  expenses: Array.isArray(loaded?.expenses)
    ? loaded!.expenses
    : [
        {
          id: 'EXP-1001',
          date: today(),
          category: 'Lab fees',
          description: 'Zirconia crown — lab work',
          vendor: 'Smile Dental Lab',
          amount: 2200,
          mode: 'UPI',
          createdAt: new Date().toISOString(),
        },
      ],
}

const listeners = new Set<() => void>()

const commit = (next: BillingSnapshot) => {
  snapshot = next
  saveToStorage(storageKey(), snapshot)
  listeners.forEach((l) => l())
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export const useBillingData = () => useSyncExternalStore(subscribe, () => snapshot, () => snapshot)

const newId = (prefix: string) => `${prefix}-${Date.now().toString().slice(-8)}`

export function saveService(service: Omit<ServicePrice, 'id'> & { id?: string }) {
  if (service.id && snapshot.services.some((s) => s.id === service.id)) {
    commit({ ...snapshot, services: snapshot.services.map((s) => (s.id === service.id ? { ...s, ...service, id: s.id } : s)) })
    return
  }
  commit({ ...snapshot, services: [...snapshot.services, { ...service, id: newId('SRV') }] })
}

export function toggleServiceActive(id: string) {
  commit({ ...snapshot, services: snapshot.services.map((s) => (s.id === id ? { ...s, active: !s.active } : s)) })
}

export function addExpense(expense: Omit<ExpenseRecord, 'id' | 'createdAt'>) {
  const record: ExpenseRecord = { ...expense, id: newId('EXP'), createdAt: new Date().toISOString() }
  commit({ ...snapshot, expenses: [record, ...snapshot.expenses] })
  return record
}

export function deleteExpense(id: string) {
  commit({ ...snapshot, expenses: snapshot.expenses.filter((e) => e.id !== id) })
}
