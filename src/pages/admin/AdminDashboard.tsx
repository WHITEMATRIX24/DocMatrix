import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarCheck,
  Check,
  Headphones,
  Home,
  IndianRupee,
  Layers,
  LogOut,
  Moon,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Stethoscope,
  Sun,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { DentalSpatialRoom } from './PlatformAdminPage';

interface Clinic {
  id: string;
  name: string;
  status: string;
  city?: string;
  state?: string;
  country?: string;
  createdAt: string;
  _count?: { users: number };
  subscriptions?: { status: string; plan: { name: string } }[];
}

interface Region {
  state: string;
  country: string;
  clinics: number;
}

export interface DashboardData {
  user: { id: string; fullName: string; email: string; isPlatformAdmin: boolean };
  summary: {
    clinics: number;
    activeClinics: number;
    clinicUsers: number;
    activeSubscriptions: number;
  };
  generatedAt: string;
  overview?: {
    admins: number;
    newThisMonth: number;
    newLastMonth: number;
    newToday: number;
    growthPercent: number | null;
    monthlyPlanValue: number;
    recentClinics: Clinic[];
    regions: Region[];
    activity: { month: string; clinics: number }[];
  };
}

type View = 'dashboard' | 'clinics' | 'subscriptions' | 'users' | 'reports';
type GaugeMode = 'active' | 'trial' | 'plans';

type DirectoryRow = Clinic & {
  fullName?: string;
  role?: string;
  isActive?: boolean;
  isPlatformAdmin?: boolean;
  isPrimaryContact?: boolean;
  practitionerVerifiedAt?: string;
  practitionerRegistration?: string;
  clinic?: { name: string };
  plan?: { name: string };
  currency?: string;
  lockedPrice?: string;
  billingInterval?: string;
  currentPeriodEnd?: string;
};

