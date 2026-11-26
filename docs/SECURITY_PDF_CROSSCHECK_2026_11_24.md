# DocMatrix security checklist crosscheck

Review date: 24 November 2026. **The full checklist is not satisfied.** Substantial application protections exist, but production configuration, operational evidence, several resource limits, and a newly reported dependency advisory remain open.

This review compares all 76 controls in the supplied *Vibe Coded App Security Checklist* and the ten phases and release gate in the *Vibe Coded App Security Guide* with the active application at `Doc_matrix-main/Doc_matrix-main`. The stack is React/Vite with NestJS, Prisma and PostgreSQL. MongoDB requirements are mapped to equivalent PostgreSQL controls. Retail crawler and product-matching examples do not apply to this clinical application.

The PDFs are assessment references. Their sample prompts, implementation instructions and sign-off checkboxes do not authorize code changes, migrations, credential rotation or deployment. This review makes no application changes. Archived `DocMatrix`, backup and imported prototypes are not accepted as the deployable application.

## Assessment status

- **C — Code supported:** implementation found in current source. This is not a claim that the deployed environment passed a penetration test.
- **P — Partial:** an identified code or coverage gap prevents marking the complete control satisfied.
- **V — Verify externally:** provider settings, operating procedures, review approvals or deployed behavior need evidence.
- **N — Not applicable:** no corresponding feature exists in the reviewed application.

Existing reports describe earlier snapshots. For example, the earlier missing-MFA and missing-global-authentication findings are superseded by current source. Conversely, the previous zero-advisory frontend result is superseded by today's npm result.

Across the 76 checklist controls: **36 have code support, 24 are partial, 15 need external verification, and 1 is not applicable.** These are evidence categories, not a security score or a production compliance percentage.

## Open findings

| ID | Priority | Evidence and implication | Completion requirement |
| --- | --- | --- | --- |
| F01 | High deployment dependency | Production startup validation requires Redis, HTTPS app/reset/audit endpoints, encryption configuration, object storage and ClamAV. The retained 23 November provider preflight failed Redis, app/reset delivery, audit collector, ClamAV and bucket-policy verification. This is historical local-environment evidence, not a fresh observation of hosted production. | Configure and verify the intended production services. Confirm actual email delivery, MFA setup and recovery, Redis outage behavior, scanner health and audit delivery. |
| F02 | High operational dependency | `docs/SECURITY_HARDENING_IMPLEMENTATION.md` records removal of copied archive secrets, but explicitly states provider credentials still require coordinated rotation. File removal does not invalidate a credential. | Rotate applicable credentials, update consumers and prove old credentials are revoked. Verify separate production/development identities and least privilege. No public credential leak is established by this review. |
| F03 | High assurance gap | Bucket public access, encryption policy, cloud IAM, database network restrictions and application-role privileges are not established by application code. | Obtain provider evidence and negative access tests. Separate migration/backup roles from the running application. |
| F04 | Medium | `backend/src/patients/patients.service.ts` calls `patient.findMany` without a top-level `take`; `PatientQueryDto` has no pagination ceiling. Clinical document listings also return the complete matching collection. Global request throttling does not bound work or response size per request. | Add bounded pagination and appropriate query/date/export budgets, preserving frontend synchronization behavior. |
| F05 | Medium | Frontend npm audit reports one moderate direct `i18next` advisory, GHSA-6jcc-5g8w-32mx, affecting versions below 26.3.4. Current frontend manifest uses `^24.2.3`. Backend audit reports zero advisories. npm offers a major-version update; no automatic fix was applied. | Review the advisory's reachability, select a compatible patched version and run localization/regression tests. `npm audit --audit-level=low` currently makes the committed CI gate fail. |
| F06 | Medium defense in depth | `PatientProfilePage.tsx` download failure falls back to `window.open(doc.url, '_blank')` without validating that fallback URL. Normal backend serialization constructs document paths and signed URLs, and the document DTO rejects an arbitrary `url` field. An attacker-controlled URL reaching this sink is not demonstrated. | Validate schemes/origins for all document fallbacks and eliminate arbitrary navigation. Align downloads with the production API resolver; this component still independently defaults to localhost. |
| F07 | Medium | `ClinicalService` retains a storage-service-absent branch that writes directly to disk without the main size/type/scanner pipeline. The active application imports StorageModule, so this is a latent alternate-construction risk, not a confirmed live bypass. | Require StorageService or explicitly fail closed outside test fixtures. |
| F08 | Medium operational dependency | Recovery and security workflows exist, but hosted execution, required branch checks, recovery secrets and environment restrictions are unverified. Database recovery tooling does not itself back up clinical document binaries. | Prove CI execution/enforcement, scheduled encrypted offsite backups, independent key custody and a full database-plus-documents restore. |
| F09 | Medium operational gap | Logging and retrying collector delivery exist. No completed, tested incident procedure with escalation, containment, rotation and emergency access was found; alert thresholds/delivery for 401/403/429 spikes remain unverified. | Assign responders and owners, document and exercise the procedure, and test actual alert delivery. |
| F10 | Medium assurance gap | Reset responses use generic text, including delivery failures. Login uses generic wrong-credential errors, but nonexistent users return before bcrypt while existing users invoke bcrypt. Strict timing resistance is therefore incomplete. Registration also explicitly returns an existing-email conflict, an adjacent enumeration surface beyond the checklist's login/reset wording. | Consider a dummy password verification path and a consistent public registration policy. Use asynchronous reset delivery if timing confidentiality is required. |

