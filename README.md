# 🔐 AuthSphere — Campus SSO Platform

Passwordless Single Sign-On for Vel Tech University.  
FIDO2/WebAuthn biometric auth · RS256 JWT · 6 campus portals · Supabase PostgreSQL

---

## Architecture

```
authsphere/
├── apps/
│   ├── auth-server/          # Express API (Node 20, TypeScript)
│   │   └── src/
│   │       ├── routes/       # auth, lms, erp, library, email, admin, audit
│   │       ├── lib/          # prisma, redis, jwt, audit
│   │       └── middleware/   # requireAuth, errorHandler, requestLogger
│   └── frontend/             # Vite + React 18 + TypeScript
│       └── src/
│           ├── pages/        # Landing, Dashboard, LMS, ERP, Library, Email, Admin
│           ├── components/   # ui, layout, auth
│           ├── context/      # Zustand auth store
│           ├── hooks/        # useJWT (countdown + toasts)
│           └── lib/          # api (axios), webauthn browser helper
└── packages/
    ├── shared/               # TypeScript types shared between apps
    └── db/
        └── prisma/
            ├── schema.prisma # All tables (auth + 6 portals)
            └── seed.ts       # 3 students + faculty + admin
```

---

## Prerequisites

- Node.js 20+
- Redis (local or [Upstash](https://upstash.com) for serverless)
- A [Supabase](https://app.supabase.com) project

---

## 1. Clone & Install

```bash
git clone <repo>
cd authsphere
npm install
```

---

## 2. Supabase Setup

1. Go to [app.supabase.com](https://app.supabase.com) → New Project
2. Go to **Settings → Database → Connection String → URI**
3. Copy your connection string

---

## 3. Environment Variables

```bash
cp .env.example .env
```

Fill in your `.env`:

```env
# Supabase
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.your-project.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.your-project.supabase.co:5432/postgres

# JWT Keys (generate below)
JWT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n..."

# WebAuthn (use localhost for dev)
RP_ID=localhost
RP_NAME=AuthSphere Campus SSO
ORIGIN=http://localhost:5173

# Redis
REDIS_URL=redis://localhost:6379

# Campus
CAMPUS_DOMAIN=veltech.edu.in
VITE_CAMPUS_DOMAIN=veltech.edu.in
VITE_API_URL=http://localhost:3001
```

---

## 4. Generate RS256 Keys

```bash
node scripts/generate-keys.js
```

Copy the output into your `.env` file.

---

## 5. Database Setup

```bash
# Generate Prisma client
npm run db:generate

# Push schema to Supabase (creates all tables)
npm run db:migrate

# Seed with test data
npm run db:seed
```

This creates:
| Email | Role | Data |
|-------|------|------|
| `vtu24464@veltech.edu.in` | Student | 5 courses, hostel Block A, 3 books |
| `vtu24617@veltech.edu.in` | Student | 4 courses, fees paid, 1 overdue book |
| `vtu24446@veltech.edu.in` | Student | 6 courses, hostel Block B, transport |
| `admin@veltech.edu.in`    | Admin   | Full admin access |

All users have **no FIDO2 credential** initially — they get prompted to register their device on first login (via OTP fallback).

---

## 6. Start Development

```bash
# Start both frontend + auth server simultaneously
npm run dev
```

- Frontend: http://localhost:5173  
- Auth API: http://localhost:3001  
- API Health: http://localhost:3001/health

---

## Auth Flow

```
1. User enters vtuXXXXX@veltech.edu.in
2. Server checks for FIDO2 credential
   ├── Found    → WebAuthn challenge → Touch ID / Face ID → JWT issued
   └── Not found→ OTP sent to phone → 6-digit verify → JWT issued
                                    → Prompt register biometric device
3. JWT (RS256, 30min TTL) stored in Zustand + localStorage
4. Axios interceptor attaches JWT to every API request
5. Each portal route verifies JWT audience claim (lms/erp/library/email/admin)
6. Token auto-refreshes at 5min remaining
7. On logout: server blacklists JTI in Redis
```

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/jwks.json` | Public JWK set |
| POST | `/api/auth/register/begin` | Start FIDO2 registration |
| POST | `/api/auth/register/complete` | Verify registration |
| POST | `/api/auth/login/begin` | Start login (FIDO2 or OTP) |
| POST | `/api/auth/login/complete` | Verify FIDO2 assertion |
| POST | `/api/auth/otp/send` | Send OTP to device |
| POST | `/api/auth/otp/verify` | Verify OTP + issue JWT |
| POST | `/api/auth/token/refresh` | Rotate token |
| DELETE | `/api/auth/session` | Logout + blacklist token |
| GET | `/api/auth/me` | Current user info |

### Portals (all require `Authorization: Bearer <jwt>`)
| Endpoint | Portal |
|----------|--------|
| `/api/lms/dashboard` | LMS summary |
| `/api/lms/courses` `/grades` `/assignments` `/attendance` | LMS data |
| `/api/erp/dashboard` `/fees` `/hostel` `/transport` | ERP data |
| `/api/library/dashboard` `/issued` `/catalogue` | Library data |
| `/api/email/inbox` POST `/email/compose` | Email data |
| `/api/audit/events` | Audit log |
| `/api/admin/users` `/stats` | Admin (admin role only) |

---

## Production Deployment

### Auth Server (Railway / Render / Fly.io)
```bash
npm run build --workspace=apps/auth-server
# Set env vars in your platform dashboard
# Start: node apps/auth-server/dist/index.js
```

### Frontend (Vercel / Netlify)
```bash
npm run build --workspace=apps/frontend
# Dist: apps/frontend/dist/
# Update VITE_API_URL to your deployed auth server URL
```

### WebAuthn Production Notes
- `RP_ID` must be your exact domain (e.g., `sso.veltech.edu.in`)
- `ORIGIN` must be your exact frontend URL (e.g., `https://sso.veltech.edu.in`)
- Must use HTTPS (WebAuthn requires secure context)

### Redis (Production)
Use [Upstash Redis](https://upstash.com) — serverless, free tier available:
```env
REDIS_URL=rediss://default:password@hostname.upstash.io:6380
```

---

## Security Checklist

- [x] FIDO2/WebAuthn — phishing-resistant, origin-bound
- [x] RS256 JWT — asymmetric signing, public key endpoint
- [x] Redis token blacklist — instant revocation on logout
- [x] VTU domain gate — Zod validation + DB constraint
- [x] OTP lockout — 5 attempts → 30min lockout
- [x] NIST 800-63B compliant audit logging
- [x] Helmet.js security headers
- [x] Rate limiting — 30 auth requests/15min
- [x] CORS — explicit allowlist
- [x] Short JWT TTL — 30 min with silent refresh
