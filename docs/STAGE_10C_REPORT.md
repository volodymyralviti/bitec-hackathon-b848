# Stage 10C — три локальні військово-освітні дилеми

**TECHNICAL CONTENT — PASS.**
**OFFICIAL SOURCE CHECK — PARTIAL (застосовні редакції BLOCKED).**
**EXPERT APPROVAL — PENDING.**
**DEMO CATALOG READY — NO.**

Тексти офіційних актів прочитані й конкретні положення звірені, але юридичну
редакцію на дату сценаріїв не підтверджено. Тому це не нормативно підтверджені
публічні кейси. Усі три залишаються локальними draft/demoOnly/aiAssisted з
unverified sources, null verifiedAt і uncertain choices. У нормативних sources
versionAsOf/revision також null; редакція авторської моделі позначена окремо як неекспертна.

## Checkout, збереження попередньої роботи

- Робочий каталог: ethical-dilemmas-simulator; гілка `add_scenarios` не змінювалася.
- Перед стартом уже були незакомічені modified/untracked зміни Stage 10:
  client/routes/forms/smoke, server HOST/config, deployment/docs/CI. Staged не було.
- Зафіксовано SHA-256 **34 попередніх файлів**, включно з двома CIDS JSON та
  публічним index. Після роботи: **changed=[]**, усі ці файли збережені побайтово.
- Node v22.22.3, pnpm 10.0.0, engine-strict=true. Ніяких нових залежностей.
- Stage 10B юридичні поля й gates та Stage 10 Demo Studio присутні в робочій
  копії, хоча частина Stage 10 ще uncommitted. Використані без копіювання/перезапису.
- Git switch/stash/reset/clean/fetch/pull/merge/rebase/commit/push/deploy не виконувалися.

## Сюжети й технічна структура

| Сценарій | Логлайн та відмінний конфлікт | Вузли / decisions / choices / endings / routes | Рішень на маршрут |
|---|---|---|---|
| **Підпис під сумнівом**, report-under-pressure | Курсант звіряє навчальний облік: «відвідав» стало «виконав», строк тисне, а підпис не може замінити відсутню звірку. Достовірність, лояльність і межі повноважень | 12 / 7 / 14 / 4 / 8 | 3..3 |
| **Хто заслуговує на місце?**, fair-selection | Штатний офіцер-керівник і голова відбору має брата серед кандидатів; належна заміна не усуває всіх питань, а доступ до підготовки був нерівним. Неупередженість, умови, приватність | 12 / 7 / 14 / 4 / 8 | 3..3 |
| **Тиша після шикування**, quiet-after-formation | Курсант підтримує людину після принизливих епізодів, маючи неповну картину й прохання не розголошувати. Гідність, підтримка та справедлива перевірка без готового вироку | 12 / 7 / 14 / 4 / 8 | 3..3 |

Кожен граф: 1 narrative → 1+2+4 decision nodes → 4 endings, без cycles,
unreachable або dead ends. Кожний choice змінює контекст чи спосіб завершення,
містить обґрунтування immediate effects. У кожному кейсі 7 delayed IDs,
обидва типи trigger, реальні reachable activation points і branch-dependent
unrealized event. Усі персонажі/заклади вигадані, повнолітні; немає бойових
даних, реальних свідчень, персональних профілів або єдиного морального балу.

Це не переробка CIDS сюжету truth-under-pressure: перший кейс про облік,
різне значення колонок і межі підпису курсанта, а не професійний висновок
на догоду політичній позиції. Два інші — про процедуру відбору й підтримку гідності.

## Нормативні прив’язки: точні URL та межі

Усі акти ухвалені Верховною Радою України. Дата нових версій — фактичне
створення **20.11.2026**, не припущена дата старого матеріалу.
Для кожного рядка: source verificationStatus=unverified, юридична редакція
на 20.11.2026 **не встановлена**, human review **потрібен**.

