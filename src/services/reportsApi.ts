import { apiClient } from './apiClient'

export interface ReportQueryParams {
  fromDate?: string
  toDate?: string
  range?: 'today' | '7d' | 'month' | '90d' | 'year' | 'custom'
  doctor?: string
  category?: string
  filter?: string
  search?: string
}

export interface DateSpan {
  from: string
  to: string
}

export interface BackendPeriodMetrics {
  collected: number
  paymentCount: number
  billed: number
  invoiceCount: number
  paidInvoicesCount: number
  unpaid: number
  averageBill: number
  patientsBilled: number
  byMode: Record<string, number>
  visitsBooked: number
  visitsCompleted: number
  patientsTreated: number
  newPatients: number
  returningPatients: number
  cancelled: number
  noShows: number
  stillOpen: number
  withOutcome: number
  attendedPct: number
  noShowPct: number
  cancelledPct: number
  plansTotal: number
  plansCompleted: number
  plansAcceptedValue: number
  plansCompletedValue: number
  planCompletionPct: number
}

export interface BackendRevenueReportResponse {
  span: DateSpan
  prevSpan: DateSpan
  days: number
  useMonthlyBuckets: boolean
  current: BackendPeriodMetrics
  previous: BackendPeriodMetrics
  series: Array<{ date: string; label: string; amount: number }>
  maxPoint: number
  modes: Array<{ mode: string; amount: number; share: number }>
}

export interface BackendDoctorRow {
  doctorId?: string
  doctor: string
  specialization: string
  appointments: number
  completed: number
  noShows: number
  cancelled: number
  attendancePct: number
  proceduresDone: number
  planValue: number
  collected: number
  billed: number
}

export interface BackendDoctorsReportResponse {
  span: DateSpan
  prevSpan: DateSpan
  days: number
  summary: {
    doctorsWithVisits: number
    unassignedBilled?: number
    totalDoctors: number
    completedVisits: number
    proceduresDone: number
    collected: number
  }
  doctors: BackendDoctorRow[]
}

export interface BackendTreatmentsReportResponse {
  span: DateSpan
  prevSpan: DateSpan
  days: number
  current: BackendPeriodMetrics
  previous: BackendPeriodMetrics
  categories: Array<{
    category: string
    completedCount: number
    plannedCount: number
    total: number
    value: number
  }>
  procedures: Array<{
    name: string
    category: string
    count: number
    value: number
  }>
  planStatus: Array<{
    status: string
    count: number
    value: number
  }>
  topTeeth: Array<{
    tooth: string
    count: number
  }>
}

export interface BackendFollowUpsReportResponse {
  span: DateSpan
  prevSpan: DateSpan
  days: number
  current: BackendPeriodMetrics
  previous: BackendPeriodMetrics
  contacts: Array<{
    id: string
    patientId: string
    patientCode: string
    patientName: string
    mobile: string
    kind: 'missed' | 'treatment' | 'recall'
    title: string
    detail: string
    dateLabel: string
    sortDate: string
    whatsappText: string
    contacted: boolean
    contactedAt?: string
  }>
  contactCounts: {
    all: number
    missed: number
    treatment: number
    recall: number
    contacted: number
  }
  contactLog: Record<string, string>
  alertPatients: Array<{
    id: string
    firstName: string
    lastName: string
    allergiesDetails: string
    conditionsDetails: string
    medicationsDetails: string
  }>
  weekdays: Array<{ label: string; count: number }>
  visitTypes: Array<{ type: string; count: number; share: number }>
}

export interface PeriodMetrics {
  collected: number
  paymentCount: number
  billed: number
  invoiceCount: number
  unpaid: number
  averageBill: number
  patientsBilled: number
  visitsBooked: number
  visitsCompleted: number
  patientsTreated: number
  newPatients: number
  returningPatients: number
  cancelled: number
  noShows: number
  withOutcome: number
  attendedPct: number
  cancelledPct: number
  noShowPct: number
  plansMade: number
  plansValue: number
  plansCompleted: number
  plansCompletedPct: number
  plansCompletedValue: number
}

