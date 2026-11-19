# Batch 1 staging review follow-up

> Latest compatibility results: [Batch 1 final compatibility report](BATCH_1_COMPATIBILITY_REPORT.md). The two TypeScript errors and two E2E fixture failures are resolved; 36 frontend cases and 404 backend cases passed, with one optional live ClamAV test unavailable. Earlier results below are historical.

Date: 2026-11-18. The four requested workflow/policy corrections have been implemented. The targeted tests pass, but the repository is **not fully green for staging**: the frontend still has two existing TypeScript errors and two existing demo-fixture test failures. No files were staged or committed, and no production resource was modified.

## Changes in this follow-up

Paths below are relative to the repository root. Existing unrelated working changes were preserved.

| Modified file | Change and purpose |
| --- | --- |
| `src/components/clinical/TreatmentPlanDetailsModal.tsx:45` | Uses patient document data for a same-patient Consent selector. Preserves the existing STAFF_RECORDED default. Removes patient-only DIGITAL_SIGNATURE/PATIENT_PORTAL options, requires evidence for WRITTEN_CONSENT, sends isStaffRecorded=true for both staff methods, and keeps the form open with a safe message if saving fails. |
| `src/services/clinicStore.ts:332` | Adds Identification/Referral document categories and evidenceDocumentId to the acceptance payload type. Acceptance waits for the API before changing local state and propagates rejection to the form. Existing demo mode remains available. |
| `src/pages/patients/PatientProfilePage.tsx:518` | Receptionist upload defaults to Identification and offers Identification, Consent and Referral. Other staff retain the existing clinical category choices. This UI restriction supplements backend enforcement. |
| `backend/src/common/decorators/operation-permission.decorator.ts:30` | Allows receptionist intake document operations and inventory.read. Document deletion, clinical chart access and all inventory mutations remain restricted. |
| `backend/src/clinical/clinical.controller.ts:50` | Passes the authenticated actor into every document upload/list/detail/signed-URL/download/preview service call. |
| `backend/src/clinical/clinical.service.ts:216` | Receptionist queries include the intake category allowlist alongside clinic/patient scope. Unauthorized upload categories are rejected before storage or database writes. Direct document IDs cannot bypass the category filter. Removes the unused catch binding, now at line 445. |
| `backend/src/common/services/audit-log.service.ts:120` | Explicitly marks the asynchronous webhook dispatch with void. The dispatch method already catches errors. This fixes the actual full-lint error without changing dispatch behavior. |
| `backend/src/security/batch-1.staging.spec.ts` | Adds 27 policy, upload-category, query-scope and controller actor-propagation regression cases. |
| `tests/treatmentPlanAcceptance.test.jsx` | Adds three staff acceptance form tests covering supported methods, evidence selection and save failure. |
| `tests/treatmentPlanAcceptanceStore.test.ts` | Adds two persistence tests: no optimistic acceptance before confirmation, and no local acceptance after API rejection. |
| `backend/security/BATCH_1_REPORT.md` | Links this current follow-up and distinguishes its results from the historical Batch 1 run. |
| `backend/security/batch-1-verification.json` | Preserves historical evidence and adds current follow-up results. |
| `backend/security/BATCH_1_STAGING_REVIEW.md` | This report. |

## Actual verification results

| Check | Result |
| --- | --- |
| Backend authentication, security and service regression run | **381 passed, 0 failed, 14 skipped**, 32 test files; exit 0. |
| Finding #1 authentication/configuration tests within that run | **62 passed, 0 failed** across six test files. |
| New staging backend regression cases | **27 passed, 0 failed** within the full run. |
| New frontend form/persistence tests | **5 passed, 0 failed**. |
| Broader seven-file frontend selection | **34 passed, 2 failed, 0 skipped**; exit 1. |
| Baseline comparison for failing frontend E2E file | **5 passed, the same 2 failed** using Git HEAD versions of the three changed frontend implementation files through a test-only transform; working source was not restored or reset. |
| Backend TypeScript | Passed; exit 0. |
| Frontend TypeScript | Failed with two existing errors, reproduced using Git HEAD source for the changed frontend implementation files. |
| Frontend Vite production build | Passed; exit 0, with existing chunk-size/mixed-import warnings. Output was placed in the ignored local test directory. |
| Full backend type-aware lint, src/ and test/ | **0 errors, 76 warnings**, exit 0. No max-warnings=0 claim is made. |
| git diff --check | Passed. |
| Finding #1 implementation preservation | All six pre-follow-up SHA-256 snapshots still match: local environment, environment example, JWT config, JWT strategy, session service and main bootstrap. |

The backend's first sandboxed run failed because local HTTP/TCP connections were denied with EACCES. The permitted rerun above passed. The 14 skips are **13 disposable PostgreSQL cases and one optional live ClamAV case**; those services were not restarted in this follow-up. The previous Batch 1 report records their earlier successful execution. The dedicated real-database auth test that could use configured remote credentials was excluded.

