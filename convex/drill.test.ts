import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import { api } from './_generated/api';
import schema from './schema';
import type { MutationCtx } from './_generated/server';
import { foldSummaryIntoCells, applyDrillSummaryHandler, resolveOpenedSteps, repertoireSnapshotHandler, resetMyProfileHandler } from './drill';

// import.meta.glob нужен convex-test для регистрации функций (см. auth.test.ts).
const modules = import.meta.glob('./**/*.ts');

// Вставляет drill (полная мета — схема требует все поля) + строку таблицы отбора.
async function insertDrill(
  ctx: MutationCtx,
  { text, step, layout }: { text: string; step: number; layout: string }
) {
  const length = text.length;
  const drillId = await ctx.db.insert('drills', {
    text,
    length,
    uniqueSymbols: [...new Set(text.split(''))],
    wordCount: 1,
    avgWordLength: length,
    maxWordLength: length,
    bigrams: [],
    symbolFrequency: [],
  });
  await ctx.db.insert('drillSelectionIndex', { drillId, symbolLayoutId: layout, stepLevel: step });
  return drillId;
}

describe('drillNext — выдача порции (этап 1)', () => {
  test('бюджет ограничивает порцию: budgetChars 10 → 2 drill по 5', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      for (let i = 0; i < 10; i++) await insertDrill(ctx, { text: 'abcde', step: 0, layout: 'test' });
    });

    const res = await t.mutation(api.drill.drillNext, {
      symbolLayoutId: 'test',
      budgetChars: 10,
    });

    expect(res.contentGap).toBe(false);
    expect(res.drills).toHaveLength(2);
    expect(res.drills.reduce((sum, d) => sum + d.length, 0)).toBe(10);
  });

  test('жёсткий фильтр по openedSteps: drill со stepLevel ≥ openedSteps не выдаётся', async () => {
    const t = convexTest(schema, modules);
    const stepFive = await t.run(async (ctx) => {
      for (let i = 0; i < 10; i++) await insertDrill(ctx, { text: 'abcde', step: 0, layout: 'test' });
      return insertDrill(ctx, { text: 'zzzzz', step: 5, layout: 'test' });
    });

    const res = await t.mutation(api.drill.drillNext, {
      symbolLayoutId: 'test',
      budgetChars: 300,
    });

    // Бюджет 300 знаков > всех step-0 (10×5=50): выдаются все 10, step-5 — никогда.
    expect(res.drills).toHaveLength(10);
    expect(res.drills.some((d) => d.id === stepFive)).toBe(false);
  });

  test('изоляция по раскладке: drill чужой раскладки не выдаётся', async () => {
    const t = convexTest(schema, modules);
    const otherLayout = await t.run(async (ctx) => {
      await insertDrill(ctx, { text: 'abcde', step: 0, layout: 'test' });
      return insertDrill(ctx, { text: 'zzzzz', step: 0, layout: 'other' });
    });

    const res = await t.mutation(api.drill.drillNext, {
      symbolLayoutId: 'test',
      budgetChars: 300,
    });

    expect(res.drills).toHaveLength(1);
    expect(res.drills.some((d) => d.id === otherLayout)).toBe(false);
  });

  test('пустой пул → контентный сбой (contentGap), сессия не падает', async () => {
    const t = convexTest(schema, modules);
    const res = await t.mutation(api.drill.drillNext, {
      symbolLayoutId: 'test',
      budgetChars: 300,
    });

    expect(res.contentGap).toBe(true);
    expect(res.drills).toEqual([]);
  });
});

describe('foldSummaryIntoCells — слияние сводки в ячейки профиля', () => {
  test('пустые ячейки: новая ячейка, EWMA инициализируется первым сэмплом', () => {
    const cells = foldSummaryIntoCells({
      cells: [],
      perSymbol: [{ symbol: 'а', exposures: 2, clean: 1, latencies: [100, 200] }],
      latencyAlpha: 0.3,
    });
    expect(cells).toHaveLength(1);
    // EWMA: 100 (init) → 0.3·200 + 0.7·100 = 130
    expect(cells[0]).toMatchObject({ symbol: 'а', exposures: 2, clean: 1, latencySamples: 2 });
    expect(cells[0]?.latencyEwma).toBeCloseTo(130);
  });

  test('существующая ячейка накапливает предъявления и продолжает EWMA', () => {
    const cells = foldSummaryIntoCells({
      cells: [{ symbol: 'а', exposures: 5, clean: 3, latencyEwma: 120, latencySamples: 4 }],
      perSymbol: [{ symbol: 'а', exposures: 1, clean: 1, latencies: [200] }],
      latencyAlpha: 0.3,
    });
    expect(cells[0]).toMatchObject({ symbol: 'а', exposures: 6, clean: 4, latencySamples: 5 });
    // 0.3·200 + 0.7·120 = 144
    expect(cells[0]?.latencyEwma).toBeCloseTo(144);
  });

  test('без латентностей: предъявления растут, EWMA и счётчик сэмплов не трогаются', () => {
    const cells = foldSummaryIntoCells({
      cells: [{ symbol: 'а', exposures: 5, clean: 3, latencyEwma: 120, latencySamples: 4 }],
      perSymbol: [{ symbol: 'а', exposures: 2, clean: 0, latencies: [] }],
      latencyAlpha: 0.3,
    });
    expect(cells[0]).toMatchObject({
      symbol: 'а',
      exposures: 7,
      clean: 3,
      latencyEwma: 120,
      latencySamples: 4,
    });
  });

  test('новый символ добавляется рядом с существующим', () => {
    const cells = foldSummaryIntoCells({
      cells: [{ symbol: 'а', exposures: 1, clean: 1, latencyEwma: 100, latencySamples: 1 }],
      perSymbol: [{ symbol: 'о', exposures: 1, clean: 0, latencies: [150] }],
      latencyAlpha: 0.3,
    });
    expect(cells).toHaveLength(2);
    expect(cells.map((c) => c.symbol).sort()).toEqual(['а', 'о']);
  });
});

