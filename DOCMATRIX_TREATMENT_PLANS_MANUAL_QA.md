# DocMatrix — Treatment Plans Manual QA & Operational Walkthrough Guide

**Target Module:** Treatment Plans & Integrated Cost Estimates  
**URL Routes:**  
- `/clinical/treatment-plans` — Clinic-Wide Treatment Plans  
- `/clinical/estimates` — Cost Estimates & Acceptance Dashboard  
- `/patients/:patientId?tab=treatment-plans` — Patient Profile Treatment Plans  
- `/billing` — Invoicing & Financial Collections  

---

## 1. Quick Verification Matrix

| Test Case | Feature | Expected Behavior | Status |
|---|---|---|---|
| **TC-TP-01** | Create Treatment Plan with Dentist Selection | Modal displays treating dentist dropdown populated with clinic doctors. Defaults to active user or first doctor. Saves with plan number `TP-XXXX`. | Passed |
| **TC-TP-02** | Interactive FDI Odontogram Tooth Picker | Clicking "Open Tooth Chart Picker" reveals adult/primary dental chart. Clicking tooth (e.g. 16, 21) populates tooth input. Surface pills (M, O, D, B, L, I) toggle surfaces. | Passed |
| **TC-TP-03** | Dynamic Procedure Catalog & Tariffs | Dropdown displays both "Standard Dental Procedures (CDT / ADA)" and "Clinic Service Tariffs" from clinic configuration. | Passed |
| **TC-TP-04** | Record Chairside Verbal Acceptance | Records verbal agreement with legal disclaimer ("Staff Recorded Chairside; verbal consent on file"). Version number locked to accepted version. | Passed |
| **TC-TP-05** | Direct Invoice Generation | Clicking "Bill Procedures / Generate Invoice" opens selection dialog. User checks unbilled items. Submits and returns invoice number (e.g. `INV-XXXX`). Procedure row immediately displays green `Billed (INV-XXXX)` badge. | Passed |
| **TC-TP-06** | Material Usage Auto-Prompt on Completion | Changing a procedure status to `COMPLETED` shows banner prompt: *"Procedure '[Name]' marked as Completed. Record material consumption now?"*. Clicking opens `TreatmentMaterialUsageModal` with pre-filled fields. | Passed |
| **TC-TP-07** | Edit Treatment Plan & Version Increment | Clicking "Edit Plan" opens modal in edit mode with pre-filled details. Billed and completed procedures are locked with lock badge. Saving increments version from v1 to v2 and resets status to `Proposed` for re-acceptance. | Passed |
| **TC-TP-08** | Cancel Treatment Plan with Mandatory Reason | Clicking "Cancel Plan" prompts for cancellation reason. Status transitions to `CANCELLED`. Invoices and completed procedure items remain safely preserved. | Passed |
| **TC-TP-09** | Filter by "Cancelled" in Plans Table | Clicking the "Cancelled" chip filters table to show only cancelled plans with active count badge. | Passed |
| **TC-TP-10** | Clinical Notes & Rx Tab | In plan details, switching to "Clinical Notes & Rx" displays all historical clinical examination notes and digital prescriptions for this patient. | Passed |
| **TC-TP-11** | Audit Timeline | Switching to "Audit Timeline" displays chronological events: Created &rarr; Estimate Revised &rarr; Accepted &rarr; Invoiced &rarr; Cancelled. | Passed |
| **TC-TP-12** | Dark Mode Theme Compliance | Switching between light and dark mode preserves readable contrast on all badges, tables, inputs, modal backgrounds, and Odontogram SVG shapes. | Passed |

---

## 2. Step-by-Step Clinical Walkthrough

### Scenario: Complete Dental Rehabilitation Flow

