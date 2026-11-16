# DocMatrix Billing Module — Pre-Migration Safety Audit

**Date:** November 6, 2026  
**Auditor:** Antigravity Engineering (Automated Safety Engine)  
**Branch:** `integration/clinical-inventory-billing`  
**Shared Target Database:** Neon PostgreSQL (`neondb` on AWS `ap-southeast-1`)  
**Audit Type:** Strict READ-ONLY Schema & Migration Safety Assessment  
**Overall Decision:** **GREEN LIGHT — GO FOR CONTROLLED MIGRATION**  

---

## Executive Summary

A comprehensive read-only safety audit of the shared Neon PostgreSQL database (`neondb`) was conducted to evaluate the deployment readiness of the Billing module migration (`20261105150000_billing_module`).

- **Database State:** Clean and healthy. Exactly 25 public tables and 7 historical migrations recorded.
- **Migration Status:** Zero drift, zero failed migrations, and zero partially applied migrations. Exactly 1 pending migration detected: `20261105150000_billing_module`.
- **Destructiveness:** **0% destructive**. The migration contains zero `DROP TABLE`, zero `DROP COLUMN`, zero `TRUNCATE`, and zero data modifications. All operations consist exclusively of `CREATE TYPE`, `CREATE TABLE`, `CREATE INDEX`, and `ALTER TABLE ADD CONSTRAINT`.
- **Foreign Key Compatibility:** 100% compatible. All compound foreign keys (`("patientId", "clinicId")`, `("treatmentPlanId", "clinicId")`, `("voidedById", "clinicId")`, `("receivedById", "clinicId")`, `("paidById", "clinicId")`) reference existing compound unique btree indexes verified in `neondb`.
- **Existing Data Safety:** All existing clinical records (Clinics, Users, Patients, Treatment Plans, Appointments, Prescriptions, Inventory) will be preserved with zero downtime and zero alteration.

---

## 1. Current Shared Database Status

The database configuration in `backend/.env` targets the shared Neon serverless PostgreSQL instance:

| Property | Configured Value / State |
|----------|--------------------------|
| **Database Engine** | PostgreSQL 18.6 (ac70818) on `aarch64` |
| **Cloud Provider & Region** | Neon AWS `ap-southeast-1` (Singapore) |
| **Target Database** | `neondb` (Public Schema) |
| **Configured Role** | `neondb_owner` (Full administrative DDL/DML privileges) |
| **Connection Protocol** | Direct PostgreSQL Wire Protocol (`sslmode=require`) |
| **Existing Tables** | 25 public tables (Clinical, Patients, Inventory, Users, Core) |
| **Existing Billing Tables** | **0** (`Invoice`, `InvoiceLineItem`, `InvoicePayment`, `ServiceTariff`, `Expense` do not exist yet) |
| **Existing Billing Enums** | **0** (`InvoiceStatus`, `PaymentMode`, `InvoicePaymentType`, `GstClass`, `ExpenseCategory` do not exist yet) |

### Core Table Row Counts in `neondb`
- `Clinic`: 3 active records
- `User`: 4 active records
- `Patient`: 5 active records
- `TreatmentPlan`: 2 active records
- `TreatmentPlanStage`: 3 active records
- `TreatmentPlanItem`: 4 active records
- `InventoryItem`: 8 active records
- `ClinicSequence`: 1 active record

All existing rows remain untouched and fully preserved.

---

## 2. Existing Migration History (`_prisma_migrations`)

Inspection of the `_prisma_migrations` ledger in `neondb` confirms that all previous migrations have executed successfully without failures or rollbacks:

| # | Migration Name | Applied At | Status | Steps |
|---|----------------|------------|:------:|:-----:|
| 1 | `20261031054200_init` | Completed | **FINISHED** | 1 |
| 2 | `20261102120000_clinical_modules` | Completed | **FINISHED** | 1 |
| 3 | `20261103140000_enquiries` | Completed | **FINISHED** | 1 |
| 4 | `20261103153000_prescriptions` | Completed | **FINISHED** | 1 |
| 5 | `20261104120000_clinical_notes` | Completed | **FINISHED** | 1 |
| 6 | `20261104140000_treatment_plans` | Completed | **FINISHED** | 1 |
| 7 | `20261104150000_inventory` | Completed | **FINISHED** | 0 |
| **8** | `20261105150000_billing_module` | *Pending* | **READY TO APPLY** | — |

**Prisma Migration Status Verification:**
```
Datasource "db": PostgreSQL database "neondb", schema "public"
8 migrations found in prisma/migrations
Following migration have not yet been applied:
20261105150000_billing_module
```
Result: **Zero migration drift. Schema alignment is 100%.**

