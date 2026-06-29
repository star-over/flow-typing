/**
 * @file Серверные функции фичи Auto-Flow под общим префиксом `drill`: выдача
 * порции (`drillNext`), приём сводки в профиль + рост репертуара (`drillRecord`,
 * ADR 0008), снимок прогресса ступени для UI (`repertoireSnapshot` — reader-query,
 * CQRS, профиль не пишет). Чистая клиентская сводка — `drillSummarize` (`src/lib`).
 *
 * `drillNext` — этап 1 «Рабочая петля»: минимум без ума — жёсткий фильтр по
 * набору введённых букв (Repertoire) + случайный выбор + добор под бюджет.
 * Ранжирование, фокус и подстройка трудности — последующие этапы (ADR 0003/0004).
 * `drillNext` **тотален** (ADR 0011): на контентный сбой (пустой пул / битые
 * ссылки) сам подставляет дефолтный drill из символов открытых шагов, а не
 * сигналит клиенту — клиентского корпуса для деградации больше нет.
 *
 * `drillNext` — **query** (ADR 0009): жёсткий фильтр исполняет агрегат
 * `drillIndex` (namespace=раскладка, bounds: stepLevel < openedSteps), случайный
 * доступ — count()+at() за O(log n). Свежесть выборки даёт `seed`-аргумент с
 * клиента (разный ключ кэша query), а не write-путь mutation. Форма распределения
 * (soft-слой) — отложена (ADR 0009), v1 равномерный.
 *
 * Контракт говорит в **символах и записях**, не в cpm (ADR 0006): cpm и таймер —
 * клиентские бизнес-сущности, клиент сам считает `budgetChars` из своей скорости
 * и остатка таймера и просит «добери порцию на ~budgetChars». Сайзинг и финальная
 * фильтрация — в одном слое (здесь), иначе промах по количеству.
 *
 * Жёсткое требование одно: drill доступен ⟺ его `stepLevel` в таблице отбора
 * `< openedSteps` (ADR 0001) — сравнение через bounds агрегата `drillIndex`.
 * `openedSteps` читается из Skill Profile (ADR 0008): `resolveOpenedSteps` возвращает
 * значение профиля (user × раскладка) или cold-start 1 для гостя/нового профиля.
 */
