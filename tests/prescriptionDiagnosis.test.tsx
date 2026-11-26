import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import * as store from '@/services/clinicStore';
import { PrescriptionModal } from '@/components/clinical/PrescriptionModal';
import { ClinicalNoteDetailsModal } from '@/components/clinical/ClinicalNoteDetailsModal';
import { seedClinicFixture } from './fixtures/clinic';

const patient = { id: 'PAT-1', backendId: 'patient-uuid', firstName: 'Synthetic', lastName: 'Patient' } as store.PatientRecord;
const note = { id: 'note-1', patientId: 'PAT-1', status: 'FINALIZED', primaryDiagnosis: 'Recorded consultation diagnosis', visitDate: '2030-01-07', consultationDate: '2030-01-07T09:00:00Z', noteNumber: 'CN-1', treatmentPerformed: 'Recorded treatment' } as store.ClinicalNoteRecord;
let notes: store.ClinicalNoteRecord[];
beforeEach(() => {
  vi.restoreAllMocks(); seedClinicFixture('DOCTOR'); vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2030-01-07T09:00:00Z'));
  notes = [note];
  vi.spyOn(store, 'useClinicData').mockImplementation(() => ({ patients: [patient, { ...patient, id: 'PAT-2', backendId: 'other-patient', firstName: 'Other' }], clinicalNotes: notes }) as any);
});
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
const show = (extra: Record<string, unknown> = {}) => render(<PrescriptionModal onClose={() => {}} onSaved={() => {}} defaultPatientId="patient-uuid" {...extra} />);
const diagnosis = () => screen.getByLabelText(/Clinical Diagnosis/);

describe('Prescription consultation diagnosis', () => {
  it('opens a prescription directly from the finalized consultation with its diagnosis', () => {
    render(<ClinicalNoteDetailsModal note={note} onClose={() => {}} onPrint={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Issue Prescription' }));
    expect(diagnosis()).toHaveValue(note.primaryDiagnosis);
    expect(screen.getByLabelText('Consultation / Treatment')).toHaveValue(note.id);
  });
  it('fills an empty legacy draft while preserving drafts that already have a diagnosis', () => {
    show({ initialPrescription: { id: 'empty-draft', patientId: 'patient-uuid', diagnosis: '', prescribedAt: '2030-01-07', status: 'DRAFT', items: [] } });
    expect(diagnosis()).toHaveValue(note.primaryDiagnosis);
  });
  it('automatically fills the diagnosis from the matching finalized consultation using patient aliases', () => {
    show(); expect(diagnosis()).toHaveValue(note.primaryDiagnosis);
    expect(screen.getByLabelText('Consultation / Treatment')).toHaveValue(note.id);
  });
  it('requires an explicit consultation when the patient has multiple finalized visits that day', () => {
    notes.push({ ...note, id: 'note-2', primaryDiagnosis: 'Second diagnosis' });
    show(); expect(diagnosis()).toHaveValue('');
    fireEvent.change(screen.getByLabelText('Consultation / Treatment'), { target: { value: 'note-2' } });
    expect(diagnosis()).toHaveValue('Second diagnosis');
  });
  it('uses the explicitly linked appointment or note rather than another visit diagnosis', () => {
    notes = [{ ...note, appointmentId: 'visit-1' }, { ...note, id: 'note-2', appointmentId: 'visit-2', primaryDiagnosis: 'Matching visit diagnosis' }];
    show({ defaultAppointmentId: 'visit-2' }); expect(diagnosis()).toHaveValue('Matching visit diagnosis');
  });
  it('supports issuing from a historical finalized consultation without guessing from today', () => {
    notes = [{ ...note, visitDate: '2029-12-01' }];
    show({ defaultClinicalNoteId: 'note-1' }); expect(diagnosis()).toHaveValue(note.primaryDiagnosis);
  });
  it('never pulls a draft, another patient diagnosis, or an unrelated historical diagnosis automatically', () => {
    notes = [{ ...note, status: 'DRAFT', isFinalized: true }, { ...note, id: 'foreign', patientId: 'PAT-2' }, { ...note, id: 'old', visitDate: '2029-12-01' }];
    show(); expect(diagnosis()).toHaveValue('');
    expect(screen.queryByRole('option', { name: /foreign/ })).not.toBeInTheDocument();
  });
  it('preserves an existing draft diagnosis and clinician edits when notes arrive or refresh', () => {
    const initialPrescription = { id: 'rx-1', patientId: 'patient-uuid', diagnosis: 'Saved prescription diagnosis', prescribedAt: '2030-01-07', status: 'DRAFT', items: [] } as any;
    const view = show({ initialPrescription }); expect(diagnosis()).toHaveValue('Saved prescription diagnosis');
    fireEvent.change(diagnosis(), { target: { value: 'Clinician reviewed diagnosis' } });
    notes = [{ ...note, primaryDiagnosis: 'Later note update' }];
    view.rerender(<PrescriptionModal initialPrescription={initialPrescription} defaultPatientId="patient-uuid" onClose={() => {}} onSaved={() => {}} />);
    expect(diagnosis()).toHaveValue('Clinician reviewed diagnosis');
  });
  it('clears the previous patient context when selecting a different patient', () => {
    render(<PrescriptionModal onClose={() => {}} onSaved={() => {}} />);
    expect(diagnosis()).toHaveValue(note.primaryDiagnosis);
    fireEvent.change(screen.getByLabelText('Patient Selection'), { target: { value: 'other-patient' } });
    expect(diagnosis()).toHaveValue('');
  });
  it('saves the copied diagnosis and its exact consultation reference', async () => {
    const save = vi.spyOn(store, 'addPrescription').mockResolvedValue({ id: 'rx-new' } as any);
    show();
    fireEvent.change(screen.getByPlaceholderText(/Search\/Select medicine|medicine name|e.g. Amoxicillin/i), { target: { value: 'Synthetic medicine' } });
    fireEvent.click(screen.getByRole('button', { name: /Save.*Draft/i }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({ diagnosis: note.primaryDiagnosis, clinicalNoteId: note.id, patientId: 'patient-uuid' })));
  });
});
