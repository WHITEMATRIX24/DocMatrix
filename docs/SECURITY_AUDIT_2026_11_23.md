# DocMatrix security audit

Audit date: 23 November 2026. This assessment covers the current working tree, including uncommitted security changes, of `Doc_matrix-main/Doc_matrix-main`, plus the older `DocMatrix` application and the backup copy in the workspace. The primary application is a React/Vite frontend with a NestJS/Prisma/PostgreSQL backend and local or S3 document storage.

Remediation update: application fixes and the development-database migration have since been implemented. See [security implementation and remaining provider setup](SECURITY_HARDENING_IMPLEMENTATION.md). The findings below describe the pre-remediation audit snapshot.

**Assessment:** substantial security controls are implemented, but production security is incomplete. The highest priorities are duplicated configured credentials, patient data and tokens stored in browser storage, absent MFA, unenforced governance settings, and consent/audit integrity. No critical exploitable defect was confirmed in the main application during this review. The older frontend has critical dependency advisories under the conditions described below.

This is a source/configuration review with automated tests and npm advisory checks, not a penetration test of a deployed environment or a compliance certification. Production hosting, IAM, bucket policies, TLS termination, database privileges, backup schedules, alert delivery and key custody require deployment verification. Existing historical reports are supporting context, not proof that those controls remain operational. No application fixes, production data changes, credential rotations or offsite uploads were performed.

**Implemented controls**

| Area | What is implemented | Evidence in the primary application |
| --- | --- | --- |
| Password storage | bcrypt hashes; work factor 10 for signup/change/staff creation and 12 for recovery | `backend/src/auth/auth.service.ts`, `backend/src/auth/password-recovery.service.ts`, `backend/src/clinics/clinics.service.ts` |
| Access tokens | Pinned HS256 algorithm, signing-key validation at startup, default 15 minute expiry, mandatory user/session identifiers | `backend/src/common/config/jwt.config.ts`, `backend/src/auth/jwt.strategy.ts` |
| Session revocation | Every protected JWT checks current active user and a live user-owned database session; logout verifies signatures before selecting a session | `backend/src/auth/jwt.strategy.ts`, `backend/src/auth/auth.service.ts` |
| Refresh tokens | 256 bit random tokens, SHA-256 hashes at rest, atomic rotation, previous-token reuse detection and family revocation | `backend/src/auth/session.service.ts` |
| Cookies and CSRF | Refresh cookie is HttpOnly, scoped to `/auth`, Secure in production; refresh/logout require an approved custom header and check supplied origins | `backend/src/common/config/jwt.config.ts`, `backend/src/auth/auth.controller.ts` |
| Tenant separation | TenantGuard rejects platform sessions and missing clinic membership; service queries scope patient/clinical/billing/inventory records to clinic; related-resource ownership checks exist | `backend/src/common/guards/tenant.guard.ts`, feature controllers/services |
| Authorization | Server operation permissions, staff role hierarchy, billing permissions, platform-only mutations, receptionist document category restrictions, role-aware patient output | `backend/src/common/decorators/operation-permission.decorator.ts`, `backend/src/clinics/staff-management.policy.ts`, `backend/src/billing/`, `backend/src/clinical/clinical.service.ts`, `backend/src/patients/patients.controller.ts` |
| Practitioner capability | Doctors can practice; a primary organization owner additionally requires platform verification and registration to practice under the owner role | `backend/src/common/practitioner.policy.ts` |
| Input validation | Global DTO whitelist, transforms and rejection of extra fields; parameterized Prisma queries/raw SQL templates | `backend/src/main.ts`, DTOs and service query sites |
| Request abuse controls | Global and sensitive-auth rate limits, IP/account failure counters, Redis and memory stores | `backend/src/common/guards/rate-limit.guard.ts`, `backend/src/common/services/rate-limiter.service.ts` |
| Browser/API headers | Helmet and production HSTS on backend; exact-origin credentialed CORS; generic unexpected-error responses | `backend/src/main.ts`, `backend/src/common/config/cors.config.ts`, `backend/src/common/filters/all-exceptions.filter.ts` |
| Document uploads | 25 MB limit, multipart field/file limits, extension/header/MIME checks, randomized tenant/patient keys, filename sanitization, ClamAV/Defender adapters | `backend/src/storage/`, `backend/src/clinical/clinical.controller.ts` |
| Antivirus enforcement | Production uploads fail closed when the scanner is unavailable or cannot confirm a clean result | `backend/src/storage/malware-scanner.service.ts`, `backend/src/storage/storage.service.ts` |
| Document downloads | Clinic/patient key ownership checks, short-lived signed URLs, sandboxed backend previews, attachment headers and no-store for download/preview responses | `backend/src/storage/document-key.policy.ts`, `backend/src/storage/upload-limits.ts`, `backend/src/clinical/` |
| Recovery | Expiring hashed single-use reset tokens, transactional consumption, revocation of sessions and other reset tokens on successful recovery | `backend/src/auth/password-recovery.service.ts` |
| Audit facilities | Database audit rows, metadata redaction, local JSONL archive, recent-event cache and optional forwarding webhook | `backend/src/common/services/audit-log.service.ts` |
| Record exports | Admin-only scoped exports, binary checksums, no-store response, export audit event and 50 MB document limit | `backend/src/clinics/clinic-export.service.ts`, controller |
| Recovery tooling | AES-256-GCM database archive and isolated restore verification scripts; optional offsite verification script | `backend/scripts/release-recovery.mjs`, `backend/scripts/verify-offsite-backup.mjs` |
| Container | Multi-stage build, non-root runtime user, production mode, dev dependency pruning and exclusion of environment files from build context | `backend/Dockerfile`, `backend/.dockerignore` |
| Production demo protection | Main frontend demo login/registration fallbacks require test mode; simulated Google login is rejected | `src/services/authService.js` |

