import { describe, expect, test, vi } from 'vitest';
import { api } from './_generated/api';
import {
  foldSummaryIntoCells,
  applyDrillSummaryHandler,
  resolveOpenedSteps,
  repertoireSnapshotHandler,
  progressionDetailHandler,
  resetMyProfileHandler,
  buildDefaultDrills,
  selectDrillsHandler,
  setMyOpenedStepsHandler,
} from './drill';
import { makeConvexTest, asUser, seedUser, seedDrill, seedProfile } from './test.helpers';
import { getLayoutData } from './layoutData';
import { symbolsAtStep } from '../shared/symbol-layout.ts';

// Дефолт строится только для раскладок с серверными данными (getLayoutData).
// На сервере это сейчас йцукен — на нём и проверяем контентный сбой.
function jcukenStep0Allowed(): Set<string> {
  const layoutData = getLayoutData('йцукен')!;
  return new Set([
    ...symbolsAtStep({ step: 0, symbolLayout: layoutData.symbolLayout }),
    ' ',
  ]);
}

// drillNext требует входа (ADR 0012) → happy-path гоняем как authenticated
// (asUser). Юзер без профиля → cold-start openedSteps 1, поэтому сценарии шага 0
// сохраняются. Гостевой путь — throw (тест в конце describe).
describe('drillNext — выдача порции (этап 1, authenticated)', () => {
  test('бюджет ограничивает порцию: budgetChars 10 → 2 drill по 5', async () => {
    const t = makeConvexTest();
    const userId = await t.run(async (ctx) => {
      for (let i = 0; i < 10; i++) await seedDrill({ ctx, text: 'abcde', step: 0, symbolLayoutId: 'test' });
      return seedUser({ ctx });
    });

    const res = await asUser({ t, userId }).query(api.drill.drillNext, {
      symbolLayoutId: 'test',
      budgetChars: 10,
      seed: 1,
    });

    expect(res.drills).toHaveLength(2);
    expect(res.drills.reduce((sum, d) => sum + d.text.length, 0)).toBe(10);
  });

  test('жёсткий фильтр по openedSteps: drill со stepLevel ≥ openedSteps не выдаётся', async () => {
    const t = makeConvexTest();
    const userId = await t.run(async (ctx) => {
      for (let i = 0; i < 10; i++) await seedDrill({ ctx, text: 'abcde', step: 0, symbolLayoutId: 'test' });
      await seedDrill({ ctx, text: 'zzzzz', step: 5, symbolLayoutId: 'test' });
      return seedUser({ ctx });
    });

    const res = await asUser({ t, userId }).query(api.drill.drillNext, {
      symbolLayoutId: 'test',
      budgetChars: 300,
      seed: 1,
    });

    // Cold-start openedSteps 1: step-0 впущены (все 10), step-5 (≥ 1) — никогда.
    expect(res.drills).toHaveLength(10);
    expect(res.drills.some((d) => d.text === 'zzzzz')).toBe(false);
  });

  test('изоляция по раскладке: drill чужой раскладки не выдаётся', async () => {
    const t = makeConvexTest();
    const userId = await t.run(async (ctx) => {
      await seedDrill({ ctx, text: 'abcde', step: 0, symbolLayoutId: 'test' });
      await seedDrill({ ctx, text: 'zzzzz', step: 0, symbolLayoutId: 'other' });
      return seedUser({ ctx });
    });

    const res = await asUser({ t, userId }).query(api.drill.drillNext, {
      symbolLayoutId: 'test',
      budgetChars: 300,
      seed: 1,
    });

    expect(res.drills).toHaveLength(1);
    expect(res.drills.some((d) => d.text === 'zzzzz')).toBe(false);
  });

  test('пустой пул → дефолтный drill из символов открытых шагов (контентный сбой)', async () => {
    const t = makeConvexTest();
    // Раскладка с серверными данными (йцукен), но пул пуст → сервер строит дефолт,
    // а не возвращает пустоту (клиентского корпуса для деградации больше нет).
    const userId = await t.run(async (ctx) => seedUser({ ctx }));
    const res = await asUser({ t, userId }).query(api.drill.drillNext, {
      symbolLayoutId: 'йцукен',
      budgetChars: 30,
      seed: 1,
    });

    expect(res.drills.length).toBeGreaterThan(0);
    const allowed = jcukenStep0Allowed();
    const text = res.drills.map((d) => d.text).join(' ');
    for (const ch of text) expect(allowed.has(ch)).toBe(true);
  });

  test('seed детерминирует выборку: один seed → одинаковые тексты', async () => {
    const t = makeConvexTest();
    const userId = await t.run(async (ctx) => {
      for (let i = 0; i < 20; i++) await seedDrill({ ctx, text: `dr${i}xx`, step: 0, symbolLayoutId: 'test' });
      return seedUser({ ctx });
    });
    const client = asUser({ t, userId });
    const a = await client.query(api.drill.drillNext, { symbolLayoutId: 'test', budgetChars: 10, seed: 777 });
    const b = await client.query(api.drill.drillNext, { symbolLayoutId: 'test', budgetChars: 10, seed: 777 });
    expect(a.drills.map((d) => d.text)).toEqual(b.drills.map((d) => d.text));
  });

  test('drill\'ы в порции не повторяются (distinct)', async () => {
    const t = makeConvexTest();
    const userId = await t.run(async (ctx) => {
      // Уникальные тексты: distinct по тексту ⟺ distinct по строкам (id на проводе нет).
      for (let i = 0; i < 20; i++) await seedDrill({ ctx, text: `dr${i}aa`, step: 0, symbolLayoutId: 'test' });
      return seedUser({ ctx });
    });
    const res = await asUser({ t, userId }).query(api.drill.drillNext, { symbolLayoutId: 'test', budgetChars: 50, seed: 5 });
    expect(new Set(res.drills.map((d) => d.text)).size).toBe(res.drills.length);
  });

  test('битые ссылки (drills удалён, индекс жив) → дефолтный drill, не пустота', async () => {
    const t = makeConvexTest();
    const userId = await t.run(async (ctx) => {
      // Индекс + агрегат живы (count>0), сам drill удалён → ссылка битая.
      const drillId = await seedDrill({ ctx, text: 'abcde', step: 0, symbolLayoutId: 'йцукен' });
      await ctx.db.delete(drillId);
      return seedUser({ ctx });
    });
    const res = await asUser({ t, userId }).query(api.drill.drillNext, { symbolLayoutId: 'йцукен', budgetChars: 30, seed: 1 });
    expect(res.drills.length).toBeGreaterThan(0);
    const allowed = jcukenStep0Allowed();
    const text = res.drills.map((d) => d.text).join(' ');
    for (const ch of text) expect(allowed.has(ch)).toBe(true);
  });

  test('гость (без identity) → throw Not authenticated (ADR 0012)', async () => {
    const t = makeConvexTest();
    await expect(
      t.query(api.drill.drillNext, { symbolLayoutId: 'йцукен', budgetChars: 10, seed: 1 }),
    ).rejects.toThrow(/not authenticated/i);
  });
});

