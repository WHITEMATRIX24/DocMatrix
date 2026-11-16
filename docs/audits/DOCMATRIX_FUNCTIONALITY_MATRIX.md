# DOCMATRIX FUNCTIONALITY MATRIX

**Last Updated:** November 10, 2026  
**Auditor:** Full-Stack Technical Auditor & QA Lead  
**Scope:** Complete functional inventory across 10 application domains (54 registered feature modules plus sub-components)  
**Status Legend:**
- **COMPLETE:** End-to-end verified (UI + API + DB + Cross-module flow operational)
- **PARTIAL:** Core path works, but edge cases, export, or secondary actions need completion
- **UI ONLY:** Interface rendered, mock/placeholder state, no backend persistence
- **BACKEND ONLY:** REST API / Prisma model exists without dedicated frontend view
- **BROKEN:** Code or integration exists but fails at runtime or contains known defects
- **NOT STARTED:** Planned roadmap item / `<FeaturePlaceholder />`

---

## 1. Appointments & Queue Management

| Module & ID | Sub-feature / Action | UI Exists? | Backend API Exists? | DB Model Exists? | Full Integration Verified? | Implementation Status | Notes & Gaps |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **`appt.new`** | Book appointment & walk-in | Yes | Yes (`POST /appointments`) | `Appointment` | Yes | **COMPLETE** | Validates doctor availability, working hours, patient link |
| **`appt.detail`** | Appointment record view & status | Yes | Yes (`GET/PATCH /appointments/:id`) | `Appointment` | Yes | **COMPLETE** | Supports cancel with reason, reschedule, check-in, complete |
| **`appt.queue`** | Live waiting room queue | Yes | Yes (`GET /appointments/queue`) | `Appointment` | Yes | **COMPLETE** | Real-time queue statuses (WAITING, IN_CHAIR, COMPLETED) |
| **`appt.calendar`** | Multi-doctor visual calendar | Yes | Yes (`GET /appointments`) | `Appointment` | Yes | **COMPLETE** | Day/Week/Month views, doctor filter, color coding |
| **`appt.details-list`** | Appointments list & data table | Yes | Yes (`GET /appointments`) | `Appointment` | Yes | **COMPLETE** | Search by patient name, status, doctor, date range |
| **`appt.enquiries`** | Missed enquiries & lead capture | Yes | Yes (`GET/POST /enquiries`) | `Enquiry` | Yes | **COMPLETE** | Tracks lead status, conversion to patient appointment |

---

## 2. Patient Management

| Module & ID | Sub-feature / Action | UI Exists? | Backend API Exists? | DB Model Exists? | Full Integration Verified? | Implementation Status | Notes & Gaps |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **`pat.list`** | Patient directory & search | Yes | Yes (`GET /patients`) | `Patient` | Yes | **COMPLETE** | Paginated search, quick contact cards, status badges |
| **`pat.new`** | Patient registration & onboarding | Yes | Yes (`POST /patients`) | `Patient` | Yes | **COMPLETE** | Personal details, medical history, emergency contact |
| **`pat.profile`** | Patient 360 overview | Yes | Yes (`GET /patients/:id`) | `Patient` | Yes | **COMPLETE** | Summary cards, debt balance, active plan, next appointment |
| **`pat.timeline`** | Unified clinical timeline | Yes | Yes (`GET /patients/:id/timeline`) | Multiple | Yes | **COMPLETE** | Chronological merge of notes, invoices, prescriptions |
| **`pat.documents`** | Patient files & dental images | Yes | Yes (`POST /patients/:id/documents`) | `PatientDocument` | Partial | **PARTIAL** | Upload works; file storage is local/base64 rather than S3/R2 |
| **`pat.consents`** | Digital consent forms & sign | Yes | Yes (`POST /patients/:id/consents`) | `PatientConsent` | Yes | **COMPLETE** | Template selection, canvas digital signature, audit trail |
| **`pat.pending`** | Pending registrations & drafts | Yes | Yes (`GET /patients/pending`) | `Patient` | Yes | **COMPLETE** | Self-registered or web lead triage queue |
| **`pat.toothchart`** | Interactive adult/pedo odontogram | Yes | Yes (`GET/PUT /patients/:id/tooth-conditions`) | `ToothCondition` | Yes | **COMPLETE** | FDI notation (11-48, 51-85), 5 anatomical surfaces, history |

---

## 3. Clinical Management

