import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CalendarPage } from '@/pages/appointments/CalendarPage';
import { NewAppointmentPage } from '@/pages/appointments/NewAppointmentPage';
import { AppointmentDetailPage } from '@/pages/appointments/AppointmentDetailPage';
import { seedClinicFixture } from './fixtures/clinic';
import { bookAppointment, DENTISTS, getClinicSnapshot, updateAppointmentStatus } from '@/services/clinicStore';
import { browserSessionStorage } from '@/services/browserStorage';
import { apiClient } from '@/services/apiClient';
import { getClinicNow, getAppointmentTimeSlots, setAppointmentScheduleConfig } from '@/services/appointmentPolicy';

beforeEach(() => { vi.restoreAllMocks(); vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2030-01-07T04:00:00Z')); seedClinicFixture('DOCTOR'); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); setAppointmentScheduleConfig(); });
const create = (extra: Record<string, unknown> = {}) => bookAppointment({ patientId: 'pt-1001', doctor: DENTISTS[0].name, visitType: 'Consultation', treatmentType: 'Dental Examination', date: '2030-01-07', time: '10:00', ...extra });
function authenticate() {
  browserSessionStorage.removeItem('docmatrix-demo-session');
  browserSessionStorage.setItem('docmatrix_auth_user', JSON.stringify({ id: 'ui-doctor', clinicId: 'ui-clinic', role: 'DOCTOR' }));
  browserSessionStorage.setItem('docmatrix_auth_token', 'ui-synthetic-token');
}

describe('Appointment workflow screens', () => {
  it('requires explicit selection before rescheduling from the calendar header', () => {
    const first = create(); const second = create({ date: '2030-01-08' });
    render(<MemoryRouter><CalendarPage /></MemoryRouter>);
    fireEvent.click(screen.getByTitle('Reschedule an appointment'));
    expect(screen.getByText('Choose an appointment to reschedule')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Reschedule Appointment' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Appointment to reschedule'), { target: { value: second.id } });
    expect(screen.getByRole('heading', { name: 'Reschedule Appointment' })).toBeInTheDocument();
    expect(screen.getByLabelText(/new date/i)).toHaveValue('2030-01-08');
    expect(getClinicSnapshot().appointments.find(a => a.id === first.id)?.date).toBe('2030-01-07');
  });
  it('offers a linked separate revisit for a completed appointment', () => {
    const a = create(); updateAppointmentStatus(a.id, 'checked-in'); updateAppointmentStatus(a.id, 'in-progress'); updateAppointmentStatus(a.id, 'completed');
    render(<MemoryRouter initialEntries={[`/appointments/${a.id}`]}><Routes><Route path="/appointments/:id" element={<AppointmentDetailPage />} /></Routes></MemoryRouter>);
    expect(screen.getByRole('button', { name: 'Reschedule Booking' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Book Revisit' })).toHaveAttribute('href', `/appointments/new?patientId=pt-1001&revisitOfId=${encodeURIComponent(a.id)}`);
    expect(getClinicSnapshot().appointments.find(entry => entry.id === a.id)?.status).toBe('completed');
  });
  it('shows no booking success before server confirmation and surfaces a rejected save', async () => {
    authenticate();
    let rejectSave!: (reason: Error) => void;
    vi.spyOn(apiClient, 'post').mockImplementation(() => new Promise((_, reject) => { rejectSave = reject; }));
    render(<MemoryRouter initialEntries={['/appointments/new?patientId=pt-1001']}><NewAppointmentPage /></MemoryRouter>);
    const submit = screen.getByRole('button', { name: 'Confirm & Book Appointment' });
    fireEvent.click(submit);
    expect(submit).toBeDisabled();
    expect(screen.queryByText('Appointment Confirmed!')).not.toBeInTheDocument();
    await act(async () => { rejectSave(new Error('The slot was taken by another receptionist.')); });
    expect(await screen.findByRole('alert')).toHaveTextContent('slot was taken');
    expect(screen.queryByText('Appointment Confirmed!')).not.toBeInTheDocument();
    expect(getClinicSnapshot().appointments).toHaveLength(0);
  });
  it('waits for a persisted booking and retains its reference for retry', async () => {
    authenticate();
    let resolveSave!: (value: unknown) => void;
    const post = vi.spyOn(apiClient, 'post').mockRejectedValueOnce(new Error('Response lost')).mockImplementationOnce(() => new Promise(resolve => { resolveSave = resolve; }));
    render(<MemoryRouter initialEntries={['/appointments/new?patientId=pt-1001']}><NewAppointmentPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Confirm & Book Appointment' }));
    await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Confirm & Book Appointment' }));
    await waitFor(() => expect(post).toHaveBeenCalledTimes(2));
    const first = post.mock.calls[0][1] as any; const retry = post.mock.calls[1][1] as any;
    expect(retry.bookingRef).toBe(first.bookingRef);
    expect(screen.queryByText('Appointment Confirmed!')).not.toBeInTheDocument();
    await act(async () => { resolveSave({ ...retry, id: 'persisted-booking', doctor: retry.doctorName, patientCode: 'pt-1001', status: 'scheduled' }); });
    expect(await screen.findByText('Appointment Confirmed!')).toBeInTheDocument();
    expect(getClinicSnapshot().appointments).toHaveLength(1);
  });
  it('uses clinic timezone at midnight and configured evening slots', () => {
    setAppointmentScheduleConfig({ timezone: 'Asia/Kolkata', workingHours: { weekdays: '10:00 AM - 10:00 PM' } });
    expect(getClinicNow(new Date('2030-01-06T18:45:00Z'))).toEqual({ date: '2030-01-07', time: '00:15' });
    expect(getAppointmentTimeSlots('2030-01-07')).toContain('21:30');
    setAppointmentScheduleConfig({ timezone: 'America/New_York' });
    expect(getClinicNow(new Date('2030-01-07T04:00:00Z')).date).toBe('2030-01-06');
  });
});
