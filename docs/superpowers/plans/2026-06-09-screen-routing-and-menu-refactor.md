# Screen Routing & Menu Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Разделить навигацию (роуты) и бизнес-процесс (FSM): `/stats` и `/settings` — настоящие SvelteKit-роуты, FSM моделирует только цикл тренировки `menu → training → sessionComplete`. Элементы управления языка и раскладки переезжают из настроек в меню как pre-flight, превью drill'а нет (тотальный lazy). `?exerciseId=` удаляется полностью. Терминология `preferences` зачищается в пользу `settings` codebase-wide.

**Architecture:** `appActor` (singleton) и keyboard listener поднимаются в `+layout.svelte`, переживая навигацию между роутами. Header — nav-chrome (всегда виден, содержит ссылки на `/settings` и `/stats`). Footer — process-controls (виден только во время training/sessionComplete). `/` размещает FSM-views (`MenuScreen` → `TrainingScene` → `LessonStatsDisplay`). `/settings` и `/stats` — отдельные страницы.

**Tech Stack:** SvelteKit 2 + Svelte 5 (runes), XState v5, Vitest, TypeScript strict, CSS via per-component contracts.

---

## File Structure

**Создаются:**
- `src/routes/settings/+page.svelte`
- `src/routes/stats/+page.svelte`
- `src/components/ui/SettingsPage.svelte` (фактическое переименование `UserPreferencesPage.svelte` с упрощённым содержимым)
- `src/components/ui/MenuScreen.svelte`

**Переименовываются:**
- `src/lib/preferences.ts` → `src/lib/settings.ts`
- `src/lib/preferences.test.ts` → `src/lib/settings.test.ts`
- `src/interfaces/user-preferences.ts` → `src/interfaces/user-settings.ts`
- `src/user-preferences/` → `src/user-settings/` (с файлом внутри)
- `src/components/ui/UserPreferencesPage.contract.ts` → `src/components/ui/SettingsPage.contract.ts`

**Удаляются:**
- `src/lib/exercise-id-sync.ts` + `.test.ts`
- `src/components/ui/UserPreferencesPage.svelte`
- Поле `shared` в `UserSettings`
- Токен `--main-content-welcome-color`
- Ключ `app.welcome` в словарях

**Модифицируются:**
- `src/machines/app.machine.ts` — удалены `settings`/`allStat` состояния и события; `trainingComplete` → `sessionComplete`
- `src/machines/app.machine.test.ts`, `src/machines/training.machine.ts`, `src/machines/training.machine.test.ts`
- `src/components/app/App.svelte` — упрощается до `<MainContent />` + `<FooterActions />`
- `src/components/app/Header.svelte` — nav-chrome
- `src/components/app/MainContent.svelte` — добавлена ветка `MenuScreen`, удалены `settings`, `allStat`, `welcome`
- `src/components/app/FooterActions.svelte` — process-only, скрывается на `menu`
- `src/components/app/MainContent.contract.ts` — удалён `--main-content-welcome-color`
- `src/routes/+layout.svelte` — размещает `appActor`, keyboard listener, Header, theme effects
- `src/themes/registry.ts` — `preferences` → `settings`
- `src/themes/contract.ts` — переименован импорт
- 5 файлов тем (`_template.css`, `light.css`, `dark.css`, `sepia.css`, `nord.css`) — `--user-preferences-page-*` → `--settings-page-*`, удалён `--main-content-welcome-color`
- `dictionaries/en.json` + `dictionaries/ru.json` — ключ `user_preferences` → `settings`, `app.lesson_complete` → `app.session_complete`, удалён `app.welcome`
- `CLAUDE.md` — пути после переименования
- `src/app.html` — комментарий с reference на `settings.ts`

---

## Order of execution

```
0.  Rename preferences → settings codebase-wide
1.  Remove ?exerciseId=
2.  Rename trainingComplete → sessionComplete
3.  Lift appActor + keyboard + Header to +layout.svelte
4.  Create /stats route placeholder
5.  /settings route + SettingsPage + Header nav-chrome + strip footer Settings/Stats + delete UserPreferencesPage   (MERGED)
6.  Create MenuScreen (controlled tech debt: no contract until crystallizes)
7.  Wire MenuScreen + remove Start from FooterActions on menu     (MERGED with allStat-branch removal from MainContent)
8.  Remove FSM `settings` state
9.  Remove FSM `allStat` state
10. i18n + contracts cleanup
```

