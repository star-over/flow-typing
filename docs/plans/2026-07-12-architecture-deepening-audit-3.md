# Аудит архитектуры (третий проход): углубление модулей

> Статус: **список кандидатов**, не execution-план. Ни один ещё не спроектирован —
> каждый требует отдельной сессии проектирования (grilling: что за швом, какой
> инвариант закрепляем, какие тесты выживают). Найдено инструментом
> `improve-codebase-architecture` 2026-07-12, повод — ревизия проекта на принцип
> **deep module** с прицелом на восприятие кода ИИ-агентами.
>
> Словарь: **глубокий** модуль = много поведения за малым интерфейсом;
> **мелкий/shallow** = интерфейс почти как реализация; **deletion-тест** = удали
> модуль, сложность исчезла → pass-through, всплыла у N вызывающих → зарабатывал
> хлеб; **locality** = баги/знание в одном месте; **leverage** = что дают
> вызывающим; **шов** = место подмены поведения без правки на месте; **концепт-имя**
> = имя модуля по домену (Finger, KeyCap, TypingStream), а не по механизму (`-utils`).
>
> Все находки проверены на реальном коде (line-номера сверены 2026-07-12). Флаги
> конфликтов с ADR/контрактами — внутри кандидатов.
>
> **Связь с прошлыми проходами.** Проход 1 (`2026-06-28-architecture-deepening-audit.md`,
> кандидаты 1–7 сделаны) и проход 2 (`2026-06-29-architecture-deepening-audit-2.md`,
> этапы 1–2 сделаны) закрыли: конвейер ViewModel запечатан инвариантом «Полного
> Кластера» (проход 1 №3), actor-tree-шов вынесен в `selectors.ts` (проход 1 №5),
> зомби `difficulty-calculator` удалён (проход 1 №2), сторы чтения cloud-данных сведены
> за `auth-gated-query` (проход 2 №1), клиентский корпус удалён + тотальный сервер
> (проход 2 №2 / ADR 0011). Этот проход — по зонам, которые прошлые НЕ закрыли:
> плоская свалка `src/lib/` (имена по механизму, мёртвые файлы), протечка контракта
> ViewModel в сторону `MovementPath`, сторона **чтения контекста** машин (actor-tree
> уже запечатан, контекст — нет).

## Здоровье в целом (калибровка)

Проект в основном **уже глубокий** — это фиксируется, чтобы не «чинить» здоровое:
конвейер `HandsSceneViewModel` (6 скрытых стадий + инвариант за 5-параметрической
фабрикой), XState-машины (DI-шов `session-impl.ts` — прод-Convex + in-memory тест,
весь I/O изолирован в 89 строках), `shared/repertoire/` (чистое ядро
Readiness/Ladder/рост, однонаправленный поток, без дублирования с клиентом). Трение
**не системное, а сосредоточенное** — почти всё в `src/lib/` + две протечки чтения.

## Приоритетная очередь

### 1. Уборка мёртвого и продублированного — HIGH (navigability) · LOW (риск) · ✅ СДЕЛАНО

Не «shallow→deep», а уборка модулей, которые **лгут об интерфейсе домена** для
будущего читателя (в т.ч. ИИ): зелёные тесты создают ложную locality — агент видит
покрытый модуль и считает его несущей инфраструктурой. Две части, одна зона (мёртвые
`-utils`).

#### 1A. `drill-utils.ts` — зомби, вытесненный auto-flow · ✅ СДЕЛАНО

**Файлы:** `src/lib/drill-utils.ts` (138, 11 функций) + `drill-utils.test.ts` (122).

**Проблема.** Ноль продакшн-импортёров (grep по `src/convex/shared` пуст, кроме
собственного теста). Логика вытеснена в `auto-flow/scripts/meta.ts` — его шапка прямо
гласит «Спасено из старого `drill-utils` без триграмм, SHA-1-id…» (там же Unicode
`\p{L}` вместо закодированного выражения `[a-zа-яё]`). Deletion-тест: сложность **исчезает
целиком**. 260 строк «покрытого» трупа.

**Решение.** Удалить модуль и его тест.

**Выгода.** Минус мёртвый код, который читается как живой справочник статистики drill'а.

