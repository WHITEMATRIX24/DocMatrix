import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  AlertTriangle,
  FileCheck2,
  Save,
  Pill,
  Clock,
  Sparkles,
  Search,
} from 'lucide-react';
import {
  PrescriptionRecord,
  PrescriptionItemRecord,
  useClinicData,
  addPrescription,
  updatePrescription,
  finalizePrescription,
} from '../../services/clinicStore';

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg text-white">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {initialPrescription ? 'Edit Prescription Draft' : 'New Digital Prescription'}
              </h2>
              <p className="text-xs text-slate-400">
                Author and issue clinical medications on clinic letterhead
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Scrollable Form */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Prescription Error</p>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Section 1: Patient Selection & Medical Safety Preview */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Patient Selection
              </label>
              {defaultPatientId && (
                <span className="text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  Patient locked from active profile
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <select
                  disabled={Boolean(defaultPatientId)}
                  value={selectedPatientId}
                  onChange={(e) => setSelectedPatientId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium disabled:bg-slate-100 disabled:text-slate-600"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.backendId || p.id}>
                      {p.firstName} {p.lastName} ({p.id}) · {p.gender?.toUpperCase()} · {p.mobile}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <input
                  type="date"
                  value={prescribedAt}
                  onChange={(e) => setPrescribedAt(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Medical Alerts & Allergies Banner */}
            {medicalAlerts.length > 0 && (
              <div className="mt-2 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Patient Allergies & Safety Alerts: </span>
                  <span className="font-medium">{medicalAlerts.join(' · ')}</span>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Diagnosis & Clinical Consultation Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                Clinical Diagnosis <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Acute Irreversible Pulpitis, Dental Caries"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1.5">
                Clinical Notes / Findings (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Tenderness on percussion, deep cavity on mesial"
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Section 3: Medication Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Medications & Prescribed Regimen
                </h3>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono font-medium">
                  {items.length} {items.length === 1 ? 'drug' : 'drugs'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Medication
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={item.tempId || index}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-4 transition-all hover:border-slate-300"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[11px] font-bold">
                        {index + 1}
                      </span>
                      Medicine #{index + 1}
                    </span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                        title="Remove medication"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                    <div className="md:col-span-2">
                      <label className="text-[11px] font-medium text-slate-600 block mb-1">
                        Medicine Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Amoxicillin, Paracetamol"
                        value={item.medicineName}
                        onChange={(e) => handleItemChange(index, 'medicineName', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-600 block mb-1">
                        Strength (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 500 mg, 625 mg, 0.2%"
                        value={item.strength || ''}
                        onChange={(e) => handleItemChange(index, 'strength', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-600 block mb-1">
                        Dosage Unit <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 1 tablet, 5 ml, 1 drop"
                        value={item.dosage}
                        onChange={(e) => handleItemChange(index, 'dosage', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 block mb-1">Route</label>
                      <select
                        value={item.route || 'Oral'}
                        onChange={(e) => handleItemChange(index, 'route', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        {COMMON_ROUTES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-600 block mb-1">
                        Frequency <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        list={`freq-list-${index}`}
                        placeholder="e.g. 1-0-1, TID, PRN"
                        value={item.frequency}
                        onChange={(e) => handleItemChange(index, 'frequency', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <datalist id={`freq-list-${index}`}>
                        {COMMON_FREQUENCIES.map((f) => (
                          <option key={f} value={f} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-600 block mb-1">
                        Duration <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 5 days, 1 week"
                        value={item.duration}
                        onChange={(e) => handleItemChange(index, 'duration', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-slate-600 block mb-1">Total Quantity</label>
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
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      Patient Usage Instructions
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Take immediately after meals with warm water"
                      value={item.instructions || ''}
                      onChange={(e) => handleItemChange(index, 'instructions', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 text-sm font-semibold transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSubmit(false)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-sm font-semibold transition-colors shadow-xs"
            >
              <Save className="w-4 h-4 text-slate-500" />
              Save Draft
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleSubmit(true)}
              className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm disabled:opacity-50"
            >
              <FileCheck2 className="w-4 h-4" />
              {loading ? 'Processing...' : 'Finalize Prescription'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
