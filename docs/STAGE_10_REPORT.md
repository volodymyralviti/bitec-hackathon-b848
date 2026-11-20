# Stage 10 — Public Demo Studio та deployment readiness

**LOCAL DEMO READY.**
**DEPLOYMENT CONFIG PREPARED.**
**HOSTED DEPLOY NOT EXECUTED.**
**PUBLIC RELEASE PARTIAL.**

Source verification: **NOT VERIFIED**. Expert content approval: **PENDING**.
Hosted CI не виконувався. Ці статуси незалежні від локального test PASS.

## 1. Preflight

Гілка `develop`, HEAD `aa4aefd Merge pull request #10 from volodymyralviti/stage08-release`.
Початкові staged/unstaged/untracked порожні, git diff --check PASS.
Node v22.22.3, pnpm 10.0.0, .nvmrc=22.22.3, engine-strict=true,
strict-peer-dependencies=true. Manifests/lockfile та package exports не змінено.
Фактично підтверджено Stage 10B: source fields і форми, sourceIds/редакції/relevance,
legalAssessments у protected review API, guard, Solo/Debrief citations.
Stage 09 AI відсутній і не доданий. Перед початком Demo Studio не існував.

Git fetch/pull/merge/rebase/stash/reset/clean/switch/commit/push не виконувалися.
Після роботи є лише unstaged/untracked файли Stage 10; staged немає.

## 2. Архітектура й фактичні маршрути

| Маршрут | Поведінка |
|---|---|
| `/` | Чинний redirect на каталог `/scenarios` |
| `/studio` | Вибір «Спробувати майстерню» та чинний авторський login із ключем |
| `/studio/demo` | Повний спільний editor без ключа; власний route-scoped workspace |
| `/studio/demo/preview/:id/play` | Локальний валідований snapshot, чинний SoloSession/Engine |
| `/studio/demo/preview/:id/debrief` | Чинний Debrief фактичного локального маршруту |
| `/studio/preview/:id/play`, `/debrief` | Існуючі protected author preview child routes без зміни авторизації |
| `/scenarios/:id/play`, `/debrief` | Існуючі public solo child routes |
| `/classroom/host`, `/classroom/join/:pin` | Існуючий Classroom, контракт не змінений |

Останні дві скорочені `/debrief` позначки в таблиці означають відповідний sibling
маршрут із тим самим prefix/ID; окремий legacy `/debrief` також збережено.

Повторно використано StudioComponent, EditorFieldComponent, form-model,
SourcesComponent Stage 10B, validators @eds/scenario-schema, StudioPreviewRepository,
SoloSession і @eds/scenario-engine, SoloPlayer та Debrief. Другого editor немає.
DEMO_STUDIO token та route-scoped StudioWorkspace відокремлюють Signal/in-memory
form, record і preview від авторського root workspace. Author mode зберігає
protected API persistence; demo не використовує server repository.

SPA preview/debrief/back зберігає форму; reset потребує підтвердження, unsaved
exit — підтвердження й видиме попередження. Hard reload очищає пам’ять, що
явно пояснено в editor/preview/debrief. Direct missing snapshot дає not-found,
не fetch приватних даних. Немає browser storage, cookies або guest sessions.

Гостьова policy поверх shared Schema приймає тільки draft/demoOnly=true,
draft review без completed proof, sources unverified/verifiedAt=null і choice
legalStatus uncertain/відсутній. Імпорт із privileged claims відхиляється;
метадані не переписуються мовчки. Source реквізити, revisions, pinpoint, relevance,
unresolved questions, sourceIds, aiAssisted й delayed events roundtrip без втрат.
Правила й exports Schema/Engine, два CIDS JSON, guards і classroom contracts без diff.

Реальний browser smoke знайшов старий dynamic input type bug: actual number
input events створювали strings. Статичний `type="number"` тепер підключає Angular
NumberValueAccessor для deltas/count. Доданий DOM-event regression; engine не змінено.

## 3. Доказ ізоляції та безпеки

Новий smoke використовує створений CDP off-the-record browser context, новий
profile, реальні production assets і Nest із тимчасовим store та випадковим
test-only secret. Поточні ключі/чернетки користувача не використовуються.

