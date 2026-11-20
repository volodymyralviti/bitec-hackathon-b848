# Stage 10C — матриця всіх 24 маршрутів

Метрики: прозорість / справедливість / довіра / ефективність. Це не моральний рейтинг. Повні node/choice IDs і triggers — у відповідних .routes.json.

Значення незалежного content oracle перевірені реальним public Engine. Source check PARTIAL, expert approval PENDING. Stage 10D дозволяє кураторський DEMO показ із застереженням, без expert publication; маршрути не змінено.

## report-under-pressure

| № | Вибори (номер альтернативи) | Ending | T / F / Trust / E | Applied events | Unrealized |
|---|---|---|---|---|---|
| 1 | 1 → 1 → 1 | report-ending-1 | 4 / 4 / 2 / -6 | report-delayed-1, report-delayed-2, report-delayed-4 | — |
| 2 | 1 → 1 → 2 | report-ending-2 | 3 / 3 / 4 / -5 | report-delayed-1, report-delayed-2, report-delayed-4 | — |
| 3 | 1 → 2 → 1 | report-ending-1 | 6 / 1 / 1 / -3 | report-delayed-1, report-delayed-5 | report-delayed-2 |
| 4 | 1 → 2 → 2 | report-ending-3 | 5 / 0 / 3 / -1 | report-delayed-1, report-delayed-5 | report-delayed-2 |
| 5 | 2 → 1 → 1 | report-ending-2 | 5 / 3 / 1 / -1 | report-delayed-3, report-delayed-6 | — |
| 6 | 2 → 1 → 2 | report-ending-4 | 4 / 3 / -1 / 1 | report-delayed-3, report-delayed-6 | — |
| 7 | 2 → 2 → 1 | report-ending-3 | 6 / 1 / -1 / 0 | report-delayed-3, report-delayed-7 | — |
| 8 | 2 → 2 → 2 | report-ending-4 | 4 / 2 / -2 / 3 | report-delayed-3, report-delayed-7 | — |

## fair-selection

| № | Вибори (номер альтернативи) | Ending | T / F / Trust / E | Applied events | Unrealized |
|---|---|---|---|---|---|
| 1 | 1 → 1 → 1 | selection-ending-1 | 6 / 3 / 0 / -3 | selection-delayed-1, selection-delayed-2, selection-delayed-4 | — |
| 2 | 1 → 1 → 2 | selection-ending-2 | 5 / 3 / -2 / -1 | selection-delayed-1, selection-delayed-2, selection-delayed-4 | — |
| 3 | 1 → 2 → 1 | selection-ending-1 | 6 / 4 / 0 / -1 | selection-delayed-1, selection-delayed-5 | selection-delayed-2 |
| 4 | 1 → 2 → 2 | selection-ending-3 | 6 / 2 / 1 / 2 | selection-delayed-1, selection-delayed-5 | selection-delayed-2 |
| 5 | 2 → 1 → 1 | selection-ending-2 | 4 / 6 / 1 / -4 | selection-delayed-3, selection-delayed-6 | — |
| 6 | 2 → 1 → 2 | selection-ending-4 | 3 / 7 / -1 / -2 | selection-delayed-3, selection-delayed-6 | — |
| 7 | 2 → 2 → 1 | selection-ending-3 | 5 / 5 / -1 / -4 | selection-delayed-3, selection-delayed-7 | — |
| 8 | 2 → 2 → 2 | selection-ending-4 | 4 / 6 / 0 / -7 | selection-delayed-3, selection-delayed-7 | — |

## quiet-after-formation

| № | Вибори (номер альтернативи) | Ending | T / F / Trust / E | Applied events | Unrealized |
|---|---|---|---|---|---|
| 1 | 1 → 1 → 1 | quiet-ending-1 | 4 / 4 / 4 / -5 | quiet-delayed-1, quiet-delayed-2, quiet-delayed-4 | — |
| 2 | 1 → 1 → 2 | quiet-ending-2 | 3 / 3 / 6 / -5 | quiet-delayed-1, quiet-delayed-2, quiet-delayed-4 | — |
| 3 | 1 → 2 → 1 | quiet-ending-1 | 2 / 3 / 6 / -3 | quiet-delayed-1, quiet-delayed-5 | quiet-delayed-2 |
| 4 | 1 → 2 → 2 | quiet-ending-3 | 2 / 4 / 4 / -1 | quiet-delayed-1, quiet-delayed-5 | quiet-delayed-2 |
| 5 | 2 → 1 → 1 | quiet-ending-2 | 3 / 5 / -3 / 1 | quiet-delayed-3, quiet-delayed-6 | — |
| 6 | 2 → 1 → 2 | quiet-ending-4 | 3 / 4 / -2 / 2 | quiet-delayed-3, quiet-delayed-6 | — |
| 7 | 2 → 2 → 1 | quiet-ending-3 | 3 / 5 / 1 / -2 | quiet-delayed-3, quiet-delayed-7 | — |
| 8 | 2 → 2 → 2 | quiet-ending-4 | 2 / 6 / 2 / -2 | quiet-delayed-3, quiet-delayed-7 | — |

