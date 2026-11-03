import React, { useState, useMemo } from 'react';
import {
  Pill,
  Plus,
  Search,
  Printer,
  FileCheck2,
  Clock,
  Ban,
  Eye,
  Edit3,
  RotateCw,
} from 'lucide-react';
import {
  useClinicData,
  PrescriptionRecord,
  refreshPrescriptions,
} from '../../services/clinicStore';
import { PrescriptionModal } from '../../components/clinical/PrescriptionModal';
import { PrescriptionPrintModal } from '../../components/clinical/PrescriptionPrintModal';
import { PrescriptionDetailsModal } from '../../components/clinical/PrescriptionDetailsModal';
import './prescriptions.css';

export const PrescriptionsPage: React.FC = () => {
  const { prescriptions = [], patients = [] } = useClinicData();

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'FINALIZED' | 'CANCELLED'>('ALL');
  const [dateFilter, setDateFilter] = useState('');

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingPrescription, setEditingPrescription] = useState<PrescriptionRecord | null>(null);
  const [viewingPrescription, setViewingPrescription] = useState<PrescriptionRecord | null>(null);
  const [printingPrescription, setPrintingPrescription] = useState<PrescriptionRecord | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshPrescriptions();
    setRefreshing(false);
  };

  // Metrics calculation
  const totalCount = prescriptions.length;
  const finalizedCount = prescriptions.filter((p) => p.status === 'FINALIZED').length;
  const draftCount = prescriptions.filter((p) => p.status === 'DRAFT').length;
  const cancelledCount = prescriptions.filter((p) => p.status === 'CANCELLED').length;

  // Filtered prescriptions list
  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter((rx) => {
      // 1. Status filter
      if (statusFilter !== 'ALL' && rx.status !== statusFilter) {
        return false;
      }

      // 2. Date filter
      if (dateFilter && !rx.prescribedAt.startsWith(dateFilter)) {
        return false;
      }

      // 3. Search query
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const rxNum = rx.prescriptionNumber.toLowerCase();
        const diag = rx.diagnosis.toLowerCase();
        const patientName = rx.patient
          ? `${rx.patient.firstName} ${rx.patient.lastName}`.toLowerCase()
          : '';
        const patientCode = (rx.patient?.patientCode || rx.patientId).toLowerCase();
        const doctorName = (rx.doctor?.fullName || '').toLowerCase();

        return (
          rxNum.includes(query) ||
          diag.includes(query) ||
          patientName.includes(query) ||
          patientCode.includes(query) ||
          doctorName.includes(query)
        );
      }

      return true;
    });
  }, [prescriptions, statusFilter, dateFilter, searchTerm]);

  return (
    <div className="rx-workspace">
      {/* Header section */}
      <div className="rx-header">
        <div className="rx-title-group">
          <div className="rx-icon-badge">
            <Pill />
          </div>
          <div className="rx-header-text">
            <h1>Digital Prescriptions</h1>
            <p>Author, manage, and print clinical prescriptions on clinic letterhead</p>
          </div>
        </div>

        <div className="rx-header-actions">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="rx-btn rx-btn-secondary"
            title="Refresh prescriptions"
          >
            <RotateCw className={refreshing ? 'rx-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="rx-btn rx-btn-primary"
          >
            <Plus />
            New Prescription
          </button>
        </div>
      </div>

      {/* KPI Statistic Cards */}
      <div className="rx-kpis">
        <div className="rx-kpi">
          <div className="rx-kpi-head">
            <span className="rx-kpi-label">Total Issued</span>
            <div className="rx-kpi-icon">
              <Pill />
            </div>
          </div>
          <strong>{totalCount}</strong>
        </div>

        <div className="rx-kpi rx-kpi-finalized">
          <div className="rx-kpi-head">
            <span className="rx-kpi-label">Finalized</span>
            <div className="rx-kpi-icon">
              <FileCheck2 />
            </div>
          </div>
          <strong>{finalizedCount}</strong>
        </div>

        <div className="rx-kpi rx-kpi-draft">
          <div className="rx-kpi-head">
            <span className="rx-kpi-label">Drafts</span>
            <div className="rx-kpi-icon">
              <Clock />
            </div>
          </div>
          <strong>{draftCount}</strong>
        </div>

        <div className="rx-kpi rx-kpi-cancelled">
          <div className="rx-kpi-head">
            <span className="rx-kpi-label">Cancelled</span>
            <div className="rx-kpi-icon">
              <Ban />
            </div>
          </div>
          <strong>{cancelledCount}</strong>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="rx-toolbar">
        <div className="rx-filter-row">
          <div className="rx-search-box">
            <Search />
            <input
              type="text"
              placeholder="Search by Rx number (e.g. RX-1001), patient name, ID, or diagnosis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="rx-date-box">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="rx-date-input"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="rx-clear-date"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="rx-tabs">
          {(['ALL', 'FINALIZED', 'DRAFT', 'CANCELLED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rx-tab-btn ${statusFilter === status ? 'is-active' : ''}`}
            >
              {status === 'ALL' ? 'All Prescriptions' : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Prescriptions Data Table */}
      <div className="rx-table-container">
        {filteredPrescriptions.length === 0 ? (
          <div className="rx-empty">
            <div className="rx-empty-icon">
              <Pill />
            </div>
            <h3>No Prescriptions Found</h3>
            <p>
              {searchTerm || statusFilter !== 'ALL' || dateFilter
                ? 'No prescriptions match your active filters. Try adjusting your search term.'
                : 'No digital prescriptions have been issued yet. Click "New Prescription" to author one.'}
            </p>
            {searchTerm || statusFilter !== 'ALL' || dateFilter ? (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                  setDateFilter('');
                }}
                className="rx-btn rx-btn-secondary rx-btn-sm"
              >
                Reset all filters
              </button>
            ) : (
              <button
                onClick={() => setIsNewModalOpen(true)}
                className="rx-btn rx-btn-primary rx-btn-sm"
              >
                <Plus />
                New Prescription
              </button>
            )}
          </div>
        ) : (
          <div className="rx-table-scroll">
            <table className="rx-table">
              <thead>
                <tr>
                  <th>Rx Number</th>
                  <th>Prescribed Date</th>
                  <th>Patient</th>
                  <th>Prescriber Doctor</th>
                  <th>Diagnosis & Medication Summary</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPrescriptions.map((rx) => {
                  const patient = rx.patient;
                  const isFinal = rx.status === 'FINALIZED';
                  const isDraft = rx.status === 'DRAFT';
                  const isCanc = rx.status === 'CANCELLED';

                  return (
                    <tr key={rx.id}>
                      {/* Rx Number */}
                      <td>
                        <span className="rx-code-pill">
                          {rx.prescriptionNumber}
                        </span>
                      </td>

                      {/* Prescribed Date */}
                      <td>
                        {new Date(rx.prescribedAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Patient Info */}
                      <td>
                        <div className="rx-patient-cell">
                          <span className="rx-patient-name">
                            {patient ? `${patient.firstName} ${patient.lastName}` : 'Patient'}
                          </span>
                          <span className="rx-patient-meta">
                            {patient?.patientCode || rx.patientId}
                            {patient?.gender && ` · ${patient.gender.toUpperCase()}`}
                          </span>
                        </div>
                      </td>

                      {/* Doctor Info */}
                      <td>
                        <div className="rx-doctor-name">
                          {rx.doctor?.fullName || 'Dr. Arun Kumar'}
                        </div>
                        <div className="rx-doctor-role">Dental Surgeon</div>
                      </td>

                      {/* Diagnosis & Summary */}
                      <td className="rx-diagnosis-cell">
                        <div className="rx-diagnosis-title">{rx.diagnosis}</div>
                        <div className="rx-meds-summary">
                          {rx.items.map((it) => it.medicineName).join(', ') || 'No medications'}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td>
                        <span
                          className={`rx-badge ${
                            isFinal
                              ? 'rx-badge-finalized'
                              : isCanc
                              ? 'rx-badge-cancelled'
                              : 'rx-badge-draft'
                          }`}
                        >
                          <span className="rx-badge-dot" />
                          {rx.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="rx-actions-cell">
                        <div className="rx-actions-wrapper">
                          <button
                            onClick={() => setViewingPrescription(rx)}
                            className="rx-btn-icon"
                            title="View details"
                          >
                            <Eye />
                          </button>

                          <button
                            onClick={() => setPrintingPrescription(rx)}
                            className="rx-btn-icon"
                            title="Print / Save PDF"
                          >
                            <Printer />
                          </button>

                          {isDraft && (
                            <button
                              onClick={() => setEditingPrescription(rx)}
                              className="rx-btn-icon"
                              title="Edit draft"
                            >
                              <Edit3 />
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
        )}
      </div>

      {/* New Prescription Modal */}
      {isNewModalOpen && (
        <PrescriptionModal
          onClose={() => setIsNewModalOpen(false)}
          onSaved={(saved) => {
            setIsNewModalOpen(false);
            setViewingPrescription(saved);
          }}
        />
      )}

      {/* Edit Draft Modal */}
      {editingPrescription && (
        <PrescriptionModal
          initialPrescription={editingPrescription}
          onClose={() => setEditingPrescription(null)}
          onSaved={(saved) => {
            setEditingPrescription(null);
            setViewingPrescription(saved);
          }}
        />
      )}

      {/* Details Modal */}
      {viewingPrescription && (
        <PrescriptionDetailsModal
          prescription={viewingPrescription}
          onClose={() => setViewingPrescription(null)}
          onPrint={(rx) => {
            setViewingPrescription(null);
            setPrintingPrescription(rx);
          }}
          onEditDraft={(rx) => {
            setViewingPrescription(null);
            setEditingPrescription(rx);
          }}
          onUpdated={() => {
            setViewingPrescription(null);
          }}
        />
      )}

      {/* Printable Letterhead Modal */}
      {printingPrescription && (
        <PrescriptionPrintModal
          prescription={printingPrescription}
          onClose={() => setPrintingPrescription(null)}
        />
      )}
    </div>
  );
};

export default PrescriptionsPage;
