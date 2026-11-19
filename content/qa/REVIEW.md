# Stage 04 — перевірки та відкритий content review

Дата підготовки й фіналізації QA: 2026-11-19. Авторство: AI-assisted чернетки за участю Codex.
Команда повідомила про попереднє рев'ю Stage 04. Доказу завершеної експертної,
юридичної чи технічної перевірки джерел не надано; contentReview лишається draft.
Фактична гілка checkout: `complete_scenarios`, не `feat/stage-04-content`.
Гілка не перемикалась. Початковий `git status --short` був чистий.
Контентні зміни зроблено тільки в дозволених `content/` шляхах. Під час фіналізації
за окремою вказівкою встановлено залежності й зібрано наявний schema-пакет;
його вихідний код та конфігурації не змінювались.

## Реальні команди та результати

| Команда з кореня | Результат у цьому checkout |
|---|---|
| `node --version` | `v22.22.3` |
| `pnpm --version` | `10.0.0` |
| `pnpm config get engine-strict` | `true`; `.npmrc` не змінено |
| `pnpm install --frozen-lockfile` | PASS, exit 0: lockfile up to date, resolution skipped; 1231 пакет встановлено, Done in 1m 19.8s |
| `pnpm --filter @eds/scenario-schema build` | PASS, exit 0: ESM/CJS TypeScript build і JSON Schema export |
| `node content/qa/validate.mjs` | PASS, exit 0: обидва success=true, errors=[], по 3 SOURCE_UNVERIFIED; graph errors/warnings=[] |
| `node --test content/qa/content.test.mjs` | PASS: 6/6, 0 fail, 0 skipped; усі негативні mutations перевірено публічним validator |
| `git diff --check` | PASS; нові content-файли додатково перевірено на кінцеві пробіли та символи заміни UTF-8 |

Системний Node 26.13.1 не використовувався для install/build/QA. Portable Node
22.22.3 завантажено з офіційного nodejs.org у `%TEMP%/eds-stage04-tools/`.
Corepack download pnpm перервався через ECONNRESET; pnpm 10.0.0 встановлено через
portable npm лише в цю тимчасову папку. Для наведених команд PATH процесу починався
з `%TEMP%/eds-stage04-tools/pnpm/node_modules/.bin` та
`%TEMP%/eds-stage04-tools/node-v22.22.3-win-x64`. У PowerShell використано
`pnpm.cmd`; системні інсталяції, engine-strict і manifests не змінювались.
Початковий blocker відсутньої збірки знято. Root build/lint/test, engine та UI
не запускались, бо це фіналізація лише контентного Stage 04.

## Точні diagnostics public API

| Сценарій | validateScenario.success | errors | validateScenarioGraph.errors | validateScenarioGraph.warnings |
|---|---|---|---|---|
| urgent-supply | true | [] | [] | [] |
| truth-under-pressure | true | [] | [] | [] |

Для **urgent-supply** warnings містить рівно:

| code | path | sourceId |
|---|---|---|
| SOURCE_UNVERIFIED | ["sources",0,"verificationStatus"] | cids-case |
| SOURCE_UNVERIFIED | ["sources",1,"verificationStatus"] | cids-method |
| SOURCE_UNVERIFIED | ["sources",2,"verificationStatus"] | editorial-model |

Для **truth-under-pressure** warnings містить рівно:

| code | path | sourceId |
|---|---|---|
| SOURCE_UNVERIFIED | ["sources",0,"verificationStatus"] | cids-case |
| SOURCE_UNVERIFIED | ["sources",1,"verificationStatus"] | cids-method |
| SOURCE_UNVERIFIED | ["sources",2,"verificationStatus"] | editorial-model |

Точне повідомлення кожного з шести warnings:
«Джерело не перевірено; нормативні твердження не підтверджені.»
Warnings навмисно збережено: автоматична валідація не верифікує першоджерела.
`validateScenarioJson` також success=true для обох файлів.

## Acceptance checklist

