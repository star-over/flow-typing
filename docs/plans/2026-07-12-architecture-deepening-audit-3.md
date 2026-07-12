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

#### Разбивка на подэтапы (кристаллизация 2026-07-12)

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
`getFingerByKeyCap` в боевом коде — только `hands-scene.ts` (160/186/366). Импортёры
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
остаток `symbol-utils` после ухода Finger привязан к `KeyCapId` (аргумент/возврат), вызывающие
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
байт-level (риск был помечен агентом — Edit не совпадал с escape, правка через python — значения
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
+ `getPressResult` из `press-result-utils.ts`. Экспорты не конфликтуют (сверено). Тела не менять,
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
поиск по имени > минимизация файлов), тест сохраняется (правило «где код — там тест»),
а inline в `$effect` спрятал бы логику в 200-строчном компоненте и убил бы юнит-тест. Функция
чистая (DOM-rect арифметика), потому co-location законна (прецедент — data-помощник `finger-paths.ts`
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

### 3. Протечка контракта ViewModel: упорядоченный путь home→target не отдаётся — MEDIUM · ✅ СДЕЛАНО

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

#### Разведка + кристаллизация шва (2026-07-12)

**Развилка решена владельцем — ветка (A) required + seal-enforced.** Grilling: единственный
настоящий вопрос — сила инварианта нового поля. Выбран **(A)** — `navigationPath` **required**
на `TargetFingerSceneState` и проверяется в `sealHandsSceneViewModel` симметрично `keyCapStates`
(над (B) «required только в типе» и (C) «optional»): черновик изменяется, `as`-каст на seal
(`hands-scene.ts:129`) **обходит** тип, поэтому без рантайм-проверки стадия, забывшая проставить
путь, протащит `undefined` до `MovementPath` (падение/пустота). Blast-radius по фикстурам одинаков
во всех трёх ветках (его диктует `toEqual`), цена (A) над (B)/(C) — только параллельная seal-проверка
+ 2 теста, выгода — тот же громкий инвариант, что уже держит `keyCapStates`. Не пере-litigating
правило «Полного Кластера» — добавляется **параллельное** сцепление, тело §3.3 п. 3 не тронуто.

**Смежные решения (сверены разведкой на коде).**
- **Что зеркалит поле.** `findOptimalPath` (`pathfinding.ts:109`) возвращает **включающий,
  упорядоченный** `KeyCapId[]`: `[дом, …, цель]`; вырожденный `[дом]` при `дом === цель`
  (`:122-124`); `[]` если ключ вне графа. `MovementPath` рисуется при `length >= 1` → `[дом]`
  рисуется («тап на месте»), гасит только `[]`. Новое поле — **точь-в-точь** этот массив.
- **Протечка.** `applyNavigationPaths` (`hands-scene.ts:344-381`) уже считает этот `path` и
  **выбрасывает** его (оставляя лишь разбросанные PATH-роли + стрелки); `HandsScene.svelte`
  **второй раз** собирает граф (`:108`; `TrainingScene:72` уже собрал) и повторяет тот же
  `findOptimalPath` (`:119`). Тот же дом (`getHomeKeyForFinger`), та же цель, тот же граф →
  идентичный массив. Хранение и чтение — поведение-идентично.
- **Проводки графа НЕ нужно.** Конвейер уже получает `keyboardGraph`. Меняется только грань:
  конвейер **хранит** уже имеющийся путь, компонент **выбрасывает** пересборку+пересчёт.
- **Канон.** `CONTEXT.md` не трогаем (термина «путь навигации» в глоссарии нет, конфликта нет),
  ADR не заводим (легко откатывается). `docs/03` **уже расширен аддитивно** (§3.2 — поле в тип +
  пояснение; §3.3 — новое правило 6; тела правил 1-5 не тронуты) — агенту следовать.

**Кристаллизованный шов (готовый интерфейс для агента).**
1. **`src/interfaces/types.ts`** — в `TargetFingerSceneState` (`:295-298`) добавить
   `navigationPath: KeyCapId[];` (required). JSDoc над интерфейсом — дописать строку о сцеплении
   `navigationPath` с TARGET (симметрично строке про `keyCapStates`).
2. **`src/lib/hands-scene.ts`:**
   - В черновик `FingerSceneDraft` (`:84-87`) добавить `navigationPath?: KeyCapId[];` (optional —
     проставляется стадией, сужается на seal).
   - В `sealHandsSceneViewModel` (`:113-130`) добавить **параллельную** проверку: `isTarget !==
     (finger.navigationPath !== undefined)` → `throw` (сообщение называет палец и поле, как у
     `keyCapStates`). Проверку `keyCapStates` не трогать.
   - В `applyNavigationPaths` (`:344-381`) — **хранить** уже посчитанный `path` на TARGET-пальце:
     `fingerData.navigationPath = path;` для **каждого** TARGET-пальца (в т.ч. в ветке `!targetKey`
     проставить `[]`, чтобы seal не бросил). Разбросанные роли/стрелки (`_applyNavigationRoles`/
     `_applyNavigationArrows`) **оставить как есть** — поведение п. 4 сохраняется.
3. **`src/components/hands-scene/HandsScene.svelte`:**
   - `movementPathFor` (`:111-120`) → однострочный читатель:
     `const finger = handsScene[fingerId]; return finger.navigationRole === 'TARGET' ? finger.navigationPath : [];`
     (плоский TS-narrowing discriminated union — обходит неопределённость svelte2tsx). Call-site
     `:189` не трогать.
   - Удалить: импорт `createKeyboardGraph, findOptimalPath` (`:21`), `getHomeKeyForFinger` (`:20` —
     после ухода `movementPathFor`-тела единственный потребитель), derived `keyboardGraph` (`:108`)
     и комментарий над ним (`:106-107`).

**Blast-radius фикстур (неизбежный, диктует `toEqual`).** `hands-scene.test.ts:24` —
`expect(viewModel).toEqual(fixture.expectedOutput)`. Появление `navigationPath` заставляет **каждую
TARGET-фикстуру** добавить поле:
- 14 файлов `src/fixtures/hands-scene/*.ts` с `navigationRole: 'TARGET'` (`shift_b`, `shift_f`,
  `shift_o`, `shift_o_error_simple_o`, `shift_t_error_shift_n`, `simple_6`, `simple_e_error_shift_F`,
  `simple_e_error_simple_d`, `simple_e_error_space`, `simple_k`, `simple_k_error_simple_j`,
  `simple_r_error_simple_f`, `simple_space`, `simple_t`);
- `src/components/hands-scene/Finger.stories.svelte` (конструирует TARGET-состояние — svelte-check
  потребует поле).
- **Путь фикстуры = BFS-выход**, восстанавливается из уже закодированной в ней цепочки PATH-клавиш
  + стрелок + TARGET (напр. `simple_t`: `KeyF[PATH,UP]→KeyR[PATH,RIGHT]→KeyT[TARGET]` =
  `['KeyF','KeyR','KeyT']`). Сам `toEqual` — страховка: неверный путь → красный тест → правка.

**Границы — не трогать.** Разбросанные `navigationRole: 'PATH'`/`navigationArrow` (потребитель
`KeyboardScene`) · тело правила «Полного Кластера» и его seal-проверку `keyCapStates` ·
`layout-utils.ts` (проход 1 объявил здоровым) · `pathfinding.ts` (тела `findOptimalPath`/
`createKeyboardGraph`) · инлайн-тесты `hands-scene.test.ts:27-89` (проверяют поля, не `toEqual` —
`navigationPath` им не нужен).

**Тесты.** Новые seal-кейсы: «TARGET без `navigationPath` → throw», «не-TARGET с `navigationPath`
→ throw» (симметрично существующим `keyCapStates`-кейсам `:100-110`). 14 фикстур + `Finger.stories`
дополняются полем. Число `it.each`-кейсов не меняется (те же фикстуры, расширены). Верификация —
`make check-dev` (НЕ `check-all`: пред-существующий lint-долг), eslint `--quiet` чисто,
svelte-check 0/0, vitest зелёный. Отдельно `make spell` зелёный до коммита.

**Приёмка (re-grep).** `HandsScene.svelte` больше НЕ импортирует/зовёт `createKeyboardGraph`/
`findOptimalPath`/`getHomeKeyForFinger`; `navigationPath` заполняется в `hands-scene.ts` и читается
в компоненте; `docs/03` diff — только добавления (тела правил 1-5 и seal-проверки `keyCapStates`
не тронуты).

**Сделано (2026-07-13).** Ветка **(A) required + seal-enforced** исполнена (диспатч
general-purpose-агенту по кристаллизованному шву). Контракт ViewModel расширен: на TARGET-пальце —
упорядоченный `navigationPath: KeyCapId[]` (`TargetFingerSceneState`, `types.ts:300`, required;
JSDoc дописан о сцеплении с TARGET симметрично `keyCapStates`). В `hands-scene.ts`: черновик
`FingerSceneDraft` получил `navigationPath?`, `sealHandsSceneViewModel` — **параллельную** проверку
сцепления (`throw`, называющий палец+поле; проверка `keyCapStates` не тронута), `applyNavigationPaths`
теперь **хранит** уже посчитанный `path` на каждом TARGET-пальце (в ветке `!targetKey` — `[]` до
`continue`); разбросанные PATH-роли/стрелки (п. 4 контракта) сохранены дословно. `HandsScene.svelte`:
`movementPathFor` — однострочный читатель `finger.navigationPath`; удалены импорт
`createKeyboardGraph`/`findOptimalPath`, импорт `getHomeKeyForFinger`, derived `keyboardGraph` +
комментарий — граф в компоненте больше не пересобирается (был **вторым** билдом поверх
`TrainingScene`). `docs/03` расширен **аддитивно** (§3.2 — поле в тип + пояснение; §3.3 — новое
правило 6; тела правил 1-5 и §3.3 п. 3 «Полного Кластера» не тронуты). CONTEXT.md/ADR не заводились
(термина в глоссарии нет, решение легко откатывается).

**Blast-radius (диктует `toEqual`).** 14 TARGET-фикстур `src/fixtures/hands-scene/*.ts` дополнены
полем; пути — **фактический выход конвейера** (получены эмпирически через `toEqual`-diff, не вручную;
`simple_t=['KeyF','KeyR','KeyT']`, вырожденный `simple_k=['KeyK']`, мульти-TARGET `shift_f` =
`['KeyF']` + `['Semicolon','Slash','ShiftRight']`). +2 новых seal-теста (TARGET без пути → `throw`;
не-TARGET с путём → `throw`). `Finger.stories.svelte` **не тронут** — вопреки первичной оценке
blast-radius он передаёт `navigationRole` строкой в `Finger`, а не конструирует `TargetFingerSceneState`
(svelte-check 0/0 подтвердил).

**Приёмка фактической проверкой.** Re-grep: `HandsScene.svelte` больше не импортирует/зовёт
`createKeyboardGraph`/`findOptimalPath`/`getHomeKeyForFinger` (пусто), `navigationPath` заполняется
в `hands-scene.ts` (`:383`/`:395`) и читается в компоненте (`:107`). `docs/03` diff — только
добавления (тело правил и seal-проверка `keyCapStates` не тронуты). Поведение UI визуально идентично:
сохранённый путь **доказуемо равен** прежнему пересчёту (тот же `getHomeKeyForFinger`, та же цель,
тот же граф), а фикстуры хранят фактический выход конвейера (enforced `toEqual`); живой rAF-прогон —
за владельцем (браузер-автоматизация паузит rAF). `make check-dev` зелёный (eslint `--quiet` чисто,
svelte-check **815 файлов 0/0**, vitest **58 файлов / 650 тестов** — +2 seal-кейса от базы 648, число
`it.each`-фикстур не изменилось). `make spell` зелёный (кальки переписаны в источнике:
`сцеплённый→сцепленный`, `мутируется→изменяется`; недостающие склонения доменных форм — в
`.cspell/project-words.txt`). Ветка `deepMpdule`.

**Статус:** ✅ СДЕЛАНО.

---

### 4. У чтения контекста машин нет интерфейса — MEDIUM · ✅ СДЕЛАНО

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

#### Разведка + кристаллизация шва (2026-07-12)

**Развилки grilling оказались шва, не ценности — решены разведкой.** Селектор живёт в
`selectors.ts` (рядом с `selectSessionActor` — тот же actor-tree-шов прохода 1, готовый
паттерн и стиль JSDoc). Отдаёт **снимок → значения**, не реактивную обёртку (симметрично
`selectSessionActor`): подписка на session-актор остаётся в `+layout` (стр. 100–113, уже
есть), компонент зовёт селектор внутри подписки. `TrainingScene`-чтение `stream`/`currentIndex`/
`currentSymbolLayoutId` (стр. 67–69) — **render-данные** (поток символов, курсор; компонент
обязан их знать для отрисовки), не протечка структуры актора → **вне scope**. `MainContent:40`
(`lastSessionSummary`) — поле контекста **своей** app-машины, одноуровневое чтение (не внук),
ценность мала → **вне первого прогона**.

**Что протекает (сверено на коде 2026-07-12).**
- `+layout.svelte:108,110,119` — читает поля контекста **актора-внука** напрямую
  (`sessionActor.getSnapshot().context.displayElapsedMs` на 108; `s.context.displayElapsedMs`
  внутри подписки на 110; `sessionActor?.getSnapshot().context.durationSeconds` на 119).
  `selectSessionActor` уже даёт актор, но не поля контекста — это острие (двухуровневая
  протечка: имена полей контекста внука знает компонент).
- Сырой `.matches()` — ровно **3 места**: `App.svelte:25,37` (`getSnapshot().matches('menu')`),
  `TrainingScene.svelte:43` (`sessionState.matches('loading')`). `MainContent` уже целиком на
  `inState` (доводить нечего).

**Кристаллизованный шов (готовый интерфейс для агента).**
1. **Дом** — `src/machines/selectors.ts`.
2. Новый чистый селектор над снимком session-машины (оба поля контекста — `number`, сверено
   `session.machine.ts:43,58`):
   ```ts
   export function selectSessionTimer(
     sessionSnapshot: SnapshotFrom<typeof sessionMachine>
   ): { displayElapsedMs: number; durationSeconds: number }
   ```
   JSDoc в стиле файла: единственное место, где знают имена полей контекста session-машины
   (таймер тикает внутри session-актора и в снимок appActor намеренно не всплывает —
   `+layout.svelte:97`). Селектор тотальный (снимок всегда есть у вызывающего), не
   `undefined`-совместимый: отсутствие актора гасит компонент отдельно (стр. 104–106).
3. `+layout` переводит 3 чтения на селектор (поведение сохраняется):
   - 108: `displayElapsedMs = selectSessionTimer(actor.getSnapshot()).displayElapsedMs;`
   - 110: `displayElapsedMs = selectSessionTimer(s).displayElapsedMs;`
   - 119: `durationSeconds: sessionActor ? selectSessionTimer(sessionActor.getSnapshot()).durationSeconds : DEFAULT_USER_SETTINGS.sessionDurationSeconds,`
     (цепочка `?. … ??` разворачивается в явную проверку актора — короткое замыкание сохранено).
4. 3 сырых `.matches()` → `inState({ snapshot, value })` (`state-utils.ts` уже есть, образец —
   `MainContent`):
   - `App.svelte:25,37`: `!inState({ snapshot: appActor.getSnapshot(), value: 'menu' })`.
   - `TrainingScene.svelte:43`: `inState({ snapshot: sessionState, value: 'loading' })`.

**Граница — не трогать.** `TrainingScene.svelte:67–69` (render-данные); `MainContent.svelte:40`;
`layout-utils.ts` (проход 1 объявил здоровым). Тела селектора-цели / `computeTimerSeconds` не
менять — только перевод чтений.

**Тесты.** `selectSessionTimer` — новый `src/machines/selectors.test.ts` (файла нет; проект
`src`, node env). Кейс: снимок session-машины → возвращены `{ displayElapsedMs, durationSeconds }`.
`inState`-переводы поведение-сохраняющие: существующие тесты `App`/`TrainingScene`/session-машины
зелёные без правок. Ожидаемая дельта: +1 тест-файл, +N кейсов.

**Сделано (2026-07-12).** В `src/machines/selectors.ts` добавлен третий селектор
`selectSessionTimer` (тотальный, снимок session-машины → `{ displayElapsedMs, durationSeconds }`;
JSDoc в стиле соседей — единственное место, знающее имена полей контекста session-машины).
`+layout.svelte`: импорт расширен, три чтения контекста внука (стр. 108/110/119) заведены через
селектор; цепочка `?. … ??` на 119 развёрнута в явную проверку актора — короткое замыкание при
отсутствии актора сохранено, поведение идентично (`durationSeconds` типизирован `number`, `??`
ловил лишь короткое замыкание `?.`). Три сырых `.matches()` доведены до `inState`: `App.svelte:25,37`
(`menu`, импорт добавлен), `TrainingScene.svelte:43` (`loading`, импорт добавлен). `MainContent`
уже был на `inState` — не тронут. Граница удержана: render-данные `TrainingScene:67–69`,
`MainContent:40`, `layout-utils.ts`, тела `$effect`/`computeTimerSeconds` не тронуты. Тест — новый
`src/machines/selectors.test.ts` на `selectSessionTimer` (fake-timers по образцу
`session.machine.test.ts`, на `provideSession`; проверяет и что поля не перепутаны, и что
значение живое после нажатия, а не дефолт). **Приёмка фактической проверкой:** re-grep — `+layout`
больше не читает `.context.displayElapsedMs`/`.context.durationSeconds`, сырых `.matches(` в
`App`/`TrainingScene` не осталось, `selectSessionTimer` во всех трёх точках; diff кода сверен
построчно (разворот цепочки на 119 поведение-сохраняющий); `make check-dev` зелёный (eslint чисто,
svelte-check 816 файлов 0/0, vitest **59 файлов / 647 тестов** — +1 файл / +1 кейс, прежние тесты
`App`/`TrainingScene`/session без правок). Ветка deep-module-аудита.

**Статус:** ✅ СДЕЛАНО.

---

### 5. Параллельный обход `currentStepSymbols` в writer и reader — LOW · ✅ СДЕЛАНО

**Файлы:** `shared/repertoire/growth.ts:26-31` · `shared/repertoire/progress.ts:29-42`
(`computeRepertoireProgress`) · `shared/repertoire/progress.ts:102-121`
(`computeProgressionDetail`).

**Проблема.** Writer и reader независимо повторяют обход «пройди `currentStepSymbols`,
посчитай готовность». Все корректно делегируют **критерий** в `readiness.ts` (единый
источник — хорошо), дублируется только setup + цикл обхода. `drill.ts:438` (convex)
документирует, что `progressionDetail` намеренно зеркалит входы writer'а.

**Решение.** Вынести обход в одну чистую fn поверх `readiness.ts`, потребляемую всеми
тремя. Deletion-тест слабый (дублируется цикл, не критерий) → LOW.

**Выгода.** Один обход — один дом; плюс growth/progress перестают дёргать внутренности
readiness (`repertoireMedianLatency`/`readinessGaps`/`isSymbolReady`) напрямую — говорят
с одним `evaluateStepReadiness` (сужение интерфейса, не только снятие дубля).

#### Разведка + кристаллизация шва (2026-07-12)

**Дубль тройной, не двойной (сверено на коде).** Handoff называл пару
`decideOpenedSteps`/`computeProgressionDetail`, но одинаковый setup (`median =
repertoireMedianLatency(cells)` + `bySymbol` Map) и per-symbol `readinessGaps` повторяют
**три** функции, с разной **агрегацией**:
- `growth.decideOpenedSteps` → `notReady = filter(!ready).length` (через `isSymbolReady`);
- `progress.computeRepertoireProgress` → `readyCount` + `blockers{exposure,accuracy,latency}`;
- `progress.computeProgressionDetail` → `readyCount` + per-symbol `SymbolProgress[]` (сырой
  `cell` + `gaps` + `ready`) **и сам `median`** (поля `repertoireMedianLatencyMs`/
  `latencyThresholdMs`).

**Behavior-preserving подтверждён.** `isSymbolReady` (`readiness.ts:66`) = `!gaps.exposure
&& !gaps.accuracy && !gaps.latency` — чистая производная `readinessGaps`; выражение `ready`
живёт трижды (growth через `isSymbolReady`, progress ×2 инлайн). Все три сайта фактически
считают gaps per-symbol → унификация обхода не меняет поведение.

**Кристаллизованный шов (готовый интерфейс для агента).** Одна чистая fn в `readiness.ts`
(дом безопасен: growth/progress уже импортируют оттуда, циклов нет):
```ts
export interface StepSymbolReadiness {
  symbol: string;
  cell: ProfileCell | undefined;
  gaps: ReadinessGaps;
  ready: boolean; // = !gaps.exposure && !gaps.accuracy && !gaps.latency
}
export interface StepReadiness {
  repertoireMedianLatency: number; // median посчитан один раз, отдан наружу для reader'а
  symbols: StepSymbolReadiness[];
}
export function evaluateStepReadiness({ currentStepSymbols, cells, params }: {
  currentStepSymbols: readonly string[];
  cells: readonly ProfileCell[];
  params: ReadinessParams;
}): StepReadiness // median + bySymbol один раз, один map с readinessGaps
```
Шов handoff'а `{readyCount, notReady, blockers}` **отклонён** — не покрывал per-symbol
нужды `computeProgressionDetail` и не отдавал median. Возврат `{median, symbols[{cell,gaps,
ready}]}` — это ровно общий setup+обход; агрегация (counts/blockers/SymbolProgress) остаётся
у потребителей.

**Потребители (behavior-preserving, тела решений не трогать).**
- `growth`: **оба ранних выхода сохранить** (`openedSteps > maxStep`;
  `currentStepSymbols.length === 0` — иначе пустой обход даст `notReady=0 → рост`, регресс);
  затем `notReady = evaluateStepReadiness(...).symbols.filter((s) => !s.ready).length`. Импорт
  `isSymbolReady`/`repertoireMedianLatency` → `evaluateStepReadiness`.
- `computeRepertoireProgress`: `const { symbols } = evaluateStepReadiness(...)`; прежний цикл
  `readyCount`+`blockers` по `symbols`. `notReady = currentStepSymbols.length - readyCount`.
- `computeProgressionDetail`: `const { repertoireMedianLatency: median, symbols } =
  evaluateStepReadiness(...)`; `median` → в поля вывода; `symbols.map(...)` строит
  `SymbolProgress` из `cell`/`gaps`/`ready` (`firstTryAccuracy`/`exposures`-маппинг **остаётся
  здесь** — это решение потребителя). Импорт progress.ts сужается до `evaluateStepReadiness`
  + `type ProfileCell` + `type ReadinessGaps` (прямые `readinessGaps`/`repertoireMedianLatency`
  уходят).

**Граница (не втянуть лишнее).** Выносится только «пройди символы → cell/gaps/ready + median»;
решения (`debtLimit`, `maturingNeeded`, `totalSteps`, `blockers`-агрегация, `SymbolProgress`-
маппинг) остаются у потребителей. `drill.ts` (convex) не трогать — вызовы неизменны.

**Осиротевший `isSymbolReady` (замечено, не в scope).** После выноса `isSymbolReady` теряет
единственного боевого вызывающего (был growth), остаётся только его тест в `readiness.test.ts`
(7 кейсов). Дефолт: **оставить** — behavior-preserving, `readiness.test.ts` не трогаем; это
чистый предикат Readiness-концепта, а его удаление — отдельный deletion-тест на тестируемый
public API (не область дублирования кандидата 5). Пометка на будущий проход, не препятствие.

**Тесты.** Проект `shared` (node env). `evaluateStepReadiness` — свой юнит-тест в
`readiness.test.ts` (число тестов растёт). Существующие `growth`/`progress`/`readiness`-тесты
остаются **зелёными без правок** (behavior-preserving).

**Сделано (2026-07-12).** В `readiness.ts` добавлены `evaluateStepReadiness` + интерфейсы
`StepSymbolReadiness`/`StepReadiness` (median + `bySymbol` считаются раз, один map с
`readinessGaps`, возврат `{ repertoireMedianLatency, symbols[{symbol,cell,gaps,ready}] }`).
Подключены все три потребителя: `growth.decideOpenedSteps` (оба ранних выхода сохранены,
`notReady = …symbols.filter(!ready).length`), `progress.computeRepertoireProgress` (цикл
`readyCount`+`blockers` по `symbols`), `progress.computeProgressionDetail` (`median` в поля
вывода, `SymbolProgress`-маппинг и `firstTryAccuracy`-логика остались дословно у потребителя).
Импорт `progress.ts` из `readiness` сужен до `evaluateStepReadiness`+`type ProfileCell`+
`type ReadinessGaps` (прямые `readinessGaps`/`repertoireMedianLatency` ушли); growth — до
`evaluateStepReadiness`. `isSymbolReady` **не тронут** (осиротел в боевом коде — осознанно, см. выше).
`convex/drill.ts` и `layout-utils.ts` не трогались. **Приёмка фактической проверкой:** re-grep —
прямой setup (`readinessGaps`/`repertoireMedianLatency(`/`new Map(`) исчез из growth/progress,
`evaluateStepReadiness` во всех трёх, вызовы в `drill.ts` неизменны; `make check-dev` зелёный
(eslint чисто, svelte-check 815 файлов 0/0, vitest **58 файлов / 646 тестов** — +4 новых кейса
`evaluateStepReadiness`, прежние `growth`/`progress`/`readiness`-тесты зелёные без правок);
`make spell` зелёный. Ветка deep-module-аудита.

**Статус:** ✅ СДЕЛАНО.

---

### 6. Рантайм-проверка реестра прячется в файле типов — MEDIUM · ✅ СДЕЛАНО

**Deep-module-рамка (ответ на прямой вопрос владельца про `types.ts`).** Метрика
глубины (`функциональность / площадь интерфейса`) к файлу **чистых типов** неприменима —
он весь интерфейс, ноль реализации; `types.ts` — не модуль, а **словарь единого языка**
проекта. Поэтому «один большой файл» сам по себе не трещина (зафиксировано в «Проверено и
счёл здоровым»). Трещина — **вкрапление исполняемого поведения** в словарь.

**Файлы:** `src/interfaces/types.ts:272-330` (`SymbolLayoutDescriptorSchema` — `.refine`×2;
`SymbolLayoutRegistrySchema` — `.superRefine`) · потребители схем-**значений**: только
`src/interfaces/types.test.ts` · боевой реестр `src/lib/layouts.ts:146`
(`SYMBOL_LAYOUT_REGISTRY` — собирается вручную, схемой **не** проверяется) · эталон-контраст
`layouts.ts:44-97` (локальные `PhysicalKeySchema`/`SymbolEntrySchema`/`FingerEntrySchema` у
места `.parse()`).

**Проблема.** Строки 272–330 — не типы, а **исполняемая проверка инвариантов реестра
раскладок** (Zod: «≤1 дефолтной раскладки на язык», «покрытие всех `TEXT_LANGUAGES`»,
«`isDefaultForTextLanguages` — только сам язык или предки BCP-47»). Единственное *поведение*
в файле-словаре, замаскированное под «типы». И оно **полу-мёртвое**: схемы-значения
вызываются лишь из `types.test.ts` на синтетике; боевой `SYMBOL_LAYOUT_REGISTRY` через них
не прогоняется — проверка **не подсоединена к тому, что проверяет**.
`SymbolLayoutRegistrySchema` вдобавок не даёт `z.infer`-типа (чистый рантайм-код).
Побочно: `import { z } from 'zod'` (строка 8) тянет рантайм-зависимость в модульный граф
словаря, хотя 38 из 52 импортёров берут чистый `import type`. Рядом при этом стоит здоровый
образец (`layouts.ts:44-97`) — схема у места парсинга, — которому схемы реестра противоречат.

**Решение (развилка для grilling).** Вынести обе Zod-схемы из `types.ts` в дом реестра
(рядом с `SYMBOL_LAYOUT_REGISTRY` в `layouts.ts` **или** отдельный `symbol-layout-registry.ts`).
Развилка по полу-мёртвому `SymbolLayoutRegistrySchema`: **(A) оживить** — прогнать
`SYMBOL_LAYOUT_REGISTRY` через схему при сборке (проверка начинает охранять боевые данные,
инварианты реестра реально исполняются); **(B) удалить** рантайм-часть как спекулятивную
инфраструктуру (инварианты остаются непроверенными, как де-факто сейчас). `SymbolLayoutDescriptorSchema`
даёт прод-тип `SymbolLayoutDescriptor` через `z.infer` — переезжает в любом случае (не
удаляется), либо тип заменяется ручным. После выноса `types.ts` теряет зависимость на `zod`.

**Выгода.** Словарь домена перестаёт нести исполняемую логику и зависеть от `zod`; проверка
реестра либо становится живой (охраняет данные), либо честно удаляется; логика реестра — рядом
с данными реестра (co-location, как `layouts.ts` уже делает для раскладок).

**Перед исполнением (grilling).** Развилка **A (оживить) vs B (удалить)** — по deletion-тесту
+ вопросу «нужна ли рантайм-проверка инвариантов, если реестр статичен и собран в коде?»; дом
схем (влить в `layouts.ts` рядом с реестром vs отдельный `symbol-layout-registry.ts`); судьба
типа `SymbolLayoutDescriptor` (`z.infer` из переехавшей схемы vs ручной тип). НЕ трогать
локальные схемы `layouts.ts:44-97` — здоровый эталон. Зона `layouts.ts` пересекается с
кандидатом 2 (сделан) — сверить, что переезд не задевает уже переключённые импортёры.

#### Разведка + кристаллизация шва (2026-07-12)

**Развилка решена владельцем — ветка A-тест.** Grilling снял тройную развилку до двойной:
**A-тест строго доминирует A-рантайм** для статичного реестра (данные — статичная
константа `SYMBOL_LAYOUT_META`, между сборкой и запуском неизменны → рантайм-`.parse()` шлёт
`zod` в сборку и роняет приложение белым экраном у 100% юзеров ради ошибки, которую CI-тест ловит красным
и в прод не пускает; A-рантайм оправдан лишь при динамическом реестре — по шапке `layouts.ts`
явный *future*, инфраструктуру под отсутствующего читателя не строим). Владелец выбрал **A-тест** (боевой
реестр прогоняется через схему в тесте) над **B** (удалить): инварианты стерегут реальный класс
багов (тихо-неверный дефолт при опечатке в `isDefaultForTextLanguages` → `.find()` в
`getDefaultSymbolLayoutForTextLanguage` молча вернёт первый), а подсоединение стоит **ноль**
рантайм-нагрузки; схемы **уже написаны**, потребитель (боевой реестр) существует сегодня → это
«заставь существующее делать работу», не спекулятивная инфра.

**Смежные решения (сверены разведкой, blast-radius обеих веток = только `layouts.ts`).**
- **Дом схем — `layouts.ts`** (не отдельный файл): уже импортирует `zod`, уже держит локальные
  схемы у места `.parse()` (`:44-97`) и сам реестр (`:146`) → максимальная co-location, тот же идиом.
- **Тип — `z.infer` в `layouts.ts`** (не ручной): именованный тип `SymbolLayoutDescriptor` называет
  **ровно один** модуль — сам `layouts.ts:31` (`session.machine.ts`/`drill-stream.ts` берут его
  структурно через возврат `getSymbolLayoutDescriptor()`, тип не пишут). Тип реестр-приватен →
  переезд к схеме бесплатен (ноль внешних правок), единый источник схема→тип (идиом `as const`→
  значение+тип, который аудит хвалит). **`types.ts` теряет `zod` и реестр-приватный тип.**
- **Канон.** ADR **не заводим** — решение легко откатывается (переезд схемы), критерий «трудно
  откатить» не держится; «почему» живёт в «Сделано»-блоке (как у 1A–5). CONTEXT.md **не трогаем** —
  ни один доменный термин не рождается/не уточняется (решение о месте кода, не о языке).

**Кристаллизованный шов (готовый интерфейс для агента).**
1. **Переезд обеих схем** `types.ts:270-331` → `layouts.ts` (блок `// --- Symbol Layout Descriptor ---`
   целиком: `SymbolLayoutDescriptorSchema` с `.refine`×2, `SymbolLayoutRegistrySchema` с `.superRefine`).
   Место — рядом с реестром, **до первого использования типа на `:132`** (напр. в секции
   `// ---------- Meta для symbol-layouts ----------`, `:109`). Обе схемы **`export`** (нужны тесту).
2. **Тип** `export type SymbolLayoutDescriptor = z.infer<typeof SymbolLayoutDescriptorSchema>` —
   объявить в `layouts.ts` (там же). Из `layouts.ts:24-34` **убрать** `SymbolLayoutDescriptor` из
   `import type … from '@/interfaces/types'` (теперь локальный). `TEXT_LANGUAGES` **добавить** в
   value-импорт из `@/interfaces/types` (`:20-23`) — схема зовёт `z.enum(TEXT_LANGUAGES)`, сейчас
   импортируется лишь тип `TextLanguage`. `SYMBOL_LAYOUT_IDS`, `SymbolLayout`, `KEY_CAP_IDS` уже на месте.
3. **Поле `symbolLayout` — без смены поведения:** оставить `z.custom<SymbolLayout>(...)` как есть.
   (Рядом есть точный `SymbolEntrySchema:57` — усиление до `z.array(SymbolEntrySchema)` **НЕ делать**,
   это смена поведения; помечено опцией на будущее.)
4. **`types.ts` — вычистить:** удалить блок `:270-331` и `import { z } from 'zod'` (`:8`). Сверить
   grep'ом, что других употреблений `z.`/`zod` в файле нет (их нет). `import type en` (i18n) не трогать.
5. **A-тест — подсоединить к данным.** В `layouts.test.ts` добавить кейс: боевой `SYMBOL_LAYOUT_REGISTRY`
   прогоняется через `SymbolLayoutRegistrySchema` → `.safeParse(...).success === true` (чинит именно
   дефект «проверка не подсоединена к данным»). Оба импорта — из `@/lib/layouts`.
6. **Синтетические тесты схем переезжают.** `types.test.ts` тестирует **только** эти две схемы
   (фабрика `descriptor()`, 6 кейсов: приятие + отклонение плохого дескриптора/>1 дефолта/непокрытого
   языка) → перенести их в `layouts.test.ts` (импорт схем сменить на `@/lib/layouts`). После переноса
   `types.test.ts` **пуст → удалить файл**.

**Граница — не трогать.** Локальные схемы `layouts.ts:44-97` (`PhysicalKeySchema`/`SymbolEntrySchema`/
`FingerEntrySchema` — здоровый эталон) · `layout-utils.ts` · тела `.refine`/`.superRefine` (переезжают
дословно, логика инвариантов не меняется) · value-импортёры `types.ts`, берущие const-массивы
(`SYMBOL_LAYOUT_IDS`/`TEXT_LANGUAGES`/`VISIBILITY_STATES` и пр. остаются) — переезд их не задевает
(пересечение с кандидатом 2 безопасно).

**Тесты.** Синтетические 6 кейсов переезжают в `layouts.test.ts` без изменения тел; +1 новый A-тест
(боевой реестр через схему); `types.test.ts` удаляется. Ожидаемая дельта: **−1 тест-файл, +1 кейс**;
прежние тесты `layouts`/`session`/`drill-stream` зелёные без правок. Верификация — `make check-dev`
(НЕ `check-all`: базовый lint-долг), eslint `--quiet` чисто, svelte-check 0/0, vitest зелёный.

**Приёмка (re-grep).** `zod`/`z.` ушли из `types.ts`; `SymbolLayoutDescriptorSchema`/
`SymbolLayoutRegistrySchema`/`SymbolLayoutDescriptor` живут в `layouts.ts`; `getSymbolLayoutDescriptor`-
потребители (`session.machine`, `drill-stream`) не тронуты; `layouts.test.ts` реально прогоняет
`SYMBOL_LAYOUT_REGISTRY` через схему; `types.test.ts` отсутствует.

**Сделано (2026-07-12).** Ветка **A-тест** исполнена. Обе Zod-схемы вынесены из `types.ts` в дом
реестра `src/lib/layouts.ts` (новая секция `// ---------- Symbol Layout Descriptor ----------`,
`:121-181`, после `SYMBOL_LAYOUT_META` и до первого использования типа на `SYMBOL_LAYOUTS`-map `:194`):
`SymbolLayoutDescriptorSchema` (`.refine`×2) и `SymbolLayoutRegistrySchema` (`.superRefine`) — обе
`export`, тела инвариантов и рыхлый `z.custom<SymbolLayout>` перенесены дословно (поведение
сохранено; усиление до `z.array(SymbolEntrySchema)` осознанно отложено). Тип
`SymbolLayoutDescriptor = z.infer<...>` объявлен там же (`:148`) — единый источник схема→тип; из
type-импорта `layouts.ts` он убран (теперь локальный), в value-импорт добавлен `TEXT_LANGUAGES`
(нужен `z.enum`). `types.ts` очищен: удалён блок схем и `import { z } from 'zod'` — словарь больше
не несёт исполняемого поведения и не зависит от `zod` (re-grep `z.`/`zod` пуст). **A-тест
подсоединён к данным:** `layouts.test.ts` прогоняет **боевой** `SYMBOL_LAYOUT_REGISTRY` через
`SymbolLayoutRegistrySchema` (`.safeParse(...).success === true`) — чинит именно дефект «проверка не
подсоединена к тому, что проверяет». 6 синтетических кейсов схем переехали туда же дословно (импорт
на `@/lib/layouts`); `types.test.ts` после переноса пуст → удалён (`git rm`). Потребители
`getSymbolLayoutDescriptor()` (`session.machine.ts`, `drill-stream.ts`) берут дескриптор структурно
— их импорты не тронуты. Канон: ADR не заводился (решение легко откатывается), CONTEXT.md не тронут
(термин не менялся). **Приёмка фактической проверкой:** re-grep — `zod` ушёл из `types.ts`, схемы+тип
в `layouts.ts`, `types.test.ts` отсутствует, импорты потребителей чисты; `make check-dev` зелёный
(eslint `--quiet` чисто, svelte-check **815 файлов 0/0**, vitest **58 файлов / 648 тестов** — дельта
ровно −1 тест-файл / +1 кейс от базы 59/647, прежние тесты `layouts`/`session`/`drill-stream` без
правок). Ветка deep-module-аудита.

**Статус:** ✅ СДЕЛАНО.

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
- **`types.ts` как словарь единого языка — размер не трещина, чистый словарь не дробить.**
  Deep-module-метрика к файлу *чистых* типов неприменима (он весь интерфейс); `types.ts` — не
  модуль, а ubiquitous language проекта. 392 строки / 52 импортёра (38 — `import type`) —
  нормальный vocabulary-hub, единый источник истины термина; дробить по концепт-файлам +
  barrel = церемония без сужения (та же логика, что кандидат 2 применил к `-utils`). Идиома
  `as const` + `typeof[number]` здорова (один массив рождает и значение, и тип) — не трогать.
  Общие термины словаря (`FingerId`, `KeyCapId`, `Visibility`, `TypingStream`) остаются в нём,
  НЕ переезжают в концепт-дома — они реально общие между многими концептами; co-location типа
  с логикой оправдана лишь для типов, приватных одному концепту, а таких в `types.ts`
  практически нет. Единственная реальная трещина файла — рантайм-проверка реестра (кандидат 6),
  а не размер/раскладка типов.

## Вне scope (roadmap, не трещина)

Thermostat, Analyzer/Weakness Map, Fresh Window, soft-слой ранжирования — ещё не
построены (CONTEXT.md, ADR 0004/0009); их отсутствие — нереализованные этапы, не
архитектурная трещина.
