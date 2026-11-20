# Stage 07 handoff — EDS-024–028, EDS-033 privacy subtests

**Status: PASS for the requested MVP.** Current branch: `stage07-classroom`.
Initial worktree was clean. No commit, push, branch switch or remote change performed.

Read AGENTS, project context, architecture, actual DSL, safety, tech decisions, MVP acceptance,
implementation plan, Prompt 07 and the six issue files; inspected existing Nest/Angular/engine,
Scenario API/export wiring, runtime dependencies, proxy and tests. Existing applications and
Scenario Engine were reused. No source-case or shared package edits.

## Delivered

NestJS ClassroomModule provides public creation from safe published/demo content, unpredictable
six-digit PIN, separate 256-bit host capability, strict DTOs and a Socket.IO Gateway. In-memory
state transitions are revision/round guarded and synchronous. Host alone opens/closes/advances/ends;
the shared engine performs narrative, decisions, effects and group debrief.

Participants join without identity and get a room-scoped volatile credential. The first confirmed
vote is final; identical retries are idempotent. No per-vote broadcast or live turnout/count.
Close freezes an aggregate and clears token→choice ballots immediately. Fewer than three submitted
votes yield only a suppression flag/minimum, even if more tokens joined. No exact turnout leaks.
No participant paths, votes or credentials are persisted in the Studio store or application log.

Host disconnect pauses new votes; same-tab reconnect authenticates again and returns current
safe state. Participant reconnect returns only own acceptance, without choice echo or other users'
data. Natural/explicit end clears credentials/membership/bindings; fixed TTL deletes room state.

Angular `/classroom/host`, `/classroom/join`, `/classroom/join/:pin` provide catalogue selection,
PIN/share URL, context/values/demo labels, confirmation/wait state, post-close aggregate, explicit
host branch selection and shared consequences/debrief/sources. No frontend vote tally or engine
logic duplication. Credentials live only in tab memory; stale acknowledgements after leaving are
ignored. Errors cover invalid/full/ended/expired room, network, stale/late vote and host loss.

## Actual checks

Node **22.22.3**, pnpm **10.0.0**, strict engines retained. Installed only required Socket.IO/Nest
gateway adapters/client and existing-version Zod for request validation; lockfile updated normally.

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | PASS; resolution skipped, lockfile up to date |
| `pnpm build` | PASS; initial Angular bundle 310.32 kB; no budget warning |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS: schema 28, engine 14, Angular 50, Nest unit 9, API/gateway 18 |
| `pnpm lint` | PASS; configured schema/engine/server checks |
| `node content/qa/validate.mjs` | Both success=true, errors=[] |
| `node --test content/qa/content.test.mjs` | 6/6 PASS |
| `node apps/client/scripts/check-solo-routes.mjs` | 16/16 real paths, exactly three decisions each |
| `node apps/client/scripts/smoke-classroom.mjs` | PASS: four isolated real browser contexts |
| `node apps/client/scripts/smoke-solo.mjs` | PASS: both real cases to debrief/restart |
| `node apps/client/scripts/smoke-studio.mjs` | PASS: real form/save/import/export/private preview/demo regression |
| `git diff --check` | PASS |

Gateway suite includes seven classroom tests (plus existing eleven API tests): full three-round
session/duplicate ballots/no live results/unchanged persistence; suppression with one/two votes;
host authorization/strict identity-field rejection; real reconnect/host loss; revision races;
capacity, ended/expired access, TTL cleanup and console log checks. Two config unit tests enforce
default TTL/threshold and reject unsafe bounds. Seven new Angular tests cover participant/host
flows, double click, private acceptance, suppression, reconnect, errors and late acknowledgements.

### Actual browser smoke

Edge 157 via native CDP, real built NestJS and websocket proxy, temporary isolated test store.

1. Context 1: `/classroom/host` → urgent-supply → create → obtain PIN/join URL.
2. Three separate browser contexts join the URL; only PIN is requested.
3. Host advances narrative, opens round. Each participant chooses/confirms; first uses keyboard.
4. Assert no live results for host/participants. Host closes: aggregate total=3, no individual list.
5. Host selects first choice and advances; repeat for all three decisions → shared ending/debrief.
6. Create another room, join two contexts, cast two votes, close: precise distribution suppressed.
7. Mobile 360px has no horizontal overflow; browser storage empty; console/runtime errors `[]`.

Ignored reports/screenshots: `.angular/classroom-browser-report.json`,
`classroom-host-aggregate.png`, `classroom-participant-mobile.png`,
`classroom-small-group-suppressed.png`. Screenshots inspected. Existing solo/Studio reports remain
in `.angular/`; all three browser scripts reported empty console errors on the final build.

## Files

Created:

```text
apps/server/src/classroom/classroom.config.ts
apps/server/src/classroom/classroom.config.spec.ts
apps/server/src/classroom/classroom.dto.ts
apps/server/src/classroom/classroom.service.ts
apps/server/src/classroom/classroom.gateway.ts
apps/server/src/classroom/classroom.controller.ts
apps/server/src/classroom/classroom.module.ts
apps/server/src/classroom/README.md
apps/server/test/classroom.e2e-spec.ts
apps/client/src/app/classroom/classroom.model.ts
apps/client/src/app/classroom/classroom-session.service.ts
apps/client/src/app/classroom/classroom-view.component.ts
apps/client/src/app/classroom/classroom.component.ts
apps/client/src/app/classroom/classroom.component.html
apps/client/src/app/classroom/classroom.spec.ts
apps/client/scripts/smoke-classroom.mjs
apps/client/STAGE07_REPORT.md
```

Updated:

```text
README.md
apps/client/README.md
apps/client/package.json
apps/client/proxy.conf.json
apps/client/src/app/app.component.html
apps/client/src/app/app.routes.ts
apps/server/.env.example
apps/server/README.md
apps/server/package.json
apps/server/src/app.module.ts
apps/server/src/scenarios/scenario.module.ts (export existing ScenarioService only)
pnpm-lock.yaml
```

## Privacy/operational limits and remaining review

- One Node process, volatile room state; no Redis/multi-process synchronization. Restart loses rooms.
- Fixed default TTL 30 minutes, minimum three submitted votes. No sliding renewal. Normal cleanup
  runs every second; requests check expiry too. End/expiry scrub token bindings and ballots.
- Anonymous token is not proof of a person. Multiple devices/tokens or reload/rejoin can bypass
  person-level uniqueness. The requirement enforced is one ballot per token/round. No fingerprint,
  IP matching or account is added. Do not claim Sybil resistance or perfect anonymity.
- Same-tab transport reconnect works. Reload loses participant/host credential; abandoned host room
  expires. No recovery secret is written into browser storage or join URL.
- Internet deployment needs HTTPS, correct WS proxying, access/rate controls and minimized logs.
  Infrastructure can observe IP/connections; do not log websocket packets or enable Socket.IO debug
  logs for actual classes. Suppression does not prevent collusion or observational inference.
- Existing source warnings remain three `SOURCE_UNVERIFIED` per CIDS scenario; no normative or
  expert review claim added. Existing Studio development tests emit two non-failing NG0956 tracking
  warnings; Angular ESLint is not configured (compiler/tests/browser checks pass).
- No leaderboards, profiles, commander reports, chat, analytics, AI, DB or next-stage work added.

Full protocol, errors, state machine and deployment caveats:
[Classroom README](../server/src/classroom/README.md).
No open blocker for the requested MVP. Stop for architecture/privacy/content review; Stage 08
and production hardening require a separate task.
