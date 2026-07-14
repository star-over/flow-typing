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
| **B** | Выравнивание контрактов между модулями | средний (границы client/server) | ✅ 4/7 сделано (merge `c0322f6`): 1.3/1.4/2.1/2.4; остались `rateLimiter`-ключи, `seedDrill` layout, `SymbolStat` |
| **C** | Структура каталогов/доменов | средний | ✅ сделана (merge `87647f1`): C.2/C.3 переименования, C.4 журнал→`session-history/`, C.5 `survey/`; A.4 `src/app` снят |
| **D** | Канон-касающееся (нужен ADR / заметка в CONTEXT.md) | требует решения, не механика | ✅ 4/5 сделано (merge `d72f25d`): 1.5/Ms/2.2/2.5; решения — doc-заметки, ADR не потребовался; остался i18n-копи-проход |

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

- [x] **Выполнено в Волне C** (untracked-мусор — только `.DS_Store`, коммитом не удаляется, без commit-ref): `src/app/` снесён `rm -rf src/app`.
- [x] `shared/selection-index/selection-index.test.ts`→`compute.test.ts` (тест по имени источника 1:1) — `9aec6de`
- [ ] **ОТКЛОНЕНО (обоснованно):** `convex/test.helpers.ts`→`test-helpers.ts` — дефис невалиден в пути convex-модуля, а `testHelpers` (camelCase) convex пытается **развернуть** (падает на тест-зависимостях `import.meta`). Точечный сегмент `test.` — намеренная идиома «не разворачивать». Оставлено как есть (обоснование — в теле `9aec6de`).
- [x] `src/components/key-cap/KeyCap.contract.ts` — токен `KEYCAP_CONTRACT`→`KEY_CAP_CONTRACT` — `9aec6de`
- [x] `src/fixtures/hands-scene/simple_e_error_shift_F.ts`→ строчная `f` — `9aec6de`
- [x] `src/user-settings/user-settings.ts`→`defaults.ts` (+ co-located `user-settings.test.ts`→`defaults.test.ts`) — `9aec6de`

---

## Волна B — выравнивание контрактов между модулями (ветка `refactor/naming-wave-b`)

- [x] **Развести `durationSeconds`** (конфиг vs факт) — грилл выбрал ОБРАТНУЮ сторону, чем предлагал этот пункт: двигаем measured, не config. `SessionRow.durationSeconds` и `SessionStats.durationInSeconds`→`elapsedSeconds` (родное слово, ср. `elapsedMs`/`displayElapsedMs`); config (`durationSeconds`/`sessionDurationSeconds`) оставлен; коллизия снята. Решение — `CONTEXT.md`, раздел Session — `d0ceb5a`
- [x] **Слить ячейку профиля** `ProfileCell` / `SymbolCell` / `SeedProfileCell` — `convex` импортирует `ProfileCell` из `shared`; поле схемы `symbolCells` не тронуто. `drill.ts`-половина (`SymbolCell`→`ProfileCell`) утекла в `cc96486` (Волна A); остаток `test.helpers.ts` (`SeedProfileCell`) — `2fe5e04`
- [x] **`summary`/`payload`** — единое имя `summary` на всей нити (машины → `session-impl` → convex `sessions.ts`/`validation.ts` + тесты/фикстуры того же концепта); тип `SessionSummaryPayload` оставлен (несёт смысл), wire-поля разворачиваются — `af8c77b`
- [x] **`sessionDurationSeconds`→`durationSeconds`** через XState — грилл: укорачивание УЗАКОНЕНО комментарием (квалификатор `session` избыточен внутри собственной области сессии — `SessionInput`), не проносим канон-имя через все слои. Асимметрия `currentSymbolLayoutId` vs `sessionDurationSeconds` тоже узаконена комментарием (`app.machine.ts`, разные оправдания префиксов) — `d0ceb5a`
- [ ] **Ключи `rateLimiter`** (`convex/rateLimiter.ts:19-31`) → строки-пути `api.<module>.<fn>` (`'sessions.record'`, `'userSettings.upsertMine'`, …)
- [ ] `convex/test.helpers.ts:89-98` (`seedDrill`) — параметр `layout`→`symbolLayoutId`
- [ ] (низкий) `SymbolStat`/`SymbolStatInput` — единое локальное имя `SymbolStat` по обе стороны

