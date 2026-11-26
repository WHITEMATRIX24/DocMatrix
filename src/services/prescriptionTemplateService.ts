/**
 * DocMatrix Dental Practice Management System
 * Reusable Prescription Templates Service
 *
 * Provides standard, clinically validated procedure-specific prescription
 * templates for dental practices, which clinicians can preview, customize for individual
 * patients, and save for repeated clinical workflows.
 */

export interface PrescriptionTemplateItem {
  medicineName: string;
  strength: string;
  dosage: string;
  route: string;
  frequency: string;
  duration: string;
  quantity: number;
  instructions: string;
  purpose?: string; // 'Antibiotic' | 'Analgesic / Anti-inflammatory' | 'Antacid / Gastroprotective' | 'Antiseptic Rinse' | 'Topical' | 'Nutritional'
}

export type DentalProcedureCategory =
  | 'Endodontics'
  | 'Oral Surgery'
  | 'Periodontics'
  | 'Prosthodontics'
  | 'General'
  | 'Pediatric';

export interface PrescriptionTemplate {
  id: string;
  title: string;
  procedureName: string;
  procedureCategory: DentalProcedureCategory;
  cdtCode?: string;
  defaultDiagnosis: string;
  defaultClinicalNotes: string;
  description: string;
  cautionNotes?: string;
  allergyTriggers?: string[]; // e.g. ['penicillin', 'amoxicillin', 'clavulanic']
  items: PrescriptionTemplateItem[];
  isCustom?: boolean;
  createdAt?: string;
}

export const DENTAL_PROCEDURE_CATEGORIES: DentalProcedureCategory[] = [
  'Endodontics',
  'Oral Surgery',
  'Periodontics',
  'Prosthodontics',
  'General',
  'Pediatric',
];

