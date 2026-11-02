import React, { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarPlus,
  FileText,
  UserRound,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  Clock,
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

  // Edit Patient Modal State
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState<Partial<PatientRecord>>({})

  // Document Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [docTitle, setDocTitle] = useState('')
  const [docCategory, setDocCategory] = useState<PatientDocumentRecord['category']>('Radiology')
  const [expandedVisitIds, setExpandedVisitIds] = useState<string[]>(() =>
    patientAppointments[0] ? [patientAppointments[0].id] : []
  )

  const toggleVisitDetails = (appointmentId: string) => {
    setExpandedVisitIds((expandedIds) =>
      expandedIds.includes(appointmentId)
        ? expandedIds.filter((expandedId) => expandedId !== appointmentId)
        : [...expandedIds, appointmentId]
    )
  }

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
      <style>{`
        .pat-profile-layout {
          display: grid;
          grid-template-columns: 300px minmax(0, 1fr);
          gap: 28px;
          align-items: start;
        }
        .pat-profile-main {
          min-width: 0;
        }
        .pat-profile-sidebar {
          box-sizing: border-box;
          overflow: visible;
          padding: 0 16px 16px;
          border: 1px solid #E3EAEA;
          border-radius: 20px;
          background: #fff;
          box-shadow: none;
        }
        .pat-profile-banner {
          height: 76px;
          margin: 0 -16px;
          background: #D5EDEA;
        }
        .pat-profile-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 80px;
          height: 80px;
          margin: -40px auto 10px;
          border: 4px solid #fff;
          border-radius: 50%;
          background: #0F766E;
          color: #fff;
          font-size: 22px;
          font-weight: 700;
        }
        .pat-profile-patient-name {
          margin: 0 0 8px;
          color: var(--text-main, #0f172a);
          font-size: 22px;
          font-weight: 700;
          line-height: 1.25;
          text-align: center;
        }
        .pat-profile-id-row,
        .pat-profile-demographics,
        .pat-profile-actions,
        .pat-profile-contact,
        .pat-profile-contact-item,
        .pat-profile-menu-row {
          display: flex;
          align-items: center;
        }
        .pat-profile-id-row {
          justify-content: center;
          gap: 6px;
        }
        .pat-profile-status {
          padding: 3px 8px;
          border-radius: 999px;
          background: #E8F5EC;
          color: #26834A;
          font-size: 11px;
          font-weight: 600;
        }
        .pat-profile-id {
          color: var(--text-muted, #64748b);
          font-size: 11px;
        }
        .pat-profile-demographics {
          justify-content: center;
          gap: 5px;
          margin: 8px 0 16px;
          color: var(--text-muted, #64748b);
          font-size: 12px;
        }
        .pat-profile-actions {
          gap: 8px;
        }
        .pat-profile-action {
          box-sizing: border-box;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 44px;
          border: 1px solid #D8E2E2;
          border-radius: 9px;
          background: #fff;
          color: var(--text-main, #0f172a);
          font: inherit;
          font-size: 12px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
        }
        .pat-profile-action-primary {
          width: 100%;
          margin-bottom: 8px;
          border-color: #0F766E;
          background: #0F766E;
          color: #fff;
        }
        .pat-profile-action-primary:hover {
          background: #0b625c;
          color: #fff;
        }
        .pat-profile-action-secondary {
          flex: 1;
        }
        .pat-more-menu {
          position: relative;
        }
        .pat-more-menu summary {
          width: 44px;
          list-style: none;
          font-size: 20px;
        }
        .pat-more-menu summary::-webkit-details-marker {
          display: none;
        }
        .pat-profile-menu {
          position: absolute;
          z-index: 5;
          top: calc(100% + 6px);
          right: 0;
          min-width: 150px;
          padding: 5px;
          border: 1px solid #E3EAEA;
          border-radius: 9px;
          background: #fff;
          box-shadow: 0 8px 20px rgba(15, 23, 42, .12);
        }
        .pat-profile-menu-row {
          width: 100%;
          min-height: 40px;
          gap: 8px;
          padding: 0 9px;
          border: 0;
          border-radius: 6px;
          background: transparent;
          color: var(--text-main, #0f172a);
          font: inherit;
          font-size: 12px;
          text-align: left;
          text-decoration: none;
          cursor: pointer;
        }
        .pat-profile-menu-row:hover {
          background: #F3F7F7;
        }
        .pat-profile-allergies {
          margin-top: 16px;
          padding: 10px;
          border: 1px solid #F6D5D5;
          border-radius: 10px;
          background: #FFF4F4;
        }
        .pat-profile-allergies-title {
          margin: 0 0 7px;
          color: #7F3030;
          font-size: 12px;
          font-weight: 700;
        }
        .pat-profile-allergy-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }
        .pat-profile-allergy-chip {
          padding: 3px 7px;
          border-radius: 999px;
          background: #FCE5E5;
          color: #8F3C3C;
          font-size: 10px;
          font-weight: 600;
        }
        .pat-profile-condition {
          margin: 7px 0 0;
          color: #7F3030;
          font-size: 11px;
          line-height: 1.4;
        }
        .pat-profile-medical-link,
        .pat-profile-edit-link {
          display: inline-block;
          padding: 0;
          border: 0;
          background: none;
          color: #0F766E;
          font: inherit;
          font-size: 11px;
          font-weight: 600;
          text-decoration: none;
          cursor: pointer;
        }
        .pat-profile-medical-link {
          margin-top: 9px;
        }
        .pat-profile-contact {
          flex-direction: column;
          align-items: stretch;
          gap: 10px;
          margin-top: 16px;
          color: var(--text-main, #334155);
          font-size: 11px;
        }
        .pat-profile-contact-item {
          align-items: flex-start;
          gap: 8px;
          line-height: 1.45;
          overflow-wrap: anywhere;
        }
        .pat-profile-contact-item svg {
          flex: 0 0 auto;
          margin-top: 1px;
          color: #64817F;
        }
        .pat-profile-edit-link {
          margin-top: 15px;
        }
        @media (max-width: 900px) {
          .pat-profile-layout {
            grid-template-columns: minmax(0, 1fr);
            gap: 20px;
          }
          .pat-profile-sidebar {
            width: 100%;
          }
        }
      `}</style>
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

      <div className="pat-profile-layout">
        <aside className="pat-profile-sidebar" aria-label="Patient details">
          <div className="pat-profile-banner" />
          <span className="pat-profile-avatar">{initials}</span>
          <h1 className="pat-profile-patient-name">{patient.firstName} {patient.lastName}</h1>
          <div className="pat-profile-id-row">
            <span className="pat-profile-status">Active</span>
            <span className="pat-profile-id">{patient.id}</span>
          </div>
          <div className="pat-profile-demographics">
            <span>{patient.age ? `${patient.age} yrs` : patient.dateOfBirth || '—'}</span>
            <span aria-hidden="true">·</span>
            <span style={{ textTransform: 'capitalize' }}>{patient.gender || 'Patient'}</span>
          </div>

          <Link
            className="pat-profile-action pat-profile-action-primary"
            to={`/clinical/notes?patientId=${patient.id}`}
            title="Start or review clinical consultation note"
          >
            Start consultation
          </Link>
          <div className="pat-profile-actions">
            <Link
              className="pat-profile-action pat-profile-action-secondary"
              to={`/appointments/new?patientId=${patient.id}`}
              title="Schedule consultation or dental procedure"
            >
              Book appointment
            </Link>
            <details className="pat-more-menu">
              <summary className="pat-profile-action" aria-label="More patient actions" title="More patient actions">
                ⋯
              </summary>
              <div className="pat-profile-menu">
                <button type="button" className="pat-profile-menu-row" onClick={openEditModal}>
                  <Edit3 size={14} />
                  <span>Edit Patient</span>
                </button>
                <Link className="pat-profile-menu-row" to={`/patients/${patient.id}/tooth-chart`}>
                  <Layers size={14} />
                  <span>Tooth Chart</span>
                </Link>
              </div>
            </details>
          </div>

          <section className="pat-profile-allergies" aria-label="Allergies and medical alerts">
            <h2 className="pat-profile-allergies-title">Allergies</h2>
            {patient.allergies === 'yes' && patient.allergiesDetails ? (
              <div className="pat-profile-allergy-chips">
                {patient.allergiesDetails.split(/[,;]+/).map((allergy, index) => (
                  <span className="pat-profile-allergy-chip" key={`${allergy}-${index}`}>
                    {allergy.trim()}
                  </span>
                ))}
              </div>
            ) : (
              <div className="pat-profile-allergy-chips">
                <span className="pat-profile-allergy-chip">
                  {patient.allergies === 'yes' ? 'Allergy reported' : 'No known allergies'}
                </span>
              </div>
            )}
            {patient.conditions === 'yes' && patient.conditionsDetails && (
              <p className="pat-profile-condition">
                <strong>Conditions:</strong> {patient.conditionsDetails}
              </p>
            )}
            <button type="button" className="pat-profile-medical-link" onClick={() => setTab('medical')}>
              All medical alerts →
            </button>
          </section>

          <div className="pat-profile-contact" aria-label="Contact information">
            <div className="pat-profile-contact-item">
              <Phone size={14} />
              <span>{patient.countryCode} {patient.mobile}</span>
            </div>
            {patient.email && (
              <div className="pat-profile-contact-item">
                <Mail size={14} />
                <span>{patient.email}</span>
              </div>
            )}
            <div className="pat-profile-contact-item">
              <MapPin size={14} />
              <span>
                {[patient.address, patient.city, patient.state, patient.postalCode].filter(Boolean).join(', ') || 'Address not provided'}
              </span>
            </div>
            <div className="pat-profile-contact-item">
              <UserRound size={14} />
              <span>
                {patient.emergencyName || 'Emergency contact not specified'}
                {patient.relationship && ` (${patient.relationship})`}
                {patient.emergencyPhone && ` · ${patient.emergencyPhone}`}
              </span>
            </div>
          </div>
          <button type="button" className="pat-profile-edit-link" onClick={openEditModal}>
            Edit details
          </button>
        </aside>

        <div className="pat-profile-main">
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
          <div className="pat-overview">
            <article className="pat-overview-appointment">
              {nextAppointment ? (
                <>
                  <div className="pat-overview-appointment-copy">
                    <p className="pat-overview-eyebrow">
                      {nextAppointment.date === new Date().toISOString().slice(0, 10) ? 'Today' : nextAppointment.date}
                      {nextAppointment.time && ` · ${nextAppointment.time}`}
                    </p>
                    <h2>{nextAppointment.treatmentType || nextAppointment.visitType}</h2>
                    {(nextAppointment.doctor || nextAppointment.chair) && (
                      <p className="pat-overview-appointment-meta">
                        {nextAppointment.doctor}
                        {nextAppointment.doctor && nextAppointment.chair && ' · '}
                        {nextAppointment.chair}
                      </p>
                    )}
                  </div>
                  <Link className="pat-overview-open-visit" to={`/appointments/${nextAppointment.id}`}>
                    Open visit
                  </Link>
                </>
              ) : (
                <div className="pat-overview-appointment-copy">
                  <p className="pat-overview-eyebrow">Appointment</p>
                  <h2>No upcoming appointment</h2>
                  <Link className="pat-overview-open-visit" to={`/appointments/new?patientId=${patient.id}`}>
                    Book appointment
                  </Link>
                </div>
              )}
            </article>

            <article className="pat-overview-card pat-overview-treatment-card">
              <div className="pat-overview-card-header">
                <h2 className="pat-overview-card-title">Treatment plan</h2>
                <Link to="/clinical/treatment-plans" className="pat-overview-link">
                  View all →
                </Link>
              </div>
              {pendingTreatments.length > 0 ? (
                <div className="pat-overview-treatment-list">
                  {pendingTreatments.map((plan) => (
                    <div className="pat-overview-treatment-row" key={plan.id}>
                      <span className="pat-overview-treatment-icon"><Stethoscope size={17} /></span>
                      <div className="pat-overview-treatment-copy">
                        <strong>{plan.procedure}</strong>
                        {plan.toothNumber && <span>Tooth #{plan.toothNumber}</span>}
                      </div>
                      <span className={`pat-overview-status ${plan.status === 'In Progress' ? 'is-in-progress' : 'is-pending'}`}>
                        {plan.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="pat-overview-empty">No pending treatment plans.</p>
              )}
            </article>

            <div className="pat-overview-summary-row">
              <article className="pat-overview-card pat-overview-summary-card">
                <h2 className="pat-overview-card-title">Last visit</h2>
                {lastAppointment ? (
                  <>
                    <strong className="pat-overview-summary-title">
                      {lastAppointment.treatmentType || lastAppointment.visitType}
                    </strong>
                    <span className="pat-overview-summary-meta">{lastAppointment.date}</span>
                    <span className="pat-overview-last-status">{lastAppointment.status}</span>
                  </>
                ) : (
                  <span className="pat-overview-summary-meta">No recorded prior visits.</span>
                )}
                <button type="button" className="pat-overview-link pat-overview-summary-link" onClick={() => setTab('timeline')}>
                  All visits →
                </button>
              </article>

              <article className="pat-overview-card pat-overview-summary-card">
                <h2 className="pat-overview-card-title">Outstanding</h2>
                <strong className="pat-overview-outstanding-total">
                  ₹{patientInvoices.filter((invoice) => invoice.status === 'Unpaid').reduce((total, invoice) => total + invoice.amount, 0).toLocaleString('en-IN')}
                </strong>
                <div className="pat-overview-billing-links">
                  <Link to={`/billing/invoices?patientId=${patient.id}`} className="pat-overview-link">
                    View billing →
                  </Link>
                  <Link to={`/billing/invoices/new?patientId=${patient.id}`} className="pat-overview-link">
                    New invoice
                  </Link>
                </div>
              </article>
            </div>
          </div>
        )}

        {/* TAB 2: MEDICAL HISTORY */}
        {activeTab === 'medical' && (
          <section className="pat-medical-card">
            <header className="pat-medical-header">
              <div>
                <h2 className="pat-medical-title">Medical history</h2>
                <p className="pat-medical-subtitle">
                  Recorded at intake and verified by the treating clinician.
                </p>
              </div>
              <button type="button" onClick={openEditModal} className="pat-btn pat-btn-secondary pat-medical-edit">
                <Edit3 size={13} /> Edit Medical Details
              </button>
            </header>

            <div className="pat-medical-sections">
              {patient.allergies !== 'unknown' && (
                <section className="pat-medical-section">
                  <h3 className="pat-medical-label">Allergies</h3>
                  <div className="pat-medical-content">
                    {patient.allergies === 'yes' ? (
                      <>
                        <div className="pat-medical-chips">
                          {(patient.allergiesDetails || 'Allergy reported').split(/[,;\n]+/).map((allergy, index) => (
                            allergy.trim() && (
                              <span className="pat-medical-chip is-allergy" key={`${allergy}-${index}`}>
                                {allergy.trim()}
                              </span>
                            )
                          ))}
                        </div>
                        <p className="pat-medical-note">
                          Verify anesthesia and prescribed medicines for allergy safety.
                        </p>
                      </>
                    ) : (
                      <p className="pat-medical-value">No known allergies recorded.</p>
                    )}
                  </div>
                </section>
              )}

              {patient.medications !== 'unknown' && (
                <section className="pat-medical-section">
                  <h3 className="pat-medical-label">Current medications</h3>
                  <div className="pat-medical-content">
                    {patient.medications === 'yes' ? (
                      patient.medicationsDetails ? (
                        <ul className="pat-medical-medication-list">
                          {patient.medicationsDetails.split(/[;\n]+/).map((item, index) => {
                            const medication = item.trim()
                            if (!medication) return null
                            const contraindicated = /\b(?:contraindicated|avoid)\b/i.test(medication)
                            const name = medication
                              .replace(/\b(?:is\s+)?contraindicated\b/ig, '')
                              .replace(/\bavoid\b/ig, '')
                              .trim()

                            return (
                              <li key={`${medication}-${index}`}>
                                {contraindicated && <span className="pat-medical-chip is-avoid">Avoid</span>}
                                {name || medication}
                              </li>
                            )
                          })}
                        </ul>
                      ) : null
                    ) : (
                      <p className="pat-medical-value">None reported.</p>
                    )}
                  </div>
                </section>
              )}

              {patient.conditions !== 'unknown' && (
                <section className="pat-medical-section">
                  <h3 className="pat-medical-label">Medical conditions</h3>
                  <div className="pat-medical-content">
                    {patient.conditions === 'yes' ? (
                      <>
                        {patient.conditionsDetails && (
                          <div className="pat-medical-chips">
                            {patient.conditionsDetails.split(/[,;\n]+/).map((condition, index) => (
                              condition.trim() && (
                                <span className="pat-medical-chip is-condition" key={`${condition}-${index}`}>
                                  {condition.trim()}
                                </span>
                              )
                            ))}
                          </div>
                        )}
                        <p className="pat-medical-note">
                          Monitor blood pressure and glucose before invasive dental procedures.
                        </p>
                      </>
                    ) : (
                      <p className="pat-medical-value">No medical conditions recorded.</p>
                    )}
                  </div>
                </section>
              )}

              {patient.language && (
                <section className="pat-medical-section">
                  <h3 className="pat-medical-label">Preferred language</h3>
                  <div className="pat-medical-content">
                    <p className="pat-medical-value">{patient.language}</p>
                  </div>
                </section>
              )}

            </div>
          </section>
        )}

        {/* TAB 3: VISIT TIMELINE */}
        {activeTab === 'timeline' && (
          <section className="pat-visit-card">
            <header className="pat-visit-header">
              <div>
                <h2 className="pat-visit-title">Visit timeline</h2>
                <p className="pat-visit-subtitle">
                  All appointments, notes and findings, newest first.
                </p>
              </div>
              <div className="pat-visit-header-actions">
                <Link to={`/clinical/notes?patientId=${patient.id}`} className="pat-btn pat-btn-secondary pat-visit-action">
                  <FileText size={13} /> New clinical note
                </Link>
                <Link to={`/appointments/new?patientId=${patient.id}`} className="pat-btn pat-btn-primary pat-visit-action">
                  <CalendarPlus size={13} /> Book visit
                </Link>
              </div>
            </header>

            {patientAppointments.length > 0 ? (
              <div className="pat-visit-timeline">
                {patientAppointments.map((appt, index) => {
                  const linkedNote = patientNotes.find((n) => n.visitDate === appt.date)
                  const expanded = expandedVisitIds.includes(appt.id)
                  const appointmentNote = appt.notes?.trim()
                  const noteParts = [
                    linkedNote?.complaint?.trim(),
                    linkedNote?.findings?.trim(),
                    linkedNote?.plan?.trim()
                  ].filter((part): part is string => Boolean(part))
                  const normalize = (text: string) => text.toLocaleLowerCase().replace(/\s+/g, ' ').trim()
                  const appendAppointmentNote = Boolean(
                    appointmentNote &&
                    !noteParts.some((part) =>
                      normalize(part).includes(normalize(appointmentNote)) ||
                      normalize(appointmentNote).includes(normalize(part))
                    )
                  )
                  const hasDetails = Boolean(linkedNote || appointmentNote)
                  const normalizedStatus = appt.status.toLowerCase()
                  const statusClass = normalizedStatus === 'in-progress' || normalizedStatus === 'in progress'
                    ? 'is-in-progress'
                    : normalizedStatus === 'completed'
                      ? 'is-completed'
                      : 'is-other'
                  const statusLabel = appt.status.replace(/-/g, ' ')

                  return (
                    <article key={appt.id} className="pat-visit-item">
                      <span className={`pat-visit-dot ${index === 0 ? 'is-newest' : ''}`} aria-hidden="true" />
                      <div className="pat-visit-entry">
                        <div className="pat-visit-row">
                          <h3 className="pat-visit-entry-title">{appt.treatmentType || appt.visitType}</h3>
                          <span className={`pat-visit-status ${statusClass}`}>{statusLabel}</span>
                        </div>
                        <p className="pat-visit-meta">
                          {[appt.date, appt.time, appt.doctor, appt.chair].filter(Boolean).join(' · ')}
                        </p>

                        {hasDetails && (
                          <button
                            type="button"
                            className="pat-visit-toggle"
                            aria-expanded={expanded}
                            aria-controls={`visit-details-${appt.id}`}
                            onClick={() => toggleVisitDetails(appt.id)}
                          >
                            {expanded ? 'Hide details ▴' : 'Show details ▾'}
                          </button>
                        )}

                        {expanded && (
                          <>
                            {hasDetails && (
                              <div className="pat-visit-details" id={`visit-details-${appt.id}`}>
                                {linkedNote?.complaint?.trim() && (
                                  <p><strong>Complaint:</strong> {linkedNote.complaint}</p>
                                )}
                                {linkedNote?.findings?.trim() && (
                                  <p><strong>Findings:</strong> {linkedNote.findings}</p>
                                )}
                                {(linkedNote?.plan?.trim() || (appointmentNote && appendAppointmentNote)) && (
                                  <p>
                                    <strong>Plan:</strong>{' '}
                                    {linkedNote?.plan?.trim()}
                                    {linkedNote?.plan?.trim() && appointmentNote && appendAppointmentNote ? ' ' : ''}
                                    {appointmentNote && appendAppointmentNote ? appointmentNote : ''}
                                  </p>
                                )}
                              </div>
                            )}
                          </>
                        )}
                        {(expanded || !hasDetails) && (
                          <Link to={`/appointments/${appt.id}`} className="pat-visit-link">
                            View appointment →
                          </Link>
                        )}
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="pat-visit-empty">
                <Clock size={28} aria-hidden="true" />
                <h3>No visits recorded yet</h3>
                <p>
                  When this patient checks in for appointments or consultations, their timeline will populate chronologically.
                </p>
              </div>
            )}
          </section>
        )}

        {/* TAB 4: DOCUMENTS */}
        {activeTab === 'documents' && (
          <section className="pat-documents-card">
            <header className="pat-documents-header">
              <div>
                <h2 className="pat-documents-title">Documents</h2>
                <p className="pat-documents-subtitle">X-rays, scans and reports.</p>
              </div>
              <button
                type="button"
                onClick={() => setUploadModalOpen(true)}
                className="pat-btn pat-btn-primary pat-documents-upload"
              >
                <Upload size={15} /> Upload document
              </button>
            </header>

            {patientDocs.length > 0 ? (
              <div className="pat-documents-list">
                {patientDocs.map((doc) => {
                  const dateValue = doc.uploadDate ? new Date(`${doc.uploadDate}T00:00:00`) : null
                  const formattedDate = dateValue && !Number.isNaN(dateValue.getTime())
                    ? dateValue.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })
                    : ''
                  const title = doc.title?.trim() || doc.fileName
                  const metadata = [doc.category, formattedDate, doc.fileSize].filter(Boolean).join(' · ')

                  return (
                    <article key={doc.id} className="pat-documents-row">
                      <div className="pat-documents-info">
                        <span className="pat-documents-icon" aria-hidden="true">
                          <FileText size={19} />
                        </span>
                        <div className="pat-documents-copy">
                          <h3>{title}</h3>
                          {metadata && <p>{metadata}</p>}
                        </div>
                      </div>
                      <div className="pat-documents-actions">
                        <button
                          type="button"
                          onClick={() => alert(`Opening preview for ${doc.fileName} (Digital DICOM Viewer)`)}
                          className="pat-btn pat-btn-secondary pat-documents-action"
                        >
                          <ExternalLink size={14} /> Preview
                        </button>
                        <button
                          type="button"
                          onClick={() => alert(`Downloading record: ${doc.fileName}`)}
                          className="pat-btn pat-btn-secondary pat-documents-action"
                        >
                          <FileDown size={14} /> Download
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="pat-documents-empty">
                <FileText size={26} aria-hidden="true" />
                <p>No documents uploaded yet.</p>
              </div>
            )}
          </section>
        )}

        {/* TAB 5: CONSENT RECORDS */}
        {activeTab === 'consents' && (
          <section className="pat-consents-panel">
            <header className="pat-consents-header">
              <div>
                <h2 className="pat-consents-title">Consent records</h2>
                <p className="pat-consents-subtitle">Signed and pending consent forms.</p>
              </div>
            </header>

            {patientConsentList.length > 0 ? (
              <div className="pat-consents-list">
                {patientConsentList.map((consent) => {
                  const dateValue = consent.dateRecorded
                    ? new Date(`${consent.dateRecorded}T00:00:00`)
                    : null
                  const formattedDate = dateValue && !Number.isNaN(dateValue.getTime())
                    ? dateValue.toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })
                    : ''
                  const metadata = [
                    consent.recordedBy,
                    formattedDate,
                    consent.documentRef ? `Ref: ${consent.documentRef}` : ''
                  ].filter(Boolean).join(' · ')
                  const statusClass = consent.status === 'Signed'
                    ? 'is-signed'
                    : consent.status === 'Pending'
                      ? 'is-pending'
                      : 'is-other'

                  return (
                    <article key={consent.id} className="pat-consents-row">
                      <div className="pat-consents-copy">
                        <h3>{consent.consentType}</h3>
                        {metadata && <p className="pat-consents-meta">{metadata}</p>}
                        {consent.notes && <p className="pat-consents-note">{consent.notes}</p>}
                      </div>
                      <div className="pat-consents-status-column">
                        <span className={`pat-consents-status ${statusClass}`}>{consent.status}</span>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="pat-consents-empty">
                <p>No consent records yet.</p>
              </div>
            )}
          </section>
        )}
      </div>
        </div>
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
