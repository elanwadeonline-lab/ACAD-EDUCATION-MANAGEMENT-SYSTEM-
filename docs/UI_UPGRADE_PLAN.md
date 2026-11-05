# Flow-led UI upgrade proposal

This supersedes the first review's incomplete flow assessment. Source-reviewed, not a completed browser walkthrough. No application code changes in this pass.

## Current flows to preserve

- Student login checks available subjects and results and may route to an active examination. The dashboard also redirects to an available published examination. The exam route already has preflight instructions, an explicit Start action, question navigation, flags, submission confirmation and completion screens. Improve continuity and clarity; do not build a second preflight or assume redirection starts a timed attempt.
- The exam screen supports official assessments, assignments and learning/practice modes. Keep shared question rendering but make the mode visible and keep mode-specific instructions and feedback separate.
- The submission handler caches work after network failure, then reaches a generic success toast. Distinguish local storage from server acceptance. Do not describe a queued response as a received submission or display the placeholder zero as an earned score.
- Teacher navigation currently separates Students, Attendance Register, Class Broadsheet, Report Cards, Guardian Inquiries, Question Bank, Content Library, Subject Grading and Exam Results. Keep these destinations reachable; group by tasks and preserve class/session context between them.
- Admin already has a global search component with categories, session/term filters and `api.globalAdminSearch`. Upgrade its presentation and request-state handling; retain the endpoint rather than proposing a new search backend.
- Guardians already have an active-ward context and no-linked-ward screen. Preserve the link-first branch and persistent ward identity.

## Component selection

Use one Radix-based shadcn visual system over the existing React 19 / Next 15 frontend. Existing Radix primitives, Framer Motion, Recharts, Lucide and initial shadcn-style components are reusable. Consolidate overlapping wrappers before bulk replacement. Frontend uses Tailwind 3: inspect source compatibility before copying current blocks; do not run an unrestricted latest CLI migration.

| Product job | Specific component | Source | What improves |
| --- | --- | --- | --- |
| Teacher/admin workspace | Sidebar, Breadcrumb, Dropdown Menu, Tooltip | shadcn, Radix variant | Stable navigation, visible location, grouped destinations |
| Student workspace | Tabs for local filters; simple route links for navigation; Avatar and Dropdown Menu | shadcn/Radix | Compact shell with clear current destination |
| School/session/ward selection | Popover + Command combobox; Select for short fixed lists | shadcn | Search long lists without a full-page detour |
| Admin search | Command Dialog + grouped Command Items | shadcn (`cmdk` dependency to assess) | Search from the header; preserve existing category/session filtering and results |
| User lists, rosters, results | Data Table pattern + TanStack Table | shadcn + TanStack | Consistent sorting, filtering, selection and pagination; preserve server paging semantics |
| Grade entry | Table + Input + inline validation + sticky save summary | shadcn, existing grade logic | Fast keyboard entry with visible unsaved/failed/saved state |
| Question/ward/user quick inspection | Sheet, Separator, Badge | shadcn/Radix | View details without losing the current list and filters |
| Exam instructions | Card, Separator, Alert, Checkbox only if policy requires it, Button | shadcn | One concise brief with explicit Start; do not require an extra checkbox without reason |
| Answer selection | Radio Group, Checkbox, Textarea | shadcn/Radix | Whole answer row selectable, visible keyboard focus, correct control for question type |
| Question navigation | Custom domain grid using Button + Tooltip | shadcn primitives | Answered/flagged/current states have text/accessibility labels; mobile navigator in Sheet |
| Final exam submission | Alert Dialog with answered/unanswered/flagged summary | shadcn/Radix | Review consequences before a final action; allow return to questions |
| Submission receipt | Alert + status heading + Button | shadcn | Separate received, queued, retrying and failed; keep receipt state persistent |
| Loading/empty/error | Skeleton, Empty, Alert | shadcn | Consistent recovery and stable layout instead of blank pages |
| Save/download feedback | Sonner toast, persistent inline status | shadcn/Sonner, new dependency if chosen | Toast confirms an event; ongoing sync remains visible after it disappears |
| Practice progress | Progress, Badge, existing Recharts | shadcn + installed chart library | Quiet daily goal, evidence of improvement, earned milestones |
| Purposeful transitions | AnimatePresence, layout transitions, reduced-motion policy | installed Framer Motion | Smooth panel/menu changes, no extra animation engine |
| School setup wizard | Stepper, adapted and checked for keyboard/reduced motion | React Bits | Guided setup sequence: school → session → classes → review |
| Optional public pitch feature | Spotlight Card, static fallback on touch | React Bits | Subtle pointer detail on one feature card; not on data tables or exam controls |

