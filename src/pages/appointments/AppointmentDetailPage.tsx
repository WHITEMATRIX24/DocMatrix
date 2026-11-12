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
  Sparkles
} from 'lucide-react'
import { TreatmentMaterialUsageModal } from '@/components/inventory/TreatmentMaterialUsageModal'
import {
  useClinicData,
  findAppointment,
  fetchAppointmentById,
  isAuthenticatedClinic,
  updateAppointmentStatus,
  rescheduleAppointment,
  cancelAppointment,
  generateWhatsAppMessage,
  sendAppointmentReminder,
  type AppointmentStatus,
  type PatientRecord
} from '@/services/clinicStore'

export const AppointmentDetailPage: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const { patients, appointments } = useClinicData()

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
  const [showCancel, setShowCancel] = useState(false)
  const [showWhatsApp, setShowWhatsApp] = useState(false)
  const [showMaterialModal, setShowMaterialModal] = useState(false)

  const [rescheduleDate, setRescheduleDate] = useState(appointment?.date || '')
  const [rescheduleTime, setRescheduleTime] = useState(appointment?.time || '10:00')
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [rescheduleError, setRescheduleError] = useState('')

  const [cancelReason, setCancelReason] = useState('')
  const [whatsAppType, setWhatsAppType] = useState<'confirmation' | 'reminder_24h' | 'reminder_2h' | 'recall'>('confirmation')

  useEffect(() => {
    if (appointment) {
      setRescheduleDate(appointment.date)
      setRescheduleTime(appointment.time)
    }
  }, [appointment?.id, appointment?.date, appointment?.time])

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

  const handleStatusChange = (newStatus: AppointmentStatus) => {
    updateAppointmentStatus(appointment.id, newStatus)
    if (newStatus === 'completed') {
      setShowMaterialModal(true)
    }
  }

  const handleRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setRescheduleError('')
    const result = rescheduleAppointment(
      appointment.id,
      rescheduleDate,
      rescheduleTime,
      rescheduleReason || 'Patient requested reschedule.'
    )

    if (!result.success) {
      setRescheduleError(result.error || 'Conflict detected. Please choose another slot.')
      return
    }

    setShowReschedule(false)
  }

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    cancelAppointment(appointment.id, cancelReason || 'Patient cancelled visit.')
    setShowCancel(false)
  }

  const handleSendWhatsApp = () => {
    const message = generateWhatsAppMessage(whatsAppType, appointment, patient)
    sendAppointmentReminder(appointment.id, 'whatsapp')

    const phone = patient.mobile.replace(/\D/g, '')
    const url = `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
    setShowWhatsApp(false)
  }

  const shortRef = appointment.bookingRef
    ? appointment.bookingRef
    : (appointment.id.length > 14 ? appointment.id.slice(0, 8).toUpperCase() : appointment.id)

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
            <h2 title={appointment.id}>Booking #{shortRef}</h2>
            <p>Booked on {new Date(appointment.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          </div>
        </div>
        <div className="status-dropdown-wrap">
          <label htmlFor="appt-detail-status">Status</label>
          <select
            id="appt-detail-status"
            className={`status-select-pill status-${appointment.status}`}
            value={appointment.status}
            onChange={(e) => handleStatusChange(e.target.value as AppointmentStatus)}
          >
            <option value="scheduled">Scheduled</option>
            <option value="confirmed">Confirmed</option>
            <option value="checked-in">Checked-in</option>
            <option value="in-progress">In Consultation</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no-show">No-Show</option>
          </select>
        </div>
      </div>

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
      </div>

      {/* Action Buttons: Materials, Reschedule, WhatsApp, Cancel */}
      <div className="appointment-action-controls">
        <button
          type="button"
          className="btn-appt-action btn-appt-materials"
          onClick={() => setShowMaterialModal(true)}
          title="Review and confirm materials used during this procedure"
        >
          <Sparkles size={15} />
          <span>Record Material Usage</span>
        </button>
        <button type="button" className="btn-appt-action btn-reschedule" onClick={() => setShowReschedule(true)}>
          <RotateCcw size={15} />
          <span>Reschedule Booking</span>
        </button>
        <button type="button" className="btn-appt-action btn-whatsapp" onClick={() => setShowWhatsApp(true)}>
          <Send size={15} />
          <span>WhatsApp Reminder</span>
        </button>
        {appointment.status !== 'cancelled' && (
          <button type="button" className="btn-appt-action btn-cancel-appt" onClick={() => setShowCancel(true)}>
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
          <Link to={`/billing/invoices?patientId=${patient.id}&appointmentId=${appointment.id}`} className="action-billing-link">
            <CreditCard size={14} />
            <span>Generate Invoice</span>
          </Link>
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
                    min={new Date().toISOString().slice(0, 10)}
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                  />
                </label>
                <label className="form-field">
                  <span>New Time Slot *</span>
                  <input
                    type="time"
                    required
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                  />
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
                <button type="submit" className="btn-confirm-reschedule">
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
    </section>
  )
}

export default AppointmentDetailPage
