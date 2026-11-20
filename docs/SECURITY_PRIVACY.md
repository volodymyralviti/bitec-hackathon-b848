# Stage 08 — privacy/security regression review

Scope: local MVP code, synthetic test traffic, public demo cases and generated frontend.
No real participants, operational military data, external penetration test or deployment inspected.
No critical issue was found in this bounded review; this is not production certification.

## Data boundaries actually implemented

| Data | Where it exists | Disclosure/deletion |
|---|---|---|
| Solo choices/metrics | in-memory Angular SoloSession | local debrief only; not sent to server; reload/reset loses run |
| Private author scenario | protected Studio memory + server JSON store on explicit save | public ID/version request returns 404 until an explicit safe demo/review publication |
| Author/reviewer capability | server environment; author key entered into tab memory | Bearer only protected API; no build config, URL, cookies or browser storage; empty role disabled |
| Host capability | generated server-side; host tab memory + volatile room | host authentication only; absent from participant URL, public state and logs |
| Participant token | joining participant's own ack/tab memory + volatile membership/binding | no identity binding; reconnect only; scrubbed at end/TTL |
| Raw current ballots | server in-memory token→choice map during open round | no broadcast, API list, log or disk write; map cleared on close, end and expiry |
| Aggregate | frozen room view after close | visible only after close; under three submitted ballots has no counts/percentages/total |
| Group branch/timeline | shared engine state, volatile room | host-selected route, not an individual participant's vote path; expires with room |

The requirement cannot mean “no credentials or ballots ever in RAM”: temporary capabilities
and open-round ballots are necessary for authorization/deduplication. Their narrowly scoped
storage is explicit; no persistent participant history or personnel profile exists.

There is no learner account, identity prompt, gradebook, leaderboard, commander report, chat,
analytics SDK or runtime LLM call. Source/review metadata is authored content; trusted authors
must not put names, identifying evidence or service data into it. Validation does not detect all PII.

## Evidence and negative tests

- `apps/server/test/scenarios.e2e-spec.ts`: every create/update/read/export/import/validate/fork/demo
  author endpoint and both reviewer operations reject anonymous calls with 401/no-store when
  configured; empty capability returns 503. Cross-role credentials rejected. No participant/profile/
  analytics/individual classroom report endpoint. Private drafts remain 404; immutable snapshots.
- `apps/server/test/classroom.e2e-spec.ts`: real Socket.IO clients, first-vote idempotence,
  changed/late vote rejection, strict DTO rejection of identity fields, PIN-only/wrong host control
  denial, no progressive result, three-round aggregates, suppression with one/two submitted votes,
  host loss/reconnect, races, capacity, TTL and end. Assertions verify raw ballot map size zero
  after close and credentials/membership erased after end, not merely omitted from payload.
- Same suite captures console calls during valid/invalid voting and compares the scenario-store
  file before/after: no ballot/credential log and no classroom writes. Broadcast payloads exclude
  tokens, membership, socket identity, personal fields and pending future effects.
- Production browser smoke: four isolated contexts, no name prompt, no browser storage, no live
  aggregate, correct post-close/small-group behavior. Studio export excludes runtime author key.
- `scripts/check-release-safety.mjs`: narrow known-secret-pattern scan of source/content/frontend
  build, with file/kind only if a pattern matches; verifies actual cases retain honest draft/demo/AI
  and unverified metadata. It cannot detect arbitrary secrets, names or all sensitive content.
- Manual code inspection: no request/vote/IP/user-agent logger or telemetry in application code;
  no `innerHTML`, sanitizer bypass, `eval` or runtime model client. Angular escapes case text;
  source URLs are HTTP(S)-validated and external links have `noopener noreferrer`.

## Threat model and remaining limits

The browser owner, malicious server operator, extension, physical observer or colluding group
can infer information. A token proves possession of a room credential, not one real person;
reload/rejoin/multiple devices are not Sybil-resistant. No IP fingerprint or account is added.
Suppression of fewer than three votes is a minimum safeguard, not formal anonymization.

Host reload loses control; same-tab transport reconnect works. Room membership lives until fixed
TTL so reconnect can deduplicate; ended rooms retain only the safe group result until expiry.
No multi-process/Redis synchronization: one API process. Studio JSON also requires one writer.
Public room creation has bounded capacity/TTL and socket rate limits; distributed Internet abuse
requires deployment controls. Shared author/reviewer capabilities are a development mechanism,
not production identity management or proof of a reviewer's professional qualifications.

Real publication requires people to verify reviewer qualifications and evidence. Reviewer access
stays disabled for this demo. The synthetic reviewer stub is test-only and never approves CIDS
content. No current Ukrainian legal compliance or original-PDF verification is claimed.

## Deployment logging checklist — team must verify before real use

1. Use trusted HTTPS/same-origin hosting and correct WebSocket proxying; do not expose private
   scenario-store paths, environment files or author/reviewer controls broadly.
2. Disable/minimize reverse-proxy, hosting, CDN and API access/connection logs. Do not collect
   IP/user-agent/URL query telemetry or record Authorization, request bodies, websocket packets,
   participant tokens or Studio content. Review retention/access for unavoidable infrastructure logs.
3. Do not enable Socket.IO/Engine.IO DEBUG packet logs, HTTP body tracing, APM session replay,
   analytics or learner progress recording. Verify managed-platform defaults rather than assuming
   application silence disables external logs.
4. Keep author/reviewer secrets in server configuration only, independently random, rotate on
   exposure, restrict OS access to `.data`, and keep reviewer unset until actual review is ready.
5. Use synthetic demonstration data; obtain content/source permissions, human review and a fresh
   deployment/privacy review before real classroom/production use.

Nothing was deployed, pushed or changed in remote configuration during Stage 08. Dependency
versions were not updated. A full dependency/advisory assessment, external pentest and actual
hosting-log verification remain outside the evidence; do not mark them completed.
