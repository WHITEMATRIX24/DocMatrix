import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  CalendarDays,
  Clock,
  User,
  X,
  Play,
  Edit3,
  XCircle,
  UserRound,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Stethoscope,
  Activity,
  UserCheck
} from 'lucide-react'
import './calendar.css'

export interface AppointmentItem {
  id: string
  patientName: string
  patientId: string
  phone: string
  doctor: string
  chair: string
  procedure: string
  procedureSub: string
  session: string
  startTime: string
  endTime: string
  duration: string
  status: 'Confirmed' | 'In Consultation' | 'Completed' | 'Cancelled'
  theme: 'blue' | 'green' | 'slate' | 'purple' | 'amber' | 'cyan' | 'red' | 'mint'
  notes: string
  slotTime: string // Starting slot: '9:00 AM', '9:30 AM', etc.
  date: string
}

const DOCTORS = [
  { name: 'Dr. Arun Kumar', chair: 'Chair 1', id: 'doc-1' },
  { name: 'Dr. Priya Nair', chair: 'Chair 2', id: 'doc-2' },
  { name: 'Dr. Tariq Antoun', chair: 'Chair 3', id: 'doc-3' }
]

const TIME_SLOTS = [
  '9:00 AM',
  '9:30 AM',
  '10:00 AM',
  '10:30 AM',
  '11:00 AM',
  '11:30 AM',
  '12:00 PM',
  '12:30 PM',
  '1:00 PM'
]

const INITIAL_APPOINTMENTS: AppointmentItem[] = [
  {
    id: 'apt-1',
    patientName: 'Meera Nambiar',
    patientId: 'DM-1024',
    phone: '98450 11223',
    doctor: 'Dr. Arun Kumar',
    chair: 'Chair 1',
    procedure: 'Root Canal Treatment',
    procedureSub: 'Root Canal (2/3)',
    session: 'Session 2 of 3',
    startTime: '9:30 AM',
    endTime: '10:15 AM',
    duration: '45 min',
    status: 'Confirmed',
    theme: 'blue',
    notes: 'Check working length and obturation plan.',
    slotTime: '9:30 AM',
    date: 'Mon, 14 Apr 2025'
  },
  {
    id: 'apt-2',
    patientName: 'Fatima Zahra',
    patientId: 'DM-1025',
    phone: '98450 11224',
    doctor: 'Dr. Arun Kumar',
    chair: 'Chair 1',
    procedure: 'Scaling & Polish',
    procedureSub: 'Scaling & Polish',
    session: 'Routine Dental Hygiene',
    startTime: '10:30 AM',
    endTime: '11:15 AM',
    duration: '45 min',
    status: 'Confirmed',
    theme: 'green',
    notes: 'Routine 6-month cleaning and prophylaxis.',
    slotTime: '10:30 AM',
    date: 'Mon, 14 Apr 2025'
  },
  {
    id: 'apt-3',
    patientName: 'Ananya Sharma',
    patientId: 'DM-1026',
    phone: '98450 11225',
    doctor: 'Dr. Arun Kumar',
    chair: 'Chair 1',
    procedure: 'Orthodontic Review',
    procedureSub: 'Orthodontic Review',
    session: 'Monthly Adjustments',
    startTime: '11:30 AM',
    endTime: '12:00 PM',
    duration: '30 min',
    status: 'Confirmed',
    theme: 'slate',
    notes: 'Archwire replacement and elastic power chain activation.',
    slotTime: '11:30 AM',
    date: 'Mon, 14 Apr 2025'
  },
  {
    id: 'apt-4',
    patientName: 'Rohan Mehta',
    patientId: 'DM-1027',
    phone: '98450 11226',
    doctor: 'Dr. Arun Kumar',
    chair: 'Chair 1',
    procedure: 'Extraction',
    procedureSub: 'Extraction',
    session: 'Surgical Procedure',
    startTime: '12:30 PM',
    endTime: '1:15 PM',
    duration: '45 min',
    status: 'Confirmed',
    theme: 'purple',
    notes: 'Lower right 1st premolar simple extraction under local anaesthesia.',
    slotTime: '12:30 PM',
    date: 'Mon, 14 Apr 2025'
  },
  {
    id: 'apt-5',
    patientName: 'Rahul Krishnan',
    patientId: 'DM-1028',
    phone: '98450 11227',
    doctor: 'Dr. Priya Nair',
    chair: 'Chair 2',
    procedure: 'Crown Seating',
    procedureSub: 'Crown Seating',
    session: 'Final Delivery',
    startTime: '9:00 AM',
    endTime: '9:45 AM',
    duration: '45 min',
    status: 'Confirmed',
    theme: 'amber',
    notes: 'Zirconia crown delivery on tooth #46 with resin cement.',
    slotTime: '9:00 AM',
    date: 'Mon, 14 Apr 2025'
  },
  {
    id: 'apt-6',
    patientName: 'Siddharth Menon',
    patientId: 'DM-1029',
    phone: '98450 11228',
    doctor: 'Dr. Priya Nair',
    chair: 'Chair 2',
    procedure: 'Wisdom Tooth Review',
    procedureSub: 'Wisdom Tooth Review',
    session: 'Post-Operative Check',
    startTime: '11:00 AM',
    endTime: '11:45 AM',
    duration: '45 min',
    status: 'Confirmed',
    theme: 'cyan',
    notes: 'Suture removal and healing inspection on quadrant 3.',
    slotTime: '11:00 AM',
    date: 'Mon, 14 Apr 2025'
  },
  {
    id: 'apt-7',
    patientName: 'Kavita Rao',
    patientId: 'DM-1030',
    phone: '98450 11229',
    doctor: 'Dr. Tariq Antoun',
    chair: 'Chair 3',
    procedure: 'Filling (Composite)',
    procedureSub: 'Filling (Composite)',
    session: 'Class II Restoration',
    startTime: '10:00 AM',
    endTime: '10:45 AM',
    duration: '45 min',
    status: 'Confirmed',
    theme: 'red',
    notes: 'Posterior composite restoration on tooth #25 with rubber dam.',
    slotTime: '10:00 AM',
    date: 'Mon, 14 Apr 2025'
  },
  {
    id: 'apt-8',
    patientName: 'Karan Iyer',
    patientId: 'DM-1031',
    phone: '98450 11230',
    doctor: 'Dr. Tariq Antoun',
    chair: 'Chair 3',
    procedure: 'Implant Review',
    procedureSub: 'Implant Review',
    session: 'Osseointegration Follow-up',
    startTime: '12:00 PM',
    endTime: '12:45 PM',
    duration: '45 min',
    status: 'Confirmed',
    theme: 'mint',
    notes: 'ISQ stability measurement and healing abutment placement.',
    slotTime: '12:00 PM',
    date: 'Mon, 14 Apr 2025'
  }
]