import { getAuthUserId } from '@convex-dev/auth/server';
import { mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { drillIndex } from './drillIndex';
import { makeSeededRandom, nextDistinctOffset } from '../shared/drill-selection/random-pick.ts';
import { getLayoutData, type LayoutData } from './layoutData';
import { symbolsAtStep } from '../shared/key-ladder/step-symbols.ts';
import { maxLadderStep } from '../shared/key-ladder/key-step-map.ts';
import { decideOpenedSteps } from '../shared/repertoire/growth.ts';
import { READINESS_PARAMS, REPERTOIRE_DEBT_LIMIT } from '../shared/repertoire/config.ts';
import {
  computeRepertoireProgress,
  computeProgressionDetail,
  type RepertoireProgress,
  type ProgressionDetail,
} from '../shared/repertoire/progress.ts';

// Cold start: новый профиль = стартовый шаг KeyLadder (открыт только шаг 0 →
// openedSteps = 1). Рост шагами — этап «Рост набора букв» (Readiness).
const DEFAULT_OPENED_STEPS = 1;

/** Резолв репертуара: openedSteps из профиля (user × раскладка) или cold-start. */
export async function resolveOpenedSteps({
  ctx,
  userId,
  symbolLayoutId,
}: {
  ctx: QueryCtx | MutationCtx;
  userId: Id<'users'> | null;
  symbolLayoutId: string;
}): Promise<number> {
  if (userId === null) return DEFAULT_OPENED_STEPS;
  const profile = await ctx.db
    .query('skillProfiles')
    .withIndex('by_user_and_layout', (q) => q.eq('userId', userId).eq('symbolLayoutId', symbolLayoutId))
    .unique();
  return profile?.openedSteps ?? DEFAULT_OPENED_STEPS;
}

// Длина «слов» дефолтного drill'а: символы открытых шагов нарезаются на куски этой
// длины, разделённые пробелом. Провизорно — дефолт это страховочная сетка, не
// курируемый текст.
const DEFAULT_DRILL_WORD_LENGTH = 5;

/** Текст-страховка из набора символов: циклически нарезает буквы на «слова» до бюджета. */
function buildDefaultDrillText({
  symbols,
  budgetChars,
}: {
  symbols: string[];
  budgetChars: number;
}): string {
  const letters = symbols.filter((s) => s.trim().length > 0); // пробел добавляем сами как разделитель
  if (letters.length === 0) return '';
  const words: string[] = [];
  let total = 0;
  let cursor = 0;
  while (total < budgetChars) {
    let word = '';
    for (let i = 0; i < DEFAULT_DRILL_WORD_LENGTH; i++) {
      word += letters[cursor % letters.length];
      cursor += 1;
    }
    total += word.length + (words.length > 0 ? 1 : 0); // +1 за пробел-разделитель
    words.push(word);
  }
  return words.join(' ');
}

/**
 * Дефолтный drill на контентный сбой: один drill из символов открытых шагов
 * (steps 0..openedSteps-1) — это в точности символы, чьи drill'ы пропали. Чистая
 * (без I/O), тестируется напрямую. Пустой набор символов (нет открытых шагов) →
 * пустой массив. ADR 0011: сервер сам закрывает дыру (клиентского корпуса нет).
 */
export function buildDefaultDrills({
  layoutData,
  openedSteps,
  budgetChars,
}: {
  layoutData: LayoutData;
  openedSteps: number;
  budgetChars: number;
}): { text: string }[] {
  const symbols = new Set<string>();
  for (let step = 0; step < openedSteps; step++) {
    for (const symbol of symbolsAtStep({ step, symbolLayout: layoutData.symbolLayout, ladder: layoutData.keyLadder })) {
      symbols.add(symbol);
    }
  }
  const text = buildDefaultDrillText({ symbols: [...symbols], budgetChars });
  return text.length > 0 ? [{ text }] : [];
}

export const drillNext = query({
  args: {
    symbolLayoutId: v.string(),
    budgetChars: v.number(),
    seed: v.number(),
  },
  // Тотальный контракт (ADR 0011): сервер всегда возвращает непустой `drills` для
  // раскладки с серверными данными — на контентный сбой подставляет дефолт. Клиент
  // читает только `.text`; `id`/`length` (внутренние, для отбора и бюджета) на провод
  // не идут. Флага contentGap нет — дыра закрыта на сервере, сигналу некому слушать.
  returns: v.object({
    drills: v.array(v.object({ text: v.string() })),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const openedSteps = await resolveOpenedSteps({ ctx, userId, symbolLayoutId: args.symbolLayoutId });

    // Жёсткий фильтр (ADR 0009): namespace=раскладка, bounds: stepLevel < openedSteps.
    const bounds = { upper: { key: openedSteps, inclusive: false } } as const;
    const count = await drillIndex.count(ctx, { namespace: args.symbolLayoutId, bounds });

    if (count > 0) {
      // Равномерный seeded-отбор distinct drill'ов под бюджет (поведение-сохраняющий v1).
      // Свежесть — из seed (разный на каждый поход с клиента → разный ключ кэша query).
      // Случайный доступ — count()+at() за O(log n); тексты тянем только у выбранных.
      const rng = makeSeededRandom(args.seed);
      const used = new Set<number>();
      const drills: { text: string }[] = [];
      let total = 0;
      for (;;) {
        if (drills.length > 0 && total >= args.budgetChars) break;
        const offset = nextDistinctOffset({ rng, count, used });
        if (offset === null) break;
        const { id: selectionId } = await drillIndex.at(ctx, offset, { namespace: args.symbolLayoutId, bounds });
        const row = await ctx.db.get(selectionId); // строка drillSelectionIndex
        // Битая ссылка: offset уже помечен used в nextDistinctOffset и не выпадет
        // снова. Пул сплошь из битых → недобор → выход в дефолт ниже (intent).
        if (row === null) continue;
        const drill = await ctx.db.get(row.drillId);
        if (drill === null) continue;
        drills.push({ text: drill.text });
        total += drill.length;
      }
      if (drills.length > 0) return { drills };
      // Пул не пуст (count>0), но все ссылки битые → контентный сбой → дефолт ниже.
    }

    // Контентный сбой: пустой пул (count===0) ИЛИ сплошь битые ссылки. Сервер сам
    // закрывает дыру дефолтным drill'ом из символов открытых шагов — клиент всегда
    // получает непустую порцию (клиентского корпуса для деградации больше нет, ADR
    // 0011). Раскладка без серверных данных — config-баг: построить нечем → пусто.
    console.warn(
      `drillNext: контентный сбой (раскладка ${args.symbolLayoutId}, openedSteps ${openedSteps}) — дефолтный drill`
    );
    const layoutData = getLayoutData(args.symbolLayoutId);
    if (layoutData === null) return { drills: [] };
    return { drills: buildDefaultDrills({ layoutData, openedSteps, budgetChars: args.budgetChars }) };
  },
});

// ────────────────────────────────────────────────────────────────────────────
// drillRecord — приём сводки drill'а в Skill Profile (apply-агрегатор, ADR 0005)
// ────────────────────────────────────────────────────────────────────────────

// Коэффициент EWMA латентности ячейки (затухание старых замеров). Провизорно
// (план «Числа-настройки»), уточним по реальным данным. Первый сэмпл
// инициализирует EWMA, дальше — fold с этим alpha.
const LATENCY_EWMA_ALPHA = 0.3;

interface SymbolCell {
  symbol: string;
  exposures: number;
  clean: number;
  latencyEwma: number;
  latencySamples: number;
}

interface SymbolStatInput {
  symbol: string;
  exposures: number;
  clean: number;
  latencies: number[];
}

/** Чистое решение о новом openedSteps по обновлённым ячейкам (writer-логика). */
function grownOpenedSteps({
  symbolLayoutId,
  openedSteps,
  cells,
}: {
  symbolLayoutId: string;
  openedSteps: number;
  cells: SymbolCell[];
}): number {
  const layoutData = getLayoutData(symbolLayoutId);
  if (!layoutData) {
    console.warn(`grownOpenedSteps: нет данных раскладки ${symbolLayoutId} — рост пропущен`);
    return openedSteps;
  }
  const { symbolLayout, keyLadder } = layoutData;
  return decideOpenedSteps({
    openedSteps,
    maxStep: maxLadderStep(keyLadder),
    currentStepSymbols: symbolsAtStep({ step: openedSteps - 1, symbolLayout, ladder: keyLadder }),
    cells,
    params: READINESS_PARAMS,
    debtLimit: REPERTOIRE_DEBT_LIMIT,
  });
}

/**
 * Чистое слияние сводки в ячейки профиля: на каждый символ — накопить
 * предъявления/чистые и сложить латентности в EWMA. Без I/O — тестируется
 * напрямую.
 */
export function foldSummaryIntoCells({
  cells,
  perSymbol,
  latencyAlpha,
}: {
  cells: readonly SymbolCell[];
  perSymbol: readonly SymbolStatInput[];
  latencyAlpha: number;
}): SymbolCell[] {
  const bySymbol = new Map<string, SymbolCell>(cells.map((cell) => [cell.symbol, { ...cell }]));

  for (const stat of perSymbol) {
    const cell = bySymbol.get(stat.symbol) ?? {
      symbol: stat.symbol,
      exposures: 0,
      clean: 0,
      latencyEwma: 0,
      latencySamples: 0,
    };
    cell.exposures += stat.exposures;
    cell.clean += stat.clean;
    for (const latency of stat.latencies) {
      cell.latencyEwma =
        cell.latencySamples === 0
          ? latency
          : latencyAlpha * latency + (1 - latencyAlpha) * cell.latencyEwma;
      cell.latencySamples += 1;
    }
    bySymbol.set(stat.symbol, cell);
  }

  return [...bySymbol.values()];
}

// Payload-валидатор сводки = форма DrillSummary (клиентский src/lib/drill-summarize).
// Зеркало по контракту: сервер не импортирует клиентский тип. overall принимаем
// (часть DrillSummary), но пока не храним — Fresh Window это этап «Термостат».
const SUMMARY_VALIDATOR = v.object({
  perSymbol: v.array(
    v.object({
      symbol: v.string(),
      exposures: v.number(),
      clean: v.number(),
      latencies: v.array(v.number()),
    })
  ),
  overall: v.object({
    exposures: v.number(),
    clean: v.number(),
    accuracy: v.number(),
    latencyMedian: v.number(),
    latencySpread: v.number(),
  }),
});

/**
 * Внести сводку в профиль (user × раскладка): найти/создать профиль и слить
 * ячейки. Принимает резолвленный userId — без auth-церемонии (паттерн
 * upsertMineHandler). updatedAt — серверный.
 */
export async function applyDrillSummaryHandler({
  ctx,
  userId,
  symbolLayoutId,
  perSymbol,
}: {
  ctx: MutationCtx;
  userId: Id<'users'>;
  symbolLayoutId: string;
  perSymbol: SymbolStatInput[];
}): Promise<Id<'skillProfiles'>> {
  const existing = await ctx.db
    .query('skillProfiles')
    .withIndex('by_user_and_layout', (q) =>
      q.eq('userId', userId).eq('symbolLayoutId', symbolLayoutId)
    )
    .unique();

  const symbolCells = foldSummaryIntoCells({
    cells: existing?.symbolCells ?? [],
    perSymbol,
    latencyAlpha: LATENCY_EWMA_ALPHA,
  });
  const now = Date.now();

  if (existing === null) {
    return await ctx.db.insert('skillProfiles', {
      userId,
      symbolLayoutId,
      openedSteps: DEFAULT_OPENED_STEPS,
      symbolCells,
      updatedAt: now,
    });
  }
  const openedSteps = grownOpenedSteps({ symbolLayoutId, openedSteps: existing.openedSteps, cells: symbolCells });
  await ctx.db.patch(existing._id, { symbolCells, openedSteps, updatedAt: now });
  return existing._id;
}

export const drillRecord = mutation({
  args: {
    symbolLayoutId: v.string(),
    summary: SUMMARY_VALIDATOR,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error('Not authenticated');
    }
    return await applyDrillSummaryHandler({
      ctx,
      userId,
      symbolLayoutId: args.symbolLayoutId,
      perSymbol: args.summary.perSymbol,
    });
  },
});

// ────────────────────────────────────────────────────────────────────────────
// repertoireSnapshot — снимок прогресса репертуара для UI (CQRS reader-query)
// ────────────────────────────────────────────────────────────────────────────

/** Снимок прогресса репертуара для UI. null для гостя/неизвестной раскладки. */
export async function repertoireSnapshotHandler({
  ctx,
  userId,
  symbolLayoutId,
}: {
  ctx: QueryCtx;
  userId: Id<'users'> | null;
  symbolLayoutId: string;
}): Promise<RepertoireProgress | null> {
  if (userId === null) return null;
  const layoutData = getLayoutData(symbolLayoutId);
  if (!layoutData) return null;
  const profile = await ctx.db
    .query('skillProfiles')
    .withIndex('by_user_and_layout', (q) => q.eq('userId', userId).eq('symbolLayoutId', symbolLayoutId))
    .unique();
  return computeRepertoireProgress({
    openedSteps: profile?.openedSteps ?? DEFAULT_OPENED_STEPS,
    symbolCells: profile?.symbolCells ?? [],
    symbolLayout: layoutData.symbolLayout,
    keyLadder: layoutData.keyLadder,
  });
}

export const repertoireSnapshot = query({
  args: { symbolLayoutId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    return await repertoireSnapshotHandler({ ctx, userId, symbolLayoutId: args.symbolLayoutId });
  },
});

// ────────────────────────────────────────────────────────────────────────────
// progressionDetail — per-symbol разбор готовности текущего шага для /stats.
// Те же входные данные, на которых writer (decideOpenedSteps) решает рост ступени.
// CQRS reader-query, профиль не пишет. null для гостя/неизвестной раскладки.
// ────────────────────────────────────────────────────────────────────────────

export async function progressionDetailHandler({
  ctx,
  userId,
  symbolLayoutId,
}: {
  ctx: QueryCtx;
  userId: Id<'users'> | null;
  symbolLayoutId: string;
}): Promise<ProgressionDetail | null> {
  if (userId === null) return null;
  const layoutData = getLayoutData(symbolLayoutId);
  if (!layoutData) return null;
  const profile = await ctx.db
    .query('skillProfiles')
    .withIndex('by_user_and_layout', (q) => q.eq('userId', userId).eq('symbolLayoutId', symbolLayoutId))
    .unique();
  return computeProgressionDetail({
    openedSteps: profile?.openedSteps ?? DEFAULT_OPENED_STEPS,
    symbolCells: profile?.symbolCells ?? [],
    symbolLayout: layoutData.symbolLayout,
    keyLadder: layoutData.keyLadder,
  });
}

export const progressionDetail = query({
  args: { symbolLayoutId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    return await progressionDetailHandler({ ctx, userId, symbolLayoutId: args.symbolLayoutId });
  },
});

// ────────────────────────────────────────────────────────────────────────────
// resetMyProfile — DEV/TEST утилита: полный сброс профиля текущего юзера.
// Удаляет ВСЕ его skillProfiles (по всем раскладкам) → следующая сессия стартует
// с cold-start (ступень 1, пустые ячейки), как у нового юзера. Нужна для проверки
// алгоритма роста с чистого листа. Стирает только профили getAuthUserId — чужие
// недоступны (безопасно даже как public mutation).
// ────────────────────────────────────────────────────────────────────────────

/** Удаляет все профили юзера (все раскладки); возвращает число удалённых. */
export async function resetMyProfileHandler({
  ctx,
  userId,
}: {
  ctx: MutationCtx;
  userId: Id<'users'> | null;
}): Promise<number> {
  if (userId === null) return 0;
  const profiles = await ctx.db
    .query('skillProfiles')
    .withIndex('by_user_and_layout', (q) => q.eq('userId', userId))
    .collect();
  for (const profile of profiles) await ctx.db.delete(profile._id);
  return profiles.length;
}

export const resetMyProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    return await resetMyProfileHandler({ ctx, userId });
  },
});
