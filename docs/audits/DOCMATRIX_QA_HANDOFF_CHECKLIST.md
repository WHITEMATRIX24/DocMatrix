# DOCMATRIX QA HANDOFF CHECKLIST & ACCEPTANCE TEST PLAN

**Date of Audit:** November 12, 2026  
**Auditor:** Senior Software Architect & QA Lead  
**Scope:** Actionable quality assurance test plan, test prerequisites, acceptance criteria, and blocker tracking for QA handoff.

---

## 1. QA Prerequisites & Staging Environment Setup

Before initiating formal manual or automated acceptance testing:

1. **Staging Database Provisioning:**  
   - Dedicated staging Neon PostgreSQL branch isolated from production.
   - Run `npx prisma migrate deploy` to ensure all 30 models and composite indexes are applied.
   - Run seed script to load minimum baseline data: 2 Clinics, 4 Staff users (1 Admin, 2 Doctors, 1 Receptionist), 20 Patients, 10 Service Tariffs, 15 Inventory Items.
2. **Environment Variables:**
   - `NODE_ENV=staging`
   - `DATABASE_URL=<staging_neon_connection_string>`
   - `JWT_SECRET=<secure_staging_secret>`
   - `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` (or staging S3 bucket).
3. **Automated Baseline Verification:**
   - Execute `npm test` on frontend (verify 23/23 suites pass).
   - Execute `npm test` on backend (verify 16/16 suites pass).
   - Execute production build: `npm run build` (both root and backend).

---

## 2. QA Blocker Tracking

| Blocker ID | Module | Issue Description | Workaround / Unblock Condition | QA Status |
| :---: | :--- | :--- | :--- | :---: |
| **BLK-01** | Appointments | Calendar frontend-to-backend API binding in progress by teammate. | Use client-side appointments for triage testing; full calendar persistence testing begins once teammate deploys branch. | **In Progress** |

All other 13 modules have **zero blockers** and can enter QA immediately.

---

## 3. Module-by-Module QA Test Checklist

### 1. Authentication & Session Management
- [ ] **TC-AUTH-01:** Log in with valid credentials (`doctor@clinic.com` / `password123`).  
  *Expected:* Successfully redirects to `/dashboard`, sets Bearer JWT in memory/sessionStorage, displays doctor name in topbar.
- [ ] **TC-AUTH-02:** Attempt login with incorrect password.  
  *Expected:* Displays clear error alert "Invalid credentials", no redirect, no token stored.
- [ ] **TC-AUTH-03:** Log out from topbar dropdown.  
  *Expected:* Session cleared, user redirected to `/login`, navigating back via browser history is blocked.
- [ ] **TC-AUTH-04:** Change password in `/settings/security`.  
  *Expected:* Requires correct current password; subsequent login succeeds with new password.

### 2. Patient Registration & Profiles
- [ ] **TC-PAT-01:** Register new patient via `/patients/new`.  
  *Expected:* Validates mandatory fields (name, phone, DOB); saves record; assigns unique patient code (e.g. `PT-1005`); redirects to Patient Profile.
- [ ] **TC-PAT-02:** Verify Emergency Contact section styling in Dark Mode.  
  *Expected:* Labels, input text, and borders are crisply readable in both light and dark themes with full WCAG contrast.
- [ ] **TC-PAT-03:** Open Patient Profile (`/patients/:id`) and switch through all 6 subtabs: Overview, Timeline, Tooth Chart, Treatment Plans, Prescriptions, Documents.  
  *Expected:* All subtabs render authentic patient data without JavaScript console errors.
- [ ] **TC-PAT-04:** Update tooth condition on Odontogram (`/patients/:id/tooth-chart`).  
  *Expected:* Click tooth 46 occlusal surface, select "Caries", save. Condition persists after reload.

### 3. Clinical Notes & Digital Prescriptions
- [ ] **TC-CLN-01:** Create a consultation SOAP note in `/clinical/notes`.  
  *Expected:* Fill Chief Complaint, Diagnosis, Procedure; select active Treatment Plan; sign note. Status updates to `FINALIZED`.
- [ ] **TC-CLN-02:** Append addendum to finalized clinical note.  
  *Expected:* Original note text is immutable; addendum is appended with author timestamp and reason.
- [ ] **TC-CLN-03:** Print clinical note.  
  *Expected:* Opens official letterhead modal with clinic logo, doctor signature, and patient details.
