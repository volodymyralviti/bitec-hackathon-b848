import { SCHEMA_VERSION, validateScenario, type Scenario } from '@eds/scenario-schema';

describe('Compiled scenario-schema ESM package', () => {
  it('resolves declarations and executes validation in the browser', () => {
    const version: Scenario['schemaVersion'] = SCHEMA_VERSION;
    expect(version).toBe('1');
    expect(validateScenario(null).success).toBeFalse();
  });
});
