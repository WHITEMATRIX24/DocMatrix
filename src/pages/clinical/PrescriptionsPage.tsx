import React, { useState, useMemo } from 'react';
import {
  Pill,
  Plus,
  Search,
  Filter,
  Printer,
  FileCheck2,
  Clock,
  Ban,
  Eye,
  Edit3,
  Calendar,
  AlertTriangle,
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-200">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Digital Prescriptions
              </h1>
              <p className="text-xs text-slate-500">
                Author, manage, and print clinical prescriptions on clinic letterhead
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs"
            title="Refresh prescriptions"
          >
            <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Prescription
          </button>
        </div>
      </div>

      {/* KPI Statistic Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Total Issued</span>
            <Pill className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-900">{totalCount}</p>
        </div>

        <div className="bg-white border border-emerald-100 rounded-2xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Finalized</span>
            <FileCheck2 className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-950">{finalizedCount}</p>
        </div>

        <div className="bg-white border border-amber-100 rounded-2xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Drafts</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-950">{draftCount}</p>
        </div>

        <div className="bg-white border border-rose-100 rounded-2xl p-4.5 shadow-xs">
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Cancelled</span>
            <Ban className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-black text-rose-950">{cancelledCount}</p>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by Rx number (e.g. RX-1001), patient name, ID, or diagnosis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="text-xs text-slate-500 hover:text-slate-800 underline px-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 border-t border-slate-100 pt-3 overflow-x-auto">
          {(['ALL', 'FINALIZED', 'DRAFT', 'CANCELLED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                statusFilter === status
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {status === 'ALL' ? 'All Prescriptions' : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Prescriptions Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        {filteredPrescriptions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <Pill className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No Prescriptions Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'ALL' || dateFilter
                ? 'No prescriptions match your active filters. Try adjusting your search term.'
                : 'No digital prescriptions have been issued yet. Click "New Prescription" to author one.'}
            </p>
            {(searchTerm || statusFilter !== 'ALL' || dateFilter) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                  setDateFilter('');
                }}
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Reset all filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-3 px-4">Rx Number</th>
                  <th className="py-3 px-4">Prescribed Date</th>
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Prescriber Doctor</th>
                  <th className="py-3 px-4">Diagnosis & Medication Summary</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredPrescriptions.map((rx) => {
                  const patient = rx.patient;
                  const isFinal = rx.status === 'FINALIZED';
                  const isDraft = rx.status === 'DRAFT';
                  const isCanc = rx.status === 'CANCELLED';

                  return (
                    <tr key={rx.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Rx Number */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md text-[11px]">
                          {rx.prescriptionNumber}
                        </span>
                      </td>

                      {/* Prescribed Date */}
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(rx.prescribedAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Patient Info */}
                      <td className="py-3 px-4">
                        <p className="font-bold text-slate-900">
                          {patient ? `${patient.firstName} ${patient.lastName}` : 'Patient'}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {patient?.patientCode || rx.patientId}
                          {patient?.gender && ` · ${patient.gender.toUpperCase()}`}
                        </p>
                      </td>

                      {/* Doctor Info */}
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-800">
                          {rx.doctor?.fullName || 'Dr. Arun Kumar'}
                        </p>
                        <p className="text-[11px] text-slate-400">Dental Surgeon</p>
                      </td>

                      {/* Diagnosis & Summary */}
                      <td className="py-3 px-4 max-w-xs">
                        <p className="font-semibold text-slate-900 truncate">{rx.diagnosis}</p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {rx.items.map((it) => it.medicineName).join(', ') || 'No medications'}
                        </p>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            isFinal
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isCanc
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isFinal ? 'bg-emerald-500' : isCanc ? 'bg-rose-500' : 'bg-amber-500'
                            }`}
                          />
                          {rx.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setViewingPrescription(rx)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setPrintingPrescription(rx)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Print / Save PDF"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {isDraft && (
                            <button
                              onClick={() => setEditingPrescription(rx)}
                              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Edit draft"
                            >
                              <Edit3 className="w-4 h-4" />
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
