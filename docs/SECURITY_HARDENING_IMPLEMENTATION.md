# DocMatrix security implementation

Updated 23 November 2026. The main application is `Doc_matrix-main/Doc_matrix-main`. This work implements the application changes identified in the security audit. Deployment controls that need provider access remain explicitly separated below.

**Implemented**

| Audit area | Result |
| --- | --- |
| Copied credentials | Database, signing, AWS and other access secrets were removed from the archived backend environment file. Current provider credentials still need coordinated rotation; removing a copy does not revoke it. |
| Browser data | Tokens, user state and clinic caches now use in-memory storage adapters. Legacy browser copies are purged on load. Only selected UI preferences and the optional remembered email persist. Reloads recover the session through the HttpOnly cookie. |
| MFA | Authenticator enrollment, encrypted TOTP secrets, code replay prevention, one-use hashed recovery codes, login verification and recent-MFA prescription authorization are implemented. Enabling MFA revokes existing sessions. |
| Account verification | Expiring hashed email verification tokens and a configured delivery adapter are implemented. In production, accounts must verify email; platform/clinic administrators must also enroll MFA before accessing records. Setup-only JWTs are restricted to enrollment/profile/email routes. |
| Sessions | Server idle expiry is 30 minutes; absolute maximum lifetime is seven days. Rotation cannot extend that maximum, and hash history has a rotation ceiling. A browser interaction timer also signs out after 30 minutes without activity. |
| Passwords | New passwords consistently require 12 characters and a maximum of 72 UTF-8 bytes; null characters are rejected. Existing password login remains compatible. Invalid recovery tokens are rejected before bcrypt work. |
| Login protection | Counters use the framework-verified client IP. All sensitive authentication actions are throttled, IPv6 subnet grouping is used, and production requires shared Redis and fails closed on protection failures. |
| Consent | Signed status requires exact consent wording and signature evidence. Evidence is hashed, changes have attributed revisions, signed evidence cannot be overwritten, and delete becomes revocation. PostgreSQL triggers reject revision modification/deletion. Existing legacy evidence is preserved before its first managed update. |
| Clinical governance | Prescription finalization checks diagnosis and recent MFA when required. Surgical treatment progression and surgical appointments require procedure-specific signed consent evidence when the policy is enabled. |
| Retention | A periodic worker archives overdue records without deleting clinical evidence. It accounts for recent appointments/clinical activity, pediatric minimums, indefinite retention and legal holds. Administrators can set/release legal holds through the patient endpoint and privacy settings screen. |
| Auditing | Authenticated API attempts and outcomes record actor, route/resource IDs, trusted IP and user agent without request bodies. Denials are recorded. PostgreSQL audit content is append-only; forwarding metadata can change. A database outbox retries collector failures with deadlines, backoff and event idempotency keys. |
| HTTP/browser protections | API responses default to private/no-store. Frontend hosting headers include CSP, frame restrictions, no-referrer and HSTS. Production API configuration defaults to a same-origin `/api` reverse proxy if `VITE_API_BASE_URL` is absent. |
| Storage | Production refuses missing object-storage credentials, implicit local fallback, missing bucket configuration or insecure custom endpoints. Uploads request server-side encryption. The existing scanner remains fail-closed. |
| Recovery | The existing AES-256-GCM recovery tooling now removes plaintext scratch dumps on failure and protects recovery directories. A nightly CI job performs backup, restore verification and an encrypted offsite round-trip using a separate backup identity. The schedule becomes active only after the workflow is pushed/enabled and its secrets are configured. |
| Release controls | Security CI includes both test suites, disposable PostgreSQL checks, dependency audit, tracked-file credential scanning and container image scanning. Old frontend/imported/backup copies reject ordinary install/build/start commands and have archive markers. |
| Public plans | Public plan listings/lookups exclude inactive plans. |

**Database rollout**

The additive migration `20261123120000_security_hardening` was first tested on a fresh disposable PostgreSQL cluster. An encrypted local backup of the configured database was then restored and verified across 35 pre-migration application tables, and the migration passed rehearsal on that restored copy. The migration was subsequently applied to the configured development database; schema comparison reported no difference. No clinical records were deleted. No backup was uploaded during this work.

New storage includes encrypted MFA state, email-verification records, MFA session timestamps, consent evidence/revisions, legal holds and audit delivery state. Historical consent revisions and audit content are protected against ordinary updates/deletes by database triggers. Database owners can bypass triggers; deployment roles and the external collector must provide independent protection.

**Verification**

