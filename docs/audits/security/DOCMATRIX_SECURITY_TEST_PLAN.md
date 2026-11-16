# DOCMATRIX SECURITY TEST PLAN & NEGATIVE TEST MATRIX

**Date of Audit:** November 12, 2026  
**Auditor:** Senior QA Security Lead & Application Security Engineer  
**Scope:** Actionable security testing plan for isolated staging verification, covering negative authentication tests, cross-tenant isolation, role permission boundary tests, file upload attack simulations, and financial integrity invariants.

---

## 1. Safe Staging Prerequisites

Security abuse testing must **NEVER** be conducted against production databases or live clinic tenants.
Before executing this security test plan:

1. **Staging Environment Isolation:**
   - Dedicated Neon PostgreSQL staging database branch (`neondb-staging`).
   - Run `npx prisma migrate deploy` on staging.
   - Run security seed script creating test fixtures:
     - **Clinic A** (`clinic-test-alpha`): User 1 (Admin), User 2 (Doctor), User 3 (Receptionist)
     - **Clinic B** (`clinic-test-beta`): User 4 (Admin), User 5 (Doctor)
     - 5 Patients in Clinic A (`PT-A-01` to `PT-A-05`), 5 Patients in Clinic B (`PT-B-01` to `PT-B-05`).
2. **Environment Configuration:**
   - `JWT_SECRET="staging-test-jwt-secret-do-not-use-in-prod-256bit-key"`
   - `AWS_S3_BUCKET="docmatrix-staging-documents"`
   - `NODE_ENV=staging`
3. **Execution Tooling:**
   - Postman / Newman automated collection or Vitest integration runner.
   - No destructive data manipulation commands allowed.

---

## 2. Security Test Matrix

### Category 1: Authentication & Token Lifecycle Tests

| Test Case ID | Test Objective | Execution Steps | Expected Outcome | Pass/Fail Criteria |
| :--- | :--- | :--- | :--- | :---: |
| **ST-AUTH-01** | Unauthenticated Request | Request `GET /patients` without Authorization header. | HTTP 401 Unauthorized (`{ statusCode: 401, message: 'Unauthorized' }`). | **PASS** if 401 returned and no patient data leaked. |
| **ST-AUTH-02** | Expired Token Handling | Request `GET /patients` with an expired JWT. | HTTP 401 Unauthorized (`jwt expired`). | **PASS** if rejected immediately. |
| **ST-AUTH-03** | Malformed Token Signature | Tamper with 1 character in the signature of a valid JWT; request `GET /patients`. | HTTP 401 Unauthorized (`invalid signature`). | **PASS** if rejected immediately. |
| **ST-AUTH-04** | "None" Algorithm Attack | Submit token with header `{"alg": "none"}`; request `GET /patients`. | HTTP 401 Unauthorized. | **PASS** if rejected immediately. |
| **ST-AUTH-05** | Deactivated User Token | Set `User.isActive = false` in DB; submit existing valid JWT to `GET /auth/profile`. | HTTP 401 Unauthorized (`User account is inactive`). | **PASS** if inactive account cannot authenticate. |
| **ST-AUTH-06** | Session Invalidation on Password Change | Change user password via `/auth/change-password`; attempt request with pre-change JWT. | HTTP 401 Unauthorized. | **FAIL** in current codebase (SEC-004: token remains valid). |
| **ST-AUTH-07** | Brute-Force Rate Limiting | Fire 15 consecutive login requests with bad passwords within 30 seconds. | Requests 11–15 return HTTP 429 Too Many Requests. | **FAIL** in current codebase (SEC-005: rate limiting missing). |

---

### Category 2: Cross-Tenant Isolation (BOLA / IDOR) Tests

| Test Case ID | Test Objective | Execution Steps | Expected Outcome | Pass/Fail Criteria |
| :--- | :--- | :--- | :--- | :---: |
| **ST-TENANT-01**| Cross-Clinic Patient Read | Log in as Doctor in Clinic A; request `GET /patients/<PT-B-01-ID>` (Clinic B patient). | HTTP 404 Not Found (`Patient record not found.`). | **PASS** if Clinic A user cannot read Clinic B patient. |
| **ST-TENANT-02**| Cross-Clinic Patient Update | Log in as Doctor in Clinic A; send `PATCH /patients/<PT-B-01-ID>` with new name. | HTTP 404 Not Found. Record in Clinic B remains untouched. | **PASS** if update rejected. |
| **ST-TENANT-03**| Cross-Clinic Invoice Read | Log in as Clinic A Admin; request `GET /billing/invoices/<Clinic-B-Invoice-ID>`. | HTTP 404 Not Found. | **PASS** if invoice data is hidden. |
| **ST-TENANT-04**| Cross-Clinic Document Pre-signed URL | Log in as Clinic A; request signed URL for Clinic B document ID. | HTTP 404 Not Found. Zero signed URLs generated. | **PASS** if pre-signed URL is denied. |
| **ST-TENANT-05**| Cross-Clinic Inventory Movement | Log in as Clinic A; attempt stock adjustment on Clinic B item ID. | HTTP 404 Not Found. | **PASS** if adjustment rejected. |
| **ST-TENANT-06**| Cross-Clinic Tariff Override | Log in as Clinic A; attempt invoice creation using Clinic B tariff ID. | Backend rejects tariff with 404/400 (verified in `billing-isolated-tariff.spec.ts`). | **PASS** (verified in automated test suite). |

