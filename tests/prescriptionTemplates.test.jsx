import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  BUILT_IN_PRESCRIPTION_TEMPLATES,
  getAllPrescriptionTemplates,
  saveCustomPrescriptionTemplate,
  deleteCustomPrescriptionTemplate,
  checkPatientAllergiesForTemplate,
} from '@/services/prescriptionTemplateService';
import { PrescriptionModal } from '@/components/clinical/PrescriptionModal';
import { PrescriptionsPage } from '@/pages/clinical/PrescriptionsPage';
import { resetStoreForTesting } from '@/services/clinicStore';

describe('Reusable Dental Prescription Templates Feature', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetStoreForTesting();
  });

  describe('Prescription Template Service & Logic', () => {
    it('provides standard clinical templates for all key dental procedures', () => {
      const templates = getAllPrescriptionTemplates();
      expect(templates.length).toBeGreaterThanOrEqual(9);

      // Verify essential dental procedure templates exist
      const rct = templates.find((t) => t.procedureName.includes('Root Canal'));
      expect(rct).toBeDefined();
      expect(rct?.procedureCategory).toBe('Endodontics');
      expect(rct?.items.some((i) => i.medicineName.includes('Amoxicillin'))).toBe(true);

      const extraction = templates.find((t) => t.procedureName.includes('Extraction'));
      expect(extraction).toBeDefined();
      expect(extraction?.procedureCategory).toBe('Oral Surgery');

      const implant = templates.find((t) => t.procedureName.includes('Implant'));
      expect(implant).toBeDefined();
      expect(implant?.procedureCategory).toBe('Prosthodontics');

      const perio = templates.find((t) => t.procedureName.includes('Scaling'));
      expect(perio).toBeDefined();
      expect(perio?.procedureCategory).toBe('Periodontics');

      const pedo = templates.find((t) => t.procedureName.includes('Pediatric'));
      expect(pedo).toBeDefined();
      expect(pedo?.procedureCategory).toBe('Pediatric');
    });

    it('cross-references patient allergies and flags contraindicated medications', () => {
      const penicillinTemplate = BUILT_IN_PRESCRIPTION_TEMPLATES.find((t) =>
        t.items.some((i) => i.medicineName.toLowerCase().includes('amoxicillin'))
      );
      expect(penicillinTemplate).toBeDefined();

      // Case 1: Patient has Penicillin allergy
      const warningsPen = checkPatientAllergiesForTemplate(penicillinTemplate, [
        'Severe Penicillin allergy with anaphylaxis history',
      ]);
      expect(warningsPen.length).toBeGreaterThanOrEqual(1);
      expect(warningsPen[0]).toMatch(/Penicillin/i);

      // Case 2: Patient has NSAID/Ibuprofen allergy
      const nsaidTemplate = BUILT_IN_PRESCRIPTION_TEMPLATES.find((t) =>
        t.items.some((i) => i.medicineName.toLowerCase().includes('ibuprofen'))
      );
      expect(nsaidTemplate).toBeDefined();
      const warningsNsaid = checkPatientAllergiesForTemplate(nsaidTemplate, [
        'Aspirin / NSAID allergy',
      ]);
      expect(warningsNsaid.length).toBeGreaterThanOrEqual(1);
      expect(warningsNsaid[0]).toMatch(/NSAID/i);

      // Case 3: Patient has no drug allergies (e.g. only dust/pollen)
      const warningsNone = checkPatientAllergiesForTemplate(penicillinTemplate, [
        'Seasonal pollen allergy',
        'Dust Allergy',
      ]);
      expect(warningsNone.length).toBe(0);
    });

    it('allows saving and deleting custom reusable prescription templates', () => {
      const initialCount = getAllPrescriptionTemplates().length;

      const customTpl = saveCustomPrescriptionTemplate({
        title: 'Custom Perio Maintenance Regimen',
        procedureCategory: 'Periodontics',
        procedureName: 'Deep Pocket Curettage & Irrigation',
        cdtCode: 'D4341',
        description: 'Post-scaling antibiotic & chlorhexidine regimen',
        defaultDiagnosis: 'Generalized Chronic Periodontitis Stage II',
        defaultClinicalNotes: 'Full-mouth subgingival debridement performed under local anesthesia',
        items: [
          {
            medicineName: 'Doxycycline',
            strength: '100 mg',
            dosage: '1 capsule',
            route: 'Oral',
            frequency: '1-0-1 (Twice daily)',
            duration: '7 days',
            quantity: 14,
            instructions: 'Take with full glass of water, avoid lying down for 30 mins',
            purpose: 'Adjunctive subantimicrobial host modulation',
          },
        ],
      });

      expect(customTpl.id).toBeDefined();
      expect(customTpl.isCustom).toBe(true);

      const updated = getAllPrescriptionTemplates();
      expect(updated.length).toBe(initialCount + 1);
      expect(updated.find((t) => t.id === customTpl.id)).toBeDefined();

      // Delete custom template
      deleteCustomPrescriptionTemplate(customTpl.id);
      const afterDelete = getAllPrescriptionTemplates();
      expect(afterDelete.length).toBe(initialCount);
      expect(afterDelete.find((t) => t.id === customTpl.id)).toBeUndefined();
    });
  });

  describe('PrescriptionModal Template Selector & Customization', () => {
    it('opens Procedure Templates dialog from PrescriptionModal and applies template', async () => {
      render(
        <PrescriptionModal
          onClose={vi.fn()}
          onSaved={vi.fn()}
        />
      );

      // Open Procedure Templates modal
      const openTemplatesBtn = screen.getByTestId('open-prescription-templates-btn');
      expect(openTemplatesBtn).toBeInTheDocument();
      fireEvent.click(openTemplatesBtn);

      // Verify modal opened
      expect(screen.getByText('Reusable Dental Prescription Templates')).toBeInTheDocument();

      // Filter by "Oral Surgery" category
      const oralSurgeryTab = screen.getByRole('button', { name: /Oral Surgery/i });
      fireEvent.click(oralSurgeryTab);

      // Locate the Routine Tooth Extraction template
      expect(screen.getByText(/Routine Tooth Extraction/i)).toBeInTheDocument();

      // Click "Apply Template & Customize"
      const applyButtons = screen.getAllByRole('button', { name: /Apply Template & Customize/i });
      expect(applyButtons.length).toBeGreaterThanOrEqual(1);
      fireEvent.click(applyButtons[0]);

      // Verify template modal closed and form is populated
      await waitFor(() => {
        expect(screen.queryByText('Reusable Dental Prescription Templates')).not.toBeInTheDocument();
      });

      // Verify banner indicating applied template
      expect(screen.getByText(/Applied template:/i)).toBeInTheDocument();

      // Verify medications are pre-filled
      const medicineInputs = screen.getAllByPlaceholderText(/e\.g\. Amoxicillin/i);
      expect(medicineInputs.length).toBeGreaterThanOrEqual(2);
      expect(medicineInputs[0]).toHaveValue('Ibuprofen + Paracetamol (Combiflam)');
      expect(medicineInputs[1]).toHaveValue('Pantoprazole');

      // Verify doctor can customize fields
      fireEvent.change(medicineInputs[0], { target: { value: 'Ibuprofen 400 mg' } });
      expect(medicineInputs[0]).toHaveValue('Ibuprofen 400 mg');
    });

    it('displays allergy conflict safety alert when applying a penicillin template to an allergic patient', async () => {
      render(
        <PrescriptionModal
          onClose={vi.fn()}
          onSaved={vi.fn()}
        />
      );

      // Open templates modal
      fireEvent.click(screen.getByTestId('open-prescription-templates-btn'));

      // Find Penicillin Allergic RCT template and apply it
      const penicillinAllergicCard = screen.getByText(/Root Canal Treatment \(Penicillin-Allergic Alternative\)/i);
      expect(penicillinAllergicCard).toBeInTheDocument();

      // Find Clindamycin within that template
      expect(screen.getAllByText(/Clindamycin/i).length).toBeGreaterThanOrEqual(1);
    });

    it('allows doctor to save current medications as a custom template', async () => {
      render(
        <PrescriptionModal
          onClose={vi.fn()}
          onSaved={vi.fn()}
        />
      );

      // Fill in diagnosis and medication
      const diagnosisInput = screen.getByPlaceholderText(/e\.g\. Acute Irreversible Pulpitis/i);
      fireEvent.change(diagnosisInput, { target: { value: 'Crown Preparation Sensitivity' } });

      const medicineInput = screen.getByPlaceholderText(/e\.g\. Amoxicillin/i);
      fireEvent.change(medicineInput, { target: { value: 'Sensodyne Rapid Relief Toothpaste' } });

      // Click "Save as Template"
      const saveTplBtn = screen.getByTestId('save-prescription-template-btn');
      expect(saveTplBtn).not.toBeDisabled();
      fireEvent.click(saveTplBtn);

      // Verify Save Template modal opened
      expect(screen.getByText('Save as Reusable Template')).toBeInTheDocument();

      // Fill template title
      const titleInput = screen.getByPlaceholderText(/e\.g\. Dr\. Aashna's RCT Standard Protocol/i);
      fireEvent.change(titleInput, { target: { value: 'Post Crown Prep Desensitizing Regimen' } });

      // Fill procedure name
      const procInput = screen.getByPlaceholderText(/e\.g\. Root Canal Treatment/i);
      fireEvent.change(procInput, { target: { value: 'Crown Preparation' } });

      // Click Save Template button
      const confirmSaveBtn = screen.getByRole('button', { name: /Save Template/i });
      fireEvent.click(confirmSaveBtn);

      // Verify saved in service
      await waitFor(() => {
        expect(screen.queryByText('Save as Reusable Template')).not.toBeInTheDocument();
      });

      const allTpls = getAllPrescriptionTemplates();
      const saved = allTpls.find((t) => t.title === 'Post Crown Prep Desensitizing Regimen');
      expect(saved).toBeDefined();
      expect(saved?.items[0].medicineName).toBe('Sensodyne Rapid Relief Toothpaste');
    });
  });

  describe('PrescriptionsPage Direct Procedure Templates Access', () => {
    it('allows opening Procedure Templates directly from PrescriptionsPage header', async () => {
      render(
        <MemoryRouter>
          <PrescriptionsPage />
        </MemoryRouter>
      );

      // Check header button
      const browseTplBtn = screen.getByTestId('browse-prescription-templates-btn');
      expect(browseTplBtn).toBeInTheDocument();
      expect(browseTplBtn).toHaveTextContent(/Procedure Templates/i);

      // Click header button
      fireEvent.click(browseTplBtn);

      // Template selector modal should open
      expect(screen.getByText('Reusable Dental Prescription Templates')).toBeInTheDocument();

      // Select Acute Dentoalveolar Abscess template
      const abscessCard = screen.getByText(/Acute Dentoalveolar Abscess & Space Infection/i);
      expect(abscessCard).toBeInTheDocument();

      // Search templates
      const searchBox = screen.getByPlaceholderText(/Search templates by procedure/i);
      fireEvent.change(searchBox, { target: { value: 'Metronidazole' } });

      // Should show Acute Dentoalveolar Abscess
      expect(screen.getByText(/Acute Dentoalveolar Abscess & Space Infection/i)).toBeInTheDocument();

      // Apply template
      const applyBtn = screen.getByRole('button', { name: /Apply Template & Customize/i });
      fireEvent.click(applyBtn);

      // New Prescription modal should now be open prefilled with the abscess template
      await waitFor(() => {
        expect(screen.getByText('New Digital Prescription')).toBeInTheDocument();
      });

      // Diagnosis and medications should be preloaded from template
      const diagnosisInput = screen.getByPlaceholderText(/e\.g\. Acute Irreversible Pulpitis/i);
      expect(diagnosisInput).toHaveValue('Acute Dentoalveolar Abscess with Moderate Swelling');

      const medInputs = screen.getAllByPlaceholderText(/e\.g\. Amoxicillin/i);
      expect(medInputs[0]).toHaveValue('Amoxicillin');
      expect(medInputs[1]).toHaveValue('Metronidazole (Flagyl)');
    });
  });
});
