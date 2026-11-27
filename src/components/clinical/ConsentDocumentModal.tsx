import React, { useEffect, useState } from 'react'
import {
  X,
  FileDown,
  Printer,
  History,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  Stethoscope,
  RefreshCw,
} from 'lucide-react'
import {
  type PatientConsentRecord,
  type PatientRecord,
  isAuthenticatedClinic,
  mapRemoteConsent,
  upsertPatientConsentRecord,
} from '@/services/clinicStore'
import {
  cancelConsentApi,
  declineConsentApi,
  downloadConsentPdfFromBackend,
  fetchConsentHistoryApi,
  generateClientConsentPdf,
  getConsentStatusMeta,
  isConsentPending,
  isConsentSignedOrCompleted,
  replaceConsentApi,
  submitGuardianSignatureApi,
  submitPatientSignatureApi,
  verifyConsentDentistApi,
  type ConsentRevisionRecord,
} from '@/services/consentService'
import { canClinic, getPermissionUser } from '@/services/permissions'
import { SignaturePad, type SignatureInputMethod } from './SignaturePad'

interface ConsentDocumentModalProps {
  consent: PatientConsentRecord
  patient?: PatientRecord
  initialTab?: 'document' | 'sign' | 'verify' | 'history'
  onClose: () => void
  onUpdated?: (updated: PatientConsentRecord) => void
}

