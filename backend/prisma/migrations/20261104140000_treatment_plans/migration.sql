-- CreateEnum
CREATE TYPE "TreatmentPlanStatus" AS ENUM ('PROPOSED', 'ACCEPTED', 'REJECTED', 'IN_PROGRESS', 'PENDING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TreatmentStageStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "TreatmentPlanItemStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DEFERRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AcceptanceMethod" AS ENUM ('STAFF_RECORDED', 'WRITTEN_CONSENT', 'DIGITAL_SIGNATURE', 'PATIENT_PORTAL');

-- CreateTable
CREATE TABLE "TreatmentPlan" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "planNumber" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "doctorName" TEXT NOT NULL,
    "appointmentId" TEXT,
    "clinicalNoteId" TEXT,
    "title" TEXT NOT NULL,
    "status" "TreatmentPlanStatus" NOT NULL DEFAULT 'PROPOSED',
    "notes" TEXT,
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "totalEstimatedCost" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "acceptedVersion" INTEGER,
    "patientAcceptedAt" TIMESTAMPTZ(6),
    "patientAcceptedByName" TEXT,
    "acceptanceMethod" "AcceptanceMethod",
    "isStaffRecorded" BOOLEAN NOT NULL DEFAULT false,
    "acceptanceRecordedById" TEXT,
    "acceptanceRecordedByName" TEXT,
    "rejectionReason" TEXT,
    "rejectedAt" TIMESTAMPTZ(6),
    "rejectedById" TEXT,
    "origin" TEXT NOT NULL DEFAULT 'CLINICAL',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TreatmentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentPlanStage" (
    "id" TEXT NOT NULL,
    "treatmentPlanId" TEXT NOT NULL,
    "stageNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "status" "TreatmentStageStatus" NOT NULL DEFAULT 'PLANNED',
    "targetDate" DATE,
    "estimatedCost" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TreatmentPlanStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentPlanItem" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "procedureCode" TEXT,
    "procedureName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "toothNumber" TEXT,
    "surface" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitFee" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "netFee" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "status" "TreatmentPlanItemStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TreatmentPlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentEstimateRevision" (
    "id" TEXT NOT NULL,
    "treatmentPlanId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "revisionReason" TEXT,
    "subtotal" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "discount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "totalEstimatedCost" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "itemsSnapshot" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "acceptedAt" TIMESTAMPTZ(6),
    "acceptedByName" TEXT,
    "acceptanceMethod" "AcceptanceMethod",
    "isStaffRecorded" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreatmentEstimateRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TreatmentPlanHistory" (
    "id" TEXT NOT NULL,
    "treatmentPlanId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TreatmentPlanHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TreatmentPlan_clinicId_planNumber_key" ON "TreatmentPlan"("clinicId", "planNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TreatmentPlan_id_clinicId_key" ON "TreatmentPlan"("id", "clinicId");

-- CreateIndex
CREATE INDEX "TreatmentPlan_clinicId_patientId_idx" ON "TreatmentPlan"("clinicId", "patientId");

-- CreateIndex
CREATE INDEX "TreatmentPlan_clinicId_doctorId_idx" ON "TreatmentPlan"("clinicId", "doctorId");

-- CreateIndex
CREATE INDEX "TreatmentPlan_clinicId_status_idx" ON "TreatmentPlan"("clinicId", "status");

-- CreateIndex
CREATE INDEX "TreatmentPlan_clinicId_createdAt_idx" ON "TreatmentPlan"("clinicId", "createdAt");

-- CreateIndex
CREATE INDEX "TreatmentPlanStage_treatmentPlanId_idx" ON "TreatmentPlanStage"("treatmentPlanId");

-- CreateIndex
CREATE INDEX "TreatmentPlanItem_stageId_idx" ON "TreatmentPlanItem"("stageId");

-- CreateIndex
CREATE UNIQUE INDEX "TreatmentEstimateRevision_treatmentPlanId_versionNumber_key" ON "TreatmentEstimateRevision"("treatmentPlanId", "versionNumber");

-- CreateIndex
CREATE INDEX "TreatmentEstimateRevision_treatmentPlanId_idx" ON "TreatmentEstimateRevision"("treatmentPlanId");

-- CreateIndex
CREATE INDEX "TreatmentPlanHistory_treatmentPlanId_idx" ON "TreatmentPlanHistory"("treatmentPlanId");

-- CreateIndex
CREATE INDEX "TreatmentPlanHistory_clinicId_idx" ON "TreatmentPlanHistory"("clinicId");

-- AddForeignKey
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_patientId_clinicId_fkey" FOREIGN KEY ("patientId", "clinicId") REFERENCES "Patient"("id", "clinicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_doctorId_clinicId_fkey" FOREIGN KEY ("doctorId", "clinicId") REFERENCES "User"("id", "clinicId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlan" ADD CONSTRAINT "TreatmentPlan_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlanStage" ADD CONSTRAINT "TreatmentPlanStage_treatmentPlanId_fkey" FOREIGN KEY ("treatmentPlanId") REFERENCES "TreatmentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlanItem" ADD CONSTRAINT "TreatmentPlanItem_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "TreatmentPlanStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentEstimateRevision" ADD CONSTRAINT "TreatmentEstimateRevision_treatmentPlanId_fkey" FOREIGN KEY ("treatmentPlanId") REFERENCES "TreatmentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlanHistory" ADD CONSTRAINT "TreatmentPlanHistory_treatmentPlanId_fkey" FOREIGN KEY ("treatmentPlanId") REFERENCES "TreatmentPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TreatmentPlanHistory" ADD CONSTRAINT "TreatmentPlanHistory_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

