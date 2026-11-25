import { ClinicalNoteRecord, PatientRecord, CLINIC_CONFIG } from './clinicStore';
import { validateWhatsAppPhone } from './whatsappService';

export type PostTreatmentCategory =
  | 'immediate'
  | 'diet'
  | 'hygiene'
  | 'habits'
  | 'concern_alerts'
  | 'warning_signs'
  | 'follow_up'
  | 'doctor_note';

export interface InstructionItem {
  id: string;
  category: PostTreatmentCategory;
  categoryLabel: string;
  text: string;
  isConcernAlert?: boolean;
  concernType?: string;
  enabled: boolean;
}

export interface DetectedConcern {
  type: string;
  label: string;
  details: string;
  badgeColor: string;
}

export interface GeneratedInstructions {
  procedureName: string;
  procedureCategory: string;
  toothNumber?: string;
  patientName: string;
  patientMobile: string;
  patientCountryCode?: string;
  isValidMobile: boolean;
  mobileDisplay: string;
  doctorName: string;
  clinicName: string;
  clinicPhone: string;
  followUpDate?: string;
  instructions: InstructionItem[];
  detectedConcerns: DetectedConcern[];
  whatsappFormattedText: string;
  whatsappUrl: string;
}

export type DentalProcedureKind =
  | 'extraction_simple'
  | 'extraction_surgical'
  | 'root_canal'
  | 'composite_restoration'
  | 'scaling_periodontal'
  | 'crown_bridge'
  | 'whitening'
  | 'orthodontics'
  | 'pediatric'
  | 'general_consultation';

/**
 * Classifies a consultation note into a clinical dental procedure category
 */
export function detectProcedureType(note: Partial<ClinicalNoteRecord>): DentalProcedureKind {
  const text = [
    note.treatmentPerformed || '',
    note.treatmentDescription || '',
    note.primaryDiagnosis || '',
    note.chiefComplaint || '',
    note.patientAdvice || '',
  ]
    .join(' ')
    .toLowerCase();

  // 1. Surgical & Wisdom Tooth Extractions
  if (
    text.includes('surgical extraction') ||
    text.includes('wisdom tooth') ||
    text.includes('impaction') ||
    text.includes('flap') ||
    text.includes('suture') ||
    text.includes('bone graft') ||
    text.includes('alveoloplasty') ||
    text.includes('third molar removal')
  ) {
    return 'extraction_surgical';
  }

  // 2. Simple Extractions
  if (
    text.includes('extraction') ||
    text.includes('exodontia') ||
    text.includes('tooth removal') ||
    text.includes('pulled tooth')
  ) {
    return 'extraction_simple';
  }

  // 3. Endodontics (Root Canal)
  if (
    text.includes('root canal') ||
    text.includes('rct') ||
    text.includes('endodontic') ||
    text.includes('pulpectomy') ||
    text.includes('pulpotomy') ||
    text.includes('obturation') ||
    text.includes('working length') ||
    text.includes('pulp extirpation')
  ) {
    return 'root_canal';
  }

  // 4. Fillings & Restorations
  if (
    text.includes('composite') ||
    text.includes('restoration') ||
    text.includes('filling') ||
    text.includes('gic') ||
    text.includes('glass ionomer') ||
    text.includes('cavity') ||
    text.includes('bonding')
  ) {
    return 'composite_restoration';
  }

  // 5. Scaling & Periodontics
  if (
    text.includes('scaling') ||
    text.includes('polishing') ||
    text.includes('prophylaxis') ||
    text.includes('periodont') ||
    text.includes('curettage') ||
    text.includes('deep cleaning') ||
    text.includes('calculus') ||
    text.includes('gingivitis')
  ) {
    return 'scaling_periodontal';
  }

  // 6. Crowns, Bridges & Prostho
  if (
    text.includes('crown') ||
    text.includes('bridge') ||
    text.includes('veneer') ||
    text.includes('prostho') ||
    text.includes('denture') ||
    text.includes('cap') ||
    text.includes('impression') ||
    text.includes('zirconia') ||
    text.includes('pfm')
  ) {
    return 'crown_bridge';
  }

  // 7. Teeth Whitening
  if (
    text.includes('whitening') ||
    text.includes('bleaching') ||
    text.includes('laser whitening')
  ) {
    return 'whitening';
  }

  // 8. Orthodontics
  if (
    text.includes('orthodontic') ||
    text.includes('braces') ||
    text.includes('aligner') ||
    text.includes('wire') ||
    text.includes('bracket') ||
    text.includes('invisalign')
  ) {
    return 'orthodontics';
  }

  // 9. Pediatric
  if (
    text.includes('pediatric') ||
    text.includes('milk tooth') ||
    text.includes('deciduous') ||
    text.includes('fluoride') ||
    text.includes('sealant')
  ) {
    return 'pediatric';
  }

  return 'general_consultation';
}

