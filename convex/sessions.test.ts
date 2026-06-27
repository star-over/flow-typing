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

  test('ровность ритма: персистится когда есть, опускается когда нет', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const userId = await ctx.db.insert('users', { email: 'r@example.com' });
      const withRhythm = await recordSessionSummaryHandler({ ctx, userId, symbolLayoutId: 'йцукен', payload: { ...payload, rhythm: 82 } });
      expect((await ctx.db.get(withRhythm))?.rhythm).toBe(82);
      const withoutRhythm = await recordSessionSummaryHandler({ ctx, userId, symbolLayoutId: 'йцукен', payload });
      expect((await ctx.db.get(withoutRhythm))?.rhythm).toBeUndefined();
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
