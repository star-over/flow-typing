import { convexTest } from 'convex-test';
import { describe, expect, test } from 'vitest';
import { api } from './_generated/api';
import schema from './schema';
import type { MutationCtx } from './_generated/server';

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

describe('getNextBatch — выдача порции (этап 1)', () => {
  test('бюджет ограничивает порцию: budgetChars 10 → 2 drill по 5', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      for (let i = 0; i < 10; i++) await insertDrill(ctx, { text: 'abcde', step: 0, layout: 'test' });
    });

    const res = await t.mutation(api.batch.getNextBatch, {
      symbolLayoutId: 'test',
      openedSteps: 1,
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

    const res = await t.mutation(api.batch.getNextBatch, {
      symbolLayoutId: 'test',
      openedSteps: 1,
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

    const res = await t.mutation(api.batch.getNextBatch, {
      symbolLayoutId: 'test',
      openedSteps: 1,
      budgetChars: 300,
    });

    expect(res.drills).toHaveLength(1);
    expect(res.drills.some((d) => d.id === otherLayout)).toBe(false);
  });

  test('пустой пул → контентный сбой (contentGap), сессия не падает', async () => {
    const t = convexTest(schema, modules);
    const res = await t.mutation(api.batch.getNextBatch, {
      symbolLayoutId: 'test',
      openedSteps: 1,
      budgetChars: 300,
    });

    expect(res.contentGap).toBe(true);
    expect(res.drills).toEqual([]);
  });
});
