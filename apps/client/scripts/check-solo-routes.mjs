import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startScenario, getCurrentNode, getAvailableOptions, advanceNarrative, makeDecision, getDebrief } from '@eds/scenario-engine';

let total = 0;
for (const id of ['urgent-supply', 'truth-under-pressure']) {
  const scenario = JSON.parse(readFileSync(new URL(`../../../content/scenarios/${id}.json`, import.meta.url), 'utf8'));
  const map = JSON.parse(readFileSync(new URL(`../../../content/qa/${id}.routes.json`, import.meta.url), 'utf8'));
  const endings = new Set();
  let example;
  for (const route of map.routes) {
    let state = startScenario(scenario);
    for (const step of route.choices) {
      while (getCurrentNode(scenario, state).type === 'narrative') state = advanceNarrative(scenario, state);
      assert.equal(state.currentNodeId, step.nodeId);
      assert.ok(getAvailableOptions(scenario, state).some(choice => choice.id === step.choiceId));
      state = makeDecision(scenario, state, step.choiceId);
    }
    assert.equal(state.status, 'completed');
    assert.equal(state.decisionCount, 3);
    assert.equal(state.currentNodeId, route.ending);
    assert.equal(state.pendingEffects.length, 0);
    assert.equal(state.unrealizedEffects.length, 0);
    assert.equal(new Set(state.appliedDelayedEffectIds).size, state.appliedDelayedEffectIds.length);
    assert.deepEqual([...state.appliedDelayedEffectIds].sort(), route.expectedDelayed.map(event => event.id).sort());
    for (const expected of route.expectedDelayed) {
      const actual = state.timeline.find(entry => entry.eventId === expected.id);
      assert.ok(actual, `Missing event ${expected.id}`);
      if (expected.expectedActivation.phase === 'on_enter_node') assert.equal(actual.nodeId, expected.expectedActivation.nodeId);
      else assert.equal(actual.decisionNumber, route.choices.findIndex(step => step.nodeId === expected.expectedActivation.nodeId) + 1);
    }
    const report = getDebrief(scenario, state);
    assert.deepEqual(report.finalMetrics, state.metrics);
    assert.equal(report.decisions.length, 3);
    endings.add(report.endingNodeId);
    example ??= { choices: report.decisions.map(step => step.choiceId), ending: report.endingNodeId, metrics: report.finalMetrics, delayed: report.appliedEffects.filter(entry => entry.kind === 'delayed') };
    total++;
  }
  assert.equal(endings.size, 4);
  console.log(JSON.stringify({ scenario: id, routes: map.routes.length, decisionsPerRoute: 3, endings: endings.size, example }, null, 2));
}
assert.equal(total, 16);
console.log('PASS: all 16 real content routes execute through the public engine; no authored content was modified.');
