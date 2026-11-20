# Server

## Stage 10D — актуальний публічний демокаталог

У стандартному каталозі та Classroom picker рівно три оригінальні, вигадані й
знеособлені кейси: **«Підпис під сумнівом»** (report-under-pressure),
**«Хто заслуговує на місце?»** (fair-selection), **«Тиша після шикування»**
(quiet-after-formation), у такому порядку. Кожний маршрут має рівно три рішення.
Без ключа можна пройти кейс або імпортувати його JSON у /studio/demo.

Демо · Потребує експертної перевірки. Нормативні редакції NOT VERIFIED,
expert review PENDING. Оригінали draft/demoOnly/aiAssisted, sources unverified,
choices uncertain. Це не юридично підтверджена навчальна публікація.

Два CIDS-адаптовані кейси збережено як архівні приклади й регресійний контент,
вони не входять до основного каталогу. CIDS лишається методичним орієнтиром;
нові три ситуації не є адаптаціями CIDS чи описами реальних подій.


NestJS 11 / Express / CommonJS. Stage 06 adds versioned Scenario API and protected Studio storage.

## Stage 10B — source metadata

Existing protected import/create/update/validate/export routes preserve optional
DSL v1 legal metadata. See [author instructions](../../docs/LEGAL_SOURCES_UA.md)
and [ADR 0002](../../docs/adr/0002-legal-source-metadata.md).
New diagnostic severity is ERROR/WARNING/INFO; INFO stays in warnings for wire
compatibility. Legacy diagnostics inherit their collection. Draft warnings do not
block storage. Publication requires complete normative metadata, evidence, content
creation date and the existing human review gate. Definite legalStatus requires
an expert_checked normative source with relevance/evidence. Authors cannot submit
expert_checked/expert_approved. No URL is fetched server-side; format does not
imply availability, source verification or expert applicability. No SSRF endpoint.
See the [root README](../../README.md) for Node 22.22.3 / pnpm 10 setup.

Stage 07 also provides an in-memory Socket.IO classroom, separate from Studio persistence.
See [Classroom protocol, privacy and tests](src/classroom/README.md). No participant data is
written to the scenario store. Author/reviewer capabilities do not control classroom rooms.

## Run and access

### Публічна Demo Studio та deployment

`/studio/demo` працює лише в Angular memory, без server sessions або author API.
Серверні guards не змінені. `/studio` лишається захищеним режимом: ключ задає
адміністратор у AUTHOR_KEY, reviewer — окремо в REVIEWER_KEY. Порожні значення
вимикають ролі; public demo ключів не потребує. Не копіюйте ключі у frontend.
Після reload автор повторно входить і відкриває збережену приватну версію.

Додано необов’язковий HOST для bind address; production same-host proxy має
HOST=127.0.0.1, PORT=3000. Без HOST збережена попередня поведінка listen.
Підготовлені systemd/Nginx/env приклади й [український runbook](../../docs/DEPLOYMENT_RUNBOOK_UA.md):
HTTPS, WebSocket upgrade, rate limits, відключені request logs, persistent store,
single-process режим, backups/rollback. Реального deployment не виконано.
Classroom PIN залишається публічним locator у чинному join-link; секрети ведучого,
participant tokens і голоси не додаються до URL або logs. Restart очищає кімнати.

Build workspace packages first (`pnpm build`), then `pnpm dev:api` or
`pnpm --filter server start:prod`. `PORT` defaults to 3000.
[.env.example](.env.example) documents variables; it is **not automatically loaded**.
Export `AUTHOR_KEY` server-side: an independent random value of at least 32 characters.
Enter it at `/studio` at runtime. Never put it into Angular environment files, assets,
build arguments, URLs or source control. It remains in tab memory, with no browser storage.
Serve production frontend and `/api` at the same origin over HTTPS; dev proxy already targets 3000.

Empty author/reviewer key disables that role (503). A configured role rejects missing/wrong
Bearer credentials with 401. `REVIEWER_KEY` must differ from `AUTHOR_KEY` and requires an author
key. It stays **unset until an actual human reviewer is available**. No real sample is approved
by this implementation. Protected responses use `Cache-Control: no-store`.
These are minimal development capabilities, not production identity/role management.
Restrict deployment access, rotate capabilities, and configure infrastructure logs to avoid
logging Authorization headers, request bodies or participant metadata. The app has no vote,
path, IP, user-agent or credential logging and stores no participant activity.

## Persistence

No PostgreSQL connection, ORM, migration system or database infrastructure was configured in
this checkout. The adapter persists only scenarios/revisions/review evidence in
`apps/server/.data/scenarios.json` (ignored), or `SCENARIO_DATA_FILE`.
Atomic temporary-file rename and a process-local write queue prevent partial writes and lost
updates within **one server process**; `expectedRevision` rejects stale clients (409).
Do not run multiple writers against one file. Back up this directory and restrict its OS ACL.
This is a durable MVP adapter, **not a production PostgreSQL implementation**. A configured
`DATABASE_URL` fails startup rather than silently falling back; implement/test a PostgreSQL
adapter before using that configuration. No ORM/dependencies/infrastructure were replaced.

