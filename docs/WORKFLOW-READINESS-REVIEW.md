# Acqad workflow readiness review

Reviewed 11 November 2026. Implementation and isolated verification are complete for the changes below. This is not blanket production certification.

## Delivered journeys

| Journey | Behavior and checks |
| --- | --- |
| Independent portal logins | Each tab owns its bearer session. Two students and a staff account can remain signed in together. Refresh retains ownership; new and duplicated tabs cannot silently inherit another account. Signing out one tab leaves the others signed in. Explicit invalid tokens cannot fall back to shared cookies. |
| Teacher and admin chat | Consistent light surfaces, mobile conversation/back navigation, touch controls, authenticated live events, guarded thread switching and preserved failed-send drafts. Replies clear only after server confirmation. |
| Student community | Theme-aware discussion and reply flow, restrained surfaces, readable mobile controls and contained navigation. Private study partner conversations and material notes remain separate. |
| Guardian native mobile | Updated React Native conversation and contact flow, ward identity retained per thread, keyboard-aware composer, retry without losing drafts and refresh without jumping away from reading history. Foreground records refresh every 15 seconds and on resume. This is not operating-system push delivery. |
| Teacher note to admin review | Actual multipart upload, ownership and file checks, submission notification, version-checked review, teacher notification and student publication visibility verified. Private teacher notes remain private. |
| Attendance | Staff/class authorization and batch validation happen before writes; invalid batches cannot partially save. Guardian updates originate from persisted records. |
| Result release | Approval/period filters protect guardian records, release actions and scheduling are validated, and approval emits notifications. Report marks use awarded scores and actual school identity. |
| Setup and branding | Concurrent initial setup creates one operator, persists the school name and uses a tab-owned session. Reset requires an authenticated operator. Acqad replaces legacy demo branding while real school names remain intact. |
| Assigned teacher subjects | A single subject stays a compact card. Actions have consistent padding, borders and touch targets across tested widths. |

## Verification

- 62 service tests passed, covering attendance permissions, learning community, practice journeys, study partners, guardian records and result presentation.
- 25 isolated HTTP tests passed, covering workflows, sessions/concurrency, guardian links/messages and grading. Setup concurrency was checked separately. Tests use a temporary database rather than school data.
- Portal TypeScript validation passed.
- Browser checks exercise actual bundled tab-session code with concurrent students, shared cookies, refresh, window.open, cloned tabs and independent logout.
- Portal browser checks cover teacher cards at 375/768/1024/1440 pixels, teacher/admin reply flows, dark student community replies, setup and report presentation.
- Native preview checks exercise the React Native conversation with successful send, failed send, draft preservation, retry and horizontal-overflow checks.

Useful commands from the repository root:

```text
bun scripts/verify-workflows.ts
node scripts/verify-tab-sessions.mjs
node scripts/verify-portal-ui.mjs
node scripts/verify-native-chat.mjs
```

The browser checks require Chrome and locally built artifacts. Portal builds run from frontend using the existing build script; native preview export runs from apps/mobile-guardian with Expo export --platform web --output-dir dist-review. Browser fixtures verify interaction behavior; HTTP tests verify real backend authorization and persistence separately.

## Release limits and remaining work

- The native application's complete TypeScript check still fails in existing UI dependency/style/navigation code, including gluestack nativewind declarations. The Expo preview exports, but that does not make the Android/iOS release ready.
- Physical Android/iOS keyboard, safe-area, gestures and background delivery have not been verified. Awards-specific live updates were not added because this pass did not establish a backing awards workflow.
- Sustained concurrency/load, backup restoration and operational deployment checks remain unmeasured. Some inefficient arena/library reads were reduced, but capacity is not certified.
- Attendance membership currently uses existing enrollment records; historical enrollment/session semantics need a dedicated review before claiming complete school lifecycle coverage.
- Stable production secrets are required. The development fallback for report signing is process-local and does not preserve links across restarts.
- Next exports static portal assets; authorization is enforced by the Bun API, not exported Next middleware.
- No remote deployment or native store release was performed. The pre-existing grading details edit was preserved.
