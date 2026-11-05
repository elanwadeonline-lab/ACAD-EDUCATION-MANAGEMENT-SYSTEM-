# Phase 1 Report: Comprehensive Application Analysis & Commercial Module Mapping

**Product Name**: ACQAD / eCard (ExamPool Institutional Management & Offline-First CBT Platform)  
**Repository**: `ACAD-EDUCATION-MANAGEMENT-SYSTEM-`  
**Version Audited**: `5.3.0` (Schema Version `5`)  
**Audit Date**: November 3, 2026  

---

## 1. Executive Summary

The **ACQAD / eCard (ExamPool)** platform is an offline-first, LAN-capable institutional academic management, computer-based testing (CBT), continuous assessment grading, guardian engagement, and cloud-supervised school operations ecosystem.

It follows the architectural doctrine **"CLOUD SUPERVISES. LOCAL ACAD OPERATES."**:
1. **On-Premise Campus Server (`server.ts` + `exampool.db`)**: Runs autonomously on a local school server (Windows/Linux) using **Bun** and **SQLite (WAL mode)** on port `8001`, accompanied by a **Next.js 15 / React 19** frontend (port `3000` in dev mode, or statically served from `frontend/dist` in production). It includes an embedded UDP DNS server (`:53`) and mDNS responder (`:5353`) for zero-internet LAN discovery (`exampool.local`), plus a background **Node Agent Daemon (`node_agent/`)**.
2. **Cloud Supervisory Control Plane (`ACAD-CONTROL` at `https://acad-controll.onrender.com`)**: Extracted into a dedicated multi-tenant supervisory service (commit `194b40a`), receiving HMAC-SHA256 signed heartbeats every 60 seconds from campus nodes and pushing back license entitlements, feature flags, and release notifications.

---

## 2. Actual Technology Stack & System Architecture

### 2.1 Backend Stack
- **Runtime**: **Bun `1.4.2`** (`Bun.serve` HTTP server in `server.ts`, modular zone router in `server/router.ts`, route handlers in `server/handlers/*.ts`, and domain services in `src/services/*`).
- **Databases (SQLite with WAL Mode via `bun:sqlite`)**:
  1. **`exampool.db`** (Primary Campus Database — 41 relational tables covering users, RBAC, academic sessions/terms, grade levels, classes, subjects, questions, CBT exams, attempts, answers, v1 & v2 grading engines, term/annual results, attendance, fees, guardian links, threaded messages, notifications, kiosk sessions, and licenses).
  2. **`content_bank.db`** (Attached National Past-Question Repository — `content_bank` + SQLite **FTS5** virtual index `content_bank_fts` for WAEC, NECO, JAMB, and NABTEB past questions).
  3. **`practice_logs.db`** (Attached High-Write Student Practice Telemetry database).
  4. **`telemetry_buffer.db`** (Local store-and-forward FIFO queue holding up to 10,000 node telemetry events during internet outages).
  5. **`acad_control.db`** (Upstream Supervisory Control Plane database — 15 tables managing multi-campus organizations, schools, node installations, licenses, trials, feature flags, heartbeats, alerts, incidents, backups, sync queues, and platform audit logs).
- **Authentication & Security**:
  - **Password Hashing**: **Argon2id** (`Bun.password.hash`, memoryCost 8192, timeCost 2) in `auth.ts`.
  - **Session Tokens**: WebCrypto **HMAC-SHA256 (`HS256`)** JWTs (`__exampool_session` and role-scoped cookies `__exampool_session_operator`, `__exampool_session_teacher`, `__exampool_session_student`, `__exampool_session_guardian`) paired with per-tab `sessionStorage` Bearer tokens and `X-Portal-Role` headers for strict multi-tab role isolation.
  - **Hardware Anti-Cloning**: Machine fingerprint (`EP-HW-...`) derived from host CPU, RAM, and network MAC address (`/api/system/license`).
  - **Node-to-Cloud Authentication**: HMAC-SHA256 payload signatures (`X-ACAD-Installation-Id`, `X-ACAD-Node-Id`, `X-ACAD-Timestamp`, `X-ACAD-Signature`) with a ±300s anti-replay window.

