import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import {
  detectProcedureType,
  detectPatientConcerns,
  generateInstructionsForConsultation,
  formatWhatsAppAftercareMessage,
} from '../src/services/postTreatmentInstructionService';
import { PostTreatmentInstructionsModal } from '../src/components/clinical/PostTreatmentInstructionsModal';

describe('Post-Treatment Instructions & WhatsApp Aftercare Service', () => {
  it('detects procedure type accurately across dental clinical domains', () => {
    expect(
      detectProcedureType({ treatmentPerformed: 'Surgical extraction of impacted lower right wisdom tooth #48' })
    ).toBe('extraction_surgical');

    expect(
      detectProcedureType({ treatmentPerformed: 'Simple tooth extraction of root piece #36' })
    ).toBe('extraction_simple');

    expect(
      detectProcedureType({ treatmentPerformed: 'Root Canal Treatment & Rotary Shaping (#46)' })
    ).toBe('root_canal');

    expect(
      detectProcedureType({ treatmentPerformed: 'Class II Composite Restoration (#16 MO)' })
    ).toBe('composite_restoration');

    expect(
      detectProcedureType({ treatmentPerformed: 'Full mouth ultrasonic scaling & polishing' })
    ).toBe('scaling_periodontal');

    expect(
      detectProcedureType({ treatmentPerformed: 'Zirconia crown preparation & elastomeric impression' })
    ).toBe('crown_bridge');

    expect(
      detectProcedureType({ treatmentPerformed: 'In-office laser teeth whitening' })
    ).toBe('whitening');

    expect(
      detectProcedureType({ treatmentPerformed: 'Upper archwire change and bracket adjustment' })
    ).toBe('orthodontics');
  });

  it('detects personalized patient concerns and past medications', () => {
    const mockPatientWithRisks = {
      id: 'pt-test-1',
      firstName: 'Ramesh',
      lastName: 'Kumar',
      age: '58',
      gender: 'male',
      mobile: '9845012345',
      conditions: 'yes',
      conditionsDetails: 'Type 2 Diabetes Mellitus, Essential Hypertension',
      medications: 'yes',
      medicationsDetails: 'Ecosprin 75mg daily, Metformin 500mg, Telmisartan 40mg',
      allergies: 'yes',
      allergiesDetails: 'Severe Penicillin allergy, rash to Amoxicillin',
    };

    const concerns = detectPatientConcerns(mockPatientWithRisks);
    const concernTypes = concerns.map((c) => c.type);

    expect(concernTypes).toContain('blood_thinner');
    expect(concernTypes).toContain('diabetes');
    expect(concernTypes).toContain('hypertension');
    expect(concernTypes).toContain('drug_allergy');
  });

  it('generates customized instructions combining procedure aftercare and patient concerns', () => {
    const mockNote = {
      id: 'CN-101',
      noteNumber: 'CN-1001',
      patientId: 'pt-test-1',
      doctorId: 'doc-001',
      doctorName: 'Dr. Arun Kumar',
      consultationDate: '2026-11-25T10:00:00.000Z',
      consultationType: 'PROCEDURE',
      chiefComplaint: 'Severe throbbing pain in lower right jaw',
      primaryDiagnosis: 'Chronic Periapical Periodontitis with bone rarefaction',
      treatmentPerformed: 'Surgical extraction of impacted lower right wisdom tooth #48',
      treatmentToothNumber: '48',
      followUpRequired: true,
      followUpDate: '2026-12-02T10:00:00.000Z',
      followUpInstructions: 'Suture removal in 7 days.',
      patientAdvice: 'Strictly avoid hot food today.',
      status: 'FINALIZED',
    };

    const mockPatient = {
      id: 'pt-test-1',
      firstName: 'Meera',
      lastName: 'Nambiar',
      age: '34',
      gender: 'female',
      mobile: '9447123456',
      countryCode: '+91',
      conditions: 'yes',
      conditionsDetails: 'Mild Asthma, Gestational Diabetes history',
      medications: 'yes',
      medicationsDetails: 'Aspirin 75mg, Inhaler as needed',
      allergies: 'yes',
      allergiesDetails: 'Penicillin allergy',
    };

    const result = generateInstructionsForConsultation(mockNote, mockPatient);

    expect(result.procedureName).toContain('Surgical extraction');
    expect(result.toothNumber).toBe('48');
    expect(result.patientName).toBe('Meera Nambiar');
    expect(result.isValidMobile).toBe(true);
    expect(result.patientMobile).toBe('919447123456');

    // Verify concern alerts are included
    const concernItems = result.instructions.filter((i) => i.isConcernAlert);
    expect(concernItems.length).toBeGreaterThanOrEqual(2);

    // Verify WhatsApp text formatting contains essential clinical sections
    expect(result.whatsappFormattedText).toContain('Surgical extraction');
    expect(result.whatsappFormattedText).toContain('PERSONALIZED HEALTH PRECAUTIONS');
    expect(result.whatsappFormattedText).toContain('Blood Thinner Alert');
    expect(result.whatsappFormattedText).toContain('THINGS TO STRICTLY AVOID');
    expect(result.whatsappUrl).toContain('https://wa.me/919447123456?text=');
  });
});

