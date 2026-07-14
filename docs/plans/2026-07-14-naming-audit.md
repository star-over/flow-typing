# План: аудит имён — трекинг исполнения

> Дата: 2026-07-14. Статус: **принят владельцем целиком** («все правки принимаются»). Живой трекинг-документ: сторонние агенты отмечают выполнение прямо здесь.
>
> **Цель аудита:** улучшить восприятие проекта ИИ-агентами — имена (каталоги → файлы → типы → переменные) должны совпадать с каноническим доменным языком (`CONTEXT.md`, `docs/02-naming-conventions.md`) и друг с другом, без исторического дрейфа.

## Как отмечать выполнение

- Пункт сделан → `- [ ]` заменить на `- [x]` и дописать в конце ` — <commit-hash>`.
- Статус **бинарный** (сделано / не сделано); «почти/частично» — не статус, назвать что осталось отдельной строкой.
- **Ворота перед коммитом каждой волны:** `make check-all` зелёный (включает `convex dev --once` + build + тесты + spell). НЕ полагаться на `check-dev` (прячет warnings).
- После переименования Convex-функций/схемы — `npx convex dev --once` для регенерации `_generated` + валидации развёртывания.
- Переименование CSS-контракт-токенов двигать синхронно: темы (`src/themes/*`) + компонент + `*.contract.ts` + агрегат `THEME_CONTRACT`.
- Волны сделаны на отдельных ветках (`refactor/naming-wave-*`), merge `--no-ff` + push — инициирует владелец.

## Порядок волн

| Волна | Суть | Риск | Статус |
| --- | --- | --- | --- |
| **A** | Чистые переименования, ноль поведения | низкий (тестами прикрыто) | ✅ сделана (merge `7821b0d`; 2 отклонения отложены — см. ниже) |
| **B** | Выравнивание контрактов между модулями | средний (границы client/server) | ⬜ не начата |
| **C** | Структура каталогов/доменов | средний | ⬜ не начата |
| **D** | Канон-касающееся (нужен ADR / заметка в CONTEXT.md) | требует решения, не механика | ⬜ не начата |

---

## Волна A — чистые переименования (ветка `refactor/naming-wave-a`)

Детальный self-contained разбор с якорями — во временном handoff той же сессии; ниже — трекинг-срез. При необходимости перед началом — **грилл-сессия** (`grill-with-docs`) для фиксации терминологии 1.1.

### A.1 — `setMyLadderStep` пишет `openedSteps`, а не `ladderStep` (семантическая ловушка)
Имя намекает на правку контентного `ladderStep` (ADR 0020, меняется только ре-нарезкой), а dev-утилита пишет `openedSteps` профиля.

- [x] `convex/drill.ts:513-592` — `setMyLadderStepHandler`→`setMyOpenedStepsHandler`, mutation `setMyLadderStep`→`setMyOpenedSteps`, параметр `targetStep`→`targetOpenedSteps` — `cc96486`
- [x] `src/lib/dev/ladder-set.ts` → `opened-steps-set.ts`; `window.__setLadderStep`→`__setOpenedSteps`; `attachLadderStepSet`→`attachOpenedStepsSet`; `SetLadderStepConsoleApi`→`SetOpenedStepsConsoleApi`; прозу-комментарии выправить — `cc96486`
- [x] `src/machines/appActor.ts:27-29` — import + комментарий — `cc96486`
- [x] `convex/drill.test.ts` (~10 мест), `convex/lib/validation.ts:9` (комментарий) — `cc96486`
- [x] `npx convex dev --once` — регенерация `_generated` + развёртывание-валидация — `cc96486`
- [x] **(грилл-развилка, решена владельцем: ДА)** родственные `startStep`/`currentStep` → `startOpenedSteps`/`currentOpenedSteps`, `didStepGrow`→`didOpenedStepsGrow` (`src/lib/repertoire/repertoire-store.svelte.ts`) — `cc96486`

