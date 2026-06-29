<!-- cSpell:ignore oklch matchmedia FOUC ФЫВА ОЛДЖ -->

# Theme System for FlowTyping

**Date:** 2026-06-07
**Status:** Plan (not yet executed)
**Owner:** @FFire
**Context:** Введение каталога визуальных тем (5-10 шт, functional, не expressive) поверх системы токенов, доведённой до состояния AI-ingest-ready в санации 2026-06-06. Все архитектурные решения зафиксированы в grill-сессии 2026-06-07; здесь они перенесены в исполняемый roadmap.

## Umbrella

**Цель**: курируемый каталог тем (functional) с CSS-only механизмом, без runtime-магии, без build-step и без token pipeline. Принцип — **каждая тема = полный color snapshot** (semantic + domain colors), primitives неприкосновенны, motion/density — orthogonal axes, реализуемые отдельно.

Что закрывает roadmap:
1. Каркас (registry, типы, sync-тесты, FOUC-free bootstrap, switching mechanics).
2. UI выбора темы в Settings.
3. Расширение каталога до целевого размера.
4. Интеграция со Storybook и AI-ingest-артефактами (`design-system.json`, `design-system.html`).

## Принципиальные решения (зафиксировано в grill-сессии 2026-06-07)

| # | Решение | Что значит |
|---|---|---|
| 1 | **Functional**, не expressive | Каждая тема оправдывается комфортом или accessibility. Без «Linear-mood / Arc-mood». |
| 2 | **File-per-theme** в `src/themes/<id>.css` | Каждый файл — один селектор `:root[data-theme="<id>"] { … }`. |
| 3 | **Snapshot, не delta** | Каждая тема задаёт **все** color-токены явно (~62). Primitives не темятся. |
| 4 | **TS-registry + sync-test** | `src/themes/registry.ts` — единственный источник метаданных (id, colorScheme). Тест блокирует дрейф файлов ↔ списка. |
| 5 | **i18n labels** | Label каждой темы хранится в `dictionaries/{en,ru}.json` как `options.themes.<id>`. UI достаёт его lookup'ом по id; в registry лейбла нет (избыточен). |
| 6 | **Eager loading через `@import`** | Все темы попадают в один CSS-bundle на build. Bundle растёт на ~3kb gzip — приемлемо. |
| 7 | **Mirror-key + inline-script для FOUC** | `localStorage['flow-typing-theme']` отражает `preferences.theme`. 5-строчный inline-script в `src/app.html` ставит `data-theme` до paint. |
| 8 | **`light` и `dark` зарезервированы** | Обязательные ID в каталоге. Inline-script использует их как auto-fallback. Тест enforce. |
| 9 | **Разделённый тип** | `type ThemeSetting = ThemeId \| 'auto'` для preferences; `type ThemeId` для атрибута/CSS/Storybook. |
| 10 | **`resolveTheme()` + matchMedia listener** | Единственная функция-распознаватель. Listener подхватывает смену system-темы при `'auto'`. |
| 11 | **View Transitions API** для свитча | Crossfade без custom CSS-transitions. Instant fallback в браузерах без поддержки. Длительность из `--motion-duration-base`. |
| 12 | **Переключатель только в Settings** | Native `<select>` с `<optgroup>` по colorScheme в `UserPreferencesPage.svelte`. Без Header dropdown, без иконок-эмодзи в опциях. |

## Текущее состояние (baseline)

- `src/app.css` — 3 слоя (primitives → semantic → domain), 99 токенов с JSDoc.
- `src/design-system.json` — manifest base-палитры.
- `static/design-system.html` — single-page витрина.
- `src/lib/preferences.ts` — writable store + localStorage persistence.
- `src/lib/i18n.ts` + `dictionaries/{en,ru}.json` — i18n инфраструктура (после split на `interfaceLanguage`/`textLanguage`).
- Storybook на `@storybook/sveltekit` + svelte-csf.
- Темы отсутствуют.

## Roadmap — 5 фаз, ~9 часов суммарно

Приоритеты: **MUST** — критично для запуска; **SHOULD** — поверх MUST; **NICE** — потом.

---

### Phase 0 · Каркас + первая dark тема — **MUST** (~4 ч)

**Что делаем**: вся механика темизации появляется работоспособной, в каталоге две темы (`light` как полный snapshot базы + `dark`), `Select.svelte` готов поддерживать optgroup и не теряет видимость в dark.

#### 0.1 · Расширение типов и preferences (~30 мин)

- `src/interfaces/user-preferences.ts` — добавить поле `theme: ThemeSetting`. Импорт: `import type { ThemeSetting } from '@/themes/registry'` (только type, чтобы гарантировать отсутствие runtime cycle).
- `src/user-preferences/user-preferences.ts` — `DEFAULT_USER_PREFERENCES.theme = 'auto'`.
- `src/lib/preferences.ts`:
  - добавить guard `isThemeSetting(v): v is ThemeSetting` (`'auto'` или `ThemeId`);
  - расширить `normalizePreferences`: ветка для `theme`, fallback на default при невалидном значении;
  - добавить второй `store.subscribe`, зеркальный `theme` в `localStorage['flow-typing-theme']` (рядом с уже существующим subscriber на `STORAGE_KEY`). Это **единственный** источник записи в mirror-key — никаких reconciliation-эффектов сверху.

#### 0.2 · Registry, types, resolver (~30 мин)

- `src/themes/registry.ts`:
  - константа `THEMES` (массив `{id, colorScheme}` с записями для `light` и `dark`). Label не хранится в registry — UI читает его из `dictionary.options.themes[id]` (см. Phase 1.4);
  - `type ThemeId = typeof THEMES[number]['id']`;
  - `type ColorScheme = 'light' \| 'dark'`;
  - `type ThemeSetting = ThemeId \| 'auto'`;
  - `resolveTheme(setting: ThemeSetting): ThemeId` — `auto` → `matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'`;
  - `setTheme(id: ThemeSetting): void` — **stub-реализация** в Phase 0: `preferences.update(p => ({ ...p, theme: id }))`. Полная реализация с VT API guards — в Phase 1.1.

#### 0.3 · Файлы тем + template (~45 мин)