// Ядро политики отбора напрямую (шов на openedSteps, минуя auth): закрывает дыры,
// которые query-уровень достать не мог — getAuthUserId в convex-test без identity
// всегда даёт null → resolveOpenedSteps → cold-start 1, поэтому ветка openedSteps>1
// через `t.query(drillNext)` не гоняется ни разу (полный путь через identity — это
// отдельный кандидат withIdentity). Шов подаёт openedSteps напрямую.
describe('selectDrillsHandler — политика отбора (ADR 0009/0006/0011)', () => {
  test('openedSteps 2: drill шага 1 впущен, шага 2 отсечён (bound stepLevel < openedSteps)', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      for (let i = 0; i < 5; i++) await seedDrill({ ctx, text: 'aaaaa', step: 0, symbolLayoutId: 'test' });
      for (let i = 0; i < 5; i++) await seedDrill({ ctx, text: 'bbbbb', step: 1, symbolLayoutId: 'test' });
      for (let i = 0; i < 5; i++) await seedDrill({ ctx, text: 'ccccc', step: 2, symbolLayoutId: 'test' });

      const res = await selectDrillsHandler({ ctx, symbolLayoutId: 'test', openedSteps: 2, budgetChars: 300, seed: 1 });

      // Бюджет 300 > шаги 0+1 (10×5=50): выдаются все 10; шаг 2 (== openedSteps) — никогда.
      expect(res.drills).toHaveLength(10);
      expect(res.drills.some((d) => d.text === 'bbbbb')).toBe(true); // шаг 1 (< openedSteps) впущен
      expect(res.drills.some((d) => d.text === 'ccccc')).toBe(false); // шаг 2 (≥ openedSteps) отсечён
    });
  });

  test('разные seed → разная выборка (seed управляет отбором, не только детерминирует)', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      // 20 уникальных текстов ровно по 5 символов; бюджет 5 = один drill из пула → seed
      // выбирает, какой именно. distinct по тексту ⟺ distinct по строкам (id на проводе нет).
      for (let i = 0; i < 20; i++) {
        await seedDrill({ ctx, text: `w${String(i).padStart(3, '0')}z`, step: 0, symbolLayoutId: 'test' });
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
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx });
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

  test('невалидный perSymbol (clean > exposures) → throw, профиль не создан (P0-10)', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx });
      await expect(
        applyDrillSummaryHandler({
          ctx,
          userId,
          symbolLayoutId: 'йцукен',
          perSymbol: [{ symbol: 'а', exposures: 1, clean: 5, latencies: [] }],
        }),
      ).rejects.toThrow(/clean/i);
      const profiles = await ctx.db
        .query('skillProfiles')
        .withIndex('by_user_and_layout', (q) => q.eq('userId', userId).eq('symbolLayoutId', 'йцукен'))
        .collect();
      expect(profiles).toHaveLength(0);
    });
  });

  test('вторая запись копит в тот же профиль (один на пару user × раскладка)', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx });
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
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx });
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
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx });
      await applyDrillSummaryHandler({ ctx, userId, symbolLayoutId: 'йцукен',
        perSymbol: [{ symbol: 'а', exposures: 25, clean: 25, latencies: [180] }] });
      const profileId = await applyDrillSummaryHandler({ ctx, userId, symbolLayoutId: 'йцукен',
        perSymbol: [{ symbol: 'к', exposures: 25, clean: 25, latencies: [190] }] });
      expect((await ctx.db.get(profileId))?.openedSteps).toBe(1);
    });
  });

  test('insert (первый профиль) не растит, даже при готовой ячейке', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx });
      const profileId = await applyDrillSummaryHandler({ ctx, userId, symbolLayoutId: 'йцукен',
        perSymbol: [{ symbol: 'а', exposures: 99, clean: 99, latencies: [150] }] });
      expect((await ctx.db.get(profileId))?.openedSteps).toBe(1);
    });
  });

  test('рост монотонный: слабый шаг не откатывает уже открытое', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx });
      await seedProfile({ ctx, userId, symbolLayoutId: 'йцукен', openedSteps: 3,
        symbolCells: [{ symbol: 'ы', exposures: 3, clean: 1, latencyEwma: 0, latencySamples: 0 }], updatedAt: 1 });
      const profileId = await applyDrillSummaryHandler({ ctx, userId, symbolLayoutId: 'йцукен',
        perSymbol: [{ symbol: 'ы', exposures: 2, clean: 0, latencies: [] }] });
      expect((await ctx.db.get(profileId))?.openedSteps).toBe(3);
    });
  });

  test('неизвестная раскладка → рост пропущен, сводка сохранена (без throw)', async () => {
    // growOpenedSteps пишет console.warn для раскладки без данных — рабочее
    // поведение. Тест намеренно подаёт 'unknown', поэтому глушим warn, чтобы он
    // не засорял вывод тестов.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx });
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
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      expect(await repertoireSnapshotHandler({ ctx, userId: null, symbolLayoutId: 'йцукен' })).toBeNull();
    });
  });
  test('нет профиля → cold-start ступень 1', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx });
      const snap = await repertoireSnapshotHandler({ ctx, userId, symbolLayoutId: 'йцукен' });
      expect(snap?.openedSteps).toBe(1);
      expect(snap?.totalOnStep).toBe(13); // шаг 0 йцукен
      expect(snap?.readyCount).toBe(0);
    });
  });
  test('профиль с ростом → текущая ступень', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx });
      await seedProfile({ ctx, userId, symbolLayoutId: 'йцукен', openedSteps: 2,
        symbolCells: [{ symbol: 'е', exposures: 30, clean: 30, latencyEwma: 150, latencySamples: 30 }], updatedAt: 1 });
      const snap = await repertoireSnapshotHandler({ ctx, userId, symbolLayoutId: 'йцукен' });
      expect(snap?.openedSteps).toBe(2);
    });
  });
  test('неизвестная раскладка → null', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx });
      expect(await repertoireSnapshotHandler({ ctx, userId, symbolLayoutId: 'unknown' })).toBeNull();
    });
  });
});

