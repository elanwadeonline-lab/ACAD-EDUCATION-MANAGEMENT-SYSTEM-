# Phase 2 Report: Complete User Journeys, Cross-Role Data Flow & Functional Verification

**Product Name**: ACQAD / eCard (ExamPool Institutional Platform)  
**Audit Date**: November 3, 2026  

---

## 1. End-to-End Connected Institutional Narrative

ACQAD operates as a unified, single-source-of-truth academic state machine where every action taken by one role immediately propagates to downstream stakeholders:

```
[Technical Admin: Cloud Control Plane]
   │  (Provisions School License, Feature Flags & Monitors Node Health via 60s Heartbeat)
   ▼
[School Administrator: /ADMIN/*]
   │  (Configures 2026/2027 Session -> First Term -> Classes -> Enrolls Students -> Assigns Teachers)
   ▼
[Teacher / Class Master: /teacher/*]
   │  (Authors Question Bank -> Publishes CBT Exam/Assignment -> Grades Essays & CA -> Computes Gradebook)
   ▼
[Student: /student/*]
   │  (Views Timetable -> Takes Timed CBT Exam / Offline Assignment -> Submits -> Views Released Score & XP)
   ▼
[Guardian: /guardian/*]
      (Switches Linked Ward -> Reviews Exam Scores, Performance Trends, Report Cards, Attendance & Messages Teacher)
```

---

## 2. Verified Role-by-Role User Journeys

### 2.1 Administrator (Operator) Journey
**Route Prefix**: `/ADMIN/*`  
**Demo Identity**: System Admin (Operator Role, `id=1`)

1. **School Configuration (`/setup` & `/ADMIN/settings`)**:
   - Configures institutional identity (`ExamPool School`), branding assets, grading boundaries, LAN DNS/mDNS zero-config access (`exampool.local:8001`), and database snapshot backups.
2. **Academic Session & Term Lifecycle (`/ADMIN/academic-sessions`)**:
   - Establishes the active Academic Session (`2026/2027`, `id=27`) and its three terms (`First Term` active, `Second Term` and `Third Term` archived/staged).
   - Manages Grade Levels (`Primary 1–6`, `JSS 1–3`, `SS 1–3`, `100–600 Level`, `ND 1–2`) and Class arms.
3. **Class Teacher Appointment (`/ADMIN/class-teachers`)**:
   - Appoints `Default Teacher` (`id=3`) as Class Master for `JSS 3` (`class_id=9`), logged in `class_teacher_assignments` with audit notes (`"Appointed as JSS3 Class Master"`).
4. **Curriculum & Subject Management (`/ADMIN/subjects`)**:
   - Creates CBT and Grading Subjects, assigns subject teachers, and manages student subject enrollments (`subject_enrollments`).
5. **User Enrollment & Guardian Linking (`/ADMIN/users`)**:
   - Manages 360 user accounts across Students, Teachers, Guardians, and Operators; supports bulk CSV/Excel enrollment and approves Guardian-Student relationships (`guardian_student_links`, 7 approved links).
6. **Timetable & Kiosk Supervision (`/ADMIN/timetable`, `/ADMIN/kiosk-dashboard`)**:
   - Schedules examination dates, time windows, durations, and venues; monitors lockdown CBT kiosk terminals.
7. **Annual Results, Report Cards & Licensing (`/ADMIN/annual-results`, `/ADMIN/report-card`, `/ADMIN/license`)**:
   - Reviews institutional broadsheets, runs promotion rules, previews/prints official report cards, and verifies hardware-locked licensing.

---

### 2.2 Teacher & Class Master Journey
**Route Prefix**: `/teacher/*`  
**Demo Identity**: Default Teacher (`id=3`, Subject Teacher & appointed `JSS 3` Class Master)

1. **Authentication & Teaching Overview (`/teacher` → `/teacher/dashboard`)**:
   - Signs in via role-isolated teacher portal; views active academic cycle banner (`2026/2027 • First Term`), assigned subjects (`english ENG12`, `Timetable E2E`, `Geo Homework`, `Physics Homework Online`, `Take-home Offline CSV`, `Online A2`, `Final Check ASG`), publication states, and quick action menus (`Inspect questions`, `Gradebook`, `Results`).
