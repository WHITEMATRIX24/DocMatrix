import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { browserLocalStorage, browserSessionStorage } from '@/services/browserStorage';
import { apiClient } from '@/services/apiClient';
import { clearCallInNotificationCache, sendCallInWhatsAppMessage } from '@/services/whatsappService';
import { bookAppointment, checkDentistAvailability, DENTISTS, getClinicSnapshot, mapRemoteAppointment,
  onAppointmentCompleted, rescheduleAppointment, resetStoreForTesting, updateAppointmentStatus } from '@/services/clinicStore';

// Regression tests use synthetic records and mocked transport; never production writes.
beforeEach(() => {
  vi.restoreAllMocks(); browserLocalStorage.clear(); browserSessionStorage.clear(); resetStoreForTesting(); clearCallInNotificationCache();
});
afterEach(() => { vi.restoreAllMocks(); });
const make = (extra: Record<string, unknown> = {}) => bookAppointment({
  patientId: 'AUDIT-PATIENT', doctor: DENTISTS[0].name, chair: 'Chair 1',
  visitType: 'Review', date: '2030-01-07', time: '10:00', durationMinutes: 30, ...extra,
} as any);
const complete = (id: string) => { updateAppointmentStatus(id, 'checked-in'); updateAppointmentStatus(id, 'in-progress'); updateAppointmentStatus(id, 'completed'); };
const current = (id: string) => getClinicSnapshot().appointments.find(a => a.id === id)!;
function authenticate() {
  browserSessionStorage.setItem('docmatrix_auth_user', JSON.stringify({ id: 'audit-doctor', clinicId: 'audit-clinic', role: 'DOCTOR', isVerifiedPractitioner: true }));
  browserSessionStorage.setItem('docmatrix_auth_token', 'audit-token');
}

describe('Appointment workflow controls', () => {
  it('moves only a separately booked revisit and preserves the earlier visit', () => {
    const earlier = make();
    complete(earlier.id);
    const revisit = make({ date: '2030-01-08' });
    expect(rescheduleAppointment(revisit.id, '2030-01-09', '11:00', 'Patient requested')).toMatchObject({ success: true });
    expect(current(earlier.id)).toMatchObject({ date: '2030-01-07', status: 'completed' });
    expect(current(revisit.id)).toMatchObject({ date: '2030-01-09', time: '11:00' });
    expect(getClinicSnapshot().appointments).toHaveLength(2);
  });
  it('blocks an ordinary overlap for a listed doctor', () => {
    make(); const other = make({ time: '11:00' });
    expect(rescheduleAppointment(other.id, '2030-01-07', '10:00', 'Move').success).toBe(false);
  });
  it('restores an appointment when its server save rejects', async () => {
    const a = make(); a.backendId = 'remote-a'; authenticate();
    vi.spyOn(apiClient, 'patch').mockRejectedValue(new Error('Rejected'));
    const result = rescheduleAppointment(a.id, '2030-01-08', '11:00', 'Move');
    await expect(result._syncPromise).rejects.toThrow('Rejected');
    expect(current(a.id)).toMatchObject({ date: '2030-01-07', time: '10:00' });
  });
});

