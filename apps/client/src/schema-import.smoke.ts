// Separate build entry: never imported by the application or shown in the UI.
import { SCHEMA_VERSION, validateScenario, type Scenario } from '@eds/scenario-schema';

const version: Scenario['schemaVersion'] = SCHEMA_VERSION;
if (version !== '1' || validateScenario(null).success) {
  throw new Error('Scenario schema ESM import failed');
}
