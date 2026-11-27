import { jsPDF } from 'jspdf'
import { apiClient } from '@/services/apiClient'

export type ConsentWorkflowStatus =
  | 'DRAFT'
  | 'PENDING_SIGNATURE'
  | 'PATIENT_SIGNED'
  | 'DENTIST_VERIFIED'
  | 'COMPLETED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'Signed'
  | 'Pending'
  | 'Declined'
  | 'Revoked'

export interface ConsentTemplateRecord {
  id: string
  clinicId?: string
  title: string
  procedureType: string
  procedureCategory: string
  requiresConsent: boolean
  guardianRequiredForMinors: boolean
  description: string
  purpose: string
  benefits: string
  risks: string
  alternatives: string
  refusalConsequences: string
  postProcedureInstructions: string
  patientDeclaration: string
  dentistDeclaration: string
  content?: {
    aliases?: string[]
    sections?: Record<string, string>
  } | null
  version: number
  isActive: boolean
  isReviewed: boolean
  reviewedBy?: string | null
  reviewedAt?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface ConsentSnapshot {
  title: string
  procedureType: string
  procedureCategory: string
  templateVersion: number
  guardianRequiredForMinors: boolean
  clinic?: {
    name?: string
    address?: string | null
    phone?: string | null
  }
  patient?: {
    id?: string
    name?: string
    age?: number | string | null
    gender?: string | null
    mobile?: string | null
    address?: string | null
  }
  appointment?: {
    id?: string | null
    bookingRef?: string | null
    date?: string | null
    time?: string | null
    consultationId?: string | null
  }
  procedure?: {
    name?: string
    treatmentPlanTitle?: string | null
    treatmentPlanNumber?: string | null
    toothNumber?: string | null
    treatmentArea?: string | null
    dentistName?: string | null
  }
  sections?: {
    description?: string
    purpose?: string
    benefits?: string
    risks?: string
    alternatives?: string
    refusalConsequences?: string
    postProcedureInstructions?: string
    patientDeclaration?: string
    dentistDeclaration?: string
  }
}

export interface ConsentRevisionRecord {
  id: string
  consentId: string
  actorId: string
  action: string
  evidenceHash: string
  createdAt: string
}

export interface ConsentStatusMeta {
  label: string
  tone: 'neutral' | 'warning' | 'info' | 'success' | 'danger'
  bg: string
  color: string
  border: string
}

export function getConsentStatusMeta(status?: string): ConsentStatusMeta {
  switch (status) {
    case 'DRAFT':
      return { label: 'Draft', tone: 'neutral', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' }
    case 'PENDING_SIGNATURE':
    case 'Pending':
      return { label: 'Pending Signature', tone: 'warning', bg: '#fef3c7', color: '#92400e', border: '#fcd34d' }
    case 'PATIENT_SIGNED':
      return { label: 'Patient Signed', tone: 'info', bg: '#dbeafe', color: '#1e40af', border: '#93c5fd' }
    case 'DENTIST_VERIFIED':
      return { label: 'Dentist Verified', tone: 'info', bg: '#e0e7ff', color: '#3730a3', border: '#a5b4fc' }
    case 'COMPLETED':
    case 'Signed':
      return { label: 'Completed', tone: 'success', bg: '#dcfce7', color: '#166534', border: '#86efac' }
    case 'DECLINED':
    case 'Declined':
      return { label: 'Declined', tone: 'danger', bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' }
    case 'CANCELLED':
    case 'Revoked':
      return { label: 'Cancelled', tone: 'neutral', bg: '#f3f4f6', color: '#4b5563', border: '#d1d5db' }
    case 'EXPIRED':
      return { label: 'Expired', tone: 'danger', bg: '#ffedd5', color: '#9a3412', border: '#fdba74' }
    default:
      return { label: status || 'Pending Signature', tone: 'warning', bg: '#fef3c7', color: '#92400e', border: '#fcd34d' }
  }
}

export function isConsentSignedOrCompleted(status?: string): boolean {
  return ['PATIENT_SIGNED', 'DENTIST_VERIFIED', 'COMPLETED', 'Signed'].includes(status || '')
}

export function isConsentPending(status?: string): boolean {
  return ['DRAFT', 'PENDING_SIGNATURE', 'Pending'].includes(status || '')
}

const DEFAULT_PATIENT_DECLARATION =
  'I confirm that I have read and understood the nature, purpose, benefits, risks, and alternatives of the planned dental procedure. I have had the opportunity to ask questions, and all my questions have been answered to my satisfaction. I voluntarily consent to undergo the procedure described above.'

const DEFAULT_DENTIST_DECLARATION =
  'I confirm that I have explained the nature, purpose, expected benefits, material risks, complications, alternatives, and consequences of refusal of the planned procedure to the patient or authorized guardian, and have verified their informed consent prior to treatment.'

export const DEFAULT_FRONTEND_CONSENT_TEMPLATES: ConsentTemplateRecord[] = [
  {
    id: 'tpl-tooth-extraction',
    title: 'Informed Consent for Tooth Extraction',
    procedureType: 'Tooth Extraction',
    procedureCategory: 'Oral Surgery',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    description: 'Removal of an erupted tooth from its alveolar socket under local anesthesia using forceps and elevators.',
    purpose: 'To remove a non-restorable, severely decayed, fractured, or periodontally compromised tooth and eliminate infection or pain.',
    benefits: 'Elimination of dental pain, resolution of infection, and prevention of spread of pathology to adjacent teeth or bone.',
    risks: 'Post-operative pain, swelling, bleeding, bruising, dry socket, infection, injury to adjacent teeth, and temporary or rare permanent numbness.',
    alternatives: 'Root canal treatment with crown restoration (if restorable), periodontal therapy, or no treatment.',
    refusalConsequences: 'Persistent or worsening pain, spread of abscess/infection, bone loss, and potential systemic infection.',
    postProcedureInstructions: 'Bite firmly on gauze for 30–45 minutes. Avoid rinsing, spitting, smoking, or using straws for 24 hours.',
    patientDeclaration: DEFAULT_PATIENT_DECLARATION,
    dentistDeclaration: DEFAULT_DENTIST_DECLARATION,
    content: { aliases: ['tooth extraction (simple)', 'simple extraction', 'd7140'] },
    version: 1,
    isActive: true,
    isReviewed: true,
  },
  {
    id: 'tpl-surgical-extraction',
    title: 'Informed Consent for Surgical Tooth Extraction',
    procedureType: 'Surgical Tooth Extraction',
    procedureCategory: 'Oral Surgery',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    description: 'Surgical removal of a broken-down or retained root/tooth involving soft tissue flap reflection, controlled bone removal, or tooth sectioning.',
    purpose: 'To safely remove a tooth or retained root that cannot be extracted by simple non-surgical means.',
    benefits: 'Complete removal of non-salvageable tooth structure and elimination of chronic infection.',
    risks: 'Swelling, trismus, bleeding, dry socket, infection, sinus communication, and temporary or rare permanent altered sensation.',
    alternatives: 'Coronectomy in selected cases, endodontic/prosthetic salvage if feasible, or observation.',
    refusalConsequences: 'Progressive infection, cyst formation, bone resorption, and worsening pain.',
    postProcedureInstructions: 'Maintain firm gauze pressure for 45 minutes. Soft, cool diet for 48 hours. Attend suture removal follow-up.',
    patientDeclaration: DEFAULT_PATIENT_DECLARATION,
    dentistDeclaration: DEFAULT_DENTIST_DECLARATION,
    content: { aliases: ['surgical extraction', 'surgical extraction / flap elevation', 'd7210'] },
    version: 1,
    isActive: true,
    isReviewed: true,
  },
  {
    id: 'tpl-wisdom-tooth',
    title: 'Informed Consent for Wisdom Tooth Extraction',
    procedureType: 'Wisdom Tooth Extraction',
    procedureCategory: 'Oral Surgery',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    description: 'Surgical removal of an erupted, partially erupted, or impacted third molar under local anesthesia with flap elevation, bone guttering, and suturing.',
    purpose: 'To treat or prevent pericoronitis, caries on adjacent second molars, cyst formation, or pain caused by impacted wisdom teeth.',
    benefits: 'Relief from recurrent pericoronitis and pain, protection of adjacent second molars, and prevention of cystic damage.',
    risks: 'Post-operative swelling, bruising, trismus, dry socket, infection, oro-antral communication, and temporary or rarely permanent nerve paresthesia.',
    alternatives: 'Operculectomy, coronectomy, or periodic radiographic monitoring if asymptomatic.',
    refusalConsequences: 'Recurrent pericoronitis, deep caries or root resorption of the adjacent second molar, and bone loss.',
    postProcedureInstructions: 'Apply cold compress for 24 hours. Avoid smoking and hard/spicy foods for 5–7 days. Return for suture removal.',
    patientDeclaration: DEFAULT_PATIENT_DECLARATION,
    dentistDeclaration: DEFAULT_DENTIST_DECLARATION,
    content: { aliases: ['surgical wisdom tooth removal', 'wisdom tooth removal', 'impacted third molar removal', 'd7240'] },
    version: 1,
    isActive: true,
    isReviewed: true,
  },
  {
    id: 'tpl-dental-implant',
    title: 'Informed Consent for Dental Implant Surgery',
    procedureType: 'Dental Implant Surgery',
    procedureCategory: 'Oral Surgery',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    description: 'Surgical placement of a biocompatible titanium or zirconia root-form implant into the jawbone to support a future crown or prosthesis.',
    purpose: 'To replace missing tooth roots and restore chewing function, speech, and aesthetics.',
    benefits: 'Fixed, stable tooth replacement, preservation of jawbone volume, and natural aesthetics.',
    risks: 'Failure of osseointegration, peri-implantitis, bleeding, swelling, sinus perforation, nerve injury, and need for additional grafting.',
    alternatives: 'Fixed dental bridge, removable partial or complete denture, or no replacement.',
    refusalConsequences: 'Continued bone resorption, shifting of neighboring teeth, and reduced chewing efficiency.',
    postProcedureInstructions: 'Avoid chewing on the implant side. Use prescribed chlorhexidine rinse and attend osseointegration reviews.',
    patientDeclaration: DEFAULT_PATIENT_DECLARATION,
    dentistDeclaration: DEFAULT_DENTIST_DECLARATION,
    content: { aliases: ['dental implant', 'implant placement', 'implant surgery'] },
    version: 1,
    isActive: true,
    isReviewed: true,
  },
  {
    id: 'tpl-bone-grafting',
    title: 'Informed Consent for Bone Grafting',
    procedureType: 'Bone Grafting',
    procedureCategory: 'Oral Surgery',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    description: 'Surgical placement of bone graft material and barrier membrane to rebuild deficient jawbone.',
    purpose: 'To restore bone height and width required for dental implant placement or ridge preservation.',
    benefits: 'Improved bone volume and density for stable implant support.',
    risks: 'Graft infection, membrane exposure, partial or complete graft resorption, swelling, and bruising.',
    alternatives: 'Short/narrow implants without grafting, conventional bridgework, or removable prosthesis.',
    refusalConsequences: 'Insufficient bone volume for implant placement and progressive ridge collapse.',
    postProcedureInstructions: 'Do not disturb the grafted site. Avoid smoking, straws, and hard foods.',
    patientDeclaration: DEFAULT_PATIENT_DECLARATION,
    dentistDeclaration: DEFAULT_DENTIST_DECLARATION,
    content: { aliases: ['alveolar bone graft', 'socket preservation', 'ridge augmentation'] },
    version: 1,
    isActive: true,
    isReviewed: true,
  },
  {
    id: 'tpl-sinus-lift',
    title: 'Informed Consent for Sinus Lift',
    procedureType: 'Sinus Lift',
    procedureCategory: 'Oral Surgery',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    description: 'Surgical elevation of the maxillary sinus membrane and placement of bone graft material in the posterior upper jaw.',
    purpose: 'To increase vertical bone height below the maxillary sinus for safe dental implant placement.',
    benefits: 'Enables implant-supported restoration in posterior maxilla sites with limited bone.',
    risks: 'Sinus membrane perforation, maxillary sinusitis, nasal bleeding, graft migration, and oro-antral fistula.',
    alternatives: 'Short implants, tilted implants, removable partial denture, or no posterior replacement.',
    refusalConsequences: 'Inability to place standard implants in the posterior maxilla and continued bone loss.',
    postProcedureInstructions: 'Do NOT blow your nose or sneeze with mouth closed for 2 weeks. Avoid straws and smoking.',
    patientDeclaration: DEFAULT_PATIENT_DECLARATION,
    dentistDeclaration: DEFAULT_DENTIST_DECLARATION,
    content: { aliases: ['sinus augmentation', 'maxillary sinus lift'] },
    version: 1,
    isActive: true,
    isReviewed: true,
  },
  {
    id: 'tpl-periodontal-surgery',
    title: 'Informed Consent for Periodontal Surgery',
    procedureType: 'Periodontal Surgery',
    procedureCategory: 'Periodontics',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    description: 'Surgical reflection of gum tissue to access deep periodontal pockets, remove calculus/granulation tissue, and reposition the gingiva.',
    purpose: 'To eliminate deep periodontal pockets and arrest progressive bone loss.',
    benefits: 'Reduction of pocket depth, improved gum health, and extended longevity of natural teeth.',
    risks: 'Gum recession, increased tooth sensitivity, temporary mobility, swelling, and bleeding.',
    alternatives: 'Non-surgical scaling and root planing, or extraction of hopeless teeth.',
    refusalConsequences: 'Continued periodontal bone destruction, abscess formation, and eventual tooth loss.',
    postProcedureInstructions: 'Avoid brushing directly over surgical sutures until reviewed. Use prescribed antiseptic rinse.',
    patientDeclaration: DEFAULT_PATIENT_DECLARATION,
    dentistDeclaration: DEFAULT_DENTIST_DECLARATION,
    content: { aliases: ['flap surgery', 'gingivectomy', 'crown lengthening'] },
    version: 1,
    isActive: true,
    isReviewed: true,
  },
  {
    id: 'tpl-oral-surgery',
    title: 'Informed Consent for Oral Surgery',
    procedureType: 'Oral Surgery',
    procedureCategory: 'Oral Surgery',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    description: 'Surgical intervention within the oral cavity (excision, biopsy, frenectomy, cyst removal, or drainage) under local anesthesia.',
    purpose: 'To diagnose, remove, or treat pathological, anatomical, or infectious oral conditions.',
    benefits: 'Resolution of pathology/infection and improved oral function.',
    risks: 'Bleeding, swelling, pain, infection, scarring, delayed healing, or localized nerve sensitivity.',
    alternatives: 'Conservative medication, observation, or referral for general anesthesia.',
    refusalConsequences: 'Progression of underlying pathology, persistent infection, or delayed diagnosis.',
    postProcedureInstructions: 'Follow wound-care, diet, and medication instructions provided.',
    patientDeclaration: DEFAULT_PATIENT_DECLARATION,
    dentistDeclaration: DEFAULT_DENTIST_DECLARATION,
    content: { aliases: ['minor oral surgery', 'biopsy', 'frenectomy', 'odontectomy'] },
    version: 1,
    isActive: true,
    isReviewed: true,
  },
  {
    id: 'tpl-apicoectomy',
    title: 'Informed Consent for Apicoectomy',
    procedureType: 'Apicoectomy',
    procedureCategory: 'Oral Surgery',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    description: 'Surgical removal of the root apex and periapical lesion, followed by root-end preparation and retrograde filling.',
    purpose: 'To save a previously root-canal-treated tooth with persistent periapical infection.',
    benefits: 'Preservation of the natural tooth and elimination of chronic apical inflammation.',
    risks: 'Persistent infection requiring extraction, gum recession, swelling, bruising, or nerve irritation.',
    alternatives: 'Non-surgical endodontic retreatment or tooth extraction.',
    refusalConsequences: 'Persistent periapical abscess, expanding bone defect, and eventual tooth loss.',
    postProcedureInstructions: 'Apply ice pack for 24 hours, avoid lifting the lip to inspect sutures, and attend follow-ups.',
    patientDeclaration: DEFAULT_PATIENT_DECLARATION,
    dentistDeclaration: DEFAULT_DENTIST_DECLARATION,
    content: { aliases: ['periapical surgery', 'root-end resection'] },
    version: 1,
    isActive: true,
    isReviewed: true,
  },
  {
    id: 'tpl-rct',
    title: 'Informed Consent for Root Canal Treatment',
    procedureType: 'Root Canal Treatment',
    procedureCategory: 'Endodontics',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    description: 'Removal of infected or inflamed pulp tissue from the root canal system, disinfection, and obturation.',
    purpose: 'To eliminate pulpal pain/infection and retain the natural tooth.',
    benefits: 'Pain relief, eradication of root canal infection, and preservation of the natural tooth.',
    risks: 'Post-operative soreness, flare-up swelling, instrument separation, root perforation, missed canals, and tooth fracture if not crowned.',
    alternatives: 'Tooth extraction or no treatment.',
    refusalConsequences: 'Severe toothache, periapical abscess, facial swelling, and tooth loss.',
    postProcedureInstructions: 'Avoid chewing hard foods on the treated tooth until the final crown is placed.',
    patientDeclaration: DEFAULT_PATIENT_DECLARATION,
    dentistDeclaration: DEFAULT_DENTIST_DECLARATION,
    content: { aliases: ['root canal treatment (single sitting)', 'root canal therapy', 'rct', 'd3310', 'd3320', 'd3330'] },
    version: 1,
    isActive: true,
    isReviewed: true,
  },
  {
    id: 'tpl-crown-bridge',
    title: 'Informed Consent for Crown and Bridge',
    procedureType: 'Crown and Bridge',
    procedureCategory: 'Prosthodontics',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    description: 'Tooth preparation, impression/digital scanning, temporary prosthesis, and cementation of a custom crown or bridge.',
    purpose: 'To protect weakened teeth or replace missing teeth using adjacent abutment teeth.',
    benefits: 'Restored tooth strength, chewing efficiency, occlusion, and aesthetics.',
    risks: 'Post-preparation sensitivity, need for root canal treatment, porcelain chipping, debonding, or recurrent decay.',
    alternatives: 'Direct composite restoration, dental implant, or removable partial denture.',
    refusalConsequences: 'Fracture of weakened tooth structure, drifting of adjacent teeth, and compromised bite.',
    postProcedureInstructions: 'Be gentle with temporary crowns and maintain flossing around bridge pontics.',
    patientDeclaration: DEFAULT_PATIENT_DECLARATION,
    dentistDeclaration: DEFAULT_DENTIST_DECLARATION,
    content: { aliases: ['crown & bridge preparation', 'dental crown', 'fixed partial denture', 'd2740', 'd2750'] },
    version: 1,
    isActive: true,
    isReviewed: true,
  },
  {
    id: 'tpl-denture',
    title: 'Informed Consent for Denture Treatment',
    procedureType: 'Denture Treatment',
    procedureCategory: 'Prosthodontics',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    description: 'Fabrication and fitting of a removable complete or partial prosthesis.',
    purpose: 'To replace missing teeth and restore facial support, speech, and mastication.',
    benefits: 'Improved appearance, speech clarity, and ability to chew.',
    risks: 'Initial sore spots, speech adaptation period, lower denture looseness, and periodic relining needs.',
    alternatives: 'Implant-supported overdenture or fixed implant bridgework.',
    refusalConsequences: 'Impaired chewing, collapsed facial vertical dimension, and shifting of remaining teeth.',
    postProcedureInstructions: 'Remove dentures at night and clean daily with non-abrasive denture cleanser.',
    patientDeclaration: DEFAULT_PATIENT_DECLARATION,
    dentistDeclaration: DEFAULT_DENTIST_DECLARATION,
    content: { aliases: ['complete denture', 'removable partial denture', 'denture'] },
    version: 1,
    isActive: true,
    isReviewed: true,
  },
  {
    id: 'tpl-orthodontic',
    title: 'Informed Consent for Orthodontic Treatment',
    procedureType: 'Orthodontic Treatment',
    procedureCategory: 'Orthodontics',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    description: 'Application of fixed orthodontic brackets/wires or removable clear aligners to gradually align teeth.',
    purpose: 'To correct malocclusion, crowding, spacing, or jaw alignment discrepancies.',
    benefits: 'Improved dental alignment, bite function, and smile aesthetics.',
    risks: 'White spot lesions if hygiene is poor, root resorption, gum inflammation, temporary discomfort, and relapse without retainers.',
    alternatives: 'No orthodontic treatment, limited cosmetic bonding/veneers, or orthognathic surgery.',
    refusalConsequences: 'Continued crowding, uneven tooth wear, and persistent bite imbalance.',
    postProcedureInstructions: 'Brush after every meal, avoid hard/sticky foods with braces, and wear retainers as prescribed.',
    patientDeclaration: DEFAULT_PATIENT_DECLARATION,
    dentistDeclaration: DEFAULT_DENTIST_DECLARATION,
    content: { aliases: ['orthodontic bracket adjustment', 'clear aligner scan & assessment', 'braces', 'clear aligners'] },
    version: 1,
    isActive: true,
    isReviewed: true,
  },
  {
    id: 'tpl-srp',
    title: 'Informed Consent for Scaling and Root Planing',
    procedureType: 'Scaling and Root Planing',
    procedureCategory: 'Periodontics',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    description: 'Deep non-surgical periodontal debridement under local anesthesia to remove subgingival calculus and biofilm.',
    purpose: 'To control periodontal inflammation, reduce pocket depths, and halt progressive bone loss.',
    benefits: 'Healthier gums, reduced bleeding, and stabilization of periodontal support.',
    risks: 'Temporary bleeding, gum soreness, mild gingival shrinkage, and transient thermal sensitivity.',
    alternatives: 'Routine supragingival scaling or periodontal surgery.',
    refusalConsequences: 'Progression of periodontitis, deeper pockets, bone loss, and tooth mobility.',
    postProcedureInstructions: 'Use desensitizing toothpaste if sensitive and maintain 3–6 month periodontal maintenance visits.',
    patientDeclaration: DEFAULT_PATIENT_DECLARATION,
    dentistDeclaration: DEFAULT_DENTIST_DECLARATION,
    content: { aliases: ['deep cleaning', 'subgingival scaling', 'root planing'] },
    version: 1,
    isActive: true,
    isReviewed: true,
  },
  {
    id: 'tpl-radiography',
    title: 'Informed Consent for Dental Radiography',
    procedureType: 'Dental Radiography',
    procedureCategory: 'Radiology',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    description: 'Acquisition of diagnostic 2D dental X-ray images (IOPA, Bitewing, or OPG) using low-dose digital radiation.',
    purpose: 'To visualize caries, root anatomy, periapical bone, and impacted teeth not visible clinically.',
    benefits: 'Accurate diagnosis and safe treatment planning with minimal radiation exposure.',
    risks: 'Minimal ionizing radiation exposure; pregnancy must be disclosed prior to imaging.',
    alternatives: 'Clinical examination alone (limited diagnostic accuracy).',
    refusalConsequences: 'Undetected root/bone pathology or missed fractures.',
    postProcedureInstructions: 'No special post-imaging restrictions.',
    patientDeclaration: DEFAULT_PATIENT_DECLARATION,
    dentistDeclaration: DEFAULT_DENTIST_DECLARATION,
    content: { aliases: ['iopa', 'intraoral periapical x-ray', 'opg', 'panoramic x-ray', 'dental x-ray'] },
    version: 1,
    isActive: true,
    isReviewed: true,
  },
  {
    id: 'tpl-cbct',
    title: 'Informed Consent for CBCT Imaging',
    procedureType: 'CBCT Imaging',
    procedureCategory: 'Radiology',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    description: 'Three-dimensional Cone Beam Computed Tomography (CBCT) scan of the jaws, teeth, sinus, and nerve pathways.',
    purpose: 'To obtain high-resolution 3D anatomical measurements for implant planning or surgical assessment.',
    benefits: 'Precise 3D visualization reducing surgical risks near nerves and sinuses.',
    risks: 'Higher ionizing radiation dose than standard 2D dental X-rays; pregnancy must be disclosed prior to scanning.',
    alternatives: '2D panoramic/periapical radiographs.',
    refusalConsequences: 'Less precise anatomical mapping prior to complex surgery or implant placement.',
    postProcedureInstructions: 'No post-scan restrictions.',
    patientDeclaration: DEFAULT_PATIENT_DECLARATION,
    dentistDeclaration: DEFAULT_DENTIST_DECLARATION,
    content: { aliases: ['cbct', 'cone beam ct', '3d dental scan'] },
    version: 1,
    isActive: true,
    isReviewed: true,
  },
  {
    id: 'tpl-other',
    title: 'Informed Consent for Other Consent-Required Procedures',
    procedureType: 'Other consent-required procedures',
    procedureCategory: 'Other',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    description: 'Specialized or invasive dental procedure as detailed in the patient’s treatment plan and clinical consultation notes.',
    purpose: 'To address the diagnosed dental condition as discussed with the treating dentist.',
    benefits: 'Resolution of the clinical problem and restoration of oral health.',
    risks: 'Procedure-specific risks including pain, swelling, bleeding, infection, or sensitivity as explained by the clinician.',
    alternatives: 'Alternative restorative, surgical, or conservative options discussed during consultation.',
    refusalConsequences: 'Progression of the underlying dental condition.',
    postProcedureInstructions: 'Follow all written and verbal post-procedure instructions provided by your dentist.',
    patientDeclaration: DEFAULT_PATIENT_DECLARATION,
    dentistDeclaration: DEFAULT_DENTIST_DECLARATION,
    content: { aliases: ['other consent-required procedure', 'general surgical consent'] },
    version: 1,
    isActive: true,
    isReviewed: true,
  },
]

const ORDINARY_EXCLUSION_RE =
  /\b(routine|check-?up|examination|consultation|polishing|scaling\s*&\s*polishing|whitening|bleaching|fluoride|sealant|filling|restoration|emergency pain relief)\b/i
const CONSENT_KEYWORD_RE =
  /\b(extract|extraction|wisdom|third molar|implant|bone graft|grafting|sinus lift|periodontal surgery|flap surgery|gingivectomy|crown lengthening|oral surgery|apicoectomy|root canal|rct|endodontic|crown\s*(&|and)\s*bridge|denture|orthodontic|aligner|braces|scaling and root planing|root planing|radiograph|x-?ray|iopa|opg|cbct|cone beam|surgery|surgical|biopsy|frenectomy|odontectomy|cyst)\b/i

export function matchFrontendConsentTemplate(
  procedureName?: string | null,
  templates: ConsentTemplateRecord[] = DEFAULT_FRONTEND_CONSENT_TEMPLATES,
): ConsentTemplateRecord | null {
  const norm = (procedureName || '').trim().toLowerCase().replace(/\s+/g, ' ')
  if (!norm) return null
  const active = templates.filter((t) => t.isActive !== false && t.requiresConsent !== false)

  for (const t of active) {
    if (t.procedureType.trim().toLowerCase() === norm) return t
    if (t.content?.aliases?.some((a) => a.trim().toLowerCase() === norm)) return t
  }

  if (ORDINARY_EXCLUSION_RE.test(norm) && !CONSENT_KEYWORD_RE.test(norm)) {
    return null
  }

  for (const t of active) {
    const key = t.procedureType.trim().toLowerCase()
    if (norm.includes(key) || key.includes(norm)) return t
    if (t.content?.aliases?.some((a) => norm.includes(a.trim().toLowerCase()))) return t
  }

  if (CONSENT_KEYWORD_RE.test(norm)) {
    return active[active.length - 1] || null
  }

  return null
}

// API wrappers
export async function fetchConsentTemplates(activeOnly = false): Promise<ConsentTemplateRecord[]> {
  return apiClient.get<ConsentTemplateRecord[]>(`/clinical/consent-templates${activeOnly ? '?activeOnly=true' : ''}`)
}

export async function createConsentTemplateApi(payload: Partial<ConsentTemplateRecord>): Promise<ConsentTemplateRecord> {
  return apiClient.post<ConsentTemplateRecord>('/clinical/consent-templates', payload)
}

export async function updateConsentTemplateApi(
  templateId: string,
  payload: Partial<ConsentTemplateRecord>,
): Promise<ConsentTemplateRecord> {
  return apiClient.patch<ConsentTemplateRecord>(`/clinical/consent-templates/${encodeURIComponent(templateId)}`, payload)
}

export async function generatePatientConsentApi(
  patientId: string,
  payload: {
    procedureName: string
    appointmentId?: string
    treatmentPlanId?: string
    consultationId?: string
    doctorId?: string
    doctorName?: string
    toothNumber?: string
    treatmentArea?: string
    templateId?: string
    notes?: string
  },
) {
  return apiClient.post<any>(`/patients/${encodeURIComponent(patientId)}/consents/generate`, payload)
}

export async function submitPatientSignatureApi(
  patientId: string,
  consentId: string,
  payload: { signatureData: string; signatureMethod: string; accepted: boolean; notes?: string },
) {
  return apiClient.post<any>(
    `/patients/${encodeURIComponent(patientId)}/consents/${encodeURIComponent(consentId)}/sign-patient`,
    payload,
  )
}

export async function submitGuardianSignatureApi(
  patientId: string,
  consentId: string,
  payload: {
    guardianName: string
    guardianRelationship: string
    guardianAuthorized: boolean
    signatureData: string
    signatureMethod: string
    accepted: boolean
  },
) {
  return apiClient.post<any>(
    `/patients/${encodeURIComponent(patientId)}/consents/${encodeURIComponent(consentId)}/sign-guardian`,
    payload,
  )
}

export async function verifyConsentDentistApi(
  patientId: string,
  consentId: string,
  payload: { dentistSignature: string; markCompleted?: boolean; notes?: string },
) {
  return apiClient.post<any>(
    `/patients/${encodeURIComponent(patientId)}/consents/${encodeURIComponent(consentId)}/verify-dentist`,
    payload,
  )
}

export async function declineConsentApi(patientId: string, consentId: string, reason?: string) {
  return apiClient.post<any>(
    `/patients/${encodeURIComponent(patientId)}/consents/${encodeURIComponent(consentId)}/decline`,
    { reason },
  )
}

export async function cancelConsentApi(patientId: string, consentId: string, reason?: string) {
  return apiClient.post<any>(
    `/patients/${encodeURIComponent(patientId)}/consents/${encodeURIComponent(consentId)}/cancel`,
    { reason },
  )
}

export async function replaceConsentApi(patientId: string, consentId: string) {
  return apiClient.post<any>(
    `/patients/${encodeURIComponent(patientId)}/consents/${encodeURIComponent(consentId)}/replace`,
    {},
  )
}

export async function fetchConsentHistoryApi(patientId: string, consentId: string): Promise<ConsentRevisionRecord[]> {
  return apiClient.get<ConsentRevisionRecord[]>(
    `/patients/${encodeURIComponent(patientId)}/consents/${encodeURIComponent(consentId)}/history`,
  )
}

export async function downloadConsentPdfFromBackend(patientId: string, consentId: string, fallbackFileName: string) {
  const blob = await apiClient.downloadBlob(
    `/patients/${encodeURIComponent(patientId)}/consents/${encodeURIComponent(consentId)}/pdf`,
  )
  const blobUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = blobUrl
  a.download = fallbackFileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(blobUrl), 15000)
}

export function generateClientConsentPdf(consent: any, patient?: any) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const snap: ConsentSnapshot = consent.consentContentSnapshot || {}
  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 42
  const contentWidth = pageWidth - margin * 2
  let y = 46

  const ensureSpace = (needed = 40) => {
    if (y + needed > 780) {
      doc.addPage()
      y = 46
    }
  }

  const addHeading = (text: string) => {
    ensureSpace(32)
    y += 6
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(15, 23, 42)
    doc.text(text, margin, y)
    y += 14
  }

  const addBody = (text?: string | null) => {
    if (!text) return
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(51, 65, 85)
    const lines = doc.splitTextToSize(String(text), contentWidth)
    for (const line of lines) {
      ensureSpace(14)
      doc.text(line, margin, y)
      y += 13
    }
    y += 4
  }

  // Header
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(15, 23, 42)
  doc.text(snap.clinic?.name || 'DocMatrix Dental Clinic', margin, y)
  y += 15
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  const clinicMeta = [snap.clinic?.address, snap.clinic?.phone].filter(Boolean).join(' · ')
  if (clinicMeta) {
    doc.text(clinicMeta, margin, y)
    y += 12
  }
  doc.setDrawColor(203, 213, 225)
  doc.line(margin, y, pageWidth - margin, y)
  y += 18

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(15, 23, 42)
  doc.text(snap.title || consent.consentType || 'Informed Dental Consent', margin, y)
  y += 15
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)
  doc.text(
    `Ref: ${consent.documentRef || consent.id}   |   Status: ${getConsentStatusMeta(consent.status).label}   |   Template v${consent.templateVersion ?? 1} / Doc v${consent.documentVersion ?? 1}`,
    margin,
    y,
  )
  y += 16

