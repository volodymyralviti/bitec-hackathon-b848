import { mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { validateScenario } from '@eds/scenario-schema';

const input = new URL('../../../content/scenarios/', import.meta.url);
const output = fileURLToPath(new URL('../.angular/solo-content', import.meta.url));
const manifest = JSON.parse(readFileSync(new URL('index.json', input), 'utf8'));
const filename = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}\.json$/;
if (!Array.isArray(manifest) || manifest.length > 128 || new Set(manifest).size !== manifest.length ||
    manifest.some(file => typeof file !== 'string' || !filename.test(file) || file === 'index.json')) {
  throw new Error('Invalid scenario file manifest');
}
const ids = new Set();
const files = manifest.map(file => {
  const text = readFileSync(new URL(file, input), 'utf8');
  const result = validateScenario(JSON.parse(text));
  if (!result.success || (!result.data.contentReview.demoOnly && result.data.publicationStatus !== 'published')) {
    throw new Error(`Cannot package scenario: ${file}`);
  }
  if (ids.has(result.data.id)) throw new Error('Duplicate scenario ID');
  ids.add(result.data.id);
  return { file, text };
});
mkdirSync(output, { recursive: true });
// Clean only generated flat JSON assets; never source content or directories.
for (const entry of readdirSync(output, { withFileTypes: true })) {
  const target = resolve(output, entry.name);
  if (entry.isFile() && filename.test(entry.name) && dirname(target) === output) unlinkSync(target);
}
for (const { file, text } of files) writeFileSync(resolve(output, file), text);
writeFileSync(resolve(output, 'index.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`Prepared ${files.length} explicit public demo/published scenario assets.`);
