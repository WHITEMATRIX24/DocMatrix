import { browserLocalStorage, browserSessionStorage } from '@/services/browserStorage';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/services/apiClient';
import { addTreatmentPlan, getClinicSnapshot, resetStoreForTesting, updateTreatmentPlanStatus } from '@/services/clinicStore';
import { addBatchToItem, deleteInventoryItem, getAdaptiveInventorySnapshot, seedDemoInventoryForTesting, updateInventoryItem } from '@/services/adaptiveInventoryStore';
import { login, loginWithGoogle } from '@/services/authService';

beforeEach(() => {
  vi.restoreAllMocks(); vi.unstubAllEnvs(); browserLocalStorage.clear(); browserSessionStorage.clear(); resetStoreForTesting(); seedDemoInventoryForTesting();
});
function authenticate() {
  browserSessionStorage.setItem('docmatrix_auth_user', JSON.stringify({ clinicId: 'synthetic-clinic', role: 'DOCTOR' }));
  browserSessionStorage.setItem('docmatrix_auth_token', 'synthetic-access-token');
}
describe('Server-confirmed clinic changes', () => {
  it('preserves plan status on an API rejection and requires acceptance evidence', async () => {
    const plan = addTreatmentPlan({ backendId: 'remote-plan', patientId: 'PAT-1', title: 'Synthetic', procedure: 'Synthetic', category: 'General', toothNumber: '', status: 'In Progress', cost: 100, doctor: 'Synthetic', notes: '' });
    authenticate();
    const patch = vi.spyOn(apiClient, 'patch').mockRejectedValue(new Error('Synthetic failure'));
    await expect(updateTreatmentPlanStatus(plan.id, 'Completed')).rejects.toThrow('Synthetic failure');
    expect(getClinicSnapshot().treatmentPlans.find(p => p.id === plan.id)?.status).toBe('In Progress');
    await expect(updateTreatmentPlanStatus(plan.id, 'Accepted')).rejects.toThrow('evidence');
    expect(patch).toHaveBeenCalledOnce();
  });
  it('keeps a batch receipt pending until the server confirms it', async () => {
    authenticate();
    const item = getAdaptiveInventorySnapshot().items[0];
    const before = JSON.stringify(item);
    let confirm!: (value: unknown) => void;
    vi.spyOn(apiClient, 'post').mockImplementationOnce(() => new Promise(resolve => { confirm = resolve; }));
    const pending = addBatchToItem(item.id, { batchNumber: 'NEW-LOT', quantity: 3, expiryDate: '2030-01-01', location: 'Synthetic' });
    expect(JSON.stringify(getAdaptiveInventorySnapshot().items[0])).toBe(before);
    confirm({}); await pending;
    expect(getAdaptiveInventorySnapshot().items[0].activeBatches.some(b => b.batchNumber === 'NEW-LOT')).toBe(true);
  });
  it('merges a confirmed receipt into an existing lot without duplicating the lot', async () => {
    authenticate();
    const item = getAdaptiveInventorySnapshot().items[0];
    const batch = item.activeBatches[0];
    const beforeCount = item.activeBatches.length;
    vi.spyOn(apiClient, 'post').mockResolvedValue({});
    await addBatchToItem(item.id, { ...batch, quantity: 3 });
    const updated = getAdaptiveInventorySnapshot().items[0];
    expect(updated.activeBatches).toHaveLength(beforeCount);
    expect(updated.activeBatches.find(b => b.batchNumber === batch.batchNumber)?.quantity).toBe(batch.quantity + 3);
  });
  it('preserves inventory edits and deletion when persistence fails', async () => {
    authenticate();
    const item = getAdaptiveInventorySnapshot().items[0];
    const before = JSON.stringify(item);
    vi.spyOn(apiClient, 'patch').mockRejectedValue(new Error('Synthetic failure'));
    vi.spyOn(apiClient, 'delete').mockRejectedValue(new Error('Synthetic failure'));
    await expect(updateInventoryItem(item.id, { name: 'Unsaved' })).rejects.toThrow();
    await expect(deleteInventoryItem(item.id)).rejects.toThrow();
    expect(JSON.stringify(getAdaptiveInventorySnapshot().items[0])).toBe(before);
  });
});
describe('Production authentication boundaries', () => {
  it('does not create a synthetic Google session', async () => {
    await expect(loginWithGoogle()).rejects.toThrow('not available');
    expect(browserSessionStorage.getItem('docmatrix_auth_token')).toBeNull();
  });
  it('rejects malformed successful sign-in responses in production', async () => {
    vi.stubEnv('MODE', 'production');
    vi.spyOn(apiClient, 'post').mockResolvedValue({});
    await expect(login('synthetic@example.test', 'synthetic-password')).rejects.toThrow('invalid sign-in response');
    expect(browserSessionStorage.getItem('docmatrix_auth_token')).toBeNull();
  });
});