- `src/themes/_template.css` — селектор `:root[data-theme="__TEMPLATE__"]` со всеми ~62 color-токенами из base `:root` (значения — `unset` или закомментированные заполнители). НЕ попадает в bundle (не импортируется). Включается в contract-тест структурно.
- `src/themes/light.css` — полный snapshot базы. Селектор `:root[data-theme="light"]`. Все ~62 color-токена в значениях, идентичных текущему `:root` в `app.css`. Плюс `color-scheme: light;`. Базовый `:root` в `app.css` сохраняется как fallback для бесатрибутного режима (первый paint до inline-script).
- `src/themes/dark.css` — первая реальная override-тема. Полный snapshot. `color-scheme: dark;`. Правила трансформации — **ориентир, не точная формула**; итоговые значения подбираются под визуальную читаемость на тёмном фоне и проходят acceptance-контраст. Конкретные значения в snippet'ах ниже — главенствующие:
  - **Semantic surface**: L инвертирована с лёгкой коррекцией под комфорт (тёмные slate-тона, не чистый чёрный); chroma 0, hue 0.
    - `--color-bg: oklch(0.14 0 0)`, `--color-surface: oklch(0.20 0 0)`, `--color-surface-hover: oklch(0.25 0 0)`, `--color-border: oklch(0.30 0 0)`.
  - **Semantic text**: invert L `(0.14→0.96, 0.44→0.72, 0.56→0.62)`.
    - `--color-text-primary: oklch(0.96 0 0)`, `--color-text-secondary: oklch(0.72 0 0)`, `--color-text-muted: oklch(0.62 0 0)`.
  - **Semantic outcomes**: hue+chroma неизменны, L подкручен для контраста на dark (success/error чуть светлее, warning без изменений).
  - **Finger palette** (`--color-finger-1..5`, `--color-finger-base`): L снизить на ~0.05, chroma снизить на ~0.02 — палитра остаётся опознаваемой, но не выжигает сцену.
  - **Finger state** (`inactive/idle`): инвертировать L под dark surface.
  - **Navigation visualization** (`path-highlight`, `target-marker`, `cursor-border`): hue сохранить (cold blue / warm amber дуальность — часть бренда), L подкрутить под dark (~0.5 path, ~0.7 markers).
  - **Symbol statuses** (`pending/correct/corrected/error/errors` + `*-bg`): foreground светлее (L≈0.7-0.85), background сильно темнее (L≈0.20-0.30) — bg должен быть **слегка** светлее `--color-bg`, чтобы row различался.
  - **Cursor block**: `cursor-bg: oklch(0.95 0 0)`, `cursor-fg: oklch(0.14 0 0)` (инверсия light-варианта).
  - **KeyCap label + marker**: invert L, hue сохранить.
  - **KeyCap color groups** (`neutral/yellow/sky/indigo/purple` × `bg/border`): bg `oklch(0.22 chroma hue / 0.7)`, border `oklch(0.40 chroma hue)`.
  - **KeyCap secondary/accent/role-target/correct/error**: пары fg/bg/border сохраняют hue, L пересчитан под dark (роль-target — светло-холодная плашка на тёмном; correct/error остаются насыщенными).
  - **Arrow** (`fill/stroke/gradient`): hue сохранить, L поднять для видимости на тёмном.
  
  Конкретные oklch-значения подбираются по этим правилам при выполнении 0.3 и фиксируются в файле. Проверка результата — в Acceptance v2 (smoke-сценарий + контраст).

#### 0.4 · Расширение `Select.svelte` (~25 мин)

- `src/components/ui/Select.svelte`:
  - тип `Option` остаётся; добавить тип `OptionGroup { label: string; options: Option[] }`;
  - свойство `options: Option[] \| OptionGroup[]` — рендеринг определяется через дискриминатор;
  - шаблон:
    ```svelte
    {#each options as item}
      {#if 'options' in item}
        {@const group = item as OptionGroup}
        <optgroup label={group.label}>
          {#each group.options as option (option.value)}
            <option value={option.value}>{option.label}</option>
          {/each}
        </optgroup>
      {:else}
        {@const option = item as Option}
        <option value={option.value}>{option.label}</option>
      {/if}
    {/each}
    ```
    Локальный `{@const}`-cast компенсирует, что Svelte 5 template type-narrowing внутри `{:else}` не наследует TypeScript narrowing полностью.
  - заменить hardcoded SVG-стрелку (`stroke='%23a3a3a3'`) на mask-based подход — стрелка адаптируется к теме через токен:
    ```css
    .select {
      /* ... existing styles, без background-image со стрелкой ... */
      background-image: none;
    }
    .select-wrapper::after {
      content: '';
      position: absolute;
      right: var(--spacing-2);
      top: 50%;
      transform: translateY(-50%);
      width: 12px; height: 12px;
      background-color: var(--color-text-secondary);
      mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='12' height='12'%3E%3Cpath d='m6 9 6 6 6-6' fill='none' stroke='black' stroke-width='2'/%3E%3C/svg%3E");
      mask-repeat: no-repeat;
      mask-position: center;
      pointer-events: none;
    }
    ```
    `-webkit-` префикс **не нужен** при заявленном browser support floor (см. Phase 1 Known limitations: Chrome ≥111, Safari ≥18, FF ≥138).

#### 0.5 · CSS-импорты, inline-bootstrap, JSON-stub (~30 мин)

- `src/app.css`:
  - в базовый `:root { ... }` добавить `color-scheme: light;` (нужно для JS-off scenario и крошечного окна между paint и inline-script — иначе native scrollbars/select chrome в браузерном дефолте).
  - после `:root { ... }` добавить:
    ```css
    @import url('./themes/light.css');
    @import url('./themes/dark.css');
    ```
