# DOCMATRIX MODULE STATUS REPORT

**Date:** November 10, 2026  
**Auditor:** Full-Stack Technical Auditor & Senior Architect  
**Scope:** Exhaustive component-by-component status report for every application module in DocMatrix.

---

## 1. Dashboard Module (`/dashboard`)

- **Frontend File:** `src/pages/dashboard/Dashboard.tsx`
- **State Source:** Dynamic compute over `clinicStore.getSnapshot()` (Appointments, Patients, Invoices, Dues)
- **Backend Endpoints:** Aggregated from individual domain controllers (`/appointments`, `/patients`, `/billing/invoices`)
- **Database Models:** Reads from `Appointment`, `Patient`, `Invoice`
- **Fully Working:**
  - KPI cards: Today's Appointments, In-Chair Patients, Pending Invoices, Low Stock Alerts.
  - Quick action buttons (Book Appointment, New Patient, Generate Invoice).
  - Daily appointment queue preview and status filtering.
- **Partially Implemented:**
  - Revenue chart relies on client-side slicing of recent invoices rather than an optimized backend timeseries query.
- **Missing:**
  - Real-time WebSocket updates (currently updates on page focus or manual route transitions).
- **Quality Rating:** **B+** (Reliable and responsive, but needs server-side aggregation for high-volume data).

---

## 2. Patients Module (`/patients/*`)

- **Frontend Files:**
  - `src/pages/patients/Patients.tsx` (Directory & search)
  - `src/pages/patients/PatientProfile.tsx` (360-degree patient dossier)
  - `src/components/patients/PatientRegistrationModal.tsx` & `src/pages/patients/PatientNew.tsx`
  - `src/pages/patients/PatientConsents.tsx`, `PatientDocuments.tsx`, `PatientTimeline.tsx`
- **Backend Files:**
  - Controller: `backend/src/patients/patients.controller.ts`
  - Service: `backend/src/patients/patients.service.ts`
  - DTOs: `backend/src/patients/dto/create-patient.dto.ts`, `update-patient.dto.ts`
- **Database Models:**
  - `Patient`, `ToothCondition`, `PatientDocument`, `PatientConsent`
- **Fully Working:**
  - Full CRUD operations with tenant scoping (`clinicId`).
  - Search by name, phone, UHID/registration number with debounce.
  - Comprehensive clinical tabs: Medical Alerts, Allergies, Treatment Plans, Notes, Invoices, Timeline.
  - Interactive FDI Tooth Chart (`ToothCondition` model) mapping 5 surfaces (Mesial, Distal, Occlusal, Buccal, Lingual) and pediatric/adult views.
  - Consent form signing with canvas capture and timestamp.
  - Emergency contact person section (dark and light mode verified).
- **Partially Implemented:**
  - Documents upload stores metadata in `PatientDocument` with base64/local disk payload; cloud S3 pre-signed URL workflow is not yet wired.
- **Quality Rating:** **A** (High maturity, fully integrated with all clinical subsystems).

---

## 3. Appointments & Queue Management (`/appointments/*`)

- **Frontend Files:**
  - `src/pages/appointments/AppointmentNew.tsx`
  - `src/pages/appointments/AppointmentCalendar.tsx`
  - `src/pages/appointments/AppointmentDetail.tsx`
  - `src/pages/appointments/AppointmentsQueue.tsx`
  - `src/pages/appointments/AppointmentsEnquiries.tsx`
- **Backend Files:**
  - Controllers: `backend/src/appointments/appointments.controller.ts`, `backend/src/enquiries/enquiries.controller.ts`
  - Services: `backend/src/appointments/appointments.service.ts`, `backend/src/enquiries/enquiries.service.ts`
- **Database Models:** `Appointment`, `Enquiry`
- **Fully Working:**
  - Booking wizard with doctor schedule validation and operational clinic hour enforcement.
  - Multi-view visual calendar (Day, Week, Month, Doctor columns).
  - Live waiting room queue with instant status updates (`SCHEDULED` -> `WAITING` -> `IN_CHAIR` -> `COMPLETED`).
  - Reschedule and cancel flows requiring mandatory reason capture.
  - Missed enquiry tracking with one-click conversion to patient and scheduled appointment.
- **Partially Implemented:**
  - Automatic SMS/WhatsApp reminder triggering upon booking (waiting for WhatsApp module Stage 2).
- **Quality Rating:** **A** (Solid, production-tested scheduling engine).

---

## 4. Clinical Management (`/clinical/*`)

