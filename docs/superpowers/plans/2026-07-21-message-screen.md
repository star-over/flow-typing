# ui/MessageScreen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ввести примитив `ui/MessageScreen` и перевести на него три дословных дубля экрана-сообщения, удалив каталог `src/components/device/`.

**Architecture:** Один доменно-нейтральный компонент с закрытым контрактом (только пропсы, без `{#snippet}`) владеет разметкой и стилями экрана-сообщения. Три вызывающих места передают только данные. CSS-правила `.app-error*`, `.error-page*`, `.keyboard-required*` исчезают вместе с копиями.

**Tech Stack:** SvelteKit + Svelte 5 (runes), TypeScript strict, CSS без фреймворков, Storybook (`@storybook/addon-svelte-csf`).

Спек: `docs/superpowers/specs/2026-07-21-message-screen-design.md`.

## Global Constraints

- **Тестов у компонентов нет (ADR 0013).** В `src/components/**` намеренно **0** файлов `*.test.ts`. Не создавать их, не вводить jsdom, browser-mode или `@storybook/test` play-функции. Проверка — `svelte-check`, `make build` и витрина Storybook.
- **i18n (ADR 0022).** Ни одного строкового литерала-надписи в разметке компонента. Все видимые строки приходят пропсами уже локализованными. Исключение — `*.stories.svelte`: витрина передаёт литералы как демо-данные (образец — `Avatar.stories.svelte`).
- **Темизация (ADR 0029).** Цвета — только через роли `var(--color-*)`. Новых ролей в этой работе не заводится. Геометрия — литералами и примитивами `--spacing-*`, `--radius-*`, `--font-size-*`, `--focus-ring-*`.
- **Импорты:** единственный псевдоним — `@/...` (= `src/`). `$lib` в проекте не используется.
- **Параметры функций:** 1 аргумент — позиционный; 2 и более — один object literal с деструктуризацией.
- **Duo-конвенция:** компонент = `X.svelte` + опциональный сосед `X.stories.svelte`. Никаких `X.contract.ts`.
- **Коммиты:** Conventional Commits. Перед финальным коммитом — `make check-all` (включает `make spell`), обязан быть зелёным.
- **Ветка:** `fix/css-focus-a11y-token-cleanup` (уже активна, ответвлена от `master`).

---

### Task 1: Компонент `ui/MessageScreen` и его витрина

**Files:**
- Create: `src/components/ui/MessageScreen.svelte`
- Create: `src/components/ui/MessageScreen.stories.svelte`

**Interfaces:**
- Consumes: ничего (первая задача).
- Produces: компонент по умолчанию из `@/components/ui/MessageScreen.svelte` с пропсами
  `{ title: string; body: string; note?: string; actionLabel: string; onAction: () => void }`.
  Задачи 2–4 импортируют его именно так.

- [ ] **Step 1: Создать компонент**

Создать `src/components/ui/MessageScreen.svelte`:

```svelte
<script lang="ts">
  /**
   * Экран-сообщение: центрированная колонка с заголовком, пояснением и одним
   * действием. Доменно-нейтральный лист — знает только про переданные строки,
   * поэтому одинаково обслуживает фатальную ошибку приложения, страницу 404 и
   * мягкий гейт устройства.
   *
   * Действие обязательно: экран без выхода — тупик. Опциональный `note` — для
   * технической приписки под текстом (статус-код HTTP); строку готовит
   * вызывающий, компонент не форматирует числа.
   *
   * Собственного отступа не имеет: все вызовы живут внутри `main.main`
   * (`src/routes/+layout.svelte`), который центрирует flex-колонкой.
   */
  const {
    title,
    body,
    note,
    actionLabel,
    onAction,
  }: {
    title: string;
    body: string;
    note?: string;
    actionLabel: string;
    onAction: () => void;
  } = $props();
</script>

<div class="message-screen">
  <h1 class="message-screen__title">{title}</h1>
  <p class="message-screen__body">{body}</p>
  {#if note !== undefined}
    <p class="message-screen__note">{note}</p>
  {/if}
  <button type="button" class="message-screen__action" onclick={onAction}>
    {actionLabel}
  </button>
</div>

<style>
  .message-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-3);
    max-width: 28rem;
    text-align: center;
  }

  .message-screen__title {
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  .message-screen__body {
    color: var(--color-text-secondary);
  }

  /* tabular-nums — под статус-код: для нецифрового текста no-op. */
  .message-screen__note {
    color: var(--color-text-secondary);
    font-variant-numeric: tabular-nums;
  }

  /* Ghost-кнопка: контур на прозрачном фоне — тихий хром (DESIGN.md).
     Единственное действие экрана, поэтому заливка не нужна. */
  .message-screen__action {
    margin-top: var(--spacing-2);
    padding: var(--spacing-2) var(--spacing-4);
    border-radius: var(--radius-3);
    border: 1px solid var(--color-text-secondary);
    background: transparent;
    color: var(--color-text-primary);
    font-family: var(--font-sans);
    font-size: var(--font-size-sm);
    cursor: pointer;
  }

  .message-screen__action:hover {
    border-color: var(--color-text-primary);
  }

  .message-screen__action:focus-visible {
    outline: var(--focus-ring-width) solid var(--color-text-primary);
    outline-offset: var(--focus-ring-offset);
  }
</style>
```