export const STANDARD_PRESCRIPTION_TEMPLATES: PrescriptionTemplate[] = [
  {
    id: 'rx-tpl-rct-std',
    title: 'Root Canal Treatment (Standard Adult Regimen)',
    procedureName: 'Root Canal Therapy / Endodontic Access',
    procedureCategory: 'Endodontics',
    cdtCode: 'D3310 / D3320 / D3330',
    defaultDiagnosis: 'Acute Irreversible Pulpitis with Symptomatic Apical Periodontitis',
    defaultClinicalNotes: 'Biomechanical instrumentation and intracanal dressing completed under rubber dam.',
    description: 'First-line antibiotic coverage, dual-action NSAID pain relief, and gastric mucosal protection.',
    cautionNotes: 'Ensure patient is not allergic to Beta-Lactam / Penicillin antibiotics.',
    allergyTriggers: ['penicillin', 'amoxicillin', 'amox'],
    items: [
      {
        medicineName: 'Amoxicillin',
        strength: '500 mg',
        dosage: '1 capsule',
        route: 'Oral',
        frequency: '1-0-1 (Twice daily)',
        duration: '5 days',
        quantity: 10,
        instructions: 'Take strictly after meals with a full glass of water. Complete full course.',
        purpose: 'Antibiotic (Broad Spectrum)',
      },
      {
        medicineName: 'Aceclofenac + Paracetamol (Zerodol-P)',
        strength: '100 mg + 325 mg',
        dosage: '1 tablet',
        route: 'Oral',
        frequency: '1-0-1 (Twice daily)',
        duration: '3 days',
        quantity: 6,
        instructions: 'Take after meals for throbbing toothache and apical inflammation.',
        purpose: 'Analgesic & Anti-inflammatory',
      },
      {
        medicineName: 'Pantoprazole',
        strength: '40 mg',
        dosage: '1 tablet',
        route: 'Oral',
        frequency: '1-0-0 (Morning only)',
        duration: '5 days',
        quantity: 5,
        instructions: 'Take 30 minutes before breakfast on an empty stomach.',
        purpose: 'Gastroprotective (PPI)',
      },
    ],
  },
  {
    id: 'rx-tpl-rct-pen-allergic',
    title: 'Root Canal Treatment (Penicillin-Allergic Alternative)',
    procedureName: 'Root Canal Therapy (Penicillin Sensitive)',
    procedureCategory: 'Endodontics',
    cdtCode: 'D3310 / D3330',
    defaultDiagnosis: 'Acute Irreversible Pulpitis in Penicillin-Allergic Patient',
    defaultClinicalNotes: 'Lincosamide substitution selected due to confirmed beta-lactam hypersensitivity.',
    description: 'Safe alternative antibiotic (Clindamycin) for patients with penicillin or cephalosporin allergies.',
    cautionNotes: 'Drink plenty of water with Clindamycin to prevent esophageal irritation.',
    allergyTriggers: ['clindamycin'],
    items: [
      {
        medicineName: 'Clindamycin',
        strength: '300 mg',
        dosage: '1 capsule',
        route: 'Oral',
        frequency: '1-0-1 (Twice daily)',
        duration: '5 days',
        quantity: 10,
        instructions: 'Take with a tall glass of water. Do not lie down for 30 minutes after taking.',
        purpose: 'Antibiotic (Lincosamide Alternative)',
      },
      {
        medicineName: 'Aceclofenac + Paracetamol',
        strength: '100 mg + 325 mg',
        dosage: '1 tablet',
        route: 'Oral',
        frequency: '1-0-1 (Twice daily)',
        duration: '3 days',
        quantity: 6,
        instructions: 'Take after food for post-instrumentation pain relief.',
        purpose: 'Analgesic & Anti-inflammatory',
      },
      {
        medicineName: 'Pantoprazole',
        strength: '40 mg',
        dosage: '1 tablet',
        route: 'Oral',
        frequency: '1-0-0 (Morning only)',
        duration: '5 days',
        quantity: 5,
        instructions: 'Take 30 minutes before morning breakfast.',
        purpose: 'Gastroprotective (PPI)',
      },
    ],
  },
  {
    id: 'rx-tpl-extraction-routine',
    title: 'Routine Tooth Extraction (Simple Exodontia)',
    procedureName: 'Simple Tooth Extraction',
    procedureCategory: 'Oral Surgery',
    cdtCode: 'D7140',
    defaultDiagnosis: 'Post-Extraction Pain Management & Hemostasis Care',
    defaultClinicalNotes: 'Uncomplicated closed extraction under 2% Lignocaine with adrenaline.',
    description: 'Fast pain relief with NSAIDs, gastric shield, and gentle chlorhexidine oral antiseptic.',
    cautionNotes: 'Advise patient not to rinse vigorously in first 24 hours to protect socket blood clot.',
    items: [
      {
        medicineName: 'Ibuprofen + Paracetamol (Combiflam)',
        strength: '400 mg + 325 mg',
        dosage: '1 tablet',
        route: 'Oral',
        frequency: '1-0-1 (Twice daily)',
        duration: '3 days',
        quantity: 6,
        instructions: 'Take after meals for pain and post-extraction swelling.',
        purpose: 'Analgesic & Anti-inflammatory',
      },
      {
        medicineName: 'Pantoprazole',
        strength: '40 mg',
        dosage: '1 tablet',
        route: 'Oral',
        frequency: '1-0-0 (Morning only)',
        duration: '3 days',
        quantity: 3,
        instructions: 'Take 30 minutes prior to morning meal.',
        purpose: 'Gastroprotective (PPI)',
      },
      {
        medicineName: 'Chlorhexidine Gluconate 0.2% Mouthwash',
        strength: '0.2% w/v',
        dosage: '10 ml',
        route: 'Topical',
        frequency: '1-0-1 (Twice daily)',
        duration: '5 days',
        quantity: 1,
        instructions: 'Gently bathe mouth without vigorous swishing starting 24 hours after extraction.',
        purpose: 'Antiseptic Oral Rinse',
      },
    ],
  },
  {
    id: 'rx-tpl-surgical-impaction',
    title: 'Surgical Third Molar Impaction (Wisdom Tooth Surgery)',
    procedureName: 'Surgical Extraction / Impaction',
    procedureCategory: 'Oral Surgery',
    cdtCode: 'D7210 / D7240',
    defaultDiagnosis: 'Post-Surgical Care following Mandibular/Maxillary Disimpaction',
    defaultClinicalNotes: 'Full-thickness mucoperiosteal flap, bone guttering, tooth sectioning and suture placement.',
    description: 'High-strength Augmentin 625mg antibiotic prophylaxis, anti-edema enzyme formulation, and PPI.',
    cautionNotes: 'Contains Amoxicillin + Clavulanic acid. Do not administer to penicillin-allergic patients.',
    allergyTriggers: ['penicillin', 'amoxicillin', 'augmentin', 'clavulanate'],
    items: [
      {
        medicineName: 'Amoxicillin + Potassium Clavulanate (Augmentin)',
        strength: '625 mg',
        dosage: '1 tablet',
        route: 'Oral',
        frequency: '1-0-1 (Twice daily)',
        duration: '5 days',
        quantity: 10,
        instructions: 'Take after meals with water. Complete full 5-day course.',
        purpose: 'Antibiotic (Broad Spectrum + Beta-lactamase inhibitor)',
      },
      {
        medicineName: 'Aceclofenac + Paracetamol + Serratiopeptidase',
        strength: '100 mg + 325 mg + 15 mg',
        dosage: '1 tablet',
        route: 'Oral',
        frequency: '1-0-1 (Twice daily)',
        duration: '4 days',
        quantity: 8,
        instructions: 'Take strictly after meals. Reduces post-surgical facial swelling and pain.',
        purpose: 'Analgesic, Anti-inflammatory & Anti-edema',
      },
      {
        medicineName: 'Pantoprazole',
        strength: '40 mg',
        dosage: '1 tablet',
        route: 'Oral',
        frequency: '1-0-0 (Morning only)',
        duration: '5 days',
        quantity: 5,
        instructions: 'Take 30 minutes before breakfast.',
        purpose: 'Gastroprotective (PPI)',
      },
      {
        medicineName: 'Chlorhexidine Gluconate 0.2% Oral Rinse',
        strength: '0.2%',
        dosage: '10 ml',
        route: 'Topical',
        frequency: '1-0-1 (Twice daily)',
        duration: '7 days',
        quantity: 1,
        instructions: 'Start after 24 hours. Hold gently in mouth for 60 seconds twice daily.',
        purpose: 'Antiseptic Oral Rinse',
      },
    ],
  },
  {
    id: 'rx-tpl-periapical-abscess',
    title: 'Acute Dentoalveolar Abscess & Space Infection',
    procedureName: 'Abscess Drainage & Severe Infection',
    procedureCategory: 'General',
    cdtCode: 'D7510',
    defaultDiagnosis: 'Acute Dentoalveolar Abscess with Moderate Swelling',
    defaultClinicalNotes: 'Incision and drainage performed or canal opened for exudate evacuation.',
    description: 'Dual aerobic + anaerobic antibiotic coverage (Amoxicillin + Metronidazole) for oral infections.',
    cautionNotes: 'Metronidazole carries severe disulfiram-like reaction with alcohol. Warn patient strictly.',
    allergyTriggers: ['penicillin', 'amoxicillin', 'metronidazole'],
    items: [
      {
        medicineName: 'Amoxicillin',
        strength: '500 mg',
        dosage: '1 capsule',
        route: 'Oral',
        frequency: '1-1-1 (Three times daily)',
        duration: '5 days',
        quantity: 15,
        instructions: 'Take every 8 hours after food with water.',
        purpose: 'Antibiotic (Aerobic Coverage)',
      },
      {
        medicineName: 'Metronidazole (Flagyl)',
        strength: '400 mg',
        dosage: '1 tablet',
        route: 'Oral',
        frequency: '1-1-1 (Three times daily)',
        duration: '5 days',
        quantity: 15,
        instructions: 'Take with food. STRICTLY avoid any alcoholic beverages during therapy.',
        purpose: 'Antibiotic (Anaerobic Odontogenic Coverage)',
      },
      {
        medicineName: 'Aceclofenac + Paracetamol',
        strength: '100 mg + 325 mg',
        dosage: '1 tablet',
        route: 'Oral',
        frequency: '1-0-1 (Twice daily)',
        duration: '3 days',
        quantity: 6,
        instructions: 'Take after meals for severe throbbing ache and fever.',
        purpose: 'Analgesic & Anti-inflammatory',
      },
      {
        medicineName: 'Pantoprazole',
        strength: '40 mg',
        dosage: '1 tablet',
        route: 'Oral',
        frequency: '1-0-0 (Morning only)',
        duration: '5 days',
        quantity: 5,
        instructions: 'Take 30 minutes before morning meal.',
        purpose: 'Gastroprotective (PPI)',
      },
    ],
  },
  {
    id: 'rx-tpl-dental-implant',
    title: 'Dental Implant Placement & Bone Augmentation',
    procedureName: 'Dental Implant Surgery',
    procedureCategory: 'Prosthodontics',
    cdtCode: 'D6010',
    defaultDiagnosis: 'Post-Surgical Care for Osseointegration & Soft Tissue Healing',
    defaultClinicalNotes: 'Sterile osteotomy, titanium fixture torqued, cover screw placed and flap closed.',
    description: 'Protective antibiotic coverage, anti-inflammatory pain control, and antimicrobial oral bath.',
    cautionNotes: 'Keep rinse gentle around fixture site. Avoid direct mechanical pressure.',
    allergyTriggers: ['penicillin', 'amoxicillin', 'clavulanate'],
    items: [
      {
        medicineName: 'Amoxicillin + Clavulanic Acid (Augmentin)',
        strength: '625 mg',
        dosage: '1 tablet',
        route: 'Oral',
        frequency: '1-0-1 (Twice daily)',
        duration: '5 days',
        quantity: 10,
        instructions: 'Take with or after food. Prevents surgical site infection around implant fixture.',
        purpose: 'Antibiotic (Implant Prophylaxis)',
      },
      {
        medicineName: 'Aceclofenac + Paracetamol',
        strength: '100 mg + 325 mg',
        dosage: '1 tablet',
        route: 'Oral',
        frequency: '1-0-1 (Twice daily)',
        duration: '4 days',
        quantity: 8,
        instructions: 'Take after food for bone and tissue inflammation.',
        purpose: 'Analgesic & Anti-inflammatory',
      },
      {
        medicineName: 'Pantoprazole',
        strength: '40 mg',
        dosage: '1 tablet',
        route: 'Oral',
        frequency: '1-0-0 (Morning only)',
        duration: '5 days',
        quantity: 5,
        instructions: 'Take 30 minutes before breakfast.',
        purpose: 'Gastroprotective (PPI)',
      },
      {
        medicineName: 'Chlorhexidine Gluconate 0.2% Mouthwash',
        strength: '0.2%',
        dosage: '10 ml',
        route: 'Topical',
        frequency: '1-0-1 (Twice daily)',
        duration: '10 days',
        quantity: 1,
        instructions: 'Rinse gently for 60 seconds twice daily; do not brush implant wound directly.',
        purpose: 'Antiseptic Oral Rinse',
      },
    ],
  },
  {
    id: 'rx-tpl-periodontal-scaling',
    title: 'Deep Scaling & Root Planing (Periodontal Care)',
    procedureName: 'Periodontal Therapy & Scaling',
    procedureCategory: 'Periodontics',
    cdtCode: 'D4341 / D4910',
    defaultDiagnosis: 'Generalized Chronic Periodontitis / Post-Scaling Gingival Soreness',
    defaultClinicalNotes: 'Ultrasonic subgingival calculus debridement and root curettage completed.',
    description: 'Chlorhexidine microbial reduction, soothing dental gel, and PRN pain relief.',
    cautionNotes: 'Chlorhexidine may cause superficial staining if used beyond 14 consecutive days.',
    items: [
      {
        medicineName: 'Chlorhexidine Gluconate 0.2% Mouthwash',
        strength: '0.2%',
        dosage: '15 ml',
        route: 'Topical',
        frequency: '1-0-1 (Twice daily)',
        duration: '14 days',
        quantity: 1,
        instructions: 'Swish undiluted for 60 seconds twice daily 30 minutes after brushing.',
        purpose: 'Antiseptic Gingival Rinse',
      },
      {
        medicineName: 'Paracetamol',
        strength: '650 mg',
        dosage: '1 tablet',
        route: 'Oral',
        frequency: 'PRN (As needed for pain)',
        duration: '3 days',
        quantity: 6,
        instructions: 'Take 1 tablet every 6-8 hours only if mild tooth/gum sensitivity occurs.',
        purpose: 'Mild Analgesic (SOS)',
      },
      {
        medicineName: 'Choline Salicylate + Lignocaine Oral Gel',
        strength: '8.7% + 2.0%',
        dosage: 'Small dab',
        route: 'Topical',
        frequency: '1-1-1 (Three times daily)',
        duration: '5 days',
        quantity: 1,
        instructions: 'Apply small amount with clean fingertip onto inflamed gingival margins before meals.',
        purpose: 'Topical Soothing & Anesthetic Gel',
      },
    ],
  },
  {
    id: 'rx-tpl-aphthous-ulcer',
    title: 'Aphthous Stomatitis & Painful Oral Ulcers',
    procedureName: 'Oral Mucosal Ulcer Care',
    procedureCategory: 'General',
    cdtCode: 'D0140 / D9999',
    defaultDiagnosis: 'Recurrent Minor Aphthous Stomatitis with Acute Mucosal Pain',
    defaultClinicalNotes: 'Circumscribed mucosal ulceration with erythematous halo on non-keratinized mucosa.',
    description: 'Topical corticosteroid dental paste, nutritional B-Complex support, and non-alcoholic antiseptic rinse.',
    cautionNotes: 'Apply topical paste without rubbing to form a smooth protective film over the ulcer.',
    items: [
      {
        medicineName: 'Triamcinolone Acetonide 0.1% Dental Paste (Kenacort 0.1%)',
        strength: '0.1% w/w',
        dosage: 'Small ribbon',
        route: 'Topical',
        frequency: '0-0-1 (At bedtime)',
        duration: '5 days',
        quantity: 1,
        instructions: 'Press small dab gently onto dried ulcer at bedtime until thin film forms. Do not rub.',
        purpose: 'Topical Corticosteroid Anti-inflammatory',
      },
      {
        medicineName: 'B-Complex with Zinc & Folic Acid Capsule (Becozinc)',
        strength: 'Standard therapeutic',
        dosage: '1 capsule',
        route: 'Oral',
        frequency: '1-0-0 (Morning only)',
        duration: '15 days',
        quantity: 15,
        instructions: 'Take 1 capsule daily after breakfast with water for epithelial mucosal healing.',
        purpose: 'Nutritional / Tissue Repair Supplement',
      },
      {
        medicineName: 'Chlorhexidine Gluconate 0.2% Oral Rinse',
        strength: '0.2%',
        dosage: '10 ml',
        route: 'Topical',
        frequency: '1-0-1 (Twice daily)',
        duration: '7 days',
        quantity: 1,
        instructions: 'Rinse gently after eating to prevent secondary bacterial infection of ulcer base.',
        purpose: 'Antiseptic Oral Rinse',
      },
    ],
  },
  {
    id: 'rx-tpl-pediatric-pulpotomy',
    title: 'Pediatric Dental Pain / Pulpotomy Regimen',
    procedureName: 'Pediatric Pulpotomy / Primary Tooth Extraction',
    procedureCategory: 'Pediatric',
    cdtCode: 'D3220 / D7111',
    defaultDiagnosis: 'Acute Primary Molar Pulpitis / Pediatric Toothache',
    defaultClinicalNotes: 'Vital coronal pulpotomy and stainless steel crown or primary extraction.',
    description: 'Weight-adjusted pediatric analgesic suspension and mild antibiotic syrup if indicated.',
    cautionNotes: 'Weight-adjusted dosage: Confirm child weight (approx. 10-15 mg/kg Paracetamol per dose).',
    allergyTriggers: ['penicillin', 'amoxicillin'],
    items: [
      {
        medicineName: 'Paracetamol Oral Suspension (Calpol 250)',
        strength: '250 mg / 5 ml',
        dosage: '5 ml',
        route: 'Oral',
        frequency: 'PRN (As needed for pain)',
        duration: '3 days',
        quantity: 1,
        instructions: 'Give 5 ml as needed every 6-8 hours for fever/pain. Do not exceed 4 doses in 24 hours.',
        purpose: 'Pediatric Analgesic & Antipyretic',
      },
      {
        medicineName: 'Amoxicillin Oral Suspension',
        strength: '125 mg / 5 ml',
        dosage: '5 ml',
        route: 'Oral',
        frequency: '1-1-1 (Three times daily)',
        duration: '5 days',
        quantity: 1,
        instructions: 'Give 5 ml every 8 hours after food only if dental swelling or infection is present.',
        purpose: 'Pediatric Antibiotic (If indicated)',
      },
    ],
  },
  {
    id: 'rx-tpl-pericoronitis',
    title: 'Acute Pericoronitis & Opercular Infection',
    procedureName: 'Operculotomy / Pericoronitis Management',
    procedureCategory: 'Oral Surgery',
    cdtCode: 'D7910 / D9110',
    defaultDiagnosis: 'Acute Pericoronitis around impacted lower third molar with trismus',
    defaultClinicalNotes: 'Saline and betadine sub-opercular debridement performed. Opercular irrigation completed.',
    description: 'Targeted mixed aerobic-anaerobic antibiotic coverage, anti-inflammatory, and antimicrobial bath for opercular pain.',
    cautionNotes: 'Contains Metronidazole. Warn patient strictly against consuming alcohol during therapy.',
    allergyTriggers: ['penicillin', 'amoxicillin', 'metronidazole'],
    items: [
      {
        medicineName: 'Amoxicillin',
        strength: '500 mg',
        dosage: '1 capsule',
        route: 'Oral',
        frequency: '1-1-1 (Three times daily)',
        duration: '5 days',
        quantity: 15,
        instructions: 'Take every 8 hours after food with water. Complete the entire course.',
        purpose: 'Antibiotic (Broad Spectrum Aerobic)',
      },
      {
        medicineName: 'Metronidazole (Flagyl)',
        strength: '400 mg',
        dosage: '1 tablet',
        route: 'Oral',
        frequency: '1-0-1 (Twice daily)',
        duration: '5 days',
        quantity: 10,
        instructions: 'Take after meals. STRICTLY NO ALCOHOL during therapy and 48 hours after.',
        purpose: 'Antibiotic (Anaerobic Coverage for Operculum)',
      },
      {
        medicineName: 'Aceclofenac + Paracetamol',
        strength: '100 mg + 325 mg',
        dosage: '1 tablet',
        route: 'Oral',
        frequency: '1-0-1 (Twice daily)',
        duration: '3 days',
        quantity: 6,
        instructions: 'Take after meals to alleviate intense retromolar ache and opening difficulty.',
        purpose: 'Analgesic & Anti-inflammatory',
      },
      {
        medicineName: 'Pantoprazole',
        strength: '40 mg',
        dosage: '1 tablet',
        route: 'Oral',
        frequency: '1-0-0 (Morning only)',
        duration: '5 days',
        quantity: 5,
        instructions: 'Take 30 minutes before breakfast.',
        purpose: 'Gastroprotective (PPI)',
      },
      {
        medicineName: 'Chlorhexidine Gluconate 0.2% Mouthwash',
        strength: '0.2%',
        dosage: '10 ml',
        route: 'Topical',
        frequency: '1-0-1 (Twice daily)',
        duration: '7 days',
        quantity: 1,
        instructions: 'Rinse gently around retromolar area for 60 seconds after brushing.',
        purpose: 'Antiseptic Oral Rinse',
      },
    ],
  },
  {
    id: 'rx-tpl-dry-socket',
    title: 'Alveolar Osteitis (Dry Socket Regimen)',
    procedureName: 'Dry Socket Dressing & Management',
    procedureCategory: 'Oral Surgery',
    cdtCode: 'D9930',
    defaultDiagnosis: 'Alveolar Osteitis (Dry Socket) with localized bone necrosis and severe radiating pain',
    defaultClinicalNotes: 'Gentle warm saline irrigation of socket, loose debris removed, Alveogyl/iodoform dressing placed without packing tightly.',
    description: 'High-potency analgesic regimen with secondary infection prophylaxis and soothing saline hygiene.',
    cautionNotes: 'Contains Ketorolac. Avoid in patients with active peptic ulcer disease, severe renal impairment, or NSAID allergy.',
    allergyTriggers: ['nsaid', 'aspirin', 'ketorolac'],
    items: [
      {
        medicineName: 'Ketorolac Tromethamine (Ketanov)',
        strength: '10 mg',
        dosage: '1 tablet',
        route: 'Oral',
        frequency: 'PRN (Every 6-8 hrs as needed for severe pain)',
        duration: '3 days',
        quantity: 6,
        instructions: 'Take strictly after meals for severe throbbing jaw pain. Do not exceed 40 mg daily.',
        purpose: 'Potent Analgesic (Non-Opioid NSAID)',
      },
      {
        medicineName: 'Amoxicillin + Potassium Clavulanate (Augmentin)',
        strength: '625 mg',
        dosage: '1 tablet',
        route: 'Oral',
        frequency: '1-0-1 (Twice daily)',
        duration: '5 days',
        quantity: 10,
        instructions: 'Take after meals to control localized alveolar bone infection.',
        purpose: 'Antibiotic (Broad Spectrum Prophylaxis)',
      },
      {
        medicineName: 'Pantoprazole',
        strength: '40 mg',
        dosage: '1 tablet',
        route: 'Oral',
        frequency: '1-0-0 (Morning only)',
        duration: '5 days',
        quantity: 5,
        instructions: 'Take 30 minutes before morning breakfast.',
        purpose: 'Gastroprotective (PPI)',
      },
      {
        medicineName: 'Warm Saline Mouth Rinse',
        strength: '0.9% Normal Saline',
        dosage: '150 ml warm water + 1/2 tsp salt',
        route: 'Topical',
        frequency: '4-5 times daily',
        duration: '5 days',
        quantity: 1,
        instructions: 'Bathe socket gently after meals without vigorous spitting or sucking through straws.',
        purpose: 'Soothing Socket Debridement & Cleansing',
      },
    ],
  },
  {
    id: 'rx-tpl-crown-bridge-sensitivity',
    title: 'Crown Preparation & Vital Abutment Sensitivity',
    procedureName: 'Crown & Bridge Preparation',
    procedureCategory: 'Prosthodontics',
    cdtCode: 'D2740 / D6240 / D6750',
    defaultDiagnosis: 'Dentinal Hypersensitivity & Transient Pulpitis following full-coverage crown preparation',
    defaultClinicalNotes: 'Full-coverage tooth preparation completed on vital abutment, desensitizer applied, temporary crown cemented.',
    description: 'Post-operative nerve desensitization, thermal soothing paste, and mild analgesic coverage for vital abutments.',
    items: [
      {
        medicineName: 'Potassium Nitrate 5% Desensitizing Toothpaste',
        strength: '5% w/w',
        dosage: 'Pea-sized amount',
        route: 'Topical',
        frequency: '1-0-1 (Twice daily)',
        duration: '14 days',
        quantity: 1,
        instructions: 'Apply directly onto sensitive abutment teeth with clean fingertip, leave 2 minutes, then brush gently.',
        purpose: 'Dentinal Nerve Desensitizer (Depolarizing)',
      },
      {
        medicineName: 'Aceclofenac + Paracetamol (Zerodol-P)',
        strength: '100 mg + 325 mg',
        dosage: '1 tablet',
        route: 'Oral',
        frequency: 'PRN (As needed for sensitivity / pain)',
        duration: '3 days',
        quantity: 6,
        instructions: 'Take after food only if experiencing throbbing ache or temperature sensitivity.',
        purpose: 'Analgesic & Anti-inflammatory',
      },
      {
        medicineName: 'Warm Water Oral Bath',
        strength: 'Lukewarm water',
        dosage: '1 glass',
        route: 'Topical',
        frequency: '3 times daily',
        duration: '5 days',
        quantity: 1,
        instructions: 'Rinse mouth gently after eating. Avoid extreme cold or hot beverages.',
        purpose: 'Thermal Soothing',
      },
    ],
  },
  {
    id: 'rx-tpl-tmj-pain',
    title: 'TMJ Pain Dysfunction & Masticatory Muscle Spasm',
    procedureName: 'TMD / Occlusal Splint Therapy',
    procedureCategory: 'General',
    cdtCode: 'D7880 / D9951',
    defaultDiagnosis: 'Temporomandibular Joint Arthralgia with Masseter and Temporalis Myofascial Spasm',
    defaultClinicalNotes: 'Bilateral TMJ palpation tender, preauricular crepitus noted, interincisal opening limited. Soft diet advised.',
    description: 'Dual muscle relaxant and anti-inflammatory therapy with moist heat fermentation protocol for jaw stiffness.',
    cautionNotes: 'Contains Thiocolchicoside muscle relaxant. May cause mild drowsiness.',
    allergyTriggers: ['nsaid', 'aceclofenac'],
    items: [
      {
        medicineName: 'Aceclofenac + Thiocolchicoside (Zerodol-TH 4)',
        strength: '100 mg + 4 mg',
        dosage: '1 tablet',
        route: 'Oral',
        frequency: '1-0-1 (Twice daily)',
        duration: '5 days',
        quantity: 10,
        instructions: 'Take strictly after meals. Relaxes tight masticatory muscles and relieves jaw joint soreness.',
        purpose: 'Skeletal Muscle Relaxant & Anti-inflammatory',
      },
      {
        medicineName: 'Pantoprazole',
        strength: '40 mg',
        dosage: '1 tablet',
        route: 'Oral',
        frequency: '1-0-0 (Morning only)',
        duration: '5 days',
        quantity: 5,
        instructions: 'Take 30 minutes before breakfast.',
        purpose: 'Gastroprotective (PPI)',
      },
      {
        medicineName: 'Moist Heat Application',
        strength: 'Warm Compress',
        dosage: '15 minutes per session',
        route: 'Topical',
        frequency: '3 times daily',
        duration: '7 days',
        quantity: 1,
        instructions: 'Apply warm moist towel over masseter muscles and TMJ preauricular region. Practice gentle range-of-motion opening.',
        purpose: 'Therapeutic Muscle Relaxation',
      },
    ],
  },
  {
    id: 'rx-tpl-ortho-pain',
    title: 'Orthodontic Archwire Activation & Bracket Soreness',
    procedureName: 'Orthodontic Routine Adjustment',
    procedureCategory: 'General',
    cdtCode: 'D8670',
    defaultDiagnosis: 'Generalized Periodontal Ligament Soreness & Mucosal Irritation following Orthodontic Wire Activation',
    defaultClinicalNotes: 'Upper and lower NiTi/SS archwires engaged and cinched, elastic chains placed. Soft diet instructions provided.',
    description: 'Safe non-NSAID analgesic for PDL soreness (avoiding blunting of orthodontic tooth movement) plus barrier relief wax.',
    items: [
      {
        medicineName: 'Paracetamol',
        strength: '650 mg',
        dosage: '1 tablet',
        route: 'Oral',
        frequency: 'PRN (Every 6-8 hrs as needed, max 3 tablets daily)',
        duration: '2 days',
        quantity: 6,
        instructions: 'Take after meals for tooth soreness upon biting. Prefer Paracetamol over NSAIDs to preserve bone remodeling.',
        purpose: 'Analgesic (PDL Soreness Relief)',
      },
      {
        medicineName: 'Orthodontic Relief Wax',
        strength: 'Medical grade silicone/wax',
        dosage: 'Small pea-sized ball',
        route: 'Topical',
        frequency: 'As needed',
        duration: 'Ongoing',
        quantity: 1,
        instructions: 'Pinch a small piece of wax, soften between fingers, and press firmly over poking wire or bracket causing irritation.',
        purpose: 'Mucosal Protection / Mechanical Barrier',
      },
      {
        medicineName: 'Chlorhexidine 0.2% Antiseptic Rinse',
        strength: '0.2%',
        dosage: '10 ml',
        route: 'Topical',
        frequency: '0-0-1 (At bedtime)',
        duration: '5 days',
        quantity: 1,
        instructions: 'Rinse before bed to prevent gingival swelling around orthodontic brackets.',
        purpose: 'Antiseptic Plaque Control',
      },
    ],
  },
];

