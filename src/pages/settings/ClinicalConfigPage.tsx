import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileSpreadsheet, Pill, Stethoscope, AlertTriangle, FileText,
  Sliders, Plus, Check, Search, ExternalLink
} from 'lucide-react'

type ConfigTab = 'medicines' | 'procedures' | 'diagnoses' | 'templates' | 'preferences'

const STANDARD_MEDICINES = [
  { id: 'med-1', name: 'Amoxicillin 500mg', route: 'Oral', frequency: 'TDS (Thrice daily)', duration: '5 days', instructions: 'After meals', category: 'Antibiotic' },
  { id: 'med-2', name: 'Augmentin 625mg (Amox + Clav)', route: 'Oral', frequency: 'BD (Twice daily)', duration: '5 days', instructions: 'With food', category: 'Antibiotic' },
  { id: 'med-3', name: 'Ibuprofen 400mg', route: 'Oral', frequency: 'SOS / TDS', duration: '3 days', instructions: 'After meals (Avoid if gastritis)', category: 'Analgesic / NSAID' },
  { id: 'med-4', name: 'Paracetamol 650mg', route: 'Oral', frequency: 'TDS', duration: '3 days', instructions: 'Post-op pain relief', category: 'Analgesic' },
  { id: 'med-5', name: 'Chlorhexidine Gluconate 0.2%', route: 'Mouthwash', frequency: 'BD', duration: '7 days', instructions: 'Rinse for 30s after brushing', category: 'Antiseptic' },
  { id: 'med-6', name: 'Metronidazole 400mg', route: 'Oral', frequency: 'TDS', duration: '5 days', instructions: 'Take with food (Strictly no alcohol)', category: 'Antimicrobial' }
]

const STANDARD_PROCEDURES = [
  { code: 'D0120', name: 'Periodic Oral Evaluation', category: 'Diagnostic', estMinutes: 20, fee: '₹500' },
  { code: 'D1110', name: 'Adult Dental Prophylaxis / Scaling', category: 'Preventive', estMinutes: 30, fee: '₹1,500' },
  { code: 'D2330', name: 'Resin-based Composite (1 Surface)', category: 'Restorative', estMinutes: 40, fee: '₹1,800' },
  { code: 'D3330', name: 'Root Canal Therapy - Molar', category: 'Endodontics', estMinutes: 60, fee: '₹6,500' },
  { code: 'D2740', name: 'Crown - Porcelain / Ceramic Substrate', category: 'Prosthodontics', estMinutes: 45, fee: '₹8,500' },
  { code: 'D7140', name: 'Extraction, Erupted Tooth / Exposed Root', category: 'Oral Surgery', estMinutes: 30, fee: '₹1,200' }
]

const STANDARD_DIAGNOSES = [
  { icd: 'K04.0', name: 'Irreversible Pulpitis', commonSite: 'Molars / Premolars', severity: 'Acute' },
  { icd: 'K02.9', name: 'Dental Caries, Unspecified', commonSite: 'Occlusal / Interproximal', severity: 'Mild to Moderate' },
  { icd: 'K05.0', name: 'Acute Gingivitis', commonSite: 'Generalized Marginal', severity: 'Mild' },
  { icd: 'K05.3', name: 'Chronic Periodontitis', commonSite: 'Generalized', severity: 'Moderate to Severe' },
  { icd: 'K04.7', name: 'Periapical Abscess without Sinus', commonSite: 'Apical', severity: 'Acute' }
]

const NOTE_TEMPLATES = [
  { id: 'tpl-1', title: 'Routine Dental Examination', complaint: 'Routine 6-month dental checkup and clean.', findings: 'Good general oral hygiene. Mild calculus in lower lingual anterior sector. No active carious lesions noted.', plan: 'Ultrasonic scaling & polishing completed. Recall scheduled for 6 months.' },
  { id: 'tpl-2', title: 'Acute Toothache / Emergency', complaint: 'Spontaneous throbbing pain in posterior tooth, exacerbated by cold and lying down.', findings: 'Deep occlusal caries approaching pulp on #36. Sensitive to percussion. Lingering response to cold test (>10s).', plan: 'Diagnosis: Symptomatic Irreversible Pulpitis #36. Emergency pulpectomy performed. Temporary dressing placed. Scheduled for obturation.' },
  { id: 'tpl-3', title: 'Crown Cementation Protocol', complaint: 'Scheduled visit for permanent crown cementation.', findings: 'Prepared tooth asymptomatic. Gingival margins healthy with no inflammation. Marginal adaptation and occlusion checked.', plan: 'E-Max ceramic crown cemented with resin-modified glass ionomer cement. Excess cement cleared. Occlusion re-verified.' }
]