**Сделано (2026-07-12).** Удалены `src/lib/drill-utils.ts` (11 функций) + `drill-utils.test.ts`
(122). Re-grep перед удалением подтвердил ноль продакшн-импортёров (единственный импорт
`./drill-utils` — из собственного теста). Хвостов не осталось: упоминание в
`auto-flow/scripts/meta.ts:3` — прозаический комментарий о происхождении («Спасено из старого
drill-utils»), не импорт, корректен исторически, не трогали. Верификация: vitest зелёный
(тесты `drill-utils` исчезли), svelte-check / build / spell / `convex dev --once` — чисто.
Ветка deep-module-аудита.

**Статус:** ✅ СДЕЛАНО.

#### 1B. Предикат «совместимость раскладки и языка drill'а» — мёртвый дом + инлайн-дубль дважды · ✅ СДЕЛАНО

**Файлы:** `src/lib/text-language-utils.ts:11` (`isDrillCompatibleWithSymbolLayout`,
0 продакшн-импортёров) · инлайн-копии: `src/lib/layouts.ts:190`,
`src/interfaces/types.ts:292`.

**Проблема.** Модуль мёртв (импортирует только его тест), а **тот же** BCP-47-предикат
«равен-или-предок» скопирован встроено в двух живых местах:
`d.textLanguage === lang || d.textLanguage.startsWith(lang + '-')`. Shallow-модуль
изолировал реальный концепт, но вызывающие переизобрели его руками — правка правила
языкового сопоставления молча разъедется между тремя точками.

**Решение (развилка для grilling).** Либо (A) удалить `text-language-utils`, если
инлайн у `layouts.ts`/`types.ts` признаём каноном; либо (B) сделать
`text-language-utils` **единственным домом** предиката и подключить оба call-site.
Концепт реален (Symbol Space × язык текста), (B) даёт locality — но у него всего 2
потребителя, так что решать в grilling по deletion-тесту.

**Выгода.** Одно правило языковой совместимости — один дом (или явное удаление, если
концепт не стоит модуля).

