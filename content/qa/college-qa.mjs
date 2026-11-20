// Independent path/effect oracle for three authored drafts; NOT another runtime engine.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

export const COLLEGE_IDS = ['report-under-pressure', 'fair-selection', 'quiet-after-formation'];
export const loadCollege = id => JSON.parse(fs.readFileSync(new URL(`../scenarios/${id}.json`, import.meta.url), 'utf8'));
const requireSchema = createRequire(new URL('../../packages/scenario-schema/package.json', import.meta.url));
const requireEngine = createRequire(new URL('../../packages/scenario-engine/package.json', import.meta.url));
const sorted = values => [...values].sort();

export function inspectCollege(scenario) {
  const nodes = new Map(scenario.nodes.map(node => [node.id, node]));
  assert.equal(nodes.size, scenario.nodes.length);
  const visited = new Set(); const routes = [];
  function walk(id, nodeIds, choices) {
    assert.ok(!nodeIds.includes(id), 'Cycle in authored content');
    const node = nodes.get(id); assert.ok(node, `Missing node ${id}`); visited.add(id);
    const next = [...nodeIds, id];
    if (node.type === 'narrative') walk(node.nextNodeId, next, choices);
    else if (node.type === 'decision') for (const choice of node.choices) walk(choice.nextNodeId, next, [...choices, { nodeId: id, choice }]);
    else {
      assert.equal(choices.length, 3, 'Every college path must contain exactly three decisions');
      const metrics = { transparency: 0, fairness: 0, trust: 0, effectiveness: 0 };
      const add = effects => effects.forEach(effect => { metrics[effect.metric] += effect.delta; });
      const applied = []; const unrealized = []; const delayed = [];
      choices.forEach(({ nodeId, choice }, index) => {
        add(choice.immediateEffects);
        for (const event of choice.schedule ?? []) {
          const occurs = event.trigger.type === 'after_decisions'
            ? index + event.trigger.count < choices.length
            : next.indexOf(event.trigger.nodeId) > next.indexOf(nodeId);
          (occurs ? applied : unrealized).push(event.id);
          if (occurs) add(event.effects);
          delayed.push({ id: event.id, plannedAtDecision: index + 1, trigger: event.trigger, expected: occurs ? 'applied' : 'unrealized' });
        }
      });
      const sourceIds = new Set([...next.flatMap(id => nodes.get(id).sourceIds), ...choices.flatMap(step => step.choice.sourceIds), ...node.debrief.sourceIds]);
      routes.push({ route: routes.length + 1, nodes: next, choices: choices.map(({ nodeId, choice }) => ({ nodeId, choiceId: choice.id })), ending: id,
        decisionCount: choices.length, finalMetrics: metrics, applied: sorted(applied), unrealized: sorted(unrealized), delayed, debriefSourceIds: sorted(sourceIds) });
    }
  }
  walk(scenario.startNodeId, [], []);
  assert.equal(visited.size, nodes.size, 'Unreachable node');
  return { scenarioId: scenario.id, version: scenario.version, contentCreatedAt: scenario.contentCreatedAt,
    analysis: 'Content oracle computed from route membership and authored deltas; compared with real public engine, not an application runtime.',
    nodeCount: nodes.size, choiceCount: scenario.nodes.reduce((sum, node) => sum + (node.choices?.length ?? 0), 0),
    endingCount: scenario.nodes.filter(node => node.type === 'ending').length, routeCount: routes.length,
    minDecisions: Math.min(...routes.map(route => route.decisionCount)), maxDecisions: Math.max(...routes.map(route => route.decisionCount)), routes };
}

export function assertEngineRoutes(scenario, report = inspectCollege(scenario)) {
  const engine = requireEngine('@eds/scenario-engine');
  const before = JSON.stringify(scenario);
  for (const route of report.routes) {
    const play = () => {
      let state = engine.startScenario(scenario);
      while (engine.getCurrentNode(scenario, state).type === 'narrative') state = engine.advanceNarrative(scenario, state);
      for (const step of route.choices) {
        assert.equal(state.currentNodeId, step.nodeId);
        state = engine.makeDecision(scenario, state, step.choiceId);
        while (engine.getCurrentNode(scenario, state).type === 'narrative') state = engine.advanceNarrative(scenario, state);
      }
      assert.equal(state.status, 'completed'); assert.equal(state.decisionCount, 3); assert.equal(state.currentNodeId, route.ending);
      assert.deepEqual(state.metrics, route.finalMetrics);
      assert.deepEqual(sorted(state.appliedDelayedEffectIds), route.applied);
      assert.equal(new Set(state.appliedDelayedEffectIds).size, state.appliedDelayedEffectIds.length);
      const fired = state.timeline.filter(entry => entry.kind === 'delayed').map(entry => entry.eventId);
      assert.deepEqual(sorted(fired), route.applied); // Exactly one timeline event for each applied identity.
      assert.deepEqual(sorted(state.unrealizedEffects.map(event => event.id)), route.unrealized);
      const debrief = engine.getDebrief(scenario, state);
      assert.deepEqual(sorted(debrief.sourceIds), route.debriefSourceIds);
      assert.deepEqual(debrief.finalMetrics, route.finalMetrics);
      return state;
    };
    assert.deepEqual(play(), play(), 'Non-deterministic engine result');
  }
  assert.equal(JSON.stringify(scenario), before, 'Scenario mutated during play');
}

