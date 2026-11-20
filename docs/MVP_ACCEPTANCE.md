# MVP_ACCEPTANCE.md — User journeys and objective release gates

## Stage 08 assessment — 2026-11-20

Evidence is from local Node 22.22.3 / pnpm 10.0.0, Windows + Edge 157, on
`stage08-release`. PASS means the named behavior was checked, not expert approval.
PARTIAL identifies an unverified source, human task or environment not executed.
FAIL means a requirement is known absent. No criteria were silently dropped.
Full commands, clean-source rehearsal and punch list: [RELEASE_READINESS.md](RELEASE_READINESS.md).
Original gate requirements remain below this evidence table.

| Gate/item | Status | Actual evidence / limit |
|---|---|---|
| A1 Ukrainian desktop/mobile, no learner login | PASS | Solo browser smoke, 360px/keyboard; Angular templates contain no learner identity prompt. |
| A2 two content-driven CIDS-inspired cases | PASS | API seeds explicit JSON manifest; browser catalogue selects both real cases. |
| A3 every route has ≥3 decisions / ≥2 alternatives | PASS | Shared validator + content QA + public-engine enumeration: 16 routes, exactly three decisions each. |
| A4 branching and applied delayed consequences | PASS | Route checker asserts applied event IDs once; browser solo checks delayed timeline and expected metrics for both cases. |
| A5 consequence dimensions, no personality grade | PASS | Four engine-derived additive dimensions, timeline explanations; no combined moral score or vote-based learner grading. |
| A6 explanatory debrief/source/reflection UI | PASS | Both browser routes reach debrief with values, short/long effects, CIDS questions, source metadata and limitations. This verifies display, not source correctness. |
| A6 source/legal factual verification | PARTIAL | Three SOURCE_UNVERIFIED warnings per case. Original PDFs/current legal applicability and actual human review not verified. Demo-only. |
| A7 reload/restart/error behavior | PASS | Solo smoke direct/deep-link/missing ID/restart; Angular/API unhappy-path tests. State is deliberately in-memory. |
| B1 host create/PIN/share URL/control/end | PASS | Real Nest/Socket.IO gateway tests and production browser host flow. |
| B2 three anonymous concurrent participants | PASS | Four isolated browser contexts: host + three participants, three full rounds. |
| B3 duplicates and reconnect | PASS | Real-client tests for same-token idempotence, changed vote rejection, host loss/reconnect; Angular double-click/late-ack tests. |
| B4 only post-close aggregates/no raw logging | PASS | Gateway payload/log/disk assertions; Stage 08 also asserts current-ballot map erased after close and no credentials/members after end. Only own acceptance is acknowledged privately. |
| B5 small-group suppression | PASS | Tests for one/two submitted votes even with more joined tokens; browser two-voter room hides total/counts/percentages. |
| B6 closed/expired vote rejection | PASS | Gateway round/TTL/end negative tests; cleanup and generic expiry notice. |
| C1 form-based ≥3-decision authoring | PASS | Real Studio browser smoke authors a case, adds choice, rejects short graph, saves, edits stored draft to revision 2. |
| C2 source/version/AI/review form fields | PASS | Recursive Reactive Forms + exact/null metadata roundtrip tests; completed expert review cannot be selected by author. |
| C2 actual expert/legal review | PARTIAL | Reviewer disabled by default; no real expert evidence for cases. Explicit synthetic reviewer stub only tests the gate. |
| C3 JSON roundtrip | PASS | Browser download/import/re-export exact equality; API import/export tests. |
| C4 private participant preview | PASS | Same player/engine with isolated route-scoped session; public private-ID request remains 404. |
| C5 private access and honest demo publication | PASS | All author/reviewer operations deny anonymous calls; immutable demo/published snapshots; unverified AI-assisted drafts visibly labeled. |
| D1 clean source install/build/start | PASS | Source-only temporary snapshot rehearsal described in release report; no existing node_modules/dist/.data/.env. Frozen lockfile, no dependency updates. Cache-backed install explicitly distinguished from uncached remote CI. |
| D1 DB migrations/Compose | PARTIAL | No PostgreSQL adapter, DB configuration, migrations or Compose in actual repo. User requested optional DB/Compose; local single-process file adapter used. Old EDS-034 container acceptance is not implemented. |
| D2 test coverage of critical journeys | PASS | Schema 28, engine 14, Angular 50, Nest unit 9, API/gateway 19; content 6; three production browser smoke scripts. |
| D2 static-asset hotfix follow-up | PASS | Eight asset regression tests; build verifies exact production allowlist and unchanged valid JSON. Imported from origin/develop per user request; release work preserved. |
| D3 credentials/PII/sensitive information | PASS (bounded review) | Known-secret scan, API/gateway privacy regression, synthetic public cases, no telemetry/profile endpoints. Not a full classifier, external pentest or infrastructure audit; see SECURITY_PRIVACY.md. |
| D4 pure engine | PASS | Public engine package imports only schema, deterministic/frozen-input/serialization tests; no backend/network/LLM dependency. |
| D5 maintainable setup/architecture/docs | PASS | Updated root README, Mermaid architecture, exact routes/seed/storage/engine semantics/privacy/source limits; short AI note and LMS boundary. |
| D6 reproducible hosted CI | PARTIAL | Pinned-action Linux/Windows workflow added; local equivalent checks green. GitHub jobs not run because no push/remote mutation authorized. |
| E1 2–5 minute walkthrough rehearsal | PARTIAL | 4:40 outline and automated technical rehearsal prepared; team presentation timing/rehearsal still required. |
| E2 representative demo flows | PASS (technical) | Solo+delayed+debrief, actual Studio edit/export/preview and classroom aggregate/suppression browser smoke. Final live demo not yet delivered. |
| E3 architecture/AI/human review/anti-misuse notes | PASS | README, AI_USAGE_UA.md, SECURITY_PRIVACY.md, DEMO_OUTLINE_UA.md; no invented review evidence. |
| E4 final presentation/video/public submission | PARTIAL | Video outline 2:50 only; no final video/slideshow/PDF, public deployment, push or submission performed. Team owns final assets and current-rule confirmation. |