**Сделано (2026-07-12).** Выбрана ветка **(A) удалить**. Grilling по deletion-тесту:
модуль зарабатывает ноль (0 продакшн-импортёров, только собственный тест), а предикат
— BCP-47 «равен-или-предок», арифметика над **фиксированным стандартом**: рост реестра
раскладок/языков добавляет *строки данных*, не *ветви предиката*, → не растёт → (A) по
решающему правилу. Против (B): два call-site делят двухстрочный *механизм*, но не один
*концепт* — `layouts.ts:190` это настоящая совместимость «текст ↔ раскладка» (доменное
имя подходит), а `types.ts:292` — Zod-`.refine` самосогласованности схемы
(`isDefaultForTextLanguages` = свой язык или предок, drill'а там нет); единый дом
потребовал бы родового имени `isEqualOrAncestorLanguage`, т.е. *добавления*
механизм-`-utils` (ровно запах, который убирает кандидат 2), плюс ребро импорта
`types.ts → text-language-utils → types.ts` (type-only, но фундамент `interfaces/types`
не должен зависеть от `lib/`). Удалены `src/lib/text-language-utils.ts` (11 строк,
1 функция) + `text-language-utils.test.ts` (6 кейсов). Оба инлайн-дубля оставлены
каноном (`layouts.ts:190`, `types.ts:292`) — каждый локален и читаем, у `types.ts` ещё
и пояснительный `message`. Остаточный дрейф двух инлайн-копий признан приемлемым:
правило стабильно, а будущий дом BCP-47-арифметики (в `layouts.ts:178` уже есть
parent-walk) — примитив рядом с `TextLanguage`, не воскрешение drill-`-utils`
(территория кандидата 2). Верификация — чисто (vitest/svelte-check/build/spell). Ветка
deep-module-аудита.

**Статус:** ✅ СДЕЛАНО.

---

### 2. `-utils`-мусор-баги → концепт-модули — MEDIUM–HIGH · ✅ СДЕЛАНО (2A · 2B · 2C · 2D)

Ядро прохода. Имена по **механизму** (`-utils`), не по концепту; ИИ-агенту `-utils`
не подсказывает, где живёт логика, — приходится открывать файл. Концепты уже названы
в `CONTEXT.md` (Finger, KeyCap, StreamSymbol) — консолидация **совпадает с
глоссарием**, а не идёт против него.

**Файлы и диагноз (caller-breadth сверен):**
- `src/lib/symbol-utils.ts` (186, **11 импортёров**) — **глубокий, но назван неправильно**:
  это сопоставитель **KeyCap ↔ Symbol ↔ Finger** (`getLabel`, `getKeyCapIdsForChar`,
  `areKeyCapIdArraysEqual`, `createKeyLabelMap`…). Внутри осиротел `getFingerByKeyCap`
  — относится к концепту **Finger**. (Cohesion этого файла уже отмечена открытой в
  проходе 1 «Также замечено» — здесь она становится actionable.)
- `src/lib/stream-utils.ts` (115, 4 импортёра) — де-факто модуль **TypingStream**
  (`addAttempt`, `getSymbolType`, `enrichStreamSymbols`).
- `src/lib/press-result-utils.ts` (25, **1 импортёр** — `TrainingScene.svelte`) —
  `getPressResult` **дублирует** `stream-utils.getSymbolType` (обе «сравни последний
  attempt с `targetKeyCaps`» через `areKeyCapIdArraysEqual`). Кандидат на вливание в
  **TypingStream**.
- `src/lib/hand-utils.ts` (54, 3 импортёра) — концепт **Finger**
  (`isLeftHandFinger`, `getFingerKeys`, `getHomeKeyForFinger`); тонкие `filter/find`,
  но зарабатывают дедупликацией.
- `src/lib/positioning-utils.ts` (26, **1 импортёр** — `HandsScene.svelte`) —
  `calculateClusterTranslation`, DOM-`getBoundingClientRect`-арифметика, извлечена
  только ради юнит-теста. Кандидат на inline в hands-scene view-helper.

**Решение (направление, не интерфейс).** Свести к концепт-модулям **Finger**,
**KeyCap/SymbolLayout** (=переименованный `symbol-utils` + владеет сопоставителем),
**TypingStream** (=`stream-utils` + `getPressResult`); используемые в одном месте pass-through
(`positioning-utils`) — встроить в единственного потребителя. `getFingerByKeyCap`
переезжает из KeyCap/SymbolLayout в Finger.

**Выгода.** «Понять один концепт» перестаёт требовать прыжков между 4 файлами;
интерфейс сужается; имена = доменные слова из `CONTEXT.md` → агент находит логику по
термину, а не перебором `*-utils`.

#### Про структуру папок (ответ на вопрос владельца: «ограничивать модуль каталогом со своим интерфейсом?»)

Через линзу deep module: глубину даёт **узкий интерфейс**, а не наличие каталога.
Barrel-файл (`index.ts`), который ре-экспортирует всё, что и так торчит из плоского
файла, добавляет уровень косвенности **без сужения интерфейса** — церемония, не
глубина. Навесить `index.ts` на нынешние `-utils` = тот же мусор-баг с прихожей.

Правильный порядок обратный: **сперва консолидировать по концепту** (этот кандидат),
и «каталог с одним публичным входом» получится сам. Прецеденты в репо уже есть —
папки компонентов и `shared/repertoire/` (тест+тип+логика по концепту). Barrel
оправдан **только** когда за ним ≥2 файла и он **сужает** поверхность (отдаёт 2
функции из 6 внутренних), а не как обязательная конвенция «каждой папке — index».

**Вывод:** концепт-папки — да; сплошные barrel'ы над текущей свалкой — нет. Плоскость
`src/lib/` (34 файла) — вторичный симптом; рассосётся при консолидации. Заодно
устранить непоследовательность: сейчас стор-файлы получают папку (`auth/`, `dev/`,
`repertoire/`, `sessions/`), чистые функции лежат плашмя — выбрать один принцип
(по концепту) и применить ровно.

**Перед исполнением (grilling).** Сузить до одного концепта на первый прогон
(Finger — самый локальный: `hand-utils` + `getFingerByKeyCap`); границы KeyCap vs
SymbolLayout (один модуль или два); куда селится `nbsp`/`sp` (строковые константы в
KeyCap-сопоставителе — cohesion-хвост); переносим ли `positioning-utils` в
`components/hands-scene/` или в hands-scene lib. НЕ трогать `layout-utils.ts` —
проход 1 объявил его здоровым (см. «Проверено и счёл здоровым»).

#### Разбивка на подпроходы (кристаллизация 2026-07-12)

Кандидат исполняется **по одному концепту за прогон** (согласовано с владельцем):
каждый диск закрытый, поведение-сохраняющий, принимается по 1B-образцу (re-grep +
`make check-dev`). Порядок — от самого локального:

- **2A. Finger** — ✅ СДЕЛАНО (см. ниже).
- **2B. KeyCap** — ✅ СДЕЛАНО (fork 1 → один модуль; fork 2 → `nbsp`/`sp` в `stream-utils`).
- **2C. TypingStream** — ✅ СДЕЛАНО (один дом `typing-stream.ts`; `getPressResult`
  отдельной функцией).
- **2D. positioning** — ✅ СДЕЛАНО (fork 3 → co-locate `cluster-translation.ts` в папку
  `hands-scene`, тест сохранён).

#### 2A. Finger — концепт-дом для finger↔keyCap логики · ✅ СДЕЛАНО

**Шов (кристаллизован — готовый интерфейс для агента).** Новый плоский файл
`src/lib/finger.ts` (концепт-имя, не `-utils`; каталог не оправдан — один логический
файл, barrel = церемония; папка появится сама, если Finger обрастёт вторым файлом).

**Собирает 4 функции finger↔keyCap над `FingerLayout`:**
- из `hand-utils.ts`: `isLeftHandFinger`, `getFingerKeys`, `getHomeKeyForFinger`;
- из `symbol-utils.ts`: осиротевший `getFingerByKeyCap` (KeyCap→Finger — инверсия
  `getFingerKeys`, домен Finger, был misfiled).

`hand-utils.ts` удаляется целиком (все три функции — Finger). В `symbol-utils.ts`
`getFingerByKeyCap` удаляется, а с ним — `FingerId`/`FingerLayout` из type-import (после
ухода используются только им). Остаток `symbol-utils` не трогаем — его судьба в 2B.

**Caller-breadth (сверен grep 2026-07-12):** все 4 функции сходятся в `hands-scene.ts`
(hub); `getHomeKeyForFinger` дополнительно — `HandsScene.svelte:21`, `keyboard-scene.ts:25`;
`getFingerByKeyCap` в проде — только `hands-scene.ts` (160/186/366). Импортёры
переключаются на `@/lib/finger`.

**Тесты.** `hand-utils.test.ts` → `finger.test.ts` (путь импорта `./hand-utils`→`./finger`);
describe `getFingerByKeyCap` переезжает из `symbol-utils.test.ts` в `finger.test.ts`.
Поведение-сохраняющий: тесты **переезжают, не добавляются**; `isLeftHandFinger`/
`getHomeKeyForFinger` как были без юнит-тестов, так и остаются — добор покрытия вне scope.

**НЕ трогать `layout-utils.ts`** — проход 1 объявил его здоровым.

**Сделано (2026-07-12).** Создан `src/lib/finger.ts` — концепт-дом Finger (плоский файл,
без каталога/barrel). Дословно перенесены 4 функции finger↔keyCap над `FingerLayout`:
`isLeftHandFinger`, `getFingerKeys`, `getHomeKeyForFinger` (из `hand-utils.ts`) +
осиротевший `getFingerByKeyCap` (из `symbol-utils.ts`, KeyCap→Finger — инверсия
`getFingerKeys`). `hand-utils.ts` удалён целиком; в `symbol-utils.ts` удалена
`getFingerByKeyCap` вместе с осиротевшими после её ухода type-импортами `FingerId`/
`FingerLayout` (grep подтвердил — использовались только ею). Импортёры переключены на
`@/lib/finger`: `hands-scene.ts` (все 4 функции одним импортом; из `symbol-utils` остались
`areKeyCapIdArraysEqual, keyCapHasSymbol`), `HandsScene.svelte:21`, `keyboard-scene.ts:25`.
Тесты: `hand-utils.test.ts` → `finger.test.ts` (git mv, история сохранена), describe
`getFingerByKeyCap` перенесён из `symbol-utils.test.ts` в `finger.test.ts` дословно —
тесты только переехали, новых не добавлено. **Приёмка фактической проверкой:** re-grep —
ноль хвостов `hand-utils`, `getFingerByKeyCap` ушёл из `symbol-utils` полностью, finger-типы
там же; `make check-dev` зелёный (eslint --quiet чисто, svelte-check 819 файлов / 0 ошибок,
vitest 60 файлов / 642 теста — число не изменилось: 2 кейса переехали нетто-ноль). Ветка
deep-module-аудита.

**Статус:** ✅ СДЕЛАНО.

#### 2B. KeyCap — концепт-дом для операций над клавишами · ✅ СДЕЛАНО

**Развилка решена (владелец, 2026-07-12).** Fork 1 → **один модуль** (не два): весь
остаток `symbol-utils` после ухода Finger ключён на `KeyCapId` (аргумент/возврат), каллеры
со-локализуют функции разных слоёв (`hands-scene` тянет `keyCapHasSymbol` + `areKeyCapIdArraysEqual`
из одного дома; `keyboard.machine` — `isModifierKey` + `isTextKey`), а выделение
`symbol-layout.ts` оставило бы shallow-модуль из трёх тонких предикатов — ровно запах, что
кандидат 2 убирает. Fork 2 → `nbsp`/`sp` уходят в единственного потребителя `stream-utils.ts`.

**Шов (кристаллизован — готовый интерфейс для агента).**
- `git mv src/lib/symbol-utils.ts → src/lib/key-cap.ts` (концепт-имя; коллизии нет,
  `key-cap-id.ts` — это тип-id в `interfaces/`, здесь — поведение над KeyCap). Добавить
  `@file`/`@description` header в стиле проекта: поведение над клавишами через слои раскладок
  (надпись/символ клавиши, физический тип, равенство аккордов).
- Остаётся 7 функций: `getLabel`, `createKeyLabelMap`, `getKeyCapIdsForChar`, `keyCapHasSymbol`,
  `isModifierKey`, `isTextKey`, `areKeyCapIdArraysEqual`.
- **`nbsp`/`sp` вынести из `key-cap.ts` в `src/lib/stream-utils.ts`** (их единственный
  потребитель — `getSymbolChar`: пробел→неразрывный для HTML-рендера потока; это константы
  TypingStream, территория 2C). Экспортировать из `stream-utils.ts` (их тянет `stream-utils.test.ts`).

**Импортёры (сверено grep 2026-07-12) — переключить `@/lib/symbol-utils`/`./symbol-utils`
→ `key-cap`:** `HandsScene.svelte:20`, `KeyboardScene.stories.svelte:6`, `FlowLine.stories.svelte:9`,
`keyboard.machine.ts:4`, `training.machine.ts:12`, `press-result-utils.ts:2`, `hands-scene.ts:74`,
`typing-stream.ts:2`, `exposure-reading.ts:23`, `keyboard-scene.ts:26`. Спец-случаи:
`stream-utils.ts:8` — `areKeyCapIdArraysEqual` из `./key-cap`, а `nbsp`/`sp` теперь локальные
(без импорта); `stream-utils.test.ts:9` — `nbsp` из `./stream-utils`.

**Тесты.** `symbol-utils.test.ts` → `key-cap.test.ts` (git mv; путь импорта `./symbol-utils`
→ `./key-cap`; содержимое не менять — `getFingerByKeyCap` уже ушёл в 2A). Новых кейсов нет.

**НЕ трогать `layout-utils.ts`**; тела 7 функций и `getSymbolChar` не менять — только переезд
и переключение импортов.

**Сделано (2026-07-12).** `git mv symbol-utils.ts → key-cap.ts` (+ `.test.ts`), добавлен
концепт-header. 7 функций остались телами байт-в-байт (проверено: escape `\u202F` в `getLabel`
сохранён). `nbsp`/`sp` перенесены в `stream-utils.ts` (единственный потребитель `getSymbolChar`),
escape-литералы `\u00A0`/`\u0020` точны; `stream-utils.ts` тянет `areKeyCapIdArraysEqual`
из `./key-cap`, nbsp/sp локальны. Переключены 10 прод-импортёров + `stream-utils.test.ts`
(nbsp из `./stream-utils`) + `key-cap.test.ts` (`./key-cap`). **Приёмка фактической проверкой:**
`grep symbol-utils` по src/convex/shared/auto-flow — **пусто**; unicode-константы сверены
байт-level (риск был флагнут агентом — Edit не матчил escape, правка через python — значения
точные); `make check-dev` зелёный (eslint чисто, svelte-check 0/0, vitest 60 файлов / 642 теста —
не изменилось). Ветка deep-module-аудита.

**Статус:** ✅ СДЕЛАНО.

#### 2C. TypingStream — единый дом концепта потока · ✅ СДЕЛАНО

**Развилки решены (владелец, 2026-07-12).** Fork A → **один дом**: `typing-stream.ts` уже
существует под доменным именем (конструктор `createTypingStream`), а `stream-utils.ts` — его
поведение под механизм-именем; один концепт TypingStream (глоссарий) → один файл. Fork B →
`getPressResult` вливается **отдельной функцией** (общий с `getSymbolType` предикат «последний
attempt == target», но разные типы-выходы: `FlowLineSymbolType` 5-значный для FlowLine vs
`KeyCapPressResult` 3-значный для TrainingScene — форс-слияние тел не оправдано).

**Шов (кристаллизован).** В `typing-stream.ts` влить содержимое `stream-utils.ts` (`addAttempt`,
`getSymbolType`, `getSymbolChar`, `enrichStreamSymbols`, `EnrichedStreamSymbol`, `nbsp`, `sp`)
+ `getPressResult` из `press-result-utils.ts`. Экспорты не коллизируют (сверено). Тела не менять,
импорты консолидировать (оба тянут `@/interfaces/types`; `areKeyCapIdArraysEqual`/`getKeyCapIdsForChar`
из `@/lib/key-cap`). Обновить `@file` header под полный концепт (build + поведение + press-result).
Удалить `stream-utils.ts` и `press-result-utils.ts`.

**Импортёры (сверено grep 2026-07-12) — переключить на `@/lib/typing-stream`:**
`FlowLine.stories.svelte` (`addAttempt, enrichStreamSymbols` — слить с уже существующим там
импортом `createTypingStream`), `FlowLine.svelte` (тип `EnrichedStreamSymbol`),
`TrainingScene.svelte` (`enrichStreamSymbols` + `getPressResult` — слить), `training.machine.ts`
(`addAttempt`). `drill-stream.ts` уже на `@/lib/typing-stream` — без изменений.

**Тесты.** Три файла → один `typing-stream.test.ts`: влить `stream-utils.test.ts` (пути
`./stream-utils` → `./typing-stream`) и `press-result-utils.test.ts` (`./press-result-utils`
→ `./typing-stream`) в существующий `typing-stream.test.ts`; удалить оба. Все кейсы переезжают,
новых нет. **Ожидаемая дельта приёмки:** vitest файлов 60 → **58** (2 тест-файла слиты),
тестов **642 без изменений**.

**НЕ трогать `layout-utils.ts`**; тела функций и `getSymbolChar`/`createTypingStream` не менять.

**Сделано (2026-07-12).** `stream-utils.ts` (7 единиц: `nbsp`/`sp`/`addAttempt`/`getSymbolType`/
`getSymbolChar`/`EnrichedStreamSymbol`/`enrichStreamSymbols`) и `press-result-utils.ts`
(`getPressResult`) влиты в `typing-stream.ts` (теперь 9 экспортов — единый дом TypingStream),
оба `-utils`-файла удалены. Тела байт-в-байт, импорты консолидированы, header переписан под
полный концепт. Переключены 4 прод-импортёра (`FlowLine.stories`, `FlowLine.svelte`,
`TrainingScene`, `training.machine`); `drill-stream.ts` уже был на `@/lib/typing-stream`.
Тесты: три файла слиты в один `typing-stream.test.ts` (кейсы дословно, новых нет),
`stream-utils.test.ts`/`press-result-utils.test.ts` удалены. **Приёмка фактической проверкой:**
`grep stream-utils|press-result-utils` по src/convex/shared/auto-flow — **пусто**; escape-константы
записаны текстом `\u00A0`/`\u0020` (не декодированы — скан «invisible chars: none» подтвердил,
риск подстановки не сработал); `make check-dev` зелёный (eslint чисто, svelte-check 815 файлов
0/0, vitest **58 файлов / 642 теста** — дельта ровно ожидаемая: 2 тест-файла слиты, число тестов
не изменилось). Ветка deep-module-аудита.

**Статус:** ✅ СДЕЛАНО.

#### 2D. positioning → co-located view-helper hands-scene · ✅ СДЕЛАНО

**Развилка решена (владелец, 2026-07-12).** Fork 3 → **co-locate именованным `.ts`, не inline
в `.svelte`**: именованный `cluster-translation.ts` находится по концепту (тезис кандидата 2:
находимость по имени > минимизация файлов), тест сохраняется (правило «где код — там тест»),
а inline в `$effect` спрятал бы логику в 200-строчном компоненте и убил бы юнит-тест. Функция
чистая (DOM-rect арифметика), потому co-location законна (прецедент — data-хелпер `finger-paths.ts`
в той же папке). *Побочно замечено (вне scope, не трогать):* члены `containerRect.left`
в теле алгебраически сокращаются — потенциальное упрощение до `fingerRect.left - keyRect.left`,
но это НЕ behavior-preserving, отдельным заходом при желании.

**Шов (кристаллизован).**
- `git mv src/lib/positioning-utils.ts → src/components/hands-scene/cluster-translation.ts`;
  обновить `@file` header под доменное имя; тело `calculateClusterTranslation` не менять.
- `git mv src/lib/positioning-utils.test.ts → src/components/hands-scene/cluster-translation.test.ts`;
  путь импорта `./positioning-utils` → `./cluster-translation`; кейсы не менять.
- `HandsScene.svelte:18` — `import { calculateClusterTranslation } from '@/lib/positioning-utils';`
  → относительный `from './cluster-translation';` (как соседний `./finger-paths`), поместить
  в группу относительных импортов.

**Импортёр — единственный** `HandsScene.svelte` (сверено grep). Тест остаётся в проекте `src`
(vitest `src/**/*.test.ts` покрывает и `src/components/`). **Дельта приёмки:** vitest 58 файлов /
642 теста **без изменений** (чистый переезд, без слияния).

**НЕ трогать** `layout-utils.ts`; тело функции не менять.

**Сделано (2026-07-12).** `git mv positioning-utils.ts → components/hands-scene/cluster-translation.ts`
(+ `.test.ts`), header переписан под доменное имя, тело `calculateClusterTranslation` байт-в-байт
(арифметика getBoundingClientRect не тронута). `HandsScene.svelte:18` → относительный
`./cluster-translation` (в группе `./`-импортов, как `./finger-paths`). **Приёмка фактической
проверкой:** `grep positioning-utils` по src/convex/shared/auto-flow — **пусто**; тело функции
сверено grep'ом (идентично); `make check-dev` зелёный (eslint чисто, svelte-check 815 файлов 0/0,
vitest **58 файлов / 642 теста** — без изменений, чистый переезд). Тест жив в проекте `src`.
Алгебраическое сокращение `containerRect.left` осознанно НЕ трогали (не behavior-preserving).
Ветка deep-module-аудита.