const integer = (n: number) => n.toLocaleString('en-IN');
const money = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function polar(cx: number, cy: number, r: number, degFromTop: number) {
  const rad = ((degFromTop - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, endDeg);
  const sweep = endDeg - startDeg;
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

export function Tooth({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 44"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6C14 6 12 1 6 4C0 7 2 17 5 22C8 27 7 39 12 40C17 41 14 26 20 26C26 26 23 41 28 40C33 39 32 27 35 22C38 17 40 7 34 4C28 1 26 6 20 6Z" />
      <path d="M24 9L29 10" />
    </svg>
  );
}

function Directory({
  view,
  status,
  onClinic,
  onBack,
}: {
  view: View;
  status: string;
  onClinic: (clinic: Clinic) => void;
  onBack: () => void;
}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ items: DirectoryRow[]; total: number } | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    setPage(1);
    setSearch('');
  }, [view, status]);

  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setError('');
    const timer = window.setTimeout(async () => {
      try {
        const response = await apiClient.get<{ items: DirectoryRow[]; total: number }>(
          `/admin/${view}`,
          { page, search, ...(view === 'clinics' && status ? { status } : {}) },
          { signal: controller.signal },
        );
        if (!controller.signal.aborted) setResult(response);
      } catch (e: any) {
        if (!controller.signal.aborted) {
          setError(
            e.status === 403
              ? 'Platform access is no longer authorized. Refresh your session.'
              : 'Unable to load records. Please try again.',
          );
        }
      }
    }, search ? 250 : 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [view, status, page, search, retry]);

  const changePractitioner = async (row: DirectoryRow) => {
    const verified = !row.practitionerVerifiedAt;
    const registration = verified
      ? window.prompt('Enter the independently verified practitioner registration number:')
      : undefined;
    if (verified && !registration?.trim()) return;
    const reason = window.prompt(
      verified
        ? 'Record the verification evidence and reason:'
        : 'Reason for withdrawing practitioner access:',
    );
    if (!reason || reason.trim().length < 5) return;
    try {
      await apiClient.patch(`/admin/users/${row.id}/practitioner`, {
        verified,
        registration,
        reason,
      });
      setRetry(v => v + 1);
    } catch (e: any) {
      setError(e.message || 'Unable to update practitioner verification.');
    }
  };

  const title =
    view === 'clinics'
      ? status === 'SUSPENDED'
        ? 'Suspended Clinics'
        : status === 'TRIAL'
          ? 'Trial Clinics'
          : 'All Clinics'
      : view === 'users'
        ? 'Platform Users'
        : 'Subscriptions';

  return (
    <section className="pa-window-view">
      <div className="pa-view-header">
        <div>
          <h1>{title}</h1>
          <p>Live dental clinic platform records</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <label className="pa-search-pill">
            <Search size={15} />
            <input
              aria-label={`Search ${view}`}
              value={search}
              maxLength={100}
              placeholder={view === 'users' ? 'Search by name' : 'Search clinics'}
              onChange={e => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <button type="button" className="pa-back-pill" onClick={onBack}>
            <ArrowLeft size={14} /> Overview
          </button>
        </div>
      </div>

      {error ? (
        <div className="pa-empty" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => setRetry(v => v + 1)}>
            Retry
          </button>
        </div>
      ) : !result ? (
        <p className="pa-empty" role="status">
          Loading records…
        </p>
      ) : (
        <>
          <div className="pa-table-wrap">
            <table className="pa-directory-table">
              <thead>
                <tr>
                  {(view === 'users'
                    ? ['Name', 'Clinic', 'Role', 'Access', 'Status']
                    : view === 'subscriptions'
                      ? ['Clinic', 'Plan', 'Status', 'Price / interval', 'Period ends']
                      : ['Clinic', 'Location', 'Plan', 'Status', 'Users']
                  ).map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.items.map(row => (
                  <tr key={row.id}>
                    {view === 'users' ? (
                      <>
                        <td>{row.fullName}</td>
                        <td>{row.clinic?.name || 'Platform'}</td>
                        <td>{row.role?.replace(/_/g, ' ')}</td>
                        <td>{row.isPlatformAdmin ? 'Platform admin' : 'Clinic staff'}</td>
                        <td>
                          {row.isActive ? 'Active' : 'Inactive'}
                          {row.isPrimaryContact &&
                            row.role === 'ORGANIZATION_ADMIN' &&
                            !row.isPlatformAdmin && (
                              <button
                                type="button"
                                className="pa-text-link"
                                style={{ marginLeft: '10px' }}
                                onClick={() => changePractitioner(row)}
                              >
                                {row.practitionerVerifiedAt
                                  ? 'Revoke practitioner access'
                                  : 'Verify practitioner'}
                              </button>
                            )}
                        </td>
                      </>
                    ) : view === 'subscriptions' ? (
                      <>
                        <td>{row.clinic?.name}</td>
                        <td>{row.plan?.name}</td>
                        <td>
                          <span className="pa-status-pill">{row.status}</span>
                        </td>
                        <td>
                          {row.currency} {Number(row.lockedPrice).toLocaleString()} /{' '}
                          {row.billingInterval?.toLowerCase()}
                        </td>
                        <td>
                          {row.currentPeriodEnd
                            ? new Date(row.currentPeriodEnd).toLocaleDateString()
                            : '—'}
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <button
                            type="button"
                            className="pa-text-link"
                            onClick={() => onClinic(row)}
                          >
                            {row.name}
                          </button>
                        </td>
                        <td>{[row.city, row.state].filter(Boolean).join(', ') || 'Not specified'}</td>
                        <td>{row.subscriptions?.[0]?.plan.name || 'No subscription'}</td>
                        <td>
                          <span className="pa-status-pill">{row.status}</span>
                        </td>
                        <td>{row._count?.users ?? 0}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {!result.items.length && <p className="pa-empty">No records match your filters.</p>}
          </div>

          <div className="pa-pagination">
            <span>{integer(result.total)} records</span>
            <button type="button" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              Previous
            </button>
            <span>Page {page}</span>
            <button
              type="button"
              disabled={page * 20 >= result.total}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}
    </section>
  );
}

export default function AdminDashboard({
  data,
  onRefresh,
  onSignOut,
  busy,
}: {
  data: DashboardData;
  onRefresh: () => void;
  onSignOut: () => void;
  busy: boolean;
}) {
  const [view, setView] = useState<View>('dashboard');
  const [status, setStatus] = useState('');
  const [dialog, setDialog] = useState<{ title: string; text: string } | null>(null);
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [mutating, setMutating] = useState(false);
  const [mutationError, setMutationError] = useState('');
  const [regionIndex, setRegionIndex] = useState(0);
  const [months, setMonths] = useState(6);

  // Plain White (Light) & Plain Black (Dark) Theme
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Interactive Dental Clinic Status & Subscription Coverage Mode
  const totalClinics = Math.max(0, data.summary.clinics);
  const trialCount = Math.max(0, totalClinics - data.summary.activeClinics);
  const [gaugeMode, setGaugeMode] = useState<GaugeMode>(
    data.summary.activeClinics > 0 ? 'active' : 'trial',
  );
  const [syncSpinning, setSyncSpinning] = useState(false);

  // Clock & Toast
  const [clock, setClock] = useState('09:41:07');
  const [toastMsg, setToastMsg] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  // Refs
  const toastTimerRef = useRef<number | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const overview = data.overview;
  const regions = overview?.regions || [];
  const region = regions[regionIndex] || regions[0];
  const activity = (overview?.activity || []).slice(-months);
  const maxActivity = Math.max(1, ...activity.map(a => a.clinics));
  const sortedClinics = useMemo(
    () =>
      [...(overview?.recentClinics || [])]
        .sort((a, b) => (b._count?.users || 0) - (a._count?.users || 0))
        .slice(0, 3),
    [overview?.recentClinics],
  );

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastVisible(false), 2300);
  }, []);

  useEffect(() => {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('pa-theme-dark', isDark);
    document.body.classList.toggle('pa-theme-dark', isDark);
    return () => {
      document.documentElement.classList.remove('pa-theme-dark');
      document.body.classList.remove('pa-theme-dark');
    };
  }, [theme]);

  useEffect(() => {
    const update = () => setClock(new Date().toTimeString().slice(0, 8));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!dialog && !selectedClinic) return;
    previousFocus.current = document.activeElement as HTMLElement;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDialog(null);
        setSelectedClinic(null);
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        closeRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      previousFocus.current?.focus();
    };
  }, [dialog, selectedClinic]);

  useEffect(() => {
    if (view === 'reports') {
      document
        .getElementById('pa-report-detail')
        ?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    }
  }, [view]);

  const go = (next: View, filter = '') => {
    setView(next);
    setStatus(filter);
  };

  const unavailable = (title: string, text: string) => setDialog({ title, text });

  const handleSync = () => {
    setSyncSpinning(true);
    window.setTimeout(() => setSyncSpinning(false), 1000);
    onRefresh();
    showToast(`Synced ${integer(totalClinics)} dental clinics`);
  };

  // Real Dental Status Coverage calculations
  const gaugeStats = useMemo(() => {
    const denom = Math.max(1, totalClinics);
    if (gaugeMode === 'active') {
      const count = data.summary.activeClinics;
      return {
        title: 'Clinic Subscription & Active Status',
        subtitle: 'Live clinics operating on active plans',
        count,
        pct: Math.round((count / denom) * 100),
        unitLabel: `of ${integer(totalClinics)} clinics live`,
        inspectLabel: 'View Active Clinics',
        onInspect: () => go('clinics', 'ACTIVE'),
      };
    }
    if (gaugeMode === 'plans') {
      const count = data.summary.activeSubscriptions;
      return {
        title: 'Dental Plan Enrollment Rate',
        subtitle: 'Clinics enrolled in active or trial plans',
        count,
        pct: Math.round((count / denom) * 100),
        unitLabel: `of ${integer(totalClinics)} clinics subscribed`,
        inspectLabel: 'Open Subscriptions',
        onInspect: () => go('subscriptions'),
      };
    }
    return {
      title: 'Trial Clinic Onboarding Pipeline',
      subtitle: 'Clinics currently evaluating DocMatrix EMR',
      count: trialCount,
      pct: Math.round((trialCount / denom) * 100),
      unitLabel: `of ${integer(totalClinics)} clinics in trial`,
      inspectLabel: 'Inspect Trial Clinics',
      onInspect: () => go('clinics', 'TRIAL'),
    };
  }, [
    gaugeMode,
    totalClinics,
    trialCount,
    data.summary.activeClinics,
    data.summary.activeSubscriptions,
  ]);

  const dialFraction = clamp(gaugeStats.pct / 100, 0, 1);
  const dialAngle = -135 + dialFraction * 270;
  const knobPos = polar(130, 130, 104, dialAngle);

  const railItems = [
    { label: 'Dashboard', icon: Home, action: () => go('dashboard'), active: view === 'dashboard' },
    { label: 'Clinics', icon: Building2, action: () => go('clinics'), active: view === 'clinics' },
    {
      label: 'Subscriptions',
      icon: Layers,
      action: () => go('subscriptions'),
      active: view === 'subscriptions',
    },
    { label: 'Platform Users', icon: Users, action: () => go('users'), active: view === 'users' },
    { label: 'Reports', icon: BarChart3, action: () => go('reports'), active: view === 'reports' },
    {
      label: 'Support',
      icon: Headphones,
      action: () =>
        unavailable(
          'Support',
          'A platform support-ticket workflow is not available yet. No support tickets have been created or changed.',
        ),
      active: false,
    },
    {
      label: 'Audit Logs',
      icon: ShieldCheck,
      action: () =>
        unavailable(
          'Security & Audit Logs',
          'Existing security logging remains enabled. A platform-wide audit log viewer is not available yet.',
        ),
      active: false,
    },
    {
      label: 'Settings',
      icon: Settings,
      action: () =>
        unavailable(
          'Platform Settings',
          'Platform settings management is not available yet. Your existing clinic settings remain unchanged.',
        ),
      active: false,
    },
  ];

  const topTabs: { view: View; label: string; icon: React.ComponentType<any> }[] = [
    { view: 'dashboard', label: 'Dental Overview', icon: Tooth },
    { view: 'clinics', label: 'Clinic Directory', icon: Building2 },
    { view: 'subscriptions', label: 'Plan Billing', icon: IndianRupee },
    { view: 'users', label: 'Dental Staff', icon: Stethoscope },
    { view: 'reports', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className={`platform-admin pa-mode-${theme}`}>
      <DentalSpatialRoom theme={theme} />

      <div className="pa-stage">
        <div className="pa-spatial-ui">
          <h1 className="pa-sr-only">Platform Admin Dashboard</h1>

          {/* Top Pill Tab Bar */}
          <div className="pa-tabbar-wrap">
            <div className="pa-tabbar pa-glass">
              {topTabs.map(tab => {
                const Icon = tab.icon;
                const isActive = view === tab.view;
                return (
                  <button
                    key={tab.view}
                    type="button"
                    className={`pa-tab-btn ${isActive ? 'active' : ''}`}
                    onClick={() => go(tab.view)}
                  >
                    <Icon />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pa-deck-row">
            {/* Left Slim Navigation Rail */}
            <aside className="pa-rail pa-glass">
              <nav aria-label="Platform administration" className="pa-rail-nav">
                {railItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      aria-label={item.label}
                      className={`pa-rail-btn ${item.active ? 'active' : ''}`}
                      onClick={item.action}
                    >
                      <Icon />
                      <span className="pa-rail-tip" aria-hidden="true">
                        {item.label}
                      </span>
                    </button>
                  );
                })}
                <div className="pa-rail-divider" aria-hidden="true" />
                <button
                  type="button"
                  aria-label="Sign out"
                  disabled={busy}
                  className="pa-rail-btn"
                  onClick={onSignOut}
                >
                  <LogOut />
                  <span className="pa-rail-tip" aria-hidden="true">
                    Sign out
                  </span>
                </button>
              </nav>
            </aside>

            {/* Main Viewport-Fitted Window */}
            <main className="pa-window pa-glass" aria-label="Platform Admin Dashboard">
              {view === 'clinics' || view === 'subscriptions' || view === 'users' ? (
                <Directory
                  key={`${view}-${status}`}
                  view={view}
                  status={status}
                  onClinic={setSelectedClinic}
                  onBack={() => go('dashboard')}
                />
              ) : view === 'reports' ? (
                <section id="pa-report-detail" className="pa-window-view">
                  <div className="pa-view-header">
                    <div>
                      <h2>Platform Report</h2>
                      <p>
                        DocMatrix Dental Network · {integer(overview?.admins ?? 1)} platform
                        admins · Updated {new Date(data.generatedAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" className="pa-back-pill" onClick={handleSync}>
                        <RefreshCw size={14} /> Refresh
                      </button>
                      <button
                        type="button"
                        className="pa-back-pill"
                        onClick={() => go('dashboard')}
                      >
                        <ArrowLeft size={14} /> Overview
                      </button>
                    </div>
                  </div>

                  <div className="pa-platform-grid">
                    <div className="pa-glass-tile mint">
                      <h3>Active Clinics</h3>
                      <div className="pa-big-metric">{integer(data.summary.activeClinics)}</div>
                      <p style={{ margin: '10px 0 0', fontSize: '13px', fontWeight: 600 }}>
                        {integer(data.summary.clinics)} Total Clinics ·{' '}
                        {integer(data.summary.clinicUsers)} Dental Staff
                      </p>
                    </div>

                    <div className="pa-glass-tile">
                      <h3>Platform Growth</h3>
                      <div className="pa-big-metric">
                        {overview?.growthPercent == null ? '—' : `${overview.growthPercent}%`}
                      </div>
                      <p style={{ margin: '10px 0 0', fontSize: '12.5px', color: 'var(--pa-muted)' }}>
                        This month: {overview?.newThisMonth ?? '—'} · Last month:{' '}
                        {overview?.newLastMonth ?? '—'}
                      </p>
                    </div>

                    <div className="pa-glass-tile">
                      <h3>Monthly Plan Value</h3>
                      <div className="pa-big-metric">
                        {overview ? money(overview.monthlyPlanValue) : '—'}
                      </div>
                      <div className="pa-bars">
                        {activity.map(item => (
                          <div className="pa-bar-col" key={item.month}>
                            <div className="pa-bar-track">
                              <div
                                className="pa-bar-fill"
                                style={{
                                  height: `${(item.clinics / maxActivity) * 100}%`,
                                  minHeight: item.clinics ? 5 : 0,
                                }}
                              />
                            </div>
                            <span>
                              {new Date(item.month).toLocaleString('en', {
                                month: 'short',
                                timeZone: 'UTC',
                              })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pa-platform-grid" style={{ gridTemplateColumns: '1.2fr 1fr' }}>
                    <div className="pa-glass-tile">
                      <h3>Top Registered Dental Clinics</h3>
                      {sortedClinics.length ? (
                        sortedClinics.map(clinic => (
                          <button
                            key={clinic.id}
                            type="button"
                            className="pa-clinic-list-row"
                            onClick={() => setSelectedClinic(clinic)}
                          >
                            <span>
                              <strong>{clinic.name}</strong>
                              <span
                                style={{
                                  display: 'block',
                                  fontSize: '11.5px',
                                  color: 'var(--pa-muted)',
                                }}
                              >
                                {clinic.subscriptions?.[0]?.plan.name || 'No plan'} · {clinic.status}
                              </span>
                            </span>
                            <span className="pa-status-pill">
                              {clinic._count?.users ?? 0} users
                            </span>
                          </button>
                        ))
                      ) : (
                        <p style={{ color: 'var(--pa-muted)', fontSize: '13px' }}>
                          No clinics registered yet.
                        </p>
                      )}
                    </div>

                    <div className="pa-glass-tile">
                      <h3>Compliance & Billing Summary</h3>
                      <p style={{ fontSize: '12.5px', color: 'var(--pa-muted)', lineHeight: 1.55 }}>
                        Registered clinics: {integer(data.summary.clinics)} · Active clinics:{' '}
                        {integer(data.summary.activeClinics)} · Active / trial subscriptions:{' '}
                        {integer(data.summary.activeSubscriptions)}.
                      </p>
                      <p style={{ fontSize: '12px', color: 'var(--pa-muted)', lineHeight: 1.55 }}>
                        Monthly plan value includes active non-trial INR subscriptions, normalized by
                        billing interval.
                      </p>
                    </div>
                  </div>
                </section>
              ) : (
                /* 100% Fitted 7-Box Dental Clinic Platform Admin Overview */
                <div className="pa-bento-grid">
                  {/* Box 1: Dental Network Command Hub */}
                  <div className="pa-inner-card pa-network-card">
                    <div className="pa-net-head">
                      <div className="pa-net-title-wrap">
                        <span className="pa-net-badge">
                          <Tooth size={18} />
                        </span>
                        <div>
                          <h2>DocMatrix Dental Network</h2>
                          <p>Multi-clinic dental EMR & SaaS registry</p>
                        </div>
                      </div>
                      <div className="pa-net-status-row">
                        <span className="pa-live-pill">
                          <span className="pa-live-dot" />
                          {integer(data.summary.activeClinics)} Active
                        </span>
                        <span className="pa-clock-pill">SYNC · {clock}</span>
                      </div>
                    </div>

                    <div className="pa-net-kpis">
                      <div className="pa-net-kpi-box">
                        <div className="pa-net-kpi-top">
                          <span>Registered Clinics</span>
                          <Building2 size={13} />
                        </div>
                        <div className="pa-net-kpi-val">{integer(totalClinics)}</div>
                        <div className="pa-net-kpi-sub">
                          {integer(trialCount)} trial · {integer(data.summary.activeClinics)} live
                        </div>
                      </div>

                      <div className="pa-net-kpi-box">
                        <div className="pa-net-kpi-top">
                          <span>Dental Workforce</span>
                          <Stethoscope size={13} />
                        </div>
                        <div className="pa-net-kpi-val">{integer(data.summary.clinicUsers)}</div>
                        <div className="pa-net-kpi-sub">Dentists & clinic staff</div>
                      </div>

                      <div className="pa-net-kpi-box">
                        <div className="pa-net-kpi-top">
                          <span>Active Plans</span>
                          <CalendarCheck size={13} />
                        </div>
                        <div className="pa-net-kpi-val">
                          {integer(data.summary.activeSubscriptions)}
                        </div>
                        <div className="pa-net-kpi-sub">Paid & trial clinic plans</div>
                      </div>
                    </div>

                    <div className="pa-net-foot">
                      <span>
                        {overview
                          ? `${integer(overview.newToday)} new sign-ups today · ${integer(overview.newThisMonth)} this month`
                          : 'Connected to live clinic registry'}
                      </span>
                      <button type="button" onClick={() => go('clinics')}>
                        Manage Dental Clinics <ArrowRight size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Box 2: Dental Clinic Status & Subscription Coverage (Real Live Metrics!) */}
                  <div className="pa-inner-card pa-dial-card">
                    <div className="pa-dial-head">
                      <div>
                        <h2 className="pa-dial-title">{gaugeStats.title}</h2>
                        <p className="pa-dial-subtitle">{gaugeStats.subtitle}</p>
                      </div>
                      <button
                        type="button"
                        className="pa-gear-btn"
                        aria-label="Open platform settings"
                        onClick={() =>
                          unavailable(
                            'Platform Settings',
                            'Platform settings management is not available yet. Your existing clinic settings remain unchanged.',
                          )
                        }
                      >
                        <Settings size={15} />
                      </button>
                    </div>

                    <div className="pa-coverage-tabs" role="tablist" aria-label="Clinic coverage view">
                      <button
                        type="button"
                        role="tab"
                        aria-selected={gaugeMode === 'active'}
                        className={`pa-coverage-pill ${gaugeMode === 'active' ? 'active' : ''}`}
                        onClick={() => setGaugeMode('active')}
                      >
                        Active ({integer(data.summary.activeClinics)})
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={gaugeMode === 'trial'}
                        className={`pa-coverage-pill ${gaugeMode === 'trial' ? 'active' : ''}`}
                        onClick={() => setGaugeMode('trial')}
                      >
                        Trial ({integer(trialCount)})
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={gaugeMode === 'plans'}
                        className={`pa-coverage-pill ${gaugeMode === 'plans' ? 'active' : ''}`}
                        onClick={() => setGaugeMode('plans')}
                      >
                        Plans ({integer(data.summary.activeSubscriptions)})
                      </button>
                    </div>

                    <div className="pa-dial-body">
                      <div className="pa-dial-stage">
                        <svg viewBox="0 0 260 260" className="pa-dial-svg">
                          <defs>
                            <linearGradient id="pa-dial-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#e3fbb0" />
                              <stop offset="48%" stopColor="#8ef0d6" />
                              <stop offset="100%" stopColor="#3cc4b4" />
                            </linearGradient>
                          </defs>

                          <path
                            d={describeArc(130, 130, 104, -135, 135)}
                            fill="none"
                            stroke="var(--pa-dial-track)"
                            strokeWidth="22"
                            strokeLinecap="round"
                          />

                          {Array.from({ length: 31 }).map((_, idx) => {
                            const deg = -135 + (idx / 30) * 270;
                            const isMajor = idx % 5 === 0;
                            const p1 = polar(130, 130, isMajor ? 74 : 79, deg);
                            const p2 = polar(130, 130, 86, deg);
                            const activeTick = dialFraction > 0 && deg <= dialAngle + 1;
                            return (
                              <line
                                key={idx}
                                x1={p1.x}
                                y1={p1.y}
                                x2={p2.x}
                                y2={p2.y}
                                stroke={
                                  activeTick ? 'var(--pa-dial-tick-active)' : 'var(--pa-dial-tick)'
                                }
                                strokeWidth={isMajor ? 2 : 1.2}
                                strokeLinecap="round"
                              />
                            );
                          })}

                          {dialFraction > 0.01 && (
                            <path
                              d={describeArc(130, 130, 104, -135, dialAngle)}
                              fill="none"
                              stroke="url(#pa-dial-grad)"
                              strokeWidth="22"
                              strokeLinecap="round"
                            />
                          )}

                          {dialFraction > 0 && (
                            <circle
                              cx={knobPos.x}
                              cy={knobPos.y}
                              r={10.5}
                              fill="#ffffff"
                              style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.28))' }}
                            />
                          )}
                        </svg>

                        <div className="pa-dial-center">
                          <strong>{gaugeStats.pct}%</strong>
                          <span>{gaugeStats.unitLabel}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pa-dial-foot">
                      <span>
                        Growth:{' '}
                        <strong>
                          {overview?.growthPercent == null
                            ? '—'
                            : `${overview.growthPercent >= 0 ? '+' : ''}${overview.growthPercent}%`}
                        </strong>
                      </span>
                      <span>
                        Admins: <strong>{integer(overview?.admins ?? 1)}</strong>
                      </span>
                      <button
                        type="button"
                        className="pa-dial-inspect"
                        onClick={gaugeStats.onInspect}
                      >
                        {gaugeStats.inspectLabel} <ArrowRight size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Box 3: Dental Registry Sync Pill */}
                  <div
                    role="button"
                    tabIndex={0}
                    className="pa-inner-card pa-scene-pill"
                    onClick={handleSync}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSync();
                      }
                    }}
                  >
                    <span className={`pa-scene-icon-circle ${syncSpinning ? 'spinning' : ''}`}>
                      <RefreshCw size={15} />
                    </span>
                    <div className="pa-scene-meta">
                      <strong>Sync Clinic Registry</strong>
                      <span>
                        {overview
                          ? `${integer(overview.newToday)} sign-ups today`
                          : 'Refresh platform data'}
                      </span>
                    </div>
                    <span className="pa-scene-play">
                      <ArrowRight size={14} />
                    </span>
                  </div>

                  {/* Box 4: Top Registered Dental Clinics */}
                  <div className="pa-inner-card pa-clinics-card">
                    <div className="pa-clinics-card-head">
                      <div className="pa-clinics-card-icons">
                        <span className="pa-round-badge">
                          <Tooth size={14} />
                        </span>
                        <span className="pa-clinics-card-sub">Top Clinics</span>
                      </div>
                      <button
                        type="button"
                        className="pa-text-link"
                        style={{ fontSize: '11px' }}
                        onClick={() => go('clinics')}
                      >
                        View all
                      </button>
                    </div>

                    <div className="pa-top-clinics-list">
                      {sortedClinics.length ? (
                        sortedClinics.map((clinic, idx) => (
                          <button
                            key={clinic.id}
                            type="button"
                            className="pa-mini-clinic-row"
                            onClick={() => setSelectedClinic(clinic)}
                          >
                            <span className="pa-mini-rank">{idx + 1}</span>
                            <span className="pa-mini-clinic-name">
                              <strong>{clinic.name}</strong>
                              <small>
                                <i className={clinic.status === 'ACTIVE' ? 'active' : ''} />
                                {clinic.subscriptions?.[0]?.plan.name || 'No plan'} · {clinic.status}
                              </small>
                            </span>
                            <span className="pa-mini-users">{clinic._count?.users ?? 0} users</span>
                          </button>
                        ))
                      ) : (
                        <p style={{ fontSize: '12px', color: 'var(--pa-muted)', margin: 'auto 0' }}>
                          No clinics registered yet.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Box 5: Mint-Gradient Active Clinics Hero Card */}
                  <div className="pa-inner-card pa-hero-mint-card">
                    <div className="pa-mint-top">
                      <span className="pa-tooth-badge">
                        <Tooth size={18} />
                      </span>
                      <span className="pa-mint-status-tag">
                        {integer(data.summary.activeSubscriptions)} plans
                      </span>
                    </div>

                    <div>
                      <div className="pa-mint-big">{integer(data.summary.activeClinics)}</div>
                      <h4>Active Clinics</h4>
                      <div className="pa-mint-stats-row">
                        <span>
                          <span>Total Clinics</span> <strong>{integer(totalClinics)}</strong>
                        </span>
                        <span>
                          • <strong>{integer(data.summary.clinicUsers)}</strong> Users
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Box 6: Light / Dark Theme Mode Switcher Pill */}
                  <div className="pa-inner-card pa-theme-card" role="group" aria-label="Theme mode">
                    <button
                      type="button"
                      className={`pa-mode-btn ${theme === 'light' ? 'active' : ''}`}
                      onClick={() => {
                        setTheme('light');
                        showToast('Switched to Light Mode');
                      }}
                    >
                      <Sun size={14} />
                      <span>Light</span>
                    </button>
                    <button
                      type="button"
                      className={`pa-mode-btn ${theme === 'dark' ? 'active' : ''}`}
                      onClick={() => {
                        setTheme('dark');
                        showToast('Switched to Dark Mode');
                      }}
                    >
                      <Moon size={14} />
                      <span>Dark</span>
                    </button>
                  </div>

                  {/* Box 7: Revenue Overview, Growth Bars & Region Matrix */}
                  <div className="pa-inner-card pa-revenue-card">
                    <div className="pa-rev-left">
                      <div className="pa-rev-currency-row">
                        <span className="pa-currency-pill">₹</span>
                        <TrendingUp size={14} color="#00a396" />
                      </div>
                      <div>
                        <div className="pa-rev-value">
                          {overview ? money(overview.monthlyPlanValue) : '—'}
                        </div>
                        <div className="pa-rev-sub">Monthly plan value · INR</div>
                      </div>
                      <label className="pa-region-select-box">
                        <select
                          aria-label="Select clinic region"
                          value={region ? `${region.country}|${region.state}` : ''}
                          onChange={e =>
                            setRegionIndex(
                              regions.findIndex(r => `${r.country}|${r.state}` === e.target.value),
                            )
                          }
                        >
                          {regions.length ? (
                            regions.map(r => (
                              <option
                                key={`${r.country}|${r.state}`}
                                value={`${r.country}|${r.state}`}
                              >
                                {r.state} · {r.country}
                              </option>
                            ))
                          ) : (
                            <option value="">No regions</option>
                          )}
                        </select>
                        <small className="pa-region-count">
                          {region ? `${integer(region.clinics)} Clinics` : '0 Clinics'}
                        </small>
                      </label>
                    </div>

                    <div className="pa-rev-right">
                      <div className="pa-rev-top">
                        <span className="pa-now-chip">
                          <span className="pa-note-badge">
                            <BarChart3 size={11} />
                          </span>
                          <span>Clinic Registrations</span>
                        </span>

                        <select
                          aria-label="Chart period"
                          className="pa-period-select"
                          value={months}
                          onChange={e => setMonths(Number(e.target.value))}
                        >
                          <option value={6}>6 months</option>
                          <option value={3}>3 months</option>
                        </select>
                      </div>

                      <div className="pa-mini-bars" aria-label="Monthly clinic registrations">
                        {activity.length ? (
                          activity.map(item => (
                            <div className="pa-bar-col" key={item.month}>
                              <div className="pa-bar-track">
                                <div
                                  className="pa-bar-fill"
                                  style={{
                                    height: `${(item.clinics / maxActivity) * 100}%`,
                                    minHeight: item.clinics ? 5 : 0,
                                  }}
                                  title={`${new Date(item.month).toLocaleString('en', {
                                    month: 'short',
                                    timeZone: 'UTC',
                                  })}: ${item.clinics} clinics`}
                                />
                              </div>
                              <span>
                                {new Date(item.month).toLocaleString('en', {
                                  month: 'short',
                                  timeZone: 'UTC',
                                })}
                              </span>
                            </div>
                          ))
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--pa-muted)' }}>
                            No registration history yet
                          </span>
                        )}
                      </div>

                      <div className="pa-rev-actions">
                        <button
                          type="button"
                          className="pa-rev-pill"
                          onClick={() =>
                            unavailable(
                              'Pending Approvals',
                              'Clinic registration currently creates trial accounts directly. There is no pending-approval state or approval workflow in the existing system.',
                            )
                          }
                        >
                          Pending Approvals
                        </button>
                        <button
                          type="button"
                          className="pa-rev-pill"
                          onClick={() => go('clinics', 'SUSPENDED')}
                        >
                          Suspended Clinics
                        </button>
                        <button
                          type="button"
                          className="pa-rev-cta"
                          onClick={() => go('reports')}
                        >
                          VIEW FULL REPORT <ArrowRight size={10} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>
      </div>

      {/* Floating Toast */}
      <div className={`pa-toast pa-glass ${toastVisible ? 'visible' : ''}`} role="status">
        <span className="pa-toast-check">
          <Check size={13} strokeWidth={2.5} />
        </span>
        <span>{toastMsg}</span>
      </div>

      {/* Detail / Status Modal */}
      {(dialog || selectedClinic) && (
        <div
          className="pa-dialog-backdrop"
          onClick={() => {
            setDialog(null);
            setSelectedClinic(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="pa-dialog-title"
            className="pa-dialog pa-glass"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              ref={closeRef}
              className="pa-dialog-close"
              aria-label="Close dialog"
              onClick={() => {
                setDialog(null);
                setSelectedClinic(null);
              }}
            >
              <X size={18} />
            </button>
            <div className="pa-dialog-icon">
              {selectedClinic ? <Tooth size={20} /> : <Check size={20} />}
            </div>
            <h2 id="pa-dialog-title">{selectedClinic?.name || dialog?.title}</h2>
            {selectedClinic ? (
              <>
                <dl>
                  <dt>Status</dt>
                  <dd>{selectedClinic.status}</dd>
                  <dt>Plan</dt>
                  <dd>{selectedClinic.subscriptions?.[0]?.plan.name || 'No subscription'}</dd>
                  <dt>Location</dt>
                  <dd>
                    {[selectedClinic.city, selectedClinic.state, selectedClinic.country]
                      .filter(Boolean)
                      .join(', ') || 'Not specified'}
                  </dd>
                  <dt>Staff accounts</dt>
                  <dd>{selectedClinic._count?.users ?? 0}</dd>
                  <dt>Joined</dt>
                  <dd>{new Date(selectedClinic.createdAt).toLocaleDateString()}</dd>
                </dl>
                <label>
                  Clinic access
                  <select
                    aria-label="Clinic access"
                    value={selectedClinic.status}
                    disabled={mutating}
                    onChange={async e => {
                      const nextStatus = e.target.value;
                      const reason = window.prompt('Reason for changing clinic access:');
                      if (!reason || reason.trim().length < 5) return;
                      setMutating(true);
                      setMutationError('');
                      try {
                        const updated = await apiClient.patch<Clinic>(
                          `/admin/clinics/${selectedClinic.id}/status`,
                          { status: nextStatus, reason },
                        );
                        setSelectedClinic({ ...selectedClinic, ...updated });
                        onRefresh();
                      } catch (err: any) {
                        setMutationError(err.message || 'Unable to change clinic access.');
                      } finally {
                        setMutating(false);
                      }
                    }}
                  >
                    {['ACTIVE', 'TRIAL', 'SUSPENDED', 'READ_ONLY', 'CLOSED'].map(st => (
                      <option key={st}>{st}</option>
                    ))}
                  </select>
                </label>
                {mutationError && <p role="alert">{mutationError}</p>}
              </>
            ) : (
              <p>{dialog?.text}</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