  addHeading('Patient Information')
  const pName = snap.patient?.name || (patient ? `${patient.firstName} ${patient.lastName}`.trim() : '—')
  const pId = snap.patient?.id || patient?.id || consent.patientId || '—'
  const pAge = snap.patient?.age ?? patient?.age ?? '—'
  const pGender = snap.patient?.gender || patient?.gender || '—'
  const pMobile = snap.patient?.mobile || patient?.mobile || '—'
  const pAddress = snap.patient?.address || patient?.address || '—'
  addBody(`Name: ${pName}   |   Patient ID: ${pId}   |   Age: ${pAge}   |   Gender: ${pGender}`)
  addBody(`Mobile: ${pMobile}   |   Address: ${pAddress}`)

  addHeading('Appointment & Procedure Details')
  addBody(`Procedure: ${consent.procedureName || consent.consentType || '—'}   |   Dentist: ${consent.doctorName || snap.procedure?.dentistName || '—'}`)
  addBody(
    `Appointment Date: ${snap.appointment?.date || consent.dateRecorded || '—'}   |   Time: ${snap.appointment?.time || '—'}   |   Appointment ID: ${snap.appointment?.bookingRef || consent.appointmentId || '—'}`,
  )
  if (snap.appointment?.consultationId || consent.consultationId || consent.toothNumber || snap.procedure?.treatmentPlanTitle) {
    addBody(
      `Consultation ID: ${consent.consultationId || snap.appointment?.consultationId || '—'}   |   Treatment Plan: ${snap.procedure?.treatmentPlanTitle || '—'}   |   Tooth/Area: ${consent.toothNumber || consent.treatmentArea || '—'}`,
    )
  }