describe('resetMyProfileHandler — сброс профиля', () => {
  test('гость (null userId) → 0 удалённых, без падения', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      expect(await resetMyProfileHandler({ ctx, userId: null })).toBe(0);
    });
  });

  test('удаляет все профили юзера (все раскладки) → cold-start заново', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx });
      await seedProfile({ ctx, userId, symbolLayoutId: 'йцукен', openedSteps: 5, symbolCells: [], updatedAt: 1 });
      await seedProfile({ ctx, userId, symbolLayoutId: 'qwerty', openedSteps: 3, symbolCells: [], updatedAt: 1 });
      expect(await resetMyProfileHandler({ ctx, userId })).toBe(2);
      const left = await ctx.db
        .query('skillProfiles')
        .withIndex('by_user_and_layout', (q) => q.eq('userId', userId))
        .collect();
      expect(left).toHaveLength(0);
    });
  });

  test('не трогает чужие профили', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const me = await seedUser({ ctx });
      const other = await seedUser({ ctx });
      await seedProfile({ ctx, userId: me, symbolLayoutId: 'йцукен', openedSteps: 5, symbolCells: [], updatedAt: 1 });
      await seedProfile({ ctx, userId: other, symbolLayoutId: 'йцукен', openedSteps: 5, symbolCells: [], updatedAt: 1 });
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
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx });
      await seedProfile({ ctx, userId, symbolLayoutId: 'йцукен', openedSteps: 4, symbolCells: [], updatedAt: 1 });
      expect(await resolveOpenedSteps({ ctx, userId, symbolLayoutId: 'йцукен' })).toBe(4);
    });
  });
  test('профиль другой раскладки → cold-start 1 (ключ user × раскладка)', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx });
      await seedProfile({ ctx, userId, symbolLayoutId: 'йцукен', openedSteps: 4, symbolCells: [], updatedAt: 1 });
      expect(await resolveOpenedSteps({ ctx, userId, symbolLayoutId: 'qwerty' })).toBe(1);
    });
  });
  test('нет профиля (новый) → cold-start 1', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx });
      expect(await resolveOpenedSteps({ ctx, userId, symbolLayoutId: 'йцукен' })).toBe(1);
    });
  });
  // Гостевой userId: null снят — resolveOpenedSteps сужен до non-null (ADR 0012,
  // тренировка требует входа); гостевой путь drillNext закрыт throw-тестом выше.
});

