import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ClinicalNoteModal } from '@/components/clinical/ClinicalNoteModal';
import * as clinicStore from '@/services/clinicStore';
import * as authService from '@/services/authService';

describe('ClinicalNoteModal — Validation and Finalize Workflow', () => {
  const mockOnClose = vi.fn();
  const mockOnSaved = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(authService, 'getCurrentUser').mockReturnValue({
      id: 'doc-101',
      name: 'Dr. Arun Kumar',
      role: 'DOCTOR',
      clinicId: 'clinic-demo-001',
    });
  });

  it('validates required fields and focuses Chief Complaint if empty when Finalize Note is clicked', async () => {
    render(
      <ClinicalNoteModal
        defaultPatientId="pt-1001"
        onClose={mockOnClose}
        onSaved={mockOnSaved}
      />
    );

    // Click "Finalize Note" without filling anything
    const finalizeBtn = screen.getByRole('button', { name: /Finalize Note/i });
    fireEvent.click(finalizeBtn);

    // Confirmation dialog should NOT open
    expect(screen.queryByRole('heading', { name: /Finalize Clinical Note\?/i })).not.toBeInTheDocument();

    // Validation error should be displayed in safety banner and inline field error
    expect(screen.getAllByText(/Chief Complaint is required/i).length).toBeGreaterThanOrEqual(1);
  });

  it('validates Primary Diagnosis when Chief Complaint is entered but Diagnosis is missing', async () => {
    render(
      <ClinicalNoteModal
        defaultPatientId="pt-1001"
        onClose={mockOnClose}
        onSaved={mockOnSaved}
      />
    );

    // Enter chief complaint
    const chiefComplaintInput = screen.getByLabelText(/Patient's Primary Concern/i);
    fireEvent.change(chiefComplaintInput, { target: { value: 'Severe tooth pain in upper molar' } });

    // Click Finalize Note
    const finalizeBtn = screen.getByRole('button', { name: /Finalize Note/i });
    fireEvent.click(finalizeBtn);

    // Confirmation dialog should NOT open
    expect(screen.queryByRole('heading', { name: /Finalize Clinical Note\?/i })).not.toBeInTheDocument();

    // Primary diagnosis error should be shown in safety banner and inline field error
    expect(screen.getAllByText(/Primary Diagnosis is required/i).length).toBeGreaterThanOrEqual(1);
  });

  it('opens confirmation modal and successfully finalizes note when required fields are populated', async () => {
    const mockCreatedNote = {
      id: 'cn-new-1',
      noteNumber: 'CN-1099',
      status: 'FINALIZED',
      chiefComplaint: 'Severe tooth pain in upper molar',
      primaryDiagnosis: 'Acute Apical Periodontitis',
    };
    vi.spyOn(clinicStore, 'addClinicalNote').mockResolvedValue(mockCreatedNote);

    render(
      <ClinicalNoteModal
        defaultPatientId="pt-1001"
        onClose={mockOnClose}
        onSaved={mockOnSaved}
      />
    );

    // Enter chief complaint
    const chiefComplaintInput = screen.getByLabelText(/Patient's Primary Concern/i);
    fireEvent.change(chiefComplaintInput, { target: { value: 'Severe tooth pain in upper molar' } });

    // Enter primary diagnosis
    const diagnosisInput = screen.getByLabelText(/Primary Diagnosis/i);
    fireEvent.change(diagnosisInput, { target: { value: 'Acute Apical Periodontitis' } });

    // Click Finalize Note
    const finalizeBtn = screen.getByRole('button', { name: /Finalize Note/i });
    fireEvent.click(finalizeBtn);

    // Confirmation dialog should now appear
    expect(await screen.findByRole('heading', { name: /Finalize Clinical Note\?/i })).toBeInTheDocument();

    // Click "Confirm & Finalize"
    const confirmBtn = screen.getByRole('button', { name: /Confirm & Finalize/i });
    fireEvent.click(confirmBtn);

    // Expect addClinicalNote to be called with isFinalized: true
    await waitFor(() => {
      expect(clinicStore.addClinicalNote).toHaveBeenCalledWith(
        expect.objectContaining({
          chiefComplaint: 'Severe tooth pain in upper molar',
          primaryDiagnosis: 'Acute Apical Periodontitis',
          isFinalized: true,
        })
      );
      expect(mockOnSaved.mock.calls[0][0]).toEqual(mockCreatedNote);
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('displays authorization guidance and error banner inside confirmation dialog if non-doctor attempts finalization', async () => {
    vi.spyOn(authService, 'getCurrentUser').mockReturnValue({
      id: 'admin-1',
      name: 'Clinic Administrator',
      role: 'ORGANIZATION_ADMIN',
      clinicId: 'clinic-demo-001',
    });

    vi.spyOn(clinicStore, 'addClinicalNote').mockRejectedValue(
      new Error('Unauthorized: Only verified medical/dental practitioners (DOCTOR role) are permitted to finalize clinical notes.')
    );

    render(
      <ClinicalNoteModal
        defaultPatientId="pt-1001"
        onClose={mockOnClose}
        onSaved={mockOnSaved}
      />
    );

    // Enter required fields
    fireEvent.change(screen.getByLabelText(/Patient's Primary Concern/i), {
      target: { value: 'Severe tooth pain in upper molar' },
    });
    fireEvent.change(screen.getByLabelText(/Primary Diagnosis/i), {
      target: { value: 'Acute Apical Periodontitis' },
    });

    // Open confirmation
    fireEvent.click(screen.getByRole('button', { name: /Finalize Note/i }));
    expect(await screen.findByRole('heading', { name: /Finalize Clinical Note\?/i })).toBeInTheDocument();

    // Check non-doctor warning banner in confirmation dialog
    expect(screen.getByText(/Signed in as/i)).toBeInTheDocument();

    // Click Confirm & Finalize
    fireEvent.click(screen.getByRole('button', { name: /Confirm & Finalize/i }));

    // Error banner should be rendered inside dialog
    expect(await screen.findByText(/Cannot finalize note:/i)).toBeInTheDocument();
    expect(screen.getByText(/Save as Draft Instead/i)).toBeInTheDocument();
  });

  describe('Searchable Procedure Combobox', () => {
    it('opens dropdown on focus and displays procedure catalogue', async () => {
      render(
        <ClinicalNoteModal
          defaultPatientId="pt-1001"
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      );

      const procedureInput = screen.getByPlaceholderText(/Search or type procedure/i);
      expect(procedureInput).toBeInTheDocument();

      // Focus input
      fireEvent.focus(procedureInput);

      // Dropdown should appear with count and categories
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getByText(/procedures available/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ALL' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Endodontics' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Restorative' })).toBeInTheDocument();
    });

    it('filters procedures when typing a search query', async () => {
      render(
        <ClinicalNoteModal
          defaultPatientId="pt-1001"
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      );

      const procedureInput = screen.getByPlaceholderText(/Search or type procedure/i);
      fireEvent.change(procedureInput, { target: { value: 'pulpectomy' } });

      // Should show pulpectomy options and hide unrelated ones
      expect(screen.getByText(/Emergency Pulpectomy/i)).toBeInTheDocument();
      expect(screen.queryByText(/Complete Denture/i)).not.toBeInTheDocument();
    });

    it('filters procedures when clicking a category filter chip', async () => {
      render(
        <ClinicalNoteModal
          defaultPatientId="pt-1001"
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      );

      const procedureInput = screen.getByPlaceholderText(/Search or type procedure/i);
      fireEvent.focus(procedureInput);

      // Click "Endodontics" chip
      const endoChip = screen.getByRole('button', { name: 'Endodontics' });
      fireEvent.click(endoChip);

      expect(screen.getByText(/Emergency Pulpectomy/i)).toBeInTheDocument();
      expect(screen.getByText(/Show all categories/i)).toBeInTheDocument();
    });

    it('selects a procedure from dropdown, updates input value, and closes dropdown', async () => {
      render(
        <ClinicalNoteModal
          defaultPatientId="pt-1001"
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      );

      const procedureInput = screen.getByPlaceholderText(/Search or type procedure/i);
      fireEvent.focus(procedureInput);

      const procedureOption = screen.getByText(/Emergency Pulpectomy & Access Opening/i);
      fireEvent.click(procedureOption);

      // Dropdown should close
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      // Input value should be updated
      expect(procedureInput).toHaveValue('Emergency Pulpectomy & Access Opening');

      // Clear button should now be visible and clicking it clears value
      const clearBtn = screen.getByRole('button', { name: /Clear procedure/i });
      fireEvent.click(clearBtn);
      expect(procedureInput).toHaveValue('');
    });

    it('preserves custom procedure name entered by doctor', async () => {
      render(
        <ClinicalNoteModal
          defaultPatientId="pt-1001"
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      );

      const procedureInput = screen.getByPlaceholderText(/Search or type procedure/i);
      fireEvent.change(procedureInput, {
        target: { value: 'Custom Specialized Laser Frenectomy' },
      });

      expect(procedureInput).toHaveValue('Custom Specialized Laser Frenectomy');
      expect(screen.getByText(/No matching predefined procedures found/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Custom Specialized Laser Frenectomy/i)[0]).toBeInTheDocument();
    });

    it('renders clean Procedure Name label and triggers catalogue on button click', () => {
      render(
        <ClinicalNoteModal
          defaultPatientId="pt-1001"
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      );

      expect(screen.getByText('Procedure Name')).toBeInTheDocument();

      const catalogueBtn = screen.getByRole('button', { name: /Open Catalogue ↗/i });
      expect(catalogueBtn).toBeInTheDocument();
      fireEvent.click(catalogueBtn);

      expect(screen.getByRole('heading', { name: /Dental Procedure Catalogue/i })).toBeInTheDocument();
    });

    it('opens full Procedure Catalogue when tapping the Procedure Name input', async () => {
      render(
        <ClinicalNoteModal
          defaultPatientId="pt-1001"
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      );

      const procedureInput = screen.getByPlaceholderText(/Search or type procedure/i);
      // Tap / click the procedure input
      fireEvent.click(procedureInput);

      // Dedicated procedure catalogue dialog should open
      expect(screen.getByRole('heading', { name: /Dental Procedure Catalogue/i })).toBeInTheDocument();
      expect(screen.getAllByText(/Procedures/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole('button', { name: /Back to clinical note/i })).toBeInTheDocument();
    });

    it('allows searching, selecting, and saving a procedure from the Catalogue back to the clinical note', async () => {
      render(
        <ClinicalNoteModal
          defaultPatientId="pt-1001"
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      );

      const procedureInput = screen.getByPlaceholderText(/Search or type procedure/i);
      fireEvent.click(procedureInput);

      // Catalogue dialog is open
      expect(screen.getByRole('heading', { name: /Dental Procedure Catalogue/i })).toBeInTheDocument();

      // Search for Root Canal
      const catSearchInput = screen.getByPlaceholderText(/Search by procedure name, CDT code/i);
      fireEvent.change(catSearchInput, { target: { value: 'Root Canal Treatment - Molar' } });

      // Find the card and click it to select
      const procedureOption = screen.getAllByText(/Root Canal Treatment - Molar Tooth/i)[0];
      expect(procedureOption).toBeInTheDocument();
      fireEvent.click(procedureOption);

      // Click "Save & Return to Clinical Notes"
      const saveReturnBtn = screen.getByRole('button', { name: /Save & Return to Clinical Notes/i });
      fireEvent.click(saveReturnBtn);

      // Dialogue closes
      expect(screen.queryByRole('heading', { name: /Dental Procedure Catalogue/i })).not.toBeInTheDocument();

      // Clinical note procedure input is updated
      expect(procedureInput).toHaveValue('Root Canal Treatment - Molar Tooth');
    });

    it('allows creating custom procedure from Catalogue and saving back to the clinical note', async () => {
      render(
        <ClinicalNoteModal
          defaultPatientId="pt-1001"
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      );

      const procedureInput = screen.getByPlaceholderText(/Search or type procedure/i);
      fireEvent.click(procedureInput);

      // Search for custom procedure not in list
      const catSearchInput = screen.getByPlaceholderText(/Search by procedure name, CDT code/i);
      fireEvent.change(catSearchInput, { target: { value: 'Custom Specialized Laser Biopsy' } });

      // Click "Select & Save" on the custom procedure prompt
      const selectSaveBtn = screen.getByRole('button', { name: /Select & Save/i });
      fireEvent.click(selectSaveBtn);

      // Dialogue closes and clinical note is updated
      expect(screen.queryByRole('heading', { name: /Dental Procedure Catalogue/i })).not.toBeInTheDocument();
      expect(procedureInput).toHaveValue('Custom Specialized Laser Biopsy');
    });
  });

  describe('Materials & Instruments Recommendations & "+ Other" Option', () => {
    it('displays procedure-specific material chips and adapts dynamically when procedure changes', async () => {
      render(
        <ClinicalNoteModal
          defaultPatientId="pt-1001"
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      );

      const procedureInput = screen.getByPlaceholderText(/Search or type procedure/i);

      // 1. Enter Endodontics procedure
      fireEvent.change(procedureInput, { target: { value: 'Root Canal Treatment' } });

      // Endodontic materials should be displayed as chips
      expect(screen.getByRole('button', { name: /Rubber Dam Kit/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /ProTaper Gold Rotary Files/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /NaOCl 3% Irrigation/i })).toBeInTheDocument();

      // 2. Change procedure to Extraction / Oral Surgery
      fireEvent.change(procedureInput, { target: { value: 'Tooth Extraction Simple' } });

      // Surgical materials should now be displayed
      expect(screen.getByRole('button', { name: /Coupland Elevator/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Extraction Forceps/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /3-0 Silk Suture/i })).toBeInTheDocument();
    });

    it('toggles materials into and out of materialsUsed on chip click', async () => {
      render(
        <ClinicalNoteModal
          defaultPatientId="pt-1001"
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      );

      const procedureInput = screen.getByPlaceholderText(/Search or type procedure/i);
      fireEvent.change(procedureInput, { target: { value: 'Composite Restoration' } });

      const materialsInput = screen.getByLabelText(/Materials & Instruments Used/i);
      expect(materialsInput).toHaveValue('');

      // Click "37% Etchant Gel" chip
      const etchantChip = screen.getByRole('button', { name: /37% Etchant Gel/i });
      fireEvent.click(etchantChip);

      expect(materialsInput.value).toContain('37% Etchant Gel');

      // Click "Bonding Adhesive" chip
      const bondingChip = screen.getByRole('button', { name: /Bonding Adhesive/i });
      fireEvent.click(bondingChip);

      expect(materialsInput.value).toContain('37% Etchant Gel');
      expect(materialsInput.value).toContain('Bonding Adhesive');

      // Click "37% Etchant Gel" again to remove it
      fireEvent.click(etchantChip);
      expect(materialsInput.value).not.toContain('37% Etchant Gel');
      expect(materialsInput.value).toContain('Bonding Adhesive');
    });

    it('auto-fills standard set of materials on clicking "Auto-fill standard set"', async () => {
      render(
        <ClinicalNoteModal
          defaultPatientId="pt-1001"
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      );

      const procedureInput = screen.getByPlaceholderText(/Search or type procedure/i);
      fireEvent.change(procedureInput, { target: { value: 'Root Canal Treatment' } });

      const autoFillBtn = screen.getByRole('button', { name: /Auto-fill standard set/i });
      fireEvent.click(autoFillBtn);

      const materialsInput = screen.getByLabelText(/Materials & Instruments Used/i);
      expect(materialsInput.value).toContain('Rubber Dam Kit');
      expect(materialsInput.value).toContain('ProTaper Gold Rotary Files');
      expect(materialsInput.value).toContain('AH Plus Sealer');
    });

    it('adds custom material via "+ Other..." and allows removing it', async () => {
      render(
        <ClinicalNoteModal
          defaultPatientId="pt-1001"
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      );

      const procedureInput = screen.getByPlaceholderText(/Search or type procedure/i);
      fireEvent.change(procedureInput, { target: { value: 'Root Canal Treatment' } });

      // Click "Other..." chip
      const otherBtn = screen.getByRole('button', { name: /Other\.\.\./i });
      fireEvent.click(otherBtn);

      // Custom input appears
      const customInput = screen.getByPlaceholderText(/Type custom material/i);
      expect(customInput).toBeInTheDocument();

      // Type custom material name
      fireEvent.change(customInput, { target: { value: 'MTA Angelus Root Repair' } });

      const addBtn = screen.getByRole('button', { name: /^Add$/i });
      fireEvent.click(addBtn);

      const materialsInput = screen.getByLabelText(/Materials & Instruments Used/i);
      expect(materialsInput.value).toContain('MTA Angelus Root Repair');

      // The custom material should now be displayed as an active chip
      const customChip = screen.getByRole('button', { name: /MTA Angelus Root Repair/i });
      expect(customChip).toBeInTheDocument();

      // Clicking custom chip removes it
      fireEvent.click(customChip);
      expect(materialsInput.value).not.toContain('MTA Angelus Root Repair');
    });
  });

  describe('Record Consultation Dedicated Full-Page Experience (isPage={true})', () => {
    it('renders the dedicated consultation page layout with back button, breadcrumbs, and sticky footer', () => {
      render(
        <ClinicalNoteModal
          isPage
          defaultPatientId="pt-1001"
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      );

      // Verify dedicated page container
      expect(screen.getByTestId('record-consultation-page')).toBeInTheDocument();

      // Verify breadcrumbs and page title
      expect(screen.getByRole('heading', { name: /Record Dental Consultation/i })).toBeInTheDocument();
      expect(screen.getByText(/Clinical Notes/i)).toBeInTheDocument();

      // Verify page back button
      const backBtn = screen.getByRole('button', { name: /Back/i });
      expect(backBtn).toBeInTheDocument();
      fireEvent.click(backBtn);
      expect(mockOnClose).toHaveBeenCalledTimes(1);

      // Verify status and doctor indicator
      expect(screen.getByText(/Draft in Progress/i)).toBeInTheDocument();
      expect(screen.getByText(/Attending Doctor:/i)).toBeInTheDocument();
      expect(screen.getByText(/Dr\. Arun Kumar/i)).toBeInTheDocument();

      // Verify all sections exist in the full-page layout
      expect(screen.getByText(/1\.\s*Consultation Information/i)).toBeInTheDocument();
      expect(screen.getByText(/5\.\s*Clinical Diagnosis/i)).toBeInTheDocument();
      expect(screen.getByText(/6\.\s*Treatment Performed/i)).toBeInTheDocument();
    });

    it('renders "Edit Dental Consultation Note" when initialNote is provided', () => {
      const existingNote = {
        id: 'cn-note-999',
        patientId: 'pt-1001',
        isFinalized: false,
        patient: { id: 'pt-1001', name: 'Ravi Kumar', uhid: 'UHID-1001' },
        chiefComplaint: 'Tooth pain',
        primaryDiagnosis: 'Pulpitis',
        procedureName: 'Root Canal Treatment',
      };

      render(
        <ClinicalNoteModal
          isPage
          initialNote={existingNote}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      );

      expect(screen.getByText(/Edit Dental Consultation Note/i)).toBeInTheDocument();
    });

    it('renders header actions without demo fill page button and supports draft saving', () => {
      render(
        <ClinicalNoteModal
          isPage
          defaultPatientId="pt-1001"
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      );

      expect(screen.queryByTestId('fill-page-header-btn')).not.toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /Save as Draft/i })[0]).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /Finalize Note/i })[0]).toBeInTheDocument();
    });

    it('allows searching and selecting patient and consultation type directly inside the same box', async () => {
      vi.spyOn(clinicStore, 'useClinicData').mockReturnValue({
        patients: [
          { id: 'pt-1001', firstName: 'Aavany', lastName: 'p u', mobile: '9188272967' },
        ],
        clinicalNotes: [],
      });

      render(
        <ClinicalNoteModal
          isPage
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      );

      // Patient input search
      const patientInput = screen.getByLabelText('Patient');
      expect(patientInput).toBeInTheDocument();
      fireEvent.focus(patientInput);
      fireEvent.change(patientInput, { target: { value: 'Aav' } });
      const patientOption = await screen.findByRole('menuitem', { name: /Aavany/i });
      expect(patientOption).toBeInTheDocument();
      fireEvent.click(patientOption);
      expect(patientInput).toHaveValue('Aavany p u');

      // Consultation Type input search
      const typeInput = screen.getByLabelText('Consultation Type');
      expect(typeInput).toBeInTheDocument();
      fireEvent.focus(typeInput);
      fireEvent.change(typeInput, { target: { value: 'Emerg' } });
      const emergencyOption = await screen.findByRole('menuitem', { name: /Emergency/i });
      expect(emergencyOption).toBeInTheDocument();
      fireEvent.click(emergencyOption);
      expect(typeInput).toHaveValue('Emergency / Acute Pain Relief');
    });
  });
});
