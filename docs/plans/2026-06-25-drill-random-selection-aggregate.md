# Случайный отбор drill'ов через Aggregate — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перевести выдачу порции drill'ов с Convex-**mutation** (обход кэша) на **query** со случайным доступом за O(log n): подключить `@convex-dev/aggregate` над `drillSelectionIndex`, а свежесть случайной выборки дать `seed`-аргументом (ADR 0009).

**Architecture:** Двухслойный отбор (ADR 0009). Storage-слой — агрегат с `Namespace = symbolLayoutId`, `Key = stepLevel`: жёсткий фильтр «раскладка + потолок репертуара» = `(namespace, bounds: stepLevel < openedSteps)`, случайный доступ = `count()` + `at(seededOffset)`. v1 **поведение-сохраняющий**: равномерный random, inline-добор под `budgetChars`, distinct drill'ы, как в текущей mutation. Soft-слой (`rankBySoftSignals`) и over-sample — **отложены** (ADR 0009, решения разбора): не материализуем, пока нет реального сигнала.

**Tech Stack:** Convex (component `@convex-dev/aggregate`, query/mutation), TypeScript strict, Vitest projects (`shared` node, `convex` edge-runtime), `convex-test` (с `registerComponent`), XState v5 (клиент не меняется).

**Канон:** ADR 0009 (это решение), ADR 0003 (hard=индексная фильтрация / soft=ранжирование), ADR 0006/0008 (`drillNext` — читатель, контракт в символах, `openedSteps` из профиля), `convex/drill.ts`, `convex/selectionIndex.ts`, `src/machines/session-impl.ts`.

> **Аудит (4 агента, чистый контекст):** вердикт всех четырёх — *fix-then-ship*, без rework. Канон чист (CQRS-граница, hard/soft, контракт в символах, именование — без нарушений). API aggregate сверен с исходником/доками — корректен. Учтено: несущая гипотеза `at()` + `bounds` вынесена в контрольную точку Task 1 (если offset не относителен к bounds — фильтр течёт, переписывается ядро Task 4); тип `t` в `registerDrillIndex` (`TestConvex<typeof schema>`, не `<never>`); glob компонента `**/component/**/*.{js,ts}` (dist, не только src); порядок наполнение↔развёртывание на prod; `contentGap:true` при пустом результате из битых ссылок; замер производительности k·round-trip против `.collect()`; правка sync-инварианта в ADR 0009 (`clearLayoutPage` — не точка синхронизации); страховка покрытия границы/изоляции в Task 6 на случай провала convex-test-исследования; долг `make next-batch`; обновление `shared/README.md`. Отложенное (soft-слой, over-sample, recency) аудит как пропуск не засчитал.

---

## Границы

**Входит:**
- компонент `@convex-dev/aggregate` (`convex.config.ts`), экземпляр `drillIndex` над `drillSelectionIndex`;
- синхронизация агрегата при пересборке индекса (`convex/selectionIndex.ts`) + наполнение через `rebuild`;
- чистые помощники случайного отбора (seeded PRNG + distinct-offset) в `shared/`;
- `drillNext`: **mutation → query** с `seed`; равномерный отбор через `count`/`at`, тот же контракт ответа;
- `src/machines/session-impl.ts`: `convex.query` вместо `convex.mutation` + генерирование `seed` на каждый поход.

