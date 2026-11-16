# DOCMATRIX CROSS-MODULE INTEGRATION AUDIT

**Date of Audit:** November 12, 2026  
**Auditor:** Senior Software Architect, QA Lead & Full-Stack Technical Auditor  
**Scope:** Verification of critical end-to-end data pathways across Patient Management, Appointments, Clinical Operations, Treatment Planning, Billing, Inventory, Document Storage, and Reports.

---

## 1. Summary Scorecard of Key Integration Pathways

```
+----+-------------------------------------------------------------------------+--------------------+-------------------------+
| #  | Cross-Module Workflow                                                   | Integration Status | Verification Evidence   |
+----+-------------------------------------------------------------------------+--------------------+-------------------------+
| 1  | Patient -> Appointment -> Clinical Note -> Plan -> Invoice -> Payment   | FULLY WORKING      | Vitest + API Diagnostic |
| 2  | Treatment Plan -> Procedure Completion -> Inventory Material Deduction  | FULLY WORKING      | Idempotent operationId  |
| 3  | Patient Document Upload -> Cloud Storage Provider -> Patient Vault      | FULLY WORKING      | AWS/Neon S3 + Storage   |
| 4  | Treatment Plan -> Billing Integration (Procedure-Level Invoicing)       | FULLY WORKING      | Phase 1 & 2 Vitest      |
| 5  | Appointment -> Doctor Availability & Schedule Conflict Detection       | PARTIALLY WORKING  | Teammate Module (WIP)   |
| 6  | Settings Changes -> Clinic-Wide Reflection (Tariffs, Staff, Profile)    | FULLY WORKING      | RBAC + Isolation Tests  |
| 7  | Reports & Analytics -> Backend Aggregation (Billing, Appts, Inventory)  | FULLY WORKING      | 0-fallback SQL Queries  |
+----+-------------------------------------------------------------------------+--------------------+-------------------------+
```

---

## 2. In-Depth Workflow Analysis

### Workflow 1: End-to-End Clinical & Financial Journey
**Patient $\to$ Appointment $\to$ Clinical Note $\to$ Treatment Plan $\to$ Invoice $\to$ Payment $\to$ Receipt**

- **Flow Description:**
  1. A patient is registered via `/patients/new` or selected from `/patients/list`.
  2. An appointment is scheduled. When the patient arrives, the status transitions to `CHECKED_IN`.
  3. The attending dentist starts consultation from the appointment, generating a `ClinicalNote` with the `patientId`, `appointmentId`, and attending `doctorId` automatically locked.
  4. The doctor diagnoses findings on the Odontogram (`ToothCondition`), recommending a multi-stage `TreatmentPlan`.
  5. In `TreatmentPlanDetailsModal.tsx`, the user generates an invoice directly for specific planned or completed procedures (`POST /billing/invoices/from-treatment-plan`).
  6. The `Invoice` is created with linked `InvoiceItem` records matching the planned procedure codes, and the procedures are tagged as `BILLED`.
  7. Payment is recorded against the invoice via `POST /billing/invoices/:id/payments` (supporting Cash, Card, UPI, NetBanking).
  8. Printable thermal and standard tax receipts are generated with clinic letterhead details.
- **Data Integrity & Foreign Keys:**
  - `Appointment.patientId` $\to$ `Patient.id`
  - `ClinicalNote.patientId` $\to$ `Patient.id`, `ClinicalNote.appointmentId` $\to$ `Appointment.id`
  - `TreatmentPlan.patientId` $\to$ `Patient.id`
  - `Invoice.treatmentPlanId` $\to$ `TreatmentPlan.id`, `Invoice.patientId` $\to$ `Patient.id`
  - `InvoicePayment.invoiceId` $\to$ `Invoice.id`
- **Verification Evidence:** Passed in `treatmentPlansE2EWorkflow.test.jsx`, `billing.service.spec.ts`, and `patientProfile.test.jsx`.

