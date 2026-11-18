import {
  getClinicSnapshot,
  createItemisedInvoice,
  DENTAL_TREATMENTS,
  onAppointmentCompleted,
  type AppointmentRecord,
  type ClinicalNoteRecord,
  type InvoiceLineItem,
  type InvoiceRecord,
  type PatientRecord,
  type TreatmentType,
} from './clinicStore'
import {
  getBillingSnapshot,
  effectivePrice,
  gstRateFor,
  type ServicePrice,
} from './billingStore'

export type AutoInvoiceStatus =
  | 'created'
  | 'existing'
  | 'no_treatment'
  | 'patient_not_found'
  | 'error'

export interface AutoInvoiceResult {
  invoice: InvoiceRecord | null
  isNew: boolean
  status: AutoInvoiceStatus
  message: string
}

export interface AutoInvoiceParams {
  appointment?: AppointmentRecord | null
  appointmentId?: string
  clinicalNote?: ClinicalNoteRecord | null
  clinicalNoteId?: string
  patientId?: string
  services?: ServicePrice[]
}

const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
const stripParens = (s: string) => s.replace(/\s*\([^)]*\)/g, '').trim()

/**
 * Common keyword aliases to map clinical shorthand to standard dental services
 */
const CLINICAL_ALIASES: Array<{ regex: RegExp; query: string }> = [
  { regex: /\b(rct|root canal|pulpectomy)\b/i, query: 'Root Canal Treatment' },
  { regex: /\b(scaling|cleaning|prophylaxis|calculus)\b/i, query: 'Scaling' },
  { regex: /\b(extraction|exodontia|removal of tooth)\b/i, query: 'Extraction' },
  { regex: /\b(filling|composite|restoration|gic)\b/i, query: 'Composite' },
  { regex: /\b(whitening|bleaching)\b/i, query: 'Whitening' },
  { regex: /\b(crown|cap|zirconia|pfm)\b/i, query: 'Crown' },
  { regex: /\b(consultation|checkup|check-up|exam|examination)\b/i, query: 'Examination' },
  { regex: /\b(x-ray|xray|iopa|radiograph|opg)\b/i, query: 'X-Ray' },
  { regex: /\b(denture|prosthesis)\b/i, query: 'Denture' },
  { regex: /\b(implant)\b/i, query: 'Implant' },
]

/**
 * Split multiple procedure strings written with commas, semicolons, or newlines
 */