export const CalendarPage: React.FC = () => {
  const navigate = useNavigate()

  // View state: 'Day' | 'Week' | 'Doctor-wise'
  const [viewMode, setViewMode] = useState<'Day' | 'Week' | 'Doctor-wise'>('Day')
  const [currentDateString, setCurrentDateString] = useState('Mon, 14 Apr 2025')

  // Filter dropdown states
  const [filterDentist, setFilterDentist] = useState('All Dentists')
  const [filterType, setFilterType] = useState('All Appointment Types')
  const [filterStatus, setFilterStatus] = useState('All Statuses')

  // Appointments list and selection
  const [appointments, setAppointments] = useState<AppointmentItem[]>(INITIAL_APPOINTMENTS)
  // Default selected appointment is Meera Nambiar (matching the screenshot)
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentItem | null>(INITIAL_APPOINTMENTS[0])

  // Walk-in and New Appointment Modal states
  const [showWalkinModal, setShowWalkinModal] = useState(false)
  const [newPatientName, setNewPatientName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newDoctor, setNewDoctor] = useState('Dr. Arun Kumar')
  const [newProcedure, setNewProcedure] = useState('Scaling & Polish')
  const [newTime, setNewTime] = useState('1:00 PM')

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      if (filterDentist !== 'All Dentists' && apt.doctor !== filterDentist) return false
      if (filterType !== 'All Appointment Types' && !apt.procedure.toLowerCase().includes(filterType.toLowerCase())) return false
      if (filterStatus !== 'All Statuses' && apt.status !== filterStatus) return false
      return true
    })
  }, [appointments, filterDentist, filterType, filterStatus])

  // Get initials for avatar circle
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ')
    if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    return name.slice(0, 2).toUpperCase()
  }

  // Handle consultation status toggle
  const handleStartConsultation = () => {
    if (!selectedAppointment) return
    const nextStatus = selectedAppointment.status === 'In Consultation' ? 'Completed' : 'In Consultation'
    setAppointments((prev) =>
      prev.map((apt) => (apt.id === selectedAppointment.id ? { ...apt, status: nextStatus } : apt))
    )
    setSelectedAppointment((prev) => (prev ? { ...prev, status: nextStatus } : null))
  }

  // Handle cancellation
  const handleCancelAppointment = () => {
    if (!selectedAppointment) return
    if (window.confirm(`Are you sure you want to cancel ${selectedAppointment.patientName}'s appointment?`)) {
      setAppointments((prev) =>
        prev.map((apt) => (apt.id === selectedAppointment.id ? { ...apt, status: 'Cancelled' } : apt))
      )
      setSelectedAppointment((prev) => (prev ? { ...prev, status: 'Cancelled' } : null))
    }
  }

  // Handle Reschedule
  const handleReschedule = () => {
    if (!selectedAppointment) return
    const newSlot = window.prompt('Enter new appointment time slot (e.g. 1:00 PM):', selectedAppointment.slotTime)
    if (newSlot && newSlot.trim()) {
      setAppointments((prev) =>
        prev.map((apt) => (apt.id === selectedAppointment.id ? { ...apt, slotTime: newSlot.trim(), startTime: newSlot.trim() } : apt))
      )
      setSelectedAppointment((prev) => (prev ? { ...prev, slotTime: newSlot.trim(), startTime: newSlot.trim() } : null))
    }
  }

  // Add Walk-in
  const handleSaveWalkin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPatientName.trim()) return

    const chair = newDoctor === 'Dr. Arun Kumar' ? 'Chair 1' : newDoctor === 'Dr. Priya Nair' ? 'Chair 2' : 'Chair 3'
    const newApt: AppointmentItem = {
      id: `apt-walkin-${Date.now()}`,
      patientName: newPatientName.trim(),
      patientId: `DM-${Math.floor(1000 + Math.random() * 9000)}`,
      phone: newPhone.trim() || '98765 43210',
      doctor: newDoctor,
      chair,
      procedure: newProcedure,
      procedureSub: newProcedure,
      session: 'Walk-in Consultation',
      startTime: newTime,
      endTime: '2:00 PM',
      duration: '45 min',
      status: 'Confirmed',
      theme: 'amber',
      notes: 'Direct clinic walk-in booking.',
      slotTime: newTime,
      date: currentDateString
    }

    setAppointments((prev) => [...prev, newApt])
    setSelectedAppointment(newApt)
    setShowWalkinModal(false)
    setNewPatientName('')
    setNewPhone('')
  }

  return (
    <div className="calendar-page-root" data-testid="appointments-calendar-page">
      {/* 1. Header Toolbar */}
      <header className="calendar-header-toolbar">
        <h1 className="calendar-heading-title">Appointments</h1>

        <div className="calendar-top-actions">
          <button
            type="button"
            className="btn-calendar-walkin"
            onClick={() => setShowWalkinModal(true)}
            aria-label="Register Walk-in Patient"
          >
            <UserCheck size={16} />
            <span>Walk-in</span>
          </button>

          <button
            type="button"
            className="btn-calendar-primary"
            onClick={() => navigate('/appointments/new')}
            aria-label="Create New Appointment"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>New Appointment</span>
          </button>
        </div>
      </header>

      {/* 2. Secondary Filter & Date Controls Bar */}
      <div className="calendar-controls-bar">
        <div className="calendar-controls-left">
          {/* Day / Week / Doctor-wise Segmented Switcher */}
          <div className="view-mode-tabs" role="tablist" aria-label="Calendar view selector">
            <button
              type="button"
              className={`view-mode-tab ${viewMode === 'Day' ? 'is-active' : ''}`}
              onClick={() => setViewMode('Day')}
            >
              Day
            </button>
            <button
              type="button"
              className={`view-mode-tab ${viewMode === 'Week' ? 'is-active' : ''}`}
              onClick={() => setViewMode('Week')}
            >
              Week
            </button>
            <button
              type="button"
              className={`view-mode-tab ${viewMode === 'Doctor-wise' ? 'is-active' : ''}`}
              onClick={() => setViewMode('Doctor-wise')}
            >
              Doctor-wise
            </button>
          </div>

          {/* Date Navigator */}
          <div className="date-nav-group">
            <button
              type="button"
              className="date-nav-btn"
              onClick={() => setCurrentDateString('Sun, 13 Apr 2025')}
              aria-label="Previous day"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              type="button"
              className="date-nav-picker"
              onClick={() => setCurrentDateString('Mon, 14 Apr 2025')}
            >
              <Calendar size={14} style={{ color: '#64748b' }} />
              <span>{currentDateString}</span>
            </button>

            <button
              type="button"
              className="date-nav-btn"
              onClick={() => setCurrentDateString('Tue, 15 Apr 2025')}
              aria-label="Next day"
            >
              <ChevronRight size={16} />
            </button>

            <button
              type="button"
              className="date-today-btn"
              onClick={() => setCurrentDateString('Mon, 14 Apr 2025')}
            >
              Today
            </button>
          </div>
        </div>

        {/* Filters Right */}
        <div className="calendar-controls-right">
          <div className="calendar-filter-dropdown">
            <select
              className="calendar-filter-select"
              value={filterDentist}
              onChange={(e) => setFilterDentist(e.target.value)}
              aria-label="Filter by Dentist"
            >
              <option value="All Dentists">All Dentists</option>
              <option value="Dr. Arun Kumar">Dr. Arun Kumar</option>
              <option value="Dr. Priya Nair">Dr. Priya Nair</option>
              <option value="Dr. Tariq Antoun">Dr. Tariq Antoun</option>
            </select>
            <ChevronDown size={14} />
          </div>

          <div className="calendar-filter-dropdown">
            <select
              className="calendar-filter-select"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              aria-label="Filter by Appointment Type"
            >
              <option value="All Appointment Types">All Appointment Types</option>
              <option value="Root Canal">Root Canal</option>
              <option value="Scaling & Polish">Scaling & Polish</option>
              <option value="Orthodontic">Orthodontic</option>
              <option value="Extraction">Extraction</option>
              <option value="Crown Seating">Crown Seating</option>
              <option value="Wisdom Tooth">Wisdom Tooth</option>
              <option value="Filling">Filling</option>
              <option value="Implant">Implant</option>
            </select>
            <ChevronDown size={14} />
          </div>

          <div className="calendar-filter-dropdown">
            <select
              className="calendar-filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              aria-label="Filter by Status"
            >
              <option value="All Statuses">All Statuses</option>
              <option value="Confirmed">Confirmed</option>
              <option value="In Consultation">In Consultation</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <ChevronDown size={14} />
          </div>
        </div>
      </div>

      {/* 3. Main Stage: Schedule Grid + Right Detail Drawer */}
      <div className="calendar-stage-layout">
        {/* Schedule Grid Table */}
        <div className="calendar-grid-container">
          <table className="calendar-grid-table">
            <thead>
              <tr>
                <th className="calendar-th-corner" aria-label="Time gutter" />
                {DOCTORS.map((doc) => {
                  if (filterDentist !== 'All Dentists' && doc.name !== filterDentist) return null
                  return (
                    <th key={doc.id} className="calendar-th-doctor">
                      <div className="th-doctor-name">{doc.name}</div>
                      <div className="th-doctor-chair">{doc.chair}</div>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((time) => (
                <tr key={time}>
                  <td className="calendar-time-cell">{time}</td>
                  {DOCTORS.map((doc) => {
                    if (filterDentist !== 'All Dentists' && doc.name !== filterDentist) return null

                    // Find appointment scheduled at this doctor + time slot
                    const apt = filteredAppointments.find(
                      (item) => item.doctor === doc.name && item.slotTime === time
                    )

                    return (
                      <td key={`${doc.id}-${time}`} className="calendar-slot-column">
                        {apt && (
                          <div
                            className={`calendar-appointment-card card-theme-${apt.theme} ${
                              selectedAppointment?.id === apt.id ? 'is-selected' : ''
                            }`}
                            onClick={() => setSelectedAppointment(apt)}
                            role="button"
                            tabIndex={0}
                            aria-label={`${apt.patientName}, ${apt.procedure}, ${apt.startTime} to ${apt.endTime}`}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') setSelectedAppointment(apt)
                            }}
                          >
                            <div className="card-patient-name">{apt.patientName}</div>
                            <div className="card-procedure-name">{apt.procedureSub}</div>
                            <div className="card-time-span">
                              {apt.startTime} – {apt.endTime}
                            </div>
                          </div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 4. Right Slide-out Drawer */}
        {selectedAppointment && (
          <aside className="calendar-detail-drawer" aria-label="Appointment details drawer">
            <div className="drawer-header">
              <div className="drawer-patient-badge">
                <div className="drawer-avatar-circle">
                  {getInitials(selectedAppointment.patientName)}
                </div>
                <div className="drawer-patient-info">
                  <div className="drawer-patient-name">{selectedAppointment.patientName}</div>
                  <div className="drawer-patient-meta">
                    {selectedAppointment.patientId} • {selectedAppointment.phone}
                  </div>
                  <span
                    className={`drawer-status-pill ${
                      selectedAppointment.status === 'In Consultation'
                        ? 'status-consulting'
                        : selectedAppointment.status === 'Cancelled'
                        ? 'status-cancelled'
                        : ''
                    }`}
                  >
                    {selectedAppointment.status}
                  </span>
                </div>
              </div>

              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setSelectedAppointment(null)}
                aria-label="Close details"
              >
                <X size={18} />
              </button>
            </div>

            <div className="drawer-body">
              <div className="drawer-info-list">
                <div className="drawer-info-item">
                  <CalendarDays size={16} className="drawer-info-icon" />
                  <div className="drawer-info-content">
                    <strong>{selectedAppointment.date}</strong>
                  </div>
                </div>

                <div className="drawer-info-item">
                  <Clock size={16} className="drawer-info-icon" />
                  <div className="drawer-info-content">
                    <strong>
                      {selectedAppointment.startTime} – {selectedAppointment.endTime} ({selectedAppointment.duration})
                    </strong>
                  </div>
                </div>

                <div className="drawer-info-item">
                  <UserRound size={16} className="drawer-info-icon" />
                  <div className="drawer-info-content">
                    <strong>{selectedAppointment.doctor}</strong>
                  </div>
                </div>

                <div className="drawer-info-item">
                  <Stethoscope size={16} className="drawer-info-icon" />
                  <div className="drawer-info-content">
                    <strong>{selectedAppointment.chair}</strong>
                  </div>
                </div>

                <div className="drawer-info-item">
                  <Activity size={16} className="drawer-info-icon" />
                  <div className="drawer-info-content">
                    <strong>{selectedAppointment.procedure}</strong>
                    <small>{selectedAppointment.session}</small>
                  </div>
                </div>
              </div>

              {/* Notes Box */}
              <div className="drawer-notes-section">
                <div className="drawer-notes-label">Notes</div>
                <div className="drawer-notes-box">{selectedAppointment.notes}</div>
              </div>

              {/* Action Buttons */}
              <div className="drawer-actions-container">
                <button
                  type="button"
                  className="btn-start-consultation"
                  onClick={handleStartConsultation}
                >
                  <Play size={15} fill="currentColor" />
                  <span>
                    {selectedAppointment.status === 'In Consultation'
                      ? 'Complete Consultation'
                      : 'Start Consultation'}
                  </span>
                </button>

                <div className="drawer-button-pair">
                  <button
                    type="button"
                    className="btn-drawer-secondary"
                    onClick={handleReschedule}
                  >
                    <Edit3 size={14} />
                    <span>Reschedule</span>
                  </button>

                  <button
                    type="button"
                    className="btn-drawer-secondary btn-cancel-appt"
                    onClick={handleCancelAppointment}
                  >
                    <XCircle size={14} />
                    <span>Cancel</span>
                  </button>
                </div>

                <button
                  type="button"
                  className="btn-drawer-profile"
                  onClick={() => navigate('/patients/list')}
                >
                  <User size={15} />
                  <span>Open Patient Profile</span>
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* 5. Walk-in Registration Modal */}
      {showWalkinModal && (
        <div className="calendar-modal-backdrop" onClick={() => setShowWalkinModal(false)}>
          <div className="calendar-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="calendar-modal-header">
              <h3>Register Walk-in Patient</h3>
              <button
                type="button"
                className="drawer-close-btn"
                onClick={() => setShowWalkinModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveWalkin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="calendar-form-group">
                <label>Patient Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Haris Varma"
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="calendar-form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  placeholder="e.g. 98450 12345"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
              </div>

              <div className="calendar-form-group">
                <label>Doctor & Chair</label>
                <select value={newDoctor} onChange={(e) => setNewDoctor(e.target.value)}>
                  <option value="Dr. Arun Kumar">Dr. Arun Kumar (Chair 1)</option>
                  <option value="Dr. Priya Nair">Dr. Priya Nair (Chair 2)</option>
                  <option value="Dr. Tariq Antoun">Dr. Tariq Antoun (Chair 3)</option>
                </select>
              </div>

              <div className="calendar-form-group">
                <label>Procedure / Visit Type</label>
                <select value={newProcedure} onChange={(e) => setNewProcedure(e.target.value)}>
                  <option value="Emergency Toothache">Emergency Toothache</option>
                  <option value="Scaling & Polish">Scaling & Polish</option>
                  <option value="Consultation & Diagnosis">Consultation & Diagnosis</option>
                  <option value="Extraction">Extraction</option>
                </select>
              </div>

              <div className="calendar-form-group">
                <label>Immediate Time Slot</label>
                <select value={newTime} onChange={(e) => setNewTime(e.target.value)}>
                  <option value="1:00 PM">1:00 PM</option>
                  <option value="12:30 PM">12:30 PM</option>
                  <option value="11:30 AM">11:30 AM</option>
                  <option value="9:30 AM">9:30 AM</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn-drawer-secondary"
                  onClick={() => setShowWalkinModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-calendar-primary">
                  Confirm Walk-in
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default CalendarPage
