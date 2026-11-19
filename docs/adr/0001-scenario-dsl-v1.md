# ADR 0001: Scenario DSL v1 and package boundary

Status: proposed contract implemented in Stage 02; pending architectural review.

## Context

Angular 21 bundles ESM; NestJS 11 remains CommonJS. We need one JSON contract usable
by both without implementing a simulator or exposing draft authoring APIs.
Earlier EDS descriptions mention event nodes/conditions; current scope requires
narrative, decision and ending nodes. Those three kinds are implemented; executable
conditions and event nodes are deferred. The old DSL was a proposal, not existing code.

## Decision

- Keep `schemaVersion: "1"`, `language: "uk"`, `startNodeId` from the proposal.
  Content `version` is numeric SemVer; package `0.1.0` versions code independently.
  Breaking wire semantics require a new schemaVersion, never silent reinterpretation.
- Narrative has one unconditional transition, decision >=2 choices, ending no edge.
  The entire graph is an acyclic reachable graph; every reachable node can end.
  Every complete path has >=3 decisions, checked by topological shortest-path DP.
- Indicators are four authored dimensions (transparency, fairness, trust,
  effectiveness), integer deltas [-10,10], proposed initial 0, additive, no hidden
  clamp or person score. No conditional alternatives in v1.
- Delayed events belong to choices; global scenario-unique IDs plus scenario/version
  identify pending/applied events. after_decisions excludes the scheduling decision;
  on_enter_node applies before rendering the future arrival, including an ending.
  Due counters precede node-entry effects, each phase uses queue insertion order.
  Unreached effects are discarded at ending and shown as unrealized, never forced.
  Impossible triggers fail; branch-dependent triggers warn. Stage 03 must implement
  immutable serializable applied-ID guards for exactly-once transitions.
- Ending contains explanatory debrief and sources. Source versions/check dates are
  explicit nullable fields, never fabricated. Separate publication and review states;
  completed review requires timestamp, role and evidence reference, without names.
  Shape/consistency validation cannot authenticate people or verify legal validity.
- Zod 4 is the single schema/type source and generates structural JSON Schema.
  Semantic graph and provenance rules remain deterministic TypeScript checks.
- Compile ESM and CJS separately, with conditional code AND declaration exports.
  A single CJS export was simpler but would burden Angular bundling; source aliases
  were rejected because editor resolution would not establish runtime compatibility.

## Consequences and verification

No engine, production scenarios or UI features. Final contract and limits are in
`packages/scenario-schema/README.md`; executable truth is `src/schema.ts` and validators.
All fixtures are synthetic demo drafts with aiAssisted=true and unverified sources.
Small routes are independently enumerated in tests; a 2^60-path DAG checks scaling;
negative tests cover topology, delayed events, sources, review, determinism and frozen
input. Angular separately bundles the public ESM import and executes it in Karma;
Nest executes the public CJS import. Both resolve built declarations, no TS aliases.
Catalog uniqueness, authenticity of review evidence, legal applicability and runtime
application of effects remain responsibilities of later explicitly approved stages.
