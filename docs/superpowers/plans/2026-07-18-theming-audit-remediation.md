# Theming Audit Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Исправить находки аудита системы темизации: узаконить целевую 2-слойную модель (ядро + роли; контракт — транзитный), навести консистентность нейминга ролей, переименовать доменный enum символов, вычистить мёртвое и дрейф-доки.

**Architecture:** Тема = три секции в одном CSS-файле: **ЯДРО** (L1, приватная палитра, абсолюты) → **РОЛИ** (L2, `--color-*`, семантика) → **КОНТРАКТ** (L3, `--<компонент>-*`, транзитные леса). Целевая модель — 2 слоя (компоненты биндятся в L2 напрямую); L3 растворится отдельной будущей миграцией (в этом плане НЕ трогаем — политика (b): держим дисциплину). Слой определяется **префиксом** имени, не суффиксом. Только `sepia` переведена на схему; `light`/`dark`/`nord` — старая структура, их перенос — тоже отдельная работа.

**Tech Stack:** SvelteKit + Svelte(runes), TypeScript strict, CSS custom properties (oklch, relative color syntax), Vitest (projects: `src`/`convex`/`shared`/`auto-flow`), контракт-тест `src/themes/contract.test.ts`. Единая точка команд — `Makefile` (`make check-all`, `make test`, `make check`, `make spell`, `make build`). Один тест: `npx vitest run <file>`.

**Платформа:** macOS/darwin — **BSD userland**. Критично для скриптов: BSD `sed` **не поддерживает `\b`** (трактует как литеральную `b`), тогда как BSD `grep -E` — поддерживает. Ни один `sed` в этом плане не использует `\b`; переименования с общими префиксами делаются через **захват разделителя** `s/TOKEN\([^a-z0-9-]\)/NEW\1/g` (портативно, защищает суффиксы вроде `-bg`) либо полной заменой уникального имени. Каждый rename сопровождается **позитивной проверкой** (старое имя исчезло по `grep`, новое появилось).

**Принятые решения (источник плана; зафиксированы в чате аудит-сессии):** целевая 2-слойная модель + переход (b); граница L3 = геометрия vs цвет; L2 роль от ядра или другой роли; нейминг: аббревиатуры раскрыты (`bg`→`background`, `fg`→`foreground`, **включая корневую `--color-bg`→`--color-background`, без исключений**), роль = семантика / контракт = CSS-свойство, слой несёт префикс; enum `ERROR→ONE_ERROR`, `ERRORS→MANY_ERRORS`, warning-тир упразднён; удалить `static/design-system.html` и столбец «Реализация» в индексе ADR; записать индустриальный маппинг.

