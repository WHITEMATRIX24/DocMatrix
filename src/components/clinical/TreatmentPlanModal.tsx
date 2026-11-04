import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  AlertTriangle,
  Stethoscope,
  Calculator,
  Calendar,
  Lock,
  ChevronDown,
} from 'lucide-react';
import {
  useClinicData,
  createStructuredTreatmentPlan,
  type PatientRecord,
} from '../../services/clinicStore';
import '../../pages/clinical/treatmentPlans.css';

// Master ADA / CDT procedures catalogue
const STANDARD_PROCEDURES = [
  { code: 'D0120', name: 'Periodic Oral Evaluation', category: 'Diagnostic', fee: 500 },
  { code: 'D0150', name: 'Comprehensive Oral Evaluation', category: 'Diagnostic', fee: 800 },
  { code: 'D0210', name: 'Complete Intraoral Radiograph Series', category: 'Diagnostic', fee: 1200 },
  { code: 'D1110', name: 'Adult Dental Prophylaxis / Scaling', category: 'Preventive', fee: 1500 },
  { code: 'D1206', name: 'Topical Fluoride Varnish Application', category: 'Preventive', fee: 600 },
  { code: 'D2330', name: 'Resin-based Composite (1 Surface)', category: 'Restorative', fee: 1800 },
  { code: 'D2331', name: 'Resin-based Composite (2 Surfaces)', category: 'Restorative', fee: 2400 },
  { code: 'D2332', name: 'Resin-based Composite (3 Surfaces)', category: 'Restorative', fee: 3200 },
  { code: 'D3310', name: 'Root Canal Therapy - Anterior Tooth', category: 'Endodontics', fee: 4500 },
  { code: 'D3320', name: 'Root Canal Therapy - Premolar', category: 'Endodontics', fee: 5500 },
  { code: 'D3330', name: 'Root Canal Therapy - Molar', category: 'Endodontics', fee: 6500 },
  { code: 'D2740', name: 'Crown - Porcelain / Ceramic Substrate', category: 'Prosthodontics', fee: 8500 },
  { code: 'D2750', name: 'Crown - Porcelain Fused to High Noble Metal', category: 'Prosthodontics', fee: 7500 },
  { code: 'D2790', name: 'Crown - Full Cast High Noble Metal', category: 'Prosthodontics', fee: 9000 },
  { code: 'D7140', name: 'Extraction, Erupted Tooth / Exposed Root', category: 'Oral Surgery', fee: 1200 },
  { code: 'D7210', name: 'Surgical Extraction, Erupted Tooth', category: 'Oral Surgery', fee: 2500 },
  { code: 'D7240', name: 'Removal of Impacted Tooth - Complete Bony', category: 'Oral Surgery', fee: 5000 },
  { code: 'D6010', name: 'Surgical Placement of Implant Body', category: 'Implantology', fee: 25000 },
];

// FDI Permanent teeth
const FDI_TEETH = [
  // Upper Right
  '18', '17', '16', '15', '14', '13', '12', '11',
  // Upper Left
  '21', '22', '23', '24', '25', '26', '27', '28',
  // Lower Left
  '38', '37', '36', '35', '34', '33', '32', '31',
  // Lower Right
  '41', '42', '43', '44', '45', '46', '47', '48',
];

const SURFACES = ['M', 'O', 'D', 'B', 'L', 'I'];

interface ItemFormState {
  procedureCode?: string;
  procedureName: string;
  category: string;
  toothNumber: string;
  surface: string;
  quantity: number;
  unitFee: number;
  discount: number;
  notes: string;
}

interface StageFormState {
  stageNumber: number;
  name: string;
  targetDate: string;
  items: ItemFormState[];
}

interface TreatmentPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  lockedPatientId?: string; // If opened from patient profile
  onSuccess?: (planNumber: string) => void;
}

