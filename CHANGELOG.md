# Changelog

All notable changes to MakaanBook are documented here.

## [Unreleased]

### Added
- Year filter for rent records (dynamic from existing records)
- Robots meta tag and application-name for SEO
- Emoji favicon and apple-touch-icon
- Focus-visible accessibility outlines
- Custom scrollbar styling for Webkit browsers
- Smooth scrolling behavior globally

### Fixed
- `Checkbox` `onCheckedChange` type — casts `CheckedState` safely to `boolean`
- Year dropdown in rent form is now dynamic (current year ±2 range)
- AI assistant chat: prevents double-submit while loading
- AI assistant: removed `loading` from `useCallback` deps to fix stale closures
- Auth: Added `aria-label` to Google OAuth button

### Changed
- Upgraded Gemini AI model from `gemini-1.5-flash` to `gemini-1.5-flash-latest`

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