// ────────────────────────────────────────────────────────────────────────────
// Authenticated-ветка обёрток через identity (asUser → t.withIdentity). До этого
// getAuthUserId без identity всегда давал null → гонялся только гостевой путь;
// ветка «обёртка резолвит id → делегирует в handler» не покрывалась ни разу.
// ────────────────────────────────────────────────────────────────────────────

describe('drillNext query — authenticated (openedSteps из профиля)', () => {
  test('профиль openedSteps 2 → drill шага 1 впущен, шага 2 отсечён (полный путь query)', async () => {
    const t = makeConvexTest();
    const userId = await t.run(async (ctx) => {
      const uid = await seedUser({ ctx });
      await seedProfile({ ctx, userId: uid, symbolLayoutId: 'test', openedSteps: 2 });
      for (let i = 0; i < 5; i++) await seedDrill({ ctx, text: 'aaaaa', step: 0, symbolLayoutId: 'test' });
      for (let i = 0; i < 5; i++) await seedDrill({ ctx, text: 'bbbbb', step: 1, symbolLayoutId: 'test' });
      for (let i = 0; i < 5; i++) await seedDrill({ ctx, text: 'ccccc', step: 2, symbolLayoutId: 'test' });
      return uid;
    });
    const res = await asUser({ t, userId }).query(api.drill.drillNext, { symbolLayoutId: 'test', budgetChars: 300, seed: 1 });
    expect(res.drills.some((d) => d.text === 'bbbbb')).toBe(true); // шаг 1 < openedSteps=2 → впущен
    expect(res.drills.some((d) => d.text === 'ccccc')).toBe(false); // шаг 2 ≥ openedSteps → отсечён
  });

  // Гостевой путь снят: drillNext требует входа (ADR 0012), гость → throw
  // (см. тест в describe «drillNext — выдача порции»). Раньше здесь тест «гость →
  // cold-start 1» проверял чтение профиля только под identity — теперь бессмыслен.
});

