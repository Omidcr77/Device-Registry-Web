# ICT Device Registry – Server (Express + TypeScript + Prisma + SQLite)

A clean, production‑ready API that fits your UI:
- Auth with JWT (`/api/auth/login`, `/api/auth/me`)
- Devices CRUD with filtering, sorting & pagination (`/api/devices`)
- Users list for Admins (`/api/users`)
- Role‑based access (`ADMIN`, `MANAGER`, `VIEWER`)
- SQLite via Prisma (no external DB required)
- Seeded test data that matches the UI mock

---

## 1) Quick Start

**Requirements**
- Node.js >= 18
- pnpm *or* npm *or* yarn

**Setup**

```bash
# 1) Install deps
pnpm install   # or: npm install / yarn

# 2) Copy env
cp .env.example .env

# 3) Generate Prisma client
pnpm prisma:generate

# 4) Create DB & run migrations
pnpm prisma:migrate

# 5) Seed data
pnpm prisma:seed

# 6) Run dev server
pnpm dev
```

The API listens on **http://localhost:5001** by default.

---

## 2) Default Accounts

| Role   | Email               | Password       |
|--------|---------------------|----------------|
| ADMIN  | admin@example.com   | Admin@12345    |
| MANAGER| manager@example.com | Manager@12345  |
| VIEWER | viewer@example.com  | Viewer@12345   |

---

## 3) Endpoints

### Auth
- `POST /api/auth/login` → `{ token, user }`
  ```json
  { "email": "admin@example.com", "password": "Admin@12345" }
  ```
- `GET /api/auth/me` (Bearer token)

### Devices
- `GET /api/devices?search=&type=&location=&status=&from=YYYY-MM-DD&to=YYYY-MM-DD&sort=installDate&dir=desc&page=1&pageSize=10`
- `GET /api/devices/:id`
- `POST /api/devices` *(MANAGER/ADMIN)*
- `PUT /api/devices/:id` *(MANAGER/ADMIN)*
- `DELETE /api/devices/:id` *(MANAGER/ADMIN)*

### Users
- `GET /api/users` *(ADMIN)*

---

## 4) Connect the Client

Your current client is using mock data. To wire it up:

- Replace the mock data import with API calls (e.g., `fetch('/api/devices', { headers: { Authorization: 'Bearer ' + token } })`).  
- Use `POST /api/auth/login` on the login page to get a `token`, store it, and include it in subsequent requests.
- For the Admin panel, call `GET /api/users` (requires an ADMIN token).

---

## 5) Production Notes

- Use a stronger `JWT_SECRET` and set proper `CORS_ORIGIN` in `.env`.
- Switch to Postgres/MySQL by updating `prisma/schema.prisma` and `DATABASE_URL`.
- Build with `npm run build` and run with `npm start`.

---

## 6) Troubleshooting

- If you see Prisma errors, re‑run:
  ```bash
  pnpm prisma:generate
  pnpm prisma:migrate
  pnpm prisma:seed
  ```
- Delete `node_modules` and `prisma/dev.db` to reset, then `pnpm install` and `pnpm db:reset`.