Tasks 5 и 7 — единые merged-коммиты. Tasks 5 потому что Header.svelte ссылается на `/settings`, который должен существовать в том же коммите (типизированный `resolve()` в SvelteKit 2.26+ упадёт на typecheck'е, если роута нет). Tasks 7 потому что MenuScreen.Start и FooterActions.Start не должны сосуществовать на меню даже один коммит.

---

## Task 0: Переименовать `preferences` → `settings` codebase-wide

**Files:**
- Rename: `src/lib/preferences.ts` → `src/lib/settings.ts`
- Rename: `src/lib/preferences.test.ts` → `src/lib/settings.test.ts`
- Rename: `src/interfaces/user-preferences.ts` → `src/interfaces/user-settings.ts`
- Rename: `src/user-preferences/` → `src/user-settings/` (+ файл внутри)
- Rename: `src/components/ui/UserPreferencesPage.contract.ts` → `src/components/ui/SettingsPage.contract.ts`
- Modify: `src/lib/settings.ts`
- Modify: `src/lib/settings.test.ts`
- Modify: `src/interfaces/user-settings.ts`
- Modify: `src/user-settings/user-settings.ts`
- Modify: `src/components/ui/SettingsPage.contract.ts`
- Modify: `src/themes/contract.ts`
- Modify: `src/themes/registry.ts` ← **ВАЖНО, легко пропустить**
- Modify: `src/themes/_template.css`, `light.css`, `dark.css`, `sepia.css`, `nord.css`
- Modify: `src/components/ui/UserPreferencesPage.svelte` (имя файла пока сохраняется, переименовывается в Task 5)
- Modify: `src/components/app/App.svelte`
- Modify: `src/routes/+layout.svelte` ← **ВАЖНО, легко пропустить**
- Modify: `src/lib/i18n.ts`
- Modify: `src/machines/training.machine.test.ts`
- Modify: `dictionaries/en.json`, `dictionaries/ru.json`
- Modify: `CLAUDE.md`
- Modify: `src/app.html`

**Замечания:**
- `STORAGE_KEY = 'flow-typing-user-preferences'` НЕ переименовывается — это back-compat контракт с уже существующими пользователями. Комментарий в новом `settings.ts` это поясняет.
- Между Task 0 и Task 5 файл `SettingsPage.contract.ts` лежит рядом с `UserPreferencesPage.svelte`. Это временное нарушение конвенции «contract рядом с компонентом», устраняется в Task 5 при переименовании компонента. Контракт-тест (`src/themes/contract.test.ts`) этого не enforce'ит — он проверяет только покрытие токенов в темах.
- `docs/04-settings-management-system.md` тоже содержит `preferences`-терминологию (~25 вхождений). Перечитка дока — **вне scope этого PR**, см. «Что дальше».

- [ ] **Step 1: Переименовать файлы и директорию через git mv**

Порядок важен: сначала директорию, потом файлы внутри.

```bash
cd /Users/belan/PROJECTS/flow-typing
git mv src/lib/preferences.ts src/lib/settings.ts
git mv src/lib/preferences.test.ts src/lib/settings.test.ts
git mv src/interfaces/user-preferences.ts src/interfaces/user-settings.ts
git mv src/user-preferences src/user-settings
git mv src/user-settings/user-preferences.ts src/user-settings/user-settings.ts
git mv src/components/ui/UserPreferencesPage.contract.ts src/components/ui/SettingsPage.contract.ts
```

- [ ] **Step 2: Переписать `src/interfaces/user-settings.ts`**

```ts
import type {
  InterfaceLanguage,
  SymbolLayoutId,
  TextLanguage,
} from '@/interfaces/types';
import type { ThemeSetting } from '@/themes/registry';

/**
 * Структура пользовательских настроек.
 * - `interfaceLanguage` — язык UI (меню, словари).
 * - `textLanguage` — язык упражнений (первичная ось выбора в настройках,
 *   определяет какие drill'ы попадают в тренировку, какие раскладки доступны).
 * - `symbolLayoutId` — выбранная пользователем раскладка (производное от textLanguage).
 * - `theme` — визуальная тема: либо конкретный `ThemeId`, либо `'auto'` (следует за системным
 *   `prefers-color-scheme`). Зеркалится отдельным ключом `flow-typing-theme` для FOUC-free bootstrap.
 */
export interface UserSettings {
  interfaceLanguage: InterfaceLanguage;
  textLanguage: TextLanguage;
  symbolLayoutId: SymbolLayoutId;
  theme: ThemeSetting;
  shared: {
    exerciseId?: string;
  };
}
```

(Поле `shared` уйдёт в Task 1.)

- [ ] **Step 3: Переписать `src/user-settings/user-settings.ts`**

```ts
import type { UserSettings } from '@/interfaces/user-settings';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  interfaceLanguage: 'en',
  textLanguage: 'en',
  symbolLayoutId: 'qwerty',
  theme: 'auto',
  shared: {},
};
```

- [ ] **Step 4: Переписать `src/lib/settings.ts`**

```ts
import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import {
  INTERFACE_LANGUAGES,
  SYMBOL_LAYOUT_IDS,
  TEXT_LANGUAGES,
  type InterfaceLanguage,
  type SymbolLayoutId,
  type TextLanguage,
} from '@/interfaces/types';
import type { UserSettings } from '@/interfaces/user-settings';
import { DEFAULT_USER_SETTINGS } from '@/user-settings/user-settings';
import {
  getCompatibleSymbolLayoutsForTextLanguage,
  getDefaultSymbolLayoutForTextLanguage,
} from '@/lib/layouts';
import { isThemeSetting, type ThemeSetting } from '@/themes/registry';

// localStorage-ключ намеренно сохранён со старым именем `flow-typing-user-preferences`
// — это публичный контракт с уже существующими пользователями, переименовывать его
// нельзя без миграции.
const STORAGE_KEY = 'flow-typing-user-preferences';
const THEME_STORAGE_KEY = 'flow-typing-theme';

function isInterfaceLanguage(v: unknown): v is InterfaceLanguage {
  return typeof v === 'string' && (INTERFACE_LANGUAGES as readonly string[]).includes(v);
}
function isTextLanguage(v: unknown): v is TextLanguage {
  return typeof v === 'string' && (TEXT_LANGUAGES as readonly string[]).includes(v);
}
function isSymbolLayoutId(v: unknown): v is SymbolLayoutId {
  return typeof v === 'string' && (SYMBOL_LAYOUT_IDS as readonly string[]).includes(v);
}

function isSymbolLayoutCompatibleWithTextLanguage({
  symbolLayoutId,
  textLanguage,
}: {
  symbolLayoutId: SymbolLayoutId;
  textLanguage: TextLanguage;
}): boolean {
  return getCompatibleSymbolLayoutsForTextLanguage(textLanguage)
    .some(d => d.symbolLayoutId === symbolLayoutId);
}

/**
 * Приводит произвольное содержимое localStorage к валидному UserSettings,
 * заполняя пропуски по каскаду interfaceLanguage → textLanguage → symbolLayoutId.
 * Legacy ключи (например, старый `language`) игнорируются.
 */
export function normalizeSettings(raw: unknown): UserSettings {
  const stored = (raw ?? {}) as Record<string, unknown>;

  const interfaceLanguage = isInterfaceLanguage(stored.interfaceLanguage)
    ? stored.interfaceLanguage
    : DEFAULT_USER_SETTINGS.interfaceLanguage;

  const textLanguage: TextLanguage = isTextLanguage(stored.textLanguage)
    ? stored.textLanguage
    : interfaceLanguage;

  const candidate = isSymbolLayoutId(stored.symbolLayoutId) ? stored.symbolLayoutId : undefined;
  const symbolLayoutId: SymbolLayoutId =
    candidate &&
    isSymbolLayoutCompatibleWithTextLanguage({ symbolLayoutId: candidate, textLanguage })
      ? candidate
      : getDefaultSymbolLayoutForTextLanguage(textLanguage).symbolLayoutId;

  const shared =
    typeof stored.shared === 'object' && stored.shared !== null
      ? (stored.shared as UserSettings['shared'])
      : {};

  const theme: ThemeSetting = isThemeSetting(stored.theme)
    ? stored.theme
    : DEFAULT_USER_SETTINGS.theme;

  return { interfaceLanguage, textLanguage, symbolLayoutId, theme, shared };
}

function safeJsonParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return null; }
}

function createSettingsStore() {
  const load = (): UserSettings => {
    if (!browser) return { ...DEFAULT_USER_SETTINGS };
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? safeJsonParse(raw) : null;
    return normalizeSettings(parsed);
  };

  const store = writable<UserSettings>(load());

  store.subscribe((value) => {
    if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  });

  store.subscribe((value) => {
    if (browser) localStorage.setItem(THEME_STORAGE_KEY, value.theme);
  });

  return {
    subscribe: store.subscribe,
    update: (fn: (current: UserSettings) => UserSettings) =>
      store.update(current => normalizeSettings(fn(current))),
    set: (value: UserSettings) => store.set(normalizeSettings(value)),
  };
}

export const settings = createSettingsStore();

export function updateSettings(partial: Partial<UserSettings>) {
  settings.update((current) => ({ ...current, ...partial }));
}
```

- [ ] **Step 5: Переписать `src/lib/settings.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { normalizeSettings } from './settings';

describe('normalizeSettings', () => {
  it('пустой объект → каскад дефолтов', () => {
    const result = normalizeSettings({});
    expect(result).toEqual({
      interfaceLanguage: 'en',
      textLanguage: 'en',
      symbolLayoutId: 'qwerty',
      theme: 'auto',
      shared: {},
    });
  });

  it('null → каскад дефолтов', () => {
    expect(normalizeSettings(null)).toEqual({
      interfaceLanguage: 'en',
      textLanguage: 'en',
      symbolLayoutId: 'qwerty',
      theme: 'auto',
      shared: {},
    });
  });

  it('частичный: только textLanguage → подставляется дефолтная раскладка', () => {
    const result = normalizeSettings({ textLanguage: 'ru' });
    expect(result.interfaceLanguage).toBe('en');
    expect(result.textLanguage).toBe('ru');
    expect(result.symbolLayoutId).toBe('йцукен');
  });

  it('полный совместимый → как есть', () => {
    const input = {
      interfaceLanguage: 'ru',
      textLanguage: 'ru',
      symbolLayoutId: 'йцукен',
      theme: 'dark',
      shared: { exerciseId: 'x' },
    };
    expect(normalizeSettings(input)).toEqual(input);
  });

  it('мусор в theme игнорируется и подставляется дефолт', () => {
    const result = normalizeSettings({ theme: 'neon' });
    expect(result.theme).toBe('auto');
  });

  it('несовместимая пара textLanguage=ru + symbolLayoutId=qwerty → сброс раскладки', () => {
    const result = normalizeSettings({
      interfaceLanguage: 'ru',
      textLanguage: 'ru',
      symbolLayoutId: 'qwerty',
    });
    expect(result.symbolLayoutId).toBe('йцукен');
  });

  it('legacy `language` поле игнорируется (не читается как interfaceLanguage)', () => {
    const result = normalizeSettings({
      language: 'ru',
      symbolLayoutId: 'йцукен',
    });
    expect(result.interfaceLanguage).toBe('en');
    expect(result.textLanguage).toBe('en');
    expect(result.symbolLayoutId).toBe('qwerty');
  });

  it('мусор в textLanguage игнорируется и подставляется дефолт', () => {
    const result = normalizeSettings({ textLanguage: 'de' });
    expect(result.textLanguage).toBe('en');
  });
});
```

- [ ] **Step 6: Переписать `src/lib/i18n.ts`**

```ts
import { settings } from './settings';
import { derived } from 'svelte/store';
import en from '../../dictionaries/en.json';
import ru from '../../dictionaries/ru.json';

const dictionaries = { en, ru } as const;

export const dictionary = derived(settings, ($s) => dictionaries[$s.interfaceLanguage]);
```

- [ ] **Step 7: Переписать `src/components/ui/SettingsPage.contract.ts`**

```ts
/**
 * Theme contract for SettingsPage.svelte.
 *
 * Контракт-тест в `src/themes/contract.test.ts` проверяет, что каждая
 * тема декларирует токены из этого списка.
 *
 * SettingsPage — экран настроек со списком полей и кнопкой возврата.
 * Кнопка-back имеет собственный набор токенов, отдельный от кнопок
 * FooterActions — у компонента свой контракт.
 */
export const SETTINGS_PAGE_CONTRACT = [
  '--settings-page-label-color',         // color подписи поля
  '--settings-page-btn-background',      // background кнопки back
  '--settings-page-btn-color',           // color текста кнопки back
  '--settings-page-btn-border',          // border кнопки back
  '--settings-page-btn-hover-background',// background кнопки back на :hover
] as const satisfies readonly `--${string}`[];

export type SettingsPageContractToken = (typeof SETTINGS_PAGE_CONTRACT)[number];
```

- [ ] **Step 8: Обновить `src/themes/contract.ts`**

Заменить импорт (line 11):
```ts
import { SETTINGS_PAGE_CONTRACT } from '@/components/ui/SettingsPage.contract';
```

Заменить spread:
```ts
  ...SETTINGS_PAGE_CONTRACT,
```

- [ ] **Step 9: Обновить `src/themes/registry.ts`**

Прочитать текущий файл. Внести минимальные изменения:

Заменить (line 1):
```ts
import { settings } from '@/lib/settings';
```

В JSDoc (line ~28):
```
 * Значение поля `UserSettings.theme`. Включает sentinel-значение `'auto'`,
```

В `setTheme` (line ~72):
```ts
    settings.update((current) => ({ ...current, theme: setting }));
```

- [ ] **Step 10: Обновить `src/routes/+layout.svelte`**

В верхнем `<script>` (current line 3) заменить:
```ts
import { settings } from '@/lib/settings';
```

Заменить (current line 9):
```ts
const lang = $settings.interfaceLanguage;
```

(Файл будет полностью переписан в Task 3 — здесь делаем минимальный фикс компиляции.)

- [ ] **Step 11: Переименовать токены в темах**

В каждом из файлов `src/themes/_template.css`, `light.css`, `dark.css`, `sepia.css`, `nord.css` заменить блок:

```css
  /* UserPreferencesPage */
  --user-preferences-page-label-color         : ...
  --user-preferences-page-btn-background      : ...
  --user-preferences-page-btn-color           : ...
  --user-preferences-page-btn-border          : ...
  --user-preferences-page-btn-hover-background: ...
```

на:
```css
  /* SettingsPage */
  --settings-page-label-color         : <та же правая часть>
  --settings-page-btn-background      : <та же правая часть>
  --settings-page-btn-color           : <та же правая часть>
  --settings-page-btn-border          : <та же правая часть>
  --settings-page-btn-hover-background: <та же правая часть>
```

(Меняются только секционный комментарий и имена токенов. Значения сохраняются.)

- [ ] **Step 12: Обновить `UserPreferencesPage.svelte`**

Файл пока сохраняет старое имя — переименовывается в Task 5. Сейчас правим только идентификаторы / токены / dictionary-ключи внутри файла.

Импорты:
```ts
import { settings, updateSettings } from '@/lib/settings';
import Select from './Select.svelte';
import type { UserSettings } from '@/interfaces/user-settings';
```

В скрипте:
- `$preferences` → `$settings` (везде)
- `updatePreferences(...)` → `updateSettings(...)` (везде)
- `UserPreferences['...']` → `UserSettings['...']` (везде)
- `dictionary.user_preferences.theme_group_light` → `dictionary.settings.theme_group_light`
- `dictionary.user_preferences.theme_group_dark` → `dictionary.settings.theme_group_dark`

В разметке заменить все `dictionary.user_preferences.<X>` на `dictionary.settings.<X>`.

В стилях:
- `--user-preferences-page-label-color` → `--settings-page-label-color`
- `--user-preferences-page-btn-border` → `--settings-page-btn-border`
- `--user-preferences-page-btn-background` → `--settings-page-btn-background`
- `--user-preferences-page-btn-color` → `--settings-page-btn-color`
- `--user-preferences-page-btn-hover-background` → `--settings-page-btn-hover-background`

- [ ] **Step 13: Обновить `src/components/app/App.svelte`**

Минимальный фикс компиляции — этот файл также будет полностью переписан в Task 3, мы лишь не даём ему сломать сборку между Task 0 и Task 3.

Заменить импорт:
```ts
import { settings } from '@/lib/settings';
```

Заменить все `$preferences` → `$settings` и `preferences.update(...)` → `settings.update(...)`.

Обновить комментарий (~line 76):
```ts
// Синхронизация `data-theme` с settings. ...
```

- [ ] **Step 14: Обновить `src/machines/training.machine.test.ts`**

Заменить (line 5):
```ts
import type { UserSettings } from '@/interfaces/user-settings';
```

И (line 20):
```ts
symbolLayoutId: UserSettings['symbolLayoutId'] = 'qwerty'
```

- [ ] **Step 15: Обновить словари**

В `dictionaries/en.json` найти блок `"user_preferences": { ... }`. Переименовать ключ на `"settings"`. Содержимое внутри блока (включая `"title": "User Preferences"`) оставить как есть.

В `dictionaries/ru.json` — аналогично для блока `"user_preferences"` → `"settings"`.

- [ ] **Step 16: Обновить `src/app.html`**

Найти комментарий со ссылкой на `src/lib/preferences.ts` (~line 14). Заменить путь на `src/lib/settings.ts`.

- [ ] **Step 17: Обновить `CLAUDE.md`**

Строка ~82 — поправить путь и фактически неточное упоминание `deepMerge` (реально код использует `normalizeSettings`):
```
- `src/lib/settings.ts` — writable store; грузится из `localStorage['flow-typing-user-preferences']` через `normalizeSettings` поверх `DEFAULT_USER_SETTINGS` (чтобы новые поля корректно догружались у старых пользователей, неизвестные — игнорировались). Любой `update`/`set` сохраняется обратно.
```

Строка ~83 — поправить путь:
```
- Метаданные настроек (тип, дефолты, опции) — `src/user-settings/user-settings.ts`.
```

Строка ~63 — поправить упоминание типа:
```
... `UserSettings.symbolLayoutId` ...
```

- [ ] **Step 18: Прогрепать остатки**

```bash
grep -rn "UserPreferences\|user_preferences\|user-preferences-page\|@/lib/preferences\|DEFAULT_USER_PREFERENCES\|normalizePreferences\|updatePreferences\|USER_PREFERENCES_PAGE_CONTRACT" src/ dictionaries/ CLAUDE.md
```

Expected: пусто, кроме:
- Значения константы `STORAGE_KEY = 'flow-typing-user-preferences'` в `src/lib/settings.ts`
- Сопровождающего back-compat комментария там же

```bash
grep -rn "from '@/user-preferences" src/
grep -rn "preferences-page" src/themes/
```

Должны быть пусты.

- [ ] **Step 19: Прогнать тесты + полный чек**

Run: `make test` → PASS
Run: `make check-all` → PASS

- [ ] **Step 20: Commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
refactor: rename preferences → settings codebase-wide

Single dictionary key, single store name, single type, single contract
file — terminology no longer drifts between layers. localStorage key
itself is preserved as `flow-typing-user-preferences` for backward
compatibility with existing users.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 1: Удалить `?exerciseId=` целиком

**Files:**
- Delete: `src/lib/exercise-id-sync.ts` + `src/lib/exercise-id-sync.test.ts`
- Modify: `src/interfaces/user-settings.ts`, `src/user-settings/user-settings.ts`, `src/lib/settings.ts`, `src/lib/settings.test.ts`, `src/components/app/App.svelte`

- [ ] **Step 1: Удалить `shared` из типа `UserSettings`**

В `src/interfaces/user-settings.ts`:
```ts
export interface UserSettings {
  interfaceLanguage: InterfaceLanguage;
  textLanguage: TextLanguage;
  symbolLayoutId: SymbolLayoutId;
  theme: ThemeSetting;
}
```

- [ ] **Step 2: Удалить `shared` из `DEFAULT_USER_SETTINGS`**

В `src/user-settings/user-settings.ts`:
```ts
export const DEFAULT_USER_SETTINGS: UserSettings = {
  interfaceLanguage: 'en',
  textLanguage: 'en',
  symbolLayoutId: 'qwerty',
  theme: 'auto',
};
```

- [ ] **Step 3: Удалить обработку `shared` в `normalizeSettings`**

В `src/lib/settings.ts` удалить:
```ts
  const shared =
    typeof stored.shared === 'object' && stored.shared !== null
      ? (stored.shared as UserSettings['shared'])
      : {};
```

Return:
```ts
  return { interfaceLanguage, textLanguage, symbolLayoutId, theme };
```

- [ ] **Step 4: Обновить тесты `settings.test.ts`**

Убрать `shared: {}` и `shared: { exerciseId: 'x' }` из всех expect-объектов.

"полный совместимый":
```ts
it('полный совместимый → как есть', () => {
  const input = {
    interfaceLanguage: 'ru',
    textLanguage: 'ru',
    symbolLayoutId: 'йцукен',
    theme: 'dark',
  };
  expect(normalizeSettings(input)).toEqual(input);
});
```

В "пустой объект" и "null" убрать `shared: {}` из ожидаемого.

- [ ] **Step 5: Удалить exercise-id-sync файлы**

```bash
git rm src/lib/exercise-id-sync.ts src/lib/exercise-id-sync.test.ts
```

- [ ] **Step 6: Убрать sync-блок и импорт из `App.svelte`**

Открыть `src/components/app/App.svelte`. Удалить:
- Импорт `planExerciseIdSync`
- Импорты `page` (из `$app/state`) и `goto` (из `$app/navigation`), если они использовались только в sync-блоке
- Весь `$effect` блок sync (от `let hasSyncedFromUrl` до закрывающей `});`)

- [ ] **Step 7: Тесты + чек + commit**

```bash
make test && make check-all
git add -A
git commit -m "$(cat <<'EOF'
refactor: remove ?exerciseId= URL sync entirely

Adaptive trainer picks drills internally; URL-locking a specific
exercise contradicts the Dynamic Flow philosophy.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Переименовать `trainingComplete` → `sessionComplete`, `TRAINING.COMPLETE` → `SESSION.COMPLETE`

**Files:**
- Modify: `src/machines/app.machine.ts`, `src/machines/app.machine.test.ts`, `src/machines/training.machine.ts`, `src/machines/training.machine.test.ts`, `src/components/app/MainContent.svelte`, `dictionaries/en.json`, `dictionaries/ru.json`, `cspell.json` (если потребуется)

- [ ] **Step 1: `training.machine.ts`**

Action `sendLessonComplete` → `sendSessionComplete`, тип события `'TRAINING.COMPLETE'` → `'SESSION.COMPLETE'`, entry в state `lessonComplete` обновляется. Внутренний state `lessonComplete` остаётся под этим именем (не leak'ает наружу).

- [ ] **Step 2: `app.machine.ts`**

В `AppEvent`:
```ts
| { type: 'SESSION.COMPLETE'; stream: TypingStream }
```

В `on:` (top-level и внутри `training`) и в `target:` заменить `TRAINING.COMPLETE`/`trainingComplete` → `SESSION.COMPLETE`/`sessionComplete`.

Переименовать state-блок `trainingComplete: { ... }` → `sessionComplete: { ... }`.

- [ ] **Step 3: Тесты — `app.machine.test.ts`**

Заменить во всём файле:
- `'TRAINING.COMPLETE'` → `'SESSION.COMPLETE'`
- `trainingComplete` → `sessionComplete`
- `describe('TRAINING.COMPLETE', ...)` → `describe('SESSION.COMPLETE', ...)`
- `describe('trainingComplete transitions', ...)` → `describe('sessionComplete transitions', ...)`
- `arriveInTrainingComplete` → `arriveInSessionComplete`
- Текстовые описания тестов обновить аналогично.

- [ ] **Step 4: Тесты — `training.machine.test.ts`**

`'TRAINING.COMPLETE'` → `'SESSION.COMPLETE'` + описание теста "sends TRAINING.COMPLETE to parent" → "sends SESSION.COMPLETE to parent".

- [ ] **Step 5: `MainContent.svelte`**

Обновить комментарий ("экран trainingComplete пуст" → "экран sessionComplete пуст") и ветку:
```svelte
{:else if inState({ snapshot: state, value: 'sessionComplete' }) && lessonStats}
```

- [ ] **Step 6: Словари**

`dictionaries/en.json`:
```json
"session_complete": "Session Complete!",
```
(вместо `"lesson_complete": "Lesson Complete!"`)

`dictionaries/ru.json`:
```json
"session_complete": "Сессия завершена!",
```

- [ ] **Step 7: cspell**

`make spell`. Если ругается на «Сессия» — добавить в `cspell.json` → `words`.

- [ ] **Step 8: Тесты + чек + commit**

```bash
make test && make check-all
git add -A
git commit -m "$(cat <<'EOF'
refactor(machines): rename trainingComplete → sessionComplete

Aligns FSM language with the session-oriented mental model where a
single session encompasses many internal drills. Event TRAINING.COMPLETE
also renamed to SESSION.COMPLETE for consistency.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Поднять `appActor`, keyboard listener и theme effects в `+layout.svelte`

**Files:**
- Modify: `src/routes/+layout.svelte` (полная замена)
- Modify: `src/components/app/App.svelte` (упрощение)

- [ ] **Step 1: Переписать `+layout.svelte`**

```svelte
<script lang="ts">
  import '../app.css';
  import { appActor } from '@/machines/appActor';
  import { dictionary } from '@/lib/i18n';
  import { settings } from '@/lib/settings';
  import { inState } from '@/lib/state-utils';
  import { resolveTheme } from '@/themes/registry';
  import { browser } from '$app/environment';
  import { on } from 'svelte/events';
  import { onDestroy } from 'svelte';
  import { isKnownKeyCapId } from '@/interfaces/key-cap-id';

  import Header from '@/components/app/Header.svelte';

  const { children } = $props();

  let state = $state(appActor.getSnapshot());
  const actorSub = appActor.subscribe((snapshot) => {
    state = snapshot;
  });
  onDestroy(() => actorSub.unsubscribe());

  function handleKeyDown(event: KeyboardEvent) {
    if (!isKnownKeyCapId(event.code)) return;
    if (inState({ snapshot: state, value: 'training' }) && event.code === 'Space') {
      event.preventDefault();
    }
    appActor.send({ type: 'KEY_DOWN', keyCapId: event.code });
  }

  function handleKeyUp(event: KeyboardEvent) {
    if (!isKnownKeyCapId(event.code)) return;
    appActor.send({ type: 'KEY_UP', keyCapId: event.code });
  }

  function handleBlur() {
    appActor.send({ type: 'PAUSE' });
  }

  $effect(() => {
    const lang = $settings.interfaceLanguage;
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  });

  $effect(() => {
    if (!browser) return;
    document.documentElement.dataset.theme = resolveTheme($settings.theme);
  });

  $effect(() => {
    if (!browser) return;
    if ($settings.theme !== 'auto') return;
    const mq = matchMedia('(prefers-color-scheme: dark)');
    return on(mq, 'change', () => {
      document.documentElement.dataset.theme = resolveTheme('auto');
    });
  });
</script>

<svelte:window
  onkeydown={handleKeyDown}
  onkeyup={handleKeyUp}
  onblur={handleBlur}
/>

<div class="app-container">
  <Header
    title={$dictionary.app.title}
    appStateLabel={$dictionary.app.app_state}
    appStateValue={JSON.stringify(state.value)}
  />

  <main class="main">
    {@render children()}
  </main>
</div>

<style>
  .app-container {
    font-family: var(--font-sans);
    display: grid;
    grid-template-rows: auto 1fr auto;
    align-items: center;
    justify-items: center;
    min-height: 100vh;
    padding: var(--spacing-8);
    gap: var(--spacing-8);
  }

  .main {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-4);
    align-items: center;
    width: 100%;
  }
</style>
```

- [ ] **Step 2: Упростить `App.svelte`**

```svelte
<script lang="ts">
  import { appActor } from '@/machines/appActor';
  import type { trainingMachine } from '@/machines/training.machine';
  import type { Actor } from 'xstate';

  import { dictionary } from '@/lib/i18n';
  import { settings } from '@/lib/settings';
  import { onDestroy } from 'svelte';

  import MainContent from './MainContent.svelte';
  import FooterActions from './FooterActions.svelte';

  let state = $state(appActor.getSnapshot());
  const actorSub = appActor.subscribe((snapshot) => {
    state = snapshot;
  });
  onDestroy(() => actorSub.unsubscribe());

  const trainingActor = $derived(
    state.children.trainingService as Actor<typeof trainingMachine> | undefined
  );
</script>

<MainContent
  {state}
  send={appActor.send.bind(appActor)}
  dictionary={$dictionary}
  {trainingActor}
/>

<FooterActions
  {state}
  send={appActor.send.bind(appActor)}
  dictionary={$dictionary}
  symbolLayoutId={$settings.symbolLayoutId}
/>
```

- [ ] **Step 3: Визуальная проверка + чек + commit**

```bash
make dev   # проверить меню/тренировку/sessionComplete
make check-all
git add -A
git commit -m "$(cat <<'EOF'
refactor(routing): lift appActor and keyboard listener into +layout

Prepares for multi-route architecture: appActor singleton and keyboard
events now live in the persistent layout, surviving navigation between
upcoming /settings and /stats routes.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Создать `/stats` роут как placeholder

**Files:**
- Create: `src/routes/stats/+page.svelte`

- [ ] **Step 1: Создать роут**

```bash
mkdir -p src/routes/stats
```

`src/routes/stats/+page.svelte`:

```svelte
<script lang="ts">
  import { dictionary } from '@/lib/i18n';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
</script>

<div class="stats-page">
  <h2 class="screen-title">{$dictionary.app.stats_screen_title}</h2>
  <button type="button" class="btn" onclick={() => goto(resolve('/'))}>
    {$dictionary.settings.back_button}
  </button>
</div>

<style>
  .stats-page {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-6);
  }

  .screen-title {
    font-size: 1.5rem;
    font-weight: 700;
  }

  .btn {
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: var(--radius-3);
    border: var(--settings-page-btn-border);
    background: var(--settings-page-btn-background);
    color: var(--settings-page-btn-color);
    cursor: pointer;
  }

  .btn:hover {
    background: var(--settings-page-btn-hover-background);
  }