export interface TimelinePoint {
  key: string
  label: string
  value: number
  billed: number
}

export interface PaymentModeBreakdown {
  key: string
  label: string
  value: number
  count: number
  percentage: number
  display: string
}

export interface RevenueReportResponse {
  now: PeriodMetrics
  before: PeriodMetrics
  timeline: TimelinePoint[]
  byPaymentMode: PaymentModeBreakdown[]
  invoicesByStatus?: Record<string, { count: number; total: number }>
  taxAndDiscounts?: {
    totalTax: number
    totalDiscount: number
  }
  expensesTotal?: number
}

export interface DoctorPerformanceRow {
  name: string
  specialization: string
  scheduled?: number
  completed: number
  patients: number
  missed: number
  treatments?: number
  value?: number
  pending: number
}

export interface DoctorPerformanceResponse {
  summary?: { unassignedBilled?: number };
  now: Partial<PeriodMetrics>
  before: Partial<PeriodMetrics>
  doctors: DoctorPerformanceRow[]
}

export interface RankedItem {
  key: string
  label: string
  value: number
  sub?: string
  display: string
}

export interface TreatmentBreakdownResponse {
  now: Partial<PeriodMetrics>
  before: Partial<PeriodMetrics>
  procedures: RankedItem[]
  categories: RankedItem[]
  stages: RankedItem[]
  teeth: RankedItem[]
}

export interface FollowUpContactItem {
  patientId: string
  patientName: string
  mobile: string
  reasons: ('missed' | 'unfinished' | 'recall')[]
  missedVisits: { date: string; treatmentType: string }[]
  plansCount: number
  value: number
  lastVisit: string | null
  since: number | null
}

export interface FollowUpsResponse {
  now: Partial<PeriodMetrics>
  before: Partial<PeriodMetrics>
  contacts: FollowUpContactItem[]
}

export interface InventoryReportResponse {
  totalItems: number
  lowStockItemsCount: number
  totalValuation: number
  stockAlerts: {
    id: string
    name: string
    sku: string
    currentStock: number
    minStock: number
    unit: string
  }[]
  movementsSummary: {
    restockCount: number
    restockQuantity: number
    consumptionCount: number
    consumptionQuantity: number
  }
  expiringBatches: {
    id: string
    itemName: string
    batchNumber: string
    quantity: number
    expiryDate: string
    daysUntilExpiry: number
  }[]
}

export const normalizePeriodMetrics = (m?: Partial<BackendPeriodMetrics & PeriodMetrics> | null): Partial<PeriodMetrics> | undefined => {
  if (!m) return undefined
  const plansMade = m.plansMade ?? m.plansTotal ?? 0
  const plansCompleted = m.plansCompleted ?? 0
  return {
    ...m,
    plansMade,
    plansValue: m.plansValue ?? m.plansAcceptedValue ?? 0,
    plansCompleted,
    plansCompletedPct: m.plansCompletedPct ?? m.planCompletionPct ?? (plansMade > 0 ? Math.round((plansCompleted / plansMade) * 100) : 0),
    plansCompletedValue: m.plansCompletedValue ?? 0,
  }
}

const formatInrShort = (amount: number) => `₹${Math.round(amount).toLocaleString('en-IN')}`

