import React from 'react';
import { Printer, X, ShieldCheck } from 'lucide-react';
import { TreatmentPlanRecord } from '../../services/clinicStore';
import '../../pages/clinical/treatmentPlans.css';

interface TreatmentPlanPrintModalProps {
  plan: TreatmentPlanRecord;
  onClose: () => void;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicEmail?: string;
}

export const TreatmentPlanPrintModal: React.FC<TreatmentPlanPrintModalProps> = ({
  plan,
  onClose,
  clinicName = 'DocMatrix Dental & Multi-Speciality Polyclinic',
  clinicAddress = 'Medical Arts Complex, Suite 402, Bengaluru, Karnataka 560001',
  clinicPhone = '+91 80 4123 4567 / +91 98450 12345',
  clinicEmail = 'care@docmatrix.health • www.docmatrix.health',
}) => {
  const handlePrint = () => {
    window.print();
  };

  const patient = plan.patient;
  const stages = plan.stages && plan.stages.length > 0 ? plan.stages : [
    {
      id: 'st-fallback',
      stageNumber: 1,
      name: 'Primary Treatment Plan',
      status: 'PLANNED' as const,
      estimatedCost: plan.cost,
      items: [
        {
          id: 'it-fallback',
          procedureName: plan.procedure,
          category: plan.category,
          toothNumber: plan.toothNumber,
          quantity: 1,
          unitFee: plan.cost,
          discount: 0,
          netFee: plan.cost,
          status: 'PENDING' as const,
        },
      ],
    },
  ];

  return (
    <div className="tp-modal-overlay">
      <div className="tp-modal-dialog tp-modal-dialog-xl" role="dialog" aria-modal="true">
        {/* Top Controls (Hidden in Print) */}
        <div className="tp-modal-header no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Printer size={18} color="var(--tp-teal)" />
            <div>
              <strong style={{ fontSize: '15px' }}>
                Print Treatment Plan & Cost Estimate — {plan.planNumber || plan.id}
              </strong>
              <small style={{ display: 'block', color: 'var(--text-muted, #64748b)' }}>
                Official clinic letterhead layout • Estimate v{plan.currentVersion || 1}
              </small>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--tp-teal)',
                color: '#ffffff',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Printer size={14} /> Print Document
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Letterhead Container */}
        <div className="tp-modal-body tp-print-container" style={{ padding: '36px 44px' }}>
          {/* Clinic Letterhead Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '2px solid #0f172a',
              paddingBottom: '16px',
              marginBottom: '20px',
            }}
          >
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#008891', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
                {clinicName}
              </h1>
              <p style={{ margin: '0 0 2px 0', fontSize: '12px', color: '#475569' }}>
                {clinicAddress}
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: '#475569' }}>
                Tel: {clinicPhone} • Email: {clinicEmail}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  display: 'inline-block',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                }}
              >
                {plan.planNumber || plan.id}
              </span>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                Estimate Version: <strong>v{plan.currentVersion || 1}</strong>
              </p>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#64748b' }}>
                Date: {plan.date}
              </p>
            </div>
          </div>

          {/* Document Title */}
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Dental Treatment Plan & Cost Estimate
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>
              {plan.title || plan.procedure}
            </p>
          </div>

          {/* Patient & Doctor Context Bar */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px 16px',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '12px',
              fontSize: '12.5px',
              marginBottom: '24px',
            }}
          >
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>
                Patient Name
              </span>
              <strong>
                {patient ? `${patient.firstName} ${patient.lastName}` : plan.patientId}
              </strong>{' '}
              <span style={{ color: '#64748b' }}>
                ({patient?.patientCode || plan.patientId})
              </span>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>
                Attending Dentist
              </span>
              <strong>{plan.doctor}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>
                Estimate Status
              </span>
              <strong style={{ color: '#008891' }}>{plan.status.toUpperCase()}</strong>
            </div>
          </div>

          {/* Itemized Clinical Stages */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px' }}>
            {stages.map((stage) => (
              <div key={stage.id} style={{ border: '1px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                <div
                  style={{
                    background: '#f1f5f9',
                    padding: '8px 14px',
                    borderBottom: '1px solid #cbd5e1',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <strong style={{ fontSize: '13px', color: '#0f172a' }}>
                    STAGE {stage.stageNumber}: {stage.name}
                  </strong>
                  <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#008891' }}>
                    Stage Estimate: ₹{stage.estimatedCost?.toLocaleString()}
                  </span>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '6px 12px', textAlign: 'left' }}>Procedure</th>
                      <th style={{ padding: '6px 12px', textAlign: 'left' }}>Tooth / Surface</th>
                      <th style={{ padding: '6px 12px', textAlign: 'center' }}>Qty</th>
                      <th style={{ padding: '6px 12px', textAlign: 'right' }}>Unit Fee</th>
                      <th style={{ padding: '6px 12px', textAlign: 'right' }}>Discount</th>
                      <th style={{ padding: '6px 12px', textAlign: 'right' }}>Net Fee (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stage.items.map((item, idx) => (
                      <tr key={item.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px' }}>
                          <strong>{item.procedureName}</strong>
                          {item.procedureCode && (
                            <span style={{ color: '#64748b', marginLeft: '6px', fontSize: '11px' }}>
                              ({item.procedureCode})
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          {item.toothNumber ? `#${item.toothNumber}` : 'General'}
                          {item.surface ? ` (${item.surface})` : ''}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                          ₹{item.unitFee?.toLocaleString()}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: item.discount > 0 ? '#059669' : 'inherit' }}>
                          {item.discount > 0 ? `-₹${item.discount?.toLocaleString()}` : '—'}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>
                          ₹{item.netFee?.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* Financial Summary */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '32px' }}>
            <div style={{ width: '300px', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '12px 16px', background: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12.5px' }}>
                <span style={{ color: '#64748b' }}>Gross Subtotal:</span>
                <span>₹{(plan.subtotal || plan.cost).toLocaleString()}</span>
              </div>
              {plan.discount ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12.5px', color: '#059669' }}>
                  <span>Discounts Applied:</span>
                  <span>-₹{plan.discount?.toLocaleString()}</span>
                </div>
              ) : null}
              {plan.tax ? (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '12.5px' }}>
                  <span style={{ color: '#64748b' }}>Tax / GST:</span>
                  <span>₹{plan.tax?.toLocaleString()}</span>
                </div>
              ) : null}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  paddingTop: '8px',
                  marginTop: '6px',
                  borderTop: '2px solid #cbd5e1',
                  fontSize: '15px',
                  fontWeight: 800,
                  color: '#008891',
                }}
              >
                <span>Total Estimated Cost:</span>
                <span>₹{(plan.totalEstimatedCost || plan.cost).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Informed Consent & Acceptance Agreement */}
          <div
            style={{
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '16px',
              background: '#ffffff',
              fontSize: '11.5px',
              color: '#334155',
              lineHeight: '1.6',
              marginBottom: '32px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontWeight: 700, color: '#0f172a' }}>
              <ShieldCheck size={16} color="#008891" />
              <span>Informed Consent & Treatment Agreement</span>
            </div>
            <p style={{ margin: '0 0 6px 0' }}>
              I have discussed the clinical findings, proposed procedures, treatment alternatives, associated risks, and the above itemized cost estimate with my dentist. I understand that individual biological healing and clinical variations may necessitate modifications to the plan, which will be communicated prior to execution.
            </p>
            <p style={{ margin: 0, fontWeight: 600, color: '#64748b' }}>
              Estimate Validity: This treatment cost estimate is valid for 30 calendar days from the date of issue.
            </p>
          </div>

          {/* Signatures Block */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', paddingTop: '20px' }}>
            <div>
              <div style={{ borderBottom: '1px solid #0f172a', height: '40px' }}></div>
              <p style={{ margin: '6px 0 0', fontSize: '12px', fontWeight: 700 }}>
                Patient / Legal Guardian Signature
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>
                Date: ________________________
              </p>
            </div>
            <div>
              <div style={{ borderBottom: '1px solid #0f172a', height: '40px' }}></div>
              <p style={{ margin: '6px 0 0', fontSize: '12px', fontWeight: 700 }}>
                Treating Dentist: {plan.doctor}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>
                Date: ________________________
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

