-- CreateTable
CREATE TABLE IF NOT EXISTS "InventoryItem" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "totalStock" INTEGER NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 10,
    "costPerUnit" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "InventoryBatch" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "expiryDate" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "location" TEXT DEFAULT 'Central Dispensary',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "InventoryAudit" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "treatmentId" TEXT,
    "appointmentId" TEXT,
    "patientId" TEXT,
    "patientName" TEXT NOT NULL,
    "doctorId" TEXT,
    "doctorName" TEXT NOT NULL,
    "procedureId" TEXT,
    "procedureName" TEXT NOT NULL,
    "modeUsed" TEXT NOT NULL DEFAULT 'standard',
    "materials" JSONB NOT NULL,
    "confirmedBy" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "InventoryItem_id_clinicId_key" ON "InventoryItem"("id", "clinicId");
CREATE INDEX IF NOT EXISTS "InventoryItem_clinicId_category_idx" ON "InventoryItem"("clinicId", "category");
CREATE INDEX IF NOT EXISTS "InventoryItem_clinicId_sku_idx" ON "InventoryItem"("clinicId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "InventoryBatch_id_clinicId_key" ON "InventoryBatch"("id", "clinicId");
CREATE INDEX IF NOT EXISTS "InventoryBatch_clinicId_itemId_idx" ON "InventoryBatch"("clinicId", "itemId");
CREATE INDEX IF NOT EXISTS "InventoryBatch_clinicId_expiryDate_idx" ON "InventoryBatch"("clinicId", "expiryDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "InventoryAudit_clinicId_timestamp_idx" ON "InventoryAudit"("clinicId", "timestamp");
CREATE INDEX IF NOT EXISTS "InventoryAudit_clinicId_doctorName_idx" ON "InventoryAudit"("clinicId", "doctorName");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'InventoryItem_clinicId_fkey'
    ) THEN
        ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'InventoryBatch_clinicId_fkey'
    ) THEN
        ALTER TABLE "InventoryBatch" ADD CONSTRAINT "InventoryBatch_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'InventoryBatch_itemId_fkey'
    ) THEN
        ALTER TABLE "InventoryBatch" ADD CONSTRAINT "InventoryBatch_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "InventoryItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'InventoryAudit_clinicId_fkey'
    ) THEN
        ALTER TABLE "InventoryAudit" ADD CONSTRAINT "InventoryAudit_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

