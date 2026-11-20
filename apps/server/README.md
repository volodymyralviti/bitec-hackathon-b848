# Server

NestJS 11 / Express / CommonJS. Stage 06 adds versioned Scenario API and protected Studio storage.
See the [root README](../../README.md) for Node 22.22.3 / pnpm 10 setup.

Stage 07 also provides an in-memory Socket.IO classroom, separate from Studio persistence.
See [Classroom protocol, privacy and tests](src/classroom/README.md). No participant data is
written to the scenario store. Author/reviewer capabilities do not control classroom rooms.

## Run and access

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

On first start only, the explicit `content/scenarios/index.json` seeds the two demo-only cases.
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
sources (optional complete source array with factual verification metadata)
```

Provide real review evidence and a public-safe role description; do not enter names or protected
information. No automatic reviewer, fake sign-off or normative reference is generated.
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
