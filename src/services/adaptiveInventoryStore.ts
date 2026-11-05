import { useSyncExternalStore } from 'react'
import { loadFromStorage, saveToStorage } from './storageService'
import { apiClient } from './apiClient'

export type SuggestionMode = 'standard' | 'doctor-specific' | 'manual'

export type InventoryCategory =
  | 'Endodontics'
  | 'Surgical'
  | 'Restorative'
  | 'Preventive'
  | 'PPE & General'
  | 'Anesthetics'
  | 'Prosthodontics'
  | 'Orthodontics'

export interface InventoryBatch {
  batchNumber: string
  expiryDate: string // YYYY-MM-DD
  quantity: number
  location?: string
}

export interface InventoryStockItem {
  id: string
  sku: string
  name: string
  category: InventoryCategory
  unit: string // 'pairs' | 'cones' | 'ml' | 'set' | 'pieces' | 'cartridges' | 'cups' | 'kits' | 'syringes' | 'grams' | 'sheets' | 'vials' | 'packs'
  totalStock: number
  reorderLevel: number
  costPerUnit: number
  activeBatches: InventoryBatch[]
}

export interface TemplateMaterialItem {
  itemId: string
  name: string
  suggestedQty: number
  unit: string
  category?: string
  isMandatory?: boolean
  notes?: string
}

export interface TreatmentMaterialTemplate {
  procedureId: string
  procedureName: string
  category: string
  description: string
  materials: TemplateMaterialItem[]
  lastUpdated: string
  approvedBy: string
}

export interface DoctorHistoricalConsumption {
  id: string
  doctorId: string
  doctorName: string
  procedureId: string
  itemId: string
  confirmedQty: number
  wastageQty: number
  timestamp: string
}

export interface DoctorAdaptivePreference {
  doctorId: string
  doctorName: string
  procedureId: string
  itemId: string
  suggestedQty: number
  confidence: number // percentage e.g. 92
  sampleSize: number // number of past confirmed treatments
  standardQty: number
  historicalAverage: number
  clinicalNotes?: string
}

export interface ConfirmedMaterialDeduction {
  id: string
  treatmentId?: string
  appointmentId?: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  procedureName: string
  procedureId: string
  modeUsed: SuggestionMode
  timestamp: string
  materials: {
    itemId: string
    name: string
    unit: string
    suggestedQty: number
    confirmedQty: number
    wastageQty: number
    batchNumber: string
    deductedTotal: number
  }[]
  notes?: string
  confirmedBy: string
}

export interface AdaptiveInventoryState {
  suggestionMode: SuggestionMode
  items: InventoryStockItem[]
  templates: TreatmentMaterialTemplate[]
  doctorPreferences: DoctorAdaptivePreference[]
  consumptionHistory: DoctorHistoricalConsumption[]
  deductionAuditLog: ConfirmedMaterialDeduction[]
}

const STORAGE_KEY = 'docmatrix_v3_live_inventory'

// Clear previous mock localStorage keys if present
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('docmatrix_v2_adaptive_inventory')
  } catch {}
}

// 1. Initial inventory items: Clean slate (0 hardcoded items)
export const INITIAL_INVENTORY_ITEMS: InventoryStockItem[] = []

