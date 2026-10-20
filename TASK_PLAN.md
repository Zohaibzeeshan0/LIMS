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

- **Task Name:** Role-Based Access Control (Admin-Only Edit) & Lab Subsections (Semi Base / Formulation)
- **Status:** `COMPLETED`
- **Objective:**
  1. Enforce strict RBAC: Admin has full access to all features. Non-admin staff (QA Manager, QC Analyst, Lab Technician, Auditor) can only enter/add new data (samples, worksheets, results) and cannot edit existing records (Edit Sample restricted strictly to ADMIN on both frontend and backend).
  2. Implement 2 sub-sections inside all 3 Labs (SEF, Penicillin, General): **Semi Base** and **Formulation**.
  3. Ensure that in each Lab, sample records and accession categories appear organized under these two sub-sections upon selection.
- **Files Involved:**
  - `backend/src/sampling/sampling.controller.ts`
  - `backend/src/samples/samples.controller.ts`
  - `backend/src/sampling/dto/sample-query.dto.ts`
  - `backend/src/sampling/sampling.service.ts`
  - `frontend/src/app/samples/page.tsx`
  - `frontend/src/components/samples/NewSampleModal.tsx`
  - `frontend/src/components/samples/EditSampleModal.tsx`
  - `frontend/src/services/sampling.service.ts`
  - `frontend/src/types/lims.ts`
- **Checklist:**
  - [x] Restrict `@Patch(':id')` in `backend/src/sampling/sampling.controller.ts` to `Role.ADMIN` only.
  - [x] Restrict `@Patch(':id')`, `@Patch(':id/archive')`, and `@Patch(':id/cancel')` in `backend/src/samples/samples.controller.ts` to `Role.ADMIN` only.
  - [x] Update `canEdit` in `frontend/src/app/samples/page.tsx` to `user?.role === 'ADMIN'` only; show clear Admin-only lock icons and tooltips for non-admins.
  - [x] Add guard in `EditSampleModal.tsx` to prevent non-admins from submitting modifications.
  - [x] In `frontend/src/app/samples/page.tsx`, create the 2 Lab Sub-Section options: **Semi Base** and **Formulation** with counts and active indicators.
  - [x] Support section filtering in `frontend/src/app/samples/page.tsx` and backend so samples belonging to Semi Base vs Formulation are filtered and displayed upon clicking either option.
  - [x] Update `NewSampleModal.tsx` to accept and default the active section (**Semi Base** vs **Formulation**) and tailor the stage categories accordingly.
  - [x] Verify TypeScript compilation with `npx tsc --noEmit` and backend build with `nest build`.
  - [x] Commit and push to GitHub repository.

---

## 3. Recent Completed Work History

| Date / Commit | Feature / Change | Key Files Modified | Summary |
|---|---|---|---|
| **2026-10-20** | RBAC Admin-Only Edit & Lab Subsections (Semi Base / Formulation) | `samples/page.tsx`, `NewSampleModal.tsx`, `EditSampleModal.tsx`, `sampling.service.ts`, `samples.controller.ts`, `lims.ts` | Restricted all sample record edits strictly to Administrator (non-admins can only enter new data). Added interactive Semi Base & Formulation subsections inside all 3 Labs (SEF, Penicillin, General) with partitioned stage categories and sample records. |
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
