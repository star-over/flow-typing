# Header Language Switcher — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Вынести переключатель языка интерфейса в шапку — компактный нативный `<select>` (глобус + код `EN`/`RU`), доступный с первого экрана всем; убрать поле языка из `/settings`.

**Architecture:** Новый «глупый» компонент `LanguageSwitcher.svelte` в шапке читает сторы `settings`/`i18n` напрямую (как `UserMenu`/`SettingsPage`) и пишет через `updateSettings`. `Header` условно рендерит его по пропу `showLanguageSwitcher`, layout передаёт `!canPause` (скрыт в активном наборе). Стиль — ghost-хром без новых токенов темы. Полная рамка решения — спека `docs/superpowers/specs/2026-07-09-header-language-switcher-design.md`.

**Tech Stack:** SvelteKit 2 + Svelte 5 (runes), TypeScript, Storybook (svelte-csf). Верификация — `make check-dev` (eslint + svelte-check + vitest) + Storybook + живой прогон; DOM-юнит-тестов компонентов в проекте нет (осознанно — см. ниже).

> **Про тесты и коммиты.** В этом коде UI-компоненты **не** покрываются DOM-юнит-тестами (нет `@testing-library`) — верификация идёт `svelte-check` (типы + существование i18n-ключей) + Storybook + живой прогон. Поэтому шаги «write failing test → red» заменены на реальную для проекта проверку (`make check-dev` / живьём). Коммиты — по правилу репозитория «коммитим, когда просит владелец»: команды `git commit` в шагах даны для порядка, исполнитель согласует момент с владельцем (push — всегда владелец).

---

## Файловая структура

- **Создать** `src/components/header/LanguageSwitcher.svelte` — сам контрол (глобус + нативный select + ghost-стиль).
- **Создать** `src/components/header/LanguageSwitcher.stories.svelte` — Storybook-демо (конвенция проекта для нового компонента; опционально по спеке).
- **Изменить** `dictionaries/en.json`, `dictionaries/ru.json` — секция `options.interfaceLanguageCodes`.
- **Изменить** `src/components/header/Header.svelte` — проп `showLanguageSwitcher` + условный рендер перед `UserMenu`.
- **Изменить** `src/routes/+layout.svelte` — передать `showLanguageSwitcher={!canPause}`.
- **Изменить** `src/components/ui/SettingsPage.svelte` — убрать поле языка + осиротевшие `$derived` и импорт `UserSettings`.

---

## Task 1: i18n — коды языков `EN`/`RU`

**Files:**
- Modify: `dictionaries/en.json` (секция `options`, после `interfaceLanguages`)
- Modify: `dictionaries/ru.json` (секция `options`, после `interfaceLanguages`)

- [ ] **Step 1: Добавить `interfaceLanguageCodes` в `dictionaries/en.json`**

Найти в `options`:

```json
    "interfaceLanguages": {
      "en": "English",
      "ru": "Русский"
    },
```

Заменить на (добавлен блок кодов; значения латиницей, язык-нейтральны — ADR 0022):

```json
    "interfaceLanguages": {
      "en": "English",
      "ru": "Русский"
    },
    "interfaceLanguageCodes": {
      "en": "EN",
      "ru": "RU"
    },
```

- [ ] **Step 2: То же в `dictionaries/ru.json`** — значения **идентичны** (коды язык-нейтральны)

Найти в `options`:

```json
    "interfaceLanguages": {
      "en": "Английский",
      "ru": "Русский"
    },
```

Заменить на:

```json
    "interfaceLanguages": {
      "en": "Английский",
      "ru": "Русский"
    },
    "interfaceLanguageCodes": {
      "en": "EN",
      "ru": "RU"
    },
```

- [ ] **Step 3: Проверить, что оба JSON валидны и ключи симметричны**

Run:
```bash
node -e 'const en=require("./dictionaries/en.json"),ru=require("./dictionaries/ru.json");const k=o=>Object.keys(o).sort().join(",");console.log("en",k(en.options.interfaceLanguageCodes));console.log("ru",k(ru.options.interfaceLanguageCodes));console.log(k(en.options.interfaceLanguageCodes)===k(ru.options.interfaceLanguageCodes)?"SYMMETRIC OK":"MISMATCH")'
```
Expected: обе строки `en,ru` и `SYMMETRIC OK`.

