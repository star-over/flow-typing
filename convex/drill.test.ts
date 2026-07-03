import { convexTest } from 'convex-test';
import { describe, expect, test, vi } from 'vitest';
import { api } from './_generated/api';
import schema from './schema';
import type { MutationCtx } from './_generated/server';
import { foldSummaryIntoCells, applyDrillSummaryHandler, resolveOpenedSteps, repertoireSnapshotHandler, resetMyProfileHandler, buildDefaultDrills, selectDrillsHandler } from './drill';
import { drillIndex } from './drillIndex';
import { registerDrillIndex } from './test.helpers';
import { getLayoutData } from './layoutData';
import { symbolsAtStep } from '../shared/key-ladder/step-symbols.ts';

// import.meta.glob нужен convex-test для регистрации функций (см. auth.test.ts).
const modules = import.meta.glob('./**/*.ts');

// Вставляет drill (полная мета — схема требует все поля) + строку таблицы отбора.
// Прямой insert обходит insertBatch, поэтому зеркалим строку в агрегат вручную.
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
  const rowId = await ctx.db.insert('drillSelectionIndex', { drillId, symbolLayoutId: layout, stepLevel: step });
  await drillIndex.insertIfDoesNotExist(ctx, (await ctx.db.get(rowId))!);
  return drillId;
}

// Дефолт строится только для раскладок с серверными данными (getLayoutData).
// На сервере это сейчас йцукен — на нём и проверяем контентный сбой.
function jcukenStep0Allowed(): Set<string> {
  const layoutData = getLayoutData('йцукен')!;
  return new Set([
    ...symbolsAtStep({ step: 0, symbolLayout: layoutData.symbolLayout, ladder: layoutData.keyLadder }),
    ' ',
  ]);
}

