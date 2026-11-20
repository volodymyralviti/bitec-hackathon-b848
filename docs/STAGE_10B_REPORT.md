# Stage 10B — результати реалізації

**TECHNICAL IMPLEMENTATION — PASS.**
**SOURCE VERIFICATION — NOT VERIFIED.**
**EXPERT CONTENT APPROVAL — PENDING.**

## Checkout та межі

Гілка: `stage08-release`, tracking `origin/stage08-release`. Перед роботою дерево
чисте, staged/untracked відсутні. Node v22.22.3, pnpm 10.0.0, engine-strict=true.
Після роботи зміни лише unstaged/untracked; staged немає. Ніяких commit, push,
merge, rebase, reset, clean, stash чи deployment. Вихідні scenario JSON та
`packages/scenario-engine/**` без diff. Lockfile й залежності не змінені.

У фактичному checkout відсутні окремий публічний Demo Studio та AI/mock модуль.
Stage 10 не підтягувався з інших гілок. Перевірено чинний захищений Studio,
Scenario API, Solo, Debrief та Classroom. N/A для неіснуючих інтеграцій не означає,
що вони реалізовані чи протестовані.

## Що реалізовано

Розширено existing form-based sources, без другого реєстру. Додані необов’язкові
поля документа, релевантності, доказів та судових реквізитів. `sourceType` лишається
methodology/normative/editorial, verificationStatus — unverified/team_checked/
expert_checked, legalStatus — allowed/restricted/uncertain. `schemaVersion=1`,
поточні ESM/CJS exports й старі CIDS JSON сумісні.

Нові source fields: documentType, documentNumber, relevance,
applicabilityQuestions, verificationEvidence, expertReviewRequired, court,
caseNumber, legalPosition. Choice: legalQuestions. Scenario: contentCreatedAt
(необов’язкова фактична дата саме версії, не дата імпорту). Невідомі редакції
залишаються nullable; відсутні поля не заповнюються вигаданими значеннями.

Зв’язки лишаються sourceIds для narrative/decision/ending, choice та debrief.
Видалення використаного джерела заблоковане до перепризначення посилань;
прямі dangling references відхиляє shared validator. Показані українські labels,
стандартні доступні input/select/textarea, дата, read-only review та disabled
expert options. Використано чинний редактор, без дубліката компонентів.

ERROR блокує некоректну структуру, URL, дати, дублі, dangling references,
суперечливу класифікацію та неправдиві metadata-combinations. Неповні реквізити
неперевіреної нормативної чернетки й відсутня релевантність — WARNING. Невідома
дата сценарної версії — INFO. INFO зберігається у warnings для сумісності API;
legacy severity визначається колекцією. Draft можна зберегти з warnings.
Production publication потребує повних реквізитів, дати сценарію, доказів,
expert_checked джерел і завершеного людського review, demoOnly=false.

Allowed/restricted потребує expert_checked нормативного source з evidence та
relevance. Автор не має права записати expert_checked/expert_approved.
Чинний protected review endpoint доповнений optional legalAssessments
[{nodeId, choiceId, legalStatus}], щоб реальний рецензент міг оцінити конкретний
choice без зміни сюжету, targets, deltas або triggers. Unknown/duplicate choice
і unsupported status відхиляються. Reviewer key не доводить кваліфікацію людини:
перевірка повноважень та evidence лишається відповідальністю команди.

У Solo — лише джерела поточного node й selected choice. У Debrief — чинний
engine-derived набір visited-node/selected-choice/ending-debrief sources,
доповнений питаннями застосовності фактично обраних рішень. Джерела компактні,
розгортаються, показують редакцію, локатор, статус, посилання й relevance.
Методика не називається законом. Для normative без expert_checked показано:
«Правову застосовність цього джерела ще не підтверджено».

## Команди й результати