2. **Question Bank & Assessment Authoring (`/teacher/questions`, `/teacher/assignments`, `/teacher/content`)**:
   - Authors multi-format questions (`objective`, `essay`, `true_false`, `fill_in_the_blank`, `file_upload`) with marks, explanations, and solutions, or imports question papers from DOCX/Excel and the National Content Bank.
   - Publishes assessments (`is_published = 1`) and configures result release policy (`immediate` vs `manual`).
3. **Subject Grading Center & Gradebook (`/teacher/grading` → `/teacher/grading/details`)**:
   - Configures Continuous Assessment (CA) and Examination weight policies (`grading_policies`), auto-syncs CBT scores into the gradebook, grades student essay responses, and reviews score breakdowns.
4. **Homeroom Class Management (`/teacher/class-grading`, `/teacher/attendance`, `/teacher/report-card`)**:
   - Because `Default Teacher` is assigned to `JSS 3`, the sidebar exposes the **My Class** section for class-wide broadsheet review, terminal teacher remarks, daily attendance roll-call, and class report card generation.
5. **Result Publication & Guardian Communication (`/teacher/results`, `/teacher/messages`)**:
   - Releases examination results to students and guardians, grants retakes when needed, and exchanges real-time messages with parents (e.g., threads with Guardian `id=4` regarding homework and class progress).

---

### 2.3 Student Journey
**Route Prefix**: `/` & `/student/*`  
**Demo Identity**: Student `daniel` (`id=2`, `REG-MVH7YKJ9`, Class `SS 2`)

1. **Authentication & Learning Insights Dashboard (`/` → `/student/dashboard`)**:
   - Signs in with Registration ID or Email; lands on the **Learning Insights** workspace displaying XP progress, Scholar level, daily practice goal, streak, cohort rank, and upcoming assessments.
2. **Examination Selection & Timetable (`/student/examinations`)**:
   - Filters between School Assessments and Practice Papers; inspects assessment metadata (duration, question count, availability window) in an accessible readiness modal.
3. **Active CBT Examination & Assignment Attempt (`/student/exam`)**:
   - Enters the **Assessment Preflight** screen displaying official instructions, timing rules, and connection state.
   - Clicks **Begin Assessment** to enter the distraction-free CBT Exam Room with live countdown timer, question palette navigator, option selection, auto-save to server + IndexedDB, and confirmation dialog (**Final Attempt Summary** → **Confirm & Submit**).
   - Views the official **Submission Receipt** and opens the **Assessment Evaluation Review** breakdown.
4. **Self-Paced Practice & Offline Homework (`/student/practice`, `/student/offline-assignments`)**:
   - Selects examination bodies (WAEC, JAMB, NECO) for past-paper practice or downloads offline take-home assignment packs (`Take-home Offline CSV`) for completion without internet/LAN connectivity.
5. **Released Results & Report Cards (`/student/results`, `/student/report-card`)**:
   - Reviews completed assessment scores (7 completed attempts in DB for `REG-MVH7YKJ9`), feedback remarks, and terminal report cards.

---

### 2.4 Guardian Journey
**Route Prefix**: `/guardian/*`  
**Demo Identity**: Default Guardian (`id=4`, linked to `daniel` in `SS 2` and `Daniel Adeleke` in `JSS 3`)

1. **Authentication & Family Dashboard (`/guardian` → `/guardian/dashboard`)**:
   - Designed mobile-first (390×844 portrait) and desktop-responsive (1920×1080) with instant Light/Dark theme switching.
   - Displays the active child's identity card, overall average, attendance rate, class position, completed exams, and recent academic activity.
2. **Multi-Ward Switching & Child Dossier (`/guardian/wards`, `/guardian/wards/profile`, `/guardian/links`)**:
   - Uses the header **Switch child** dialog to toggle seamlessly between linked children (`daniel` and `Daniel Adeleke`) or link additional children via registration number.
3. **Academic Performance, Results & Report Cards (`/guardian/performance`, `/guardian/results`, `/guardian/reports`, `/guardian/examinations`)**:
   - Tracks subject-by-subject scores, longitudinal performance charts, upcoming examination schedules, and official terminal report cards.