**Confirmed gaps and priorities**

Priority indicates remediation urgency for this clinical-data application. A missing control is not automatically a demonstrated exploit.

| ID | Priority | Finding and impact | Required action |
| --- | --- | --- | --- |
| S01 | High | Configured database URL and AWS access credentials are duplicated between the main backend `.env` and `backups/backup_clinical_pre_integration_20261104_1707/backend/.env`. Exact equality was checked without printing values. The main JWT key differs. The main `.env` is ignored and no tracked history for that path was returned; this does not demonstrate a public leak. Old archives nevertheless preserve access credentials. | Rotate the duplicated credentials, inspect access logs if copies were shared, remove secrets from retained project archives and manage deployment secrets separately. Keep backup decryption-key custody separate from the machine/archive. |
| S02 | High | `src/services/clinicStore.ts:795` serializes patient demographics, clinical notes, invoices, treatment plans, consents, charts and prescriptions to persistent localStorage through `storageService.ts`. `src/services/authService.js:92` stores access tokens in localStorage for Remember Me and otherwise sessionStorage. Both stores are readable by JavaScript on the app origin. An XSS or malicious same-origin script could copy clinical data and tokens. Normal logout clears the active clinic cache, which reduces but does not remove this risk. | Remove persistent PHI caching by default, minimize cached fields, enforce expiry and cleanup, keep access tokens in memory or adopt a carefully designed HttpOnly session/BFF model, and deploy a strict frontend CSP. |
| S03 | High | No server MFA/TOTP/WebAuthn or step-up flow was found, including for platform administrators. `twoFactorForPrescriptions` can be saved in the clinical configuration but is never read by prescription authorization. | Implement MFA for privileged accounts and enforce prescription step-up when configured. Until then, do not present this setting as effective. |
| S04 | High | Consent creation defaults to `Signed` with an optional signature; consent status, signature and witness can subsequently be overwritten and administrators can hard-delete the record. These methods have no consent-specific durable audit call. A staff-recorded status is insufficient evidence of patient signing or an immutable consent history. See `backend/src/clinical/clinical.service.ts:526` onward. | Version signed consent content and evidence, audit every change/revocation, preserve prior versions, restrict deletion, and distinguish staff recording from verified patient signing. |
| S05 | Medium | The rate-limit guard uses framework-derived `req.ip`, while normal login records failures against raw `x-forwarded-for` (`backend/src/auth/auth.controller.ts:78`). A client that can supply that header can poison the per-IP audit/lockout key so it differs from the key checked by the guard. The global account counter and per-IP request throttle still apply; this is not a complete rate-limit bypass. | Use one trusted client-IP resolver for rate checks, login counters and session metadata. Add an HTTP regression using a forged forwarded header with proxy trust disabled. |
| S06 | Medium | Redis failures permit requests unless `RATE_LIMIT_FAIL_CLOSED=true`. Login-lock lookup/record failures independently return unlocked; selecting Redis without a URL silently falls back to memory. This can weaken protection across instances and during outages. See `backend/src/common/services/rate-limiter.service.ts:30`, `:177`, `:230`. | Validate production store configuration at startup, require shared storage for multiple instances, define a consistent fail-closed or bounded fallback policy and monitor failures. |
| S07 | Medium | Backend Helmet headers do not secure a separately hosted SPA. `vercel.json` only defines rewrites, and `index.html` has no CSP. The backend CSP permits inline scripts. Hosting may inject headers, but that was not verified. | Add and verify frontend CSP, frame restrictions, referrer policy and other required headers at the frontend host. Use hashes/nonces or external scripts where necessary. |
| S08 | Medium | `mandatoryConsentForSurgery`, `mandatoryDiagnosisBeforeRx` and retention fields are saved/returned but no workflow enforcement or retention worker using these settings was found. No account email verification flow was found either. | Enforce governance rules on the server before committing clinical actions. Implement a reviewed retention/archive/legal-hold process and verify account email ownership. Do not equate stored preferences with enforcement. |
| S09 | Medium | Audit coverage and durability are partial. Patient reads/edits, appointment changes, document access and consent changes do not consistently use the security audit sink. Authentication events omit some actor IDs/IP metadata; failed login warnings default to outcome SUCCESS because the default only treats severity error as failure. Local JSONL is writable by the same process, not immutable. Database writes are asynchronous; webhook forwarding has no timeout, retry/durable queue or response-status check. `AUDIT_LOG_RETENTION_DAYS` has no consumer. | Define required events, include actor/resource/IP/outcome, explicitly mark failures, implement reliable forwarding and retention, and protect a separate append-only or immutable destination. Verify alerting end to end. |
| S10 | Medium | Password policy differs: signup and change permit 8 characters without an upper byte limit, staff creation requires 12 characters and at most 72 UTF-8 bytes, and reset allows 12–128 characters. bcrypt truncates beyond 72 bytes, so distinct long passwords can hash as equivalent. See auth DTOs, auth service, and staff service. | Apply a common server policy with a bcrypt-compatible byte limit or migrate to an appropriate password hash. Test multibyte passwords. Add compromised-password screening and appropriate reauthentication. |
| S11 | Medium | Refresh extends `expiresAt` from the current time and appends old hashes indefinitely. Validation checks expiry/revocation but no absolute maximum session age or idle deadline. Automatic refresh can keep a session alive indefinitely. | Enforce absolute and idle lifetimes; limit session count and manage expired-session/hash retention. |
| S12 | Medium | Most clinical/auth JSON responses have no explicit no-store header. No-store exists for exports, platform views and document previews/downloads, but not broadly for sensitive APIs. | Apply a consistent private/no-store policy to sensitive responses and validate behavior through the deployed proxy/CDN. |
| S13 | Medium | S3 credential presence determines provider availability; missing credentials silently select local disk even in production. Local clinical documents and audit files have no application encryption. Bucket encryption, public-access blocking, IAM scope, TLS endpoint enforcement, versioning and object lock are not established by source code. Signed URLs remain bearer access until expiry, independent of session logout. | Make production provider choice explicit, fail startup on unexpected fallback, and verify storage encryption/access controls and backup coverage. Decide the acceptable signed-URL lifetime/revocation model. |
| S14 | Medium | Password recovery is implemented but the inspected main environment contains none of `PUBLIC_APP_URL`, `PASSWORD_RESET_DELIVERY_URL`, `PASSWORD_RESET_DELIVERY_KEY`; process-level deployment overrides were not inspected. The service correctly rejects unconfigured delivery. A delivery failure returns 503 only for existing accounts, creating a conditional enumeration difference. Reset completion also computes bcrypt before validating token existence. | Configure and verify delivery, keep public responses uniform during failures, validate tokens before expensive hashing where safe, and add account-aware abuse controls. |
| S15 | Low | Public `/plans?all=true` lists inactive plans, and public plan lookup does not require isActive. This exposes unpublished commercial configuration if inactive means private. | Restrict inactive-plan access to platform administrators or explicitly classify it as public. |

