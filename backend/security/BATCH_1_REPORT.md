# DocMatrix — Batch 1 remediation report

> Latest compatibility results: [Batch 1 final compatibility report](BATCH_1_COMPATIBILITY_REPORT.md). The two TypeScript errors and two E2E fixture failures are resolved; 36 frontend cases and 404 backend cases passed, with one optional live ClamAV test unavailable. Earlier results below are historical.

> Current follow-up: see [Batch 1 staging review](BATCH_1_STAGING_REVIEW.md) for the corrected receptionist/acceptance workflows and latest checks (381 backend tests passed, 14 live-service skips; frontend baseline failures remain). Counts below describe the earlier Batch 1 verification.

Date: 2026-11-18 (Asia/Calcutta). Branch: security/batch-1-remaining.

## Result and safety boundary

Findings #2–#15 are **FIXED AND VERIFIED locally** within the implementation and test boundaries below. This is not production deployment approval, and Batch 2 was not started.

The final backend run completed with **368 passed, 0 failed, 0 skipped**, across 31 test files. The repository uses Vitest for its unit tests; Jest was not installed or substituted. PostgreSQL 18.6 concurrency tests used only a new disposable localhost cluster/schema. ClamAV 1.5.4 used a portable verified release and isolated synthetic signatures. No Neon database, production S3 resource, production credentials or production sessions were modified.

Finding #1 implementation files were compared with their pre-batch SHA-256 snapshots and remained byte-for-byte unchanged: local environment/template, JWT configuration, strategy, session service and main bootstrap. Two existing Finding #1 test fixtures gained ACTIVE clinic status to accommodate Finding #8; their JWT/session assertions were preserved. Existing user/UI/patient-service changes were not reset, staged or committed.

## Executed verification

- Full command: `node node_modules/vitest/vitest.mjs run src test/security-phase4-5.spec.ts --maxWorkers=2 --reporter=json --outputFile=.security-test/all-final-verified.json`.
- Dedicated integration variables pointed BATCH1_DATABASE_URL only at 127.0.0.1:55439/postgres?schema=batch1_security with the dedicated synthetic test user; BATCH1_CLAMAV_HOST=127.0.0.1 and BATCH1_CLAMAV_PORT=55440. The PostgreSQL test rejects other targets.
- TypeScript: `node node_modules/typescript/bin/tsc -p tsconfig.build.json --noEmit --incremental false` — passed, exit 0.
- Prisma: `node node_modules/prisma/build/index.js validate` — passed, exit 0.
- Relevant Oxlint type-aware checks — exit 0, 0 errors and 30 remaining warnings (unused bindings/imports, existing unbound-method assertions, class spreading and Decimal interpolation). This is not a warning-free lint claim.
- `git diff --check` — passed.
- Negative controls: ten focused audit regression tests and ten original PostgreSQL race/attribution tests failed against captured vulnerable source as expected. A separate isolated VM test confirmed the original bootstrap attempted provisioning without explicit credentials, with database and crypto calls stubbed.
- Intermediate failures included sandbox-blocked localhost access, outdated async/DTO/data fixtures, and an oversized failure diagnostic exhausting a baseline test worker. These were corrected; final results above supersede those attempts. Suite-level success and failures were checked, not just assertion counts.

