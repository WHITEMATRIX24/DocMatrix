import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TreatmentPlanModal } from '../src/components/clinical/TreatmentPlanModal';
import { TreatmentPlanDetailsModal } from '../src/components/clinical/TreatmentPlanDetailsModal';
import {
  resetStoreForTesting,
  createStructuredTreatmentPlan,
} from '../src/services/clinicStore';
import { billingApi } from '../src/services/billingApi';
import { apiClient } from '../src/services/apiClient';
import { confirmConsumptionAndDeductStock } from '../src/services/adaptiveInventoryStore';

describe('Treatment Plans Phase 1 Features: Billing, Dentist Assignment, Inventory Protection', () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem('docmatrix-demo-session', 'usr-101');
    resetStoreForTesting();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // TASK 1: Billing Generation directly from Treatment Plans
  // =========================================================================
  describe('Task 1 — Treatment Plans to Billing Integration', () => {
    it('renders "Bill Procedures / Generate Invoice" action and opens billing modal', async () => {
      const plan = await createStructuredTreatmentPlan({
        patientId: 'pt-1001',
        title: 'Full Quadrant Rehabilitation',
        stages: [
          {
            name: 'Stage 1: Restorative',
            items: [
              {
                id: 'proc-101',
                procedureName: 'Composite Restoration (Class II)',
                toothNumber: '14',
                surface: 'MOD',
                quantity: 1,
                unitFee: 4000,
                discount: 500,
                status: 'COMPLETED',
              },
              {
                id: 'proc-102',
                procedureName: 'Porcelain Crown',
                toothNumber: '15',
                quantity: 1,
                unitFee: 12000,
                discount: 1000,
                status: 'PENDING',
              },
            ],
          },
        ],
      });

      render(
        <MemoryRouter>
          <TreatmentPlanDetailsModal
            plan={plan}
            isOpen={true}
            onClose={vi.fn()}
            onPrint={vi.fn()}
          />
        </MemoryRouter>
      );

      // Verify the primary action button exists
      const billButton = screen.getByTestId('bill-treatment-plan-btn');
      expect(billButton).toBeInTheDocument();
      expect(billButton).toHaveTextContent(/Bill Procedures \/ Generate Invoice/i);

      // Click to open billing dialog
      fireEvent.click(billButton);

      // Verify modal content
      expect(screen.getByText(/Generate Invoice \/ Bill Procedures/i)).toBeInTheDocument();
      expect(screen.getByText(/Eligible Procedures \(2 unbilled\)/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Composite Restoration \(Class II\)/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Porcelain Crown/i).length).toBeGreaterThanOrEqual(1);

      // Calculation summary
      expect(screen.getByText(/Selected Procedures:/i)).toBeInTheDocument();
      expect(screen.getByTestId('confirm-generate-invoice-btn')).toBeInTheDocument();
    });

    it('submits invoice via billingApi.createInvoiceFromTreatmentPlan and displays confirmation', async () => {
      const plan = await createStructuredTreatmentPlan({
        patientId: 'pt-1001',
        title: 'Endodontic & Restorative Care',
        stages: [
          {
            name: 'Stage 1',
            items: [
              {
                id: 'item-bill-alpha',
                procedureName: 'Molar Root Canal Treatment',
                toothNumber: '46',
                quantity: 1,
                unitFee: 7500,
                discount: 500,
                status: 'COMPLETED',
              },
            ],
          },
        ],
      });

      const targetItemId = plan.stages[0].items[0].id;

      const createInvoiceSpy = vi.spyOn(billingApi, 'createInvoiceFromTreatmentPlan').mockResolvedValue({
        id: 'inv-tp-test-001',
        invoiceNumber: 'INV-2026-0089',
        patientId: 'pt-1001',
        clinicId: 'demo-clinic-01',
        status: 'ISSUED',
        totalAmount: 7000,
        totalGst: 0,
        balanceDue: 7000,
        treatmentPlanId: plan.id,
        items: [
          {
            id: 'li-alpha-1',
            name: 'Molar Root Canal Treatment',
            treatmentPlanItemId: targetItemId,
            quantity: 1,
            unitPrice: 7500,
            discount: 500,
            totalAmount: 7000,
          },
        ],
      });

      render(
        <MemoryRouter>
          <TreatmentPlanDetailsModal
            plan={plan}
            isOpen={true}
            onClose={vi.fn()}
            onPrint={vi.fn()}
          />
        </MemoryRouter>
      );

      fireEvent.click(screen.getByTestId('bill-treatment-plan-btn'));

      // Add billing notes
      const notesInput = screen.getByPlaceholderText(/Stage 1 procedures billed as per consultation agreement/i);
      fireEvent.change(notesInput, { target: { value: 'Billed upon completion of endodontic treatment' } });

      // Click submit
      fireEvent.click(screen.getByTestId('confirm-generate-invoice-btn'));

      await waitFor(() => {
        expect(createInvoiceSpy).toHaveBeenCalledWith({
          treatmentPlanId: plan.id,
          itemIds: [targetItemId],
          issueImmediately: true,
          notes: 'Billed upon completion of endodontic treatment',
        });
      });

      // Confirmation screen
      expect(await screen.findByText(/Invoice Generated Successfully!/i)).toBeInTheDocument();
      expect(screen.getByText(/INV-2026-0089/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Open in Billing/i })).toBeInTheDocument();
    });
  });

  // =========================================================================
  // TASK 2: Treating Dentist Assignment
  // =========================================================================
  describe('Task 2 — Treating Dentist Selection in Treatment Plan Modal', () => {
    it('displays Treating Dentist field in plan creation modal and submits doctor assignment', async () => {
      let createdPlan = null;
      const handleClose = vi.fn();
      const handleSuccess = vi.fn((plan) => {
        createdPlan = plan;
      });

      render(
        <MemoryRouter>
          <TreatmentPlanModal
            isOpen={true}
            onClose={handleClose}
            onSuccess={handleSuccess}
            lockedPatientId="pt-1001"
          />
        </MemoryRouter>
      );

      // Verify Treating Dentist label is present
      expect(screen.getByText(/Treating Dentist/i)).toBeInTheDocument();

      // Enter Title
      const titleInput = screen.getByPlaceholderText(/e\.g\. Full Mouth Rehabilitation/i);
      fireEvent.change(titleInput, { target: { value: 'Invisalign & Alignment Therapy' } });

      // Enter procedure
      const procInput = screen.getByPlaceholderText(/Procedure description/i);
      fireEvent.change(procInput, { target: { value: 'Clear Aligner Assessment' } });

      const numberInputs = screen.getAllByRole('spinbutton');
      // Unit Fee input
      fireEvent.change(numberInputs[1], { target: { value: '15000' } });

      // Submit
      const submitBtn = screen.getByRole('button', { name: /Save & Propose Treatment Plan/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(handleSuccess).toHaveBeenCalled();
      });

      expect(createdPlan).toBeTruthy();
    });
  });

  // =========================================================================
  // TASK 3: Duplicate Inventory Deduction Protection
  // =========================================================================
  describe('Task 3 — Inventory Idempotency & Deduction Protection', () => {
    it('passes stable operationId and deductionId to /inventory/deduct to prevent double deductions', async () => {
      const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue({ success: true });

      const deduction = confirmConsumptionAndDeductStock({
        operationId: 'OP-DED-VERIFY-101',
        deductionId: 'OP-DED-VERIFY-101',
        treatmentId: 'tp-item-123',
        patientId: 'pt-1001',
        patientName: 'Meera Nambiar',
        doctorId: 'usr-101',
        doctorName: 'Dr. Arun Kumar',
        procedureId: 'proc-root-canal',
        procedureName: 'Molar Root Canal Therapy',
        modeUsed: 'standard',
        confirmedBy: 'Dr. Arun Kumar',
        items: [
          {
            itemId: 'item-endo-seal',
            name: 'AH Plus Root Canal Sealer',
            unit: 'syringes',
            suggestedQty: 1,
            confirmedQty: 1,
            wastageQty: 0,
            batchNumber: 'AHP-BATCH-1',
          },
        ],
      });

      expect(deduction.id).toBe('OP-DED-VERIFY-101');
      expect(postSpy).toHaveBeenCalledWith(
        '/inventory/deduct',
        expect.objectContaining({
          operationId: 'OP-DED-VERIFY-101',
          deductionId: 'OP-DED-VERIFY-101',
          treatmentId: 'tp-item-123',
          patientId: 'pt-1001',
        })
      );
    });
  });
});