| Кейс | Акт / дата / номер | Locator та точний офіційний URL | Роль, зв’язок і межа |
|---|---|---|---|
| report | Статут внутрішньої служби ЗСУ, 24.03.1999 №548-XIV | ст.11 — https://data.rada.gov.ua/ogd/zak/perv/text/d33093.htm | Курсант-військовослужбовець; report-intro/усі decisions, choice 1. Загальні обов’язки, не порядок заповнення звіту |
| report | Той самий Статут | ст.16 — той самий URL | Курсант лише зводить позначки, викладач підписує; усі decisions/choice 2, debrief. Обсяг доручення уточнити |
| report | «Про академічну доброчесність», 18.12.2025 №4742-IX | ст.8 ч.2; прикінцеві/перехідні пп.1–2 — https://data.rada.gov.ua/ogd/zak/perv/text/d551694.htm | Лише debrief питання: чи є аркуш академічним твором? Не кваліфікація порушення |
| fair-selection | «Про запобігання корупції», 14.10.2014 №1700-VII | ст.3 ч.1 п.1 пп.«г» — https://data.rada.gov.ua/ogd/zak/perv/text/d433082.htm | Штатний офіцер, начальник навчального відділення з організаційно-розпорядчими функціями, не курсант-кандидат; intro/decisions/choice 1 |
| fair-selection | Той самий Закон | ст.28 ч.1 пп.1–4 у зв’язку зі ст.3 — той самий URL | Родинний інтерес, повідомлення/участь/належне врегулювання; decisions/choice 2. Фактичну суб’єктність, конфлікт та адресата має перевірити експерт |
| fair-selection | Статут внутрішньої служби, №548-XIV | ст.16 — https://data.rada.gov.ua/ogd/zak/perv/text/d33093.htm | Debrief: повноваження заміни й перенесення; не самопризначене право змінити процедуру |
| quiet | Статут внутрішньої служби, №548-XIV | ст.49 — https://data.rada.gov.ua/ogd/zak/perv/text/d33093.htm | Повнолітній курсант-військовослужбовець, гідність; intro/decisions/choice 1. Не встановлює вину |
| quiet | Дисциплінарний статут ЗСУ, 24.03.1999 №551-XIV | ст.110–111 — https://data.rada.gov.ua/ogd/zak/perv/text/d32638.htm | Decisions/choice 2, debrief: право звернення й предмет процедури. Належний канал та межі конфіденційності уточнити |
| quiet | Статут внутрішньої служби, №548-XIV | ст.11 — https://data.rada.gov.ua/ogd/zak/perv/text/d33093.htm | Debrief: повага/підтримка, без надання курсанту повноважень розслідувати |

Повна таблиця A–H, короткі перекази, canonical URLs, суб’єктний склад,
невідоме та питання до експерта: [legal-source-evidence.md](../content/qa/legal-source-evidence.md).

## Фактична перевірка першоджерел

- Офіційні zakon.rada print pages — browsing timeout; прямий curl поза sandbox
  до Статуту — **403**, а не підтвердження тексту.
- Чотири HTML copies **data.rada.gov.ua** — **200**, повні файли отримані, релевантні положення прочитані;
  реквізити й перелічені статті звірені з отриманими копіями, не secondary sites.
- Збережено HTTP Date/Last-Modified, bytes, **SHA-256**, extracts у
  [legal-source-observations.json](../content/qa/legal-source-observations.json).
  Offline capture script і спосіб повторення описані в evidence-документі.
- У ст.3 №1700-VII справді прочитані винятки щодо перелічених категорій курсантів.
  Саме тому головний персонаж відбору — офіцер-посадовець; його посадову
  суб’єктність не оголошено підтвердженою без відповідних документів.
