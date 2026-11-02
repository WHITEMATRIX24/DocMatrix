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

  useEffect(() => {
    let mounted = true

    const loadData = async () => {
      try {
        setLoading(true)
        const [subRes, plansRes] = await Promise.all([
          apiClient.get<Subscription>('/subscriptions/current').catch(() => null),
          apiClient.get<Plan[]>('/plans').catch(() => null)
        ])

        if (mounted) {
          if (subRes && subRes.id) {
            setSubscription(subRes)
          } else {
            setSubscription(null)
          }
          if (Array.isArray(plansRes)) {
            setPlans(plansRes)
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

  const displayPlans = plans

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px', fontFamily: 'inherit' }}>
      <header style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0d9488', fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em' }}>
          <ShieldCheck size={16} />
          <span>SUBSCRIPTION &amp; BILLING</span>
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#134e4a', margin: '6px 0 8px' }}>
          Plans &amp; Subscription Management
        </h1>
        <p style={{ color: '#4b5563', fontSize: '14px', maxWidth: '680px' }}>
          Review your clinic&apos;s active subscription tier, manage operatory chair entitlements, and explore upgraded capabilities.
        </p>
      </header>

      {/* Active Subscription Status Card */}
      <section style={{
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
        border: '1px solid #a7f3d0',
        borderRadius: '16px',
        padding: '24px 28px',
        marginBottom: '40px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{
                background: '#059669',
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
              <span style={{ color: '#065f46', fontSize: '13px', fontWeight: 600 }}>
                {subscription?.billingInterval ? `${subscription.billingInterval} CYCLE` : '30-DAY FREE CLINICAL TRIAL'}
              </span>
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: '#064e3b', margin: '12px 0 6px' }}>
              {subscription?.plan?.name || 'DocMatrix Solo Practice Edition'}
            </h2>
            <p style={{ color: '#047857', fontSize: '14px', margin: 0 }}>
              Full access to Electronic Dental Records, Odontogram Tooth Charting, Live Queue, and Patient SMS Reminders.
            </p>
          </div>

          <div style={{
            background: '#ffffff',
            border: '1px solid #d1fae5',
            borderRadius: '12px',
            padding: '14px 20px',
            minWidth: '220px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '12px', marginBottom: '4px' }}>
              <Calendar size={14} />
              <span>Current Term Ends</span>
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#111827' }}>
              {subscription?.currentPeriodEnd
                ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
                : '30 Nov 2026'}
            </div>
            <div style={{ fontSize: '11px', color: '#059669', marginTop: '4px', fontWeight: 600 }}>
              Auto-renewing active tier
            </div>
          </div>
        </div>
      </section>

      {/* Available Plans Grid */}
      <section>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', marginBottom: '8px' }}>
          Available Clinical Editions
        </h2>
        <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
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
                  background: '#ffffff',
                  border: isCurrent ? '2px solid #0d9488' : '1px solid #e5e7eb',
                  borderRadius: '16px',
                  padding: '24px',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: isCurrent ? '0 10px 15px -3px rgba(13, 148, 136, 0.1)' : '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                {isCurrent && (
                  <span style={{
                    position: 'absolute',
                    top: '-12px',
                    right: '20px',
                    background: '#0d9488',
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
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: '0 0 6px' }}>
                    {plan.name}
                  </h3>
                  <p style={{ color: '#6b7280', fontSize: '13px', minHeight: '38px', margin: '0 0 16px' }}>
                    {plan.description}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '20px' }}>
                    <span style={{ fontSize: '28px', fontWeight: 800, color: '#0d9488' }}>
                      ₹{plan.monthlyPriceInr.toLocaleString('en-IN')}
                    </span>
                    <span style={{ color: '#6b7280', fontSize: '13px' }}>/ month</span>
                  </div>

                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151' }}>
                      <Check size={16} color="#0d9488" />
                      <span><strong>{plan.maxDoctors}</strong> Doctor Seat{plan.maxDoctors > 1 ? 's' : ''} Included</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151' }}>
                      <Check size={16} color="#0d9488" />
                      <span><strong>{plan.maxChairs}</strong> Operatory Chair{plan.maxChairs > 1 ? 's' : ''}</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151' }}>
                      <Check size={16} color="#0d9488" />
                      <span>Smart Live Queue &amp; Check-In</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151' }}>
                      <Check size={16} color="#0d9488" />
                      <span>Interactive Odontogram Charting</span>
                    </li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#374151' }}>
                      <Check size={16} color="#0d9488" />
                      <span>WhatsApp &amp; SMS Recall Notifications</span>
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  disabled={isCurrent}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: isCurrent ? 'default' : 'pointer',
                    background: isCurrent ? '#f3f4f6' : '#0d9488',
                    color: isCurrent ? '#9ca3af' : '#ffffff',
                    border: 'none',
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
