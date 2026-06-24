# Stats — таблица сеансов Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Показать данные `sessionSummaries` на `/stats` технической таблицей — строка на завершённый сеанс, колонки: Дата · Время · CPM · Точность.

**Architecture:** Reader-query `api.sessions.listMine` уже есть. Добавляем reactive-store по образцу `repertoire-store` (`convex.onUpdate`, гейт на auth, реактивен по раскладке), вшиваем в `+layout` через `setContext('sessions')`, читаем на `/stats`. Стиль — **inline-плейсхолдер** на глобальных примитивах + нейтральная палитра, **без нового theme-контракта** (как лендинг и текущий `/stats`; CLAUDE.md помечает это допустимым tech-debt для временного технического UI).

**Tech Stack:** SvelteKit 2 / Svelte 5 runes, Convex (`convex.onUpdate` subscription), Vitest. Тест — только на чистую функцию форматирования (как `repertoire-store.test.ts` тестирует `didStepGrow`, но НЕ `$effect`-стор).

**Порядок задач:** 1 (store + formatter) → 2 (i18n) → 3 (layout wiring) → 4 (page, зависит от 1+2+3) → 5 (verify).

**Решения (зафиксированы с пользователем):** колонки минимальные (Дата · Время · CPM · Точность); скоуп — текущая раскладка из настроек; сортировка новые-сверху; гость → приглашение войти, пусто → «сеансов нет»; форматирование как `LessonStatsDisplay` (cpm `Math.round`, точность `toFixed(1)`, время — целые секунды, дата — `Intl.DateTimeFormat`).

**Проверенные факты (не перепроверять):** примитивы `--font-size-sm`, `--font-weight-semibold`, `--spacing-2/4/6`, `--radius-3` есть в `app.css`; палитра `--color-border/-surface/-text-primary/-text-secondary` определена во всех 4 темах + `_template`; `settings.back_button` есть в словарях; `repertoire-store` импортирует `{ api, convex }` в `.svelte.ts` и его тест проходит (тот же паттерн для нас безопасен).

---

### Task 1: Стор сеансов + чистый форматтер строки

**Files:**
- Create: `src/lib/sessions/sessions-store.svelte.ts`
- Test: `src/lib/sessions/sessions-store.test.ts`

Зеркало `src/lib/repertoire/repertoire-store.svelte.ts`: чистый хелпер (`formatSessionRow`) + reactive-стор (`createSessionsStore`) в одном `.svelte.ts`; тест покрывает только хелпер.

- [ ] **Step 1: Написать падающий тест**

```ts
// src/lib/sessions/sessions-store.test.ts
import { describe, expect, test } from 'vitest';
import { formatSessionRow, type SessionSummary } from './sessions-store.svelte';

function session(overrides: Partial<SessionSummary> = {}): SessionSummary {
  return {
    _id: 's1',
    _creationTime: 0,
    userId: 'u1',
    symbolLayoutId: 'йцукен',
    capturedAt: 1782232838140,
    openedSteps: 5,
    durationMs: 61000,
    exposures: 216,
    clean: 210,
    cpm: 200.4,
    latencyMedianMs: 228,
    confusions: [],
    ...overrides,
  } as unknown as SessionSummary;
}

describe('formatSessionRow', () => {
  test('cpm округляется до целого', () => {
    expect(formatSessionRow({ session: session({ cpm: 200.4 }), locale: 'en' }).cpm).toBe(200);
  });

  test('точность = clean / exposures × 100, один знак', () => {
    expect(formatSessionRow({ session: session({ clean: 210, exposures: 216 }), locale: 'en' }).accuracy).toBe('97.2');
  });

  test('точность 0.0 при нулевых exposures (нет деления на ноль)', () => {
    expect(formatSessionRow({ session: session({ clean: 0, exposures: 0 }), locale: 'en' }).accuracy).toBe('0.0');
  });

  test('длительность — целые секунды', () => {
    expect(formatSessionRow({ session: session({ durationMs: 61400 }), locale: 'en' }).durationSeconds).toBe(61);
  });

  test('id прокинут, дата — непустая строка', () => {
    const row = formatSessionRow({ session: session(), locale: 'en' });
    expect(row.id).toBe('s1');
    expect(typeof row.date).toBe('string');
    expect(row.date.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `npx vitest run src/lib/sessions/sessions-store.test.ts`
Expected: FAIL — `Failed to resolve import "./sessions-store.svelte"`.

- [ ] **Step 3: Реализовать стор + форматтер**

```ts
// src/lib/sessions/sessions-store.svelte.ts
import { api, convex } from '@/lib/convex';
import type { FunctionReturnType } from 'convex/server';
import type { AuthStore } from '@/lib/auth/auth-store.svelte';
import type { SymbolLayoutId } from '@/interfaces/types';

