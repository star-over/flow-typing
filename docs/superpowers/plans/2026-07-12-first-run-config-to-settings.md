# P0-11(a): тихий стартовый экран + конфиг на /settings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Убрать конфиг-форму из пяти дропдаунов с пути между «Начать тренировку» и первым нажатием: `MenuScreen` сводится к одиночной CTA, шесть тренировочных контролов переезжают на `/settings`.

**Architecture:** Чистый presentation-layer перенос. FSM (`app.machine.ts`) не трогаем — состояние `menu` остаётся, меняется только его UI. Контролы переезжают в `SettingsPage` новой секцией «Тренировка», используя существующие `.field`-идиому, i18n-ключи и контракт-токены. Новый ADR не требуется.

**Tech Stack:** SvelteKit 2 + Svelte 5 (runes), TypeScript strict, i18n через `dictionaries/{en,ru}.json`, Storybook.

**Спека:** `docs/superpowers/specs/2026-07-12-first-run-config-to-settings-design.md`

> **Решение к сверке при ревью плана (hints):** Task 2 рендерит под каждым тренировочным
> контролом пояснение (`<span class="hint">`), используя **уже существующие, но сейчас
> мёртвые** ключи `settings.*_description`. Это (а) идиома самого `SettingsPage` (поле
> `display_name` уже с hint), (б) прямо служит цели — жаргон объясняется там, где теперь
> живёт. Если предпочитаете голые надписи — просто убрать строки `<span class="hint">…</span>`
> из Task 2. Всё остальное от этого не зависит.

---

## Файловая структура

| Файл | Что делаем |
|---|---|
| `dictionaries/en.json` | + ключ `settings.training_group` |
| `dictionaries/ru.json` | + ключ `settings.training_group` |
| `src/components/ui/SettingsPage.svelte` | + секция «Тренировка» (6 контролов, порядок: Имя → Тема → **Тренировка** → «Назад» → danger) |
| `src/components/train/MenuScreen.svelte` | свести к одиночной CTA; удалить 5 `Select` + `SessionDurationSelector` + производные |
| `src/components/app/MainContent.svelte` | `onStart` для `MenuScreen` теперь без аргументов, параметры из `$settings` |
| `docs/plans/2026-07-05-mvp-launch.md` | отметка P0-11 (a) → ✅ |

Storybook-истории `SettingsPage.stories.svelte` менять не нужно: секция «Тренировка» не за auth-гейтом → рендерится во всех существующих историях автоматически (нужен лишь новый ключ словаря из Task 1). У `MenuScreen` истории нет.

---

### Task 1: i18n-ключ секции «Тренировка»

**Files:**
- Modify: `dictionaries/en.json` (секция `settings`)
- Modify: `dictionaries/ru.json` (секция `settings`)

- [ ] **Step 1: Добавить ключ в `en.json`**

В объект `settings` добавить строку сразу после `"session_duration_label": "Session duration",`:

```json
    "training_group": "Training",
```

- [ ] **Step 2: Добавить ключ в `ru.json`**

В объект `settings` добавить строку сразу после `"session_duration_label": "Длительность сессии",`:

```json
    "training_group": "Тренировка",
```

- [ ] **Step 3: Проверить парсинг обоих словарей**

Run: `python3 -c "import json; json.load(open('dictionaries/en.json')); json.load(open('dictionaries/ru.json')); print('ok')"`
Expected: `ok` (валидный JSON, без trailing-comma-ошибок)

- [ ] **Step 4: Commit**

```bash
git add dictionaries/en.json dictionaries/ru.json
git commit -m "feat(i18n): ключ settings.training_group"
```

---

### Task 2: Секция «Тренировка» на /settings

**Files:**
- Modify: `src/components/ui/SettingsPage.svelte`

- [ ] **Step 1: Расширить импорты в `<script>`**

Заменить блок импортов (строки 2-5) на:

