# Stage 10D — кураторський публічний демокаталог

**TECHNICAL DEMO CATALOG — PASS.**
**OFFICIAL SOURCE VERSION CHECK — NOT VERIFIED** (текстова звірка Stage 10C PARTIAL).
**EXPERT CONTENT APPROVAL — PENDING.**
**READY FOR HACKATHON DEMO — YES, локально, із видимими застереженнями.**
Hosted deployment/HTTPS не виконувалися й цим звітом не підтверджуються.

## Checkout і збереження роботи

Гілка до/після: `add_scenarios`; HEAD `aa4aefd`. Node v22.22.3,
pnpm 10.0.0, engine-strict=true. Перед стартом: 22 modified paths,
27 untracked paths/directories, staged=0 (ще незакомічені Stage 10/10C).
Після: 35 modified, 30 untracked paths/directories, staged=0. Це сукупний
стан попередньої роботи й Stage 10D, а не список лише нових змін.

Гілку не перемикали; Git stash/reset/clean/fetch/pull/merge/rebase/commit/push
і deployment не виконували. Усі п'ять сценарних JSON перевірено SHA-256
до/після — **побайтово однакові**. Engine/Schema, guards, reviewer actions,
Classroom gateway/TTL/анонімність не змінювалися. Видалень source files немає.

## Каталог і реальні сценарії

| Назва | scenarioId | JSON path | Джерела / редакції | Expert review | Каталог | Solo | Classroom | Demo Studio import/export |
|---|---|---|---|---|---|---|---|---|
| Підпис під сумнівом | report-under-pressure | content/scenarios/report-under-pressure.json | unverified / нормативні versionAsOf, revision=null | PENDING | так, 1 | PASS | PASS, 3 раунди | PASS |
| Хто заслуговує на місце? | fair-selection | content/scenarios/fair-selection.json | unverified / нормативні versionAsOf, revision=null | PENDING | так, 2 | PASS | PASS, 3 раунди | PASS |
| Тиша після шикування | quiet-after-formation | content/scenarios/quiet-after-formation.json | unverified / нормативні versionAsOf, revision=null | PENDING | так, 3 | PASS | PASS, 3 раунди | PASS |

У всіх source JSON: publicationStatus=draft, contentReview.status=draft,
demoOnly=true, aiAssisted=true; verifiedAt=null, legalStatus=uncertain.
Авторська редакція editorial-моделі не видається за редакцію нормативного акта.
По 12 вузлів, 14 choices, 4 endings, 8 маршрутів, рівно 3 рішення на маршрут,
7 delayed events. Збережені всі golden metrics, applied/unrealized events та
джерела фактично пройденого маршруту. Жодних нових правових тверджень не додано.

## Як працюють manifest, API та assets

`content/scenarios/index.json` містить рівно три filenames у наведеному порядку.
Він є спільним deployment-owned allowlist для static preparation та API.

`pnpm dev:web` → client start → prepare:scenarios → builds Schema/Engine →
prepare-scenarios.mjs → лише валідні manifest JSON у
`apps/client/.angular/solo-content`. Angular assets configuration публікує цю
папку як `/scenarios/*.json`; production фізично лежить у
`apps/client/dist/client/browser/scenarios`. Старі generated JSON прибираються
скриптом; весь content/ у assets не копіюється.

Фактичний Solo і Classroom picker використовують `/api/scenarios`, а не
приховані CSS-фільтри. NestJS тепер перечитує той самий manifest при **кожному
старті** у read-only demo projection, незалежно від існування author data file.
Порядок збережено; каталог не збирається з усіх колишніх публічних записів БД.
Це усуває проблему старого persisted seed після простої заміни index.

API demo projection зберігає вже наявний transport статус publicationStatus=demo;
source JSON/static assets залишаються draft. Review/sources/choices не змінюються.
Це не production publish action. Деталі: [ADR 0004](adr/0004-curated-public-demo-catalog.md).

`publicGet` спочатку шукає curated version, потім використовує старі правила
доступу для раніше явно оприлюднених версій; private drafts залишаються недоступні.
Існуючий author store при перезапуску **не переписується**. На свіжому store
початкові demo snapshots створюються як раніше.

### Що зі старими CIDS

urgent-supply.json і truth-under-pressure.json залишилися в репозиторії,
teaching notes, fixtures і QA; всі 16 маршрутів виконуються через Engine.
У manifest, стандартному API catalog, Classroom picker і нових static assets їх немає.
На свіжому API store direct `/api/scenarios/urgent-supply` і
`/api/scenarios/truth-under-pressure` повернули 404. Якщо у вже існуючій БД ці
кейси раніше мали demo/published, direct API URL може лишитися доступним,
а отже й раніше відомий Solo deep link може завантажити їх. Це навмисне
збереження архівних public versions, не повернення до каталогу.
Persisted-store regression підтверджує цей fallback і незмінність файла після
двох restart. Повного видалення CIDS із сервера не заявляємо.

## Чесні статуси й presentation