**Не входит** (осознанно, по разбору + ADR 0009):
- soft-слой `rankBySoftSignals` и over-sample — отложены до первого реального сигнала (фокус — ADR 0004, анти-повтор/recency — позже);
- анти-повтор/recency (его сейчас нет вовсе — `fetchDrills` зовётся независимо, `session.machine.ts` не отслеживает выданные drill'ы);
- промоция новых жёстких срезов в namespace/key (через будущий `rebuild`, когда измерено «горячий + селективный»).

**Машина не меняется:** `seed` генерируется в `session-impl.ts` (impure-провайдер), `input` `fetchDrills` в `session.machine.ts` остаётся `{ symbolLayoutId, budgetChars }`. Чистая машина не трогается.

**Ветка:** `feat/drill-random-aggregate`.

## File Structure

| Файл | Ответственность | Действие |
|---|---|---|
| `convex/convex.config.ts` | `defineApp` + `app.use(aggregate, { name: 'drillIndex' })` | Create |
| `convex/drillIndex.ts` | единый экземпляр `TableAggregate` `drillIndex` (общий для писателя и читателя) | Create |
| `shared/drill-selection/random-pick.ts` | `makeSeededRandom`, `nextDistinctOffset` (чистые, без I/O) | Create |
| `shared/drill-selection/random-pick.test.ts` | модульные тесты чистого отбора (project `shared`) | Create |
| `convex/selectionIndex.ts` | синхронизация агрегата: `insertBatch` (insertIfDoesNotExist), новый `resetLayoutAggregate`, `rebuild` сбрасывает namespace | Modify |
| `convex/drill.ts` | `drillNext` mutation→query (count/at/seed); `resolveOpenedSteps` ctx → reader; header под ADR 0009 | Modify |
| `convex/drill.test.ts` | регистрация компонента; `insertDrill` синхронизирует агрегат; `drillNext` как query + `seed`; +determinism/distinct | Modify |
| `convex/test-helpers.ts` | `registerDrillIndex(t)` — регистрация aggregate-компонента в convex-test | Create |
| `src/machines/session-impl.ts` | `convex.query(api.drill.drillNext, { …, seed })` + генерация seed | Modify |
| `shared/drill-selection/` (README upd.) | дописать каталог в `shared/README.md` (дерево + назначение) | Modify |
| `convex/selectionIndex.ts` (`next-batch`) / `Makefile` | пред-существующий долг: `make next-batch` шлёт `openedSteps` (нет в args) → поправить на `seed` или отметить | Modify |
| `docs/adr/0009-...md` | (1) исправить формулировку sync-инварианта в Consequences (`clearLayoutPage` — НЕ точка синхронизация); (2) приписать «реализовано в плане 2026-06-25» | Modify |

---

## Решения и риски (зафиксировано до старта)

- **Тип `seed` — `v.number()` (целое).** `session-impl` шлёт `Math.floor(Math.random() * 0x7fffffff)`. Query инициализирует seed mulberry32. Один seed → воспроизводимая выборка (нужно для тестов и воспроизведения).
- **Два `db.get` на выбранный drill.** `at()` возвращает id строки `drillSelectionIndex` (агрегат над ней), а не drill. Цепочка: `at → db.get(selectionRowId) → db.get(row.drillId)`. При малом k (десяток) — копейки; денормализацию данных в индекс не делаем (ADR 0009: индекс остаётся узким).
- **Несущая гипотеза `at()` + `bounds` — контрольная точка Task 1.** Корректность жёсткого фильтра держится на том, что `at(ctx, offset, { namespace, bounds })` принимает `bounds` И что `offset ∈ [0, count(bounds))` индексирует элемент **внутри среза** (а не по всему namespace). Доки context7 показывают `at` только с `namespace`; исходник компонента (JSDoc `at`: «smallest key within the bounds») это подтверждает — но **проверить на установленном пакете обязательно до Task 4**. Если `at` bounds НЕ принимает / offset глобален — фильтр «течёт» (drill'ы со `stepLevel ≥ openedSteps` в выдаче, нарушение ADR 0001). Fallback: отбор внутри среза через композитный namespace `(layout, …)` либо rejection по `key < openedSteps` после `at`. Подтверждение — в Task 1, Step 1.
- **Производительность: k последовательных `at`+`db.get` против одного `.collect()`.** При широком `budgetChars` / мелких drill'ах k ~ десятки → ~3k обращений на поход (не O(pool), но больше round-trip'ов, чем текущий один `.collect()`). v1 оставляем последовательным (поведение-сохраняющий); Task 6 явно мерит `elapsedMs` и сравнивает с текущим. Оптимизация (`atBatch`/`countBatch` или денормализация `text`/`length` в индекс) — позже, при ИЗМЕРЕННОЙ проблеме, не сейчас.
- **`convex-test` + компонент — исследование (Task 1).** `convex-test@0.0.53` умеет `registerComponent(path, schema, glob)`, но точные пути к schema/модулям компонента видны только после установки. Task 1 ставит компонент и зелёным smoke-тестом фиксирует регистрацию; дальше тесты `drillNext` опираются на неё. Если регистрация в 0.0.53 не заведётся — чистые тесты (Task 2) покрывают логику отбора, а проводку проверяем в dev (`npx convex run` / реальная сессия); это явный fallback, не тихий.
- **`resolveOpenedSteps` теперь читатель.** Тип ctx расширяется до `QueryCtx | MutationCtx` (только читает) — вызывается из query `drillNext` и из тестов в `t.run`.
- **Backfill = `rebuild`.** Отдельной миграции нет: `drillSelectionIndex` пишется только пересборкой; `rebuild` сбрасывает namespace агрегата и переинсертит — он же наполняет агрегат. **Порядок на prod:** агрегат наполнять ДО/одновременно с развёртыванием query-`drillNext`, иначе окно «пустой агрегат → `count===0` → `contentGap` → тихая деградация на локальный корпус». На cloud-dev (`wandering-ocelot-9`) окно приемлемо (никто не печатает во время работы).

---

## Task 1: Подключить компонент Aggregate + регистрация в convex-test (спайк)

**Files:**
- Create: `convex/convex.config.ts`, `convex/drillIndex.ts`, `convex/test-helpers.ts`
- Test: `convex/drillIndex.test.ts` (smoke)

- [ ] **Step 1: Установить компонент**

Run:
```bash
npm install @convex-dev/aggregate
```
Expected: пакет в `dependencies`. Затем зафиксировать раскладку файлов компонента (для glob регистрации) и **подтвердить несущую гипотезу `at()` + `bounds`** (см. Риски):
```bash
ls node_modules/@convex-dev/aggregate/dist/component/ node_modules/@convex-dev/aggregate/src/component/ 2>/dev/null
grep -rn "at(" node_modules/@convex-dev/aggregate/dist/*.d.ts | head
```
Expected: найден реальный макет компонента (у published-пакета обычно `dist/component/`, файлы `.js`) — запомнить путь для glob (Step 5). И в типах `at(ctx, offset, opts?)` параметр `opts` содержит `bounds` (а offset относителен к bounds). Если `bounds` в `at` НЕ принимается — остановиться и применить fallback из Риски (композитный namespace / rejection по `key`), это меняет Task 4.

- [ ] **Step 2: Создать `convex/convex.config.ts`**

```ts
import { defineApp } from 'convex/server';
import aggregate from '@convex-dev/aggregate/convex.config.js';

const app = defineApp();
// Экземпляр агрегата над drillSelectionIndex (ADR 0009). Имя → ключ в components.
app.use(aggregate, { name: 'drillIndex' });
export default app;
```

- [ ] **Step 3: Создать `convex/drillIndex.ts` (единый экземпляр)**

```ts
/**
 * @file Экземпляр TableAggregate над drillSelectionIndex (ADR 0009). Один на проект,
 * общий для писателя (convex/selectionIndex.ts — синхронизация при пересборке) и читателя
 * (convex/drill.ts — count/at). Namespace = раскладка (отдельное дерево, нет
 * cross-layout конкуренции), Key = stepLevel (диапазон «потолок репертуара»).
 */
import { TableAggregate } from '@convex-dev/aggregate';
import { components } from './_generated/api';
import type { DataModel } from './_generated/dataModel';

export const drillIndex = new TableAggregate<{
  Namespace: string;
  Key: number;
  DataModel: DataModel;
  TableName: 'drillSelectionIndex';
}>(components.drillIndex, {
  namespace: (row) => row.symbolLayoutId,
  sortKey: (row) => row.stepLevel,
});
```

- [ ] **Step 4: Развернуть и проверить, что существующие функции/auth живы**

Run:
```bash
npx convex dev --once
```
Expected: развёртывание без ошибок (`components.drillIndex` сгенерирован в `_generated/api`). Память проекта: `convex-test`/build не ловят ошибки развёртывания — этот шаг обязателен.

- [ ] **Step 5: Создать `convex/test-helpers.ts` (регистрация компонента)**

> Пути в glob — по факту установки (Step 1): glob `**/component/**` покрывает и `dist/`, и `src/`; расширения `{js,ts}` — на случай, что в пакете только `.js`. Имя монтирования `'drillIndex'` — как в `app.use`. Тип `t` — `TestConvex<typeof schema>` (НЕ `<never>`: `never` не удовлетворяет constraint generic-параметра, `tsc`/`svelte-check` отвергнут).

```ts
import type { TestConvex } from 'convex-test';
import schema from './schema';
import aggregateSchema from '@convex-dev/aggregate/src/component/schema';

const aggregateModules = import.meta.glob(
  '../node_modules/@convex-dev/aggregate/**/component/**/*.{js,ts}',
);

/** Регистрирует экземпляр aggregate-компонента `drillIndex` в convex-test. */
export function registerDrillIndex(t: TestConvex<typeof schema>): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (t as any).registerComponent('drillIndex', aggregateSchema, aggregateModules);
}
```

- [ ] **Step 6: Написать падающий smoke-тест `convex/drillIndex.test.ts`**

```ts
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import schema from './schema';
import { drillIndex } from './drillIndex';
import { registerDrillIndex } from './test-helpers';

const modules = import.meta.glob('./**/*.ts');

describe('drillIndex — aggregate component в convex-test', () => {
  test('insert → count видит строку в namespace', async () => {
    const t = convexTest(schema, modules);
    registerDrillIndex(t);
    await t.run(async (ctx) => {
      const id = await ctx.db.insert('drillSelectionIndex', {
        drillId: (await ctx.db.insert('drills', {
          text: 'a', length: 1, uniqueSymbols: ['a'], wordCount: 1,
          avgWordLength: 1, maxWordLength: 1, bigrams: [], symbolFrequency: [],
        })),
        symbolLayoutId: 'test', stepLevel: 0,
      });
      const row = await ctx.db.get(id);
      await drillIndex.insertIfDoesNotExist(ctx, row!);
      expect(await drillIndex.count(ctx, { namespace: 'test' })).toBe(1);
    });
  });
});
```

- [ ] **Step 7: Запустить — убедиться, что падает / чинить регистрацию**

Run: `npx vitest run convex/drillIndex.test.ts`
Expected сначала: FAIL **по регистрации/путям** (не по `components.drillIndex === undefined`). Step 4 (`convex dev --once`) ОБЯЗАТЕЛЕН до этого шага — иначе `_generated/api.components.drillIndex` не существует и тест падает по ложной причине, контрольная точка врёт. Поправить glob/schema-путь и имя монтирования по факту установки, пока тест не станет PASS. Это контрольная точка: дальше тесты `drillNext` опираются на рабочую регистрацию.

- [ ] **Step 8: Commit**

```bash
git add convex/convex.config.ts convex/drillIndex.ts convex/test-helpers.ts convex/drillIndex.test.ts package.json package-lock.json
git commit -m "feat(convex): подключить aggregate-компонент drillIndex над drillSelectionIndex (ADR 0009)"
```

---

## Task 2: Чистые помощники случайного отбора (`shared/`)

**Files:**
- Create: `shared/drill-selection/random-pick.ts`
- Test: `shared/drill-selection/random-pick.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
// shared/drill-selection/random-pick.test.ts
import { describe, expect, test } from 'vitest';
import { makeSeededRandom, nextDistinctOffset } from './random-pick.ts';

describe('makeSeededRandom', () => {
  test('один seed → идентичная последовательность', () => {
    const a = makeSeededRandom(42);
    const b = makeSeededRandom(42);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });
  test('значения в [0, 1)', () => {
    const r = makeSeededRandom(7);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
  test('разные seed → разный первый бросок', () => {
    expect(makeSeededRandom(1)()).not.toBe(makeSeededRandom(2)());
  });
});

describe('nextDistinctOffset', () => {
  test('возвращает offset в [0, count) и не повторяет', () => {
    const rng = makeSeededRandom(99);
    const used = new Set<number>();
    const offsets: number[] = [];
    for (let i = 0; i < 5; i++) {
      const o = nextDistinctOffset({ rng, count: 5, used });
      expect(o).not.toBeNull();
      expect(o).toBeGreaterThanOrEqual(0);
      expect(o).toBeLessThan(5);
      offsets.push(o!);
    }
    expect(new Set(offsets).size).toBe(5); // перестановка без повторов
  });
  test('исчерпание пула → null', () => {
    const rng = makeSeededRandom(3);
    const used = new Set<number>([0, 1, 2]);
    expect(nextDistinctOffset({ rng, count: 3, used })).toBeNull();
  });
  test('детерминизм: один seed → один порядок offsets', () => {
    const draw = (seed: number) => {
      const rng = makeSeededRandom(seed);
      const used = new Set<number>();
      return [0, 1, 2, 3].map(() => nextDistinctOffset({ rng, count: 4, used }));
    };
    expect(draw(123)).toEqual(draw(123));
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npx vitest run shared/drill-selection/random-pick.test.ts`
Expected: FAIL — `random-pick.ts` не существует.

- [ ] **Step 3: Реализовать `shared/drill-selection/random-pick.ts`**

```ts
/**
 * @file Чистые помощники равномерного случайного отбора (ADR 0009, storage-слой).
 * Детерминированы по seed → воспроизводимая выборка (воспроизведение/тесты). I/O нет —
 * adapter (convex/drill.ts) дёргает at()/db.get() по полученным offset'ам.
 */

/** Детерминированный PRNG (mulberry32): seed → поток float ∈ [0, 1). */
export function makeSeededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Следующий уникальный offset ∈ [0, count) через rejection по `used` (изменяется).
 * null, когда пул исчерпан (used покрывает весь диапазон). При k ≪ count коллизии
 * редки → O(1) амортизированно; на исчерпании выходим сразу, без зацикливания.
 */
export function nextDistinctOffset({
  rng,
  count,
  used,
}: {
  rng: () => number;
  count: number;
  used: Set<number>;
}): number | null {
  if (used.size >= count) return null;
  for (;;) {
    const offset = Math.floor(rng() * count);
    if (!used.has(offset)) {
      used.add(offset);
      return offset;
    }
  }
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `npx vitest run shared/drill-selection/random-pick.test.ts`
Expected: PASS (все кейсы).

- [ ] **Step 5: Дописать `shared/README.md`**

Добавить `drill-selection/` в дерево каталогов и одну строку назначения: «`drill-selection/` — чистый случайный отбор (seeded PRNG + distinct-offset), storage-слой ADR 0009; делит сервер `convex/drill.ts`». Это держит документацию `shared/` в синхронизации (там перечислены подпапки).

- [ ] **Step 6: Commit**

```bash
git add shared/drill-selection/random-pick.ts shared/drill-selection/random-pick.test.ts shared/README.md
git commit -m "feat(shared): seeded PRNG + distinct-offset для случайного отбора (ADR 0009)"
```

---

## Task 3: Синхронизация агрегата при пересборке индекса

**Files:**
- Modify: `convex/selectionIndex.ts`
- Test: `convex/selectionIndex.test.ts` (создать, если нет)

- [ ] **Step 1: Написать падающий тест — rebuild наполняет агрегат**

```ts
// convex/selectionIndex.test.ts
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import { internal } from './_generated/api';
import schema from './schema';
import { drillIndex } from './drillIndex';
import { registerDrillIndex } from './test-helpers';

const modules = import.meta.glob('./**/*.ts');

describe('selectionIndex sync — агрегат следует за таблицей', () => {
  test('insertBatch наполняет namespace агрегата', async () => {
    const t = convexTest(schema, modules);
    registerDrillIndex(t);
    const drillId = await t.run(async (ctx) =>
      ctx.db.insert('drills', {
        text: 'abc', length: 3, uniqueSymbols: ['a', 'b', 'c'], wordCount: 1,
        avgWordLength: 3, maxWordLength: 3, bigrams: [], symbolFrequency: [],
      }),
    );
    await t.mutation(internal.selectionIndex.insertBatch, {
      rows: [{ drillId, symbolLayoutId: 'йцукен', stepLevel: 0 }],
    });
    await t.run(async (ctx) => {
      expect(await drillIndex.count(ctx, { namespace: 'йцукен' })).toBe(1);
    });
  });

  test('resetLayoutAggregate очищает namespace', async () => {
    const t = convexTest(schema, modules);
    registerDrillIndex(t);
    const drillId = await t.run(async (ctx) =>
      ctx.db.insert('drills', {
        text: 'x', length: 1, uniqueSymbols: ['x'], wordCount: 1,
        avgWordLength: 1, maxWordLength: 1, bigrams: [], symbolFrequency: [],
      }),
    );
    await t.mutation(internal.selectionIndex.insertBatch, {
      rows: [{ drillId, symbolLayoutId: 'йцукен', stepLevel: 0 }],
    });
    await t.mutation(internal.selectionIndex.resetLayoutAggregate, { symbolLayoutId: 'йцукен' });
    await t.run(async (ctx) => {
      expect(await drillIndex.count(ctx, { namespace: 'йцукен' })).toBe(0);
    });
  });
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npx vitest run convex/selectionIndex.test.ts`
Expected: FAIL — `resetLayoutAggregate` нет; `insertBatch` не синхронизирует агрегат.

- [ ] **Step 3: Подключить синхронизацию в `convex/selectionIndex.ts`**

Добавить импорт в шапку:
```ts
import { drillIndex } from './drillIndex';
```

Заменить `insertBatch` на версию с idempotent-sync:
```ts
/** Вставка партии строк таблицы отбора + дублирование в агрегат (ADR 0009). */
export const insertBatch = internalMutation({
  args: {
    rows: v.array(
      v.object({ drillId: v.id('drills'), symbolLayoutId: v.string(), stepLevel: v.number() })
    ),
  },
  handler: async (ctx, args) => {
    for (const row of args.rows) {
      const id = await ctx.db.insert('drillSelectionIndex', row);
      const doc = await ctx.db.get(id);
      await drillIndex.insertIfDoesNotExist(ctx, doc!);
    }
  },
});
```

Добавить новую мутацию рядом с `clearLayoutPage`:
```ts
/** Сброс namespace агрегата для раскладки (идемпотентность rebuild: ADR 0009). */
export const resetLayoutAggregate = internalMutation({
  args: { symbolLayoutId: v.string() },
  handler: async (ctx, args) => {
    await drillIndex.clear(ctx, { namespace: args.symbolLayoutId });
  },
});
```

> `clearLayoutPage` остаётся **только про таблицу** (агрегат для раскладки сбрасывается одним `resetLayoutAggregate` в `rebuild`). Инвариант «таблица ↔ агрегат» держится на уровне оркестрации `rebuild` — единственного писателя `drillSelectionIndex`.

- [ ] **Step 4: Встроить сброс в `rebuild`**

В `handler` `rebuild`, между циклом очистки таблицы и циклом вставки, добавить вызов сброса агрегата:
```ts
    // … после цикла clearLayoutPage (cleared подсчитан) …
    await ctx.runMutation(internal.selectionIndex.resetLayoutAggregate, {
      symbolLayoutId: args.symbolLayoutId,
    });

    let cursor: string | null = null;
    // … далее существующий цикл drillsPage → insertBatch (уже синхронизирует агрегат) …
```

- [ ] **Step 5: Запустить — убедиться, что проходит**

Run: `npx vitest run convex/selectionIndex.test.ts`
Expected: PASS (insertBatch наполняет, resetLayoutAggregate очищает).

- [ ] **Step 6: Commit**

```bash
git add convex/selectionIndex.ts convex/selectionIndex.test.ts
git commit -m "feat(convex): дублировать drillSelectionIndex в aggregate при rebuild (ADR 0009)"
```

---

## Task 4: `drillNext` mutation → query со случайным доступом

**Files:**
- Modify: `convex/drill.ts`, `convex/drill.test.ts`

- [ ] **Step 1: Переписать тесты `drillNext` под query + seed + регистрацию компонента**

В `convex/drill.test.ts`: добавить импорты и регистрацию, обновить `insertDrill` (синхронизацию агрегата), вызовы `t.mutation(api.drill.drillNext…)` → `t.query(api.drill.drillNext, { …, seed })`. Полные правки:

Шапка (добавить):
```ts
import { drillIndex } from './drillIndex';
import { registerDrillIndex } from './test-helpers';
```

`insertDrill` — синхронизировать агрегат после вставки строки индекса:
```ts
async function insertDrill(
  ctx: MutationCtx,
  { text, step, layout }: { text: string; step: number; layout: string }
) {
  const length = text.length;
  const drillId = await ctx.db.insert('drills', {
    text, length, uniqueSymbols: [...new Set(text.split(''))],
    wordCount: 1, avgWordLength: length, maxWordLength: length, bigrams: [], symbolFrequency: [],
  });
  const rowId = await ctx.db.insert('drillSelectionIndex', { drillId, symbolLayoutId: layout, stepLevel: step });
  await drillIndex.insertIfDoesNotExist(ctx, (await ctx.db.get(rowId))!);
  return drillId;
}
```

Блок `describe('drillNext …')` — каждый кейс: `registerDrillIndex(t)` после `convexTest`, и `t.query(api.drill.drillNext, { symbolLayoutId, budgetChars, seed: 1 })`. Например:
```ts
test('бюджет ограничивает порцию: budgetChars 10 → 2 drill по 5', async () => {
  const t = convexTest(schema, modules);
  registerDrillIndex(t);
  await t.run(async (ctx) => {
    for (let i = 0; i < 10; i++) await insertDrill(ctx, { text: 'abcde', step: 0, layout: 'test' });
  });
  const res = await t.query(api.drill.drillNext, { symbolLayoutId: 'test', budgetChars: 10, seed: 1 });
  expect(res.contentGap).toBe(false);
  expect(res.drills).toHaveLength(2);
  expect(res.drills.reduce((sum, d) => sum + d.length, 0)).toBe(10);
});
```
(Аналогично: `жёсткий фильтр по openedSteps`, `изоляция по раскладке`, `пустой пул → contentGap` — добавить `registerDrillIndex(t)` и `t.query(…, { …, seed: 1 })`.)

Добавить два новых кейса:
```ts
test('seed детерминирует выборку: один seed → одинаковые id', async () => {
  const t = convexTest(schema, modules);
  registerDrillIndex(t);
  await t.run(async (ctx) => {
    for (let i = 0; i < 20; i++) await insertDrill(ctx, { text: `dr${i}xx`, step: 0, layout: 'test' });
  });
  const a = await t.query(api.drill.drillNext, { symbolLayoutId: 'test', budgetChars: 10, seed: 777 });
  const b = await t.query(api.drill.drillNext, { symbolLayoutId: 'test', budgetChars: 10, seed: 777 });
  expect(a.drills.map((d) => d.id)).toEqual(b.drills.map((d) => d.id));
});

test('drill\'ы в порции не повторяются (distinct)', async () => {
  const t = convexTest(schema, modules);
  registerDrillIndex(t);
  await t.run(async (ctx) => {
    for (let i = 0; i < 20; i++) await insertDrill(ctx, { text: 'abcde', step: 0, layout: 'test' });
  });
  const res = await t.query(api.drill.drillNext, { symbolLayoutId: 'test', budgetChars: 50, seed: 5 });
  expect(new Set(res.drills.map((d) => d.id)).size).toBe(res.drills.length);
});
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `npx vitest run convex/drill.test.ts`
Expected: FAIL — `t.query` на mutation `drillNext` не резолвится / нет аргумента `seed`.

- [ ] **Step 3: Переписать `drillNext` в `convex/drill.ts`**

Обновить импорты:
```ts
import { mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { drillIndex } from './drillIndex';
import { makeSeededRandom, nextDistinctOffset } from '../shared/drill-selection/random-pick.ts';
```

Расширить ctx у `resolveOpenedSteps` (теперь читатель):
```ts
export async function resolveOpenedSteps({
  ctx,
  userId,
  symbolLayoutId,
}: {
  ctx: QueryCtx | MutationCtx;
  userId: Id<'users'> | null;
  symbolLayoutId: string;
}): Promise<number> {
  // … тело без изменений (только чтение ctx.db.query) …
}
```

Заменить `export const drillNext = mutation({...})` на query:
```ts
export const drillNext = query({
  args: {
    symbolLayoutId: v.string(),
    budgetChars: v.number(),
    seed: v.number(),
  },
  returns: v.object({
    contentGap: v.boolean(),
    drills: v.array(v.object({ id: v.id('drills'), text: v.string(), length: v.number() })),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const openedSteps = await resolveOpenedSteps({ ctx, userId, symbolLayoutId: args.symbolLayoutId });

    // Жёсткий фильтр (ADR 0009): namespace=раскладка, bounds: stepLevel < openedSteps.
    const bounds = { upper: { key: openedSteps, inclusive: false } } as const;
    const count = await drillIndex.count(ctx, { namespace: args.symbolLayoutId, bounds });

    if (count === 0) {
      console.warn(
        `drillNext: пустой пул (раскладка ${args.symbolLayoutId}, openedSteps ${openedSteps}) — контентный сбой`
      );
      return { contentGap: true, drills: [] };
    }

    // Равномерный seeded-отбор distinct drill'ов под бюджет (поведение-сохраняющий v1).
    // Свежесть — из seed (разный на каждый поход с клиента → разный ключ кэша query).
    const rng = makeSeededRandom(args.seed);
    const used = new Set<number>();
    const drills: { id: Id<'drills'>; text: string; length: number }[] = [];
    let total = 0;
    for (;;) {
      if (drills.length > 0 && total >= args.budgetChars) break;
      const offset = nextDistinctOffset({ rng, count, used });
      if (offset === null) break;
      const { id: selectionId } = await drillIndex.at(ctx, offset, { namespace: args.symbolLayoutId, bounds });
      const row = await ctx.db.get(selectionId); // строка drillSelectionIndex
      if (row === null) continue;
      const drill = await ctx.db.get(row.drillId);
      if (drill === null) continue;
      drills.push({ id: drill._id, text: drill.text, length: drill.length });
      total += drill.length;
    }

    // Пул не пуст (count>0), но все ссылки битые → это контентный сбой, а не
    // «успех с нулём»: не врём contentGap:false (иначе session-impl примет пустой
    // stream за валидный и не деградирует на корпус с правильным сигналом).
    if (drills.length === 0) return { contentGap: true, drills: [] };
    return { contentGap: false, drills };
  },
});
```

- [ ] **Step 4: Обновить header-комментарий файла под ADR 0009**

В шапке `convex/drill.ts` заменить абзац «Это **mutation**, а не query…» на:
```ts
 * `drillNext` — **query** (ADR 0009): жёсткий фильтр исполняет агрегат
 * `drillIndex` (namespace=раскладка, bounds: stepLevel < openedSteps), случайный
 * доступ — count()+at() за O(log n). Свежесть выборки даёт `seed`-аргумент с
 * клиента (разный ключ кэша query), а не write-путь mutation. Форма распределения
 * (soft-слой) — отложена (ADR 0009), v1 равномерный.
```

- [ ] **Step 5: Запустить — убедиться, что проходит + типы/линт**

Run:
```bash
npx vitest run convex/drill.test.ts
make check
```
Expected: тесты PASS; `svelte-check` без ошибок (в т.ч. расширенный ctx `resolveOpenedSteps`).

- [ ] **Step 6: Commit**

```bash
git add convex/drill.ts convex/drill.test.ts
git commit -m "feat(convex): drillNext mutation→query со случайным доступом через aggregate + seed (ADR 0009)"
```

---

## Task 5: Клиент — `convex.query` + генерация seed

**Files:**
- Modify: `src/machines/session-impl.ts`

- [ ] **Step 1: Заменить вызов в `fetchServerDrillStream`**

```ts
/** Серверный сбор порции через Convex drillNext (query со свежим seed, ADR 0009). */
async function fetchServerDrillStream({
  symbolLayoutId,
  budgetChars,
}: {
  symbolLayoutId: SymbolLayoutId;
  budgetChars: number;
}): Promise<TypingStream> {
  // Свежий seed на каждый поход → разный ключ кэша query → честная случайная выборка
  // (кэш Convex иначе заморозил бы порцию между записями в namespace).
  const seed = Math.floor(Math.random() * 0x7fffffff);
  logConvex(`drillNext → budgetChars=${budgetChars} layout=${symbolLayoutId} seed=${seed}`);
  const startedAt = performance.now();
  const res = await convex.query(api.drill.drillNext, { symbolLayoutId, budgetChars, seed });
  const stream = glueServerDrills({ drills: res.drills, symbolLayoutId });
  const elapsedMs = Math.round(performance.now() - startedAt);
  logConvex(`drillNext ← ${res.drills.length} drill'ов → ${stream.length} символов за ${elapsedMs}ms`);
  return stream;
}
```

> `session.machine.ts`, `drill-stream.ts` (`glueServerDrills`) — не трогаем: форма ответа (`{ id, text, length }[]`) и input `fetchDrills` те же.

- [ ] **Step 2: Прогнать клиентские тесты + типы**

Run:
```bash
npx vitest run src/machines/session.machine.test.ts
make check
```
Expected: PASS; типов-ошибок нет (`convex.query` принимает `seed: number`).

- [ ] **Step 3: Commit**

```bash
git add src/machines/session-impl.ts
git commit -m "feat(client): drillNext через convex.query со свежим seed (ADR 0009)"
```

---

## Task 6: Backfill + полная проверка + dev-верификация

**Files:** нет правок кода (операционный шаг).

- [ ] **Step 1: Развернуть и наполнить агрегат (наполнение = rebuild)**

Run (отдельный терминал — watcher, либо `--once`):
```bash
npx convex dev --once
make rebuild-selection-index
```
> `make rebuild-selection-index` прогоняет `selectionIndex:rebuild` по раскладке(ам). После — namespace агрегата `йцукен` наполнен; повторный прогон идемпотентен (reset namespace → переинсертить).

- [ ] **Step 2: Проверить наполнение агрегата в прод-среде dev**

Run:
```bash
npx convex run selectionIndex:ladderReport '{"symbolLayoutId":"йцукен"}'
```
Expected: ненулевое распределение по ступеням (таблица отбора жива). Затем дернуть выдачу:
```bash
npx convex run drill:drillNext '{"symbolLayoutId":"йцукен","budgetChars":120,"seed":1}'
```
Expected: `{ contentGap: false, drills: [ … ] }` суммой ≳120 символов; повтор с `seed:2` даёт другую порцию; повтор с `seed:1` — ту же (детерминизм).

**Граница и изоляция (страховка несущей гипотезы `at`+bounds, и единственное автоматическое покрытие фильтра, если convex-test-спайк не заведётся):** на гостевом вызове `openedSteps = 1`, значит в выдаче не должно быть ни одного drill'а со `stepLevel ≥ 1`. Сверить id из ответа против `drillSelectionIndex` (через dashboard/`convex data`) — все выданные строки имеют `stepLevel = 0`. И вызов с чужой раскладкой:
```bash
npx convex run drill:drillNext '{"symbolLayoutId":"нет-такой","budgetChars":120,"seed":1}'
```
Expected: `{ contentGap: true, drills: [] }` (пустой namespace).

**Производительность-сравнение (Риски):** в логе сессии (`[convex]` в браузере, DEV) сверить `elapsedMs` нового query против ожидания: один поход не должен быть заметно медленнее прежней mutation. Если k большое (мелкие drill'ы, высокий cpm) и `elapsedMs` растёт — зафиксировать число и занести оптимизацию (`atBatch`/денормализация) в `docs/backlog.md`, не блокируя v1.

- [ ] **Step 3: Полная проверка перед слиянием**

Run:
```bash
make check-all
```
Expected: lint + check + test (все проекты, включая новый smoke + shared + convex) + spell + build — зелёные. Если `make spell` падает — `/fix-spell` (правила CLAUDE.md), не править вручную по ходу.

- [ ] **Step 4: Ручная dev-верификация сессии**

Run `make dev` + `make convex`, начать тренировку на `/train`. В консоли браузера (фильтр `[convex]`): `drillNext → … seed=…` / `drillNext ← N drill'ов`. Убедиться, что порция приходит, добор при низкой воде работает, и `seed` разный между походами.

- [ ] **Step 5: Поправить инвариант синхронизации + дописать Consequences в ADR 0009**

В `docs/adr/0009-...md`, в `## Consequences`, **исправить** первый bullet (он называет `clearLayoutPage` точкой синхронизации — это расходится с реализацией; синхронизация живёт в `insertBatch` + один `clear()` namespace в начале `rebuild`):
```md
- Новый компонент + инвариант синхронизации: агрегат держится в синхронизации с
  `drillSelectionIndex` на уровне оркестрации `rebuild` (единственный писатель таблицы):
  `insertBatch` дублирует вставку (`insertIfDoesNotExist`), а namespace сбрасывается одним
  `clear()` в начале `rebuild` (`resetLayoutAggregate`). `clearLayoutPage` — только таблица.
  Операции идемпотентны (rebuild прогоняется повторно).
```
И добавить строку в конец Consequences:
```md
- Реализовано планом `docs/plans/2026-06-25-drill-random-selection-aggregate.md` (v1 поведение-сохраняющий: равномерный seeded-отбор, soft-слой/over-sample отложены).
```

- [ ] **Step 6: Поправить `make next-batch` (пред-существующий долг)**

В `Makefile` цель `next-batch` шлёт `openedSteps` (которого нет в args `drillNext` — будет отклонено). Заменить аргумент на `seed` (например `seed:1`) либо, если цель потеряла смысл, удалить. Проверить: `make next-batch` отрабатывает без ошибки аргумента.

- [ ] **Step 7: Commit**

```bash
git add docs/adr/0009-random-selection-aggregate-and-soft-shaping.md Makefile
git commit -m "docs(adr): синхронизировать ADR 0009 с реализацией + fix make next-batch (seed)"
```

---

## Self-Review (выполнено при написании)

- **Покрытие спецификации:** компонент (T1) · чистый отбор (T2) · синхронизация+наполнение (T3) · query+seed (T4) · клиент (T5) · наполнение+проверка (T6). Все пункты «Входит» имеют задачу.
- **Типы согласованы:** `makeSeededRandom`/`nextDistinctOffset` (T2) ↔ использование в `drillNext` (T4); `drillIndex` (T1) ↔ `insertBatch`/`resetLayoutAggregate` (T3) ↔ `count`/`at` (T4); `registerDrillIndex` (T1) ↔ тесты (T3, T4). Ответ `drillNext` (`{ id, text, length }[]`) неизменен → `glueServerDrills` не трогается.
- **Без заглушек:** каждый код-шаг содержит реальный код/команду. Единственная отмеченная неопределённость — пути glob регистрации компонента (T1, Step 5/7) — закрыта контрольной точкой smoke-теста по факту установки.
- **YAGNI:** soft-слой/over-sample/recency не материализуются (ADR 0009 + разбор); v1 — поведение-сохраняющий.