- `src/design-system.json` — добавить stub-блок `"themes": {}` рядом с уже существующими `primitives` / `semantic` / `domain`. Это разрабатывает почву для Phase 4 enforcement-теста: пустой объект валиден, но если когда-нибудь поле перестанет существовать (рефакторинг manifest), тест сразу заметит. Phase 4 наполняет stub содержимым.
- `src/app.html` — inline `<script>` **в `<head>` до `%sveltekit.head%`** (выполнится до paint и до hydration):
  ```html
  <script>
    try {
      let t = localStorage.getItem('flow-typing-theme');
      if (!t || t === 'auto') {
        t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      document.documentElement.dataset.theme = t;
    } catch (_) {
      // Safari Private Mode / disabled storage: fallback на matchMedia без LS
      var mq = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
      document.documentElement.dataset.theme = mq && mq.matches ? 'dark' : 'light';
    }
  </script>
  ```
  
  **Порядок гарантии**: inline-script synchronous, выполняется до парсинга `<link rel="stylesheet">` из `%sveltekit.head%` (SvelteKit внедряет CSS-link именно туда). Поэтому к моменту первого CSS-match атрибут `data-theme` уже установлен — стили темы применяются на первом paint без вспышки.
  
  **Edge-case Safari Private Mode**: `localStorage.getItem` может бросать `SecurityError`. `try/catch` ловит и применяет matchMedia-fallback. В этом режиме `theme: 'auto'` фактически залипает, но UI не ломается.

#### 0.6 · Hydration-effect + matchMedia listener (~30 мин)

В `src/components/app/App.svelte` (или ближайшем подходящем `+layout.svelte`):

- `$effect` #1 — каждый раз при изменении `$preferences.theme`:
  ```ts
  $effect(() => {
    document.documentElement.dataset.theme = resolveTheme($preferences.theme);
  });
  ```
  Mirror-key обновляется автоматически через subscriber из 0.1 — никакой reconciliation-логики здесь не нужно (единственный источник записи).

- `$effect` #2 — активен только при `$preferences.theme === 'auto'`, с **explicit cleanup** против leak'а listener'а:
  ```ts
  $effect(() => {
    if ($preferences.theme !== 'auto') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      document.documentElement.dataset.theme = resolveTheme('auto');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  });
  ```
  Паттерн отражает уже использующийся `subscribe`/`unsubscribe` идиом из `TrainingScene.svelte` (см. CLAUDE.md — раздел про подписку на дочерний xstate-actor).

#### 0.7 · Contract & sync test (~45 мин)

`src/themes/contract.test.ts`:

- **sync**: `readdirSync('src/themes/').filter(f => f.endsWith('.css') && f !== '_template.css').map(stripExt).sort() === THEMES.map(t => t.id).sort()`.
- **обязательные ID** — через assertion helper (не `.find()?.x`, который может бросить):
  ```ts
  function getThemeOrFail(id: string) {
    const t = THEMES.find(x => x.id === id);
    if (!t) throw new Error(`Required theme '${id}' missing from registry`);
    return t;
  }
  expect(getThemeOrFail('light').colorScheme).toBe('light');
  expect(getThemeOrFail('dark').colorScheme).toBe('dark');
  ```
- **contract**: парсим base `:root` в `app.css`, собираем set color-токенов (filter по `--color-*`). Для каждого theme-файла (включая `_template.css`):
  - все base color-токены присутствуют в селекторе темы;
  - `color-scheme: <expected>` присутствует в селекторе (где `expected` совпадает с `colorScheme` из registry).
- **template-spec**: `_template.css` структурно валиден (все токены объявлены, значения могут быть пустыми/`unset`/комментариями).
- **`light.css` ↔ base `:root` value equality**:
  ```ts
  const baseTokens = parseRootTokens('src/app.css', ':root');
  const lightTokens = parseRootTokens('src/themes/light.css', ':root[data-theme="light"]');
  for (const [name, baseValue] of Object.entries(baseTokens)) {
    if (!name.startsWith('--color-')) continue;
    expect(lightTokens[name]).toBe(baseValue);
  }
  ```
  Любое расхождение значения — fail с указанием конкретного токена.

- **Helper `parseRootTokens(path, selector)`** живёт в этом же тестовом файле (или `src/themes/__helpers__/parse-css.ts`, если используется повторно в других тестах). регулярного выражения достаточно — формальный CSS-парсер не нужен (`postcss` не используем):
  ```ts
  // Возвращает Record<string, string>: { '--color-bg': 'oklch(1 0 0)', ... }
  function parseRootTokens(path: string, selector: string): Record<string, string> {
    const src = readFileSync(path, 'utf-8');
    // 1. Найти блок селектора: `<selector> { ... }` (учитывая один уровень вложенности через скобочный счётчик)
    const start = src.indexOf(selector);
    if (start < 0) throw new Error(`Selector ${selector} not found in ${path}`);
    const open = src.indexOf('{', start);
    let depth = 1, i = open + 1;
    while (depth > 0 && i < src.length) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') depth--;
      i++;
    }
    const body = src.slice(open + 1, i - 1);
    // 2. Извлечь объявления `--name: value;` (значение может содержать скобки/слэши).
    const out: Record<string, string> = {};
    const decl = /(--[\w-]+)\s*:\s*([^;]+);/g;
    for (const m of body.matchAll(decl)) out[m[1]] = m[2].trim();
    return out;
  }
  ```
  ~20 строк, без зависимостей. Покрывается своим smoke-тестом в том же файле (`parseRootTokens('src/app.css', ':root')` возвращает >50 токенов, в том числе `--color-bg`).
- **inline-script presence в `app.html`** (закрывает R9):
  ```ts
  const html = readFileSync('src/app.html', 'utf-8');
  expect(html).toMatch(/dataset\.theme\s*=/);
  expect(html).toMatch(/flow-typing-theme/);
  expect(html).toMatch(/prefers-color-scheme:\s*dark/);
  ```
  Если кто-то удалит bootstrap из `app.html` — тест падает в CI до того, как FOUC вылезет у пользователя.

#### Acceptance v2 (Phase 0)

- `make check-all` зелёный.
- `contract.test.ts` падает на: удаление токена из `light.css` или `dark.css`; переименование файла темы; добавление файла без записи в registry; убирание `light` или `dark` из registry; забытый `color-scheme` в файле темы; рассогласование `_template.css` с базой.
- В DevTools `<html data-theme="dark">` → визуально dark; `<html data-theme="light">` → визуально равно дефолтному `:root` (диф ≈ 0px); удаление атрибута → возврат к `:root`.
- Пройти smoke-сценарий в каждой теме: Menu → Start Training → ввести 5 символов корректно, 2 ошибочно (вызвать `CORRECT` и `ERROR` в `KeyCap` и FlowLine row-bg), активировать CursorSymbol, открыть Settings, открыть Stats. Проверить, что: курсор виден, `role-target` keycap читается, FlowLine row-bg различим (CORRECT ≠ ERROR ≠ neutral), пальцы не «гаснут» на bg.
- **FOUC measurement**: с system=dark, `localStorage.setItem('flow-typing-theme', 'dark')`, hard-reload через DevTools (disable cache) — записать screencast 1 сек, убедиться что нет ни одного кадра светлой темы между paint и hydration. Использовать Performance panel timeline для подтверждения.
- Изменение `preferences.theme = 'dark'` через DevTools console → `localStorage['flow-typing-theme']` обновляется немедленно.
- `Select.svelte` со `groups`-форматом рендерит корректные `<optgroup>` (storybook story проверочный), стрелка-маркер видна и в light, и в dark.

