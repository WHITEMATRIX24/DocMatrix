import { browserLocalStorage, browserSessionStorage } from '@/services/browserStorage';
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { apiClient } from '@/services/apiClient'
import { clearClinicStore, initClinicSession, savePatient, updatePatient, getClinicSnapshot } from '@/services/clinicStore'
describe('Patient persistence failures', () => {
  beforeEach(() => {
    vi.restoreAllMocks(); browserLocalStorage.clear(); browserSessionStorage.clear(); clearClinicStore()
    vi.spyOn(apiClient, 'get').mockResolvedValue([])
    browserSessionStorage.setItem('docmatrix_auth_token', 'synthetic-persistence-token')
    browserSessionStorage.setItem('docmatrix_auth_user', JSON.stringify({ id: 'synthetic-owner', clinicId: 'synthetic-clinic', role: 'ORGANIZATION_ADMIN' }))
    initClinicSession('synthetic-clinic')
  })
  it('removes a failed patient registration and reports the failure', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValueOnce(new Error('Synthetic database unavailable'))
    const patient: any = savePatient({ firstName: 'Synthetic', lastName: 'Failure', mobile: '000', dateOfBirth: '2000-01-01' } as any)
    await expect(patient._syncPromise).rejects.toThrow('Synthetic database unavailable')
    expect(getClinicSnapshot().patients.find(p => p.id === patient.id)).toBeUndefined()
    expect(getClinicSnapshot().syncStatus).toBe('FAILED')
  })
  it('restores the previous patient details when an edit is rejected', async () => {
    vi.spyOn(apiClient, 'post').mockResolvedValueOnce({ id: 'synthetic-server-id' })
    const patient: any = savePatient({ firstName: 'Original', lastName: 'Synthetic', mobile: '000', dateOfBirth: '2000-01-01' } as any)
    await patient._syncPromise
    const patch = vi.spyOn(apiClient, 'patch').mockRejectedValueOnce(new Error('Synthetic edit rejected'))
    const updated = updatePatient(patient.id, { firstName: 'Unpersisted' })
    await expect(updated?._syncPromise).rejects.toThrow('Synthetic edit rejected')
    expect(getClinicSnapshot().patients.find(p => p.id === patient.id)?.firstName).toBe('Original')
    expect(patch).toHaveBeenCalledWith('/patients/synthetic-server-id', expect.objectContaining({ firstName: 'Unpersisted' }))
  })
})
