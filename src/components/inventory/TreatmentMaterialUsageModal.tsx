import React, { useState, useEffect } from 'react'
import {
  X,
  Plus,
  Trash2,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  Package,
  Layers,
  ArrowRight
} from 'lucide-react'
import {
  useAdaptiveInventory,
  calculateProcedureSuggestions,
  confirmConsumptionAndDeductStock,
  type SuggestionMode,
  type InventoryStockItem,
  type InventoryBatch
} from '@/services/adaptiveInventoryStore'
import '@/pages/inventory/adaptiveInventory.css'

export interface EditableConsumptionItem {
  itemId: string
  name: string
  unit: string
  suggestedQty: number
  confirmedQty: number
  wastageQty: number
  batchNumber: string
  standardQty: number
  isAdaptiveOverride: boolean
  confidence?: number
  availableStock: number
  availableBatches: InventoryBatch[]
}

interface TreatmentMaterialUsageModalProps {
  isOpen: boolean
  onClose: () => void
  procedureId?: string
  procedureName?: string
  patientId?: string
  patientName?: string
  doctorId?: string
  doctorName?: string
  appointmentId?: string
  treatmentId?: string
  onConfirmed?: (result: any) => void
}

export const TreatmentMaterialUsageModal: React.FC<TreatmentMaterialUsageModalProps> = ({
  isOpen,
  onClose,
  procedureId = 'trt-root-canal',
  procedureName = 'Root Canal Treatment',
  patientId = 'pt-1001',
  patientName = 'Meera Nambiar',
  doctorId = 'doc-2',
  doctorName = 'Dr. Priya Nair',
  appointmentId,
  treatmentId,
  onConfirmed
}) => {
  const inventoryState = useAdaptiveInventory()
  const [selectedMode, setSelectedMode] = useState<SuggestionMode>(inventoryState.suggestionMode)
  const [items, setItems] = useState<EditableConsumptionItem[]>([])
  const [notes, setNotes] = useState('')
  const [isInteractiveOnly, setIsInteractiveOnly] = useState(false)
  const [selectedAddItemId, setSelectedAddItemId] = useState('')
  const [addQty, setAddQty] = useState(1)
  const [confirmedAuditId, setConfirmedAuditId] = useState<string | null>(null)

  // Initialize or re-populate items when modal opens, procedure/doctor changes, or mode changes
  useEffect(() => {
    if (!isOpen) return

    setConfirmedAuditId(null)
    const calculation = calculateProcedureSuggestions(procedureId, doctorId, selectedMode)

    const editableList: EditableConsumptionItem[] = calculation.materials.map((m) => {
      const stockItem = inventoryState.items.find((i) => i.id === m.itemId)
      const batches = stockItem ? stockItem.activeBatches : []
      const defaultBatch = batches.length > 0 ? batches[0].batchNumber : 'GEN-BATCH-01'

      return {
        itemId: m.itemId,
        name: m.name,
        unit: m.unit,
        suggestedQty: m.suggestedQty,
        confirmedQty: m.suggestedQty,
        wastageQty: 0,
        batchNumber: defaultBatch,
        standardQty: m.standardQty,
        isAdaptiveOverride: m.isAdaptiveOverride,
        confidence: m.confidence,
        availableStock: m.availableStock,
        availableBatches: batches
      }
    })

    setItems(editableList)
  }, [isOpen, procedureId, doctorId, selectedMode, inventoryState.items])

  if (!isOpen) return null

  // Quantity stepper adjustments
  const handleQtyChange = (index: number, delta: number) => {
    setItems((prev) => {
      const next = [...prev]
      const current = next[index]
      const newQty = Math.max(0, current.confirmedQty + delta)
      next[index] = { ...current, confirmedQty: newQty }
      return next
    })
  }

  const handleDirectQtyChange = (index: number, val: string) => {
    const num = parseInt(val, 10)
    setItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], confirmedQty: isNaN(num) ? 0 : Math.max(0, num) }
      return next
    })
  }

  // Wastage adjustments
  const handleWastageChange = (index: number, delta: number) => {
    setItems((prev) => {
      const next = [...prev]
      const current = next[index]
      const newWastage = Math.max(0, current.wastageQty + delta)
      next[index] = { ...current, wastageQty: newWastage }
      return next
    })
  }

  // Batch change
  const handleBatchChange = (index: number, batchNumber: string) => {
    setItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], batchNumber }
      return next
    })
  }

  // Remove unused material
  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  // Add another material from catalog
  const handleAddMaterial = () => {
    if (!selectedAddItemId) return
    const stockItem = inventoryState.items.find((i) => i.id === selectedAddItemId)
    if (!stockItem) return

    // If item already in list, increment its confirmed quantity
    const existingIndex = items.findIndex((i) => i.itemId === stockItem.id)
    if (existingIndex >= 0) {
      handleQtyChange(existingIndex, addQty)
      setSelectedAddItemId('')
      return
    }

    const defaultBatch = stockItem.activeBatches.length > 0 ? stockItem.activeBatches[0].batchNumber : 'BATCH-DEF'
    const newItem: EditableConsumptionItem = {
      itemId: stockItem.id,
      name: stockItem.name,
      unit: stockItem.unit,
      suggestedQty: 0,
      confirmedQty: addQty,
      wastageQty: 0,
      batchNumber: defaultBatch,
      standardQty: 0,
      isAdaptiveOverride: false,
      availableStock: stockItem.totalStock,
      availableBatches: stockItem.activeBatches
    }

    setItems((prev) => [...prev, newItem])
    setSelectedAddItemId('')
    setAddQty(1)
  }

  // Confirm consumption workflow
  const handleConfirm = () => {
    if (isInteractiveOnly) {
      setConfirmedAuditId(`SIM-${Date.now().toString().slice(-4)}`)
      if (onConfirmed) {
        onConfirmed({
          id: `SIM-${Date.now().toString().slice(-4)}`,
          interactiveOnly: true,
          items
        })
      }
      return
    }

    const audit = confirmConsumptionAndDeductStock({
      treatmentId,
      appointmentId,
      patientId,
      patientName,
      doctorId,
      doctorName,
      procedureId,
      procedureName,
      modeUsed: selectedMode,
      notes,
      confirmedBy: doctorName,
      items: items.map((i) => ({
        itemId: i.itemId,
        name: i.name,
        unit: i.unit,
        suggestedQty: i.suggestedQty,
        confirmedQty: i.confirmedQty,
        wastageQty: i.wastageQty,
        batchNumber: i.batchNumber
      }))
    })

    setConfirmedAuditId(audit.id)
    if (onConfirmed) {
      onConfirmed(audit)
    }
  }

  // Doctor comparison insight note
  const getAdaptiveDoctorInsight = () => {
    if (selectedMode === 'standard') {
      return 'Standard Template Mode: Suggested quantities strictly reflect clinic-approved default protocols. Doctor learning history is bypassed.'
    }
    if (selectedMode === 'manual') {
      return 'Manual Entry Mode: Suggestions are disabled. You can enter all materials, quantities, and batches manually.'
    }
    if (doctorId === 'doc-2') {
      return 'Adaptive Learning Active: Dr. Priya Nair historically uses 2 sets of Dental files and 4 Gutta-percha cones for multi-canal treatments (94% confidence based on 26 procedures). Clinic standard is 1 set.'
    }
    if (doctorId === 'doc-1') {
      return 'Adaptive Learning Active: Dr. Arun Kumar matches clinic standard of 1 set of Dental files (96% confidence based on 18 procedures).'
    }
    return `Adaptive Learning Active: Suggestions tailored to ${doctorName}'s confirmed past clinical cases without altering baseline clinical protocols.`
  }

  return (
    <div className="ai-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="ai-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="ai-modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span className="ai-pill ai-pill-adaptive">
                <Sparkles size={12} /> Adaptive Inventory
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                {doctorName} &bull; Patient: {patientName} ({patientId})
              </span>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 4px 0', color: 'var(--text-main, #0f172a)' }}>
              {procedureName} – Material Usage
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
              Suggested quantities &middot; Editable before confirmation
            </p>
          </div>

          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--text-muted, #64748b)',
              padding: '6px',
              borderRadius: '8px'
            }}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="ai-modal-body">
          {/* Mode Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>
              Suggestion Mode:
            </div>
            <div className="ai-mode-selector">
              <button
                type="button"
                className={`ai-mode-btn ${selectedMode === 'standard' ? 'is-active' : ''}`}
                onClick={() => setSelectedMode('standard')}
              >
                Standard template
              </button>
              <button
                type="button"
                className={`ai-mode-btn ${selectedMode === 'doctor-specific' ? 'is-active' : ''}`}
                onClick={() => setSelectedMode('doctor-specific')}
              >
                <Sparkles size={12} /> Doctor-specific
              </button>
              <button
                type="button"
                className={`ai-mode-btn ${selectedMode === 'manual' ? 'is-active' : ''}`}
                onClick={() => setSelectedMode('manual')}
              >
                Manual
              </button>
            </div>
          </div>

          {/* Editable Suggestions Table / Cards */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--text-main, #0f172a)' }}>
                Editable suggestions
              </h3>
              <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                {items.length} materials tracked
              </span>
            </div>

            {items.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table className="ai-materials-table">
                  <thead>
                    <tr>
                      <th style={{ width: '28%' }}>Material</th>
                      <th style={{ width: '14%' }}>Suggested</th>
                      <th style={{ width: '22%' }}>Actual Quantity</th>
                      <th style={{ width: '14%' }}>Wastage</th>
                      <th style={{ width: '18%' }}>Batch & Stock</th>
                      <th style={{ width: '4%', textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const isOverridden = item.confirmedQty !== item.suggestedQty

                      return (
                        <tr key={item.itemId}>
                          {/* Material Name & Unit */}
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>
                              {item.name}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                              Unit: <span style={{ fontWeight: 500 }}>{item.unit}</span>
                              {item.isAdaptiveOverride && (
                                <span className="ai-pill ai-pill-adaptive" style={{ marginLeft: '6px', fontSize: '10.5px' }}>
                                  Doctor adaptive
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Suggested Qty */}
                          <td>
                            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>
                              {item.suggestedQty} <span style={{ fontSize: '12px', fontWeight: 400 }}>{item.unit}</span>
                            </div>
                            {item.isAdaptiveOverride && (
                              <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>
                                Std: {item.standardQty}
                              </div>
                            )}
                          </td>

                          {/* Editable Confirmed Quantity Stepper */}
                          <td>
                            <div className="ai-stepper">
                              <button
                                type="button"
                                className="ai-stepper-btn"
                                onClick={() => handleQtyChange(index, -1)}
                                disabled={item.confirmedQty <= 0}
                                aria-label="Decrease quantity"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={0}
                                className="ai-stepper-input"
                                value={item.confirmedQty}
                                onChange={(e) => handleDirectQtyChange(index, e.target.value)}
                              />
                              <button
                                type="button"
                                className="ai-stepper-btn"
                                onClick={() => handleQtyChange(index, 1)}
                                aria-label="Increase quantity"
                              >
                                +
                              </button>
                            </div>
                            {isOverridden && (
                              <span style={{ display: 'block', fontSize: '11px', color: '#0284c7', marginTop: '2px' }}>
                                Modified
                              </span>
                            )}
                          </td>

                          {/* Record Wastage Separately */}
                          <td>
                            <div className="ai-stepper">
                              <button
                                type="button"
                                className="ai-stepper-btn"
                                onClick={() => handleWastageChange(index, -1)}
                                disabled={item.wastageQty <= 0}
                                aria-label="Decrease wastage"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={0}
                                className="ai-stepper-input"
                                style={{ width: '42px', color: item.wastageQty > 0 ? '#dc2626' : undefined }}
                                value={item.wastageQty}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10)
                                  setItems((prev) => {
                                    const next = [...prev]
                                    next[index] = { ...next[index], wastageQty: isNaN(val) ? 0 : Math.max(0, val) }
                                    return next
                                  })
                                }}
                              />
                              <button
                                type="button"
                                className="ai-stepper-btn"
                                onClick={() => handleWastageChange(index, 1)}
                                aria-label="Increase wastage"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          {/* Batch Selection */}
                          <td>
                            <select
                              className="ai-batch-select"
                              value={item.batchNumber}
                              onChange={(e) => handleBatchChange(index, e.target.value)}
                            >
                              {item.availableBatches.length > 0 ? (
                                item.availableBatches.map((b) => (
                                  <option key={b.batchNumber} value={b.batchNumber}>
                                    {b.batchNumber} ({b.quantity} {item.unit})
                                  </option>
                                ))
                              ) : (
                                <option value="GEN-LOT">Default Lot ({item.availableStock} {item.unit})</option>
                              )}
                            </select>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                              In Stock: {item.availableStock} {item.unit}
                            </div>
                          </td>

                          {/* Remove Item */}
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              style={{
                                border: 'none',
                                background: 'transparent',
                                color: '#94a3b8',
                                cursor: 'pointer',
                                padding: '4px',
                                borderRadius: '4px'
                              }}
                              title="Remove unused material"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', background: 'var(--surface-sunken, #f8fafc)', borderRadius: '10px' }}>
                <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-muted, #64748b)' }}>
                  No materials currently listed. Use "Add another material" below to record usage.
                </p>
              </div>
            )}
          </div>

          {/* Add Another Material Section */}
          <div className="ai-add-box">
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>
              Add another material:
            </span>
            <select
              value={selectedAddItemId}
              onChange={(e) => setSelectedAddItemId(e.target.value)}
              style={{ flex: 1, minWidth: '200px' }}
            >
              <option value="">-- Select material from inventory --</option>
              {inventoryState.items.map((stock) => (
                <option key={stock.id} value={stock.id}>
                  {stock.name} ({stock.category}) &bull; Stock: {stock.totalStock} {stock.unit}
                </option>
              ))}
            </select>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>Qty:</span>
              <input
                type="number"
                min={1}
                value={addQty}
                onChange={(e) => setAddQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                style={{ width: '60px' }}
              />
            </div>

            <button
              type="button"
              className="ai-btn-add"
              onClick={handleAddMaterial}
              disabled={!selectedAddItemId}
            >
              <Plus size={15} /> Add
            </button>
          </div>

          {/* Clinical Procedure Notes */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-main, #0f172a)' }}>
              Clinical notes / Variance justification (optional):
            </label>
            <input
              type="text"
              className="pat-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Added 1 extra gutta-percha cone due to calcified 4th MB2 canal..."
              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line, #cbd5e1)' }}
            />
          </div>

          {/* Interactive example toggle notice (as requested in prompt) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-sunken, #f8fafc)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--line, #e2e8f0)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={16} style={{ color: 'var(--text-muted, #64748b)' }} />
              <span style={{ fontSize: '12.5px', color: 'var(--text-main, #0f172a)' }}>
                {isInteractiveOnly
                  ? 'Interactive example only. No real inventory is changed.'
                  : 'Live Inventory Deduction Mode: Real stock & audit records will be updated upon confirmation.'}
              </span>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isInteractiveOnly}
                onChange={(e) => setIsInteractiveOnly(e.target.checked)}
              />
              <span>Interactive sandbox only</span>
            </label>
          </div>

          {/* Success confirmation card if confirmed */}
          {confirmedAuditId && (
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle2 size={24} style={{ color: '#059669', flexShrink: 0 }} />
              <div>
                <strong style={{ color: '#065f46', fontSize: '14px' }}>
                  Consumption Confirmed & Stock Deducted Successfully!
                </strong>
                <div style={{ fontSize: '12px', color: '#047857', marginTop: '2px' }}>
                  Audit Reference: <strong>{confirmedAuditId}</strong> &bull; Doctor adaptive preferences updated based on confirmed actual usage.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="ai-modal-footer">
          <div style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748b)' }}>
            Total Items: <strong>{items.reduce((s, i) => s + i.confirmedQty, 0)}</strong> &bull; Total Wastage: <strong>{items.reduce((s, i) => s + i.wastageQty, 0)}</strong>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              className="pat-btn"
              onClick={onClose}
              style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--line, #cbd5e1)', borderRadius: '8px', cursor: 'pointer' }}
            >
              Cancel
            </button>

            <button
              type="button"
              className="pat-btn pat-btn-primary"
              onClick={handleConfirm}
              style={{
                padding: '8px 20px',
                background: 'var(--teal-primary, #0b8185)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '13.5px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle2 size={16} />
              <span>Confirm Actual Consumption</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

