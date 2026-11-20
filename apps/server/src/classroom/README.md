# Stage 07 — ephemeral instructor-led classrooms (EDS-024–028, EDS-033 privacy)

Uses existing NestJS/Express, Socket.IO and the public deterministic engine. No schema, engine,
case texts, database or individual analytics changes. ScenarioModule only exports ScenarioService
so classroom creation can select a validated public version. Studio/solo continue independently.

## Start / demonstrate

Use Node 22.22.3 and pnpm 10.0.0. `pnpm install --frozen-lockfile`, `pnpm build`,
then `pnpm dev:api` and `pnpm dev:web` in separate terminals.

1. Open `/classroom/host`, choose a scenario and create a room. Only this tab receives a random
   host capability. Share the displayed `/classroom/join/:pin` URL or six-digit PIN.
2. Three participants open that URL in separate browsers/contexts. Join without identity.
3. Host advances the introductory narrative and opens a decision round.
4. Each participant chooses and confirms once. The host sees no turnout/counts/individual choices.
5. Host closes the round. Aggregate distribution appears only with at least three submitted votes.
6. Discuss, explicitly select a group branch and advance. Repeat three decisions to the debrief.
7. Host may end early. The fixed TTL also expires a room automatically.

The host-selected group route and its consequences are educational, not a report of individual
participants. Majority is not legal or ethical approval. Existing demo/AI/source labels remain.

## REST and Socket.IO protocol

`POST /api/classrooms` accepts strictly `{scenarioId, version?}`; returns
`{pin,hostToken,expiresAt}` with `Cache-Control:no-store`. Creation requires no author/reviewer
key, and can select only safe public demo/published versions. There is no room-list, profile,
individual vote, report, room export or persistent classroom endpoint. Capacity bounds creation.

Socket.IO path **`/api/classroom-socket`**, websocket transport only, same origin by default.
Angular dev proxy upgrades `/api/**` (`ws:true`). A production reverse proxy must preserve
Host/Origin and forward Upgrade/Connection headers for this path. If necessary, configure a
single exact `CLASSROOM_ALLOWED_ORIGIN`; no wildcard CORS. Origin is not host authorization.
Node/native clients with no Origin still require room capabilities; Origin cannot authenticate them.

All request DTOs are strict Zod objects. Unknown fields (including names/email) are rejected;
errors never echo input. Packet size 8 KiB, 60 handled requests per socket / 10 seconds,
maximum 1000 concurrent transport connections. These bounds supplement capacity/TTL; they
are not a substitute for deployment-level abuse controls.

Every command acknowledgement is `{ok:true,data:...}` or `{ok:false,error:{code,message}}`.
No exception stack, token or raw request is returned/logged.

| Event | Request | Successful acknowledgement / behavior |
|---|---|---|
| `room:join` | `{pin,token?}` | `{token,state,hasVoted}` to that participant only |
| `host:join` | `{pin,hostToken}` | `{state}`; authenticates this socket as host |
| `vote:cast` | `{pin,round,choiceId}` | own `{status:accepted\|already_recorded}` only; never broadcast |
| `host:command` | `{pin,hostToken,expectedRevision,round,action,choiceId?}` | `{state}` and sanitized `room:state` broadcast |
| `room:state` | server push only | current safe classroom view |
| `room:expired` | server push only | generic expiry notice; credentials/membership removed |

Actions: `open`, `close`, `advance`, `end`. Host capability is a distinct random 256-bit value,
compared with `timingSafeEqual`. PIN and participant credential cannot control a room. Every
control requires both a host-authenticated socket and the capability. No secret is bundled into
Angular or included in participant URLs/broadcasts. Tokens are room-scoped and volatile.

## State machine / race semantics

```text
created -- narrative advance --> advanced
created/advanced -- open decision --> voting_open (new round)
voting_open -- close --> voting_closed (freeze aggregate, erase ballots)
voting_closed -- explicit choice + engine makeDecision --> advanced / ended
advanced -- narrative + engine advanceNarrative --> advanced / ended
any active phase -- host end --> ended
any room -- absolute TTL --> removed
```

Round and revision are mandatory host preconditions. Duplicate/stale commands fail, so
double close/advance cannot apply the engine twice. Service mutations are synchronous and
atomic within one Node process: a vote racing close is either accepted before the snapshot
or rejected after close. A stale round cannot vote in the next round. Narrative transitions,
metrics, applied delayed effects and final group debrief come from the existing engine only.
Only the current node/choice labels/explanations are projected, never pending events or future nodes.

