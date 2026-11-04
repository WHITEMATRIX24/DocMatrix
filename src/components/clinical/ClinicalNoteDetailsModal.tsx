import React, { useState } from 'react';
import {
  X,
  FileText,
  Printer,
  Edit3,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Send,
  User,
  ShieldAlert,
} from 'lucide-react';
import {
  ClinicalNoteRecord,
  addClinicalNoteAddendum,
} from '../../services/clinicStore';
import '../../pages/clinical/clinicalNotes.css';

interface ClinicalNoteDetailsModalProps {
  note: ClinicalNoteRecord;
  onClose: () => void;
  onEdit?: (note: ClinicalNoteRecord) => void;
  onFinalize?: (note: ClinicalNoteRecord) => void;
  onPrint: (note: ClinicalNoteRecord) => void;
}

export const ClinicalNoteDetailsModal: React.FC<ClinicalNoteDetailsModalProps> = ({
  note,
  onClose,
  onEdit,
  onFinalize,
  onPrint,
}) => {
  const isFinal = note.status === 'FINALIZED';
  const isDraft = !isFinal;

  const [addendumText, setAddendumText] = useState('');
  const [submittingAddendum, setSubmittingAddendum] = useState(false);
  const [addendumError, setAddendumError] = useState<string | null>(null);

  const handleAddendumSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addendumText.trim()) return;

    try {
      setSubmittingAddendum(true);
      setAddendumError(null);
      await addClinicalNoteAddendum(note.id, addendumText.trim());
      setAddendumText('');
    } catch (err: any) {
      console.error('Failed to append addendum:', err);
      const msg =
        err?.message ||
        err?.response?.data?.message ||
        'Failed to add addendum. Clinical doctor privilege required.';
      setAddendumError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSubmittingAddendum(false);
    }
  };

  const patientName = note.patient
    ? `${note.patient.firstName} ${note.patient.lastName}`
    : 'Patient';

  const patientCode = note.patient?.patientCode || note.patientId;
  const doctorName = note.doctor?.fullName || note.finalizedByName || note.doctorName || 'Attending Doctor';
  const consultDateStr = note.consultationDate
    ? new Date(note.consultationDate).toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : note.visitDate;

  return (
    <div className="cn-modal-overlay">
      <div className="cn-modal-dialog cn-modal-dialog-large" role="dialog" aria-modal="true">
        {/* Modal Header */}
        <div className="cn-modal-header">
          <div className="cn-modal-header-info">
            <div className="cn-icon-badge">
              <FileText />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2>{note.noteNumber || 'Clinical Consultation Note'}</h2>
                {isFinal ? (
                  <span className="cn-badge cn-badge-finalized">
                    <CheckCircle2 /> Finalized
                  </span>
                ) : (
                  <span className="cn-badge cn-badge-draft">
                    <Clock /> Draft Note
                  </span>
                )}
              </div>
              <p>
                Patient: <strong>{patientName}</strong> ({patientCode}) · Doctor: <strong>{doctorName}</strong> · Date: {consultDateStr}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="cn-modal-close-btn"
            onClick={onClose}
            aria-label="Close details"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="cn-modal-body">
          {/* Patient Safety Alerts */}
          {note.patient?.medicalSafetyAlerts && note.patient.medicalSafetyAlerts.length > 0 && (
            <div className="cn-safety-banner">
              <ShieldAlert />
              <div>
                <strong>Active Patient Safety Alerts:</strong> {note.patient.medicalSafetyAlerts.join('; ')}
              </div>
            </div>
          )}

          {/* Section 1: Chief Complaint */}
          <section className="cn-form-section">
            <h3 className="cn-form-section-title">
              <FileText /> Chief Complaint
            </h3>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-strong, #0f172a)' }}>
              {note.chiefComplaint || note.complaint || 'No complaint recorded.'}
            </p>
          </section>

          {/* Section 2: Symptoms & History */}
          {(note.symptoms || typeof note.painSeverity === 'number' || note.historyNotes) && (
            <section className="cn-form-section">
              <h3 className="cn-form-section-title">
                <AlertTriangle /> Symptoms & Clinical History
              </h3>
              <div className="cn-form-grid-2">
                {note.symptoms && (
                  <div>
                    <span className="cn-label">Symptoms:</span>
                    <p style={{ margin: '3px 0 0', fontSize: '13px' }}>{note.symptoms}</p>
                  </div>
                )}
                {note.symptomDuration && (
                  <div>
                    <span className="cn-label">Duration:</span>
                    <p style={{ margin: '3px 0 0', fontSize: '13px' }}>{note.symptomDuration}</p>
                  </div>
                )}
              </div>

              {typeof note.painSeverity === 'number' && (
                <div style={{ marginTop: '8px' }}>
                  <span className="cn-label">Pain Severity: </span>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#ffffff',
                      background:
                        note.painSeverity === 0
                          ? '#10b981'
                          : note.painSeverity <= 3
                          ? '#3b82f6'
                          : note.painSeverity <= 6
                          ? '#f59e0b'
                          : '#ef4444',
                    }}
                  >
                    {note.painSeverity} / 10
                  </span>
                </div>
              )}

              {note.historyNotes && (
                <div style={{ marginTop: '8px' }}>
                  <span className="cn-label">Relevant Medical/Dental History:</span>
                  <p style={{ margin: '3px 0 0', fontSize: '13px' }}>{note.historyNotes}</p>
                </div>
              )}
            </section>
          )}

          {/* Section 3: Clinical Examination */}
          {(note.extraoralFindings || note.intraoralFindings || note.toothSpecificFindings || note.periodontalFindings || note.examinationNotes || note.findings) && (
            <section className="cn-form-section">
              <h3 className="cn-form-section-title">
                <FileText /> Clinical Examination
              </h3>
              <div className="cn-form-grid-2">
                {note.extraoralFindings && (
                  <div>
                    <span className="cn-label">Extraoral Findings:</span>
                    <p style={{ margin: '3px 0 0', fontSize: '13px' }}>{note.extraoralFindings}</p>
                  </div>
                )}
                {note.intraoralFindings && (
                  <div>
                    <span className="cn-label">Intraoral Findings:</span>
                    <p style={{ margin: '3px 0 0', fontSize: '13px' }}>{note.intraoralFindings}</p>
                  </div>
                )}
                {note.toothSpecificFindings && (
                  <div>
                    <span className="cn-label">Tooth-Specific Findings:</span>
                    <p style={{ margin: '3px 0 0', fontSize: '13px' }}>{note.toothSpecificFindings}</p>
                  </div>
                )}
                {note.periodontalFindings && (
                  <div>
                    <span className="cn-label">Periodontal Evaluation:</span>
                    <p style={{ margin: '3px 0 0', fontSize: '13px' }}>{note.periodontalFindings}</p>
                  </div>
                )}
              </div>

              {(note.examinationNotes || note.findings) && (
                <div style={{ marginTop: '10px' }}>
                  <span className="cn-label">General Examination Summary:</span>
                  <p style={{ margin: '3px 0 0', fontSize: '13px' }}>
                    {note.examinationNotes || note.findings}
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Section 4: Diagnosis */}
          <section className="cn-form-section">
            <h3 className="cn-form-section-title">
              <CheckCircle2 /> Diagnosis
            </h3>
            <div>
              <span className="cn-label">Primary Diagnosis:</span>
              <p style={{ margin: '2px 0 0', fontSize: '14px', fontWeight: 700, color: 'var(--cn-teal)' }}>
                {note.primaryDiagnosis || 'Routine Dental Examination'}
              </p>
            </div>
            {note.diagnosisNotes && (
              <div style={{ marginTop: '6px' }}>
                <span className="cn-label">Diagnostic Notes:</span>
                <p style={{ margin: '2px 0 0', fontSize: '13px' }}>{note.diagnosisNotes}</p>
              </div>
            )}
          </section>

          {/* Section 5: Treatment Performed */}
          {(note.treatmentPerformed || note.treatmentDescription || note.materialsUsed) && (
            <section className="cn-form-section">
              <h3 className="cn-form-section-title">
                <CheckCircle2 /> Treatment Performed
              </h3>
              <div className="cn-form-grid-2">
                <div>
                  <span className="cn-label">Procedure:</span>
                  <p style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: 600 }}>
                    {note.treatmentPerformed} {note.treatmentToothNumber ? `(Tooth #${note.treatmentToothNumber})` : ''}
                  </p>
                </div>
                {note.treatmentOutcome && (
                  <div>
                    <span className="cn-label">Outcome:</span>
                    <p style={{ margin: '2px 0 0', fontSize: '13px' }}>{note.treatmentOutcome}</p>
                  </div>
                )}
              </div>

              {note.treatmentDescription && (
                <div style={{ marginTop: '8px' }}>
                  <span className="cn-label">Procedure Details:</span>
                  <p style={{ margin: '2px 0 0', fontSize: '13px', lineHeight: 1.5 }}>
                    {note.treatmentDescription}
                  </p>
                </div>
              )}

              {note.materialsUsed && (
                <div style={{ marginTop: '8px' }}>
                  <span className="cn-label">Materials & Instruments Used:</span>
                  <p style={{ margin: '2px 0 0', fontSize: '13px' }}>{note.materialsUsed}</p>
                </div>
              )}
            </section>
          )}

          {/* Section 6: Recommendations & Plan */}
          {(note.treatmentRecommendations || note.plan || note.referralNotes) && (
            <section className="cn-form-section">
              <h3 className="cn-form-section-title">
                <FileText /> Treatment Recommendations & Plan
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '13px', lineHeight: 1.5 }}>
                {note.treatmentRecommendations || note.plan}
              </p>
              {note.referralNotes && (
                <div style={{ marginTop: '8px' }}>
                  <span className="cn-label">Referrals / Consultations:</span>
                  <p style={{ margin: '2px 0 0', fontSize: '13px' }}>{note.referralNotes}</p>
                </div>
              )}
            </section>
          )}

          {/* Section 7: Follow-up & Instructions */}
          {(note.followUpRequired || note.followUpInstructions || note.patientAdvice) && (
            <section className="cn-form-section">
              <h3 className="cn-form-section-title">
                <Clock /> Follow-up & Patient Instructions
              </h3>
              {note.followUpRequired && (
                <div style={{ fontSize: '13px', marginBottom: '6px' }}>
                  <strong>Follow-up Scheduled:</strong>{' '}
                  {note.followUpDate
                    ? new Date(note.followUpDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Target date to be confirmed'}
                </div>
              )}
              {note.followUpInstructions && (
                <div>
                  <span className="cn-label">Instructions:</span>
                  <p style={{ margin: '2px 0 0', fontSize: '13px' }}>{note.followUpInstructions}</p>
                </div>
              )}
              {note.patientAdvice && (
                <div style={{ marginTop: '6px' }}>
                  <span className="cn-label">Patient Advice / Home Care:</span>
                  <p style={{ margin: '2px 0 0', fontSize: '13px' }}>{note.patientAdvice}</p>
                </div>
              )}
            </section>
          )}

          {/* Section 8: Finalization Audit Details */}
          {isFinal && (
            <section className="cn-form-section" style={{ background: 'rgba(5, 150, 105, 0.05)', borderColor: 'rgba(5, 150, 105, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--cn-finalized)', fontSize: '12px', fontWeight: 600 }}>
                <CheckCircle2 size={16} />
                <span>
                  Finalized & Signed by <strong>{note.finalizedByName || doctorName}</strong> on{' '}
                  {note.finalizedAt ? new Date(note.finalizedAt).toLocaleString() : consultDateStr}
                </span>
              </div>
            </section>
          )}

          {/* Section 9: Auditable Addenda */}
          {isFinal && (
            <section className="cn-form-section">
              <h3 className="cn-form-section-title">
                <FileText /> Clinical Addenda History ({note.addenda?.length || 0})
              </h3>
              <div className="cn-addenda-container">
                {note.addenda && note.addenda.length > 0 ? (
                  note.addenda.map((addendum, idx) => (
                    <div key={addendum.id || idx} className="cn-addendum-item">
                      <div className="cn-addendum-head">
                        <span>
                          <strong>{addendum.doctorName || 'Doctor'}</strong> · Addendum #{idx + 1}
                        </span>
                        <span>{new Date(addendum.createdAt).toLocaleString()}</span>
                      </div>
                      <p style={{ margin: 0, color: 'var(--text-strong, #0f172a)' }}>{addendum.content}</p>
                    </div>
                  ))
                ) : (
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                    No addenda recorded for this note yet.
                  </p>
                )}
              </div>

              {/* Add Addendum Form */}
              <form onSubmit={handleAddendumSubmit} style={{ marginTop: '14px' }}>
                <div className="cn-form-group">
                  <label className="cn-label">Append New Addendum</label>
                  <textarea
                    rows={2}
                    placeholder="Enter supplementary clinical findings or post-consultation observations..."
                    value={addendumText}
                    onChange={(e) => setAddendumText(e.target.value)}
                    className="cn-textarea"
                    required
                  />
                </div>
                {addendumError && (
                  <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '4px' }}>
                    {addendumError}
                  </div>
                )}
                <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit"
                    className="cn-btn cn-btn-primary cn-btn-sm"
                    disabled={submittingAddendum || !addendumText.trim()}
                  >
                    <Send size={14} />
                    {submittingAddendum ? 'Adding...' : 'Add Addendum'}
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>

        {/* Modal Footer */}
        <div className="cn-modal-footer">
          <button
            type="button"
            className="cn-btn cn-btn-secondary"
            onClick={onClose}
          >
            Close
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="cn-btn cn-btn-secondary"
              onClick={() => onPrint(note)}
            >
              <Printer />
              Print Note
            </button>

            {isDraft && onEdit && (
              <button
                type="button"
                className="cn-btn cn-btn-secondary"
                onClick={() => onEdit(note)}
              >
                <Edit3 />
                Edit Draft
              </button>
            )}

            {isDraft && onFinalize && (
              <button
                type="button"
                className="cn-btn cn-btn-success"
                onClick={() => onFinalize(note)}
              >
                <CheckCircle2 />
                Finalize Note
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

