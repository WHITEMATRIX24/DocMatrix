import { browserLocalStorage, browserSessionStorage } from '@/services/browserStorage';
import React from 'react';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { apiClient } from '../src/services/apiClient';
import { billingApi } from '../src/services/billingApi';
import { logout, STORAGE_KEYS } from '../src/services/authService';
import { addTreatmentPlan, createStructuredTreatmentPlan, updateStructuredTreatmentPlan, cancelTreatmentPlan, updateTreatmentPlanItemStatus, getClinicSnapshot, resetStoreForTesting } from '../src/services/clinicStore';
import { TreatmentPlanDetailsModal } from '../src/components/clinical/TreatmentPlanDetailsModal';

async function makePlan() {
  return createStructuredTreatmentPlan({patientId:'pt-1001',title:'Recovery test',stages:[{stageNumber:1,name:'Stage 1',items:[{procedureName:'Restoration',category:'Restorative',quantity:1,unitFee:1000,discount:0}]}]});
}
function authenticate(role='DOCTOR') {
  browserSessionStorage.setItem(STORAGE_KEYS.USER,JSON.stringify({id:'doctor-a',role,clinicId:'clinic-a'}));
  browserSessionStorage.setItem(STORAGE_KEYS.TOKEN,'synthetic-auth-token');
}
describe('Treatment workflow failure recovery', () => {
  beforeEach(() => {browserLocalStorage.clear();browserSessionStorage.clear();resetStoreForTesting();});
  afterEach(() => {cleanup();vi.restoreAllMocks();browserLocalStorage.clear();browserSessionStorage.clear();});

  it('clears credentials immediately while logout revocation is pending', async () => {
    authenticate();
    let finish;
    const post=vi.spyOn(apiClient,'post').mockImplementation(()=> {
      expect(browserSessionStorage.getItem(STORAGE_KEYS.TOKEN)).toBe('synthetic-auth-token');
      return new Promise(resolve=>{finish=resolve;});
    });
    const pending=logout();
    expect(post).toHaveBeenCalledWith('/auth/logout',{});
    expect(browserSessionStorage.getItem(STORAGE_KEYS.TOKEN)).toBeNull();
    expect(browserSessionStorage.getItem(STORAGE_KEYS.USER)).toBeNull();
    expect(getClinicSnapshot().patients).toEqual([]);
    finish({success:true});await pending;
  });

  it('rolls back a procedure update rejected by the API', async () => {
    const plan=await makePlan();authenticate();
    vi.spyOn(apiClient,'patch').mockRejectedValue(new Error('Permission denied'));
    await expect(updateTreatmentPlanItemStatus(plan.id,plan.stages[0].items[0].id,'COMPLETED')).rejects.toThrow('Permission denied');
    const saved=getClinicSnapshot().treatmentPlans.find(p=>p.id===plan.id);
    expect(saved.status).toBe('Proposed');expect(saved.stages[0].items[0].status).toBe('PENDING');
  });

  it('rolls back a rejected plan revision', async () => {
    const plan=await makePlan();authenticate();
    vi.spyOn(apiClient,'patch').mockRejectedValue(new Error('Save unavailable'));
    await expect(updateStructuredTreatmentPlan(plan.id,{title:'Unsaved title',stages:plan.stages})).rejects.toThrow('Save unavailable');
    const saved=getClinicSnapshot().treatmentPlans.find(p=>p.id===plan.id);
    expect(saved.title).toBe('Recovery test');expect(saved.currentVersion).toBe(1);
  });

  it('keeps a plan active when server cancellation fails and requires a reason', async () => {
    const plan=await makePlan();authenticate();
    const patch=vi.spyOn(apiClient,'patch').mockRejectedValue(new Error('Cancellation failed'));
    await expect(cancelTreatmentPlan(plan.id,' ')).rejects.toThrow('reason');
    expect(patch).not.toHaveBeenCalled();
    await expect(cancelTreatmentPlan(plan.id,'Patient deferred')).rejects.toThrow('Cancellation failed');
    expect(getClinicSnapshot().treatmentPlans.find(p=>p.id===plan.id).status).toBe('Proposed');
  });

  it('shows billing errors and keeps the dialog available without adding an invoice', async () => {
    const plan=await makePlan();
    const count=getClinicSnapshot().invoices.length;
    vi.spyOn(billingApi,'createInvoiceFromTreatmentPlan').mockRejectedValue(new Error('Invoice service unavailable'));
    render(<MemoryRouter><TreatmentPlanDetailsModal plan={plan} isOpen onClose={()=>{}} onPrint={()=>{}} /></MemoryRouter>);
    fireEvent.click(screen.getByTestId('bill-treatment-plan-btn'));
    fireEvent.click(screen.getByTestId('confirm-generate-invoice-btn'));
    await waitFor(()=>expect(screen.getAllByRole('alert').some(e=>e.textContent.includes('Invoice service unavailable'))).toBe(true));
    expect(screen.getByTestId('confirm-generate-invoice-btn')).toBeEnabled();
    expect(getClinicSnapshot().invoices).toHaveLength(count);
    expect(screen.queryByText('Invoice Generated Successfully!')).not.toBeInTheDocument();
  });

  it('hides clinical and billing actions from a nurse', async () => {
    const plan=await makePlan();authenticate('NURSE');
    render(<MemoryRouter><TreatmentPlanDetailsModal plan={plan} isOpen onClose={()=>{}} onPrint={()=>{}} /></MemoryRouter>);
    expect(screen.queryByTestId('edit-treatment-plan-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cancel-treatment-plan-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('bill-treatment-plan-btn')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Pending')).toBeDisabled();
  });

  it('creates a legacy plan default item without a test-runner global', () => {
    const runner=globalThis.it;
    try {delete globalThis.it;const plan=addTreatmentPlan({patientId:'pt-1001',procedure:'Restoration',cost:1000,doctor:'Doctor',status:'Proposed'});expect(plan.stages[0].items[0].status).toBe('PENDING');}
    finally {globalThis.it=runner;}
  });
});
