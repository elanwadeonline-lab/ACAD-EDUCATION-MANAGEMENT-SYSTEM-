# ACQAD / eCard School Management Platform — Video Storyboard

**Document Reference:** `ACQAD-DEMO-PRODUCTION/storyboard/STORYBOARD.md`  
**Target Duration:** Exactly 7 Minutes 40 Seconds (460 Seconds)  
**Format:** 1920×1080 Full HD @ 30 FPS  
**Target Audience:** School Proprietors, Board of Trustees, ICT Directors, Ministry Evaluators, Principals  
**Narrative Voice:** Authoritative, Professional, Institutional Academic Consultant (`en-GB-RyanNeural`)  

---

## Executive Summary & Timeline Overview

| Scene | Time Code | Duration | Module Category | Key Interfaces Shown | Core Institutional Value |
|---|---|---|---|---|---|
| **01** | `00:00 – 00:20` | 20s | Branding & Multi-Portal Architecture | `S01`, `S02`, `S03`, `S04` | Single platform unifies all school roles |
| **02** | `00:20 – 01:00` | 40s | **Module 1:** Administration | `A01`, `A02`, `A06`, `A17` | Academic sessions, terms & campus governance |
| **03** | `01:00 – 01:35` | 35s | **Module 2:** School Management | `A03`, `A04`, `A05`, `A12` | Classes, arms, subject allocation & rosters |
| **04** | `01:35 – 02:10` | 35s | **Module 3:** Teacher Experience | `T01`, `T02`, `T03`, `T04` | Question banking, assignment & exam authoring |
| **05** | `02:10 – 02:55` | 45s | **Module 6:** Assessment & Examination | `S06`, `ST10`, `ST11`, `ST12`, `ST14` | Air-gapped CBT, tamper-proof kiosk, auto-saving |
| **06** | `02:55 – 03:30` | 35s | **Module 4:** Student Experience | `ST01`, `ST02`, `ST06`, `ST07`, `M10` | Practice catalog & offline assignment packs |
| **07** | `03:30 – 04:15` | 45s | **Module 7:** Results & Analytics | `T06`, `T08`, `T09`, `A13`, `ST04` | Instant auto-grading, broadsheets & report cards |
| **08** | `04:15 – 04:50` | 35s | **Module 5:** Guardian Experience | `G01`, `M20`, `M21`, `M23`, `M28` | Multi-ward switcher, attendance & fee transparency |
| **09** | `04:50 – 05:15` | 25s | **Module 8:** Communication & Notices | `A15`, `T13`, `M29`, `M30` | Official school bulletin & two-way parent inquiries |
| **10** | `05:15 – 05:50` | 35s | **Module 9:** Offline Operations & Sync | `S05`, `A18`, `A19`, `ST07` | Zero-downtime LAN autonomy & SQLite WAL resilience |
| **11** | `05:50 – 06:20` | 30s | **Module 10:** Control Plane & Monitoring | `S90`, `A18`, `A20` | Multi-school cloud supervisory fleet health |
| **12** | `06:20 – 07:05` | 45s | End-to-End Academic Workflow | `T04` → `ST11` → `T06` → `T09` → `M25` | Complete loop: exam → CBT → broadsheet → parent |
| **13** | `07:05 – 07:40` | 35s | Deployment Models & Call to Action | `A19`, `A20`, `S01` | Turnkey LAN appliance, hybrid sync, enterprise support |

---

## Detailed Scene Specifications

### Scene 1: Introduction to ACQAD / eCard Ecosystem
- **Timeline:** `00:00 – 00:20` (20 Seconds)
- **On-Screen Headline:** `ACQAD PLATFORM | Integrated Academic Governance & Assessment`
- **Sub-Headline:** `Unified Multi-Role Portal Architecture for Modern Schools`
- **Visual Assets:** `S01_brand_student-login_desktop.png` (pan right), `S02_brand_admin-login_desktop.png` (dissolve in)
- **Motion:** Subtle Ken Burns zoom (1.0x to 1.05x). Clean brand title card overlay with `#0284c7` (primary brand blue) accent bar.
- **Narration:**
  > "Welcome to ACQAD, an integrated academic coordination and computer-based examination ecosystem engineered for educational institutions. ACQAD unifies school administration, curriculum tracking, resilient offline assessment, and family engagement into a cohesive, high-performance platform designed to operate seamlessly on campus local networks and across cloud supervisory fleets."
- **Institutional Benefit:** Replaces disconnected school spreadsheets and standalone CBT engines with a single, synchronized operating system.

---

