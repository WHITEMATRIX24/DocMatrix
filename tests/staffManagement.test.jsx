import React from 'react';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
import StaffManagementPage from '../src/pages/settings/StaffManagementPage';
import { apiClient } from '../src/services/apiClient';
import { restoreSession, getCurrentUser, STORAGE_KEYS } from '../src/services/authService';
import { AUTH_SESSION_CHANGED } from '../src/services/authSession';
import { cacheClinicStaff, getClinicStaffDoctors, getStaffStorageKey } from '../src/services/clinicStaffStore';
import { getNavFeaturesByArea } from '../src/features/registry';

const roles = ['ORGANIZATION_ADMIN','BRANCH_ADMIN','DOCTOR','RECEPTIONIST','ACCOUNTANT','NURSE','LAB_TECHNICIAN','PHARMACIST'].map(value=>({value,label:value.replace(/_/g,' ')}));
const owner={id:'owner-a',fullName:'Clinic Owner',email:'owner@clinic.test',role:'ORGANIZATION_ADMIN',isPrimaryContact:true,isActive:true,clinicId:'clinic-a'};
let staff;
function renderPage() { return render(<StaffManagementPage />); }
async function addDialog() {
  const add=screen.getByRole('button',{name:'Add Staff Member'});
  await waitFor(()=>expect(add).toBeEnabled()); fireEvent.click(add);
  return within(screen.getByRole('dialog',{name:'Add staff member'}));
}
describe('Owner-managed clinic staff',()=> {
  beforeEach(()=> {
    localStorage.clear();sessionStorage.clear();
    sessionStorage.setItem(STORAGE_KEYS.USER,JSON.stringify(owner));
    sessionStorage.setItem(STORAGE_KEYS.TOKEN,'synthetic-access');
    staff=[owner,{id:'doctor-a',fullName:'Dentist One',email:'doctor@clinic.test',role:'DOCTOR',isActive:true}];
    vi.spyOn(apiClient,'get').mockImplementation(async path=>path.endsWith('/roles')?roles:staff);
    vi.spyOn(apiClient,'post').mockImplementation(async (_path,data)=>{const member={id:'new-staff',...data,isActive:true};staff=[...staff,member];return member;});
    vi.spyOn(apiClient,'patch').mockImplementation(async (path,data)=>{staff=staff.map(s=>path.endsWith(s.id)?{...s,...data}:s);return staff.find(s=>path.endsWith(s.id));});
    vi.spyOn(apiClient,'delete').mockImplementation(async path=>{staff=staff.map(s=>path.endsWith(s.id)?{...s,isActive:false}:s);return {};});
  });
  afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();localStorage.clear();sessionStorage.clear();});

  it.each(['DOCTOR','RECEPTIONIST','ACCOUNTANT'])('owner creates %s using server-provided predefined role choices',async role=> {
    renderPage();const form=await addDialog();
    fireEvent.change(form.getByLabelText('Full name'),{target:{value:'New Staff'}});
    fireEvent.change(form.getByLabelText('Email'),{target:{value:'new@clinic.test'}});
    fireEvent.change(form.getByLabelText('Initial password'),{target:{value:'Unique-Initial-Secret!'}});
    fireEvent.change(form.getByLabelText('Staff role'),{target:{value:role}});
    expect(form.getByRole('option',{name:'LAB TECHNICIAN'})).toBeInTheDocument();
    expect(form.getByRole('option',{name:'PHARMACIST'})).toBeInTheDocument();
    fireEvent.click(form.getByRole('button',{name:'Create Account'}));
    await waitFor(()=>expect(apiClient.post).toHaveBeenCalledWith('/clinics/my-clinic/staff',expect.objectContaining({role,fullName:'New Staff',email:'new@clinic.test'})));
    await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('New Staff')).toBeInTheDocument();
    expect(screen.queryByText('Unique-Initial-Secret!')).not.toBeInTheDocument();
  });

  it('uses the branch administrator assignment list and protects administrator/owner rows',async()=> {
    apiClient.get.mockImplementation(async path=>path.endsWith('/roles')?roles.filter(r=>!['ORGANIZATION_ADMIN','BRANCH_ADMIN'].includes(r.value)):staff);
    renderPage();const form=await addDialog();
    expect(form.queryByRole('option',{name:'ORGANIZATION ADMIN'})).not.toBeInTheDocument();
    expect(form.queryByRole('option',{name:'BRANCH ADMIN'})).not.toBeInTheDocument();
    const row=screen.getByText('Clinic Owner').closest('tr');
    expect(within(row).getByTitle('Edit details')).toBeDisabled();
    expect(within(row).queryByTitle('Deactivate staff')).not.toBeInTheDocument();
    expect(within(row).queryByTitle('Remove staff member')).not.toBeInTheDocument();
  });

  it('edits a role, refreshes directory eligibility, deactivates and reactivates staff',async()=> {
    renderPage();await screen.findByText('Dentist One');
    fireEvent.click(within(screen.getByText('Dentist One').closest('tr')).getByTitle('Edit details'));
    const edit=within(screen.getByRole('dialog',{name:'Edit staff member'}));
    fireEvent.change(edit.getByLabelText('Staff role'),{target:{value:'RECEPTIONIST'}});
    fireEvent.click(edit.getByRole('button',{name:'Save Changes'}));
    await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(apiClient.patch).toHaveBeenCalledWith('/clinics/my-clinic/staff/doctor-a',expect.objectContaining({role:'RECEPTIONIST'}));
    expect(getClinicStaffDoctors()).toEqual([]);
    fireEvent.click(within(screen.getByText('Dentist One').closest('tr')).getByTitle('Deactivate staff'));
    await waitFor(()=>expect(within(screen.getByText('Dentist One').closest('tr')).getByText('Inactive')).toBeInTheDocument());
    fireEvent.click(within(screen.getByText('Dentist One').closest('tr')).getByTitle('Activate staff'));
    await waitFor(()=>expect(within(screen.getByText('Dentist One').closest('tr')).getByText('Active')).toBeInTheDocument());
  });

  it('protects owner role, deactivation and removal in the UI',async()=> {
    renderPage();await screen.findByText('Clinic Owner');
    const row=within(screen.getByText('Clinic Owner').closest('tr'));
    expect(row.queryByTitle('Remove staff member')).not.toBeInTheDocument();
    expect(row.queryByTitle('Deactivate staff')).not.toBeInTheDocument();
    fireEvent.click(row.getByTitle('Edit details'));
    expect(within(screen.getByRole('dialog')).getByLabelText('Staff role')).toBeDisabled();
  });

  it('removes access while retaining the inactive staff record',async()=> {
    vi.spyOn(window,'confirm').mockReturnValue(true);
    renderPage();await screen.findByText('Dentist One');
    fireEvent.click(within(screen.getByText('Dentist One').closest('tr')).getByTitle('Remove staff member'));
    await waitFor(()=>expect(apiClient.delete).toHaveBeenCalledWith('/clinics/my-clinic/staff/doctor-a'));
    expect(await screen.findByText(/Historical records are retained/)).toBeInTheDocument();
    expect(within(screen.getByText('Dentist One').closest('tr')).getByText('Inactive')).toBeInTheDocument();
  });

  it('keeps the form open on duplicate account failure and clears password when closed',async()=> {
    apiClient.post.mockRejectedValue(new Error('A user with this email address already exists.'));
    renderPage();let form=await addDialog();
    fireEvent.change(form.getByLabelText('Full name'),{target:{value:'Existing Staff'}});
    fireEvent.change(form.getByLabelText('Email'),{target:{value:'existing@clinic.test'}});
    fireEvent.change(form.getByLabelText('Initial password'),{target:{value:'Unique-Initial-Secret!'}});
    fireEvent.click(form.getByRole('button',{name:'Create Account'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('already exists');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(form.getByRole('button',{name:'Cancel'}));
    form=await addDialog();expect(form.getByLabelText('Initial password')).toHaveValue('');
  });

  it('fails closed when assignment permissions cannot be loaded',async()=> {
    apiClient.get.mockRejectedValue(new Error('Forbidden'));
    renderPage();expect(await screen.findByRole('alert')).toHaveTextContent('Forbidden');
    expect(screen.getByRole('button',{name:'Add Staff Member'})).toBeDisabled();
  });

  it('retains role navigation restrictions after restoring a changed profile',async()=> {
    const changed={...owner,role:'RECEPTIONIST',isPrimaryContact:false};
    apiClient.get.mockResolvedValue(changed);
    const changedEvent=vi.fn();window.addEventListener(AUTH_SESSION_CHANGED,changedEvent);
    try {
      await restoreSession();expect(getCurrentUser().role).toBe('RECEPTIONIST');expect(changedEvent).toHaveBeenCalled();
      const links=Object.values(getNavFeaturesByArea(getCurrentUser().role)).flat();
      expect(links.some(f=>f.id==='set.staff')).toBe(false);expect(links.some(f=>f.id==='rep.revenue')).toBe(false);
    } finally {window.removeEventListener(AUTH_SESSION_CHANGED,changedEvent);}
  });

  it('clears cached authorization and legacy login after session revocation',async()=> {
    sessionStorage.setItem(STORAGE_KEYS.LEGACY_SESSION,'owner-a');
    apiClient.get.mockRejectedValue(Object.assign(new Error('Session revoked'),{status:401}));
    expect(await restoreSession()).toBeNull();expect(getCurrentUser()).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEYS.TOKEN)).toBeNull();expect(sessionStorage.getItem(STORAGE_KEYS.LEGACY_SESSION)).toBeNull();
  });

  it('cannot restore a profile returned after logout or cache a foreign-clinic directory',async()=> {
    let resolve;apiClient.get.mockImplementation(()=>new Promise(r=>{resolve=r;}));
    const pending=restoreSession();sessionStorage.removeItem(STORAGE_KEYS.USER);sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
    resolve(owner);expect(await pending).toBeNull();expect(getCurrentUser()).toBeNull();
    sessionStorage.setItem(STORAGE_KEYS.USER,JSON.stringify({...owner,clinicId:'clinic-b'}));
    cacheClinicStaff([{id:'foreign',fullName:'Foreign doctor',role:'DOCTOR',isActive:true}],'clinic-a');
    expect(localStorage.getItem(getStaffStorageKey('clinic-b'))).toBeNull();
  });
  it('does not clear a newer login when an old profile request is rejected',async()=> {
    let reject;apiClient.get.mockImplementation(()=>new Promise((_resolve,r)=>{reject=r;}));
    const pending=restoreSession();
    const newUser={...owner,id:'owner-b',clinicId:'clinic-b'};
    sessionStorage.setItem(STORAGE_KEYS.USER,JSON.stringify(newUser));
    sessionStorage.setItem(STORAGE_KEYS.TOKEN,'newer-access-token');
    reject(Object.assign(new Error('Old session revoked'),{status:401}));
    expect((await pending).id).toBe('owner-b');expect(getCurrentUser().clinicId).toBe('clinic-b');
  });
});
