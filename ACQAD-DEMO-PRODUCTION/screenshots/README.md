# ACQAD Application Screenshot Archive

This folder contains **77 authentic screenshots** captured directly from the live running ACQAD platform across desktop (1920×1080) and mobile (390×844) viewports.

Every screenshot was taken with real session tokens, bypassing simulated mockups to present the genuine state of the school management software.

---

## Screenshot Categories & Prefixes

- `S01`–`S06`: **Public & Institutional Branding**
  - Sign-in portals for Students, Administrators, Teachers, and Guardians.
  - PWA Offline Fallback interface (`S05`).
  - Lockdown Exam Kiosk Terminal (`S06`).
- `S90`: **Control Plane & Supervisory Health**
  - Live cloud supervisory API telemetry from `https://acad-controll.onrender.com/api/health`.
- `A01`–`A22`: **Institutional Administration (`/ADMIN/*`)**
  - Academic sessions, terms, form class teacher allocations, subjects, user accounts, timetables, annual broadsheets, report card generation, messaging, network diagnostics, backups, and licensing.
- `T01`–`T15`: **Teacher Experience (`/teacher/*`)**
  - Teacher dashboard, question bank authoring, assignment management, grading centre, gradebook, class broadsheets, attendance, students, and report cards.
- `ST01`–`ST19`: **Student Experience (`/student/*`)**
  - Dashboard, examinations desk, past-paper practice library, offline assignment packages, notifications, live CBT examination attempt, and submission receipt.
- `M01`–`M02`: **Mobile Sign-In**
  - Mobile authentication entry for Students and Guardians.
- `M10`–`M11`: **Student Mobile Portal**
  - Responsive student dashboard and released grades on a phone.
- `M20`–`M34`: **Guardian Mobile Suite (`/guardian/*`)**
  - Complete 15-screen family mobile journey: dashboard, child switching, ward profiles, term GPA progress, results, report cards, examinations, attendance records, school fees & receipts, teacher messaging, announcements, notifications, calendar, and preferences.
- `G01`–`G03`: **Guardian Desktop Portal**
  - Full widescreen desktop views for parents and guardians.

For machine-readable metadata including exact routes, role tags, and dimensions, refer to [`manifest.json`](manifest.json).

