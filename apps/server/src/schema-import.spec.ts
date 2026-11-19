import {
  SCHEMA_VERSION,
  validateScenario,
  type Scenario,
} from '@eds/scenario-schema';

describe('Compiled scenario-schema CommonJS package', () => {
  it('resolves compiled code and declarations without source aliases', () => {
    const version: Scenario['schemaVersion'] = SCHEMA_VERSION;
    expect(version).toBe('1');
    expect(validateScenario(null).success).toBe(false);
    expect(require.resolve('@eds/scenario-schema')).toMatch(
      /dist[/\\]cjs[/\\]index\.js$/,
    );
  });
});