describe('drillRecord mutation — auth', () => {
  const summary = {
    perSymbol: [{ symbol: 'а', exposures: 2, clean: 1, latencies: [100, 200] }],
    overall: { exposures: 2, clean: 1, accuracy: 0.5, latencyMedian: 150, latencySpread: 50 },
  };

  test('гость (без identity) → throw Not authenticated', async () => {
    const t = makeConvexTest();
    await expect(
      t.mutation(api.drill.drillRecord, { symbolLayoutId: 'йцукен', summary }),
    ).rejects.toThrow(/not authenticated/i);
  });

  test('authenticated: сводка внесена в профиль текущего юзера', async () => {
    const t = makeConvexTest();
    const userId = await t.run(async (ctx) => seedUser({ ctx }));
    await asUser({ t, userId }).mutation(api.drill.drillRecord, { symbolLayoutId: 'йцукен', summary });
    await t.run(async (ctx) => {
      const profile = await ctx.db
        .query('skillProfiles')
        .withIndex('by_user_and_layout', (q) => q.eq('userId', userId).eq('symbolLayoutId', 'йцукен'))
        .unique();
      expect(profile?.symbolCells[0]).toMatchObject({ symbol: 'а', exposures: 2, clean: 1 });
    });
  });

  // drill.drillRecord token bucket capacity=20 (convex/rateLimiter.ts): 20 всплеск ок, 21-й рубится.
  test('rate limit: всплеск сверх capacity → throw (P0-10)', async () => {
    const t = makeConvexTest();
    const userId = await t.run(async (ctx) => seedUser({ ctx }));
    const client = asUser({ t, userId });
    for (let i = 0; i < 20; i++) {
      await client.mutation(api.drill.drillRecord, { symbolLayoutId: 'йцукен', summary });
    }
    await expect(
      client.mutation(api.drill.drillRecord, { symbolLayoutId: 'йцукен', summary }),
    ).rejects.toThrow(/rate ?limit/i);
  });
});

describe('repertoireSnapshot query — auth', () => {
  test('authenticated: query читает openedSteps профиля', async () => {
    const t = makeConvexTest();
    const userId = await t.run(async (ctx) => {
      const uid = await seedUser({ ctx });
      await seedProfile({ ctx, userId: uid, symbolLayoutId: 'йцукен', openedSteps: 2,
        symbolCells: [{ symbol: 'е', exposures: 30, clean: 30, latencyEwma: 150, latencySamples: 30 }] });
      return uid;
    });
    const snap = await asUser({ t, userId }).query(api.drill.repertoireSnapshot, { symbolLayoutId: 'йцукен' });
    expect(snap?.openedSteps).toBe(2);
  });

  test('гость (без identity) → null', async () => {
    const t = makeConvexTest();
    expect(await t.query(api.drill.repertoireSnapshot, { symbolLayoutId: 'йцукен' })).toBeNull();
  });
});

