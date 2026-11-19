import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import * as esm from '../dist/esm/index.js';
const require = createRequire(import.meta.url);
test('public ESM and CommonJS exports resolve runtime functions and declarations', async () => {
  const cjs = require('../dist/cjs/index.js');
  assert.equal(typeof esm.startScenario, 'function');
  assert.equal(typeof cjs.startScenario, 'function');
  assert.equal(typeof esm.getDebrief, 'function');
  assert.equal(typeof cjs.getDebrief, 'function');
  const scenario = JSON.parse(await readFile(new URL('../../scenario-schema/test/fixtures/valid.json', import.meta.url), 'utf8'));
  const state = cjs.advanceNarrative(scenario, cjs.startScenario(scenario));
  assert.equal(cjs.makeDecision(scenario, state, 'option-1').decisionCount, 1);
});
