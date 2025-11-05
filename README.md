# Device Registry Web

A full‑stack web app for managing ICT devices. This repo contains a Vite + React (TypeScript) client and an Express (TypeScript) API backed by MongoDB.

## Project Structure
- `client/` — Vite + React + TypeScript UI
- `server/` — Express + TypeScript API with Mongoose

## Prerequisites
- Node.js 18+
- MongoDB (local or a connection string)

## Quick Start (Development)
1) API server
- `cd server`
- `npm install`
- Create `.env` with at least:
  
  ```env
  PORT=5001
  NODE_ENV=development
  CORS_ORIGIN=http://localhost:3000
  JWT_SECRET=change_me
  MONGO_URI=mongodb://localhost:27017/device_registry
  ```
- (Optional) seed sample data: `npm run seed`
- Start dev server: `npm run dev` (listens on `http://localhost:5001`)

2) Client app
- `cd client`
- `npm install`
- (Optional) create `.env` and set `VITE_API_BASE=/api` (default). The Vite dev server proxies `/api` and `/ws` to the backend on port 5001.
- Start dev server: `npm run dev` (opens `http://localhost:3000`)

## Default Accounts (if seeded)
- ADMIN: `admin@example.com` / `Admin@1234`
- MANAGER: `manager@example.com` / `Manager@12345`
- VIEWER: `viewer@example.com` / `Viewer@12345`

## Environment Variables
Server (`server/.env`):
- `PORT` — API port (default `5001`)
- `NODE_ENV` — `development` or `production`
- `CORS_ORIGIN` — comma‑separated allowlist of origins
- `JWT_SECRET` — secret key for JWTs
- `MONGO_URI` — Mongo connection string (e.g., `mongodb://localhost:27017/device_registry`)
- `STATUS_TICK_MS` — optional status polling interval (ms)

Client (`client/.env`):
- `VITE_API_BASE` — API base path or absolute URL. In dev, keep `/api` to leverage the Vite proxy. For separate deployments, point to your API, e.g. `https://your-domain.com/api`.

## Build & Run (Production)
Client:
- `cd client && npm run build`
- Output in `client/build/` (serve with any static host)

Server:
- `cd server && npm run build`
- Run: `npm start` (uses `server/dist`)
- Ensure `JWT_SECRET` and `MONGO_URI` are set.

Reverse proxy tips:
- Proxy `/<api>` routes (e.g., `/api`, `/ws`) to the server (`:5001`).
- Serve the built client (`client/build`) from your web server.

## Useful Paths
- UI docs: `client/README.md`, `client/RUNBOOK.md`
- API entry: `server/src/index.ts`
- Mongo models: `server/src/db/mongo.ts`

---

Issues or improvements welcome. PRs are appreciated.