- [ ] **Step 2: Создать витрину**

Создать `src/components/ui/MessageScreen.stories.svelte`:

```svelte
<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import MessageScreen from './MessageScreen.svelte';

  const { Story } = defineMeta({
    title: 'ui/MessageScreen',
    component: MessageScreen,
  });

  const noop = () => {};
</script>

<Story
  name="Without note"
  args={{
    title: 'Something went wrong',
    body: 'The page failed to render. Reloading usually helps.',
    actionLabel: 'Reload',
    onAction: noop,
  }}
/>

<Story
  name="With note"
  args={{
    title: 'Page not found',
    body: 'This address does not exist. Check the link or go back to the start.',
    note: '404',
    actionLabel: 'Reload',
    onAction: noop,
  }}
/>

<Story
  name="Long text"
  args={{
    title: 'A physical keyboard is required to continue training',
    body: 'FlowTyping is a touch-typing trainer built for the desktop. Typing needs a physical keyboard — open it on a computer, or continue anyway if this device has one attached.',
    actionLabel: 'Continue anyway',
    onAction: noop,
  }}
/>
```

- [ ] **Step 3: Проверить типы**

Запустить: `make check`

Ожидается: `0 ERRORS 0 WARNINGS`. Компонент пока никем не импортирован — это нормально.

- [ ] **Step 4: Сверить с витриной**

Запустить: `make storybook`, открыть http://localhost:6006 → `ui/MessageScreen`.

Проверить три истории:
- «Without note» — заголовок, текст, кнопка; заметки нет.
- «With note» — между текстом и кнопкой моноширинный `404`.
- «Long text» — колонка не шире `28rem`, длинный заголовок переносится, кнопка по центру.

Проверить фокус: `Tab` до кнопки → видимое кольцо; клик мышью кольца не даёт (`:focus-visible`).

- [ ] **Step 5: Коммит**

```bash
git add src/components/ui/MessageScreen.svelte src/components/ui/MessageScreen.stories.svelte
git commit -m "feat(ui): add MessageScreen primitive"
```

---

### Task 2: Перевести error-boundary в `+layout.svelte`

**Files:**
- Modify: `src/routes/+layout.svelte` (сниппет `failed` в разметке; блок правил `.app-error*` в `<style>`)

**Interfaces:**
- Consumes: `MessageScreen` из Task 1 — `{ title, body, note?, actionLabel, onAction }`.
- Produces: ничего для последующих задач.

- [ ] **Step 1: Добавить импорт**

В блок импортов `<script lang="ts">` файла `src/routes/+layout.svelte` добавить:

```ts
import MessageScreen from '@/components/ui/MessageScreen.svelte';
```

- [ ] **Step 2: Заменить разметку**

Найти внутри `<svelte:boundary>` сниппет `failed` и заменить его тело целиком.

Было:

```svelte
      {#snippet failed()}
        <div class="app-error">
          <h1 class="app-error__title">{$dictionary.app.error_title}</h1>
          <p class="app-error__body">{$dictionary.app.error_body}</p>
          <button
            type="button"
            class="app-error__action"
            onclick={() => location.reload()}
          >
            {$dictionary.app.reload}
          </button>
        </div>
      {/snippet}
```

Стало:

```svelte
      {#snippet failed()}
        <MessageScreen
          title={$dictionary.app.error_title}
          body={$dictionary.app.error_body}
          actionLabel={$dictionary.app.reload}
          onAction={() => location.reload()}
        />
      {/snippet}
```

