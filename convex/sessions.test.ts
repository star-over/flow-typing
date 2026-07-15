// convex/sessions.test.ts
import { describe, expect, test } from 'vitest';
import { recordSessionSummaryHandler, listMineHandler } from './sessions';
import { api } from './_generated/api';
import { makeConvexTest, asUser, seedUser, seedProfile } from './test.helpers';

const summary = {
  exposures: 200,
  clean: 190,
  cpm: 200,
  durationMs: 60000,
  latencyMedianMs: 250,
  confusions: [{ target: 'г', pressed: 'KeyR', count: 10 }],
};

describe('recordSessionSummaryHandler', () => {
  test('вставляет строку, штампует openedSteps из профиля и capturedAt', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx, email: 'a@example.com' });
      await seedProfile({ ctx, userId, symbolLayoutId: 'йцукен', openedSteps: 5, updatedAt: 1000 });
      const id = await recordSessionSummaryHandler({ ctx, userId, symbolLayoutId: 'йцукен', summary });
      const row = await ctx.db.get(id);
      expect(row?.openedSteps).toBe(5);
      expect(row?.exposures).toBe(200);
      expect(row?.confusions).toEqual([{ target: 'г', pressed: 'KeyR', count: 10 }]);
      expect(row?.capturedAt).toBeGreaterThan(0);
    });
  });

  test('ровность ритма: персистится когда есть, опускается когда нет', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx, email: 'r@example.com' });
      const withRhythm = await recordSessionSummaryHandler({ ctx, userId, symbolLayoutId: 'йцукен', summary: { ...summary, rhythm: 82 } });
      expect((await ctx.db.get(withRhythm))?.rhythm).toBe(82);
      const withoutRhythm = await recordSessionSummaryHandler({ ctx, userId, symbolLayoutId: 'йцукен', summary });
      expect((await ctx.db.get(withoutRhythm))?.rhythm).toBeUndefined();
    });
  });

  test('cold-start: openedSteps по умолчанию 1, если профиля нет', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx, email: 'b@example.com' });
      const id = await recordSessionSummaryHandler({ ctx, userId, symbolLayoutId: 'йцукен', summary });
      const row = await ctx.db.get(id);
      expect(row?.openedSteps).toBe(1);
    });
  });

  test('невалидная сводка (clean > exposures) → throw, строка не вставлена (P0-10)', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx, email: 'bad@example.com' });
      await expect(
        recordSessionSummaryHandler({ ctx, userId, symbolLayoutId: 'йцукен', summary: { ...summary, clean: 999 } }),
      ).rejects.toThrow(/clean/i);
      const rows = await ctx.db
        .query('sessionSummaries')
        .withIndex('by_user_and_layout', (q) => q.eq('userId', userId).eq('symbolLayoutId', 'йцукен'))
        .collect();
      expect(rows).toHaveLength(0);
    });
  });

  test('append-only: две сессии → две строки', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx, email: 'c@example.com' });
      await recordSessionSummaryHandler({ ctx, userId, symbolLayoutId: 'йцукен', summary });
      await recordSessionSummaryHandler({ ctx, userId, symbolLayoutId: 'йцукен', summary });
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
    const t = makeConvexTest();
    await expect(
      t.mutation(api.sessions.record, { symbolLayoutId: 'йцукен', ...summary }),
    ).rejects.toThrow(/not authenticated/i);
  });

  test('authenticated: вставляет сводку для identity-юзера', async () => {
    const t = makeConvexTest();
    const userId = await t.run(async (ctx) => seedUser({ ctx, email: 'rec@example.com' }));
    await asUser({ t, userId }).mutation(api.sessions.record, { symbolLayoutId: 'йцукен', ...summary });
    await t.run(async (ctx) => {
      const rows = await ctx.db
        .query('sessionSummaries')
        .withIndex('by_user_and_layout', (q) => q.eq('userId', userId).eq('symbolLayoutId', 'йцукен'))
        .collect();
      expect(rows).toHaveLength(1);
      expect(rows[0]?.exposures).toBe(200);
    });
  });
});

