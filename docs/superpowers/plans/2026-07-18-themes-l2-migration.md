# Миграция light/dark/nord/_template на модель sepia (L2-роли + визуальная модель 0028)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Привести темы `light`/`dark`/`nord` и шаблон `_template.css` к эталону `sepia`: трёхслойная структура (ADR 0029), единый словарь ролей L2 (73 роли), схождение слоя 3 к нулю расхождений, затем пер-темный пер-вывод цветов под визуальную модель ADR 0028.

**Architecture:** Горизонтальная нарезка (решение владельца 2026-07-18, грилл): сперва механический этап по всем трём темам (структура + словарь + схождение L3 + тесты слоёв), затем визуальный этап по одной теме (light → dark → nord) с дизайн-решениями владельца по артефактам. `sepia` — эталон: меняется только по именам двух ролей (Task 1), значения и картинка sepia не двигаются.

**Tech Stack:** CSS custom properties (oklch), Vitest (`src/themes/contract.test.ts`), аудит-скрипты `tmp/audit-themes.mjs` / `tmp/audit-contract-diff.mjs`, `make check-all` (check · 694 теста · build · spell).

---

## Канон (читать перед работой)

- `src/themes/sepia.css` — эталон структуры и значений. Шапка описывает трёхслойку.
- `docs/adr/0029-theming-target-model-and-layer-conventions.md` — слои, граница «геометрия vs цвет», нейминг.
- `docs/adr/0028-route-and-target-carry-finger-identity.md` — визуальная модель (маршрут/цель по пальцу).
- `docs/adr/0030-flow-line-symbol-enum-one-many-errors.md` — warning-тир упразднён.
- `src/themes/CLAUDE.md` — суффикс-словарь, индикатор готовности L2.
- `src/themes/roles.ts` — ROLE_DICTIONARY (источник истины словаря L2).
- DESIGN.md §Colors / Named Rules — «Правило разведения», «Правило мягкости ритма» (оба переписаны 2026-07-18).

## Решения грилл-сессии 2026-07-18 (ПРИМЕНЯЕМ, не пере-обсуждаем)

1. **Горизонталь:** механика по всем темам → визуал по очереди. Одна ветка `feat/themes-l2-migration`, коммиты per-task.
2. **Оттенки пальцев — свои у каждой темы** под общим «Правилом разведения» (DESIGN.md:59). Не копипаст sepia-пятёрки. Переселение внутри палитры темы обязательно там, где дисциплина нарушена (у всех трёх старых тем «средний ≈ успех»: light/dark middle h152 vs success h150; nord middle h130 == success h130).
3. **Ритм:** цвет обратной связи ритма обязан соответствовать теме и правилу «мягче ошибки на клавише»; других правил нет (DESIGN.md:61). Пер-темный выбор в визуальных сессиях.
4. **Курсор потока — вне скоупа:** `--color-cursor-background` остаётся brand-amber во всех темах; пер-позиционный CursorSymbol — отдельная задача (в backlog, Task 10).
5. **Порядок визуала:** light → dark → nord.
6. **Леса в механике:** `_template` после тем, `NORMALIZED` per-theme, тесты слоёв — финальный коммит механического этапа.
7. **Переименование:** `--color-error-soft` → `--color-rhythm-outside`, `--color-error-soft-dim` → `--color-rhythm-outside-dim` (смысл роли — состояние «вне зоны» ритма; цвет per-theme).
8. **П.2 подтянут:** новая роль `--color-marker-core` (словарь 72 → 73); sepia декларирует `var(--ink)` — её ссылка из L3 в ядро чинится.
9. **Каретка/CTA — на `--color-cursor-foreground`** (решение по аудиту плана, 2026-07-18): `--wordmark-caret-color` и `--landing-cta-color` сходятся на `var(--color-cursor-foreground)`, а не на `text-primary`. Инвариант «тёмный текст на янтаре во всех темах» держится ролью, чья семантика ровно это и есть (sepia.css:182: «те же чернила, что каретка логотипа и CTA»). В sepia дельта нулевая (cursor-foreground = text-primary = ink); словарь не растёт.

## Диагностика и мерило прогресса

- `node tmp/audit-contract-diff.mjs` — расхождения L3 строго по THEME_CONTRACT. Сейчас: **96** (68 модельных «sepia против трёх одинаковых» + 28 самодельных «все 4 разные»). **Мерило механического этапа: → 0.**
- `node tmp/audit-themes.mjs` — слои, формы ролей, дрейф словаря `--color-*`.
- `npx vitest run src/themes/contract.test.ts` — гейты декларации/резолвинга.
- Если `tmp/` подчищена — переписать скрипты по шву `contract.test.ts` (comment-aware парсер: `.replace(/\/\*[\s\S]*?\*\//g,'')`).

## Принятые визуальные дельты механического этапа (не баги)

Механический этап стремится к «темы не едут», но схождение L3 к дословному нулю местами двигает картинку — это модель 0028/0029, приходящая раньше цветовых решений:

- **Геометрия колец клавиш:** path-ring `0 0 0 0.25rem` → `inset 0 0 0 0.14rem + просвет 0.15rem var(--color-gap)`; home-ring и target-ring аналогично — все состояния клавиши одного габарита.
- **Кольца пути окрашиваются** `var(--color-route-N)`; механически route-N := finger-N (сохраняет цвет маркеров движения), кольца меняют цвет с `--color-keycap-label` на оттенок пальца — модель 0028 с временными (не переселёнными) оттенками.
- **28 самодельных** (sign-in ×15, user-menu ×8, avatar ×3, landing-cta-hover, movement-path-marker-core) сворачиваются к ролям sepia с микро-дрейфом значений (П.10 backlog).
- **dark/nord: `--color-on-dense` тёмный** (см. таблицы Task 3/4) — текст цели/correct-клавиши становится тёмным на средней заливке (был светлый). Контраст падает: nord ~2.2:1 (цель) / ~1.9:1 (correct), dark ~3.2:1 / ~3.0:1 (было 5–6:1) — у nord ниже порога 3:1 для крупного символа. Временное состояние механического этапа: обязательная проверка с порогами (пятно ≥3:1, символ ≥4.5:1) — Task 8/9.
- **Каретка wordmark и текст CTA** во всех темах переходят на `var(--color-cursor-foreground)` (решение 9): sepia — нулевая дельта; light — каретка/CTA чуть темнее (0.26 0.02 60 → 0.14 0 0, тот же тёмный на янтаре); dark/nord — инвариант «тёмный на янтаре» сохраняется (без решения 9 был бы слом до ~1.9:1).
- Рельс FlowLine: янтарный `--color-cursor-border` → нейтральный `--color-border` (тихий каркас, ADR 0028).