### Scene 2: Institutional Administration & Calendar Governance
- **Timeline:** `00:20 – 01:00` (40 Seconds)
- **On-Screen Headline:** `ADMINISTRATION & GOVERNANCE | Academic Calendar Management`
- **Sub-Headline:** `Session Controls, Term Activation, and Campus Timetables`
- **Visual Assets:** `A01_admin_dashboard.png`, `A02_admin_academic-sessions.png`, `A06_admin_timetable.png`, `A17_admin_system-settings.png`
- **Motion:** Slide left transition (0.6s). Bounding-box pulse highlight on the session status badge (`2026/2027 First Term · Active`) and campus timetable grid.
- **Narration:**
  > "At the institutional core, administrators maintain end-to-end governance over the academic calendar. The administration portal enables school principals and registrars to configure academic sessions, activate active terms, enforce system-wide grading standards, and schedule institutional timetables. Real-time telemetry dashboards monitor daily attendance, active examination slots, and system operations across the entire campus."
- **Institutional Benefit:** Strict enforcement of academic deadlines, term locking, and automated session transitions with zero administrative data corruption.

---

### Scene 3: School Management & Class Structuring
- **Timeline:** `01:00 – 01:35` (35 Seconds)
- **On-Screen Headline:** `SCHOOL MANAGEMENT | Academic Operations & Structures`
- **Sub-Headline:** `Department Mapping, Class Teacher Assignments, and Student Cohorts`
- **Visual Assets:** `A03_admin_class-teachers.png`, `A04_admin_subjects.png`, `A05_admin_users.png`, `A12_admin_annual-results.png`
- **Motion:** Soft zoom on the Class Teacher Allocation table. Highlight form teacher ownership badges and admission registration IDs.
- **Narration:**
  > "School management bridges administrative structure with daily learning. Leadership maps academic departments, assigns qualified form teachers to classes and arms, registers subjects, and enrolls student cohorts. Every student record maintains admission tracking, guardian linkage, and academic progression history, ensuring absolute accountability across Junior and Senior secondary tiers."
- **Institutional Benefit:** Centralized student database eliminates ghost records, standardizes student IDs, and establishes unambiguous class teacher responsibility.

---

### Scene 4: Teacher Workspace & Question Bank Authoring
- **Timeline:** `01:35 – 02:10` (35 Seconds)
- **On-Screen Headline:** `TEACHER WORKSPACE | Curriculum & Examination Authoring`
- **Sub-Headline:** `Assigned Subjects, Rich Question Banking, and Assessment Setup`
- **Visual Assets:** `T01_teacher_dashboard.png`, `T02_teacher_subject-menu.png`, `T03_teacher_question-bank.png`, `T04_teacher_assignments.png`
- **Motion:** Panning shot across the question bank categorization filters. Zoom in on question difficulty tags and formula rendering.
- **Narration:**
  > "Teachers operate within a focused workspace tailored to their assigned curriculum. From their dashboard, educators author rich multi-format questions, curate institution-wide question banks, configure assessment rules, and schedule examinations. Automated shuffling, customizable duration controls, and pass mark definitions give teachers complete pedagogical control over classroom evaluations."
- **Institutional Benefit:** Reduces exam preparation overhead by 70% through reusable question repositories while preventing exam leaks via automated question randomization.

---

### Scene 5: Autonomous CBT Engine & Exam Kiosk
- **Timeline:** `02:10 – 02:55` (45 Seconds)
- **On-Screen Headline:** `CBT ENGINE | Secure Computer-Based Testing`
- **Sub-Headline:** `Lockdown Terminals, Live Timers, Scratchpads, and Instant Auto-Save`
- **Visual Assets:** `S06_exam_kiosk-terminal_desktop.png`, `ST10_exam_instructions.png`, `ST11_exam_active-question.png`, `ST12_exam_answer-selected.png`, `ST14_exam_submit-summary.png`
- **Motion:** Dynamic zoom into the live exam countdown clock and active question navigator palette. Subtle callout on the "Live Scratchpad" and "Calculator" modal triggers.
- **Narration:**
  > "ACQAD's flagship assessment engine delivers resilient computer-based testing even in air-gapped exam halls. When scheduled, assessments lock into tamper-resistant kiosk terminals. Students verify their seat and pin, review preflight instructions, and navigate questions with built-in scratchpads, scientific calculators, and visual timers. Responses are saved instantly to local storage, shielding examinees from power or network drops."
- **Institutional Benefit:** Zero exam loss during power outages, complete prevention of student cheating, and sub-millisecond local response recording.

---

