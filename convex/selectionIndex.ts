/**
 * @file Серверная пересборка таблицы отбора `drillSelectionIndex`. drills не
 * уезжают из Convex: action листает их постранично, считает `stepLevel` и пишет
 * строки. Данные раскладки берём из единого источника напрямую — символьная
 * раскладка (`src/data/layouts/*.json`) несёт и клавиши, и шаг открытия символа
 * (`ladderStep`, ADR 0020), без генерируемых копий. `symbolLayoutId` лишь выбирает
 * нужную раскладку.
 *
 * Запуск: `npx convex run selectionIndex:rebuild '{"symbolLayoutId":"йцукен"}'`
 * (см. `make rebuild-selection-index`).
 */
import { internalAction, internalMutation, internalQuery, query } from './_generated/server';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { v } from 'convex/values';
import { computeStepLevel } from '../shared/selection-index/compute.ts';
import { symbolToStep } from '../shared/symbol-layout.ts';
import { getLayoutData } from './layoutData';
import { drillIndex } from './drillIndex';

/**
 * Контентный радар: распределение корпуса по ступеням лестницы для раскладки.
 * На каждый шаг — сколько drill'ов открывается именно на нём (`count`) и сколько
 * доступно всего к этому шагу (`available` = накопительно, drill'ы со
 * `stepLevel ≤ step`). Показывает дыры: где для шага мало упражнений.
 */
export const ladderReport = query({
  args: { symbolLayoutId: v.string() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query('drillSelectionIndex')
      .withIndex('by_layout_and_step', (q) => q.eq('symbolLayoutId', args.symbolLayoutId))
      .collect();

    const countByStep = new Map<number, number>();
    for (const row of rows) countByStep.set(row.stepLevel, (countByStep.get(row.stepLevel) ?? 0) + 1);

    let available = 0;
    return [...countByStep.keys()]
      .sort((a, b) => a - b)
      .map((step) => {
        const count = countByStep.get(step) ?? 0;
        available += count;
        return { step, count, available };
      });
  },
});

/** Страница drills: только нужное для расчёта (`_id` + символы). */
export const drillsPage = internalQuery({
  args: { cursor: v.union(v.string(), v.null()), numItems: v.number() },
  handler: async (ctx, args) => {
    const result = await ctx.db.query('drills').paginate({ cursor: args.cursor, numItems: args.numItems });
    return {
      page: result.page.map((drill) => ({ drillId: drill._id, uniqueSymbols: drill.uniqueSymbols })),
      continueCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

/** Вставка батча строк таблицы отбора + зеркалирование в агрегат (ADR 0009). */
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
      if (doc === null) throw new Error(`строка drillSelectionIndex исчезла сразу после вставки: ${id}`);
      await drillIndex.insertIfDoesNotExist(ctx, doc);
    }
  },
});

/** Удаление страницы строк таблицы отбора для раскладки (идемпотентность rebuild). */
export const clearLayoutPage = internalMutation({
  args: { symbolLayoutId: v.string(), numItems: v.number() },
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query('drillSelectionIndex')
      .withIndex('by_layout_and_step', (q) => q.eq('symbolLayoutId', args.symbolLayoutId))
      .take(args.numItems);
    for (const row of rows) await ctx.db.delete(row._id);
    return rows.length;
  },
});

/** Сброс namespace агрегата для раскладки (идемпотентность rebuild: ADR 0009). */
export const resetLayoutAggregate = internalMutation({
  args: { symbolLayoutId: v.string() },
  handler: async (ctx, args) => {
    await drillIndex.clear(ctx, { namespace: args.symbolLayoutId });
  },
});

/** Пересобрать таблицу отбора для раскладки: очистить → посчитать → записать. */
export const rebuild = internalAction({
  args: { symbolLayoutId: v.string() },
  handler: async (ctx, args): Promise<{ cleared: number; inserted: number }> => {
    const layoutData = getLayoutData(args.symbolLayoutId);
    if (!layoutData) throw new Error(`нет данных раскладки: ${args.symbolLayoutId}`);
    const stepBySymbol = symbolToStep(layoutData.symbolLayout);

    let cleared = 0;
    for (;;) {
      const removed = await ctx.runMutation(internal.selectionIndex.clearLayoutPage, {
        symbolLayoutId: args.symbolLayoutId,
        numItems: 2000,
      });
      cleared += removed;
      if (removed === 0) break;
    }

    await ctx.runMutation(internal.selectionIndex.resetLayoutAggregate, {
      symbolLayoutId: args.symbolLayoutId,
    });

    let cursor: string | null = null;
    let inserted = 0;
    let isDone = false;
    while (!isDone) {
      const result: {
        page: { drillId: Id<'drills'>; uniqueSymbols: string[] }[];
        continueCursor: string;
        isDone: boolean;
      } = await ctx.runQuery(internal.selectionIndex.drillsPage, { cursor, numItems: 500 });
      const rows = result.page.map((drill) => ({
        drillId: drill.drillId,
        symbolLayoutId: args.symbolLayoutId,
        stepLevel: computeStepLevel({ uniqueSymbols: drill.uniqueSymbols, symbolToStep: stepBySymbol }),
      }));
      if (rows.length > 0) await ctx.runMutation(internal.selectionIndex.insertBatch, { rows });
      inserted += rows.length;
      isDone = result.isDone;
      cursor = result.continueCursor;
    }

    return { cleared, inserted };
  },
});
