import { issue, type ValidationIssue } from './diagnostics.js';
import type { Scenario } from './schema.js';

export function validateProvenance(scenario: Scenario): { errors: ValidationIssue[]; warnings: ValidationIssue[] } {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const sources = new Map(scenario.sources.map(source => [source.sourceId, source]));
  const seen = new Set<string>();
  scenario.sources.forEach((source, index) => {
    const path = ['sources', index];
    if (seen.has(source.sourceId)) errors.push(issue('DUPLICATE_SOURCE_ID', [...path, 'sourceId'], 'Ідентифікатор джерела повторюється.'));
    seen.add(source.sourceId);
    if (source.verificationStatus === 'unverified') {
      warnings.push(issue('SOURCE_UNVERIFIED', [...path, 'verificationStatus'], 'Джерело не перевірено; нормативні твердження не підтверджені.'));
      if (source.verifiedAt !== null) errors.push(issue('SOURCE_METADATA_INCOMPLETE', [...path, 'verifiedAt'], 'Неперевірене джерело не може мати дату підтвердженої перевірки.'));
    } else {
      if (source.verifiedAt === null) errors.push(issue('SOURCE_METADATA_INCOMPLETE', [...path, 'verifiedAt'], 'Для перевіреного джерела потрібна дата перевірки.'));
      if (!source.url && !source.fileCitation) errors.push(issue('SOURCE_METADATA_INCOMPLETE', path, 'Для перевіреного джерела потрібне посилання або точна файлова цитата.'));
      if (source.revision === null && source.versionAsOf === null) errors.push(issue('SOURCE_METADATA_INCOMPLETE', path, 'Для перевіреного джерела потрібна версія або дата редакції.'));
      if (source.sourceType === 'normative' && (!source.issuer || !source.pinpoint || source.versionAsOf === null)) {
        errors.push(issue('SOURCE_METADATA_INCOMPLETE', path, 'Нормативне джерело потребує установи, точного пункту та дати редакції.'));
      }
    }
  });

  const checkRefs = (ids: string[], path: (string | number)[], nodeId: string): void => {
    ids.forEach((id, index) => {
      if (!sources.has(id)) errors.push(issue('SOURCE_NOT_FOUND', [...path, index], 'Посилання на джерело не знайдено в реєстрі сценарію.', nodeId));
    });
  };
  scenario.nodes.forEach((node, index) => {
    checkRefs(node.sourceIds, ['nodes', index, 'sourceIds'], node.id);
    if (node.type === 'ending') checkRefs(node.debrief.sourceIds, ['nodes', index, 'debrief', 'sourceIds'], node.id);
    if (node.type === 'decision') node.choices.forEach((choice, choiceIndex) => {
      const path = ['nodes', index, 'choices', choiceIndex];
      checkRefs(choice.sourceIds, [...path, 'sourceIds'], node.id);
      if (choice.legalStatus && choice.legalStatus !== 'uncertain' && !choice.sourceIds.some(id => {
        const source = sources.get(id);
        return source?.sourceType === 'normative' && source.verificationStatus !== 'unverified';
      })) {
        errors.push(issue('LEGAL_SOURCE_REQUIRED', [...path, 'legalStatus'], 'Визначений правовий статус потребує перевіреного нормативного джерела; інакше вкажіть uncertain.', node.id));
      }
    });
  });

  const review = scenario.contentReview;
  if ((review.status === 'expert_approved' || review.status === 'changes_requested') && (!review.reviewedAt || !review.reviewerRole || !review.evidenceRef)) {
    errors.push(issue('REVIEW_INCOMPLETE', ['contentReview'], 'Результат людського review потребує дати, ролі та посилання на фактичний запис перевірки.'));
  }
  if ((review.status === 'draft' || review.status === 'in_review') && (review.reviewedAt || review.reviewerRole || review.evidenceRef)) {
    errors.push(issue('REVIEW_INCOMPLETE', ['contentReview'], 'Незавершене review не повинно містити метадані завершеного підтвердження.'));
  }
  if (scenario.publicationStatus === 'demo' && !review.demoOnly) {
    errors.push(issue('PUBLICATION_NOT_ALLOWED', ['contentReview', 'demoOnly'], 'Демонстраційний сценарій повинен мати demoOnly=true.'));
  }
  if (scenario.publicationStatus === 'published' && (review.demoOnly || review.status !== 'expert_approved' || scenario.sources.some(source => source.verificationStatus !== 'expert_checked'))) {
    errors.push(issue('PUBLICATION_NOT_ALLOWED', ['publicationStatus'], 'Публікація потребує завершеного експертного review, перевірених експертом джерел і demoOnly=false.'));
  }
  return { errors, warnings };
}