</style>
```

- [ ] **Step 2: Визуальная проверка + чек + commit**

```bash
make dev   # /stats — заголовок + Back, Back → /
make check-all
git add -A
git commit -m "$(cat <<'EOF'
feat(routing): introduce /stats route as placeholder

Aggregate user statistics will eventually live here. Stubbed with title
+ back link to keep the route reachable from the menu now.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: `/settings` route + SettingsPage + Header nav-chrome + strip FooterActions (merged)

**Files:**
- Create: `src/routes/settings/+page.svelte`
- Create: `src/components/ui/SettingsPage.svelte`
- Delete: `src/components/ui/UserPreferencesPage.svelte`
- Modify: `src/components/app/Header.svelte`, `src/components/app/FooterActions.svelte`, `src/components/app/MainContent.svelte`

Зачем merged: Header.svelte ссылается на `/settings` через типизированный `resolve('/settings')`. Этот вызов проверяется `svelte-check` по списку существующих роутов (`.svelte-kit/types`). Если ссылка появится раньше, чем route — упадёт `make check-all`. Поэтому всё, что связано с миграцией Settings в `/settings`, делается в одном коммите.

- [ ] **Step 1: Создать `SettingsPage.svelte`**

`src/components/ui/SettingsPage.svelte`:

```svelte
<script lang="ts">
  import { settings, updateSettings } from '@/lib/settings';
  import Select from './Select.svelte';
  import type { UserSettings } from '@/interfaces/user-settings';
  import type { Dictionary } from '@/interfaces/types';
  import { setTheme, THEMES, type ThemeSetting } from '@/themes/registry';

  interface Props {
    onBack: () => void;
    dictionary: Dictionary;
  }

  const { onBack, dictionary }: Props = $props();

  const interfaceLanguages = $derived([
    { value: 'en' as const, label: dictionary.options.interfaceLanguages.en },
    { value: 'ru' as const, label: dictionary.options.interfaceLanguages.ru },
  ]);

  const themeOptions = $derived.by(() => {
    const lightThemes = THEMES
      .filter((t) => t.colorScheme === 'light')
      .map((t) => ({ value: t.id, label: dictionary.options.themes[t.id] }));
    const darkThemes = THEMES
      .filter((t) => t.colorScheme === 'dark')
      .map((t) => ({ value: t.id, label: dictionary.options.themes[t.id] }));

    return [
      { value: 'auto', label: dictionary.options.themes.auto },
      { label: dictionary.settings.theme_group_light, options: lightThemes },
      { label: dictionary.settings.theme_group_dark, options: darkThemes },
    ];
  });
</script>

<div class="settings-page">
  <h2>{dictionary.settings.title}</h2>

  <label class="field">
    <span class="label-text">{dictionary.settings.interface_language_label}</span>
    <Select
      value={$settings.interfaceLanguage}
      options={interfaceLanguages}
      onChange={(v) => updateSettings({ interfaceLanguage: v as UserSettings['interfaceLanguage'] })}
    />
  </label>

  <label class="field">
    <span class="label-text">{dictionary.settings.theme_label}</span>
    <Select
      value={$settings.theme}
      options={themeOptions}
      onChange={(v) => setTheme(v as ThemeSetting)}
    />
  </label>

  <button type="button" class="btn" onclick={onBack}>
    {dictionary.settings.back_button}
  </button>
</div>

<style>
  .settings-page {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-6);
    max-width: 400px;
    width: 100%;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .label-text {
    font-size: 0.875rem;
    color: var(--settings-page-label-color);
  }

  .btn {
    margin-top: var(--spacing-4);
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: var(--radius-3);
    border: var(--settings-page-btn-border);
    background: var(--settings-page-btn-background);
    color: var(--settings-page-btn-color);
    cursor: pointer;
    align-self: flex-start;
  }

  .btn:hover {
    background: var(--settings-page-btn-hover-background);
  }
</style>
```

