import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import { inspectRoutes } from './routes.mjs';

const load = name => JSON.parse(readFileSync(new URL(`../scenarios/${name}.json`, import.meta.url), 'utf8'));
const requireSchema = createRequire(new URL('../../packages/scenario-schema/package.json', import.meta.url));
const api = () => requireSchema('@eds/scenario-schema');

for (const name of ['urgent-supply', 'truth-under-pressure']) {
  test(`${name}: every route and delayed trigger has documented evidence`, () => {
    const scenario = load(name);
    const report = inspectRoutes(scenario);
    const documented = JSON.parse(readFileSync(new URL(`./${name}.routes.json`, import.meta.url), 'utf8'));
    assert.deepEqual(report, documented);
    assert.equal(report.routeCount, 8);
    assert.equal(report.minDecisions, 3);
    assert.equal(report.maxDecisions, 3);
    assert.equal(report.endingCount, 4);
  });

  test(`${name}: public validateScenario is the primary acceptance gate`, () => {
    const validator = api(); // Missing build is a failure, never a silent skip.
    const result = validator.validateScenario(load(name));
    assert.equal(result.success, true, JSON.stringify(result));
    assert.ok(result.warnings.every(warning => warning.code === 'SOURCE_UNVERIFIED'));
    assert.equal(result.warnings.length, 3);
    assert.deepEqual(validator.validateScenarioGraph(result.data), { errors: [], warnings: [] });
  });
}

test('public validator rejects broken content mutations (in memory only)', () => {
  const validator = api();
  const rejection = (edit, expectedCode) => {
    const scenario = load('urgent-supply');
    edit(scenario);
    const result = validator.validateScenario(scenario);
    assert.equal(result.success, false);
    assert.ok(result.errors.some(error => error.code === expectedCode), JSON.stringify(result.errors));
  };
  const first = scenario => scenario.nodes.find(node => node.id === 'scope');
  rejection(scenario => { first(scenario).choices[0].nextNodeId = 'missing'; }, 'TARGET_NOT_FOUND');
  rejection(scenario => { first(scenario).choices[0].nextNodeId = 'limited-service'; }, 'TOO_SHORT_PATH');
  rejection(scenario => { first(scenario).choices[0].nextNodeId = 'scope'; }, 'CYCLE');
  rejection(scenario => { first(scenario).choices.pop(); }, 'TOO_FEW_CHOICES');
  rejection(scenario => { first(scenario).choices[0].schedule[0].trigger.count = 3; }, 'DELAYED_TRIGGER_UNREACHABLE');
  rejection(scenario => { first(scenario).choices[1].schedule[0].id = first(scenario).choices[0].schedule[0].id; }, 'DUPLICATE_DELAYED_ID');
  rejection(scenario => { first(scenario).choices[0].legalStatus = 'allowed'; }, 'LEGAL_SOURCE_REQUIRED');
  rejection(scenario => { scenario.publicationStatus = 'published'; }, 'PUBLICATION_NOT_ALLOWED');
  const malformed = validator.validateScenarioJson('{');
  assert.equal(malformed.success, false);
  assert.ok(malformed.errors.some(error => error.code === 'INVALID_JSON'));
});

test('static evidence detects a short route without using engine code', () => {
  const scenario = load('urgent-supply');
  scenario.nodes.find(node => node.id === 'scope').choices[0].nextNodeId = 'limited-service';
  assert.throws(() => inspectRoutes(scenario), /Short path/);
});
