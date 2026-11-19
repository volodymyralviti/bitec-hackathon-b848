import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { ScenarioSchema, SCHEMA_VERSION, validateScenario, validateScenarioJson, validateScenarioStructure } from '@eds/scenario-schema';

const require = createRequire(import.meta.url);
const fixture = name => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
const valid = () => fixture('valid');
const node = (scenario, id) => scenario.nodes.find(item => item.id === id);
const errors = input => validateScenario(input).errors;
const reject = (change, code, path) => {
  const scenario = valid();
  change(scenario);
  const result = validateScenario(scenario);
  assert.equal(result.success, false);
  assert.ok(result.errors.some(error => error.code === code), JSON.stringify(result));
  if (path) assert.ok(result.errors.some(error => JSON.stringify(error.path) === JSON.stringify(path)));
  return result;
};

test('valid branching and minimal JSON fixtures pass with honest unverified warnings', () => {
  for (const name of ['valid', 'minimal']) {
    const result = validateScenario(fixture(name));
    assert.equal(result.success, true, JSON.stringify(result));
    assert.ok(result.warnings.some(warning => warning.code === 'SOURCE_UNVERIFIED'));
  }
});

test('independent enumeration confirms all eight fixture routes contain three decisions', () => {
  const scenario = valid();
  const counts = [];
  const visit = (id, decisions) => {
    const current = node(scenario, id);
    if (current.type === 'ending') { counts.push(decisions); return; }
    if (current.type === 'narrative') visit(current.nextNodeId, decisions);
    else for (const choice of current.choices) visit(choice.nextNodeId, decisions + 1);
  };
  visit(scenario.startNodeId, 0);
  assert.equal(counts.length, 8);
  assert.ok(counts.every(count => count === 3));
});

test('missing target and missing entry have precise diagnostics', () => {
  reject(s => { node(s, 'd1').choices[0].nextNodeId = 'missing'; }, 'TARGET_NOT_FOUND', ['nodes', 1, 'choices', 0, 'nextNodeId']);
  reject(s => { s.startNodeId = 'missing'; }, 'ENTRY_NOT_FOUND', ['startNodeId']);
});

test('cycles are rejected, including cycles outside the entry component', () => {
  reject(s => { node(s, 'd3').choices[0].nextNodeId = 'd1'; }, 'CYCLE');
  reject(s => { s.nodes.push({ ...structuredClone(node(s, 'intro')), id: 'loop', nextNodeId: 'loop' }); }, 'CYCLE');
});

test('unreachable nodes are rejected', () => {
  reject(s => { s.nodes.push({ ...structuredClone(node(s, 'end-a')), id: 'unused' }); }, 'UNREACHABLE_NODE');
});

test('four total decisions cannot conceal a branch ending after only one decision', () => {
  reject(s => {
    assert.equal(s.nodes.filter(n => n.type === 'decision').length, 4);
    node(s, 'd1').choices[0].nextNodeId = 'end-a';
  }, 'TOO_SHORT_PATH');
});

test('a branch ending after two decisions is rejected', () => {
  reject(s => { node(s, 'd2a').choices[0].nextNodeId = 'end-a'; }, 'TOO_SHORT_PATH');
});

test('entry ending and narrative-only routes do not count as decisions', () => {
  reject(s => { s.startNodeId = 'end-a'; }, 'TOO_SHORT_PATH');
  reject(s => { node(s, 'intro').nextNodeId = 'end-a'; }, 'TOO_SHORT_PATH');
});

test('one choice is a semantic error, allowing other graph errors to accumulate', () => {
  const result = reject(s => {
    node(s, 'd1').choices.pop();
    node(s, 'd3').choices[0].nextNodeId = 'missing';
  }, 'TOO_FEW_CHOICES');
  assert.ok(result.errors.some(error => error.code === 'TARGET_NOT_FOUND'));
});

test('a reachable dead end and absence of any ending are diagnosed', () => {
  reject(s => { node(s, 'd2a').choices = []; }, 'DEAD_END');
  reject(s => { s.nodes = s.nodes.filter(n => n.type !== 'ending'); }, 'NO_REACHABLE_ENDING');
});

test('node IDs are global, choice IDs node-local, delayed IDs global, source IDs global', () => {
  reject(s => { s.nodes.push(structuredClone(node(s, 'd1'))); }, 'DUPLICATE_NODE_ID');
  reject(s => { node(s, 'd1').choices[1].id = node(s, 'd1').choices[0].id; }, 'DUPLICATE_CHOICE_ID');
  reject(s => { node(s, 'd1').choices[1].schedule[0].id = 'later-a'; }, 'DUPLICATE_DELAYED_ID');
  reject(s => { s.sources.push(structuredClone(s.sources[0])); }, 'DUPLICATE_SOURCE_ID');
  assert.equal(validateScenario(valid()).success, true); // option-1 is reused in different nodes
});

