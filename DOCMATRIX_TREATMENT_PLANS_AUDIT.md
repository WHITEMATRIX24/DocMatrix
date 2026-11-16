# DocMatrix — Treatment Plans Module: Complete Functional & Integration Audit Report

**Date:** November 9, 2026  
**Audit Type:** Codebase Inspection, Relational Database Audit & Test Verification  
**Branch:** `test/merge-master-with-billing` (read-only audit, zero mutations executed)  
**Database Status:** Neon PostgreSQL verified (Prisma schema models intact, shared `neondb` untouched)

---

## Executive Summary

A comprehensive, evidence-based functional audit of the **Treatment Plans & Integrated Cost Estimates module** was conducted across the frontend React application, NestJS backend API, Prisma ORM schema, and PostgreSQL database.

The module possesses an **exceptionally mature architectural foundation**:
- Dedicated Prisma models for multi-stage plans (`TreatmentPlan`, `TreatmentPlanStage`, `TreatmentPlanItem`, `TreatmentEstimateRevision`, `TreatmentPlanHistory`).
- Strict tenant isolation enforced at controller and database query levels.
- Full transactional integrity with exact decimal financial calculations (`subtotal`, `discount`, `tax`, `totalEstimatedCost`).
- Active integration with the Patient Profile (`/patients/:id/plans`).
- Backend-ready billing bridge with duplicate invoicing guards (`POST /billing/invoices/from-treatment-plan`).

However, several **critical user-facing integration gaps** were identified:
1. The frontend lacks a UI trigger ("Bill Plan" / "Generate Invoice") to invoke the existing backend billing endpoint.
2. The plan creation modal lacks a treating dentist selector dropdown.
3. Editing an existing plan's stages/procedures is supported in the backend (`PATCH /treatment-plans/:id`) but lacks a frontend Edit Modal.
4. The visual SVG Odontogram is available in patient tooth charting, but only a text input is present in the plan creation modal.

---

## 1. Inventory of Relevant Files & Responsibilities

### Frontend Components & Pages
| File Path | Role & Responsibilities |
| :--- | :--- |
| `src/pages/clinical/TreatmentPlansPage.tsx` | Main clinic-wide treatment plans workspace. Provides status filtering (`All`, `Proposed`, `Accepted`, `In Progress`, `Pending`, `Completed`, `Rejected`), search, tabular list, status changes, and triggers for Modals (Materials, Stages, Print, New Plan). |
| `src/pages/clinical/TreatmentEstimatesPage.tsx` | Chairside financial estimates dashboard. Aggregates pipeline metrics (Proposed Pipeline, Accepted Value, Completed Value, Avg Plan) and provides estimate breakdowns. |
| `src/components/clinical/TreatmentPlanModal.tsx` | Plan creation modal. Manages patient selection, plan title, stages, procedures, tooth numbers, surface pills (M/O/D/B/L/I), fees, discounts, tax rates, and live estimate calculations. |
| `src/components/clinical/TreatmentPlanDetailsModal.tsx` | Plan inspection and execution modal. Displays stage progress, item-level statuses (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `DEFERRED`, `CANCELLED`), patient acceptance dialog, rejection dialog, and print trigger. |
| `src/components/clinical/TreatmentPlanPrintModal.tsx` | Printable clinical estimate on clinic letterhead with patient info, multi-stage table, totals, informed consent declaration, and signature lines. |
| `src/pages/patients/PatientProfilePage.tsx` | Patient Profile integration. Houses Tab 9 (`plans`), Overview card, header quick action with locked `patientId`, and timeline feed integration. |
| `src/pages/patients/ToothChartPage.tsx` & `ToothChart.tsx` | Interactive anatomical SVG odontogram displaying FDI permanent (11–48) and primary (51–85) teeth with condition styling. |
| `src/components/inventory/TreatmentMaterialUsageModal.tsx` | Material consumption modal for completed procedures, integrating with `adaptiveInventoryStore.ts` and `/inventory/deduct`. |
| `src/services/clinicStore.ts` | Frontend data store managing treatment plans state, backend synchronization, and optimistic UI updates. |
| `src/services/billingApi.ts` | Billing API client containing `createInvoiceFromTreatmentPlan()`. |
| `src/services/adaptiveInventoryStore.ts` | Material deduction engine with doctor learning model, FEFO batch deductions, and backend sync. |

