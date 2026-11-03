-- CreateEnum
CREATE TYPE "PrescriptionStatus" AS ENUM ('DRAFT', 'FINALIZED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "prescriptionNumber" TEXT NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "clinicalNotes" TEXT,
    "status" "PrescriptionStatus" NOT NULL DEFAULT 'DRAFT',
    "prescribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizedAt" TIMESTAMP(3),
    "finalizedById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "cancellationReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionItem" (
    "id" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,
    "medicineName" TEXT NOT NULL,
    "strength" TEXT,
    "dosage" TEXT NOT NULL,
    "route" TEXT NOT NULL DEFAULT 'Oral',
    "frequency" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "quantity" INTEGER,
    "instructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrescriptionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClinicSequence" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "sequenceType" TEXT NOT NULL,
    "currentValue" INTEGER NOT NULL DEFAULT 1000,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClinicSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Prescription_clinicId_patientId_idx" ON "Prescription"("clinicId", "patientId");

-- CreateIndex
CREATE INDEX "Prescription_clinicId_doctorId_idx" ON "Prescription"("clinicId", "doctorId");

-- CreateIndex
CREATE INDEX "Prescription_clinicId_status_idx" ON "Prescription"("clinicId", "status");

-- CreateIndex
CREATE INDEX "Prescription_clinicId_prescribedAt_idx" ON "Prescription"("clinicId", "prescribedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Prescription_id_clinicId_key" ON "Prescription"("id", "clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "Prescription_clinicId_prescriptionNumber_key" ON "Prescription"("clinicId", "prescriptionNumber");

-- CreateIndex
CREATE INDEX "PrescriptionItem_prescriptionId_idx" ON "PrescriptionItem"("prescriptionId");

-- CreateIndex
CREATE INDEX "ClinicSequence_clinicId_idx" ON "ClinicSequence"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "ClinicSequence_clinicId_sequenceType_key" ON "ClinicSequence"("clinicId", "sequenceType");

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_patientId_clinicId_fkey" FOREIGN KEY ("patientId", "clinicId") REFERENCES "Patient"("id", "clinicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_doctorId_clinicId_fkey" FOREIGN KEY ("doctorId", "clinicId") REFERENCES "User"("id", "clinicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_finalizedById_clinicId_fkey" FOREIGN KEY ("finalizedById", "clinicId") REFERENCES "User"("id", "clinicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_cancelledById_clinicId_fkey" FOREIGN KEY ("cancelledById", "clinicId") REFERENCES "User"("id", "clinicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClinicSequence" ADD CONSTRAINT "ClinicSequence_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