// Тип строки журнала берём из Convex-вывода listMine (как RepertoireSnapshot из
// repertoireSnapshot) — без импорта из convex/, codegen уже даёт тип через api.
export type SessionSummary = FunctionReturnType<typeof api.sessions.listMine>[number];

/** Презентационная строка таблицы сеансов. */
export interface SessionRow {
  id: string;
  date: string; // локализованная дата+время
  durationSeconds: number; // целые секунды
  cpm: number; // целое
  accuracy: string; // один знак, напр. "97.2"
}

/** Чистый форматтер: документ сеанса → строка таблицы. Округления как в LessonStatsDisplay. */
export function formatSessionRow({
  session,
  locale,
}: {
  session: SessionSummary;
  locale: string;
}): SessionRow {
  const accuracy = session.exposures > 0 ? (session.clean / session.exposures) * 100 : 0;
  return {
    id: session._id,
    date: new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(session.capturedAt),
    durationSeconds: Math.round(session.durationMs / 1000),
    cpm: Math.round(session.cpm),
    accuracy: accuracy.toFixed(1),
  };
}

/**
 * Reactive store истории сеансов текущего юзера для текущей раскладки. Вызывать в
 * +layout (svelte-context), после auth. Подписка живёт весь сеанс (паттерн
 * repertoire-store): при смене раскладки $effect переподписывается, гость → [].
 */
export function createSessionsStore({
  authStore,
  symbolLayoutId,
}: {
  authStore: AuthStore;
  symbolLayoutId: () => SymbolLayoutId;
}) {
  let sessions = $state<SessionSummary[]>([]);

  $effect(() => {
    if (authStore.state.status !== 'authenticated') {
      sessions = [];
      return;
    }
    const unsubscribe = convex.onUpdate(
      api.sessions.listMine,
      { symbolLayoutId: symbolLayoutId() },
      (result) => {
        sessions = result;
      },
    );
    return () => unsubscribe();
  });

  return {
    get list() {
      return sessions;
    },
  };
}

export type SessionsStore = ReturnType<typeof createSessionsStore>;
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `npx vitest run src/lib/sessions/sessions-store.test.ts`
Expected: PASS (5 тестов).

- [ ] **Step 5: Тип-чек**

Run: `make check`
Expected: PASS (стор и тип `SessionSummary` валидны; `api.sessions.listMine` существует).

- [ ] **Step 6: Commit**

```bash
git add src/lib/sessions/sessions-store.svelte.ts src/lib/sessions/sessions-store.test.ts
git commit -m "feat(stats): sessions-store + formatSessionRow — чтение журнала сеансов"
```

---

### Task 2: Ключи i18n `stats_sessions`

**Files:**
- Modify: `dictionaries/en.json`
- Modify: `dictionaries/ru.json`

Структура обоих словарей должна быть ИДЕНТИЧНОЙ (тип выводится из union; страница читает обе формы).

- [ ] **Step 1: Добавить блок в `dictionaries/en.json`**

Вставить новый top-level ключ `"stats_sessions"` (рядом с `"stats_card"`):

```json
  "stats_sessions": {
    "title": "Training sessions",
    "headers": {
      "date": "Date",
      "duration": "Duration",
      "cpm": "Speed",
      "accuracy": "Accuracy"
    },
    "units": {
      "duration": "s",
      "cpm": "CPM",
      "accuracy": "%"
    },
    "empty": "No sessions yet",
    "guest": "Sign in to see your session history"
  },
```

