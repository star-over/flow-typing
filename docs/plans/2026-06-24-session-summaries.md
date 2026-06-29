# Session Summaries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Завести append-only журнал сессий `sessionSummaries` в Convex (тренды cpm/accuracy, хронология ступеней, пары-путаницы), не сохраняя сырые `attempts`.

**Architecture:** Отдельная ответственность от `skillProfiles` (проекция для алгоритма). Чистый клиентский сводчик `summarizeSession` (повторно использует `drillSummarize` + добавляет confusion и cpm) → новое действие машины `emitSessionSummary` в `done.entry` → провайдер `recordSessionSummary` в `session-impl.ts` → fire-and-forget мутация `api.sessions.record`. `openedSteps` и `capturedAt` штампует сервер (как `updatedAt` в `userSettings`).

**Tech Stack:** SvelteKit 2 / Svelte 5, XState v5, Convex (mutation + `convex-test`, edge-runtime), Vitest. Тесты — по правилу «где код, там и тест»: pure/store/machine → `src/`, backend → `convex/`.

**Skills (на каждую задачу):**
- **superpowers:test-driven-development** — каждая кодовая задача идёт red → green → commit (сначала падающий тест, потом минимальная реализация).
- **superpowers:subagent-driven-development** / **executing-plans** — прогон плана по задачам с ревью между ними.
- **superpowers:verification-before-completion** — финальная задача: `make check-all` + `npx convex dev --once` должны быть зелёными до заявления «готово».

**Порядок задач (зависимости):** 1 (pure) → 2 (schema) → 3 (convex, зависит от schema) → 4 (machine, зависит от 1) → 5 (provider, зависит от 1 и 3) → 6 (verify).

**Gotcha (память проекта):** `convex-test`/build НЕ ловят ошибки развёртывания Convex — после правок в `convex/` обязателен `npx convex dev --once`. Имя модуля `sessions.ts` — camelCase без дефисов (требование Convex).

**Решения, зафиксированные аудитом плана (4 агента, чистый контекст):**
- **`cpm` — пропускная способность за активную минуту, НЕ моторная скорость.** При полной 60-сек сессии `cpm ≈ символов/сессию` (объёмный тренд — тот самый сигнал 41→244 у медленного новичка). Чистую скорость печати UI выводит из `latencyMedianMs` (≈ `60000/latencyMedianMs`). Имена не путать; при `durationMs < 1000` cpm = 0 (не делим на крошечное время).
- **`latencySpreadMs` убран** (YAGNI — нет потребителя; вернуть, когда появится).
- **Гонка `openedSteps` безопасна:** Convex исполняет мутации одного клиента одной упорядоченной очередью по порядку вызова; `drillRecord` (в `checkpointAndRecord`) отправляется раньше `sessions.record` → фиксируется первым → сервер читает свежий `openedSteps`. Держится на singleton `convex` (`src/lib/convex.ts`) — задокументировано в коде.
- **Гость — без журнала, by design** (как `drillRecord`: `throw 'Not authenticated'` → клиент гасит молча). Локальный журнал гостя — вне scope.
- **Чтение журнала** (`sessions.listMine`) включено в Task 3; UI-потребитель — отдельный план.
- **confusions V1 — только одиночные нажатия** (`pressedKeyCaps.length === 1`); пустые/сочетания клавиш отбрасываем (разбор сочетаний отложен).
- **Короткие сессии (`< MIN_JOURNAL_EXPOSURES`) не журналируем** — шум.

---

### Task 1: Чистый сводчик сессии `summarizeSession`

