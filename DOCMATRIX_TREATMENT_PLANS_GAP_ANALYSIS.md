# DocMatrix — Treatment Plans Module: Gap Analysis & Prioritization

**Date:** November 9, 2026  
**Document:** Gap Analysis & Issue Matrix  
**Scope:** Clinical Treatment Plans, Chairside Estimates, Odontogram, Billing Bridge, Inventory & Patient Profile

---

## Executive Gap Summary

The core domain logic and database schema for Treatment Plans are structurally mature and well-tested. However, vital cross-module workflows remain incomplete because frontend triggers have not been wired to existing backend endpoints, and specific clinical workflow linkages (Odontogram selection, Treating Dentist assignment, and Billing generation) are absent.

---

## 1. Comprehensive Gap Matrix

| # | Domain / Area | Identified Gap | Severity / Priority | Impact |
| :-: | :--- | :--- | :---: | :--- |
| **G-01** | **Billing Integration** | Missing "Generate Invoice / Bill Treatment Plan" button in `TreatmentPlanDetailsModal.tsx` and `TreatmentPlansPage.tsx`. Backend endpoint `POST /billing/invoices/from-treatment-plan` and `billingApi.ts` client method exist but are never called from UI. | **`CRITICAL`** | Dentists cannot convert completed or accepted treatment plans into billable invoices from the clinical interface. Staff must manually recreate invoices in Billing. |
| **G-02** | **Dentist Assignment** | No treating doctor / dentist select dropdown in `TreatmentPlanModal.tsx`. The modal automatically defaults to the logged-in user or a placeholder name, ignoring clinic staff lists. | **`CRITICAL`** | Receptionists or dentists cannot author a plan on behalf of another specialist in multi-dentist practices. |
| **G-03** | **Inventory Safety** | Missing duplicate deduction guard in `backend/src/inventory/inventory.service.ts` for `/inventory/deduct`. Multiple clicks or confirmations for the same `treatmentId` deduct stock repeatedly. | **`CRITICAL`** | Clinic inventory levels can be artificially depleted due to accidental duplicate confirmations. |
| **G-04** | **Plan Editing (UI)** | Missing "Edit Plan" modal in frontend. While backend has `PATCH /treatment-plans/:id` (handling version bumping to v2, creating `TreatmentEstimateRevision`, preserving history), users cannot edit stages or procedures once created. | **`HIGH`** | If a treatment plan requires changes after patient consultation, doctors must discard it or start a new one instead of revising the existing plan. |
| **G-05** | **Procedure Price Master** | `STANDARD_PROCEDURES` in `TreatmentPlanModal.tsx` is a hardcoded static array rather than querying clinic-configured procedures from `/clinics/my-clinic/clinical-config` or `/billing/tariffs`. | **`HIGH`** | Custom clinic pricing or newly added procedure codes configured in Settings are not available during plan creation. |
| **G-06** | **Cancellation UI** | Status dropdown in `TreatmentPlansPage.tsx` omits "Cancelled" (only lists Proposed, Accepted, In Progress, Pending, Completed, Rejected), even though the backend enum supports `CANCELLED`. | **`HIGH`** | Inability to officially mark abandoned or cancelled care plans from the main table. |
| **G-07** | **Odontogram Integration** | Tooth selection in `TreatmentPlanModal.tsx` is a plain text input. The interactive SVG odontogram present in `ToothChart.tsx` is not embedded or connected to plan authoring. | **`MEDIUM`** | Dentists must manually type FDI tooth codes (e.g., `16`, `24`) rather than visually clicking teeth on a dental chart. |
| **G-08** | **Clinical Notes Bridge** | `ClinicalNoteModal.tsx` lacks a selector to associate a consultation note with an active treatment plan, stage, or procedure. | **`MEDIUM`** | Clinical consultation notes remain siloed from the overarching treatment plan progression. |
| **G-09** | **Audit Log Display** | `TreatmentPlanDetailsModal.tsx` renders a basic revision timeline rather than full structured `TreatmentPlanHistory` audit logs created by the backend. | **`MEDIUM`** | Detailed practitioner audit events (who modified what, timestamps, acceptance disclaimers) are not fully visible to clinic admins. |
| **G-10** | **Prescriptions Bridge** | Digital Prescriptions cannot be linked to a treatment plan or treatment stage. | **`LOW`** | Prescriptions remain standalone patient records without explicit linkage to the dental procedure for which they were issued. |

