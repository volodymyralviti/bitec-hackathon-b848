import { AbstractControl, FormArray, FormControl, FormGroup } from '@angular/forms';

export type EditorGroup = FormGroup<Record<string, AbstractControl>>;
const originalKeys = new WeakMap<EditorGroup, Set<string>>();
const optionalText = new Set(['context', 'issuer', 'url', 'fileCitation', 'documentDate', 'pinpoint', 'legalStatus', 'reviewedAt', 'reviewerRole', 'evidenceRef', 'documentType', 'documentNumber', 'relevance', 'applicabilityQuestions', 'verificationEvidence', 'court', 'caseNumber', 'legalPosition', 'legalQuestions', 'contentCreatedAt']);
const nullable = new Set(['revision', 'versionAsOf', 'verifiedAt']);

export function buildControl(value: unknown): AbstractControl {
  if (Array.isArray(value)) return new FormArray(value.map(buildControl));
  if (value && typeof value === 'object') {
    const input = value as Record<string, unknown>;
    const fields = { ...input };
    if ('sourceType' in input) {
      for (const name of ['issuer', 'url', 'fileCitation', 'documentDate', 'pinpoint', 'documentType', 'documentNumber', 'relevance', 'applicabilityQuestions', 'verificationEvidence', 'court', 'caseNumber', 'legalPosition']) fields[name] ??= '';
      fields['expertReviewRequired'] ??= true;
    }
    if ('schemaVersion' in input) fields['contentCreatedAt'] ??= '';
    if ('narrative' in input && 'type' in input) fields['context'] ??= '';
    if ('label' in input && 'nextNodeId' in input) { fields['legalStatus'] ??= ''; fields['legalQuestions'] ??= ''; fields['schedule'] ??= []; }
    const group = new FormGroup(Object.fromEntries(Object.entries(fields).map(([key, child]) => [key, buildControl(child)])));
    originalKeys.set(group, new Set(Object.keys(input)));
    return group;
  }
  return new FormControl<unknown>(value);
}

export function serializeControl(control: AbstractControl, key = ''): unknown {
  if (control instanceof FormArray) return control.controls.map(child => serializeControl(child));
  if (control instanceof FormGroup) {
    const result: Record<string, unknown> = {};
    for (const [name, child] of Object.entries(control.controls as Record<string, AbstractControl>)) {
      const value = serializeControl(child, name);
      if (optionalText.has(name) && (value === '' || value === null)) continue;
      if (name === 'expertReviewRequired' && value === true && !originalKeys.get(control)?.has(name)) continue;
      if (name === 'schedule' && Array.isArray(value) && !value.length && !originalKeys.get(control)?.has(name)) continue;
      result[name] = value;
    }
    return result;
  }
  const value: unknown = control.value;
  return nullable.has(key) && (value === '' || value === null) ? null : value;
}

export function freshItem(key: string, type = 'decision'): unknown {
  const id = `${key === 'schedule' ? 'event' : type}-${crypto.randomUUID()}`;
  const effect = { metric: 'transparency', delta: 0, explanation: 'Опишіть підставу зміни.' };
  if (key === 'sources') return { sourceId: id, title: 'Нове джерело', sourceType: 'editorial', fileCitation: 'Вкажіть точний локатор.', versionAsOf: null, revision: null, verificationStatus: 'unverified', verifiedAt: null };
  if (key === 'effects' || key === 'immediateEffects') return effect;
  if (key === 'schedule') return { id, trigger: { type: 'after_decisions', count: 1 }, effects: [effect], consequenceText: 'Опишіть відкладений наслідок.' };
  if (key === 'choices') return { id, label: 'Нова альтернатива', explanation: 'Опишіть користь, ризики й обмеження.', nextNodeId: '', immediateEffects: [effect], sourceIds: [] };
  if (key === 'nodes') {
    const common = { id, type, title: 'Новий етап', narrative: 'Опишіть ситуацію.', sourceIds: [] };
    if (type === 'narrative') return { ...common, nextNodeId: '' };
    if (type === 'decision') return { ...common, valuesInTension: ['Перша цінність', 'Друга цінність'], choices: [freshItem('choices'), freshItem('choices')] };
    return { ...common, debrief: { summary: 'Поясніть результат.', shortTerm: 'Опишіть короткострокові наслідки.', longTerm: 'Опишіть довгострокові наслідки.', perspectives: ['Опишіть перспективу сторони.'], trustAndReputation: 'Поясніть вплив на довіру.', valuesInTension: ['Перша цінність', 'Друга цінність'], reflectionQuestions: ['Який новий факт змінив би рішення?'], sourceIds: [], limitations: 'Авторська чернетка без експертної перевірки.' } };
  }
  return '';
}

export const FIELD_LABELS: Record<string, string> = {
  sources: 'Нормативна база та джерела', documentType: 'Тип документа', documentNumber: 'Номер документа', contentCreatedAt: 'Дата створення цієї версії сценарію (якщо відома)', relevance: 'Релевантність для дилеми', applicabilityQuestions: 'Невирішені питання застосовності', verificationEvidence: 'Доказ звірки з першоджерелом (не експертне схвалення)', expertReviewRequired: 'Потребує експертного review (для нормативних джерел обов’язкове перед публікацією)', court: 'Суд', caseNumber: 'Номер справи', legalPosition: 'Конкретна правова позиція та межі застосування', legalQuestions: 'Невирішені правові питання цього рішення',
  schemaVersion: 'Версія формату', id: 'ID', version: 'Версія матеріалу (SemVer)', language: 'Мова', title: 'Назва', summary: 'Короткий опис', basedOn: 'Атрибуція та характер адаптації', publicationStatus: 'Статус показу', contentReview: 'Походження та людське review', status: 'Статус review', demoOnly: 'Лише для демонстрації', aiAssisted: 'Створено за участю ШІ', startNodeId: 'Початковий вузол', nodes: 'Вузли історії', type: 'Тип', narrative: 'Текст ситуації', context: 'Контекст і обмеження', sourceIds: 'Посилання на джерела', valuesInTension: 'Цінності в напрузі', choices: 'Альтернативи', label: 'Текст альтернативи', explanation: 'Користь, ризики й пояснення', nextNodeId: 'Наступний вузол', immediateEffects: 'Негайні ефекти', schedule: 'Відкладені події', legalStatus: 'Правовий статус у матеріалі', metric: 'Вимір', delta: 'Зміна (ціле від −10 до 10)', effects: 'Ефекти події', trigger: 'Тригер', count: 'Кількість наступних рішень', nodeId: 'Вузол активації', consequenceText: 'Текст відкладеного наслідку', debrief: 'Розбір завершення', shortTerm: 'Короткострокові наслідки', longTerm: 'Довгострокові наслідки', perspectives: 'Погляди різних сторін', trustAndReputation: 'Довіра та репутація', reflectionQuestions: 'Питання для рефлексії', limitations: 'Межі інтерпретації', sourceId: 'ID джерела', sourceType: 'Тип джерела', issuer: 'Видавець', url: 'Публічний URL', fileCitation: 'Точна файлова цитата', documentDate: 'Дата документа', versionAsOf: 'Редакція станом на', revision: 'Назва редакції', pinpoint: 'Стаття, пункт або сторінка', verificationStatus: 'Статус перевірки джерела', verifiedAt: 'Дата фактичної перевірки', reviewedAt: 'Час завершеного review', reviewerRole: 'Роль фактичного рецензента', evidenceRef: 'Посилання на запис review'
};