- [ ] **Step 2: Создать `/settings` роут**

```bash
mkdir -p src/routes/settings
```

`src/routes/settings/+page.svelte`:

```svelte
<script lang="ts">
  import SettingsPage from '@/components/ui/SettingsPage.svelte';
  import { dictionary } from '@/lib/i18n';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
</script>

<SettingsPage
  dictionary={$dictionary}
  onBack={() => goto(resolve('/'))}
/>
```

- [ ] **Step 3: Удалить `UserPreferencesPage.svelte` + ветка из `MainContent.svelte`**

В `src/components/app/MainContent.svelte` удалить:
```ts
import UserPreferencesPage from '@/components/ui/UserPreferencesPage.svelte';
```

И ветку:
```svelte
{:else if inState({ snapshot: state, value: 'settings' })}
  <UserPreferencesPage onBack={() => send({ type: 'TO_MENU' })} {dictionary} />
```

Удалить файл:
```bash
git rm src/components/ui/UserPreferencesPage.svelte
```

```bash
grep -rn "UserPreferencesPage" src/
```
Expected: пусто.

- [ ] **Step 4: Переписать `Header.svelte`**

```svelte
<script lang="ts">
  import { dictionary } from '@/lib/i18n';
  import { resolve } from '$app/paths';

  interface Props {
    title: string;
    appStateLabel: string;
    appStateValue: string;
  }

  const { title, appStateLabel, appStateValue }: Props = $props();
</script>

<header class="header">
  <div class="top">
    <h1 class="title">{title}</h1>
    <nav class="nav">
      <a class="nav-link" href={resolve('/settings')}>{$dictionary.app.settings}</a>
      <a class="nav-link" href={resolve('/stats')}>{$dictionary.app.stats}</a>
    </nav>
  </div>
  <div class="debug">
    <span class="label">{appStateLabel}:</span>
    <code class="value">{appStateValue}</code>
  </div>
</header>

<style>
  .header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-2);
    width: 100%;
    padding: var(--spacing-4) 0;
  }

  .top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-6);
    width: 100%;
  }

  .title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--header-title-color);
  }

  .nav {
    display: flex;
    gap: var(--spacing-3);
  }

  .nav-link {
    font-size: 0.875rem;
    color: var(--header-title-color);
    text-decoration: none;
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-2);
  }

  .nav-link:hover {
    background: var(--header-debug-background);
  }

  .debug {
    font-size: 0.75rem;
    color: var(--header-debug-color);
    font-family: var(--font-mono);
  }

  .label {
    margin-right: var(--spacing-1);
  }

  .value {
    background: var(--header-debug-background);
    padding: var(--spacing-1) var(--spacing-2);
    border-radius: var(--radius-2);
  }
</style>
```

