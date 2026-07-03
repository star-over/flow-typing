# Аудит тестовой системы: углубление тест-модулей + дыры покрытия

> Статус: **список кандидатов** (не execution-план). Ни один ещё не спроектирован —
> каждый требует отдельной сессии grilling (что за швом, какой инвариант закрепляем,
> какие тесты выживают). Найдено инструментом `improve-codebase-architecture`
> 2026-07-03, фокус — **тесты и система тестирования** (по запросу пользователя).
>
> **Связь с первыми двумя проходами** (`2026-06-28-architecture-deepening-audit.md`,
> `2026-06-29-architecture-deepening-audit-2.md`): там линза — продакшн-модули,
> тестируемость лишь мерило выгоды. Здесь линза другая — **сам тестовый корпус как
> набор модулей**: где тест-инфраструктура мелкая/дублируется, где продакшн-коду не
> хватает шва, из-за чего тестовая поверхность мелка. Пересечения помечены.
>
> Словарь (как в прошлых проходах): **глубокий** модуль = много поведения за малым
> интерфейсом; **мелкий/shallow** = интерфейс почти как реализация; **deletion-тест**
> = удали модуль, сложность исчезла → pass-through, всплыла у N вызывающих → зарабатывал
> хлеб; **locality** = баги/знание в одном месте; **leverage** = что дают вызывающим;
> **шов** = место подмены поведения без правки на месте; **интерфейс = тестовая
> поверхность** (тест и вызывающий пересекают один шов).
>
> Все находки проверены на реальном коде (4 Explore-агента + чтение из первых рук).
> Ни один кандидат не конфликтует с ADR, кроме №8 (Storybook) — там развилка позиции.

## Отметка прогресса

Статусы: 🔲 НЕ НАЧАТО · 🔧 В РАБОТЕ · ✅ СДЕЛАНО · ⛔ ОТКЛОНЁН (с причиной / ADR).
При исполнении — вписывать блок «**Сделано (дата).**» с веткой и что закрыто, как в
прошлых аудитах.

---

## Системный фон (три факта, задающие рамку)

1. **Нет ни одного `setupFiles`** ни в одном из 4 vitest-проектов (`vitest.config.ts`).
   Нет `test-utils`/`*-helpers`/`*-fixture`-модулей. Единственный формализованный дом
   фикстур — `src/fixtures/hands-scene/` (17 файлов) — обслуживает ровно 2 теста
   (`hands-scene.test.ts`, `keyboard-scene.test.ts`). Весь остальной setup — инлайн в
   теле `it`. `beforeEach` встречается ровно 1 раз (`typing-stream.test.ts:11`, глушит
   `console.warn`).
2. **Нет `jsdom`/`happy-dom`** → проект `src` идёт в node, компоненты компилируются в
   server-mode, `$effect` вырезается. Ни один тест не рендерит компонент (нет
   `@testing-library/svelte`, `render(`). Позиция «компоненты = только Storybook»
   зафиксирована в `CLAUDE.md:120` осознанно.
3. **CLAUDE.md знает 2 тест-проекта (src, convex), а их 4** — `auto-flow` и `shared`
   (`vitest.config.ts:25–38`) появились позже и в тест-разделе не описаны (док-дрейф,
   см. секцию C).

---

## A. Углубляющие кандидаты (shallow → deep)

### 1. `drillNext`: ядро отбора заперто inline в замыкании query — единственный «жирный» handler, не вынесенный по паттерну проекта — HIGH · ✅ СДЕЛАНО

**Файлы:** `convex/drill.ts:139–183` (seeded distinct-pick loop + добор под бюджет +
broken-ref fallback) · вынесен только хвост `buildDefaultDrills` (`:107–124`) ·
тест только сквозной `convex/drill.test.ts:55–154`.

**Проблема.** Паттерн проекта — «чистый handler извлечён из обёртки» — выдержан почти
везде (`createOrUpdateUserHandler`, `getMineHandler`, `applyDrillSummaryHandler`,
`repertoireSnapshotHandler`, `resolveOpenedSteps`…). `drillNext` — исключение: доменное
ядро отбора (ADR 0009 — двухслойный отбор, seed; ADR 0006 — бюджет в символах) живёт
прямо в `query({ handler })` и **не вызывается в изоляции**. Следствие — дыры покрытия,
не закрываемые без деплоя реального Convex: ветка `openedSteps > 1` не гоняется ни разу
(обёртка резолвит openedSteps через `getAuthUserId`, в тестах identity нет → всегда
cold-start 1); «разные seed → разная выборка» не проверяется на уровне query;
step-исключение (`drill.test.ts:65`) проходит лишь потому, что openedSteps=1. Deletion-тест:
удали воображаемый шов «выбрать drill'ы под seed+бюджет из открытых шагов» — вся логика
всплывает единственным нетестируемым куском в query. Зарабатывает хлеб.

