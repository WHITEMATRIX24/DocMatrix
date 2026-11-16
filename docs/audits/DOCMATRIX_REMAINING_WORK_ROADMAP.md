# DOCMATRIX REMAINING WORK ROADMAP

**Date of Audit:** November 12, 2026  
**Auditor:** Senior Software Architect, QA Lead & Technical Project Manager  
**Scope:** Actionable development roadmap categorized by priority (P0 to P3), dependencies, estimated effort ranges, and acceptance criteria.

---

## 1. Roadmap Priority Summary

```
========================================================================================
DOCMATRIX REMAINING ENGINEERING EFFORT
----------------------------------------------------------------------------------------
P0 — Immediate Pre-QA / Staging Blockers:             1 Task   ( 1 - 2 Days )
P1 — High-Priority Production Readiness Hardening:    3 Tasks  ( 3 - 5 Days )
P2 — Enhancements & Secondary Modules:                4 Tasks  ( 1 - 2 Weeks )
P3 — V2 Roadmap Innovations & ERP Expansion:          3 Tasks  ( 3 - 4 Weeks )
========================================================================================
```

---

## 2. Priority P0 — Pre-QA Blocker (Must Complete Before Staging)

### Task P0-1: Finalize Appointments Module Frontend-to-Backend Binding
- **Description:**  
  Complete the ongoing transition in the Appointments module (owned by teammate) by binding `CalendarPage.tsx`, `NewAppointmentPage.tsx`, and `LiveQueuePage.tsx` to the existing NestJS `AppointmentsController` (`/appointments/*`).
- **Dependencies:**  
  `AppointmentsService` and `AppointmentsController` (already exist and pass unit tests).
- **Estimated Effort:** 1 – 2 Days.
- **Assigned Owner:** Teammate (Appointments Owner) with Core Team support.
- **Acceptance Criteria:**
  1. Creating an appointment in `NewAppointmentPage.tsx` writes directly to the Neon PostgreSQL `Appointment` table via `POST /appointments`.
  2. `CalendarPage.tsx` displays appointments retrieved from `GET /appointments?start=...&end=...`.
  3. Status changes in the live waiting room (`WAITING`, `IN_CHAIR`, `COMPLETED`) persist to database and survive full page refresh.
  4. Conflict detection properly rejects double-booking the same doctor or chair for overlapping time slots.

---

## 3. Priority P1 — Production Readiness & Operational Hardening

### Task P1-1: Production Environment Secret Enforcement
- **Description:**  
  Add strict startup guards in NestJS `main.ts` ensuring that the application will not boot in `NODE_ENV=production` if `JWT_SECRET` is unset or matches the default development fallback string.
- **Dependencies:** None.
- **Estimated Effort:** 2 – 4 Hours.
- **Assigned Owner:** Backend Security Engineer.
- **Acceptance Criteria:**
  1. Server throws an immediate fatal error during bootstrap if `JWT_SECRET` is missing in production mode.
  2. Staging and production deployment manifests include strong generated secrets.

### Task P1-2: Rate Limiting & Brute-Force Protection
- **Description:**  
  Configure `@nestjs/throttler` on sensitive authentication endpoints (`/auth/login`, `/auth/forgot-password`, `/auth/change-password`) and public lead capture (`/enquiries`).
- **Dependencies:** NestJS gateway.
- **Estimated Effort:** 4 – 8 Hours.
- **Assigned Owner:** Backend Engineer.
- **Acceptance Criteria:**
  1. More than 10 failed login attempts within 60 seconds from a single IP results in HTTP 429 Too Many Requests.
  2. Clinic operational traffic during normal dashboard use is not throttled.

### Task P1-3: Production Cloud Object Storage Verification
- **Description:**  
  Verify production S3 bucket provisioning (AWS S3 or Cloudflare R2) and configure bucket lifecycle policies for patient diagnostic attachments and radiographs.
- **Dependencies:** DevOps / Cloud Infrastructure.
- **Estimated Effort:** 4 – 8 Hours.
- **Assigned Owner:** Cloud Infrastructure Engineer.
- **Acceptance Criteria:**
  1. `StorageService` logs `[StorageService] Active storage engine: AWS/Neon S3 Cloud Object Storage` upon startup in staging/production.
  2. Uploaded radiographs and documents generate valid pre-signed URLs or secure storage paths.

---

## 4. Priority P2 — Enhancements & Operational Integrations

