# DocMatrix — Treatment Plans Module: Recommended Architecture & Implementation Plan

**Date:** November 9, 2026  
**Document:** Technical Architecture & Phased Implementation Roadmap  
**Goal:** Deliver a seamless, end-to-end dental clinical workflow without rebuilding existing working functionality.

---

## 1. Target Clinical Workflow Architecture

The target architecture must unify the dental care lifecycle into a cohesive pipeline:

```
[Patient Profile]
       │
       ▼
[Treatment Plan] ──(Multi-Stage)──► [Treatment Stages] ──(FDI Teeth/Surfaces)──► [Procedures / Items]
       │                                                                                   │
       ├─────────────────────────────────┬─────────────────────────────────────────────────┤
       ▼                                 ▼                                                 ▼
[Clinical Notes]               [Billing & Invoicing]                            [Inventory Deductions]
(Consultation linked           (Billed by stage or items;                       (Adaptive consumption;
 to plan/stage)                 duplicate billing prevented)                     FEFO batch deductions)
```

### Architectural Principles:
1. **Preserve Database Structure:** The existing Prisma schema (`TreatmentPlan`, `TreatmentPlanStage`, `TreatmentPlanItem`, `TreatmentEstimateRevision`, `TreatmentPlanHistory`, `InvoiceLineItem.treatmentPlanItemId`) is already production-ready. **No structural database overhaul is required.**
2. **Reuse Existing Backend APIs:** NestJS endpoints for creating, updating, status changes, acceptance, rejection, and invoice generation from plans already exist and function with tenant guards.
3. **Focus on Frontend Bridge Wiring:** The primary work is creating intuitive user-facing controls to trigger and manage these backend endpoints.

---

## 2. Evaluation of Database Schema

| Model | Current Schema State | Required Action |
| :--- | :--- | :--- |
| `TreatmentPlan` | Comprehensive: has `clinicId`, `planNumber`, `patientId`, `doctorId`, `doctorName`, `subtotal`, `discount`, `tax`, `totalEstimatedCost`, `currentVersion`, `acceptedVersion`, acceptance audit fields. | **Keep as-is.** Zero modifications required. |
| `TreatmentPlanStage` | Has `treatmentPlanId`, `stageNumber`, `name`, `status`, `targetDate`, `estimatedCost`. | **Keep as-is.** Full multi-stage support exists. |
| `TreatmentPlanItem` | Has `stageId`, `procedureCode`, `procedureName`, `category`, `toothNumber`, `surface`, `quantity`, `unitFee`, `discount`, `netFee`, `status`. | **Keep as-is.** |
| `TreatmentEstimateRevision` | Immutable versioned snapshots (`versionNumber`, `subtotal`, `discount`, `tax`, `totalEstimatedCost`, `itemsSnapshot`, `status`). | **Keep as-is.** |
| `TreatmentPlanHistory` | Full audit trail (`action`, `details`, `userId`, `userName`, `userRole`). | **Keep as-is.** |
| `InvoiceLineItem` | Already includes `treatmentPlanItemId` linking directly to procedures. | **Keep as-is.** |
| `ClinicalNote` | Has `chiefComplaint`, `diagnosis`, `treatmentPerformed`. Loose string `clinicalNoteId` on `TreatmentPlan`. | *Optional Future:* Add `treatmentPlanId String?` foreign key. Not blocking. |
| `Prescription` | Standard digital prescription model. | *Optional Future:* Add `treatmentPlanId String?`. Not blocking. |

**Conclusion:** The database schema is **100% adequate** for multi-stage treatment tracking, estimates, acceptance auditing, and invoice generation.

---

## 3. Step-by-Step Phased Implementation Plan

### Phase 1 — Critical Fixes (Core Bridges & Data Safety)
*Target: Complete the missing operational connections that prevent end-to-end usage.*

1. **Task 1.1: Add "Generate Invoice" Action in Plan Details Modal**
   - In `TreatmentPlanDetailsModal.tsx`, add a primary action: **"Bill Procedures / Generate Invoice"**.
   - Create a sub-dialog allowing the dentist/staff to select:
     - Bill entire treatment plan.
     - Bill a specific stage (e.g. Stage 1).
     - Bill only completed procedures.
   - Wire dialog to call `billingApi.createInvoiceFromTreatmentPlan()`.
   - On response, show confirmation badge with direct link to view the new invoice in `/billing`.

2. **Task 1.2: Add Treating Dentist Selector in Plan Creation Modal**
   - In `TreatmentPlanModal.tsx`, fetch active doctors from `useClinicStaffStore()`.
   - Add a "Treating Dentist" `<select>` input pre-selected to `currentUser.id`.
   - Pass `doctorId` in `CreateTreatmentPlanDto`.

