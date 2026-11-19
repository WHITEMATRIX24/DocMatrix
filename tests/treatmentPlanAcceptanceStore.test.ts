import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addTreatmentPlan, getClinicSnapshot, recordTreatmentPlanAcceptance, resetStoreForTesting } from '@/services/clinicStore';
import { apiClient } from '@/services/apiClient';

vi.mock('@/services/apiClient', () => ({ apiClient: { post: vi.fn(), get: vi.fn(async () => []) } }));
const dto = { versionNumber: 1, patientAcceptedByName: 'Synthetic Patient', acceptanceMethod: 'WRITTEN_CONSENT' as const, isStaffRecorded: true, evidenceDocumentId: 'consent' };
function create() {
  const plan = addTreatmentPlan({ backendId: 'remote-plan', patientId: 'PAT-1', title: 'Synthetic', procedure: 'Synthetic', category: 'General', toothNumber: '', status: 'Proposed', cost: 100, doctor: 'Synthetic', notes: '' });
  sessionStorage.setItem('docmatrix_auth_token', 'synthetic-test-token');
  return plan;
}
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); resetStoreForTesting(); vi.clearAllMocks(); });
describe('Acceptance persistence', () => {
  it('leaves the plan proposed until the backend confirms acceptance', async () => {
    const plan = create();
    let resolve!: (value: unknown) => void;
    vi.mocked(apiClient.post).mockReturnValueOnce(new Promise(done => { resolve = done; }));
    const pending = recordTreatmentPlanAcceptance(plan.id, dto);
    expect(getClinicSnapshot().treatmentPlans.find(p => p.id === plan.id)?.status).toBe('Proposed');
    expect(apiClient.post).toHaveBeenCalledWith('/treatment-plans/remote-plan/accept', dto);
    resolve({});
    await expect(pending).resolves.toBe(true);
    expect(getClinicSnapshot().treatmentPlans.find(p => p.id === plan.id)?.status).toBe('Accepted');
  });

  it('propagates API rejection without claiming acceptance locally', async () => {
    const plan = create();
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Synthetic rejection'));
    await expect(recordTreatmentPlanAcceptance(plan.id, dto)).rejects.toThrow('Synthetic rejection');
    expect(getClinicSnapshot().treatmentPlans.find(p => p.id === plan.id)?.status).toBe('Proposed');
    expect(plan.patientAcceptedAt).toBeUndefined();
  });
});
