# DOCMATRIX — SAFE DATABASE REPAIR PLAN
**Target Branch:** `integration/clinical-inventory-billing`  
**Target Environment:** Neon PostgreSQL (`neondb` on endpoint `ep-snowy-shape-a1bb2vnd`)  
**Status:** Audit & Plan Prepared (No live changes applied)  
**Date:** November 5, 2026  

---

## 1. Confirmed Database Inconsistencies

A comprehensive, read-only forensic inspection of the live Neon PostgreSQL database (`neondb`) and local repository migrations was conducted. Two critical database inconsistencies were confirmed:

### Inconsistency 1 — Unmanaged Inventory Tables in Neon (Missing Migration History)
- **Live Database Status:** The tables `InventoryItem`, `InventoryBatch`, and `InventoryAudit` exist in Neon PostgreSQL and contain active records:
  - `InventoryItem`: **15 records**
  - `InventoryBatch`: **17 records**
  - `InventoryAudit`: **0 records**
- **Repository Status:** The models are defined in [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma), but there is **no migration folder** in `backend/prisma/migrations/` and **no migration record** in the Neon `_prisma_migrations` table.
- **Root Cause Analysis:** During development on remote `origin/master`, teammate `Aavany-pu` executed `prisma db push` to push inventory models directly to Neon. While `db push` creates PostgreSQL tables, it explicitly bypasses Prisma's migration engine, leaving zero audit trail in `_prisma_migrations` and producing no SQL migration files.

### Inconsistency 2 — Missing `Enquiry` Table in Neon (Phantom Migration Record)
- **Migration Tracking Status:** The Neon `_prisma_migrations` table contains an entry for `20261103140000_enquiries`:
  - `id`: `a11d49c7-5d12-40b0-afed-196765133dca`
  - `checksum`: `a5e3395eaec7fd69377605e4f69acc237de52d055854f4f12e7b317b2c0a282f` (100% match with repo)
  - `finished_at`: `2026-11-03T08:51:01.937Z`
  - `applied_steps_count`: `1`
  - `rolled_back_at`: `NULL`
- **Live Database Status:** The table `Enquiry` is **completely missing** from the `public` schema in Neon (`SELECT * FROM information_schema.tables WHERE table_name = 'Enquiry'` returns 0 rows).
- **Root Cause Analysis:** On Nov 3, migration `20261103140000_enquiries` was applied to Neon. Subsequently, when teammate `Aavany-pu` branched on `origin/master`, their local schema did not yet include `model Enquiry`. When they executed `prisma db push --accept-data-loss` (or interactive push), Prisma dropped the unrecognized `Enquiry` table from Neon. Because `prisma db push` does not manage or clean up `_prisma_migrations`, the record claiming `20261103140000_enquiries` was applied remained in the table.

---

## 2. Inventory Migration Reconciliation Strategy

### Objectives
1. Protect all 15 `InventoryItem` records and 17 `InventoryBatch` records.
2. Formally register the inventory schema in Prisma's migration history.
3. Eliminate the risk of Prisma detecting schema drift and prompting to reset the database.
4. Ensure the migration is 100% reproducible on fresh databases (CI/CD, local clones, staging).

### Baselining Strategy (Safe Migration Resolution)
Prisma provides the official, non-destructive migration baselining mechanism: `prisma migrate resolve --applied <migration_name>`.

1. **Create Migration Directory:**  
   Create `backend/prisma/migrations/20261104150000_inventory/migration.sql`. The timestamp `20261104150000` places it chronologically immediately after `20261104140000_treatment_plans`.
