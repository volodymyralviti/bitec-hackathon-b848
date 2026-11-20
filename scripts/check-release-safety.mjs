// Narrow reproducible hygiene gate, not a PII classifier, dependency audit or penetration test.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const patterns = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['aws-access-key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/],
  ['api-secret-token', /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/],
];
const failures = []; let scanned = 0;
function scan(relative) {
  const target = path.join(root, relative);
  if (!fs.existsSync(target)) return;
  for (const item of fs.readdirSync(target, { withFileTypes: true })) {
    const file = path.join(relative, item.name);
    if (item.isDirectory()) { scan(file); continue; }
    if (!item.isFile() || !/\.(?:ts|js|mjs|json|html|scss)$/.test(item.name)) continue;
    const text = fs.readFileSync(path.join(root, file), 'utf8'); scanned++;
    for (const [kind, pattern] of patterns) if (pattern.test(text)) failures.push({ file, kind });
  }
}
for (const directory of ['apps/client/src', 'apps/server/src', 'content/scenarios', 'packages/scenario-engine/src', 'packages/scenario-schema/src', 'apps/client/dist/client/browser']) scan(directory);
// Fail without printing the matched credential. Test-only fixtures are not real approvals.
assert.deepEqual(failures, [], 'Potential credential pattern: investigate listed file/kind without pasting secret values');
for (const id of ['urgent-supply', 'truth-under-pressure']) {
  const scenario = JSON.parse(fs.readFileSync(path.join(root, 'content/scenarios', id + '.json'), 'utf8'));
  assert.equal(scenario.publicationStatus, 'draft');
  const review = scenario.contentReview;
  assert.ok(review.status === 'draft' && review.demoOnly === true && review.aiAssisted === true && Object.keys(review).length === 3, 'Demo review flags changed: human review of release policy required');
  assert.ok(scenario.sources.every(source => source.verificationStatus === 'unverified' && source.verifiedAt === null));
}
console.log(JSON.stringify({ filesScanned: scanned, credentialPatternsFound: 0, demoCasesWithoutFabricatedReview: 2, limitations: 'Known token patterns only; manual content and deployment review still required' }, null, 2));
