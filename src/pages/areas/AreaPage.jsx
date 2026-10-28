import React, { useState, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { FEATURE_REGISTRY, getRoadmapFeatures } from '@/features/registry'
import { DemoBanner } from '@/components/DemoBanner'
import { findDemoUserById } from '@/mocks/auth'
import {
  Calendar, Users, Stethoscope, Receipt, BookOpen, Package, MessageSquare,
  Globe, BarChart3, Settings, Milestone, ArrowRight, ArrowLeft, Home,
  Lock, CheckCircle2, Sparkles, Compass, Search, Filter, ShieldCheck
} from 'lucide-react'

const AREA_META = {
  appointments: {
    title: 'Appointments & Clinic Operations',
    icon: Calendar,
    desc: 'Smart scheduling, doctor rosters, and appointment management.'
  },
  patients: {
    title: 'Patients & Dental Records',
    icon: Users,
    desc: 'Permanent patient profiles, medical alerts, visit timeline, and interactive tooth charts.'
  },
  clinical: {
    title: 'Clinical Workflows & Prescriptions',
    icon: Stethoscope,
    desc: 'Letterhead digital prescriptions, clinical notes, master lists, and diagnostic orders.'
  },
  billing: {
    title: 'Billing, Invoices & Daily Collection',
    icon: Receipt,
    desc: 'Itemised treatment invoices, part payments, daily collections, and GST price lists.'
  },
  accounts: {
    title: 'Accounts, Ledgers & Tally Export',
    icon: BookOpen,
    desc: 'Double-entry accounting, day book, profit and loss, balance sheets, and Tally export.'
  },
  inventory: {
    title: 'Inventory & Dental Lab Supplies',
    icon: Package,
    desc: 'Real-time stock quantities, reorder alerts, expiry tracking, and dental lab orders.'
  },
  whatsapp: {
    title: 'WhatsApp Automation & Reminders',
    icon: MessageSquare,
    desc: 'Automated 24h & 2h appointment alerts, prescription delivery, and recall campaigns.'
  },
  website: {
    title: 'Clinic Website & Online Booking',
    icon: Globe,
    desc: 'Online patient booking on real slots, reviews showcase, and booking approval inbox.'
  },
  reports: {
    title: 'Reports & Clinical Practice Analytics',
    icon: BarChart3,
    desc: 'Revenue insights, doctor performance metrics, dues ageing, and booking conversion tracking.'
  },
  settings: {
    title: 'Clinic Settings & Administration',
    icon: Settings,
    desc: 'Clinic profile configuration, staff permissions, activity audit logs, and data exports.'
  },
  roadmap: {
    title: 'Product Roadmap (Version 2 & Later)',
    icon: Milestone,
    desc: 'Upcoming advanced features planned for Version 2 and future expansion releases.'
  }
}

export function AreaPage({ areaKey }) {
  const [filterQuery, setFilterQuery] = useState('')

  const meta = AREA_META[areaKey] || {
    title: `${areaKey.charAt(0).toUpperCase() + areaKey.slice(1)} Area`,
    icon: Compass,
    desc: 'Operational management area for DocMatrix clinic features.'
  }

  const Icon = meta.icon
  const isRoadmap = areaKey === 'roadmap'

  const sessionUserId = typeof window !== 'undefined' ? sessionStorage.getItem('docmatrix-demo-session') : null
  const currentUser = sessionUserId ? findDemoUserById(sessionUserId) : null
  const userRole = currentUser?.role || 'ORGANIZATION_ADMIN'

  // Features belonging to this area
  const allFeatures = isRoadmap
    ? getRoadmapFeatures()
    : FEATURE_REGISTRY.filter((f) => f.area.toLowerCase() === areaKey.toLowerCase() && f.phase === 'launch' && f.inNav)

  // Filtered by search query if any
  const filteredFeatures = useMemo(() => {
    if (!filterQuery.trim()) return allFeatures
    const q = filterQuery.toLowerCase()
    return allFeatures.filter((f) =>
      f.name.toLowerCase().includes(q) ||
      (f.desc && f.desc.toLowerCase().includes(q)) ||
      (f.route && f.route.toLowerCase().includes(q))
    )
  }, [allFeatures, filterQuery])

  // Accounts features for billing cross-navigation (Problem P5)
  const accountsFeatures = areaKey === 'billing'
    ? FEATURE_REGISTRY.filter((f) => f.area.toLowerCase() === 'accounts' && f.phase === 'launch')
    : []

  return (
    <div className="area-page-container" style={{ minHeight: '100vh', background: 'var(--paper, #fbfbf9)', display: 'flex', flexDirection: 'column' }} data-testid={`area-page-${areaKey}`}>
      {/* Top Header with Glassmorphism */}
      <header className="area-page-header" style={{
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--line, #e9e9e5)',
        padding: '12px clamp(16px, 3vw, 32px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 90,
        boxShadow: '0 1px 6px rgba(0, 0, 0, 0.03)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            to="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 13px',
              borderRadius: '999px',
              border: '1px solid var(--line, #e9e9e5)',
              background: '#ffffff',
              fontSize: '12px',
              fontWeight: '700',
              color: 'var(--charcoal-dark, #111a1a)',
              textDecoration: 'none',
              transition: 'all 0.18s ease'
            }}
          >
            <Home size={13} style={{ color: 'var(--teal-primary, #008891)' }} />
            <span>Clinic Dashboard</span>
          </Link>
          <span style={{ color: 'var(--line, #e9e9e5)' }}>|</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '10px', fontWeight: '800', background: 'rgba(0, 136, 145, 0.1)', color: 'var(--teal-primary, #008891)', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
              Area
            </span>
            <span style={{ fontSize: '13.5px', fontWeight: '800', color: 'var(--charcoal-title, #1a2626)' }}>
              {meta.title}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '999px',
              background: 'rgba(0, 136, 145, 0.08)',
              color: 'var(--teal-primary, #008891)',
              fontSize: '12px',
              fontWeight: '700',
              textDecoration: 'none'
            }}
          >
            <span>DocMatrix Home</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '32px clamp(16px, 4vw, 40px)', maxWidth: '1120px', margin: '0 auto', width: '100%' }}>
        {/* Area Header Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(0, 136, 145, 0.08) 0%, rgba(221, 244, 239, 0.45) 55%, #ffffff 100%)',
          borderRadius: '20px',
          border: '1px solid rgba(0, 136, 145, 0.22)',
          padding: '28px clamp(20px, 3vw, 36px)',
          marginBottom: '28px',
          boxShadow: '0 4px 20px rgba(0, 136, 145, 0.04)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'var(--teal-primary, #008891)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(0, 136, 145, 0.3)'
              }}>
                <Icon size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: '800', color: 'var(--teal-primary, #008891)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    CLINICAL PRACTICE MODULE
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: '800', background: '#ecfdf5', color: '#047857', padding: '1px 6px', borderRadius: '4px' }}>
                    ABDM M1
                  </span>
                </div>
                <h1 style={{ fontSize: '24px', fontWeight: '850', color: 'var(--charcoal-title, #1a2626)', margin: '2px 0 0 0' }}>
                  {meta.title}
                </h1>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                fontSize: '12px',
                fontWeight: '750',
                color: 'var(--charcoal-dark, #111a1a)',
                background: '#ffffff',
                border: '1px solid var(--line, #e9e9e5)',
                padding: '5px 12px',
                borderRadius: '999px'
              }}>
                {allFeatures.length} Sub-pages Connected
              </span>
            </div>
          </div>

          <p style={{ fontSize: '14px', color: 'var(--charcoal-body, #475554)', lineHeight: '1.6', maxWidth: '780px', margin: 0 }}>
            {meta.desc}
          </p>

          {/* Sub-pages Pills Quick Bar */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(0, 136, 145, 0.15)' }}>
            <span style={{ fontSize: '11.5px', fontWeight: '800', color: 'var(--charcoal-muted, #6e7e7d)', alignSelf: 'center', marginRight: '6px' }}>
              Quick Jump:
            </span>
            {allFeatures.map((feat) => {
              const targetUrl = isRoadmap
                ? `/coming-soon/${feat.id}`
                : feat.route.replace(':id', feat.area === 'Patients' ? 'pt-1001' : 'apt-101')
              return (
                <Link
                  key={feat.id}
                  to={targetUrl}
                  style={{
                    fontSize: '11.5px',
                    fontWeight: '700',
                    padding: '4px 11px',
                    borderRadius: '999px',
                    background: '#ffffff',
                    color: 'var(--charcoal-dark, #111a1a)',
                    border: '1px solid var(--line, #e9e9e5)',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--teal-primary, #008891)'
                    e.currentTarget.style.color = 'var(--teal-primary, #008891)'
                    e.currentTarget.style.background = 'rgba(0, 136, 145, 0.05)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--line, #e9e9e5)'
                    e.currentTarget.style.color = 'var(--charcoal-dark, #111a1a)'
                    e.currentTarget.style.background = '#ffffff'
                  }}
                >
                  {feat.name}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Sub-pages Header Bar with Live Filter Search */}
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '850', color: 'var(--charcoal-title, #1a2626)', margin: 0 }}>
              All Subpages in {meta.title.split('&')[0].trim()} ({allFeatures.length})
            </h2>
            <span style={{ fontSize: '12px', color: 'var(--charcoal-muted, #6e7e7d)' }}>
              Verified clinical workflows under single-source registry
            </span>
          </div>

          {/* Quick Filter Input */}
          <div style={{ position: 'relative', width: '240px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--charcoal-muted, #6e7e7d)' }} />
            <input
              type="text"
              placeholder={`Filter ${allFeatures.length} pages...`}
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 12px 6px 32px',
                borderRadius: '999px',
                border: '1px solid var(--line, #e9e9e5)',
                fontSize: '12px',
                background: '#ffffff',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Sub-pages Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px'
        }}>
          {filteredFeatures.map((feat) => {
            const targetUrl = isRoadmap
              ? `/coming-soon/${feat.id}`
              : feat.route.replace(':id', feat.area === 'Patients' ? 'pt-1001' : 'apt-101')
            return (
              <Link
                key={feat.id}
                to={targetUrl}
                className="dm-dash-card"
                style={{
                  padding: '22px',
                  textDecoration: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: feat.phase === 'launch' ? 'rgba(0, 136, 145, 0.08)' : '#e0e7ff',
                      color: feat.phase === 'launch' ? 'var(--teal-primary, #008891)' : '#3730a3',
                      letterSpacing: '0.04em'
                    }}>
                      {feat.phase === 'launch' ? 'LAUNCH READY' : feat.phase.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--charcoal-muted, #6e7e7d)', fontFamily: 'monospace' }}>
                      {feat.source}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '16px', fontWeight: '850', color: 'var(--charcoal-title, #1a2626)', marginBottom: '6px' }}>
                    {feat.name}
                  </h3>
                  <p style={{ fontSize: '12.5px', color: 'var(--charcoal-body, #475554)', lineHeight: '1.55', marginBottom: '16px' }}>
                    {feat.desc || feat.description}
                  </p>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--line, #e9e9e5)',
                  fontSize: '11.5px',
                  color: 'var(--teal-primary, #008891)',
                  fontWeight: '750'
                }}>
                  <span style={{ fontFamily: 'monospace', color: 'var(--charcoal-muted, #6e7e7d)', fontSize: '11px' }}>
                    {targetUrl}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    Open Module <ArrowRight size={13} />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Cross-linking for Accounts from Billing Area Hub (Problem P5) */}
        {accountsFeatures.length > 0 && (
          <div style={{ marginTop: '40px' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(0, 136, 145, 0.06) 0%, #ffffff 100%)',
              border: '1px solid rgba(0, 136, 145, 0.2)',
              borderRadius: '16px',
              padding: '18px 22px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                  <ShieldCheck size={16} style={{ color: 'var(--teal-primary, #008891)' }} />
                  <h2 style={{ fontSize: '16px', fontWeight: '850', color: 'var(--charcoal-title, #1a2626)', margin: 0 }}>
                    Accounts & Financial Ledgers ({accountsFeatures.length})
                  </h2>
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--charcoal-muted, #6e7e7d)', margin: 0 }}>
                  Double-entry accounting, day book, GST reports, and automated Tally XML sync
                </p>
              </div>
              <Link
                to="/accounts"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '999px',
                  background: 'var(--teal-primary, #008891)',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: '750',
                  textDecoration: 'none',
                  boxShadow: '0 4px 12px rgba(0, 136, 145, 0.25)'
                }}
              >
                <span>Accounts Hub</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '16px'
            }}>
              {accountsFeatures.map((feat) => {
                const isRestricted = !['ORGANIZATION_ADMIN', 'ACCOUNTANT'].includes(userRole)
                return (
                  <Link
                    key={feat.id}
                    to={feat.route}
                    className="dm-dash-card"
                    style={{
                      padding: '20px',
                      textDecoration: 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      opacity: isRestricted ? 0.82 : 1
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background: isRestricted ? '#fee2e2' : 'rgba(0, 136, 145, 0.08)',
                          color: isRestricted ? '#dc2626' : 'var(--teal-primary, #008891)'
                        }}>
                          {isRestricted ? 'RESTRICTED (ADMIN/ACCOUNTS)' : 'LAUNCH READY'}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--charcoal-muted, #6e7e7d)', fontFamily: 'monospace' }}>
                          {feat.source}
                        </span>
                      </div>
                      <h3 style={{ fontSize: '15px', fontWeight: '850', color: 'var(--charcoal-title, #1a2626)', marginBottom: '6px' }}>
                        {feat.name}
                      </h3>
                      <p style={{ fontSize: '12.5px', color: 'var(--charcoal-body, #475554)', lineHeight: '1.5', marginBottom: '16px' }}>
                        {feat.desc || feat.description}
                      </p>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--line, #e9e9e5)',
                      fontSize: '11.5px',
                      color: 'var(--teal-primary, #008891)',
                      fontWeight: '750'
                    }}>
                      <span style={{ fontFamily: 'monospace', color: 'var(--charcoal-muted, #6e7e7d)', fontSize: '11px' }}>
                        {feat.route}
                      </span>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        Open Page <ArrowRight size={13} />
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default AreaPage

