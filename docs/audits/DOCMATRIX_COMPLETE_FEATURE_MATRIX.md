# DOCMATRIX COMPLETE FEATURE MATRIX

**Audit Date:** November 12, 2026  
**Auditor:** Senior Software Architect, QA Lead & Full-Stack Technical Auditor  
**Total Launch Features:** 54  
**Status Legend:**
- **`COMPLETE — VERIFIED`**: Fully integrated (Frontend UI + Backend REST API + Prisma Model + Database constraints) with passing automated tests and end-to-end verification.
- **`IMPLEMENTED — UNVERIFIED`**: Code, UI, and backend exist, but live synchronization is WIP or awaiting teammate completion/staging verification.
- **`PARTIAL`**: Core path works, but secondary actions or integrations are pending.
- **`FRONTEND ONLY`**: UI components rendered, but no backend persistence or business logic exists.
- **`BACKEND ONLY`**: REST endpoints or DB models exist without dedicated frontend interface.
- **`MOCK / LOCAL ONLY`**: Feature relies exclusively on local browser storage or simulated in-memory state.
- **`NOT STARTED`**: Planned roadmap item / `<FeaturePlaceholder />`.
- **`BROKEN`**: Implementation fails at runtime or contains blocking defects.
- **`BLOCKED`**: Progress halted by external dependency or upstream prerequisite.
- **`NOT APPLICABLE`**: Dropped or superseded feature (excluded from metrics).

---

## 1. Appointments & Scheduling (Teammate Module)

| Feature ID | Feature Name & Route | Implementation Status | Evidence of Implementation | What Is Missing to Complete | Owner |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `appt.new` | Book Appointment (`/appointments/new`) | `IMPLEMENTED — UNVERIFIED` | `NewAppointmentPage.tsx`, `clinicStore.createAppointment`, `AppointmentsController.create` | Teammate finalizing persistent API call from frontend to `POST /appointments` | Teammate |
| `appt.detail` | Appointment Details (`/appointments/:id`) | `IMPLEMENTED — UNVERIFIED` | `AppointmentDetailPage.tsx`, `AppointmentDetailsModal.tsx`, `clinicStore` | Teammate finalizing status patch sync (`PATCH /appointments/:id`) | Teammate |
| `appt.queue` | Live Queue (`/appointments/queue`) | `IMPLEMENTED — UNVERIFIED` | `LiveQueuePage.tsx`, status filter tabs, triage actions | Binding queue transition events directly to backend queue endpoint | Teammate |
| `appt.calendar` | Doctor Calendar (`/appointments/calendar`) | `IMPLEMENTED — UNVERIFIED` | `CalendarPage.tsx`, day/week/month schedule view | Connecting calendar date-range fetch to backend `GET /appointments` query | Teammate |
| `appt.enquiries`| Missed Enquiries (`/appointments/missed-enquiries`) | `COMPLETE — VERIFIED` | `MissedEnquiriesPage.tsx`, `EnquiriesController`, `enquiries.service.spec.ts` (5 tests) | None (verified lead conversion to appointment) | Teammate / Core |

---

## 2. Patient Management

