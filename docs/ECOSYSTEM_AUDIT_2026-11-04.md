# ACQAD ecosystem audit — 4 November 2026

**Release judgment: hold public production launch until the P0 findings below are resolved.** A controlled internal demonstration is a different decision. The frontend builds and several important academic workflows pass, but money, account recovery, guardian authorization, backups, and offline submission recovery have material gaps.

This audit covers the current working tree, including existing uncommitted changes. No application source was changed to fix findings. Tests and probes used a disposable database under `scratch/ecosystem-audit/runtime`, with an audit server on port 13999. The normal school database was not the test target. The Guardian React Native/Expo rebuild and student game are future work, separate from release readiness.

## 1. Evidence and limits

Evidence labels used below:

- **Reproduced:** exercised against the actual Bun API with disposable records.
- **Code-confirmed:** traced in current implementation, without a full browser reproduction.
- **Design gap:** a missing product capability or a requirement to settle.
- **Unverified:** not established by this audit; do not interpret as passing.

| Check | Result | Meaning |
|---|---|---|
| Production frontend build | Passed: compiled, type validation completed, 72 static pages generated | Buildable, not a guarantee that workflows work |
| Standalone frontend TypeScript check after build | Passed, exit 0 | An earlier check overlapped build regeneration and encountered missing generated files; the sequential rerun passed |
| Result/dashboard presentation tests | 7 passed | Release labels and assessment grouping scenarios covered |
| Auth, exams, academic API, session isolation/concurrency suites | 69 passed, 4 failed | Useful API coverage; failures analyzed below |
| Academic workflow and manual gradebook suites | 15 passed | Includes academic lifecycle, normalization, historical scoping, cumulative queries and manual gradebook creation |
| Focused security/data probes | Multiple failures reproduced | Payment authorization, negative payment, recovery, link collision, share token, export freshness, practice replay and CORS |
| Text PDF import fixture | Passed: one question extracted | Supports one simple text format; does not establish scans, mathematics, diagrams or arbitrary papers |
| Main-database export integrity | SQLite integrity check passed; recent user missing | A structurally valid export can still lose committed data |
| `/api/health` on running school backend | 404 | Health utilities elsewhere are not proof of a wired production health endpoint |
| Standalone root TypeScript check | Stopped without a result after prolonged execution | No backend typecheck sign-off; root config includes a broad source tree |
| Real-device/browser acceptance, deployed-host smoke, restore drill, sustained load | Unverified | Required before final launch sign-off |

Across the selected automated suites: **91 passed, 4 failed, 95 tests executed**. Most repository suites were not run: several hardcode port 8001, depend on existing demo accounts, or mutate persistent state. Running all of them against the current school server would be unsafe and would not be reproducible QA.

Raw local evidence: `scratch/ecosystem-audit/integration-checks.log`, `grading-checks.log`, `probe.log` and `probe.ts`. The probe is intentionally restricted to paths containing `ecosystem-audit`; it is an audit reproduction script, not a production test runner.

The previous demonstration QA report is not production certification. In particular, its suggestion that there is no simulated data conflicts with hardcoded guardian announcements and calendar fallback entries in current source. Empty-state screenshots establish rendering, not collection, reconciliation, publication or recovery workflows.

## 2. What this ecosystem actually is

The primary application is a **school installation node**: Bun HTTP/API runtime, SQLite, and a Next.js/React web frontend exported as static pages. It is more than a CBT app: it contains school setup, academic cycles, enrollment, subject ownership, assessments, grading, report cards, attendance, guardian links, messaging, licensing, offline queues and telemetry.

The deployed entry point is root `server.ts`, launched by root `package.json`. It dispatches extracted route zones in `server/router.ts` before a large fallback route chain. Those handlers import bindings back from `server.ts`; the extraction has not yet separated domain logic from process startup. `src/services` and `src/repositories` contain additional abstractions, but their existence does not establish that the active server uses every implementation. Similarly, health/config/Redis modules should not be counted as active production controls without tracing their wiring.

