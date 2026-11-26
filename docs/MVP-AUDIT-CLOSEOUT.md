# MVP audit implementation and release gates

Scope: remaining MVP audit fixes. Appearance changes remain reverted. Accounting integrations, automated WhatsApp and clinic websites remain roadmap work.

## Implemented

| Audit area | Result |
| --- | --- |
| Runtime packaging | Prisma Client is a production dependency; the production command points to `dist/main.js`. A non-root backend Dockerfile is supplied. A separate production-only install successfully imports Prisma and the compiled application. |
| Return navigation and dependencies | Return paths reject external origins, backslashes and control characters. Router, build tools and test tools were patched; both dependency trees were audited. |
| Persistence failures | Patient registration/edit, appointment rescheduling/cancellation and consumption confirmation expose persistence failures. A failed mutation rolls back its local state; the main dialogs await server confirmation. Context checks prevent old requests from restoring another session's state. |
| Doctor-owner access | Primary clinic owners require independently verified practitioner registration before clinical writing/prescribing. Platform verification is audited and revokes existing sessions. Admin access alone does not grant this capability. |
| Scheduling | Clinic timezone conversion, working hours, active practitioner checks and doctor/chair overlap checks run on the server. A clinic lock serializes competing bookings. Status-only updates do not revalidate historical booking hours. |
| Stock | An item and its opening batch are created atomically, with the stock total counted once. Later receipts are recorded as batches. Mutations recompute totals from batches under a lock. Existing mismatches are visible and block stock mutations pending reconciliation. |
| Schema consistency | The shared schema matches Prisma after the two additive migrations. Existing integration and tax columns are preserved. The unavailable original migration SQL is recorded as a pinned historical-source exception; its database record/checksum was not rewritten. |
| Consent and portability | Withdrawal calls the actual patient-consent endpoint and reports success only after persistence. Patient exports use an exact clinic-scoped identity. Clinic/patient archives include clinical, billing and consent records plus document binaries and SHA-256 checksums. Oversized/missing document downloads fail explicitly. Exports generate audit events. |
| Settings and catalogues | Extended settings and clinical configuration persist in PostgreSQL. Nested configuration is validated. Existing Service Price List and Expense Tracking routes are restored with API-aligned permissions. Custom procedures use the billing tariff catalogue; medicines, diagnoses and templates are available in clinical forms. A validated legacy-settings import script defaults to a read-only preview. |
| Recovery | Password recovery uses expiring, hashed, single-use tokens, an explicitly configured delivery adapter and session revocation. Unconfigured delivery returns an availability error instead of claiming an email was sent. |
| Honest operational status | Unverified PITR, encryption, retention and consent-hash assurances were removed. Record archives are distinguished from infrastructure backups. Dashboard time uses clinic timezone and chair cards derive from recorded assignments. |
| Platform operations | Platform admins can change clinic access with a recorded reason and independently verify/revoke doctor-owner access. Changes and evidence share a database transaction. Directory filters use the API client's correct query-parameter contract. |

## November 20 remediation

- Invoice printing escapes identifiers and all other free-text interpolations, isolates its opener and uses a script-blocking print-page CSP. An offline browser probe confirms that an injected identifier renders as text without executing.
- Tooth charts require exactly one matching patient ID or backend ID. Missing/ambiguous identities cannot open an editor; drafts reset when the patient changes. Saving requires practitioner capability and server confirmation.
- FDI teeth, supported conditions, nested batches and note lengths are validated. Chart changes and their attributed before/after history share a transaction. History is clinic/patient scoped, appears in the chart and is included in record exports. Earlier history is not invented.
- Treatment status changes await the API and expose rejection. Acceptance/rejection requires the dedicated evidence workflow. The UI no longer marks every procedure completed before server approval.
- Inventory item edits, deletion, batch receipts and adjustments wait for persistence. Rejected operations preserve local state and leave the dialog available for retry. Receipts into an existing lot merge quantities without duplicating its local entry.
- Patient registration allocates codes under a clinic row lock; simultaneous registrations have been checked on real isolated PostgreSQL.
- Public Google authentication buttons were removed; the simulated authentication function rejects use. Malformed successful login/registration responses cannot create synthetic production sessions.
- Saved clinic details supply invoice, prescription, clinical-note and treatment-plan letterheads. Live clinical printing waits for the profile and does not substitute a sample clinic on failure.
- Practitioner reports include verified doctor-owners and separate identically named practitioners using stable IDs.
- The affected Effect dependency is overridden to patched version 3.22.1; backend dependency auditing reports zero vulnerabilities.
- The Windows Defender adapter was exercised with clean content, harmless EICAR test content and a simulated scanner outage. Local Windows configuration requires the verified scanner. Linux deployment still needs its own configured scanner.