describe('progressionDetailHandler — per-symbol разбор текущего шага', () => {
  test('гость (null userId) → null', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      expect(await progressionDetailHandler({ ctx, userId: null, symbolLayoutId: 'йцукен' })).toBeNull();
    });
  });

  test('неизвестная раскладка → null', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx });
      expect(await progressionDetailHandler({ ctx, userId, symbolLayoutId: 'unknown' })).toBeNull();
    });
  });

  test('нет профиля → cold-start ступень 1, весь шаг 0 не готов', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx });
      const detail = await progressionDetailHandler({ ctx, userId, symbolLayoutId: 'йцукен' });
      expect(detail?.openedSteps).toBe(1);
      expect(detail?.totalOnStep).toBe(13); // шаг 0 йцукен
      expect(detail?.readyCount).toBe(0);
    });
  });

  test('профиль с дозревшим символом → он ready, readyCount растёт', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx });
      await seedProfile({ ctx, userId, symbolLayoutId: 'йцукен', openedSteps: 1,
        symbolCells: [{ symbol: 'а', exposures: 30, clean: 30, latencyEwma: 150, latencySamples: 30 }] });
      const detail = await progressionDetailHandler({ ctx, userId, symbolLayoutId: 'йцукен' });
      expect(detail?.symbols.find((s) => s.symbol === 'а')?.ready).toBe(true);
      expect(detail?.readyCount).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('progressionDetail query — auth', () => {
  test('authenticated: query делегирует (openedSteps профиля)', async () => {
    const t = makeConvexTest();
    const userId = await t.run(async (ctx) => {
      const uid = await seedUser({ ctx });
      await seedProfile({ ctx, userId: uid, symbolLayoutId: 'йцукен', openedSteps: 2 });
      return uid;
    });
    const detail = await asUser({ t, userId }).query(api.drill.progressionDetail, { symbolLayoutId: 'йцукен' });
    expect(detail?.openedSteps).toBe(2);
  });

  test('гость (без identity) → null', async () => {
    const t = makeConvexTest();
    expect(await t.query(api.drill.progressionDetail, { symbolLayoutId: 'йцукен' })).toBeNull();
  });
});

describe('resetMyProfile mutation — auth', () => {
  test('authenticated: удаляет профили текущего юзера, возвращает число', async () => {
    const t = makeConvexTest();
    const userId = await t.run(async (ctx) => {
      const uid = await seedUser({ ctx });
      await seedProfile({ ctx, userId: uid, symbolLayoutId: 'йцукен', openedSteps: 5 });
      await seedProfile({ ctx, userId: uid, symbolLayoutId: 'qwerty', openedSteps: 3 });
      return uid;
    });
    const removed = await asUser({ t, userId }).mutation(api.drill.resetMyProfile, {});
    expect(removed).toBe(2);
    await t.run(async (ctx) => {
      const left = await ctx.db
        .query('skillProfiles')
        .withIndex('by_user_and_layout', (q) => q.eq('userId', userId))
        .collect();
      expect(left).toHaveLength(0);
    });
  });

  test('гость (без identity) → 0 удалённых, без throw', async () => {
    const t = makeConvexTest();
    expect(await t.mutation(api.drill.resetMyProfile, {})).toBe(0);
  });

  test('на production → throw, профиль не тронут (dev-гейт P0-3)', async () => {
    const t = makeConvexTest();
    const userId = await t.run(async (ctx) => {
      const uid = await seedUser({ ctx });
      await seedProfile({ ctx, userId: uid, symbolLayoutId: 'йцукен', openedSteps: 5 });
      return uid;
    });
    vi.stubEnv('DEPLOY_ENV', 'production');
    try {
      await expect(
        asUser({ t, userId }).mutation(api.drill.resetMyProfile, {})
      ).rejects.toThrow(/production/i);
    } finally {
      vi.unstubAllEnvs();
    }
    // профиль на месте — гейт сработал до удаления
    await t.run(async (ctx) => {
      const left = await ctx.db
        .query('skillProfiles')
        .withIndex('by_user_and_layout', (q) => q.eq('userId', userId))
        .collect();
      expect(left).toHaveLength(1);
    });
  });
});