Картки мають короткий опис без сюжетного повороту, конфлікт цінностей,
позначку «3 рішення» (підтверджено всіма маршрутами) і «Пройти сценарій».
Спільний ScenarioStatus використано в картках, Solo, preview та Debrief:

> Демонстраційний навчальний сценарій. Нормативні посилання та редакції потребують підтвердження; експертний перегляд ще не завершено.

Sources показує реальний sourceId, назву, локатор, URL, «Не перевірено»,
«Редакція: Не встановлена» та питання застосовності. Немає підстав називати
редакцію «чинною» або трактувати uncertain choice як дозволений/заборонений.

Manifest membership не дає reviewer rights. Валідація підробленої published
версії з неперевіреними джерелами падає; server guards і human approval gates
не послаблено. Demo Studio відхиляє forged approved/verified metadata,
працює без author key і не викликає protected API.

## HTTP і браузерні докази

Стандартний `pnpm dev:web` виконав preparation, але ng serve отримав зайнятий
4200. Чужий процес не зупиняли. Запустили **той самий script** як
`pnpm dev:web --port 4201`; після перевірки власний dev server зупинили.

| Реальний GET URL | Status | Content-Type |
|---|---|---|
| http://localhost:4201/scenarios/index.json | 200 | application/json |
| http://localhost:4201/scenarios/report-under-pressure.json | 200 | application/json |
| http://localhost:4201/scenarios/fair-selection.json | 200 | application/json |
| http://localhost:4201/scenarios/quiet-after-formation.json | 200 | application/json |
| http://localhost:4201/scenarios/urgent-supply.json | 404 | text/html; charset=utf-8 (error body, не 200 SPA fallback) |
| http://localhost:4201/scenarios/truth-under-pressure.json | 404 | text/html; charset=utf-8 |
| http://localhost:4201/scenarios/missing.json | 404 | text/html; charset=utf-8 |

Production-browser harness використав реальні зібрані Angular/NestJS,
реальний **поточний** content manifest, ізольований writable test store,
loopback HTTP proxy та Chrome Headless 156, без реальних secrets.
Це вже не QA-only manifest Stage 10C.

- Frontend http://127.0.0.1:64073, API http://127.0.0.1:64072 (тимчасові порти).
- Усі чотири production `/scenarios/*.json` → 200 application/json,
  JSON відповідає source побайтовому змісту/структурі; missing/CIDS JSON → 404.
- `/api/health` → 200; `/api/scenarios` → 200, рівно три IDs у потрібному порядку.
- Direct `/scenarios/:id/play` і справжній Page.reload працюють для всіх трьох.
- У кожному Solo пройдено три рішення, джерела, delayed feedback, ending,
  Debrief і restart. Перша golden-гілка дає відповідно метрики
  [4,4,2,-6], [6,3,0,-3], [4,4,4,-5] (не моральний рейтинг).
- Для кожного кейсу Demo Studio: import → validate → export deepEqual →
  Engine preview → debrief → reset → reimport. Protected calls=0,
  author store до/після demo ідентичний.
- Protected Studio: кожен JSON імпортовано та збережено під новим test-only
  private ID; source metadata збережено, public GET private → 404,
  private GET без ключа → 401. Тестові дані живуть лише в temp store.
- Classroom: **кожен** із трьох кейсів, host+3 окремі гостьові контексти,
  3 раунди, агрегат відсутній до close, після close — тільки спільний розподіл,
  усі доходять до shared debrief. Picker = ті самі три IDs у тому самому порядку.
- 360 px без overflow; keyboard Enter/Tab, skip link, choices перевірені.
  Успішні browser runs: consoleErrors=[]; жодних PIN, ключів чи ballots у звітах.

Перший comprehensive browser run не дійшов до Classroom debrief через тестову
гонку: click відбувався до зняття disabled. Виправлено лише test helper:
очікує enabled control. Повтор — PASS для всіх трьох. Product gateway не змінено.

## Команди й результати

| Команда | Фактичний результат |
|---|---|
| pnpm install --frozen-lockfile | PASS, already up to date |
| pnpm build | PASS, обидва apps, package imports, production allowlist. Перша sandbox спроба Access denied; повтор поза sandbox успішний |
| pnpm typecheck | PASS |
| pnpm lint | PASS; фактичний scope Schema/Engine/Server, не окремий Angular ESLint |
| pnpm test | PASS: 156 тестів — Schema 40, Engine 14, assets 8, Angular 62, Nest unit 11, Nest e2e 21; без skip |
| node content/qa/validate.mjs | PASS, усі п'ять JSON, schema/graph; чесні source warnings |
| node --test content/qa/content.test.mjs | PASS 16/16; 24 нових + 16 архівних Engine routes |
| node apps/client/scripts/check-solo-routes.mjs | PASS, усі 16 CIDS routes |
| node content/qa/browser-college.mjs | PASS, три Solo/Demo/Author/Classroom через actual manifest |
| node apps/client/scripts/smoke-solo.mjs | PASS, три нові кейси, mobile, keyboard, missing/deep links |
| node apps/client/scripts/smoke-demo-studio.mjs | PASS, UI authoring і негативні forged/unknown/malformed import тести |
| node scripts/check-release-safety.mjs | PASS, 124 files scanned, 0 known credential patterns; не повний security audit |
| git diff --check | PASS; лише Git LF→CRLF informational warnings |