The optional `StorageService` fallback in ClinicalService writes files without the main validator/scanner if constructed without that service. The current application wires StorageModule, so this is a defense-in-depth risk rather than a confirmed production bypass. Remove the fallback or make production fail closed. Likewise authentication is attached per controller rather than globally; new routes need explicit protection and regression coverage.

**Older copies and dependency security**

Online npm advisory queries completed on the audit date. Counts are affected package entries, including transitive packages; they are not independent demonstrated exploits.

| Scope | Advisory result | Interpretation |
| --- | --- | --- |
| Main frontend lockfile | 0 known vulnerabilities | Current registry result; does not prove application security. |
| Main backend lockfile | 0 known vulnerabilities | Current registry result, including dev dependencies. |
| Older `DocMatrix` frontend | 9 affected packages: 2 critical, 2 high, 5 moderate | Includes Vitest UI arbitrary file read/execution under exposed UI-server conditions, Vite/esbuild development-server issues and React Router advisories. |
| Backup backend | 11 affected packages: 6 high, 3 moderate, 2 low | Includes Prisma configuration/deepmerge/effect and toolchain/network dependency findings. These are dormant unless that copy is installed or run. |

The older `DocMatrix/src/services/authService.js` explicitly simulates login, Google authentication and password reset, mints fake tokens, and accepts the doctor demo account with any password at least eight characters long. It must not be treated as the secured main application or deployed with real patient data. No backend bypass of the primary application follows from these fake frontend tokens.

