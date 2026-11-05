# eCard reference analysis and component integration map

Date: 2 November 2026. Status: initial audit retained as design evidence; implementation is now recorded in UI_REFERENCE_IMPLEMENTATION.md following the user’s explicit request to start coding.

## Request interpretation

The latest request assigns images 1–2 to Admin/Teacher, image 3 to Student, and image 4 to Guardian. These references supersede the earlier proposed visual compositions in `ROLE_DESIGN_DIRECTIONS.md`. Keep the existing eCard brand tokens and real product behavior.

The immediate request is to read and understand the supplied prompt and references before replacement work. The implementation objective described in that prompt is an in-place modernization: analyze each existing component, select a compatible external foundation, adapt it, reconnect its existing state/actions/data, and verify it. A static reference dashboard is not the deliverable.

Evidence boundary: the images were supplied in the conversation. This report is based on repository source inspection and official external documentation/source; it does not claim rendered inspection, authenticated end-to-end testing, or a complete audit of every interaction on every route. Existing uncommitted changes were left intact.

## Actual frontend

The active application is `frontend/`, not the separate `exampool/frontend/` or copied project directory.

| Concern | Verified implementation | Consequence |
| --- | --- | --- |
| Framework | Next.js 15.1.0 App Router; React/React DOM 19.0.0 | Preserve existing route layouts and client component boundaries. |
| Styling | Frontend Tailwind 3.4.19, CSS modules, global CSS variables | Root package also declares Tailwind 4; that is not the frontend's installed styling version. Do not migrate Tailwind for a component. |
| Primitives | Installed Radix Dialog, Tabs, Select, Tooltip, Dropdown Menu, Avatar, Slot; local shadcn-named wrappers | Reuse accessible primitives and reconcile wrapper styles before adding another parallel system. |
| Charts | Installed Recharts 3.10.1 | Keep one chart engine; supply real series and correct chart semantics. |
| Icons | `lucide-react` plus local `components/icons/Icons.tsx` | Reuse and normalize existing icons rather than add a cosmetic dependency. |
| Animation | Installed Framer Motion | Preserve working interactions; check reduced motion when modifying transitions. |
| Data | `lib/api.ts`, page effects, `GuardianContext`, `AcademicContext` | Retain authenticated API calls, refresh behavior and academic scoping. No React Query/SWR migration is required. |
| Authentication | Role-aware tab token helpers in `lib/api.ts`; `useAuth`; `RequireRole` | UI porting must preserve role/tab isolation. Source inspection does not prove concurrency correctness. |
| Brand | Global gold/carbon/neutral tokens; guardian `--g-*` tokens | Map imported components to these tokens. Avoid importing a second default brand palette. |

Verified installed versions came from `frontend/node_modules/*/package.json`, in addition to the frontend manifest.

## Reference analysis

### Admin and Teacher: images 1–2

