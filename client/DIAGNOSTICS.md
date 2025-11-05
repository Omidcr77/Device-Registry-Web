# UI/UX Audit & Fix Plan

## What I checked
- Project structure, Vite config, dependencies
- Authentication flow (`App.tsx`, `Login`, `Dashboard`)
- Major pages/components: `DeviceList`, `Reports`, `AdminPanel`, `Settings`, `Navbar`, `Sidebar`
- Shared UI kit (shadcn-inspired components under `src/components/ui`)
- Styling pipeline (`index.css` bundles Tailwind CSS prebuild — no separate Tailwind config required)

## Immediate Fixes Applied
- **Global Error Boundary:** Added `src/components/ErrorBoundary.tsx` and wrapped the app in `StrictMode` + `ErrorBoundary` in `src/main.tsx` to prevent white screens.
- **Health endpoint helper:** Added `api.health()`; safe to call for readiness checks.
- **RUNBOOK.md:** Added a concise runbook for dev/prod and Windows Server hosting.

## Things that look good
- Clean component library with consistent classnames.
- Vite proxy to `/api` and `/ws` for DX.
- Sensible API wrapper with token header injection and blob downloads.

## Issues & Recommendations
1. **Auth Loading State** — Provide a visible loading/skeleton while checking tokens (currently a blank div). Consider a spinner or skeleton block.
2. **Optimistic Updates** — In `DeviceList` inline edits, store a snapshot and revert on failure (comment says optimistic, but code doesn’t revert local cache).
3. **Empty States** — For tables with zero rows (after filters), show a friendly empty state with quick actions (reset filters/add device).
4. **A11y & Keyboard**
   - Ensure all interactive icons are buttons with `aria-label`.
   - Use `role="status"` for loading indicators.
   - Make the global search dialog open with `Ctrl/Cmd + K` (already documented) and trap focus.
5. **Error Surfaces**
   - Use toast for transient failures and an inline alert banner at the top for persistent backend outages (e.g., health check failed).
6. **Consistent Date/Number Formats** — Centralize Intl formatters; currently duplicated in places.
7. **List Keys** — Ensure stable keys (use IDs not labels) in mapped lists.
8. **Theming** — You’re toggling dark mode; ensure system-prefers-dark is respected on first paint to avoid flash. Persist user choice in `localStorage`.

## Suggested Enhancements
- **Command Palette (K) gets richer**: add quick nav to Devices/Reports/Settings and the most-recent devices.
- **Persistent column settings**: store visible columns & page size per user in `localStorage`.
- **CSV Import Wizard**: stepper UI with mapping preview and validation (server-side + client-side).

## Testing Checklist
- [ ] Auth: login/logout/session timeout with token expiration
- [ ] Device CRUD: add/edit/delete; inline edits and bulk actions
- [ ] Filters & pagination: correct totals, consistent state when changing page size
- [ ] Reports: export CSV/JSON; correct filename and MIME; large dataset streaming
- [ ] Network loss: simulate offline; UI informs and recovers
- [ ] Mobile: sidebar toggle, table scroll, dialogs