describe('drillNext — выдача порции (этап 1)', () => {
  test('бюджет ограничивает порцию: budgetChars 10 → 2 drill по 5', async () => {
    const t = convexTest(schema, modules);
    registerDrillIndex(t);

    const res = await t.run(async (ctx) => {
      for (let i = 0; i < 10; i++) await insertDrill(ctx, { text: 'abcde', step: 0, layout: 'test' });
      return selectDrillsHandler({ ctx, symbolLayoutId: 'test', openedSteps: 1, budgetChars: 10, seed: 1 });
    });

    expect(res.drills).toHaveLength(2);
    expect(res.drills.reduce((sum, d) => sum + d.text.length, 0)).toBe(10);
  });

  test('жёсткий фильтр по openedSteps: drill со stepLevel ≥ openedSteps не выдаётся', async () => {
    const t = convexTest(schema, modules);
    registerDrillIndex(t);

    const res = await t.run(async (ctx) => {
      for (let i = 0; i < 10; i++) await insertDrill(ctx, { text: 'abcde', step: 0, layout: 'test' });
      await insertDrill(ctx, { text: 'zzzzz', step: 5, layout: 'test' });
      return selectDrillsHandler({ ctx, symbolLayoutId: 'test', openedSteps: 1, budgetChars: 300, seed: 1 });
    });

    // Бюджет 300 знаков > всех step-0 (10×5=50): выдаются все 10, step-5 — никогда.
    expect(res.drills).toHaveLength(10);
    expect(res.drills.some((d) => d.text === 'zzzzz')).toBe(false);
  });

  test('изоляция по раскладке: drill чужой раскладки не выдаётся', async () => {
    const t = convexTest(schema, modules);
    registerDrillIndex(t);

    const res = await t.run(async (ctx) => {
      await insertDrill(ctx, { text: 'abcde', step: 0, layout: 'test' });
      await insertDrill(ctx, { text: 'zzzzz', step: 0, layout: 'other' });
      return selectDrillsHandler({ ctx, symbolLayoutId: 'test', openedSteps: 1, budgetChars: 300, seed: 1 });
    });

    expect(res.drills).toHaveLength(1);
    expect(res.drills.some((d) => d.text === 'zzzzz')).toBe(false);
  });

  test('пустой пул → дефолтный drill из символов открытых шагов (контентный сбой)', async () => {
    const t = convexTest(schema, modules);
    registerDrillIndex(t);
    // Раскладка с серверными данными (йцукен), но пул пуст → сервер строит дефолт,
    // а не возвращает пустоту (клиентского корпуса для деградации больше нет).
    const res = await t.run(async (ctx) =>
      selectDrillsHandler({ ctx, symbolLayoutId: 'йцукен', openedSteps: 1, budgetChars: 30, seed: 1 })
    );

    expect(res.drills.length).toBeGreaterThan(0);
    const allowed = jcukenStep0Allowed();
    const text = res.drills.map((d) => d.text).join(' ');
    for (const ch of text) expect(allowed.has(ch)).toBe(true);
  });

  test('seed детерминирует выборку: один seed → одинаковые тексты', async () => {
    const t = convexTest(schema, modules);
    registerDrillIndex(t);
    const [a, b] = await t.run(async (ctx) => {
      for (let i = 0; i < 20; i++) await insertDrill(ctx, { text: `dr${i}xx`, step: 0, layout: 'test' });
      const a = await selectDrillsHandler({ ctx, symbolLayoutId: 'test', openedSteps: 1, budgetChars: 10, seed: 777 });
      const b = await selectDrillsHandler({ ctx, symbolLayoutId: 'test', openedSteps: 1, budgetChars: 10, seed: 777 });
      return [a, b];
    });
    expect(a.drills.map((d) => d.text)).toEqual(b.drills.map((d) => d.text));
  });

  test('drill\'ы в порции не повторяются (distinct)', async () => {
    const t = convexTest(schema, modules);
    registerDrillIndex(t);
    const res = await t.run(async (ctx) => {
      // Уникальные тексты: distinct по тексту ⟺ distinct по строкам (id на проводе нет).
      for (let i = 0; i < 20; i++) await insertDrill(ctx, { text: `dr${i}aa`, step: 0, layout: 'test' });
      return selectDrillsHandler({ ctx, symbolLayoutId: 'test', openedSteps: 1, budgetChars: 50, seed: 5 });
    });
    expect(new Set(res.drills.map((d) => d.text)).size).toBe(res.drills.length);
  });

  test('битые ссылки (drills удалён, индекс жив) → дефолтный drill, не пустота', async () => {
    const t = convexTest(schema, modules);
    registerDrillIndex(t);
    const res = await t.run(async (ctx) => {
      // Индекс + агрегат живы (count>0), сам drill удалён → ссылка битая.
      const drillId = await insertDrill(ctx, { text: 'abcde', step: 0, layout: 'йцукен' });
      await ctx.db.delete(drillId);
      return selectDrillsHandler({ ctx, symbolLayoutId: 'йцукен', openedSteps: 1, budgetChars: 30, seed: 1 });
    });
    expect(res.drills.length).toBeGreaterThan(0);
    const allowed = jcukenStep0Allowed();
    const text = res.drills.map((d) => d.text).join(' ');
    for (const ch of text) expect(allowed.has(ch)).toBe(true);
  });

  test('гость (без identity) → throw Not authenticated (ADR 0012)', async () => {
    const t = convexTest(schema, modules);
    registerDrillIndex(t);
    await expect(
      t.query(api.drill.drillNext, { symbolLayoutId: 'йцукен', budgetChars: 10, seed: 1 })
    ).rejects.toThrow('Not authenticated');
  });
});