## BSD-предупреждение (урок прошлой сессии)

`sed` на macOS НЕ поддерживает `\b` (литеральная `b`); `grep -E` поддерживает `\b`, но он срабатывает и на дефисе (`error\b` матчит `error-bg`). Переименования — захватом разделителя `s/TOK\([^a-z0-9-]\)/NEW\1/g` + позитивные post-grep. **Правки CSS делаем Edit-инструментом, не sed.**

---

### Task 0: Ветка + коммит правок DESIGN.md из грилл-сессии

Правки DESIGN.md (правила 61 и 133) уже в рабочем дереве, незакоммичены на master.

**Files:**
- Modify: `DESIGN.md` (уже изменён — правила мягкости ритма и спектра пальцев)

- [ ] **Step 1: Создать ветку (незакоммиченные правки переедут в неё)**

```bash
git checkout -b feat/themes-l2-migration
git status --short   # ожидаем: M DESIGN.md
```

- [ ] **Step 2: Коммит**

```bash
git add DESIGN.md
git commit -m "docs(design): цвет ритма и оттенки пальцев — пер-темные под инвариантом (грилл 2026-07-18)"
```

- [ ] **Step 3: Коммит самого плана** (файл untracked; практика проекта — планы коммитятся)

```bash
git add docs/superpowers/plans/2026-07-18-themes-l2-migration.md
git commit -m "docs(plan): миграция тем на модель sepia — план (subagent-driven)"
```

---

### Task 1: Словарь 73 + sepia (переименование ролей ритма, роль marker-core)

**Files:**
- Modify: `src/themes/roles.ts`
- Modify: `src/themes/sepia.css` (L2: строки ~113-119; L3: строки ~346, 495-505)

- [ ] **Step 1: roles.ts — переименовать пару и добавить marker-core**

В `src/themes/roles.ts`:
- `'--color-error-soft',` → `'--color-rhythm-outside',`
- `'--color-error-soft-dim',` → `'--color-rhythm-outside-dim',`
- добавить `'--color-marker-core',` (алфавитно: после `'--color-link-hover',`, перед `'--color-on-dense',`)

Порядок списка алфавитный: `rhythm-outside` и `rhythm-outside-dim` встают между `--color-primary-hover` и `--color-route-1` (НЕ на старое место `error-soft`); `marker-core` — между `--color-link-hover` и `--color-on-dense`. Итог: 73 роли.

- [ ] **Step 2: sepia.css — L2: переименовать пару, добавить marker-core**

Строки 115-119 (комментарий + пара error-soft) заменить на:

```css
  /* Ритм «вне зоны» (снос темпа): цвет соответствует теме и мягче ошибки на
     клавише (DESIGN «Правило мягкости ритма»); других правил нет. В sepia это
     мягкий красный: мягкий янтарь на пергаменте невидим, красный — видимая,
     но негромкая замена. Контраст к дорожке 3.02 против ~2.2 у янтаря. */
  --color-rhythm-outside    : oklch(from var(--red) calc(l + 0.05) c calc(h + 2));
  --color-rhythm-outside-dim: oklch(from var(--red) calc(l + 0.05) c calc(h + 2) / 0.22);
```

В секцию «Домен · тихая направляющая» (после `--color-path-highlight`, ~строка 164) добавить:

```css
  /* Тело бегущей бусины — нейтрально: идентичность пальца держат маркеры
     движения (ободок), не тело (блик/терминатор выводит компонент). */
  --color-marker-core: var(--ink);
```

- [ ] **Step 3: sepia.css — L3: перешить пять токенов**

```css
  --movement-path-marker-core: var(--color-marker-core); /* тело бусины нейтрально: палец несёт ободок (блик/терминатор выводит компонент) */
```
(было `var(--ink)` — ссылка из L3 в ядро мимо ролей, backlog П.2)

```css
  --rhythm-channel-marker-outside : var(--color-rhythm-outside);
  --rhythm-channel-state-fill     : var(--color-rhythm-outside-dim);
```

```css
  --wordmark-caret-color     : var(--color-cursor-foreground); /* тёмный на янтаре во всех темах (решение 9) */
  --landing-cta-color        : var(--color-cursor-foreground);
```
(было `var(--color-text-primary)` — в sepia дельта нулевая: cursor-foreground = ink = text-primary; решение 9, роль честно несёт «тёмный на янтаре»)

Комментарий блока RhythmChannel (строки 495-499): поправить упоминание ролей — «мягкий красный = вне зоны» остаётся верным для sepia, сослаться на обновлённое правило: «цвет соответствует теме (DESIGN «Правило мягкости ритма»)».

- [ ] **Step 4: Гейты**

```bash
npx vitest run src/themes/contract.test.ts   # PASS: sepia декларирует все 73 роли
node tmp/audit-themes.mjs | head -5          # sepia L2=73
node tmp/audit-contract-diff.mjs | head -5   # расхождений пока 96 (сходятся в Task 2-4)
make spell                                   # 0 issues
```

- [ ] **Step 5: Коммит**

```bash
git add src/themes/roles.ts src/themes/sepia.css
git commit -m "refactor(themes): роли ритма → rhythm-outside/-dim, роль marker-core (словарь 73)"
```

