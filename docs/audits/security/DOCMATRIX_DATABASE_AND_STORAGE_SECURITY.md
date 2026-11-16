# DOCMATRIX DATABASE & OBJECT STORAGE SECURITY AUDIT

**Date of Audit:** November 12, 2026  
**Auditor:** Senior Database Architect & Cloud Security Engineer  
**Scope:** PostgreSQL architecture on Neon Serverless, Prisma ORM schema design, transactional integrity, multi-tenant database constraints, AWS/Neon S3 object storage security, and document lifecycle management.

---

## 1. Neon PostgreSQL Architecture & Security

DocMatrix uses PostgreSQL 16 hosted on **Neon Serverless Database**, connected via connection pooling (`PgBouncer`).

### 1. Database Connection & Encryption
- **In-Transit Encryption:** Connection strings strictly mandate TLS encryption via `sslmode=require&connect_timeout=30`. Unencrypted plain-text database connections are rejected.
- **At-Rest Encryption:** Neon Serverless automatically encrypts all underlying SSD storage volumes and automated snapshot archives using AES-256 encryption.
- **Connection Pooling:** Prisma client connects through pooled port 6543 (PgBouncer), mitigating database connection exhaustion under burst traffic.

### 2. Multi-Tenant Relational Modeling & Constraints
Prisma schema enforces tenant isolation at the relational engine level using composite keys:
```prisma
model Patient {
  id          String   @id @default(uuid())
  clinicId    String
  patientCode String
  // ...
  clinic      Clinic   @relation(fields: [clinicId], references: [id], onDelete: Restrict)
  
  @@unique([clinicId, patientCode])
  @@unique([id, clinicId])
  @@index([clinicId, mobile])
}
```
- **Composite Foreign Key References:** Models such as `Appointment`, `ClinicalNote`, `Prescription`, `TreatmentPlan`, and `Invoice` reference `[patientId, clinicId]` against `Patient([id, clinicId])`. This makes it mathematically impossible for a clinic to link a patient from another clinic to its appointments, notes, or invoices.
- **Deletion Behavior (`onDelete: Restrict`):** Core tenant models declare `onDelete: Restrict` on clinic and patient relationships, preventing accidental cascading deletions of patient histories if an administrative action occurs.

### 3. Financial Precision & Number Representation
- All financial balances (`lockedPrice`, `basePrice`, `total`, `balanceDue`, `paidAmount`) are defined as `@db.Decimal(10, 2)` or `@db.Decimal(12, 2)` in PostgreSQL.
- Floating-point arithmetic inaccuracies are completely avoided in database storage.

### 4. Transaction Safety ($transaction)
Atomic multi-record mutations are wrapped in `prisma.$transaction`:
- **Clinic Onboarding:** Creation of `Clinic` and primary administrator `User` executes inside an atomic `$transaction` in `AuthService.registerClinic()`.
- **Treatment Plan Invoicing:** Tagging treatment plan procedures as `BILLED` and creating the corresponding `Invoice` line items executes atomically, eliminating orphaned billing states.
- **Stock Deductions:** Idempotent stock depletion and audit logging execute atomically in `InventoryService.deductStockForTreatment()`.

---

## 2. Object Storage Security (S3 & Local Disk Fallback)

Patient diagnostic imaging (RVG X-rays, panoramic OPGs, CBCT scans) and legal consent documents are managed via [`StorageService`](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/backend/src/storage/storage.service.ts).

### 1. Cloud S3 Storage Architecture
- **Provider:** [`S3StorageProvider`](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/backend/src/storage/s3-storage.provider.ts) utilizing AWS SDK v3 (`@aws-sdk/client-s3`).
- **Bucket Access Controls:** Objects uploaded via `PutObjectCommand` do not specify public read ACLs. The storage bucket is private.
- **Randomized Storage Keys:** Files are saved using non-predictable UUID keys:
  `clinics/<clinicId>/patients/<patientId>/<category>/<uuid>.<ext>`
  This completely eliminates path traversal and resource enumeration attacks.
- **Pre-Signed URLs:** Downloads and in-browser previews utilize AWS pre-signed URLs (`@aws-sdk/s3-request-presigner`) with a strict **900-second (15-minute) expiration**. URLs cannot be reused after expiry.

### 2. Magic-Byte File Validation
To prevent attackers from disguising malicious executables or HTML files as medical images:
- [`StorageService.validateFile`](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/backend/src/storage/storage.service.ts#L61) inspects magic bytes:
  - **PDF:** `%PDF-` (`0x25 0x50 0x44 0x46`)
  - **PNG:** `\x89PNG\r\n\x1a\n`
  - **JPEG:** `\xff\xd8\xff`
  - **WEBP:** `RIFF....WEBP`
  - **DICOM:** 128-byte preamble + `DICM`
- Rejects dangerous file extensions: `.exe`, `.bat`, `.cmd`, `.sh`, `.vbs`, `.js`, `.mjs`, `.php`, `.py`, `.html`, `.htm`, `.svg`, `.jar`, `.dll`, `.msi`.
- Enforces a hard upload limit of **25 MB** per document.

### 3. Local Disk Storage Fallback Risks
When AWS credentials are omitted from the environment, `StorageService` automatically activates [`LocalStorageProvider`](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/backend/src/storage/local-storage.provider.ts), writing files to `backend/storage/documents/<clinicId>/...`.
- *Security Risks in Production:*
  1. Multi-pod/container deployments will not share local disk storage, causing 404 errors when requests hit alternate pods.
  2. Local disk lacks automated cross-region redundancy and object versioning.
  3. If permissions on the server are misconfigured, local files could be exposed.
- *Recommendation:* Require production deployments to supply S3 credentials, prohibiting local disk fallback in `NODE_ENV=production`.

---

## 3. Backup & Disaster Recovery Assessment

1. **Neon Serverless PITR:**  
   Neon provides continuous transaction logging and Point-in-Time Recovery (PITR) with up to 30 days of retention depending on the plan.
2. **Clinic Data JSON Export:**  
   [`ClinicsController.getClinicBackup`](file:///c:/Users/user/Documents/White%20Matrix%20Files/doc%20matrix/Doc_matrix-main/Doc_matrix-main/backend/src/clinics/clinics.controller.ts) allows authorized organization administrators to download a full JSON snapshot of clinic records.
3. **Disaster Recovery Plan Gaps:**  
   The repository does not contain a documented, tested disaster recovery runbook detailing step-by-step restore commands or RTO/RPO targets. A formal DR runbook must be documented prior to public production release.