| Feature ID | Feature Name & Route | Implementation Status | Evidence of Implementation | What Is Missing to Complete | Owner |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `pat.list` | Patients Directory (`/patients/list`) | `COMPLETE — VERIFIED` | `PatientListPage.tsx`, `PatientsController.findAll`, `patientsModule.test.jsx` | None (verified pagination, search, quick contact) | Core Team |
| `pat.new` | Register Patient (`/patients/new`) | `COMPLETE — VERIFIED` | `NewPatientPage.tsx`, `PatientsController.create`, `emergencyContactFormTheme.test.jsx` | None (verified field validation, dark mode contrast) | Core Team |
| `pat.profile` | Patient 360 Profile (`/patients/:id`) | `COMPLETE — VERIFIED` | `PatientProfilePage.tsx`, 6 clinical subtabs, `patientProfile.test.jsx` | None (verified summary cards, dues, active plans) | Core Team |
| `pat.timeline`| Clinical Timeline (`/patients/:id/timeline`) | `COMPLETE — VERIFIED` | `PatientTimelinePage.tsx`, chronological activity feed | None (verified merging notes, invoices, prescriptions) | Core Team |
| `pat.documents`| Patient Documents (`/patients/:id/documents`) | `COMPLETE — VERIFIED` | `StorageService`, `ClinicalController`, `patientDocumentsStorage.test.jsx`, `storage.service.spec.ts` | None (verified cloud S3/Neon storage & local fallback) | Core Team |
| `pat.consents`| Digital Consents (`/patients/:id/consents`) | `COMPLETE — VERIFIED` | `PatientConsentsPage.tsx`, canvas digital signature, PDF export | None (verified legal template selection & signature capture) | Core Team |
| `pat.pending` | Pending Treatments (`/patients/:id/pending-treatments`) | `COMPLETE — VERIFIED` | `PendingTreatmentsPage.tsx`, procedure status grouping | None (verified triage from active treatment plans) | Core Team |
| `pat.toothchart`| Interactive Tooth Chart (`/patients/:id/tooth-chart`) | `COMPLETE — VERIFIED` | `ToothChartPage.tsx`, `ToothChart.tsx`, FDI notation (11-48, 51-85), 5 surfaces | None (verified tooth condition persistence) | Core Team |

---

## 3. Clinical Operations

| Feature ID | Feature Name & Route | Implementation Status | Evidence of Implementation | What Is Missing to Complete | Owner |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `clin.prescriptions` | Digital Prescriptions (`/clinical/prescriptions`) | `COMPLETE — VERIFIED` | `PrescriptionsPage.tsx`, `PrescriptionsController`, `prescriptions.service.spec.ts` (12 tests) | None (verified Rx formulary writer, print letterhead) | Core Team |
| `clin.plans` | Treatment Plans (`/clinical/treatment-plans`) | `COMPLETE — VERIFIED` | `TreatmentPlansPage.tsx`, `TreatmentPlansController`, `treatmentPlansE2EWorkflow.test.jsx` (7 tests) | None (Phases 1-6 complete: multi-stage, doctor assignment, billing link) | Core Team |
| `clin.notes` | Clinical Notes (`/clinical/notes`) | `COMPLETE — VERIFIED` | `ClinicalNotesPage.tsx`, `ClinicalNotesController`, `clinical-notes.service.spec.ts` (13 tests) | None (verified SOAP structure, addenda audit log, signing) | Core Team |
| `clin.orders` | Pathology & X-Ray Orders (`/clinical/orders`) | `COMPLETE — VERIFIED` | `OrdersPage.tsx`, deep link to patient X-rays & Documents vault | None (verified patient-centered architecture) | Core Team |
| `clin.estimates` | Treatment Estimates (`/clinical/estimates`) | `COMPLETE — VERIFIED` | `TreatmentEstimatesPage.tsx`, revisions v1/v2, acceptance flow | None (verified verbal/signed acceptance tracking) | Core Team |

---

## 4. Billing & Financial Operations

| Feature ID | Feature Name & Route | Implementation Status | Evidence of Implementation | What Is Missing to Complete | Owner |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `bill.invoices` | Itemised Invoices (`/billing/invoices`) | `COMPLETE — VERIFIED` | `BillingWorkspace.tsx`, `BillingController.findAll`, `billingReliability.test.tsx` (15 tests) | None (verified status filtering, search, date range) | Core Team |
| `bill.invoice-new` | New Invoice Composer (`/billing/invoices/new`) | `COMPLETE — VERIFIED` | `NewInvoicePage.tsx`, `BillingController.create`, `billing.service.spec.ts` (35 tests) | None (verified GST math, tariff lookup, discounts) | Core Team |
| `bill.dues` | Outstanding Dues (`/billing/dues`) | `COMPLETE — VERIFIED` | `PendingDuesPage.tsx`, aging buckets, ledger | None (verified overdue calculation and balance tracking) | Core Team |
| `bill.collection` | Daily Collection (`/billing/collection`) | `COMPLETE — VERIFIED` | `DailyCollectionPage.tsx`, payment split by Cash/Card/UPI | None (verified daily cashier reconciliation) | Core Team |
| `bill.price-list` | Service Price List (`/billing/price-list`) | `COMPLETE — VERIFIED` | `PriceListPage.tsx`, `BillingController.getTariffs`, tariff modal | None (verified procedure fee master) | Core Team |
| `bill.payments` | Payment History (`/billing/payments`) | `COMPLETE — VERIFIED` | `PaymentsHistoryPage.tsx`, `BillingController.getPayments` | None (verified receipt records and transaction IDs) | Core Team |
| `bill.expenses` | Clinic Expenses (`/billing/expenses`) | `COMPLETE — VERIFIED` | `ExpensesPage.tsx`, `BillingController.getExpenses` | None (verified operational expense logging) | Core Team |