describe('applyDrillSummaryHandler — запись сводки в профиль', () => {
  test('первая запись создаёт профиль с cold-start openedSteps = 1', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { name: 'U' });
      const profileId = await applyDrillSummaryHandler({
        ctx,
        userId,
        symbolLayoutId: 'йцукен',
        perSymbol: [{ symbol: 'а', exposures: 2, clean: 1, latencies: [100, 200] }],
      });
      const profile = await ctx.db.get(profileId);
      expect(profile?.openedSteps).toBe(1);
      expect(profile?.symbolCells).toHaveLength(1);
      expect(profile?.symbolCells[0]).toMatchObject({ symbol: 'а', exposures: 2, clean: 1 });
      expect(profile?.updatedAt).toBeGreaterThan(0);
    });
  });

  test('вторая запись копит в тот же профиль (один на пару user × раскладка)', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { name: 'U' });
      await applyDrillSummaryHandler({
        ctx,
        userId,
        symbolLayoutId: 'йцукен',
        perSymbol: [{ symbol: 'а', exposures: 2, clean: 1, latencies: [100] }],
      });
      await applyDrillSummaryHandler({
        ctx,
        userId,
        symbolLayoutId: 'йцукен',
        perSymbol: [{ symbol: 'а', exposures: 3, clean: 2, latencies: [200] }],
      });
      const profiles = await ctx.db
        .query('skillProfiles')
        .withIndex('by_user_and_layout', (q) => q.eq('userId', userId).eq('symbolLayoutId', 'йцукен'))
        .collect();
      expect(profiles).toHaveLength(1);
      expect(profiles[0]?.symbolCells[0]).toMatchObject({ symbol: 'а', exposures: 5, clean: 3 });
    });
  });
});

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
      const profile = await ctx.db.get(profileId);
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
      expect((await ctx.db.get(profileId))?.openedSteps).toBe(1);
    });
  });

  test('insert (первый профиль) не растит, даже при готовой ячейке', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { name: 'U' });
      const profileId = await applyDrillSummaryHandler({ ctx, userId, symbolLayoutId: 'йцукен',
        perSymbol: [{ symbol: 'а', exposures: 99, clean: 99, latencies: [150] }] });
      expect((await ctx.db.get(profileId))?.openedSteps).toBe(1);
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
      expect((await ctx.db.get(profileId))?.openedSteps).toBe(3);
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
      expect(profile?.openedSteps).toBe(1);
      expect(profile?.symbolCells[0]?.exposures).toBe(10);
    });
  });
});

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
  test('профиль с ростом → текущая ступень', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { name: 'U' });
      await ctx.db.insert('skillProfiles', { userId, symbolLayoutId: 'йцукен', openedSteps: 2,
        symbolCells: [{ symbol: 'е', exposures: 30, clean: 30, latencyEwma: 150, latencySamples: 30 }], updatedAt: 1 });
      const snap = await repertoireSnapshotHandler({ ctx, userId, symbolLayoutId: 'йцукен' });
      expect(snap?.openedSteps).toBe(2);
    });
  });
  test('неизвестная раскладка → null', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { name: 'U' });
      expect(await repertoireSnapshotHandler({ ctx, userId, symbolLayoutId: 'unknown' })).toBeNull();
    });
  });
});

describe('resetMyProfileHandler — сброс профиля', () => {
  test('гость (null userId) → 0 удалённых, без падения', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      expect(await resetMyProfileHandler({ ctx, userId: null })).toBe(0);
    });
  });

  test('удаляет все профили юзера (все раскладки) → cold-start заново', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { name: 'U' });
      await ctx.db.insert('skillProfiles', { userId, symbolLayoutId: 'йцукен', openedSteps: 5, symbolCells: [], updatedAt: 1 });
      await ctx.db.insert('skillProfiles', { userId, symbolLayoutId: 'qwerty', openedSteps: 3, symbolCells: [], updatedAt: 1 });
      expect(await resetMyProfileHandler({ ctx, userId })).toBe(2);
      const left = await ctx.db
        .query('skillProfiles')
        .withIndex('by_user_and_layout', (q) => q.eq('userId', userId))
        .collect();
      expect(left).toHaveLength(0);
    });
  });

  test('не трогает чужие профили', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const me = await ctx.db.insert('users', { name: 'me' });
      const other = await ctx.db.insert('users', { name: 'other' });
      await ctx.db.insert('skillProfiles', { userId: me, symbolLayoutId: 'йцукен', openedSteps: 5, symbolCells: [], updatedAt: 1 });
      await ctx.db.insert('skillProfiles', { userId: other, symbolLayoutId: 'йцукен', openedSteps: 5, symbolCells: [], updatedAt: 1 });
      await resetMyProfileHandler({ ctx, userId: me });
      const otherLeft = await ctx.db
        .query('skillProfiles')
        .withIndex('by_user_and_layout', (q) => q.eq('userId', other))
        .collect();
      expect(otherLeft).toHaveLength(1);
    });
  });
});

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
  test('null userId (неавторизован/гость) → cold-start 1', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      expect(await resolveOpenedSteps({ ctx, userId: null, symbolLayoutId: 'йцукен' })).toBe(1);
    });
  });
});
