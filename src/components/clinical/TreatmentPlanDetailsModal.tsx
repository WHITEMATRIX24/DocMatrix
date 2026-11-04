import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  History,
  ThumbsUp,
  ThumbsDown,
  UserCheck,
  Calendar,
} from 'lucide-react';
import {
  type TreatmentPlanRecord,
  type TreatmentPlanStageRecord,
  type TreatmentPlanItemRecord,
  recordTreatmentPlanAcceptance,
  recordTreatmentPlanRejection,
  updateTreatmentPlanItemStatus,
  updateTreatmentPlanStatus,
} from '../../services/clinicStore';
import '../../pages/clinical/treatmentPlans.css';

interface TreatmentPlanDetailsModalProps {
  plan: TreatmentPlanRecord;
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => void;
}

export const TreatmentPlanDetailsModal: React.FC<TreatmentPlanDetailsModalProps> = ({
  plan,
  isOpen,
  onClose,
  onPrint,
}) => {
  const [activeTab, setActiveTab] = useState<'stages' | 'history'>('stages');
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Acceptance form state
  const [acceptedByName, setAcceptedByName] = useState(
    plan.patientAcceptedByName ||
      (plan.patient ? `${plan.patient.firstName} ${plan.patient.lastName}` : '')
  );
  const [acceptanceMethod, setAcceptanceMethod] = useState<
    'STAFF_RECORDED' | 'WRITTEN_CONSENT' | 'DIGITAL_SIGNATURE' | 'PATIENT_PORTAL'
  >('STAFF_RECORDED');
  const [acceptanceNotes, setAcceptanceNotes] = useState('');
  const [isSubmittingAcceptance, setIsSubmittingAcceptance] = useState(false);

  // Rejection form state
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmittingRejection, setIsSubmittingRejection] = useState(false);

  const { totalItems, completedItems, inProgressItems, deferredItems, cancelledItems, progressPct } = useMemo(() => {
    let total = 0;
    let completed = 0;
    let inProgress = 0;
    let deferred = 0;
    let cancelled = 0;

    const stages = plan.stages || [];
    for (const stage of stages) {
      for (const item of stage.items || []) {
        if (item.status === 'CANCELLED') {
          cancelled++;
        } else {
          total++;
          if (item.status === 'COMPLETED') completed++;
          else if (item.status === 'IN_PROGRESS') inProgress++;
          else if (item.status === 'DEFERRED') deferred++;
        }
      }
    }

    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      totalItems: total,
      completedItems: completed,
      inProgressItems: inProgress,
      deferredItems: deferred,
      cancelledItems: cancelled,
      progressPct: pct,
    };
  }, [plan.stages]);

  if (!isOpen) return null;

  const isAccepted = plan.status === 'Accepted';
  const isRejected = plan.status === 'Rejected';
  const isCompleted = plan.status === 'Completed';

  const handleAcceptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedByName.trim()) return;

    setIsSubmittingAcceptance(true);
    try {
      await recordTreatmentPlanAcceptance(plan.id, {
        versionNumber: plan.currentVersion || 1,
        patientAcceptedByName: acceptedByName.trim(),
        acceptanceMethod,
        isStaffRecorded: acceptanceMethod === 'STAFF_RECORDED',
        notes: acceptanceNotes.trim(),
      });
      setShowAcceptModal(false);
    } finally {
      setIsSubmittingAcceptance(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) return;

    setIsSubmittingRejection(true);
    try {
      await recordTreatmentPlanRejection(plan.id, {
        rejectionReason: rejectionReason.trim(),
      });
      setShowRejectModal(false);
    } finally {
      setIsSubmittingRejection(false);
    }
  };

  const handleItemStatusChange = async (
    itemId: string,
    newStatus: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'DEFERRED' | 'CANCELLED'
  ) => {
    await updateTreatmentPlanItemStatus(plan.id, itemId, newStatus);
  };

  const getStatusClass = (status: TreatmentPlanRecord['status']) => {
    switch (status) {
      case 'Accepted':
        return 'tp-status-accepted';
      case 'In Progress':
        return 'tp-status-in-progress';
      case 'Completed':
        return 'tp-status-completed';
      case 'Pending':
        return 'tp-status-pending';
      case 'Rejected':
        return 'tp-status-rejected';
      case 'Proposed':
      default:
        return 'tp-status-proposed';
    }
  };

  return (
    <div className="tp-modal-overlay">
      <div className="tp-modal-dialog tp-modal-dialog-xl" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="tp-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className={`tp-status-badge ${getStatusClass(plan.status)}`}>
              {plan.status}
            </span>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                {plan.planNumber || plan.id} — {plan.title || plan.procedure}
              </h2>
              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted, #64748b)' }}>
                Patient: <strong>{plan.patient ? `${plan.patient.firstName} ${plan.patient.lastName}` : plan.patientId}</strong> • Doctor: {plan.doctor} • Date: {plan.date} • Rev: v{plan.currentVersion || 1}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={onPrint}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid var(--line, #cbd5e1)',
                background: 'var(--surface, #ffffff)',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Printer size={15} /> Print Estimate
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted, #64748b)',
                padding: '6px',
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Acceptance Notice Banner */}
        {isAccepted && (
          <div
            style={{
              background: 'rgba(37, 99, 235, 0.08)',
              borderBottom: '1px solid rgba(37, 99, 235, 0.2)',
              padding: '10px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '13px',
              color: '#1d4ed8',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} />
              <span>
                <strong>Accepted (Estimate v{plan.acceptedVersion || plan.currentVersion || 1}):</strong> Agreed by{' '}
                <strong>{plan.patientAcceptedByName}</strong> on{' '}
                {plan.patientAcceptedAt ? new Date(plan.patientAcceptedAt).toLocaleDateString() : plan.date}.
              </span>
            </div>
            {plan.isStaffRecorded && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  background: 'rgba(37, 99, 235, 0.15)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                }}
              >
                Staff Recorded (Chairside)
              </span>
            )}
          </div>
        )}

        {/* Overall Progress Tracker */}
        <div
          style={{
            padding: '12px 24px',
            background: 'var(--surface-hover, #f8fafc)',
            borderBottom: '1px solid var(--line, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 320px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: '150px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--text-muted, #64748b)',
                  textTransform: 'uppercase',
                }}
              >
                Treatment Progress
              </span>
              <strong style={{ fontSize: '13px', color: 'var(--text-main, #0f172a)' }}>
                {completedItems} of {totalItems} completed ({progressPct}%)
              </strong>
            </div>
            <div
              style={{
                flex: 1,
                height: '8px',
                background: 'var(--line, #e2e8f0)',
                borderRadius: '9999px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progressPct}%`,
                  background: progressPct === 100 ? '#059669' : 'var(--tp-teal, #008891)',
                  borderRadius: '9999px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '12px',
              color: 'var(--text-muted, #64748b)',
            }}
          >
            {inProgressItems > 0 && (
              <span style={{ color: '#0284c7' }}>
                <strong>{inProgressItems}</strong> in progress
              </span>
            )}
            {deferredItems > 0 && (
              <span style={{ color: '#d97706' }}>
                <strong>{deferredItems}</strong> deferred
              </span>
            )}
            {cancelledItems > 0 && (
              <span style={{ color: '#64748b' }}>
                <strong>{cancelledItems}</strong> cancelled
              </span>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--line, #e2e8f0)', padding: '0 24px', background: 'var(--surface, #ffffff)' }}>
          <button
            type="button"
            onClick={() => setActiveTab('stages')}
            style={{
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'stages' ? '2px solid var(--tp-teal)' : '2px solid transparent',
              color: activeTab === 'stages' ? 'var(--tp-teal)' : 'var(--text-muted, #64748b)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <FileText size={15} /> Clinical Stages & Procedures ({plan.stages?.length || 1})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{
              padding: '12px 16px',
              fontSize: '13px',
              fontWeight: 600,
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'history' ? '2px solid var(--tp-teal)' : '2px solid transparent',
              color: activeTab === 'history' ? 'var(--tp-teal)' : 'var(--text-muted, #64748b)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <History size={15} /> Estimate Version Revisions ({plan.estimateRevisions?.length || 1})
          </button>
        </div>

        {/* Modal Body */}
        <div className="tp-modal-body">
          {activeTab === 'stages' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {((plan.stages && plan.stages.length > 0 ? plan.stages : [
                {
                  id: 'stage-default',
                  treatmentPlanId: plan.id,
                  stageNumber: 1,
                  name: 'Primary Treatment Plan',
                  status: 'PLANNED' as const,
                  targetDate: undefined,
                  estimatedCost: plan.cost,
                  items: [
                    {
                      id: 'item-default',
                      stageId: 'stage-default',
                      procedureCode: undefined,
                      procedureName: plan.procedure,
                      category: plan.category,
                      toothNumber: plan.toothNumber,
                      surface: undefined,
                      quantity: 1,
                      unitFee: plan.cost,
                      discount: 0,
                      netFee: plan.cost,
                      status: 'PENDING' as const,
                    },
                  ],
                },
              ]) as TreatmentPlanStageRecord[]).map((stage, sIdx) => {
                const stageItems = stage.items || [];
                const stageCompleted = stageItems.filter((i) => i.status === 'COMPLETED').length;
                const stageActive = stageItems.filter((i) => i.status !== 'CANCELLED').length;

                return (
                  <div key={stage.id || sIdx} className="tp-stage-card">
                    <div className="tp-stage-header">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: 'var(--tp-teal)',
                            color: '#ffffff',
                          }}
                        >
                          STAGE {stage.stageNumber}
                        </span>
                        <strong style={{ fontSize: '14px' }}>{stage.name}</strong>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background:
                              stageCompleted === stageActive && stageActive > 0
                                ? 'rgba(5, 150, 105, 0.12)'
                                : 'var(--surface-hover, #f1f5f9)',
                            color:
                              stageCompleted === stageActive && stageActive > 0
                                ? '#059669'
                                : 'var(--text-muted, #64748b)',
                          }}
                        >
                          {stageCompleted}/{stageActive} completed
                        </span>
                        {stage.targetDate && (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={13} /> Target: {stage.targetDate}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--tp-teal)' }}>
                        ₹{stage.estimatedCost?.toLocaleString()}
                      </span>
                    </div>

                  <table className="tp-stage-items-table">
                    <thead>
                      <tr>
                        <th>Procedure</th>
                        <th>Tooth / Surface</th>
                        <th>Qty</th>
                        <th>Unit Fee</th>
                        <th>Discount</th>
                        <th>Net Estimate</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stage.items.map((item: TreatmentPlanItemRecord) => (
                        <tr key={item.id}>
                          <td>
                            <strong style={{ display: 'block', fontSize: '13px' }}>
                              {item.procedureName}
                            </strong>
                            <small style={{ color: 'var(--text-muted, #64748b)', fontSize: '11.5px' }}>
                              {item.procedureCode ? `${item.procedureCode} • ` : ''}
                              {item.category}
                            </small>
                          </td>
                          <td>
                            {item.toothNumber ? (
                              <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                #{item.toothNumber}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted, #94a3b8)' }}>General</span>
                            )}
                            {item.surface && (
                              <span
                                style={{
                                  marginLeft: '6px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  background: 'var(--surface-hover, #f1f5f9)',
                                  padding: '1px 6px',
                                  borderRadius: '3px',
                                  border: '1px solid var(--line, #cbd5e1)',
                                }}
                              >
                                {item.surface}
                              </span>
                            )}
                          </td>
                          <td>{item.quantity}</td>
                          <td>₹{item.unitFee?.toLocaleString()}</td>
                          <td style={{ color: item.discount > 0 ? '#059669' : 'inherit' }}>
                            {item.discount > 0 ? `-₹${item.discount?.toLocaleString()}` : '—'}
                          </td>
                          <td style={{ fontWeight: 700 }}>₹{item.netFee?.toLocaleString()}</td>
                          <td>
                            <select
                              value={item.status || 'PENDING'}
                              onChange={(e) =>
                                handleItemStatusChange(item.id, e.target.value as any)
                              }
                              style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                border: '1px solid var(--line, #cbd5e1)',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                background:
                                  item.status === 'COMPLETED'
                                    ? 'rgba(16, 185, 129, 0.1)'
                                    : item.status === 'IN_PROGRESS'
                                    ? 'rgba(14, 165, 233, 0.1)'
                                    : 'var(--surface, #ffffff)',
                                color:
                                  item.status === 'COMPLETED'
                                    ? '#059669'
                                    : item.status === 'IN_PROGRESS'
                                    ? '#0ea5e9'
                                    : 'var(--text-main, #0f172a)',
                              }}
                            >
                              <option value="PENDING">Pending</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="COMPLETED">Completed</option>
                              <option value="DEFERRED">Deferred</option>
                              <option value="CANCELLED">Cancelled</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}

              {/* Cost Summary Box */}
              <div className="tp-estimate-summary-box">
                <div className="tp-estimate-row">
                  <span>Gross Subtotal:</span>
                  <span>₹{(plan.subtotal || plan.cost).toLocaleString()}</span>
                </div>
                {plan.discount ? (
                  <div className="tp-estimate-row">
                    <span>Discount:</span>
                    <span style={{ color: '#059669' }}>-₹{plan.discount?.toLocaleString()}</span>
                  </div>
                ) : null}
                {plan.tax ? (
                  <div className="tp-estimate-row">
                    <span>Tax / GST:</span>
                    <span>₹{plan.tax?.toLocaleString()}</span>
                  </div>
                ) : null}
                <div className="tp-estimate-row total">
                  <span>Total Estimated Treatment Cost:</span>
                  <span style={{ color: 'var(--tp-teal)' }}>
                    ₹{(plan.totalEstimatedCost || plan.cost).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Estimate Version Revisions Tab */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(plan.estimateRevisions && plan.estimateRevisions.length > 0
                ? plan.estimateRevisions
                : [
                    {
                      id: 'rev-init',
                      versionNumber: 1,
                      revisionReason: 'Initial proposal',
                      totalEstimatedCost: plan.cost,
                      status: plan.status.toUpperCase(),
                      createdAt: plan.date,
                      createdByName: plan.doctor,
                    },
                  ]
              ).map((rev) => (
                <div
                  key={rev.id || rev.versionNumber}
                  style={{
                    padding: '14px 18px',
                    borderRadius: '10px',
                    border: '1px solid var(--line, #e2e8f0)',
                    background: 'var(--surface, #ffffff)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: 'var(--surface-hover, #f1f5f9)',
                          border: '1px solid var(--line, #cbd5e1)',
                        }}
                      >
                        VERSION {rev.versionNumber}
                      </span>
                      <strong style={{ fontSize: '13.5px' }}>{rev.revisionReason || 'Estimate revision'}</strong>
                      <span
                        className={`tp-status-badge ${
                          rev.status === 'ACCEPTED' ? 'tp-status-accepted' : 'tp-status-proposed'
                        }`}
                        style={{ fontSize: '10.5px' }}
                      >
                        {rev.status}
                      </span>
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                      Proposed by {rev.createdByName || 'Attending Doctor'} on{' '}
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <strong style={{ fontSize: '15px', color: 'var(--tp-teal)' }}>
                    ₹{rev.totalEstimatedCost?.toLocaleString()}
                  </strong>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer with Actions */}
        <div className="tp-modal-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748b)' }}>
              Total: <strong>₹{(plan.totalEstimatedCost || plan.cost).toLocaleString()}</strong>
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {!isAccepted && !isCompleted && !isRejected && (
              <>
                <button
                  type="button"
                  onClick={() => setShowRejectModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(220, 38, 38, 0.3)',
                    background: 'rgba(220, 38, 38, 0.05)',
                    color: '#dc2626',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <ThumbsDown size={14} /> Decline / Reject
                </button>
                <button
                  type="button"
                  onClick={() => setShowAcceptModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'var(--tp-accepted)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <ThumbsUp size={14} /> Record Patient Acceptance
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid var(--line, #cbd5e1)',
                background: 'var(--surface, #ffffff)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        </div>

        {/* Child Dialog: Record Patient Acceptance */}
        {showAcceptModal && (
          <div className="tp-modal-overlay" style={{ zIndex: 10000 }}>
            <div className="tp-modal-dialog" style={{ maxWidth: '520px' }}>
              <div className="tp-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserCheck size={18} color="var(--tp-accepted)" />
                  <strong style={{ fontSize: '15px' }}>Record Patient Acceptance</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAcceptModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAcceptSubmit}>
                <div className="tp-modal-body">
                  <div
                    style={{
                      padding: '10px 14px',
                      background: 'rgba(37, 99, 235, 0.08)',
                      borderRadius: '8px',
                      fontSize: '12.5px',
                      color: '#1d4ed8',
                    }}
                  >
                    Accepting will confirm <strong>Estimate v{plan.currentVersion || 1}</strong> (Total: ₹
                    {(plan.totalEstimatedCost || plan.cost).toLocaleString()}).
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                      Accepting Patient / Legal Guardian Name <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={acceptedByName}
                      onChange={(e) => setAcceptedByName(e.target.value)}
                      placeholder="Full name of consenting patient or guardian"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--line, #cbd5e1)',
                        fontSize: '13.5px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                      Consent / Acceptance Method
                    </label>
                    <select
                      value={acceptanceMethod}
                      onChange={(e) => setAcceptanceMethod(e.target.value as any)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--line, #cbd5e1)',
                        fontSize: '13.5px',
                      }}
                    >
                      <option value="STAFF_RECORDED">Staff-Recorded (Chairside Verbal Consent)</option>
                      <option value="WRITTEN_CONSENT">Written Consent (Physical Signed Copy on File)</option>
                      <option value="DIGITAL_SIGNATURE">Digital Signature Form</option>
                      <option value="PATIENT_PORTAL">Patient Portal Approval</option>
                    </select>
                    {acceptanceMethod === 'STAFF_RECORDED' && (
                      <small style={{ color: 'var(--text-muted, #64748b)', display: 'block', marginTop: '4px' }}>
                        Note: Staff-recorded acceptance will be documented as an operatory verbal agreement, not a verified digital signature.
                      </small>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                      Consent Notes
                    </label>
                    <textarea
                      rows={2}
                      value={acceptanceNotes}
                      onChange={(e) => setAcceptanceNotes(e.target.value)}
                      placeholder="e.g. Patient accepted Stage 1 immediately, agreed to pay per stage."
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--line, #cbd5e1)',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                </div>

                <div className="tp-modal-footer">
                  <button
                    type="button"
                    onClick={() => setShowAcceptModal(false)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid var(--line, #cbd5e1)',
                      background: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingAcceptance}
                    style={{
                      padding: '8px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'var(--tp-accepted)',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {isSubmittingAcceptance ? 'Confirming...' : 'Confirm Acceptance'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Child Dialog: Record Rejection */}
        {showRejectModal && (
          <div className="tp-modal-overlay" style={{ zIndex: 10000 }}>
            <div className="tp-modal-dialog" style={{ maxWidth: '480px' }}>
              <div className="tp-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={18} color="#dc2626" />
                  <strong style={{ fontSize: '15px' }}>Decline Treatment Plan</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleRejectSubmit}>
                <div className="tp-modal-body">
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                      Reason for Declining <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="e.g. Financial constraints, seeking second opinion, patient deferred elective procedures..."
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--line, #cbd5e1)',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                </div>

                <div className="tp-modal-footer">
                  <button
                    type="button"
                    onClick={() => setShowRejectModal(false)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid var(--line, #cbd5e1)',
                      background: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingRejection}
                    style={{
                      padding: '8px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#dc2626',
                      color: '#ffffff',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {isSubmittingRejection ? 'Saving...' : 'Decline Plan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
