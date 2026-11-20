# Production runbook — підготовлено, не розгорнуто

Цільова схема: Linux host, Node 22.22.3, pnpm 10.0.0, один NestJS process через
systemd, Nginx для static Angular + same-origin HTTPS REST/WebSocket proxy.
Docker, PostgreSQL, Redis, AI та нові ролі не потрібні. Домен і сертифікат
надає оператор; `simulator.example.invalid` — placeholder, не робочий сайт.
Команди нижче — інструкція для майбутнього deployment, не звіт про його виконання.

## Build та immutable release

У чистому checkout затвердженої ревізії на build host тієї самої OS/architecture:

```sh
node --version   # v22.22.3
pnpm --version   # 10.0.0
pnpm config get engine-strict  # true
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm test
pnpm lint
node content/qa/validate.mjs
node --test content/qa/content.test.mjs
node apps/client/scripts/check-solo-routes.mjs
node scripts/check-release-safety.mjs
```

Для Karma задайте CHROME_BIN до встановленого Chrome/Edge. Сформуйте окремий
каталог `/srv/eds/releases/RELEASE_ID` з runtime-деревом: root node_modules
(разом із `.pnpm` і symlinks), apps/server/{dist,node_modules},
packages/scenario-{schema,engine}/{dist,package.json,node_modules},
apps/client/dist/client/browser і content/scenarios з явним index allowlist.
Не переносіть node_modules із Windows на Linux. Найпростіший відтворюваний
варіант — build повного workspace безпосередньо в новому release-каталозі Linux;
він має dev dependencies, отже потребує більше місця. Production process не
повинен мати права запису в release. Не використовуйте `pnpm prune` як невипробувану
заміну monorepo packaging. Не включайте .env, приватні .data, ключі або temp smoke data.

Перед активацією перевірте з release-каталогу:

```sh
node -e "require('./packages/scenario-schema/dist/cjs/index.js'); require('./packages/scenario-engine/dist/cjs/index.js')"
```

`/srv/eds/current` — symlink на затверджений release. Схема зберігає relative
workspace dependency links. Nginx роздає **лише** `apps/client/dist/client/browser`,
не repo root, content/, node_modules або серверні файли.

## Ключі, bind address та persistence

Оператор створює окремого непривілейованого OS user/group `eds`, root-owned
release-каталоги й `/etc/eds/api.env` з правами 0600, використовуючи
[deploy/api.env.example](../deploy/api.env.example) як перелік фактичних змінних.
Це systemd EnvironmentFile, не файл, що автоматично читається NestJS.
Для ручного production старту адміністратор має явно експортувати environment.

| Змінна | Значення / правило |
|---|---|
| HOST | 127.0.0.1 за same-host proxy; без HOST зберігається попередній default bind |
| PORT | 3000, узгодити з proxy upstream |
| AUTHOR_KEY | Окремий випадковий секрет ≥32 символи; порожній вимикає author role |
| REVIEWER_KEY | Інший секрет, лише для фактичного рецензента; без reviewer порожній |
| SCENARIO_DATA_FILE | /var/lib/eds/scenarios.json, persistent disk/volume |
| SCENARIO_CONTENT_DIR | /srv/eds/current/content/scenarios — readonly demo seeds |
| CLASSROOM_TTL_MINUTES | 30 |
| CLASSROOM_MIN_PARTICIPANTS | 3; не знижувати privacy threshold |
| CLASSROOM_MAX_PARTICIPANTS / MAX_ROOMS | 100 / 100 за замовчуванням |
| CLASSROOM_ALLOWED_ORIGIN | Лише точний реальний HTTPS Origin, якщо trusted proxy змінює Host |

Не задавайте DATABASE_URL: PostgreSQL adapter відсутній, backend відмовиться
стартувати. Немає AI_ENABLED чи AI provider. Demo Studio не потребує жодного
секрету й ніколи не пише до SCENARIO_DATA_FILE.

Оператор встановлює [eds-api.service](../deploy/eds-api.service) і перевіряє
шлях `/usr/bin/node` та Node version під `eds`. systemd створює `/var/lib/eds`
з 0700; на іншому хостингу потрібен еквівалентний persistent volume з власником
API user. Дозволено **один process / один writer**; не запускати replicas або
cluster workers над одним JSON-файлом. Classroom живе лише у RAM: restart,
crash або rollback закриває всі кімнати й очищає голоси/токени.

Ручний запуск із root workspace після налаштування env:
`pnpm --filter server start:prod`. Не запускати `dev:api`/`ng serve` у production.
Backend port 3000 не відкривати у firewall; доступ лише через 443 proxy.

## HTTPS, proxy та безпечні logs

Оператор замінює domain placeholder у [deploy/nginx.conf](../deploy/nginx.conf),
підключає конфіг у Nginx `http {}` й установлює справжній сертифікат/ключ за
`/etc/eds/tls/fullchain.pem`, `/etc/eds/tls/privkey.pem`. Налаштовує renewals та
перевіряє TLS chain. Production через HTTP не допускається: порт 80 тільки
перенаправляє на конкретний затверджений HTTPS domain.