2. **Idempotent DDL Implementation:**  
   Write the migration SQL using `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, exact default values matching Neon system catalogs, and PL/pgSQL constraint guards (`IF NOT EXISTS (SELECT 1 FROM pg_constraint ...)`).
3. **Register Without Re-executing:**  
   Execute:
   ```bash
   npx prisma migrate resolve --applied 20261104150000_inventory
   ```
   This computes the SHA-256 checksum of `migration.sql` and inserts a completed record into `_prisma_migrations`. It **does not run any DDL against the live database**, meaning existing tables and rows are untouched.
4. **Behavior on Fresh Databases:**  
   When a new environment runs `npx prisma migrate deploy`, the migration runs sequentially and creates the inventory tables cleanly.

---

## 3. Proposed Inventory Migration SQL

**File to create:** `backend/prisma/migrations/20261104150000_inventory/migration.sql`

```sql
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
```

---

## 4. Proposed Enquiry Repair SQL

Because `_prisma_migrations` already has a verified record for `20261103140000_enquiries` with checksum `a5e3395eaec7fd69377605e4f69acc237de52d055854f4f12e7b317b2c0a282f` (which matches the committed `migration.sql` file), **no new migration or migration editing is needed or permitted**.

The repair consists exclusively of restoring the table using the exact DDL from that migration with idempotent safety guards:

**SQL Script to execute:** `backend/prisma/repair_enquiry_table.sql`

```sql
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
```

---

## 5. Expected Database Changes

When these repairs are executed:

| Target Component | Current State | Action | Final State |
| :--- | :--- | :--- | :--- |
| `InventoryItem` Table | Exists (15 rows) | None (Preserved intact) | Exists (15 rows) |
| `InventoryBatch` Table | Exists (17 rows) | None (Preserved intact) | Exists (17 rows) |
| `InventoryAudit` Table | Exists (0 rows) | None (Preserved intact) | Exists (0 rows) |
| `_prisma_migrations` Table | 6 migration records | Insert `20261104150000_inventory` via `prisma migrate resolve` | 7 migration records |
| `Enquiry` Table | **Missing** | Create table, indexes, and FK | Exists (0 rows, ready for enquiries) |
| Other Tables & Records | Untouched | None | 100% Preserved |

---

## 6. Existing Records That Must Be Preserved

The repair operations are strictly non-destructive. The following live data in Neon PostgreSQL will be preserved with zero modification:

| Table | Live Record Count | Associated Clinic | Primary Keys / Identifying Data |
| :--- | :---: | :--- | :--- |
| `Clinic` | 3 | Nu clinic, Apex Dental, Beacon Dental | `32278b68...`, `7949e261...`, `786606e3...` |
| `User` | 4 | Multi-tenant staff | `jose@gmail.com`, `arun.owner@apexdecay.com`, etc. |
| `Patient` | 4 | Nu clinic | `pt-1001` (Meera Nambiar), etc. |
| `InventoryItem` | **15** | Nu clinic | Consumables, Composites, Gloves, Anesthetic |
| `InventoryBatch` | **17** | Nu clinic | Expiry-tracked batch lots |
| `ClinicSequence` | 1 | Nu clinic | Sequential prescription counters |
| `TreatmentPlan` | 2 | Nu clinic | Multi-stage dental treatment plans |
| `TreatmentPlanStage` | 3 | Nu clinic | Stage sequences & target dates |
| `TreatmentPlanItem` | 4 | Nu clinic | FDI tooth-associated procedures |
| `TreatmentEstimateRevision` | 2 | Nu clinic | Versioned financial estimate snapshots |
| `TreatmentPlanHistory` | 2 | Nu clinic | Audit logs of plan actions |

---

## 7. Recovery and Rollback Plan

### Pre-Execution Safety Snapshot
Before running any repair command against Neon:
1. **Full Logical Data Export:** Run the automated comprehensive export script that saves a complete JSON snapshot of all 24 tables across the entire public schema to `backend/backups/pre_repair_complete_backup.json`.
2. **Neon Point-in-Time Restore (PITR):** The Neon project `ep-snowy-shape-a1bb2vnd` supports continuous timeline restore. Note the exact UTC timestamp immediately prior to execution.

### Rollback Procedures
- **If `prisma migrate resolve` fails or requires reversal:**
  ```sql
  DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261104150000_inventory';
  ```
  Or using Prisma CLI:
  ```bash
  npx prisma migrate resolve --rolled-back 20261104150000_inventory
  ```
- **If Enquiry table creation requires reversal:**
  ```sql
  DROP TABLE IF EXISTS "Enquiry" CASCADE;
  ```
  *(Note: Reversing Enquiry creation returns the database to its current state without affecting any other table).*

---

## 8. Validation Results

1. **Prisma Schema Validation:**  
   Ran `npx prisma validate` on `backend/prisma/schema.prisma`.  
   Result: **`The schema at prisma\schema.prisma is valid 🚀`** (Exit Code 0).
2. **Database Schema Mapping:**  
   Compared all 11 columns of `InventoryItem`, 9 columns of `InventoryBatch`, and 15 columns of `InventoryAudit` directly against PostgreSQL `information_schema.columns`. Verified that all default values (`location = 'Central Dispensary'`, `modeUsed = 'standard'`, `timestamp = CURRENT_TIMESTAMP`) match Neon PostgreSQL metadata 100%.
3. **Enquiry DDL Consistency:**  
   Compared proposed Enquiry DDL against `backend/prisma/migrations/20261103140000_enquiries/migration.sql`. Columns, default values, unique indexes, and foreign keys match identically.
4. **Validation Limitations:**  
   - Docker is not installed on this workstation.
   - The local PostgreSQL instance listening on port 5432 lacks documented credentials in the repository.
   - Creating a temporary Neon test branch was prohibited by safety rules without prior approval.
   - Therefore, live execution was restricted to read-only metadata validation.

---

## 9. Exact Commands Proposed for Later Execution

Once user approval is granted, the repair will be executed using these exact commands:

### Step 1: Pre-Repair Full Record Backup
```powershell
cd "Doc_matrix-main/backend"
# Run comprehensive read-only export script to backup all 24 tables to disk
node -e "
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
async function backup() {
  const tables = await prisma.\$queryRawUnsafe(\`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  \`);
  const fullBackup = {};
  for (const t of tables.map(x => x.table_name)) {
    fullBackup[t] = await prisma.\$queryRawUnsafe(\`SELECT * FROM \"\${t}\"\`);
  }
  const backupDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, 'pre_repair_complete_backup.json');
  fs.writeFileSync(backupPath, JSON.stringify(fullBackup, null, 2), 'utf8');
  console.log('Complete backup written to:', backupPath);
  await prisma.\$disconnect();
}
backup();
"
```

### Step 2: Create Migration File for Inventory
```powershell
# Create migration folder
New-Item -ItemType Directory -Path "prisma/migrations/20261104150000_inventory" -Force
# Save proposed idempotent migration SQL into prisma/migrations/20261104150000_inventory/migration.sql
```

### Step 3: Baseline Inventory Migration in Neon
```powershell
# Mark the migration as applied in Neon _prisma_migrations without executing DDL
npx prisma migrate resolve --applied 20261104150000_inventory
```

### Step 4: Restore Missing Enquiry Table
```powershell
# Execute the idempotent restoration script via Prisma client
node -e "
const fs = require('fs');
const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();
async function restore() {
  const sql = fs.readFileSync('prisma/repair_enquiry_table.sql', 'utf8');
  await prisma.\$executeRawUnsafe(sql);
  console.log('Enquiry table restored successfully.');
  await prisma.\$disconnect();
}
restore();
"
```

### Step 5: Verification of Database State
```powershell
# Confirm migration status is completely clean
npx prisma migrate status
```
*Expected output: `Database schema is up to date!`*

---

## 10. Remaining Risks and Required Approvals

### Risk Assessment
- **Risk 1: Accidental `prisma migrate dev` before baselining:**  
  *High.* If a developer runs `prisma migrate dev` before `prisma migrate resolve`, Prisma will detect that `InventoryItem` is in `schema.prisma` without migration history and prompt to reset the database.  
  *Mitigation:* Creating `20261104150000_inventory` and resolving it immediately eliminates this risk permanently.
- **Risk 2: Foreign Key Violation during Enquiry Restoration:**  
  *Zero.* The foreign key references `Clinic(id)`. Because `Clinic` records exist and `Enquiry` starts empty, no constraint violation can occur.
- **Risk 3: Data Overwrite:**  
  *Zero.* All DDL uses `IF NOT EXISTS` guards. No `DROP`, `ALTER TABLE ... DROP COLUMN`, or `TRUNCATE` commands are included.

### Required Approvals
In accordance with strict safety instructions, **no live database modifications have been executed**.  
Please review this plan and provide explicit confirmation to proceed with executing Steps 1 through 5.
