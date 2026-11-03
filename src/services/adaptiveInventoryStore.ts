import { useSyncExternalStore } from 'react'
import { loadFromStorage, saveToStorage } from './storageService'

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

const STORAGE_KEY = 'docmatrix_v2_adaptive_inventory'

// 1. Comprehensive Dental Clinic Inventory (All Departments & Materials)
export const INITIAL_INVENTORY_ITEMS: InventoryStockItem[] = [
  // --- PPE, INFECTION CONTROL & DISPOSABLES ---
  {
    id: 'mat-gloves',
    sku: 'PPE-GLV-M',
    name: 'Dental Examination Gloves (Nitrile)',
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
    id: 'mat-masks',
    sku: 'PPE-MSK-3P',
    name: '3-Ply Surgical Face Masks (Level 3)',
    category: 'PPE & General',
    unit: 'pieces',
    totalStock: 600,
    reorderLevel: 100,
    costPerUnit: 6,
    activeBatches: [
      { batchNumber: 'MSK-2026-M1', expiryDate: '2028-11-20', quantity: 600, location: 'Shelf A-3' }
    ]
  },
  {
    id: 'mat-bibs',
    sku: 'PPE-BIB-DISP',
    name: 'Patient Disposable Barrier Bibs',
    category: 'PPE & General',
    unit: 'pieces',
    totalStock: 800,
    reorderLevel: 150,
    costPerUnit: 3,
    activeBatches: [
      { batchNumber: 'BIB-2026-C4', expiryDate: '2029-01-10', quantity: 800, location: 'Dispensary D-1' }
    ]
  },
  {
    id: 'mat-cotton',
    sku: 'GEN-COT-PEL',
    name: 'Cotton Pellets (#2 Sterile)',
    category: 'PPE & General',
    unit: 'pieces',
    totalStock: 1200,
    reorderLevel: 200,
    costPerUnit: 1.5,
    activeBatches: [
      { batchNumber: 'COT-2026-01', expiryDate: '2029-12-31', quantity: 1200, location: 'Dispensary D-2' }
    ]
  },
  {
    id: 'mat-cotton-rolls',
    sku: 'GEN-COT-ROL',
    name: 'Dental Absorbent Cotton Rolls',
    category: 'PPE & General',
    unit: 'pieces',
    totalStock: 950,
    reorderLevel: 150,
    costPerUnit: 2,
    activeBatches: [
      { batchNumber: 'CR-2026-R8', expiryDate: '2029-06-30', quantity: 950, location: 'Dispensary D-2' }
    ]
  },
  {
    id: 'mat-suction',
    sku: 'GEN-SAL-EJCT',
    name: 'Disposable Saliva Ejector Tips',
    category: 'PPE & General',
    unit: 'pieces',
    totalStock: 500,
    reorderLevel: 80,
    costPerUnit: 4,
    activeBatches: [
      { batchNumber: 'SE-2026-T2', expiryDate: '2029-04-15', quantity: 500, location: 'Shelf B-1' }
    ]
  },
  {
    id: 'mat-pouches',
    sku: 'INF-STRL-PCH',
    name: 'Autoclave Sterilization Pouches',
    category: 'PPE & General',
    unit: 'pieces',
    totalStock: 400,
    reorderLevel: 60,
    costPerUnit: 5,
    activeBatches: [
      { batchNumber: 'SP-2026-09', expiryDate: '2028-10-12', quantity: 400, location: 'Sterilization Bay' }
    ]
  },
  {
    id: 'mat-disinfectant',
    sku: 'INF-CAVI-WPE',
    name: 'Surface Disinfectant Liquid (CaviCide)',
    category: 'PPE & General',
    unit: 'ml',
    totalStock: 3000,
    reorderLevel: 500,
    costPerUnit: 1.2,
    activeBatches: [
      { batchNumber: 'CD-2026-D4', expiryDate: '2027-08-30', quantity: 3000, location: 'Disinfectant Bay' }
    ]
  },

  // --- ENDODONTICS (ROOT CANAL SPECIALTY) ---
  {
    id: 'mat-files',
    sku: 'ENDO-FILE-ROT',
    name: 'Dental files (Rotary NiTi Protaper)',
    category: 'Endodontics',
    unit: 'set',
    totalStock: 65,
    reorderLevel: 15,
    costPerUnit: 650,
    activeBatches: [
      { batchNumber: 'DF-2026-X1', expiryDate: '2029-01-01', quantity: 40, location: 'Sterile Cabinet 3' },
      { batchNumber: 'DF-2026-X2', expiryDate: '2029-06-15', quantity: 25, location: 'Sterile Cabinet 3' }
    ]
  },
  {
    id: 'mat-kfiles',
    sku: 'ENDO-FILE-HND',
    name: 'Hand K-Files (Assorted #15-40)',
    category: 'Endodontics',
    unit: 'packs',
    totalStock: 35,
    reorderLevel: 8,
    costPerUnit: 320,
    activeBatches: [
      { batchNumber: 'KF-2026-H1', expiryDate: '2028-12-15', quantity: 35, location: 'Sterile Cabinet 3' }
    ]
  },
  {
    id: 'mat-guttapercha',
    sku: 'ENDO-GP-04',
    name: 'Gutta-percha (0.04 Taper Cones)',
    category: 'Endodontics',
    unit: 'cones',
    totalStock: 480,
    reorderLevel: 80,
    costPerUnit: 45,
    activeBatches: [
      { batchNumber: 'GP-2026-09', expiryDate: '2028-05-20', quantity: 300, location: 'Endo Tray 2' },
      { batchNumber: 'GP-2026-10', expiryDate: '2028-11-14', quantity: 180, location: 'Endo Tray 2' }
    ]
  },
  {
    id: 'mat-paperpoints',
    sku: 'ENDO-PP-04',
    name: 'Endodontic Absorbent Paper Points',
    category: 'Endodontics',
    unit: 'pieces',
    totalStock: 550,
    reorderLevel: 100,
    costPerUnit: 12,
    activeBatches: [
      { batchNumber: 'PP-2026-A2', expiryDate: '2028-04-10', quantity: 550, location: 'Endo Tray 2' }
    ]
  },
  {
    id: 'mat-irrigation',
    sku: 'ENDO-IRR-NAOCL',
    name: 'Irrigation solution (Sodium Hypo 3%)',
    category: 'Endodontics',
    unit: 'ml',
    totalStock: 2500,
    reorderLevel: 500,
    costPerUnit: 2,
    activeBatches: [
      { batchNumber: 'IRR-NC-44', expiryDate: '2027-04-10', quantity: 1500, location: 'Disinfectant Bay' },
      { batchNumber: 'IRR-NC-45', expiryDate: '2027-08-18', quantity: 1000, location: 'Disinfectant Bay' }
    ]
  },
  {
    id: 'mat-edta',
    sku: 'ENDO-EDTA-17',
    name: 'EDTA 17% Canal Lubricating Gel',
    category: 'Endodontics',
    unit: 'ml',
    totalStock: 200,
    reorderLevel: 40,
    costPerUnit: 18,
    activeBatches: [
      { batchNumber: 'ED-2026-E1', expiryDate: '2027-11-30', quantity: 200, location: 'Endo Tray 1' }
    ]
  },
  {
    id: 'mat-sealer',
    sku: 'ENDO-SEAL-AH',
    name: 'Root Canal Sealer (Bioceramic/AH Plus)',
    category: 'Endodontics',
    unit: 'syringes',
    totalStock: 18,
    reorderLevel: 5,
    costPerUnit: 1800,
    activeBatches: [
      { batchNumber: 'SL-2026-S3', expiryDate: '2027-10-15', quantity: 18, location: 'Endo Tray 1' }
    ]
  },
  {
    id: 'mat-rubberdam',
    sku: 'ENDO-DAM-LTX',
    name: 'Dental Dam Latex Sheets & Clamps',
    category: 'Endodontics',
    unit: 'sheets',
    totalStock: 120,
    reorderLevel: 25,
    costPerUnit: 25,
    activeBatches: [
      { batchNumber: 'RD-2026-D1', expiryDate: '2028-09-01', quantity: 120, location: 'Endo Tray 3' }
    ]
  },

  // --- RESTORATIVE & COSMETIC DENTISTRY ---
  {
    id: 'mat-composite',
    sku: 'REST-COMP-A2',
    name: 'Composite Resin (Universal A2 Shade)',
    category: 'Restorative',
    unit: 'cartridges',
    totalStock: 45,
    reorderLevel: 10,
    costPerUnit: 850,
    activeBatches: [
      { batchNumber: 'CR-2026-M4', expiryDate: '2027-12-01', quantity: 45, location: 'Restorative Drawer 1' }
    ]
  },
  {
    id: 'mat-composite-a3',
    sku: 'REST-COMP-A3',
    name: 'Composite Resin (Universal A3 Shade)',
    category: 'Restorative',
    unit: 'cartridges',
    totalStock: 30,
    reorderLevel: 8,
    costPerUnit: 850,
    activeBatches: [
      { batchNumber: 'CR-2026-M5', expiryDate: '2028-01-15', quantity: 30, location: 'Restorative Drawer 1' }
    ]
  },
  {
    id: 'mat-flowable',
    sku: 'REST-FLOW-A2',
    name: 'Flowable Composite Resin Syringe',
    category: 'Restorative',
    unit: 'syringes',
    totalStock: 25,
    reorderLevel: 6,
    costPerUnit: 620,
    activeBatches: [
      { batchNumber: 'FC-2026-F1', expiryDate: '2027-09-22', quantity: 25, location: 'Restorative Drawer 1' }
    ]
  },
  {
    id: 'mat-etchant',
    sku: 'REST-ETCH-37',
    name: 'Dental Etchant Gel (37% Phosphoric)',
    category: 'Restorative',
    unit: 'ml',
    totalStock: 90,
    reorderLevel: 20,
    costPerUnit: 40,
    activeBatches: [
      { batchNumber: 'ET-2026-E8', expiryDate: '2028-06-14', quantity: 90, location: 'Restorative Drawer 2' }
    ]
  },
  {
    id: 'mat-bonding',
    sku: 'REST-BOND-8G',
    name: 'Universal Dental Bonding Adhesive (8th Gen)',
    category: 'Restorative',
    unit: 'ml',
    totalStock: 60,
    reorderLevel: 15,
    costPerUnit: 480,
    activeBatches: [
      { batchNumber: 'BD-2026-B9', expiryDate: '2027-11-05', quantity: 60, location: 'Restorative Drawer 2' }
    ]
  },
  {
    id: 'mat-gic',
    sku: 'REST-GIC-IX',
    name: 'Glass Ionomer Restorative Cement (Type IX)',
    category: 'Restorative',
    unit: 'kits',
    totalStock: 16,
    reorderLevel: 4,
    costPerUnit: 1450,
    activeBatches: [
      { batchNumber: 'GC-2026-G1', expiryDate: '2028-03-18', quantity: 16, location: 'Restorative Drawer 3' }
    ]
  },
  {
    id: 'mat-matrix',
    sku: 'REST-MAT-SEC',
    name: 'Sectional Matrix Bands & Wedges',
    category: 'Restorative',
    unit: 'pieces',
    totalStock: 180,
    reorderLevel: 40,
    costPerUnit: 14,
    activeBatches: [
      { batchNumber: 'MB-2026-S1', expiryDate: '2030-01-01', quantity: 180, location: 'Restorative Drawer 2' }
    ]
  },
  {
    id: 'mat-soflex',
    sku: 'REST-POL-DISC',
    name: 'Sof-Lex Finishing & Polishing Discs',
    category: 'Restorative',
    unit: 'pieces',
    totalStock: 220,
    reorderLevel: 40,
    costPerUnit: 22,
    activeBatches: [
      { batchNumber: 'SL-2026-P2', expiryDate: '2029-08-10', quantity: 220, location: 'Finishing Station' }
    ]
  },

  // --- PROSTHODONTICS & IMPRESSIONS ---
  {
    id: 'mat-alginate',
    sku: 'PROS-ALG-FST',
    name: 'Dust-Free Fast Set Alginate Impression',
    category: 'Prosthodontics',
    unit: 'grams',
    totalStock: 4500,
    reorderLevel: 1000,
    costPerUnit: 0.8,
    activeBatches: [
      { batchNumber: 'AL-2026-A1', expiryDate: '2027-12-31', quantity: 4500, location: 'Lab Shelf 1' }
    ]
  },
  {
    id: 'mat-pvs-putty',
    sku: 'PROS-PVS-PTY',
    name: 'Addition Silicone (PVS Putty Impression)',
    category: 'Prosthodontics',
    unit: 'kits',
    totalStock: 22,
    reorderLevel: 5,
    costPerUnit: 2200,
    activeBatches: [
      { batchNumber: 'PV-2026-K1', expiryDate: '2028-02-14', quantity: 22, location: 'Lab Shelf 2' }
    ]
  },
  {
    id: 'mat-pvs-light',
    sku: 'PROS-PVS-LGT',
    name: 'PVS Light Body Cartridge',
    category: 'Prosthodontics',
    unit: 'cartridges',
    totalStock: 35,
    reorderLevel: 8,
    costPerUnit: 950,
    activeBatches: [
      { batchNumber: 'PL-2026-L2', expiryDate: '2027-10-20', quantity: 35, location: 'Lab Shelf 2' }
    ]
  },
  {
    id: 'mat-luting',
    sku: 'PROS-LUT-RMGI',
    name: 'Resin-Modified Glass Ionomer Luting Cement',
    category: 'Prosthodontics',
    unit: 'kits',
    totalStock: 14,
    reorderLevel: 3,
    costPerUnit: 2100,
    activeBatches: [
      { batchNumber: 'LT-2026-M1', expiryDate: '2028-05-15', quantity: 14, location: 'Lab Shelf 1' }
    ]
  },
  {
    id: 'mat-temp-crown',
    sku: 'PROS-PRO-TEMP',
    name: 'Protemp Bis-Acrylic Temp Crown Material',
    category: 'Prosthodontics',
    unit: 'cartridges',
    totalStock: 18,
    reorderLevel: 4,
    costPerUnit: 2800,
    activeBatches: [
      { batchNumber: 'PT-2026-T1', expiryDate: '2027-09-30', quantity: 18, location: 'Lab Shelf 2' }
    ]
  },
  {
    id: 'mat-retraction',
    sku: 'PROS-RET-CRD',
    name: 'Gingival Retraction Cord #00 + Hemostatic',
    category: 'Prosthodontics',
    unit: 'vials',
    totalStock: 26,
    reorderLevel: 6,
    costPerUnit: 420,
    activeBatches: [
      { batchNumber: 'RC-2026-R3', expiryDate: '2028-07-10', quantity: 26, location: 'Prostho Drawer 1' }
    ]
  },
  {
    id: 'mat-art-paper',
    sku: 'PROS-ART-PPR',
    name: 'Articulating Paper 200µ (Blue/Red)',
    category: 'Prosthodontics',
    unit: 'sheets',
    totalStock: 300,
    reorderLevel: 50,
    costPerUnit: 4,
    activeBatches: [
      { batchNumber: 'AP-2026-01', expiryDate: '2030-12-31', quantity: 300, location: 'Prostho Drawer 1' }
    ]
  },

  // --- ORAL SURGERY & ANESTHETICS ---
  {
    id: 'mat-anesthetic',
    sku: 'ANES-LIG-2',
    name: 'Dental Anesthetic (Lignocaine 2% + 1:80k Adr)',
    category: 'Anesthetics',
    unit: 'cartridges',
    totalStock: 220,
    reorderLevel: 40,
    costPerUnit: 85,
    activeBatches: [
      { batchNumber: 'LA-2026-K8', expiryDate: '2027-09-12', quantity: 220, location: 'Cold Storage / Safe' }
    ]
  },
  {
    id: 'mat-articaine',
    sku: 'ANES-ART-4',
    name: 'Articaine 4% + 1:100k Adr (Septanest)',
    category: 'Anesthetics',
    unit: 'cartridges',
    totalStock: 140,
    reorderLevel: 30,
    costPerUnit: 110,
    activeBatches: [
      { batchNumber: 'SA-2026-A1', expiryDate: '2027-11-20', quantity: 140, location: 'Cold Storage / Safe' }
    ]
  },
  {
    id: 'mat-needles',
    sku: 'SURG-NDL-30G',
    name: 'Dental Disposable Needles (30G Short / 27G Long)',
    category: 'Surgical',
    unit: 'pieces',
    totalStock: 450,
    reorderLevel: 80,
    costPerUnit: 8,
    activeBatches: [
      { batchNumber: 'ND-2026-N2', expiryDate: '2028-12-30', quantity: 450, location: 'Surgery Shelf 1' }
    ]
  },
  {
    id: 'mat-gauze',
    sku: 'SURG-GAUZ-STR',
    name: 'Surgical Gauze Sponges (2x2 Sterile)',
    category: 'Surgical',
    unit: 'pieces',
    totalStock: 600,
    reorderLevel: 100,
    costPerUnit: 5,
    activeBatches: [
      { batchNumber: 'GZ-2026-03', expiryDate: '2028-08-30', quantity: 600, location: 'Surgery Shelf 1' }
    ]
  },
  {
    id: 'mat-suture-silk',
    sku: 'SURG-SUT-SLK',
    name: 'Black Braided Silk Sutures 3-0 (Reverse Cut)',
    category: 'Surgical',
    unit: 'packs',
    totalStock: 50,
    reorderLevel: 10,
    costPerUnit: 95,
    activeBatches: [
      { batchNumber: 'SK-2026-S1', expiryDate: '2028-09-15', quantity: 50, location: 'Surgery Shelf 2' }
    ]
  },
  {
    id: 'mat-suture-vicryl',
    sku: 'SURG-SUT-VIC',
    name: 'Resorbable Vicryl Sutures 4-0',
    category: 'Surgical',
    unit: 'packs',
    totalStock: 28,
    reorderLevel: 8,
    costPerUnit: 240,
    activeBatches: [
      { batchNumber: 'VC-2026-V2', expiryDate: '2027-12-05', quantity: 28, location: 'Surgery Shelf 2' }
    ]
  },
  {
    id: 'mat-blades',
    sku: 'SURG-BLD-15',
    name: 'Surgical Scalpel Blades #15',
    category: 'Surgical',
    unit: 'pieces',
    totalStock: 110,
    reorderLevel: 25,
    costPerUnit: 18,
    activeBatches: [
      { batchNumber: 'BL-2026-B1', expiryDate: '2029-07-20', quantity: 110, location: 'Surgery Shelf 2' }
    ]
  },
  {
    id: 'mat-gelfoam',
    sku: 'SURG-HEM-GEL',
    name: 'Hemostatic Gelatin Sponges (Abgel/Gelfoam)',
    category: 'Surgical',
    unit: 'pieces',
    totalStock: 40,
    reorderLevel: 10,
    costPerUnit: 65,
    activeBatches: [
      { batchNumber: 'GF-2026-G4', expiryDate: '2028-04-18', quantity: 40, location: 'Surgery Shelf 2' }
    ]
  },
  {
    id: 'mat-bonegraft',
    sku: 'SURG-BONE-DBM',
    name: 'Demineralized Bone Matrix Particulate (0.5cc)',
    category: 'Surgical',
    unit: 'vials',
    totalStock: 12,
    reorderLevel: 3,
    costPerUnit: 3400,
    activeBatches: [
      { batchNumber: 'BG-2026-M1', expiryDate: '2027-06-30', quantity: 12, location: 'Regenerative Safe' }
    ]
  },

  // --- PREVENTIVE, HYGIENE & PEDIATRIC ---
  {
    id: 'mat-prophy',
    sku: 'PREV-PRO-PST',
    name: 'Prophy Paste & Cup (Fluoride Polish)',
    category: 'Preventive',
    unit: 'cups',
    totalStock: 220,
    reorderLevel: 40,
    costPerUnit: 35,
    activeBatches: [
      { batchNumber: 'PP-2026-V1', expiryDate: '2028-03-25', quantity: 220, location: 'Hygiene Station' }
    ]
  },
  {
    id: 'mat-prophy-brush',
    sku: 'PREV-POL-BRSH',
    name: 'Disposable Prophy Polishing Brushes',
    category: 'Preventive',
    unit: 'pieces',
    totalStock: 180,
    reorderLevel: 35,
    costPerUnit: 16,
    activeBatches: [
      { batchNumber: 'PB-2026-B2', expiryDate: '2029-02-10', quantity: 180, location: 'Hygiene Station' }
    ]
  },
  {
    id: 'mat-fluoride-varnish',
    sku: 'PREV-FLUR-VRN',
    name: '5% Sodium Fluoride Varnish Unit-Dose',
    category: 'Preventive',
    unit: 'packs',
    totalStock: 85,
    reorderLevel: 20,
    costPerUnit: 80,
    activeBatches: [
      { batchNumber: 'FV-2026-F1', expiryDate: '2027-10-14', quantity: 85, location: 'Hygiene Station' }
    ]
  },
  {
    id: 'mat-pit-sealant',
    sku: 'PREV-PIT-SEAL',
    name: 'Pit & Fissure Sealant with Fluoride',
    category: 'Preventive',
    unit: 'syringes',
    totalStock: 15,
    reorderLevel: 5,
    costPerUnit: 750,
    activeBatches: [
      { batchNumber: 'PS-2026-P1', expiryDate: '2028-01-20', quantity: 15, location: 'Hygiene Station' }
    ]
  },

  // --- ORTHODONTICS ---
  {
    id: 'mat-ortho-ties',
    sku: 'ORTH-ELAS-TIE',
    name: 'Orthodontic Elastomeric Ligature Ties',
    category: 'Orthodontics',
    unit: 'packs',
    totalStock: 120,
    reorderLevel: 25,
    costPerUnit: 45,
    activeBatches: [
      { batchNumber: 'ET-2026-O1', expiryDate: '2029-05-10', quantity: 120, location: 'Ortho Station' }
    ]
  },
  {
    id: 'mat-ortho-wire',
    sku: 'ORTH-NITI-WIR',
    name: 'NiTi Superelastic Archwires (.016 & .018)',
    category: 'Orthodontics',
    unit: 'packs',
    totalStock: 60,
    reorderLevel: 15,
    costPerUnit: 120,
    activeBatches: [
      { batchNumber: 'NW-2026-W1', expiryDate: '2030-01-01', quantity: 60, location: 'Ortho Station' }
    ]
  },
  {
    id: 'mat-bracket-glue',
    sku: 'ORTH-ADHS-TRN',
    name: 'Transbond XT Orthodontic Bracket Adhesive',
    category: 'Orthodontics',
    unit: 'syringes',
    totalStock: 14,
    reorderLevel: 4,
    costPerUnit: 1950,
    activeBatches: [
      { batchNumber: 'TB-2026-T2', expiryDate: '2027-12-18', quantity: 14, location: 'Ortho Station' }
    ]
  }
]

