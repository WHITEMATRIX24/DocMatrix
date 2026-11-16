# DocMatrix — Billing Invoice Creation P2003 Fix Report

**Date:** 2026-11-06  
**Status:** RESOLVED & FULLY VERIFIED  
**Target Issue:** `PrismaClientKnownRequestError: P2003` — Foreign key constraint violated on `InvoiceLineItem_serviceTariffId_fkey` at `tx.invoice.create()` (`backend/src/billing/billing.service.ts:371`)  
**Shared Database:** Neon PostgreSQL `neondb` (AWS Singapore) — **UNTOUCHED / ZERO SCHEMA MODIFICATIONS**

---

## 1. Executive Summary

During invoice creation and issuance on DocMatrix, the backend threw an unhandled Prisma P2003 error:
`Foreign key constraint violated: InvoiceLineItem_serviceTariffId_fkey`.

We investigated the complete line-item lifecycle—from frontend input through clinic stores, DTO validation, calculation services, and transactional database creation. We identified the exact root cause: the frontend was passing client-side seed identifiers (such as `"trt-101"`) into `serviceTariffId` when fallback catalogs were active, while the backend lacked pre-insert validation for foreign keys and lacked translation of P2003 constraint errors into clean HTTP client responses.

Both the backend and frontend have been updated with robust validation, sanitization, tenant-isolation enforcement, and error-translation mechanisms. All 100 backend tests (including 7 new regression tests and 7 isolated tests) and 133 frontend tests pass cleanly with zero TypeScript errors and clean production builds.

---

## 2. Root Cause Analysis

### Data Tracing & Inspection
1. **Empty Shared Tariff Table:**
   - In shared `neondb`, `SELECT count(*) FROM service_tariffs` returned `0`. No tariffs had been seeded on the remote database.
2. **Frontend Seed Fallback:**
   - In `src/services/billingStore.ts`, when the backend returns an empty tariff list, the store falls back to `getSeedServices()`, using seed IDs such as `'trt-101'`, `'trt-102'`, etc.
3. **Propagation to Invoice Line Items:**
   - In `src/pages/billing/NewInvoicePage.tsx`, selecting a service populated `serviceId: "trt-101"`.
   - In `src/services/clinicStore.ts` line 2589, `serviceTariffId: it.serviceId || undefined` was sent in the POST payload to `/billing/invoices` or `/billing/invoices/issue`.
4. **Backend Ingestion Without Validation:**
   - In `backend/src/billing/billing.service.ts` line 371 (`createAndIssueInvoice`) and line 224 (`createDraftInvoice`), the backend accepted `item.serviceTariffId` verbatim and passed it directly to `tx.invoice.create({ data: { items: { create: [...] } } })`.
5. **Database Foreign Key Failure:**
   - PostgreSQL evaluated the constraint:
     ```sql
     CONSTRAINT "InvoiceLineItem_serviceTariffId_fkey" 
     FOREIGN KEY ("serviceTariffId") REFERENCES "service_tariffs"("id") 
     ON DELETE SET NULL ON UPDATE CASCADE
     ```
   - Because no record with ID `"trt-101"` existed in `service_tariffs`, PostgreSQL raised error code `23503`, surfacing as Prisma error `P2003`.
6. **Absence of Tenant Isolation on Tariffs:**
   - Prior to this fix, if a client sent a valid UUID belonging to a different clinic's tariff, the backend would have linked the line item across tenant boundaries without checking clinic ownership.

---

## 3. Implemented Fixes

### A. Backend Fixes

#### 1. Input Sanitization in Calculation Service
**File:** `backend/src/billing/billing-calculation.service.ts`
- Sanitized `serviceTariffId` and `treatmentPlanItemId` so that empty strings, non-string values, or whitespace-only strings are converted to `undefined` (which Prisma translates to SQL `NULL`), preventing blank string violations.

#### 2. Tenant Isolation & Reference Validation
**File:** `backend/src/billing/billing.service.ts`
- Added private transactional helper `validateLineItemReferences(clinicId, items, tx)`:
  - Collects all non-empty `serviceTariffId`s.
  - Queries `tx.serviceTariff.findMany` with `where: { id: { in: tariffIds }, clinicId }`.
  - If any referenced tariff does not exist in the database or belongs to another tenant/clinic, throws `NotFoundException` (HTTP 404):
    `"Service tariff '<id>' does not exist or does not belong to this clinic"`.
  - Checks `tariff.isActive`. If inactive/stale, throws `BadRequestException` (HTTP 400):
    `"Service tariff '<name>' is inactive and cannot be billed"`.
  - Collects all non-empty `treatmentPlanItemId`s and queries `tx.treatmentPlanItem.findMany` scoped to the clinic's treatment plans. If missing or cross-tenant, throws `NotFoundException` (HTTP 404).

#### 3. Graceful Prisma P2003 Error Translation
**File:** `backend/src/billing/billing.service.ts`
- Added `handlePrismaError(err)` helper:
  - Intercepts `PrismaClientKnownRequestError` with code `P2003`.
  - Determines the target field (`serviceTariffId`, `patientId`, `treatmentPlanItemId`).
  - Throws clean `NotFoundException` or `BadRequestException` with descriptive error details rather than letting an unhandled 500 error crash the transaction.
