import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { COLLEGE_IDS, loadCollege, validateCollegeDrafts, inspectCollege, assertEngineRoutes } from './college-qa.mjs';
const requireSchema = createRequire(new URL('../../packages/scenario-schema/package.json', import.meta.url));
const { validateScenario, validateScenarioJson } = requireSchema('@eds/scenario-schema');

test('three curated demo drafts: provenance, honest visibility, golden route evidence and all 24 real-engine paths', () => {
  assert.equal(validateCollegeDrafts({ log: false }).reduce((sum, report) => sum + report.routeCount, 0), 24);
});
for (const id of COLLEGE_IDS) {
  test(`${id}: import/export retains legal metadata and every route result`, () => {
    const scenario = loadCollege(id);
    const result = validateScenarioJson(JSON.stringify(scenario));
    assert.equal(result.success, true); assert.deepEqual(result.data, scenario);
    assertEngineRoutes(result.data, inspectCollege(scenario));
  });
  test(`${id}: source references and legal claims fail closed`, () => {
    const scenario = loadCollege(id);
    const first = scenario.nodes.find(node => node.type === 'decision');
    first.choices[0].sourceIds.push('invented-source');
    first.choices[0].legalStatus = 'allowed';
    scenario.publicationStatus = 'published';
    const result = validateScenario(scenario);
    for (const code of ['SOURCE_NOT_FOUND', 'LEGAL_SOURCE_REQUIRED', 'PUBLICATION_NOT_ALLOWED']) assert.ok(result.errors.some(error => error.code === code));
  });
}
test('a branch shortened before decision three is rejected, even with seven decision nodes in total', () => {
  const scenario = loadCollege(COLLEGE_IDS[0]);
  scenario.nodes.find(node => node.type === 'decision').choices[0].nextNodeId = scenario.nodes.find(node => node.type === 'ending').id;
  assert.ok(validateScenario(scenario).errors.some(error => error.code === 'TOO_SHORT_PATH'));
});