test('delayed node trigger must exist and be reachable after its owning choice', () => {
  reject(s => { node(s, 'd1').choices[0].schedule[0].trigger = { type: 'on_enter_node', nodeId: 'missing' }; }, 'DELAYED_TARGET_NOT_FOUND');
  reject(s => { node(s, 'd1').choices[0].schedule[0].trigger = { type: 'on_enter_node', nodeId: 'd2b' }; }, 'DELAYED_TRIGGER_UNREACHABLE');
});

test('entering the immediate next node or an ending is an eligible trigger', () => {
  const scenario = valid();
  node(scenario, 'd1').choices[0].schedule[0].trigger = { type: 'on_enter_node', nodeId: 'd2a' };
  assert.equal(validateScenario(scenario).success, true);
  node(scenario, 'd1').choices[0].schedule[0].trigger.nodeId = 'end-a';
  const result = validateScenario(scenario);
  assert.equal(result.success, true);
  assert.ok(result.warnings.some(warning => warning.code === 'DELAYED_MAY_NOT_FIRE'));
});

test('count excludes the scheduling decision and impossible counters are rejected', () => {
  const scenario = valid();
  node(scenario, 'd1').choices[0].schedule[0].trigger.count = 2;
  assert.equal(validateScenario(scenario).success, true);
  reject(s => { node(s, 'd1').choices[0].schedule[0].trigger.count = 3; }, 'DELAYED_TRIGGER_UNREACHABLE');
  reject(s => { node(s, 'd1').choices[0].schedule[0].trigger.count = 0; }, 'INVALID_STRUCTURE');
});

test('a counter possible on some complete routes produces a warning, not rejection', () => {
  const scenario = valid();
  const extra = structuredClone(node(scenario, 'd3'));
  extra.id = 'd4';
  scenario.nodes.push(extra);
  node(scenario, 'd3').choices[0].nextNodeId = 'd4';
  node(scenario, 'd1').choices[0].schedule[0].trigger.count = 3;
  const result = validateScenario(scenario);
  assert.equal(result.success, true, JSON.stringify(result));
  assert.ok(result.warnings.some(warning => warning.code === 'DELAYED_MAY_NOT_FIRE'));
});

test('all reference locations are validated', () => {
  reject(s => { node(s, 'intro').sourceIds = ['missing']; }, 'SOURCE_NOT_FOUND');
  reject(s => { node(s, 'd1').choices[0].sourceIds = ['missing']; }, 'SOURCE_NOT_FOUND');
  reject(s => { node(s, 'end-a').debrief.sourceIds = ['missing']; }, 'SOURCE_NOT_FOUND');
});

test('source version fields cannot be omitted; unknown versions must be explicit null', () => {
  reject(s => { delete s.sources[0].versionAsOf; }, 'INVALID_STRUCTURE', ['sources', 0, 'versionAsOf']);
  reject(s => { delete s.version; }, 'INVALID_STRUCTURE', ['version']);
  reject(s => { s.sources[0].versionAsOf = '2026-99-99'; }, 'INVALID_STRUCTURE');
});

test('verified normative metadata must include revision date, pinpoint and issuer', () => {
  const result = reject(s => {
    s.sources[0].sourceType = 'normative';
    s.sources[0].verificationStatus = 'team_checked';
    s.sources[0].verifiedAt = null;
  }, 'SOURCE_METADATA_INCOMPLETE');
  assert.ok(result.errors.length >= 2);
});

test('unverified metadata cannot claim a checked date or a definite legal status', () => {
  reject(s => { s.sources[0].verifiedAt = '2026-01-01'; }, 'SOURCE_METADATA_INCOMPLETE');
  reject(s => { node(s, 'd1').choices[0].legalStatus = 'allowed'; }, 'LEGAL_SOURCE_REQUIRED');
});

test('review fields and publication combinations fail closed without fake approvals', () => {
  reject(s => { delete s.contentReview.aiAssisted; }, 'INVALID_STRUCTURE');
  reject(s => { s.contentReview.status = 'expert_approved'; }, 'REVIEW_INCOMPLETE');
  reject(s => { s.publicationStatus = 'published'; }, 'PUBLICATION_NOT_ALLOWED');
  reject(s => { s.contentReview.demoOnly = false; }, 'PUBLICATION_NOT_ALLOWED');
  reject(s => { s.contentReview.reviewedAt = '2026-01-01T00:00:00Z'; }, 'REVIEW_INCOMPLETE');
});

