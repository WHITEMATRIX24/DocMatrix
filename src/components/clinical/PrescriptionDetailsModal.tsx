import React, { useState } from 'react';
import {
  X,
  Printer,
  Edit3,
  FileCheck2,
  Ban,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  Pill,
} from 'lucide-react';
import {
  PrescriptionRecord,
  finalizePrescription,
  cancelPrescription,
} from '../../services/clinicStore';

interface PrescriptionDetailsModalProps {
  prescription: PrescriptionRecord;
  onClose: () => void;
  onEditDraft?: (prescription: PrescriptionRecord) => void;
  onPrint: (prescription: PrescriptionRecord) => void;
  onUpdated?: () => void;
}

export const PrescriptionDetailsModal: React.FC<PrescriptionDetailsModalProps> = ({
  prescription,
  onClose,
  onEditDraft,
  onPrint,
  onUpdated,
}) => {
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const patient = prescription.patient;
  const doctor = prescription.doctor;
  const isDraft = prescription.status === 'DRAFT';
  const isFinalized = prescription.status === 'FINALIZED';
  const isCancelled = prescription.status === 'CANCELLED';

  const alerts = Array.isArray(patient?.medicalSafetyAlerts)
    ? patient.medicalSafetyAlerts
    : [];

  const handleFinalize = async () => {
    try {
      setLoading(true);
      setError(null);
      await finalizePrescription(prescription.id);
      onUpdated?.();
      onClose();
    } catch (err: any) {
      console.error('Finalization failed:', err);
      setError(err?.message || 'Failed to finalize prescription.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      setError('A documented cancellation reason is required.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      await cancelPrescription(prescription.id, cancelReason.trim());
      onUpdated?.();
      onClose();
    } catch (err: any) {
      console.error('Cancellation failed:', err);
      setError(err?.message || 'Failed to cancel prescription.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-base bg-indigo-600 px-2.5 py-1 rounded-md text-white">
              {prescription.prescriptionNumber}
            </span>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Prescription Details
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                    isFinalized
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : isCancelled
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {prescription.status}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Issued on {new Date(prescription.prescribedAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Error</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Patient & Practitioner Banner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Patient
              </span>
              <p className="font-bold text-slate-900">
                {patient ? `${patient.firstName} ${patient.lastName}` : 'Assigned Patient'}
              </p>
              <p className="text-xs text-slate-500 font-mono">
                ID: {patient?.patientCode || prescription.patientId} · {patient?.gender?.toUpperCase()}
              </p>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Prescriber Clinician
              </span>
              <p className="font-bold text-slate-900">{doctor?.fullName || 'Dr. Arun Kumar'}</p>
              <p className="text-xs text-slate-500">Dental Surgeon & Clinical Consultant</p>
            </div>
          </div>

          {/* Medical Safety Alerts */}
          {alerts.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Documented Patient Allergies: </span>
                <span>{alerts.join(' · ')}</span>
              </div>
            </div>
          )}

          {/* Diagnosis & Findings */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Clinical Diagnosis
            </h4>
            <p className="text-sm font-semibold text-slate-900">{prescription.diagnosis}</p>
            {prescription.clinicalNotes && (
              <p className="text-xs text-slate-600 mt-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                {prescription.clinicalNotes}
              </p>
            )}
          </div>

          {/* Medication Items List */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Prescribed Medications ({prescription.items.length})
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200">
              {prescription.items.map((it, idx) => (
                <div key={it.id || idx} className="p-3.5 hover:bg-slate-50/50 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <p className="font-bold text-sm text-slate-900">
                        {it.medicineName}{' '}
                        {it.strength && (
                          <span className="text-xs font-normal text-slate-500">({it.strength})</span>
                        )}
                      </p>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 pl-7">
                      <span className="font-semibold text-slate-700">{it.dosage}</span> ·{' '}
                      <span className="text-indigo-700 font-medium">{it.frequency}</span> ·{' '}
                      <span>Duration: {it.duration}</span>
                      {it.quantity && <span> · Qty: {it.quantity}</span>}
                    </p>
                    {it.instructions && (
                      <p className="text-[11px] text-slate-500 mt-0.5 pl-7 italic">
                        Usage: {it.instructions}
                      </p>
                    )}
                  </div>
                  <span className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md">
                    {it.route || 'Oral'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Trail Metadata */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-slate-700 mb-1">Prescription Audit History</p>
            <p>
              • Created on:{' '}
              {new Date(prescription.createdAt || prescription.prescribedAt).toLocaleString('en-IN')}
            </p>
            {prescription.finalizedAt && (
              <p className="text-emerald-700">
                • Finalized on: {new Date(prescription.finalizedAt).toLocaleString('en-IN')}
              </p>
            )}
            {prescription.cancelledAt && (
              <p className="text-rose-700">
                • Cancelled on: {new Date(prescription.cancelledAt).toLocaleString('en-IN')}
                {prescription.cancellationReason && ` (Reason: ${prescription.cancellationReason})`}
              </p>
            )}
          </div>

          {/* Cancellation Form Expansion */}
          {cancelling && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                <Ban className="w-4 h-4 text-rose-600" />
                Cancel Prescription
              </h5>
              <p className="text-xs text-rose-700">
                Documenting a clinical justification reason is mandatory for regulatory audit compliance.
              </p>
              <textarea
                rows={2}
                placeholder="e.g. Patient reported severe allergic hives, discontinued medication regimen"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2.5 text-xs bg-white border border-rose-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setCancelling(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleCancel}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow-xs"
                >
                  {loading ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            {!isCancelled && !cancelling && (
              <button
                type="button"
                onClick={() => setCancelling(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 text-xs font-semibold rounded-lg transition-colors border border-rose-200"
              >
                <Ban className="w-3.5 h-3.5" />
                Cancel Prescription
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onPrint(prescription)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              Print / Save as PDF
            </button>

            {isDraft && onEditDraft && (
              <button
                type="button"
                onClick={() => onEditDraft(prescription)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
              >
                <Edit3 className="w-4 h-4" />
                Edit Draft
              </button>
            )}

            {isDraft && (
              <button
                type="button"
                disabled={loading}
                onClick={handleFinalize}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
              >
                <FileCheck2 className="w-4 h-4" />
                {loading ? 'Finalizing...' : 'Finalize Prescription'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