/**
 * Detects patient-specific medical concerns and past medications
 */
export function detectPatientConcerns(patient?: any): DetectedConcern[] {
  if (!patient) return [];

  const concerns: DetectedConcern[] = [];

  const alerts = Array.isArray(patient.medicalSafetyAlerts) ? patient.medicalSafetyAlerts.join(' ') : '';
  const condText = `${patient.conditionsDetails || ''} ${alerts}`.toLowerCase();
  const medText = `${patient.medicationsDetails || ''}`.toLowerCase();
  const allergyText = `${patient.allergiesDetails || ''}`.toLowerCase();

  // 1. Blood Thinners / Anticoagulants
  if (
    medText.includes('aspirin') ||
    medText.includes('ecosprin') ||
    medText.includes('clopidogrel') ||
    medText.includes('warfarin') ||
    medText.includes('heparin') ||
    medText.includes('blood thinner') ||
    medText.includes('anticoagulant') ||
    condText.includes('bleeding disorder') ||
    condText.includes('anticoagulant')
  ) {
    concerns.push({
      type: 'blood_thinner',
      label: 'Blood Thinners / Anticoagulants',
      details: patient.medicationsDetails || 'On blood thinning therapy (e.g. Aspirin / Clopidogrel)',
      badgeColor: '#ef4444',
    });
  }

  // 2. Diabetes Mellitus
  if (
    condText.includes('diabet') ||
    condText.includes('sugar') ||
    condText.includes('hba1c') ||
    medText.includes('metformin') ||
    medText.includes('insulin') ||
    medText.includes('glimepiride')
  ) {
    concerns.push({
      type: 'diabetes',
      label: 'Diabetes Mellitus',
      details: patient.conditionsDetails || 'History of Diabetes Mellitus (Delayed healing protocol)',
      badgeColor: '#f59e0b',
    });
  }

  // 3. Hypertension / High Blood Pressure / Cardiac
  if (
    condText.includes('hypertens') ||
    condText.includes('high bp') ||
    condText.includes('cardiac') ||
    condText.includes('heart') ||
    medText.includes('amlodipine') ||
    medText.includes('telmisartan') ||
    medText.includes('atenolol') ||
    medText.includes('beta blocker')
  ) {
    concerns.push({
      type: 'hypertension',
      label: 'Hypertension / Cardiac',
      details: patient.conditionsDetails || 'Hypertension (Blood pressure monitoring required)',
      badgeColor: '#3b82f6',
    });
  }

  // 4. Asthma / Respiratory Condition
  if (
    condText.includes('asthma') ||
    condText.includes('respiratory') ||
    condText.includes('copd') ||
    medText.includes('inhaler') ||
    medText.includes('salbutamol') ||
    medText.includes('budesonide')
  ) {
    concerns.push({
      type: 'asthma',
      label: 'Asthma / Bronchial Sensitivity',
      details: patient.conditionsDetails || 'History of Asthma (Inhaler vigilance & NSAID avoidance)',
      badgeColor: '#8b5cf6',
    });
  }

  // 5. Patient Allergies (Drug, Material, or Environmental)
  if (
    patient.allergies === 'yes' ||
    allergyText.length > 0 ||
    condText.includes('penicillin') ||
    condText.includes('allergy')
  ) {
    const isDrug =
      allergyText.includes('penicillin') ||
      allergyText.includes('amox') ||
      allergyText.includes('sulfa') ||
      allergyText.includes('latex') ||
      allergyText.includes('nsaid') ||
      allergyText.includes('aspirin') ||
      allergyText.includes('drug') ||
      allergyText.includes('antibiotic');

    const specificLabel = patient.allergiesDetails
      ? isDrug
        ? `Drug / Material Allergy: ${patient.allergiesDetails}`
        : `Allergy: ${patient.allergiesDetails}`
      : 'Drug / Material Allergy';

    concerns.push({
      type: 'drug_allergy',
      label: specificLabel,
      details: patient.allergiesDetails || 'Documented allergy history',
      badgeColor: '#ec4899',
    });
  }

  // 6. Gastric / Acid Peptic Disease
  if (
    condText.includes('ulcer') ||
    condText.includes('gastrit') ||
    condText.includes('gerd') ||
    condText.includes('acidity') ||
    medText.includes('pantoprazole') ||
    medText.includes('omeprazole') ||
    medText.includes('antacid')
  ) {
    concerns.push({
      type: 'gastritis',
      label: 'Gastritis / Stomach Sensitivity',
      details: patient.conditionsDetails || 'Acid peptic sensitivity (Take analgesics strictly post-meal)',
      badgeColor: '#10b981',
    });
  }

  // 7. General Documented Medical Condition or Alert (any condition not covered above)
  if (
    patient.conditions === 'yes' &&
    patient.conditionsDetails &&
    !concerns.some(
      (c) =>
        c.type === 'diabetes' ||
        c.type === 'hypertension' ||
        c.type === 'asthma' ||
        c.type === 'gastritis' ||
        c.type === 'blood_thinner'
    )
  ) {
    concerns.push({
      type: 'general_condition',
      label: `Medical Alert: ${patient.conditionsDetails}`,
      details: patient.conditionsDetails,
      badgeColor: '#eab308',
    });
  }

  return concerns;
}

