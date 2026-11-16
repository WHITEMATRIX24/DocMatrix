# DOCMATRIX SECURITY HARDENING ROADMAP

**Date of Audit:** November 12, 2026  
**Auditor:** Senior Security Architect & Technical Project Manager  
**Reference Playbook:** Vibe Coded App Security Implementation Guide (November 2026 Edition)  
**Scope:** Actionable, phased engineering roadmap to elevate DocMatrix from current conditionally ready status to full enterprise-grade production security.

---

## Roadmap Executive Summary

```
========================================================================================
DOCMATRIX SECURITY HARDENING TIMELINE & EFFORT ALLOCATION
----------------------------------------------------------------------------------------
P0 — Immediate Security Blockers (Pre-Production Deployment):    2 Tasks  ( 1 - 2 Days )
P1 — Essential Security Controls (Staging & Pilot Launch Gate):  4 Tasks  ( 3 - 5 Days )
P2 — Production Hardening & Operational Defense-in-Depth:        4 Tasks  ( 1 - 2 Weeks )
P3 — Future Security Work (V2 Integrations & Advanced Controls): 3 Tasks  ( 2 - 3 Weeks )
========================================================================================
```

---

## 1. Priority P0: Immediate Security Blockers (Pre-Production)

### Task P0-1: Restrict CORS Policy to Trusted Domains
- **Priority:** P0 (Release Blocker)
- **Description:** Remove wildcard origin reflection (`origin: true`) in [`backend/src/main.ts`](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/backend/src/main.ts#L8). Implement explicit domain allowlisting read from environment variables.
- **Affected Files:** `backend/src/main.ts`, `backend/.env.example`.
- **Reason:** Prevent malicious cross-origin requests from stealing authenticated session data or executing CSRF-like operations.
- **Dependency:** None.
- **Suggested Owner:** Backend Gateway Engineer.
- **Estimated Effort:** 2 – 4 Hours.
- **Acceptance Criteria:**
  1. Requests with `Origin: https://app.docmatrix.co.in` or `http://localhost:5173` receive valid `Access-Control-Allow-Origin`.
  2. Requests with unauthorized origins (e.g., `https://evil.com`) receive no CORS allow headers or HTTP 403.
- **Verification Requirements:** Automated integration test verifying rejection of untrusted origin headers.

---

### Task P0-2: Eliminate Fallback JWT Secret & Enforce Production Startup Assertion
- **Priority:** P0 (Release Blocker)
- **Description:** Remove `'docmatrix_jwt_development_secret_key_2026'` default in [`auth.module.ts`](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/backend/src/auth/auth.module.ts#L12) and [`jwt.strategy.ts`](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/backend/src/auth/jwt.strategy.ts#L20). Add an explicit startup validation in `main.ts` that aborts boot if `NODE_ENV === 'production'` and `JWT_SECRET` is unset or less than 32 characters.
- **Affected Files:** `backend/src/main.ts`, `backend/src/auth/auth.module.ts`, `backend/src/auth/jwt.strategy.ts`.
- **Reason:** Prevent catastrophic token forgery if deployed with missing environment variables.
- **Dependency:** None.
- **Suggested Owner:** Backend Security Engineer.
- **Estimated Effort:** 2 – 4 Hours.
- **Acceptance Criteria:**
  1. Running `NODE_ENV=production npm run start` without `JWT_SECRET` exits with code 1 and logs an explicit fatal security error.
  2. Valid 256-bit secret boots cleanly.
- **Verification Requirements:** Unit test asserting exception on empty secret in production mode.

---

## 2. Priority P1: Essential Security Controls (Staging & Pilot Gate)

### Task P1-1: Enforce Role-Based Access Control on Billing Mutations (BFLA Remediation)
- **Priority:** P1 (Essential Security Control)
- **Description:** Add `RolesGuard` to [`BillingController`](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/backend/src/billing/billing.controller.ts). Apply `@Roles(StaffRole.ORGANIZATION_ADMIN, StaffRole.ACCOUNTANT)` to sensitive write operations (`issue`, `void`, `refund`, `tariffs`, `expenses`).
- **Affected Files:** `backend/src/billing/billing.controller.ts`, `backend/src/billing/billing.service.ts`.
- **Reason:** Prevent low-privilege clinic staff (receptionists, nurses) from altering clinic tariffs, issuing fraudulent refunds, or voiding valid invoices.
- **Dependency:** `RolesGuard`.
- **Suggested Owner:** Full-Stack Billing Engineer.
- **Estimated Effort:** 1 – 2 Days.
- **Acceptance Criteria:**
  1. Organization Admin and Accountant can issue, void, and refund invoices.
  2. Doctor, Nurse, and Receptionist roles receive HTTP 403 Forbidden when calling billing mutation endpoints.
- **Verification Requirements:** Add test suite `billing-role-authorization.spec.ts` asserting 403 for unauthorized roles.

---

### Task P1-2: Add Rate Limiting & Brute-Force Defenses
- **Priority:** P1 (Essential Security Control)
- **Description:** Integrate `@nestjs/throttler` into `AppModule` and configure `ThrottlerGuard` on `/auth/login`, `/auth/register-clinic`, and `/enquiries`.
- **Affected Files:** `backend/src/app.module.ts`, `backend/src/auth/auth.controller.ts`, `backend/src/enquiries/enquiries.controller.ts`.
- **Reason:** Protect against automated password guessing, credential stuffing, and lead spamming.
- **Dependency:** `@nestjs/throttler` package.
- **Suggested Owner:** Backend Infrastructure Engineer.
- **Estimated Effort:** 4 – 8 Hours.
- **Acceptance Criteria:**
  1. Exceeding 10 failed login attempts within 60 seconds from an IP returns HTTP 429 Too Many Requests.
  2. Normal dashboard navigation is not impacted.
- **Verification Requirements:** Automated test firing 15 requests and verifying HTTP 429 on request 11.

---

### Task P1-3: Install Helmet & Configure HTTP Security Headers
- **Priority:** P1 (Essential Security Control)
- **Description:** Add `helmet` middleware in `main.ts` to set standard security headers (`X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`).
- **Affected Files:** `backend/src/main.ts`, `backend/package.json`.
- **Reason:** Defend against MIME sniffing, clickjacking, and insecure transport downgrades.
- **Dependency:** `helmet` package.
- **Suggested Owner:** Backend Gateway Engineer.
- **Estimated Effort:** 2 – 4 Hours.
- **Acceptance Criteria:**
  1. Every API response includes `X-Content-Type-Options: nosniff` and `Strict-Transport-Security`.
- **Verification Requirements:** End-to-end HTTP header inspection test.

---

### Task P1-4: Implement Server-Side Token Revocation & Pin JWT Algorithm
- **Priority:** P1 (Essential Security Control)
- **Description:** Add `tokenVersion` integer column to `User` model in `schema.prisma`. Increment `tokenVersion` upon password change or session revocation. Pin `algorithms: ['HS256']` in `JwtStrategy`.
- **Affected Files:** `backend/prisma/schema.prisma`, `backend/src/auth/auth.service.ts`, `backend/src/auth/jwt.strategy.ts`.
- **Reason:** Guarantee that logging out or resetting a password terminates existing sessions immediately.
- **Dependency:** Database migration on staging.
- **Suggested Owner:** Backend Auth Specialist.
- **Estimated Effort:** 1 – 2 Days.
- **Acceptance Criteria:**
  1. Changing password increments `tokenVersion`; previous tokens return HTTP 401 Unauthorized.
  2. Tokens signed with `none` algorithm are rejected.
- **Verification Requirements:** Automated test in `auth.service.spec.ts`.

---

## 3. Priority P2: Production Hardening & Defense-in-Depth

### Task P2-1: Enforce Production Cloud Object Storage & Block Local Disk Fallback
- **Priority:** P2
- **Description:** Update `StorageService` constructor to throw an immediate exception if `NODE_ENV === 'production'` and S3 credentials are missing.
- **Affected Files:** `backend/src/storage/storage.service.ts`.
- **Reason:** Eliminate split-brain local disk storage and accidental document loss in multi-container cloud deployments.
- **Estimated Effort:** 2 – 4 Hours.
- **Owner:** Cloud Security Engineer.

---

### Task P2-2: Add Multi-Factor Authentication (MFA/TOTP) for Clinic Administrators
- **Priority:** P2
- **Description:** Implement RFC 6238 TOTP authentication (authenticator apps) for `ORGANIZATION_ADMIN` and `BRANCH_ADMIN` roles in `/settings/security`.
- **Affected Files:** `backend/src/auth/`, `src/pages/settings/SecurityPage.tsx`.
- **Reason:** Protect sensitive patient records and clinic financials from credential reuse and phishing attacks.
- **Estimated Effort:** 3 – 5 Days.
- **Owner:** Full-Stack Security Engineer.

---

### Task P2-3: Centralized Security Telemetry & Alerting
- **Priority:** P2
- **Description:** Migrate `logSecurityEvent` from local disk JSON files to PostgreSQL `AuditLog` table and cloud logging (CloudWatch / Datadog). Configure alerting triggers for consecutive failed logins and spike in 401/403 errors.
- **Affected Files:** `backend/src/auth/auth.service.ts`, `backend/src/common/filters/`.
- **Reason:** Ensure audit logs survive container restarts and enable early detection of brute-force attempts.
- **Estimated Effort:** 2 – 3 Days.
- **Owner:** DevOps / SRE Engineer.

---

### Task P2-4: Document Disaster Recovery Runbook & Backup Restoration Drill
- **Priority:** P2
- **Description:** Author formal runbook under `docs/operations/DISASTER_RECOVERY.md` detailing Neon PITR point-in-time restore procedures, S3 cross-region replication, and execute a verified restore drill on staging.
- **Affected Files:** `docs/operations/DISASTER_RECOVERY.md`.
- **Reason:** Ensure compliance with healthcare data protection standards and business continuity.
- **Estimated Effort:** 1 – 2 Days.
- **Owner:** Database Administrator / QA Lead.

---

## 4. Priority P3: Future Security Work (V2 Roadmap)

### Task P3-1: Meta WhatsApp Cloud API Webhook Signature Verification
- **Priority:** P3
- **Description:** Implement HMAC-SHA256 signature verification (`X-Hub-Signature-256`) and replay protection for incoming Meta WhatsApp webhooks when building V2 automated messaging.
- **Estimated Effort:** 3 – 5 Days.
- **Owner:** Backend Integration Engineer.

---

### Task P3-2: Public Online Booking Bot Protection (Turnstile / CAPTCHA)
- **Priority:** P3
- **Description:** Add Cloudflare Turnstile or proof-of-work challenge to the public `/website/settings` patient booking widget to defend against automated appointment slot denial-of-service.
- **Estimated Effort:** 2 – 3 Days.
- **Owner:** Frontend / Security Engineer.

---

### Task P3-3: Double-Entry Accounting Audit Trail
- **Priority:** P3
- **Description:** Ensure immutable cryptographic hashing of general ledger journal vouchers when implementing `/accounts` in V2.
- **Estimated Effort:** 1 – 2 Weeks.
- **Owner:** Financial Systems Architect.