// 2. Comprehensive Clinic Procedure Templates
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
      { itemId: 'mat-gloves', name: 'Dental Examination Gloves (Nitrile)', suggestedQty: 2, unit: 'pairs', isMandatory: true },
      { itemId: 'mat-anesthetic', name: 'Dental Anesthetic (Lignocaine 2% + 1:80k Adr)', suggestedQty: 2, unit: 'cartridges', isMandatory: true },
      { itemId: 'mat-needles', name: 'Dental Disposable Needles (30G Short / 27G Long)', suggestedQty: 1, unit: 'pieces', isMandatory: true },
      { itemId: 'mat-gauze', name: 'Surgical Gauze Sponges (2x2 Sterile)', suggestedQty: 4, unit: 'pieces', isMandatory: true },
      { itemId: 'mat-cotton', name: 'Cotton Pellets (#2 Sterile)', suggestedQty: 4, unit: 'pieces', isMandatory: false }
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
      { itemId: 'mat-gloves', name: 'Dental Examination Gloves (Nitrile)', suggestedQty: 2, unit: 'pairs', isMandatory: true },
      { itemId: 'mat-prophy', name: 'Prophy Paste & Cup (Fluoride Polish)', suggestedQty: 1, unit: 'cups', isMandatory: true },
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
      { itemId: 'mat-gloves', name: 'Dental Examination Gloves (Nitrile)', suggestedQty: 2, unit: 'pairs', isMandatory: true },
      { itemId: 'mat-composite', name: 'Composite Resin (Universal A2 Shade)', suggestedQty: 1, unit: 'cartridges', isMandatory: true },
      { itemId: 'mat-etchant', name: 'Dental Etchant Gel (37% Phosphoric)', suggestedQty: 1, unit: 'ml', isMandatory: true },
      { itemId: 'mat-bonding', name: 'Universal Dental Bonding Adhesive (8th Gen)', suggestedQty: 1, unit: 'ml', isMandatory: true },
      { itemId: 'mat-matrix', name: 'Sectional Matrix Bands & Wedges', suggestedQty: 1, unit: 'pieces', isMandatory: true },
      { itemId: 'mat-soflex', name: 'Sof-Lex Finishing & Polishing Discs', suggestedQty: 2, unit: 'pieces', isMandatory: false }
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
      { itemId: 'mat-gloves', name: 'Dental Examination Gloves (Nitrile)', suggestedQty: 2, unit: 'pairs', isMandatory: true },
      { itemId: 'mat-anesthetic', name: 'Dental Anesthetic (Lignocaine 2% + 1:80k Adr)', suggestedQty: 2, unit: 'cartridges', isMandatory: true },
      { itemId: 'mat-retraction', name: 'Gingival Retraction Cord #00 + Hemostatic', suggestedQty: 1, unit: 'vials', isMandatory: true },
      { itemId: 'mat-pvs-putty', name: 'Addition Silicone (PVS Putty Impression)', suggestedQty: 1, unit: 'kits', isMandatory: true },
      { itemId: 'mat-pvs-light', name: 'PVS Light Body Cartridge', suggestedQty: 1, unit: 'cartridges', isMandatory: true },
      { itemId: 'mat-temp-crown', name: 'Protemp Bis-Acrylic Temp Crown Material', suggestedQty: 1, unit: 'cartridges', isMandatory: true },
      { itemId: 'mat-art-paper', name: 'Articulating Paper 200µ (Blue/Red)', suggestedQty: 2, unit: 'sheets', isMandatory: false }
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
      { itemId: 'mat-gloves', name: 'Dental Examination Gloves (Nitrile)', suggestedQty: 2, unit: 'pairs', isMandatory: true },
      { itemId: 'mat-etchant', name: 'Dental Etchant Gel (37% Phosphoric)', suggestedQty: 1, unit: 'ml', isMandatory: true },
      { itemId: 'mat-bracket-glue', name: 'Transbond XT Orthodontic Bracket Adhesive', suggestedQty: 1, unit: 'syringes', isMandatory: true },
      { itemId: 'mat-ortho-wire', name: 'NiTi Superelastic Archwires (.016 & .018)', suggestedQty: 1, unit: 'packs', isMandatory: true },
      { itemId: 'mat-ortho-ties', name: 'Orthodontic Elastomeric Ligature Ties', suggestedQty: 2, unit: 'packs', isMandatory: true }
    ]
  }
]

