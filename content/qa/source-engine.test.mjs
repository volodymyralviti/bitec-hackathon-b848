import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const requireEngine = createRequire(new URL('../../packages/scenario-engine/package.json', import.meta.url));
const { startScenario, advanceNarrative, makeDecision, getCurrentNode, getDebrief } = requireEngine('@eds/scenario-engine');

for (const name of ['urgent-supply', 'truth-under-pressure']) test(`${name}: all 8 engine routes unchanged by optional source metadata`, () => {
  const scenario = JSON.parse(readFileSync(new URL(`../scenarios/${name}.json`, import.meta.url), 'utf8'));
  const enriched = structuredClone(scenario);
  enriched.sources.forEach(source => { source.relevance = 'Тестове пояснення; статус перевірки незмінний.'; source.expertReviewRequired = true; });
  let routes = 0;
  const visit = (state, other) => {
    assert.deepEqual(other, state);
    const node = getCurrentNode(scenario, state);
    if (node.type === 'ending') {
      assert.equal(state.decisionCount, 3);
      assert.deepEqual(getDebrief(enriched, other), getDebrief(scenario, state));
      routes++; return;
    }
    if (node.type === 'narrative') visit(advanceNarrative(scenario, state), advanceNarrative(enriched, other));
    else for (const choice of node.choices) visit(makeDecision(scenario, state, choice.id), makeDecision(enriched, other, choice.id));
  };
  visit(startScenario(scenario), startScenario(enriched));
  assert.equal(routes, 8);
});
