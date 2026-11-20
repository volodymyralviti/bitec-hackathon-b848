import { scenarioConfig } from './scenario-config';
import { compareVersions } from './scenario-store';

describe('Scenario capabilities and persistence configuration', () => {
  const original = { ...process.env };
  beforeEach(() => {
    delete process.env.DATABASE_URL;
    delete process.env.AUTHOR_KEY;
    delete process.env.REVIEWER_KEY;
  });
  afterEach(() => {
    process.env = { ...original };
  });
  it('disables author and reviewer access until explicitly configured', () => {
    expect(scenarioConfig()).toMatchObject({ authorKey: '', reviewerKey: '' });
  });
  it('refuses weak or shared role capabilities', () => {
    process.env.AUTHOR_KEY = 'short';
    expect(() => scenarioConfig()).toThrow('at least 32');
    process.env.AUTHOR_KEY = 'test-only-author-capability-32-characters';
    process.env.REVIEWER_KEY = process.env.AUTHOR_KEY;
    expect(() => scenarioConfig()).toThrow('separate');
  });
  it('refuses a silent fallback when a database is configured', () => {
    process.env.DATABASE_URL = 'test-only-not-a-real-connection';
    expect(() => scenarioConfig()).toThrow('PostgreSQL adapter');
  });
  it('orders validated numeric SemVer without lexical or floating-point errors', () => {
    expect(compareVersions('1.10.0', '1.9.99')).toBe(1);
    expect(
      compareVersions('1.0.9007199254740993', '1.0.9007199254740992'),
    ).toBe(1);
    expect(compareVersions('2.0.0', '2.0.0')).toBe(0);
  });
});
