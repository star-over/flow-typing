// convex/selectionIndex.test.ts
import { describe, expect, test } from 'vitest';
import { internal } from './_generated/api';
import { drillIndex } from './drillIndex';
import { makeConvexTest, seedDrillDoc } from './test.helpers';

describe('selectionIndex sync — агрегат следует за таблицей', () => {
  test('insertBatch наполняет namespace агрегата', async () => {
    const t = makeConvexTest();
    const drillId = await t.run(async (ctx) => seedDrillDoc({ ctx, text: 'abc' }));
    await t.mutation(internal.selectionIndex.insertBatch, {
      rows: [{ drillId, symbolLayoutId: 'йцукен', stepLevel: 0 }],
    });
    await t.run(async (ctx) => {
      expect(await drillIndex.count(ctx, { namespace: 'йцукен' })).toBe(1);
    });
  });

  test('resetLayoutAggregate очищает namespace', async () => {
    const t = makeConvexTest();
    const drillId = await t.run(async (ctx) => seedDrillDoc({ ctx, text: 'x' }));
    await t.mutation(internal.selectionIndex.insertBatch, {
      rows: [{ drillId, symbolLayoutId: 'йцукен', stepLevel: 0 }],
    });
    await t.mutation(internal.selectionIndex.resetLayoutAggregate, { symbolLayoutId: 'йцукен' });
    await t.run(async (ctx) => {
      expect(await drillIndex.count(ctx, { namespace: 'йцукен' })).toBe(0);
    });
  });

  // insertBatch пишет в агрегат через `insert` (не `insertIfDoesNotExist`) —
  // идемпотентность пересборки держит `resetLayoutAggregate` перед вставкой,
  // а не проверка существования в самой вставке. Без сброса повторный прогон
  // задвоил бы namespace — этот тест стережёт инвариант.
  test('повторный цикл reset+insertBatch не задваивает агрегат', async () => {
    const t = makeConvexTest();
    const drillId = await t.run(async (ctx) => seedDrillDoc({ ctx, text: 'abc' }));
    const rows = [{ drillId, symbolLayoutId: 'йцукен', stepLevel: 0 }];
    await t.mutation(internal.selectionIndex.insertBatch, { rows });
    await t.mutation(internal.selectionIndex.resetLayoutAggregate, { symbolLayoutId: 'йцукен' });
    await t.mutation(internal.selectionIndex.insertBatch, { rows });
    await t.run(async (ctx) => {
      expect(await drillIndex.count(ctx, { namespace: 'йцукен' })).toBe(1);
    });
  });
});
