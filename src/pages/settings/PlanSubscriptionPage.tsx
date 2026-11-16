import React, { useState, useEffect } from 'react'
import { ShieldCheck, Check, Zap, Sparkles, Calendar, CreditCard, AlertCircle } from 'lucide-react'
import { apiClient } from '@/services/apiClient'

interface PlanFeature {
  featureKey: string
  name: string
  included: boolean
  limitValue?: number
}

interface Plan {
  id: string
  name: string
  slug: string
  description?: string
  tier: string
  monthlyPriceInr: number
  annualPriceInr: number
  maxDoctors: number
  maxChairs: number
  planFeatures?: PlanFeature[]
}

interface Subscription {
  id: string
  status: string
  billingInterval: string
  currentPeriodStart: string
  currentPeriodEnd: string
  trialEndsAt?: string
  plan?: Plan
}

export const PlanSubscriptionPage: React.FC = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [upgradeNotice, setUpgradeNotice] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const loadData = async () => {
      try {
        setLoading(true)
        const [subRes, plansRes] = await Promise.all([
          apiClient.get<any>('/subscriptions/current').catch(() => null),
          apiClient.get<any[]>('/plans').catch(() => null)
        ])

        if (mounted) {
          if (subRes) {
            if (subRes.subscription) {
              setSubscription({
                ...subRes.subscription,
                plan: subRes.plan ? {
                  id: subRes.plan.id,
                  name: subRes.plan.name,
                  slug: subRes.plan.slug,
                  description: subRes.plan.description,
                  tier: subRes.plan.name,
                  monthlyPriceInr: Number(subRes.subscription.lockedPrice || 0),
                  annualPriceInr: Math.round(Number(subRes.subscription.lockedPrice || 0) * 10),
                  maxDoctors: subRes.plan.maxUsers || 1,
                  maxChairs: subRes.plan.maxUsers || 1,
                  planFeatures: (subRes.features || []).map((f: any) => ({
                    featureKey: f.featureKey,
                    name: f.featureKey.replace(/_/g, ' '),
                    included: f.isEnabled,
                    limitValue: f.limitValue
                  }))
                } : undefined
              })
            } else if (subRes.id) {
              setSubscription(subRes)
            } else {
              setSubscription(null)
            }
          }
          if (Array.isArray(plansRes)) {
            const mapped = plansRes.map((p: any) => ({
              id: p.id,
              name: p.name,
              slug: p.slug,
              description: p.description,
              tier: p.name,
              monthlyPriceInr: Number(p.basePrice || p.monthlyPriceInr || 0),
              annualPriceInr: Number(p.annualPriceInr || Math.round(Number(p.basePrice || 0) * 10)),
              maxDoctors: Number(p.maxUsers || p.maxDoctors || 1),
              maxChairs: Number(p.maxUsers || p.maxChairs || 1),
              planFeatures: (p.features || p.planFeatures || []).map((f: any) => ({
                featureKey: f.featureKey || f.name,
                name: f.name || f.featureKey?.replace(/_/g, ' ') || 'Feature',
                included: f.isEnabled !== undefined ? f.isEnabled : (f.included ?? true),
                limitValue: f.limitValue
              }))
            }))
            setPlans(mapped)
          } else {
            setPlans([])
          }
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Failed to load subscription details')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadData()
    return () => {
      mounted = false
    }
  }, [])

  const handleUpgradeClick = (planName: string) => {
    setUpgradeNotice(`To upgrade your clinic to the ${planName} edition or add operatory chairs, please contact DocMatrix Enterprise Onboarding (+91 98765 00000 or support@docmatrix.dental).`)
    setTimeout(() => setUpgradeNotice(null), 7000)
  }

  const displayPlans = plans

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px', fontFamily: 'inherit' }} data-testid="feature-page-set.plan">
      <header style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--teal-primary, #008891)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em' }}>
          <ShieldCheck size={16} />
          <span>SUBSCRIPTION &amp; BILLING</span>
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-strong, #0f172a)', margin: '6px 0 8px' }}>
          Plans &amp; Subscription Management
        </h1>
        <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '14px', maxWidth: '680px' }}>
          Review your clinic&apos;s active subscription tier, manage operatory chair entitlements, and explore upgraded capabilities.
        </p>
      </header>

      {upgradeNotice && (
        <div style={{
          padding: '12px 18px',
          borderRadius: '8px',
          background: 'rgba(0, 136, 145, 0.1)',
          border: '1px solid var(--teal-primary, #008891)',
          color: 'var(--text-strong, #0f172a)',
          fontSize: '13.5px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <Sparkles size={18} color="var(--teal-primary, #008891)" />
          <span>{upgradeNotice}</span>
        </div>
      )}

      {/* Active Subscription Status Card */}
      <section style={{
        background: 'linear-gradient(135deg, var(--surface-raised, #ffffff) 0%, var(--surface-alt, #f8fafc) 100%)',
        border: '1px solid var(--teal-border, rgba(0, 136, 145, 0.3))',
        borderRadius: '16px',
        padding: '24px 28px',
        marginBottom: '40px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                background: 'var(--teal-primary, #008891)',
                color: '#ffffff',
                padding: '4px 10px',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                {subscription?.status || 'TRIALING (DocMatrix Cloud)'}
              </span>
              <span style={{ color: 'var(--teal-primary, #008891)', fontSize: '13px', fontWeight: 600 }}>
                {subscription?.billingInterval ? `${subscription.billingInterval} CYCLE` : '30-DAY FREE CLINICAL TRIAL'}
              </span>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-strong, #0f172a)', margin: '12px 0 6px' }}>
              {subscription?.plan?.name || 'DocMatrix Solo Practice Edition'}
            </h2>
            <p style={{ color: 'var(--text-muted, #64748b)', fontSize: '14px', margin: 0 }}>
              Full access to Electronic Dental Records, Odontogram Tooth Charting, Live Queue, and Patient SMS Reminders.
            </p>
          </div>

          <div style={{
            background: 'var(--surface-sunken, #ffffff)',
            border: '1px solid var(--line-strong, #d1fae5)',
            borderRadius: '12px',
            padding: '14px 20px',
            minWidth: '220px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted, #6b7280)', fontSize: '12px', marginBottom: '4px' }}>
              <Calendar size={14} />
              <span>Current Term Ends</span>
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-strong, #111827)' }}>
              {subscription?.currentPeriodEnd
                ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
                : '30 Nov 2026'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--teal-primary, #059669)', marginTop: '4px', fontWeight: 600 }}>
              Auto-renewing active tier
            </div>
          </div>
        </div>
      </section>

      {/* Available Plans Grid */}
      <section>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-strong, #111827)', marginBottom: '8px' }}>
          Available Clinical Editions
        </h2>
        <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: '14px', marginBottom: '24px' }}>
          Select the edition that best matches your practice volume and number of operatory chairs.
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px'
        }}>
          {displayPlans.map((plan) => {
            const isCurrent = subscription?.plan?.slug === plan.slug || plan.slug === 'starter'
            return (
              <div
                key={plan.id}
                style={{
                  background: 'var(--surface-raised, #ffffff)',
                  border: isCurrent ? '2px solid var(--teal-primary, #008891)' : '1px solid var(--line, #e5e7eb)',
                  borderRadius: '16px',
                  padding: '24px',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: isCurrent ? '0 10px 15px -3px rgba(0, 136, 145, 0.15)' : '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                {isCurrent && (
                  <span style={{
                    position: 'absolute',
                    top: '-12px',
                    right: '20px',
                    background: 'var(--teal-primary, #008891)',
                    color: '#ffffff',
                    padding: '2px 10px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase'
                  }}>
                    Current Plan
                  </span>
                )}
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-strong, #111827)', margin: '0 0 6px' }}>
                    {plan.name}
                  </h3>
                  <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: '13px', minHeight: '38px', margin: '0 0 16px' }}>
                    {plan.description}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '28px', fontWeight: 800, color: 'var(--teal-primary, #008891)' }}>
                      ₹{(plan.monthlyPriceInr || 0).toLocaleString('en-IN')}
                    </span>
                    <span style={{ color: 'var(--text-muted, #6b7280)', fontSize: '13px' }}>/ month</span>
                  </div>

                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text, #374151)' }}>
                      <Check size={16} color="var(--teal-primary, #008891)" />
                      <span><strong style={{ color: 'var(--text-strong)' }}>{plan.maxDoctors || 1}</strong> Doctor Seat{(plan.maxDoctors || 1) > 1 ? 's' : ''} Included</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text, #374151)' }}>
                      <Check size={16} color="var(--teal-primary, #008891)" />
                      <span><strong style={{ color: 'var(--text-strong)' }}>{plan.maxChairs || 1}</strong> Operatory Chair{(plan.maxChairs || 1) > 1 ? 's' : ''}</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text, #374151)' }}>
                      <Check size={16} color="var(--teal-primary, #008891)" />
                      <span>Smart Live Queue &amp; Check-In</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text, #374151)' }}>
                      <Check size={16} color="var(--teal-primary, #008891)" />
                      <span>Interactive Odontogram Charting</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text, #374151)' }}>
                      <Check size={16} color="var(--teal-primary, #008891)" />
                      <span>WhatsApp &amp; SMS Recall Notifications</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  disabled={isCurrent}
                  onClick={() => !isCurrent && handleUpgradeClick(plan.name)}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: isCurrent ? 'default' : 'pointer',
                    background: isCurrent ? 'var(--surface-sunken, #f3f4f6)' : 'var(--teal-primary, #008891)',
                    color: isCurrent ? 'var(--text-muted, #9ca3af)' : '#ffffff',
                    border: isCurrent ? '1px solid var(--line-strong)' : 'none',
                    transition: 'transform 0.2s, opacity 0.2s, color 0.2s, background-color 0.2s, border-color 0.2s, box-shadow 0.2s, filter 0.2s, width 0.2s'
                  }}
                >
                  {isCurrent ? 'Active Subscription' : 'Upgrade Plan'}
                </button>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default PlanSubscriptionPage