- [ ] **Step 4: Commit** (по согласованию с владельцем)

```bash
git add dictionaries/en.json dictionaries/ru.json
git commit -m "feat(i18n): add interfaceLanguageCodes (EN/RU) for header switcher"
```

---

## Task 2: Компонент `LanguageSwitcher.svelte`

**Files:**
- Create: `src/components/header/LanguageSwitcher.svelte`

Зависит от Task 1 (использует `$dictionary.options.interfaceLanguageCodes`).

- [ ] **Step 1: Создать компонент**

Создать `src/components/header/LanguageSwitcher.svelte` с содержимым:

```svelte
<script lang="ts">
  import { settings, updateSettings } from '@/lib/settings';
  import { dictionary } from '@/lib/i18n';
  import type { UserSettings } from '@/interfaces/user-settings';

  // Порядок опций фиксирован; надписи — коды из словаря (ADR 0022: все UI-строки в i18n).
  const languages: UserSettings['interfaceLanguage'][] = ['en', 'ru'];
</script>

<span class="language-switcher">
  <svg
    class="language-switcher__globe"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.7 2.5 15.3 0 18M12 3c-2.5 2.7-2.5 15.3 0 18" />
  </svg>
  <select
    class="language-switcher__select"
    aria-label={$dictionary.settings.interface_language_label}
    value={$settings.interfaceLanguage}
    onchange={(e) =>
      updateSettings({
        interfaceLanguage: e.currentTarget.value as UserSettings['interfaceLanguage'],
      })}
  >
    {#each languages as lang (lang)}
      <option value={lang}>{$dictionary.options.interfaceLanguageCodes[lang]}</option>
    {/each}
  </select>
</span>

<style>
  /* Ghost-хром: прозрачный фон, рамка шапки, цвет наследуется — рифмуется с
     кнопкой паузы. Новых контракт-токенов нет (как у .pause в Header). */
  .language-switcher {
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-1);
    padding: var(--spacing-1) var(--spacing-2);
    border: var(--header-border);
    border-radius: var(--radius-2);
    color: inherit;
  }

  .language-switcher__globe {
    width: 0.9rem;
    height: 0.9rem;
    flex-shrink: 0;
    opacity: 0.75;
  }

  /* Нативный select без формы: прозрачный, шрифт/цвет от хрома, своя стрелка. */
  .language-switcher__select {
    appearance: none;
    background: transparent;
    border: none;
    color: inherit;
    font-family: var(--font-sans);
    font-size: 0.875rem;
    line-height: 1;
    /* место справа под свою стрелку */
    padding: 0 var(--spacing-4) 0 0;
    cursor: pointer;
  }

  .language-switcher__select:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }

  /* Стрелка-шеврон mask-приёмом (как в Select.svelte), цвет из currentColor. */
  .language-switcher::after {
    content: '';
    position: absolute;
    right: var(--spacing-2);
    top: 50%;
    transform: translateY(-50%);
    width: 10px;
    height: 10px;
    background: currentColor;
    opacity: 0.6;
    mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='10' height='10'%3E%3Cpath d='m6 9 6 6 6-6' fill='none' stroke='black' stroke-width='2'/%3E%3C/svg%3E");
    mask-repeat: no-repeat;
    mask-position: center;
    pointer-events: none;
  }
</style>
```

- [ ] **Step 2: Проверить типы и компиляцию**

Run: `make check`
Expected: `svelte-check` — `0 errors`. (Если ругнётся на `interfaceLanguageCodes` — не выполнен Task 1.)

- [ ] **Step 3: Commit** (по согласованию с владельцем)

```bash
git add src/components/header/LanguageSwitcher.svelte
git commit -m "feat(header): add LanguageSwitcher component (globe + EN/RU native select)"
```

---

## Task 3: Storybook-story для `LanguageSwitcher` (опционально, конвенция проекта)

**Files:**
- Create: `src/components/header/LanguageSwitcher.stories.svelte`

- [ ] **Step 1: Создать story**

Создать `src/components/header/LanguageSwitcher.stories.svelte`:

```svelte
<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import LanguageSwitcher from './LanguageSwitcher.svelte';

  const { Story } = defineMeta({
    title: 'header/LanguageSwitcher',
    component: LanguageSwitcher,
  });
</script>

<Story name="Default">
  <LanguageSwitcher />
</Story>
```