**Правило коммитов:** Conventional Commits, русское тело; хвост `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. `make check-all` зелёный перед каждым коммитом (в т.ч. `make spell`; кальки — переписывать, не в whitelist). Push — только по слову владельца.

**Порядок фаз (строго линейный, документ упорядочен под исполнение):** A (ADR + доки) → B (enum) → C (роли: снять мёртвое → раскрыть аббревиатуры) → D (словарь ролей + тест + гейт резолвинга, консолидация) → E (дрейф-доки, удаления, backlog). Фаза F (L3-транзитное) — **отложена**, не выполнять.

---

## Фаза A — ADR и конвенции (фундамент; узаконивает изменения ниже)

Документация; авто-проверка — `make spell` + `make check` (нет битых ссылок) + ревью.

### Task A1: ADR 0029 — целевая модель темизации + переход + конвенции слоёв/нейминга

**Files:**
- Create: `docs/adr/0029-theming-target-model-and-layer-conventions.md`
- Modify: `docs/adr/README.md` (строка в индекс)

- [ ] **Step 1: Написать ADR 0029** (Context / Decision / Consequences):
  - **Context.** Тема несёт три секции. Аудит выявил: правило слоя 3 «ни литералов» противоречит практике (токен = полное CSS-свойство со структурными литералами); правило слоя 2 «только от ядра» нарушается (17/75 ролей ссылаются на другие роли); аббревиатуры `bg`/`fg` против docs/02; слой де-факто определяется префиксом.
  - **Decision.** (1) Целевая модель — 2 слоя: ЯДРО (primitive/option) + РОЛИ (semantic, `--color-*`); компоненты биндятся в L2. КОНТРАКТ (component, `--<компонент>-*`) — транзитные леса, растворятся миграцией. (2) Переход — политика (b): держим контракт-дисциплину; новое через контракты; растворение L3 — одной миграцией. (3) Слой определяется префиксом (инвариант): голое имя = ядро; `--color-*` = роль; `--<компонент>-*` = контракт. (4) Граница L3 = геометрия vs цвет: разрешены числа (width/offset/blur/spread), `solid`/`dashed`, `inset`, единицы; запрещён любой цветовой литерал — каждый цветовой слот только `var()` на роль; whitelist — `transparent`. (5) L2: роль — от ядра или от другой роли; новых абсолютов нет. (6) Нейминг: аббревиатуры раскрыты (`bg`→`background`, `fg`→`foreground`); роль именует семантику (`background`/`foreground`), контракт (транзит) — CSS-свойство/элемент (`background`/`color`/`border`/`ring`); слой несёт префикс; расхождение `foreground`(роль)/`color`(контракт) легально. (7) Индустриальный маппинг: ЯДРО=primitive/option, РОЛИ=semantic, КОНТРАКТ=component (транзит).
  - **Consequences.** Центр тяжести — L2. Прямой `var(--color-*)` в оболочке/роутах — цель, не протечка. Правило «контракт=CSS-свойство» живёт до растворения L3.

- [ ] **Step 2: Строка в индекс** `docs/adr/README.md` после 0028 (NB: столбец «Реализация» удаляется в Task E3; пока он есть — заполнить консистентно):

```
| [0029](0029-theming-target-model-and-layer-conventions.md) | Целевая модель темы — 2 слоя (ядро+роли); контракт транзитный, растворяется миграцией; переход держит дисциплину; слой несёт префикс; граница L3 = геометрия vs цвет; роль=семантика/контракт=свойство; аббревиатуры раскрыты | принят 2026-07-18 | в коде (sepia) |
```

- [ ] **Step 3: Проверить** — `make spell` + `make check`. Кальки («гамут» и т.п.) переписать («охват sRGB»).

- [ ] **Step 4: Commit**

```bash
git add docs/adr/0029-theming-target-model-and-layer-conventions.md docs/adr/README.md
git commit -m "docs(adr): 0029 — целевая 2-слойная модель темы + конвенции слоёв/нейминга"
```

### Task A2: ADR 0030 — enum символа FlowLine (ONE_ERROR/MANY_ERRORS), warning-тир упразднён

**Files:**
- Create: `docs/adr/0030-flowline-symbol-enum-one-many-errors.md`
- Modify: `docs/adr/README.md`

- [ ] **Step 1: Написать ADR 0030:**
  - **Context.** `FLOW_LINE_SYMBOL_TYPES.ERROR` = «неверно один раз» красился горчицей, `ERRORS` = «неверно несколько» красный. Слово `error` в остальной системе = красный/danger (роли, `KeyCapPressResult.ERROR`, `FingerNavigationRole.ERROR`). Одно слово — два цвета; `ERROR`/`ERRORS` — одна буква `s`.
  - **Decision.** `ERROR → ONE_ERROR`, `ERRORS → MANY_ERRORS`. Модель: и единичный, и повторный промах — **ошибки**, разница в количестве; «warning»-тир **упразднён** (single мягче цветом, many жёстче). Слово `warning`/`предупреждение` уходит из символьной семантики; горчица `--mustard` = «цвет единичной ошибки».
  - **Scope.** Только цепочка `FlowLineSymbolType`: тип, `getSymbolType`, `RegularSymbol` (классы + токены), символьные роли `--color-symbol-error/errors`. **НЕ трогает** `KeyCapPressResult.ERROR`, `FingerNavigationRole.ERROR`, вспышку строки (`--flow-line-*-background`, `--color-*-dim`, `--color-symbol-*-bg` в старых темах).
  - **Consequences.** `MANY` для двух промахов принято (устоявшийся термин). Токены/классы переименованы (фаза B).

- [ ] **Step 2: Строка в индекс** `docs/adr/README.md`:

```
| [0030](0030-flowline-symbol-enum-one-many-errors.md) | Enum символа FlowLine: `ERROR→ONE_ERROR`, `ERRORS→MANY_ERRORS`; warning-тир упразднён (промах = ошибка, single мягче цветом) | принят 2026-07-18 | в коде |
```

- [ ] **Step 3: Проверить** `make spell` + `make check`.

- [ ] **Step 4: Commit**

```bash
git add docs/adr/0030-flowline-symbol-enum-one-many-errors.md docs/adr/README.md
git commit -m "docs(adr): 0030 — enum символа ONE_ERROR/MANY_ERRORS, warning-тир упразднён"
```

### Task A3: Записать конвенции в живые доки

**Files:**
- Modify: `src/themes/CLAUDE.md`
- Modify: `src/themes/sepia.css` (шапка, строки ~14-21: правило слоя 3 и 2)
- Modify: `DESIGN.md` (§Colors — снять «warning» из символьной семантики)

- [ ] **Step 1:** В `src/themes/CLAUDE.md` дописать: (a) префикс-инвариант; (b) индустриальный маппинг (primitive/semantic/component, целевая — 2-слойная, component-слой транзитный); (c) суффикс-словарь ролей (`-foreground`, `-hover`, `-dim` = альфа-поверхность, `-soft` = светлее тот же оттенок, `-strong`/`-muted` ступени, `-raised`/`-accent`/`-border`); (d) правило роль=семантика/контракт=свойство/слой-в-префиксе.

- [ ] **Step 2:** В шапке `src/themes/sepia.css` заменить пункт 3 на «геометрия vs цвет» (числа/`solid`/`dashed`/`inset`/единицы — да; цветовой литерал — нет, только `var()` на роль; whitelist `transparent`) и пункт 2 на «роль — от ядра или от другой роли».

- [ ] **Step 3:** В `DESIGN.md` §Colors: «warning» как тир упразднён; единичный промах = мягче окрашенная ошибка (горчица в sepia), повторный — красный.

- [ ] **Step 4: Проверить** `make spell` + `make check`.

- [ ] **Step 5: Commit**

```bash
git add src/themes/CLAUDE.md src/themes/sepia.css DESIGN.md
git commit -m "docs(themes): конвенции слоёв/нейминга в CLAUDE.md + правило геометрия-vs-цвет; снять warning-тир из DESIGN"
```

---

## Фаза B — Переименование enum ONE_ERROR/MANY_ERRORS (код)

Верификация: `make check` + `npx vitest run src/lib/typing-stream.test.ts` + `make build` + **явные post-grep** (типы/сборка НЕ проверяют соответствие CSS-классов и резолвинг ролей — см. B1 Step 6, B2 Step 4).

### Task B1: Переименовать значения enum и производные (TDD от типов)

**Files:**
- Modify: `src/interfaces/types.ts` (`FLOW_LINE_SYMBOL_TYPES`, строки ~114-120)
- Modify: `src/lib/typing-stream.ts` (`getSymbolType`, ~строка 118)
- Modify: `src/lib/typing-stream.test.ts` (ожидания `getSymbolType`)
- Modify: `src/components/flow-line/RegularSymbol.svelte` (CSS-классы `.ERROR`/`.ERRORS` → `.ONE_ERROR`/`.MANY_ERRORS`)
- Modify: `src/components/flow-line/RegularSymbol.contract.ts` (комментарии; имена токенов — в B2)

  NB: `FlowLine.stories.svelte` НЕ трогать — там `pressResult` (`KeyCapPressResult`), не `symbolType`.

- [ ] **Step 1: Обновить тест** `src/lib/typing-stream.test.ts` — заменить ожидаемые `"ERROR"`/`"ERRORS"` **только в проверках `getSymbolType`** на `"ONE_ERROR"`/`"MANY_ERRORS"`. **ВНИМАНИЕ:** тот же файл держит `getPressResult`-тесты с `'ERROR'` (`KeyCapPressResult`) — их **не трогать**. Ориентир: блок `getSymbolType` (строки ~99-158), НЕ `getPressResult` (~229-260).

- [ ] **Step 2: Запустить — должен упасть**

Run: `npx vitest run src/lib/typing-stream.test.ts`
Expected: FAIL (getSymbolType возвращает старые строки).

- [ ] **Step 3: Обновить enum** `src/interfaces/types.ts` — в `FLOW_LINE_SYMBOL_TYPES`: `"ERROR"`→`"ONE_ERROR"`, `"ERRORS"`→`"MANY_ERRORS"`. **Не трогать** `KeyCapPressResult`, `FingerNavigationRole`, прочие enum'ы.

- [ ] **Step 4: Обновить `getSymbolType`** `src/lib/typing-stream.ts` — ветки возвращают `"ONE_ERROR"` (attempts.length==1, неверно) и `"MANY_ERRORS"` (>1, последняя неверна).

- [ ] **Step 5: Запустить — должен пройти**

Run: `npx vitest run src/lib/typing-stream.test.ts`
Expected: PASS.

- [ ] **Step 6: Обновить CSS-классы + проверить их явно.** В `RegularSymbol.svelte` селекторы `.ERROR`→`.ONE_ERROR`, `.ERRORS`→`.MANY_ERRORS`. **`make check` НЕ проверяет соответствие класс↔enum** (svelte-check не смотрит селекторы, Storybook в check-all не гоняется, компонент-тестов нет) — поэтому пропуск даст «символ без цвета» при зелёных проверках. Явный гейт:

```bash
grep -c "\.ONE_ERROR\|\.MANY_ERRORS" src/components/flow-line/RegularSymbol.svelte   # ждём 2
grep -n "\.ERRORS\{0,1\}\b" src/components/flow-line/RegularSymbol.svelte             # ждём пусто (BSD grep -E: \b работает; в базовом grep — используем -E)
```
И общий тип-гейт (ловит потребителей-литералы; машины/фикстуры используют ДРУГОЙ `ERROR` — их не трогаем):

Run: `make check`
Expected: 0 ошибок.

- [ ] Коммит — вместе с B2 (см. B2 Step 4).

### Task B2: Переименовать символьные токены под новый enum

**Files:**
- Modify: `src/components/flow-line/RegularSymbol.contract.ts`
- Modify: `src/themes/*.css` (все темы)
- Modify: `src/components/flow-line/RegularSymbol.svelte`

- [ ] **Step 1: Переименовать в контракте** `RegularSymbol.contract.ts`: `--regular-symbol-error-color` → `--regular-symbol-one-error-color`; `--regular-symbol-errors-color` → `--regular-symbol-many-errors-color`. Комментарии обновить (ONE_ERROR/MANY_ERRORS).

- [ ] **Step 2: Переименовать роли и контракт-токены во всех темах.** BSD-sed: `\b` НЕ использовать. Уникальные имена — прямой заменой; `--color-symbol-error` (префикс `--color-symbol-errors` И `--color-symbol-error-bg`) — через захват разделителя (защищает и `-bg`, и `-s`):

```bash
cd /Users/belan/PROJECTS/flow-typing
for f in src/themes/*.css src/components/flow-line/RegularSymbol.svelte; do
  sed -i '' \
    -e 's/--regular-symbol-errors-color/--regular-symbol-many-errors-color/g' \
    -e 's/--regular-symbol-error-color/--regular-symbol-one-error-color/g' \
    -e 's/--color-symbol-errors/--color-symbol-many-errors/g' \
    -e 's/--color-symbol-error\([^a-z0-9-]\)/--color-symbol-one-error\1/g' \
    "$f"
done
```

  Здесь `--color-symbol-error\([^a-z0-9-]\)` матчит `--color-symbol-error` только когда следом НЕ буква/цифра/дефис (т.е. `:`, `)`, пробел) → защищает `--color-symbol-error-bg` и `--color-symbol-errors` без опоры на порядок.

- [ ] **Step 3: Позитивные проверки rename** (BSD-sed мог тихо промахнуться — гейтим явно):

```bash
# старые имена должны исчезнуть (grep -E: \b работает на BSD)
grep -rnE "\-\-color-symbol-error\b" src/themes/ src/components/flow-line/   # ждём ПУСТО
grep -rn  "\-\-regular-symbol-error-color\|\-\-regular-symbol-errors-color" src/   # ждём ПУСТО
# новые имена появились в каждой теме
grep -rl "\-\-color-symbol-one-error\b" src/themes/*.css | wc -l   # ждём 5 (light/dark/nord/sepia/_template)
# pressResult-токены НЕ тронуты (должны остаться в старых темах)
grep -rn "color-symbol-error-bg\|color-symbol-correct-bg" src/themes/   # ждём: только light/dark/nord, без изменений
```
Expected: старые пусто, новые в 5 темах, `-bg`-токены целы.

- [ ] **Step 4: Полная проверка + commit**

Run: `make check test build spell`   (в т.ч. `npx vitest run src/themes/contract.test.ts` — контракт-токены `--regular-symbol-one-error-color`/`-many-errors-color` декларированы каждой темой)
Expected: зелёное.

```bash
git add src/interfaces/types.ts src/lib/typing-stream.ts src/lib/typing-stream.test.ts src/components/flow-line/ src/themes/
git commit -m "refactor(flow-line): enum символа ONE_ERROR/MANY_ERRORS + токены; warning-тир упразднён (ADR 0030)"
```

---

## Фаза C — Роли: снять мёртвое, затем раскрыть аббревиатуры

Порядок ВНУТРИ фазы важен: **C1 (удалить мёртвое) → C2 (rename)** — не переименовывать удаляемое.

### Task C1: Снять мёртвые роли `--color-keycap-{secondary,accent}-*`

**Files:**
- Modify: `src/themes/light.css`, `dark.css`, `nord.css`, `_template.css`

- [ ] **Step 1: Подтвердить мёртвость** (0 потребителей):

```bash
grep -rn "keycap-secondary\|keycap-accent" src/ | grep "var(--color-keycap-"
```
Expected: пусто.

- [ ] **Step 2: Удалить 6 ролей на тему** (prefix-delete, `\b` не нужен; не задевает `--color-text-secondary`/`--color-brand-accent`/`--color-surface-accent` — иные префиксы):

```bash
cd /Users/belan/PROJECTS/flow-typing
for f in src/themes/light.css src/themes/dark.css src/themes/nord.css src/themes/_template.css; do
  sed -i '' -e '/--color-keycap-secondary-/d' -e '/--color-keycap-accent-/d' "$f"
done
```

- [ ] **Step 3: Проверить + commit**

Run: `make check test build`
Expected: зелёное (роли были мёртвые).

```bash
git add src/themes/
git commit -m "refactor(themes): снять мёртвые роли --color-keycap-{secondary,accent}-* (0 потребителей)"
```

### Task C2: Раскрыть аббревиатуры ролей — `-bg`→`-background`, `-fg`→`-foreground` (включая корневую `--color-bg`)

**Files:**
- Modify: `src/themes/*.css` (определения ролей + контракт-токены со ссылками)
- Modify: `docs/06-component-contracts-and-themes.md` (стр. 74: пример `var(--color-keycap-group-2-bg)` → `-background`)

  NB: прямых `var(--color-*-bg/fg)` в `src/components`/`src/routes` НЕ существует (проверено) — всё в `src/themes/`. Но rename прогоняем по всему `src/` на всякий случай.

- [ ] **Step 1: Собрать список** (паттерн ловит и корневую `--color-bg`: сегмент перед `bg/fg` опционален):

```bash
grep -rhoE "\-\-color-([a-z0-9-]+-)?(bg|fg)\b" src/ | sort -u
```
Ожидаемо: `--color-bg`, `--color-cursor-bg/fg`, `--color-error-fg`, `--color-keycap-correct-bg/fg`, `--color-keycap-error-bg/fg`, `--color-keycap-group-1..5-bg`, `--color-primary-bg/fg`, `--color-target-fg`; в старых темах ещё `--color-keycap-role-target-bg/fg`, `--color-symbol-correct-bg`, `--color-symbol-error-bg` (суффикс раскрываем единообразно; полное переименование `role-target`/`symbol-*-bg` — миграция).

- [ ] **Step 2: Переименовать по всему `src/`** (BSD-sed без `\b`; ни один `-bg`/`-fg` токен не является префиксом другого — проверено, поэтому полная замена уникального имени безопасна):

```bash
cd /Users/belan/PROJECTS/flow-typing
grep -rhoE "\-\-color-([a-z0-9-]+-)?(bg|fg)\b" src/ | sort -u | while IFS= read -r tok; do
  new=$(printf '%s' "$tok" | sed -e 's/-bg$/-background/' -e 's/-fg$/-foreground/')
  grep -rl -- "$tok" src/ | while IFS= read -r f; do
    sed -i '' "s/${tok}/${new}/g" "$f"
  done
done
```

- [ ] **Step 3: Проверить, что не осталось** (grep -E: `\b` на BSD работает — этот гейт надёжен):

```bash
grep -rnE "\-\-color-([a-z0-9-]+-)?(bg|fg)\b" src/
```
Expected: ПУСТО (если нет — sed промахнулся, чинить до коммита).

- [ ] **Step 4: Поправить пример в docs/06** — `docs/06-component-contracts-and-themes.md:74` `var(--color-keycap-group-2-bg)` → `-background`.

- [ ] **Step 5: Полная проверка + commit**

Run: `make check test build spell`
Expected: зелёное. NB: `make build`/`check` НЕ ловят висячий `var(--color-*)` — за это отвечает гейт резолвинга в Task D1.

```bash
git add src/themes/ src/components/ src/routes/ docs/06-component-contracts-and-themes.md
git commit -m "refactor(themes): раскрыть аббревиатуры ролей — bg→background, fg→foreground, включая --color-bg (ADR 0029)"
```

---

## Фаза D — Словарь ролей: источник истины + тесты (словарь + резолвинг), консолидация

### Task D1: `ROLE_DICTIONARY` + тест декларации + **тест резолвинга** (гейт висячих var)

**Files:**
- Create: `src/themes/roles.ts` (`ROLE_DICTIONARY`)
- Modify: `src/themes/contract.test.ts` (два describe: словарь + резолвинг)

- [ ] **Step 1: Собрать словарь ролей sepia** (эталон L2):

```bash
awk '/СЛОЙ 2 · РОЛИ/{f=1} /СЛОЙ 3 · КОНТРАКТ/{f=0} f' src/themes/sepia.css | grep -oE "^\s*--color-[a-z0-9-]+" | sed 's/^ *//' | sort -u
```

- [ ] **Step 2: `src/themes/roles.ts`** — `export const ROLE_DICTIONARY = [...] as const satisfies readonly \`--color-${string}\`[];` со всеми ролями из Step 1. Шапка: «источник истины словаря ролей L2 (целевой слой)».