export const normalizeRevenueReport = (raw: any): RevenueReportResponse => {
  if (!raw) return raw
  const now = (normalizePeriodMetrics(raw.now ?? raw.current) ?? {}) as PeriodMetrics
  const before = (normalizePeriodMetrics(raw.before ?? raw.previous) ?? {}) as PeriodMetrics
  const timeline: TimelinePoint[] = Array.isArray(raw.timeline)
    ? raw.timeline
    : Array.isArray(raw.series)
      ? raw.series.map((s: any) => ({
          key: s.date,
          label: s.label,
          value: Number(s.amount || 0),
          billed: 0,
        }))
      : []
  const byPaymentMode: PaymentModeBreakdown[] = Array.isArray(raw.byPaymentMode)
    ? raw.byPaymentMode
    : Array.isArray(raw.modes)
      ? raw.modes.map((m: any) => {
          const val = Number(m.amount || 0)
          const pct = Number(m.share || 0)
          return {
            key: m.mode,
            label: m.mode,
            value: val,
            count: 0,
            percentage: pct,
            display: `${formatInrShort(val)} · ${pct}%`,
          }
        })
      : []
  return {
    ...raw,
    now,
    before,
    timeline,
    byPaymentMode,
  }
}

export const normalizeTreatmentBreakdown = (raw: any, canSeeMoney = true): TreatmentBreakdownResponse => {
  if (!raw) return raw
  const now = normalizePeriodMetrics(raw.now ?? raw.current) ?? {}
  const before = normalizePeriodMetrics(raw.before ?? raw.previous) ?? {}
  const procedures: RankedItem[] = Array.isArray(raw.procedures)
    ? raw.procedures.map((p: any) =>
        p && typeof p.label === 'string' && typeof p.key === 'string'
          ? p
          : {
              key: p.name,
              label: p.name,
              value: Number(p.count || 0),
              display: String(p.count ?? 0),
            }
      )
    : []
  const categories: RankedItem[] = Array.isArray(raw.categories)
    ? raw.categories.map((c: any) =>
        c && typeof c.label === 'string' && typeof c.key === 'string'
          ? c
          : {
              key: c.category,
              label: c.category,
              value: Number(c.total ?? c.completedCount ?? 0),
              display: String(c.total ?? c.completedCount ?? 0),
            }
      )
    : []
  const rawStages = Array.isArray(raw.stages) ? raw.stages : Array.isArray(raw.planStatus) ? raw.planStatus : []
  const stages: RankedItem[] = rawStages.map((s: any) =>
    s && typeof s.label === 'string' && typeof s.key === 'string'
      ? s
      : {
          key: s.status,
          label: s.status,
          value: Number(s.count || 0),
          display: canSeeMoney ? `${s.count ?? 0} · ${formatInrShort(Number(s.value || 0))}` : String(s.count ?? 0),
        }
  )
  const rawTeeth = Array.isArray(raw.teeth) ? raw.teeth : Array.isArray(raw.topTeeth) ? raw.topTeeth : []
  const teeth: RankedItem[] = rawTeeth.map((t: any) => {
    if (t && typeof t.label === 'string' && typeof t.key === 'string') return t
    const tooth = String(t.tooth || '').trim()
    const single = /^\d{2}$/.test(tooth)
    return {
      key: tooth,
      label: single ? `Tooth ${tooth}` : tooth,
      value: Number(t.count || 0),
      display: String(t.count ?? 0),
    }
  })
  return {
    ...raw,
    now,
    before,
    procedures,
    categories,
    stages,
    teeth,
  }
}

export const normalizeFollowUpsReport = (raw: any): FollowUpsResponse => {
  if (!raw) return raw
  const now = normalizePeriodMetrics(raw.now ?? raw.current) ?? {}
  const before = normalizePeriodMetrics(raw.before ?? raw.previous) ?? {}
  const contacts: FollowUpContactItem[] = Array.isArray(raw.contacts)
    ? raw.contacts.map((c: any) => {
        const mappedReason: 'missed' | 'unfinished' | 'recall' =
          c.kind === 'treatment' ? 'unfinished' : c.kind === 'recall' ? 'recall' : 'missed'
        const reasons: ('missed' | 'unfinished' | 'recall')[] = Array.isArray(c.reasons)
          ? c.reasons
          : [mappedReason]
        const missedVisits = Array.isArray(c.missedVisits)
          ? c.missedVisits
          : mappedReason === 'missed'
            ? [{ date: c.sortDate || c.dateLabel || '', treatmentType: c.title || 'Dental visit' }]
            : []
        return {
          ...c,
          patientId: c.patientId || c.patientCode || c.id,
          patientName: c.patientName || 'Unknown patient',
          mobile: c.mobile || '',
          reasons,
          missedVisits,
          plansCount: Number(c.plansCount ?? (mappedReason === 'unfinished' ? 1 : 0)),
          value: Number(c.value ?? 0),
          lastVisit: c.lastVisit ?? (mappedReason === 'recall' ? c.sortDate : null),
          since: c.since ?? null,
        }
      })
    : []
  return {
    ...raw,
    now,
    before,
    contacts,
  }
}

