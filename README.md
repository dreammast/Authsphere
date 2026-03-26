<p align="center">
  <img src="https://img.shields.io/badge/🔐-AuthSphere-blueviolet?style=for-the-badge&labelColor=1a1a2e" alt="AuthSphere" />
</p>

<h1 align="center">AuthSphere — Campus SSO Platform</h1>

<p align="center">
  <em>Passwordless Single Sign-On for Vel Tech University</em>
</p>

<p align="center">
  <a href="https://nodejs.org/"><img src="https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white" alt="Node.js" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript&logoColor=white" alt="TypeScript" /></a>
  <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black" alt="React" /></a>
  <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" alt="Vite" /></a>
  <a href="https://expressjs.com/"><img src="https://img.shields.io/badge/Express-4.18-000000?logo=express&logoColor=white" alt="Express" /></a>
  <a href="https://www.prisma.io/"><img src="https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma&logoColor=white" alt="Prisma" /></a>
  <a href="https://supabase.com/"><img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white" alt="Supabase" /></a>
  <a href="https://redis.io/"><img src="https://img.shields.io/badge/Redis-5-DC382D?logo=redis&logoColor=white" alt="Redis" /></a>
  <a href="https://webauthn.io/"><img src="https://img.shields.io/badge/WebAuthn-FIDO2-4285F4?logo=google&logoColor=white" alt="WebAuthn" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License" /></a>
</p>

---

**AuthSphere** is a full-stack, passwordless campus Single Sign-On (SSO) platform. It replaces traditional passwords with FIDO2/WebAuthn biometric authentication and OTP fallback, securing six integrated campus portals — LMS, ERP, Library, Email, Admin, and Audit — under a single JWT-based identity layer.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **FIDO2 / WebAuthn** | Touch ID, Face ID, and security key authentication — phishing-resistant and origin-bound |
| **OTP Fallback** | Email-delivered 6-digit OTP with bcrypt hashing, lockout after 5 attempts, and 3-minute expiry |
| **RS256 JWT** | Asymmetric-signed tokens (30-min TTL), silent refresh at 5 min remaining, JWKS endpoint for verification |
| **Token Revocation** | Instant logout via Redis JTI blacklisting — no stale sessions |
| **6 Campus Portals** | LMS (courses, grades, assignments, attendance), ERP (fees, hostel, transport), Library (catalogue, issued books), Email (inbox, compose), Admin (user management, stats), Audit (event logs) |
| **Device Registration** | First-time OTP users are prompted to register a biometric device for future logins |
| **Firebase Push** | Push notifications via Firebase Cloud Messaging |
| **Domain Gating** | Only `@veltech.edu.in` email addresses can register — enforced with Zod + DB constraints |
| **Admin Console** | User management, system policies, fee structure configuration, payment receipt generation |
| **Audit Logging** | NIST 800-63B compliant logging of all auth events with IP, user-agent, and metadata |

---

## 🛠 Tech Stack

### Backend — `apps/auth-server`

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20, TypeScript 5.3 |
| Framework | Express 4.18 |
| Auth | `@simplewebauthn/server`, `jsonwebtoken` (RS256), `bcryptjs`, `speakeasy` |
| Database | Prisma 5 → Supabase PostgreSQL |
| Cache | ioredis → Redis |
| Email | Nodemailer (SMTP / Ethereal dev) |
| Push | Firebase Admin SDK |
| Security | Helmet.js, express-rate-limit, CORS allowlist, Zod validation |
| Logging | Winston |

### Frontend — `apps/frontend`

| Layer | Technology |
|-------|------------|
| Framework | React 18, TypeScript |
| Bundler | Vite 5 |
| Routing | React Router 6 |
| State | Zustand 5 |
| Auth | `@simplewebauthn/browser`, Axios interceptors |
| Notifications | react-hot-toast |

### Shared Packages

| Package | Purpose |
|---------|---------|
| `packages/db` | Prisma schema (14 models), migrations, seed script |
| `packages/shared` | TypeScript types shared between apps |

---

## 📁 Project Structure

