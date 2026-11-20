# ADR 0004 — Кураторський демокаталог окремо від expert publication

Stage 10D. Рішення: `content/scenarios/index.json` є deployment-owned allowlist
публічного навчального **демо**, а не реєстром юридично схвалених матеріалів.
Він містить три оригінальні Stage 10C кейси в порядку презентації.

Angular prepare копіює лише manifest і перелічені валідні JSON до
`apps/client/.angular/solo-content`; production build публікує їх у `/scenarios/`.
Застарілі generated JSON прибираються лише в цій службовій папці.

NestJS на кожному старті читає той самий manifest у відокремлену read-only
демопроєкцію. `GET /api/scenarios` повертає тільки її, у manifest order;
Solo і Classroom picker використовують цей спільний API. Раніше seed читався
тільки при створенні файлової БД, тому старі CIDS лишалися б у каталозі після
оновлення індексу. Тепер наявне авторське сховище не переписується.

Оригінальні JSON і static assets лишаються `publicationStatus=draft`.
API використовує **існуючу** `publicationStatus=demo` проєкцію seed для
сумісності з public API adapter. Це статус доступності демо, не `published`
і не зміна source JSON. `contentReview.status=draft`, `demoOnly=true`,
`aiAssisted=true`, `unverified`, null verifiedAt/невідомі нормативні редакції
та `legalStatus=uncertain` залишаються незмінними. Позначки й застереження
показуються на картці, сторінці та Debrief.

Manifest не є author/reviewer credential. Всі записи проходять той самий schema
validator; підроблене `published` з неперевіреними джерелами відхиляється навіть
для manifest member. Guards, reviewer actions, human evidence та production
publication gate не змінюються. Приватні drafts не додаються до manifest
автоматично; Demo Studio не має server write access.

Старі CIDS JSON, teaching notes, engine fixtures і всі 16 маршрутів збережені.
У нових static assets та свіжому API store їх немає. Якщо попереднє сховище
вже містить CIDS зі статусом demo/published, старий direct API URL може лишитися
доступним через існуючий publicGet; це не повертає кейс у каталог чи picker.
Те саме стосується інших раніше явно оприлюднених версій. Видалення старих
публічних записів/авторських даних не є частиною цього етапу.

При змінах manifest API треба перезапустити, Angular — запускати через
`pnpm dev:web` або `pnpm build`. Для майбутнього approved каталогу потрібне
окреме продуктове рішення; кураторський demo список не підміняє reviewer publish.

Докази: assets regression (включно зі stale cleanup), persisted-store/restart
tests, negative publication test, protected API e2e та реальний browser smoke
трьох кейсів. Правові редакції NOT VERIFIED, expert approval PENDING.