Замечание: новые селекторы переиспользуют существующие токены — `Header.contract.ts` не меняется.

- [ ] **Step 5: Удалить кнопки Settings/Stats из `FooterActions.svelte`**

Удалить два блока:
```svelte
{#if state.can({ type: 'TO_SETTINGS' })}
  <button type="button" class="btn secondary" onclick={() => send({ type: 'TO_SETTINGS' })}>
    {dictionary.app.settings}
  </button>
{/if}
{#if state.can({ type: 'TO_ALL_STAT' })}
  <button type="button" class="btn secondary" onclick={() => send({ type: 'TO_ALL_STAT' })}>
    {dictionary.app.stats}
  </button>
{/if}
```

Если в этом же файле есть CSS-правило `.btn.secondary` (прогрепать `secondary` в FooterActions.svelte) — удалить его. На текущем коммите этого правила нет.

- [ ] **Step 6: Визуальная проверка**

`make dev`:
- `/` → меню (FSM-`menu`) + кнопки Start. Header — Settings/Stats справа, ведут на роуты.
- `/settings` → Interface Language + Theme + Back. Back → `/`.
- `/stats` → заголовок + Back.
- Footer — Settings/Stats больше нет. ✓
- Тренировка/Pause/Resume/Back to Menu в footer'е — работают.

