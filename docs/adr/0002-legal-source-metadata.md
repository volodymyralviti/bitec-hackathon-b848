# ADR 0002 — нормативна основа навчальних сценаріїв

## Контекст

Stage 10B розширює реєстр `sources`, не створюючи іншого каталогу або engine.
У фактичному checkout є Stage 06–08, захищений Studio та reviewer API.
Окремого публічного Demo Studio, AI mock чи AI provider немає. Їх не додано.

## Рішення

Збережено `schemaVersion: "1"`, наявні `sourceType`, `verificationStatus`,
`legalStatus`, nullable редакції та `sourceIds` на вузлах, choices і debrief.
Нові поля необов’язкові: `documentType`, `documentNumber`, `relevance`,
`applicabilityQuestions`, `verificationEvidence`, `expertReviewRequired`,
`court`, `caseNumber`, `legalPosition`; у choice — `legalQuestions`;
у scenario — `contentCreatedAt` (ISO date саме цієї версії, не дата імпорту).
Існуючі JSON не мігруються, дефолти не записуються до них автоматично.

`documentType`: law/code/statute/order/procedure/ethics/methodology/judgment/other.
Юридичні акти й судові рішення належать до normative; methodology — лише до
methodology. Кодекс етики може бути нормативним або методичним залежно від
реального статусу документа. Судове рішення не універсальна норма.

Діагностика: `errors` блокують структуру/граф/суперечливі дати/класифікацію;
`warnings` не блокують draft. Нові повідомлення мають severity ERROR/WARNING/INFO;
legacy без severity визначаються колекцією. INFO зберігаються в warnings для
сумісності API, у UI позначаються INFO. Відсутні реквізити неперевіреної
нормативної чернетки — WARNING, не generic error. Публікація потребує повних
реквізитів і дати сценарної версії; невідома дата залишається питанням автору.

Формат URL не означає доступність чи достовірність. Сервер не fetch-ить URL:
немає HTTP checker, redirects чи SSRF-поверхні. Звірка з першоджерелом фіксується
окремо від експертного застосування. Checked normative потребує evidence;
allowed/restricted потребують expert_checked нормативного джерела з evidence
та relevance. Це посилення правил довіри; старі checked normative чернетки
без доказів потребуватимуть доповнення або повернення до unverified.

Чинна захищена review-операція приймає необов’язковий legalAssessments:
масив {nodeId, choiceId, legalStatus}. Це дозволяє рецензенту після звірки
зафіксувати allowed/restricted, тоді як автор подає uncertain. Перевіряються
існування choice, унікальність оцінок і допустимий статус; змінити сюжет,
наступний вузол, deltas або delayed triggers цим полем неможливо.

Автор не може записати expert_checked/expert_approved: наявний серверний gate
збережено й перевірено негативними тестами. Наявність рядка evidence не
автентифікує експерта: тільки окрема reviewer capability й фактична атестація
дозволяють reviewer workflow. expertReviewRequired=false не обходить publication
gate. Модель не доводить застосовність до кожного choice автоматично.

У Solo показуються джерела поточного вузла й обраного choice; у Debrief —
наявний engine-derived список джерел фактично пройдених вузлів і choices та
ending debrief. Engine не змінюється. При видаленні джерела форма вимагає спочатку
прибрати/перепризначити sourceIds; сервер відхиляє dangling references.

## Альтернативи й перевірки

Відхилено новий несумісний source registry, автоматичну юридичну експертизу,
довільний URL fetch, вигадане схвалення та зовнішній AI. Тести покривають
зворотну сумісність, JSON roundtrip, guard, форми, показ, усі 16 маршрутів
і незмінність metrics/delayed events. Окремі результати — у Stage 10B report.