// 2. Standard Clinical Dental Procedure Templates
export const INITIAL_TREATMENT_TEMPLATES: TreatmentMaterialTemplate[] = [
  {
    procedureId: 'trt-root-canal',
    procedureName: 'Root Canal Treatment',
    category: 'Endodontics',
    description: 'Biomechanical preparation, irrigation, and obturation of root canal spaces.',
    lastUpdated: '2026-10-15',
    approvedBy: 'Clinical Board / Endodontic Lead',
    materials: [
      { itemId: 'mat-gloves', name: 'Dental gloves', suggestedQty: 2, unit: 'pairs', isMandatory: true },
      { itemId: 'mat-guttapercha', name: 'Gutta-percha', suggestedQty: 3, unit: 'cones', isMandatory: true },
      { itemId: 'mat-irrigation', name: 'Irrigation solution', suggestedQty: 5, unit: 'ml', isMandatory: true },
      { itemId: 'mat-files', name: 'Dental files', suggestedQty: 1, unit: 'set', isMandatory: true },
      { itemId: 'mat-cotton', name: 'Cotton pellets', suggestedQty: 5, unit: 'pieces', isMandatory: false }
    ]
  },
  {
    procedureId: 'trt-extraction',
    procedureName: 'Tooth Extraction (Simple / Surgical)',
    category: 'Oral Surgery',
    description: 'Exodontia procedure with local anesthesia, elevation, and socket hemostasis.',
    lastUpdated: '2026-10-10',
    approvedBy: 'Chief Dental Officer',
    materials: [
      { itemId: 'mat-gloves', name: 'Dental gloves', suggestedQty: 2, unit: 'pairs', isMandatory: true },
      { itemId: 'mat-anesthetic', name: 'Dental Anesthetic', suggestedQty: 2, unit: 'cartridges', isMandatory: true },
      { itemId: 'mat-needles', name: 'Dental Disposable Needles', suggestedQty: 1, unit: 'pieces', isMandatory: true },
      { itemId: 'mat-gauze', name: 'Surgical Gauze Sponges', suggestedQty: 4, unit: 'pieces', isMandatory: true },
      { itemId: 'mat-cotton', name: 'Cotton Pellets', suggestedQty: 4, unit: 'pieces', isMandatory: false }
    ]
  },
  {
    procedureId: 'trt-scaling',
    procedureName: 'Ultrasonic Scaling & Polishing',
    category: 'Preventive',
    description: 'Supragingival & subgingival calculus debridement and paste polishing.',
    lastUpdated: '2026-09-28',
    approvedBy: 'Periodontal Care Board',
    materials: [
      { itemId: 'mat-gloves', name: 'Dental gloves', suggestedQty: 2, unit: 'pairs', isMandatory: true },
      { itemId: 'mat-prophy', name: 'Prophy Paste & Cup', suggestedQty: 1, unit: 'cups', isMandatory: true },
      { itemId: 'mat-prophy-brush', name: 'Disposable Prophy Polishing Brushes', suggestedQty: 1, unit: 'pieces', isMandatory: true },
      { itemId: 'mat-suction', name: 'Disposable Saliva Ejector Tips', suggestedQty: 1, unit: 'pieces', isMandatory: true },
      { itemId: 'mat-cotton-rolls', name: 'Dental Absorbent Cotton Rolls', suggestedQty: 4, unit: 'pieces', isMandatory: false }
    ]
  },
  {
    procedureId: 'trt-filling',
    procedureName: 'Composite Dental Restoration (Filling)',
    category: 'Restorative',
    description: 'Caries excavation, selective etch, bonding, composite placement and finishing.',
    lastUpdated: '2026-10-02',
    approvedBy: 'Restorative Lead',
    materials: [
      { itemId: 'mat-gloves', name: 'Dental gloves', suggestedQty: 2, unit: 'pairs', isMandatory: true },
      { itemId: 'mat-composite', name: 'Composite Resin', suggestedQty: 1, unit: 'cartridges', isMandatory: true },
      { itemId: 'mat-etchant', name: 'Dental Etchant Gel', suggestedQty: 1, unit: 'ml', isMandatory: true },
      { itemId: 'mat-bonding', name: 'Dental Bonding Adhesive', suggestedQty: 1, unit: 'ml', isMandatory: true },
      { itemId: 'mat-matrix', name: 'Sectional Matrix Bands & Wedges', suggestedQty: 1, unit: 'pieces', isMandatory: true }
    ]
  },
  {
    procedureId: 'trt-crown',
    procedureName: 'Crown & Bridge Preparation & Impression',
    category: 'Prosthodontics',
    description: 'Tooth abutment reduction, gingival retraction, PVS dual-phase impression and temporary crown.',
    lastUpdated: '2026-10-08',
    approvedBy: 'Prosthodontics Lead',
    materials: [
      { itemId: 'mat-gloves', name: 'Dental gloves', suggestedQty: 2, unit: 'pairs', isMandatory: true },
      { itemId: 'mat-anesthetic', name: 'Dental Anesthetic', suggestedQty: 2, unit: 'cartridges', isMandatory: true },
      { itemId: 'mat-retraction', name: 'Gingival Retraction Cord', suggestedQty: 1, unit: 'vials', isMandatory: true },
      { itemId: 'mat-pvs-putty', name: 'Addition Silicone (PVS Putty)', suggestedQty: 1, unit: 'kits', isMandatory: true },
      { itemId: 'mat-pvs-light', name: 'PVS Light Body', suggestedQty: 1, unit: 'cartridges', isMandatory: true }
    ]
  },
  {
    procedureId: 'trt-ortho',
    procedureName: 'Orthodontic Bracket Bonding & Wire Adjustment',
    category: 'Orthodontics',
    description: 'Direct bonding of orthodontic brackets and archwire insertion with elastomeric ligatures.',
    lastUpdated: '2026-09-15',
    approvedBy: 'Orthodontic Specialist',
    materials: [
      { itemId: 'mat-gloves', name: 'Dental gloves', suggestedQty: 2, unit: 'pairs', isMandatory: true },
      { itemId: 'mat-etchant', name: 'Dental Etchant Gel', suggestedQty: 1, unit: 'ml', isMandatory: true },
      { itemId: 'mat-bracket-glue', name: 'Orthodontic Bracket Adhesive', suggestedQty: 1, unit: 'syringes', isMandatory: true },
      { itemId: 'mat-ortho-wire', name: 'NiTi Superelastic Archwires', suggestedQty: 1, unit: 'packs', isMandatory: true },
      { itemId: 'mat-ortho-ties', name: 'Orthodontic Ligature Ties', suggestedQty: 2, unit: 'packs', isMandatory: true }
    ]
  }
]

