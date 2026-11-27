export interface ConsentTemplateSeed {
  title: string;
  procedureType: string;
  procedureCategory: 'Oral Surgery' | 'Endodontics' | 'Prosthodontics' | 'Orthodontics' | 'Periodontics' | 'Radiology' | 'Other';
  requiresConsent: boolean;
  guardianRequiredForMinors: boolean;
  aliases: string[];
  description: string;
  purpose: string;
  benefits: string;
  risks: string;
  alternatives: string;
  refusalConsequences: string;
  postProcedureInstructions: string;
  patientDeclaration: string;
  dentistDeclaration: string;
}

const DEFAULT_PATIENT_DECLARATION =
  'I confirm that I have read and understood the nature, purpose, benefits, risks, and alternatives of the planned dental procedure. I have had the opportunity to ask questions, and all my questions have been answered to my satisfaction. I voluntarily consent to undergo the procedure described above.';

const DEFAULT_DENTIST_DECLARATION =
  'I confirm that I have explained the nature, purpose, expected benefits, material risks, complications, alternatives, and consequences of refusal of the planned procedure to the patient or authorized guardian, and have verified their informed consent prior to treatment.';

export const DEFAULT_CONSENT_TEMPLATES: ConsentTemplateSeed[] = [
  // Surgical Procedures
  {
    title: 'Informed Consent for Tooth Extraction',
    procedureType: 'Tooth Extraction',
    procedureCategory: 'Oral Surgery',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    aliases: ['tooth extraction (simple)', 'simple extraction', 'simple tooth extraction', 'd7140'],
    description: 'Removal of an erupted tooth from its alveolar socket under local anesthesia using forceps and elevators.',
    purpose: 'To remove a non-restorable, severely decayed, fractured, or periodontally compromised tooth and eliminate infection or pain.',
    benefits: 'Elimination of dental pain, resolution of infection, and prevention of spread of pathology to adjacent teeth or bone.',
    risks: 'Post-operative pain, swelling, bleeding, bruising, dry socket (alveolar osteitis), infection, injury to adjacent teeth or restorations, and temporary or rare permanent numbness if close to nerves.',
    alternatives: 'Root canal treatment with crown restoration (if restorable), periodontal therapy, or no treatment.',
    refusalConsequences: 'Persistent or worsening pain, spread of abscess/infection to surrounding tissues, bone loss, and potential systemic infection.',
    postProcedureInstructions: 'Bite firmly on gauze for 30–45 minutes. Avoid rinsing, spitting, smoking, or using straws for 24 hours. Apply ice packs intermittently and take prescribed medications as directed.',
    patientDeclaration: DEFAULT_PATIENT_DECLARATION,
    dentistDeclaration: DEFAULT_DENTIST_DECLARATION,
  },
  {
    title: 'Informed Consent for Surgical Tooth Extraction',
    procedureType: 'Surgical Tooth Extraction',
    procedureCategory: 'Oral Surgery',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    aliases: ['surgical extraction', 'surgical extraction / flap elevation', 'd7210', 'complex extraction'],
    description: 'Surgical removal of a broken-down, ankylosed, or retained root/tooth involving soft tissue flap reflection, controlled bone removal, or tooth sectioning, followed by suturing.',
    purpose: 'To safely remove a tooth or retained root that cannot be extracted by simple non-surgical means.',
    benefits: 'Complete removal of non-salvageable tooth structure, elimination of chronic infection, and preparation of the site for healing or future prosthesis.',
    risks: 'Swelling, trismus (limited mouth opening), post-operative bleeding, dry socket, infection, sinus communication (for upper posterior teeth), and temporary or rare permanent altered sensation of lip, chin, or tongue.',
    alternatives: 'Coronectomy in selected cases, endodontic/prosthetic salvage if feasible, or observation with symptomatic care.',
    refusalConsequences: 'Progressive infection, cyst formation, bone resorption, and worsening pain or swelling.',
    postProcedureInstructions: 'Maintain firm gauze pressure for 45 minutes. Soft, cool diet for 48 hours. Sleep with head elevated. Attend suture removal follow-up as scheduled.',
    patientDeclaration: DEFAULT_PATIENT_DECLARATION,
    dentistDeclaration: DEFAULT_DENTIST_DECLARATION,
  },
  {
    title: 'Informed Consent for Wisdom Tooth Extraction',
    procedureType: 'Wisdom Tooth Extraction',
    procedureCategory: 'Oral Surgery',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    aliases: ['surgical wisdom tooth removal', 'wisdom tooth removal', 'impacted third molar removal', 'third molar extraction', 'd7240'],
    description: 'Surgical removal of an erupted, partially erupted, or impacted third molar (wisdom tooth) under local anesthesia, involving mucosal flap elevation, bone guttering, tooth sectioning, and suturing.',
    purpose: 'To treat or prevent pericoronitis, caries on adjacent second molars, cyst/pathology formation, or crowding/pain caused by impacted wisdom teeth.',
    benefits: 'Relief from recurrent pericoronitis and pain, protection of adjacent second molars, and prevention of cystic or periodontal damage.',
    risks: 'Post-operative swelling, bruising, trismus, dry socket, infection, damage to adjacent second molar restoration, oro-antral communication (upper), and temporary or rarely permanent inferior alveolar/lingual nerve paresthesia (lower).',
    alternatives: 'Operculectomy, coronectomy (intentional root retention near nerve), or periodic radiographic monitoring if asymptomatic.',
    refusalConsequences: 'Recurrent pericoronitis, deep caries or root resorption of the adjacent second molar, periodontal bone loss, and potential space infection.',
    postProcedureInstructions: 'Apply cold compress externally for the first 24 hours. Avoid vigorous rinsing, smoking, and hard/spicy foods for 5–7 days. Begin warm saline rinses after 24 hours and return for suture removal.',
    patientDeclaration: DEFAULT_PATIENT_DECLARATION,
    dentistDeclaration: DEFAULT_DENTIST_DECLARATION,
  },
  {
    title: 'Informed Consent for Dental Implant Surgery',
    procedureType: 'Dental Implant Surgery',
    procedureCategory: 'Oral Surgery',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    aliases: ['dental implant', 'implant placement', 'implant surgery', 'tooth implant'],
    description: 'Surgical placement of a biocompatible titanium or zirconia root-form implant into the jawbone to support a future crown, bridge, or prosthesis.',
    purpose: 'To replace missing tooth roots and restore chewing function, speech, and aesthetics without relying on adjacent healthy teeth.',
    benefits: 'Fixed, stable tooth replacement, preservation of jawbone volume, and natural aesthetics and biting efficiency.',
    risks: 'Failure of osseointegration, infection/peri-implantitis, bleeding, swelling, sinus perforation (upper jaw), nerve injury causing numbness/tingling (lower jaw), and need for additional grafting or implant replacement.',
    alternatives: 'Fixed dental bridge, removable partial or complete denture, or leaving the space edentulous.',
    refusalConsequences: 'Continued bone resorption in the edentulous area, shifting/over-eruption of neighboring teeth, and reduced chewing efficiency.',
    postProcedureInstructions: 'Avoid disturbing the surgical site or chewing on the implant side. Maintain gentle oral hygiene with prescribed chlorhexidine rinse. Attend osseointegration review appointments.',
    patientDeclaration: DEFAULT_PATIENT_DECLARATION,
    dentistDeclaration: DEFAULT_DENTIST_DECLARATION,
  },
  {
    title: 'Informed Consent for Bone Grafting',
    procedureType: 'Bone Grafting',
    procedureCategory: 'Oral Surgery',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    aliases: ['alveolar bone graft', 'socket preservation', 'ridge augmentation', 'gbr'],
    description: 'Surgical placement of autogenous, allograft, xenograft, or synthetic bone graft material and barrier membrane to rebuild deficient jawbone.',
    purpose: 'To restore bone height and width required for dental implant placement or to preserve alveolar ridge architecture after extraction.',
    benefits: 'Improved bone volume and density for stable implant support and enhanced prosthetic outcomes.',
    risks: 'Graft infection, membrane exposure, partial or complete graft resorption/failure, swelling, bruising, and donor-site discomfort if autogenous bone is used.',
    alternatives: 'Short/narrow implants without grafting, conventional bridgework, or removable prosthesis.',
    refusalConsequences: 'Insufficient bone volume for implant placement and progressive ridge collapse.',
    postProcedureInstructions: 'Do not press or pull the lip over the grafted site. Avoid smoking, straws, and hard foods. Complete the full antibiotic course.',
    patientDeclaration: DEFAULT_PATIENT_DECLARATION,
    dentistDeclaration: DEFAULT_DENTIST_DECLARATION,
  },
  {
    title: 'Informed Consent for Sinus Lift',
    procedureType: 'Sinus Lift',
    procedureCategory: 'Oral Surgery',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    aliases: ['sinus augmentation', 'maxillary sinus lift', 'direct sinus lift', 'indirect sinus lift'],
    description: 'Surgical elevation of the maxillary sinus Schneiderian membrane and placement of bone graft material in the posterior upper jaw.',
    purpose: 'To increase vertical bone height below the maxillary sinus for safe placement of dental implants.',
    benefits: 'Enables implant-supported restoration in posterior maxilla sites with limited residual bone.',
    risks: 'Sinus membrane perforation, acute or chronic maxillary sinusitis, nasal bleeding, graft migration or failure, oro-antral fistula, and facial swelling.',
    alternatives: 'Short implants, zygomatic/tilted implants, removable partial denture, or no posterior replacement.',
    refusalConsequences: 'Inability to place standard implants in the posterior maxilla and continued bone loss.',
    postProcedureInstructions: 'Do NOT blow your nose or sneeze with mouth closed for 2 weeks. Avoid straws, smoking, and air travel/diving as advised. Use prescribed nasal decongestants and antibiotics.',
    patientDeclaration: DEFAULT_PATIENT_DECLARATION,
    dentistDeclaration: DEFAULT_DENTIST_DECLARATION,
  },
  {
    title: 'Informed Consent for Periodontal Surgery',
    procedureType: 'Periodontal Surgery',
    procedureCategory: 'Periodontics',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    aliases: ['flap surgery', 'gingivectomy', 'crown lengthening', 'periodontal flap'],
    description: 'Surgical reflection of gum tissue to access deep periodontal pockets, remove calculus/granulation tissue, recontour bone if needed, and reposition/suture the gingiva.',
    purpose: 'To eliminate deep periodontal pockets, arrest bone loss, and facilitate effective plaque control around teeth.',
    benefits: 'Reduction of pocket depth, improved gum health, and extended longevity of natural teeth.',
    risks: 'Gum recession, increased tooth sensitivity to cold/sweet, temporary tooth mobility, swelling, bleeding, and altered aesthetic contour (black triangles).',
    alternatives: 'Non-surgical scaling and root planing with localized antimicrobials, or extraction of hopeless teeth.',
    refusalConsequences: 'Continued periodontal bone destruction, abscess formation, and eventual tooth loss.',
    postProcedureInstructions: 'Avoid brushing directly over the surgical dressing/sutures until reviewed. Use prescribed antiseptic rinse and soft diet.',
    patientDeclaration: DEFAULT_PATIENT_DECLARATION,
    dentistDeclaration: DEFAULT_DENTIST_DECLARATION,
  },
  {
    title: 'Informed Consent for Oral Surgery',
    procedureType: 'Oral Surgery',
    procedureCategory: 'Oral Surgery',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    aliases: ['minor oral surgery', 'incision and drainage', 'biopsy', 'frenectomy', 'cyst enucleation', 'odontectomy'],
    description: 'Surgical intervention within the oral cavity (such as soft-tissue excision, biopsy, frenectomy, cyst removal, or abscess drainage) under local anesthesia.',
    purpose: 'To diagnose, remove, or treat pathological, anatomical, or infectious oral conditions.',
    benefits: 'Resolution of pathology/infection, histological diagnosis where applicable, and improved oral function.',
    risks: 'Bleeding, swelling, pain, infection, scarring, delayed healing, recurrence of lesion, or localized nerve sensitivity.',
    alternatives: 'Conservative medication, observation, or referral for general anesthesia if indicated.',
    refusalConsequences: 'Progression of underlying pathology, persistent infection, or delayed diagnosis.',
    postProcedureInstructions: 'Follow wound-care, diet, and medication instructions provided. Return for pathology review or suture removal.',
    patientDeclaration: DEFAULT_PATIENT_DECLARATION,
    dentistDeclaration: DEFAULT_DENTIST_DECLARATION,
  },
  {
    title: 'Informed Consent for Apicoectomy',
    procedureType: 'Apicoectomy',
    procedureCategory: 'Oral Surgery',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    aliases: ['periapical surgery', 'root-end resection', 'endodontic microsurgery'],
    description: 'Surgical removal of the root apex and surrounding periapical lesion, followed by root-end preparation and biocompatible retrograde filling.',
    purpose: 'To save a previously root-canal-treated tooth with persistent periapical infection or cyst where non-surgical retreatment is not feasible.',
    benefits: 'Preservation of the natural tooth and elimination of chronic apical inflammation.',
    risks: 'Persistent infection requiring extraction, gum recession exposing crown margin, swelling, bruising, sinus proximity issues, or nerve irritation.',
    alternatives: 'Non-surgical endodontic retreatment or tooth extraction.',
    refusalConsequences: 'Persistent periapical abscess, expanding bone defect, and eventual tooth loss.',
    postProcedureInstructions: 'Apply ice pack for 24 hours, avoid lifting the lip to inspect sutures, and attend radiographic healing follow-ups.',
    patientDeclaration: DEFAULT_PATIENT_DECLARATION,
    dentistDeclaration: DEFAULT_DENTIST_DECLARATION,
  },

  // Other Dental Procedures
  {
    title: 'Informed Consent for Root Canal Treatment',
    procedureType: 'Root Canal Treatment',
    procedureCategory: 'Endodontics',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    aliases: ['root canal treatment (single sitting)', 'root canal therapy', 'rct', 'endodontic therapy', 'd3310', 'd3320', 'd3330'],
    description: 'Removal of infected or inflamed pulp tissue from the root canal system, mechanical and chemical disinfection, and three-dimensional obturation.',
    purpose: 'To eliminate pulpal pain/infection and retain the natural tooth in function.',
    benefits: 'Pain relief, eradication of root canal infection, and preservation of the natural tooth.',
    risks: 'Post-operative soreness, flare-up swelling, instrument separation inside curved/calcified canals, root perforation, missed accessory canals, tooth fracture if not crowned, and possibility of retreatment or extraction.',
    alternatives: 'Tooth extraction (with or without replacement) or no treatment.',
    refusalConsequences: 'Severe toothache, periapical abscess, facial swelling, and eventual loss of the tooth.',
    postProcedureInstructions: 'Avoid chewing hard foods on the treated tooth until the final crown/restoration is placed. Take prescribed analgesics if needed.',
    patientDeclaration: DEFAULT_PATIENT_DECLARATION,
    dentistDeclaration: DEFAULT_DENTIST_DECLARATION,
  },
  {
    title: 'Informed Consent for Crown and Bridge',
    procedureType: 'Crown and Bridge',
    procedureCategory: 'Prosthodontics',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    aliases: ['crown & bridge preparation', 'dental crown', 'fixed partial denture', 'pfm crown', 'zirconia crown', 'd2740', 'd2750'],
    description: 'Preparation (reduction) of tooth structure, impression/digital scanning, temporary prosthesis placement, and cementation of a custom-fabricated crown or bridge.',
    purpose: 'To protect weakened/root-canal-treated teeth or replace missing teeth using adjacent abutment teeth.',
    benefits: 'Restored tooth strength, chewing efficiency, occlusion, and aesthetics.',
    risks: 'Post-preparation sensitivity, need for root canal treatment if pulp becomes irritated, porcelain chipping, debonding/cement washout, marginal discoloration, or recurrent decay.',
    alternatives: 'Direct composite restoration, dental implant, or removable partial denture.',
    refusalConsequences: 'Fracture of weakened tooth structure, drifting of adjacent teeth, and compromised bite.',
    postProcedureInstructions: 'Be gentle with temporary crowns (avoid sticky/hard foods). Maintain flossing and interdental hygiene around bridge pontics.',
    patientDeclaration: DEFAULT_PATIENT_DECLARATION,
    dentistDeclaration: DEFAULT_DENTIST_DECLARATION,
  },
  {
    title: 'Informed Consent for Denture Treatment',
    procedureType: 'Denture Treatment',
    procedureCategory: 'Prosthodontics',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    aliases: ['complete denture', 'removable partial denture', 'cast partial denture', 'denture'],
    description: 'Fabrication and fitting of a removable complete or partial prosthesis supported by oral mucosa and/or remaining teeth.',
    purpose: 'To replace multiple or all missing teeth and restore facial support, speech, and mastication.',
    benefits: 'Improved appearance, speech clarity, and ability to chew a wider variety of foods.',
    risks: 'Initial sore spots requiring adjustments, gagging or speech adaptation period, lower denture looseness due to ridge resorption, clasp wear on abutment teeth, and periodic relining needs.',
    alternatives: 'Implant-supported overdenture or fixed implant bridgework.',
    refusalConsequences: 'Impaired nutrition/chewing, collapsed facial vertical dimension, and shifting of remaining teeth.',
    postProcedureInstructions: 'Remove dentures at night to rest oral tissues. Clean daily with non-abrasive denture cleanser and soak in water when not worn.',
    patientDeclaration: DEFAULT_PATIENT_DECLARATION,
    dentistDeclaration: DEFAULT_DENTIST_DECLARATION,
  },
  {
    title: 'Informed Consent for Orthodontic Treatment',
    procedureType: 'Orthodontic Treatment',
    procedureCategory: 'Orthodontics',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    aliases: ['orthodontic bracket adjustment', 'clear aligner scan & assessment', 'braces', 'clear aligners', 'orthodontics'],
    description: 'Application of fixed orthodontic brackets/wires or removable clear aligners to gradually move teeth and align the bite over an estimated treatment duration.',
    purpose: 'To correct malocclusion, crowding, spacing, or jaw alignment discrepancies.',
    benefits: 'Improved dental alignment, bite function, oral hygiene access, and smile aesthetics.',
    risks: 'Decalcification/white spot lesions if hygiene is poor, root resorption, gum inflammation, temporary discomfort/ulcers, relapse without retainers, and extended treatment time if appointments/wear are missed.',
    alternatives: 'No orthodontic treatment, limited cosmetic bonding/veneers, or orthognathic surgery for severe skeletal discrepancies.',
    refusalConsequences: 'Continued crowding, uneven tooth wear, difficulty cleaning, and persistent bite imbalance.',
    postProcedureInstructions: 'Brush after every meal, avoid hard/sticky foods with braces, wear elastics/aligners as prescribed, and wear retainers long-term after completion.',
    patientDeclaration: DEFAULT_PATIENT_DECLARATION,
    dentistDeclaration: DEFAULT_DENTIST_DECLARATION,
  },
  {
    title: 'Informed Consent for Scaling and Root Planing',
    procedureType: 'Scaling and Root Planing',
    procedureCategory: 'Periodontics',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    aliases: ['deep cleaning', 'subgingival scaling', 'root planing', 'periodontal scaling'],
    description: 'Deep non-surgical periodontal debridement under local anesthesia to remove subgingival calculus, plaque biofilm, and endotoxins from root surfaces.',
    purpose: 'To control periodontal inflammation, reduce pocket depths, and halt progressive bone loss.',
    benefits: 'Healthier gums, reduced bleeding, fresher breath, and stabilization of periodontal support.',
    risks: 'Temporary bleeding, gum soreness, mild gingival shrinkage exposing root surfaces, and transient thermal sensitivity.',
    alternatives: 'Routine supragingival scaling (insufficient for deep pockets) or periodontal surgery.',
    refusalConsequences: 'Progression of periodontitis, deeper pockets, bone loss, and tooth mobility.',
    postProcedureInstructions: 'Use desensitizing toothpaste if sensitive, rinse with warm saline/antiseptic as advised, and maintain 3–6 month periodontal maintenance visits.',
    patientDeclaration: DEFAULT_PATIENT_DECLARATION,
    dentistDeclaration: DEFAULT_DENTIST_DECLARATION,
  },
  {
    title: 'Informed Consent for Dental Radiography',
    procedureType: 'Dental Radiography',
    procedureCategory: 'Radiology',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    aliases: ['iopa', 'intraoral periapical x-ray', 'opg', 'panoramic x-ray', 'bitewing x-ray', 'dental x-ray'],
    description: 'Acquisition of diagnostic two-dimensional dental X-ray images (IOPA, Bitewing, or OPG) using low-dose digital radiation with protective shielding as indicated.',
    purpose: 'To visualize caries, root anatomy, periapical bone, impacted teeth, and restorations not visible clinically.',
    benefits: 'Accurate diagnosis and safe treatment planning with minimal radiation exposure.',
    risks: 'Minimal ionizing radiation exposure; pregnancy must be disclosed prior to imaging so appropriate precautions or deferral can be applied.',
    alternatives: 'Clinical examination alone (limited diagnostic accuracy for hidden pathology).',
    refusalConsequences: 'Undetected root/bone pathology, missed fractures, or inability to safely perform root canal/extraction.',
    postProcedureInstructions: 'No special post-imaging restrictions. Review radiographic findings with your dentist.',
    patientDeclaration: DEFAULT_PATIENT_DECLARATION,
    dentistDeclaration: DEFAULT_DENTIST_DECLARATION,
  },
  {
    title: 'Informed Consent for CBCT Imaging',
    procedureType: 'CBCT Imaging',
    procedureCategory: 'Radiology',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    aliases: ['cbct', 'cone beam ct', '3d dental scan', 'cone beam computed tomography'],
    description: 'Three-dimensional Cone Beam Computed Tomography (CBCT) scan of the jaws, teeth, sinus, and nerve pathways.',
    purpose: 'To obtain high-resolution 3D anatomical measurements for implant planning, impacted tooth/nerve assessment, endodontic evaluation, or pathology.',
    benefits: 'Precise 3D visualization reducing surgical risks near nerves and sinuses.',
    risks: 'Higher ionizing radiation dose than standard 2D dental X-rays (though lower than medical CT); pregnancy must be disclosed prior to scanning.',
    alternatives: '2D panoramic/periapical radiographs (may lack 3D depth information).',
    refusalConsequences: 'Less precise anatomical mapping prior to complex surgery or implant placement.',
    postProcedureInstructions: 'No post-scan restrictions. Your dentist will review the 3D scan with you.',
    patientDeclaration: DEFAULT_PATIENT_DECLARATION,
    dentistDeclaration: DEFAULT_DENTIST_DECLARATION,
  },
  {
    title: 'Informed Consent for Other Consent-Required Procedures',
    procedureType: 'Other consent-required procedures',
    procedureCategory: 'Other',
    requiresConsent: true,
    guardianRequiredForMinors: true,
    aliases: ['other consent-required procedure', 'general surgical consent', 'sedation consent', 'invasive dental procedure'],
    description: 'Specialized or invasive dental procedure as detailed in the patient’s treatment plan and clinical consultation notes.',
    purpose: 'To address the diagnosed dental condition as discussed with the treating dentist.',
    benefits: 'Resolution of the clinical problem and restoration of oral health and function.',
    risks: 'Procedure-specific risks including pain, swelling, bleeding, infection, sensitivity, or incomplete resolution as explained by the clinician.',
    alternatives: 'Alternative restorative, surgical, or conservative options discussed during consultation.',
    refusalConsequences: 'Progression of the underlying dental condition.',
    postProcedureInstructions: 'Follow all written and verbal post-procedure instructions provided by your dentist.',
    patientDeclaration: DEFAULT_PATIENT_DECLARATION,
    dentistDeclaration: DEFAULT_DENTIST_DECLARATION,
  },
];

