import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Printer,
  CheckCircle2,
  Clock,
  Eye,
  Edit3,
  RotateCw,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import {
  useClinicData,
  ClinicalNoteRecord,
  refreshClinicalNotes,
  finalizeClinicalNote,
} from '../../services/clinicStore';
import { ClinicalNoteModal } from '../../components/clinical/ClinicalNoteModal';
import { ClinicalNoteDetailsModal } from '../../components/clinical/ClinicalNoteDetailsModal';
import { ClinicalNotePrintModal } from '../../components/clinical/ClinicalNotePrintModal';
import './clinicalNotes.css';

export const ClinicalNotesPage: React.FC = () => {
  const { clinicalNotes = [], patients = [] } = useClinicData();
  const [params] = useSearchParams();

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'FINALIZED' | 'DRAFT'>('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const initialPatientParam = params.get('patientId') || '';

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<ClinicalNoteRecord | null>(null);
  const [viewingNote, setViewingNote] = useState<ClinicalNoteRecord | null>(null);
  const [printingNote, setPrintingNote] = useState<ClinicalNoteRecord | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshClinicalNotes();
    setRefreshing(false);
  };

  const handleFinalizeDraft = async (note: ClinicalNoteRecord) => {
    try {
      await finalizeClinicalNote(note.id);
      if (viewingNote?.id === note.id) {
        setViewingNote((prev) => (prev ? { ...prev, status: 'FINALIZED' } : null));
      }
    } catch (err) {
      console.error('Failed to finalize clinical note:', err);
    }
  };

  // Metrics
  const totalCount = clinicalNotes.length;
  const finalizedCount = clinicalNotes.filter((n) => n.status === 'FINALIZED').length;
  const draftCount = clinicalNotes.filter((n) => n.status !== 'FINALIZED').length;
  const followUpCount = clinicalNotes.filter((n) => n.followUpRequired).length;

  // Filtered notes
  const filteredNotes = useMemo(() => {
    return clinicalNotes.filter((note) => {
      // 1. Patient query param if present
      if (initialPatientParam) {
        const pId = note.patientId?.toLowerCase();
        const pCode = note.patient?.patientCode?.toLowerCase();
        const match = initialPatientParam.toLowerCase();
        if (pId !== match && pCode !== match) return false;
      }

      // 2. Status filter
      if (statusFilter === 'FINALIZED' && note.status !== 'FINALIZED') return false;
      if (statusFilter === 'DRAFT' && note.status === 'FINALIZED') return false;

      // 3. Date filter
      if (dateFilter) {
        const noteDate = note.consultationDate || note.visitDate || note.createdAt || '';
        if (!noteDate.startsWith(dateFilter)) return false;
      }

      // 4. Search query
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const num = (note.noteNumber || note.id).toLowerCase();
        const diag = (note.primaryDiagnosis || '').toLowerCase();
        const complaint = (note.chiefComplaint || note.complaint || '').toLowerCase();
        const treatment = (note.treatmentPerformed || '').toLowerCase();
        const patientName = note.patient
          ? `${note.patient.firstName} ${note.patient.lastName}`.toLowerCase()
          : '';
        const patientCode = (note.patient?.patientCode || note.patientId).toLowerCase();
        const doctorName = (note.doctor?.fullName || note.doctorName || '').toLowerCase();

        return (
          num.includes(query) ||
          diag.includes(query) ||
          complaint.includes(query) ||
          treatment.includes(query) ||
          patientName.includes(query) ||
          patientCode.includes(query) ||
          doctorName.includes(query)
        );
      }

      return true;
    });
  }, [clinicalNotes, statusFilter, dateFilter, searchTerm, initialPatientParam]);

  return (
    <div className="cn-workspace" data-testid="feature-page-clin.notes">
      {/* Header section */}
      <div className="cn-header">
        <div className="cn-title-group">
          <div className="cn-icon-badge">
            <FileText />
          </div>
          <div className="cn-header-text">
            <h1>Clinical Consultation Notes</h1>
            <p>Structured dental examination findings, diagnoses, procedures, and treatment records</p>
          </div>
        </div>

        <div className="cn-header-actions">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="cn-btn cn-btn-secondary"
            title="Refresh notes from server"
          >
            <RotateCw className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="cn-btn cn-btn-primary"
            data-testid="new-clinical-note-button"
          >
            <Plus />
            New Clinical Note
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="cn-metrics-grid">
        <div className="cn-metric-card">
          <div className="cn-metric-icon cn-metric-icon-total">
            <FileText />
          </div>
          <div className="cn-metric-content">
            <span className="cn-metric-label">Total Consultations</span>
            <span className="cn-metric-value">{totalCount}</span>
          </div>
        </div>

        <div className="cn-metric-card">
          <div className="cn-metric-icon cn-metric-icon-finalized">
            <CheckCircle2 />
          </div>
          <div className="cn-metric-content">
            <span className="cn-metric-label">Finalized Notes</span>
            <span className="cn-metric-value">{finalizedCount}</span>
          </div>
        </div>

        <div className="cn-metric-card">
          <div className="cn-metric-icon cn-metric-icon-draft">
            <Clock />
          </div>
          <div className="cn-metric-content">
            <span className="cn-metric-label">Draft Notes</span>
            <span className="cn-metric-value">{draftCount}</span>
          </div>
        </div>

        <div className="cn-metric-card">
          <div className="cn-metric-icon cn-metric-icon-followup">
            <Calendar />
          </div>
          <div className="cn-metric-content">
            <span className="cn-metric-label">Follow-ups Required</span>
            <span className="cn-metric-value">{followUpCount}</span>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="cn-filters-bar">
        <div className="cn-search-group">
          <div className="cn-search-input-wrapper">
            <Search />
            <input
              type="text"
              placeholder="Search by Note #, diagnosis, complaint, patient, doctor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="cn-search-input"
            />
          </div>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="cn-date-input"
            title="Filter by consultation date"
          />
        </div>

        <div className="cn-tabs-group">
          <button
            type="button"
            className={`cn-tab-btn ${statusFilter === 'ALL' ? 'cn-tab-btn-active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            className={`cn-tab-btn ${statusFilter === 'FINALIZED' ? 'cn-tab-btn-active' : ''}`}
            onClick={() => setStatusFilter('FINALIZED')}
          >
            Finalized ({finalizedCount})
          </button>
          <button
            type="button"
            className={`cn-tab-btn ${statusFilter === 'DRAFT' ? 'cn-tab-btn-active' : ''}`}
            onClick={() => setStatusFilter('DRAFT')}
          >
            Drafts ({draftCount})
          </button>
        </div>
      </div>

      {/* Notes List / Table */}
      {filteredNotes.length > 0 ? (
        <div className="cn-table-container">
          <div className="cn-table-scroll">
            <table className="cn-table">
              <thead>
                <tr>
                  <th>Note # & Date</th>
                  <th>Patient</th>
                  <th>Attending Clinician</th>
                  <th>Chief Complaint & Diagnosis</th>
                  <th>Procedure Performed</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredNotes.map((note) => {
                  const isFinal = note.status === 'FINALIZED';
                  const isDraft = !isFinal;
                  const patientObj =
                    note.patient ||
                    patients.find(
                      (p) =>
                        p.id.toLowerCase() === note.patientId.toLowerCase() ||
                        (p.backendId && p.backendId.toLowerCase() === note.patientId.toLowerCase())
                    );
                  const patientName = patientObj
                    ? `${patientObj.firstName} ${patientObj.lastName}`
                    : 'Unknown Patient';
                  const patientCode = (patientObj as any)?.patientCode || patientObj?.id || note.patientId;
                  const docName = note.doctor?.fullName || note.finalizedByName || note.doctorName || 'Attending Doctor';
                  const dateStr = note.consultationDate
                    ? note.consultationDate.slice(0, 10)
                    : note.visitDate;

                  return (
                    <tr key={note.id}>
                      <td>
                        <strong>{note.noteNumber || note.id}</strong>
                        <small style={{ display: 'block', color: 'var(--text-muted, #64748b)' }}>
                          {dateStr}
                        </small>
                      </td>

                      <td className="cn-cell-patient">
                        <Link
                          to={`/patients/${patientObj?.id || note.patientId}`}
                          style={{ color: 'inherit', textDecoration: 'none' }}
                        >
                          <strong>{patientName}</strong>
                          <small>{patientCode}</small>
                        </Link>
                      </td>

                      <td>
                        <span style={{ fontSize: '13px', fontWeight: 500 }}>{docName}</span>
                      </td>

                      <td className="cn-cell-complaint">
                        <strong>{note.chiefComplaint || note.complaint || 'Consultation'}</strong>
                        <small>{note.primaryDiagnosis || 'Clinical Review'}</small>
                      </td>

                      <td style={{ maxWidth: '200px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text, #334155)' }}>
                          {note.treatmentPerformed || 'Consultation & evaluation'}
                        </span>
                      </td>

                      <td>
                        {isFinal ? (
                          <span className="cn-badge cn-badge-finalized">
                            <CheckCircle2 /> Finalized
                          </span>
                        ) : (
                          <span className="cn-badge cn-badge-draft">
                            <Clock /> Draft
                          </span>
                        )}
                      </td>

                      <td>
                        <div className="cn-actions-cell">
                          <button
                            type="button"
                            className="cn-btn cn-btn-secondary cn-btn-sm"
                            onClick={() => setViewingNote(note)}
                            title="View Full Details"
                          >
                            <Eye /> View
                          </button>

                          {isDraft && (
                            <button
                              type="button"
                              className="cn-btn cn-btn-secondary cn-btn-sm"
                              onClick={() => setEditingNote(note)}
                              title="Edit Draft Note"
                            >
                              <Edit3 /> Edit
                            </button>
                          )}

                          {isDraft && (
                            <button
                              type="button"
                              className="cn-btn cn-btn-success cn-btn-sm"
                              onClick={() => handleFinalizeDraft(note)}
                              title="Finalize Consultation Note"
                            >
                              <CheckCircle2 /> Finalize
                            </button>
                          )}

                          {isFinal && (
                            <button
                              type="button"
                              className="cn-btn cn-btn-secondary cn-btn-sm"
                              onClick={() => setPrintingNote(note)}
                              title="Print Letterhead"
                            >
                              <Printer /> Print
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="cn-table-container cn-empty-state">
          <div className="cn-empty-icon">
            <FileText />
          </div>
          <h3>No Clinical Notes Found</h3>
          <p>
            {searchTerm || dateFilter || statusFilter !== 'ALL'
              ? 'No clinical consultation notes match your selected search criteria.'
              : 'No clinical notes have been authored in this clinic yet. Start a new consultation note to begin.'}
          </p>
          <button
            type="button"
            className="cn-btn cn-btn-primary"
            onClick={() => setIsNewModalOpen(true)}
          >
            <Plus />
            New Clinical Note
          </button>
        </div>
      )}

      {/* New Note Modal */}
      {isNewModalOpen && (
        <ClinicalNoteModal
          defaultPatientId={initialPatientParam}
          onClose={() => setIsNewModalOpen(false)}
          onSaved={(newNote) => {
            setIsNewModalOpen(false);
            setViewingNote(newNote);
          }}
        />
      )}

      {/* Edit Note Modal */}
      {editingNote && (
        <ClinicalNoteModal
          initialNote={editingNote}
          onClose={() => setEditingNote(null)}
          onSaved={(updated) => {
            setEditingNote(null);
            setViewingNote(updated);
          }}
        />
      )}

      {/* View Details Modal */}
      {viewingNote && (
        <ClinicalNoteDetailsModal
          note={viewingNote}
          onClose={() => setViewingNote(null)}
          onEdit={(n) => {
            setViewingNote(null);
            setEditingNote(n);
          }}
          onFinalize={(n) => handleFinalizeDraft(n)}
          onPrint={(n) => {
            setViewingNote(null);
            setPrintingNote(n);
          }}
        />
      )}

      {/* Print Modal */}
      {printingNote && (
        <ClinicalNotePrintModal
          note={printingNote}
          onClose={() => setPrintingNote(null)}
        />
      )}
    </div>
  );
};

export default ClinicalNotesPage;
