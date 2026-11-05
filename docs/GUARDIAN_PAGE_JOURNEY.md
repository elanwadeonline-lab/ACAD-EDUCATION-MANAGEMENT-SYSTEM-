# Guardian page journey — November 2026

Direction: a child-first mobile web app, URL-addressable task pages, primary brand accents in text, filled navigation/tool SVGs, restrained secondary icon colors, and subtle external/inset shadows on quick actions and More cards. Uses the existing UI/UX, frontend redesign and mobile-native guidance. It remains a Next.js web/PWA implementation.

Journey: Home → choose child → return to the initiating school task → inspect results/attendance/fees/notices → open the relevant full-page detail → use browser Back or the explicit return control. More is a dedicated school-tools directory; account settings is one destination within it.

Implemented components:

- Shared filled SVG icon set for navigation, dashboard quick actions and More tools.
- Dedicated /guardian/select-child route replaces the selection drawer. Linked children are the only choices. Returning to a child-profile page updates its child ID; switching children clears a previous child's detail-view query.
- Dedicated /guardian/more directory links attendance, calendar, fees, notices, reports, child links and account settings.
- Existing examination, announcement and document lists select records through URL view parameters. Profile edit, password, payment, child-link request, new-inquiry and result-preview views use URL view parameters as well. They render in the shared page shell, with no dimmed or fixed overlay. Browser Back updates the view.
- Original data-fetch and save handlers remain in each feature owner. Report-document data loads on the selected document and child, including direct links.
- Keyboard opening for notices/exams/account rows, page-heading focus for opened views, and visible focus on new tools/child choices.
- Missing exam duration/question metadata no longer defaults to a fabricated 60 minutes / 40 questions. Reports no longer substitutes sample attendance. Calendar heading derives the current year.

Route coverage: Home, children and profile, results, reports, performance, attendance, examinations, fees, messages, notifications, calendar, announcements, links, settings, selection and More. Existing authentication/registration pages keep their established branding and form flows.

Limits: this pass does not establish payment-gateway readiness, backend child authorization isolation, or physical-device gesture quality. Existing Guardian missing-data and academic-period issues recorded in GUARDIAN_NEXT_REDESIGN_AUDIT.md require follow-up beyond the corrections listed here.
