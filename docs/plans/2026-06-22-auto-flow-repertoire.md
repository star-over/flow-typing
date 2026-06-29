# Auto-Flow «Рост набора букв» — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Замкнуть петлю репертуара — `drillRecord` после записи сводки монотонно растит `openedSteps` по Readiness, а `drillNext` читает `openedSteps` из профиля вместо аргумента.

**Architecture:** CQRS (ADR 0008). Чистые функции роста живут в `shared/` (доменное ядро, проект тестов `shared`), серверный писатель `drillRecord` их применяет, серверный читатель `drillNext` тянет `openedSteps` из server-authoritative профиля. Клиент перестаёт быть носителем репертуара — `openedSteps` уходит с провода (поправка ADR 0006).

**Tech Stack:** Convex (mutation/handler-паттерн), TypeScript strict, Vitest projects (`shared` node, `convex` edge-runtime), XState v5 (клиентские машины).

**Канон:** ADR 0008 (решения), ADR 0001 (репертуар-префикс), ADR 0005/0006 (контракт), CONTEXT.md (Repertoire, Readiness, CQRS-карта), docs/plans/auto-flow.md (этап 2 + границы).

> **Аудит (4 агента, чистый контекст):** план прошёл по канону и технике без critical. Учтены: DRY-консолидация (единый источник раскладок + повторное использование `computeStepLevel`/`maxLadderStep`/`SymbolEntry`), robustness писателя (нет throw на неизвестной раскладке), пробелы тестов (insert-без-роста, layout-mismatch, чётная медиана, граница латентности), точность правок (`session.machine.test.ts:38`, устаревшие комментарии, поправка ADR 0005).

---

## Границы

**Входит:** чистые функции Readiness + решения о росте; рост `openedSteps` в `drillRecord`; чтение `openedSteps` из профиля в `drillNext`; снятие `openedSteps` с клиентского провода; DRY-консолидация источника раскладок в `convex/`.

**Не входит** (осознанно):
- прицельная подача недозревших (фокус — этап 3); гость остаётся на cold-start без роста (анонимный профиль — отдельный этап);
- многошаговый рост за один чекпоинт / «ускоренная лестница опытного» (CONTEXT.md «Репертуар растёт шагами», п. про масштаб шага) — здесь рост строго +1 за чекпоинт; данных на опережающие шаги нет (YAGNI);
- подбор значений чисел (провизорные, «Числа-настройки»).

**Миграция не нужна:** `openedSteps` уже в схеме (`skillProfiles.openedSteps: v.number()`) на каждом существующем профиле; смысл поля не меняется — меняется лишь кто его пишет (`drillRecord`) и читает (`drillNext`). Существующие значения читаются как есть.

**Ветка:** `feat/auto-flow-repertoire` (текущая).

## File Structure

| Файл | Ответственность | Действие |
|---|---|---|
| `shared/key-ladder/key-step-map.ts` | + `maxLadderStep(ladder)` рядом с `keyStepMap` | Modify |
| `shared/key-ladder/validate.ts` | переиспользовать `maxLadderStep` вместо inline | Modify |
| `shared/key-ladder/step-symbols.ts` | `symbolsAtStep` (через `computeStepLevel`, без новой копии) | Create |
| `shared/repertoire/config.ts` | провизорные числа Readiness + долговой лимит («Числа-настройки» одной группой) | Create |
| `shared/repertoire/readiness.ts` | `isSymbolReady`, `repertoireMedianLatency` (чистые) | Create |
| `shared/repertoire/growth.ts` | `decideOpenedSteps` (чистая, монотонный +1) | Create |
| `convex/layout-data.ts` | единый источник `getLayoutData(layoutId) → {symbolLayout, keyLadder} \| null` | Create |
| `convex/selectionIndex.ts` | переиспользовать `getLayoutData` вместо локального `LAYOUTS` | Modify |
| `convex/drill.ts` | рост в `applyDrillSummaryHandler` (через `getLayoutData`, safe); `resolveOpenedSteps`; `drillNext` без `openedSteps`-аргумента | Modify |
| `shared/**/*.test.ts`, `convex/drill.test.ts` | тесты (см. задачи) | Create/Modify |
| `src/machines/session-impl.ts` | `drillNext` без `openedSteps` | Modify |
| `src/machines/session.machine.ts` | убрать `openedSteps` из input/context/`fetchDrills` | Modify |
| `src/machines/app.machine.ts` | убрать `openedSteps` из session-input | Modify |
| `src/lib/session-config.ts` | удалить клиентский `DEFAULT_OPENED_STEPS` + почистить JSDoc | Modify |
| `docs/adr/0005-server-authoritative-profile.md` | приписать «(поправка ADR 0008)» к строке про `openedSteps` на проводе | Modify |

---

## Task 1: `maxLadderStep` helper + дедупликация в validate

**Files:**
- Modify: `shared/key-ladder/key-step-map.ts`, `shared/key-ladder/validate.ts`
- Test: `shared/key-ladder/key-step-map.test.ts` (создать, если нет)

- [ ] **Step 1: Написать падающий тест**

