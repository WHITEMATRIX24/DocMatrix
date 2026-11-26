import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';
import { resetStoreForTesting } from '@/services/clinicStore';

const renderAt = (url) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <App />
    </MemoryRouter>
  );

describe('Structured Clinical Notes Module', () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem('docmatrix-demo-session', 'usr-101');
    resetStoreForTesting();
  });

  describe('Clinic-Wide Clinical Notes Dashboard (/clinical/notes)', () => {
    it('renders heading, metric cards, status tabs, and consultation notes table', async () => {
      renderAt('/clinical/notes');

      // 1. Heading
      expect(
        await screen.findByRole('heading', { name: /Clinical Consultation Notes/i }, { timeout: 10000 })
      ).toBeInTheDocument();

      // 2. Metrics
      expect(screen.getByText(/Total Consultations/i)).toBeInTheDocument();
      expect(screen.getByText(/Finalized Notes/i)).toBeInTheDocument();
      expect(screen.getByText(/Draft Notes/i)).toBeInTheDocument();
      expect(screen.getByText(/Follow-ups Required/i)).toBeInTheDocument();

      // 3. Status Tabs
      expect(screen.getByRole('button', { name: /^All/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Finalized/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Drafts/i })).toBeInTheDocument();

      // 4. Initial Notes
      expect(screen.getByText('CN-1001')).toBeInTheDocument();
      expect(screen.getByText(/Severe throbbing pain in lower right posterior quadrant/i)).toBeInTheDocument();
      expect(screen.getByText('CN-1002')).toBeInTheDocument();
    });

    it('filters notes by search term and status tabs', async () => {
      renderAt('/clinical/notes');

      expect(await screen.findByText('CN-1001', {}, { timeout: 10000 })).toBeInTheDocument();

      // Filter by Drafts
      const draftTab = screen.getByRole('button', { name: /^Drafts/i });
      fireEvent.click(draftTab);

      // CN-1003 is draft, CN-1001 is finalized
      expect(screen.getByText('CN-1003')).toBeInTheDocument();
      expect(screen.queryByText('CN-1001')).not.toBeInTheDocument();

      // Search input
      const searchInput = screen.getByPlaceholderText(/Search by Note #/i);
      fireEvent.change(searchInput, { target: { value: 'orthodontic' } });
      expect(screen.getByText('CN-1003')).toBeInTheDocument();
    });

    it('finalizes a draft clinical note when the Finalize button is clicked in the table', async () => {
      renderAt('/clinical/notes');

      // Filter by Drafts to find CN-1003
      const draftTab = await screen.findByRole('button', { name: /^Drafts/i }, { timeout: 10000 });
      fireEvent.click(draftTab);

      const finalizeBtn = screen.getByTitle('Finalize Consultation Note');
      expect(finalizeBtn).toBeInTheDocument();

      await act(async () => {
        fireEvent.click(finalizeBtn);
      });

      // Feedback toast appears
      expect(await screen.findByText(/finalized successfully/i)).toBeInTheDocument();
      // It is no longer in Drafts view
      expect(screen.queryByTitle('Finalize Consultation Note')).not.toBeInTheDocument();
    });

    it('opens structured streamlined consultation recorder when clicking "New Clinical Note"', async () => {
      renderAt('/clinical/notes');

      const newBtn = await screen.findByTestId('new-clinical-note-button', {}, { timeout: 10000 });
      fireEvent.click(newBtn);

      const page = await screen.findByTestId('record-consultation-page');
      expect(within(page).getByRole('heading', { name: /Record Dental Consultation/i })).toBeInTheDocument();

      // Verify streamlined logical sections
      expect(within(page).getByText(/1\.\s*CONSULTATION INFORMATION/i)).toBeInTheDocument();
      expect(within(page).getByText(/2\.\s*CHIEF COMPLAINT/i)).toBeInTheDocument();
      expect(within(page).getByText(/3\.\s*SYMPTOMS & HISTORY/i)).toBeInTheDocument();

      // Action buttons
      expect(within(page).getByRole('button', { name: /Save as Draft/i })).toBeInTheDocument();
      expect(within(page).getAllByRole('button', { name: /Finalize Note/i })[0]).toBeInTheDocument();
    });
  });

  describe('Patient Profile Integration (/patients/pt-1001)', () => {
    it('displays compact "Recent Clinical Notes" card on Overview tab with quick actions', async () => {
      renderAt('/patients/pt-1001');

      // Overview card heading
      const notesCard = await screen.findByRole('heading', { name: /Recent Clinical Notes/i }, { timeout: 10000 });
      expect(notesCard).toBeInTheDocument();

      // Shows recent consultation for pt-1001
      expect(screen.getByText('CN-1001')).toBeInTheDocument();
      expect(screen.getByText(/Severe throbbing pain in lower right posterior quadrant/i)).toBeInTheDocument();

      // Quick "New Note" action
      expect(screen.getByRole('button', { name: /New Note/i })).toBeInTheDocument();
    });

    it('renders "Record Consultation" quick action in header that locks active patient', async () => {
      renderAt('/patients/pt-1001');

      const recordBtn = await screen.findByRole('button', { name: /Record Consultation/i }, { timeout: 10000 });
      fireEvent.click(recordBtn);

      const page = await screen.findByTestId('record-consultation-page');
      expect(within(page).getByRole('heading', { name: /Record Dental Consultation/i })).toBeInTheDocument();

      // Verify patient selection is locked to active patient
      const comboboxes = within(page).getAllByRole('combobox');
      expect(comboboxes[0]).toBeDisabled();
    });

    it('supports deep linking to the Clinical Notes tab and shows dedicated consultation history', async () => {
      renderAt('/patients/pt-1001?tab=notes');

      expect(
        await screen.findByRole('heading', { name: /Clinical Consultation Notes/i }, { timeout: 10000 })
      ).toBeInTheDocument();

      // Patient-specific notes displayed
      expect(screen.getByText('CN-1001')).toBeInTheDocument();
      expect(screen.getByText('CN-1002')).toBeInTheDocument();

      // Action buttons
      const viewButtons = screen.getAllByRole('button', { name: /View/i });
      expect(viewButtons.length).toBeGreaterThan(0);
    });

    it('supports URL path deep link /patients/:id/notes', async () => {
      renderAt('/patients/pt-1001/notes');

      expect(
        await screen.findByRole('heading', { name: /Clinical Consultation Notes/i }, { timeout: 10000 })
      ).toBeInTheDocument();

      expect(screen.getByText('CN-1001')).toBeInTheDocument();
    });

    it('integrates real consultation events into the activity timeline', async () => {
      renderAt('/patients/pt-1001/timeline');

      expect(await screen.findByRole('heading', { name: 'Patient activity' }, { timeout: 10000 })).toBeInTheDocument();

      // Filter by Clinical notes
      const filterGroup = screen.getByRole('group', { name: 'Filter activity' });
      const notesFilterChip = within(filterGroup).getByRole('button', { name: /Clinical notes/i });
      fireEvent.click(notesFilterChip);

      // Verify created and finalized events exist
      const noteEntries = screen.getAllByText(/Clinical Note CN-1001/i);
      expect(noteEntries.length).toBeGreaterThanOrEqual(1);

      // Click "View consultation note →"
      const viewLinks = screen.getAllByRole('button', { name: /View consultation note →/i });
      fireEvent.click(viewLinks[0]);

      // Details modal opens
      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByText(/Chief Complaint/i)).toBeInTheDocument();
    });
  });

  describe('Clinical Note Details & Letterhead Printing', () => {
    it('opens Details modal showing full structured sections, doctor signature, and addenda history', async () => {
      renderAt('/clinical/notes');

      const viewBtns = await screen.findAllByRole('button', { name: /View/i }, { timeout: 10000 });
      fireEvent.click(viewBtns[0]);

      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByText(/Chief Complaint/i)).toBeInTheDocument();
      expect(within(dialog).getAllByText(/Diagnosis/i).length).toBeGreaterThanOrEqual(1);
      expect(within(dialog).getAllByText(/Treatment Performed/i).length).toBeGreaterThanOrEqual(1);
      expect(within(dialog).getByText(/Clinical Addenda History/i)).toBeInTheDocument();

      // Print button in details modal
      expect(within(dialog).getByRole('button', { name: /Print Note/i })).toBeInTheDocument();
    });

    it('opens Print modal with official clinic letterhead layout', async () => {
      renderAt('/clinical/notes');

      const printBtns = await screen.findAllByRole('button', { name: /Print/i }, { timeout: 10000 });
      fireEvent.click(printBtns[0]);

      const dialog = await screen.findByRole('dialog');
      expect(within(dialog).getByText(/DOCMATRIX DENTAL CLINIC/i)).toBeInTheDocument();
      expect(within(dialog).getByText(/CLINICIAN INFORMATION/i)).toBeInTheDocument();
      expect(within(dialog).getByText(/PATIENT INFORMATION/i)).toBeInTheDocument();
      expect(within(dialog).getByText(/Print Now/i)).toBeInTheDocument();
    });
  });

  describe('Prescriptions Non-Regression', () => {
    it('preserves 100% operational status of Digital Prescriptions', async () => {
      renderAt('/clinical/prescriptions');

      expect(
        await screen.findByRole('heading', { name: /Digital Prescriptions/i }, { timeout: 10000 })
      ).toBeInTheDocument();

      expect(screen.getByText('RX-1001')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /New Prescription/i })).toBeInTheDocument();
    });
  });
});
