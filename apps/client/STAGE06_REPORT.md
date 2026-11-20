# Stage 06 — review handoff

Status: **PASS for the requested MVP**, on branch `scenario_api`.
Node 22.22.3 / pnpm 10.0.0 / Angular 21 / NestJS 11.
No commit, push, merge, rebase or remote operation performed during Stage 06.
The 19 previously staged Stage 05 files remain staged; their index was not changed.
Schema, engine and original scenario JSON have no changes.

## Delivered behavior

- Public API exposes only immutable `demo`/`published` versions; exact-version private drafts return 404.
- Author runtime capability protects list/create/update/validate/import/export/fork/demo operations.
- Independent reviewer capability defaults to disabled. Actual review evidence, explicit human
  attestation, unchanged AI provenance and the shared publication/source gates are required.
  No sample content was approved. A synthetic reviewer stub exists only in isolated API tests.
- Shared schema/graph/provenance validator returns structured diagnostic paths/codes/messages.
- Optimistic revisions reject concurrent stale writes. Public and completed-review snapshots
  cannot be edited; fork creates a greater SemVer private draft and resets review/source claims.
- Reactive Forms edit metadata, all node types/choices, effects/triggers, debrief and source versions.
- JSON import/export roundtrips, local/server validation and private save work without source edits.
- Route-scoped preview uses the existing player, debrief and public engine. Editing a draft with
  the same ID/version starts a fresh preview snapshot; the public learner run is unchanged.
- Default catalogue uses the real API; missing/API failures retain existing error/retry states.

## Actual checks

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | PASS; engines/engine-strict unchanged |
| `pnpm build` | PASS; initial Angular bundle 296.93 kB, no budget warning |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS: schema 28, engine 14, Angular 43, Nest unit 7, API 11 |
| `pnpm lint` | PASS; configured schema/engine/server ESLint |
| `node content/qa/validate.mjs` | Both success=true, errors=[] |
| `node --test content/qa/content.test.mjs` | 6/6 PASS |
| `node apps/client/scripts/check-solo-routes.mjs` | All 16 real paths, exactly 3 decisions each |
| `node apps/client/scripts/smoke-solo.mjs` | PASS with real NestJS and Edge 157 |
| `node apps/client/scripts/smoke-studio.mjs` | PASS with real NestJS and Edge 157 |
| `git diff --check`, `git diff --cached --check` | PASS |

Browser smoke uses temporary stores and runtime keys, never the developer's configured data.
Studio path: `/studio` → runtime author access → blank form → author ID/title/context and
three decisions → add a third choice → introduce a short graph path (blocked) → fix →
save private (public 404) → browser JSON download → private preview → three decisions →
ending/debrief → return → import/export exact roundtrip → open saved revision → explicitly
confirm demo-only → immutable public demo, still `draft` review / AI-assisted.
Unauthorized author request: 401. Reviewer unconfigured: 503.
Expanded nested forms at 360px have no horizontal overflow; screenshots inspected.
Both scripts report runtime/console errors `[]`; no credential in browser storage/export.

Real solo regression paths through the API:

| Scenario | Choices | Ending | transparency/fairness/trust/effectiveness |
|---|---|---|---|
| urgent-supply | common-brief → shared-questions → recommend-minimum | limited-service | 3 / 2 / 0 / 1 |
| truth-under-pressure | peer-window → interim-options → test-access | conditional-pilot | 4 / −1 / 1 / 0 |

Both reach debrief and restart; keyboard Enter choices/confirmation, Tab skip-link, deep links
without state and unknown scenario are checked. Local ignored artifacts:
`.angular/solo-browser-report.json`, `.angular/studio-browser-report.json` and screenshots.

## Limitations and warnings

- No PostgreSQL/ORM/configured database existed. Durable atomic JSON storage is for a single
  process only. `DATABASE_URL` fails closed until a PostgreSQL adapter is implemented.
  No infrastructure was silently replaced; no migration or dependency was introduced.
- Shared capabilities are development access control, not production user identity. Real reviewer
  qualifications/evidence must be verified by people before enabling `REVIEWER_KEY`.
- Each original case has three `SOURCE_UNVERIFIED` warnings (sources 0/1/2). Legal applicability
  and CIDS first-source attribution still require separate content review; no new legal claim made.
- Angular development tests emit two non-failing `NG0956` tracking warnings when replacing a whole
  form snapshot. Production browser console errors are empty. Angular ESLint is not configured;
  compiler, Karma and production browser checks passed.
- Studio form/preview/key are in-memory until explicit private save; reload loses unsaved state.
  No participant path/vote/telemetry data is persisted. Infrastructure logs require separate setup.
- No Classroom, AI, authentication service or next-stage feature implemented.

## Stage 06 files

Created:

```text
apps/server/.env.example
apps/server/src/scenarios/access.guard.ts
apps/server/src/scenarios/scenario-config.ts
apps/server/src/scenarios/scenario-config.spec.ts
apps/server/src/scenarios/scenario-store.ts
apps/server/src/scenarios/scenario.service.ts
apps/server/src/scenarios/scenario.controller.ts
apps/server/src/scenarios/scenario.module.ts
apps/server/test/scenarios.e2e-spec.ts
apps/client/src/app/core/scenarios/api-scenario-repository.ts
apps/client/src/app/core/scenarios/api-scenario-repository.spec.ts
apps/client/src/app/scenario-studio/form-model.ts
apps/client/src/app/scenario-studio/editor-field.component.ts
apps/client/src/app/scenario-studio/editor-field.component.html
apps/client/src/app/scenario-studio/studio-api.service.ts
apps/client/src/app/scenario-studio/studio-workspace.service.ts
apps/client/src/app/scenario-studio/studio.component.ts
apps/client/src/app/scenario-studio/studio.component.html
apps/client/src/app/scenario-studio/studio.routes.ts
apps/client/src/app/scenario-studio/studio.spec.ts
apps/client/src/app/solo/solo-navigation.ts
apps/client/src/assets/studio-blank.json
apps/client/scripts/scenario-api-harness.mjs
apps/client/scripts/smoke-studio.mjs
apps/client/STAGE06_REPORT.md
```

Updated (some extend the already staged Stage 05 implementation):

```text
.gitignore
README.md
pnpm-lock.yaml
apps/server/package.json
apps/server/README.md
apps/server/src/app.module.ts
apps/server/src/main.ts
apps/server/test/app.e2e-spec.ts
apps/client/README.md
apps/client/scripts/smoke-solo.mjs
apps/client/src/app/app.component.html
apps/client/src/app/app.config.ts
apps/client/src/app/app.routes.ts
apps/client/src/app/solo/solo-player.component.ts
apps/client/src/app/solo/solo-player.component.html
apps/client/src/app/debrief/debrief.component.ts
apps/client/src/app/debrief/debrief.component.html
apps/client/src/styles.scss
```

Only package/lockfile change: existing `@eds/scenario-schema` moves from server dev dependency
to runtime dependency. No external package added. Server configuration and full API DTOs:
[server README](../server/README.md). UI instructions: [client README](README.md).

Stop here for architecture/content review. Production database, identity and actual expert
review remain explicit follow-up decisions, not completed claims.
