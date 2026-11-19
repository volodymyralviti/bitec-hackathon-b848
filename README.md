# Ethical Dilemmas Simulator

Освітній симулятор етичних дилем українською мовою. Наразі репозиторій містить
стартові Angular та NestJS застосунки; сценарії й навчальні режими ще не реалізовані.

## Структура

```text
apps/client/       Angular 21, standalone компоненти, Jasmine/Karma
apps/server/       NestJS 11 + Express, CommonJS, Jest/Supertest
packages/          місце для майбутніх спільних пакетів (поки порожнє)
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
Сервер поки повертає `Hello World!` на `GET /`.
Health API та Angular proxy ще не налаштовані.

## Перевірки

```sh
pnpm build        # production build обох застосунків
pnpm typecheck    # Angular templates, client specs, server TypeScript
pnpm test         # Angular unit, Nest unit, потім Nest e2e
pnpm test:e2e     # лише Nest e2e
pnpm lint         # наявний server ESLint, без --fix
```

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

Відомі попередження: CSS стандартного Angular-шаблону перевищує warning-бюджет
2 kB, а серверний `bootstrap()` має ESLint-попередження про необроблений Promise.
У залежностях залишаються deprecated пакети; їх масове оновлення не виконувалося.
