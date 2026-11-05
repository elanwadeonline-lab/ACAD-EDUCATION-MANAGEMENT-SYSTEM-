# Student Learning Arena — product proposal

**Proposal, not implemented functionality.** Based on the 4 November 2026 repository audit. The objective is to turn verified past questions into a repeatable learning loop: practice → challenge → review mistakes → study together → demonstrate improvement.

The existing dashboard already has XP, levels, badges, streaks and a cohort leaderboard. The missing layer is a trustworthy game/session model and a learning journey around it. A premium interface should make students feel they are entering a coherent play space while keeping formal school examinations clearly separate.

## 1. Scope and assumptions

**Job:** a student wants a short, enjoyable way to improve an exam topic and find a compatible peer to continue studying. **Desired outcome:** more retained knowledge, completed review tasks and healthy study partnerships. **Consequence:** ranks and rewards affect motivation; errors in questions, timing or scoring undermine trust, and peer interaction needs school-owned moderation.

Initial scope assumes one school installation, known enrolled students, teacher-approved content, same-school/cohort matching, objective questions for ranked play, and a useful solo experience when nobody else is online. Cross-school matchmaking, voice/video chat, real-money rewards, open social discovery and a separate full native student app are later decisions.

Proposed measurable requirements, to validate with the pilot:

- Students can enter solo practice within three purposeful actions from the Arena home.
- Rooms show join status, opponent presence and a clear fallback if no match is available.
- Rewards are deterministic, server-verified and issued once per qualifying event.
- A network interruption produces a visible recovery state; an uncertain result is never presented as final.
- All core learning tasks work without sound, gestures or motion; an untimed practice path exists.
- Start with an illustrative 200 simultaneous players, not an asserted customer forecast. Measure before finalizing limits.

## 2. The learning loop

1. **Choose a goal:** “Improve simultaneous equations” or a recommended weak topic.
2. **Warm up:** a short diagnostic or two unranked questions.
3. **Play:** solo quest, friend challenge, live duel or cooperative mission.
4. **Get a clear outcome:** score, which concepts were strong/weak, reward breakdown and any pending verification.
5. **Review:** explanations and a fresh question on each missed concept.
6. **Continue together:** optional study-partner invitation based on shared topic/availability.
7. **Return:** a spaced-review task tests retention on another day.

Winning a game is one outcome. Improving at a concept and becoming a reliable study partner are equally visible forms of progress.

## 3. Game modes and release priority

| Mode | Experience | Learning value | Priority |
|---|---|---|---|
| Solo Quest | Topic path with small question encounters and a checkpoint | Low-pressure progression and baseline skill | First |
| Daily Mission | A small mixed set, tailored to unfinished review | Creates a manageable habit | First |
| Friend Challenge | Send an approved question-set challenge; friend answers later | Works across different schedules and poor connectivity | First social release |
| Live Duel | Two players, same approved difficulty/topic blueprint, short rounds | Excitement and rapid retrieval | After authoritative match/reconnect logic |
| Co-op Expedition | Two to four students contribute to a common topic goal | Students cooperate instead of only competing | After duels |
| Boss Encounter | Finish a topic set to defeat a shared subject obstacle | Turns chapter completion into an event | Co-op extension |
| Classroom Tournament | Teacher-controlled room, roster, rounds and review | Supervised social learning | After school pilot |
| Seasonal League | Small cohorts, fresh season, fair skill grouping | Gives improving students a fresh start | After rating integrity |
| Explain Together | Partners compare reasoning after both answer | Builds understanding rather than answer copying | Moderated study-room release |
| Peer-authored Challenge | Students submit draft questions for approval | Encourages creation and explanation | Later; requires review capacity |

For a real game feel, use a subject world map, a restrained avatar system, clear rounds, meaningful progress and celebratory outcomes. Avoid bolting twelve unrelated badges onto an otherwise unchanged exam screen. Keep each mode's rules visible before entry.

## 4. The interface

Use five destinations: **Learn, Play, Partners, League, Profile**. Formal assessments remain in the existing school workspace, with a clear route back.

