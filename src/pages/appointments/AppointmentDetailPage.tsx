import { PatientDocumentsPanel } from '@/components/documents/PatientDocumentsPanel'
import { validateWhatsAppPhone } from '@/services/whatsappService'
import { canRescheduleAppointment, canTransitionAppointment, getAppointmentTimeSlots, getClinicNow, useClinicToday } from '@/services/appointmentPolicy'
import { canClinic, getPermissionUser, type ClinicOperation } from '@/services/permissions'
import React, { useEffect, useMemo, useState } from 'react'
import './calendar.css'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  FileText,
  UserRound,
  RotateCcw,
  X,
  Send,
  AlertTriangle,
  CreditCard,
  Stethoscope,
  Activity,
  History,
  Sparkles,
  ChevronDown
} from 'lucide-react'
import { TreatmentMaterialUsageModal } from '@/components/inventory/TreatmentMaterialUsageModal'
import { ConsentDocumentModal } from '@/components/clinical/ConsentDocumentModal'
import {
  getConsentStatusMeta,
  isConsentPending,
  matchFrontendConsentTemplate,
} from '@/services/consentService'
import { type PatientConsentRecord } from '@/services/clinicStore'
import {
  useClinicData,
  dismissSyncError,
  findAppointment,
  fetchAppointmentById,
  isAuthenticatedClinic,
  updateAppointmentStatus,
  rescheduleAppointment,
  cancelAppointmentPersisted as cancelAppointment,
  generateWhatsAppMessage,
  sendAppointmentReminder,
  checkDentistAvailability,
  formatShortBookingRef,
  type AppointmentStatus,
  type PatientRecord,
  type InvoiceRecord
} from '@/services/clinicStore'
import { autoGenerateInvoiceForConsultation } from '@/services/billingAutoInvoice'
import { InvoiceDrawer } from '@/pages/billing/BillingShared'
import { InlineAlertBanner } from '@/components/shared/InlineAlertBanner'
import {
  InvoiceSuccessToast,
  type InvoiceSuccessToastData,
} from '@/components/shared/InvoiceSuccessToast'



const STATUS_OPTIONS: { value: AppointmentStatus; label: string; permission?: string }[] = [
  { value: 'scheduled', label: 'Scheduled', permission: 'appointment.schedule' },
  { value: 'confirmed', label: 'Confirmed', permission: 'appointment.schedule' },
  { value: 'checked-in', label: 'Checked-in' },
  { value: 'in-progress', label: 'In Consultation', permission: 'appointment.consult' },
  { value: 'completed', label: 'Completed', permission: 'appointment.consult' },
  { value: 'cancelled', label: 'Cancelled', permission: 'appointment.schedule' },
  { value: 'no-show', label: 'No-Show', permission: 'appointment.schedule' },
]

