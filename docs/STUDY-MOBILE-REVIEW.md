# ACQAD study, mobile and session review

Reviewed and updated 10 November 2026. This records the implemented pass and its verification limits; it is not an assertion that every portal page has been manually tested.

## Delivered behavior

- Students retain light/dark mode. Admin, teacher, guardian and setup routes use light mode, including startup with old dark preferences and navigation from a student page. Student changes no longer write the shared theme preference.
- Accepted study partners open **Practice → Study partners → Open private study**. The workspace stores private DMs and shared material notes. Its mobile view switches between the conversation and reading; desktop shows both.
- Materials come from the existing LMS and must be published and readable by both partners. Notes reference a material, selected passage and optional PDF page. Saved passages are marked in text lessons. PDFs open through authenticated downloads and the browser PDF viewer; notes do not modify the original PDF bytes or provide freehand PDF drawing.
- Partnership, active-account and school-year checks apply on every read and send. Declined/ended partnerships cannot access the private workspace. Missing/unpublished material references are redacted. Message retries use account-scoped idempotency keys, and history uses 50-message cursor pages.
- A saved solo journey chooses a published examination body and science, commercial or arts department. JAMB requires English plus three distinct department subjects. Starting draws five questions from each selected subject; missing uploads block a partial JAMB combination. WAEC and other external bodies use available department papers. Internal examinations retain their existing school workflow.
- Setup and shared dialogs use dynamic viewport heights, safe-area padding and touch-sized controls. Touch inputs use 16px text to avoid iOS focus zoom. Teacher messages use separate list/conversation mobile states, keyboard-operable conversation rows, and preserve a failed reply draft. Failed sends no longer appear as delivered messages.

JAMB's English-plus-three rule is documented in the [official examination manual](https://www.jamb.gov.ng/pdfs/2024/2024_EXAMINATION_MANUAL%28updated%29.pdf). Department lists are practice filters, not university admission eligibility decisions; combinations should be checked against the intended course.

## Backend findings and changes

| Finding | Change or verified behavior |
| --- | --- |
| Arena menus loaded all eligible question bodies, options and answer keys into application memory | SQLite now aggregates the eligible paper catalog; full question hydration occurs when creating a quest |
| Library listing looked up the user again for each resource, then fetched each resource's files separately | User is checked once; file metadata is aggregated with an indexed resource lookup |
| Study invitations had no private conversation storage | Added indexed `study_messages` and account-scoped `arena_journeys` tables, created idempotently |
| A shared theme preference could darken staff portals | Fixed role policy at initial paint and route transitions; isolated student preference writes |
| A guardian messaging test ignored its configured test endpoint | Test now honors `TEST_BASE_URL` so it can run against an isolated fixture server |
| Multiple simultaneous role/device sessions | Existing tab-explicit tokens and role-scoped cookies passed regression checks; no authentication replacement was necessary |

SQLite already enables WAL, foreign keys and busy timeout. Those settings and the passing concurrency regression are useful safeguards, but do not establish a maximum student capacity. The server still uses synchronous SQLite and a large central request handler. Catalog aggregation still scans eligible content; exceptionally large banks need measurement before adding a maintained catalog/cache. Study chat currently polls every eight seconds while visible; it does not yet use the school's notification stream.

## Verification

- 48 passing service tests: Practice Arena, department journeys, LMS/teacher-note separation, private conversations, anchors, retry behavior and authorization.
- 8 passing HTTP integration checks against a temporary database and separate server: admin/guardian messages, simultaneous role/device login, explicit-token isolation, independent logout, exam autosave and duplicate-submit protection.
- Eight startup theme scenarios checked against the actual bootstrap script, covering saved preferences and device dark mode.
- Frontend TypeScript check passed.
- Production build passed, including generation of all 82 static pages.
- Browser checks against the production export passed at 375, 768, 1024 and 1440 pixels, including private-message sending, saving a selected-passage note, mobile reading/conversation tabs and overflow checks. These interaction checks use API fixtures and disable service workers; backend behavior is covered separately above.

Device keyboard behavior, touch selection and browser PDF support require physical Android/iOS testing. This pass does not establish sustained high-concurrency capacity or provide a complete page-by-page visual sign-off.

## Operational details

No existing school records need conversion. New tables are additive and initialized by their services. Existing user changes outside this pass were left intact. No production deployment is performed by these source changes.
