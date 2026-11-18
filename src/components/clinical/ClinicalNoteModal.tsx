import React, { useState, useMemo } from 'react';
import {
  X,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Save,
  Clock,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  Activity,
  Calendar,
} from 'lucide-react';
import {
  useClinicData,
  ClinicalNoteRecord,
  addClinicalNote,
  updateClinicalNote,
  finalizeClinicalNote,
  updateAppointmentStatus,
  type InvoiceRecord,
} from '../../services/clinicStore';
import { autoGenerateInvoiceForConsultation } from '../../services/billingAutoInvoice';
import '../../pages/clinical/clinicalNotes.css';

interface ClinicalNoteModalProps {
  initialNote?: ClinicalNoteRecord | null;
  defaultPatientId?: string;
  defaultAppointmentId?: string;
  onClose: () => void;
  onSaved: (note: ClinicalNoteRecord, invoice?: InvoiceRecord | null) => void;
}

const CONSULTATION_TYPES = [
  { value: 'ROUTINE_CHECKUP', label: 'Routine Checkup / Consultation' },
  { value: 'INITIAL_VISIT', label: 'Initial Comprehensive Examination' },
  { value: 'FOLLOW_UP', label: 'Follow-up / Review' },
  { value: 'EMERGENCY', label: 'Emergency / Acute Pain Relief' },
  { value: 'OTHER', label: 'Other Procedure Consultation' },
];

