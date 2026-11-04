import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Stethoscope,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  UserRound,
  ArrowRight,
  Filter,
  Printer,
  FileText,
  UploadCloud,
} from 'lucide-react';
import {
  useClinicData,
  updateTreatmentPlanStatus,
  migrateLegacyTreatmentPlans,
  type TreatmentPlanRecord,
} from '@/services/clinicStore';
import { TreatmentPlanModal } from '@/components/clinical/TreatmentPlanModal';
import { TreatmentPlanDetailsModal } from '@/components/clinical/TreatmentPlanDetailsModal';
import { TreatmentPlanPrintModal } from '@/components/clinical/TreatmentPlanPrintModal';
import '../patients/patientProfile.css';
import './treatmentPlans.css';

type PlanStatusFilter =
  | 'All'
  | 'Proposed'
  | 'Accepted'
  | 'In Progress'
  | 'Pending'
  | 'Completed'
  | 'Rejected';

export const TreatmentPlansPage: React.FC = () => {
  const { treatmentPlans = [], patients = [] } = useClinicData();
  const [activeStatus, setActiveStatus] = useState<PlanStatusFilter>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPlanForDetails, setSelectedPlanForDetails] = useState<TreatmentPlanRecord | null>(null);
  const [selectedPlanForPrint, setSelectedPlanForPrint] = useState<TreatmentPlanRecord | null>(null);

  // Migration status
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationBanner, setMigrationBanner] = useState<string | null>(null);

  // Map patient id to patient object
  const patientMap = useMemo(() => {
    const map = new Map<string, (typeof patients)[0]>();
    for (const p of patients) {
      map.set(p.id.toLowerCase(), p);
    }
    return map;
  }, [patients]);

  // Check if legacy unmigrated plans exist
  const legacyCount = useMemo(() => {
    return (treatmentPlans as TreatmentPlanRecord[]).filter(
      (p) => p.id.startsWith('TRT-') && !p.backendId
    ).length;
  }, [treatmentPlans]);

  // Filter plans
  const filteredPlans = useMemo(() => {
    return (treatmentPlans as TreatmentPlanRecord[]).filter((plan) => {
      // 1. Status Filter
      if (activeStatus !== 'All' && plan.status !== activeStatus) {
        return false;
      }

      // 2. Search Query (procedure, doctor, tooth number, patient name/ID, planNumber)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const p = patientMap.get(plan.patientId.toLowerCase());
        const patientName = p ? `${p.firstName} ${p.lastName}`.toLowerCase() : '';
        const match =
          (plan.title && plan.title.toLowerCase().includes(q)) ||
          plan.procedure.toLowerCase().includes(q) ||
          plan.doctor.toLowerCase().includes(q) ||
          (plan.toothNumber && plan.toothNumber.toLowerCase().includes(q)) ||
          (plan.planNumber && plan.planNumber.toLowerCase().includes(q)) ||
          plan.patientId.toLowerCase().includes(q) ||
          patientName.includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [treatmentPlans, activeStatus, searchQuery, patientMap]);

  // Count by status
  const counts = useMemo(() => {
    const plans = treatmentPlans as TreatmentPlanRecord[];
    return {
      All: plans.length,
      Proposed: plans.filter((p) => p.status === 'Proposed').length,
      Accepted: plans.filter((p) => p.status === 'Accepted').length,
      'In Progress': plans.filter((p) => p.status === 'In Progress').length,
      Pending: plans.filter((p) => p.status === 'Pending').length,
      Completed: plans.filter((p) => p.status === 'Completed').length,
      Rejected: plans.filter((p) => p.status === 'Rejected').length,
    };
  }, [treatmentPlans]);

  const handleStatusChange = (id: string, newStatus: TreatmentPlanRecord['status']) => {
    updateTreatmentPlanStatus(id, newStatus);
  };

  const handleMigrateLegacy = async () => {
    setIsMigrating(true);
    setMigrationBanner('Migrating local legacy plans into database...');
    try {
      const res = await migrateLegacyTreatmentPlans();
      if (res.imported > 0) {
        setMigrationBanner(`Successfully migrated ${res.imported} legacy plans to PostgreSQL!`);
      } else if (res.errors.length > 0) {
        setMigrationBanner(`Migration notice: ${res.errors.join('; ')}`);
      } else {
        setMigrationBanner('All legacy plans are already persisted.');
      }
    } catch (err: any) {
      setMigrationBanner(`Migration failed: ${err.message}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const getStatusBadgeStyle = (status: TreatmentPlanRecord['status']) => {
    switch (status) {
      case 'Pending':
        return { background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', borderColor: 'rgba(245, 158, 11, 0.2)' };
      case 'In Progress':
        return { background: 'rgba(14, 165, 233, 0.1)', color: '#0ea5e9', borderColor: 'rgba(14, 165, 233, 0.2)' };
      case 'Accepted':
        return { background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', borderColor: 'rgba(59, 130, 246, 0.2)' };
      case 'Completed':
        return { background: 'rgba(16, 185, 129, 0.1)', color: '#059669', borderColor: 'rgba(16, 185, 129, 0.2)' };
      case 'Rejected':
        return { background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626', borderColor: 'rgba(220, 38, 38, 0.2)' };
      case 'Proposed':
      default:
        return { background: 'rgba(100, 116, 139, 0.1)', color: '#475569', borderColor: 'rgba(100, 116, 139, 0.2)' };
    }
  };

  return (
    <section className="clinic-record-page pat-profile-page" data-testid="feature-page-clin.plans">
      {/* Header */}
      <header
        className="clinic-record-header"
        style={{
          marginBottom: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <span className="clinic-record-eyebrow">CLINICAL WORKFLOW</span>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '2px 0 4px 0' }}>Treatment Plans</h1>
          <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '14px' }}>
            Comprehensive dental care plans, tooth-specific procedures, multi-stage tracking, and integrated chairside cost estimates.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link
            to="/clinical/estimates"
            style={{
              fontSize: '12.5px',
              color: 'var(--teal-primary, #008891)',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid var(--line, #e2e8f0)',
              background: 'var(--surface, #ffffff)',
            }}
          >
            Cost Estimates →
          </Link>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--teal-primary, #008891)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
            }}
          >
            <Plus size={16} /> New Treatment Plan
          </button>
        </div>
      </header>

      {/* Legacy Migration Advisory Banner */}
      {migrationBanner && (
        <div
          style={{
            background: 'rgba(0, 136, 145, 0.08)',
            border: '1px solid rgba(0, 136, 145, 0.25)',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '14px',
            fontSize: '13px',
            color: 'var(--teal-primary, #008891)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{migrationBanner}</span>
          <button
            type="button"
            onClick={() => setMigrationBanner(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            ✕
          </button>
        </div>
      )}

      {legacyCount > 0 && !migrationBanner && (
        <div
          style={{
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: '8px',
            padding: '10px 16px',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
          }}
        >
          <div>
            <strong>Legacy Local Records Found:</strong> You have {legacyCount} legacy treatment plan(s) in local storage.
            You can safely migrate them to PostgreSQL with structured stages and audit history.
          </div>
          <button
            type="button"
            onClick={handleMigrateLegacy}
            disabled={isMigrating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              background: '#ffffff',
              color: '#d97706',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <UploadCloud size={13} /> {isMigrating ? 'Migrating...' : 'Migrate to Database'}
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="pat-filter-bar">
        <div className="pat-search-wrap">
          <input
            className="pat-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search procedures, patients, doctors, tooth numbers, or plan numbers..."
            style={{ paddingLeft: '14px' }}
          />
        </div>

        <div className="pat-filter-chips">
          {(['All', 'Proposed', 'Accepted', 'In Progress', 'Pending', 'Completed', 'Rejected'] as PlanStatusFilter[]).map(
            (status) => (
              <button
                key={status}
                type="button"
                className={`pat-chip ${activeStatus === status ? 'is-active' : ''}`}
                onClick={() => setActiveStatus(status)}
              >
                <span>{status}</span>
                <span style={{ fontSize: '11px', opacity: 0.85 }}>({counts[status] || 0})</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Treatment Plans Table */}
      {filteredPlans.length > 0 ? (
        <div className="pat-table-container">
          <table className="pat-table" aria-label="Treatment plans table">
            <thead>
              <tr>
                <th>Plan # & Patient</th>
                <th>Procedure & Details</th>
                <th>Category</th>
                <th>Treating Doctor</th>
                <th>Est. Fee</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlans.map((plan) => {
                const p = patientMap.get(plan.patientId.toLowerCase());
                const patientName = p ? `${p.firstName} ${p.lastName}` : plan.patientId;
                const badgeStyle = getStatusBadgeStyle(plan.status);

                return (
                  <tr key={plan.id} className="pat-row">
                    <td>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '11.5px',
                              color: 'var(--teal-primary, #008891)',
                              background: 'rgba(0, 136, 145, 0.08)',
                              padding: '1px 5px',
                              borderRadius: '4px',
                            }}
                          >
                            {plan.planNumber || plan.id}
                          </span>
                          {plan.currentVersion && plan.currentVersion > 1 && (
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                background: '#f1f5f9',
                                padding: '1px 4px',
                                borderRadius: '3px',
                                color: '#64748b',
                              }}
                            >
                              v{plan.currentVersion}
                            </span>
                          )}
                        </div>
                        <Link
                          to={`/patients/${plan.patientId}`}
                          style={{
                            fontWeight: 600,
                            color: 'var(--teal-primary, #0b8185)',
                            textDecoration: 'none',
                            display: 'block',
                            marginTop: '2px',
                          }}
                        >
                          {patientName}
                        </Link>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted, #64748b)' }}>
                          ID: {plan.patientId}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div
                        onClick={() => setSelectedPlanForDetails(plan)}
                        style={{ cursor: 'pointer' }}
                        title="Click to view stages and item details"
                      >
                        <strong style={{ color: 'var(--text-main, #0f172a)' }}>
                          {plan.title || plan.procedure}
                        </strong>
                        {plan.toothNumber && (
                          <span style={{ marginLeft: '6px', fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                            (Tooth #{plan.toothNumber})
                          </span>
                        )}
                        {plan.stages && plan.stages.length > 0 && (
                          <div style={{ fontSize: '11.5px', color: 'var(--teal-primary, #008891)', marginTop: '2px' }}>
                            {plan.stages.length} stage{plan.stages.length > 1 ? 's' : ''} •{' '}
                            {plan.stages.reduce((acc, s) => acc + (s.items?.length || 0), 0)} procedure item(s)
                          </div>
                        )}
                        {plan.notes && (
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                            {plan.notes}
                          </div>
                        )}
                      </div>
                    </td>

                    <td>
                      <span className="pat-badge">{plan.category}</span>
                    </td>

                    <td>
                      <span style={{ fontSize: '13px', color: 'var(--text-main, #0f172a)' }}>
                        {plan.doctor}
                      </span>
                    </td>

                    <td>
                      <span style={{ fontWeight: 700, fontSize: '14px' }}>
                        ₹{(plan.totalEstimatedCost || plan.cost).toLocaleString('en-IN')}
                      </span>
                    </td>

                    <td>
                      <select
                        value={plan.status}
                        onChange={(e) => handleStatusChange(plan.id, e.target.value as TreatmentPlanRecord['status'])}
                        style={{
                          ...badgeStyle,
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <option value="Proposed">Proposed</option>
                        <option value="Accepted">Accepted</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Pending">Pending</option>
                        <option value="Completed">Completed</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedPlanForDetails(plan)}
                          className="pat-action-btn"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          title="View stages and manage progress"
                        >
                          <FileText size={12} />
                          <span>Stages</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedPlanForPrint(plan)}
                          className="pat-action-btn"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          title="Print Letterhead Estimate"
                        >
                          <Printer size={12} />
                          <span>Print</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="clinic-record-empty" style={{ padding: '48px 20px', textAlign: 'center' }}>
          <Stethoscope size={30} style={{ color: 'var(--text-muted, #94a3b8)', marginBottom: '8px' }} />
          <h3 style={{ margin: '0 0 4px 0', fontSize: '16px' }}>No treatment plans found</h3>
          <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '13px' }}>
            {searchQuery
              ? 'No treatment plans match your search query.'
              : `No treatment plans currently in "${activeStatus}" state.`}
          </p>
        </div>
      )}

      {/* Create Treatment Plan Modal */}
      {isCreateModalOpen && (
        <TreatmentPlanModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}

      {/* Plan Details Modal */}
      {selectedPlanForDetails && (
        <TreatmentPlanDetailsModal
          plan={selectedPlanForDetails}
          isOpen={Boolean(selectedPlanForDetails)}
          onClose={() => setSelectedPlanForDetails(null)}
          onPrint={() => {
            const current = selectedPlanForDetails;
            setSelectedPlanForDetails(null);
            setSelectedPlanForPrint(current);
          }}
        />
      )}

      {/* Print Modal */}
      {selectedPlanForPrint && (
        <TreatmentPlanPrintModal
          plan={selectedPlanForPrint}
          onClose={() => setSelectedPlanForPrint(null)}
        />
      )}
    </section>
  );
};

export default TreatmentPlansPage;