On every start, `content/scenarios/index.json` defines the ordered read-only curated demo catalog, independently of existing author records. First-start persistence still creates demo seed snapshots. Existing stores are not overwritten. API demo projections are not expert approval; source JSON remains draft. See ADR 0004 and the Stage 10D report.
Stored copies use `publicationStatus=demo`; original JSON remains unchanged (`draft`). Human
review and source verification remain untouched. Existing stores are never overwritten by seeds.
Seed path may be set with `SCENARIO_CONTENT_DIR`. Invalid stored/seed content fails startup.
Limits: JSON request 1 MiB, store 1000 versions / 50 MB. Only trusted authors should have keys.

## API

All routes have `/api` prefix. Health/starter endpoints remain available.

| Method / route | Access | Body / result |
|---|---|---|
| GET `/scenarios` | public | latest public version metadata per ID |
| GET `/scenarios/:id?version=1.0.0` | public | full published or explicitly demo-only scenario; private draft always 404 |
| GET `/author/scenarios` | author | version records |
| GET `/author/scenarios/:id/:version` | author | one record |
| POST `/author/scenarios` | author | raw shared-DSL JSON → new private draft |
| POST `/author/scenarios/import` | author | same create semantics, full validation |
| PUT `/author/scenarios/:id/:version` | author | `{expectedRevision, scenario}` |
| POST `/author/scenarios/validate` | author | raw JSON object or JSON string → validation result |
| GET `/author/scenarios/:id/:version/export` | author | exact DSL JSON without record envelope |
| POST `/author/scenarios/:id/:version/fork` | author | `{expectedRevision, version}` → next private version |
| POST `/author/scenarios/:id/:version/demo` | author | `{expectedRevision, confirmDemoOnly:true}` |
| POST `/reviewer/scenarios/:id/:version/review` | reviewer | explicit human review, described below |
| POST `/reviewer/scenarios/:id/:version/publish` | reviewer | `{expectedRevision, confirmPublication:true}` |

Record: `{scenario, revision, createdAt, updatedAt}`. New versions must be numerically greater
SemVer. Both `demo` and `published` snapshots are immutable. Completed review is frozen too;
use fork to revise. Fork resets review to draft/demo-only, preserves AI provenance, resets
source verification and changes source-dependent `allowed/restricted` claims to `uncertain`.
The original public snapshot remains accessible by exact version.

Shared `validateScenario` is the acceptance gate (structure + graph + provenance).
Invalid saves/imports return 422 with `{errors:[{path,code,message}],warnings:[...]}`.
Validate returns the shared `{success,data?,errors,warnings}` result (HTTP 201 for this POST).
Malformed JSON/envelopes are 400; unknown versions 404; conflicts/immutable writes 409.
Warnings remain warnings: `SOURCE_UNVERIFIED` does not certify facts or legal applicability.

## Actual review gate

Authors may save only `draft` / `in_review` and cannot assert `expert_checked` sources or
completed review. Send a private revision to `in_review`, then the actual reviewer independently
uses the reviewer capability. The review request requires:

```text
expectedRevision, humanAttestation:true, decision:expert_approved|changes_requested,
demoOnly, aiAssisted (unchanged), reviewedAt, reviewerRole, evidenceRef,
sources (optional complete source array with factual verification metadata),
legalAssessments (optional [{nodeId, choiceId, legalStatus}])
```

Provide real review evidence and a public-safe role description; do not enter names or protected
information. No automatic reviewer, fake sign-off or normative reference is generated.
Stage 10B permits only the protected reviewer to set a definite choice legalStatus
through legalAssessments (allowed/restricted/uncertain). Unknown choices, duplicate
assessments and unsupported statuses fail with 422. The shared validator then checks
expert_checked normative evidence/relevance. Review cannot alter narrative, targets,
metrics or delayed triggers through this field. Authors submit uncertain until reviewed.
Publication separately requires `expert_approved`, `demoOnly=false`, and all sources
`expert_checked`, as enforced by the shared provenance contract. A secret cannot establish
professional qualifications: its distribution and evidence verification remain a human process.
Without that process, use only explicitly confirmed demo preview. Tests use an isolated,
clearly named synthetic human-reviewer stub, never approval of CIDS content or real law.

## Checks

```sh
pnpm --filter server typecheck
pnpm --filter server test
pnpm --filter server test:e2e
pnpm --filter server lint
```

API tests use temporary stores and cover authorization, private isolation, graph diagnostics,
import/export, optimistic concurrency, immutable versions, explicit demo/review gates and restart.