test('shape rejects executable extensions, unknown metrics and invalid deltas', () => {
  reject(s => { node(s, 'd1').choices[0].conditions = 'arbitrary-code'; }, 'INVALID_STRUCTURE');
  reject(s => { node(s, 'd1').choices[0].immediateEffects[0].metric = 'personality'; }, 'INVALID_STRUCTURE');
  reject(s => { node(s, 'd1').choices[0].immediateEffects[0].delta = 11; }, 'INVALID_STRUCTURE');
  reject(s => { s.sources[0].url = 'javascript:alert(1)'; }, 'INVALID_STRUCTURE');
});

test('shape returns multiple safe errors, but skips graph evaluation on broken structure', () => {
  const scenario = valid();
  delete scenario.title;
  delete scenario.language;
  scenario.nodes[1].type = 'unknown';
  const result = validateScenario(scenario);
  assert.equal(result.success, false);
  assert.ok(result.errors.length >= 3);
  assert.ok(result.errors.every(error => error.code === 'INVALID_STRUCTURE'));
});

test('JSON parsing rejects malformed text, non-JSON objects, cycles and oversized input', () => {
  assert.equal(validateScenarioJson('{').errors[0].code, 'INVALID_JSON');
  assert.equal(validateScenarioJson(' '.repeat(1_000_001)).errors[0].code, 'INPUT_LIMIT');
  assert.equal(validateScenarioJson(JSON.stringify(valid())).success, true);
  assert.equal(validateScenario(new Date()).success, false);
  assert.equal(validateScenario({ [Symbol('not-json')]: 'value' }).success, false);
  const circular = {}; circular.self = circular;
  assert.equal(errors(circular)[0].code, 'INVALID_JSON');
  assert.equal(errors({ text: 'x'.repeat(1_000_001) })[0].code, 'INPUT_LIMIT');
});

test('accessors and toJSON are not executed', () => {
  let called = false;
  const input = { get title() { called = true; return 'unexpected'; } };
  assert.equal(validateScenario(input).success, false);
  assert.equal(called, false);
  assert.equal(validateScenario({ toJSON() { called = true; return valid(); } }).success, false);
  assert.equal(called, false);
});

test('results are deterministic and deeply frozen input is not modified', () => {
  const input = valid();
  const snapshot = structuredClone(input);
  const freeze = value => {
    if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
  };
  freeze(input);
  const first = validateScenario(input);
  assert.deepEqual(validateScenario(input), first);
  assert.deepEqual(input, snapshot);
  assert.equal(first.success, true);
  assert.notEqual(first.data, input);
});

test('large merging DAG validates without enumerating exponentially many paths', () => {
  const scenario = valid();
  const template = node(scenario, 'd2a');
  const layers = Array.from({ length: 60 }, (_, index) => ['a', 'b'].map(side => {
    const decision = structuredClone(template);
    decision.id = `step-${index}-${side}`;
    decision.choices.forEach((choice, choiceIndex) => {
      choice.nextNodeId = index === 59 ? 'end-a' : `step-${index + 1}-${choiceIndex === 0 ? 'a' : 'b'}`;
    });
    return decision;
  })).flat();
  const entry = structuredClone(template);
  entry.id = 'entry';
  entry.choices[0].nextNodeId = 'step-0-a';
  entry.choices[1].nextNodeId = 'step-0-b';
  scenario.nodes = [entry, ...layers, structuredClone(node(valid(), 'end-a'))];
  scenario.startNodeId = 'entry';
  assert.equal(validateScenario(scenario).success, true); // >=2^60 distinct node routes
});

test('JSON Schema export is strict, versioned and structurally complete', () => {
  const schema = require('@eds/scenario-schema/scenario.schema.json');
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(schema.additionalProperties, false);
  assert.equal(schema.properties.schemaVersion.const, SCHEMA_VERSION);
  assert.ok(schema.required.includes('contentReview'));
  assert.equal(ScenarioSchema.safeParse(valid()).success, true);
  const oneChoice = valid(); node(oneChoice, 'd1').choices.pop();
  assert.equal(validateScenarioStructure(oneChoice).success, true);
  assert.equal(validateScenario(oneChoice).success, false);
});

test('compiled CJS and ESM exports behave identically; internals are encapsulated', () => {
  const cjs = require('@eds/scenario-schema');
  assert.match(require.resolve('@eds/scenario-schema'), /dist[/\\]cjs[/\\]index\.js$/);
  assert.deepEqual(cjs.validateScenario(valid()), validateScenario(valid()));
  assert.throws(() => require('@eds/scenario-schema/src/schema.js'), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });
});