export function splitTreatmentProcedures(raw: string): string[] {
  if (!raw || !raw.trim()) return []
  return raw
    .split(/[,;\n\r]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/**
 * Find an active, non-void invoice already associated with this appointment or clinical note.
 */
export function findExistingInvoiceForConsultation(
  params: AutoInvoiceParams
): InvoiceRecord | null {
  const snapshot = getClinicSnapshot()
  const invoices = snapshot.invoices || []

  const apptId = params.appointment?.id || params.appointmentId
  const apptBackendId = params.appointment?.backendId
  const noteId = params.clinicalNote?.id || params.clinicalNoteId

  for (const inv of invoices) {
    if (inv.status === 'Void') continue

    // 1. Direct appointment link
    if (apptId && inv.appointmentId === apptId) return inv
    if (apptBackendId && inv.appointmentId === apptBackendId) return inv

    // 2. Clinical note reference in invoice notes or description
    if (noteId) {
      if (inv.notes && inv.notes.includes(noteId)) return inv
      if (inv.description && inv.description.includes(noteId)) return inv
    }
  }

  return null
}

/**
 * Resolve a single treatment string against available tariffs, master treatments, and plans.
 */
function resolveTreatmentLineItem(
  rawTreatment: string,
  appointment: AppointmentRecord | null | undefined,
  clinicalNote: ClinicalNoteRecord | null | undefined,
  services: ServicePrice[],
  patient: PatientRecord | null | undefined,
  treatmentPlans: any[]
): InvoiceLineItem | null {
  const trimmed = rawTreatment.trim()
  if (!trimmed) return null

  const rawClean = clean(trimmed)
  const rawCleanNoParens = clean(stripParens(trimmed))

  // 1. Check services configured in billing tariffs
  let matchedService = services.find(
    (s) => s.name.trim().toLowerCase() === trimmed.toLowerCase()
  )
  if (!matchedService) {
    matchedService = services.find((s) => clean(s.name) === rawClean)
  }
  if (!matchedService && rawCleanNoParens) {
    matchedService = services.find(
      (s) => clean(stripParens(s.name)) === rawCleanNoParens
    )
  }
  if (!matchedService) {
    matchedService = services.find((s) => {
      const sClean = clean(s.name)
      return (
        (rawClean.length >= 4 && sClean.includes(rawClean)) ||
        (sClean.length >= 4 && rawClean.includes(sClean))
      )
    })
  }

  // 2. Check master DENTAL_TREATMENTS catalog
  let matchedDentalTrt: TreatmentType | undefined = DENTAL_TREATMENTS.find(
    (t) => t.name.trim().toLowerCase() === trimmed.toLowerCase()
  )
  if (!matchedDentalTrt) {
    matchedDentalTrt = DENTAL_TREATMENTS.find((t) => clean(t.name) === rawClean)
  }
  if (!matchedDentalTrt && rawCleanNoParens) {
    matchedDentalTrt = DENTAL_TREATMENTS.find(
      (t) => clean(stripParens(t.name)) === rawCleanNoParens
    )
  }
  if (!matchedDentalTrt) {
    matchedDentalTrt = DENTAL_TREATMENTS.find((t) => {
      const tClean = clean(t.name)
      return (
        (rawClean.length >= 4 && tClean.includes(rawClean)) ||
        (tClean.length >= 4 && rawClean.includes(tClean))
      )
    })
  }

  // 3. Fallback: Check clinical keyword aliases against services & DENTAL_TREATMENTS
  if (!matchedService && !matchedDentalTrt) {
    for (const alias of CLINICAL_ALIASES) {
      if (alias.regex.test(trimmed)) {
        matchedService = services.find((s) =>
          s.name.toLowerCase().includes(alias.query.toLowerCase())
        )
        if (!matchedService) {
          matchedDentalTrt = DENTAL_TREATMENTS.find((t) =>
            t.name.toLowerCase().includes(alias.query.toLowerCase())
          )
        }
        if (matchedService || matchedDentalTrt) break
      }
    }
  }

  // 4. Check treatment plans for this patient
  const matchingPlan = patient
    ? treatmentPlans.find((tp) => {
        const isPatient =
          tp.patientId === patient.id ||
          (appointment?.patientName &&
            (tp as any).patientName === appointment.patientName)
        if (!isPatient) return false
        const pClean = clean(tp.procedure || '')
        return (
          pClean === rawClean ||
          (rawCleanNoParens && clean(stripParens(tp.procedure || '')) === rawCleanNoParens) ||
          (rawClean.length >= 4 && pClean.includes(rawClean)) ||
          (pClean.length >= 4 && rawClean.includes(pClean))
        )
      })
    : undefined

  // Extract tooth number if known
  const toothNumber =
    clinicalNote?.treatmentToothNumber ||
    matchingPlan?.toothNumber ||
    (() => {
      const combined = `${trimmed} ${clinicalNote?.treatmentDescription || ''} ${appointment?.notes || ''}`
      const m = combined.match(/(?:tooth|teeth|#)\s*([0-9]{1,2})/i)
      return m ? m[1] : undefined
    })()

  // Determine line item attributes
  let serviceId: string | undefined = undefined
  let name = trimmed
  let unitPrice = 0
  let gstRate = 0

  if (matchedService) {
    serviceId = matchedService.id
    name = matchedService.name
    unitPrice = effectivePrice(matchedService)
    gstRate = gstRateFor(matchedService.gstClass)
  } else if (matchedDentalTrt) {
    serviceId = matchedDentalTrt.id
    name = matchedDentalTrt.name
    unitPrice = matchedDentalTrt.standardFee
    gstRate = matchedDentalTrt.category === 'Cosmetic' ? 18 : 0
  } else if (matchingPlan && matchingPlan.cost > 0) {
    name = matchingPlan.procedure
    unitPrice = matchingPlan.cost
    gstRate = matchingPlan.category === 'Cosmetic' ? 18 : 0
  }

  // If no price could be determined from tariffs or catalog, keep the entered procedure name.
  // It will only be treated as billable if unitPrice > 0 or matched an active service.
  return {
    id: `auto-${appointment?.id || Date.now()}-${serviceId || rawClean || 'item'}`,
    serviceId,
    name,
    toothNumber,
    qty: 1,
    unitPrice,
    discount: 0,
    gstRate,
  }
}

/**
 * Automatically generate an invoice immediately after consultation completion.
 *
 * Enforces business rules:
 * - Generate only once per billable consultation (idempotent / duplicate protection)
 * - If an invoice already exists, reuse and return it
 * - If no billable treatment is recorded, do not generate an empty invoice
 * - Populates accurate pricing from billing tariffs and master treatments
 * - Computes line items, subtotal, discount, tax, and final amount
 * - Keeps invoice 'Unpaid' for review and explicit payment collection
 * - Links invoice to patient, appointment, and clinical note
 */
export function autoGenerateInvoiceForConsultation(
  params: AutoInvoiceParams
): AutoInvoiceResult {
  const snapshot = getClinicSnapshot()
  const billingSnap = getBillingSnapshot()
  const services = params.services || billingSnap.services || []

  // 1. Resolve appointment and clinical note
  const appointment =
    params.appointment ||
    (params.appointmentId
      ? (snapshot.appointments || []).find(
          (a) => a.id === params.appointmentId || a.backendId === params.appointmentId
        ) || null
      : null)

  let clinicalNote =
    params.clinicalNote ||
    (params.clinicalNoteId
      ? (snapshot.clinicalNotes || []).find((n) => n.id === params.clinicalNoteId) || null
      : null)

  if (!clinicalNote && appointment) {
    clinicalNote =
      (snapshot.clinicalNotes || []).find(
        (n) =>
          n.appointmentId &&
          (n.appointmentId === appointment.id ||
            (appointment.backendId && n.appointmentId === appointment.backendId))
      ) || null
  }

  // 2. Resolve patient
  const targetPatientId =
    params.patientId || appointment?.patientId || clinicalNote?.patientId
  const patient = targetPatientId
    ? (snapshot.patients || []).find((p) => p.id === targetPatientId) || null
    : null

  if (!patient && !targetPatientId) {
    return {
      invoice: null,
      isNew: false,
      status: 'patient_not_found',
      message: 'Cannot generate invoice: Patient record not found.',
    }
  }

  // 3. Duplicate Prevention: Check for existing active invoice
  const existingInvoice = findExistingInvoiceForConsultation({
    appointment,
    appointmentId: appointment?.id || params.appointmentId,
    clinicalNote,
    clinicalNoteId: clinicalNote?.id || params.clinicalNoteId,
  })

  if (existingInvoice) {
    return {
      invoice: existingInvoice,
      isNew: false,
      status: 'existing',
      message: `Invoice ${existingInvoice.id} already exists for this consultation. Opening existing invoice.`,
    }
  }

  // 4. Extract Treatment strings
  // Priority:
  // a) Clinical Note: treatmentPerformed (procedure done chairside)
  // b) Appointment: treatmentType
  // c) Clinical Note: procedureDescription / treatmentDescription
  // d) Appointment: visitType (e.g. 'Consultation')
  const treatmentCandidates: string[] = []

  if (clinicalNote?.treatmentPerformed) {
    treatmentCandidates.push(...splitTreatmentProcedures(clinicalNote.treatmentPerformed))
  }

  if (treatmentCandidates.length === 0 && appointment?.treatmentType) {
    treatmentCandidates.push(...splitTreatmentProcedures(appointment.treatmentType))
  }

  if (treatmentCandidates.length === 0 && clinicalNote?.treatmentDescription) {
    treatmentCandidates.push(...splitTreatmentProcedures(clinicalNote.treatmentDescription))
  }

  if (treatmentCandidates.length === 0 && appointment?.visitType) {
    treatmentCandidates.push(...splitTreatmentProcedures(appointment.visitType))
  }

  if (treatmentCandidates.length === 0 && (appointment as any)?.complaint) {
    treatmentCandidates.push(...splitTreatmentProcedures((appointment as any).complaint))
  }

  // Deduplicate procedure names (case-insensitive)
  const uniqueProcedures: string[] = []
  const seenClean = new Set<string>()
  for (const proc of treatmentCandidates) {
    const c = clean(proc)
    if (c && !seenClean.has(c)) {
      seenClean.add(c)
      uniqueProcedures.push(proc)
    }
  }

  // 5. Build line items
  const treatmentPlans = snapshot.treatmentPlans || []
  const lineItems: InvoiceLineItem[] = []

  for (let i = 0; i < uniqueProcedures.length; i++) {
    const proc = uniqueProcedures[i]
    const item = resolveTreatmentLineItem(
      proc,
      appointment,
      clinicalNote,
      services,
      patient,
      treatmentPlans
    )
    if (item) {
      // Ensure unique item ID in multi-treatment scenarios
      item.id = `${item.id}-${i + 1}`
      lineItems.push(item)
    }
  }

  // 6. Non-billable verification:
  // "If no billable treatment is recorded, do not generate an empty invoice."
  const billableItems = lineItems.filter(
    (it) => it.unitPrice > 0 || Boolean(it.serviceId)
  )

  if (billableItems.length === 0) {
    return {
      invoice: null,
      isNew: false,
      status: 'no_treatment',
      message: 'No billable treatment recorded for this consultation. Invoice skipped.',
    }
  }

  // 7. Create itemised invoice via authoritative clinic store
  const effectivePatientId = targetPatientId || (patient ? patient.id : '')
  const referenceNotes = [
    'Auto-generated from consultation completion.',
    clinicalNote?.id ? `Consultation Note: ${clinicalNote.id}` : null,
    appointment?.id ? `Appointment: ${appointment.id}` : null,
  ]
    .filter(Boolean)
    .join(' ')

  const createdInvoice = createItemisedInvoice({
    patientId: effectivePatientId,
    items: billableItems,
    appointmentId: appointment?.id || params.appointmentId,
    notes: referenceNotes,
  })

  return {
    invoice: createdInvoice,
    isNew: true,
    status: 'created',
    message: `Invoice ${createdInvoice.id} generated automatically.`,
  }
}

// Automatically listen to appointment completion to generate invoice
onAppointmentCompleted((appointment) => {
  try {
    autoGenerateInvoiceForConsultation({
      appointment,
      patientId: appointment.patientId,
    })
  } catch (err) {
    console.warn('[billingAutoInvoice] auto-generation on appointment completion failed:', err)
  }
})