---

### Workflow 2: Treatment Plan $\to$ Procedure Completion $\to$ Material Consumption
**Procedure Completion $\to$ Treatment Material Usage $\to$ Idempotent Inventory Deduction**

- **Flow Description:**
  1. When a dentist completes a procedure (e.g., Composite Restoration, Root Canal Obturation), the treatment plan procedure status transitions to `COMPLETED`.
  2. The system surfaces the `TreatmentMaterialUsageModal` prompting the clinical assistant to log materials consumed (e.g., Composite syringe, bonding agent, gutta-percha points).
  3. The assistant selects inventory items and batches from the clinic's active stock.
  4. The frontend dispatches `POST /inventory/consume` with an idempotency key (`operationId: "tp-item-<itemId>-batch-<batchId>"`).
  5. The backend validates batch availability, decrements `InventoryBatch.quantity`, records an `InventoryAudit` movement record with reason `TREATMENT_CONSUMPTION`, and returns the updated stock level.
  6. Rapid double-clicks or repeated network attempts are safely ignored with HTTP 200/cached acknowledgement, preventing duplicate stock depletion.
- **Verification Evidence:** Passed in `backend/src/inventory/inventory.service.spec.ts` (idempotent deduction verified) and `tests/treatmentPlansPhase1Features.test.jsx`.

---

### Workflow 3: Patient Document Upload $\to$ Cloud Storage Provider $\to$ Patient Record
**File Upload $\to$ StorageService $\to$ Neon/AWS S3 Object Store $\to$ Database Metadata**