### Scene 6: Student Experience & Self-Paced Learning Desk
- **Timeline:** `02:55 – 03:30` (35 Seconds)
- **On-Screen Headline:** `STUDENT EXPERIENCE | Autonomous Learning Hub`
- **Sub-Headline:** `Assessment Desks, Past-Paper Practice, and Offline Study Packs`
- **Visual Assets:** `ST01_student_dashboard.png`, `ST02_student_examinations.png`, `ST06_student_practice.png`, `ST07_student_offline-assignments.png`, `M10_student_dashboard_mobile.png`
- **Motion:** Side-by-side presentation showing responsive desktop and mobile student interfaces. Highlight "Download Offline Pack" button.
- **Narration:**
  > "For students, the ACQAD portal is an engaging personal learning desk. Learners view upcoming assessments, review released grades, and access an extensive practice catalog featuring past WAEC and mock papers. Students can download encrypted offline assignment packs to their personal devices, complete homework without internet access, and synchronize scores automatically when reconnected."
- **Institutional Benefit:** Fosters independent student mastery with self-directed test preparation and equity for students lacking constant home internet.

---

### Scene 7: Results Computation, Broadsheets & Report Cards
- **Timeline:** `03:30 – 04:15` (45 Seconds)
- **On-Screen Headline:** `RESULTS & ANALYTICS | Instant Evaluation & Analytics`
- **Sub-Headline:** `Automated Grading, Term Broadsheet Matrix, and Digital Report Cards`
- **Visual Assets:** `T06_teacher_grading-center.png`, `T08_teacher_results.png`, `T09_teacher_broadsheet.png`, `A13_admin_report-cards.png`, `ST04_student_results.png`
- **Motion:** Smooth horizontal pan across the comprehensive class broadsheet table. Highlight automated score sums, position ranking column, and official report card layout.
- **Narration:**
  > "Evaluation is instantaneous and comprehensive. Objective questions grade automatically upon exam submission, while subjective questions enter the teacher grading centre for rubric scoring. ACQAD automatically computes class averages, subject rankings, and term broadsheets. With one click, administrators generate tamper-evident digital report cards complete with principal remarks and grading keys."
- **Institutional Benefit:** Eliminates human grading arithmetic errors, compresses result turnaround time from weeks to minutes, and produces verifiable PDF report cards.

---

### Scene 8: Guardian Portal & Family Mobile Desk
- **Timeline:** `04:15 – 04:50` (35 Seconds)
- **On-Screen Headline:** `GUARDIAN EXPERIENCE | Mobile-First Family Desk`
- **Sub-Headline:** `Multi-Child Management, Live Attendance, and Fee Receipts`
- **Visual Assets:** `G01_guardian_dashboard_desktop.png`, `M20_guardian_dashboard_mobile.png`, `M21_guardian_switch-child_mobile.png`, `M23_guardian_performance_mobile.png`, `M28_guardian_fees_mobile.png`
- **Motion:** Video clip inset from `R03_guardian_mobile-tour.mp4` showing rapid child switching, term score breakdown, and fee statement on a smartphone screen.
- **Narration:**
  > "Parents and guardians enjoy unprecedented visibility through a mobile-first portal. Guardians can monitor multiple siblings from a single account, reviewing real-time class attendance, published examination results, teacher remarks, and school fee payment statuses. This transparency deepens parent-school partnership and keeps families actively invested in their children's progress."
- **Institutional Benefit:** Enhances parental engagement, reduces school office inquiry queues, and accelerates term school fee collection.

---

### Scene 9: Communication & Notifications
- **Timeline:** `04:50 – 05:15` (25 Seconds)
- **On-Screen Headline:** `COMMUNICATION | Institutional Announcements & Inquiries`
- **Sub-Headline:** `Secure Bulletins, Direct Teacher Inquiries, and Audit Logging`
- **Visual Assets:** `A15_admin_messages.png`, `T13_teacher_messages.png`, `M29_guardian_messages_mobile.png`, `M30_guardian_announcements_mobile.png`
- **Motion:** Crossfade between admin announcement editor and parent smartphone bulletin feed. Highlight read confirmation tags.
- **Narration:**
  > "Direct, authenticated communication keeps the school community synchronized. Administrators publish institution-wide announcements and emergency bulletins, while guardians and teachers exchange private messages regarding academic progress and pastoral care. All communication is securely archived within the institutional database, preserving institutional privacy."
- **Institutional Benefit:** Safe, traceable communication free from unstructured social media noise, guaranteeing verified institutional delivery.

---