| Module & ID | Sub-feature / Action | UI Exists? | Backend API Exists? | DB Model Exists? | Full Integration Verified? | Implementation Status | Notes & Gaps |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **`clin.prescriptions`**| Digital Rx prescription writer | Yes | Yes (`POST /clinical/prescriptions`) | `Prescription` | Yes | **COMPLETE** | Formulary auto-complete, dosage, duration, printable Rx |
| **`clin.plans`** | Multi-stage treatment plans | Yes | Yes (`/clinical/treatment-plans`) | `TreatmentPlan` | Yes | **COMPLETE** | Phase 1 & 2 complete: procedure staging, tooth map, discounts |
| **`clin.estimates`** | Cost estimates & revisions | Yes | Yes (`POST .../revisions`) | `TreatmentEstimateRevision` | Yes | **COMPLETE** | Patient acceptance (verbal/written), versioning (v1, v2) |
| **`clin.notes`** | Structured clinical note taking | Yes | Yes (`POST /clinical/notes`) | `ClinicalNote` | Yes | **COMPLETE** | Chief complaint, diagnosis, procedure, addendum lock |
| **`clin.orders`** | Lab orders tracking | Yes | Partial (`/clinical/lab-orders`) | Partial | Partial | **PARTIAL** | UI tracks status (Sent, Received, Fitted); lacks lab vendor master |

---

## 4. Billing & Financial Operations

| Module & ID | Sub-feature / Action | UI Exists? | Backend API Exists? | DB Model Exists? | Full Integration Verified? | Implementation Status | Notes & Gaps |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **`bill.invoices`** | Invoice list & filtering | Yes | Yes (`GET /billing/invoices`) | `Invoice` | Yes | **COMPLETE** | Filter by status (PAID, PARTIAL, PENDING, OVERDUE) |
| **`bill.new`** | Manual invoice creation | Yes | Yes (`POST /billing/invoices`) | `Invoice` | Yes | **COMPLETE** | Line items, tariffs selector, GST calculation, discounts |
| **`bill.plan-invoice`**| Invoice from Treatment Plan | Yes | Yes (`POST .../from-treatment-plan`) | `Invoice` | Yes | **COMPLETE** | Select procedures to bill; marks treatment items as BILLED |
| **`bill.detail`** | Invoice view & receipt generator | Yes | Yes (`GET /billing/invoices/:id`) | `Invoice` | Yes | **COMPLETE** | Printable tax invoice, thermal receipt layout, payment history |
| **`bill.payments`** | Payment recording & splits | Yes | Yes (`POST .../payments`) | `InvoicePayment` | Yes | **COMPLETE** | Cash, Card, UPI, NetBanking; partial payment allocation |
| **`bill.dues`** | Outstanding dues & ledger | Yes | Yes (`GET /billing/dues`) | `Invoice` | Yes | **COMPLETE** | Aging buckets, patient balance tracking |
| **`bill.tariffs`** | Service tariffs & procedure prices | Yes | Yes (`/billing/tariffs`) | `ServiceTariff` | Yes | **COMPLETE** | Standard clinic pricing with specialty categorization |
| **`bill.expenses`** | Clinic operational expenses | Yes | Yes (`/billing/expenses`) | `Expense` | Yes | **COMPLETE** | Expense categories, receipts, payment modes |

---

## 5. Inventory & Supply Chain

| Module & ID | Sub-feature / Action | UI Exists? | Backend API Exists? | DB Model Exists? | Full Integration Verified? | Implementation Status | Notes & Gaps |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **`inv.items`** | Item catalog & SKU master | Yes | Yes (`GET/POST /inventory/items`) | `InventoryItem` | Yes | **COMPLETE** | SKU, unit of measure, minimum stock threshold |
| **`inv.stock`** | Batch stock tracking & expiry | Yes | Yes (`GET /inventory/batches`) | `InventoryBatch` | Yes | **COMPLETE** | Expiry dates, batch numbers, remaining quantities |
| **`inv.movements`** | Stock in / Stock out audit log | Yes | Yes (`POST /inventory/movements`) | `InventoryAudit` | Yes | **COMPLETE** | Restock, write-off, disposal, adjustment with reason |
| **`inv.consumption`**| Procedure material consumption | Yes | Yes (`POST /inventory/consume`) | `InventoryAudit` | Yes | **COMPLETE** | Idempotent deduction with `operationId` preventing duplicates |
| **`inv.alerts`** | Low-stock and expiry alerts | Yes | Yes (`GET /inventory/alerts`) | `InventoryItem` | Yes | **COMPLETE** | Visual badges and dashboard warnings |

---

## 6. Reports & Analytics

| Module & ID | Sub-feature / Action | UI Exists? | Backend API Exists? | DB Model Exists? | Full Integration Verified? | Implementation Status | Notes & Gaps |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **`rep.revenue`** | Daily collection & revenue report | Yes | Client compute | Multi-model | Partial | **PARTIAL** | Computed in frontend `reportMetrics.ts`; needs backend aggregation |
| **`rep.doctor`** | Doctor productivity & procedures | Yes | Client compute | Multi-model | Partial | **PARTIAL** | Summarizes revenue and completed procedures per practitioner |
| **`rep.treatments`** | Treatment procedure distribution | Yes | Client compute | Multi-model | Partial | **PARTIAL** | Pie chart of top performed dental procedures |
| **`rep.followup`** | Patient recall & follow-up list | Yes | Client compute | Multi-model | Partial | **PARTIAL** | Lists completed treatments needing 3/6-month checkup |

