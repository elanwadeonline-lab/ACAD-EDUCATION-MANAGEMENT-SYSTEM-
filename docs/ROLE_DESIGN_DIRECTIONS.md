# ACQAD: role-based design exploration

## Scope and evidence

Source review of the four role dashboards, their CSS modules, role layouts, StudentTopBar, shared Sidebar, guardian mobile shell, global styles and existing package dependencies. This is not a rendered inspection of every route or completed usability testing. Implementation status is recorded in UI_BRAND_IMPLEMENTATION.md. Earlier system UI typography preference remains in force; the minimalist visual direction is superseded by this exploration.

## What the existing interfaces are doing

| Role | Existing composition and task | What is useful | Design gap and consequence |
| --- | --- | --- | --- |
| Student | Dashboard has telemetry, subject tabs/cards, practice/download/result action tiles, achievements, class leaderboard, upcoming schedule and recent submissions | A substantive learning environment with real progress and offline support | Many sections compete for attention. CSS mixes purple reward gradients, gold progress and blue surfaces. Put the current task and next assessment above supporting rewards; preserve discovery through stable navigation. |
| Teacher | Dark shared sidebar, four KPI cards, academic-cycle banner, guardian inquiries, assigned subjects/question banks and report preview | Strong operational content and shortcuts | Small all-caps labels and repetitive bordered cards obscure task priority. Separate teaching today, authoring and marking; surface outstanding work before totals. |
| Administrator | Dark sidebar, session/term context, KPI cards, global search, session snapshot, quick links and subject management | Existing search and session-aware data are foundations worth preserving | Dashboard accumulates independent modules. Build a coherent operations workspace: search in the shell, actionable exceptions, activity and drill-down records. |
| Guardian | Child-first mobile dashboard, blue identity hero, alerts, performance trend, upcoming exams/activity; separate `--g-*` tokens; desktop frame capped at 440px | Ward switching, mobile readability and child identity are appropriate | Desktop remains a narrow phone layout. Expand to a responsive overview/detail layout while retaining mobile navigation. Blue token family currently feels separate from the other portals. |

Sources: `frontend/app/{student,teacher,ADMIN,guardian}/dashboard`, `frontend/components/guardian/GuardianMobileShell.module.css`, `frontend/styles/globals.css`.

## Three viable visual directions

### Academic studio — recommended shared direction

A contemporary campus workspace: carbon navigation, neutral canvas, layered surfaces, strong colored identity or next-task panels, subject color bands and structured editorial spacing. It has more presence than a monochrome interface while keeping operational pages readable. Signature: a digital academic identity card repeated appropriately as student identity, teaching context or ward context.

- Student: mixed-size learning modules, a prominent continue panel, a weekly learning path and earned achievement tiles.
- Teacher: a teaching desk with a class/subject selector, schedule strip, marking queue and subject workspaces.
- Admin: an operations desk with institution context, scoped search, exceptions, timelines and records.
- Guardian: a family overview with a ward identity card, attention items and readable academic summaries; two-column desktop, bottom navigation on mobile.

Wireframe: identity/context shell → primary work panel alongside upcoming activity → work queue → supporting insights. Use cards where group boundaries convey meaning, not around every line.

### Campus journal — editorial alternative

Wide text-led sections, clear section headings, chronological activity and generous typography rhythm. Subject or student identity appears as a colored spine or compact identity block. This direction is especially good for reports, results, guardian summaries and teacher planning. Its signature is a coherent academic record with dated entries and restrained margin labels. Keep system UI, using weight and scale rather than introducing a serif.

Wireframe: top navigation → contextual heading → main chronological brief with a narrower planning column → full-width report or activity detail. Compared with Academic studio, hierarchy comes from the document structure rather than modular panels.

### Learning atlas — expressive student alternative

A subject journey with milestone nodes, active lesson cards and a compact progress rail. This is a strong student-practice treatment; it is a poor default for grade entry or dense admin tables. Use the atlas for learning and progress, and use conventional task queues for operational roles. Its signature is the sequence of meaningful learning steps, backed by actual content order rather than a decorative map.

Wireframe: subject navigation → current learning stage → sequential practice milestones → explanation and review. Do not add a course map unless the backend actually defines prerequisite or ordered content; otherwise show a clearly labeled recommended sequence.

