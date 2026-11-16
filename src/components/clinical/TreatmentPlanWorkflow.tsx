import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { billingApi, type BackendInvoice } from '@/services/billingApi';
import { canCreateInvoices } from '@/services/billingPermissions';
import { getCurrentUser } from '@/services/authService';
import {
  cacheBackendInvoice, cancelTreatmentPlan, isDemoSession, useClinicData,
  type TreatmentPlanRecord, type TreatmentPlanItemRecord,
} from '@/services/clinicStore';
import { TreatmentPlanModal } from './TreatmentPlanModal';
import { TreatmentMaterialUsageModal } from '@/components/inventory/TreatmentMaterialUsageModal';

export function TreatmentPlanContext({ plan, tab }: { plan: TreatmentPlanRecord; tab: 'clinical' | 'audit' }) {
  const { clinicalNotes, prescriptions, patients } = useClinicData();
  const patient = patients.find(p => p.id === plan.patientId || p.backendId === plan.patientId);
  const matchesPatient = (id: string) => id === plan.patientId || id === patient?.id || id === patient?.backendId;
  if (tab === 'clinical') {
    const notes = clinicalNotes.filter(n => matchesPatient(n.patientId));
    const rx = prescriptions.filter(p => matchesPatient(p.patientId));
    return <div className="tp-workflow">
      <h3>Clinical Examination &amp; Operatory Notes</h3>
      <p>Patient records for clinical context; these may include other visits.</p>
      {notes.length ? notes.map(n => <article key={n.id}><strong>{n.noteNumber || n.id}</strong><p>{n.chiefComplaint || n.complaint}</p><p>{n.primaryDiagnosis || n.findings}</p></article>) : <p>No clinical notes recorded.</p>}
      <h3>Associated Digital Prescriptions</h3>
      {rx.length ? rx.map(p => <article key={p.id}><strong>{p.prescriptionNumber} · {p.status}</strong><p>{p.diagnosis}</p><ul>{p.items.map(i => <li key={i.id || i.medicineName}>{i.medicineName} · {i.dosage} · {i.frequency}</li>)}</ul></article>) : <p>No prescriptions recorded.</p>}
    </div>;
  }
  const events = plan.history?.length ? plan.history : [{ id: `${plan.id}-created`, action: 'CREATED', createdAt: plan.date, userName: plan.doctor }];
  return <div className="tp-workflow"><h3>Audit Timeline</h3><ol>
    {[...events].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).map(e => <li key={e.id}>
      <strong>{e.action === 'CREATED' ? 'Treatment Plan Created' : e.action.replace(/_/g, ' ')}</strong>
      <p>{e.action} · {new Date(e.createdAt).toLocaleString()} · {e.userName || 'Staff'}</p>
    </li>)}
  </ol></div>;
}