```ts
// shared/key-ladder/key-step-map.test.ts
import { describe, expect, test } from 'vitest';
import { maxLadderStep } from './key-step-map.ts';
import { jcukenKeyLadder } from './jcuken.ts';

describe('maxLadderStep', () => {
  test('максимальный шаг лестницы йцукен = 9', () => {
    expect(maxLadderStep(jcukenKeyLadder)).toBe(9);
  });
  test('пустая лестница → -1', () => {
    expect(maxLadderStep({ symbolLayoutId: 'x', version: 1, keys: [] })).toBe(-1);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npx vitest run shared/key-ladder/key-step-map.test.ts`
Expected: FAIL — `maxLadderStep` не экспортирован.

- [ ] **Step 3: Реализовать + дедупликация**

В `shared/key-ladder/key-step-map.ts` добавить:

```ts
/** Максимальный номер шага в лестнице (-1 для пустой). */
export function maxLadderStep(ladder: KeyLadder): number {
  return Math.max(-1, ...ladder.keys.map((entry) => entry.step));
}
```

В `shared/key-ladder/validate.ts` заменить inline-расчёт на helper:

```ts
import { maxLadderStep } from './key-step-map.ts';
// ...
  // Шаги 0..max без дыр.
  const steps = new Set(ladder.keys.map((entry) => entry.step));
  const maxStep = maxLadderStep(ladder);
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npx vitest run shared/key-ladder/`
Expected: PASS (новый тест + существующий `key-ladder.test.ts` без регрессий).

- [ ] **Step 5: Commit**

```bash
git add shared/key-ladder/key-step-map.ts shared/key-ladder/validate.ts shared/key-ladder/key-step-map.test.ts
git commit -m "refactor(key-ladder): maxLadderStep helper, дедупликация с validate"
```

---

## Task 2: Единый источник раскладок `getLayoutData` (DRY)

**Files:**
- Create: `convex/layout-data.ts`
- Modify: `convex/selectionIndex.ts`
- Test: `convex/layout-data.test.ts`

Убирает дубль `LAYOUTS` (selectionIndex) / `SYMBOL_LAYOUTS` (план). Источник в `convex/`, т.к. тянет json (shared намеренно без I/O). Возвращает `null` для неизвестной раскладки — потребители деградируют без throw.

- [ ] **Step 1: Написать падающий тест**

```ts
// convex/layout-data.test.ts
import { describe, expect, test } from 'vitest';
import { getLayoutData } from './layout-data';

describe('getLayoutData', () => {
  test('известная раскладка → symbolLayout + keyLadder', () => {
    const data = getLayoutData('йцукен');
    expect(data).not.toBeNull();
    expect(data?.keyLadder.symbolLayoutId).toBe('йцукен');
    expect(data?.symbolLayout.some((e) => e.symbol === 'а')).toBe(true);
  });
  test('неизвестная раскладка → null (без throw)', () => {
    expect(getLayoutData('unknown')).toBeNull();
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npx vitest run convex/layout-data.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать + переиспользовать в selectionIndex**

```ts
// convex/layout-data.ts
/**
 * @file Единый источник данных раскладки для сервера: symbolLayoutId →
 * { symbolLayout, keyLadder }. Тянет json раскладки + KeyLadder из registry.
 * Здесь (а не в shared), т.к. shared/symbol-layout.ts намеренно без I/O.
 * Возвращает null для неизвестной раскладки — потребитель деградирует без throw.
 */
import type { KeyLadder } from '../shared/key-ladder/types.ts';
import type { SymbolEntry } from '../shared/symbol-layout.ts';
import { getKeyLadder } from '../shared/key-ladder/registry.ts';
import symbolLayoutJcuken from '../src/data/layouts/symbol-layout-jcuken.json';

const SYMBOL_LAYOUTS: Record<string, SymbolEntry[]> = {
  'йцукен': symbolLayoutJcuken as SymbolEntry[],
};

export interface LayoutData {
  symbolLayout: SymbolEntry[];
  keyLadder: KeyLadder;
}

export function getLayoutData(symbolLayoutId: string): LayoutData | null {
  const symbolLayout = SYMBOL_LAYOUTS[symbolLayoutId];
  if (!symbolLayout) return null;
  return { symbolLayout, keyLadder: getKeyLadder(symbolLayoutId) };
}
```

В `convex/selectionIndex.ts` заменить локальные `SymbolEntry`/`LAYOUTS` на `getLayoutData`. Найти место использования `LAYOUTS[...]` (в `rebuild`/`ladderReport` логике, где берётся `symbolLayout` + `keyLadder`) и заменить:

```ts
import { getLayoutData } from './layout-data';
// удалить локальные: interface SymbolEntry {...}, const LAYOUTS = {...},
//   import symbolLayoutJcuken..., import { jcukenKeyLadder }... (если только для LAYOUTS)
// в обработчике, где было `const { symbolLayout, keyLadder } = LAYOUTS[args.symbolLayoutId]`:
const layoutData = getLayoutData(args.symbolLayoutId);
if (!layoutData) throw new Error(`нет данных раскладки: ${args.symbolLayoutId}`);
const { symbolLayout, keyLadder } = layoutData;
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npx vitest run convex/layout-data.test.ts convex/selectionIndex.test.ts`
Expected: PASS (новый + существующий selection-index без регрессий).

- [ ] **Step 5: Commit**

```bash
git add convex/layout-data.ts convex/layout-data.test.ts convex/selectionIndex.ts
git commit -m "refactor(convex): единый getLayoutData, убрать дубль LAYOUTS"
```

---

## Task 3: Чистая выборка «символы шага»

**Files:**
- Create: `shared/key-ladder/step-symbols.ts`
- Test: `shared/key-ladder/step-symbols.test.ts`

Использует существующий `computeStepLevel` (без копии логики «макс шаг символа») и `SymbolEntry` из `shared/symbol-layout.ts`.

- [ ] **Step 1: Написать падающий тест**

```ts
// shared/key-ladder/step-symbols.test.ts
import { describe, expect, test } from 'vitest';
import { symbolsAtStep } from './step-symbols.ts';
import { jcukenKeyLadder } from './jcuken.ts';
import type { SymbolEntry } from '../symbol-layout.ts';

