import { browserLocalStorage, browserSessionStorage } from '@/services/browserStorage';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { apiClient } from '@/services/apiClient';
import { useClinicLetterhead } from '@/services/useClinicLetterhead';
beforeEach(() => { browserSessionStorage.clear(); browserLocalStorage.clear(); browserSessionStorage.setItem('docmatrix_auth_token','synthetic-token'); browserSessionStorage.setItem('docmatrix_auth_user', JSON.stringify({clinicId:'clinic-a',role:'DOCTOR'})); });
afterEach(() => { vi.restoreAllMocks(); browserSessionStorage.clear(); });
it('loads saved clinic identity before allowing printing', async () => {
  vi.spyOn(apiClient,'get').mockResolvedValue({ name:'Saved clinic', address:'Saved address', phone:'000', email:'synthetic@example.test' });
  const {result} = renderHook(() => useClinicLetterhead());
  expect(result.current.ready).toBe(false);
  await waitFor(() => expect(result.current.ready).toBe(true));
  expect(result.current).toMatchObject({name:'Saved clinic',address:'Saved address',phone:'000'});
});
it('does not substitute a sample clinic when the saved profile cannot be loaded', async () => {
  vi.spyOn(apiClient,'get').mockRejectedValue(new Error('Synthetic outage'));
  const {result} = renderHook(() => useClinicLetterhead());
  await waitFor(() => expect(result.current.error).toContain('could not be loaded'));
  expect(result.current.ready).toBe(false);
  expect(result.current.address).toBe('');
});
it('does not expose the previous clinic letterhead while a new clinic is loading', async () => {
  vi.spyOn(apiClient,'get').mockResolvedValueOnce({name:'Clinic A'}).mockImplementation(() => new Promise(() => {}));
  const {result,rerender} = renderHook(() => useClinicLetterhead());
  await waitFor(() => expect(result.current.name).toBe('Clinic A'));
  browserSessionStorage.setItem('docmatrix_auth_user', JSON.stringify({clinicId:'clinic-b',role:'DOCTOR'})); rerender();
  expect(result.current.ready).toBe(false);
  expect(result.current.name).not.toBe('Clinic A');
});
