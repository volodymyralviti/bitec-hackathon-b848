import {
  SCHEMA_VERSION,
  validateScenario,
  type Scenario,
} from '@eds/scenario-schema';
import { startScenario } from '@eds/scenario-engine';

describe('Compiled scenario-schema CommonJS package', () => {
  it('resolves compiled code and declarations without source aliases', () => {
    const version: Scenario['schemaVersion'] = SCHEMA_VERSION;
    expect(version).toBe('1');
    expect(validateScenario(null).success).toBe(false);
    expect(typeof startScenario).toBe('function');
    expect(require.resolve('@eds/scenario-schema')).toMatch(
      /dist[/\\]cjs[/\\]index\.js$/,
    );
  });
});