- Final backend regression suite: 455 passed, zero failed, one skipped.
- Focused security tests verify RFC 6238 vectors, encrypted enrollment, replay/recovery-code protection, account restrictions, password byte limits, session limits, IP handling, fail-closed configuration, clinical rules and retention/legal holds.
- PostgreSQL: 34 passed, including real immutable-history and idle-session tests. Migrations applied and schema comparison passed.
- Frontend: 360 passed, including an independent test that native browser storage receives neither tokens nor patient caches.
- Backend build, frontend typecheck and production build passed. The frontend build retains the existing large-chunk warning.
- Updated lockfile dry-run, dependency audit and tracked-file credential scan passed.
- Browser verification passed ten real UI/API/database checks plus ten HTTP/database clinic workflows, including login, reload, consent revocation, export, clinical authorization and confirmation that bearer tokens are absent from native browser storage.
- The development API was restarted after the watch/build cycle and its public health endpoint returned HTTP 200.

The read-only provider preflight did not pass: the inspected environment lacks Redis, HTTPS app/email delivery configuration, a central audit collector and ClamAV. The S3-compatible service did not provide verifiable bucket-management controls through the configured access credentials. These results are retained in `backend/.security-test/hardening-preflight.json`; uploads still have the existing local Defender option during development. Production remains intentionally blocked until the required services are configured and checked.

Local evidence is under `backend/.security-test/hardening-*` and `.verification/hardening-*`. Keep these directories private. CI/container checks are prepared in source; they have not been executed on a hosted CI runner here.

**Provider setup still required**

1. Rotate the current database and object-storage access credentials at the provider, update every deployed consumer, verify access, then revoke the old credentials. Use a restricted application database role separate from migration/backup roles. The current credentials were not revoked in this session.
2. Connect the relevant Neon/Vercel management accounts before hosted settings can be inspected or changed. No provider-management connection was available. The deployment has not been published from this workspace.
3. Set a separately managed `AUTH_ENCRYPTION_KEY` of 32 random bytes as hex. A private local key was generated for development; production must use its own key with independent recovery custody. Losing this key makes stored authenticator secrets unreadable.
4. Configure `PUBLIC_APP_URL`, `PASSWORD_RESET_DELIVERY_URL` and `PASSWORD_RESET_DELIVERY_KEY`. Optional `ACCOUNT_EMAIL_DELIVERY_URL`/`ACCOUNT_EMAIL_DELIVERY_KEY` can use a separate adapter. Delivery must accept the reset/verification payloads over HTTPS and actually deliver the message. No delivery provider was invented or live verification emails sent during implementation.
5. Configure `AUDIT_LOG_WEBHOOK_URL` and `AUDIT_LOG_API_KEY` for an authenticated HTTPS collector with independent immutable retention and alerts. Validate duplicate-event handling by event ID and test collector outage/recovery.
6. Configure production Redis, HTTPS CORS origins, ClamAV and explicit object storage. Validate bucket encryption, public access blocking, IAM, versioning and retention with `node --env-file=.env scripts/security-preflight.mjs`. S3-compatible providers must support the requested encryption headers or provide an explicitly reviewed equivalent.
7. Set `VITE_API_BASE_URL` to the HTTPS API origin during frontend deployment, or configure the host to reverse-proxy `/api` to the backend. Review the CSP against the actual required origins and verify the headers on the deployed frontend.
8. Configure the repository's `recovery` CI environment with `DATABASE_URL`, `BACKUP_ENCRYPTION_KEY`, `BACKUP_AWS_ACCESS_KEY_ID`, `BACKUP_AWS_SECRET_ACCESS_KEY`, `BACKUP_S3_BUCKET` and, for compatible providers, `BACKUP_ENDPOINT_URL`/`BACKUP_AWS_REGION`. Use an independent destination and identity. Escrow the encryption key separately and set provider object retention/PITR. The workflow's nightly schedule is 02:00 UTC, or 07:30 Asia/Calcutta.
9. Protect the main branch with required CI checks and restrict production/recovery environment access. Enable provider/repository incident alerts and verify a restore of both database and clinical document binaries. The nightly database recovery job does not replace document-storage backups.

Production startup intentionally rejects missing essential security configuration. Existing users need verified email, and administrators need an enrolled authenticator, before production clinical access. Do not switch the running development environment to production until delivery, MFA key custody, shared protection services and hosting have been configured.

Retention currently archives records and preserves evidence; permanent erasure, statutory retention decisions and verified patient identity for data requests require an approved operational/legal process. A saved signature is staff-recorded evidence, not a claim that a third-party digital-signature authority verified the patient.