### Scene 10: Local-First Operations & Network Resilience
- **Timeline:** `05:15 – 05:50` (35 Seconds)
- **On-Screen Headline:** `OFFLINE RESILIENCE | Uncompromising Local-First Architecture`
- **Sub-Headline:** `High-Throughput Bun Engine, SQLite WAL, and PWA Fallbacks`
- **Visual Assets:** `S05_offline_fallback_desktop.png`, `A18_admin_network-status.png`, `A19_admin_backup-restore.png`, `ST07_student_offline-assignments.png`
- **Motion:** Highlight network indicator switching between LAN Local Mode and Cloud Sync. Technical callout boxes showing SQLite WAL durability.
- **Narration:**
  > "A critical advantage of ACQAD is its uncompromising local-first design. Powered by a high-throughput Bun HTTP backend and SQLite write-ahead-logging, the platform continues delivering examinations and recording attendance even when public internet is completely down. Background synchronization queues hold operational transactions, uploading them securely to cloud endpoints once connectivity restores."
- **Institutional Benefit:** Immunity to internet outages, low power consumption, and no dependence on external cloud servers for daily campus operations.

---

### Scene 11: Control Plane & Supervisory Fleet Telemetry
- **Timeline:** `05:50 – 06:20` (30 Seconds)
- **On-Screen Headline:** `CONTROL PLANE | Cloud Supervisory Fleet Oversight`
- **Sub-Headline:** `Multi-Campus Health Telemetry, Schema Sync, and Diagnostics`
- **Visual Assets:** `S90_controlplane_api-health_desktop.png`, `A18_admin_network-status.png`, `A20_admin_license-info.png`
- **Motion:** Zoom in on real live JSON telemetry response from `https://acad-controll.onrender.com`. Highlight server status, DB connectivity, and active license keys.
- **Narration:**
  > "For multi-campus school groups and educational ministries, the ACQAD Control Plane provides centralised fleet management. Technical supervisors monitor server CPU health, memory usage, SQLite database sizes, and API latency across distributed campus nodes. Automated health beacons alert administrators to node degradation before students enter examination halls."
- **Institutional Benefit:** Total visibility across tens or hundreds of school branches without manual server visits or complex VPN networks.

---

### Scene 12: End-to-End Academic Workflow Walkthrough
- **Timeline:** `06:20 – 07:05` (45 Seconds)
- **On-Screen Headline:** `CONNECTED WORKFLOW | The Complete Academic Lifecycle`
- **Sub-Headline:** `From Examination Scheduling to Parent Report Card Release`
- **Visual Assets:** Dynamic 5-stage montage: `T04_teacher_assignments.png` → `ST11_exam_active-question.png` → `T06_teacher_grading-center.png` → `T09_teacher_broadsheet.png` → `M25_guardian_reports_mobile.png`
- **Motion:** Rapid, coordinated workflow transitions demonstrating live data flowing between Teacher, Student, System, and Guardian in a single continuous story.
- **Narration:**
  > "Experience the complete synergy of the ACQAD ecosystem. A physics teacher schedules a mid-term examination from their portal. Students sit for the assessment inside the secure exam kiosk. As soon as the final student submits, objective scores calculate automatically and populate the teacher gradebook. The school principal approves the term broadsheet, and within seconds, parents receive a notification on their mobile phones to view the verified report card."
- **Institutional Benefit:** Proves the seamless interoperability of all modules in a single real-world educational day.

---

### Scene 13: Deployment Models, Enterprise Value & Closing
- **Timeline:** `07:05 – 07:40` (35 Seconds)
- **On-Screen Headline:** `DEPLOYMENT & PARTNERSHIP | Transforming School Operations`
- **Sub-Headline:** `Turnkey LAN Appliances, Hybrid Cloud, and Institutional Support`
- **Visual Assets:** `A19_admin_backup-restore.png`, `A20_admin_license-info.png`, `S01_brand_student-login_desktop.png`
- **Motion:** Smooth pull-back to wide branding shot. Animated contact card and institutional call-to-action banner. Slow fade to black.
- **Narration:**
  > "ACQAD deploys flexibly as a self-contained on-premise server appliance, a private school LAN node, or a hybrid cloud-synchronized cluster. With military-grade data sovereignty, zero per-exam licensing penalties, and exceptional performance on standard school hardware, ACQAD is the definitive operating system for modern academic institutions. Partner with ACQAD today to transform your institution's digital future."
- **Institutional Benefit:** High return on investment, perpetual data ownership, predictable budgeting, and professional engineering support.

---

*Storyboard confirmed and verified against real screenshots and codebase implementation.*

