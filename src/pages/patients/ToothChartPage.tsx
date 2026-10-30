import React, { useMemo, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Stethoscope, CheckCircle2, AlertTriangle, Layers, Save, UserRound, ArrowRight } from 'lucide-react'
import { useClinicData } from '@/services/clinicStore'
import './patientProfile.css'

// Adult Dentition FDI Quadrants
const QUADRANTS = {
  upperRight: [18, 17, 16, 15, 14, 13, 12, 11],
  upperLeft: [21, 22, 23, 24, 25, 26, 27, 28],
  lowerRight: [48, 47, 46, 45, 44, 43, 42, 41],
  lowerLeft: [31, 32, 33, 34, 35, 36, 37, 38]
}

type ConditionType = 'Healthy' | 'Caries' | 'Restored' | 'Missing' | 'Crown' | 'RCT'

export const ToothChartPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { patients = [], clinicalNotes = [] } = useClinicData()

  // Select patient
  const patient = useMemo(() => {
    if (!id) return patients[0] || null
    return patients.find((p) => p.id.toLowerCase() === id.toLowerCase()) || patients[0] || null
  }, [patients, id])

  // Interactive tooth conditions state
  const [conditions, setConditions] = useState<Record<number, { condition: ConditionType; notes?: string }>>({
    46: { condition: 'RCT', notes: 'Pulpitis. Second sitting RCT underway. Bio-mechanical preparation completed.' },
    36: { condition: 'Caries', notes: 'Occlusal pit and fissure caries. Composite restoration recommended.' },
    16: { condition: 'Restored', notes: 'Occlusal composite restoration placed 2025.' },
    24: { condition: 'Healthy', notes: 'Normal vitality and intact margins.' }
  })

  const [selectedTooth, setSelectedTooth] = useState<number | null>(46)
  const [activeCondition, setActiveCondition] = useState<ConditionType>('RCT')
  const [toothNote, setToothNote] = useState('Pulpitis. Second sitting RCT underway.')

  const selectTooth = (num: number) => {
    setSelectedTooth(num)
    const existing = conditions[num]
    if (existing) {
      setActiveCondition(existing.condition)
      setToothNote(existing.notes || '')
    } else {
      setActiveCondition('Healthy')
      setToothNote('')
    }
  }

  const applyCondition = () => {
    if (!selectedTooth) return
    setConditions((prev) => ({
      ...prev,
      [selectedTooth]: {
        condition: activeCondition,
        notes: toothNote
      }
    }))
  }

  const getToothColor = (num: number) => {
    const c = conditions[num]?.condition
    switch (c) {
      case 'Caries':
        return '#dc2626'
      case 'Restored':
        return '#2563eb'
      case 'Missing':
        return '#94a3b8'
      case 'Crown':
        return '#d97706'
      case 'RCT':
        return '#7c3aed'
      case 'Healthy':
      default:
        return '#059669'
    }
  }

  return (
    <section className="clinic-record-page pat-profile-page" data-testid="feature-page-pat.toothchart">
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
              Dental Chart & Odontogram
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

      {/* Odontogram Canvas & Quadrants */}
      <div className="pat-card" style={{ background: 'var(--surface, #ffffff)', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--line, #e2e8f0)', paddingBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>Interactive FDI Adult Arch (32 Teeth)</h3>
          <div style={{ display: 'flex', gap: '10px', fontSize: '12px', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#059669' }} /> Healthy
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#dc2626' }} /> Caries
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#2563eb' }} /> Restored
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#7c3aed' }} /> RCT
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#d97706' }} /> Crown
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#94a3b8' }} /> Missing
            </span>
          </div>
        </div>

        {/* Upper Arch */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted, #64748b)', textAlign: 'center', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Maxillary Arch (Upper)
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', overflowX: 'auto', padding: '8px 0' }}>
            {/* Quadrant 1: Upper Right */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {QUADRANTS.upperRight.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => selectTooth(num)}
                  style={{
                    width: '38px',
                    height: '52px',
                    borderRadius: '8px',
                    border: selectedTooth === num ? '2px solid var(--teal-primary, #0b8185)' : '1px solid var(--line, #cbd5e1)',
                    background: selectedTooth === num ? 'rgba(11, 129, 133, 0.08)' : 'var(--surface-subtle, #f8fafc)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 2px',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease'
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>{num}</span>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: getToothColor(num) }} />
                </button>
              ))}
            </div>

            <div style={{ width: '2px', background: 'var(--line, #cbd5e1)', height: '52px' }} />

            {/* Quadrant 2: Upper Left */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {QUADRANTS.upperLeft.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => selectTooth(num)}
                  style={{
                    width: '38px',
                    height: '52px',
                    borderRadius: '8px',
                    border: selectedTooth === num ? '2px solid var(--teal-primary, #0b8185)' : '1px solid var(--line, #cbd5e1)',
                    background: selectedTooth === num ? 'rgba(11, 129, 133, 0.08)' : 'var(--surface-subtle, #f8fafc)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 2px',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease'
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>{num}</span>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: getToothColor(num) }} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Midline horizontal divider */}
        <div style={{ borderTop: '2px dashed var(--line, #e2e8f0)', margin: '16px 0' }} />

        {/* Lower Arch */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', overflowX: 'auto', padding: '8px 0' }}>
            {/* Quadrant 4: Lower Right */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {QUADRANTS.lowerRight.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => selectTooth(num)}
                  style={{
                    width: '38px',
                    height: '52px',
                    borderRadius: '8px',
                    border: selectedTooth === num ? '2px solid var(--teal-primary, #0b8185)' : '1px solid var(--line, #cbd5e1)',
                    background: selectedTooth === num ? 'rgba(11, 129, 133, 0.08)' : 'var(--surface-subtle, #f8fafc)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 2px',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease'
                  }}
                >
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: getToothColor(num) }} />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>{num}</span>
                </button>
              ))}
            </div>

            <div style={{ width: '2px', background: 'var(--line, #cbd5e1)', height: '52px' }} />

            {/* Quadrant 3: Lower Left */}
            <div style={{ display: 'flex', gap: '6px' }}>
              {QUADRANTS.lowerLeft.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => selectTooth(num)}
                  style={{
                    width: '38px',
                    height: '52px',
                    borderRadius: '8px',
                    border: selectedTooth === num ? '2px solid var(--teal-primary, #0b8185)' : '1px solid var(--line, #cbd5e1)',
                    background: selectedTooth === num ? 'rgba(11, 129, 133, 0.08)' : 'var(--surface-subtle, #f8fafc)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 2px',
                    cursor: 'pointer',
                    transition: 'all 0.12s ease'
                  }}
                >
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: getToothColor(num) }} />
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>{num}</span>
                </button>
              ))}
            </div>
          </div>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted, #64748b)', textAlign: 'center', marginTop: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Mandibular Arch (Lower)
          </div>
        </div>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', alignItems: 'center' }}>
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

            <div>
              <label style={{ fontSize: '12.5px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Clinical Findings & Notes
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
                  onClick={applyCondition}
                  style={{ padding: '6px 14px' }}
                >
                  <Save size={13} /> Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default ToothChartPage