const ORDINARY_EXCLUSION_PATTERN =
  /\b(routine|check-?up|examination|consultation|polishing|scaling\s*&\s*polishing|whitening|bleaching|fluoride|sealant|filling|restoration|emergency pain relief)\b/i;

const CONSENT_REQUIRED_KEYWORDS =
  /\b(extract|extraction|wisdom|third molar|implant|bone graft|grafting|sinus lift|periodontal surgery|flap surgery|gingivectomy|crown lengthening|oral surgery|apicoectomy|root canal|rct|endodontic|crown\s*(&|and)\s*bridge|denture|orthodontic|aligner|braces|scaling and root planing|root planing|radiograph|x-?ray|iopa|opg|cbct|cone beam|surgery|surgical|biopsy|frenectomy|odontectomy|cyst)\b/i;

export function normalizeProcedureKey(value?: string | null): string {
  return (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function matchDefaultConsentTemplate(procedureName?: string | null): ConsentTemplateSeed | null {
  const normalized = normalizeProcedureKey(procedureName);
  if (!normalized) return null;

  // Exact match on procedureType or alias
  for (const tpl of DEFAULT_CONSENT_TEMPLATES) {
    if (normalizeProcedureKey(tpl.procedureType) === normalized) return tpl;
    if (tpl.aliases.some((alias) => normalizeProcedureKey(alias) === normalized)) return tpl;
  }

  // Partial match (avoid matching ordinary non-consent procedures)
  if (ORDINARY_EXCLUSION_PATTERN.test(normalized) && !CONSENT_REQUIRED_KEYWORDS.test(normalized)) {
    return null;
  }

  for (const tpl of DEFAULT_CONSENT_TEMPLATES) {
    const typeKey = normalizeProcedureKey(tpl.procedureType);
    if (normalized.includes(typeKey) || typeKey.includes(normalized)) return tpl;
    if (tpl.aliases.some((alias) => normalized.includes(normalizeProcedureKey(alias)))) return tpl;
  }

  if (CONSENT_REQUIRED_KEYWORDS.test(normalized)) {
    return DEFAULT_CONSENT_TEMPLATES[DEFAULT_CONSENT_TEMPLATES.length - 1];
  }

  return null;
}

export function isConsentRequiredProcedure(procedureName?: string | null): boolean {
  return matchDefaultConsentTemplate(procedureName) !== null;
}
