import React, { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Phone, Search } from 'lucide-react'
import { useClinicData, type PatientRecord } from '@/services/clinicStore'
import './patientProfile.css'

type PatientSort = 'recent' | 'name' | 'id'

const PAGE_SIZE = 10

export const PatientListPage: React.FC = () => {
  const navigate = useNavigate()
  const { patients, appointments } = useClinicData()
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<PatientSort>('recent')
  const [currentPage, setCurrentPage] = useState(1)

  const patientVisitMap = useMemo(() => {
    const map = new Map<string, string>()
    const today = new Date().toISOString().slice(0, 10)

    for (const appointment of appointments) {
      if (
        appointment.status === 'cancelled' ||
        (appointment.date >= today && appointment.status !== 'completed')
      ) continue
      const patientId = appointment.patientId.toLowerCase()
      const lastVisit = map.get(patientId)
      if (!lastVisit || appointment.date > lastVisit) {
        map.set(patientId, appointment.date)
      }
    }

    return map
  }, [appointments])

  const filteredPatients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const matchingPatients = patients.filter((patient) => {
      if (!normalizedQuery) return true

      const fullName = `${patient.firstName} ${patient.lastName}`.toLowerCase()
      return (
        fullName.includes(normalizedQuery) ||
        patient.id.toLowerCase().includes(normalizedQuery) ||
        `${patient.countryCode} ${patient.mobile}`.toLowerCase().includes(normalizedQuery) ||
        (patient.city || '').toLowerCase().includes(normalizedQuery)
      )
    })

    return matchingPatients.sort((first, second) => {
      if (sort === 'name') {
        return `${first.firstName} ${first.lastName}`.localeCompare(`${second.firstName} ${second.lastName}`)
      }
      if (sort === 'id') {
        return first.id.localeCompare(second.id, undefined, { numeric: true, sensitivity: 'base' })
      }

      const firstVisit = patientVisitMap.get(first.id.toLowerCase())
      const secondVisit = patientVisitMap.get(second.id.toLowerCase())
      if (!firstVisit && !secondVisit) return 0
      if (!firstVisit) return 1
      if (!secondVisit) return -1
      return secondVisit.localeCompare(firstVisit)
    })
  }, [patients, patientVisitMap, query, sort])

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / PAGE_SIZE))
  const page = Math.min(currentPage, totalPages)
  const firstItem = filteredPatients.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const lastItem = Math.min(page * PAGE_SIZE, filteredPatients.length)
  const pagePatients = filteredPatients.slice(firstItem === 0 ? 0 : firstItem - 1, lastItem)

  const getInitials = (patient: PatientRecord) => {
    const first = (patient.firstName || '').charAt(0)
    const last = (patient.lastName || '').charAt(0)
    return (first + last).toUpperCase() || 'PT'
  }

  const openPatientProfile = (patientId: string) => {
    navigate(`/patients/${patientId}`)
  }

  return (
    <section className="clinic-record-page pat-profile-page pat-list-page" data-testid="feature-page-pat.list">
      <header className="pat-list-header">
        <div>
          <h1>Patients</h1>
          <p>{patients.length} registered {patients.length === 1 ? 'patient' : 'patients'}</p>
        </div>
        <Link className="pat-list-register" to="/patients/new">Register patient</Link>
      </header>

      <div className="pat-list-toolbar">
        <div className="pat-list-search">
          <Search size={17} aria-hidden="true" />
          <label className="pat-list-sr-only" htmlFor="patient-list-search">Search patients</label>
          <input
            id="patient-list-search"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setCurrentPage(1)
            }}
            placeholder="Search by name, patient ID or phone"
          />
        </div>
        <div className="pat-list-select-wrap">
          <label className="pat-list-sr-only" htmlFor="patient-list-sort">Sort patients</label>
          <select
            id="patient-list-sort"
            value={sort}
            onChange={(event) => {
              const nextSort = event.target.value
              if (nextSort === 'recent' || nextSort === 'name' || nextSort === 'id') {
                setSort(nextSort)
                setCurrentPage(1)
              }
            }}
          >
            <option value="recent">Recent visit</option>
            <option value="name">Name A–Z</option>
            <option value="id">Patient ID</option>
          </select>
        </div>
      </div>

      <div className="pat-list-card">
        {pagePatients.length > 0 ? (
          <div className="pat-list-table-scroll">
            <table className="pat-list-table" aria-label="Patients directory">
              <thead>
                <tr>
                  <th scope="col">Patient</th>
                  <th scope="col">Phone</th>
                  <th scope="col">Last visit</th>
                </tr>
              </thead>
              <tbody>
                {pagePatients.map((patient) => (
                  <tr
                    className="pat-list-row"
                    key={patient.id}
                    tabIndex={0}
                    onClick={() => openPatientProfile(patient.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        openPatientProfile(patient.id)
                      }
                    }}
                  >
                    <td>
                      <div className="pat-list-patient-cell">
                        <span className="pat-list-avatar" aria-hidden="true">{getInitials(patient)}</span>
                        <span className="pat-list-patient-copy">
                          <Link
                            className="pat-list-patient-name"
                            to={`/patients/${patient.id}`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            {patient.firstName} {patient.lastName}
                          </Link>
                          <span className="pat-list-patient-id">{patient.id}</span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="pat-list-phone">
                        <Phone size={14} aria-hidden="true" />
                        {patient.countryCode} {patient.mobile}
                      </span>
                    </td>
                    <td>{patientVisitMap.get(patient.id.toLowerCase()) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="pat-list-empty" role="status">
            <h2>No patients found</h2>
            <p>No patients found. Try a different name, ID or phone number.</p>
          </div>
        )}

        <footer className="pat-list-pagination">
          <span>Showing {firstItem}–{lastItem} of {filteredPatients.length}</span>
          <div className="pat-list-pagination-actions">
            <button
              type="button"
              onClick={() => setCurrentPage((previous) => Math.max(1, previous - 1))}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} aria-hidden="true" />
              Previous
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage((previous) => Math.min(totalPages, previous + 1))}
              disabled={page >= totalPages}
              aria-label="Next page"
            >
              Next
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>
        </footer>
      </div>
    </section>
  )
}

export default PatientListPage