- Browser Network: protected author/reviewer requests **[]**.
- Requests із демо-document body **[]**, Authorization header відсутній.
- Server store до/після byte-for-byte однаковий.
- Demo ID відсутній у privileged private list і public catalog; public GET →404.
- Browser storage entries **0**, consoleErrors **[]**.
- Template завантажено лише з public `/assets/studio-blank.json`.
- Unit test перевіряє demo навіть за already-authorized root capability:
  hidden login/refresh/save/fork/review/server-validation actions не викликають API.
- Імпорт malformed JSON, unknown legalAssessments і forged expert_checked
  відхилено також у реальному браузері; попередня форма збережена.
- Unit tests додатково покривають oversized JSON, тисячі вузлів, broken graph,
  forged completed review/demo flags, XSS-like narrative як escaped text.
- Server negative authorization/reviewer tests Stage 10B пройшли без послаблення.

Server-side URL fetch, AI, legal auto-review, нові API endpoints, БД або збір
персональних даних не додано. Public assets залишаються allowlisted.

## 4. Повний UI-created приклад

Повний JSON із реального browser export: [stage10-ui-demo.json](examples/stage10-ui-demo.json).
Це synthetic smoke artifact, не фінальний сценарій або правове першоджерело.
Він знаходиться тільки в docs/examples, не в Angular assets чи public catalog.

Назва «Навчальна дилема», ID demo-browser-dilemma. Intro про вигаданий відкритий
навчальний курс; три послідовні decision nodes, по дві alternatives; два endings
з debrief/reflection. Усі шляхи мають мінімум три рішення за shared graph validator.
Immediate deltas змінені через реальні number inputs, delayed after_decisions.count=1
заплановано першим вибором. У вибраному preview delayed event видимий після наступного
рішення. Підсумок: transparency=3, fairness=0, trust=2, effectiveness=2.

Через форму додано source demo-method, methodology, синтетична навчальна редакція,
pinpoint «Пункт 1 синтетичної нотатки», versionAsOf=2026-11-20 (синтетичний fixture,
не дата реальної правової редакції), relevance і applicabilityQuestions.
Офіційний URL не вигадано. Status unverified, verifiedAt=null, legalStatus uncertain.
Demo-only/draft/aiAssisted збережено. Зв’язок із першим choice — через sourceIds.

Навмисно зламаний sourceId дав SOURCE_NOT_FOUND, короткий entry-to-ending route
дав TOO_SHORT_PATH; виправлення через форми повернуло PASS. Preview → 3 decisions
→ delayed timeline → ending → debrief → back → reset → import → export був
перевірений. JSON другого export глибоко дорівнює першому, повторне проходження
дає ті ж чотири metrics. Hard reload очистив форму без server persistence.

## 5. Команди й результати

У Windows використовувався pnpm.cmd, для browser/Karma:
CHROME_BIN=C:/Program Files/Google/Chrome/Application/chrome.exe.

| Команда з кореня | Фактичний результат |
|---|---|
| `pnpm install --frozen-lockfile` | PASS, already up to date, lockfile без diff |
| `pnpm build` | PASS; обидва apps, packages, production asset allowlist та schema import smoke |
| `pnpm typecheck` | PASS |
| `pnpm test` | PASS: Schema 40, Engine 14, assets 8, Angular Karma **62**, Nest unit 9, Nest e2e 21; **154** разом |
| `pnpm lint` | PASS; чинний root lint перевіряє schema/engine/server; окремий client ESLint відсутній |
| `node content/qa/validate.mjs` | PASS; обидва JSON валідні, по три чесні SOURCE_UNVERIFIED |
| `node --test content/qa/content.test.mjs` | PASS, 8 tests, включно з engine metadata invariance |
| `node apps/client/scripts/check-solo-routes.mjs` | PASS: усі **16** CIDS routes через public Engine, по три рішення |
| `node scripts/check-release-safety.mjs` | PASS: credential patterns 0, original demo review flags незмінні |
| `git diff --check` | PASS |