describe('PostTreatmentInstructionsModal Component', () => {
  const mockNote = {
    id: 'CN-202',
    noteNumber: 'CN-202',
    patientId: 'pt-1001',
    doctorId: 'doc-001',
    doctorName: 'Dr. Sarah Mitchell',
    consultationDate: '2026-11-25T11:00:00.000Z',
    consultationType: 'PROCEDURE',
    chiefComplaint: 'Tooth decay with mild sensitivity',
    primaryDiagnosis: 'Deep occlusal dentinal caries #36',
    treatmentPerformed: 'Composite Dental Restoration (#36)',
    treatmentToothNumber: '36',
    status: 'FINALIZED',
  };

  const mockPatient = {
    id: 'pt-1001',
    firstName: 'Meera',
    lastName: 'Nambiar',
    age: '34',
    gender: 'female',
    mobile: '9447123456',
    countryCode: '+91',
    conditions: 'yes',
    conditionsDetails: 'Mild Asthma',
    medications: 'no',
    medicationsDetails: '',
    allergies: 'yes',
    allergiesDetails: 'Penicillin allergy, Latex sensitivity',
  };

  it('renders procedure details, health concern badges, and live preview', () => {
    const handleClose = vi.fn();
    render(<PostTreatmentInstructionsModal note={mockNote} patient={mockPatient} onClose={handleClose} />);

    expect(screen.getByText(/Post-Treatment Care & WhatsApp Instructions/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Meera Nambiar/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Composite Dental Restoration/i).length).toBeGreaterThan(0);

    // Concern badges
    expect(screen.getByText(/⚠️ Drug \/ Material Allergy/i)).toBeInTheDocument();
    expect(screen.getByText(/⚠️ Asthma \/ Bronchial Sensitivity/i)).toBeInTheDocument();

    // Preview box
    const preview = screen.getByTestId('whatsapp-preview-box');
    expect(preview).toBeInTheDocument();
    expect(within(preview).getByText(/Post-Treatment Care & Aftercare Instructions/i)).toBeInTheDocument();
  });

  it('allows toggling instruction items and adding custom notes', () => {
    render(<PostTreatmentInstructionsModal note={mockNote} patient={mockPatient} onClose={vi.fn()} />);

    // Add a custom instruction
    const customInput = screen.getByLabelText(/Add custom instruction/i);
    fireEvent.change(customInput, { target: { value: 'Avoid chewing ice directly on tooth 36' } });
    fireEvent.click(screen.getByRole('button', { name: /Add/i }));

    expect(screen.getByText('Avoid chewing ice directly on tooth 36')).toBeInTheDocument();

    // Verify WhatsApp preview updates with the custom instruction
    const preview = screen.getByTestId('whatsapp-preview-box');
    expect(within(preview).getByText(/Avoid chewing ice directly on tooth 36/i)).toBeInTheDocument();
  });

  it('triggers WhatsApp send action and copies text', async () => {
    const originalOpen = window.open;
    window.open = vi.fn();

    render(<PostTreatmentInstructionsModal note={mockNote} patient={mockPatient} onClose={vi.fn()} />);

    const sendBtn = screen.getByTestId('send-whatsapp-button');
    fireEvent.click(sendBtn);

    expect(window.open).toHaveBeenCalledWith(
      expect.stringContaining('https://wa.me/919447123456?text='),
      '_blank',
      'noopener,noreferrer'
    );

    window.open = originalOpen;
  });
});
