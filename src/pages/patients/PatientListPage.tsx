import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, UserRound, AlertTriangle, ShieldCheck, Calendar, ArrowRight, Phone } from 'lucide-react'
import { useClinicData, type PatientRecord } from '@/services/clinicStore'
import './patientProfile.css'

export const PatientListPage: React.FC = () => {
  const navigate = useNavigate()
  const { patients, appointments } = useClinicData()
  const [query, setQuery] = useState('')
  const [genderFilter, setGenderFilter] = useState<'all' | 'female' | 'male'>('all')
  const [alertsOnly, setAlertsOnly] = useState(false)

  // Map appointments to patients for quick Next/Last visit lookup
  const patientVisitMap = useMemo(() => {
    const map = new Map<string, { nextAppt?: string; lastVisit?: string }>()
    const today = new Date().toISOString().slice(0, 10)

    for (const appt of appointments) {
      if (appt.status === 'cancelled') continue
      const current = map.get(appt.patientId) || {}
      if (appt.date >= today) {
        if (!current.nextAppt || appt.date < current.nextAppt) {
          current.nextAppt = `${appt.date} (${appt.time})`
        }
      } else {
        if (!current.lastVisit || appt.date > current.lastVisit) {
          current.lastVisit = appt.date
        }
      }
      map.set(appt.patientId, current)
    }
    return map
  }, [appointments])

  // Filtered patients
  const filtered = useMemo(() => {
    return patients.filter((patient) => {
      // 1. Text Search (name, phone, patient ID, city)
      const q = query.trim().toLowerCase()
      if (q) {
        const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase()
        const match =
          fullName.includes(q) ||
          patient.id.toLowerCase().includes(q) ||
          patient.mobile.includes(q) ||
          (patient.city && patient.city.toLowerCase().includes(q))
        if (!match) return false
      }

      // 2. Gender Filter
      if (genderFilter !== 'all') {
        if ((patient.gender || '').toLowerCase() !== genderFilter) return false
      }

      // 3. Alerts Filter
      if (alertsOnly) {
        const hasAllergy = patient.allergies === 'yes' && Boolean(patient.allergiesDetails)
        const hasCondition = patient.conditions === 'yes' && Boolean(patient.conditionsDetails)
        if (!hasAllergy && !hasCondition) return false
      }

      return true
    })
  }, [patients, query, genderFilter, alertsOnly])

  const getInitials = (p: PatientRecord) => {
    const f = (p.firstName || '').charAt(0)
    const l = (p.lastName || '').charAt(0)
    return (f + l).toUpperCase() || 'PT'
  }

  return (
    <section className="clinic-record-page pat-profile-page" data-testid="feature-page-pat.list">
      {/* 1. Header per Section 3 Specification */}
      <header className="clinic-record-header" style={{ marginBottom: '4px' }}>
        <div>
          <span className="clinic-record-eyebrow">PATIENTS</span>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '2px 0 4px 0' }}>Patients</h1>
          <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '14px' }}>
            Manage patient records and access clinical information.
          </p>
        </div>
      </header>

      {/* 2. Search & Filtering Controls */}
      <div className="pat-filter-bar">
        <div className="pat-search-wrap">
          <Search size={16} className="pat-search-icon" />
          <input
            className="pat-search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by patient name, phone, or patient ID..."
            aria-label="Search patients"
          />
        </div>

        <div className="pat-filter-chips">
          <button
            type="button"
            className={`pat-chip ${genderFilter === 'all' && !alertsOnly ? 'is-active' : ''}`}
            onClick={() => {
              setGenderFilter('all')
              setAlertsOnly(false)
            }}
          >
            All ({patients.length})
          </button>

          <button
            type="button"
            className={`pat-chip ${genderFilter === 'female' ? 'is-active' : ''}`}
            onClick={() => setGenderFilter(genderFilter === 'female' ? 'all' : 'female')}
          >
            Female
          </button>

          <button
            type="button"
            className={`pat-chip ${genderFilter === 'male' ? 'is-active' : ''}`}
            onClick={() => setGenderFilter(genderFilter === 'male' ? 'all' : 'male')}
          >
            Male
          </button>

          <button
            type="button"
            className={`pat-chip is-alert ${alertsOnly ? 'is-active' : ''}`}
            onClick={() => setAlertsOnly(!alertsOnly)}
          >
            <AlertTriangle size={13} />
            <span>Medical Alerts Only</span>
          </button>
        </div>
      </div>

      {/* 3. Patients Table */}
      {filtered.length > 0 ? (
        <div className="pat-table-container">
          <table className="pat-table" aria-label="Patients directory">
            <thead>
              <tr>
                <th style={{ width: '120px' }}>Patient ID</th>
                <th>Patient Name</th>
                <th>Phone Number</th>
                <th>Age / Gender</th>
                <th>Medical Alerts</th>
                <th>Visit Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((patient) => {
                const visits = patientVisitMap.get(patient.id)
                const hasAllergy = patient.allergies === 'yes' && Boolean(patient.allergiesDetails)
                const hasCondition = patient.conditions === 'yes' && Boolean(patient.conditionsDetails)
                const alertText = [
                  hasAllergy ? patient.allergiesDetails : null,
                  hasCondition ? patient.conditionsDetails : null
                ].filter(Boolean).join(', ')

                return (
                  <tr
                    key={patient.id}
                    className="pat-row"
                    onClick={() => navigate(`/patients/${patient.id}`)}
                  >
                    <td>
                      <span className="pat-id-pill">{patient.id}</span>
                    </td>

                    <td>
                      <div className="pat-cell-user">
                        <span className="pat-avatar">{getInitials(patient)}</span>
                        <div className="pat-user-info">
                          <Link
                            to={`/patients/${patient.id}`}
                            className="pat-user-name"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {patient.firstName} {patient.lastName}
                          </Link>
                          <span className="pat-user-sub">
                            {patient.city || 'Kochi'} {patient.email && `· ${patient.email}`}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Phone size={13} style={{ color: 'var(--text-muted, #64748b)' }} />
                        <span>{patient.countryCode} {patient.mobile}</span>
                      </span>
                    </td>

                    <td>
                      <span style={{ textTransform: 'capitalize' }}>
                        {patient.age ? `${patient.age} yrs` : patient.dateOfBirth || '—'} · {patient.gender || '—'}
                      </span>
                    </td>

                    <td>
                      {alertText ? (
                        <span className="pat-alert-tag" title={alertText}>
                          <AlertTriangle size={12} />
                          <span>{alertText.length > 26 ? `${alertText.slice(0, 26)}…` : alertText}</span>
                        </span>
                      ) : (
                        <span className="pat-clear-tag">
                          <ShieldCheck size={12} />
                          <span>No alerts</span>
                        </span>
                      )}
                    </td>

                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px' }}>
                        {visits?.nextAppt ? (
                          <span style={{ color: 'var(--teal-primary, #0b8185)', fontWeight: 600 }}>
                            Next: {visits.nextAppt}
                          </span>
                        ) : visits?.lastVisit ? (
                          <span style={{ color: 'var(--text-muted, #64748b)' }}>
                            Last visit: {visits.lastVisit}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted, #94a3b8)' }}>No prior visits</span>
                        )}
                      </div>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <Link
                        className="pat-action-btn"
                        to={`/patients/${patient.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span>Open Profile</span>
                        <ArrowRight size={13} />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* 4. Empty State (No duplicate Add Patient button per Section 3 requirements) */
        <div className="clinic-record-empty" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <span style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'var(--surface-subtle, #f1f5f9)', color: 'var(--teal-primary, #0b8185)', marginBottom: '12px' }}>
            <UserRound size={32} />
          </span>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 6px 0' }}>
            {query ? 'No matching patients found' : 'No patient records yet'}
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '14px', maxWidth: '440px', marginLeft: 'auto', marginRight: 'auto' }}>
            {query
              ? 'Try adjusting your search criteria, phone number, or patient ID.'
              : 'Registered patients from the Clinic Dashboard and clinic appointments will appear here.'}
          </p>
        </div>
      )}
    </section>
  )
}

export default PatientListPage
