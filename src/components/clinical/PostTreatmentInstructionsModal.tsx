import React, { useState, useMemo } from 'react';
import {
  X,
  MessageCircle,
  Copy,
  Check,
  Printer,
  AlertTriangle,
  Send,
  Plus,
  Trash2,
  Stethoscope,
  ShieldAlert,
  Phone,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { ClinicalNoteRecord, PatientRecord } from '../../services/clinicStore';
import {
  generateInstructionsForConsultation,
  formatWhatsAppAftercareMessage,
  InstructionItem,
  DetectedConcern,
} from '../../services/postTreatmentInstructionService';
import { validateWhatsAppPhone } from '../../services/whatsappService';
import '../../pages/clinical/postTreatmentInstructions.css';

interface PostTreatmentInstructionsModalProps {
  note: ClinicalNoteRecord;
  patient?: any;
  onClose: () => void;
}

export const PostTreatmentInstructionsModal: React.FC<PostTreatmentInstructionsModalProps> = ({
  note,
  patient,
  onClose,
}) => {
  // Initialize instructions from service
  const baseData = useMemo(() => {
    return generateInstructionsForConsultation(note, patient);
  }, [note, patient]);

  const [instructions, setInstructions] = useState<InstructionItem[]>(baseData.instructions);
  const [customMobile, setCustomMobile] = useState<string>(
    patient?.mobile || note.patient?.mobile || ''
  );
  const [customMobileError, setCustomMobileError] = useState<string | null>(null);
  const [customNoteText, setCustomNoteText] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  // Phone validation
  const phoneCheck = useMemo(() => {
    return validateWhatsAppPhone(customMobile, patient?.countryCode || '+91');
  }, [customMobile, patient?.countryCode]);

  // Toggle instruction
  const handleToggleInstruction = (id: string) => {
    setInstructions((prev) =>
      prev.map((it) => (it.id === id ? { ...it, enabled: !it.enabled } : it))
    );
  };

  // Add custom instruction
  const handleAddCustomInstruction = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customNoteText.trim()) return;

    const newItem: InstructionItem = {
      id: `custom-${Date.now()}`,
      category: 'doctor_note',
      categoryLabel: "Doctor's Specific Note",
      text: customNoteText.trim(),
      enabled: true,
    };

    setInstructions((prev) => [newItem, ...prev]);
    setCustomNoteText('');
  };

  // Delete an instruction
  const handleDeleteInstruction = (id: string) => {
    setInstructions((prev) => prev.filter((it) => it.id !== id));
  };

  // Live formatted WhatsApp message
  const currentWhatsAppText = useMemo(() => {
    return formatWhatsAppAftercareMessage({
      patientName: baseData.patientName,
      doctorName: baseData.doctorName,
      clinicName: baseData.clinicName,
      clinicPhone: baseData.clinicPhone,
      procedureName: baseData.procedureName,
      toothNumber: baseData.toothNumber,
      activeInstructions: instructions.filter((i) => i.enabled),
      followUpDate: baseData.followUpDate,
    });
  }, [baseData, instructions]);

  // WhatsApp dispatch URL
  const whatsappUrl = useMemo(() => {
    const digits = phoneCheck.valid ? phoneCheck.digits : '';
    if (digits) {
      return `https://wa.me/${digits}?text=${encodeURIComponent(currentWhatsAppText)}`;
    }
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(currentWhatsAppText)}`;
  }, [phoneCheck, currentWhatsAppText]);

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(currentWhatsAppText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = currentWhatsAppText;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  // Trigger WhatsApp dispatch
  const handleSendWhatsApp = () => {
    if (!phoneCheck.valid) {
      setCustomMobileError('Please enter a valid 10-digit mobile number before sharing.');
      return;
    }
    setCustomMobileError(null);
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  // Print slip
  const handlePrintSlip = () => {
    window.print();
  };

  // Filtered list
  const filteredInstructions = useMemo(() => {
    if (activeFilter === 'all') return instructions;
    if (activeFilter === 'concerns') return instructions.filter((i) => i.isConcernAlert);
    if (activeFilter === 'immediate') return instructions.filter((i) => i.category === 'immediate' || i.category === 'doctor_note');
    return instructions.filter((i) => i.category === activeFilter);
  }, [instructions, activeFilter]);

  return (
    <div className="cn-modal-overlay" data-testid="post-treatment-instructions-modal">
      <div className="cn-modal-dialog cn-modal-dialog-large pti-dialog" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="cn-modal-header pti-header">
          <div className="cn-modal-header-info">
            <div className="cn-icon-badge pti-whatsapp-badge">
              <MessageCircle size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2>Post-Treatment Care &amp; WhatsApp Instructions</h2>
                <span className="pti-badge pti-badge-procedure">
                  <Stethoscope size={13} /> {baseData.procedureCategory}
                </span>
              </div>
              <p>
                Auto-generated aftercare tailored for <strong>{baseData.patientName}</strong> following{' '}
                <strong>{baseData.procedureName}</strong>
                {baseData.toothNumber ? ` (Tooth #${baseData.toothNumber})` : ''}.
              </p>
            </div>
          </div>

          <button
            type="button"
            className="cn-modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="cn-modal-body pti-body">
          {/* Patient Details & Detected Health Concerns Strip */}
          <div className="pti-overview-strip">
            <div className="pti-patient-info">
              <div className="pti-info-col">
                <span className="pti-label">Patient</span>
                <span className="pti-val">{baseData.patientName}</span>
              </div>
              <div className="pti-info-col">
                <span className="pti-label">Procedure Done</span>
                <span className="pti-val">
                  {baseData.procedureName}
                  {baseData.toothNumber ? ` • Tooth #${baseData.toothNumber}` : ''}
                </span>
              </div>
              <div className="pti-info-col">
                <span className="pti-label">Clinician</span>
                <span className="pti-val">{baseData.doctorName}</span>
              </div>
              <div className="pti-info-col pti-phone-col">
                <span className="pti-label">WhatsApp Mobile</span>
                <div className="pti-phone-input-wrap">
                  <Phone size={13} />
                  <input
                    type="tel"
                    className="pti-phone-input"
                    value={customMobile}
                    onChange={(e) => {
                      setCustomMobile(e.target.value);
                      setCustomMobileError(null);
                    }}
                    placeholder="10-digit mobile"
                    aria-label="Patient mobile number"
                  />
                </div>
                {!phoneCheck.valid && customMobile && (
                  <span className="pti-phone-error">Invalid phone</span>
                )}
              </div>
            </div>

            {/* Detected Concerns Badges */}
            {baseData.detectedConcerns.length > 0 ? (
              <div className="pti-concerns-box">
                <div className="pti-concerns-title">
                  <ShieldAlert size={14} />
                  <span>Personalized Medical Concerns Detected:</span>
                </div>
                <div className="pti-concerns-pills">
                  {baseData.detectedConcerns.map((c) => (
                    <span
                      key={c.type}
                      className="pti-concern-pill"
                      style={{ borderColor: c.badgeColor, color: c.badgeColor }}
                    >
                      ⚠️ {c.label}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="pti-concerns-box pti-concerns-clean">
                <Check size={14} />
                <span>No systemic risk factors or drug allergies recorded for this patient.</span>
              </div>
            )}
          </div>

          {/* Main 2-Column Grid: Left (Checklist) & Right (WhatsApp Message Preview) */}
          <div className="pti-main-grid">
            {/* Left Column: Checklist of Instructions */}
            <div className="pti-left-col">
              <div className="pti-section-heading">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={16} />
                  <h3>Instruction Checklist</h3>
                </div>
                <span className="pti-active-count">
                  {instructions.filter((i) => i.enabled).length} of {instructions.length} enabled
                </span>
              </div>

              {/* Filter Tabs */}
              <div className="pti-filter-tabs">
                <button
                  type="button"
                  className={`pti-filter-btn ${activeFilter === 'all' ? 'is-active' : ''}`}
                  onClick={() => setActiveFilter('all')}
                >
                  All ({instructions.length})
                </button>
                {baseData.detectedConcerns.length > 0 && (
                  <button
                    type="button"
                    className={`pti-filter-btn pti-filter-concerns ${activeFilter === 'concerns' ? 'is-active' : ''}`}
                    onClick={() => setActiveFilter('concerns')}
                  >
                    ⚠️ Medical Concerns ({instructions.filter((i) => i.isConcernAlert).length})
                  </button>
                )}
                <button
                  type="button"
                  className={`pti-filter-btn ${activeFilter === 'immediate' ? 'is-active' : ''}`}
                  onClick={() => setActiveFilter('immediate')}
                >
                  Immediate
                </button>
                <button
                  type="button"
                  className={`pti-filter-btn ${activeFilter === 'diet' ? 'is-active' : ''}`}
                  onClick={() => setActiveFilter('diet')}
                >
                  Diet
                </button>
                <button
                  type="button"
                  className={`pti-filter-btn ${activeFilter === 'hygiene' ? 'is-active' : ''}`}
                  onClick={() => setActiveFilter('hygiene')}
                >
                  Hygiene
                </button>
              </div>

              {/* Items List */}
              <div className="pti-items-list" data-testid="instructions-items-list">
                {filteredInstructions.map((item) => (
                  <div
                    key={item.id}
                    className={`pti-item-card ${item.enabled ? 'is-enabled' : 'is-disabled'} ${
                      item.isConcernAlert ? 'is-concern-alert' : ''
                    }`}
                  >
                    <label className="pti-item-checkbox-wrap">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={() => handleToggleInstruction(item.id)}
                        className="pti-item-checkbox"
                        aria-label={item.text}
                      />
                    </label>

                    <div className="pti-item-content">
                      <div className="pti-item-header">
                        <span className="pti-item-cat-tag">
                          {item.isConcernAlert ? '⚠️ ' : ''}
                          {item.categoryLabel}
                        </span>
                        <button
                          type="button"
                          className="pti-item-del-btn"
                          onClick={() => handleDeleteInstruction(item.id)}
                          title="Remove this point"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      <p className="pti-item-text">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Custom Point Input */}
              <form onSubmit={handleAddCustomInstruction} className="pti-add-custom-wrap">
                <input
                  type="text"
                  placeholder="Add custom doctor's instruction for this patient..."
                  value={customNoteText}
                  onChange={(e) => setCustomNoteText(e.target.value)}
                  className="pti-custom-input"
                  aria-label="Add custom instruction"
                />
                <button
                  type="submit"
                  disabled={!customNoteText.trim()}
                  className="cn-btn cn-btn-secondary cn-btn-sm"
                >
                  <Plus size={14} /> Add
                </button>
              </form>
            </div>

            {/* Right Column: WhatsApp Live Message Preview */}
            <div className="pti-right-col">
              <div className="pti-section-heading">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageCircle size={16} style={{ color: '#25D366' }} />
                  <h3>WhatsApp Message Preview</h3>
                </div>
                <span className="pti-preview-phone">
                  {phoneCheck.valid ? phoneCheck.display : 'No valid mobile'}
                </span>
              </div>

              <div className="pti-preview-bubble-container">
                <div className="pti-preview-bubble" data-testid="whatsapp-preview-box">
                  <pre className="pti-whatsapp-text">{currentWhatsAppText}</pre>
                </div>
              </div>

              {customMobileError && (
                <div className="pti-send-error">
                  <AlertTriangle size={14} />
                  <span>{customMobileError}</span>
                </div>
              )}

              {/* Quick Actions Under Preview */}
              <div className="pti-preview-actions">
                <button
                  type="button"
                  className="cn-btn pti-btn-whatsapp"
                  onClick={handleSendWhatsApp}
                  data-testid="send-whatsapp-button"
                >
                  <MessageCircle size={16} />
                  <span>Send via WhatsApp</span>
                  <ExternalLink size={13} />
                </button>

                <button
                  type="button"
                  className="cn-btn cn-btn-secondary"
                  onClick={handleCopy}
                  title="Copy formatted text"
                  data-testid="copy-instructions-button"
                >
                  {copied ? <Check size={15} style={{ color: '#10b981' }} /> : <Copy size={15} />}
                  <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="cn-modal-footer pti-footer">
          <div className="pti-footer-left">
            <button
              type="button"
              className="cn-btn cn-btn-secondary"
              onClick={handlePrintSlip}
            >
              <Printer size={15} /> Print Instructions Slip
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="cn-btn cn-btn-secondary"
              onClick={onClose}
            >
              Close
            </button>

            <button
              type="button"
              className="cn-btn pti-btn-whatsapp"
              onClick={handleSendWhatsApp}
            >
              <MessageCircle size={15} /> Send via WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostTreatmentInstructionsModal;
