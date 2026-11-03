import React from 'react';
import { Printer, X, AlertTriangle } from 'lucide-react';
import { PrescriptionRecord } from '../../services/clinicStore';
import '../../pages/clinical/prescriptions.css';

interface PrescriptionPrintModalProps {
  prescription: PrescriptionRecord;
  onClose: () => void;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicEmail?: string;
}

export const PrescriptionPrintModal: React.FC<PrescriptionPrintModalProps> = ({
  prescription,
  onClose,
  clinicName = 'DocMatrix Dental & Polyclinic Center',
  clinicAddress = 'Medical Arts Complex, Suite 402, Bangalore, KA',
  clinicPhone = '+91 80 4123 4567',
  clinicEmail = 'care@docmatrix.health',
}) => {
  const handlePrint = () => {
    window.print();
  };

  const patient = prescription.patient;
  const doctor = prescription.doctor;
  const isFinalized = prescription.status === 'FINALIZED';
  const isCancelled = prescription.status === 'CANCELLED';

  const alerts = Array.isArray(patient?.medicalSafetyAlerts)
    ? patient.medicalSafetyAlerts
    : [];

  return (
    <div className="rx-modal-overlay">
      <div className="rx-modal-dialog rx-modal-dialog-wide" role="dialog" aria-modal="true">
        {/* Top Modal Controls (Hidden in Print) */}
        <div className="rx-modal-header no-print">
          <div className="rx-modal-header-info">
            <div className="rx-modal-header-icon">
              <Printer />
            </div>
            <div className="rx-modal-header-text">
              <h2>Print Prescription — {prescription.prescriptionNumber}</h2>
              <p>Official clinic letterhead layout</p>
            </div>
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
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={handlePrint}
              className="rx-btn rx-btn-primary"
            >
              <Printer />
              Print / Save as PDF
            </button>
            <button
              onClick={onClose}
              className="rx-modal-close-btn"
              aria-label="Close dialog"
            >
              <X />
            </button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div id="printable-prescription" className="rx-print-document">
          {/* Clinic Header / Letterhead */}
          <div className="rx-letterhead">
            <div className="rx-letterhead-brand">
              <span className="rx-letterhead-logo">DM</span>
              <div className="rx-letterhead-clinic">
                <h1>{clinicName}</h1>
                <p>{clinicAddress}</p>
                <p>Phone: {clinicPhone} | Email: {clinicEmail}</p>
              </div>
            </div>
            <div className="rx-letterhead-meta">
              <div className="rx-code-pill" style={{ fontSize: '13px' }}>
                {prescription.prescriptionNumber}
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#64748b' }}>
                Date:{' '}
                {new Date(prescription.prescribedAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
              {isCancelled && (
                <span className="rx-badge rx-badge-cancelled" style={{ marginTop: '4px' }}>
                  CANCELLED / VOID
                </span>
              )}
            </div>
          </div>

          {/* Doctor & Patient Information Grid */}
          <div className="rx-meta-banner" style={{ marginBottom: '20px' }}>
            <div className="rx-meta-item">
              <h5>Prescribing Practitioner</h5>
              <p>{doctor?.fullName || 'Dr. Arun Kumar'}</p>
              <p className="rx-meta-sub">Dental Surgeon & Clinical Consultant</p>
              <p className="rx-meta-sub">Practitioner ID: {doctor?.id?.slice(0, 8) || 'DOC-REG'}</p>
            </div>
            <div className="rx-meta-item">
              <h5>Patient Demographics</h5>
              <p>{patient ? `${patient.firstName} ${patient.lastName}` : 'Registered Patient'}</p>
              <p className="rx-meta-sub">
                Patient ID: {patient?.patientCode || prescription.patientId}
                {patient?.gender && ` · Gender: ${patient.gender.toUpperCase()}`}
              </p>
              {patient?.mobile && <p className="rx-meta-sub">Contact: {patient.mobile}</p>}
            </div>
          </div>

          {/* Medical Safety Alerts / Allergies (If Any) */}
          {alerts.length > 0 && (
            <div className="rx-alert-box rx-alert-danger" style={{ marginBottom: '20px' }}>
              <AlertTriangle />
              <div>
                <strong>Clinical Safety Alerts & Allergies: </strong>
                <span>{alerts.join(' · ')}</span>
              </div>
            </div>
          )}

          {/* Diagnosis & Clinical Notes */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="rx-label">Diagnosis:</span>
              <strong style={{ fontSize: '14px', color: '#0f172a' }}>{prescription.diagnosis}</strong>
            </div>
            {prescription.clinicalNotes && (
              <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px', paddingLeft: '10px', borderLeft: '2px solid var(--rx-teal)' }}>
                <span style={{ fontWeight: 600 }}>Clinical Findings: </span>
                {prescription.clinicalNotes}
              </div>
            )}
            {isCancelled && prescription.cancellationReason && (
              <div style={{ fontSize: '12px', color: 'var(--rx-cancelled)', marginTop: '6px', padding: '6px 10px', background: 'var(--rx-cancelled-bg)', borderRadius: '4px' }}>
                <strong>Cancellation Reason: </strong>
                {prescription.cancellationReason}
              </div>
            )}
          </div>

          {/* Rx Symbol & Medication Table */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '24px', fontWeight: 900, fontFamily: 'serif', color: 'var(--rx-teal)' }}>℞</span>
              <span className="rx-label">Medication Regimen</span>
            </div>

            <table className="rx-print-table">
              <thead>
                <tr>
                  <th style={{ width: '32px', textAlign: 'center' }}>#</th>
                  <th>Medicine & Strength</th>
                  <th>Dosage / Route</th>
                  <th>Frequency</th>
                  <th>Duration</th>
                  <th style={{ textAlign: 'center' }}>Qty</th>
                  <th>Instructions</th>
                </tr>
              </thead>
              <tbody>
                {prescription.items.map((item, index) => (
                  <tr key={item.id || index}>
                    <td style={{ textAlign: 'center', fontFamily: 'monospace', color: '#64748b' }}>{index + 1}</td>
                    <td>
                      <strong>{item.medicineName}</strong>
                      {item.strength && <span style={{ marginLeft: '4px', color: '#64748b' }}>({item.strength})</span>}
                    </td>
                    <td>
                      {item.dosage}
                      <span style={{ display: 'block', fontSize: '11px', color: '#64748b' }}>{item.route || 'Oral'}</span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--rx-teal)' }}>{item.frequency}</td>
                    <td>{item.duration}</td>
                    <td style={{ textAlign: 'center', fontWeight: 600, fontFamily: 'monospace' }}>
                      {item.quantity ?? '—'}
                    </td>
                    <td style={{ fontStyle: 'italic', color: '#475569' }}>
                      {item.instructions || 'As advised'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Patient Advice */}
          <div style={{ marginBottom: '32px', fontSize: '11.5px', color: '#64748b', background: '#f8fafc', padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <strong style={{ color: '#334155', display: 'block', marginBottom: '4px' }}>Patient Advice:</strong>
            <ul style={{ margin: 0, paddingLeft: '18px', lineHeight: 1.5 }}>
              <li>Complete the full antibiotic course even if symptoms subside.</li>
              <li>Seek immediate medical attention if adverse allergic symptoms (rash, swelling, breathing difficulty) occur.</li>
              <li>Keep all medications out of reach of children and store in a cool, dry place.</li>
            </ul>
          </div>

          {/* Signature & Authentication Footer */}
          <div className="rx-signature-row">
            <div>
              <p style={{ margin: 0, color: '#94a3b8' }}>Generated via DocMatrix Clinical Workstation</p>
              <p style={{ margin: '2px 0 0', color: '#94a3b8', fontFamily: 'monospace' }}>Prescription ID: {prescription.id}</p>
              <p style={{ margin: '4px 0 0', fontStyle: 'italic', color: '#64748b' }}>
                * Computer-generated clinical record. Physical clinician signature & stamp validate document where mandated by statute.
              </p>
            </div>
            <div className="rx-signature-box">
              <div className="rx-signature-line" />
              <strong style={{ display: 'block', color: '#0f172a' }}>{doctor?.fullName || 'Authorized Dental Surgeon'}</strong>
              <span style={{ color: '#64748b' }}>Clinician Signature & Stamp</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
