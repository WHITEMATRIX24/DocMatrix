import type { ClinicalNoteRecord, PatientRecord } from './clinicStore';

export function prescriptionConsultations(notes: ClinicalNoteRecord[], patient: PatientRecord | undefined, patientId: string) {
  const ids = new Set([patientId, patient?.id, patient?.backendId].filter(Boolean));
  return notes.filter(note =>
    (ids.has(note.patientId) || ids.has(note.patient?.id) || ids.has(note.patient?.patientCode)) &&
    (note.status === 'FINALIZED' || !note.status && note.isFinalized === true) &&
    !!note.primaryDiagnosis?.trim()
  ).sort((a, b) => (b.consultationDate || b.visitDate || '').localeCompare(a.consultationDate || a.visitDate || ''));
}

export function defaultPrescriptionConsultation(notes: ClinicalNoteRecord[], date: string, noteId?: string, appointmentId?: string) {
  if (noteId) return notes.find(note => note.id === noteId);
  const matches = appointmentId
    ? notes.filter(note => note.appointmentId === appointmentId || note.appointment?.id === appointmentId)
    : notes.filter(note => (note.visitDate || note.consultationDate || '').slice(0, 10) === date);
  return matches.length === 1 ? matches[0] : undefined;
}