**Files:**
- Create: `src/lib/session-summarize.ts`
- Test: `src/lib/session-summarize.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
// src/lib/session-summarize.test.ts
import { describe, expect, test } from 'vitest';
import { summarizeSession, MAX_CONFUSIONS } from './session-summarize';
import type { StreamAttempt, StreamSymbol } from '@/interfaces/types';
import type { KeyCapId } from '@/interfaces/key-cap-id';

function press(keys: KeyCapId[], startAt?: number): StreamAttempt {
  return { pressedKeyCaps: keys, startAt };
}
function streamSymbol(targetSymbol: string, target: KeyCapId[], attempts: StreamAttempt[]): StreamSymbol {
  return { targetSymbol, targetKeyCaps: target, attempts };
}

describe('summarizeSession', () => {
  test('confusion: первый промах учитывается с направлением (target → pressed)', () => {
    const out = summarizeSession({
      stream: [streamSymbol('a', ['KeyA'], [press(['KeyS']), press(['KeyA'])])],
      durationMs: 60000,
    });
    expect(out.exposures).toBe(1);
    expect(out.clean).toBe(0);
    expect(out.confusions).toEqual([{ target: 'a', pressed: 'KeyS', count: 1 }]);
  });

  test('чистое нажатие не даёт confusion', () => {
    const out = summarizeSession({
      stream: [streamSymbol('h', ['KeyH'], [press(['KeyH'])])],
      durationMs: 60000,
    });
    expect(out.clean).toBe(1);
    expect(out.confusions).toEqual([]);
  });

  test('confusion игнорирует сочетания клавиш и пустые нажатия (V1 — только одиночные)', () => {
    const out = summarizeSession({
      stream: [
        streamSymbol('я', ['KeyZ'], [press(['KeyZ', 'ShiftLeft']), press(['KeyZ'])]), // сочетание клавиш как промах
        streamSymbol('ф', ['KeyA'], [press([]), press(['KeyA'])]), // пустое нажатие
      ],
      durationMs: 60000,
    });
    expect(out.confusions).toEqual([]);
  });

  test('cpm = exposures / минуты (durationMs из активного времени)', () => {
    const out = summarizeSession({
      stream: [streamSymbol('a', ['KeyA'], [press(['KeyA'])]), streamSymbol('b', ['KeyB'], [press(['KeyB'])])],
      durationMs: 30000, // полминуты → cpm = 2 / 0.5 = 4
    });
    expect(out.cpm).toBe(4);
    expect(out.durationMs).toBe(30000);
  });

  test('cpm = 0 при крошечной длительности (durationMs < 1000) — не делим на ~ноль', () => {
    const out = summarizeSession({
      stream: [streamSymbol('a', ['KeyA'], [press(['KeyA'])])],
      durationMs: 500,
    });
    expect(out.cpm).toBe(0);
  });

  test('confusions отсортированы по убыванию count и обрезаны до MAX_CONFUSIONS', () => {
    const stream: StreamSymbol[] = [];
    // 'a' не попадёт трижды в 'KeyS' (один пул), плюс 21 разных целей по разу.
    for (let i = 0; i < 3; i += 1) stream.push(streamSymbol('a', ['KeyA'], [press(['KeyS']), press(['KeyA'])]));
    for (let i = 0; i < 21; i += 1) {
      const sym = String.fromCharCode(0x430 + i); // кириллица а,б,в… как уникальные цели
      stream.push(streamSymbol(sym, ['KeyZ'], [press(['KeyX']), press(['KeyZ'])]));
    }
    const out = summarizeSession({ stream, durationMs: 60000 });
    expect(out.confusions.length).toBe(MAX_CONFUSIONS);
    expect(out.confusions[0]).toEqual({ target: 'a', pressed: 'KeyS', count: 3 }); // самый частый — первым
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `npx vitest run src/lib/session-summarize.test.ts`
Expected: FAIL — `Failed to resolve import "./session-summarize"` / `summarizeSession не является функцией`.

- [ ] **Step 3: Минимальная реализация**

```ts
// src/lib/session-summarize.ts
/**
 * @file `summarizeSession` — чистая клиентская сводка ВСЕЙ сессии для журнала
 * `sessionSummaries` (аналитика/коучинг). Отдельно от `drillSummarize` (дельта в
 * skillProfiles для алгоритма): добавляет направление промаха (confusion) и cpm.
 * Сырые attempts на сервер НЕ уходят — только агрегаты.
 */
import type { TypingStream } from '@/interfaces/types';
import { drillSummarize } from './drill-summarize';
import { areKeyCapIdArraysEqual } from './symbol-utils';

/** Сколько пар-путаниц максимум кладём в строку сессии (защита от роста). */
export const MAX_CONFUSIONS = 20;

export interface SessionConfusion {
  target: string; // целевой символ ('а')
  pressed: string; // нажатый KeyCapId ('KeyS'); V1 — только одиночные. UI переводит в символ через (pressed, symbolLayoutId)
  count: number;
}