describe('setMyOpenedStepsHandler — установка openedSteps профиля', () => {
  test('создаёт профиль, если его нет', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx });
      const result = await setMyOpenedStepsHandler({
        ctx,
        userId,
        symbolLayoutId: 'йцукен',
        targetOpenedSteps: 3,
      });
      expect(result.openedSteps).toBe(3);
      expect(result.clamped).toBe(false);

      const profile = await ctx.db
        .query('skillProfiles')
        .withIndex('by_user_and_layout', (q) =>
          q.eq('userId', userId).eq('symbolLayoutId', 'йцукен'))
        .unique();
      expect(profile?.openedSteps).toBe(3);
      expect(profile?.symbolCells).toEqual([]);
    });
  });

  test('обновляет существующий профиль и сбрасывает ячейки', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx });
      await seedProfile({
        ctx,
        userId,
        symbolLayoutId: 'йцукен',
        openedSteps: 1,
        symbolCells: [{ symbol: 'а', exposures: 10, clean: 9, latencyEwma: 150, latencySamples: 10 }],
        updatedAt: 1,
      });
      const result = await setMyOpenedStepsHandler({
        ctx,
        userId,
        symbolLayoutId: 'йцукен',
        targetOpenedSteps: 2,
      });
      expect(result.openedSteps).toBe(2);
      expect(result.clamped).toBe(false);

      const profile = await ctx.db
        .query('skillProfiles')
        .withIndex('by_user_and_layout', (q) =>
          q.eq('userId', userId).eq('symbolLayoutId', 'йцукен'))
        .unique();
      expect(profile?.openedSteps).toBe(2);
      expect(profile?.symbolCells).toEqual([]);
    });
  });

  test('clamp вверх до максимально возможной ступени', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx });
      const result = await setMyOpenedStepsHandler({
        ctx,
        userId,
        symbolLayoutId: 'йцукен',
        targetOpenedSteps: 999,
      });
      expect(result.clamped).toBe(true);
      expect(result.openedSteps).toBeGreaterThan(1);

      const profile = await ctx.db
        .query('skillProfiles')
        .withIndex('by_user_and_layout', (q) =>
          q.eq('userId', userId).eq('symbolLayoutId', 'йцукен'))
        .unique();
      expect(profile?.openedSteps).toBe(result.openedSteps);
    });
  });

  test('clamp вниз до 1', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx });
      const result = await setMyOpenedStepsHandler({
        ctx,
        userId,
        symbolLayoutId: 'йцукен',
        targetOpenedSteps: 0,
      });
      expect(result.openedSteps).toBe(1);
      expect(result.clamped).toBe(true);
    });
  });

  test('гость (null userId) → throw Not authenticated', async () => {
    const t = makeConvexTest();
    await expect(
      t.run(async (ctx) =>
        setMyOpenedStepsHandler({ ctx, userId: null, symbolLayoutId: 'йцукен', targetOpenedSteps: 2 })
      )
    ).rejects.toThrow(/not authenticated/i);
  });

  test('неизвестная раскладка → throw', async () => {
    const t = makeConvexTest();
    await t.run(async (ctx) => {
      const userId = await seedUser({ ctx });
      await expect(
        setMyOpenedStepsHandler({ ctx, userId, symbolLayoutId: 'unknown', targetOpenedSteps: 2 })
      ).rejects.toThrow(/unknown symbolLayoutId/i);
    });
  });
});

describe('setMyOpenedSteps mutation — auth', () => {
  test('authenticated: устанавливает ступень текущего юзера', async () => {
    const t = makeConvexTest();
    const userId = await t.run(async (ctx) => seedUser({ ctx }));
    const result = await asUser({ t, userId }).mutation(api.drill.setMyOpenedSteps, {
      symbolLayoutId: 'йцукен',
      targetOpenedSteps: 3,
    });
    expect(result.openedSteps).toBe(3);
    expect(result.clamped).toBe(false);
    await t.run(async (ctx) => {
      const profile = await ctx.db
        .query('skillProfiles')
        .withIndex('by_user_and_layout', (q) =>
          q.eq('userId', userId).eq('symbolLayoutId', 'йцукен'))
        .unique();
      expect(profile?.openedSteps).toBe(3);
    });
  });

  test('гость (без identity) → throw Not authenticated', async () => {
    const t = makeConvexTest();
    await expect(
      t.mutation(api.drill.setMyOpenedSteps, { symbolLayoutId: 'йцукен', targetOpenedSteps: 2 })
    ).rejects.toThrow(/not authenticated/i);
  });

  test('на production → throw, ступень не установлена (dev-гейт P0-3)', async () => {
    const t = makeConvexTest();
    const userId = await t.run(async (ctx) => seedUser({ ctx }));
    vi.stubEnv('DEPLOY_ENV', 'production');
    try {
      await expect(
        asUser({ t, userId }).mutation(api.drill.setMyOpenedSteps, {
          symbolLayoutId: 'йцукен',
          targetOpenedSteps: 3,
        })
      ).rejects.toThrow(/production/i);
    } finally {
      vi.unstubAllEnvs();
    }
    // профиль не создан — гейт сработал до записи
    await t.run(async (ctx) => {
      const profile = await ctx.db
        .query('skillProfiles')
        .withIndex('by_user_and_layout', (q) =>
          q.eq('userId', userId).eq('symbolLayoutId', 'йцукен'))
        .unique();
      expect(profile).toBeNull();
    });
  });
});
