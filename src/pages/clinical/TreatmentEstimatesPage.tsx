import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calculator,
  ArrowRight,
  Stethoscope,
  Printer,
  TrendingUp,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';
import { useClinicData, type TreatmentPlanRecord } from '@/services/clinicStore';
import { TreatmentPlanPrintModal } from '@/components/clinical/TreatmentPlanPrintModal';

export const TreatmentEstimatesPage: React.FC = () => {
  const { treatmentPlans = [], patients = [] } = useClinicData();
  const [selectedPlanForPrint, setSelectedPlanForPrint] = useState<TreatmentPlanRecord | null>(null);

  const patientMap = useMemo(() => {
    const map = new Map<string, (typeof patients)[0]>();
    for (const p of patients) {
      map.set(p.id.toLowerCase(), p);
    }
    return map;
  }, [patients]);

  const metrics = useMemo(() => {
    const plans = treatmentPlans as TreatmentPlanRecord[];
    const totalPipeline = plans.reduce((acc, p) => acc + (p.totalEstimatedCost || p.cost || 0), 0);
    const acceptedTotal = plans
      .filter((p) => p.status === 'Accepted' || p.status === 'In Progress' || p.status === 'Completed')
      .reduce((acc, p) => acc + (p.totalEstimatedCost || p.cost || 0), 0);
    const completedTotal = plans
      .filter((p) => p.status === 'Completed')
      .reduce((acc, p) => acc + (p.totalEstimatedCost || p.cost || 0), 0);
    const avgPlan = plans.length > 0 ? Math.round(totalPipeline / plans.length) : 0;

    return {
      totalPlans: plans.length,
      totalPipeline,
      acceptedTotal,
      completedTotal,
      avgPlan,
    };
  }, [treatmentPlans]);

  return (
    <section className="clinic-record-page" data-testid="feature-page-clin.estimates" style={{ padding: '28px 32px' }}>
      <header className="clinic-record-header" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span className="clinic-record-eyebrow">FINANCIAL & CLINICAL PLANNING</span>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '2px 0 6px 0', color: 'var(--text-main, #0f172a)' }}>
            Treatment Cost Estimates
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted, #64748b)', fontSize: '13.5px' }}>
            Authoritative chairside procedure fee calculations, stage-by-stage estimates, and patient acceptance tracking.
          </p>
        </div>

        <Link
          to="/clinical/treatment-plans"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '8px',
            background: 'var(--teal-primary, #008891)',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <Stethoscope size={15} /> Open Treatment Plans <ArrowRight size={14} />
        </Link>
      </header>

      {/* Financial Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--surface, #ffffff)', border: '1px solid var(--line, #e2e8f0)', borderRadius: '12px', padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>
              Total Proposed Pipeline
            </span>
            <Calculator size={16} color="var(--teal-primary, #008891)" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
            ₹{metrics.totalPipeline.toLocaleString('en-IN')}
          </div>
          <small style={{ color: 'var(--text-muted, #64748b)', fontSize: '11.5px' }}>
            Across {metrics.totalPlans} treatment plan(s)
          </small>
        </div>

        <div style={{ background: 'var(--surface, #ffffff)', border: '1px solid var(--line, #e2e8f0)', borderRadius: '12px', padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>
              Accepted & In-Progress Value
            </span>
            <CheckCircle2 size={16} color="#2563eb" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#2563eb' }}>
            ₹{metrics.acceptedTotal.toLocaleString('en-IN')}
          </div>
          <small style={{ color: 'var(--text-muted, #64748b)', fontSize: '11.5px' }}>
            Confirmed patient agreements
          </small>
        </div>

        <div style={{ background: 'var(--surface, #ffffff)', border: '1px solid var(--line, #e2e8f0)', borderRadius: '12px', padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>
              Completed Treatments
            </span>
            <TrendingUp size={16} color="#059669" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: '#059669' }}>
            ₹{metrics.completedTotal.toLocaleString('en-IN')}
          </div>
          <small style={{ color: 'var(--text-muted, #64748b)', fontSize: '11.5px' }}>
            Delivered chairside procedures
          </small>
        </div>

        <div style={{ background: 'var(--surface, #ffffff)', border: '1px solid var(--line, #e2e8f0)', borderRadius: '12px', padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase' }}>
              Average Plan Value
            </span>
            <Layers size={16} color="#7c3aed" />
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
            ₹{metrics.avgPlan.toLocaleString('en-IN')}
          </div>
          <small style={{ color: 'var(--text-muted, #64748b)', fontSize: '11.5px' }}>
            Per patient case
          </small>
        </div>
      </div>

      {/* Estimates Table */}
      <div style={{ background: 'var(--surface, #ffffff)', border: '1px solid var(--line, #e2e8f0)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line, #e2e8f0)', background: 'var(--surface-hover, #f8fafc)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong style={{ fontSize: '14px' }}>Estimates Breakdown & Ledger</strong>
          <span style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748b)' }}>
            Showing {treatmentPlans.length} estimate records
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--surface-hover, #f8fafc)', borderBottom: '1px solid var(--line, #e2e8f0)', color: 'var(--text-muted, #64748b)', textAlign: 'left', fontSize: '11.5px', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 16px' }}>Plan # & Patient</th>
                <th style={{ padding: '10px 16px' }}>Plan Title & Stages</th>
                <th style={{ padding: '10px 16px' }}>Doctor</th>
                <th style={{ padding: '10px 16px' }}>Status</th>
                <th style={{ padding: '10px 16px' }}>Estimated Total</th>
                <th style={{ padding: '10px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(treatmentPlans as TreatmentPlanRecord[]).map((plan) => {
                const p = patientMap.get(plan.patientId.toLowerCase());
                const patientName = p ? `${p.firstName} ${p.lastName}` : plan.patientId;
                const cost = plan.totalEstimatedCost || plan.cost || 0;
                const stageCount = plan.stages?.length || 1;

                return (
                  <tr key={plan.id} style={{ borderBottom: '1px solid var(--line, #f1f5f9)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '12px', color: 'var(--teal-primary, #008891)' }}>
                        {plan.planNumber || plan.id}
                      </span>
                      <strong style={{ display: 'block', fontSize: '13px', marginTop: '2px' }}>
                        {patientName}
                      </strong>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <strong style={{ display: 'block' }}>{plan.title || plan.procedure}</strong>
                      <small style={{ color: 'var(--text-muted, #64748b)' }}>
                        {stageCount} stage{stageCount > 1 ? 's' : ''} • Estimate v{plan.currentVersion || 1}
                      </small>
                    </td>
                    <td style={{ padding: '12px 16px' }}>{plan.doctor}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          background:
                            plan.status === 'Accepted'
                              ? 'rgba(37, 99, 235, 0.1)'
                              : plan.status === 'Completed'
                              ? 'rgba(5, 150, 105, 0.1)'
                              : plan.status === 'In Progress'
                              ? 'rgba(2, 132, 199, 0.1)'
                              : 'rgba(100, 116, 139, 0.1)',
                          color:
                            plan.status === 'Accepted'
                              ? '#2563eb'
                              : plan.status === 'Completed'
                              ? '#059669'
                              : plan.status === 'In Progress'
                              ? '#0284c7'
                              : '#475569',
                        }}
                      >
                        {plan.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 800, fontSize: '14px', color: 'var(--teal-primary, #008891)' }}>
                      ₹{cost.toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedPlanForPrint(plan)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '5px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--line, #cbd5e1)',
                          background: 'var(--surface, #ffffff)',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        <Printer size={13} /> Print
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

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

export default TreatmentEstimatesPage;
