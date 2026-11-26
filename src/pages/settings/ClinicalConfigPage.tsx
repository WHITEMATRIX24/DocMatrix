import React, { useState, useEffect, useMemo } from 'react'
import {
  Pill, Stethoscope, AlertTriangle, FileText, Plus,
  Search, Trash2, Sliders, RefreshCw, CheckCircle2, FileSpreadsheet, X
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { apiClient } from '@/services/apiClient'

// Master Prescription Medicines (Formulary)
interface MasterMedicine {
  id: string
  name: string
  category: string
  route: string
  frequency: string
  duration: string
  instructions: string
  isCustom?: boolean
}

const DEFAULT_MEDICINES: MasterMedicine[] = [
  { id: 'm1', name: 'Amoxicillin 500mg', category: 'Antibiotic', route: 'Oral', frequency: 'TDS (Thrice daily)', duration: '5 days', instructions: 'After meals with water' },
  { id: 'm2', name: 'Amoxicillin + Clavulanate 625mg (Augmentin)', category: 'Antibiotic', route: 'Oral', frequency: 'BD (Twice daily)', duration: '5 days', instructions: 'After meals' },
  { id: 'm3', name: 'Metronidazole 400mg', category: 'Antibiotic (Anaerobic)', route: 'Oral', frequency: 'TDS (Thrice daily)', duration: '5 days', instructions: 'Avoid alcohol during course' },
  { id: 'm4', name: 'Ibuprofen 400mg + Paracetamol 325mg (Combiflam)', category: 'Analgesic / Anti-inflammatory', route: 'Oral', frequency: 'SOS / TDS', duration: '3 days', instructions: 'Take strictly after meals' },
  { id: 'm5', name: 'Ketorolac Tromethamine 10mg (Ketorol-DT)', category: 'NSAID (Acute Dental Pain)', route: 'Oral / Dispersible', frequency: 'SOS / Max TDS', duration: '2 days', instructions: 'Dissolve in water, post meals' },
  { id: 'm6', name: 'Aceclofenac 100mg + Paracetamol 325mg + Serratiopeptidase 15mg', category: 'Analgesic & Anti-edema', route: 'Oral', frequency: 'BD (Twice daily)', duration: '3 days', instructions: 'For post-op swelling and pain' },
  { id: 'm7', name: 'Pantoprazole 40mg', category: 'Antacid / PPI', route: 'Oral', frequency: 'OD (Once daily)', duration: '5 days', instructions: '30 mins before breakfast' },
  { id: 'm8', name: 'Chlorhexidine Gluconate 0.2% Mouthwash', category: 'Antiseptic Rinse', route: 'Topical Rinse', frequency: 'BD (Twice daily)', duration: '14 days', instructions: 'Rinse undiluted for 60 seconds' },
  { id: 'm9', name: 'Triamcinolone Acetonide 0.1% Oral Paste', category: 'Corticosteroid (Ulcer)', route: 'Topical Application', frequency: 'TDS', duration: '5 days', instructions: 'Apply after meals and before bed' },
  { id: 'm10', name: 'Tranexamic Acid 500mg', category: 'Hemostatic', route: 'Oral', frequency: 'TDS', duration: '2 days', instructions: 'For prolonged post-extraction oozing' }
]

// Master Clinical Procedures
interface MasterProcedure {
  id: string
  code: string
  name: string
  category: string
  estMinutes: number
  fee: string
  isCustom?: boolean
}

const DEFAULT_PROCEDURES: MasterProcedure[] = [
  { id: 'p1', code: 'D0120', name: 'Periodic Oral Evaluation', category: 'Diagnostic', estMinutes: 20, fee: '₹300' },
  { id: 'p2', code: 'D0150', name: 'Comprehensive Oral Examination', category: 'Diagnostic', estMinutes: 30, fee: '₹500' },
  { id: 'p3', code: 'D0220', name: 'Intraoral Periapical X-Ray (IOPA)', category: 'Radiology', estMinutes: 10, fee: '₹200' },
  { id: 'p4', code: 'D1110', name: 'Full Mouth Scaling & Polishing', category: 'Preventive', estMinutes: 45, fee: '₹1,500' },
  { id: 'p5', code: 'D2391', name: 'Composite Resin Restoration (1 Surface)', category: 'Restorative', estMinutes: 40, fee: '₹1,200' },
  { id: 'p6', code: 'D2392', name: 'Composite Resin Restoration (2 Surfaces)', category: 'Restorative', estMinutes: 50, fee: '₹1,800' },
  { id: 'p7', code: 'D3310', name: 'Root Canal Therapy - Anterior Tooth', category: 'Endodontics', estMinutes: 60, fee: '₹3,500' },
  { id: 'p8', code: 'D3320', name: 'Root Canal Therapy - Premolar', category: 'Endodontics', estMinutes: 60, fee: '₹4,500' },
  { id: 'p9', code: 'D3330', name: 'Root Canal Therapy - Molar Tooth', category: 'Endodontics', estMinutes: 75, fee: '₹5,500' },
  { id: 'p10', code: 'D2750', name: 'Porcelain Fused to Metal (PFM) Crown', category: 'Prosthodontics', estMinutes: 45, fee: '₹4,000' },
  { id: 'p11', code: 'D2740', name: 'All-Ceramic / Zirconia Monolithic Crown', category: 'Prosthodontics', estMinutes: 45, fee: '₹8,500' },
  { id: 'p12', code: 'D7140', name: 'Simple Extraction (Erupted Tooth)', category: 'Oral Surgery', estMinutes: 30, fee: '₹1,000' },
  { id: 'p13', code: 'D7210', name: 'Surgical Extraction / Flap Elevation', category: 'Oral Surgery', estMinutes: 60, fee: '₹3,000' },
  { id: 'p14', code: 'D7240', name: 'Surgical Removal of Impacted Third Molar', category: 'Oral Surgery', estMinutes: 75, fee: '₹6,000' }
]

// Master Diagnoses (ICD-10 Compatible)
interface MasterDiagnosis {
  id: string
  icd: string
  name: string
  commonSite: string
  severity: 'Mild' | 'Moderate' | 'Severe / Acute'
  isCustom?: boolean
}

const DEFAULT_DIAGNOSES: MasterDiagnosis[] = [
  { id: 'd1', icd: 'K02.1', name: 'Dental Caries - Dentin Enamel Junction', commonSite: 'Occlusal / Proximal pits', severity: 'Moderate' },
  { id: 'd2', icd: 'K02.51', name: 'Arrested Dental Caries', commonSite: 'Smooth surfaces', severity: 'Mild' },
  { id: 'd3', icd: 'K04.01', name: 'Reversible Pulpitis', commonSite: 'Post-restoration / Initial lesion', severity: 'Mild' },
  { id: 'd4', icd: 'K04.02', name: 'Irreversible Pulpitis', commonSite: 'Deep carious tooth', severity: 'Severe / Acute' },
  { id: 'd5', icd: 'K04.1', name: 'Necrosis of Pulp', commonSite: 'Non-vital discolored tooth', severity: 'Moderate' },
  { id: 'd6', icd: 'K04.4', name: 'Acute Apical Periodontitis', commonSite: 'Periapical region (Pain on percussion)', severity: 'Severe / Acute' },
  { id: 'd7', icd: 'K04.7', name: 'Periapical Abscess without Sinus', commonSite: 'Root apex', severity: 'Severe / Acute' },
  { id: 'd8', icd: 'K05.00', name: 'Acute Gingivitis, Plaque Induced', commonSite: 'Marginal gingiva', severity: 'Mild' },
  { id: 'd9', icd: 'K05.31', name: 'Chronic Periodontitis - Localized', commonSite: 'Interdental bone crest', severity: 'Moderate' },
  { id: 'd10', icd: 'K08.1', name: 'Complete / Partial Edentulism', commonSite: 'Arch segments', severity: 'Moderate' },
  { id: 'd11', icd: 'K07.30', name: 'Crowding of Teeth', commonSite: 'Anterior sextant', severity: 'Mild' },
  { id: 'd12', icd: 'K01.1', name: 'Impacted Maxillary / Mandibular Tooth', commonSite: 'Third molars / Canines', severity: 'Moderate' }
]

// Standard Clinical Documentation Note Templates
interface ClinicalNoteTemplate {
  id: string
  title: string
  complaint: string
  findings: string
  plan: string
  isCustom?: boolean
}

const DEFAULT_TEMPLATES: ClinicalNoteTemplate[] = [
  {
    id: 't1',
    title: 'Routine Dental Examination & Prophylaxis',
    complaint: 'Routine dental check-up and teeth cleaning.',
    findings: 'Generalized Grade I calculus and superficial extrinsic stains. Gingiva mildly inflamed at lower anteriors. No active deep cavitation.',
    plan: 'Ultrasonic scaling and prophylaxis performed. Advised twice daily brushing and chlorhexidine mouthrinse.'
  },
  {
    id: 't2',
    title: 'Root Canal Treatment - Access & Biomechanical Prep',
    complaint: 'Spontaneous throbbing pain radiating to ear/jaw, worse at night and with hot food.',
    findings: 'Deep occlusal caries approaching pulp chamber. Tender on vertical percussion (+). Electric pulp test: delayed / negative.',
    plan: 'Local anesthesia administered (2% Lignocaine with Adrenaline). Rubber dam isolation. Access opened. Working lengths determined with electronic apex locator. BMP completed. Calcium hydroxide closed dressing placed.'
  },
  {
    id: 't3',
    title: 'Surgical Extraction - Impacted Mandibular Third Molar',
    complaint: 'Pain and swelling behind lower right jaw with difficulty in mouth opening (trismus).',
    findings: 'Distally angled mesioangular impacted #48 with inflamed operculum (pericoronitis). Opposing #18 supra-erupted.',
    plan: 'Inferior alveolar nerve block. Full thickness mucoperiosteal flap elevated. Minimal buccal guttering and odontosection. Tooth elevated and delivered intact. Socket debrided, copiously irrigated with sterile saline. 3-0 Silk suture placed. Pressure pack applied.'
  }
]

export const ClinicalConfigPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'medicines' | 'procedures' | 'diagnoses' | 'templates' | 'preferences'>('medicines')
  const [searchQuery, setSearchQuery] = useState('')

  // State with custom additions support
  const [medicines, setMedicines] = useState<MasterMedicine[]>(DEFAULT_MEDICINES)
  const [procedures, setProcedures] = useState<MasterProcedure[]>(DEFAULT_PROCEDURES)
  const [diagnoses, setDiagnoses] = useState<MasterDiagnosis[]>(DEFAULT_DIAGNOSES)
  const [templates, setTemplates] = useState<ClinicalNoteTemplate[]>(DEFAULT_TEMPLATES)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Load configuration from backend on mount
  useEffect(() => {
    let mounted = true
    apiClient.get<any>('/clinics/my-clinic/clinical-config')
      .then(res => {
        if (!mounted || !res) return
        if (Array.isArray(res.customMedicines) && res.customMedicines.length > 0) {
          setMedicines([...res.customMedicines, ...DEFAULT_MEDICINES.filter(dm => !res.customMedicines.some((cm: any) => cm.id === dm.id))])
        }
        if (Array.isArray(res.customProcedures) && res.customProcedures.length > 0) {
          setProcedures([...res.customProcedures, ...DEFAULT_PROCEDURES.filter(dp => !res.customProcedures.some((cp: any) => cp.id === dp.id))])
        }
        if (Array.isArray(res.customDiagnoses) && res.customDiagnoses.length > 0) {
          setDiagnoses([...res.customDiagnoses, ...DEFAULT_DIAGNOSES.filter(dd => !res.customDiagnoses.some((cd: any) => cd.id === dd.id))])
        }
        if (Array.isArray(res.customTemplates) && res.customTemplates.length > 0) {
          setTemplates([...res.customTemplates, ...DEFAULT_TEMPLATES.filter(dt => !res.customTemplates.some((ct: any) => ct.id === dt.id))])
        }
      })
      .catch(() => null)
    return () => { mounted = false }
  }, [])

  const saveConfiguration = async (newMeds = medicines, newProcs = procedures, newDiags = diagnoses, newTpls = templates) => {
    try {
      setSaving(true)
      setSaveError('')
      const customMedicines = newMeds.filter(m => m.isCustom)
      const customProcedures = newProcs.filter(p => p.isCustom)
      const customDiagnoses = newDiags.filter(d => d.isCustom)
      const customTemplates = newTpls.filter(t => t.isCustom)
      await apiClient.put('/clinics/my-clinic/clinical-config', {
        customMedicines,
        customProcedures,
        customDiagnoses,
        customTemplates
      })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error: any) {
      setMedicines(medicines); setProcedures(procedures); setDiagnoses(diagnoses); setTemplates(templates)
      setSaveError(error?.message || 'Configuration could not be saved. Please retry.')
    } finally {
      setSaving(false)
    }
  }

  // Add Item Modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [newMed, setNewMed] = useState({ name: '', category: 'Oral Medication', route: 'Oral', frequency: 'BD', duration: '5 days', instructions: '' })
  const [newProc, setNewProc] = useState({ code: '', name: '', category: 'General', estMinutes: 30, fee: '₹1,000' })
  const [newDiag, setNewDiag] = useState({ icd: '', name: '', commonSite: 'General', severity: 'Moderate' as const })
  const [newTpl, setNewTpl] = useState({ title: '', complaint: '', findings: '', plan: '' })

  const handleResetDefaults = () => {
    if (window.confirm('Reset this list to default standard items?')) {
      if (activeTab === 'medicines') {
        setMedicines(DEFAULT_MEDICINES)
        saveConfiguration(DEFAULT_MEDICINES, procedures, diagnoses, templates)
      }
      if (activeTab === 'procedures') {
        setProcedures(DEFAULT_PROCEDURES)
        saveConfiguration(medicines, DEFAULT_PROCEDURES, diagnoses, templates)
      }
      if (activeTab === 'diagnoses') {
        setDiagnoses(DEFAULT_DIAGNOSES)
        saveConfiguration(medicines, procedures, DEFAULT_DIAGNOSES, templates)
      }
      if (activeTab === 'templates') {
        setTemplates(DEFAULT_TEMPLATES)
        saveConfiguration(medicines, procedures, diagnoses, DEFAULT_TEMPLATES)
      }
    }
  }

  const handleDeleteItem = (id: string) => {
    if (activeTab === 'medicines') {
      const updated = medicines.filter(m => m.id !== id)
      setMedicines(updated)
      saveConfiguration(updated, procedures, diagnoses, templates)
    }
    if (activeTab === 'procedures') {
      const updated = procedures.filter(p => p.id !== id)
      setProcedures(updated)
      saveConfiguration(medicines, updated, diagnoses, templates)
    }
    if (activeTab === 'diagnoses') {
      const updated = diagnoses.filter(d => d.id !== id)
      setDiagnoses(updated)
      saveConfiguration(medicines, procedures, updated, templates)
    }
    if (activeTab === 'templates') {
      const updated = templates.filter(t => t.id !== id)
      setTemplates(updated)
      saveConfiguration(medicines, procedures, diagnoses, updated)
    }
  }

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault()
    const id = `custom-${Date.now()}`
    if (activeTab === 'medicines' && newMed.name) {
      const updated = [{ id, ...newMed, isCustom: true }, ...medicines]
      setMedicines(updated)
      saveConfiguration(updated, procedures, diagnoses, templates)
      setNewMed({ name: '', category: 'Oral Medication', route: 'Oral', frequency: 'BD', duration: '5 days', instructions: '' })
    } else if (activeTab === 'procedures' && newProc.name) {
      const updated = [{ id, ...newProc, isCustom: true }, ...procedures]
      setProcedures(updated)
      saveConfiguration(medicines, updated, diagnoses, templates)
      setNewProc({ code: '', name: '', category: 'General', estMinutes: 30, fee: '₹1,000' })
    } else if (activeTab === 'diagnoses' && newDiag.name) {
      const updated = [{ id, ...newDiag, isCustom: true }, ...diagnoses]
      setDiagnoses(updated)
      saveConfiguration(medicines, procedures, updated, templates)
      setNewDiag({ icd: '', name: '', commonSite: 'General', severity: 'Moderate' })
    } else if (activeTab === 'templates' && newTpl.title) {
      const updated = [{ id, ...newTpl, isCustom: true }, ...templates]
      setTemplates(updated)
      saveConfiguration(medicines, procedures, diagnoses, updated)
      setNewTpl({ title: '', complaint: '', findings: '', plan: '' })
    }
    setShowAddModal(false)
  }

  const q = searchQuery.toLowerCase().trim()
  const filteredMeds = useMemo(() => medicines.filter(m => !q || m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q)), [medicines, q])
  const filteredProcs = useMemo(() => procedures.filter(p => !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)), [procedures, q])
  const filteredDiags = useMemo(() => diagnoses.filter(d => !q || d.name.toLowerCase().includes(q) || d.icd.toLowerCase().includes(q)), [diagnoses, q])
  const filteredTpls = useMemo(() => templates.filter(t => !q || t.title.toLowerCase().includes(q) || t.complaint.toLowerCase().includes(q)), [templates, q])

  return (
    <section className="clinic-record-page" data-testid="feature-page-set.clinical-config" style={{ padding: '24px 32px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      {saveError && <p role="alert">{saveError}</p>}
      <header className="clinic-record-header" style={{ marginBottom: '16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span className="clinic-record-eyebrow" style={{ color: 'var(--teal-primary, #008891)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            CLINIC SETTINGS &amp; ADMINISTRATION
          </span>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '2px 0 6px 0', color: 'var(--text-strong, #0f172a)' }}>
            Clinical Configuration &amp; Master Lists
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '13.5px' }}>
            Maintain reusable chairside master picklists for prescriptions, procedure codes, diagnosis classifications, and clinical documentation.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {saveSuccess && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--tone-green, #16a34a)', fontWeight: 600 }}>
              <CheckCircle2 size={16} /> Saved
            </span>
          )}
          <button
            type="button"
            onClick={() => saveConfiguration()}
            disabled={saving}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              background: 'var(--teal-primary, #008891)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: saving ? 'wait' : 'pointer'
            }}
          >
            <RefreshCw size={14} />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </header>

      {/* Advisory Notice */}
      <div style={{
        background: 'var(--teal-tint, rgba(0, 136, 145, 0.06))',
        border: '1px solid var(--teal-border, rgba(0, 136, 145, 0.18))',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '13px',
        color: 'var(--text-strong, #0f172a)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileSpreadsheet size={18} style={{ color: 'var(--teal-primary, #008891)' }} />
          <span>
            <strong>Master List Control:</strong> Items configured here are automatically available as autocomplete choices in chairside prescriptions, treatment planning, and clinical notes.
          </span>
        </div>
        <span style={{ fontSize: '11px', background: 'var(--surface-raised, #ffffff)', color: 'var(--text-strong)', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--line, #e2e8f0)', fontWeight: 600 }}>
          Clinic-Scoped
        </span>
      </div>

      {/* Tab Bar */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '1px solid var(--line, #e2e8f0)',
        marginBottom: '20px',
        overflowX: 'auto'
      }}>
        <button
          type="button"
          onClick={() => { setActiveTab('medicines'); setSearchQuery('') }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'medicines' ? '2px solid var(--teal-primary, #008891)' : '2px solid transparent',
            color: activeTab === 'medicines' ? 'var(--teal-primary, #008891)' : 'var(--text-muted, #64748b)',
            cursor: 'pointer'
          }}
        >
          <Pill size={15} /> Medication Formulary ({medicines.length})
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('procedures'); setSearchQuery('') }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'procedures' ? '2px solid var(--teal-primary, #008891)' : '2px solid transparent',
            color: activeTab === 'procedures' ? 'var(--teal-primary, #008891)' : 'var(--text-muted, #64748b)',
            cursor: 'pointer'
          }}
        >
          <Stethoscope size={15} /> Procedure Catalogue ({procedures.length})
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('diagnoses'); setSearchQuery('') }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'diagnoses' ? '2px solid var(--teal-primary, #008891)' : '2px solid transparent',
            color: activeTab === 'diagnoses' ? 'var(--teal-primary, #008891)' : 'var(--text-muted, #64748b)',
            cursor: 'pointer'
          }}
        >
          <AlertTriangle size={15} /> Diagnoses &amp; ICD ({diagnoses.length})
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('templates'); setSearchQuery('') }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'templates' ? '2px solid var(--teal-primary, #008891)' : '2px solid transparent',
            color: activeTab === 'templates' ? 'var(--teal-primary, #008891)' : 'var(--text-muted, #64748b)',
            cursor: 'pointer'
          }}
        >
          <FileText size={15} /> Clinical Note Templates ({templates.length})
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('preferences'); setSearchQuery('') }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: 600,
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'preferences' ? '2px solid var(--teal-primary, #008891)' : '2px solid transparent',
            color: activeTab === 'preferences' ? 'var(--teal-primary, #008891)' : 'var(--text-muted, #64748b)',
            cursor: 'pointer'
          }}
        >
          <Sliders size={15} /> Clinical Governance
        </button>
      </div>

      {/* Action Bar (Search & Add Item) */}
      {activeTab !== 'preferences' && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px',
          flexWrap: 'wrap'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--surface-sunken, #fff)',
            border: '1px solid var(--line-strong, #cbd5e1)',
            borderRadius: '8px',
            padding: '6px 12px',
            minWidth: '280px'
          }}>
            <Search size={16} color="var(--text-muted, #94a3b8)" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: 'none', outline: 'none', fontSize: '13px', width: '100%', background: 'transparent', color: 'var(--text-strong)' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleResetDefaults}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 12px',
                borderRadius: '6px',
                fontSize: '12.5px',
                background: 'var(--surface-sunken, #f8fafc)',
                border: '1px solid var(--line-strong, #cbd5e1)',
                color: 'var(--text-strong, #475569)',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={13} /> Reset Defaults
            </button>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                background: 'var(--teal-primary, #008891)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Plus size={15} /> Add Custom {activeTab === 'medicines' ? 'Medicine' : activeTab === 'procedures' ? 'Procedure' : activeTab === 'diagnoses' ? 'Diagnosis' : 'Template'}
            </button>
          </div>
        </div>
      )}

      {/* Tab 1: Medicines */}
      {activeTab === 'medicines' && (
        <article style={{ background: 'var(--surface-raised, #fff)', border: '1px solid var(--line, #e2e8f0)', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface-alt, #f8fafc)', borderBottom: '1px solid var(--line, #e2e8f0)', color: 'var(--text-muted, #64748b)', fontSize: '11.5px', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 14px' }}>Medicine &amp; Strength</th>
                <th style={{ padding: '10px 14px' }}>Category</th>
                <th style={{ padding: '10px 14px' }}>Route</th>
                <th style={{ padding: '10px 14px' }}>Default Dosage</th>
                <th style={{ padding: '10px 14px' }}>Instructions</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMeds.map((m) => (
                <tr key={m.id} style={{ borderBottom: '1px solid var(--line, #f1f5f9)' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-strong, #0f172a)' }}>
                    {m.name}
                    {m.isCustom && <span style={{ marginLeft: '6px', fontSize: '10px', background: 'rgba(5, 150, 105, 0.15)', color: 'var(--tone-green, #065f46)', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(5, 150, 105, 0.3)' }}>Custom</span>}
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text, #475569)' }}>{m.category}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--text, #475569)' }}>{m.route}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-strong, #0f172a)' }}>{m.frequency} × {m.duration}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-muted, #64748b)' }}>{m.instructions}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                    {m.isCustom ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(m.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--tone-red, #ef4444)', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>Standard</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      )}

      {/* Tab 2: Procedures */}
      {activeTab === 'procedures' && (
        <article style={{ background: 'var(--surface-raised, #fff)', border: '1px solid var(--line, #e2e8f0)', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface-alt, #f8fafc)', borderBottom: '1px solid var(--line, #e2e8f0)', color: 'var(--text-muted, #64748b)', fontSize: '11.5px', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 14px' }}>CDT Code</th>
                <th style={{ padding: '10px 14px' }}>Procedure Description</th>
                <th style={{ padding: '10px 14px' }}>Category</th>
                <th style={{ padding: '10px 14px' }}>Est. Duration</th>
                <th style={{ padding: '10px 14px' }}>Standard Tariff</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProcs.map((p) => (
                <tr key={p.id || p.code} style={{ borderBottom: '1px solid var(--line, #f1f5f9)' }}>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--teal-primary, #008891)' }}>{p.code}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-strong, #0f172a)' }}>
                    {p.name}
                    {p.isCustom && <span style={{ marginLeft: '6px', fontSize: '10px', background: 'rgba(5, 150, 105, 0.15)', color: 'var(--tone-green, #065f46)', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(5, 150, 105, 0.3)' }}>Custom</span>}
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text, #475569)' }}>{p.category}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--text, #475569)' }}>{p.estMinutes} mins</td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--tone-green, #065f46)' }}>{p.fee}</td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                    {p.isCustom ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(p.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--tone-red, #ef4444)', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>Standard</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      )}

      {/* Tab 3: Diagnoses */}
      {activeTab === 'diagnoses' && (
        <article style={{ background: 'var(--surface-raised, #fff)', border: '1px solid var(--line, #e2e8f0)', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--surface-alt, #f8fafc)', borderBottom: '1px solid var(--line, #e2e8f0)', color: 'var(--text-muted, #64748b)', fontSize: '11.5px', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 14px' }}>ICD-10 Code</th>
                <th style={{ padding: '10px 14px' }}>Diagnostic Entity</th>
                <th style={{ padding: '10px 14px' }}>Typical Site</th>
                <th style={{ padding: '10px 14px' }}>Clinical Severity</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDiags.map((d) => (
                <tr key={d.id || d.icd} style={{ borderBottom: '1px solid var(--line, #f1f5f9)' }}>
                  <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--teal-primary, #008891)' }}>{d.icd}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: 'var(--text-strong, #0f172a)' }}>
                    {d.name}
                    {d.isCustom && <span style={{ marginLeft: '6px', fontSize: '10px', background: 'rgba(5, 150, 105, 0.15)', color: 'var(--tone-green, #065f46)', padding: '1px 6px', borderRadius: '4px', border: '1px solid rgba(5, 150, 105, 0.3)' }}>Custom</span>}
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text, #475569)' }}>{d.commonSite}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      background: d.severity.includes('Acute') ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      border: `1px solid ${d.severity.includes('Acute') ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                      color: d.severity.includes('Acute') ? 'var(--tone-red, #991b1b)' : 'var(--tone-amber, #92400e)'
                    }}>
                      {d.severity}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                    {d.isCustom ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(d.id)}
                        style={{ background: 'none', border: 'none', color: 'var(--tone-red, #ef4444)', cursor: 'pointer', padding: '4px' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>Standard</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      )}

      {/* Tab 4: Templates */}
      {activeTab === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {filteredTpls.map((t) => (
            <div key={t.id} style={{ background: 'var(--surface-raised, #fff)', border: '1px solid var(--line, #e2e8f0)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--text-strong, #0f172a)' }}>
                  {t.title}
                </h3>
                {t.isCustom && (
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(t.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--tone-red, #ef4444)', cursor: 'pointer', padding: '2px' }}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text, #475569)', marginBottom: '8px' }}>
                <strong style={{ color: 'var(--text-strong)' }}>Chief Complaint:</strong> {t.complaint}
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text, #475569)', marginBottom: '8px' }}>
                <strong style={{ color: 'var(--text-strong)' }}>Clinical Findings:</strong> {t.findings}
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--teal-primary, #008891)' }}>
                <strong>Plan / Notes:</strong> {t.plan}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 5: Preferences */}
      {activeTab === 'preferences' && (
        <article style={{ background: 'var(--surface-raised, #fff)', border: '1px solid var(--line, #e2e8f0)', borderRadius: '8px', padding: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 16px 0', color: 'var(--text-strong, #0f172a)' }}>
            Clinical Safety &amp; Governance Rules
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--line, #e2e8f0)', borderRadius: '6px', background: 'var(--surface-alt)' }}>
              <div>
                <strong style={{ fontSize: '13px', display: 'block', color: 'var(--text-strong)' }}>FDI Two-Digit Tooth Notation</strong>
                <small style={{ color: 'var(--text-muted, #64748b)' }}>Standardized dental chart numbering (11-48 for permanent, 51-85 for primary teeth).</small>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tone-green, #047857)', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '3px 8px', borderRadius: '4px' }}>Active</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--line, #e2e8f0)', borderRadius: '6px', background: 'var(--surface-alt)' }}>
              <div>
                <strong style={{ fontSize: '13px', display: 'block', color: 'var(--text-strong)' }}>Doctor Authorization for Finalization</strong>
                <small style={{ color: 'var(--text-muted, #64748b)' }}>Doctors and verified doctor-owners can finalize clinical prescriptions and notes. Clinic administrators can manage treatment planning.</small>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tone-green, #047857)', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '3px 8px', borderRadius: '4px' }}>Enforced</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--line, #e2e8f0)', borderRadius: '6px', background: 'var(--surface-alt)' }}>
              <div>
                <strong style={{ fontSize: '13px', display: 'block', color: 'var(--text-strong)' }}>Letterhead &amp; Clinic Identity</strong>
                <small style={{ color: 'var(--text-muted, #64748b)' }}>Prescription printouts and treatment estimates use the official clinic letterhead configured in Clinic Profile.</small>
              </div>
              <Link to="/settings/clinic" style={{ fontSize: '12px', color: 'var(--teal-primary, #008891)', fontWeight: 600 }}>Configure →</Link>
            </div>
          </div>
        </article>
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--surface-raised, #ffffff)',
            border: '1px solid var(--line-strong, #e2e8f0)',
            borderRadius: '16px',
            maxWidth: '480px',
            width: '100%',
            padding: '24px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-strong, #0f172a)', margin: 0 }}>
                Add Custom {activeTab === 'medicines' ? 'Medication' : activeTab === 'procedures' ? 'Procedure' : activeTab === 'diagnoses' ? 'Diagnosis' : 'Template'}
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted, #94a3b8)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddItem} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeTab === 'medicines' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '4px' }}>Medicine Name &amp; Strength *</label>
                    <input type="text" required placeholder="e.g. Cefixime 200mg" value={newMed.name} onChange={(e) => setNewMed({ ...newMed, name: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--line-strong, #cbd5e1)', background: 'var(--surface-sunken)', color: 'var(--text-strong)', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '4px' }}>Category</label>
                    <input type="text" placeholder="e.g. Antibiotic / Analgesic" value={newMed.category} onChange={(e) => setNewMed({ ...newMed, category: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--line-strong, #cbd5e1)', background: 'var(--surface-sunken)', color: 'var(--text-strong)', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '4px' }}>Route</label>
                      <input type="text" value={newMed.route} onChange={(e) => setNewMed({ ...newMed, route: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--line-strong, #cbd5e1)', background: 'var(--surface-sunken)', color: 'var(--text-strong)', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '4px' }}>Frequency</label>
                      <input type="text" value={newMed.frequency} onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--line-strong, #cbd5e1)', background: 'var(--surface-sunken)', color: 'var(--text-strong)', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '4px' }}>Instructions</label>
                    <input type="text" placeholder="e.g. After food with water" value={newMed.instructions} onChange={(e) => setNewMed({ ...newMed, instructions: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--line-strong, #cbd5e1)', background: 'var(--surface-sunken)', color: 'var(--text-strong)', boxSizing: 'border-box' }} />
                  </div>
                </>
              )}

              {activeTab === 'procedures' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '4px' }}>Procedure Name *</label>
                    <input type="text" required placeholder="e.g. Zirconia Crown" value={newProc.name} onChange={(e) => setNewProc({ ...newProc, name: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--line-strong, #cbd5e1)', background: 'var(--surface-sunken)', color: 'var(--text-strong)', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '4px' }}>CDT / Tariff Code</label>
                      <input type="text" placeholder="e.g. D2740-Z" value={newProc.code} onChange={(e) => setNewProc({ ...newProc, code: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--line-strong, #cbd5e1)', background: 'var(--surface-sunken)', color: 'var(--text-strong)', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '4px' }}>Standard Fee</label>
                      <input type="text" placeholder="e.g. ₹9,000" value={newProc.fee} onChange={(e) => setNewProc({ ...newProc, fee: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--line-strong, #cbd5e1)', background: 'var(--surface-sunken)', color: 'var(--text-strong)', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '4px' }}>Category</label>
                    <input type="text" placeholder="e.g. Prosthodontics" value={newProc.category} onChange={(e) => setNewProc({ ...newProc, category: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--line-strong, #cbd5e1)', background: 'var(--surface-sunken)', color: 'var(--text-strong)', boxSizing: 'border-box' }} />
                  </div>
                </>
              )}

              {activeTab === 'diagnoses' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '4px' }}>Diagnosis Name *</label>
                    <input type="text" required placeholder="e.g. Cracked Tooth Syndrome" value={newDiag.name} onChange={(e) => setNewDiag({ ...newDiag, name: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--line-strong, #cbd5e1)', background: 'var(--surface-sunken)', color: 'var(--text-strong)', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '4px' }}>ICD-10 Code</label>
                      <input type="text" placeholder="e.g. K03.81" value={newDiag.icd} onChange={(e) => setNewDiag({ ...newDiag, icd: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--line-strong, #cbd5e1)', background: 'var(--surface-sunken)', color: 'var(--text-strong)', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '4px' }}>Severity</label>
                      <input type="text" placeholder="e.g. Mild / Acute" value={newDiag.severity} onChange={(e) => setNewDiag({ ...newDiag, severity: e.target.value as any })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--line-strong, #cbd5e1)', background: 'var(--surface-sunken)', color: 'var(--text-strong)', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'templates' && (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '4px' }}>Template Title *</label>
                    <input type="text" required placeholder="e.g. Dental Implant Consultation" value={newTpl.title} onChange={(e) => setNewTpl({ ...newTpl, title: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--line-strong, #cbd5e1)', background: 'var(--surface-sunken)', color: 'var(--text-strong)', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '4px' }}>Complaint</label>
                    <input type="text" placeholder="e.g. Missing tooth #46" value={newTpl.complaint} onChange={(e) => setNewTpl({ ...newTpl, complaint: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--line-strong, #cbd5e1)', background: 'var(--surface-sunken)', color: 'var(--text-strong)', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '4px' }}>Findings</label>
                    <textarea rows={2} placeholder="e.g. Healed edentulous ridge with adequate width" value={newTpl.findings} onChange={(e) => setNewTpl({ ...newTpl, findings: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--line-strong, #cbd5e1)', background: 'var(--surface-sunken)', color: 'var(--text-strong)', boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-strong, #334155)', marginBottom: '4px' }}>Plan</label>
                    <textarea rows={2} placeholder="e.g. CBCT scan ordered. Stage 1 surgery planned." value={newTpl.plan} onChange={(e) => setNewTpl({ ...newTpl, plan: e.target.value })} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--line-strong, #cbd5e1)', background: 'var(--surface-sunken)', color: 'var(--text-strong)', boxSizing: 'border-box' }} />
                  </div>
                </>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{ flex: 1, padding: '9px', borderRadius: '6px', border: '1px solid var(--line-strong, #cbd5e1)', background: 'var(--surface-sunken, #f8fafc)', color: 'var(--text-strong, #475569)', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ flex: 1, padding: '9px', borderRadius: '6px', border: 'none', background: 'var(--teal-primary, #008891)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}

export default ClinicalConfigPage
