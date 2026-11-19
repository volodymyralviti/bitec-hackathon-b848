# Codex Prompt 01 — Angular ↔ NestJS integration and workspace readiness

Read `AGENTS.md`, `docs/PROJECT_CONTEXT.md`, `docs/ARCHITECTURE.md`, `docs/SAFETY_CONTENT_AI.md`, `docs/IMPLEMENTATION_PLAN.md` and the Stage 00 audit results. Work on **Stage 01 ONLY**. Implement, don't merely explain.

Repository already contains `apps/web` (Angular) and `apps/api` (NestJS); **do not run `ng new` or `nest new`** and do not delete/recreate the workspace.

Detailed tasks:
1. Correct minimal root pnpm scripts/workspace setup if missing; ensure package filters match ACTUAL package `name` fields, not hardcoded `web/api` if different.
2. NestJS: create/reuse `HealthModule` or `HealthController`, `GET /api/health` returns `{status:'ok', service:'ethical-dilemmas-api'}`. Set global prefix `/api` once. Follow current Nest ESM/CJS import style.
3. Configure `.env.example` safely if missing. Do not add real secrets. Avoid setting up DB/ORM prematurely in this stage.
4. Angular: configure `provideHttpClient` in app config if absent, dev proxy `/api` → backend, a typed HealthService, and minimal home-screen API status using Signals. No external API calls, no unnecessary state library.
5. Add small integration/unit tests for the health API and Angular service or component where test harness is available. Test error/unavailable state.
6. If configuration already exists, **reuse/fix** rather than duplicate.
7. Document how to run `pnpm dev:web`, `pnpm dev:api`, curl health, tests and build.

Acceptance:
- Angular serves locally and loads with no runtime console errors.
- NestJS serves `/api/health` returning expected payload.
- Angular dev proxy GET `/api/health` succeeds; UI shows status; if API down UI shows graceful error.
- `pnpm install` compatibility, typecheck/build/tests work or clearly document external limitations.

Restrictions: no database, no auth, no AI, no Scenario Engine runtime, no git commit/push/deploy. Report exact changed files, checks and pending issues. STOP after this stage.
