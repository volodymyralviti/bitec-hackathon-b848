import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateScenario, validateScenarioJson } from '@eds/scenario-schema';

const fixture = () => JSON.parse(readFileSync(new URL('./fixtures/minimal.json', import.meta.url), 'utf8'));
const source = () => ({ sourceId: 'test-law', title: 'Синтетичний документ для тесту, не правове джерело', sourceType: 'normative', documentType: 'law', issuer: 'Тестовий орган', documentNumber: 'TEST', documentDate: '2025-01-01', pinpoint: 'Тестовий пункт 1', url: 'https://example.org/test', versionAsOf: '2025-02-01', revision: 'Синтетична редакція', relevance: 'Перевірка збереження реквізитів, не юридичне твердження.', applicabilityQuestions: 'Застосовність не перевірено.', expertReviewRequired: true, verificationStatus: 'unverified', verifiedAt: null });
const withSource = () => { const value = fixture(); value.sources.push(source()); return value; };

test('optional legal metadata roundtrips with honest draft warnings', () => {
  const value = withSource();
  const result = validateScenarioJson(JSON.stringify(value));
  assert.equal(result.success, true);
  assert.deepEqual(result.data, value);
  assert.ok(result.warnings.some(item => item.code === 'SOURCE_APPLICABILITY_UNCONFIRMED' && item.severity === 'WARNING'));
  assert.ok(result.warnings.some(item => item.severity === 'INFO'));
});

for (const [name, mutate, code] of [
  ['empty title', s => { s.title = ''; }, 'INVALID_STRUCTURE'],
  ['missing ID', s => { delete s.sourceId; }, 'INVALID_STRUCTURE'],
  ['invalid URL', s => { s.url = 'javascript:alert(1)'; }, 'INVALID_STRUCTURE'],
  ['invalid date', s => { s.documentDate = '2025-02-30'; }, 'INVALID_STRUCTURE'],
  ['revision before document', s => { s.versionAsOf = '2024-01-01'; }, 'SOURCE_DATE_CONFLICT'],
  ['methodology disguised as law', s => { s.documentType = 'methodology'; }, 'SOURCE_CLASSIFICATION_CONFLICT'],
  ['unsubstantiated source check', s => { s.verificationStatus = 'team_checked'; s.verifiedAt = '2025-03-01'; }, 'SOURCE_EVIDENCE_MISSING'],
]) test(name, () => {
  const value = withSource(); mutate(value.sources.at(-1));
  const result = validateScenario(value);
  assert.equal(result.success, false);
  assert.ok(result.errors.some(item => item.code === code), JSON.stringify(result));
});

test('missing normative locator and relevance warn without blocking a draft', () => {
  const value = withSource(); delete value.sources.at(-1).pinpoint; delete value.sources.at(-1).relevance;
  const result = validateScenario(value);
  assert.equal(result.success, true);
  for (const code of ['SOURCE_METADATA_INCOMPLETE', 'SOURCE_RELEVANCE_MISSING']) assert.ok(result.warnings.some(item => item.code === code));
});

test('duplicates, dangling references and a later revision are rejected', () => {
  const value = withSource(); value.contentCreatedAt = '2024-12-01';
  value.sources.at(-1).sourceId = value.sources[0].sourceId;
  value.nodes[0].sourceIds = ['missing', 'missing'];
  const result = validateScenario(value);
  for (const code of ['DUPLICATE_SOURCE_ID', 'SOURCE_NOT_FOUND', 'DUPLICATE_SOURCE_REFERENCE', 'SOURCE_DATE_CONFLICT']) assert.ok(result.errors.some(item => item.code === code));
});

test('technical or team source checking cannot authorize a choice or publication', () => {
  const value = withSource(); const law = value.sources.at(-1);
  law.verificationStatus = 'team_checked'; law.verifiedAt = '2025-03-01'; law.verificationEvidence = 'Синтетичний запис звірки';
  const decision = value.nodes.find(node => node.type === 'decision');
  decision.choices[0].sourceIds = [law.sourceId]; decision.choices[0].legalStatus = 'allowed';
  value.publicationStatus = 'published';
  const result = validateScenario(value);
  assert.ok(result.errors.some(item => item.code === 'LEGAL_SOURCE_REQUIRED'));
  assert.ok(result.errors.some(item => item.code === 'PUBLICATION_NOT_ALLOWED'));
});

test('judgment particulars remain draft warnings; fixtures stay unchanged and deterministic', () => {
  const value = withSource(); value.sources.at(-1).documentType = 'judgment';
  const before = JSON.stringify(value);
  const result = validateScenario(value);
  assert.equal(result.success, true);
  assert.ok(result.warnings.some(item => item.path.at(-1) === 'court'));
  assert.deepEqual(validateScenario(value), result);
  assert.equal(JSON.stringify(value), before);
});