Real integration boundaries: HTTP multipart/CSP tests used real Nest/Express/Multer with synthetic persistence; PostgreSQL tests used real transactions and controlled concurrent connections; local storage round-tripped real bytes in a dedicated temporary directory. ClamAV transport was tested against both an emulated TCP peer and a real local daemon. S3 unit/provider interactions were mocked: no live cloud bucket or full frontend browser rendering was tested. The test-only ClamAV signature database must never be used as production malware protection. The portable archive matched its official release SHA-256 digest. See the [official release](https://github.com/Cisco-Talos/clamav/releases/tag/clamav-1.5.4) and [signature database documentation](https://docs.clamav.net/manual/Signatures/HashSignatures.html).

## Finding #2 — Cross-tenant invoice appointment linking

**Status: FIXED AND VERIFIED** (local scope).

**Original vulnerability:** Draft updates accepted arbitrary appointment IDs. Invoice details then joined and returned the referenced appointment without validating its clinic or patient.

**Modified files:** [src/billing/billing.service.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/billing/billing.service.ts>), [src/security/batch-1.security.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/security/batch-1.security.spec.ts>), [src/security/batch-1.postgres.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/security/batch-1.postgres.spec.ts>).

**Implemented fix:** Draft changes validate the final patient/appointment/treatment-plan combination inside the invoice transaction, including retained relationships when the patient changes. Creation paths validate supplied relationships. Detail retrieval validates existing links and fetches appointments using clinic and patient predicates rather than an unrestricted relation include.

**Executed proof:** 2 explicitly numbered regression/integration cases passed in the final run, plus the relevant existing service/authorization regressions included in the complete run.

- PASS — #2 rejects foreign appointment links on update and legacy detail retrieval
- PASS — #2 rejects foreign appointment assignment on draft updates

**Remaining risks:** Historical invalid links are rejected, not automatically repaired. The existing single-column appointment foreign key remains; non-application database writers must preserve the same invariant.

**Manual verification:** With two disposable clinics, attach clinic B’s appointment to clinic A’s draft and expect rejection without mutation. Repeat with another patient in clinic A. Simulate a legacy invalid link only in a disposable database and confirm invoice details do not disclose it. Confirm a valid same-patient appointment works.

## Finding #3 — Explicit clinical and operational permissions

**Status: FIXED AND VERIFIED** (local scope).

**Original vulnerability:** Clinic membership alone authorized sensitive clinical reads, draft edits, tooth-chart mutations, consent/document deletion, patient archives and inventory operations. Administrative patient/invoice responses could include clinical fields.

**Modified files:** [src/common/decorators/operation-permission.decorator.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/common/decorators/operation-permission.decorator.ts>), [src/common/guards/tenant.guard.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/common/guards/tenant.guard.ts>), [src/clinical/clinical.controller.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/clinical/clinical.controller.ts>), [src/clinical-notes/clinical-notes.controller.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/clinical-notes/clinical-notes.controller.ts>), [src/clinical-notes/clinical-notes.service.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/clinical-notes/clinical-notes.service.ts>), [src/prescriptions/prescriptions.controller.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/prescriptions/prescriptions.controller.ts>), [src/patients/patients.controller.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/patients/patients.controller.ts>), [src/inventory/inventory.controller.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/inventory/inventory.controller.ts>), [src/billing/billing.controller.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/billing/billing.controller.ts>), [src/billing/billing.service.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/billing/billing.service.ts>).

**Implemented fix:** Added operation metadata and an explicit role policy, enforced by TenantGuard after authentication. Actual clinical-note authoring also requires Doctor at the service boundary. Doctors author clinical notes, prescriptions and tooth charts; clinical reads are available to administrators, Doctors and Nurses. Intake roles retain demographics, patient-reported safety alerts and consent recording. Accountants receive demographics rather than safety alerts/raw appointment history. Inventory catalog/stock/deduction permissions are separate. Invoice details suppress clinical-only fields for nonclinical callers.

**Executed proof:** 8 explicitly numbered regression/integration cases passed in the final run, plus the relevant existing service/authorization regressions included in the complete run.

- PASS — #3 preserves front-desk patient intake without granting full clinical-record access
- PASS — #3 limits administrative patient responses to demographics
- PASS — #3 applies explicit clinical/document/archive/inventory permissions to ORGANIZATION_ADMIN
- PASS — #3 applies explicit clinical/document/archive/inventory permissions to BRANCH_ADMIN
- PASS — #3 applies explicit clinical/document/archive/inventory permissions to DOCTOR
- PASS — #3 applies explicit clinical/document/archive/inventory permissions to RECEPTIONIST
- PASS — #3 applies explicit clinical/document/archive/inventory permissions to ACCOUNTANT
- PASS — #3 denies an Accountant modifying clinical notes

**Remaining risks:** This is the implemented default permission matrix and should be reviewed by the clinic product owner before rollout. Financial invoice/treatment descriptions remain visible to authorized billing roles because they are needed for billing. This is not a certification of privacy compliance.

**Manual verification:** Log in as each of Super Admin, Organization Admin, Branch Admin, Doctor, Receptionist and Accountant. Call the protected routes directly. Confirm Accountant clinical edits and reads are denied; Doctor clinical workflows succeed; Receptionist intake succeeds but clinical-note access is denied; only permitted administrators archive patients or delete evidence. Confirm nonclinical patient/invoice responses omit clinical-only fields.

## Finding #4 — Treatment-plan lifecycle authorization and consent authenticity

**Status: FIXED AND VERIFIED** (local scope).

**Original vulnerability:** Acceptance, rejection, plan-status and item-status methods omitted practitioner checks. Staff could claim direct digital/patient-portal consent without evidence, accept stale versions, or bypass lifecycle transitions.

**Modified files:** [src/treatment-plans/treatment-plans.service.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/treatment-plans/treatment-plans.service.ts>), [src/treatment-plans/dto/record-acceptance.dto.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/treatment-plans/dto/record-acceptance.dto.ts>), [src/common/transaction-locks.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/common/transaction-locks.ts>), [src/security/batch-1.authorization.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/security/batch-1.authorization.spec.ts>).

**Implemented fix:** All lifecycle mutations require Doctor or clinic-administrator authorization. Added allowed transitions and terminal-state restrictions. Acceptance requires the current estimate. Staff endpoints reject direct digital/portal signing and isStaffRecorded=false; written consent requires an existing Consent document belonging to the same patient/clinic. The actor remains server-derived. Plan-row locks and status/version predicates reject stale lifecycle mutations.

**Executed proof:** 5 explicitly numbered regression/integration cases passed in the final run, plus the relevant existing service/authorization regressions included in the complete run.

- PASS — #4 cannot fabricate direct DIGITAL_SIGNATURE through a staff endpoint
- PASS — #4 cannot fabricate direct PATIENT_PORTAL through a staff endpoint
- PASS — #4 records staff acceptance honestly and preserves optimistic state predicates
- PASS — #4 rejects old estimates, invalid transitions and unlinked written evidence
- PASS — #4 denies non-practitioners before treatment lifecycle access

**Remaining risks:** Written evidence is a staff attestation linked to a document, not cryptographic verification of the patient’s signature. A future patient-signing channel needs its own authenticated evidence workflow.

**Manual verification:** Attempt each lifecycle endpoint as Accountant and Receptionist; expect denial. Try PROPOSED→COMPLETED, an old estimate, direct DIGITAL_SIGNATURE/PATIENT_PORTAL, and missing/foreign written evidence; expect rejection. Record current-version STAFF_RECORDED acceptance as a practitioner and verify its truthful audit flag and actor.

## Finding #5 — Platform administrator bootstrap

**Status: FIXED AND VERIFIED** (local scope).

**Original vulnerability:** The provisioning script supplied predictable email/password defaults and used upsert to overwrite credentials and elevate an existing matching account.

**Modified files:** [scripts/create-platform-admin.mjs](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/scripts/create-platform-admin.mjs>), [src/security/batch-1.authorization.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/security/batch-1.authorization.spec.ts>).

**Implemented fix:** Removed default credentials and password argv handling. Operators must supply DOCMATRIX_BOOTSTRAP_EMAIL and DOCMATRIX_BOOTSTRAP_PASSWORD through their secret environment. The password must have at least 16 characters and at most 72 UTF-8 bytes. Existing accounts are rejected; the script uses create, never update/upsert, and hashes with bcrypt cost 12. Importing the module performs no provisioning. Failure output is generic and does not print credentials.

**Executed proof:** 1 explicitly numbered regression/integration cases passed in the final run, plus the relevant existing service/authorization regressions included in the complete run.

- PASS — #5 requires explicit credentials and refuses to reset/elevate existing accounts

The isolated original-script VM additionally reproduced credential-free default provisioning without opening a real database.

**Remaining risks:** Existing administrator credentials were not inspected, reset or rotated. The operator must generate a strong independent password and protect the bootstrap environment. Existing-account recovery is intentionally a separate process.

**Manual verification:** In a disposable database, omit credentials and confirm no account is created. Supply explicit generated credentials and confirm one administrator is created. Run again for the same email and confirm the original hash, role and account state are unchanged. Never test this against production.

## Finding #6 — Subscription commercial-term authorization

**Status: FIXED AND VERIFIED** (local scope).

**Original vulnerability:** Organization Admins could assign plans to their own clinics with arbitrary locked prices and trial terms.

**Modified files:** [src/subscriptions/subscriptions.controller.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/subscriptions/subscriptions.controller.ts>), [src/subscriptions/subscriptions.service.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/subscriptions/subscriptions.service.ts>), [src/security/batch-1.authorization.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/security/batch-1.authorization.spec.ts>), [src/security/batch-1.postgres.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/security/batch-1.postgres.spec.ts>).

**Implemented fix:** Direct subscription provisioning, including commercial overrides, requires the separate platform-administrator flag at both controller and service boundaries. Tenant administrators cannot grant themselves paid entitlements through this raw provisioning API.

**Executed proof:** 3 explicitly numbered regression/integration cases passed in the final run, plus the relevant existing service/authorization regressions included in the complete run.

- PASS — #6 rejects direct tenant provisioning at the service boundary
- PASS — #6/#8 preserves authorized platform provisioning and clinic recovery
- PASS — #6 rejects tenant commercial overrides instead of forwarding them

**Remaining risks:** Tenant-facing plan changes now require the authorized provisioning workflow. A self-service checkout/payment-verification workflow is not introduced by this batch. Explicit platform-approved discounts/free trials remain supported.

**Manual verification:** As an Organization Admin, submit zero-price, large-trial and ordinary raw plan-assignment requests and expect 403. As an authorized platform administrator, provision a disposable clinic using explicit approved terms and verify the stored price and period.

## Finding #7 — Embedded upfront-payment permission bypass

**Status: FIXED AND VERIFIED** (local scope).

**Original vulnerability:** Invoice creation required INVOICE_CREATE but could also record an upfront payment without PAYMENT_COLLECT, allowing Doctors to bypass the collection endpoint’s permission.

**Modified files:** [src/billing/billing.service.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/billing/billing.service.ts>), [src/security/batch-1.security.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/security/batch-1.security.spec.ts>), [src/billing/billing.service.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/billing/billing.service.spec.ts>).

**Implemented fix:** Both direct invoice creation and treatment-plan invoice creation check PAYMENT_COLLECT whenever upfrontPayment is supplied, before accessing billing data. Existing permitted collection roles and platform administration remain supported.

**Executed proof:** 1 explicitly numbered regression/integration cases passed in the final run, plus the relevant existing service/authorization regressions included in the complete run.

- PASS — #7 denies embedded payment collection by a Doctor before any database access

**Remaining risks:** Permission policy remains the existing billing policy; this batch does not redesign payment-provider settlement or reconciliation.

**Manual verification:** Create an invoice as Doctor without an upfront payment and confirm success. Repeat with upfrontPayment through both invoice routes and expect 403. Repeat as Receptionist/Accountant and verify a single correctly attributed payment and balance.

## Finding #8 — Suspended, closed and read-only clinics

**Status: FIXED AND VERIFIED** (local scope).

**Original vulnerability:** TenantGuard checked only clinic assignment. Suspended/closed users could log in or refresh; READ_ONLY clinics could still write medical and operational records.

**Modified files:** [src/common/clinic-status.policy.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/common/clinic-status.policy.ts>), [src/common/guards/tenant.guard.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/common/guards/tenant.guard.ts>), [src/auth/auth.service.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/auth/auth.service.ts>), [src/subscriptions/subscriptions.controller.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/subscriptions/subscriptions.controller.ts>), [src/security/batch-1.authorization.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/security/batch-1.authorization.spec.ts>), [src/security/batch-1.postgres.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/security/batch-1.postgres.spec.ts>).

**Implemented fix:** A shared status policy blocks suspended/closed clinics at login, refresh and protected tenant routes, and blocks non-read HTTP operations for READ_ONLY clinics. Platform administrators retain recovery access; the real database test verifies authorized provisioning restores a synthetic suspended clinic to ACTIVE. Account-security endpoints remain available for legitimate account recovery/revocation.

**Executed proof:** 5 explicitly numbered regression/integration cases passed in the final run, plus the relevant existing service/authorization regressions included in the complete run.

- PASS — #8 allows read-only reads, blocks writes, and preserves platform recovery
- PASS — #8 denies SUSPENDED at login and refresh
- PASS — #8 denies CLOSED at login and refresh
- PASS — #6/#8 preserves authorized platform provisioning and clinic recovery
- PASS — #8 blocks read-only clinic writes

**Remaining risks:** Each protected tenant request adds a clinic-status lookup. Operator recovery actions remain privileged and should be audited under the separate audit-logging finding. No live clinic statuses or sessions were changed.

**Manual verification:** In a disposable tenant, switch ACTIVE→READ_ONLY and verify reads succeed while writes fail. Switch to SUSPENDED/CLOSED and verify login, refresh and data access fail. Use a separately authorized platform account to restore the tenant through provisioning; confirm normal access returns.

## Finding #9 — Multipart upload resource limits

**Status: FIXED AND VERIFIED** (local scope).

**Original vulnerability:** Uploads were buffered without Multer file/field/part limits, and antivirus ran before the late 25 MB size check.

**Modified files:** [src/storage/upload-limits.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/storage/upload-limits.ts>), [src/clinical/clinical.controller.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/clinical/clinical.controller.ts>), [src/storage/storage.service.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/storage/storage.service.ts>), [src/security/batch-1.storage.integration.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/security/batch-1.storage.integration.spec.ts>).

**Implemented fix:** Configured streaming multipart enforcement: 25 MB maximum file, one file, ten fields, eleven parts, 64 KiB per field, bounded field names and header pairs. Storage validates size/type before invoking antivirus.

**Executed proof:** 5 explicitly numbered regression/integration cases passed in the final run, plus the relevant existing service/authorization regressions included in the complete run.

- PASS — #9 rejects oversized content before invoking a scanner
- PASS — #9 rejects an oversized multipart file before calling document storage
- PASS — #9 bounds multipart files while allowing ordinary uploads
- PASS — #9 bounds multipart fields while allowing ordinary uploads
- PASS — #9 bounds multipart field size while allowing ordinary uploads

**Remaining risks:** These are per-request bounds, not a deployment-wide upload concurrency budget. Reverse-proxy and application resource budgets still need environment-specific configuration.

**Manual verification:** Upload a normal supported document. Then send a >25 MB file, two files, eleven fields and a >64 KiB field. Confirm 400/413 responses and that the document/storage service is not invoked for rejected multipart requests.

## Finding #10 — Fail-closed antivirus and ClamAV transport

**Status: FIXED AND VERIFIED** (local scope).

**Original vulnerability:** Required antivirus silently accepted heuristic-only scans when no adapter was configured. The ClamAV adapter never connected its socket.

**Modified files:** [src/storage/malware-scanner.service.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/storage/malware-scanner.service.ts>), [src/storage/storage.service.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/storage/storage.service.ts>), [src/security/batch-1.storage.integration.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/security/batch-1.storage.integration.spec.ts>), [src/security/batch-1.security.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/security/batch-1.security.spec.ts>).

**Implemented fix:** Required/production scanning rejects unavailable adapters. The adapter establishes the TCP connection, sends bounded INSTREAM frames with write completion/backpressure handling, strictly parses results, bounds response length, and enforces idle/absolute deadlines with socket cleanup. Required StorageService scanning also rejects a missing scanner dependency.

**Executed proof:** 8 explicitly numbered regression/integration cases passed in the final run, plus the relevant existing service/authorization regressions included in the complete run.

- PASS — #10 fails closed when required antivirus has no adapter
- PASS — #10 connects, streams INSTREAM frames and parses OK
- PASS — #10 connects, streams INSTREAM frames and parses Synthetic.Test FOUND
- PASS — #10 terminates a scanner that never responds
- PASS — #10 fails closed for invalid response
- PASS — #10 fails closed for oversized response
- PASS — #10 fails closed for closed connection
- PASS — #10 recognizes EICAR and accepts a clean document through the real daemon

**Remaining risks:** Real ClamAV verification used version 1.5.4 with an isolated test-only signature database. It proves daemon connectivity, clean acceptance and EICAR rejection, not the completeness or freshness of production malware definitions. Configure and monitor maintained production definitions before deployment.

**Manual verification:** Configure an isolated daemon, upload a clean supported document, and stream the harmless EICAR test through the adapter. Stop the daemon or remove its configuration with required scanning enabled; uploads must fail closed. Test an unresponsive daemon and verify requests finish within the configured deadline.

## Finding #11 — Strict content types and isolated previews

**Status: FIXED AND VERIFIED** (local scope).

**Original vulnerability:** Unknown bytes could inherit caller-selected active MIME types, including SVG disguised as XML. Preview could serve them inline or redirect outside the application’s response policy.

**Modified files:** [src/storage/storage.service.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/storage/storage.service.ts>), [src/storage/upload-limits.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/storage/upload-limits.ts>), [src/clinical/clinical.controller.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/clinical/clinical.controller.ts>), [src/clinical/clinical.service.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/clinical/clinical.service.ts>), [src/storage/storage.service.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/storage/storage.service.spec.ts>), [src/security/batch-1.storage.integration.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/security/batch-1.storage.integration.spec.ts>).

**Implemented fix:** Removed claimed-MIME fallback. Supported extensions must match content signatures/structural envelopes: PDF, PNG, JPEG, WebP, Part-10 DICOM, UTF-8 TXT and CSV. Unknown, mismatched and active SVG/XML/HTML content is rejected. Downloads revalidate legacy bytes. Previews remain on the backend rather than redirecting, use sandbox CSP without allow-same-origin/scripts, nosniff/no-store, and safe inline/attachment disposition.

**Executed proof:** 3 explicitly numbered regression/integration cases passed in the final run, plus the relevant existing service/authorization regressions included in the complete run.

- PASS — #11 rejects active SVG content disguised as XML
- PASS — #11 keeps previews on a sandboxed opaque origin and ignores redirects
- PASS — #11 round-trips allowed content through real local storage and rejects active/mismatched content

**Remaining risks:** Office/ZIP, raw DICOM without the Part-10 preamble, and unsupported formats now require a reviewed conversion/import path. Structural validation and antivirus are not full document disarm/reconstruction. Real local storage and HTTP headers were tested; live S3 bucket policy and browser/frontend preview rendering were not tested or changed.

**Manual verification:** Upload supported real files and confirm expected previews/downloads. Try SVG named XML, a PDF named PNG, arbitrary bytes named PDF, script-bearing PDF actions and unsupported ZIP/Office inputs; expect rejection. Verify preview?redirect=true remains sandboxed and cannot execute scripts or inherit the application origin. Review legacy imports in staging.

## Finding #12 — Inventory DTO validation and authenticated attribution

**Status: FIXED AND VERIFIED** (local scope).

**Original vulnerability:** Inventory update bodies used any/inline types; nested deduction quantities were unvalidated. String arithmetic could alter deductions and the client controlled audit attribution.

**Modified files:** [src/inventory/dto/confirm-deduction.dto.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/inventory/dto/confirm-deduction.dto.ts>), [src/inventory/dto/update-item.dto.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/inventory/dto/update-item.dto.ts>), [src/inventory/dto/update-batch.dto.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/inventory/dto/update-batch.dto.ts>), [src/inventory/inventory.controller.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/inventory/inventory.controller.ts>), [src/inventory/inventory.service.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/inventory/inventory.service.ts>), [src/inventory/inventory.controller.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/inventory/inventory.controller.spec.ts>), [src/inventory/inventory.service.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/inventory/inventory.service.spec.ts>).

**Implemented fix:** Added concrete update DTOs, nested transformation/validation, nonnegative bounded integer deduction quantities and an array bound. The controller passes authenticated context. Inventory audits use the authenticated actor ID, server-resolved doctor/patient names and tenant-validated references; client attribution strings are ignored. Service-level integer checks guard deductions too.

**Executed proof:** 2 explicitly numbered regression/integration cases passed in the final run, plus the relevant existing service/authorization regressions included in the complete run.

- PASS — #12 stores the authenticated actor, not client-supplied attribution
- PASS — #12 rejects string or negative nested deduction quantities

**Remaining risks:** Existing audit records with client attribution are retained unchanged. The confirmedBy display value is now a stable authenticated user ID; clients that assumed a free-text name should resolve its display name.

**Manual verification:** Submit string, negative and fractional quantities and unknown update properties; expect validation failure. Submit another employee’s confirmedBy/doctorName/patientName and verify stored attribution comes from server context. Try foreign patient, doctor, appointment and treatment identifiers; expect rejection.

## Finding #13 — Inventory concurrency and stock consistency

**Status: FIXED AND VERIFIED** (local scope).

**Original vulnerability:** Receipts, adjustments and deductions calculated absolute writes from stale reads; some writes were outside transactions. Oversized deductions silently clamped stock to zero.

**Modified files:** [src/common/transaction-locks.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/common/transaction-locks.ts>), [src/inventory/inventory.service.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/inventory/inventory.service.ts>), [src/inventory/inventory.service.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/inventory/inventory.service.spec.ts>), [src/security/batch-1.postgres.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/security/batch-1.postgres.spec.ts>).

**Implemented fix:** Receipt, batch update, adjustment and deletion now hold tenant-scoped item-row locks in a transaction. Multi-item deductions acquire locks in stable order, reject unknown/insufficient items and batches, and atomically commit counters plus audit. Existing operation-ID uniqueness/replay handling is preserved.

**Executed proof:** 3 explicitly numbered regression/integration cases passed in the final run, plus the relevant existing service/authorization regressions included in the complete run.

- PASS — #13 concurrent deductions cannot oversell or lose stock updates
- PASS — #13 concurrent receipts preserve batch and item totals
- PASS — #13 preserves concurrent stock adjustments

**Remaining risks:** Historical mismatched totals or duplicate batch numbers are not rewritten. All external stock writers must use the same locking protocol. Lock contention and multi-instance latency should be benchmarked in staging.

**Manual verification:** Using a disposable item with ten units, race two six-unit deductions; exactly one succeeds and both counters finish at four with one audit. Race +2/+3 adjustments and two +3 receipts and confirm totals. Retry an operation ID and verify no second deduction. Check the read-only compatibility queries before rollout.

## Finding #14 — Billing lifecycle concurrency

**Status: FIXED AND VERIFIED** (local scope).

**Original vulnerability:** Draft edits, issuance and voiding checked state before unguarded writes. Concurrent treatment-plan invoicing could bill the same item twice.

**Modified files:** [src/common/transaction-locks.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/common/transaction-locks.ts>), [src/billing/billing.service.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/billing/billing.service.ts>), [src/billing/billing.service.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/billing/billing.service.spec.ts>), [src/security/batch-1.postgres.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/security/batch-1.postgres.spec.ts>).

**Implemented fix:** Draft editing, issuance and voiding now lock the invoice before reading/validating state, sharing the existing payment-locking domain. Treatment items are locked in stable order and checked for active invoice reservations inside every relevant invoice-write transaction, including direct paths. Dedicated payment locking and idempotency/refund constraints remain intact.

**Executed proof:** 5 explicitly numbered regression/integration cases passed in the final run, plus the relevant existing service/authorization regressions included in the complete run.

- PASS — #14 serializes invoice voiding and payment collection
- PASS — #14 preserves payment idempotency and refund locking
- PASS — #14 issues a draft only once under simultaneous requests
- PASS — #14 cannot commit a stale draft edit after issuance
- PASS — #14 reserves a treatment item exactly once across simultaneous invoices

**Remaining risks:** Historical duplicate bills are flagged rather than auto-corrected. Non-application invoice writers must follow the reservation/locking protocol. No new database constraint was added; all application write paths are responsible for this protocol.

**Manual verification:** Race void versus collection, two issuance requests, a stale draft edit versus an uncommitted issuance, and two treatment-plan invoices for one item. Confirm a single valid outcome/reservation. Replay a payment idempotency key and refund it; verify one payment, one refund and correct final totals.

## Finding #15 — Clinical record finalization races

**Status: FIXED AND VERIFIED** (local scope).

**Original vulnerability:** Note/prescription updates read DRAFT before writing without a lock; finalization could commit first and a stale edit could subsequently alter finalized medical content.

**Modified files:** [src/common/transaction-locks.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/common/transaction-locks.ts>), [src/clinical-notes/clinical-notes.service.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/clinical-notes/clinical-notes.service.ts>), [src/prescriptions/prescriptions.service.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/prescriptions/prescriptions.service.ts>), [src/security/batch-1.postgres.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/security/batch-1.postgres.spec.ts>).

**Implemented fix:** Clinical-note editing/finalization and prescription editing/finalization/cancellation hold the same tenant-scoped record row lock through validation and mutation. Medication-item replacement stays in the same transaction. Once finalization wins, stale edits re-read FINALIZED and fail.

**Executed proof:** 2 explicitly numbered regression/integration cases passed in the final run, plus the relevant existing service/authorization regressions included in the complete run.

- PASS — #15 cannot edit ClinicalNote after concurrent finalization
- PASS — #15 cannot edit Prescription after concurrent finalization

**Remaining risks:** Direct SQL/import writers can bypass application locks and must preserve immutable-record policy. Existing finalized records were not rewritten.

**Manual verification:** In a disposable database, hold an uncommitted finalization while sending an edit from a second connection, then commit finalization. The edit must fail and original clinical content must remain. Repeat for notes and prescriptions. Verify permitted draft edits and finalized-note addenda still work.

## Migration and compatibility requirements

No Prisma schema or migration file changed. No deployment migration was generated or applied. The existing schema was initialized only inside the newly created disposable local test cluster. The fixes use existing keys and row locks; they do not need a production schema rollout.

[security/batch-1-preflight.sql](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/security/batch-1-preflight.sql>) contains operator-run read-only count queries for invalid invoice links, duplicate active treatment reservations, mismatched stock totals, duplicate batch numbers and negative stock. It was not run on production. Findings in existing data require a separate reviewed repair plan; this batch does not rewrite or delete them.

Compatibility changes requiring staging review: restricted role access; tenant raw subscription provisioning now requires a platform administrator; staff cannot impersonate a direct patient-signing channel; written acceptance requires evidenceDocumentId; unsupported upload formats are rejected; preview redirects are disabled; confirmedBy is an authenticated user ID; missing/invalid stored content fails content validation; suspended/read-only state changes take effect on subsequent tenant requests. Front-desk intake and authorized payment, refund, registration, refresh, staff management and clinical workflows passed relevant regressions.

## Git diff and modified-file manifest

45 batch paths were created or updated, including this report and the read-only preflight. Raw `git diff` also contains pre-existing Finding #1 and user/UI changes and must not be interpreted as a batch-only diff. No commit or staging operation was performed. Package manifests/lockfiles and Prisma schema/migrations were not changed.

The runtime storage ignore pattern was anchored to /storage/ because its previous unanchored form also hid src/storage. Four unchanged storage-support files (provider/interface/module files) therefore become visible to Git alongside the repaired source; generated runtime storage and test artifacts remain ignored.

- [.gitignore](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/.gitignore>)
- [scripts/create-platform-admin.mjs](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/scripts/create-platform-admin.mjs>)
- [src/auth/auth.service.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/auth/auth.service.ts>)
- [src/auth/auth.service.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/auth/auth.service.spec.ts>)
- [src/auth/jwt-access.security.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/auth/jwt-access.security.spec.ts>)
- [src/billing/billing.controller.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/billing/billing.controller.ts>)
- [src/billing/billing.service.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/billing/billing.service.ts>)
- [src/billing/billing.service.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/billing/billing.service.spec.ts>)
- [src/clinical-notes/clinical-notes.controller.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/clinical-notes/clinical-notes.controller.ts>)
- [src/clinical-notes/clinical-notes.service.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/clinical-notes/clinical-notes.service.ts>)
- [src/clinical/clinical.controller.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/clinical/clinical.controller.ts>)
- [src/clinical/clinical.service.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/clinical/clinical.service.ts>)
- [src/clinics/staff-management.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/clinics/staff-management.spec.ts>)
- [src/common/clinic-status.policy.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/common/clinic-status.policy.ts>)
- [src/common/decorators/operation-permission.decorator.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/common/decorators/operation-permission.decorator.ts>)
- [src/common/transaction-locks.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/common/transaction-locks.ts>)
- [src/common/guards/tenant.guard.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/common/guards/tenant.guard.ts>)
- [src/common/guards/tenant.guard.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/common/guards/tenant.guard.spec.ts>)
- [src/inventory/dto/confirm-deduction.dto.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/inventory/dto/confirm-deduction.dto.ts>)
- [src/inventory/dto/update-item.dto.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/inventory/dto/update-item.dto.ts>)
- [src/inventory/dto/update-batch.dto.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/inventory/dto/update-batch.dto.ts>)
- [src/inventory/inventory.controller.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/inventory/inventory.controller.ts>)
- [src/inventory/inventory.controller.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/inventory/inventory.controller.spec.ts>)
- [src/inventory/inventory.service.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/inventory/inventory.service.ts>)
- [src/inventory/inventory.service.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/inventory/inventory.service.spec.ts>)
- [src/patients/patients.controller.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/patients/patients.controller.ts>)
- [src/platform-admin/platform-admin.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/platform-admin/platform-admin.spec.ts>)
- [src/prescriptions/prescriptions.controller.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/prescriptions/prescriptions.controller.ts>)
- [src/prescriptions/prescriptions.service.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/prescriptions/prescriptions.service.ts>)
- [src/subscriptions/subscriptions.controller.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/subscriptions/subscriptions.controller.ts>)
- [src/subscriptions/subscriptions.service.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/subscriptions/subscriptions.service.ts>)
- [src/treatment-plans/dto/record-acceptance.dto.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/treatment-plans/dto/record-acceptance.dto.ts>)
- [src/treatment-plans/treatment-plans.service.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/treatment-plans/treatment-plans.service.ts>)
- [src/storage/malware-scanner.service.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/storage/malware-scanner.service.ts>)
- [src/storage/storage.service.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/storage/storage.service.ts>)
- [src/storage/storage.service.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/storage/storage.service.spec.ts>)
- [src/storage/upload-limits.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/storage/upload-limits.ts>)
- [src/security/batch-1.security.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/security/batch-1.security.spec.ts>)
- [src/security/batch-1.authorization.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/security/batch-1.authorization.spec.ts>)
- [src/security/batch-1.postgres.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/security/batch-1.postgres.spec.ts>)
- [src/security/batch-1.storage.integration.spec.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/src/security/batch-1.storage.integration.spec.ts>)
- [vitest.config.batch-1.ts](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/vitest.config.batch-1.ts>)
- [security/batch-1-preflight.sql](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/security/batch-1-preflight.sql>)
- [security/BATCH_1_REPORT.md](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/security/BATCH_1_REPORT.md>)
- [security/batch-1-verification.json](<C:/Users/user/Documents/White Matrix Files/doc matrix/Doc_matrix-main/Doc_matrix-main/backend/security/batch-1-verification.json>)

## Recommended next steps

1. Review the batch-only file manifest and operation policy with the product owner; preserve unrelated uncommitted work when staging.
2. Run the read-only compatibility inspection under an approved staging/production-read-only process and plan any historical-data repairs separately.
3. Provision maintained antivirus definitions and verify scanner availability, upload budgets and cloud/private-bucket settings in staging. Do not use the synthetic test database/signatures for production.
4. Perform the per-finding manual UI/API checks, especially intake, supported medical formats, consent evidence and browser previews. Benchmark lock contention against Neon-like latency and multiple application instances.
5. Roll out under a reviewed deployment plan. No production rollout or credential rotation was performed here. Findings outside #2–#15 remain for their assigned batch.

The disposable PostgreSQL and ClamAV services are stopped after verification; the test logs and synthetic data are retained only as local ignored artifacts. The downloaded portable scanner binaries/archive are removed after verification.
