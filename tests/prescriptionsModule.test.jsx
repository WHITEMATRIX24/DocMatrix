import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  getClinicSnapshot,
  resetStoreForTesting,
  addPrescription,
  updatePrescription,
  finalizePrescription,
  cancelPrescription,
} from '@/services/clinicStore';
import { PrescriptionsPage } from '@/pages/clinical/PrescriptionsPage';

describe('DocMatrix Prescription Management Module', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetStoreForTesting();
  });

  describe('Clinic Store Prescription Operations', () => {
    it('initializes with default demo prescriptions in offline/demo mode', () => {
      const snapshot = getClinicSnapshot();
      expect(snapshot.prescriptions).toBeDefined();
      expect(snapshot.prescriptions.length).toBeGreaterThanOrEqual(2);
      expect(snapshot.prescriptions[0].prescriptionNumber).toBe('RX-1001');
      expect(snapshot.prescriptions[0].status).toBe('FINALIZED');
      expect(snapshot.prescriptions[1].prescriptionNumber).toBe('RX-1002');
      expect(snapshot.prescriptions[1].status).toBe('DRAFT');
    });

    it('adds a new prescription in DRAFT status with multiple medication items', async () => {
      const newRx = await addPrescription({
        patientId: 'pt-1001',
        diagnosis: 'Acute Irreversible Pulpitis',
        clinicalNotes: 'Endodontic access opening initiated',
        items: [
          {
            medicineName: 'Amoxicillin',
            strength: '500 mg',
            dosage: '1 tablet',
            route: 'Oral',
            frequency: '1-0-1',
            duration: '5 days',
            quantity: 10,
            instructions: 'Take after meals',
          },
          {
            medicineName: 'Ketorolac',
            strength: '10 mg',
            dosage: '1 tablet',
            route: 'Oral',
            frequency: 'PRN',
            duration: '3 days',
            quantity: 6,
            instructions: 'Take for severe pain only',
          },
        ],
      });

      expect(newRx).toBeDefined();
      expect(newRx.status).toBe('DRAFT');
      expect(newRx.diagnosis).toBe('Acute Irreversible Pulpitis');
      expect(newRx.items).toHaveLength(2);

      const snapshot = getClinicSnapshot();
      const stored = snapshot.prescriptions.find((p) => p.id === newRx.id);
      expect(stored).toBeDefined();
      expect(stored?.diagnosis).toBe('Acute Irreversible Pulpitis');
    });

    it('updates a draft prescription diagnosis and notes', async () => {
      const snapshot = getClinicSnapshot();
      const draftRx = snapshot.prescriptions.find((p) => p.status === 'DRAFT');
      expect(draftRx).toBeDefined();

      await updatePrescription(draftRx.id, {
        diagnosis: 'Updated Gingivitis Diagnosis',
        clinicalNotes: 'Follow-up oral hygiene instructions provided',
      });

      const updatedSnapshot = getClinicSnapshot();
      const updated = updatedSnapshot.prescriptions.find((p) => p.id === draftRx.id);
      expect(updated?.diagnosis).toBe('Updated Gingivitis Diagnosis');
      expect(updated?.clinicalNotes).toBe('Follow-up oral hygiene instructions provided');
    });

    it('finalizes a draft prescription and transitions status to FINALIZED', async () => {
      const snapshot = getClinicSnapshot();
      const draftRx = snapshot.prescriptions.find((p) => p.status === 'DRAFT');
      expect(draftRx).toBeDefined();

      const finalized = await finalizePrescription(draftRx.id);
      expect(finalized.status).toBe('FINALIZED');
      expect(finalized.finalizedAt).toBeDefined();

      const updatedSnapshot = getClinicSnapshot();
      const updated = updatedSnapshot.prescriptions.find((p) => p.id === draftRx.id);
      expect(updated?.status).toBe('FINALIZED');
    });

    it('cancels a prescription with mandatory clinical cancellation reason', async () => {
      const snapshot = getClinicSnapshot();
      const rxToCancel = snapshot.prescriptions[0];

      await cancelPrescription(
        rxToCancel.id,
        'Patient reported adverse rash symptoms to penicillin'
      );

      const updatedSnapshot = getClinicSnapshot();
      const cancelled = updatedSnapshot.prescriptions.find((p) => p.id === rxToCancel.id);
      expect(cancelled?.status).toBe('CANCELLED');
      expect(cancelled?.cancellationReason).toBe(
        'Patient reported adverse rash symptoms to penicillin'
      );
      expect(cancelled?.cancelledAt).toBeDefined();
    });
  });

  describe('PrescriptionsPage View & UI Interactions', () => {
    it('renders the prescriptions dashboard with KPIs and table', () => {
      render(
        <MemoryRouter>
          <PrescriptionsPage />
        </MemoryRouter>
      );

      expect(screen.getByText('Digital Prescriptions')).toBeInTheDocument();
      expect(screen.getByText('New Prescription')).toBeInTheDocument();

      // Check statistics cards
      expect(screen.getByText('Total Issued')).toBeInTheDocument();
      expect(screen.getAllByText('Finalized').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Drafts')).toBeInTheDocument();

      // Check table rows
      expect(screen.getByText('RX-1001')).toBeInTheDocument();
      expect(screen.getByText('RX-1002')).toBeInTheDocument();
    });

    it('filters prescriptions by status tabs', () => {
      render(
        <MemoryRouter>
          <PrescriptionsPage />
        </MemoryRouter>
      );

      // Click "Drafts" tab
      const draftBtn = screen.getByRole('button', { name: /^Draft$/i });
      fireEvent.click(draftBtn);

      expect(screen.getByText('RX-1002')).toBeInTheDocument();
      expect(screen.queryByText('RX-1001')).not.toBeInTheDocument();

      // Click "Finalized" tab
      const finalBtn = screen.getByRole('button', { name: /^Finalized$/i });
      fireEvent.click(finalBtn);

      expect(screen.getByText('RX-1001')).toBeInTheDocument();
      expect(screen.queryByText('RX-1002')).not.toBeInTheDocument();
    });

    it('searches prescriptions by diagnosis or Rx number', () => {
      render(
        <MemoryRouter>
          <PrescriptionsPage />
        </MemoryRouter>
      );

      const searchInput = screen.getByPlaceholderText(
        /Search by Rx number/i
      );
      fireEvent.change(searchInput, { target: { value: 'Abscess' } });

      expect(screen.getByText('RX-1001')).toBeInTheDocument();
      expect(screen.queryByText('RX-1002')).not.toBeInTheDocument();
    });

    it('opens the New Prescription modal on button click', () => {
      render(
        <MemoryRouter>
          <PrescriptionsPage />
        </MemoryRouter>
      );

      const newRxBtn = screen.getByText('New Prescription');
      fireEvent.click(newRxBtn);

      expect(screen.getByText('New Digital Prescription')).toBeInTheDocument();
      expect(screen.getByText('Clinical Diagnosis')).toBeInTheDocument();
      expect(screen.getByText('Finalize Prescription')).toBeInTheDocument();
      expect(screen.getByText('Save Draft')).toBeInTheDocument();
    });
  });
});