`db.ts` opens the main database selected by `EXAMPOOL_DB`, plus `content_bank.db` and `practice_logs.db` beside it. Telemetry buffering has its own database path. Runtime uploads are written under `frontend/public/uploads`. A complete persistent deployment therefore needs more than the main SQLite file.

The separate cloud control plane receives node telemetry and supplies licensing/entitlement context. Its implementation is outside the active source audited here. A heartbeat reports node status; it does not synchronize every school record to a parent-accessible cloud API. LAN access, public school data access, and supervisory monitoring are three separate concerns.

Other source trees (`exampool`, the older Vite project, alternative server files) should be treated as legacy/reference until ownership is explicitly documented. They create ambiguity for builds, fixes and security review. Do not delete them as part of a release without checking dependencies and history.

## 3. Deployment-blocking findings

### P0-01 — Guardian can record completed payments for an unrelated student

**Reproduced.** `server/handlers/guardian-portal.ts:107` accepts a guardian or operator and inserts a completed payment. It does not check an approved guardian relationship, validate that the fee belongs to the student's class/session, verify provider settlement, or reject a negative amount.

The audit guardian had one approved child. Posting a payment for another student returned HTTP 200, `status: completed`. Posting `amount: -5000` also returned HTTP 200 and created a completed payment. This can corrupt balances without funds moving.

The guardian fees interface also contains a custom card form with preset card-like values. It sends `payment_method` and `card_last4`, while the server reads `method` and defaults `fee_id` to 1 if absent. It displays success when the database write succeeds. This is not an implemented payment collection flow.

**Required:** disable collection until a real integration exists, or implement a pending invoice/payment intent, approved ward ownership, fee applicability, finite positive amounts, server-owned amount/currency/reference, provider verification, and idempotent settlement. Manual cash/bank reconciliation belongs to authorized staff. Use provider-hosted payment entry. Paystack's guidance requires backend verification before delivering value: [verification](https://paystack.com/docs/payments/verify-payments/), [webhooks](https://paystack.com/docs/payments/webhooks/).

**Acceptance:** unlinked ward → 403; negative/nonfinite/inapplicable amount → 400; arbitrary client success → no balance change; verified settlement → one ledger entry; repeated webhook → no duplicate credit.

### P0-02 — Guardian link IDs and student IDs are confused in access checks

**Reproduced for fees; code-confirmed risk in attendance.** At `guardian-portal.ts:95`, authorization accepts `(student_id = ? OR id = ?)`, but fees are fetched using the raw route number. A guardian's link-row ID can equal another student's user ID. The authorization succeeds for the guardian's own link, then reads the other student's records.

The audit created exactly that collision. GET fees for an unlinked student returned HTTP 200 and that student's payment record. Attendance uses the same ambiguous check and raw student ID. Some other handlers correctly resolve `link.student_id`; do not assume all routes are equally vulnerable.

**Required:** one canonical identifier per API. For student-ID routes authorize exactly `guardian_id + student_id + approved status`. For link-ID routes resolve the owned link and use its returned student ID throughout. Apply across ward detail, attendance, fees, results, reports, sharing and messaging.

**Acceptance:** explicit collision fixtures must return 403 for unrelated children; pending/rejected/revoked links must not grant access.

### P0-03 — Public password recovery uses personal information as the credential

**Reproduced.** `server.ts:1825` resets a student's password using DOB; other roles use a phone number. The audit reset an operator using identifier, phone number and a new password. No OTP or possession proof was needed. Rate limiting and constant-time comparison do not make personal information secret.

**Required:** short-lived single-use recovery tokens delivered through a verified channel, or an authenticated staff-assisted recovery process appropriate to schools. Privileged operators need stronger protection. Preserve generic responses and audit/revoke sessions on recovery.

**Acceptance:** knowledge of DOB/phone alone cannot reset an account; expired/replayed recovery credentials fail; old sessions are invalidated after success.