- [ ] **Step 3: Тест «каждая тема декларирует каждую роль»** в `contract.test.ts` — для тем `NORMALIZED = ['sepia']` (расширять по мере выравнивания старых тем; старые темы имеют другой набор — их выравнивание не входит в этот план) проверить `ROLE_DICTIONARY ⊆ declared(theme)`. Шов парсинга — как для `THEME_CONTRACT`.

- [ ] **Step 4: Тест резолвинга (гейт висячих `var(--color-*)`)** — ЭТО ловит пропущенные rename ролей (build/check их НЕ ловят). Для каждой темы: собрать все имена, на которые ссылаются `var(--color-…)` в файле темы, и все объявленные `--color-…`; каждый упомянутый обязан быть объявлен (иначе — висячий var). Тест УПАДЁТ, если в фазах B2/C2 остался хоть один старый `--color-*`-ref без определения.

```
// псевдо-структура (реализовать в contract.test.ts, тем же парсером что THEME_CONTRACT):
for (const theme of THEMES) {
  const declared = new Set(parseDeclaredColorRoles(themeCss));
  const referenced = parseVarColorRefs(themeCss);            // все var(--color-…)
  for (const ref of referenced) expect(declared).toContain(ref);   // нет висячих
}
```

- [ ] **Step 5: Прогнать**

