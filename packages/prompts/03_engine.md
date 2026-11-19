# Codex Prompt 03 — Pure deterministic Scenario Engine

Read `AGENTS.md`, `docs/SCENARIO_DSL.md`, `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION_PLAN.md`. Implement **Stage 03 ONLY** (EDS-007–010). Use the actual versioned schema from Stage 02; do not create a competing type system.

Tasks:
1. Create `packages/scenario-engine` (or complete existing) as pure browser-safe TypeScript, with tested module exports for Angular and Nest.
2. Implement `startScenario`, `getAvailableOptions`, `makeDecision`, `getDebrief` (names may adapt to agreed API, document). All state transitions deterministic and immutable.
3. Process immediate effects, schedule delayed effects, trigger due effects by precise rule, mark once, append auditable timeline. Define triggering order in docs and tests. Enforce valid choice IDs and terminal behaviour.
4. Implement at least one small complete 3-decision fixture with branches and delayed effects; exhaustive graph route test; explain effect rationale and limits (not moral judgement).
5. Tests: identical input→same output, no mutation (Object.freeze), invalid/duplicate/late choice, branching, effects fires exactly once, terminal state, serialization, deliberate bounds on metrics if chosen.
6. No HTTP, DB, RxJS, socket, runtime LLM, random or date-derived semantics. Do not build Angular UI in this stage.

Acceptance:
- Pure engine tests/build/typecheck pass.
- A script/test can run a complete 3-decision path to ending with delayed consequence and debrief.
- Both Angular and Nest can import engine without runtime module-resolution failures.
- Explain clearly whether metrics are signed deltas vs 0–100 scales; no invented scientific validity.

Stop after stage; report API signatures, actual tests, changed files and next dependencies.
