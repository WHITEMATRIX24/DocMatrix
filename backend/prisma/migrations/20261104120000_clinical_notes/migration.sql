-- CreateEnum
CREATE TYPE "ClinicalNoteStatus" AS ENUM ('DRAFT', 'FINALIZED');

-- CreateTable
CREATE TABLE "ClinicalNote" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "noteNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "consultationDate" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consultationType" TEXT NOT NULL DEFAULT 'ROUTINE_CHECKUP',
    "status" "ClinicalNoteStatus" NOT NULL DEFAULT 'DRAFT',
    "chiefComplaint" TEXT NOT NULL,
    "symptoms" TEXT,
    "symptomDuration" TEXT,
    "painSeverity" INTEGER,
    "historyNotes" TEXT,
    "extraoralFindings" TEXT,
    "intraoralFindings" TEXT,
    "toothSpecificFindings" TEXT,
    "periodontalFindings" TEXT,
    "examinationNotes" TEXT,
    "primaryDiagnosis" TEXT NOT NULL,
    "additionalDiagnoses" JSONB,
    "diagnosisNotes" TEXT,
    "treatmentPerformed" TEXT,
    "treatmentToothNumber" TEXT,
    "treatmentDescription" TEXT,
    "materialsUsed" TEXT,
    "treatmentOutcome" TEXT,
    "treatmentRecommendations" TEXT,
    "referralNotes" TEXT,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpDate" DATE,
    "followUpInstructions" TEXT,
    "patientAdvice" TEXT,
    "finalizedAt" TIMESTAMPTZ(6),
    "finalizedById" TEXT,
    "finalizedByName" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ClinicalNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicalNoteAddendum" (
    "id" TEXT NOT NULL,
    "clinicalNoteId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClinicalNoteAddendum_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClinicalNote_clinicId_patientId_idx" ON "ClinicalNote"("clinicId", "patientId");

-- CreateIndex
CREATE INDEX "ClinicalNote_clinicId_doctorId_idx" ON "ClinicalNote"("clinicId", "doctorId");

-- CreateIndex
CREATE INDEX "ClinicalNote_clinicId_status_idx" ON "ClinicalNote"("clinicId", "status");

-- CreateIndex
CREATE INDEX "ClinicalNote_clinicId_consultationDate_idx" ON "ClinicalNote"("clinicId", "consultationDate");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalNote_clinicId_noteNumber_key" ON "ClinicalNote"("clinicId", "noteNumber");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicalNote_id_clinicId_key" ON "ClinicalNote"("id", "clinicId");

-- CreateIndex
CREATE INDEX "ClinicalNoteAddendum_clinicalNoteId_idx" ON "ClinicalNoteAddendum"("clinicalNoteId");

-- CreateIndex
CREATE INDEX "ClinicalNoteAddendum_clinicId_idx" ON "ClinicalNoteAddendum"("clinicId");

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_patientId_clinicId_fkey" FOREIGN KEY ("patientId", "clinicId") REFERENCES "Patient"("id", "clinicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_doctorId_clinicId_fkey" FOREIGN KEY ("doctorId", "clinicId") REFERENCES "User"("id", "clinicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_finalizedById_clinicId_fkey" FOREIGN KEY ("finalizedById", "clinicId") REFERENCES "User"("id", "clinicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNoteAddendum" ADD CONSTRAINT "ClinicalNoteAddendum_clinicalNoteId_fkey" FOREIGN KEY ("clinicalNoteId") REFERENCES "ClinicalNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNoteAddendum" ADD CONSTRAINT "ClinicalNoteAddendum_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicalNoteAddendum" ADD CONSTRAINT "ClinicalNoteAddendum_authorId_clinicId_fkey" FOREIGN KEY ("authorId", "clinicId") REFERENCES "User"("id", "clinicId") ON DELETE RESTRICT ON UPDATE CASCADE;