Priorities reflect this application's patient-data sensitivity. An assurance gap or missing control is not automatically an exploitable vulnerability.

## Authentication and account security

| ID | Checklist control | Status | Current evidence or remaining work |
| --- | --- | --- | --- |
| 01.1 | Password hashing | C | `auth.service.ts`, `password-recovery.service.ts`, `password.policy.ts`: bcrypt, new-password policy of at least 12 characters and at most 72 UTF-8 bytes. |
| 01.2 | Login throttling and brute-force defenses | C | Global `RateLimitGuard`; IP/account counters in `rate-limiter.service.ts`; production requires Redis and fails closed. Operating Redis is F01. |
| 01.3 | Token verification on protected requests | C | `auth.module.ts` installs global JwtAuthGuard; `jwt.strategy.ts` pins the algorithm and checks current user and live owned session. |
| 01.4 | Expiring access and revocable refresh tokens | C | `jwt.config.ts`, `session.service.ts`, `session.policy.ts`: access expiry, hashed rotating refresh tokens, replay detection, idle and absolute lifetime. |
| 01.5 | Logout invalidates session | C | `auth.service.ts`: signed-token ownership and refresh-token revocation. |
| 01.6 | Secure single-use password reset | C | Hashed random token, 30-minute expiry, transactional consumption and session revocation in `password-recovery.service.ts`. Delivery readiness is F01. |
| 01.7 | Administrator MFA support | C | `mfa.service.ts`: encrypted TOTP, replay checks, single-use recovery codes; production account scope requires privileged MFA before record access. |
| 01.8 | Login/reset do not reveal account existence | P | Generic error/reset text implemented; timing paths differ. See F10. |

## Authorization and access control