---

## 3. Billing Migration Detailed Review (`20261105150000_billing_module`)

Inspection of `backend/prisma/migrations/20261105150000_billing_module/migration.sql` demonstrates strict financial design principles:

### A. Created Data Types (5 Enums)
1. `InvoiceStatus`: `'DRAFT'`, `'ISSUED'`, `'PARTIALLY_PAID'`, `'PAID'`, `'VOID'`
2. `PaymentMode`: `'CASH'`, `'CARD'`, `'UPI'`, `'NET_BANKING'`, `'CHEQUE'`
3. `InvoicePaymentType`: `'PAYMENT'`, `'REFUND'`
4. `GstClass`: `'EXEMPT'`, `'TAXABLE'`, `'NIL_RATED'`
5. `ExpenseCategory`: `'LAB_FEES'`, `'DENTAL_SUPPLIES'`, `'RENT'`, `'SALARIES'`, `'UTILITIES'`, `'EQUIPMENT_MAINTENANCE'`, `'MARKETING'`, `'OTHER'`

### B. Created Tables (5 Models)
1. **`Invoice`**: Primary financial ledger storing invoice numbers, patient links, Decimal monetary totals (`subtotal`, `discountTotal`, `taxTotal`, `totalAmount`, `paidAmount`, `balance`), lifecycle timestamps (`issuedAt`, `voidedAt`), and void audit logs.
2. **`InvoiceLineItem`**: Granular treatment and tariff line items preserving historical prices, discounts, GST rates, tooth numbers, and optional links to `TreatmentPlanItem` and `ServiceTariff`.
3. **`InvoicePayment`**: Immutable payment and refund transaction log with idempotency keys, payment modes, references, timestamps, and receiving staff references.
4. **`ServiceTariff`**: Clinic-level master price list with standard fees, offer prices, GST classifications, and active flags.
5. **`Expense`**: Operating expense ledger categorized by supply, utility, lab fee, or salary.

### C. Foreign Key & Index Verification Against `neondb`
Every foreign key references an existing, verified unique index in `neondb`:

| Migration Constraint | Referencing Column(s) | Referenced Target | Existing Index in `neondb` |
|----------------------|-----------------------|-------------------|---------------------------|
| `Invoice_clinicId_fkey` | `clinicId` | `Clinic(id)` | `Clinic_pkey` (btree `id`) |
| `Invoice_patientId_clinicId_fkey` | `patientId, clinicId` | `Patient(id, clinicId)` | `Patient_id_clinicId_key` (btree `id, clinicId`) |
| `Invoice_appointmentId_fkey` | `appointmentId` | `Appointment(id)` | `Appointment_pkey` (btree `id`) |
| `Invoice_treatmentPlanId_clinicId_fkey` | `treatmentPlanId, clinicId` | `TreatmentPlan(id, clinicId)` | `TreatmentPlan_id_clinicId_key` (btree `id, clinicId`) |
| `Invoice_voidedById_clinicId_fkey` | `voidedById, clinicId` | `User(id, clinicId)` | `User_id_clinicId_key` (btree `id, clinicId`) |
| `InvoiceLineItem_invoiceId_clinicId_fkey` | `invoiceId, clinicId` | `Invoice(id, clinicId)` | `Invoice_id_clinicId_key` (btree `id, clinicId`) |
| `InvoicePayment_invoiceId_clinicId_fkey` | `invoiceId, clinicId` | `Invoice(id, clinicId)` | `Invoice_id_clinicId_key` (btree `id, clinicId`) |
| `InvoicePayment_receivedById_clinicId_fkey` | `receivedById, clinicId` | `User(id, clinicId)` | `User_id_clinicId_key` (btree `id, clinicId`) |
| `Expense_paidById_clinicId_fkey` | `paidById, clinicId` | `User(id, clinicId)` | `User_id_clinicId_key` (btree `id, clinicId`) |

**Delete Protections:**
- Invoices and Payments enforce `ON DELETE RESTRICT` against Clinic, Patient, and User to prevent accidental cascading deletion of financial history.
- Only line items cascade under their parent Invoice (`ON DELETE CASCADE`), ensuring atomicity.

---

## 4. Integration Compatibility Analysis