// 3. Initial Doctor Adaptive Preferences
export const INITIAL_DOCTOR_PREFERENCES: DoctorAdaptivePreference[] = []

// 4. Initial Deduction Audit Records (Clinical Treatment Movement Records)
export const INITIAL_DEDUCTION_AUDIT: ConfirmedMaterialDeduction[] = [
  {
    id: 'AUD-2026-884',
    treatmentId: 'trt-composite-104',
    patientId: 'pat-1158',
    patientName: 'Fatima Zahra',
    doctorId: 'doc-104',
    doctorName: 'Dr. Rajesh Nair',
    procedureName: 'Direct Composite Restoration (Class II)',
    procedureId: 'trt-restoration',
    modeUsed: 'doctor-specific',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    materials: [
      { itemId: 'mat-composite', name: 'Universal Composite Resin', unit: 'syringes', suggestedQty: 1, confirmedQty: 1, wastageQty: 0, batchNumber: 'CR-2026-05', deductedTotal: 1 },
      { itemId: 'mat-etchant', name: 'Dental Etchant Gel (37% Phosphoric)', unit: 'ml', suggestedQty: 1, confirmedQty: 1, wastageQty: 0, batchNumber: 'ETC-2026-01', deductedTotal: 1 },
      { itemId: 'mat-bonding', name: 'Light-Cured Bonding Agent', unit: 'bottles', suggestedQty: 1, confirmedQty: 1, wastageQty: 0, batchNumber: 'BND-2026-04', deductedTotal: 1 },
      { itemId: 'mat-gloves', name: 'Dental gloves (Nitrile)', unit: 'pairs', suggestedQty: 2, confirmedQty: 2, wastageQty: 1, batchNumber: 'GLV-2026-B2', deductedTotal: 3 }
    ],
    notes: 'Restoration completed on tooth 36. One glove torn during curing light adjustment and replaced.',
    confirmedBy: 'Dr. Rajesh Nair'
  },
  {
    id: 'AUD-2026-883',
    treatmentId: 'trt-scaling-103',
    patientId: 'pat-1120',
    patientName: 'Anjali Verma',
    doctorId: 'doc-owner',
    doctorName: 'Aashna Jose Alappattu',
    procedureName: 'Ultrasonic Scaling & Polishing',
    procedureId: 'trt-scaling',
    modeUsed: 'standard',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    materials: [
      { itemId: 'mat-gloves', name: 'Dental gloves (Nitrile)', unit: 'pairs', suggestedQty: 2, confirmedQty: 2, wastageQty: 0, batchNumber: 'GLV-2026-B2', deductedTotal: 2 },
      { itemId: 'mat-polishing-paste', name: 'Prophylaxis Polishing Paste', unit: 'cups', suggestedQty: 1, confirmedQty: 1, wastageQty: 0, batchNumber: 'PST-2026-02', deductedTotal: 1 },
      { itemId: 'mat-saliva-ejector', name: 'Disposable Saliva Ejectors', unit: 'pieces', suggestedQty: 1, confirmedQty: 1, wastageQty: 0, batchNumber: 'SE-2026-07', deductedTotal: 1 }
    ],
    notes: 'Routine biannual prophylaxis completed with zero adverse reactions.',
    confirmedBy: 'Aashna Jose Alappattu'
  },
  {
    id: 'AUD-2026-882',
    treatmentId: 'trt-extraction-102',
    patientId: 'pat-1082',
    patientName: 'Rahul Sharma',
    doctorId: 'doc-104',
    doctorName: 'Dr. Rajesh Nair',
    procedureName: 'Tooth Extraction (Simple / Surgical)',
    procedureId: 'trt-extraction',
    modeUsed: 'standard',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    materials: [
      { itemId: 'mat-anesthetic', name: 'Dental Anesthetic (Lidocaine 2%)', unit: 'cartridges', suggestedQty: 2, confirmedQty: 2, wastageQty: 0, batchNumber: 'LID-2026-03', deductedTotal: 2 },
      { itemId: 'mat-needles', name: 'Dental Disposable Needles (27G Long)', unit: 'pieces', suggestedQty: 1, confirmedQty: 1, wastageQty: 0, batchNumber: 'NDL-2026-11', deductedTotal: 1 },
      { itemId: 'mat-gauze', name: 'Surgical Gauze Sponges', unit: 'pieces', suggestedQty: 4, confirmedQty: 4, wastageQty: 0, batchNumber: 'GZ-2026-09', deductedTotal: 4 },
      { itemId: 'mat-gloves', name: 'Dental gloves (Nitrile)', unit: 'pairs', suggestedQty: 2, confirmedQty: 2, wastageQty: 0, batchNumber: 'GLV-2026-B1', deductedTotal: 2 }
    ],
    notes: 'Atraumatic elevation of tooth 48. Hemostasis achieved promptly with pressure packs.',
    confirmedBy: 'Dr. Rajesh Nair'
  },
  {
    id: 'AUD-2026-881',
    treatmentId: 'trt-rootcanal-101',
    patientId: 'pat-1044',
    patientName: 'Meera Nambiar',
    doctorId: 'doc-owner',
    doctorName: 'Aashna Jose Alappattu',
    procedureName: 'Root Canal Treatment (Molar)',
    procedureId: 'trt-root-canal',
    modeUsed: 'doctor-specific',
    timestamp: new Date(Date.now() - 28 * 60 * 60 * 1000).toISOString(),
    materials: [
      { itemId: 'mat-gloves', name: 'Dental gloves (Nitrile)', unit: 'pairs', suggestedQty: 2, confirmedQty: 2, wastageQty: 0, batchNumber: 'GLV-2026-B1', deductedTotal: 2 },
      { itemId: 'mat-guttapercha', name: 'Gutta-percha (#25, .04 taper)', unit: 'cones', suggestedQty: 3, confirmedQty: 3, wastageQty: 1, batchNumber: 'LOT-2026-01', deductedTotal: 4 },
      { itemId: 'mat-irrigation', name: 'Irrigation solution (NaOCl 3%)', unit: 'ml', suggestedQty: 5, confirmedQty: 5, wastageQty: 0, batchNumber: 'IRR-2026-04', deductedTotal: 5 },
      { itemId: 'mat-files', name: 'Dental files (Rotary NiTi)', unit: 'sets', suggestedQty: 1, confirmedQty: 1, wastageQty: 0, batchNumber: 'DF-2026-X1', deductedTotal: 1 }
    ],
    notes: 'Biomechanical preparation completed for MB, DB, and Palatal canals. 1 GP cone trimmed and discarded during master cone fitting.',
    confirmedBy: 'Aashna Jose Alappattu'
  }
]