- [ ] **Step 2: Проверить, что story компилируется (svelte-check покрывает `.stories.svelte`)**

Run: `make check`
Expected: `0 errors`.

- [ ] **Step 3: (по желанию) визуально глянуть в Storybook**

Run: `make storybook` → открыть `header/LanguageSwitcher` на http://localhost:6006
Expected: контрол рендерится, глобус + код виден, select открывается.

- [ ] **Step 4: Commit** (по согласованию с владельцем)

```bash
git add src/components/header/LanguageSwitcher.stories.svelte
git commit -m "feat(header): Storybook story for LanguageSwitcher"
```

---

## Task 4: Проводка в `Header` и `+layout`

**Files:**
- Modify: `src/components/header/Header.svelte`
- Modify: `src/routes/+layout.svelte`

- [ ] **Step 1: `Header.svelte` — импорт компонента**

Найти:

```svelte
  import UserMenu from '@/components/auth/UserMenu.svelte';
  import Wordmark from '@/components/ui/Wordmark.svelte';
```

Заменить на:

```svelte
  import UserMenu from '@/components/auth/UserMenu.svelte';
  import Wordmark from '@/components/ui/Wordmark.svelte';
  import LanguageSwitcher from './LanguageSwitcher.svelte';
```

- [ ] **Step 2: `Header.svelte` — проп в интерфейсе `Props`**

Найти:

```svelte
    /** Текст кнопки паузы (локализован). */
    pauseLabel?: string;
    onPause?: () => void;
  }
```

Заменить на:

```svelte
    /** Текст кнопки паузы (локализован). */
    pauseLabel?: string;
    onPause?: () => void;
    /** Показывать ли переключатель языка (скрыт в активном наборе). */
    showLanguageSwitcher?: boolean;
  }
```

- [ ] **Step 3: `Header.svelte` — дефолт пропа в деструктуризации**

Найти:

```svelte
  const { title, timerSeconds = null, canPause = false, pauseLabel = '', onPause }: Props = $props();
```

Заменить на:

```svelte
  const {
    title,
    timerSeconds = null,
    canPause = false,
    pauseLabel = '',
    onPause,
    showLanguageSwitcher = false,
  }: Props = $props();
```

- [ ] **Step 4: `Header.svelte` — условный рендер перед `UserMenu`**

Найти:

```svelte
      {#if canPause}
        <button type="button" class="pause" onclick={onPause}>{pauseLabel}</button>
      {/if}
      <UserMenu />
```

Заменить на:

```svelte
      {#if canPause}
        <button type="button" class="pause" onclick={onPause}>{pauseLabel}</button>
      {/if}
      {#if showLanguageSwitcher}
        <LanguageSwitcher />
      {/if}
      <UserMenu />
```

- [ ] **Step 5: `+layout.svelte` — передать `showLanguageSwitcher={!canPause}`**

Найти:

```svelte
  <Header
    title={$dictionary.app.title}
    {timerSeconds}
    {canPause}
    pauseLabel={$dictionary.app.pause}
    onPause={() => appActor.send({ type: 'PAUSE' })}
  />
```

Заменить на (в layout уже есть `const canPause = $derived(...)`, строка 123):

```svelte
  <Header
    title={$dictionary.app.title}
    {timerSeconds}
    {canPause}
    pauseLabel={$dictionary.app.pause}
    onPause={() => appActor.send({ type: 'PAUSE' })}
    showLanguageSwitcher={!canPause}
  />
```

- [ ] **Step 6: Проверить типы**

Run: `make check`
Expected: `0 errors`.

- [ ] **Step 7: Живой прогон — контрол в шапке и скрытие в наборе**

Run: `make dev` → открыть http://localhost:5173
Expected:
- на лендинге `/` в шапке справа виден `🌐 EN` слева от меню юзера/«Войти»;
- на `/train` при **активном наборе** контрол исчезает (в шапке только таймер/пауза), а на **паузе** (Esc) — снова появляется.

- [ ] **Step 8: Commit** (по согласованию с владельцем)

```bash
git add src/components/header/Header.svelte src/routes/+layout.svelte
git commit -m "feat(header): render LanguageSwitcher, hidden during active typing"
```

