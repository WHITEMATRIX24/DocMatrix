import { describe, expect, it } from 'vitest';
import { createPrivateStorage } from '@/services/browserStorage';
describe('Private browser storage', () => {
  it('purges legacy secrets and PHI, keeps new values only in memory, and preserves UI preferences', () => {
    const native = window.localStorage; native.clear();
    native.setItem('docmatrix_auth_token', 'legacy-secret'); native.setItem('docmatrix_clinic_data_clinic-a', 'patient'); native.setItem('docmatrix_remember_email', 'test@example.test');
    const storage = createPrivateStorage(native);
    expect(native.getItem('docmatrix_auth_token')).toBeNull(); expect(native.getItem('docmatrix_clinic_data_clinic-a')).toBeNull();
    storage.setItem('docmatrix_auth_token', 'new-secret'); storage.setItem('docmatrix_clinic_data_clinic-a', 'new-patient');
    expect(storage.getItem('docmatrix_auth_token')).toBe('new-secret'); expect(native.getItem('docmatrix_auth_token')).toBeNull();
    expect(createPrivateStorage(native).getItem('docmatrix_clinic_data_clinic-a')).toBeNull();
    expect(storage.getItem('docmatrix_remember_email')).toBe('test@example.test');
  });
});
