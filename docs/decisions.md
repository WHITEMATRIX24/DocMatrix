# Architecture & Integration Decisions — DocMatrix Frontend

## Context
DocMatrix is a multi-clinic dental practice management platform tailored for India (initial focus: Kerala).
The goal was to unify the existing Vite marketing web application (running on `localhost:5173`) with the comprehensive staff feature catalog (55 launch feature pages across 10 clinical operational areas) into **ONE seamless application**, with zero external network calls and 100% preservation of the user's visual identity.

---

## Key Decisions

### 1. Styling Architecture: Vanilla CSS Preservation over Tailwind Preflight
- **Decision:** Do NOT inject Tailwind preflight or Tailwind dependencies into the host application.
- **Rationale:** The existing app relies on 3,639 lines of meticulously styled Vanilla CSS in `src/styles.css`. Injecting Tailwind reset/preflight would conflict with existing box models, typography, and button styles.
- **Implementation:** All imported and newly created components (`FeaturePlaceholder`, `AreaPage`, `DemoBanner`, `NotBuiltYetPage`, `NotFoundPage`, `ComingSoonPage`) use the native DocMatrix design tokens (`var(--teal-primary)`, `var(--paper)`, `var(--line)`, `var(--charcoal-title)`, etc.).

### 2. Routing Architecture: React Router v6 with Deep-Linking & Hash Compatibility
- **Decision:** Use `react-router-dom` v6 wrapped via `BrowserRouter` with a hash-compatibility bridge.
- **Rationale:** The application previously relied on manual hash changes (`window.location.hash`). `BrowserRouter` provides clean HTML5 URLs (`/appointments`, `/patients`, `/dashboard`) while the hash bridge automatically handles legacy links or hash jumps (e.g. `#/dashboard` $\rightarrow$ `/dashboard`) without 404s.
- **Code Splitting:** All 55 launch feature subpages are registered in `src/routes/appRoutes.jsx` using `React.lazy()` and `Suspense` with an accessible skeleton fallback, ensuring fast initial page loads.

### 3. Button Preservation & Routing Hierarchy
- **Decision:** Retain every existing button, label, icon, and position. Attach staff-web feature pages to existing buttons, never the other way around.
- **Mapping:**
  - **Patient Records & Dental Care card** $\rightarrow$ `/patients` Area Page
  - **Appointments & Operations card** $\rightarrow$ `/appointments` Area Page
  - **Clinical Workflows & Prescriptions card** $\rightarrow$ `/clinical` Area Page
  - **Billing, Accounts & Payments card** $\rightarrow$ `/billing` Area Page
  - **Inventory & Dental Lab card** $\rightarrow$ `/inventory` Area Page
  - **WhatsApp & Patient Engagement card** $\rightarrow$ `/whatsapp` Area Page
  - **Topbar & Footer Login** $\rightarrow$ `/login` (pre-filled demo authentication)
  - **Topbar & Footer Sign Up** $\rightarrow$ `/signup`
  - **Login Submission** $\rightarrow$ `/dashboard` (Clinic Staff Portal)
  - **Pricing Table CTAs** $\rightarrow$ `/not-built-yet?button=<Plan> Plan`
  - **Unmatched Buttons** (About Us, Privacy Policy, Terms of Service, Security) $\rightarrow$ `/not-built-yet?button=<Name>`
- **Guarantee:** Zero dead links (`href="#"`), zero empty click handlers, and zero broken routes.

### 4. 3-Click Reachability for All 55 Launch Features
- **Requirement:** Every launch feature page must be reachable from the landing page in 3 clicks or fewer.
- **Implementation:**
  - **Option A (Via Landing Cards):** Click 1: Click any core module card (e.g. "Appointments & Operations") $\rightarrow$ lands on `/appointments` Area Page. Click 2: Click any subpage (e.g. "Book appointment") $\rightarrow$ lands on `/appointments/new`. (2 clicks total).
  - **Option B (Via Staff Portal):** Click 1: Click "Login" or "Dashboard" $\rightarrow$ lands on `/dashboard`. Click 2: Click any feature in the sidebar or area switcher $\rightarrow$ lands directly on the feature page. (2 clicks total).
  - **Option C (Cross-Feature Navigation):** Every subpage contains sibling tabs allowing instant 1-click switching among all pages in the same clinical domain.

### 5. Persistent Demo Banner on Staff and Feature Pages
- **Decision:** Place `<DemoBanner />` conditionally in `App.jsx` (`location.pathname !== '/'`).
- **Rationale:** Keeps the public landing page clean and professional as requested, while ensuring every internal screen — whether authentication view, staff dashboard, area hub, subpage, not-built-yet, or 404 — displays exactly one persistent demo banner: *"Demo only. Nothing is saved or sent. Do not enter real patient data."* Redundant internal banners were removed to avoid duplicate stacking.

### 6. Zero Network Calls Policy
- **Decision:** Enforce 100% offline-ready mock data.
- **Rationale:** Strict frontend demo requirement without backend dependencies.
- **Verification:** Automated Vitest suite explicitly spies on `window.fetch` and validates that zero network requests are dispatched across all navigation flows.