Commands, run from backend unless otherwise stated:

```text
node node_modules/vitest/vitest.mjs run src test/security-phase4-5.spec.ts --maxWorkers=2 --reporter=json --outputFile=.security-test/staging-backend-unrestricted.json
node node_modules/typescript/bin/tsc -p tsconfig.build.json --noEmit --incremental false
node node_modules/oxlint/bin/oxlint --type-aware src/ test/ --format json
```

From the repository root:

```text
node node_modules/vitest/vitest.mjs run tests/treatmentPlanAcceptance.test.jsx tests/treatmentPlanAcceptanceStore.test.ts tests/treatmentPlanFailureRecovery.test.jsx tests/patientDocumentsStorage.test.jsx tests/treatmentPlansPhase1Features.test.jsx tests/treatmentPlansPhase2To6Integration.test.jsx tests/treatmentPlansE2EWorkflow.test.jsx --maxWorkers=2 --minWorkers=1 --reporter=json --outputFile=backend/.security-test/staging-frontend.json
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vite/bin/vite.js build --outDir backend/.security-test/frontend-dist
git diff --check
```

Detailed local runner output is retained under ignored `backend/.security-test/`: staging-backend-unrestricted.json, staging-frontend.json, staging-frontend-head-baseline.json, frontend-head-typescript.json and staging-lint-final.json. The original denied backend run is also retained as staging-backend.json; it is not the successful rerun evidence.

## Corrections to the supplied review

- The original catch binding was a lint warning in this configuration. The full lint error was the floating audit-log promise, now resolved. The earlier count of 30 warnings applied to the scoped Batch 1 lint command, not the entire backend. Current full lint has 76 warnings.
- Locks use PostgreSQL SELECT FOR UPDATE row locks. There is no pg_advisory_xact_lock/crc32 implementation. Sorted row-lock acquisition reduces contention hazards, but does not establish that every possible transaction combination is deadlock-free.
- Real PostgreSQL concurrency tests, real HTTP multipart tests, a real local-storage round trip, and an optional real ClamAV clean/EICAR test exist. The previous verification ran those live services locally. This does not establish automated live-engine CI coverage or multi-process load coverage.
- Live S3/MinIO behavior and browser-level preview rendering remain unverified by this follow-up.
- STAFF_RECORDED was already the frontend default. Staff verbal acceptance was not universally broken; written evidence and the unsupported selectable methods were the confirmed incompatibilities.
- JWT/session implementation preservation was checked against pre-follow-up working-tree snapshots. A diff against Git HEAD is not a valid unchanged check for already-uncommitted Finding #1 remediation.

## Remaining staging blockers and limits

1. Frontend TypeScript: `src/pages/billing/BillingShared.tsx:196` accesses a missing TreatmentPlanRecord.patientName property; `src/services/clinicStore.ts:571` references undefined ToothCondition. Both reproduce with baseline source and were left outside this focused follow-up.
2. Existing `tests/treatmentPlansE2EWorkflow.test.jsx` workflows 1 and 6 require absent demo patient pt-1001/Meera Nambiar and fail both before and after this follow-up. Fix their fixtures separately; do not restore patient seed data to production merely to satisfy tests.
3. The 76 lint warnings remain; a separate max-warnings=0 CI policy would still fail.
4. Staging must supply maintained antivirus definitions and validate real private cloud storage, live service configuration and deployment behavior. This follow-up did not run load tests, production migrations or production credential/session changes.
5. Legacy documents filed under Other are not automatically treated as intake documents. Review and reclassify approved historical intake records separately. Category checks limit the stored category, not the clinical meaning of arbitrary file contents.
6. Office documents and preamble-less DICOM remain subject to the existing strict file policy; no converters or format-policy relaxation were added.

## Manual verification in an approved local/staging environment

1. Sign in as Doctor/Organization Admin/Branch Admin, open a proposed plan, and record STAFF_RECORDED acceptance. Confirm success persists after reload and is attributed to staff.
2. Upload a signed Consent document for the same patient. Select WRITTEN_CONSENT in the acceptance dialog, select that document, and confirm the request includes its ID and isStaffRecorded=true. Another patient's consent and non-Consent documents must not be selectable. Missing evidence must block submission.
3. Force an API rejection (for example, a stale plan version). Confirm the form stays open and the plan remains unaccepted locally and after reload.
4. Sign in as Receptionist. Upload/view Identification, Consent and Referral documents. Try Radiology/Prescription uploads directly through the API: expect 403. Lists must omit clinical categories; direct detail, signed URL, preview and download requests for a disallowed or foreign-tenant document must fail before any file is returned.
5. As Receptionist, view inventory items/movements. Attempt item creation/edit/deletion, receipts, batch edits, adjustments and deductions: all must return 403. Confirm a Doctor still sees permitted clinical documents.
6. Repeat with a suspended/read-only clinic and verify the existing clinic-status policy still applies. Re-run the live disposable PostgreSQL and ClamAV suites when those staging services are provisioned.