**Статус:** ✅ СДЕЛАНО.

---

### 3. Протечка контракта ViewModel: упорядоченный путь home→target не отдаётся — MEDIUM · ☐ не начато

**⚠️ Задевает зафиксированный контракт `docs/03-ui-viewmodel-contract.md`** (велено
следовать буквально). Не пере-litigating инвариант «Полного Кластера» (запечатан
проходом 1 №3) — здесь **другая грань**: контракт неполный для потребителя
`MovementPath`.

**Файлы:** `src/lib/hands-scene.ts` (стадия `applyNavigationPaths`) ·
`src/components/hands-scene/HandsScene.svelte:108-120` (`movementPathFor`).

**Проблема.** ViewModel кодирует путь только как **разбросанные** per-key роли/стрелки
(`navigationRole: 'PATH' | 'TARGET'`, `navigationArrow`), но не отдаёт упорядоченный
массив `KeyCapId[]`. `HandsScene.svelte` для рисования пути **пересобирает граф**
(`createKeyboardGraph`) и **заново гоняет `findOptimalPath`** — дублируя то, что
конвейер уже посчитал (`hands-scene.ts` вызывает ту же пару `getHomeKeyForFinger` +
`findOptimalPath`). Комментарий в компоненте это признаёт: «тот же `findOptimalPath`…
Контракт ViewModel не трогаем». UI перестаёт быть «глупым» — знает доменную геометрию.

