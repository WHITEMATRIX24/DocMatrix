import { canClinic, getPermissionUser } from '@/services/permissions'
import React, { useMemo, useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Stethoscope, CheckCircle2, AlertTriangle, Layers, Save, UserRound, ArrowRight } from 'lucide-react'
import {
  useClinicData,
  saveToothConditionForPatient,
  getToothConditionsForPatient,
  type ToothConditionType
} from '@/services/clinicStore'
import './patientProfile.css'
import './toothChart.css'
import { apiClient } from '@/services/apiClient'
import { hasAuthToken } from '@/services/clinicStore'
import { ToothChart } from './ToothChart'

type ConditionType = 'Healthy' | 'Caries' | 'Restored' | 'Missing' | 'Crown' | 'RCT'

// Five standard tooth surfaces used in odontogram notation
const TOOTH_SURFACES = ['Buccal', 'Lingual', 'Mesial', 'Distal', 'Occlusal'] as const
type ToothSurface = typeof TOOTH_SURFACES[number]

export const ToothChartPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const canWrite = canClinic(getPermissionUser(), 'clinical.write')
  const { patients = [], clinicalNotes = [], toothCharts = {} } = useClinicData()

  // Select patient
  const patient = useMemo(() => {
    if (!id) return null
    const matches = patients.filter((p) => [p.id, p.backendId].some(value => value?.toLowerCase() === id.toLowerCase()))
    return matches.length === 1 ? matches[0] : null
  }, [patients, id])

  const effectivePatientId = patient?.id || ''

  // Interactive tooth conditions state synced with store
  const [conditions, setConditions] = useState<Record<number, { condition: ConditionType; notes?: string }>>(() => {
    return getToothConditionsForPatient(effectivePatientId) as Record<number, { condition: ConditionType; notes?: string }>
  })

  // Keep state updated if patient changes or toothCharts sync from backend
  useEffect(() => {
    setConditions(getToothConditionsForPatient(effectivePatientId) as Record<number, { condition: ConditionType; notes?: string }>)
  }, [effectivePatientId, toothCharts])

  const [selectedTooth, setSelectedTooth] = useState<number | null>(null)
  const [activeCondition, setActiveCondition] = useState<ConditionType>('Healthy')
  const [toothNote, setToothNote] = useState('')

  // Dentition mode — adult (32 teeth) or primary (20 teeth)
  const [dentitionMode, setDentitionMode] = useState<'adult' | 'primary'>('adult')

  // UI-only surface selection — informational, not persisted separately
  const [selectedSurface, setSelectedSurface] = useState<ToothSurface | null>(null)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [history, setHistory] = useState<any[]>([])
  const [historyVersion, setHistoryVersion] = useState(0)
  const [historyError, setHistoryError] = useState('')
  useEffect(() => {
    setSelectedTooth(null); setToothNote(''); setActiveCondition('Healthy'); setSelectedSurface(null); setSaveError('')
  }, [effectivePatientId])
  useEffect(() => {
    let active = true
    setHistory([]); setHistoryError('')
    if (effectivePatientId && hasAuthToken()) apiClient.get<any[]>(`/patients/${encodeURIComponent(effectivePatientId)}/tooth-chart/history`)
      .then(rows => { if (active) setHistory(rows) })
      .catch(() => { if (active) setHistoryError('Recorded chart history could not be loaded.') })
    return () => { active = false }
  }, [effectivePatientId, historyVersion])

  const selectTooth = (num: number) => {
    setSelectedTooth(num)
    setSelectedSurface(null)
    const existing = conditions[num]
    if (existing) {
      setActiveCondition(existing.condition)
      setToothNote(existing.notes || '')
    } else {
      setActiveCondition('Healthy')
      setToothNote('')
    }
  }

  const applyCondition = async () => {
    if (!patient || !selectedTooth || saving || !canWrite) return
    // Optionally prepend selected surface to notes as context
    const surfacePrefix = selectedSurface ? `[${selectedSurface}] ` : ''
    const finalNote = selectedSurface && toothNote && !toothNote.startsWith(`[${selectedSurface}]`)
      ? `${surfacePrefix}${toothNote}`
      : toothNote
    setSaving(true); setSaveError('');
    try {
    await saveToothConditionForPatient(
      effectivePatientId,
      selectedTooth,
      activeCondition as ToothConditionType,
      finalNote
    )
    setHistoryVersion(v => v + 1)
    } catch (error: any) { setSaveError(error.message || 'Tooth chart was not saved. Please retry.') }
    finally { setSaving(false) }
  }

  if (!patient) return (
    <section role="alert" className="clinic-record-page">
      <h1>Patient not found</h1>
      <p>Open a patient record before editing their tooth chart.</p>
      <Link to="/patients">Return to patients</Link>
    </section>
  )

  return (
    <section className="clinic-record-page pat-profile-page" data-testid="feature-page-pat.toothchart">
      {saveError && <p role="alert">{saveError}</p>}
      {!canWrite && <p>This chart is read-only for your role. A verified practitioner can record changes.</p>}
      {/* Back button */}
      <div>
        <Link
          className="clinic-record-back"
          to={patient ? `/patients/${patient.id}` : '/clinical'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--teal-primary, #0b8185)', textDecoration: 'none', fontWeight: 500 }}
        >
          <ArrowLeft size={14} />
          <span>{patient ? `Back to ${patient.firstName}'s Profile` : 'Back to Clinical'}</span>
        </Link>
      </div>

      {/* Header */}
      <header className="clinic-record-header" style={{ marginBottom: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <span className="clinic-record-eyebrow">CLINICAL DENTAL CHARTING</span>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '2px 0 4px 0' }}>
              Dental Chart &amp; Odontogram
            </h1>
            <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '14px' }}>
              Full-arch adult FDI odontogram charting conditions, restorations, endodontics, and prosthetics.
            </p>
          </div>

          {patient && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--surface, #ffffff)', padding: '8px 14px', borderRadius: '10px', border: '1px solid var(--line, #e2e8f0)' }}>
              <UserRound size={18} style={{ color: 'var(--teal-primary, #0b8185)' }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{patient.firstName} {patient.lastName}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>ID: {patient.id}</div>
              </div>
              <Link
                to={`/clinical/notes?patientId=${patient.id}`}
                className="pat-btn pat-btn-secondary"
                style={{ padding: '4px 10px', fontSize: '12px', marginLeft: '6px' }}
              >
                <span>Clinical Notes</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Odontogram Canvas */}
      <div className="pat-card" style={{ background: 'var(--surface, #ffffff)', padding: '24px' }}>
        {/* Card header with title and legend */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--line, #e2e8f0)', paddingBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>
            Interactive FDI {dentitionMode === 'adult' ? 'Adult Arch (32 Teeth)' : 'Primary Dentition (20 Teeth)'}
          </h3>
          <div className="odo-legend">
            <span className="odo-legend-item"><span className="odo-legend-dot" style={{ background: '#ffffff', border: '1.5px solid #cbd5e1' }} /> Healthy</span>
            <span className="odo-legend-item"><span className="odo-legend-dot" style={{ background: '#dc2626' }} /> Caries</span>
            <span className="odo-legend-item"><span className="odo-legend-dot" style={{ background: '#2563eb' }} /> Restored</span>
            <span className="odo-legend-item"><span className="odo-legend-dot" style={{ background: '#7c3aed' }} /> RCT</span>
            <span className="odo-legend-item"><span className="odo-legend-dot" style={{ background: '#d97706' }} /> Crown</span>
            <span className="odo-legend-item"><span className="odo-legend-dot" style={{ background: '#94a3b8' }} /> Missing</span>
          </div>
        </div>

        {/* Anatomical SVG Odontogram */}
        <ToothChart
          conditions={conditions}
          selectedTooth={selectedTooth}
          onToothSelect={selectTooth}
          dentitionMode={dentitionMode}
          onDentitionChange={setDentitionMode}
        />
      </div>

      {/* Selected Tooth Inspector & Editor */}
      {selectedTooth && (
        <div className="pat-card" style={{ background: 'var(--surface, #ffffff)', marginTop: '8px' }}>
          <div className="pat-card-head">
            <h3>
              <Layers size={16} />
              <span>Tooth #{selectedTooth} Clinical Inspector</span>
            </h3>
            <span className="pat-badge is-primary">FDI #{selectedTooth}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', alignItems: 'start' }}>
            {/* Condition chips */}
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Condition / Treatment Status
              </label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(['Healthy', 'Caries', 'Restored', 'RCT', 'Crown', 'Missing'] as ConditionType[]).map((cond) => (
                  <button
                    key={cond}
                    type="button"
                    className={`pat-chip ${activeCondition === cond ? 'is-active' : ''}`}
                    onClick={() => setActiveCondition(cond)}
                  >
                    {cond}
                  </button>
                ))}
              </div>
            </div>

            {/* Surface selector — UI only, informational */}
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Tooth Surface <span style={{ fontWeight: 400, color: 'var(--text-muted, #64748b)', fontSize: '11px' }}>(informational)</span>
              </label>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {TOOTH_SURFACES.map((surface) => (
                  <button
                    key={surface}
                    type="button"
                    className={`odo-surface-btn${selectedSurface === surface ? ' is-selected' : ''}`}
                    onClick={() => setSelectedSurface(selectedSurface === surface ? null : surface)}
                  >
                    {surface}
                  </button>
                ))}
              </div>
              {selectedSurface && (
                <p style={{ margin: '6px 0 0', fontSize: '11.5px', color: 'var(--text-muted, #64748b)' }}>
                  Surface prefix will be prepended to notes on Apply.
                </p>
              )}
            </div>

            {/* Notes input + Apply */}
            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Clinical Findings &amp; Notes
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  className="pat-form-input"
                  style={{ flex: 1 }}
                  placeholder="e.g. Occlusal pit and fissure decay..."
                  value={toothNote}
                  onChange={(e) => setToothNote(e.target.value)}
                />
                <button
                  type="button"
                  className="pat-btn pat-btn-primary"
                  onClick={applyCondition} disabled={saving || !canWrite}
                  style={{ padding: '6px 14px' }}
                >
                  <Save size={13} /> Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <section aria-label="Recorded tooth chart history" style={{ marginTop: 24 }}>
        <h2>Recorded chart history</h2>
        {historyError ? <p role="alert">{historyError}</p> : history.length ? <ol>{history.map(event => <li key={event.id}>
          <strong>{new Date(event.createdAt).toLocaleString()}</strong> · {event.actorName}
          <ul>{event.metadata?.changes?.map((change: any) => <li key={change.toothNumber}>
            Tooth {change.toothNumber}: {change.before?.condition || 'Not recorded'} → {change.after.condition}
            {change.after.notes && <p>{change.after.notes}</p>}
          </li>)}</ul>
        </li>)}</ol> : <p>No recorded changes yet. Earlier chart history was not captured.</p>}
      </section>
    </section>
  )
}

export default ToothChartPage