- **Flow Description:**
  1. In the Patient Profile (`/patients/:id`), user navigates to the **X-rays & Documents** tab.
  2. User uploads an intraoral radiograph, OPG scan, PDF lab report, or signed document.
  3. `StorageController` receives the multipart upload and calls `StorageService.uploadFile()`.
  4. If S3 credentials (`AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, etc.) are configured, the byte stream is uploaded to the cloud bucket with SHA-256 checksum verification and a secure random UUID storage key.
  5. If cloud credentials are not supplied, the service safely falls back to local disk storage (`backend/storage/<clinicId>/`).
  6. A `PatientDocument` record is created in the database containing `fileUrl`, `storageKey`, `mimeType`, `sizeBytes`, `category`, and timestamps linked to `patientId` and `clinicId`.
  7. Users can preview, download, or delete documents. Deleting removes both the database record and the underlying storage asset.
- **Verification Evidence:** Passed in `backend/src/storage/storage.service.spec.ts` (13 unit tests) and `tests/patientDocumentsStorage.test.jsx`.

---

### Workflow 4: Treatment Plan $\to$ Direct Billing & Invoicing
**Unbilled Procedures $\to$ Invoice Composer $\to$ Status Synchronization**

- **Flow Description:**
  1. From `TreatmentPlanDetailsModal.tsx`, clicking "Generate Invoice" displays the procedure billing checklist.
  2. Only unbilled procedures can be selected; completed or already-invoiced procedures are disabled to prevent double billing.
  3. The user can review the fee, adjust discounts, and confirm line items.
  4. Frontend calls `billingApi.createInvoiceFromTreatmentPlan()`, dispatching to `POST /billing/invoices/from-treatment-plan`.
  5. The backend verifies all procedures belong to the specified plan and clinic, creates the `Invoice` atomically, and marks the selected procedures in `TreatmentPlan` as `billingStatus: 'BILLED'`.
  6. The generated invoice appears in `/billing/invoices` and on the patient's Billing history tab.
- **Verification Evidence:** Passed in `tests/treatmentPlansPhase1Features.test.jsx` (10 tests) and `tests/treatmentPlansPhase2To6Integration.test.jsx` (12 tests).

---

### Workflow 5: Appointment $\to$ Doctor Availability & Schedule Conflict Detection
**Calendar Scheduling $\to$ Working Hours & Doctor Conflict Verification**

- **Flow Description:**
  1. When booking in `/appointments/new` or the Doctor Calendar (`/appointments/calendar`), user selects doctor, chair, and time slot.
  2. Frontend validates doctor availability client-side against the working hours configured in `clinicStaffStore`.
  3. Backend `AppointmentsService` has conflict detection logic querying overlapping timestamps for the same `doctorId` or `operatoryChair`.
- **Current Integration Status (Teammate WIP):**
  - Frontend scheduling currently persists appointments into `clinicStore.appointmentsState` in local memory/cache.
  - While `AppointmentsService.spec.ts` passes unit tests on the backend, the direct HTTP API handshake between `NewAppointmentPage.tsx` and the NestJS `/appointments` endpoints is currently in transition by the teammate.
- **Action Required:** Teammate must finalize the HTTP payload binding to enable full backend-persisted conflict detection.

---

### Workflow 6: Settings Changes $\to$ Clinic-Wide Operational Reflection
**Clinic Configuration $\to$ Service Tariffs $\to$ Staff Permissions $\to$ Global Consistency**

- **Flow Description:**
  1. An organization admin updates clinic details, letterhead headers, or tax ID in `/settings/clinic`. The changes immediately reflect on printed invoices, clinical notes, and prescription headers.
  2. Adding or updating custom service tariffs in `/settings/clinical-config` updates the procedure pickers in both the Treatment Plan builder and the Invoice composer.
  3. Changing a staff member's role (e.g., from Receptionist to Doctor) in `/settings/staff` updates their JWT role claims on next login, granting access to clinical notes and restricting unauthorized access to revenue reports.
- **Verification Evidence:** Passed in `tests/settingsModule.test.jsx` (9 tests) and `backend/src/clinics/clinics.service.spec.ts` (10 tests).

---

### Workflow 7: Reports & Analytics $\to$ Backend Data Verification
**Reports Workspace $\to$ Authoritative NestJS SQL Queries $\to$ Role Isolation**

- **Flow Description:**
  1. In `/reports/revenue`, `/reports/doctors`, `/reports/treatments`, and `/reports/follow-ups`, reports dispatch queries via `reportsApi.ts` to `ReportsController`.
  2. Queries compute metrics directly from live database tables:
     - Revenue: `SUM(InvoicePayment.amount)` grouped by date, payment mode, and doctor.
     - Doctor Performance: Total patients seen, completed procedures, and gross revenue generated per practitioner.
     - Treatment Breakdown: Volume, completed count, and revenue categorized by dental specialty (Orthodontics, Endodontics, Prosthodontics, Periodontics).
     - Follow-Ups: High-priority recall list of patients with pending treatments and no booked follow-up appointment.
  3. When an authenticated clinic's API call fails, the UI surfaces a clean error state with a retry button (`ReportErrorState`); it never falls back to mock or demo data.
  4. Unauthorized roles attempting to view financial reports receive a 403 Forbidden response.
- **Verification Evidence:** Passed in `tests/reportsReliability.test.jsx` (5 tests), `tests/reportsInsights.test.jsx` (12 tests), and `backend/src/reports/reports.service.spec.ts` (11 tests).

---

## 3. Integration Gaps & Recommended Fixes

1. **Appointments Backend Binding (Priority P0):**  
   Replace `clinicStore` appointment memory mutations with `apiClient.post('/appointments')` and `apiClient.get('/appointments')` once teammate completes calendar changes.
2. **Lab Orders Vendor Master (Priority P2):**  
   Currently, `/clinical/orders` redirects to the patient diagnostic vault. Adding an external dental laboratory tracking module (with vendor master and shade tracking) will streamline prosthesis fabrication.
3. **Double-Entry General Ledger (Priority P2):**  
   Billing is fully operational, but true accounting ledger aggregation (P&L, Trial Balance) requires a double-entry journal service in V2.
