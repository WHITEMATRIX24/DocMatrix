import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BarChart3, Building2, CalendarDays, Check, ChevronDown, ChevronRight, Headphones, Home, Layers, LogOut, Megaphone, RefreshCw, Search, Settings, ShieldCheck, Users, X } from 'lucide-react';
import { apiClient } from '@/services/apiClient';

interface Clinic { id: string; name: string; status: string; city?: string; state?: string; country?: string; createdAt: string; _count?: { users: number }; subscriptions?: { status: string; plan: { name: string } }[] }
interface Region { state: string; country: string; clinics: number }
export interface DashboardData {
  user: { id: string; fullName: string; email: string; isPlatformAdmin: boolean };
  summary: { clinics: number; activeClinics: number; clinicUsers: number; activeSubscriptions: number };
  generatedAt: string;
  overview?: { admins: number; newThisMonth: number; newLastMonth: number; newToday: number; growthPercent: number | null; monthlyPlanValue: number; recentClinics: Clinic[]; regions: Region[]; activity: { month: string; clinics: number }[] };
}
type View = 'dashboard' | 'clinics' | 'subscriptions' | 'users' | 'reports';
type DirectoryRow = Clinic & { fullName?: string; role?: string; isActive?: boolean; isPlatformAdmin?: boolean; isPrimaryContact?: boolean; practitionerVerifiedAt?: string; practitionerRegistration?: string; clinic?: { name: string }; plan?: { name: string }; currency?: string; lockedPrice?: string; billingInterval?: string; currentPeriodEnd?: string };
const integer = (n: number) => n.toLocaleString('en-IN');
const money = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
export function Tooth({ size = 28 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 40 44" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6C14 6 12 1 6 4C0 7 2 17 5 22C8 27 7 39 12 40C17 41 14 26 20 26C26 26 23 41 28 40C33 39 32 27 35 22C38 17 40 7 34 4C28 1 26 6 20 6Z"/><path d="M24 8L29 9"/></svg>;
}

function Directory({ view, status, onClinic }: { view: View; status: string; onClinic: (clinic: Clinic) => void }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ items: DirectoryRow[]; total: number } | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => { setPage(1); setSearch(''); }, [view, status]);
  useEffect(() => {
    const controller = new AbortController();
    setResult(null); setError('');
    const timer = window.setTimeout(async () => {
      try {
        const response = await apiClient.get<{ items: DirectoryRow[]; total: number }>(`/admin/${view}`, { page, search, ...(view === 'clinics' && status ? { status } : {}) }, { signal: controller.signal });
        if (!controller.signal.aborted) setResult(response);
      } catch (e: any) { if (!controller.signal.aborted) setError(e.status === 403 ? 'Platform access is no longer authorized. Refresh your session.' : 'Unable to load records. Please try again.'); }
    }, search ? 250 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [view, status, page, search, retry]);
  const changePractitioner = async (row: DirectoryRow) => {
    const verified = !row.practitionerVerifiedAt;
    const registration = verified ? window.prompt('Enter the independently verified practitioner registration number:') : undefined;
    if (verified && !registration?.trim()) return;
    const reason = window.prompt(verified ? 'Record the verification evidence and reason:' : 'Reason for withdrawing practitioner access:');
    if (!reason || reason.trim().length < 5) return;
    try { await apiClient.patch(`/admin/users/${row.id}/practitioner`, { verified, registration, reason }); setRetry(v => v + 1); }
    catch (e: any) { setError(e.message || 'Unable to update practitioner verification.'); }
  };
  const title = view === 'clinics' ? (status === 'SUSPENDED' ? 'Suspended Clinics' : status === 'TRIAL' ? 'Trial Clinics' : 'All Clinics') : view === 'users' ? 'Platform Users' : 'Subscriptions';
  return <section className="pa-directory"><div className="pa-section-title"><div><h1>{title}</h1><p>Live platform records</p></div><label className="pa-search"><Search size={18}/><input aria-label={`Search ${view}`} value={search} maxLength={100} placeholder={view === 'users' ? 'Search by name' : 'Search clinics'} onChange={e => { setSearch(e.target.value); setPage(1); }} /></label></div>
    {error ? <div className="pa-empty" role="alert"><p>{error}</p><button onClick={() => setRetry(v => v + 1)}>Retry</button></div> : !result ? <p className="pa-empty" role="status">Loading records…</p> : <><div className="pa-table-scroll"><table><thead><tr>{(view === 'users' ? ['Name','Clinic','Role','Access','Status'] : view === 'subscriptions' ? ['Clinic','Plan','Status','Price / interval','Period ends'] : ['Clinic','Location','Plan','Status','Users']).map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{result.items.map(row => <tr key={row.id}>{view === 'users' ? <><td>{row.fullName}</td><td>{row.clinic?.name || 'Platform'}</td><td>{row.role?.replace(/_/g,' ')}</td><td>{row.isPlatformAdmin ? 'Platform admin' : 'Clinic staff'}</td><td>{row.isActive ? 'Active' : 'Inactive'}{row.isPrimaryContact && row.role === 'ORGANIZATION_ADMIN' && !row.isPlatformAdmin && <button onClick={() => changePractitioner(row)}>{row.practitionerVerifiedAt ? 'Revoke practitioner access' : 'Verify practitioner'}</button>}</td></> : view === 'subscriptions' ? <><td>{row.clinic?.name}</td><td>{row.plan?.name}</td><td><span className="pa-status">{row.status}</span></td><td>{row.currency} {Number(row.lockedPrice).toLocaleString()} / {row.billingInterval?.toLowerCase()}</td><td>{row.currentPeriodEnd ? new Date(row.currentPeriodEnd).toLocaleDateString() : '—'}</td></> : <><td><button className="pa-text-button" onClick={() => onClinic(row)}>{row.name}</button></td><td>{[row.city,row.state].filter(Boolean).join(', ') || 'Not specified'}</td><td>{row.subscriptions?.[0]?.plan.name || 'No subscription'}</td><td><span className="pa-status">{row.status}</span></td><td>{row._count?.users ?? 0}</td></>}</tr>)}</tbody></table>{!result.items.length && <p className="pa-empty">No records match your filters.</p>}</div><div className="pa-pagination"><span>{integer(result.total)} records</span><button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {page}</span><button disabled={page * 20 >= result.total} onClick={() => setPage(p => p + 1)}>Next</button></div></>}
  </section>;
}

export default function AdminDashboard({ data, onRefresh, onSignOut, busy }: { data: DashboardData; onRefresh: () => void; onSignOut: () => void; busy: boolean }) {
  const [view, setView] = useState<View>('dashboard');
  const [mutationError, setMutationError] = useState('');
  const [mutating, setMutating] = useState(false);
  const [status, setStatus] = useState('');
  const [clinicsOpen, setClinicsOpen] = useState(true);
  const [dialog, setDialog] = useState<{ title: string; text: string } | null>(null);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [regionIndex, setRegionIndex] = useState(0);
  const [months, setMonths] = useState(6);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const overview = data.overview;
  const regions = overview?.regions || [];
  const region = regions[regionIndex] || regions[0];
  const activity = (overview?.activity || []).slice(-months);
  const max = Math.max(1,...activity.map(item => item.clinics));
  const go = (next: View, filter = '') => { setView(next); setStatus(filter); };
  const unavailable = (title: string, text: string) => setDialog({ title, text });
  useEffect(() => {
    if (view === 'reports') document.getElementById('pa-report-detail')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [view]);
  useEffect(() => {
    if (!dialog && !selectedClinic) return;
    previousFocus.current = document.activeElement as HTMLElement;
    closeRef.current?.focus();
    const escape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setDialog(null); setSelectedClinic(null); }
      if (e.key === 'Tab') { e.preventDefault(); closeRef.current?.focus(); }
    };
    window.addEventListener('keydown', escape);
    return () => { window.removeEventListener('keydown', escape); previousFocus.current?.focus(); };
  }, [dialog, selectedClinic]);
  const navItems = [
    { label: 'Subscriptions', icon: Layers, action: () => go('subscriptions'), active: view === 'subscriptions' },
    { label: 'Platform Users', icon: Users, action: () => go('users'), active: view === 'users' },
    { label: 'Reports', icon: BarChart3, action: () => go('reports'), active: view === 'reports' },
    { label: 'Support', icon: Headphones, action: () => unavailable('Support', 'A platform support-ticket workflow is not available yet. No support tickets have been created or changed.'), active: false },
    { label: 'Audit Logs', icon: ShieldCheck, action: () => unavailable('Security & Audit Logs', 'Existing security logging remains enabled. A platform-wide audit log viewer is not available yet.'), active: false },
    { label: 'Settings', icon: Settings, action: () => unavailable('Platform Settings', 'Platform settings management is not available yet. Your existing clinic settings remain unchanged.'), active: false },
  ];
  return <div className="platform-admin pa-stage"><div className="pa-shell">
    <aside className="pa-sidebar"><div className="pa-brand"><Tooth size={47}/><div>DocMatrix<small>Platform Admin</small></div></div>
      <nav aria-label="Platform administration"><button className={view === 'dashboard' ? 'pa-nav-current' : ''} onClick={() => go('dashboard')}><Home/><span>Dashboard</span></button>
        <button className="pa-clinics-nav" aria-expanded={clinicsOpen} onClick={() => { setClinicsOpen(v => !v); go('clinics'); }}><Building2/><span>Clinics</span><ChevronDown className={clinicsOpen ? '' : 'pa-chevron-closed'}/></button>
        {clinicsOpen && <div className="pa-subnav"><button className={view === 'clinics' && !status ? 'selected' : ''} onClick={() => go('clinics')}>All Clinics</button><button onClick={() => unavailable('Pending Approvals', 'Clinic registration currently creates trial accounts directly. There is no pending-approval state or approval workflow in the existing system.')}>Pending Approvals</button><button className={status === 'SUSPENDED' ? 'selected' : ''} onClick={() => go('clinics','SUSPENDED')}>Suspended Clinics</button></div>}
        {navItems.map(({label,icon:Icon,action,active}) => <button key={label} onClick={action} className={active ? 'pa-nav-current' : ''}><Icon/><span>{label}</span><ChevronRight size={18}/></button>)}
      </nav><button className="pa-profile" onClick={() => unavailable(data.user.fullName, `${data.user.email} · Verified platform administrator`)} aria-label="View administrator profile"><span className="pa-avatar">{data.user.fullName.split(' ').map(p => p[0]).slice(0,2).join('')}</span><span>{data.user.fullName}<small>Platform Administrator</small></span></button><button className="pa-signout" disabled={busy} onClick={onSignOut}><LogOut size={16}/> Sign out</button>
    </aside>
    <div className="pa-workspace"><header className="pa-topbar"><button className="pa-back" onClick={() => view === 'dashboard' ? window.history.back() : go('dashboard')}><span><ArrowLeft size={20}/></span>Back</button><nav aria-label="Dashboard sections">{(['dashboard','clinics','subscriptions'] as View[]).map(tab => <button key={tab} aria-current={view === tab ? 'page' : undefined} onClick={() => go(tab)}>{tab.toUpperCase()}</button>)}</nav><div className="pa-admin-count"><span className="pa-avatar pa-mini-avatar">{data.user.fullName[0]}</span><span>{overview ? integer(overview.admins) : '—'} admins</span><button onClick={onRefresh} aria-label="Refresh overview" title="Refresh overview"><RefreshCw size={16}/></button></div></header>
    <main className="pa-canvas" aria-label="Platform Admin Dashboard"><h1 className="pa-sr-only">Platform Admin Dashboard</h1>
      {view === 'clinics' || view === 'subscriptions' || view === 'users' ? <Directory key={`${view}-${status}`} view={view} status={status} onClinic={setSelectedClinic}/> : <>
      <div className="pa-hero-grid"><section className="pa-active-card"><div className="pa-active-copy"><h2>Active Clinics</h2><strong className="pa-active-number">{integer(data.summary.activeClinics)}</strong><div className="pa-hero-stat"><span><Building2 size={27}/></span><div>Total Clinics<strong>{integer(data.summary.clinics)}</strong></div></div><div className="pa-hero-stat"><span><Users size={27}/></span><div>Total Users<strong>{integer(data.summary.clinicUsers)}</strong></div></div></div><img className="pa-dentist" src="/admin-dentist.png" alt="Dentist reviewing clinic analytics at her workstation"/><button className="pa-report-button" onClick={() => go(view === 'reports' ? 'clinics' : 'reports')}>VIEW FULL REPORT <ArrowRight size={22}/></button></section>
      <section className="pa-growth-card"><h2>Platform Growth</h2><div className="pa-growth-visual"><strong>{overview?.growthPercent == null ? '—' : overview.growthPercent}<small>{overview?.growthPercent == null ? '' : '%'}</small></strong><div className="pa-gauge" role="img" aria-label={overview?.growthPercent == null ? 'Growth comparison unavailable' : `${overview.growthPercent}% monthly registration growth`}><svg viewBox="0 0 180 105"><path d="M15 90 A75 75 0 0 1 165 90" fill="none" stroke="#ffe0ce" strokeWidth="12" strokeLinecap="round"/><path d="M15 90 A75 75 0 0 1 165 90" fill="none" stroke="#ff963f" strokeWidth="12" strokeLinecap="round" pathLength="100" strokeDasharray={`${Math.max(0,Math.min(100,overview?.growthPercent || 0))} 100`}/><g transform={`rotate(${-90 + Math.max(0,Math.min(100,overview?.growthPercent || 0)) * 1.8} 90 90)`}><path d="M85 90 L90 32 L95 90 Z" fill="white"/><circle cx="90" cy="90" r="8" fill="#ff9b48" stroke="white" strokeWidth="5"/></g></svg></div></div><p>{overview ? overview.growthPercent == null ? 'Monthly growth will be available once there are registrations in the previous month.' : `Clinic registrations ${overview.growthPercent >= 0 ? 'increased' : 'decreased'} by ${Math.abs(overview.growthPercent)}% this month compared with last month. Keep growing your platform!` : 'Registration insights will appear once the updated platform API is available.'}</p><button className="pa-signups" onClick={() => go('clinics')}><Megaphone size={28}/><span>{overview ? `${integer(overview.newToday)} new clinic sign-ups today` : 'View clinic registrations'}</span><span><ArrowRight size={20}/></span></button></section></div>
      <div className="pa-bottom-grid"><section className="pa-card pa-revenue"><h2>Revenue Overview</h2><div className="pa-card-body"><div className="pa-revenue-total"><span className="pa-currency">₹</span><div><strong>{overview ? money(overview.monthlyPlanValue) : '—'}</strong><span title="Active non-trial INR subscription prices normalized monthly; not payments collected">Monthly plan value · INR</span></div><label className="pa-calendar" title="Chart period"><CalendarDays size={20}/><select aria-label="Chart period" value={months} onChange={e => setMonths(Number(e.target.value))}><option value={6}>6 months</option><option value={3}>3 months</option></select></label></div><div className="pa-bars" aria-label="Monthly clinic registrations">{activity.length ? activity.map(item => <div className="pa-bar-column" key={item.month}><div className="pa-bar-track"><div style={{ height: `${item.clinics / max * 100}%`, minHeight: item.clinics ? 5 : 0 }} title={`${new Date(item.month).toLocaleString('en',{month:'short', timeZone:'UTC'})}: ${item.clinics} registrations`}/></div><span>{new Date(item.month).toLocaleString('en',{month:'short',timeZone:'UTC'})}</span></div>) : <p>No registration history available.</p>}</div><p className="pa-chart-caption">Clinic registrations · Plan value is scheduled, not collected revenue</p></div></section>
      <section className="pa-card pa-top-clinics"><h2 className="pa-top-clinics-heading" title="Ranked by staff count among the 12 newest clinics">Top Clinics<button aria-label="View all clinics" onClick={() => go('clinics')}><ChevronRight size={17}/></button></h2><div className="pa-card-body">{overview?.recentClinics.length ? [...overview.recentClinics].sort((a,b) => (b._count?.users || 0) - (a._count?.users || 0)).slice(0,3).map((clinic,i) => <button className={`pa-clinic-row tone-${i}`} key={clinic.id} onClick={() => setSelectedClinic(clinic)}><span className="pa-tooth-bubble"><Tooth size={27}/></span><span><strong>{clinic.name}</strong><small>{clinic.subscriptions?.[0]?.plan.name || 'No plan'} <i className={clinic.status === 'ACTIVE' ? 'active' : ''}/></small></span><span className="pa-clinic-score" title="Staff accounts">{clinic._count?.users ?? 0}<small>users</small></span></button>) : <p className="pa-empty">No clinics registered yet.</p>}</div></section>
      <section className="pa-card pa-regions"><h2>Clinics by Region</h2><div className="pa-card-body"><div className="pa-map" aria-label="Decorative India silhouette"><svg viewBox="0 0 280 280" aria-hidden="true"><path d="M84 9L104 8L114 22L132 17L144 28L139 43L154 53L149 67L170 77L189 85L215 82L226 69L239 72L243 64L257 66L262 79L251 90L251 107L238 111L233 126L218 118L211 126L191 126L187 139L168 147L162 164L148 168L146 190L136 208L128 232L117 255L108 265L98 250L92 225L81 210L77 189L64 179L61 159L43 152L28 139L24 124L38 125L45 113L39 104L56 101L60 89L73 78L77 65L88 54L81 45L88 34L80 23Z" fill="#e2edf0"/><path d="M246 233L250 239M250 248L253 253" stroke="#d6e7eb" strokeWidth="4" strokeLinecap="round"/></svg>{[{x:40,y:31},{x:65,y:43},{x:30,y:58},{x:28,y:74},{x:36,y:85}].map((pos,i) => <button key={i} className={regionIndex === i ? 'selected' : ''} style={{left:`${pos.x}%`,top:`${pos.y}%`}} disabled={!regions[i]} onClick={() => setRegionIndex(i)} aria-label={regions[i] ? `Show ${regions[i].state}` : 'No region data'} title={regions[i]?.state}/>)}</div><label className="pa-region-badge"><span><Tooth size={22}/></span><div><select aria-label="Select clinic region" value={region ? `${region.country}|${region.state}` : ''} onChange={e => setRegionIndex(regions.findIndex(r => `${r.country}|${r.state}` === e.target.value))}>{regions.length ? regions.map(r => <option key={`${r.country}|${r.state}`} value={`${r.country}|${r.state}`}>{r.state} · {r.country}</option>) : <option value="">No regions yet</option>}</select><small>{region ? `${integer(region.clinics)} Clinics` : 'No clinic locations'}</small></div></label><small className="pa-card-note">Illustrative map · Select a region for exact counts</small></div></section></div>
      {view === 'reports' && <section id="pa-report-detail" className="pa-report-detail"><h2>Platform Report</h2><p>Registered clinics: {integer(data.summary.clinics)} · Active clinics: {integer(data.summary.activeClinics)} · Active / trial subscriptions: {integer(data.summary.activeSubscriptions)}</p><p>New registrations this month: {overview?.newThisMonth ?? '—'} · Previous month: {overview?.newLastMonth ?? '—'}. Registration periods use UTC.</p><p>Monthly plan value includes active non-trial INR subscriptions, normalized by billing interval. It excludes collected payments, refunds, taxes and non-INR subscriptions.</p></section>}
      <footer className="pa-updated"><ShieldCheck size={13}/> Updated {new Date(data.generatedAt).toLocaleString()}<button onClick={onRefresh}>Refresh data <RefreshCw size={13}/></button></footer></>}
    </main></div>
    {(dialog || selectedClinic) && <div className="pa-dialog-backdrop" onClick={() => {setDialog(null);setSelectedClinic(null);}}><section role="dialog" aria-modal="true" aria-labelledby="pa-dialog-title" className="pa-dialog" onClick={e => e.stopPropagation()}><button ref={closeRef} className="pa-dialog-close" aria-label="Close dialog" onClick={() => {setDialog(null);setSelectedClinic(null);}}><X size={20}/></button><div className="pa-dialog-icon">{selectedClinic ? <Building2/> : <Check/>}</div><h2 id="pa-dialog-title">{selectedClinic?.name || dialog?.title}</h2>{selectedClinic ? <><dl><dt>Status</dt><dd>{selectedClinic.status}</dd><dt>Plan</dt><dd>{selectedClinic.subscriptions?.[0]?.plan.name || 'No subscription'}</dd><dt>Location</dt><dd>{[selectedClinic.city,selectedClinic.state,selectedClinic.country].filter(Boolean).join(', ') || 'Not specified'}</dd><dt>Staff accounts</dt><dd>{selectedClinic._count?.users ?? 0}</dd><dt>Joined</dt><dd>{new Date(selectedClinic.createdAt).toLocaleDateString()}</dd></dl><label>Clinic access <select aria-label="Clinic access" value={selectedClinic.status} disabled={mutating} onChange={async e => {
      const status = e.target.value; const reason = window.prompt('Reason for changing clinic access:');
      if (!reason || reason.trim().length < 5) return;
      setMutating(true); setMutationError('');
      try { const updated = await apiClient.patch<Clinic>(`/admin/clinics/${selectedClinic.id}/status`, { status, reason }); setSelectedClinic({ ...selectedClinic, ...updated }); onRefresh(); }
      catch (error: any) { setMutationError(error.message || 'Unable to change clinic access.'); }
      finally { setMutating(false); }
    }}>{['ACTIVE','TRIAL','SUSPENDED','READ_ONLY','CLOSED'].map(status => <option key={status}>{status}</option>)}</select></label>{mutationError && <p role="alert">{mutationError}</p>}</> : <p>{dialog?.text}</p>}</section></div>}
  </div></div>;
}