**Решение.** Осознанно расширить контракт: отдавать упорядоченный
`navigationPath: KeyCapId[]` на TARGET-пальце (симметрично тому, как инвариант уже
сцеплен с `TARGET` типом). UI рисует путь по готовому массиву, граф в компоненте не
пересобирается.

**Выгода.** Минус повторное вычисление и повторная сборка графа в UI; логика пути
целиком в конвейере; бьёт в ядро «движение важнее подсветки».

**Перед исполнением (grilling).** Форма поля (`navigationPath` на
`TargetFingerSceneState` — расширение discriminated union); нужно ли `docs/03`-правку
и оформление аддитивным уточнением контракта (не переписывать тело); что с `keyboardGraph`,
который `TrainingScene.svelte` уже держит — переиспользовать, а не пересобирать в компоненте.

**Статус:** ☐ не начато.

---

### 4. У чтения контекста машин нет интерфейса — MEDIUM · ☐ не начато

Смежно кандидату 5 прохода 1 (actor-tree-шов `selectors.ts` — сделан), но **другая
сторона**: actor-tree запечатан, а **чтение контекста** — сырое.

**Файлы:** `src/routes/+layout.svelte:108,110,119` (чтение контекста **внука**) ·
`src/components/train/TrainingScene.svelte:68-70` · `src/components/app/MainContent.svelte:40` ·
сырой `.matches()`: `App.svelte:25,37`, `TrainingScene.svelte:44`.