// Ядро политики отбора напрямую (шов на openedSteps, минуя auth): обёртка
// `drillNext` теперь требует входа (ADR 0012) и в convex-test без identity сразу
// throw'ит, поэтому happy-path сценарии отбора (в том числе cold-start openedSteps
// 1, на котором работали happy-path тесты выше) и ветку openedSteps>1 тестируем
// через прямой вызов `selectDrillsHandler`, минуя auth-барьер (полный путь через
// identity — отдельный кандидат withIdentity). Шов подаёт openedSteps напрямую.
describe('selectDrillsHandler — политика отбора (ADR 0009/0006/0011)', () => {
  test('openedSteps 2: drill шага 1 впущен, шага 2 отсечён (bound stepLevel < openedSteps)', async () => {
    const t = convexTest(schema, modules);
    registerDrillIndex(t);
    await t.run(async (ctx) => {
      for (let i = 0; i < 5; i++) await insertDrill(ctx, { text: 'aaaaa', step: 0, layout: 'test' });
      for (let i = 0; i < 5; i++) await insertDrill(ctx, { text: 'bbbbb', step: 1, layout: 'test' });
      for (let i = 0; i < 5; i++) await insertDrill(ctx, { text: 'ccccc', step: 2, layout: 'test' });

      const res = await selectDrillsHandler({ ctx, symbolLayoutId: 'test', openedSteps: 2, budgetChars: 300, seed: 1 });

      // Бюджет 300 > шаги 0+1 (10×5=50): выдаются все 10; шаг 2 (== openedSteps) — никогда.
      expect(res.drills).toHaveLength(10);
      expect(res.drills.some((d) => d.text === 'bbbbb')).toBe(true); // шаг 1 (< openedSteps) впущен
      expect(res.drills.some((d) => d.text === 'ccccc')).toBe(false); // шаг 2 (≥ openedSteps) отсечён
    });
  });

  test('разные seed → разная выборка (seed управляет отбором, не только детерминирует)', async () => {
    const t = convexTest(schema, modules);
    registerDrillIndex(t);
    await t.run(async (ctx) => {
      // 20 уникальных текстов ровно по 5 символов; бюджет 5 = один drill из пула → seed
      // выбирает, какой именно. distinct по тексту ⟺ distinct по строкам (id на проводе нет).
      for (let i = 0; i < 20; i++) {
        await insertDrill(ctx, { text: `w${String(i).padStart(3, '0')}z`, step: 0, layout: 'test' });
      }
      const pick = async (seed: number) => {
        const res = await selectDrillsHandler({ ctx, symbolLayoutId: 'test', openedSteps: 1, budgetChars: 5, seed });
        return res.drills.map((d) => d.text).join('|');
      };
      const picks = await Promise.all([1, 2, 3, 4, 5, 6].map(pick));

      expect(new Set(picks).size).toBeGreaterThan(1); // не все seed дают один и тот же drill
    });
  });
});

describe('buildDefaultDrills — дефолт на контентный сбой', () => {
  test('строит один drill из символов открытых шагов до бюджета', () => {
    const layoutData = getLayoutData('йцукен')!;
    const drills = buildDefaultDrills({ layoutData, openedSteps: 1, budgetChars: 30 });
    expect(drills).toHaveLength(1);
    expect(drills[0]!.text.length).toBeGreaterThanOrEqual(30);
    const allowed = jcukenStep0Allowed();
    for (const ch of drills[0]!.text) expect(allowed.has(ch)).toBe(true);
  });

  test('нет открытых шагов (openedSteps 0) → пустой массив', () => {
    const layoutData = getLayoutData('йцукен')!;
    expect(buildDefaultDrills({ layoutData, openedSteps: 0, budgetChars: 30 })).toEqual([]);
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

describe('drillRecord — auth', () => {
  test('гость (без identity) → throw Not authenticated (ADR 0012)', async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.drill.drillRecord, {
        symbolLayoutId: 'йцукен',
        summary: {
          perSymbol: [],
          overall: { exposures: 0, clean: 0, accuracy: 0, latencyMedian: 0, latencySpread: 0 },
        },
      }),
    ).rejects.toThrow(/not authenticated/i);
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
    // grownOpenedSteps пишет console.warn для раскладки без данных — рабочее
    // поведение. Тест намеренно подаёт 'unknown', поэтому глушим warn, чтобы он
    // не засорял вывод тестов.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
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
    warn.mockRestore();
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
});