Без skip або заміни framework. Karma показав відомі nonblocking NG0956 warnings
щодо identity tracking, не runtime errors. Спочатку browser smoke заблокував
numeric controls — дефект виправлено й повторний smoke/test PASS. Приватний
download harness адаптовано до CDP-created context; це не обхід application test.

## 6. Browser / API regression evidence

| Перевірка | Результат / тип |
|---|---|
| `node apps/client/scripts/smoke-demo-studio.mjs` | PASS; off-the-record Chrome, реальні форми, Network traces, store comparison, keyboard entry/export, mobile 360px |
| `node apps/client/scripts/smoke-studio.mjs` | PASS; real protected create/edit/save, reload → login → reopen, JSON roundtrip, guest deny |
| `node apps/client/scripts/smoke-solo.mjs` | PASS; обидва CIDS cases до debrief/restart, keyboard/deep-link/missing states, 360px |
| `node apps/client/scripts/smoke-classroom.mjs` | PASS; 4 contexts: host+3 guests, 3 rounds, aggregate після close, мале N=2 suppressed, 360px |
| Classroom reconnect | PASS у real Socket.IO Nest e2e; не приписується browser smoke |
| Missing demo snapshot | PASS route test; без private HTTP |
| Forged expert/review metadata | PASS client unit/browser і чинні server e2e deny tests |
| Nginx TLS/WebSocket runtime | **BLOCKED**: nginx відсутній, Docker daemon pipe відсутній навіть поза sandbox |
| Hosted CI / DNS / HTTPS / volume restore | **NOT EXECUTED** |

Усі чотири browser scripts мали consoleErrors=[] і mobile horizontal overflow=false.
Browser artifacts (ігноровані): apps/client/.angular/demo-studio-browser-report.json,
demo-studio-mobile.png, demo-studio-debrief.png; author/solo/classroom reports там само.
Це синтетичні дані, не результати реальних учасників.

Реальний локальний HTTP production-packaging smoke (не Angular dev proxy):

| URL | Status / Content-Type |
|---|---|
| `/scenarios/index.json` | 200 application/json; рівно два allowlisted filenames |
| `/scenarios/urgent-supply.json` | 200 application/json, schema-valid |
| `/scenarios/truth-under-pressure.json` | 200 application/json, schema-valid |
| `/scenarios/private.json` | 404, без HTML fallback |
| `/api/health` | 200 JSON, status=ok, service=ethical-dilemmas-api |
| `/api/scenarios` | 200 JSON |
| `/studio/demo`, `/play`, `/debrief`, `/scenarios` | 200 text/html, production SPA deep links |
| `/api/author/scenarios` без ключа | 401 |
| Reviewer operation при відсутньому reviewer key | 503 deny |

WebSocket upgrade перевірено через локальний HTTP proxy в classroom browser smoke.
Це не доказ роботи підготовленого Nginx на HTTPS.

## 7. Deployment configuration

[Runbook](DEPLOYMENT_RUNBOOK_UA.md) містить build/start order, точні env names,
пакування monorepo symlinks, same-origin URLs, manual smoke й rollback checklist.

- deploy/nginx.conf: TLS 1.2/1.3, 80→HTTPS redirect, API та Socket.IO proxy зі
  збереженням Host/Upgrade, bounded rate/connection limits, no request logs,
  JSON/static missing=404, правильний SPA fallback навіть для /scenarios.
- deploy/eds-api.service: непривілейований eds user, один Node process,
  readonly releases, writable StateDirectory=/var/lib/eds з 0700, umask 0077.
- deploy/api.env.example: без секретів; HOST=127.0.0.1, PORT=3000,
  SCENARIO_DATA_FILE=/var/lib/eds/scenarios.json, readonly content path,
  author/reviewer env та чинні classroom bounds. Немає AI env чи DATABASE_URL.
- apps/server main: optional HOST, default behavior без HOST збережена.
- `.github/workflows/release-checks.yml`: додано новий private-demo browser smoke;
  hosted workflow не запускався та write/deploy permissions не додані.

Оператор має надати domain/certificates, перевірити nginx -t/systemd unit,
firewall (3000 тільки loopback), HTTP/WS Origin, logs/CDN, persistent volume,
backup/restore й single-process rollback. Нічого не розгорталося.

