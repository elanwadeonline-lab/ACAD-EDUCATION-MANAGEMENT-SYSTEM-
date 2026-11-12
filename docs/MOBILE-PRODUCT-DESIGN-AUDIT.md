# Acqad mobile product design direction

11 November 2026. Analysis-first design proposal; no production interface or dependencies changed in this pass. Student experience is first priority, followed by teacher and admin. Guardian work remains in the native mobile application.

## Design decision

Use the existing Next.js/React, CSS Modules, Tailwind and Radix foundations. Define a small shared component layer and semantic tokens. Preserve the golden Acqad mark, student light/dark preference and light-only staff interfaces. Premium quality comes from a clear next task, readable content, predictable navigation and complete states.

The UI/UX skill generated a warm-neutral, single-column baseline. Its generic children's fonts, marketing hero/footer pattern and suggestion to avoid dark mode do not fit this school portal. Retain the existing system font for speed and familiarity; keep student dark mode as requested.

## Findings grounded in current source

| Priority | Evidence | Implication |
| --- | --- | --- |
| P0 | StudentReferenceRail.tsx lists eight icon-only destinations. Final mobile CSS sets links to 36px wide and enables horizontal scrolling. | Destinations are difficult to recognize and cramped; navigation requires exploration. |
| P0 | Student dashboard starts with session/cohort/registration metadata, report/results actions, another section navigation and then XP insights. | Daily work competes with identity and analytics. An active exam banner exists but sits below this header/navigation. |
| P1 | LearningOverview puts XP, assessment completion and multiple metrics in the leading card. | Learning motivation dominates the immediate task; smaller phone screens spend much of the first scroll on metrics. |
| P1 | Teacher/admin navigation arrays place learning resources before Dashboard. Staff Sidebar mobile close is 28px, nav token 40px. | Ordering reflects feature additions rather than daily priorities; controls need a touch-target audit. |
| P1 | globals.css has an orange brand scale alongside gold primary colors; info text is amber while its background is blue. Library icon explicitly uses purple. | Semantics and branding are inconsistent even though shared tokens exist. |
| P1 | frontend/package.json includes MUI, Radix and local components plus two icon packages. | Additional general-purpose UI kits would increase inconsistency unless there is a deliberate component boundary. Installed dependency count alone does not establish bundle cost. |
| P1 | manifest.json still uses theme_color #4F7cff. | Installed PWA chrome does not match the Acqad palette. |
| P2 | Student layout already has dvh, mobile bottom spacing and safe-area-aware rail; chat/community recently received responsive work. | Preserve these improvements and refine rather than rebuild indiscriminately. |

This is a source and reference audit of the shared shells, student home/insights, existing chat work and staff dashboard/navigation. It is not a fresh visual inspection of every route, a user study or a physical-device certification.

## Student mobile architecture

Persistent navigation: Home / Study / Practice / Community / More. Five equal labelled targets, at least 44px each, no horizontal scrolling. Study initially links to the existing library; examinations, results, notifications and settings remain reachable from More. Preserve all existing URLs and deep links. More opens an accessible labelled sheet. Notifications also have a header entry. Active routes inside More keep More visibly selected. Hide normal navigation during an examination and use exam-specific controls.

Home order:

1. Compact school/account header; notification button; academic period as quiet context.
2. One next-action card. Running examination first, then a genuinely scheduled/due item from available data, then a study/practice entry. Never invent a deadline, recently read lesson or continuation state.
3. Today/upcoming rows with subject, due time and explicit state. If no timetable/deadline data is available, omit this section rather than manufacture a plan.
4. Study entry showing available class materials. Show Continue reading only once persistent reading progress exists.
5. Compact progress summary; deeper XP, badges, trends and results remain reachable below or on a progress screen.

Library: subject filter, search and vertical material rows with title, teacher, type, size when known and availability. Reading: stable document title/back action, explicit download availability and selection-to-note action where the viewer supports it. Private study: retain Conversation / Read & annotate modes on phones, material/page context on notes and clear partner identity. Do not imply freehand PDF editing when only passage/page notes exist.

Practice: exam body, department and combination as a short progressive flow; show a summary before Start. Enforce the existing JAMB combination contract. Keep solo and partner journeys clearly named. Community: readable discussion list, one primary creation action, replies in a dedicated detail screen, composer above keyboard. Results: period selector, release status and score rows before charts; unavailable/unreleased is not a zero score.

## Role-specific mobile priorities

| Role | First screen | Navigation proposal | Key components |
| --- | --- | --- | --- |
| Student | Next learning task | Home, Study, Practice, Community, More | NextActionCard, MaterialRow, assessment status, reading controls, compact progress |
| Teacher | Today's class work and outstanding actions | Today, Classes, Messages, More | ClassContext, AttendanceRow, compact SubjectCard, upload/review status, grade draft/save bar |
| Admin | Review queue and exceptions | Overview, Reviews, People, More | ReviewItem, scoped filters, pending count, confirmation summary, audit status |