export const AppointmentDetailPage: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const { patients, appointments, patientConsents = [] } = useClinicData()
  const clinicToday = useClinicToday()

  const appointment = useMemo(() => findAppointment(appointments, id), [appointments, id])
  const [isFetching, setIsFetching] = useState<boolean>(() => !appointment && Boolean(id) && isAuthenticatedClinic())

  useEffect(() => {
    let active = true
    if (appointment) {
      setIsFetching(false)
      return
    }
    if (!id || !isAuthenticatedClinic()) {
      setIsFetching(false)
      return
    }
    setIsFetching(true)
    fetchAppointmentById(id)
      .catch(() => null)
      .finally(() => {
        if (active) setIsFetching(false)
      })
    return () => {
      active = false
    }
  }, [id, appointment])

  const patient = useMemo<PatientRecord | undefined>(() => {
    if (!appointment) return undefined
    const pid = appointment.patientId || ''
    const pidLower = pid.toLowerCase()
    const found = patients.find(
      (entry) =>
        entry.id === pid ||
        entry.backendId === pid ||
        entry.id?.toLowerCase() === pidLower ||
        entry.backendId?.toLowerCase() === pidLower
    )
    if (found) return found
    const [firstName, ...rest] = (appointment.patientName || 'Clinic Patient').split(' ')
    return {
      id: pid || 'PAT-0000',
      firstName: firstName || 'Clinic',
      lastName: rest.join(' ') || 'Patient',
      age: '30',
      dateOfBirth: '',
      gender: 'other',
      mobile: '',
      countryCode: '+91',
      email: '',
      language: 'English',
      city: '',
      state: '',
      postalCode: '',
      address: '',
      emergencyName: '',
      emergencyPhone: '',
      relationship: '',
      allergies: 'no',
      allergiesDetails: '',
      medications: 'no',
      medicationsDetails: '',
      conditions: 'no',
      conditionsDetails: '',
      createdAt: appointment.createdAt || new Date().toISOString()
    }
  }, [appointment, patients])

  // Modals state
  const [showReschedule, setShowReschedule] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)
  const [actionError, setActionError] = useState('')
  const [showCancel, setShowCancel] = useState(false)
  const [showWhatsApp, setShowWhatsApp] = useState(false)
  const [showMaterialModal, setShowMaterialModal] = useState(false)
  const [activeConsentModal, setActiveConsentModal] = useState<PatientConsentRecord | null>(null)

  const appointmentConsent = useMemo(() => {
    if (!appointment) return undefined
    const targetApptIds = new Set(
      [appointment.id, appointment.backendId]
        .filter((v): v is string => Boolean(v))
        .map((v) => v.toLowerCase()),
    )
    const targetPatientIds = new Set(
      [appointment.patientId, patient?.id, patient?.backendId]
        .filter((v): v is string => Boolean(v))
        .map((v) => v.toLowerCase()),
    )
    const procKey = (appointment.treatmentType || appointment.visitType || '').trim().toLowerCase()
    return (patientConsents as PatientConsentRecord[]).find(
      (c) =>
        (c.appointmentId && targetApptIds.has(c.appointmentId.toLowerCase())) ||
        (((c.patientId && targetPatientIds.has(c.patientId.toLowerCase())) ||
          (c.patientUuid && targetPatientIds.has(c.patientUuid.toLowerCase()))) &&
          procKey &&
          (c.procedureName || c.consentType || '').trim().toLowerCase() === procKey),
    )
  }, [appointment, patientConsents, patient?.id, patient?.backendId])

  const requiresConsent = useMemo(
    () => Boolean(appointment && matchFrontendConsentTemplate(appointment.treatmentType || appointment.visitType)),
    [appointment],
  )

  const [rescheduleDate, setRescheduleDate] = useState(appointment?.date || '')
  const [rescheduleTime, setRescheduleTime] = useState(appointment?.time || '10:00')
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [rescheduleError, setRescheduleError] = useState('')
  const [rescheduleSaving, setRescheduleSaving] = useState(false)
  const TIME_SLOTS = getAppointmentTimeSlots(rescheduleDate, appointment?.priority)

  const [cancelReason, setCancelReason] = useState('')
  const [whatsAppType, setWhatsAppType] = useState<'confirmation' | 'reminder_24h' | 'reminder_2h' | 'recall'>('confirmation')
  const [activeInvoice, setActiveInvoice] = useState<InvoiceRecord | null>(null)
  const [invoiceToast, setInvoiceToast] = useState<InvoiceSuccessToastData | null>(null)

  useEffect(() => {
    if (appointment) {
      setRescheduleDate(appointment.date)
      setRescheduleTime(appointment.time)
    }
  }, [appointment?.id, appointment?.date, appointment?.time])

  const handleStatusChange = async (newStatus: AppointmentStatus) => {
    if (!appointment || statusSaving) return
    if (newStatus === 'cancelled') { setCancelReason(''); setShowCancel(true); return }
    setStatusSaving(true); setActionError('')
    try {
    await updateAppointmentStatus(appointment.id, newStatus)
    if (newStatus === 'completed') {
      setShowMaterialModal(true)
      const res = autoGenerateInvoiceForConsultation({
        appointment,
        patientId: appointment.patientId,
      })
      if (res.invoice) {
        const invoice = await res.invoice
        setInvoiceToast({
          invoiceNumber: invoice.id,
          amount: invoice.amount,
        })
      }
    }
    } catch (error: any) { setActionError(error.message || 'Status change was not saved.') }
    finally { setStatusSaving(false) }
  }

  // Check availability of each time slot for rescheduling
  const getRescheduleSlotAvailability = (slot: string) => {
    if (!appointment || !rescheduleDate) return { available: true }
    return checkDentistAvailability(
      appointment.doctor,
      rescheduleDate,
      slot,
      appointment.durationMinutes || 30,
      appointment.id, appointment.chair, appointment.priority
    )
  }

  // Auto-adjust rescheduleTime if currently selected slot is unavailable on the chosen date
  useEffect(() => {
    if (!showReschedule || !appointment || !rescheduleDate) return
    const currentStatus = checkDentistAvailability(
      appointment.doctor,
      rescheduleDate,
      rescheduleTime,
      appointment.durationMinutes || 30,
      appointment.id, appointment.chair, appointment.priority
    )
    if (!currentStatus.available) {
      const firstAvail = TIME_SLOTS.find((s) => {
        const res = checkDentistAvailability(
          appointment.doctor,
          rescheduleDate,
          s,
          appointment.durationMinutes || 30,
          appointment.id, appointment.chair, appointment.priority
        )
        return res.available
      })
      if (firstAvail) {
        setRescheduleTime(firstAvail)
        setRescheduleError('')
      } else {
        setRescheduleError(currentStatus.reason || `${appointment.doctor} has no available slots on ${rescheduleDate}.`)
      }
    } else {
      setRescheduleError('')
    }
  }, [showReschedule, appointment, rescheduleDate, appointments])

  if (isFetching && !appointment) {
    return (
      <section className="appointment-simple-panel appointment-detail-panel" data-testid="feature-page-appt.detail-loading">
        <h2>Loading appointment details…</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '8px 0 16px' }}>
          Retrieving booking record {id}…
        </p>
      </section>
    )
  }

  if (!appointment || !patient) {
    return (
      <section className="appointment-simple-panel appointment-detail-panel" data-testid={`record-not-found-${id || 'appointment'}`}>
        <h2>Appointment not found</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '8px 0 16px' }}>
          This session has no booking with reference {id}.
        </p>
        <button type="button" className="appointment-detail-back" onClick={() => navigate('/appointments/details')}>
          <ArrowLeft size={14} /> Back to Appointments
        </button>
      </section>
    )
  }

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rescheduleSaving) return
    if (!appointment) return
    setRescheduleError('')

    const slotCheck = checkDentistAvailability(
      appointment.doctor,
      rescheduleDate,
      rescheduleTime,
      appointment.durationMinutes || 30,
      appointment.id, appointment.chair, appointment.priority
    )
    if (!slotCheck.available) {
      setRescheduleError(slotCheck.reason || 'Selected time slot is unavailable. Please select an available slot.')
      return
    }

    setRescheduleSaving(true)
    const result = rescheduleAppointment(
      appointment.id,
      rescheduleDate,
      rescheduleTime,
      rescheduleReason || 'Patient requested reschedule.'
    )

    try { await result._syncPromise } catch (error: any) { setRescheduleError(error.message || 'Reschedule was not saved.'); return } finally { setRescheduleSaving(false) }

    if (!result.success) {
      setRescheduleError(result.error || 'Conflict detected. Please choose another slot.')
      return
    }

    setShowReschedule(false)
  }

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try { await cancelAppointment(appointment.id, cancelReason) } catch (error: any) { window.alert(error.message || 'Cancellation was not saved.'); return }
    setShowCancel(false)
  }

  const handleSendWhatsApp = () => {
    const message = generateWhatsAppMessage(whatsAppType, appointment, patient)


    const phone = validateWhatsAppPhone(patient.mobile, patient.countryCode)
    if (!phone.valid) { setActionError(phone.error || 'Invalid phone number.'); return }
    const opened = window.open(`https://wa.me/${phone.digits}?text=${encodeURIComponent(message)}`, '_blank')
    if (!opened) { setActionError('WhatsApp window was blocked. Allow popups and try again.'); return }
    opened.opener = null
    setShowWhatsApp(false)
  }

  const shortRef = formatShortBookingRef(appointment.bookingRef || appointment.id)

  return (
    <section className="appointment-simple-panel appointment-detail-panel" data-testid="feature-page-appt.detail">
      {/* Top Back Navigation */}
      <div className="appointment-detail-topbar">
        <button type="button" className="appointment-detail-back" onClick={() => navigate('/appointments/details')}>
          <ArrowLeft size={14} /> Back to Appointments
        </button>
      </div>

      {/* Header Banner */}
      <div className="appointment-detail-heading">
        <div className="appointment-detail-title-group">
          <div className="appointment-simple-heading-icon">
            <CalendarDays size={20} />
          </div>
          <div>
            <h2 title={appointment.id}>Booking <span className="appointment-ref-code">#{shortRef}</span></h2>
            <p>Booked on {new Date(appointment.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </div>
        </div>
        <div className="status-dropdown-wrap">
          <label htmlFor="appt-detail-status">Status</label>
          <div className={`status-select-pill status-${appointment.status}`}>
            <span className="status-select-text">
              {STATUS_OPTIONS.find((s) => s.value === appointment.status)?.label || appointment.status}
            </span>
            <ChevronDown size={14} className="status-select-chevron" />
            <select
              id="appt-detail-status"
              className="status-select-native"
              value={appointment.status}
              disabled={statusSaving || !canClinic(getPermissionUser(), 'appointment.check_in')}
              onChange={(e) => handleStatusChange(e.target.value as AppointmentStatus)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  disabled={!canTransitionAppointment(appointment.status, opt.value) || Boolean(opt.permission && !canClinic(getPermissionUser(), opt.permission as ClinicOperation))}
                >
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {requiresConsent && (appointmentConsent ? isConsentPending(appointmentConsent.status) : true) && (appointment.status === 'checked-in' || appointment.status === 'in-progress') && (
        <div
          role="alert"
          style={{
            margin: '10px 0',
            padding: '10px 14px',
            borderRadius: '8px',
            background: '#fef3c7',
            border: '1px solid #fcd34d',
            color: '#92400e',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
            fontSize: '13px',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={16} />
            <strong>Consent Required Before Treatment:</strong> Patient has not yet signed the informed consent for{' '}
            {appointment.treatmentType || appointment.visitType}.
          </span>
          {appointmentConsent ? (
            <button
              type="button"
              onClick={() => setActiveConsentModal(appointmentConsent)}
              className="btn-appt-action"
              style={{ background: '#92400e', color: '#fff', border: 'none' }}
            >
              Open &amp; Sign Consent
            </button>
          ) : (
            <Link to={`/patients/${patient.id}?tab=consents`} className="btn-appt-action">
              Open Patient Consents
            </Link>
          )}
        </div>
      )}

      {/* Main Details Grid */}
      <div className="appointment-detail-grid">
        <div>
          <span><UserRound size={13} /> Patient</span>
          <strong><Link to={`/patients/${patient.id}`}>{patient.firstName} {patient.lastName} ({patient.id})</Link></strong>
        </div>
        <div>
          <span><CalendarDays size={13} /> Date</span>
          <strong>{appointment.date}</strong>
        </div>
        <div>
          <span><Clock size={13} /> Time &amp; Duration</span>
          <strong>{appointment.time} ({appointment.durationMinutes || 30} mins)</strong>
        </div>
        <div>
          <span>Doctor &amp; Chair</span>
          <strong>{appointment.doctor} &bull; {appointment.chair || 'Chair 1'}</strong>
        </div>
        <div>
          <span>Treatment / Visit Type</span>
          <strong>{appointment.treatmentType || appointment.visitType}</strong>
        </div>
        <div>
          <span>Priority</span>
          <strong className="text-capitalize">{appointment.priority || 'Normal'}</strong>
        </div>
        {(appointmentConsent || requiresConsent) && (
          <div>
            <span>Informed Consent</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
              {appointmentConsent ? (
                <>
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '999px',
                      background: getConsentStatusMeta(appointmentConsent.status).bg,
                      color: getConsentStatusMeta(appointmentConsent.status).color,
                      border: `1px solid ${getConsentStatusMeta(appointmentConsent.status).border}`,
                    }}
                  >
                    {getConsentStatusMeta(appointmentConsent.status).label}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveConsentModal(appointmentConsent)}
                    style={{ background: 'none', border: 'none', color: '#0b8185', fontWeight: 600, cursor: 'pointer', fontSize: '12.5px', padding: 0 }}
                  >
                    Open Consent Form
                  </button>
                </>
              ) : (
                <Link to={`/patients/${patient.id}?tab=consents`} style={{ color: '#0b8185', fontWeight: 600, fontSize: '12.5px' }}>
                  View Consent Records
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      <InlineAlertBanner
        message={actionError}
        onDismiss={() => {
          setActionError('')
          dismissSyncError()
        }}
      />
      {/* Action Buttons: Materials, Reschedule, WhatsApp, Cancel */}
      <div className="appointment-action-controls">
        {appointment.status === 'completed' && canClinic(getPermissionUser(), 'appointment.schedule') && <Link className="btn-appt-action" to={`/appointments/new?patientId=${encodeURIComponent(appointment.patientId)}&revisitOfId=${encodeURIComponent(appointment.backendId || appointment.id)}`}>Book Revisit</Link>}
        {appointment.revisitOfId && <Link to={`/appointments/${appointment.revisitOfId}`}>Previous visit</Link>}
        <button
          type="button"
          className="btn-appt-action btn-appt-materials"
          onClick={() => setShowMaterialModal(true)}
          title="Review and confirm materials used during this procedure"
        >
          <Sparkles size={15} />
          <span>Record Material Usage</span>
        </button>
        <button type="button" className="btn-appt-action btn-reschedule" disabled={rescheduleSaving || !canRescheduleAppointment(appointment.status) || !canClinic(getPermissionUser(), 'appointment.schedule')} onClick={() => setShowReschedule(true)}>
          <RotateCcw size={15} />
          <span>Reschedule Booking</span>
        </button>
        <button type="button" className="btn-appt-action btn-whatsapp" onClick={() => setShowWhatsApp(true)}>
          <Send size={15} />
          <span>WhatsApp Reminder</span>
        </button>
        {canTransitionAppointment(appointment.status, 'cancelled') && appointment.status !== 'cancelled' && (
          <button type="button" className="btn-appt-action btn-cancel-appt" disabled={!canClinic(getPermissionUser(), 'appointment.schedule')} onClick={() => setShowCancel(true)}>
            <X size={15} />
            <span>Cancel Appointment</span>
          </button>
        )}
      </div>

      {/* Audit Trail & History */}
      {Boolean(appointment.rescheduleHistory?.length || appointment.cancellationReason) && (
        <div className="appointment-history-box">
          <div className="history-header">
            <History size={15} />
            <h4>Booking Modification History</h4>
          </div>
          {appointment.cancellationReason && (
            <div className="cancel-history-item">
              <span className="badge-cancelled">Cancelled</span>
              <p>Reason: {appointment.cancellationReason}</p>
            </div>
          )}
          {appointment.rescheduleHistory?.map((rh, index) => (
            <div key={index} className="reschedule-history-item">
              <span>Rescheduled from {rh.previousDate} {rh.previousTime} &rarr; {rh.newDate} {rh.newTime}</span>
              <small>Reason: {rh.reason} &bull; Changed at {new Date(rh.changedAt).toLocaleTimeString()}</small>
            </div>
          ))}
        </div>
      )}

      {/* Module Integration Bar */}
      <div className="appointment-module-integrations">
        <h4>Connect Patient Workflow</h4>
        <nav className="clinic-record-actions" aria-label="Continue patient workflow">
          <Link to={`/patients/${patient.id}`}>
            <UserRound size={14} />
            <span>Patient Profile</span>
          </Link>
          <Link to={`/patients/${patient.id}/tooth-chart`}>
            <Stethoscope size={14} />
            <span>Dental Tooth Chart</span>
          </Link>
          <Link to={`/clinical/notes?patientId=${patient.id}`}>
            <FileText size={14} />
            <span>Add Clinical Note</span>
          </Link>
          <Link to={`/clinical/treatment-plans?patientId=${patient.id}`}>
            <Activity size={14} />
            <span>Treatment Plan</span>
          </Link>
          <button
            type="button"
            className="action-billing-link"
            onClick={() => {
              const res = autoGenerateInvoiceForConsultation({
                appointment,
                patientId: appointment.patientId,
              })
              if (res.invoice) {
                setActiveInvoice(res.invoice)
              }
            }}
            title="View or generate consultation invoice"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <CreditCard size={14} />
            <span>Generate Invoice</span>
          </button>
        </nav>
      </div>

      {/* Reschedule Modal */}
      {showReschedule && (
        <div className="calendar-modal-overlay" onClick={() => setShowReschedule(false)}>
          <div className="sub-modal-card reschedule-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="reschedule-header-icon"><RotateCcw size={16} /></span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '15px' }}>Reschedule Booking</h3>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-muted, #64748b)' }}>Ref: #{shortRef}</span>
                </div>
              </div>
              <button type="button" className="btn-close" onClick={() => setShowReschedule(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleRescheduleSubmit} className="sub-modal-form" style={{ padding: '20px' }}>
              <div className="reschedule-context-banner">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Patient: <strong style={{ color: 'var(--text-strong)' }}>{patient?.firstName} {patient?.lastName}</strong></span>
                  <span style={{ fontSize: '11px', color: 'var(--teal-primary)', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', background: 'var(--teal-tint)' }}>{appointment.chair}</span>
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Doctor: <strong style={{ color: 'var(--text-strong)' }}>{appointment.doctor}</strong> &bull; {appointment.treatmentType}
                </div>
                <div className="reschedule-current-pill">
                  <span>Current Schedule:</span>
                  <strong>{appointment.date} at {appointment.time}</strong>
                </div>
              </div>

              {rescheduleError && (
                <div className="conflict-alert" style={{ marginBottom: '12px' }}>
                  <AlertTriangle size={15} />
                  <span>{rescheduleError}</span>
                </div>
              )}
              <div className="form-row-2">
                <label className="form-field">
                  <span>New Date *</span>
                  <input
                    type="date"
                    required
                    min={getClinicNow().date}
                    value={rescheduleDate}
                    onChange={(e) => {
                      setRescheduleDate(e.target.value)
                      setRescheduleError('')
                    }}
                  />
                </label>
                <label className="form-field">
                  <span>New Time Slot *</span>
                  <select
                    value={rescheduleTime}
                    onChange={(e) => {
                      setRescheduleTime(e.target.value)
                      setRescheduleError('')
                    }}
                  >
                    {TIME_SLOTS.map((s) => {
                      const slotCheck = getRescheduleSlotAvailability(s)
                      const isAvailable = slotCheck.available
                      return (
                        <option
                          key={s}
                          value={s}
                          disabled={!isAvailable}
                          className={isAvailable ? 'slot-option-available' : 'slot-option-unavailable'}
                          style={{
                            color: isAvailable ? 'var(--text-strong, #0f172a)' : 'var(--text-muted, #94a3b8)',
                            fontWeight: isAvailable ? 600 : 400
                          }}
                        >
                          {s}
                        </option>
                      )
                    })}
                  </select>
                </label>
              </div>
              <label className="form-field">
                <span>Reason for Reschedule (Optional)</span>
                <input
                  type="text"
                  placeholder="e.g. Doctor emergency leave, patient requested later slot..."
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                />
              </label>
              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button type="button" className="btn-cancel" onClick={() => setShowReschedule(false)}>Cancel</button>
                <button
                  type="submit"
                  className="btn-confirm-reschedule"
                  disabled={rescheduleSaving || !getRescheduleSlotAvailability(rescheduleTime).available}
                  style={{
                    opacity: !getRescheduleSlotAvailability(rescheduleTime).available ? 0.6 : 1,
                    cursor: !getRescheduleSlotAvailability(rescheduleTime).available ? 'not-allowed' : 'pointer'
                  }}
                >
                  <RotateCcw size={14} />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancel && (
        <div className="calendar-modal-overlay" onClick={() => setShowCancel(false)}>
          <div className="sub-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '15px' }}>Cancel Appointment</h3>
              <button type="button" className="btn-close" onClick={() => setShowCancel(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleCancelSubmit} className="sub-modal-form">
              <label className="form-field">
                <span>Reason for Cancellation *</span>
                <textarea
                  required
                  rows={3}
                  placeholder="Record why this appointment is being cancelled..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
              </label>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowCancel(false)}>Keep Appointment</button>
                <button type="submit" className="btn-danger-confirm">Confirm Cancellation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {showWhatsApp && (
        <div className="calendar-modal-overlay" onClick={() => setShowWhatsApp(false)}>
          <div className="sub-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '15px' }}>Send WhatsApp Message</h3>
              <button type="button" className="btn-close" onClick={() => setShowWhatsApp(false)}><X size={16} /></button>
            </div>
            <div className="whatsapp-preview-box">
              <label className="form-field">
                <span>Select Template:</span>
                <select value={whatsAppType} onChange={(e) => setWhatsAppType(e.target.value as any)}>
                  <option value="confirmation">Appointment Confirmation</option>
                  <option value="reminder_24h">24-Hour Reminder</option>
                  <option value="reminder_2h">2-Hour Arrival Alert</option>
                  <option value="recall">6-Month Recall Message</option>
                </select>
              </label>
              <div className="whatsapp-bubble-preview">
                <pre>{generateWhatsAppMessage(whatsAppType, appointment, patient)}</pre>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowWhatsApp(false)}>Cancel</button>
                <button type="button" className="btn-whatsapp-send" onClick={handleSendWhatsApp}>
                  <Send size={15} />
                  <span>Send via WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeConsentModal && (
        <ConsentDocumentModal
          consent={activeConsentModal}
          patient={patient}
          initialTab={isConsentPending(activeConsentModal.status) ? 'sign' : 'document'}
          onClose={() => setActiveConsentModal(null)}
          onUpdated={(updated) => setActiveConsentModal(updated)}
        />
      )}

      {showMaterialModal && (
        <TreatmentMaterialUsageModal
          isOpen={showMaterialModal}
          onClose={() => setShowMaterialModal(false)}
          appointmentId={appointment.id}
          patientId={patient.id}
          patientName={`${patient.firstName} ${patient.lastName}`}
          doctorId={appointment.doctor.includes('Priya') ? 'doc-2' : appointment.doctor.includes('Tariq') ? 'doc-3' : 'doc-1'}
          doctorName={appointment.doctor}
          procedureId={(appointment.treatmentType || appointment.visitType || '').toLowerCase().includes('root canal') ? 'trt-root-canal' : (appointment.treatmentType || '').toLowerCase().includes('extraction') ? 'trt-extraction' : 'trt-root-canal'}
          procedureName={appointment.treatmentType || appointment.visitType || 'Root Canal Treatment'}
        />
      )}

      {/* Auto-Generated / Consultation Invoice Drawer Preview */}
      {activeInvoice && (
        <InvoiceDrawer
          invoice={activeInvoice}
          patient={patient}
          onClose={() => setActiveInvoice(null)}
          onDone={() => setActiveInvoice(null)}
        />
      )}

      {/* Invoice Generated Success Toast */}
      <InvoiceSuccessToast
        toast={invoiceToast}
        onClose={() => setInvoiceToast(null)}
      />
      {patient && canClinic(getPermissionUser(), 'document.read') && <PatientDocumentsPanel key={appointment.backendId || appointment.id} patientId={patient.backendId || patient.id} appointmentId={appointment.backendId || appointment.id} />}
    </section>
  )
}

export default AppointmentDetailPage
