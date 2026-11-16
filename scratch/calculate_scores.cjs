const fs = require('fs');

const features = [
  // Appointments (5) - Teammate WIP
  { id: 'appt.new', name: 'Book appointment', area: 'Appointments', status: 'IMPLEMENTED — UNVERIFIED', owner: 'Teammate', tested: false, note: 'Calendar UI works client-side; backend integration in progress by teammate' },
  { id: 'appt.detail', name: 'Appointment record view', area: 'Appointments', status: 'IMPLEMENTED — UNVERIFIED', owner: 'Teammate', tested: false, note: 'Reschedule/cancel modal works in clientStore; teammate binding to API' },
  { id: 'appt.queue', name: 'Live queue', area: 'Appointments', status: 'IMPLEMENTED — UNVERIFIED', owner: 'Teammate', tested: false, note: 'Queue triage UI functional in memory' },
  { id: 'appt.calendar', name: 'Calendar', area: 'Appointments', status: 'IMPLEMENTED — UNVERIFIED', owner: 'Teammate', tested: false, note: 'Doctor schedule view renders; teammate integrating backend sync' },
  { id: 'appt.enquiries', name: 'Missed enquiries', area: 'Appointments', status: 'COMPLETE — VERIFIED', owner: 'Teammate', tested: true, note: 'EnquiriesController and UI functional' },

  // Patients (8)
  { id: 'pat.list', name: 'Patients list', area: 'Patients', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'Directory search, filters, pagination verified' },
  { id: 'pat.new', name: 'Register patient', area: 'Patients', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'Registration form, dark mode contrast fixed' },
  { id: 'pat.profile', name: 'Patient profile', area: 'Patients', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: '360 patient hub with 6 clinical tabs' },
  { id: 'pat.timeline', name: 'Visit timeline', area: 'Patients', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'Longitudinal clinical history feed' },
  { id: 'pat.documents', name: 'Patient documents', area: 'Patients', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'AWS/Neon S3 Cloud Storage integration verified' },
  { id: 'pat.consents', name: 'Consent records', area: 'Patients', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'Canvas digital signature, PDF export' },
  { id: 'pat.pending', name: 'Pending treatments', area: 'Patients', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'Pending treatment triage list' },
  { id: 'pat.toothchart', name: 'Tooth chart', area: 'Patients', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'Interactive adult/pediatric odontogram with FDI surfaces' },

  // Clinical (5)
  { id: 'clin.prescriptions', name: 'Digital prescriptions', area: 'Clinical', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'Formulary Rx writer, dosage, duration, letterhead print' },
  { id: 'clin.plans', name: 'Treatment plans', area: 'Clinical', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'Phases 1-6 complete: multi-stage plans, dentist assignment, direct billing' },
  { id: 'clin.notes', name: 'Clinical notes', area: 'Clinical', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'SOAP consultation notes, addenda audit log, signing' },
  { id: 'clin.orders', name: 'Pathology & X-ray orders', area: 'Clinical', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'Redirects to patient-centered diagnostic vault' },
  { id: 'clin.estimates', name: 'Treatment cost estimate', area: 'Clinical', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'Financial estimate revisions and patient acceptance' },

  // Billing (7)
  { id: 'bill.invoices', name: 'Itemised invoices', area: 'Billing', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'Invoice directory, status filter, print modal' },
  { id: 'bill.invoice-new', name: 'New invoice', area: 'Billing', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'Composer with tariffs, GST tax engine, discounts' },
  { id: 'bill.dues', name: 'Pending dues list', area: 'Billing', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'Aging buckets, patient balance tracking' },
  { id: 'bill.collection', name: 'Daily collection', area: 'Billing', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'Daily payment reconciliation by cash/card/UPI' },
  { id: 'bill.price-list', name: 'Service price list', area: 'Billing', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'Clinic service tariff catalog' },
  { id: 'bill.payments', name: 'Payment history', area: 'Billing', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'Comprehensive receipt ledger' },
  { id: 'bill.expenses', name: 'Expense tracking', area: 'Billing', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'Operational practice expenses tracking' },

  // Accounts (8) - Roadmap
  { id: 'acc.ledgers', name: 'Accounts (ledgers)', area: 'Accounts', status: 'FRONTEND ONLY', owner: 'Core Team', tested: false, note: 'UI Placeholder / Roadmap v2' },
  { id: 'acc.entries', name: 'Entries (vouchers)', area: 'Accounts', status: 'FRONTEND ONLY', owner: 'Core Team', tested: false, note: 'UI Placeholder / Roadmap v2' },
  { id: 'acc.day-book', name: 'Day book', area: 'Accounts', status: 'FRONTEND ONLY', owner: 'Core Team', tested: false, note: 'UI Placeholder / Roadmap v2' },
  { id: 'acc.profit-loss', name: 'Profit and loss', area: 'Accounts', status: 'FRONTEND ONLY', owner: 'Core Team', tested: false, note: 'UI Placeholder / Roadmap v2' },
  { id: 'acc.trial-balance', name: 'Trial balance', area: 'Accounts', status: 'FRONTEND ONLY', owner: 'Core Team', tested: false, note: 'UI Placeholder / Roadmap v2' },
  { id: 'acc.balance-sheet', name: 'Balance sheet', area: 'Accounts', status: 'FRONTEND ONLY', owner: 'Core Team', tested: false, note: 'UI Placeholder / Roadmap v2' },
  { id: 'acc.gst', name: 'GST report', area: 'Accounts', status: 'FRONTEND ONLY', owner: 'Core Team', tested: false, note: 'UI Placeholder / Roadmap v2' },
  { id: 'acc.tally-export', name: 'Export to Tally', area: 'Accounts', status: 'FRONTEND ONLY', owner: 'Core Team', tested: false, note: 'UI Placeholder / Roadmap v2' },

  // Inventory (2)
  { id: 'inv.items', name: 'Items & Stock', area: 'Inventory', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'SKU catalog, batch tracking, expiry, low-stock alerts' },
  { id: 'inv.movements', name: 'Stock Movements & Audit', area: 'Inventory', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'Audit trail, idempotent consumption via operationId' },

  // WhatsApp (3) - Roadmap
  { id: 'wa.automation', name: 'WhatsApp automation', area: 'WhatsApp', status: 'MOCK / LOCAL ONLY', owner: 'Core Team', tested: false, note: 'Placeholder UI; direct wa.me link works from UI' },
  { id: 'wa.log', name: 'Message log', area: 'WhatsApp', status: 'MOCK / LOCAL ONLY', owner: 'Core Team', tested: false, note: 'Placeholder UI' },
  { id: 'wa.recalls', name: 'Recall reminders', area: 'WhatsApp', status: 'MOCK / LOCAL ONLY', owner: 'Core Team', tested: false, note: 'Placeholder UI' },

  // Website (2) - Roadmap
  { id: 'web.settings', name: 'Clinic website settings', area: 'Website', status: 'MOCK / LOCAL ONLY', owner: 'Core Team', tested: false, note: 'Placeholder UI' },
  { id: 'web.approvals', name: 'Approval inbox', area: 'Website', status: 'MOCK / LOCAL ONLY', owner: 'Core Team', tested: false, note: 'Placeholder UI' },

  // Reports (6)
  { id: 'rep.revenue', name: 'Revenue report', area: 'Reports', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'Backend SQL metrics, auth gated, retry error state' },
  { id: 'rep.doctors', name: 'Doctor-wise performance', area: 'Reports', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'Doctor revenue, patient load, procedure counts' },
  { id: 'rep.treatments', name: 'Treatment breakdown', area: 'Reports', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'Procedure volume and specialty breakdown' },
  { id: 'rep.followups', name: 'Follow-ups & bookings', area: 'Reports', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'Patient recall queue, WhatsApp deep link, contact status' },
  { id: 'rep.income-expense', name: 'Income vs expense', area: 'Reports', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'Redirects to authoritative revenue report' },
  { id: 'rep.conversion', name: 'Booking conversion', area: 'Reports', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'Redirects to follow-ups workspace' },

  // Settings (8)
  { id: 'set.clinic', name: 'Clinic profile', area: 'Settings', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'Clinic identity, address, tax details, letterhead' },
  { id: 'set.staff', name: 'Staff management', area: 'Settings', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'Team directory, role assignment, invite staff' },
  { id: 'set.clinical-config', name: 'Clinical configuration', area: 'Settings', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'Clinical master picklists, custom items' },
  { id: 'set.security', name: 'Security & device verification', area: 'Settings', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'Password change API, session management' },
  { id: 'set.privacy', name: 'Privacy & consent controls', area: 'Settings', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'Data retention, GDPR/DISHA compliance policies' },
  { id: 'set.data', name: 'Data export and import', area: 'Settings', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'JSON backup export, audit trail' },
  { id: 'set.activity', name: 'Activity log', area: 'Settings', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'Clinic-wide audit trail with role filtering' },
  { id: 'set.plan', name: 'Subscription & plan', area: 'Settings', status: 'COMPLETE — VERIFIED', owner: 'Core Team', tested: true, note: 'Plan tiers, billing cycle, license status' },
];

console.log('Total Launch Features:', features.length);
const counts = {};
features.forEach(f => {
  counts[f.status] = (counts[f.status] || 0) + 1;
});
console.log('Status counts:', counts);

// Core Dental Practice Management Scope (excluding Roadmap items: Accounts, WhatsApp, Website = 13 items)
const coreFeatures = features.filter(f => !['Accounts', 'WhatsApp', 'Website'].includes(f.area));
console.log('\nCore PMS features count:', coreFeatures.length);
const coreCounts = {};
coreFeatures.forEach(f => {
  coreCounts[f.status] = (coreCounts[f.status] || 0) + 1;
});
console.log('Core PMS status counts:', coreCounts);