### P0-04 — Backup export can silently omit committed school records

**Reproduced.** `server.ts:6005` returns the main `.db` file directly while SQLite runs in WAL mode. The exported file passed `PRAGMA integrity_check`, but a recently created audit student existed in the live database and did not exist in the export. Integrity alone does not prove freshness/completeness.

The export also omits attached content/practice databases and uploads. The restore handler checkpoints and overwrites the still-open database file; despite its comment, it does not close and reopen every connection. It catches initialization failures and can still report success.

**Required:** implement a supported consistent snapshot operation, a manifest covering all persistent artifacts and schema version, validation before restore, controlled shutdown/reopen, rollback, and a restore drill in an isolated environment. Define the consistency boundary across the attached stores. See SQLite's [Online Backup API](https://www.sqlite.org/backup.html).

**Acceptance:** records committed immediately before export survive a restore; questions, practice history, uploads and associations survive; a failed restore preserves the prior installation.

## 4. High-priority findings

| ID | Status and location | User consequence | Smallest useful correction |
|---|---|---|---|
| P1-01 | Code-confirmed: `frontend/hooks/useOfflineAutoSync.ts:42`, offline-assignment page, offline sync handler | Client clears the entire assignment queue after a successful HTTP response even when individual entries were skipped/rejected; unsent work can disappear | Return per-item accepted/rejected/retryable receipts and delete only acknowledged IDs; preserve work added while a batch was in flight |
| P1-02 | Code-confirmed: `frontend/lib/offlineSync.ts`, `frontend/lib/idb.ts`, auth logout | Offline stores are global to the browser origin, not user/school scoped; an account switch can expose or replay a prior user's queued practice under the current identity | Partition by installation + user; suspend prior queues on account change; show owner and sync status; test shared-device transitions |
| P1-03 | Reproduced: guardian share-token generator/verifier around `guardian-portal.ts:808` | A fabricated base64 token with timestamp 0 was accepted as valid, with a 1970 creation date | Replace with unguessable stored or cryptographically signed expiring grants; validate scope, expiry and revocation; audit access |
| P1-04 | Code-confirmed: generated share URL targets `/student/report-card`; page requires student role | External recipients/guardians do not have a working guest sharing journey | Either remove sharing for launch or create a minimal scoped viewer. Token acceptance alone did not demonstrate report-data disclosure in this audit |
| P1-05 | Reproduced: practice start and submit | Start response includes the answer key; two identical submissions inserted two practice logs | Keep answer visibility for explicit study mode only; ranked modes require hidden keys, persisted attempts and idempotent reward events |
| P1-06 | Code-confirmed: `server.ts:740` | XP is exam raw-score sum + 25 per completed exam + 2 per practice log. Unequal exam mark totals and unlimited replay affect rank; school results influence game rewards | Separate academic results, learning mastery, lifetime XP and competitive rating; no ranked rewards until anti-replay is in place |
| P1-07 | Reproduced/code-confirmed: PDF upload succeeds, then parsed questions default to answer A and insert directly | Extraction success can publish incorrectly graded material; scans/complex layouts are not handled by the text parser | Import to draft; require answer-key verification and teacher approval; add provenance, deduplication, preview, diagrams and OCR fallback |
| P1-08 | Code-confirmed: `guardian-portal.ts:610` and `:662` | Announcements are fixed examples; an empty school calendar becomes invented dated events | Use persisted school-authored data; show honest empty and unavailable states; provide staff authoring/publishing |
| P1-09 | Reproduced: `server.ts:7094` | Arbitrary supplied Origin is reflected despite configured allowed-origin intent | Explicit origin allowlist and separate CSRF policy; test preflight and credential behavior. This probe used Bearer auth; it did not prove cross-site cookie theft |
| P1-10 | Code-confirmed: `fly.toml` | Application binds 8000 while HTTP service forwards to 8080 | Align actual listen/service ports and smoke-test the built image |
| P1-11 | Code-confirmed: runtime storage and deployment files | Main DB volume does not cover `frontend/public/uploads`, root telemetry queue or installation identity by default; redeploy can lose artifacts | Define one persistent data layout and include every store/upload/identity in deployment and restore design |
| P1-12 | Code-confirmed: `.dockerignore` | Broad `COPY . .` excludes main DB but not every auxiliary DB, node identity or demonstration artifact | Explicitly exclude runtime data, identities, logs, demos, nested source copies and private artifacts; inspect image contents before release |
| P1-13 | Code-confirmed: `auth.ts` and active server startup | Missing JWT secret creates a temporary secret; active entry point does not enforce the richer config validator; Secure cookies depend on `IS_HTTPS` | Fail startup without a durable strong production secret; validate HTTPS/proxy/origins and storage at the real entry point |
| P1-14 | Code-confirmed: notifications | Subscription storage and service-worker handlers exist; active `notifyUser` persists notifications and sends SSE, with no proven background Web Push delivery path | Treat in-app notifications as available; verify and implement background delivery separately, including credentials, retries and revoked tokens |
| P1-15 | Reproduced: `/api/health` 404 | A process/heartbeat can look available while school data or content is broken | Wire readiness/liveness into the serving process and hosting checks; include DB query, static entry and storage checks |
| P1-16 | Observed during isolated suite execution: `server.ts:5358` logged two foreign-key failures in automatic grading-subject creation | Exam submission can succeed while the downstream gradebook handoff fails silently | Investigate the fixture/period relationship, make the handoff outcome visible, and add an API assertion that submission creates the expected grading subject/policy; do not infer that every real-school submission fails |

