# ACQAD UI and flow review

Superseded by `UI_UPGRADE_PLAN.md`. Correction: the exam route already contains preflight instructions and an explicit Start action. Admin global search also already exists. The initial review did not inspect those paths deeply enough; use the newer plan for implementation decisions.

Reviewed 2 November 2026. Evidence: source inspection of the main frontend, shared UI, student dashboard/practice, root layout, API client and server routing/telemetry. This is a design proposal, not a completed visual or end-to-end QA audit. Existing working changes were preserved.

## Direction

Use system UI throughout, 16px body/input text, 14px secondary labels, 20–28px page headings, weights 400/500/600. Use tabular figures for clocks and scores rather than a different font. Neutral backgrounds, white surfaces, charcoal text, a restrained amber accent, and semantic status colors. Keep most information in rows; reserve cards for next actions, identity and meaningful progress. Proposed logo: a simple rounded identification card containing the existing ACQAD name/monogram. Confirm the exact requested lettering before replacing the brand asset.

## Findings in impact order

| Priority | Evidence | User consequence | Proposed change |
| --- | --- | --- | --- |
| P1 | `frontend/app/student/dashboard/page.tsx`: `fetchData` redirects immediately when a published exam is within its time window | A student can be taken away from practice or preparation on arriving at the dashboard | Introduce an exam readiness screen with subject, duration, availability, connection and resume state; deliberate Start action. Preserve any institution-mandated exam policy. |
| P1 | `frontend/app/student/practice/page.tsx`: offline sync failures are silently caught | A student cannot tell whether work reached the school server | Show Saved on device / Waiting for school network / Syncing / Received by server / Retry. Preserve local work until acknowledgement. |
| P1 | `frontend/app/layout.tsx`: viewport sets `maximum-scale=1` | Restricts the intended zoom experience | Remove the scale restriction and verify at 200% zoom. |
| P2 | `frontend/styles/globals.css`: remote Manrope/Geist imports and multiple font tokens | Visual identity depends on connectivity and conflicts with requested system typography | Shared tokens now use system UI and the remote font import is removed. Audit remaining literal font declarations before claiming complete consistency. |
| P2 | `frontend/components/ui`: parallel Button/Card/Tabs/Badge and `*-shadcn` implementations | Different pages can diverge in sizing, focus and state behavior | Establish one public component API; migrate incrementally with state comparisons. |
| P2 | `frontend/app/student/dashboard/page.module.css`: purple, gold and blue gradient treatments | Competing emphasis makes the next task harder to find | One quiet progress area, one primary action, plain lists for subjects and exams. |
| P2 | Root metadata says ACAD LAN; login uses ACQAD; student chrome imports `AcadBrandIcon` | Inconsistent product identity | Standardize the name, card mark and metadata across roles. |
| P2 | Dashboard telemetry request falls back to null | Failed progress data risks looking like no achievement | Render Progress unavailable with Retry; do not substitute fabricated zero values. |

## Proposed journeys

- Student: sign in → Today → choose practice or available exam → readiness → work → review → submit → receipt → feedback. Keep a distinct practice space with download state and resume. Exam screens stay focused and contain no reward animations.
- Teacher: dashboard → subject/class → question bank or assignment → validate → preview → publish → monitor → grade → release results. Draft, published and released must be distinct visible states.
- Admin: setup → academic session/term → classes/subjects → users/teacher assignment → schedule → monitor → reports. Carry session context visibly through writes.
- Guardian: link ward → choose ward → overview → attendance/results/fees → details → contact school. Keep ward identity visible on every detail screen.

Teacher/admin/guardian journeys above are proposed information architecture based on available routes, not verified walkthroughs of every page. University language (course, semester, department) requires institution configuration; do not globally relabel school concepts.

## Page coverage and acceptance checklist