---

### Task 2: light — механическая миграция (структура + словарь + L3)

**Files:**
- Modify: `src/themes/light.css` (переписать целиком)
- Modify: `src/themes/contract.test.ts:119` (NORMALIZED)

Процедура (одинакова для Task 2/3/4; значения — из таблиц конкретной задачи):

- [ ] **Step 1: Базлайн**

```bash
node tmp/audit-contract-diff.mjs | head -5   # запомнить счётчик расхождений
```

- [ ] **Step 2: Слой 1 (ядро) — собрать приватную палитру**

Алгоритм: выписать все абсолютные значения текущего слоя ролей light (строки 17-96 старого файла), слить дословно совпадающие в один токен, дать цветовые имена (как у sepia: `--parchment`, `--ink`, `--amber`…). Правила:
- значения ТОЛЬКО абсолютные (oklch), никаких `var()` внутри ядра;
- один токен на дословно-различное значение; НЕ выводить лестницы через `calc` на этом этапе (механика 1:1, лестницы — визуальные сессии);
- имена — по содержимому: `--paper`, `--ink`, `--amber`, `--green`, `--red`, `--finger-1..5`, `--target-indigo`, `--bead` и т.п.

- [ ] **Step 3: Слой 2 (роли) — все 73 роли из ROLE_DICTIONARY**

- Сохранённые роли (45): значение := `var(--<ядро>)` на соответствующий токен ядра (1:1 с текущим абсолютом).
- Удаляемые (8): `--color-warning`, `--color-target-marker`, `--color-cursor-border`, `--color-symbol-correct-background`, `--color-symbol-error-background`, `--color-keycap-role-target-background`, `--color-keycap-role-target-foreground`, `--color-keycap-correct-foreground`.
- Новые (28) — behavior-preserving значения для **light**:

```css
  --color-brand-accent      : var(--amber);        /* oklch(0.77 0.16 70), был target-marker */
  --color-brand-accent-hover: var(--amber-hover);  /* oklch(0.71 0.16 70), был landing-cta-hover */
  --color-border-accent     : var(--paper-border); /* oklch(0.85 0 0), была граница avatar/menu */
  --color-error-hover       : oklch(from var(--color-error) calc(l - 0.06) c h);
  --color-rhythm-outside    : var(--amber);        /* был --color-warning oklch(0.77 0.16 70) */
  --color-rhythm-outside-dim: oklch(from var(--color-rhythm-outside) l c h / 0.22); /* была формула state-fill */
  --color-gap               : var(--color-background);
  --color-ink-strong        : var(--avatar-ink);   /* oklch(0.35 0.1 280), был avatar-color */
  --color-link              : var(--link-ink);     /* oklch(0.40 0.05 280), был guest-link */
  --color-link-hover        : var(--link-ink-hover); /* oklch(0.30 0.1 280) */
  --color-marker-core       : var(--bead);         /* oklch(0.58 0.15 68), бронза */
  --color-on-dense          : var(--on-dense-ink); /* oklch(0.98 0 0), был цвет текста sign-in; тексты target/correct/danger — визуально неразличимы (±0.01 l/c), унифицированы по модели sepia */
  --color-primary-background: var(--color-text-primary); /* oklch(0.14 0 0) */
  --color-primary-border    : var(--primary-border);     /* oklch(0.15 0.02 280), была граница sign-in */
  --color-primary-hover     : var(--primary-hover);      /* oklch(0.30 0.03 280), был hover sign-in */
  --color-route-1           : var(--color-finger-1);  /* маркеры движения уже красятся finger-N — */
  --color-route-2           : var(--color-finger-2);  /* ссылка роль→роль сохраняет их цвет 1:1; */
  --color-route-3           : var(--color-finger-3);  /* кольца пути окрашиваются (принятая дельта) */
  --color-route-4           : var(--color-finger-4);
  --color-route-5           : var(--color-finger-5);
  --color-surface-accent    : var(--avatar-fill);  /* oklch(0.90 0.03 280), был avatar-background */
  --color-surface-raised    : var(--menu-fill);    /* oklch(0.98 0 0), был user-menu-dropdown */
  --color-target-1          : var(--target-indigo); /* oklch(0.29 0.06 243 / 0.7), был */
  --color-target-2          : var(--target-indigo); /* keycap-role-target-background — все пять */
  --color-target-3          : var(--target-indigo); /* одинаковы: цель пер-фингерно решит */
  --color-target-4          : var(--target-indigo); /* визуальная сессия */
  --color-target-5          : var(--target-indigo);
  --color-text-dim          : oklch(from var(--color-text-secondary) l c h / 0.16); /* была формула trail */
```

(Имена ядровых токенов — условные, из Step 2; суть — значения.)

- [ ] **Step 4: Слой 3 (контракт) — заменить 96 расходящихся деклараций на текст sepia**

135 дословно-одинаковых токенов не трогаем. 96 замен (таблицы ниже — дословные строки из `sepia.css`, уже с новыми именами ролей после Task 1). Промежуточная сверка после Task 2 и 3 — парным diff'ом (скрипт считает по всем четырём темам и обнулится только после Task 4):

```bash
diff <(sed -n '/СЛОЙ 3/,$p' src/themes/light.css | grep -E '^\s+--' | sed 's/^ *//; s|/\*.*\*/||; s/ *$//' | sort) \
     <(sed -n '/СЛОЙ 3/,$p' src/themes/sepia.css | grep -E '^\s+--' | sed 's/^ *//; s|/\*.*\*/||; s/ *$//' | sort)
# ожидаем: ПУСТО — слой 3 одинаков с точностью до комментариев
# (в Task 3 подставить dark.css, в Task 4 — nord.css; срезание комментариев
# обязательно: у 3 токенов sepia есть trailing-комментарии, которых нет в таблицах)
```