Run: `npx vitest run src/themes/contract.test.ts`
Expected: PASS (словарь в скоупе `NORMALIZED`; резолвинг — по всем темам, висячих нет, если фазы B/C сделаны верно).

- [ ] **Step 6: Commit**

```bash
git add src/themes/roles.ts src/themes/contract.test.ts
git commit -m "test(themes): ROLE_DICTIONARY (источник истины L2) + гейт резолвинга висячих var(--color-*)"
```

### Task D2: Консолидировать «светлый текст на плотной заливке» (`*-foreground`)

**Files:**
- Modify: `src/themes/sepia.css` (роли `--color-primary-foreground`, `--color-error-foreground`, `--color-keycap-correct-foreground`, `--color-target-foreground`)
- Modify: `src/themes/roles.ts` (синхронизировать словарь — иначе тест D1 упадёт)

- [ ] **Step 1: Осмотреть 4 почти-одинаковые роли:** `primary-foreground` (parch +0.02/−0.03), `error-foreground` (+0.03/−0.02), `keycap-correct-foreground` (+0.02/−0.01), `target-foreground`→alias. Микроразличия дельт (±0.01) визуально незначимы.

- [ ] **Step 2: Свести в одну роль `--color-on-dense`** (светлый текст/символ на любой плотной заливке) с единой дельтой; проверить контраст резолвером к каждой заливке (текст ≥ 4.5, крупный символ ≥ 3). Заменить потребителей: `error-foreground`/`keycap-correct-foreground`/`target-foreground` → `var(--color-on-dense)`.