export interface SessionSummaryPayload {
  exposures: number;
  clean: number;
  // Пропускная способность за активную минуту (≈ символов/сессию при полном окне),
  // НЕ моторная скорость. Чистую скорость печати UI выводит из latencyMedianMs.
  cpm: number;
  durationMs: number;
  latencyMedianMs: number;
  confusions: SessionConfusion[];
}

export function summarizeSession({
  stream,
  durationMs,
}: {
  stream: TypingStream;
  durationMs: number;
}): SessionSummaryPayload {
  const { overall } = drillSummarize(stream);

  // Направление промаха: судим ТОЛЬКО по первому нажатию (как clean в drillSummarize —
  // проскок не множим). V1 — только одиночные нажатия (сочетания/пустые мимо).
  const tally = new Map<string, SessionConfusion>();
  for (const symbol of stream) {
    const first = symbol.attempts[0];
    if (first === undefined) continue;
    if (areKeyCapIdArraysEqual({ a: first.pressedKeyCaps, b: symbol.targetKeyCaps })) continue;
    if (first.pressedKeyCaps.length !== 1) continue; // V1: пустые/сочетания — мимо
    const pressed = first.pressedKeyCaps[0];
    if (pressed === undefined) continue; // noUncheckedIndexedAccess: сужаем KeyCapId | undefined
    const key = `${symbol.targetSymbol} ${pressed}`;
    const row = tally.get(key) ?? { target: symbol.targetSymbol, pressed, count: 0 };
    row.count += 1;
    tally.set(key, row);
  }
  const confusions = [...tally.values()].sort((a, b) => b.count - a.count).slice(0, MAX_CONFUSIONS);

  // cpm — пропускная способность за активную минуту (durationMs = displayElapsedMs),
  // не моторная скорость (та — из latencyMedianMs). При длительности < 1 с измерение
  // недостоверно → cpm = 0 (не делим на ~ноль).
  return {
    exposures: overall.exposures,
    clean: overall.clean,
    cpm: durationMs >= 1000 ? overall.exposures / (durationMs / 60000) : 0,
    durationMs,
    latencyMedianMs: overall.latencyMedian,
    confusions,
  };
}
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `npx vitest run src/lib/session-summarize.test.ts`
Expected: PASS (6 тестов).

- [ ] **Step 5: Commit**

```bash
git add src/lib/session-summarize.ts src/lib/session-summarize.test.ts
git commit -m "feat(stats): summarizeSession — чистая сводка сессии (confusion + cpm)"
```

---

### Task 2: Таблица `sessionSummaries` в схеме

**Files:**
- Modify: `convex/schema.ts` (добавить таблицу после определения `skillProfiles`)

- [ ] **Step 1: Добавить таблицу в схему**

В `convex/schema.ts`, сразу после закрывающей строки таблицы `skillProfiles` (`}).index('by_user_and_layout', ['userId', 'symbolLayoutId']),`) и перед следующей таблицей, вставить:

```ts
  // Журнал сессий: append-only, по строке на завершённую сессию. Отдельно от
  // skillProfiles (проекция для алгоритма) — это аналитика/коучинг: тренд
  // cpm/accuracy, хронология ступеней (openedSteps во времени), пары-путаницы
  // (направление промаха). Сырьё attempts сюда НЕ кладём. capturedAt и
  // openedSteps штампует сервер (см. convex/sessions.ts), как updatedAt в userSettings.
  sessionSummaries: defineTable({
    userId: v.id('users'),
    symbolLayoutId: v.string(),
    capturedAt: v.number(), // server-stamped
    openedSteps: v.number(), // server-stamped из skillProfiles на момент записи
    durationMs: v.number(),
    exposures: v.number(),
    clean: v.number(),
    cpm: v.number(),
    latencyMedianMs: v.number(),
    confusions: v.array(
      v.object({ target: v.string(), pressed: v.string(), count: v.number() }),
    ),
  }).index('by_user_and_layout', ['userId', 'symbolLayoutId']),
```

- [ ] **Step 2: Проверить, что схема валидна (тип-чек)**

Run: `make check`
Expected: PASS (нет ошибок типов; `v` уже импортирован в schema.ts).