```
authsphere/
├── apps/
│   ├── auth-server/              # Express API (Node 20, TypeScript)
│   │   └── src/
│   │       ├── routes/           # auth, lms, erp, library, email, admin, audit
│   │       ├── services/         # Business logic layer
│   │       ├── lib/              # prisma, redis, jwt, audit helpers
│   │       └── middleware/       # requireAuth, errorHandler, requestLogger
│   └── frontend/                 # Vite + React 18 + TypeScript
│       └── src/
│           ├── pages/            # Login, Register, Dashboard, LMS, ERP, Library, Email, Admin
│           ├── components/       # ui, layout, auth components
│           ├── context/          # Zustand auth store
│           ├── hooks/            # useJWT (countdown + toasts)
│           └── lib/              # api (axios), webauthn browser helper
├── packages/
│   ├── db/
│   │   └── prisma/
│   │       ├── schema.prisma     # 14 models (auth + 6 portals)
│   │       └── seed.ts           # 3 students + faculty + admin
│   └── shared/                   # TypeScript types shared between apps
├── scripts/
│   └── generate-keys.js          # RS256 key pair generator
├── .env.example
├── package.json                  # npm workspaces root
└── tsconfig.json
```

---

## 📋 Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| [Node.js](https://nodejs.org/) | 20+ | LTS recommended |
| [Redis](https://redis.io/) | 7+ | Local install or [Upstash](https://upstash.com) (serverless) |
| [Supabase](https://supabase.com/) | — | Free tier works for development |

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/YOUR_USERNAME/authsphere.git
cd authsphere
npm install
```

> npm workspaces will install dependencies for all apps and packages automatically.

### 2. Supabase Setup

1. Go to [app.supabase.com](https://app.supabase.com) → **New Project**
2. Navigate to **Settings → Database → Connection String → URI**
3. Copy your connection string for the next step

### 3. Environment Variables

```bash
cp .env.example .env
```

Fill in your `.env`:

```env
# ─── Supabase ───────────────────────────────────
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.your-project.supabase.co:5432/postgres

# ─── JWT (generate in step 4) ───────────────────
JWT_PRIVATE_KEY_PATH=./keys/private.pem
JWT_PUBLIC_KEY_PATH=./keys/public.pem

# ─── WebAuthn ────────────────────────────────────
RP_ID=localhost
RP_NAME=AuthSphere Campus SSO
ORIGIN=http://localhost:5173

# ─── Redis ───────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ─── SMTP (optional: uses Ethereal in dev) ──────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# ─── Campus ─────────────────────────────────────
CAMPUS_DOMAIN=veltech.edu.in
VITE_CAMPUS_DOMAIN=veltech.edu.in
```

### 4. Generate RS256 Key Pair

```bash
node scripts/generate-keys.js
```

Copy the output into your `.env` file, or use the generated PEM files directly.

### 5. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to Supabase (creates all tables)
npm run db:migrate

# Seed with test data (3 students + admin)
npm run db:seed
```

### 6. Start Development

```bash
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Auth API | http://localhost:4000 |
| Prisma Studio | `npm run db:studio` |

---

## 🔐 Auth Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER LOGIN FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User enters vtuXXXXX@veltech.edu.in                        │
│                                                                 │
│  2. Server checks for FIDO2 credential                         │
│     ├── ✅ Found  → WebAuthn challenge                         │
│     │              → Touch ID / Face ID verification            │
│     │              → JWT issued (RS256, 30-min TTL)             │
│     │                                                           │
│     └── ❌ Not found → OTP sent via email                      │
│                      → 6-digit verification                     │
│                      → JWT issued                               │
│                      → Prompt: Register biometric device        │
│                                                                 │
│  3. Zustand stores JWT + localStorage persistence               │
│  4. Axios interceptor attaches Bearer token to requests         │
│  5. Portal routes verify JWT audience claim                     │
│  6. Silent refresh triggers at 5 min remaining                  │
│  7. Logout → Redis blacklists JTI for instant revocation        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🌐 API Reference

### Auth Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/auth/jwks.json` | No | Public JWK set for token verification |
| `POST` | `/api/auth/register/begin` | No | Start FIDO2 device registration |
| `POST` | `/api/auth/register/complete` | No | Complete FIDO2 registration |
| `POST` | `/api/auth/login/begin` | No | Start login (returns FIDO2 or OTP flow) |
| `POST` | `/api/auth/login/complete` | No | Verify FIDO2 assertion |
| `POST` | `/api/auth/otp/send` | No | Send OTP to email |
| `POST` | `/api/auth/otp/verify` | No | Verify OTP → issue JWT |
| `POST` | `/api/auth/token/refresh` | JWT | Rotate access token |
| `DELETE` | `/api/auth/session` | JWT | Logout + blacklist token |
| `GET` | `/api/auth/me` | JWT | Get current user info |

### Portal Endpoints (all require `Authorization: Bearer <jwt>`)

| Portal | Endpoints |
|--------|-----------|
| **LMS** | `/api/lms/dashboard` · `/api/lms/courses` · `/api/lms/grades` · `/api/lms/assignments` · `/api/lms/attendance` |
| **ERP** | `/api/erp/dashboard` · `/api/erp/fees` · `/api/erp/hostel` · `/api/erp/transport` |
| **Library** | `/api/library/dashboard` · `/api/library/issued` · `/api/library/catalogue` |
| **Email** | `GET /api/email/inbox` · `POST /api/email/compose` |
| **Admin** | `/api/admin/users` · `/api/admin/stats` *(admin role only)* |
| **Audit** | `/api/audit/events` |

---

## 👥 Seed Data

| Email | Role | Data |
|-------|------|------|
| `vtu24464@veltech.edu.in` | Student | 5 courses, hostel Block A, 3 books |
| `vtu24617@veltech.edu.in` | Student | 4 courses, fees paid, 1 overdue book |
| `vtu24446@veltech.edu.in` | Student | 6 courses, hostel Block B, transport pass |
| `admin@veltech.edu.in` | Admin | Full admin access |

> All users start with **no FIDO2 credential** — on first login via OTP, they are prompted to register a biometric device.

---

## 🚢 Production Deployment

### Auth Server (Railway / Render / Fly.io)

```bash
npm run build --workspace=apps/auth-server
# Set environment variables in your platform dashboard
# Start command: node apps/auth-server/dist/index.js
```

### Frontend (Vercel / Netlify)

```bash
npm run build --workspace=apps/frontend
# Output: apps/frontend/dist/
# Set VITE_API_URL to your deployed auth server URL
```

### WebAuthn Production Notes

> [!IMPORTANT]
> WebAuthn requires a secure context (HTTPS) in production.

- `RP_ID` → your exact domain (e.g., `sso.veltech.edu.in`)
- `ORIGIN` / `RP_ORIGIN` → your exact frontend URL (e.g., `https://sso.veltech.edu.in`)
- Both values must match your TLS certificate

### Redis (Production)

Use [Upstash Redis](https://upstash.com) for serverless deployments:

```env
REDIS_URL=rediss://default:password@hostname.upstash.io:6380
```

---

## 🛡 Security Checklist

- [x] **FIDO2/WebAuthn** — Phishing-resistant, origin-bound biometric authentication
- [x] **RS256 JWT** — Asymmetric signing with public JWKS endpoint
- [x] **Redis Token Blacklist** — Instant revocation on logout
- [x] **Domain Gating** — Zod validation + DB constraint on `@veltech.edu.in`
- [x] **OTP Lockout** — 5 attempts → 30-min lockout, bcrypt-hashed codes
- [x] **Audit Logging** — NIST 800-63B compliant with IP, user-agent, metadata
- [x] **Helmet.js** — Secure HTTP headers (CSP, HSTS, etc.)
- [x] **Rate Limiting** — 30 auth requests per 15-minute window
- [x] **CORS Allowlist** — Explicit origin configuration
- [x] **Short JWT TTL** — 30-minute access tokens with silent refresh
- [x] **Firebase Push** — Secure push notifications via service account

---

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend + auth server concurrently |
| `npm run build` | Build both apps for production |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Push schema to database |
| `npm run db:seed` | Seed database with test data |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<p align="center">
  Built with ❤️ for <strong>Vel Tech University</strong>
</p>