- [ ] **Step 3: Синхронизировать `ROLE_DICTIONARY`** (`src/themes/roles.ts`) — **добавить** `--color-on-dense`, **убрать** сведённые роли, ИНАЧЕ тест D1 (subset) упадёт. Прогнать `npx vitest run src/themes/contract.test.ts` — должен пройти.
  Альтернатива (если хочется меньше churn'а): оставить сведённые роли тонкими alias'ами (`--color-error-foreground: var(--color-on-dense)`) — тогда словарь не трогать.

- [ ] **Step 4: Проверить + commit**

Run: `make check test build`

```bash
git add src/themes/sepia.css src/themes/roles.ts
git commit -m "refactor(themes): консолидировать светлый-текст-на-плотном в --color-on-dense (sepia)"
```

---

## Фаза E — Дрейф-доки, удаления, backlog

### Task E1: Удалить `static/design-system.html`

**Files:**
- Delete: `static/design-system.html`
- Modify: `docs/legal/privacy-page.head.html:23` (ИСТОЧНИК фрагмента) **и** `static/privacy/index.html:23` (генерат) — убрать упоминание файла из комментария-примера

- [ ] **Step 1:** `git rm static/design-system.html`
- [ ] **Step 2:** В **обоих** — `docs/legal/privacy-page.head.html:23` и `static/privacy/index.html:23` — из комментария убрать `static/design-system.html` (оставить `app.html`). (Файлы генерата и источника содержат одну и ту же строку 23; если не поправить источник — регенерация вернёт дрейф.)
- [ ] **Step 3: Проверить + commit**

Run: `make build spell`

```bash
git add -A
git commit -m "chore: удалить static/design-system.html — битое ручное зеркало дизайн-системы (+источник фрагмента)"
```

### Task E2: Дрейф-доки (П.8)

**Files:**
- Modify: `docs/06-component-contracts-and-themes.md` (§6.2 счётчики; §6.3 примеры; строки-дрейф «структура — выбор темы»)
- Modify: `src/themes/light.css` (шапка — мёртвый инвариант «equality проверяется contract-тестом»)
- Modify: `src/components/hands-scene/MovementPath.contract.ts` (шапка: sepia 0026→0028; `marker-core` «индиго» → `var(--ink)`)
- Modify: `src/components/landing/LandingScreen.contract.ts` (ссылка на несуществующую в sepia `--color-target-marker` → `brand-accent`)
- Modify: `src/themes/_template.css` (шапка «совпадает с базой» — базы нет; на трёхслойку или снять устаревшие роли)

- [ ] **Step 1: §6.2 счётчики — считать ТОКЕНЫ, не строки** (контракт-файлы пакуют 2-3 токена в строку → `grep -c` врёт):

```bash
for f in KeyCap FooterActions Finger; do
  n=$(grep -oE "'--[a-z0-9-]+'" src/components/**/${f}.contract.ts | wc -l | tr -d ' ')
  echo "$f = $n токенов"
done
```
Проставить фактические (ожидаемо: KeyCap≈80, FooterActions=10, Finger≈9; Root — 2). Пересчитать ВСЕ счётчики в §6.2, не только названные.

- [ ] **Step 2: §6.3 примеры** — `--nav-arrow-outline` (упразднён ADR 0027) убрать; `--keycap-path-ring` (пер-позиционный с 0028) поправить; `--session-stats-display-item-background` → `-divider`.

- [ ] **Step 3: Дрейф «структура — выбор темы»** — вычистить ВСЕ такие утверждения (не только §6.4): строки ~62 («legacy»), ~81 («структура — не обязательная»), ~126 («темы могут радикально различаться по структуре») — привести к трёхслойке ADR 0029.

- [ ] **Step 4: Прочие шапки** — `light.css` (снять мёртвый инвариант), `MovementPath.contract.ts` (0026→0028, marker-core=`var(--ink)`), `LandingScreen.contract.ts` (`target-marker`→`brand-accent`), `_template.css` (на трёхслойку/снять устаревшее).

- [ ] **Step 5: Проверить + commit**

Run: `make check spell`

```bash
git add docs/06-component-contracts-and-themes.md src/themes/light.css src/themes/_template.css src/components/hands-scene/MovementPath.contract.ts src/components/landing/LandingScreen.contract.ts
git commit -m "docs: снять дрейф в docs/06 и шапках контрактов/тем (счётчики-токены, устаревшие примеры, 0026→0028, структура-обязательна)"
```

### Task E3: Снять столбец «Реализация» из индекса ADR + прозу-описание; pending → backlog

**Files:**
- Modify: `docs/adr/README.md` (убрать 4-й столбец таблицы **и** прозу на ~строке 19, описывающую столбец)
- Modify: `docs/backlog.md`

- [ ] **Step 1:** В `docs/adr/README.md` из заголовка/разделителя/каждой строки убрать последнюю ячейку `| … Реализация` (оставить 3 столбца `ADR | Решение | Статус`). **И** поправить прозу на ~строке 19 («…состояние реализации») — она описывает удаляемый столбец.
- [ ] **Step 2:** В `docs/backlog.md` — строка «Отложенные ADR (приняты/предложены, воплощение не начато): 0004, 0017, 0018, 0019, 0021».
- [ ] **Step 3: Проверить + commit**

Run: `make spell`

```bash
git add docs/adr/README.md docs/backlog.md
git commit -m "docs(adr): снять дрейфующий столбец «Реализация» из индекса (+прозу); pending-ADR → backlog"
```

---

## Фаза F — L3-транзитное (ОТЛОЖЕНО, НЕ выполнять)

L3 растворится будущей миграцией (политика (b)). Зафиксировать строкой в `docs/backlog.md`, не чинить:
- **П.2** `--movement-path-marker-core: var(--ink)` (слой 3 → ядро мимо ролей) — роль `--color-marker-core` при растворении L3.
- **П.6** асимметрии контракта (`keycap-error-ring` отсутствует; primary/success hover зашит `opacity` в компонент; комментарий `KeyCap.contract.ts:63` про «зелёное кольцо» врёт — correct-ring = `var(--color-gap)`, геометрия).
- Тесты слоёв (нет абсолютов в L2/L3, L3 только var()/структура, L1 без ссылок) — при стабилизации.
- **П.9 мелочи** (идиом `calc(l*.90)` vs `calc(l-0.08)`; `--color-path-highlight` семантика; `--radius-sm` без примитива; `--user-menu-loading-color`; префиксы `--hands-*`/`--landing-*` vs §6.3).
- **П.10** первый шаг миграции light/dark/nord — отдельная сессия.

- [ ] **Step 1:** В `docs/backlog.md` раздел «Темизация — отложено до растворения L3».
- [ ] **Step 2: Commit**

```bash
git add docs/backlog.md
git commit -m "docs(backlog): L3-транзитные находки аудита — до миграции растворения контракта"
```

---

## Правки после аудита плана (3 субагента, чистый контекст) — вшиты выше

- **BSD-sed `\b` — критично (3/3):** заменён на захват разделителя `s/…error\([^a-z0-9-]\)/…/` (B2) и полную замену без `\b` (C2); добавлены позитивные post-grep (B1 Step 6, B2 Step 3).
- **Гейт резолвинга ролей (F2):** build/check/контракт-тест НЕ ловят висячий `var(--color-*)` → добавлен тест резолвинга (D1 Step 4) — единственный, кто поймал бы тихий недо-rename роли.
- **Порядок:** секции переставлены — снятие мёртвого (C1) физически ПЕРЕД rename (C2); линейное исполнение корректно.
- **Счётчики E2:** считаем токены (`grep -oE "'--…'" | wc -l`), не строки.
- **D2↔словарь:** консолидация обновляет `roles.ts` (или alias) + прогон теста.
- **`--color-bg`** включён в rename (решение владельца — без исключений).
- **Доки-генерат:** E1 правит и источник `privacy-page.head.html`; E3 — прозу-описание столбца.
- **Скоуп enum подтверждён верным** (3 энума с `ERROR`, в работе только `FlowLineSymbolType`; flash-цепочка изолирована); `--color-warning` не мёртв (ритм); D1-удаление мёртвых ролей — корректно.
