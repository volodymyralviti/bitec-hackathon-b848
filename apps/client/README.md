# Angular Solo Simulator — Stage 05

## Stage 06 — поточний стан API та Studio

Поточна гілка `scenario_api`. Збережено попередні staged зміни Stage 05.
Наведений нижче звіт Stage 05 є історичним; цей розділ замінює його твердження
про default static repository та відсутність API/Studio.

Default `ScenarioRepository` тепер **ApiScenarioRepository**: каталог із
`GET /api/scenarios`, повний JSON із `/api/scenarios/:id?version=...`, повторна
shared-schema/graph/provenance перевірка. Raw drafts відхиляються навіть із demoOnly.
API недоступний → error/retry, без прихованої підміни статичними файлами.
`StaticScenarioRepository` залишений для явного майбутнього offline binding;
PWA/offline зараз не заявлено. Generated assets містять лише явний demo manifest.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm dev:api
# окремий terminal:
pnpm dev:web
```

Dev proxy вже спрямовує `/api/**` на порт 3000. Production host повинен проксувати
`/api` до NestJS, віддавати assets і використовувати SPA fallback лише для frontend
маршрутів. Налаштування capability й файлового сховища: [server README](../server/README.md).

`/studio` відкриває захищений авторський workspace. Ключ вводиться користувачем
у password-поле; він живе лише в пам’яті вкладки й надсилається в Bearer header
лише author API. Ключа немає в Angular build, JSON export, localStorage чи cookies.
Кнопка закриття доступу очищає ключ, форму та локальний preview. Reload також
скидає доступ і незбережений матеріал. Інтерфейс попереджає про чутливі відомості.

Редактор використовує Reactive Forms, а не JSON textarea як основний інструмент:

- метадані, AI/demo flags, draft/in_review, точні nullable версії джерел;
- narrative/decision/ending, додавання й видалення вузлів і choices, переходи;
- values, пояснення, чотири метрики, immediate effects та обидва delayed triggers;
- debrief, перспективи, рефлексія й обмеження;
- локальна й серверна валідація `{path,code,message}`, посилання на поле помилки;
- окремий JSON file/paste import і download export, без зміни необов’язкових полів;
- приватне збереження з revision control; явний demo-only показ, незмінні public
  snapshots і створення наступної приватної SemVer-версії.

«Нова чернетка» завантажує структурний JSON із assets: вступ, три рішення,
по дві альтернативи, два endings і приклад delayed effect. Автор редагує текст
і структуру формами; новий матеріал не потребує зміни TS або індексу сценаріїв.
Це підказки з нульовими ефектами, не готовий перевірений кейс.
Некоректна форма не зберігається й не відкриває preview. Graph-invalid JSON
можна імпортувати для виправлення, але save/preview залишаються заблокованими.

`/studio/preview/:id/play` та `/debrief` повторно використовують **ті самі**
participant components й public engine. Route-scoped SoloSession та локальний
repository ізолюють draft run від поточного публічного проходження. Приватний
JSON не додається до catalog/assets і не запитується через public API.
Повернення в Studio зберігає форму в пам’яті; reload preview без draft показує
безпечну помилку. Жодні рішення або метрики не надсилаються на сервер.

Автор не може встановити завершене expert review: ці поля/опції readonly.
Імпортований публічний snapshot доступний read-only; «створити копію» скидає
review/source verification і залежні legal claims. Фактичний reviewer працює
окремим захищеним API; за відсутності людини reviewer capability вимкнений.
Оригінальні два CIDS JSON та їхня неперевірена атрибуція не змінювались.

### Відтворювана перевірка Stage 06

```powershell
$env:CHROME_BIN='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
pnpm build
pnpm typecheck
pnpm test
pnpm lint
node content/qa/validate.mjs
node --test content/qa/content.test.mjs
node apps/client/scripts/check-solo-routes.mjs
node apps/client/scripts/smoke-solo.mjs
node apps/client/scripts/smoke-studio.mjs
git diff --check
```

Обидва browser scripts запускають **реальний зібраний NestJS** із випадковим
runtime author key, вимкненим reviewer і новим temp-сховищем. Не використовують
дані/ключі розробника й не публікують у його сховище. Temp browser profiles/data
залишаються для діагностики; processes закриваються. Потрібні попередній build,
Node 22 та встановлений Chromium; зовнішні сервіси не потрібні.

Studio smoke: `/studio` → runtime access → нова чернетка → редагування метаданих
і трьох рішень → додавання choice → зламаний короткий маршрут блокується →
save private (public 404) → browser download/export/import exact roundtrip →
приватний player → три рішення → debrief → назад → явний demo-only →
перевірка незмінності. Mobile 360px, відсутність browser storage ключа та
console errors перевіряються програмно. Артефакти в ignored `.angular/`:
`studio-browser-report.json`, `studio-editor-desktop.png`, `studio-editor-mobile.png`,
`studio-private-debrief.png`. Solo smoke тепер теж працює через реальний API.

Обмеження: файлове сховище одного процесу замість не налаштованого PostgreSQL,
dev capabilities замість production identity, ручна перевірка review evidence,
відсутність Angular ESLint (перевірки compiler/Karma/browser). Немає Classroom,
AI, облікових записів або збереження індивідуального прогресу.

## Історичний звіт Stage 05

Stage 05 завершено технічно; матеріал очікує архітектурного й окремого content review.
Використано наявний Angular 21, shell, каталог, repository, preview та публічний
`@eds/scenario-engine`. Бізнес-логіка симуляції на frontend не дублюється.

## Запуск

Node **22.22.3**, pnpm **10.0.0**, `engine-strict=true`.
З кореня workspace:

```sh
pnpm install --frozen-lockfile
pnpm dev:web
```

`start/build/test/watch` клієнта спочатку будують schema/engine та готують
публічні assets. Статичний solo не потребує запущеного NestJS.

## Маршрути та поведінка

| URL | Поведінка |
|---|---|
| `/`, `/scenarios` | Каталог двох CIDS-inspired JSON; loading/error/empty/retry |
| `/scenarios/:id/preview` | Збережений read-only вступ і джерела, без початку run |
| `/scenarios/:id/play` | Вступ → рішення → feedback → наступний етап → ending |
| `/scenarios/:id/debrief` | Підсумок тільки завершеного run цього id/version |
| `/play`, `/debrief` | Перехід до поточного run; без потрібного state — посилання на каталог |

Після reload `/play` із id починається зі вступу. Прямий debrief без завершеного
run пояснює відсутність підсумку й пропонує відкрити проходження. Missing ID,
невалідний JSON і transport errors мають українські error states. Вибір іншого
сценарію створює новий run. Повернення до того самого id/version продовжує run
у пам’яті вкладки. Restart явно скидає state через `startScenario`.

Немає облікових записів, cookies, localStorage, telemetry чи backend-збереження
прогресу. Індивідуальні рішення не надсилаються. Закриття/reload вкладки втрачає
прогрес; це видимо пояснено у UI. Offline/PWA та мережеву анонімність не заявлено.
Інфраструктурні access logs налаштовуються окремо.

## Інтеграція engine

`solo/solo-session.service.ts` зберігає один in-memory `{scenario, state}` у Signal.
Сценарій клоновано й заморожено на початку run, як вимагає engine-контракт.
Використовуються лише public exports:

- `startScenario` — початок і restart;
- `getCurrentNode`, `getAvailableOptions` — відображення доступного контексту й choices;
- `advanceNarrative` — явні narrative transitions без збільшення кількості рішень;
- `makeDecision` — усі рішення, метрики та delayed event processing;
- `getDebrief` — authored explanation, фактичний маршрут, effects, sources й unrealized events.

Вибір option лише змінює локальний selection. Підтвердження виконує один engine
transition; selection очищується, feedback phase блокує повторне підтвердження.
Після feedback є окрема дія продовження. Тому pending events і наступний контекст
не показуються завчасно. Тільки застосовані entries з engine timeline відображаються
як наслідки. Метрики additive від нуля, без frontend clamp або спільного морального
балу. Unrealized events показуються окремо лише у debrief і не змінюють метрики.

Player переносить клавіатурний фокус на новий етап/feedback; семантичні кнопки
мають pressed-state, видимий focus, підтвердження й читабельні довгі назви.
Збережено skip-link, мобільні стилі, demo-only / AI-assisted / unverified labels.
Чинний DSL не має difficulty: UI пише «автором не визначена», а не вигадує рівень.
Правовий статус і CIDS-методика не перетворюються на новий юридичний висновок.

## Контент і API adapter

`ScenarioRepository.list()/getById()` повертають RxJS Observable. Binding у
`app.config.ts` використовує `StaticScenarioRepository`; Stage 06 може замінити
provider на API adapter без зміни feature views. Backend має окремо обмежувати
доступ до приватних чернеток.

`content/scenarios/index.json` — явний перелік файлів. Для додавання сценарію
достатньо валідного JSON і запису в індексі, без редагування TS-компонентів.
`prepare-scenarios.mjs` валідує тільки зазначені demoOnly/published файли та копіює
їх у generated `.angular/solo-content/`; весь content-каталог не публікується.
Private draft відхиляється. Browser повторно виконує public schema validation.
Внутрішні `src`/`dist` subpaths пакетів не імпортуються. Оригінальні тексти двох
сценаріїв, metadata review й source statuses не змінювались.

Зміни JSON під час dev server потребують повторного prepare/restart. Production
host має спершу віддавати assets, а інші frontend URL переписувати на `index.html`
для коректного reload deep links. Авторинг, Classroom, API та AI тут не реалізовані.

## Перевірки та реальні результати

```sh
pnpm build
pnpm typecheck
pnpm test
pnpm lint
node content/qa/validate.mjs
node --test content/qa/content.test.mjs
node apps/client/scripts/check-solo-routes.mjs
```

Усі наведені команди пройшли. Root test включив schema **28/28**, engine **14/14**,
Angular **28/28**, Nest unit **3/3**, Nest e2e **4/4**. Після додавання окремого
regression-тесту unrealized UI повторний client suite дав **29/29 PASS** та client
 typecheck PASS. Жодних skipped tests. Root lint перевіряє schema/engine/server;
окремий Angular ESLint у workspace не налаштований. Client перевірено compiler,
Karma й browser smoke. Production initial bundle **289.49 kB**, без budget warning.

Content QA: обидва `validateScenario.success=true`, errors=[]; по три очікувані
`SOURCE_UNVERIFIED` (`cids-case`, `cids-method`, `editorial-model`), graph errors /
warnings порожні. Це не юридична чи експертна верифікація.

`check-solo-routes.mjs` виконав через public engine **всі 16 реальних маршрутів**:
по 8 на сценарій, рівно 3 рішення на кожному, по 4 ending, усі очікувані delayed
IDs настали рівно один раз у відповідних фазах, pending/unrealized порожні.
Окремий test-only сценарій у Jasmine перевіряє показ unrealized event без зміни
фінальної метрики; навчальні JSON для цього не змінюються.

### Реальний browser smoke

```powershell
$env:CHROME_BIN='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
pnpm.cmd --filter client test
node apps/client/scripts/smoke-solo.mjs
```

Використано встановлений Edge 157 (headless), без нової browser dependency.
Smoke піднімає localhost static server над production output і закриває власний
browser/server після перевірки. Вибір і підтвердження виконуються клавішею Enter
через CDP; Tab/Enter також перевіряють skip-link.

1. `/` → каталог, два сценарії українською.
2. `urgent-supply`: `common-brief → shared-questions → recommend-minimum` →
   `limited-service` → debrief → restart.
3. `truth-under-pressure` на **360×800**: `peer-window → interim-options → test-access`
   → `conditional-pilot` → debrief → restart.
4. Перевірено відсутність горизонтального overflow на рішеннях і debrief,
   відсутність future consequence text до потрібного кроку, три decision records.
5. Реальні reload/direct debrief без state, missing ID, `/play` без run і повернення
   до каталогу оброблено без вигаданих результатів.
6. `Runtime.exceptionThrown`, `console.error`, browser Log errors: **[]**.

Фінальні метрики у порядку transparency / fairness / trust / effectiveness:

| Browser route | Значення |
|---|---|
| urgent-supply | **3 / 2 / 0 / 1** |
| truth-under-pressure | **4 / -1 / 1 / 0** |

Приклади реального timeline: у першому кейсі immediate `common-brief` дає
прозорість +1, справедливість +1, дієвість +2; після другого рішення настає
`supply-common-record` (прозорість +2), після третього — `supply-brief-rework`
(дієвість -2). У другому browser route `truth-peer-findings` і
`truth-interim-received` настають після другого рішення/при вході у третій вузол,
а `truth-pilot-workload` при вході в ending знижує дієвість на 1.

Локальні ignored QA artifacts: `.angular/solo-browser-report.json`,
`solo-catalog-desktop.png`, `solo-catalog-mobile.png`, `solo-decision-mobile.png`,
`solo-debrief-urgent-supply.png`, `solo-debrief-truth-under-pressure.png`.
Скріншоти оглянуто; це синтетичні тестові маршрути, не дані учасників.

## Git-синхронізація та збереження роботи

Поточна гілка **complete_scenarios**; на develop не перемикались. На початку
цього завершального завдання `git status --short` був порожній: попередні
Stage 05 зміни вже збережено користувацьким commit `fd2ba2e`. Новий stash не
потрібен; apply не виконувався. Старий **stash@{0}** (`WIP on develop: f2d71b0
set up documentation and ai rules`) не застосовувався й не видалявся.

`git fetch origin develop` успішний. Віддалений develop
`4ece82ed2a8f11391fcc0d88842cf606e6fb1c42` містить обидва пакети та обидва
scenario JSON; workspace manifests/lockfile перевірені. Merge уже інтегровано
в поточній гілці commit `6d103a8`; повторний `git merge origin/develop` повернув
**Already up to date**. Конфліктів не було. Жодного feature commit або push під
час цього завершення не виконано. Зміни залишено для архітектурного review.

Початкові sandbox install-процеси зависли й пошкодили dependency links. Завершено
лише два підтверджені власні PID. Старий generated `node_modules` збережено в
`.angular/stage05-dependency-backup/node_modules`, після чого виконано чистий
`pnpm install --frozen-lockfile` із кешу. Дані, код, engines і lockfile не видалялися
та не підмінялися. Build/browser checks, яким заважав sandbox, виконано з дозволеним
підвищенням доступу. `.npmrc` лишається strict.

Залишкові обмеження: in-memory прогрес, відсутність Angular ESLint та production
hosting-конфігурації, неперевірені першоджерела/правова застосовність і відсутність
експертного схвалення. Обидва сценарії лишаються draft/demoOnly/aiAssisted.
Технічний Stage 05 — **PASS**, очікується архітектурне review.