- [ ] **TC-CLN-04:** Create digital prescription in `/clinical/prescriptions`.  
  *Expected:* Autocomplete selects drug from formulary; specify dosage, frequency, duration; prints clean Rx layout.

### 4. Treatment Plans & Estimates
- [ ] **TC-TP-01:** Create a multi-stage treatment plan.  
  *Expected:* Add Stage 1 (Scaling), Stage 2 (Root Canal on #16); assign treating dentist; system calculates subtotal and taxes.
- [ ] **TC-TP-02:** Record patient acceptance.  
  *Expected:* Select "Accept Plan", record Verbal or Signed consent; plan status transitions from `DRAFT` to `ACCEPTED`.
- [ ] **TC-TP-03:** Edit treatment plan.  
  *Expected:* Authorized user can add/remove procedures, update fees, and adjust dates before procedures are billed.
- [ ] **TC-TP-04:** Generate invoice from treatment plan.  
  *Expected:* Click "Generate Invoice", select unbilled procedures, submit. Invoice is created; selected procedures show as `BILLED`.

### 5. Billing & Invoicing
- [ ] **TC-BIL-01:** Create itemized invoice via `/billing/invoices/new`.  
  *Expected:* Select patient, pick service tariff, apply 10% discount and 18% GST. Math verified: Subtotal - Discount + Tax = Total.
- [ ] **TC-BIL-02:** Record partial payment.  
  *Expected:* Invoice total $10,000; record $6,000 Cash payment. Status transitions to `PARTIAL`; remaining due shows $4,000.
- [ ] **TC-BIL-03:** Collect remaining balance.  
  *Expected:* Record $4,000 UPI payment. Invoice status transitions to `PAID`; balance becomes $0.00.
- [ ] **TC-BIL-04:** Verify pending dues list (`/billing/dues`).  
  *Expected:* Partially paid and unpaid invoices appear in appropriate aging buckets (0-30 days, 31-60 days).

### 6. Inventory & Supply Chain
- [ ] **TC-INV-01:** View item stock catalog in `/inventory/items`.  
  *Expected:* Displays SKUs, batch numbers, remaining quantities, and expiry dates. Low stock items show warning badge.
- [ ] **TC-INV-02:** Log treatment material consumption.  
  *Expected:* Consume 1 unit of composite syringe for procedure. Stock decrements by 1; movement logged in audit trail.
- [ ] **TC-INV-03:** Test duplicate deduction protection.  
  *Expected:* Triggering multiple consumption requests with identical `operationId` returns cached success without deducting stock twice.

### 7. Patient Document Storage
- [ ] **TC-DOC-01:** Upload patient X-ray in `/patients/:id/documents`.  
  *Expected:* Upload JPEG/PNG/PDF. File persists to S3 (or disk fallback); entry appears in documents list with thumbnail.
- [ ] **TC-DOC-02:** Download and delete document.  
  *Expected:* Clicking download retrieves authentic file; deleting removes entry from list and storage.

### 8. Reports & Analytics
- [ ] **TC-REP-01:** View Revenue Report (`/reports/revenue`) as Clinic Owner/Admin.  
  *Expected:* Displays authentic metrics from live database; period selector (Day/Week/Month) recalculates values accurately.
- [ ] **TC-REP-02:** Attempt accessing Revenue Report as Receptionist.  
  *Expected:* UI redirects away or displays 403 Forbidden; money figures are hidden across all tabs.
- [ ] **TC-REP-03:** Test report failure error state.  
  *Expected:* If API endpoint is unreachable, UI displays error state with "Retry" button; never falls back to mock data.
- [ ] **TC-REP-04:** Check Follow-ups recall list (`/reports/follow-ups`).  
  *Expected:* Lists patients with unfinished treatments; clicking "Contact" updates status; WhatsApp action opens prefilled link.

### 9. Clinic Settings & Configuration
- [ ] **TC-SET-01:** Update clinic details in `/settings/clinic`.  
  *Expected:* Edit clinic name and phone; verify header updates across all printed receipts and clinical notes.
- [ ] **TC-SET-02:** Invite staff member in `/settings/staff`.  
  *Expected:* Create user with role `DOCTOR`; new doctor appears in staff list and doctor assignment pickers.
- [ ] **TC-SET-03:** Export clinic data backup in `/settings/data`.  
  *Expected:* Dispatches backup generation; downloads comprehensive JSON snapshot of clinic records.
- [ ] **TC-SET-04:** Toggle dark mode across all settings pages.  
  *Expected:* Flawless visual contrast, no dark text on dark backgrounds or white cards on dark canvas.