**Таблица A — 68 модельных** (все три старые темы имели одинаковое старое значение; цель одна):

```
--footer-actions-btn-primary-background: var(--color-primary-background);
--footer-actions-btn-primary-border    : 1px solid var(--color-primary-background);
--flow-line-border            : 2px solid var(--color-border);
--flow-line-correct-background: var(--color-success-dim);
--flow-line-error-background  : var(--color-error-dim);
--movement-path-l1-marker  : var(--color-route-1);
--movement-path-r1-marker  : var(--color-route-1);
--movement-path-l2-marker  : var(--color-route-2);
--movement-path-r2-marker  : var(--color-route-2);
--movement-path-l3-marker  : var(--color-route-3);
--movement-path-r3-marker  : var(--color-route-3);
--movement-path-l4-marker  : var(--color-route-4);
--movement-path-r4-marker  : var(--color-route-4);
--movement-path-l5-marker  : var(--color-route-5);
--movement-path-r5-marker  : var(--color-route-5);
--keycap-home-ring        : inset 0 0 0 0.1rem var(--color-keycap-label), 0 0 0 0.15rem var(--color-gap);
--keycap-l1-path-ring: inset 0 0 0 0.14rem var(--color-route-1), 0 0 0 0.15rem var(--color-gap);
--keycap-r1-path-ring: inset 0 0 0 0.14rem var(--color-route-1), 0 0 0 0.15rem var(--color-gap);
--keycap-l2-path-ring: inset 0 0 0 0.14rem var(--color-route-2), 0 0 0 0.15rem var(--color-gap);
--keycap-r2-path-ring: inset 0 0 0 0.14rem var(--color-route-2), 0 0 0 0.15rem var(--color-gap);
--keycap-l3-path-ring: inset 0 0 0 0.14rem var(--color-route-3), 0 0 0 0.15rem var(--color-gap);
--keycap-r3-path-ring: inset 0 0 0 0.14rem var(--color-route-3), 0 0 0 0.15rem var(--color-gap);
--keycap-l4-path-ring: inset 0 0 0 0.14rem var(--color-route-4), 0 0 0 0.15rem var(--color-gap);
--keycap-r4-path-ring: inset 0 0 0 0.14rem var(--color-route-4), 0 0 0 0.15rem var(--color-gap);
--keycap-l5-path-ring: inset 0 0 0 0.14rem var(--color-route-5), 0 0 0 0.15rem var(--color-gap);
--keycap-r5-path-ring: inset 0 0 0 0.14rem var(--color-route-5), 0 0 0 0.15rem var(--color-gap);
--keycap-l1-target-background: var(--color-target-1);
--keycap-l1-target-color     : var(--color-on-dense);
--keycap-l1-target-ring      : 0 0 0 0.15rem var(--color-gap);
--keycap-r1-target-background: var(--color-target-1);
--keycap-r1-target-color     : var(--color-on-dense);
--keycap-r1-target-ring      : 0 0 0 0.15rem var(--color-gap);
--keycap-l2-target-background: var(--color-target-2);
--keycap-l2-target-color     : var(--color-on-dense);
--keycap-l2-target-ring      : 0 0 0 0.15rem var(--color-gap);
--keycap-r2-target-background: var(--color-target-2);
--keycap-r2-target-color     : var(--color-on-dense);
--keycap-r2-target-ring      : 0 0 0 0.15rem var(--color-gap);
--keycap-l3-target-background: var(--color-target-3);
--keycap-l3-target-color     : var(--color-on-dense);
--keycap-l3-target-ring      : 0 0 0 0.15rem var(--color-gap);
--keycap-r3-target-background: var(--color-target-3);
--keycap-r3-target-color     : var(--color-on-dense);
--keycap-r3-target-ring      : 0 0 0 0.15rem var(--color-gap);
--keycap-l4-target-background: var(--color-target-4);
--keycap-l4-target-color     : var(--color-on-dense);
--keycap-l4-target-ring      : 0 0 0 0.15rem var(--color-gap);
--keycap-r4-target-background: var(--color-target-4);
--keycap-r4-target-color     : var(--color-on-dense);
--keycap-r4-target-ring      : 0 0 0 0.15rem var(--color-gap);
--keycap-l5-target-background: var(--color-target-5);
--keycap-l5-target-color     : var(--color-on-dense);
--keycap-l5-target-ring      : 0 0 0 0.15rem var(--color-gap);
--keycap-r5-target-background: var(--color-target-5);
--keycap-r5-target-color     : var(--color-on-dense);
--keycap-r5-target-ring      : 0 0 0 0.15rem var(--color-gap);
--keycap-correct-color     : var(--color-on-dense);
--keycap-correct-ring      : 0 0 0 0.15rem var(--color-gap);
--landing-cta-background       : var(--color-brand-accent);
--landing-cta-color            : var(--color-cursor-foreground);
--rhythm-channel-zone-fill      : var(--color-success-dim);
--rhythm-channel-marker-outside : var(--color-rhythm-outside);
--rhythm-channel-state-fill     : var(--color-rhythm-outside-dim);
--rhythm-channel-trail          : var(--color-text-dim);
--settings-page-danger-btn-color           : var(--color-on-dense);
--settings-page-danger-btn-hover-background : var(--color-error-hover);
--wordmark-caret-background: var(--color-brand-accent);
--wordmark-caret-color     : var(--color-cursor-foreground);
```

**Таблица B — 28 самодельных** (были «все 4 разные»; цель одна — текст sepia):