/**
 * Builds base procedure-specific instructions
 */
function getProcedureInstructions(kind: DentalProcedureKind): Omit<InstructionItem, 'id' | 'enabled'>[] {
  switch (kind) {
    case 'extraction_surgical':
      return [
        {
          category: 'immediate',
          categoryLabel: 'Immediate Post-Op Care',
          text: 'Keep biting firmly on the sterile gauze pack for 60 to 90 minutes. Do not chew on the pack; swallow your saliva naturally.',
        },
        {
          category: 'immediate',
          categoryLabel: 'Immediate Post-Op Care',
          text: 'Apply an ice pack to the outside of your cheek for 15 minutes ON, 15 minutes OFF for the first 6–8 hours to prevent facial swelling.',
        },
        {
          category: 'habits',
          categoryLabel: 'Crucial Restrictions',
          text: 'Strictly DO NOT spit, rinse forcefully, touch the surgical site with your tongue/finger, or drink through a straw for 24 hours to prevent dry socket.',
        },
        {
          category: 'habits',
          categoryLabel: 'Crucial Restrictions',
          text: 'Strictly avoid smoking, tobacco, vaping, and alcohol for at least 72 hours, as chemicals dislodge the protective blood clot.',
        },
        {
          category: 'diet',
          categoryLabel: 'Diet & Nutrition',
          text: 'Eat only soft, cold, or lukewarm foods today (curd, ice cream, smoothies, cooled dal khichdi). Avoid hot, spicy, acidic, or crunchy items.',
        },
        {
          category: 'hygiene',
          categoryLabel: 'Oral Hygiene',
          text: 'Starting tomorrow (after 24 hours), gently rinse your mouth with warm salt water (1/2 tsp salt in a glass of warm water) 4 times a day after meals.',
        },
        {
          category: 'hygiene',
          categoryLabel: 'Oral Hygiene',
          text: 'Brush your teeth gently as usual tonight, but carefully avoid disturbing the extraction socket or stitches.',
        },
        {
          category: 'warning_signs',
          categoryLabel: 'When to Contact Us',
          text: 'Call our clinic immediately if you experience heavy continuous bleeding that does not stop with gauze pressure, high fever, or severe throbbing pain after day 3.',
        },
      ];

    case 'extraction_simple':
      return [
        {
          category: 'immediate',
          categoryLabel: 'Immediate Post-Op Care',
          text: 'Keep firm bite pressure on the cotton gauze for 45 minutes. Discard it gently after that and swallow saliva naturally.',
        },
        {
          category: 'habits',
          categoryLabel: 'Crucial Restrictions',
          text: 'Do NOT spit, rinse vigorously, or use a drinking straw today. Spitting creates negative pressure that causes bleeding to restart.',
        },
        {
          category: 'diet',
          categoryLabel: 'Diet & Nutrition',
          text: 'Enjoy soft, cold foods (curd, cold milk, ice cream, soft rice). Avoid hot beverages like tea and coffee for the first 24 hours.',
        },
        {
          category: 'habits',
          categoryLabel: 'Crucial Restrictions',
          text: 'Avoid smoking or tobacco use for at least 48 hours to ensure clean and rapid socket healing.',
        },
        {
          category: 'hygiene',
          categoryLabel: 'Oral Hygiene',
          text: 'From tomorrow morning, rinse gently with warm salt water 3 times daily after meals to soothe the socket.',
        },
        {
          category: 'warning_signs',
          categoryLabel: 'When to Contact Us',
          text: 'Mild oozing with saliva is normal. Contact us if active bright-red bleeding persists or if pain worsens after 48 hours.',
        },
      ];

    case 'root_canal':
      return [
        {
          category: 'immediate',
          categoryLabel: 'Immediate Care',
          text: 'Do not eat or drink hot liquids until the local anesthesia numbness has completely worn off (usually 2–3 hours) to prevent biting your lip or cheek.',
        },
        {
          category: 'diet',
          categoryLabel: 'Diet & Chewing Precautions',
          text: 'Avoid chewing hard, crunchy, or sticky foods on the treated side until the permanent cap / crown is fitted to prevent tooth fracture.',
        },
        {
          category: 'immediate',
          categoryLabel: 'Immediate Care',
          text: 'Mild soreness or tenderness on tapping is completely normal for 48–72 hours as the root apex heals. Take prescribed painkillers on time.',
        },
        {
          category: 'hygiene',
          categoryLabel: 'Oral Hygiene',
          text: 'Continue normal gentle brushing and flossing around the tooth. Do not pick at the temporary white filling with toothpicks or nails.',
        },
        {
          category: 'follow_up',
          categoryLabel: 'Next Appointment',
          text: 'Do not delay your next appointment for crown preparation / permanent restoration; unprotected root canal treated teeth are fragile.',
        },
        {
          category: 'warning_signs',
          categoryLabel: 'When to Contact Us',
          text: 'Contact the clinic if the temporary filling falls out completely, or if significant facial swelling develops.',
        },
      ];

    case 'composite_restoration':
      return [
        {
          category: 'immediate',
          categoryLabel: 'Immediate Care',
          text: 'If anesthesia was administered, wait until all numbness in your lips and tongue has resolved before chewing solid foods.',
        },
        {
          category: 'diet',
          categoryLabel: 'Diet & Chewing',
          text: 'Your composite tooth-colored filling is fully cured with light and hardened right now. However, avoid biting ice or hard shells directly on the filling.',
        },
        {
          category: 'immediate',
          categoryLabel: 'Sensitivity Notice',
          text: 'Mild sensitivity to hot or cold foods is normal for the first 3 to 7 days. Using a sensitivity-relief toothpaste helps soothe the nerve.',
        },
        {
          category: 'warning_signs',
          categoryLabel: 'Bite Check',
          text: 'When chewing, if the tooth feels "high" or your teeth do not close together comfortably, call us for a quick 2-minute bite smoothing adjustment.',
        },
      ];

    case 'scaling_periodontal':
      return [
        {
          category: 'hygiene',
          categoryLabel: 'Gum & Oral Hygiene',
          text: 'Rinse with warm salt water (1/2 tsp salt in warm water) twice daily for the next 3 days to accelerate gum tightening and healing.',
        },
        {
          category: 'immediate',
          categoryLabel: 'Sensitivity Notice',
          text: 'Temporary tooth sensitivity to cold liquids and slight gum tenderness are expected for 24–48 hours as tartar was cleared away.',
        },
        {
          category: 'hygiene',
          categoryLabel: 'Gum & Oral Hygiene',
          text: 'Continue brushing twice daily with a soft-bristled toothbrush and daily flossing. Slight bleeding while brushing today will stop in 1–2 days.',
        },
        {
          category: 'diet',
          categoryLabel: 'Diet',
          text: 'Avoid overly spicy, acidic, or extremely cold foods for the rest of today.',
        },
        {
          category: 'follow_up',
          categoryLabel: 'Recall Visit',
          text: 'Schedule your next routine preventive dental cleaning in 6 months to maintain healthy gums and fresh breath.',
        },
      ];

    case 'crown_bridge':
      return [
        {
          category: 'immediate',
          categoryLabel: 'Temporary Crown Care',
          text: 'If a temporary crown was placed today, avoid eating sticky, chewy, or hard foods (chewing gum, toffees) on that side.',
        },
        {
          category: 'hygiene',
          categoryLabel: 'Flossing Caution',
          text: 'When flossing between the temporary crown, pull the floss out through the side rather than snapping it upward to avoid dislodging the crown.',
        },
        {
          category: 'warning_signs',
          categoryLabel: 'When to Contact Us',
          text: 'If the temporary crown becomes loose or comes off, keep it safe and contact the clinic promptly so we can re-cement it to protect the tooth.',
        },
        {
          category: 'follow_up',
          categoryLabel: 'Final Crown Delivery',
          text: 'Attend your final crown trial and cementation appointment on the scheduled date for your permanent custom prosthesis.',
        },
      ];

    case 'whitening':
      return [
        {
          category: 'diet',
          categoryLabel: 'The "White Diet" (Crucial 48 Hours)',
          text: 'Follow the White Diet strictly for 48 hours: consume only light-colored foods (milk, curd, white rice, paneer, chicken, water).',
        },
        {
          category: 'habits',
          categoryLabel: 'Strict Avoidance',
          text: 'Strictly avoid tea, coffee, turmeric, red curries, soy sauce, colas, red wine, berries, and tobacco/smoking for 48 hours as teeth absorb stains easily.',
        },
        {
          category: 'immediate',
          categoryLabel: 'Sensitivity Relief',
          text: 'Mild tooth zings or temperature sensitivity are common for 24 hours. Use desensitizing toothpaste and avoid ice-cold drinks.',
        },
      ];

    case 'orthodontics':
      return [
        {
          category: 'immediate',
          categoryLabel: 'Adjustment Care',
          text: 'Mild tightness or dull ache is normal for 2 to 3 days after an adjustment or new aligner tray. Soft diet and mild analgesics will keep you comfortable.',
        },
        {
          category: 'diet',
          categoryLabel: 'Food Restrictions',
          text: 'For Braces: strictly avoid hard, crunchy, or sticky foods (whole carrots, nuts, hard candy, chewing gum). Cut fruits and rotis into small bite-sized pieces.',
        },
        {
          category: 'hygiene',
          categoryLabel: 'Orthodontic Wax',
          text: 'If any wire or bracket rubs against your cheek or gums, dry the area and apply a small pea-sized ball of orthodontic relief wax.',
        },
        {
          category: 'habits',
          categoryLabel: 'Aligner Wear Time',
          text: 'For Clear Aligners: ensure you wear your aligners for 20 to 22 hours every single day, removing them only during meals and brushing.',
        },
      ];

    case 'pediatric':
      return [
        {
          category: 'immediate',
          categoryLabel: 'Parent Supervision',
          text: 'Supervise your child closely until all numbness wears off (approx. 2 hours) to prevent them from chewing on their numb lips, tongue, or cheek.',
        },
        {
          category: 'diet',
          categoryLabel: 'Diet',
          text: 'Offer cool, soft foods like ice cream, yogurt, mashed potatoes, or milkshakes. Avoid crunchy chips and hot soups.',
        },
        {
          category: 'hygiene',
          categoryLabel: 'Fluoride Aftercare',
          text: 'If fluoride varnish was applied, feed a soft diet today, do not brush or floss until tomorrow morning, and avoid hot liquids.',
        },
      ];

    default:
      return [
        {
          category: 'immediate',
          categoryLabel: 'Medication Compliance',
          text: 'Take all prescribed dental medications (antibiotics/analgesics) exactly on schedule as advised by your doctor.',
        },
        {
          category: 'hygiene',
          categoryLabel: 'Oral Hygiene',
          text: 'Maintain gentle brushing and warm saline rinses twice daily to promote oral tissue healing.',
        },
        {
          category: 'warning_signs',
          categoryLabel: 'Clinic Support',
          text: 'If you develop unexpected pain, swelling, or discomfort, please contact our clinic helpline right away.',
        },
      ];
  }
}