export function TreatmentPlanWorkflow({ plan, completedItem, onDismissPrompt }: {
  plan: TreatmentPlanRecord; completedItem: TreatmentPlanItemRecord | null; onDismissPrompt: () => void;
}) {
  const { invoices, patients } = useClinicData();
  const [editing, setEditing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [billing, setBilling] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [generated, setGenerated] = useState<BackendInvoice | null>(null);
  const [usage, setUsage] = useState(false);
  const user = getCurrentUser();
  const role = user?.role || (isDemoSession() ? 'ORGANIZATION_ADMIN' : '');
  const canPlan = ['DOCTOR', 'ORGANIZATION_ADMIN', 'BRANCH_ADMIN'].includes(role);
  const canBill = canCreateInvoices(role);
  const closed = plan.status === 'Cancelled' || plan.status === 'Rejected';
  const editable = canPlan && !closed && plan.status !== 'Completed';
  const planIds = new Set([plan.id, plan.backendId].filter(Boolean));
  const billedItems = new Set(invoices.filter(i => i.status !== 'Void').flatMap(i => (i.items || []).map(it => it.treatmentPlanItemId).filter(Boolean)));
  const eligible = (plan.stages || []).flatMap(s => s.items || []).filter(i => i.status !== 'CANCELLED' && i.status !== 'DEFERRED' && !billedItems.has(i.id));
  const estimated = plan.totalEstimatedCost ?? plan.cost;
  const invoiced = invoices.filter(i => i.status !== 'Void' && i.treatmentPlanId && planIds.has(i.treatmentPlanId))
    .reduce((sum, i) => sum + i.amount, 0);
  const selection = eligible.filter(i => selectedIds.includes(i.id));
  const selectedTotal = selection.reduce((sum, i) => sum + i.netFee, 0);
  const patient = patients.find(p => p.id === plan.patientId || p.backendId === plan.patientId);

  const submitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !selection.length || !canBill) return;
    setBusy(true); setError('');
    try {
      const invoice = await billingApi.createInvoiceFromTreatmentPlan({
        treatmentPlanId: plan.backendId || plan.id, itemIds: selection.map(i => i.id), issueImmediately: true, notes: notes.trim(),
      });
      cacheBackendInvoice(invoice);
      setGenerated(invoice); setBilling(false);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not generate invoice. Please retry.'); }
    finally { setBusy(false); }
  };
  const submitCancellation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || busy || !canPlan) return;
    setBusy(true); setError('');
    try { await cancelTreatmentPlan(plan.id, reason.trim()); setCancelling(false); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not cancel plan.'); }
    finally { setBusy(false); }
  };

  return <section className="tp-workflow" aria-label="Treatment plan actions and billing">
    <div className="tp-workflow-summary">
      <span>Total Estimated <strong>₹{estimated.toLocaleString()}</strong></span>
      <span>Invoiced to Date <strong>₹{invoiced.toLocaleString()}</strong></span>
      <span>Unbilled Balance <strong>₹{Math.max(0, estimated - invoiced).toLocaleString()}</strong></span>
    </div>
    <p>Billing Status: {invoiced === 0 ? 'Unbilled' : invoiced >= estimated ? 'Fully billed' : 'Partially billed'}</p>
    <div className="tp-workflow-actions">
      {editable && <><button type="button" data-testid="edit-treatment-plan-btn" onClick={() => setEditing(true)}>Edit Plan</button>
        <button type="button" data-testid="cancel-treatment-plan-btn" onClick={() => { setError(''); setCancelling(true); }}>Cancel Plan</button></>}
      {canBill && !closed && <button type="button" data-testid="bill-treatment-plan-btn" disabled={!eligible.length || busy} onClick={() => {
        setError(''); setSelectedIds(eligible.map(i => i.id)); setBilling(true);
      }}>Bill Procedures / Generate Invoice</button>}
    </div>
    {error && <p role="alert">{error}</p>}
    {generated && <div role="status"><strong>Invoice Generated Successfully!</strong><p>{generated.invoiceNumber}</p>
      <Link to={`/billing/invoices?open=${encodeURIComponent(generated.invoiceNumber || generated.id)}`}>Open in Billing</Link>
    </div>}
    {canPlan && completedItem && !usage && <div role="status"><p>{completedItem.procedureName} marked as Completed. Record material consumption now?</p>
      <button type="button" data-testid="record-material-usage-prompt-btn" onClick={() => setUsage(true)}>Record material usage</button>
      <button type="button" onClick={onDismissPrompt}>Later</button>
    </div>}
    {editing && <TreatmentPlanModal isOpen onClose={() => setEditing(false)} planToEdit={plan} lockedPatientId={plan.patientId} onSuccess={() => setEditing(false)} />}
    {cancelling && <div className="tp-modal-overlay"><form className="tp-modal-dialog tp-workflow-dialog" role="dialog" aria-label="Cancel treatment plan" onSubmit={submitCancellation}>
      <h3>Are you sure you want to cancel this treatment plan?</h3>
      <label>Cancellation reason<textarea required value={reason} onChange={e => setReason(e.target.value)} placeholder="Patient opted out / Financial hardship" /></label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" data-testid="confirm-cancel-treatment-plan-btn" disabled={busy || !reason.trim()}>{busy ? 'Cancelling...' : 'Confirm cancellation'}</button>
      <button type="button" disabled={busy} onClick={() => { setCancelling(false); setError(''); }}>Keep plan</button>
    </form></div>}
    {billing && <div className="tp-modal-overlay"><form className="tp-modal-dialog tp-workflow-dialog" role="dialog" aria-label="Generate treatment invoice" onSubmit={submitInvoice}>
      <h3>Generate Invoice / Bill Procedures</h3><p>Eligible Procedures ({eligible.length} unbilled)</p>
      {eligible.map(i => <label key={i.id}><input type="checkbox" checked={selectedIds.includes(i.id)} disabled={busy} onChange={e => setSelectedIds(ids => e.target.checked ? [...ids, i.id] : ids.filter(id => id !== i.id))} />{i.procedureName} · ₹{i.netFee.toLocaleString()}</label>)}
      <p>Selected Procedures: {selection.length} · Estimated ₹{selectedTotal.toLocaleString()}</p>
      <p>The issued invoice uses the server's final calculation.</p>
      <label>Billing notes<textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Stage 1 procedures billed as per consultation agreement" disabled={busy} /></label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" data-testid="confirm-generate-invoice-btn" disabled={busy || !selection.length}>{busy ? 'Generating...' : 'Generate invoice'}</button>
      <button type="button" disabled={busy} onClick={() => { setBilling(false); setError(''); }}>Close billing</button>
    </form></div>}
    {usage && completedItem && <TreatmentMaterialUsageModal isOpen onClose={() => { setUsage(false); onDismissPrompt(); }}
      treatmentId={plan.backendId || plan.id} patientId={patient?.backendId || plan.patientId}
      patientName={patient ? `${patient.firstName} ${patient.lastName}` : plan.patientId}
      doctorId={plan.doctorId || user?.id || ''} doctorName={plan.doctor}
      procedureId={completedItem.procedureCode || completedItem.id} procedureName={completedItem.procedureName}
      onConfirmed={() => { setUsage(false); onDismissPrompt(); }} />}
  </section>;
}
