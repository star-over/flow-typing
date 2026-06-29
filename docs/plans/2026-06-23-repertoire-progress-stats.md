# Прогресс ступени в статистике сессии — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** В экране `sessionComplete` рядом со скоростной статистикой показать прогресс репертуара — текущую ступень, готовность к следующей и что тормозит, читая server-authoritative профиль.

**Architecture:** Серверный reader-`query` отдаёт снимок прогресса (CQRS — не пишет профиль, повторно использует Readiness-логику этапа репертуара). Клиент держит реактивный store на `convex.onUpdate` (паттерн `auth-store`), показывает блок в `sessionComplete`. Скоростная витрина (`cpm`/`wpm`) остаётся клиентской (ADR 0006) — не трогаем.

**Tech Stack:** Convex (query + handler-паттерн), TypeScript strict, Vitest projects (`shared`/`convex`/`src`), Svelte 5 runes, theme-контракты (docs/06).

**Канон:** ADR 0005 (server-authoritative профиль, reader), ADR 0008 (Readiness/рост), CONTEXT.md (Skill Level — витрина; Repertoire/Readiness), docs/06 (компонентные контракты).

> **Дизайн зафиксирован (brainstorming):** детализация — сводно (ступень + «N из M готово, осталось K» + что тормозит сводно, без посимвольной таблицы); когда показывать — реактивно через `onUpdate` + показ перехода («открыта новая ступень»); названия ступеней — номер («Ступень 3 из 10»); гость — приглашение войти.

---

## Границы

**Входит:** чистая функция снимка прогресса (shared); reader-query (convex); реактивный клиентский store + context; UI-блок прогресса + theme-контракт; i18n; встройка в `sessionComplete`.

**Не входит:** перенос `cpm`/`wpm` на сервер (против ADR 0006 — остаются клиентскими); посимвольная таблица; понятные названия ступеней (только номер); агрегатная история (`/stats` — отдельная функция); рост репертуара (готов в этапе репертуара).

**Ветка:** `feat/repertoire-progress-stats` (создать от текущей `feat/auto-flow-repertoire`).

## File Structure

| Файл | Ответственность | Действие |
|---|---|---|
| `shared/repertoire/readiness.ts` | + `readinessGaps` (по каким условиям символ не готов); `isSymbolReady` выразить через неё | Modify |
| `shared/repertoire/progress.ts` | `computeRepertoireProgress` (чистая: профиль+layout → снимок) | Create |
| `convex/drill.ts` | `repertoireSnapshotHandler` + `repertoireSnapshot` query (reader) | Modify |
| `src/lib/repertoire/repertoire-store.svelte.ts` | реактивный store (`onUpdate`) + определение перехода | Create |
| `src/routes/+layout.svelte` | создать store, `setContext('repertoire', …)`, отметка старта сессии | Modify |
| `src/components/ui/RepertoireProgress.svelte` + `.contract.ts` | UI-блок прогресса | Create |
| `src/themes/{light,dark,sepia,nord,_template}.css` | токены контракта | Modify |
| `src/themes/contract.ts` | агрегировать `REPERTOIRE_PROGRESS_CONTRACT` | Modify |
| `src/components/app/MainContent.svelte` | рендер блока в `sessionComplete` | Modify |
| `dictionaries/{en,ru}.json` | строки блока | Modify |

---

## Task 1: `readinessGaps` — детализация невыполненных условий

**Files:** Modify `shared/repertoire/readiness.ts`; Test `shared/repertoire/readiness.test.ts`

Сейчас `isSymbolReady` возвращает `boolean`. Для «что тормозит» нужна разбивка по трём условиям без дублирования логики порогов.

- [ ] **Step 1: Написать падающий тест**