### 4.1 Treatment Plans & Cost Estimates (`/clinical/treatment-plans`, `/clinical/estimates`)
- **Frontend Files:**
  - `src/pages/clinical/TreatmentPlans.tsx`
  - `src/pages/clinical/TreatmentPlanDetailsModal.tsx`
  - `src/components/clinical/TreatmentPlanFormModal.tsx`
  - `src/pages/clinical/TreatmentEstimates.tsx`
- **Backend Files:**
  - Controller: `backend/src/treatment-plans/treatment-plans.controller.ts`
  - Service: `backend/src/treatment-plans/treatment-plans.service.ts`
  - DTOs: `create-treatment-plan.dto.ts`, `update-treatment-plan.dto.ts`, `create-estimate-revision.dto.ts`
- **Database Models:**
  - `TreatmentPlan`, `TreatmentPlanStage`, `TreatmentPlanItem`, `TreatmentEstimateRevision`, `TreatmentPlanHistory`
- **Fully Working (Phases 1 & 2 Complete):**
  - Multi-stage plan creation (Stage name, planned date, assigned practitioner).
  - FDI tooth number selector and procedure linking with standard clinic tariff lookup.
  - Full editing lifecycle: Edit Plan modal allows modifying stages, items, fees, discounts, and dentists.
  - Plan-level and item-level status tracking (`PROPOSED`, `ACCEPTED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`).
  - Estimate versioning: Revisions (v1, v2) with patient acceptance capture (Verbal chairside vs Signed written).
  - Cancellation with mandatory reason logging in `TreatmentPlanHistory`.
  - Direct invoice generation: Select unbilled procedures -> calls `POST /billing/invoices/from-treatment-plan` -> marks items as `BILLED`.
  - Automated material deduction prompt upon procedure completion.
- **Quality Rating:** **A+** (Exemplary architectural implementation; passes 27 frontend tests and backend suites).

### 4.2 Structured Clinical Notes (`/clinical/notes`)
- **Frontend File:** `src/pages/clinical/ClinicalNotes.tsx`
- **Backend File:** `backend/src/clinical/clinical.controller.ts` / `clinical.service.ts`
- **Database Models:** `ClinicalNote`, `ClinicalNoteAddendum`
- **Fully Working:**
  - SOAP format (Subjective, Objective, Assessment, Plan).
  - Chief complaint tagging, clinical findings, procedure records.
  - Immutability safeguard: Completed notes cannot be edited; only signed Addenda can be appended.
- **Quality Rating:** **A** (Clinically sound and legally compliant).

### 4.3 Digital Prescriptions (`/clinical/prescriptions`)
- **Frontend File:** `src/pages/clinical/Prescriptions.tsx`
- **Backend File:** `backend/src/clinical/clinical.controller.ts`
- **Database Models:** `Prescription`, `PrescriptionItem`
- **Fully Working:**
  - Formulary search, frequency, timing (Before/After food), duration, and refill count.
  - Doctor electronic signature and clinic letterhead formatting.
  - Clean printable prescription PDF preview.
- **Quality Rating:** **A**

---

## 5. Billing & Financial Operations (`/billing/*`)

- **Frontend Files:**
  - `src/pages/billing/BillingInvoices.tsx`
  - `src/pages/billing/BillingNewInvoice.tsx`
  - `src/pages/billing/BillingInvoiceDetail.tsx`
  - `src/pages/billing/BillingDues.tsx`
  - `src/pages/billing/BillingTariffs.tsx`
  - `src/pages/billing/BillingExpenses.tsx`
- **Backend Files:**
  - Controller: `backend/src/billing/billing.controller.ts`
  - Service: `backend/src/billing/billing.service.ts`
  - DTOs: `create-invoice.dto.ts`, `record-payment.dto.ts`, `create-tariff.dto.ts`
- **Database Models:** `Invoice`, `InvoiceLineItem`, `InvoicePayment`, `ServiceTariff`, `Expense`
- **Fully Working:**
  - GST / Tax calculation per line item and global invoice discount.
  - Split payments: Cash, Card, UPI, Bank Transfer with individual transaction references.
  - Outstanding dues tracking with patient balance reconciliation.
  - Direct invoice generation from Treatment Plans.
  - Clinic expense recording with categorization.
  - Printable tax invoice and 80mm thermal receipt formats.
- **Partially Implemented:**
  - Refund handling: While payments can be recorded, explicit credit notes and partial refunds require manual adjustments.
- **Quality Rating:** **A**

---

## 6. Inventory & Supply Chain (`/inventory/*`)

- **Frontend Files:**
  - `src/pages/inventory/InventoryItems.tsx`
  - `src/pages/inventory/InventoryStock.tsx`
  - `src/pages/inventory/InventoryMovements.tsx`
- **Backend Files:**
  - Controller: `backend/src/inventory/inventory.controller.ts`
  - Service: `backend/src/inventory/inventory.service.ts`
