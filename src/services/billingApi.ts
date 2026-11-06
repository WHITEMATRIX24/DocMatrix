/**
 * DocMatrix Centralized Billing API Client
 * Connects frontend Billing pages to NestJS Billing APIs.
 */

import { apiClient } from './apiClient'

// ============================================================
// Types and Normalization Interfaces
// ============================================================

export type BackendInvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'VOID'
export type FrontendInvoiceStatus = 'Draft' | 'Unpaid' | 'Partial' | 'Paid' | 'Void'

export type BackendPaymentMode = 'CASH' | 'CARD' | 'UPI' | 'NET_BANKING' | 'CHEQUE'
export type FrontendPaymentMode = 'Cash' | 'Card' | 'UPI' | 'Net Banking' | 'Cheque'

export type BackendGstClass = 'EXEMPT' | 'TAXABLE' | 'NIL_RATED'
export type FrontendGstClass = 'treatment' | 'cosmetic'

export interface BackendInvoiceLineItem {
  id: string
  clinicId: string
  invoiceId: string
  serviceTariffId?: string | null
  treatmentPlanItemId?: string | null
  name: string
  category?: string | null
  toothNumber?: string | null
  quantity: number
  unitPrice: number | string
  discount: number | string
  gstRate: number | string
  taxableAmount: number | string
  taxAmount: number | string
  totalAmount: number | string
  createdAt?: string
}

export interface BackendInvoicePayment {
  id: string
  clinicId: string
  invoiceId: string
  type: 'PAYMENT' | 'REFUND'
  amount: number | string
  mode: BackendPaymentMode
  reference?: string | null
  idempotencyKey?: string | null
  refundForPaymentId?: string | null
  receivedAt: string
  receivedById?: string | null
  notes?: string | null
}

export interface BackendInvoice {
  id: string
  clinicId: string
  invoiceNumber: string
  patientId: string
  appointmentId?: string | null
  treatmentPlanId?: string | null
  description: string
  notes?: string | null
  internalNotes?: string | null
  subtotal: number | string
  discountTotal: number | string
  taxTotal: number | string
  totalAmount: number | string
  paidAmount: number | string
  balance: number | string
  status: BackendInvoiceStatus
  dueDate?: string | null
  issuedAt?: string | null
  voidedAt?: string | null
  voidReason?: string | null
  createdAt: string
  updatedAt: string
  items?: BackendInvoiceLineItem[]
  payments?: BackendInvoicePayment[]
  patient?: {
    id: string
    patientCode?: string
    firstName: string
    lastName: string
    mobile?: string
    phone?: string
  }
}

export interface BackendTariff {
  id: string
  clinicId: string
  name: string
  code?: string | null
  category: string
  standardFee: number | string
  offerPrice?: number | string | null
  gstClass: BackendGstClass
  gstRate: number | string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface BackendExpense {
  id: string
  clinicId: string
  expenseNumber?: string | null
  date: string
  category: string
  description: string
  vendor?: string | null
  amount: number | string
  mode: BackendPaymentMode
  reference?: string | null
  paidById?: string | null
  createdAt: string
}

// Bidirectional Normalization Helpers
export const toFrontendStatus = (s: BackendInvoiceStatus | string): FrontendInvoiceStatus => {
  switch (s?.toUpperCase()) {
    case 'PAID':
      return 'Paid'
    case 'PARTIALLY_PAID':
    case 'PARTIAL':
      return 'Partial'
    case 'ISSUED':
    case 'UNPAID':
      return 'Unpaid'
    case 'DRAFT':
      return 'Draft'
    case 'VOID':
      return 'Void'
    default:
      return 'Unpaid'
  }
}

export const toBackendStatus = (s: FrontendInvoiceStatus | string): BackendInvoiceStatus => {
  switch (s) {
    case 'Paid':
      return 'PAID'
    case 'Partial':
      return 'PARTIALLY_PAID'
    case 'Unpaid':
      return 'ISSUED'
    case 'Draft':
      return 'DRAFT'
    case 'Void':
      return 'VOID'
    default:
      return 'ISSUED'
  }
}

export const toFrontendMode = (m: BackendPaymentMode | string): FrontendPaymentMode => {
  switch (m?.toUpperCase()) {
    case 'CASH':
      return 'Cash'
    case 'CARD':
      return 'Card'
    case 'UPI':
      return 'UPI'
    case 'NET_BANKING':
      return 'Net Banking'
    case 'CHEQUE':
      return 'Cheque'
    default:
      return 'UPI'
  }
}

export const toBackendMode = (m: FrontendPaymentMode | string): BackendPaymentMode => {
  switch (m?.trim().toLowerCase()) {
    case 'cash':
      return 'CASH'
    case 'card':
      return 'CARD'
    case 'upi':
      return 'UPI'
    case 'net banking':
    case 'net_banking':
      return 'NET_BANKING'
    case 'cheque':
      return 'CHEQUE'
    default:
      return 'UPI'
  }
}

// ============================================================
// Billing API Service Class
// ============================================================

class BillingApiService {
  // ── Overview / Dashboard ────────────────────────────────
  async getDashboard() {
    return apiClient.get('/billing/dashboard')
  }

