# Client

Angular 21 application, workspace package client.
See the [root README](../../README.md) for Node/pnpm requirements, installation,
development, builds and ChromeHeadless tests. Run workspace commands from the root.

## Stage 05 — часткова реалізація, очікується Stage 03

У цій гілці немає `packages/scenario-engine`, залежності на цей пакет у lockfile
або іншого локального worktree з реалізацією. Тому Stage 05 має статус
**PARTIAL / BLOCKED**, а не завершений solo vertical slice. Runtime engine,
обробка вибору, timeline, delayed arrivals і фінальний debrief не реалізовані.
Логіка переходів, числових ефектів та черги подій в Angular не дублюється.

Реалізовано український responsive shell, каталог двох JSON-сценаріїв, loading /
empty / error / retry, перевірку контенту публічним schema API, preview лише
вступного narrative та картки джерел із точними nullable metadata.
Показуються draft/demo/AI і відсутність експертного схвалення. Складність у
чинному DSL відсутня: UI чесно пише «автором не визначена», а не вигадує її.

Маршрути:

- `/` → `/scenarios`: каталог.
- `/scenarios/:id/play`: **лише preview**, із повідомленням про недоступність проходження.
- `/scenarios/:id/debrief`: той самий безпечний preview; результат не вигадується.
- Невідомий scenario ID: «Сценарій не знайдено»; невідомий route → каталог.

Немає learner account, localStorage, cookies, персонального state, telemetry
або надсилання рішень. На reload знову завантажується контент; прогрес не
відновлюється й не імітується. API health залишається на сервері й у сервісі,
але більше не є стартовим UI і не запитується каталогом.

## Static adapter та заміна на API

`ScenarioRepository` у `core/scenarios/scenario-repository.ts` — injectable
абстракція `list()` / `getById(id)`, що повертає RxJS Observable. У `app.config.ts`
вона прив’язана до `StaticScenarioRepository`. В Stage 06 потрібно реалізувати
API adapter й змінити цей provider; feature компоненти не мають знати про HTTP URL.
API має віддавати лише доступний учаснику контент і не розкривати приватні чернетки.

Джерело static adapter — `content/scenarios/index.json`, список імен файлів.
Для додавання контенту достатньо JSON і запису в індексі; TS-код не редагується.
Збірка не копіює каталог content цілком: `scripts/prepare-scenarios.mjs`
валідує лише явно перелічені demoOnly/published файли через `@eds/scenario-schema`
і готує публічні assets у `.angular/solo-content/`. Angular копіює їх у
`dist/client/browser/scenarios/`. Незазначені файли не потрапляють у цей output.
Помилково зазначений приватний draft відхиляється до копіювання.
Зміни контенту під час `ng serve` потребують повторного `prepare:scenarios` /
перезапуску start; live authoring тут не реалізовано.

Скрипти start/build/watch/test автоматично готують assets і schema build.
Запускайте з кореня `pnpm dev:web` (у Windows PowerShell — `pnpm.cmd dev:web`).
Прямий `ng serve -o`, зокрема через глобальний CLI, обходить підготовку: на
чистому checkout `/scenarios/index.json` тоді поверне 404. Якщо такий сервер уже
працює, зупиніть його Ctrl+C й виконайте стандартну команду. Відсутність
`public/scenarios` очікувана: asset input — `.angular/solo-content`.
Усі три URL `/scenarios/index.json`, `/scenarios/urgent-supply.json` і
`/scenarios/truth-under-pressure.json` мають повертати JSON, а не HTML fallback.
Ізольовані regression-тести: `pnpm --filter client test:scenario-assets`.
Production build додатково перевіряє точний allowlist, валідність і незмінність
JSON у `dist/client/browser/scenarios`; приватні файли не копіюються.
Завантажений браузером JSON повторно перевіряється через public validator;
його код підвантажується окремим chunk. Тексти сценаріїв не дублюються у
компонентах; тести імпортують оригінальні JSON як fixtures.

Production host має спочатку віддавати наявні assets, а решту frontend URL
переписувати на `index.html`. Це забезпечує reload `/scenarios/:id/play`.
Статичний адаптер не потребує NestJS. Offline/PWA гарантій немає; первинне
завантаження потребує доступу до сервера assets. Інфраструктурні access logs
налаштовуються окремо, застосунок не доводить мережевої анонімності.

## Фактично перевірено

Node 22.22.3, pnpm 10.0.0; engine-strict не вимикався. З кореня:

```sh
pnpm --filter client build
pnpm --filter client typecheck
pnpm --filter client test
```

У Windows без Chrome для цього запуску було використано встановлений Edge:

```powershell
$env:CHROME_BIN='C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
pnpm.cmd --filter client test
```

Результат: production build та schema-import smoke PASS; typecheck PASS;
**20/20 Jasmine/Karma browser tests PASS**. Initial production bundle 282.09 kB,
без budget warning. Незалежний validator chunk — 477.18 kB.
Sandbox спочатку блокував esbuild traversal та запуск GPU-процесу Edge;
успішні build/browser checks виконано з дозволеним підвищенням доступу.

Фактичний smoke production output у headless Edge:

1. Відкрити `/` → redirect `/scenarios`; обидві назви й українська мова присутні.
2. Перейти з першої картки на `/scenarios/urgent-supply/play`: вступ і три
   джерела, без майбутніх choices/delayed consequence text.
3. Повернутися й відкрити `/scenarios/truth-under-pressure/play`.
4. Відкрити `/scenarios/missing/play`: зрозумілий not-found.
5. Відкрити `/scenarios/urgent-supply/debrief` напряму: повідомлення, що результату немає.
6. Повторно відкрити каталог на 360×800: горизонтального overflow немає,
   карткові посилання >=44 px, Tab/Enter на skip-link переносить фокус у main.

У цьому smoke `Runtime.exceptionThrown` і `console.error` відсутні.
Знімки оглянуто: `.angular/stage05-catalog-desktop.png` та
`.angular/stage05-catalog-mobile.png` (локальні ignored QA artifacts).
Перевірки error/retry/invalid JSON/private draft/path traversal також є у specs.

**Acceptance «home → >=3 рішення → debrief» NOT RUN / BLOCKED.** Немає готового
engine, тому немає й тестів реального choosing/delayed event/finishing. Після
появи Stage 03 потрібно прочитати його фактичний public API, додати workspace
dependency і тонкий signal session facade з викликами лише цього engine,
замінити preview на player/debrief та виконати відсутні browser acceptance checks.
Не покладатися лише на запропонований SimulationState із старого DSL документа.
Classroom, Studio, API, source metadata та engine implementation не змінювались.
