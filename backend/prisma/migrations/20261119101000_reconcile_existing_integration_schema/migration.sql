BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '2min';

-- Reconstructed from inspected live DDL; does not replace the missing original migration.
-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IntegrationProvider') THEN
    CREATE TYPE "IntegrationProvider" AS ENUM ('TALLY', 'ZOHO', 'QUICKBOOKS');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IntegrationSyncStatus') THEN
    CREATE TYPE "IntegrationSyncStatus" AS ENUM ('PENDING', 'PROCESSING', 'SYNCED', 'FAILED', 'SKIPPED');
  END IF;
END $$;

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AccountingEventType') THEN
    CREATE TYPE "AccountingEventType" AS ENUM ('INVOICE_ISSUED', 'INVOICE_VOIDED', 'PAYMENT_RECEIVED', 'PAYMENT_REFUNDED', 'EXPENSE_RECORDED', 'PATIENT_CREATED', 'PATIENT_UPDATED');
  END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "IntegrationMapping" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "entityType" TEXT NOT NULL,
    "internalId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "syncStatus" "IntegrationSyncStatus" NOT NULL DEFAULT 'SYNCED',
    "syncError" TEXT,
    "metadata" JSONB,
    "lastSyncedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrationMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AccountingOutbox" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "eventType" "AccountingEventType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "IntegrationSyncStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "processedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountingOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IntegrationMapping_clinicId_provider_externalId_idx" ON "IntegrationMapping"("clinicId", "provider", "externalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "IntegrationMapping_clinicId_syncStatus_idx" ON "IntegrationMapping"("clinicId", "syncStatus");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "IntegrationMapping_clinicId_provider_entityType_internalId_key" ON "IntegrationMapping"("clinicId", "provider", "entityType", "internalId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AccountingOutbox_clinicId_status_idx" ON "AccountingOutbox"("clinicId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AccountingOutbox_clinicId_eventType_idx" ON "AccountingOutbox"("clinicId", "eventType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AccountingOutbox_clinicId_createdAt_idx" ON "AccountingOutbox"("clinicId", "createdAt");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'IntegrationMapping_clinicId_fkey' AND conrelid = '"IntegrationMapping"'::regclass) THEN
    ALTER TABLE "IntegrationMapping" ADD CONSTRAINT "IntegrationMapping_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AccountingOutbox_clinicId_fkey' AND conrelid = '"AccountingOutbox"'::regclass) THEN
    ALTER TABLE "AccountingOutbox" ADD CONSTRAINT "AccountingOutbox_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Preserve additional foundation columns already present in the shared database.
-- These additions make fresh installations match; no financial values are rewritten.
ALTER TABLE "Clinic" ADD COLUMN IF NOT EXISTS "gstin" TEXT,
 ADD COLUMN IF NOT EXISTS "panNumber" TEXT,
 ADD COLUMN IF NOT EXISTS "accountingSettings" JSONB;
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "gstin" TEXT,
 ADD COLUMN IF NOT EXISTS "panNumber" TEXT;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "hsnSacCode" TEXT,
 ADD COLUMN IF NOT EXISTS "vendorGstin" TEXT;
ALTER TABLE "ServiceTariff" ADD COLUMN IF NOT EXISTS "hsnSacCode" TEXT DEFAULT '999312';
ALTER TABLE "InvoiceLineItem" ADD COLUMN IF NOT EXISTS "hsnSacCode" TEXT DEFAULT '999312',
 ADD COLUMN IF NOT EXISTS "cgstAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS "sgstAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
 ADD COLUMN IF NOT EXISTS "igstAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;

COMMIT;
