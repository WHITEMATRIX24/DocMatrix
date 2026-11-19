import { describe, expect, it } from 'vitest';
import { buildAppointmentLineItem } from '@/pages/billing/BillingShared';
import type { AppointmentRecord, TreatmentPlanRecord } from '@/services/clinicStore';

const appointment: AppointmentRecord = {
  id: 'appointment', patientId: 'patient-a', patientName: 'Synthetic Patient',
  doctor: 'Synthetic Doctor', visitType: 'Synthetic procedure', date: '2026-11-18',
  time: '09:00', status: 'completed', createdAt: '2026-11-18T00:00:00.000Z',
};
const plan: TreatmentPlanRecord = {
  id: 'plan', patientId: 'patient-a', procedure: 'Synthetic procedure', category: 'General',
  toothNumber: '16', status: 'Accepted', cost: 100, doctor: 'Synthetic Doctor', date: '2026-11-18',
};

describe('Appointment billing treatment-plan patient matching', () => {
  it('links a matching patient identifier without requiring a display name', () => {
    const result = buildAppointmentLineItem({ appointment: { ...appointment, patientName: undefined }, services: [], treatmentPlans: [plan] });
    expect(result).toMatchObject({ treatmentPlanId: 'plan', lineItem: { unitPrice: 100, toothNumber: '16' } });
  });

  it('does not use another patient plan for the same procedure', () => {
    const result = buildAppointmentLineItem({ appointment, services: [], treatmentPlans: [{ ...plan, patientId: 'patient-b' }] });
    expect(result?.treatmentPlanId).toBeUndefined();
    expect(result?.lineItem.unitPrice).toBe(0);
    expect(result?.lineItem.toothNumber).toBeUndefined();
  });
});
