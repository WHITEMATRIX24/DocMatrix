# DocMatrix Billing Backend — Complete Implementation Report

**Date:** 2026-11-05  
**Branch:** `integration/clinical-inventory-billing`  
**Status:** COMPLETE & VERIFIED — Ready for Frontend Wiring & Production Migration  

---

## 1. Executive Summary

The complete backend implementation of the **DocMatrix Billing Module** is finished, verified against isolated PostgreSQL test databases, and fully regression-tested against existing Clinical, Inventory, Patient, and Authentication modules.

All operations—from draft invoice creation, sequential numbering, and upfront payments to multi-payment tracking, overpayment locks, refund linkage, pending dues aging, daily collections reconciliation, tariffs master price list, expenses, and treatment plan billing—have been built following NestJS best practices, strict tenant isolation, and atomic database invariants.

---

## 2. Implemented Backend Features

### A. Invoice Management (Lifecycle & Sequential Numbering)
- **Draft Creation & Editing:** Support creating draft invoices with arbitrary or tariff-referenced line items. Drafts can be iteratively edited, updated, or discarded before issuance.
- **Atomic Sequential Numbering:** Leverages PostgreSQL atomic row-level locks on `ClinicSequence` (`sequenceType = 'INVOICE'`) with an upsert `ON CONFLICT DO UPDATE RETURNING "currentValue"` pattern. Issues permanent, gapless invoice numbers (e.g., `INV-1001`, `INV-1002`) unique per clinic (`@@unique([clinicId, invoiceNumber])`).
- **Issuance Lock:** Issuing an invoice transitions its status to `ISSUED`, records `issuedAt = CURRENT_TIMESTAMP`, and starts the aging clock. All line items and unit rates become immutable.
- **Direct Issuance with Upfront Payment:** Enables single-request creation, sequential numbering, and full/partial payment recording (mirroring the React frontend's `createItemisedInvoice` flow).
- **Audit-Logged Invalidation (Void):** Controlled voiding of invoices with mandatory reason logging and user audit attribution (`voidedById`, `voidedAt`). Strictly disallows voiding invoices with active payments unless full refunds are recorded first.

### B. Payment Management & Anti-Overpayment Controls
- **Flexible Inbound Modes:** Full and partial payments supported across `CASH`, `CARD`, `UPI`, `NET_BANKING`, and `CHEQUE`.
- **Anti-Overpayment Guard:** Uses pessimistic database transactions with `SELECT ... FOR UPDATE` row locks to ensure concurrent or rapid payment submissions never exceed the remaining invoice balance.
- **Idempotency Protection:** Enforces client-supplied UUID idempotency keys via database unique constraint `@@unique([clinicId, idempotencyKey])`. Duplicate requests safely return the existing payment without duplicate deductions or double-charging.
- **Refunds & Reversals:** Full and partial refunds link directly to the original parent payment (`refundForPaymentId`). Refunds deduct from `paidAmount`, restore the invoice `balance`, and automatically revert invoice status from `PAID` back to `PARTIALLY_PAID` or `ISSUED`.
- **Automatic Status Machine:** Automatically derives invoice payment status based on exact paid balance: `ISSUED` ($₹0$), `PARTIALLY_PAID` ($0 < \text{paid} < \text{total}$), `PAID` ($\text{paid} \ge \text{total}$).

### C. Pending Dues & Aging Calculations
- **Aging Analysis:** Automatically categorizes outstanding invoices into chronological aging buckets based on issuance date:
  - `0–30 days` (current)
  - `31–60 days` (overdue)
  - `60+ days` (severely overdue)
- **Patient-Wise Aggregation:** Aggregates outstanding balances grouped by patient with invoice count and oldest invoice timestamp.
- **Clean Audit Scope:** Excludes `DRAFT` and `VOID` invoices from all dues reporting.

### D. Daily Collection & Cash-Up Reconciliation
- **Daily Financial Summary:** Aggregates payments by mode (`CASH`, `CARD`, `UPI`, `NET_BANKING`, `CHEQUE`) for any specified date or date range.
- **Reconciliation Audit:** Explicitly distinguishes **gross collections**, **refund adjustments**, and **net collections** to assist daily reception and counter handovers.

### E. Billing Overview Dashboard Metrics
- **Persistent KPI Calculations:** Real-time metrics calculated directly from database records:
  - Total invoiced volume
  - Total payments collected
  - Total outstanding balances
  - Invoice status counts (`PAID`, `PARTIALLY_PAID`, `ISSUED`, `DRAFT`, `VOID`)
  - Payment mode distribution
  - Recent invoices and recent payment logs

### F. Service Tariffs (Master Price List)
- **Clinic Master Catalog:** Complete CRUD for clinic tariffs with `code`, `name`, `category`, `standardFee`, and `offerPrice`.
- **Configurable GST Slabs:** Supports `EXEMPT`, `TAXABLE`, and `NIL_RATED` with configurable percentage rates ($0\%$, $5\%$, $12\%$, $18\%$, $28\%$).
- **Historical Immutability:** Updating tariff fees does not alter historical invoice line items, which preserve price snapshots at invoice creation.
- **Soft Deactivation:** Tariffs referenced by existing invoices are deactivated (`isActive: false`) rather than hard-deleted.

### G. Clinic Expense Management
- **Ledger Tracking:** Complete CRUD for operating expenses across categories: `LAB_FEES`, `DENTAL_SUPPLIES`, `RENT`, `SALARIES`, `UTILITIES`, `EQUIPMENT_MAINTENANCE`, `MARKETING`, and `OTHER`.
- **Atomic Expense Sequence:** Sequential expense numbers (`EXP-1001`, `EXP-1002`) generated via `ClinicSequence`.
- **Categorical Breakdown:** Expense summary endpoints providing category-wise spending totals.

### H. Clinical Treatment Plan Integration
- **Treatment Plan to Invoice Conversion:** Convert treatment plans or selected stages into invoice line items with tooth number, procedure name, and stage fee snapshots.
- **Duplicate Billing Prevention:** Validates against active invoices to prevent double-billing of treatment plan items (`ConflictException`).

---

## 3. Complete API Endpoint List

All endpoints require JWT Bearer Authentication (`JwtAuthGuard`) and Tenant Authorization (`TenantGuard`). Every query is strictly isolated by `req.user.clinicId`.

| Method | Endpoint | Description | Request Body / Query | Role / Auth |
|---|---|---|---|---|
| `GET` | `/billing/dashboard` | KPI metrics, counts, payment breakdown | None | Authenticated Staff |
| `POST` | `/billing/invoices/draft` | Create draft invoice | `CreateDraftInvoiceDto` | Authenticated Staff |
| `GET` | `/billing/invoices` | List & filter invoices | `InvoiceQueryDto` (`status`, `patientId`, `search`, `page`, `limit`) | Authenticated Staff |
| `GET` | `/billing/invoices/:id` | Get invoice details with items & payments | None | Authenticated Staff |
| `PATCH` | `/billing/invoices/:id/draft` | Update draft items, notes, patient | `UpdateDraftInvoiceDto` | Authenticated Staff |
| `POST` | `/billing/invoices/:id/issue` | Issue draft invoice (locks items, assigns `INV-xxxx`) | None | Authenticated Staff |
| `POST` | `/billing/invoices/issue` | Directly create, issue, and optionally take upfront payment | `CreateAndIssueInvoiceDto` | Authenticated Staff |
| `POST` | `/billing/invoices/:id/void` | Void issued invoice with reason | `VoidInvoiceDto` (`reason`) | Authenticated Staff |
| `POST` | `/billing/invoices/from-treatment-plan` | Generate invoice line items from treatment plan | `InvoiceFromTreatmentPlanDto` | Authenticated Staff |
| `POST` | `/billing/invoices/:id/payments` | Record full or partial payment with idempotency key | `RecordPaymentDto` (`amount`, `mode`, `reference`, `idempotencyKey`) | Authenticated Staff |
| `POST` | `/billing/payments/:id/refund` | Refund payment and restore balance | `RefundPaymentDto` (`amount`, `reason`, `reference`) | Authenticated Staff |
| `GET` | `/billing/dues` | List pending dues with 0-30, 31-60, 60+ aging buckets | `DuesQueryDto` (`aging`, `patientId`, `search`) | Authenticated Staff |
| `GET` | `/billing/dues/patient-wise` | Aggregated pending dues grouped by patient | None | Authenticated Staff |
| `GET` | `/billing/collections/daily` | Daily collections summary & cash-up reconciliation | `CollectionQueryDto` (`date`, `mode`, `fromDate`, `toDate`) | Authenticated Staff |
| `POST` | `/billing/tariffs` | Create service tariff | `CreateTariffDto` | Authenticated Staff |
| `GET` | `/billing/tariffs` | List tariffs with category and search filters | `TariffQueryDto` (`category`, `search`, `isActive`) | Authenticated Staff |
| `GET` | `/billing/tariffs/:id` | Get tariff details | None | Authenticated Staff |
| `PATCH` | `/billing/tariffs/:id` | Update tariff prices, GST, category | `UpdateTariffDto` | Authenticated Staff |
| `PATCH` | `/billing/tariffs/:id/toggle-active` | Toggle tariff active/inactive | None | Authenticated Staff |
| `DELETE` | `/billing/tariffs/:id` | Soft delete/deactivate tariff | None | Authenticated Staff |
| `POST` | `/billing/expenses` | Record operating expense | `CreateExpenseDto` | Authenticated Staff |
| `GET` | `/billing/expenses` | List clinic expenses | `ExpenseQueryDto` (`category`, `fromDate`, `toDate`, `search`) | Authenticated Staff |
| `GET` | `/billing/expenses/summary` | Expense breakdown by category | None | Authenticated Staff |
| `GET` | `/billing/expenses/:id` | Get expense details | None | Authenticated Staff |
| `PATCH` | `/billing/expenses/:id` | Update expense details | `UpdateExpenseDto` | Authenticated Staff |
| `DELETE` | `/billing/expenses/:id` | Delete expense record | None | Authenticated Staff |

---

## 4. Database Models Used

The module utilizes the 5 Prisma models added and verified in Phase 1B:

1. **`Invoice`**: Stores tenant-isolated invoice header, financial aggregates, lifecycle status, timestamps, and audit references.
2. **`InvoiceLineItem`**: Stores itemized service lines with historical unit price, discount, GST rate, taxable amount, tax amount, and total amount.
3. **`InvoicePayment`**: Stores inbound payments and outbound refunds, payment mode, audit actor, reference, idempotency key, and refund parent linkage.
4. **`ServiceTariff`**: Master clinic price catalog with standard fee, offer price, GST class, and active flags.
5. **`Expense`**: Operating expense ledger with sequential expense numbering, category, vendor, amount, and payment mode.
6. **`ClinicSequence`**: Atomic PostgreSQL sequence counter for gapless `INVOICE` and `EXPENSE` numbering.

---

## 5. Patient and Clinical Integration Status

- **Patient Resolution:** Seamlessly accepts both internal patient UUIDs and human-readable patient codes (e.g., `pt-1001` from the frontend). Validates tenant isolation against `req.user.clinicId`.
- **Treatment Plans:** Direct conversion of multi-stage treatment plans to invoices (`POST /billing/invoices/from-treatment-plan`).
- **Anti-Duplicate Billing:** Queries active invoice line items before generating bills from treatment plans. Rejects duplicate billing of the same procedure item with HTTP `409 Conflict`.
- **Appointments:** Optional association with clinic appointments (`appointmentId`) for consolidated patient visits.

---

## 6. Inventory Integration Status

- **Non-Interference Guarantee:** Billing does not trigger automatic inventory stock deductions on invoice issuance.
- **Workflow Boundary Preserved:** Dental consumable deduction remains explicitly coupled to clinical procedure completion (`InventoryService.confirmDeduction`) where actual materials used, wastage, and lot numbers are verified by clinical staff.
- **Integration Reference:** Invoices reference clinical treatment plan items (`treatmentPlanItemId`), allowing full end-to-end traceability between clinical consumption audits and patient bills without double-deduction risks.

---

## 7. Financial Calculation & Security Safeguards

- **Half-Up Rounding:** All monetary amounts are computed to 2 decimal places using half-up arithmetic (`round2`), preventing 1-paise discrepancies.
- **Zero Client Trust:** Invoice subtotals, tax totals, discount totals, and grand totals are calculated entirely on the backend from line item unit rates.
- **Anti-Overpayment Database Lock:** Payments are wrapped in transactions with `SELECT ... FOR UPDATE` row locks, strictly rejecting amounts exceeding the remaining balance.
- **Idempotency Locks:** Database-level compound unique constraint `@@unique([clinicId, idempotencyKey])` prevents accidental double-charges.
- **Delete Immutability:** `onDelete: Restrict` prevents deletion of invoices with existing payments, preserving complete financial audit trails.

---

## 8. Test Results Breakdown

### A. Vitest Test Suite Execution
- **Total Test Files:** 10 passed (10 total)
- **Total Tests:** **86 passed (86 total, 0 failed)**
  - Existing Clinical Notes, Treatment Plans, Prescriptions, Appointments, Enquiries, Tenant Guards, Auth: **58 passed**
  - New Billing Module Comprehensive Unit Tests: **28 passed**

```
 Test Files  10 passed (10)
      Tests  86 passed (86)
   Duration  20.54s
```

### B. Isolated PostgreSQL Database Integration Test
Executed against `docmatrix_billing_migration_test` (real Neon PostgreSQL endpoint):
- Target database verification: PASS (`docmatrix_billing_migration_test`)
- Clinic, staff, and patient seed: PASS
- Service tariff creation: PASS
- Atomic `ClinicSequence` sequential numbering (`INV-1001`, `INV-1002`): PASS
- Invoice and 2 line items persistence: PASS (₹7,000)
- Partial payment recording (₹3,000 via UPI) -> status `PARTIALLY_PAID`: PASS
- Payment idempotency constraint (duplicate key rejected by PostgreSQL unique constraint): PASS
- Full payment recording (₹4,000 via CASH) -> status `PAID`, balance $₹0$: PASS
- Audit protection (`onDelete: Restrict` blocked deletion of invoice with payments): PASS
- Refund recording ($₹1,000$ linked to parent payment) -> status restored to `PARTIALLY_PAID`, balance restored to $₹1,000$: PASS
- Clinic expense recording with sequential `EXP-1001`: PASS
- Database-level tenant isolation (cross-clinic queries return 0 records): PASS

---

## 9. New and Modified Files

### New Files:
- `backend/src/billing/billing.module.ts`
- `backend/src/billing/billing.controller.ts`
- `backend/src/billing/billing.service.ts`
- `backend/src/billing/billing-calculation.service.ts`
- `backend/src/billing/billing.service.spec.ts`
- `backend/src/billing/dto/create-invoice-line-item.dto.ts`
- `backend/src/billing/dto/create-draft-invoice.dto.ts`
- `backend/src/billing/dto/update-draft-invoice.dto.ts`
- `backend/src/billing/dto/issue-invoice.dto.ts`
- `backend/src/billing/dto/void-invoice.dto.ts`
- `backend/src/billing/dto/invoice-query.dto.ts`
- `backend/src/billing/dto/record-payment.dto.ts`
- `backend/src/billing/dto/refund-payment.dto.ts`
- `backend/src/billing/dto/dues-query.dto.ts`
- `backend/src/billing/dto/collection-query.dto.ts`
- `backend/src/billing/dto/create-tariff.dto.ts`
- `backend/src/billing/dto/update-tariff.dto.ts`
- `backend/src/billing/dto/tariff-query.dto.ts`
- `backend/src/billing/dto/create-expense.dto.ts`
- `backend/src/billing/dto/update-expense.dto.ts`
- `backend/src/billing/dto/expense-query.dto.ts`
- `backend/src/billing/dto/invoice-from-treatment-plan.dto.ts`
- `backend/prisma/migrations/20261105150000_billing_module/migration.sql`

### Modified Files:
- `backend/src/app.module.ts` (registered `BillingModule`)
- `backend/src/common/decorators/current-user.decorator.ts` (added optional `name?: string` property for spec backward compatibility)
- `backend/prisma/schema.prisma` (Billing models and back-relations)

---

## 10. Frontend Integration Requirements

The backend is fully prepared to replace the localStorage / mock data in `src/pages/billing` and `src/services/billingStore.ts`:
1. **Invoice List & Details:** Switch `BillingWorkspace.tsx` from `clinicStore.invoices` to `GET /billing/invoices` and `GET /billing/invoices/:id`.
2. **Issue Invoices:** Wire "Create Invoice" modal to `POST /billing/invoices/issue`.
3. **Record Payments:** Wire payment collection popups to `POST /billing/invoices/:id/payments`.
4. **Pending Dues:** Wire the Pending Dues tab to `GET /billing/dues` and `GET /billing/dues/patient-wise`.
5. **Daily Collections:** Wire the Daily Collections tab to `GET /billing/collections/daily`.
6. **Price List / Tariffs:** Wire `src/services/billingStore.ts` to `GET /billing/tariffs`, `POST /billing/tariffs`, and `PATCH /billing/tariffs/:id`.
7. **Expenses:** Wire the Expenses tab to `GET /billing/expenses`, `POST /billing/expenses`, and `DELETE /billing/expenses/:id`.

---

## 11. Deployment and Migration Prerequisites

1. **Production Database Migration:**
   Deploy `20261105150000_billing_module` to production `neondb` using `npx prisma migrate deploy`.
2. **Git Commit & Merge:**
   Stage and commit changes on branch `integration/clinical-inventory-billing` after user sign-off.

