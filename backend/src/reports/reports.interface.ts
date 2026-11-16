export interface PeriodMetrics {
  collected: number;
  paymentCount: number;
  billed: number;
  invoiceCount: number;
  unpaid: number;
  averageBill: number;
  patientsBilled: number;
  visitsBooked: number;
  visitsCompleted: number;
  patientsTreated: number;
  newPatients: number;
  returningPatients: number;
  cancelled: number;
  noShows: number;
  withOutcome: number;
  attendedPct: number;
  cancelledPct: number;
  noShowPct: number;
  plansMade: number;
  plansValue: number;
  plansCompleted: number;
  plansCompletedPct: number;
  plansCompletedValue: number;
}

export interface TimelinePoint {
  key: string;
  label: string;
  value: number; // Collected
  billed: number;
}

export interface PaymentModeBreakdown {
  key: string;
  label: string;
  value: number;
  count: number;
  percentage: number;
  display: string;
}

export interface RevenueReportResponse {
  now: PeriodMetrics;
  before: PeriodMetrics;
  timeline: TimelinePoint[];
  byPaymentMode: PaymentModeBreakdown[];
  invoicesByStatus: Record<string, { count: number; total: number }>;
  taxAndDiscounts: {
    totalTax: number;
    totalDiscount: number;
  };
  expensesTotal: number;
}

export interface DoctorPerformanceRow {
  name: string;
  specialization: string;
  scheduled: number;
  completed: number;
  patients: number;
  missed: number;
  treatments: number;
  value: number;
  pending: number;
}

export interface DoctorPerformanceResponse {
  now: PeriodMetrics;
  before: PeriodMetrics;
  doctors: DoctorPerformanceRow[];
}

export interface RankedItem {
  key: string;
  label: string;
  value: number;
  sub?: string;
  display: string;
}

export interface TreatmentBreakdownResponse {
  now: PeriodMetrics;
  before: PeriodMetrics;
  procedures: RankedItem[];
  categories: RankedItem[];
  stages: RankedItem[];
  teeth: RankedItem[];
}

export interface FollowUpContactItem {
  patientId: string;
  patientName: string;
  mobile: string;
  reasons: ('missed' | 'unfinished' | 'recall')[];
  missedVisits: { date: string; treatmentType: string }[];
  plansCount: number;
  value: number;
  lastVisit: string | null;
  since: number | null;
}

export interface FollowUpsResponse {
  now: PeriodMetrics;
  before: PeriodMetrics;
  contacts: FollowUpContactItem[];
}

export interface InventoryReportResponse {
  totalItems: number;
  lowStockItemsCount: number;
  totalValuation: number;
  stockAlerts: {
    id: string;
    name: string;
    sku: string;
    currentStock: number;
    minStock: number;
    unit: string;
  }[];
  movementsSummary: {
    restockCount: number;
    restockQuantity: number;
    consumptionCount: number;
    consumptionQuantity: number;
  };
  expiringBatches: {
    id: string;
    itemName: string;
    batchNumber: string;
    quantity: number;
    expiryDate: string;
    daysUntilExpiry: number;
  }[];
}