- [ ] **Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(stats): схема sessionSummaries — журнал сессий"
```

---

### Task 3: Convex `sessions` — `record` (write) + `listMine` (read)

**Files:**
- Create: `convex/sessions.ts`
- Test: `convex/sessions.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
// convex/sessions.test.ts
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import { recordSessionSummaryHandler, listMineHandler } from './sessions';
import { api } from './_generated/api';
import schema from './schema';

// import.meta.glob нужен convex-test для регистрации функций (паттерн из convex/auth.test.ts)
const modules = import.meta.glob('./**/*.ts');

const payload = {
  exposures: 200,
  clean: 190,
  cpm: 200,
  durationMs: 60000,
  latencyMedianMs: 250,
  confusions: [{ target: 'г', pressed: 'KeyR', count: 10 }],
};

describe('recordSessionSummaryHandler', () => {
  test('вставляет строку, штампует openedSteps из профиля и capturedAt', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { email: 'a@example.com' });
      await ctx.db.insert('skillProfiles', {
        userId,
        symbolLayoutId: 'йцукен',
        openedSteps: 5,
        symbolCells: [],
        updatedAt: 1000,
      });
      const id = await recordSessionSummaryHandler({ ctx, userId, symbolLayoutId: 'йцукен', payload });
      const row = await ctx.db.get(id);
      expect(row?.openedSteps).toBe(5);
      expect(row?.exposures).toBe(200);
      expect(row?.confusions).toEqual([{ target: 'г', pressed: 'KeyR', count: 10 }]);
      expect(row?.capturedAt).toBeGreaterThan(0);
    });
  });

  test('cold-start: openedSteps по умолчанию 1, если профиля нет', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { email: 'b@example.com' });
      const id = await recordSessionSummaryHandler({ ctx, userId, symbolLayoutId: 'йцукен', payload });
      const row = await ctx.db.get(id);
      expect(row?.openedSteps).toBe(1);
    });
  });

  test('append-only: две сессии → две строки', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { email: 'c@example.com' });
      await recordSessionSummaryHandler({ ctx, userId, symbolLayoutId: 'йцукен', payload });
      await recordSessionSummaryHandler({ ctx, userId, symbolLayoutId: 'йцукен', payload });
      const rows = await ctx.db
        .query('sessionSummaries')
        .withIndex('by_user_and_layout', (q) => q.eq('userId', userId).eq('symbolLayoutId', 'йцукен'))
        .collect();
      expect(rows.length).toBe(2);
    });
  });
});

describe('record mutation — auth', () => {
  test('гость (без identity) → throw Not authenticated', async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.sessions.record, { symbolLayoutId: 'йцукен', ...payload }),
    ).rejects.toThrow(/not authenticated/i);
  });
});

describe('listMineHandler', () => {
  test('строки юзера в хронологическом порядке (старые → новые)', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { email: 'd@example.com' });
      await recordSessionSummaryHandler({ ctx, userId, symbolLayoutId: 'йцукен', payload: { ...payload, exposures: 100 } });
      await recordSessionSummaryHandler({ ctx, userId, symbolLayoutId: 'йцукен', payload: { ...payload, exposures: 200 } });
      const rows = await listMineHandler({ ctx, userId, symbolLayoutId: 'йцукен' });
      expect(rows.map((r) => r.exposures)).toEqual([100, 200]); // by_user_and_layout → _creationTime ascending
    });
  });

  test('изолирует строки между юзерами', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const a = await ctx.db.insert('users', { email: 'a2@example.com' });
      const b = await ctx.db.insert('users', { email: 'b2@example.com' });
      await recordSessionSummaryHandler({ ctx, userId: a, symbolLayoutId: 'йцукен', payload });
      const rows = await listMineHandler({ ctx, userId: b, symbolLayoutId: 'йцукен' });
      expect(rows).toEqual([]);
    });
  });
});

describe('listMine query — guest', () => {
  test('гость (без identity) → пустой массив', async () => {
    const t = convexTest(schema, modules);
    const rows = await t.query(api.sessions.listMine, { symbolLayoutId: 'йцукен' });
    expect(rows).toEqual([]);
  });
});
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `npx vitest run convex/sessions.test.ts`
Expected: FAIL — `Failed to resolve import "./sessions"` (модуль не найден).

- [ ] **Step 3: Реализовать handler + мутацию `record` + reader-query `listMine`**