**Решение (направление, не интерфейс).** Извлечь ядро отбора за чистый шов (вход: пул
кандидатов / срез открытых шагов + seed + бюджет; выход: список drill-текстов) — как уже
сделано с прочими handler'ами. Обёртка `drillNext` резолвит identity/openedSteps и зовёт ядро.

**Выгода.** Ядро отбора впервые становится тестовой поверхностью: seed-детерминизм,
бюджет, broken-ref fallback **и `openedSteps > 1`** — юнитом, без деплоя. Locality:
политика отбора в одном доме, не размазана между обёрткой и inline-циклом. Усиливает
handler-паттерн и ADR 0009.

**Перед исполнением (grilling).** Где живёт шов (в `convex/drill.ts` рядом или в
`shared/drill-selection`, который уже держит `random-pick`); что именно вход ядра (готовый
пул строк из БД vs сама выборка из агрегата); не тащит ли ядро зависимость на `ctx.db`
(тогда это не чистый шов, а II/O-handler). НЕ пересматривать ADR 0009/0011.

**Сделано (2026-07-03).** Ветка `refactor/drill-next-selection-seam`. Ядро отбора
извлечено как I/O-handler `selectDrillsHandler({ ctx, symbolLayoutId, openedSteps,
budgetChars, seed }) → { drills }` (не чистый шов — тянет `drillIndex` + `ctx.db`, как и
ожидалось в grilling'е). Обёртка `drillNext` теперь тонкая: `getAuthUserId` →
`resolveOpenedSteps` → делегат (форма `repertoireSnapshotHandler`). Граница выбрана по
`openedSteps`, не по `userId`: та же валюта, что у уже вынесенных `buildDefaultDrills` и
`resolveOpenedSteps`, и она напрямую закрывает дыру `openedSteps > 1` без identity.
Тотальность (ADR 0011) осталась локальной внутри ядра. Контракт `drillNext` на проводе не
менялся — извлечение поведение-сохраняющее, сквозные query-тесты зелёные. **Закрыто
покрытие:** два юнит-теста на шов — `openedSteps 2` (шаг 1 впущен, шаг 2 отсечён по bound
`stepLevel < openedSteps`) и different-seed (разные seed → разная выборка). Полный путь
через identity (`openedSteps > 1` в `drillNext`-query) остаётся за кандидатом 5
(`withIdentity`). Проверено: `make check-all` (кроме spell — правится централизованно) +
`npx convex dev --once` зелёные.

---

### 2. `StreamSymbol`/`TypingStream` — у ядра домена нет билдер-дома: строится тремя несогласованными способами в 9 файлах — HIGH · ✅ СДЕЛАНО

**Файлы:** билдер `sym()` дословно — `session.machine.test.ts:11`, `training.machine.test.ts:52`,
`session-queue.test.ts:7` · билдеры `press()`+`streamSymbol()` дословно —
`drill-summarize.test.ts:6`, `exposure-reading.test.ts:6`, `session-summarize.test.ts:15` ·
инлайн-литералы `{ targetSymbol, targetKeyCaps, attempts }` — `stream-utils.test.ts` (10×),
`press-result-utils.test.ts` (5×), `typing-stream.test.ts`, `app.machine.test.ts`.
Смежно: bootstrap раскладок (`getSymbolLayout('qwerty')`/`getPhysicalLayout('ansi')`/
`getFingerLayout('asdf')`) копируется в ~7 файлов, хотя `fixtures/hands-scene/test-data.ts:8–11`
уже держит ровно эти объекты. Override-билдеры payload'ов переизобретены пофайлово:
`stats-calculator.test.ts:6` (`summary()`), `sessions-store.test.ts:4` (`session()`),
`auth-state.test.ts:8` (`mockUser()`); инлайн `UserSettings`/`CloudSettings` —
`settings-sync.test.ts:15–37`.

**Проблема.** `StreamSymbol` — самая фундаментальная единица домена (вход всех
summary/typing/exposure-правил), и у неё **три параллельных способа сборки**, ни один не
вынесен. Правка формы `StreamSymbol`/`StreamAttempt` (или правила «проскока» на уровне
attempts) заставит трогать до 9 файлов; два билдер-семейства уже дрейфуют по стилю
(`sym` vs `press`+`streamSymbol`). Deletion-тест: удали воображаемый билдер-дом — 6 копий
двух хелперов + инлайн-литералы всплывают у 9 вызывающих.

**Решение (направление).** Один тонкий-интерфейсом / много-поведения дом тест-билдеров
доменных объектов (`StreamSymbol`, `TypingStream`, аккорд `KeyCapId[]`, attempts), плюс
переиспользование готового layout-bootstrap из `test-data.ts`. Возможно, туда же —
override-билдеры payload'ов.

**Выгода.** Locality: форма `StreamSymbol` меняется в одном месте. Leverage: новый
stream-тест тривиален. Тесты читаются как домен (`stream('a','b')`), а не как россыпь литералов.

**Перед исполнением (grilling).** Где селится дом (`src/fixtures/` расширить vs новый
`src/test-support/`); один билдер с overrides vs набор мелких (`sym`/`chord`/`attempt`);
переносить ли payload-билдеры сразу или отдельным шагом; как не втянуть прод-импорты в
тестовый дом лишнего.

**Сделано (2026-07-03).** Ветка `refactor/stream-test-builders`. Дом билдеров —
`src/fixtures/stream.ts` (сосед `hands-scene/`; alias `@` → `src`): экспортирует три
фабрики под теми же именами, что копировались по файлам — `sym(targetSymbol, key)`
(одноклавишный, пустые attempts), `press(keys, startAt?)`, `streamSymbol(targetSymbol,
target, attempts)`. Гранулярность — набор мелких (не один `symbol({...overrides})`), чтобы
диффы в «идентичных» файлах свелись к «удалить локальный def + импорт». **Объём — только
консолидация определений (Вариант A):** удалены 6 байт-в-байт дублей (`sym`×3 —
`session.machine`/`training.machine`/`session-queue`; `press`+`streamSymbol`×3 —
`drill-summarize`/`exposure-reading`/`session-summarize`) + 1 тривиальный литерал
`app.machine.test.ts` (ровно `sym('x','KeyX')`). Классификационные инлайн-литералы
(`stream-utils`/`press-result-utils`/`typing-stream`) **оставлены дословно** — там attempts
это предмет теста, а `dev/typing-run` требует `endAt`, которого билдер `press` не несёт
(ловушка вариативности). Phase 2 из handoff (bootstrap раскладок + payload-билдеры) —
отложена отдельным шагом, чтобы дифф остался обозримым. Правки поведение-сохраняющие: число
тестов инвариантно (**504**, 54 файла), `make check-dev` зелёный (eslint/svelte-check
чисты). `npx convex dev --once` не требовался — тронуты только `*.test.ts`. Замечено при
исполнении (handoff расходился): `session-queue.test.ts` в `src/lib/`, не `machines/`;
`session-summarize.test.ts` держит семью `press`+`streamSymbol` (и локальную строковую
`const sym` на :75 — не билдер, коллизии нет, `sym` туда не импортируется); `StreamAttempt`
несёт ещё `endAt?`.

---

### 3. Харнесс XState-машин: тесты обходят собственный шов `selectors.ts`, тип снапшота протекает, тест-родитель переизобретён 4× — HIGH · ✅ СДЕЛАНО

**Файлы:** `getTraining()` — `session.machine.test.ts:47` и близнец `getChild()` —
`training.machine.test.ts:48` (оба `actor.getSnapshot().children.training!.getSnapshot() as …`) ·
`as SessionSnapshot` — **37 раз** в `session.machine.test.ts` (+ `as any` в
`app.machine.test.ts:15` и `selectors.ts:18`) · тест-родители: `makeTestParent`
(`training.machine.test.ts:19`), `testParentMachine` (`keyboard.machine.test.ts:12`),
`sink` (`session.machine.test.ts:122,337`), `noopParent` (`:38`), `sessionStub`
(`app.machine.test.ts:14`) · DI-`provide` инлайн 6× в `session.machine.test.ts`
(`:159,182,209,234,259,303`).

**Проблема.** Три трения в одной зоне.
- **Тесты лезут в реестр детей сырьём** (`children.training`, `children.sessionService` —
  `app.machine.test.ts:66`), хотя `selectors.ts` (`selectSessionActor`/`selectTrainingActor`)
  создан в прошлом аудите (кандидат 5 первого прохода) **именно чтобы этого не делать**.
  Шов есть — тестовая поверхность его не пересекает; `getTraining`/`getChild` — две копии
  уже инкапсулированного знания.
- **Типовая протечка снапшота:** `createActor(machine).getSnapshot()` не несёт тип машины
  → каст `as SessionSnapshot` на каждом чтении (37× в одном файле).
- **«Тест-родитель, форвардящий события ребёнку и копящий выходы» написан заново 4 раза**;
  DI через `.provide({ actors:{fetchDrills}, actions:{recordCheckpoint,recordSessionSummary} })`
  скопирован 6× с вариациями `let call=0`. Общего фейка провайдера сессии нет
  (`session-impl.ts` в тесты не импортируется — на реальный Convex не завязаны, но фейк
  копипастится).

**Решение (направление).** Тонкий-интерфейсом харнесс машинных тестов: типизированный
аксессор снапшота ребёнка поверх `selectors.ts` (тест пересекает тот же шов, что UI),
reusable «тест-родитель/sink» билдер, общий фейк-провайдер сессии; каст-протечку снапшота
закрыть на уровне харнесса.

**Выгода.** Leverage: знание про invoke-id/children — в одном доме (совпадает с
`selectors.ts`), рефактор id внутри машин не рушит тесты. Locality: 37 кастов → один.
Меньше boilerplate на кейс.

**Перед исполнением (grilling).** Почему `getSnapshot()` теряет тип (generics
`createActor` vs конкретная машина) — лечится ли это на уровне харнесса без `as`; тянуть
ли `selectors.ts` в тесты напрямую или дать тест-обёртку над ним; сводить ли 4
тест-родителя в один параметрический билдер (риск — потерять читаемость каждого стыка).
Иерархию трёх машин (ADR 0007) не трогаем. Пара к кандидату 6 (fake timers).

**Сделано (2026-07-03).** Ветка `refactor/machine-test-harness`. Дом харнесса —
`src/fixtures/machines.ts` (сосед `stream.ts`, alias `@/fixtures/*`): `trainingSnapshotOf`
(поверх продакшн-шва `selectTrainingActor` — тест пересекает **тот же** шов, что UI;
переименование invoke-id внутри машин больше не рушит тест), `provideSession({
fetchSequence, onCheckpoint, onSession })` (свёл 6 встроенных `.provide` + локальный
`makeSession`; `fetchSequence: TypingStream[]` заменил ручной `let call = 0` — `[X]` =
«первый вызов X, дальше пусто», `[X, Y]` = «X, затем Y»), `makeCompletionSink` (свёл два
ad-hoc сток-родителя `SESSION.COMPLETE`). **Корень протечки уточнён эмпирически** (probe
под `svelte-check`): 34 `as SessionSnapshot` — избыточный шум, а не отсутствие хелпера —
`createActor(provideSession(...))` уже возвращает типизированного актора, касты просто
удалены; каст **реально нужен только у ребёнка** (`children.training` типизирован как
объединение снимков всех детей) — его снял шов `selectTrainingActor`. **Объём сознательно
сужен по гриллу (Опция B — против пере-абстракции):** 4 тест-родителя в один
параметрический **не** сводились (каждый документирует контракт своей машины); keyboard-тест
**не тронут** (самый слабый выигрыш при 11 местах churn); `getChild` training-теста оставлен
(его рукодельный родитель — не `sessionMachine`, шов `selectTrainingActor` его снимок по
типам не примет); `selectKeyboardActor` в прод `selectors.ts` **не добавлен** (UI
keyboard-ребёнка не читает — события идут через window-listeners; прод-функция без
прод-вызывающих = запах). Итог: **прод-код не тронут вовсе**, даже `selectors.ts`.
Поведение-сохраняюще — 12 исходных session-тестов целы, все 54 файла зелёные (**504
инвариант рефактора**). Проверено: `make check-dev` (eslint/svelte-check чисты);
`npx convex dev --once` не требовался — тронут только тест-слой.

---

### 4. Convex-сев без дома: `insert('users')` ×34, `insertDrill` ×4, `import.meta.glob` ×6 — MEDIUM-HIGH · ✅ СДЕЛАНО

**Файлы:** `import.meta.glob('./**/*.ts')` скопирован в 6 тест-файлах · `convexTest(schema, modules)`
инстанцируется per-test (25× в `drill.test.ts`) · `insert('users', …)` — 16× (`drill.test.ts`),
11× (`userSettings.test.ts`), 7× (`sessions.test.ts`) · полная 8-полевая вставка `drills`
продублирована в `drill.test.ts:17` (`insertDrill`, локальный), `drillIndex.test.ts:15`,
`selectionIndex.test.ts:16,33` · вставка `skillProfiles` руками 9× · `convex/test.helpers.ts`
содержит только `registerDrillIndex`. Плюс: тесты читают результат через **имена индексов
схемы** (`.withIndex('by_user')` — `userSettings.test.ts:97,101,111,114,124,127`;
`by_user_and_layout` — `drill.test.ts:258,390,406`) вместо чтения через handler.

**Проблема.** Дом для сева БД отсутствует. «Создать юзера», «вставить drill» (с ручным
зеркалированием в агрегат `drillIndex`, `drill.test.ts:32`), «поднять профиль» — копипаст
по файлам, каждый со своим ad-hoc email. Знание об инварианте «таблица ↔ агрегат»
размазано по тестам. Deletion-тест: удали воображаемый seed-дом — 34 вставки юзера + 4
копии `insertDrill` + 6 копий glob всплывают.

**Решение (направление).** Дом фикстур сева для проекта `convex`: билдеры
`seedUser`/`seedDrill` (с зеркалированием агрегата)/`seedProfile` + обёртка,
инкапсулирующая `convexTest(schema, modules)`. `test.helpers.ts` уже намечен как это место.

**Выгода.** Locality: инвариант «таблица↔агрегат» и форма seed — в одном доме. Leverage:
новый backend-тест не переписывает сев. Тесно связан с кандидатом 5 (тот же харнесс
добавит `withIdentity`).

**Перед исполнением (grilling).** Насколько билдеры знают про инвариант агрегата (сев
drill сам зеркалит в `drillIndex` — тогда `insertDrill` не обходит `insertBatch`); давать
ли чтение результата через handler вместо `.withIndex` (снять привязку к именам индексов);
объём обёртки над `convexTest` (только glob+schema vs ещё и identity).

**Сделано (2026-07-03).** Ветка `refactor/convex-test-harness` (общая с кандидатом 5).
Дом сева — в `convex/test.helpers.ts` (deploy-excluded: держит `convex-test` +
`import.meta.glob`, Convex его не бандлит — проверено `npx convex dev --once`). Экспорты:
`makeConvexTest()` (`convexTest(schema, modules)` + `register(drillIndex)`, владеет единым
glob — снял 6 копий + per-test `registerDrillIndex`); `seedUser` / `seedDrillDoc` /
`seedDrill` (зеркалит строку в агрегат — инвариант «таблица ↔ агрегат» инкапсулирован, не у
вызывающего) / `seedProfile`; `asUser` (для кандидата 5). Мигрированы 6 файлов
(`auth`/`drill`/`drillIndex`/`selectionIndex`/`sessions`/`userSettings`.test.ts;
`layoutData.test.ts` — pure-fn, сева не имел). `registerDrillIndex` удалён (поглощён
`makeConvexTest`). Число convex-тестов инвариантно (61 до/после миграции). `insertDrill`
локальный + 4 копии 8-полевой вставки `drills` → `seedDrill`/`seedDrillDoc`.

**Отложено (заметка, не в объёме).** Read-path decoupling: перечитки результата через имена
индексов (`.withIndex('by_user')` ×6 в `userSettings.test.ts`, `by_user_and_layout` ×3 в
`drill.test.ts`) оставлены как есть — это отдельная забота (read-path), тащить в дом сева
(write-path) = scope creep. Отдельный кандидат при желании снять привязку к именам индексов.

---

## B. Дыры покрытия и достоверности (не углубление — по запросу «система тестирования»)

### 5. Аутентифицированная ветка обёрток Convex не тестируется никогда: `t.withIdentity` не используется во всём репозитории — MEDIUM · ✅ СДЕЛАНО

**Файлы:** grep `withIdentity` по репо — **0 вхождений**. У всех обёрток (`getMine`,
`upsertMine`, `record`, `listMine`, `drillNext`, `drillRecord`, `repertoireSnapshot`,
`progressionDetail`, `resetMyProfile`) тест гоняет **только гостевую ветку**
(`getAuthUserId → null`). Связка «обёртка под реальной identity → делегирование в handler»
не проверяется ни разу — handler'ы тестируются лишь прямым вызовом с явным `userId`.
Нулевое/асимметричное покрытие: `drillRecord` auth-throw (`drill.ts:346`) не покрыт вовсе;
`progressionDetailHandler`+`progressionDetail` query (`drill.ts:402–432`) — 0 (при том что
CQRS-близнец `repertoireSnapshot` покрыт 4 тестами); `selectionIndex.rebuild`
(`:99–148`), `clearLayoutPage`, `drillsPage`, `ladderReport` — 0. Обёртки, не дёрнутые в
тестах вообще: `api.drill.repertoireSnapshot`, `progressionDetail`, `drillRecord`,
`resetMyProfile`, `api.users.viewer`, `api.selectionIndex.ladderReport`.

**Решение (направление).** Через seed-дом (кандидат 4) прокинуть `t.withIdentity` и покрыть
authenticated-путь обёрток + нулевые зоны.

**Перед исполнением (grilling).** Что реально проверяем в authenticated-ветке (что обёртка
резолвит id и делегирует — vs дублировать проверки handler'а); порядок — сперва seed-дом
(4), потом это.

**Сделано (2026-07-03).** Форма identity — из исходника `@convex-dev/auth`:
`getAuthUserId` = `identity.subject.split('|')[0]` (делитель `TOKEN_SUB_CLAIM_DIVIDER`);
`asUser({ t, userId })` подаёт subject `` `${userId}|test-session` `` (реальная convex-auth-
кодировка `userId|sessionId`) через `t.withIdentity`. +20 тестов authenticated-ветки
(convex 61→81): `drillNext` `openedSteps>1` **через query** (профиль читается только под
identity — закрыл дыру, помеченную ещё швом `selectDrillsHandler` `drill.test.ts:161`) +
guest-контраст (cold-start 1); `drillRecord` (auth-запись + guest-throw — раньше не покрыт);
`repertoireSnapshot` auth; `progressionDetailHandler` (4 ветки: guest/unknown/cold-start/
готовый символ — было 0) + `progressionDetail` query (auth+guest); `resetMyProfile`
(auth+guest); `getMine`/`upsertMine`/`record`/`listMine` authenticated (были только guest);
`users.viewer` (auth+guest, новый `users.test.ts`). Проверка настоящая: тесты assert'ят
конкретные значения (`openedSteps 2`, `theme 'nord'`, `viewer._id === userId`) — прошли бы
только при реальной инъекции identity.

**Отложено (заметка, не в объёме — не auth-тема).** Не-auth дыры `selectionIndex`:
`rebuild` (internalAction, весь конвейер), `clearLayoutPage`, `drillsPage`, `ladderReport`
(публичная query, не gated) — 0 покрытия, но это тема aggregate-sync/rebuild, не
«authenticated-ветка обёрток». Отдельный кандидат.

---

### 6. Таймерный путь машины (`TICK`/`isExpired`/`ticker`) не гоняется — истечение подделывается ручным `TIMER_EXPIRED`; fake timers не используются нигде — MEDIUM · ✅ СДЕЛАНО

**Файлы:** реальный `setInterval`-ticker (`session.machine.ts:84`) и guard
`isExpired`/`TICK` (`:184–190,288–291`) — в тестах не покрыты; во всех кейсах истечение
синтезируется `actor.send({type:'TIMER_EXPIRED'})` (`session.machine.test.ts:145,174,278,328,359`).
`useFakeTimers`/`advanceTimersByTime`/`setSystemTime` — 0 вхождений в репо. Смежно:
инварианты порядка (`finalizeAndNotify`, CQRS write-before-read, `session.machine.ts:149–162`)
заперты **поведенчески** (это хорошо, `session.machine.test.ts:317–367`), но держатся на
подгонке длины потока под магическую `REFILL_THRESHOLD_SYMBOLS` (`longStreamSession` берёт
`+20`, бьёт 6 нажатий) — смена константы рассинхронит «6 нажатий < порог < длина» и лок
посыплется молча.

**Решение (направление).** Fake timers, чтобы реальный time-driven путь (ticker→TICK→
isExpired→done) стал тестовой поверхностью, а не обходился ручным событием. Заодно —
развязать локи порядка от магической константы.

**Перед исполнением (grilling).** Уживётся ли `vi.useFakeTimers` с `fromPromise`-актором
(`fetchDrills`) и `vi.waitFor` (промисы vs фейковые таймеры — типичная ловушка); стоит ли
покрывать реальный `TICK` или достаточно `isExpired`-юнита (тот уже покрыт как чистая fn в
`session-timer.ts` — прошлый аудит, кандидат 6); только фиделити или ещё развязка от
`REFILL_THRESHOLD_SYMBOLS`. Пара к кандидату 3.

**Сделано (2026-07-03).** Ветка `refactor/machine-test-harness` (общая с кандидатом 3).
**Добавлены 2 точечных fake-timer теста** реального пути `ticker (setInterval) → TICK →
isExpired → done` (`session.machine.test.ts`, блок «реальный путь истечения»): (1) истечение
через ход часов → `done` **без** ручного `TIMER_EXPIRED`; (2) `TICK` до истечения обновляет
`displayElapsedMs` (ветка `refreshDisplay`). Прежде **обе** ветки `TICK` не гонялись —
ручной `TIMER_EXPIRED` перепрыгивал тикер целиком. **Ловушка fake-timers × `fromPromise`
обойдена** (подтверждено с первого прогона): `vi.useFakeTimers()` → `advanceTimersByTimeAsync(0)`
сплющивает микротаск `fetchDrills` до `armed` → `KEY_PRESS` (старт тикера) →
`advanceTimersByTimeAsync(> окна)` → `done`; `vi.waitFor` в этих тестах **не** используется
(детерминированный адванс вместо polling'а — конфликт с фейковыми таймерами исключён).
5 существующих `TIMER_EXPIRED`-тестов **оставлены** (быстрые, документируют контракт «истёк →
сразу done») — №6 их дополняет, не заменяет. **Развязка от `REFILL_THRESHOLD_SYMBOLS`:**
добавлен страж-инвариант `expect(6).toBeLessThan(REFILL_THRESHOLD_SYMBOLS)` — при падении
константы ≤ 6 `longStreamSession` молча начал бы дозагружать на 6 нажатиях и оба done-теста
потеряли бы «чекпоинт ровно один»; страж падает громко. Более крупную развязку не тащили
(scope). **Заодно (grill-with-docs) снят док-дрейф удалённой фазы `draining`:** CONTEXT.md
(`Session` без `draining`; термин `Draining` помечен похороненным со ссылкой на ADR 0007) и
CLAUDE.md (подсостояния `active` + описание истечения). Число тестов: **504 → 507** (+1 страж,
+2 таймерных). Проверено: `make check-dev` зелёный; `npx convex dev --once` не требовался —
тронуты только тест-слой + доки.

---

### 7. Runes-оркестрация в `+layout.svelte` (7 `$effect`) не вынесена и непокрыта — MEDIUM · 🔲 НЕ НАЧАТО

**Файлы:** `+layout.svelte:35` (auth re-wire при ротации токена), `:63` (триггер
cloud-sync), `:87–92` (**edge-triggered** `markSessionStart` — флаг `wasTraining`),
`:112–116` (обратный отсчёт `timerSeconds` — арифметика в `$derived`). Смежная непокрытая
оркестрация: `RhythmChannel.svelte:65–96` (`registerBeat`: порядок fall→accept→updateTempo→
jump + ветка reduced-motion — **не в** чистой модели `rhythm-channel.ts`, которая как раз
здорова и покрыта); `TrainingScene.svelte:44` (idle-blink таймер); `auth-store.svelte.ts:14–26`,
`repertoire-store.svelte.ts:48–53` (`markSessionStart`/`grew`), `sessions-store.svelte.ts`
(подписка/gating) — чистые части вынесены и покрыты, обвязка руны — нет.

**Проблема.** Прошлые аудиты уже применяли рецепт «чистый инвариант → тонкая руна»
(`runAuthGate`, `computeAuthState`, `coordinateSync`). Здесь есть кристаллизуемые куски
(формула обратного отсчёта; edge-детект «вход в training»; порядок registerBeat +
reduced-motion), запертые в компонентах и потому невидимые node-тестам.

**Решение (направление).** Вынести пригодные-к-кристаллизации инварианты за чистые швы
(как прежде), руны оставить тонкими. Не всё вынашиваемо (DOM-побочки, rAF) — только логика.

**Перед исполнением (grilling).** Что реально кристаллизуемо (формула таймера и edge-детект
— да; auth-rewire и DOM-побочки — вряд ли); стоит ли трогать `registerBeat` (модель здорова,
но оркестрация в компоненте) или это отдельный кандидат; не раздуваем ли scope (это чистка
множества мелких мест, а не один шов).

---

### 8. Storybook — ручная витрина: 12 компонентов получают ноль авто-проверок — MEDIUM · ⚠️ РАЗВИЛКА ПОЗИЦИИ · 🔲 НЕ НАЧАТО

**Файлы:** нет `@storybook/test`/`test-runner` в `package.json`; в `Makefile` нет
`test-storybook`; ноль play-функций во всех `*.stories.svelte`; `make check-all` Storybook
не гоняет. Story-only компоненты без единого логического теста: `SignInScreen`, `UserMenu`,
`FlowLine`, `Finger`, `HandsScene`, `KeyboardScene`, `KeyCap`, `NavArrow`, `RhythmChannel`,
`LessonStatsDisplay`, `Avatar`, `Wordmark`.

**⚠️ Конфликтует с CLAUDE.md** («компоненты — Storybook stories») — осознанная позиция, не
упущение. Выношу не чтобы отменить, а потому что «витрина» сегодня не даёт **никакой**
автоматической проверки (даже a11y-аддон работает лишь в интерактивном UI). Развилка:
**(а)** принять как есть → зафиксировать ADR, чтобы будущие аудиты не пере-предлагали;
**(б)** добавить play-функции + `@storybook/test` либо portable-stories в vitest browser mode.

**Перед исполнением (grilling).** Готов ли пользователь пустить jsdom/browser-mode в CI
(сейчас принципиально нет); что именно проверять play-функцией (рендер без throw vs
поведение); стоит ли это цены — либо сразу ADR «принимаем витрину без авто-проверок».

---

## C. Мелочи и гигиена (не отдельные сессии)

- **`hands-scene.test.ts:27–188` — 15 почти идентичных `it()`-блоков** (один и тот же
  4-арг вызов `createHandsSceneViewModel(...)` + `toEqual`), развёрнутый вручную табличный
  тест; 15 фикстур импортируются по одной (`:4–18`). Кандидат на `it.each` + баррель. LOW,
  механический. (14 фикстур — замороженные снапшот-литералы без генератора: правка формы
  `HandsSceneViewModel` = переписать 14 литералов; осознанный golden-master — отмечаю, не
  настаиваю.)
- **Coverage-конфиг** (`vitest.config.ts:40–45`): exclude чистый (ничего важного не
  спрятано), но include `src/**/*.{ts,svelte}` тянет в знаменатель неисполнимые в node
  компоненты и **данные** (21 `*.contract.ts`, `Root.contract.ts`, `finger-paths.ts`) → %
  занижен структурно; `src/lib/dev/**` (dev-инструменты `typing-capture*.ts`,
  `profile-reset.ts`, 0 тестов) **не исключён**, в отличие от `scripts/**`; coverage не
  форсится ни в одном гейте (`check-all` без него; `reporter: ['text']` только).
- **Форма `SymbolLayout` объявлена трижды** — `shared/symbol-layout.ts` (interface),
  `src/interfaces/types.ts:221` (type), `src/lib/layouts.ts:57` (zod `SymbolEntrySchema`).
  Граница `shared`↔`src` развязана намеренно (src не импортирует shared — комментарии в
  сторах декларируют это), но расхождение формы компилятор не поймает. Кандидат в ADR
  («принимаем дрейф ради развязки») либо в единого владельца.
- **Чистые `.ts`-модули с логикой без теста** (тестируемы в node прямо сейчас):
  `src/lib/drill-utils.ts` (138 стр., 11 чистых fn анализа текста), `src/machines/selectors.ts`,
  `src/lib/layout-utils.ts` (`createKeyCoordinateMap`), `src/lib/state-utils.ts` (`inState`),
  `src/themes/registry.ts` (`resolveTheme` — ветка `'auto'`/matchMedia),
  `src/interfaces/types.ts:290–304` (рантайм-zod `.refine`/`.superRefine` «не больше одной
  дефолтной раскладки на язык» — не тестируется напрямую).
- **Doc drift:** CLAUDE.md тест-раздел знает 2 проекта из 4 (нет `auto-flow`/`shared`);
  термин «Draining» в CLAUDE.md/CONTEXT.md уже помечен устаревшим в прошлом аудите
  (ADR 0007 убрал фазу).

---

## Приоритизация (locality + leverage)

| # | Кандидат | Приоритет | Тип |
|---|----------|-----------|-----|
| 1 | `drillNext` — ядро отбора за шов | HIGH | углубление (продакшн, чинит покрытие) |
| 2 | `StreamSymbol`-билдер-дом | HIGH | углубление (тест-инфра) |
| 3 | Харнесс XState-машин | HIGH | углубление (тест-инфра) |
| 4 | Convex-сев — дом фикстур | MEDIUM-HIGH | углубление (тест-инфра) |
| 5 | Authenticated-ветка обёрток (`withIdentity`) | MEDIUM | покрытие |
| 6 | Fake timers / реальный timer-путь | MEDIUM | достоверность |
| 7 | Runes-оркестрация `+layout.svelte` | MEDIUM | углубление (продакшн) |
| 8 | Storybook авто-проверки | MEDIUM | развилка позиции (ADR?) |

**Естественные пары для одной сессии:** 3+6 («машинный харнесс + fake timers» — одна зона),
4+5 («convex-харнесс: сев + identity» — тот же харнесс). 1 самостоятелен и, возможно, самый
ценный (единственная реальная shallow→deep в продакшне + чинит корень дыр покрытия).