- **Database Models:** `InventoryItem`, `InventoryBatch`, `InventoryAudit`
- **Fully Working:**
  - Item catalog with SKU, brand, minimum threshold, and unit specifications.
  - Batch tracking with expiry dates and current stock quantity.
  - Movement ledger (Stock-in, adjustments, disposals) with mandatory reason.
  - Idempotent procedure material consumption: uses unique `operationId` (`tp-item-<id>-<batchId>`) preventing double-counting if clicked repeatedly.
  - Low-stock visual alerts and dashboard notifications.
- **Missing:**
  - Purchase Order (PO) workflow with vendor invoicing (planned for Stage 3/5).
- **Quality Rating:** **A-**

---

## 7. Reports & Analytics (`/reports/*`)

- **Frontend Files:**
  - `src/pages/reports/ReportsRevenue.tsx`
  - `src/pages/reports/ReportsDoctor.tsx`
  - `src/pages/reports/ReportsTreatments.tsx`
  - `src/pages/reports/ReportsFollowup.tsx`
- **Calculation Engine:** `src/pages/reports/reportMetrics.ts`
- **Database Models:** Indirectly reads store state from `Invoice`, `Appointment`, `TreatmentPlan`
- **Fully Working:**
  - Dynamic KPI filtering by custom date ranges, doctor, and procedure category.
  - Visual charts: Revenue collection curve, top performing procedures, recall list.
  - CSV export of displayed report tables.
- **Defects & Architectural Gaps:**
  - Compute is executed client-side in the browser from `clinicStore` snapshot rather than using server-side SQL aggregation queries. Large clinics with years of data will suffer performance degradation.
- **Quality Rating:** **B-** (Works well for small/medium clinics, needs backend aggregation for enterprise scale).

---

## 8. Settings & Administration (`/settings/*`)

- **Frontend Files:**
  - `src/pages/settings/SettingsProfile.tsx` (Clinic details, timings, logo)
  - `src/pages/settings/SettingsStaff.tsx` (Staff directory, RBAC, invite)
  - `src/pages/settings/SettingsClinical.tsx` (Formulary, procedure catalog, tariffs)
  - `src/pages/settings/SettingsSecurity.tsx` (Password, session timeout)
  - `src/pages/settings/SettingsPrivacy.tsx` (Data retention, export controls)
  - `src/pages/settings/SettingsDataExchange.tsx` (CSV import/export)
  - `src/pages/settings/SettingsActivity.tsx` (Audit log trail)
  - `src/pages/settings/SettingsSubscription.tsx` (Plan, billing cycle, seat limits)
- **Backend Files:**
  - Controllers: `backend/src/settings/settings.controller.ts`, `backend/src/users/users.controller.ts`, `backend/src/activity-log/activity-log.controller.ts`
  - Database Models: `ClinicSettings`, `User`, `Role`, `ActivityLog`, `Tenant`
- **Fully Working:**
  - All 8 settings pages verified end-to-end.
  - Full dual-theme dark/light mode compatibility restored.
  - Primary clinic owner deletion protection enforced.
  - Staff RBAC permissions enforced across both UI navigation and backend guards.
- **Quality Rating:** **A**

---

## 9. Placeholder & Roadmap Modules

### 9.1 Accounts & Bookkeeping (`/accounts/*`)
- **Status:** **NOT STARTED (0% Backend / UI Shell only)**
- **Routes:** `/accounts/daybook`, `/accounts/ledgers`, `/accounts/pnl`, `/accounts/trial-balance`, `/accounts/tally`
- **Current Behavior:** Renders `<FeaturePlaceholder id="acc.*" />` with an "In Development" badge.
- **Prerequisites for Implementation:** Requires designing a general ledger double-entry schema (Accounts, JournalEntries, LedgerPostings) and Tally XML serializer.

### 9.2 WhatsApp Automation (`/whatsapp/*`)
- **Status:** **NOT STARTED (0% Backend / UI Shell only)**
- **Routes:** `/whatsapp/recalls`, `/whatsapp/automation`, `/whatsapp/logs`
- **Current Behavior:** Renders `<FeaturePlaceholder id="wa.*" />`.
- **Prerequisites for Implementation:** Meta Cloud API or Twilio WhatsApp Business integration, message template management, and BullMQ/Redis worker queue.

### 9.3 Website Integration (`/website/*`)
- **Status:** **NOT STARTED (0% Backend / UI Shell only)**
- **Routes:** `/website/settings`, `/website/pages`, `/website/approvals`
- **Current Behavior:** Renders `<FeaturePlaceholder id="web.*" />`.
- **Prerequisites for Implementation:** Public booking widget embed script and unauthenticated tokenized appointment request API.