```svelte
  import { settings, updateSettings } from '@/lib/settings';
  import Select from './Select.svelte';
  import SessionDurationSelector from '@/components/train/SessionDurationSelector.svelte';
  import { getCompatibleSymbolLayoutsForTextLanguage } from '@/lib/layouts';
  import type {
    Dictionary,
    FingerLayoutId,
    FlowLineCursorType,
    SymbolLayoutId,
    TextLanguage,
  } from '@/interfaces/types';
  import { setTheme, THEMES, type ThemeSetting } from '@/themes/registry';
```

- [ ] **Step 2: Добавить производные списки опций**

Сразу перед закрывающим `</script>` (после блока `themeOptions`, до строки `</script>`) вставить — это дословный перенос из `MenuScreen.svelte`:

```svelte
  const sessionDurationOptions = $derived([
    { seconds: 60, label: dictionary.options.sessionDurations['60'] },
    { seconds: 180, label: dictionary.options.sessionDurations['180'] },
    { seconds: 300, label: dictionary.options.sessionDurations['300'] },
    { seconds: 600, label: dictionary.options.sessionDurations['600'] },
    { seconds: 900, label: dictionary.options.sessionDurations['900'] },
  ]);

  const textLanguages = $derived([
    { value: 'en' as const, label: dictionary.options.textLanguages.en },
    { value: 'ru' as const, label: dictionary.options.textLanguages.ru },
  ]);

  const layoutOptions = $derived(
    getCompatibleSymbolLayoutsForTextLanguage($settings.textLanguage)
      .map(d => ({
        value: d.symbolLayoutId,
        label: dictionary.options.layouts[d.symbolLayoutId],
      }))
  );

  const fingerLayouts = $derived([
    { value: 'asdf' as const, label: dictionary.options.fingerLayouts.asdf },
    { value: 'sdfv' as const, label: dictionary.options.fingerLayouts.sdfv },
  ]);

  const cursorTypes = $derived([
    { value: 'RECTANGLE' as const, label: dictionary.options.cursorTypes.RECTANGLE },
    { value: 'UNDERSCORE' as const, label: dictionary.options.cursorTypes.UNDERSCORE },
    { value: 'VERTICAL' as const, label: dictionary.options.cursorTypes.VERTICAL },
  ]);

  const rhythmChannelOptions = $derived([
    { value: 'on', label: dictionary.options.rhythmChannel.on },
    { value: 'off', label: dictionary.options.rhythmChannel.off },
  ]);
```

- [ ] **Step 3: Вставить разметку секции «Тренировка»**

В шаблоне, **между** блоком поля темы (заканчивается `</label>` после `Select` темы) и `<button ... onclick={onBack}>`, вставить:

```svelte
  <div class="training-section">
    <h3 class="section-heading">{dictionary.settings.training_group}</h3>

    <label class="field">
      <span class="label-text">{dictionary.settings.text_language_label}</span>
      <Select
        value={$settings.textLanguage}
        options={textLanguages}
        onChange={(v) => updateSettings({ textLanguage: v as TextLanguage })}
      />
      <span class="hint">{dictionary.settings.text_language_description}</span>
    </label>

    <label class="field">
      <span class="label-text">{dictionary.settings.symbol_layout_label}</span>
      <Select
        value={$settings.symbolLayoutId}
        options={layoutOptions}
        onChange={(v) => updateSettings({ symbolLayoutId: v as SymbolLayoutId })}
      />
      <span class="hint">{dictionary.settings.symbol_layout_description}</span>
    </label>

    <label class="field">
      <span class="label-text">{dictionary.settings.finger_layout_label}</span>
      <Select
        value={$settings.fingerLayoutId}
        options={fingerLayouts}
        onChange={(v) => updateSettings({ fingerLayoutId: v as FingerLayoutId })}
      />
      <span class="hint">{dictionary.settings.finger_layout_description}</span>
    </label>

    <label class="field">
      <span class="label-text">{dictionary.settings.cursor_type_label}</span>
      <Select
        value={$settings.cursorType}
        options={cursorTypes}
        onChange={(v) => updateSettings({ cursorType: v as FlowLineCursorType })}
      />
      <span class="hint">{dictionary.settings.cursor_type_description}</span>
    </label>

    <label class="field">
      <span class="label-text">{dictionary.settings.rhythm_channel_label}</span>
      <Select
        value={$settings.rhythmChannelEnabled ? 'on' : 'off'}
        options={rhythmChannelOptions}
        onChange={(v) => updateSettings({ rhythmChannelEnabled: v === 'on' })}
      />
      <span class="hint">{dictionary.settings.rhythm_channel_description}</span>
    </label>

    <SessionDurationSelector
      label={dictionary.settings.session_duration_label}
      value={$settings.sessionDurationSeconds}
      options={sessionDurationOptions}
      onChange={(v) => updateSettings({ sessionDurationSeconds: v })}
    />
  </div>
```