  // ── Invoices ────────────────────────────────────────────
  async getInvoices(params?: {
    status?: string
    patientId?: string
    appointmentId?: string
    search?: string
    fromDate?: string
    toDate?: string
    page?: number
    limit?: number
  }): Promise<{ data: BackendInvoice[]; meta?: any }> {
    const queryParams: Record<string, any> = { ...params }
    if (params?.status && params.status !== 'All') {
      queryParams.status = toBackendStatus(params.status)
    } else {
      delete queryParams.status
    }
    return apiClient.get('/billing/invoices', queryParams)
  }

  async getInvoiceById(id: string): Promise<BackendInvoice> {
    return apiClient.get(`/billing/invoices/${encodeURIComponent(id)}`)
  }

  async createDraftInvoice(data: {
    patientId: string
    appointmentId?: string
    treatmentPlanId?: string
    description?: string
    notes?: string
    internalNotes?: string
    dueDate?: string
    items: Array<{
      name: string
      category?: string
      toothNumber?: string
      quantity?: number
      unitPrice: number
      discount?: number
      gstRate?: number
      serviceTariffId?: string
      treatmentPlanItemId?: string
    }>
  }): Promise<BackendInvoice> {
    return apiClient.post('/billing/invoices/draft', data)
  }

  async updateDraftInvoice(
    id: string,
    data: {
      patientId?: string
      appointmentId?: string
      treatmentPlanId?: string
      description?: string
      notes?: string
      dueDate?: string
      items?: Array<{
        name: string
        category?: string
        toothNumber?: string
        quantity?: number
        unitPrice: number
        discount?: number
        gstRate?: number
        serviceTariffId?: string
        treatmentPlanItemId?: string
      }>
    },
  ): Promise<BackendInvoice> {
    return apiClient.patch(`/billing/invoices/${encodeURIComponent(id)}/draft`, data)
  }

  async issueDraftInvoice(id: string): Promise<BackendInvoice> {
    return apiClient.post(`/billing/invoices/${encodeURIComponent(id)}/issue`)
  }

  async createAndIssueInvoice(data: {
    patientId: string
    appointmentId?: string
    treatmentPlanId?: string
    description?: string
    notes?: string
    internalNotes?: string
    dueDate?: string
    items: Array<{
      name: string
      category?: string
      toothNumber?: string
      quantity?: number
      unitPrice: number
      discount?: number
      gstRate?: number
      serviceTariffId?: string
      treatmentPlanItemId?: string
    }>
    upfrontPayment?: {
      amount: number
      mode: BackendPaymentMode
      reference?: string
      notes?: string
      idempotencyKey?: string
    }
  }): Promise<BackendInvoice> {
    return apiClient.post('/billing/invoices/issue', data)
  }

  async voidInvoice(id: string, reason: string): Promise<BackendInvoice> {
    return apiClient.post(`/billing/invoices/${encodeURIComponent(id)}/void`, { reason })
  }

  async createInvoiceFromTreatmentPlan(data: {
    treatmentPlanId: string
    stageId?: string
    itemIds?: string[]
    appointmentId?: string
    notes?: string
    issueImmediately?: boolean
    upfrontPayment?: {
      amount: number
      mode: BackendPaymentMode
      reference?: string
      notes?: string
    }
  }): Promise<BackendInvoice> {
    return apiClient.post('/billing/invoices/from-treatment-plan', data)
  }

  // ── Payments & Refunds ──────────────────────────────────
  async recordPayment(
    invoiceId: string,
    payment: {
      amount: number
      mode: BackendPaymentMode
      reference?: string
      notes?: string
      idempotencyKey?: string
      receivedAt?: string
    },
  ): Promise<BackendInvoicePayment> {
    return apiClient.post(`/billing/invoices/${encodeURIComponent(invoiceId)}/payments`, payment)
  }