const SYMBOL_LAYOUT: SymbolEntry[] = [
  { symbol: ' ', keyCaps: ['Space'] },     // шаг 0
  { symbol: 'а', keyCaps: ['KeyF'] },      // шаг 0 (указательный левый)
  { symbol: 'в', keyCaps: ['KeyD'] },      // шаг 1 (средний левый)
  { symbol: 'ё', keyCaps: ['Backquote'] }, // шаг 9
];

describe('symbolsAtStep', () => {
  test('возвращает только символы, открывающиеся ровно на шаге', () => {
    expect(symbolsAtStep({ step: 0, symbolLayout: SYMBOL_LAYOUT, ladder: jcukenKeyLadder }).sort()).toEqual([' ', 'а']);
    expect(symbolsAtStep({ step: 1, symbolLayout: SYMBOL_LAYOUT, ladder: jcukenKeyLadder })).toEqual(['в']);
    expect(symbolsAtStep({ step: 5, symbolLayout: SYMBOL_LAYOUT, ladder: jcukenKeyLadder })).toEqual([]);
    expect(symbolsAtStep({ step: 9, symbolLayout: SYMBOL_LAYOUT, ladder: jcukenKeyLadder })).toEqual(['ё']);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npx vitest run shared/key-ladder/step-symbols.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать (через computeStepLevel)**

```ts
// shared/key-ladder/step-symbols.ts
/**
 * @file Выборка символов KeyLadder по шагу: «символы шага k» — те, чей stepLevel
 * (макс. шаг среди клавиш символа) равен k. Нужны Readiness-проверке текущего
 * шага при росте репертуара. Повторно использует computeStepLevel (без дублирования логики).
 */
import type { KeyLadder } from './types.ts';
import { keyStepMap } from './key-step-map.ts';
import { computeStepLevel } from '../selection-index/compute.ts';
import { symbolToKeyCaps, type SymbolEntry } from '../symbol-layout.ts';

export function symbolsAtStep({
  step,
  symbolLayout,
  ladder,
}: {
  step: number;
  symbolLayout: SymbolEntry[];
  ladder: KeyLadder;
}): string[] {
  const keyToStep = keyStepMap(ladder);
  const s2k = symbolToKeyCaps(symbolLayout);
  return symbolLayout
    .filter((entry) => computeStepLevel({ uniqueSymbols: [entry.symbol], symbolToKeyCaps: s2k, keyToStep }) === step)
    .map((entry) => entry.symbol);
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npx vitest run shared/key-ladder/step-symbols.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/key-ladder/step-symbols.ts shared/key-ladder/step-symbols.test.ts
git commit -m "feat(repertoire): symbolsAtStep через computeStepLevel"
```

---

## Task 4: Провизорные числа + Readiness

**Files:**
- Create: `shared/repertoire/config.ts`, `shared/repertoire/readiness.ts`
- Test: `shared/repertoire/readiness.test.ts`

- [ ] **Step 1: Написать падающий тест** (включая чётную медиану и границу `latency == k×median`)

```ts
// shared/repertoire/readiness.test.ts
import { describe, expect, test } from 'vitest';
import { isSymbolReady, repertoireMedianLatency, type ProfileCell } from './readiness.ts';

const PARAMS = { minExposures: 20, minFirstTryAccuracy: 0.9, latencyK: 1.5 };
const cell = (over: Partial<ProfileCell>): ProfileCell => ({
  symbol: 'а', exposures: 30, clean: 29, latencyEwma: 200, latencySamples: 30, ...over,
});

describe('repertoireMedianLatency', () => {
  test('нечётное число — средний элемент', () => {
    expect(repertoireMedianLatency([
      cell({ symbol: 'а', latencyEwma: 100 }),
      cell({ symbol: 'б', latencyEwma: 300 }),
      cell({ symbol: 'в', latencyEwma: 0, latencySamples: 0 }), // без замеров — вне медианы
    ])).toBe(200);
  });
  test('чётное число — среднее двух средних', () => {
    expect(repertoireMedianLatency([
      cell({ symbol: 'а', latencyEwma: 100 }),
      cell({ symbol: 'б', latencyEwma: 200 }),
      cell({ symbol: 'в', latencyEwma: 300 }),
      cell({ symbol: 'г', latencyEwma: 500 }),
    ])).toBe(250); // (200+300)/2
  });
  test('нет замеров — 0', () => {
    expect(repertoireMedianLatency([cell({ latencySamples: 0, latencyEwma: 0 })])).toBe(0);
  });
});

describe('isSymbolReady', () => {
  test('нет ячейки — не готов', () => {
    expect(isSymbolReady({ cell: undefined, params: PARAMS, repertoireMedianLatency: 200 })).toBe(false);
  });
  test('мало предъявлений — не готов', () => {
    expect(isSymbolReady({ cell: cell({ exposures: 10, clean: 10 }), params: PARAMS, repertoireMedianLatency: 200 })).toBe(false);
  });
  test('низкая точность с первой попытки — не готов', () => {
    expect(isSymbolReady({ cell: cell({ exposures: 30, clean: 20 }), params: PARAMS, repertoireMedianLatency: 200 })).toBe(false);
  });
  test('латентность хуже k× медианы — не готов', () => {
    expect(isSymbolReady({ cell: cell({ latencyEwma: 400 }), params: PARAMS, repertoireMedianLatency: 200 })).toBe(false);
  });
  test('латентность ровно на границе k× медианы — готов (<=)', () => {
    expect(isSymbolReady({ cell: cell({ latencyEwma: 300 }), params: PARAMS, repertoireMedianLatency: 200 })).toBe(true);
  });
  test('все условия выполнены — готов', () => {
    expect(isSymbolReady({ cell: cell({ latencyEwma: 250 }), params: PARAMS, repertoireMedianLatency: 200 })).toBe(true);
  });
  test('нет собственных замеров латентности — судим по предъявлениям и точности', () => {
    expect(isSymbolReady({ cell: cell({ latencySamples: 0, latencyEwma: 0 }), params: PARAMS, repertoireMedianLatency: 200 })).toBe(true);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npx vitest run shared/repertoire/readiness.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать config + readiness**

```ts
// shared/repertoire/config.ts
/**
 * @file Провизорные числа роста репертуара одной группой (план «Числа-настройки»,
 * ADR 0008). Значения временные — уточняются по реальным данным печати.
 */
export const READINESS_PARAMS = {
  minExposures: 20,         // «достаточно предъявлений» (план: ~20–30)
  minFirstTryAccuracy: 0.9, // точность с первой попытки выше порога
  latencyK: 1.5,            // латентность не хуже k× медианы репертуара
};

export const REPERTOIRE_DEBT_LIMIT = 2; // сколько недозревших символов терпим при росте
```

```ts
// shared/repertoire/readiness.ts
/**
 * @file Readiness — критерий «символ достаточно хорош для расширения репертуара»
 * (CONTEXT.md → Readiness): достаточно предъявлений + точность с первой попытки
 * выше порога + латентность не хуже k× медианы репертуара. Критерий относительный
 * (медиана по самому пользователю), не абсолютный. Чистые функции.
 */
export interface ProfileCell {
  symbol: string;
  exposures: number;
  clean: number;
  latencyEwma: number;
  latencySamples: number;
}

export interface ReadinessParams {
  minExposures: number;
  minFirstTryAccuracy: number;
  latencyK: number;
}

/** Медиана latencyEwma по символам с латентными замерами (0 — если таких нет). */
export function repertoireMedianLatency(cells: readonly ProfileCell[]): number {
  const samples = cells
    .filter((c) => c.latencySamples > 0)
    .map((c) => c.latencyEwma)
    .sort((a, b) => a - b);
  if (samples.length === 0) return 0;
  const mid = Math.floor(samples.length / 2);
  if (samples.length % 2 === 1) return samples[mid] ?? 0;
  return ((samples[mid - 1] ?? 0) + (samples[mid] ?? 0)) / 2;
}

export function isSymbolReady({
  cell,
  params,
  repertoireMedianLatency,
}: {
  cell: ProfileCell | undefined;
  params: ReadinessParams;
  repertoireMedianLatency: number;
}): boolean {
  if (!cell) return false;
  if (cell.exposures < params.minExposures) return false;
  if (cell.clean / cell.exposures < params.minFirstTryAccuracy) return false;
  // Латентность судим только при собственных замерах и наличии базы сравнения;
  // на cold-start латентных данных (медиана 0) проверка неактивна — by design.
  if (cell.latencySamples === 0 || repertoireMedianLatency === 0) return true;
  return cell.latencyEwma <= params.latencyK * repertoireMedianLatency;
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npx vitest run shared/repertoire/readiness.test.ts`
Expected: PASS (11 тестов).

- [ ] **Step 5: Commit**

```bash
git add shared/repertoire/config.ts shared/repertoire/readiness.ts shared/repertoire/readiness.test.ts
git commit -m "feat(repertoire): Readiness — критерий готовности символа + числа"
```

---

## Task 5: Решение о росте `openedSteps`

**Files:**
- Create: `shared/repertoire/growth.ts`
- Test: `shared/repertoire/growth.test.ts`

`maxStep` остаётся параметром (реализует потолок корректно: caller судит символы *текущего* шага `openedSteps-1`, поэтому пустоты `currentStepSymbols` для потолка недостаточно).

- [ ] **Step 1: Написать падающий тест**

```ts
// shared/repertoire/growth.test.ts
import { describe, expect, test } from 'vitest';
import { decideOpenedSteps } from './growth.ts';
import type { ProfileCell } from './readiness.ts';

const PARAMS = { minExposures: 20, minFirstTryAccuracy: 0.9, latencyK: 1.5 };
const ready = (symbol: string): ProfileCell => ({ symbol, exposures: 30, clean: 29, latencyEwma: 200, latencySamples: 30 });
const weak = (symbol: string): ProfileCell => ({ symbol, exposures: 5, clean: 2, latencyEwma: 0, latencySamples: 0 });

describe('decideOpenedSteps — монотонный рост по долговому лимиту', () => {
  test('все символы шага готовы → +1', () => {
    expect(decideOpenedSteps({ openedSteps: 1, maxStep: 9, currentStepSymbols: ['а', 'о'],
      cells: [ready('а'), ready('о')], params: PARAMS, debtLimit: 2 })).toBe(2);
  });
  test('недозревших ≤ лимита → растём (предохранитель)', () => {
    expect(decideOpenedSteps({ openedSteps: 1, maxStep: 9, currentStepSymbols: ['а', 'о', 'е'],
      cells: [ready('а'), weak('о'), weak('е')], params: PARAMS, debtLimit: 2 })).toBe(2);
  });
  test('недозревших больше лимита → не растём', () => {
    expect(decideOpenedSteps({ openedSteps: 1, maxStep: 9, currentStepSymbols: ['а', 'о', 'е'],
      cells: [weak('а'), weak('о'), weak('е')], params: PARAMS, debtLimit: 2 })).toBe(1);
  });
  test('потолок лестницы: openedSteps > maxStep → не растём', () => {
    expect(decideOpenedSteps({ openedSteps: 10, maxStep: 9, currentStepSymbols: ['ё'],
      cells: [ready('ё')], params: PARAMS, debtLimit: 2 })).toBe(10);
  });
  test('нет символов текущего шага → не растём', () => {
    expect(decideOpenedSteps({ openedSteps: 5, maxStep: 9, currentStepSymbols: [],
      cells: [], params: PARAMS, debtLimit: 2 })).toBe(5);
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npx vitest run shared/repertoire/growth.test.ts`
Expected: FAIL — модуль не найден.

- [ ] **Step 3: Реализовать**

```ts
// shared/repertoire/growth.ts
/**
 * @file Решение о росте репертуара — чистая функция (ADR 0008). Монотонный +1:
 * следующий шаг открывается, когда НЕ-готовых символов текущего шага ≤ долгового
 * лимита (предохранитель от застревания при случайной выдаче). Никогда не
 * уменьшает openedSteps; не растит выше потолка лестницы (maxStep).
 */
import { isSymbolReady, repertoireMedianLatency, type ProfileCell, type ReadinessParams } from './readiness.ts';

export function decideOpenedSteps({
  openedSteps,
  maxStep,
  currentStepSymbols,
  cells,
  params,
  debtLimit,
}: {
  openedSteps: number;
  maxStep: number;
  currentStepSymbols: string[];
  cells: readonly ProfileCell[];
  params: ReadinessParams;
  debtLimit: number;
}): number {
  if (openedSteps > maxStep) return openedSteps; // потолок: все шаги открыты
  if (currentStepSymbols.length === 0) return openedSteps;
  const median = repertoireMedianLatency(cells);
  const bySymbol = new Map(cells.map((c) => [c.symbol, c]));
  const notReady = currentStepSymbols.filter(
    (symbol) => !isSymbolReady({ cell: bySymbol.get(symbol), params, repertoireMedianLatency: median }),
  ).length;
  return notReady <= debtLimit ? openedSteps + 1 : openedSteps;
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npx vitest run shared/repertoire/growth.test.ts`
Expected: PASS (5 тестов).

- [ ] **Step 5: Commit**

```bash
git add shared/repertoire/growth.ts shared/repertoire/growth.test.ts
git commit -m "feat(repertoire): decideOpenedSteps — монотонный рост по долговому лимиту"
```

---

## Task 6: Рост в `applyDrillSummaryHandler` (писатель)

**Files:**
- Modify: `convex/drill.ts` (`applyDrillSummaryHandler`)
- Test: `convex/drill.test.ts`

`applyDrillSummaryHandler` — единственный писатель. После fold ячеек вычисляет `decideOpenedSteps` по обновлённым ячейкам и пишет новый `openedSteps`. **Cold-start (insert) роста не делает** — данных нет. Неизвестная раскладка → рост пропускается с `console.warn`, сводка сохраняется (без throw).

- [ ] **Step 1: Написать падающий тест** (рост, предохранитель, монотонность, insert-без-роста)

```ts
// convex/drill.test.ts — добавить describe в конец:
describe('applyDrillSummaryHandler — рост репертуара', () => {
  const STEP0 = ['а', 'к', 'е', 'п', 'м', 'и', 'н', 'г', 'р', 'о', 'т', 'ь', ' '];

  test('весь шаг 0 дозрел → openedSteps 1 → 2', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { name: 'U' });
      let profileId;
      for (const symbol of STEP0) {
        profileId = await applyDrillSummaryHandler({ ctx, userId, symbolLayoutId: 'йцукен',
          perSymbol: [{ symbol, exposures: 25, clean: 25, latencies: [200] }] });
      }
      const profile = await ctx.db.get(profileId!);
      expect(profile?.openedSteps).toBe(2);
    });
  });

  test('недозревших шага 0 больше лимита → openedSteps не растёт', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { name: 'U' });
      await applyDrillSummaryHandler({ ctx, userId, symbolLayoutId: 'йцукен',
        perSymbol: [{ symbol: 'а', exposures: 25, clean: 25, latencies: [180] }] });
      const profileId = await applyDrillSummaryHandler({ ctx, userId, symbolLayoutId: 'йцукен',
        perSymbol: [{ symbol: 'к', exposures: 25, clean: 25, latencies: [190] }] });
      // 2 из 13 готовы, 11 недозревших > лимита 2 → роста нет.
      expect((await ctx.db.get(profileId))?.openedSteps).toBe(1);
    });
  });

  test('insert (первый профиль) не растит, даже при готовой ячейке', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { name: 'U' });
      const profileId = await applyDrillSummaryHandler({ ctx, userId, symbolLayoutId: 'йцукен',
        perSymbol: [{ symbol: 'а', exposures: 99, clean: 99, latencies: [150] }] });
      expect((await ctx.db.get(profileId))?.openedSteps).toBe(1); // cold-start, рост только при patch
    });
  });

  test('рост монотонный: слабый шаг не откатывает уже открытое', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { name: 'U' });
      await ctx.db.insert('skillProfiles', { userId, symbolLayoutId: 'йцукен', openedSteps: 3,
        symbolCells: [{ symbol: 'ы', exposures: 3, clean: 1, latencyEwma: 0, latencySamples: 0 }], updatedAt: 1 });
      const profileId = await applyDrillSummaryHandler({ ctx, userId, symbolLayoutId: 'йцукен',
        perSymbol: [{ symbol: 'ы', exposures: 2, clean: 0, latencies: [] }] });
      expect((await ctx.db.get(profileId))?.openedSteps).toBe(3); // не упал, не вырос
    });
  });

  test('неизвестная раскладка → рост пропущен, сводка сохранена (без throw)', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { name: 'U' });
      await applyDrillSummaryHandler({ ctx, userId, symbolLayoutId: 'unknown',
        perSymbol: [{ symbol: 'x', exposures: 5, clean: 5, latencies: [100] }] });
      const profileId = await applyDrillSummaryHandler({ ctx, userId, symbolLayoutId: 'unknown',
        perSymbol: [{ symbol: 'x', exposures: 5, clean: 5, latencies: [100] }] });
      const profile = await ctx.db.get(profileId);
      expect(profile?.openedSteps).toBe(1);        // рост пропущен
      expect(profile?.symbolCells[0]?.exposures).toBe(10); // но сводка применена
    });
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npx vitest run convex/drill.test.ts -t "рост репертуара"`
Expected: FAIL — «весь шаг 0 дозрел» ждёт `2`, получает `1`.

- [ ] **Step 3: Реализовать рост**

В `convex/drill.ts` добавить импорты:

```ts
import { getLayoutData } from './layout-data';
import { symbolsAtStep } from '../shared/key-ladder/step-symbols.ts';
import { maxLadderStep } from '../shared/key-ladder/key-step-map.ts';
import { decideOpenedSteps } from '../shared/repertoire/growth.ts';
import { READINESS_PARAMS, REPERTOIRE_DEBT_LIMIT } from '../shared/repertoire/config.ts';
```

Вспомогательная функция роста (safe — нет throw на неизвестной раскладке):

```ts
/** Определение нового openedSteps по обновлённым ячейкам (writer-логика). */
function grownOpenedSteps({
  symbolLayoutId,
  openedSteps,
  cells,
}: {
  symbolLayoutId: string;
  openedSteps: number;
  cells: SymbolCell[];
}): number {
  const layoutData = getLayoutData(symbolLayoutId);
  if (!layoutData) {
    console.warn(`grownOpenedSteps: нет данных раскладки ${symbolLayoutId} — рост пропущен`);
    return openedSteps;
  }
  const { symbolLayout, keyLadder } = layoutData;
  return decideOpenedSteps({
    openedSteps,
    maxStep: maxLadderStep(keyLadder),
    currentStepSymbols: symbolsAtStep({ step: openedSteps - 1, symbolLayout, ladder: keyLadder }),
    cells,
    params: READINESS_PARAMS,
    debtLimit: REPERTOIRE_DEBT_LIMIT,
  });
}
```

В `applyDrillSummaryHandler` patch-ветка растит (insert — без роста):

```ts
  if (existing === null) {
    return await ctx.db.insert('skillProfiles', {
      userId, symbolLayoutId, openedSteps: DEFAULT_OPENED_STEPS, symbolCells, updatedAt: now,
    });
  }
  const openedSteps = grownOpenedSteps({ symbolLayoutId, openedSteps: existing.openedSteps, cells: symbolCells });
  await ctx.db.patch(existing._id, { symbolCells, openedSteps, updatedAt: now });
  return existing._id;
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npx vitest run convex/drill.test.ts`
Expected: PASS (рост + прежние foldSummary/apply).

- [ ] **Step 5: Commit**

```bash
git add convex/drill.ts convex/drill.test.ts
git commit -m "feat(repertoire): drillRecord растит openedSteps по Readiness (writer)"
```

---

## Task 7: `drillNext` читает `openedSteps` из профиля (читатель)

**Files:**
- Modify: `convex/drill.ts` (`drillNext` + `resolveOpenedSteps`; обновить устаревший header-комментарий про `openedSteps`)
- Test: `convex/drill.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
import { resolveOpenedSteps } from './drill'; // добавить к импортам сверху

