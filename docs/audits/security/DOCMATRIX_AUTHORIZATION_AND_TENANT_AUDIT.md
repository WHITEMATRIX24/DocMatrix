# DOCMATRIX AUTHORIZATION & MULTI-TENANT ISOLATION AUDIT

**Date of Audit:** November 12, 2026  
**Auditor:** Senior Application Security Engineer & NestJS Security Specialist  
**Frameworks:** OWASP API Security Top 10 (API1: BOLA, API5: BFLA), OWASP ASVS V4 (Access Control)  
**Scope:** Route-by-route authorization matrix, role permission hierarchy, tenant boundary enforcement, and object-level access control.

---

## 1. Application Role Permission Hierarchy

DocMatrix defines 8 clinical and administrative staff roles under the `StaffRole` enum in PostgreSQL/Prisma:

1. **`ORGANIZATION_ADMIN`**: Full administrative, clinical, and financial authority across the entire organization.
2. **`BRANCH_ADMIN`**: Branch-level administrative, clinical, and financial management.
3. **`ACCOUNTANT`**: Dedicated financial management (Invoices, Tariffs, Collections, Revenue Reports).
4. **`DOCTOR`**: Clinical provider (Odontogram, SOAP Notes, Prescriptions, Treatment Plans, Estimates, Patient Files).
5. **`NURSE`**: Clinical assistant (Patient vitals, material usage logging, appointment check-ins).
6. **`LAB_TECHNICIAN`**: Diagnostic records, prosthesis orders, and radiograph attachments.
7. **`PHARMACIST`**: Medication dispensing and formulary verification.
8. **`RECEPTIONIST`**: Patient registration, appointment scheduling, queue triage, and non-financial recall follow-ups.

---

## 2. Route-by-Route Authorization & Multi-Tenant Matrix

