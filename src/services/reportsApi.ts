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