export function validateCollegeDrafts({ writeMaps = false, log = true } = {}) {
  const schema = requireSchema('@eds/scenario-schema');
  const manifest = JSON.parse(fs.readFileSync(new URL('../scenarios/index.json', import.meta.url), 'utf8'));
  const observations = JSON.parse(fs.readFileSync(new URL('./legal-source-observations.json', import.meta.url), 'utf8'));
  const reports = COLLEGE_IDS.map(id => {
    assert.deepEqual(manifest, COLLEGE_IDS.map(id => id + '.json'), 'Only the curated, explicitly unverified demo catalog is allowed');
    const scenario = loadCollege(id);
    const result = schema.validateScenario(scenario);
    assert.equal(result.success, true, JSON.stringify(result));
    assert.deepEqual(scenario.contentReview, { status: 'draft', demoOnly: true, aiAssisted: true });
    assert.equal(scenario.publicationStatus, 'draft'); assert.equal(scenario.contentCreatedAt, '2026-11-20');
    const normative = scenario.sources.filter(source => source.sourceType === 'normative');
    assert.ok(normative.length >= 2);
    for (const source of normative) {
      assert.match(source.url, /^https:\/\/data\.rada\.gov\.ua\/ogd\/zak\/perv\/text\//);
      assert.match(source.pinpoint, /[Сс]татт/);
      assert.ok(source.documentNumber && source.documentDate && source.relevance && source.applicabilityQuestions);
      const evidence = observations.documents.find(document => document.url === source.url);
      assert.ok(evidence?.textRead && evidence.httpStatus === 200);
      assert.ok(source.verificationEvidence.includes(evidence.sha256));
      assert.equal(source.versionAsOf, null); assert.equal(source.revision, null); // No invented legal revision.
    }
    assert.ok(scenario.sources.every(source => source.verificationStatus === 'unverified' && source.verifiedAt === null));
    assert.ok(scenario.nodes.filter(node => node.type === 'decision').every(node => node.choices.every(choice => choice.legalStatus === 'uncertain')));
    const events = scenario.nodes.flatMap(node => node.choices?.flatMap(choice => choice.schedule ?? []) ?? []);
    assert.equal(events.length, 7); assert.equal(new Set(events.map(event => event.id)).size, events.length);
    assert.deepEqual(sorted(new Set(events.map(event => event.trigger.type))), ['after_decisions', 'on_enter_node']);
    const report = inspectCollege(scenario);
    assert.equal(report.nodeCount, 12); assert.equal(report.choiceCount, 14); assert.equal(report.endingCount, 4); assert.equal(report.routeCount, 8);
    assert.ok(report.routes.some(route => route.unrealized.length), 'Branch-dependent event must exercise unrealized semantics');
    assertEngineRoutes(scenario, report);
    const map = new URL(`./${id}.routes.json`, import.meta.url);
    if (writeMaps) fs.writeFileSync(map, JSON.stringify(report, null, 2) + '\n');
    else assert.deepEqual(JSON.parse(fs.readFileSync(map, 'utf8')), report, 'Authored route evidence is stale');
    if (log) console.log(`${id}: 12 nodes, 14 choices, 4 endings, 8 real-engine routes, 3..3 decisions; sources PARTIAL; curated DEMO only, NOT approved publication.`);
    return report;
  });
  if (writeMaps) {
    const lines = ['# Stage 10C — матриця всіх 24 маршрутів', '',
      'Метрики: прозорість / справедливість / довіра / ефективність. Це не моральний рейтинг. Повні node/choice IDs і triggers — у відповідних .routes.json.',
      '', 'Значення незалежного content oracle перевірені реальним public Engine. Source check PARTIAL, expert approval PENDING. Stage 10D дозволяє кураторський DEMO показ із застереженням, без expert publication; маршрути не змінено.', ''];
    for (const report of reports) {
      lines.push(`## ${report.scenarioId}`, '', '| № | Вибори (номер альтернативи) | Ending | T / F / Trust / E | Applied events | Unrealized |', '|---|---|---|---|---|---|');
      for (const route of report.routes) lines.push(`| ${route.route} | ${route.choices.map(step => step.choiceId.split('-').at(-1)).join(' → ')} | ${route.ending} | ${Object.values(route.finalMetrics).join(' / ')} | ${route.applied.join(', ')} | ${route.unrealized.join(', ') || '—'} |`);
      lines.push('');
    }
    fs.writeFileSync(new URL('./college-route-matrix.md', import.meta.url), lines.join('\n') + '\n');
  }
  return reports;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  assert.ok(process.argv.slice(2).every(arg => arg === '--write-maps'), 'Unknown argument');
  validateCollegeDrafts({ writeMaps: process.argv.includes('--write-maps') });
}