| ID | Checklist control | Status | Current evidence or remaining work |
| --- | --- | --- | --- |
| 02.1 | Backend authorization for every private endpoint | C | Global JWT guard plus tenant/role/operation guards on reviewed controllers. Exhaustive deployed-route negative testing remains a release requirement. |
| 02.2 | Real backend admin privileges | C | `platform-admin.controller.ts`, `roles.guard.ts`, strategy reload of current database identity. |
| 02.3 | Resource ID changes cannot cross users/tenants | C | Tenant-scoped query conditions and ownership checks; `clinic-role-access.spec.ts`, `batch-1.authorization.spec.ts`, `tenant.guard.spec.ts`. |
| 02.4 | Object ownership on reads/writes | C | Patient resolution, related-resource checks, document key policy and clinic-scoped feature services. Within-clinic access follows staff role permissions, not creator-only ownership. |
| 02.5 | Least privilege for sensitive actions | C | Operation permissions, billing permissions, staff hierarchy, practitioner verification and receptionist document restrictions. Cloud least privilege is assessed separately. |
| 02.6 | Frontend guards do not replace backend checks | C | Controllers and services enforce permissions independently of frontend state. |
| 02.7 | Bulk operations enforce authorization | C | Clinical bulk routes require operations; batch services resolve tenant-owned records; inventory/billing/clinical security tests cover negative cases. Not every possible mixed batch was exercised anew. |
| 02.8 | New endpoints default deny | C | Global JwtAuthGuard in `auth.module.ts`; explicit `@Public()` opt-outs. New operations still need their appropriate tenant/function permissions. |

## API and backend security

| ID | Checklist control | Status | Current evidence or remaining work |
| --- | --- | --- | --- |
| 03.1 | Strict input schemas | C | Global ValidationPipe with whitelist, transformation and rejection of unknown fields; class-validator DTOs. This is the stack's equivalent of Zod/Joi. |
| 03.2 | No untrusted MongoDB operators | C | PostgreSQL/Prisma equivalent: explicit query construction and parameterized SQL; MongoDB selectors are not used. |
| 03.3 | Body, pagination and upload caps | P | Multipart/upload caps exist; pagination/result budgets are incomplete. See F04. Explicit JSON budget and oversized-request behavior need release verification. |
| 03.4 | Authentication/write/search/expensive-route rate limits | P | Global throttle and stricter auth limits exist; per-operation resource budgets remain incomplete, especially unbounded list/report work. |
| 03.5 | Intended CORS origins and methods | C | Exact-origin allowlist and method/header restrictions in `common/config/cors.config.ts`; production startup requires HTTPS origins. |
| 03.6 | Cookie CSRF protection | C | Refresh/logout require an approved custom header and check supplied origin. Other protected operations use bearer authentication. |
| 03.7 | Safe production error responses | C | `all-exceptions.filter.ts` masks unexpected/database failures; detailed diagnostics remain server-side. |
| 03.8 | SSRF defenses | P | No general user-controlled crawler/fetch endpoint found. Configured reset/email/audit fetches use trusted configuration, but no general private-address/DNS/redirect defense exists. HTTPS validation alone is not SSRF protection. |
| 03.9 | Security headers | C | Helmet in `main.ts`; frontend headers in `vercel.json`. Actual deployed headers need verification. |

## Database and data protection

| ID | Checklist control | Status | Current evidence or remaining work |
| --- | --- | --- | --- |
| 04.1 | Restricted database network access | V | PostgreSQL equivalent requires provider/network evidence. F03. |
| 04.2 | Minimum application database privileges | V | Application/migration/backup grants must be checked at the provider. F03. |
| 04.3 | No production DB credentials in Git/client | P | Ignore rules and tracked-file scan exist; scan passed today. The scanner has limited patterns and covers current tracked files, not complete Git history or every possible client secret. Archive removal/rotation remains F02. |
| 04.4 | Minimized and protected sensitive data | P | Browser tokens/clinic cache use memory adapters; no-store API defaults, role-aware output, retention/legal holds exist. At-rest protection, full data-minimization review and unbounded list returns remain open. |
| 04.5 | Configured backups and tested restore | P | Encrypted archive/isolated recovery tooling and prior local restore evidence exist; scheduled hosted operation and full document recovery remain F08. |
| 04.6 | Ownership, references and business constraints | C | Clinic-scoped queries, foreign keys, transactions, integrity tests and clinical governance checks in backend services/migrations. |
| 04.7 | Destructive safeguards and audit | C | Role/operation checks, billing/stock invariants, consent revisions/revocation, request auditing and append-only audit triggers. Independent protection from DB owners needs deployment controls. |
| 04.8 | Encrypted access-controlled backups | P | AES-256-GCM scripts and separate backup identity variables exist; destination IAM, retention and independent key custody are unverified. |