**Почему это работает**: каркас изолирован от UI-переключателя — он появляется только в Phase 1. Машина уже работоспособна и тестируема через DevTools + contract-тест.

---

### Phase 1 · UI переключателя + VT API — **MUST** (~1.5 ч)

**Что делаем**: пользователь меняет тему в Settings, свитч сопровождается мягким crossfade в современных браузерах; reduced-motion и concurrent-clicks учтены.

**Pre-requisite (тестовое окружение)**: `resolveTheme('auto')` и любой код, его вызывающий, обращается к `matchMedia(...)`. Vitest по умолчанию работает в `node` environment, где `matchMedia` отсутствует. До начала Phase 1 тестов:

- **Scope: per-file, не global.** Глобальное переключение через `vitest.config.ts` (`test.environment: 'jsdom'`) затронет ВСЕ существующие тесты — потенциальные регрессии в node-only тестах (path/fs, чистая логика). Вместо этого использовать per-file директиву в каждом новом theme-тесте, который реально нуждается в `matchMedia`:
  ```ts
  // @vitest-environment jsdom
  ```
  на первой строке файла. Contract-тест из Phase 0.7 НЕ требует jsdom (он только парсит файлы) — он остаётся node-env.
- Добавить setup-файл (например `src/themes/__tests__/matchmedia-mock.ts`) с stub:
  ```ts
  import { vi } from 'vitest';
  if (typeof window !== 'undefined' && !window.matchMedia) {
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: false, media: query, onchange: null,
      addEventListener: vi.fn(), removeEventListener: vi.fn(),
      addListener: vi.fn(), removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }
  ```
- Импортировать setup в начале каждого jsdom-тестового файла, либо подключить через `test.setupFiles` с условной обёрткой (выполняется только под jsdom).

Без этого тесты, вызывающие `resolveTheme('auto')`, упадут с `ReferenceError: matchMedia is not defined`.

#### 1.1 · `setTheme()` со всеми guard'ами (в `src/themes/registry.ts`)

```ts
let pendingTransition: ViewTransition | null = null;

export function setTheme(id: ThemeSetting): void {
  const apply = () => preferences.update(p => ({ ...p, theme: id }));

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const supportsVT = typeof document.startViewTransition === 'function';

  if (!supportsVT || reducedMotion) {
    apply();
    return;
  }

  // concurrent-call guard: skip-если предыдущий transition ещё идёт
  if (pendingTransition) {
    apply();
    return;
  }

  pendingTransition = document.startViewTransition(apply);
  // .then(fulfilled, rejected) — глушит обе ветки явно;
  // .finally() оставил бы unhandled rejection при skipTransition() / browser-error.
  pendingTransition.finished.then(
    () => { pendingTransition = null; },
    () => { pendingTransition = null; },
  );
}
```

#### 1.2 · CSS-настройка анимации (`src/app.css`)

```css
@media (prefers-reduced-motion: no-preference) {
  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation-duration: var(--motion-duration-base);
    animation-timing-function: var(--motion-ease-standard);
  }
}
```

Внешнее `@media` гарантирует: даже если браузер по какой-то причине запустит transition при reduced-motion, никакой собственной анимации не будет (system overlay тоже сам мягче по умолчанию).

#### 1.3 · i18n — расширение словарей (nested snake_case, существующая конвенция)

`dictionaries/en.json` и `dictionaries/ru.json` — расширения существующих блоков:

- `user_preferences.theme_label` — `"Theme"` / `"Тема"`.
- `user_preferences.theme_description` — `"Visual theme of the interface."` / `"Визуальная тема интерфейса."` (опционально).
- `user_preferences.theme_group_light` — `"Light themes"` / `"Светлые темы"`.
- `user_preferences.theme_group_dark` — `"Dark themes"` / `"Тёмные темы"`.
- `options.themes.auto` — `"Auto (system)"` / `"Авто (по системе)"`.
- `options.themes.light` — `"Light"` / `"Светлая"`.
- `options.themes.dark` — `"Dark"` / `"Тёмная"`.

Каждая будущая тема (Phase 2) добавляет ключ `options.themes.<id>` в обе словаря.

#### 1.4 · UI в `src/components/ui/UserPreferencesPage.svelte`

Тип `dictionary` — глобальный `Dictionary = typeof en` (в `src/interfaces/types.ts`). Новые ключи в JSON-словарях подхватываются TS-выводом типов автоматически.

**Действие**: в файле сейчас (`src/components/ui/UserPreferencesPage.svelte:7-23`) определён локальный `interface Props { dictionary: { user_preferences: {...}, options: {...} } }` с narrow-типом, перечисляющим только нужные ключи. **Заменить** это определение на `interface Props { onBack: () => void; dictionary: Dictionary; }` с `import type { Dictionary } from '@/interfaces/types';`. После этого все ключи (включая новые `user_preferences.theme_label`, `options.themes.*`) становятся доступны без ручной правки типа на каждое расширение словаря.

Использование `Select.svelte` с расширенным форматом `Option[] \| OptionGroup[]` (из 0.4):

```svelte
<script lang="ts">
  import { setTheme, THEMES, type ThemeSetting } from '@/themes/registry';
  // ... existing imports

  const themeOptions = $derived.by(() => {
    const lightThemes = THEMES
      .filter(t => t.colorScheme === 'light')
      .map(t => ({ value: t.id, label: dictionary.options.themes[t.id] }));
    const darkThemes = THEMES
      .filter(t => t.colorScheme === 'dark')
      .map(t => ({ value: t.id, label: dictionary.options.themes[t.id] }));

    return [
      { value: 'auto', label: dictionary.options.themes.auto },
      { label: dictionary.user_preferences.theme_group_light, options: lightThemes },
      { label: dictionary.user_preferences.theme_group_dark, options: darkThemes },
    ];
  });
</script>

<label class="field">
  <span class="label-text">{dictionary.user_preferences.theme_label}</span>
  <Select
    value={$preferences.theme}
    options={themeOptions}
    onChange={(v) => setTheme(v as ThemeSetting)}
  />
</label>
```

