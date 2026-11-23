import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { printInvoice } from '@/pages/billing/BillingShared';
import ToothChartPage from '@/pages/patients/ToothChartPage';
import * as clinicStore from '@/services/clinicStore';
const charts = {};
const store = { patients: [] as any[], save: vi.fn() };

describe('Clinical safety boundaries', () => {
  beforeEach(() => { vi.restoreAllMocks(); vi.spyOn(clinicStore, 'useClinicData').mockImplementation(() => ({ patients: store.patients, clinicalNotes: [], toothCharts: charts }) as any); vi.spyOn(clinicStore, 'saveToothConditionForPatient').mockImplementation(store.save); store.patients = [{ id: 'PAT-001', firstName: 'Synthetic', lastName: 'Patient' }]; store.save.mockClear(); });
  it('prints identifiers and payment modes as text, without executable markup', () => {
    let html = '';
    const popup = { document: { open: vi.fn(), write: (s: string) => { html = s; }, close: vi.fn() }, print: vi.fn(), opener: window, onload: null as any };
    vi.spyOn(window, 'open').mockReturnValueOnce(popup as any);
    const payload = '<img src=x onerror="window.auditInjected=true">';
    printInvoice({ id: payload, description: 'Synthetic', amount: 10, createdAt: '2026-11-20', status: 'Issued', payments: [{ amount: 1, mode: payload, receivedAt: '2026-11-20' }] } as any,
      { id: payload, firstName: 'Synthetic', lastName: 'Patient' } as any);
    const document = new DOMParser().parseFromString(html, 'text/html');
    expect(document.querySelector('img,script,[onerror]')).toBeNull();
    expect(document.body.textContent).toContain(payload);
    expect(popup.opener).toBeNull();
    popup.onload(); expect(popup.print).toHaveBeenCalledOnce();
  });
  it('does not substitute the first patient for an unknown chart ID', () => {
    render(<MemoryRouter initialEntries={['/patients/UNKNOWN/tooth-chart']}><Routes><Route path="/patients/:id/tooth-chart" element={<ToothChartPage />} /></Routes></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Patient not found' })).toBeInTheDocument();
    expect(screen.queryByText('Synthetic')).not.toBeInTheDocument();
    expect(store.save).not.toHaveBeenCalled();
  });
  it('resolves a known backend patient ID without selecting another patient', () => {
    store.patients.push({ id: 'PAT-002', backendId: 'backend-two', firstName: 'Other', lastName: 'Patient' });
    render(<MemoryRouter initialEntries={['/patients/backend-two/tooth-chart']}><Routes><Route path="/patients/:id/tooth-chart" element={<ToothChartPage />} /></Routes></MemoryRouter>);
    expect(screen.getByTestId('feature-page-pat.toothchart')).toBeInTheDocument();
    expect(screen.getByText(/Other Patient/)).toBeInTheDocument();
    expect(store.save).not.toHaveBeenCalled();
  });
  it('blocks ambiguous patient identities instead of choosing a match', () => {
    store.patients.push({ id: 'pat-001', firstName: 'Different' });
    render(<MemoryRouter initialEntries={['/patients/PAT-001/tooth-chart']}><Routes><Route path="/patients/:id/tooth-chart" element={<ToothChartPage />} /></Routes></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Patient not found' })).toBeInTheDocument();
    expect(store.save).not.toHaveBeenCalled();
  });
});
