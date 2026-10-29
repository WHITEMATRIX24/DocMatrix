import React, { useState } from 'react'
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
  CheckCircle2,
  Activity,
  History
} from 'lucide-react'
import {
  useClinicData,
  updateAppointmentStatus,
  rescheduleAppointment,
  cancelAppointment,
  generateWhatsAppMessage,
  sendAppointmentReminder,
  type AppointmentStatus
} from '@/services/clinicStore'

export const AppointmentDetailPage: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const { patients, appointments } = useClinicData()

  const appointment = appointments.find((entry) => entry.id === id)
  const patient = patients.find((entry) => entry.id === appointment?.patientId)

  // Modals state
  const [showReschedule, setShowReschedule] = useState(false)
  const [showCancel, setShowCancel] = useState(false)
  const [showWhatsApp, setShowWhatsApp] = useState(false)

  const [rescheduleDate, setRescheduleDate] = useState(appointment?.date || '')
  const [rescheduleTime, setRescheduleTime] = useState(appointment?.time || '10:00')
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [rescheduleError, setRescheduleError] = useState('')

  const [cancelReason, setCancelReason] = useState('')
  const [whatsAppType, setWhatsAppType] = useState<'confirmation' | 'reminder_24h' | 'reminder_2h' | 'recall'>('confirmation')

  if (!appointment || !patient) {
    return (
      <section className="appointment-simple-panel" data-testid={`record-not-found-${id || 'appointment'}`}>
        <h2>Appointment not found</h2>
        <p>This session has no booking with reference {id}.</p>
        <button className="appointment-detail-back" onClick={() => navigate('/appointments/details')}>
          <ArrowLeft size={14} /> Back to Appointments
        </button>
      </section>
    )
  }

  const handleStatusChange = (newStatus: AppointmentStatus) => {
    updateAppointmentStatus(appointment.id, newStatus)
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

  return (
    <section className="appointment-simple-panel appointment-detail-panel" data-testid="feature-page-appt.detail">
      {/* Header Banner */}
      <div className="appointment-simple-heading">
        <div className="appointment-simple-heading-icon">
          <CalendarDays size={20} />
        </div>
        <div>
          <h2>Appointment Reference: {appointment.id}</h2>
          <p>Booked on {new Date(appointment.createdAt).toLocaleDateString()}</p>
        </div>
        <div className="status-dropdown-wrap">
          <label>Status:</label>
          <select
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
          <span><UserRound size={14} /> Patient</span>
          <strong><Link to={`/patients/${patient.id}`}>{patient.firstName} {patient.lastName} ({patient.id})</Link></strong>
        </div>
        <div>
          <span><CalendarDays size={14} /> Date</span>
          <strong>{appointment.date}</strong>
        </div>
        <div>
          <span><Clock size={14} /> Time & Duration</span>
          <strong>{appointment.time} ({appointment.durationMinutes || 30} mins)</strong>
        </div>
        <div>
          <span>Doctor & Chair</span>
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

      {/* Action Buttons: Reschedule, WhatsApp, Cancel */}
      <div className="appointment-action-controls">
        <button className="btn-reschedule" onClick={() => setShowReschedule(true)}>
          <RotateCcw size={15} />
          <span>Reschedule Booking</span>
        </button>
        <button className="btn-whatsapp" onClick={() => setShowWhatsApp(true)}>
          <Send size={15} />
          <span>WhatsApp Reminder</span>
        </button>
        {appointment.status !== 'cancelled' && (
          <button className="btn-cancel-appt" onClick={() => setShowCancel(true)}>
            <X size={15} />
            <span>Cancel Appointment</span>
          </button>
        )}
      </div>

      {/* Audit Trail & History */}
      {(appointment.rescheduleHistory?.length || appointment.cancellationReason) && (
        <div className="appointment-history-box">
          <div className="history-header">
            <History size={16} />
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

      {/* Module Integration Bar (Requirement #8) */}
      <div className="appointment-module-integrations">
        <h4>Connect Patient Workflow</h4>
        <nav className="clinic-record-actions" aria-label="Continue patient workflow">
          <Link to={`/patients/${patient.id}`}>
            <UserRound size={15} />
            <span>Patient profile</span>
          </Link>
          <Link to={`/patients/${patient.id}/tooth-chart`}>
            <Stethoscope size={15} />
            <span>Dental Tooth Chart</span>
          </Link>
          <Link to={`/clinical/notes?patientId=${patient.id}`}>
            <FileText size={15} />
            <span>Add clinical note</span>
          </Link>
          <Link to={`/clinical/treatment-plans?patientId=${patient.id}`}>
            <Activity size={15} />
            <span>Treatment Plan</span>
          </Link>
          <Link to={`/billing/invoices?patientId=${patient.id}&appointmentId=${appointment.id}`} className="action-billing-link">
            <CreditCard size={15} />
            <span>Generate Invoice</span>
          </Link>
        </nav>
      </div>

      <button className="appointment-detail-back" onClick={() => navigate('/appointments/details')}>
        <ArrowLeft size={14} /> Back to Appointments
      </button>

      {/* Reschedule Modal */}
      {showReschedule && (
        <div className="calendar-modal-overlay">
          <div className="sub-modal-card">
            <div className="modal-header">
              <h3>Reschedule Booking</h3>
              <button className="btn-close" onClick={() => setShowReschedule(false)}><X size={16} /></button>
            </div>
            <form onSubmit={handleRescheduleSubmit} className="sub-modal-form">
              {rescheduleError && (
                <div className="conflict-alert">
                  <AlertTriangle size={15} />
                  <span>{rescheduleError}</span>
                </div>
              )}
              <div className="form-row-2">
                <label className="form-field">
                  <span>New Date</span>
                  <input
                    type="date"
                    required
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                  />
                </label>
                <label className="form-field">
                  <span>New Time Slot</span>
                  <input
                    type="time"
                    required
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                  />
                </label>
              </div>
              <label className="form-field">
                <span>Reason for Reschedule *</span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Doctor emergency leave, patient requested later slot..."
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                />
              </label>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowReschedule(false)}>Close</button>
                <button type="submit" className="btn-confirm">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancel && (
        <div className="calendar-modal-overlay">
          <div className="sub-modal-card">
            <div className="modal-header">
              <h3>Cancel Appointment</h3>
              <button className="btn-close" onClick={() => setShowCancel(false)}><X size={16} /></button>
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
        <div className="calendar-modal-overlay">
          <div className="sub-modal-card">
            <div className="modal-header">
              <h3>Send WhatsApp Message</h3>
              <button className="btn-close" onClick={() => setShowWhatsApp(false)}><X size={16} /></button>
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
    </section>
  )
}

export default AppointmentDetailPage
