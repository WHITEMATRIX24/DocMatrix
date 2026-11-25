import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  Printer,
  Download,
  Save,
  CheckCircle2,
  AlertTriangle,
  Search,
  User,
  Calendar,
  Stethoscope,
  Smile,
  Activity,
  TrendingUp,
  Send,
  Edit3,
  Eye,
  History,
  X,
  Sparkles,
  ChevronRight,
  Copy,
  Check,
  Building,
  Phone,
  Mail,
  ShieldAlert,
} from 'lucide-react';
import { useClinicData, PatientRecord } from '@/services/clinicStore';
import {
  DENTAL_REPORT_TYPES,
  DentalReportType,
  DentalReportData,
  DentalReportSection,
  SavedDentalReportItem,
  generateDentalReport,
  saveDentalReport,
  fetchSavedPatientReports,
} from '@/services/dentalReportsApi';
import { downloadDentalReportPdf } from '@/services/dentalReportPdf';
import './dentalReports.css';

export const DentalReportsPage: React.FC = () => {
  const { patients = [], clinicalNotes = [] } = useClinicData();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Selected Patient
  const patientIdParam = searchParams.get('patientId') || '';
  const [selectedPatientId, setSelectedPatientId] = useState<string>(() => {
    if (patientIdParam) return patientIdParam;
    return patients[0]?.id || '';
  });

  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);

  // Active Report Type
  const [activeReportType, setActiveReportType] = useState<DentalReportType>(
    (searchParams.get('type') as DentalReportType) || 'CLINICAL_SUMMARY'
  );

  // Filtering & Consultation Selection
  const [selectedConsultationId, setSelectedConsultationId] = useState<string>('');
  const [dateRange, setDateRange] = useState<'all' | '30d' | '90d' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Referral Parameters
  const [referralSpecialty, setReferralSpecialty] = useState('Oral & Maxillofacial Surgery');
  const [referralDoctor, setReferralDoctor] = useState('');
  const [referralClinic, setReferralClinic] = useState('');
  const [referralReason, setReferralReason] = useState('');
  const [customNotes, setCustomNotes] = useState('');

  // Report Generation State
  const [reportData, setReportData] = useState<DentalReportData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // View / Edit Modes
  const [activeViewMode, setActiveViewMode] = useState<'preview' | 'edit'>('preview');
  const [editableTitle, setEditableTitle] = useState('');
  const [editableSummary, setEditableSummary] = useState('');
  const [editableSections, setEditableSections] = useState<DentalReportSection[]>([]);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Saved Reports Drawer
  const [isSavedDrawerOpen, setIsSavedDrawerOpen] = useState(false);
  const [savedReports, setSavedReports] = useState<SavedDentalReportItem[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);

  // Selected patient object
  const selectedPatient = useMemo(() => {
    return (
      patients.find(
        (p) =>
          p.id.toLowerCase() === selectedPatientId.toLowerCase() ||
          p.patientCode?.toLowerCase() === selectedPatientId.toLowerCase()
      ) || patients[0] || null
    );
  }, [patients, selectedPatientId]);

  // Patient's consultations
  const patientConsultations = useMemo(() => {
    if (!selectedPatient) return [];
    return clinicalNotes.filter(
      (n) => n.patientId === selectedPatient.id || n.patient?.id === selectedPatient.id
    );
  }, [clinicalNotes, selectedPatient]);

  // Filtered patients for dropdown search
  const filteredPatients = useMemo(() => {
    if (!patientSearchQuery.trim()) return patients.slice(0, 8);
    const q = patientSearchQuery.toLowerCase();
    return patients
      .filter(
        (p) =>
          p.firstName?.toLowerCase().includes(q) ||
          p.lastName?.toLowerCase().includes(q) ||
          p.patientCode?.toLowerCase().includes(q) ||
          p.mobile?.includes(q)
      )
      .slice(0, 10);
  }, [patients, patientSearchQuery]);

  // Sync selected patient from searchParams if present
  useEffect(() => {
    if (patientIdParam && patientIdParam !== selectedPatientId) {
      setSelectedPatientId(patientIdParam);
    }
  }, [patientIdParam]);

  // Automatically trigger report generation when patient or type changes
  const handleGenerateReport = async () => {
    if (!selectedPatient) return;
    setIsGenerating(true);
    setSaveSuccessMessage(null);

    let start = customStartDate;
    let end = customEndDate;
    if (dateRange === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      start = d.toISOString().slice(0, 10);
    } else if (dateRange === '90d') {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      start = d.toISOString().slice(0, 10);
    }

    try {
      const result = await generateDentalReport({
        patientId: selectedPatient.id,
        reportType: activeReportType,
        consultationId: selectedConsultationId || undefined,
        startDate: start || undefined,
        endDate: end || undefined,
        referralSpecialty: activeReportType === 'REFERRAL' ? referralSpecialty : undefined,
        referralReason: activeReportType === 'REFERRAL' ? referralReason : undefined,
        referralDoctor: activeReportType === 'REFERRAL' ? referralDoctor : undefined,
        referralClinic: activeReportType === 'REFERRAL' ? referralClinic : undefined,
        customNotes: customNotes || undefined,
      });

      setReportData(result);
      setEditableTitle(result.title);
      setEditableSummary(result.executiveSummary);
      setEditableSections(result.sections || []);
      setActiveViewMode('preview');
    } catch (err) {
      console.error('[DentalReports] Failed to generate report:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (selectedPatient) {
      handleGenerateReport();
    }
  }, [selectedPatient?.id, activeReportType]);

  // Handle Save to Medical Records
  const handleSaveToRecords = async () => {
    if (!reportData || !selectedPatient) return;
    setIsSaving(true);
    setSaveSuccessMessage(null);

    const payloadToSave: DentalReportData = {
      ...reportData,
      title: editableTitle || reportData.title,
      executiveSummary: editableSummary || reportData.executiveSummary,
      sections: editableSections,
      audit: {
        isFinalized: true,
        source: 'DOCMATRIX_FINALIZED_CLINICAL_REPORT',
        version: '1.0',
      },
    };

    try {
      const res = await saveDentalReport({
        patientId: selectedPatient.id,
        reportType: activeReportType,
        title: editableTitle || reportData.title,
        content: payloadToSave,
        doctorName: reportData.doctorSignoff.doctorName,
        consultationId: selectedConsultationId || undefined,
        notes: editableSummary,
      });

      if (res.success) {
        setSaveSuccessMessage('Report successfully saved to patient medical records.');
        // Refresh saved reports if drawer is open
        if (isSavedDrawerOpen) {
          loadSavedReports();
        }
      }
    } catch (err) {
      console.error('[DentalReports] Failed to save report:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Print PDF
  const handlePrint = () => {
    window.print();
  };

  // Copy Summary text
  const handleCopySummary = () => {
    if (!reportData) return;
    const text = `${reportData.title}\n\n${editableSummary || reportData.executiveSummary}\n\n${(
      editableSections || reportData.sections
    )
      .map((s) => `${s.title}:\n${s.content}`)
      .join('\n\n')}`;

    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  // Download direct PDF
  const handleDownloadPdf = () => {
    if (!reportData) return;
    downloadDentalReportPdf(
      reportData,
      editableTitle || reportData.title,
      editableSummary || reportData.executiveSummary,
      editableSections.length > 0 ? editableSections : reportData.sections
    );
  };

  // Load Saved Reports
  const loadSavedReports = async () => {
    if (!selectedPatient) return;
    setIsLoadingSaved(true);
    try {
      const list = await fetchSavedPatientReports(selectedPatient.id);
      setSavedReports(list);
    } catch (err) {
      console.error('[DentalReports] Error loading saved reports:', err);
    } finally {
      setIsLoadingSaved(false);
    }
  };

  const handleOpenSavedDrawer = () => {
    setIsSavedDrawerOpen(true);
    loadSavedReports();
  };

  const handleSelectPatient = (p: PatientRecord) => {
    setSelectedPatientId(p.id);
    setIsPatientDropdownOpen(false);
    setPatientSearchQuery('');
    setSearchParams({ patientId: p.id, type: activeReportType });
  };

  // Allergies check
  const hasAllergies =
    selectedPatient?.allergies === 'yes' ||
    Boolean(selectedPatient?.medicalSafetyAlerts?.allergies);

  return (
    <div className="dr-container">
      {/* Page Header (Hidden on Print) */}
      <div className="dr-header dr-no-print">
        <div className="dr-header-title">
          <div className="dr-header-icon">
            <Sparkles size={24} />
          </div>
          <div>
            <h1 className="dr-title">Automated Dental Reports</h1>
            <p className="dr-subtitle">
              Generate professional clinical summaries, treatment histories, odontogram examination reports, and referral letters.
            </p>
          </div>
        </div>
        <div className="dr-header-actions">
          <button
            className="dr-btn dr-btn-secondary"
            onClick={handleOpenSavedDrawer}
            title="View previously saved reports for this patient"
          >
            <History size={16} />
            <span>Saved Records ({savedReports.length > 0 ? savedReports.length : 'View'})</span>
          </button>
        </div>
      </div>

      {/* Patient Selector Card (Hidden on Print) */}
      <div className="dr-patient-selector-card dr-no-print">
        <div className="dr-patient-search-row">
          <div className="dr-patient-search-box">
            <Search size={16} className="dr-search-icon" />
            <input
              type="text"
              className="dr-patient-input"
              placeholder="Search patient by name, patient code (pt-1001), or mobile..."
              value={patientSearchQuery}
              onChange={(e) => {
                setPatientSearchQuery(e.target.value);
                setIsPatientDropdownOpen(true);
              }}
              onFocus={() => setIsPatientDropdownOpen(true)}
            />

            {isPatientDropdownOpen && (
              <div className="dr-dropdown-menu">
                {filteredPatients.length === 0 ? (
                  <div style={{ padding: '12px', color: '#94a3b8', fontSize: '13px' }}>
                    No matching patients found
                  </div>
                ) : (
                  filteredPatients.map((p) => (
                    <div
                      key={p.id}
                      className={`dr-dropdown-item ${p.id === selectedPatient?.id ? 'is-selected' : ''}`}
                      onClick={() => handleSelectPatient(p)}
                    >
                      <div>
                        <strong>
                          {p.firstName} {p.lastName}
                        </strong>{' '}
                        <span style={{ color: '#0d9488', fontSize: '12px' }}>
                          ({p.patientCode || p.id})
                        </span>
                      </div>
                      <div className="dr-patient-meta">
                        {p.gender} • {p.mobile || 'No phone'}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Selected Patient Banner */}
        {selectedPatient && (
          <div className="dr-patient-banner">
            <div className="dr-patient-banner-info">
              <div className="dr-patient-avatar">
                {selectedPatient.firstName?.[0] || 'P'}
                {selectedPatient.lastName?.[0] || ''}
              </div>
              <div>
                <div className="dr-patient-details-name">
                  {selectedPatient.firstName} {selectedPatient.lastName}
                </div>
                <div className="dr-patient-details-sub">
                  <span>ID: {selectedPatient.patientCode || selectedPatient.id}</span>
                  <span>•</span>
                  <span>{selectedPatient.gender}</span>
                  <span>•</span>
                  <span>Mobile: {selectedPatient.mobile || 'N/A'}</span>
                  <span>•</span>
                  <span>Consultations: {patientConsultations.length}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {hasAllergies && (
                <div className="dr-alert-pill">
                  <ShieldAlert size={14} />
                  <span>Allergies: {selectedPatient.allergiesDetails || 'Active Alert'}</span>
                </div>
              )}
              <button
                className="dr-btn dr-btn-secondary"
                style={{ padding: '6px 10px', fontSize: '12px' }}
                onClick={() => navigate(`/patients/${selectedPatient.id}`)}
              >
                <span>View Full Profile</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Left Config Panel + Right Live Report Sheet */}
      <div className="dr-main-grid">
        {/* Left Column: Report Types & Scope Configuration (Hidden on Print) */}
        <div className="dr-sidebar-panel dr-no-print">
          {/* 1. Report Type Picker */}
          <div className="dr-section-card">
            <div className="dr-section-title">
              <span>1. Select Report Type</span>
            </div>
            <div className="dr-type-list">
              {DENTAL_REPORT_TYPES.map((t) => {
                const isActive = activeReportType === t.type;
                return (
                  <div
                    key={t.type}
                    className={`dr-type-card ${isActive ? 'is-active' : ''}`}
                    title={t.description}
                    onClick={() => {
                      setActiveReportType(t.type);
                      setSearchParams({
                        patientId: selectedPatient?.id || '',
                        type: t.type,
                      });
                    }}
                  >
                    <div className="dr-type-header">
                      <div className="dr-type-name">
                        {t.type === 'CLINICAL_SUMMARY' && <FileText size={16} color="#0d9488" />}
                        {t.type === 'CONSULTATION' && <Stethoscope size={16} color="#2563eb" />}
                        {t.type === 'TREATMENT' && <Activity size={16} color="#16a34a" />}
                        {t.type === 'EXAMINATION' && <Smile size={16} color="#d97706" />}
                        {t.type === 'PROGRESS' && <TrendingUp size={16} color="#9333ea" />}
                        {t.type === 'REFERRAL' && <Send size={16} color="#ea580c" />}
                        <span>{t.title}</span>
                      </div>
                      <span className="dr-type-badge">{t.badge}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Scope & Parameters */}
          <div className="dr-section-card">
            <div className="dr-section-title">
              <span>2. Parameters & Scope</span>
            </div>

            {/* If Consultation Report: Pick specific visit */}
            {activeReportType === 'CONSULTATION' && (
              <div className="dr-form-group">
                <label className="dr-form-label">Select Consultation Visit</label>
                <select
                  className="dr-form-select"
                  value={selectedConsultationId}
                  onChange={(e) => setSelectedConsultationId(e.target.value)}
                >
                  <option value="">Latest Consultation Note</option>
                  {patientConsultations.map((note) => (
                    <option key={note.id} value={note.id}>
                      {new Date(note.consultationDate || note.createdAt).toLocaleDateString()} —{' '}
                      {note.chiefComplaint || 'Consultation'} ({note.doctorName || 'Dentist'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Range */}
            {activeReportType !== 'CONSULTATION' && (
              <div className="dr-form-group">
                <label className="dr-form-label">Clinical Date Range</label>
                <select
                  className="dr-form-select"
                  value={dateRange}
                  onChange={(e: any) => setDateRange(e.target.value)}
                >
                  <option value="all">All Historical Records</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>
            )}

            {dateRange === 'custom' && activeReportType !== 'CONSULTATION' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                <div>
                  <label className="dr-form-label" style={{ fontSize: '11px' }}>
                    From
                  </label>
                  <input
                    type="date"
                    className="dr-form-input"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="dr-form-label" style={{ fontSize: '11px' }}>
                    To
                  </label>
                  <input
                    type="date"
                    className="dr-form-input"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Referral Form fields */}
            {activeReportType === 'REFERRAL' && (
              <>
                <div className="dr-form-group">
                  <label className="dr-form-label">Referral Specialty</label>
                  <select
                    className="dr-form-select"
                    value={referralSpecialty}
                    onChange={(e) => setReferralSpecialty(e.target.value)}
                  >
                    <option value="Oral & Maxillofacial Surgery">Oral & Maxillofacial Surgery</option>
                    <option value="Endodontics & Conservative Dentistry">Endodontics</option>
                    <option value="Orthodontics & Dentofacial Orthopedics">Orthodontics</option>
                    <option value="Periodontics & Implantology">Periodontics & Implantology</option>
                    <option value="Prosthodontics & Crown/Bridge">Prosthodontics</option>
                    <option value="Pediatric Dentistry (Pedodontics)">Pedodontics</option>
                    <option value="General Hospital / Medical Oncology">Hospital / Medical Oncology</option>
                  </select>
                </div>

                <div className="dr-form-group">
                  <label className="dr-form-label">Specialist Doctor Name</label>
                  <input
                    type="text"
                    className="dr-form-input"
                    placeholder="e.g. Dr. Rajesh Pillai"
                    value={referralDoctor}
                    onChange={(e) => setReferralDoctor(e.target.value)}
                  />
                </div>

                <div className="dr-form-group">
                  <label className="dr-form-label">Referral Center / Hospital</label>
                  <input
                    type="text"
                    className="dr-form-input"
                    placeholder="e.g. Apollo Dental Specialty Hospital"
                    value={referralClinic}
                    onChange={(e) => setReferralClinic(e.target.value)}
                  />
                </div>

                <div className="dr-form-group">
                  <label className="dr-form-label">Reason for Referral</label>
                  <textarea
                    className="dr-form-textarea"
                    rows={2}
                    placeholder="e.g. Evaluation for surgical disimpaction of tooth #38 with proximity to mandibular canal..."
                    value={referralReason}
                    onChange={(e) => setReferralReason(e.target.value)}
                  />
                </div>
              </>
            )}

            <button
              className="dr-generate-btn"
              onClick={handleGenerateReport}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <span>Synthesizing Clinical Data...</span>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Generate Report</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Live Printable Report Sheet & Actions */}
        <div className="dr-content-panel">
          {/* Action Toolbar (Hidden on Print) */}
          <div className="dr-toolbar dr-no-print">
            <div className="dr-toolbar-left">
              <button
                className={`dr-view-tab ${activeViewMode === 'preview' ? 'is-active' : ''}`}
                onClick={() => setActiveViewMode('preview')}
              >
                <Eye size={15} />
                <span>Document View</span>
              </button>
              <button
                className={`dr-view-tab ${activeViewMode === 'edit' ? 'is-active' : ''}`}
                onClick={() => setActiveViewMode('edit')}
              >
                <Edit3 size={15} />
                <span>Edit Content</span>
              </button>
            </div>

            <div className="dr-toolbar-right">
              <button
                className="dr-btn dr-btn-secondary"
                onClick={handleCopySummary}
                title="Copy text report summary"
              >
                {copiedNotification ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                <span>{copiedNotification ? 'Copied' : 'Copy Text'}</span>
              </button>

              <button
                className="dr-btn dr-btn-primary"
                onClick={handleDownloadPdf}
                disabled={!reportData}
                title="Download report directly as a PDF document"
              >
                <Download size={14} />
                <span>Download PDF</span>
              </button>

              <button
                className="dr-btn dr-btn-secondary"
                onClick={handlePrint}
                title="Print report document"
              >
                <Printer size={14} />
                <span>Print</span>
              </button>

              <button
                className="dr-btn dr-btn-primary"
                onClick={handleSaveToRecords}
                disabled={isSaving || !reportData}
                title="Save finalized report to patient documents"
              >
                <Save size={14} />
                <span>{isSaving ? 'Saving...' : 'Save to Records'}</span>
              </button>
            </div>
          </div>

          {/* Save Success Banner */}
          {saveSuccessMessage && (
            <div
              className="dr-no-print"
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#15803d',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={16} />
              <span>{saveSuccessMessage}</span>
            </div>
          )}

          {/* EDIT MODE FORM */}
          {activeViewMode === 'edit' && reportData && (
            <div className="dr-section-card dr-no-print">
              <div className="dr-section-title">
                <span>Edit Report Content Before Finalizing</span>
                <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'none' }}>
                  Changes will reflect in preview and medical records
                </span>
              </div>

              <div className="dr-form-group">
                <label className="dr-form-label">Report Document Title</label>
                <input
                  type="text"
                  className="dr-form-input"
                  value={editableTitle}
                  onChange={(e) => setEditableTitle(e.target.value)}
                />
              </div>

              <div className="dr-form-group">
                <label className="dr-form-label">Executive Clinical Narrative</label>
                <textarea
                  className="dr-form-textarea"
                  rows={3}
                  value={editableSummary}
                  onChange={(e) => setEditableSummary(e.target.value)}
                />
              </div>

              <div style={{ marginTop: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '10px' }}>
                  Section Specific Notes
                </h4>
                {editableSections.map((sec, idx) => (
                  <div
                    key={sec.id}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '12px',
                      marginBottom: '12px',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a', marginBottom: '6px' }}>
                      {sec.title}
                    </div>
                    <textarea
                      className="dr-form-textarea"
                      rows={3}
                      value={sec.content}
                      onChange={(e) => {
                        const updated = [...editableSections];
                        updated[idx].content = e.target.value;
                        setEditableSections(updated);
                      }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  className="dr-btn dr-btn-primary"
                  onClick={() => setActiveViewMode('preview')}
                >
                  <Eye size={14} />
                  <span>Preview Formatted Document</span>
                </button>
              </div>
            </div>
          )}

          {/* LIVE PRINTABLE DOCUMENT SHEET */}
          {activeViewMode === 'preview' && (
            <div className="dr-report-sheet" id="dr-printable-sheet">
              {!reportData ? (
                <div className="dr-empty-state">
                  <div className="dr-empty-icon">
                    <FileText size={28} />
                  </div>
                  <div className="dr-empty-title">Ready to Generate Clinical Report</div>
                  <div className="dr-empty-sub">
                    Select a report type and clinical parameters on the left to synthesize the patient's records into a formal medical document.
                  </div>
                </div>
              ) : (
                <>
                  {/* Letterhead */}
                  <div className="dr-doc-letterhead">
                    <div>
                      <div className="dr-doc-clinic-name">
                        {reportData.clinic.name || 'DOCMATRIX DENTAL CLINIC'}
                      </div>
                      <div className="dr-doc-clinic-sub">
                        {reportData.clinic.address && <div>{reportData.clinic.address}</div>}
                        <div>
                          Phone: {reportData.clinic.phone || '+91 80 1234 5678'} • Email:{' '}
                          {reportData.clinic.email || 'care@docmatrix.test'}
                        </div>
                      </div>
                    </div>

                    <div className="dr-doc-report-tag">
                      <div className="dr-doc-report-id">{reportData.reportId}</div>
                      <div className="dr-doc-report-date">
                        Date: {new Date(reportData.generatedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Document Title */}
                  <div className="dr-doc-title-bar">
                    <h2 className="dr-doc-title">{editableTitle || reportData.title}</h2>
                  </div>

                  {/* Patient Demographic Box */}
                  <div className="dr-doc-patient-box">
                    <div>
                      <div className="dr-doc-field-label">Patient Name</div>
                      <div className="dr-doc-field-val">{reportData.patient.fullName}</div>
                    </div>
                    <div>
                      <div className="dr-doc-field-label">Patient Code / ID</div>
                      <div className="dr-doc-field-val">
                        {reportData.patient.patientCode || reportData.patient.id}
                      </div>
                    </div>
                    <div>
                      <div className="dr-doc-field-label">Age / Gender</div>
                      <div className="dr-doc-field-val">
                        {reportData.patient.age} / {reportData.patient.gender}
                      </div>
                    </div>
                    <div>
                      <div className="dr-doc-field-label">Contact Mobile</div>
                      <div className="dr-doc-field-val">
                        {reportData.patient.countryCode || '+91'} {reportData.patient.mobile || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="dr-doc-field-label">Treating Doctor</div>
                      <div className="dr-doc-field-val">{reportData.doctorSignoff.doctorName}</div>
                    </div>
                  </div>

                  {/* Executive Summary */}
                  <div className="dr-doc-summary-box">
                    <strong>Clinical Summary:</strong>{' '}
                    {editableSummary || reportData.executiveSummary}
                  </div>

                  {/* Report Sections */}
                  {(editableSections.length > 0 ? editableSections : reportData.sections).map((sec) => (
                    <div key={sec.id} className="dr-doc-section">
                      <div className="dr-doc-section-header">
                        <span>{sec.title}</span>
                        {sec.badge && (
                          <span
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: sec.badge.includes('Alert') ? '#fee2e2' : '#f1f5f9',
                              color: sec.badge.includes('Alert') ? '#b91c1c' : '#475569',
                              fontWeight: 600,
                            }}
                          >
                            {sec.badge}
                          </span>
                        )}
                      </div>

                      <div className="dr-doc-section-content">{sec.content}</div>

                      {/* Render Table Data if available */}
                      {sec.tableData && sec.tableData.length > 0 && (
                        <table className="dr-doc-table">
                          <thead>
                            <tr>
                              {Object.keys(sec.tableData[0]).map((col) => (
                                <th key={col} style={{ textTransform: 'capitalize' }}>
                                  {col.replace(/([A-Z])/g, ' $1')}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sec.tableData.map((row, rIdx) => (
                              <tr key={rIdx}>
                                {Object.values(row).map((val, cIdx) => (
                                  <td key={cIdx}>{String(val)}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  ))}

                  {/* Odontogram Summary Badge Grid (if chart data present) */}
                  {reportData.odontogramSummary && (
                    <div className="dr-doc-section">
                      <div className="dr-doc-section-header">
                        <span>Dental Charting Overview (FDI Notation)</span>
                      </div>
                      <div className="dr-doc-odont-grid">
                        <div className="dr-doc-odont-item">
                          <div className="dr-doc-odont-label" style={{ color: '#dc2626' }}>
                            Active Caries
                          </div>
                          <div className="dr-doc-odont-val">
                            {reportData.odontogramSummary.caries.join(', ') || 'None'}
                          </div>
                        </div>

                        <div className="dr-doc-odont-item">
                          <div className="dr-doc-odont-label" style={{ color: '#2563eb' }}>
                            Restorations
                          </div>
                          <div className="dr-doc-odont-val">
                            {reportData.odontogramSummary.restored.join(', ') || 'None'}
                          </div>
                        </div>

                        <div className="dr-doc-odont-item">
                          <div className="dr-doc-odont-label" style={{ color: '#7c3aed' }}>
                            Root Canal (RCT)
                          </div>
                          <div className="dr-doc-odont-val">
                            {reportData.odontogramSummary.rct.join(', ') || 'None'}
                          </div>
                        </div>

                        <div className="dr-doc-odont-item">
                          <div className="dr-doc-odont-label" style={{ color: '#d97706' }}>
                            Crowns / Bridges
                          </div>
                          <div className="dr-doc-odont-val">
                            {reportData.odontogramSummary.crowns.join(', ') || 'None'}
                          </div>
                        </div>

                        <div className="dr-doc-odont-item">
                          <div className="dr-doc-odont-label" style={{ color: '#64748b' }}>
                            Missing Teeth
                          </div>
                          <div className="dr-doc-odont-val">
                            {reportData.odontogramSummary.missing.join(', ') || 'None'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Doctor Sign-off Block */}
                  <div className="dr-doc-signoff-block">
                    <div>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>
                        System Verified Clinical Document
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                        Generated via DocMatrix Automated Clinical Reporting Engine
                      </div>
                    </div>

                    <div className="dr-doc-signoff-doc">
                      <div className="dr-doc-sign-line">
                        {reportData.doctorSignoff.signatureLine}
                      </div>
                      <div className="dr-doc-sign-name">
                        {reportData.doctorSignoff.doctorName}
                      </div>
                      <div className="dr-doc-sign-title">
                        {reportData.doctorSignoff.doctorTitle}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        Reg: {reportData.doctorSignoff.registrationNumber} • Date:{' '}
                        {reportData.doctorSignoff.signoffDate}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* SAVED REPORTS HISTORY MODAL */}
      {isSavedDrawerOpen && (
        <div className="dr-saved-reports-modal dr-no-print">
          <div className="dr-saved-dialog">
            <div className="dr-saved-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <History size={18} color="#0d9488" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                  Saved Dental Reports: {selectedPatient?.firstName} {selectedPatient?.lastName}
                </h3>
              </div>
              <button
                className="dr-btn dr-btn-secondary"
                style={{ padding: '4px', border: 'none' }}
                onClick={() => setIsSavedDrawerOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="dr-saved-body">
              {isLoadingSaved ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Loading saved reports...
                </div>
              ) : savedReports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  No saved reports on file for this patient yet. Generate and click "Save to Records"
                  to archive reports here.
                </div>
              ) : (
                savedReports.map((item) => (
                  <div key={item.id} className="dr-saved-card">
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>
                        {item.title}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                        Type: <strong>{item.reportType}</strong> • Doctor: {item.doctorName || 'Dentist'} •{' '}
                        {new Date(item.createdAt).toLocaleDateString()}
                      </div>
                      {item.summary && (
                        <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px', fontStyle: 'italic' }}>
                          "{item.summary.slice(0, 120)}..."
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="dr-btn dr-btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                        onClick={() => {
                          if (item.reportData) {
                            setReportData(item.reportData);
                            setEditableTitle(item.reportData.title);
                            setEditableSummary(item.reportData.executiveSummary);
                            setEditableSections(item.reportData.sections);
                            setActiveViewMode('preview');
                            setIsSavedDrawerOpen(false);
                          }
                        }}
                      >
                        <Eye size={13} />
                        <span>View</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DentalReportsPage;
