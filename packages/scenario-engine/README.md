# @eds/scenario-engine

Framework independent deterministic runtime for validated Scenario DSL v1 data.
It uses only `@eds/scenario-schema` and has no IO, clock, random, network or global
mutable state.

## API

```ts
startScenario(scenario: Scenario): SimulationState
getCurrentNode(scenario: Scenario, state: SimulationState): ScenarioNode
getAvailableOptions(scenario: Scenario, state: SimulationState): Choice[]
makeDecision(scenario: Scenario, state: SimulationState, choiceId: string): SimulationState
advanceNarrative(scenario: Scenario, state: SimulationState): SimulationState
getDebrief(scenario: Scenario, state: SimulationState): ScenarioDebrief
```

`startScenario` runs full schema and graph validation. Callers loading scenarios
from any external source must preserve that validated scenario unchanged for the
run; subsequent pure steps check scenario identity/version, JSON serializability,
current node/status, decision count, integer metrics and consistency of pending,
applied and unrealized event IDs and check delayed payloads against their authored
schedule. They do not repeat full structural, provenance and delayed-reachability
validation or prove the authenticity of a fabricated decision history.
`SimulationState` is plain JSON data and may be serialized between steps.

The initial metrics are 0 for transparency, fairness, trust and effectiveness.
Authored integer deltas are summed without clamping. They describe modeled
learning consequences, not a learner's ethical quality or personal score.

Narrative nodes are explicit: `advanceNarrative` moves to the sole next node;
they do not increment `decisionCount`. Entering a node is processed in the
transition that reaches it, before it is returned or rendered.

## Event order

For each decision: add immediate deltas; record the decision and explanations;
enqueue its delayed effects with due count `decisionCount + count`; apply due
`after_decisions` events; enter the target node and apply matching
`on_enter_node` events; then mark an ending completed. Events within each due
phase run in queue insertion order, with ID as a stable tie-break. This permits a
newly scheduled event to fire on the direct target arrival. Applied event IDs live
in the state, so serialization/resumption and repeated reads cannot apply them
again. At ending, remaining events move to `unrealizedEffects` and are discarded
from the pending queue; they are never forced.

Debrief returns the authored ending debrief, decision history, actually applied
effects and explanations, final metrics, reflection prompts, values, referenced
source IDs and unrealized events. It does not infer legal conclusions.

## Build and use

Separate ESM and CommonJS output and declarations are selected through conditional
exports, matching `@eds/scenario-schema`. The package contains no framework imports.