### Task P2-1: External Dental Laboratory Orders Tracker
- **Description:**  
  Extend `/clinical/orders` from a diagnostic vault deep-link into a complete laboratory workflow tracking external crown/bridge/prosthesis fabrication, lab vendor master list, shade records, and delivery dates.
- **Dependencies:** `ClinicalModule`.
- **Estimated Effort:** 3 – 5 Days.
- **Assigned Owner:** Full-Stack Engineer.
- **Acceptance Criteria:**
  1. Users can create lab work orders linked to a patient and treatment plan procedure.
  2. Track order status (`SENT_TO_LAB`, `IN_FABRICATION`, `RECEIVED`, `FITTED`).
  3. Include lab costs as an operational expense in `Expense` tracking.

### Task P2-2: SMS & Direct Email Notification Gateway
- **Description:**  
  Implement an outbound transactional notification service (e.g., via Twilio, AWS SNS, or Resend) for appointment reminders, invoice payment receipts, and prescription PDFs.
- **Dependencies:** `AppointmentsModule`, `BillingModule`.
- **Estimated Effort:** 3 – 5 Days.
- **Assigned Owner:** Backend Engineer.
- **Acceptance Criteria:**
  1. Automated SMS sent when an appointment is booked or rescheduled.
  2. Email sent with PDF receipt attachment upon full invoice payment.

### Task P2-3: Prescription Formulary Customization UI
- **Description:**  
  Allow clinics to add custom medications, dosages, and instructions to the auto-complete drug picker in `/clinical/prescriptions` through `/settings/clinical-config`.
- **Dependencies:** `ClinicalConfigPage.tsx`, `PrescriptionsController`.
- **Estimated Effort:** 2 – 3 Days.
- **Assigned Owner:** Frontend Engineer.
- **Acceptance Criteria:**
  1. Custom clinic drugs saved in clinical configuration appear immediately in prescription writer suggestions.

### Task P2-4: Automated Recall Scheduling Cron
- **Description:**  
  Add a scheduled NestJS cron task that automatically scans for patients with completed scaling/root planing or routine checkups older than 6 months and enqueues recall reminders in `/reports/follow-ups`.
- **Dependencies:** `ReportsModule`.
- **Estimated Effort:** 2 – 3 Days.
- **Assigned Owner:** Backend Engineer.
- **Acceptance Criteria:**
  1. Cron executes daily at midnight, populating the follow-ups recall queue without manual entry.

---

## 5. Priority P3 — V2 Roadmap Innovations & ERP Expansion

### Task P3-1: Full Double-Entry Accounting Ledger (Tally / GST)
- **Description:**  
  Implement the 8 placeholder routes in `/accounts` (Ledgers, Day Book, Profit & Loss, Trial Balance, Balance Sheet, GST Export, Tally XML Export).
- **Dependencies:** `BillingModule`, Double-Entry General Ledger schema design.
- **Estimated Effort:** 2 – 3 Weeks.
- **Assigned Owner:** Senior Backend / Financial Systems Engineer.
- **Acceptance Criteria:**
  1. Invoices and payments automatically post debit/credit entries to sales and receivables accounts.
  2. Generates standard GSTR-1 and Tally XML export files.

### Task P3-2: WhatsApp Business Cloud API Direct Integration
- **Description:**  
  Replace browser deep-links (`https://wa.me/`) with server-to-server WhatsApp Business Platform Cloud API messaging, interactive button templates, and webhook handlers for patient appointment confirmations.
- **Dependencies:** Meta Developer Account, Verified WhatsApp Business Account.
- **Estimated Effort:** 1 – 2 Weeks.
- **Assigned Owner:** Backend Integration Engineer.
- **Acceptance Criteria:**
  1. System sends interactive WhatsApp messages with "Confirm" and "Reschedule" buttons.
  2. Inbound webhook updates appointment status to `CONFIRMED`.

### Task P3-3: White-Label Patient Booking Portal & Clinic Website
- **Description:**  
  Complete `/website/settings` to provide public online booking widgets that clinics can embed on their external websites, routing requests to `/appointments/missed-enquiries` or triage queue.
- **Dependencies:** Public API gateway.
- **Estimated Effort:** 1 – 2 Weeks.
- **Assigned Owner:** Full-Stack Engineer.
- **Acceptance Criteria:**
  1. Embedded iframe or standalone booking page allows patients to request slots without staff credentials.

