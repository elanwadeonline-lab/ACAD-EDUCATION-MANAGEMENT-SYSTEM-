# Brand-led Academic studio implementation

## Approved direction

The user rejected the blue palette. The authoritative logo is `frontend/components/brand/AcqadLogo.tsx`, supported by `AcadBrandIcon` in the icon collection. Its gold stops are **#F59E0B**, **#D97706**, **#92400E**, with **#0C0D12** carbon and metallic neutral details. The earlier navy/blue/teal recommendation is superseded.

Keep Academic studio's hierarchy, role-specific task organization and layered surfaces. Use the existing gold/carbon identity. System UI applies to body, display, utility and guardian typography. The supplied directive's music-specific examples do not apply to this academic product.

## Implemented

- Removed audited decorative blue, indigo, purple and cyan literal accents and corresponding utility classes across the main frontend role pages and components. Preserved semantic red/green and neutral logo details. Legacy orange brand values remain compatible with the existing app.
- Added shared logo-derived brand tokens; deep gold is the readable white-on-primary action color. Unified guardian light/dark identity with carbon surfaces and separate foreground accent tokens.
- Consolidated font settings in CSS, Tailwind and guardian tokens around system UI; removed remote font loading in the preceding pass. Inputs and selects use 16px text, including mobile.
- Improved shared sidebar navigation and section-label sizing, page-header hierarchy and primary button treatments. Removed the shadcn-style button's default ornamental gradient/glow; it uses the same primary tokens as the existing Button component.
- Integrated the installed Radix Dialog into the shared Modal wrapper. Existing consumers retain their props and content; dialogs now receive focus containment, Escape dismissal and accessible title/description wiring. ConfirmDialog prevents dismissal while processing.
- Student: wider learning workspace, adaptive subject grid, gold subject hierarchy, carbon exam-command/XP panels, calmer leaderboard emphasis and removal of the continuously waving greeting.
- Teacher: clearer section and subject headings, less repetitive statistic-card framing, a contextual academic-cycle banner and adaptive subject workspaces.
- Administrator: stronger operational heading, readable statistic labels and quieter grouping around metrics.
- Guardian: expanded desktop workspace and dashboard columns, matching desktop navigation width, carbon/gold student identity panel, keyboard-operable ward switch and neutral dark-mode shell surfaces. Mobile navigation remains available.
- Submission feedback: offline completion now shows a persistent local-queue state instead of the generic received/success screen or a placeholder graded score. The generic server-received toast appears only for an online receipt.
- Removed the viewport zoom restriction. Kept existing role permissions, API contracts and backend grade/reward calculations.
- Corrected the design comparison to gold/carbon and revised `ROLE_DESIGN_DIRECTIONS.md`.

## Verification

The frontend TypeScript check (`tsc --noEmit --incremental false`) and production Next build passed, with all 70 static pages generated. The build reports the existing static-export warning that API routes/middleware are not served by a static-only host; this project serves its APIs through the Bun backend.

All 80 CSS files parse through PostCSS. White on the deep logo gold measures 7.09:1 contrast. The exported sign-in page was checked in the browser, including narrow-viewport form sizing and the corrected light wordmark on its dark brand panel. A source scan found no remaining audited blue/indigo/purple accent literals or blue utility classes in the main app/component/style directories. This does not constitute exhaustive contrast or interaction testing.

This is not an assertion that every role workflow has passed end-to-end QA. Authenticated role data, real offline reconciliation, publication, grading/release and all modal variants still require a live backend and role sessions. The change set preserves pre-existing user edits; no database or credential reset was performed.

## Remaining design rollout

1. Consolidate the two component wrapper families behind one public API after comparing consumers. The shared controls already use the same brand tokens.
2. Adapt selected shadcn table/search/detail blocks to existing search and grading contracts. No new table or search package was installed in this pass.
3. Validate each role journey with actual loading, empty, failed, permission-denied and long-content states on desktop/mobile. Review no-title legacy dialogs for more specific accessible labels.
4. Evaluate a React Bits setup Stepper only if it improves the existing setup flow; no decorative library was added merely for appearance.

The UI is implemented with the existing stack and existing data. Prototype content remains confined to the separate design-comparison surface.