describe('resolveOpenedSteps — чтение репертуара из профиля', () => {
  test('есть профиль → его openedSteps', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { name: 'U' });
      await ctx.db.insert('skillProfiles', { userId, symbolLayoutId: 'йцукен', openedSteps: 4, symbolCells: [], updatedAt: 1 });
      expect(await resolveOpenedSteps({ ctx, userId, symbolLayoutId: 'йцукен' })).toBe(4);
    });
  });
  test('профиль другой раскладки → cold-start 1 (ключ user × раскладка)', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { name: 'U' });
      await ctx.db.insert('skillProfiles', { userId, symbolLayoutId: 'йцукен', openedSteps: 4, symbolCells: [], updatedAt: 1 });
      expect(await resolveOpenedSteps({ ctx, userId, symbolLayoutId: 'qwerty' })).toBe(1);
    });
  });
  test('нет профиля (новый) → cold-start 1', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { name: 'U' });
      expect(await resolveOpenedSteps({ ctx, userId, symbolLayoutId: 'йцукен' })).toBe(1);
    });
  });
  test('null userId (не авторизован / гость) → cold-start 1', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      expect(await resolveOpenedSteps({ ctx, userId: null, symbolLayoutId: 'йцукен' })).toBe(1);
    });
  });
});
```

Также **обновить существующие** 4 вызова `api.drill.drillNext` в `drill.test.ts` (describe «drillNext — выдача порции») — убрать `openedSteps` из аргументов:

```ts
// было: { symbolLayoutId: 'test', openedSteps: 1, budgetChars: 10 }
const res = await t.mutation(api.drill.drillNext, { symbolLayoutId: 'test', budgetChars: 10 });
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npx vitest run convex/drill.test.ts`
Expected: FAIL — `resolveOpenedSteps` не экспортирован; вызовы без `openedSteps` бьются о проверку аргументов.

- [ ] **Step 3: Реализовать**

Переместить объявление `DEFAULT_OPENED_STEPS` **выше** `drillNext` (сейчас оно ниже — иначе TDZ). Добавить вспомогательную функцию:

```ts
import type { Id } from './_generated/dataModel'; // уже импортирован