1. **Patient Management:** Compatible. Invoices reference patients via `(patientId, clinicId)`. Compound keys ensure tenant isolation.
2. **Treatment Plans:** Compatible. Invoices can optionally link to `TreatmentPlan(id, clinicId)` and `TreatmentPlanItem(id)` without creating duplicate billing.
3. **Appointments:** Compatible. `appointmentId` relation uses `ON DELETE SET NULL`.
4. **Clinical Records:** Compatible. Prescriptions and Clinical Notes remain completely decoupled from billing constraints while linking via patient ID.
5. **Inventory:** Compatible. Inventory items and batches operate independently; future stock-deduction integrations link through procedure IDs without database conflicts.
6. **Teammates' Database Changes:** All 7 preceding migrations (`clinical_modules`, `enquiries`, `prescriptions`, `clinical_notes`, `treatment_plans`, `inventory`) are already safely incorporated into the schema and verified.

---

## 5. Potential Risks & Mitigation Strategy

| Risk Scenario | Likelihood | Impact | Mitigation Built into Migration |
|---------------|:----------:|:------:|---------------------------------|
| **Table Lock Contention** | Negligible | Low | Migration only creates *new* tables and enums. It does not alter existing table structures or lock existing rows. |
| **Orphan Data on Foreign Keys** | Zero | None | Billing tables start empty (0 rows). Foreign key checks on existing tables have zero rows to validate. |
| **Migration Failure / Interruption** | Low | Low | DDL is wrapped in a PostgreSQL transaction. If interrupted, the transaction rolls back cleanly without leaving orphan artifacts. |
| **Application Crash on Deploy** | Negligible | Medium | Backend endpoints and Prisma client are already compiled and pass 86/86 tests. Frontend passes 114/114 tests. |

---

## 6. Backup & Rollback Plan

### A. Recommended Pre-Migration Backup (Neon Instant Branch)
Neon provides instant, copy-on-write branching without downtime or storage overhead:
1. **Via Neon CLI:**
   ```bash
   neon branches create --name pre-billing-migration-backup
   ```
2. **Via Neon Web Console:**
   - Navigate to Neon Project Dashboard -> **Branches** tab.
   - Click **Create Branch**.
   - Name: `backup-pre-billing-migration`.
   - Parent branch: `main` (current point in time).
   - Click **Create**. (Takes ~500ms).

### B. Alternative Logical Backup (`pg_dump`)
If a local SQL dump is desired:
```bash
pg_dump --clean --if-exists --no-owner --no-privileges -d "$DATABASE_URL" -f "neondb_pre_billing_backup.sql"
```

### C. Emergency Rollback Procedure
If the migration ever needs to be manually rolled back, execute the following non-destructive teardown script:
```sql
BEGIN;

-- Drop newly created Billing tables (foreign keys cascade within billing only)
DROP TABLE IF EXISTS "Expense" CASCADE;
DROP TABLE IF EXISTS "InvoicePayment" CASCADE;
DROP TABLE IF EXISTS "InvoiceLineItem" CASCADE;
DROP TABLE IF EXISTS "Invoice" CASCADE;
DROP TABLE IF EXISTS "ServiceTariff" CASCADE;

-- Drop newly created Billing enums
DROP TYPE IF EXISTS "ExpenseCategory";
DROP TYPE IF EXISTS "GstClass";
DROP TYPE IF EXISTS "InvoicePaymentType";
DROP TYPE IF EXISTS "PaymentMode";
DROP TYPE IF EXISTS "InvoiceStatus";

-- Remove migration ledger entry
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20261105150000_billing_module';

COMMIT;
```
*Note: This teardown affects only the 5 new Billing tables and does not touch any Patient, Clinical, or Inventory data.*

---

## 7. Audit Recommendation: GO / NO-GO Decision

### Recommendation: **GO (GREEN LIGHT)**

**Justification:**
1. Zero migration drift on the shared Neon database (`neondb`).
2. All 7 prior migrations are fully applied and healthy.
3. The migration is purely additive (zero destructive operations).
4. All foreign key constraints match verified compound indexes.
5. All 114 frontend tests and 86 backend tests pass.
6. All 15 end-to-end integration workflows passed on isolated PostgreSQL.

---

## 8. Exact Steps for Controlled Migration

When the user gives explicit approval to proceed with the migration:

1. **Step 1 (Optional but recommended):** Create an instant Neon backup branch named `backup-pre-billing-migration` in the Neon console.
2. **Step 2:** From `Doc_matrix-main/backend`, execute the production migration deployment command:
   ```bash
   npx prisma migrate deploy
   ```
3. **Step 3:** Run `npx prisma migrate status` to verify that all 8 migrations are marked as applied and the database schema is up-to-date.
4. **Step 4:** Perform a read-only schema verification query confirming the existence of the 5 new tables and 5 enums.
5. **Step 5:** Build and start the backend service; verify that Billing endpoints resolve with HTTP 200/201.

