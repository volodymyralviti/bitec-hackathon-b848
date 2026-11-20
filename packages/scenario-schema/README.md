# @eds/scenario-schema — DSL v1

Independent JSON contract and deterministic validator. No Angular, NestJS, I/O,
database, simulation runtime, learner records or AI provider in library code.
Zod 4.6.6 is the only runtime dependency. Package version: `0.1.0`; wire format:
`schemaVersion: "1"`. Test fixtures are synthetic, demo-only and unreviewed.

## Stage 10B — optional legal metadata

Optional source fields: documentType
(law/code/statute/order/procedure/ethics/methodology/judgment/other), documentNumber,
relevance, applicabilityQuestions, verificationEvidence, expertReviewRequired,
court, caseNumber, legalPosition; optional choice legalQuestions and scenario
contentCreatedAt (ISO date of this version). Existing JSON is valid unchanged;
ESM/CJS exports remain unchanged. See [ADR 0002](../../docs/adr/0002-legal-source-metadata.md).
New diagnostics may carry ERROR/WARNING/INFO; INFO remains in warnings.
Incomplete unverified legal drafts warn; contradictory dates/classification fail.
Checked normative sources need evidence. Definite legalStatus requires expert_checked
normative references with evidence/relevance. Publication needs full normative
metadata and human review; expertReviewRequired=false cannot waive it.
Validation never authenticates reviewers, fetches URLs or gives legal advice.

## Usage

```ts
import { validateScenarioJson, type Scenario } from '@eds/scenario-schema';

const result = validateScenarioJson(jsonText);
if (result.success) {
  const scenario: Scenario = result.data;
  // Valid structure/graph; not proof of human approval or legal accuracy.
} else {
  // result.errors: { code, path: (string | number)[], message, nodeId? }[]
}
// Always preserve result.warnings, especially SOURCE_UNVERIFIED.
```

Exports: `ScenarioSchema` and constituent Zod schemas/types,
`validateScenarioStructure(unknown)`, `validateScenario(unknown)`,
`validateScenarioJson(string)`, `validateScenarioGraph(Scenario)`, `SCHEMA_VERSION`,
`LIMITS`, diagnostic types. Structure-only validation / Zod `safeParse` is **not**
semantic validation. The direct graph API assumes structurally valid input;
external input should always use `validateScenario` or `validateScenarioJson`.

Every result has `success`, `errors`, `warnings`; only success has `data`.
Errors prevent use; warnings do not. Messages are Ukrainian, codes stable, paths
are array indexes/property names fit for future Studio. Safe structural failures
are collected together; graph checks run only after structural success. The
validator never mutates inputs and has no time-dependent checks.

## Data model

All objects are strict: unknown properties are rejected. No conditions, scripts,
expressions, event nodes, random parameters or arbitrary effect targets in v1.
IDs are 1–80 ASCII alphanumeric/underscore/hyphen characters, starting alphanumeric.
Titles/choice labels are at most 300 characters; longer text is at most 6000.

| Scope | Required fields |
|---|---|
| Scenario | `schemaVersion`, `id`, `version`, `language`, `title`, `summary`, `basedOn`, `publicationStatus`, `contentReview`, `startNodeId`, `sources`, `nodes` |
| All nodes | `id`, `type`, `title`, `narrative`, `sourceIds`; optional `context` |
| narrative | One unconditional `nextNodeId`; does not count as a decision |
| decision | `valuesInTension` (2+), `choices` (2–16) |
| ending | `debrief`; no outgoing transition |
| Choice | `id`, `label`, `explanation`, `nextNodeId`, `immediateEffects`, `sourceIds`; optional `schedule`, `legalStatus` |
| Effect | `metric`, integer `delta` in [-10, 10], `explanation` |
| DelayedEffect | `id`, `trigger`, `effects`, `consequenceText`; nested in its owning choice |
| Debrief | `summary`, `shortTerm`, `longTerm`, `perspectives` (1+), `trustAndReputation`, `valuesInTension` (2+), `reflectionQuestions` (1+), `sourceIds` (1+), `limitations` |

`language` is exactly `uk`. `version` uses numeric `major.minor.patch` without
leading zeros, prerelease or build suffixes. `basedOn` may be an empty list.
`publicationStatus`: `draft | demo | published`.
Node IDs and source IDs are unique within a scenario; choice IDs within a decision;
delayed IDs across the scenario. A catalog must enforce scenario ID/version
uniqueness separately, because this validator accepts one scenario at a time.

Metrics: `transparency`, `fairness`, `trust`, `effectiveness`. They describe authored
consequences, never a person's character or a scientific score. Proposed Stage 03
baseline is 0 per metric, with additive integer deltas and no implicit clamping,
percentages or combined moral grade. Runtime implementation is outside this package.

## Graph validation

Every node must be reachable from `startNodeId`; every reachable node must have a
route to an ending. Cycles are rejected even in disconnected components. All
complete entry-to-ending paths must contain at least three decision nodes.
Three total decision nodes alone do not satisfy this rule.