## Ballot privacy and reconnect

**First confirmed vote wins.** Same token/round/same choice retries are idempotent;
a different choice returns `VOTE_ALREADY_RECORDED`. Closed rounds return `ROUND_CLOSED`.
There is no revoting or live progressive count. Own acceptance is acknowledged without echoing
the choice; reconnect returns only own `hasVoted` for the current open round.

Room keeps a token set and a **current-round-only** token→choice map. On close the service
computes one immutable aggregate snapshot and immediately clears that map. There is no per-token
path, previous-round choice, timestamp, socket identity or raw vote list in the public view or
instructor data. Join/leave/votes do not broadcast counts or update a visible turnout counter.

Suppression is based on **submitted distinct-token ballots**, not merely joined tokens, so three
joined users with one/two votes still receive only `{suppressed:true,minimum:3}`. No total,
per-choice counts, percentages or zero-count arrays are sent in a suppressed result. Once closed,
joining/leaving cannot change that snapshot. Opening/advancing clears the previous aggregate.

Disconnect retains a room token only until room TTL so the same tab can reconnect without a new
ballot. Socket.IO re-authenticates with the in-memory token/capability on reconnect. No cookies,
localStorage, sessionStorage, URLs or analytics store these secrets. Angular rejects stale replies
after switching/leaving a room. Host disconnection broadcasts only `hostConnected:false` and
pauses vote acceptance; reconnect restores controls with current revision. No auto-branch choice.

Reload/closing a tab loses its credential. A participant may rejoin as a new token, which is why
this protocol is not Sybil-resistant or proof of three real people. Do not rejoin to cast extra votes.
No account/device/IP fingerprint is introduced to solve that limitation. A host reload loses
control; the abandoned room expires. Explicit end/natural ending clears membership, ballots,
host capability and gateway bindings. TTL deletes room/group state and subscriptions too.

## Limits / operational caveats

Defaults in `.env.example`: fixed **30 minutes** from creation (not sliding), minimum **3**,
100 participant credentials/room, 100 rooms. TTL allowed 1–60 minutes; threshold cannot be
configured below 3. Cleanup runs every second and before service lookups. There is no durable
room storage or Redis adapter: deploy exactly one server process; restarting drops rooms.

Application-level anonymous results are **not network anonymity**. Browser extensions, an
observer in the room, shared screens, a malicious operator or colluding participants can infer
information. Proxy/hosting access logs may record IP, URLs or upgrade requests. Configure HTTPS,
trusted same-origin hosting, network access and minimized/disabled connection/access logs;
never log request bodies, Authorization, websocket packets or tokens. Do not enable Socket.IO/
Engine.IO DEBUG packet logging in a real class. Small-group suppression is a minimum safeguard,
not a formal anonymity guarantee. Public room creation/PIN guesses need network rate controls
for an Internet deployment; app limits do not establish person identity or resist distributed abuse.

No participant profile, leaderboards, commander reporting, chat, analytics or AI was added.
Human/source review status of the original cases is unchanged; no legal conclusions generated.

## Reproducible verification

```powershell
$env:CHROME_BIN='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
pnpm build
pnpm typecheck
pnpm test
pnpm lint
node apps/client/scripts/smoke-classroom.mjs
node apps/client/scripts/smoke-solo.mjs
node apps/client/scripts/smoke-studio.mjs
git diff --check
```

Gateway integration tests use a real ephemeral HTTP/Socket.IO server and independent clients:
three full rounds with duplicates, threshold suppression, strict DTOs, host authorization,
reconnect/host disconnect, revision races, full/ended/expired rooms, no raw broadcast/log data,
and unchanged scenario persistence file. Config tests prevent unsafe privacy/TTL settings.
Angular tests cover PIN-only join, confirmation/double-click, waiting/suppression, disconnected
host, reconnect acceptance, expiry/network errors, late acknowledgements and host controls.

`smoke-classroom.mjs` starts real built NestJS with a temporary scenario store and four separate
Edge/Chrome browser contexts, not mock clients. It completes three rounds/debrief, tests a second
two-voter room, keyboard voting, mobile 360px and empty browser storage/console errors. Requires
Node 22, prior build and installed Chromium; no new browser dependency or external service.
Ignored QA artifacts are in `apps/client/.angular/classroom-*.png` and
`classroom-browser-report.json`. Temporary test profiles/stores contain synthetic classroom data
only, not a production participant record. Processes close after smoke.