- [ ] **Step 2: Добавить тот же блок в `dictionaries/ru.json`** (те же ключи, перевод значений)

```json
  "stats_sessions": {
    "title": "История тренировок",
    "headers": {
      "date": "Дата",
      "duration": "Время",
      "cpm": "Скорость",
      "accuracy": "Точность"
    },
    "units": {
      "duration": "с",
      "cpm": "зн/мин",
      "accuracy": "%"
    },
    "empty": "Сеансов пока нет",
    "guest": "Войдите, чтобы видеть историю сеансов"
  },
```

- [ ] **Step 3: Тип-чек (JSON валиден)**

Run: `make check`
Expected: PASS. Примечание: паритет en/ru тут НЕ проверяется (`Dictionary = typeof en`); union-доступ `$dictionary.stats_sessions.*` enforce-ит идентичность форм только на Task 4 (страница). Поэтому ключи в en и ru обязаны быть 1:1 — иначе упадёт `make check` Task 4.

- [ ] **Step 4: Commit**

```bash
git add dictionaries/en.json dictionaries/ru.json
git commit -m "feat(stats): i18n-ключи stats_sessions"
```

---

### Task 3: Вшить стор в `+layout`

**Files:**
- Modify: `src/routes/+layout.svelte`

- [ ] **Step 1: Импортировать фабрику стора**

Рядом с импортом `createRepertoireStore` (строка 7) добавить:

```ts
  import { createSessionsStore } from '@/lib/sessions/sessions-store.svelte';
```

- [ ] **Step 2: Создать стор и положить в context**

Сразу после `setContext('repertoire', repertoireStore);` (строка 45) добавить:

```ts
  const sessionsStore = createSessionsStore({
    authStore,
    symbolLayoutId: () => $settings.symbolLayoutId,
  });
  setContext('sessions', sessionsStore);
```

- [ ] **Step 3: Тип-чек**

Run: `make check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/routes/+layout.svelte
git commit -m "feat(stats): sessions-store в layout-контексте"
```

---

### Task 4: Таблица сеансов на `/stats`

**Files:**
- Modify: `src/routes/stats/+page.svelte` (полная замена содержимого)

- [ ] **Step 1: Переписать страницу**