/**
 * Builds personalized concern & medical history specific alerts
 */
function getConcernInstructions(
  concerns: DetectedConcern[],
  procedureKind: DentalProcedureKind
): Omit<InstructionItem, 'id' | 'enabled'>[] {
  const items: Omit<InstructionItem, 'id' | 'enabled'>[] = [];

  for (const c of concerns) {
    if (c.type === 'blood_thinner') {
      const isSurgery =
        procedureKind === 'extraction_simple' ||
        procedureKind === 'extraction_surgical' ||
        procedureKind === 'scaling_periodontal';

      items.push({
        category: 'concern_alerts',
        categoryLabel: 'Medical Precaution: Blood Thinners',
        isConcernAlert: true,
        concernType: 'blood_thinner',
        text: isSurgery
          ? `⚠️ Blood Thinner Alert (${c.details}): You are on blood thinning medication. Maintain firm gauze pressure longer (60–90 mins). Do NOT take Aspirin or Ibuprofen for pain without consulting us; use Paracetamol. If oozing persists past 2 hours, call our emergency line.`
          : `⚠️ Blood Thinner Alert: Continue taking your prescribed blood thinners as scheduled. Avoid taking unprescribed pain relievers like Aspirin; use Paracetamol for dental discomfort.`,
      });
    }

    if (c.type === 'diabetes') {
      items.push({
        category: 'concern_alerts',
        categoryLabel: 'Medical Precaution: Diabetes Mellitus',
        isConcernAlert: true,
        concernType: 'diabetes',
        text: `⚠️ Diabetes Care (${c.details}): Elevated blood glucose delays gum and bone healing. Maintain strict blood sugar control, eat regular soft meals, and complete the full antibiotic course without skipping doses.`,
      });
    }

    if (c.type === 'hypertension') {
      items.push({
        category: 'concern_alerts',
        categoryLabel: 'Medical Precaution: High Blood Pressure',
        isConcernAlert: true,
        concernType: 'hypertension',
        text: `⚠️ Hypertension Care (${c.details}): Avoid strenuous physical activity, lifting weights, or emotional stress for 48 hours to prevent blood pressure spikes. Take your daily BP medications strictly on schedule.`,
      });
    }

    if (c.type === 'asthma') {
      items.push({
        category: 'concern_alerts',
        categoryLabel: 'Medical Precaution: Asthma',
        isConcernAlert: true,
        concernType: 'asthma',
        text: `⚠️ Asthma Precaution (${c.details}): Keep your rescue inhaler accessible. If you have aspirin-sensitive asthma, strictly avoid NSAID painkillers and take only the prescribed analgesic.`,
      });
    }

    if (c.type === 'drug_allergy') {
      const isDrug =
        c.details.toLowerCase().includes('penicillin') ||
        c.details.toLowerCase().includes('amox') ||
        c.details.toLowerCase().includes('antibiotic') ||
        c.details.toLowerCase().includes('nsaid') ||
        c.details.toLowerCase().includes('aspirin') ||
        c.details.toLowerCase().includes('latex') ||
        c.details.toLowerCase().includes('drug');

      const alertMsg = isDrug
        ? `⚠️ Safety Notice (Known Allergy: ${c.details}): Your prescription has been verified against your allergy history. Never consume unprescribed antibiotics or self-medicate.`
        : `⚠️ Allergy Precaution (${c.details}): Please minimize exposure to known allergens during your post-treatment recovery.`;

      items.push({
        category: 'concern_alerts',
        categoryLabel: `Medical Precaution: ${c.label}`,
        isConcernAlert: true,
        concernType: 'drug_allergy',
        text: alertMsg,
      });
    }

    if (c.type === 'gastritis') {
      items.push({
        category: 'concern_alerts',
        categoryLabel: 'Medical Precaution: Gastric Sensitivity',
        isConcernAlert: true,
        concernType: 'gastritis',
        text: `⚠️ Gastric Protection: Take all prescribed pain relievers strictly with or immediately after food, accompanied by your prescribed antacid/PPI (Pantoprazole). Never take pain tablets on an empty stomach.`,
      });
    }

    if (c.type === 'general_condition') {
      items.push({
        category: 'concern_alerts',
        categoryLabel: `Medical Precaution: ${c.label}`,
        isConcernAlert: true,
        concernType: 'general_condition',
        text: `⚠️ Health Notice (${c.details}): Dental aftercare protocol specifically aligned with your medical condition.`,
      });
    }
  }

  return items;
}

