import React, { useMemo, useState, useEffect } from 'react'
import { Link, useParams, useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarPlus,
  FileText,
  Receipt,
  UserRound,
  AlertTriangle,
  TriangleAlert,
  Pill,
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
  Activity,
  Layers,
  Printer,
  MessageCircle,
  Plus,
  Eye,
  StickyNote
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import '@/i18n/config'
import {
  useClinicData,
  updatePatient,
  addPatientDocument,
  addPatientConsent,
  invoiceBalance,
  invoicePaidAmount,
  type PatientRecord,
  type TreatmentPlanRecord,
  type PatientDocumentRecord,
  type PatientConsentRecord,
  type PrescriptionRecord
} from '@/services/clinicStore'
import { PrescriptionModal } from '@/components/clinical/PrescriptionModal'
import { PrescriptionDetailsModal } from '@/components/clinical/PrescriptionDetailsModal'
import { PrescriptionPrintModal } from '@/components/clinical/PrescriptionPrintModal'
import { InvoiceDrawer, PaymentDialog, StatusPill, inr, localDate, prettyDate } from '@/pages/billing/BillingShared'
import './patientProfile.css'
import '@/pages/clinical/prescriptions.css'

type TabKey = 'overview' | 'medical' | 'timeline' | 'billing' | 'documents' | 'consents' | 'prescriptions'
const TAB_KEYS: TabKey[] = ['overview', 'medical', 'timeline', 'billing', 'documents', 'consents', 'prescriptions']

type ActivityKind = 'visit' | 'note' | 'billing' | 'document' | 'consent' | 'prescription'
type ActivityItem = { id: string; kind: ActivityKind; date: string; title: string; detail?: string; link?: string; tone?: 'ok' | 'warn' | 'bad' }

const ACTIVITY_FILTERS: { id: 'all' | ActivityKind; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'visit', label: 'Visits' },
  { id: 'note', label: 'Clinical notes' },
  { id: 'prescription', label: 'Prescriptions' },
  { id: 'billing', label: 'Billing' },
  { id: 'document', label: 'Documents' },
  { id: 'consent', label: 'Consents' }
]

const ACTIVITY_ICONS: Record<ActivityKind, React.ComponentType<{ size?: number }>> = {
  visit: Calendar,
  note: StickyNote,
  prescription: Pill,
  billing: Receipt,
  document: FileText,
  consent: CheckCircle2
}

/** Files up to this size are saved with the record; larger ones stay viewable until the page is reloaded. */
const MAX_STORED_FILE_BYTES = 1.5 * 1024 * 1024

const formatBytes = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })

const digitsOnly = (value: string) => value.replace(/[^\d]/g, '')

type MedicalRowProps = {
  icon: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>
  title: string
  description: string
  status?: string
  statusTone?: 'green' | 'gray' | 'amber'
  phone?: string
  dividerAbove?: boolean
  hasAlert?: boolean
}

const MedicalRow: React.FC<MedicalRowProps> = ({
  icon: Icon,
  title,
  description,
  status,
  statusTone = 'gray',
  phone,
  dividerAbove = false,
  hasAlert = false
}) => (
  <li className={`pat-medical-row${dividerAbove ? ' pat-medical-row--divided' : ''}${hasAlert ? ' pat-medical-row--alert' : ''}`}>
    <span className="pat-medical-row__icon">
      <Icon size={17} aria-hidden />
    </span>
    <div className="pat-medical-row__content">
      <h5 className="pat-medical-row__title">{title}</h5>
      <p className="pat-medical-row__description">{description}</p>
    </div>
    {status && <span className={`pat-medical-status pat-medical-status--${statusTone}`}>{status}</span>}
    {phone && phone !== '—' && (
      <a className="pat-medical-row__phone" href={`tel:${phone.replace(/[^\d+]/g, '')}`}>
        {phone}
      </a>
    )}
  </li>
)