Teacher attendance: select class/date, show roster and unmarked count, label Present/Absent/Late, confirm batch save with a persisted summary. Bulk actions must remain explicit and recoverable. Grading: one student/assessment context at a time on narrow screens; validate inline, retain drafts and show saved state. Materials: separate teacher planning notes from student-visible resources and show Draft / Submitted / Changes requested / Approved states. Assigned subject cards retain compact sizing and equal action styling already implemented.

Admin review: prioritize notes/results awaiting action; filter by class/teacher/status in a sheet; detail screen contains the record, version and action consequences. Keep publish, reject and edit visually distinct; require confirmations for consequential publication. Adapt tables by task: labelled record rows for scanning, focused detail for editing, horizontal scroll only for genuinely two-dimensional comparisons. Preserve column labels and access to all data.

Guardian native: reuse palette, spacing, status vocabulary and typography scale, implemented with React Native components. Do not transplant web CSS or web drawers into the native app.

## Proposed token contract

| Token | Light | Student dark |
| --- | --- | --- |
| canvas | #F5F5F4 | #111318 |
| surface | #FFFFFF | #1B1E24 |
| surface-subtle | #FAFAF9 | #23272F |
| text-primary | #18181B | #F4F4F5 |
| text-secondary | #52525B | #B4B8C2 |
| border | #E4E4E7 | #353A45 |
| action background | #92400E | #FBBF24 |
| action foreground | #FFFFFF | #18181B |
| brand decoration | #F59E0B | #FBBF24 |

Gold decoration is separate from text/button contrast. Validate every foreground/background pair in implementation. Success, warning, error and information need distinct semantic roles plus words/icons; no color-only meaning.

Spacing: 4/8/12/16/24/32px. Phone page gutter 16px, section gaps 24px, row padding 12-16px. Touch controls 44px minimum, principal action 48px. Body/input 16px, supporting copy 14px, minor labels 12px, screen heading 24-28px, metric 28-36px. Avoid 10-11px operational labels. Use tabular numerals for scores/times. Radius: controls 10px, cards 16px, sheets 20px upper corners; pills only for compact status/filter controls. Borders define most surfaces; shadows reserved for overlays/navigation. One icon family per portal.

Components to standardize: Button (primary/secondary/quiet/destructive), IconButton, Field, StatusBadge, TaskRow, MaterialRow, SubjectCard, PageHeader, BottomNav, Sheet, EmptyState, ErrorState, Skeleton, Toast, SaveStatus and ConfirmDialog. Every component specifies loading, disabled, error, focus and touch feedback. Build on existing components rather than keep parallel visual systems.

## External libraries and references

- Radix, already installed: preferred accessible behavior foundation for dialogs, menus, tabs and selects. Its focus/keyboard support still requires correct labels, composition and app-level testing. https://www.radix-ui.com/primitives/docs/overview/accessibility
- shadcn/ui: reference for owned component composition and sheet patterns. Select the Radix implementation to fit this repository; current documentation also offers other primitive variants. Do not run a bulk installer that overwrites local components. https://ui.shadcn.com/docs/components/sheet
- React Aria: credible alternative for a specific unresolved interaction, not a second parallel default system. https://react-aria.adobe.com/quality
- Material guidance: use app-bar/navigation and adaptive layout principles without changing Acqad into a stock Material theme. https://m3.material.io/components/app-bars/
- Dribbble Modern School App UI: published reference for school updates and academic entry grouping, not evidence of tested usability or permission to reuse artwork/code. https://dribbble.com/shots/26318491-Modern-School-App-UI
- Dribbble student mobile dashboard collection: reference-discovery list for task hierarchy and course rows, not an endorsed production template. https://dribbble.com/search/student-mobile-dashboard
- Pinterest was searched, but the requested search page could not be retrieved by the research tool. No individual Pinterest design was visually verified. Mobbin browse access was similarly unavailable. Do not claim either was fully reviewed.

No new library is needed for the first student shell/home pass. Existing Radix, CSS Modules, Tailwind and a single installed icon family are sufficient. Measure actual route bundles before choosing further dependencies. Do not reuse third-party visual assets without checking their license.

## Implementation sequence and acceptance

1. Normalize semantic tokens and component states; resolve manifest chrome branding. Keep changes scoped so staff remain light and student modes remain valid.
2. Student navigation and Home first; retain routes, authenticated sessions and examination isolation. Then library/reading/practice/results. Reuse the existing community/chat improvements.
3. Teacher task hierarchy, attendance/grading/material workflows and navigation.
4. Admin review queue and mobile record patterns.
5. Native guardian visual alignment in its own component layer.

Validate 320/360/390/430px, tablet and desktop; enlarged text and keyboard-only use; screen-reader names/focus return; reduced motion; long names, empty classes, missing data, failed upload/send and offline/reconnect. Check iOS Safari, Android Chrome and installed PWA on physical devices, including keyboard and safe areas. No horizontal page overflow or obscured last item. Preserve active exam timing and warn before leaving unsaved consequential work. Cache policy must respect user/session isolation and must not imply all features work offline.

Measure with representative users: can a student resume an exam, find a material and message a study partner without guidance; can a teacher mark a class and recover an upload; can an admin review the correct version and understand publication scope? These are validation tasks, not already measured outcomes.