---

## Волна C — структура каталогов/доменов (ветка `refactor/naming-wave-c`)

- [x] консолидация домена `session` (грилл, решение владельца): журнал `src/lib/sessions/` → `src/lib/session-history/` (снята плюральная двусмысленность «живые vs прошлые»); живая логика `session-*.ts` оставлена **плоской** — единообразно с соседями `drill/batch/exposure/typing-stream` (самостоятельные термины глоссария, в `session/` не собираются); решение зафиксировано в `src/lib/CLAUDE.md` — `6dea191`
- [x] консолидация домена `survey` (грилл, решение владельца): `micro-survey.ts` (+ тест) собран в существующий `src/lib/survey/` к `survey-store` — `6dea191`
- [x] `src/lib/auth-gate.ts` / `auth-gated-query.svelte.ts` → `gated-query.*` (нейтрально: query-шов, не auth-подсистема; символы `runAuthGate`/`createAuthGatedQuery` и doc-язык оставлены — точно описывают, что значение закрыто auth-проверкой) — `2f3760d`
- [x] `src/lib/dev/typing-capture-store.ts` → `typing-capture-idb.ts` («store» = IndexedDB object store, не Svelte-стор) — `49753c5`

---

## Волна D — канон-касающееся (нужен ADR / заметка в CONTEXT.md)

Не механика — сперва решение/запись в канон, потом код.

- [x] `src/interfaces/types.ts` — JSDoc «упражнение»→канон (`TypingStream` = непрерывный поток из многих `Drill`, границ нет; попутно поправлен copy-paste «роль»→«стрелка» в перечислении ARROWS) — `a75ccca`
- [x] зафиксировать конвенцию `Ms`-суффикса (внутри конвейера/хранилища без суффикса, на выходе к UI/журналу — с `Ms`) — заметка в `CONTEXT.md` (раздел Session, рядом с target/measured) — `5ba50fe`
- [x] роли `drillIndex.ts` (агрегат-экземпляр) vs `selectionIndex.ts` (writer-пересборка) — **комментарий-навигатор** (двусторонняя перекрёстная ссылка); переименование модуля ОТКЛОНЕНО (рвало бы `selectionIndex:*` в Makefile + `docs/deploy/prod-bootstrap.md` строковыми литералами) — `cb4e36e`
- [x] **investigate → решено: НЕ сливать** (вариант B). Query намеренно разведены весом payload (lite live-путь vs полный `/stats`; канон-подтверждено `docs/plans/2026-06-23…:21` + audit-3 кандидат 5). Тип `RepertoireProgress`→`RepertoireSnapshot` (снимок ≠ витринный компонент `RepertoireProgress.svelte`); query/`_generated` не тронуты; doc-заметка в `CONTEXT.md`, НЕ ADR (контур data-fetching не меняется) — `ab76062`
- [ ] **НЕ в этой сессии (копи-проход):** i18n EN `"unlocked"`/`"matured"` → `opened`/`ready` (параллель с RU); + отложенное A.2 (`"Lesson Results"`→`"Session Results"`)

---

## Источник и не-цели

- **Источник:** аудит имён сессии 2026-07-14 (4 параллельных субагента: term-fidelity, границы модулей, каталоги/файлы, локальные имена + split/merge). Ядро тройки `ladderStep`/`stepLevel`/`openedSteps`, граница `settings-sync↔userSettings`, ViewModel-pipeline и семья `summary` — проверены и **корректны, не трогать**.
- **Не-цель:** менять поведение. Все пункты A–C — переименования; D — согласование канона + один investigate. Изменение зафиксированных решений оформляется новым ADR (тело принятого не переписывается).