// 3. Initial Doctor Adaptive Preferences (Doctor A vs Doctor B vs Doctor C file usage)
export const INITIAL_DOCTOR_PREFERENCES: DoctorAdaptivePreference[] = [
  // Doctor A (Dr. Arun Kumar) -> 1 set of dental files
  {
    doctorId: 'doc-1',
    doctorName: 'Dr. Arun Kumar',
    procedureId: 'trt-root-canal',
    itemId: 'mat-files',
    suggestedQty: 1,
    confidence: 96,
    sampleSize: 18,
    standardQty: 1,
    historicalAverage: 1.05,
    clinicalNotes: 'Uses standard single rotary set sequence per procedure.'
  },
  // Doctor B (Dr. Priya Nair - Endodontist) -> 2 sets of dental files
  {
    doctorId: 'doc-2',
    doctorName: 'Dr. Priya Nair',
    procedureId: 'trt-root-canal',
    itemId: 'mat-files',
    suggestedQty: 2,
    confidence: 94,
    sampleSize: 26,
    standardQty: 1,
    historicalAverage: 2.1,
    clinicalNotes: 'Endodontics specialist routine: utilizes 1 shaping rotary set plus 1 manual finishing file set.'
  },
  {
    doctorId: 'doc-2',
    doctorName: 'Dr. Priya Nair',
    procedureId: 'trt-root-canal',
    itemId: 'mat-guttapercha',
    suggestedQty: 4,
    confidence: 89,
    sampleSize: 26,
    standardQty: 3,
    historicalAverage: 3.8,
    clinicalNotes: 'Frequently performs multi-rooted molar obturations requiring 4 cones.'
  },
  // Doctor C (Dr. Tariq Antoun - Oral Surgeon) -> 1 set of files
  {
    doctorId: 'doc-3',
    doctorName: 'Dr. Tariq Antoun',
    procedureId: 'trt-root-canal',
    itemId: 'mat-files',
    suggestedQty: 1,
    confidence: 90,
    sampleSize: 12,
    standardQty: 1,
    historicalAverage: 1.0,
    clinicalNotes: 'Standard endodontic rotary usage.'
  },
  // Doctor C (Dr. Tariq Antoun) for Extractions: uses 3 anesthetic cartridges vs 2 standard
  {
    doctorId: 'doc-3',
    doctorName: 'Dr. Tariq Antoun',
    procedureId: 'trt-extraction',
    itemId: 'mat-anesthetic',
    suggestedQty: 3,
    confidence: 95,
    sampleSize: 34,
    standardQty: 2,
    historicalAverage: 2.9,
    clinicalNotes: 'Maxillofacial specialist handling impacted and dense mandibular molars with supplemental nerve blocks.'
  }
]