### A.2 — `Lesson*`-кластер → `Session*` (avoid-термин; экран завершённой СЕССИИ)
`lesson`/`урок` явно похоронен в `CONTEXT.md`. Компонент рендерится в `sessionComplete`.

- [x] `src/components/train/LessonStatsDisplay.{svelte,stories.svelte,contract.ts}` → `SessionStatsDisplay.*` — `faee32e`
- [x] тип `LessonStats`→`SessionStats`, функция `lessonStatsFromSummary`→`sessionStatsFromSummary` (`src/lib/stats-calculator.{ts,test.ts}`) — `faee32e`
- [x] `src/components/app/MainContent.svelte:14,17,57,60,80` — импорты + локаль `lessonStats` — `faee32e`
- [x] `src/lib/sessions/sessions-store.svelte.ts` — проверить и выправить ссылку на `Lesson*` — `faee32e`
- [x] контракт-токен `LESSON_STATS_DISPLAY_CONTRACT`→`SESSION_STATS_DISPLAY_CONTRACT` (`src/themes/contract.ts` агрегат) + CSS-переменные `--lesson-stats-display-*`→`--session-stats-display-*` (темы+компонент+контракт синхронно) — `faee32e`
- [ ] **ОТЛОЖЕНО в Wave D (решение владельца):** i18n-**значения** (`en.json:86 stats_card.title "Lesson Results"`→`"Session Results"` + `ru.json`) — копи-проход, не Wave A. Идентификаторы кода уже переименованы.

### A.3 — локальные имена (единичные, малый радиус)

- [x] `src/lib/hands-scene.ts` — `keyId`→`keyCapId` (~14 мест; тип `KeyCapId`) — `26b74f9`
- [x] `src/machines/session-impl.ts:42` — `res`→`response` — `26b74f9`
- [x] `convex/drill.ts` — аккумулятор `total`→`totalChars` (в **обеих** функциях) — `26b74f9`
- [x] `convex/drill.ts:250,375` — `grownOpenedSteps`→`growOpenedSteps` (глагол) — `26b74f9`
- [x] `src/lib/session-summarize.ts:58` — `summarizeSession`→`sessionSummarize` (симметрия к `drillSummarize`; 3 вызова) — `26b74f9`

### A.4 — файловые нити (косметика предсказуемости)

- [ ] **НЕ в Wave A (untracked-мусор, коммитом не удалить):** `src/app/` — снести `rm -rf src/app` в основном каталоге; владелец переназначил в Волну C.
- [x] `shared/selection-index/selection-index.test.ts`→`compute.test.ts` (тест по имени источника 1:1) — `9aec6de`
- [ ] **ОТКЛОНЕНО (обоснованно):** `convex/test.helpers.ts`→`test-helpers.ts` — дефис невалиден в пути convex-модуля, а `testHelpers` (camelCase) convex пытается **задеплоить** (падает на тест-зависимостях `import.meta`). Точечный сегмент `test.` — намеренная идиома «не деплоить». Оставлено как есть (обоснование — в теле `9aec6de`).
- [x] `src/components/key-cap/KeyCap.contract.ts` — токен `KEYCAP_CONTRACT`→`KEY_CAP_CONTRACT` — `9aec6de`
- [x] `src/fixtures/hands-scene/simple_e_error_shift_F.ts`→ строчная `f` — `9aec6de`
- [x] `src/user-settings/user-settings.ts`→`defaults.ts` (+ co-located `user-settings.test.ts`→`defaults.test.ts`) — `9aec6de`

---

## Волна B — выравнивание контрактов между модулями (ветка `refactor/naming-wave-b`)