- В офіційному тексті №4742-IX прочитано ст.8 та перехідні правила, включно
  зі зміною ст.42 Закону «Про освіту». Стару ст.42 як готову підставу не використано.
  Комітет ВРУ [повідомляє про введення закону в дію 31.07.2026](https://kno.rada.gov.ua/print/77857.html).
  Це не замінює перевірку офіційного опублікування й точних temporal rules.

**НЕ перевірено:** authoritative history редакцій на 20.11.2026, увесь ланцюг
змін, дата застосовної редакції, офіційне опублікування №4742-IX, місцеві
посадові інструкції/процедури та експертна застосовність. Last-Modified не
переписаний у versionAsOf. Судова практика не використовувалася.

Тому повного normative PASS немає. Public index, production assets і real
Scenario API seed лишилися з двома CIDS кейсами; три нові туди не додані.

## Матриці, metrics, applied/unrealized

[Повна компактна матриця 24 маршрутів](../content/qa/college-route-matrix.md).
Машинозчитувані докази з node/choice IDs, triggers, ending, чотирма metrics,
applied/unrealized та debrief sources:

- [report-under-pressure.routes.json](../content/qa/report-under-pressure.routes.json)
- [fair-selection.routes.json](../content/qa/fair-selection.routes.json)
- [quiet-after-formation.routes.json](../content/qa/quiet-after-formation.routes.json)

Наприклад, перший маршрут (1→1→1): report `[4,4,2,-6]`, selection `[6,3,0,-3]`,
quiet `[4,4,4,-5]`. Порядок: transparency/fairness/trust/effectiveness.
Ці числа не підсумовуються в «найкращу відповідь».

У кожному кейсі event 2 приходить на third-aa, а на third-ab є unrealized;
навіть якщо текст події видно в завершеному debrief як unrealized, це не факт
для доведення версії. Решта due events зіставлені з довжиною маршруту та
майбутнім входом у node. Oracle використовує authored deltas й route membership,
не реалізує ще один runtime engine. Real public Engine порівняний із ним
на всіх 24 шляхах, повторно для determinism; exactly-once identities/timeline,
scenario immutability і actual-route debrief source IDs перевірені.
Первинні 16 CIDS шляхів окремо пройдені, JSON/map checks та SHA baseline незмінні.

## Команди й результати

У PowerShell використовувався pnpm.cmd, CHROME_BIN до встановленого
C:/Program Files/Google/Chrome/Application/chrome.exe.

| Команда | Фактичний результат |
|---|---|
| `pnpm install --frozen-lockfile` | PASS; already up to date, dependency/lockfile без змін |
| `pnpm build` | PASS; Angular/Nest/packages, allowlisted assets рівно два, schema import smoke |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS: schema 40, engine 14, assets 8, Angular 62, Nest unit 9, Nest e2e 21 = **154** |
| `pnpm lint` | PASS; чинний workspace scope без autofix |
| `node content/qa/validate.mjs` | PASS усіх п’яти content JSON; нові три не отримують legal PASS |
| `node --test content/qa/content.test.mjs` | PASS **16/16**, включно з 24 новими real-engine routes і 16 старими |
| `node content/qa/college-qa.mjs --write-maps` | Створені/перевірені нові matrices; старі maps не переписувались |
| `node apps/client/scripts/check-solo-routes.mjs` | PASS, первинні 16 CIDS routes |
| `node scripts/check-release-safety.mjs` | PASS, credential patterns 0, CIDS review flags незмінні |
| `git diff --check` | PASS |

Без skip/заміни framework. Проміжний запуск browser QA мав startup timeout
під час паралельних перевірок; скрипт доповнено bounded 45-second readiness
retry із per-request timeout. Відомі nonblocking NG0956 tracking warnings
у Karma не оголошуються legal або content approval.

## Browser smoke — що саме доведено

`node content/qa/browser-college.mjs`: реальний Chrome, production Angular,
Nest/Socket.IO, окремі browser contexts і **QA-only loopback seed manifest**
з трьома копіями у temp directory. Це не зміна або публікація real allowlist.
В реальному production dist нові `/scenarios/<id>.json` відсутні, HTTP 404.

Для **кожного** з трьох кейсів:

- QA catalog показав назву й demo-only статус; production catalog збережено з двома.
- Solo: вступ → три рішення → ending/debrief → restart; фінальні metrics збіглися
  з route-1 oracle, джерела актуального node/choice й exact official URL доступні.
- Показані unverified та невстановлена редакція, без підміни датою створення.
- Demo Studio: import → validate → export (deep equality) → engine preview/debrief
  → reset → повторний import; protected calls **0**, temp server store незмінний.
- Author Studio: login із випадковим test-only secret → import → приватна копія
  зі зміненим QA ID → save. Sources збережені без втрат; guest private GET **401**,
  public lookup приватної копії **404**. Реальні ключі/сховище користувача не задіяні.
- Classroom: host + **3** participants, **3** rounds із новими graph/choice IDs,
  aggregate лише після close, shared debrief. Stage 07 privacy contract не змінений.
- Mobile **360px** без horizontal overflow, keyboard Enter підтверджує рішення,
  **consoleErrors=[]**.

Артефакт: ігнорований `.angular/stage10c/college-browser-report.json`.
Small-N suppression/reconnect окремо покриті чинними server e2e; не приписуються
новому browser script як додаткові browser перевірки. Офіційні URL читалися
через curl evidence, browser лише перевірив href/відображення, не правову чинність.

## Файли Stage 10C, окремо від наявних Stage 10

Змінені лише:

- content/README.md
- content/qa/content.test.mjs
- content/qa/validate.mjs

Створені:

- content/scenarios/report-under-pressure.json
- content/scenarios/fair-selection.json
- content/scenarios/quiet-after-formation.json
- content/teaching-notes/report-under-pressure.md
- content/teaching-notes/fair-selection.md
- content/teaching-notes/quiet-after-formation.md
- content/qa/college-qa.mjs
- content/qa/college.test.mjs
- content/qa/browser-college.mjs
- content/qa/capture-legal-evidence.mjs
- content/qa/legal-source-observations.json
- content/qa/legal-source-evidence.md
- content/qa/report-under-pressure.routes.json
- content/qa/fair-selection.routes.json
- content/qa/quiet-after-formation.routes.json
- content/qa/college-route-matrix.md
- docs/STAGE_10C_REPORT.md

Немає нових змін у apps/, engine/schema, server storage/gateway/guards,
AI policy, CIDS JSON або публічному index. Попередні Stage 10 modified/untracked
файли лишаються у Git status як були; вони не є роботою цього етапу.

## Перед реальним заняттям і public demo

1. Правовому експерту отримати dated official revision/історію на 20.11.2026
   і звірити актуальність на майбутню дату використання. Не брати HTTP cache date
   за законодавчу редакцію.
2. Для report: встановити, що за документ/доручення/підпис; окремо вирішити,
   чи взагалі застосовна ст.8 №4742-IX, не виводячи порушення з самої неточності.
3. Для selection: підтвердити посадові функції та суб’єктність за ст.3,
   механізм ст.28, повноваження заміни, критерії й межі доступу до результатів.
4. Для quiet: уточнити належний канал звернення, безпеку, межі конфіденційності
   й підтримку без встановлення вини самим курсантом.
5. Педагогу та фахівцю з доброчесності перевірити правдоподібність, баланс цін,
   вплив формулювань/метрик і прийнятність для аудиторії. Не просити реальних
   свідчень і не оцінювати моральність людини за вибором.
6. Зафіксувати реальне review через чинний protected workflow, а не поля,
   створені автоматично. Після source-level допуску окремо вирішити явний
   demo-allowlist; до того public readiness лишається **NO**.

Робота завершена в межах локального content/QA fallback. Жодного юридичного
або експертного PASS через технічні «зелені» тести не створено.
