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
    const error = (code: ValidationIssue['code'], field: string, message: string) => errors.push({ ...issue(code, [...path, field], message), severity: 'ERROR' });
    const warn = (code: ValidationIssue['code'], field: string, message: string, severity: 'WARNING' | 'INFO' = 'WARNING') => warnings.push({ ...issue(code, [...path, field], message), severity });
    if (source.documentDate && source.versionAsOf && source.documentDate > source.versionAsOf) error('SOURCE_DATE_CONFLICT', 'versionAsOf', 'Редакція не може передувати ухваленню документа.');
    if (source.verifiedAt && source.versionAsOf && source.verifiedAt < source.versionAsOf) error('SOURCE_DATE_CONFLICT', 'verifiedAt', 'Дата перевірки не може передувати редакції, яку перевірено.');
    if (source.verifiedAt && source.documentDate && source.verifiedAt < source.documentDate) error('SOURCE_DATE_CONFLICT', 'verifiedAt', 'Дата перевірки не може передувати документу.');
    if (scenario.contentCreatedAt && source.versionAsOf && source.versionAsOf > scenario.contentCreatedAt) error('SOURCE_DATE_CONFLICT', 'versionAsOf', 'Редакція пізніша за дату створення цієї версії сценарію.');
    if ((source.documentType === 'methodology' && source.sourceType !== 'methodology') ||
      (source.documentType && ['law', 'code', 'statute', 'order', 'procedure', 'judgment'].includes(source.documentType) && source.sourceType !== 'normative')) {
      error('SOURCE_CLASSIFICATION_CONFLICT', 'documentType', 'Тип документа суперечить класифікації джерела; методика не є законом.');
    }
    if (source.sourceType === 'normative') {
      if (!source.documentType || !source.pinpoint || !source.issuer || !source.documentDate || !source.url || !source.versionAsOf || !source.revision ||
        (source.documentType && ['law', 'code', 'statute', 'order'].includes(source.documentType) && !source.documentNumber)) warn('SOURCE_METADATA_INCOMPLETE', 'pinpoint', 'Заповніть реквізити, офіційний URL, точну норму та редакцію нормативного документа (номер для нумерованих актів).');
      if (!source.relevance) warn('SOURCE_RELEVANCE_MISSING', 'relevance', 'Поясніть релевантність джерела до навчальної ситуації.');
      if (source.verificationStatus !== 'expert_checked') warn('SOURCE_APPLICABILITY_UNCONFIRMED', 'verificationStatus', 'Правову застосовність цього джерела ще не підтверджено.');
      if (source.verificationStatus !== 'unverified' && !source.verificationEvidence) error('SOURCE_EVIDENCE_MISSING', 'verificationEvidence', 'Позначка перевірки нормативного джерела потребує відтворюваного доказу.');
      if (!scenario.contentCreatedAt) warn('SOURCE_ATTRIBUTION_ADVICE', 'versionAsOf', 'Уточніть у автора дату створення версії сценарію для звірки редакції.', 'INFO');
      if (source.documentType === 'judgment' && (!source.court || !source.caseNumber || !source.legalPosition)) warn('SOURCE_METADATA_INCOMPLETE', 'court', 'Для судового рішення потрібні суд, номер справи та конкретна правова позиція; застосовність не є універсальною.');
    }
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
      if (ids.indexOf(id) !== index) errors.push(issue('DUPLICATE_SOURCE_REFERENCE', [...path, index], 'Джерело повторюється в одному переліку.', nodeId));
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
        return source?.sourceType === 'normative' && source.verificationStatus === 'expert_checked' && !!source.verificationEvidence && !!source.relevance;
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
  if (scenario.publicationStatus === 'published' && scenario.sources.some(source => source.sourceType === 'normative' &&
    (!scenario.contentCreatedAt || !source.documentType || !source.documentDate || !source.pinpoint || !source.issuer || !source.url || !source.versionAsOf || !source.revision || !source.relevance || !source.verificationEvidence ||
      (source.documentType && ['law', 'code', 'statute', 'order'].includes(source.documentType) && !source.documentNumber) ||
      (source.documentType === 'judgment' && (!source.court || !source.caseNumber || !source.legalPosition))))) {
    errors.push(issue('PUBLICATION_NOT_ALLOWED', ['sources'], 'Публікація нормативної основи потребує повних реквізитів, дати версії сценарію та доказу перевірки застосовності.'));
  }
  return { errors, warnings };
}