## Recorded verification

- Backend full unit/HTTP regression suite: **442 passed, one optional live ClamAV test skipped**. Unit suites explicitly isolate live scanner configuration.
- Fresh isolated PostgreSQL: **30 passed**, including concurrent patient registration, chart-history persistence/isolation, stock integrity, billing concurrency and authentication/session checks.
- Browser: **nine real UI/API/database checks passed**, including login, patient list, consent withdrawal, archive download, verified/revoked practitioner access, unknown-patient chart blocking and finalized prescription printing with saved letterhead.
- **Ten clinic workflows passed through real HTTP and isolated PostgreSQL.** These are API/database workflow checks, not a claim that every workflow was clicked through in the browser. The separate nine browser checks are listed above.
- Invoice injection: actual current template exercised in an offline browser; malicious identifiers rendered as text and no script executed.
- Frontend typecheck, frontend/backend production builds and backend lint passed. Backend lint still reports 77 warnings. Frontend build retains bundle-size/ineffective-dynamic-import warnings.
- Both dependency trees have zero reported vulnerabilities after the compatible Effect override.
- Shared database checks: no pending migrations, checksum mismatches, unfinished migrations or remaining stock discrepancies. Acknowledged missing historical source remains explicitly reported.
- Latest local encrypted backup: **35 application tables restored with matching row counts and content digests**, decryption integrity verified and migration/schema rehearsal passed. Recovery scripts preserve the original archive and narrowly remove provider-only column-version metadata when restoring to standard PostgreSQL.
- Object storage: generated random bytes uploaded, downloaded and hash-verified, then the exact probe was deleted. No clinical data was uploaded. Bucket versioning was reported as not enabled.

**Final frozen-code frontend run: 351 tests passed across 49 files, exit 0, with no failed assertions or unhandled runner errors.** Focused inventory and print/history regressions also passed; their overlapping counts are not added to the full-suite total.

## Verification commands

From the repository root:

```powershell
npm run typecheck
npm run build
npm test -- --maxWorkers=2
npm audit
```

From `backend`:

```powershell
npm run build
npm run lint
npm run test:unit -- --maxWorkers=2
node scripts/isolated-db.mjs --browser
node scripts/verify-invoice-print.mjs
node scripts/verify-windows-scanner.mjs
node --env-file=.env scripts/database-health.mjs
npm audit
```

The isolated database/browser harness validates its dedicated localhost address and uses synthetic data. It never uses the shared database for destructive tests. Browser verification builds into the ignored `.verification/browser-dist` directory. The Windows scanner verification requires an active Windows Defender installation.

## Shared release work completed

1. A verified encrypted local recovery point was established before applying the two additive migrations. Their application and subsequent schema-difference check succeeded. No reset, seed, `db push` or historical checksum rewriting was performed.
2. The valid legacy clinic-settings file was imported into the empty database settings record. Unknown synthetic clinic files were skipped and retained. Source settings files remain available.
3. The operator explicitly confirmed that batch quantities were physically verified and no genuine opening stock was missing from batches. Four stored counters were corrected in one transaction with row locks, exact expected-before checks and per-item before/after audit events. Batch quantities were preserved.
4. A fresh local encrypted recovery point was created after these changes and restored successfully. The encryption key remains in local environment configuration and is never included in the archive or chat output.

| SKU | Previous counter | Physically verified batch total / corrected counter |
| --- | ---: | ---: |
| SKU-1V03L | 139 | 75 |
| SKU-3PZN1 | 200 | 100 |
| SKU-9CTYV | 113 | 60 |
| SKU-40FTI | 200 | 100 |

