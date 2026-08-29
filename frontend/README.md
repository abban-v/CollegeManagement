# Slashforge - Campus Asset & Issue Management (Frontend)

Modern, reactive Next.js frontend for campus infrastructure health monitoring, problem reporting, asset maintenance history, and verified issue resolution.

---

## ✨ Features Implemented

1. **Campus Issue Dashboard (`/`)**:
   - Live problem cards with status badges (`REPORTED`, `UNDER_REVIEW`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, `REOPENED`).
   - Priority indicators (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
   - Interactive **"I'm Affected / Upvote"** with live counters and visual feedback.
   - Comprehensive filtering by department, category, status, and sort by most upvoted.
   - Floating Action Button (FAB) for fast issue submission.

2. **Reporting Wizard (`ReportIssueModal`)**:
   - Department, location/building/room picker.
   - Asset linkage (link specific Projectors, ACs, Lab Equipment).
   - Hypotheses & Diagnostics (*"Possible Cause"*, *"Suggested Solution"* - non-mandatory).
   - Photo/evidence attachments.
   - **Real-time Duplicate Detection**: warns when an open issue already exists at the chosen location and allows a 1-click *"I'm Affected Too"* action.

3. **Issue Detail & Resolution Workspace (`/issues/[id]`)**:
   - Status transition stepper and audit log.
   - **Admin Mandatory Proof of Work**: Admins can only resolve tickets by uploading a photo proof of completion + maintenance notes.
   - **Student Reopen Protocol**: If a problem is marked resolved but persists, the reporter can reopen it with updated feedback.
   - Discussion and comment feed.

4. **Campus Maintainable Assets Catalog (`/assets`)**:
   - Digital profiles for campus hardware (Projectors, Inverter ACs, Oscilloscopes, Modular UPS, Chilled Water Pumps).
   - Health status, last serviced dates, and issue history counts.

5. **Admin Operations & Analytics (`/admin`)**:
   - Department load distribution.
   - 100% proof-of-work compliance tracking.
   - Live work order triage table.

6. **Authentication & Role Switching (`/login`)**:
   - University Google SSO (@campus.edu) & Email credentials sign-in.
   - Instant Header Role Switcher (Student vs Admin vs Facilities Staff) for easy demoing.

---

## 🚀 Running the Frontend

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔌 Connecting to Your Teammates' Backend

All API endpoint constants and types are defined in [`src/lib/api.ts`](file:///home/abban/repos/CollegeManagement/frontend/src/lib/api.ts) and [`src/lib/types.ts`](file:///home/abban/repos/CollegeManagement/frontend/src/lib/types.ts), mirroring the backend specification exactly.

When the backend API is ready:
1. Set `NEXT_PUBLIC_API_URL` in `.env.local` (e.g. `http://localhost:4000/api/v1`).
2. Point fetch requests to the pre-configured endpoints in `api.ts`.
