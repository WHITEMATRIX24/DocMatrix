import React, { useState } from 'react';
import { X, BookmarkPlus, Save, AlertCircle } from 'lucide-react';
import {
  PrescriptionTemplate,
  DentalProcedureCategory,
  DENTAL_PROCEDURE_CATEGORIES,
  saveCustomPrescriptionTemplate,
  PrescriptionTemplateItem,
} from '../../services/prescriptionTemplateService';

interface SavePrescriptionTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (template: PrescriptionTemplate) => void;
  defaultDiagnosis: string;
  defaultClinicalNotes: string;
  items: Array<Omit<PrescriptionTemplateItem, 'quantity'> & { quantity?: number }>;
}

export const SavePrescriptionTemplateModal: React.FC<SavePrescriptionTemplateModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  defaultDiagnosis,
  defaultClinicalNotes,
  items,
}) => {
  const [title, setTitle] = useState('');
  const [procedureName, setProcedureName] = useState('');
  const [procedureCategory, setProcedureCategory] = useState<DentalProcedureCategory>('General');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Template title is required.');
      return;
    }
    if (!procedureName.trim()) {
      setError('Dental procedure name is required.');
      return;
    }
    if (items.length === 0 || !items[0].medicineName.trim()) {
      setError('Prescription must have at least one medication to save as a template.');
      return;
    }

    try {
      const saved = saveCustomPrescriptionTemplate({
        title: title.trim(),
        procedureName: procedureName.trim(),
        procedureCategory,
        defaultDiagnosis: defaultDiagnosis.trim() || 'Dental Procedure Follow-up',
        defaultClinicalNotes: defaultClinicalNotes.trim() || '',
        description: description.trim() || `Reusable template for ${procedureName.trim()}`,
        items: items.map((it) => ({
          medicineName: it.medicineName.trim(),
          strength: it.strength?.trim() || '',
          dosage: it.dosage?.trim() || '1 tablet',
          route: it.route || 'Oral',
          frequency: it.frequency?.trim() || '1-0-1',
          duration: it.duration?.trim() || '5 days',
          quantity: it.quantity || 10,
          instructions: it.instructions?.trim() || 'Take after meals',
          purpose: it.purpose || undefined,
        })),
      });

      onSaved(saved);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save template.');
    }
  };

  return (
    <div className="rx-modal-overlay" style={{ zIndex: 1300 }}>
      <div className="rx-modal-dialog" style={{ maxWidth: '480px' }} role="dialog" aria-modal="true">
        <div className="rx-modal-header">
          <div className="rx-modal-header-info">
            <div className="rx-modal-header-icon" style={{ background: 'rgba(13, 148, 136, 0.12)', color: '#0d9488' }}>
              <BookmarkPlus size={20} />
            </div>
            <div className="rx-modal-header-text">
              <h2>Save as Reusable Template</h2>
              <p>Save current {items.length} medications as a dental procedure protocol</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rx-modal-close-btn" aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="rx-modal-body" style={{ gap: '14px', display: 'flex', flexDirection: 'column' }}>
            {error && (
              <div className="rx-alert-box rx-alert-danger" style={{ margin: 0 }}>
                <AlertCircle size={16} />
                <span style={{ fontSize: '13px' }}>{error}</span>
              </div>
            )}

            <div className="rx-form-group">
              <label className="rx-label">
                Template Title <span className="rx-req">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Dr. Aashna's RCT Standard Protocol"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rx-input"
                autoFocus
              />
            </div>

            <div className="rx-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
              <div className="rx-form-group">
                <label className="rx-label">
                  Procedure Name <span className="rx-req">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Root Canal Treatment"
                  value={procedureName}
                  onChange={(e) => setProcedureName(e.target.value)}
                  className="rx-input"
                />
              </div>

              <div className="rx-form-group">
                <label className="rx-label">Category</label>
                <select
                  value={procedureCategory}
                  onChange={(e) => setProcedureCategory(e.target.value as DentalProcedureCategory)}
                  className="rx-select"
                >
                  {DENTAL_PROCEDURE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rx-form-group">
              <label className="rx-label">Short Description / Notes (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Antibiotic + NSAID combination for adult toothache"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rx-input"
              />
            </div>

            <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', padding: '6px 10px', background: 'rgba(0,0,0,0.02)', borderRadius: '6px' }}>
              Includes {items.length} medication items currently configured in this prescription.
            </div>
          </div>

          <div className="rx-modal-footer">
            <button type="button" onClick={onClose} className="rx-btn rx-btn-secondary">
              Cancel
            </button>
            <button type="submit" className="rx-btn rx-btn-primary">
              <Save size={15} />
              <span>Save Template</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
