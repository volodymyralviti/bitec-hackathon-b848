# Stage 08 — integration, privacy regression and release handoff

Assessment date: 2026-11-20. Branch: `stage08-release`. Initial worktree clean.
Stage 08 work is complete for local release preparation; **full educational/production/submission
readiness is PARTIAL** for human/source review, real hosting checks and final team-owned assets.
No new product features, dependency changes, commit, push, deployment or remote configuration.

## Changes and decisions

- Added read-only GitHub Actions regression workflow for Ubuntu 24.04 / Windows 2022, exact
  upstream action SHAs, Node 22.22.3, pnpm 10.0.0, frozen install, build/typecheck/lint/test,
  content/engine routes, safety scan and all three browser smokes. No app secrets or deploy step.
- Strengthened API tests to cover **every** protected author/reviewer operation and absence of
  profile/analytics/individual report endpoints. Extended classroom assertions to verify actual
  ballot deletion after close and credentials/membership deletion at end.
- Extended Studio browser smoke beyond new-form editing: save, edit stored draft, save revision 2,
  verify protected retrieval, export/import exact roundtrip and private preview.
- Added a narrow known-credential-pattern/honest-demo-metadata gate and a source-only snapshot
  helper. Neither is a full PII classifier, dependency advisory audit or production security proof.
- Corrected stale root/content README claims about static catalogue and demo seeding, documented
  actual architecture, engine semantics, routes, fresh setup, secrets and storage limitations.
- Removed only the exact `docs/MVP_ACCEPTANCE.md` ignore rule so the requested release assessment
  is reviewable/versionable. Other private planning/instruction files remain ignored.
- Added AI usage note (255 words, one-page intent), live/video outlines, privacy review and future
  LMS boundary. No final slideshow/PDF, video recording, SCORM/xAPI or infrastructure added.

## Commands and evidence

| Check | Actual local result |
|---|---|
| `node --version`, `pnpm --version` | 22.22.3 / 10.0.0; strict engines retained |
| `pnpm install --frozen-lockfile` | PASS, already up to date; dependency specifiers/lockfile unchanged; later authorized hotfix updates client scripts only |
| `pnpm build` | PASS: both packages/apps and Angular schema import smoke; initial bundle 310.32 kB |
| `pnpm typecheck` | PASS |
| `pnpm lint` | PASS: schema/engine/server configured ESLint; no automatic fix |
| `pnpm test` | PASS: schema 28, engine 14, Angular 50, Nest unit 9, API/gateway 19 |
| `node content/qa/validate.mjs` | Both `success=true`, errors=[], three SOURCE_UNVERIFIED warnings each |
| `node --test content/qa/content.test.mjs` | 6/6 PASS |
| `node apps/client/scripts/check-solo-routes.mjs` | 16/16 real routes; exactly 3 decisions each; expected delayed events once |
| `node scripts/check-release-safety.mjs` | 113 source/content/build files scanned; zero known credential patterns; two honest draft/demo/AI cases |
| `node apps/client/scripts/smoke-solo.mjs` | Both real cases complete, delayed events/debrief/restart, keyboard/mobile/deep-link checks PASS |
| `node apps/client/scripts/smoke-studio.mjs` | Form create + stored edit revision 2, graph rejection, private save, JSON roundtrip, isolated preview and explicit demo-only PASS |
| `node apps/client/scripts/smoke-classroom.mjs` | Four isolated browser contexts; three rounds/debrief; two-voter suppression PASS |
| `git diff --check` / Node script syntax checks | PASS |
| Workflow YAML parse | PASS: read-only token, two-OS matrix, 12 steps |
| Hosted GitHub Actions run | **NOT RUN**: workflow is local, no push/remote mutation authorized |

Browser: installed Edge 157/headless through native CDP, real built NestJS/Socket.IO, synthetic
temporary stores/credentials. All three browser reports have `consoleErrors:[]`. Existing Studio
development tests can emit two non-failing NG0956 tracking warnings; no product code was changed
to conceal them. Angular ESLint is not configured; compiler/Karma/browser checks are the client gates.

The existing API health suite verifies `GET /api/health` returns
`{"status":"ok","service":"ethical-dilemmas-api"}`. Browser harnesses wait for that real endpoint
before use. Missing scenarios, private IDs, transport errors, direct debrief without state,
invalid JSON/graphs and disabled/unauthorized authoring have explicit error-path coverage.

