import { browserLocalStorage, browserSessionStorage } from '@/services/browserStorage';
import React from 'react';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import PlatformAdminPage from '../src/pages/admin/PlatformAdminPage';
import { AppRoutes } from '../src/routes/appRoutes';
import { apiClient } from '../src/services/apiClient';
import { loginPlatformAdmin, STORAGE_KEYS } from '../src/services/authService';
import { notifyAuthSessionChanged } from '../src/services/authSession';

const admin = { id:'platform-a',fullName:'Platform Operator',email:'platform@docmatrix.test',isPlatformAdmin:true,role:'ORGANIZATION_ADMIN',clinicId:null };
const overview = { user:admin,summary:{clinics:5,activeClinics:3,clinicUsers:12,activeSubscriptions:2},overview:{admins:2,newThisMonth:8,newLastMonth:4,newToday:1,growthPercent:100,monthlyPlanValue:1000,recentClinics:[{id:'clinic-a',name:'Synthetic Dental',status:'ACTIVE',createdAt:'2026-11-01',state:'Kerala',country:'India',_count:{users:4},subscriptions:[{status:'ACTIVE',plan:{name:'Pro'}}]}],regions:[{state:'Kerala',country:'India',clinics:3},{state:'Karnataka',country:'India',clinics:2}],activity:[{month:'2026-10-01',clinics:4},{month:'2026-11-01',clinics:8}]},generatedAt:'2026-11-16T08:00:00Z' };
const error = status => Object.assign(new Error('Denied'),{status});
const authenticate = user => { browserSessionStorage.setItem(STORAGE_KEYS.USER,JSON.stringify(user));browserSessionStorage.setItem(STORAGE_KEYS.TOKEN,'synthetic-token'); };
const renderPage = () => render(<MemoryRouter initialEntries={['/admin']}><PlatformAdminPage /></MemoryRouter>);
describe('Dedicated /admin platform entry',()=> {
  beforeEach(()=> {
    browserLocalStorage.clear();browserSessionStorage.clear();
    vi.spyOn(apiClient,'get').mockImplementation(async path=>path==='/admin/dashboard'?overview:[]);
    vi.spyOn(apiClient,'post').mockResolvedValue({token:'platform-token',user:admin});
  });
  afterEach(()=>{cleanup();vi.restoreAllMocks();browserLocalStorage.clear();browserSessionStorage.clear();});

  it('routes anonymous visitors to the dedicated login at /admin without registration',async()=> {
    render(<MemoryRouter initialEntries={['/admin']}><AppRoutes currentUser={null} renderLandingPage={()=>null} /></MemoryRouter>);
    expect(await screen.findByRole('heading',{name:'Platform Admin Login'})).toBeInTheDocument();
    expect(screen.queryByRole('link',{name:/sign up|register/i})).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(apiClient.get.mock.calls.some(([path])=>path==='/admin/dashboard')).toBe(false);
  });
  it('authenticates through platform login, verifies backend access, and displays the separate dashboard',async()=> {
    renderPage();fireEvent.change(screen.getByLabelText('Email address'),{target:{value:admin.email}});
    fireEvent.change(screen.getByLabelText('Password'),{target:{value:'Synthetic-Password!'}});
    fireEvent.click(screen.getByRole('button',{name:'Sign in to platform'}));
    expect(await screen.findByRole('heading',{name:'Platform Admin Dashboard'})).toBeInTheDocument();
    expect(apiClient.post).toHaveBeenCalledWith('/auth/platform-login',{email:admin.email,password:'Synthetic-Password!'});
    expect(apiClient.get).toHaveBeenCalledWith('/admin/dashboard');
    expect(screen.getByRole('navigation',{name:'Platform administration'})).toBeInTheDocument();
    expect(screen.getByText('Total Clinics')).toBeInTheDocument();
    for(const label of ['Clinics','Platform Users','Subscriptions','Support','Audit Logs','Settings']) expect(screen.getByRole('button',{name:label,exact:true})).toBeEnabled();
    expect(browserSessionStorage.getItem(STORAGE_KEYS.TOKEN)).toBe('platform-token');
    expect(browserSessionStorage.getItem(STORAGE_KEYS.LEGACY_SESSION)).toBeNull();
  });
  it.each(['ORGANIZATION_ADMIN','DOCTOR','RECEPTIONIST','ACCOUNTANT'])('does not grant %s access based on clinic role or cached frontend flags',async role=> {
    authenticate({...admin,role,isPlatformAdmin:true}); // deliberately forged cache
    apiClient.get.mockRejectedValue(error(403));renderPage();
    expect(await screen.findByRole('heading',{name:'Platform access denied'})).toBeInTheDocument();
    expect(screen.queryByRole('navigation',{name:'Platform administration'})).not.toBeInTheDocument();
    expect(screen.queryByText('Total Clinics')).not.toBeInTheDocument();
  });
  it.each([false,'true',1])('requires an explicit boolean platform flag in the server response (%s)',async flag=> {
    authenticate(admin);apiClient.get.mockResolvedValue({...overview,user:{...admin,isPlatformAdmin:flag}});renderPage();
    expect(await screen.findByRole('heading',{name:'Platform access denied'})).toBeInTheDocument();
  });
  it('does not persist a non-platform login response or use demo fallback',async()=> {
    apiClient.post.mockResolvedValue({token:'clinic-token',user:{...admin,isPlatformAdmin:false}});
    await expect(loginPlatformAdmin('doctor@docmatrix.in','Demo-password')).rejects.toMatchObject({status:403});
    expect(browserSessionStorage.getItem(STORAGE_KEYS.TOKEN)).toBeNull();
    expect(browserSessionStorage.getItem(STORAGE_KEYS.USER)).toBeNull();
  });
  it('shows login failures without exposing a dashboard',async()=> {
    apiClient.post.mockRejectedValue(error(401));renderPage();
    fireEvent.change(screen.getByLabelText('Email address'),{target:{value:admin.email}});
    fireEvent.change(screen.getByLabelText('Password'),{target:{value:'Wrong-password'}});
    fireEvent.click(screen.getByRole('button',{name:'Sign in to platform'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect email or password.');
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
  it('returns revoked sessions to login and hides statistics on permission loss',async()=> {
    authenticate(admin);renderPage();await screen.findByRole('heading',{name:'Platform Admin Dashboard'});
    browserSessionStorage.removeItem(STORAGE_KEYS.TOKEN);browserSessionStorage.removeItem(STORAGE_KEYS.USER);
    act(() => notifyAuthSessionChanged());
    expect(await screen.findByRole('heading',{name:'Platform Admin Login'})).toBeInTheDocument();
    expect(screen.queryByText('Total Clinics')).not.toBeInTheDocument();
  });
  it('keeps /admin as the only entry URL and does not enable unimplemented modules',async()=> {
    const Location=()=> <output aria-label="Current path">{useLocation().pathname}</output>;
    render(<MemoryRouter initialEntries={['/admin/clinics']}><AppRoutes currentUser={null} renderLandingPage={()=>null} /><Location /></MemoryRouter>);
    expect(await screen.findByRole('heading',{name:'Platform Admin Login'})).toBeInTheDocument();
    expect(screen.getByLabelText('Current path')).toHaveTextContent('/admin');
  });
  it('reports a dashboard failure and can retry without substituting demo statistics',async()=> {
    authenticate(admin);apiClient.get.mockRejectedValueOnce(error(500));renderPage();
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load');
    expect(screen.queryByText('Total Clinics')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Retry'}));
    expect(await screen.findByRole('heading',{name:'Platform Admin Dashboard'})).toBeInTheDocument();
  });

  it('opens clinic details, reports, chart periods and regional counts',async()=> {
    authenticate(admin);renderPage();await screen.findByRole('heading',{name:'Platform Admin Dashboard'});
    fireEvent.click(screen.getByRole('button',{name:/Synthetic Dental/}));
    expect(await screen.findByRole('dialog')).toHaveTextContent('Pro');
    fireEvent.keyDown(window,{key:'Escape'});expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Select clinic region'),{target:{value:'India|Karnataka'}});
    expect(screen.getByText('2 Clinics')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Chart period'),{target:{value:'3'}});
    fireEvent.click(screen.getByRole('button',{name:'VIEW FULL REPORT'}));
    expect(screen.getByRole('heading',{name:'Platform Report'})).toBeInTheDocument();
  });
  it('loads and filters the protected clinic directory',async()=> {
    authenticate(admin);
    apiClient.get.mockImplementation(async path=>path==='/admin/dashboard'?overview:{items:overview.overview.recentClinics,total:1,page:1});
    renderPage();await screen.findByRole('heading',{name:'Platform Admin Dashboard'});
    fireEvent.click(screen.getByRole('button',{name:'Suspended Clinics'}));
    expect(await screen.findByRole('heading',{name:'Suspended Clinics'})).toBeInTheDocument();
    expect(await screen.findByRole('button',{name:'Synthetic Dental'})).toBeInTheDocument();
    expect(apiClient.get).toHaveBeenCalledWith('/admin/clinics',expect.objectContaining({status:'SUSPENDED',page:1}), expect.objectContaining({signal:expect.any(AbortSignal)}));
    fireEvent.change(screen.getByLabelText('Search clinics'),{target:{value:'Dental'}});
    await waitFor(()=>expect(apiClient.get).toHaveBeenCalledWith('/admin/clinics',expect.objectContaining({search:'Dental'}), expect.objectContaining({signal:expect.any(AbortSignal)})));
  });
  it('shows an honest availability message for unsupported workflows',async()=> {
    authenticate(admin);renderPage();await screen.findByRole('heading',{name:'Platform Admin Dashboard'});
    fireEvent.click(screen.getByRole('button',{name:'Pending Approvals'}));
    expect(await screen.findByRole('dialog')).toHaveTextContent('no pending-approval state');
    fireEvent.click(screen.getByRole('button',{name:'Close dialog'}));
    fireEvent.click(screen.getByRole('button',{name:'Support',exact:true}));
    expect(await screen.findByRole('dialog')).toHaveTextContent('not available yet');
  });

  it('logs out using the shared session infrastructure and stays on the admin login',async()=> {
    authenticate(admin);renderPage();await screen.findByRole('heading',{name:'Platform Admin Dashboard'});
    apiClient.post.mockResolvedValue({success:true});fireEvent.click(screen.getByRole('button',{name:'Sign out'}));
    expect(await screen.findByRole('heading',{name:'Platform Admin Login'})).toBeInTheDocument();
    expect(apiClient.post).toHaveBeenCalledWith('/auth/logout',{});
    expect(browserSessionStorage.getItem(STORAGE_KEYS.TOKEN)).toBeNull();
  });
});