(Решено: `setTheme` идёт **не через `updatePreferences`**, а напрямую — потому что её обёртка содержит VT API + guards. Внутри `setTheme` всё равно вызывается `preferences.update`, так что store-инвариант не нарушается.)

**Замечание о передаче `dictionary`**: свойство приходит сверху через `MainContent.svelte` (`<UserPreferencesPage … {dictionary} />`). Тип словаря — глобальный `Dictionary = typeof en` (определён в `src/interfaces/types.ts`); новые ключи в `dictionaries/{en,ru}.json` подхватываются TS-выводом типов автоматически. **Не вводить** локальный prop-тип в `UserPreferencesPage.svelte` (он конфликтует с глобальным `Dictionary`). Достаточно убедиться, что ключи добавлены **в оба** словаря (en + ru), иначе TS падёт на пересечении.

(JSON-stub `"themes": {}` для Phase 4 enforcement добавлен в `src/design-system.json` ещё в Phase 0.5 — здесь повторное действие не требуется.)

#### Known limitations (Phase 1)

- **Browser support floor**: Chrome ≥111 (VT API), Safari ≥18 (VT API), Firefox ≥138 (VT API за флагом до недавнего default-on). На этом floor: VT API работает; `mask-image` без `-webkit-` prefix работает (Safari 15.4+); CSS custom properties — давно везде. Под более старые версии план не оптимизируется.
- **Firefox VT API**: на июнь 2026 в большинстве сборок default-on, но в отдельных распространениях может остаться за `dom.viewTransitions.enabled`. Без VT — **instant swap**. Это UX regression (не «features off»). Документируем как принятый trade-off.
- **Reduced-motion users**: на VT-эпохе вообще не получают transition (по design — соблюдаем accessibility preference).

#### Acceptance v2 (Phase 1)

- В Settings есть выпадающий список «Theme» / «Тема» (по `interfaceLanguage`), сгруппированная по colorScheme.
- Выбор `Dark` → `dataset.theme="dark"` ставится; в Chrome/Safari (VT-capable) видим crossfade ~200ms; в Firefox или при `prefers-reduced-motion: reduce` — мгновенный swap без crossfade.
- Выбор `Auto` → тема следует за системой. Эмуляция: DevTools `Rendering → Emulate CSS media feature prefers-color-scheme: dark` → UI меняется без перезагрузки в течение того же кадра.
- Concurrent-clicks (spam-click по 10 опций подряд) не вызывают ошибок в консоли; визуально применяется последний выбор без зависаний.
- **`color-scheme` валидация**: открыть `<select>` в Dark теме (нашем собственном theme picker и любом других выпадающем списке) — выпадающая панель браузера тёмная, не белая. Проверить на macOS Chrome и Safari.
- **Контраст**: для пар `text-primary/bg`, `text-secondary/bg`, `text-muted/bg`, `cursor-fg/cursor-bg`, `keycap-role-target-fg/keycap-role-target-bg` в каждой теме измерить через **Storybook a11y panel** (`@storybook/addon-a11y` уже в проекте — открыть любую story в нужной теме, переключиться на a11y tab, проверить раздел Contrast) либо через **DevTools → Accessibility → Contrast**. Standalone `axe-core` не нужен. WCAG AA (≥4.5 для normal text, ≥3 для large) — обязательно для `light`/`dark`. Если в будущем появятся accessibility-ориентированные темы (тип `ColorScheme` будет расширен соответствующим вариантом), для них целиться в AAA — но в текущем плане таких тем нет.
- Перезагрузка страницы сохраняет выбор без flash (см. процедуру FOUC measurement в Phase 0 Acceptance — повторить для каждой темы из Phase 2).

---

### Phase 2 · Расширение каталога до целевого размера — **SHOULD** (~30 мин на тему)

**Что делаем**: добавляем оставшиеся темы (целевой размер каталога — отдельное продуктовое решение, не зафиксировано в grill-сессии). Механика уже на месте, каждая новая тема — это один файл + одна запись в registry + два i18n-ключа.

Артефакты per тема:
- `src/themes/<id>.css` — полный snapshot (~62 токена).
- запись в `THEMES` в `registry.ts`: `{ id, colorScheme }`.
- ключ `options.themes.<id>` в `dictionaries/{en,ru}.json` (та же конвенция, что и для прочих опций — `options.interfaceLanguages.<id>`, `options.layouts.<id>`).

**Acceptance**:
- `contract.test.ts` подхватывает новую тему без правок (sync-test работает по glob).
- Тема появляется в селекторе автоматически.
- WCAG AA для основных пар text/bg в каждой теме (проверка через **Storybook a11y panel** или DevTools → Accessibility → Contrast — см. Phase 1 Acceptance для конкретных пар). Будущие accessibility-ориентированные темы (если такие добавятся в каталог) целятся в AAA.

**Cost saving трюк**: брать готовые проверенные палитры (Solarized, Nord, sepia от Instapaper) — экономит время на подбор oklch значений вручную.

---

### Phase 3 · Storybook integration — **SHOULD** (~30 мин)

**Что делаем**: тема становится глобальным переключателем в Storybook toolbar; все existing stories автоматически получают возможность рендериться в любой теме.

Артефакты:
- `.storybook/preview.ts` (проверено: файл существует под этим именем, текущая конфигурация — минимальный `Preview` с color matcher) — расширяется:
  ```ts
  import { THEMES } from '@/themes/registry';

  export const globalTypes = {
    theme: {
      name: 'Theme',
      toolbar: {
        icon: 'paintbrush',
        items: [
          { value: 'auto', title: 'Auto (system)' },
          ...THEMES.map(t => ({ value: t.id, title: t.id })),
        ],
        dynamicTitle: true,  // Storybook 10 idiom (вместо устаревшего showName).
      },
    },
  };

  export const decorators = [(story, ctx) => {
    document.documentElement.dataset.theme = ctx.globals.theme === 'auto'
      ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : ctx.globals.theme;
    return story();
  }];
  ```