const CUSTOM_TEMPLATES_STORAGE_KEY = 'docmatrix_custom_prescription_templates';

/**
 * Retrieve custom templates stored in localStorage.
 */
export function getCustomPrescriptionTemplates(): PrescriptionTemplate[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const raw = localStorage.getItem(CUSTOM_TEMPLATES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to parse custom prescription templates:', err);
    return [];
  }
}

/**
 * Get all available prescription templates (built-in standard + user custom templates).
 */
export function getAllPrescriptionTemplates(): PrescriptionTemplate[] {
  const custom = getCustomPrescriptionTemplates();
  return [...STANDARD_PRESCRIPTION_TEMPLATES, ...custom];
}

/**
 * Save a newly created custom prescription template to local storage.
 */
export function saveCustomPrescriptionTemplate(
  template: Omit<PrescriptionTemplate, 'id' | 'isCustom' | 'createdAt'> & { id?: string }
): PrescriptionTemplate {
  const customTemplates = getCustomPrescriptionTemplates();
  const id = template.id || `rx-custom-${Date.now()}`;
  const record: PrescriptionTemplate = {
    ...template,
    id,
    isCustom: true,
    createdAt: new Date().toISOString(),
  };

  const existingIndex = customTemplates.findIndex((t) => t.id === id);
  let updatedList: PrescriptionTemplate[];
  if (existingIndex >= 0) {
    updatedList = [...customTemplates];
    updatedList[existingIndex] = record;
  } else {
    updatedList = [record, ...customTemplates];
  }

  try {
    localStorage.setItem(CUSTOM_TEMPLATES_STORAGE_KEY, JSON.stringify(updatedList));
  } catch (err) {
    console.error('Failed to save custom prescription template:', err);
  }

  return record;
}

