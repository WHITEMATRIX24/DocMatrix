# Batch 1 final compatibility fixes

Date: 2026-11-18. Scope: the two frontend TypeScript errors and two existing treatment-plan workflow fixture failures identified in the staging review. No backend implementation, environment file, role matrix, schema, migration, dependency or production seed was changed. Nothing was staged, committed or deployed.

## Root causes and changes

| Issue | Root cause | Fix |
| --- | --- | --- |
| BillingShared.tsx used TreatmentPlanRecord.patientName | The current plan domain stores patientId, but the billing helper retained an obsolete display-name fallback. Names also cannot establish patient identity reliably. | Match plans to appointments using their existing patientId fields. No property, unsafe any, or placeholder value was added to the domain type. Two regression cases verify valid ID matching and rejection of a different patient's plan. |
| clinicStore.ts referenced undefined ToothCondition | An unused legacy initialToothConditions array survived the move to the active ClinicToothCharts/PatientToothChartMap model. There were no consumers of the array. | Remove the obsolete declaration. Keep the existing typed chart state and chart behavior. |
| E2E workflow 1 lacked its locked patient | resetStoreForTesting resets to empty initial patient data; the test assumed pt-1001 / Meera Nambiar was globally seeded. | Define a complete PatientRecord test fixture and hydrate the test browser store using saveToStorage and initClinicSession before each workflow. Keep the existing assertions. |
| E2E workflow 6 displayed a missing-patient profile | The same absent patient prevented the profile from rendering the treatment-plan quick action. | Use the same isolated fixture setup, clear browser storage before each test, and reset store/storage afterward. No production data or seed changes. |

## Exact repository files changed in this task

1. `src/pages/billing/BillingShared.tsx` — remove the obsolete patient-name association fallback.
2. `src/services/clinicStore.ts` — remove the unused, undefined ToothCondition array declaration; preserve all prior uncommitted changes.
3. `tests/treatmentPlansE2EWorkflow.test.jsx` — add the patient fixture, browser-store hydration and cleanup.
4. `tests/billingPatientPlanMatching.test.ts` — add two domain-typed billing association regression cases.
5. `backend/security/BATCH_1_COMPATIBILITY_REPORT.md` — this report.
6. `backend/security/BATCH_1_REPORT.md` — add a link to current compatibility results; preserve historical audit evidence.
7. `backend/security/BATCH_1_STAGING_REVIEW.md` — add the same current-results link; preserve the earlier findings and results.
8. `backend/security/batch-1-verification.json` — append this task's verification results without replacing historical counts.

Ignored local verification artifacts were also created under `backend/.security-test/`: working-tree hashes, runner reports, the frontend build output, and a test-only backend runner configuration/setup. These are local evidence and are not intended for staging or committing.

## Verification results

| Check | Passed | Failed | Skipped / filtered | Result |
| --- | ---: | ---: | ---: | --- |
| Frontend TypeScript | — | 0 | — | Exit 0 |
| Previously failing workflows 1 and 6 | 2 | 0 | 5 filtered by test-name selection | Exit 0 |
| Required seven-file frontend selection | 36 | 0 | 0 | Exit 0; includes all seven E2E workflows |
| Additional billing regression selection | 7 | 0 | 0 | Exit 0; includes the two new association cases |
| Frontend production build | — | 0 | — | Exit 0; mixed static/dynamic imports and chunk-size warnings remain |
| Complete backend suite | 404 | 0 | 1 optional live ClamAV case | Exit 0; all 33 spec files included |
| Isolated authentication diagnostic run | 15 | 0 | 0 | Exit 0; five JWT startup and ten real PostgreSQL auth/session cases |
| Backend TypeScript | — | 0 | — | Exit 0 |
| Prisma validation | — | 0 | — | Existing schema valid; exit 0 |
| git diff --check | — | 0 | — | Exit 0 |

An initial complete backend run under concurrent verification load recorded 392 passed, 2 failed and 11 skipped, with the real-database auth suite also incomplete. The unchanged auth/startup files then passed all 15 cases in isolation. The full serial rerun passed 404 cases with zero failures and one optional skip, without changing backend source or assertions. The initial run is retained and is not represented as successful. An initial frontend build was deliberately stopped to reduce concurrent memory use; its subsequent complete run passed.

