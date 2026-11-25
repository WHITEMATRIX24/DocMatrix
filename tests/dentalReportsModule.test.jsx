import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DentalReportsPage from '@/pages/clinical/DentalReportsPage';
import * as clinicStore from '@/services/clinicStore';
import * as dentalReportsApi from '@/services/dentalReportsApi';
import * as dentalReportPdf from '@/services/dentalReportPdf';

describe('DocMatrix — Automated Dental Reports Module (/clinical/reports)', () => {
  const mockPatient = {
    id: 'pat-1001',
    patientCode: 'pt-1001',
    firstName: 'Rahul',
    lastName: 'Sharma',
    gender: 'Male',
    mobile: '+91 98765 43210',
    dateOfBirth: '1990-05-15',
    age: '34',
    allergies: 'yes',
    allergiesDetails: 'Penicillin, Latex',
    medicalSafetyAlerts: {
      allergies: 'Penicillin, Latex',
      diabetes: true,
    },
  };

  const mockNote = {
    id: 'note-101',
    noteNumber: 'CN-1001',
    patientId: 'pat-1001',
    consultationDate: '2026-11-20T10:00:00Z',
    chiefComplaint: 'Severe throbbing pain in lower molar #46',
    painSeverity: 8,
    primaryDiagnosis: 'Acute Irreversible Pulpitis #46',
    treatmentPerformed: 'Root Canal Access Opening & BMP',
    treatmentToothNumber: '46',
    doctorName: 'Dr. Jane Smith',
    status: 'FINALIZED',
  };

  beforeEach(() => {
    vi.spyOn(clinicStore, 'useClinicData').mockReturnValue({
      patients: [mockPatient],
      clinicalNotes: [mockNote],
      appointments: [],
      invoices: [],
      treatmentPlans: [],
      patientDocuments: [],
      patientConsents: [],
      toothCharts: {
        'pat-1001': {
          46: { condition: 'RCT', notes: 'BMP completed' },
          47: { condition: 'Caries', notes: 'Distal caries' },
        },
      },
      clinicConfig: {
        name: 'Apex Dental Care',
        address: 'Indiranagar, Bengaluru',
        phone: '+91 80 1234 5678',
        email: 'care@apexdental.test',
      },
    });

    // Mock window.print
    vi.stubGlobal('print', vi.fn());

    vi.spyOn(dentalReportsApi, 'generateDentalReport').mockImplementation(async (params) => {
      return {
        reportId: 'RPT-123456',
        reportType: params.reportType,
        title: `Clinical Dental Summary: Rahul Sharma`,
        generatedAt: '2026-11-25T10:00:00Z',
        generatedBy: 'Dr. Jane Smith',
        clinic: {
          name: 'Apex Dental Care',
          address: 'Indiranagar, Bengaluru',
          phone: '+91 80 1234 5678',
          email: 'care@apexdental.test',
          logo: null,
        },
        patient: {
          id: 'pat-1001',
          patientCode: 'pt-1001',
          firstName: 'Rahul',
          lastName: 'Sharma',
          fullName: 'Rahul Sharma',
          age: '34 yrs',
          gender: 'Male',
          mobile: '9876543210',
          medicalSafetyAlerts: { allergies: 'Penicillin, Latex' },
        },
        executiveSummary: 'Comprehensive dental checkup and root canal report.',
        sections: [
          {
            id: 'demographics',
            title: 'Patient Profile & Medical Alerts',
            content: 'Patient Rahul Sharma (34 yrs, Male). Allergies: Penicillin, Latex.',
          },
          {
            id: 'consultation_findings',
            title: 'Clinical Findings & Chief Complaint',
            content: 'Severe throbbing pain in lower molar #46. Diagnosis: Irreversible Pulpitis.',
          },
        ],
        odontogramSummary: {
          caries: ['#47'],
          restored: [],
          crowns: [],
          rct: ['#46'],
          missing: [],
          healthyCount: 28,
        },
        doctorSignoff: {
          doctorName: 'Dr. Jane Smith',
          doctorTitle: 'BDS, MDS - Dental Surgeon',
          registrationNumber: 'DCI-9988',
          clinicName: 'Apex Dental Care',
          clinicPhone: '+91 80 1234 5678',
          clinicEmail: 'care@apexdental.test',
          signoffDate: 'Nov 25, 2026',
          signatureLine: '____________________________________',
        },
      };
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders Automated Dental Reports header and patient selector banner', async () => {
    render(
      <MemoryRouter initialEntries={['/clinical/reports?patientId=pat-1001']}>
        <DentalReportsPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Automated Dental Reports/i)).toBeInTheDocument();
    expect(screen.getByText(/Rahul Sharma/i)).toBeInTheDocument();
    expect(screen.getByText(/ID: pt-1001/i)).toBeInTheDocument();
  });

  it('displays all 6 dental report types in the selector list', () => {
    render(
      <MemoryRouter initialEntries={['/clinical/reports?patientId=pat-1001']}>
        <DentalReportsPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Patient Clinical Summary/i)).toBeInTheDocument();
    expect(screen.getByText(/Consultation Report/i)).toBeInTheDocument();
    expect(screen.getByText(/Treatment & Procedure Report/i)).toBeInTheDocument();
    expect(screen.getByText(/Dental Examination Report/i)).toBeInTheDocument();
    expect(screen.getByText(/Patient Progress Report/i)).toBeInTheDocument();
    expect(screen.getByText(/Specialist Referral Letter/i)).toBeInTheDocument();
  });

  it('renders allergy safety warning pill for patients with registered allergies', () => {
    render(
      <MemoryRouter initialEntries={['/clinical/reports?patientId=pat-1001']}>
        <DentalReportsPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/Allergies: Penicillin, Latex/i)).toBeInTheDocument();
  });

  it('switches to Consultation Report and updates report parameters and view', async () => {
    render(
      <MemoryRouter initialEntries={['/clinical/reports?patientId=pat-1001']}>
        <DentalReportsPage />
      </MemoryRouter>
    );

    const consultCard = screen.getByText(/Consultation Report/i).closest('.dr-type-card');
    expect(consultCard).toBeInTheDocument();
    if (consultCard) {
      fireEvent.click(consultCard);
    }

    await waitFor(() => {
      expect(screen.getByText(/Select Consultation Visit/i)).toBeInTheDocument();
    });
  });

  it('allows switching to Edit Content mode and updating report title', async () => {
    render(
      <MemoryRouter initialEntries={['/clinical/reports?patientId=pat-1001']}>
        <DentalReportsPage />
      </MemoryRouter>
    );

    await screen.findByText(/Comprehensive dental checkup and root canal report/i);

    const editBtn = screen.getByRole('button', { name: /Edit Content/i });
    expect(editBtn).toBeInTheDocument();
    fireEvent.click(editBtn);

    expect(screen.getByText(/Edit Report Content Before Finalizing/i)).toBeInTheDocument();
    const titleInput = screen.getByDisplayValue(/Clinical Dental Summary: Rahul Sharma/i);
    expect(titleInput).toBeInTheDocument();

    fireEvent.change(titleInput, { target: { value: 'Updated Clinical Summary: Rahul Sharma' } });
    expect(titleInput).toHaveValue('Updated Clinical Summary: Rahul Sharma');
  });

  it('calls downloadDentalReportPdf when Download PDF button is clicked', async () => {
    const downloadPdfSpy = vi.spyOn(dentalReportPdf, 'downloadDentalReportPdf').mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={['/clinical/reports?patientId=pat-1001']}>
        <DentalReportsPage />
      </MemoryRouter>
    );

    await screen.findByText(/Comprehensive dental checkup and root canal report/i);

    const downloadBtn = screen.getByRole('button', { name: /Download PDF/i });
    expect(downloadBtn).toBeInTheDocument();
    fireEvent.click(downloadBtn);

    expect(downloadPdfSpy).toHaveBeenCalledTimes(1);
    expect(downloadPdfSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        reportType: 'CLINICAL_SUMMARY',
        patient: expect.objectContaining({ id: 'pat-1001' }),
      }),
      expect.any(String),
      expect.any(String),
      expect.any(Array)
    );
  });

  it('calls window.print() when Print button is clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/clinical/reports?patientId=pat-1001']}>
        <DentalReportsPage />
      </MemoryRouter>
    );

    await screen.findByText(/Comprehensive dental checkup and root canal report/i);

    const printBtn = screen.getByRole('button', { name: /^Print$/i });
    expect(printBtn).toBeInTheDocument();
    fireEvent.click(printBtn);

    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it('saves report to patient medical records when Save to Records is clicked', async () => {
    const saveSpy = vi.spyOn(dentalReportsApi, 'saveDentalReport').mockResolvedValue({
      success: true,
      documentId: 'doc-saved-123',
    });

    render(
      <MemoryRouter initialEntries={['/clinical/reports?patientId=pat-1001']}>
        <DentalReportsPage />
      </MemoryRouter>
    );

    await screen.findByText(/Comprehensive dental checkup and root canal report/i);

    const saveBtn = screen.getByRole('button', { name: /Save to Records/i });
    expect(saveBtn).toBeInTheDocument();
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: 'pat-1001',
          reportType: 'CLINICAL_SUMMARY',
        })
      );
      expect(screen.getByText(/Report successfully saved to patient medical records/i)).toBeInTheDocument();
    });
  });

  it('opens Saved Records drawer and displays historical reports', async () => {
    vi.spyOn(dentalReportsApi, 'fetchSavedPatientReports').mockResolvedValue([
      {
        id: 'doc-1',
        title: 'Patient Clinical Summary - Rahul Sharma',
        category: 'Dental Report',
        fileName: 'clinical_summary.json',
        fileSize: '4 KB',
        doctorName: 'Dr. Jane Smith',
        createdAt: '2026-11-20',
        reportType: 'CLINICAL_SUMMARY',
        summary: 'Comprehensive checkup and root canal treatment.',
        reportData: null,
      },
    ]);

    render(
      <MemoryRouter initialEntries={['/clinical/reports?patientId=pat-1001']}>
        <DentalReportsPage />
      </MemoryRouter>
    );

    const savedRecordsBtn = screen.getByRole('button', { name: /Saved Records/i });
    fireEvent.click(savedRecordsBtn);

    await waitFor(() => {
      expect(screen.getByText(/Saved Dental Reports: Rahul Sharma/i)).toBeInTheDocument();
      expect(screen.getByText(/Comprehensive checkup and root canal treatment/i)).toBeInTheDocument();
    });
  });
});