- [ ] **Step 3: Удалить осиротевшие правила**

Из `<style>` удалить шесть блоков целиком: `.app-error`, `.app-error__title`, `.app-error__body`, `.app-error__action`, `.app-error__action:hover`, `.app-error__action:focus-visible`, а также комментарий над `.app-error`:

```css
  /* Fallback error-boundary: центрированная колонка внутри .main (Header уцелел). */
```

Правила `.app-shell` и `.main` **не трогать** — `.main` даёт центрирование, на которое опирается компонент.

- [ ] **Step 4: Проверить**

Запустить: `make check-dev`

Ожидается: eslint без вывода, `0 ERRORS 0 WARNINGS`, все тесты зелёные.

`svelte-check` предупредил бы об неиспользуемом CSS-селекторе, если бы правило `.app-error*` осталось, — чистый вывод подтверждает, что удалено всё.

- [ ] **Step 5: Коммит**

```bash
git add src/routes/+layout.svelte
git commit -m "refactor(ui): render app error boundary via MessageScreen"
```

---

### Task 3: Перевести `+error.svelte`

**Files:**
- Modify: `src/routes/+error.svelte` (разметка и весь блок `<style>`)

**Interfaces:**
- Consumes: `MessageScreen` из Task 1 — `{ title, body, note?, actionLabel, onAction }`.
- Produces: ничего для последующих задач.

Здесь единственное применение пропса `note`. `page.status` — число, компонент принимает строку: приведение делает вызывающий.

- [ ] **Step 1: Заменить файл целиком**

Заменить содержимое `src/routes/+error.svelte` на:

```svelte
<script lang="ts">
  import { page } from '$app/state';
  import MessageScreen from '@/components/ui/MessageScreen.svelte';
  import { dictionary } from '@/lib/i18n';

  // Страница ошибки навигации SvelteKit (404, сбой перехода). Рендерится
  // внутри +layout — Header с логотипом/навигацией остаётся живым, поэтому здесь
  // достаточно объяснить и предложить перезагрузку. Все надписи — из словаря
  // (ADR 0022); статус-код — число, не переводимая строка.
</script>

<MessageScreen
  title={$dictionary.app.error_title}
  body={$dictionary.app.error_body}
  note={page.status ? String(page.status) : undefined}
  actionLabel={$dictionary.app.reload}
  onAction={() => location.reload()}
/>
```

Блока `<style>` в файле не остаётся: все правила `.error-page*` переехали в компонент.

- [ ] **Step 2: Проверить**

Запустить: `make check-dev`

Ожидается: `0 ERRORS 0 WARNINGS`, тесты зелёные.

- [ ] **Step 3: Проверить в приложении**

Запустить `make dev`, открыть http://localhost:5173/nonexistent-route.

Ожидается: заголовок, текст, `404` моноширинным под текстом, кнопка перезагрузки. Экран центрирован по вертикали и горизонтали — **это ключевая проверка утверждения спека про `margin`** (раньше здесь стоял `margin: 4rem auto`).

Если экран заметно смещён относительно центра, остановиться и доложить: спек предписывает вернуть отступ параметром компонента, а не молча внутри него.

- [ ] **Step 4: Коммит**

```bash
git add src/routes/+error.svelte
git commit -m "refactor(ui): render navigation error page via MessageScreen"
```

---

### Task 4: Перевести гейт клавиатуры и удалить `device/`

**Files:**
- Modify: `src/routes/train/+page.svelte` (импорты, разметка)
- Delete: `src/components/device/KeyboardRequiredNotice.svelte`
- Delete: `src/components/device/KeyboardRequiredNotice.stories.svelte`

**Interfaces:**
- Consumes: `MessageScreen` из Task 1 — `{ title, body, note?, actionLabel, onAction }`.
- Produces: ничего.

`KeyboardRequiredNotice` — сквозной проброс четырёх пропсов без собственного содержания. Обёртка удаляется, объясняющий комментарий переезжает на место вызова. Каталог `src/components/device/` после этого пуст и исчезает.

- [ ] **Step 1: Заменить импорт**

В `src/routes/train/+page.svelte` удалить строку:

```ts
  import KeyboardRequiredNotice from '@/components/device/KeyboardRequiredNotice.svelte';
```

и добавить в блок импортов:

```ts
  import MessageScreen from '@/components/ui/MessageScreen.svelte';
```