---

## 7. Settings & Administration

| Module & ID | Sub-feature / Action | UI Exists? | Backend API Exists? | DB Model Exists? | Full Integration Verified? | Implementation Status | Notes & Gaps |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **`set.profile`** | Clinic Profile & Timings | Yes | Yes (`GET/PUT /settings/clinic`) | `ClinicSettings` | Yes | **COMPLETE** | Clinic name, address, GST, logo, letterhead, working hours |
| **`set.staff`** | Staff Management & RBAC | Yes | Yes (`/settings/staff`) | `User`, `Role` | Yes | **COMPLETE** | Add staff, role assignment (Owner, Doctor, Receptionist), deactivate |
| **`set.clinical`** | Formulary & Procedures catalog | Yes | Yes (`/settings/clinical-config`) | `ServiceTariff` | Yes | **COMPLETE** | Custom drugs, tariffs, diagnosis presets |
| **`set.security`** | Password, 2FA, Session policies | Yes | Yes (`/settings/security`) | `User` | Yes | **COMPLETE** | Password change, session timeout settings |
| **`set.privacy`** | Patient data retention & privacy | Yes | Yes (`/settings/privacy`) | `ClinicSettings` | Yes | **COMPLETE** | Data export policies, anonymization settings |
| **`set.data-exchange`**| Import/Export CSV & JSON | Yes | Yes (`/settings/data-exchange`) | Multiple | Yes | **COMPLETE** | Import patients CSV, export clinical & billing data |
| **`set.activity`** | System audit trail & logs | Yes | Yes (`GET /activity-logs`) | `ActivityLog` | Yes | **COMPLETE** | Tracks logins, updates, deletes with timestamp & IP |
| **`set.subscription`**| License plan & feature access | Yes | Yes (`/settings/subscription`) | `Tenant` | Yes | **COMPLETE** | Tier details (Starter, Pro, Enterprise), seat count |

---

## 8. Accounts & Financial Accounting (Roadmap / Unstarted)

| Module & ID | Sub-feature / Action | UI Exists? | Backend API Exists? | DB Model Exists? | Full Integration Verified? | Implementation Status | Notes & Gaps |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **`acc.daybook`** | Daily Day Book register | Placeholder | No | No | No | **NOT STARTED** | Displays `<FeaturePlaceholder id="acc.daybook" />` |
| **`acc.ledgers`** | Chart of Accounts & General Ledger | Placeholder | No | No | No | **NOT STARTED** | Needs double-entry bookkeeping schema |
| **`acc.pnl`** | Profit & Loss Statement | Placeholder | No | No | No | **NOT STARTED** | Planned for Stage 3 |
| **`acc.trial`** | Trial Balance | Placeholder | No | No | No | **NOT STARTED** | Planned for Stage 3 |
| **`acc.tally`** | Tally XML Export integration | Placeholder | No | No | No | **NOT STARTED** | Planned for Stage 3 |

---

## 9. WhatsApp Automation (Roadmap / Unstarted)

| Module & ID | Sub-feature / Action | UI Exists? | Backend API Exists? | DB Model Exists? | Full Integration Verified? | Implementation Status | Notes & Gaps |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **`wa.reminders`** | Appointment 24h & 2h reminders | Placeholder | No | No | No | **NOT STARTED** | Displays `<FeaturePlaceholder id="wa.reminders" />` |
| **`wa.recalls`** | Periodic dental recall automation | Placeholder | No | No | No | **NOT STARTED** | Needs background cron worker (BullMQ/Redis) |
| **`wa.invoices`** | Instant PDF receipt via WhatsApp | Placeholder | No | No | No | **NOT STARTED** | Requires Meta Cloud API / BSP credentials |
| **`wa.campaigns`** | Promotional & festive broadcasts | Placeholder | No | No | No | **NOT STARTED** | Needs template pre-approval mechanism |

---

## 10. Website & Patient Portal Integration (Roadmap / Unstarted)

| Module & ID | Sub-feature / Action | UI Exists? | Backend API Exists? | DB Model Exists? | Full Integration Verified? | Implementation Status | Notes & Gaps |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| **`web.booking`** | Public patient online booking | Placeholder | No | No | No | **NOT STARTED** | Displays `<FeaturePlaceholder id="web.booking" />` |
| **`web.portal`** | Patient record & Rx self-service | Placeholder | No | No | No | **NOT STARTED** | Planned for Stage 4 |
| **`web.settings`** | Clinic landing page CMS & SEO | Placeholder | No | No | No | **NOT STARTED** | Planned for Stage 4 |

