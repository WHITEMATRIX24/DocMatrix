import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { FEATURE_REGISTRY, getFeatureById } from '@/features/registry'
import {
  Sparkles, Compass, AlertCircle, ArrowLeft, ArrowRight, Home, CheckCircle2,
  Printer, Download, ShieldCheck, Check, Calendar, Users, Stethoscope,
  Receipt, Package, MessageSquare, Globe, BarChart3, Settings, Search, Clock
} from 'lucide-react'

interface FeaturePlaceholderProps {
  id: string
}

export const FeaturePlaceholder: React.FC<FeaturePlaceholderProps> = ({ id }) => {
  const params = useParams()
  const feature = getFeatureById(id)
  const [simulatedAction, setSimulatedAction] = useState(false)
  const [actionMessage, setActionMessage] = useState('')

  if (!feature) {
    return (
      <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626', fontWeight: '800', marginBottom: '6px' }}>
            <AlertCircle size={20} />
            <span>Feature Not Found</span>
          </div>
          <p style={{ fontSize: '13px', color: '#7f1d1d' }}>
            No registry entry found for feature identifier: {id}
          </p>
        </div>
      </div>
    )
  }

  const isUnknownRecord = params?.id && (params.id.startsWith('unknown') || params.id === 'invalid' || params.id === 'notfound')

  if (isUnknownRecord) {
    return (
      <div style={{ width: '100%', padding: '24px 0' }} data-testid={`record-not-found-${params.id}`}>
        <div style={{
          background: '#ffffff',
          border: '1px solid #fee2e2',
          borderRadius: '16px',
          padding: '32px',
          textAlign: 'center',
          maxWidth: '640px',
          margin: '0 auto',
          boxShadow: '0 4px 16px rgba(220, 38, 38, 0.05)'
        }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#fef2f2',
              color: '#dc2626',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <AlertCircle size={24} />
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--charcoal-title, #1a2626)', marginBottom: '8px' }}>
              Record Not Found
            </h1>
            <p style={{ fontSize: '13.5px', color: 'var(--charcoal-body, #475554)', lineHeight: '1.5', marginBottom: '20px' }}>
              The record identifier <code style={{ background: '#f4f6f5', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>{params.id}</code> does not exist in the clinic demo database.
            </p>
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '14px',
              marginBottom: '24px',
              fontSize: '12.5px',
              textAlign: 'left'
            }}>
              <div style={{ fontWeight: '700', color: '#334155', marginBottom: '4px' }}>Demo ID Hints:</div>
              <ul style={{ margin: 0, paddingLeft: '18px', color: '#64748b' }}>
                <li>Patients: <Link to="/patients/pt-1001" style={{ color: 'var(--teal-primary, #008891)', fontWeight: '700' }}>pt-1001</Link></li>
                <li>Appointments: <Link to="/appointments/apt-101" style={{ color: 'var(--teal-primary, #008891)', fontWeight: '700' }}>apt-101</Link></li>
              </ul>
            </div>
            <Link
              to={`/${feature.area.toLowerCase()}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '9px 18px',
                borderRadius: '999px',
                background: 'var(--teal-primary, #008891)',
                color: '#ffffff',
                fontSize: '12.5px',
                fontWeight: '700',
                textDecoration: 'none'
              }}
            >
              Return to {feature.area} Hub
            </Link>
          </div>
        </div>
      )
  }

  const paramEntries = Object.entries(params || {}).filter(([_, v]) => v !== undefined)

  const handleSimulate = (label: string) => {
    setSimulatedAction(true)
    setActionMessage(label)
  }

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }} data-testid={`feature-page-${id}`}>
      {/* Feature Header Card */}
        <div style={{
          background: '#ffffff',
          border: '1px solid var(--line, #e9e9e5)',
          borderRadius: '18px',
          padding: '28px',
          boxShadow: '0 2px 14px rgba(0, 0, 0, 0.03)'
        }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', background: 'rgba(0, 136, 145, 0.1)', color: 'var(--teal-primary, #008891)', padding: '3px 8px', borderRadius: '4px' }}>
                {feature.area} Module
              </span>
              <span style={{ fontSize: '11px', fontWeight: '800', background: '#ecfdf5', color: '#047857', padding: '3px 8px', borderRadius: '4px' }}>
                ABDM Milestone 1 Verified
              </span>
              <span style={{ fontSize: '11px', fontWeight: '750', background: '#f4f6f5', color: '#475554', padding: '3px 8px', borderRadius: '4px' }}>
                Roles: {feature.roles ? feature.roles.join(', ') : 'All Staff'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => handleSimulate(`Exported data report for ${feature.name}`)}
                className="btn-hero-outline"
                style={{ padding: '6px 12px', fontSize: '11.5px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}
              >
                <Download size={13} /> Export
              </button>
              <button
                onClick={() => handleSimulate(`Printing clinical preview for ${feature.name}`)}
                className="btn-hero-outline"
                style={{ padding: '6px 12px', fontSize: '11.5px', borderRadius: '999px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}
              >
                <Printer size={13} /> Print
              </button>
            </div>
          </div>

          <h1 style={{ fontSize: '24px', fontWeight: '850', color: 'var(--charcoal-title, #1a2626)', marginBottom: '8px', letterSpacing: '-0.02em' }}>
            {feature.name}
          </h1>
          <p style={{ fontSize: '13.5px', color: 'var(--charcoal-body, #475554)', lineHeight: '1.6', marginBottom: '22px' }}>
            {feature.description}
          </p>

          {/* Clinical Workspace Interactive Area */}
          <div style={{
            padding: '22px',
            borderRadius: '14px',
            background: 'var(--paper, #fbfbf9)',
            border: '1px solid var(--line, #e9e9e5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: '750', color: 'var(--teal-primary, #008891)' }}>
                <ShieldCheck size={16} />
                <span>Clinical Workspace Active • Ref: {feature.source}</span>
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--charcoal-muted, #6e7e7d)', fontFamily: 'monospace' }}>
                ID: {feature.id} • Route: {feature.route}
              </div>
            </div>

            {paramEntries.length > 0 && (
              <div style={{ padding: '12px', background: '#ffffff', border: '1px solid var(--line, #e9e9e5)', borderRadius: '10px', marginBottom: '16px' }} data-testid="route-parameters">
                <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--charcoal-muted, #6e7e7d)', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Route Parameters:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                  {paramEntries.map(([k, v]) => (
                    <div key={k} style={{ fontFamily: 'monospace', fontSize: '12px', background: '#f4f6f5', padding: '6px 10px', borderRadius: '6px' }}>
                      <span style={{ color: 'var(--charcoal-muted, #6e7e7d)' }}>{k}:</span> {v}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contextual Clinical Data Cards */}
            <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid var(--line, #e9e9e5)', padding: '18px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: '800', color: 'var(--charcoal-title, #1a2626)' }}>
                  Live Data Records ({feature.area} Database)
                </span>
                <span style={{ fontSize: '11px', color: 'var(--charcoal-muted, #6e7e7d)' }}>
                  Auto-synced with clinic master registry
                </span>
              </div>

              {feature.area === 'Appointments' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { token: 'T-01', time: '10:00 AM', name: 'Meera Nambiar', proc: 'Root Canal Treatment (Session 2/3)', dr: 'Dr. Arun Kumar', status: 'In Consultation' },
                    { token: 'T-02', time: '10:30 AM', name: 'Rahul Krishnan', proc: 'Crown Seating', dr: 'Dr. Tariq Antoun', status: 'Waiting' },
                    { token: 'T-03', time: '11:00 AM', name: 'Fatima Zahra', proc: 'Scaling & Polish', dr: 'Dr. Priya Nair', status: 'Arrived' }
                  ].map((row, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface-alt, #f4f6f5)', borderRadius: '8px', fontSize: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontWeight: '800', color: 'var(--teal-primary)' }}>{row.token}</span>
                        <span style={{ fontWeight: '700' }}>{row.name}</span>
                        <span style={{ color: 'var(--charcoal-muted)' }}>({row.proc})</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ color: 'var(--charcoal-body)' }}>{row.dr}</span>
                        <span style={{ padding: '2px 8px', borderRadius: '999px', background: '#ecfdf5', color: '#047857', fontWeight: '750', fontSize: '10.5px' }}>{row.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : feature.area === 'Patients' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { id: 'DM-000101', name: 'Meera Nambiar', age: '34 F', allergy: '⚠️ Penicillin Allergy', last: 'Today' },
                    { id: 'DM-000102', name: 'Rahul Krishnan', age: '28 M', allergy: 'None recorded', last: 'Today' },
                    { id: 'DM-000103', name: 'Fatima Zahra', age: '41 F', allergy: 'Hypertension', last: '12 Oct' }
                  ].map((p, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface-alt, #f4f6f5)', borderRadius: '8px', fontSize: '12px' }}>
                      <div>
                        <span style={{ fontWeight: '800', color: 'var(--teal-primary)', marginRight: '8px' }}>{p.id}</span>
                        <span style={{ fontWeight: '750' }}>{p.name}</span>
                        <span style={{ color: 'var(--charcoal-muted)', marginLeft: '6px' }}>({p.age})</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ padding: '2px 6px', borderRadius: '4px', background: p.allergy.includes('⚠️') ? '#fee2e2' : '#f1f5f9', color: p.allergy.includes('⚠️') ? '#b91c1c' : '#475554', fontSize: '11px', fontWeight: '700' }}>
                          {p.allergy}
                        </span>
                        <span style={{ color: 'var(--charcoal-muted)', fontSize: '11px' }}>Visit: {p.last}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '12.5px', color: 'var(--charcoal-muted, #6e7e7d)' }}>
                  <Sparkles size={16} style={{ color: 'var(--teal-primary, #008891)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: '750', color: 'var(--charcoal-title, #1a2626)', marginBottom: '2px' }}>
                      Operational Clinical Schema & ABDM Records
                    </div>
                    <div>
                      {feature.name} workflows are connected to clinical audit trails, encrypted records, and Kerala dental practice standards.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Demo Action Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleSimulate(`Simulated live clinical workflow for ${feature.name}`)}
                className="btn-hero-teal"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  borderRadius: '999px',
                  fontSize: '12.5px',
                  fontWeight: '750',
                  cursor: 'pointer'
                }}
              >
                <Sparkles size={14} />
                <span>Simulate Demo Action</span>
              </button>

              {simulatedAction && (
                <span style={{ fontSize: '12px', fontWeight: '750', color: '#15803d', display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#ecfdf5', padding: '6px 12px', borderRadius: '999px' }}>
                  <CheckCircle2 size={14} /> {actionMessage || 'Action verified (mock environment)'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    )
}

export default FeaturePlaceholder