### 2.2 Frontend Stack
- **Framework**: **Next.js `15.1.0`** (App Router) + **React `19.0.0`** + **TypeScript `5.7.2`**.
- **Design System & Brand Identity**:
  - Authoritative brand component: `frontend/components/brand/AcqadLogo.tsx` (`AcqadLogo` & `AcadBrandIcon`).
  - Brand Palette: Deep Academic Gold (`#F59E0B`, `#D97706`, `#92400E`) on Carbon (`#0C0D12`) and crisp neutral light/dark surfaces.
  - UI Primitives: **Radix UI** (`Dialog`, `DropdownMenu`, `Select`, `Tabs`, `Tooltip`, `Avatar`), **MUI v9**, **Tailwind CSS `3.4.19`**, CSS Modules, **Framer Motion `12`**, **Recharts `3.10`**, and **Lucide React**.
- **Document Processing & Offline Storage**:
  - **IndexedDB (`offlineDb` / Service Workers `sw.js`, `sw-guardian.js`)**: Local caching of exam sessions, offline practice packs, and queued submissions (`useOfflineAutoSync.ts`).
  - **Importers/Exporters**: `mammoth` (DOCX question parsing), `xlsx` (spreadsheet import/export), and native printable report card views.

---

## 3. Complete Frontend Route Inventory (63 Local Routes + 17 Control Plane Routes)

### 3.1 Public, Authentication & Utility Routes (10 Routes)
- `/` — Student Portal Sign-In (Registration Number / Email + Password)
- `/register` — Student Self-Registration (active when term `registration_open = 1`)
- `/forgot-password` — Offline-compatible Password Reset Request (notifies school operator)
- `/setup` — First-Run Institutional Setup Wizard
- `/kiosk` — Dedicated Lockdown CBT Kiosk Terminal
- `/~offline` — PWA Offline Fallback Page
- `/ADMIN` — Administrator / Operator Sign-In
- `/teacher` — Teacher Portal Sign-In
- `/guardian` — Guardian Portal Sign-In
- `/guardian/register` — Guardian Self-Registration & Ward Link Request

### 3.2 Administrator / Operator Portal (`/ADMIN/*` — 14 Operational Routes)
- `/ADMIN/dashboard` — Institutional Overview (KPI metrics, active session/term banner, system health, quick actions)
- `/ADMIN/academic-sessions` — Academic Sessions, Terms, Grade Levels, Classes, Calendar Events, and Flexible Grading Schemes
- `/ADMIN/class-teachers` — Homeroom Class Teacher Appointment & Assignment Audit History
- `/ADMIN/subjects` — Global Subject Registry, Teacher Assignment, CBT/Grading Mapping, and Student Subject Enrollment
- `/ADMIN/timetable` — CBT Examination & Assessment Timetable Scheduler
- `/ADMIN/annual-results` — Annual Broadsheet Computation, Principal Remarks, and Student Promotion Engine
- `/ADMIN/report-card` — Institutional Report Card Workspace (Single & Cumulative Transcripts, Print/PDF)
- `/ADMIN/content` — National Past-Question Content Bank Manager (`.epkg`, CSV, JSON, DOCX import & FTS5 search)
- `/ADMIN/users` — Master User Directory (Students, Teachers, Guardians, Operators), Bulk CSV Import, Guardian Link Approval, and Fee Management
- `/ADMIN/notifications` — Institutional Notification Center & Password Reset Alerts
- `/ADMIN/messages` — Administrative Guardian Messaging Inbox
- `/ADMIN/license` — Cryptographic Hardware Fingerprint & Master License Activation
- `/ADMIN/settings` — Institutional Branding, Network & Domain Discovery, Grading Rules, and SQLite Backup/Restore
- `/ADMIN/kiosk-dashboard` — Real-Time Lockdown Kiosk Fleet Monitor