  async refundPayment(
    paymentId: string,
    data: {
      amount: number
      reason?: string
      reference?: string
      idempotencyKey?: string
    },
  ): Promise<BackendInvoicePayment> {
    return apiClient.post(`/billing/payments/${encodeURIComponent(paymentId)}/refund`, data)
  }

  // ── Pending Dues ────────────────────────────────────────
  async getPendingDues(params?: {
    patientId?: string
    search?: string
    aging?: 'all' | '0-30' | '31-60' | '60+'
  }): Promise<{
    summary: {
      totalOutstanding: number
      invoiceCount: number
      breakdown: { '0-30': number; '31-60': number; '60+': number }
    }
    invoices: BackendInvoice[]
  }> {
    return apiClient.get('/billing/dues', params)
  }

  async getPatientWiseDues(): Promise<
    Array<{
      patientId: string
      patientCode: string
      patientName: string
      mobile: string
      totalDue: number
      invoiceCount: number
      oldestInvoiceDate: string
    }>
  > {
    return apiClient.get('/billing/dues/patient-wise')
  }

  // ── Daily Collections ───────────────────────────────────
  async getDailyCollections(params?: {
    date?: string
    fromDate?: string
    toDate?: string
    mode?: BackendPaymentMode
  }): Promise<{
    date: string
    grossCollections: number
    totalRefunds: number
    netCollections: number
    byMode: Record<string, { payments: number; refunds: number; net: number }>
    transactions: Array<BackendInvoicePayment & { invoice?: any; receivedBy?: any }>
  }> {
    return apiClient.get('/billing/collections/daily', params)
  }

  // ── Service Tariffs (Master Price List) ─────────────────
  async getTariffs(params?: { category?: string; search?: string; isActive?: boolean }): Promise<BackendTariff[]> {
    return apiClient.get('/billing/tariffs', params)
  }

  async getTariffById(id: string): Promise<BackendTariff> {
    return apiClient.get(`/billing/tariffs/${encodeURIComponent(id)}`)
  }

  async createTariff(data: {
    name: string
    code?: string
    category?: string
    standardFee: number
    offerPrice?: number
    gstClass?: BackendGstClass
    gstRate?: number
    isActive?: boolean
  }): Promise<BackendTariff> {
    return apiClient.post('/billing/tariffs', data)
  }

  async updateTariff(
    id: string,
    data: {
      name?: string
      code?: string
      category?: string
      standardFee?: number
      offerPrice?: number
      gstClass?: BackendGstClass
      gstRate?: number
      isActive?: boolean
    },
  ): Promise<BackendTariff> {
    return apiClient.patch(`/billing/tariffs/${encodeURIComponent(id)}`, data)
  }

  async toggleTariffActive(id: string): Promise<BackendTariff> {
    return apiClient.patch(`/billing/tariffs/${encodeURIComponent(id)}/toggle-active`)
  }

  async deleteTariff(id: string): Promise<any> {
    return apiClient.delete(`/billing/tariffs/${encodeURIComponent(id)}`)
  }

  // ── Expenses ────────────────────────────────────────────
  async getExpenses(params?: {
    category?: string
    fromDate?: string
    toDate?: string
    search?: string
  }): Promise<BackendExpense[]> {
    return apiClient.get('/billing/expenses', params)
  }

  async getExpenseSummary(): Promise<{
    totalAmount: number
    count: number
    byCategory: Record<string, number>
  }> {
    return apiClient.get('/billing/expenses/summary')
  }

  async createExpense(data: {
    date: string
    category: string
    description: string
    vendor?: string
    amount: number
    mode?: BackendPaymentMode
    reference?: string
  }): Promise<BackendExpense> {
    return apiClient.post('/billing/expenses', data)
  }

  async updateExpense(
    id: string,
    data: {
      date?: string
      category?: string
      description?: string
      vendor?: string
      amount?: number
      mode?: BackendPaymentMode
      reference?: string
    },
  ): Promise<BackendExpense> {
    return apiClient.patch(`/billing/expenses/${encodeURIComponent(id)}`, data)
  }

  async deleteExpense(id: string): Promise<any> {
    return apiClient.delete(`/billing/expenses/${encodeURIComponent(id)}`)
  }
}

export const billingApi = new BillingApiService()