```ts
// добавить в shared/repertoire/readiness.test.ts
import { readinessGaps } from './readiness.ts';

describe('readinessGaps', () => {
  const P = { minExposures: 20, minFirstTryAccuracy: 0.9, latencyK: 1.5 };
  test('нет ячейки — все три условия не выполнены', () => {
    expect(readinessGaps({ cell: undefined, params: P, repertoireMedianLatency: 200 }))
      .toEqual({ exposure: true, accuracy: true, latency: true });
  });
  test('готовый символ — условия не нарушены', () => {
    expect(readinessGaps({ cell: { symbol: 'а', exposures: 30, clean: 29, latencyEwma: 200, latencySamples: 30 }, params: P, repertoireMedianLatency: 200 }))
      .toEqual({ exposure: false, accuracy: false, latency: false });
  });
  test('мало предъявлений → точность/латентность не оценивать (нет данных)', () => {
    expect(readinessGaps({ cell: { symbol: 'а', exposures: 5, clean: 5, latencyEwma: 0, latencySamples: 0 }, params: P, repertoireMedianLatency: 200 }))
      .toEqual({ exposure: true, accuracy: false, latency: false });
  });
  test('хватает предъявлений, низкая точность → accuracy не выполнено', () => {
    expect(readinessGaps({ cell: { symbol: 'а', exposures: 30, clean: 20, latencyEwma: 200, latencySamples: 30 }, params: P, repertoireMedianLatency: 200 }))
      .toMatchObject({ exposure: false, accuracy: true });
  });
  test('медленнее k× медианы → latency не выполнено', () => {
    expect(readinessGaps({ cell: { symbol: 'а', exposures: 30, clean: 29, latencyEwma: 400, latencySamples: 30 }, params: P, repertoireMedianLatency: 200 }))
      .toMatchObject({ latency: true });
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

Run: `npx vitest run shared/repertoire/readiness.test.ts`
Expected: FAIL — `readinessGaps` не экспортирован.

- [ ] **Step 3: Реализовать** (в `shared/repertoire/readiness.ts`)

```ts
export interface ReadinessGaps {
  exposure: boolean; // не хватает предъявлений
  accuracy: boolean; // точность с первой попытки ниже порога
  latency: boolean;  // медленнее k× медианы репертуара
}

/**
 * Какие условия Readiness символ НЕ выполнил. Точность/латентность оцениваем только
 * при достаточных предъявлениях (иначе нет данных); латентность — только при
 * собственных замерах и ненулевой медиане репертуара (холодный старт не штрафуем).
 */
export function readinessGaps({
  cell,
  params,
  repertoireMedianLatency,
}: {
  cell: ProfileCell | undefined;
  params: ReadinessParams;
  repertoireMedianLatency: number;
}): ReadinessGaps {
  if (!cell || cell.exposures < params.minExposures) {
    return { exposure: true, accuracy: false, latency: false };
  }
  const accuracy = cell.clean / cell.exposures < params.minFirstTryAccuracy;
  const latency =
    cell.latencySamples > 0 &&
    repertoireMedianLatency > 0 &&
    cell.latencyEwma > params.latencyK * repertoireMedianLatency;
  return { exposure: false, accuracy, latency };
}
```

Переписать `isSymbolReady` через неё (без дубля порогов):

```ts
export function isSymbolReady({ cell, params, repertoireMedianLatency }: {
  cell: ProfileCell | undefined;
  params: ReadinessParams;
  repertoireMedianLatency: number;
}): boolean {
  const gaps = readinessGaps({ cell, params, repertoireMedianLatency });
  return !gaps.exposure && !gaps.accuracy && !gaps.latency;
}
```

- [ ] **Step 4: Запустить — PASS**

Run: `npx vitest run shared/repertoire/readiness.test.ts`
Expected: PASS (прежние `isSymbolReady` тесты + новые `readinessGaps`).

- [ ] **Step 5: Commit**

```bash
git add shared/repertoire/readiness.ts shared/repertoire/readiness.test.ts
git commit -m "feat(repertoire): readinessGaps — разбивка невыполненных условий"
```
Trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## Task 2: `computeRepertoireProgress` — чистый снимок

**Files:** Create `shared/repertoire/progress.ts`; Test `shared/repertoire/progress.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
// shared/repertoire/progress.test.ts
import { describe, expect, test } from 'vitest';
import { computeRepertoireProgress } from './progress.ts';
import { jcukenKeyLadder } from '../key-ladder/jcuken.ts';
import type { SymbolEntry } from '../symbol-layout.ts';
import type { ProfileCell } from './readiness.ts';

