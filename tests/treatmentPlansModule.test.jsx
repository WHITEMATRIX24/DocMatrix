import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';
import { resetStoreForTesting } from '@/services/clinicStore';

const renderAt = (url) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <App />
    </MemoryRouter>
  );

describe('Treatment Plans & Integrated Cost Estimates Module', () => {
  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem('docmatrix-demo-session', 'usr-101');
    resetStoreForTesting();
  });

  describe('Clinic-Wide Treatment Plans (/clinical/treatment-plans)', () => {
    it('renders heading, table, status filters, and "New Treatment Plan" button', async () => {
      renderAt('/clinical/treatment-plans');

      expect(
        await screen.findByRole('heading', { name: /Treatment Plans/i }, { timeout: 10000 })
      ).toBeInTheDocument();

      expect(screen.getByRole('button', { name: /New Treatment Plan/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^All/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Proposed/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^Accepted/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^In Progress/i })).toBeInTheDocument();

      // Check table has rows
      expect(screen.getByText(/Root Canal Treatment & Rotary Shaping/i)).toBeInTheDocument();
    });

    it('opens TreatmentPlanModal on clicking "New Treatment Plan"', async () => {
      renderAt('/clinical/treatment-plans');

      const newBtn = await screen.findByRole('button', { name: /New Treatment Plan/i });
      fireEvent.click(newBtn);

      expect(await screen.findByText(/Create Dental Treatment Plan/i)).toBeInTheDocument();
      expect(screen.getByText(/Clinical Treatment Stages/i)).toBeInTheDocument();
      expect(screen.getByText(/Cost Estimation Breakdown/i)).toBeInTheDocument();
    });
  });

  describe('Cost Estimates Page (/clinical/estimates)', () => {
    it('renders financial summary cards and estimates table', async () => {
      renderAt('/clinical/estimates');

      expect(
        await screen.findByRole('heading', { name: /Treatment Cost Estimates/i }, { timeout: 10000 })
      ).toBeInTheDocument();

      expect(screen.getByText(/Total Proposed Pipeline/i)).toBeInTheDocument();
      expect(screen.getByText(/Accepted & In-Progress Value/i)).toBeInTheDocument();
      expect(screen.getByText(/Completed Treatments/i)).toBeInTheDocument();
      expect(screen.getByText(/Estimates Breakdown & Ledger/i)).toBeInTheDocument();
    });
  });

  describe('Patient Profile Integration (/patients/pt-1001)', () => {
    it('renders Treatment Plans tab and quick action in patient profile', async () => {
      renderAt('/patients/pt-1001');

      // Check header quick action button exists
      expect(
        await screen.findByRole('button', { name: /Plan Treatment/i }, { timeout: 10000 })
      ).toBeInTheDocument();

      // Check tab exists
      const plansTab = screen.getByTestId('tab-treatment-plans');
      expect(plansTab).toBeInTheDocument();
      fireEvent.click(plansTab);

      // Verify patient treatment plans section renders
      expect(screen.getByTestId('patient-treatment-plans-section')).toBeInTheDocument();
      expect(screen.getByText(/Treatment Plans & Integrated Cost Estimates/i)).toBeInTheDocument();
    });

    it('locks patient in creation modal when opened from profile quick action', async () => {
      renderAt('/patients/pt-1001');

      const planBtn = await screen.findByRole('button', { name: /Plan Treatment/i }, { timeout: 10000 });
      fireEvent.click(planBtn);

      expect(await screen.findByText(/Create Dental Treatment Plan/i)).toBeInTheDocument();
      // Locked patient text should display patient name and ID
      expect(screen.getByText(/Meera Nambiar \(pt-1001\)/i)).toBeInTheDocument();
    });

    it('supports direct deep linking to /patients/pt-1001/plans', async () => {
      renderAt('/patients/pt-1001/plans');

      expect(
        await screen.findByTestId('patient-treatment-plans-section', {}, { timeout: 10000 })
      ).toBeInTheDocument();
    });
  });
});