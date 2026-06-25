// convex/selectionIndex.test.ts
import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import { internal } from './_generated/api';
import schema from './schema';
import { drillIndex } from './drillIndex';
import { registerDrillIndex } from './test.helpers';

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