```ts
// convex/sessions.ts
/**
 * @file Журнал сессий (sessionSummaries): приём сводки ВСЕЙ сессии для аналитики
 * и коучинга. Отдельно от drillRecord (skillProfiles — проекция алгоритма).
 * openedSteps и capturedAt штампует сервер. Гость (не авторизован) → throw
 * 'Not authenticated' (клиент гасит молча, см. session-impl.ts). Handler вынесен
 * для теста без auth-обёртки (паттерн getMineHandler/upsertMineHandler).
 */
import { getAuthUserId } from '@convex-dev/auth/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';

// Cold-start: профиля ещё нет → шаг 0 (openedSteps = 1), как resolveOpenedSteps в drill.ts.
const DEFAULT_OPENED_STEPS = 1;

interface SessionSummaryPayload {
  exposures: number;
  clean: number;
  cpm: number;
  durationMs: number;
  latencyMedianMs: number;
  confusions: { target: string; pressed: string; count: number }[];
}

export async function recordSessionSummaryHandler({
  ctx,
  userId,
  symbolLayoutId,
  payload,
}: {
  ctx: MutationCtx;
  userId: Id<'users'>;
  symbolLayoutId: string;
  payload: SessionSummaryPayload;
}): Promise<Id<'sessionSummaries'>> {
  const profile = await ctx.db
    .query('skillProfiles')
    .withIndex('by_user_and_layout', (q) => q.eq('userId', userId).eq('symbolLayoutId', symbolLayoutId))
    .unique();

  return await ctx.db.insert('sessionSummaries', {
    userId,
    symbolLayoutId,
    ...payload,
    openedSteps: profile?.openedSteps ?? DEFAULT_OPENED_STEPS,
    capturedAt: Date.now(),
  });
}

export const record = mutation({
  args: {
    symbolLayoutId: v.string(),
    exposures: v.number(),
    clean: v.number(),
    cpm: v.number(),
    durationMs: v.number(),
    latencyMedianMs: v.number(),
    confusions: v.array(v.object({ target: v.string(), pressed: v.string(), count: v.number() })),
  },
  handler: async (ctx, { symbolLayoutId, ...payload }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error('Not authenticated');
    return await recordSessionSummaryHandler({ ctx, userId, symbolLayoutId, payload });
  },
});

// ────────────────────────────────────────────────────────────────────────────
// listMine — reader-query журнала для UI (CQRS-симметрия repertoireSnapshot).
// Гость → []. Порядок естественно хронологический: индекс by_user_and_layout с
// фиксированными userId+symbolLayoutId доупорядочен по _creationTime (старые→новые).
// ────────────────────────────────────────────────────────────────────────────
export async function listMineHandler({
  ctx,
  userId,
  symbolLayoutId,
}: {
  ctx: QueryCtx;
  userId: Id<'users'>;
  symbolLayoutId: string;
}) {
  return await ctx.db
    .query('sessionSummaries')
    .withIndex('by_user_and_layout', (q) => q.eq('userId', userId).eq('symbolLayoutId', symbolLayoutId))
    .collect();
}

export const listMine = query({
  args: { symbolLayoutId: v.string() },
  handler: async (ctx, { symbolLayoutId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    return await listMineHandler({ ctx, userId, symbolLayoutId });
  },
});
```

- [ ] **Step 4: Запустить тест — убедиться, что проходит**

Run: `npx vitest run convex/sessions.test.ts`
Expected: PASS (все тесты: handler, cold-start, append-only, guest-throw, listMine-порядок, изоляция, guest-list).

- [ ] **Step 5: Валидация развёртывания Convex (build/test это НЕ ловят)**

Run: `npx convex dev --once`
Expected: `✔ Convex functions ready` без ошибок (новый модуль `sessions` развёрнут, схема принята).

- [ ] **Step 6: Commit**

```bash
git add convex/sessions.ts convex/sessions.test.ts
git commit -m "feat(stats): sessions.record + listMine — журнал сессий (запись + чтение)"
```

---

### Task 4: Действие машины `emitSessionSummary` в `done.entry`

**Files:**
- Modify: `src/lib/session-config.ts` (константа-порог `MIN_JOURNAL_EXPOSURES`)
- Modify: `src/machines/session.machine.ts` (импорт порога; импорт сводчика; заглушка действия; `emitSessionSummary`; `done.entry`)
- Test: `src/machines/session.machine.test.ts` (новый тест)

