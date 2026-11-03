import React from 'react';
import { Printer, X, AlertTriangle, ShieldCheck } from 'lucide-react';
import { PrescriptionRecord } from '../../services/clinicStore';

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:inset-auto">
      {/* Print-specific style overrides */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-prescription, #printable-prescription * {
            visibility: visible;
          }
          #printable-prescription {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 20px;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden print:max-w-none print:shadow-none print:rounded-none">
        {/* Top Modal Controls (Hidden in Print) */}
        <div className="no-print flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-indigo-400" />
            <span className="font-semibold text-base">Print Prescription — {prescription.prescriptionNumber}</span>
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
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Print / Save as PDF
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div id="printable-prescription" className="p-8 text-slate-900 bg-white font-sans">
          {/* Clinic Header / Letterhead */}
          <div className="border-b-2 border-indigo-600 pb-5 mb-6 flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-indigo-900 flex items-center gap-2">
                <span className="p-1.5 bg-indigo-600 text-white rounded-lg text-base font-black">DM</span>
                {clinicName}
              </h1>
              <p className="text-xs text-slate-500 mt-1">{clinicAddress}</p>
              <p className="text-xs text-slate-500">Phone: {clinicPhone} | Email: {clinicEmail}</p>
            </div>
            <div className="text-right">
              <div className="inline-block px-3 py-1 bg-slate-100 rounded text-xs font-mono font-bold text-slate-800 tracking-wider">
                {prescription.prescriptionNumber}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Date: {new Date(prescription.prescribedAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
              {isCancelled && (
                <span className="inline-block mt-1 text-xs font-bold text-rose-600 border border-rose-300 px-2 py-0.5 rounded bg-rose-50">
                  CANCELLED / VOID
                </span>
              )}
            </div>
          </div>

          {/* Doctor & Patient Information Grid */}
          <div className="grid grid-cols-2 gap-6 bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 text-sm">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Prescribing Practitioner
              </span>
              <p className="font-bold text-slate-900 text-base">
                {doctor?.fullName || 'Dr. Arun Kumar'}
              </p>
              <p className="text-xs text-slate-600 font-medium">Dental Surgeon & Clinical Consultant</p>
              <p className="text-xs text-slate-500">DocMatrix Practitioner ID: {doctor?.id?.slice(0, 8) || 'DOC-REG'}</p>
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Patient Demographics
              </span>
              <p className="font-bold text-slate-900 text-base">
                {patient ? `${patient.firstName} ${patient.lastName}` : 'Registered Patient'}
              </p>
              <p className="text-xs text-slate-600">
                Patient ID: <span className="font-mono font-semibold">{patient?.patientCode || prescription.patientId}</span>
                {patient?.gender && ` · Gender: ${patient.gender.toUpperCase()}`}
              </p>
              {patient?.mobile && <p className="text-xs text-slate-500">Contact: {patient.mobile}</p>}
            </div>
          </div>

          {/* Medical Safety Alerts / Allergies (If Any) */}
          {alerts.length > 0 && (
            <div className="mb-6 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold uppercase tracking-wide text-rose-700">Clinical Safety Alerts & Allergies: </span>
                <span className="font-medium">{alerts.join(' · ')}</span>
              </div>
            </div>
          )}

          {/* Diagnosis & Clinical Notes */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Diagnosis:</span>
              <span className="text-sm font-semibold text-slate-900">{prescription.diagnosis}</span>
            </div>
            {prescription.clinicalNotes && (
              <div className="text-xs text-slate-600 mt-1 pl-3 border-l-2 border-indigo-200">
                <span className="font-medium text-slate-700">Clinical Findings: </span>
                {prescription.clinicalNotes}
              </div>
            )}
            {isCancelled && prescription.cancellationReason && (
              <div className="text-xs text-rose-700 mt-2 pl-3 border-l-2 border-rose-400 bg-rose-50 py-1 rounded-r">
                <span className="font-bold">Cancellation Reason: </span>
                {prescription.cancellationReason}
              </div>
            )}
          </div>

          {/* Rx Symbol & Medication Table */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl font-black font-serif text-indigo-900">℞</span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Medication Regimen</span>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-2.5 px-3 w-8 text-center">#</th>
                    <th className="py-2.5 px-3">Medicine & Strength</th>
                    <th className="py-2.5 px-3">Dosage / Route</th>
                    <th className="py-2.5 px-3">Frequency</th>
                    <th className="py-2.5 px-3">Duration</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3">Instructions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {prescription.items.map((item, index) => (
                    <tr key={item.id || index} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 text-center text-slate-500 font-mono">{index + 1}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        {item.medicineName}
                        {item.strength && <span className="ml-1 text-slate-600 font-normal">({item.strength})</span>}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">
                        {item.dosage}
                        <span className="text-slate-400 text-[11px] block">{item.route || 'Oral'}</span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-indigo-700">{item.frequency}</td>
                      <td className="py-2.5 px-3 text-slate-700">{item.duration}</td>
                      <td className="py-2.5 px-3 text-center font-mono font-semibold text-slate-800">
                        {item.quantity ?? '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 italic">
                        {item.instructions || 'As advised'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* General Advice & Warnings */}
          <div className="mb-10 text-[11px] text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
            <p className="font-semibold text-slate-700 mb-0.5">Patient Advice:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>Complete the full antibiotic course even if symptoms subside.</li>
              <li>Seek immediate medical attention if adverse allergic symptoms (rash, swelling, breathing difficulty) occur.</li>
              <li>Keep all medications out of reach of children and store in a cool, dry place.</li>
            </ul>
          </div>

          {/* Signature & Authentication Footer */}
          <div className="pt-6 border-t border-slate-200 flex items-end justify-between text-xs">
            <div>
              <p className="text-[10px] text-slate-400">
                Generated via DocMatrix Clinical Workstation
              </p>
              <p className="text-[10px] text-slate-400">
                Prescription ID: <span className="font-mono">{prescription.id}</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-1 italic">
                * Note: Computer-generated prescription document. Requires physical practitioner seal and signature where required by local statute.
              </p>
            </div>
            <div className="text-center min-w-[200px]">
              <div className="border-b border-slate-400 h-14 mb-2"></div>
              <p className="font-bold text-slate-900">{doctor?.fullName || 'Authorized Dental Surgeon'}</p>
              <p className="text-[11px] text-slate-500">Clinician Signature & Stamp</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

