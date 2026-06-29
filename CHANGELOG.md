# Changelog

All notable changes to MakaanBook are documented here.

## [Unreleased]

### Performance
- Parallelized all Supabase data fetches across every page using `Promise.all` — dashboard, properties, tenants, rent, electricity, reports, tenant self-service pages
- Optimized OAuth callback to skip code exchange when session already exists
- Added Vite `manualChunks` to split vendor libs (react, framer-motion, supabase, radix) into dedicated bundles
- Upgraded Gemini model from `gemini-1.5-flash` to `gemini-1.5-flash-latest`

### Accessibility
- Added skip-to-main-content link in root shell layout
- Added `id="main-content"` to main elements on landing and app shell
- Added `role=status` and `aria-live` to all loading indicators
- Added `sr-only` Tailwind utility class and `prefers-reduced-motion` media query
- Added `aria-label` to AI chat input, send button, and suggestion buttons
- Added `aria-label` to auth page submit, mode toggle, and Google OAuth buttons
- Added `aria-hidden="true"` to all decorative icons across auth, nav, and landing
- Added `aria-label` to sign out button in sidebar

### Bug Fixes
- Fixed `Checkbox` `onCheckedChange` type — correctly casts `CheckedState` to `boolean` in calculator and electricity forms
- Fixed hardcoded year dropdowns — now dynamic based on `currentYear ± 2` across all forms
- Fixed AI chat `handleSend` to guard against duplicate sends while loading
- Added cleanup flag to AppShell role query to prevent setting state on unmounted component
- Fixed OAuth callback to skip unnecessary code exchange when session already exists

### Security
- Added server-side input length limits to AI query validator (prompt ≤ 1000, history ≤ 20 entries)
- Expanded `.env.example` with `SUPABASE_SERVICE_ROLE_KEY` annotation and security warnings
- Added `validateServerEnv()` helper to `config.server.ts`

### SEO
- Added `robots`, `application-name`, emoji favicon, and `apple-touch-icon` to root head
- Added `keywords` and `author` meta tags to landing page

### Developer Experience
- Added `CHANGELOG.md` to track project changes
- Improved `README.md` with badges, tech stack table, and project structure
- Added `formatINR`, `getMonthName`, `getShortMonthName`, `getStatusColor` helpers to `utils.ts`
- Added `validateServerEnv()` to `config.server.ts`

### UX
- Added `scroll-behavior: smooth`, `focus-visible` outlines, and custom scrollbar styling
- Added year filter to rent records page (dynamic from existing records)

---

## [1.0.0] - 2026-06-29

### Added
- Full property management (houses, rooms, occupancy)
- Tenant directory with Aadhar and ID proof storage
- Rent payment ledger with UPI/cash/bank modes, photo proof uploads
- Electricity bill management with meter replacement support
- Hinglish AI assistant powered by Google Gemini
- PDF statement generation (jsPDF + autoTable)
- Tenant self-service view: rent history, electricity bills, calculator
- Multi-role auth (landlord / tenant) via Supabase Auth
- Google OAuth sign-in
- Dark-mode-first UI with glassmorphism design
- Responsive mobile navigation with sidebar

### Tech Stack
- TanStack Start (Vite + Nitro SSR)
- Supabase (PostgreSQL + RLS + Storage)
- Tailwind CSS v4 + Radix UI primitives
- TanStack Query (React Query v5)
- Google Gemini 1.5 Flash API
- jsPDF + autoTable
- Framer Motion
- Deployed on Vercel