export const TreatmentPlanModal: React.FC<TreatmentPlanModalProps> = ({
  isOpen,
  onClose,
  lockedPatientId,
  onSuccess,
}) => {
  const { patients = [] } = useClinicData();

  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    lockedPatientId || (patients[0]?.id || '')
  );
  const [title, setTitle] = useState('Comprehensive Dental Treatment Plan');
  const [notes, setNotes] = useState('');
  const [taxRate, setTaxRate] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Initial stage state with 1 stage and 1 procedure
  const [stages, setStages] = useState<StageFormState[]>([
    {
      stageNumber: 1,
      name: 'Stage 1: Urgent Relief & Primary Restoration',
      targetDate: '',
      items: [
        {
          procedureCode: 'D3330',
          procedureName: 'Root Canal Therapy - Molar',
          category: 'Endodontics',
          toothNumber: '16',
          surface: 'O',
          quantity: 1,
          unitFee: 6500,
          discount: 0,
          notes: '',
        },
      ],
    },
  ]);

  const selectedPatient = useMemo(() => {
    return (patients as PatientRecord[]).find(
      (p) => p.id.toLowerCase() === selectedPatientId.toLowerCase()
    );
  }, [patients, selectedPatientId]);

  const hasAllergies = useMemo(() => {
    if (!selectedPatient) return false;
    const anyPat = selectedPatient as any;
    return (
      selectedPatient.allergies === 'yes' ||
      (Array.isArray(anyPat.medicalSafetyAlerts) && anyPat.medicalSafetyAlerts.length > 0)
    );
  }, [selectedPatient]);

  // Live Calculations
  const calculations = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;

    const stagesBreakdown = stages.map((st) => {
      let stageCost = 0;
      st.items.forEach((it) => {
        const qty = it.quantity > 0 ? it.quantity : 1;
        const gross = (it.unitFee || 0) * qty;
        const net = Math.max(0, gross - (it.discount || 0));
        stageCost += net;
        totalDiscount += it.discount || 0;
      });
      subtotal += stageCost;
      return { stageNumber: st.stageNumber, cost: stageCost };
    });

    const tax = Math.round(subtotal * (taxRate / 100));
    const total = subtotal + tax;

    return {
      stagesBreakdown,
      subtotal,
      totalDiscount,
      tax,
      total,
    };
  }, [stages, taxRate]);

  if (!isOpen) return null;

  // Stage Management
  const addStage = () => {
    const nextNum = stages.length + 1;
    setStages([
      ...stages,
      {
        stageNumber: nextNum,
        name: `Stage ${nextNum}: Phase ${nextNum} Care`,
        targetDate: '',
        items: [
          {
            procedureCode: 'D2330',
            procedureName: 'Resin-based Composite (1 Surface)',
            category: 'Restorative',
            toothNumber: '',
            surface: 'O',
            quantity: 1,
            unitFee: 1800,
            discount: 0,
            notes: '',
          },
        ],
      },
    ]);
  };

  const removeStage = (stageIdx: number) => {
    if (stages.length <= 1) return;
    const updated = stages
      .filter((_, idx) => idx !== stageIdx)
      .map((st, idx) => ({ ...st, stageNumber: idx + 1 }));
    setStages(updated);
  };

  const updateStageName = (stageIdx: number, newName: string) => {
    const updated = [...stages];
    updated[stageIdx].name = newName;
    setStages(updated);
  };

  const updateStageTargetDate = (stageIdx: number, dateStr: string) => {
    const updated = [...stages];
    updated[stageIdx].targetDate = dateStr;
    setStages(updated);
  };

  // Item Management
  const addItemToStage = (stageIdx: number) => {
    const updated = [...stages];
    updated[stageIdx].items.push({
      procedureCode: '',
      procedureName: '',
      category: 'General',
      toothNumber: '',
      surface: '',
      quantity: 1,
      unitFee: 0,
      discount: 0,
      notes: '',
    });
    setStages(updated);
  };

  const removeItemFromStage = (stageIdx: number, itemIdx: number) => {
    const updated = [...stages];
    if (updated[stageIdx].items.length <= 1) return;
    updated[stageIdx].items = updated[stageIdx].items.filter((_, idx) => idx !== itemIdx);
    setStages(updated);
  };

  const handleProcedureSelect = (stageIdx: number, itemIdx: number, procCode: string) => {
    const found = STANDARD_PROCEDURES.find((p) => p.code === procCode);
    const updated = [...stages];
    if (found) {
      updated[stageIdx].items[itemIdx].procedureCode = found.code;
      updated[stageIdx].items[itemIdx].procedureName = found.name;
      updated[stageIdx].items[itemIdx].category = found.category;
      updated[stageIdx].items[itemIdx].unitFee = found.fee;
    } else {
      updated[stageIdx].items[itemIdx].procedureCode = '';
    }
    setStages(updated);
  };

  const updateItemField = (
    stageIdx: number,
    itemIdx: number,
    field: keyof ItemFormState,
    value: any
  ) => {
    const updated = [...stages];
    (updated[stageIdx].items[itemIdx] as any)[field] = value;
    setStages(updated);
  };

  const handleToothToggle = (stageIdx: number, itemIdx: number, tooth: string) => {
    const current = stages[stageIdx].items[itemIdx].toothNumber || '';
    const teeth = current
      .split(/[,;\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    let nextTeeth: string[];
    if (teeth.includes(tooth)) {
      nextTeeth = teeth.filter((t) => t !== tooth);
    } else {
      nextTeeth = [...teeth, tooth];
    }
    updateItemField(stageIdx, itemIdx, 'toothNumber', nextTeeth.join(', '));
  };

  const handleSurfaceToggle = (stageIdx: number, itemIdx: number, surfaceChar: string) => {
    const current = (stages[stageIdx].items[itemIdx].surface || '').toUpperCase();
    let nextSurface = '';
    if (current.includes(surfaceChar)) {
      nextSurface = current.replace(surfaceChar, '');
    } else {
      nextSurface = `${current}${surfaceChar}`;
    }
    updateItemField(stageIdx, itemIdx, 'surface', nextSurface);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedPatientId) {
      setErrorMsg('Please select a valid patient.');
      return;
    }

    if (!title.trim()) {
      setErrorMsg('Treatment plan title is required.');
      return;
    }

    // Validate that every item has a name and fee
    for (const [sIdx, stage] of stages.entries()) {
      if (stage.items.length === 0) {
        setErrorMsg(`Stage ${sIdx + 1} must contain at least one dental procedure.`);
        return;
      }
      for (const [iIdx, item] of stage.items.entries()) {
        if (!item.procedureName.trim()) {
          setErrorMsg(`Please specify a procedure name for item #${iIdx + 1} in Stage ${sIdx + 1}.`);
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      const created = await createStructuredTreatmentPlan({
        patientId: selectedPatientId,
        title: title.trim(),
        notes: notes.trim(),
        taxRate,
        stages: stages.map((st) => ({
          stageNumber: st.stageNumber,
          name: st.name.trim(),
          targetDate: st.targetDate || undefined,
          items: st.items.map((it) => ({
            procedureCode: it.procedureCode,
            procedureName: it.procedureName.trim(),
            category: it.category.trim() || 'General',
            toothNumber: it.toothNumber.trim() || undefined,
            surface: it.surface.trim() || undefined,
            quantity: Number(it.quantity) || 1,
            unitFee: Number(it.unitFee) || 0,
            discount: Number(it.discount) || 0,
            notes: it.notes.trim() || undefined,
          })),
        })),
      });

      if (onSuccess) {
        onSuccess(created.planNumber || created.id);
      }
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create treatment plan. Please check inputs.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="tp-modal-overlay">
      <div className="tp-modal-dialog tp-modal-dialog-xl" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="tp-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'var(--tp-teal-light)',
                color: 'var(--tp-teal)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Stethoscope size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                Create Dental Treatment Plan
              </h2>
              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted, #64748b)' }}>
                Multi-stage dental procedures, FDI tooth charting, and chairside cost estimates.
              </p>
            </div>
          </div>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
          <div className="tp-modal-body">
            {errorMsg && (
              <div
                style={{
                  background: 'rgba(220, 38, 38, 0.08)',
                  border: '1px solid rgba(220, 38, 38, 0.25)',
                  color: '#b91c1c',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertTriangle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Medical Safety Alert Banner */}
            {hasAllergies && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#dc2626',
                  fontSize: '13px',
                }}
              >
                <AlertTriangle size={18} />
                <div>
                  <strong>Medical Safety Alert:</strong> This patient has recorded clinical allergies/alerts:
                  <span style={{ marginLeft: '6px', fontWeight: 600 }}>
                    {selectedPatient?.allergiesDetails ||
                      ((selectedPatient as any)?.medicalSafetyAlerts || []).join(', ') ||
                      'Allergies reported'}
                  </span>
                </div>
              </div>
            )}

            {/* Top Grid: Patient & Plan Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                  Patient <span style={{ color: '#dc2626' }}>*</span>
                </label>
                {lockedPatientId ? (
                  <div
                    style={{
                      padding: '8px 12px',
                      background: 'var(--surface-hover, #f8fafc)',
                      border: '1px solid var(--line, #e2e8f0)',
                      borderRadius: '8px',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Lock size={14} color="#64748b" />
                    <span>
                      {selectedPatient
                        ? `${selectedPatient.firstName} ${selectedPatient.lastName} (${selectedPatient.id})`
                        : lockedPatientId}
                    </span>
                  </div>
                ) : (
                  <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--line, #cbd5e1)',
                      fontSize: '13.5px',
                      background: 'var(--surface, #ffffff)',
                    }}
                  >
                    {patients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.firstName} {p.lastName} ({p.id})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                  Treatment Plan Title <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Full Mouth Rehabilitation, Crown & Bridge"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--line, #cbd5e1)',
                    fontSize: '13.5px',
                    background: 'var(--surface, #ffffff)',
                  }}
                />
              </div>
            </div>

            {/* Stage Builder */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                  Clinical Treatment Stages ({stages.length})
                </h3>
                <button
                  type="button"
                  onClick={addStage}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    borderRadius: '6px',
                    border: '1px solid var(--tp-teal)',
                    background: 'var(--tp-teal-light)',
                    color: 'var(--tp-teal)',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={14} /> Add Stage
                </button>
              </div>

              {stages.map((stage, stageIdx) => (
                <div key={stageIdx} className="tp-stage-card">
                  {/* Stage Header */}
                  <div className="tp-stage-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
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
                      <input
                        type="text"
                        value={stage.name}
                        onChange={(e) => updateStageName(stageIdx, e.target.value)}
                        placeholder="Stage name e.g. Stage 1: Urgent Relief"
                        style={{
                          flex: 1,
                          maxWidth: '380px',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--line, #cbd5e1)',
                          fontSize: '13px',
                          fontWeight: 600,
                          background: 'var(--surface, #ffffff)',
                        }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={14} color="#64748b" />
                        <input
                          type="date"
                          value={stage.targetDate}
                          onChange={(e) => updateStageTargetDate(stageIdx, e.target.value)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid var(--line, #cbd5e1)',
                            fontSize: '12px',
                            background: 'var(--surface, #ffffff)',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--tp-teal)' }}>
                        Stage Est: ₹{calculations.stagesBreakdown[stageIdx]?.cost?.toLocaleString() || 0}
                      </span>
                      {stages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeStage(stageIdx)}
                          title="Remove stage"
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#dc2626',
                            padding: '4px',
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Stage Items Table */}
                  <div style={{ overflowX: 'auto' }}>
                    <table className="tp-stage-items-table">
                      <thead>
                        <tr>
                          <th style={{ width: '28%' }}>Procedure</th>
                          <th style={{ width: '22%' }}>Tooth / Surfaces</th>
                          <th style={{ width: '10%' }}>Qty</th>
                          <th style={{ width: '14%' }}>Unit Fee (₹)</th>
                          <th style={{ width: '12%' }}>Disc (₹)</th>
                          <th style={{ width: '10%' }}>Net (₹)</th>
                          <th style={{ width: '4%' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {stage.items.map((item, itemIdx) => {
                          const itemQty = item.quantity > 0 ? item.quantity : 1;
                          const netFee = Math.max(0, item.unitFee * itemQty - item.discount);

                          return (
                            <tr key={itemIdx}>
                              <td>
                                <select
                                  value={item.procedureCode || ''}
                                  onChange={(e) =>
                                    handleProcedureSelect(stageIdx, itemIdx, e.target.value)
                                  }
                                  style={{
                                    width: '100%',
                                    padding: '6px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--line, #cbd5e1)',
                                    fontSize: '12px',
                                    marginBottom: '4px',
                                    background: 'var(--surface, #ffffff)',
                                  }}
                                >
                                  <option value="">Select CDT Procedure or Custom...</option>
                                  {STANDARD_PROCEDURES.map((proc) => (
                                    <option key={proc.code} value={proc.code}>
                                      {proc.code} — {proc.name} (₹{proc.fee})
                                    </option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  value={item.procedureName}
                                  onChange={(e) =>
                                    updateItemField(stageIdx, itemIdx, 'procedureName', e.target.value)
                                  }
                                  placeholder="Procedure description"
                                  style={{
                                    width: '100%',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--line, #cbd5e1)',
                                    fontSize: '12px',
                                    background: 'var(--surface, #ffffff)',
                                  }}
                                />
                              </td>

                              <td>
                                {/* Tooth Input with FDI helper */}
                                <input
                                  type="text"
                                  value={item.toothNumber}
                                  onChange={(e) =>
                                    updateItemField(stageIdx, itemIdx, 'toothNumber', e.target.value)
                                  }
                                  placeholder="FDI Tooth e.g. 16, 24"
                                  style={{
                                    width: '100%',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--line, #cbd5e1)',
                                    fontSize: '12px',
                                    fontFamily: 'monospace',
                                    marginBottom: '4px',
                                    background: 'var(--surface, #ffffff)',
                                  }}
                                />
                                {/* Surface Checkbox Pills */}
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                  {SURFACES.map((surf) => {
                                    const isSelected = (item.surface || '').toUpperCase().includes(surf);
                                    return (
                                      <button
                                        key={surf}
                                        type="button"
                                        onClick={() => handleSurfaceToggle(stageIdx, itemIdx, surf)}
                                        style={{
                                          padding: '2px 6px',
                                          borderRadius: '4px',
                                          fontSize: '10.5px',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          background: isSelected ? 'var(--tp-teal)' : 'var(--surface-hover, #f1f5f9)',
                                          color: isSelected ? '#ffffff' : 'var(--text-muted, #64748b)',
                                          border: '1px solid var(--line, #cbd5e1)',
                                        }}
                                      >
                                        {surf}
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>

                              <td>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    updateItemField(stageIdx, itemIdx, 'quantity', parseInt(e.target.value, 10) || 1)
                                  }
                                  style={{
                                    width: '100%',
                                    padding: '4px 6px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--line, #cbd5e1)',
                                    fontSize: '12.5px',
                                    background: 'var(--surface, #ffffff)',
                                  }}
                                />
                              </td>

                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  value={item.unitFee}
                                  onChange={(e) =>
                                    updateItemField(stageIdx, itemIdx, 'unitFee', parseFloat(e.target.value) || 0)
                                  }
                                  style={{
                                    width: '100%',
                                    padding: '4px 6px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--line, #cbd5e1)',
                                    fontSize: '12.5px',
                                    background: 'var(--surface, #ffffff)',
                                  }}
                                />
                              </td>

                              <td>
                                <input
                                  type="number"
                                  min="0"
                                  value={item.discount}
                                  onChange={(e) =>
                                    updateItemField(stageIdx, itemIdx, 'discount', parseFloat(e.target.value) || 0)
                                  }
                                  style={{
                                    width: '100%',
                                    padding: '4px 6px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--line, #cbd5e1)',
                                    fontSize: '12.5px',
                                    background: 'var(--surface, #ffffff)',
                                  }}
                                />
                              </td>

                              <td style={{ fontWeight: 700, fontSize: '13px' }}>
                                ₹{netFee.toLocaleString()}
                              </td>

                              <td>
                                {stage.items.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeItemFromStage(stageIdx, itemIdx)}
                                    title="Delete item"
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      color: '#94a3b8',
                                      padding: '2px',
                                    }}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ padding: '8px 16px', background: 'var(--surface, #ffffff)' }}>
                    <button
                      type="button"
                      onClick={() => addItemToStage(stageIdx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--tp-teal)',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 0',
                      }}
                    >
                      <Plus size={14} /> Add procedure to Stage {stage.stageNumber}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Bottom Row: Clinical Notes & Estimate Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                  Clinical Treatment Notes / Prognosis
                </label>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Discussed treatment risks, material choices, and follow-up sequence with patient..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--line, #cbd5e1)',
                    fontSize: '13px',
                    background: 'var(--surface, #ffffff)',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Estimate Breakdown Card */}
              <div className="tp-estimate-summary-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Calculator size={16} color="var(--tp-teal)" />
                  <strong style={{ fontSize: '14px' }}>Cost Estimation Breakdown</strong>
                </div>

                <div className="tp-estimate-row">
                  <span>Gross Subtotal:</span>
                  <span>₹{calculations.subtotal.toLocaleString()}</span>
                </div>

                <div className="tp-estimate-row">
                  <span>Discounts Applied:</span>
                  <span style={{ color: '#059669' }}>-₹{calculations.totalDiscount.toLocaleString()}</span>
                </div>

                <div className="tp-estimate-row">
                  <span>Tax / GST:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <select
                      value={taxRate}
                      onChange={(e) => setTaxRate(Number(e.target.value))}
                      style={{
                        padding: '2px 6px',
                        borderRadius: '4px',
                        border: '1px solid var(--line, #cbd5e1)',
                        fontSize: '11.5px',
                        background: 'var(--surface, #ffffff)',
                      }}
                    >
                      <option value={0}>0%</option>
                      <option value={5}>5%</option>
                      <option value={12}>12%</option>
                      <option value={18}>18%</option>
                    </select>
                    <span>₹{calculations.tax.toLocaleString()}</span>
                  </div>
                </div>

                <div className="tp-estimate-row total">
                  <span>Total Estimated Cost:</span>
                  <span style={{ color: 'var(--tp-teal)' }}>₹{calculations.total.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="tp-modal-footer">
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748b)' }}>
              Initial estimate will be saved as <strong>PROPOSED (v1)</strong>.
            </span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
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
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--tp-teal)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1,
                }}
              >
                {isSubmitting ? 'Saving Plan...' : 'Save & Propose Treatment Plan'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