The frontend pins Next.js 15.1.0 and React 19.0.0. Dependency patching must be reviewed before launch. The official [14 October 2026 Next.js advisory](https://nextjs.org/blog/nextjs-security-update-october-14-2026) identifies newer security releases. Assess applicability to the actual serving mode: this repository's static Bun deployment does not expose every Next server feature, while the Vercel configuration uses a different mode. Do not infer a specific exploitable CVE merely from the version string. No full dependency/advisory scan was completed.

## 5. Role journeys and missing handoffs

### School administrator

**Current journey:** first-run setup → institution configuration → session/term → classes/grade levels → users → subject/teacher assignments → enrollment → publication/scheduling → result oversight → reports/promotion → backup/licensing.

**Working evidence:** first-run audit server started; auth and academic API checks passed; selected lifecycle and normalization tests passed. The class/subject/session concepts exist.

**Missing or weak:** a single readiness checklist before opening school; content and question validation; trustworthy fees/bursar workflow; institutional announcements; safe backup/restore; explicit distinctions between archiving, closing and deleting a cycle; complete populated-data release acceptance; visible unresolved guardian links and missing teacher/subject assignments.

**Experience improvement:** give the operator a launch/readiness workspace: no active term, unassigned class teacher, unpublished timetable, ungraded essays, unapproved reports, failed sync and unverified payment should be actionable items with an owner. Do not make an administrator discover missing setup by visiting every portal.

### Subject teacher

**Current journey:** assigned subjects → author/import questions → set marks/instructions → publish/schedule assessment → student attempts → mark essays/manual work → reconcile CBT with CA → release results → communicate with guardians.

**Working evidence:** objective answer keys are stripped for formal CBT in the tested path; own versus other-student exam review checks passed; manual gradebook creation passed. The exam flow has preflight, save, submission and review surfaces.

**Missing or weak:** import quarantine and answer-key review; a clear boundary between question editing and published-version immutability; one status trail from draft through grading to release; actionable failed import/sync queues; completion checks for mixed automatic/manual grading; a clear duplicate/retake policy.

**Experience improvement:** surface “what must happen next” per assessment, including why a student cannot start and why a guardian cannot yet view the result. An assessment is not complete just because objective questions have a score.

### Class teacher / class master

**Current journey:** class appointment → roster → attendance → cross-subject broadsheet → remarks → report cards → promotion context.

**Working evidence:** selected class-teacher authorization, timetable scoping and historical academic-query tests passed.

**Missing or weak:** completeness tracking across all subject teachers; explicit approval ownership; safe correction/reopening after publication; absent versus unmarked attendance; late entrants/transfers/withdrawals; reconciliation between grade labels, class enrollment, session and term.

**Experience improvement:** class readiness should say which subject/result/remark is missing and who can fix it. Preserve the historical enrollment at the time of each report.

### Student

**Current journey:** login → learning dashboard → examinations/practice → readiness → attempt/save → submit/receipt → released results/report card. Offline assignments and practice add device queues. Dashboard already has XP, levels, badges, streak and cohort leaderboard data.

**Working evidence:** CBT start/save/review scenarios and concurrent double-submit protection passed in selected suites; presentation tests distinguish closed windows from completed work.

**Missing or weak:** reliable per-item offline receipts; identity-scoped saved work; curated populated practice library; trustworthy mastery progression; learning tasks generated from mistakes; multiplayer room/match states; server-authoritative scoring; repeat-reward prevention; study partner consent and safety; accessible untimed alternatives.

**Experience improvement:** retain a serious school-assessment workspace. Add a separate learning/play destination. After a weak topic result, show a short remedial lesson or targeted practice task before encouraging another ranked match.

### Guardian

**Current journey:** register/login → request child link → staff approval → choose child → performance/attendance/results/reports → messages/notifications → fees/calendar.

**Working evidence:** linking has a pending/approved concept; multiple-child context and dedicated views are implemented. Their full real-device behavior was not rerun in this audit.

**Missing or weak:** strict ward authorization; honest finance states; real announcement/calendar sources; functioning scoped report sharing; visible freshness and retry states; correct distinction between no data and failed fetch; background notifications; remote access beyond school Wi-Fi; account/device recovery.

The future native app should consume corrected backend contracts. Rebuilding the screens cannot repair false payment completion, link-ID confusion or unsafe recovery. Preserve multi-child switching, selected academic period, per-child permissions and explicit last-sync time.

### Platform owner / installation support

**Current journey:** provision installation/license → activate node → monitor heartbeat → entitlement/update/support operations.

**Working evidence:** local node-agent source and entitlement hooks exist; this audit disabled outbound telemetry and did not validate the external control plane.

**Missing evidence:** installation identity survival across containers/host changes; upgrade/rollback rehearsal; stable hardware-bound licensing on hosting infrastructure; independent alert delivery; restoration after machine loss; separation of telemetry from school record synchronization.

**Experience improvement:** provide an installation runbook with one accountable support path, recovery credentials, backup location and a safe upgrade window. A guardian app needs a reachable school-data service, not only a healthy control-plane node.

## 6. Test failures: interpretation

1. **T-100-B, unenrolled student sees subject:** current subject list intentionally includes globally scoped published subjects and class-matched subjects, and registration auto-enrolls some matches. This is a mismatch with the test's assumption; not proof that an unauthorized student can start the exam. The start path separately checks enrollment. Set the product rule, then align list, readiness and start gates. Acceptance should cover explicitly enrolled, class-eligible, global and ineligible students.
2. **T-160-A/B/D, promotion returns 400:** tests send `{ grade: 'SS2' }`; active API requires `grade_level_id` at `server.ts:5800`. This is contract drift, not evidence that all promotion logic fails. Update clients/tests against one canonical contract and separately prove annual promotion, retention, class reassignment and history preservation.

The academic workflow suite's broad names include database-level operations; passing those does not prove every UI button and release transition. The manual gradebook suite has one test. The concurrency suite proves specific simultaneous-start/save/double-submit cases, not sustained school-scale capacity.

## 7. Cross-cutting experience and operational gaps

- **Truthful state:** guardian fee and result paths sometimes convert failed requests into empty/zero data. “Unavailable — retry” must differ from “Nothing recorded.” Never make a school record look authoritative when retrieval failed.
- **Freshness:** selected term/session, last successful sync and publication status should appear near academic/financial information. Avoid a lifetime XP view masquerading as term performance.
- **Contracts:** fees GET returns `{ structures, payments }`, while its page prefers a summary object and falls back to ward data. Payment POST field names also drift. Generate or centrally validate request/response contracts.
- **Finance calculation:** ward summary treats any completed payment for a fee as fully paid, and sums student payments without a fee-period reconciliation step. Partial payments and historical periods need per-invoice allocations, not `find()` plus a student-wide sum.
- **Staff ownership:** fees have a guardian viewer and database tables, but no complete bursar/invoice authoring/reconciliation workspace was found in active routes. The school cannot operate a ledger purely from a guardian screen.
- **Static routing:** `[id]` guardian pages pre-generate a small fixed ID list. Current ward-list links use `/guardian/wards/profile?id=...`, which avoids that limitation, but shared/legacy dynamic URLs still need testing. Missing routes must not silently become a generic root-page success.
- **Offline execution:** mount-time sync is described in comments, but the hook currently calls `countPending()` on mount and waits for online event/interval for replay. More important: define per-item outcomes, ownership and idempotency first.
- **Accessibility:** keyboard completion, screen-reader exam flow, countdown warnings, text scaling, reduced motion, touch targets and mathematical content were not physically verified. Include these as acceptance work, not a blanket WCAG claim.
- **Performance:** build output includes about 428 kB first-load JS for teacher questions, 303 kB for student results and 278 kB for guardian dashboard. These are bundle observations, not measured device load times. Test low-end phones and a crowded school Wi-Fi network.
- **CI/reproducibility:** no release sign-off is supported by a single configured build plus clean-room fixture test command yet. Tests must not require demo credentials or hardcoded production-like ports. Consolidate Bun/npm lockfile policy and immutable installs.
- **Internet versus LAN:** service workers require an appropriate secure deployment context on normal mobile browsers. Validate real LAN deployment, HTTPS, reachability and offline capabilities on target devices. A page working on localhost does not settle this.

## 8. Release sequence and exit criteria

| Order | Deliverable | Exit evidence |
|---|---|---|
| 1 | Correct/disable payment writes; fix ward authorization and recovery | Negative, unrelated-child and possession-verification regression tests pass |
| 2 | Consistent complete backups and safe restore | Restore to a separate installation preserves last committed records and files |
| 3 | Per-item offline acknowledgements and identity isolation | Disconnect, timeout, partial batch rejection, account switch and duplicate replay drills preserve work |
| 4 | Remove invented records; repair fee and sharing contracts | Empty school remains empty; populated school displays exact published records and reconciled balances |
| 5 | Harden actual deployment artifact | Correct port/volume/HTTPS/secrets, patched dependencies, no runtime data baked into image, health check works |
| 6 | Full staged school rehearsal | Admin → teacher → two students → guardian; objective + essay + offline work; approve/release reports; correct/reopen; rollover |
| 7 | Capacity and recovery rehearsal | Load at agreed expected concurrent exam count plus headroom; restart/power loss and restore tests; documented rollback |
| 8 | Controlled school pilot | Named operators complete their real tasks; evidence of successful receipts, support handling and no data loss |

Suggested accountable owners: backend/auth for authorization and recovery; academic/assessment for grade/release transitions; finance integration for settlement; frontend/offline for device recovery; deployment/operations for persistence, backups and health. One person may own several areas, but every release blocker needs an owner and a passing artifact.

Unsettled business inputs: target school size and simultaneous exams; initial host; acceptable data loss/recovery time; who approves payments and reports; desired remote guardian access; which student age groups enter the game. Those inputs should shape the final launch acceptance criteria. They do not prevent fixing the reproduced failures now.

The companion `STUDENT_LEARNING_ARENA_PROPOSAL.md` defines the proposed student learning/game experience and its rollout independently of these fixes.
