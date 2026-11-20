import { InjectionToken } from '@angular/core';
import { validateScenario, validateScenarioStructure, type Scenario, type ValidationIssue, type ValidationResult } from '@eds/scenario-schema';

export const DEMO_STUDIO = new InjectionToken<boolean>('DEMO_STUDIO', { providedIn: 'root', factory: () => false });

// Local guest policy, not a replacement for DSL validation or server authorization.
export function validateDemoScenario(input: unknown, structureOnly = false): ValidationResult {
  const result = structureOnly ? validateScenarioStructure(input) : validateScenario(input);
  if (!result.success) return result;
  const scenario: Scenario = result.data;
  const errors: ValidationIssue[] = [];
  if (scenario.publicationStatus !== 'draft' || !scenario.contentReview.demoOnly) errors.push({ code: 'PUBLICATION_NOT_ALLOWED', path: ['publicationStatus'], message: 'У деморежимі дозволена лише локальна demo-only чернетка.' });
  if (scenario.contentReview.status !== 'draft' || scenario.contentReview.reviewedAt || scenario.contentReview.reviewerRole || scenario.contentReview.evidenceRef) errors.push({ code: 'REVIEW_INCOMPLETE', path: ['contentReview'], message: 'Демо не приймає експертного схвалення чи записів завершеного review.' });
  scenario.sources.forEach((source, index) => {
    if (source.verificationStatus !== 'unverified' || source.verifiedAt !== null) errors.push({ code: 'SOURCE_METADATA_INCOMPLETE', path: ['sources', index, 'verificationStatus'], message: 'Джерела демо залишаються unverified, без підтвердженої дати перевірки.' });
  });
  scenario.nodes.forEach((node, index) => {
    if (node.type === 'decision') node.choices.forEach((choice, choiceIndex) => {
      if (choice.legalStatus && choice.legalStatus !== 'uncertain') errors.push({ code: 'LEGAL_SOURCE_REQUIRED', path: ['nodes', index, 'choices', choiceIndex, 'legalStatus'], message: 'Деморежим не підтверджує правову допустимість. Залиште статус uncertain.' });
    });
  });
  return errors.length ? { success: false, errors, warnings: result.warnings } : result;
}
