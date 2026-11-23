import { browserLocalStorage, browserSessionStorage } from '@/services/browserStorage';
import { beforeEach, expect, it, vi } from 'vitest'
import { billingApi } from '../src/services/billingApi'
import { clearBillingStore, getBillingSnapshot, initBillingSession, syncBillingMasterData } from '../src/services/billingStore'
const setUser = (role: string, clinicId = 'clinic-a') => {
  browserSessionStorage.setItem('docmatrix_auth_token', 'synthetic-token')
  browserSessionStorage.setItem('docmatrix_auth_user', JSON.stringify({ role, clinicId }))
}
beforeEach(() => { vi.restoreAllMocks(); browserSessionStorage.clear(); browserLocalStorage.clear(); clearBillingStore() })
it('loads doctor tariffs without requesting forbidden expenses', async () => {
  setUser('DOCTOR'); initBillingSession('clinic-a')
  const tariffs = vi.spyOn(billingApi, 'getTariffs').mockResolvedValue([])
  const expenses = vi.spyOn(billingApi, 'getExpenses').mockRejectedValue(new Error('Forbidden'))
  await syncBillingMasterData()
  expect(tariffs).toHaveBeenCalledOnce(); expect(expenses).not.toHaveBeenCalled()
  expect(getBillingSnapshot().error).toBeNull(); expect(getBillingSnapshot().expenses).toEqual([])
})
it('does not request billing data or retain financial caches for nurses', async () => {
  setUser('NURSE')
  browserLocalStorage.setItem('docmatrix_billing_clinic-a', JSON.stringify({ services: [{ id: 'secret' }], expenses: [{ id: 'secret' }] }))
  initBillingSession('clinic-a')
  const tariffs = vi.spyOn(billingApi, 'getTariffs').mockResolvedValue([])
  const expenses = vi.spyOn(billingApi, 'getExpenses').mockResolvedValue([])
  await syncBillingMasterData()
  expect(tariffs).not.toHaveBeenCalled(); expect(expenses).not.toHaveBeenCalled()
  expect(getBillingSnapshot().services).toEqual([]); expect(getBillingSnapshot().expenses).toEqual([])
})
it('discards a response from a previous clinic session', async () => {
  setUser('ACCOUNTANT'); initBillingSession('clinic-a')
  let resolveExpenses!: (value: any[]) => void
  vi.spyOn(billingApi, 'getTariffs').mockResolvedValue([])
  vi.spyOn(billingApi, 'getExpenses').mockImplementation(() => new Promise(resolve => { resolveExpenses = resolve }))
  const pending = syncBillingMasterData()
  setUser('ACCOUNTANT', 'clinic-b'); initBillingSession('clinic-b')
  resolveExpenses([{ id: 'old-clinic-expense', amount: 12345 }])
  await pending
  expect(getBillingSnapshot().expenses).toEqual([])
})