// Шаг 0 йцукен = 13 символов (Space + указательные). Берём подмножество для теста.
const LAYOUT: SymbolEntry[] = [
  { symbol: 'а', keyCaps: ['KeyF'] },
  { symbol: 'о', keyCaps: ['KeyJ'] },
  { symbol: 'в', keyCaps: ['KeyD'] }, // шаг 1
];
const ready = (s: string): ProfileCell => ({ symbol: s, exposures: 30, clean: 29, latencyEwma: 200, latencySamples: 30 });

describe('computeRepertoireProgress', () => {
  test('ступень, готовность и долг по текущему шагу', () => {
    const p = computeRepertoireProgress({
      openedSteps: 1, symbolCells: [ready('а')], symbolLayout: LAYOUT, keyLadder: jcukenKeyLadder,
    });
    expect(p.openedSteps).toBe(1);
    expect(p.maxStep).toBe(9);
    expect(p.totalOnStep).toBe(2);   // 'а','о' на шаге 0 (в LAYOUT)
    expect(p.readyCount).toBe(1);    // 'а' готов
    expect(p.blockers.exposure).toBe(1); // 'о' без ячейки → не добрал предъявлений
  });

  test('maturingNeeded учитывает долговой лимит', () => {
    // 1 готов из 2, не-готовых 1 ≤ долговой лимит 2 → дозревать никого не нужно.
    const p = computeRepertoireProgress({
      openedSteps: 1, symbolCells: [ready('а')], symbolLayout: LAYOUT, keyLadder: jcukenKeyLadder,
    });
    expect(p.maturingNeeded).toBe(0);
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

Run: `npx vitest run shared/repertoire/progress.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать** `shared/repertoire/progress.ts`

```ts
/**
 * @file Снимок прогресса репертуара для UI (чистая функция). Текущая ступень +
 * готовность символов текущего шага + что тормозит. Повторно использует Readiness
 * этапа репертуара (ADR 0008). Витринная производная — в подборе не участвует.
 */
import type { KeyLadder } from '../key-ladder/types.ts';
import { maxLadderStep } from '../key-ladder/key-step-map.ts';
import { symbolsAtStep } from '../key-ladder/step-symbols.ts';
import type { SymbolEntry } from '../symbol-layout.ts';
import { readinessGaps, repertoireMedianLatency, type ProfileCell } from './readiness.ts';
import { READINESS_PARAMS, REPERTOIRE_DEBT_LIMIT } from './config.ts';

export interface RepertoireProgress {
  openedSteps: number;        // текущая ступень (сколько шагов открыто)
  maxStep: number;            // макс. шаг лестницы
  totalOnStep: number;        // символов текущего шага
  readyCount: number;         // из них готовых
  maturingNeeded: number;     // сколько ещё должно дозреть до открытия (с учётом долгового лимита)
  blockers: { exposure: number; accuracy: number; latency: number }; // сколько не-готовых проседают по каждому условию
}

export function computeRepertoireProgress({
  openedSteps,
  symbolCells,
  symbolLayout,
  keyLadder,
}: {
  openedSteps: number;
  symbolCells: readonly ProfileCell[];
  symbolLayout: SymbolEntry[];
  keyLadder: KeyLadder;
}): RepertoireProgress {
  const currentStepSymbols = symbolsAtStep({ step: openedSteps - 1, symbolLayout, ladder: keyLadder });
  const median = repertoireMedianLatency(symbolCells);
  const bySymbol = new Map(symbolCells.map((c) => [c.symbol, c]));
  const blockers = { exposure: 0, accuracy: 0, latency: 0 };
  let readyCount = 0;
  for (const symbol of currentStepSymbols) {
    const gaps = readinessGaps({ cell: bySymbol.get(symbol), params: READINESS_PARAMS, repertoireMedianLatency: median });
    if (!gaps.exposure && !gaps.accuracy && !gaps.latency) {
      readyCount += 1;
      continue;
    }
    if (gaps.exposure) blockers.exposure += 1;
    if (gaps.accuracy) blockers.accuracy += 1;
    if (gaps.latency) blockers.latency += 1;
  }
  const notReady = currentStepSymbols.length - readyCount;
  return {
    openedSteps,
    maxStep: maxLadderStep(keyLadder),
    totalOnStep: currentStepSymbols.length,
    readyCount,
    maturingNeeded: Math.max(0, notReady - REPERTOIRE_DEBT_LIMIT),
    blockers,
  };
}
```

- [ ] **Step 4: Запустить — PASS**

Run: `npx vitest run shared/repertoire/progress.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/repertoire/progress.ts shared/repertoire/progress.test.ts
git commit -m "feat(repertoire): computeRepertoireProgress — снимок прогресса для UI"
```
Trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## Task 3: `repertoireSnapshot` query (reader)

**Files:** Modify `convex/drill.ts`; Test `convex/drill.test.ts`

- [ ] **Step 1: Написать падающий тест** (добавить в `convex/drill.test.ts`)

```ts
import { repertoireSnapshotHandler } from './drill';

describe('repertoireSnapshotHandler — снимок прогресса', () => {
  test('гость (null userId) → null', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      expect(await repertoireSnapshotHandler({ ctx, userId: null, symbolLayoutId: 'йцукен' })).toBeNull();
    });
  });
  test('нет профиля → cold-start ступень 1', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { name: 'U' });
      const snap = await repertoireSnapshotHandler({ ctx, userId, symbolLayoutId: 'йцукен' });
      expect(snap?.openedSteps).toBe(1);
      expect(snap?.totalOnStep).toBe(13); // шаг 0 йцукен
      expect(snap?.readyCount).toBe(0);
    });
  });
  test('профиль с ростом → текущая ступень и готовность', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { name: 'U' });
      await ctx.db.insert('skillProfiles', { userId, symbolLayoutId: 'йцукен', openedSteps: 2,
        symbolCells: [{ symbol: 'е', exposures: 30, clean: 30, latencyEwma: 150, latencySamples: 30 }], updatedAt: 1 });
      const snap = await repertoireSnapshotHandler({ ctx, userId, symbolLayoutId: 'йцукен' });
      expect(snap?.openedSteps).toBe(2);
    });
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

