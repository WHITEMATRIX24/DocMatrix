-- ============================================================================
-- DOCMATRIX — SAFE IDEMPOTENT ENQUIRY TABLE RESTORATION
-- Matches: backend/prisma/migrations/20261103140000_enquiries/migration.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS "Enquiry" (
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

-- Unique Constraint: id + clinicId
CREATE UNIQUE INDEX IF NOT EXISTS "Enquiry_id_clinicId_key" ON "Enquiry"("id", "clinicId");

-- Tenant Query Indexes
CREATE INDEX IF NOT EXISTS "Enquiry_clinicId_status_idx" ON "Enquiry"("clinicId", "status");
CREATE INDEX IF NOT EXISTS "Enquiry_clinicId_createdAt_idx" ON "Enquiry"("clinicId", "createdAt");

-- Foreign Key to Clinic
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Enquiry_clinicId_fkey'
    ) THEN
        ALTER TABLE "Enquiry" ADD CONSTRAINT "Enquiry_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

