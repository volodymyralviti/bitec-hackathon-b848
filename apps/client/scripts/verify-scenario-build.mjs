import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { validateScenario } from '@eds/scenario-schema';

const source = new URL('../../../content/scenarios/', import.meta.url);
const output = new URL('../dist/client/browser/scenarios/', import.meta.url);
const expected = ['report-under-pressure.json', 'fair-selection.json', 'quiet-after-formation.json'];
assert.deepEqual(JSON.parse(readFileSync(new URL('index.json', source), 'utf8')), expected);
assert.deepEqual(JSON.parse(readFileSync(new URL('index.json', output), 'utf8')), expected);
assert.deepEqual(readdirSync(output).sort(), ['index.json', ...expected].sort());
for (const file of expected) {
  const text = readFileSync(new URL(file, output), 'utf8');
  assert.equal(text, readFileSync(new URL(file, source), 'utf8'));
  assert.equal(validateScenario(JSON.parse(text)).success, true, file);
}
console.log('PASS: production /scenarios contains only the allowlisted JSON, unchanged and valid.');