export const ConsentDocumentModal: React.FC<ConsentDocumentModalProps> = ({
  consent: initialConsent,
  patient,
  initialTab = 'document',
  onClose,
  onUpdated,
}) => {
  const [consent, setConsent] = useState<PatientConsentRecord>(initialConsent)
  const [activeView, setActiveView] = useState<'document' | 'sign' | 'verify' | 'history'>(initialTab)
  const [signerRole, setSignerRole] = useState<'patient' | 'guardian'>('patient')

  // Patient signature state
  const [patientAccepted, setPatientAccepted] = useState(false)
  const [patientSigData, setPatientSigData] = useState('')
  const [patientSigMethod, setPatientSigMethod] = useState<SignatureInputMethod>('DRAW_MOUSE')

  // Guardian signature state
  const [guardianName, setGuardianName] = useState('')
  const [guardianRelationship, setGuardianRelationship] = useState('')
  const [guardianAuthorized, setGuardianAuthorized] = useState(false)
  const [guardianAccepted, setGuardianAccepted] = useState(false)
  const [guardianSigData, setGuardianSigData] = useState('')
  const [guardianSigMethod, setGuardianSigMethod] = useState<SignatureInputMethod>('DRAW_MOUSE')

  // Dentist verification state
  const [dentistSigData, setDentistSigData] = useState('')
  const [dentistNotes, setDentistNotes] = useState('')

  // Decline / Cancel state
  const [declineMode, setDeclineMode] = useState(false)
  const [declineReason, setDeclineReason] = useState('')

  // History
  const [history, setHistory] = useState<ConsentRevisionRecord[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const permUser = getPermissionUser()
  const canVerifyDentist = !isAuthenticatedClinic() || canClinic(permUser, 'consent.verify')
  const canWriteConsent = !isAuthenticatedClinic() || canClinic(permUser, 'consent.write')

  const statusMeta = getConsentStatusMeta(consent.status)
  const snap = consent.consentContentSnapshot
  const sections = snap?.sections

  useEffect(() => {
    setConsent(initialConsent)
  }, [initialConsent])

  useEffect(() => {
    if (activeView === 'history' && isAuthenticatedClinic() && !consent.id.startsWith('cns-')) {
      setLoadingHistory(true)
      fetchConsentHistoryApi(consent.patientId, consent.id)
        .then((rows) => setHistory(Array.isArray(rows) ? rows : []))
        .catch(() => setHistory([]))
        .finally(() => setLoadingHistory(false))
    }
  }, [activeView, consent.id, consent.patientId])

  const applyUpdated = (updated: PatientConsentRecord) => {
    setConsent(updated)
    upsertPatientConsentRecord(updated)
    onUpdated?.(updated)
  }

  const handlePatientSign = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setNotice('')
    if (!patientAccepted) {
      setError('Please confirm that you have reviewed and accepted the consent terms.')
      return
    }
    if (!patientSigData) {
      setError('Please draw the patient signature before submitting.')
      return
    }

    setSaving(true)
    try {
      if (isAuthenticatedClinic() && !consent.id.startsWith('cns-')) {
        const res = await submitPatientSignatureApi(consent.patientId, consent.id, {
          signatureData: patientSigData,
          signatureMethod: patientSigMethod,
          accepted: true,
        })
        applyUpdated(mapRemoteConsent(res))
      } else {
        applyUpdated({
          ...consent,
          status: 'PATIENT_SIGNED',
          patientSignature: patientSigData,
          signatureData: patientSigData,
          patientSignedAt: new Date().toISOString(),
          patientSignatureMethod: patientSigMethod,
          patientAccepted: true,
        })
      }
      setNotice('Patient signature recorded. Awaiting dentist verification.')
      setActiveView('document')
    } catch (err: any) {
      setError(err?.message || 'Failed to submit patient signature.')
    } finally {
      setSaving(false)
    }
  }

  const handleGuardianSign = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setNotice('')
    if (!guardianName.trim() || !guardianRelationship.trim()) {
      setError('Guardian name and relationship to patient are required.')
      return
    }
    if (!guardianAuthorized || !guardianAccepted) {
      setError('Guardian authorization and explicit consent acceptance are required.')
      return
    }
    if (!guardianSigData) {
      setError('Please draw the guardian signature before submitting.')
      return
    }

    setSaving(true)
    try {
      if (isAuthenticatedClinic() && !consent.id.startsWith('cns-')) {
        const res = await submitGuardianSignatureApi(consent.patientId, consent.id, {
          guardianName: guardianName.trim(),
          guardianRelationship: guardianRelationship.trim(),
          guardianAuthorized: true,
          signatureData: guardianSigData,
          signatureMethod: guardianSigMethod,
          accepted: true,
        })
        applyUpdated(mapRemoteConsent(res))
      } else {
        applyUpdated({
          ...consent,
          status: 'PATIENT_SIGNED',
          guardianName: guardianName.trim(),
          guardianRelationship: guardianRelationship.trim(),
          guardianAuthorized: true,
          guardianSignature: guardianSigData,
          guardianSignedAt: new Date().toISOString(),
          patientSignedAt: consent.patientSignedAt || new Date().toISOString(),
          patientSignatureMethod: guardianSigMethod,
          patientAccepted: true,
          signatureData: consent.signatureData || guardianSigData,
        })
      }
      setNotice('Guardian signature recorded. Awaiting dentist verification.')
      setActiveView('document')
    } catch (err: any) {
      setError(err?.message || 'Failed to submit guardian signature.')
    } finally {
      setSaving(false)
    }
  }

  const handleDentistVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setNotice('')
    if (!dentistSigData) {
      setError('Please draw the dentist verification signature.')
      return
    }
    setSaving(true)
    try {
      if (isAuthenticatedClinic() && !consent.id.startsWith('cns-')) {
        const res = await verifyConsentDentistApi(consent.patientId, consent.id, {
          dentistSignature: dentistSigData,
          markCompleted: true,
          notes: dentistNotes.trim() || undefined,
        })
        applyUpdated(mapRemoteConsent(res))
      } else {
        applyUpdated({
          ...consent,
          status: 'COMPLETED',
          dentistSignature: dentistSigData,
          dentistVerifiedBy: consent.doctorName || 'Attending Dentist',
          verifiedAt: new Date().toISOString(),
          notes: dentistNotes.trim() || consent.notes,
        })
      }
      setNotice('Consent verified by dentist and marked Completed.')
      setActiveView('document')
    } catch (err: any) {
      setError(err?.message || 'Failed to verify consent.')
    } finally {
      setSaving(false)
    }
  }

  const handleDecline = async () => {
    setError('')
    setSaving(true)
    try {
      if (isAuthenticatedClinic() && !consent.id.startsWith('cns-')) {
        const res = await declineConsentApi(consent.patientId, consent.id, declineReason.trim() || 'Patient declined consent')
        applyUpdated(mapRemoteConsent(res))
      } else {
        applyUpdated({
          ...consent,
          status: 'DECLINED',
          declinedReason: declineReason.trim() || 'Patient declined consent',
          declinedAt: new Date().toISOString(),
        })
      }
      setDeclineMode(false)
      setNotice('Consent marked as Declined.')
    } catch (err: any) {
      setError(err?.message || 'Failed to decline consent.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = async () => {
    if (!window.confirm('Mark this pending consent record as Cancelled?')) return
    setError('')
    setSaving(true)
    try {
      if (isAuthenticatedClinic() && !consent.id.startsWith('cns-')) {
        const res = await cancelConsentApi(consent.patientId, consent.id, 'Cancelled by clinic staff')
        applyUpdated(mapRemoteConsent(res))
      } else {
        applyUpdated({
          ...consent,
          status: 'CANCELLED',
          cancelledReason: 'Cancelled by clinic staff',
          cancelledAt: new Date().toISOString(),
        })
      }
      setNotice('Consent marked as Cancelled.')
    } catch (err: any) {
      setError(err?.message || 'Failed to cancel consent.')
    } finally {
      setSaving(false)
    }
  }

  const handleReplace = async () => {
    if (!window.confirm('Create a new consent version? The existing signed document will be preserved unchanged.')) return
    setError('')
    setSaving(true)
    try {
      if (isAuthenticatedClinic() && !consent.id.startsWith('cns-')) {
        const res = await replaceConsentApi(consent.patientId, consent.id)
        const replacement = mapRemoteConsent(res)
        upsertPatientConsentRecord(replacement)
        setConsent(replacement)
        onUpdated?.(replacement)
        setNotice(`New consent version v${replacement.documentVersion} created.`)
      } else {
        const replacement: PatientConsentRecord = {
          ...consent,
          id: `cns-${Date.now()}`,
          documentVersion: (consent.documentVersion || 1) + 1,
          replacesConsentId: consent.id,
          status: 'PENDING_SIGNATURE',
          patientSignature: undefined,
          signatureData: undefined,
          patientSignedAt: undefined,
          patientAccepted: false,
          guardianSignature: undefined,
          guardianSignedAt: undefined,
          dentistSignature: undefined,
          verifiedAt: undefined,
          documentRef: `DMX-CNS-${Date.now().toString().slice(-6)}`,
          createdAt: new Date().toISOString(),
        }
        upsertPatientConsentRecord(replacement)
        setConsent(replacement)
        onUpdated?.(replacement)
        setNotice(`New consent version v${replacement.documentVersion} created.`)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to create replacement consent.')
    } finally {
      setSaving(false)
    }
  }

  const handleDownloadPdf = async () => {
    try {
      if (isAuthenticatedClinic() && !consent.id.startsWith('cns-')) {
        await downloadConsentPdfFromBackend(
          consent.patientId,
          consent.id,
          `Consent_${(consent.documentRef || consent.id).replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
        )
        return
      }
    } catch {
      // Fallback to client-side jsPDF if backend stream unavailable
    }
    generateClientConsentPdf(consent, patient)
  }

  const handlePrint = () => {
    window.print()
  }

  const patientDisplayName = snap?.patient?.name || (patient ? `${patient.firstName} ${patient.lastName}`.trim() : '—')
  const patientDisplayId = snap?.patient?.id || patient?.id || consent.patientId || '—'
  const patientDisplayAge = snap?.patient?.age ?? patient?.age ?? '—'
  const patientDisplayGender = snap?.patient?.gender || patient?.gender || '—'
  const patientDisplayMobile = snap?.patient?.mobile || (patient?.mobile ? `${patient.countryCode || '+91'} ${patient.mobile}` : '—')
  const patientDisplayAddress =
    snap?.patient?.address ||
    (patient ? [patient.address, patient.city, patient.state].filter(Boolean).join(', ') || '—' : '—')

  return (
    <div className="pat-modal-overlay" onClick={onClose}>
      <div
        className="pat-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '860px', width: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        data-testid="consent-document-modal"
      >
        {/* Header */}
        <div className="pat-modal-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '17px' }}>{snap?.title || consent.consentType}</h3>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  padding: '3px 9px',
                  borderRadius: '999px',
                  background: statusMeta.bg,
                  color: statusMeta.color,
                  border: `1px solid ${statusMeta.border}`,
                }}
                data-testid="consent-modal-status"
              >
                {statusMeta.label}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Ref: {consent.documentRef || consent.id} · Template v{consent.templateVersion ?? 1} · Document v{consent.documentVersion ?? 1}
            </div>
          </div>

          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        {/* Sub-navigation + Actions Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 20px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setActiveView('document')}
              className={`pat-btn ${activeView === 'document' ? 'pat-btn-primary' : 'pat-btn-secondary'}`}
              style={{ padding: '5px 11px', fontSize: '12.5px' }}
            >
              Document
            </button>
            {isConsentPending(consent.status) && canWriteConsent && (
              <button
                type="button"
                onClick={() => setActiveView('sign')}
                className={`pat-btn ${activeView === 'sign' ? 'pat-btn-primary' : 'pat-btn-secondary'}`}
                style={{ padding: '5px 11px', fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <UserCheck size={13} /> E-Sign Consent
              </button>
            )}
            {consent.status === 'PATIENT_SIGNED' && canVerifyDentist && (
              <button
                type="button"
                onClick={() => setActiveView('verify')}
                className={`pat-btn ${activeView === 'verify' ? 'pat-btn-primary' : 'pat-btn-secondary'}`}
                style={{ padding: '5px 11px', fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                <Stethoscope size={13} /> Dentist Verify
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveView('history')}
              className={`pat-btn ${activeView === 'history' ? 'pat-btn-primary' : 'pat-btn-secondary'}`}
              style={{ padding: '5px 11px', fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <History size={13} /> History
            </button>
          </div>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="pat-btn pat-btn-secondary"
              style={{ padding: '5px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <FileDown size={13} /> Download PDF
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="pat-btn pat-btn-secondary"
              style={{ padding: '5px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <Printer size={13} /> Print
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="pat-modal-body" style={{ overflowY: 'auto', flex: 1, padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {error && (
            <div role="alert" style={{ padding: '10px 12px', borderRadius: '8px', background: '#fee2e2', color: '#991b1b', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={15} /> {error}
            </div>
          )}
          {notice && (
            <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#dcfce7', color: '#166534', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={15} /> {notice}
            </div>
          )}

          {activeView === 'document' && (
            <>
              {/* Patient & Appointment Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '12.5px' }}>
                  <div style={{ fontWeight: 700, marginBottom: '6px', color: '#0f172a' }}>Patient Details</div>
                  <div><strong>Name:</strong> {patientDisplayName}</div>
                  <div><strong>Patient ID:</strong> {patientDisplayId}</div>
                  <div><strong>Age / Gender:</strong> {patientDisplayAge} / {patientDisplayGender}</div>
                  <div><strong>Mobile:</strong> {patientDisplayMobile}</div>
                  <div><strong>Address:</strong> {patientDisplayAddress}</div>
                </div>

                <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '12.5px' }}>
                  <div style={{ fontWeight: 700, marginBottom: '6px', color: '#0f172a' }}>Procedure & Appointment</div>
                  <div><strong>Procedure:</strong> {consent.procedureName || consent.consentType}</div>
                  <div><strong>Dentist:</strong> {consent.doctorName || snap?.procedure?.dentistName || '—'}</div>
                  <div><strong>Clinic:</strong> {snap?.clinic?.name || 'DocMatrix Dental Clinic'}</div>
                  <div><strong>Appointment:</strong> {snap?.appointment?.date || consent.dateRecorded} {snap?.appointment?.time ? `at ${snap.appointment.time}` : ''}</div>
                  <div><strong>Appointment ID:</strong> {snap?.appointment?.bookingRef || consent.appointmentId || '—'}</div>
                  {(consent.consultationId || snap?.appointment?.consultationId) && (
                    <div><strong>Consultation ID:</strong> {consent.consultationId || snap?.appointment?.consultationId}</div>
                  )}
                  {(consent.toothNumber || consent.treatmentArea || snap?.procedure?.treatmentPlanTitle) && (
                    <div>
                      <strong>Tooth / Area:</strong> {consent.toothNumber || consent.treatmentArea || '—'}
                      {snap?.procedure?.treatmentPlanTitle ? ` · Plan: ${snap.procedure.treatmentPlanTitle}` : ''}
                    </div>
                  )}
                </div>
              </div>

              {/* Consent Sections */}
              {sections ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', lineHeight: 1.55, color: '#334155' }}>
                  {[
                    { title: 'Description of Procedure', body: sections.description },
                    { title: 'Purpose of Treatment', body: sections.purpose },
                    { title: 'Expected Benefits', body: sections.benefits },
                    { title: 'Common Risks and Complications', body: sections.risks },
                    { title: 'Alternative Treatment Options', body: sections.alternatives },
                    { title: 'Consequences of Refusing or Delaying Treatment', body: sections.refusalConsequences },
                    { title: 'Post-Procedure Instructions', body: sections.postProcedureInstructions },
                    { title: 'Patient Declaration', body: sections.patientDeclaration },
                    { title: 'Dentist Declaration', body: sections.dentistDeclaration },
                  ]
                    .filter((s) => Boolean(s.body))
                    .map((sec) => (
                      <div key={sec.title} style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: '4px', fontSize: '13px' }}>{sec.title}</div>
                        <div style={{ whiteSpace: 'pre-line' }}>{sec.body}</div>
                      </div>
                    ))}
                </div>
              ) : (
                <div style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', fontSize: '13px', whiteSpace: 'pre-line' }}>
                  {consent.consentText || 'No detailed consent wording recorded.'}
                </div>
              )}

              {/* Signatures Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <div style={{ fontWeight: 700, fontSize: '12.5px', marginBottom: '6px' }}>Patient Signature</div>
                  {(consent.patientSignature || consent.signatureData)?.startsWith('data:image/') ? (
                    <img src={consent.patientSignature || consent.signatureData} alt="Patient Signature" style={{ maxHeight: '64px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '4px' }} />
                  ) : (
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {consent.patientSignature || consent.signatureData || 'Pending patient signature'}
                    </div>
                  )}
                  {consent.patientSignedAt && (
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                      Signed: {new Date(consent.patientSignedAt).toLocaleString()} ({consent.patientSignatureMethod || 'Digital'})
                    </div>
                  )}
                </div>

                {(consent.guardianSignature || consent.guardianName) && (
                  <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <div style={{ fontWeight: 700, fontSize: '12.5px', marginBottom: '6px' }}>Guardian Signature</div>
                    {consent.guardianSignature?.startsWith('data:image/') && (
                      <img src={consent.guardianSignature} alt="Guardian Signature" style={{ maxHeight: '64px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '4px' }} />
                    )}
                    <div style={{ fontSize: '11.5px', color: '#475569', marginTop: '4px' }}>
                      {consent.guardianName} ({consent.guardianRelationship})
                    </div>
                    {consent.guardianSignedAt && (
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        Signed: {new Date(consent.guardianSignedAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                  <div style={{ fontWeight: 700, fontSize: '12.5px', marginBottom: '6px' }}>Dentist Verification</div>
                  {consent.dentistSignature?.startsWith('data:image/') ? (
                    <img src={consent.dentistSignature} alt="Dentist Signature" style={{ maxHeight: '64px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: '4px' }} />
                  ) : (
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      {consent.verifiedAt ? 'Verified' : 'Pending dentist verification'}
                    </div>
                  )}
                  {consent.verifiedAt && (
                    <div style={{ fontSize: '11px', color: '#166534', marginTop: '4px' }}>
                      Verified by {consent.dentistVerifiedBy || consent.doctorName || 'Dentist'} on {new Date(consent.verifiedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons inside Document view */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', paddingTop: '6px' }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {isConsentPending(consent.status) && canWriteConsent && (
                    <>
                      <button type="button" onClick={() => setActiveView('sign')} className="pat-btn pat-btn-primary">
                        Proceed to E-Signature
                      </button>
                      <button type="button" onClick={() => setDeclineMode((v) => !v)} className="pat-btn pat-btn-secondary">
                        Decline
                      </button>
                      <button type="button" onClick={handleCancel} disabled={saving} className="pat-btn pat-btn-secondary">
                        Cancel Consent
                      </button>
                    </>
                  )}
                  {consent.status === 'PATIENT_SIGNED' && canVerifyDentist && (
                    <button type="button" onClick={() => setActiveView('verify')} className="pat-btn pat-btn-primary">
                      <ShieldCheck size={14} /> Verify as Dentist
                    </button>
                  )}
                  {isConsentSignedOrCompleted(consent.status) && canWriteConsent && (
                    <button
                      type="button"
                      onClick={handleReplace}
                      disabled={saving}
                      className="pat-btn pat-btn-secondary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                    >
                      <RefreshCw size={13} /> Create Replacement Version
                    </button>
                  )}
                </div>
              </div>

              {declineMode && (
                <div style={{ padding: '12px', borderRadius: '8px', background: '#fff1f2', border: '1px solid #fecdd3', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 600 }}>Reason for Declining Consent</label>
                  <input
                    className="pat-form-input"
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    placeholder="Optional clinical reason..."
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={handleDecline} disabled={saving} className="pat-btn pat-btn-primary">
                      Confirm Decline
                    </button>
                    <button type="button" onClick={() => setDeclineMode(false)} className="pat-btn pat-btn-secondary">
                      Back
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {activeView === 'sign' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setSignerRole('patient')}
                  className={`pat-btn ${signerRole === 'patient' ? 'pat-btn-primary' : 'pat-btn-secondary'}`}
                >
                  Patient Signature
                </button>
                <button
                  type="button"
                  onClick={() => setSignerRole('guardian')}
                  className={`pat-btn ${signerRole === 'guardian' ? 'pat-btn-primary' : 'pat-btn-secondary'}`}
                >
                  Guardian / Representative
                </button>
              </div>

              {signerRole === 'patient' ? (
                <form onSubmit={handlePatientSign} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ padding: '12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '13px' }}>
                    <strong>Patient Declaration:</strong>
                    <p style={{ margin: '6px 0 0 0', color: '#334155' }}>
                      {sections?.patientDeclaration ||
                        'I confirm that I have reviewed the procedure details, benefits, risks, and alternatives and voluntarily consent to this treatment.'}
                    </p>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={patientAccepted}
                      onChange={(e) => setPatientAccepted(e.target.checked)}
                      data-testid="patient-consent-accept-checkbox"
                    />
                    <span>
                      I, <strong>{patientDisplayName}</strong>, have read and understood this consent form and agree to proceed.
                    </span>
                  </label>

                  <SignaturePad
                    label="Sign Here (Patient)"
                    value={patientSigData}
                    onChange={(dataUrl, method) => {
                      setPatientSigData(dataUrl)
                      setPatientSigMethod(method)
                    }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button type="button" onClick={() => setActiveView('document')} className="pat-btn pat-btn-secondary">
                      Back
                    </button>
                    <button type="submit" disabled={saving} className="pat-btn pat-btn-primary" data-testid="submit-patient-signature-btn">
                      {saving ? 'Submitting…' : 'Submit Patient Signature'}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleGuardianSign} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="pat-form-group">
                      <label>Guardian / Representative Full Name *</label>
                      <input
                        className="pat-form-input"
                        value={guardianName}
                        onChange={(e) => setGuardianName(e.target.value)}
                        placeholder="e.g. Suresh Kumar"
                        required
                      />
                    </div>
                    <div className="pat-form-group">
                      <label>Relationship to Patient *</label>
                      <input
                        className="pat-form-input"
                        value={guardianRelationship}
                        onChange={(e) => setGuardianRelationship(e.target.value)}
                        placeholder="e.g. Father / Mother / Legal Guardian"
                        required
                      />
                    </div>
                  </div>

                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={guardianAuthorized}
                      onChange={(e) => setGuardianAuthorized(e.target.checked)}
                    />
                    <span>I confirm that I am the legally authorized guardian/representative for {patientDisplayName}.</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={guardianAccepted}
                      onChange={(e) => setGuardianAccepted(e.target.checked)}
                    />
                    <span>I have reviewed and accepted all risks, benefits, and alternatives on behalf of the patient.</span>
                  </label>

                  <SignaturePad
                    label="Sign Here (Guardian)"
                    value={guardianSigData}
                    onChange={(dataUrl, method) => {
                      setGuardianSigData(dataUrl)
                      setGuardianSigMethod(method)
                    }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button type="button" onClick={() => setActiveView('document')} className="pat-btn pat-btn-secondary">
                      Back
                    </button>
                    <button type="submit" disabled={saving} className="pat-btn pat-btn-primary">
                      {saving ? 'Submitting…' : 'Submit Guardian Signature'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeView === 'verify' && (
            <form onSubmit={handleDentistVerify} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ padding: '12px', borderRadius: '8px', background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: '13px', color: '#1e3a8a' }}>
                <strong>Dentist Verification:</strong>
                <p style={{ margin: '6px 0 0 0' }}>
                  {sections?.dentistDeclaration ||
                    'I confirm that I have explained the procedure, risks, benefits, and alternatives and verified the patient/guardian signature.'}
                </p>
              </div>

              <div className="pat-form-group">
                <label>Verification Notes (Optional)</label>
                <textarea
                  className="pat-form-textarea"
                  rows={2}
                  value={dentistNotes}
                  onChange={(e) => setDentistNotes(e.target.value)}
                  placeholder="Any clinical verification remarks..."
                />
              </div>

              <SignaturePad
                label="Dentist Verification Signature"
                value={dentistSigData}
                onChange={(dataUrl) => setDentistSigData(dataUrl)}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setActiveView('document')} className="pat-btn pat-btn-secondary">
                  Back
                </button>
                <button type="submit" disabled={saving} className="pat-btn pat-btn-primary" data-testid="submit-dentist-verify-btn">
                  {saving ? 'Verifying…' : 'Verify & Complete Consent'}
                </button>
              </div>
            </form>
          )}

          {activeView === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h4 style={{ margin: 0, fontSize: '14px' }}>Consent Audit History</h4>
              {loadingHistory ? (
                <div style={{ fontSize: '13px', color: '#64748b' }}>Loading audit history…</div>
              ) : history.length > 0 ? (
                history.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                      fontSize: '12.5px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <strong>{item.action}</strong>
                      <div style={{ color: '#64748b', fontSize: '11.5px' }}>
                        Actor: {item.actorId} · Hash: {item.evidenceHash.slice(0, 14)}…
                      </div>
                    </div>
                    <div style={{ color: '#64748b', fontSize: '11.5px' }}>
                      {new Date(item.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: '13px', color: '#64748b' }}>
                  Created on {consent.dateRecorded} by {consent.recordedBy}. Status: {statusMeta.label}.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