  const sec = snap.sections || {}
  if (sec.description) { addHeading('Description of Procedure'); addBody(sec.description) }
  else if (consent.consentText) { addHeading('Consent Details'); addBody(consent.consentText) }
  if (sec.purpose) { addHeading('Purpose of Treatment'); addBody(sec.purpose) }
  if (sec.benefits) { addHeading('Expected Benefits'); addBody(sec.benefits) }
  if (sec.risks) { addHeading('Common Risks and Complications'); addBody(sec.risks) }
  if (sec.alternatives) { addHeading('Alternative Treatment Options'); addBody(sec.alternatives) }
  if (sec.refusalConsequences) { addHeading('Consequences of Refusing or Delaying Treatment'); addBody(sec.refusalConsequences) }
  if (sec.postProcedureInstructions) { addHeading('Post-Procedure Instructions'); addBody(sec.postProcedureInstructions) }
  if (sec.patientDeclaration) { addHeading('Patient Declaration'); addBody(sec.patientDeclaration) }
  if (sec.dentistDeclaration) { addHeading('Dentist Declaration'); addBody(sec.dentistDeclaration) }

  addHeading('Signatures & Verification')
  const pSig = consent.patientSignature || consent.signatureData
  if (pSig && pSig.startsWith('data:image/')) {
    ensureSpace(80)
    addBody(`Patient Signed: ${consent.patientSignedAt ? new Date(consent.patientSignedAt).toLocaleString() : 'Signed'} (${consent.patientSignatureMethod || 'Digital'})`)
    try {
      doc.addImage(pSig, 'PNG', margin, y, 160, 50)
      y += 58
    } catch {
      addBody('[Digital Signature Captured]')
    }
  } else {
    addBody(pSig ? `Patient Signed: ${pSig}` : 'Patient Signature: Pending')
  }