- [ ] **Развести `durationSeconds`** (конфиг vs факт): `targetDurationSeconds` в `session.machine.ts`/`selectors.ts`/`app.machine.ts`; `durationSeconds` оставить журналу (`sessions-store.svelte.ts`, `durationMs/1000`)
- [ ] **Слить ячейку профиля** `ProfileCell` (`shared/repertoire/readiness.ts`) / `SymbolCell` (`convex/drill.ts:234`) / `SeedProfileCell` (`convex/test.helpers.ts`) — `convex` импортирует `ProfileCell` из `shared`; имя поля схемы `symbolCells`
- [ ] **`summary`/`payload`** — единое имя `summary` на соседних действиях (`session.machine.ts:93/96`, `session-impl.ts:64/78`)
- [ ] **`sessionDurationSeconds`→`durationSeconds`** через XState — либо пронести без сокращения, либо зафиксировать правило комментарием; заодно асимметрия `currentSymbolLayoutId` vs `sessionDurationSeconds`
- [ ] **Ключи `rateLimiter`** (`convex/rateLimiter.ts:19-31`) → строки-пути `api.<module>.<fn>` (`'sessions.record'`, `'userSettings.upsertMine'`, …)
- [ ] `convex/test.helpers.ts:89-98` (`seedDrill`) — параметр `layout`→`symbolLayoutId`
- [ ] (низкий) `SymbolStat`/`SymbolStatInput` — единое локальное имя `SymbolStat` по обе стороны

---

## Волна C — структура каталогов/доменов (ветка `refactor/naming-wave-c`)

- [ ] консолидация домена `session`: плоские `src/lib/session-*.ts` (живая логика) vs `src/lib/sessions/` (журнал) vs `src/machines/` — собрать/развести смысл в именах
- [ ] консолидация домена `survey`: `src/lib/micro-survey.ts` vs `src/lib/survey/`
- [ ] `src/lib/auth-gate.ts` / `auth-gated-query.svelte.ts` → нейтральное `gated-query` (логика общая, не auth-специфичная)
- [ ] `src/lib/dev/typing-capture-store.ts` → `-idb`/`-db` («store» здесь IndexedDB, не Svelte-стор)

---

## Волна D — канон-касающееся (нужен ADR / заметка в CONTEXT.md)

Не механика — сперва решение/запись в канон, потом код.

- [ ] `src/interfaces/types.ts:12,25,37,149,159,257` — JSDoc «упражнение»→«непрерывный поток из многих Drill» (файл — официальный источник единого языка; макс. радиус доверия)
- [ ] зафиксировать конвенцию `Ms`-суффикса (внутри конвейера `latencyMedian`/`latencyEwma` без суффикса, на выходе к UI/журналу — с `Ms`) — одной строкой в `CONTEXT.md`
- [ ] прояснить роли `convex/drillIndex.ts` (reader-агрегат) vs `convex/selectionIndex.ts` (writer-пересборка) одной таблицы `drillSelectionIndex` — суффиксы роли либо комментарии-навигаторы
- [ ] **investigate** дедупликацию `RepertoireProgress`/`ProgressionDetail` (дублируют тело подсчёта; второй — почти надмножество) — слить в один источник + derive-селектор, ИЛИ выровнять имена, если payload-экономия намеренная. Возможен ADR
- [ ] i18n-копирайт: EN `"unlocked"`/`"matured"` → выровнять на `opened`/`ready` (avoid-геймификация; параллель с RU `"открыт"`/`"готово"`)

---

## Источник и не-цели

- **Источник:** аудит имён сессии 2026-07-14 (4 параллельных субагента: term-fidelity, границы модулей, каталоги/файлы, локальные имена + split/merge). Ядро тройки `ladderStep`/`stepLevel`/`openedSteps`, граница `settings-sync↔userSettings`, ViewModel-pipeline и семья `summary` — проверены и **корректны, не трогать**.
- **Не-цель:** менять поведение. Все пункты A–C — переименования; D — согласование канона + один investigate. Изменение зафиксированных решений оформляется новым ADR (тело принятого не переписывается).