- [ ] **Step 1: Написать падающий тест**

Добавить в `src/machines/session.machine.test.ts` внутри `describe('sessionMachine', …)` (зеркало теста «истёкший таймер → done», строки 133–154):

```ts
  it('на завершении сессии (done) шлёт recordSessionSummary с payload по всему потоку', async () => {
    const onSession = vi.fn();
    let call = 0;
    // Восемь символов: с запасом проходим guard MIN_JOURNAL_EXPOSURES (5).
    const EIGHT: TypingStream = Array.from({ length: 8 }, () => sym('a', 'KeyA'));
    const providedSession = sessionMachine.provide({
      actors: {
        fetchDrills: fromPromise(async () => {
          call += 1;
          return call === 1 ? EIGHT : [];
        }),
      },
      actions: {
        recordCheckpoint: () => {},
        recordSessionSummary: (_, p) =>
          onSession((p as { payload: { exposures: number; confusions: unknown[]; durationMs: number } }).payload),
      },
    });
    const actor = createActor(providedSession, { input: INPUT });
    actor.start();
    await vi.waitFor(() => expect((actor.getSnapshot() as SessionSnapshot).matches(RUNNING)).toBe(true));

    for (let i = 0; i < 8; i += 1) actor.send({ type: 'KEY_PRESS', keys: ['KeyA'] });
    await vi.waitFor(() => expect((actor.getSnapshot() as SessionSnapshot).context.completed).toHaveLength(8));
    actor.send({ type: 'TIMER_EXPIRED' });
    await vi.waitFor(() => expect((actor.getSnapshot() as SessionSnapshot).matches('done')).toBe(true));

    expect(onSession).toHaveBeenCalledTimes(1); // ровно один раз — в done, не на дозагрузках
    const payload = onSession.mock.calls[0][0] as { exposures: number; confusions: unknown[]; durationMs: number };
    expect(payload.exposures).toBe(8);
    expect(payload.confusions).toEqual([]);
    expect(typeof payload.durationMs).toBe('number');
  });
```

- [ ] **Step 2: Запустить тест — убедиться, что падает**

Run: `npx vitest run src/machines/session.machine.test.ts -t "recordSessionSummary"`
Expected: FAIL — `recordSessionSummary not provided` (заглушка бросает) либо действие не вызвано.

- [ ] **Step 3a: Добавить импорт сводчика**

В `src/machines/session.machine.ts`, рядом с импортом `drillSummarize` (строка 21), добавить:

```ts
import { summarizeSession, type SessionSummaryPayload } from '@/lib/session-summarize';
```

- [ ] **Step 3b: Добавить заглушку действия в `setup.actions`**

В блоке `actions:` сразу после заглушки `recordCheckpoint` (строки 81–83) добавить:

```ts
    recordSessionSummary: (
      _,
      _params: { payload: SessionSummaryPayload; symbolLayoutId: SymbolLayoutId },
    ) => {
      throw new Error('recordSessionSummary not provided');
    },
```

- [ ] **Step 3c: Добавить порог журналирования (в `session-config`) и действие `emitSessionSummary`**

Сначала в `src/lib/session-config.ts` (рядом с `REFILL_THRESHOLD_SYMBOLS`/`DRAIN_CAP_MS` — там живут числа-настройки сессии) добавить:

```ts
/**
 * Нижний порог журналирования сессии в символах: короче — шум (мало данных,
 * неустойчивый cpm/латентность), строку в sessionSummaries не пишем.
 */
export const MIN_JOURNAL_EXPOSURES = 5;
```

Затем подключить его в импорт `@/lib/session-config` в `src/machines/session.machine.ts` (строки 24–29):

```ts
import {
  DRAIN_CAP_MS,
  MIN_JOURNAL_EXPOSURES,
  REFILL_THRESHOLD_SYMBOLS,
  SESSION_DURATION_SECONDS,
  TICK_INTERVAL_MS,
} from '@/lib/session-config';
```

Затем в блоке `actions:`, после `checkpointAndRecord` (строки 98–105), добавить действие:

