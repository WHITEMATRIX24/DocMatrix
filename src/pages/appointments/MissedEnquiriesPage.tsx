import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Inbox, Plus, Trash2, X, Check, Phone, Mail } from 'lucide-react'
import { useClinicData, addEnquiry, dismissEnquiry, updateEnquiryStatus, type EnquiryRecord } from '@/services/clinicStore'

function formatEnquiryTime(isoOrStr: string): string {
  if (!isoOrStr) return 'Recent'
  if (isoOrStr.startsWith('Today') || isoOrStr.startsWith('Yesterday')) return isoOrStr
  try {
    const d = new Date(isoOrStr)
    if (isNaN(d.getTime())) return isoOrStr
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
  } catch {
    return isoOrStr
  }
}

export const MissedEnquiriesPage: React.FC = () => {
  const navigate = useNavigate()
  const { enquiries = [] } = useClinicData()

  const [modalOpen, setModalOpen] = useState(false)
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formRequest, setFormRequest] = useState('')
  const [formNotes, setFormNotes] = useState('')

  // Active leads waiting for response
  const activeEnquiries = useMemo(() => {
    return enquiries.filter((e) => e.status !== 'DISMISSED' && e.status !== 'CONVERTED')
  }, [enquiries])

  const handleBookVisit = (enquiry: EnquiryRecord) => {
    updateEnquiryStatus(enquiry.id, 'CONVERTED')
    navigate('/appointments/new', {
      state: {
        patientName: enquiry.name,
        phone: enquiry.phone,
        treatmentType: enquiry.request,
        notes: `Converted from online enquiry: "${enquiry.request}"`,
      },
    })
  }

  const handleDismiss = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    dismissEnquiry(id)
  }

  const handleCreateEnquiry = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formRequest.trim()) return

    addEnquiry({
      name: formName.trim(),
      phone: formPhone.trim() || undefined,
      email: formEmail.trim() || undefined,
      request: formRequest.trim(),
      notes: formNotes.trim() || undefined,
      status: 'PENDING',
    })

    setFormName('')
    setFormPhone('')
    setFormEmail('')
    setFormRequest('')
    setFormNotes('')
    setModalOpen(false)
  }

  return (
    <section className="appointment-simple-panel" data-testid="feature-page-appt.enquiries">
      <div className="appointment-simple-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="appointment-simple-heading-icon"><Inbox size={17} /></div>
          <div>
            <h2>Online enquiries</h2>
            <p>
              {activeEnquiries.length === 0
                ? 'No pending requests'
                : `${activeEnquiries.length} request${activeEnquiries.length === 1 ? '' : 's'} waiting for a response`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 12px',
            fontSize: '12px',
            fontWeight: 600,
            background: 'var(--teal-primary, #0b8185)',
            color: '#fff',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Plus size={14} /> New Enquiry
        </button>
      </div>

      {activeEnquiries.length === 0 ? (
        <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--charcoal-muted, #6e7e7d)' }}>
          <div style={{ display: 'inline-flex', padding: '14px', borderRadius: '50%', background: 'var(--surface-subtle, #f8fafc)', marginBottom: '12px' }}>
            <Check size={28} style={{ color: 'var(--teal-primary, #0b8185)' }} />
          </div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--charcoal-title, #1a2626)' }}>
            All caught up!
          </h3>
          <p style={{ margin: 0, fontSize: '12px', maxWidth: '380px', marginInline: 'auto', lineHeight: 1.5 }}>
            No pending online booking enquiries or website leads. Half-finished bookings and contact form submissions will appear here.
          </p>
        </div>
      ) : (
        <div className="appointment-enquiry-list">
          {activeEnquiries.map((enquiry) => (
            <article className="appointment-enquiry-row" key={enquiry.id}>
              <div className="appointment-enquiry-avatar">
                {enquiry.name
                  .split(' ')
                  .map((part) => part[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </div>
              <div className="appointment-enquiry-details">
                <strong>{enquiry.name}</strong>
                <span>
                  {enquiry.request} · {formatEnquiryTime(enquiry.createdAt)}
                  {enquiry.phone && ` · ${enquiry.phone}`}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  title="Dismiss lead"
                  onClick={(e) => handleDismiss(e, enquiry.id)}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--line, #e2e8f0)',
                    borderRadius: '6px',
                    padding: '6px',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Trash2 size={13} />
                </button>
                <button type="button" onClick={() => handleBookVisit(enquiry)}>
                  Book visit <ArrowRight size={14} />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal: New Enquiry */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={() => setModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--surface, #ffffff)',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '440px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              border: '1px solid var(--line, #e2e8f0)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--charcoal-title, #1a2626)' }}>
                Record New Lead / Enquiry
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateEnquiry} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: '#475569' }}>
                  Patient / Enquirer Name *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Rohith Sharma"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--line, #cbd5e1)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: '#475569' }}>
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98400 12345"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--line, #cbd5e1)',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: '#475569' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="name@example.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--line, #cbd5e1)',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: '#475569' }}>
                  Treatment Request / Reason *
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. New patient · Teeth Whitening consultation"
                  value={formRequest}
                  onChange={(e) => setFormRequest(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--line, #cbd5e1)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, marginBottom: '4px', color: '#475569' }}>
                  Additional Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Preferred timings, symptoms, or inquiry channel..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--line, #cbd5e1)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    resize: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    border: '1px solid var(--line, #cbd5e1)',
                    background: 'transparent',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'var(--teal-primary, #0b8185)',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Save Enquiry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

export default MissedEnquiriesPage