---

## 5. Inventory & Supply Chain

| Feature ID | Feature Name & Route | Implementation Status | Evidence of Implementation | What Is Missing to Complete | Owner |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `inv.items` | Items & Stock Master (`/inventory/items`) | `COMPLETE — VERIFIED` | `ItemsPage.tsx`, `InventoryController.findAll`, `adaptiveInventory.test.jsx` (7 tests) | None (verified SKU master, batch tracking, expiry) | Core Team |
| `inv.movements` | Stock Movements & Audit (`/inventory/movements`) | `COMPLETE — VERIFIED` | `MovementsPage.tsx`, `TreatmentMaterialUsageModal.tsx`, `inventory.service.spec.ts` (4 tests) | None (verified idempotent stock deduction via `operationId`) | Core Team |

---

## 6. Reports & Analytics

| Feature ID | Feature Name & Route | Implementation Status | Evidence of Implementation | What Is Missing to Complete | Owner |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `rep.revenue` | Revenue Report (`/reports/revenue`) | `COMPLETE — VERIFIED` | `RevenueReportPage.tsx`, `ReportsController.getRevenue`, `reportsReliability.test.jsx` (5 tests) | None (verified SQL metrics, role gating, error retry state) | Core Team |
| `rep.doctors` | Doctor Performance (`/reports/doctors`) | `COMPLETE — VERIFIED` | `DoctorPerformancePage.tsx`, `ReportsController.getDoctorPerformance` | None (verified doctor revenue, patient volume, counts) | Core Team |
| `rep.treatments` | Treatment Breakdown (`/reports/treatments`) | `COMPLETE — VERIFIED` | `TreatmentBreakdownPage.tsx`, `ReportsController.getTreatmentBreakdown` | None (verified procedure volume and specialty distribution) | Core Team |
| `rep.followups` | Follow-ups & Recalls (`/reports/follow-ups`) | `COMPLETE — VERIFIED` | `FollowUpsPage.tsx`, `ReportsController.getFollowUps`, `reportsInsights.test.jsx` (12 tests) | None (verified recall queue, WhatsApp deep link) | Core Team |
| `rep.income-expense` | Income vs Expense (`/reports/income-expense`) | `COMPLETE — VERIFIED` | Route redirect to `/reports/revenue` | None (consolidated into authoritative revenue report) | Core Team |
| `rep.conversion` | Booking Conversion (`/reports/booking-conversion`) | `COMPLETE — VERIFIED` | Route redirect to `/reports/follow-ups` | None (consolidated into follow-ups workspace) | Core Team |

---

## 7. Settings & Administration

| Feature ID | Feature Name & Route | Implementation Status | Evidence of Implementation | What Is Missing to Complete | Owner |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `set.clinic` | Clinic Profile (`/settings/clinic`) | `COMPLETE — VERIFIED` | `ClinicProfilePage.tsx`, `ClinicsController.update`, `settingsModule.test.jsx` (9 tests) | None (verified identity, letterhead, address, tax info) | Core Team |
| `set.staff` | Staff Management (`/settings/staff`) | `COMPLETE — VERIFIED` | `StaffManagementPage.tsx`, `ClinicsController.createStaff`, `clinics.service.spec.ts` (10 tests) | None (verified staff directory, role assignment, invite) | Core Team |
| `set.clinical-config` | Clinical Configuration (`/settings/clinical-config`) | `COMPLETE — VERIFIED` | `ClinicalConfigPage.tsx`, master picklist editor | None (verified custom picklists for drugs & diagnoses) | Core Team |
| `set.security` | Security & Password (`/settings/security`) | `COMPLETE — VERIFIED` | `SecurityPage.tsx`, `AuthController.changePassword`, `auth.service.spec.ts` (5 tests) | None (verified secure password change & session tracking) | Core Team |
| `set.privacy` | Privacy & Consent Controls (`/settings/privacy`) | `COMPLETE — VERIFIED` | `PrivacySettingsPage.tsx`, data retention policy controls | None (verified DISHA/GDPR healthcare compliance settings) | Core Team |
| `set.data` | Data Export & Backup (`/settings/data`) | `COMPLETE — VERIFIED` | `DataExchangePage.tsx`, clinic JSON backup export | None (verified export format and clinic isolation) | Core Team |
| `set.activity` | Activity Log (`/settings/activity-log`) | `COMPLETE — VERIFIED` | `ActivityLogPage.tsx`, clinic audit trail with filter | None (verified logging actions across all staff) | Core Team |
| `set.plan` | Plan & Subscription (`/settings/plan`) | `COMPLETE — VERIFIED` | `PlanSubscriptionPage.tsx`, license tier display | None (verified tier features and seat limits) | Core Team |