// 4. Initial Deduction Audit Records
export const INITIAL_DEDUCTION_AUDIT: ConfirmedMaterialDeduction[] = [
  {
    id: 'AUD-INV-8801',
    appointmentId: 'apt-001',
    patientId: 'pt-1001',
    patientName: 'Meera Nambiar',
    doctorId: 'doc-2',
    doctorName: 'Dr. Priya Nair',
    procedureId: 'trt-root-canal',
    procedureName: 'Root Canal Treatment',
    modeUsed: 'doctor-specific',
    timestamp: '2026-11-01T14:30:00Z',
    materials: [
      { itemId: 'mat-gloves', name: 'Dental Examination Gloves (Nitrile)', unit: 'pairs', suggestedQty: 2, confirmedQty: 2, wastageQty: 0, batchNumber: 'GLV-2026-B1', deductedTotal: 2 },
      { itemId: 'mat-guttapercha', name: 'Gutta-percha (0.04 Taper Cones)', unit: 'cones', suggestedQty: 4, confirmedQty: 4, wastageQty: 1, batchNumber: 'GP-2026-09', deductedTotal: 5 },
      { itemId: 'mat-irrigation', name: 'Irrigation solution (Sodium Hypo 3%)', unit: 'ml', suggestedQty: 5, confirmedQty: 6, wastageQty: 0, batchNumber: 'IRR-NC-44', deductedTotal: 6 },
      { itemId: 'mat-files', name: 'Dental files (Rotary NiTi Protaper)', unit: 'set', suggestedQty: 2, confirmedQty: 2, wastageQty: 0, batchNumber: 'DF-2026-X1', deductedTotal: 2 },
      { itemId: 'mat-cotton', name: 'Cotton Pellets (#2 Sterile)', unit: 'pieces', suggestedQty: 5, confirmedQty: 4, wastageQty: 0, batchNumber: 'COT-2026-01', deductedTotal: 4 }
    ],
    notes: 'Severe canal calcification on #46. Added 1 extra gutta-percha cone due to accessory canal.',
    confirmedBy: 'Dr. Priya Nair'
  },
  {
    id: 'AUD-INV-8802',
    appointmentId: 'apt-004',
    patientId: 'pt-1002',
    patientName: 'Rajesh Varma',
    doctorId: 'doc-1',
    doctorName: 'Dr. Arun Kumar',
    procedureId: 'trt-root-canal',
    procedureName: 'Root Canal Treatment',
    modeUsed: 'standard',
    timestamp: '2026-10-30T11:15:00Z',
    materials: [
      { itemId: 'mat-gloves', name: 'Dental Examination Gloves (Nitrile)', unit: 'pairs', suggestedQty: 2, confirmedQty: 2, wastageQty: 0, batchNumber: 'GLV-2026-B1', deductedTotal: 2 },
      { itemId: 'mat-guttapercha', name: 'Gutta-percha (0.04 Taper Cones)', unit: 'cones', suggestedQty: 3, confirmedQty: 3, wastageQty: 0, batchNumber: 'GP-2026-09', deductedTotal: 3 },
      { itemId: 'mat-irrigation', name: 'Irrigation solution (Sodium Hypo 3%)', unit: 'ml', suggestedQty: 5, confirmedQty: 5, wastageQty: 0, batchNumber: 'IRR-NC-44', deductedTotal: 5 },
      { itemId: 'mat-files', name: 'Dental files (Rotary NiTi Protaper)', unit: 'set', suggestedQty: 1, confirmedQty: 1, wastageQty: 0, batchNumber: 'DF-2026-X1', deductedTotal: 1 },
      { itemId: 'mat-cotton', name: 'Cotton Pellets (#2 Sterile)', unit: 'pieces', suggestedQty: 5, confirmedQty: 5, wastageQty: 0, batchNumber: 'COT-2026-01', deductedTotal: 5 }
    ],
    notes: 'Straightforward anterior canal. Default quantities matched actual usage.',
    confirmedBy: 'Dr. Arun Kumar'
  }
]