**Acceptance**:
- В Storybook toolbar появляется выпадающий список с темами.
- Любая existing story (KeyCap, FlowLine, HandsScene, KeyboardScene) перерисовывается при свитче.
- Изменение темы не требует перезагрузки story.
- В Storybook нет регрессий в существующих stories.

**Cost saving трюк**: ID тем в toolbar — raw (не label), чтобы не дублировать i18n в Storybook-окружении. Это инструмент разработчика, не пользователя.

---

### Phase 4 · Расширение `design-system.json` и витрины — **SHOULD** (~1 ч)

**Что делаем**: AI-ingest-артефакты, созданные в санации 2026-06-06, узнают про каталог тем.

Артефакты:
- `src/design-system.json` — расширяется новым блоком:
  ```jsonc
  {
    // ... существующие primitives / semantic / domain
    "themes": {
      "$description": "Full color snapshots per theme. Domain semantics (finger model, navigation roles, press results) preserved across themes.",
      "light": { /* full color map, mirrors base :root */ },
      "dark":  { /* full color map */ },
      "sepia": { /* … */ }
    }
  }
  ```
  Генерируется руками (как и сам manifest сейчас), синхронизируется при правке тем.
- `static/design-system.html` — добавляется toggle в шапке витрины: native `<select>` с теми же опциями, обновляет `document.documentElement.dataset.theme`. Витрина показывает каждый цветовой swatch (визуализацию токена) и каждый компонент в выбранной теме. Здесь «swatch» — в общем смысле «цветной квадратик с подписью», не путать с опциональным preview-`swatch` из Phase 5 (которое селектор-в-Settings).
- **Enforcement тест** (`src/themes/contract.test.ts` или новый `src/themes/manifest.test.ts`):
  - распарсить `src/design-system.json`, достать `Object.keys(json.themes)`;
  - сверить с `THEMES.map(t => t.id)`;
  - если расхождение — fail с понятным сообщением «design-system.json.themes отстал от registry, добавьте/удалите запись для X».