Indexes/forward/reverse edges, iterative reachability, Kahn topological sorting
and shortest decision-count DP cost O(V + E). Every ending's minimum count must
be >=3. Reverse DP finds minimum/maximum remaining decisions for delayed counters.
Delayed node reachability is cached by target/start: worst-case O(V(V + E) + D)
time and O(V² + E + D) memory, with V<=512, <=16 choices/node, <=128 sources,
D<=1024 delayed effects. No path enumeration occurs in production code.
The test suite independently enumerates the small fixture and validates a merging
DAG with 2^60 possible choice paths.

## Delayed effects: Stage 03 contract, not an engine

- `trigger: {type: "after_decisions", count: N}`: N>=1 subsequent decisions,
  excluding the choice that schedules it. Store dueCount=currentCount+N after
  counting the scheduling decision.
- `trigger: {type: "on_enter_node", nodeId}`: first future arrival at that node,
  including the immediate next node or an ending. Must be reachable after this
  choice's own `nextNodeId`, not just somewhere from the scenario entry.
- Transition order: apply immediate effects; increment decision count; enqueue
  effects from this choice; apply due counter effects; arrive at target; apply
  node-entry effects; render or advance narrative nodes. Narrative nodes never
  increment decision count. Preserve queue insertion order within each trigger phase.
- Identity is `(scenario.id, scenario.version, delayed.id)`; pending entries must
  also retain owning node ID and choice ID. Stage 03 must persist applied identities
  in serializable immutable state and guard them before applying effects exactly once.
- At an ending, apply due counters and matching entry triggers first. Discard all
  remaining pending effects without applying deltas; debrief must distinguish
  unreached effects from effects actually experienced. No forced execution at end.
- A trigger impossible on every continuation is an error. One possible on only
  some complete continuations gives `DELAYED_MAY_NOT_FIRE`; early-ending routes
  follow the discard policy. Structural checks reject invalid counts/targets.

## Sources and human review

Source required fields: `sourceId`, `title`, `sourceType`, `versionAsOf`, `revision`,
`verificationStatus`, `verifiedAt`. Optional: `issuer`, HTTP(S) `url`, `fileCitation`,
`documentDate`, `pinpoint`. Source type: `methodology | normative | editorial`.
Verification: `unverified | team_checked | expert_checked`.
`versionAsOf`/`verifiedAt` are ISO dates or explicit null; `revision` is text or null.
Unknown dates must not be invented. Every source reference must resolve.

Unverified sources produce a warning and have `verifiedAt=null`. Verified sources
require a locator, checked date, and revision or version date. Verified normative
sources additionally require issuer, pinpoint and version date. Definite choice
`legalStatus: allowed | restricted` requires a referenced verified normative source;
otherwise use `uncertain` or omit the optional field. Metadata cannot prove a claim.

Review required fields: `status`, `demoOnly`, `aiAssisted`. Review status:
`draft | in_review | expert_approved | changes_requested`.
`expert_approved`/`changes_requested` require `reviewedAt` (ISO timestamp),
`reviewerRole`, `evidenceRef`; draft/in_review must not claim completed review.
Demo publication requires `demoOnly=true`. Production publication requires
`expert_approved`, `demoOnly=false` and all sources `expert_checked`, plus complete
metadata. This checks consistency, **not authenticity** of a reviewer or approval.
Stage 06 must enforce protected review controls and verify actual evidence.
No test fixture claims expert approval. `aiAssisted` is mandatory, never inferred.

## Modules, build and tests

```sh
pnpm --filter @eds/scenario-schema build
pnpm --filter @eds/scenario-schema test
pnpm --filter @eds/scenario-schema lint
pnpm build
pnpm typecheck
pnpm test
pnpm lint
```

ESM: `dist/esm/index.js` + declarations. CommonJS: `dist/cjs/index.js` + declarations
and local `type: commonjs`. Conditional `exports` select matching code/types;
internal source subpaths are intentionally not exported. Both builds use tsc 5.9.3.
No source aliases or runtime TS loader. `skipLibCheck` only skips external Zod
declaration checks (its URL overloads need platform ambient types); our source is
strictly checked with ES2022 only, and both consumers provide actual platform types.

`@eds/scenario-schema/scenario.schema.json` is generated by native Zod 4 conversion
as draft 2020-12. It captures structure, not graph/provenance consistency checks.
The generated file lives in ignored `dist`, reproducibly regenerated by build.

Node tests import compiled ESM and CJS. Angular has a separate esbuild smoke entry
and a browser unit smoke test; Nest unit smoke resolves CommonJS and inferred
declarations. The apps depend on the package only for these development checks.
No simulator runtime feature was added. Root typecheck first builds the dependency;
recursive build/test respect workspace dependency order.

Full JSON examples: [minimal](test/fixtures/minimal.json),
[branching with both triggers](test/fixtures/valid.json). Fixture generator is
`node packages/scenario-schema/test/fixtures/generate.mjs` from the repo root.
JSON input is limited to 1,000,000 characters; object input accepts only bounded
plain JSON trees (no shared/cyclic references, accessors, functions or nonfinite
numbers). Size checks supplement, not replace, future transport upload limits.