External references: [shadcn components](https://ui.shadcn.com/docs/components), [Radix Command](https://ui.shadcn.com/docs/components/radix/command), [Radix Sheet](https://ui.shadcn.com/docs/components/radix/sheet), [TanStack Table](https://tanstack.com/table/latest), [Motion reduced motion](https://motion.dev/docs/react-use-reduced-motion), [React Bits Stepper](https://reactbits.dev/components/stepper), [React Bits Spotlight Card](https://reactbits.dev/components/spotlight-card).

Do not combine several full component suites. shadcn supplies the visual foundation, Radix behavior, TanStack complex table logic, installed Motion transitions, and selected React Bits accents. The wireframe is plain interactive HTML demonstrating the proposal, not installed library components.

## Wireframe journeys

1. Student exam: available exam → existing brief → question workspace → review → server receipt or saved-on-device state. Login/exam policy remains unchanged until explicitly redesigned.
2. Student practice: library → choose/resume pack → attempt → explanation → session summary/progress. Downloads carry a persistent local storage status.
3. Teacher assessment: subject/context → question bank → preview → publication review → published state. Separate draft saving from consequential publication. Return to the same filtered list.
4. Teacher grading: subject or class → marks table → validation → save → release review → released state. Keep grade computation on the server; show counts and scope before release.
5. Admin: scoped search/list → record detail Sheet → edit → saved record in original list. Session switching remains visible. Setup uses a dedicated guided flow.
6. Guardian: link ward if needed → ward overview → released result/attendance detail → enquiry. Keep ward and term visible; a different ward must never silently inherit the previous ward's details.

## Visual and interaction specification

- System UI everywhere, 16px body and inputs, 14px secondary text, 24–28px page titles. Use normal 400/500/600 weights and tabular numbers.
- Neutral page canvas, one opaque surface layer, charcoal text, muted amber primary actions. Semantic status colors appear only with text. Use existing brand amber as the initial direction.
- 8px spacing rhythm; 8–12px corners; thin separators; restrained shadows only for floating surfaces. Dense work uses rows and tables; only meaningful tasks/progress use cards.
- One primary action per task area. Row details use Sheets; substantial authoring uses a full page; final release/submit uses Alert Dialog; routine edits use inline recovery.
- Press feedback 100–120ms; menus 160ms; drawers and mode transitions 180–240ms. Opacity/transform only where possible. Keep routine controls immediate and disable nonessential motion when requested by the OS.
- Student playfulness lives in practice milestones and optional celebrations, not official exam chrome. No animated background, pointer trails or continuous counters in daily work.
- Mobile: collapse teacher/admin navigation into a Sheet, retain class/term, make filter controls wrap, keep inputs at 16px, and make important actions reachable without hover. Use a mobile record list when a table's columns are not essential; preserve an accessible scrollable table for true comparison tasks.

## Implementation waves

1. Inventory existing shared wrappers and states; create one Button/Input/Select/Table/Dialog/Sheet/Badge API; validate one desktop and one mobile reference screen.
2. Student exam end-to-end including preflight, restored answers, review, timed expiry, queued submission, server acceptance and released/unreleased results. Preserve backend contracts.
3. Practice library, download/resume, explanations and server-derived rewards.
4. Teacher question authoring/publication and grading/release, then admin search/list/detail.
5. Guardian ward switching and result/enquiry flows, remaining pages, optional public pitch polish.

Each wave must complete with keyboard navigation, loading/empty/error states, mobile layout and relevant offline recovery. Pin and review any added package version against React 19 and Tailwind 3 before installation. The interactive wireframe is a flow reference, not production QA evidence.
