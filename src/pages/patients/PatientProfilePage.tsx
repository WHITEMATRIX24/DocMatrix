import React, { useMemo, useState, useEffect } from 'react'
import { Link, useParams, useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarPlus,
  FileText,
  Receipt,
  UserRound,
  AlertTriangle,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Clock,
  Calendar,
  CheckCircle2,
  FileDown,
  Upload,
  Edit3,
  Stethoscope,
  X,
  ExternalLink,
  Activity,
  Layers
} from 'lucide-react'
import {
  useClinicData,
  updatePatient,
  addPatientDocument,
  type PatientRecord,
  type TreatmentPlanRecord,
  type PatientDocumentRecord,
  type PatientConsentRecord
} from '@/services/clinicStore'
import './patientProfile.css'

type TabKey = 'overview' | 'medical' | 'timeline' | 'documents' | 'consents'

export const PatientProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const {
    patients,
    appointments,
    clinicalNotes,
    invoices,
    treatmentPlans = [],
    patientDocuments = [],
    patientConsents = []
  } = useClinicData()

  // Match patient by id (case-insensitive for safety)
  const patient = useMemo(() => {
    return patients.find((p) => p.id.toLowerCase() === (id || '').toLowerCase())
  }, [patients, id])

  // Resolve active tab based on pathname deep link (e.g. /patients/:id/timeline) or query param ?tab=...
  const activeTab: TabKey = useMemo(() => {
    const path = location.pathname.toLowerCase()
    if (path.endsWith('/timeline')) return 'timeline'
    if (path.endsWith('/documents')) return 'documents'
    if (path.endsWith('/consents')) return 'consents'
    if (path.endsWith('/pending-treatments')) return 'overview'

    const queryTab = searchParams.get('tab') as TabKey
    if (queryTab && ['overview', 'medical', 'timeline', 'documents', 'consents'].includes(queryTab)) {
      return queryTab
    }
    return 'overview'
  }, [location.pathname, searchParams])

  const setTab = (tab: TabKey) => {
    setSearchParams({ tab }, { replace: true })
  }

  // Filter linked records for this patient
  const patientAppointments = useMemo(() => {
    return appointments
      .filter((a) => a.patientId.toLowerCase() === (id || '').toLowerCase())
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [appointments, id])

  const patientNotes = useMemo(() => {
    return clinicalNotes
      .filter((n) => n.patientId.toLowerCase() === (id || '').toLowerCase())
      .sort((a, b) => b.visitDate.localeCompare(a.visitDate))
  }, [clinicalNotes, id])

  const patientInvoices = useMemo(() => {
    return invoices
      .filter((inv) => inv.patientId.toLowerCase() === (id || '').toLowerCase())
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [invoices, id])

  const patientPlans = useMemo(() => {
    return (treatmentPlans as TreatmentPlanRecord[])
      .filter((plan) => plan.patientId.toLowerCase() === (id || '').toLowerCase())
  }, [treatmentPlans, id])

  const patientDocs = useMemo(() => {
    return (patientDocuments as PatientDocumentRecord[])
      .filter((doc) => doc.patientId.toLowerCase() === (id || '').toLowerCase())
  }, [patientDocuments, id])

  const patientConsentList = useMemo(() => {
    return (patientConsents as PatientConsentRecord[])
      .filter((c) => c.patientId.toLowerCase() === (id || '').toLowerCase())
  }, [patientConsents, id])

  // Pending treatments for overview card
  const pendingTreatments = useMemo(() => {
    return patientPlans.filter((p) => p.status === 'Pending' || p.status === 'In Progress')
  }, [patientPlans])

  // Upcoming appointment
  const nextAppointment = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return patientAppointments
      .filter((a) => a.date >= today && a.status !== 'cancelled')
      .sort((a, b) => a.date.localeCompare(b.date))[0]
  }, [patientAppointments])

  // Last visit
  const lastAppointment = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return patientAppointments
      .filter((a) => a.date < today || a.status === 'completed')
      .sort((a, b) => b.date.localeCompare(a.date))[0]
  }, [patientAppointments])

  // Medical Alert Text
  const medicalAlerts = useMemo(() => {
    if (!patient) return null
    const parts = []
    if (patient.allergies === 'yes' && patient.allergiesDetails) {
      parts.push(`Allergies: ${patient.allergiesDetails}`)
    }
    if (patient.conditions === 'yes' && patient.conditionsDetails) {
      parts.push(`Conditions: ${patient.conditionsDetails}`)
    }
    return parts.length > 0 ? parts.join(' • ') : null
  }, [patient])

  // Edit Patient Modal State
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState<Partial<PatientRecord>>({})

  // Document Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [docTitle, setDocTitle] = useState('')
  const [docCategory, setDocCategory] = useState<PatientDocumentRecord['category']>('Radiology')

  const openEditModal = () => {
    if (!patient) return
    setEditForm({
      firstName: patient.firstName,
      lastName: patient.lastName,
      mobile: patient.mobile,
      email: patient.email,
      address: patient.address,
      city: patient.city,
      emergencyName: patient.emergencyName,
      emergencyPhone: patient.emergencyPhone,
      relationship: patient.relationship,
      allergies: patient.allergies,
      allergiesDetails: patient.allergiesDetails,
      medications: patient.medications,
      medicationsDetails: patient.medicationsDetails,
      conditions: patient.conditions,
      conditionsDetails: patient.conditionsDetails
    })
    setEditModalOpen(true)
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!patient) return
    updatePatient(patient.id, editForm)
    setEditModalOpen(false)
  }

  const handleUploadDoc = (e: React.FormEvent) => {
    e.preventDefault()
    if (!patient || !docTitle.trim()) return
    addPatientDocument({
      patientId: patient.id,
      title: docTitle.trim(),
      category: docCategory,
      fileName: `${docTitle.trim().toLowerCase().replace(/\s+/g, '_')}.dcm`,
      fileSize: '3.6 MB',
      doctor: 'Dr. Arun Kumar'
    })
    setDocTitle('')
    setUploadModalOpen(false)
    setTab('documents')
  }

  if (!patient) {
    return (
      <section className="clinic-record-page pat-profile-page" data-testid="feature-page-pat.profile">
        <Link className="clinic-record-back" to="/patients/list">
          <ArrowLeft size={14} /> Back to Patients List
        </Link>
        <div className="clinic-record-empty" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <span style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'var(--surface-subtle, #f1f5f9)', color: 'var(--text-muted, #64748b)', marginBottom: '12px' }}>
            <UserRound size={32} />
          </span>
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Patient record not found</h2>
          <p style={{ color: 'var(--text-muted, #64748b)', maxWidth: '420px', margin: '6px auto 16px auto' }}>
            No registered patient found with identifier <strong>{id}</strong>. Select a patient from the patient records list.
          </p>
          <Link className="pat-btn pat-btn-primary" to="/patients/list">
            <ArrowLeft size={14} /> Return to Patients List
          </Link>
        </div>
      </section>
    )
  }

  const initials = `${(patient.firstName || '').charAt(0)}${(patient.lastName || '').charAt(0)}`.toUpperCase() || 'PT'

  return (
    <section className="clinic-record-page pat-profile-page" data-testid="feature-page-pat.profile">
      {/* Back to list navigation */}
      <div>
        <Link
          className="clinic-record-back"
          to="/patients/list"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--teal-primary, #0b8185)', textDecoration: 'none', fontWeight: 500 }}
        >
          <ArrowLeft size={14} />
          <span>Patients List</span>
        </Link>
      </div>

      {/* 1. Unified Hero Profile Header */}
      <header className="pat-hero-card">
        <div className="pat-hero-main">
          <div className="pat-hero-identity">
            <span className="pat-hero-avatar">{initials}</span>
            <div className="pat-hero-details">
              <h1>
                <span>{patient.firstName} {patient.lastName}</span>
                <span className="pat-badge is-primary">{patient.id}</span>
              </h1>

              <div className="pat-hero-badges">
                <span className="pat-badge">
                  {patient.age ? `${patient.age} yrs` : patient.dateOfBirth || '—'}
                </span>
                <span className="pat-badge" style={{ textTransform: 'capitalize' }}>
                  {patient.gender || 'Patient'}
                </span>
                <span className="pat-badge" style={{ color: '#059669', background: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' }}>
                  Active Record
                </span>
              </div>

              <div className="pat-hero-meta">
                <span className="pat-meta-item">
                  <Phone size={13} />
                  <span>{patient.countryCode} {patient.mobile}</span>
                </span>
                {patient.email && (
                  <span className="pat-meta-item">
                    <Mail size={13} />
                    <span>{patient.email}</span>
                  </span>
                )}
                <span className="pat-meta-item">
                  <MapPin size={13} />
                  <span>{patient.city || 'Kochi, Kerala'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons with permissions awareness */}
          <div className="pat-hero-actions">
            <button
              type="button"
              className="pat-btn pat-btn-secondary"
              onClick={openEditModal}
              title="Edit patient demographics and medical summary"
            >
              <Edit3 size={14} />
              <span>Edit Patient</span>
            </button>

            <Link
              className="pat-btn pat-btn-secondary"
              to={`/patients/${patient.id}/tooth-chart`}
              title="View and mark interactive dental tooth chart"
            >
              <Layers size={14} />
              <span>Tooth Chart</span>
            </Link>

            <Link
              className="pat-btn pat-btn-primary"
              to={`/appointments/new?patientId=${patient.id}`}
              title="Schedule consultation or dental procedure"
            >
              <CalendarPlus size={14} />
              <span>Book Appointment</span>
            </Link>

            <Link
              className="pat-btn pat-btn-secondary"
              to={`/clinical/notes?patientId=${patient.id}`}
              title="Start or review clinical consultation note"
            >
              <FileText size={14} />
              <span>Start Consultation</span>
            </Link>
          </div>
        </div>

        {/* High-visibility Medical Alert Banner */}
        {medicalAlerts ? (
          <div className="pat-alert-banner" role="alert">
            <AlertTriangle size={18} style={{ flexShrink: 0, color: '#dc2626' }} />
            <div>
              <strong>MEDICAL ALERT: </strong>
              <span>{medicalAlerts}</span>
            </div>
          </div>
        ) : (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#059669' }}>
            <ShieldCheck size={14} />
            <span>No critical medical alerts or drug contraindications recorded.</span>
          </div>
        )}
      </header>

      {/* 2. Unified 5 Profile Navigation Tabs */}
      <nav className="pat-nav-tabs" aria-label="Patient Profile Sections">
        <button
          type="button"
          className={`pat-tab-btn ${activeTab === 'overview' ? 'is-active' : ''}`}
          onClick={() => setTab('overview')}
        >
          <Activity size={15} />
          <span>Overview</span>
        </button>

        <button
          type="button"
          className={`pat-tab-btn ${activeTab === 'medical' ? 'is-active' : ''}`}
          onClick={() => setTab('medical')}
        >
          <ShieldCheck size={15} />
          <span>Medical History</span>
        </button>

        <button
          type="button"
          className={`pat-tab-btn ${activeTab === 'timeline' ? 'is-active' : ''}`}
          onClick={() => setTab('timeline')}
        >
          <Clock size={15} />
          <span>Visit Timeline</span>
          {patientAppointments.length > 0 && (
            <span className="pat-tab-badge">{patientAppointments.length}</span>
          )}
        </button>

        <button
          type="button"
          className={`pat-tab-btn ${activeTab === 'documents' ? 'is-active' : ''}`}
          onClick={() => setTab('documents')}
        >
          <FileText size={15} />
          <span>Documents</span>
          {patientDocs.length > 0 && (
            <span className="pat-tab-badge">{patientDocs.length}</span>
          )}
        </button>

        <button
          type="button"
          className={`pat-tab-btn ${activeTab === 'consents' ? 'is-active' : ''}`}
          onClick={() => setTab('consents')}
        >
          <CheckCircle2 size={15} />
          <span>Consent Records</span>
          {patientConsentList.length > 0 && (
            <span className="pat-tab-badge">{patientConsentList.length}</span>
          )}
        </button>
      </nav>

      {/* 3. Tab Contents */}
      <div className="pat-tab-content">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="pat-grid-2">
              {/* Demographics & Contact */}
              <article className="pat-card">
                <div className="pat-card-head">
                  <h3><UserRound size={16} /> Demographics & Contact</h3>
                  <button
                    type="button"
                    onClick={openEditModal}
                    className="pat-card-action"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                </div>
                <dl className="pat-dl">
                  <div className="pat-dl-row">
                    <dt>Full Name</dt>
                    <dd>{patient.firstName} {patient.lastName}</dd>
                  </div>
                  <div className="pat-dl-row">
                    <dt>Date of Birth / Age</dt>
                    <dd>{patient.dateOfBirth || '—'} {patient.age && `(${patient.age} yrs)`}</dd>
                  </div>
                  <div className="pat-dl-row">
                    <dt>Gender</dt>
                    <dd style={{ textTransform: 'capitalize' }}>{patient.gender || '—'}</dd>
                  </div>
                  <div className="pat-dl-row">
                    <dt>Preferred Language</dt>
                    <dd>{patient.language || 'English, Malayalam'}</dd>
                  </div>
                  <div className="pat-dl-row">
                    <dt>Residential Address</dt>
                    <dd>{[patient.address, patient.city, patient.state, patient.postalCode].filter(Boolean).join(', ') || '—'}</dd>
                  </div>
                  <div className="pat-dl-row">
                    <dt>Emergency Contact</dt>
                    <dd>
                      {patient.emergencyName || '—'} {patient.emergencyPhone && `(${patient.emergencyPhone})`}
                      {patient.relationship && ` • ${patient.relationship}`}
                    </dd>
                  </div>
                </dl>
              </article>

              {/* Medical Summary */}
              <article className="pat-card">
                <div className="pat-card-head">
                  <h3><ShieldCheck size={16} /> Medical Alerts & Screening</h3>
                  <button
                    type="button"
                    onClick={() => setTab('medical')}
                    className="pat-card-action"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Full History →
                  </button>
                </div>
                <dl className="pat-dl">
                  <div className="pat-dl-row">
                    <dt>Drug Allergies</dt>
                    <dd>
                      {patient.allergies === 'yes' ? (
                        <span style={{ color: '#dc2626', fontWeight: 600 }}>{patient.allergiesDetails}</span>
                      ) : (
                        <span style={{ color: '#059669' }}>None reported</span>
                      )}
                    </dd>
                  </div>
                  <div className="pat-dl-row">
                    <dt>Current Medications</dt>
                    <dd>
                      {patient.medications === 'yes' ? patient.medicationsDetails : 'None'}
                    </dd>
                  </div>
                  <div className="pat-dl-row">
                    <dt>Systemic Conditions</dt>
                    <dd>
                      {patient.conditions === 'yes' ? (
                        <span style={{ color: '#d97706', fontWeight: 600 }}>{patient.conditionsDetails}</span>
                      ) : (
                        <span style={{ color: '#059669' }}>Healthy / None</span>
                      )}
                    </dd>
                  </div>
                  <div className="pat-dl-row">
                    <dt>Dental Charting</dt>
                    <dd>
                      <Link to={`/patients/${patient.id}/tooth-chart`} style={{ color: 'var(--teal-primary, #0b8185)', textDecoration: 'none', fontWeight: 500 }}>
                        Open Interactive Chart →
                      </Link>
                    </dd>
                  </div>
                </dl>
              </article>
            </div>

            {/* Visit Status Cards */}
            <div className="pat-grid-2">
              {/* Next Appointment Card */}
              <article className="pat-card">
                <div className="pat-card-head">
                  <h3><Calendar size={16} /> Next Appointment</h3>
                  <Link to={`/appointments/new?patientId=${patient.id}`} className="pat-card-action">
                    Schedule →
                  </Link>
                </div>
                {nextAppointment ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '15px', color: 'var(--text-main, #0f172a)' }}>
                        {nextAppointment.treatmentType || nextAppointment.visitType}
                      </strong>
                      <span className="pat-badge is-primary" style={{ textTransform: 'capitalize' }}>
                        {nextAppointment.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--teal-primary, #0b8185)', fontWeight: 600 }}>
                      {nextAppointment.date} at {nextAppointment.time} ({nextAppointment.chair || 'Chair 1'})
                    </div>
                    <div style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748b)' }}>
                      Assigned: {nextAppointment.doctor}
                    </div>
                    {nextAppointment.notes && (
                      <div style={{ fontSize: '12px', background: 'var(--surface, #fff)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--line, #e2e8f0)', marginTop: '4px' }}>
                        Note: {nextAppointment.notes}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '16px 0', color: 'var(--text-muted, #64748b)', fontSize: '13px' }}>
                    No upcoming appointment booked.
                    <div style={{ marginTop: '10px' }}>
                      <Link to={`/appointments/new?patientId=${patient.id}`} className="pat-btn pat-btn-secondary" style={{ padding: '6px 12px', fontSize: '12.5px' }}>
                        <CalendarPlus size={13} /> Book Next Slot
                      </Link>
                    </div>
                  </div>
                )}
              </article>

              {/* Last Visit Summary Card */}
              <article className="pat-card">
                <div className="pat-card-head">
                  <h3><Clock size={16} /> Last Visit Summary</h3>
                  <button
                    type="button"
                    onClick={() => setTab('timeline')}
                    className="pat-card-action"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    View All Visits →
                  </button>
                </div>
                {lastAppointment ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '15px', color: 'var(--text-main, #0f172a)' }}>
                        {lastAppointment.treatmentType || lastAppointment.visitType}
                      </strong>
                      <span className="pat-badge" style={{ color: '#059669', background: 'rgba(16, 185, 129, 0.1)' }}>
                        Completed
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted, #475569)' }}>
                      Date: {lastAppointment.date} · {lastAppointment.doctor}
                    </div>
                    {patientNotes.length > 0 && (
                      <div style={{ fontSize: '12.5px', background: 'var(--surface, #fff)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--line, #e2e8f0)', marginTop: '4px' }}>
                        <strong>Findings: </strong>{patientNotes[0].findings}
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '16px 0', color: 'var(--text-muted, #64748b)', fontSize: '13px' }}>
                    No recorded prior visits in this clinic session.
                  </div>
                )}
              </article>
            </div>

            {/* Pending Treatments Summary (Per Section 4 & 5 requirements) */}
            <article className="pat-card" style={{ background: 'var(--surface, #ffffff)' }}>
              <div className="pat-card-head">
                <h3>
                  <Stethoscope size={16} />
                  <span>Pending Treatments & Care Plans</span>
                  {pendingTreatments.length > 0 && (
                    <span className="pat-badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', borderColor: 'rgba(245, 158, 11, 0.2)' }}>
                      {pendingTreatments.length} Pending
                    </span>
                  )}
                </h3>
                <Link to="/clinical/treatment-plans" className="pat-card-action">
                  Open Clinical Treatment Plans →
                </Link>
              </div>

              {pendingTreatments.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {pendingTreatments.map((plan) => (
                    <div
                      key={plan.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--line, #e2e8f0)',
                        background: 'var(--surface-subtle, #f8fafc)'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>
                          {plan.procedure}
                          {plan.toothNumber && ` • Tooth #${plan.toothNumber}`}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                          Doctor: {plan.doctor} · Category: {plan.category} {plan.notes && `· ${plan.notes}`}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main, #0f172a)' }}>
                          ₹{plan.cost.toLocaleString('en-IN')}
                        </span>
                        <span
                          className="pat-badge"
                          style={{
                            background: plan.status === 'In Progress' ? 'rgba(14, 165, 233, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            color: plan.status === 'In Progress' ? '#0ea5e9' : '#d97706',
                            borderColor: plan.status === 'In Progress' ? 'rgba(14, 165, 233, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                            fontWeight: 600
                          }}
                        >
                          {plan.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '13px' }}>
                  No pending treatment plans. All proposed dental procedures are completed or up to date.
                </p>
              )}
            </article>

            {/* Invoices & Billing Quick View */}
            {patientInvoices.length > 0 && (
              <article className="pat-card">
                <div className="pat-card-head">
                  <h3><Receipt size={16} /> Recent Invoices</h3>
                  <Link to={`/billing/invoices/new?patientId=${patient.id}`} className="pat-card-action">
                    New Invoice →
                  </Link>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {patientInvoices.map((inv) => (
                    <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '8px 10px', background: 'var(--surface, #fff)', borderRadius: '6px', border: '1px solid var(--line, #e2e8f0)' }}>
                      <div>
                        <strong>{inv.description}</strong>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>{inv.id} · {inv.createdAt.slice(0, 10)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700 }}>₹{inv.amount.toLocaleString('en-IN')}</div>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: inv.status === 'Paid' ? '#059669' : '#dc2626' }}>
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            )}
          </div>
        )}

        {/* TAB 2: MEDICAL HISTORY */}
        {activeTab === 'medical' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                  Patient Medical Screening & Dental Safety
                </h3>
                <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '13px' }}>
                  Screening data recorded during intake and verified by treating clinician.
                </p>
              </div>
              <button type="button" onClick={openEditModal} className="pat-btn pat-btn-secondary">
                <Edit3 size={13} /> Edit Medical Details
              </button>
            </div>

            <div className="pat-grid-2">
              <article className="pat-card" style={{ borderColor: patient.allergies === 'yes' ? 'rgba(220, 38, 38, 0.3)' : undefined }}>
                <div className="pat-card-head">
                  <h3 style={{ color: patient.allergies === 'yes' ? '#dc2626' : undefined }}>
                    <AlertTriangle size={16} /> Allergies & Sensitivities
                  </h3>
                  <span className="pat-badge" style={{ background: patient.allergies === 'yes' ? '#fee2e2' : '#ecfdf5', color: patient.allergies === 'yes' ? '#dc2626' : '#059669' }}>
                    {patient.allergies === 'yes' ? 'Allergies Present' : 'No Allergies'}
                  </span>
                </div>
                {patient.allergies === 'yes' ? (
                  <div style={{ padding: '8px 0', color: 'var(--text-main, #0f172a)', fontSize: '14px', fontWeight: 500 }}>
                    {patient.allergiesDetails}
                    <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '6px' }}>
                      ⚠️ Clinicians must verify non-allergenic anesthesia and prescribed analgesics/antibiotics.
                    </div>
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '13.5px', margin: 0 }}>
                    Patient declared no known allergies to local anesthetics, antibiotics (penicillin), latex, or analgesics.
                  </p>
                )}
              </article>

              <article className="pat-card">
                <div className="pat-card-head">
                  <h3><ShieldCheck size={16} /> Current Medications</h3>
                  <span className="pat-badge">
                    {patient.medications === 'yes' ? 'Active Prescriptions' : 'None'}
                  </span>
                </div>
                {patient.medications === 'yes' ? (
                  <div style={{ padding: '8px 0', color: 'var(--text-main, #0f172a)', fontSize: '14px' }}>
                    {patient.medicationsDetails}
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '13.5px', margin: 0 }}>
                    Patient is not currently taking systemic long-term medications or blood thinners.
                  </p>
                )}
              </article>

              <article className="pat-card" style={{ borderColor: patient.conditions === 'yes' ? 'rgba(245, 158, 11, 0.3)' : undefined }}>
                <div className="pat-card-head">
                  <h3 style={{ color: patient.conditions === 'yes' ? '#d97706' : undefined }}>
                    <Activity size={16} /> Systemic Medical Conditions
                  </h3>
                  <span className="pat-badge" style={{ background: patient.conditions === 'yes' ? '#fef3c7' : '#ecfdf5', color: patient.conditions === 'yes' ? '#d97706' : '#059669' }}>
                    {patient.conditions === 'yes' ? 'Pre-existing Condition' : 'Clear'}
                  </span>
                </div>
                {patient.conditions === 'yes' ? (
                  <div style={{ padding: '8px 0', color: 'var(--text-main, #0f172a)', fontSize: '14px' }}>
                    {patient.conditionsDetails}
                    <div style={{ fontSize: '12px', color: '#b45309', marginTop: '6px' }}>
                      ℹ️ Monitor vitals (BP / Blood Glucose) prior to invasive dental surgical procedures.
                    </div>
                  </div>
                ) : (
                  <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '13.5px', margin: 0 }}>
                    No recorded chronic conditions (Hypertension, Diabetes, Cardiac disease, Asthma, Bleeding disorders).
                  </p>
                )}
              </article>

              <article className="pat-card">
                <div className="pat-card-head">
                  <h3><Phone size={16} /> Emergency Safety Contact</h3>
                </div>
                <dl className="pat-dl">
                  <div className="pat-dl-row">
                    <dt>Contact Person</dt>
                    <dd>{patient.emergencyName || 'Not specified'}</dd>
                  </div>
                  <div className="pat-dl-row">
                    <dt>Phone</dt>
                    <dd>{patient.emergencyPhone || '—'}</dd>
                  </div>
                  <div className="pat-dl-row">
                    <dt>Relationship</dt>
                    <dd>{patient.relationship || 'Spouse / Next of Kin'}</dd>
                  </div>
                </dl>
              </article>
            </div>
          </div>
        )}

        {/* TAB 3: VISIT TIMELINE */}
        {activeTab === 'timeline' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                  Chronological Visit Timeline
                </h3>
                <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '13px' }}>
                  All recorded appointments, clinical encounters, procedures, and findings.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <Link to={`/clinical/notes?patientId=${patient.id}`} className="pat-btn pat-btn-secondary">
                  <FileText size={13} /> New Clinical Note
                </Link>
                <Link to={`/appointments/new?patientId=${patient.id}`} className="pat-btn pat-btn-primary">
                  <CalendarPlus size={13} /> Book Visit
                </Link>
              </div>
            </div>

            {patientAppointments.length > 0 ? (
              <div className="pat-timeline">
                {patientAppointments.map((appt) => {
                  const linkedNote = patientNotes.find((n) => n.visitDate === appt.date)
                  return (
                    <div key={appt.id} className="pat-timeline-item">
                      <div className="pat-timeline-dot">
                        <Calendar size={11} style={{ color: 'var(--teal-primary, #0b8185)' }} />
                      </div>

                      <div className="pat-timeline-card">
                        <div className="pat-timeline-head">
                          <div>
                            <div className="pat-timeline-date">{appt.date} · {appt.time}</div>
                            <div className="pat-timeline-title">
                              {appt.treatmentType || appt.visitType}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="pat-badge is-primary" style={{ textTransform: 'capitalize' }}>
                              {appt.status}
                            </span>
                            <Link
                              to={`/appointments/${appt.id}`}
                              style={{ fontSize: '12px', color: 'var(--teal-primary, #0b8185)', textDecoration: 'none', fontWeight: 500 }}
                            >
                              View Appointment →
                            </Link>
                          </div>
                        </div>

                        <div style={{ fontSize: '13px', color: 'var(--text-muted, #475569)' }}>
                          <strong>Doctor:</strong> {appt.doctor} {appt.chair && `• ${appt.chair}`}
                        </div>

                        {appt.notes && (
                          <div style={{ fontSize: '12.5px', color: 'var(--text-main, #0f172a)', background: 'var(--surface, #ffffff)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--line, #e2e8f0)' }}>
                            <strong>Appointment Notes: </strong>{appt.notes}
                          </div>
                        )}

                        {linkedNote && (
                          <div style={{ fontSize: '12.5px', background: 'rgba(11, 129, 133, 0.04)', padding: '10px 12px', borderRadius: '6px', border: '1px solid rgba(11, 129, 133, 0.15)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--teal-primary, #0b8185)' }}>Clinical Note Record</div>
                            <div><strong>Complaint:</strong> {linkedNote.complaint}</div>
                            <div><strong>Findings:</strong> {linkedNote.findings}</div>
                            <div><strong>Plan:</strong> {linkedNote.plan}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--surface-subtle, #f8fafc)', borderRadius: '10px', border: '1px solid var(--line, #e2e8f0)' }}>
                <Clock size={28} style={{ color: 'var(--text-muted, #94a3b8)', marginBottom: '8px' }} />
                <h4 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>No visits recorded yet</h4>
                <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '13px' }}>
                  When this patient checks in for appointments or consultations, their timeline will populate chronologically.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: DOCUMENTS */}
        {activeTab === 'documents' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                  Diagnostic Records & Radiographs
                </h3>
                <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '13px' }}>
                  Intraoral RVG scans, panoramic radiographs (OPG), photos, and lab records.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setUploadModalOpen(true)}
                className="pat-btn pat-btn-primary"
              >
                <Upload size={13} /> Upload Document
              </button>
            </div>

            {patientDocs.length > 0 ? (
              <div className="pat-docs-grid">
                {patientDocs.map((doc) => (
                  <div key={doc.id} className="pat-doc-card">
                    <div className="pat-doc-info">
                      <span className="pat-doc-icon">
                        <FileText size={20} />
                      </span>
                      <div className="pat-doc-text">
                        <h4>{doc.title}</h4>
                        <p>{doc.category} · {doc.uploadDate}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>
                          {doc.fileName} ({doc.fileSize})
                        </p>
                      </div>
                    </div>

                    <div className="pat-doc-actions">
                      <button
                        type="button"
                        onClick={() => alert(`Opening preview for ${doc.fileName} (Digital DICOM Viewer)`)}
                        className="pat-action-btn"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                      >
                        <ExternalLink size={12} /> Preview Scan
                      </button>

                      <button
                        type="button"
                        onClick={() => alert(`Downloading record: ${doc.fileName}`)}
                        className="pat-action-btn"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                      >
                        <FileDown size={12} /> Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--surface-subtle, #f8fafc)', borderRadius: '10px', border: '1px solid var(--line, #e2e8f0)' }}>
                <FileText size={28} style={{ color: 'var(--text-muted, #94a3b8)', marginBottom: '8px' }} />
                <h4 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>No documents uploaded yet</h4>
                <p style={{ margin: '0 0 12px 0', color: 'var(--text-muted, #64748b)', fontSize: '13px' }}>
                  Upload digital radiographs, scan reports, or treatment consent files.
                </p>
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(true)}
                  className="pat-btn pat-btn-secondary"
                  style={{ padding: '6px 14px', fontSize: '12.5px' }}
                >
                  <Upload size={13} /> Add First Document
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: CONSENT RECORDS */}
        {activeTab === 'consents' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                  Informed Consent & Regulatory Records
                </h3>
                <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '13px' }}>
                  Signed procedural consents in compliance with DCI clinical practice guidelines.
                </p>
              </div>

              <div style={{ fontSize: '12px', color: '#059669', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <CheckCircle2 size={14} /> ABDM & Digital Consent Compliant
              </div>
            </div>

            {patientConsentList.length > 0 ? (
              <div>
                {patientConsentList.map((c) => (
                  <div key={c.id} className="pat-consent-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                      <div>
                        <strong style={{ fontSize: '14px', color: 'var(--text-main, #0f172a)' }}>
                          {c.consentType}
                        </strong>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', marginTop: '3px' }}>
                          Recorded by: {c.recordedBy} · Date: {c.dateRecorded} {c.documentRef && `· Ref: ${c.documentRef}`}
                        </div>
                      </div>

                      <span className={c.status === 'Signed' ? 'pat-consent-status-signed' : 'pat-consent-status-pending'}>
                        {c.status}
                      </span>
                    </div>

                    {c.notes && (
                      <div style={{ fontSize: '12.5px', color: 'var(--text-muted, #475569)', background: 'var(--surface, #fff)', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--line, #e2e8f0)' }}>
                        {c.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '40px 20px', textAlign: 'center', background: 'var(--surface-subtle, #f8fafc)', borderRadius: '10px', border: '1px solid var(--line, #e2e8f0)' }}>
                <CheckCircle2 size={28} style={{ color: 'var(--text-muted, #94a3b8)', marginBottom: '8px' }} />
                <h4 style={{ margin: '0 0 4px 0', fontSize: '15px' }}>No specific procedural consents on file</h4>
                <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '13px' }}>
                  Informed consents signed prior to invasive procedures or endodontic treatments will be logged here.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── EDIT PATIENT MODAL DIALOG ── */}
      {editModalOpen && (
        <div className="pat-modal-overlay" onClick={() => setEditModalOpen(false)}>
          <div className="pat-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="pat-modal-header">
              <h3>Edit Patient Details: {patient.id}</h3>
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #64748b)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="pat-modal-body">
                <div className="pat-form-row">
                  <div className="pat-form-group">
                    <label>First Name</label>
                    <input
                      className="pat-form-input"
                      value={editForm.firstName || ''}
                      onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="pat-form-group">
                    <label>Last Name</label>
                    <input
                      className="pat-form-input"
                      value={editForm.lastName || ''}
                      onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="pat-form-row">
                  <div className="pat-form-group">
                    <label>Mobile Number</label>
                    <input
                      className="pat-form-input"
                      value={editForm.mobile || ''}
                      onChange={(e) => setEditForm({ ...editForm, mobile: e.target.value })}
                      required
                    />
                  </div>
                  <div className="pat-form-group">
                    <label>Email Address</label>
                    <input
                      className="pat-form-input"
                      type="email"
                      value={editForm.email || ''}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pat-form-group">
                  <label>Residential Address</label>
                  <input
                    className="pat-form-input"
                    value={editForm.address || ''}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  />
                </div>

                <div className="pat-form-row">
                  <div className="pat-form-group">
                    <label>Emergency Contact Name</label>
                    <input
                      className="pat-form-input"
                      value={editForm.emergencyName || ''}
                      onChange={(e) => setEditForm({ ...editForm, emergencyName: e.target.value })}
                    />
                  </div>
                  <div className="pat-form-group">
                    <label>Emergency Phone</label>
                    <input
                      className="pat-form-input"
                      value={editForm.emergencyPhone || ''}
                      onChange={(e) => setEditForm({ ...editForm, emergencyPhone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="pat-form-group">
                  <label>Allergies & Sensitivities (Details)</label>
                  <input
                    className="pat-form-input"
                    placeholder="e.g. Penicillin, Latex, NSAIDs"
                    value={editForm.allergiesDetails || ''}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      allergies: e.target.value ? 'yes' : 'no',
                      allergiesDetails: e.target.value
                    })}
                  />
                </div>

                <div className="pat-form-group">
                  <label>Current Medications</label>
                  <input
                    className="pat-form-input"
                    placeholder="e.g. Blood pressure medication, Metformin"
                    value={editForm.medicationsDetails || ''}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      medications: e.target.value ? 'yes' : 'no',
                      medicationsDetails: e.target.value
                    })}
                  />
                </div>

                <div className="pat-form-group">
                  <label>Systemic Conditions</label>
                  <input
                    className="pat-form-input"
                    placeholder="e.g. Hypertension, Diabetes, Asthma"
                    value={editForm.conditionsDetails || ''}
                    onChange={(e) => setEditForm({
                      ...editForm,
                      conditions: e.target.value ? 'yes' : 'no',
                      conditionsDetails: e.target.value
                    })}
                  />
                </div>
              </div>

              <div className="pat-modal-footer">
                <button
                  type="button"
                  className="pat-btn pat-btn-secondary"
                  onClick={() => setEditModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="pat-btn pat-btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── UPLOAD DOCUMENT MODAL ── */}
      {uploadModalOpen && (
        <div className="pat-modal-overlay" onClick={() => setUploadModalOpen(false)}>
          <div className="pat-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="pat-modal-header">
              <h3>Upload Diagnostic Document</h3>
              <button
                type="button"
                onClick={() => setUploadModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #64748b)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUploadDoc}>
              <div className="pat-modal-body">
                <div className="pat-form-group">
                  <label>Document Title</label>
                  <input
                    className="pat-form-input"
                    placeholder="e.g. Post-obturation RVG #46"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="pat-form-group">
                  <label>Category</label>
                  <select
                    className="pat-form-select"
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value as PatientDocumentRecord['category'])}
                  >
                    <option value="Radiology">Radiology (X-Ray / OPG)</option>
                    <option value="Intraoral Photo">Intraoral Photo</option>
                    <option value="Lab Report">Lab Report</option>
                    <option value="Prescription">Prescription</option>
                    <option value="Consent">Consent Record</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div style={{ border: '2px dashed var(--line, #cbd5e1)', padding: '24px', borderRadius: '10px', textAlign: 'center', background: 'var(--surface-subtle, #f8fafc)' }}>
                  <Upload size={24} style={{ color: 'var(--teal-primary, #0b8185)', marginBottom: '6px' }} />
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>Select DICOM or image file from local device</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                    Supports DICOM, JPG, PNG, PDF up to 25MB
                  </div>
                </div>
              </div>

              <div className="pat-modal-footer">
                <button
                  type="button"
                  className="pat-btn pat-btn-secondary"
                  onClick={() => setUploadModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="pat-btn pat-btn-primary">
                  Upload Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

export default PatientProfilePage
