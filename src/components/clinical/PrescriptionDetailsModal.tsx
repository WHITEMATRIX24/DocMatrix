import React, { useState } from 'react';
import {
  X,
  Printer,
  Edit3,
  FileCheck2,
  Ban,
  AlertTriangle,
} from 'lucide-react';
import {
  PrescriptionRecord,
  finalizePrescription,
  cancelPrescription,
} from '../../services/clinicStore';
import '../../pages/clinical/prescriptions.css';

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
    <div className="rx-modal-overlay">
      <div className="rx-modal-dialog" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="rx-modal-header">
          <div className="rx-modal-header-info">
            <span
              className="rx-code-pill"
              style={{
                background: 'var(--rx-teal)',
                color: '#ffffff',
                fontSize: '13px',
              }}
            >
              {prescription.prescriptionNumber}
            </span>
            <div className="rx-modal-header-text">
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                Prescription Details
                <span
                  className={`rx-badge ${
                    isFinalized
                      ? 'rx-badge-finalized'
                      : isCancelled
                      ? 'rx-badge-cancelled'
                      : 'rx-badge-draft'
                  }`}
                >
                  <span className="rx-badge-dot" />
                  {prescription.status}
                </span>
              </h2>
              <p>
                Issued on{' '}
                {new Date(prescription.prescribedAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
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

        {/* Content */}
        <div className="rx-modal-body">
          {error && (
            <div className="rx-alert-box rx-alert-danger">
              <AlertTriangle />
              <div>
                <strong>Error</strong>
                <p style={{ margin: '2px 0 0', fontSize: '12px' }}>{error}</p>
              </div>
            </div>
          )}

          {/* Patient & Practitioner Banner */}
          <div className="rx-meta-banner">
            <div className="rx-meta-item">
              <h5>Patient</h5>
              <p>{patient ? `${patient.firstName} ${patient.lastName}` : 'Assigned Patient'}</p>
              <p className="rx-meta-sub">
                ID: {patient?.patientCode || prescription.patientId} · {patient?.gender?.toUpperCase()}
              </p>
            </div>
            <div className="rx-meta-item">
              <h5>Prescriber Clinician</h5>
              <p>{doctor?.fullName || 'Dr. Arun Kumar'}</p>
              <p className="rx-meta-sub">Dental Surgeon & Clinical Consultant</p>
            </div>
          </div>

          {/* Medical Safety Alerts */}
          {alerts.length > 0 && (
            <div className="rx-alert-box rx-alert-danger">
              <AlertTriangle />
              <div>
                <strong>Documented Patient Allergies: </strong>
                <span>{alerts.join(' · ')}</span>
              </div>
            </div>
          )}

          {/* Diagnosis & Findings */}
          <div>
            <span className="rx-label">Clinical Diagnosis</span>
            <p
              style={{
                margin: '4px 0 0',
                fontWeight: 700,
                fontSize: '14px',
                color: 'var(--text-strong, #0f172a)',
              }}
            >
              {prescription.diagnosis}
            </p>
            {prescription.clinicalNotes && (
              <p
                style={{
                  margin: '8px 0 0',
                  padding: '10px 12px',
                  background: 'var(--paper, #f8fafc)',
                  borderRadius: 'var(--rx-radius-sm)',
                  border: '1px solid var(--line, #e2e8f0)',
                  fontSize: '12.5px',
                  color: 'var(--text, #334155)',
                }}
              >
                {prescription.clinicalNotes}
              </p>
            )}
          </div>

          {/* Medication Items List */}
          <div>
            <span
              className="rx-label"
              style={{ display: 'block', marginBottom: '8px' }}
            >
              Prescribed Medications ({prescription.items.length})
            </span>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {prescription.items.map((it, idx) => (
                <div
                  key={it.id || idx}
                  className="rx-med-card"
                  style={{ padding: '12px 14px' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="rx-med-number">{idx + 1}</span>
                      <strong
                        style={{
                          fontSize: '13.5px',
                          color: 'var(--text-strong, #0f172a)',
                        }}
                      >
                        {it.medicineName}
                        {it.strength && (
                          <span
                            style={{
                              marginLeft: '6px',
                              fontSize: '12px',
                              fontWeight: 500,
                              color: 'var(--text-muted, #64748b)',
                            }}
                          >
                            ({it.strength})
                          </span>
                        )}
                      </strong>
                    </div>
                    <span className="rx-code-pill">{it.route || 'Oral'}</span>
                  </div>

                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--text, #334155)',
                      paddingLeft: '28px',
                    }}
                  >
                    <span>Dosage: <strong>{it.dosage}</strong></span> ·{' '}
                    <span style={{ color: 'var(--rx-teal)', fontWeight: 600 }}>{it.frequency}</span> ·{' '}
                    <span>Duration: {it.duration}</span>
                    {it.quantity && <span> · Qty: {it.quantity}</span>}
                  </div>

                  {it.instructions && (
                    <div
                      style={{
                        fontSize: '11.5px',
                        color: 'var(--text-muted, #64748b)',
                        paddingLeft: '28px',
                        fontStyle: 'italic',
                      }}
                    >
                      Usage instructions: {it.instructions}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Audit Trail Metadata */}
          <div className="rx-audit-box">
            <strong>Prescription Audit History</strong>
            <p>
              • Created on:{' '}
              {new Date(prescription.createdAt || prescription.prescribedAt).toLocaleString('en-IN')}
            </p>
            {prescription.finalizedAt && (
              <p style={{ color: 'var(--rx-finalized)', fontWeight: 600 }}>
                • Finalized on: {new Date(prescription.finalizedAt).toLocaleString('en-IN')}
              </p>
            )}
            {prescription.cancelledAt && (
              <p style={{ color: 'var(--rx-cancelled)', fontWeight: 600 }}>
                • Cancelled on: {new Date(prescription.cancelledAt).toLocaleString('en-IN')}
                {prescription.cancellationReason && ` (Reason: ${prescription.cancellationReason})`}
              </p>
            )}
          </div>

          {/* Cancellation Form Expansion */}
          {cancelling && (
            <div
              className="rx-alert-box rx-alert-danger"
              style={{ flexDirection: 'column', gap: '10px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Ban />
                <strong>Cancel Prescription</strong>
              </div>
              <p style={{ margin: 0, fontSize: '12px' }}>
                Documenting a clinical justification reason is mandatory for regulatory audit compliance.
              </p>
              <textarea
                rows={2}
                placeholder="e.g. Patient reported severe allergic hives, discontinued medication regimen"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="rx-textarea"
                style={{ borderColor: 'var(--rx-cancelled)' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setCancelling(false)}
                  className="rx-btn rx-btn-secondary rx-btn-sm"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleCancel}
                  className="rx-btn rx-btn-danger rx-btn-sm"
                >
                  {loading ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="rx-modal-footer">
          <div>
            {!isCancelled && !cancelling && (
              <button
                type="button"
                onClick={() => setCancelling(true)}
                className="rx-btn rx-btn-danger rx-btn-sm"
              >
                <Ban />
                Cancel Prescription
              </button>
            )}
          </div>

          <div className="rx-modal-footer-actions">
            <button
              type="button"
              onClick={() => onPrint(prescription)}
              className="rx-btn rx-btn-secondary"
            >
              <Printer />
              Print / Save as PDF
            </button>

            {isDraft && onEditDraft && (
              <button
                type="button"
                onClick={() => onEditDraft(prescription)}
                className="rx-btn rx-btn-secondary"
              >
                <Edit3 />
                Edit Draft
              </button>
            )}

            {isDraft && (
              <button
                type="button"
                disabled={loading}
                onClick={handleFinalize}
                className="rx-btn rx-btn-primary"
              >
                <FileCheck2 />
                {loading ? 'Finalizing...' : 'Finalize Prescription'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