## 8. Змінені / створені файли

Змінені:

- .github/workflows/release-checks.yml
- apps/client/README.md
- apps/client/scripts/scenario-api-harness.mjs
- apps/client/scripts/smoke-studio.mjs
- apps/client/src/app/app.component.html
- apps/client/src/app/app.routes.ts
- apps/client/src/app/catalog/catalog.component.html
- apps/client/src/app/debrief/debrief.component.html
- apps/client/src/app/scenario-studio/editor-field.component.html
- apps/client/src/app/scenario-studio/editor-field.component.ts
- apps/client/src/app/scenario-studio/studio-workspace.service.ts
- apps/client/src/app/scenario-studio/studio.component.html
- apps/client/src/app/scenario-studio/studio.component.ts
- apps/client/src/app/solo/solo-navigation.ts
- apps/client/src/app/solo/solo-player.component.html
- apps/server/.env.example
- apps/server/README.md
- apps/server/src/main.ts
- docs/LEGAL_SOURCES_UA.md

Створені:

- apps/client/scripts/smoke-demo-studio.mjs
- apps/client/src/app/scenario-studio/demo.routes.ts
- apps/client/src/app/scenario-studio/demo.spec.ts
- apps/client/src/app/scenario-studio/studio-exit.guard.ts
- apps/client/src/app/scenario-studio/studio-mode.ts
- deploy/nginx.conf
- deploy/eds-api.service
- deploy/api.env.example
- docs/DEPLOYMENT_RUNBOOK_UA.md
- docs/adr/0003-public-demo-studio.md
- docs/examples/stage10-ui-demo.json
- docs/STAGE_10_REPORT.md

Видалених файлів немає. Немає diff у schema/engine packages, CIDS JSON,
content source statuses, pnpm lockfile або author/reviewer guards.

## 9. Acceptance Criteria

| № | Критерій | Статус |
|---|---|---|
| 1 | Fresh visitor без key/реєстрації | PASS |
| 2 | Author mode й server authorization | PASS |
| 3 | Спільні повні Studio forms | PASS |
| 4 | Stage 10B legal fields, sourceIds, unverified | PASS |
| 5 | Three-decision edit/validate/engine/debrief | PASS |
| 6 | Семантичний JSON roundtrip | PASS |
| 7 | Local-only demo, нуль protected calls/persistence | PASS |
| 8 | Без guest approval/publication/private leaks | PASS |
| 9 | Solo 16 routes та Classroom | PASS |
| 10 | Український flow, 360px, keyboard, assets, no console errors | PASS |
| 11 | Build/typecheck/test/lint/content QA | PASS |
| 12 | Deployment config/runbook без вигаданого hosted PASS | PASS — runtime Nginx/TLS/hosted checks явно BLOCKED/NOT EXECUTED |

## 10. Відкриті P0/P1 та ручні кроки

Локальних відомих P0 після перевірок немає. **Public release gates P0**:
реальні hosted TLS/DNS/proxy/volume/log checks, source verification та фактичне
компетентне human review. CIDS PDF і правові редакції Stage 10B не перевірялися
автоматично в цьому етапі; unverified/draft/demoOnly/aiAssisted не підвищено.

P1: NG0956 performance warning, production artifact size (повний pnpm workspace),
перевірка rate limits під реальним shared NAT та відновлення store на цільовій OS.
Немає production identity/role management чи distributed-abuse гарантії.
Classroom volatile: restart втрачає кімнати/токени/голоси; backup тільки source store.

Наявний join-link містить public room PIN як locator за контрактом Stage 07.
Тому вимога «жодного PIN в URL» не приписується як виконана: current join contract
збережено відповідно до меж етапу. Host/participant секрети й ballots у URL не потрапляють.
Відсутність access logs треба перевірити також на інфраструктурі, не лише в Nginx-файлі.

Команда має виконати deployment checklist із runbook після окремого дозволу,
підтвердити юридичні джерела й review; до того PUBLIC RELEASE залишається PARTIAL.
Робота Stage 10 завершена для архітектурного review, наступні етапи не розпочаті.