4. **School Life & Financial Transparency (`/guardian/attendance`, `/guardian/fees`, `/guardian/calendar`)**:
   - Inspects monthly attendance calendars, term fee bills/balances, and school calendar events.
5. **Direct School Communication (`/guardian/messages`, `/guardian/announcements`, `/guardian/notifications`)**:
   - Reads school broadcasts and chats directly with subject/class teachers and administrators (verified active message thread #8 between Guardian `id=4` and Teacher `id=3`).

---

### 2.5 Technical Administrator (Control Plane & Node Telemetry) Journey
**Route Prefix**: `/ADMIN/license`, `/ADMIN/settings`, `/ADMIN/kiosk-dashboard` + Cloud Supervisory Portal `https://acad-controll.onrender.com/control/*`  
**Demo Identity**: `ACAD Platform Owner` (`owner@acad.ng`) & Local Node `INST-DEV-35C16C` (`NODE-LOCAL-01`)

1. **Local Node Identity & Hardware Lock (`/ADMIN/license`)**:
   - Displays physical host specs (CPU, RAM, OS, Hostname), cryptographic hardware fingerprint, active Enterprise/Standard tier, and air-gapped `.json` license upload workflow.
2. **Real-Time Heartbeat & Telemetry Daemon (`node_agent/`)**:
   - Every 60 seconds, `node_agent` samples host CPU, memory, disk free %, SQLite DB & WAL size, and operational counts (360 users, 48 subjects, 229 exams, 35 questions), signs the payload with HMAC-SHA256, and transmits it to `https://acad-controll.onrender.com/api/node/heartbeat`.
3. **Cloud Fleet Supervision (`/control`, `/control/schools`, `/control/installations`, `/control/monitoring`, `/control/alerts`, `/control/feature-flags`, `/control/licenses`)**:
   - Technical administrators monitor the 0–100 multi-factor health score (currently **100% Healthy** in `backend.log`), inspect connected nodes, toggle per-school feature flags, manage trials/licenses, and track incidents and audit logs.

---

## 3. Honest Verification of Empty / Incomplete / Partial States

In strict compliance with mandatory rules (no fabricated screens or false claims), the following real database and implementation states were verified:

1. **National Content Bank (`content_bank.db`)**:
   - The schema (`content_bank` + FTS5 `content_bank_fts`), Admin importer (`/ADMIN/content`), Teacher explorer (`/teacher/content`), and Student practice catalog (`/student/practice`) are 100% implemented. In the current local database file, `content_bank` has `0` pre-loaded rows until an administrator imports a package (such as `sample_jamb_pack.epkg` in the project root).
2. **Term & Annual Broadsheet Tables (`term_results`, `annual_results`)**:
   - While `exams` (229 rows), `exam_attempts` (7 rows), `questions` (35 rows), and `grading_subjects` (7 rows) contain active data, the final end-of-term aggregated tables (`term_results`, `annual_results`) have `0` pre-computed rows in the current snapshot, so `/ADMIN/report-card` and `/ADMIN/annual-results` accurately demonstrate their structured empty/period-selection states unless scores are published to term results.
3. **Attendance, Fee Ledger & Calendar Events (`attendance_records`, `fee_structures`, `academic_calendar_events`)**:
   - All UI surfaces (`/teacher/attendance`, `/guardian/attendance`, `/guardian/fees`, `/guardian/calendar`) and backend endpoints are live and functional; the current database has `0` attendance/fee/calendar rows, so those pages cleanly render their verified zero-data states without inventing fake numbers.
4. **Decoupled Control Plane Architecture**:
   - The `/control/*` UI was extracted in commit `194b40a` to the standalone cloud service (`https://acad-controll.onrender.com`), which is live (`HTTP 200`) and actively receiving heartbeats from this local server (`INST-DEV-35C16C`). Both the local node telemetry screens (`/ADMIN/license`, `/ADMIN/settings`, `/ADMIN/kiosk-dashboard`) and the live cloud Control Plane (`/control/*`) are accessible and documented.