Run: `npx vitest run convex/drill.test.ts -t "снимок прогресса"`
Expected: FAIL — `repertoireSnapshotHandler` не экспортирован.

- [ ] **Step 3: Реализовать** (в `convex/drill.ts`)

Импорты:
```ts
import { computeRepertoireProgress, type RepertoireProgress } from '../shared/repertoire/progress.ts';
import { query } from './_generated/server';
import type { QueryCtx } from './_generated/server';
```

Handler (reader, повторно использует `resolveOpenedSteps`-подобное чтение и `getLayoutData`):

```ts
/** Снимок прогресса репертуара для UI. null для гостя/неизвестной раскладки. */
export async function repertoireSnapshotHandler({
  ctx,
  userId,
  symbolLayoutId,
}: {
  ctx: QueryCtx;
  userId: Id<'users'> | null;
  symbolLayoutId: string;
}): Promise<RepertoireProgress | null> {
  if (userId === null) return null;
  const layoutData = getLayoutData(symbolLayoutId);
  if (!layoutData) return null;
  const profile = await ctx.db
    .query('skillProfiles')
    .withIndex('by_user_and_layout', (q) => q.eq('userId', userId).eq('symbolLayoutId', symbolLayoutId))
    .unique();
  return computeRepertoireProgress({
    openedSteps: profile?.openedSteps ?? DEFAULT_OPENED_STEPS,
    symbolCells: profile?.symbolCells ?? [],
    symbolLayout: layoutData.symbolLayout,
    keyLadder: layoutData.keyLadder,
  });
}

export const repertoireSnapshot = query({
  args: { symbolLayoutId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    return await repertoireSnapshotHandler({ ctx, userId, symbolLayoutId: args.symbolLayoutId });
  },
});
```

Примечание: `getLayoutData`/`DEFAULT_OPENED_STEPS`/`getAuthUserId`/`Id`/`v` уже импортированы в `drill.ts`. `resolveOpenedSteps` (mutation-ctx) не повторно используем — здесь `QueryCtx` и нужны ещё `symbolCells`, читаем профиль напрямую.

- [ ] **Step 4: Запустить — PASS**