### 3.3 Teacher Portal (`/teacher/*` — 14 Operational Routes)
- `/teacher/dashboard` — Teaching Overview (Assigned subjects, published status, question counts, quick actions menu)
- `/teacher/students` — Enrolled Student Roster by Subject & Homeroom Class
- `/teacher/questions` — Assessment & Question Bank Authoring Studio (Objective, Essay, True/False, Fill-in-Blank, File Upload, DOCX/Excel import)
- `/teacher/assignments` — Homework & Take-Home Assignment Manager (Online CBT & Offline CSV/File Packs)
- `/teacher/content` — Past-Question Content Bank Explorer & Cloner
- `/teacher/grading` — Subject Grading Center (Continuous Assessment & Exam Policy Configuration)
- `/teacher/grading/details` — Interactive Subject Gradebook, Essay Script Marking & Score Breakdown (`?id=<gradingSubjectId>`)
- `/teacher/class-grading` — Homeroom Class Master Broadsheet & Teacher Remarks (Class Teachers)
- `/teacher/attendance` — Daily & Subject Roll-Call Attendance Register
- `/teacher/results` — CBT Examination Attempt Results, Retake Grants, Unlocking & Score Distribution
- `/teacher/report-card` — Homeroom Student Terminal Report Card Preview
- `/teacher/messages` — Two-Way Guardian-Teacher Messaging Threads
- `/teacher/notifications` — Teacher Activity & Submission Notifications
- `/teacher/settings` — Teacher Profile & Security Settings

### 3.4 Student Portal (`/student/*` — 9 Operational Routes)
- `/student/dashboard` — Student Learning Insights (XP, Scholar Level, Streak, Cohort Rank, Active Exams, Recent Performance)
- `/student/examinations` — Scheduled School Assessments, Exam Timetable & Readiness Dialog
- `/student/exam` — Active CBT Examination & Assignment Room (Preflight Instructions -> Timed Question Navigator -> Review Summary -> Submission Receipt & Evaluation Breakdown)
- `/student/practice` — Self-Paced Past-Question Practice Catalog (WAEC/JAMB/NECO Filter, Offline Pack Download, Instant Solution Reveal)
- `/student/offline-assignments` — Offline Take-Home Assignment Downloader & Sync Queue
- `/student/results` — Released Examination & Assignment Score History
- `/student/report-card` — Official Student Terminal Report Card
- `/student/notifications` — Real-Time Student Notification Stream
- `/student/settings` — Student Profile & Password Settings

### 3.5 Guardian Portal (`/guardian/*` — 16 Operational Routes)
- `/guardian/dashboard` — Family Overview ("A little closer to school day", Ward Switcher, Academic Averages, Attendance, Fee Balance, Recent Activity)
- `/guardian/wards` — Linked Children Directory & Summary Cards
- `/guardian/wards/[id]` & `/guardian/wards/profile` — Detailed Student Dossier & Bio-Data Tabs
- `/guardian/links` — Link Another Child (`reg_id` request & verification status tracker)
- `/guardian/performance` — Longitudinal Subject Performance & Trend Analytics
- `/guardian/results` — Released CBT & Continuous Assessment Results per Ward
- `/guardian/reports` — Official Terminal Report Cards & Promotion Status
- `/guardian/examinations` — Ward Upcoming Exam Timetable & Homework Deadlines
- `/guardian/attendance` — Monthly Attendance Calendar & Absence Breakdown
- `/guardian/fees` — Term Fee Bills, Payment History & Receipts
- `/guardian/messages` — Direct Two-Way Chat with Class Teachers, Subject Teachers & Administration
- `/guardian/announcements` — Official School Broadcasts & Circulars
- `/guardian/calendar` — Institutional Academic Calendar
- `/guardian/notifications` — Guardian Alert Center
- `/guardian/settings` — Guardian Profile, Light/Dark Theme & Notification Preferences

### 3.6 Supervisory Control Plane (`https://acad-controll.onrender.com/control/*` — 17 Routes)
- `/control/login`, `/control`, `/control/schools`, `/control/schools/new`, `/control/schools/[id]`, `/control/installations`, `/control/trials`, `/control/licenses`, `/control/feature-flags`, `/control/monitoring`, `/control/alerts`, `/control/incidents`, `/control/backups`, `/control/releases`, `/control/sync-queue`, `/control/audit-logs`, `/control/settings`.

---

## 4. Mapping Expected Commercial Modules vs. Actual Implementation

