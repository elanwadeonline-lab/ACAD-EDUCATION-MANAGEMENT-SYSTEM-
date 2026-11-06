# Current UI scope, 5 November 2026

User correction: Guardian redesign work is paused. When resumed, its target is the Expo / React Native project at apps/mobile-guardian, not frontend/app/guardian. Earlier web Guardian changes remain an uncommitted draft; do not treat them as the requested native deliverable or continue that web redesign automatically.

Immediate work: restore the Student dashboard golden wave, remove icon backgrounds, improve Student dark surfaces and reuse the exact original colored golden trophy for an eventual five-second illustration-only crossfade.

The existing approved wave asset is frontend/public/gold-card-wave.svg. It is reused unchanged. XP hero dimensions, typography, telemetry percentage and assessment counts are preserved.

Trophy blocker: current assets, alternate frontend copy, available icon components and relevant available Git versions were inspected. The colored gold trophy with purple base and decorative pink marks shown in the reference was not located. The tracked StudentIcons trophy is an outline Lucide icon, not that illustration. No replacement trophy was generated, downloaded or substituted. No two-image slideshow is claimed complete. The exact original SVG/component is required before implementing its five-second crossfade.

Student updates use existing filled navigation/status icons and remove separate achievement/activity/rail icon backgrounds. Hardcoded Student neutral surfaces and text now use existing theme tokens; the review dialog paper also uses those tokens. These changes do not establish that every unrelated portal supports dark mode.
Validation: production build and TypeScript passed. The focused Student dashboard fixture check passed at desktop, 390px and 320px. Light/dark screenshots were inspected; XP hero text and measured dimensions remained identical when switching theme. Original wave asset has no Git diff. Trophy/slideshow remains blocked by the missing original illustration.
Live publication correction: the Bun server prioritizes root dist while Next exported to frontend/dist. The latest export was merged into root dist, preserving uploads and older hashed assets. The frontend build command now explicitly runs scripts/publish-static.mjs after Next succeeds. HTTP port 8001 dashboard HTML was verified byte-for-byte against the new export.


## Current additions: school community, staff lesson-note review, and student LMS library

The user's correction makes teachers' lesson notes preparation documents for admin review only. Students cannot list or download these notes, including after approval. The workflow is draft → submitted → approved/returned; teachers cannot self-approve. This supersedes the initial student-facing lesson-note draft.

The user explicitly requested both a student learning resource library and external UI libraries. A separate `/student/library/` provides class-targeted readings, PDF resources, video links, search/filtering, and persisted open/completed/reopened progress. `/teacher/learning-library/` and `/ADMIN/learning-library/` manage these student materials. The Learning Insights home adds only a compact library summary and continuation link. Phosphor's installed filled icon components and the existing Material UI progress components supply the new UI.

Community discussions at each role's `/community/` page support questions, replies, resolved status, staff moderation, recent community presence, and sharing existing waiting challenge codes. Challenge joining reuses Arena permissions and capacity checks.

Verification for these additions uses isolated SQLite tests and intercepted browser fixtures; no school accounts or posts are created for testing. The live backend was still the old process when checked and needs a normal restart to register `/api/learning/*`. Frontend publication alone cannot update a running Bun process.


## Student refinement: sourced trophy approved

The user explicitly selected “Allow a professionally sourced trophy,” superseding the earlier exact-original-only restriction for this dashboard task. The carousel now uses the existing golden wave and a licensed Microsoft Fluent Emoji trophy with its base fill adapted to purple. Attribution and license accompany the SVG. This is not a recovered original trophy.

The current refinement preserves the Learning Insights layout/data while replacing student outline glyphs with semantically colored official Phosphor filled icons. Theme coverage includes student routes, dialogs, exam tools and status surfaces, shared sign-in forms, and shared UI popovers. Print sheets retain white paper. See `docs/STUDENT_DASHBOARD_REFINEMENT.md` for the verification scope.