| Команда | Результат |
|---|---|
| `pnpm install --frozen-lockfile` | PASS; already up to date; повторено з мережевим доступом після sandbox metadata-fetch warning |
| `pnpm build` | PASS; schema ESM/CJS/JSON Schema, engine, Nest, Angular production та schema import smoke; public assets allowlist PASS |
| `pnpm typecheck` | PASS; всі workspace packages/apps |
| `pnpm test` | PASS: schema 40, engine 14, assets 8, Angular Karma 54, Nest unit 9, Nest e2e 21 — разом 146 |
| `pnpm lint` | PASS; чинний root lint перевіряє schema, engine і server; client ESLint у workspace відсутній |
| `node content/qa/validate.mjs` | PASS; обидва success=true, по 3 чесні SOURCE_UNVERIFIED |
| `node --test content/qa/content.test.mjs` | PASS: 8/8, включно з усіма 16 engine routes |
| `git diff --check` | PASS; Git попереджає про LF→CRLF normalization, не whitespace errors |
| `node apps/client/scripts/smoke-studio.mjs` | PASS; реальний Chrome + Nest, ізольоване тимчасове сховище |
| `node apps/client/scripts/smoke-solo.mjs` | PASS; обидва кейси по 3 рішення, debrief, restart, keyboard, mobile 360px |
| `node apps/client/scripts/smoke-classroom.mjs` | PASS; 4 contexts, 3 учасники, 3 раунди, aggregate-only, suppression для 2 голосів |

У PowerShell використано `pnpm.cmd` та
`$env:CHROME_BIN='C:/Program Files/Google/Chrome/Application/chrome.exe'`.
Початковий sandbox Angular build мав Access is denied; повтор поза sandbox PASS.
Початкові lint formatting errors у новому server test виправлено форматуванням
лише змінених server-файлів; фінальний lint запускався без --fix.
Раніший e2e stub вважав team_checked достатнім для allowed: його оновлено під
фактичний protected reviewer workflow, фінальний повний test PASS без skip.
Під час проміжного Karma run були nonblocking NG0956 tracking warnings.

## Security та browser smoke

Негативні API tests: відсутній ключ, cross-role ключ, усі private operations,
public lookup приватної чернетки, client-forged source expert_checked та
expert_approved, author-access до reviewer endpoint, invalid legal assessments.
Результати: 401/422 відповідно до контракту, disabled role 503, private public
lookup 404. Reviewer approval перевірено тільки synthetic stub у temp store.
Жодного реального документа ці тести не схвалюють.

Studio browser smoke створив synthetic normative source через форму, указав
тестовий пункт/редакцію, прив’язав до choice, зберіг private draft, експортував,
імпортував без втрати source metadata, виконав preview до debrief й побачив
unverified warning. Лінк https://zakon.rada.gov.ua/ відкрито в окремій вкладці
з user gesture. Це **не** перевірка HTTP доступності або змісту правового акта.
На 360px горизонтального overflow немає; consoleErrors=[] у всіх smoke.

Немає server URL checker або HTTP fetch довільного source URL — SSRF endpoint
не створено. Автоматично перевіряється лише формат, без підміни source/expert
verification. Нових API endpoints, AI provider, БД чи персональних даних немає.

## Першоджерела та контент

| Фактично перевірені першоджерела / редакції | Результат |
|---|---|
| Жодного | Немає підстав заявляти verified або expert approval |

| Непідтверджений кандидат | URL / локатор | Результат та наступна дія |
|---|---|---|
| CIDS Ukrainian PDF | 11388-CIDS-rapport-2-2024-UKR-skjerm.pdf; case №16/№1, шість кроків, п’ять перевірок, атрибуція | У checkout відсутній; https://cids.no/ недоступний browsing tool; отримати PDF і звірити сторінки/видання/умови |
| «Про публічні закупівлі», №922-VIII, 25.12.2015 | https://zakon.rada.gov.ua/laws/show/922-19#Text ; ст.5 як кандидат для звірки | Timeout; редакція/застосовність не підтверджені; визначити закупівельний режим і повноваження |
| «Про запобігання корупції», №1700-VII, 14.10.2014 | https://zakon.rada.gov.ua/laws/show/1700-18#Text ; ст.28 як кандидат для звірки | Timeout; редакція/застосовність не підтверджені; визначити суб’єктів, конфлікт та канали рекомендацій |
| Внутрішні професійні/інформаційні процедури | Ще не визначено | Правовий експерт має ідентифікувати публічний документ під вигаданий контекст |