// In-memory state with localStorage sync
let state: AdaptiveInventoryState = loadFromStorage<AdaptiveInventoryState>(STORAGE_KEY, {
  suggestionMode: 'standard',
  items: INITIAL_INVENTORY_ITEMS,
  templates: INITIAL_TREATMENT_TEMPLATES,
  doctorPreferences: INITIAL_DOCTOR_PREFERENCES,
  consumptionHistory: [],
  deductionAuditLog: INITIAL_DEDUCTION_AUDIT
})

// Auto-seed audit records if log is currently empty
if (!state.deductionAuditLog || state.deductionAuditLog.length === 0) {
  state = {
    ...state,
    deductionAuditLog: INITIAL_DEDUCTION_AUDIT
  }
  saveToStorage(STORAGE_KEY, state)
}

const listeners = new Set<() => void>()

function emitChange() {
  saveToStorage(STORAGE_KEY, state)
  listeners.forEach((listener) => listener())
}

export function subscribeToAdaptiveInventory(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getAdaptiveInventorySnapshot(): AdaptiveInventoryState {
  return state
}

export function useAdaptiveInventory(): AdaptiveInventoryState {
  return useSyncExternalStore(subscribeToAdaptiveInventory, getAdaptiveInventorySnapshot, getAdaptiveInventorySnapshot)
}

/**
 * Synchronize inventory items & movements with backend database
 */
export async function syncInventoryWithBackend() {
  try {
    const backendItems = await apiClient.get<InventoryStockItem[]>('/inventory/items')
    if (Array.isArray(backendItems)) {
      state = {
        ...state,
        items: backendItems
      }
      emitChange()
    }
  } catch (err) {
    // Graceful offline fallback
  }

  try {
    const backendAudits = await apiClient.get<ConfirmedMaterialDeduction[]>('/inventory/movements')
    if (Array.isArray(backendAudits) && backendAudits.length > 0) {
      state = {
        ...state,
        deductionAuditLog: backendAudits
      }
      emitChange()
    }
  } catch (err) {
    // Graceful offline fallback
  }
}

// Initial background sync with backend on boot
if (typeof window !== 'undefined') {
  setTimeout(() => {
    syncInventoryWithBackend()
  }, 100)
}

/**
 * Configure global suggestion mode: 'standard' | 'doctor-specific' | 'manual'
 */
export function setSuggestionMode(mode: SuggestionMode) {
  state = {
    ...state,
    suggestionMode: mode
  }
  emitChange()
}

/**
 * Get suggestions for a specific doctor & procedure based on chosen or active mode.
 */
export function calculateProcedureSuggestions(
  procedureId: string,
  doctorId?: string,
  overrideMode?: SuggestionMode
): {
  modeUsed: SuggestionMode
  materials: {
    itemId: string
    name: string
    unit: string
    suggestedQty: number
    standardQty: number
    isAdaptiveOverride: boolean
    confidence?: number
    sampleSize?: number
    notes?: string
    availableStock: number
    suggestedBatch: InventoryBatch | null
  }[]
} {
  const mode = overrideMode || state.suggestionMode
  const template = state.templates.find((t) => t.procedureId === procedureId) || state.templates[0]

  if (mode === 'manual' || !template) {
    return {
      modeUsed: 'manual',
      materials: []
    }
  }

  const materials = template.materials.map((tmplItem) => {
    const stockItem = state.items.find((i) => i.id === tmplItem.itemId || i.name.toLowerCase() === tmplItem.name.toLowerCase())
    const availableStock = stockItem ? stockItem.totalStock : 0
    const suggestedBatch = stockItem && stockItem.activeBatches.length > 0 ? stockItem.activeBatches[0] : null

    let suggestedQty = tmplItem.suggestedQty
    let isAdaptiveOverride = false
    let confidence: number | undefined
    let sampleSize: number | undefined
    let notes: string | undefined

    if (mode === 'doctor-specific' && doctorId) {
      const pref = state.doctorPreferences.find(
        (p) => p.doctorId === doctorId && p.procedureId === procedureId && (p.itemId === tmplItem.itemId || p.itemId === stockItem?.id)
      )
      if (pref) {
        suggestedQty = pref.suggestedQty
        isAdaptiveOverride = pref.suggestedQty !== tmplItem.suggestedQty
        confidence = pref.confidence
        sampleSize = pref.sampleSize
        notes = pref.clinicalNotes
      }
    }

    return {
      itemId: stockItem?.id || tmplItem.itemId,
      name: stockItem?.name || tmplItem.name,
      unit: stockItem?.unit || tmplItem.unit,
      suggestedQty,
      standardQty: tmplItem.suggestedQty,
      isAdaptiveOverride,
      confidence,
      sampleSize,
      notes,
      availableStock,
      suggestedBatch
    }
  })

  return {
    modeUsed: mode,
    materials
  }
}

/**
 * Confirm actual consumption, perform FEFO batch deductions, and write audit log
 */
export function confirmConsumptionAndDeductStock(payload: {
  treatmentId?: string
  appointmentId?: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  procedureId: string
  procedureName: string
  modeUsed: SuggestionMode
  notes?: string
  confirmedBy: string
  items: {
    itemId: string
    name: string
    unit: string
    suggestedQty: number
    confirmedQty: number
    wastageQty: number
    batchNumber: string
  }[]
}): ConfirmedMaterialDeduction {
  const deductionId = `AUD-INV-${Date.now().toString().slice(-4)}`

  // 1. Execute stock deductions across active batches
  const updatedItems = state.items.map((stockItem) => {
    const consumedItem = payload.items.find((c) => c.itemId === stockItem.id)
    if (!consumedItem) return stockItem

    const totalToDeduct = consumedItem.confirmedQty + consumedItem.wastageQty
    if (totalToDeduct <= 0) return stockItem

    let remainingToDeduct = totalToDeduct
    const updatedBatches: InventoryBatch[] = []

    // Deduct from the selected batch first
    const targetBatchIdx = stockItem.activeBatches.findIndex((b) => b.batchNumber === consumedItem.batchNumber)

    if (targetBatchIdx >= 0) {
      const targetBatch = stockItem.activeBatches[targetBatchIdx]
      const deductFromTarget = Math.min(targetBatch.quantity, remainingToDeduct)
      remainingToDeduct -= deductFromTarget

      stockItem.activeBatches.forEach((b, idx) => {
        if (idx === targetBatchIdx) {
          const newQty = targetBatch.quantity - deductFromTarget
          if (newQty > 0) updatedBatches.push({ ...b, quantity: newQty })
        } else {
          updatedBatches.push(b)
        }
      })
    } else {
      updatedBatches.push(...stockItem.activeBatches)
    }

    // If more stock remains to deduct, apply FEFO order
    if (remainingToDeduct > 0) {
      const sortedBatches = [...updatedBatches].sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
      const finalBatches: InventoryBatch[] = []

      for (const batch of sortedBatches) {
        if (remainingToDeduct <= 0) {
          finalBatches.push(batch)
          continue
        }

        if (batch.quantity <= remainingToDeduct) {
          remainingToDeduct -= batch.quantity
        } else {
          finalBatches.push({ ...batch, quantity: batch.quantity - remainingToDeduct })
          remainingToDeduct = 0
        }
      }

      const totalStock = finalBatches.reduce((sum, b) => sum + b.quantity, 0)
      return {
        ...stockItem,
        totalStock,
        activeBatches: finalBatches
      }
    }

    const totalStock = updatedBatches.reduce((sum, b) => sum + b.quantity, 0)
    return {
      ...stockItem,
      totalStock,
      activeBatches: updatedBatches
    }
  })

  // 2. Build Audit Log Entry
  const auditRecord: ConfirmedMaterialDeduction = {
    id: deductionId,
    treatmentId: payload.treatmentId,
    appointmentId: payload.appointmentId,
    patientId: payload.patientId,
    patientName: payload.patientName,
    doctorId: payload.doctorId,
    doctorName: payload.doctorName,
    procedureId: payload.procedureId,
    procedureName: payload.procedureName,
    modeUsed: payload.modeUsed,
    timestamp: new Date().toISOString(),
    notes: payload.notes,
    confirmedBy: payload.confirmedBy,
    materials: payload.items.map((it) => ({
      ...it,
      deductedTotal: it.confirmedQty + it.wastageQty
    }))
  }

  // 3. Update Adaptive Learning Preferences (Doctor Model refinement)
  const updatedPreferences = [...state.doctorPreferences]

  payload.items.forEach((c) => {
    if (c.confirmedQty <= 0) return

    const existingPrefIndex = updatedPreferences.findIndex(
      (p) => p.doctorId === payload.doctorId && p.procedureId === payload.procedureId && p.itemId === c.itemId
    )

    if (existingPrefIndex >= 0) {
      const current = updatedPreferences[existingPrefIndex]
      const newSampleSize = current.sampleSize + 1
      const newAvg = (current.historicalAverage * current.sampleSize + c.confirmedQty) / newSampleSize
      const roundedSuggested = Math.round(newAvg * 10) / 10
      const newConfidence = Math.min(99, Math.round(80 + (newSampleSize / 30) * 19))

      updatedPreferences[existingPrefIndex] = {
        ...current,
        sampleSize: newSampleSize,
        historicalAverage: Number(newAvg.toFixed(2)),
        suggestedQty: Math.round(roundedSuggested),
        confidence: newConfidence
      }
    } else {
      const template = state.templates.find((t) => t.procedureId === payload.procedureId)
      const tmplItem = template?.materials.find((m) => m.itemId === c.itemId)
      const standardQty = tmplItem?.suggestedQty || 1

      updatedPreferences.push({
        doctorId: payload.doctorId,
        doctorName: payload.doctorName,
        procedureId: payload.procedureId,
        itemId: c.itemId,
        suggestedQty: c.confirmedQty,
        confidence: 82,
        sampleSize: 1,
        standardQty,
        historicalAverage: c.confirmedQty,
        clinicalNotes: `Initial baseline confirmed on ${new Date().toLocaleDateString()}`
      })
    }
  })

  // 4. Update state and notify subscribers
  state = {
    ...state,
    items: updatedItems,
    deductionAuditLog: [auditRecord, ...state.deductionAuditLog],
    doctorPreferences: updatedPreferences
  }

  emitChange()

  // Asynchronously synchronize confirmed deduction with backend database
  apiClient
    .post('/inventory/deduct', {
      treatmentId: payload.treatmentId,
      appointmentId: payload.appointmentId,
      patientId: payload.patientId,
      patientName: payload.patientName,
      doctorId: payload.doctorId,
      doctorName: payload.doctorName,
      procedureId: payload.procedureId,
      procedureName: payload.procedureName,
      modeUsed: payload.modeUsed,
      materials: payload.items,
      confirmedBy: payload.confirmedBy,
      notes: payload.notes
    })
    .catch(() => {
      // Offline fallback
    })

  return auditRecord
}

/**
 * Create a new inventory item and persist to backend
 */
export async function createNewInventoryItem(data: {
  sku: string
  name: string
  category: InventoryCategory
  unit: string
  reorderLevel: number
  costPerUnit?: number
  initialBatch?: {
    batchNumber: string
    expiryDate: string
    quantity: number
    location?: string
  }
}): Promise<InventoryStockItem> {
  const newItemId = 'item-' + Date.now().toString(36)
  const batches: InventoryBatch[] =
    data.initialBatch && data.initialBatch.quantity > 0
      ? [
          {
            batchNumber: data.initialBatch.batchNumber || `LOT-${new Date().getFullYear()}-01`,
            expiryDate: data.initialBatch.expiryDate || '2028-12-31',
            quantity: data.initialBatch.quantity,
            location: data.initialBatch.location || 'Central Storage'
          }
        ]
      : []

  const totalStock = batches.reduce((sum, b) => sum + b.quantity, 0)

  const newItem: InventoryStockItem = {
    id: newItemId,
    sku: data.sku,
    name: data.name,
    category: data.category,
    unit: data.unit,
    totalStock,
    reorderLevel: data.reorderLevel,
    costPerUnit: data.costPerUnit || 0,
    activeBatches: batches
  }

  state = {
    ...state,
    items: [newItem, ...state.items]
  }
  emitChange()

  try {
    const res = await apiClient.post<any>('/inventory/items', {
      sku: data.sku,
      name: data.name,
      category: data.category,
      unit: data.unit,
      totalStock,
      reorderLevel: data.reorderLevel,
      costPerUnit: data.costPerUnit || 0
    })

    if (res?.id && batches[0]) {
      await apiClient.post('/inventory/batches', {
        itemId: res.id,
        batchNumber: batches[0].batchNumber,
        expiryDate: batches[0].expiryDate,
        quantity: batches[0].quantity,
        location: batches[0].location
      })
    }
  } catch (err) {
    // offline fallback
  }

  return newItem
}

/**
 * Update an existing inventory item (name, category, unit, reorderLevel, cost)
 */
export function updateInventoryItem(itemId: string, updates: Partial<InventoryStockItem>) {
  state = {
    ...state,
    items: state.items.map((item) => {
      if (item.id !== itemId) return item
      return {
        ...item,
        ...updates
      }
    })
  }
  emitChange()

  // Asynchronously synchronize updates with backend database
  apiClient
    .patch(`/inventory/items/${itemId}`, updates)
    .catch(() => {
      // Offline fallback
    })
}

/**
 * Delete an inventory item
 */
export function deleteInventoryItem(itemId: string) {
  state = {
    ...state,
    items: state.items.filter((item) => item.id !== itemId)
  }
  emitChange()

  // Asynchronously synchronize deletion with backend database
  apiClient
    .delete(`/inventory/items/${itemId}`)
    .catch(() => {
      // Offline fallback
    })
}

/**
 * Add a new batch to an existing inventory item
 */
export function addBatchToItem(itemId: string, batch: InventoryBatch) {
  state = {
    ...state,
    items: state.items.map((item) => {
      if (item.id !== itemId) return item
      const updatedBatches = [...item.activeBatches, batch]
      const updatedTotal = updatedBatches.reduce((sum, b) => sum + b.quantity, 0)
      return {
        ...item,
        totalStock: updatedTotal,
        activeBatches: updatedBatches
      }
    })
  }
  emitChange()

  // Asynchronously synchronize new batch with backend database
  apiClient
    .post('/inventory/batches', {
      itemId,
      batchNumber: batch.batchNumber,
      expiryDate: batch.expiryDate,
      quantity: batch.quantity,
      location: batch.location
    })
    .catch(() => {
      // Offline fallback
    })
}

/**
 * Adjust stock quantity for a specific batch
 */
export function adjustBatchQuantity(itemId: string, batchNumber: string, deltaOrExact: { delta?: number; exact?: number }) {
  let calculatedDelta = 0
  const item = state.items.find((i) => i.id === itemId)
  const existingBatch = item?.activeBatches.find((b) => b.batchNumber === batchNumber)

  if (deltaOrExact.delta !== undefined) {
    calculatedDelta = deltaOrExact.delta
  } else if (deltaOrExact.exact !== undefined && existingBatch) {
    calculatedDelta = deltaOrExact.exact - existingBatch.quantity
  }

  state = {
    ...state,
    items: state.items.map((item) => {
      if (item.id !== itemId) return item
      const updatedBatches = item.activeBatches.map((b) => {
        if (b.batchNumber !== batchNumber) return b
        const newQty = deltaOrExact.exact !== undefined
          ? Math.max(0, deltaOrExact.exact)
          : Math.max(0, b.quantity + (deltaOrExact.delta || 0))
        return { ...b, quantity: newQty }
      })
      const updatedTotal = updatedBatches.reduce((sum, b) => sum + b.quantity, 0)
      return {
        ...item,
        totalStock: updatedTotal,
        activeBatches: updatedBatches
      }
    })
  }
  emitChange()

  // Asynchronously synchronize stock adjustment with backend database
  if (calculatedDelta !== 0) {
    apiClient
      .post('/inventory/adjust', {
        itemId,
        batchNumber,
        adjustmentAmount: calculatedDelta
      })
      .catch(() => {
        // Offline fallback
      })
  }
}

/**
 * Reset all inventory state (clean slate)
 */
export function resetAdaptiveInventory() {
  state = {
    suggestionMode: 'standard',
    items: [],
    templates: INITIAL_TREATMENT_TEMPLATES,
    doctorPreferences: [],
    consumptionHistory: [],
    deductionAuditLog: []
  }
  emitChange()
}

/**
 * Seed helper strictly for unit testing verification
 */
export function seedDemoInventoryForTesting() {
  state = {
    suggestionMode: 'doctor-specific',
    items: [
      {
        id: 'mat-gloves',
        sku: 'PPE-GLV-M',
        name: 'Dental gloves',
        category: 'PPE & General',
        unit: 'pairs',
        totalStock: 450,
        reorderLevel: 80,
        costPerUnit: 15,
        activeBatches: [
          { batchNumber: 'GLV-2026-B1', expiryDate: '2027-10-30', quantity: 250, location: 'Shelf A-1' },
          { batchNumber: 'GLV-2026-B2', expiryDate: '2028-02-15', quantity: 200, location: 'Shelf A-2' }
        ]
      },
      {
        id: 'mat-files',
        sku: 'ENDO-FIL-ROT',
        name: 'Dental files',
        category: 'Endodontics',
        unit: 'set',
        totalStock: 40,
        reorderLevel: 10,
        costPerUnit: 1450,
        activeBatches: [
          { batchNumber: 'DF-2026-X1', expiryDate: '2029-01-01', quantity: 40, location: 'Endo Drawer 1' }
        ]
      },
      {
        id: 'mat-guttapercha',
        sku: 'ENDO-OBT-GUT',
        name: 'Gutta-percha',
        category: 'Endodontics',
        unit: 'cones',
        totalStock: 480,
        reorderLevel: 120,
        costPerUnit: 5.5,
        activeBatches: [
          { batchNumber: 'GP-2026-09', expiryDate: '2028-09-15', quantity: 480, location: 'Endo Drawer 2' }
        ]
      },
      {
        id: 'mat-irrigation',
        sku: 'ENDO-IRR-HYP',
        name: 'Irrigation solution',
        category: 'Endodontics',
        unit: 'ml',
        totalStock: 3000,
        reorderLevel: 500,
        costPerUnit: 0.45,
        activeBatches: [
          { batchNumber: 'IRR-NC-44', expiryDate: '2027-08-30', quantity: 3000, location: 'Endo Station' }
        ]
      },
      {
        id: 'mat-cotton',
        sku: 'GEN-COT-PEL',
        name: 'Cotton pellets',
        category: 'PPE & General',
        unit: 'pieces',
        totalStock: 1200,
        reorderLevel: 200,
        costPerUnit: 1.2,
        activeBatches: [
          { batchNumber: 'COT-2026-01', expiryDate: '2029-12-31', quantity: 1200, location: 'Central Dispensary' }
        ]
      }
    ],
    templates: INITIAL_TREATMENT_TEMPLATES,
    doctorPreferences: [
      {
        doctorId: 'doc-2',
        doctorName: 'Dr. Priya Nair',
        procedureId: 'trt-root-canal',
        itemId: 'mat-files',
        suggestedQty: 2,
        confidence: 94,
        sampleSize: 26,
        standardQty: 1,
        historicalAverage: 2.1
      }
    ],
    consumptionHistory: [],
    deductionAuditLog: []
  }
}
