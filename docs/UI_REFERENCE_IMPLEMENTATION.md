# Reference-led UI implementation

Started 2 November 2026. This plan supersedes the visual composition in the older role design exploration. See REFERENCE_UI_ANALYSIS.md for the source and data mapping.

## Design decisions

- Retain system UI typography and existing tokens: carbon #0C0D12, primary #92400E, gold #F59E0B, white #FFFFFF, neutral canvas #F5F5F4, border #E5E7EB. Display hierarchy uses size/spacing, and metrics use tabular numerals.
- Student: the third image drives a three-column learning overview: large academic progress panel, recent results/achievements, subject score bars. Preserve the next action above it and working assessment/rewards content below it. No simulated XP series or decorative wave data.
- Guardian: the fourth image drives greeting, visible child strip, child profile, school tools, attendance/results/activity. Bottom navigation becomes desktop side navigation at larger widths. Replace custom child-switcher overlay with installed Radix Dialog.
- Admin/Teacher: images 1–2 drive the light sidebar and shadcn dashboard-01 metric composition; adapt to actual academic values and actions.
- The signature is the student's real progress panel paired with an academic activity ledger. Avoid a second decorative hero or unrelated colors.

## Component choices before integration

| Component | External foundation | Data and integration |
| --- | --- | --- |
| Existing `ui/Card.tsx` and new `MetricCard` | shadcn Card/section-cards source, adapted to CSS modules and Tailwind 3 | Retain existing Card API; add semantic slots and reusable metric variants; use real totals, progress, descriptions and existing links. |
| Student learning overview | Installed Recharts + adapted Card, native progress | Existing released results, chronological series, telemetry and subject breakdown. No new API. |
| Guardian child switcher | Installed Radix Dialog supported package | Controlled by existing GuardianContext, stable ward IDs and callbacks; focus containment, Escape, title and description. |
| Guardian navigation | Konsta mobile navigation pattern evaluated; existing Next Links retained | Preserve destinations, real unread counts, active route semantics; responsive mobile/desktop layout. No Konsta theme migration. |
| Shared operational sidebar | shadcn dashboard-01/sidebar composition | Existing route groups, mobile toggle and account/session context. |

Tremor Raw currently requires Tailwind 4. Konsta's current theme setup also requires extra integration. Neither is installed just to import styling. shadcn source uses v4 utilities/aliases that will be replaced with existing CSS variables. Record source attribution in `frontend/THIRD_PARTY_UI.md`.

## Work and validation

1. Adapt shared Card/metric/progress primitives.
2. Integrate Guardian shell/dashboard and accurate chart representation.
3. Integrate Student overview and correct expired-vs-completed presentation.
4. Apply shared metrics/light shell to Admin/Teacher.
5. Typecheck and build; inspect desktop/mobile renders and exercise changed controls. Record actual results and outstanding limitations here.

Status: implementation in progress. This file is updated with actual validation at completion.

## Implemented changes

- Shared Card now uses the adapted shadcn slot composition, restrained borders and token styling. Removed decorative lift-on-hover. Added reusable MetricCard, ProgressBar and AcademicChart. Charts distinguish chronological series from subject categories and provide textual values.
- Guardian shell now has a parent greeting, visible linked-child strip, phone bottom navigation, desktop navigation and Radix child-picker dialog and Radix Avatar with real-photo/initials fallback. Removed name-based gender guesses and decorative fallback illustrations. Dashboard now prioritizes the selected child, fee notices, real summary metrics, practical school tools, actual scores and updates. The nonfunctional period toggle and misleading category-to-time-series fallback were removed from this dashboard.
- Student dashboard now has reference-led Learning insights, section links, a three-column learning overview, published-result activity, real subject bars and telemetry goals. Preserved assessment actions, timetable, rewards and leaderboard; assessment filters now use Radix Tabs. Expired windows are separated from completed sittings. Subject previews and recent-result rows use released results. Fixed the Offline Hub navigation to the existing offline-assignments route.
- Admin and Teacher use the shared metric system and a light operational sidebar. Admin averages normalize scores by total marks and count completed scripts; Teacher distinguishes class roster totals from students with completed scripts. Existing tables, search, session controls and teaching actions remain connected.
- Guardian settings no longer initializes a fabricated identity. Profile loading/error states are explicit, and logout calls the existing role-aware logout hook. Root viewport configuration now supports safe-area layout without disabling zoom.

