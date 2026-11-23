import { browserSessionStorage as sessionStorage } from '@/services/browserStorage'
import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CalendarPage } from '@/pages/appointments/CalendarPage'
import { localDate } from '@/pages/billing/BillingShared'
import * as clinicStore from '@/services/clinicStore'
import {
  validateWhatsAppPhone,
  sendCallInWhatsAppMessage,
  clearCallInNotificationCache,
} from '@/services/whatsappService'

describe('Calendar Call-In — Automatic Patient WhatsApp Notification', () => {
  const todayStr = localDate()
  const mockDoctor = clinicStore.DENTISTS[0]?.name || 'Dr. Arun Kumar'

  let patientsData = []
  let appointmentsData = []
  let windowOpenSpy

  beforeEach(() => {
    clearCallInNotificationCache()
    sessionStorage.clear()
    sessionStorage.setItem(
      'docmatrix_auth_user',
      JSON.stringify({
        id: 'usr-101',
        name: 'Clinician',
        role: 'DOCTOR',
        clinicId: 'clinic-demo-001',
        clinicName: 'SmileCraft Dental Studio',
      })
    )

    patientsData = [
      {
        id: 'PAT-WA-01',
        firstName: 'Asha',
        lastName: 'Nair',
        mobile: '9876543210',
        countryCode: '+91',
        gender: 'female',
        age: '32',
      },
      {
        id: 'PAT-WA-NOPHONE',
        firstName: 'Rohan',
        lastName: 'Menon',
        mobile: '',
        gender: 'male',
        age: '40',
      },
    ]

    appointmentsData = [
      {
        id: 'APT-WA-01',
        patientId: 'PAT-WA-01',
        patientName: 'Asha Nair',
        doctor: mockDoctor,
        chair: 'Chair 1',
        treatmentType: 'Root Canal Treatment',
        visitType: 'Dental procedure',
        date: todayStr,
        time: '10:00',
        durationMinutes: 30,
        status: 'scheduled',
        priority: 'normal',
        remindersSent: [],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'APT-WA-02',
        patientId: 'PAT-WA-01',
        patientName: 'Asha Nair',
        doctor: mockDoctor,
        chair: 'Chair 1',
        treatmentType: 'Dental Scaling',
        visitType: 'Dental procedure',
        date: todayStr,
        time: '11:00',
        durationMinutes: 30,
        status: 'checked-in',
        priority: 'normal',
        remindersSent: [],
        createdAt: new Date().toISOString(),
      },
      {
        id: 'APT-WA-03',
        patientId: 'PAT-WA-NOPHONE',
        patientName: 'Rohan Menon',
        doctor: mockDoctor,
        chair: 'Chair 1',
        treatmentType: 'Consultation',
        visitType: 'Consultation',
        date: todayStr,
        time: '12:00',
        durationMinutes: 30,
        status: 'checked-in',
        priority: 'normal',
        remindersSent: [],
        createdAt: new Date().toISOString(),
      },
    ]

    windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null)

    vi.spyOn(clinicStore, 'useClinicData').mockImplementation(() => ({
      patients: patientsData,
      appointments: appointmentsData,
      clinicalNotes: [],
      invoices: [],
      treatmentPlans: [],
    }))

    vi.spyOn(clinicStore, 'updateAppointmentStatus').mockImplementation((id, status) => {
      const appt = appointmentsData.find((a) => a.id === id)
      if (appt) appt.status = status
    })

    vi.spyOn(clinicStore, 'sendAppointmentReminder').mockImplementation((id, type) => {
      const appt = appointmentsData.find((a) => a.id === id)
      if (appt) {
        appt.remindersSent = [
          ...(appt.remindersSent || []),
          { type, sentAt: new Date().toISOString(), recipient: '9876543210' },
        ]
      }
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    sessionStorage.clear()
  })

  describe('Phone Validation & Message Generation', () => {
    it('validates and formats valid 10-digit Indian and international numbers', () => {
      const indian = validateWhatsAppPhone('9876543210', '+91')
      expect(indian.valid).toBe(true)
      expect(indian.digits).toBe('919876543210')
      expect(indian.display).toBe('+91 9876543210')

      const intl = validateWhatsAppPhone('+971 50 123 4567')
      expect(intl.valid).toBe(true)
      expect(intl.digits).toBe('971501234567')
    })

    it('rejects missing, short, or all-zero mobile numbers', () => {
      expect(validateWhatsAppPhone('').valid).toBe(false)
      expect(validateWhatsAppPhone('12345').valid).toBe(false)
      expect(validateWhatsAppPhone('0000000000').valid).toBe(false)
      expect(validateWhatsAppPhone(undefined).valid).toBe(false)
    })

    it('generates dynamic Call-In message with patient name and clinic name', () => {
      const msg = clinicStore.generateWhatsAppMessage('call_in', appointmentsData[1], patientsData[0])
      expect(msg).toContain('Asha Nair')
      expect(msg).toContain('SmileCraft Dental Studio')
      expect(msg).toMatch(/turn has arrived/i)
      expect(msg).toMatch(/consultation room/i)
    })
  })

  describe('Calendar Check-In and Call-In Workflow', () => {
    it('clicking Check-In updates status to checked-in without sending Call-In WhatsApp', () => {
      appointmentsData = [appointmentsData[0]]

      render(
        <MemoryRouter initialEntries={['/appointments']}>
          <CalendarPage />
        </MemoryRouter>
      )

      const checkInBtn = screen.getByTitle('Mark Checked-In')
      fireEvent.click(checkInBtn)

      expect(clinicStore.updateAppointmentStatus).toHaveBeenCalledWith('APT-WA-01', 'checked-in', undefined)
      expect(windowOpenSpy).not.toHaveBeenCalled()
      expect(screen.queryByTestId('callin-whatsapp-toast')).not.toBeInTheDocument()
    })

    it('clicking Call-In updates status, sends WhatsApp message once, and shows success toast', async () => {
      appointmentsData = [appointmentsData[1]]

      render(
        <MemoryRouter initialEntries={['/appointments']}>
          <CalendarPage />
        </MemoryRouter>
      )

      const callInBtn = screen.getByTitle('Call in to Chair')
      fireEvent.click(callInBtn)

      expect(clinicStore.updateAppointmentStatus).toHaveBeenCalledWith(
        'APT-WA-02',
        'in-progress',
        'Patient called in to consultation room'
      )

      await waitFor(() => {
        expect(windowOpenSpy).toHaveBeenCalledTimes(1)
      })
      const [openedUrl] = windowOpenSpy.mock.calls[0]
      expect(openedUrl).toContain('https://wa.me/919876543210?text=')
      const decodedUrl = decodeURIComponent(openedUrl)
      expect(decodedUrl).toContain('Asha Nair')
      expect(decodedUrl).toContain('SmileCraft Dental Studio')
      expect(decodedUrl).toContain('consultation room')

      expect(clinicStore.sendAppointmentReminder).toHaveBeenCalledWith('APT-WA-02', 'call_in')

      const toast = await screen.findByTestId('callin-whatsapp-toast')
      expect(toast).toHaveClass('is-success')
      expect(toast).toHaveTextContent('Patient Called-In & WhatsApp Sent')
      expect(toast).toHaveTextContent('Asha Nair')
      expect(toast).toHaveTextContent('+91 9876543210')
    })

    it('prevents duplicate WhatsApp messages on repeated Call-In clicks', async () => {
      const appt = appointmentsData[1]
      const patient = patientsData[0]

      const first = await sendCallInWhatsAppMessage(appt, patient)
      const second = await sendCallInWhatsAppMessage(appt, patient)

      expect(first.status).toBe('sent')
      expect(first.sent).toBe(true)
      expect(second.status).toBe('duplicate')
      expect(second.sent).toBe(false)
      expect(windowOpenSpy).toHaveBeenCalledTimes(1)
      expect(clinicStore.sendAppointmentReminder).toHaveBeenCalledTimes(1)
    })

    it('does not block Call-In status update when patient mobile number is missing or invalid', async () => {
      appointmentsData = [appointmentsData[2]]

      render(
        <MemoryRouter initialEntries={['/appointments']}>
          <CalendarPage />
        </MemoryRouter>
      )

      const callInBtn = screen.getByTitle('Call in to Chair')
      fireEvent.click(callInBtn)

      expect(clinicStore.updateAppointmentStatus).toHaveBeenCalledWith(
        'APT-WA-03',
        'in-progress',
        'Patient called in to consultation room'
      )

      expect(windowOpenSpy).not.toHaveBeenCalled()

      const toast = await screen.findByTestId('callin-whatsapp-toast')
      expect(toast).toHaveClass('is-error')
      expect(toast).toHaveTextContent('Patient Called-In — WhatsApp Not Sent')
      expect(toast).toHaveTextContent(/registered mobile number/i)
    })

    it('handles WhatsApp dispatch errors gracefully without blocking Call-In status update', async () => {
      appointmentsData = [appointmentsData[1]]
      windowOpenSpy.mockImplementation(() => {
        throw new Error('WhatsApp gateway unavailable')
      })

      render(
        <MemoryRouter initialEntries={['/appointments']}>
          <CalendarPage />
        </MemoryRouter>
      )

      const callInBtn = screen.getByTitle('Call in to Chair')
      fireEvent.click(callInBtn)

      expect(clinicStore.updateAppointmentStatus).toHaveBeenCalledWith(
        'APT-WA-02',
        'in-progress',
        'Patient called in to consultation room'
      )

      const toast = await screen.findByTestId('callin-whatsapp-toast')
      expect(toast).toHaveClass('is-error')
      expect(toast).toHaveTextContent('Patient Called-In — WhatsApp Not Sent')
      expect(toast).toHaveTextContent('WhatsApp gateway unavailable')
    })
  })
})