Imported `_import_staff_web` manifests and parent/backup copies are additional maintenance surfaces. The imported `src/hooks/useAuth.ts` calls mockAuthService, including loginAsRole; it is another prototype authentication surface. Unlocked imported manifests were inventoried but not independently installed or tested. Establish one deployable source and prevent old copies from being accidentally released. Do not expose development/test UI servers.

**Deployment controls requiring verification**

- HTTPS termination, hostname/certificate checks, reverse-proxy trust and client-IP handling.
- Database least-privilege roles, network isolation, provider encryption/PITR and TLS validation. Tenant checks are implemented at the application layer; database row-level tenant policies were not found in the reviewed migration set.
- S3 bucket policy, public access blocking, encryption/key management, versioning and object retention. Code support is not evidence of effective cloud policy.
- Scheduled recoverable backups, offsite copies, independent recovery-key escrow, restore objectives and document-binary recovery. The existing closeout report says backups were intentionally local; no new offsite action was taken.
- Central monitoring, tamper-resistant logs, incident alerts and a tested response procedure.
- CI enforcement for security tests, dependency scanning, secret scanning, container scanning and release checks. No committed CI workflow establishing these gates was found.
- Legal/privacy requirements and patient identity verification for exports, erasure and consent. UI legal claims and saved retention values do not establish compliance.

**Verification results**

The backend unit/security command `npm run test:unit -- --reporter=json --outputFile=.security-test/audit-2026-11-23-tests.json` passed: **443 passed, 0 failed, 1 skipped**. The first sandbox run failed because local synthetic HTTP/scanner fixtures could not connect; rerunning with loopback access resolved those failures. These tests include synthetic persistence fixtures and do not independently prove production database/storage configuration.

`npm run test:db` also passed: **31 tests across 2 files** using a fresh disposable local PostgreSQL cluster. Migrations applied and schema comparison reported no difference. These checks exercise actual authentication/session persistence and database integrity without using the clinical database. Evidence: `backend/.security-test/audit-2026-11-23-postgres.log`.

The main frontend suite passed: **359 tests, 0 failures**. Evidence: `.verification/security-audit-2026-11-23-frontend.json`.

Across the three commands, **833 tests passed and 1 was skipped**. Machine-readable backend evidence is in `backend/.security-test/audit-2026-11-23-tests.json`; command logs are under `.security-test/` and `.verification/`. These outputs may contain test fixtures and should remain private. Passing tests verify the behaviors they cover, not the effectiveness of missing controls or production infrastructure.

**Remediation sequence**

1. Rotate and remove duplicated credentials from project archives; establish the deployable repository and quarantine old simulated copies.
2. Reduce browser PHI/token persistence; deploy frontend security headers; add privileged MFA and real prescription step-up.
3. Repair trusted-IP usage and Redis failure behavior; unify password byte limits and session deadlines.
4. Enforce clinical governance settings, preserve consent history, and complete audit coverage and reliable protected logging.
5. Configure recovery delivery, sensitive-response cache policy and explicit production storage; verify cloud IAM, backups, recovery-key custody and monitoring.
6. Enforce these checks in CI and perform a scoped test of the actual deployed environment before asserting production readiness.

The control categories are informed by [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/). Dependency exploit conditions should be checked against the relevant advisories, including [Vitest UI server exposure](https://github.com/advisories/GHSA-5xrq-8626-4rwp) and [esbuild development-server cross-origin access](https://github.com/advisories/GHSA-67mh-4wv8-2f99).