- [ ] **Step 7: Чек + commit**

```bash
make check-all
git add -A
git commit -m "$(cat <<'EOF'
feat(routing): introduce /settings route with Header nav chrome

App-level user settings (interface language, theme) move to a dedicated
/settings route. Header gains nav-chrome links to /settings and /stats.
FooterActions loses its Settings/Stats buttons — they're navigation,
not process controls. UserPreferencesPage.svelte is replaced by
SettingsPage.svelte.

Trainer settings (text language, layout) will move to the menu in a
follow-up task.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Создать `MenuScreen.svelte`

**Files:**
- Create: `src/components/ui/MenuScreen.svelte`

**Контролируемый тех-долг:** MenuScreen намеренно НЕ получает `*.contract.ts` файла. Это сознательное отступление от `docs/06` §6.2. Причина — компонент пока тонкий и переиспользует существующие токены SettingsPage и FooterActions. Когда форма экрана стабилизируется — выделить собственные `--menu-screen-*` токены и завести contract на общих условиях. Контракт-тест от этого зелёный (проверяет покрытие токенов в темах, не наличие contract-файлов рядом с компонентами).

- [ ] **Step 1: Создать `MenuScreen.svelte`**

```svelte
<!--
  Tech-debt note: MenuScreen намеренно не имеет рядом MenuScreen.contract.ts.
  Компонент пока тонкий и переиспользует существующие токены SettingsPage и
  FooterActions. Когда он стабилизируется как самостоятельная сущность —
  выделить собственные `--menu-screen-*` токены и завести контракт на общих
  условиях. См. docs/06 §6.2 и docs/superpowers/plans/2026-06-09-screen-routing-and-menu-refactor.md (Task 6).
-->
<script lang="ts">
  import { settings, updateSettings } from '@/lib/settings';
  import Select from './Select.svelte';
  import type { Dictionary, SymbolLayoutId, TextLanguage } from '@/interfaces/types';
  import { getCompatibleSymbolLayoutsForTextLanguage } from '@/lib/layouts';

  interface Props {
    dictionary: Dictionary;
    onStart: (params: { symbolLayoutId: SymbolLayoutId }) => void;
  }

  const { dictionary, onStart }: Props = $props();

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
</script>

<div class="menu-screen">
  <label class="field">
    <span class="label-text">{dictionary.settings.text_language_label}</span>
    <Select
      value={$settings.textLanguage}
      options={textLanguages}
      onChange={(v) => updateSettings({ textLanguage: v as TextLanguage })}
    />
  </label>

  <label class="field">
    <span class="label-text">{dictionary.settings.symbol_layout_label}</span>
    <Select
      value={$settings.symbolLayoutId}
      options={layoutOptions}
      onChange={(v) => updateSettings({ symbolLayoutId: v as SymbolLayoutId })}
    />
  </label>

  <button
    type="button"
    class="btn primary"
    onclick={() => onStart({ symbolLayoutId: $settings.symbolLayoutId })}
  >
    {dictionary.app.start_training}
  </button>
</div>

<style>
  .menu-screen {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-6);
    max-width: 400px;
    width: 100%;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-2);
  }

  .label-text {
    font-size: 0.875rem;
    color: var(--settings-page-label-color);
  }

  .btn {
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: var(--radius-3);
    border: var(--footer-actions-btn-primary-border);
    background: var(--footer-actions-btn-primary-background);
    color: var(--footer-actions-btn-primary-color);
    font-family: var(--font-sans);
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    align-self: stretch;
  }

  .btn:hover {
    opacity: 0.9;
  }
</style>
```

- [ ] **Step 2: Чек + commit**

```bash
make check-all
git add -A
git commit -m "$(cat <<'EOF'
feat(menu): add MenuScreen with language/layout selects and Start

Pre-flight menu component: text language, symbol layout, and a primary
Start action. Intentionally without sibling *.contract.ts — see comment
at top of MenuScreen.svelte for the controlled tech-debt rationale.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Подключить MenuScreen + скрыть FooterActions на menu (с зачисткой `allStat` ветки)

**Files:**
- Modify: `src/components/app/MainContent.svelte`
- Modify: `src/components/app/FooterActions.svelte`

Merged commit: добавить ветку menu (MenuScreen) + убрать ветку allStat + убрать welcome + скрыть footer на menu. Все эти изменения связаны темой «новый menu владеет содержимым экрана `menu`».

- [ ] **Step 1: Подключить MenuScreen в `MainContent.svelte`**

Полностью заменить содержимое:

