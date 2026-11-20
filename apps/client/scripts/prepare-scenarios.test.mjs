import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const client = fileURLToPath(new URL('../', import.meta.url));
const source = fileURLToPath(new URL('../../../content/scenarios/', import.meta.url));
const expected = ['report-under-pressure.json', 'fair-selection.json', 'quiet-after-formation.json'];
const config = JSON.parse(readFileSync(join(client, 'angular.json'), 'utf8'));
test('rebuilt workspace contracts bypass stale Vite dependency prebundles', () => {
  const excluded = config.projects.client.architect.serve.options.prebundle.exclude;
  assert.ok(excluded.includes('@eds/scenario-schema'));
  assert.ok(excluded.includes('@eds/scenario-engine'));
  assert.ok(excluded.includes('zod')); // Transitive schema dependency resolves from its owning workspace package.
});
const asset = config.projects.client.architect.build.options.assets.find(item =>
  typeof item === 'object' && item.output.replace(/^\/|\/$/g, '') === 'scenarios');

function sandbox(t) {
  const cache = resolve(client, '.angular');
  mkdirSync(cache, { recursive: true });
  const root = mkdtempSync(join(cache, 'prepare-regression-'));
  t.after(() => {
    // Only remove the isolated directory created by this test, never real content.
    assert.ok(resolve(root).startsWith(cache + sep));
    assert.ok(root.slice(cache.length + 1).startsWith('prepare-regression-'));
    rmSync(root, { recursive: true, force: true });
  });
  const app = join(root, 'apps/client');
  const input = join(root, 'content/scenarios');
  const script = join(app, 'scripts/prepare-scenarios.mjs');
  mkdirSync(dirname(script), { recursive: true });
  mkdirSync(input, { recursive: true });
  // Execute the unchanged real script in an equivalent layout. Node resolves the
  // built package from the enclosing client's node_modules; no install or aliases.
  copyFileSync(new URL('./prepare-scenarios.mjs', import.meta.url), script);
  for (const file of ['index.json', ...expected]) copyFileSync(join(source, file), join(input, file));
  const output = resolve(app, asset.input);
  const run = (cwd = root) => spawnSync(process.execPath, [script], { cwd, encoding: 'utf8', windowsHide: true });
  return { root, app, input, output, run };
}

test('allowlist contains exactly the three curated demo filenames (not expert approved)', () => {
  assert.deepEqual(JSON.parse(readFileSync(join(source, 'index.json'), 'utf8')), expected);
  assert.equal(asset.glob, '*.json');
  assert.equal(asset.output.replace(/^\/|\/$/g, ''), 'scenarios');
});

test('preparation publishes JSON at the configured asset input independently of cwd', t => {
  const env = sandbox(t);
  const result = env.run(); // workspace root, not apps/client
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(readdirSync(env.output).sort(), ['index.json', ...expected].sort());
  assert.deepEqual(JSON.parse(readFileSync(join(env.output, 'index.json'), 'utf8')), expected);
  for (const file of expected) {
    const original = readFileSync(join(source, file), 'utf8');
    assert.equal(readFileSync(join(env.output, file), 'utf8'), original);
    const scenario = JSON.parse(original);
    assert.equal(scenario.contentReview.status, 'draft');
    assert.equal(scenario.contentReview.demoOnly, true);
    assert.equal(scenario.contentReview.aiAssisted, true);
  }
  assert.equal(env.run(env.app).status, 0);
});

test('unlisted drafts and invalid unlisted JSON never reach public assets', t => {
  const env = sandbox(t);
  writeFileSync(join(env.input, 'private-draft.json'), '{not even valid JSON');
  assert.equal(env.run().status, 0);
  assert.equal(existsSync(join(env.output, 'private-draft.json')), false);
  // Generated stale assets must not survive a later successful preparation.
  writeFileSync(join(env.output, 'stale-draft.json'), '{}');
  assert.equal(env.run().status, 0);
  assert.deepEqual(readdirSync(env.output).sort(), ['index.json', ...expected].sort());
});

for (const failure of ['missing', 'invalid-json', 'invalid-schema', 'private-draft']) {
  test(`listed ${failure} fails before creating public output`, t => {
    const env = sandbox(t);
    const file = join(env.input, expected[0]);
    if (failure === 'missing') unlinkSync(file);
    else if (failure === 'invalid-json') writeFileSync(file, '{');
    else {
      const scenario = JSON.parse(readFileSync(file, 'utf8'));
      if (failure === 'invalid-schema') delete scenario.nodes;
      else {
        scenario.publicationStatus = 'draft';
        scenario.contentReview.demoOnly = false;
      }
      writeFileSync(file, JSON.stringify(scenario));
    }
    const result = env.run();
    assert.notEqual(result.status, 0);
    assert.ok(result.stderr.length > 0);
    assert.equal(existsSync(env.output), false);
  });
}

test('unsafe manifest paths are rejected rather than copied', t => {
  const env = sandbox(t);
  writeFileSync(join(env.input, 'index.json'), JSON.stringify(['../private.json']));
  assert.notEqual(env.run().status, 0);
  assert.equal(existsSync(env.output), false);
});