| Screen | What the student sees | Main action |
|---|---|---|
| Arena home | Continue quest, today's mission, one relevant challenge, available study plan | Continue learning |
| Subject world | Topic checkpoints, mastery evidence, locked prerequisites and explanation | Open topic |
| Play hub | Solo, challenge friend, live duel and co-op cards with duration/connection requirements | Choose mode |
| Room lobby | Code, roster, topic, rules, readiness, privacy and connection status | Ready up |
| Match | Player identities/avatars, round progress, one readable question, stable answer targets | Lock answer |
| Round reveal | Correct explanation, own answer, opponent status and updated score | Next round |
| Match outcome | Winner/tie/co-op result, accuracy, learning gain and reward breakdown | Review missed concepts |
| Review workspace | Mistake list, explanation and fresh transfer questions | Complete review |
| Partner invitation | Shared topic, school-visible identity, availability, what accepting allows | Invite to study |
| Study room | Shared plan, questions, notes/checklist, presence and session timer | Start study block |
| League | Weekly progress, comparable cohort, own position and promotion criteria | View next learning goal |

A mobile match can be sketched as:

```text
You  •  240 points       Round 3 of 8       Peer  •  180 points
                    [time / connection]

                   Question + diagram

              [ A ]             [ B ]
              [ C ]             [ D ]

             [Lock answer]      [Accessibility]
```

After locking, freeze the accepted answer and show “Answer saved.” Do not reveal the opponent's choice or correctness until the round closes. Large diagrams need their own accessible zoom/description flow. On desktop, a side panel can hold the map or room roster; on phones the question takes priority.

Visual implementation is a later `ui-design` task; motion is a later `ui-animation` task. This proposal settles behavior before those choices. A premium result comes from consistent typography, readable mathematical content, stable layout, touch/keyboard accessibility and fast state feedback, not the number of UI packages.

## 5. Live duel rules

Proposed pilot rules: eight questions, roughly four to six minutes, same subject/topic blueprint and validated difficulty. These numbers are tunable product assumptions.

- Both players receive the same logical items; option order may differ per player.
- Correctness is primary. Start with 100 points per correct answer and a small, capped speed bonus only where appropriate. Offer accuracy-only/unranked modes for accessibility and connection constraints.
- The server owns question version, deadline, accepted answer and scoring. Client clocks and animations are presentation.
- A locked answer is final for that round. A retry of the same submission returns the same receipt.
- No power-up changes correctness, steals an answer or purchases an advantage in ranked play. Cosmetic rewards can change presentation only.
- Ties are valid outcomes. Do not force an arbitrary speed tie-break where latency dominates.
- Disconnects enter a visible reconnect window. Choose a tested policy for resumed, void or forfeited matches; never quietly award a win for an uncertain server outcome.
- A server restart must recover from durable match state or void the match without rating loss. A visible “Checking result” state precedes rewards.
- AI/bot practice opponents are clearly labeled and do not inflate ranked multiplayer claims.

## 6. Rewards, mastery and fair competition

Maintain four separate concepts:

| Concept | Measures | Should not do |
|---|---|---|
| Learning XP | Verified participation, review and completion | Pretend to be a school grade |
| Topic mastery | Accuracy across varied items and later retrieval | Rise forever from repeating a memorized item |
| Competitive rating | Results against comparable opponents | Depend on raw school exam marks |
| Academic record | Teacher-controlled assessment and report results | Be altered by game rewards |

Use an append-only reward ledger with a unique event key, explicit reason and reversible correction entry. Award a modest base completion reward, an accuracy reward and a meaningful review reward. Limit repeated-item XP and obvious coordinated farming. Apply reward eligibility server-side.

Offer avatar cosmetics, profile frames, topic emblems, school-house contributions and season recognition. Keep monetary rewards and purchasable competitive power outside the initial scope. Celebrate a student's improvement and helpful study behavior alongside league standing.

Leaderboards should include weekly cohort leagues, topic mastery and improvement views. Show the student's nearby rank instead of displaying only an unreachable top ten. Let schools control visibility, aliases and season boundaries. Hide or reduce public ranking for cohorts where it harms participation. Do not publish fee balances, full academic records or personal contact details.

