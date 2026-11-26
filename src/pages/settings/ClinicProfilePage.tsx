import { setAppointmentScheduleConfig } from '@/services/appointmentPolicy'
import { browserSessionStorage } from '@/services/browserStorage';
import React, { useState, useEffect } from 'react'
import {
  Building2, MapPin, Phone, Mail, Globe, Clock, FileText,
  Save, CheckCircle2, AlertCircle, RefreshCw, Eye
} from 'lucide-react'
import { apiClient } from '@/services/apiClient'
import { isDemoSession } from '@/services/clinicStore'

interface ClinicData {
  id: string
  name: string
  displayName?: string
  phone?: string
  email?: string
  website?: string
  logoUrl?: string
  address?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  registrationNumber?: string
  gstin?: string
  currency?: string
  timezone?: string
  workingHours?: {
    weekdays: string
    saturday: string
    sunday: string
  }
}

export const ClinicProfilePage: React.FC = () => {
  const isDemo = isDemoSession()
  const [formData, setFormData] = useState<ClinicData>(() => {
    if (isDemo) {
      return {
        id: '',
        name: 'DocMatrix Dental Care',
        displayName: 'DocMatrix Multispeciality Dental',
        phone: '+91 98765 43210',
        email: 'contact@docmatrix.dental',
        website: 'https://docmatrix.dental',
        logoUrl: '',
        address: 'Suite 402, Medical Arts Building, MG Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560001',
        country: 'India',
        registrationNumber: 'KA-DC-2024-8841',
        gstin: '29ABCDE1234F1Z5',
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        workingHours: {
          weekdays: '09:00 AM - 08:00 PM',
          saturday: '09:00 AM - 06:00 PM',
          sunday: '10:00 AM - 02:00 PM (Emergency only)'
        }
      }
    }
    return {
      id: '',
      name: '',
      displayName: '',
      phone: '',
      email: '',
      website: '',
      logoUrl: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'India',
      registrationNumber: '',
      gstin: '',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      workingHours: {
        weekdays: '09:00 AM - 08:00 PM',
        saturday: '09:00 AM - 06:00 PM',
        sunday: '10:00 AM - 02:00 PM (Emergency only)'
      }
    }
  })

  const [initialData, setInitialData] = useState<ClinicData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  // Fetch real clinic profile on mount
  useEffect(() => {
    let mounted = true
    const fetchClinic = async () => {
      try {
        setLoading(true)
        const res = await apiClient.get<ClinicData>('/clinics/my-clinic')
        if (mounted && res && res.name) {
          const merged: ClinicData = {
            ...res,
            displayName: res.displayName || res.name,
            workingHours: res.workingHours || {
              weekdays: '09:00 AM - 08:00 PM',
              saturday: '09:00 AM - 06:00 PM',
              sunday: '10:00 AM - 02:00 PM (Emergency only)'
            }
          }
          setFormData(merged)
          setInitialData(merged)
        }
      } catch {
        // Fallback to local default state if backend not answering
        if (mounted && !initialData) {
          setInitialData(formData)
        }
      } finally {
        if (mounted) setLoading(false)
      }
    }

    fetchClinic()
    return () => { mounted = false }
  }, [])

  const handleChange = (field: keyof ClinicData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setFeedback(null)
  }

  const handleWorkingHoursChange = (dayKey: 'weekdays' | 'saturday' | 'sunday', value: string) => {
    setFormData((prev) => ({
      ...prev,
      workingHours: {
        ...(prev.workingHours || { weekdays: '', saturday: '', sunday: '' }),
        [dayKey]: value
      }
    }))
    setFeedback(null)
  }

  const isDirty = initialData ? JSON.stringify(formData) !== JSON.stringify(initialData) : false

  const handleReset = () => {
    if (initialData) {
      setFormData(initialData)
      setFeedback(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFeedback(null)

    try {
      const updated = await apiClient.patch<ClinicData>('/clinics/my-clinic', {
        name: formData.name,
        displayName: formData.displayName,
        phone: formData.phone,
        email: formData.email,
        website: formData.website,
        logoUrl: formData.logoUrl,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        postalCode: formData.postalCode,
        country: formData.country,
        registrationNumber: formData.registrationNumber,
        gstin: formData.gstin,
        currency: formData.currency,
        timezone: formData.timezone,
        workingHours: formData.workingHours
      })

      const finalRecord = updated && updated.name ? updated : formData
      setAppointmentScheduleConfig({ timezone: finalRecord.timezone, workingHours: finalRecord.workingHours })
      setFormData(finalRecord)
      setInitialData(finalRecord)
      setFeedback({ type: 'success', message: 'Clinic profile & letterhead configuration saved successfully.' })

      // Propagate clinicName update to browser session if applicable
      try {
        const rawAuth = browserSessionStorage.getItem('docmatrix_auth_user')
        if (rawAuth) {
          const authUser = JSON.parse(rawAuth)
          authUser.clinicName = finalRecord.displayName || finalRecord.name
          browserSessionStorage.setItem('docmatrix_auth_user', JSON.stringify(authUser))
        }
      } catch { }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Failed to persist clinic profile changes. Please try again.'
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px', fontFamily: 'inherit' }} data-testid="feature-page-set.clinic">
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--teal-primary, #008891)', textTransform: 'uppercase' }}>
            CLINIC SETTINGS &amp; ADMINISTRATION
          </span>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '4px 0', color: 'var(--text-strong, #0f172a)' }}>
            Clinic Profile &amp; Letterhead
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '14px' }}>
            Configure clinic identity, practice hours, tax identifiers, and official letterhead header.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '13.5px',
              fontWeight: 500,
              background: 'var(--surface-sunken, #f8fafc)',
              border: '1px solid var(--line-strong, #cbd5e1)',
              color: 'var(--text-strong, #334155)',
              cursor: 'pointer'
            }}
          >
            <Eye size={16} />
            {showPreview ? 'Hide Preview' : 'Letterhead Preview'}
          </button>
        </div>
      </div>

      {feedback && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: feedback.type === 'success' ? 'rgba(5, 150, 105, 0.12)' : 'rgba(220, 38, 38, 0.12)',
          border: `1px solid ${feedback.type === 'success' ? 'rgba(5, 150, 105, 0.3)' : 'rgba(220, 38, 38, 0.3)'}`,
          color: feedback.type === 'success' ? 'var(--tone-green, #065f46)' : 'var(--tone-red, #991b1b)',
          fontSize: '14px'
        }}>
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Live Letterhead Preview */}
      {showPreview && (
        <div style={{
          background: 'var(--surface-raised, #ffffff)',
          border: '2px dashed var(--teal-primary, #008891)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
        }}>
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--teal-primary, #008891)', textTransform: 'uppercase', marginBottom: '8px' }}>
            Letterhead Preview (Appears on Invoices &amp; Prescriptions)
          </div>
          <div style={{ borderBottom: '2px solid var(--text-strong, #0f172a)', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0', color: 'var(--text-strong, #0f172a)' }}>
                {formData.displayName || formData.name}
              </h2>
              <div style={{ fontSize: '12.5px', color: 'var(--text, #475569)', lineHeight: 1.5 }}>
                {formData.address}, {formData.city}, {formData.state} - {formData.postalCode}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', marginTop: '4px' }}>
                Phone: {formData.phone} | Email: {formData.email} | Web: {formData.website}
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '11.5px', color: 'var(--text, #475569)', lineHeight: 1.6 }}>
              <div><strong>Reg No:</strong> {formData.registrationNumber || 'N/A'}</div>
              <div><strong>GSTIN:</strong> {formData.gstin || 'N/A'}</div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Section 1: Practice Identity */}
        <div style={{ background: 'var(--surface-raised, #ffffff)', border: '1px solid var(--line, #e2e8f0)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Building2 size={20} color="var(--teal-primary, #008891)" />
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-strong, #0f172a)' }}>
              Practice Identity &amp; Contacts
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '6px' }}>
                Legal Registered Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line-strong, #cbd5e1)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', background: 'var(--surface-sunken)', color: 'var(--text-strong)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '6px' }}>
                Display / Patient-Facing Brand Name
              </label>
              <input
                type="text"
                value={formData.displayName || ''}
                onChange={(e) => handleChange('displayName', e.target.value)}
                placeholder="e.g. DocMatrix Multispeciality Dental"
                style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line-strong, #cbd5e1)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', background: 'var(--surface-sunken)', color: 'var(--text-strong)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '6px' }}>
                Clinic Helpline / Phone
              </label>
              <input
                type="text"
                value={formData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+91 98765 43210"
                style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line-strong, #cbd5e1)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', background: 'var(--surface-sunken)', color: 'var(--text-strong)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '6px' }}>
                Official Email Address
              </label>
              <input
                type="email"
                value={formData.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="reception@docmatrix.com"
                style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line-strong, #cbd5e1)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', background: 'var(--surface-sunken)', color: 'var(--text-strong)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '6px' }}>
                Clinic Website URL
              </label>
              <input
                type="url"
                value={formData.website || ''}
                onChange={(e) => handleChange('website', e.target.value)}
                placeholder="https://yourclinic.com"
                style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line-strong, #cbd5e1)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', background: 'var(--surface-sunken)', color: 'var(--text-strong)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '6px' }}>
                Logo URL (Square PNG / SVG)
              </label>
              <input
                type="text"
                value={formData.logoUrl || ''}
                onChange={(e) => handleChange('logoUrl', e.target.value)}
                placeholder="https://example.com/clinic-logo.png"
                style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line-strong, #cbd5e1)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', background: 'var(--surface-sunken)', color: 'var(--text-strong)' }}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Physical Address */}
        <div style={{ background: 'var(--surface-raised, #ffffff)', border: '1px solid var(--line, #e2e8f0)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <MapPin size={20} color="var(--teal-primary, #008891)" />
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-strong, #0f172a)' }}>
              Physical Clinic Location
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '6px' }}>
                Street Address / Premises
              </label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="Door No, Floor, Building, Street, Landmark"
                style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line-strong, #cbd5e1)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', background: 'var(--surface-sunken)', color: 'var(--text-strong)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '6px' }}>
                City
              </label>
              <input
                type="text"
                value={formData.city || ''}
                onChange={(e) => handleChange('city', e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line-strong, #cbd5e1)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', background: 'var(--surface-sunken)', color: 'var(--text-strong)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '6px' }}>
                State / Province
              </label>
              <input
                type="text"
                value={formData.state || ''}
                onChange={(e) => handleChange('state', e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line-strong, #cbd5e1)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', background: 'var(--surface-sunken)', color: 'var(--text-strong)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '6px' }}>
                Postal / PIN Code
              </label>
              <input
                type="text"
                value={formData.postalCode || ''}
                onChange={(e) => handleChange('postalCode', e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line-strong, #cbd5e1)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', background: 'var(--surface-sunken)', color: 'var(--text-strong)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '6px' }}>
                Country
              </label>
              <input
                type="text"
                value={formData.country || 'India'}
                onChange={(e) => handleChange('country', e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line-strong, #cbd5e1)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', background: 'var(--surface-sunken)', color: 'var(--text-strong)' }}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Regulatory & Localization */}
        <div style={{ background: 'var(--surface-raised, #ffffff)', border: '1px solid var(--line, #e2e8f0)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <FileText size={20} color="var(--teal-primary, #008891)" />
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-strong, #0f172a)' }}>
              Registration, Tax &amp; Localization
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '6px' }}>
                Clinical Establishment Reg. Number
              </label>
              <input
                type="text"
                value={formData.registrationNumber || ''}
                onChange={(e) => handleChange('registrationNumber', e.target.value)}
                placeholder="State Dental Council / CEA Reg."
                style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line-strong, #cbd5e1)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', background: 'var(--surface-sunken)', color: 'var(--text-strong)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '6px' }}>
                GSTIN / Tax ID
              </label>
              <input
                type="text"
                value={formData.gstin || ''}
                onChange={(e) => handleChange('gstin', e.target.value)}
                placeholder="15-character GSTIN (e.g. 29ABCDE1234F1Z5)"
                style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line-strong, #cbd5e1)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', background: 'var(--surface-sunken)', color: 'var(--text-strong)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '6px' }}>
                Timezone
              </label>
              <select
                value={formData.timezone || 'Asia/Kolkata'}
                onChange={(e) => handleChange('timezone', e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line-strong, #cbd5e1)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', background: 'var(--surface-sunken)', color: 'var(--text-strong)' }}
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST, UTC+5:30)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST, UTC+4:00)</option>
                <option value="Asia/Singapore">Asia/Singapore (SGT, UTC+8:00)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="America/New_York">America/New_York (EST/EDT)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '6px' }}>
                Operating Currency
              </label>
              <select
                value={formData.currency || 'INR'}
                onChange={(e) => handleChange('currency', e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line-strong, #cbd5e1)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', background: 'var(--surface-sunken)', color: 'var(--text-strong)' }}
              >
                <option value="INR">INR (₹ - Indian Rupee)</option>
                <option value="USD">USD ($ - US Dollar)</option>
                <option value="AED">AED (د.إ - UAE Dirham)</option>
                <option value="GBP">GBP (£ - British Pound)</option>
                <option value="EUR">EUR (€ - Euro)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Operational Hours */}
        <div style={{ background: 'var(--surface-raised, #ffffff)', border: '1px solid var(--line, #e2e8f0)', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Clock size={20} color="var(--teal-primary, #008891)" />
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-strong, #0f172a)' }}>
              Practice Timings
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '6px' }}>
                Monday to Friday
              </label>
              <input
                type="text"
                value={formData.workingHours?.weekdays || ''}
                onChange={(e) => handleWorkingHoursChange('weekdays', e.target.value)}
                placeholder="09:00 AM - 08:00 PM"
                style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line-strong, #cbd5e1)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', background: 'var(--surface-sunken)', color: 'var(--text-strong)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '6px' }}>
                Saturday
              </label>
              <input
                type="text"
                value={formData.workingHours?.saturday || ''}
                onChange={(e) => handleWorkingHoursChange('saturday', e.target.value)}
                placeholder="09:00 AM - 06:00 PM"
                style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line-strong, #cbd5e1)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', background: 'var(--surface-sunken)', color: 'var(--text-strong)' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '6px' }}>
                Sunday
              </label>
              <input
                type="text"
                value={formData.workingHours?.sunday || ''}
                onChange={(e) => handleWorkingHoursChange('sunday', e.target.value)}
                placeholder="10:00 AM - 02:00 PM (Emergency only)"
                style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line-strong, #cbd5e1)', borderRadius: '6px', fontSize: '14px', boxSizing: 'border-box', background: 'var(--surface-sunken)', color: 'var(--text-strong)' }}
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--surface-alt, #f8fafc)',
          border: '1px solid var(--line, #e2e8f0)',
          borderRadius: '12px',
          padding: '16px 24px'
        }}>
          <div>
            {isDirty && (
              <span style={{ fontSize: '13px', color: 'var(--tone-amber, #b45309)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--tone-amber, #f59e0b)', display: 'inline-block' }} />
                Unsaved changes pending
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              disabled={!isDirty || saving}
              onClick={handleReset}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                background: 'var(--surface-sunken, #ffffff)',
                border: '1px solid var(--line-strong, #cbd5e1)',
                color: isDirty ? 'var(--text-strong, #475569)' : 'var(--text-faint, #94a3b8)',
                cursor: isDirty ? 'pointer' : 'not-allowed'
              }}
            >
              Discard Changes
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 22px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                background: 'var(--teal-primary, #008891)',
                border: 'none',
                color: '#ffffff',
                cursor: saving ? 'wait' : 'pointer',
                opacity: saving ? 0.7 : 1
              }}
            >
              {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default ClinicProfilePage