| Controller & Route | Method | Authentication | Authorized Roles | Tenant Scope Mechanism | Object Authorization Check | Risk / Gaps |
| :--- | :---: | :---: | :--- | :--- | :--- | :--- |
| **`AuthController`** | | | | | | |
| `/auth/login` | POST | Public | Anyone | N/A | Authenticates credentials | Rate limiting missing |
| `/auth/register-clinic` | POST | Public | Anyone | Creates new `Clinic` | Atomically creates owner user | Email enumeration risk |
| `/auth/profile` | GET | Bearer JWT | All authenticated | `user.id` from token | Returns caller's profile | Secure |
| `/auth/change-password`| POST | Bearer JWT | All authenticated | `user.id` from token | Requires `currentPassword` match | Secure |
| `/auth/revoke-sessions`| POST | Bearer JWT | All authenticated | `user.id` from token | Writes disk log only | Ineffective revocation |
| **`PatientsController`** | | | | | | |
| `/patients` | GET | Bearer JWT | All authenticated | `where: { clinicId }` | Filtered list | Secure |
| `/patients` | POST | Bearer JWT | All authenticated | Injects `user.clinicId` | Creates patient under clinic | Secure |
| `/patients/:id` | GET | Bearer JWT | All authenticated | `where: { clinicId, id }`| Scoped by clinic | Secure |
| `/patients/:id` | PATCH | Bearer JWT | All authenticated | `where: { clinicId, id }`| Scoped by clinic | Secure |
| `/patients/:id` | DELETE| Bearer JWT | All authenticated | `where: { clinicId, id }`| Soft delete (`isActive: false`) | Secure |
| **`ClinicalController`** | | | | | | |
| `/clinical/tooth-charts`| GET | Bearer JWT | All authenticated | `where: { clinicId }` | Clinic-wide odontograms | Secure |
| `/clinical/documents` | GET | Bearer JWT | All authenticated | `where: { clinicId }` | Clinic-wide documents | Secure |
| `/clinical/consents` | GET | Bearer JWT | All authenticated | `where: { clinicId }` | Clinic-wide consents | Secure |
| `/patients/:id/tooth-chart`| GET | Bearer JWT | All authenticated | Resolves patient by clinic | Scoped to patient & clinic | Secure |
| `/patients/:id/tooth-chart`| PUT | Bearer JWT | All authenticated | Resolves patient by clinic | Scoped to patient & clinic | Secure |
| `/patients/:id/documents`| POST | Bearer JWT | All authenticated | Resolves patient by clinic | Magic bytes + S3 upload | File size capped at 25MB |
| `/patients/:id/documents/:docId/signed-url` | GET | Bearer JWT | All authenticated | `where: { id, clinicId, patientId }` | 15-minute signed URL | Secure |
| `/patients/:id/documents/:docId/download` | GET | Bearer JWT | All authenticated | `where: { id, clinicId, patientId }` | Streams document | Secure |
| `/patients/:id/documents/:docId` | DELETE | Bearer JWT | All authenticated | `where: { id, clinicId, patientId }` | Deletes record & S3 object | Secure |
| **`TreatmentPlansController`** | | | | | | |
| `/clinical/treatment-plans` | GET | Bearer JWT | All authenticated | `where: { clinicId }` | Filtered by clinic | Secure |
| `/clinical/treatment-plans` | POST | Bearer JWT | All authenticated | Injects `user.clinicId` | Verified patient ownership | Secure |
| `/clinical/treatment-plans/:id` | GET | Bearer JWT | All authenticated | `where: { id, clinicId }`| Scoped to clinic | Secure |
| `/clinical/treatment-plans/:id` | PATCH | Bearer JWT | All authenticated | `where: { id, clinicId }`| Scoped to clinic | Missing role check |
| `/clinical/treatment-plans/:id/revisions` | POST | Bearer JWT | All authenticated | `where: { id, clinicId }`| Creates estimate version | Secure |
| **`BillingController`** | | | | | | |
| `/billing/dashboard` | GET | Bearer JWT | All authenticated | `where: { clinicId }` | Aggregated metrics | ⚠️ No role guard |
| `/billing/invoices` | GET | Bearer JWT | All authenticated | `where: { clinicId }` | Invoices list | ⚠️ No role guard |
| `/billing/invoices/draft`| POST | Bearer JWT | All authenticated | Injects `user.clinicId` | Draft invoice | ⚠️ Missing role guard |
| `/billing/invoices/issue`| POST | Bearer JWT | All authenticated | Injects `user.clinicId` | Issues tax invoice | ⚠️ Missing role guard |
| `/billing/invoices/from-treatment-plan` | POST | Bearer JWT | All authenticated | Injects `user.clinicId` | Invoices planned items | ⚠️ Missing role guard |
| `/billing/invoices/:id/payments` | POST | Bearer JWT | All authenticated | Injects `user.clinicId` | Collects payment | ⚠️ Missing role guard |
| `/billing/invoices/:id/void` | POST | Bearer JWT | All authenticated | `where: { id, clinicId }`| Voids invoice | ⚠️ High Risk: No role guard |
| `/billing/payments/:id/refund` | POST | Bearer JWT | All authenticated | `where: { id, clinicId }`| Issues payment refund | ⚠️ High Risk: No role guard |
| `/billing/tariffs` | POST | Bearer JWT | All authenticated | Injects `user.clinicId` | Creates service tariff | ⚠️ Missing admin guard |
| `/billing/expenses` | POST | Bearer JWT | All authenticated | Injects `user.clinicId` | Logs clinic expense | ⚠️ Missing admin guard |
| **`ReportsController`** | | | | | | |
| `/reports/summary` | GET | Bearer JWT | All authenticated | `user.clinicId` | Redacts money for low roles | Secure |
| `/reports/revenue` | GET | Bearer JWT | `ORGANIZATION_ADMIN`, `BRANCH_ADMIN`, `ACCOUNTANT` | `where: { clinicId }` | Role-gated SQL metrics | Secure |
| `/reports/doctors` | GET | Bearer JWT | All authenticated | `where: { clinicId }` | Doctor load metrics | Secure |
| `/reports/treatments` | GET | Bearer JWT | All authenticated | `where: { clinicId }` | Procedure volume metrics | Secure |
| `/reports/follow-ups` | GET | Bearer JWT | All authenticated | `where: { clinicId }` | Recall list (no money) | Secure |
| **`ClinicsController`** | | | | | | |
| `/clinics/my-clinic` | GET | Bearer JWT | All authenticated | `user.clinicId` | Clinic metadata | Secure |
| `/clinics/my-clinic` | PATCH | Bearer JWT | `ORGANIZATION_ADMIN`, `BRANCH_ADMIN` | `user.clinicId` | Updates clinic details | Secure |
| `/clinics/my-clinic/staff` | GET | Bearer JWT | All authenticated | `where: { clinicId }` | Staff directory | Secure |
| `/clinics/my-clinic/staff` | POST | Bearer JWT | `ORGANIZATION_ADMIN`, `BRANCH_ADMIN` | `user.clinicId` | Invites new staff member | Secure |
| `/clinics/my-clinic/staff/:id` | PATCH | Bearer JWT | `ORGANIZATION_ADMIN`, `BRANCH_ADMIN` | `where: { id, clinicId }`| Updates role/status | Secure |
| `/clinics/my-clinic/staff/:id` | DELETE| Bearer JWT | `ORGANIZATION_ADMIN`, `BRANCH_ADMIN` | `where: { id, clinicId }`| Deletes staff member | Secure |
| `/clinics/my-clinic/clinical-config` | PUT | Bearer JWT | `ORGANIZATION_ADMIN`, `BRANCH_ADMIN` | `user.clinicId` | Picklists configuration | Secure |
| `/clinics/my-clinic/backup` | GET | Bearer JWT | `ORGANIZATION_ADMIN`, `BRANCH_ADMIN` | `user.clinicId` | Full clinic JSON export | Secure |

---

## 3. Broken Object-Level Authorization (BOLA / IDOR) Evaluation

A critical strength of DocMatrix is that **every single service method strictly scopes database operations by `clinicId`**.
- It does not trust a `clinicId` supplied in the request body or query parameter for multi-tenant isolation.
- Instead, it injects `user.clinicId` extracted directly from the verified Bearer JWT payload by `JwtStrategy`.
- Queries on individual resources (e.g., `GET /patients/:id`, `GET /invoices/:id`, `GET /documents/:docId`) use compound lookup queries:
  ```typescript
  const invoice = await this.prisma.invoice.findFirst({
    where: { id, clinicId },
  });
  ```
- If User from Clinic A attempts to query an ID belonging to Clinic B, the query returns `null`, throwing an immediate `NotFoundException('Invoice not found.')`.
- **Verdict on BOLA / Cross-Clinic IDOR:** **IMMUNE (Zero cross-clinic data leakage possible via ID manipulation).**

---

## 4. Broken Function-Level Authorization (BFLA) Evaluation

While cross-clinic isolation is robust, **intra-clinic role permissions in the Billing module represent a confirmed security weakness**:
- Endpoints on `BillingController` (voiding invoices, issuing refunds, creating tariffs, logging expenses) only require `JwtAuthGuard` and `TenantGuard`.
- They do not declare `@Roles(StaffRole.ORGANIZATION_ADMIN, StaffRole.ACCOUNTANT)`.
- Consequently, an authenticated Receptionist or Nurse can issue API requests to `/billing/invoices/:id/void` or `/billing/payments/:id/refund` and successfully execute destructive financial actions.
- **Remediation:** Add `RolesGuard` to `BillingController` and decorate financial write operations with `@Roles(...)`.