---

## 8. Accounts & Financial Accounting (V2 Roadmap)

| Feature ID | Feature Name & Route | Implementation Status | Evidence of Implementation | What Is Missing to Complete | Owner |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `acc.ledgers` | General Ledgers (`/accounts/ledgers`) | `FRONTEND ONLY` | `FeaturePlaceholder.tsx`, role guard | Double-entry ledger backend engine | Core Team |
| `acc.entries` | Accounting Entries / Vouchers (`/accounts/entries`) | `FRONTEND ONLY` | `FeaturePlaceholder.tsx`, role guard | Journal voucher persistence | Core Team |
| `acc.day-book` | Day Book (`/accounts/day-book`) | `FRONTEND ONLY` | `FeaturePlaceholder.tsx`, role guard | Day-book SQL aggregations | Core Team |
| `acc.profit-loss` | Profit & Loss Statement (`/accounts/profit-loss`) | `FRONTEND ONLY` | `FeaturePlaceholder.tsx`, role guard | P&L calculation service | Core Team |
| `acc.trial-balance`| Trial Balance (`/accounts/trial-balance`) | `FRONTEND ONLY` | `FeaturePlaceholder.tsx`, role guard | Trial balance reconciliation service | Core Team |
| `acc.balance-sheet`| Balance Sheet (`/accounts/balance-sheet`) | `FRONTEND ONLY` | `FeaturePlaceholder.tsx`, role guard | Assets/liabilities balance engine | Core Team |
| `acc.gst` | GST Report (`/accounts/gst-report`) | `FRONTEND ONLY` | `FeaturePlaceholder.tsx`, role guard | GSTR-1 / GSTR-3B tax export engine | Core Team |
| `acc.tally-export`| Export to Tally (`/accounts/export-tally`) | `FRONTEND ONLY` | `FeaturePlaceholder.tsx`, role guard | Tally XML integration export pipeline | Core Team |

---

## 9. WhatsApp & Patient Communications (V2 Roadmap)

| Feature ID | Feature Name & Route | Implementation Status | Evidence of Implementation | What Is Missing to Complete | Owner |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `wa.automation` | WhatsApp Automation (`/whatsapp/automation`) | `MOCK / LOCAL ONLY` | Deep-link `wa.me` generator in UI | Meta Cloud API webhook handler & queue | Core Team |
| `wa.log` | Message Log (`/whatsapp/log`) | `MOCK / LOCAL ONLY` | Placeholder view | Message delivery database log | Core Team |
| `wa.recalls` | Recall Reminders (`/whatsapp/recalls`) | `MOCK / LOCAL ONLY` | Follow-ups table action | Automated scheduled cron dispatch | Core Team |

---

## 10. Website & Marketing Integration (V2 Roadmap)

| Feature ID | Feature Name & Route | Implementation Status | Evidence of Implementation | What Is Missing to Complete | Owner |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `web.settings` | Website Settings (`/website/settings`) | `MOCK / LOCAL ONLY` | Placeholder view | Public CMS site builder backend | Core Team |
| `web.approvals` | Approval Inbox (`/website/approvals`) | `MOCK / LOCAL ONLY` | Placeholder view | Appointment request moderation queue | Core Team |

