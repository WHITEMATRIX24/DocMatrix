import { describe, it, expect, beforeEach } from 'vitest'
import {
  calculateProcedureSuggestions,
  confirmConsumptionAndDeductStock,
  setSuggestionMode,
  resetAdaptiveInventory,
  seedDemoInventoryForTesting,
  getAdaptiveInventorySnapshot,
  INITIAL_INVENTORY_ITEMS
} from '../src/services/adaptiveInventoryStore'

describe('Adaptive Treatment-Based Inventory Engine', () => {
  beforeEach(() => {
    seedDemoInventoryForTesting()
  })

  it('maintains clinic default material templates with starting quantities for Root Canal', () => {
    const calc = calculateProcedureSuggestions('trt-root-canal', undefined, 'standard')
    expect(calc.modeUsed).toBe('standard')

    const fileItem = calc.materials.find((m) => m.itemId === 'mat-files')
    const gloveItem = calc.materials.find((m) => m.itemId === 'mat-gloves')
    const gpItem = calc.materials.find((m) => m.itemId === 'mat-guttapercha')
    const irrItem = calc.materials.find((m) => m.itemId === 'mat-irrigation')
    const cottonItem = calc.materials.find((m) => m.itemId === 'mat-cotton')

    expect(fileItem?.suggestedQty).toBe(1)
    expect(fileItem?.unit).toBe('set')
    expect(gloveItem?.suggestedQty).toBe(2)
    expect(gloveItem?.unit).toBe('pairs')
    expect(gpItem?.suggestedQty).toBe(3)
    expect(gpItem?.unit).toBe('cones')
    expect(irrItem?.suggestedQty).toBe(5)
    expect(irrItem?.unit).toBe('ml')
    expect(cottonItem?.suggestedQty).toBe(5)
    expect(cottonItem?.unit).toBe('pieces')
  })

  it('suggests doctor-specific quantities for Doctor B (Dr. Priya Nair) based on historical usage', () => {
    // Doctor B (doc-2) prefers 2 sets of dental files and 4 cones
    const calcDocB = calculateProcedureSuggestions('trt-root-canal', 'doc-2', 'doctor-specific')
    expect(calcDocB.modeUsed).toBe('doctor-specific')

    const fileItemB = calcDocB.materials.find((m) => m.itemId === 'mat-files')
    expect(fileItemB?.suggestedQty).toBe(2)
    expect(fileItemB?.isAdaptiveOverride).toBe(true)
    expect(fileItemB?.confidence).toBeGreaterThan(90)

    // Doctor A (doc-1) standard is 1 set
    const calcDocA = calculateProcedureSuggestions('trt-root-canal', 'doc-1', 'doctor-specific')
    const fileItemA = calcDocA.materials.find((m) => m.itemId === 'mat-files')
    expect(fileItemA?.suggestedQty).toBe(1)
    expect(fileItemA?.isAdaptiveOverride).toBe(false)
  })

  it('strictly adheres to the three suggestion modes (standard, doctor-specific, manual)', () => {
    // 1. Standard mode forces clinic baseline even for Doctor B
    const standardCalc = calculateProcedureSuggestions('trt-root-canal', 'doc-2', 'standard')
    const fileItemStd = standardCalc.materials.find((m) => m.itemId === 'mat-files')
    expect(fileItemStd?.suggestedQty).toBe(1) // baseline clinic standard

    // 2. Doctor-specific mode returns learned preference
    const adaptiveCalc = calculateProcedureSuggestions('trt-root-canal', 'doc-2', 'doctor-specific')
    const fileItemAdapt = adaptiveCalc.materials.find((m) => m.itemId === 'mat-files')
    expect(fileItemAdapt?.suggestedQty).toBe(2)

    // 3. Manual mode returns empty list so user enters from scratch
    const manualCalc = calculateProcedureSuggestions('trt-root-canal', 'doc-2', 'manual')
    expect(manualCalc.materials).toHaveLength(0)
  })

  it('executes actual inventory deduction only upon confirmed consumption with separate wastage', () => {
    const initialSnapshot = getAdaptiveInventorySnapshot()
    const initialFiles = initialSnapshot.items.find((i) => i.id === 'mat-files')?.totalStock || 0
    const initialGloves = initialSnapshot.items.find((i) => i.id === 'mat-gloves')?.totalStock || 0

    // Doctor modifies quantities: confirms 2 sets of files with 1 wasted, confirms 3 pairs of gloves with 0 wasted
    const auditRecord = confirmConsumptionAndDeductStock({
      patientId: 'pt-1001',
      patientName: 'Meera Nambiar',
      doctorId: 'doc-2',
      doctorName: 'Dr. Priya Nair',
      procedureId: 'trt-root-canal',
      procedureName: 'Root Canal Treatment',
      modeUsed: 'doctor-specific',
      notes: 'Curved distal canal required extra files',
      confirmedBy: 'Dr. Priya Nair',
      items: [
        {
          itemId: 'mat-files',
          name: 'Dental files',
          unit: 'set',
          suggestedQty: 2,
          confirmedQty: 2,
          wastageQty: 1, // 1 file dropped/broken
          batchNumber: 'DF-2026-X1'
        },
        {
          itemId: 'mat-gloves',
          name: 'Dental gloves',
          unit: 'pairs',
          suggestedQty: 2,
          confirmedQty: 3,
          wastageQty: 0,
          batchNumber: 'GLV-2026-B1'
        }
      ]
    })

    // Verify audit record created
    expect(auditRecord.id).toMatch(/^AUD-INV-/)
    expect(auditRecord.doctorName).toBe('Dr. Priya Nair')
    expect(auditRecord.materials).toHaveLength(2)

    const updatedSnapshot = getAdaptiveInventorySnapshot()
    const updatedFiles = updatedSnapshot.items.find((i) => i.id === 'mat-files')?.totalStock || 0
    const updatedGloves = updatedSnapshot.items.find((i) => i.id === 'mat-gloves')?.totalStock || 0

    // Deducted: files total = confirmed(2) + wastage(1) = 3 sets deducted
    expect(updatedFiles).toBe(initialFiles - 3)
    // Deducted: gloves total = confirmed(3) + wastage(0) = 3 pairs deducted
    expect(updatedGloves).toBe(initialGloves - 3)

    // Verify batch level deduction
    const fileBatch = updatedSnapshot.items.find((i) => i.id === 'mat-files')?.activeBatches.find((b) => b.batchNumber === 'DF-2026-X1')
    expect(fileBatch).toBeDefined()
  })

  it('learns and refines doctor adaptive model after confirmation without changing clinic templates', () => {
    const initialPrefs = getAdaptiveInventorySnapshot().doctorPreferences
    const docAPref = initialPrefs.find((p) => p.doctorId === 'doc-1' && p.itemId === 'mat-files')
    const initialSampleSize = docAPref?.sampleSize || 0

    // Doctor A confirms 2 sets of files (higher than usual 1 set)
    confirmConsumptionAndDeductStock({
      patientId: 'pt-1002',
      patientName: 'Rajesh Varma',
      doctorId: 'doc-1',
      doctorName: 'Dr. Arun Kumar',
      procedureId: 'trt-root-canal',
      procedureName: 'Root Canal Treatment',
      modeUsed: 'doctor-specific',
      confirmedBy: 'Dr. Arun Kumar',
      items: [
        {
          itemId: 'mat-files',
          name: 'Dental files',
          unit: 'set',
          suggestedQty: 1,
          confirmedQty: 2,
          wastageQty: 0,
          batchNumber: 'DF-2026-X1'
        }
      ]
    })

    const updatedPrefs = getAdaptiveInventorySnapshot().doctorPreferences
    const updatedDocAPref = updatedPrefs.find((p) => p.doctorId === 'doc-1' && p.itemId === 'mat-files')

    // Sample size increased by 1
    expect(updatedDocAPref?.sampleSize).toBe(initialSampleSize + 1)

    // Clinic standard template remains untouched
    const rootCanalTemplate = getAdaptiveInventorySnapshot().templates.find((t) => t.procedureId === 'trt-root-canal')
    const standardFile = rootCanalTemplate?.materials.find((m) => m.itemId === 'mat-files')
    expect(standardFile?.suggestedQty).toBe(1)
  })

  it('supports inventory items and standard procedure templates across clinical departments', () => {
    const snapshot = getAdaptiveInventorySnapshot()
    expect(snapshot.templates.length).toBeGreaterThanOrEqual(5)

    const categories = new Set(snapshot.templates.map((t) => t.category))
    expect(categories.has('Endodontics')).toBe(true)
    expect(categories.has('Oral Surgery')).toBe(true)
    expect(categories.has('Restorative')).toBe(true)
    expect(categories.has('Preventive')).toBe(true)
    expect(categories.has('Prosthodontics')).toBe(true)
    expect(categories.has('Orthodontics')).toBe(true)
  })
})