```
--sign-in-screen-background            : var(--color-surface);
--sign-in-screen-title-color           : var(--color-text-primary);
--sign-in-screen-disclaimer-color      : var(--color-text-secondary);
--sign-in-screen-btn-github-background : var(--color-primary-background);
--sign-in-screen-btn-github-color      : var(--color-on-dense);
--sign-in-screen-btn-github-border     : 1px solid var(--color-primary-border);
--sign-in-screen-btn-github-hover-background: var(--color-primary-hover);
--sign-in-screen-btn-google-background : var(--color-primary-background);
--sign-in-screen-btn-google-color      : var(--color-on-dense);
--sign-in-screen-btn-google-border     : 1px solid var(--color-primary-border);
--sign-in-screen-btn-google-hover-background: var(--color-primary-hover);
--sign-in-screen-btn-yandex-background : var(--color-primary-background);
--sign-in-screen-btn-yandex-color      : var(--color-on-dense);
--sign-in-screen-btn-yandex-border     : 1px solid var(--color-primary-border);
--sign-in-screen-btn-yandex-hover-background: var(--color-primary-hover);
--user-menu-loading-color               : var(--color-symbol-pending);
--user-menu-guest-link-color            : var(--color-link);
--user-menu-guest-link-hover-color      : var(--color-link-hover);
--user-menu-authenticated-name-color    : var(--color-text-primary);
--user-menu-dropdown-background         : var(--color-surface-raised);
--user-menu-dropdown-border             : 1px solid var(--color-border-accent);
--user-menu-dropdown-item-color         : var(--color-text-primary);
--user-menu-dropdown-item-hover-background: var(--color-surface-hover);
--movement-path-marker-core: var(--color-marker-core);
--landing-cta-hover-background : var(--color-brand-accent-hover);
--avatar-background: var(--color-surface-accent);
--avatar-color     : var(--color-ink-strong);
--avatar-border    : 1px solid var(--color-border-accent);
```

- [ ] **Step 5: Шапка файла** — переписать по образу sepia.css (строки 3-25): назначение темы + три слоя + правило границы. Сохранить `/* cSpell:ignore oklch */`.

- [ ] **Step 6: NORMALIZED**

`src/themes/contract.test.ts:119`: `const NORMALIZED = ['sepia', 'light'] as const;` + поправить комментарий над строкой (перечислить, какие темы нормализованы).

- [ ] **Step 7: Гейты**

```bash
npx vitest run src/themes/contract.test.ts   # PASS (декларация контракта + 73 роли light + резолвинг)
node tmp/audit-themes.mjs | grep -E '^(light|sepia|dark|nord) [0-9]+$'   # light 73
make spell                                   # 0 issues
```

- [ ] **Step 8: Коммит**

```bash
git add src/themes/light.css src/themes/contract.test.ts
git commit -m "feat(themes): light — трёхслойная структура, словарь 73, L3 сошёлся к sepia"
```

---

### Task 3: dark — механическая миграция

**Files:**
- Modify: `src/themes/dark.css` (переписать целиком)
- Modify: `src/themes/contract.test.ts:119` (NORMALIZED)

Процедура — как в Task 2. Отличия — только значения новых ролей (behavior-preserving для **dark**):

```css
  --color-brand-accent      : var(--amber);        /* oklch(0.72 0.16 70), был target-marker */
  --color-brand-accent-hover: var(--amber-hover);  /* oklch(0.66 0.16 70), был landing-cta-hover */
  --color-border-accent     : var(--slate-border); /* oklch(0.35 0.01 280), была граница user-menu (avatar 0.40 — принятый дрейф) */
  --color-error-hover       : oklch(from var(--color-error) calc(l - 0.06) c h);
  --color-rhythm-outside    : var(--amber-warn);   /* oklch(0.80 0.16 70), был --color-warning */
  --color-rhythm-outside-dim: oklch(from var(--color-rhythm-outside) l c h / 0.22);
  --color-gap               : var(--color-background);
  --color-ink-strong        : var(--avatar-ink);   /* oklch(0.92 0.05 280) */
  --color-link              : var(--link-ink);     /* oklch(0.70 0.08 280) */
  --color-link-hover        : var(--link-ink-hover); /* oklch(0.85 0.1 280) */
  --color-marker-core       : var(--bead);         /* oklch(0.90 0.03 85), жемчуг */
  --color-on-dense          : var(--on-dense-ink); /* oklch(0.15 0 0) — ТЁМНЫЙ: текст на светлых плотных заливках (sign-in был 0.15 на 0.88); текст цели/correct темнеет — принятая дельта, финал решает визуальная сессия */
  --color-primary-background: var(--color-text-primary); /* oklch(0.96 0 0) */
  --color-primary-border    : var(--primary-border);     /* oklch(0.70 0.01 280) */
  --color-primary-hover     : var(--primary-hover);      /* oklch(0.88 0 0), был hover yandex — видимое направление hover на светлой заливке */
  --color-route-1..5        : var(--color-finger-1..5);  /* как в light */
  --color-surface-accent    : var(--avatar-fill);  /* oklch(0.35 0.04 280) */
  --color-surface-raised    : var(--menu-fill);    /* oklch(0.18 0.01 280) */
  --color-target-1..5       : var(--target-indigo); /* oklch(0.55 0.10 243 / 0.7) */
  --color-text-dim          : oklch(from var(--color-text-secondary) l c h / 0.16);
```

- [ ] **Step 1-5: как в Task 2 (базлайн, ядро, роли, L3 по таблицам A/B, шапка).** Имена ядра — под тёмную палитру (`--slate`, `--snow`…). Примечание: `--color-cursor-foreground` — сохраняемая роль (oklch(0.14 0 0)); каретка/CTA перешиты на неё (решение 9), их прежний 0.26 0.02 60 чуть темнеет — принятая микро-дельта, инвариант «тёмный на янтаре» цел.
- [ ] **Step 6: NORMALIZED** → `['sepia', 'light', 'dark']`.
- [ ] **Step 7: Гейты**

```bash
npx vitest run src/themes/contract.test.ts
node tmp/audit-themes.mjs | grep '^dark 73'
make spell
```
- [ ] **Step 8: Коммит**

```bash
git add src/themes/dark.css src/themes/contract.test.ts
git commit -m "feat(themes): dark — трёхслойная структура, словарь 73, L3 сошёлся к sepia"
```

---