### Backend NestJS & Prisma
| File Path | Role & Responsibilities |
| :--- | :--- |
| `backend/src/treatment-plans/treatment-plans.controller.ts` | Protected REST controller (`JwtAuthGuard`, `TenantGuard`) providing CRUD, status updates, acceptance, rejection, and legacy import endpoints. |
| `backend/src/treatment-plans/treatment-plans.service.ts` | Core domain service managing consecutive plan numbers (`TP-1001`), atomic `$transaction`, decimal calculations, estimate revision snapshots, and audit logging. |
| `backend/src/treatment-plans/dto/*` | DTOs with validation rules for plan creation, updates, status changes, and acceptance recording. |
| `backend/src/billing/billing.service.ts` & `billing.controller.ts` | Implements `POST /billing/invoices/from-treatment-plan`, links line items to `treatmentPlanItemId`, and enforces duplicate billing guards. |
| `backend/src/inventory/inventory.service.ts` | Implements `POST /inventory/deduct`, deducting stock from PostgreSQL inventory items and batches with audit logging. |
| `backend/prisma/schema.prisma` | Defines models: `TreatmentPlan`, `TreatmentPlanStage`, `TreatmentPlanItem`, `TreatmentEstimateRevision`, `TreatmentPlanHistory`, and billing relations. |

---

## 2. Feature-by-Feature Functional Classification

| Functionality | Classification | Supporting Evidence |
| :--- | :---: | :--- |
| **Creating a treatment plan** | **`WORKING`** | `TreatmentPlanModal.tsx` collects payload and invokes `createStructuredTreatmentPlan()`. Backend `createTreatmentPlan()` validates clinic, assigns `TP-1001` sequence, creates stages, items, revision snapshot v1, and audit log. Verified in E2E GUI test and backend spec. |
| **Adding multiple procedures** | **`WORKING`** | Supported in both modal UI and backend DTO. Items can be added arbitrarily to any stage. |
| **Multi-stage organization** | **`WORKING`** | Dedicated Prisma model `TreatmentPlanStage` with 1-to-many relation to `TreatmentPlanItem`. Stages have independent names, target dates, and costs. |
| **Odontogram tooth selection** | **`PARTIAL`** | Tooth numbers are entered as text inputs with backend FDI validation. Surface pills (M, O, D, B, L, I) exist. However, the visual SVG odontogram is not embedded in the creation modal. |
| **Assigning a dentist** | **`PARTIAL`** | Backend supports `dto.doctorId` and validates clinic users. However, `TreatmentPlanModal.tsx` lacks a doctor select dropdown, defaulting to the current user. |
| **Setting procedure costs** | **`WORKING`** | Selecting standard CDT procedures auto-populates fees; unit fees are fully editable. |
| **Total estimate calculations** | **`WORKING`** | Live calculations compute subtotal, discounts, GST (0/5/12/18%), and net total. Backend mirrors this using `Prisma.Decimal` to prevent rounding discrepancies. |
| **Applying discounts** | **`WORKING`** | Item-level discount inputs subtract from gross fee and display in the estimate breakdown. |
| **Tracking treatment statuses** | **`WORKING`** | Supported at plan level (`Proposed`, `Accepted`, `In Progress`, `Pending`, `Completed`, `Rejected`) and item level (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `DEFERRED`, `CANCELLED`). |
| **Editing an existing plan** | **`PARTIAL`** | Backend `PATCH /treatment-plans/:id` is fully implemented (bumps version to v2, creates revision, preserves history). However, the frontend has no "Edit Plan" modal or UI button. |
| **Deleting or cancelling a plan**| **`PARTIAL`** | Deletion is **`MISSING`** (by design for audit compliance). Cancellation is supported in backend enum (`CANCELLED`), but the frontend status dropdown omits "Cancelled". |
| **Recording completed procedures**| **`WORKING`** | In `TreatmentPlanDetailsModal.tsx`, item status can be changed to `COMPLETED`, calling `PATCH /treatment-plans/:id/items/:itemId`. |
| **Tracking treatment progress** | **`WORKING`** | `TreatmentPlanDetailsModal.tsx` dynamically calculates `(completedItems / totalItems) * 100` and displays a progress bar. |
| **Viewing treatment history** | **`PARTIAL`** | Backend creates detailed `TreatmentPlanHistory` audit records. Frontend details modal has a history tab but renders a basic revision list rather than full audit events. |
| **Printing/exporting plan** | **`WORKING`** | `TreatmentPlanPrintModal.tsx` generates letterhead-ready estimates with informed consent lines and triggers `window.print()`. |

---

## 3. Database & Backend Audit Findings