## Actual source files touched in this implementation

- `frontend/components/ui/Card.tsx`, `Card.module.css`, `MetricCard.tsx`, `MetricCard.module.css`, `AcademicChart.tsx`, `AcademicChart.module.css`.
- `frontend/components/ui/Sidebar.tsx`, `Sidebar.module.css`, `StudentTopBar.tsx`, `StudentTopBar.module.css`; `frontend/styles/globals.css`; `frontend/app/layout.tsx`.
- `frontend/components/guardian/GuardianMobileShell.tsx`, `GuardianMobileShell.module.css`, `StudentAvatar.tsx`, `StudentAvatar.module.css`; `frontend/app/guardian/dashboard/page.tsx`, `page.module.css`; `frontend/app/guardian/settings/page.tsx`.
- `frontend/components/student/LearningOverview.tsx`, `LearningOverview.module.css`; `frontend/lib/studentDashboard.ts`; `frontend/app/student/dashboard/page.tsx`, `page.module.css`; `frontend/app/student/layout.module.css`.
- `frontend/app/ADMIN/dashboard/page.tsx`, `page.module.css`; `frontend/app/teacher/dashboard/page.tsx`, `page.module.css`.
- `frontend/THIRD_PARTY_UI.md`; `tests/student_dashboard_presentation.test.ts`; `scripts/ui_reference_smoke.cjs`; this plan and the refreshed reference analysis.

The checkout already contained extensive uncommitted edits. The list above identifies files touched by this pass, not authorship of all differences against Git HEAD.

## Verification record

- Frontend TypeScript: passed.
- Assessment presentation tests: 3 passed, 10 assertions. Tests cover closed windows vs completion, live/upcoming/assignment/TBA states and invalid schedules.
- Production export: final clean build and browser checks are being completed.
- Browser harness uses intercepted fixtures only, with separate role pages. It never relies on real school credentials or writes to backend APIs. Desktop and emulated phone verification does not constitute real-device or backend isolation/concurrency testing.
- Existing CSP blocks development-runtime eval; verification uses production artifacts without weakening that policy. A subsequent build encountered a stale generated output error, so generated output was archived inside ignored scratch storage and the build rerun cleanly.

## Remaining product work

The shared shell now reaches all existing role pages; individual non-dashboard forms, report workflows and tables retain their existing implementations. The component-by-component inventory in REFERENCE_UI_ANALYSIS.md remains the roadmap for deeper redesign of those pages. Real iOS/Android notch, keyboard and touch behavior and authenticated multi-user journeys need device/backend testing; no claim is made that these were verified by fixture rendering.

## Latest user correction: closer reference replication and wider page coverage

The user explicitly rejected the prior Student composition as insufficiently close. The Student dashboard now uses the rounded white app frame, slim icon rail, larger Learning insights heading, pill navigation, XP target panel with a decorative layered gold wave, activity/achievement panel and subject/goal column from the supplied reference. Academic charts remain tied to real results; the wave is marked decorative. Mobile uses a floating bottom rail and stacked panels.

Material UI 9.5.0 and its official Next 15 App Router/Emotion adapter were installed. Guardian uses its scoped ThemeProvider, AppRouterCacheProvider, BottomNavigation/BottomNavigationAction and ButtonBase. Existing role/context/API logic is retained. Package and lock files were updated. The operational page inventory is recorded in OPERATIONAL_PAGE_REDESIGN_INVENTORY.json: 21 page CSS modules received card, KPI and form-control refinements. These are a surface pass, not a claim that every page interaction has received a bespoke redesign.

