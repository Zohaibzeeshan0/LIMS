# City Pharma LIMS — Project Context & Architecture Guide

> **Document Version:** 1.0.0  
> **Repository:** [https://github.com/Zohaibzeeshan0/LIMS](https://github.com/Zohaibzeeshan0/LIMS)  
> **Last Verified:** October 2026  
> **Purpose:** Authoritative codebase reference to eliminate repeated exploration, accelerate feature delivery, and ensure 100% correctness across frontend and backend.

---

## 1. System Overview & Domain

City Pharma **LIMS** (Laboratory Information Management System) is an enterprise pharmaceutical grade system designed for cGMP (current Good Manufacturing Practice) and FDA 21 CFR Part 11 compliance. It governs:
1. **Sample Accession & Intake:** Logging samples from production lines and sampling booths into four distinct QC laboratories:
   - **SAF** (Sterile Area Facility / Cephalosporins)
   - **SEF** (Semi-Synthetic Penicillins & Extended Formulations)
   - **PENICILLIN** (Dedicated Penicillin Block)
   - **GENERAL** (Oral Solids, Liquids, Non-sterile production)
2. **Analytical Testing & Electronic Worksheets:** Assigning compendial tests (USP/BP/Ph.Eur/In-House), recording raw and calculated assay results, measuring conformance against min/max limits.
3. **Out-of-Specification (OOS) Investigations:** Phase I laboratory investigations, re-testing protocols, and QA dispositioning.
4. **Batch Release & Certificates of Analysis (CoA):** Quarantine-to-release workflow with digital verification.
5. **ALCOA+ Audit Trail:** Immutable historical audit logs tracking every change, user, timestamp, previous value, new value, and rationale.

---

## 2. Technology Stack

### Backend (`/backend`)
| Component | Technology | Version / Details |
|---|---|---|
| **Framework** | NestJS | 10.3.8 (TypeScript 5.4) |
| **Runtime** | Node.js | v20+ / Windows PowerShell |
| **ORM & Database** | Prisma ORM & PostgreSQL | Prisma 5.13.0, schema in `prisma/schema.prisma` |
| **Authentication** | Passport.js + JWT | Access tokens (15m) + Refresh tokens (7d), bcrypt password hashing |
| **Validation** | Class-Validator & Class-Transformer | Strict DTO validation with implicit conversions |
| **API Documentation** | Swagger / OpenAPI | Configured at `/api/v1` via `@nestjs/swagger` |
| **Date / Time** | `date-fns` & `date-fns-tz` | `Asia/Karachi` timezone adherence |

### Frontend (`/frontend`)
| Component | Technology | Version / Details |
|---|---|---|
| **Framework** | Next.js (App Router) | 14.2.3 |
| **UI Library** | React | 18.3.1 |
| **State & Fetching** | TanStack React Query | v5.32.0 (cache invalidation on mutations) |
| **Forms & Validation** | React Hook Form + Zod | `zodResolver` schema enforcement |
| **Styling** | Vanilla CSS + Tailwind CSS | Tailwind 3.4.3 (`globals.css`, customized navy/slate/rose tokens) |
| **Icons** | Lucide React | 0.372.0 |
| **HTTP Client** | Custom Fetch Client (`api.ts`) | Automatic JWT rotation, 401 interception, session storage sync |

---

## 3. Directory Structure

```
LIMS/
├── backend/                             # NestJS API Server (Port: 3001, Prefix: /api/v1)
│   ├── prisma/
│   │   ├── schema.prisma                # Database schema (PostgreSQL)
│   │   ├── seed.ts                      # Initial roles, users, test specs, and batches
│   ├── src/
│   │   ├── analytics/                   # Lab throughput & turnaround time metrics
│   │   ├── audit-logs/                  # 21 CFR Part 11 audit trail service & controller
│   │   ├── auth/                        # Login, JWT strategy, refresh token logic, guards
│   │   ├── batches/                     # Drug product batch management & release states
│   │   ├── categories/                  # Material & sample categories
│   │   ├── common/                      # Exception filters, decorators, logging
│   │   ├── instruments/                 # Analytical equipment calibration & status
│   │   ├── laboratories/                # Lab modules (SAF, SEF, PENICILLIN, GENERAL)
│   │   ├── oos/                         # Out of specification investigation workflows
│   │   ├── samples/                     # Sample lifecycle, approvals, and reviews
│   │   ├── sampling/                    # Accession intake, barcode/sample IDs, priority SLA
│   │   │   ├── dto/                     # create-sample.dto.ts, update-sample.dto.ts
│   │   │   ├── sampling.controller.ts   # Sampling REST endpoints
│   │   │   ├── sampling.service.ts      # Core accession business logic & PostgreSQL mutations
│   │   ├── submissions/                 # Certificate of analysis & final batch submissions
│   │   ├── tests/                       # Test specifications, test execution, analytical entry
│   │   ├── users/                       # User management, roles (ADMIN, QA, QC, AUDITOR)
│   │   ├── app.module.ts                # Main backend module wiring
│   │   └── main.ts                      # Bootstrap, CORS config, ValidationPipe, Swagger
│   ├── .env                             # Local environment variables
│   └── package.json
│
├── frontend/                            # Next.js App Router Client (Port: 3000)
│   ├── src/
│   │   ├── app/                         # App Router Pages
│   │   │   ├── layout.tsx               # Root layout & providers
│   │   │   ├── page.tsx                 # Executive Dashboard (KPIs, pending samples, audit logs)
│   │   │   ├── login/page.tsx           # High-aesthetic pharma login portal
│   │   │   ├── samples/page.tsx         # Samples registry, filtering, dossiers, status actions
│   │   │   ├── testing/page.tsx         # Analytical testing worksheets & data entry
│   │   │   ├── oos/page.tsx             # OOS investigations & management
│   │   │   ├── batches/page.tsx         # Batch records & release tracking
│   │   │   ├── instruments/page.tsx     # Equipment calibration & usage logs
│   │   │   ├── audit/page.tsx           # Full audit trail log explorer
│   │   │   └── reports/page.tsx         # Regulatory reports & CSV/PDF exports
│   │   ├── components/
│   │   │   ├── layout/                  # Navbar.tsx, Sidebar.tsx, AppShell.tsx
│   │   │   ├── samples/                 # NewSampleModal.tsx, EditSampleModal.tsx, PrintSampleModal.tsx, SubmitSampleModal.tsx
│   │   │   └── ui/                      # Modal.tsx, Button.tsx, Badge.tsx, StatCard.tsx, CityPharmaLogo.tsx
│   │   ├── context/
│   │   │   └── AuthContext.tsx          # User session, role verification, login/logout
│   │   ├── lib/
│   │   │   ├── api.ts                   # Fetch-based API client with auto-refresh queue
│   │   │   └── utils.ts                 # Class merger (cn) and formatting helpers
│   │   ├── services/                    # Typed API services (sampling, audit, categories, etc.)
│   │   └── types/
│   │       └── lims.ts                  # Shared TypeScript interfaces (Sample, Batch, Test, User)
│   ├── .env.local                       # Local frontend environment variables
│   └── package.json
│
├── PROJECT_CONTEXT.md                   # This authoritative context document
├── TASK_PLAN.md                         # Active task tracking & implementation history
└── README.md
```

---

## 4. Key Business Logic & Conventions

### Priority SLA Targets & Notifications
- **ROUTINE:** `5 Days` turnaround target. Standard lab priority.
- **URGENT:** `2 Days` turnaround target. Displays amber warning badge and triggers executive admin notification in Navbar & Dashboard alert banner.
- **STAT / IMMEDIATE:** `24 Hours` turnaround target. Displays pulsing rose critical badge and triggers immediate high-priority admin notification in Navbar & Dashboard banner.

### Sample Accession Intake
- Located in [`NewSampleModal.tsx`](frontend/src/components/samples/NewSampleModal.tsx).
- Storage Condition has been removed from manual input (defaults safely to `'Controlled Room Temp 20-25°C'`).
- Compendial Test selection has been removed from the initial accession intake form (defaults safely to empty array `[]`).
- Priority selection dynamically updates SLA target banner directly above the submit button.

### ALCOA+ Audit Trail
- Any change made by non-admin staff triggers:
  1. An immutable audit record in PostgreSQL (`audit_logs` table).
  2. Live notification on the Admin dashboard.
  3. Navbar alert badge count increment.

### Security & Authentication
- Header: `Authorization: Bearer <accessToken>`.
- Token keys: `cp_lims_token`, `cp_lims_refresh_token`, `cp_lims_user`.
- Multi-storage support (SessionStorage for shared terminals vs LocalStorage for Remember Me).

---

## 5. Development Commands

| Task | Location | Command |
|---|---|---|
| **Start Backend Dev Server** | `backend/` | `npm run start:dev` (runs on `http://localhost:3001/api/v1`) |
| **Start Frontend Dev Server** | `frontend/` | `npm run dev` (runs on `http://localhost:3000`) |
| **Prisma Generate** | `backend/` | `npm run prisma:generate` |
| **Prisma DB Push / Migrate** | `backend/` | `npm run prisma:push` or `npm run prisma:migrate` |
| **Prisma Studio UI** | `backend/` | `npm run prisma:studio` |
| **Database Seed** | `backend/` | `npm run prisma:seed` |
| **Frontend Type Check** | `frontend/` | `npx tsc --noEmit` |
| **Git Push** | Workspace Root | `git push origin main` |

---

## 6. Guidelines for Fast & Correct Agentic Changes
1. **Always read `PROJECT_CONTEXT.md` and `TASK_PLAN.md` first** before beginning work.
2. **For small changes:** Locate target file directly, edit using `replace_file_content` or `multi_replace_file_content`, run `npx tsc --noEmit`, and push to git.
3. **For complex/multi-file changes:** Write step-by-step plan in `TASK_PLAN.md` first, implement methodically, verify, and update `TASK_PLAN.md`.
4. **Never stop dev servers:** Dev servers (`npm run start:dev` and `npm run dev`) run continuously in background processes. Do not restart them unless environment variables or schema change.