Run: `npx vitest run convex/drill.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add convex/drill.ts convex/drill.test.ts
git commit -m "feat(repertoire): repertoireSnapshot query (reader) для UI прогресса"
```
Trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## Task 4: Реактивный клиентский store + переход

**Files:** Create `src/lib/repertoire/repertoire-store.svelte.ts`; Test `src/lib/repertoire/repertoire-store.test.ts`

Store держит снимок (`onUpdate`) и определяет «ступень выросла с начала текущей сессии». Чистую функцию перехода выносим, чтобы тестировать без Convex.

- [ ] **Step 1: Написать падающий тест** (чистая функция перехода)

```ts
// src/lib/repertoire/repertoire-store.test.ts
import { describe, expect, test } from 'vitest';
import { didStepGrow } from './repertoire-store.svelte';

describe('didStepGrow', () => {
  test('текущая ступень выше отметки старта → рост', () => {
    expect(didStepGrow({ startStep: 1, currentStep: 2 })).toBe(true);
  });
  test('равна или ниже → нет роста', () => {
    expect(didStepGrow({ startStep: 2, currentStep: 2 })).toBe(false);
    expect(didStepGrow({ startStep: null, currentStep: 2 })).toBe(false);
    expect(didStepGrow({ startStep: 2, currentStep: null })).toBe(false);
  });
});
```

- [ ] **Step 2: Запустить — FAIL**

Run: `npx vitest run src/lib/repertoire/repertoire-store.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать** `src/lib/repertoire/repertoire-store.svelte.ts`

```ts
import { api, convex } from '@/lib/convex';
import type { FunctionReturnType } from 'convex/server';
import type { AuthStore } from '@/lib/auth/auth-store.svelte';
import type { SymbolLayoutId } from '@/interfaces/types';

// Тип снимка берём из Convex-вывода функции (= RepertoireProgress | null),
// БЕЗ импорта из shared/ — у src нет прецедента импорта из shared, а Convex codegen
// уже даёт нам этот тип через api. Экспортируем для UI-компонента.
export type RepertoireSnapshot = FunctionReturnType<typeof api.drill.repertoireSnapshot>;

/** Чистый предикат «ступень выросла с отметки старта сессии». */
export function didStepGrow({ startStep, currentStep }: { startStep: number | null; currentStep: number | null }): boolean {
  if (startStep === null || currentStep === null) return false;
  return currentStep > startStep;
}

/**
 * Reactive store снимка прогресса репертуара. Вызывать в +layout (svelte-context),
 * после auth. Подписка живёт весь сеанс (паттерн auth-store); markSessionStart
 * фиксирует ступень на входе в тренировку — для показа её изменения в sessionComplete.
 */
export function createRepertoireStore({ authStore, symbolLayoutId }: { authStore: AuthStore; symbolLayoutId: () => SymbolLayoutId }) {
  let snapshot = $state<RepertoireSnapshot>(null);
  let startStep = $state<number | null>(null);

  $effect(() => {
    if (authStore.state.status !== 'authenticated') {
      snapshot = null;
      return;
    }
    const unsubscribe = convex.onUpdate(api.drill.repertoireSnapshot, { symbolLayoutId: symbolLayoutId() }, (result) => {
      snapshot = result;
    });
    return () => unsubscribe();
  });

  return {
    get snapshot() {
      return snapshot;
    },
    get grew() {
      return didStepGrow({ startStep, currentStep: snapshot?.openedSteps ?? null });
    },
    markSessionStart() {
      startStep = snapshot?.openedSteps ?? null;
    },
  };
}

export type RepertoireStore = ReturnType<typeof createRepertoireStore>;
```

- [ ] **Step 4: Запустить — PASS**

Run: `npx vitest run src/lib/repertoire/repertoire-store.test.ts`
Expected: PASS (`didStepGrow`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/repertoire/repertoire-store.svelte.ts src/lib/repertoire/repertoire-store.test.ts
git commit -m "feat(repertoire): реактивный store снимка прогресса + определение перехода"
```
Trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## Task 5: i18n строки

**Files:** Modify `dictionaries/en.json`, `dictionaries/ru.json`

- [ ] **Step 1: Добавить ключи** (форму сверить с существующей структурой словаря — найти секцию рядом со статистикой урока).