**Проблема.** Компоненты читают поля контекста напрямую. Самое острое: `+layout.svelte`
подписывается на **актор-внука** (`sessionActor.getSnapshot().context.displayElapsedMs`,
`.durationSeconds`), минуя интерфейс `appMachine` — таймер тикает в session-акторе и в
снимок app не всплывает (задокументировано как намеренное, стр. 97). Это чтение на два
уровня вглубь вложенного актора. Плюс 3 места зовут сырой `.matches()` вместо `inState`
— шов сопоставления состояний неполон.

**Решение.** Дать читателям узкий слой селекторов над контекстом (например,
`selectSessionTimer(appSnapshot) → { displayElapsedMs, durationSeconds }`),
симметрично `selectSessionActor`; довести 3 сырых `.matches()` до `inState`.

**Выгода.** Компоненты перестают знать имена полей контекста и структуру вложенности
акторов; поле в контексте можно переименовать, не трогая UI; шов становится тестовой
поверхностью.

**Перед исполнением (grilling).** Где живёт селектор таймера (`selectors.ts` рядом с
`selectSessionActor`); отдаёт ли он снимок или реактивную обёртку; трогаем ли
`TrainingScene`-чтение `stream`/`currentIndex` (это и есть render-данные — возможно,
законно) или только таймер-протечку `+layout`.

