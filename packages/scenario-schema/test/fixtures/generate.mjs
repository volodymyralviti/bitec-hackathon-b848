// Synthetic test data only; never published as reviewed educational content.
import { writeFileSync } from 'node:fs';

const effect = (delta = 1) => ({ metric: 'trust', delta, explanation: 'Синтетична зміна для тестування контракту.' });
const choice = (id, nextNodeId) => ({ id, label: `Тестовий варіант ${id}`, explanation: 'Пояснення тестового вибору.', nextNodeId, immediateEffects: [effect()], sourceIds: ['fixture-note'] });
const decision = (id, targets) => ({
  id, type: 'decision', title: 'Тестове рішення', narrative: 'Синтетична ситуація без правових тверджень.',
  sourceIds: ['fixture-note'], valuesInTension: ['Прозорість', 'Швидкість'], choices: targets.map((target, i) => choice(`option-${i + 1}`, target)),
});
const ending = id => ({
  id, type: 'ending', title: 'Тестове завершення', narrative: 'Тестовий маршрут завершено.', sourceIds: ['fixture-note'],
  debrief: {
    summary: 'Підсумок синтетичних наслідків.', shortTerm: 'Умовний негайний результат.', longTerm: 'Умовний подальший результат.',
    perspectives: ['Умовна навчальна група.'], trustAndReputation: 'Пояснення впливу на довіру без оцінювання людини.',
    valuesInTension: ['Прозорість', 'Швидкість'], reflectionQuestions: ['Які дані допомогли б обґрунтувати рішення?'],
    sourceIds: ['fixture-note'], limitations: 'Синтетичний fixture; не навчальний кейс і не правова рекомендація.',
  },
});
const valid = {
  schemaVersion: '1', id: 'synthetic-branching', version: '0.1.0', language: 'uk', title: 'Тест графа', summary: 'Лише синтетичні дані для автоматизованих тестів.',
  basedOn: [], publicationStatus: 'demo', contentReview: { status: 'draft', demoOnly: true, aiAssisted: true }, startNodeId: 'intro',
  sources: [{ sourceId: 'fixture-note', title: 'Внутрішня тестова примітка', sourceType: 'editorial', fileCitation: 'packages/scenario-schema/test/fixtures/valid.json', versionAsOf: null, revision: 'fixture-v1', verificationStatus: 'unverified', verifiedAt: null }],
  nodes: [
    { id: 'intro', type: 'narrative', title: 'Вступ', narrative: 'Тестовий вступ без рішення.', sourceIds: [], nextNodeId: 'd1' },
    decision('d1', ['d2a', 'd2b']), decision('d2a', ['d3', 'd3']), decision('d2b', ['d3', 'd3']), decision('d3', ['end-a', 'end-b']), ending('end-a'), ending('end-b'),
  ],
};
valid.nodes[1].choices[0].schedule = [{ id: 'later-a', trigger: { type: 'after_decisions', count: 1 }, effects: [effect(-1)], consequenceText: 'Тестовий наслідок після наступного рішення.' }];
valid.nodes[1].choices[1].schedule = [{ id: 'later-b', trigger: { type: 'on_enter_node', nodeId: 'd3' }, effects: [effect()], consequenceText: 'Тестовий наслідок при вході у третє рішення.' }];
const minimal = structuredClone(valid);
minimal.id = 'synthetic-minimal';
minimal.startNodeId = 'd1';
minimal.nodes = [decision('d1', ['d2', 'd2']), decision('d2', ['d3', 'd3']), decision('d3', ['end-a', 'end-a']), ending('end-a')];
minimal.sources[0].fileCitation = 'packages/scenario-schema/test/fixtures/minimal.json';
for (const [name, data] of Object.entries({ valid, minimal })) {
  writeFileSync(new URL(`./${name}.json`, import.meta.url), JSON.stringify(data, null, 2) + '\n');
}