## 7. Turning past questions into reliable game content

“Upload any past question” needs a staged ingestion service. The current text PDF parser is a starting point, not that capability.

1. Accept a declared source type: digital PDF, scanned PDF/photo, DOCX or structured spreadsheet. Preserve the original privately.
2. Extract text/layout; use OCR where needed. Capture diagrams, tables, formulae and page references.
3. Detect stems/options and answer keys. Record confidence and missing fields; never silently choose A as an answer.
4. Normalize option references and validate exactly which answer is accepted. Handle multiple correct answers separately.
5. Suggest topic, curriculum, difficulty and explanation. AI suggestions remain draft until checked.
6. Detect duplicates and track provenance, rights/permission, exam body, year, paper and original question number.
7. Let a teacher preview source beside extracted item, repair formatting, verify the key and approve a version.
8. Publish approved immutable item versions into eligible modes; do not let an in-progress match change when the content is edited.
9. Collect “report this question” feedback. Quarantine defective items and correct affected rewards/rating transparently.

Theory/essay questions can support solo study and teacher review first. Do not auto-rank free-text essays without a defensible rubric and calibrated scoring process. Diagram questions require verified images and readable mobile rendering. “Successfully extracted” is a processing result, not a quality guarantee.

## 8. Matchmaking and study partners

Initially match within the same school and suitable age/cohort boundaries, then filter by subject/topic and approximate skill. Prefer a friend/room-code challenge before an unrestricted queue. If there is no opponent, offer solo or asynchronous challenge immediately.

At the end of a match, show an optional invitation such as “Study algebra together.” A compatible partner shares a topic goal, availability and suitable school cohort. Competition results alone are not enough to establish compatibility.

**Partner journey:** invitation → accept/decline → choose a shared goal → agree a time or start now → complete a short study plan → optional next session. A declined/expired invitation does not create a chat relationship. Either student can end the partnership or block further contact.

The study room starts with a structured plan: warm-up, individual answers, explanation discussion and fresh exit question. Show individual versus shared work clearly. Reward verified completion and improvement, not raw chat volume. Matching should also let a student request a partner without first playing a game.

For a school audience, the minimum operational layer includes report/block, school-visible identities, staff escalation, restricted attachments/links, moderation ownership, retention settings and audit history. These are necessary product capabilities for the proposed social feature, not an assertion that the current system already has them. Begin with structured prompts and limited chat; postpone voice/video and open cross-school discovery.

## 9. Required states and recovery

Interaction rules applied: `rule/cover-reachable-states`, `rule/error-states-recovery`, `rule/preserve-user-input`, `rule/name-object-scope-consequence`, `rule/keyboard-complete-flow`, `rule/accessible-name-required` and `rule/gesture-has-control-alternative` from the product-design skill. Each surface below inherits those rules.

| Flow | States to implement | Recovery/consequence |
|---|---|---|
| Content import | uploading, extracting, needs review, rejected, approved, published | Keep draft/source; retry processing; explain missing keys |
| Match discovery | idle, searching, no peer, expired invite, unavailable topic | Cancel freely; choose solo/async; preserve chosen topic |
| Lobby | joining, joined, ready, opponent left, host left, full, blocked | Rejoin if allowed; transfer host or close visibly |
| Round | loading, active, saving, locked, timed out, reconnecting, revealed | Server receipt decides acceptance; restore accepted state |
| Match settlement | finished, verifying, settled, void, disputed | No duplicate reward; explain void/forfeit and any appeal |
| Review | empty mistake list, in progress, saved, unavailable item | Keep progress; offer another valid item |
| Partner invitation | pending, accepted, declined, expired, withdrawn, blocked | Acceptance is mutual; withdrawal ends pending invitation |
| Study session | scheduled, active, peer absent, reconnecting, completed, abandoned | Preserve notes/work; reschedule or finish solo |
| Device/account | offline, expired session, switched user, revoked access | Bind saved work to its owner; reauthenticate before sync |

Cancel searching, leave lobby and decline invitations are reversible low-impact actions. Leaving an active ranked match states the concrete rating/forfeit consequence before action. Ending a partnership stops future contact but does not erase already moderated/audited records. Never promise an undo that the server cannot honor.