---

## Task 5: Убрать поле языка из `/settings`

**Files:**
- Modify: `src/components/ui/SettingsPage.svelte`

- [ ] **Step 1: Удалить импорт `UserSettings` (осиротеет — используется только в удаляемом поле, `SettingsPage.svelte:63`)**

Найти:

```svelte
  import type { UserSettings } from '@/interfaces/user-settings';
  import type { Dictionary } from '@/interfaces/types';
```

Заменить на:

```svelte
  import type { Dictionary } from '@/interfaces/types';
```

- [ ] **Step 2: Удалить `$derived` `interfaceLanguages` (строится только для этого поля)**

Найти и удалить целиком:

```svelte
  const interfaceLanguages = $derived([
    { value: 'en' as const, label: dictionary.options.interfaceLanguages.en },
    { value: 'ru' as const, label: dictionary.options.interfaceLanguages.ru },
  ]);

```

- [ ] **Step 3: Удалить блок поля языка из разметки**

Найти и удалить целиком:

```svelte
  <label class="field">
    <span class="label-text">{dictionary.settings.interface_language_label}</span>
    <Select
      value={$settings.interfaceLanguage}
      options={interfaceLanguages}
      onChange={(v) => updateSettings({ interfaceLanguage: v as UserSettings['interfaceLanguage'] })}
    />
  </label>

```

(Остаются поля: имя — если `accountName !== null`; тема; кнопка «Назад».)

- [ ] **Step 4: Проверить типы (svelte-check поймал бы осиротевший импорт/переменную)**

Run: `make check`
Expected: `0 errors`, без предупреждений о неиспользуемых `UserSettings` / `interfaceLanguages`.

- [ ] **Step 5: Живой прогон — на `/settings` больше нет языка**

Run: `make dev` → http://localhost:5173/settings
Expected: поля «Язык интерфейса» нет; есть имя (у авторизованного) + тема + «Назад». Язык переключается только из шапки.

- [ ] **Step 6: Commit** (по согласованию с владельцем)

```bash
git add src/components/ui/SettingsPage.svelte
git commit -m "refactor(settings): move interface language to header, drop settings field"
```

---

## Task 6: Полная верификация

**Files:** (нет правок — проверочный чекпоинт)

- [ ] **Step 1: Прогнать полный быстрый цикл**

Run: `make check-dev`
Expected: eslint чисто, svelte-check `0 errors`, vitest — все зелёные.

- [ ] **Step 2: Живой сквозной прогон en↔ru**

Run: `make dev`
Expected:
- Гостем на лендинге `/`: сменить `EN → RU` в шапке → тексты лендинга/шапки становятся русскими; `RU → EN` → обратно.
- Авторизованным: смена языка из шапки сохраняется (перезагрузка страницы держит выбор; у авторизованного уезжает в cloud тем же путём, что раньше из настроек).
- В тренировке контрол скрыт в наборе, виден на паузе.

- [ ] **Step 3: Орфография перед коммитом**

Run: `make spell`
Expected: `Issues found: 0`. (Если красно — `/fix-spell`. Новых русских строк в словарь не добавляли; коды `EN`/`RU` латиницей.)

- [ ] **Step 4: (если предыдущие коммиты не делались) финальный коммит** (по согласованию с владельцем)

```bash
git add -A
git commit -m "feat(header): interface language switcher in header"
```

---

## Self-review (выполнено при написании плана)

- **Покрытие спеки:** компонент (T2), триггер глобус+код (T2), ghost-стиль без токенов (T2), место слева от UserMenu (T4), видимость `!canPause` (T4, проверено: `PAUSE` только в `training.running`, app.machine.ts:186), доступность всем (T2 — читает `settings`, auth не требуется), убрать из /settings (T5), i18n-коды + aria-label reuse (T1/T2), Storybook (T3), верификация (T6). Отложенное (вариант A, мёртвый ключ) — вне плана, в бэклоге.
- **Плейсхолдеров нет:** весь код и команды приведены целиком.
- **Согласованность имён:** проп `showLanguageSwitcher` одинаков в Header (T4 steps 2/3/4) и layout (T4 step 5); ключ `options.interfaceLanguageCodes` одинаков в T1 и T2; классы `language-switcher*` согласованы внутри T2.
