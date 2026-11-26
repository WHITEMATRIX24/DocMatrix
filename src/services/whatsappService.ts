import {
  generateWhatsAppMessage,
  type AppointmentRecord,
  type PatientRecord,
} from './clinicStore'

export interface PhoneValidationResult {
  valid: boolean
  digits: string
  display: string
  error?: string
}

export type CallInWhatsAppStatus = 'opened' | 'duplicate' | 'invalid_phone' | 'error'

export interface CallInWhatsAppResult {
  status: CallInWhatsAppStatus
  sent: boolean
  patientName?: string
  recipient?: string
  text?: string
  whatsappUrl?: string
  error?: string
}

// In-memory lock to prevent duplicate messages from rapid double-clicks or repeated triggers
const sentCallInAppointments = new Set<string>()

export function clearCallInNotificationCache(): void {
  sentCallInAppointments.clear()
}

export function hasCallInWhatsAppBeenSent(appointment: AppointmentRecord): boolean {
  if (sentCallInAppointments.has(appointment.id)) return true
  if (appointment.backendId && sentCallInAppointments.has(appointment.backendId)) return true
  return false
}

/**
 * Validates and formats a patient's mobile number for WhatsApp (E.164 digits without '+').
 */
export function validateWhatsAppPhone(
  mobile?: string,
  countryCode?: string
): PhoneValidationResult {
  if (!mobile || typeof mobile !== 'string') {
    return {
      valid: false,
      digits: '',
      display: '',
      error: 'Patient does not have a registered mobile number.',
    }
  }

  const trimmed = mobile.trim()
  const rawDigits = trimmed.replace(/\D/g, '')

  if (!rawDigits || rawDigits.length < 10 || rawDigits.length > 15 || /^0+$/.test(rawDigits)) {
    return {
      valid: false,
      digits: '',
      display: trimmed,
      error: 'Patient mobile number is invalid. Please update a valid 10-digit mobile number.',
    }
  }

  const ccDigits = (countryCode || '+91').replace(/\D/g, '') || '91'

  let fullDigits = rawDigits
  let display = trimmed

  if (trimmed.startsWith('+')) {
    fullDigits = rawDigits
    display = `+${rawDigits}`
  } else if (rawDigits.length === 10) {
    fullDigits = `${ccDigits}${rawDigits}`
    display = `+${ccDigits} ${rawDigits}`
  } else if (rawDigits.length > 10 && rawDigits.startsWith(ccDigits)) {
    fullDigits = rawDigits
    display = `+${ccDigits} ${rawDigits.slice(ccDigits.length)}`
  } else {
    fullDigits = rawDigits
    display = `+${rawDigits}`
  }

  if (fullDigits.length < 10 || fullDigits.length > 15) {
    return {
      valid: false,
      digits: '',
      display: trimmed,
      error: 'Patient mobile number is invalid.',
    }
  }

  return {
    valid: true,
    digits: fullDigits,
    display,
  }
}

/**
 * Opens WhatsApp with a prepared call-in message. The user confirms sending there.
 * Non-blocking, deduplicated per appointment, validates phone number, and handles errors gracefully.
 */
export async function sendCallInWhatsAppMessage(
  appointment: AppointmentRecord,
  patient?: PatientRecord | null
): Promise<CallInWhatsAppResult> {
  if (!appointment?.id) {
    return {
      status: 'error',
      sent: false,
      error: 'Invalid appointment reference.',
    }
  }

  // 1. Prevent duplicate messages caused by repeated clicks
  if (hasCallInWhatsAppBeenSent(appointment)) {
    return {
      status: 'duplicate',
      sent: false,
      error: 'The WhatsApp compose window was already opened for this appointment.',
    }
  }

  // 2. Validate patient & mobile number
  if (!patient) {
    return {
      status: 'invalid_phone',
      sent: false,
      error: 'Patient record not found. WhatsApp message could not be sent.',
    }
  }

  const patientName = `${patient.firstName} ${patient.lastName}`.trim() || 'Patient'
  const phoneCheck = validateWhatsAppPhone(patient.mobile, patient.countryCode)

  if (!phoneCheck.valid) {
    return {
      status: 'invalid_phone',
      sent: false,
      patientName,
      error: phoneCheck.error || 'Patient does not have a valid mobile number.',
    }
  }

  // 3. Acquire deduplication lock immediately before dispatching
  sentCallInAppointments.add(appointment.id)
  if (appointment.backendId) {
    sentCallInAppointments.add(appointment.backendId)
  }

  try {
    const text = generateWhatsAppMessage('call_in', appointment, patient)
    const whatsappUrl = `https://wa.me/${phoneCheck.digits}?text=${encodeURIComponent(text)}`

    if (typeof window !== 'undefined' && typeof window.open === 'function') {
      const opened = window.open(whatsappUrl, '_blank')
      if (!opened) throw new Error('WhatsApp window was blocked. Allow popups and try again.')
      opened.opener = null
    }

    // Record in appointment reminders log
    // Opening a compose window does not confirm sending or delivery.

    return {
      status: 'opened',
      sent: false,
      patientName,
      recipient: phoneCheck.display,
      text,
      whatsappUrl,
    }
  } catch (err: any) {
    // Release lock on failure so staff can retry if needed
    sentCallInAppointments.delete(appointment.id)
    if (appointment.backendId) {
      sentCallInAppointments.delete(appointment.backendId)
    }

    return {
      status: 'error',
      sent: false,
      patientName,
      recipient: phoneCheck.display,
      error: err?.message || 'Failed to send WhatsApp Call-In message.',
    }
  }
}