Validation from the earlier pass does not automatically validate this revised composition or the new Material integration. Fresh build and browser results are recorded below when complete.

The wider pass also refines the existing shared Table, FilterBar, PageHeader, AssignClassTeacher and ReportCard CSS foundations used by delegated routes. No paid templates were purchased. Material UI is integrated through its supported npm packages and official Next.js adapter, with its existing package license. npm reported dependency audit findings during installation; no automatic force-upgrade was applied. The installation updated the existing npm lockfile.

### Latest revision validation

- Installed Material UI 9.5.0 with Emotion and official Next 15 App Router cache integration.
- Fresh TypeScript validation passed after installation completed.
- Fresh production build passed: 70 static pages generated.
- Browser fixture checks passed for Student, Guardian, Admin and Teacher at 1440px, 390px and 320px; no runtime exceptions or document-width overflow.
- Student assessment filter keyboard navigation and closed-window filtering passed. Guardian child selection, dialog Escape/focus return, dark mode, empty states and profile load/error checks passed.
- Screenshots in ignored local scratch/ui-reference use test fixtures, not school data. Student desktop visual review confirmed the closer reference composition with gold XP wave, icon rail, pills and rounded app frame.
- The operational inventory is a 21-page surface refinement plus shared delegated surfaces. Full bespoke composition and end-to-end acceptance of every non-dashboard route remain open; no claim is made otherwise.

Material UI cache integration uses enableCssLayer so unlayered eCard CSS modules retain precedence over Material defaults. This was added after reviewing the rendered Guardian tool cards. The current Student screenshot is a production fixture render; percentages, names and dates in that artifact are test data. Production components continue using the existing authenticated API and context values.

Final CSS-layer rebuild passed and the fixture browser suite was rerun against it. The Student reference revision and Guardian Material UI integration retain passing desktop/390px/320px checks. Backend concurrency and full bespoke per-route workflow acceptance remain separate open validation items.

## Summary-home and selection-flow correction

The latest user request replaces the long Student dashboard with summary-only Home. Removed the lower legacy assessment grid, schedule, repeated milestone panels and detailed chart from Home; preserved the reference XP/activity/subject/goal composition. Six route-aware rail destinations now cover Home, Practice, Examinations & Assignments, Results, Notifications and Profile. Non-exam Student pages use the reference shell; exam hall remains independent.

Practice now uses existing manifest/offline callbacks with an explicit exam-body selector, optional year selector, paper rows and a Radix details modal. Selecting a body or row does not start practice. Start practice retains the existing exam route and offline checks. The new examinations route uses real session-scoped subjects/results and server time, lists available assessments and previews them in a modal. Only available exams/assignments expose an enabled exam-hall action. Home no longer auto-redirects to an active exam.

Guardian uses Material UI SwipeableDrawer and ListItemButton for the child picker, retains mobile BottomNavigation, and prioritizes child identity and quick tools above mobile metrics. Shared metrics and Teacher cards use a subtle decorative gold wave SVG, with no metric values encoded.

Research: Material UI List/Select/Dialog/Drawer official docs; React Bits Tilted Card; Expo Next.js integration documentation. Chosen supported web components fit the existing Next.js architecture. Expo native migration and pointer-tilt cards were evaluated, not installed as unrelated runtime dependencies. Existing Material UI, Radix and Framer Motion packages provide the necessary interaction foundations.

### Summary-home / app-flow validation

