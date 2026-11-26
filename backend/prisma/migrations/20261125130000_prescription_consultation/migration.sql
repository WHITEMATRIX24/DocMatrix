ALTER TABLE "Prescription" ADD COLUMN "clinicalNoteId" TEXT;
CREATE INDEX "Prescription_clinicalNoteId_clinicId_idx" ON "Prescription"("clinicalNoteId", "clinicId");
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_clinicalNoteId_clinicId_fkey"
  FOREIGN KEY ("clinicalNoteId", "clinicId") REFERENCES "ClinicalNote"("id", "clinicId") ON DELETE RESTRICT ON UPDATE CASCADE;