/** Определение репертуара: openedSteps из профиля (user × раскладка) или cold-start. */
export async function resolveOpenedSteps({
  ctx,
  userId,
  symbolLayoutId,
}: {
  ctx: MutationCtx;
  userId: Id<'users'> | null;
  symbolLayoutId: string;
}): Promise<number> {
  if (userId === null) return DEFAULT_OPENED_STEPS;
  const profile = await ctx.db
    .query('skillProfiles')
    .withIndex('by_user_and_layout', (q) => q.eq('userId', userId).eq('symbolLayoutId', symbolLayoutId))
    .unique();
  return profile?.openedSteps ?? DEFAULT_OPENED_STEPS;
}
```

Переписать `drillNext` (убрать `openedSteps` из `args`, читать через `resolveOpenedSteps`, во всех `args.openedSteps` → `openedSteps`, включая `console.warn` про `contentGap`). Обновить header-комментарий файла: фразу «`openedSteps` пока приходит параметром … позже его будет давать Skill Profile» заменить на «`openedSteps` читается из Skill Profile (ADR 0008)».

```ts
export const drillNext = mutation({
  args: { symbolLayoutId: v.string(), budgetChars: v.number() },
  returns: v.object({
    contentGap: v.boolean(),
    drills: v.array(v.object({ id: v.id('drills'), text: v.string(), length: v.number() })),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const openedSteps = await resolveOpenedSteps({ ctx, userId, symbolLayoutId: args.symbolLayoutId });
    const eligible = await ctx.db
      .query('drillSelectionIndex')
      .withIndex('by_layout_and_step', (q) =>
        q.eq('symbolLayoutId', args.symbolLayoutId).lt('stepLevel', openedSteps))
      .collect();
    // ... остальное тело без изменений; все args.openedSteps → openedSteps.
  },
});
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npx vitest run convex/drill.test.ts`
Expected: PASS (resolveOpenedSteps + обновлённые drillNext + рост + apply).

- [ ] **Step 5: Commit**

```bash
git add convex/drill.ts convex/drill.test.ts
git commit -m "feat(repertoire): drillNext читает openedSteps из профиля (reader, поправка ADR 0006)"
```

---

## Task 8: Снять `openedSteps` с клиентского провода

**Files:**
- Modify: `src/machines/session-impl.ts`, `src/machines/session.machine.ts`, `src/machines/app.machine.ts`, `src/lib/session-config.ts`
- Test: `src/machines/session.machine.test.ts`

- [ ] **Step 1: Обновить тест `session.machine.test.ts:38`**

В `src/machines/session.machine.test.ts` константа `INPUT` (строка ~38) содержит `openedSteps: 1` — удалить это поле (после снятия из `SessionInput` оно станет типовой ошибкой). Если в файле есть проверки ожидаемого `input` у `fetchDrills` с `openedSteps` — убрать поле и там.

- [ ] **Step 2: Реализовать снятие с провода**

`src/machines/session-impl.ts` — `fetchServerDrillStream` и обобщённый параметр actor:

```ts
async function fetchServerDrillStream({
  symbolLayoutId,
  budgetChars,
}: {
  symbolLayoutId: SymbolLayoutId;
  budgetChars: number;
}): Promise<TypingStream> {
  logConvex(`drillNext → budgetChars=${budgetChars} layout=${symbolLayoutId}`);
  const startedAt = performance.now();
  const res = await convex.mutation(api.drill.drillNext, { symbolLayoutId, budgetChars });
  const stream = glueServerDrills({ drills: res.drills, symbolLayoutId });
  const elapsedMs = Math.round(performance.now() - startedAt);
  logConvex(`drillNext ← ${res.drills.length} drill'ов → ${stream.length} символов за ${elapsedMs}ms`);
  return stream;
}
// fetchDrills actor обобщённый параметр: { symbolLayoutId: SymbolLayoutId; budgetChars: number }
```

`src/machines/session.machine.ts` — удалить `openedSteps` из:
- `SessionInput` (поле), `SessionContext` (поле);
- дефолт-actor `fetchDrills` обобщённый параметр → `{ symbolLayoutId: SymbolLayoutId; budgetChars: number }`;
- `context()` init (строка `openedSteps: input.openedSteps,`);
- **оба** invoke-input: `loading.invoke.input` и `refilling.invoke.input` (внутри `timing.states.refilling`):

```ts
input: ({ context }) => ({
  symbolLayoutId: context.symbolLayoutId,
  budgetChars: computeBudgetChars({ secondsRemaining: SESSION_DURATION_SECONDS, cpm: context.cpm }),
}),
```

`src/machines/app.machine.ts` — убрать `openedSteps` из input `sessionService` и из импорта:

```ts
import { DEFAULT_SESSION_CPM } from '@/lib/session-config'; // без DEFAULT_OPENED_STEPS
// input:
        input: ({ context, self }) => ({
          symbolLayoutId: context.currentSymbolLayoutId,
          cpm: DEFAULT_SESSION_CPM,
          parentActor: self,
        }),
```

`src/lib/session-config.ts` — удалить `DEFAULT_OPENED_STEPS` и подчистить JSDoc-шапку (убрать упоминание `openedSteps` из строки «Источники cpm/openedSteps временные … openedSteps — в профиль (сервер)» → оставить про cpm/таймер):

```ts
// удалить:
// /** Холодный старт: открыт только шаг 0 ... */
// export const DEFAULT_OPENED_STEPS = 1;
```

- [ ] **Step 3: Запустить — убедиться, что проходит**

Run: `npx vitest run src/machines/session.machine.test.ts src/machines/app.machine.test.ts && make check`
Expected: тесты PASS, svelte-check 0 ошибок.

- [ ] **Step 4: Проверить отсутствие мёртвых ссылок**

Run: `grep -rn "DEFAULT_OPENED_STEPS\|openedSteps" src/`
Expected: пусто (все клиентские ссылки убраны).

- [ ] **Step 5: Commit**

```bash
git add src/machines/session-impl.ts src/machines/session.machine.ts src/machines/app.machine.ts src/lib/session-config.ts
git commit -m "refactor(repertoire): openedSteps уходит с клиентского провода (ADR 0008)"
```

---

## Task 9: Поправка ADR 0005 + зелёный проверка + ручная проверка

**Files:**
- Modify: `docs/adr/0005-server-authoritative-profile.md`

- [ ] **Step 1: Приписать поправку к ADR 0005**

В `docs/adr/0005-server-authoritative-profile.md` строка про «клиент шлёт только контекст (раскладка, `openedSteps`, бюджет …)» — добавить в конце предложения: «(поправка ADR 0008: `openedSteps` уходит с провода — `drillNext` читает его из профиля)».

- [ ] **Step 2: Полный проверка**

Run: `make check-all`
Expected: lint 0 ошибок · svelte-check 0 · все тесты (`src`/`convex`/`shared`) зелёные · spell 0 · build ✓.
Если spell красный на новых русских комментариях — `/fix-spell` (правила CLAUDE.md).

- [ ] **Step 3: Ручная проверка в браузере**

Запустить `make dev` + `make convex`. Залогиниться.
- В консоли (`[convex]`): `drillNext →` больше **не** содержит `openedSteps=`.
- **Чтобы увидеть рост за один сеанс** (Readiness требует ~20 чистых предъявлений по всем 13 символам шага 0): засеять профиль через консоль Convex — строка `skillProfiles` с `openedSteps: 1` и 12–13 ячейками шага 0 на грани готовности (`exposures: 25, clean: 25`); затем короткая тренировка → на чекпоинте `openedSteps` станет `2`, пул `drillNext` расширится на символы шага 1. (Альтернатива: временно снизить `READINESS_PARAMS.minExposures`.)
- Гость (выйти): тренировка на cold-start ступени, `drillRecord` пропускается (`Not authenticated`), рост не происходит — by design.

- [ ] **Step 4: Commit**

```bash
git add docs/adr/0005-server-authoritative-profile.md
git commit -m "docs: поправка ADR 0005 — openedSteps читается из профиля"
```

## Готово, когда

- `drillRecord` монотонно растит `openedSteps` по Readiness; снижения нет; долговой лимит работает; insert не растит; неизвестная раскладка не роняет запись.
- `drillNext` читает `openedSteps` из профиля; аргумента `openedSteps` в контракте нет.
- Клиент не шлёт `openedSteps`; `DEFAULT_OPENED_STEPS` в `src/` удалён; устаревшие комментарии подчищены.
- Источник раскладок единый (`getLayoutData`), дублей `LAYOUTS`/`SYMBOL_LAYOUTS` нет.
- Гость — cold-start без роста (анонимный профиль отложен).
- `make check-all` зелёный; ручная проверка пройдена.

## Merge

```bash
git switch master && git merge --no-ff feat/auto-flow-repertoire
```

После merge: отметить этап «Рост набора букв» как ✅ в `docs/plans/auto-flow.md`.
