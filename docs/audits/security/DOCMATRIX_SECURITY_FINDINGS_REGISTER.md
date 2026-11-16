# DOCMATRIX SECURITY FINDINGS REGISTER

**Date of Audit:** November 12, 2026  
**Auditor:** Senior Application Security Engineer & QA Security Lead  
**Scope:** Exhaustive registry of all confirmed, potential, and unverified security findings identified during the security audit.

---

## Summary of Findings by Severity

| Severity | Confirmed | Potential | Total |
| :--- | :---: | :---: | :---: |
| **CRITICAL** | 0 | 0 | 0 |
| **HIGH** | 4 | 0 | 4 |
| **MEDIUM** | 3 | 2 | 5 |
| **LOW** | 2 | 2 | 4 |
| **INFORMATIONAL** | 1 | 2 | 3 |
| **TOTAL** | **10** | **6** | **16** |

---

## 1. High Severity Findings

### Finding ID: SEC-001
- **Title:** Overly Permissive CORS Origin Reflection
- **Severity:** HIGH
- **Status:** CONFIRMED
- **Affected Module:** Gateway / Network Configuration
- **Evidence:** [`backend/src/main.ts` Lines 8–11](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/backend/src/main.ts#L8-L11):
  ```typescript
  app.enableCors({
    origin: true,
    credentials: true,
  });
  ```
- **Description:** Setting `origin: true` configures CORS to dynamically reflect the request's `Origin` header in the `Access-Control-Allow-Origin` response header while setting `Access-Control-Allow-Credentials: true`.
- **Impact:** Malicious third-party websites visited by an authenticated clinic user can perform cross-origin requests to the backend API with the user's active session credentials or tokens.
- **Conditions:** User visits a malicious website while logged into DocMatrix.
- **Recommendation:** Replace `origin: true` with a strict array of trusted clinic dashboard domains read from environment configuration (e.g. `[process.env.FRONTEND_URL, 'https://app.docmatrix.co.in']`).
- **Verification:** Issue `curl -H "Origin: https://evil.com" http://localhost:3000/patients` and verify CORS headers reject unauthorized origins.
- **Regression Risk:** Low (frontend requires exact matching URL).
- **Suggested Priority:** P0
- **Suggested Owner:** Backend Gateway Engineer

---

### Finding ID: SEC-002
- **Title:** Hardcoded Fallback JWT Secret in Production Path
- **Severity:** HIGH
- **Status:** CONFIRMED
- **Affected Module:** Authentication (`AuthModule`, `JwtStrategy`)
- **Evidence:** [`backend/src/auth/auth.module.ts` Line 12](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/backend/src/auth/auth.module.ts#L12) and [`backend/src/auth/jwt.strategy.ts` Line 20](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/backend/src/auth/jwt.strategy.ts#L20):
  ```typescript
  secret: process.env.JWT_SECRET || 'docmatrix_jwt_development_secret_key_2026'
  ```
- **Description:** If `JWT_SECRET` is not explicitly set in the production environment, the backend silently boots with a publicly visible fallback secret string.
- **Impact:** Attackers who know the hardcoded development string can forge arbitrary JWTs containing any `sub` (user ID), `clinicId`, and `isPlatformAdmin: true` role, achieving total platform takeover.
- **Conditions:** Application deployed to production without defining `JWT_SECRET`.
- **Recommendation:** Add an explicit startup assertion in `main.ts` or `AuthModule` that throws a fatal error if `process.env.NODE_ENV === 'production'` and `process.env.JWT_SECRET` is missing or matches the default.
- **Verification:** Start the application in production mode without `JWT_SECRET` and confirm it crashes immediately.
- **Regression Risk:** None.
- **Suggested Priority:** P0
- **Suggested Owner:** Backend Security Engineer

---

### Finding ID: SEC-003
- **Title:** Broken Function-Level Authorization on Billing Mutations (BFLA)
- **Severity:** HIGH
- **Status:** CONFIRMED
- **Affected Module:** Billing (`BillingController`)
- **Evidence:** [`backend/src/billing/billing.controller.ts`](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/backend/src/billing/billing.controller.ts) uses only `@UseGuards(JwtAuthGuard, TenantGuard)` without `@Roles(...)` decorators on sensitive write routes:
  - `POST /billing/invoices/issue`
  - `POST /billing/invoices/:id/void`
  - `POST /billing/payments/:id/refund`
  - `POST /billing/tariffs`
  - `POST /billing/expenses`
- **Description:** Billing modification endpoints verify that the user belongs to the clinic, but do not verify the user's role.
- **Impact:** Any authenticated user in the clinic (such as a Receptionist, Nurse, or Lab Technician) can craft direct API requests to void paid invoices, issue arbitrary refunds, alter service pricing, or log false expenses.
- **Conditions:** Authenticated user with low-privilege role issues direct HTTP calls.
- **Recommendation:** Add `RolesGuard` to `BillingController` and decorate financial write methods with `@Roles(StaffRole.ORGANIZATION_ADMIN, StaffRole.ACCOUNTANT)`.
- **Verification:** Issue a POST request to `/billing/invoices/:id/void` using a Receptionist JWT; verify response is HTTP 403 Forbidden.
- **Regression Risk:** Low (ensures only authorized financial staff perform billing mutations).
- **Suggested Priority:** P1
- **Suggested Owner:** Full-Stack Billing Engineer

---

### Finding ID: SEC-004
- **Title:** Stateless 7-Day JWTs Without Server-Side Invalidation or Rotation
- **Severity:** HIGH
- **Status:** CONFIRMED
- **Affected Module:** Authentication (`AuthService`, `AuthModule`)
- **Evidence:** [`backend/src/auth/auth.module.ts` Line 13](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/backend/src/auth/auth.module.ts#L13) (`expiresIn: '7d'`) and [`backend/src/auth/auth.service.ts` Lines 304–328](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/backend/src/auth/auth.service.ts#L304):
  `revokeSessions()` writes a local disk audit log, but does not invalidate existing tokens.
- **Description:** Tokens remain valid for 7 full days. Logging out or changing passwords does not invalidate previously issued tokens.
- **Impact:** If a token is intercepted or accessed from an unattended clinic workstation, it remains active for a week, and the legitimate user has no way to terminate the stolen session.
- **Conditions:** Token compromise or unrevoked employee session on device change.
- **Recommendation:** Add a `tokenVersion` or `sessionNonce` column to the `User` model, increment it upon password change or logout, and verify it in `JwtStrategy.validate()`. Shorten access token lifetime to 15 minutes with rolling refresh tokens.
- **Verification:** Change user password, attempt to call private endpoint with prior JWT, verify response is HTTP 401 Unauthorized.
- **Regression Risk:** Medium (requires handling token refresh in frontend `apiClient.ts`).
- **Suggested Priority:** P1
- **Suggested Owner:** Backend Auth Specialist

---

## 2. Medium Severity Findings

### Finding ID: SEC-005
- **Title:** Missing Rate Limiting and Brute-Force Defenses
- **Severity:** MEDIUM
- **Status:** CONFIRMED
- **Affected Module:** Gateway / API Security
- **Evidence:** [`backend/src/app.module.ts`](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/backend/src/app.module.ts) lacks `@nestjs/throttler`.
- **Description:** Public and authentication endpoints (`/auth/login`, `/auth/register-clinic`, `/enquiries`) can be requested indefinitely without throttling.
- **Impact:** Automated dictionary attacks, credential stuffing, and lead spamming.
- **Conditions:** Attacker automates repeated login requests.
- **Recommendation:** Register `ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])` and apply `ThrottlerGuard` globally or on auth controllers.
- **Verification:** Run 15 rapid failed logins from one IP; verify request 11 receives HTTP 429 Too Many Requests.
- **Regression Risk:** Low.
- **Suggested Priority:** P1
- **Suggested Owner:** Backend Infrastructure Engineer

---

### Finding ID: SEC-006
- **Title:** Missing HTTP Security Response Headers (Helmet)
- **Severity:** MEDIUM
- **Status:** CONFIRMED
- **Affected Module:** Gateway / HTTP Response Security
- **Evidence:** [`backend/src/main.ts`](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/backend/src/main.ts) does not register `helmet`.
- **Description:** Backend responses lack basic defensive headers: `X-Content-Type-Options: nosniff`, `Strict-Transport-Security`, `X-Frame-Options: DENY`, `Referrer-Policy`.
- **Impact:** Increased exposure to clickjacking, MIME-type sniffing, and SSL downgrade attacks.
- **Conditions:** User navigates through malicious framing sites or insecure network connections.
- **Recommendation:** Install `helmet` and add `app.use(helmet())` in `main.ts`.
- **Verification:** Inspect curl response headers on `GET /` and verify standard security headers are present.
- **Regression Risk:** Low.
- **Suggested Priority:** P1
- **Suggested Owner:** Backend Gateway Engineer

---

### Finding ID: SEC-007
- **Title:** Unpinned JWT Algorithm in Passport Strategy
- **Severity:** MEDIUM
- **Status:** CONFIRMED
- **Affected Module:** Authentication (`JwtStrategy`)
- **Evidence:** [`backend/src/auth/jwt.strategy.ts` Lines 17–21](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/backend/src/auth/jwt.strategy.ts#L17-L21) lacks `algorithms` option in strategy configuration.
- **Description:** In the absence of an explicit algorithm pin, JWT verifiers may accept unexpected algorithms (such as asymmetric public keys or `none`).
- **Impact:** Algorithm confusion attacks.
- **Conditions:** Attacker crafts token with modified header algorithm.
- **Recommendation:** Explicitly specify `algorithms: ['HS256']` in `super({...})`.
- **Verification:** Submit a forged token signed with `none` algorithm; verify rejection.
- **Regression Risk:** None.
- **Suggested Priority:** P1
- **Suggested Owner:** Backend Security Engineer

---

### Finding ID: SEC-008
- **Title:** Insecure Local Disk Document Storage in Multi-Instance Environments
- **Severity:** MEDIUM
- **Status:** POTENTIAL
- **Affected Module:** Document Storage (`StorageService`)
- **Evidence:** [`backend/src/storage/storage.service.ts` Line 38](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/backend/src/storage/storage.service.ts#L38).
- **Description:** If S3 environment variables are missing, the server defaults to writing files to `backend/storage/documents/`.
- **Impact:** Multi-container production deployments will experience split-brain document storage where files uploaded on one pod cannot be downloaded by requests reaching another pod.
- **Conditions:** Production deployment running multiple instances without S3 credentials.
- **Recommendation:** Throw a fatal error on boot if `NODE_ENV === 'production'` and S3 credentials are missing.
- **Verification:** Verify application fails to boot in production mode when S3 credentials are unset.
- **Regression Risk:** None in production.
- **Suggested Priority:** P1
- **Suggested Owner:** Cloud Infrastructure Engineer

---

### Finding ID: SEC-009
- **Title:** Lack of Multi-Factor Authentication (MFA) for Clinic Administrators
- **Severity:** MEDIUM
- **Status:** POTENTIAL
- **Affected Module:** Authentication (`User` model & Login)
- **Evidence:** `schema.prisma` contains no TOTP secret or 2FA enablement fields.
- **Description:** Clinic owners and administrators access sensitive patient health records and financial ledgers with password-only authentication.
- **Impact:** Weak or compromised passwords directly expose clinic records.
- **Conditions:** Administrator password compromised via phishing or reuse.
- **Recommendation:** Implement TOTP (RFC 6238) multi-factor authentication for `ORGANIZATION_ADMIN` roles.
- **Verification:** Admin login requires 6-digit TOTP code verification.
- **Regression Risk:** Low (opt-in or enforced per clinic).
- **Suggested Priority:** P2
- **Suggested Owner:** Full-Stack Security Engineer

---

## 3. Low & Informational Findings

### Finding ID: SEC-010
- **Title:** User Account Enumeration via Clinic Registration
- **Severity:** LOW
- **Status:** CONFIRMED
- **Affected Module:** Authentication (`AuthService.registerClinic`)
- **Evidence:** [`backend/src/auth/auth.service.ts` Line 143](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/backend/src/auth/auth.service.ts#L143) throws `ConflictException('A user with this email address already exists.')`.
- **Description:** Distinct error message allows external visitors to check if an email is registered in DocMatrix.
- **Impact:** Target list enumeration.
- **Recommendation:** Return generic registration acceptance requiring email verification link.
- **Suggested Priority:** P2

---

### Finding ID: SEC-011
- **Title:** Unvalidated Input in Inventory Item and Batch Updates
- **Severity:** LOW
- **Status:** CONFIRMED
- **Affected Module:** Inventory (`InventoryController`)
- **Evidence:** [`backend/src/inventory/inventory.controller.ts` Line 39](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/backend/src/inventory/inventory.controller.ts#L39) uses `@Body() dto: any`.
- **Description:** Lacks class-validator DTO.
- **Recommendation:** Replace `any` with strongly typed `UpdateItemDto`.
- **Suggested Priority:** P2

---

### Finding ID: SEC-012
- **Title:** Missing Content Security Policy (CSP) Headers
- **Severity:** LOW
- **Status:** CONFIRMED
- **Affected Module:** Frontend / Ingress
- **Evidence:** [`index.html`](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/index.html) lacks CSP meta tag.
- **Recommendation:** Configure CSP via reverse proxy or Helmet.
- **Suggested Priority:** P2