```ts
    // Сводка ВСЕЙ сессии в журнал (sessionSummaries) — на завершении. Берёт весь
    // completed[] (не срез чекпоинта) и displayElapsedMs как длительность (активное
    // время за вычетом пауз). Порядок в done.entry важен: emitSessionSummary идёт
    // ПОСЛЕ checkpointAndRecord — обе мутации Convex от одного клиента (singleton
    // src/lib/convex.ts) исполняются одной упорядоченной очередью по порядку вызова,
    // значит drillRecord зафиксирует рост openedSteps раньше, чем sessions.record его
    // прочитает. Короткие сессии (< MIN_JOURNAL_EXPOSURES) — шум, не журналируем.
    emitSessionSummary: enqueueActions(({ context, enqueue }) => {
      if (context.completed.length === 0) return;
      const payload = summarizeSession({ stream: context.completed, durationMs: context.displayElapsedMs });
      if (payload.exposures < MIN_JOURNAL_EXPOSURES) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      enqueue({ type: 'recordSessionSummary', params: { payload, symbolLayoutId: context.symbolLayoutId } } as any);
    }),
```

- [ ] **Step 3d: Подключить действие в `done.entry`**

В состоянии `done` (строка 270) заменить:

```ts
    done: {
      entry: ['checkpointAndRecord', 'sendComplete'],
      type: 'final',
```

на (вставить `emitSessionSummary` между чекпоинтом и завершением — чтобы профиль уже обновился и сервер прочитал свежий openedSteps):

```ts
    done: {
      entry: ['checkpointAndRecord', 'emitSessionSummary', 'sendComplete'],
      type: 'final',
```

- [ ] **Step 3e: Внедрить no-op `recordSessionSummary` в существующих тестах, доходящих до `done`**

Заглушка `recordSessionSummary` бросает. Тесты с сессией ≥ 5 символов, доходящие до `done`, обязаны его внедрить (как `recordCheckpoint`). Короткие (1–2 символа) отсечёт guard *до* enqueue, но внедряем no-op везде для надёжности (иначе будущее снижение порога их сломает).

В помощнике `makeSession` (строки 20–32) добавить в объект `actions`:

```ts
      recordSessionSummary: () => {},
```

В тесте «истёкший таймер при уже допечатанном потоке → сразу done» (его `provide({ actions: { recordCheckpoint: () => {} } })`) добавить туда же:

```ts
      recordSessionSummary: () => {},
```

- [ ] **Step 4: Запустить тесты — убедиться, что проходят**

Run: `npx vitest run src/machines/session.machine.test.ts`
Expected: PASS — новый тест + прежние (no-op `recordSessionSummary` внедрён в `makeSession` и в тесте «сразу done»; короткие сессии guard отсекает до enqueue).

- [ ] **Step 5: Commit**

```bash
git add src/machines/session.machine.ts src/machines/session.machine.test.ts
git commit -m "feat(stats): emitSessionSummary в done — журнал сессии из машины"
```

---

### Task 5: Реальный провайдер `recordSessionSummary` (Convex)

**Files:**
- Modify: `src/machines/session-impl.ts` (добавить действие-провайдер рядом с `recordCheckpoint`)

Примечание: как и `recordCheckpoint`, это побочный эффект Convex (fire-and-forget) — отдельным модульным тестом не покрываем; корректность проводки ловит `make check` (типы) и финальная задача. Тип `params` выводится из сигнатуры действия машины (Task 4).

- [ ] **Step 1: Добавить провайдер**

В `src/machines/session-impl.ts`, в объекте `actions:` сразу после действия `recordCheckpoint` (закрывается на строке 76 — `},`), добавить:

```ts
    // Журнал сессии: fire-and-forget, как recordCheckpoint. capturedAt/openedSteps
    // ставит сервер. Гость → 'Not authenticated' → молча гасим.
    recordSessionSummary: (_, params) => {
      const { payload, symbolLayoutId } = params;
      logConvex(
        `sessionRecord → ${payload.exposures} символов, cpm=${Math.round(payload.cpm)} confusions=${payload.confusions.length}`,
      );
      const startedAt = performance.now();
      void convex
        .mutation(api.sessions.record, { symbolLayoutId, ...payload })
        .then(() => logConvex(`sessionRecord ← ok за ${Math.round(performance.now() - startedAt)}ms`))
        .catch((err) => console.warn('sessionSummary пропущен (гость/офлайн)', err));
    },
```