Перед будь-яким reload: `nginx -t`. Це обов’язкова перевірка на цільовому host,
а не результат локальних Node proxy tests. Для systemd також
`systemd-analyze verify /etc/systemd/system/eds-api.service`.

Конфіг зберігає Host, явно передає WebSocket Upgrade/Connection для
`/api/classroom-socket`, не прибирає глобальний `/api` prefix. REST — `/api/**`.
Nginx віддає JSON/assets напряму, missing static JSON — 404, SPA routes — index.html.
Не додавати `$uri/` до fallback: `/scenarios` одночасно назва Angular route й
фізичного каталогу JSON. Angular dev proxy у production не використовується.
Широкий CORS не потрібний; чинний Socket.IO Origin gate не послаблюється.

Access log вимкнений, error log цього virtual host спрямований у /dev/null:
URI, IP, PIN і credentials не мають потрапляти в загальні request logs.
Оператор окремо перевіряє load balancer/CDN/system logs, retention і доступ.
Не вмикати Socket.IO DEBUG, request-body/Authorization logging або telemetry.
Nginx не передає X-Forwarded-For: застосунок не потребує IP учасника.
systemd journal містить службовий startup/error output, не individual ballots.
Для діагностики використовуйте synthetic data й контрольовані редаговані записи.

Rate limits в proxy: API 10 r/s + burst 30, author/reviewer 2 r/s + burst 10,
створення кімнат 3 r/min + burst 5, WebSocket connections 120/IP. Перевищення —
429. IP keys існують лише у volatile rate-limit zones; це не user analytics.
У класі зі спільним NAT пороги можуть потребувати перевіреного налаштування;
це не захист від distributed abuse чи Sybil-клієнтів. App має власні bounded
rooms, per-socket message rate та small-group suppression. Не заявляти абсолютну
анонімність. Наявний `/classroom/join/:pin` містить публічний room locator;
host/participant credentials та ballots не передаються в URL.

Nginx references: [WebSocket forwarding](https://nginx.org/en/docs/http/websocket.html),
[try_files](https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files),
[request limiting](https://nginx.org/en/docs/http/ngx_http_limit_req_module.html).

## Обов’язковий smoke після майбутнього запуску

- HTTPS DNS/certificate/redirect, жодного mixed content, правильний external Origin.
- `/api/health` → 200, JSON `{status:"ok",service:"ethical-dilemmas-api"}`.
- `/api/scenarios` та обидва public scenarios → 200; private draft → 404.
- `/scenarios/index.json`, `/scenarios/report-under-pressure.json`,
  `/scenarios/fair-selection.json`, `/scenarios/quiet-after-formation.json` → 200 application/json, schema-valid.
- `/scenarios/not-allowlisted.json` → 404, **не** HTML/200.
- Deep links `/studio/demo`, `/play`, `/debrief`, `/scenarios` → Angular HTML.
- Fresh/private browser: demo create → sources → validation → preview → debrief
  → export/import → reset; Network без author/reviewer calls.
- Author secret у вкладці: create/save → reload/login/reopen; guest access deny.
- Classroom: host + 3 guests, upgrade 101 через Nginx, 3 rounds, aggregate лише
  після close, suppression для 1–2, reconnect. Далі перевірити restart/expiry.
- Rate-limit 429 на synthetic traffic, відсутність PIN/token/body/access logs.
- Persistent store переживає restart; file ownership/permissions та backup restore.

Без цих hosted перевірок HTTPS/DNS/WS/logs/volume не вважаються підтвердженими.

## Backup / rollback / release gates

Перед оновленням: повідомити викладачів, завершити кімнати, зупинити single writer,
зробити обмежену доступом копію /var/lib/eds/scenarios.json і перевірити її читання
shared validator. Ключі — в окремому secret store, не в backup чи repo. Копіювати
atomic snapshot лише за зупиненого writer; перевірити відновлення на isolated path.
Зберегти попередній immutable release. Перемкнути current на новий release,
перезапустити один API, виконати health/content/browser smoke; при помилці
повернути pointer і сумісний перевірений store backup. Не перезаписувати store
seed-файлами й не запускати двох writer під час перемикання.

Юридичні джерела лишаються NOT VERIFIED, expert approval PENDING. Демопублікація
не створює юридичного схвалення. Source/reviewer gates Stage 10B обов’язкові.
Hosted CI, DNS, certificate issuance, Nginx runtime та volume recovery в цьому
етапі не виконуються автоматично; власник deployment має завершити checklist.

## Stage 10D — заміна демонабору

Manifest містить три Stage 10C кейси. Перезапустіть API після оновлення release: каталог читається заново навіть за наявного persistent store. Не видаляйте авторську БД. Старі CIDS можуть залишатися доступними за direct API URL у старому store, але не в каталозі/picker. Static CIDS assets новий build не пакує. Три нові кейси мають unverified джерела й невстановлені нормативні редакції; demo availability не є human approval. Перед навчальним застосуванням потрібен правовий і педагогічний review. Див. ADR 0004 і STAGE_10D_REPORT.md.