```svelte
<script lang="ts">
  import type { Actor, StateFrom } from 'xstate';
  import type { appMachine, AppEvent } from '@/machines/app.machine';
  import type { trainingMachine } from '@/machines/training.machine';
  import type { Dictionary } from '@/interfaces/types';
  import { getFingerLayout, getPhysicalLayout } from '@/lib/layouts';

  const fingerLayoutASDF = getFingerLayout('asdf');
  const physicalLayoutANSI = getPhysicalLayout('ansi');

  import { inState } from '@/lib/state-utils';
  import { calculateLessonStats } from '@/lib/stats-calculator';

  import TrainingScene from '@/components/ui/TrainingScene.svelte';
  import LessonStatsDisplay from '@/components/ui/LessonStatsDisplay.svelte';
  import MenuScreen from '@/components/ui/MenuScreen.svelte';

  interface Props {
    state: StateFrom<typeof appMachine>;
    send: (event: AppEvent) => void;
    dictionary: Dictionary;
    trainingActor: Actor<typeof trainingMachine> | undefined;
  }

  const { state, send, dictionary, trainingActor }: Props = $props();

  const lessonStats = $derived.by(() => {
    const stream = state.context.lastTrainingStream;
    if (!stream) return null;
    const s = calculateLessonStats(stream);
    return s.totalAttempts > 0 ? s : null;
  });
</script>

{#if inState({ snapshot: state, value: { training: 'running' } }) && trainingActor}
  <TrainingScene {trainingActor} fingerLayout={fingerLayoutASDF} physicalLayout={physicalLayoutANSI} {dictionary} />
{:else if inState({ snapshot: state, value: 'sessionComplete' }) && lessonStats}
  <LessonStatsDisplay stats={lessonStats} {dictionary} />
{:else if inState({ snapshot: state, value: { training: 'paused' } })}
  <h2 class="screen-title pause">{dictionary.app.pause}</h2>
{:else if inState({ snapshot: state, value: 'menu' })}
  <MenuScreen
    {dictionary}
    onStart={({ symbolLayoutId }) => send({ type: 'START_TRAINING', symbolLayoutId })}
  />
{/if}

<style>
  .screen-title {
    font-size: 1.5rem;
    font-weight: 700;
  }

  .pause {
    color: var(--main-content-pause-color);
  }
</style>
```

Изменения относительно текущего MainContent:
- ✅ Добавлен импорт `MenuScreen`.
- ✅ Добавлена ветка `'menu'` с `MenuScreen`.
- ✅ Удалена ветка `'allStat'` (роут `/stats` уже владеет общей статистикой).
- ✅ Удалена ветка `welcome` fallback (был `{:else} <div class="welcome">...</div>`).
- ✅ Удалены `.welcome` CSS-стили.

- [ ] **Step 2: Скрыть FooterActions на `menu`**

Полностью заменить `src/components/app/FooterActions.svelte`:

```svelte
<script lang="ts">
  import type { StateFrom } from 'xstate';
  import type { appMachine, AppEvent } from '@/machines/app.machine';
  import type { Dictionary, SymbolLayoutId } from '@/interfaces/types';
  import { inState } from '@/lib/state-utils';

  interface Props {
    state: StateFrom<typeof appMachine>;
    send: (event: AppEvent) => void;
    dictionary: Dictionary;
    symbolLayoutId: SymbolLayoutId;
  }

  const { state, send, dictionary, symbolLayoutId }: Props = $props();

  const isVisible = $derived(
    inState({ snapshot: state, value: 'training' }) ||
    inState({ snapshot: state, value: 'sessionComplete' })
  );
</script>

{#if isVisible}
  <footer class="footer">
    <div class="actions">
      {#if state.can({ type: 'START_TRAINING', symbolLayoutId })}
        <button type="button" class="btn primary" onclick={() => send({ type: 'START_TRAINING', symbolLayoutId })}>
          {dictionary.app.start_again}
        </button>
      {/if}
      {#if state.can({ type: 'PAUSE' })}
        <button type="button" class="btn warning" onclick={() => send({ type: 'PAUSE' })}>
          {dictionary.app.pause}
        </button>
      {/if}
      {#if state.can({ type: 'RESUME' })}
        <button type="button" class="btn success" onclick={() => send({ type: 'RESUME' })}>
          {dictionary.app.resume}
        </button>
      {/if}
      {#if state.can({ type: 'TO_MENU' })}
        <button type="button" class="btn danger" onclick={() => send({ type: 'TO_MENU' })}>
          {dictionary.app.back_to_menu}
        </button>
      {/if}
    </div>
  </footer>
{/if}

<style>
  .footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-4);
    width: 100%;
    padding: var(--spacing-4) 0;
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-3);
    justify-content: center;
  }

  .btn {
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: var(--radius-3);
    border: var(--footer-actions-btn-border);
    background: var(--footer-actions-btn-background);
    color: var(--footer-actions-btn-color);
    font-family: var(--font-sans);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.1s ease;
  }

  .btn:hover {
    background: var(--footer-actions-btn-hover-background);
  }

  .btn.primary {
    background: var(--footer-actions-btn-primary-background);
    color: var(--footer-actions-btn-primary-color);
    border: var(--footer-actions-btn-primary-border);
  }

  .btn.primary:hover {
    opacity: 0.9;
  }

  .btn.success {
    background: var(--footer-actions-btn-success-background);
    color: var(--footer-actions-btn-success-color);
    border: var(--footer-actions-btn-success-border);
  }

  .btn.warning {
    background: var(--footer-actions-btn-warning-background);
    color: var(--footer-actions-btn-warning-color);
    border: var(--footer-actions-btn-warning-border);
  }

  .btn.danger {
    background: var(--footer-actions-btn-danger-background);
    color: var(--footer-actions-btn-danger-color);
    border: var(--footer-actions-btn-danger-border);
  }
</style>
```

Замечания:
- Заголовок Start меняется на `start_again` (используется в `sessionComplete`).
- На `menu` footer не рендерится (Start теперь у MenuScreen).
- На `training:running` — Pause.
- На `training:paused` — Resume + Back to Menu.
- На `sessionComplete` — Start Again + Back to Menu.

- [ ] **Step 3: Визуальная проверка + чек + commit**

```bash
make dev
# /  → MenuScreen + footer пустой
# Start → training, footer Pause
# Escape → paused, footer Resume + Back to Menu
# Resume → running
# Допечатать → sessionComplete + footer Start Again + Back to Menu
# Header (Settings/Stats) работает с любого экрана
make check-all
git add -A
git commit -m "$(cat <<'EOF'
feat(menu): wire MenuScreen and clean up MainContent + FooterActions

MainContent renders MenuScreen on the menu state; the welcome fallback
and allStat branches are removed. FooterActions hides on menu, renders
process-controls only (Pause/Resume/Restart/Back).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Выпилить `settings` state из FSM

**Files:**
- Modify: `src/machines/app.machine.ts`, `src/machines/app.machine.test.ts`

- [ ] **Step 1: Удалить из `AppEvent`**

```ts
// удалить:
| { type: 'TO_SETTINGS' }
```

- [ ] **Step 2: Удалить переход и state**

В `menu`-state удалить:
```ts
TO_SETTINGS: 'settings',
```

Удалить блок:
```ts
settings: {
  on: { TO_MENU: 'menu' },
},
```

- [ ] **Step 3: Удалить тест**

В `src/machines/app.machine.test.ts` удалить блок:
```ts
it('navigates menu → settings → menu', () => { ... });
```

- [ ] **Step 4: Тесты + чек + commit**

```bash
make test && make check-all
git add -A
git commit -m "$(cat <<'EOF'
refactor(machines): remove settings state from appMachine

Settings now live on the /settings route; FSM no longer models
navigation to them.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Выпилить `allStat` state из FSM

**Files:**
- Modify: `src/machines/app.machine.ts`, `src/machines/app.machine.test.ts`

- [ ] **Step 1: Удалить из `AppEvent`**

```ts
// удалить:
| { type: 'TO_ALL_STAT' }
```

- [ ] **Step 2: Удалить переход и state**

В `menu`-state удалить:
```ts
TO_ALL_STAT: 'allStat',
```

Удалить блок:
```ts
allStat: {
  on: { TO_MENU: 'menu' },
},
```

- [ ] **Step 3: Удалить тест**

```ts
it('navigates menu → allStat → menu', () => { ... });
```

- [ ] **Step 4: Тесты + чек + commit**