---

### Category 3: Role-Based Authorization & Privilege Escalation (BFLA) Tests

| Test Case ID | Test Objective | Execution Steps | Expected Outcome | Pass/Fail Criteria |
| :--- | :--- | :--- | :--- | :---: |
| **ST-ROLE-01** | Unauthorized Revenue Access | Log in as Receptionist in Clinic A; request `GET /reports/revenue`. | HTTP 403 Forbidden. | **PASS** (verified in `reports.service.spec.ts`). |
| **ST-ROLE-02** | Financial Redaction in Summary | Log in as Receptionist in Clinic A; request `GET /reports/summary`. | HTTP 200 OK, but financial fields (`revenue`, `collections`, `dues`) are `0` or omitted. | **PASS** (verified in `reports.service.spec.ts`). |
| **ST-ROLE-03** | Unauthorized Staff Management | Log in as Doctor in Clinic A; send `POST /clinics/my-clinic/staff` to create new admin. | HTTP 403 Forbidden (`Forbidden resource`). | **PASS** (verified in `clinics.service.spec.ts`). |
| **ST-ROLE-04** | Unauthorized Invoice Void | Log in as Receptionist in Clinic A; send `POST /billing/invoices/<id>/void`. | HTTP 403 Forbidden. | **FAIL** in current codebase (SEC-003: missing `@Roles` guard). |
| **ST-ROLE-05** | Unauthorized Payment Refund | Log in as Receptionist in Clinic A; send `POST /billing/payments/<id>/refund`. | HTTP 403 Forbidden. | **FAIL** in current codebase (SEC-003: missing `@Roles` guard). |
| **ST-ROLE-06** | Unauthorized Tariff Modification | Log in as Receptionist in Clinic A; send `POST /billing/tariffs`. | HTTP 403 Forbidden. | **FAIL** in current codebase (SEC-003: missing `@Roles` guard). |

---

### Category 4: File Upload & Storage Security Tests

| Test Case ID | Test Objective | Execution Steps | Expected Outcome | Pass/Fail Criteria |
| :--- | :--- | :--- | :--- | :---: |
| **ST-FILE-01** | Prohibited Extension Upload | Upload file named `malware.exe` containing binary payload. | HTTP 400 Bad Request (`File type ".exe" is prohibited`). | **PASS** (verified in `storage.service.spec.ts`). |
| **ST-FILE-02** | Script Upload Rejection | Upload file named `script.php` or `exploit.sh`. | HTTP 400 Bad Request. | **PASS** (verified in `storage.service.spec.ts`). |
| **ST-FILE-03** | Disguised Executable Upload | Rename an `.exe` file to `xray.png` (PNG extension but executable header); upload. | HTTP 400 Bad Request (`Magic bytes inspection failed`). | **PASS** (verified in `storage.service.spec.ts`). |
| **ST-FILE-04** | Oversized Document Upload | Upload 30 MB radiograph file. | HTTP 400 Bad Request (`File exceeds maximum permitted size of 25 MB`). | **PASS** (verified in `storage.service.spec.ts`). |
| **ST-FILE-05** | Pre-Signed URL Expiration | Generate signed URL for document; wait 901 seconds; attempt download via curl. | HTTP 403 Forbidden from S3 (`Request has expired`). | **PASS** if S3 rejects expired URL. |

---

### Category 5: Concurrency & Transactional Invariant Tests

| Test Case ID | Test Objective | Execution Steps | Expected Outcome | Pass/Fail Criteria |
| :--- | :--- | :--- | :--- | :---: |
| **ST-TX-01** | Duplicate Inventory Deduction | Fire 5 simultaneous `POST /inventory/consume` requests with the same `operationId`. | Exactly 1 request decrements stock; 4 requests receive cached success without double decrement. | **PASS** (verified in `inventory.service.spec.ts`). |
| **ST-TX-02** | Atomic Treatment Invoicing | Generate invoice from treatment plan procedure; verify plan procedure is marked `BILLED`. | Procedure `billingStatus` is atomically updated to `BILLED`. | **PASS** (verified in `treatmentPlansE2EWorkflow.test.jsx`). |
| **ST-TX-03** | Double-Payment Race Condition | Issue two concurrent payments totaling more than `balanceDue` on an invoice. | Database transaction locks row; second payment rejects or transitions status cleanly. | **PASS** (verified in `billing.service.spec.ts`). |

