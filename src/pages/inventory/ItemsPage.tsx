import React, { useState, useMemo, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Package,
  Layers,
  Sparkles,
  Sliders,
  History,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Search,
  Filter,
  UserCheck,
  Stethoscope,
  Info,
  ShieldCheck,
  RotateCcw,
  Trash2,
  Calendar,
  MapPin,
  Clock,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronUp,
  PlusCircle,
  Edit3,
  X,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Activity,
  HeartPulse,
  Shield,
  Syringe,
  Scissors,
  Smile,
  ArrowUpRight
} from 'lucide-react'
import {
  useAdaptiveInventory,
  setSuggestionMode,
  calculateProcedureSuggestions,
  confirmConsumptionAndDeductStock,
  resetAdaptiveInventory,
  addBatchToItem,
  adjustBatchQuantity,
  type SuggestionMode,
  type InventoryStockItem,
  type InventoryBatch
} from '@/services/adaptiveInventoryStore'
import { TreatmentMaterialUsageModal } from '@/components/inventory/TreatmentMaterialUsageModal'
import './adaptiveInventory.css'

export interface TerminalItem {
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
}

export const ItemsPage: React.FC = () => {
  const inventory = useAdaptiveInventory()
  const location = useLocation()
  const initialTab = useMemo(() => {
    const params = new URLSearchParams(location.search)
    const t = params.get('tab')
    if (t === 'consumption') return 'consumption'
    return 'stock'
  }, [location.search])

  const [activeTab, setActiveTab] = useState<'consumption' | 'stock'>(initialTab)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const t = params.get('tab')
    if (t === 'consumption') {
      setActiveTab('consumption')
    } else {
      setActiveTab('stock')
      if (t === 'alerts') {
        setStatusQuickFilter('low')
      }
    }
  }, [location.search])

  

  // Selected doctor & procedure for the interactive simulator / consumption engine
  const [selectedDoctorId, setSelectedDoctorId] = useState('doc-2') // Default to Dr. Priya Nair (Doctor B)
  const [selectedProcedureId, setSelectedProcedureId] = useState('trt-root-canal')
  const [searchStock, setSearchStock] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')

  // Stock UI Controls
  const [stockViewMode, setStockViewMode] = useState<'grid' | 'table'>('table')
  const [statusQuickFilter, setStatusQuickFilter] = useState<'all' | 'low' | 'expiring' | 'optimal'>('all')
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)

  // Modals for adding batch and adjusting stock
  const [batchModalItem, setBatchModalItem] = useState<InventoryStockItem | null>(null)
  const [newBatchNumber, setNewBatchNumber] = useState('')
  const [newBatchExpiry, setNewBatchExpiry] = useState('')
  const [newBatchQty, setNewBatchQty] = useState(100)
  const [newBatchLocation, setNewBatchLocation] = useState('Central Dispensary')

  const [adjustModalData, setAdjustModalData] = useState<{ item: InventoryStockItem; batch: InventoryBatch } | null>(null)
  const [adjustAmount, setAdjustAmount] = useState(0)

  // Interactive Consumption Terminal State (embedded interactive card)
  const [terminalItems, setTerminalItems] = useState<TerminalItem[]>(() => {
    const calc = calculateProcedureSuggestions('trt-root-canal', 'doc-1', 'standard')
    return calc.materials.map((m) => ({
      itemId: m.itemId,
      name: m.name,
      unit: m.unit,
      suggestedQty: m.suggestedQty,
      confirmedQty: m.suggestedQty,
      wastageQty: 0,
      batchNumber: m.suggestedBatch ? m.suggestedBatch.batchNumber : 'DEFAULT-LOT',
      standardQty: m.standardQty,
      isAdaptiveOverride: m.isAdaptiveOverride,
      confidence: m.confidence,
      availableStock: m.availableStock
    }))
  })

  // Add material in terminal
  const [termAddId, setTermAddId] = useState('')
  const [termAddQty, setTermAddQty] = useState(1)
  const [customAddName, setCustomAddName] = useState('')
  const [isSandboxOnly, setIsSandboxOnly] = useState(false)
  const [recentDeductionId, setRecentDeductionId] = useState<string | null>(null)

  const handleAddCustomMaterial = () => {
    if (!customAddName.trim()) return
    const matchedStock = inventory.items.find((i) => i.name.toLowerCase().includes(customAddName.trim().toLowerCase()))
    setTerminalItems((prev) => [
      ...prev,
      {
        itemId: matchedStock?.id || `custom-${Date.now()}`,
        name: customAddName.trim(),
        unit: matchedStock?.unit || 'pieces',
        suggestedQty: 0,
        confirmedQty: 1,
        wastageQty: 0,
        batchNumber: matchedStock?.activeBatches[0]?.batchNumber || 'DEF-LOT',
        standardQty: 0,
        isAdaptiveOverride: false,
        confidence: undefined,
        availableStock: matchedStock?.totalStock || 100
      }
    ])
    setCustomAddName('')
  }

  // Full-screen Modal state
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Doctors metadata for quick switching
  const doctorsList = [
    { id: 'doc-1', name: 'Dr. Arun Kumar', label: 'Doctor A (General / Ortho)', filePref: '1 set' },
    { id: 'doc-2', name: 'Dr. Priya Nair', label: 'Doctor B (Endodontics Specialist)', filePref: '2 sets' },
    { id: 'doc-3', name: 'Dr. Tariq Antoun', label: 'Doctor C (Oral Surgeon)', filePref: '1 set' }
  ]

  const activeDoctor = doctorsList.find((d) => d.id === selectedDoctorId) || doctorsList[1]
  const activeTemplate = inventory.templates.find((t) => t.procedureId === selectedProcedureId) || inventory.templates[0]

  // Reload terminal suggestions when doctor, procedure, or suggestion mode changes
  const reloadTerminal = (procId: string, docId: string, mode: SuggestionMode) => {
    const calc = calculateProcedureSuggestions(procId, docId, mode)
    const newItems = calc.materials.map((m) => {
      const stock = inventory.items.find((i) => i.id === m.itemId)
      const batch = stock?.activeBatches[0]?.batchNumber || 'DEFAULT-LOT'
      return {
        itemId: m.itemId,
        name: m.name,
        unit: m.unit,
        suggestedQty: m.suggestedQty,
        confirmedQty: m.suggestedQty,
        wastageQty: 0,
        batchNumber: batch,
        standardQty: m.standardQty,
        isAdaptiveOverride: m.isAdaptiveOverride,
        confidence: m.confidence,
        availableStock: m.availableStock
      }
    })
    setTerminalItems(newItems)
    setRecentDeductionId(null)
  }

  // Handle mode toggle
  const handleModeChange = (newMode: SuggestionMode) => {
    setSuggestionMode(newMode)
    reloadTerminal(selectedProcedureId, selectedDoctorId, newMode)
  }

  // Handle doctor switch in terminal
  const handleDoctorSwitch = (docId: string) => {
    setSelectedDoctorId(docId)
    reloadTerminal(selectedProcedureId, docId, inventory.suggestionMode)
  }

  // Handle procedure switch in terminal
  const handleProcedureSwitch = (procId: string) => {
    setSelectedProcedureId(procId)
    reloadTerminal(procId, selectedDoctorId, inventory.suggestionMode)
  }

  // Terminal steppers
  const handleTerminalQty = (index: number, delta: number) => {
    setTerminalItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], confirmedQty: Math.max(0, next[index].confirmedQty + delta) }
      return next
    })
  }

  const handleTerminalWastage = (index: number, delta: number) => {
    setTerminalItems((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], wastageQty: Math.max(0, next[index].wastageQty + delta) }
      return next
    })
  }

  const handleTerminalRemove = (index: number) => {
    setTerminalItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleTerminalAdd = () => {
    if (!termAddId) return
    const stock = inventory.items.find((i) => i.id === termAddId)
    if (!stock) return

    const existingIdx = terminalItems.findIndex((t) => t.itemId === stock.id)
    if (existingIdx >= 0) {
      handleTerminalQty(existingIdx, termAddQty)
      setTermAddId('')
      return
    }

    setTerminalItems((prev) => [
      ...prev,
      {
        itemId: stock.id,
        name: stock.name,
        unit: stock.unit,
        suggestedQty: 0,
        confirmedQty: termAddQty,
        wastageQty: 0,
        batchNumber: stock.activeBatches[0]?.batchNumber || 'DEF-LOT',
        standardQty: 0,
        isAdaptiveOverride: false,
        confidence: undefined,
        availableStock: stock.totalStock
      }
    ])
    setTermAddId('')
    setTermAddQty(1)
  }

  // Terminal Confirm Actual Consumption
  const handleTerminalConfirm = () => {
    if (isSandboxOnly) {
      const simId = `SIM-${Date.now().toString().slice(-4)}`
      setRecentDeductionId(simId)
      return
    }

    const audit = confirmConsumptionAndDeductStock({
      patientId: 'pt-1001',
      patientName: 'Meera Nambiar',
      doctorId: activeDoctor.id,
      doctorName: activeDoctor.name,
      procedureId: activeTemplate.procedureId,
      procedureName: activeTemplate.procedureName,
      modeUsed: inventory.suggestionMode,
      confirmedBy: activeDoctor.name,
      notes: `Confirmed via Adaptive Treatment Terminal for ${activeDoctor.name}`,
      items: terminalItems.map((t) => ({
        itemId: t.itemId,
        name: t.name,
        unit: t.unit,
        suggestedQty: t.suggestedQty,
        confirmedQty: t.confirmedQty,
        wastageQty: t.wastageQty,
        batchNumber: t.batchNumber
      }))
    })

    setRecentDeductionId(audit.id)
  }

  // Handle Add New Batch Submit
  const handleAddBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!batchModalItem || !newBatchNumber || !newBatchExpiry || newBatchQty <= 0) return

    addBatchToItem(batchModalItem.id, {
      batchNumber: newBatchNumber.trim().toUpperCase(),
      expiryDate: newBatchExpiry,
      quantity: newBatchQty,
      location: newBatchLocation.trim() || 'Central Dispensary'
    })

    setBatchModalItem(null)
    setNewBatchNumber('')
    setNewBatchExpiry('')
    setNewBatchQty(100)
  }

  // Handle Quick Adjust Submit
  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!adjustModalData || adjustAmount === 0) return

    adjustBatchQuantity(adjustModalData.item.id, adjustModalData.batch.batchNumber, {
      delta: adjustAmount
    })

    setAdjustModalData(null)
    setAdjustAmount(0)
  }

  // Filtering Stock Items
  const filteredStock = inventory.items.filter((item) => {
    // 1. Category Filter
    if (categoryFilter !== 'All' && item.category !== categoryFilter) return false

    // 2. Search Text
    if (searchStock.trim()) {
      const q = searchStock.toLowerCase()
      const matchName = item.name.toLowerCase().includes(q)
      const matchSku = item.sku.toLowerCase().includes(q)
      const matchBatch = item.activeBatches.some((b) => b.batchNumber.toLowerCase().includes(q))
      if (!matchName && !matchSku && !matchBatch) return false
    }

    // 3. Quick Status Filter
    if (statusQuickFilter === 'low') {
      return item.totalStock <= item.reorderLevel
    }
    if (statusQuickFilter === 'expiring') {
      return item.activeBatches.some((b) => {
        const year = parseInt(b.expiryDate.split('-')[0], 10)
        return year <= 2027
      })
    }
    if (statusQuickFilter === 'optimal') {
      return item.totalStock > item.reorderLevel
    }

    return true
  })

  // Stock Summary Metrics
  const totalStockCount = inventory.items.reduce((s, i) => s + i.totalStock, 0)
  const lowStockCount = inventory.items.filter((i) => i.totalStock <= i.reorderLevel).length
  const totalBatchesCount = inventory.items.reduce((s, i) => s + i.activeBatches.length, 0)
  const nearExpiryCount = inventory.items.reduce((acc, item) => {
    return acc + item.activeBatches.filter((b) => parseInt(b.expiryDate.split('-')[0], 10) <= 2027).length
  }, 0)

  const getCategoryVisual = (category: string) => {
    switch (category) {
      case 'Endodontics':
        return { icon: Activity, color: '#0284c7', bg: '#e0f2fe' }
      case 'Restorative':
        return { icon: Sparkles, color: '#0d9488', bg: '#ccfbf1' }
      case 'Surgical':
        return { icon: Scissors, color: '#e11d48', bg: '#ffe4e6' }
      case 'Anesthetics':
        return { icon: Syringe, color: '#7c3aed', bg: '#ede9fe' }
      case 'Prosthodontics':
        return { icon: Layers, color: '#d97706', bg: '#fef3c7' }
      case 'PPE & General':
        return { icon: ShieldCheck, color: '#059669', bg: '#d1fae5' }
      case 'Preventive':
        return { icon: CheckCircle2, color: '#16a34a', bg: '#dcfce7' }
      case 'Orthodontics':
        return { icon: Smile, color: '#2563eb', bg: '#dbeafe' }
      default:
        return { icon: Package, color: '#008891', bg: '#e6f7f8' }
    }
  }

  const clinicalDepartments = [
    { id: 'All', label: 'All Departments', icon: Package, color: '#008891', bg: '#e6f7f8' },
    { id: 'Endodontics', label: 'Endodontics', icon: Activity, color: '#0284c7', bg: '#e0f2fe' },
    { id: 'Restorative', label: 'Restorative', icon: Sparkles, color: '#0d9488', bg: '#ccfbf1' },
    { id: 'Surgical', label: 'Surgical', icon: Scissors, color: '#e11d48', bg: '#ffe4e6' },
    { id: 'Anesthetics', label: 'Anesthetics', icon: Syringe, color: '#7c3aed', bg: '#ede9fe' },
    { id: 'Prosthodontics', label: 'Prosthodontics', icon: Layers, color: '#d97706', bg: '#fef3c7' },
    { id: 'PPE & General', label: 'PPE & General', icon: ShieldCheck, color: '#059669', bg: '#d1fae5' },
    { id: 'Preventive', label: 'Preventive', icon: CheckCircle2, color: '#16a34a', bg: '#dcfce7' },
    { id: 'Orthodontics', label: 'Orthodontics', icon: Smile, color: '#2563eb', bg: '#dbeafe' }
  ]

  const getDeptCount = (catId: string) => {
    if (catId === 'All') return inventory.items.length
    return inventory.items.filter((i) => i.category === catId).length
  }

  return (
    <section className="clinic-record-page adaptive-inventory-container" data-testid="feature-page-inv.items">
      {/* Page Header: Only the Heading */}
      <div style={{ margin: '2px 0 6px 0' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: 'var(--text-main, #0f172a)' }}>
          Treatment-Based Inventory
        </h1>
      </div>

      {/* Navigation Tabs */}
      <div className="ai-tabs ai-tabs-full">
        <button
          type="button"
          className={`ai-tab ${activeTab === 'consumption' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('consumption')}
        >
          Adaptive Material Consumption
        </button>
        <button
          type="button"
          className={`ai-tab ${activeTab === 'stock' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('stock')}
        >
          Stock Levels & Batches
        </button>
      </div>

      {/* TAB 1: STOCK LEVELS & BATCHES (SIMPLE, CLEAN & UNIFIED) */}
      {activeTab === 'stock' && (
        <div className="unified-inventory-card">
          {/* Unified Card Header Toolbar */}
          <div className="unified-table-toolbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
              {/* Search Box */}
              <div className="unified-search-wrap">
                <Search size={14} style={{ position: 'absolute', left: '12px', color: '#94a3b8', pointerEvents: 'none' }} />
                <input
                  className="unified-search-input"
                  placeholder="Search item, SKU, or batch..."
                  value={searchStock}
                  onChange={(e) => setSearchStock(e.target.value)}
                />
                {searchStock && (
                  <button
                    type="button"
                    onClick={() => setSearchStock('')}
                    style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#94a3b8' }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              {/* Department Dropdown */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="unified-select"
              >
                {clinicalDepartments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.label}
                  </option>
                ))}
              </select>

              {/* Quick 1-Click Expiry Alert Filter */}
              {nearExpiryCount > 0 && (
                <button
                  type="button"
                  onClick={() => setStatusQuickFilter(statusQuickFilter === 'expiring' ? 'all' : 'expiring')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 13px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 650,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: statusQuickFilter === 'expiring'
                      ? '1px solid #d97706'
                      : '1px solid rgba(217, 119, 6, 0.3)',
                    background: statusQuickFilter === 'expiring'
                      ? '#d97706'
                      : 'rgba(217, 119, 6, 0.08)',
                    color: statusQuickFilter === 'expiring'
                      ? '#ffffff'
                      : '#b45309'
                  }}
                  title={statusQuickFilter === 'expiring' ? 'Clear expiry filter (showing all)' : 'Filter items with expiring batches'}
                >
                  <AlertTriangle size={13} style={{ color: statusQuickFilter === 'expiring' ? '#ffffff' : '#d97706' }} />
                  <span>{nearExpiryCount} Near Expiry</span>
                  {statusQuickFilter === 'expiring' && <X size={12} style={{ marginLeft: '2px' }} />}
                </button>
              )}

              {/* Quick 1-Click Low Stock Filter */}
              {lowStockCount > 0 && (
                <button
                  type="button"
                  onClick={() => setStatusQuickFilter(statusQuickFilter === 'low' ? 'all' : 'low')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 13px',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 650,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: statusQuickFilter === 'low'
                      ? '1px solid #dc2626'
                      : '1px solid rgba(220, 38, 38, 0.3)',
                    background: statusQuickFilter === 'low'
                      ? '#dc2626'
                      : 'rgba(220, 38, 38, 0.08)',
                    color: statusQuickFilter === 'low'
                      ? '#ffffff'
                      : '#dc2626'
                  }}
                  title={statusQuickFilter === 'low' ? 'Clear low stock filter (showing all)' : 'Filter items below reorder threshold'}
                >
                  <AlertTriangle size={13} style={{ color: statusQuickFilter === 'low' ? '#ffffff' : '#dc2626' }} />
                  <span>{lowStockCount} Low Stock</span>
                  {statusQuickFilter === 'low' && <X size={12} style={{ marginLeft: '2px' }} />}
                </button>
              )}

              {/* Status Filter Dropdown for Additional Filtering */}
              <select
                value={statusQuickFilter}
                onChange={(e) => setStatusQuickFilter(e.target.value as any)}
                className="unified-select"
                aria-label="Filter by status"
              >
                <option value="all">All Status</option>
                <option value="expiring">Near Expiry ({nearExpiryCount})</option>
                <option value="low">Low Stock ({lowStockCount})</option>
                <option value="optimal">Optimal Stock</option>
              </select>
            </div>

            {/* Right Action: Receive Stock */}
            <div>
              {filteredStock[0] && (
                <button
                  type="button"
                  onClick={() => {
                    const first = filteredStock[0]
                    setBatchModalItem(first)
                    setNewBatchNumber(`${first.sku.split('-')[0]}-${new Date().getFullYear()}-01`)
                    setNewBatchExpiry('2028-12-31')
                    setNewBatchQty(first.reorderLevel * 2)
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'var(--teal-primary, #008891)',
                    color: '#ffffff',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(0, 136, 145, 0.2)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Plus size={14} /> Receive Stock
                </button>
              )}
            </div>
          </div>

          {/* Clean, Non-Cramped Inventory Table */}
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table className="inv-sheet-table" style={{ width: '100%', minWidth: '740px' }}>
              <thead>
                <tr>
                  <th style={{ width: '27%' }}>Item & SKU</th>
                  <th style={{ width: '18%' }}>Stock Level</th>
                  <th style={{ width: '41%' }}>Active Batches</th>
                  <th style={{ width: '14%', textAlign: 'right', paddingRight: '18px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStock.map((stock) => {
                  const isLow = stock.totalStock <= stock.reorderLevel
                  const sortedBatches = [...stock.activeBatches].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))

                  return (
                    <tr key={stock.id} className="inv-sheet-row">
                      {/* Item & SKU */}
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-strong, #0f172a)', lineHeight: 1.35 }}>
                          {stock.name}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                          <span style={{ fontFamily: 'monospace' }}>SKU: {stock.sku}</span>
                          <span>&bull;</span>
                          <span>{stock.category}</span>
                        </div>
                      </td>

                      {/* Stock Level (Integrated Status & Reorder Threshold) */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: isLow ? '#dc2626' : 'var(--text-strong, #0f172a)' }}>
                            {stock.totalStock} <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-muted, #64748b)' }}>{stock.unit}</span>
                          </span>
                          {isLow ? (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '1px 6px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 700, background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' }}>
                              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'currentColor' }} />
                              Low Stock
                            </span>
                          ) : (
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '1px 6px', borderRadius: '4px', fontSize: '10.5px', fontWeight: 600, background: 'rgba(5, 150, 105, 0.08)', color: '#059669' }}>
                              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'currentColor' }} />
                              In Stock
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                          Min: {stock.reorderLevel} {stock.unit}
                        </div>
                      </td>

                      {/* Active Batches - Simple & Streamlined with Expiry Alert highlight */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          {sortedBatches.slice(0, 2).map((b) => {
                            const isExpiring = parseInt(b.expiryDate.split('-')[0], 10) <= 2027
                            return (
                              <div key={b.batchNumber} style={{ fontSize: '11.5px', color: 'var(--text, #334155)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--text-strong, #0f172a)' }}>{b.batchNumber}</span>
                                <span style={{ color: 'var(--text-muted, #64748b)', fontSize: '11px' }}>({b.quantity} {stock.unit})</span>
                                <span style={{ color: 'var(--text-muted, #cbd5e1)', fontSize: '10px' }}>&bull;</span>
                                {isExpiring ? (
                                  <span style={{
                                    fontSize: '10.5px',
                                    fontWeight: 600,
                                    color: '#b45309',
                                    background: 'rgba(245, 158, 11, 0.12)',
                                    padding: '1px 5px',
                                    borderRadius: '4px'
                                  }}>
                                    Exp {b.expiryDate} (Expiring)
                                  </span>
                                ) : (
                                  <span style={{ color: 'var(--text-muted, #64748b)', fontSize: '11px' }}>
                                    Exp {b.expiryDate}
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right', paddingRight: '18px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setBatchModalItem(stock)
                              setNewBatchNumber(`${stock.sku.split('-')[0]}-${new Date().getFullYear()}-01`)
                              setNewBatchExpiry('2028-12-31')
                              setNewBatchQty(stock.reorderLevel * 2)
                            }}
                            title="Receive new batch lot"
                            style={{
                              padding: '4px 10px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              background: 'rgba(0, 136, 145, 0.08)',
                              color: 'var(--teal-primary, #008891)',
                              border: '1px solid rgba(0, 136, 145, 0.25)',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Plus size={11} /> Lot
                          </button>
                          {stock.activeBatches[0] && (
                            <button
                              type="button"
                              onClick={() => {
                                setAdjustModalData({ item: stock, batch: stock.activeBatches[0] })
                                setAdjustAmount(0)
                              }}
                              title="Adjust stock quantity"
                              style={{
                                padding: '4px 10px',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                background: '#f8fafc',
                                color: '#475569',
                                border: '1px solid #cbd5e1',
                                borderRadius: '6px',
                                cursor: 'pointer'
                              }}
                            >
                              Adjust
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filteredStock.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '36px 20px', color: '#64748b' }}>
                      <p style={{ margin: '0 0 6px 0', fontSize: '13.5px', fontWeight: 600 }}>
                        No inventory items match the current filter
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setStatusQuickFilter('all')
                          setCategoryFilter('All')
                          setSearchStock('')
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--teal-primary, #008891)',
                          fontWeight: 700,
                          fontSize: '12px',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        Reset all filters
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ADAPTIVE MATERIAL CONSUMPTION TERMINAL (EXACT ORIGINAL IMPLEMENTATION) */}
      {activeTab === 'consumption' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Controls Bar: Sleek Careplus Island */}
          <div className="consumption-controls-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div className="consumption-ctrl-group">
                <label className="consumption-ctrl-label">Procedure</label>
                <select
                  value={selectedProcedureId}
                  onChange={(e) => handleProcedureSwitch(e.target.value)}
                  className="consumption-select"
                >
                  {inventory.templates.map((tmpl) => (
                    <option key={tmpl.procedureId} value={tmpl.procedureId}>
                      {tmpl.procedureName} ({tmpl.category})
                    </option>
                  ))}
                </select>
              </div>

              <div className="consumption-ctrl-group">
                <label className="consumption-ctrl-label">Doctor (Adaptive Target)</label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => handleDoctorSwitch(e.target.value)}
                  className="consumption-select"
                >
                  {doctorsList.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.label} &bull; Files: {doc.filePref}
                    </option>
                  ))}
                </select>
              </div>

              <div className="consumption-ctrl-group">
                <label className="consumption-ctrl-label">Suggestion Mode</label>
                <div className="ai-mode-selector">
                  <button
                    type="button"
                    className={`ai-mode-btn ${inventory.suggestionMode === 'standard' ? 'is-active' : ''}`}
                    onClick={() => handleModeChange('standard')}
                  >
                    Standard template
                  </button>
                  <button
                    type="button"
                    className={`ai-mode-btn ${inventory.suggestionMode === 'doctor-specific' ? 'is-active' : ''}`}
                    onClick={() => handleModeChange('doctor-specific')}
                  >
                    Doctor-specific
                  </button>
                  <button
                    type="button"
                    className={`ai-mode-btn ${inventory.suggestionMode === 'manual' ? 'is-active' : ''}`}
                    onClick={() => handleModeChange('manual')}
                  >
                    Manual
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                type="button"
                onClick={() => resetAdaptiveInventory()}
                className="consumption-subtle-btn"
                title="Reset demo data to initial defaults"
              >
                <RotateCcw size={13} /> Reset Demo Data
              </button>
            </div>
          </div>

          {/* Interactive Screen Container */}
          <div style={{ background: 'var(--surface, #ffffff)', border: '1px solid var(--line, #e2e8f0)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
            {/* Screen Header */}
            <div style={{ padding: '20px 24px', background: '#ffffff', borderBottom: '1px solid var(--line, #f1f5f9)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px 0', color: 'var(--text-main, #0f172a)' }}>
                  {activeTemplate.procedureName} – Material Usage
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
                    {inventory.suggestionMode === 'manual'
                      ? 'Manual consumption entry · Record actual materials used'
                      : 'Suggested quantities · Editable before confirmation'}
                  </span>
                  <span style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #dbeafe', fontSize: '11px', fontWeight: 600, padding: '2px 10px', borderRadius: '9999px' }}>
                    {inventory.suggestionMode === 'manual' ? 'Manual entry' : 'Editable suggestions'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="ai-pill ai-pill-adaptive" style={{ fontSize: '12px', padding: '5px 12px' }}>
                  {activeDoctor.name} ({activeDoctor.filePref} file avg)
                </span>
                <span className="ai-pill ai-pill-standard" style={{ fontSize: '12px', padding: '5px 12px', textTransform: 'capitalize' }}>
                  {inventory.suggestionMode} Mode
                </span>
              </div>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Editable Suggestions Table */}
              <div style={{ overflowX: 'auto' }}>
                <table className="ai-materials-table">
                  <thead>
                    <tr>
                      <th style={{ width: '28%' }}>Material</th>
                      <th style={{ width: '14%' }}>Suggested</th>
                      <th style={{ width: '20%' }}>Actual Quantity</th>
                      <th style={{ width: '14%' }}>Wastage</th>
                      <th style={{ width: '18%' }}>Batch & Stock</th>
                      <th style={{ width: '6%', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {terminalItems.map((item, idx) => {
                      const stockItem = inventory.items.find((i) => i.id === item.itemId)
                      const batches = stockItem?.activeBatches || []

                      return (
                        <tr key={item.itemId}>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>
                              {item.name}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                              {item.unit}
                              {item.isAdaptiveOverride && (
                                <span className="ai-pill ai-pill-adaptive" style={{ marginLeft: '6px', fontSize: '10.5px' }}>
                                  Doctor Adaptive
                                </span>
                              )}
                            </div>
                          </td>

                          <td>
                            <div style={{ fontWeight: 600, fontSize: '14px' }}>
                              {item.suggestedQty} <span style={{ fontSize: '12px', fontWeight: 400 }}>{item.unit}</span>
                            </div>
                            {item.isAdaptiveOverride && (
                              <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>
                                Clinic std: {item.standardQty}
                              </div>
                            )}
                          </td>

                          <td>
                            <div className="ai-stepper">
                              <button
                                type="button"
                                className="ai-stepper-btn"
                                onClick={() => handleTerminalQty(idx, -1)}
                                disabled={item.confirmedQty <= 0}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={0}
                                className="ai-stepper-input"
                                value={item.confirmedQty}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10)
                                  setTerminalItems((prev) => {
                                    const next = [...prev]
                                    next[idx] = { ...next[idx], confirmedQty: isNaN(val) ? 0 : Math.max(0, val) }
                                    return next
                                  })
                                }}
                              />
                              <button
                                type="button"
                                className="ai-stepper-btn"
                                onClick={() => handleTerminalQty(idx, 1)}
                              >
                                +
                              </button>
                            </div>
                          </td>

                          <td>
                            <div className="ai-stepper">
                              <button
                                type="button"
                                className="ai-stepper-btn"
                                onClick={() => handleTerminalWastage(idx, -1)}
                                disabled={item.wastageQty <= 0}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={0}
                                className="ai-stepper-input"
                                style={{ width: '40px', color: item.wastageQty > 0 ? '#dc2626' : undefined }}
                                value={item.wastageQty}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10)
                                  setTerminalItems((prev) => {
                                    const next = [...prev]
                                    next[idx] = { ...next[idx], wastageQty: isNaN(val) ? 0 : Math.max(0, val) }
                                    return next
                                  })
                                }}
                              />
                              <button
                                type="button"
                                className="ai-stepper-btn"
                                onClick={() => handleTerminalWastage(idx, 1)}
                              >
                                +
                              </button>
                            </div>
                          </td>

                          <td>
                            <select
                              className="ai-batch-select"
                              value={item.batchNumber}
                              onChange={(e) => {
                                const batchNumber = e.target.value
                                setTerminalItems((prev) => {
                                  const next = [...prev]
                                  next[idx] = { ...next[idx], batchNumber }
                                  return next
                                })
                              }}
                            >
                              {batches.map((b) => (
                                <option key={b.batchNumber} value={b.batchNumber}>
                                  {b.batchNumber} ({b.quantity} avail)
                                </option>
                              ))}
                            </select>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                              Total in clinic: {stockItem?.totalStock || item.availableStock} {item.unit}
                            </div>
                          </td>

                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleTerminalRemove(idx)}
                              style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
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

              {/* Add Another Material Bar */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-main, #0f172a)', whiteSpace: 'nowrap' }}>
                    Add another material:
                  </span>
                  <select
                    value={termAddId}
                    onChange={(e) => setTermAddId(e.target.value)}
                    className="consumption-select"
                    style={{ flex: 1, minWidth: '200px' }}
                  >
                    <option value="">Select material from inventory...</option>
                    {inventory.items.map((stock) => (
                      <option key={stock.id} value={stock.id}>
                        {stock.name} ({stock.totalStock} {stock.unit} available)
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748b)', fontWeight: 500 }}>Quantity:</span>
                    <input
                      type="number"
                      min={1}
                      value={termAddQty}
                      onChange={(e) => setTermAddQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="consumption-select"
                      style={{ width: '64px', textAlign: 'center', padding: '6px 8px' }}
                    />
                  </div>
                  <button
                    type="button"
                    className="ai-btn-add"
                    onClick={handleTerminalAdd}
                    disabled={!termAddId}
                  >
                    <Plus size={15} /> Add
                  </button>
                </div>
              </div>

              {/* Confirmation Success Callout */}
              {recentDeductionId && (
                <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <CheckCircle2 size={22} style={{ color: '#059669', flexShrink: 0 }} />
                  <div>
                    <div style={{ color: '#065f46', fontSize: '13.5px', fontWeight: 600 }}>
                      Actual Consumption Confirmed & Stock Deducted
                    </div>
                    <div style={{ fontSize: '12px', color: '#047857', marginTop: '2px' }}>
                      Audit Ref: <strong>{recentDeductionId}</strong> &bull; Quantities deducted from FEFO batch lots. Doctor adaptive profile updated.
                    </div>
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', borderTop: '1px solid var(--line, #f1f5f9)', paddingTop: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
                    Confirmed Items: <strong style={{ color: 'var(--text-main, #0f172a)' }}>{terminalItems.reduce((s, i) => s + i.confirmedQty, 0)}</strong>
                    {' '}&bull; Wastage: <strong style={{ color: terminalItems.reduce((s, i) => s + i.wastageQty, 0) > 0 ? '#dc2626' : 'var(--text-main, #0f172a)' }}>{terminalItems.reduce((s, i) => s + i.wastageQty, 0)}</strong>
                  </div>

                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--text-muted, #64748b)', cursor: 'pointer', userSelect: 'none' }}>
                    <input
                      type="checkbox"
                      checked={isSandboxOnly}
                      onChange={(e) => setIsSandboxOnly(e.target.checked)}
                      style={{ cursor: 'pointer', accentColor: 'var(--teal-primary, #008891)' }}
                    />
                    <span>Simulation mode (do not deduct stock)</span>
                  </label>
                </div>

                <button
                  type="button"
                  className="pat-btn pat-btn-primary"
                  onClick={handleTerminalConfirm}
                  style={{ padding: '10px 26px', fontSize: '14px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: '12px' }}
                >
                  <CheckCircle2 size={17} />
                  <span>Confirm Actual Consumption & Deduct Stock</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* MODAL 1: ADD NEW BATCH LOT */}
      {batchModalItem && (
        <div className="ai-modal-overlay" onClick={() => setBatchModalItem(null)} role="dialog" aria-modal="true">
          <div className="ai-modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ai-modal-header">
              <div>
                <span className="pat-badge" style={{ marginBottom: '4px', display: 'inline-block' }}>
                  {batchModalItem.category}
                </span>
                <h3 style={{ margin: '2px 0', fontSize: '18px', fontWeight: 700 }}>
                  Receive New Batch Lot
                </h3>
                <span style={{ fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
                  {batchModalItem.name} (SKU: {batchModalItem.sku})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setBatchModalItem(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddBatchSubmit}>
              <div className="ai-modal-body" style={{ gap: '14px' }}>
                {/* Active Lots in Clinic */}
                {batchModalItem.activeBatches.length > 0 && (
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>
                      Active Lots in Clinic ({batchModalItem.activeBatches.length}):
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {batchModalItem.activeBatches.map((b) => (
                        <div key={b.batchNumber} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '12.5px' }}>
                          <div>
                            <strong>{b.batchNumber}</strong> &bull; <span style={{ color: '#64748b' }}>Exp: {b.expiryDate}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 700, color: '#0f172a' }}>{b.quantity} {batchModalItem.unit}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setAdjustModalData({ item: batchModalItem, batch: b })
                                setAdjustAmount(0)
                              }}
                              className="careplus-pill-btn secondary"
                              style={{ padding: '3px 10px', fontSize: '11px' }}
                            >
                              Adjust
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '10px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>
                    Receive New Batch / Lot:
                  </label>
                  <input
                    type="text"
                    required
                    value={newBatchNumber}
                    onChange={(e) => setNewBatchNumber(e.target.value)}
                    placeholder="e.g. GLV-2026-B3"
                    className="pat-input"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line, #cbd5e1)' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                      Expiry Date:
                    </label>
                    <input
                      type="date"
                      required
                      value={newBatchExpiry}
                      onChange={(e) => setNewBatchExpiry(e.target.value)}
                      className="pat-input"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line, #cbd5e1)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                      Quantity Received ({batchModalItem.unit}):
                    </label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={newBatchQty}
                      onChange={(e) => setNewBatchQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="pat-input"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line, #cbd5e1)' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                    Storage Bay / Location:
                  </label>
                  <input
                    type="text"
                    value={newBatchLocation}
                    onChange={(e) => setNewBatchLocation(e.target.value)}
                    placeholder="e.g. Shelf A-2, Sterile Cabinet, Cold Storage"
                    className="pat-input"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line, #cbd5e1)' }}
                  />
                </div>
              </div>

              <div className="ai-modal-footer">
                <button
                  type="button"
                  onClick={() => setBatchModalItem(null)}
                  className="pat-btn"
                  style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--line, #cbd5e1)', borderRadius: '8px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pat-btn pat-btn-primary"
                  style={{ padding: '8px 20px', borderRadius: '8px' }}
                >
                  <PlusCircle size={15} /> Save & Add Batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: QUICK ADJUST BATCH QUANTITY */}
      {adjustModalData && (
        <div className="ai-modal-overlay" onClick={() => setAdjustModalData(null)} role="dialog" aria-modal="true">
          <div className="ai-modal-content" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ai-modal-header">
              <div>
                <h3 style={{ margin: '2px 0', fontSize: '17px', fontWeight: 700 }}>
                  Adjust Batch Stock
                </h3>
                <span style={{ fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>
                  {adjustModalData.item.name} &bull; Lot: <strong>{adjustModalData.batch.batchNumber}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAdjustModalData(null)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit}>
              <div className="ai-modal-body" style={{ gap: '14px' }}>
                <div style={{ background: 'var(--surface-sunken, #f8fafc)', padding: '12px 14px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted, #64748b)' }}>Current Lot Quantity:</span>
                  <span style={{ fontSize: '18px', fontWeight: 800 }}>
                    {adjustModalData.batch.quantity} {adjustModalData.item.unit}
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                    Stock Adjustment (+ Restock / - Write-Off):
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      required
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(parseInt(e.target.value, 10) || 0)}
                      className="pat-input"
                      placeholder="e.g. +20 or -5"
                      style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--line, #cbd5e1)', fontSize: '15px', fontWeight: 700 }}
                    />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>
                      {adjustModalData.item.unit}
                    </span>
                  </div>
                </div>

                {/* Quick Increment Pill Shortcuts */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  {[-10, -5, +10, +25, +50].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAdjustAmount(v)}
                      style={{ flex: 1, padding: '5px 0', borderRadius: '6px', border: '1px solid var(--line, #cbd5e1)', background: 'var(--surface, #ffffff)', cursor: 'pointer', fontSize: '11.5px', fontWeight: 600, color: v < 0 ? '#dc2626' : '#059669' }}
                    >
                      {v > 0 ? `+${v}` : v}
                    </button>
                  ))}
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                  New Projected Lot Quantity: <strong>{Math.max(0, adjustModalData.batch.quantity + adjustAmount)} {adjustModalData.item.unit}</strong>
                </div>
              </div>

              <div className="ai-modal-footer">
                <button
                  type="button"
                  onClick={() => setAdjustModalData(null)}
                  className="pat-btn"
                  style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--line, #cbd5e1)', borderRadius: '8px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustAmount === 0}
                  className="pat-btn pat-btn-primary"
                  style={{ padding: '8px 20px', borderRadius: '8px' }}
                >
                  Apply Stock Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Standalone Modal Component */}
      <TreatmentMaterialUsageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        procedureId={selectedProcedureId}
        procedureName={activeTemplate.procedureName}
        doctorId={selectedDoctorId}
        doctorName={activeDoctor.name}
        patientId="pt-1001"
        patientName="Meera Nambiar"
      />
    </section>
  )
}

export default ItemsPage