## Frontend security

| ID | Checklist control | Status | Current evidence or remaining work |
| --- | --- | --- | --- |
| 05.1 | No server secrets in client bundle | P | Client API configuration contains no intended privileged credentials; tracked scan passed. A narrow scan of 158 existing built JavaScript assets found no private-key blocks, credential-bearing PostgreSQL URLs or AWS access-key patterns. Build freshness, other secret formats and full credential inventory remain unverified. |
| 05.2 | Avoid or sanitize unsafe HTML | C | No `dangerouslySetInnerHTML` use found in application source. Invoice `document.write` path escapes text and includes a script-blocking CSP. |
| 05.3 | Authorization independent of React state | C | Backend JWT/tenant/role/operation guards. |
| 05.4 | Validate untrusted navigation URLs | P | `App.jsx:getSafeNextPath` restricts login redirects; document fallback remains F06. |
| 05.5 | Appropriate CSP deployed | P | Frontend CSP is configured in `vercel.json`; actual host enforcement and workflow compatibility require deployed testing. `connect-src https:` is broad and should be reviewed against actual provider origins. |
| 05.6 | Avoid unnecessary browser/log auth storage | C | `browserStorage.ts` keeps sensitive values in memory and purges legacy native storage; HttpOnly refresh cookie; dedicated browser-storage regression tests. |
| 05.7 | Review third-party scripts and embeds | V | Fonts/external imagery and imported UI assets exist; no signed review/inventory of all production external resources was provided. |

## Secrets and infrastructure

| ID | Checklist control | Status | Current evidence or remaining work |
| --- | --- | --- | --- |
| 06.1 | Server-side configuration or secret manager | C | Backend environment configuration; production startup rejects missing essentials. Hosted secret access/management remains external. |
| 06.2 | Ignore environment files and private keys | P | `.env*` ignored except examples and Docker excludes environment files; tracked scan detects key blocks. No universal private-key extension ignore rule or exhaustive history scan is established. |
| 06.3 | Revoke/rotate previously exposed secrets | V | Archive removal documented; provider revocation/rotation not proved. F02. |
| 06.4 | Enforce production HTTPS | P | Secure cookie/HSTS and configured HTTPS endpoints exist; live HTTP redirect, certificate/proxy behavior and host enforcement need verification. |
| 06.5 | Separate development/production identities | V | Requires provider resource and credential inventory. |
| 06.6 | Cloud/storage/hosting least privilege | V | Requires cloud policies and effective access tests. F03. |
| 06.7 | No public internal/debug tools | P | Global authentication and prototype archive blockers exist. Public health/plans are intentional; hosted open ports, debug exposure and deployment artifacts need inspection. |
| 06.8 | Runtime/OS/infrastructure updates | V | Docker configuration and image scan workflow exist; patch ownership, host updates and scheduled remediation evidence are needed. |

## Dependencies and AI generated code

| ID | Checklist control | Status | Current evidence or remaining work |
| --- | --- | --- | --- |
| 07.1 | Review dependency vulnerability reports | C | Fresh npm audit executed for both manifests; frontend 1 moderate, backend 0. |
| 07.2 | Fix or assess critical/high advisories | C | No high/critical entries returned in today's two primary-application audits. Moderate F05 remains; this is not proof of no application vulnerability. |
| 07.3 | Track/review dependencies and lockfiles | P | Committed lockfiles and `npm ci --ignore-scripts` workflow exist; enforced reviewer approval is unverified. |
| 07.4 | Human review of security-critical generated code | V | Test files and history do not prove independent human approval. |
| 07.5 | Remove unused/debug/experimental code | P | Archived copies reject common install/build/start commands, but prototype/imported code remains in the workspace. No complete unused-code review established. |
| 07.6 | Review install/build/generated commands | P | CI uses deterministic installs with scripts disabled and explicit generation/build steps. No completed independent review of all dependency lifecycle scripts established. |
| 07.7 | Limit agents' production credentials | V | Requires agent/CI/service account policies and secret-access inventory. Local environment secrets alone do not establish their necessity or production status. |
| 07.8 | Treat repository/tool text as untrusted | P | Applied to the supplied documents during this assessment; an enforced team/agent workflow and training evidence are not established by application code. |