  if (consent.guardianSignature) {
    ensureSpace(80)
    addBody(
      `Guardian Signed: ${consent.guardianName || '—'} (${consent.guardianRelationship || 'Authorized Representative'}) on ${consent.guardianSignedAt ? new Date(consent.guardianSignedAt).toLocaleString() : '—'}`,
    )
    if (consent.guardianSignature.startsWith('data:image/')) {
      try {
        doc.addImage(consent.guardianSignature, 'PNG', margin, y, 160, 50)
        y += 58
      } catch {
        addBody('[Guardian Signature Captured]')
      }
    }
  }

  if (consent.dentistSignature || consent.verifiedAt) {
    ensureSpace(80)
    addBody(
      `Dentist Verified by: ${consent.dentistVerifiedBy || consent.doctorName || 'Dentist'} on ${consent.verifiedAt ? new Date(consent.verifiedAt).toLocaleString() : '—'}`,
    )
    if (consent.dentistSignature?.startsWith('data:image/')) {
      try {
        doc.addImage(consent.dentistSignature, 'PNG', margin, y, 160, 50)
        y += 58
      } catch {
        addBody('[Dentist Signature Captured]')
      }
    }
  } else {
    addBody('Dentist Verification: Pending')
  }

  const safeRef = (consent.documentRef || consent.id || 'consent').replace(/[^a-zA-Z0-9_-]/g, '_')
  doc.save(`Consent_${safeRef}.pdf`)
}
