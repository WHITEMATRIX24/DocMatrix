-- CreateTable
CREATE TABLE "Enquiry" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "request" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Enquiry_id_clinicId_key" ON "Enquiry"("id", "clinicId");

-- CreateIndex
CREATE INDEX "Enquiry_clinicId_status_idx" ON "Enquiry"("clinicId", "status");

-- CreateIndex
CREATE INDEX "Enquiry_clinicId_createdAt_idx" ON "Enquiry"("clinicId", "createdAt");

-- AddForeignKey
ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