describe('Appointment workflow safety', () => {
  it('rejects an emergency overlap that crosses clinic midnight', () => {
    make({ time: '23:45', durationMinutes: 60, priority: 'emergency' });
    expect(checkDentistAvailability(DENTISTS[0].name, '2030-01-08', '00:15', 30, undefined, 'Chair 1', 'emergency').available).toBe(false);
  });
  it('rejects invalid calendar input without crashing the slot picker', () => {
    expect(checkDentistAvailability(DENTISTS[0].name, '2030-99-99', '10:00').available).toBe(false);
  });
  it('A01: refuses to move and reopen a completed visit', () => {
    const a = make(); complete(a.id);
    rescheduleAppointment(a.id, '2030-01-08', '11:00', 'Revisit');
    expect(current(a.id)).toMatchObject({ date: '2030-01-07', status: 'completed' });
  });
  it('A03: preserves reschedule history when the server record is mapped again', () => {
    const a = make(); rescheduleAppointment(a.id, '2030-01-08', '11:00', 'Travel');
    expect(mapRemoteAppointment({ ...current(a.id) }).rescheduleHistory).toHaveLength(1);
  });
  it('A04: rejects overlapping appointments for a doctor missing from the roster', () => {
    make({ doctor: 'Visiting Audit Doctor' });
    expect(checkDentistAvailability('Visiting Audit Doctor', '2030-01-07', '10:00', 30).available).toBe(false);
  });
  it('A05: checks chair conflicts across different doctors in the picker', () => {
    make({ doctor: 'Visiting Audit Doctor', chair: 'Chair 1' });
    expect(checkDentistAvailability(DENTISTS[0].name, '2030-01-07', '10:00', 30).available).toBe(false);
  });
  it('A07: cannot bypass an overlap hidden behind a lunch advisory in the store', () => {
    make({ time: '13:00' }); const other = make({ time: '11:00' });
    expect(rescheduleAppointment(other.id, '2030-01-07', '13:00', 'Move').success).toBe(false);
  });
  it('A08: does not report success without a save for a pending local booking', () => {
    const a = make(); authenticate();
    const patch = vi.spyOn(apiClient, 'patch').mockResolvedValue({});
    const result = rescheduleAppointment(a.id, '2030-01-08', '11:00', 'Move');
    expect(result.success && !result._syncPromise && patch.mock.calls.length === 0).toBe(false);
  });
  it('A09: propagates a failed booking save so callers can reject confirmation', async () => {
    authenticate(); vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('Slot taken'));
    const a = make();
    await expect((a as any)._syncPromise).rejects.toThrow('Slot taken');
  });
  it('A10: rejects changing a cancelled appointment directly to completed', () => {
    const a = make(); updateAppointmentStatus(a.id, 'cancelled', 'Patient unavailable'); expect(() => updateAppointmentStatus(a.id, 'completed')).toThrow('Cannot change');
    expect(current(a.id).status).toBe('cancelled');
  });
  it('A11: does not notify billing listeners before completion is persisted', async () => {
    const a = make(); updateAppointmentStatus(a.id, 'checked-in'); updateAppointmentStatus(a.id, 'in-progress'); current(a.id).backendId = 'remote-a'; authenticate();
    const listener = vi.fn(); const unsubscribe = onAppointmentCompleted(listener);
    vi.spyOn(apiClient, 'patch').mockRejectedValue(new Error('Consent rejected'));
    try {
      await expect(updateAppointmentStatus(a.id, 'completed')).rejects.toThrow('Consent rejected');
      expect(listener).not.toHaveBeenCalled();
    } finally { unsubscribe(); }
  });
  it('A12: preserves arrival and consultation timestamps on a server refresh', () => {
    const a = make(); updateAppointmentStatus(a.id, 'checked-in');
    expect(mapRemoteAppointment({ ...current(a.id) }).checkInTime).toBe(current(a.id).checkInTime);
  });
  it('A15: a failed older reschedule cannot undo a newer successful reschedule', async () => {
    const a = make(); a.backendId = 'remote-a'; authenticate();
    let rejectOld!: (error: Error) => void;
    vi.spyOn(apiClient, 'patch').mockImplementationOnce(() => new Promise((_, reject) => { rejectOld = reject; })).mockResolvedValueOnce({});
    const old = rescheduleAppointment(a.id, '2030-01-08', '11:00', 'First');
    const newer = rescheduleAppointment(a.id, '2030-01-09', '12:00', 'Second');
    expect(newer.success).toBe(false); rejectOld(new Error('Older request rejected'));
    await expect(old._syncPromise).rejects.toThrow('Older request rejected');
    const retry = rescheduleAppointment(a.id, '2030-01-09', '12:00', 'Retry');
    await retry._syncPromise;
    expect(current(a.id)).toMatchObject({ date: '2030-01-09', time: '12:00' });
  });
  it('A18: a blocked WhatsApp window must not be reported as sent', async () => {
    const a = make(); vi.spyOn(window, 'open').mockReturnValue(null);
    const result = await sendCallInWhatsAppMessage(a, { id: 'AUDIT-PATIENT', firstName: 'Audit', lastName: 'Patient', mobile: '9876543210', countryCode: '+91' } as any);
    expect(result.sent).toBe(false);
  });
  it('A22: preserves the server cancellation reason in refreshed records', () => {
    const a = make();
    expect(mapRemoteAppointment({ ...a, status: 'cancelled', cancellationReason: 'Patient unavailable' }).cancellationReason).toBe('Patient unavailable');
  });
  it('A23: submitting the unchanged appointment must not add a reschedule history entry', () => {
    const a = make(); rescheduleAppointment(a.id, a.date, a.time, 'No change');
    expect(current(a.id).rescheduleHistory || []).toHaveLength(0);
  });
});
