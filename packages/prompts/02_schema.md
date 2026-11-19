# Codex Prompt 02 — Scenario DSL v1 + Zod validation

Read `AGENTS.md`, `docs/SCENARIO_DSL.md`, `docs/ARCHITECTURE.md`, `docs/PROJECT_CONTEXT.md`, `docs/SAFETY_CONTENT_AI.md`. Implement **Stage 02 ONLY** (EDS-005, EDS-006, EDS-011). Inspect current code first and avoid breaking Angular/Nest.

Goals:
- New self-contained pnpm workspace package `@eds/scenario-schema`, consumable by both current apps and by future pure engine.
- One versioned JSON schema for `Scenario`, decision/ending nodes, choices, source references, immediate and delayed effects, review status/AI flag; TS types inferred from Zod.
- Graph-specific semantic validation with human-readable Ukrainian errors; no arbitrary code in scenario JSON.

Tasks:
1. Create package with minimal exports/TS build compatible with ACTUAL Nest module system and Angular bundler. Update pnpm workspace/install only if required.
2. Implement types/schema: metadata, stable IDs, content version, UA text, sources including version/revision, values in tension, choice targets, metric deltas, delayed trigger and presentation strings, explicit demo/review flag.
3. Implement `validateScenario(scenario)` returning structured `{path, code, message}` errors. Check duplicate IDs, start/end nodes, missing/invalid refs, unreachable nodes, cycles (MVP disallow), ≥2 choice options per decision, **≥3 sequential decisions in each complete reachable path**, unreachable trigger, allowed metric/operator keys, illegal/missing source provenance flagged (without pretending to prove legal validity).
4. Write a small **synthetic** valid fixture, two invalid fixtures; programmatically enumerate all routes (make sure any path with only 2 decisions fails).
5. Add package tests and usage docs/sample `parseScenario()`.
6. If schema changes from `docs/SCENARIO_DSL.md`, update doc & add brief decision note. No Nest DB or Angular screens yet.

Acceptance:
- Valid fixture passes; broken paths, short path, cycle, missing ref fail with readable errors.
- Both apps can compile imports from the package (smoke import test if useful).
- `pnpm --filter @eds/scenario-schema test` (or actual documented command) green; build/typecheck green.
- No use of eval, unsafe scripts, network or model calls.

Stop and hand off with files, tests and any proposed schema freeze for team approval.
