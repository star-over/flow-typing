import { describe, expect, test } from 'vitest';
import { drillIndex } from './drillIndex';
import { makeConvexTest, seedDrillDoc } from './test.helpers';

describe('drillIndex — aggregate component в convex-test', () => {
  test('insert → count видит строку в namespace', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const id = await ctx.db.insert('drillSelectionIndex', {
        drillId: await seedDrillDoc({ ctx, text: 'a' }),
        symbolLayoutId: 'test',
        stepLevel: 0,
      });
      const row = await ctx.db.get(id);
      await drillIndex.insertIfDoesNotExist(ctx, row!);
      expect(await drillIndex.count(ctx, { namespace: 'test' })).toBe(1);
    });
  });
});