- [ ] **Step 4: Добавить стили секции**

В блок `<style>` (после правила `.hint { … }`) добавить — используются существующие токены, новых контракт-токенов нет:

```svelte
  .training-section {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
  }

  .section-heading {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--settings-page-label-color);
  }
```

- [ ] **Step 5: Проверить типы и lint**

Run: `make check`
Expected: 0 ошибок (svelte-check видит согласованные типы; `FingerLayoutId`/`FlowLineCursorType`/`SymbolLayoutId`/`TextLanguage` резолвятся из `@/interfaces/types`).

- [ ] **Step 6: Визуальная проверка в Storybook**

Run: `make storybook`, открыть `UI/SettingsPage` → историю `Guest`.
Expected: под темой видна секция «Training» с шестью контролами (язык текста, раскладка, пальцы, курсор, ритм, длительность-сегменты); каждый с пояснением; danger-зона отсутствует (гость). История `Authenticated` — та же секция + имя + danger.

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/SettingsPage.svelte
git commit -m "feat(settings): секция «Тренировка» — 6 контролов на /settings"
```

---

### Task 3: Свести MenuScreen к CTA + перепроводка старта

**Files:**
- Modify: `src/components/train/MenuScreen.svelte`
- Modify: `src/components/app/MainContent.svelte`

- [ ] **Step 1: Переписать `MenuScreen.svelte` целиком**

Заменить содержимое файла на (tech-debt-заметку сверху сохранить):

```svelte
<!--
  Tech-debt note: MenuScreen намеренно не имеет рядом MenuScreen.contract.ts.
  Компонент пока тонкий и повторно использует существующие токены SettingsPage и
  FooterActions. Когда он стабилизируется — выделить собственные `--menu-screen-*`
  токены и завести контракт на общих условиях (docs/06 §6.2).
  Запись в очереди: docs/backlog.md → «MenuScreen.contract.ts».
-->
<script lang="ts">
  import type { Dictionary } from '@/interfaces/types';

  interface Props {
    dictionary: Dictionary;
    onStart: () => void;
  }

  const { dictionary, onStart }: Props = $props();
</script>

<div class="menu-screen">
  <button type="button" class="start-btn" onclick={onStart}>
    {dictionary.app.start_training}
  </button>
</div>

<style>
  .menu-screen {
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 23rem;
  }

  /* Бренд-янтарная CTA — те же токены, что у primary-CTA лендинга
     (`--landing-cta-*`), чтобы «Начать тренировку» выглядела одинаково на `/`
     и на `/train`. */
  .start-btn {
    width: 100%;
    padding: var(--spacing-3) var(--spacing-4);
    border-radius: var(--radius-3);
    border: var(--landing-cta-border);
    background: var(--landing-cta-background);
    color: var(--landing-cta-color);
    font-family: var(--font-sans);
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
  }

  .start-btn:hover {
    background: var(--landing-cta-hover-background);
  }

  .start-btn:focus-visible {
    outline: 2px solid var(--landing-cta-background);
    outline-offset: 2px;
  }