3. **Task 1.3: Enforce Duplicate Inventory Deduction Guard**
   - In `backend/src/inventory/inventory.service.ts` (`confirmDeduction`), query `this.prisma.inventoryAudit.findFirst({ where: { clinicId, treatmentId: dto.treatmentId } })`.
   - If an audit record already exists for that `treatmentId`, reject with `ConflictException` to prevent duplicate stock subtractions.

---

### Phase 2 — Plan Lifecycle & Editing (Stages & Procedures)
*Target: Allow clinicians to adjust plans as treatment progresses.*

1. **Task 2.1: Frontend "Edit Treatment Plan" Modal**
   - In `TreatmentPlanDetailsModal.tsx`, add an **"Edit Plan"** button (for plans not in `COMPLETED` or `CANCELLED` status).
   - Re-open `TreatmentPlanModal` in edit mode populated with existing stages, items, fees, and notes.
   - Collect a required `revisionReason` (e.g. "Patient opted for composite over amalgam").
   - Call `PATCH /treatment-plans/:id`, which automatically creates Revision v2/v3 and resets status to `PROPOSED` for renewed acceptance.

2. **Task 2.2: Add "Cancelled" Status in UI**
   - In `TreatmentPlansPage.tsx`, add `<option value="Cancelled">Cancelled</option>` to the status dropdown.
   - Add grey/muted styling for cancelled status pills.

3. **Task 2.3: Dynamic Procedure Catalogue & Tariff Fees**
   - In `TreatmentPlanModal.tsx`, dynamically load procedures from `/clinics/my-clinic/clinical-config` and active tariffs from `billingStore`.
   - Fall back to standard CDT procedures if custom procedures are unconfigured.

---

### Phase 3 — Clinical Odontogram & Consultation Notes
*Target: Seamless chairside user experience.*

1. **Task 3.1: Interactive Odontogram Picker in Plan Modal**
   - Embed a compact version of `ToothChart.tsx` inside `TreatmentPlanModal.tsx`.
   - Clicking a tooth visually highlights it and automatically populates the `toothNumber` field of the selected procedure item.

2. **Task 3.2: Associate Clinical Notes with Treatment Plans**
   - In `ClinicalNoteModal.tsx`, add an optional dropdown: "Link to Active Treatment Plan".
   - When selected, associate the consultation record with the treatment plan.

---

### Phase 4 — Billing & Inventory Streamlining
*Target: High-efficiency chairside operations.*

1. **Task 4.1: Multi-Stage Invoice Ledger in Billing Workspace**
   - In `/billing`, display a badge on invoices generated from a treatment plan (`Plan #TP-1001 • Stage 1`).
   - In patient billing tab, show a breakdown of Total Estimated Treatment Cost vs Billed Amount vs Paid Amount vs Pending Unbilled Treatment Value.

2. **Task 4.2: Auto-Prompt Inventory on Procedure Completion**
   - When an individual item is marked `COMPLETED` in `TreatmentPlanDetailsModal.tsx`, trigger a subtle prompt: *"Record material consumption for this procedure? [Open Materials]"*.

---

### Phase 5 — UI Polish, Audit Visualization & E2E Testing
*Target: Enterprise quality and regression defense.*

1. **Task 5.1: Structured Audit History Tab in Details Modal**
   - In `TreatmentPlanDetailsModal.tsx` ("History" tab), render chronological cards for every `TreatmentPlanHistory` entry (`CREATED`, `ACCEPTED`, `REJECTED`, `ESTIMATE_REVISED`, `STATUS_CHANGED`).
   - Display who performed the action, timestamp, and disclaimers (e.g., "Staff-recorded verbal consent").

2. **Task 5.2: Complete Lifecycle E2E Test Suite**
   - Add automated test verifying the complete chain:
     *Create Plan → Add 2 Stages → Record Acceptance → Complete Stage 1 Item → Generate Invoice for Stage 1 → Deduct Materials → Verify Patient Ledger & Dues.*

---

## 4. Single Most Important Next Development Task

### **Task 1.1: Connect Billing Invoice Generation in `TreatmentPlanDetailsModal.tsx`**

**Why this is #1:**
- The backend API (`POST /billing/invoices/from-treatment-plan`) is already completely implemented, validated, and guarded against duplicate billing.
- The frontend client (`billingApi.createInvoiceFromTreatmentPlan`) is already written.
- The database models and foreign keys (`InvoiceLineItem.treatmentPlanItemId`) already exist.
- **Connecting this button closes the single largest clinical gap in DocMatrix**, instantly allowing doctors to transition from treatment delivery to financial invoicing in a single click.
