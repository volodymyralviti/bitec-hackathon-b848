import supply from '../../../../../content/scenarios/urgent-supply.json';
import truth from '../../../../../content/scenarios/truth-under-pressure.json';
import { validateScenario, type Scenario } from '@eds/scenario-schema';

// Test data comes from the actual content files, not a parallel story definition.
export function scenarioFixture(id: 'urgent-supply' | 'truth-under-pressure' = 'urgent-supply'): Scenario {
  const result = validateScenario(id === 'urgent-supply' ? supply : truth);
  if (!result.success) throw new Error('Invalid content fixture');
  return result.data;
}