```svelte
<script lang="ts">
  import { getContext } from 'svelte';
  import { dictionary } from '@/lib/i18n';
  import { settings } from '@/lib/settings';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import type { AuthStore } from '@/lib/auth/auth-store.svelte';
  import { formatSessionRow, type SessionsStore } from '@/lib/sessions/sessions-store.svelte';

  const auth = getContext<AuthStore>('auth');
  const sessions = getContext<SessionsStore>('sessions');

  const t = $derived($dictionary.stats_sessions);
  // listMine отдаёт старые→новые (_creationTime asc); в таблице — новые сверху.
  const rows = $derived(
    sessions.list
      .map((session) => formatSessionRow({ session, locale: $settings.interfaceLanguage }))
      .reverse(),
  );
</script>

<div class="stats-page">
  <h2 class="screen-title">{t.title}</h2>

  {#if auth.state.status === 'guest'}
    <p class="muted">{t.guest}</p>
  {:else if auth.state.status === 'loading'}
    <!-- ждём auth/данные: ничего не рендерим, чтобы не мигать «пусто» -->
  {:else if rows.length === 0}
    <p class="muted">{t.empty}</p>
  {:else}
    <table class="sessions">
      <thead>
        <tr>
          <th>{t.headers.date}</th>
          <th class="num">{t.headers.duration}</th>
          <th class="num">{t.headers.cpm}</th>
          <th class="num">{t.headers.accuracy}</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as row (row.id)}
          <tr>
            <td>{row.date}</td>
            <td class="num">{row.durationSeconds} {t.units.duration}</td>
            <td class="num">{row.cpm} {t.units.cpm}</td>
            <td class="num">{row.accuracy}{t.units.accuracy}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}

  <button type="button" class="btn" onclick={() => goto(resolve('/'))}>
    {$dictionary.settings.back_button}
  </button>
</div>

<style>
  /* inline-стили временной технической страницы: глобальные примитивы + нейтральная
     палитра напрямую, без theme-контракта — как лендинг. */
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

  .muted {
    color: var(--color-text-secondary);
  }

  .sessions {
    border-collapse: collapse;
    font-size: var(--font-size-sm);
    font-variant-numeric: tabular-nums;
  }

  .sessions th,
  .sessions td {
    padding: var(--spacing-2) var(--spacing-4);
    border-bottom: 1px solid var(--color-border);
    text-align: left;
    white-space: nowrap;
  }

  .sessions th {
    color: var(--color-text-secondary);
    font-weight: var(--font-weight-semibold);
  }

  .sessions td {
    color: var(--color-text-primary);
  }

  .sessions .num {
    text-align: right;
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

- [ ] **Step 2: Тип-чек + тесты**

Run: `make check` then `make test`
Expected: оба PASS (`getContext('sessions')` типизирован `SessionsStore`; `$dictionary.stats_sessions` существует в обоих словарях).

- [ ] **Step 3: Commit**

```bash
git add src/routes/stats/+page.svelte
git commit -m "feat(stats): таблица сеансов на /stats"
```

---

### Task 5: Финальная верификация (skill: verification-before-completion)

**Files:** — (только проверки)

- [ ] **Step 1: Полная проверка**

Run: `make check-all`
Expected: PASS — lint + check + test + spell + build. `make spell` сканирует `src/**/*.svelte`, `dictionaries/*.json` и `**/*.md`. Ожидаемые новые слова: «сеанс/сеансы/сеансов» (ru.json + комментарии) — реальные русские слова → каждую форму в `cspell.json` → `words`. Калька «плейсхолдер» из shipped-кода уже убрана (Task 4 комментарий переписан); если всплывёт где-то ещё — переписать, не whitelist'ить. Прочее — по правилам CLAUDE.md / `/fix-spell`.

- [ ] **Step 2: Дымовая проверка вручную (рекомендуется)**

Запустить `make convex` + `make dev`, залогиниться, пройти ≥1 сессию (≥5 символов, иначе guard `MIN_JOURNAL_EXPOSURES` не запишет), открыть `/stats`. Ожидать: таблица со строкой(ами), новые сверху, Дата/Время/CPM/Точность заполнены; смена темы (Settings) не ломает вид (палитра наследуется); гость на `/stats` видит приглашение войти.

---

## Self-Review

**Spec coverage:**
- Чтение `sessionSummaries` на клиенте (reactive) → Task 1 (`createSessionsStore` через `convex.onUpdate(api.sessions.listMine)`). ✓
- Техническая таблица, строка на сеанс, колонки Дата·Время·CPM·Точность → Task 4. ✓
- Без нового theme-контракта (inline-плейсхолдер) → Task 4 (палитра/примитивы напрямую). ✓
- Гость/пусто/данные состояния → Task 4. ✓
- Текущая раскладка, новые сверху, форматирование как LessonStatsDisplay → Task 1 (`formatSessionRow`) + Task 4 (`.reverse()`). ✓
- i18n → Task 2. ✓

**Type consistency:** `SessionSummary`/`SessionRow`/`SessionsStore`/`formatSessionRow` объявлены в `sessions-store.svelte.ts` (Task 1), импортируются в page (Task 4) и тест (Task 1). `formatSessionRow({ session, locale })` — единая сигнатура. `$dictionary.stats_sessions.{title,headers.{date,duration,cpm,accuracy},units.{duration,cpm,accuracy},empty,guest}` — те же ключи в en/ru (Task 2) и в шаблоне (Task 4). Контекст-ключ `'sessions'` — один и тот же в layout (Task 3) и page (Task 4).

**Placeholder scan:** весь код приведён; имена примитивов/палитры/словарей предварительно проверены в кодовой базе; команды и ожидания конкретны.