// In-memory state with localStorage sync
let state: AdaptiveInventoryState = loadFromStorage<AdaptiveInventoryState>(STORAGE_KEY, {
  suggestionMode: 'doctor-specific',
  items: INITIAL_INVENTORY_ITEMS,
  templates: INITIAL_TREATMENT_TEMPLATES,
  doctorPreferences: INITIAL_DOCTOR_PREFERENCES,
  consumptionHistory: [],
  deductionAuditLog: INITIAL_DEDUCTION_AUDIT
})

// Auto-seed comprehensive items if prior cache was smaller
if (!state.items || state.items.length < INITIAL_INVENTORY_ITEMS.length) {
  state = {
    ...state,
    items: INITIAL_INVENTORY_ITEMS,
    templates: INITIAL_TREATMENT_TEMPLATES
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

  if (mode === 'manual') {
    return {
      modeUsed: 'manual',
      materials: []
    }
  }

  const materials = template.materials.map((tmplItem) => {
    const stockItem = state.items.find((i) => i.id === tmplItem.itemId)
    const availableStock = stockItem ? stockItem.totalStock : 0
    const suggestedBatch = stockItem && stockItem.activeBatches.length > 0 ? stockItem.activeBatches[0] : null

    let suggestedQty = tmplItem.suggestedQty
    let isAdaptiveOverride = false
    let confidence: number | undefined
    let sampleSize: number | undefined
    let notes: string | undefined

    if (mode === 'doctor-specific' && doctorId) {
      const pref = state.doctorPreferences.find(
        (p) => p.doctorId === doctorId && p.procedureId === procedureId && p.itemId === tmplItem.itemId
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
      itemId: tmplItem.itemId,
      name: tmplItem.name,
      unit: tmplItem.unit,
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
 * Doctor/Assistant Confirms Actual Material Consumption.
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

  // 1. Deduct Stock
  const updatedItems = state.items.map((item) => {
    const consumedList = payload.items.filter((c) => c.itemId === item.id)
    if (consumedList.length === 0) return item

    let itemTotalDeduction = 0
    const updatedBatches = item.activeBatches.map((batch) => {
      const batchDeductions = consumedList.filter((c) => c.batchNumber === batch.batchNumber)
      const batchDeductionTotal = batchDeductions.reduce((sum, c) => sum + (c.confirmedQty + c.wastageQty), 0)
      itemTotalDeduction += batchDeductionTotal

      return {
        ...batch,
        quantity: Math.max(0, batch.quantity - batchDeductionTotal)
      }
    })

    return {
      ...item,
      totalStock: Math.max(0, item.totalStock - itemTotalDeduction),
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
  return auditRecord
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
}

/**
 * Adjust stock quantity for a specific batch
 */
export function adjustBatchQuantity(itemId: string, batchNumber: string, deltaOrExact: { delta?: number; exact?: number }) {
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
}

/**
 * Reset all inventory state to defaults (for interactive testing/demo)
 */
export function resetAdaptiveInventory() {
  state = {
    suggestionMode: 'doctor-specific',
    items: INITIAL_INVENTORY_ITEMS,
    templates: INITIAL_TREATMENT_TEMPLATES,
    doctorPreferences: INITIAL_DOCTOR_PREFERENCES,
    consumptionHistory: [],
    deductionAuditLog: INITIAL_DEDUCTION_AUDIT
  }
  emitChange()
}
