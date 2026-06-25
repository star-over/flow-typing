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
        drillId: await ctx.db.insert('drills', {
          text: 'a',
          length: 1,
          uniqueSymbols: ['a'],
          wordCount: 1,
          avgWordLength: 1,
          maxWordLength: 1,
          bigrams: [],
          symbolFrequency: [],
        }),
        symbolLayoutId: 'test',
        stepLevel: 0,
      });
      const row = await ctx.db.get(id);
      await drillIndex.insertIfDoesNotExist(ctx, row!);
      expect(await drillIndex.count(ctx, { namespace: 'test' })).toBe(1);
    });
  });
});
