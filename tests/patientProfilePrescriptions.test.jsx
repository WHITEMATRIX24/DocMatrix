import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';
import '@/pages/patients/PatientProfilePage';
import { resetStoreForTesting } from '@/services/clinicStore';

const renderAt = (url) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <App />
    </MemoryRouter>
  );

describe('Patient Profile — Digital Prescriptions Integration', () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem('docmatrix-demo-session', 'usr-101');
    resetStoreForTesting();
  });

  it('renders "Issue Prescription" quick action in patient header and opens modal locked to patient', async () => {
    renderAt('/patients/pt-1001');

    // 1. Wait for lazy patient profile to mount
    const issueBtn = await screen.findByRole('button', { name: /Issue Prescription/i }, { timeout: 10000 });
    expect(issueBtn).toBeInTheDocument();

    // 2. Click button to open prescription modal
    fireEvent.click(issueBtn);

    // 3. Modal opens
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/New Digital Prescription/i)).toBeInTheDocument();

    // 4. Verify patient selection is disabled / locked
    const patientComboboxes = within(dialog).getAllByRole('combobox');
    expect(patientComboboxes[0]).toBeDisabled();
    expect(within(dialog).getByText(/Locked to active patient/i)).toBeInTheDocument();
  });

  it('displays compact Digital Prescriptions card on Overview tab with recent Rx records', async () => {
    renderAt('/patients/pt-1001');

    // Overview tab is default
    const rxHeading = await screen.findByRole('heading', { name: /Digital Prescriptions/i }, { timeout: 10000 });
    expect(rxHeading).toBeInTheDocument();

    // Should list RX-1001 for pt-1001
    expect(screen.getByText('RX-1001')).toBeInTheDocument();
    expect(screen.getByText(/Acute Periapical Abscess/i)).toBeInTheDocument();
  });

  it('displays Previously Prescribed Medications separately from Patient-Reported in Medical History', async () => {
    renderAt('/patients/pt-1001?tab=medical');

    // Verify Patient-Reported heading
    expect(await screen.findByText(/Current Medications \(Patient-Reported\)/i, {}, { timeout: 10000 })).toBeInTheDocument();

    // Verify Previously Prescribed Medications row
    expect(screen.getByText(/Previously Prescribed Medications/i)).toBeInTheDocument();
    expect(screen.getByText(/RX-1001/i)).toBeInTheDocument();
  });

  it('integrates prescription events into the activity timeline with "View prescription →" action', async () => {
    renderAt('/patients/pt-1001/timeline');

    // Verify timeline heading
    expect(await screen.findByRole('heading', { name: 'Patient activity' }, { timeout: 10000 })).toBeInTheDocument();

    // Verify Prescriptions filter chip inside the filter group
    const filterGroup = screen.getByRole('group', { name: 'Filter activity' });
    const rxFilterChip = within(filterGroup).getByRole('button', { name: /Prescriptions/i });
    expect(rxFilterChip).toBeInTheDocument();

    // Filter by prescriptions
    fireEvent.click(rxFilterChip);

    // Prescription entries (creation and finalization) should be visible
    const rxEntries = screen.getAllByText(/Prescription RX-1001/i);
    expect(rxEntries.length).toBeGreaterThanOrEqual(1);

    // Click "View prescription →"
    const viewBtns = screen.getAllByRole('button', { name: /View prescription →/i });
    fireEvent.click(viewBtns[0]);

    // Details modal opens
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Prescription Details/i)).toBeInTheDocument();
    expect(within(dialog).getByText('RX-1001')).toBeInTheDocument();
  });

  it('supports deep linking to the Prescriptions tab and displays styled table', async () => {
    renderAt('/patients/pt-1001?tab=prescriptions');

    expect(await screen.findByRole('heading', { name: /Clinical Prescriptions History/i }, { timeout: 10000 })).toBeInTheDocument();
    expect(screen.getByText('RX-1001')).toBeInTheDocument();
    expect(screen.getByText('FINALIZED')).toBeInTheDocument();

    // Action buttons
    expect(screen.getByTitle(/View details/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Print \/ Save PDF/i)).toBeInTheDocument();
  });
});
