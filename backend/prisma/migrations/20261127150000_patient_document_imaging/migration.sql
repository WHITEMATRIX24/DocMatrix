ALTER TABLE "PatientDocument"
 ADD COLUMN "appointmentId" TEXT, ADD COLUMN "imagingType" TEXT,
 ADD COLUMN "photographClass" TEXT, ADD COLUMN "toothNumbers" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
 ADD COLUMN "treatmentContext" TEXT, ADD COLUMN "documentDate" DATE,
 ADD COLUMN "uploadedById" TEXT, ADD COLUMN "uploadedByName" TEXT,
 ADD COLUMN "sizeBytes" INTEGER, ADD COLUMN "archivedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "Appointment_id_patientId_clinicId_key" ON "Appointment"("id", "patientId", "clinicId");
ALTER TABLE "PatientDocument" ADD CONSTRAINT "PatientDocument_appointmentId_patientId_clinicId_fkey" FOREIGN KEY ("appointmentId", "patientId", "clinicId") REFERENCES "Appointment"("id", "patientId", "clinicId") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "PatientDocument_clinicId_patientId_createdAt_idx" ON "PatientDocument"("clinicId", "patientId", "createdAt");
CREATE INDEX "PatientDocument_clinicId_appointmentId_idx" ON "PatientDocument"("clinicId", "appointmentId");
ALTER TABLE "PatientDocument" ADD CONSTRAINT "PatientDocument_teeth_check" CHECK ("toothNumbers" <@ ARRAY[11,12,13,14,15,16,17,18,21,22,23,24,25,26,27,28,31,32,33,34,35,36,37,38,41,42,43,44,45,46,47,48]);

ALTER TABLE "PatientDocument" ADD COLUMN "uploadRequestId" TEXT;
CREATE UNIQUE INDEX "PatientDocument_clinicId_uploadRequestId_key" ON "PatientDocument"("clinicId", "uploadRequestId");