## Uploads and external integrations

| ID | Checklist control | Status | Current evidence or remaining work |
| --- | --- | --- | --- |
| 08.1 | Authorized uploads with size/type restrictions | C | Document operation/tenant checks, multipart limits, 25 MB storage limit and allowed format validation. F07 is a latent alternate-construction concern. |
| 08.2 | Safe names and no server execution | C | Sanitized names, randomized scoped storage keys and object storage; no uploaded-code execution path found. Hosting execution policy needs external verification. |
| 08.3 | Inspect file content | C | MIME/extension/content checks and fail-closed production scanner in storage pipeline. |
| 08.4 | Private buckets and uploads | V | Authorized application endpoints and short-lived signed URLs exist; effective bucket ACL/policy cannot be inferred from them. |
| 08.5 | Signed replay-protected inbound webhooks | N | No inbound payment/integration webhook handler identified. Outbound audit delivery uses bearer authentication and idempotency keys, not an inbound signature verifier. Reassess before adding one. |
| 08.6 | Narrow third-party API key scopes | V | Requires provider-side effective permission evidence. |
| 08.7 | Email/notification abuse prevention | P | Auth throttles and authenticated verification requests exist; real delivery service quotas, retries, recipient abuse controls and timing require provider tests. |

## Monitoring logging and recovery

| ID | Checklist control | Status | Current evidence or remaining work |
| --- | --- | --- | --- |
| 09.1 | Log failed logins/suspicious attempts | C | Auth failure events and global 401/403/429 logging/auditing; include synthetic unknown-account attempts in collector acceptance tests. |
| 09.2 | Audit admin/destructive actions | C | Global request interceptor, denial filter, database audit events and append-only trigger migration. |
| 09.3 | No secrets/passwords/tokens in logs | P | Audit metadata redaction and no request bodies in request interceptor exist; complete production log review and free-text/error redaction assurance are still needed. |
| 09.4 | Alerts for unusual access/error spikes | V | Events/outbox exist; thresholds, monitoring service and actual alert receipt unverified. F09. |
| 09.5 | Incident response including containment/rotation | P | Remediation notes exist; complete exercised response procedure absent. F09. |
| 09.6 | Document recovery and emergency access | P | Restore/backup/admin bootstrap scripts exist; complete operational runbook, emergency access custody and full recovery drill remain open. |

## Security testing and release readiness

| ID | Checklist control | Status | Current evidence or remaining work |
| --- | --- | --- | --- |
| 10.1 | Negative authentication/authorization/tenant tests | C | Dedicated auth, tenant, role, storage and security suites exist. Test execution results and limits are recorded below. |
| 10.2 | CI security checks before deployment | P | `.github/workflows/security.yml` runs audits, tests, secret and image scans; remote activation/required status checks are unverified. F05 currently fails dependency policy. |
| 10.3 | Exclude debug/sensitive release artifacts | P | Non-root production container, Docker environment exclusions, no frontend source maps in inspected `dist/assets`; full deployed artifact/debug inspection pending. |
| 10.4 | Abuse tests limited to authorized systems | C | This review uses local tests/public advisory queries; no third-party exploitation or production mutation authorized/performed. |
| 10.5 | Review high-risk changes before merge | V | Repository branch protections, reviewers and approval records need external evidence. |
| 10.6 | Fix known exploitable critical issues | V | No critical advisory returned in the primary lockfile scans; source review cannot establish absence of exploitable critical defects or authorize production release. |
| 10.7 | Pass post-deployment security smoke tests | V | No supplied live deployment target was tested. Prior local browser checks are not production smoke tests. |