/**
 * Delete a user-created custom template.
 */
export function deleteCustomPrescriptionTemplate(id: string): boolean {
  const customTemplates = getCustomPrescriptionTemplates();
  const updated = customTemplates.filter((t) => t.id !== id);
  try {
    localStorage.setItem(CUSTOM_TEMPLATES_STORAGE_KEY, JSON.stringify(updated));
    return true;
  } catch (err) {
    console.error('Failed to delete custom prescription template:', err);
    return false;
  }
}

/**
 * Safety validator: inspect patient allergy alerts against template medications.
 * Returns active warning messages if any medication triggers known patient allergies.
 */
export function checkPatientAllergiesForTemplate(
  template: PrescriptionTemplate,
  patientAllergies: string[] | string | undefined | null
): string[] {
  if (!patientAllergies) return [];

  const alertsList: string[] = Array.isArray(patientAllergies)
    ? patientAllergies
    : [String(patientAllergies)];

  const joinedAlerts = alertsList.join(' ').toLowerCase();
  const warnings: string[] = [];

  // 1. Template-defined triggers
  if (template.allergyTriggers && template.allergyTriggers.length > 0) {
    for (const trigger of template.allergyTriggers) {
      if (joinedAlerts.includes(trigger.toLowerCase())) {
        warnings.push(
          `Patient has recorded "${trigger.toUpperCase()}" allergy/sensitivity. Review antibiotics in this template carefully.`
        );
        break;
      }
    }
  }

  // 2. Specific drug matching
  for (const item of template.items) {
    const medLower = item.medicineName.toLowerCase();

    // Penicillin / Amoxicillin check
    if (
      (medLower.includes('amoxicillin') || medLower.includes('augmentin') || medLower.includes('penicillin')) &&
      (joinedAlerts.includes('penicillin') || joinedAlerts.includes('amoxicillin'))
    ) {
      if (!warnings.some((w) => w.includes('Penicillin'))) {
        warnings.push(`Patient is allergic to Penicillin. ${item.medicineName} should be replaced with Clindamycin or Erythromycin.`);
      }
    }

    // NSAID / Aspirin check
    if (
      (medLower.includes('ibuprofen') || medLower.includes('aceclofenac') || medLower.includes('aspirin') || medLower.includes('nsaid')) &&
      (joinedAlerts.includes('aspirin') || joinedAlerts.includes('nsaid') || joinedAlerts.includes('ibuprofen'))
    ) {
      warnings.push(`Patient has NSAID / Aspirin sensitivity. Avoid ${item.medicineName}; consider plain Paracetamol.`);
    }

    // Sulfa drugs check
    if (
      medLower.includes('sulfa') &&
      joinedAlerts.includes('sulfa')
    ) {
      warnings.push(`Patient has Sulfa allergy. Do not administer ${item.medicineName}.`);
    }
  }

  return warnings;
}

export const BUILT_IN_PRESCRIPTION_TEMPLATES = STANDARD_PRESCRIPTION_TEMPLATES;

