import { browserLocalStorage, browserSessionStorage } from '@/services/browserStorage';
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '../src/services/apiClient'
import { billingApi } from '../src/services/billingApi'
import { canClinic } from '../src/services/permissions'
import { FEATURE_REGISTRY } from '../src/features/registry'
import { clearClinicStore, getClinicSnapshot, initClinicSession, syncWithBackend, updateAppointmentStatus } from '../src/services/clinicStore'
vi.mock('../src/services/billingStore', () => ({ syncBillingMasterData: vi.fn(async () => {}) }))
const roles = ['ORGANIZATION_ADMIN', 'BRANCH_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'ACCOUNTANT', 'NURSE', 'LAB_TECHNICIAN', 'PHARMACIST']
const setRole = (role: string, extra = {}) => {
  browserSessionStorage.setItem('docmatrix_auth_token', 'synthetic-access-token')
  browserSessionStorage.setItem('docmatrix_auth_user', JSON.stringify({ clinicId: 'clinic-a', role, ...extra }))
}
beforeEach(() => { browserLocalStorage.clear(); browserSessionStorage.clear(); vi.restoreAllMocks(); clearClinicStore() })
describe('Role-aware clinic synchronization', () => {
  it.each(roles)('requests only permitted datasets for %s', async role => {
    setRole(role); initClinicSession('clinic-a')
    const user = { role, clinicId: 'clinic-a' }
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue([])
    const invoices = vi.spyOn(billingApi, 'getInvoices').mockResolvedValue({ data: [] } as any)
    await syncWithBackend()
    expect(getClinicSnapshot().syncStatus).toBe('SYNCHRONIZED')
    const paths = get.mock.calls.map(call => call[0])
    for (const [path, operation] of [
      ['/patients?includeArchived=true', 'patient.read'], ['/appointments', 'appointment.read'],
      ['/clinical/tooth-charts', 'clinical.read'], ['/clinical-notes', 'clinical.read'],
      ['/prescriptions', 'clinical.read'], ['/clinical/documents', 'document.read'],
      ['/clinical/consents', 'consent.read'], ['/enquiries', 'appointment.schedule'], ['/treatment-plans', 'treatment.read'],
    ] as const) expect(paths.includes(path), `${role}: ${path}`).toBe(canClinic(user, operation))
    expect(paths.includes('/billing/treatment-plans')).toBe(!canClinic(user, 'treatment.read') && canClinic(user, 'billing.invoice.read'))
    expect(invoices).toHaveBeenCalledTimes(canClinic(user, 'billing.invoice.read') ? 1 : 0)
  })
  it('does not call clinic APIs for a platform session', async () => {
    setRole('ORGANIZATION_ADMIN', { isPlatformAdmin: true }); initClinicSession('clinic-a')
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue([])
    const invoices = vi.spyOn(billingApi, 'getInvoices').mockResolvedValue({ data: [] } as any)
    await syncWithBackend(); expect(get).not.toHaveBeenCalled(); expect(invoices).not.toHaveBeenCalled()
  })
  it('retains permitted records and reports a permission failure without expiring the session', async () => {
    setRole('RECEPTIONIST'); initClinicSession('clinic-a')
    vi.spyOn(apiClient, 'get').mockImplementation(async path => path.startsWith('/patients') ? [{ id: 'p1', firstName: 'Synthetic', lastName: 'Patient' }] as any : [])
    vi.spyOn(billingApi, 'getInvoices').mockResolvedValue({ data: [] } as any)
    await syncWithBackend(); expect(getClinicSnapshot().patients).toHaveLength(1)
    vi.mocked(apiClient.get).mockRejectedValue({ status: 403, message: 'Permission denied' })
    await syncWithBackend(); expect(getClinicSnapshot().syncStatus).toBe('FAILED'); expect(getClinicSnapshot().patients).toHaveLength(1)
  })
  it('does not silently replace authoritative data with empty lists on server failure', async () => {
    setRole('DOCTOR'); initClinicSession('clinic-a')
    vi.spyOn(apiClient, 'get').mockRejectedValue({ status: 500, message: 'Server unavailable' })
    vi.spyOn(billingApi, 'getInvoices').mockResolvedValue({ data: [] } as any)
    await syncWithBackend(); expect(getClinicSnapshot().syncStatus).toBe('FAILED')
  })
  it('discards clinical cache when a session switches to reception', () => {
    setRole('RECEPTIONIST')
    browserLocalStorage.setItem('docmatrix_clinic_data_clinic-a', JSON.stringify({ clinicalNotes: [{ id: 'secret' }], prescriptions: [{ id: 'secret' }], treatmentPlans: [{ id: 'secret' }], toothCharts: { secret: {} } }))
    initClinicSession('clinic-a')
    const state = getClinicSnapshot()
    expect(state.clinicalNotes).toEqual([]); expect(state.prescriptions).toEqual([]); expect(state.treatmentPlans).toEqual([]); expect(state.toothCharts).toEqual({})
  })
  it('sends a nurse check-in without scheduling fields and blocks consultation locally', async () => {
    setRole('NURSE'); initClinicSession('clinic-a')
    vi.spyOn(apiClient, 'get').mockImplementation(async path => path === '/appointments'
      ? [{ id: 'own', patientId: 'p1', date: '2026-11-19', time: '11:30', status: 'scheduled' }] as any : [])
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({})
    await syncWithBackend()
    await updateAppointmentStatus('own', 'checked-in', 'Patient arrived at clinic.')
    expect(patch).toHaveBeenCalledWith('/appointments/own', { status: 'checked-in', reason: 'Patient arrived at clinic.', expectedRevision: 0 })
    expect(() => updateAppointmentStatus('own', 'completed')).toThrow(/Your role/)
    expect(getClinicSnapshot().appointments[0].status).toBe('checked-in')
  })
  it('fails closed for missing, unknown and platform roles', () => {
    expect(canClinic({ clinicId: 'clinic-a' }, 'clinical.read')).toBe(false)
    expect(canClinic({ clinicId: 'clinic-a', role: 'DENTIST' }, 'billing.invoice.read')).toBe(false)
    expect(canClinic({ clinicId: 'clinic-a', role: 'ORGANIZATION_ADMIN', isPlatformAdmin: true }, 'patient.read')).toBe(false)
  })
  it('aligns navigation with the approved role boundaries', () => {
    const rolesFor = (id: string) => FEATURE_REGISTRY.find(f => f.id === id)?.roles || []
    expect(rolesFor('appt.calendar')).not.toContain('ACCOUNTANT')
    expect(rolesFor('appt.new')).not.toContain('NURSE')
    expect(rolesFor('clin.notes')).not.toContain('RECEPTIONIST')
    expect(rolesFor('rep.revenue')).not.toContain('DOCTOR')
    expect(rolesFor('rep.followups')).not.toContain('ACCOUNTANT')
  })
})