- Fresh TypeScript and production build passed, generating 71 static pages including /student/examinations.
- Existing assessment grouping tests: 3 passed (10 assertions).
- Browser fixture suite passed for all four roles at desktop, 390px and 320px widths, with no document overflow or runtime exceptions.
- Home assertions confirm removal of the legacy assessment grid and extra engagement chart.
- Practice checks confirm no paper rows before body selection, modal-only row activation, Escape dismissal preserving selection, and explicit Start practice navigation to the existing exam route.
- Examinations checks confirm a scheduled future assessment has a disabled start action. Existing retake behavior remains on Results.
- Guardian checks confirm Material SwipeableDrawer selection, Escape and focus return, dark mode, profile error state and responsive layouts. Fifteen Guardian subpage surface modules plus native subpage headers and the More tools list were refined. These checks use isolated fixtures; real-device gestures and backend multi-user acceptance are not claimed.
- Teacher page cards and shared metrics use the decorative /gold-card-wave.svg. The wave is visual decoration, not analytics.
- Preview artifacts: scratch/ui-reference/student-desktop.png, student-practice-modal.png, guardian-390.png.

Additional source files in this correction: frontend/app/student/examinations/page.tsx; frontend/components/student/PracticeCatalog.tsx; frontend/components/student/AssessmentFlow.module.css; frontend/public/gold-card-wave.svg; docs/GUARDIAN_APP_SURFACES.json. Existing Student dashboard/practice/layout/rail/overview, Guardian shell/settings/dashboard/styles, Teacher page modules and shared MetricCard styles were updated.

## Login, scroll, exam-room and academic-workbench amendments (3 November 2026)

- Replaced all four login pages with shared PortalLogin, retaining the Student login’s official AcqadLogo. Login text and wordmark use weight 500; Admin/Teacher sidebar logos are larger and weight 700. SVG gradient IDs are unique per instance. Successful Student sign-in returns Home unless an explicit permitted redirect was supplied; exam entry is still intentional.
- Student has a static navigation column and independently scrolling main content capped at 1200px. Phone navigation remains fixed at the bottom; print rules preserve report printing.
- Exam preflight, in-progress header, final review, normal receipt and hidden/scheduled-release receipts use the official logo and a quieter visual system. No submission, timer, offline-save, release or anti-cheat state handlers were replaced.
- Teacher grading and grade-entry surfaces remove decorative waves, repeated card borders and excess fills; editable fields and approval/error states remain. Teacher results uses a flat period summary, search, subject/publication filters, sortable ledger and shared Radix review modal. Admin annual results uses the same summary language while preserving promotion actions.
- Guardian audit covers the existing dashboard, child list/detail, results, reports, performance, attendance, fees, messages, notifications, calendar, announcements, linking, registration and settings surfaces. The current app remains a Next.js mobile web/PWA experience using Material UI/Radix; an Expo native binary has not been created. Native header/context/More navigation remains shared; child-detail tabs now use Material UI. Removed duplicate mobile child/period controls that conflicted with the shared shell.
- Guardian profile navigation now uses a static-export-safe /guardian/wards/profile?id=... route, while existing pre-generated detail routes remain. Missing or unlinked IDs no longer fall back to another child. Missing medical/contact fields display Not provided. Unrecorded weekdays are no longer marked present, and zero attendance/score values remain zero.
- Added resultPublicationState and tests so scheduled or explicitly unreleased results are not labelled Published. Table sorting is keyboard reachable with aria-sort.

Latest source files: components/auth/PortalLogin.tsx and .module.css; components/brand/AcqadLogo.tsx; all role login page.tsx files; shared login styling; Student layout/rail/exam styling; ResultsSummary.tsx/.module.css; resultPresentation.ts; teacher grading/details Gradebook.module.css; Teacher results/ReviewModal; Admin annual-results; Guardian ward profile route/detail/list, attendance/performance and shell; shared FilterBar/Table.

### Final refinements requested during review