## Executed commands

From the repository root:

```text
node node_modules/typescript/bin/tsc --noEmit
node node_modules/vitest/vitest.mjs run tests/treatmentPlansE2EWorkflow.test.jsx -t 'Workflow (1|6):' --maxWorkers=2 --minWorkers=1 --reporter=json --outputFile=backend/.security-test/compatibility-two-workflows.json
node node_modules/vitest/vitest.mjs run tests/treatmentPlanAcceptance.test.jsx tests/treatmentPlanAcceptanceStore.test.ts tests/treatmentPlanFailureRecovery.test.jsx tests/patientDocumentsStorage.test.jsx tests/treatmentPlansPhase1Features.test.jsx tests/treatmentPlansPhase2To6Integration.test.jsx tests/treatmentPlansE2EWorkflow.test.jsx --maxWorkers=2 --minWorkers=1 --reporter=json --outputFile=backend/.security-test/compatibility-frontend-seven.json
node node_modules/vitest/vitest.mjs run tests/billingPatientPlanMatching.test.ts tests/appointmentToBillingTreatment.test.jsx --maxWorkers=2 --minWorkers=1 --reporter=json --outputFile=backend/.security-test/compatibility-billing.json
node node_modules/vite/bin/vite.js build --outDir backend/.security-test/compatibility-frontend-dist --logLevel warn
git diff --check
```

From backend:

```text
node node_modules/vitest/vitest.mjs run --config .security-test/compatibility.config.mjs --reporter=json --outputFile=.security-test/compatibility-backend-complete.json
node node_modules/vitest/vitest.mjs run test/auth-real-postgres.spec.ts src/auth/jwt-startup.spec.ts --config .security-test/compatibility.config.mjs --maxWorkers=1 --reporter=default --reporter=json --outputFile.json=.security-test/compatibility-auth-diagnostic.json
node node_modules/vitest/vitest.mjs run --config .security-test/compatibility.config.mjs --maxWorkers=1 --reporter=json --outputFile=.security-test/compatibility-backend-final.json
node node_modules/typescript/bin/tsc -p tsconfig.build.json --noEmit --incremental false
node node_modules/prisma/build/index.js validate
```

The test-only backend configuration includes every spec under src/ and test/ (33 files), excluding ignored historical source copies. It does not omit the legacy real-database authentication suite. That suite reads TEST_DATABASE_URL directly from .env, so the ignored runner setup substitutes that filesystem read inside test workers with the disposable localhost URL and supplies a process-only random signing key. The actual .env is never changed, and no application/test source or assertion is altered by the runner. All other filesystem reads pass through normally.

The existing disposable PostgreSQL cluster was started on 127.0.0.1:55439 using its already provisioned batch1_security schema and dedicated synthetic user. No schema creation, db push or migration was necessary. No configured Neon resource was used. ClamAV was not installed/running locally, so its optional live-engine case must remain explicitly skipped. The emulated protocol and fail-closed scanner tests are separate from that live test. The disposable PostgreSQL cluster was stopped again after verification.

## Security preservation and remaining gates

A SHA-256 content snapshot was taken before editing and compared afterward. All backend implementation files, backend tests, JWT/session files, .env/.env.example, role permissions, file validation/antivirus rules, consent requirements, transaction locks, schema and existing migration files remain byte-for-byte unchanged. Existing unrelated working-tree changes were preserved. The only frontend production changes are patient association by ID and removal of unused code.

All four compatibility issues are resolved and the required local compatibility checks passed. The complete backend run includes 13 passing dedicated PostgreSQL security/concurrency cases and 10 passing real-database authentication/session cases. The single optional live ClamAV test was unavailable, not passed. There are no remaining blockers from the four requested compatibility issues; this is not an unconditional staging or production readiness approval. The existing deployment gates still apply: live antivirus availability/maintained definitions, private cloud storage checks, browser-level preview validation, CI configuration and deployment/load behavior. Historical lint and build warnings are not claimed to have been eliminated. No production deployment approval is implied by these compatibility fixes.