export const ClinicalNoteModal: React.FC<ClinicalNoteModalProps> = ({
  initialNote,
  defaultPatientId,
  defaultAppointmentId,
  onClose,
  onSaved,
}) => {
  const { patients = [] } = useClinicData();

  // Selected patient
  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    initialNote?.patientId ||
      initialNote?.patient?.id ||
      defaultPatientId ||
      (patients[0]?.backendId || patients[0]?.id || '')
  );

  const activePatient = useMemo(() => {
    return patients.find(
      (p) =>
        p.id.toLowerCase() === selectedPatientId.toLowerCase() ||
        (p.backendId && p.backendId.toLowerCase() === selectedPatientId.toLowerCase())
    );
  }, [patients, selectedPatientId]);

  // Section 1: Consultation Info
  const [consultationDate, setConsultationDate] = useState<string>(
    initialNote?.consultationDate
      ? initialNote.consultationDate.slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );
  const [consultationType, setConsultationType] = useState<string>(
    initialNote?.consultationType || 'ROUTINE_CHECKUP'
  );

  // Section 2: Chief Complaint
  const [chiefComplaint, setChiefComplaint] = useState<string>(
    initialNote?.chiefComplaint || initialNote?.complaint || ''
  );

  // Section 3: Symptoms & History
  const [symptoms, setSymptoms] = useState<string>(initialNote?.symptoms || '');
  const [symptomDuration, setSymptomDuration] = useState<string>(
    initialNote?.symptomDuration || ''
  );
  const [painSeverity, setPainSeverity] = useState<number>(
    typeof initialNote?.painSeverity === 'number' ? initialNote.painSeverity : 0
  );
  const [historyNotes, setHistoryNotes] = useState<string>(
    initialNote?.historyNotes || ''
  );

  // Section 4: Clinical Examination
  const [extraoralFindings, setExtraoralFindings] = useState<string>(
    initialNote?.extraoralFindings || ''
  );
  const [intraoralFindings, setIntraoralFindings] = useState<string>(
    initialNote?.intraoralFindings || ''
  );
  const [toothSpecificFindings, setToothSpecificFindings] = useState<string>(
    initialNote?.toothSpecificFindings || ''
  );
  const [periodontalFindings, setPeriodontalFindings] = useState<string>(
    initialNote?.periodontalFindings || ''
  );
  const [examinationNotes, setExaminationNotes] = useState<string>(
    initialNote?.examinationNotes || initialNote?.findings || ''
  );

  // Section 5: Diagnosis
  const [primaryDiagnosis, setPrimaryDiagnosis] = useState<string>(
    initialNote?.primaryDiagnosis || ''
  );
  const [diagnosisNotes, setDiagnosisNotes] = useState<string>(
    initialNote?.diagnosisNotes || ''
  );

  // Section 6: Treatment Performed
  const [treatmentPerformed, setTreatmentPerformed] = useState<string>(
    initialNote?.treatmentPerformed || ''
  );
  const [treatmentToothNumber, setTreatmentToothNumber] = useState<string>(
    initialNote?.treatmentToothNumber || ''
  );
  const [treatmentDescription, setTreatmentDescription] = useState<string>(
    initialNote?.treatmentDescription || ''
  );
  const [materialsUsed, setMaterialsUsed] = useState<string>(
    initialNote?.materialsUsed || ''
  );
  const [treatmentOutcome, setTreatmentOutcome] = useState<string>(
    initialNote?.treatmentOutcome || ''
  );

  // Section 7: Treatment Recommendations
  const [treatmentRecommendations, setTreatmentRecommendations] = useState<string>(
    initialNote?.treatmentRecommendations || initialNote?.plan || ''
  );
  const [referralNotes, setReferralNotes] = useState<string>(
    initialNote?.referralNotes || ''
  );

  // Section 8: Follow-up & Advice
  const [followUpRequired, setFollowUpRequired] = useState<boolean>(
    Boolean(initialNote?.followUpRequired)
  );
  const [followUpDate, setFollowUpDate] = useState<string>(
    initialNote?.followUpDate ? initialNote.followUpDate.slice(0, 10) : ''
  );
  const [followUpInstructions, setFollowUpInstructions] = useState<string>(
    initialNote?.followUpInstructions || ''
  );
  const [patientAdvice, setPatientAdvice] = useState<string>(
    initialNote?.patientAdvice || ''
  );

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmFinalizeOpen, setConfirmFinalizeOpen] = useState(false);

  // Collapsible section states
  const hasHistoryData = Boolean(symptoms || symptomDuration || historyNotes);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(
    Boolean(
      initialNote?.symptoms ||
      initialNote?.symptomDuration ||
      initialNote?.historyNotes
    )
  );

  const hasAdditionalExamData = Boolean(
    extraoralFindings || periodontalFindings || examinationNotes
  );
  const [isAdditionalExamOpen, setIsAdditionalExamOpen] = useState<boolean>(
    Boolean(
      initialNote?.extraoralFindings ||
      initialNote?.periodontalFindings ||
      initialNote?.examinationNotes ||
      initialNote?.findings
    )
  );

  const hasMaterialsData = Boolean(materialsUsed || treatmentOutcome);
  const [isMaterialsOpen, setIsMaterialsOpen] = useState<boolean>(
    Boolean(initialNote?.materialsUsed || initialNote?.treatmentOutcome)
  );

  // Safety alerts
  const safetyAlerts = useMemo(() => {
    if (!activePatient) return [];
    const alerts: string[] = [];
    if (activePatient.allergies === 'yes' && activePatient.allergiesDetails) {
      alerts.push(`Allergies: ${activePatient.allergiesDetails}`);
    }
    if (activePatient.conditions === 'yes' && activePatient.conditionsDetails) {
      alerts.push(`Medical Conditions: ${activePatient.conditionsDetails}`);
    }
    if (activePatient.medications === 'yes' && activePatient.medicationsDetails) {
      alerts.push(`Current Medications: ${activePatient.medicationsDetails}`);
    }
    if (Array.isArray((activePatient as any).medicalSafetyAlerts)) {
      alerts.push(...(activePatient as any).medicalSafetyAlerts);
    }
    return Array.from(new Set(alerts));
  }, [activePatient]);

  const handleSubmit = async (shouldFinalize: boolean) => {
    if (!chiefComplaint.trim()) {
      setError('Chief Complaint is required.');
      return;
    }
    if (!primaryDiagnosis.trim()) {
      setError('Primary Diagnosis is required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        patientId: activePatient?.backendId || selectedPatientId,
        appointmentId: initialNote?.appointmentId || defaultAppointmentId || undefined,
        consultationDate: new Date(consultationDate).toISOString(),
        consultationType,
        chiefComplaint: chiefComplaint.trim(),
        symptoms: symptoms.trim() || undefined,
        symptomDuration: symptomDuration.trim() || undefined,
        painSeverity,
        historyNotes: historyNotes.trim() || undefined,
        extraoralFindings: extraoralFindings.trim() || undefined,
        intraoralFindings: intraoralFindings.trim() || undefined,
        toothSpecificFindings: toothSpecificFindings.trim() || undefined,
        periodontalFindings: periodontalFindings.trim() || undefined,
        examinationNotes: examinationNotes.trim() || undefined,
        primaryDiagnosis: primaryDiagnosis.trim(),
        diagnosisNotes: diagnosisNotes.trim() || undefined,
        treatmentPerformed: treatmentPerformed.trim() || undefined,
        treatmentToothNumber: treatmentToothNumber.trim() || undefined,
        treatmentDescription: treatmentDescription.trim() || undefined,
        materialsUsed: materialsUsed.trim() || undefined,
        treatmentOutcome: treatmentOutcome.trim() || undefined,
        treatmentRecommendations: treatmentRecommendations.trim() || undefined,
        referralNotes: referralNotes.trim() || undefined,
        followUpRequired,
        followUpDate: followUpRequired && followUpDate ? new Date(followUpDate).toISOString() : undefined,
        followUpInstructions: followUpInstructions.trim() || undefined,
        patientAdvice: patientAdvice.trim() || undefined,
        isFinalized: shouldFinalize,
      };

      let saved: ClinicalNoteRecord;

      if (initialNote?.id) {
        // Update existing note
        saved = await updateClinicalNote(initialNote.id, payload);
        if (shouldFinalize) {
          saved = await finalizeClinicalNote(initialNote.id);
        }
      } else {
        // Create new clinical note
        saved = await addClinicalNote(payload);
        if (shouldFinalize) {
          saved = await finalizeClinicalNote(saved.id);
        }
      }

      let generatedInvoice: InvoiceRecord | null = null;
      if (shouldFinalize) {
        const targetApptId = saved.appointmentId || defaultAppointmentId;
        if (targetApptId) {
          updateAppointmentStatus(targetApptId, 'completed');
        }
        const invRes = autoGenerateInvoiceForConsultation({
          clinicalNote: saved,
          appointmentId: targetApptId,
          patientId: saved.patientId,
        });
        generatedInvoice = invRes.invoice;
      }

      onSaved(saved, generatedInvoice);
      onClose();
    } catch (err: any) {
      console.error('Failed to save clinical note:', err);
      const msg =
        err?.message ||
        err?.response?.data?.message ||
        'Failed to save clinical note. Ensure doctor privileges.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
      setConfirmFinalizeOpen(false);
    }
  };

  return (
    <div className="cn-modal-overlay">
      <div className="cn-modal-dialog cn-modal-dialog-large" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="cn-modal-header">
          <div className="cn-modal-header-info">
            <div className="cn-icon-badge">
              <FileText />
            </div>
            <div>
              <h2>{initialNote ? 'Edit Consultation Note' : 'New Dental Clinical Note'}</h2>
              <p>Structured documentation for clinical consultation, examination, and procedures</p>
            </div>
          </div>
          <button
            type="button"
            className="cn-modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="cn-modal-body">
          {error && (
            <div className="cn-safety-banner" style={{ background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' }}>
              <AlertTriangle />
              <span>{error}</span>
            </div>
          )}

          {/* Safety Alerts Banner */}
          {safetyAlerts.length > 0 && (
            <div className="cn-safety-banner">
              <ShieldAlert />
              <div>
                <strong>Medical Safety & Allergy Alerts for Patient:</strong>
                <ul style={{ margin: '4px 0 0', paddingLeft: '18px' }}>
                  {safetyAlerts.map((alert, idx) => (
                    <li key={idx}>{alert}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Section 1: Consultation & Patient Complaint */}
          <section className="cn-form-section">
            <div className="cn-form-section-header">
              <h3 className="cn-form-section-title">
                <Clock /> 1. Consultation & Patient Complaint
              </h3>
            </div>

            <div className="cn-form-grid-3">
              <div className="cn-form-group">
                <label className="cn-label cn-label-required">Patient</label>
                <select
                  disabled={Boolean(defaultPatientId) || Boolean(initialNote)}
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="cn-select"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.backendId || p.id}>
                      {p.firstName} {p.lastName} ({p.id}) · {p.mobile}
                    </option>
                  ))}
                </select>
              </div>

              <div className="cn-form-group">
                <label className="cn-label cn-label-required">Consultation Date</label>
                <input
                  type="date"
                  value={consultationDate}
                  onChange={(e) => setConsultationDate(e.target.value)}
                  className="cn-input"
                />
              </div>

              <div className="cn-form-group">
                <label className="cn-label">Consultation Type</label>
                <select
                  value={consultationType}
                  onChange={(e) => setConsultationType(e.target.value)}
                  className="cn-select"
                >
                  {CONSULTATION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="cn-form-group">
              <label className="cn-label cn-label-required">
                Patient's Primary Concern / Reason for Visit
              </label>
              <input
                type="text"
                placeholder="e.g. Severe throbbing pain in lower right posterior quadrant radiating to ear for 2 days"
                value={chiefComplaint}
                onChange={(e) => setChiefComplaint(e.target.value)}
                className="cn-input"
                required
              />
            </div>

            {/* Pain Severity Scale (0 to 10) */}
            <div className="cn-pain-scale">
              <div className="cn-pain-header">
                <label className="cn-label">
                  Pain Severity Rating (0 = No Pain, 10 = Severe)
                </label>
                <span className={`cn-pain-indicator cn-pain-indicator-${painSeverity === 0 ? 'none' : painSeverity <= 3 ? 'mild' : painSeverity <= 6 ? 'mod' : 'sev'}`}>
                  Selected: {painSeverity}/10 · {painSeverity === 0 ? 'No Pain' : painSeverity <= 3 ? 'Mild' : painSeverity <= 6 ? 'Moderate' : 'Severe'}
                </span>
              </div>
              <div className="cn-pain-buttons">
                {Array.from({ length: 11 }, (_, i) => {
                  let selClass = '';
                  if (painSeverity === i) {
                    if (i === 0) selClass = 'cn-pain-btn-selected-0';
                    else if (i <= 3) selClass = 'cn-pain-btn-selected-mild';
                    else if (i <= 6) selClass = 'cn-pain-btn-selected-mod';
                    else selClass = 'cn-pain-btn-selected-sev';
                  }
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setPainSeverity(i)}
                      className={`cn-pain-btn ${selClass}`}
                      title={`Pain level ${i}`}
                    >
                      {i}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Collapsible: Additional Symptoms & History */}
            <div className={`cn-collapsible-box ${isHistoryOpen ? 'cn-collapsible-box-open' : ''}`}>
              <button
                type="button"
                className="cn-collapsible-trigger"
                onClick={() => setIsHistoryOpen((prev) => !prev)}
                aria-expanded={isHistoryOpen}
              >
                <span className="cn-collapsible-trigger-title">
                  <AlertTriangle size={15} style={{ color: '#f59e0b' }} />
                  <span>Additional Symptoms & Medical/Dental History</span>
                  <span
                    className={`cn-collapsible-badge ${
                      hasHistoryData
                        ? 'cn-collapsible-badge-active'
                        : 'cn-collapsible-badge-empty'
                    }`}
                  >
                    {hasHistoryData ? 'Has details' : 'Optional'}
                  </span>
                </span>
                {isHistoryOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {isHistoryOpen && (
                <div className="cn-collapsible-body">
                  <div className="cn-form-grid-2">
                    <div className="cn-form-group">
                      <label className="cn-label">Symptoms</label>
                      <input
                        type="text"
                        placeholder="e.g. Continuous throbbing ache, exacerbated by cold and lying down"
                        value={symptoms}
                        onChange={(e) => setSymptoms(e.target.value)}
                        className="cn-input"
                      />
                    </div>

                    <div className="cn-form-group">
                      <label className="cn-label">Duration of Symptoms</label>
                      <input
                        type="text"
                        placeholder="e.g. 3 days, 2 weeks, intermittent since last month"
                        value={symptomDuration}
                        onChange={(e) => setSymptomDuration(e.target.value)}
                        className="cn-input"
                      />
                    </div>
                  </div>

                  <div className="cn-form-group">
                    <label className="cn-label">Medical & Dental History Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Previous root canal therapy on #45 2 years ago; hypertensive controlled on Amlodipine"
                      value={historyNotes}
                      onChange={(e) => setHistoryNotes(e.target.value)}
                      className="cn-input"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Section 2: Clinical Examination & Diagnosis */}
          <section className="cn-form-section">
            <div className="cn-form-section-header">
              <h3 className="cn-form-section-title">
                <CheckCircle2 /> 2. Clinical Examination & Diagnosis
              </h3>
            </div>

            <div className="cn-form-grid-2">
              <div className="cn-form-group">
                <label className="cn-label cn-label-required">Primary Diagnosis</label>
                <input
                  type="text"
                  placeholder="e.g. Symptomatic Irreversible Pulpitis with Acute Apical Periodontitis (Tooth #46)"
                  value={primaryDiagnosis}
                  onChange={(e) => setPrimaryDiagnosis(e.target.value)}
                  className="cn-input"
                  required
                />
              </div>

              <div className="cn-form-group">
                <label className="cn-label">Diagnostic Notes / Differentials</label>
                <input
                  type="text"
                  placeholder="e.g. Confirmed via IOPA radiograph showing periapical PDL widening"
                  value={diagnosisNotes}
                  onChange={(e) => setDiagnosisNotes(e.target.value)}
                  className="cn-input"
                />
              </div>
            </div>

            <div className="cn-form-grid-2">
              <div className="cn-form-group">
                <label className="cn-label">Tooth-Specific Findings</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Tooth #46: Deep disto-occlusal cavitated lesion into dentin, vertical percussion tender (+), cold lingering 15s"
                  value={toothSpecificFindings}
                  onChange={(e) => setToothSpecificFindings(e.target.value)}
                  className="cn-textarea"
                />
              </div>

              <div className="cn-form-group">
                <label className="cn-label">Intraoral Examination</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Generalized marginal gingival inflammation, calculus Grade 1 on lingual of lower anteriors"
                  value={intraoralFindings}
                  onChange={(e) => setIntraoralFindings(e.target.value)}
                  className="cn-textarea"
                />
              </div>
            </div>

            {/* Collapsible: Additional Examination Findings */}
            <div className={`cn-collapsible-box ${isAdditionalExamOpen ? 'cn-collapsible-box-open' : ''}`}>
              <button
                type="button"
                className="cn-collapsible-trigger"
                onClick={() => setIsAdditionalExamOpen((prev) => !prev)}
                aria-expanded={isAdditionalExamOpen}
              >
                <span className="cn-collapsible-trigger-title">
                  <Stethoscope size={15} style={{ color: 'var(--cn-teal)' }} />
                  <span>Additional Examination (Extraoral, Periodontal, Summary)</span>
                  <span
                    className={`cn-collapsible-badge ${
                      hasAdditionalExamData
                        ? 'cn-collapsible-badge-active'
                        : 'cn-collapsible-badge-empty'
                    }`}
                  >
                    {hasAdditionalExamData ? 'Contains findings' : 'Optional'}
                  </span>
                </span>
                {isAdditionalExamOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {isAdditionalExamOpen && (
                <div className="cn-collapsible-body">
                  <div className="cn-form-grid-2">
                    <div className="cn-form-group">
                      <label className="cn-label">Extraoral Examination</label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Normal facial symmetry, TMJ smooth without clicking, submandibular lymph nodes non-tender"
                        value={extraoralFindings}
                        onChange={(e) => setExtraoralFindings(e.target.value)}
                        className="cn-textarea"
                      />
                    </div>

                    <div className="cn-form-group">
                      <label className="cn-label">Periodontal Evaluation</label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Probing depths 2-3mm physiological, bleeding on probing localized to quadrant 4, no mobility"
                        value={periodontalFindings}
                        onChange={(e) => setPeriodontalFindings(e.target.value)}
                        className="cn-textarea"
                      />
                    </div>
                  </div>

                  <div className="cn-form-group">
                    <label className="cn-label">General Examination Summary</label>
                    <textarea
                      rows={2}
                      placeholder="Comprehensive synthesis of examination and diagnostic findings"
                      value={examinationNotes}
                      onChange={(e) => setExaminationNotes(e.target.value)}
                      className="cn-textarea"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Section 3: Treatment Performed */}
          <section className="cn-form-section">
            <div className="cn-form-section-header">
              <h3 className="cn-form-section-title">
                <Save /> 3. Treatment & Procedures Performed
              </h3>
            </div>

            <div className="cn-form-grid-2">
              <div className="cn-form-group">
                <label className="cn-label">Procedure Name</label>
                <input
                  type="text"
                  placeholder="e.g. Emergency Pulpectomy & Access Opening"
                  value={treatmentPerformed}
                  onChange={(e) => setTreatmentPerformed(e.target.value)}
                  className="cn-input"
                />
              </div>

              <div className="cn-form-group">
                <label className="cn-label">Tooth Number / Quadrant</label>
                <input
                  type="text"
                  placeholder="e.g. Tooth 46, Q4"
                  value={treatmentToothNumber}
                  onChange={(e) => setTreatmentToothNumber(e.target.value)}
                  className="cn-input"
                />
              </div>
            </div>

            <div className="cn-form-group">
              <label className="cn-label">Detailed Step-by-Step Procedure Description</label>
              <textarea
                rows={2}
                placeholder="e.g. 2% Lignocaine with 1:80000 adrenaline administered via IANB. Rubber dam isolation placed. Caries excavated, access prepared. Coronal pulp extirpated. Canal working lengths confirmed via apex locator (MB 21mm, ML 21mm, Distal 20.5mm). Copious 3% NaOCl irrigation. Calcipex placed. Cavit temporary seal placed."
                value={treatmentDescription}
                onChange={(e) => setTreatmentDescription(e.target.value)}
                className="cn-textarea"
              />
            </div>

            {/* Collapsible: Materials & Outcome */}
            <div className={`cn-collapsible-box ${isMaterialsOpen ? 'cn-collapsible-box-open' : ''}`}>
              <button
                type="button"
                className="cn-collapsible-trigger"
                onClick={() => setIsMaterialsOpen((prev) => !prev)}
                aria-expanded={isMaterialsOpen}
              >
                <span className="cn-collapsible-trigger-title">
                  <Activity size={15} style={{ color: 'var(--cn-teal)' }} />
                  <span>Materials & Immediate Outcome Details</span>
                  <span
                    className={`cn-collapsible-badge ${
                      hasMaterialsData
                        ? 'cn-collapsible-badge-active'
                        : 'cn-collapsible-badge-empty'
                    }`}
                  >
                    {hasMaterialsData ? 'Contains details' : 'Optional'}
                  </span>
                </span>
                {isMaterialsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {isMaterialsOpen && (
                <div className="cn-collapsible-body">
                  <div className="cn-form-grid-2">
                    <div className="cn-form-group">
                      <label className="cn-label">Materials & Instruments Used</label>
                      <input
                        type="text"
                        placeholder="e.g. Lignocaine 2%, Rubber Dam, Endo-Z bur, ProTaper Gold, NaOCl 3%, Cavit"
                        value={materialsUsed}
                        onChange={(e) => setMaterialsUsed(e.target.value)}
                        className="cn-input"
                      />
                    </div>

                    <div className="cn-form-group">
                      <label className="cn-label">Immediate Treatment Outcome</label>
                      <input
                        type="text"
                        placeholder="e.g. Immediate pressure release, patient stable and comfortable"
                        value={treatmentOutcome}
                        onChange={(e) => setTreatmentOutcome(e.target.value)}
                        className="cn-input"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Section 4: Treatment Plan & Follow-up */}
          <section className="cn-form-section">
            <div className="cn-form-section-header">
              <h3 className="cn-form-section-title">
                <FileText /> 4. Treatment Plan & Follow-up
              </h3>
            </div>

            <div className="cn-form-group">
              <label className="cn-label">Recommended Planned Treatment</label>
              <textarea
                rows={2}
                placeholder="e.g. Sitting 2 RCT obturation in 5 days; post-endodontic core buildup and zirconia crown"
                value={treatmentRecommendations}
                onChange={(e) => setTreatmentRecommendations(e.target.value)}
                className="cn-textarea"
              />
            </div>

            <div className="cn-form-grid-2">
              <div className="cn-form-group">
                <label className="cn-label">Patient Advice & Home Care</label>
                <input
                  type="text"
                  placeholder="e.g. Soft diet on left side, do not chew hard nuts on right side until crown is placed"
                  value={patientAdvice}
                  onChange={(e) => setPatientAdvice(e.target.value)}
                  className="cn-input"
                />
              </div>

              <div className="cn-form-group">
                <label className="cn-label">Referral Notes / Specialist Consult</label>
                <input
                  type="text"
                  placeholder="e.g. Orthodontic evaluation advised once endodontic treatment is completed"
                  value={referralNotes}
                  onChange={(e) => setReferralNotes(e.target.value)}
                  className="cn-input"
                />
              </div>
            </div>

            <div className="cn-form-group">
              <label className="cn-checkbox-label">
                <input
                  type="checkbox"
                  checked={followUpRequired}
                  onChange={(e) => setFollowUpRequired(e.target.checked)}
                />
                Follow-up appointment required
              </label>

              {followUpRequired && (
                <div className="cn-form-grid-2" style={{ marginTop: '8px' }}>
                  <div className="cn-form-group">
                    <label className="cn-label">Target Follow-up Date</label>
                    <input
                      type="date"
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className="cn-input"
                    />
                  </div>

                  <div className="cn-form-group">
                    <label className="cn-label">Follow-up Instructions</label>
                    <input
                      type="text"
                      placeholder="e.g. Return in 5 days for obturation sitting; contact clinic if unexpected swelling occurs"
                      value={followUpInstructions}
                      onChange={(e) => setFollowUpInstructions(e.target.value)}
                      className="cn-input"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="cn-modal-footer">
          <button
            type="button"
            className="cn-btn cn-btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="cn-btn cn-btn-secondary"
              onClick={() => handleSubmit(false)}
              disabled={loading}
            >
              <Save />
              {loading ? 'Saving...' : 'Save as Draft'}
            </button>

            <button
              type="button"
              className="cn-btn cn-btn-success"
              onClick={() => setConfirmFinalizeOpen(true)}
              disabled={loading}
            >
              <CheckCircle2 />
              Finalize Note
            </button>
          </div>
        </div>

        {/* Finalize Confirmation Dialog */}
        {confirmFinalizeOpen && (
          <div className="cn-modal-overlay" style={{ zIndex: 1100 }}>
            <div className="cn-modal-dialog" style={{ maxWidth: '440px' }}>
              <div className="cn-modal-header">
                <div className="cn-modal-header-info">
                  <CheckCircle2 style={{ color: 'var(--cn-finalized)' }} />
                  <div>
                    <h2>Finalize Clinical Note?</h2>
                  </div>
                </div>
              </div>
              <div className="cn-modal-body">
                <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5 }}>
                  Once finalized, this consultation record becomes a signed, read-only legal medical document.
                  Further updates can only be recorded as auditable clinical addenda.
                </p>
              </div>
              <div className="cn-modal-footer">
                <button
                  type="button"
                  className="cn-btn cn-btn-secondary"
                  onClick={() => setConfirmFinalizeOpen(false)}
                  disabled={loading}
                >
                  Back to Editing
                </button>
                <button
                  type="button"
                  className="cn-btn cn-btn-success"
                  onClick={() => handleSubmit(true)}
                  disabled={loading}
                >
                  Confirm & Finalize
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

