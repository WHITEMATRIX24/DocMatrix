import { browserLocalStorage, browserSessionStorage } from '@/services/browserStorage';
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { RevenueReportPage } from '@/pages/reports/RevenueReportPage'
import { DoctorPerformancePage } from '@/pages/reports/DoctorPerformancePage'
import { TreatmentBreakdownPage } from '@/pages/reports/TreatmentBreakdownPage'
import { FollowUpsPage } from '@/pages/reports/FollowUpsPage'
import { reportsApi } from '@/services/reportsApi'
import { ReportRangeProvider, resolveRange } from '@/pages/reports/ReportsShared'

const renderWithRange = (ui) => {
  const range = resolveRange('30d')
  return render(
    <MemoryRouter>
      <ReportRangeProvider value={range}>
        {ui}
      </ReportRangeProvider>
    </MemoryRouter>
  )
}

describe('DocMatrix Reports Reliability & Security Verification', () => {
  beforeEach(() => {
    browserSessionStorage.clear()
    browserLocalStorage.clear()
    // Set authenticated token to trigger live authoritative mode
    browserSessionStorage.setItem('docmatrix_auth_token', 'mock-jwt-token')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    browserSessionStorage.clear()
    browserLocalStorage.clear()
  })

  describe('RevenueReportPage Data Reliability', () => {
    it('displays error state with retry button on network failure and does not show mock data', async () => {
      const getRevenueSpy = vi.spyOn(reportsApi, 'getRevenueReport')
        .mockRejectedValueOnce(new Error('Network error connecting to backend'))
        .mockResolvedValueOnce({
          now: {
            collected: 45000,
            paymentCount: 8,
            billed: 60000,
            invoiceCount: 10,
            unpaid: 15000,
            averageBill: 6000,
            patientsBilled: 10,
            visitsBooked: 15,
            visitsCompleted: 12,
            patientsTreated: 12,
            newPatients: 4,
            returningPatients: 8,
            cancelled: 2,
            noShows: 1,
            withOutcome: 15,
            attendedPct: 80,
            cancelledPct: 13,
            noShowPct: 7,
            plansMade: 5,
            plansValue: 40000,
            plansCompleted: 3,
            plansCompletedPct: 60,
            plansCompletedValue: 25000,
          },
          before: {
            collected: 30000,
            paymentCount: 5,
            billed: 40000,
            invoiceCount: 6,
            unpaid: 10000,
            averageBill: 6667,
            patientsBilled: 6,
            visitsBooked: 10,
            visitsCompleted: 8,
            patientsTreated: 8,
            newPatients: 2,
            returningPatients: 6,
            cancelled: 1,
            noShows: 1,
            withOutcome: 10,
            attendedPct: 80,
            cancelledPct: 10,
            noShowPct: 10,
            plansMade: 4,
            plansValue: 30000,
            plansCompleted: 2,
            plansCompletedPct: 50,
            plansCompletedValue: 15000,
          },
          timeline: [
            { key: '2026-11-01', label: '01 Nov', value: 45000, billed: 60000 },
          ],
          byPaymentMode: [
            { key: 'UPI', label: 'UPI / QR', value: 45000, count: 8, percentage: 100, display: '₹45,000 · 100%' },
          ],
          invoicesByStatus: {},
          taxAndDiscounts: { totalTax: 4500, totalDiscount: 1000 },
          expensesTotal: 12000,
        })

      renderWithRange(<RevenueReportPage />)

      // 1. Should display clear error UI with retry option
      const errorHeading = await screen.findByText('Failed to Load Live Report Data')
      expect(errorHeading).toBeInTheDocument()
      expect(screen.getByText('Network error connecting to backend')).toBeInTheDocument()

      const retryBtn = screen.getByRole('button', { name: /Retry Request/i })
      expect(retryBtn).toBeInTheDocument()

      // 2. Click retry
      fireEvent.click(retryBtn)

      // 3. Should recover and show authoritative revenue
      await waitFor(() => {
        expect(screen.getByText('Collected')).toBeInTheDocument()
      })
      expect(screen.getByText('₹45,000')).toBeInTheDocument()
      expect(getRevenueSpy).toHaveBeenCalledTimes(2)
    })

    it('displays authentication required warning when backend responds with 403 Forbidden', async () => {
      const forbiddenErr = new Error('Insufficient permissions for role RECEPTIONIST')
      forbiddenErr.status = 403

      vi.spyOn(reportsApi, 'getRevenueReport').mockRejectedValueOnce(forbiddenErr)

      renderWithRange(<RevenueReportPage />)

      const authHeading = await screen.findByText('Authentication Required')
      expect(authHeading).toBeInTheDocument()
      expect(
        screen.getByText(/You must be logged in with authorized financial permissions/i)
      ).toBeInTheDocument()
    })
  })

  describe('DoctorPerformancePage Data Reliability', () => {
    it('displays error state on failure and recovers upon retry', async () => {
      const getDoctorsSpy = vi.spyOn(reportsApi, 'getDoctorPerformance')
        .mockRejectedValueOnce(new Error('Gateway timeout'))
        .mockResolvedValueOnce({
          now: { visitsCompleted: 15 },
          before: { visitsCompleted: 10 },
          doctors: [
            {
              name: 'Dr. Sarah Connor',
              specialization: 'Prosthodontist',
              scheduled: 18,
              completed: 15,
              patients: 12,
              missed: 3,
              treatments: 4,
              value: 48000,
              pending: 12000,
            },
          ],
        })

      renderWithRange(<DoctorPerformancePage />)

      expect(await screen.findByText('Failed to Load Live Report Data')).toBeInTheDocument()
      const retryBtn = screen.getByRole('button', { name: /Retry Request/i })
      fireEvent.click(retryBtn)

      await waitFor(() => {
        expect(screen.getByText('Dr. Sarah Connor')).toBeInTheDocument()
      })
      expect(screen.getByText('Prosthodontist')).toBeInTheDocument()
      expect(getDoctorsSpy).toHaveBeenCalledTimes(2)
    })
  })

  describe('TreatmentBreakdownPage Data Reliability', () => {
    it('displays error state on failure and recovers upon retry', async () => {
      const getTreatmentsSpy = vi.spyOn(reportsApi, 'getTreatmentBreakdown')
        .mockRejectedValueOnce(new Error('Service Unavailable'))
        .mockResolvedValueOnce({
          now: { visitsCompleted: 20, plansMade: 10, plansCompleted: 8, plansCompletedPct: 80, plansCompletedValue: 50000 },
          before: { visitsCompleted: 15, plansMade: 8, plansCompleted: 5, plansCompletedPct: 63, plansCompletedValue: 30000 },
          procedures: [{ key: 'Root Canal', label: 'Root Canal', value: 12, display: '12' }],
          categories: [{ key: 'Endodontics', label: 'Endodontics', value: 12, display: '12' }],
          stages: [{ key: 'COMPLETED', label: 'Completed', value: 8, display: '8 · ₹50,000' }],
          teeth: [{ key: '16', label: 'Tooth 16', value: 6, display: '6' }],
        })

      renderWithRange(<TreatmentBreakdownPage />)

      expect(await screen.findByText('Failed to Load Live Report Data')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: /Retry Request/i }))

      await waitFor(() => {
        expect(screen.getByText('Root Canal')).toBeInTheDocument()
      })
      expect(getTreatmentsSpy).toHaveBeenCalledTimes(2)
    })
  })

  describe('FollowUpsPage Data Reliability', () => {
    it('displays error state on failure and recovers upon retry', async () => {
      const getFollowUpsSpy = vi.spyOn(reportsApi, 'getFollowUps')
        .mockRejectedValueOnce(new Error('Database read failure'))
        .mockResolvedValueOnce({
          now: { visitsCompleted: 5, cancelled: 1, noShows: 1 },
          before: { visitsCompleted: 4, cancelled: 1, noShows: 0 },
          contacts: [
            {
              patientId: 'pt-101',
              patientName: 'Rohan Sharma',
              mobile: '9876543210',
              reasons: ['missed'],
              missedVisits: [{ date: '2026-11-04', treatmentType: 'Crown fitment' }],
              plansCount: 0,
              value: 0,
              lastVisit: '2026-11-04',
              since: 6,
            },
          ],
        })

      renderWithRange(<FollowUpsPage />)

      expect(await screen.findByText('Failed to Load Live Report Data')).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: /Retry Request/i }))

      await waitFor(() => {
        expect(screen.getByText('Rohan Sharma')).toBeInTheDocument()
      })
      expect(getFollowUpsSpy).toHaveBeenCalledTimes(2)
    })

    it('renders live backend payload shapes without crashing (FollowUps, Treatments, Revenue)', async () => {
      vi.spyOn(reportsApi, 'getFollowUps').mockResolvedValueOnce({
        current: { visitsCompleted: 7, cancelled: 1, noShows: 1, withOutcome: 9, attendedPct: 78, cancelledPct: 11, noShowPct: 11 },
        previous: { visitsCompleted: 4, cancelled: 0, noShows: 1, withOutcome: 5, attendedPct: 80, cancelledPct: 0, noShowPct: 20 },
        contacts: [
          {
            id: 'missed-apt-1',
            patientId: 'PT-101',
            patientCode: 'PT-101',
            patientName: 'Ananya Verma',
            mobile: '9876543210',
            kind: 'missed',
            title: 'Missed Crown prep',
            detail: 'Dr. Nair',
            dateLabel: '2026-11-20',
            sortDate: '2026-11-20',
            whatsappText: 'Hello Ananya, we missed you.',
            contacted: false,
          },
          {
            id: 'treatment-pt-102',
            patientId: 'PT-102',
            patientCode: 'PT-102',
            patientName: 'Vikram Singh',
            mobile: '9123456789',
            kind: 'treatment',
            title: 'Root Canal (tooth 36)',
            detail: 'Accepted with Dr. Nair · no visit booked',
            dateLabel: 'Planned 2026-11-10',
            sortDate: '2026-11-10',
            whatsappText: 'Hello Vikram, checking in.',
            contacted: false,
          },
        ],
      })

      renderWithRange(<FollowUpsPage />)
      expect(await screen.findByText('Ananya Verma')).toBeInTheDocument()
      expect(screen.getByText('Vikram Singh')).toBeInTheDocument()

      vi.spyOn(reportsApi, 'getTreatmentBreakdown').mockResolvedValueOnce({
        current: { visitsCompleted: 14, plansTotal: 6, plansCompleted: 3, planCompletionPct: 50, plansAcceptedValue: 40000, plansCompletedValue: 22000 },
        previous: { visitsCompleted: 10, plansTotal: 4, plansCompleted: 2, planCompletionPct: 50, plansAcceptedValue: 25000, plansCompletedValue: 15000 },
        procedures: [{ name: 'Ultrasonic Scaling', category: 'Preventive', count: 9, value: 9000 }],
        categories: [{ category: 'Preventive', completedCount: 9, plannedCount: 0, total: 9, value: 9000 }],
        planStatus: [{ status: 'Completed', count: 3, value: 22000 }],
        topTeeth: [{ tooth: '36', count: 4 }],
      })

      renderWithRange(<TreatmentBreakdownPage />)
      expect(await screen.findByText('Ultrasonic Scaling')).toBeInTheDocument()
      expect(screen.getByText('Tooth 36')).toBeInTheDocument()

      vi.spyOn(reportsApi, 'getRevenueReport').mockResolvedValueOnce({
        current: { collected: 85000, paymentCount: 12, billed: 95000, invoiceCount: 14, unpaid: 10000, averageBill: 6786, patientsBilled: 11 },
        previous: { collected: 50000, paymentCount: 8, billed: 60000, invoiceCount: 9, unpaid: 10000, averageBill: 6667, patientsBilled: 8 },
        series: [{ date: '2026-11-24', label: '24 Nov', amount: 85000 }],
        modes: [{ mode: 'UPI', amount: 85000, share: 100 }],
      })

      renderWithRange(<RevenueReportPage />)
      expect(await screen.findByText('₹85,000')).toBeInTheDocument()
    })
  })
})