`dictionaries/ru.json` — добавить блок (вписать в существующую вложенность, например рядом с `stats_card`):
```json
"repertoire_progress": {
  "title": "Прогресс ступени",
  "step": "Ступень {current} из {max}",
  "ready": "{ready} из {total} символов готово",
  "maturing": "Осталось закрепить: {count}",
  "ready_to_advance": "Готово к следующей ступени",
  "new_step": "Открыта новая ступень!",
  "blockers_practice": "нужно больше практики",
  "blockers_accuracy": "нужна точность",
  "blockers_speed": "нужна скорость",
  "guest_invite": "Войдите, чтобы сохранять прогресс ступеней"
}
```
`dictionaries/en.json` — зеркально (en-формулировки).

- [ ] **Step 2: Проверить, что i18n не сломан** — `make check` (типы словаря) + `npx vitest run src/lib/i18n.test.ts` если есть.

Expected: 0 ошибок.

- [ ] **Step 3: Commit**

```bash
git add dictionaries/en.json dictionaries/ru.json
git commit -m "i18n: строки блока прогресса ступени"
```
Trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## Task 6: UI-компонент + theme-контракт

**Files:** Create `src/components/ui/RepertoireProgress.svelte`, `src/components/ui/RepertoireProgress.contract.ts`; Modify `src/themes/contract.ts`, `src/themes/{light,dark,sepia,nord,_template}.css`

- [ ] **Step 1: Контракт** `src/components/ui/RepertoireProgress.contract.ts`

```ts
/**
 * Theme contract for RepertoireProgress.svelte — блок прогресса ступени в
 * sessionComplete. Контракт-тест (src/themes/contract.test.ts) требует токены
 * в каждой теме.
 */
export const REPERTOIRE_PROGRESS_CONTRACT = [
  '--repertoire-progress-background',     // фон карточки
  '--repertoire-progress-border',         // рамка карточки
  '--repertoire-progress-label-color',    // подписи
  '--repertoire-progress-value-color',    // ступень/числа
  '--repertoire-progress-bar-track',      // фон прогресс-полосы
  '--repertoire-progress-bar-fill',       // заполнение прогресс-полосы
  '--repertoire-progress-accent-color',   // акцент «новая ступень»
] as const satisfies readonly `--${string}`[];

export type RepertoireProgressContractToken = (typeof REPERTOIRE_PROGRESS_CONTRACT)[number];
```

- [ ] **Step 2: Агрегировать в `src/themes/contract.ts`** — импорт + спред `...REPERTOIRE_PROGRESS_CONTRACT` в `THEME_CONTRACT` (рядом с `LESSON_STATS_DISPLAY_CONTRACT`).

- [ ] **Step 3: Запустить контракт-тест — FAIL**

Run: `npx vitest run src/themes/contract.test.ts`
Expected: FAIL — темы не декларируют новые 7 токенов.

- [ ] **Step 4: Добавить токены во все темы** — в `light.css`, `dark.css`, `sepia.css`, `nord.css` декларировать каждый из 7 токенов (значения — по внутренней палитре темы, в стиле соседних `--lesson-stats-display-*`); в `_template.css` — каждый как `unset`. Значения свободны, контракт-тест проверяет лишь наличие.

- [ ] **Step 5: Запустить контракт-тест — PASS**

Run: `npx vitest run src/themes/contract.test.ts`
Expected: PASS.

- [ ] **Step 6: Компонент** `src/components/ui/RepertoireProgress.svelte`

Props: `{ snapshot: RepertoireSnapshot; grew: boolean; isGuest: boolean; dictionary: Dictionary }` (тип `RepertoireSnapshot` импортировать из `@/lib/repertoire/repertoire-store.svelte` — он = `RepertoireProgress | null` из Convex-вывода, без импорта shared). Логика рендера:
- `isGuest` → блок с `dictionary…guest_invite`;
- `snapshot` есть → заголовок `step` (openedSteps/maxStep), строка `ready` (readyCount/totalOnStep), прогресс-полоса (readyCount/totalOnStep), статус: `grew` → `new_step` (акцент); иначе `maturingNeeded===0` → `ready_to_advance`; иначе `maturing` (maturingNeeded) + активные `blockers_*` (где счётчик > 0);
- `snapshot === null` и не гость → ничего (degenerate, как `lessonStats`).