1. **Persistence Engine:** Stored primarily in Neon PostgreSQL via Prisma (`TreatmentPlan`, `TreatmentPlanStage`, `TreatmentPlanItem`, etc.). Frontend `clinicStore.ts` synchronizes on load and optimistic updates.
2. **Multiple Procedures Support:** Fully supported via `TreatmentPlanStage -> TreatmentPlanItem[]`.
3. **Dedicated Stage Models:** Dedicated model `TreatmentPlanStage` with fields `stageNumber`, `name`, `status`, `targetDate`, `estimatedCost`.
4. **Individual Procedure Statuses:** Supported via enum `TreatmentPlanItemStatus` (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `DEFERRED`, `CANCELLED`).
5. **Relational Associations:** Foreign keys `clinicId` (to `Clinic`) and composite `[patientId, clinicId]` (to `Patient`) enforce referential integrity.
6. **Financial Persistence:** Stored as exact `Decimal(10, 2)` across plan, stage, and item records.
7. **Connected Endpoints:** Create, list, details, status update, acceptance, rejection, and item status endpoints are wired. Full plan stage editing and billing creation endpoints exist in backend but lack frontend UI triggers.
8. **CRUD Status:** Create (Complete), Read (Complete), Update (Partial), Delete (Omitted by design).
9. **Multi-Clinic Isolation:** Enforced via `TenantGuard`, `where: { clinicId }` in queries, and compound uniqueness `@@unique([clinicId, planNumber])`.
10. **Multi-Stage Workflow Suitability:** The schema is fully capable of supporting multi-stage treatments without modifications.

---

## 4. Cross-Module Integration Audit

### A. Patient Profile Integration (`WORKING`)
- **Tab 9 (`plans`)**: Renders full table of plans associated with the active patient.
- **Header Action**: "New Treatment Plan" opens modal with `lockedPatientId={patient.id}`.
- **Overview Card**: Highlights pending treatments and total estimated fees.
- **Activity Timeline**: Treatment plan proposals and completions are surfaced chronologically.

### B. Clinical Notes Integration (`MISSING`)
- `TreatmentPlan` has a loose string `clinicalNoteId String?`, but no foreign key relation.
- `ClinicalNote` has no reference to `TreatmentPlan`.
- `ClinicalNoteModal.tsx` cannot link a clinical consultation note to a treatment plan stage or procedure.

### C. Digital Prescriptions Integration (`MISSING`)
- `Prescription` and `PrescriptionItem` have no relation or reference to `TreatmentPlan`.
- Doctors cannot tag a prescription to a treatment plan phase.

### D. Billing Integration (`PARTIAL` — Backend Ready / Frontend UI Missing)
- **Backend Bridge:** `POST /billing/invoices/from-treatment-plan` is fully implemented.
- **Duplicate Protection:** Verified. Checks `InvoiceLineItem` where `treatmentPlanItemId` is present on non-void invoices and throws `ConflictException` if already billed.
- **Line Item Mapping:** Sets `invoice.treatmentPlanId` and `invoiceLineItem.treatmentPlanItemId`.
- **Missing Link:** No button exists in `TreatmentPlanDetailsModal.tsx` or `TreatmentPlansPage.tsx` to call this endpoint.

### E. Inventory Integration (`PARTIAL`)
- **Consumption Modal:** `TreatmentMaterialUsageModal.tsx` opens upon clicking "Materials" or when marking a plan completed.
- **Stock Deduction:** Invokes `confirmConsumptionAndDeductStock()`, deducting stock in memory and calling `POST /inventory/deduct`.
- **Duplicate Prevention:** **Missing** on backend. If the modal is confirmed multiple times, duplicate stock deductions occur.

---

## 5. Automated Test Coverage

| Test Suite | Files | Tests Passed | Status |
| :--- | :--- | :---: | :---: |
| **Frontend Component & UI Tests** | `tests/treatmentPlansModule.test.jsx` | 6 / 6 | **PASSED** |
| **Frontend E2E Workflow Tests** | `tests/treatmentPlansE2EWorkflow.test.jsx` | 7 / 7 | **PASSED** |
| **Backend Service Unit Tests** | `backend/src/treatment-plans/treatment-plans.service.spec.ts` | 10 / 10 | **PASSED** |
| **Total Verified Tests** | **3 Test Suites** | **23 / 23** | **100% PASS** |

### Untested Workflows in Automated Suites:
- Cross-module end-to-end invoice creation from treatment plan via UI (no UI trigger exists).
- Inventory duplicate deduction prevention.
- Visual SVG odontogram tooth selection during plan creation.
