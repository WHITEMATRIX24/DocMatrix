import React, { useState } from 'react'
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
  const [activeTab, setActiveTab] = useState<'consumption' | 'stock'>('stock')

  // Selected doctor & procedure for the interactive simulator / consumption engine
  const [selectedDoctorId, setSelectedDoctorId] = useState('doc-2') // Default to Dr. Priya Nair (Doctor B)
  const [selectedProcedureId, setSelectedProcedureId] = useState('trt-root-canal')
  const [searchStock, setSearchStock] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')

  // Stock UI Controls
  const [stockViewMode, setStockViewMode] = useState<'grid' | 'table'>('grid')
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
      <div className="ai-tabs">
        <button
          type="button"
          className={`ai-tab ${activeTab === 'stock' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('stock')}
        >
          Stock Levels & Batches ({inventory.items.length})
        </button>
        <button
          type="button"
          className={`ai-tab ${activeTab === 'consumption' ? 'is-active' : ''}`}
          onClick={() => setActiveTab('consumption')}
        >
          Adaptive Material Consumption
        </button>
      </div>

      {/* TAB 1: STOCK LEVELS & BATCHES (CAREPLUS CLEAN MEDICAL AESTHETIC) */}
      {activeTab === 'stock' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Clinical Departments Selector - Careplus Department Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text-main, #0f172a)' }}>
                Our Clinical Departments
              </h3>
              <span style={{ fontSize: '12.5px', color: 'var(--text-muted, #64748b)' }}>
                Select a department to filter stock
              </span>
            </div>

            <div className="careplus-dept-bar">
              {clinicalDepartments.map((dept) => {
                const DeptIcon = dept.icon
                const isActive = categoryFilter === dept.id
                const count = getDeptCount(dept.id)

                return (
                  <button
                    key={dept.id}
                    type="button"
                    className={`careplus-dept-card ${isActive ? 'is-active' : ''}`}
                    onClick={() => setCategoryFilter(dept.id)}
                  >
                    <div className="careplus-dept-icon" style={{ background: dept.bg, color: dept.color }}>
                      <DeptIcon size={22} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main, #0f172a)' }}>
                      {dept.label}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>
                      {count} {count === 1 ? 'item' : 'items'}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Simple Search & Filter Bar - Exactly as in screenshot */}
          <div className="careplus-filter-island">
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <input
                className="simple-pill-search"
                placeholder="Search items..."
                value={searchStock}
                onChange={(e) => setSearchStock(e.target.value)}
              />

              {/* Enhanced Good-Looking Status Filter Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`status-filter-pill ${statusQuickFilter === 'all' ? 'is-active' : ''}`}
                  onClick={() => setStatusQuickFilter('all')}
                >
                  <span>All</span>
                  <span className="status-count-badge">{inventory.items.length}</span>
                </button>
                <button
                  type="button"
                  className={`status-filter-pill ${statusQuickFilter === 'low' ? 'is-active' : ''} ${lowStockCount > 0 ? 'is-alert' : ''}`}
                  onClick={() => setStatusQuickFilter('low')}
                >
                  <span>Low Stock</span>
                  <span className="status-count-badge">{lowStockCount}</span>
                </button>
                <button
                  type="button"
                  className={`status-filter-pill is-warning ${statusQuickFilter === 'expiring' ? 'is-active' : ''}`}
                  onClick={() => setStatusQuickFilter('expiring')}
                >
                  <span>Near Expiry</span>
                  <span className="status-count-badge">{nearExpiryCount}</span>
                </button>
              </div>
            </div>

            {/* View Mode Toggle: Grid Cards vs Table */}
            <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', padding: '3px', borderRadius: '9999px', border: '1px solid #e2e8f0' }}>
              <button
                type="button"
                className={`ai-mode-btn ${stockViewMode === 'grid' ? 'is-active' : ''}`}
                onClick={() => setStockViewMode('grid')}
                style={{
                  padding: '5px 14px',
                  fontSize: '12.5px',
                  borderRadius: '9999px',
                  background: stockViewMode === 'grid' ? '#ffffff' : 'transparent',
                  color: stockViewMode === 'grid' ? 'var(--teal-primary, #008891)' : '#64748b',
                  fontWeight: stockViewMode === 'grid' ? 700 : 500,
                  boxShadow: stockViewMode === 'grid' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none'
                }}
                title="Careplus Rounded Cards View"
              >
                <LayoutGrid size={14} style={{ color: stockViewMode === 'grid' ? 'var(--teal-primary, #008891)' : '#64748b' }} /> Cards
              </button>
              <button
                type="button"
                className={`ai-mode-btn ${stockViewMode === 'table' ? 'is-active' : ''}`}
                onClick={() => setStockViewMode('table')}
                style={{
                  padding: '5px 14px',
                  fontSize: '12.5px',
                  borderRadius: '9999px',
                  background: stockViewMode === 'table' ? '#ffffff' : 'transparent',
                  color: stockViewMode === 'table' ? 'var(--teal-primary, #008891)' : '#64748b',
                  fontWeight: stockViewMode === 'table' ? 700 : 500,
                  boxShadow: stockViewMode === 'table' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none'
                }}
                title="Compact Table View"
              >
                <List size={14} style={{ color: stockViewMode === 'table' ? 'var(--teal-primary, #008891)' : '#64748b' }} /> Table
              </button>
            </div>
          </div>

          {/* VIEW 1: CAREPLUS ROUNDED CARD GRID VIEW */}
          {stockViewMode === 'grid' && (
            <div className="stock-card-grid">
              {filteredStock.map((item) => {
                const isLow = item.totalStock <= item.reorderLevel
                const sortedBatches = [...item.activeBatches].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))
                const primaryBatch = sortedBatches[0]
                const catVisual = getCategoryVisual(item.category)
                const CatIcon = catVisual.icon

                return (
                  <div key={item.id} className={`stock-item-card ${isLow ? 'is-low-stock' : ''}`}>
                    {/* Card Header: Icon Avatar + Category & SKU + Status Pill */}
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <div className="stock-icon-avatar" style={{ background: catVisual.bg, color: catVisual.color }}>
                            <CatIcon size={20} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: catVisual.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              {item.category}
                            </span>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.sku}
                            </div>
                          </div>
                        </div>

                        {isLow ? (
                          <span className="careplus-status-pill is-low">
                            Low Stock
                          </span>
                        ) : (
                          <span className="careplus-status-pill is-optimal">
                            Optimal
                          </span>
                        )}
                      </div>

                      {/* Item Name */}
                      <h3
                        title={item.name}
                        style={{
                          margin: '12px 0 2px 0',
                          fontSize: '15.5px',
                          fontWeight: 700,
                          color: 'var(--text-main, #0f172a)',
                          lineHeight: '1.3',
                          minHeight: '40px'
                        }}
                      >
                        {item.name}
                      </h3>
                    </div>

                    {/* Stock Level Counter */}
                    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                      <div>
                        <span style={{ fontSize: '24px', fontWeight: 800, color: isLow ? '#dc2626' : 'var(--text-main, #0f172a)' }}>
                          {item.totalStock}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted, #64748b)', marginLeft: '6px' }}>
                          {item.unit}
                        </span>
                      </div>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted, #64748b)' }}>
                        Reorder: <strong>{item.reorderLevel}</strong>
                      </span>
                    </div>

                    {/* Active Lot Pill */}
                    <div className="careplus-batch-pill">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="fefo-pill">FEFO</span>
                        <strong style={{ fontSize: '12px', color: 'var(--text-main, #0f172a)' }}>
                          {primaryBatch ? primaryBatch.batchNumber : 'GEN-LOT'}
                        </strong>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)' }}>
                        Exp: {primaryBatch ? primaryBatch.expiryDate : '2028-12-31'}
                      </span>
                    </div>

                    {/* Footer: Price and Cyan Pill Action Button */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted, #64748b)' }}>
                        ₹{item.costPerUnit} / {item.unit}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setBatchModalItem(item)
                          setNewBatchNumber(`${item.sku.split('-')[0]}-${new Date().getFullYear()}-01`)
                          setNewBatchExpiry('2028-12-31')
                          setNewBatchQty(item.reorderLevel * 2)
                        }}
                        className="careplus-pill-btn"
                      >
                        <Plus size={13} />
                        <span>Receive Lot</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* VIEW 2: ORGANIZED INVENTORY SHEET / TABLE */}
          {stockViewMode === 'table' && (
            <div className="inv-sheet-container">
              <table className="inv-sheet-table">
                <thead>
                  <tr>
                    <th style={{ width: '25%' }}>Item & SKU</th>
                    <th style={{ width: '13%' }}>Category</th>
                    <th style={{ width: '12%' }}>Current Stock</th>
                    <th style={{ width: '12%' }}>Reorder Level</th>
                    <th style={{ width: '23%' }}>Batch Breakdown & FEFO</th>
                    <th style={{ width: '8%' }}>Status</th>
                    <th style={{ width: '7%', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStock.map((stock) => {
                    const isLow = stock.totalStock <= stock.reorderLevel
                    const sortedBatches = [...stock.activeBatches].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate))
                    const catVisual = getCategoryVisual(stock.category)

                    return (
                      <tr key={stock.id} className="inv-sheet-row">
                        {/* 1. Item & SKU */}
                        <td>
                          <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#0f172a' }}>
                            {stock.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace', marginTop: '2px' }}>
                            SKU: {stock.sku}
                          </div>
                        </td>

                        {/* 2. Category */}
                        <td>
                          <span
                            style={{
                              background: catVisual.bg,
                              color: catVisual.color,
                              padding: '3px 10px',
                              borderRadius: '9999px',
                              fontSize: '11px',
                              fontWeight: 700,
                              display: 'inline-block',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {stock.category}
                          </span>
                        </td>

                        {/* 3. Current Stock */}
                        <td>
                          <span style={{ fontSize: '15px', fontWeight: 800, color: isLow ? '#dc2626' : '#0f172a' }}>
                            {stock.totalStock}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginLeft: '4px' }}>
                            {stock.unit}
                          </span>
                        </td>

                        {/* 4. Reorder Level */}
                        <td>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>
                            {stock.reorderLevel} {stock.unit}
                          </span>
                        </td>

                        {/* 5. Batch Breakdown & FEFO */}
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {sortedBatches.map((b, idx) => (
                              <div key={b.batchNumber} className="inv-batch-pill-row">
                                <span className="inv-batch-num">{b.batchNumber}:</span>
                                <span className="inv-batch-qty">{b.quantity} {stock.unit}</span>
                                <span className="inv-batch-exp">(Exp: {b.expiryDate})</span>
                                {idx === 0 && sortedBatches.length > 1 && (
                                  <span className="fefo-pill" style={{ marginLeft: '2px' }}>FEFO</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* 6. Status */}
                        <td>
                          {isLow ? (
                            <span className="careplus-status-pill is-low">
                              Low Stock
                            </span>
                          ) : (
                            <span className="careplus-status-pill is-optimal">
                              Optimal
                            </span>
                          )}
                        </td>

                        {/* 7. Actions */}
                        <td style={{ textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setBatchModalItem(stock)
                              setNewBatchNumber(`${stock.sku.split('-')[0]}-${new Date().getFullYear()}-01`)
                              setNewBatchExpiry('2028-12-31')
                              setNewBatchQty(stock.reorderLevel * 2)
                            }}
                            className="careplus-pill-btn"
                            style={{ padding: '5px 14px', fontSize: '12px' }}
                          >
                            <Plus size={12} />
                            <span>Lot</span>
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
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
