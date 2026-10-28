import { StaffRole } from '@/mocks/auth'

export type FeaturePhase = 'launch' | 'v2' | 'later'

export interface FeatureEntry {
  id: string
  name: string
  description: string
  source: string // "Part 1" or "#N" or "fNN"
  phase: FeaturePhase
  area: string
  route: string
  inNav: boolean
  roles?: StaffRole[]
}

/**
 * SINGLE SOURCE OF TRUTH for all DocMatrix Features.
 * Routes, navigation sidebar, breadcrumbs, and placeholders are generated from this registry.
 */
export const FEATURE_REGISTRY: FeatureEntry[] = [
  {
    "id": "appt.new",
    "name": "Book appointment",
    "description": "Book appointment and walk-ins on real clinic hours and doctor availability",
    "source": "Part 1",
    "phase": "launch",
    "area": "Appointments",
    "route": "/appointments/new",
    "inNav": true
  },
  {
    "id": "appt.detail",
    "name": "Appointment record view",
    "description": "Appointment details: reschedule and cancel with a reason, automatic no-show marking",
    "source": "Part 1",
    "phase": "launch",
    "area": "Appointments",
    "route": "/appointments/:id",
    "inNav": false
  },
  {
    "id": "appt.details-list",
    "name": "Appointment details",
    "description": "View appointment records linked to patients in the current session",
    "source": "Part 1",
    "phase": "launch",
    "area": "Appointments",
    "route": "/appointments/details",
    "inNav": true
  },
  {
    "id": "appt.enquiries",
    "name": "Missed enquiries",
    "description": "Missed enquiries (half-finished online bookings)",
    "source": "Part 1",
    "phase": "launch",
    "area": "Appointments",
    "route": "/appointments/missed-enquiries",
    "inNav": true
  },
  {
    "id": "pat.list",
    "name": "Patients list",
    "description": "Patients: permanent ID, search by name, phone or ID",
    "source": "Part 1",
    "phase": "launch",
    "area": "Patients",
    "route": "/patients/list",
    "inNav": true
  },
  {
    "id": "pat.new",
    "name": "Register patient",
    "description": "Register patient with demographic and medical details",
    "source": "Part 1",
    "phase": "launch",
    "area": "Patients",
    "route": "/patients/new",
    "inNav": true
  },
  {
    "id": "pat.profile",
    "name": "Patient profile",
    "description": "Patient profile: medical and dental history, allergy warnings at the top, assigned doctor",
    "source": "Part 1",
    "phase": "launch",
    "area": "Patients",
    "route": "/patients/:id",
    "inNav": false
  },
  {
    "id": "pat.timeline",
    "name": "Visit timeline",
    "description": "Visit-by-visit timeline",
    "source": "Part 1",
    "phase": "launch",
    "area": "Patients",
    "route": "/patients/:id/timeline",
    "inNav": false
  },
  {
    "id": "pat.documents",
    "name": "Patient documents",
    "description": "Documents: X-rays, scans, photos, consent forms",
    "source": "Part 1",
    "phase": "launch",
    "area": "Patients",
    "route": "/patients/:id/documents",
    "inNav": false
  },
  {
    "id": "pat.consents",
    "name": "Consent records",
    "description": "Consent records",
    "source": "Part 1",
    "phase": "launch",
    "area": "Patients",
    "route": "/patients/:id/consents",
    "inNav": false
  },
  {
    "id": "pat.pending",
    "name": "Pending treatments",
    "description": "Pending treatments from earlier visits",
    "source": "#30",
    "phase": "launch",
    "area": "Patients",
    "route": "/patients/:id/pending-treatments",
    "inNav": false
  },
  {
    "id": "pat.toothchart",
    "name": "Tooth chart",
    "description": "Tooth chart: tap a tooth, mark its condition, history for every visit",
    "source": "#1",
    "phase": "launch",
    "area": "Patients",
    "route": "/patients/:id/tooth-chart",
    "inNav": false
  },
  {
    "id": "clin.prescriptions",
    "name": "Digital prescriptions",
    "description": "Digital prescriptions on the clinic letterhead",
    "source": "Part 1",
    "phase": "launch",
    "area": "Clinical",
    "route": "/clinical/prescriptions",
    "inNav": true
  },
  {
    "id": "clin.masterlists",
    "name": "Master lists",
    "description": "Master lists: complaints, findings, diagnoses, medicines, advice",
    "source": "Part 1",
    "phase": "launch",
    "area": "Clinical",
    "route": "/clinical/master-lists",
    "inNav": true
  },
  {
    "id": "clin.notes",
    "name": "Structured clinical notes",
    "description": "Structured clinical notes",
    "source": "Part 1",
    "phase": "launch",
    "area": "Clinical",
    "route": "/clinical/notes",
    "inNav": true
  },
  {
    "id": "clin.orders",
    "name": "Pathology & X-ray orders",
    "description": "Pathology and X-ray orders",
    "source": "Part 1",
    "phase": "launch",
    "area": "Clinical",
    "route": "/clinical/orders",
    "inNav": true
  },
  {
    "id": "clin.plans",
    "name": "Treatment plans",
    "description": "Treatment plans tracked to completion",
    "source": "Part 1",
    "phase": "launch",
    "area": "Clinical",
    "route": "/clinical/treatment-plans",
    "inNav": true
  },
  {
    "id": "clin.estimates",
    "name": "Treatment cost estimate",
    "description": "Treatment cost estimate the patient approves",
    "source": "#2",
    "phase": "launch",
    "area": "Clinical",
    "route": "/clinical/estimates",
    "inNav": true
  },
  {
    "id": "bill.invoices",
    "name": "Itemised invoices",
    "description": "Itemised PDF invoices, part payments, UPI QR on the bill",
    "source": "Part 1",
    "phase": "launch",
    "area": "Billing",
    "route": "/billing/invoices",
    "inNav": true
  },
  {
    "id": "bill.invoice-new",
    "name": "New invoice",
    "description": "New invoice",
    "source": "Part 1",
    "phase": "launch",
    "area": "Billing",
    "route": "/billing/invoices/new",
    "inNav": false
  },
  {
    "id": "bill.dues",
    "name": "Pending dues list",
    "description": "Pending dues list",
    "source": "Part 1",
    "phase": "launch",
    "area": "Billing",
    "route": "/billing/dues",
    "inNav": true
  },
  {
    "id": "bill.collection",
    "name": "Daily collection",
    "description": "Daily collection: cash, card, UPI",
    "source": "Part 1",
    "phase": "launch",
    "area": "Billing",
    "route": "/billing/collection",
    "inNav": true
  },
  {
    "id": "bill.price-list",
    "name": "Service price list",
    "description": "Service price list with offer prices; tag each service as treatment or cosmetic for GST",
    "source": "#18",
    "phase": "launch",
    "area": "Billing",
    "route": "/billing/price-list",
    "inNav": true
  },
  {
    "id": "bill.payments",
    "name": "Payment history",
    "description": "Payment history",
    "source": "Part 1",
    "phase": "launch",
    "area": "Billing",
    "route": "/billing/payments",
    "inNav": true
  },
  {
    "id": "bill.expenses",
    "name": "Expense tracking",
    "description": "Expense tracking",
    "source": "Part 1",
    "phase": "launch",
    "area": "Billing",
    "route": "/billing/expenses",
    "inNav": true
  },
  {
    "id": "acc.ledgers",
    "name": "Accounts (ledgers)",
    "description": "Accounts (ledgers)",
    "source": "#5",
    "phase": "launch",
    "area": "Accounts",
    "route": "/accounts/ledgers",
    "inNav": true,
    "roles": [
      "ORGANIZATION_ADMIN",
      "ACCOUNTANT"
    ]
  },
  {
    "id": "acc.entries",
    "name": "Entries (vouchers)",
    "description": "Entries (vouchers)",
    "source": "#5",
    "phase": "launch",
    "area": "Accounts",
    "route": "/accounts/entries",
    "inNav": true,
    "roles": [
      "ORGANIZATION_ADMIN",
      "ACCOUNTANT"
    ]
  },
  {
    "id": "acc.day-book",
    "name": "Day book",
    "description": "Day book",
    "source": "#5",
    "phase": "launch",
    "area": "Accounts",
    "route": "/accounts/day-book",
    "inNav": true,
    "roles": [
      "ORGANIZATION_ADMIN",
      "ACCOUNTANT"
    ]
  },
  {
    "id": "acc.profit-loss",
    "name": "Profit and loss",
    "description": "Profit and loss",
    "source": "#5",
    "phase": "launch",
    "area": "Accounts",
    "route": "/accounts/profit-loss",
    "inNav": true,
    "roles": [
      "ORGANIZATION_ADMIN",
      "ACCOUNTANT"
    ]
  },
  {
    "id": "acc.trial-balance",
    "name": "Trial balance",
    "description": "Trial balance",
    "source": "#5",
    "phase": "launch",
    "area": "Accounts",
    "route": "/accounts/trial-balance",
    "inNav": true,
    "roles": [
      "ORGANIZATION_ADMIN",
      "ACCOUNTANT"
    ]
  },
  {
    "id": "acc.balance-sheet",
    "name": "Balance sheet",
    "description": "Balance sheet",
    "source": "#5",
    "phase": "launch",
    "area": "Accounts",
    "route": "/accounts/balance-sheet",
    "inNav": true,
    "roles": [
      "ORGANIZATION_ADMIN",
      "ACCOUNTANT"
    ]
  },
  {
    "id": "acc.gst",
    "name": "GST report",
    "description": "GST report",
    "source": "#5",
    "phase": "launch",
    "area": "Accounts",
    "route": "/accounts/gst-report",
    "inNav": true,
    "roles": [
      "ORGANIZATION_ADMIN",
      "ACCOUNTANT"
    ]
  },
  {
    "id": "acc.tally-export",
    "name": "Export to Tally",
    "description": "Export to Tally",
    "source": "#5",
    "phase": "launch",
    "area": "Accounts",
    "route": "/accounts/export-tally",
    "inNav": true,
    "roles": [
      "ORGANIZATION_ADMIN",
      "ACCOUNTANT"
    ]
  },
  {
    "id": "inv.items",
    "name": "Items and stock",
    "description": "Items and stock",
    "source": "#6",
    "phase": "launch",
    "area": "Inventory",
    "route": "/inventory/items",
    "inNav": true
  },
  {
    "id": "inv.movements",
    "name": "Stock in and out",
    "description": "Stock in and out",
    "source": "#6",
    "phase": "launch",
    "area": "Inventory",
    "route": "/inventory/movements",
    "inNav": true
  },
  {
    "id": "inv.alerts",
    "name": "Low-stock & expiry alerts",
    "description": "Low-stock and expiry alerts",
    "source": "#6",
    "phase": "launch",
    "area": "Inventory",
    "route": "/inventory/alerts",
    "inNav": true
  },
  {
    "id": "wa.automation",
    "name": "WhatsApp automation",
    "description": "Confirmation, 24-hour and 2-hour reminders, rescheduled and cancelled notices, welcome message, prescription and invoice PDFs, verification code, on/off switch",
    "source": "Part 1",
    "phase": "launch",
    "area": "WhatsApp",
    "route": "/whatsapp/automation",
    "inNav": true
  },
  {
    "id": "wa.log",
    "name": "Message log",
    "description": "Log of every message",
    "source": "Part 1",
    "phase": "launch",
    "area": "WhatsApp",
    "route": "/whatsapp/log",
    "inNav": true
  },
  {
    "id": "wa.recalls",
    "name": "Recall reminders",
    "description": "Recall reminders, for example 'your 6-month cleaning is due'",
    "source": "#10",
    "phase": "launch",
    "area": "WhatsApp",
    "route": "/whatsapp/recalls",
    "inNav": true
  },
  {
    "id": "web.settings",
    "name": "Clinic website settings",
    "description": "Clinic website: online booking on real slots, gallery with before-and-after sliders, reviews, enquiry form",
    "source": "Part 1",
    "phase": "launch",
    "area": "Website",
    "route": "/website/settings",
    "inNav": true
  },
  {
    "id": "web.approvals",
    "name": "Approval inbox",
    "description": "Approval inbox for online bookings (WhatsApp code verified)",
    "source": "Part 1",
    "phase": "launch",
    "area": "Website",
    "route": "/website/approvals",
    "inNav": true
  },
  {
    "id": "rep.revenue",
    "name": "Revenue report",
    "description": "Revenue",
    "source": "Part 1",
    "phase": "launch",
    "area": "Reports",
    "route": "/reports/revenue",
    "inNav": true
  },
  {
    "id": "rep.doctors",
    "name": "Doctor-wise performance",
    "description": "Doctor-wise performance",
    "source": "Part 1",
    "phase": "launch",
    "area": "Reports",
    "route": "/reports/doctors",
    "inNav": true
  },
  {
    "id": "rep.treatments",
    "name": "Treatment breakdown",
    "description": "Treatment breakdown",
    "source": "Part 1",
    "phase": "launch",
    "area": "Reports",
    "route": "/reports/treatments",
    "inNav": true
  },
  {
    "id": "rep.dues-ageing",
    "name": "Pending dues by age",
    "description": "Pending dues by age",
    "source": "Part 1",
    "phase": "launch",
    "area": "Reports",
    "route": "/reports/dues-ageing",
    "inNav": true
  },
  {
    "id": "rep.income-expense",
    "name": "Income vs expense",
    "description": "Income vs expense",
    "source": "Part 1",
    "phase": "launch",
    "area": "Reports",
    "route": "/reports/income-expense",
    "inNav": true
  },
  {
    "id": "rep.conversion",
    "name": "Booking conversion",
    "description": "Booking conversion",
    "source": "Part 1",
    "phase": "launch",
    "area": "Reports",
    "route": "/reports/booking-conversion",
    "inNav": true
  },
  {
    "id": "set.clinic",
    "name": "Clinic profile",
    "description": "Clinic profile, hours, doctor availability, letterhead",
    "source": "Part 1",
    "phase": "launch",
    "area": "Settings",
    "route": "/settings/clinic",
    "inNav": true,
    "roles": [
      "ORGANIZATION_ADMIN",
      "BRANCH_ADMIN"
    ]
  },
  {
    "id": "set.staff",
    "name": "Staff management",
    "description": "Staff: unlimited logins, person-by-person permissions, instant deactivation, staff profiles",
    "source": "Part 1",
    "phase": "launch",
    "area": "Settings",
    "route": "/settings/staff",
    "inNav": true,
    "roles": [
      "ORGANIZATION_ADMIN",
      "BRANCH_ADMIN"
    ]
  },
  {
    "id": "set.security",
    "name": "Security & device verification",
    "description": "Security: device verification and daily backup status",
    "source": "Part 1",
    "phase": "launch",
    "area": "Settings",
    "route": "/settings/security",
    "inNav": true,
    "roles": [
      "ORGANIZATION_ADMIN",
      "BRANCH_ADMIN"
    ]
  },
  {
    "id": "set.privacy",
    "name": "Privacy & consent controls",
    "description": "Consent screens and data-protection controls, patient data export on request",
    "source": "#25",
    "phase": "launch",
    "area": "Settings",
    "route": "/settings/privacy",
    "inNav": true,
    "roles": [
      "ORGANIZATION_ADMIN",
      "BRANCH_ADMIN"
    ]
  },
  {
    "id": "set.data",
    "name": "Data export and import",
    "description": "Data export and import",
    "source": "#24",
    "phase": "launch",
    "area": "Settings",
    "route": "/settings/data",
    "inNav": true,
    "roles": [
      "ORGANIZATION_ADMIN",
      "BRANCH_ADMIN"
    ]
  },
  {
    "id": "set.activity",
    "name": "Activity log",
    "description": "Activity log: who changed what, and when",
    "source": "#26",
    "phase": "launch",
    "area": "Settings",
    "route": "/settings/activity-log",
    "inNav": true,
    "roles": [
      "ORGANIZATION_ADMIN",
      "BRANCH_ADMIN"
    ]
  },
  {
    "id": "set.plan",
    "name": "Subscription & plan",
    "description": "Subscription and plan",
    "source": "Part 1",
    "phase": "launch",
    "area": "Settings",
    "route": "/settings/plan",
    "inNav": true,
    "roles": [
      "ORGANIZATION_ADMIN",
      "BRANCH_ADMIN"
    ]
  },
  {
    "id": "f04",
    "name": "Digital consent signature on a tablet",
    "description": "Digital consent signature on a tablet",
    "source": "#4",
    "phase": "v2",
    "area": "Roadmap",
    "route": "/coming-soon/f04",
    "inNav": true
  },
  {
    "id": "f06-full",
    "name": "Inventory linked to purchases and treatments",
    "description": "Full inventory linked to purchases and clinical consumption",
    "source": "#6",
    "phase": "v2",
    "area": "Roadmap",
    "route": "/coming-soon/f06-full",
    "inNav": true
  },
  {
    "id": "f08",
    "name": "Payment link on WhatsApp",
    "description": "Send direct payment links over WhatsApp",
    "source": "#8",
    "phase": "v2",
    "area": "Roadmap",
    "route": "/coming-soon/f08",
    "inNav": true
  },
  {
    "id": "f16",
    "name": "Multi-sitting treatment tracker",
    "description": "Multi-sitting treatment tracker (cases of 4 to 12 visits)",
    "source": "#16",
    "phase": "v2",
    "area": "Roadmap",
    "route": "/coming-soon/f16",
    "inNav": true
  },
  {
    "id": "f17",
    "name": "Imaging integration",
    "description": "Imaging integration (X-ray sensors, OPG, intraoral cameras)",
    "source": "#17",
    "phase": "v2",
    "area": "Roadmap",
    "route": "/coming-soon/f17",
    "inNav": true
  },
  {
    "id": "f19",
    "name": "Membership and subscription packages",
    "description": "Membership and subscription packages",
    "source": "#19",
    "phase": "v2",
    "area": "Roadmap",
    "route": "/coming-soon/f19",
    "inNav": true
  },
  {
    "id": "f20",
    "name": "EMI and instalment plans",
    "description": "EMI and instalment plans",
    "source": "#20",
    "phase": "v2",
    "area": "Roadmap",
    "route": "/coming-soon/f20",
    "inNav": true
  },
  {
    "id": "f22",
    "name": "Strong mobile app for staff",
    "description": "Strong mobile app for staff",
    "source": "#22",
    "phase": "v2",
    "area": "Roadmap",
    "route": "/coming-soon/f22",
    "inNav": true
  },
  {
    "id": "f23",
    "name": "Open integrations",
    "description": "Open integrations (payment gateway, accounting, imaging tools)",
    "source": "#23",
    "phase": "v2",
    "area": "Roadmap",
    "route": "/coming-soon/f23",
    "inNav": true
  },
  {
    "id": "f28",
    "name": "Malayalam and English screens and patient messages",
    "description": "Malayalam and English screens and patient messages",
    "source": "#28",
    "phase": "v2",
    "area": "Roadmap",
    "route": "/coming-soon/f28",
    "inNav": true
  },
  {
    "id": "f32",
    "name": "Prescriptions and documents in Indian languages",
    "description": "Prescriptions and documents in Indian languages",
    "source": "#32",
    "phase": "v2",
    "area": "Roadmap",
    "route": "/coming-soon/f32",
    "inNav": true
  },
  {
    "id": "f35",
    "name": "Staff salary and commission on money actually collected",
    "description": "Staff salary and commission on money actually collected",
    "source": "#35",
    "phase": "v2",
    "area": "Roadmap",
    "route": "/coming-soon/f35",
    "inNav": true
  },
  {
    "id": "f37",
    "name": "Multi-session treatment packages",
    "description": "Multi-session treatment packages",
    "source": "#37",
    "phase": "v2",
    "area": "Roadmap",
    "route": "/coming-soon/f37",
    "inNav": true
  },
  {
    "id": "f38",
    "name": "Payment on booking links",
    "description": "Payment on booking links",
    "source": "#38",
    "phase": "v2",
    "area": "Roadmap",
    "route": "/coming-soon/f38",
    "inNav": true
  },
  {
    "id": "f40",
    "name": "Referral tracking",
    "description": "Referral tracking",
    "source": "#40",
    "phase": "v2",
    "area": "Roadmap",
    "route": "/coming-soon/f40",
    "inNav": true
  },
  {
    "id": "f42",
    "name": "Automation rules",
    "description": "Automation rules",
    "source": "#42",
    "phase": "v2",
    "area": "Roadmap",
    "route": "/coming-soon/f42",
    "inNav": true
  },
  {
    "id": "f43",
    "name": "Google Reviews",
    "description": "Google Reviews integration and review requests",
    "source": "#43",
    "phase": "v2",
    "area": "Roadmap",
    "route": "/coming-soon/f43",
    "inNav": true
  },
  {
    "id": "f47",
    "name": "Two-factor login and network restrictions for staff",
    "description": "Two-factor login and network restrictions for staff",
    "source": "#47",
    "phase": "v2",
    "area": "Roadmap",
    "route": "/coming-soon/f47",
    "inNav": true
  },
  {
    "id": "f03",
    "name": "Dental lab tracking",
    "description": "Dental lab tracking",
    "source": "#3",
    "phase": "later",
    "area": "Roadmap",
    "route": "/coming-soon/f03",
    "inNav": true
  },
  {
    "id": "f07",
    "name": "Doctor payout for visiting doctors",
    "description": "Doctor payout for visiting doctors",
    "source": "#7",
    "phase": "later",
    "area": "Roadmap",
    "route": "/coming-soon/f07",
    "inNav": true
  },
  {
    "id": "f09",
    "name": "Insurance and corporate billing",
    "description": "Insurance and corporate billing",
    "source": "#9",
    "phase": "later",
    "area": "Roadmap",
    "route": "/coming-soon/f09",
    "inNav": true
  },
  {
    "id": "f11",
    "name": "Birthday wishes and offers",
    "description": "Birthday wishes and offers",
    "source": "#11",
    "phase": "later",
    "area": "Roadmap",
    "route": "/coming-soon/f11",
    "inNav": true
  },
  {
    "id": "f12",
    "name": "Regional language messages",
    "description": "Regional language messages",
    "source": "#12",
    "phase": "later",
    "area": "Roadmap",
    "route": "/coming-soon/f12",
    "inNav": true
  },
  {
    "id": "f13",
    "name": "Patient portal",
    "description": "Patient portal",
    "source": "#13",
    "phase": "later",
    "area": "Roadmap",
    "route": "/coming-soon/f13",
    "inNav": true
  },
  {
    "id": "f14",
    "name": "Voice-to-notes",
    "description": "Voice-to-notes",
    "source": "#14",
    "phase": "later",
    "area": "Roadmap",
    "route": "/coming-soon/f14",
    "inNav": true
  },
  {
    "id": "f15",
    "name": "Multi-branch under one login",
    "description": "Multi-branch under one login",
    "source": "#15",
    "phase": "later",
    "area": "Roadmap",
    "route": "/coming-soon/f15",
    "inNav": true
  },
  {
    "id": "f21",
    "name": "Offline mode",
    "description": "Offline mode",
    "source": "#21",
    "phase": "later",
    "area": "Roadmap",
    "route": "/coming-soon/f21",
    "inNav": true
  },
  {
    "id": "f27",
    "name": "ABDM (national health ID) support, optional",
    "description": "ABDM (national health ID) support, optional",
    "source": "#27",
    "phase": "later",
    "area": "Roadmap",
    "route": "/coming-soon/f27",
    "inNav": true
  },
  {
    "id": "f29",
    "name": "No-show prediction",
    "description": "No-show prediction",
    "source": "#29",
    "phase": "later",
    "area": "Roadmap",
    "route": "/coming-soon/f29",
    "inNav": true
  },
  {
    "id": "f31",
    "name": "Orthodontic and implant tools",
    "description": "Orthodontic and implant tools",
    "source": "#31",
    "phase": "later",
    "area": "Roadmap",
    "route": "/coming-soon/f31",
    "inNav": true
  },
  {
    "id": "f33",
    "name": "Video consultation links",
    "description": "Video consultation links",
    "source": "#33",
    "phase": "later",
    "area": "Roadmap",
    "route": "/coming-soon/f33",
    "inNav": true
  },
  {
    "id": "f34",
    "name": "AI help, always reviewed by the doctor",
    "description": "AI help, always reviewed by the doctor",
    "source": "#34",
    "phase": "later",
    "area": "Roadmap",
    "route": "/coming-soon/f34",
    "inNav": true
  },
  {
    "id": "f36",
    "name": "Lab billing: one monthly bill per lab vendor",
    "description": "Lab billing: one monthly bill per lab vendor",
    "source": "#36",
    "phase": "later",
    "area": "Roadmap",
    "route": "/coming-soon/f36",
    "inNav": true
  },
  {
    "id": "f41",
    "name": "Patient insights",
    "description": "Patient insights",
    "source": "#41",
    "phase": "later",
    "area": "Roadmap",
    "route": "/coming-soon/f41",
    "inNav": true
  },
  {
    "id": "f44",
    "name": "Own-number WhatsApp account with a shared two-way inbox",
    "description": "Own-number WhatsApp account with a shared two-way inbox",
    "source": "#44",
    "phase": "later",
    "area": "Roadmap",
    "route": "/coming-soon/f44",
    "inNav": true
  },
  {
    "id": "f45",
    "name": "Free find-a-dentist listing",
    "description": "Free find-a-dentist listing",
    "source": "#45",
    "phase": "later",
    "area": "Roadmap",
    "route": "/coming-soon/f45",
    "inNav": true
  },
  {
    "id": "f46",
    "name": "Asset management",
    "description": "Asset management",
    "source": "#46",
    "phase": "later",
    "area": "Roadmap",
    "route": "/coming-soon/f46",
    "inNav": true
  },
  {
    "id": "f48",
    "name": "Google Calendar sync",
    "description": "Google Calendar sync",
    "source": "#48",
    "phase": "later",
    "area": "Roadmap",
    "route": "/coming-soon/f48",
    "inNav": true
  }
]

export function getFeatureById(id: string): FeatureEntry | undefined {
  return FEATURE_REGISTRY.find((f) => f.id === id)
}

export function getFeatureByRoute(route: string): FeatureEntry | undefined {
  return FEATURE_REGISTRY.find((f) => f.route === route)
}

export function getLaunchFeatures(): FeatureEntry[] {
  return FEATURE_REGISTRY.filter((f) => f.phase === 'launch')
}

export function getRoadmapFeatures(): FeatureEntry[] {
  return FEATURE_REGISTRY.filter((f) => f.phase === 'v2' || f.phase === 'later')
}

export function getNavFeaturesByArea(role?: StaffRole): Record<string, FeatureEntry[]> {
  const result: Record<string, FeatureEntry[]> = {}

  for (const item of FEATURE_REGISTRY) {
    if (!item.inNav) continue

    // Role filtering for sidebar navigation
    if (item.roles && role && !item.roles.includes(role)) {
      continue
    }

    if (!result[item.area]) {
      result[item.area] = []
    }
    result[item.area].push(item)
  }

  return result
}
