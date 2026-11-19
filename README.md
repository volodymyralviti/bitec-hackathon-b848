# Ethical Dilemmas Simulator

Освітній симулятор етичних дилем українською мовою. Наразі репозиторій містить
стартові Angular та NestJS застосунки; сценарії й навчальні режими ще не реалізовані.

## Структура

```text
apps/client/       Angular 21, standalone компоненти, Jasmine/Karma
apps/server/       NestJS 11 + Express, CommonJS, Jest/Supertest
packages/scenario-schema/ незалежний DSL v1, Zod, graph/provenance validation
content/scenarios/ місце для сценаріїв (поки порожнє)
```

Порожні каталоги не відтворюються Git до додавання файлів.
Назви workspace-пакетів: `client` та `server`.

## Середовище та встановлення

- Node.js **22.22.3 або новіша версія гілки 22** (`>=22.22.3 <23`).
- pnpm **10.0.0**, зафіксований у `packageManager`.
- Chrome для Angular unit-тестів; для нестандартного шляху задайте `CHROME_BIN`.

Версію Node записано в `.nvmrc`; використовуйте свій менеджер Node.
Після встановлення pnpm потрібної версії виконайте з кореня:

```sh
pnpm install --frozen-lockfile
```

Використовуйте єдиний `pnpm-lock.yaml`; не створюйте npm lock-файли в застосунках.
Перевірки engines та peer dependencies увімкнені в `.npmrc`.
Node 22.12.0 підходить Angular 21, але транзитивні ESLint-залежності потребують
новішого Node 22; перевірений runtime цього workspace — 22.22.3.
У Windows PowerShell із заблокованими `.ps1` запускайте `pnpm.cmd` замість `pnpm`.

## Локальний запуск

У двох терміналах із кореня:

```sh
pnpm dev:web
pnpm dev:api
```

Клієнт: `http://localhost:4200`; сервер: `http://localhost:3000`.
Сервер повертає `Hello World!` на `GET /api` та health-статус на `GET /api/health`:

```json
{"status":"ok","service":"ethical-dilemmas-api"}
```

Перевірка напряму й через Angular dev proxy:

```sh
curl http://localhost:3000/api/health
curl http://localhost:4200/api/health
```

Клієнт перевіряє API при відкритті та кнопкою «Перевірити знову».
Показує завантаження, успіх або зрозумілу помилку. Щоб перевірити недоступність,
зупиніть API та натисніть кнопку або перезавантажте сторінку.
Постійного фонового опитування немає.

API вже читає `PORT` із середовища (типово 3000); `.env` автоматично не завантажується.
Наприклад, у PowerShell: `$env:PORT='3001'; pnpm.cmd dev:api`.
Якщо порт змінено, відповідно змініть target у `apps/client/proxy.conf.json`
і перезапустіть Angular dev server. Додаткові environment variables чи секрети не потрібні.

Frontend завжди запитує відносний `/api/health`. Proxy зареєстрований лише для
dev server та не входить до production bundle. У production вебсервер має
передавати `/api/*` до NestJS на тому самому origin; dev proxy там не потрібен.
Широкий CORS не вмикається.

## Перевірки

```sh
pnpm build        # production build обох застосунків
pnpm typecheck    # Angular templates, client specs, server TypeScript
pnpm test         # schema tests, Angular unit, Nest unit, потім Nest e2e
pnpm test:e2e     # лише Nest e2e
pnpm lint         # scenario-schema і server ESLint, без --fix
```

Lint перевіряє scenario-schema та server без автоматичного виправлення.
Angular ESLint поки не налаштовано. Для інтерактивних тестів:

```sh
pnpm --filter client test:watch
pnpm --filter server test:watch
```

Збірки розміщуються в `apps/client/dist/client/` та `apps/server/dist/`.
Для запуску зібраного API: `pnpm --filter server start:prod`.

## Міграція середовища

Angular оновлено послідовно 17 → 18 → 19 → 20 → 21 з офіційними CLI/Core
migrations та production-збіркою після кожного major. Для встановлення пакетів
перевірено strict peer dependencies; NestJS залишено CommonJS.
Сумісність: [Angular version matrix](https://angular.dev/reference/versions),
[Angular migrations](https://angular.dev/cli/update).

У залежностях залишаються deprecated пакети; їх масове оновлення не виконувалося.

## Scenario Schema (Stage 02)

Пакет `@eds/scenario-schema` містить Zod-схеми, inferred types, структурну й
семантичну перевірку, машинозчитувані діагностики та JSON Schema export.
Контракт: [README пакета](packages/scenario-schema/README.md);
рішення: [ADR 0001](docs/adr/0001-scenario-dsl-v1.md).
Повний мінімальний JSON: [synthetic fixture](packages/scenario-schema/test/fixtures/minimal.json).
Це тестові demo-only дані, а не перевірені навчальні чи правові матеріали.

```sh
pnpm --filter @eds/scenario-schema test
```

`pnpm build` збирає shared package до застосунків та запускає окремий Angular
esbuild import smoke. `pnpm typecheck` спершу будує shared declarations.
`pnpm test` включає тести пакета та імпорту в обох застосунках; `pnpm lint`
перевіряє новий пакет і сервер. Жодної runtime-функції симулятора не додано.
