# Codex Prompt 00 — Read-only audit (FIRST task)

Read `AGENTS.md` and ALL files in `docs/` relevant to the product and architecture. Look at `backlog/BACKLOG_UA.md` if available. Your assignment is **Stage 00 ONLY**.

You are inside my EXISTING pnpm monorepo with an Angular frontend and NestJS backend. Do NOT regenerate apps, reset Git, modify files, install dependencies, use external services, commit or push.

Tasks:
1. Inspect actual file tree up to useful depth, root `package.json`, `pnpm-workspace.yaml`, Angular config and Nest package/tsconfig/module system; inspect `git status` (read-only).
2. Determine installed Node/pnpm/Angular/Nest versions, module format (ESM/CJS), package names/exports, scripts and dependencies. Report **actual**, never assume.
3. Inspect whether `/api/health`, Angular HttpClient, dev proxy, CORS or test setup already exist. Identify conflicts and duplicated config; DO NOT make changes.
4. Assess readiness for packages `scenario-schema` and `scenario-engine` with correct compatibility both in Angular and NestJS.
5. Identify build/test/lint commands and report which can safely be run without modifying the repo. Run read-only checks if feasible; say exactly what ran.
6. Highlight contradictions with `AGENTS.md` and the OLD React/Fastify planning document (if present). Use Angular/NestJS as agreed.
7. Recommend an ordered **minimal diff plan** for Stage 01: target file paths, commands, dependencies, acceptance tests and any genuine blockers.

Output in Ukrainian:
- Actual architecture/state, versions and Git status.
- Already done vs missing.
- Stage 01 specific action plan.
- No files changed. Stop; wait for my next stage prompt.