- [ ] **Step 2: Тип-чек проводки**

Run: `make check`
Expected: PASS — `api.sessions.record` существует (Task 3), форма `{ symbolLayoutId, ...payload }` совпадает с args мутации, тип `params` совпадает с действием машины.

- [ ] **Step 3: Прогон всех тестов**

Run: `make test`
Expected: PASS — оба проекта `|src|` и `|convex|` зелёные.

- [ ] **Step 4: Commit**

```bash
git add src/machines/session-impl.ts
git commit -m "feat(stats): провайдер recordSessionSummary — запись журнала в Convex"
```

---

### Task 6: Финальная верификация (skill: verification-before-completion)

**Files:** — (только проверки, без правок)

- [ ] **Step 1: Полная проверка перед коммитом**

Run: `make check-all`
Expected: PASS — lint + check + test + spell + build все зелёные. (Если `make spell` падает на русских словоформах/доменных терминах — разобрать по правилам CLAUDE.md, при необходимости `/fix-spell`.)

- [ ] **Step 2: Валидация развёртывания Convex (повтор после всех правок)**

Run: `npx convex dev --once`
Expected: `✔ Convex functions ready` без ошибок.

- [ ] **Step 3: Дымовая проверка вручную (опционально, рекомендуется)**

Запустить `make convex` и `make dev`, залогиниться, пройти одну сессию. В консоли браузера (фильтр `[convex]`) ожидать строку `sessionRecord → … cpm=… confusions=…` и `sessionRecord ← ok …`. Затем убедиться, что строка появилась в БД:

Run: `npx convex data sessionSummaries`
Expected: ≥1 строка с непустыми `cpm`, `openedSteps`, `confusions`.

---

## Self-Review (обновлено после аудита 4 агентами)

**Spec coverage:**
- Схема `sessionSummaries` (поля + bounded confusion) → Task 2. ✓
- Server-stamp `openedSteps`/`capturedAt` → Task 3 (handler). ✓
- Чистый сводчик с confusion + cpm → Task 1. ✓
- Решение durationMs = `displayElapsedMs` (активное время), cpm — throughput, не моторная скорость: формула и clamp → Task 1 (модульные тесты); проводка `displayElapsedMs`→payload → Task 4 (тест проверяет `exposures`/`confusions`/`durationMs`). ✓
- Точка записи = `done.entry` (финальный чекпоинт), `recordCheckpoint` не тронут → Task 4. ✓
- Чтение журнала (`sessions.listMine`, CQRS-симметрия) → Task 3. ✓
- Fire-and-forget + guest gracefully (запись и чтение) → Task 5 + Task 3. ✓

**Правки аудита, внесённые в план:**
- `latencySpreadMs` убран (YAGNI) — Task 1/2/3.
- confusions V1: только одиночные нажатия, пустые/сочетания клавиш отброшены — Task 1.
- cpm защищён от деления на ~ноль (`durationMs < 1000 → 0`) — Task 1.
- Порог `MIN_JOURNAL_EXPOSURES` против шумовых коротких сессий — Task 4.
- no-op `recordSessionSummary` в существующих `done`-тестах (заглушка бросает) — Task 4 Step 3e.
- Усиленный тест Task 4 (8 символов, `exposures`/`confusions` проверены, не только `typeof`) — Task 4 Step 1.
- guest-throw тест мутации `record` — Task 3.
- Комментарий о Convex single-client ordering (гонка `openedSteps` безопасна) — Task 4.

**Type consistency:** `SessionSummaryPayload` (Task 1) = поля `exposures, clean, cpm, durationMs, latencyMedianMs, confusions` — те же поля в args мутации (Task 3) и в заглушке действия машины (Task 4). `SessionConfusion {target, pressed, count}` — идентично в schema (Task 2), мутации (Task 3) и сводчике (Task 1). Функция называется `summarizeSession` во всех ссылках; handlers — `recordSessionSummaryHandler` / `listMineHandler`; действия — `emitSessionSummary` (сборка) и `recordSessionSummary` (провайдер). ✓

**Placeholder scan:** код приведён полностью в каждом шаге; команд и ожидаемых результатов — конкретные. ✓