export const PatientProfilePage: React.FC = () => {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const {
    patients,
    appointments,
    clinicalNotes,
    invoices,
    treatmentPlans = [],
    patientDocuments = [],
    patientConsents = [],
    prescriptions = []
  } = useClinicData()

  // Match patient by id (case-insensitive for safety)
  const patient = useMemo(() => {
    return patients.find((p) => p.id.toLowerCase() === (id || '').toLowerCase())
  }, [patients, id])

  // Resolve active tab based on pathname deep link (e.g. /patients/:id/timeline) or query param ?tab=...
  const activeTab: TabKey = useMemo(() => {
    const rawQuery = searchParams.get('tab')?.toLowerCase()
    if (rawQuery && TAB_KEYS.includes(rawQuery as TabKey)) return rawQuery as TabKey
    if (rawQuery === 'x-rays' || rawQuery === 'xrays' || rawQuery === 'radiographs') return 'documents'

    const path = location.pathname.toLowerCase()
    if (path.endsWith('/timeline')) return 'timeline'
    if (path.endsWith('/documents') || path.endsWith('/x-rays') || path.endsWith('/xrays')) return 'documents'
    if (path.endsWith('/consents')) return 'consents'
    if (path.endsWith('/prescriptions')) return 'prescriptions'
    if (path.endsWith('/billing')) return 'billing'
    if (path.endsWith('/pending-treatments')) return 'overview'
    return 'overview'
  }, [location.pathname, searchParams])

  // Switch tabs on the base profile URL so deep links like /patients/:id/timeline never pin the tab
  const setTab = (tab: TabKey) => {
    navigate(`/patients/${patient?.id || id}?tab=${tab}`, { replace: true })
  }

  // Prescription modal state
  const [rxModalOpen, setRxModalOpen] = useState(false)
  const [editingRx, setEditingRx] = useState<PrescriptionRecord | null>(null)
  const [viewingRx, setViewingRx] = useState<PrescriptionRecord | null>(null)
  const [printingRx, setPrintingRx] = useState<PrescriptionRecord | null>(null)

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

  const patientPrescriptions = useMemo(() => {
    return (prescriptions as PrescriptionRecord[]).filter(
      (p) =>
        p.patientId?.toLowerCase() === (id || '').toLowerCase() ||
        p.patient?.patientCode?.toLowerCase() === (id || '').toLowerCase() ||
        (patient?.backendId && p.patientId?.toLowerCase() === patient.backendId.toLowerCase())
    )
  }, [prescriptions, id, patient?.backendId])

  // Pending treatments for overview card
  const pendingTreatments = useMemo(() => {
    return patientPlans.filter((p) => p.status === 'Pending' || p.status === 'In Progress')
  }, [patientPlans])

  // Upcoming appointment
  const today = localDate()

  const nextAppointment = useMemo(() => {
    return patientAppointments
      .filter((a) => a.date >= today && a.status !== 'cancelled')
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0]
  }, [patientAppointments, today])

  // Last visit
  const lastAppointment = useMemo(() => {
    return patientAppointments
      .filter((a) => (a.date < today && a.status !== 'cancelled') || a.status === 'completed')
      .sort((a, b) => b.date.localeCompare(a.date))[0]
  }, [patientAppointments, today])

  const completedVisits = useMemo(() => patientAppointments.filter((a) => a.status === 'completed').length, [patientAppointments])

  // Money at a glance
  const billing = useMemo(() => {
    const billed = patientInvoices.reduce((s, inv) => s + inv.amount, 0)
    const paid = patientInvoices.reduce((s, inv) => s + invoicePaidAmount(inv), 0)
    const due = patientInvoices.reduce((s, inv) => s + invoiceBalance(inv), 0)
    const pendingPlanValue = pendingTreatments.reduce((s, p) => s + p.cost, 0)
    return { billed, paid, due, pendingPlanValue }
  }, [patientInvoices, pendingTreatments])

  const [openInvoiceId, setOpenInvoiceId] = useState<string | null>(null)
  const [payInvoiceId, setPayInvoiceId] = useState<string | null>(null)
  const openInvoice = patientInvoices.find((inv) => inv.id === openInvoiceId)
  const payInvoice = patientInvoices.find((inv) => inv.id === payInvoiceId)
  const oldestDueInvoice = useMemo(
    () => [...patientInvoices].filter((inv) => invoiceBalance(inv) > 0).sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0],
    [patientInvoices]
  )

  // Everything that happened to this patient, newest first
  const [activityFilter, setActivityFilter] = useState<'all' | ActivityKind>('all')
  const activity = useMemo<ActivityItem[]>(() => {
    const items: ActivityItem[] = []
    patientAppointments.forEach((a) => {
      const tone = a.status === 'completed' ? 'ok' : a.status === 'cancelled' || a.status === 'no-show' ? 'bad' : undefined
      items.push({
        id: `visit-${a.id}`,
        kind: 'visit',
        date: `${a.date}T${a.time || '00:00'}`,
        title: `${a.treatmentType || a.visitType} · ${a.status.replace('-', ' ')}`,
        detail: [a.doctor, a.chair, a.notes].filter(Boolean).join(' · '),
        link: `/appointments/${a.id}`,
        tone
      })
    })
    patientNotes.forEach((n) => {
      items.push({
        id: `note-${n.id}`,
        kind: 'note',
        date: n.createdAt || n.visitDate,
        title: `Clinical note: ${n.complaint}`,
        detail: [n.findings && `Findings: ${n.findings}`, n.plan && `Plan: ${n.plan}`].filter(Boolean).join(' · ')
      })
    })
    patientInvoices.forEach((inv) => {
      items.push({
        id: `inv-${inv.id}`,
        kind: 'billing',
        date: inv.createdAt,
        title: `Invoice ${inv.id} · ${inr(inv.amount)}`,
        detail: inv.description,
        tone: inv.status === 'Paid' ? 'ok' : inv.status === 'Partial' ? 'warn' : 'bad'
      })
      ;(inv.payments || []).forEach((pay) => {
        items.push({
          id: `pay-${pay.id}`,
          kind: 'billing',
          date: pay.receivedAt,
          title: `Payment received · ${inr(pay.amount)} by ${pay.mode}`,
          detail: `Against ${inv.id}${pay.reference ? ` · Ref ${pay.reference}` : ''}`,
          tone: 'ok'
        })
      })
    })
    patientDocs.forEach((d) => {
      items.push({ id: `doc-${d.id}`, kind: 'document', date: d.uploadDate, title: `Document added: ${d.title}`, detail: `${d.category} · ${d.fileName}` })
    })
    patientConsentList.forEach((c) => {
      items.push({
        id: `cns-${c.id}`,
        kind: 'consent',
        date: c.dateRecorded,
        title: `Consent ${c.status.toLowerCase()}: ${c.consentType}`,
        detail: `Recorded by ${c.recordedBy}`,
        tone: c.status === 'Signed' ? 'ok' : c.status === 'Declined' ? 'bad' : 'warn'
      })
    })
    patientPrescriptions.forEach((rx) => {
      const creationDate = rx.createdAt || rx.prescribedAt || new Date().toISOString()
      const meds = rx.items.map((it) => it.medicineName).join(', ')
      // 1. Creation event
      items.push({
        id: `rx-create-${rx.id}`,
        kind: 'prescription',
        date: creationDate,
        title: `Prescription ${rx.prescriptionNumber} created (${rx.status === 'DRAFT' ? 'Draft' : 'Issued'})`,
        detail: [rx.diagnosis, meds && `Meds: ${meds}`, rx.doctor?.fullName && `By ${rx.doctor.fullName}`].filter(Boolean).join(' · '),
        tone: rx.status === 'DRAFT' ? 'warn' : 'ok'
      })
      // 2. Finalization event (if persisted)
      if (rx.finalizedAt) {
        items.push({
          id: `rx-final-${rx.id}`,
          kind: 'prescription',
          date: rx.finalizedAt,
          title: `Prescription ${rx.prescriptionNumber} finalized`,
          detail: `Approved & finalized for dispensing · Diagnosis: ${rx.diagnosis}`,
          tone: 'ok'
        })
      }
      // 3. Cancellation event (if persisted)
      if (rx.cancelledAt) {
        items.push({
          id: `rx-canc-${rx.id}`,
          kind: 'prescription',
          date: rx.cancelledAt,
          title: `Prescription ${rx.prescriptionNumber} cancelled`,
          detail: `Reason: ${rx.cancellationReason || 'Prescription voided'}`,
          tone: 'bad'
        })
      }
    })
    return items.sort((a, b) => b.date.localeCompare(a.date))
  }, [patientAppointments, patientNotes, patientInvoices, patientDocs, patientConsentList, patientPrescriptions])
  const visibleActivity = activityFilter === 'all' ? activity : activity.filter((a) => a.kind === activityFilter)

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
    if (patient.medications === 'yes' && patient.medicationsDetails) {
      parts.push(`On medication: ${patient.medicationsDetails}`)
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
  const [docFile, setDocFile] = useState<File | null>(null)
  const [docSaving, setDocSaving] = useState(false)
  const [docNotice, setDocNotice] = useState('')
  const [previewDoc, setPreviewDoc] = useState<PatientDocumentRecord | null>(null)

  // Consent Modal State
  const [consentModalOpen, setConsentModalOpen] = useState(false)
  const [consentType, setConsentType] = useState('Informed Consent for Dental Treatment')
  const [consentStatus, setConsentStatus] = useState<PatientConsentRecord['status']>('Signed')
  const [consentNotes, setConsentNotes] = useState('')

  const openEditModal = () => {
    if (!patient) return
    setEditForm({
      firstName: patient.firstName,
      lastName: patient.lastName,
      mobile: patient.mobile,
      email: patient.email,
      dateOfBirth: patient.dateOfBirth,
      age: patient.age,
      gender: patient.gender,
      language: patient.language,
      address: patient.address,
      city: patient.city,
      state: patient.state,
      postalCode: patient.postalCode,
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

  const closeUpload = () => {
    setUploadModalOpen(false)
    setDocFile(null)
    setDocTitle('')
  }

  const pickDocFile = (file: File | null) => {
    setDocFile(file)
    if (file && !docTitle.trim()) setDocTitle(file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '))
    if (file && /^image\//.test(file.type) && docCategory === 'Radiology' && /photo|img|intraoral/i.test(file.name)) setDocCategory('Intraoral Photo')
  }

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!patient || !docTitle.trim() || !docFile) return
    setDocSaving(true)
    let url: string
    let kept = true
    try {
      if (docFile.size <= MAX_STORED_FILE_BYTES) {
        url = await readAsDataUrl(docFile)
      } else {
        url = URL.createObjectURL(docFile)
        kept = false
      }
    } catch {
      setDocSaving(false)
      setDocNotice('Could not read that file. Try again or choose another file.')
      return
    }
    addPatientDocument({
      patientId: patient.id,
      title: docTitle.trim(),
      category: docCategory,
      fileName: docFile.name,
      fileSize: formatBytes(docFile.size),
      url
    })
    setDocSaving(false)
    setDocNotice(kept ? '' : `"${docFile.name}" is larger than ${formatBytes(MAX_STORED_FILE_BYTES)}, so it can be viewed now but will not be kept after a page reload.`)
    closeUpload()
    setTab('documents')
  }

  const downloadDoc = (doc: PatientDocumentRecord) => {
    if (!doc.url) return
    const a = document.createElement('a')
    a.href = doc.url
    a.download = doc.fileName
    a.click()
  }

  // Escape closes whichever dialog is open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setEditModalOpen(false)
      setUploadModalOpen(false)
      setConsentModalOpen(false)
      setPreviewDoc(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleAddConsent = (e: React.FormEvent) => {
    e.preventDefault()
    if (!patient || !consentType.trim()) return
    addPatientConsent({
      patientId: patient.id,
      consentType: consentType.trim(),
      status: consentStatus,
      recordedBy: 'Dr. Arun Kumar',
      documentRef: `DMX-CNS-${Date.now().toString().slice(-6)}`,
      notes: consentNotes.trim() || undefined
    })
    setConsentType('Informed Consent for Dental Treatment')
    setConsentNotes('')
    setConsentModalOpen(false)
    setTab('consents')
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
  const phoneDigits = digitsOnly(`${patient.countryCode || ''}${patient.mobile || ''}`)
  const whatsappDigits = digitsOnly(`${patient.countryCode || '+91'}${patient.mobile || ''}`)
  const location_ = [patient.city, patient.state].filter(Boolean).join(', ')

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
              </div>

              <div className="pat-hero-meta">
                {patient.mobile && (
                  <a className="pat-meta-item pat-meta-link" href={`tel:+${phoneDigits}`} title="Call patient">
                    <Phone size={13} />
                    <span>{patient.countryCode} {patient.mobile}</span>
                  </a>
                )}
                {patient.mobile && (
                  <a className="pat-meta-item pat-meta-link pat-meta-whatsapp" href={`https://wa.me/${whatsappDigits}`} target="_blank" rel="noopener noreferrer" title="Message on WhatsApp">
                    <MessageCircle size={13} />
                    <span>WhatsApp</span>
                  </a>
                )}
                {patient.email && (
                  <a className="pat-meta-item pat-meta-link" href={`mailto:${patient.email}`} title="Email patient">
                    <Mail size={13} />
                    <span>{patient.email}</span>
                  </a>
                )}
                {location_ && (
                  <span className="pat-meta-item">
                    <MapPin size={13} />
                    <span>{location_}</span>
                  </span>
                )}
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

            <button
              type="button"
              className="pat-btn pat-btn-secondary"
              onClick={() => setRxModalOpen(true)}
              title="Author and issue digital prescription for this patient"
            >
              <Pill size={14} />
              <span>Issue Prescription</span>
            </button>

            <Link
              className="pat-btn pat-btn-secondary"
              to={`/billing/invoices/new?patientId=${patient.id}`}
              title="Bill this patient"
            >
              <Receipt size={14} />
              <span>New Invoice</span>
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

        <div className="pat-stats" aria-label="Patient summary">
          <button type="button" className="pat-stat" onClick={() => setTab('timeline')}>
            <span>Visits completed</span>
            <strong>{completedVisits}</strong>
          </button>
          <button type="button" className="pat-stat" onClick={() => setTab('timeline')}>
            <span>Last visit</span>
            <strong>{lastAppointment ? prettyDate(lastAppointment.date) : '—'}</strong>
          </button>
          <Link className="pat-stat" to={nextAppointment ? `/appointments/${nextAppointment.id}` : `/appointments/new?patientId=${patient.id}`}>
            <span>Next visit</span>
            <strong>{nextAppointment ? `${prettyDate(nextAppointment.date)} · ${nextAppointment.time}` : 'Not booked'}</strong>
          </Link>
          <button type="button" className="pat-stat" onClick={() => setTab('overview')}>
            <span>Treatment pending</span>
            <strong>{pendingTreatments.length ? inr(billing.pendingPlanValue) : '—'}</strong>
          </button>
          <button type="button" className={`pat-stat${billing.due > 0 ? ' is-due' : ''}`} onClick={() => setTab('billing')}>
            <span>Balance due</span>
            <strong>{inr(billing.due)}</strong>
          </button>
        </div>
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
          <span>Activity</span>
          {activity.length > 0 && (
            <span className="pat-tab-badge">{activity.length}</span>
          )}
        </button>

        <button
          type="button"
          className={`pat-tab-btn ${activeTab === 'billing' ? 'is-active' : ''}`}
          onClick={() => setTab('billing')}
        >
          <Receipt size={15} />
          <span>Billing</span>
        </button>

        <button
          type="button"
          className={`pat-tab-btn ${activeTab === 'documents' ? 'is-active' : ''}`}
          onClick={() => setTab('documents')}
        >
          <FileText size={15} />
          <span>X-rays & Documents</span>
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

        <button
          type="button"
          className={`pat-tab-btn ${activeTab === 'prescriptions' ? 'is-active' : ''}`}
          onClick={() => setTab('prescriptions')}
        >
          <Pill size={15} />
          <span>Prescriptions</span>
          {patientPrescriptions.length > 0 && (
            <span className="pat-tab-badge">{patientPrescriptions.length}</span>
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
                      {prettyDate(nextAppointment.date)} at {nextAppointment.time}{nextAppointment.chair ? ` · ${nextAppointment.chair}` : ''}
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
                      <span className={`pat-badge${lastAppointment.status === 'completed' ? ' pat-badge-ok' : ''}`} style={{ textTransform: 'capitalize' }}>
                        {lastAppointment.status.replace('-', ' ')}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted, #475569)' }}>
                      {prettyDate(lastAppointment.date)} · {lastAppointment.doctor}
                    </div>
                    {patientNotes.length > 0 && (
                      <div style={{ fontSize: '12.5px', background: 'var(--surface, #fff)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--line, #e2e8f0)', marginTop: '4px' }}>
                        <strong>Findings: </strong>{patientNotes[0].findings}
                        {patientNotes[0].plan && <><br /><strong>Plan: </strong>{patientNotes[0].plan}</>}
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
                <span style={{ display: 'inline-flex', gap: '14px', alignItems: 'center' }}>
                  {pendingTreatments.length > 0 && (
                    <Link to={`/billing/invoices/new?patientId=${patient.id}`} className="pat-card-action" title="Plan items appear as one-click lines in the invoice">
                      Bill treatment →
                    </Link>
                  )}
                  <Link to="/clinical/treatment-plans" className="pat-card-action">
                    Treatment plans →
                  </Link>
                </span>
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

            {/* Billing summary — full detail lives on the Billing tab */}
            {patientInvoices.length > 0 && (
              <article className="pat-card">
                <div className="pat-card-head">
                  <h3><Receipt size={16} /> Billing</h3>
                  <button type="button" onClick={() => setTab('billing')} className="pat-card-action" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                    All invoices →
                  </button>
                </div>
                <div className="pat-money-row">
                  <div><span>Billed</span><strong>{inr(billing.billed)}</strong></div>
                  <div><span>Paid</span><strong className="pat-ok">{inr(billing.paid)}</strong></div>
                  <div><span>Balance</span><strong className={billing.due > 0 ? 'pat-bad' : ''}>{inr(billing.due)}</strong></div>
                  {oldestDueInvoice && (
                    <button type="button" className="pat-btn pat-btn-primary" onClick={() => setPayInvoiceId(oldestDueInvoice.id)}>
                      Collect {inr(invoiceBalance(oldestDueInvoice))}
                    </button>
                  )}
                </div>
              </article>
            )}

            {/* Compact Digital Prescriptions summary card */}
            <article className="pat-card">
              <div className="pat-card-head">
                <h3><Pill size={16} /> Digital Prescriptions</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setRxModalOpen(true)}
                    className="pat-btn pat-btn-secondary pat-btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Plus size={13} /> Issue Rx
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('prescriptions')}
                    className="pat-card-action"
                    style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    All prescriptions ({patientPrescriptions.length}) →
                  </button>
                </div>
              </div>
              {patientPrescriptions.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {patientPrescriptions.slice(0, 3).map((rx) => {
                    const isFinal = rx.status === 'FINALIZED'
                    const isCanc = rx.status === 'CANCELLED'
                    return (
                      <div
                        key={rx.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          background: 'var(--paper, #f8fafc)',
                          borderRadius: 'var(--rx-radius-sm, 8px)',
                          border: '1px solid var(--line, #e2e8f0)',
                          gap: '12px'
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px', flexWrap: 'wrap' }}>
                            <span className="rx-code-pill" style={{ fontSize: '11px', padding: '2px 6px' }}>{rx.prescriptionNumber}</span>
                            <span
                              className={`rx-badge ${isFinal ? 'rx-badge-finalized' : isCanc ? 'rx-badge-cancelled' : 'rx-badge-draft'}`}
                              style={{ fontSize: '10px', padding: '1px 6px' }}
                            >
                              <span className="rx-badge-dot" />{rx.status}
                            </span>
                            <span style={{ fontSize: '11.5px', color: 'var(--text-muted, #64748b)' }}>
                              {prettyDate((rx.prescribedAt || rx.createdAt || '').slice(0, 10))}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-strong, #0f172a)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {rx.diagnosis}
                          </p>
                          <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: 'var(--text-muted, #64748b)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {rx.items.map((i) => i.medicineName).join(', ') || 'No medications'}
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => setViewingRx(rx)}
                            className="rx-btn-icon"
                            title="View details"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPrintingRx(rx)}
                            className="rx-btn-icon"
                            title="Print / Save PDF"
                          >
                            <Printer size={15} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '13px' }}>
                  No digital prescriptions on record for this patient.
                </p>
              )}
            </article>
          </div>
        )}

        {/* TAB 2: MEDICAL HISTORY */}
        {activeTab === 'medical' && (
          <section
            className="pat-card pat-medical-card"
            aria-labelledby="medical-history-heading"
          >
            <header className="pat-medical-card__header">
              <div>
                <h3 id="medical-history-heading">
                  Patient Medical Screening & Dental Safety
                </h3>
                <p>
                  Screening data recorded during intake and verified by treating clinician.
                </p>
              </div>
              <button type="button" onClick={openEditModal} className="pat-btn pat-btn-secondary">
                <Edit3 size={13} aria-hidden="true" /> Edit Medical Details
              </button>
            </header>

            <div className="pat-medical-section">
              <h4 className="pat-medical-section__label">
                {t('patients.medical.safetyScreening', { defaultValue: 'Safety screening' })}
              </h4>
              <ul className="pat-medical-list">
                <MedicalRow
                  key={`${patient.id}-allergies`}
                  icon={TriangleAlert}
                  title="Allergies & Sensitivities"
                  description={patient.allergies === 'yes'
                    ? patient.allergiesDetails || 'Allergies present'
                    : 'Patient declared no known allergies to local anesthetics, antibiotics (penicillin), latex, or analgesics.'}
                  status={patient.allergies === 'yes' ? 'Allergy reported' : 'No Allergies'}
                  statusTone={patient.allergies === 'yes' ? 'amber' : 'green'}
                  hasAlert={patient.allergies === 'yes'}
                />
                <MedicalRow
                  key={`${patient.id}-medications`}
                  icon={Pill}
                  title="Current Medications (Patient-Reported)"
                  description={patient.medications === 'yes'
                    ? patient.medicationsDetails || 'Active medications reported.'
                    : 'Patient declared no routine systemic medications or blood thinners during intake screening.'}
                  status={patient.medications === 'yes' ? 'Medication reported' : 'None'}
                  statusTone={patient.medications === 'yes' ? 'amber' : 'gray'}
                  dividerAbove
                  hasAlert={patient.medications === 'yes'}
                />
                <MedicalRow
                  key={`${patient.id}-prescribed-medications`}
                  icon={Pill}
                  title="Previously Prescribed Medications"
                  description={
                    patientPrescriptions.length > 0
                      ? patientPrescriptions
                          .map((p) => `${p.prescriptionNumber} (${p.status}): ` + p.items.map((it) => `${it.medicineName} ${it.dosage}`).join(', '))
                          .slice(0, 4)
                          .join(' · ')
                      : 'No previously prescribed medications on record for this patient in DocMatrix.'
                  }
                  status={patientPrescriptions.length > 0 ? `${patientPrescriptions.length} Prescriptions on record` : 'None'}
                  statusTone="gray"
                  dividerAbove
                />
                <MedicalRow
                  key={`${patient.id}-conditions`}
                  icon={Activity}
                  title="Systemic Medical Conditions"
                  description={patient.conditions === 'yes'
                    ? patient.conditionsDetails || 'Medical conditions reported'
                    : 'No recorded chronic conditions (Hypertension, Diabetes, Cardiac disease, Asthma, Bleeding disorders).'}
                  status={patient.conditions === 'yes' ? 'Condition reported' : 'Clear'}
                  statusTone={patient.conditions === 'yes' ? 'amber' : 'green'}
                  dividerAbove
                  hasAlert={patient.conditions === 'yes'}
                />
              </ul>
            </div>

            <div className="pat-medical-section pat-medical-section--emergency">
              <h4 className="pat-medical-section__label">
                {t('patients.medical.emergencyContact', { defaultValue: 'Emergency contact' })}
              </h4>
              <ul className="pat-medical-list">
                <MedicalRow
                  key={`${patient.id}-emergency-contact`}
                  icon={Phone}
                  title={patient.emergencyName || 'Not specified'}
                  description={patient.relationship || 'Spouse / Next of Kin'}
                  phone={patient.emergencyPhone || '—'}
                />
              </ul>
            </div>
          </section>
        )}

        {/* TAB 3: ACTIVITY — every visit, note, bill, payment, document and consent in one feed */}
        {activeTab === 'timeline' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="pat-section-head">
              <div>
                <h3>Patient activity</h3>
                <p>Visits, clinical notes, invoices, payments, documents and consents, newest first.</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <Link to={`/clinical/notes?patientId=${patient.id}`} className="pat-btn pat-btn-secondary">
                  <FileText size={13} /> New Clinical Note
                </Link>
                <Link to={`/appointments/new?patientId=${patient.id}`} className="pat-btn pat-btn-primary">
                  <CalendarPlus size={13} /> Book Visit
                </Link>
              </div>
            </div>

            <div className="pat-filter-chips" role="group" aria-label="Filter activity">
              {ACTIVITY_FILTERS.map((f) => {
                const count = f.id === 'all' ? activity.length : activity.filter((a) => a.kind === f.id).length
                return (
                  <button
                    key={f.id}
                    type="button"
                    className={`pat-chip${activityFilter === f.id ? ' is-active' : ''}`}
                    onClick={() => setActivityFilter(f.id)}
                    aria-pressed={activityFilter === f.id}
                  >
                    {f.label} <span className="pat-chip-count">{count}</span>
                  </button>
                )
              })}
            </div>

            {visibleActivity.length > 0 ? (
              <ol className="pat-activity">
                {visibleActivity.map((item) => {
                  const Icon = ACTIVITY_ICONS[item.kind]
                  return (
                    <li key={item.id} className={`pat-activity-item pat-activity-${item.kind}`}>
                      <span className={`pat-activity-icon${item.tone ? ` is-${item.tone}` : ''}`}><Icon size={14} /></span>
                      <div className="pat-activity-body">
                        <div className="pat-activity-top">
                          <strong>{item.title}</strong>
                          <time dateTime={item.date}>{prettyDate(item.date.slice(0, 10))}</time>
                        </div>
                        {item.detail && <p>{item.detail}</p>}
                        {item.link && <Link to={item.link} className="pat-card-action">Open →</Link>}
                        {item.kind === 'billing' && item.id.startsWith('inv-') && (
                          <button type="button" className="pat-card-action pat-linklike" onClick={() => setOpenInvoiceId(item.id.slice(4))}>
                            View invoice →
                          </button>
                        )}
                        {item.kind === 'prescription' && (
                          <button
                            type="button"
                            className="pat-card-action pat-linklike"
                            onClick={() => {
                              const rxId = item.id.replace(/^rx-(create|final|canc)-/, '')
                              const rx = patientPrescriptions.find((p) => p.id === rxId)
                              if (rx) setViewingRx(rx)
                            }}
                          >
                            View prescription →
                          </button>
                        )}
                      </div>
                    </li>
                  )
                })}
              </ol>
            ) : (
              <div className="pat-empty">
                <Clock size={28} />
                <h4>{activity.length ? 'Nothing in this category yet' : 'No activity recorded yet'}</h4>
                <p>Appointments, notes, bills and documents for this patient will appear here as they happen.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB: BILLING */}
        {activeTab === 'billing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="pat-section-head">
              <div>
                <h3>Billing</h3>
                <p>Invoices, part payments and what this patient still owes.</p>
              </div>
              <Link to={`/billing/invoices/new?patientId=${patient.id}`} className="pat-btn pat-btn-primary">
                <Plus size={13} /> New Invoice
              </Link>
            </div>

            <div className="pat-money-cards">
              <div className="pat-card"><span>Total billed</span><strong>{inr(billing.billed)}</strong></div>
              <div className="pat-card"><span>Paid</span><strong className="pat-ok">{inr(billing.paid)}</strong></div>
              <div className="pat-card"><span>Balance due</span><strong className={billing.due > 0 ? 'pat-bad' : ''}>{inr(billing.due)}</strong></div>
              <div className="pat-card"><span>Planned, not billed</span><strong>{inr(billing.pendingPlanValue)}</strong></div>
            </div>

            {patientInvoices.length > 0 ? (
              <div className="pat-table-container">
                <table className="pat-table pat-bill-table">
                  <thead>
                    <tr><th>Invoice</th><th>Services</th><th style={{ textAlign: 'right' }}>Total</th><th style={{ textAlign: 'right' }}>Balance</th><th>Status</th><th /></tr>
                  </thead>
                  <tbody>
                    {patientInvoices.map((inv) => {
                      const due = invoiceBalance(inv)
                      return (
                        <tr key={inv.id}>
                          <td>
                            <button type="button" className="pat-linklike" onClick={() => setOpenInvoiceId(inv.id)}>{inv.id}</button>
                            <div className="pat-muted-sm">{prettyDate(inv.createdAt)}</div>
                          </td>
                          <td className="pat-ellipsis">{inv.description}</td>
                          <td style={{ textAlign: 'right' }}>{inr(inv.amount)}</td>
                          <td style={{ textAlign: 'right' }} className={due > 0 ? 'pat-bad' : ''}>{inr(due)}</td>
                          <td><StatusPill status={inv.status} /></td>
                          <td style={{ textAlign: 'right' }}>
                            {due > 0 ? (
                              <button type="button" className="pat-btn pat-btn-primary pat-btn-sm" onClick={() => setPayInvoiceId(inv.id)}>Collect</button>
                            ) : (
                              <button type="button" className="pat-btn pat-btn-secondary pat-btn-sm" onClick={() => setOpenInvoiceId(inv.id)}>View</button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="pat-empty">
                <Receipt size={28} />
                <h4>No invoices yet</h4>
                <p>Bills for this patient's treatments will show here, with payments and balance.</p>
                <Link to={`/billing/invoices/new?patientId=${patient.id}`} className="pat-btn pat-btn-secondary"><Plus size={13} /> Create first invoice</Link>
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

            {docNotice && (
              <p className="pat-notice" role="status">
                {docNotice}
                <button type="button" onClick={() => setDocNotice('')} aria-label="Dismiss"><X size={13} /></button>
              </p>
            )}

            {patientDocs.length > 0 ? (
              <div className="pat-docs-grid">
                {patientDocs.map((doc) => (
                  <div key={doc.id} className="pat-doc-card">
                    <div className="pat-doc-info">
                      {doc.url && doc.url.startsWith('data:image') ? (
                        <img className="pat-doc-thumb" src={doc.url} alt="" />
                      ) : (
                        <span className="pat-doc-icon">
                          <FileText size={20} />
                        </span>
                      )}
                      <div className="pat-doc-text">
                        <h4>{doc.title}</h4>
                        <p>{doc.category} · {doc.uploadDate}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>
                          {doc.fileName} ({doc.fileSize})
                        </p>
                      </div>
                    </div>

                    <div className="pat-doc-actions">
                      {doc.url ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setPreviewDoc(doc)}
                            className="pat-action-btn"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                          >
                            <Eye size={12} /> View
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadDoc(doc)}
                            className="pat-action-btn"
                            style={{ padding: '4px 10px', fontSize: '12px' }}
                          >
                            <FileDown size={12} /> Download
                          </button>
                        </>
                      ) : (
                        <span className="pat-muted-sm" title="This record was logged without an attached file">No file attached</span>
                      )}
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

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ fontSize: '12px', color: '#059669', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <CheckCircle2 size={14} /> ABDM & Digital Consent Compliant
                </div>
                <button
                  type="button"
                  onClick={() => setConsentModalOpen(true)}
                  className="pat-btn pat-btn-primary"
                  style={{ padding: '6px 14px', fontSize: '12.5px' }}
                >
                  <FileText size={13} /> Add Consent Record
                </button>
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
                <button
                  type="button"
                  onClick={() => setConsentModalOpen(true)}
                  className="pat-btn pat-btn-secondary"
                  style={{ padding: '6px 14px', fontSize: '12.5px', marginTop: '12px' }}
                >
                  <FileText size={13} /> Add First Consent
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: PRESCRIPTIONS */}
        {activeTab === 'prescriptions' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="pat-section-head">
              <div>
                <h3>Clinical Prescriptions History</h3>
                <p>Digital drug regimens, dosage instructions, and official letterhead prescriptions authored for this patient.</p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setRxModalOpen(true)}
                  className="pat-btn pat-btn-primary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={14} /> Issue Prescription
                </button>
              </div>
            </div>

            {patientPrescriptions.length > 0 ? (
              <div className="rx-table-container">
                <div className="rx-table-scroll">
                  <table className="rx-table">
                    <thead>
                      <tr>
                        <th>Rx Number</th>
                        <th>Prescribed Date</th>
                        <th>Prescriber Clinician</th>
                        <th>Diagnosis & Medication Summary</th>
                        <th>Status</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patientPrescriptions.map((rx) => {
                        const isFinal = rx.status === 'FINALIZED'
                        const isDraft = rx.status === 'DRAFT'
                        const isCanc = rx.status === 'CANCELLED'

                        return (
                          <tr key={rx.id}>
                            <td>
                              <span className="rx-code-pill">{rx.prescriptionNumber}</span>
                            </td>
                            <td>
                              {new Date(rx.prescribedAt).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </td>
                            <td>
                              <div className="rx-doctor-name">{rx.doctor?.fullName || 'Dr. Arun Kumar'}</div>
                              <div className="rx-doctor-role">Dental Surgeon</div>
                            </td>
                            <td className="rx-diagnosis-cell">
                              <div className="rx-diagnosis-title">{rx.diagnosis}</div>
                              <div className="rx-meds-summary">
                                {rx.items.map((it) => it.medicineName).join(', ') || 'No medications'}
                              </div>
                            </td>
                            <td>
                              <span
                                className={`rx-badge ${
                                  isFinal
                                    ? 'rx-badge-finalized'
                                    : isCanc
                                    ? 'rx-badge-cancelled'
                                    : 'rx-badge-draft'
                                }`}
                              >
                                <span className="rx-badge-dot" />
                                {rx.status}
                              </span>
                            </td>
                            <td className="rx-actions-cell">
                              <div className="rx-actions-wrapper">
                                <button
                                  type="button"
                                  onClick={() => setViewingRx(rx)}
                                  className="rx-btn-icon"
                                  title="View details"
                                >
                                  <Eye size={15} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPrintingRx(rx)}
                                  className="rx-btn-icon"
                                  title="Print / Save PDF"
                                >
                                  <Printer size={15} />
                                </button>
                                {isDraft && (
                                  <button
                                    type="button"
                                    onClick={() => setEditingRx(rx)}
                                    className="rx-btn-icon"
                                    title="Edit draft"
                                  >
                                    <Edit3 size={15} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rx-empty" style={{ background: 'var(--surface, #ffffff)', border: '1px solid var(--line, #e2e8f0)', borderRadius: 'var(--rx-radius-lg, 16px)' }}>
                <div className="rx-empty-icon">
                  <Pill />
                </div>
                <h3>No Prescriptions on Record</h3>
                <p>No digital prescriptions or medication regimens have been authored for this patient yet.</p>
                <button
                  type="button"
                  onClick={() => setRxModalOpen(true)}
                  className="rx-btn rx-btn-primary rx-btn-sm"
                >
                  <Plus size={13} /> Issue First Prescription
                </button>
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

                <div className="pat-form-row">
                  <div className="pat-form-group">
                    <label>Date of Birth</label>
                    <input
                      className="pat-form-input"
                      type="date"
                      max={today}
                      value={editForm.dateOfBirth || ''}
                      onChange={(e) => {
                        const dob = e.target.value
                        const years = dob ? Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400000)) : NaN
                        setEditForm({ ...editForm, dateOfBirth: dob, age: Number.isFinite(years) && years >= 0 ? String(years) : editForm.age })
                      }}
                    />
                  </div>
                  <div className="pat-form-group">
                    <label>Gender</label>
                    <select
                      className="pat-form-select"
                      value={editForm.gender || ''}
                      onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                    >
                      <option value="">Not specified</option>
                      <option value="female">Female</option>
                      <option value="male">Male</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="pat-form-group">
                  <label>Preferred Language</label>
                  <input
                    className="pat-form-input"
                    placeholder="e.g. Malayalam, English"
                    value={editForm.language || ''}
                    onChange={(e) => setEditForm({ ...editForm, language: e.target.value })}
                  />
                </div>

                <div className="pat-form-group">
                  <label>Residential Address</label>
                  <input
                    className="pat-form-input"
                    value={editForm.address || ''}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  />
                </div>

                <div className="pat-form-row pat-form-row-3">
                  <div className="pat-form-group">
                    <label>City</label>
                    <input className="pat-form-input" value={editForm.city || ''} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} />
                  </div>
                  <div className="pat-form-group">
                    <label>State</label>
                    <input className="pat-form-input" value={editForm.state || ''} onChange={(e) => setEditForm({ ...editForm, state: e.target.value })} />
                  </div>
                  <div className="pat-form-group">
                    <label>PIN Code</label>
                    <input className="pat-form-input" inputMode="numeric" value={editForm.postalCode || ''} onChange={(e) => setEditForm({ ...editForm, postalCode: e.target.value })} />
                  </div>
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
                  <label>Relationship to Patient</label>
                  <input
                    className="pat-form-input"
                    placeholder="e.g. Spouse, Parent"
                    value={editForm.relationship || ''}
                    onChange={(e) => setEditForm({ ...editForm, relationship: e.target.value })}
                  />
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
        <div className="pat-modal-overlay" onClick={closeUpload}>
          <div className="pat-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="pat-modal-header">
              <h3>Upload Document</h3>
              <button
                type="button"
                onClick={closeUpload}
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

                <label
                  className={`pat-dropzone${docFile ? ' has-file' : ''}`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); pickDocFile(e.dataTransfer.files?.[0] || null) }}
                >
                  <input
                    type="file"
                    accept="image/*,application/pdf,.dcm,application/dicom"
                    onChange={(e) => pickDocFile(e.target.files?.[0] || null)}
                  />
                  <Upload size={22} />
                  {docFile ? (
                    <>
                      <strong>{docFile.name}</strong>
                      <span>{formatBytes(docFile.size)} · click to choose a different file</span>
                    </>
                  ) : (
                    <>
                      <strong>Choose a file or drop it here</strong>
                      <span>X-ray, photo, PDF or DICOM</span>
                    </>
                  )}
                </label>
              </div>

              <div className="pat-modal-footer">
                <button
                  type="button"
                  className="pat-btn pat-btn-secondary"
                  onClick={closeUpload}
                >
                  Cancel
                </button>
                <button type="submit" className="pat-btn pat-btn-primary" disabled={!docFile || !docTitle.trim() || docSaving}>
                  {docSaving ? 'Saving…' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD CONSENT RECORD MODAL ── */}
      {consentModalOpen && (
        <div className="pat-modal-overlay" onClick={() => setConsentModalOpen(false)}>
          <div className="pat-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="pat-modal-header">
              <h3>Record Informed Consent</h3>
              <button
                type="button"
                onClick={() => setConsentModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted, #64748b)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddConsent}>
              <div className="pat-modal-body">
                <div className="pat-form-group">
                  <label>Procedure / Consent Title</label>
                  <input
                    className="pat-form-input"
                    placeholder="e.g. Informed Consent for Surgical Extraction"
                    value={consentType}
                    onChange={(e) => setConsentType(e.target.value)}
                    required
                  />
                </div>

                <div className="pat-form-group">
                  <label>Status</label>
                  <select
                    className="pat-form-select"
                    value={consentStatus}
                    onChange={(e) => setConsentStatus(e.target.value as PatientConsentRecord['status'])}
                  >
                    <option value="Signed">Signed</option>
                    <option value="Pending">Pending</option>
                    <option value="Declined">Declined</option>
                  </select>
                </div>

                <div className="pat-form-group">
                  <label>Clinical Notes & Risk Discussion</label>
                  <textarea
                    className="pat-form-textarea"
                    rows={3}
                    placeholder="Procedure risks, benefits, and alternative options discussed with patient..."
                    value={consentNotes}
                    onChange={(e) => setConsentNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="pat-modal-footer">
                <button
                  type="button"
                  className="pat-btn pat-btn-secondary"
                  onClick={() => setConsentModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="pat-btn pat-btn-primary">
                  Save Consent Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PRESCRIPTION MODALS ── */}
      {rxModalOpen && (
        <PrescriptionModal
          defaultPatientId={patient?.backendId || patient?.id}
          onClose={() => setRxModalOpen(false)}
          onSaved={(saved) => {
            setRxModalOpen(false);
            setViewingRx(saved);
          }}
        />
      )}

      {editingRx && (
        <PrescriptionModal
          initialPrescription={editingRx}
          defaultPatientId={patient?.backendId || patient?.id}
          onClose={() => setEditingRx(null)}
          onSaved={(saved) => {
            setEditingRx(null);
            setViewingRx(saved);
          }}
        />
      )}

      {viewingRx && (
        <PrescriptionDetailsModal
          prescription={viewingRx}
          onClose={() => setViewingRx(null)}
          onPrint={(rx) => {
            setViewingRx(null);
            setPrintingRx(rx);
          }}
          onEditDraft={(rx) => {
            setViewingRx(null);
            setEditingRx(rx);
          }}
          onUpdated={() => {
            setViewingRx(null);
          }}
        />
      )}

      {printingRx && (
        <PrescriptionPrintModal
          prescription={printingRx}
          onClose={() => setPrintingRx(null)}
        />
      )}

      {/* ── DOCUMENT PREVIEW ── */}
      {previewDoc && previewDoc.url && (
        <div className="pat-modal-overlay" onClick={() => setPreviewDoc(null)}>
          <div className="pat-modal-content pat-preview" role="dialog" aria-modal="true" aria-label={previewDoc.title} onClick={(e) => e.stopPropagation()}>
            <div className="pat-modal-header">
              <h3>{previewDoc.title}</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button type="button" className="pat-btn pat-btn-secondary pat-btn-sm" onClick={() => downloadDoc(previewDoc)}>
                  <FileDown size={13} /> Download
                </button>
                <button type="button" className="pat-btn pat-btn-secondary pat-btn-sm" onClick={() => setPreviewDoc(null)} aria-label="Close">
                  <X size={14} />
                </button>
              </div>
            </div>
            <div className="pat-preview-body">
              {/^data:image|\.(png|jpe?g|gif|webp|bmp)$/i.test(previewDoc.url) || /\.(png|jpe?g|gif|webp|bmp)$/i.test(previewDoc.fileName) ? (
                <img src={previewDoc.url} alt={previewDoc.title} />
              ) : /^data:application\/pdf|\.pdf$/i.test(previewDoc.url) || /\.pdf$/i.test(previewDoc.fileName) ? (
                <iframe src={previewDoc.url} title={previewDoc.title} />
              ) : (
                <div className="pat-empty">
                  <FileText size={28} />
                  <h4>No preview for this file type</h4>
                  <p>{previewDoc.fileName} · use Download to open it in your imaging software.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {openInvoice && <InvoiceDrawer invoice={openInvoice} patient={patient} onClose={() => setOpenInvoiceId(null)} />}
      {payInvoice && (
        <PaymentDialog
          invoice={payInvoice}
          patientName={`${patient.firstName} ${patient.lastName}`}
          onClose={() => setPayInvoiceId(null)}
        />
      )}
    </section>
  )
}

export default PatientProfilePage