Все цвета — через `var(--repertoire-progress-*)`. Числа подставлять в i18n-строки (формат `{current}` и т.п. — как в существующих компонентах).

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/RepertoireProgress.svelte src/components/ui/RepertoireProgress.contract.ts src/themes/
git commit -m "feat(repertoire): UI-блок прогресса ступени + theme-контракт"
```
Trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## Task 7: Встройка в sessionComplete + проводка store

**Files:** Modify `src/routes/+layout.svelte`, `src/components/app/MainContent.svelte`

- [ ] **Step 1: Проводка store в `+layout.svelte`**

После `createAuthStore`/`setContext('auth', …)` добавить:
```ts
import { createRepertoireStore } from '@/lib/repertoire/repertoire-store.svelte';
// ...
const repertoireStore = createRepertoireStore({
  authStore,
  symbolLayoutId: () => $settings.symbolLayoutId,
});
setContext('repertoire', repertoireStore);

// Отметить ступень на входе в тренировку — для показа перехода в sessionComplete.
$effect(() => {
  if (inState({ snapshot: state, value: 'training' })) repertoireStore.markSessionStart();
});
```

- [ ] **Step 2: Рендер в `MainContent.svelte`**

Импорт + получить store из context:
```ts
import { getContext } from 'svelte';
import RepertoireProgress from '@/components/ui/RepertoireProgress.svelte';
import type { RepertoireStore } from '@/lib/repertoire/repertoire-store.svelte';
import type { AuthStore } from '@/lib/auth/auth-store.svelte';
const repertoire = getContext<RepertoireStore>('repertoire');
const auth = getContext<AuthStore>('auth');
```

В ветке `sessionComplete` рядом с `LessonStatsDisplay`:
```svelte
{:else if inState({ snapshot: state, value: 'sessionComplete' }) && lessonStats}
  <LessonStatsDisplay stats={lessonStats} {dictionary} />
  <RepertoireProgress
    snapshot={repertoire.snapshot}
    grew={repertoire.grew}
    isGuest={auth.state.status === 'guest'}
    {dictionary}
  />
{:else if …}
```

- [ ] **Step 3: Запустить — типы + тесты машин**

Run: `make check && npx vitest run src/`
Expected: 0 ошибок, тесты зелёные.

- [ ] **Step 4: Commit**

```bash
git add src/routes/+layout.svelte src/components/app/MainContent.svelte
git commit -m "feat(repertoire): показать блок прогресса в sessionComplete"
```
Trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## Task 8: Зелёная проверка + реальный push + ручная проверка

- [ ] **Step 1: Полная проверка** — `make check-all` (lint `--max-warnings 0` · check · test · spell · build). Spell-красноту разбирать по правилам CLAUDE.md (`/fix-spell`).
- [ ] **Step 2: Convex push** — `npx convex dev --once` (новый `query` — подтвердить развёртывание, имена модулей без дефисов).
- [ ] **Step 3: Ручная проверка** — `make dev` + `make convex`, залогиниться, пройти сессию: в `sessionComplete` виден блок «Прогресс ступени» (ступень N из 10, готовность, что тормозит); засеять профиль на грани готовности → увидеть «Открыта новая ступень!»; выйти → у гостя блок-приглашение войти.
- [ ] **Step 4: Commit (если правки проверки)** — осмысленное сообщение.

## Готово, когда

- В `sessionComplete` рядом со скоростью виден блок прогресса: ступень (номер из max), готовность (N из M), что тормозит (сводно), переход «новая ступень».
- Гость видит приглашение войти; авторизованный — реальные данные из профиля.
- Снимок реактивен (`onUpdate`) — обновляется, когда рост долетает.
- `cpm`/`wpm` не тронуты (клиентские).
- `make check-all` зелёный; `convex dev --once` проходит без ошибок; ручная проверка пройдена.

## Merge

```bash
git switch feat/auto-flow-repertoire && git merge --no-ff feat/repertoire-progress-stats
```
(или прямо в master, если ветка репертуара уже влита — по решению пользователя.)
