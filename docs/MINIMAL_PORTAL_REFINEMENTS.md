# Minimal portal refinement

The attached brief requests a calmer presentation within the existing workflows. It is supporting task material; current user instructions define the scope. Applied the existing frontend-design, redesign-existing-projects and ui-ux-pro-max guidance, including frontend-design's interface-content guidance.

Design: white and neutral surfaces, carbon text, amber as the navigation/action accent. Use spacing and separators instead of repeated colored cards; retain explicit Active, Draft, Published and answer-state text. Keep destructive actions distinguishable. No authentication, grading, submission or networking handlers are replaced.

Implemented surfaces:

- Admin academic sessions: neutral active-state banner and labels, amber timeline state, preserved creation/activation/end-term controls.
- Admin users: quiet category tabs and counts, plain role and account-state labels, existing account filtering/actions retained.
- Admin messages: unfilled conversation rows and ward labels, selected thread indicated by a narrow accent, keyboard focus retained.
- Admin network settings: neutral access-address rows, existing URL/copy and domain controls retained; removed decorative green status treatment and promotional device-compatibility copy. Address availability still requires the actual school network to verify.
- Shared Admin/Teacher report-card workspace: flatter summaries, neutral roster and remarks surfaces, quieter suggestions. Existing student selection, evaluation, remarks, print and export paths preserved.
- Academic switcher: quiet trigger, amber selection outline, plain live label, no decorative live dot or dark selected term.
- Branding: reduced mark/wordmark spacing; role subtitle stays below the wordmark.
- Student exam: unboxed timer and Live text, monochrome attempt counts, calmer receipt without confetti or score ring.
- Student result review: Material UI Dialog provides modal semantics, focus management and Escape dismissal, while retaining the existing review fetch and answer presentation. Correct/incorrect answer distinctions retain written labels with neutral surfaces.

Guardian follow-up findings are recorded separately in GUARDIAN_NEXT_REDESIGN_AUDIT.md. That audit is a source review and next-work inventory, not a claim that every Guardian issue has been fixed.

Validation uses the existing isolated browser fixture suite, frontend type checking/production build, and presentation tests. It does not exercise real school mutations, physical-device gestures or DNS/router configuration.
Validation completed: frontend TypeScript and final production build passed (72 pages). Presentation tests passed (7 tests / 15 assertions). Four-role browser fixture checks passed at desktop, 390px and 320px, including additional Admin academic-sessions/users/messages/report-card/network-settings routes and Material review dialog open/Escape dismissal. Reviewed review-dialog, report-card, academic-session and network-settings screenshots. Final domain form wraps on phones. No real-school mutations were made.
Login reference follow-up: shared PortalLogin uses the supplied dark/amber background with oversized corner circles, centered content and glowing bullet dots on all four role sign-in pages. Full-width layout and weight-500 login typography are retained. General and Guardian registration replace ExamPool marks/name with official AcqadLogo, including phone branding. Production build/type checking and four-role responsive browser fixtures passed; registration branding checks also passed without creating accounts.