## Clean-source rehearsal

`node scripts/fresh-snapshot.mjs` produced a temporary source-only snapshot of the working
release code (including uncommitted release tests/docs), **175 files**. Before install the check
asserted no `node_modules`, client `dist`, server `.data` or `.env`. No `.git`, ignored instructions,
dependency tree or existing browser profile was copied. Nothing in the user worktree was deleted.

In that snapshot, executed successfully:

```text
pnpm install --frozen-lockfile --offline
pnpm build
node apps/client/scripts/smoke-solo.mjs
node apps/client/scripts/smoke-studio.mjs
node apps/client/scripts/smoke-classroom.mjs
```

Install used the existing package cache: 1239 packages, no downloads, no resolution/lock changes.
This proves a clean **source/build state**, not an uncached remote clone/network install or hosted
Linux run. The new CI is the reproducible next gate for those environments. Snapshot remains in
OS temp (`eds-release-source-*`) for diagnosis; test stores/profiles contain synthetic data only.
Root README's normal online install command remains `pnpm install --frozen-lockfile`.

Reproduce with the helper and use its printed directory; verify the destination is the generated
temporary path before entering it. Run commands there with the same Node/pnpm and `CHROME_BIN`.
The helper includes nonignored uncommitted source, so it is a rehearsal snapshot, not a signed
release artifact or claim that the remote repository contains this work.

## Acceptance / issue interpretation

[MVP_ACCEPTANCE.md](MVP_ACCEPTANCE.md) assesses every gate against named code/tests and preserves
the original requirements. Local technical demo gates pass. Content accuracy, actual reviewer
qualification, hosted CI and final submission remain partial.

| Issue | Result |
|---|---|
| EDS-033 privacy regression | PASS within local synthetic/code scope; no critical local application issue found; infrastructure/pentest out of scope |
| EDS-034 fresh-run/seed/health | PASS for actual local file-adapter architecture; legacy `docker compose web/api/db` criterion **not implemented**. Current task explicitly makes DB/Compose optional; no unsupported database introduced. |
| EDS-035 critical E2E | PASS: real solo, Studio stored edit/export/preview, classroom three clients/under-three suppression |
| EDS-036 docs/demo materials | PASS for requested docs/outlines/AI note; final recording, PDF, public repo/deployment/submission **not completed**, owned by team |

## Source/content truth at handoff

Both real JSON files remain schemaVersion 1 / version 1.0.0 / Ukrainian,
`publicationStatus=draft`, `contentReview={status:draft,demoOnly:true,aiAssisted:true}`.
API seed copies are explicitly `demo`, never expert-approved; source files are unchanged.
There are no verified Ukrainian normative sources in these cases.

| Source ID (each case) | Status / exact pointer | What remains unknown |
|---|---|---|
| cids-case | unverified; guide filename `11388-CIDS-rapport-2-2024-UKR-skjerm.pdf`; №16 PDF p14/printed p10, №1 PDF p13/printed p9 | original text, actual edition/date and permissions not independently verified in this checkout |
| cids-method | unverified; same guide, PDF pp11–12 / printed pp7–8 | original six-step/five-test wording/version not read; paraphrase follows team context |
| editorial-model | unverified; scenario JSON + teaching notes, author model 1.0.0 | no actual human factual/legal/pedagogical review |

For №16 the team supplied the clarification: communications equipment/spare parts, budget/specs,
informal information access, and urgency around generators for charging batteries. The current
backup-power education story is an **author adaptation**, not an assertion that the whole original
case describes our plot. №1 concerns professional advice potentially conflicting with political
leadership views; the educational program and later events are invented adaptations.

No primary PDFs were found in the source tree during this stage; no claim of reading them is made.
Full event AI policy, permitted providers, current Ukrainian law/applicability, actual reviewer
evidence and exact event year/deadline remain unverified. No large guide excerpts or full PDFs
were republished. Rights/notification/noncommercial conditions must be confirmed by the team.

## Privacy and deployment limits

[SECURITY_PRIVACY.md](SECURITY_PRIVACY.md) records actual data boundaries and negative tests.
Temporary credentials and open-round ballots necessarily exist in RAM; individual history is not
persisted or exported. Teacher receives only after-close aggregate, with no precise values under
three votes. Group engine history is the host-selected route, not each participant's route.

