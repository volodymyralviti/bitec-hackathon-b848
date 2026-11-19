import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { inspectRoutes } from './routes.mjs';

const allowed = new Set(['--inspect-only', '--write-maps']);
for (const arg of process.argv.slice(2)) assert.ok(allowed.has(arg), `Unknown option: ${arg}`);
const inspectOnly = process.argv.includes('--inspect-only');
const writeMaps = process.argv.includes('--write-maps');

let api;
if (!inspectOnly) {
  try {
    // Resolve the package self-reference through its PUBLIC conditional exports.
    // No relative dist/source imports, copying, installation or rebuild here.
    const requireSchema = createRequire(new URL('../../packages/scenario-schema/package.json', import.meta.url));
    api = requireSchema('@eds/scenario-schema');
  } catch (error) {
    console.error('BLOCKED: built public API @eds/scenario-schema is unavailable.');
    console.error('Ask the schema workstream to provide its existing build/dependencies; this command does not build or modify that package.');
    console.error(error.message);
    process.exit(1);
  }
} else {
  console.log('INSPECT ONLY: schema/graph acceptance gate NOT RUN. This mode cannot report Stage 04 PASS.');
}

for (const name of ['urgent-supply', 'truth-under-pressure']) {
  const text = readFileSync(new URL(`../scenarios/${name}.json`, import.meta.url), 'utf8');
  const scenario = JSON.parse(text);
  if (api) {
    const result = api.validateScenario(scenario);
    console.log(`${name}: validateScenario.success=${result.success}`);
    console.log(JSON.stringify({ errors: result.errors, warnings: result.warnings }, null, 2));
    assert.equal(result.success, true, `${name}: schema/provenance/graph validation failed`);
    assert.equal(api.validateScenarioJson(text).success, true);
    const graph = api.validateScenarioGraph(result.data);
    assert.deepEqual(graph.errors, []);
    assert.deepEqual(graph.warnings, []);
    assert.equal(result.warnings.length, scenario.sources.length);
    assert.ok(result.warnings.every(warning => warning.code === 'SOURCE_UNVERIFIED'));
  }
  const report = inspectRoutes(scenario);
  const mapUrl = new URL(`./${name}.routes.json`, import.meta.url);
  if (writeMaps) writeFileSync(mapUrl, JSON.stringify(report, null, 2) + '\n');
  else assert.deepEqual(JSON.parse(readFileSync(mapUrl, 'utf8')), report, 'Route map is stale');
  console.log(`${name}: ${report.nodeCount} nodes, ${report.decisionNodeCount} decisions, ${report.endingCount} endings, ${report.routeCount} routes, ${report.minDecisions}..${report.maxDecisions} decisions per route, ${report.delayedEventCount} delayed events`);
}
console.log(inspectOnly ? 'Static route evidence OK; public validator gate remains NOT RUN.' : 'PASS: both content files pass the public validator and exhaustive static route checks. Engine was not invoked.');