export const reportsApi = {
  getSummary: async (params?: ReportQueryParams) => {
    return apiClient.get<{
      span: DateSpan
      prevSpan: DateSpan
      days: number
      current: BackendPeriodMetrics
      previous: BackendPeriodMetrics
    }>('/reports/summary', params as Record<string, string | number | boolean | undefined>)
  },

  getRevenueReport: async (fromOrParams?: string | ReportQueryParams, to?: string): Promise<any> => {
    const params = typeof fromOrParams === 'string' ? { fromDate: fromOrParams, toDate: to } : fromOrParams
    return apiClient.get<BackendRevenueReportResponse>(
      '/reports/revenue',
      params as Record<string, string | number | boolean | undefined>
    )
  },

  getDoctorsReport: async (params?: ReportQueryParams): Promise<BackendDoctorsReportResponse> => {
    return apiClient.get<BackendDoctorsReportResponse>(
      '/reports/doctors',
      params as Record<string, string | number | boolean | undefined>
    )
  },

  getDoctorPerformance: async (fromOrParams?: string | ReportQueryParams, to?: string): Promise<any> => {
    const params = typeof fromOrParams === 'string' ? { fromDate: fromOrParams, toDate: to } : fromOrParams
    return apiClient.get(
      '/reports/doctors',
      params as Record<string, string | number | boolean | undefined>
    )
  },

  getTreatmentsReport: async (params?: ReportQueryParams): Promise<BackendTreatmentsReportResponse> => {
    return apiClient.get<BackendTreatmentsReportResponse>(
      '/reports/treatments',
      params as Record<string, string | number | boolean | undefined>
    )
  },

  getTreatmentBreakdown: async (fromOrParams?: string | ReportQueryParams, to?: string): Promise<any> => {
    const params = typeof fromOrParams === 'string' ? { fromDate: fromOrParams, toDate: to } : fromOrParams
    return apiClient.get(
      '/reports/treatments',
      params as Record<string, string | number | boolean | undefined>
    )
  },

  getFollowUpsReport: async (params?: ReportQueryParams): Promise<BackendFollowUpsReportResponse> => {
    return apiClient.get<BackendFollowUpsReportResponse>(
      '/reports/follow-ups',
      params as Record<string, string | number | boolean | undefined>
    )
  },

  getFollowUps: async (fromOrParams?: string | ReportQueryParams, to?: string): Promise<any> => {
    const params = typeof fromOrParams === 'string' ? { fromDate: fromOrParams, toDate: to } : fromOrParams
    return apiClient.get(
      '/reports/follow-ups',
      params as Record<string, string | number | boolean | undefined>
    )
  },

  getInventoryReport: async (): Promise<InventoryReportResponse> => {
    return apiClient.get<InventoryReportResponse>('/reports/inventory')
  },

  markPatientContacted: async (
    patientId: string
  ): Promise<{ patientId: string; patientUUID?: string; contacted: boolean; contactedAt: string }> => {
    return apiClient.post(`/reports/follow-ups/${encodeURIComponent(patientId)}/contact`, {})
  },

  unmarkPatientContacted: async (
    patientId: string
  ): Promise<{ patientId: string; contacted: boolean }> => {
    return apiClient.delete(`/reports/follow-ups/${encodeURIComponent(patientId)}/contact`)
  },
}