**Acceptance v2 (Phase 4)**:
- `design-system.json` валиден JSON, `themes.<id>` существует для каждой темы в registry — проверяется тестом, не «руками».
- Витрина `design-system.html` открывается через `file://` и `localhost:5173/design-system.html`, селектор работает, все swatch'и и компоненты перерисовываются при свитче.
- Claude Design при ingest читает темы как полноценные палитры (sanity-check после развёртывания; **не блокирует phase'у**, фиксируется в issue, если AI не подхватил).

**Почему это работает**: snapshot-подход (Q2 grill) даёт каждую тему как самодостаточную палитру — никакой реконструкции через cascade. AI читает один JSON, видит N полных палитр.

---

### Phase 5 · Preview swatches — **NICE** (~1 ч)

**Что делаем**: в селекторе Settings рядом с каждой темой — 3-color swatch для discovery («посмотрел — выбрал», без необходимости щёлкать каждую тему).

Артефакты:
- `src/themes/registry.ts` — опциональное поле `swatch: [string, string, string]` (bg, surface, accent в OKLCH-строках) per theme. Заполняется руками per theme.
- `src/components/ui/Select.svelte` — расширить тип `Option` опциональным `swatch?: [string, string, string]` и рендеринг (`<span>` с тремя `<i>`-цветными квадратиками перед текстом). Не ломать существующие use cases — если `swatch` нет, рендерить только label.
- `src/components/ui/UserPreferencesPage.svelte` — **второй раз** редактируется (после Phase 1.4): в построении `themeOptions` добавить `swatch: registryEntry.swatch` к каждому option. Локальный mapper: `THEMES.filter(...).map(t => ({ value: t.id, label: dictionary.options.themes[t.id], swatch: t.swatch }))`.

**Acceptance v2 (Phase 5)**:
- В Settings рядом с каждой темой (у кого определён `swatch`) видны 3 цветовых квадратика.
- Темы без `swatch` рендерятся в селекторе как до Phase 5 (graceful fallback).
- Внешний вид цветовых образцов сохраняется при свитче темы: они **не** управляются токенами текущей темы — это репрезентация **выбираемых** тем, не текущей.

**Не делаем в этой фазе**: автогенерация swatches из CSS-файла темы (требует runtime CSS-parser или Vite plugin).

---

## Что специально НЕ делаем

| Не делаем | Почему |
|---|---|
| Style Dictionary / token transformers / build-time codegen | Дорого для одного человека и одного приложения. Snapshot-файлы достаточно. |
| Expressive каталог (Linear-mood, Arc-mood, и т.п.) | Размывает собственный бренд. Решено в Q1 grill: только functional. |
| Темы, переопределяющие primitives (motion, spacing, font) | Это orthogonal axes (reduced-motion, density, font-size). Отдельный механизм через @media или другой data-attribute. |
| Header dropdown / quick toggle | Шумит в минималистичном Header, противоречит «не настройка под себя» из brand-doc. |
| Hotkey для переключения тем (любая фаза) | (1) `Cmd+Shift+T` перехватывается Chrome на browser-level; альтернативы требуют расширения `keyboardMachine` под meta-комбинации, которых модель не поддерживает. (2) Аудитория FlowTyping — функциональная, выбирает тему один раз и забывает; power-user сценария «листать темы по hotkey'ю» нет. |
| Preview swatches / live previews в селекторе на старте | Усложнение без замера, оправдан ли. Phase 5 после feedback. |
| Lazy loading тем | Bundle растёт на ~3kb gzip всего каталога. Не оправдан. |
| Магия в комментариях CSS (per-file metadata) | Хрупкий формат, плохо тестируется, registry-в-TS лучше. |
| Авто-генерация `themes` блока `design-system.json` | Нет build-step. Синхронизируется руками. |
| Полная dark theme в санации 2026-06-06 | Перенесено сюда; в санации сделали базу (3-layer токены), на которой этот план становится тривиальным. |

## Sequencing

(Пересчитано после двух раундов code review — Phase 0 выросла за счёт встроенных sub-задач с готовыми snippet'ами; Phase 5 сократилась после удаления hotkey.)

- **Минимум для запуска (~5.5 ч)**: Phase **0 → 1**. У пользователя появляется работающий dark-mode с переключателем, FOUC-free, VT-анимированный, со всеми guards (reduced-motion, concurrent calls, listener cleanup).
- **Полный план без NICE (~8 ч)**: **0 → 1 → 2 → 3 → 4**. Каталог из N тем, Storybook integration, AI-ingest расширения с enforcement.
- **Полный план (~9 ч)**: **0 → 1 → 2 → 3 → 4 → 5**.

Phase 5 (preview swatches) не блокирует ни одну предыдущую и может быть добавлена в любой момент после Phase 1.

## Acceptance для всей системы (v2 — testable формулировки)

| Критерий | Как проверять |
|---|---|
| `make check-all` зелёный | автоматически |
| `src/themes/contract.test.ts` падает на любом рассогласовании (registry ↔ FS, contract violation, отсутствие `light`/`dark`, отсутствие `color-scheme`, дрейф `_template.css`) | автоматически, в нём ≥10 разных assertion'ов |
| `src/themes/manifest.test.ts` (или расширенный contract) падает на рассогласовании `design-system.json.themes` с registry | автоматически |
| FOUC-free на cold-load: каждая тема каталога загружается без вспышки светлого | screencast 1 сек на DevTools Performance timeline; pass-критерий — нет ни одного кадра с темой ≠ сохранённой между First Paint и First Contentful Paint |
| Auto-режим реагирует на `prefers-color-scheme` change в момент работы | DevTools `Rendering → Emulate prefers-color-scheme: dark` → `dataset.theme` обновляется в течение того же кадра без перезагрузки |
| Свитч через UI: VT crossfade в Chrome ≥111 / Safari ≥18 / FF ≥138; instant fallback в остальных | manual cross-browser smoke на трёх браузерах |
| Native `<select>` dropdown chrome, scrollbars соответствуют colorScheme темы | manual проверка в dark теме — открыть любой select, полоса прокрутки, autofill — должны быть dark, не белые |
| Контраст: text/bg пары соответствуют WCAG AA (≥4.5 normal, ≥3 large) в каждой теме | **Storybook a11y panel** (`@storybook/addon-a11y` уже в проекте) или DevTools → Accessibility → Contrast — для пар `text-primary/bg`, `text-secondary/bg`, `text-muted/bg`, `cursor-fg/cursor-bg`, `keycap-role-target-fg/keycap-role-target-bg` |
| Доменная семантика сохранена: 5-пальцевая палитра различима, navigation roles читаемы, press results CORRECT vs ERROR vs neutral визуально различимы | smoke-сценарий: Menu → Start Training → ввести 5 правильных + 2 ошибочных символа в каждой теме каталога; check-лист «что должно быть видно» в виде Storybook-проверки на `KeyCap.stories.svelte` и `HandsScene.stories.svelte` |
| Storybook позволяет просматривать любую story в любой теме без перезагрузки | manual через toolbar |
| `design-system.html` витрина синхронна с каталогом | open file://, проверить что theme-toggle содержит все ID из registry |

## Open question (не блокирует архитектуру)

Конкретный состав каталога (5? 7? 10? какие именно темы) — отдельное продуктовое решение. Механизм спроектирован для **N** тем, конкретный N выбирается при выполнении Phase 2.

## References

- `docs/superpowers/plans/2026-06-06-design-system-sanitation-for-claude-design.md` — санация токенов, на которой строится этот план
- `src/app.css` — текущая 3-layer система токенов
- `src/design-system.json` — manifest base-палитры (Phase 4 расширит блоком themes)
- `static/design-system.html` — витрина (Phase 4 добавит theme-toggle)
- `src/lib/preferences.ts` — writable store + `normalizePreferences`, который получит поле `theme: ThemeSetting` и второй subscriber для mirror-key
- `src/interfaces/user-preferences.ts` — тип `UserPreferences`, в который добавляется `theme`
- `src/user-preferences/user-preferences.ts` — `DEFAULT_USER_PREFERENCES` с `theme: 'auto'`
- `src/lib/i18n.ts` + `dictionaries/{en,ru}.json` (в корне проекта) — i18n: derived store `dictionary` с nested snake_case ключами
- `src/components/ui/UserPreferencesPage.svelte` — Settings UI, куда встанет селектор тем (использует `Select.svelte` с расширенным форматом `Option[] \| OptionGroup[]`)
- `src/components/ui/Select.svelte` — расширяется поддержкой `<optgroup>` и заменой hardcoded SVG-стрелки на `mask-image` + theme-aware color
- `src/app.html` — минимальный HTML-шаблон SvelteKit, куда вставляется inline-bootstrap script
- `.storybook/preview.ts` — Storybook preview config; расширяется `globalTypes.theme` + `decorators`
- [View Transitions API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API) — стандарт, используемый в Phase 1
- [`prefers-reduced-motion` (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion) — accessibility media query, ограничивает доступ VT animation
- [`color-scheme` CSS property (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/color-scheme) — управление chrome'ом нативных элементов управления per theme
- [Solarized palette (Schoonover)](https://ethanschoonover.com/solarized/) — пример проверенной functional-палитры на случай Phase 2
- Independent review reports (2026-06-07): три раунда Plan-agent + general-purpose с чистым контекстом — история в Changelog ниже

## Changelog

> Историческая справка о том, как план эволюционировал. Все правки **интегрированы в фазы выше** — этот раздел не главенствует, он только показывает, что и почему менялось, для будущих читателей и для аудита процесса. Если что-то здесь противоречит фазе — побеждает фаза.

### v1 — 2026-06-07 (initial)

Создан из grill-сессии. 12 принципиальных решений, 5 фаз, ~8 ч суммарно. 301 строка.

### v2 — 2026-06-07 (после первого раунда code review)

Два независимых ревью (Plan-agent + general-purpose) нашли 6 препятствий (фактические ошибки путей и API — план был неисполним) + 10 should-fix + 6 расплывчатых acceptance-критериев.

**Препятствия первой волны (B-волна)**:

| # | Проблема | Решение |
|---|---|---|
| B1 | Путь компонента — `src/components/UserPreferencesPage.svelte` | заменено на `src/components/ui/UserPreferencesPage.svelte` (реальный путь) |
| B2 | i18n API в плане — `t('settings.theme')` helper, которого нет в проекте | переписан на `derived store dictionary` с nested snake_case ключами |
| B3 | Базовый `:root` в `src/app.css` не имел `[data-theme="light"]` — contract-тест vacuously satisfied | создан `src/themes/light.css` как полный snapshot базы |
| B4 | `normalizePreferences` не знал о новом поле `theme` — значение молча стиралось | расширены guard, ветка и DEFAULT |
| B5 | Не задавался `color-scheme: light \| dark` — native form controls в дефолте | каждая тема обязана задавать `color-scheme`, источник правды — `colorScheme` в registry |
| B6 | `setTheme()` локация — «или registry.ts, или switch.ts» | зафиксировано в `src/themes/registry.ts` |

**Should-fix первой волны (S-волна)**: boot-reconciliation, `_template.css` в contract-тесте, расширение `Select.svelte` под optgroup, замена hardcoded SVG-стрелки на mask-image, VT API guards (prefers-reduced-motion + concurrent), pin `.storybook/preview.ts`, Firefox VT known limitation, enforcement `design-system.json.themes`, hotkey (был отложен) — Phase 5; i18n convention — nested snake_case.

**Acceptance hardening**: каждый расплывчатый критерий («плавно перетекает», «не выпадает», «без вспышки», «остаются опознаваемыми», «WCAG AA для основных пар») переписан с конкретной процедурой/метрикой.

Размер плана после v2: 493 строки.

### v3 — 2026-06-07 (после второго раунда + продуктовое решение)

Второй раунд ревью подтвердил, что препятствия сняты корректно, но интеграция открыла **исполнительные** дыры: edge-cases async, sync-source без enforcement, browser-quirks, cleanup-patterns. 6 новых препятствий + 6 should-fix + полировки.

**Продуктовое решение пользователя**: **hotkey для переключения тем удалён из плана полностью**. Причины: (1) `Cmd+Shift+T` перехватывается Chrome на browser-level; (2) альтернативы требуют расширения `keyboardMachine` под meta-комбинации, чего модель не поддерживает; (3) функциональная аудитория FlowTyping не имеет сценария «листать темы по hotkey'ю». Phase 5 сужена до preview swatches.

**Препятствия второй волны (R-волна)**:

| # | Проблема | Решение |
|---|---|---|
| R1 | `light.css` ↔ base `:root` дрейф без enforcement | regression-test, парсящий оба источника и сверяющий значения |
| R2 | Двойная запись mirror-key (subscriber + reconciliation) | оставлен только subscriber |
| R3 | `pendingTransition.finished.finally()` unhandled rejection | заменён на `.then(() => {}, () => {})` |
| R5 | `$effect` без cleanup leak'ает matchMedia listener | explicit cleanup pattern |
| R6 | `axe-core` отсутствует прямой dev-dep | контраст через Storybook a11y panel (уже подключён) |

**Should-fix второй волны**: `color-scheme: light` для базового `:root`; stub `"themes": {}` в `design-system.json` для развязки Phase 4 enforcement; inline-script CI-тест через `readFileSync`; `setTheme()` явный stub в Phase 0 + полная реализация в Phase 1; конкретные oklch-значения для dark.css вместо «инвертированные L»; явное упоминание передачи `dictionary` через `MainContent.svelte`.

**Полировки**: browser support floor (Chrome ≥111, Safari ≥18, FF ≥138 — нет `-webkit-` префикса для `mask-image`); TS narrowing pattern для OptionGroup в Svelte template; assertion helper вместо `find()?.x`; `import type` для `ThemeSetting`; Storybook 10 idiom `dynamicTitle`; обоснование порядка inline-script vs `%sveltekit.head%`.

Размер плана после v3: 632 строки. Структурно — две Patches-секции в начале как двойной главенствующий источник параллельно с фазами.

### v4 — 2026-06-07 (после третьего раунда + рефакторинг структуры)

Третий раунд ревью нашёл только мелкие исполнительные нюансы (parser не специфицирован, axe-core orphan-mentions, dark rules vs values inconsistency, stub themes surprise scope) + 5 полировок. Архитектурно план остался solid — три раунда подтвердили основу.

**Изменения третьей волны (T-волна)**:

| # | Проблема | Решение |
|---|---|---|
| T1 | `parseRootTokens()` упомянут как concept, парсер не написан | inline-спецификация ~20-строчного regex-парсера в Phase 0.7 |
| T2 | `axe-core` orphan-mentions в Acceptance v2 и Phase 2 | везде унифицировано на «Storybook a11y panel или DevTools» |
| T3 | Dark.css правила инверсии vs конкретные oklch-значения — численная нестыковка | переформулировано: «правила — ориентир, итоговые значения в snippet'ах главенствующие» |
| T4 | Phase 1.5 stub themes — surprise scope (Phase 1 декларирована как UI, а трогает JSON) | stub `"themes": {}` перенесён в Phase 0.5 рядом с CSS-импортами |
| T5 | Vitest matchMedia mock не упомянут — тесты Phase 1 упадут с `ReferenceError` | добавлен Pre-requisite в Phase 1 с настройкой jsdom + setup-файл |
| T6 | Inline-script без `try/catch` падает в Safari Private Mode | обёрнут в try/catch с matchMedia-fallback |
| T7 | `labelKey` в registry — dead weight (lookup через `dictionary.options.themes[id]`) | удалён из registry; в decision-таблице и в Phase 2 артефактах поправлено |
| T8 | Локальный prop-тип `dictionary` в Phase 1.4 конфликтует с глобальным `Dictionary = typeof en` | удалён manual narrowing; полагаемся на TS-вывод типов |

**Структурный рефакторинг**: две Patches-секции, висевшие наверху, свёрнуты в этот Changelog в конце. Фазы становятся **единственным источником правды**; история ревью сохраняется ниже как audit-trail.

Размер плана после v4: ~640 строк (стабилизировано).

### Acceptance ревью-процесса

Три раунда независимых code review с убывающим хвостом находок:

- Раунд 1: 6 препятствий + 10 should-fix (план неисполним)
- Раунд 2: 6 препятствий + 6 should-fix (план исполним, но с сюрпризами)
- Раунд 3: 0 препятствий + 4 настоящих fix'а + 7 полировок (план implementable, нужна doc hygiene)
- Раунд 4 (если случится) — ожидаемо ≤ 2-3 находок, в основном wording/typo. Останавливаемся.
