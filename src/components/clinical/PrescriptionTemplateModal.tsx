import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  Zap,
  Pill,
  AlertTriangle,
  Check,
  ShieldAlert,
  Clock,
  Trash2,
  BookmarkPlus,
  BookOpen,
} from 'lucide-react';
import {
  PrescriptionTemplate,
  DentalProcedureCategory,
  DENTAL_PROCEDURE_CATEGORIES,
  getAllPrescriptionTemplates,
  deleteCustomPrescriptionTemplate,
  checkPatientAllergiesForTemplate,
} from '../../services/prescriptionTemplateService';
import '../../pages/clinical/prescriptions.css';

interface PrescriptionTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: PrescriptionTemplate) => void;
  patientName?: string;
  patientAllergies?: string[] | string;
}

export const PrescriptionTemplateModal: React.FC<PrescriptionTemplateModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  patientName,
  patientAllergies,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [templates, setTemplates] = useState<PrescriptionTemplate[]>(() => getAllPrescriptionTemplates());

  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      // 1. Category filter
      if (selectedCategory !== 'ALL' && tpl.procedureCategory !== selectedCategory) {
        return false;
      }

      // 2. Search query
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const inTitle = tpl.title.toLowerCase().includes(query);
        const inProc = tpl.procedureName.toLowerCase().includes(query);
        const inDiag = tpl.defaultDiagnosis.toLowerCase().includes(query);
        const inCdt = (tpl.cdtCode || '').toLowerCase().includes(query);
        const inMeds = tpl.items.some(
          (it) =>
            it.medicineName.toLowerCase().includes(query) ||
            (it.purpose && it.purpose.toLowerCase().includes(query))
        );
        return inTitle || inProc || inDiag || inCdt || inMeds;
      }

      return true;
    });
  }, [templates, selectedCategory, searchTerm]);

  const handleDeleteCustom = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this custom prescription template?')) {
      deleteCustomPrescriptionTemplate(id);
      setTemplates(getAllPrescriptionTemplates());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="rx-modal-overlay" style={{ zIndex: 1200 }}>
      <div className="rx-modal-dialog rx-modal-dialog-wide rxt-modal-dialog" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="rx-modal-header rxt-header">
          <div className="rx-modal-header-info">
            <div className="rx-modal-header-icon" style={{ background: 'rgba(13, 148, 136, 0.12)', color: '#0d9488' }}>
              <Zap size={20} />
            </div>
            <div className="rx-modal-header-text">
              <h2>Reusable Dental Prescription Templates</h2>
              <p>
                Standard clinical protocols for common procedures{patientName ? ` · Patient: ${patientName}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rx-modal-close-btn"
            aria-label="Close templates"
          >
            <X size={18} />
          </button>
        </div>

        {/* Patient Allergy Notice if present */}
        {patientAllergies && (
          <div className="rxt-patient-strip">
            <ShieldAlert size={16} />
            <span>
              Patient Allergies & Safety Alerts:{' '}
              <strong>
                {Array.isArray(patientAllergies) ? patientAllergies.join(', ') : patientAllergies}
              </strong>
            </span>
          </div>
        )}

        {/* Search & Category Filter Toolbar */}
        <div className="rxt-toolbar">
          <div className="rxt-search-wrapper">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search procedures or medications..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="rxt-search-input"
              autoFocus
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="rxt-search-clear"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="rxt-category-tabs">
            <button
              type="button"
              className={`rxt-category-tab ${selectedCategory === 'ALL' ? 'rxt-category-tab-active' : ''}`}
              onClick={() => setSelectedCategory('ALL')}
            >
              All ({templates.length})
            </button>
            {DENTAL_PROCEDURE_CATEGORIES.map((cat) => {
              const count = templates.filter((t) => t.procedureCategory === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  className={`rxt-category-tab ${selectedCategory === cat ? 'rxt-category-tab-active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Template List Cards */}
        <div className="rx-modal-body rxt-body">
          {filteredTemplates.length > 0 ? (
            <div className="rxt-grid">
              {filteredTemplates.map((template) => {
                const allergyWarnings = checkPatientAllergiesForTemplate(template, patientAllergies);
                const hasAllergyConflict = allergyWarnings.length > 0;

                return (
                  <div
                    key={template.id}
                    className={`rxt-card ${hasAllergyConflict ? 'rxt-card-warning' : ''}`}
                  >
                    <div className="rxt-card-header">
                      <div className="rxt-card-badges">
                        <span className={`rxt-badge rxt-badge-${template.procedureCategory.toLowerCase().replace(/\s+/g, '-')}`}>
                          {template.procedureCategory}
                        </span>
                        {template.cdtCode && (
                          <span className="rxt-cdt-badge">
                            {template.cdtCode}
                          </span>
                        )}
                        {template.isCustom && (
                          <span className="rxt-custom-badge">
                            Custom Template
                          </span>
                        )}
                      </div>

                      {template.isCustom && (
                        <button
                          type="button"
                          className="rxt-btn-delete"
                          onClick={(e) => handleDeleteCustom(e, template.id)}
                          title="Delete custom template"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <h3 className="rxt-card-title">{template.title}</h3>

                    {/* Allergy Warning Strip */}
                    {hasAllergyConflict && (
                      <div className="rxt-allergy-alert">
                        <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                        <div>
                          <strong>Allergy Alert:</strong>
                          <ul style={{ margin: '2px 0 0', paddingLeft: '16px' }}>
                            {allergyWarnings.map((w, idx) => (
                              <li key={idx}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

                    {/* Medications List */}
                    <div className="rxt-meds-list">
                      {template.items.map((it, idx) => (
                        <div key={idx} className="rxt-med-item">
                          <div className="rxt-med-main">
                            <span className="rxt-med-name">
                              {it.medicineName} {it.strength ? `(${it.strength})` : ''}
                            </span>
                            {it.purpose && (
                              <span className="rxt-med-purpose">{it.purpose}</span>
                            )}
                          </div>
                          <div className="rxt-med-sub">
                            <span className="rxt-med-spec">
                              {it.dosage ? `${it.dosage} · ` : ''}{it.frequency} · {it.duration}
                            </span>
                            {it.instructions && (
                              <span className="rxt-med-inst">{it.instructions}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {template.cautionNotes && (
                      <div className="rxt-caution-note">
                        <Clock size={13} style={{ flexShrink: 0 }} />
                        <span>{template.cautionNotes}</span>
                      </div>
                    )}

                    {/* Card Footer Apply Button */}
                    <div className="rxt-card-footer">
                      <button
                        type="button"
                        className={`rx-btn ${hasAllergyConflict ? 'rx-btn-secondary' : 'rx-btn-primary'} rxt-apply-btn`}
                        onClick={() => {
                          onSelectTemplate(template);
                          onClose();
                        }}
                      >
                        <Check size={15} />
                        <span>Apply Template & Customize</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rxt-empty-state">
              <BookOpen size={42} style={{ opacity: 0.4 }} />
              <h4>No Prescription Templates Found</h4>
              <p>No procedure templates match "{searchTerm}". Try a different search term or category filter.</p>
              <button
                type="button"
                className="rx-btn rx-btn-secondary rx-btn-sm"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('ALL');
                }}
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="rx-modal-footer" style={{ justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="rx-btn rx-btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