</style>
```

- [ ] **Step 2: Обновить проводку `onStart` в `MainContent.svelte`**

Найти блок (строки ~83-87):

```svelte
{:else if inState({ snapshot: state, value: 'menu' })}
  <MenuScreen
    {dictionary}
    onStart={({ symbolLayoutId }) => send({ type: 'START_TRAINING', symbolLayoutId, durationSeconds: $settings.sessionDurationSeconds })}
  />
{/if}
```

Заменить на (параметры целиком из `$settings` — единственный источник истины, как в Enter-пути `App.svelte`):

```svelte
{:else if inState({ snapshot: state, value: 'menu' })}
  <MenuScreen
    {dictionary}
    onStart={() => send({ type: 'START_TRAINING', symbolLayoutId: $settings.symbolLayoutId, durationSeconds: $settings.sessionDurationSeconds })}
  />
{/if}
```

- [ ] **Step 3: Проверить типы и lint**

Run: `make check`
Expected: 0 ошибок. Ключевая проверка — сигнатура `onStart: () => void` в `MenuScreen` согласована с вызовом в `MainContent`; никаких «осиротевших» импортов в `MenuScreen` (свелте-check ругается на неиспользуемые).

- [ ] **Step 4: Commit**

```bash
git add src/components/train/MenuScreen.svelte src/components/app/MainContent.svelte
git commit -m "feat(train): MenuScreen — тихий стартовый экран (одна CTA)"
```

---

### Task 4: Финальная проверка, отметка в плане, чистовик

**Files:**
- Modify: `docs/plans/2026-07-05-mvp-launch.md`

- [ ] **Step 1: Полная проверка перед завершением**

Run: `make check-all`
Expected: зелёно — lint + check + test + spell + build + `convex dev --once`. Контракт-тест тем зелёный (новых токенов не добавляли). Spell чистый («Тренировка»/«Training» — обычные слова, в whitelist не идут).

Если `make spell` красный — `/fix-spell` по правилам CLAUDE.md, правописанием по ходу не отвлекаться.

- [ ] **Step 2: Живая проверка `/settings`**

Run: `make dev`, открыть `http://localhost:5173/settings` (доступно гостю — вход не требуется).
Expected: секция «Тренировка» с шестью контролами; смена значения любого списка сохраняется (перезагрузка страницы держит выбор — localStorage). Смена «Язык текста» на `ru` перестраивает список раскладок (поведение перенесено дословно).

- [ ] **Step 3: Отметить P0-11 (a) в плане запуска**

В `docs/plans/2026-07-05-mvp-launch.md`:
- §1 таблица, строка «Продукт / UX»: `**путь до первого нажатия** — меню-настроек всё ещё стоит между CTA и aha (P0-11 (a))` → отметить (a) как ✅ сделано (по образцу соседних ✅-отметок в той же ячейке).
- §2 пункт **P0-11 (a)** (строка 189): в начало абзаца добавить маркер `✅ **Сделано (2026-07-12):**` с одной фразой — «MenuScreen сведён к одиночной CTA; шесть тренировочных контролов переехали на /settings новой секцией «Тренировка»; FSM не тронут, ADR не потребовался». Статус пункта **(d)** не трогать — остаётся открытым.

- [ ] **Step 4: Commit отметки в плане**

```bash
git add docs/plans/2026-07-05-mvp-launch.md
git commit -m "docs(plan): P0-11(a) — сделано"
```

- [ ] **Step 5: Завершение ветки**

Использовать skill `superpowers:finishing-a-development-branch`: merge `feat/p0-11-a-first-run-flow` в `master` + удаление ветки. Push — за владельцем (ahead-count не докладывать).

---

## Заметки для исполнителя

- **Ничего в FSM/машине не меняется** — если ловите себя на правке `app.machine.ts`, остановитесь: это выход за рамки Варианта A (потребовал бы ADR).
- **Новых контракт-токенов нет.** Если `src/themes/contract.test.ts` покраснел — значит где-то добавлен новый `var(--…)`, которого нет в контракте; вернитесь к существующим `--settings-page-*` / `--select-*` / `--landing-cta-*`.
- **`SessionDurationSelector`** переезжает импортом (`@/components/train/…`), сам компонент не трогаем.
- **Логику совместимости** «язык текста → раскладки» (`getCompatibleSymbolLayoutsForTextLanguage`) переносим дословно; поведение (смена языка не автопереключает раскладку) сохраняется — это не баг для починки в этой задаче.
