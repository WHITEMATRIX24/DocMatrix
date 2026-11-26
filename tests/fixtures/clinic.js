import { browserLocalStorage, browserSessionStorage } from '@/services/browserStorage';
// Synthetic browser-only records. Production and default demo stores stay empty.
import { getClinicSnapshot, initClinicSession, resetStoreForTesting } from '@/services/clinicStore'
import { saveToStorage, STORAGE_KEYS } from '@/services/storageService'
import { DEMO_USERS } from '@/mocks/auth'

export function seedClinicFixture(role = 'ORGANIZATION_ADMIN') {
  browserLocalStorage.clear()
  browserSessionStorage.clear()
  const user = DEMO_USERS[role]
  browserSessionStorage.setItem('docmatrix-demo-session', user.id)
  browserSessionStorage.setItem('docmatrix_auth_user', JSON.stringify(user))
  resetStoreForTesting()
  const date = '2026-11-01T10:00:00.000Z'
  const patient = { id: 'pt-1001', firstName: 'Meera', lastName: 'Nambiar', age: '34', dateOfBirth: '1992-01-01',
    gender: 'female', mobile: '0000000001', countryCode: '+91', email: 'meera@example.test', language: 'English',
    city: 'Synthetic City', state: '', postalCode: '', address: '', emergencyName: '', emergencyPhone: '', relationship: '',
    allergies: 'yes', allergiesDetails: 'Penicillin allergy, Latex sensitivity', medications: 'no', medicationsDetails: '',
    conditions: 'no', conditionsDetails: '', createdAt: date }
  const otherPatient = { ...patient, id: 'pt-1002', firstName: 'Arjun', lastName: 'Menon', allergies: 'no', allergiesDetails: '' }
  const doctor = { id: 'usr-104', fullName: 'Dr. Arun Kumar', role: 'DOCTOR' }
  const patientContext = { ...patient, patientCode: patient.id, medicalSafetyAlerts: [patient.allergiesDetails] }
  const note = { patientId: patient.id, doctorId: doctor.id, doctorName: doctor.fullName, doctor, patient: patientContext,
    visitDate: '2026-11-01', consultationDate: date, consultationType: 'Consultation', status: 'FINALIZED', isFinalized: true,
    complaint: 'Severe throbbing pain in lower right posterior quadrant', chiefComplaint: 'Severe throbbing pain in lower right posterior quadrant',
    findings: 'Deep caries', primaryDiagnosis: 'Acute Periapical Abscess', plan: 'Review and follow up', treatmentPerformed: 'Examination',
    createdAt: date, finalizedAt: date, finalizedByName: doctor.fullName, addenda: [], followUpRequired: true }
  const rx = { patientId: patient.id, doctorId: doctor.id, patient: patientContext, doctor, diagnosis: 'Acute Periapical Abscess',
    status: 'FINALIZED', prescribedAt: date, createdAt: date, finalizedAt: date,
    items: [{ id: 'medicine-1', medicineName: 'Paracetamol', strength: '500 mg', dosage: '1 tablet', frequency: '1-0-1', duration: '3 days', route: 'Oral', quantity: 6, instructions: 'After food' }] }
  const plan = { id: 'tp-1001', planNumber: 'TP-1001', patientId: patient.id, title: 'Root Canal Treatment & Rotary Shaping',
    procedure: 'Root Canal Treatment & Rotary Shaping', category: 'Endodontics', toothNumber: '36', status: 'Accepted',
    cost: 4500, totalEstimatedCost: 4500, doctor: doctor.fullName, doctorId: doctor.id, notes: '', date: '2026-11-01', stages: [] }
  saveToStorage(STORAGE_KEYS.DATA, { ...getClinicSnapshot(), patients: [patient, otherPatient, { ...otherPatient, id: 'PAT-1003', firstName: 'Marcus', lastName: 'Vance' }],
    clinicalNotes: [{ ...note, id: 'cn-1001', noteNumber: 'CN-1001' }, { ...note, id: 'cn-1002', noteNumber: 'CN-1002', chiefComplaint: 'Follow-up examination', complaint: 'Follow-up examination' },
      { ...note, id: 'cn-1003', noteNumber: 'CN-1003', patientId: 'pt-1002', patient: otherPatient, chiefComplaint: 'Orthodontic review', complaint: 'Orthodontic review', status: 'DRAFT', isFinalized: false, finalizedAt: undefined }],
    prescriptions: [{ ...rx, id: 'rx-1001', prescriptionNumber: 'RX-1001' }, { ...rx, id: 'rx-1002', prescriptionNumber: 'RX-1002', patientId: otherPatient.id, patient: otherPatient, diagnosis: 'Gingivitis', status: 'DRAFT', finalizedAt: undefined }],
    treatmentPlans: [plan, { ...plan, id: 'tp-1002', planNumber: 'TP-1002', title: 'CAD/CAM Zirconia Crown Restoration', procedure: 'CAD/CAM Zirconia Crown Restoration', status: 'Pending' }],
    invoices: [{ id: 'INV-1001', patientId: patient.id, description: 'Consultation', amount: 500, status: 'Unpaid', createdAt: date, payments: [], items: [{ id: 'line-1', name: 'Consultation', qty: 1, unitPrice: 500, discount: 0, gstRate: 0 }] }],
    patientDocuments: [{ id: 'doc-1', patientId: patient.id, title: 'Diagnostic Digital RVG X-Ray', category: 'Radiology', fileName: 'synthetic-xray.png', fileSize: '1 KB', uploadDate: date, doctor: doctor.fullName }],
    patientConsents: [{ id: 'consent-1', patientId: patient.id, consentType: 'Informed Consent for Endodontic Root Canal Therapy', status: 'Signed', recordedBy: doctor.fullName, dateRecorded: date }],
  })
  initClinicSession()
}