### Task 4: nord — механическая миграция

**Files:**
- Modify: `src/themes/nord.css` (переписать целиком)
- Modify: `src/themes/contract.test.ts:119` (NORMALIZED)

Процедура — как в Task 2. Значения новых ролей для **nord**:

```css
  --color-brand-accent      : var(--aurora-orange); /* oklch(0.72 0.09 50), был target-marker */
  --color-brand-accent-hover: var(--aurora-orange-hover); /* oklch(0.66 0.09 50) */
  --color-border-accent     : var(--polar-border); /* oklch(0.50 0.02 254), была граница user-menu (avatar 0.55 — дрейф) */
  --color-error-hover       : oklch(from var(--color-error) calc(l - 0.06) c h);
  --color-rhythm-outside    : var(--aurora-yellow); /* oklch(0.85 0.10 90), был --color-warning */
  --color-rhythm-outside-dim: oklch(from var(--color-rhythm-outside) l c h / 0.22);
  --color-gap               : var(--color-background);
  --color-ink-strong        : var(--avatar-ink);   /* oklch(0.94 0.02 234) */
  --color-link              : var(--link-ink);     /* oklch(0.75 0.06 254) */
  --color-link-hover        : var(--link-ink-hover); /* oklch(0.88 0.08 250) */
  --color-marker-core       : var(--bead);         /* oklch(0.89 0.03 82), жемчуг */
  --color-on-dense          : var(--on-dense-ink); /* oklch(0.32 0.02 254) — ТЁМНЫЙ (Polar Night), как в dark */
  --color-primary-background: var(--color-text-primary); /* oklch(0.95 0.01 234) */
  --color-primary-border    : var(--primary-border);     /* oklch(0.70 0.02 254) */
  --color-primary-hover     : var(--primary-hover);      /* oklch(0.88 0.01 234) */
  --color-route-1..5        : var(--color-finger-1..5);
  --color-surface-accent    : var(--avatar-fill);  /* oklch(0.45 0.04 254) */
  --color-surface-raised    : var(--menu-fill);    /* oklch(0.33 0.02 254) */
  --color-target-1..5       : var(--target-indigo); /* oklch(0.55 0.10 245 / 0.7) */
  --color-text-dim          : oklch(from var(--color-text-secondary) l c h / 0.16);
```

Шапка: сохранить объяснение Aurora-палитры + добавить трёхслойное описание.

- [ ] **Step 1-5: как в Task 2.** Ядро — Aurora/Frost/Polar Night имена. Примечание: `--color-cursor-foreground` — сохраняемая роль (oklch(0.14 0 0)); каретка/CTA перешиты на неё (решение 9) — как в dark.
- [ ] **Step 6: NORMALIZED** → `['sepia', 'light', 'dark', 'nord']`, комментарий над строкой — все темы нормализованы.
- [ ] **Step 7: Гейты + МЕРИЛО ЭТАПА**

```bash
npx vitest run src/themes/contract.test.ts
node tmp/audit-contract-diff.mjs | head -5
# ОЖИДАЕМ: «дословно одинаковых во всех 4 темах: 231» · «расходящихся: 0»
make spell
```

- [ ] **Step 8: Коммит**

```bash
git add src/themes/nord.css src/themes/contract.test.ts
git commit -m "feat(themes): nord — трёхслойная структура, словарь 73; L3 сошёлся к нулю по всем темам"
```

---

### Task 5: _template.css — скелет под новую структуру

**Files:**
- Modify: `src/themes/_template.css` (переписать целиком)

- [ ] **Step 1: Переписать**

Три секции по образу мигрированных тем:
- Шапка: инструкция создания темы (сохранить 6 шагов из текущей шапки) + описание трёх слоёв и правила границы (из sepia.css).
- **СЛОЙ 1 · ЯДРО:** пустая секция с комментарием «приватная палитра темы, только абсолюты; имена и количество произвольны — пример: `--paper`, `--ink`, `--amber`» (без токенов — ядро свободно).
- **СЛОЙ 2 · РОЛИ:** все 73 роли из ROLE_DICTIONARY, каждая `: unset;`, сгруппированы как в sepia.css (поверхности / текст / on-dense / primary / ссылки / акценты / исходы / пальцы / маршруты-цели / состояния пальца / направляющая / бренд / статусы символов / курсор / клавиши).
- **СЛОЙ 3 · КОНТРАКТ:** все 231 токен THEME_CONTRACT `: unset;` (текущий список шаблона уже полон — перенести; полноту enforce-ит существующий тест `_template.css declares every contract token`, дополнительная сверка счётчика: `ls src/components/*/*.contract.ts src/Root.contract.ts | xargs grep -hoE "'(--[\w-]+)'" | tr -d "'" | sort -u | wc -l` → 231).

- [ ] **Step 2: Гейт**

```bash
npx vitest run src/themes/contract.test.ts   # PASS: _template декларирует каждый токен контракта
make spell                                   # 0 issues
```

- [ ] **Step 3: Коммит**

```bash
git add src/themes/_template.css
git commit -m "feat(themes): _template — трёхслойный скелет, словарь 73"
```

---

### Task 6: Тесты трёхслойной схемы (замок формы)

**Files:**
- Modify: `src/themes/contract.test.ts` (новый describe поверх `parseRootTokens`)

- [ ] **Step 1: Написать тесты**

Добавить в конец файла (NORMALIZED уже = все 4 темы):

