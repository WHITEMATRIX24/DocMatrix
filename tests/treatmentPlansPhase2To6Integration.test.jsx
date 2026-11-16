import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TreatmentPlanDetailsModal } from '../src/components/clinical/TreatmentPlanDetailsModal';
import { TreatmentPlanModal } from '../src/components/clinical/TreatmentPlanModal';
import { TreatmentPlansPage } from '../src/pages/clinical/TreatmentPlansPage';
import {
  createStructuredTreatmentPlan,
  updateStructuredTreatmentPlan,
  updateTreatmentPlanStatus,
  updateTreatmentPlanItemStatus,
  initClinicSession,
  getClinicSnapshot,
} from '../src/services/clinicStore';
import * as clinicStoreModule from '../src/services/clinicStore';

describe('DocMatrix — Treatment Plans Final Implementation & Integration (Phases 2-6)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    initClinicSession('demo-clinic-01');
  });

  describe('Phase 2 — Plan Editing, Versioning, and Cancellation', () => {
    it('renders "Edit Plan" action and launches edit modal with pre-filled details and revision reason', async () => {
      const plan = await createStructuredTreatmentPlan({
        patientId: 'pt-1001',
        title: 'Initial Endodontic Plan',
        stages: [
          {
            stageNumber: 1,
            name: 'Root Canal Phase',
            items: [
              {
                procedureCode: 'D3330',
                procedureName: 'Root Canal Therapy - Molar',
                category: 'Endodontics',
                toothNumber: '16',
                surface: 'O',
                quantity: 1,
                unitFee: 6500,
                discount: 500,
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

      // Verify "Edit Plan" button exists and is clickable
      const editBtn = screen.getByTestId('edit-treatment-plan-btn');
      expect(editBtn).toBeInTheDocument();
      fireEvent.click(editBtn);

      // Edit modal should open with revision header and revision reason input
      expect(screen.getByText(new RegExp(`Edit Treatment Plan \\(${plan.planNumber || plan.id}\\)`, 'i'))).toBeInTheDocument();
      expect(screen.getByDisplayValue(/Initial Endodontic Plan/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/Estimate revision v2/i)).toBeInTheDocument();
    });

    it('saves plan modifications via updateStructuredTreatmentPlan and increments version to v2', async () => {
      const plan = await createStructuredTreatmentPlan({
        patientId: 'pt-1001',
        title: 'Initial Plan v1',
        stages: [
          {
            stageNumber: 1,
            name: 'Stage 1',
            items: [
              {
                procedureName: 'Composite Restoration',
                category: 'Restorative',
                toothNumber: '21',
                quantity: 1,
                unitFee: 2000,
                discount: 0,
              },
            ],
          },
        ],
      });

      expect(plan.currentVersion).toBe(1);

      // Perform update with new stage
      const updated = await updateStructuredTreatmentPlan(plan.id, {
        title: 'Revised Comprehensive Plan v2',
        revisionReason: 'Added Stage 2 for crown placement',
        stages: [
          {
            stageNumber: 1,
            name: 'Stage 1: Restorative',
            items: [
              {
                procedureName: 'Composite Restoration',
                category: 'Restorative',
                toothNumber: '21',
                quantity: 1,
                unitFee: 2000,
                discount: 0,
              },
            ],
          },
          {
            stageNumber: 2,
            name: 'Stage 2: Prosthodontics',
            items: [
              {
                procedureName: 'Porcelain Crown',
                category: 'Prosthodontics',
                toothNumber: '21',
                quantity: 1,
                unitFee: 8500,
                discount: 500,
              },
            ],
          },
        ],
      });

      expect(updated).not.toBeNull();
      expect(updated.currentVersion).toBe(2);
      expect(updated.title).toBe('Revised Comprehensive Plan v2');
      expect(updated.stages.length).toBe(2);
      expect(updated.estimateRevisions.length).toBeGreaterThanOrEqual(2);
      expect(updated.estimateRevisions[0].versionNumber).toBe(2);
      expect(updated.estimateRevisions[0].revisionReason).toBe('Added Stage 2 for crown placement');
    });

    it('cancels treatment plan with mandatory cancellation reason and updates status to Cancelled', async () => {
      const plan = await createStructuredTreatmentPlan({
        patientId: 'pt-1001',
        title: 'Elective Cosmetic Veneers',
        stages: [
          {
            stageNumber: 1,
            name: 'Veneers Stage',
            items: [
              {
                procedureName: 'Porcelain Veneer',
                category: 'Cosmetic',
                toothNumber: '11',
                quantity: 1,
                unitFee: 12000,
                discount: 0,
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

      // Click "Cancel Plan"
      const cancelBtn = screen.getByTestId('cancel-treatment-plan-btn');
      expect(cancelBtn).toBeInTheDocument();
      fireEvent.click(cancelBtn);

      // Verify cancellation confirmation modal opens
      expect(screen.getByText(/Are you sure you want to cancel this treatment plan\?/i)).toBeInTheDocument();

      // Enter cancellation reason
      const reasonInput = screen.getByPlaceholderText(/Patient opted out \/ Financial hardship/i);
      fireEvent.change(reasonInput, { target: { value: 'Patient deferred cosmetic treatment due to relocation' } });

      // Confirm cancellation
      const confirmCancelBtn = screen.getByTestId('confirm-cancel-treatment-plan-btn');
      fireEvent.click(confirmCancelBtn);

      // Status in store should now be Cancelled
      const snapshot = getClinicSnapshot();
      const updatedPlan = snapshot.treatmentPlans.find((p) => p.id === plan.id);
      expect(updatedPlan.status).toBe('Cancelled');
    });

    it('renders "Cancelled" filter chip in TreatmentPlansPage', () => {
      render(
        <MemoryRouter>
          <TreatmentPlansPage />
        </MemoryRouter>
      );

      // Check all filter chips including Cancelled
      expect(screen.getByRole('button', { name: /Cancelled/i })).toBeInTheDocument();
    });
  });

  describe('Phase 3 — Interactive Odontogram and Procedure Catalog', () => {
    it('opens Interactive Odontogram Tooth Chart and toggles tooth number into active item', async () => {
      render(
        <MemoryRouter>
          <TreatmentPlanModal
            isOpen={true}
            onClose={vi.fn()}
            initialPatientId="pt-1001"
          />
        </MemoryRouter>
      );

      // Open Odontogram
      const chartToggleBtn = screen.getByRole('button', { name: /Open Tooth Chart Picker/i });
      expect(chartToggleBtn).toBeInTheDocument();
      fireEvent.click(chartToggleBtn);

      // Chart should be visible with arch labels
      expect(screen.getByText(/Maxillary Arch \(Upper\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Mandibular Arch \(Lower\)/i)).toBeInTheDocument();

      // Click on tooth button 21 in odontogram
      const tooth21Btn = screen.getByRole('button', { name: /Tooth 21/i });
      expect(tooth21Btn).toBeInTheDocument();
      fireEvent.click(tooth21Btn);

      // Tooth input in table should reflect tooth 21
      const toothInput = screen.getByPlaceholderText(/FDI Tooth e\.g\. 16, 24/i);
      expect(toothInput.value).toContain('21');
    });

    it('displays Clinic Service Tariffs alongside Standard CDT procedures in catalog dropdown', () => {
      const { container } = render(
        <MemoryRouter>
          <TreatmentPlanModal
            isOpen={true}
            onClose={vi.fn()}
            initialPatientId="pt-1001"
          />
        </MemoryRouter>
      );

      // Check procedure select dropdown has optgroup for Standard Dental Procedures
      const optgroup = container.querySelector('optgroup[label*="Standard Dental Procedures"]');
      expect(optgroup).not.toBeNull();
    });
  });

  describe('Phase 4 — Clinical Module Integration (Notes, Prescriptions, Audit History)', () => {
    it('renders Clinical Notes & Rx tab and displays patient clinical records', async () => {
      const plan = await createStructuredTreatmentPlan({
        patientId: 'pt-1001',
        title: 'Molar Therapy Plan',
        stages: [
          {
            stageNumber: 1,
            name: 'Restoration',
            items: [
              {
                procedureName: 'Composite Restoration',
                category: 'Restorative',
                toothNumber: '16',
                quantity: 1,
                unitFee: 2000,
                discount: 0,
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

      // Switch to Clinical Notes & Rx tab
      const notesTab = screen.getByRole('button', { name: /Clinical Notes & Rx/i });
      expect(notesTab).toBeInTheDocument();
      fireEvent.click(notesTab);

      // Section headers should render
      expect(screen.getByText(/Clinical Examination & Operatory Notes/i)).toBeInTheDocument();
      expect(screen.getByText(/Associated Digital Prescriptions/i)).toBeInTheDocument();
    });

    it('renders Audit Timeline tab with chronological timeline events', async () => {
      const plan = await createStructuredTreatmentPlan({
        patientId: 'pt-1001',
        title: 'Full Rehab Plan',
        stages: [
          {
            stageNumber: 1,
            name: 'Stage 1',
            items: [
              {
                procedureName: 'Initial Scaling',
                category: 'Preventive',
                toothNumber: '',
                quantity: 1,
                unitFee: 1500,
                discount: 0,
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

      // Switch to Audit Timeline tab
      const auditTab = screen.getByRole('button', { name: /Audit Timeline/i });
      expect(auditTab).toBeInTheDocument();
      fireEvent.click(auditTab);

      // Should render creation event
      expect(screen.getByText(/Treatment Plan Created/i)).toBeInTheDocument();
      expect(screen.getAllByText(/CREATED/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Phase 5 — Billing Summary and Material Consumption Auto-Prompt', () => {
    it('displays comprehensive billing breakdown strip (Estimated, Invoiced, Unbilled)', async () => {
      const plan = await createStructuredTreatmentPlan({
        patientId: 'pt-1001',
        title: 'Restorative Treatment',
        stages: [
          {
            stageNumber: 1,
            name: 'Stage 1',
            items: [
              {
                procedureName: 'Ceramic Inlay',
                category: 'Restorative',
                toothNumber: '14',
                quantity: 1,
                unitFee: 6000,
                discount: 500,
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

      // Verify billing summary cards
      expect(screen.getAllByText(/Total Estimated/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Invoiced to Date/i)).toBeInTheDocument();
      expect(screen.getByText(/Unbilled Balance/i)).toBeInTheDocument();
      expect(screen.getByText(/Billing Status: Unbilled/i)).toBeInTheDocument();
    });

    it('triggers material consumption auto-prompt when procedure status changes to COMPLETED', async () => {
      const plan = await createStructuredTreatmentPlan({
        patientId: 'pt-1001',
        title: 'Root Canal Phase',
        stages: [
          {
            stageNumber: 1,
            name: 'Endodontics',
            items: [
              {
                id: 'proc-rct-molar',
                procedureName: 'Molar Root Canal Therapy',
                category: 'Endodontics',
                toothNumber: '46',
                quantity: 1,
                unitFee: 6500,
                discount: 0,
                status: 'IN_PROGRESS',
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

      // Find the status select for this procedure
      const statusSelect = screen.getByDisplayValue(/In Progress/i);
      expect(statusSelect).toBeInTheDocument();

      // Change status to COMPLETED
      fireEvent.change(statusSelect, { target: { value: 'COMPLETED' } });

      // Auto-prompt should appear
      await waitFor(() => {
        expect(screen.getByText(/marked as Completed\. Record material consumption now\?/i)).toBeInTheDocument();
        expect(screen.getByTestId('record-material-usage-prompt-btn')).toBeInTheDocument();
      });
    });
  });
});