- Integrated `validateLineItemReferences` and `handlePrismaError` across:
  - `createDraftInvoice()`
  - `updateDraftInvoice()`
  - `createAndIssueInvoice()`

### B. Frontend Fixes

#### 1. Tariff ID Sanitizer in Store
**File:** `src/services/clinicStore.ts`
- Added `sanitizeTariffId(serviceId)`:
  - Filters out client mock prefixes (`trt-*`, `SRV-*`, `plan-*`, `seed-*`).
  - Enforces standard UUID regex pattern `^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`.
  - Any non-UUID or seed identifier is mapped to `undefined`, allowing custom or seed services to be created as manual line items without referencing nonexistent foreign keys.

#### 2. Manual Customization Safeguard in UI
**File:** `src/pages/billing/NewInvoicePage.tsx`
- When a user selects a service from the tariff dropdown but subsequently edits the service name field, `serviceId` is automatically cleared (`serviceId: undefined`).
- Prevents associating a customized or renamed service with an unrelated catalog tariff record.

---

## 4. Test Verification & Results

### A. Isolated Integration Tests
Created isolated test suite in `backend/src/billing/billing-isolated-tariff.spec.ts` using an in-memory transactional mock adhering to Prisma's exact schema contracts:

```
cd backend; npx vitest run src/billing/billing-isolated-tariff.spec.ts
```
**Results:**
- `✓ creates an invoice with a valid tariff belonging to the authenticated clinic` (277ms)
- `✓ creates an invoice with a manual service item having null/undefined serviceTariffId`
- `✓ rejects with NotFoundException (404) when a line item references a nonexistent serviceTariffId`
- `✓ rejects with NotFoundException (404) and enforces tenant isolation when tariff belongs to another clinic`
- `✓ rejects with BadRequestException (400) when referencing a deactivated/stale service tariff`
- `✓ rolls back transaction entirely when any line item has an invalid tariff (no partial invoice)`
- `✓ catches Prisma P2003 foreign key violation and translates to clean NotFoundException`

**Summary:** 1 test file passed, 7/7 tests passed (100%).

### B. Backend Regression & Full Test Suite
Added 7 regression test cases directly into `backend/src/billing/billing.service.spec.ts`.

```
cd backend; npx vitest run
```
**Results:**
- `src/clinical-notes/clinical-notes.service.spec.ts` (13 tests) ✓
- `src/treatment-plans/treatment-plans.service.spec.ts` (10 tests) ✓
- `src/billing/billing.service.spec.ts` (35 tests) ✓
- `src/auth/auth.service.spec.ts` (3 tests) ✓
- `src/app.controller.spec.ts` (1 test) ✓
- `src/billing/billing-isolated-tariff.spec.ts` (7 tests) ✓
- `src/prescriptions/prescriptions.service.spec.ts` (12 tests) ✓
- `src/enquiries/enquiries.service.spec.ts` (5 tests) ✓
- `src/clinical/clinical.service.spec.ts` (7 tests) ✓
- `src/appointments/appointments.service.spec.ts` (3 tests) ✓
- `src/common/guards/tenant.guard.spec.ts` (4 tests) ✓

**Summary:** 11 test files passed, 100/100 tests passed (100%).

### C. Frontend Full Test Suite
```
npx vitest run
```
**Summary:** 17 test files passed, 133/133 tests passed (100%).

### D. TypeScript Validation & Production Builds
- **Backend Typecheck:** `npx tsc -p tsconfig.build.json --noEmit` -> **0 errors**
- **Frontend Typecheck:** `npx tsc --noEmit` -> **0 errors**
- **Backend Build:** `npm run build` (`nest build`) -> **Success (code 0)**
- **Frontend Build:** `npm run build` (`vite build`) -> **Success in 16.08s (code 0)**

---

## 5. Shared Database & Safety Compliance

- **Neon Shared Database:** `neondb` (PostgreSQL on AWS Singapore) was **never modified**.
- **No Database DDL/Migrations:** Foreign key constraints (`InvoiceLineItem_serviceTariffId_fkey`) remain strictly intact.
- **No Git Merge / Push:** All changes remain in the local working tree on branch `test/merge-master-with-billing`.

---

## 6. Summary of Changed Files

| File | Change Description |
|------|-------------------|
| `backend/src/billing/billing.service.ts` | Added `validateLineItemReferences()`, `handlePrismaError()`, and P2003 translation across draft and issued invoice flows. |
| `backend/src/billing/billing-calculation.service.ts` | Added string trimming and whitespace-to-undefined sanitization for `serviceTariffId` and `treatmentPlanItemId`. |
| `backend/src/billing/billing.service.spec.ts` | Added 7 regression tests covering valid tariff, manual item, nonexistent tariff, cross-clinic tariff, inactive tariff, transaction rollback, and P2003 handling. |
| `backend/src/billing/billing-isolated-tariff.spec.ts` | Created 7 isolated tariff tests verifying end-to-end transactional validation. |
| `src/services/clinicStore.ts` | Added `sanitizeTariffId()` to strip mock seed IDs (`trt-*`, `SRV-*`) and enforce UUID formats. |
| `src/pages/billing/NewInvoicePage.tsx` | Reset `serviceId` to `undefined` when service name is edited manually. |