**Conclusion:** local demo regression gates pass. Full educational/production/submission release
remains **PARTIAL** for content review, actual hosting/CI verification and team-owned artifacts.
No critical local application security/privacy issue found within the stated test scope.
No verified reviewer, current-law approval, remote deployment or final submission is claimed.

## Release gate A — solo learning (P0)
- Open web app on desktop and mobile, Ukrainian language, no learner login.
- Select one of at least 2 scenarios (CIDS inspired #16 and #1); scenarios loaded from JSON/API, NOT hardcoded in Angular component.
- On **every complete reachable path** of each scenario, user makes **at least three consecutive decisions**; each decision has ≥2 choices.
- Choices affect next narrative or later choices; at least one delayed consequence per scenario demonstrably fires later.
- Show qualitative effects on transparency/fairness/effectiveness/trust (or agreed equivalent) with explanatory context, not one moral/personality grade.
- Debrief explains conflicting values, outcomes across horizons, consequences to stakeholders, sources with version and limitations, CIDS reflection prompts.
- Refresh/restart works (persist local progress optional P1, but broken state on refresh must be handled gracefully).

## Release gate B — group teaching (P0)
- Host can create room with PIN or QR, open/close round, choose next branch, end room.
- At least 3 concurrent test participants can join without identity.
- Duplicate vote cannot inflate count; one active vote per token per round; reconnect behavior specified.
- Participant cannot see another person's vote; teacher only aggregate counts after closing, and no raw vote data in accessible logs/response.
- Below minimum anonymous cohort threshold, suppress precise distribution.
- Closed and expired rooms reject new votes gracefully.

## Release gate C — authoring (P0)
- Form-driven author can create/edit ≥3-stage case without programming; validation errors include useful location/message.
- Source fields and explicit review/AI status editable; example reference traceable to a source version.
- JSON import/export round-trip preserves content.
- Preview draft in player without production publication.
- Public participants cannot access/edit unpublished drafts. Any expert-approval shown must be based on real review. Demo-only cases clearly marked.

## Release gate D — engineering (P0)
- Fresh clone + pnpm install → documented build/test/start works. DB migrations run from scratch if DB used.
- Unit tests cover engine invariants and every playable path; API tests cover auth/review and classroom privacy; minimal E2E covers solo + classroom + Studio.
- No credentials, real operational military info, personal or prohibited restricted data in repo/logs.
- All Scenario Engine core operations use pure TypeScript independent of Angular/NestJS.
- README shows setup, running, architecture rationale, known limitations, source attribution, and debrief/scoring methodology.

## Release gate E — demo/submission (P0)
- A 2–5 minute demo walkthrough rehearsed; video up to 3 minutes if required by actual submission rules.
- Show 1 ambiguous multi-stage case, delayed consequence, debreif with sources, group vote and a simple scenario edit+preview.
- Architecture diagram, route/score rationale, human-review statement and anti-misuse design documented.
- `presentation/` PDF, public GitHub, AI-use note up to 1 page as required by task.pdf. Verify organizer's current rules/deadline independently.

## Items NOT required to accept MVP
- Production-grade AI copilot; auto-updating legal corpus; OAuth learner accounts; full Moodle/SCORM/xAPI export; arbitrary logic scripts; live video/VR; mobile binaries; personality score; commander/HR analytics; drag-and-drop graph canvas.