Жодного кандидата не внесено до scenario JSON як підтверджену правову основу.
Обидва JSON незмінні, draft/demoOnly=true/aiAssisted=true, по три unverified
джерела, choices uncertain. Усі 16 маршрутів мають три рішення. Новий тест
порівнює повні engine states і debrief до/після source metadata: немає змін
metrics, choices outcomes чи delayed events.

Окремі review dossiers: `content/teaching-notes/urgent-supply-content-review.md`
та `content/teaching-notes/truth-under-pressure-content-review.md`.
Вони містять питання правовому експерту, фахівцю з доброчесності, викладачу й
автору. 2026-11-19 в старому content README — дата підготовки, не підтверджений
contentCreatedAt конкретної версії. Автор має підтвердити дату до звірки редакцій.

## Acceptance

| Критерій | Статус |
|---|---|
| Додавання джерел без JSON | PASS |
| Точна норма та редакція | PASS |
| Зв’язки з вузлами й choices | PASS |
| Валідація реквізитів/посилань, draft warnings | PASS |
| Релевантні джерела Solo | PASS |
| Джерела фактичного маршруту Debrief | PASS |
| Чесні unverified warnings | PASS |
| URL check не прирівняно до експертизи | PASS |
| Два CIDS JSON валідні | PASS |
| Import/export без втрат metadata | PASS |
| Приватні чернетки захищено | PASS |
| Demo Studio без privileged access | N/A — окремий Demo Studio у checkout відсутній; public/private separation перевірено |
| Усі 16 маршрутів без зміни результатів | PASS |
| Build/typecheck/test/lint | PASS |
| Інструкція автору | PASS — docs/LEGAL_SOURCES_UA.md |

## Змінені файли

Client: README.md; scripts/smoke-studio.mjs;
src/app/scenario-studio/{form-model.ts,editor-field.component.ts,
editor-field.component.html,studio-api.service.ts,studio.component.html};
src/app/shared/ui/sources.component.ts; src/app/solo/{solo-player.component.ts,
solo-player.component.html,solo-flow.spec.ts};
src/app/debrief/{debrief.component.ts,debrief.component.html}.

Server: README.md; src/scenarios/scenario.service.ts; test/scenarios.e2e-spec.ts.
Schema: README.md; src/{schema.ts,diagnostics.ts,provenance.ts}.
Content: README.md; qa/content.test.mjs.
Локально оновлено ігнорований docs/SCENARIO_DSL.md (контракт, не приватні prompts).

Нові: apps/client/src/app/scenario-studio/sources.spec.ts;
packages/scenario-schema/test/sources.test.mjs; content/qa/source-engine.test.mjs;
два content-review dossiers; docs/LEGAL_SOURCES_UA.md;
docs/adr/0002-legal-source-metadata.md; цей report. Видалених файлів немає.

## Що команда має зробити до публічного релізу

1. Надати CIDS PDF, звірити cases/методику, бібліографію й reproduction conditions.
2. Підтвердити дату саме кожної сценарної версії та застосовний професійний режим.
3. Отримати офіційні історичні редакції та відтворювані докази звірки.
4. Компетентним людям перевірити застосовність, педагогіку й доброчесність;
   зафіксувати реальне review через окремий захищений workflow.
5. Старі власні checked normative записи без evidence доповнити або повернути
   до unverified. Не підвищувати статуси лише заради проходження validator.
6. Перед зміною demoOnly/publication повторити content/release review. Якщо
   Stage 09/10 будуть інтегровані згодом, окремо перевірити Demo/AI ізоляцію.

Автоматична робота завершена в межах Stage 10B; очікується архітектурне review.
