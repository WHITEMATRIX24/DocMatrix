import React, { useEffect, useMemo, useState } from 'react'
import { FileCheck2, Plus, Search, CheckCircle2, Edit3, Eye, X, ShieldCheck } from 'lucide-react'
import {
  DEFAULT_FRONTEND_CONSENT_TEMPLATES,
  createConsentTemplateApi,
  fetchConsentTemplates,
  updateConsentTemplateApi,
  type ConsentTemplateRecord,
} from '@/services/consentService'
import { isAuthenticatedClinic } from '@/services/clinicStore'

export const ConsentTemplatesPage: React.FC = () => {
  const [templates, setTemplates] = useState<ConsentTemplateRecord[]>(DEFAULT_FRONTEND_CONSENT_TEMPLATES)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [editing, setEditing] = useState<ConsentTemplateRecord | null>(null)
  const [previewing, setPreviewing] = useState<ConsentTemplateRecord | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [form, setForm] = useState<Partial<ConsentTemplateRecord>>({
    title: '',
    procedureType: '',
    procedureCategory: 'Oral Surgery',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    description: '',
    purpose: '',
    benefits: '',
    risks: '',
    alternatives: '',
    refusalConsequences: '',
    postProcedureInstructions: '',
    patientDeclaration: '',
    dentistDeclaration: '',
    isActive: true,
    isReviewed: false,
  })

  useEffect(() => {
    if (!isAuthenticatedClinic()) return
    setLoading(true)
    fetchConsentTemplates(false)
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setTemplates(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const categories = useMemo(
    () => ['ALL', ...Array.from(new Set(templates.map((t) => t.procedureCategory || 'Other')))],
    [templates],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return templates.filter((t) => {
      if (categoryFilter !== 'ALL' && t.procedureCategory !== categoryFilter) return false
      if (!q) return true
      return (
        t.title.toLowerCase().includes(q) ||
        t.procedureType.toLowerCase().includes(q) ||
        t.procedureCategory.toLowerCase().includes(q)
      )
    })
  }, [templates, search, categoryFilter])

  const openCreate = () => {
    setIsCreating(true)
    setEditing(null)
    setError('')
    setForm({
      title: '',
      procedureType: '',
      procedureCategory: 'Oral Surgery',
      requiresConsent: true,
      guardianRequiredForMinors: true,
      description: '',
      purpose: '',
      benefits: '',
      risks: '',
      alternatives: '',
      refusalConsequences: '',
      postProcedureInstructions: '',
      patientDeclaration:
        'I confirm that I have read and understood the procedure, benefits, risks, and alternatives, and voluntarily consent to treatment.',
      dentistDeclaration:
        'I confirm that I have explained the procedure, benefits, risks, and alternatives to the patient/guardian.',
      isActive: true,
      isReviewed: false,
    })
  }

  const openEdit = (tpl: ConsentTemplateRecord) => {
    setIsCreating(false)
    setEditing(tpl)
    setError('')
    setForm({ ...tpl })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title?.trim() || !form.procedureType?.trim()) {
      setError('Consent title and procedure name are required.')
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      if (isCreating) {
        if (isAuthenticatedClinic()) {
          const created = await createConsentTemplateApi(form)
          setTemplates((prev) => [created, ...prev])
        } else {
          const created: ConsentTemplateRecord = {
            ...(form as ConsentTemplateRecord),
            id: `tpl-${Date.now()}`,
            version: 1,
            isActive: form.isActive ?? true,
            isReviewed: form.isReviewed ?? false,
          }
          setTemplates((prev) => [created, ...prev])
        }
        setIsCreating(false)
        setNotice('New consent template created.')
      } else if (editing) {
        if (isAuthenticatedClinic() && !editing.id.startsWith('tpl-')) {
          const updated = await updateConsentTemplateApi(editing.id, form)
          setTemplates((prev) => prev.map((t) => (t.id === editing.id ? updated : t)))
        } else {
          setTemplates((prev) =>
            prev.map((t) =>
              t.id === editing.id ? { ...t, ...form, version: (t.version || 1) + 1 } : t,
            ),
          )
        }
        setEditing(null)
        setNotice('Consent template updated (new version saved; existing signed consents remain unchanged).')
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to save consent template.')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (tpl: ConsentTemplateRecord) => {
    const nextActive = !tpl.isActive
    try {
      if (isAuthenticatedClinic() && !tpl.id.startsWith('tpl-')) {
        const updated = await updateConsentTemplateApi(tpl.id, { isActive: nextActive })
        setTemplates((prev) => prev.map((t) => (t.id === tpl.id ? updated : t)))
      } else {
        setTemplates((prev) => prev.map((t) => (t.id === tpl.id ? { ...t, isActive: nextActive } : t)))
      }
    } catch (err: any) {
      setError(err?.message || 'Could not update template status.')
    }
  }

  const markReviewed = async (tpl: ConsentTemplateRecord) => {
    try {
      if (isAuthenticatedClinic() && !tpl.id.startsWith('tpl-')) {
        const updated = await updateConsentTemplateApi(tpl.id, { isReviewed: true })
        setTemplates((prev) => prev.map((t) => (t.id === tpl.id ? updated : t)))
      } else {
        setTemplates((prev) => prev.map((t) => (t.id === tpl.id ? { ...t, isReviewed: true } : t)))
      }
      setNotice(`Template "${tpl.procedureType}" marked as clinic-reviewed.`)
    } catch (err: any) {
      setError(err?.message || 'Could not mark template as reviewed.')
    }
  }

  return (
    <section className="clinic-record-page" data-testid="feature-page-set.consent-templates" style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
        <div>
          <h2 style={{ margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '20px' }}>
            <FileCheck2 size={22} /> Procedure-Specific Consent Templates
          </h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '13.5px' }}>
            Configure, review, and version informed consent templates used automatically during surgery and procedure booking.
          </p>
        </div>

        <button type="button" onClick={openCreate} className="pat-btn pat-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={15} /> Create Template
        </button>
      </div>

      {error && <div role="alert" style={{ padding: '10px 14px', borderRadius: '8px', background: '#fee2e2', color: '#991b1b', marginBottom: '12px', fontSize: '13px' }}>{error}</div>}
      {notice && <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#dcfce7', color: '#166534', marginBottom: '12px', fontSize: '13px' }}>{notice}</div>}

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: '380px' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            className="pat-form-input"
            style={{ paddingLeft: '32px' }}
            placeholder="Search procedure or template title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="pat-form-select"
          style={{ width: 'auto', minWidth: '180px' }}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === 'ALL' ? 'All Categories' : cat}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>Loading consent templates…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '14px' }}>
          {filtered.map((tpl) => (
            <div
              key={tpl.id}
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                opacity: tpl.isActive ? 1 : 0.68,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#0b8185' }}>{tpl.procedureCategory}</div>
                  <strong style={{ fontSize: '14.5px', color: '#0f172a' }}>{tpl.procedureType}</strong>
                  <div style={{ fontSize: '12px', color: '#475569' }}>{tpl.title}</div>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    background: tpl.isActive ? '#dcfce7' : '#f1f5f9',
                    color: tpl.isActive ? '#166534' : '#475569',
                  }}
                >
                  {tpl.isActive ? `Active · v${tpl.version}` : `Inactive · v${tpl.version}`}
                </span>
              </div>

              <div style={{ fontSize: '12px', color: '#64748b', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {tpl.description}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ fontSize: '11.5px', color: tpl.isReviewed ? '#059669' : '#d97706', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={12} /> {tpl.isReviewed ? 'Clinic Reviewed' : 'Pending Review'}
                </span>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button type="button" onClick={() => setPreviewing(tpl)} className="pat-btn pat-btn-secondary" style={{ padding: '4px 8px', fontSize: '11.5px' }}>
                    <Eye size={12} /> Preview
                  </button>
                  <button type="button" onClick={() => openEdit(tpl)} className="pat-btn pat-btn-secondary" style={{ padding: '4px 8px', fontSize: '11.5px' }}>
                    <Edit3 size={12} /> Edit
                  </button>
                  {!tpl.isReviewed && (
                    <button type="button" onClick={() => markReviewed(tpl)} className="pat-btn pat-btn-secondary" style={{ padding: '4px 8px', fontSize: '11.5px' }}>
                      <ShieldCheck size={12} /> Approve
                    </button>
                  )}
                  <button type="button" onClick={() => toggleActive(tpl)} className="pat-btn pat-btn-secondary" style={{ padding: '4px 8px', fontSize: '11.5px' }}>
                    {tpl.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {(isCreating || editing) && (
        <div className="pat-modal-overlay" onClick={() => { setIsCreating(false); setEditing(null) }}>
          <div className="pat-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '740px', width: '94vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="pat-modal-header">
              <h3>{isCreating ? 'Create Consent Template' : `Edit Consent Template (v${editing?.version})`}</h3>
              <button type="button" onClick={() => { setIsCreating(false); setEditing(null) }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} style={{ overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="pat-form-group">
                  <label>Procedure Name *</label>
                  <input className="pat-form-input" value={form.procedureType || ''} onChange={(e) => setForm({ ...form, procedureType: e.target.value })} required />
                </div>
                <div className="pat-form-group">
                  <label>Category</label>
                  <select className="pat-form-select" value={form.procedureCategory || 'Oral Surgery'} onChange={(e) => setForm({ ...form, procedureCategory: e.target.value })}>
                    <option value="Oral Surgery">Oral Surgery</option>
                    <option value="Endodontics">Endodontics</option>
                    <option value="Prosthodontics">Prosthodontics</option>
                    <option value="Orthodontics">Orthodontics</option>
                    <option value="Periodontics">Periodontics</option>
                    <option value="Radiology">Radiology</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="pat-form-group">
                <label>Consent Title *</label>
                <input className="pat-form-input" value={form.title || ''} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>

              {[
                { key: 'description', label: 'Description of Procedure' },
                { key: 'purpose', label: 'Purpose of Treatment' },
                { key: 'benefits', label: 'Expected Benefits' },
                { key: 'risks', label: 'Common Risks and Complications' },
                { key: 'alternatives', label: 'Alternative Treatment Options' },
                { key: 'refusalConsequences', label: 'Consequences of Refusing or Delaying Treatment' },
                { key: 'postProcedureInstructions', label: 'Post-Procedure Instructions' },
                { key: 'patientDeclaration', label: 'Patient Declaration' },
                { key: 'dentistDeclaration', label: 'Dentist Declaration' },
              ].map((f) => (
                <div key={f.key} className="pat-form-group">
                  <label>{f.label}</label>
                  <textarea
                    className="pat-form-textarea"
                    rows={2}
                    value={(form as any)[f.key] || ''}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  />
                </div>
              ))}

              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '13px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="checkbox" checked={Boolean(form.isActive)} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input type="checkbox" checked={Boolean(form.isReviewed)} onChange={(e) => setForm({ ...form, isReviewed: e.target.checked })} /> Clinic Reviewed & Approved
                </label>
              </div>

              <div className="pat-modal-footer" style={{ paddingTop: '10px' }}>
                <button type="button" onClick={() => { setIsCreating(false); setEditing(null) }} className="pat-btn pat-btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="pat-btn pat-btn-primary">{saving ? 'Saving…' : 'Save Template'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewing && (
        <div className="pat-modal-overlay" onClick={() => setPreviewing(null)}>
          <div className="pat-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '680px', width: '92vw', maxHeight: '85vh', overflowY: 'auto', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0 }}>{previewing.title} (v{previewing.version})</h3>
              <button type="button" onClick={() => setPreviewing(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            {[
              { label: 'Procedure', val: previewing.procedureType },
              { label: 'Description', val: previewing.description },
              { label: 'Purpose', val: previewing.purpose },
              { label: 'Benefits', val: previewing.benefits },
              { label: 'Risks & Complications', val: previewing.risks },
              { label: 'Alternatives', val: previewing.alternatives },
              { label: 'Refusal Consequences', val: previewing.refusalConsequences },
              { label: 'Post-Procedure Instructions', val: previewing.postProcedureInstructions },
              { label: 'Patient Declaration', val: previewing.patientDeclaration },
              { label: 'Dentist Declaration', val: previewing.dentistDeclaration },
            ].map((row) => row.val ? (
              <div key={row.label} style={{ marginBottom: '10px', fontSize: '13px' }}>
                <strong>{row.label}:</strong>
                <div style={{ color: '#475569', marginTop: '2px' }}>{row.val}</div>
              </div>
            ) : null)}
          </div>
        </div>
      )}
    </section>
  )
}

export default ConsentTemplatesPage