```bash
make test && make check-all
git add -A
git commit -m "$(cat <<'EOF'
refactor(machines): remove allStat state from appMachine

Aggregate stats now live on the /stats route.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: i18n + contracts cleanup

**Files:**
- Modify: `dictionaries/en.json`, `dictionaries/ru.json` — удалить `app.welcome`
- Modify: `src/components/app/MainContent.contract.ts` — удалить `--main-content-welcome-color`
- Modify: `src/themes/_template.css`, `light.css`, `dark.css`, `sepia.css`, `nord.css` — удалить токен

- [ ] **Step 1: Проверить, что `app.welcome` не используется**

```bash
grep -rn "app\.welcome\|dictionary\.app\.welcome" src/
```
Expected: пусто.

- [ ] **Step 2: Удалить `welcome` из словарей**

В `dictionaries/en.json` удалить:
```json
"welcome": "Welcome to FlowTyping. Select an option to begin."
```
И починить предыдущую запятую.

В `dictionaries/ru.json`:
```json
"welcome": "Добро пожаловать в FlowTyping. Выберите действие, чтобы начать."
```

- [ ] **Step 3: Проверить, что `--main-content-welcome-color` не используется**

```bash
grep -rn "main-content-welcome-color" src/
```
Expected: только в `MainContent.contract.ts` и 5 темах (definitions), без потребителей.

- [ ] **Step 4: Удалить токен из `MainContent.contract.ts`**

Удалить строку:
```ts
'--main-content-welcome-color', // color приветственного экрана меню
```

Если header-комментарий упоминает этот токен — поправить.

- [ ] **Step 5: Удалить токен из всех 5 тем**

В каждом из `_template.css`, `light.css`, `dark.css`, `sepia.css`, `nord.css` удалить строку с `--main-content-welcome-color`.

- [ ] **Step 6: Тесты + чек + commit**

```bash
make test && make check-all
git add -A
git commit -m "$(cat <<'EOF'
chore: remove unused welcome string and main-content-welcome-color token

MenuScreen replaced the welcome fallback; both the dictionary key and
the dedicated CSS token are no longer referenced.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Финальная верификация

- [ ] **Step 1: Полный чек**

```bash
make check-all
```
Expected: PASS, 0 ESLint warnings, 0 spell errors, build чистый.

- [ ] **Step 2: grep-вызовы для контроля наследия**

```bash
grep -rn "UserPreferences\|user_preferences\|user-preferences-page\|@/lib/preferences\|@/user-preferences\|DEFAULT_USER_PREFERENCES\|normalizePreferences\|updatePreferences\|USER_PREFERENCES_PAGE_CONTRACT\|UserPreferencesPage\|exerciseId\|planExerciseIdSync\|trainingComplete\|TRAINING\\.COMPLETE\|main-content-welcome-color\|app\\.welcome\|lesson_complete" src/ dictionaries/
```

Expected: только значение `'flow-typing-user-preferences'` (STORAGE_KEY) в `src/lib/settings.ts` + сопровождающий комментарий.

- [ ] **Step 3: E2E manual smoke**

`make dev`. Пройти сценарий:

1. `/` → MenuScreen с языком (en), раскладкой (qwerty), Start.
2. Сменить язык на `ru` → раскладка автоматически меняется на `йцукен`.
3. Header → Settings → `/settings`: Interface Language + Theme. Сменить тему — UI откликается. Back → `/`.
4. Header → Stats → `/stats`: заголовок + Back.
5. Click Start → тренировка. Печать работает.
6. Escape → пауза, footer Resume + Back to Menu.
7. Header → Settings во время паузы → `/settings`. Back → `/`. **FSM должен сохраниться: показан paused-экран.**
8. Resume → продолжает тренировку.
9. Escape, Escape → возврат в menu.
10. Допечатать до конца → sessionComplete + Start Again / Back to Menu.
11. URL — никаких `?exerciseId=` нигде.
12. Refresh на `/settings` — страница работает.

- [ ] **Step 4: FSM persistence check**

Запустить тренировку → Escape (пауза) → Settings в шапке → `/settings` → Back. Должно показаться состояние `paused`.

Если показано menu — `appActor` не пережил навигацию. Чинить:
- `appActor.ts` всё ещё module-scope singleton.
- `+layout.svelte` подписан на `appActor`, не пересоздаёт его.

---

## Self-Review

**Spec coverage:**
- ✅ Полный rename `preferences` → `settings` codebase-wide, включая `src/themes/registry.ts` и `+layout.svelte` — Task 0
- ✅ Удаление `?exerciseId=` — Task 1
- ✅ `trainingComplete` → `sessionComplete` — Task 2
- ✅ `appActor` survives navigation (layout) — Task 3
- ✅ `/stats` placeholder — Task 4
- ✅ `/settings` route + SettingsPage + Header nav-chrome + strip footer + delete UserPreferencesPage (один коммит — типизированный `resolve()` требует существования роута) — Task 5
- ✅ MenuScreen с tech-debt комментарием — Task 6
- ✅ Wire MenuScreen + скрыть footer на menu + удалить ветку `allStat` из MainContent — Task 7
- ✅ Удаление FSM `settings` — Task 8
- ✅ Удаление FSM `allStat` — Task 9
- ✅ i18n + contracts cleanup — Task 10

**BLOCKER'ы от ревьюеров — устранены:**
- ✅ Orphaned `UserPreferencesPage.contract.ts` → переименован в Task 0 Step 1 (+ Step 7, Step 8).
- ✅ Type-break в `FooterActions` между Task 8/9 и удалением → Task 5 уже удалил callsites; Tasks 8/9 безопасны.
- ✅ Битый UX между `delete UserPreferencesPage` и `Header nav` → merged в Task 5.
- ✅ Двойная Start кнопка на menu → MenuScreen и hide-footer-on-menu делаются в одной commit'ной точке (Task 7).
- ✅ `--main-content-welcome-color` dead token → удаляется в Task 10.
- ✅ Task 0 пропускает `src/themes/registry.ts` → Step 9.
- ✅ Task 0 пропускает `src/routes/+layout.svelte` → Step 10.
- ✅ `git mv` порядок сломан → Step 1 порядок исправлен (директория ДО файлов внутри).
- ✅ `resolve('/settings')` до создания роута → Task 5 единый merged commit.
- ✅ `allStat` ветка в MainContent silently dropped → Task 7 Step 1 «Изменения» явно перечислены.

**Placeholder scan:** все шаги содержат конкретный код / команды.

**Type consistency:**
- `SESSION.COMPLETE`, `sessionComplete` — единое имя во всех файлах.
- `UserSettings` без `shared` — поправлено в типе, дефолтах, normalize, тестах.
- `SETTINGS_PAGE_CONTRACT`, `--settings-page-*` — единое имя в contract + 5 темах + потребителях.
- `settings`, `updateSettings`, `normalizeSettings`, `DEFAULT_USER_SETTINGS` — единое имя в store, импортах, тестах, словарях.

---

## Замечания

1. **localStorage key `flow-typing-user-preferences` НЕ переименовывается** — публичный контракт. Закомментировано в `settings.ts`.
2. **HMR caveat сохраняется** — `appActor.ts` остаётся singleton + `import.meta.hot.invalidate()`. Layout-hosting это не меняет.
3. **`SettingsPage.contract.ts` временно (между Task 0 и Task 5) лежит рядом с `UserPreferencesPage.svelte`.** Convention drift, но контракт-тест не enforce'ит colocation, build зелёный. Устраняется в Task 5 переименованием компонента.
4. **MenuScreen без contract'а — контролируемый тех-долг.** Прокомментировано в самом компоненте.
5. **`?exerciseId=` migration** — старые пользователи с `shared.exerciseId` в localStorage не упадут, `normalizeSettings` игнорирует неизвестные поля.
6. **Drill-выбор остаётся в `appMachine.startNewTrainingStream`** — lazy, без изменений в этом PR.
7. **`SESSION.COMPLETE` пока срабатывает per-drill** — рефакторинг session-as-many-drills отдельным PR.

---

## Что дальше (не в scope этого PR)

Перенесено в [`docs/backlog.md`](../../backlog.md) (раздел «Тех-долг и архитектурные открытые вопросы»). Из исходного списка `docs/04` уже переписан под новую терминологию (закрыто), `/stats` стал частью auth-umbrella (Phase 7, тоже в backlog'е), остальные пять пунктов живут там с обновлёнными «почему отложено» и «driver».
