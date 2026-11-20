# Codex Prompt 05 — Angular Solo Simulator vertical slice

Read `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/PROJECT_CONTEXT.md`, `docs/MVP_ACCEPTANCE.md`, `docs/SAFETY_CONTENT_AI.md`. Implement **Stage 05 ONLY** (EDS-015–020) against actual schema and engine packages. Don't remake Angular or hardcode answers in components.

Build responsive Ukrainian solo experience:
1. Feature routes `/scenarios`, `/scenarios/:id/play`, `/scenarios/:id/debrief` (adapt to actual routing); accessible catalog with title/summary/difficulty/verified vs demo label and loading/error states.
2. ScenarioPlayer shows context, values at stake where pedagogically appropriate, multiple meaningful choices, confirmation, transitions and consequences. Engine is sole source for state changes; Angular Signals present result.
3. Immediate consequence and deferred event arrival displayed without spoiling future branches; lightweight timeline and dimensions of consequences. Show short/long impact, not user character labels.
4. Final Debrief: choices/timeline, conflicting values, law/professional standards vs open ethical tradeoffs, precise source links/revision/verification status, CIDS reflection prompts; ability restart/try another route.
5. Scenario retrieval from file/API adapter, no array of story texts inside Angular source. If scenario API not ready, use fixture adapter behind clean service interface and document replacement.
6. Keyboard/mobile UX, semantic buttons, responsive layouts, graceful reload/reset. No learner account or user-identifying telemetry.
7. Tests for catalog load, choosing option, delayed event display, finishing, missing scenario/API error.

Acceptance:
- From home to debrief, at least one complete >=3 decision path works in browser.
- Two CIDS-inspired files can be selected when present; state updates solely via shared engine.
- `ng build` and relevant tests pass; no runtime console errors.

Stop, report files and actual smoke path steps. Do not implement classroom/Studio in this stage.
