# Codex Prompt 06 — NestJS Scenario API + protected form-based Studio

Read `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/SCENARIO_DSL.md`, `docs/SAFETY_CONTENT_AI.md`, `docs/MVP_ACCEPTANCE.md`. Implement **Stage 06 ONLY** (EDS-021–023 and EDS-029–032). Inspect existing DB/config before adding ORM; prefer existing solution. Do not silently replace infrastructure.

Backend:
- `GET /api/scenarios` and `GET /api/scenarios/:id` for safe published or clearly demo-only content; no public access to raw drafts.
- Protected authoring endpoints for draft create/update/validate/JSON import/export; immutable published versions; actual reviewer gate. Input checked via shared schema and graph validator; error response includes `{path,code,message}`.
- Choose PostgreSQL for persistent Studio if configured. Add migration + seed only as needed. Avoid storing participant paths/votes.
- Minimal author access control (e.g., dev-configured server secret) sufficient to prevent publicly writable endpoints. Never embed server secret in Angular build. If real reviewer unavailable, no false 'approved' fixture; demo-only preview.

Angular:
- Simple form-driven authoring of metadata, nodes/choices, effects, delayed triggers, source versions, AI flags and review status; validation feedback and JSON import/export.
- Preview exactly as participant would see with shared engine, without publishing draft.
- No drag/drop canvas, autosuggest, AI in this stage.

Acceptance:
- A new 3-decision JSON scenario authored via UI without source code edits, import/export roundtrips, validator blocks broken graph, preview works.
- Unauthorized author/reviewer calls rejected. Public catalog never exposes private drafts.
- Status 'expert-approved' never created by automated AI/code without real reviewer. Published version update creates new version, no silent mutation.
- Unit/API/UI tests for happy/error paths, typecheck/build green.

If stage too big, complete backend then form editor in a separate subtask, but do not claim completion until both are tested. Stop before next stage.
