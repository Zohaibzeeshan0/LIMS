# Star LIMS — Task Plan & Execution Tracker

> **Document Status:** Active  
> **Repository:** [https://github.com/Zohaibzeeshan0/LIMS](https://github.com/Zohaibzeeshan0/LIMS)  
> **Last Updated:** October 2026

---

## 1. Operating Instructions

1. **Before Every Task:**
   - Review `PROJECT_CONTEXT.md` for architecture, file locations, and operational conventions.
   - Review `TASK_PLAN.md` for current state and recent change history.
2. **For Small Changes (Targeted UI/Logic tweaks):**
   - Skip deep codebase analysis.
   - Directly edit target files.
   - Verify with `npx tsc --noEmit`.
   - Update `TASK_PLAN.md` under **Recent Completed Work**.
3. **For Complex Changes (New features, schema migrations, multi-module updates):**
   - Fill in the **Current Task Specification** below.
   - Break down into discrete phases.
   - Execute step-by-step.
   - Validate end-to-end.
   - Record completion and push to GitHub.

---

## 2. Current Task Specification

- **Task Name:** Dashboard Executive KPI Cards Enhancement
- **Status:** `COMPLETED`
- **Objective:**
  1. Display actual live database counts for all 4 KPI cards (Total Samples, Received Samples, Active Batches, Approved Samples) without fake fallback numbers.
  2. Remove percentage badges and "vs last week / in workflow" sublines completely.
  3. Make all 4 KPI cards clickable with routing: Total Samples -> /samples, Received Samples -> /samples?status=RECEIVED, Active Batches -> /batches, Approved Samples -> /samples?status=APPROVED.
- **Files Involved:**
  - `frontend/src/app/page.tsx`
  - `frontend/src/app/samples/page.tsx`
  - `backend/src/sampling/sampling.service.ts`
- **Checklist:**
  - [x] Integrate real `activeBatches` and `totalBatches` count in backend `getSampleMetrics`.
  - [x] Query live batches in `page.tsx` and compute actual active batches.
  - [x] Remove percentage and trend badges from all 4 KPI cards on Dashboard.
  - [x] Convert 4 KPI cards into interactive `<Link>` elements with hover transitions.
  - [x] Support `status` URL query parameter in `samples/page.tsx` to automatically filter on click.
  - [x] Verify frontend with `npx tsc --noEmit` and backend with `nest build`.
  - [x] Push to GitHub.

---

## 3. Recent Completed Work History

| Date / Commit | Feature / Change | Key Files Modified | Summary |
|---|---|---|---|
| **2026-10-20** | Dashboard KPI Cards Overhaul | `page.tsx`, `samples/page.tsx`, `sampling.service.ts` | Actual DB counts, removed percentage/trend sublines, and added click-through navigation for Total, Received, Active Batches, and Approved. |
| **2026-10-20** (`86a5ee2`) | API Network Error Handling | `frontend/src/lib/api.ts` | Wrapped fetch in try/catch to catch connection drops gracefully. |
| **2026-10-20** (`b77c25a`) | Quantity Units & All Emergency Records | `NewSampleModal.tsx`, `EditSampleModal.tsx`, `page.tsx`, `sampling.service.ts` | Quantity unit restricted to Tablets, Capsules, Raw Data, Other (with manual text input). Dashboard admin priority banner displays all expedited samples without limit. |
| **2026-10-20** (`b602fe6`) | Remove Analytical Unit Header | `frontend/src/app/samples/page.tsx` | Removed "SELECT ANALYTICAL UNIT • Click any laboratory to filter records" text from samples page. |
| **2026-10-20** (`382c3a6`) | Planning & Context System Init | `PROJECT_CONTEXT.md`, `TASK_PLAN.md` | Created persistent architectural guide and task plan tracking documents. |
| **2026-10-20** (`5c0e0a4`) | Sample Modal Form Cleanup | `frontend/src/components/samples/NewSampleModal.tsx` | Removed "Storage Condition" input and "Assign Compendial Tests" selection section. Retained Priority selector and dynamic SLA notice banner. |
| **2026-10-20** (`1bfbe0e`) | Priority SLA Targets & Admin Alerts | `frontend/src/components/samples/NewSampleModal.tsx`, `backend/src/sampling/sampling.service.ts`, `frontend/src/app/page.tsx` | Added 5-day SLA for Routine, 2-day for Urgent, and 24-hour for Immediate. Configured automatic Admin notification banner & Navbar alerts on Urgent/Immediate samples. |
| **2026-10-20** (`52f8645`) | Dashboard Pending Sample Routing | `frontend/src/app/page.tsx`, `frontend/src/app/samples/page.tsx` | Clicking a pending sample on Dashboard redirects directly to that specific laboratory tab (SAF, SEF, PENICILLIN, GENERAL) with sample detail modal automatically opened. |
| **2026-10-20** (`634eb7b`) | Lab Activity Log Filter Cleanup | `frontend/src/app/page.tsx` | Removed numeric counters from "All" and "Staff" tabs in the Activity Log filter bar, leaving clean titles. |
| **2026-10-20** (`f2a8904`) | System Info Table Removal | `frontend/src/app/page.tsx` | Removed redundant System Information card/table from the Executive Dashboard per user request. |
| **2026-10-20** (`8f95c51`) | Non-Admin Activity Tracking & Alerts | `backend/src/audit-logs/audit-logs.service.ts`, `frontend/src/components/layout/Navbar.tsx` | Recorded audit log for any non-admin staff action with real-time notification alert displayed to Admin. |
| **2026-10-20** (`c278918`) | Login Page Branding & Redesign | `frontend/src/app/login/page.tsx` | Redesigned login portal with City Pharma branding, responsive split card layout, and demo credentials box. |

---

## 4. Upcoming Task Template (For Future Tasks)

```markdown
### Task: [Task Title]
- **Status:** `[PENDING | IN_PROGRESS | COMPLETED]`
- **Target Files:**
  - `path/to/file1`
  - `path/to/file2`
- **Implementation Steps:**
  1. [Step 1]
  2. [Step 2]
  3. [Step 3]
- **Verification Plan:**
  - Run `npx tsc --noEmit`
  - Verify in browser / API
  - Commit & push to `origin main`
```