Coverage gap (proposed) `rule/school-peer-safety`: every peer relationship has mutual consent, school-bound visibility and reachable report/block controls. Category: new category, peer safety. Coverage gap (proposed) `rule/reward-receipt-once`: every settled reward has a durable event receipt. Category: State coverage.

## 10. Technical direction and scale boundary

Keep the current school application as the initial source for students, enrollment, staff and content permissions. Add a bounded learning-game module instead of rebuilding the whole academic system. Formal exams, practice attempts and multiplayer matches need separate state and reward eligibility.

Persist question versions, practice sessions, match membership/rounds/answers, result receipts, reward events, mastery evidence, seasons, invitations, partner relationships, study sessions and moderation cases. Exact API and schema design are follow-on work once scope is approved; they are not invented implementation contracts in this proposal.

Use an authoritative server connection for live rooms. A WebSocket is a candidate for presence/round events; HTTPS remains appropriate for content, history and recovery snapshots. Reconnection resumes from the server's durable sequence/snapshot. The existing SSE notifications are useful background context, but do not by themselves implement a match engine.

For the illustrative 200-player pilot with one answer per 15 seconds, average answer traffic is about 13 answers/second. With 100 two-player rooms, 200 answers may arrive near each round boundary; fanout, reconnect storms, writes and settlement are the important burst tests. This is arithmetic for a proposed test scenario, not a measured capacity claim. Keep the first topology simple; introduce shared coordination/storage only when measured requirements justify multiple match processes. Do not assume in-memory rooms work across replicas.

LAN games can work inside a school without public internet. Remote games and guardian access need an internet-reachable application service or an explicit synchronized cloud read/write design. The telemetry control plane is not automatically that service. Start with one authority per match; do not attempt offline ranked multiplayer. Offline solo practice can sync with limited reward eligibility later.

## 11. Guardian native app, kept separate

React Native with Expo fits the user's intended custom Guardian app. Retain the web admin/teacher workspace and shared domain contracts; build native child switching, notifications, result viewing, communication, document sharing and recovery around the corrected APIs.

Expo provides [SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/) for local secret storage and [Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) for native notification integration. Use a real development/production build and physical-device notification checks. Native notification tokens require their own backend lifecycle; existing browser subscriptions are not native push support.

Defer the final UI-library choice until the Expo SDK, platform support, accessibility and theming needs are fixed. Adopt one coherent component/token system and validate its major controls on Android and iOS. School branding should be configuration, not a separate fork for every school. Decide separately whether one configurable school-branded app or many store-listed apps is the actual distribution model.

The hard prerequisite is remote connectivity and secure session/recovery support. Premium screens over unreachable LAN endpoints would still fail the guardian journey.

## 12. Delivery plan and proof of success

| Phase | Build | Acceptance |
|---|---|---|
| 0 | Resolve audit release blockers | School data, access, recovery and money are trustworthy |
| 1 | Reviewed content pipeline, solo quests, review, idempotent XP | Real papers produce teacher-approved items; repeated submissions cannot farm rewards |
| 2 | Friend challenge and small leagues | Invite/replay/expiry/privacy work; weak connections have a useful asynchronous path |
| 3 | Live duels, server scoring, reconnect/void rules | Disconnect, duplicate answer, server restart and settlement tests pass |
| 4 | Mutual study partners and structured study rooms | Consent, block/report, saved work and staff handling operate in the pilot |
| 5 | Co-op, classroom tournaments and richer visual world | Teachers can supervise sessions; learning and performance measures justify expansion |

Measure retained accuracy on fresh items, review completion, topic improvement after several days, repeat learning sessions, successful study sessions, disconnect recovery, match abandonment, reward disputes and moderation resolution. Track match activity alongside learning; time spent and XP alone do not establish educational value.

Decisions still needed before implementation: initial age group; who owns content verification/moderation; school-only versus eventual cross-school play; expected live concurrency; ranked timing/accommodation policy; and the relationship between the public host and LAN nodes. A strong first release is reviewed solo learning plus asynchronous friend challenges, followed by trustworthy live duels and optional study partnerships.
