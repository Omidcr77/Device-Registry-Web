# ICT Device Registry — Runbook

## Quick Start (Dev)
1. Install Node.js 20+.
2. `cd` into this folder.
3. Create a `.env` file (see `.env.example`):
   ```env
   VITE_API_BASE=/api
   ```
4. Start the backend on `http://localhost:5001`.
5. Start the UI:
   ```bash
   npm install
   npm run dev
   ```
   Vite dev server proxies `/api` and `/ws` to `localhost:5001`.

## Build (Prod)
```bash
npm run build
```
The static assets will be in `dist/`. Serve with Nginx, Caddy, Apache, or a Node static server.

## Windows Server (IIS) Hosting (static)
- Install **URL Rewrite** + **IISNode** (if using Node host), otherwise prefer a simple static host like **IIS Static Content** or **Nginx for Windows**.
- Place the contents of `dist/` under your IIS site.
- Add a rewrite rule to route SPA paths to `/index.html`:
  - Match: `.*`
  - Condition: `{REQUEST_FILENAME}` is **not** a file
  - Action: **Rewrite** to `/index.html`

## Environment
- `VITE_API_BASE` — Base path/URL for API (default `/api`). In dev, proxy forwards to `http://localhost:5001`.
- WebSocket endpoint (if used) should be relative to the same origin under `/ws`.

## Troubleshooting
- **Blank page**: open DevTools console. If you see runtime errors, they’ll be captured by the ErrorBoundary—click **Reload**.
- **CORS**: ensure backend `Access-Control-Allow-Origin` includes your UI domain.
- **Auth**: make sure `/auth/me` and `/auth/login` endpoints exist and return the documented shape.
- **Proxies**: in dev, verify Vite proxy in `vite.config.ts` points at the running backend.
