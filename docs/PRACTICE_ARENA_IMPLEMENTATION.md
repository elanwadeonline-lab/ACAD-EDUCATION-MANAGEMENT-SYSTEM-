# Practice Arena

The student Practice page now includes an additive Arena panel between its existing heading and paper catalog. Student navigation, dashboards, formal exams and the existing paper/download flow are preserved.

## Available now

- Five-question solo quests using the installation's multiple-choice content bank.
- Two-player, same-school-year challenge rooms with an eight-character code and 24-hour expiry. Students answer at their own pace; the room refreshes while open.
- Server-side answer locking, score calculation and completion. Answer keys and opponent scores stay hidden in Arena responses until both players finish.
- Arena XP: 10 points per correctly answered content-bank question per student per study day. A repeated submission or same-day replay cannot award the same question again. Study days and weekly boundaries use West Africa Time.
- Separate Arena levels and weekly cohort leaderboard. Existing school grades and legacy dashboard XP calculations are unchanged.
- Saved quest history, resume after refresh, per-question review and explanations when the source supplies them.
- Mutual study-partner invitations after completed two-player challenges. Recipients accept or decline; either participant can end the partnership. Declined/ended relationships cannot be repeatedly reinvited.

There are no invented opponents, scores or seeded production papers. A paper needs five structurally valid objective questions, nonempty options and answer keys. Content correctness still needs teacher review; the original content importer does not gain an approval pipeline from this change.

## Files and data

`frontend/components/student/PracticeArena.tsx` owns the new panel and quest dialog. Its CSS is scoped to that component. `PracticeCatalog` accepts an optional Arena slot; the Practice page supplies it.

`shared/arena.ts` defines response types; `frontend/lib/arena.ts` is the authenticated client. `server/handlers/practice-arena.ts` registers the student-only `/api/arena/*` routes through the existing router. `src/services/arena.service.ts` owns game rules and creates four additive tables idempotently when the server starts:

- `arena_sessions`: immutable question snapshots, mode, room, status and request identity.
- `arena_players`: membership, locked answers, completion and score.
- `arena_rewards`: unique daily question rewards.
- `arena_partners`: mutually managed study relationships.

The service does not write to school exam/grade tables or legacy practice logs. New tables live in the existing main installation database and need the same persistent storage and complete backup coverage. Restart the Bun backend to register the new routes/tables; build/restart the frontend using the existing deployment process.

## API

All routes require an active student account. Successful responses use the application's `{data: ...}` envelope and `Cache-Control: no-store`. IDs are opaque; membership is checked on every session action. Errors return the existing `{error: string}` shape.

| Method | Path | Input |
|---|---|---|
| GET | `/api/arena/overview` | None |
| POST | `/api/arena/sessions` | `packageId`, `mode: solo/duel`, `requestKey` |
| POST | `/api/arena/join` | `code` |
| GET | `/api/arena/sessions/:id` | None |
| POST | `/api/arena/sessions/:id/answer` | `position`, `option` (zero-based integers) |
| POST | `/api/arena/sessions/:id/leave` | Empty object |
| POST | `/api/arena/sessions/:id/invite` | Empty object |
| POST | `/api/arena/partners/:id` | `action: accept/decline/end` |

Retried creation with the same request key returns the same quest. An identical answer retry returns saved state; changing a locked answer fails. Scoring and reward settlement run in a SQLite transaction. Leaving/expiry closes an unfinished room for both players without issuing new completion XP. Closing the dialog alone preserves the quest.

## Verification

`bun test tests/practice_arena.test.ts tests/result_presentation.test.ts tests/student_dashboard_presentation.test.ts` passes 25 tests. The Arena suite uses in-memory SQLite and covers membership/privacy, key visibility, request/answer replay, scoring, daily caps, snapshots, restart/resume, expiry, cohort matching, room capacity, weekly reset and partner consent.

Frontend TypeScript validation and production build passed. A separate strict TypeScript check for the Arena service/contracts passed. Browser verification artifacts and scripts live under `scratch/practice-arena-implementation`; all identities/papers used there belong to its disposable database, not the school database. An isolated source snapshot is used because the existing development startup can remove the shared production export.

The final real-browser smoke passed on desktop (1440 px) and mobile (390 px): student-only access, solo completion, two independent student browser contexts, room join, refresh/resume, duel settlement, invitation acceptance, leaderboard and daily XP deduplication. Mobile horizontal overflow was not observed. Screenshots were inspected and a heading contrast issue corrected. Existing service-worker update errors on the strict static QA host are recorded in `smoke-result.json`; no other browser application errors were observed. Those warnings are not counted as an Arena fix or a complete offline/PWA sign-off.

## Scope limits

This is an untimed two-player challenge feature, not a latency-ranked live tournament engine. Study partnerships provide consent, a shared topic and suggested review steps; they do not add chat, video, scheduling or a shared editable study room. Both devices must reach the same school backend. Arena writes require connectivity; failed saves retain the selected answer for retry, while server-acknowledged answers survive refresh.

This addition does not resolve the separate ecosystem audit's payment, password-recovery, guardian-authorization or backup findings. Those remain deployment work.