**Статус:** ☐ не начато.

---

### 5. Параллельный обход `currentStepSymbols` в writer и reader — LOW · ☐ не начато

**Файлы:** `shared/repertoire/growth.ts:26-31` · `shared/repertoire/progress.ts:33-42`.

**Проблема.** Writer (`decideOpenedSteps`) и reader (`computeProgressionDetail`)
независимо повторяют обход «пройди `currentStepSymbols`, посчитай не-готовые». Обе
корректно делегируют **критерий** в `readiness.ts` (единый источник — хорошо),
дублируется только цикл обхода. `drill.ts:437` даже документирует, что
`progressionDetail` намеренно зеркалит входы writer'а.

**Решение.** Вынести обход в одну чистую fn поверх `readiness.ts`, потребляемую и
growth, и progress. Deletion-тест слабый (дублируется цикл, не критерий) → LOW.

**Выгода.** Скромная: один обход — один дом.

**Статус:** ☐ не начато.

---

## Проверено и счёл здоровым / отклонил

Чтобы будущие проходы не пере-предлагали:

- **`layout-utils.ts` — не трогать.** Проход 1 («Что НЕ трогать») объявил
  `createKeyCoordinateMap` чистым глубоким справочником. Explore этого прохода
  предлагал влить его в `layouts.ts` — **отклонено**, уважаем вердикт прохода 1.