Karma використав тимчасовий CHROME_BIN до встановленого Chrome. Є наявні
NG0956 performance warnings у Studio unit-тестах, без failed assertions;
успішні production browser runs не мають runtime/console errors.

## Змінені саме в Stage 10D файли

Нові:
- apps/server/src/scenarios/demo-catalog.spec.ts
- docs/adr/0004-curated-public-demo-catalog.md
- docs/STAGE_10D_REPORT.md

Оновлені поверх наявної роботи:
- content/scenarios/index.json
- apps/server/src/scenarios/scenario-store.ts
- apps/server/src/scenarios/scenario.service.ts
- apps/server/test/scenarios.e2e-spec.ts
- apps/server/test/classroom.e2e-spec.ts
- apps/client/src/app/catalog/catalog.component.ts
- apps/client/src/app/catalog/catalog.component.html
- apps/client/src/app/catalog/catalog.component.spec.ts
- apps/client/src/app/shared/ui/scenario-status.component.ts
- apps/client/src/app/shared/ui/sources.component.ts
- apps/client/scripts/prepare-scenarios.test.mjs
- apps/client/scripts/verify-scenario-build.mjs
- apps/client/scripts/smoke-solo.mjs
- apps/client/scripts/smoke-demo-studio.mjs
- content/qa/college-qa.mjs
- content/qa/college.test.mjs
- content/qa/browser-college.mjs
- content/qa/college-route-matrix.md
- content/qa/legal-source-evidence.md
- content/teaching-notes/report-under-pressure.md
- content/teaching-notes/fair-selection.md
- content/teaching-notes/quiet-after-formation.md
- README.md
- apps/client/README.md
- apps/server/README.md
- content/README.md
- docs/DEPLOYMENT_RUNBOOK_UA.md

Попередні untracked Stage 10/10C файли не видалені. Generated build, screenshots,
HTTP/browser reports та baseline SHA лежать лише в ігнорованих .angular папках.

## Acceptance

| Критерій | Статус / доказ |
|---|---|
| Каталог рівно 3 нових кейси в порядку; 0 CIDS | PASS: manifest, assets, API, catalog DOM, picker DOM |
| 24/24 нових, рівно 3 рішення, metrics/events незмінні | PASS: golden oracle + реальний Engine |
| 16/16 CIDS і всі п'ять source JSON збережені | PASS: Engine regression + SHA |
| Solo HTTP JSON, deep link/reload, ending/debrief/restart | PASS: dev HTTP та production browser |
| Classroom кожного кейсу, host+3, 3 раунди | PASS: реальні браузерні контексти/WebSocket |
| Demo Studio import/export/preview/legal metadata без ключа | PASS: всі три + forged metadata browser negatives |
| Author/reviewer захищено, private дані не витікають | PASS: guards незмінні; unit/e2e і HTTP 401/404 |
| Demo manifest не надає production publication approval | PASS: negative manifested-published test + існуючі reviewer tests |
| Джерела/unverified/невідомі редакції/попередження видимі | PASS: shared UI, catalog unit і Solo/debrief browser |
| Dev/build/reload не повертають CIDS у каталог | PASS: preparation cleanup, production allowlist, persisted-store restart, DOM reload |
| 360 px, keyboard, 0 необроблених browser errors | PASS: production Chrome smoke |
| Build/typecheck/lint/test/content QA | PASS у фактичному script scope |
| Юридична редакція та людське expert approval | PENDING release gates, не результати технічних тестів |

## Що потрібно зробити команді перед навчальним застосуванням

1. Підтвердити актуальні й застосовні редакції на дату контенту за офіційним
   першоджерелом. Last-Modified HTTP не є датою юридичної редакції.
2. Перевірити конкретні повноваження персонажів; у fair-selection — статус
   військової посадової особи й суб'єктний склад антикорупційних норм.
3. Провести правовий, антикорупційний та педагогічний review; у кейсі про
   гідність — перевірити безпечні й належні канали реагування.
4. Завершити справжній human expert approval через захищений workflow з
   відтворюваними evidence; не оцінювати моральність реальної особи за вибором.
5. Перед hosted demo виконати окремий deployment/TLS/proxy/privacy smoke.
   Тут виконано лише локальне демо; deployment не робили.

Після оновлення локального checkout: `pnpm dev:api` та `pnpm dev:web` у двох
терміналах з root, стандартно localhost:3000 і localhost:4200; за зайнятого
4200 — `pnpm dev:web --port 4201`. API перезапустити, щоб перечитати manifest.
Роботу зупинено для review; наступні етапи не запускалися.