No network anonymity guarantee: infrastructure may observe IP/connections. Verify HTTPS/proxy/
logging configuration, disable body/packet/analytics capture, restrict secrets/store ACL and avoid
Socket.IO DEBUG logs. One process only, no PostgreSQL/Redis/migrations. Reload loses tab secrets;
same-tab reconnect works. Multiple tokens are not proof of different people. Local tests do not
certify a public Internet deployment, operational case content or legal readiness.

## Punch list for people — no automatic next stage

1. **Team/reviewer:** obtain original task/CIDS PDFs, confirm attribution, usage conditions and AI
   policy; verify content/source editions, legal applicability and pedagogical trade-offs. Keep
   demo labels and reviewer capability disabled until actual evidence exists.
2. **Maintainer:** review this diff and approve any future commit/push. Then run the added hosted
   Linux/Windows CI and inspect results; do not equate local YAML validation with a hosted run.
3. **Demo owner:** use DEMO_OUTLINE_UA.md, rehearse/measure the live 4:40 plan, record/check the
   proposed 2:50 video, prepare final presentation/PDF only when requested and confirm current rules.
4. **Hosting owner, before real use:** agree deployment/access model, HTTPS/WS origin/proxy,
   infrastructure logging/retention, secrets/ACL, capacity and single-process limits; conduct a fresh
   deployment privacy/security review. No deployment is authorized by this report.
5. **Product owner:** separately prioritize production identity, database/multi-process support or
   LMS adapter if actually needed. None is silently included in Stage 08.

No critical local blocker discovered; source/human/hosting/submission items block broader release
claims. Stop here for review. No final slideshow/PDF/video, deployment, commit or push performed.

## Files changed

Created: `.github/workflows/release-checks.yml`, `scripts/check-release-safety.mjs`,
`scripts/fresh-snapshot.mjs`, `docs/MVP_ACCEPTANCE.md` (existing local requirements now versionable),
`docs/RELEASE_READINESS.md`, `docs/SECURITY_PRIVACY.md`, `docs/AI_USAGE_UA.md`,
`docs/DEMO_OUTLINE_UA.md`, `docs/LMS_INTEGRATION.md`.

Updated: `.gitignore`, `README.md`, `content/README.md`,
`apps/client/scripts/smoke-studio.mjs`, `apps/server/test/classroom.e2e-spec.ts`,
`apps/server/test/scenarios.e2e-spec.ts`. Product source, dependency specifiers/lockfile, schema/engine
and original case JSON unchanged. See authorized hotfix follow-up below for client script changes.

## Follow-up — restore omitted static-asset hotfix

At the user's request, fetched `origin/develop` (`d82b42c`) and imported exactly four files from
that remote snapshot, preserving all uncommitted Stage 08 work. Original hotfix commit: `af47f68`;
Stage 07 reconciliation: `1200469`. No merge/cherry-pick/commit/push was performed, so Git ancestry
is not claimed synchronized. Unrelated remote `package-lock.json` was not imported into the pnpm repo.

Imported verbatim:

- `apps/client/package.json` — build verifies production scenario output; test includes the asset
  suite; separate `test:scenario-assets` command. Existing schema **and engine** preparation retained.
- `apps/client/scripts/prepare-scenarios.test.mjs` — eight source-only/allowlist/private-draft/path
  traversal and failure regression tests, with isolated temporary fixtures.
- `apps/client/scripts/verify-scenario-build.mjs` — validates exact built allowlist and unchanged JSON.
- `apps/client/README.md` — supported launch command and static-assets/API distinction.

The earlier 175-file clean-source rehearsal predates this four-file follow-up. The imported suite
independently exercises asset preparation in isolated layouts; production build and current client
tests are rerun after import. Existing CI automatically invokes both new gates through build/test.
No hidden static fallback is enabled; API remains the default repository. Scenario text and demo/
review/AI metadata are unchanged.

Follow-up results: `test:scenario-assets` **8/8 PASS**; client production build including exact
allowlist verification **PASS**; client test runs asset **8/8** and Angular **50/50 PASS**;
`pnpm install --frozen-lockfile` **PASS**, already up to date. Byte-for-byte comparison confirms all
four imported files equal `origin/develop`. Existing non-failing Studio NG0956 warnings remain.
