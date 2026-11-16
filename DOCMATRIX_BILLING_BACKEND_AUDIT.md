# DOCMATRIX — BILLING MODULE READ-ONLY AUDIT REPORT

**Author:** Lead Backend & Database Reliability Engineer  
**Date:** November 5, 2026  
**Git Branch:** `integration/clinical-inventory-billing`  
**Execution Environment:** Local Workspace & Neon PostgreSQL (`neondb`)  
**Audit Scope:** Frontend UI, State Management, Backend Services/Controllers, Prisma Schema, Data Persistence, Inter-Module Integrations, and Test Coverage.  
**Mode:** STRICT READ-ONLY AUDIT (Zero schema modifications, zero code mutations, zero test mutations).

---

## 1. EXECUTIVE SUMMARY

The DocMatrix Billing module possesses an advanced, responsive React/TypeScript frontend UI that handles itemised invoice generation, payment collections, aging dues tracking, daily cash drawer reconciliation, price tariffs, and operating expenses.

However, the audit confirms that **the entire Billing module is 100% disconnected from the NestJS backend and Neon PostgreSQL database**.
- **0 Prisma models** exist for billing, invoices, payments, price tariffs, or expenses in `backend/prisma/schema.prisma`.
- **0 NestJS controllers, services, modules, or DTOs** exist in `backend/src/`.
- All billing entities are stored strictly in browser `localStorage` via `src/services/clinicStore.ts` and `src/services/billingStore.ts`.
- `syncWithBackend()` in `src/services/clinicStore.ts` does not fetch or save any billing records.
- Consequently, invoices created by one team member or in one browser are completely invisible to other team members and are lost if browser storage is cleared.

---

## 2. VERIFIED FINDINGS VS. ASSUMPTIONS

To maintain strict engineering rigor, all findings in this audit are explicitly classified:
- **[VERIFIED FINDING]:** Confirmed by direct source-code inspection, AST search, or runtime environment verification.
- **[ASSUMPTION / HYPOTHESIS]:** Extrapolations or intended architectural designs based on comments or partial UI implementations.

---

## 3. AUDIT SECTIONS

### 3.1 Features Fully Implemented (Frontend UI & Local Store)

*All items below are **[VERIFIED FINDINGS]** fully operational on the client side using `localStorage`, but lack backend database persistence.*

1. **Itemised Invoice Creation & Calculation Engine**
   - **File Path:** [`src/pages/billing/NewInvoicePage.tsx`](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/src/pages/billing/NewInvoicePage.tsx)
   - **Functions:** `createItemisedInvoice()`, `lineItemTotals()`, `effectivePrice()`, `gstRateFor()`
   - **Details:** Supports adding custom items, catalog services, or procedures from treatment plans. Accurately calculates gross totals, line-level flat discounts, GST (0% treatment vs 18% cosmetic), subtotal, tax total, and grand total. Supports upfront partial or full payment collection.
2. **Invoices Directory & Multi-Status Filtering**
   - **File Path:** [`src/pages/billing/InvoicesPage.tsx`](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/src/pages/billing/InvoicesPage.tsx)
   - **Functions:** `InvoicesPage()`, `patientLabel()`, `prettyDate()`
   - **Details:** Real-time search across invoice ID, service description, and patient name. Status filters: `All`, `Unpaid`, `Partial`, `Paid`. Displays billed amount and remaining balance.
