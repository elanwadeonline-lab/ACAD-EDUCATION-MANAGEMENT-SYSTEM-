# Community discussions and lesson notes

The student job is to ask for help, contribute an explanation, share a waiting Practice Arena challenge, and study class resources. Teacher preparation notes are private documents submitted to admin for approval; they are never student resources. A separate learning library holds student-facing material.

## Interaction decisions

- Dedicated community and lesson-note pages preserve the approved Learning Insights dashboard composition (`rule/smallest-intervention`, `rule/navigation-vs-action`). Thread/note selection is in the URL; Back returns to the previous view.
- Questions, discussions, and challenges have a title and plain-text body. Replies preserve pasted code and line breaks without running HTML or code. The author or school staff can mark a discussion resolved or hide it; staff can hide individual replies. Hiding a whole thread requires a named confirmation (`rule/name-object-scope-consequence`).
- Community posts are shared across active students in this school installation. Teachers and admin can contribute and moderate. Guardian accounts cannot access this space. Public responses include author names and roles, not email, phone, or registration IDs.
- Challenge posts accept only the author's waiting, unexpired Arena code. Joining uses the existing Arena API, retaining its cohort, capacity, expiry, and active-session checks. After joining, students open the quest in Practice Arena; this does not create another challenge engine.
- Presence is a count of active students who have visited this community within 60 seconds. It does not claim that everyone logged into the app is online. Visible discussion views refresh every 10 seconds; presence updates every 25 seconds. Polling pauses in hidden tabs and feed polling pauses while reading older pages.
- Lesson notes have draft, submitted, returned, and approved states. Only admin can approve a submission. Teachers cannot approve their own notes. All states and their attachments remain private to the author and admin. For compatibility with the initial SQLite enum, historical `published` rows are serialized as `approved`; they never grant student access.
- Student resources are a separate entity and upload collection. Staff can prepare a reading, PDF, or video-link resource as a draft and publish it to a subject's existing class/grade audience. Students cannot view resource drafts, private preparation notes, or other classes' files.
- Students explicitly mark resources complete or reopen them. Opening a resource saves a continuation point; opening alone never awards completion or XP. The dashboard shows a compact library summary with real counts and a continuation link. The dedicated library page supports subject, text, and progress filters.
- UI uses locally bundled Phosphor filled icons and existing Material UI determinate progress components, with named progress bars and application theme tokens. Sources: https://github.com/phosphor-icons/react and https://mui.com/material-ui/react-progress/.
- Notes support typed text, PDF, JPEG, PNG, and WebP, up to six attachments of 15 MB each. File signatures are checked. Stored files sit outside public static folders and use authenticated, permission-checked downloads. They are not publicly accessible upload URLs.
- Loading, empty, unavailable, permission, and network-error states are explicit. Failed posts/replies/saves preserve the typed form; duplicate clicks are locked while a request is pending (`rule/cover-reachable-states`, `rule/preserve-user-input`).

## Entry points

| Role | Discussion page | Lesson notes |
| --- | --- | --- |
| Student | `/student/community/` | No access to teachers' lesson notes; student resources at `/student/library/` |
| Teacher | `/teacher/community/` | `/teacher/lesson-notes/` |
| Admin | `/ADMIN/community/` | `/ADMIN/lesson-notes/` |

Student navigation includes both pages. Teacher/admin sidebar entries use filled icons. The new pages share existing theme tokens, with quiet dividers, readable text, and class/audience labels rather than another dashboard card grid.

Staff publish student resources at `/teacher/learning-library/` and `/ADMIN/learning-library/`. The teacher preparation-note review flow is separate from those pages.

## Implementation and rollout

`LearningCommunityService` initializes additive SQLite tables on first learning API access. Existing school records are preserved. Attachments are stored beside the configured school database in `lesson-note-attachments/`; include this directory in server backups. Deleting or detaching a file does not erase its stored bytes; automatic retention cleanup is not included.

The running Bun backend must be restarted to load the new router handler. Publishing the static frontend alone does not activate new backend routes. From the project root, the normal start command is `bun run start` after stopping the old server normally. No existing server process was forcibly stopped during implementation.

Verification: isolated SQLite permission/workflow tests, existing Arena regression tests, frontend TypeScript and production build, and intercepted browser fixtures. Browser fixtures do not write to school records. Live school accounts/data are not used for test posts.

The supplied XP/icon refinement attachment is a separate dashboard brief. This feature work preserves the XP illustration and card layout; it does not claim recovery of the missing original trophy asset.


Latest verification after the teacher-only correction and LMS addition: 34 isolated workflow/Arena tests passed (195 assertions); frontend TypeScript and 82-page production export passed. Browser fixtures passed question/reply creation, PDF submission, admin approval, teacher-only note navigation, saved student resource completion after reload, and 320px layouts. The original Student dashboard fixture also passed responsive, theme, wave, and XP-layout checks with the new library summary. New page HTML was verified byte-for-byte against the build served on port 8001. The new API still returned 404 from that already-running backend, confirming that a normal backend restart remains necessary. An additional strict backend type-check reports pre-existing nullability errors in server.ts; it reports none in the added handler/service.
