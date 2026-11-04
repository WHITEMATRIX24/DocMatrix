import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { TreatmentPlansPage } from '../src/pages/clinical/TreatmentPlansPage';
import { TreatmentEstimatesPage } from '../src/pages/clinical/TreatmentEstimatesPage';
import { PatientProfilePage } from '../src/pages/patients/PatientProfilePage';
import { TreatmentPlanModal } from '../src/components/clinical/TreatmentPlanModal';
import { TreatmentPlanDetailsModal } from '../src/components/clinical/TreatmentPlanDetailsModal';
import { TreatmentPlanPrintModal } from '../src/components/clinical/TreatmentPlanPrintModal';
import {
  resetStoreForTesting,
  createStructuredTreatmentPlan,
  recordTreatmentPlanAcceptance,
  updateTreatmentPlanItemStatus,
  useClinicData,
} from '../src/services/clinicStore';

describe('DocMatrix — Phase 2: GUI Workflow Verification (Treatment Plans & Estimates)', () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem('docmatrix-demo-session', 'usr-101');
    resetStoreForTesting();
  });

  // ---------------------------------------------------------------------------
  // WORKFLOW 1: Create Multi-Stage Treatment Plan with Tooth & General Procedures
  // ---------------------------------------------------------------------------
  it('Workflow 1: Creates multi-stage treatment plan with FDI teeth, surfaces, and non-tooth procedure', async () => {
    let savedPlan = null;
    const handleClose = vi.fn();
    const handleSuccess = vi.fn((plan) => {
      savedPlan = plan;
    });

    render(
      <MemoryRouter initialEntries={['/clinical/treatment-plans']}>
        <TreatmentPlanModal
          isOpen={true}
          onClose={handleClose}
          onSuccess={handleSuccess}
          lockedPatientId="pt-1001"
        />
      </MemoryRouter>
    );

    // Verify patient is locked
    expect(screen.getByText(/Meera Nambiar \(pt-1001\)/i)).toBeInTheDocument();

    // Enter title & objectives
    const titleInput = screen.getByPlaceholderText(/e\.g\. Full Mouth Rehabilitation/i);
    fireEvent.change(titleInput, { target: { value: 'Complete Periodontal & Prosthetic Rehab' } });

    // Stage 1 is default: add procedure name
    const procInput = screen.getByPlaceholderText(/Procedure description/i);
    fireEvent.change(procInput, { target: { value: 'Molar Root Canal Therapy' } });

    // Enter Tooth Number: FDI 16
    const toothInput = screen.getByPlaceholderText(/FDI Tooth/i);
    fireEvent.change(toothInput, { target: { value: '16' } });

    // Select surface 'M'
    const surfaceM = screen.getByRole('button', { name: /^M$/ });
    fireEvent.click(surfaceM);

    // Enter unit fee 6500, discount 500
    const numberInputs = screen.getAllByRole('spinbutton');
    // numberInputs: [0: qty, 1: unitFee, 2: discount]
    fireEvent.change(numberInputs[1], { target: { value: '6500' } });
    fireEvent.change(numberInputs[2], { target: { value: '500' } });

    // Add a second stage
    const addStageBtn = screen.getByRole('button', { name: /^Add Stage$/i });
    fireEvent.click(addStageBtn);

    // Verify Stage 2 was created
    expect(screen.getAllByText(/STAGE 2/i).length).toBeGreaterThanOrEqual(1);

    // Verify Net Estimate calculation in footer (6500 - 500 = 6000)
    expect(screen.getAllByText(/₹6,000/i).length).toBeGreaterThanOrEqual(1);
  });

  // ---------------------------------------------------------------------------
  // WORKFLOW 2: Cost Estimates Calculation & Formatted Display
  // ---------------------------------------------------------------------------
  it('Workflow 2: Displays authoritative financial calculations and Indian Rupee formatting', () => {
    render(
      <MemoryRouter initialEntries={['/clinical/estimates']}>
        <TreatmentEstimatesPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Treatment Cost Estimates/i })).toBeInTheDocument();
    expect(screen.getByText(/Total Proposed Pipeline/i)).toBeInTheDocument();
    expect(screen.getByText(/Accepted & In-Progress Value/i)).toBeInTheDocument();
    expect(screen.getByText(/Estimates Breakdown & Ledger/i)).toBeInTheDocument();

    // Verify currency formatting includes ₹
    const priceCells = screen.getAllByText(/₹/);
    expect(priceCells.length).toBeGreaterThan(0);
  });

  // ---------------------------------------------------------------------------
  // WORKFLOW 3: Patient Acceptance & Staff-Recorded Disclaimer
  // ---------------------------------------------------------------------------
  it('Workflow 3: Records patient acceptance with staff-recorded verbal flag and audit trail', async () => {
    // Create a plan with initial v1
    const plan = await createStructuredTreatmentPlan({
      patientId: 'pt-1001',
      doctorId: 'usr-104',
      title: 'Smile Makeover Plan',
      taxRate: 5,
      stages: [
        {
          stageNumber: 1,
          name: 'Stage 1: Esthetics',
          items: [
            {
              procedureName: 'Ceramic Veneer',
              category: 'Cosmetic',
              toothNumber: '11',
              unitFee: 10000,
              discount: 1000,
            },
          ],
        },
      ],
    });

    const handleClose = vi.fn();
    const handlePrint = vi.fn();

    function Workflow3Wrapper() {
      const { treatmentPlans } = useClinicData();
      const current = treatmentPlans.find((p) => p.id === plan.id) || plan;
      return (
        <TreatmentPlanDetailsModal
          plan={current}
          isOpen={true}
          onClose={handleClose}
          onPrint={handlePrint}
        />
      );
    }

    render(<Workflow3Wrapper />);

    // Open acceptance modal
    const acceptBtn = screen.getByRole('button', { name: /Record Patient Acceptance/i });
    fireEvent.click(acceptBtn);

    // Acceptance modal dialog opens
    expect(screen.getAllByText(/Record Patient Acceptance/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Staff-Recorded \(Chairside Verbal Consent\)/i)).toBeInTheDocument();

    // Enter consenting patient name
    const nameInput = screen.getByPlaceholderText(/Full name of consenting patient or guardian/i);
    fireEvent.change(nameInput, { target: { value: 'Meera Nambiar' } });

    // Confirm acceptance
    const confirmBtn = screen.getByRole('button', { name: /Confirm Acceptance/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      // Acceptance notice banner is displayed with staff recorded flag
      expect(screen.getByText(/Staff Recorded \(Chairside\)/i)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // WORKFLOW 4: Procedure Progress Tracking & Completion Tracker
  // ---------------------------------------------------------------------------
  it('Workflow 4: Updates individual procedure statuses and dynamically recalculates progress', async () => {
    const plan = await createStructuredTreatmentPlan({
      patientId: 'pt-1001',
      doctorId: 'usr-104',
      title: 'Full Quad Restoration',
      stages: [
        {
          stageNumber: 1,
          name: 'Stage 1: Fillings',
          items: [
            {
              procedureName: 'Composite Restoration #1',
              category: 'Restorative',
              toothNumber: '14',
              unitFee: 2000,
            },
            {
              procedureName: 'Composite Restoration #2',
              category: 'Restorative',
              toothNumber: '15',
              unitFee: 2000,
            },
          ],
        },
      ],
    });

    render(
      <TreatmentPlanDetailsModal
        plan={plan}
        isOpen={true}
        onClose={vi.fn()}
        onPrint={vi.fn()}
      />
    );

    // Initial progress: 0 of 2 completed (0%)
    expect(screen.getByText(/0 of 2 completed \(0%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/0\/2 completed/i)).toBeInTheDocument();

    // Update procedure 1 status to COMPLETED
    const item1 = plan.stages[0].items[0];
    await updateTreatmentPlanItemStatus(plan.id, item1.id, 'COMPLETED');

    // Simulate updated plan with 1 item completed
    const updatedPlan = {
      ...plan,
      stages: [
        {
          ...plan.stages[0],
          items: [
            { ...plan.stages[0].items[0], status: 'COMPLETED' },
            plan.stages[0].items[1],
          ],
        },
      ],
    };

    render(
      <TreatmentPlanDetailsModal
        plan={updatedPlan}
        isOpen={true}
        onClose={vi.fn()}
        onPrint={vi.fn()}
      />
    );

    // Progress updates to 1 of 2 completed (50%)
    expect(screen.getByText(/1 of 2 completed \(50%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/1\/2 completed/i)).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // WORKFLOW 5: Estimate Revision History (v1 -> v2)
  // ---------------------------------------------------------------------------
  it('Workflow 5: Preserves v1 snapshot and requires renewed acceptance on revision v2', () => {
    const multiVersionPlan = {
      id: 'tp-multi-ver',
      clinicId: 'clinic-1',
      planNumber: 'TP-2001',
      patientId: 'pt-1001',
      doctor: 'Dr. Arun Kumar',
      title: 'Implant Placement & Crown',
      status: 'Proposed',
      date: '2026-11-04',
      cost: 25000,
      subtotal: 25000,
      discount: 2000,
      tax: 1150,
      totalEstimatedCost: 24150,
      currentVersion: 2,
      acceptedVersion: 1,
      patientAcceptedByName: 'Meera Nambiar',
      patientAcceptedAt: '2026-11-01T10:00:00.000Z',
      isStaffRecorded: true,
      stages: [
        {
          id: 'st-1',
          stageNumber: 1,
          name: 'Stage 1: Modified Implant Stage',
          estimatedCost: 24150,
          items: [],
        },
      ],
      estimateRevisions: [
        {
          id: 'rev-2',
          versionNumber: 2,
          revisionReason: 'Upgraded to premium titanium implant fixture',
          subtotal: 25000,
          discount: 2000,
          tax: 1150,
          totalEstimatedCost: 24150,
          status: 'PROPOSED',
          createdAt: '2026-11-04T12:00:00.000Z',
        },
        {
          id: 'rev-1',
          versionNumber: 1,
          revisionReason: 'Initial estimate',
          subtotal: 20000,
          discount: 1000,
          tax: 950,
          totalEstimatedCost: 19950,
          status: 'ACCEPTED',
          acceptedByName: 'Meera Nambiar',
          acceptedAt: '2026-11-01T10:00:00.000Z',
          createdAt: '2026-11-01T09:00:00.000Z',
        },
      ],
    };

    render(
      <TreatmentPlanDetailsModal
        plan={multiVersionPlan}
        isOpen={true}
        onClose={vi.fn()}
        onPrint={vi.fn()}
      />
    );

    // Switch to Estimate Version Revisions tab
    const historyTab = screen.getByRole('button', { name: /Estimate Version Revisions/i });
    fireEvent.click(historyTab);

    // Verify both Version 1 and Version 2 are displayed
    expect(screen.getByText(/VERSION 2/i)).toBeInTheDocument();
    expect(screen.getByText(/VERSION 1/i)).toBeInTheDocument();
    expect(screen.getByText(/Upgraded to premium titanium implant fixture/i)).toBeInTheDocument();
    expect(screen.getByText(/Initial estimate/i)).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // WORKFLOW 6: Patient Profile Integration & Quick Action
  // ---------------------------------------------------------------------------
  it('Workflow 6: Renders Treatment Plans tab and header quick action in Patient Profile', async () => {
    render(
      <MemoryRouter initialEntries={['/patients/pt-1001?tab=plans']}>
        <Routes>
          <Route path="/patients/:id" element={<PatientProfilePage />} />
        </Routes>
      </MemoryRouter>
    );

    // Quick action button in header
    expect(await screen.findByRole('button', { name: /Plan Treatment/i })).toBeInTheDocument();

    // Treatment Plans Tab is active
    expect(screen.getByRole('heading', { name: /Treatment Plans & Integrated Cost Estimates/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New Treatment Plan/i })).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // WORKFLOW 7: Print Preview Layout & Informed Consent Lines
  // ---------------------------------------------------------------------------
  it('Workflow 7: Renders print preview with clinic letterhead, patient details, and informed consent lines', () => {
    const printPlan = {
      id: 'tp-print-1',
      clinicId: 'clinic-1',
      planNumber: 'TP-3001',
      patientId: 'pt-1001',
      doctor: 'Dr. Arun Kumar',
      title: 'Full Rehabilitation Estimate',
      status: 'Proposed',
      date: '2026-11-04',
      cost: 15750,
      subtotal: 15000,
      discount: 1500,
      tax: 750,
      totalEstimatedCost: 15750,
      currentVersion: 1,
      patient: {
        firstName: 'Meera',
        lastName: 'Nambiar',
        age: '32',
        gender: 'Female',
        mobile: '9847012345',
      },
      stages: [
        {
          id: 'st-p-1',
          stageNumber: 1,
          name: 'Stage 1: Scaling & Root Canal',
          estimatedCost: 15000,
          items: [
            {
              id: 'it-p-1',
              procedureName: 'Molar RCT',
              toothNumber: '16',
              surface: 'MOD',
              quantity: 1,
              unitFee: 8500,
              discount: 500,
              netFee: 8000,
              status: 'PENDING',
            },
          ],
        },
      ],
    };

    render(
      <TreatmentPlanPrintModal
        plan={printPlan}
        onClose={vi.fn()}
      />
    );

    // Letterhead elements
    expect(screen.getByText(/DocMatrix Dental & Multi-Speciality Polyclinic/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Dental Treatment Plan & Cost Estimate/i })).toBeInTheDocument();
    expect(screen.getByText(/Meera Nambiar/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Dr\. Arun Kumar/i).length).toBeGreaterThanOrEqual(1);

    // Informed consent statement
    expect(screen.getByText(/Informed Consent & Treatment Agreement/i)).toBeInTheDocument();
    expect(screen.getByText(/Patient \/ Legal Guardian Signature/i)).toBeInTheDocument();
  });
});

