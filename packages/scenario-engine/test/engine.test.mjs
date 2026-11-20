import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { startScenario, makeDecision, getCurrentNode, getAvailableOptions, getDebrief, advanceNarrative, UnknownChoiceError, ChoiceFromDifferentNodeError, CompletedScenarioError, NarrativeDecisionError, InvalidScenarioError, InvalidStateError, ScenarioVersionMismatchError } from '../dist/esm/index.js';
const fixture = JSON.parse(await readFile(new URL('../../scenario-schema/test/fixtures/valid.json', import.meta.url), 'utf8'));
const fresh = () => structuredClone(fixture);
const deepFreeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(deepFreeze); Object.freeze(value); } return value; };
const pick = (scenario, state, index = 0) => {
  while (getCurrentNode(scenario, state).type === 'narrative') state = advanceNarrative(scenario, state);
  return makeDecision(scenario, state, getAvailableOptions(scenario, state)[index].id);
};

test('full three-decision route completes and returns authored debrief', () => {
  const scenario = fresh(); let state = startScenario(scenario);
  assert.equal(state.scenarioVersion, scenario.version); assert.match(state.scenarioVersion, /^\d+\.\d+\.\d+$/);
  state = pick(scenario, state); state = pick(scenario, state); state = pick(scenario, state);
  assert.equal(state.decisionCount, 3); assert.equal(state.status, 'completed'); assert.equal(getCurrentNode(scenario, state).type, 'ending');
  assert.equal(getDebrief(scenario, state).decisions.length, 3); assert.throws(() => makeDecision(scenario, state, 'option-1'), CompletedScenarioError);
});
test('branch routes diverge and immediate effects are recorded once', () => {
  const s = fresh();
  s.nodes.find(n => n.id === 'd2a').choices[0].immediateEffects[0] = { metric: 'fairness', delta: 3, explanation: 'route A' };
  s.nodes.find(n => n.id === 'd2b').choices[0].immediateEffects[0] = { metric: 'fairness', delta: -2, explanation: 'route B' };
  const initial = startScenario(s), left = pick(s, initial), right = pick(s, initial, 1);
  assert.notEqual(left.currentNodeId, right.currentNodeId); assert.equal(left.metrics.trust, 1);
  assert.equal(left.timeline.filter(x => x.kind === 'immediate').length, 1); assert.equal(initial.decisionCount, 0);
  let routeA = pick(s, left); routeA = pick(s, routeA); let routeB = pick(s, right); routeB = pick(s, routeB, 1);
  assert.equal(routeA.status, 'completed'); assert.equal(routeB.status, 'completed');
  assert.notEqual(routeA.currentNodeId, routeB.currentNodeId); assert.equal(routeA.metrics.fairness, 3); assert.equal(routeB.metrics.fairness, -2);
});
test('after_decisions excludes scheduling choice and survives JSON resumption', () => {
  const s = fresh(); s.nodes.find(n => n.id === 'd1').choices[0].schedule = [{ id: 'counter-two', trigger: { type: 'after_decisions', count: 2 }, effects: [{ metric: 'fairness', delta: 4, explanation: 'counter' }], consequenceText: 'applied' }];
  let state = pick(s, startScenario(s)); assert.equal(state.pendingEffects.length, 1);
  const beforeReads = JSON.stringify(state); getCurrentNode(s, state); getAvailableOptions(s, state); getCurrentNode(s, state); assert.equal(JSON.stringify(state), beforeReads);
  state = pick(s, state); assert.equal(state.metrics.fairness, 0); state = JSON.parse(JSON.stringify(state)); state = pick(s, state);
  assert.equal(state.metrics.fairness, 4); assert.deepEqual(state.appliedDelayedEffectIds, ['counter-two']); assert.equal(state.timeline.filter(x => x.eventId === 'counter-two').length, 1);
  assert.equal(state.timeline.find(x => x.eventId === 'counter-two').ownerNodeId, 'd1');
});
test('after one subsequent decision fires on that decision; ending preserves no pending work', () => {
  const s = fresh(); s.nodes.find(n => n.id === 'd1').choices[0].schedule = [{ id: 'counter-one', trigger: { type: 'after_decisions', count: 1 }, effects: [{ metric: 'fairness', delta: 2, explanation: 'one later decision' }], consequenceText: 'one later decision' }];
  let state = pick(s, startScenario(s)); assert.equal(state.metrics.fairness, 0);
  state = pick(s, state); assert.equal(state.metrics.fairness, 2); assert.equal(state.appliedDelayedEffectIds[0], 'counter-one');
});
test('counter effects run before ending node-entry effects on the same transition', () => {
  const s = fresh();
  s.nodes.find(n => n.id === 'd1').choices[0].schedule = [{ id: 'entry-ending', trigger: { type: 'on_enter_node', nodeId: 'end-a' }, effects: [{ metric: 'trust', delta: 2, explanation: 'entry' }], consequenceText: 'ending entry' }];
  s.nodes.find(n => n.id === 'd2a').choices[0].schedule = [{ id: 'counter-ending', trigger: { type: 'after_decisions', count: 1 }, effects: [{ metric: 'fairness', delta: 3, explanation: 'counter' }], consequenceText: 'counter first' }];
  let state = pick(s, startScenario(s)); state = pick(s, state); state = pick(s, state);
  assert.equal(state.status, 'completed'); assert.deepEqual(state.timeline.filter(item => item.kind === 'delayed').map(item => item.eventId), ['counter-ending', 'entry-ending']);
  assert.equal(state.metrics.fairness, 3); assert.equal(state.metrics.trust, 5);
});
test('on_enter event applies before observing its immediate target', () => {
  const s = fresh(), d1 = s.nodes.find(n => n.id === 'd1'), target = d1.choices[0].nextNodeId;
  d1.choices[0].schedule = [{ id: 'entry', trigger: { type: 'on_enter_node', nodeId: target }, effects: [{ metric: 'transparency', delta: 2, explanation: 'entry' }], consequenceText: 'arrived' }];
  const state = pick(s, startScenario(s)); assert.equal(state.currentNodeId, target); assert.equal(state.metrics.transparency, 2); assert.equal(state.timeline.at(-1).eventId, 'entry');
  assert.equal(getCurrentNode(s, state).type, 'decision');
  assert.deepEqual(state.timeline.slice(-3).map(entry => entry.kind), ['immediate', 'decision', 'delayed']);
});
test('on_enter fires on a later narrative arrival before that narrative is returned', () => {
  const s = fresh(), d1 = s.nodes.find(n => n.id === 'd1'), d2a = s.nodes.find(n => n.id === 'd2a');
  d2a.choices.forEach(choice => { choice.nextNodeId = 'mid-text'; });
  s.nodes.push({ id: 'mid-text', type: 'narrative', title: 'Перехід', narrative: 'Авторський текст.', sourceIds: [], nextNodeId: 'd3' });
  d1.choices[0].schedule = [{ id: 'narrative-entry', trigger: { type: 'on_enter_node', nodeId: 'mid-text' }, effects: [{ metric: 'transparency', delta: 1, explanation: 'narrative entry' }], consequenceText: 'narrative entry' }];
  let state = pick(s, startScenario(s)); state = pick(s, state);
  assert.equal(getCurrentNode(s, state).id, 'mid-text'); assert.equal(state.metrics.transparency, 1);
  assert.equal(getCurrentNode(s, state).type, 'narrative');
});
test('simultaneous delayed events retain insertion order and ending discards pending', () => {
  const s = fresh(), d1 = s.nodes.find(n => n.id === 'd1'), target = d1.choices[0].nextNodeId;
  d1.choices[0].schedule = [1, 2].map(i => ({ id: `ordered-${i}`, trigger: { type: 'on_enter_node', nodeId: target }, effects: [{ metric: 'trust', delta: i, explanation: `${i}` }], consequenceText: `event ${i}` }));
  let state = pick(s, startScenario(s)); assert.deepEqual(state.timeline.filter(x => x.kind === 'delayed').map(x => x.eventId), ['ordered-1', 'ordered-2']);
  // An ending arrival with an event aimed at that ending executes before completion.
  const d3 = s.nodes.find(n => n.id === 'd3'); d3.choices[0].schedule = [{ id: 'ending-entry', trigger: { type: 'on_enter_node', nodeId: d3.choices[0].nextNodeId }, effects: [{ metric: 'effectiveness', delta: 3, explanation: 'final' }], consequenceText: 'final event' }];
  state = pick(s, state); state = pick(s, state); assert.equal(state.status, 'completed'); assert.equal(state.metrics.effectiveness, 3);
  assert.ok(state.appliedDelayedEffectIds.includes('ending-entry')); assert.equal(state.timeline.at(-1).eventId, 'ending-entry');
  assert.equal(getCurrentNode(s, state).type, 'ending');
  const discardScenario = fresh(), first = discardScenario.nodes.find(n => n.id === 'd1');
  first.choices[0].schedule = [{ id: 'other-ending', trigger: { type: 'on_enter_node', nodeId: 'end-a' }, effects: [{ metric: 'trust', delta: 8, explanation: 'alternate end' }], consequenceText: 'alternate end only' }];
  let discarded = pick(discardScenario, startScenario(discardScenario)); discarded = pick(discardScenario, discarded); discarded = pick(discardScenario, discarded, 1);
  assert.equal(discarded.status, 'completed'); assert.equal(discarded.pendingEffects.length, 0);
  assert.ok(discarded.unrealizedEffects.some(event => event.id === 'other-ending'));
  const debrief = getDebrief(discardScenario, discarded);
  assert.ok(debrief.unrealizedEffects.some(event => event.id === 'other-ending'));
  assert.ok(!debrief.appliedEffects.some(effect => effect.eventId === 'other-ending'));
  assert.equal(discarded.metrics.trust, 3);
});
test('frozen inputs are not mutated; repeats deterministic and runs isolated', () => {
  const s = deepFreeze(fresh()), st = deepFreeze(startScenario(s));
  const frozenTransition = makeDecision(s, advanceNarrative(s, st), 'option-1');
  const a = pick(fixture, startScenario(fixture)), b = pick(fixture, startScenario(fixture));
  assert.deepEqual(a, b); assert.equal(frozenTransition.decisionCount, 1); assert.equal(startScenario(fixture).metrics.trust, 0);
});
test('narrative advances without counting as a decision; wrong choices use typed errors', () => {
  const st = startScenario(fixture); assert.throws(() => makeDecision(fixture, st, 'x'), NarrativeDecisionError);
  const advanced = advanceNarrative(fixture, st); assert.equal(advanced.decisionCount, 0); assert.equal(advanced.currentNodeId, 'd1');
  const atD1 = advanceNarrative(fixture, startScenario(fixture));
  assert.throws(() => makeDecision(fixture, atD1, 'missing'), UnknownChoiceError);
  const other = fresh(); other.nodes.find(n => n.id === 'd2a').choices[0].id = 'elsewhere-only';
  const atFirst = advanceNarrative(other, startScenario(other));
  assert.throws(() => makeDecision(other, atFirst, 'elsewhere-only'), ChoiceFromDifferentNodeError);
});
test('debrief read does not mutate completed state', () => {
  const s = fresh(); let state = startScenario(s); for (let i = 0; i < 3; i++) state = pick(s, state);
  const before = JSON.stringify(state), report = getDebrief(s, state); assert.equal(JSON.stringify(state), before); assert.equal(report.finalMetrics.trust, state.metrics.trust);
});
test('invalid scenario, invalid state and version mismatch are reported without changing inputs', () => {
  const s = fresh(), invalid = { ...s, startNodeId: 'missing' };
  assert.throws(() => startScenario(invalid), InvalidScenarioError);
  const state = startScenario(s), before = JSON.stringify(state);
  assert.throws(() => getCurrentNode(s, { ...state, currentNodeId: 'absent' }), InvalidStateError);
  assert.throws(() => getCurrentNode(s, { ...state, metrics: { ...state.metrics, trust: Number.NaN } }), InvalidStateError);
  assert.throws(() => getCurrentNode(s, { ...state, decisionCount: -1 }), InvalidStateError);
  assert.throws(() => getCurrentNode(s, { ...state, status: 'completed' }), InvalidStateError);
  assert.throws(() => getCurrentNode({ ...s, id: 'other-scenario' }, state), InvalidStateError);
  const cyclic = { ...state, timeline: [] }; cyclic.timeline.push(cyclic);
  assert.throws(() => getCurrentNode(s, cyclic), InvalidStateError);
  const conflict = pick(s, state), event = { id: 'x', trigger: { type: 'on_enter_node', nodeId: 'd3' }, effects: [{ metric: 'fairness', delta: 1, explanation: 'x' }], consequenceText: 'x', ownerNodeId: 'd1', choiceId: 'option-1', plannedAtDecision: 1, sequence: 0 };
  assert.throws(() => getCurrentNode(s, { ...conflict, pendingEffects: [event], appliedDelayedEffectIds: ['x'] }), InvalidStateError);
  const scheduled = fresh(); scheduled.nodes.find(n => n.id === 'd1').choices[0].schedule = [{ id: 'authored', trigger: { type: 'after_decisions', count: 2 }, effects: [{ metric: 'trust', delta: 1, explanation: 'authored effect' }], consequenceText: 'authored text' }];
  const pending = pick(scheduled, startScenario(scheduled));
  const changedPayload = { ...pending, pendingEffects: pending.pendingEffects.map(item => ({ ...item, effects: [{ ...item.effects[0], delta: 10 }] })) };
  assert.throws(() => getCurrentNode(scheduled, changedPayload), InvalidStateError);
  const applied = JSON.parse(JSON.stringify(pick(scheduled, pick(scheduled, pending))));
  assert.throws(() => getCurrentNode(scheduled, { ...applied, appliedDelayedEffectIds: [] }), InvalidStateError);
  assert.throws(() => getCurrentNode({ ...s, version: '2.0.0' }, state), ScenarioVersionMismatchError);
  assert.equal(JSON.stringify(state), before);
});

test('node and option getters return detached copies', () => {
  const scenario = fresh(), state = advanceNarrative(scenario, startScenario(scenario));
  const node = getCurrentNode(scenario, state); node.title = 'caller edit';
  const options = getAvailableOptions(scenario, state); options[0].label = 'caller edit'; options[0].immediateEffects[0].delta = 99;
  assert.notEqual(getCurrentNode(scenario, state).title, 'caller edit');
  assert.notEqual(getAvailableOptions(scenario, state)[0].label, 'caller edit');
  assert.equal(state.metrics.trust, 0);
});