The stock reconciliation script defaults to a read-only preview. Applying a stale plan fails atomically rather than overwriting newer quantities. The reviewed plan and audit IDs are retained in private verification artifacts.

## Remaining deployment decisions

- **Backups remain local at the user's explicit request.** No clinical database archive has been uploaded. Local restore verification does not establish offsite disaster recovery. Separate recovery-key custody, provider PITR/retention and the deployment's object-storage protection still require operator verification. No connected provider-management access was available for PITR inspection.
- **Password-reset delivery was explicitly skipped by the user.** The token workflow is implemented, but the delivery provider/public URL remain unconfigured. The API reports unavailability instead of claiming delivery. A pilot needs an agreed account-recovery procedure.
- **Production deployment remains separate.** The supplied Dockerfile has not been built because Docker is unavailable here. Configure/verify the deployment's own scanner, HTTPS/origins, persistent storage and log collection. Redis is required before operating multiple API instances.
- The original `20261117160000_accounting_integrations_foundation` SQL is still unavailable in the checked local/remote history. `backend/prisma/legacy-migrations.json` pins its existing checksum and requires the reconciliation migration. Retrieve the exact historical source when available; do not fabricate it or rewrite shared history.
- Historical local audit JSON/JSONL files remain retained; include them in the deployment's protected logging/recovery process.
- Large-dataset pagination, broader accessibility verification and granular platform-admin/support tooling remain follow-up work. Accounting, automated WhatsApp and clinic-website modules remain outside this MVP-fix batch.

This work has not committed, pushed or deployed the application.

## November 23 functional audit fixes

- Walk-ins now save a new patient through the API before saving the appointment. Both forms await confirmation, retain the form on failure and show an error. A confirmed patient remains available after an appointment failure so a retry does not create another patient. Ambiguous phone matches and a different name sharing an existing phone require resolution instead of silently selecting a patient.
- API calls have a 30-second default deadline, cancellation support and a timeout message that warns a save may already have completed. Refresh calls have a 15-second deadline; archive and patient-document downloads allow 120 seconds. A timed-out write is not automatically replayed.
- Patient CSV import requires a valid, reviewed date of birth, handles quoted CSV fields and stops before writes if duplicate checking fails. Age-only rows are rejected instead of inventing a January 1 birth date or defaulting to age 30. Registry export includes recorded birth dates. Historical demographic records have not been rewritten.
- Practitioner revenue uses an explicit appointment or treatment-plan link. Otherwise the invoice is reported as unassigned; patient/date matching no longer attributes it to potentially multiple practitioners.
- Patient lookup rejects conflicting internal-ID/patient-code matches rather than selecting an arbitrary record.

The existing database requires a birth date for new patients. New walk-ins therefore require a verified birth date; supporting unknown or approximate birth dates needs a separate data-model change.

Verification includes 443 backend tests passed (one optional live ClamAV check skipped), 31 isolated PostgreSQL tests, ten browser UI/API/database checks and ten HTTP/database clinic workflows. The browser checks include a newly registered walk-in surviving a reload. All database writes in these checks used synthetic data in isolated PostgreSQL. Frontend typecheck/build and backend build/lint passed; existing build/lint warnings remain. The full frontend suite recorded 358 passes and one timing failure waiting for the billing invoice drawer, after its invoice assertions had passed. All six billing tests passed in isolation. The drawer query now allows five seconds for navigation instead of its one-second default; final focused verification covers billing and all changed frontend workflows. This is not represented as an entirely green full-suite run.

Final focused frontend verification: **26 tests passed across five files**, covering billing, walk-in submission/retry, patient-ID generation, request deadlines/cancellation and CSV import reliability.

This batch does not close every broader audit recommendation. Database constraint coverage, large-dataset query work, recoverable document cleanup, deployment operations and historical migration-source recovery remain separate follow-up work. The user's deferral of email delivery and recovery/deployment configuration remains in effect. Backups remain local; this batch performs no shared-database migration or deployment.
