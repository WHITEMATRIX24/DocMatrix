import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { CalendarPage } from '../src/pages/appointments/CalendarPage'
import { NewAppointmentPage } from '../src/pages/appointments/NewAppointmentPage'
import {
  checkDentistAvailability,
  bookAppointment,
  savePatient,
  DENTISTS
} from '../src/services/clinicStore'

describe('Appointment Booking & Reschedule Slot Availability', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('validates slot availability using checkDentistAvailability', () => {
    const doctor = DENTISTS[0].name
    const testDate = '2026-11-20'

    const existing = bookAppointment({
      patientId: 'PAT-TEST-1',
      doctor,
      chair: 'Chair 1',
      treatmentType: 'Consultation',
      visitType: 'Consultation',
      date: testDate,
      time: '16:30',
      durationMinutes: 30,
      priority: 'normal'
    })

    const checkConflict = checkDentistAvailability(doctor, testDate, '16:30', 30, 'DIFF-ID')
    expect(checkConflict.available).toBe(false)
    expect(checkConflict.reason).toContain('already has appointment')

    const checkSelf = checkDentistAvailability(doctor, testDate, '16:30', 30, existing.id)
    expect(checkSelf.available).toBe(true)

    const checkLunch = checkDentistAvailability(doctor, testDate, '13:00', 30)
    expect(checkLunch.available).toBe(false)
    expect(checkLunch.reason).toContain('lunch')

    const checkOpen = checkDentistAvailability(doctor, testDate, '10:00', 30)
    expect(checkOpen.available).toBe(true)
  })

  it('displays unavailable time slots as disabled and dimmed grey in Reschedule modal', async () => {
    const doctor = DENTISTS[0].name
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    const today = d.toISOString().slice(0, 10)

    bookAppointment({
      patientId: 'PAT-TEST-CONFLICT',
      doctor,
      chair: 'Chair 1',
      treatmentType: 'Tooth Extraction',
      visitType: 'Procedure',
      date: today,
      time: '16:30',
      durationMinutes: 30,
      priority: 'normal'
    })

    bookAppointment({
      patientId: 'PAT-TEST-RESCHEDULE',
      doctor,
      chair: 'Chair 1',
      treatmentType: 'Routine Checkup',
      visitType: 'Consultation',
      date: today,
      time: '10:00',
      durationMinutes: 30,
      priority: 'normal'
    })

    render(
      <MemoryRouter>
        <CalendarPage />
      </MemoryRouter>
    )

    const rescheduleBtn = screen.getByTitle(/reschedule an appointment/i)
    fireEvent.click(rescheduleBtn)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /reschedule appointment/i })).toBeInTheDocument()
    })

    const select = screen.getByLabelText(/new time slot \*/i)
    expect(select).toBeInTheDocument()

    const options = Array.from(select.querySelectorAll('option'))
    expect(options.length).toBeGreaterThan(0)

    const option1630 = options.find((opt) => opt.value === '16:30')
    expect(option1630).toBeDefined()
    expect(option1630?.disabled).toBe(true)
    expect(option1630?.textContent).toContain('(Unavailable)')
    expect(option1630?.className).toContain('slot-option-unavailable')
    expect(option1630?.style.color).toBe('var(--text-muted, #94a3b8)')

    const option1300 = options.find((opt) => opt.value === '13:00')
    expect(option1300).toBeDefined()
    expect(option1300?.disabled).toBe(true)
    expect(option1300?.textContent).toContain('(Unavailable)')
    expect(option1300?.className).toContain('slot-option-unavailable')

    const option1030 = options.find((opt) => opt.value === '10:30')
    expect(option1030).toBeDefined()
    expect(option1030?.disabled).toBe(false)
    expect(option1030?.textContent).toBe('10:30')
    expect(option1030?.className).toContain('slot-option-available')
    expect(option1030?.style.fontWeight).toBe('600')

    const confirmBtn = screen.getByRole('button', { name: /confirm reschedule/i })
    expect(confirmBtn).not.toBeDisabled()

    fireEvent.change(select, { target: { value: '10:30' } })
    expect(select.value).toBe('10:30')
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /reschedule appointment/i })).not.toBeInTheDocument()
    })
  })

  it('displays unavailable time slots as dimmed grey and disabled on New Appointment booking screen and updates dynamically', async () => {
    const doctor = DENTISTS[0].name
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    const today = d.toISOString().slice(0, 10)

    // Book an appointment at 11:30 for today
    bookAppointment({
      patientId: 'PAT-BOOKING-TEST',
      doctor,
      chair: 'Chair 1',
      treatmentType: 'Consultation',
      visitType: 'Consultation',
      date: today,
      time: '11:30',
      durationMinutes: 30,
      priority: 'normal'
    })

    const patient = savePatient({
      firstName: 'Alice',
      lastName: 'Smith',
      mobile: '+91 9876543210',
      age: 28,
      gender: 'female',
      allergies: 'no',
      medications: 'no',
      conditions: 'no'
    })

    render(
      <MemoryRouter initialEntries={[`/appointments/new?patientId=${patient.id}`]}>
        <Routes>
          <Route path="/appointments/new" element={<NewAppointmentPage />} />
        </Routes>
      </MemoryRouter>
    )

    // Verify 11:30 slot button is disabled and has unavailable class and text
    const btn1130 = screen.getByRole('button', { name: /11:30/i })
    expect(btn1130).toBeInTheDocument()
    expect(btn1130).toBeDisabled()
    expect(btn1130.textContent).toContain('(Unavailable)')
    expect(btn1130.className).toContain('slot-btn-unavailable')

    // 13:00 (lunch break) should also be disabled and dimmed
    const btn1300 = screen.getByRole('button', { name: /13:00/i })
    expect(btn1300).toBeInTheDocument()
    expect(btn1300).toBeDisabled()
    expect(btn1300.textContent).toContain('(Unavailable)')
    expect(btn1300.className).toContain('slot-btn-unavailable')

    // Available slot
    const slotBtns = screen.getAllByRole('button').filter((b) => b.textContent?.includes(':'))
    const btnAvailable = slotBtns.find((b) => !b.disabled)
    expect(btnAvailable).toBeDefined()
    expect(btnAvailable?.className).toContain('slot-btn-available')

    // Clicking available slot selects it
    if (btnAvailable) {
      fireEvent.click(btnAvailable)
      expect(btnAvailable.style.border).toContain('var(--teal-primary')
    }

    // Changing the date updates slot availability dynamically
    const dateInput = screen.getByLabelText(/selected date/i)
    fireEvent.change(dateInput, { target: { value: '2026-11-25' } })

    await waitFor(() => {
      // On 2026-11-25, 11:30 should now be available since there's no conflict on this new date
      const updatedSlotBtns = screen.getAllByRole('button').filter((b) => b.textContent?.includes(':'))
      const btn1130Updated = updatedSlotBtns.find((b) => b.textContent?.includes('11:30'))
      expect(btn1130Updated).toBeDefined()
      expect(btn1130Updated?.disabled).toBe(false)
      expect(btn1130Updated?.className).toContain('slot-btn-available')
    })
  })

  it('displays unavailable time slots in AppointmentDetailPage reschedule modal', async () => {
    const doctor = DENTISTS[0].name
    const testDate = '2026-11-28'

    // Conflicting appointment at 14:00
    bookAppointment({
      patientId: 'PAT-CONFLICT-DETAIL',
      doctor,
      chair: 'Chair 1',
      treatmentType: 'Consultation',
      visitType: 'Consultation',
      date: testDate,
      time: '14:00',
      durationMinutes: 30,
      priority: 'normal'
    })

    // Appointment to view & reschedule at 10:00
    const appt = bookAppointment({
      patientId: 'PAT-RESCHEDULE-DETAIL',
      doctor,
      chair: 'Chair 1',
      treatmentType: 'Follow-up',
      visitType: 'Consultation',
      date: testDate,
      time: '10:00',
      durationMinutes: 30,
      priority: 'normal'
    })

    const { AppointmentDetailPage } = await import('../src/pages/appointments/AppointmentDetailPage')

    render(
      <MemoryRouter initialEntries={[`/appointments/${appt.id}`]}>
        <Routes>
          <Route path="/appointments/:id" element={<AppointmentDetailPage />} />
        </Routes>
      </MemoryRouter>
    )

    // Open reschedule modal
    const rescheduleBtn = screen.getByRole('button', { name: /reschedule booking/i })
    fireEvent.click(rescheduleBtn)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /reschedule booking/i })).toBeInTheDocument()
    })

    const select = screen.getByLabelText(/new time slot \*/i)
    expect(select).toBeInTheDocument()

    const options = Array.from(select.querySelectorAll('option'))

    // 14:00 should be unavailable
    const opt1400 = options.find((o) => o.value === '14:00')
    expect(opt1400).toBeDefined()
    expect(opt1400?.disabled).toBe(true)
    expect(opt1400?.textContent).toContain('(Unavailable)')
    expect(opt1400?.className).toContain('slot-option-unavailable')

    // 10:00 (its own slot) or 10:30 (free) should be available
    const opt1030 = options.find((o) => o.value === '10:30')
    expect(opt1030).toBeDefined()
    expect(opt1030?.disabled).toBe(false)
    expect(opt1030?.className).toContain('slot-option-available')
  })
})
