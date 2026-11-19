// Small content-only exhaustive analysis. This is not a runtime engine or DSL validator.
import assert from 'node:assert/strict';

export function inspectRoutes(scenario) {
  const nodes = new Map(scenario.nodes.map(node => [node.id, node]));
  assert.equal(nodes.size, scenario.nodes.length, 'Duplicate node ID');
  const seen = new Set();
  const routes = [];
  const delayedIds = new Set();
  const decisions = scenario.nodes.filter(node => node.type === 'decision');
  const endings = scenario.nodes.filter(node => node.type === 'ending');
  assert.ok(endings.length >= 2, 'Content requires >=2 endings');
  for (const node of decisions) {
    assert.ok(node.choices.length >= 2, `Too few choices: ${node.id}`);
    for (const choice of node.choices) {
      assert.ok(choice.immediateEffects.length > 0, `No immediate effect: ${choice.id}`);
      assert.equal(choice.legalStatus, 'uncertain', 'No verified legal conclusion in these drafts');
      for (const event of choice.schedule ?? []) {
        assert.ok(!delayedIds.has(event.id), `Duplicate delayed ID: ${event.id}`);
        delayedIds.add(event.id);
      }
    }
  }
  function walk(id, path, choices, ancestors) {
    assert.ok(nodes.has(id), `Missing target: ${id}`);
    assert.ok(!ancestors.has(id), `Cycle: ${id}`);
    assert.ok(routes.length < 4096, 'Exhaustive content QA is limited to 4096 routes');
    const node = nodes.get(id);
    const nextPath = [...path, id];
    const nextAncestors = new Set([...ancestors, id]);
    seen.add(id);
    if (node.type === 'ending') {
      assert.ok(choices.length >= 3, `Short path: ${nextPath.join(' -> ')}`);
      const expectedDelayed = choices.flatMap((step, index) => {
        const choice = nodes.get(step.nodeId).choices.find(option => option.id === step.choiceId);
        return (choice.schedule ?? []).map(event => {
          let expectedActivation = null;
          if (event.trigger.type === 'after_decisions') {
            const subsequentDecision = choices[index + event.trigger.count];
            if (subsequentDecision) {
              expectedActivation = { phase: 'after_decision', ...subsequentDecision };
            }
          } else {
            const ownerPosition = nextPath.indexOf(step.nodeId);
            if (nextPath.slice(ownerPosition + 1).includes(event.trigger.nodeId)) {
              expectedActivation = { phase: 'on_enter_node', nodeId: event.trigger.nodeId };
            }
          }
          return { id: event.id, scheduledBy: step, trigger: event.trigger, expectedActivation };
        });
      });
      routes.push({ id: `route-${routes.length + 1}`, nodes: nextPath, choices, ending: id, decisionCount: choices.length, expectedDelayed });
    } else if (node.type === 'narrative') {
      walk(node.nextNodeId, nextPath, choices, nextAncestors);
    } else {
      for (const choice of node.choices) {
        walk(choice.nextNodeId, nextPath, [...choices, { nodeId: id, choiceId: choice.id }], nextAncestors);
      }
    }
  }
  walk(scenario.startNodeId, [], [], new Set());
  assert.equal(seen.size, nodes.size, 'Unreachable nodes exist');
  assert.equal(new Set(routes.map(route => route.ending)).size, endings.length, 'Ending without route');
  assert.ok(delayedIds.size > 0, 'No delayed events');
  const triggerTypes = new Set();
  for (const id of delayedIds) {
    const occurrences = routes.flatMap(route => route.expectedDelayed.filter(event => event.id === id));
    assert.ok(occurrences.some(event => event.expectedActivation), `Impossible trigger: ${id}`);
    // These two cases intentionally avoid branch-dependent unrealized events.
    assert.ok(occurrences.every(event => event.expectedActivation), `Undocumented unrealized event: ${id}`);
    occurrences.forEach(event => triggerTypes.add(event.trigger.type));
  }
  assert.deepEqual([...triggerTypes].sort(), ['after_decisions', 'on_enter_node']);
  assert.ok(routes.every(route => route.expectedDelayed.some(event => event.expectedActivation)), 'A route has no delayed consequence');
  assert.equal(scenario.publicationStatus, 'draft');
  assert.deepEqual(scenario.contentReview, { status: 'draft', demoOnly: true, aiAssisted: true });
  assert.ok(scenario.sources.every(source => source.verificationStatus === 'unverified' && source.verifiedAt === null));
  return {
    scenarioId: scenario.id,
    version: scenario.version,
    analysis: 'Static path evidence only; no engine execution and no substitute for validateScenario.',
    nodeCount: nodes.size,
    narrativeCount: scenario.nodes.filter(node => node.type === 'narrative').length,
    decisionNodeCount: decisions.length,
    choiceCount: decisions.reduce((sum, node) => sum + node.choices.length, 0),
    endingCount: endings.length,
    routeCount: routes.length,
    minDecisions: Math.min(...routes.map(route => route.decisionCount)),
    maxDecisions: Math.max(...routes.map(route => route.decisionCount)),
    delayedEventCount: delayedIds.size,
    routes,
  };
}