| # | Expected Commercial Module | Implementation Status | Verified Real Capabilities | Architectural Differences / Gaps Documented |
| :- | :--- | :--- | :--- | :--- |
| **1** | **Administration** | **100% Implemented** | First-run `/setup`, `/ADMIN/dashboard`, `/ADMIN/users` (RBAC for 4 roles + bulk import), `/ADMIN/settings` (branding, LAN DNS, SQLite backup/restore), `/ADMIN/license` (hardware fingerprint & cryptographic license binding), `audit_logs`. | Password recovery (`/forgot-password`) routes reset requests to the local Administrator notification queue rather than external email, matching air-gapped LAN operation. |
| **2** | **School Management** | **100% Implemented** | `/ADMIN/academic-sessions` (Sessions, Terms, Grade Levels across Primary/Secondary/University, Classes, Calendar), `/ADMIN/class-teachers` (homeroom teacher appointment), `/ADMIN/subjects` (curriculum & enrollment), Fee structures & payments. | Fee payments are recorded/verified via administrative/bursar ledger entries (`cash`, `bank_transfer`, `pos`); online card gateway checkout is intentionally omitted for offline LAN compatibility. |
| **3** | **Teacher** | **100% Implemented** | `/teacher/dashboard`, `/teacher/students`, `/teacher/questions`, `/teacher/assignments`, `/teacher/content`, `/teacher/grading`, `/teacher/class-grading`, `/teacher/attendance`, `/teacher/messages`. | Historical doc `TEACHER_ARCH_FIX_PLAN.md` has already been fully resolved in code. Teachers who are appointed as Class Teachers dynamically receive the **My Class** navigation group. |
| **4** | **Student** | **100% Implemented** | `/student/dashboard` (gamified XP, streaks, cohort rank), `/student/examinations`, `/student/exam`, `/student/practice`, `/student/offline-assignments`, `/student/results`, `/student/report-card`. | In the current demo database, `content_bank.db` has 0 pre-imported national past questions by default unless an `.epkg` or CSV pack is imported via `/ADMIN/content` (or tested via `sample_jamb_pack.epkg`). |
| **5** | **Guardian** | **100% Implemented** | Complete 18-route mobile-first & desktop-responsive Guardian portal (`/guardian/*`) with live ward switching, results, reports, performance charts, attendance calendar, fees, announcements, and teacher/admin chat. | Historical doc `GUARDIAN_ARCHITECTURE_REPORT.md` predates the completed Guardian Portal build; all 18 routes exist and operate against `exampool.db`. |
| **6** | **Assessment & Examination** | **100% Implemented** | Multi-format question bank (Objective, Essay, True/False, Fill-in-Blank, File Upload), DOCX/XLSX import, `/ADMIN/timetable` scheduling, deterministic per-student shuffling, server timer authority, lockdown `/kiosk` mode. | Fully operational end-to-end. |
| **7** | **Results & Analytics** | **100% Implemented** | `/teacher/grading` & `/teacher/grading/details` (CA + CBT auto-sync + manual scores + essay grading), `/teacher/results`, `/ADMIN/annual-results` (promotion engine), `/ADMIN/report-card` (single & cumulative transcripts), `/guardian/performance`. | In the current `exampool.db` snapshot, CBT exam results (`exams` table, 229 rows) and `grading_subjects` (7 rows) are populated, while `term_results` / `annual_results` await final term computation approval. |
| **8** | **Communication & Notifications** | **100% Implemented** | Real-time SSE/polled `NotificationBell` & `/notifications` across all 4 portals (817 notifications in DB), two-way threaded messaging (`guardian_message_threads` / `guardian_messages`) between Guardians, Teachers, and Admins, plus `/guardian/announcements`. | External SMS/WhatsApp gateways are not connected; all messaging and notifications run natively over the school network and PWA notification stream. |
| **9** | **Offline Operations & Synchronisation** | **100% Implemented** | Built-in LAN DNS (`:53`) & mDNS (`:5353`), PWA service workers (`sw.js`, `sw-guardian.js`), `/~offline` route, `/student/offline-assignments`, local IndexedDB answer persistence, `telemetry_buffer.db` FIFO queue, and bidirectional Control Plane sync. | Fully operational. Every 60s `node_agent/` syncs feature flags, license state, and heartbeats with the cloud Control Plane. |
| **10** | **Control Plane & Monitoring** | **100% Implemented (Decoupled)** | Embedded `node_agent/` in local server + standalone multi-tenant Control Plane deployed at `https://acad-controll.onrender.com` (`/control/*`) with 0–100 health scoring, fleet monitoring, license/trial management, and feature flag overrides. | Architectural separation: commit `194b40a` extracted `/control/*` from the local campus repo into the standalone cloud supervisory service (`https://acad-controll.onrender.com`), which is live and actively receiving heartbeats from this machine (`INST-DEV-35C16C`). |

