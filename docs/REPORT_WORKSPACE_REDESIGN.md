# Selected-student report workspace

Scope: shared Admin and Teacher ReportCardPage detail view, including the supplied empty-record scenario. The roster, authenticated data loading, score calculation, remarks, print sheet and role permissions remain in the existing owner component.

Product decisions using product-design, with visual implementation guided by frontend-design and ui-ux-pro-max:

- Separate student identity/navigation, report configuration, and report content. Each region has one job (`rule/smallest-intervention`).
- Keep session and term choices visible, labeled, and reversible. Retain the existing mode state and add pressed-state semantics (`rule/control-matches-cardinality`, `rule/accessible-name-required`).
- Empty records are not an error or a zero grade. Name the student and period, offer refresh, focus the academic-session selector from Change period, and provide a roster return (`rule/empty-state-action`, `rule/cover-reachable-states`).
- Disable unavailable print/preview actions. Previous/next navigation identifies its target and respects roster bounds and loading (`rule/keyboard-complete-flow`).

New components: ReportWorkspaceHeader, ReportPeriodPanel and ReportEmptyState in frontend/components/report-card/ReportWorkspace.tsx, with scoped responsive CSS. The existing ReportCardPage wires these to its original callbacks. Both role routes already render that shared page.

Visual direction: neutral surfaces, one amber accent, left-aligned student identity, plain registration/class metadata, a discrete period settings panel, and an actionable empty state. Long names/registration IDs wrap; toolbar actions wrap on phones. The printable report structure is retained.

Verification: frontend TypeScript and production export; fixture browser coverage for opening a student report, empty state, disabled print, Change period focus, cumulative mode, return to roster, and desktop/320px screenshots. Fixture checks do not establish real-school result accuracy, printing fidelity on physical printers, or cross-role backend isolation.
Validation result: frontend TypeScript and 72-page production export passed. The four-role browser fixture suite passed, including the selected-student empty-state interactions, disabled printing, academic-session focus, cumulative-mode pressed state and return to roster. Desktop and 320px screenshots were visually reviewed. Populated real-school results and physical printing were not exercised by these fixtures.