| Route family | Proposed focus | Required review before migration |
| --- | --- | --- |
| `/`, `/teacher`, `/ADMIN`, `/guardian`, register/setup/reset | Calm identity card and one clear form | Wrong role, expired session, validation, recovery, keyboard |
| `/student/dashboard` | Today, next action, quiet progress | No subjects, live exam, unavailable telemetry, narrow viewport |
| `/student/practice`, `/student/offline-assignments` | Find, download, resume and sync | Offline launch, interrupted download, duplicate retry, acknowledgement |
| `/student/exam` | Readiness, question navigator, review, receipt | Timer authority, restored answers, disconnection, final submission |
| Student results/report-card | Released results and understandable feedback | Unreleased, no result, printing, selected term |
| Teacher questions/content/assignments | Authoring with preview | Draft preservation, invalid import, publication scope |
| Teacher attendance/students | Class roster and fast entry | Empty class, save failure, correction history |
| Teacher grading/class-grading/results/report-card | Entry, validation and release | Weights, missing marks, lock state, accidental release |
| Admin sessions/subjects/users/class-teachers/timetable | Searchable operational lists | Permissions, wrong session, conflict, destructive scope |
| Admin license/kiosk/settings/content | Service state and recovery | Disconnection, expired license, device state, failed save |
| Guardian wards/links/dashboard | Ward context and actionable summary | Pending link, rejected link, multiple wards |
| Guardian results/performance/reports/examinations | Academic detail | Unreleased data, term selection, empty history |
| Guardian fees/attendance/calendar | Clear status and details | Unknown balance, stale data, missing attendance |
| Messages/notifications/announcements/settings across roles | Consistent shared patterns | Unread, permission denial, empty, retry, read state |

## Frontend/backend responsibilities

Keep Next.js 15 / React 19, CSS modules and Tailwind 3 in the frontend. Reuse installed Radix, Framer Motion and Recharts. The root package has a different Tailwind major; do not apply root configuration assumptions to the frontend.

Frontend owns layout, input validation, focus, confirmation and visible request state. Server owns authorization, exam eligibility/time, released results, grade calculations and reward calculations. Existing `getStudentTelemetry()` maps to `/api/student/telemetry`; `server.ts` already builds streaks, badges and cohort leaderboards. Extend that path rather than invent a competing client points store. Server routing is partly extracted into `server/router.ts` with a legacy fallback; map an endpoint before changing it.

Search should start as scoped filtering of loaded lists, clearly labeled by object. Global cross-role search is a separate backend contract requiring authorization on every result and destination. Never imply a local filter searches the entire institution.

## Components and motion

Use the installed Radix primitives for dialogs, selects, menus and tabs, with consistent shared wrappers. shadcn offers ready-made component source; select individual patterns rather than adding a second design system. React Bits is a candidate for a limited celebratory treatment after practice; assess individual component dependencies, licensing, keyboard behavior, offline bundling and reduced-motion support before adoption. No new library was installed.

Sources: [Radix accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility), [shadcn components](https://ui.shadcn.com/docs/components), [React Bits](https://reactbits.dev/).

Proposed motion: 120ms pressed feedback, 160–200ms menus, 200–240ms panel transitions. Animate opacity/transform; respect reduced motion. No looping backgrounds or stagger delays on routine tables. No rewards, sound or distracting celebrations inside timed examinations.

Gamification should reward practice completion and improvement. Show one daily goal and earned mastery badges; make competition optional in the proposed design. Keep academic grades separate from reward points. Handle offline reward reconciliation on the server; specify the timezone for day streak boundaries. The wireframe uses illustrative values only.

## Delivery order

1. Shared tokens and typography; inventory remaining hardcoded fonts; brand/card mark proposal.
2. Shared UI component consolidation and state coverage.
3. Student Today/practice flows; explicit exam readiness and submission receipt.
4. Teacher author/publish/grade journeys, followed by admin and guardian pages.
5. Keyboard/mobile/reduced-motion/offline QA using real role accounts and backend state.

This pass changes only the shared font tokens and removes the remote font import. All other redesign work is proposed in the interactive wireframe. No connected Drive source is available in this session; no Drive guidelines were reviewed.