describe('record mutation — rate limit (P0-10)', () => {
  // sessions.record token bucket capacity=10 (convex/rateLimiter.ts): 10 всплеск ок, 11-й рубится.
  const SESSION_RECORD_CAPACITY = 10;

  test('всплеск сверх capacity → 11-й вызов throw rate limit', async () => {
    const t = makeConvexTest();
    const userId = await t.run(async (ctx) => seedUser({ ctx, email: 'flood@example.com' }));
    const client = asUser({ t, userId });
    for (let i = 0; i < SESSION_RECORD_CAPACITY; i++) {
      await client.mutation(api.sessions.record, { symbolLayoutId: 'йцукен', ...summary });
    }
    await expect(
      client.mutation(api.sessions.record, { symbolLayoutId: 'йцукен', ...summary }),
    ).rejects.toThrow(/rate ?limit/i); // ConvexError data: {"kind":"RateLimited",...}
  });

  test('лимит per-user: исчерпанный юзер A не влияет на юзера B', async () => {
    const t = makeConvexTest();
    const { a, b } = await t.run(async (ctx) => ({
      a: await seedUser({ ctx, email: 'a-rl@example.com' }),
      b: await seedUser({ ctx, email: 'b-rl@example.com' }),
    }));
    for (let i = 0; i < SESSION_RECORD_CAPACITY; i++) {
      await asUser({ t, userId: a }).mutation(api.sessions.record, { symbolLayoutId: 'йцукен', ...summary });
    }
    // A исчерпан, но B со своим полным ведром проходит.
    await expect(
      asUser({ t, userId: b }).mutation(api.sessions.record, { symbolLayoutId: 'йцукен', ...summary }),
    ).resolves.toBeDefined();
  });
});

describe('listMineHandler', () => {
  test('строки юзера в хронологическом порядке (старые → новые)', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx, email: 'd@example.com' });
      await recordSessionSummaryHandler({ ctx, userId, symbolLayoutId: 'йцукен', summary: { ...summary, exposures: 100, clean: 90 } });
      await recordSessionSummaryHandler({ ctx, userId, symbolLayoutId: 'йцукен', summary: { ...summary, exposures: 200 } });
      const rows = await listMineHandler({ ctx, userId, symbolLayoutId: 'йцукен' });
      expect(rows.map((r) => r.exposures)).toEqual([100, 200]); // by_user_and_layout → _creationTime ascending
    });
  });

  test('изолирует строки между юзерами', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const a = await seedUser({ ctx, email: 'a2@example.com' });
      const b = await seedUser({ ctx, email: 'b2@example.com' });
      await recordSessionSummaryHandler({ ctx, userId: a, symbolLayoutId: 'йцукен', summary });
      const rows = await listMineHandler({ ctx, userId: b, symbolLayoutId: 'йцукен' });
      expect(rows).toEqual([]);
    });
  });
});

describe('listMine query — guest', () => {
  test('гость (без identity) → пустой массив', async () => {
    const t = makeConvexTest();
    const rows = await t.query(api.sessions.listMine, { symbolLayoutId: 'йцукен' });
    expect(rows).toEqual([]);
  });
});

describe('listMine query — authenticated', () => {
  test('возвращает строки текущего юзера', async () => {
    const t = makeConvexTest();
    const userId = await t.run(async (ctx) => {
      const uid = await seedUser({ ctx, email: 'lm@example.com' });
      await recordSessionSummaryHandler({ ctx, userId: uid, symbolLayoutId: 'йцукен', summary });
      return uid;
    });
    const rows = await asUser({ t, userId }).query(api.sessions.listMine, { symbolLayoutId: 'йцукен' });
    expect(rows).toHaveLength(1);
  });
});