export const ClinicalConfigPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ConfigTab>('medicines')
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <section className="clinic-record-page" data-testid="feature-page-set.clinical-config" style={{ padding: '24px 32px' }}>
      {/* Header */}
      <header className="clinic-record-header" style={{ marginBottom: '16px' }}>
        <div>
          <span className="clinic-record-eyebrow">CLINIC SETTINGS & ADMINISTRATION</span>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '2px 0 6px 0', color: 'var(--text-main, #0f172a)' }}>
            Clinical Configuration
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '13.5px' }}>
            Maintain reusable chairside master picklists for prescriptions, procedure codes, diagnosis classifications, and clinical documentation.
          </p>
        </div>
      </header>

      {/* Advisory Notice */}
      <div style={{
        background: 'rgba(0, 136, 145, 0.06)',
        border: '1px solid rgba(0, 136, 145, 0.18)',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '13px',
        color: 'var(--text-main, #0f172a)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileSpreadsheet size={18} style={{ color: 'var(--teal-primary, #008891)' }} />
          <span>
            <strong>Master List Control:</strong> Items configured here are automatically available as autocomplete choices in chairside prescriptions, treatment planning, and clinical notes.
          </span>
        </div>
        <span style={{ fontSize: '11px', background: 'var(--surface, #ffffff)', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--line, #e2e8f0)', fontWeight: 600 }}>
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
          onClick={() => setActiveTab('medicines')}
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
          <Pill size={15} /> Medication Formulary
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('procedures')}
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
          <Stethoscope size={15} /> Procedure Catalogue
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('diagnoses')}
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
          <AlertTriangle size={15} /> Diagnoses & ICD
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('templates')}
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
          <FileText size={15} /> Clinical Note Templates
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('preferences')}
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
          <Sliders size={15} /> Clinical Preferences
        </button>
      </div>

      {/* Tab 1: Medication Formulary */}
      {activeTab === 'medicines' && (
        <article className="clinic-record-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 2px 0' }}>Approved Medication Formulary</h2>
              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted, #64748b)' }}>
                Active drugs appearing in prescription medicine auto-suggest.
              </p>
            </div>
            <Link to="/clinical/prescriptions" style={{ fontSize: '12.5px', color: 'var(--teal-primary, #008891)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Open Prescriptions <ExternalLink size={12} />
            </Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line, #e2e8f0)', textAlign: 'left', color: 'var(--text-muted, #64748b)' }}>
                  <th style={{ padding: '8px 12px' }}>Medicine</th>
                  <th style={{ padding: '8px 12px' }}>Category</th>
                  <th style={{ padding: '8px 12px' }}>Route</th>
                  <th style={{ padding: '8px 12px' }}>Default Frequency</th>
                  <th style={{ padding: '8px 12px' }}>Duration</th>
                  <th style={{ padding: '8px 12px' }}>Standard Instructions</th>
                </tr>
              </thead>
              <tbody>
                {STANDARD_MEDICINES.map((med) => (
                  <tr key={med.id} style={{ borderBottom: '1px solid var(--line, #f1f5f9)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{med.name}</td>
                    <td style={{ padding: '10px 12px' }}><span style={{ background: 'rgba(0, 136, 145, 0.08)', color: 'var(--teal-primary, #008891)', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>{med.category}</span></td>
                    <td style={{ padding: '10px 12px' }}>{med.route}</td>
                    <td style={{ padding: '10px 12px' }}>{med.frequency}</td>
                    <td style={{ padding: '10px 12px' }}>{med.duration}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted, #64748b)', fontSize: '12px' }}>{med.instructions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {/* Tab 2: Procedure Catalogue */}
      {activeTab === 'procedures' && (
        <article className="clinic-record-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 2px 0' }}>Dental Procedure Catalogue</h2>
              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted, #64748b)' }}>
                Standard ADA / CDT dental procedures linked to treatment planning and scheduling.
              </p>
            </div>
            <Link to="/clinical/treatment-plans" style={{ fontSize: '12.5px', color: 'var(--teal-primary, #008891)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Open Treatment Plans <ExternalLink size={12} />
            </Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line, #e2e8f0)', textAlign: 'left', color: 'var(--text-muted, #64748b)' }}>
                  <th style={{ padding: '8px 12px' }}>Code</th>
                  <th style={{ padding: '8px 12px' }}>Procedure Name</th>
                  <th style={{ padding: '8px 12px' }}>Discipline</th>
                  <th style={{ padding: '8px 12px' }}>Chair Time</th>
                  <th style={{ padding: '8px 12px' }}>Standard Fee</th>
                </tr>
              </thead>
              <tbody>
                {STANDARD_PROCEDURES.map((proc) => (
                  <tr key={proc.code} style={{ borderBottom: '1px solid var(--line, #f1f5f9)' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--teal-primary, #008891)' }}>{proc.code}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{proc.name}</td>
                    <td style={{ padding: '10px 12px' }}>{proc.category}</td>
                    <td style={{ padding: '10px 12px' }}>{proc.estMinutes} mins</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{proc.fee}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {/* Tab 3: Diagnoses & ICD */}
      {activeTab === 'diagnoses' && (
        <article className="clinic-record-card">
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 2px 0' }}>Oral Health Diagnostic Classifications</h2>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted, #64748b)' }}>
              Standard diagnostic categories referenced in clinical notes and treatment recommendations.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line, #e2e8f0)', textAlign: 'left', color: 'var(--text-muted, #64748b)' }}>
                  <th style={{ padding: '8px 12px' }}>ICD-10 Code</th>
                  <th style={{ padding: '8px 12px' }}>Diagnostic Title</th>
                  <th style={{ padding: '8px 12px' }}>Typical Anatomical Site</th>
                  <th style={{ padding: '8px 12px' }}>Clinical Severity</th>
                </tr>
              </thead>
              <tbody>
                {STANDARD_DIAGNOSES.map((diag) => (
                  <tr key={diag.icd} style={{ borderBottom: '1px solid var(--line, #f1f5f9)' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--teal-primary, #008891)' }}>{diag.icd}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{diag.name}</td>
                    <td style={{ padding: '10px 12px' }}>{diag.commonSite}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: diag.severity.includes('Acute') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(100, 116, 139, 0.1)',
                        color: diag.severity.includes('Acute') ? '#dc2626' : '#475569'
                      }}>
                        {diag.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      )}

      {/* Tab 4: Clinical Note Templates */}
      {activeTab === 'templates' && (
        <article className="clinic-record-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 2px 0' }}>Chairside Clinical Note Templates</h2>
              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted, #64748b)' }}>
                Structured templates to accelerate chairside documentation during patient visits.
              </p>
            </div>
            <Link to="/clinical/notes" style={{ fontSize: '12.5px', color: 'var(--teal-primary, #008891)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Open Clinical Notes <ExternalLink size={12} />
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {NOTE_TEMPLATES.map((tpl) => (
              <div key={tpl.id} style={{
                border: '1px solid var(--line, #e2e8f0)',
                borderRadius: '8px',
                padding: '16px',
                background: 'var(--surface-subtle, #f8fafc)'
              }}>
                <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--text-main, #0f172a)' }}>{tpl.title}</h3>
                <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: 'var(--text-muted, #64748b)' }}><strong>Complaint:</strong> {tpl.complaint}</p>
                <p style={{ margin: '0 0 6px 0', fontSize: '12px', color: 'var(--text-muted, #64748b)' }}><strong>Findings:</strong> {tpl.findings}</p>
                <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted, #64748b)' }}><strong>Plan:</strong> {tpl.plan}</p>
              </div>
            ))}
          </div>
        </article>
      )}

      {/* Tab 5: Clinical Preferences */}
      {activeTab === 'preferences' && (
        <article className="clinic-record-card">
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 2px 0' }}>Clinic Clinical Preferences</h2>
            <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted, #64748b)' }}>
              Clinic-wide safety policies, default prescription rules, and clinical record controls.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '640px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--line, #e2e8f0)', borderRadius: '6px' }}>
              <div>
                <strong style={{ fontSize: '13px', display: 'block' }}>Mandatory Allergy Check</strong>
                <small style={{ color: 'var(--text-muted, #64748b)' }}>Display safety alert banner on prescription and procedure modal when patient has recorded allergies.</small>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#047857', background: 'rgba(16, 185, 129, 0.1)', padding: '3px 8px', borderRadius: '4px' }}>Active</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--line, #e2e8f0)', borderRadius: '6px' }}>
              <div>
                <strong style={{ fontSize: '13px', display: 'block' }}>Doctor Authorization for Finalization</strong>
                <small style={{ color: 'var(--text-muted, #64748b)' }}>Only verified prescribers (DOCTOR role) can finalize clinical prescriptions and dental treatment plans.</small>
              </div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#047857', background: 'rgba(16, 185, 129, 0.1)', padding: '3px 8px', borderRadius: '4px' }}>Enforced</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--line, #e2e8f0)', borderRadius: '6px' }}>
              <div>
                <strong style={{ fontSize: '13px', display: 'block' }}>Letterhead & Clinic Identity</strong>
                <small style={{ color: 'var(--text-muted, #64748b)' }}>Prescription printouts and treatment estimates use the official clinic letterhead configured in Clinic Profile.</small>
              </div>
              <Link to="/settings/clinic" style={{ fontSize: '12px', color: 'var(--teal-primary, #008891)', fontWeight: 600 }}>Configure →</Link>
            </div>
          </div>
        </article>
      )}
    </section>
  )
}

export default ClinicalConfigPage