---

## 2. Priority Breakdown & Technical Action Items

### Tier 1: CRITICAL Priority (Must Fix Immediately)

#### Gap G-01: Connect Billing Bridge in UI
* **Root Cause:** Backend route `POST /billing/invoices/from-treatment-plan` and frontend client `billingApi.createInvoiceFromTreatmentPlan` exist, but no component renders an invoice creation trigger.
* **Action Required:**
  1. In `TreatmentPlanDetailsModal.tsx`, add a prominent **"Bill Procedures / Generate Invoice"** action button.
  2. Provide options to bill either:
     - The entire accepted plan.
     - A specific stage (e.g. "Bill Stage 1").
     - Selected completed items only.
  3. On success, show a confirmation dialog with a direct link to view the generated invoice in `/billing`.

#### Gap G-02: Treating Dentist Selection
* **Root Cause:** `TreatmentPlanModal.tsx` lacks a `<select>` for `doctorId`.
* **Action Required:**
  1. In `TreatmentPlanModal.tsx`, consume `clinicStaff` from `useClinicStaffStore()` or `useClinicData()`.
  2. Filter staff by role (`DENTIST`, `ADMIN`).
  3. Add a "Treating Dentist" dropdown with default selection set to `currentUser.id`.
  4. Pass `doctorId` in `CreateTreatmentPlanDto`.

#### Gap G-03: Inventory Duplicate Deduction Prevention
* **Root Cause:** `inventory.service.ts` updates `totalStock` and inserts into `InventoryAudit` without verifying if `treatmentId` was already deducted.
* **Action Required:**
  1. In `backend/src/inventory/inventory.service.ts`, before executing stock reductions, check if an `InventoryAudit` already exists for `treatmentId` and `clinicId`.
  2. If already deducted, throw a `ConflictException` ("Materials for this treatment have already been deducted").

---

### Tier 2: HIGH Priority (Essential for Clinical Workflow)

#### Gap G-04: Frontend "Edit Treatment Plan" Capability
* **Root Cause:** Backend `PATCH /treatment-plans/:id` supports revising stages, creating estimate revision snapshots (v2), and updating totals, but frontend has no edit trigger.
* **Action Required:**
  1. Add an "Edit Plan" button in `TreatmentPlanDetailsModal.tsx`.
  2. Re-open `TreatmentPlanModal` in edit mode pre-populated with existing stages and items.
  3. Include a "Revision Reason" text field.
  4. Call `apiClient.patch('/treatment-plans/:id', updateDto)`.

#### Gap G-05: Dynamic Procedure & Fee List
* **Root Cause:** `STANDARD_PROCEDURES` in `TreatmentPlanModal.tsx` is hardcoded.
* **Action Required:**
  1. Load procedure catalogue dynamically from `GET /clinics/my-clinic/clinical-config` and `billingStore.tariffs`.
  2. Fall back to `STANDARD_PROCEDURES` only if dynamic configuration is empty.

#### Gap G-06: Add "Cancelled" Status to UI
* **Action Required:**
  1. Update `<select>` in `TreatmentPlansPage.tsx` to include `<option value="Cancelled">Cancelled</option>`.
  2. Update status badge styling for `Cancelled` state.

---

### Tier 3: MEDIUM Priority (User Experience & Clinical Depth)

#### Gap G-07: Interactive Tooth Chart in Modal
* **Action Required:**
  1. Embed a compact SVG dental arch picker into `TreatmentPlanModal.tsx`.
  2. Allow clicking a tooth to automatically set or append FDI numbers to the active procedure item.

#### Gap G-08: Clinical Notes Integration
* **Action Required:**
  1. In `ClinicalNoteModal.tsx`, load the patient's active treatment plans.
  2. Provide an optional "Associated Treatment Plan" dropdown.
  3. Pass `treatmentPlanId` into `CreateClinicalNoteDto`.

#### Gap G-09: Detailed History Log View
* **Action Required:**
  1. Add `GET /treatment-plans/:id/history` endpoint or include `histories` in `getTreatmentPlanById`.
  2. Render a structured audit list in the "History" tab of `TreatmentPlanDetailsModal.tsx`.

---

### Tier 4: LOW Priority (Future Enhancements)

#### Gap G-10: Prescriptions Linkage
* **Action Required:** Add optional `treatmentPlanId` to `Prescription` model and digital prescription issuance dialog.
