import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LiveQueuePage } from '@/pages/appointments/LiveQueuePage'
import * as clinicStore from '@/services/clinicStore'

describe('LiveQueuePage — Register Walk-in Modal Visibility & Workflow', () => {
  beforeEach(() => {
    document.body.style.overflow = ''
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.body.style.overflow = ''
  })

  it('renders the Register Walk-in button in the Live Queue page banner', () => {
    render(
      <MemoryRouter>
        <LiveQueuePage />
      </MemoryRouter>
    )

    const walkInBtn = screen.getByRole('button', { name: /register walk-in/i })
    expect(walkInBtn).toBeInTheDocument()
  })

  it('opens the centered modal into document.body when clicking Register Walk-in', () => {
    render(
      <MemoryRouter>
        <LiveQueuePage />
      </MemoryRouter>
    )

    const walkInBtn = screen.getByRole('button', { name: /register walk-in/i })
    fireEvent.click(walkInBtn)

    // Modal dialog should be in document
    const modalDialog = screen.getByRole('dialog')
    expect(modalDialog).toBeInTheDocument()
    expect(modalDialog).toHaveClass('queue-modal-overlay')

    // It should be rendered directly in document.body
    expect(modalDialog.parentElement).toBe(document.body)

    // Body scroll should be locked
    expect(document.body.style.overflow).toBe('hidden')

    // Title should be visible
    expect(screen.getByText('Register Walk-in Patient')).toBeInTheDocument()
  })

  it('closes the modal and restores body scroll on Cancel button click', () => {
    render(
      <MemoryRouter>
        <LiveQueuePage />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: /register walk-in/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    const cancelBtn = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelBtn)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')
  })

  it('closes the modal on close icon (X) click', () => {
    render(
      <MemoryRouter>
        <LiveQueuePage />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: /register walk-in/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    const closeBtn = screen.getByLabelText(/close dialog/i)
    fireEvent.click(closeBtn)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')
  })

  it('closes the modal on Escape key press', () => {
    render(
      <MemoryRouter>
        <LiveQueuePage />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: /register walk-in/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')
  })

  it('submits walk-in form, calls registerWalkIn, and closes modal', async () => {
    const registerSpy = vi.spyOn(clinicStore, 'registerWalkIn')

    render(
      <MemoryRouter>
        <LiveQueuePage />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: /register walk-in/i }))

    // Fill form fields
    const nameInput = screen.getByPlaceholderText(/e\.g\. Rahul Sharma/i)
    const phoneInput = screen.getByPlaceholderText(/e\.g\. 9845012345/i)
    const complaintInput = screen.getByPlaceholderText(/e\.g\. Toothache/i)

    fireEvent.change(nameInput, { target: { value: 'Deepak Patel' } })
    fireEvent.change(phoneInput, { target: { value: '9876543210' } })
    fireEvent.change(complaintInput, { target: { value: 'Severe tooth pain' } })

    const submitBtn = screen.getByRole('button', { name: /generate token & add to queue/i })
    fireEvent.click(submitBtn)

    expect(registerSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        patientName: 'Deepak Patel',
        mobile: '9876543210',
        complaint: 'Severe tooth pain'
      })
    )

    // Modal should close
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.body.style.overflow).toBe('')
  })
})
