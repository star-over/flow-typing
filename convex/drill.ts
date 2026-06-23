/**
 * @file Серверные функции фичи Auto-Flow: выдача порции (`drillNext`) и приём
 * сводки в профиль (`drillRecord`, дальше). Семья функций под общим префиксом
 * `drill`. Чистая клиентская сводка — `drillSummarize` (`src/lib`).
 *
 * `drillNext` — этап 1 «Рабочая петля»: минимум без ума — жёсткий фильтр по
 * набору введённых букв (Repertoire) + случайный выбор + добор под бюджет.
 * Ранжирование, фокус и подстройка трудности — последующие этапы (ADR 0003/0004).
 *
 * Это **mutation**, а не query: query в Convex кэшируется и реактивна — повторный
 * вызов с теми же аргументами вернул бы ту же порцию; нам нужна свежая случайная
 * выборка на каждый поход за порцией. Сюда же позже ляжет ленивое создание
 * анонимного профиля (ADR 0005).
 *
 * Контракт говорит в **символах и записях**, не в cpm (ADR 0006): cpm и таймер —
 * клиентские бизнес-сущности, клиент сам считает `budgetChars` из своей скорости
 * и остатка таймера и просит «добери порцию на ~budgetChars». Сайзинг и финальная
 * фильтрация — в одном слое (здесь), иначе промах по количеству.
 *
 * Жёсткое требование одно: drill доступен ⟺ его `stepLevel` в таблице отбора
 * `< openedSteps` (ADR 0001) — индексируемое сравнение через `by_layout_and_step`.
 * `openedSteps` читается из Skill Profile (ADR 0008): `resolveOpenedSteps` возвращает
 * значение профиля (user × раскладка) или cold-start 1 для гостя/нового профиля.
 */
import { getAuthUserId } from '@convex-dev/auth/server';
import { mutation, query } from './_generated/server';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import type { Id } from './_generated/dataModel';
import { getLayoutData } from './layoutData';
import { symbolsAtStep } from '../shared/key-ladder/step-symbols.ts';
import { maxLadderStep } from '../shared/key-ladder/key-step-map.ts';
import { decideOpenedSteps } from '../shared/repertoire/growth.ts';
import { READINESS_PARAMS, REPERTOIRE_DEBT_LIMIT } from '../shared/repertoire/config.ts';
import { computeRepertoireProgress, type RepertoireProgress } from '../shared/repertoire/progress.ts';

// Cold start: новый профиль = стартовый шаг KeyLadder (открыт только шаг 0 →
// openedSteps = 1). Рост шагами — этап «Рост набора букв» (Readiness).
const DEFAULT_OPENED_STEPS = 1;

/** Резолв репертуара: openedSteps из профиля (user × раскладка) или cold-start. */
export async function resolveOpenedSteps({
  ctx,
  userId,
  symbolLayoutId,
}: {
  ctx: MutationCtx;
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

export const drillNext = mutation({
  args: {
    symbolLayoutId: v.string(),
    budgetChars: v.number(),
  },
  returns: v.object({
    contentGap: v.boolean(),
    drills: v.array(v.object({ id: v.id('drills'), text: v.string(), length: v.number() })),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const openedSteps = await resolveOpenedSteps({ ctx, userId, symbolLayoutId: args.symbolLayoutId });

    // Жёсткий фильтр: все доступные drill'ы раскладки (stepLevel < openedSteps).
    const eligible = await ctx.db
      .query('drillSelectionIndex')
      .withIndex('by_layout_and_step', (q) =>
        q.eq('symbolLayoutId', args.symbolLayoutId).lt('stepLevel', openedSteps)
      )
      .collect();

    // Ноль кандидатов — не деградация, а контентный сбой (дыра в корпусе либо
    // нет таблицы отбора для раскладки). Сессию не блокируем: сигналим в лог,
    // дефолтный drill домашнего ряда — задача клиента/следующего шага.
    if (eligible.length === 0) {
      console.warn(
        `drillNext: пустой пул (раскладка ${args.symbolLayoutId}, openedSteps ${openedSteps}) — контентный сбой`
      );
      return { contentGap: true, drills: [] };
    }

    // Случайный порядок: сортировка по случайному ключу. Math.random в Convex —
    // детерминированный seed на вызов (выборка случайна, воспроизводима на реплее).
    // Перф-заметка: собираем весь пул индекса (строки крошечные) ради честной
    // случайности; при росте корпуса заменимо индексом со случайным ключом.
    const shuffledIds: Id<'drills'>[] = eligible
      .map((row) => ({ id: row.drillId, key: Math.random() }))
      .sort((a, b) => a.key - b.key)
      .map((entry) => entry.id);

    // Добор по бюджету: берём drill'ы в случайном порядке, пока не наберём
    // budgetChars. Недобор допустим (ранний поход за следующей порцией); перебор —
    // максимум на один последний drill. Тексты тянем только у выбранных (~десяток),
    // не у всего пула.
    const drills: { id: Id<'drills'>; text: string; length: number }[] = [];
    let total = 0;
    for (const id of shuffledIds) {
      if (drills.length > 0 && total >= args.budgetChars) break;
      const drill = await ctx.db.get(id);
      if (drill === null) continue;
      drills.push({ id: drill._id, text: drill.text, length: drill.length });
      total += drill.length;
    }

    return { contentGap: false, drills };
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
