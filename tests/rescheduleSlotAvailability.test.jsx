import React from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { CalendarPage } from '../src/pages/appointments/CalendarPage'
import {
  checkDentistAvailability,
  bookAppointment,
  DENTISTS
} from '../src/services/clinicStore'

describe('Reschedule Appointment Slot Availability', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('validates slot availability using checkDentistAvailability', () => {
    const doctor = DENTISTS[0].name // e.g. Dr. Aashna Jose Alappattu or Attending Doctor
    const testDate = '2026-11-20'

    // Book an appointment at 16:30 for testDate
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

    // Check availability for 16:30 for another appointment -> should be unavailable
    const checkConflict = checkDentistAvailability(doctor, testDate, '16:30', 30, 'DIFF-ID')
    expect(checkConflict.available).toBe(false)
    expect(checkConflict.reason).toContain('already has appointment')

    // Check availability excluding the existing appointment itself -> should be available
    const checkSelf = checkDentistAvailability(doctor, testDate, '16:30', 30, existing.id)
    expect(checkSelf.available).toBe(true)

    // Check lunch hour (13:00) -> should be unavailable
    const checkLunch = checkDentistAvailability(doctor, testDate, '13:00', 30)
    expect(checkLunch.available).toBe(false)
    expect(checkLunch.reason).toContain('lunch')

    // Check an open morning slot (10:00) -> should be available
    const checkOpen = checkDentistAvailability(doctor, testDate, '10:00', 30)
    expect(checkOpen.available).toBe(true)
  })

  it('displays unavailable time slots as disabled and dimmed grey in Reschedule modal', async () => {
    const doctor = DENTISTS[0].name
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    const today = d.toISOString().slice(0, 10)

    // Book appt 1 at 16:30 (this will be the conflicting appointment)
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

    // Book appt 2 at 10:00 (this is the one we will reschedule)
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

    // Click the Reschedule button in the top action bar
    const rescheduleBtn = screen.getByTitle(/reschedule an appointment/i)
    fireEvent.click(rescheduleBtn)

    // Wait for the Reschedule Appointment modal to appear
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /reschedule appointment/i })).toBeInTheDocument()
    })

    // Verify time slot dropdown
    const select = screen.getByLabelText(/new time slot \*/i)
    expect(select).toBeInTheDocument()

    const options = Array.from(select.querySelectorAll('option'))
    expect(options.length).toBeGreaterThan(0)

    // 16:30 should be disabled and marked unavailable due to conflicting appointment
    const option1630 = options.find((opt) => opt.value === '16:30')
    expect(option1630).toBeDefined()
    expect(option1630?.disabled).toBe(true)
    expect(option1630?.textContent).toContain('(Unavailable)')
    expect(option1630?.className).toContain('slot-option-unavailable')
    expect(option1630?.style.color).toBe('var(--text-muted, #94a3b8)')

    // 13:00 (lunch break) should be disabled and marked unavailable
    const option1300 = options.find((opt) => opt.value === '13:00')
    expect(option1300).toBeDefined()
    expect(option1300?.disabled).toBe(true)
    expect(option1300?.textContent).toContain('(Unavailable)')
    expect(option1300?.className).toContain('slot-option-unavailable')

    // 10:30 (free slot) should be enabled
    const option1030 = options.find((opt) => opt.value === '10:30')
    expect(option1030).toBeDefined()
    expect(option1030?.disabled).toBe(false)
    expect(option1030?.textContent).toBe('10:30')
    expect(option1030?.className).toContain('slot-option-available')
    expect(option1030?.style.fontWeight).toBe('600')

    // Confirm button is enabled when available slot is selected
    const confirmBtn = screen.getByRole('button', { name: /confirm reschedule/i })
    expect(confirmBtn).not.toBeDisabled()

    // Select an available slot and confirm
    fireEvent.change(select, { target: { value: '10:30' } })
    expect(select.value).toBe('10:30')
    fireEvent.click(confirmBtn)

    // Modal should close upon successful reschedule
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /reschedule appointment/i })).not.toBeInTheDocument()
    })
  })
})