/**
 * Master generator function for customized post-treatment instructions
 */
export function generateInstructionsForConsultation(
  note: ClinicalNoteRecord,
  patient?: any,
  options?: {
    customClinicName?: string;
    customPhone?: string;
  }
): GeneratedInstructions {
  const pRecord = patient || note.patient;
  const procedureKind = detectProcedureType(note);
  const detectedConcerns = detectPatientConcerns(pRecord);

  // Determine procedure display name
  let procedureName = note.treatmentPerformed?.trim() || '';
  if (!procedureName) {
    switch (procedureKind) {
      case 'extraction_surgical':
        procedureName = 'Surgical Tooth Extraction';
        break;
      case 'extraction_simple':
        procedureName = 'Tooth Extraction';
        break;
      case 'root_canal':
        procedureName = 'Root Canal Therapy';
        break;
      case 'composite_restoration':
        procedureName = 'Composite Dental Restoration';
        break;
      case 'scaling_periodontal':
        procedureName = 'Ultrasonic Scaling & Polishing';
        break;
      case 'crown_bridge':
        procedureName = 'Crown & Bridge Procedure';
        break;
      case 'whitening':
        procedureName = 'Teeth Whitening';
        break;
      case 'orthodontics':
        procedureName = 'Orthodontic Procedure';
        break;
      case 'pediatric':
        procedureName = 'Pediatric Dental Care';
        break;
      default:
        procedureName = note.primaryDiagnosis || 'Dental Consultation';
    }
  }

  let procedureCategory = 'General Dental Care';
  switch (procedureKind) {
    case 'extraction_simple':
    case 'extraction_surgical':
      procedureCategory = 'Oral Surgery & Extractions';
      break;
    case 'root_canal':
      procedureCategory = 'Endodontics (Root Canal)';
      break;
    case 'composite_restoration':
      procedureCategory = 'Restorative Dentistry';
      break;
    case 'scaling_periodontal':
      procedureCategory = 'Periodontics & Gum Care';
      break;
    case 'crown_bridge':
      procedureCategory = 'Prosthodontics (Crown & Bridge)';
      break;
    case 'whitening':
      procedureCategory = 'Cosmetic Dentistry';
      break;
    case 'orthodontics':
      procedureCategory = 'Orthodontics & Aligners';
      break;
    case 'pediatric':
      procedureCategory = 'Pediatric Dentistry';
      break;
  }

  // Combine procedure instructions + concern alerts
  const baseProc = getProcedureInstructions(procedureKind);
  const concernProc = getConcernInstructions(detectedConcerns, procedureKind);

  // If doctor included custom advice in the note, add it as a primary item
  const customAdvice = note.patientAdvice?.trim();
  const additionalAdvice: Omit<InstructionItem, 'id' | 'enabled'>[] = customAdvice
    ? [
        {
          category: 'immediate',
          categoryLabel: "Doctor's Specific Advice",
          text: customAdvice,
        },
      ]
    : [];

  const combinedRaw = [...concernProc, ...additionalAdvice, ...baseProc];

  // If follow-up date was set, add a follow-up item
  if (note.followUpRequired && note.followUpDate) {
    const dStr = new Date(note.followUpDate).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    combinedRaw.push({
      category: 'follow_up',
      categoryLabel: 'Next Appointment',
      text: `Your next follow-up appointment is scheduled for ${dStr}. ${note.followUpInstructions || 'Please arrive 10 minutes prior.'}`,
    });
  }

  const instructions: InstructionItem[] = combinedRaw.map((it, idx) => ({
    id: `inst-${idx + 1}`,
    ...it,
    enabled: true,
  }));

  const patientName = pRecord
    ? `${pRecord.firstName} ${pRecord.lastName}`.trim()
    : 'Patient';

  const rawMobile = pRecord?.mobile || '';
  const countryCode = pRecord?.countryCode || '+91';
  const phoneCheck = validateWhatsAppPhone(rawMobile, countryCode);

  const doctorName =
    note.doctor?.fullName ||
    note.finalizedByName ||
    note.doctorName ||
    'Attending Dental Surgeon';

  const clinicName = options?.customClinicName || CLINIC_CONFIG.clinicName || 'DocMatrix Dental Clinic';
  const clinicPhone = options?.customPhone || CLINIC_CONFIG.clinicPhone || '+91 98765 43210';

  const toothNumber = note.treatmentToothNumber?.trim() || undefined;

  // Format initial WhatsApp text
  const whatsappFormattedText = formatWhatsAppAftercareMessage({
    patientName,
    doctorName,
    clinicName,
    clinicPhone,
    procedureName,
    toothNumber,
    activeInstructions: instructions.filter((i) => i.enabled),
    followUpDate: note.followUpRequired && note.followUpDate ? note.followUpDate : undefined,
  });

  const whatsappUrl = phoneCheck.valid
    ? `https://wa.me/${phoneCheck.digits}?text=${encodeURIComponent(whatsappFormattedText)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(whatsappFormattedText)}`;

  return {
    procedureName,
    procedureCategory,
    toothNumber,
    patientName,
    patientMobile: phoneCheck.digits,
    patientCountryCode: countryCode,
    isValidMobile: phoneCheck.valid,
    mobileDisplay: phoneCheck.display || rawMobile,
    doctorName,
    clinicName,
    clinicPhone,
    followUpDate: note.followUpDate,
    instructions,
    detectedConcerns,
    whatsappFormattedText,
    whatsappUrl,
  };
}