## Guide phase comparison

| Guide phase | Assessment | Completion requirement beyond the checklist |
| --- | --- | --- |
| 01 Audit and baseline | Partial | Existing inventories, findings and tests exist; maintain a current complete route/method/role/ownership/rate-limit matrix and reviewed threat model with owners and dates. |
| 02 Authentication and sessions | Substantial code coverage | Configure production delivery/MFA services, address timing consistency and test complete hosted lifecycle. |
| 03 Authorization and admin protection | Substantial code coverage | Verify every deployed private route with absent/forged/expired/low-privilege tokens and cross-tenant IDs, including mixed batches and restricted fields. |
| 04 API validation and abuse | Partial | Close unbounded queries/resource budgets; verify oversized requests and configured URL destinations. |
| 05 Database integrity | Partial | Confirm effective DB roles/network isolation, concurrency invariants and full recovery/PITR procedures. Retail merge/crawler invariants are inapplicable. |
| 06 Frontend | Partial | Close document fallback URL handling and verify deployed CSP, headers and secret-free assets. |
| 07 Infrastructure and secrets | Incomplete production evidence | Rotate credentials; verify TLS, network exposure, least privilege, environment separation and patch process. |
| 08 Dependency and AI supply chain | Partial | Resolve i18next finding; establish enforced review, SAST, dependency update ownership and restricted agent credentials. Existing secret/image scans do not substitute for SAST. |
| 09 Monitoring and recovery | Partial | Verify collector/alerts, incident response, encrypted offsite database and document backups and independent key custody. |
| 10 Testing and launch gate | Not passed | Hosted security/functional smoke evidence, required CI checks, risk approvals and named release-owner approval remain required. |

The guide's requirements for phase owners, tickets, reviewed branches/PRs, exception dates and release approval are workflow requirements. They cannot be marked implemented from source code alone. Its retail regression matrix should be replaced with patient records, appointments, consent, prescriptions, staff, inventory, billing, exports, document storage and tenant isolation. Existing feature/security tests cover these areas in part; a route-complete manual test is not established.

## Verification evidence

- Both PDFs were text-extracted in full: checklist 4 pages; guide 13 pages.
- Current tracked-file credential scan: passed. This scanner does not scan complete history, all ignored archives or every possible secret pattern.
- Existing frontend build: 158 JavaScript assets scanned for private-key blocks, credential-bearing PostgreSQL URLs and AWS access-key patterns, with zero matches. This was not a fresh build or an exhaustive scan of all secret formats.
- Fresh frontend npm audit: 1 moderate, 0 high, 0 critical. Advisory: [i18next shared built-in object corruption](https://github.com/advisories/GHSA-6jcc-5g8w-32mx).
- Fresh backend npm audit: 0 reported vulnerabilities. These results cover the primary app lockfiles; archived/imported manifests were not rescanned.
- Fresh backend/frontend regression attempts did not complete in this session. Initial runs stalled; retries with two workers and local fixture connectivity also did not produce final result files and were interrupted. No fresh test pass is claimed. Historical 23 November results are supporting evidence only: 455 backend passed and 1 skipped, 360 frontend passed, 34 isolated PostgreSQL passed, as recorded in `SECURITY_HARDENING_IMPLEMENTATION.md`. No fresh PostgreSQL, container or full browser test was run. Complete the regression reruns before release.
- Hosted infrastructure, branch policies, alert delivery, credential revocation and post-deployment smoke tests were not verified. The historical preflight is dated 23 November and is not presented as current provider state.

## Production release review

None of the five final release sign-off boxes should be checked solely from this report. Critical exploit absence is not proved; the high-priority production dependencies need closure or explicit risk decisions; deployed secrets/infrastructure need review; operational recovery/alerts need evidence; release-owner approval has not been supplied.

The next work is to close F01–F10, rerun required checks, obtain hosted-environment evidence and record a release decision against the exact deployed revision. No credential values or patient records are included here.
