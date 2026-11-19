import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TreatmentPlanDetailsModal } from '@/components/clinical/TreatmentPlanDetailsModal';
import { recordTreatmentPlanAcceptance } from '@/services/clinicStore';

const plan = {
  id: 'plan', patientId: 'PAT-1', patient: { firstName: 'Synthetic', lastName: 'Patient' },
  title: 'Synthetic treatment', procedure: 'Synthetic procedure', category: 'General',
  status: 'Proposed', cost: 100, date: '2026-11-18', doctor: 'Synthetic Doctor', stages: [],
};
vi.mock('@/services/clinicStore', () => ({
  useClinicData: () => ({ treatmentPlans: [], patientDocuments: [
    { id: 'consent', patientId: 'PAT-1', category: 'Consent', title: 'Signed consent', fileName: 'consent.pdf' },
    { id: 'foreign', patientId: 'PAT-2', category: 'Consent', title: 'Other patient', fileName: 'other.pdf' },
    { id: 'clinical', patientId: 'PAT-1', category: 'Radiology', title: 'X-ray', fileName: 'xray.png' },
  ] }),
  isDemoSession: () => false,
  recordTreatmentPlanAcceptance: vi.fn(), recordTreatmentPlanRejection: vi.fn(), updateTreatmentPlanItemStatus: vi.fn(),
}));
vi.mock('@/services/authService', () => ({ getCurrentUser: () => ({ role: 'DOCTOR' }) }));
vi.mock('@/components/clinical/TreatmentPlanWorkflow', () => ({ TreatmentPlanContext: () => null, TreatmentPlanWorkflow: () => null }));
function open() {
  render(<TreatmentPlanDetailsModal plan={plan} isOpen onClose={() => {}} onPrint={() => {}} />);
  fireEvent.click(screen.getByRole('button', { name: 'Record Patient Acceptance' }));
}
beforeEach(() => { vi.clearAllMocks(); recordTreatmentPlanAcceptance.mockResolvedValue(true); });

describe('Staff treatment-plan acceptance', () => {
  it('defaults to staff recording and offers only supported staff methods', async () => {
    open();
    expect(screen.getByRole('combobox', { name: 'Consent / Acceptance Method' })).toHaveValue('STAFF_RECORDED');
    expect(screen.queryByRole('option', { name: 'Digital Signature Form' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Patient Portal Approval' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Acceptance' }));
    await waitFor(() => expect(recordTreatmentPlanAcceptance).toHaveBeenCalledWith('plan', expect.objectContaining({ acceptanceMethod: 'STAFF_RECORDED', isStaffRecorded: true })));
  });

  it('requires same-patient Consent evidence and sends its identifier as staff recorded', async () => {
    open();
    fireEvent.change(screen.getByRole('combobox', { name: 'Consent / Acceptance Method' }), { target: { value: 'WRITTEN_CONSENT' } });
    const picker = screen.getByLabelText('Uploaded consent document');
    expect(picker).toBeRequired();
    expect(screen.queryByRole('option', { name: /Other patient/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /X-ray/ })).not.toBeInTheDocument();
    fireEvent.submit(picker.closest('form'));
    expect(recordTreatmentPlanAcceptance).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Select an uploaded consent document');
    fireEvent.change(picker, { target: { value: 'consent' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Acceptance' }));
    await waitFor(() => expect(recordTreatmentPlanAcceptance).toHaveBeenCalledWith('plan', expect.objectContaining({ acceptanceMethod: 'WRITTEN_CONSENT', evidenceDocumentId: 'consent', isStaffRecorded: true })));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Confirm Acceptance' })).not.toBeInTheDocument());
  });

  it('keeps the form open and shows a safe error when the API rejects acceptance', async () => {
    recordTreatmentPlanAcceptance.mockRejectedValue(new Error('Synthetic rejection'));
    open();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm Acceptance' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Acceptance could not be saved');
    expect(screen.getByRole('button', { name: 'Confirm Acceptance' })).toBeEnabled();
  });
});