| Критерій | Статус | Доказ / межа |
|---|---|---|
| Два українські JSON, версія 1.0.0, три типи вузлів | PASS | JSON.parse і огляд контенту |
| Scenario Schema validation | PASS | Обидва JSON: public validateScenario.success=true, errors=[] |
| Відсутні критичні помилки public graph validator | PASS | Для кожного errors=[], warnings=[] |
| Кожен маршрут має >=3 рішення, кожне рішення >=2 choices | PASS (статично) | 16 перебраних маршрутів загалом, рівно 3 рішення на кожному |
| Усі target IDs існують, немає циклів і unreachable nodes | PASS (статично) | Обхід від entry до всіх вузлів/ending; це додатковий доказ |
| Справжнє розгалуження та >=2 endings | PASS (авторський огляд + структура) | 4 різні контексти третього рішення і 4 ending на сценарій |
| Immediate і delayed effects, обидва trigger types | PASS (статично) | 14 choices з immediate та 7 унікальних delayed IDs на сценарій |
| Немає неможливих delayed triggers | PASS | Public graph validator і повний перебір підтверджують expectedActivation у кожному продовженні |
| До кожного ending є документований маршрут | PASS | Дві `.routes.json` карти з усіма 8 маршрутами |
| Нюансовані альтернативи, короткі/довгі наслідки й debrief | PASS (авторський огляд) | Користь/ризик у choices; 8 багатоперспективних debrief; незалежний педагогічний review pending |
| Атрибуція CIDS і чесні обмеження | PASS з обмеженням | Локатори з контексту, всі sources unverified; PDF не прочитано |
| Немає вигаданих нормативних актів/схвалень | PASS (авторський огляд) | Normative references не вигадані; legalStatus uncertain; право unverified |
| Demo-only draft та AI provenance | PASS | Статуси перевіряються додатковим QA; немає completed-review полів |
| Немає PII/операційних фактів | PASS (авторський огляд) | Вигадані цивільні сюжети без людей, підрозділів, виробів або локацій |
| Teaching notes, карти, відтворювані команди | PASS | README, два notes, два maps, три QA scripts |
| Відповідність сектору безпеки й оборони | PASS (авторський огляд) | Вступи обох кейсів прямо задають цивільну підготовку/публічну установу сектору; без реальних підрозділів і операційних фактів |
| Schema/engine/apps/manifests/lockfile не змінено | PASS | Змінено лише content; schema має лише дозволені згенеровані dist-артефакти build |

**Технічна фіналізація Stage 04: PASS.** Усі 16 маршрутів мають рівно три рішення.
У кожному сценарії сім унікальних delayed IDs (усі 14 також різні між сценаріями),
чотири after_decisions events і три on_enter_node events. Усі тригери мають
документовані досяжні точки спрацювання. Engine не запускався; runtime гарантії
не заявляються. Очікується окреме content review; проходження QA не є
підтвердженням професійної чи юридичної придатності та не змінює draft/demoOnly.

## Контентні рішення та конфлікти інструкцій

- Використано фактичні назви полів Stage 02; старі backlog `status=pending`,
  `versionDate`, `canonicalUrl` не переносились у JSON. Жодної зміни DSL.
- Норми не підмінялись вигаданим джерелом. Невирішені правові питання винесено
  в обидва teaching notes, source registry залишається в кожному JSON.
- Для review draft не додано `reviewerRole`, `reviewedAt` або `evidenceRef`.
- Уточнення користувача про незалежність від Stage 03 має пріоритет над старим
  `prompts/04_content.md`, де згадані engine path tests. Runtime тут не перевірявся.
- Атрибуцію №16 уточнено за повідомленням команди: поряд із комунікаційним
  обладнанням і запчастинами оригінал згадує термінову потребу в генераторах для
  зарядки батарей. Вигаданий сюжет про резервне живлення відкритого навчання
  залишається авторською адаптацією. №1 — професійна консультація, що може
  суперечити поглядам політичного керівництва. PDF незалежно не прочитано.
- У цій фіналізації змінено два scenario JSON, README, два teaching notes і цей
  REVIEW.md. Карти маршрутів і QA scripts не змінювались: граф лишився тим самим.
- Перехід до наступної стадії, публікація, commit і push не виконувались.

## Людський review: що залишилося

1. Звірити CIDS №1, №16, шість кроків і п’ять тестів з оригінальним PDF;
   підтвердити бібліографію, сторінки та умови відтворення/атрибуції.
2. Звірити вимоги із `task.pdf`, якого локально немає.
3. Надати точні перевірені українські норми й редакції лише після визначення
   застосовності: закупівельна інформація/специфікація/обсяг, канали професійної
   поради/фіксації та приватність можливих майбутніх досліджень.
4. Технічному та педагогічному reviewer оцінити правдоподібність, баланс
   альтернатив, пропорційність наслідків і ризик прочитання deltas як рейтингу.
5. Після появи схвалення зберегти реальний доказ review, не змінюючи прапорці
   наперед заради автоматичного PASS.