/**
 * Formats clean, rich text for WhatsApp message
 */
export function formatWhatsAppAftercareMessage(params: {
  patientName: string;
  doctorName: string;
  clinicName: string;
  clinicPhone: string;
  procedureName: string;
  toothNumber?: string;
  activeInstructions: InstructionItem[];
  followUpDate?: string;
}): string {
  const {
    patientName,
    doctorName,
    clinicName,
    clinicPhone,
    procedureName,
    toothNumber,
    activeInstructions,
    followUpDate,
  } = params;

  // Clean tooth string so we don't end up with "Tooth #Tooth 46"
  let toothDisplay = '';
  if (toothNumber) {
    const cleaned = toothNumber.trim().replace(/^Tooth\s*#?/i, '').replace(/^#/, '').trim();
    if (cleaned) {
      toothDisplay = `Tooth #${cleaned}`;
    }
  }

  // Group by category
  const doctorNotes = activeInstructions.filter(
    (i) => i.category === 'doctor_note' || i.categoryLabel.toLowerCase().includes('doctor')
  );
  const concernAlerts = activeInstructions.filter((i) => i.category === 'concern_alerts');
  const immediateCare = activeInstructions.filter(
    (i) => i.category === 'immediate' && !doctorNotes.includes(i)
  );
  const habitsCare = activeInstructions.filter((i) => i.category === 'habits');
  const dietCare = activeInstructions.filter((i) => i.category === 'diet');
  const hygieneCare = activeInstructions.filter((i) => i.category === 'hygiene');
  const warningSigns = activeInstructions.filter((i) => i.category === 'warning_signs');
  const followUps = activeInstructions.filter((i) => i.category === 'follow_up');

  const lines: string[] = [];

  // Header Banner
  lines.push(`🦷 *${clinicName.toUpperCase()}*`);
  lines.push(`*Post-Treatment Care & Aftercare Instructions*`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`Dear *${patientName}*,`);
  lines.push(`Thank you for visiting us today! To help you recover comfortably and quickly, here are your personalized aftercare instructions prepared by Dr. *${doctorName.replace(/^Dr\.?\s*/i, '')}*:`);
  lines.push(``);
  lines.push(`📋 *TREATMENT SUMMARY:*`);
  lines.push(`• *Procedure:* ${procedureName}`);
  if (toothDisplay) {
    lines.push(`• *Tooth / Area:* ${toothDisplay}`);
  }
  lines.push(`• *Attending Clinician:* Dr. ${doctorName.replace(/^Dr\.?\s*/i, '')}`);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);

  // 1. Personalized Medical Concerns
  if (concernAlerts.length > 0) {
    lines.push(``);
    lines.push(`⚠️ *PERSONALIZED HEALTH PRECAUTIONS:*`);
    for (const item of concernAlerts) {
      lines.push(`• ${item.text.replace(/^⚠️\s*/, '')}`);
    }
  }

  // 2. Doctor's Custom Advice
  if (doctorNotes.length > 0) {
    lines.push(``);
    lines.push(`⭐ *DOCTOR'S SPECIAL INSTRUCTIONS:*`);
    for (const item of doctorNotes) {
      lines.push(`• ${item.text}`);
    }
  }

  // 3. Immediate Care (First 24 Hours)
  if (immediateCare.length > 0) {
    lines.push(``);
    lines.push(`⏱️ *FIRST FEW HOURS (IMMEDIATE CARE):*`);
    for (const item of immediateCare) {
      lines.push(`• ${item.text}`);
    }
  }

  // 4. Things to Strictly Avoid
  if (habitsCare.length > 0) {
    lines.push(``);
    lines.push(`🚫 *THINGS TO STRICTLY AVOID:*`);
    for (const item of habitsCare) {
      lines.push(`• ${item.text}`);
    }
  }

  // 5. Diet & Nutrition
  if (dietCare.length > 0) {
    lines.push(``);
    lines.push(`🥗 *DIET & NUTRITION:*`);
    for (const item of dietCare) {
      lines.push(`• ${item.text}`);
    }
  }

  // 6. Oral Hygiene & Care
  if (hygieneCare.length > 0) {
    lines.push(``);
    lines.push(`🪥 *ORAL HYGIENE & RINSING:*`);
    for (const item of hygieneCare) {
      lines.push(`• ${item.text}`);
    }
  }

  // 7. When to Contact Clinic / Warnings
  if (warningSigns.length > 0) {
    lines.push(``);
    lines.push(`🚨 *WHEN TO CONTACT THE CLINIC:*`);
    for (const item of warningSigns) {
      lines.push(`• ${item.text}`);
    }
  }

  // 8. Follow-up
  if (followUps.length > 0) {
    lines.push(``);
    lines.push(`📅 *FOLLOW-UP VISIT:*`);
    for (const item of followUps) {
      lines.push(`• ${item.text}`);
    }
  } else if (followUpDate) {
    const dStr = new Date(followUpDate).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    lines.push(``);
    lines.push(`📅 *NEXT VISIT:* Follow-up recommended on *${dStr}*.`);
  }

  lines.push(``);
  lines.push(`━━━━━━━━━━━━━━━━━━━━━`);
  lines.push(`📞 *Questions or need assistance? Call/WhatsApp:* ${clinicPhone}`);
  lines.push(`_Wishing you a smooth, speedy, and comfortable recovery!_ 🌸✨`);

  return lines.join('\n');
}