## Approved color system — supersedes the blue proposal

Use the exact stops from the existing AcqadLogo: gold #F59E0B, mid gold #D97706, deep gold #92400E and carbon #0C0D12. The deep gold supplies readable white-on-filled primary controls; the bright stop supplies milestone and dark-surface accents. Neutral surfaces separate content. Preserve green/red for explicitly labeled success/failure. No blue, teal or purple brand direction. Existing orange legacy tokens remain compatible while active shared primary controls follow the logo gold.

This direction uses the installed component primitives and custom role layouts together. It is not a library-only reskin.

System UI remains the entire font stack. Body/input 16px, secondary 14px, panel titles 18–20px, page titles 26–30px. Use 400/500/600 weights and tabular figures. Avoid the current teacher dashboard's 11px uppercase labels as the default. Richness should come from hierarchy, surfaces and meaningful graphics rather than oversized text.

## External components and blocks

| Target | Exact starting point | Adaptation |
| --- | --- | --- |
| Teacher/admin shell | shadcn `sidebar-07` | Adapt institution switcher, role groups, session/term and footer account; preserve existing routes |
| Admin operations layout | shadcn `dashboard-01` | Reuse shell/table/chart composition; replace generic revenue cards with actionable academic operations |
| Search | shadcn Command Dialog/Combobox | Present existing `globalAdminSearch` results and filters; not a replacement backend |
| Rosters/results/question banks | shadcn Data Table + TanStack Table | Shared toolbar, filters, pagination and detail Sheet; preserve query context |
| Grade entry | Existing server contracts + shadcn Input/Table | Inline validation, pending/saved/failed states; keyboard-friendly cells |
| Student subject/practice modules | shadcn Card/Item/Progress/Badge | Custom content-driven mixed-size grid; avoid generic revenue/dashboard copy |
| Family overview | shadcn Avatar, Popover/Command, Tabs, Sheet | Adapt existing ward context; responsive desktop layout rather than permanent 440px frame |
| Report insights | Existing Recharts; Tremor chart blocks as references | Keep one chart engine. Select only charts with real time-series/category meaning |
| Guided onboarding | React Bits Stepper | School setup or a real ordered task; check keyboard and reduced-motion behavior |
| Public pitch highlight | React Bits Spotlight Card | One subtle feature accent; touch fallback; avoid pointer glow on all daily-work cards |
| State transitions | Installed Framer Motion | Shared-layout selection, drawers, one-shot progress celebrations; reduced-motion handling |

Official block references: [shadcn blocks including dashboard-01 and sidebar-07](https://ui.shadcn.com/blocks?category=dashboard), [shadcn components](https://ui.shadcn.com/docs/components), [TanStack Table](https://tanstack.com/table/latest), [Tremor bar chart](https://www.tremor.so/docs/visualizations/bar-chart), [React Bits Stepper](https://reactbits.dev/components/stepper), [Spotlight Card](https://reactbits.dev/components/spotlight-card).

These are implementation starting points, not a proposal to accept their default colors or install every library. Existing frontend uses Next 15, React 19, Tailwind 3, CSS modules, Radix, Framer Motion and Recharts. Current block examples must be checked for Tailwind/version/API differences before copying. Consolidate the existing `Button` and `button-shadcn` families into one wrapper API. No new packages were installed.

## Motion and flow priorities

Use 120ms button feedback, 160–200ms menus and 200–260ms sheet/panel transitions as starting values. Student practice may have one short milestone animation. Keep exams visually focused and preserve preflight, explicit start, timer, answer recovery, review and receipt. In all roles, preserve object/context when opening and closing detail panels.

Fix experience states alongside visual work: distinguish offline queued work from server-received work, preserve input on failed saves, show loading/empty/error states, and restore keyboard focus after overlays close. A premium design includes these behaviors.

## Suggested first implementation

Academic studio across the shared shell, followed by one complete reference journey per role: student practice/resume, teacher question-bank-to-publication, admin search-to-detail/edit, guardian ward-to-result/enquiry. Keep existing production functionality and backend contracts. Use Campus journal composition on reports, and a Learning atlas treatment only for supported student learning sequences. Validate these reference journeys on desktop and mobile before extending to every route.
