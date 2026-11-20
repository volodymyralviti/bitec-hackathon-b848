# ADR 0003 — public Demo Studio та deployment recipe

## Контекст

Журі має спробувати весь editor без авторського ключа. Приватне серверне
сховище, reviewer capability і Stage 10B gates лишаються захищеними.
Scenario Schema v1 та Engine стабільні й не змінюються.

## Рішення

- `/studio` зберігає авторський login та пропонує відкритий `/studio/demo`.
- Один StudioComponent, EditorFieldComponent, form-model та SourcesComponent
  працюють в обох режимах. Інший урізаний editor не створюється.
- Lazy demo route надає власний StudioWorkspace та DEMO_STUDIO token.
  Авторський root workspace й capability не очищаються та не читаються демо.
- Форма/preview — Signals/in-memory. Немає localStorage, cookies, guest API,
  server sessions або auto-save. SPA preview/debrief/back не губить workspace;
  hard reload очищає його. Reset/unsaved exit підтверджуються, loss warning видимий.
- Режим demo не викликає login/list/save/fork/review/publish/validate-on-server,
  навіть коли author capability вже активна в тій самій вкладці. Єдиний початковий
  HTTP load — публічний синтетичний template asset, не приватний draft.
- Preview repository у scope demo читає тільки локальний валідований snapshot.
  Ті самі Solo/ Debrief components викликають чинний @eds/scenario-engine.
  Неіснуючий snapshot/ID після reload дає зрозумілий missing state без backend fetch.
- Shared Schema/graph validation виконується без дублювання. Додаткова guest
  policy приймає тільки draft/demoOnly, sources unverified, verifiedAt=null,
  незавершене review та legalStatus uncertain/відсутній. Імпорт checked/approved
  claims відхиляється явно, без мовчазного переписування джерел або proof.
  Legal Sources поля та aiAssisted зберігаються в lossless JSON roundtrip.
- Public HTTP API/guards/reviewer legalAssessments не послаблюються. Guest JSON
  із невідомими полями, зокрема legalAssessments, відхиляє strict Schema.
- Import обмежено shared LIMITS; додатковий ранній bound кількості nodes
  відхиляє тисячі вузлів до побудови великої форми. HTML-like текст інтерполюється,
  не innerHTML. Обробка JSON не виконує scripts чи зовнішні вкладення.
- Browser smoke виявив, що dynamic `[type]` input не обирав Angular NumberValueAccessor.
  Окрема статична `type="number"` гілка виправляє actual DOM input → numeric FormControl
  для deltas/count у спільному editor. Немає числового coercion у schema або engine.

## Deployment

Підготовлено provider-independent Linux recipe: Node 22.22.3 + pnpm 10,
immutable monorepo release, systemd single API, persistent /var/lib/eds,
Nginx HTTPS + same-origin REST/Socket.IO. HOST — необов’язковий bind address;
без нього default listen незмінний. У production HOST=127.0.0.1.
Немає нових dependencies, database, hosted services або AI.

Nginx recipe передає Host та WebSocket Upgrade, обмежує requests/connections,
не пише request logs, не віддає HTML fallback для missing JSON. Збережено
чинний public PIN join-link; він не містить host/participant secret чи ballot.
Наявність конфіга не доводить hosted TLS/DNS/log/volume правильність.
Локально Nginx відсутній, Docker daemon недоступний: nginx -t та реальний
TLS proxy smoke BLOCKED. Deployment/hosted CI не виконувалися.

## Перевірка / наслідки

Unit/route tests та production browser smoke перевіряють безключовий вхід,
scope isolation, відсутність protected calls, незмінність server store,
three-decision preview, exact JSON roundtrip, role forgery rejection,
числові controls, XSS escaping, reset/reload і mobile/keyboard.
Регресії перевіряють protected author reload/reopen, Solo 16 routes та Classroom.
Юридичні sources лишаються NOT VERIFIED, expert approval PENDING.
Production identity/roles, distributed abuse protection, monitoring без metadata
та final release review лишаються відповідальністю deployment-команди.
