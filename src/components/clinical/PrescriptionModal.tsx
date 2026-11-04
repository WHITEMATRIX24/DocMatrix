import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  AlertTriangle,
  FileCheck2,
  Save,
  Pill,
} from 'lucide-react';
import {
  PrescriptionRecord,
  PrescriptionItemRecord,
  useClinicData,
  addPrescription,
  updatePrescription,
  finalizePrescription,
} from '../../services/clinicStore';
import '../../pages/clinical/prescriptions.css';

interface PrescriptionModalProps {
  initialPrescription?: PrescriptionRecord | null;
  defaultPatientId?: string;
  onClose: () => void;
  onSaved: (prescription: PrescriptionRecord) => void;
}

const COMMON_FREQUENCIES = [
  '1-0-1 (Twice daily)',
  '1-1-1 (Three times daily)',
  '0-0-1 (At bedtime)',
  '1-0-0 (Morning only)',
  'PRN (As needed for pain)',
  'Once a week',
  'Every 6 hours',
];

const COMMON_ROUTES = ['Oral', 'Topical', 'Sublingual', 'Inhalation', 'Other'];

export const PrescriptionModal: React.FC<PrescriptionModalProps> = ({
  initialPrescription,
  defaultPatientId,
  onClose,
  onSaved,
}) => {
  const { patients } = useClinicData();

  // Selected patient state
  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    initialPrescription?.patientId ||
      initialPrescription?.patient?.id ||
      defaultPatientId ||
      (patients[0]?.backendId || patients[0]?.id || '')
  );

  const [diagnosis, setDiagnosis] = useState(initialPrescription?.diagnosis || '');
  const [clinicalNotes, setClinicalNotes] = useState(
    initialPrescription?.clinicalNotes || ''
  );
  const [prescribedAt, setPrescribedAt] = useState(
    initialPrescription?.prescribedAt
      ? initialPrescription.prescribedAt.slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );

  // Dynamic medication items
  const [items, setItems] = useState<Array<Omit<PrescriptionItemRecord, 'id'> & { tempId?: string }>>(
    initialPrescription?.items && initialPrescription.items.length > 0
      ? initialPrescription.items.map((it) => ({
          medicineName: it.medicineName,
          strength: it.strength || '',
          dosage: it.dosage,
          route: it.route || 'Oral',
          frequency: it.frequency,
          duration: it.duration,
          quantity: it.quantity,
          instructions: it.instructions || '',
          tempId: it.id,
        }))
      : [
          {
            medicineName: '',
            strength: '',
            dosage: '1 tablet',
            route: 'Oral',
            frequency: '1-0-1 (Twice daily)',
            duration: '5 days',
            quantity: 10,
            instructions: 'Take after meals with water',
            tempId: 'initial-1',
          },
        ]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Find active patient details
  const activePatient = useMemo(() => {
    return patients.find(
      (p) =>
        p.id.toLowerCase() === selectedPatientId.toLowerCase() ||
        p.backendId?.toLowerCase() === selectedPatientId.toLowerCase()
    );
  }, [patients, selectedPatientId]);

  const medicalAlerts: string[] =
    (activePatient as any)?.medicalAlerts ||
    (activePatient?.allergiesDetails ? [activePatient.allergiesDetails] : []);

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        medicineName: '',
        strength: '',
        dosage: '1 tablet',
        route: 'Oral',
        frequency: '1-0-1 (Twice daily)',
        duration: '5 days',
        quantity: 10,
        instructions: 'Take after meals',
        tempId: `item-${Date.now()}`,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      setError('Prescription must contain at least one medication item.');
      return;
    }
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  // Submission handler for Save as Draft or Finalize
  const handleSubmit = async (shouldFinalize: boolean) => {
    try {
      setError(null);

      if (!selectedPatientId) {
        setError('Please select a patient.');
        return;
      }

      if (!diagnosis.trim()) {
        setError('Clinical diagnosis is required.');
        return;
      }

      // Validate all items
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it.medicineName.trim()) {
          setError(`Medicine name is missing on row #${i + 1}.`);
          return;
        }
        if (!it.dosage.trim()) {
          setError(`Dosage is missing for "${it.medicineName}".`);
          return;
        }
        if (!it.frequency.trim()) {
          setError(`Frequency is missing for "${it.medicineName}".`);
          return;
        }
        if (!it.duration.trim()) {
          setError(`Duration is missing for "${it.medicineName}".`);
          return;
        }
      }

      setLoading(true);

      let savedRecord: PrescriptionRecord;

      if (initialPrescription?.id) {
        // Update existing draft
        await updatePrescription(initialPrescription.id, {
          diagnosis: diagnosis.trim(),
          clinicalNotes: clinicalNotes.trim(),
          prescribedAt,
          items: items.map((it) => ({
            medicineName: it.medicineName,
            strength: it.strength,
            dosage: it.dosage,
            route: it.route,
            frequency: it.frequency,
            duration: it.duration,
            quantity: it.quantity,
            instructions: it.instructions,
          })),
        });

        if (shouldFinalize) {
          savedRecord = await finalizePrescription(initialPrescription.id);
        } else {
          savedRecord = {
            ...initialPrescription,
            diagnosis,
            clinicalNotes,
            prescribedAt,
            items: items.map((it, idx) => ({ ...it, id: it.tempId || `i-${idx}` })),
          };
        }
      } else {
        // Create new prescription
        const created = await addPrescription({
          patientId: activePatient?.backendId || selectedPatientId,
          diagnosis: diagnosis.trim(),
          clinicalNotes: clinicalNotes.trim(),
          prescribedAt,
          items: items.map((it) => ({
            medicineName: it.medicineName,
            strength: it.strength,
            dosage: it.dosage,
            route: it.route,
            frequency: it.frequency,
            duration: it.duration,
            quantity: it.quantity,
            instructions: it.instructions,
          })),
        });

        if (shouldFinalize) {
          savedRecord = await finalizePrescription(created.id);
        } else {
          savedRecord = created;
        }
      }

      onSaved(savedRecord);
    } catch (err: any) {
      console.error('Failed to save prescription:', err);
      const msg =
        err?.message ||
        err?.response?.data?.message ||
        'Failed to save prescription. Ensure you have clinical practitioner privileges.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rx-modal-overlay">
      <div className="rx-modal-dialog rx-modal-dialog-wide" role="dialog" aria-modal="true">
        {/* Modal Header */}
        <div className="rx-modal-header">
          <div className="rx-modal-header-info">
            <div className="rx-modal-header-icon">
              <Pill />
            </div>
            <div className="rx-modal-header-text">
              <h2>
                {initialPrescription ? 'Edit Prescription Draft' : 'New Digital Prescription'}
              </h2>
              <p>
                Author and issue clinical medications on clinic letterhead
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rx-modal-close-btn"
            aria-label="Close dialog"
          >
            <X />
          </button>
        </div>

        {/* Modal Body */}
        <div className="rx-modal-body">
          {error && (
            <div className="rx-alert-box rx-alert-danger">
              <AlertTriangle />
              <div>
                <strong>Prescription Error</strong>
                <p style={{ margin: '2px 0 0', fontSize: '12px' }}>{error}</p>
              </div>
            </div>
          )}

          {/* Section 1: Patient Selection & Date */}
          <div className="rx-form-grid-3">
            <div className="rx-col-span-2 rx-form-group">
              <label className="rx-label">
                Patient Selection
                {defaultPatientId && (
                  <span style={{ marginLeft: '8px', textTransform: 'none', color: 'var(--rx-teal)', fontWeight: 600 }}>
                    (Locked to active patient)
                  </span>
                )}
              </label>
              <select
                disabled={Boolean(defaultPatientId)}
                value={selectedPatientId}
                onChange={(e) => setSelectedPatientId(e.target.value)}
                className="rx-select"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.backendId || p.id}>
                    {p.firstName} {p.lastName} ({p.id}) · {p.gender?.toUpperCase()} · {p.mobile}
                  </option>
                ))}
              </select>
            </div>

            <div className="rx-form-group">
              <label className="rx-label">Prescription Date</label>
              <input
                type="date"
                value={prescribedAt}
                onChange={(e) => setPrescribedAt(e.target.value)}
                className="rx-input"
              />
            </div>
          </div>

          {/* Medical Alerts & Allergies Banner */}
          {medicalAlerts.length > 0 && (
            <div className="rx-alert-box rx-alert-danger">
              <AlertTriangle />
              <div>
                <strong>Patient Allergies & Safety Alerts: </strong>
                <span>{medicalAlerts.join(' · ')}</span>
              </div>
            </div>
          )}

          {/* Section 2: Diagnosis & Clinical Consultation Notes */}
          <div className="rx-form-grid">
            <div className="rx-form-group">
              <label className="rx-label">
                Clinical Diagnosis <span className="rx-req">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Acute Irreversible Pulpitis, Dental Caries"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="rx-input"
              />
            </div>

            <div className="rx-form-group">
              <label className="rx-label">Clinical Notes / Findings (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Tenderness on percussion, deep cavity on mesial"
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                className="rx-input"
              />
            </div>
          </div>

          {/* Section 3: Medication Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="rx-med-head">
              <div className="rx-med-title">
                <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-strong, #0f172a)' }}>
                  Medications & Prescribed Regimen
                </span>
                <span className="rx-code-pill">
                  {items.length} {items.length === 1 ? 'drug' : 'drugs'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="rx-btn rx-btn-secondary rx-btn-sm"
              >
                <Plus />
                Add Medication
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {items.map((item, index) => (
                <div key={item.tempId || index} className="rx-med-card">
                  <div className="rx-med-head">
                    <span className="rx-med-title">
                      <span className="rx-med-number">{index + 1}</span>
                      Medicine #{index + 1}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="rx-btn-icon"
                        title="Remove medication"
                        style={{ color: 'var(--rx-cancelled)' }}
                      >
                        <Trash2 />
                      </button>
                    )}
                  </div>

                  <div className="rx-form-grid-4">
                    <div className="rx-col-span-2 rx-form-group">
                      <label className="rx-label">
                        Medicine Name <span className="rx-req">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Amoxicillin, Paracetamol"
                        value={item.medicineName}
                        onChange={(e) => handleItemChange(index, 'medicineName', e.target.value)}
                        className="rx-input"
                      />
                    </div>

                    <div className="rx-form-group">
                      <label className="rx-label">Strength (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. 500 mg, 625 mg"
                        value={item.strength || ''}
                        onChange={(e) => handleItemChange(index, 'strength', e.target.value)}
                        className="rx-input"
                      />
                    </div>

                    <div className="rx-form-group">
                      <label className="rx-label">
                        Dosage Unit <span className="rx-req">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 1 tablet, 5 ml"
                        value={item.dosage}
                        onChange={(e) => handleItemChange(index, 'dosage', e.target.value)}
                        className="rx-input"
                      />
                    </div>
                  </div>

                  <div className="rx-form-grid-4">
                    <div className="rx-form-group">
                      <label className="rx-label">Route</label>
                      <select
                        value={item.route || 'Oral'}
                        onChange={(e) => handleItemChange(index, 'route', e.target.value)}
                        className="rx-select"
                      >
                        {COMMON_ROUTES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="rx-form-group">
                      <label className="rx-label">
                        Frequency <span className="rx-req">*</span>
                      </label>
                      <input
                        type="text"
                        list={`freq-list-${index}`}
                        placeholder="e.g. 1-0-1, TID, PRN"
                        value={item.frequency}
                        onChange={(e) => handleItemChange(index, 'frequency', e.target.value)}
                        className="rx-input"
                      />
                      <datalist id={`freq-list-${index}`}>
                        {COMMON_FREQUENCIES.map((f) => (
                          <option key={f} value={f} />
                        ))}
                      </datalist>
                    </div>

                    <div className="rx-form-group">
                      <label className="rx-label">
                        Duration <span className="rx-req">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 5 days, 1 week"
                        value={item.duration}
                        onChange={(e) => handleItemChange(index, 'duration', e.target.value)}
                        className="rx-input"
                      />
                    </div>

                    <div className="rx-form-group">
                      <label className="rx-label">Total Quantity</label>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 10"
                        value={item.quantity ?? ''}
                        onChange={(e) =>
                          handleItemChange(
                            index,
                            'quantity',
                            e.target.value ? parseInt(e.target.value, 10) : undefined
                          )
                        }
                        className="rx-input"
                      />
                    </div>
                  </div>

                  <div className="rx-form-group">
                    <label className="rx-label">Patient Usage Instructions</label>
                    <input
                      type="text"
                      placeholder="e.g. Take immediately after meals with warm water"
                      value={item.instructions || ''}
                      onChange={(e) => handleItemChange(index, 'instructions', e.target.value)}
                      className="rx-input"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="rx-modal-footer">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rx-btn rx-btn-secondary"
          >
            Cancel
          </button>

          <div className="rx-modal-footer-actions">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSubmit(false)}
              className="rx-btn rx-btn-secondary"
            >
              <Save />
              Save Draft
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleSubmit(true)}
              className="rx-btn rx-btn-primary"
            >
              <FileCheck2 />
              {loading ? 'Processing...' : 'Finalize Prescription'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