```ts
describe('layer discipline (NORMALIZED themes)', () => {
  // L1: голое имя (не --color-*, не токен контракта) — только абсолюты, ни одного var()
  // L2: --color-* — значение начинается с `var(` или `oklch(from var(` (нет новых абсолютов)
  // L3: токен из THEME_CONTRACT — цветовой слот только var(); запрещены oklch(/rgb(/hsl(/#hex; литерал `transparent` разрешён (ADR 0029)
  const L2_FORM = /^(var\(|oklch\(from var\()/;
  const COLOR_LITERAL = /(?:oklch|rgb|rgba|hsl|hsla)\(|#[0-9a-fA-F]{3,8}\b/;

  for (const id of NORMALIZED) {
    const tokens = parseRootTokens(themePath(id), `:root[data-theme="${id}"]`);
    const contractSet = new Set<string>(THEME_CONTRACT);

    it(`theme '${id}': L1 (ядро) не ссылается ни на что`, () => {
      for (const [name, value] of Object.entries(tokens)) {
        if (name.startsWith('--color-') || contractSet.has(name) || name === 'color-scheme') continue;
        expect(value, `${id}: ядровой ${name} содержит var()`).not.toContain('var(');
      }
    });

    it(`theme '${id}': L2 (роли) — только var()/oklch(from var()`, () => {
      for (const [name, value] of Object.entries(tokens)) {
        if (!name.startsWith('--color-')) continue;
        expect(value, `${id}: роль ${name} с абсолютом: ${value}`).toMatch(L2_FORM);
      }
    });

    it(`theme '${id}': L3 (контракт) — без цветовых литералов`, () => {
      for (const [name, value] of Object.entries(tokens)) {
        if (!contractSet.has(name)) continue;
        expect(value, `${id}: контракт ${name} с цветовым литералом: ${value}`).not.toMatch(COLOR_LITERAL);
      }
    });
  }
});
```

- [ ] **Step 2: Прогнать — ожидаем зелёный сразу** (форму темы получили в Task 2-5; если красный — чинить тему, не тест)

```bash
npx vitest run src/themes/contract.test.ts   # PASS, включая 12 новых проверок (4 темы × 3)
npx eslint src/themes/contract.test.ts       # чисто (новый код теста)
make spell                                   # 0 issues
```

- [ ] **Step 3: Коммит**

```bash
git add src/themes/contract.test.ts
git commit -m "test(themes): дисциплина слоёв для нормализованных тем (закрывает backlog «Тесты трёхслойной схемы»)"
```

---

### Task 7: light — визуальная сессия (пер-вывод цветов под 0028)

**Files:**
- Modify: `src/themes/light.css` (только значения ядра/ролей — форма заперта тестами)

Дизайн-сессия с владельцем. Метод (подтверждён): числа — резолвером (oklch→OKLab→sRGB, WCAG-контраст, ΔE(OKLab), проверка охвата sRGB, симультанный контраст с соседями); дизайн-вопрос — только смотрибельным визуалом (артефакт на настоящем фоне темы, скилл artifact-design), ОДИН вопрос за раз; live-осмотр — Claude-in-Chrome (rAF-анимацию так не проверить).

Чек-лист решений (по одному, с артефактом):
- [ ] Пятёрка оттенков пальцев/маршрутов под «Правило разведения» (свои, НЕ копия sepia; средний обязан уйти от success h150). Заодно: тихие `--color-finger-*` (развод по светлоте под дальтонизм, худшая пара ΔE ≥ 0.086 как ориентир) и производные групп клавиш.
- [ ] Архитектура светлот маршрут/цель: кольцо светлее / заливка плотнее со светлым символом; пороги: пятно ≥3:1 к фону, символ ≥4.5:1 к заливке, кольцо ≥3:1; цель отделена от пальца просветом (проверять контраст цели и к ФОНУ, и к ПАЛЬЦУ).
- [ ] Цвет единичной ошибки символа (`--color-symbol-one-error`): свой warning, разведён с брендом (январь) и ошибкой (ΔE ≥ 0.119 системного минимума).
- [ ] Цвет ритма (`--color-rhythm-outside/-dim`): соответствует теме + мягче ошибки на клавише; виден (не «незаметно»).
- [ ] α вспышек (`--color-success-dim`/`--color-error-dim`): симметрия, читаемость на фоне.
- [ ] Тело бусины (`--color-marker-core`): нейтральное (модель) или окрашенное (текущая бронза) — решение по картинке.
- [ ] Сводный просмотр: on-dense, `--color-gap` (просвет цели на пальце — виден ли), path-highlight, symbol statuses, brand-accent (коридор против cursor-foreground: «тёмный на янтаре» ≥4.5:1 — решение 9).

Гейты после каждого решения: `npx vitest run src/themes/contract.test.ts` (форма не сломана значениями).

- [ ] **Коммит**

```bash
git add src/themes/light.css
git commit -m "feat(themes): light — цвета под модель 0028 (маршрут/цель по пальцу)"
```

---

### Task 8: dark — визуальная сессия

**Files:**
- Modify: `src/themes/dark.css`

Как Task 7, плюс специфика тёмного фона:
- [ ] Архитектура светлот перевёрнута: фон 0.14 — цель/маршрут строятся выше по светлоте; пороги те же (пятно ≥3:1, символ ≥4.5:1, кольцо ≥3:1, просвет режет силуэт на пальце).
- [ ] `--color-on-dense`: полярность (тёмный текст на светлой цели или светлый на плотной) — по артефакту, с пер-позиционной проверкой к каждой из пяти целей **и к correct-клавише** (в механике контраст просел: nord ~1.9–2.2:1, dark ~3.0–3.2:1 — вывести за пороги: символ ≥4.5:1 к заливке).
- [ ] Вспышки `-dim` на тёмном фоне: альфа-композиция ведёт себя иначе, чем на светлом — подобрать α по картинке.
- [ ] Янтарные кандидаты (warning, ритм) на тёмном читаемы — напомнить владельцу его правило: «соответствует теме + мягче ошибки», выбор свободен.
- [ ] Гейты + коммит `feat(themes): dark — цвета под модель 0028`.

---

### Task 9: nord — визуальная сессия

**Files:**
- Modify: `src/themes/nord.css`

Как Task 8, плюс специфика палитры:
- [ ] Оттенки из Aurora/Frost: средний палец обязан уйти от Aurora-зелёного (== success h130) — кандидат Frost-циан (8fbcbb/88c0d0); развести с Aurora-красным (ошибка) и жёлтым.
- [ ] Сохранить «nordness»: поверхности Polar Night, текст Snow Storm — не трогаем.
- [ ] Гейты + коммит `feat(themes): nord — цвета под модель 0028`.

---

### Task 10: Доки, backlog, финальные гейты

**Files:**
- Modify: `DESIGN.md` (§Colors: строки 31, 48, 55, 63)
- Modify: `src/themes/CLAUDE.md` (абзац «Миграция не закончена»)
- Modify: `src/themes/sepia.css` (строка ~213: ссылка «Описание контракта — см. light.css» → `docs/06-component-contracts-and-themes.md`)
- Modify: `docs/06-component-contracts-and-themes.md` (снять дрейф, если примеры ссылаются на старые роли/структуру light.css)
- Modify: `docs/backlog.md` (закрыть П.10, П.2, запись «Тесты трёхслойной схемы тем»; добавить CursorSymbol)
- Modify: `docs/adr/0028-...`, `docs/adr/0029-...` (статус-строки: «Реализация: в коде (`sepia`)» → «Реализация: в коде»)

- [ ] **Step 1: DESIGN.md**
  - стр. 31 «Индиго пути … в `light`/`dark`/`nord`»: убрать устаревшее разделение (после визуальных сессий значение `--color-path-highlight` per-theme — формулировка «подсветка навигационного пути, оттенок свой в каждой теме»);
  - стр. 48: убрать «(до переноса модели)» — модель перенесена;
  - стр. 55: «обкатывается на `sepia`» → применяется во всех темах;
  - стр. 63 («`light`/`dark`/`nord` пока держат исходный спектр…»): удалить.

- [ ] **Step 2: src/themes/CLAUDE.md** — абзац «Миграция не закончена» заменить: все темы на трёхслойной схеме; индикатор готовности L2 достигнут (расхождения L3 = 0) → следующий шаг отдельной большой работой: вынос L3 из тем и растворение контракта (ADR). Суффикс-словарь: убрать `-soft` — после переименования error-soft→rhythm-outside (Task 1) ни одна роль этого суффикса не использует.

- [ ] **Step 3: sepia.css** — комментарий «Описание контракта — см. light.css» → «Описание контракта — `docs/06-component-contracts-and-themes.md`».

- [ ] **Step 4: docs/06** — конкретный дрейф (проверено аудитом плана): строки 62-81 — «Пока на схему переведена только `sepia`… подтягиваются позже», пример «незавершённой формы (`light`)» с абсолютом `--color-success: oklch(0.72 0.19 150)` в роли (после миграции абсолютов в ролях нет), «Свобода — только пока миграция не закончена» — переписать: все темы на схеме, пример формы актуализировать; §6.7 шаг 5 (строка ~113): убрать «или литералом» — цветовой литерал в L3 заперт тестом (Task 6).

- [ ] **Step 5: docs/backlog.md**
  - П.10 — удалить (выполнен);
  - П.2 — удалить (выполнен в Task 1);
  - запись «Тесты трёхслойной схемы тем» — удалить (выполнена в Task 6);
  - пункт «Тесты слоёв.» (строка ~419, внутри раздела отложенного) — удалить: он ссылается на удаляемую запись и выполнен в Task 6;
  - добавить в раздел отложенного: «**CursorSymbol пер-позиционный** — перевод курсора потока с brand-amber на цвет пальца-владельца: пер-позиционный контракт CursorSymbol (ADR 0028, consequences). Отдельная задача со своим ADR»;
  - П.6/П.9 — остаются.

- [ ] **Step 6: ADR-статусы**
  - 0028 и 0029: «Реализация: в коде (`sepia`)» → «Реализация: в коде»;
  - 0026 (`docs/adr/0026-movement-navigator-route.md`, строка 3): «Поправлен: [ADR 0028]… (`sepia` перешла на маршрут по пальцу) · Реализация: в коде (`light`/`dark`/`nord`)» — после миграции ложно; → «… (все темы перешли на маршрут по пальцу) · Реализация: замещён ADR 0028».

- [ ] **Step 7: Финальные гейты**

```bash
node tmp/audit-contract-diff.mjs | head -5   # расходящихся: 0
make check-all                               # check 0 · тесты · build · spell 0
```

- [ ] **Step 8: Коммит**

```bash
git add DESIGN.md src/themes/CLAUDE.md src/themes/sepia.css docs/06-component-contracts-and-themes.md docs/backlog.md docs/adr/0026-movement-navigator-route.md docs/adr/0028-route-and-target-carry-finger-identity.md docs/adr/0029-theming-target-model-and-layer-conventions.md
git commit -m "docs(themes): миграция на модель sepia завершена — дрейф доков, backlog, статусы ADR"
```

- [ ] **Step 9: Финальное холистическое ревью** (как в прошлой сессии — субагенты по аспектам: слои/словарь, схождение L3, доки/канон, визуальная целостность). Push — по слову владельца.

---

## Self-Review (пройдено при написании)

- **Spec coverage:** все пункты скоупа хендоффа (структура, словарь→ROLE_DICTIONARY, 28 самодельных, 68 модельных, _template, NORMALIZED, тесты слоёв, визуал 0028 per theme, индикатор L3→0, курсор вне скоупа → backlog) покрыты Task 1-10. Решения грилла (1-8) отражены в задачах.
- **Placeholder scan:** таблицы A/B содержат дословные целевые строки; значения новых ролей даны per theme; визуальные задачи 7-9 — чек-листы решений с методом и порогами (дизайн-работа с владельцем, кода наперёд нет по определению).
- **Type consistency:** имена ролей сверены с `src/themes/roles.ts` (после Task 1): `rhythm-outside`, `rhythm-outside-dim`, `marker-core`, `on-dense`, `route-1..5`, `target-1..5` — везде одинаковы; токены L3 сверены с `sepia.css`.