The matching external block is [shadcn dashboard-01](https://ui.shadcn.com/view/new-york-v4/dashboard-01): its navigation labels, metric content and table headings match the supplied examples.

Adopt the narrow light sidebar, compact header, neutral surfaces, restrained borders, readable metric hierarchy, chart toolbar and table density. Use eCard operational content and the existing session selector. A chart needs actual historical data: do not manufacture a visitors-style series from current totals. Teacher should prioritize assigned work, grading and attendance; Admin should prioritize institution operations and session management.

Current shared sidebar already has an unboxed logo and no active left-border strip. Preserve these existing improvements. Its carbon treatment still differs from the light reference.

### Student: image 3

This is the main composition reference, not merely a color sample. Its distinctive elements are a spacious heading, compact navigation, a large progress focal point, a recent-activity list, subject progress and supporting analytics. The illustrated outer frame and large screenshot padding are presentation framing, not required application UI.

Replicate the hierarchy and proportions responsively using the student's actual academic performance, practice and gamification features. Retain the existing routes rather than add empty Overview/Activity/Progress/Report tabs solely because the image contains them. On smaller screens place the next action first, then progress, activity and subject information.

The pastel waves and bubbles cannot imply nonexistent measurements. The supplied prompt also asks to remove unnecessary gradients and retain eCard colors. Therefore use a real data chart/progress graphic in the large panel, with restrained brand accents; do not copy the screenshot's fake names, 92%, XP targets or decorative chart data. Missing telemetry should have an unavailable state rather than be presented as verified zero progress.

### Guardian: image 4

Adopt the parent greeting, visible child selector strip, compact child profile, practical shortcuts, readable list rows, child-focused detail tabs and persistent bottom navigation. Keep tap targets at least 44px, labels visible, active state explicit, safe-area spacing and content clear of the bottom bar.

The reference's survey, school finder, ratings, transport and contact shortcuts are not authorization to invent unsupported features or data. Show these only where the existing product provides them. Use existing fees, results, attendance, messages, calendar and announcements as appropriate tools.

On desktop provide a complementary navigation/content arrangement; do not constrain every route to a simulated 440px phone. Avoid putting every child detail page into the dashboard component.

## External selection and compatibility

| Candidate | Evidence reviewed | Decision |
| --- | --- | --- |
| shadcn | Exact dashboard block, Progress source, existing local wrappers, upstream MIT license | Preferred foundation alongside the installed Radix primitives. Current v4 source uses `radix-ui` imports, `cn` aliases and styles that need adapting; do not paste it unchanged into this v3 frontend. |
| Konsta | Official React installation, Tabbar docs and MIT license | Useful mobile Navbar/Tabbar/List/Card reference. Current installation introduces a theme stylesheet and Tailwind import setup; a compatible version/theme integration still needs a scoped proof before installation. Existing shell plus Radix is the lower-change initial choice. |
| Tremor Raw | Official installation and Area Chart implementation | Current documentation requires Tailwind 4. Use the visual patterns as research; do not import its current styling unchanged. The existing comment calling the student list a “Tremor BarList” does not mean Tremor is integrated. |
| Recharts | Existing application imports, installed version/license, Tremor chart implementation | Preferred supported chart integration. Keep numeric axes, explicit units, appropriate empty states and textual summaries. |

No new dependency is justified merely to reproduce a surface treatment. A source port must preserve the upstream license notice and record its exact source/version; reusing a visual idea is not the same as porting an implementation.

Official sources checked:

- [shadcn blocks](https://ui.shadcn.com/blocks?category=dashboard), [Progress source](https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/new-york-v4/ui/progress.tsx), [license](https://raw.githubusercontent.com/shadcn-ui/ui/main/LICENSE.md).
- [Konsta installation](https://konstaui.com/react/installation), [Tabbar](https://konstaui.com/react/tabbar), [license](https://raw.githubusercontent.com/konstaui/konsta/master/LICENSE).
- [Tremor installation](https://www.tremor.so/docs/getting-started/installation), [Area Chart source and documentation](https://www.tremor.so/docs/visualizations/area-chart).
- [Recharts license](https://raw.githubusercontent.com/recharts/recharts/main/LICENSE).

## Pre-implementation component map

Paths below are relative to `frontend/`. Each page also has its adjacent CSS module unless noted. “No new package” means the indicated integration uses existing installed primitives; it does not claim implementation is complete.

| Existing component and path | Function/data/state to preserve | Design issue and selected foundation | Integration/customization; dependencies |
| --- | --- | --- | --- |
| `GuardianMobileShell`, `components/guardian/GuardianMobileShell.tsx` | Active ward, ward-change callback, unread counts, theme, pathname | Mobile shell exists; desktop begins with a 440px viewport. Konsta Navbar/Tabbar patterns plus Radix Dialog for the switcher | Responsive desktop navigation, visible ward strip, active link semantics; retain routes and badges. No new package planned. Verify dialog focus/Escape behavior. |
| `GuardianDashboard`, `app/guardian/dashboard/page.tsx` | `useGuardian`: active ward, period, switcher, loading; fees, scores, events and activity | Many independent panels rather than a parent greeting/child/tools hierarchy. shadcn Card and item/list patterns | Separate ward identity, attention items and quick tools. Keep only backend-supported shortcuts. Existing wrappers; no new package. |
| `StudentAvatar`, `components/guardian/StudentAvatar.tsx` | Ward name and image URL | Identity should be consistent across selector/profile/list. Existing avatar or Radix Avatar foundation | Retain image fallback, accessible identity and meaningful selected state. Radix Avatar installed. |
| `WardsContent`, `app/guardian/wards/page.tsx`; `WardDetailContent`, `app/guardian/wards/[id]/WardDetailContent.tsx` | Context wards, selected ward callback; overview/academics/attendance/info state | Reference needs compact profile and clear detail tabs. Radix Tabs plus shadcn list/profile patterns | Preserve real ward selection and detail links. Route imports `WardDetailContent`, not the similarly named `WardProfileClient`. Tabs installed. |
| Performance, `app/guardian/performance/page.tsx` | `/api/guardian/wards/{id}/performance`, active ward and period | Use score comparisons rather than excessive summary framing. Recharts/category bar patterns | Use real per-subject values and label units; retain teacher feedback. Recharts installed. |
| Attendance, `app/guardian/attendance/page.tsx` | Ward attendance API, monthly state, summary/calendar | Compact summary + actual calendar/log rather than a decorative gauge alone | Preserve present/absent/late text and calendar controls; verify month/year behavior. Existing components. |
| Results, `app/guardian/results/page.tsx` | Ward results/report-card APIs, document modal, sharing | Published results need scanable score rows and clear document actions. shadcn Table/Dialog | Preserve published-result restrictions, report-card rendering and sharing callbacks. Dialog installed. |
| Reports, `app/guardian/reports/page.tsx` | Ward documents, selected document, report-card/share-token APIs | Document list and preview need consistent sheet behavior | Accessible document list + dialog/sheet; retain real preview/download/share. Dialog installed. |
| Examinations, `app/guardian/examinations/page.tsx` | Ward exam API, all/upcoming/completed filter, selected event | Better represented as dated activity rows. Radix Tabs + list/detail sheet | Preserve event statuses, dates and contextual details. Tabs/Dialog installed. |
| Fees, `app/guardian/fees/page.tsx` | Ward fee API, balance/breakdown/history, payment state | Clear financial summary and receipt list needed; current checkout is explicitly a simulator | Modernize display; do not relabel simulated payment as real processing. No gateway/backend expansion. Existing primitives. |
| Notifications, `app/guardian/notifications/page.tsx` | Context notifications, filters, mark-all-read | Read/unread must remain explicit. shadcn item/list patterns | Group by meaningful dates/status; retain read action and real counts. Existing wrappers. |
| Messages, `app/guardian/messages/page.tsx` | Context threads, ward-scoped contacts, thread fetch/send/new-thread APIs | Thread/contact/detail hierarchy must fit mobile and desktop | Adapt list/detail and Dialog primitives; preserve message text on failure and ward association. Dialog installed. |
| Settings, `app/guardian/settings/page.tsx` | `/api/guardian/profile`, edit/password forms, preferences, theme, logout | Hardcoded initial identity must not appear as the real user. shadcn form/list/Dialog patterns | Load actual profile; explicit loading/error/unavailable state; preserve form callbacks. Existing primitives. |
| Links, `app/guardian/links/page.tsx` | Link list/create/cancel APIs, relationship field, approval filter | Child linking is a real workflow, not an inert “Add Kids” icon | Surface link action in child strip; keep approval states and confirmation behavior. Existing form/Dialog. |
| Calendar, `app/guardian/calendar/page.tsx` | `/api/guardian/calendar`, month and type filters | Calendar plus agenda should remain useful on a small screen | Preserve real events, type labels and date navigation. No new package initially. |
| Announcements, `app/guardian/announcements/page.tsx` | Existing fetch, category/detail state | Use genuine notices for highlights rather than copied survey artwork | Compact announcement list/detail with priority labels. Existing primitives. |
| Guardian authentication, `app/guardian/page.tsx`, `app/guardian/register/page.tsx` | Existing login/registration and linking inputs | Shell must not leak into login; registration currently follows layout wrapping rules separately | Keep authentication behavior; audit registration shell intentionally before changing it. No auth rewrite. |
| `DashboardContent`, `app/student/dashboard/page.tsx`: metrics | `getSubjects`, `getResults`, telemetry; academic context | Four similar numerical cards flatten different metric purposes. shadcn KPI/progress patterns | Numerical average, actual completed/assigned ratio, practice goal, XP progress each get appropriate representation. No invented trends. Existing wrappers. |
| Same student page: analytics | Released results, `scorePct`, `letterGrade`, subject/latest/chronological derivations | Useful existing Recharts chart is secondary to repetitive summaries | Spacious real progress panel plus subject comparison. Retain disclosure rules; do not mix subject categories with time. Recharts installed. |
| Same student page: assessments | Live/upcoming/assignment/completed filters, countdown, redirects, retake confirmation, offline sync | Repeated cards need status-led hierarchy. shadcn Tabs/Card/Item | Keep next academic action obvious; preserve examination lifecycle and callbacks. Tabs installed; no routing rewrite. |
| Same student page: gamification | Telemetry XP/level/progress, badges, leaderboard, daily goal/streak | Mature activity/achievement treatment needed | Reference-style recent activity, earned badge list and actual level target. Do not invent mastery goals absent from backend. Existing primitives. |
| Student navigation, `components/ui/StudentTopBar.tsx`; `app/student/layout.tsx` | Existing navigation/account/notifications, AcademicProvider; exam bypass | Header currently has five links, so “three major sections” must not be assumed to mean three routes | Preserve routes; organize academic overview, assessment/practice and progress/rewards as content domains. Keep exam hall full screen. |
| Shared Sidebar/TopBar, `components/ui/Sidebar.tsx`, `components/ui/TopBar.tsx` | Role nav, mobile toggle, account/session actions | Carbon sidebar differs from images 1–2. shadcn dashboard-01/sidebar structure | Adapt a light operational shell with brand tokens and clear active surface. Preserve existing unboxed logo/no left active stripe. No package required. |
| Admin dashboard, `app/ADMIN/dashboard/page.tsx` | Session-scoped `getUsers`, `getSubjects`, `getResults`, search, session snapshot | Adopt operational KPI/table hierarchy from dashboard-01 | Current totals remain totals; historical charts require historical records. Keep existing drill-down actions. Shared wrappers/Recharts already available. |
| Teacher dashboard, `app/teacher/dashboard/page.tsx` | Subject counts, class roster, subject students, guardian inquiry API | Assigned work and grading should lead, with metrics supporting. dashboard-01 card/list/table patterns | Preserve marking, question-bank, attendance and report-preview links; scope real roster/subject totals correctly. No new dependency. |
| Academic sessions, `app/ADMIN/academic-sessions/page.tsx`; `components/ui/AcademicSwitcher.tsx` | Session/term create, activate, end, delete and bulk-delete callbacks | Session state needs strong current/history distinction. shadcn Table/Select/Dialog | Keep activation vs viewing separate, confirmation flows and all academic context parameters. Installed Select/Dialog; no backend change. |

## Accuracy and UX findings to resolve with the affected component

1. Student dashboard puts expired, untaken subjects in `completedExams`; the same collection feeds Assessment Completion. Use actual completed sittings for completion and label expired windows separately. Do not change exam access rules while fixing this presentation.
2. Student delta compares the latest sitting with the average of prior sittings; it is not a change in cumulative average. Label the compared quantity correctly and use percentage points when subtracting percentages.
3. Guardian dashboard falls back from chronological `trend_data` to `subjects_performance` in the same connected line. Render a subject comparison when the input is categorical.
4. Guardian dashboard's period toggle changes a context label, while its trend calculation reads the same active-ward fields. Verify that displayed data genuinely changes with the selected period before presenting this as a working filter.
5. Guardian settings initializes a specific person's name/email/phone/address before profile loading. Replace with a loading state and real profile values rather than preserve fabricated identity as fallback content.
6. Guardian has another `MobileBottomNav.tsx` with different destinations; the active layout renders the navigation inside `GuardianMobileShell`. Edit the mounted navigation first and check call sites before deleting alternatives.
7. Source shows local shadcn-named wrappers alongside the original Button/Card/Tabs family. Inspect their callers and contracts before consolidation; renaming a local component does not establish an external source port.

## Implementation order and acceptance evidence

1. Guardian shell/selector/dashboard: reproduce the child-first mobile hierarchy and add complementary desktop behavior. Test selecting two linked wards, no wards, unread counts, keyboard focus, small-screen overflow and safe-area padding.
2. Student overview: use the third reference for composition; retain actual analytics, next assessment and rewards. Test no results, unpublished results, missing telemetry, expired exams, live exam redirect, retake, offline sync and academic context changes.
3. Shared operational shell, metrics and Admin/Teacher dashboards: apply images 1–2, retaining task priorities and real actions.
4. Extend shared primitives through the remaining inventory; do not call all portals complete when only dashboard CSS has changed.
5. Validate changed code with frontend TypeScript/build checks and authenticated desktop/mobile journeys. Preserve existing independent-session/concurrency tests; run appropriate regressions when touching identity/context behavior. A passing build alone is not visual or isolation verification.

For each implementation batch record upstream component source/revision and license, actual files modified, prop/state mapping, dependencies, responsive/keyboard checks, functional checks, and any remaining limitation. The original analysis-only pass added this document. The subsequent implementation pass changes the frontend components listed in UI_REFERENCE_IMPLEMENTATION.md. No new package, credential change or backend change was required.