- All four login layouts now fill the viewport width, with no centered outer card, maximum width, border or rounded frame. Viewport height is a minimum, not a fixed height or maximum; taller forms can scroll. Shared official branding and weight-500 login typography remain. The dark story heading has an explicit contrasting white color. Phone inputs use at least 16px type.
- Grading details retains the subject title, matrix, save and approval actions. Removed the redundant Continuous Assessment & Examination eyebrow and replaced the Draft/Approved badge and status dot with plain text. Read-only scores are unboxed. The shared score breakdown has a slim bar, an unboxed 100 / 100 total, no repeated green Balanced badge, and intact invalid-total feedback. Breakdown presets and component rows use spacing and separators in place of nested tinted cards.
- Assigned-subject cards on the Teacher dashboard keep Published as green text, with no fill, border or rounded badge. Every card exposes one See more trigger using the installed Radix DropdownMenu. Questions, Gradebook and Results remain available in the menu, with keyboard navigation, Escape and focus restoration. Draft subjects retain the existing Author questions destination. Results links now initialize the subject filter from the subjectId query.
- Phone exam-room headers, tools and question actions now have dedicated rows rather than compressed desktop positioning. Preflight no longer fabricates a 40-question count or an undefined practice title.
- A functional regression found while exercising the exam flow was corrected: a zero timer before an attempt starts no longer submits an unstarted practice. Active expired/resumed attempts still submit on expiry. Existing answer payload, offline-save, release and anti-cheat behavior remains in place.

Validation artifacts are fixture-only and contain no school data. The Guardian implementation remains mobile web/PWA on Next.js, using Material UI and Radix rather than an Expo native binary. Physical-device gestures and backend multi-user isolation are outside these browser checks.

### Verified completion checklist

- [x] Full-width Student/Admin/Teacher/Guardian sign-in layouts; matching official logo; login font weights at most 500; readable dark-panel title; desktop and 390/320px phone checks.
- [x] Larger bold official branding in Admin/Teacher navigation.
- [x] Student static rail and independently scrolling main content capped at 1200px; summary Home and explicit paper-selection flow retained.
- [x] Exam preflight, question room, final review and receipts updated; phone and desktop room fit verified. Fixture flow confirms no pre-start submission, preservation of answer option zero and only one submit request after repeated confirmation.
- [x] Guardian shared mobile app shell, child picker, linked-child profile tabs and existing route surfaces checked. Thirteen additional Guardian routes render in the mobile shell without document overflow or runtime exceptions in the fixture suite; unknown child ID and profile-load error states checked.
- [x] Teacher grading details and breakdown simplified, with plain Draft mode, unboxed total and read-only scores, and matrix controls retained.
- [x] All Teacher assigned-subject cards have See more menus; plain Published labels; keyboard menu opening, menu items, Escape and focus restoration verified.
- [x] Teacher results subject link/filter and unpublished filter verified; Admin annual-results route and summary render checked.
- [x] TypeScript passed; final production build passed (72 generated pages); presentation tests passed (7 tests, 15 assertions); final four-role desktop/390px/320px browser fixture suite passed; changed-source whitespace check passed.

Final previews in scratch/ui-reference: student-login.png; teacher-subject-menu.png; teacher-gradebook.png; teacher-gradebook-breakdown.png; student-exam-desktop.png; student-exam-room.png; guardian-390.png; admin-annual-results.png. These screenshots use isolated fixture data. No real-school exam, grading, payment or messaging mutation was performed by these checks.

Final screenshot review corrections: the grading sheet now fills its desktop workspace rather than shrinking to table contents. Removed duplicate child-picker buttons from eight Guardian subpages in favor of the shared app header; the compact header keeps the avatar visible and has an explicit accessible child-switch label. Attendance legend totals preserve zero and no longer use sample 46/4-day fallbacks. Calendar month text is computed from the selected month/year, and undated/unrecorded statuses are not inferred as present. These refinements are included in the final rebuild and repeated browser check below.
Final post-review rebuild passed with 72 pages. The repeated four-role browser suite passed after the gradebook-width and Guardian-context fixes, including the new desktop gradebook width assertion, shared child-selector labels, selected calendar month and absence-placeholder checks. Type checking is included in this production build. The presentation tests remain 7 passing with 15 assertions.
