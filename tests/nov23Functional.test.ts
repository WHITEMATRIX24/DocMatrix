import { browserLocalStorage, browserSessionStorage } from '@/services/browserStorage';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { apiClient } from '@/services/apiClient';
import { registerWalkIn, resetStoreForTesting, getClinicSnapshot } from '@/services/clinicStore';
import { parsePatientCsv, verifiedBirthDate } from '@/services/patientImport';
beforeEach(() => { browserLocalStorage.clear(); browserSessionStorage.clear(); resetStoreForTesting(); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); browserSessionStorage.clear(); });
it('times out a stalled write without retrying it', async () => {
  vi.useFakeTimers(); const transport = vi.fn(() => new Promise(() => {})); vi.stubGlobal('fetch', transport);
  const request = apiClient.post('/synthetic', {}, { timeoutMs: 25 });
  const rejected = expect(request).rejects.toThrow('timed out');
  await vi.advanceTimersByTimeAsync(26); await rejected; expect(transport).toHaveBeenCalledOnce();
});
it('honors caller cancellation', async () => {
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
  const controller = new AbortController(); const request = apiClient.get('/synthetic', undefined, { signal: controller.signal });
  controller.abort(); await expect(request).rejects.toMatchObject({ name: 'AbortError' });
});
it('retains a saved walk-in patient after appointment failure and reuses it on retry', async () => {
  browserSessionStorage.setItem('docmatrix_auth_token','synthetic-token'); browserSessionStorage.setItem('docmatrix_auth_user',JSON.stringify({clinicId:'synthetic-clinic',role:'RECEPTIONIST'}));
  let appointmentAttempts=0;
  const post = vi.spyOn(apiClient,'post').mockImplementation(async (path: string) => {
    if(path==='/patients') return {id:'patient-id',patientCode:'PAT-SYNTHETIC'} as any;
    if(++appointmentAttempts===1) throw new Error('Synthetic appointment rejection');
    return {id:'appointment-id'} as any;
  });
  const data={patientName:'Synthetic Walkin',mobile:'0001112223',gender:'undisclosed',age:'',dateOfBirth:'2000-01-02',complaint:'Synthetic',doctor:'',priority:'normal' as const};
  await expect(registerWalkIn(data)).rejects.toThrow('appointment rejection');
  expect(getClinicSnapshot().appointments).toHaveLength(0);
  await expect(registerWalkIn(data)).resolves.toMatchObject({backendId:'appointment-id'});
  expect(post.mock.calls.filter(([path])=>path==='/patients')).toHaveLength(1);
  const calls = post.mock.calls.length;
  await expect(registerWalkIn({...data,patientName:'Different Family Member'})).rejects.toThrow('differently named');
  expect(post).toHaveBeenCalledTimes(calls);
});
it('never invents a birth date from age or accepts invalid calendar dates', () => {
  expect(verifiedBirthDate('32')).toBeNull(); expect(verifiedBirthDate()).toBeNull();
  expect(verifiedBirthDate('2025-02-29')).toBeNull(); expect(verifiedBirthDate('2999-01-01')).toBeNull();
  expect(verifiedBirthDate('2000-02-29')).toBe('2000-02-29');
});
it('parses quoted commas, escaped quotes and embedded newlines without shifting columns', () => {
  expect(parsePatientCsv('Name,City,Notes\r\n"Synthetic, Patient","Test City","Said ""yes""\nagain"')).toEqual([['Name','City','Notes'],['Synthetic, Patient','Test City','Said "yes"\nagain']]);
  expect(()=>parsePatientCsv('Name\n"unfinished')).toThrow('unclosed');
});