3. **Interactive Invoice Detail Drawer & Thermal/PDF Printing**
   - **File Path:** [`src/pages/billing/BillingShared.tsx`](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/src/pages/billing/BillingShared.tsx#L151-L301)
   - **Functions:** `InvoiceDrawer()`, `printInvoice()`, `escapeHtml()`
   - **Details:** Side drawer displays detailed line items, unit rates, teeth numbers, payment timeline, and notes. `printInvoice()` renders a standalone branded printable HTML invoice with clinic header, tax exemption notes, and triggers `window.print()`.
4. **Part & Full Payment Collection Dialog**
   - **File Path:** [`src/pages/billing/BillingShared.tsx`](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/src/pages/billing/BillingShared.tsx#L67-L149)
   - **Functions:** `PaymentDialog()`, `recordInvoicePayment()`, `invoiceBalance()`, `invoicePaidAmount()`
   - **Details:** Supports Cash, Card, and UPI with transaction/reference IDs. Caps payment at remaining balance. Automatically updates invoice status (`Unpaid` -> `Partial` -> `Paid`).
5. **Outstanding Dues & Aging Analysis**
   - **File Path:** [`src/pages/billing/PendingDuesPage.tsx`](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/src/pages/billing/PendingDuesPage.tsx)
   - **Functions:** `PendingDuesPage()`, `ageInDays()`, `patientLabel()`
   - **Details:** Categorizes unpaid balances into aging buckets: `All`, `0–30 days`, `31–60 days`, and `60+ days` (with visual alert). Provides a direct `tel:` link to call the patient and a one-click "Collect" modal trigger.
6. **Daily Collection & Cash Drawer Reconciliation**
   - **File Path:** [`src/pages/billing/DailyCollectionPage.tsx`](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/src/pages/billing/DailyCollectionPage.tsx)
   - **Functions:** `DailyCollectionPage()`, `shiftDate()`, `localDate()`
   - **Details:** Day-by-day cash drawer settlement. Date navigator, breakdown of payments by mode (Cash, Card, UPI), expected physical cash in drawer calculation, and printable cash-up report.
7. **Payment History Ledger & CSV Export**
   - **File Path:** [`src/pages/billing/PaymentsHistoryPage.tsx`](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/src/pages/billing/PaymentsHistoryPage.tsx)
   - **Functions:** `PaymentsHistoryPage()`, `exportCsv()`, `usePayments()`
   - **Details:** Reverse-chronological transaction log of all receipts across all invoices. Filters by payment mode, date range (`from` to `to`), reference search, and formatted client-side CSV download.
8. **Patient Profile Billing Ledger**
   - **File Path:** [`src/pages/patients/PatientProfilePage.tsx`](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/src/pages/patients/PatientProfilePage.tsx#L1630-L1675)
   - **Functions:** `PatientProfilePage()` tab renderer (`tab === 'billing'`)
   - **Details:** Embedded billing tab at `/patients/:id/billing`. Shows patient-specific total billed, total paid, balance due, list of patient invoices with "Collect" and "View" actions, and "+ Create first invoice" shortcut.

---

### 3.2 Features Partially Implemented

1. **Service Price List / Clinic Tariffs (`bill.price-list`)**
   - **[VERIFIED FINDING]:** Complete UI component exists at [`src/pages/billing/PriceListPage.tsx`](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/src/pages/billing/PriceListPage.tsx) with functions `saveService()`, `toggleServiceActive()`, category grouping, offer prices, and GST classification.
   - **[VERIFIED FINDING]:** In [`src/routes/appRoutes.jsx` lines 22 & 232](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/src/routes/appRoutes.jsx#L22), `bill.price-list` was added to `REMOVED_BILLING_PAGES` and redirects to `/billing`. The service list still seeds default prices for the invoice composer from `DENTAL_TREATMENTS` via `billingStore.ts`.
2. **Clinic Expense Tracking (`bill.expenses`)**
   - **[VERIFIED FINDING]:** Complete UI component exists at [`src/pages/billing/ExpensesPage.tsx`](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/src/pages/billing/ExpensesPage.tsx) with functions `addExpense()`, `deleteExpense()`, monthly aggregations, and category breakdown bars.
   - **[VERIFIED FINDING]:** Like Price List, it was redirected to `/billing` in `src/routes/appRoutes.jsx` and stores data in `localStorage['docmatrix_billing_<clinicId>']`.
3. **Treatment Plan to Invoice Conversion**
   - **[VERIFIED FINDING]:** In [`src/pages/billing/NewInvoicePage.tsx` lines 28–31 and 65–72](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/src/pages/billing/NewInvoicePage.tsx#L28-L72), `planSuggestions` and `addFromPlan()` read flat properties `plan.procedure`, `plan.toothNumber`, `plan.cost`, `plan.category`.
   - **[VERIFIED FINDING]:** This references the legacy single-procedure plan structure and does not yet integrate with the multi-stage, multi-item estimate records (`TreatmentPlanStage`, `TreatmentPlanItem`, `TreatmentEstimateRevision`) in Neon PostgreSQL.

---

### 3.3 Features Not Implemented

1. **Inventory Stock Deduction on Invoice Finalization:**
   - **[VERIFIED FINDING]:** Invoicing a patient for treatments or supplies does **not** check inventory stock or decrement batch quantities in `InventoryBatch`, nor does it log an `InventoryAudit` entry.
2. **Refunds, Credit Notes & Payment Reversals:**
   - **[VERIFIED FINDING]:** No UI or data structure exists for recording refunds or voiding an invoice once issued.
3. **Tally / Accounting Export:**
   - **[VERIFIED FINDING]:** While advertised in marketing strings ([`src/App.jsx` line 110](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/src/App.jsx#L110)), no XML/JSON Tally format export or accounting integration exists.
4. **Automated Recurring Invoices / Installment Plans:**
   - **[VERIFIED FINDING]:** Invoices support manual partial payments, but have no EMI/installment schedule automation.

---

### 3.4 Existing Backend APIs

- **Inspected Files:** [`backend/src/app.module.ts`](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/backend/src/app.module.ts), [`backend/src/`](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/backend/src/)
- **[VERIFIED FINDING]:** **0 Billing APIs exist.**
  - There are NO endpoints for `/billing`, `/invoices`, `/payments`, `/tariffs`, or `/expenses`.
  - Registered backend modules are: `AuthModule`, `ClinicsModule`, `PatientsModule`, `AppointmentsModule`, `PlansModule` (SaaS plans), `SubscriptionsModule` (SaaS subscriptions), `ClinicalModule`, `InventoryModule`, `EnquiriesModule`, `PrescriptionsModule`, `ClinicalNotesModule`, and `TreatmentPlansModule`.

---

### 3.5 Existing Prisma Models

- **Inspected File:** [`backend/prisma/schema.prisma`](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/backend/prisma/schema.prisma)
- **[VERIFIED FINDING]:** **0 Billing models exist.**
  - The schema has 24 models: `User`, `Clinic`, `ClinicSequence`, `Patient`, `ToothCondition`, `PatientDocument`, `PatientConsent`, `Appointment`, `Enquiry`, `Prescription`, `PrescriptionItem`, `ClinicalNote`, `ClinicalNoteAddendum`, `TreatmentPlan`, `TreatmentPlanStage`, `TreatmentPlanItem`, `TreatmentEstimateRevision`, `TreatmentPlanHistory`, `InventoryItem`, `InventoryBatch`, `InventoryAudit`, `Plan`, `PlanFeature`, `Subscription`.
  - *Distinction:* `Plan` and `Subscription` represent SaaS subscriptions for dental clinics subscribing to DocMatrix (e.g. Starter/Pro monthly subscriptions), **not** patient treatment invoicing.
  - Required physical tables `Invoice`, `InvoiceLineItem`, `InvoicePayment`, `ServiceTariff`, and `Expense` do not exist.

---

### 3.6 Frontend Features Without Backend Integration

*All features listed below operate solely in browser memory and local storage:*

| Frontend Feature | Component | Store & Mutation Function | Missing Backend Route |
| :--- | :--- | :--- | :--- |
| Create Invoice | `NewInvoicePage.tsx` | `clinicStore.createItemisedInvoice()` | `POST /billing/invoices` |
| View Invoices | `InvoicesPage.tsx` | `useClinicData().invoices` | `GET /billing/invoices` |
| Record Payment | `BillingShared.tsx` (`PaymentDialog`) | `clinicStore.recordInvoicePayment()` | `POST /billing/invoices/:id/payments` |
| Pending Dues | `PendingDuesPage.tsx` | `clinicStore.invoiceBalance()` | `GET /billing/dues` or computed |
| Daily Collection | `DailyCollectionPage.tsx` | `usePayments()` | `GET /billing/collection?date=` |
| Payments Ledger | `PaymentsHistoryPage.tsx` | `usePayments()` | `GET /billing/payments` |
| Price Tariffs | `PriceListPage.tsx` | `billingStore.saveService()` | `GET /billing/services`, `POST /billing/services` |
| Clinic Expenses | `ExpensesPage.tsx` | `billingStore.addExpense()` | `GET /billing/expenses`, `POST /billing/expenses` |
| Patient Invoices | `PatientProfilePage.tsx` | `invoices.filter(i => i.patientId)` | `GET /patients/:id/invoices` |

---

### 3.7 Missing Integrations

1. **Backend Synchronization (`syncWithBackend`):**
   - **File Path:** [`src/services/clinicStore.ts` lines 1528–1538](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/src/services/clinicStore.ts#L1528-L1538)
   - **[VERIFIED FINDING]:** `syncWithBackend()` executes `Promise.all` across patients, appointments, tooth-charts, documents, consents, enquiries, prescriptions, clinical-notes, and treatment-plans. It contains **no call to fetch or push invoices or payments**.
2. **Clinical Treatment Plans to Billing:**
   - **[VERIFIED FINDING]:** The recent Clinical update added structured `TreatmentPlanStage` and `TreatmentPlanItem` records in Neon. Billing's `NewInvoicePage.tsx` still reads legacy flat fields and cannot import items by stage or mark stage items as "Billed".
3. **Inventory Consumption on Invoicing:**
   - **[VERIFIED FINDING]:** Although `InventoryItem` and `InventoryBatch` tables now exist in Neon, there is no trigger, foreign key, or service call linking billed dental procedures (e.g. Composite filling, Implant) to inventory batch deductions.

---

### 3.8 Recommended Backend Development Order

To implement the backend for Billing safely without breaking the existing UI or causing database migration issues, the following phased sequence is recommended:

#### Step 1: Database Schema & Migration (Isolated Dev Environment)
1. Add multi-tenant Prisma models in `schema.prisma`:
   - `Invoice` (`id`, `clinicId`, `patientId`, `appointmentId`, `invoiceNumber`, `description`, `subtotal`, `discountTotal`, `taxTotal`, `totalAmount`, `status`, `notes`, `createdAt`, `updatedAt`).
   - `InvoiceLineItem` (`id`, `invoiceId`, `serviceId`, `name`, `toothNumber`, `quantity`, `unitPrice`, `discount`, `gstRate`, `totalAmount`).
   - `InvoicePayment` (`id`, `clinicId`, `invoiceId`, `amount`, `mode`, `reference`, `receivedAt`, `notes`).
   - `ServiceTariff` (`id`, `clinicId`, `name`, `category`, `price`, `offerPrice`, `gstClass`, `isActive`).
   - `Expense` (`id`, `clinicId`, `date`, `category`, `description`, `vendor`, `amount`, `mode`, `createdAt`).
2. Generate migration `20261105xxxxxx_billing_module` via `prisma migrate dev` on a local/test database.

#### Step 2: NestJS Backend Module Implementation
1. Create `backend/src/billing/`:
   - `billing.module.ts`, `billing.controller.ts`, `billing.service.ts`.
   - DTOs with `class-validator`: `CreateInvoiceDto`, `CreateInvoiceItemDto`, `RecordPaymentDto`, `CreateTariffDto`, `CreateExpenseDto`.
2. Apply `JwtAuthGuard` and `TenantGuard` to enforce multi-tenant clinic isolation.
3. Implement transactional creation (`prisma.$transaction`) for invoice + items + initial payment.

#### Step 3: Frontend API Client & Store Synchronization
1. Add typed methods to `src/services/apiClient.ts` for billing.
2. Update `src/services/clinicStore.ts`:
   - Include billing endpoints in `syncWithBackend()`.
   - Update `createInvoice()`, `createItemisedInvoice()`, and `recordInvoicePayment()` to send HTTP requests to the backend with optimistic UI updates.
3. Update `src/services/billingStore.ts` to sync `services` and `expenses` with the backend.

#### Step 4: Inter-Module Linkage & Testing
1. Upgrade `NewInvoicePage.tsx` to pull items from the new `TreatmentPlanItem` records.
2. Write backend Vitest unit & e2e test suites covering invoice creation, partial payment capping, dues aging calculations, and multi-tenant isolation.

---

## 4. AUDIT CONCLUSION & NEXT STEPS

- **Status:** **AUDIT COMPLETE — ZERO SYSTEM MUTATIONS PERFORMED.**
- **Repository State:** Current branch is `integration/clinical-inventory-billing`. Working tree remains clean of uncommitted source code modifications.
- **Action Required:** We await your explicit review and approval of this audit and the recommended development order before creating any files, models, or migrations.
