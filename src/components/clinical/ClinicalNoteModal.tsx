import { useClinicalCatalogue } from '../../services/clinicalCatalogue';
import { canClinic } from '../../services/permissions';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Save,
  Clock,
  ShieldAlert,
  Loader2,
  ChevronDown,
  Search,
  ArrowLeft,
  Check,
  BookOpen,
  Sparkles,
  Plus,
  User,
  MessageCircle,
} from 'lucide-react';
import {
  useClinicData,
  ClinicalNoteRecord,
  addClinicalNote,
  updateClinicalNote,
  finalizeClinicalNote,
  DENTAL_TREATMENTS,
} from '../../services/clinicStore';
import { useBillingData } from '../../services/billingStore';
import { getCurrentUser } from '../../services/authService';
import { PostTreatmentInstructionsModal } from './PostTreatmentInstructionsModal';
import '../../pages/clinical/clinicalNotes.css';

export interface SearchableSelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  hasError?: boolean;
  ariaLabel?: string;
  onOpenChange?: (open: boolean) => void;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  hasError = false,
  ariaLabel,
  onOpenChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onOpenChange?.(isOpen);
  }, [isOpen, onOpenChange]);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!isTyping || !searchQuery.trim()) return options;
    const q = searchQuery.trim().toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, isTyping, searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsTyping(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
    setIsTyping(false);
    setSearchQuery('');
  };

  const inputValue = isTyping
    ? searchQuery
    : selectedOption
      ? selectedOption.label
      : '';

  return (
    <div
      ref={containerRef}
      className={`cn-searchable-select ${isOpen ? 'is-open' : ''} ${disabled ? 'is-disabled' : ''}`}
    >
      <div className="cn-searchable-select-input-wrap">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-label={ariaLabel}
          disabled={disabled}
          placeholder={selectedOption ? selectedOption.label : placeholder || 'Search or select...'}
          value={inputValue}
          onFocus={() => {
            if (disabled) return;
            setIsOpen(true);
            setTimeout(() => {
              inputRef.current?.select();
            }, 0);
          }}
          onClick={() => {
            if (disabled) return;
            if (!isOpen) setIsOpen(true);
            setTimeout(() => {
              inputRef.current?.select();
            }, 0);
          }}
          onChange={(e) => {
            setIsTyping(true);
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsOpen(false);
              setIsTyping(false);
              setSearchQuery('');
              inputRef.current?.blur();
            } else if (e.key === 'Enter') {
              e.preventDefault();
              if (filteredOptions.length > 0) {
                handleSelect(filteredOptions[0].value);
                inputRef.current?.blur();
              }
            } else if (e.key === 'ArrowDown' && !isOpen) {
              setIsOpen(true);
            }
          }}
          className={`cn-searchable-select-input ${hasError ? 'has-error' : ''}`}
        />
        <div
          className="cn-searchable-select-arrow"
          onClick={(e) => {
            e.stopPropagation();
            if (disabled) return;
            setIsOpen((prev) => !prev);
            inputRef.current?.focus();
          }}
          title="Toggle options"
        >
          <ChevronDown size={16} />
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="cn-searchable-select-menu" role="menu">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="menuitem"
                  className={`cn-searchable-select-item ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => handleSelect(opt.value)}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check size={14} className="cn-searchable-select-check" />}
                </button>
              );
            })
          ) : (
            <div className="cn-searchable-select-empty">No matches found</div>
          )}
        </div>
      )}
    </div>
  );
};

interface ClinicalNoteModalProps {
  initialNote?: ClinicalNoteRecord | null;
  defaultPatientId?: string;
  onClose: () => void;
  onSaved: (note: ClinicalNoteRecord) => void;
  isPage?: boolean;
}

export interface DentalProcedureOption {
  id: string;
  name: string;
  category: string;
  code?: string;
  fee?: number | string;
}

export const MASTER_PROCEDURE_CATALOGUE: DentalProcedureOption[] = [
  // Diagnostic
  { id: 'proc-d0120', code: 'D0120', name: 'Periodic Oral Evaluation', category: 'Diagnostic' },
  { id: 'proc-d0150', code: 'D0150', name: 'Comprehensive Oral Examination', category: 'Diagnostic' },
  { id: 'proc-d0210', code: 'D0210', name: 'Complete Intraoral Radiograph Series', category: 'Diagnostic' },
  { id: 'proc-d0220', code: 'D0220', name: 'Intraoral Periapical X-Ray (IOPA)', category: 'Diagnostic' },
  { id: 'proc-d0330', code: 'D0330', name: 'Panoramic Radiographic Image (OPG)', category: 'Diagnostic' },

  // Preventive
  { id: 'proc-d1110', code: 'D1110', name: 'Ultrasonic Scaling & Polishing (Prophylaxis)', category: 'Preventive' },
  { id: 'proc-d1206', code: 'D1206', name: 'Topical Fluoride Varnish Application', category: 'Preventive' },
  { id: 'proc-d1351', code: 'D1351', name: 'Pit & Fissure Sealant Application', category: 'Preventive' },
  { id: 'proc-d4341', code: 'D4341', name: 'Periodontal Root Planing & Deep Curettage', category: 'Preventive' },

  // Restorative
  { id: 'proc-d2330', code: 'D2330', name: 'Composite Dental Restoration (1 Surface)', category: 'Restorative' },
  { id: 'proc-d2331', code: 'D2331', name: 'Composite Dental Restoration (2 Surfaces)', category: 'Restorative' },
  { id: 'proc-d2332', code: 'D2332', name: 'Composite Dental Restoration (3+ Surfaces)', category: 'Restorative' },
  { id: 'proc-d2140', code: 'D2140', name: 'Amalgam Dental Restoration', category: 'Restorative' },
  { id: 'proc-d2950', code: 'D2950', name: 'Post & Core Buildup', category: 'Restorative' },
  { id: 'proc-d2920', code: 'D2920', name: 'Recementation of Crown / Inlay / Onlay', category: 'Restorative' },

  // Endodontics
  { id: 'proc-d3220', code: 'D3220', name: 'Emergency Pulpectomy & Access Opening', category: 'Endodontics' },
  { id: 'proc-d3310', code: 'D3310', name: 'Root Canal Treatment - Anterior Tooth', category: 'Endodontics' },
  { id: 'proc-d3320', code: 'D3320', name: 'Root Canal Treatment - Premolar Tooth', category: 'Endodontics' },
  { id: 'proc-d3330', code: 'D3330', name: 'Root Canal Treatment - Molar Tooth', category: 'Endodontics' },
  { id: 'proc-d3346', code: 'D3346', name: 'Retreatment of Previous Root Canal', category: 'Endodontics' },
  { id: 'proc-d3410', code: 'D3410', name: 'Apicoectomy & Periradicular Surgery', category: 'Endodontics' },

  // Prosthodontics
  { id: 'proc-d2740', code: 'D2740', name: 'Crown - All-Ceramic / Zirconia Monolithic', category: 'Prosthodontics' },
  { id: 'proc-d2750', code: 'D2750', name: 'Crown - Porcelain Fused to Metal (PFM)', category: 'Prosthodontics' },
  { id: 'proc-d2790', code: 'D2790', name: 'Crown - Full Cast Metal / Gold Alloy', category: 'Prosthodontics' },
  { id: 'proc-d2962', code: 'D2962', name: 'Porcelain Laminate Veneer / E-Max', category: 'Prosthodontics' },
  { id: 'proc-d6240', code: 'D6240', name: 'Fixed Partial Denture (Bridge) Unit', category: 'Prosthodontics' },
  { id: 'proc-d5110', code: 'D5110', name: 'Complete Denture (Maxillary / Mandibular)', category: 'Prosthodontics' },
  { id: 'proc-d5213', code: 'D5213', name: 'Cast Partial Denture (Removable)', category: 'Prosthodontics' },

  // Oral Surgery
  { id: 'proc-d7140', code: 'D7140', name: 'Tooth Extraction (Simple / Erupted)', category: 'Oral Surgery' },
  { id: 'proc-d7210', code: 'D7210', name: 'Surgical Extraction / Flap Elevation', category: 'Oral Surgery' },
  { id: 'proc-d7240', code: 'D7240', name: 'Surgical Removal of Impacted Third Molar', category: 'Oral Surgery' },
  { id: 'proc-d7280', code: 'D7280', name: 'Surgical Exposure of Impacted Tooth', category: 'Oral Surgery' },
  { id: 'proc-d7510', code: 'D7510', name: 'Incision & Drainage of Abscess (Intraoral)', category: 'Oral Surgery' },
  { id: 'proc-d7960', code: 'D7960', name: 'Frenectomy (Labial / Lingual)', category: 'Oral Surgery' },

  // Orthodontics
  { id: 'proc-d8080', code: 'D8080', name: 'Comprehensive Orthodontic Appliance Bonding', category: 'Orthodontics' },
  { id: 'proc-d8670', code: 'D8670', name: 'Periodic Orthodontic Wire & Bracket Adjustment', category: 'Orthodontics' },
  { id: 'proc-d8999', code: 'D8999', name: 'Clear Aligner Scan, 3D Assessment & Delivery', category: 'Orthodontics' },
  { id: 'proc-d8680', code: 'D8680', name: 'Orthodontic Retainer Delivery & Adjustment', category: 'Orthodontics' },

  // Implantology
  { id: 'proc-d6010', code: 'D6010', name: 'Surgical Placement of Dental Implant Fixture', category: 'Implantology' },
  { id: 'proc-d6056', code: 'D6056', name: 'Prefabricated / Custom Implant Abutment', category: 'Implantology' },
  { id: 'proc-d6058', code: 'D6058', name: 'Implant-Supported Ceramic Crown', category: 'Implantology' },
  { id: 'proc-d7953', code: 'D7953', name: 'Bone Grafting / Ridge Preservation', category: 'Implantology' },

  // Pediatric & Cosmetic & Emergency
  { id: 'proc-d1352', code: 'D1352', name: 'Pediatric Fluoride & Preventive Sealant', category: 'Pediatric' },
  { id: 'proc-d2930', code: 'D2930', name: 'Stainless Steel Crown (Pediatric)', category: 'Pediatric' },
  { id: 'proc-d9972', code: 'D9972', name: 'Laser In-Office Teeth Whitening', category: 'Cosmetic' },
  { id: 'proc-d9110', code: 'D9110', name: 'Emergency Palliative Pain Relief Treatment', category: 'Emergency' },
];

const CONSULTATION_TYPES = [
  { value: 'ROUTINE_CHECKUP', label: 'Routine Checkup / Consultation' },
  { value: 'INITIAL_VISIT', label: 'Initial Comprehensive Examination' },
  { value: 'FOLLOW_UP', label: 'Follow-up / Review' },
  { value: 'EMERGENCY', label: 'Emergency / Acute Pain Relief' },
  { value: 'OTHER', label: 'Other Procedure Consultation' },
];

export const COMMON_CHIEF_COMPLAINTS = [
  'Severe throbbing tooth pain',
  'Sensitivity to cold and hot liquids',
  'Pain on chewing or biting',
  'Swelling in the gums / jaw',
  'Broken or chipped tooth',
  'Bleeding gums while brushing',
  'Loose tooth / mobility',
  'Routine dental check-up & cleaning',
  'Food lodgement between teeth',
  'Aesthetic concern / discolored tooth',
  'Wisdom tooth pain / discomfort',
];

export const COMMON_DENTAL_DIAGNOSES = [
  'Symptomatic Irreversible Pulpitis',
  'Asymptomatic Irreversible Pulpitis',
  'Reversible Pulpitis',
  'Symptomatic Apical Periodontitis',
  'Asymptomatic Apical Periodontitis',
  'Acute Apical Abscess',
  'Chronic Apical Abscess',
  'Dental Caries (Enamel / Dentin)',
  'Recurrent / Secondary Caries',
  'Chronic Generalized Gingivitis',
  'Chronic Periodontitis (Stage I-IV)',
  'Aggressive Periodontitis',
  'Impacted Third Molar (Wisdom Tooth)',
  'Pericoronitis',
  'Cracked Tooth Syndrome',
  'Enamel Fracture / Crown Fracture',
  'Tooth Wear / Attrition / Abrasion / Erosion',
  'Dentin Hypersensitivity',
  'Peri-implantitis / Peri-implant Mucositis',
  'Malocclusion / Crowding',
  'Temporomandibular Joint Disorder (TMD)',
];

export const PROCEDURE_MATERIAL_PRESETS: Record<string, string[]> = {
  endodontics: [
    '2% Lignocaine (1:80000 Adrenaline)',
    'Rubber Dam Kit',
    'Endo-Z Access Bur',
    'K-Files (#10, #15)',
    'ProTaper Gold Rotary Files',
    'NaOCl 3% Irrigation',
    '17% EDTA Solution',
    'Paper Points',
    'Gutta-Percha Cones',
    'AH Plus Sealer',
    'Cavit Temporary Seal',
  ],
  surgery: [
    '2% Lignocaine with Adrenaline',
    'Surgical Blade #15',
    'Periosteal Elevator',
    'Coupland Elevator',
    'Extraction Forceps',
    'Surgical Curette',
    'Sterile Saline 0.9%',
    '3-0 Silk Suture',
    'GelSpon Sponge',
    'Sterile Gauze Packs',
  ],
  restorative: [
    '2% Lignocaine',
    'Rubber Dam Isolation',
    'Diamond Prep Bur',
    '37% Etchant Gel',
    'Bonding Adhesive',
    'Composite Resin (Shade A2/A3)',
    'Matrix Band & Wedge',
    'LED Curing Light',
    'Polishing Discs',
    'Articulating Paper',
  ],
  prosthodontics: [
    '2% Lignocaine',
    'Chamfer / Shoulder Bur',
    'Retraction Cord (#00)',
    'Hemostatic Gel',
    'PVS Impression Material',
    'Protemp Material',
    'Temp-Bond Cement',
    'Resin Luting Cement / GIC',
    'Articulating Paper',
  ],
  preventive: [
    'Ultrasonic Scaler Tip',
    'Gracey Curettes',
    'Chlorhexidine 0.2% Rinse',
    'Prophy Paste & Brush',
    'Fluoride Varnish (5% NaF)',
    'Pit & Fissure Sealant',
    'Saliva Ejector',
  ],
  implantology: [
    'Sterile Surgical Handpiece',
    'Sterile Saline 0.9%',
    'Dental Implant Fixture',
    'Cover Screw / Healing Cap',
    'Osteotomy Drill Kit',
    'Torque Wrench',
    'Bio-Oss Bone Graft',
    'Collagen Resorbable Membrane',
    '4-0 Vicryl Suture',
  ],
  orthodontics: [
    'Etchant Gel & Ortho Primer',
    'Transbond XT Adhesive',
    'Orthodontic Brackets',
    'NiTi Archwire',
    'Elastomeric Ligature Ties',
    'Distal End Cutter',
    'Aligner Template Resin',
  ],
  pediatric: [
    'Cotton Rolls & Dry Angles',
    'Prophy Paste & Cup',
    'Fluoride Varnish (5% NaF)',
    'Pit & Fissure Sealant',
    'Formocresol / MTA',
    'Stainless Steel Crown',
    'GIC Luting Cement',
  ],
  cosmetic: [
    'Gingival Barrier Resin',
    '35% Hydrogen Peroxide Bleach Gel',
    'Cheek Retractor & Lip Guard',
    'LED Light Activator',
    'Desensitizing Gel',
    'Vitamin E Swabs',
  ],
  emergency: [
    '2% Lignocaine with Adrenaline',
    'Cotton Pellets & Rolls',
    'Eugenol Pellet',
    'Cavit Temporary Seal',
    'Zinc Oxide Eugenol (ZOE)',
    'Sterile Gauze Pack',
  ],
  default: [
    'Mouth Mirror & Explorer Probe',
    'Periodontal Probe',
    'Cotton Rolls & Gauze',
    'High-Volume Suction Tip',
    'Articulating Paper',
  ],
};

export function getRecommendedMaterials(procedureName?: string): string[] {
  if (!procedureName || !procedureName.trim()) {
    return PROCEDURE_MATERIAL_PRESETS.default;
  }
  const lower = procedureName.toLowerCase();

  if (
    lower.includes('root canal') ||
    lower.includes('rct') ||
    lower.includes('pulpectomy') ||
    lower.includes('pulpotomy') ||
    lower.includes('endodontic') ||
    lower.includes('apicoectomy') ||
    lower.includes('d32') ||
    lower.includes('d33') ||
    lower.includes('d34')
  ) {
    return PROCEDURE_MATERIAL_PRESETS.endodontics;
  }

  if (
    lower.includes('extract') ||
    lower.includes('surgical') ||
    lower.includes('wisdom') ||
    lower.includes('third molar') ||
    lower.includes('impaction') ||
    lower.includes('frenectomy') ||
    lower.includes('incision') ||
    lower.includes('drainage') ||
    lower.includes('biopsy') ||
    lower.includes('d71') ||
    lower.includes('d72') ||
    lower.includes('d75') ||
    lower.includes('d79')
  ) {
    return PROCEDURE_MATERIAL_PRESETS.surgery;
  }

  if (
    lower.includes('composite') ||
    lower.includes('restoration') ||
    lower.includes('filling') ||
    lower.includes('amalgam') ||
    lower.includes('post & core') ||
    lower.includes('buildup') ||
    lower.includes('cavity') ||
    lower.includes('d23') ||
    lower.includes('d21') ||
    lower.includes('d295')
  ) {
    return PROCEDURE_MATERIAL_PRESETS.restorative;
  }

  if (
    lower.includes('crown') ||
    lower.includes('bridge') ||
    lower.includes('veneer') ||
    lower.includes('inlay') ||
    lower.includes('onlay') ||
    lower.includes('denture') ||
    lower.includes('prostho') ||
    lower.includes('d27') ||
    lower.includes('d62') ||
    lower.includes('d51') ||
    lower.includes('d52')
  ) {
    return PROCEDURE_MATERIAL_PRESETS.prosthodontics;
  }

  if (
    lower.includes('implant') ||
    lower.includes('bone graft') ||
    lower.includes('ridge preservation') ||
    lower.includes('sinus lift') ||
    lower.includes('d60') ||
    lower.includes('d7953')
  ) {
    return PROCEDURE_MATERIAL_PRESETS.implantology;
  }

  if (
    lower.includes('ortho') ||
    lower.includes('bracket') ||
    lower.includes('aligner') ||
    lower.includes('wire') ||
    lower.includes('braces') ||
    lower.includes('retainer') ||
    lower.includes('d80') ||
    lower.includes('d86') ||
    lower.includes('d89')
  ) {
    return PROCEDURE_MATERIAL_PRESETS.orthodontics;
  }

  if (
    lower.includes('pediatric') ||
    lower.includes('sealant') ||
    lower.includes('stainless steel crown') ||
    lower.includes('space maintainer') ||
    lower.includes('d135') ||
    lower.includes('d293')
  ) {
    return PROCEDURE_MATERIAL_PRESETS.pediatric;
  }

  if (
    lower.includes('scaling') ||
    lower.includes('polishing') ||
    lower.includes('prophylaxis') ||
    lower.includes('cleaning') ||
    lower.includes('root planing') ||
    lower.includes('curettage') ||
    lower.includes('fluoride') ||
    lower.includes('d11') ||
    lower.includes('d12') ||
    lower.includes('d43')
  ) {
    return PROCEDURE_MATERIAL_PRESETS.preventive;
  }

  if (
    lower.includes('whitening') ||
    lower.includes('bleach') ||
    lower.includes('cosmetic') ||
    lower.includes('d997')
  ) {
    return PROCEDURE_MATERIAL_PRESETS.cosmetic;
  }

  if (
    lower.includes('emergency') ||
    lower.includes('palliative') ||
    lower.includes('pain relief') ||
    lower.includes('d911')
  ) {
    return PROCEDURE_MATERIAL_PRESETS.emergency;
  }

  return PROCEDURE_MATERIAL_PRESETS.default;
}

export const ClinicalNoteModal: React.FC<ClinicalNoteModalProps> = ({
  initialNote,
  defaultPatientId,
  onClose,
  onSaved,
  isPage = false,
}) => {
  const { patients = [] } = useClinicData();
  const currentUser = getCurrentUser();

  // Selected patient
  const [selectedPatientId, setSelectedPatientId] = useState<string>(() => {
    if (initialNote?.patientId) return initialNote.patientId;
    if (initialNote?.patient?.id) return initialNote.patient?.id;
    if (defaultPatientId) {
      const match = patients.find(
        (p) =>
          p.id.toLowerCase() === defaultPatientId.toLowerCase() ||
          (p.backendId && p.backendId.toLowerCase() === defaultPatientId.toLowerCase())
      );
      if (match) return match.backendId || match.id;
      return defaultPatientId;
    }
    return patients[0]?.backendId || patients[0]?.id || '';
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const activePatient = useMemo(() => {
    return patients.find(
      (p) =>
        p.id.toLowerCase() === selectedPatientId.toLowerCase() ||
        (p.backendId && p.backendId.toLowerCase() === selectedPatientId.toLowerCase())
    );
  }, [patients, selectedPatientId]);

  // Section 1: Consultation Info
  const [consultationDate, setConsultationDate] = useState<string>(
    initialNote?.consultationDate
      ? initialNote.consultationDate.slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );
  const [consultationType, setConsultationType] = useState<string>(
    initialNote?.consultationType || 'ROUTINE_CHECKUP'
  );

  // Section 2: Chief Complaint
  const [chiefComplaint, setChiefComplaint] = useState<string>(
    initialNote?.chiefComplaint || initialNote?.complaint || ''
  );

  // Section 3: Symptoms & History
  const [symptoms, setSymptoms] = useState<string>(initialNote?.symptoms || '');
  const [symptomDuration, setSymptomDuration] = useState<string>(
    initialNote?.symptomDuration || ''
  );
  const [painSeverity, setPainSeverity] = useState<number>(
    typeof initialNote?.painSeverity === 'number' ? initialNote.painSeverity : 0
  );
  const [historyNotes, setHistoryNotes] = useState<string>(
    initialNote?.historyNotes || ''
  );

  // Section 4: Clinical Examination
  const [extraoralFindings, setExtraoralFindings] = useState<string>(
    initialNote?.extraoralFindings || ''
  );
  const [intraoralFindings, setIntraoralFindings] = useState<string>(
    initialNote?.intraoralFindings || ''
  );
  const [toothSpecificFindings, setToothSpecificFindings] = useState<string>(
    initialNote?.toothSpecificFindings || ''
  );
  const [periodontalFindings, setPeriodontalFindings] = useState<string>(
    initialNote?.periodontalFindings || ''
  );
  const [examinationNotes, setExaminationNotes] = useState<string>(
    initialNote?.examinationNotes || initialNote?.findings || ''
  );

  // Section 5: Diagnosis
  const [primaryDiagnosis, setPrimaryDiagnosis] = useState<string>(
    initialNote?.primaryDiagnosis || ''
  );
  const [diagnosisNotes, setDiagnosisNotes] = useState<string>(
    initialNote?.diagnosisNotes || ''
  );

  // Section 6: Treatment Performed
  const [treatmentPerformed, setTreatmentPerformed] = useState<string>(
    initialNote?.treatmentPerformed || ''
  );
  const [treatmentToothNumber, setTreatmentToothNumber] = useState<string>(
    initialNote?.treatmentToothNumber || ''
  );
  const [treatmentDescription, setTreatmentDescription] = useState<string>(
    initialNote?.treatmentDescription || ''
  );
  const [materialsUsed, setMaterialsUsed] = useState<string>(
    initialNote?.materialsUsed || ''
  );
  const [showOtherMaterialInput, setShowOtherMaterialInput] = useState(false);
  const [otherMaterialText, setOtherMaterialText] = useState('');
  const otherMaterialInputRef = useRef<HTMLInputElement>(null);
  const [treatmentOutcome, setTreatmentOutcome] = useState<string>(
    initialNote?.treatmentOutcome || ''
  );

  // Section 7: Treatment Recommendations
  const [treatmentRecommendations, setTreatmentRecommendations] = useState<string>(
    initialNote?.treatmentRecommendations || initialNote?.plan || ''
  );
  const [referralNotes, setReferralNotes] = useState<string>(
    initialNote?.referralNotes || ''
  );

  // Section 8: Follow-up & Advice
  const [followUpRequired, setFollowUpRequired] = useState<boolean>(
    Boolean(initialNote?.followUpRequired)
  );
  const [followUpDate, setFollowUpDate] = useState<string>(
    initialNote?.followUpDate ? initialNote.followUpDate.slice(0, 10) : ''
  );
  const [followUpInstructions, setFollowUpInstructions] = useState<string>(
    initialNote?.followUpInstructions || ''
  );
  const [patientAdvice, setPatientAdvice] = useState<string>(
    initialNote?.patientAdvice || ''
  );

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmFinalizeOpen, setConfirmFinalizeOpen] = useState(false);
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false);
  const [consultTypeDropdownOpen, setConsultTypeDropdownOpen] = useState(false);
  const isConsultationSectionActive = patientDropdownOpen || consultTypeDropdownOpen;

  // Master procedure autocomplete / combobox state
  const { services: billingServices = [] } = useBillingData();
  const [isProcedureDropdownOpen, setIsProcedureDropdownOpen] = useState(false);
  const [procedureSearchQuery, setProcedureSearchQuery] = useState(initialNote?.treatmentPerformed || '');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('ALL');
  const procedureDropdownRef = useRef<HTMLDivElement>(null);

  // Dedicated Procedure Catalogue Full Selector Screen state
  const [isProcedureCatalogueOpen, setIsProcedureCatalogueOpen] = useState(false);
  const [catalogueSearchQuery, setCatalogueSearchQuery] = useState('');
  const [catalogueSelectedCategory, setCatalogueSelectedCategory] = useState('ALL');
  const [catalogueSelectedProc, setCatalogueSelectedProc] = useState<DentalProcedureOption | null>(null);

  // Post-treatment aftercare modal state
  const [showAftercareModal, setShowAftercareModal] = useState(false);

  const currentNoteForAftercare: ClinicalNoteRecord = useMemo(() => {
    return {
      id: initialNote?.id || 'new-consultation',
      noteNumber: initialNote?.noteNumber || 'CN-NEW',
      patientId: selectedPatientId,
      doctorId: currentUser?.id || 'doc-1',
      doctorName: currentUser?.name || 'Attending Doctor',
      visitDate: consultationDate ? consultationDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
      consultationDate: consultationDate || new Date().toISOString(),
      consultationType: consultationType as any,
      complaint: chiefComplaint,
      chiefComplaint: chiefComplaint,
      findings: '',
      plan: '',
      primaryDiagnosis,
      treatmentPerformed,
      treatmentToothNumber,
      treatmentDescription,
      patientAdvice,
      followUpRequired,
      followUpDate: followUpRequired && followUpDate ? new Date(followUpDate).toISOString() : undefined,
      followUpInstructions,
      status: initialNote?.isFinalized ? 'FINALIZED' : 'DRAFT',
      createdAt: new Date().toISOString(),
      patient: activePatient,
    } as ClinicalNoteRecord;
  }, [
    initialNote,
    selectedPatientId,
    currentUser,
    consultationDate,
    consultationType,
    chiefComplaint,
    primaryDiagnosis,
    treatmentPerformed,
    treatmentToothNumber,
    treatmentDescription,
    patientAdvice,
    followUpRequired,
    followUpDate,
    followUpInstructions,
    activePatient,
  ]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        procedureDropdownRef.current &&
        !procedureDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProcedureDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Searchable select options for Patient and Consultation Type
  const patientOptions: SearchableSelectOption[] = useMemo(() => {
    const list = patients.map((p) => ({
      value: p.backendId || p.id,
      label: `${p.firstName} ${p.lastName}`,
    }));
    if (
      selectedPatientId &&
      !list.some(
        (o) =>
          o.value === selectedPatientId ||
          o.value.toLowerCase() === selectedPatientId.toLowerCase()
      )
    ) {
      list.unshift({
        value: selectedPatientId,
        label: activePatient
          ? `${activePatient.firstName} ${activePatient.lastName}`
          : selectedPatientId,
      });
    }
    return list;
  }, [patients, selectedPatientId, activePatient]);

  const consultationTypeOptions: SearchableSelectOption[] = useMemo(() => {
    return CONSULTATION_TYPES.map((t) => ({
      value: t.value,
      label: t.label,
    }));
  }, []);

  // Merged procedures catalogue
  const { customProcedures, customDiagnoses, customTemplates } = useClinicalCatalogue();
  const allProcedures = useMemo(() => {
    const map = new Map<string, DentalProcedureOption>();

    // 1. Master ADA / CDT catalogue
    MASTER_PROCEDURE_CATALOGUE.forEach((p) => {
      map.set(p.name.toLowerCase().trim(), p);
    });

    // 2. Predefined treatments from clinicStore
    if (Array.isArray(DENTAL_TREATMENTS)) {
      DENTAL_TREATMENTS.forEach((t) => {
        const key = t.name.toLowerCase().trim();
        if (!map.has(key)) {
          map.set(key, {
            id: t.id,
            name: t.name,
            category: t.category,
            fee: t.standardFee,
          });
        }
      });
    }

    // 3. Clinic billing tariffs
    if (Array.isArray(billingServices)) {
      billingServices
        .filter((s: any) => s.active !== false)
        .forEach((s: any) => {
          const key = s.name.toLowerCase().trim();
          if (!map.has(key)) {
            map.set(key, {
              id: s.id,
              name: s.name,
              category: s.category || 'General',
              fee: s.offerPrice || s.price,
            });
          }
        });
    }

    customProcedures.forEach(p => { if (p.name) map.set(p.name.toLowerCase().trim(), { id: p.id, name: p.name, code: p.code, category: p.category || 'General', fee: Number(String(p.fee || '0').replace(/[₹,\s]/g, '')) }); });
    return Array.from(map.values());
  }, [billingServices, customProcedures]);

  const procedureCategories = useMemo(() => {
    const cats = Array.from(new Set(allProcedures.map((p) => p.category))).sort();
    return ['ALL', ...cats];
  }, [allProcedures]);

  const filteredProcedures = useMemo(() => {
    const q = procedureSearchQuery.trim().toLowerCase();
    return allProcedures.filter((proc) => {
      if (activeCategoryFilter !== 'ALL' && proc.category !== activeCategoryFilter) {
        return false;
      }
      if (!q) return true;
      return (
        proc.name.toLowerCase().includes(q) ||
        (proc.code && proc.code.toLowerCase().includes(q)) ||
        proc.category.toLowerCase().includes(q)
      );
    });
  }, [allProcedures, procedureSearchQuery, activeCategoryFilter]);

  const handleSelectProcedure = (proc: DentalProcedureOption) => {
    setTreatmentPerformed(proc.name);
    setProcedureSearchQuery(proc.name);
    setIsProcedureDropdownOpen(false);
    if (!materialsUsed.trim()) {
      const recs = getRecommendedMaterials(proc.name);
      setMaterialsUsed(recs.join(', '));
    }
  };

  // Catalogue full-screen selector logic
  const handleOpenProcedureCatalogue = () => {
    const currentVal = treatmentPerformed || '';
    setCatalogueSearchQuery('');
    setCatalogueSelectedCategory('ALL');
    const matched = allProcedures.find(
      (p) => p.name.toLowerCase().trim() === currentVal.toLowerCase().trim()
    );
    setCatalogueSelectedProc(matched || allProcedures[0] || null);
    setIsProcedureCatalogueOpen(true);
    setIsProcedureDropdownOpen(false);
  };

  const catalogueFilteredProcedures = useMemo(() => {
    const q = catalogueSearchQuery.trim().toLowerCase();
    return allProcedures.filter((proc) => {
      if (catalogueSelectedCategory !== 'ALL' && proc.category !== catalogueSelectedCategory) {
        return false;
      }
      if (!q) return true;
      return (
        proc.name.toLowerCase().includes(q) ||
        (proc.code && proc.code.toLowerCase().includes(q)) ||
        proc.category.toLowerCase().includes(q)
      );
    });
  }, [allProcedures, catalogueSearchQuery, catalogueSelectedCategory]);

  // Synchronize selection when filtering catalogue
  useEffect(() => {
    if (!isProcedureCatalogueOpen) return;
    if (catalogueFilteredProcedures.length > 0) {
      const isStillInList = catalogueFilteredProcedures.some(
        (p) => p.name.toLowerCase() === catalogueSelectedProc?.name.toLowerCase()
      );
      if (!isStillInList) {
        setCatalogueSelectedProc(catalogueFilteredProcedures[0]);
      }
    } else {
      setCatalogueSelectedProc(null);
    }
  }, [catalogueSearchQuery, catalogueSelectedCategory, catalogueFilteredProcedures, isProcedureCatalogueOpen]);

  const handleSaveProcedureFromCatalogue = (
    procToSave?: DentalProcedureOption | { name: string; category?: string; id?: string; fee?: number } | null
  ) => {
    let target: DentalProcedureOption | { name: string; category?: string; id?: string; fee?: number } | null = null;

    if (procToSave !== undefined && procToSave !== null) {
      target = procToSave;
    } else if (
      catalogueSelectedProc &&
      catalogueFilteredProcedures.some((p) => p.name.toLowerCase() === catalogueSelectedProc.name.toLowerCase())
    ) {
      target = catalogueSelectedProc;
    } else if (catalogueFilteredProcedures.length > 0) {
      target = catalogueFilteredProcedures[0];
    } else if (catalogueSearchQuery.trim()) {
      target = { name: catalogueSearchQuery.trim(), category: 'General', id: 'custom' };
    } else if (catalogueSelectedProc) {
      target = catalogueSelectedProc;
    } else if (allProcedures.length > 0) {
      target = allProcedures[0];
    }

    if (target && target.name) {
      setTreatmentPerformed(target.name);
      setProcedureSearchQuery(target.name);
      if (!materialsUsed.trim()) {
        const recs = getRecommendedMaterials(target.name);
        setMaterialsUsed(recs.join(', '));
      }
    }
    setIsProcedureCatalogueOpen(false);
  };

  // Dynamic procedure materials helpers
  const recommendedMaterials = useMemo(() => {
    return getRecommendedMaterials(treatmentPerformed);
  }, [treatmentPerformed]);

  const currentMaterialsList = useMemo(() => {
    if (!materialsUsed) return [];
    return materialsUsed
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
  }, [materialsUsed]);

  const isMaterialActive = (mat: string) => {
    const norm = mat.trim().toLowerCase();
    return currentMaterialsList.some((item) => item.trim().toLowerCase() === norm);
  };

  const handleToggleMaterial = (mat: string) => {
    const norm = mat.trim().toLowerCase();
    const exists = currentMaterialsList.some((item) => item.trim().toLowerCase() === norm);

    if (exists) {
      const updated = currentMaterialsList.filter((item) => item.trim().toLowerCase() !== norm);
      setMaterialsUsed(updated.join(', '));
    } else {
      const updated = [...currentMaterialsList, mat.trim()];
      setMaterialsUsed(updated.join(', '));
    }
  };

  const handleAutoFillMaterials = () => {
    const recs = getRecommendedMaterials(treatmentPerformed);
    setMaterialsUsed(recs.join(', '));
  };

  const handleAddOtherMaterial = () => {
    const trimmed = otherMaterialText.trim();
    if (!trimmed) return;
    const norm = trimmed.toLowerCase();
    if (!currentMaterialsList.some((item) => item.trim().toLowerCase() === norm)) {
      const updated = [...currentMaterialsList, trimmed];
      setMaterialsUsed(updated.join(', '));
    }
    setOtherMaterialText('');
    setShowOtherMaterialInput(false);
  };

  const customMaterialsList = useMemo(() => {
    const recLower = new Set(recommendedMaterials.map((m) => m.trim().toLowerCase()));
    return currentMaterialsList.filter((m) => !recLower.has(m.trim().toLowerCase()));
  }, [currentMaterialsList, recommendedMaterials]);

  // Safety alerts
  const safetyAlerts = useMemo(() => {
    if (!activePatient) return [];
    const alerts: string[] = [];
    if (activePatient.allergies === 'yes' && activePatient.allergiesDetails) {
      alerts.push(`Allergies: ${activePatient.allergiesDetails}`);
    }
    if (activePatient.conditions === 'yes' && activePatient.conditionsDetails) {
      alerts.push(`Medical Conditions: ${activePatient.conditionsDetails}`);
    }
    if (activePatient.medications === 'yes' && activePatient.medicationsDetails) {
      alerts.push(`Current Medications: ${activePatient.medicationsDetails}`);
    }
    if (Array.isArray((activePatient as any).medicalSafetyAlerts)) {
      alerts.push(...(activePatient as any).medicalSafetyAlerts);
    }
    return Array.from(new Set(alerts));
  }, [activePatient]);

  const handleFillSampleData = () => {
    // Pre-select patient if none selected yet
    if (!selectedPatientId && patients.length > 0) {
      setSelectedPatientId(patients[0].backendId || patients[0].id);
    }
    setConsultationType('TREATMENT');
    setChiefComplaint('Severe throbbing pain in lower right posterior quadrant (Tooth #46), sensitive to hot and cold, pain keeps patient awake at night.');
    setSymptoms('Spontaneous throbbing pain, localized to lower right posterior region, aggravated by mastication and thermal stimuli.');
    setSymptomDuration('4 days');
    setPainSeverity(8);
    setHistoryNotes('Patient reports history of deep restoration placed 2 years ago. No known drug allergies. Medically non-contributory.');
    setExtraoralFindings('No facial asymmetry, TMJ movements smooth and pain-free, submandibular lymph nodes non-palpable.');
    setIntraoralFindings('Deep disto-occlusal caries on tooth #46 with marginal breakdown. Marked tenderness on vertical percussion (+). Palpation negative.');
    setToothSpecificFindings('Tooth #46: Occlusal-distal cavitation. Cold test: exaggerated lingering response (>15s). Mobility: Grade 0.');
    setPeriodontalFindings('Probing depths 2-3mm circumferentially. Mild localized marginal gingival inflammation.');
    setExaminationNotes('IOPA radiograph confirms coronal radiolucency extending into the pulp chamber with slight periapical ligament widening at distal apex.');
    setPrimaryDiagnosis('Symptomatic Irreversible Pulpitis with Symptomatic Apical Periodontitis - Tooth #46');
    setDiagnosisNotes('Confirmed via radiographic periapical radiolucency, lingering thermal test, and positive percussion.');
    setTreatmentPerformed('Root Canal Treatment - Molar (D3330)');
    setProcedureSearchQuery('Root Canal Treatment - Molar (D3330)');
    setTreatmentToothNumber('Tooth 46 (Lower Right 1st Molar)');
    setTreatmentDescription('Informed consent obtained. Local anesthesia administered: 1.8 mL 2% Lignocaine with 1:80,000 adrenaline via IANB. Complete rubber dam isolation achieved. Carious dentin excavated, endodontic access cavity prepared. Located 4 canal orifices (MB, ML, DB, Distal). Coronal pulp extirpated. Working lengths measured with apex locator and confirmed on RVG (MB: 20.5mm, ML: 20.5mm, DB: 21.0mm, Distal: 21.5mm). Biomechanical preparation completed with ProTaper Gold rotary files up to F2 under continuous 3% NaOCl and 17% EDTA irrigation. Canals dried with sterile paper points. Calcium hydroxide (Calcipex) intracanal medicament placed. Cavit temporary seal placed. Occlusion relieved.');
    setMaterialsUsed('Lignocaine 2% with Adrenaline 1:80000, Rubber Dam Kit, Endo-Z bur, ProTaper Gold Rotary Files, NaOCl 3%, EDTA 17%, Calcipex Ca(OH)2, Cavit Temporary');
    setTreatmentOutcome('Patient tolerated the procedure well. Immediate pain relief achieved, temporary restoration intact, discharged in stable condition.');
    setTreatmentRecommendations('Visit 2: Canal obturation with gutta-percha & bioceramic sealer, followed by composite core build-up and ceramic crown.');
    setReferralNotes('No external specialist referral needed.');
    setFollowUpRequired(true);
    const recall = new Date();
    recall.setDate(recall.getDate() + 7);
    setFollowUpDate(recall.toISOString().slice(0, 10));
    setFollowUpInstructions('Tab. Amoxicillin 500mg TID x 5 days, Tab. Ibuprofen 400mg + Paracetamol 325mg SOS for pain after meals.');
    setPatientAdvice('Avoid biting on hard or crunchy foods with the right side. Mild soreness is normal for 24-48 hours. Maintain gentle oral hygiene around tooth 46. Contact clinic immediately if severe swelling occurs.');
    setValidationErrors({});
  };

  const handleOpenFinalizeConfirm = () => {
    setError(null);
    const errors: Record<string, string> = {};

    if (!selectedPatientId) {
      errors.patient = 'Please select a patient.';
    }
    if (!consultationDate) {
      errors.consultationDate = 'Consultation date is required.';
    }
    if (!chiefComplaint.trim()) {
      errors.chiefComplaint = 'Chief Complaint is required to finalize note.';
    }
    if (!primaryDiagnosis.trim()) {
      errors.primaryDiagnosis = 'Primary Diagnosis is required to finalize note.';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      if (errors.chiefComplaint) {
        setError('Chief Complaint is required before finalizing.');
        const el = document.getElementById('cn-input-chief-complaint');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus();
        }
      } else if (errors.primaryDiagnosis) {
        setError('Primary Diagnosis is required before finalizing.');
        const el = document.getElementById('cn-input-primary-diagnosis');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.focus();
        }
      } else {
        setError(Object.values(errors)[0]);
      }
      return;
    }

    setValidationErrors({});
    setConfirmFinalizeOpen(true);
  };

  const handleSubmit = async (shouldFinalize: boolean) => {
    setError(null);
    const errors: Record<string, string> = {};

    if (!selectedPatientId) {
      errors.patient = 'Please select a patient.';
    }
    if (!consultationDate) {
      errors.consultationDate = 'Consultation date is required.';
    }
    if (!chiefComplaint.trim()) {
      errors.chiefComplaint = 'Chief Complaint is required.';
    }
    if (shouldFinalize && !primaryDiagnosis.trim()) {
      errors.primaryDiagnosis = 'Primary Diagnosis is required.';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      const msg = errors.chiefComplaint || errors.primaryDiagnosis || Object.values(errors)[0];
      setError(msg);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        patientId: activePatient?.backendId || selectedPatientId,
        doctorId: currentUser?.id || initialNote?.doctorId || undefined,
        doctorName: currentUser?.name || initialNote?.doctorName || undefined,
        consultationDate: consultationDate ? new Date(consultationDate).toISOString() : new Date().toISOString(),
        consultationType,
        chiefComplaint: chiefComplaint.trim(),
        symptoms: symptoms.trim() || undefined,
        symptomDuration: symptomDuration.trim() || undefined,
        painSeverity,
        historyNotes: historyNotes.trim() || undefined,
        extraoralFindings: extraoralFindings.trim() || undefined,
        intraoralFindings: intraoralFindings.trim() || undefined,
        toothSpecificFindings: toothSpecificFindings.trim() || undefined,
        periodontalFindings: periodontalFindings.trim() || undefined,
        examinationNotes: examinationNotes.trim() || undefined,
        primaryDiagnosis: primaryDiagnosis.trim(),
        diagnosisNotes: diagnosisNotes.trim() || undefined,
        treatmentPerformed: treatmentPerformed.trim() || undefined,
        treatmentToothNumber: treatmentToothNumber.trim() || undefined,
        treatmentDescription: treatmentDescription.trim() || undefined,
        materialsUsed: materialsUsed.trim() || undefined,
        treatmentOutcome: treatmentOutcome.trim() || undefined,
        treatmentRecommendations: treatmentRecommendations.trim() || undefined,
        referralNotes: referralNotes.trim() || undefined,
        followUpRequired,
        followUpDate: followUpRequired && followUpDate ? new Date(followUpDate).toISOString() : undefined,
        followUpInstructions: followUpInstructions.trim() || undefined,
        patientAdvice: patientAdvice.trim() || undefined,
        isFinalized: shouldFinalize,
      };

      let saved: ClinicalNoteRecord;

      if (initialNote?.id) {
        // Update existing note
        saved = await updateClinicalNote(initialNote.id, payload);
        if (shouldFinalize) {
          saved = await finalizeClinicalNote(initialNote.id);
        }
      } else {
        // Create new clinical note
        saved = await addClinicalNote(payload);
      }

      setConfirmFinalizeOpen(false);
      onSaved(saved);
      onClose();
    } catch (err: any) {
      console.error('Failed to save clinical note:', err);
      const msg =
        err?.message ||
        err?.response?.data?.message ||
        'Failed to save clinical note. Ensure doctor privileges.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  };

  const formContent = (
    <>
      {error && (
        <div className="cn-safety-banner cn-safety-banner-error">
          <AlertTriangle />
          <span>{error}</span>
        </div>
      )}

      {/* Section 1: Consultation Details */}
      <section
        className={`cn-form-section cn-form-section-consultation ${isConsultationSectionActive ? 'is-dropdown-active' : ''}`}
        style={{ zIndex: isConsultationSectionActive ? 120 : undefined }}
      >
        <h3 className="cn-form-section-title">
          <Clock /> 1. Consultation Information
        </h3>
        <div className="cn-form-grid-3">
          <div className="cn-form-group">
            <label className="cn-label cn-label-required">Patient</label>
            <SearchableSelect
              value={selectedPatientId}
              onChange={(newPatientId) => {
                setSelectedPatientId(newPatientId);
                if (validationErrors.patient) {
                  setValidationErrors((prev) => {
                    const next = { ...prev };
                    delete next.patient;
                    return next;
                  });
                }
              }}
              options={patientOptions}
              placeholder="Search or select patient..."
              disabled={Boolean(defaultPatientId) || Boolean(initialNote) || Boolean(initialNote?.isFinalized)}
              hasError={Boolean(validationErrors.patient)}
              ariaLabel="Patient"
              onOpenChange={setPatientDropdownOpen}
            />
            {validationErrors.patient && (
              <div className="cn-field-error">{validationErrors.patient}</div>
            )}
          </div>

          <div className="cn-form-group">
            <label className="cn-label cn-label-required">Consultation Date</label>
            <input
              type="date"
              value={consultationDate}
              onChange={(e) => {
                setConsultationDate(e.target.value);
                if (validationErrors.consultationDate) {
                  setValidationErrors((prev) => {
                    const next = { ...prev };
                    delete next.consultationDate;
                    return next;
                  });
                }
              }}
              className={`cn-input ${validationErrors.consultationDate ? 'cn-input-error' : ''}`}
            />
            {validationErrors.consultationDate && (
              <div className="cn-field-error">{validationErrors.consultationDate}</div>
            )}
          </div>

          <div className="cn-form-group">
            <label className="cn-label">Consultation Type</label>
            <SearchableSelect
              value={consultationType}
              onChange={(newType) => setConsultationType(newType)}
              options={consultationTypeOptions}
              placeholder="Search or select consultation type..."
              disabled={Boolean(initialNote?.isFinalized)}
              ariaLabel="Consultation Type"
              onOpenChange={setConsultTypeDropdownOpen}
            />
          </div>
        </div>
      </section>

      {/* Section 2: Chief Complaint */}
      <section className="cn-form-section">
        <h3 className="cn-form-section-title">
          <FileText /> 2. Chief Complaint
        </h3>
        <div className="cn-form-group">
          <label htmlFor="cn-input-chief-complaint" className="cn-label cn-label-required">
            Patient's Primary Concern / Reason for Visit
          </label>
          <input
            id="cn-input-chief-complaint"
            type="text"
            list="cn-chief-complaint-suggestions"
            aria-label="Patient's Primary Concern / Reason for Visit"
            value={chiefComplaint}
            onChange={(e) => {
              setChiefComplaint(e.target.value);
              if (validationErrors.chiefComplaint) {
                setValidationErrors((prev) => {
                  const next = { ...prev };
                  delete next.chiefComplaint;
                  return next;
                });
              }
            }}
            className={`cn-input ${validationErrors.chiefComplaint ? 'cn-input-error' : ''}`}
            required
          />
          <datalist id="cn-chief-complaint-suggestions">
            {COMMON_CHIEF_COMPLAINTS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          {validationErrors.chiefComplaint && (
            <div className="cn-field-error">{validationErrors.chiefComplaint}</div>
          )}
        </div>
      </section>

      {/* Section 3: Symptoms & Dental History */}
      <section className="cn-form-section">
        <h3 className="cn-form-section-title">
          <AlertTriangle /> 3. Symptoms & History
        </h3>
        <div className="cn-form-grid-2">
          <div className="cn-form-group">
            <label className="cn-label">Symptoms</label>
            <textarea
              rows={2}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              className="cn-textarea"
            />
          </div>

          <div className="cn-form-group">
            <label className="cn-label">Duration of Symptoms</label>
            <textarea
              rows={2}
              value={symptomDuration}
              onChange={(e) => setSymptomDuration(e.target.value)}
              className="cn-textarea"
            />
          </div>
        </div>

        {/* Pain Severity Scale (0 to 10) */}
        <div className="cn-pain-scale">
          <label className="cn-label">
            Pain Severity Rating (0 = No Pain, 10 = Severe Unbearable Pain) — Selected: {painSeverity}/10
          </label>
          <div className="cn-pain-buttons">
            {Array.from({ length: 11 }, (_, i) => {
              let selClass = '';
              if (painSeverity === i) {
                if (i === 0) selClass = 'cn-pain-btn-selected-0';
                else if (i <= 3) selClass = 'cn-pain-btn-selected-mild';
                else if (i <= 6) selClass = 'cn-pain-btn-selected-mod';
                else selClass = 'cn-pain-btn-selected-sev';
              }
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPainSeverity(i)}
                  className={`cn-pain-btn ${selClass}`}
                >
                  {i}
                </button>
              );
            })}
          </div>
          <div className="cn-pain-caption">
            <span>0: None</span>
            <span>1-3: Mild</span>
            <span>4-6: Moderate</span>
            <span>7-10: Severe</span>
          </div>
        </div>

        <div className="cn-form-group" style={{ marginTop: '6px' }}>
          <label className="cn-label">Medical & Dental History Notes</label>
          <input
            type="text"
            value={historyNotes}
            onChange={(e) => setHistoryNotes(e.target.value)}
            className="cn-input"
          />
        </div>
      </section>

      {/* Section 4: Clinical Examination */}
      <section className="cn-form-section">
        <h3 className="cn-form-section-title">
          <FileText /> 4. Clinical Examination Findings
        </h3>
        <div className="cn-form-grid-2">
          <div className="cn-form-group">
            <label className="cn-label">Extraoral Examination</label>
            <textarea
              rows={2}
              value={extraoralFindings}
              onChange={(e) => setExtraoralFindings(e.target.value)}
              className="cn-textarea"
            />
          </div>

          <div className="cn-form-group">
            <label className="cn-label">Intraoral Examination</label>
            <textarea
              rows={2}
              value={intraoralFindings}
              onChange={(e) => setIntraoralFindings(e.target.value)}
              className="cn-textarea"
            />
          </div>
        </div>

        <div className="cn-form-grid-2">
          <div className="cn-form-group">
            <label className="cn-label">Tooth-Specific Findings</label>
            <textarea
              rows={2}
              value={toothSpecificFindings}
              onChange={(e) => setToothSpecificFindings(e.target.value)}
              className="cn-textarea"
            />
          </div>

          <div className="cn-form-group">
            <label className="cn-label">Periodontal Evaluation</label>
            <textarea
              rows={2}
              value={periodontalFindings}
              onChange={(e) => setPeriodontalFindings(e.target.value)}
              className="cn-textarea"
            />
          </div>
        </div>

        <div className="cn-form-group">
          <label className="cn-label">General Examination Summary</label>
          <textarea
            rows={2}
            value={examinationNotes}
            onChange={(e) => setExaminationNotes(e.target.value)}
            className="cn-textarea"
          />
        </div>
      </section>

      {/* Section 5: Diagnosis */}
      <section className="cn-form-section">
        <h3 className="cn-form-section-title">
          <CheckCircle2 /> 5. Clinical Diagnosis
        </h3>
        <div className="cn-form-grid-2">
          <div className="cn-form-group">
            <label htmlFor="cn-input-primary-diagnosis" className="cn-label cn-label-required">Primary Diagnosis</label>
            <input
              id="cn-input-primary-diagnosis"
              type="text"
              list="cn-diagnosis-suggestions"
              aria-label="Primary Diagnosis"
              value={primaryDiagnosis}
              onChange={(e) => {
                setPrimaryDiagnosis(e.target.value);
                if (validationErrors.primaryDiagnosis) {
                  setValidationErrors((prev) => {
                    const next = { ...prev };
                    delete next.primaryDiagnosis;
                    return next;
                  });
                }
              }}
              className={`cn-input ${validationErrors.primaryDiagnosis ? 'cn-input-error' : ''}`}
              required
            />
            {customTemplates.length > 0 && <label>Clinic note template <select aria-label="Clinic note template" defaultValue="" onChange={e => {
              const template = customTemplates.find(t => t.id === e.target.value);
              if (template && window.confirm('Replace the current complaint, findings and plan with this template?')) {
                setChiefComplaint(template.complaint || ''); setExaminationNotes(template.findings || ''); setTreatmentRecommendations(template.plan || '');
              }
            }}><option value="">Choose a template</option>{customTemplates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>}
            <datalist id="cn-diagnosis-suggestions">
              {[...new Set([...COMMON_DENTAL_DIAGNOSES, ...customDiagnoses.map(d => d.name || '').filter(Boolean)])].map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
            {validationErrors.primaryDiagnosis && (
              <div className="cn-field-error">{validationErrors.primaryDiagnosis}</div>
            )}
          </div>

          <div className="cn-form-group">
            <label className="cn-label">Diagnostic Notes / Differentials</label>
            <input
              type="text"
              value={diagnosisNotes}
              onChange={(e) => setDiagnosisNotes(e.target.value)}
              className="cn-input"
            />
          </div>
        </div>
      </section>

      {/* Section 6: Treatment Performed */}
      <section className="cn-form-section">
        <h3 className="cn-form-section-title">
          <Save /> 6. Treatment Performed (Today's Procedure)
        </h3>
        <div className="cn-form-grid-2">
          <div className="cn-form-group" ref={procedureDropdownRef}>
            <label className="cn-label">Procedure Name</label>
            <div className="cn-searchable-combobox-wrapper">
              <input
                type="text"
                role="combobox"
                aria-expanded={isProcedureDropdownOpen}
                aria-autocomplete="list"
                placeholder="Search or type procedure name..."
                value={treatmentPerformed}
                onClick={handleOpenProcedureCatalogue}
                onFocus={() => {
                  setIsProcedureDropdownOpen(true);
                  setProcedureSearchQuery(treatmentPerformed);
                }}
                onChange={(e) => {
                  setTreatmentPerformed(e.target.value);
                  setProcedureSearchQuery(e.target.value);
                  setIsProcedureDropdownOpen(true);
                }}
                className="cn-input cn-combobox-input"
              />
              <div className="cn-combobox-actions">
                {treatmentPerformed && (
                  <button
                    type="button"
                    aria-label="Clear procedure"
                    className="cn-combobox-clear-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTreatmentPerformed('');
                      setProcedureSearchQuery('');
                      setCatalogueSelectedProc(null);
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Open Catalogue ↗"
                  className="cn-cat-open-chip-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenProcedureCatalogue();
                  }}
                  title="Open full procedure catalogue"
                >
                  <BookOpen size={13} />
                  <span>Catalogue</span>
                </button>
              </div>

              {isProcedureDropdownOpen && (
                <div className="cn-combobox-dropdown" role="listbox">
                  <div className="cn-combobox-dropdown-header">
                    <span className="cn-combobox-count">
                      {filteredProcedures.length} procedure{filteredProcedures.length === 1 ? '' : 's'} available
                    </span>
                    <div className="cn-combobox-header-actions">
                      {activeCategoryFilter !== 'ALL' && (
                        <button
                          type="button"
                          className="cn-combobox-reset-filter"
                          onClick={() => setActiveCategoryFilter('ALL')}
                        >
                          Show all categories
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleOpenProcedureCatalogue}
                        className="cn-combobox-manage-link"
                        title="Open Procedure Catalogue with full search & categories"
                      >
                        <BookOpen size={11} /> Open Catalogue ↗
                      </button>
                    </div>
                  </div>

                  {/* Category filter pills */}
                  <div className="cn-combobox-category-bar">
                    {procedureCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        className={`cn-category-chip ${activeCategoryFilter === cat ? 'is-active' : ''}`}
                        onClick={() => setActiveCategoryFilter(cat)}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Dropdown item list */}
                  <div className="cn-combobox-list">
                    {filteredProcedures.length === 0 ? (
                      <div className="cn-combobox-empty">
                        <p>No matching predefined procedures found</p>
                        <small>Custom entry &ldquo;{treatmentPerformed}&rdquo; will be saved as-is.</small>
                        <button
                          type="button"
                          onClick={handleOpenProcedureCatalogue}
                          className="cn-combobox-empty-link"
                        >
                          <BookOpen size={12} /> Open Procedure Catalogue ↗
                        </button>
                      </div>
                    ) : (
                      filteredProcedures.map((proc) => {
                        const isSelected =
                          treatmentPerformed.trim().toLowerCase() ===
                          proc.name.trim().toLowerCase();
                        return (
                          <div
                            key={proc.id || proc.name}
                            role="option"
                            aria-selected={isSelected}
                            className={`cn-combobox-item ${isSelected ? 'is-selected' : ''}`}
                            onClick={() => handleSelectProcedure(proc)}
                          >
                            <div className="cn-combobox-item-main">
                              {proc.code && (
                                <span className="cn-combobox-code-badge">{proc.code}</span>
                              )}
                              <span className="cn-combobox-item-name">{proc.name}</span>
                            </div>
                            <div className="cn-combobox-item-meta">
                              <span className="cn-combobox-category-badge">
                                {proc.category}
                              </span>
                              {typeof proc.fee === 'number' && proc.fee > 0 && (
                                <span className="cn-combobox-fee-badge">
                                  ₹{proc.fee}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="cn-form-group">
            <label className="cn-label">Tooth Number / Quadrant</label>
            <input
              type="text"
              value={treatmentToothNumber}
              onChange={(e) => setTreatmentToothNumber(e.target.value)}
              className="cn-input"
            />
          </div>
        </div>

        <div className="cn-form-group">
          <label className="cn-label">Detailed Step-by-Step Procedure Description</label>
          <textarea
            rows={2}
            value={treatmentDescription}
            onChange={(e) => setTreatmentDescription(e.target.value)}
            className="cn-textarea"
          />
        </div>

        {/* Materials & Instruments Used - Full width with dedicated tray */}
        <div className="cn-form-group cn-materials-group">
          <div className="cn-materials-label-row">
            <div className="cn-materials-label-left">
              <label htmlFor="cn-input-materials-used" className="cn-label" style={{ marginBottom: 0 }}>Materials & Instruments Used</label>
              {currentMaterialsList.length > 0 && (
                <span className="cn-materials-count-tag">
                  {currentMaterialsList.length} item{currentMaterialsList.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
            {recommendedMaterials.length > 0 && (
              <button
                type="button"
                className="cn-materials-autofill-btn"
                onClick={handleAutoFillMaterials}
                title="Auto-fill recommended standard materials for this procedure"
              >
                <Sparkles size={12} />
                <span>Auto-fill standard set</span>
              </button>
            )}
          </div>
          <input
            id="cn-input-materials-used"
            type="text"
            aria-label="Materials & Instruments Used"
            value={materialsUsed}
            onChange={(e) => setMaterialsUsed(e.target.value)}
            className="cn-input"
          />

          {/* Quick-add chips tray */}
          <div className="cn-materials-chips-bar">
            <div className="cn-materials-chips-header">
              <span className="cn-materials-chips-caption">
                Quick Add {treatmentPerformed ? `(${treatmentPerformed.length > 36 ? treatmentPerformed.slice(0, 36) + '...' : treatmentPerformed})` : 'Materials'}:
              </span>
              <span className="cn-materials-chips-tip">Tap to toggle on/off</span>
            </div>

            <div className="cn-materials-chips-list">
              {/* Recommended procedure-specific chips */}
              {recommendedMaterials.map((mat) => {
                const active = isMaterialActive(mat);
                return (
                  <button
                    key={mat}
                    type="button"
                    className={`cn-mat-chip ${active ? 'is-active' : ''}`}
                    onClick={() => handleToggleMaterial(mat)}
                    title={active ? `Remove ${mat}` : `Add ${mat}`}
                  >
                    {active ? (
                      <Check size={11} className="cn-mat-chip-icon" />
                    ) : (
                      <Plus size={11} className="cn-mat-chip-icon" />
                    )}
                    <span>{mat}</span>
                  </button>
                );
              })}

              {/* Custom items added by doctor */}
              {customMaterialsList.map((mat) => (
                <button
                  key={mat}
                  type="button"
                  className="cn-mat-chip is-active cn-mat-chip-custom"
                  onClick={() => handleToggleMaterial(mat)}
                  title={`Remove ${mat}`}
                >
                  <Check size={11} className="cn-mat-chip-icon" />
                  <span>{mat}</span>
                  <span className="cn-mat-chip-remove">
                    <X size={10} />
                  </span>
                </button>
              ))}

              {/* Other... button */}
              <button
                type="button"
                className={`cn-mat-chip cn-mat-chip-other ${showOtherMaterialInput ? 'is-open' : ''}`}
                onClick={() => {
                  setShowOtherMaterialInput(!showOtherMaterialInput);
                  if (!showOtherMaterialInput) {
                    setTimeout(() => otherMaterialInputRef.current?.focus(), 60);
                  }
                }}
                title="Add custom material or instrument"
              >
                <Plus size={11} className="cn-mat-chip-icon" />
                <span>Other...</span>
              </button>
            </div>

            {/* Inline custom material input */}
            {showOtherMaterialInput && (
              <div className="cn-mat-other-form">
                <input
                  ref={otherMaterialInputRef}
                  type="text"
                  className="cn-mat-other-input"
                  placeholder="Type custom material or instrument name..."
                  value={otherMaterialText}
                  onChange={(e) => setOtherMaterialText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddOtherMaterial();
                    } else if (e.key === 'Escape') {
                      setShowOtherMaterialInput(false);
                      setOtherMaterialText('');
                    }
                  }}
                />
                <button
                  type="button"
                  className="cn-mat-other-add-btn"
                  onClick={handleAddOtherMaterial}
                  disabled={!otherMaterialText.trim()}
                >
                  Add
                </button>
                <button
                  type="button"
                  className="cn-mat-other-cancel-btn"
                  onClick={() => {
                    setShowOtherMaterialInput(false);
                    setOtherMaterialText('');
                  }}
                  title="Cancel"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Immediate Treatment Outcome - Full width clean alignment */}
        <div className="cn-form-group">
          <label className="cn-label">Immediate Treatment Outcome</label>
          <input
            type="text"
            value={treatmentOutcome}
            onChange={(e) => setTreatmentOutcome(e.target.value)}
            className="cn-input"
          />
        </div>
      </section>

      {/* Section 7: Treatment Recommendations */}
      <section className="cn-form-section">
        <h3 className="cn-form-section-title">
          <FileText /> 7. Treatment Recommendations & Next Steps
        </h3>
        <div className="cn-form-grid-2">
          <div className="cn-form-group">
            <label className="cn-label">Recommended Planned Treatment</label>
            <textarea
              rows={2}
              value={treatmentRecommendations}
              onChange={(e) => setTreatmentRecommendations(e.target.value)}
              className="cn-textarea"
            />
          </div>

          <div className="cn-form-group">
            <label className="cn-label">Referral Notes / Specialist Consult</label>
            <textarea
              rows={2}
              value={referralNotes}
              onChange={(e) => setReferralNotes(e.target.value)}
              className="cn-textarea"
            />
          </div>
        </div>
      </section>

      {/* Section 8: Follow-up & Advice */}
      <section className="cn-form-section">
        <h3 className="cn-form-section-title">
          <Clock /> 8. Follow-up & Patient Instructions
        </h3>
        <div className="cn-form-grid-2">
          <div className="cn-form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={followUpRequired}
                onChange={(e) => setFollowUpRequired(e.target.checked)}
              />
              Follow-up appointment required
            </label>
            {followUpRequired && (
              <div style={{ marginTop: '8px' }}>
                <label className="cn-label">Target Follow-up Date</label>
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  className="cn-input"
                />
              </div>
            )}
          </div>

          <div className="cn-form-group">
            <label className="cn-label">Follow-up Instructions</label>
            <textarea
              rows={2}
              value={followUpInstructions}
              onChange={(e) => setFollowUpInstructions(e.target.value)}
              className="cn-textarea"
            />
          </div>
        </div>

        <div className="cn-form-group">
          <label className="cn-label">Patient Advice & Home Care</label>
          <input
            type="text"
            value={patientAdvice}
            onChange={(e) => setPatientAdvice(e.target.value)}
            className="cn-input"
          />
        </div>
      </section>
    </>
  );

  const dialogsContent = (
    <>
      {/* Finalize Confirmation Dialog */}
      {confirmFinalizeOpen && (
        <div className="cn-modal-overlay" style={{ zIndex: 1100 }}>
          <div className="cn-modal-dialog" style={{ maxWidth: '460px' }}>
            <div className="cn-modal-header">
              <div className="cn-modal-header-info">
                <CheckCircle2 style={{ color: 'var(--cn-finalized)' }} />
                <div>
                  <h2>Finalize Clinical Note?</h2>
                </div>
              </div>
            </div>
            <div className="cn-modal-body">
              {error && (
                <div className="cn-dialog-error-banner">
                  <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div style={{ flex: 1 }}>
                    <strong>Cannot finalize note:</strong>
                    <div style={{ marginTop: '2px' }}>{error}</div>
                    {(error.toLowerCase().includes('doctor') ||
                      error.toLowerCase().includes('privilege') ||
                      error.toLowerCase().includes('practitioner') ||
                      error.toLowerCase().includes('unauthorized')) && (
                        <div className="cn-dialog-error-tip">
                          Finalization requires verified practitioner access.
                          Contact your clinic administrator if practitioner access is missing.
                        </div>
                      )}
                  </div>
                </div>
              )}

              <p className="cn-modal-dialog-notice">
                Once finalized, this consultation record becomes a signed, read-only legal medical document.
                Further updates can only be recorded as auditable clinical addenda.
              </p>

              {currentUser?.role && !canClinic(currentUser, 'clinical.write') && !error && (
                <div className="cn-role-warning-banner">
                  <ShieldAlert size={16} style={{ flexShrink: 0 }} />
                  <span>
                    Signed in as <strong>{currentUser.role.replace(/_/g, ' ')}</strong>. Note finalization requires verified practitioner access.
                  </span>
                </div>
              )}
            </div>
            <div className="cn-modal-footer">
              <button
                type="button"
                className="cn-btn cn-btn-secondary"
                onClick={() => {
                  setError(null);
                  setConfirmFinalizeOpen(false);
                }}
                disabled={loading}
              >
                Back to Editing
              </button>
              {error &&
                (error.toLowerCase().includes('doctor') ||
                  error.toLowerCase().includes('privilege') ||
                  error.toLowerCase().includes('practitioner') ||
                  error.toLowerCase().includes('unauthorized')) && (
                  <button
                    type="button"
                    className="cn-btn cn-btn-primary"
                    onClick={() => {
                      setConfirmFinalizeOpen(false);
                      handleSubmit(false);
                    }}
                    disabled={loading}
                  >
                    <Save size={14} />
                    <span>Save as Draft Instead</span>
                  </button>
                )}
              <button
                type="button"
                className="cn-btn cn-btn-success"
                onClick={() => handleSubmit(true)}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={15} className="cn-spin" />
                    <span>Finalizing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Confirm & Finalize</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Dedicated Procedure Catalogue Full Selector Screen */}
      {isProcedureCatalogueOpen && (
        <div
          className="cn-cat-modal-overlay"
          style={{ zIndex: 1250 }}
          onClick={() => setIsProcedureCatalogueOpen(false)}
        >
          <div
            className="cn-cat-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="proc-catalogue-heading"
          >
            {/* Header */}
            <div className="cn-cat-dialog-header">
              <div className="cn-cat-header-title-wrap">
                <button
                  type="button"
                  className="cn-cat-back-btn"
                  onClick={() => setIsProcedureCatalogueOpen(false)}
                  aria-label="Back to clinical note"
                  title="Back to clinical note"
                >
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <h2 id="proc-catalogue-heading" className="cn-cat-title">
                    Dental Procedure Catalogue
                  </h2>
                  <p className="cn-cat-subtitle">
                    Search and select today&apos;s treatment procedure from the master catalogue
                  </p>
                </div>
              </div>

              <div className="cn-cat-header-meta">
                <span className="cn-cat-count-pill">
                  {allProcedures.length} Procedures
                </span>
                <button
                  type="button"
                  className="cn-modal-close"
                  onClick={() => setIsProcedureCatalogueOpen(false)}
                  aria-label="Close catalogue"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Search & Category Filter Section */}
            <div className="cn-cat-filter-section">
              <div className="cn-cat-search-bar">
                <Search size={18} className="cn-cat-search-icon" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search by procedure name, CDT code, or dental specialty..."
                  value={catalogueSearchQuery}
                  onChange={(e) => setCatalogueSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSaveProcedureFromCatalogue();
                    }
                  }}
                  className="cn-cat-search-input"
                />
                {catalogueSearchQuery && (
                  <button
                    type="button"
                    className="cn-cat-search-clear-btn"
                    onClick={() => setCatalogueSearchQuery('')}
                    aria-label="Clear search"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Specialty Category Pills */}
              <div className="cn-cat-categories-row">
                {procedureCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`cn-cat-category-chip ${catalogueSelectedCategory === cat ? 'is-active' : ''}`}
                    onClick={() => setCatalogueSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Catalogue Body List */}
            <div className="cn-cat-body">
              <div className="cn-cat-meta-row">
                <span className="cn-cat-status-text">
                  Showing {catalogueFilteredProcedures.length} {catalogueSelectedCategory !== 'ALL' ? catalogueSelectedCategory : ''} procedure{catalogueFilteredProcedures.length === 1 ? '' : 's'}
                </span>
                {catalogueSelectedCategory !== 'ALL' && (
                  <button
                    type="button"
                    className="cn-cat-show-all-btn"
                    onClick={() => setCatalogueSelectedCategory('ALL')}
                  >
                    Show all specialties
                  </button>
                )}
              </div>

              {/* Custom procedure card if searching for non-catalogue item */}
              {catalogueSearchQuery.trim() && (
                <div className="cn-cat-custom-box">
                  <div className="cn-cat-custom-left">
                    <Sparkles size={16} className="cn-cat-sparkle-icon" />
                    <div>
                      <div className="cn-cat-custom-title">Use as Custom Procedure:</div>
                      <div className="cn-cat-custom-val">&ldquo;{catalogueSearchQuery.trim()}&rdquo;</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="cn-cat-custom-apply-btn"
                    onClick={() =>
                      handleSaveProcedureFromCatalogue({
                        name: catalogueSearchQuery.trim(),
                        category: 'Custom / General',
                        id: 'custom',
                      })
                    }
                  >
                    <Check size={14} /> Select &amp; Save
                  </button>
                </div>
              )}

              {/* Procedure cards grid */}
              <div className="cn-cat-grid" role="listbox">
                {catalogueFilteredProcedures.length === 0 ? (
                  <div className="cn-cat-empty">
                    <p>No catalogue procedures matching &ldquo;{catalogueSearchQuery}&rdquo;</p>
                    <small>Click &quot;Select &amp; Save&quot; above to use &ldquo;{catalogueSearchQuery}&rdquo; as a custom procedure entry.</small>
                  </div>
                ) : (
                  catalogueFilteredProcedures.map((proc) => {
                    const isSelected =
                      catalogueSelectedProc?.id === proc.id ||
                      catalogueSelectedProc?.name.toLowerCase() === proc.name.toLowerCase() ||
                      (!catalogueSelectedProc && treatmentPerformed.trim().toLowerCase() === proc.name.trim().toLowerCase());

                    return (
                      <div
                        key={proc.id || proc.name}
                        role="option"
                        aria-selected={isSelected}
                        className={`cn-cat-card ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => setCatalogueSelectedProc(proc)}
                        onDoubleClick={() => handleSaveProcedureFromCatalogue(proc)}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveProcedureFromCatalogue(proc);
                          }
                        }}
                      >
                        <div className="cn-cat-card-main-col">
                          <div className={`cn-cat-card-radio ${isSelected ? 'is-checked' : ''}`}>
                            {isSelected && <Check size={12} strokeWidth={3} />}
                          </div>
                          <div className="cn-cat-card-details">
                            <div className="cn-cat-card-meta-tags">
                              {proc.code && (
                                <span className="cn-cat-code-pill">{proc.code}</span>
                              )}
                              <span className="cn-cat-specialty-pill">{proc.category}</span>
                              {typeof proc.fee === 'number' && proc.fee > 0 && (
                                <span className="cn-cat-fee-tag">₹{proc.fee}</span>
                              )}
                            </div>
                            <div className="cn-cat-card-name">{proc.name}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="cn-cat-dialog-footer">
              <div className="cn-cat-footer-info">
                {catalogueSelectedProc ? (
                  <div className="cn-cat-selected-preview">
                    <span className="cn-cat-selected-prefix">Selected Procedure:</span>
                    <strong className="cn-cat-selected-name">{catalogueSelectedProc.name}</strong>
                    {catalogueSelectedProc.code && (
                      <span className="cn-cat-code-pill">{catalogueSelectedProc.code}</span>
                    )}
                    <span className="cn-cat-specialty-pill">{catalogueSelectedProc.category}</span>
                    {typeof catalogueSelectedProc.fee === 'number' && catalogueSelectedProc.fee > 0 && (
                      <span className="cn-cat-fee-tag">₹{catalogueSelectedProc.fee}</span>
                    )}
                  </div>
                ) : catalogueSearchQuery.trim() ? (
                  <div className="cn-cat-selected-preview">
                    <span className="cn-cat-selected-prefix">Custom Entry:</span>
                    <strong className="cn-cat-selected-name">&ldquo;{catalogueSearchQuery.trim()}&rdquo;</strong>
                    <span className="cn-cat-specialty-pill">General</span>
                  </div>
                ) : (
                  <span className="cn-cat-footer-unselected">
                    {treatmentPerformed ? `Current: ${treatmentPerformed}` : 'Select a procedure or double-click to save and return'}
                  </span>
                )}
              </div>

              <div className="cn-cat-footer-actions">
                <button
                  type="button"
                  className="cn-btn cn-btn-secondary"
                  onClick={() => setIsProcedureCatalogueOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="cn-btn cn-btn-success cn-cat-confirm-save-btn"
                  aria-label="Confirm & Save Procedure (Save & Return to Clinical Notes)"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSaveProcedureFromCatalogue();
                  }}
                >
                  <Check size={16} /> Save &amp; Return to Clinical Notes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post-Treatment WhatsApp Aftercare Modal */}
      {showAftercareModal && (
        <PostTreatmentInstructionsModal
          note={currentNoteForAftercare}
          patient={activePatient}
          onClose={() => setShowAftercareModal(false)}
        />
      )}
    </>
  );

  if (isPage) {
    return (
      <div className="cn-record-page-workspace" data-testid="record-consultation-page">
        <div className="cn-record-page-container">
          {/* Page Top Header */}
          <div className="cn-record-page-header">
            <div className="cn-record-header-nav">
              <button
                type="button"
                className="cn-page-back-btn"
                onClick={onClose}
                title="Return to clinical notes"
                aria-label="Back"
              >
                <ArrowLeft size={15} />
              </button>
              <div className="cn-breadcrumb">
                <span>Clinical</span>
                <span className="cn-breadcrumb-separator">/</span>
                <span>Clinical Notes</span>
                <span className="cn-breadcrumb-separator">/</span>
                <span className="cn-breadcrumb-current">
                  {initialNote?.id ? 'Edit Consultation Note' : 'Record Dental Consultation'}
                </span>
              </div>
            </div>

            <div className="cn-record-header-main">
              <div className="cn-record-title-group">
                <div className="cn-icon-badge cn-icon-badge-large">
                  <FileText size={22} />
                </div>
                <div>
                  <h1 className="cn-record-page-title">
                    {initialNote?.id ? 'Edit Dental Consultation Note' : 'Record Dental Consultation'}
                  </h1>
                </div>
              </div>
            </div>
          </div>

          {/* Form Body */}
          <div className="cn-record-page-body">
            {formContent}
          </div>

          {/* Page Sticky Footer */}
          <div className="cn-record-page-footer">
            <div className="cn-record-footer-status">
              <span className="cn-status-indicator">
                <span className="cn-status-dot" />
                <span>{initialNote?.isFinalized ? 'Finalized Note' : 'Draft in Progress'}</span>
              </span>
              {currentUser?.name && (
                <span className="cn-record-doctor-tag">
                  Attending Doctor: <strong>Dr. {currentUser.name}</strong>
                </span>
              )}
            </div>

            <div className="cn-record-footer-actions">
              <button
                type="button"
                className="cn-btn pti-btn-whatsapp"
                onClick={() => setShowAftercareModal(true)}
                title="Generate Post-Treatment Instructions via WhatsApp"
                data-testid="aftercare-instructions-footer-btn"
              >
                <MessageCircle size={15} />
                <span>WhatsApp Aftercare</span>
              </button>

              <button
                type="button"
                className="cn-btn cn-btn-secondary"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cn-btn cn-btn-secondary"
                onClick={() => handleSubmit(false)}
                disabled={loading}
              >
                {loading ? <Loader2 size={15} className="cn-spin" /> : <Save size={15} />}
                <span>Save as Draft</span>
              </button>
              <button
                type="button"
                className="cn-btn cn-btn-success"
                onClick={handleOpenFinalizeConfirm}
                disabled={loading}
              >
                <CheckCircle2 size={15} />
                <span>Finalize Note</span>
              </button>
            </div>
          </div>
        </div>

        {dialogsContent}
      </div>
    );
  }

  return (
    <div className="cn-modal-overlay">
      <div className="cn-modal-dialog cn-modal-dialog-large" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="cn-modal-header">
          <div className="cn-modal-header-info">
            <div className="cn-icon-badge">
              <FileText />
            </div>
            <div>
              <h2>{initialNote ? 'Edit Consultation Note' : 'New Dental Clinical Note'}</h2>
              <p>Structured documentation for clinical consultation, examination, and procedures</p>
            </div>
          </div>
          <button
            type="button"
            className="cn-modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="cn-modal-body">
          {formContent}
        </div>

        {/* Footer */}
        <div className="cn-modal-footer">
          <button
            type="button"
            className="cn-btn cn-btn-secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="cn-btn pti-btn-whatsapp"
              onClick={() => setShowAftercareModal(true)}
              title="Generate Post-Treatment Instructions via WhatsApp"
            >
              <MessageCircle size={15} />
              <span>WhatsApp Aftercare</span>
            </button>

            <button
              type="button"
              className="cn-btn cn-btn-secondary"
              onClick={() => handleSubmit(false)}
              disabled={loading}
            >
              <Save />
              {loading ? 'Saving...' : 'Save as Draft'}
            </button>

            <button
              type="button"
              className="cn-btn cn-btn-success"
              onClick={handleOpenFinalizeConfirm}
              disabled={loading}
            >
              <CheckCircle2 size={15} />
              Finalize Note
            </button>
          </div>
        </div>
      </div>

      {dialogsContent}
    </div>
  );
};

