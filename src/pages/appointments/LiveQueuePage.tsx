import React, { useState } from 'react'
import './calendar.css'
import { Link } from 'react-router-dom'
import {
  Activity,
  UserPlus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Check,
  FileText,
  CreditCard,
  User,
  X,
  Stethoscope,
  ChevronRight
} from 'lucide-react'
import {
  useClinicData,
  registerWalkIn,
  updateAppointmentStatus,
  DENTISTS,
  type AppointmentRecord,
  type AppointmentPriority
} from '@/services/clinicStore'

export const LiveQueuePage: React.FC = () => {
  const { appointments, patients } = useClinicData()
  const [modalOpen, setModalOpen] = useState(false)
  const [walkInForm, setWalkInForm] = useState({
    patientName: '',
    mobile: '',
    gender: 'female',
    age: '28',
    complaint: '',
    doctor: DENTISTS[0].name,
    priority: 'normal' as AppointmentPriority
  })

  const today = new Date().toISOString().slice(0, 10)
  const todayAppointments = appointments.filter((a) => a.date === today && a.status !== 'cancelled')

  // Filter queue columns
  const waitingPatients = todayAppointments.filter((a) => a.status === 'checked-in')
  const inConsultation = todayAppointments.filter((a) => a.status === 'in-progress')
  const completedToday = todayAppointments.filter((a) => a.status === 'completed')
  const scheduledUpcoming = todayAppointments.filter((a) => a.status === 'scheduled' || a.status === 'confirmed')

  const handleRegisterWalkIn = (e: React.FormEvent) => {
    e.preventDefault()
    if (!walkInForm.patientName.trim()) return

    registerWalkIn({
      patientName: walkInForm.patientName,
      mobile: walkInForm.mobile,
      gender: walkInForm.gender,
      age: walkInForm.age,
      complaint: walkInForm.complaint || 'General Check-up',
      doctor: walkInForm.doctor,
      priority: walkInForm.priority
    })

    setWalkInForm({
      patientName: '',
      mobile: '',
      gender: 'female',
      age: '28',
      complaint: '',
      doctor: DENTISTS[0].name,
      priority: 'normal'
    })
    setModalOpen(false)
  }

  const getPatient = (patientId: string) => patients.find((p) => p.id === patientId)

  return (
    <div className="live-queue-page" data-testid="feature-page-appt.queue">
      {/* Top Banner & Stats */}
      <div className="queue-summary-banner">
        <div className="queue-metric-card">
          <span className="metric-label">Waiting in Clinic</span>
          <strong className="metric-value text-amber">{waitingPatients.length}</strong>
          <span className="metric-sub">Avg wait: ~12 mins</span>
        </div>
        <div className="queue-metric-card">
          <span className="metric-label">In Consultation</span>
          <strong className="metric-value text-teal">{inConsultation.length}</strong>
          <span className="metric-sub">{DENTISTS.length} active chairs</span>
        </div>
        <div className="queue-metric-card">
          <span className="metric-label">Completed Today</span>
          <strong className="metric-value text-green">{completedToday.length}</strong>
          <span className="metric-sub">Procedures finished</span>
        </div>
        <div className="queue-metric-card">
          <span className="metric-label">Upcoming Scheduled</span>
          <strong className="metric-value">{scheduledUpcoming.length}</strong>
          <span className="metric-sub">Expected later today</span>
        </div>
        <div className="queue-metric-action">
          <button className="btn-walkin-main" onClick={() => setModalOpen(true)}>
            <UserPlus size={16} />
            <span>Register Walk-in</span>
          </button>
        </div>
      </div>

      {/* 3 Active Queue Columns */}
      <div className="queue-board-columns">
        {/* Column 1: Waiting Room */}
        <div className="queue-col">
          <div className="queue-col-header waiting-header">
            <div className="col-title">
              <Clock size={16} />
              <h3>Waiting Room</h3>
            </div>
            <span className="col-count">{waitingPatients.length}</span>
          </div>

          <div className="queue-col-list">
            {waitingPatients.length === 0 ? (
              <div className="empty-queue-placeholder">
                <CheckCircle2 size={24} />
                <p>No patients currently waiting.</p>
              </div>
            ) : (
              waitingPatients.map((appt) => {
                const patient = getPatient(appt.patientId)
                return (
                  <div key={appt.id} className={`queue-patient-card priority-${appt.priority || 'normal'}`}>
                    <div className="queue-card-top">
                      <span className="queue-token-pill">{appt.queueToken || 'SCHEDULED'}</span>
                      <span className={`priority-badge ${appt.priority || 'normal'}`}>
                        {appt.priority || 'normal'}
                      </span>
                    </div>

                    <div className="queue-patient-info">
                      <h4>{patient ? `${patient.firstName} ${patient.lastName}` : 'Walk-in Guest'}</h4>
                      <div className="queue-patient-sub">
                        <span><User size={12} /> {patient?.gender || 'N/A'}, {patient?.age || '25'} yrs</span>
                        <span><Clock size={12} /> Arrived: {appt.checkInTime || appt.time}</span>
                      </div>
                      <div className="queue-treatment-tag">
                        <Stethoscope size={12} />
                        <span>{appt.treatmentType || appt.visitType}</span>
                      </div>
                      <div className="queue-doctor-assigned">
                        Assigned: <strong>{appt.doctor}</strong> ({appt.chair || 'Chair 1'})
                      </div>
                    </div>

                    <div className="queue-card-actions">
                      <button
                        className="btn-start-consult"
                        onClick={() => updateAppointmentStatus(appt.id, 'in-progress')}
                      >
                        <Play size={13} />
                        <span>Call In / Start</span>
                      </button>
                      <Link to={`/appointments/${appt.id}`} className="btn-view-link">
                        Details
                      </Link>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Column 2: In Consultation */}
        <div className="queue-col">
          <div className="queue-col-header in-consult-header">
            <div className="col-title">
              <Activity size={16} />
              <h3>In Consultation</h3>
            </div>
            <span className="col-count">{inConsultation.length}</span>
          </div>

          <div className="queue-col-list">
            {inConsultation.length === 0 ? (
              <div className="empty-queue-placeholder">
                <p>No active consultations in progress.</p>
              </div>
            ) : (
              inConsultation.map((appt) => {
                const patient = getPatient(appt.patientId)
                return (
                  <div key={appt.id} className="queue-patient-card in-consult-card">
                    <div className="queue-card-top">
                      <span className="chair-badge">{appt.chair || 'Chair 1'}</span>
                      <span className="in-progress-pulse">Active Now</span>
                    </div>

                    <div className="queue-patient-info">
                      <h4>{patient ? `${patient.firstName} ${patient.lastName}` : 'Patient'}</h4>
                      <p className="doctor-line">Dentist: <strong>{appt.doctor}</strong></p>
                      <div className="queue-treatment-tag">
                        <span>{appt.treatmentType || appt.visitType}</span>
                      </div>
                      <div className="consult-time-meta">
                        Started: <strong>{appt.consultationStartTime || appt.time}</strong>
                      </div>
                    </div>

                    <div className="queue-card-actions">
                      <button
                        className="btn-complete-visit"
                        onClick={() => updateAppointmentStatus(appt.id, 'completed')}
                      >
                        <Check size={13} />
                        <span>Complete Visit</span>
                      </button>
                      <Link
                        to={`/clinical/notes?patientId=${patient?.id}`}
                        className="btn-quick-note"
                        title="Add Clinical Note"
                      >
                        <FileText size={13} />
                        <span>Note</span>
                      </Link>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Column 3: Scheduled Check-in Table */}
        <div className="queue-col">
          <div className="queue-col-header scheduled-header">
            <div className="col-title">
              <CheckCircle2 size={16} />
              <h3>Today's Arrivals Check-in</h3>
            </div>
            <span className="col-count">{scheduledUpcoming.length}</span>
          </div>

          <div className="queue-col-list">
            {scheduledUpcoming.length === 0 ? (
              <div className="empty-queue-placeholder">
                <p>All scheduled patients for today are checked-in or finished.</p>
              </div>
            ) : (
              scheduledUpcoming.map((appt) => {
                const patient = getPatient(appt.patientId)
                return (
                  <div key={appt.id} className="queue-patient-card scheduled-card">
                    <div className="scheduled-time-slot">
                      <strong>{appt.time}</strong>
                      <span className="status-badge-mini">{appt.status}</span>
                    </div>

                    <div className="queue-patient-info">
                      <h4>{patient ? `${patient.firstName} ${patient.lastName}` : 'Scheduled Patient'}</h4>
                      <div className="queue-doctor-assigned">
                        {appt.doctor} &bull; {appt.treatmentType || appt.visitType}
                      </div>
                    </div>

                    <div className="queue-card-actions">
                      <button
                        className="btn-checkin-arrival"
                        onClick={() => updateAppointmentStatus(appt.id, 'checked-in', 'Patient arrived at clinic.')}
                      >
                        <UserPlus size={13} />
                        <span>Check-In Patient</span>
                      </button>
                      <Link to={`/appointments/${appt.id}`} className="btn-view-link">
                        View
                      </Link>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Completed Today Quick Bar */}
      {completedToday.length > 0 && (
        <div className="completed-summary-bar">
          <h4>Completed Consultations Today ({completedToday.length})</h4>
          <div className="completed-scroll-row">
            {completedToday.map((appt) => {
              const patient = getPatient(appt.patientId)
              return (
                <div key={appt.id} className="completed-chip">
                  <CheckCircle2 size={13} className="text-green" />
                  <strong>{patient ? `${patient.firstName} ${patient.lastName}` : 'Patient'}</strong>
                  <span>({appt.doctor})</span>
                  <Link
                    to={`/billing/invoices?patientId=${patient?.id}&appointmentId=${appt.id}`}
                    className="billing-shortcut-btn"
                  >
                    <CreditCard size={12} />
                    <span>Bill</span>
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Register Walk-in Modal */}
      {modalOpen && (
        <div className="queue-modal-overlay">
          <div className="queue-modal-card">
            <div className="queue-modal-header">
              <div className="modal-title">
                <UserPlus size={20} />
                <h3>Register Walk-in Patient</h3>
              </div>
              <button className="btn-modal-close" onClick={() => setModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRegisterWalkIn} className="walkin-form">
              <div className="form-row-2">
                <label className="form-field">
                  <span>Patient Full Name *</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={walkInForm.patientName}
                    onChange={(e) => setWalkInForm({ ...walkInForm, patientName: e.target.value })}
                  />
                </label>
                <label className="form-field">
                  <span>Mobile Phone *</span>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9845012345"
                    value={walkInForm.mobile}
                    onChange={(e) => setWalkInForm({ ...walkInForm, mobile: e.target.value })}
                  />
                </label>
              </div>

              <div className="form-row-3">
                <label className="form-field">
                  <span>Gender</span>
                  <select
                    value={walkInForm.gender}
                    onChange={(e) => setWalkInForm({ ...walkInForm, gender: e.target.value })}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="form-field">
                  <span>Age</span>
                  <input
                    type="number"
                    min="1"
                    max="110"
                    value={walkInForm.age}
                    onChange={(e) => setWalkInForm({ ...walkInForm, age: e.target.value })}
                  />
                </label>
                <label className="form-field">
                  <span>Priority</span>
                  <select
                    value={walkInForm.priority}
                    onChange={(e) => setWalkInForm({ ...walkInForm, priority: e.target.value as AppointmentPriority })}
                  >
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </label>
              </div>

              <label className="form-field">
                <span>Primary Dental Complaint</span>
                <input
                  type="text"
                  placeholder="e.g. Toothache, chipped tooth, emergency bleeding..."
                  value={walkInForm.complaint}
                  onChange={(e) => setWalkInForm({ ...walkInForm, complaint: e.target.value })}
                />
              </label>

              <label className="form-field">
                <span>Assign to Dentist</span>
                <select
                  value={walkInForm.doctor}
                  onChange={(e) => setWalkInForm({ ...walkInForm, doctor: e.target.value })}
                >
                  {DENTISTS.map((d) => (
                    <option key={d.id} value={d.name}>
                      {d.name} ({d.specialization} &bull; {d.chair})
                    </option>
                  ))}
                </select>
              </label>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit-walkin">
                  <Check size={16} />
                  <span>Generate Token & Add to Queue</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default LiveQueuePage
