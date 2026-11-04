import React from 'react';
import { X, Printer } from 'lucide-react';
import { ClinicalNoteRecord } from '../../services/clinicStore';
import '../../pages/clinical/clinicalNotes.css';

interface ClinicalNotePrintModalProps {
  note: ClinicalNoteRecord;
  onClose: () => void;
}

export const ClinicalNotePrintModal: React.FC<ClinicalNotePrintModalProps> = ({
  note,
  onClose,
}) => {
  const patient = note.patient;
  const patientName = patient
    ? `${patient.firstName} ${patient.lastName}`
    : 'Patient';
  const patientCode = patient?.patientCode || note.patientId;
  const doctorName =
    note.doctor?.fullName || note.finalizedByName || note.doctorName || 'Attending Dentist';
  const isFinal = note.status === 'FINALIZED';

  const consultDateStr = note.consultationDate
    ? new Date(note.consultationDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : note.visitDate;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="cn-modal-overlay">
      <div
        className="cn-modal-dialog cn-modal-dialog-large cn-print-modal-dialog"
        role="dialog"
        aria-modal="true"
        style={{ maxWidth: '820px' }}
      >
        {/* Modal Controls (Hidden in Print) */}
        <div className="cn-modal-header cn-no-print">
          <div className="cn-modal-header-info">
            <Printer style={{ color: 'var(--cn-teal)' }} />
            <div>
              <h2>Print Clinical Consultation Note</h2>
              <p>Official clinic letterhead layout for patient records and archives</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="cn-btn cn-btn-primary cn-btn-sm"
              onClick={handlePrint}
            >
              <Printer size={14} /> Print Now
            </button>
            <button
              type="button"
              className="cn-modal-close-btn"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Sheet */}
        <div className="cn-print-sheet" id="cn-printable-area">
          {/* Clinic Letterhead */}
          <div className="cn-print-letterhead">
            <div>
              <h1 className="cn-print-clinic-name">DOCMATRIX DENTAL CLINIC</h1>
              <p className="cn-print-clinic-sub">
                Advanced Oral Healthcare & Dental Specialties
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>
                124 Healthcare Boulevard, Suite 400 · Ph: +91 98765 43210 · info@docmatrix.clinic
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  border: isFinal ? '1px solid #059669' : '1px solid #d97706',
                  color: isFinal ? '#059669' : '#d97706',
                  background: isFinal ? 'rgba(5, 150, 105, 0.08)' : 'rgba(217, 119, 6, 0.08)',
                }}
              >
                {isFinal ? 'Official Finalized Record' : 'Draft Note'}
              </span>
              <p style={{ margin: '6px 0 0', fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                Note #{note.noteNumber || note.id}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>
                Date: {consultDateStr}
              </p>
            </div>
          </div>

          {/* Patient & Doctor Meta Grid */}
          <div className="cn-print-meta-grid">
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
                PATIENT INFORMATION
              </p>
              <p style={{ margin: '3px 0 0' }}>
                <strong>Name:</strong> {patientName} ({patientCode})
              </p>
              <p style={{ margin: '2px 0 0' }}>
                <strong>Gender:</strong> {patient?.gender?.toUpperCase() || 'N/A'} ·{' '}
                <strong>Contact:</strong> {patient?.mobile || 'N/A'}
              </p>
              {patient?.medicalSafetyAlerts && patient.medicalSafetyAlerts.length > 0 && (
                <p style={{ margin: '2px 0 0', color: '#b91c1c', fontWeight: 600 }}>
                  <strong>Safety Alerts / Allergies:</strong> {patient.medicalSafetyAlerts.join('; ')}
                </p>
              )}
            </div>

            <div>
              <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>
                CLINICIAN INFORMATION
              </p>
              <p style={{ margin: '3px 0 0' }}>
                <strong>Attending Dentist:</strong> {doctorName}
              </p>
              <p style={{ margin: '2px 0 0' }}>
                <strong>Department:</strong> General & Restorative Dentistry
              </p>
              <p style={{ margin: '2px 0 0' }}>
                <strong>Consultation Type:</strong> {note.consultationType || 'Routine Consultation'}
              </p>
            </div>
          </div>

          {/* Section 1: Chief Complaint */}
          <div className="cn-print-section">
            <h3 className="cn-print-section-title">1. Chief Complaint</h3>
            <p style={{ margin: 0, fontSize: '13px' }}>
              {note.chiefComplaint || note.complaint || 'No complaint recorded.'}
            </p>
          </div>

          {/* Section 2: Symptoms & Pain */}
          {(note.symptoms || typeof note.painSeverity === 'number' || note.historyNotes) && (
            <div className="cn-print-section">
              <h3 className="cn-print-section-title">2. Symptoms & Clinical History</h3>
              {note.symptoms && (
                <p style={{ margin: '0 0 4px', fontSize: '13px' }}>
                  <strong>Reported Symptoms:</strong> {note.symptoms} {note.symptomDuration ? `(${note.symptomDuration})` : ''}
                </p>
              )}
              {typeof note.painSeverity === 'number' && (
                <p style={{ margin: '0 0 4px', fontSize: '13px' }}>
                  <strong>Pain Severity:</strong> {note.painSeverity} / 10
                </p>
              )}
              {note.historyNotes && (
                <p style={{ margin: 0, fontSize: '13px' }}>
                  <strong>History:</strong> {note.historyNotes}
                </p>
              )}
            </div>
          )}

          {/* Section 3: Clinical Examination */}
          <div className="cn-print-section">
            <h3 className="cn-print-section-title">3. Clinical Examination Findings</h3>
            {note.extraoralFindings && (
              <p style={{ margin: '0 0 4px', fontSize: '13px' }}>
                <strong>Extraoral:</strong> {note.extraoralFindings}
              </p>
            )}
            {note.intraoralFindings && (
              <p style={{ margin: '0 0 4px', fontSize: '13px' }}>
                <strong>Intraoral:</strong> {note.intraoralFindings}
              </p>
            )}
            {note.toothSpecificFindings && (
              <p style={{ margin: '0 0 4px', fontSize: '13px' }}>
                <strong>Tooth-Specific:</strong> {note.toothSpecificFindings}
              </p>
            )}
            {note.periodontalFindings && (
              <p style={{ margin: '0 0 4px', fontSize: '13px' }}>
                <strong>Periodontal:</strong> {note.periodontalFindings}
              </p>
            )}
            {(note.examinationNotes || note.findings) && (
              <p style={{ margin: 0, fontSize: '13px' }}>
                <strong>Summary Findings:</strong> {note.examinationNotes || note.findings}
              </p>
            )}
          </div>

          {/* Section 4: Diagnosis */}
          <div className="cn-print-section">
            <h3 className="cn-print-section-title">4. Diagnosis</h3>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#008891' }}>
              {note.primaryDiagnosis || 'Dental Consultation'}
            </p>
            {note.diagnosisNotes && (
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                {note.diagnosisNotes}
              </p>
            )}
          </div>

          {/* Section 5: Treatment Performed */}
          {(note.treatmentPerformed || note.treatmentDescription || note.materialsUsed) && (
            <div className="cn-print-section">
              <h3 className="cn-print-section-title">5. Treatment Performed</h3>
              <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 700 }}>
                {note.treatmentPerformed} {note.treatmentToothNumber ? `· Tooth #${note.treatmentToothNumber}` : ''}
              </p>
              {note.treatmentDescription && (
                <p style={{ margin: '0 0 4px', fontSize: '12px', lineHeight: 1.5 }}>
                  {note.treatmentDescription}
                </p>
              )}
              {note.materialsUsed && (
                <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                  <strong>Materials Used:</strong> {note.materialsUsed}
                </p>
              )}
            </div>
          )}

          {/* Section 6: Treatment Recommendations */}
          {(note.treatmentRecommendations || note.plan) && (
            <div className="cn-print-section">
              <h3 className="cn-print-section-title">6. Treatment Recommendations & Plan</h3>
              <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5 }}>
                {note.treatmentRecommendations || note.plan}
              </p>
            </div>
          )}

          {/* Section 7: Follow-up & Advice */}
          {(note.followUpRequired || note.followUpInstructions || note.patientAdvice) && (
            <div className="cn-print-section">
              <h3 className="cn-print-section-title">7. Follow-up & Patient Care Instructions</h3>
              {note.followUpRequired && (
                <p style={{ margin: '0 0 4px', fontSize: '13px' }}>
                  <strong>Follow-up Scheduled:</strong>{' '}
                  {note.followUpDate
                    ? new Date(note.followUpDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Target date to be determined'}
                </p>
              )}
              {note.followUpInstructions && (
                <p style={{ margin: '0 0 4px', fontSize: '13px' }}>
                  <strong>Instructions:</strong> {note.followUpInstructions}
                </p>
              )}
              {note.patientAdvice && (
                <p style={{ margin: 0, fontSize: '13px' }}>
                  <strong>Home Care Advice:</strong> {note.patientAdvice}
                </p>
              )}
            </div>
          )}

          {/* Section 8: Addenda */}
          {note.addenda && note.addenda.length > 0 && (
            <div className="cn-print-section">
              <h3 className="cn-print-section-title">8. Post-Finalization Addenda</h3>
              {note.addenda.map((ad, idx) => (
                <div key={ad.id || idx} style={{ marginBottom: '6px', fontSize: '12px' }}>
                  <strong>Addendum #{idx + 1} ({new Date(ad.createdAt).toLocaleString()} by {ad.doctorName || 'Doctor'}):</strong>{' '}
                  {ad.content}
                </div>
              ))}
            </div>
          )}

          {/* Signature Block */}
          <div className="cn-print-signature-area">
            <div className="cn-print-signature-block">
              <p style={{ margin: 0, fontWeight: 700 }}>{doctorName}</p>
              <p style={{ margin: '2px 0 0', color: '#64748b' }}>Licensed Dental Practitioner</p>
              <p style={{ margin: '2px 0 0', color: '#94a3b8', fontSize: '10px' }}>
                DocMatrix Clinical Sign-off
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer (Hidden in Print) */}
        <div className="cn-modal-footer cn-no-print">
          <button
            type="button"
            className="cn-btn cn-btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            className="cn-btn cn-btn-primary"
            onClick={handlePrint}
          >
            <Printer />
            Print Note
          </button>
        </div>
      </div>
    </div>
  );
};