- **`hands-scene.ts` конвейер сам по себе — глубокий, здоров.** Запечатан проходом 1
  №3. Кандидат 3 здесь трогает только грань «упорядоченный путь наружу», не сам
  конвейер.
- **actor-tree-шов (`selectors.ts`) — сделан** (проход 1 №5). Кандидат 4 — сторона
  контекста, не реестр детей.
- **DI-шов `session-impl.ts` — настоящий** (прод-Convex + in-memory тест), не трогать.
- **`shared/repertoire/` — чистое глубокое ядро**, split с клиентом чистый и без
  дублирования (сторы типизируются от вывода Convex-функций, не от shared-модели —
  намеренно, с комментарием «БЕЗ импорта из shared/»).
- **`state-utils.inState`** — технически назван неправильно (адаптер над `matches()` XState, не
  «утилиты состояния»), функционально в порядке; переименование по вкусу, низкий
  приоритет (уже отмечено проходом 1 «микро-обёртки»).
- **`areKeyCapIdArraysEqual` в 6+ местах — leverage, не трещина** (подтверждено
  проходом 2): единый чистый предикат «аккорд == цель» с одним домом.

## Вне scope (roadmap, не трещина)

Thermostat, Analyzer/Weakness Map, Fresh Window, soft-слой ранжирования — ещё не
построены (CONTEXT.md, ADR 0004/0009); их отсутствие — нереализованные этапы, не
архитектурная трещина.