Импорты `TOUCH_ONLY_QUERY`, `isTouchOnlyDevice` из `@/lib/device` **оставить** — удаляется компонент, а не библиотека определения устройства.

- [ ] **Step 2: Заменить разметку**

Было:

```svelte
{#if isTouchOnly && !keyboardConfirmed}
  <KeyboardRequiredNotice
    title={kb.title}
    body={kb.body}
    continueLabel={kb.continue_anyway}
    onContinue={() => (keyboardConfirmed = true)}
  />
```

Стало:

```svelte
{#if isTouchOnly && !keyboardConfirmed}
  <!-- Мягкий гейт, не блок: «Продолжить всё равно» пропускает дальше, если
       эвристика обнаружения соврала (планшет с клавиатурой). -->
  <MessageScreen
    title={kb.title}
    body={kb.body}
    actionLabel={kb.continue_anyway}
    onAction={() => (keyboardConfirmed = true)}
  />
```

Ветки `{:else if ...}` ниже не трогать. `const kb = $derived($dictionary.keyboard_required)` остаётся как есть — ключи словаря не меняются.

- [ ] **Step 3: Удалить каталог**

```bash
git rm src/components/device/KeyboardRequiredNotice.svelte src/components/device/KeyboardRequiredNotice.stories.svelte
```

- [ ] **Step 4: Убедиться, что ссылок не осталось**

```bash
grep -rn "KeyboardRequiredNotice\|components/device" src/ docs/
```

Ожидается: ни одного совпадения в `src/`. Совпадения в `docs/superpowers/` (спек и этот план) — норма, они описывают удаление.

Если совпадение найдено в `src/components/CLAUDE.md` или `docs/06-*.md` — поправить текст: каталог `device/` больше не существует.

- [ ] **Step 5: Проверить**

Запустить: `make check-dev`

Ожидается: `0 ERRORS 0 WARNINGS`, тесты зелёные.

- [ ] **Step 6: Коммит**

```bash
git add -A
git commit -m "refactor(ui): render keyboard gate via MessageScreen, drop device wrapper"
```

---

### Task 5: Финальная проверка ветки

**Files:** изменений кода нет — только проверки и, при необходимости, правки документации.

**Interfaces:**
- Consumes: результат задач 1–4.
- Produces: зелёный `make check-all`.

- [ ] **Step 1: Полный гейт**

Запустить: `make check-all`

Ожидается: lint, `svelte-check`, тесты, `make spell` (0 issues), `make build` и `convex dev --once` — всё зелёное.

Если `make spell` красный — навык `/fix-spell`. Whitelist `.cspell/project-words.txt` держать узким: при сомнении переписывать формулировку в источнике, а не добавлять слово.

- [ ] **Step 2: Проверить три экрана в собранном приложении**

Запустить `make preview`, проверить:

1. `/nonexistent-route` — страница ошибки со статус-кодом.
2. Гейт клавиатуры — DevTools → device toolbar → эмуляция тач-устройства → `/train`. Кнопка «Продолжить всё равно» пропускает дальше.
3. Error-boundary воспроизводить не нужно — разметка идентична проверенной в Storybook.

- [ ] **Step 3: Сверить итог с диффом**

```bash
git diff master --stat
```

Ожидается: `src/components/device/` удалён (2 файла), `src/components/ui/MessageScreen*` добавлены (2 файла), три вызывающих файла заметно короче.

- [ ] **Step 4: Завершение ветки**

Работа по грани #3 в части экрана-сообщения закончена. Дальнейшие шаги грани #3 (surface-плашка, нейтральная кнопка, `ui/Button` с вариантами и ADR под него) — отдельная работа, в эту ветку не входит.

Использовать навык `superpowers:finishing-a-development-branch` для выбора merge / PR / cleanup.

---

## Что в этот план НЕ входит

Перечислено, чтобы исполнитель не расширял охват по ходу:

- **`MainContent .session-error`** не трогается. Вырожденный случай: `h2`, без кнопки, без отступа; втягивание добавило бы компоненту три опциональные оси ради одного вызова. Обоснование — в спеке.
- **`ui/Button` не вводится.** Ghost-кнопка вне экрана-сообщения в проекте не встречается.
- **ADR не заводится.** Добавление примитива в `ui/` применяет действующую конвенцию `src/components/CLAUDE.md`, а не меняет её.
- **Остальные семейства дублей** (surface-плашка ×6, нейтральная кнопка ×3, `.field/.label-text/.hint`, chevron `::after`) — вне охвата.