#### Step 1: Create Plan & Chart Teeth
1. Navigate to `/clinical/treatment-plans`.
2. Click **"New Treatment Plan"**.
3. Select Patient (or open directly from `/patients/pt-1001` where patient is pre-locked).
4. Verify Treating Dentist dropdown lists all clinic practitioners. Select the attending doctor.
5. In Stage 1, click **"Open Tooth Chart Picker"**.
6. On the Maxillary arch, click tooth **16**. Verify `#16` appears in the tooth field.
7. Click surface buttons **M** and **O** to specify Mesio-Occlusal.
8. Under Procedure, select **"D3330 — Root Canal Therapy - Molar (₹6,500)"**.
9. Click **"Add Stage"** to create Stage 2 ("Stage 2: Full Coverage Crown").
10. Select **"D2740 — Crown - Porcelain / Ceramic Substrate (₹8,500)"** for tooth **16**.
11. Click **"Save & Propose Treatment Plan"**.
12. **Verification:** The plan appears in the table with status `Proposed` (v1) and total ₹15,000.

#### Step 2: Record Patient Acceptance
1. Click the plan row to open **Treatment Plan Details**.
2. Click **"Record Patient Acceptance"**.
3. Select method: **"Staff-Recorded (Chairside Verbal Consent)"**.
4. Enter accepting party name: **"Ananya Sharma"**.
5. Click **"Confirm Acceptance"**.
6. **Verification:** Top banner turns blue showing *"Accepted (Estimate v1): Agreed by Ananya Sharma on [Date] • Staff Recorded (Chairside)"*.

#### Step 3: Procedure Completion & Material Consumption
1. In Stage 1, change the Root Canal procedure status dropdown from `Pending` to **`Completed`**.
2. **Verification:** A prompt banner immediately appears above the tabs:
   *"Procedure 'Root Canal Therapy - Molar' marked as Completed. Record material consumption now?"*
3. Click **"Record Material Usage"**.
4. The `TreatmentMaterialUsageModal` opens with procedure pre-selected.
5. Confirm material quantities (e.g. Gutta Percha points, Sealer) and click **"Confirm Consumption & Deduct Inventory"**.
6. **Verification:** Inventory stock is deducted with zero-stock clamping and duplicate deduction protection.

#### Step 4: Bill Completed Procedure
1. In Treatment Plan Details, click **"Bill Procedures / Generate Invoice"**.
2. In the modal, select only the completed procedure (Root Canal Therapy). Leave the Crown unbilled.
3. Check **"Issue Immediately"**.
4. Click **"Generate Invoice"**.
5. **Verification:** Confirmation screen appears with the invoice number (`INV-XXXX`). In the procedures table, the Root Canal row now displays a green badge: `Billed (INV-XXXX)`.
6. Financial summary strip updates:
   - **Total Estimated:** ₹15,000
   - **Invoiced to Date:** ₹6,500
   - **Unbilled Balance:** ₹8,500
   - **Billing Status:** `Partially Billed`

#### Step 5: Edit Plan (Version v2)
1. In Treatment Plan Details, click **"Edit Plan"**.
2. Notice the Root Canal row is marked `Locked (Billed)` and its fee and quantity are disabled.
3. In Stage 2, change the Crown fee from ₹8,500 to ₹9,000 or add a post & core procedure.
4. Notice the **Revision Reason** field is pre-filled: `Estimate revision v2 - clinical adjustments`.
5. Click **"Save Plan Revisions"**.
6. **Verification:** The plan version increments to **v2**. Status returns to `Proposed` for re-acceptance. The Revisions tab shows Version 1 (₹15,000) and Version 2 (₹15,500).

#### Step 6: Cancellation (Edge Case)
1. If the patient decides to cancel the elective Stage 2 crown:
2. Click **"Cancel Plan"**.
3. Enter cancellation reason: *"Patient opted to defer crown placement due to overseas travel"*.
4. Click **"Confirm Plan Cancellation"**.
5. **Verification:** Status transitions to `Cancelled`. The Root Canal invoice and completed record remain preserved on permanent file. In the treatment plans listing, filtering by **"Cancelled"** displays this plan.
